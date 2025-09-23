/**
 * Theme Switcher Component
 * Provides UI for switching between light, dark, and system themes
 */

import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  LightMode,
  DarkMode,
  SettingsBrightness,
  Palette,
} from '@mui/icons-material';
import { useTheme } from '../providers/ThemeProvider';

interface ThemeSwitcherProps {
  variant?: 'icon' | 'menu';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function ThemeSwitcher({ 
  variant = 'icon', 
  size = 'medium',
  showLabel = false 
}: ThemeSwitcherProps) {
  const { mode, setMode, effectiveMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (variant === 'icon') {
      // For icon variant, cycle through themes
      if (mode === 'light') {
        setMode('dark');
      } else if (mode === 'dark') {
        setMode('system');
      } else {
        setMode('light');
      }
    } else {
      // For menu variant, open menu
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeSelect = (selectedMode: 'light' | 'dark' | 'system') => {
    setMode(selectedMode);
    handleClose();
  };

  const getIcon = () => {
    switch (effectiveMode) {
      case 'dark':
        return <DarkMode />;
      case 'light':
        return <LightMode />;
      default:
        return <SettingsBrightness />;
    }
  };

  const getTooltipText = () => {
    const modeText = mode === 'system' ? `System (${effectiveMode})` : mode;
    return `Current theme: ${modeText}. Click to ${variant === 'icon' ? 'cycle themes' : 'open theme menu'}`;
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={getTooltipText()} arrow>
        <IconButton
          onClick={handleClick}
          size={size}
          sx={{
            color: 'text.primary',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'action.hover',
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
          aria-label="Toggle theme"
        >
          {getIcon()}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip title="Theme settings" arrow>
        <IconButton
          onClick={handleClick}
          size={size}
          sx={{
            color: 'text.primary',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
          aria-label="Open theme menu"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Palette />
        </IconButton>
      </Tooltip>
      
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 160,
            borderRadius: 2,
            boxShadow: muiTheme.shadows[3],
          },
        }}
      >
        <MenuItem
          onClick={() => handleModeSelect('light')}
          selected={mode === 'light'}
          sx={{
            borderRadius: 1,
            mx: 1,
            my: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <LightMode fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Light" />
        </MenuItem>
        
        <MenuItem
          onClick={() => handleModeSelect('dark')}
          selected={mode === 'dark'}
          sx={{
            borderRadius: 1,
            mx: 1,
            my: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DarkMode fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Dark" />
        </MenuItem>
        
        <MenuItem
          onClick={() => handleModeSelect('system')}
          selected={mode === 'system'}
          sx={{
            borderRadius: 1,
            mx: 1,
            my: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <SettingsBrightness fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="System" 
            secondary={showLabel ? `(${effectiveMode})` : undefined}
          />
        </MenuItem>
      </Menu>
    </>
  );
}