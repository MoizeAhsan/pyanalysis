/**
 * Design tokens for typography following Material Design 3 principles
 * Includes font families, sizes, weights, and line heights
 */

export const typographyTokens = {
  // Font families
  fontFamily: {
    primary: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),

    monospace: [
      '"SF Mono"',
      'Monaco',
      'Inconsolata',
      '"Roboto Mono"',
      '"Source Code Pro"',
      'Menlo',
      'Consolas',
      '"Courier New"',
      'monospace',
    ].join(','),
  },

  // Font weights
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Font sizes (rem units)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
  },

  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Material Design 3 Typography Scale
  scale: {
    // Display styles
    displayLarge: {
      fontSize: '3.5rem', // 56px
      lineHeight: 1.14, // 64px
      fontWeight: 400,
      letterSpacing: '-0.025em',
    },
    displayMedium: {
      fontSize: '2.8125rem', // 45px
      lineHeight: 1.16, // 52px
      fontWeight: 400,
      letterSpacing: '0em',
    },
    displaySmall: {
      fontSize: '2.25rem', // 36px
      lineHeight: 1.22, // 44px
      fontWeight: 400,
      letterSpacing: '0em',
    },

    // Headline styles
    headlineLarge: {
      fontSize: '2rem', // 32px
      lineHeight: 1.25, // 40px
      fontWeight: 400,
      letterSpacing: '0em',
    },
    headlineMedium: {
      fontSize: '1.75rem', // 28px
      lineHeight: 1.29, // 36px
      fontWeight: 400,
      letterSpacing: '0em',
    },
    headlineSmall: {
      fontSize: '1.5rem', // 24px
      lineHeight: 1.33, // 32px
      fontWeight: 400,
      letterSpacing: '0em',
    },

    // Title styles
    titleLarge: {
      fontSize: '1.375rem', // 22px
      lineHeight: 1.27, // 28px
      fontWeight: 400,
      letterSpacing: '0em',
    },
    titleMedium: {
      fontSize: '1rem', // 16px
      lineHeight: 1.5, // 24px
      fontWeight: 500,
      letterSpacing: '0.009375em',
    },
    titleSmall: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.43, // 20px
      fontWeight: 500,
      letterSpacing: '0.00714em',
    },

    // Label styles
    labelLarge: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.43, // 20px
      fontWeight: 500,
      letterSpacing: '0.00714em',
    },
    labelMedium: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.33, // 16px
      fontWeight: 500,
      letterSpacing: '0.04167em',
    },
    labelSmall: {
      fontSize: '0.6875rem', // 11px
      lineHeight: 1.45, // 16px
      fontWeight: 500,
      letterSpacing: '0.04545em',
    },

    // Body styles
    bodyLarge: {
      fontSize: '1rem', // 16px
      lineHeight: 1.5, // 24px
      fontWeight: 400,
      letterSpacing: '0.03125em',
    },
    bodyMedium: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.43, // 20px
      fontWeight: 400,
      letterSpacing: '0.01786em',
    },
    bodySmall: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.33, // 16px
      fontWeight: 400,
      letterSpacing: '0.03333em',
    },
  },
} as const;
