/**
 * Typography utilities for consistent text styling throughout the application
 */

import { typographyTokens } from '../tokens';

export type TypographyVariant = keyof typeof typographyTokens.scale;
export type FontWeight = keyof typeof typographyTokens.fontWeight;
export type FontSize = keyof typeof typographyTokens.fontSize;

/**
 * Get typography scale styles
 */
export function getTypographyScale(variant: TypographyVariant) {
  return typographyTokens.scale[variant];
}

/**
 * Get font weight value
 */
export function getFontWeight(weight: FontWeight): number {
  return typographyTokens.fontWeight[weight];
}

/**
 * Get font size value
 */
export function getFontSize(size: FontSize): string {
  return typographyTokens.fontSize[size];
}

/**
 * Typography utility functions
 */
export const typography = {
  // Font families
  fontFamily: {
    primary: () => ({ fontFamily: typographyTokens.fontFamily.primary }),
    monospace: () => ({ fontFamily: typographyTokens.fontFamily.monospace }),
  },
  
  // Font weights
  fontWeight: {
    light: () => ({ fontWeight: typographyTokens.fontWeight.light }),
    regular: () => ({ fontWeight: typographyTokens.fontWeight.regular }),
    medium: () => ({ fontWeight: typographyTokens.fontWeight.medium }),
    semibold: () => ({ fontWeight: typographyTokens.fontWeight.semibold }),
    bold: () => ({ fontWeight: typographyTokens.fontWeight.bold }),
    extrabold: () => ({ fontWeight: typographyTokens.fontWeight.extrabold }),
  },
  
  // Font sizes
  fontSize: {
    xs: () => ({ fontSize: typographyTokens.fontSize.xs }),
    sm: () => ({ fontSize: typographyTokens.fontSize.sm }),
    base: () => ({ fontSize: typographyTokens.fontSize.base }),
    lg: () => ({ fontSize: typographyTokens.fontSize.lg }),
    xl: () => ({ fontSize: typographyTokens.fontSize.xl }),
    '2xl': () => ({ fontSize: typographyTokens.fontSize['2xl'] }),
    '3xl': () => ({ fontSize: typographyTokens.fontSize['3xl'] }),
    '4xl': () => ({ fontSize: typographyTokens.fontSize['4xl'] }),
    '5xl': () => ({ fontSize: typographyTokens.fontSize['5xl'] }),
    '6xl': () => ({ fontSize: typographyTokens.fontSize['6xl'] }),
  },
  
  // Line heights
  lineHeight: {
    none: () => ({ lineHeight: typographyTokens.lineHeight.none }),
    tight: () => ({ lineHeight: typographyTokens.lineHeight.tight }),
    snug: () => ({ lineHeight: typographyTokens.lineHeight.snug }),
    normal: () => ({ lineHeight: typographyTokens.lineHeight.normal }),
    relaxed: () => ({ lineHeight: typographyTokens.lineHeight.relaxed }),
    loose: () => ({ lineHeight: typographyTokens.lineHeight.loose }),
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: () => ({ letterSpacing: typographyTokens.letterSpacing.tighter }),
    tight: () => ({ letterSpacing: typographyTokens.letterSpacing.tight }),
    normal: () => ({ letterSpacing: typographyTokens.letterSpacing.normal }),
    wide: () => ({ letterSpacing: typographyTokens.letterSpacing.wide }),
    wider: () => ({ letterSpacing: typographyTokens.letterSpacing.wider }),
    widest: () => ({ letterSpacing: typographyTokens.letterSpacing.widest }),
  },
  
  // Material Design 3 scale
  scale: {
    displayLarge: () => getTypographyScale('displayLarge'),
    displayMedium: () => getTypographyScale('displayMedium'),
    displaySmall: () => getTypographyScale('displaySmall'),
    headlineLarge: () => getTypographyScale('headlineLarge'),
    headlineMedium: () => getTypographyScale('headlineMedium'),
    headlineSmall: () => getTypographyScale('headlineSmall'),
    titleLarge: () => getTypographyScale('titleLarge'),
    titleMedium: () => getTypographyScale('titleMedium'),
    titleSmall: () => getTypographyScale('titleSmall'),
    labelLarge: () => getTypographyScale('labelLarge'),
    labelMedium: () => getTypographyScale('labelMedium'),
    labelSmall: () => getTypographyScale('labelSmall'),
    bodyLarge: () => getTypographyScale('bodyLarge'),
    bodyMedium: () => getTypographyScale('bodyMedium'),
    bodySmall: () => getTypographyScale('bodySmall'),
  },
};

/**
 * Text truncation utilities
 */
export const textTruncate = {
  single: () => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  }),
  
  multiline: (lines: number) => ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
};

/**
 * Text alignment utilities
 */
export const textAlign = {
  left: () => ({ textAlign: 'left' as const }),
  center: () => ({ textAlign: 'center' as const }),
  right: () => ({ textAlign: 'right' as const }),
  justify: () => ({ textAlign: 'justify' as const }),
};

/**
 * Responsive typography helper
 */
export function responsiveTypography(values: {
  xs?: TypographyVariant;
  sm?: TypographyVariant;
  md?: TypographyVariant;
  lg?: TypographyVariant;
  xl?: TypographyVariant;
}) {
  const result: Record<string, any> = {};
  
  Object.entries(values).forEach(([breakpoint, variant]) => {
    if (variant !== undefined) {
      const styles = getTypographyScale(variant);
      if (breakpoint === 'xs') {
        Object.assign(result, styles);
      } else {
        result[`@media (min-width: ${getBreakpointValue(breakpoint)}px)`] = styles;
      }
    }
  });
  
  return result;
}

function getBreakpointValue(breakpoint: string): number {
  const breakpoints = {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  };
  return breakpoints[breakpoint as keyof typeof breakpoints] || 0;
}