import React, { useMemo, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Paper,
  ListItemButton
} from '@mui/material';
import { Code, Class, Functions, Folder } from '@mui/icons-material';

interface VirtualizedSearchResultsProps {
  items: any[];
  onItemClick?: (item: any, index: number) => void;
  searchTerm?: string;
  height?: number;
  itemHeight?: number;
}

const VirtualizedSearchResults: React.FC<VirtualizedSearchResultsProps> = memo(({
  items,
  onItemClick,
  searchTerm = '',
  height = 400,
  itemHeight = 72
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  const getElementIcon = useCallback((type: string) => {
    switch (type) {
      case 'module': return <Folder color="primary" />;
      case 'class': return <Class color="success" />;
      case 'function': return <Functions color="warning" />;
      default: return <Code color="action" />;
    }
  }, []);

  const getElementColor = useCallback((type: string) => {
    switch (type) {
      case 'module': return 'primary';
      case 'class': return 'success';
      case 'function': return 'warning';
      default: return 'default';
    }
  }, []);

  const highlightText = useCallback((text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <span key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  }, []);

  const memoizedItems = useMemo(() => {
    return virtualizer.getVirtualItems().map((virtualRow) => {
      const item = items[virtualRow.index];
      if (!item) return null;

      return (
        <ListItem
          key={virtualRow.index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
          disablePadding
          sx={{
            borderLeft: `4px solid`,
            borderColor: `${getElementColor(item.type)}.main`,
          }}
        >
          <ListItemButton
            onClick={() => onItemClick?.(item, virtualRow.index)}
            sx={{
              height: '100%',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <ListItemIcon>
              {getElementIcon(item.type)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" component="span">
                    {highlightText(item.name, searchTerm)}
                  </Typography>
                  <Chip
                    label={item.type}
                    size="small"
                    color={getElementColor(item.type) as any}
                    variant="outlined"
                  />
                </Box>
              }
              secondary={
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.file_path && highlightText(item.file_path, searchTerm)}
                  {item.description && ` • ${item.description.substring(0, 80)}...`}
                </Typography>
              }
            />
          </ListItemButton>
        </ListItem>
      );
    });
  }, [virtualizer, items, onItemClick, searchTerm, getElementColor, getElementIcon, highlightText]);

  if (!items || items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {searchTerm ? `No results found for "${searchTerm}"` : 'No items to display'}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={1} sx={{ height, overflow: 'hidden' }}>
      <Box
        ref={parentRef}
        sx={{
          height,
          overflow: 'auto',
        }}
      >
        <List
          sx={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
            padding: 0,
          }}
        >
          {memoizedItems}
        </List>
      </Box>
      
      {/* Performance info */}
      <Box sx={{ p: 1, backgroundColor: 'grey.50', fontSize: '0.75rem', color: 'text.secondary' }}>
        Showing {virtualizer.getVirtualItems().length} of {items.length} items (virtualized)
      </Box>
    </Paper>
  );
});

VirtualizedSearchResults.displayName = 'VirtualizedSearchResults';

export default VirtualizedSearchResults;