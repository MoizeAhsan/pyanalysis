/**
 * Enhanced Card Component
 * Extends Material-UI Card with additional features and consistent styling
 */

import { forwardRef } from 'react';
import {
  Card as MuiCard,
  CardProps as MuiCardProps,
  CardContent,
  CardActions,
  CardHeader,
  IconButton,
  Skeleton,
} from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { spacingTokens, shadowTokens } from '../../tokens';

export interface CardProps extends Omit<MuiCardProps, 'variant' | 'content'> {
  /** Card variant */
  variant?: 'elevated' | 'outlined' | 'filled';
  /** Card size */
  size?: 'small' | 'medium' | 'large';
  /** Loading state */
  loading?: boolean;
  /** Interactive card (adds hover effects) */
  interactive?: boolean;
  /** Card header props */
  header?: {
    title?: React.ReactNode;
    subheader?: React.ReactNode;
    avatar?: React.ReactNode;
    action?: React.ReactNode;
  };
  /** Card content */
  content?: React.ReactNode;
  /** Card actions */
  actions?: React.ReactNode;
  /** Actions alignment */
  actionsAlignment?: 'left' | 'right' | 'center' | 'space-between';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'elevated',
      size = 'medium',
      loading = false,
      interactive = false,
      header,
      content,
      actions,
      actionsAlignment = 'right',
      sx,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      small: {
        '& .MuiCardContent-root': {
          padding: spacingTokens.sm,
          '&:last-child': {
            paddingBottom: spacingTokens.sm,
          },
        },
        '& .MuiCardHeader-root': {
          padding: spacingTokens.sm,
        },
        '& .MuiCardActions-root': {
          padding: `0 ${spacingTokens.sm}px ${spacingTokens.sm}px`,
        },
      },
      medium: {
        '& .MuiCardContent-root': {
          padding: spacingTokens.component.card.padding,
          '&:last-child': {
            paddingBottom: spacingTokens.component.card.padding,
          },
        },
        '& .MuiCardHeader-root': {
          padding: spacingTokens.component.card.padding,
        },
        '& .MuiCardActions-root': {
          padding: `0 ${spacingTokens.component.card.padding}px ${spacingTokens.component.card.padding}px`,
        },
      },
      large: {
        '& .MuiCardContent-root': {
          padding: spacingTokens.lg,
          '&:last-child': {
            paddingBottom: spacingTokens.lg,
          },
        },
        '& .MuiCardHeader-root': {
          padding: spacingTokens.lg,
        },
        '& .MuiCardActions-root': {
          padding: `0 ${spacingTokens.lg}px ${spacingTokens.lg}px`,
        },
      },
    };

    const variantStyles = {
      elevated: {
        boxShadow: shadowTokens.custom.card,
        border: 'none',
        '&:hover': interactive ? {
          boxShadow: shadowTokens.custom.cardHover,
          transform: 'translateY(-2px)',
        } : {},
      },
      outlined: {
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': interactive ? {
          borderColor: 'primary.main',
          boxShadow: shadowTokens.custom.focus,
        } : {},
      },
      filled: {
        boxShadow: 'none',
        backgroundColor: 'action.hover',
        border: 'none',
        '&:hover': interactive ? {
          backgroundColor: 'action.selected',
        } : {},
      },
    };

    const actionsJustifyContent = {
      left: 'flex-start',
      right: 'flex-end',
      center: 'center',
      'space-between': 'space-between',
    };

    if (loading) {
      return (
        <MuiCard
          ref={ref}
          sx={{
            borderRadius: `${spacingTokens.borderRadius.lg}px`,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...sx,
          }}
          {...props}
        >
          {header && (
            <CardHeader
              avatar={<Skeleton variant="circular" width={40} height={40} />}
              title={<Skeleton variant="text" width="60%" />}
              subheader={<Skeleton variant="text" width="40%" />}
              action={<Skeleton variant="circular" width={24} height={24} />}
            />
          )}
          <CardContent>
            <Skeleton variant="text" />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="80%" />
          </CardContent>
          {actions && (
            <CardActions>
              <Skeleton variant="rectangular" width={80} height={32} />
              <Skeleton variant="rectangular" width={80} height={32} />
            </CardActions>
          )}
        </MuiCard>
      );
    }

    return (
      <MuiCard
        ref={ref}
        sx={{
          borderRadius: `${spacingTokens.borderRadius.lg}px`,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: interactive ? 'pointer' : 'default',
          ...sizeStyles[size],
          ...variantStyles[variant],
          // Focus styles for accessibility
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
          ...sx,
        }}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {header && (
          <CardHeader
            avatar={header.avatar}
            title={header.title}
            subheader={header.subheader}
            action={header.action || (
              <IconButton size="small" aria-label="more options">
                <MoreVert />
              </IconButton>
            )}
          />
        )}
        
        {(content || children) && (
          <CardContent>
            {content || children}
          </CardContent>
        )}
        
        {actions && (
          <CardActions
            sx={{
              justifyContent: actionsJustifyContent[actionsAlignment],
              gap: spacingTokens.component.gap.sm,
            }}
          >
            {actions}
          </CardActions>
        )}
      </MuiCard>
    );
  }
);

Card.displayName = 'Card';