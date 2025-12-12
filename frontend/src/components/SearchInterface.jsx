import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Pagination,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
  Class,
  Functions,
  Folder,
  Description as DocIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { debounce } from 'lodash';
import { apiService } from '@shared/services/api';

const SearchInterface = ({ data, onElementSelect }) => {
  const [query, setQuery] = useState('');
  const [elementType, setElementType] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [resultsPerPage] = useState(20); // Fixed page size for progressive disclosure

  // Search function with server-side pagination
  const performSearch = useCallback(async (searchQuery, searchType, page = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiService.searchElements(
        searchQuery, 
        searchType || null, 
        page, 
        resultsPerPage
      );

      if (response.success) {
        const searchData = response.data;
        setResults(searchData.results || []);
        setHasSearched(true);
        
        // Update pagination info from server response
        if (searchData.pagination) {
          setCurrentPage(searchData.pagination.page);
          // Store total pages for pagination component
          setTotalPages(searchData.pagination.total_pages);
          setTotalResults(searchData.pagination.total_results);
        }
      } else {
        setError(response.message || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      setError(`Search failed: ${err.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [resultsPerPage]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  // Effect to trigger search when query or type changes
  useEffect(() => {
    if (data && data.has_data) {
      debouncedSearch(query, elementType, 1);
      setCurrentPage(1); // Reset to first page on new search
    }
  }, [query, elementType, data, debouncedSearch]);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleTypeChange = (event) => {
    setElementType(event.target.value);
  };

  const handleClearSearch = () => {
    setQuery('');
    setElementType('');
    setResults([]);
    setHasSearched(false);
    setError('');
    setCurrentPage(1);
  };

  const handleElementClick = (element) => {
    if (onElementSelect) {
      // Add the icon property that CodeExplorer expects
      const elementWithIcon = {
        ...element,
        icon: getElementIconComponent(element.type),
        elementType: element.type.toLowerCase()
      };
      onElementSelect(elementWithIcon);
    }
  };

  const getElementIconComponent = (elementType) => {
    switch (elementType.toLowerCase()) {
      case 'module':
        return Folder;
      case 'class':
        return Class;
      case 'function':
        return Functions;
      default:
        return CodeIcon;
    }
  };

  const getElementIcon = (elementType) => {
    switch (elementType.toLowerCase()) {
      case 'module':
        return <Folder color="primary" />;
      case 'class':
        return <Class color="secondary" />;
      case 'function':
        return <Functions color="success" />;
      default:
        return <CodeIcon />;
    }
  };

  const getMatchTypeIcon = (matchType) => {
    switch (matchType) {
      case 'name':
        return <CodeIcon fontSize="small" />;
      case 'docstring':
        return <DocIcon fontSize="small" />;
      case 'file_path':
        return <LocationIcon fontSize="small" />;
      default:
        return <SearchIcon fontSize="small" />;
    }
  };

  const getMatchTypeColor = (matchType) => {
    switch (matchType) {
      case 'name':
        return 'primary';
      case 'docstring':
        return 'secondary';
      case 'file_path':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatLocation = (location) => {
    const fileName = location.file_path.split('/').pop();
    return `${fileName}:${location.line_number}`;
  };

  // Server-side pagination - results are already paginated
  const paginatedResults = results;

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    // Trigger new search with the selected page
    if (query.trim()) {
      performSearch(query, elementType, page);
    }
  };

  if (!data || !data.has_data) {
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Controls */}
      <Paper sx={{ 
        p: { xs: 2, sm: 3 }, 
        mb: 2,
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, rgba(30, 30, 30, 1) 0%, rgba(40, 40, 40, 1) 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark' 
          ? 'rgba(25, 118, 210, 0.2)' 
          : 'rgba(25, 118, 210, 0.08)',
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? '0px 4px 16px rgba(0, 0, 0, 0.3)'
          : '0px 4px 16px rgba(0, 0, 0, 0.08)',
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center', 
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search classes, functions, modules..."
            value={query}
            onChange={handleQueryChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />,
              endAdornment: query && (
                <IconButton 
                  size="small" 
                  onClick={handleClearSearch}
                  sx={{
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: 'rgba(211, 47, 47, 0.08)',
                      color: 'error.main',
                    }
                  }}
                >
                  <ClearIcon />
                </IconButton>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(255, 255, 255, 0.9)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 1)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                },
                '&.Mui-focused': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 1)',
                  boxShadow: (theme) => theme.palette.mode === 'dark'
                    ? '0 0 0 3px rgba(25, 118, 210, 0.3)'
                    : '0 0 0 3px rgba(25, 118, 210, 0.1)',
                },
              }
            }}
          />

          <FormControl sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={elementType}
              label="Type"
              onChange={handleTypeChange}
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                },
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="module">📁 Modules</MenuItem>
              <MenuItem value="class">🏛️ Classes</MenuItem>
              <MenuItem value="function">⚡ Functions</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Search Stats */}
        {hasSearched && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            p: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
            borderRadius: 2,
            border: '1px solid rgba(25, 118, 210, 0.12)'
          }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
              {loading ? 'Searching...' : `Found ${totalResults || results.length} results${totalPages > 1 ? ` (page ${currentPage} of ${totalPages})` : ''}`}
            </Typography>
            {loading && <CircularProgress size={16} color="primary" />}
          </Box>
        )}
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      <Paper sx={{ 
        flex: 1, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 3,
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(25, 118, 210, 0.08)',
      }}>
        {hasSearched && !loading && results.length === 0 && !error && (
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
              Try adjusting your search query or filter type.
            </Typography>
          </Box>
        )}

        {results.length > 0 && (
          <>
            <List sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              {paginatedResults.map((result, index) => (
                <React.Fragment key={`${result.element.id}-${index}`}>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleElementClick(result.element)}
                      sx={{ 
                        py: 2,
                        px: 2,
                        borderRadius: 2,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          transform: 'translateX(4px)',
                          boxShadow: '0px 4px 12px rgba(25, 118, 210, 0.15)',
                        },
                        '&:active': {
                          transform: 'translateX(2px)',
                        }
                      }}
                      className="hover-lift"
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                        {getElementIcon(result.element.type)}
                      </Box>

                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" component="span">
                              {result.element.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={result.element.type}
                              color={result.element.type === 'class' ? 'secondary' :
                                result.element.type === 'function' ? 'success' : 'primary'}
                              variant="outlined"
                            />
                            <Tooltip title={`Match in ${result.match_type}`}>
                              <Chip
                                size="small"
                                icon={getMatchTypeIcon(result.match_type)}
                                label={result.match_type}
                                color={getMatchTypeColor(result.match_type)}
                                variant="filled"
                              />
                            </Tooltip>
                          </Box>
                        }
                        secondary={
                          <div>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {formatLocation(result.element.location)}
                            </Typography>
                            {result.match_type === 'docstring' && result.match_text && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontStyle: 'italic',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                "{result.match_text}"
                              </Typography>
                            )}
                          </div>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < paginatedResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Stack spacing={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Showing {((currentPage - 1) * resultsPerPage) + 1}-{Math.min(currentPage * resultsPerPage, totalResults || results.length)} of {totalResults || results.length} results
                  </Typography>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                    disabled={loading}
                  />
                </Stack>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SearchInterface;