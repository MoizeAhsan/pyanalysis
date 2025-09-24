/**
 * High contrast theme support and accessibility enhancements
 */

import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { ColorContrast } from '@shared/utils/accessibility';

/**
 * Hook to detect and manage high contrast preferences
 */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [systemPreference, setSystemPreference] = useState(false);

  useEffect(() => {
    // Check for system high contrast preference
    const checkSystemPreference = () => {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      setSystemPreference(mediaQuery.matches);
      
      // If no user preference is set, follow system preference
      const userPreference = localStorage.getItem('high-contrast-mode');
      if (userPreference === null) {
        setIsHighContrast(mediaQuery.matches);
      } else {
        setIsHighContrast(userPreference === 'true');
      }
    };

    checkSystemPreference();

    // Listen for changes to system preference
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches);
      // Only auto-update if user hasn't set a preference
      const userPreference = localStorage.getItem('high-contrast-mode');
      if (userPreference === null) {
        setIsHighContrast(e.matches);
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem('high-contrast-mode', newValue.toString());
  };

  const resetToSystemPreference = () => {
    localStorage.removeItem('high-contrast-mode');
    setIsHighContrast(systemPreference);
  };

  return {
    isHighContrast,
    systemPreference,
    toggleHighContrast,
    resetToSystemPreference,
  };
}

/**
 * Hook to check color contrast compliance
 */
export function useColorContrastCheck() {
  const theme = useTheme();

  const checkContrast = (foreground: string, background: string, level: 'AA' | 'AAA' = 'AA') => {
    return ColorContrast.meetsWCAG(foreground, background, level);
  };

  const getContrastRatio = (foreground: string, background: string) => {
    return ColorContrast.getContrastRatio(foreground, background);
  };

  const checkThemeContrast = () => {
    const results = {
      primaryOnBackground: checkContrast(theme.palette.primary.main, theme.palette.background.default),
      textOnBackground: checkContrast(theme.palette.text.primary, theme.palette.background.default),
      textOnPaper: checkContrast(theme.palette.text.primary, theme.palette.background.paper),
      primaryContrastOnPrimary: checkContrast(theme.palette.primary.contrastText, theme.palette.primary.main),
      secondaryContrastOnSecondary: checkContrast(theme.palette.secondary.contrastText, theme.palette.secondary.main),
    };

    return results;
  };

  return {
    checkContrast,
    getContrastRatio,
    checkThemeContrast,
  };
}

/**
 * High contrast theme modifications
 */
export const getHighContrastTheme = (baseTheme: any) => ({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    mode: baseTheme.palette.mode,
    primary: {
      ...baseTheme.palette.primary,
      main: baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000',
      contrastText: baseTheme.palette.mode === 'dark' ? '#000000' : '#ffffff',
    },
    secondary: {
      ...baseTheme.palette.secondary,
      main: baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000',
      contrastText: baseTheme.palette.mode === 'dark' ? '#000000' : '#ffffff',
    },
    text: {
      primary: baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000',
      secondary: baseTheme.palette.mode === 'dark' ? '#cccccc' : '#333333',
    },
    background: {
      default: baseTheme.palette.mode === 'dark' ? '#000000' : '#ffffff',
      paper: baseTheme.palette.mode === 'dark' ? '#111111' : '#f5f5f5',
    },
    divider: baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000',
    action: {
      ...baseTheme.palette.action,
      hover: baseTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      selected: baseTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiButton: {
      ...baseTheme.components?.MuiButton,
      styleOverrides: {
        ...baseTheme.components?.MuiButton?.styleOverrides,
        root: {
          ...baseTheme.components?.MuiButton?.styleOverrides?.root,
          '&:focus-visible': {
            outline: `3px solid ${baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiIconButton: {
      ...baseTheme.components?.MuiIconButton,
      styleOverrides: {
        ...baseTheme.components?.MuiIconButton?.styleOverrides,
        root: {
          ...baseTheme.components?.MuiIconButton?.styleOverrides?.root,
          '&:focus-visible': {
            outline: `3px solid ${baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTextField: {
      ...baseTheme.components?.MuiTextField,
      styleOverrides: {
        ...baseTheme.components?.MuiTextField?.styleOverrides,
        root: {
          ...baseTheme.components?.MuiTextField?.styleOverrides?.root,
          '& .MuiOutlinedInput-root': {
            '&:focus-visible': {
              outline: `3px solid ${baseTheme.palette.mode === 'dark' ? '#ffffff' : '#000000'}`,
              outlineOffset: 2,
            },
          },
        },
      },
    },
  },
});

/**
 * Reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return {
    prefersReducedMotion,
  };
}

/**
 * Accessible animation settings based on user preferences
 */
export function useAccessibleAnimation() {
  const { prefersReducedMotion } = useReducedMotion();

  const getAnimationProps = (normalProps: any, reducedProps?: any) => {
    if (prefersReducedMotion) {
      return reducedProps || { transition: { duration: 0 } };
    }
    return normalProps;
  };

  const shouldAnimate = () => !prefersReducedMotion;

  return {
    prefersReducedMotion,
    getAnimationProps,
    shouldAnimate,
  };
}