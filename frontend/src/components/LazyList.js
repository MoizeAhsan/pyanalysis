import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Typography,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

/**
 * LazyList component for progressive disclosure of large datasets
 * Implements lazy loading with configurable batch sizes
 */
const LazyList = ({
  items = [],
  renderItem,
  initialBatchSize = 20,
  batchSize = 20,
  loadingComponent = null,
  emptyComponent = null,
  showLoadMore = true,
  maxItems = null,
  ...listProps
}) => {
  const [displayCount, setDisplayCount] = useState(initialBatchSize);
  const [loading, setLoading] = useState(false);

  // Reset display count when items change
  useEffect(() => {
    setDisplayCount(initialBatchSize);
  }, [items, initialBatchSize]);

  // Calculate displayed items with lazy loading
  const displayedItems = useMemo(() => {
    const maxDisplay = maxItems ? Math.min(displayCount, maxItems) : displayCount;
    return items.slice(0, maxDisplay);
  }, [items, displayCount, maxItems]);

  const hasMore = useMemo(() => {
    const maxDisplay = maxItems ? Math.min(items.length, maxItems) : items.length;
    return displayCount < maxDisplay;
  }, [displayCount, items.length, maxItems]);

  const handleLoadMore = async () => {
    setLoading(true);
    // Simulate async loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 200));
    setDisplayCount(prev => prev + batchSize);
    setLoading(false);
  };

  const handleShowLess = () => {
    setDisplayCount(initialBatchSize);
  };

  if (items.length === 0) {
    return emptyComponent || (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No items to display
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List {...listProps}>
        {displayedItems.map((item, index) => (
          <React.Fragment key={item.id || index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
        
        {/* Loading skeletons */}
        {loading && (
          <>
            {Array.from({ length: Math.min(batchSize, 5) }).map((_, index) => (
              <ListItem key={`skeleton-${index}`}>
                <ListItemText
                  primary={<Skeleton variant="text" width="60%" />}
                  secondary={<Skeleton variant="text" width="40%" />}
                />
              </ListItem>
            ))}
          </>
        )}
      </List>

      {/* Load More / Show Less Controls */}
      {showLoadMore && (hasMore || displayCount > initialBatchSize) && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          {hasMore && (
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <ExpandMore />}
              sx={{ mr: 1 }}
            >
              {loading ? 'Loading...' : `Load More (${Math.min(batchSize, items.length - displayCount)} more)`}
            </Button>
          )}
          
          {displayCount > initialBatchSize && (
            <Button
              variant="text"
              onClick={handleShowLess}
              startIcon={<ExpandLess />}
              size="small"
            >
              Show Less
            </Button>
          )}
        </Box>
      )}

      {/* Items count indicator */}
      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Showing {displayedItems.length} of {maxItems ? Math.min(items.length, maxItems) : items.length} items
          {maxItems && items.length > maxItems && ` (limited to ${maxItems})`}
        </Typography>
      </Box>
    </Box>
  );
};

export default LazyList;