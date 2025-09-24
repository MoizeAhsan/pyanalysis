import React, { useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, ListItem, ListItemText, Typography } from '@mui/material';

interface VirtualizedListProps {
  items: any[];
  itemHeight?: number;
  height?: number;
  width?: string | number;
  renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
}

const VirtualizedList: React.FC<VirtualizedListProps> = memo(({
  items,
  itemHeight = 80,
  height = 400,
  width = '100%',
  renderItem,
  overscan = 5,
  className
}) => {
  const Row = useMemo(() => {
    return memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
      if (index >= items.length) return null;
      
      return (
        <div style={style}>
          {renderItem(items[index], index, style)}
        </div>
      );
    });
  }, [items, renderItem]);

  Row.displayName = 'VirtualizedRow';

  if (!items || items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No items to display
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ width, height }}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscan}
        width={width}
      >
        {Row}
      </List>
    </Box>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

export default VirtualizedList;

// Default item renderer for simple text lists
export const DefaultItemRenderer = memo(({ item, index, style }: { 
  item: any; 
  index: number; 
  style: React.CSSProperties; 
}) => (
  <ListItem style={style} divider>
    <ListItemText
      primary={item.name || item.title || `Item ${index + 1}`}
      secondary={item.description || item.subtitle || ''}
    />
  </ListItem>
));

DefaultItemRenderer.displayName = 'DefaultItemRenderer';