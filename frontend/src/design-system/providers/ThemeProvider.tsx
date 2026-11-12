/**
 * Theme Provider with system preference detection and localStorage persistence
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme, type ThemeMode } from '../themes';
import { useHighContrast, getHighContrastTheme } from '@shared/hooks/useAccessibility';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  systemPreference: 'light' | 'dark';
  effectiveMode: 'light' | 'dark';
  isHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'python-analyzer-theme-mode';

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isHighContrast } = useHighContrast();

  // Detect system preference
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Get initial theme mode from localStorage or default to system
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode;
      }
    }
    return 'system';
  });

  // Calculate effective mode (resolves 'system' to actual theme)
  const effectiveMode: 'light' | 'dark' = mode === 'system' ? systemPreference : mode;

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        setSystemPreference(e.matches ? 'dark' : 'light');
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
      // Legacy browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }

    // Return undefined for cases where no cleanup is needed
    return undefined;
  }, []);

  // Update CSS custom properties when theme changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Set theme attribute for CSS variables
      root.setAttribute('data-theme', effectiveMode);

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', effectiveMode === 'dark' ? '#121212' : '#ffffff');
      } else {
        // Create meta theme-color if it doesn't exist
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = effectiveMode === 'dark' ? '#121212' : '#ffffff';
        document.head.appendChild(meta);
      }
    }
  }, [effectiveMode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    }
  };

  const toggleMode = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('system');
    } else {
      setMode('light');
    }
  };

  const contextValue: ThemeContextType = {
    mode,
    setMode,
    toggleMode,
    systemPreference,
    effectiveMode,
    isHighContrast,
  };

  // Select the appropriate theme
  let currentTheme = effectiveMode === 'dark' ? darkTheme : lightTheme;

  // Apply high contrast modifications if needed
  if (isHighContrast) {
    currentTheme = getHighContrastTheme(currentTheme);
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for getting theme-aware values
export function useThemeMode() {
  const { effectiveMode } = useTheme();
  return effectiveMode;
}

// Hook for theme toggle functionality
export function useThemeToggle() {
  const { mode, setMode, toggleMode } = useTheme();
  return { mode, setMode, toggleMode };
}
