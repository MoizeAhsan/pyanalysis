/**
 * Stack Layout Component
 * Provides consistent spacing between child elements
 */

import { forwardRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { SpacingValue, getSpacing } from '../../utilities/spacing';

export interface StackProps extends Omit<BoxProps, 'direction'> {
  /** Stack direction */
  direction?: 'row' | 'column';
  /** Spacing between items */
  spacing?: SpacingValue;
  /** Align items */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  /** Justify content */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  /** Wrap items */
  wrap?: boolean;
  /** Divider between items */
  divider?: React.ReactNode;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      direction = 'column',
      spacing = 'md',
      align,
      justify,
      wrap = false,
      divider,
      sx,
      ...props
    },
    ref
  ) => {
    const spacingValue = getSpacing(spacing);
    
    const childrenArray = Array.isArray(children) ? children : [children];
    const validChildren = childrenArray.filter(child => child != null);

    return (
      <Box
        ref={ref}
        sx={{
          display: 'flex',
          flexDirection: direction,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: divider ? 0 : `${spacingValue}px`,
          ...sx,
        }}
        {...props}
      >
        {divider
          ? validChildren.map((child, index) => (
              <div key={index}>
                {child}
                {index < validChildren.length - 1 && (
                  <Box
                    sx={{
                      [direction === 'row' ? 'marginRight' : 'marginBottom']: `${spacingValue}px`,
                      [direction === 'row' ? 'marginLeft' : 'marginTop']: `${spacingValue}px`,
                    }}
                  >
                    {divider}
                  </Box>
                )}
              </div>
            ))
          : children}
      </Box>
    );
  }
);

Stack.displayName = 'Stack';