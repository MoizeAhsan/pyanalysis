/**
 * Light theme configuration for Material Design 3
 */

import { createTheme } from '@mui/material/styles';
import { colorTokens, typographyTokens, shadowTokens, spacingTokens } from '../tokens';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colorTokens.primary[700],
      light: colorTokens.primary[400],
      dark: colorTokens.primary[800],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colorTokens.secondary[600],
      light: colorTokens.secondary[400],
      dark: colorTokens.secondary[800],
      contrastText: '#ffffff',
    },
    error: {
      main: colorTokens.error[600],
      light: colorTokens.error[400],
      dark: colorTokens.error[800],
      contrastText: '#ffffff',
    },
    warning: {
      main: colorTokens.warning[600],
      light: colorTokens.warning[400],
      dark: colorTokens.warning[800],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: colorTokens.info[600],
      light: colorTokens.info[400],
      dark: colorTokens.info[800],
      contrastText: '#ffffff',
    },
    success: {
      main: colorTokens.success[600],
      light: colorTokens.success[400],
      dark: colorTokens.success[800],
      contrastText: '#ffffff',
    },
    background: {
      default: colorTokens.surface.light.background,
      paper: colorTokens.surface.light.paper,
    },
    text: {
      primary: colorTokens.text.light.primary,
      secondary: colorTokens.text.light.secondary,
      disabled: colorTokens.text.light.disabled,
    },
    divider: colorTokens.divider.light,
    action: {
      active: colorTokens.action.light.active,
      hover: colorTokens.action.light.hover,
      selected: colorTokens.action.light.selected,
      disabled: colorTokens.action.light.disabled,
      disabledBackground: colorTokens.action.light.disabledBackground,
      focus: colorTokens.action.light.focus,
    },
  },

  typography: {
    fontFamily: typographyTokens.fontFamily.primary,

    // Material Design 3 typography scale
    h1: {
      ...typographyTokens.scale.displayLarge,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    h2: {
      ...typographyTokens.scale.displayMedium,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    h3: {
      ...typographyTokens.scale.displaySmall,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    h4: {
      ...typographyTokens.scale.headlineLarge,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    h5: {
      ...typographyTokens.scale.headlineMedium,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    h6: {
      ...typographyTokens.scale.headlineSmall,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    subtitle1: {
      ...typographyTokens.scale.titleLarge,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    subtitle2: {
      ...typographyTokens.scale.titleMedium,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    body1: {
      ...typographyTokens.scale.bodyLarge,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    body2: {
      ...typographyTokens.scale.bodyMedium,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    caption: {
      ...typographyTokens.scale.bodySmall,
      fontFamily: typographyTokens.fontFamily.primary,
    },
    button: {
      ...typographyTokens.scale.labelLarge,
      fontFamily: typographyTokens.fontFamily.primary,
      textTransform: 'none',
    },
    overline: {
      ...typographyTokens.scale.labelSmall,
      fontFamily: typographyTokens.fontFamily.primary,
      textTransform: 'uppercase',
    },
  },

  spacing: spacingTokens.base,

  shape: {
    borderRadius: spacingTokens.borderRadius.md,
  },

  shadows: [
    shadowTokens.elevation[0],
    shadowTokens.elevation[1],
    shadowTokens.elevation[2],
    shadowTokens.elevation[3],
    shadowTokens.elevation[4],
    shadowTokens.elevation[5],
    shadowTokens.elevation[5], // 6
    shadowTokens.elevation[5], // 7
    shadowTokens.elevation[5], // 8
    shadowTokens.elevation[5], // 9
    shadowTokens.elevation[5], // 10
    shadowTokens.elevation[5], // 11
    shadowTokens.elevation[5], // 12
    shadowTokens.elevation[5], // 13
    shadowTokens.elevation[5], // 14
    shadowTokens.elevation[5], // 15
    shadowTokens.elevation[5], // 16
    shadowTokens.elevation[5], // 17
    shadowTokens.elevation[5], // 18
    shadowTokens.elevation[5], // 19
    shadowTokens.elevation[5], // 20
    shadowTokens.elevation[5], // 21
    shadowTokens.elevation[5], // 22
    shadowTokens.elevation[5], // 23
    shadowTokens.elevation[5], // 24
  ],

  components: {
    // Button component customization
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: spacingTokens.borderRadius.md,
          textTransform: 'none',
          fontWeight: typographyTokens.fontWeight.medium,
          padding: `${spacingTokens.component.button.paddingY}px ${spacingTokens.component.button.paddingX}px`,
          boxShadow: shadowTokens.custom.button,
          '&:hover': {
            boxShadow: shadowTokens.custom.buttonHover,
          },
          '&:active': {
            boxShadow: shadowTokens.custom.buttonPressed,
          },
        },
      },
    },

    // Card component customization
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: spacingTokens.borderRadius.lg,
          boxShadow: shadowTokens.custom.card,
          '&:hover': {
            boxShadow: shadowTokens.custom.cardHover,
          },
        },
      },
    },

    // Paper component customization
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: spacingTokens.borderRadius.md,
        },
        elevation1: {
          boxShadow: shadowTokens.elevation[1],
        },
        elevation2: {
          boxShadow: shadowTokens.elevation[2],
        },
        elevation3: {
          boxShadow: shadowTokens.elevation[3],
        },
        elevation4: {
          boxShadow: shadowTokens.elevation[4],
        },
        elevation5: {
          boxShadow: shadowTokens.elevation[5],
        },
      },
    },

    // AppBar component customization
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadowTokens.component.appBar,
        },
      },
    },

    // Chip component customization
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: spacingTokens.borderRadius.sm,
        },
      },
    },

    // TextField component customization
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: spacingTokens.borderRadius.md,
          },
        },
      },
    },
  },
});
