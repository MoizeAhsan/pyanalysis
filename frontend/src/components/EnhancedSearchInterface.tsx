/**
 * Enhanced Search Interface with fuzzy matching, instant search, and advanced filtering
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Pagination,
  Stack,
  InputAdornment,
  Collapse,
  Fade,
  Badge,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
  Class,
  Functions,
  Folder,
  Tune as TuneIcon,
  History as HistoryIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  KeyboardArrowUp
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

import { apiService } from '@shared/services/api';
import { debounce, fuzzyMatch, FILTER_PRESETS, type FilterPresetKey } from '@shared/utils/search';
import { AdvancedFilters } from './AdvancedFilters';
import { SearchHistoryManager, type SearchHistoryItem } from './SearchHistoryManager';
import { VirtualizedResults } from './VirtualizedResults';

interface EnhancedSearchInterfaceProps {
  data: any;
  onElementSelect?: (element: any) => void;
  height?: string | number;
}

interface SearchState {
  query: string;
  elementType: string;
  results: any[];
  loading: boolean;
  error: string;
  hasSearched: boolean;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  filtersExpanded: boolean;
  activeFilters: Record<string, any>;
  favoriteQueries: string[];
  searchHistory: SearchHistoryItem[];
  showHistory: boolean;
}

const RESULTS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_RESULTS = 500;

export const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({ 
  data, 
  onElementSelect,
  height = '100%' 
}) => {
  const theme = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchHistoryManager = useRef(new SearchHistoryManager());

  const [state, setState] = useState<SearchState>({
    query: '',
    elementType: '',
    results: [],
    loading: false,
    error: '',
    hasSearched: false,
    currentPage: 1,
    totalPages: 0,
    totalResults: 0,
    filtersExpanded: false,
    activeFilters: {},
    favoriteQueries: [],
    searchHistory: [],
    showHistory: false
  });

  // Enhanced search function with fuzzy matching support
  const performSearch = useCallback(async (
    searchQuery: string, 
    searchType: string, 
    page: number = 1
  ) => {
    if (!searchQuery.trim()) {
      setState(prev => ({ 
        ...prev, 
        results: [], 
        hasSearched: false, 
        loading: false,
        error: ''
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));
      
      const response = await apiService.searchElements(
        searchQuery,
        searchType || null,
        page,
        RESULTS_PER_PAGE,
        MAX_RESULTS
      );

      if (response.success) {
        const searchData = response.data;
        
        // Apply client-side fuzzy matching to enhance server results
        const enhancedResults = searchData.results.map(result => {
          const nameMatch = fuzzyMatch(result.element.name, searchQuery, {
            threshold: 0.3,
            includeMatches: true
          });

          const docMatch = result.element.docstring 
            ? fuzzyMatch(result.element.docstring, searchQuery, {
                threshold: 0.2,
                includeMatches: true
              })
            : { score: 0, matches: [], isMatch: false };

          return {
            ...result,
            fuzzyScore: Math.max(nameMatch.score, docMatch.score),
            nameMatches: nameMatch.matches,
            docMatches: docMatch.matches,
            relevanceScore: result.match_type === 'name' ? 1.0 : 
                          result.match_type === 'docstring' ? 0.8 : 0.6
          };
        }).sort((a, b) => {
          // Sort by fuzzy score first, then by relevance
          const scoreDiff = b.fuzzyScore - a.fuzzyScore;
          return scoreDiff !== 0 ? scoreDiff : b.relevanceScore - a.relevanceScore;
        });

        // Save search to history
        searchHistoryManager.current.addSearch({
          query: searchQuery,
          elementType: searchType,
          resultCount: searchData.pagination?.total_results || enhancedResults.length,
          timestamp: Date.now()
        });

        setState(prev => ({ 
          ...prev,
          results: enhancedResults,
          hasSearched: true,
          currentPage: searchData.pagination?.page || 1,
          totalPages: searchData.pagination?.total_pages || 1,
          totalResults: searchData.pagination?.total_results || enhancedResults.length,
          searchHistory: searchHistoryManager.current.getHistory()
        }));

      } else {
        setState(prev => ({ 
          ...prev,
          error: response.message || 'Search failed',
          results: [] 
        }));
      }
    } catch (err: any) {
      setState(prev => ({ 
        ...prev,
        error: `Search failed: ${err.message}`,
        results: [] 
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(performSearch, SEARCH_DEBOUNCE_MS),
    [performSearch]
  );

  // Effect to trigger search when query or filters change
  useEffect(() => {
    if (data?.has_data) {
      debouncedSearch(state.query, state.elementType, 1);
      setState(prev => ({ ...prev, currentPage: 1 }));
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [state.query, state.elementType, state.activeFilters, data, debouncedSearch]);

  // Load search history on mount
  useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      searchHistory: searchHistoryManager.current.getHistory(),
      favoriteQueries: searchHistoryManager.current.getFavorites()
    }));
  }, []);

  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setState(prev => ({ ...prev, query: newQuery }));
    
    // Show/hide history based on focus and empty query
    if (newQuery === '' && document.activeElement === searchInputRef.current) {
      setState(prev => ({ ...prev, showHistory: true }));
    } else {
      setState(prev => ({ ...prev, showHistory: false }));
    }
  }, []);

  const handleTypeChange = useCallback((newType: string) => {
    setState(prev => ({ ...prev, elementType: newType }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setState(prev => ({ 
      ...prev,
      query: '',
      elementType: '',
      results: [],
      hasSearched: false,
      error: '',
      currentPage: 1,
      showHistory: false,
      activeFilters: {}
    }));
    searchInputRef.current?.focus();
  }, []);

  const handleElementClick = useCallback((element: any) => {
    if (onElementSelect) {
      const elementWithIcon = {
        ...element,
        icon: getElementIconComponent(element.type),
        elementType: element.type.toLowerCase()
      };
      onElementSelect(elementWithIcon);
    }
  }, [onElementSelect]);

  const handlePageChange = useCallback((_event: unknown, page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
    if (state.query.trim()) {
      performSearch(state.query, state.elementType, page);
    }
  }, [state.query, state.elementType, performSearch]);

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setState(prev => ({ ...prev, activeFilters: filters }));
  }, []);

  const handleApplyPreset = useCallback((presetKey: FilterPresetKey) => {
    const preset = FILTER_PRESETS[presetKey];
    const presetElementType = 'elementType' in preset.filters ? preset.filters.elementType : '';
    setState(prev => ({ 
      ...prev, 
      activeFilters: preset.filters,
      elementType: presetElementType || ''
    }));
  }, []);

  const handleHistoryItemSelect = useCallback((item: SearchHistoryItem) => {
    setState(prev => ({ 
      ...prev,
      query: item.query,
      elementType: item.elementType || '',
      showHistory: false
    }));
  }, []);

  const toggleFavorite = useCallback((query: string) => {
    const isFavorite = state.favoriteQueries.includes(query);
    if (isFavorite) {
      searchHistoryManager.current.removeFavorite(query);
    } else {
      searchHistoryManager.current.addFavorite(query);
    }
    setState(prev => ({ 
      ...prev, 
      favoriteQueries: searchHistoryManager.current.getFavorites() 
    }));
  }, [state.favoriteQueries]);

  const getElementIconComponent = (elementType: string) => {
    switch (elementType.toLowerCase()) {
      case 'module': return Folder;
      case 'class': return Class;
      case 'function': return Functions;
      default: return CodeIcon;
    }
  };

  const renderSearchStats = () => {
    if (!state.hasSearched) return null;

    return (
      <Fade in={state.hasSearched}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
              {state.loading ? 'Searching...' : 
                `Found ${state.totalResults} results${
                  state.totalPages > 1 ? ` (page ${state.currentPage} of ${state.totalPages})` : ''
                }`
              }
            </Typography>
            {state.loading && <CircularProgress size={16} color="primary" />}
          </Box>
          
          {state.query && (
            <Tooltip title={state.favoriteQueries.includes(state.query) ? "Remove from favorites" : "Add to favorites"}>
              <IconButton
                size="small"
                onClick={() => toggleFavorite(state.query)}
                sx={{
                  color: state.favoriteQueries.includes(state.query) ? 'warning.main' : 'action.disabled'
                }}
              >
                {state.favoriteQueries.includes(state.query) ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Fade>
    );
  };

  const renderSearchHistory = () => {
    if (!state.showHistory || state.searchHistory.length === 0) return null;

    return (
      <Fade in={state.showHistory}>
        <Paper sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          maxHeight: 300,
          overflow: 'auto',
          mt: 1,
          boxShadow: theme.shadows[8]
        }}>
          <List dense>
            <ListItem>
              <ListItemText 
                primary={
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Recent Searches
                  </Typography>
                }
              />
            </ListItem>
            <Divider />
            {state.searchHistory.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleHistoryItemSelect(item)}>
                  <HistoryIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                  <ListItemText 
                    primary={item.query}
                    secondary={`${item.resultCount} results • ${item.elementType || 'all types'}`}
                  />
                  {state.favoriteQueries.includes(item.query) && (
                    <StarIcon sx={{ ml: 1, fontSize: 16, color: 'warning.main' }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Fade>
    );
  };

  if (!data?.has_data) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No analysis data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please analyze a project first to enable search functionality.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Search Controls */}
      <Paper sx={{
        p: 3,
        mb: 2,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        boxShadow: theme.shadows[4]
      }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          <TextField
            fullWidth
            inputRef={searchInputRef}
            variant="outlined"
            placeholder="Search classes, functions, modules with fuzzy matching..."
            value={state.query}
            onChange={handleQueryChange}
            onFocus={() => state.query === '' && setState(prev => ({ ...prev, showHistory: true }))}
            onBlur={() => setTimeout(() => setState(prev => ({ ...prev, showHistory: false })), 200)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {state.query && (
                    <Tooltip title="Clear search">
                      <IconButton size="small" onClick={handleClearSearch}>
                        <ClearIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Toggle filters">
                    <IconButton
                      size="small"
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        filtersExpanded: !prev.filtersExpanded 
                      }))}
                      sx={{
                        color: Object.keys(state.activeFilters).length > 0 ? 
                          'primary.main' : 'action.disabled'
                      }}
                    >
                      <Badge 
                        badgeContent={Object.keys(state.activeFilters).length}
                        color="primary"
                        invisible={Object.keys(state.activeFilters).length === 0}
                      >
                        {state.filtersExpanded ? <KeyboardArrowUp /> : <TuneIcon />}
                      </Badge>
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: theme.palette.background.paper,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: '2px'
                  }
                },
                '&.Mui-focused': {
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
                }
              }
            }}
          />
          {renderSearchHistory()}
        </Box>

        {/* Advanced Filters */}
        <Collapse in={state.filtersExpanded}>
          <AdvancedFilters
            elementType={state.elementType}
            activeFilters={state.activeFilters}
            onTypeChange={handleTypeChange}
            onFiltersChange={handleFilterChange}
            onApplyPreset={handleApplyPreset}
          />
        </Collapse>

        {/* Search Stats */}
        {renderSearchStats()}
      </Paper>

      {/* Error Display */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {/* Search Results */}
      <Paper sx={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        boxShadow: theme.shadows[4],
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
      }}>
        {state.hasSearched && !state.loading && state.results.length === 0 && !state.error && (
          <Box sx={{
            p: 4,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              No results found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search query or filter settings.
            </Typography>
          </Box>
        )}

        {state.loading && state.results.length === 0 && (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="text" width="80%" height={16} />
              </Box>
            ))}
          </Box>
        )}

        {state.results.length > 0 && (
          <VirtualizedResults
            results={state.results}
            query={state.query}
            onElementClick={handleElementClick}
            loading={state.loading}
          />
        )}

        {/* Pagination */}
        {state.totalPages > 1 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Showing {((state.currentPage - 1) * RESULTS_PER_PAGE) + 1}-
                {Math.min(state.currentPage * RESULTS_PER_PAGE, state.totalResults)} of {state.totalResults} results
              </Typography>
              <Pagination
                count={state.totalPages}
                page={state.currentPage}
                onChange={handlePageChange}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
                disabled={state.loading}
              />
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default EnhancedSearchInterface;