/**
 * Spacing utilities for consistent spacing throughout the application
 */

import { spacingTokens } from '../tokens';

export type SpacingValue = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'base' | number;

/**
 * Get spacing value in pixels
 */
export function getSpacing(value: SpacingValue): number {
  if (typeof value === 'number') {
    return value;
  }
  
  // Handle specific spacing keys
  const spacingMap: Record<string, number> = {
    xs: spacingTokens.xs,
    sm: spacingTokens.sm,
    md: spacingTokens.md,
    lg: spacingTokens.lg,
    xl: spacingTokens.xl,
    xxl: spacingTokens.xxl,
    xxxl: spacingTokens.xxxl,
    base: spacingTokens.base,
  };
  
  return spacingMap[value] || spacingTokens.base;
}

/**
 * Generate spacing CSS properties
 */
export function spacing(value: SpacingValue) {
  return `${getSpacing(value)}px`;
}

/**
 * Generate margin utilities
 */
export const margin = {
  all: (value: SpacingValue) => ({ margin: spacing(value) }),
  top: (value: SpacingValue) => ({ marginTop: spacing(value) }),
  right: (value: SpacingValue) => ({ marginRight: spacing(value) }),
  bottom: (value: SpacingValue) => ({ marginBottom: spacing(value) }),
  left: (value: SpacingValue) => ({ marginLeft: spacing(value) }),
  x: (value: SpacingValue) => ({
    marginLeft: spacing(value),
    marginRight: spacing(value),
  }),
  y: (value: SpacingValue) => ({
    marginTop: spacing(value),
    marginBottom: spacing(value),
  }),
};

/**
 * Generate padding utilities
 */
export const padding = {
  all: (value: SpacingValue) => ({ padding: spacing(value) }),
  top: (value: SpacingValue) => ({ paddingTop: spacing(value) }),
  right: (value: SpacingValue) => ({ paddingRight: spacing(value) }),
  bottom: (value: SpacingValue) => ({ paddingBottom: spacing(value) }),
  left: (value: SpacingValue) => ({ paddingLeft: spacing(value) }),
  x: (value: SpacingValue) => ({
    paddingLeft: spacing(value),
    paddingRight: spacing(value),
  }),
  y: (value: SpacingValue) => ({
    paddingTop: spacing(value),
    paddingBottom: spacing(value),
  }),
};

/**
 * Generate gap utilities
 */
export const gap = {
  all: (value: SpacingValue) => ({ gap: spacing(value) }),
  x: (value: SpacingValue) => ({ columnGap: spacing(value) }),
  y: (value: SpacingValue) => ({ rowGap: spacing(value) }),
};

/**
 * Responsive spacing helper
 */
export function responsiveSpacing(values: {
  xs?: SpacingValue;
  sm?: SpacingValue;
  md?: SpacingValue;
  lg?: SpacingValue;
  xl?: SpacingValue;
}) {
  const result: Record<string, any> = {};
  
  Object.entries(values).forEach(([breakpoint, value]) => {
    if (value !== undefined) {
      if (breakpoint === 'xs') {
        result.spacing = spacing(value);
      } else {
        result[`@media (min-width: ${getBreakpointValue(breakpoint)}px)`] = {
          spacing: spacing(value),
        };
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