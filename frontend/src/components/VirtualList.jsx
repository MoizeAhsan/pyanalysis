import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  Skeleton
} from '@mui/material';

/**
 * High-performance virtual list component for large datasets
 * Only renders visible items to maintain performance with thousands of items
 */
const VirtualList = ({
  items = [],
  renderItem,
  itemHeight = 72, // Default height for list items
  containerHeight = 400,
  overscan = 5, // Number of items to render outside visible area
  loadingComponent = null,
  emptyComponent = null,
  onScroll = null,
  ...listProps
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, visibleStart - overscan),
      end: Math.min(items.length - 1, visibleEnd + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Call external scroll handler
    if (onScroll) {
      onScroll(event);
    }
  }, [onScroll]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Reset scroll position when items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items]);

  if (items.length === 0) {
    return emptyComponent || (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No items to display
        </Typography>
      </Box>
    );
  }

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <Box
      ref={containerRef}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...listProps.sx
      }}
      onScroll={handleScroll}
    >
      <List
        sx={{
          height: totalHeight,
          position: 'relative',
          padding: 0,
          ...listProps.sx
        }}
      >
        {/* Spacer for items before visible range */}
        {offsetY > 0 && (
          <Box sx={{ height: offsetY }} />
        )}

        {/* Render visible items */}
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.start + index;
          return (
            <ListItem
              key={item.id || actualIndex}
              sx={{
                height: itemHeight,
                position: 'relative',
                padding: 1,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              {isScrolling ? (
                // Show skeleton while scrolling for better performance
                <Skeleton variant="rectangular" width="100%" height={itemHeight - 16} />
              ) : (
                renderItem(item, actualIndex)
              )}
            </ListItem>
          );
        })}

        {/* Spacer for items after visible range */}
        {visibleRange.end < items.length - 1 && (
          <Box sx={{ height: (items.length - 1 - visibleRange.end) * itemHeight }} />
        )}
      </List>

      {/* Scroll indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          opacity: isScrolling ? 1 : 0,
          transition: 'opacity 0.2s'
        }}
      >
        {visibleRange.start + 1}-{visibleRange.end + 1} of {items.length}
      </Box>
    </Box>
  );
};

export default VirtualList;