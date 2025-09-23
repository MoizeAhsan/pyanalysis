import React from 'react';
import { Button, IconButton, Fab, useTheme } from '@mui/material';

/**
 * Enhanced button component with improved hover effects and animations
 */
const EnhancedButton = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  endIcon,
  loading = false,
  disabled = false,
  hoverEffect = 'lift',
  glowColor,
  className = '',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  const getHoverStyles = () => {
    const baseStyles = {
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    switch (hoverEffect) {
      case 'lift':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0px 6px 20px ${theme.palette[color]?.main || color}40`,
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
        };
      
      case 'scale':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        };
      
      case 'glow':
        return {
          ...baseStyles,
          '&:hover': {
            boxShadow: `0 0 20px ${glowColor || theme.palette[color]?.main || color}60`,
          },
        };
      
      case 'slide':
        return {
          ...baseStyles,
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'left 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          },
        };
      
      case 'pulse':
        return {
          ...baseStyles,
          '&:hover': {
            animation: 'pulse 1s infinite',
            '@keyframes pulse': {
              '0%': {
                transform: 'scale(1)',
              },
              '50%': {
                transform: 'scale(1.05)',
              },
              '100%': {
                transform: 'scale(1)',
              },
            },
          },
        };
      
      default:
        return baseStyles;
    }
  };

  const enhancedSx = {
    ...getHoverStyles(),
    borderRadius: 2,
    fontWeight: 600,
    textTransform: 'none',
    ...(loading && {
      '&.MuiButton-root': {
        background: `linear-gradient(45deg, ${theme.palette[color]?.light || color}60 30%, ${theme.palette[color]?.main || color}60 90%)`,
        animation: 'pulse 2s infinite',
      },
    }),
    ...sx,
  };

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      disabled={disabled || loading}
      className={`enhanced-button ${className} ${loading ? 'loading' : ''}`}
      sx={enhancedSx}
      {...props}
    >
      {children}
    </Button>
  );
};

/**
 * Enhanced Icon Button with hover effects
 */
export const EnhancedIconButton = ({
  children,
  color = 'primary',
  size = 'medium',
  hoverEffect = 'scale',
  className = '',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  const getHoverStyles = () => {
    const baseStyles = {
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: 2,
    };

    switch (hoverEffect) {
      case 'scale':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: `${theme.palette[color]?.main || color}10`,
          },
        };
      
      case 'rotate':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'rotate(15deg)',
            backgroundColor: `${theme.palette[color]?.main || color}10`,
          },
        };
      
      case 'bounce':
        return {
          ...baseStyles,
          '&:hover': {
            animation: 'bounce 0.6s',
            '@keyframes bounce': {
              '0%, 20%, 60%, 100%': {
                transform: 'translateY(0)',
              },
              '40%': {
                transform: 'translateY(-10px)',
              },
              '80%': {
                transform: 'translateY(-5px)',
              },
            },
          },
        };
      
      default:
        return baseStyles;
    }
  };

  return (
    <IconButton
      color={color}
      size={size}
      className={`enhanced-icon-button ${className}`}
      sx={{
        ...getHoverStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </IconButton>
  );
};

/**
 * Enhanced Floating Action Button
 */
export const EnhancedFab = ({
  children,
  color = 'primary',
  size = 'large',
  hoverEffect = 'lift',
  className = '',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  const getHoverStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    switch (hoverEffect) {
      case 'lift':
        return {
          ...baseStyles,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0px 8px 25px ${theme.palette[color]?.main || color}40`,
          },
        };
      
      case 'pulse':
        return {
          ...baseStyles,
          '&:hover': {
            animation: 'pulse 1s infinite',
            boxShadow: `0px 4px 20px ${theme.palette[color]?.main || color}40`,
          },
        };
      
      default:
        return baseStyles;
    }
  };

  return (
    <Fab
      color={color}
      size={size}
      className={`enhanced-fab ${className}`}
      sx={{
        ...getHoverStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Fab>
  );
};

export default EnhancedButton;