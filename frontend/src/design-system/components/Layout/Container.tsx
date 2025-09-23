/**
 * Container Layout Component
 * Provides consistent container styling with responsive padding
 */

import { forwardRef } from 'react';
import { Container as MuiContainer, ContainerProps as MuiContainerProps } from '@mui/material';
import { spacingTokens } from '../../tokens';

export interface ContainerProps extends MuiContainerProps {
  /** Container size */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Custom padding */
  padding?: 'xs' | 'sm' | 'md' | 'lg' | number;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      size = 'large',
      padding,
      maxWidth,
      sx,
      ...props
    },
    ref
  ) => {
    const sizeToMaxWidth = {
      small: 'sm' as const,
      medium: 'md' as const,
      large: 'lg' as const,
      full: false as const,
    };

    const finalMaxWidth = maxWidth || sizeToMaxWidth[size];

    const paddingMap = {
      xs: spacingTokens.layout.containerPadding.xs,
      sm: spacingTokens.layout.containerPadding.sm,
      md: spacingTokens.layout.containerPadding.md,
      lg: spacingTokens.layout.containerPadding.lg,
    };

    const paddingValue = padding 
      ? (typeof padding === 'number' ? padding : paddingMap[padding as keyof typeof paddingMap])
      : undefined;

    return (
      <MuiContainer
        ref={ref}
        maxWidth={finalMaxWidth}
        sx={{
          ...(paddingValue && {
            px: { 
              xs: paddingValue / 2, 
              sm: paddingValue * 0.75, 
              md: paddingValue,
              lg: paddingValue * 1.25,
            },
          }),
          ...sx,
        }}
        {...props}
      >
        {children}
      </MuiContainer>
    );
  }
);

Container.displayName = 'Container';