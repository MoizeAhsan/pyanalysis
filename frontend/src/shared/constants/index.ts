// Application constants
export const APP_NAME = 'Python Code Analyzer';
export const APP_VERSION = '2.0.0';

// API Configuration
export const API_ENDPOINTS = {
  ANALYZE: '/analyze',
  HEALTH: '/health',
  STATUS: '/status',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'pca-theme',
  USER_PREFERENCES: 'pca-user-preferences',
  RECENT_PROJECTS: 'pca-recent-projects',
  ANALYSIS_CACHE: 'pca-analysis-cache',
} as const;

// Theme Configuration
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Performance Thresholds
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300,
  VIRTUALIZATION_THRESHOLD: 100,
  LAZY_LOAD_THRESHOLD: 50,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Accessibility
export const A11Y = {
  FOCUS_VISIBLE_OUTLINE: '2px solid #1976d2',
  FOCUS_VISIBLE_OFFSET: '2px',
  MIN_TOUCH_TARGET: 44, // pixels
} as const;

// Breakpoints (matching Material-UI)
export const BREAKPOINTS = {
  XS: 0,
  SM: 600,
  MD: 900,
  LG: 1200,
  XL: 1536,
} as const;

// Animation Durations
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;