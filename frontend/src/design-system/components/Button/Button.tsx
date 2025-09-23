/**
 * Enhanced Button Component
 * Extends Material-UI Button with additional features and consistent styling
 */

import { forwardRef } from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  Box,
} from '@mui/material';
import { spacingTokens } from '../../tokens';

export interface ButtonProps extends Omit<MuiButtonProps, 'size'> {
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Loading state */
  loading?: boolean;
  /** Icon to display before text */
  startIcon?: React.ReactNode;
  /** Icon to display after text */
  endIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom loading text */
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      disabled,
      startIcon,
      endIcon,
      size = 'medium',
      variant = 'contained',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const sizeStyles = {
      small: {
        padding: `${spacingTokens.xs}px ${spacingTokens.sm}px`,
        fontSize: '0.875rem',
        minHeight: 32,
      },
      medium: {
        padding: `${spacingTokens.component.button.paddingY}px ${spacingTokens.component.button.paddingX}px`,
        fontSize: '1rem',
        minHeight: 40,
      },
      large: {
        padding: `${spacingTokens.sm}px ${spacingTokens.lg}px`,
        fontSize: '1.125rem',
        minHeight: 48,
      },
    };

    return (
      <MuiButton
        ref={ref}
        variant={variant}
        disabled={isDisabled}
        startIcon={
          loading ? (
            <CircularProgress
              size={16}
              color="inherit"
              sx={{ mr: 0.5 }}
            />
          ) : (
            startIcon
          )
        }
        endIcon={!loading ? endIcon : undefined}
        sx={{
          ...sizeStyles[size],
          borderRadius: `${spacingTokens.borderRadius.md}px`,
          textTransform: 'none',
          fontWeight: 500,
          position: 'relative',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: (theme) => theme.shadows[4],
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            transform: 'none',
          },
          // Focus styles for accessibility
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        }}
        {...props}
      >
        {loading && loadingText ? (
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {loadingText}
          </Box>
        ) : (
          children
        )}
      </MuiButton>
    );
  }
);

Button.displayName = 'Button';