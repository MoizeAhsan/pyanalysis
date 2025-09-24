/**
 * Enhanced Button Component
 * Extends Material-UI Button with additional features, consistent styling, and smooth animations
 */

import { forwardRef } from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  Box,
} from '@mui/material';
import { motion } from 'framer-motion';
import { spacingTokens } from '../../tokens';
import { useMotionSafeAnimations } from '../../../shared/hooks/useMotionSafeAnimations';

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
  /** Whether to enable smooth animations */
  animated?: boolean;
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
      animated = true,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const { isReducedMotion, touchHover } = useMotionSafeAnimations();

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

    const buttonContent = (
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
          // Only apply hover transforms on devices that support hover
          '@media (hover: hover)': {
            ...(animated && !isReducedMotion && {
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: (theme) => theme.shadows[4],
              }
            }),
          },
          // Touch-friendly active state
          '&:active': {
            transform: 'translateY(0) scale(0.98)',
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

    if (animated && !isDisabled && !isReducedMotion) {
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          {...touchHover}
          style={{ display: 'inline-block' }}
        >
          {buttonContent}
        </motion.div>
      );
    }

    return buttonContent;
  }
);

Button.displayName = 'Button';