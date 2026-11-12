/**
 * High contrast theme support and accessibility enhancements
 */

import { createTheme, type Theme } from '@mui/material/styles';
import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { ColorContrast } from '@shared/utils/accessibility';

// Custom event name for high contrast changes
const HIGH_CONTRAST_CHANGE_EVENT = 'high-contrast-change';

/**
 * Hook to detect and manage high contrast preferences
 */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(() => {
    const userPreference = localStorage.getItem('high-contrast-mode');
    if (userPreference !== null) {
      return userPreference === 'true';
    }
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches;
    }
    return false;
  });
  const [systemPreference, setSystemPreference] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches;
    }
    return false;
  });

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

    // Listen for custom high contrast change events (for cross-component sync)
    const handleHighContrastChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isHighContrast: boolean }>;
      setIsHighContrast(customEvent.detail.isHighContrast);
    };

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'high-contrast-mode') {
        if (e.newValue === null) {
          setIsHighContrast(systemPreference);
        } else {
          setIsHighContrast(e.newValue === 'true');
        }
      }
    };

    mediaQuery.addListener(handleChange);
    window.addEventListener(HIGH_CONTRAST_CHANGE_EVENT, handleHighContrastChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeListener(handleChange);
      window.removeEventListener(HIGH_CONTRAST_CHANGE_EVENT, handleHighContrastChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [systemPreference]);

  const toggleHighContrast = useCallback(() => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem('high-contrast-mode', newValue.toString());

    // Dispatch custom event to notify other instances
    window.dispatchEvent(
      new CustomEvent(HIGH_CONTRAST_CHANGE_EVENT, {
        detail: { isHighContrast: newValue },
      }),
    );
  }, [isHighContrast]);

  const resetToSystemPreference = useCallback(() => {
    localStorage.removeItem('high-contrast-mode');
    setIsHighContrast(systemPreference);

    // Dispatch custom event to notify other instances
    window.dispatchEvent(
      new CustomEvent(HIGH_CONTRAST_CHANGE_EVENT, {
        detail: { isHighContrast: systemPreference },
      }),
    );
  }, [systemPreference]);

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
      primaryOnBackground: checkContrast(
        theme.palette.primary.main,
        theme.palette.background.default,
      ),
      textOnBackground: checkContrast(theme.palette.text.primary, theme.palette.background.default),
      textOnPaper: checkContrast(theme.palette.text.primary, theme.palette.background.paper),
      primaryContrastOnPrimary: checkContrast(
        theme.palette.primary.contrastText,
        theme.palette.primary.main,
      ),
      secondaryContrastOnSecondary: checkContrast(
        theme.palette.secondary.contrastText,
        theme.palette.secondary.main,
      ),
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
 * High contrast theme: pure black and white with a heavy focus outline,
 * layered over the base theme so everything else is inherited.
 */
export const getHighContrastTheme = (baseTheme: Theme): Theme => {
  const dark = baseTheme.palette.mode === 'dark';
  const foreground = dark ? '#ffffff' : '#000000';
  const background = dark ? '#000000' : '#ffffff';
  const focusRing = {
    '&:focus-visible': { outline: `3px solid ${foreground}`, outlineOffset: 2 },
  };
  return createTheme(baseTheme, {
    palette: {
      primary: { main: foreground, contrastText: background },
      secondary: { main: foreground, contrastText: background },
      text: { primary: foreground, secondary: dark ? '#cccccc' : '#333333' },
      background: { default: background, paper: dark ? '#111111' : '#f5f5f5' },
      divider: foreground,
      action: {
        hover: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        selected: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      },
    },
    components: {
      MuiButton: { styleOverrides: { root: focusRing } },
      MuiIconButton: { styleOverrides: { root: focusRing } },
      MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': focusRing } } },
    },
  });
};

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
