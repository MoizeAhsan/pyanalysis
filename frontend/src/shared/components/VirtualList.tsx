import { useEffect, useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, CircularProgress } from '@mui/material';

interface VirtualListProps<T> {
  items: readonly T[];
  /** Estimated row height in pixels; rows are measured after render. */
  estimateSize: number;
  height: number | string;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Called when the user scrolls near the end and more rows can be loaded. */
  onEndReached?: (() => void) | undefined;
  hasMore?: boolean | undefined;
  loadingMore?: boolean | undefined;
  ariaLabel: string;
}

const LOAD_AHEAD_ROWS = 10;

/** A list that only renders the rows in view, with optional incremental loading. */
export function VirtualList<T>({
  items,
  estimateSize,
  height,
  getKey,
  renderItem,
  onEndReached,
  hasMore = false,
  loadingMore = false,
  ariaLabel,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
    getItemKey: (index) => {
      const item = items[index];
      return item === undefined ? index : getKey(item, index);
    },
  });

  const rows = virtualizer.getVirtualItems();
  const lastIndex = rows.length > 0 ? (rows[rows.length - 1]?.index ?? 0) : 0;

  useEffect(() => {
    if (hasMore && !loadingMore && onEndReached && lastIndex >= items.length - LOAD_AHEAD_ROWS) {
      onEndReached();
    }
  }, [hasMore, loadingMore, onEndReached, lastIndex, items.length]);

  return (
    <Box
      ref={scrollRef}
      role="list"
      aria-label={ariaLabel}
      tabIndex={0}
      sx={{ height, overflowY: 'auto', contain: 'strict' }}
    >
      <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {rows.map((row) => {
          const item = items[row.index];
          if (item === undefined) return null;
          return (
            <Box
              key={row.key}
              role="listitem"
              data-index={row.index}
              ref={virtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
              }}
            >
              {renderItem(item, row.index)}
            </Box>
          );
        })}
      </Box>
      {loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} aria-label="Loading more" />
        </Box>
      )}
    </Box>
  );
}
