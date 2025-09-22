import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Badge
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

/**
 * CollapsibleSection component for progressive disclosure
 * Allows sections to be collapsed/expanded to manage information density
 */
const CollapsibleSection = ({
  title,
  children,
  defaultExpanded = false,
  icon = null,
  badge = null,
  variant = 'outlined',
  sx = {},
  headerSx = {},
  contentSx = {},
  disabled = false,
  ...paperProps
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (!disabled) {
      setExpanded(!expanded);
    }
  };

  const titleElement = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
      {icon && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" component="div" sx={{ flex: 1 }}>
        {title}
      </Typography>
      {badge !== null && badge !== undefined && (
        <Badge
          badgeContent={badge}
          color="primary"
          max={999}
          sx={{ mr: 1 }}
        >
          <Box />
        </Badge>
      )}
    </Box>
  );

  return (
    <Paper variant={variant} sx={{ mb: 2, ...sx }} {...paperProps}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          cursor: disabled ? 'default' : 'pointer',
          '&:hover': disabled ? {} : {
            backgroundColor: 'action.hover'
          },
          ...headerSx
        }}
        onClick={handleToggle}
      >
        {titleElement}
        
        {!disabled && (
          <IconButton
            size="small"
            sx={{ ml: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Box>

      {!disabled && <Divider />}

      <Collapse in={expanded || disabled} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2, ...contentSx }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default CollapsibleSection;