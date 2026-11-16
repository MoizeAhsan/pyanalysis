/**
 * Design tokens for spacing following Material Design 3 principles
 * Uses 8px base unit for consistent spacing
 */

export const spacingTokens = {
  // Base spacing unit (8px)
  base: 8,

  // Spacing scale
  xs: 4, // 0.5 * base
  sm: 8, // 1 * base
  md: 16, // 2 * base
  lg: 24, // 3 * base
  xl: 32, // 4 * base
  xxl: 48, // 6 * base
  xxxl: 64, // 8 * base

  // Component-specific spacing
  component: {
    // Padding
    padding: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },

    // Margins
    margin: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },

    // Gaps
    gap: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    },

    // Button spacing
    button: {
      paddingX: 16,
      paddingY: 8,
      gap: 8,
    },

    // Card spacing
    card: {
      padding: 16,
      gap: 12,
    },

    // Form spacing
    form: {
      fieldGap: 16,
      labelGap: 4,
      groupGap: 24,
    },

    // Navigation spacing
    navigation: {
      itemPadding: 12,
      itemGap: 4,
      sectionGap: 16,
    },
  },

  // Layout spacing
  layout: {
    containerPadding: {
      xs: 16,
      sm: 24,
      md: 32,
      lg: 48,
    },
    sectionGap: {
      xs: 24,
      sm: 32,
      md: 48,
      lg: 64,
    },
    gridGap: {
      xs: 8,
      sm: 12,
      md: 16,
      lg: 24,
    },
  },

  // Border radius
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },

  // Border width
  borderWidth: {
    none: 0,
    thin: 1,
    medium: 2,
    thick: 4,
  },
} as const;
