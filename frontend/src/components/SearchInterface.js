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
import apiService from '../services/api';

const SearchInterface = ({ data, onElementSelect }) => {
  const [query, setQuery] = useState('');
  const [elementType, setElementType] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(20); // Fixed page size for progressive disclosure

  // Search function
  const performSearch = useCallback(async (searchQuery, searchType) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiService.searchElements(searchQuery, searchType || null);

      if (response.success) {
        setResults(response.data.results || []);
        setHasSearched(true);
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
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  // Effect to trigger search when query or type changes
  useEffect(() => {
    if (data && data.data && data.data.has_data) {
      debouncedSearch(query, elementType);
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

  // Pagination logic for progressive disclosure
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return results.slice(startIndex, endIndex);
  }, [results, currentPage, resultsPerPage]);

  const totalPages = Math.ceil(results.length / resultsPerPage);

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  if (!data || !data.data || !data.data.has_data) {
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
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search classes, functions, modules..."
            value={query}
            onChange={handleQueryChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: query && (
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
          />

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={elementType}
              label="Type"
              onChange={handleTypeChange}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="module">Modules</MenuItem>
              <MenuItem value="class">Classes</MenuItem>
              <MenuItem value="function">Functions</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Search Stats */}
        {hasSearched && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {loading ? 'Searching...' : `Found ${results.length} results${results.length > resultsPerPage ? ` (showing ${Math.min(resultsPerPage, results.length)} per page)` : ''}`}
            </Typography>
            {loading && <CircularProgress size={16} />}
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
      <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {hasSearched && !loading && results.length === 0 && !error && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No results found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search query or filter type.
            </Typography>
          </Box>
        )}

        {results.length > 0 && (
          <>
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {paginatedResults.map((result, index) => (
                <React.Fragment key={`${result.element.id}-${index}`}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleElementClick(result.element)}
                      sx={{ py: 1.5 }}
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
                    Showing {((currentPage - 1) * resultsPerPage) + 1}-{Math.min(currentPage * resultsPerPage, results.length)} of {results.length} results
                  </Typography>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
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