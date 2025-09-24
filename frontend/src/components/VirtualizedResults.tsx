/**
 * Virtualized Results Component for efficient rendering of large search result sets
 * Using react-window for optimal performance with large datasets
 */
import React, { useMemo, useCallback } from 'react';
import {
  Box,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Typography,
  Divider,
  Skeleton,
  Tooltip
} from '@mui/material';
import {
  Code as CodeIcon,
  Class,
  Functions,
  Folder,
  Description as DocIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { FixedSizeList as VirtualList } from 'react-window';
import { useTheme, alpha } from '@mui/material/styles';
import { createHighlightedText } from '@shared/utils/search';

interface VirtualizedResultsProps {
  results: any[];
  query: string;
  onElementClick: (element: any) => void;
  loading?: boolean;
  height?: number;
}

interface ResultItemData {
  results: any[];
  query: string;
  onElementClick: (element: any) => void;
  getElementIcon: (elementType: string) => React.ReactNode;
  getMatchTypeIcon: (matchType: string) => React.ReactElement;
  getMatchTypeColor: (matchType: string) => "primary" | "secondary" | "default";
  formatLocation: (location: any) => string;
  renderHighlightedText: (text: string, matches: Array<[number, number]>) => React.ReactNode;
  theme: any;
}

interface ResultItemProps {
  index: number;
  style: React.CSSProperties;
  data: ResultItemData;
}

const ITEM_HEIGHT = 120;
const LOADING_SKELETON_COUNT = 8;

const ResultItem: React.FC<ResultItemProps> = ({ index, style, data }) => {
  const { 
    results, 
    onElementClick, 
    getElementIcon, 
    getMatchTypeIcon, 
    getMatchTypeColor, 
    formatLocation, 
    renderHighlightedText
  } = data;
  
  const result = results[index];

  if (!result) return null;

  return (
    <div style={style}>
      <Box sx={{ px: 1, py: 0.5 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => onElementClick(result.element)}
            sx={{
              py: 2,
              px: 2,
              borderRadius: 2,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: alpha(data.theme.palette.primary.main, 0.08),
                transform: 'translateX(4px)',
                boxShadow: `0px 4px 12px ${alpha(data.theme.palette.primary.main, 0.15)}`,
              },
              '&:active': {
                transform: 'translateX(2px)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              {getElementIcon(result.element.type)}
            </Box>

            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" component="span">
                    {result.nameMatches && result.nameMatches.length > 0 
                      ? renderHighlightedText(result.element.name, result.nameMatches)
                      : result.element.name
                    }
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
                  {result.fuzzyScore && (
                    <Chip
                      size="small"
                      label={`${Math.round(result.fuzzyScore * 100)}%`}
                      color="info"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
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
                      "{result.docMatches && result.docMatches.length > 0 
                        ? renderHighlightedText(result.match_text, result.docMatches)
                        : result.match_text
                      }"
                    </Typography>
                  )}
                </div>
              }
            />
          </ListItemButton>
        </ListItem>
        {index < results.length - 1 && (
          <Divider sx={{ mx: 2 }} />
        )}
      </Box>
    </div>
  );
};

const LoadingSkeleton: React.FC<{ index: number; style: React.CSSProperties }> = ({ style }) => (
  <div style={style}>
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rectangular" width={60} height={20} />
        <Skeleton variant="rectangular" width={80} height={20} />
      </Box>
      <Skeleton variant="text" width="30%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="70%" height={16} />
    </Box>
  </div>
);

export const VirtualizedResults: React.FC<VirtualizedResultsProps> = ({
  results,
  query,
  onElementClick,
  loading = false,
  height = 400
}) => {
  const theme = useTheme();

  const getElementIcon = useCallback((elementType: string) => {
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
  }, []);

  const getMatchTypeIcon = useCallback((matchType: string): React.ReactElement => {
    switch (matchType) {
      case 'name':
        return <CodeIcon fontSize="small" />;
      case 'docstring':
        return <DocIcon fontSize="small" />;
      case 'file_path':
        return <LocationIcon fontSize="small" />;
      default:
        return <CodeIcon fontSize="small" />;
    }
  }, []);

  const getMatchTypeColor = useCallback((matchType: string): "primary" | "secondary" | "default" => {
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
  }, []);

  const formatLocation = useCallback((location: any) => {
    const fileName = location.file_path.split('/').pop();
    return `${fileName}:${location.line_number}`;
  }, []);

  const renderHighlightedText = useCallback((text: string, matches: Array<[number, number]>) => {
    if (!matches || matches.length === 0) {
      return text;
    }

    return createHighlightedText(text, matches, 'search-highlight');
  }, []);

  const itemData = useMemo(() => ({
    results,
    query,
    onElementClick,
    getElementIcon,
    getMatchTypeIcon,
    getMatchTypeColor,
    formatLocation,
    renderHighlightedText,
    theme
  }), [
    results, 
    query, 
    onElementClick, 
    getElementIcon, 
    getMatchTypeIcon, 
    getMatchTypeColor, 
    formatLocation, 
    renderHighlightedText, 
    theme
  ]);

  const renderItem = useCallback((props: any) => {
    if (loading && results.length === 0) {
      return <LoadingSkeleton {...props} />;
    }
    return <ResultItem {...props} data={itemData} />;
  }, [loading, results.length, itemData]);

  const itemCount = loading && results.length === 0 ? LOADING_SKELETON_COUNT : results.length;

  // Calculate dynamic height based on container
  const listHeight = typeof height === 'number' ? height : 400;

  return (
    <Box 
      sx={{ 
        flex: 1, 
        overflow: 'hidden',
        '& .search-highlight': {
          backgroundColor: alpha(theme.palette.warning.main, 0.3),
          color: theme.palette.warning.contrastText,
          fontWeight: 600,
          borderRadius: 1,
          px: 0.5
        }
      }}
    >
      {itemCount > 0 ? (
        <VirtualList
          height={listHeight}
          width="100%"
          itemCount={itemCount}
          itemSize={ITEM_HEIGHT}
          itemData={itemData}
          overscanCount={5}
        >
          {renderItem}
        </VirtualList>
      ) : (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No results to display
          </Typography>
        </Box>
      )}
    </Box>
  );
};