import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

/**
 * ResponsiveContainer component that provides responsive layout utilities
 * and breakpoint-aware styling for better mobile experience
 */
const ResponsiveContainer = ({ 
  children, 
  spacing = 2, 
  maxWidth = 'xl',
  className = '',
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: maxWidth === 'xl' ? 1200 : 
                  maxWidth === 'lg' ? 960 : 
                  maxWidth === 'md' ? 720 : 
                  maxWidth === 'sm' ? 540 : '100%',
        mx: 'auto',
        px: {
          xs: theme.spacing(spacing),
          sm: theme.spacing(spacing + 1),
          md: theme.spacing(spacing + 2),
        },
        py: {
          xs: theme.spacing(spacing),
          sm: theme.spacing(spacing + 0.5),
        },
        // Add responsive utilities as data attributes
        'data-mobile': isMobile,
        'data-tablet': isTablet,
        'data-desktop': !isTablet,
      }}
      className={`responsive-container ${className}`}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * ResponsiveGrid component for creating responsive grid layouts
 */
export const ResponsiveGrid = ({ 
  children, 
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  spacing = 2,
  className = '',
  ...props 
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs || 1}, 1fr)`,
          sm: `repeat(${columns.sm || 2}, 1fr)`,
          md: `repeat(${columns.md || 3}, 1fr)`,
          lg: `repeat(${columns.lg || 4}, 1fr)`,
          xl: `repeat(${columns.xl || columns.lg || 4}, 1fr)`,
        },
        gap: {
          xs: spacing,
          sm: spacing + 0.5,
          md: spacing + 1,
        },
      }}
      className={`responsive-grid ${className}`}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * ResponsiveStack component for creating responsive flex layouts
 */
export const ResponsiveStack = ({ 
  children, 
  direction = { xs: 'column', sm: 'row' },
  spacing = 2,
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  className = '',
  ...props 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: {
          xs: direction.xs || 'column',
          sm: direction.sm || 'row',
          md: direction.md || direction.sm || 'row',
          lg: direction.lg || direction.md || direction.sm || 'row',
        },
        gap: {
          xs: spacing,
          sm: spacing + 0.5,
        },
        alignItems: {
          xs: typeof alignItems === 'object' ? alignItems.xs : alignItems,
          sm: typeof alignItems === 'object' ? alignItems.sm : alignItems,
          md: typeof alignItems === 'object' ? alignItems.md : alignItems,
        },
        justifyContent: {
          xs: typeof justifyContent === 'object' ? justifyContent.xs : justifyContent,
          sm: typeof justifyContent === 'object' ? justifyContent.sm : justifyContent,
          md: typeof justifyContent === 'object' ? justifyContent.md : justifyContent,
        },
      }}
      className={`responsive-stack ${className}`}
      {...props}
    >
      {children}
    </Box>
  );
};

/**
 * Hook for getting current breakpoint information
 */
export const useResponsive = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint: isMobile ? 'mobile' : 
                isTablet ? 'tablet' : 
                isLargeDesktop ? 'large-desktop' : 'desktop',
  };
};

export default ResponsiveContainer;