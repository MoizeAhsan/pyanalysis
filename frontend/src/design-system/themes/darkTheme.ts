/**
 * Dark theme configuration for Material Design 3
 */

import { createTheme } from '@mui/material/styles';
import { colorTokens, typographyTokens, shadowTokens, spacingTokens } from '../tokens';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colorTokens.primary[400],
      light: colorTokens.primary[300],
      dark: colorTokens.primary[600],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    secondary: {
      main: colorTokens.secondary[400],
      light: colorTokens.secondary[300],
      dark: colorTokens.secondary[600],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    error: {
      main: colorTokens.error[400],
      light: colorTokens.error[300],
      dark: colorTokens.error[600],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    warning: {
      main: colorTokens.warning[400],
      light: colorTokens.warning[300],
      dark: colorTokens.warning[600],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: colorTokens.info[400],
      light: colorTokens.info[300],
      dark: colorTokens.info[600],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    success: {
      main: colorTokens.success[400],
      light: colorTokens.success[300],
      dark: colorTokens.success[600],
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: colorTokens.surface.dark.background,
      paper: colorTokens.surface.dark.paper,
    },
    text: {
      primary: colorTokens.text.dark.primary,
      secondary: colorTokens.text.dark.secondary,
      disabled: colorTokens.text.dark.disabled,
    },
    divider: colorTokens.divider.dark,
    action: {
      active: colorTokens.action.dark.active,
      hover: colorTokens.action.dark.hover,
      selected: colorTokens.action.dark.selected,
      disabled: colorTokens.action.dark.disabled,
      disabledBackground: colorTokens.action.dark.disabledBackground,
      focus: colorTokens.action.dark.focus,
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
    shadowTokens.elevationDark[0],
    shadowTokens.elevationDark[1],
    shadowTokens.elevationDark[2],
    shadowTokens.elevationDark[3],
    shadowTokens.elevationDark[4],
    shadowTokens.elevationDark[5],
    shadowTokens.elevationDark[5], // 6
    shadowTokens.elevationDark[5], // 7
    shadowTokens.elevationDark[5], // 8
    shadowTokens.elevationDark[5], // 9
    shadowTokens.elevationDark[5], // 10
    shadowTokens.elevationDark[5], // 11
    shadowTokens.elevationDark[5], // 12
    shadowTokens.elevationDark[5], // 13
    shadowTokens.elevationDark[5], // 14
    shadowTokens.elevationDark[5], // 15
    shadowTokens.elevationDark[5], // 16
    shadowTokens.elevationDark[5], // 17
    shadowTokens.elevationDark[5], // 18
    shadowTokens.elevationDark[5], // 19
    shadowTokens.elevationDark[5], // 20
    shadowTokens.elevationDark[5], // 21
    shadowTokens.elevationDark[5], // 22
    shadowTokens.elevationDark[5], // 23
    shadowTokens.elevationDark[5], // 24
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
          backgroundColor: colorTokens.surface.dark.elevated,
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
          backgroundColor: colorTokens.surface.dark.paper,
        },
        elevation1: {
          boxShadow: shadowTokens.elevationDark[1],
          backgroundColor: colorTokens.surface.dark.elevated,
        },
        elevation2: {
          boxShadow: shadowTokens.elevationDark[2],
          backgroundColor: colorTokens.surface.dark.elevated,
        },
        elevation3: {
          boxShadow: shadowTokens.elevationDark[3],
          backgroundColor: colorTokens.surface.dark.elevated,
        },
        elevation4: {
          boxShadow: shadowTokens.elevationDark[4],
          backgroundColor: colorTokens.surface.dark.elevated,
        },
        elevation5: {
          boxShadow: shadowTokens.elevationDark[5],
          backgroundColor: colorTokens.surface.dark.elevated,
        },
      },
    },

    // AppBar component customization
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadowTokens.component.appBar,
          backgroundColor: colorTokens.surface.dark.elevated,
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
