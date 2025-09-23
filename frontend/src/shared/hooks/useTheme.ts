import type { ThemeMode } from '@shared/types';

// This will be implemented when we create the theme context in task 2
// For now, return a basic implementation
function useTheme() {
  // Placeholder implementation - will be enhanced in theme system task
  const theme = 'light' as ThemeMode;
  const setTheme = (_theme: ThemeMode) => {
    console.log('Theme switching will be implemented in task 2');
  };

  return {
    theme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: theme === 'system',
  };
}

export default useTheme;