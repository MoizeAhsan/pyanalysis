/**
 * Design tokens index - exports all design tokens
 */

export { colorTokens, type ColorToken } from './colors';
export { spacingTokens, type SpacingToken } from './spacing';
export { typographyTokens, type TypographyToken } from './typography';
export { shadowTokens, type ShadowToken } from './shadows';

import { colorTokens, type ColorToken } from './colors';
import { spacingTokens, type SpacingToken } from './spacing';
import { typographyTokens, type TypographyToken } from './typography';
import { shadowTokens, type ShadowToken } from './shadows';

// Combined design tokens type
export interface DesignTokens {
  colors: ColorToken;
  spacing: SpacingToken;
  typography: TypographyToken;
  shadows: ShadowToken;
}

// Export all tokens as a single object
export const designTokens: DesignTokens = {
  colors: colorTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
  shadows: shadowTokens,
} as const;