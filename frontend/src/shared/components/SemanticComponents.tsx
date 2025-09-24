/**
 * Semantic HTML components with accessibility enhancements
 */

import { Box, BoxProps } from '@mui/material';
import { forwardRef } from 'react';

/**
 * Semantic main content region
 */
export const MainContent = forwardRef<HTMLElement, BoxProps & {
  'aria-label'?: string;
}>(function MainContent({ children, 'aria-label': ariaLabel, ...props }, ref) {
  return (
    <Box
      ref={ref}
      component="main"
      role="main"
      aria-label={ariaLabel || 'Main content'}
      tabIndex={-1}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Semantic navigation region
 */
export const NavigationRegion = forwardRef<HTMLElement, BoxProps & {
  'aria-label'?: string;
  'aria-labelledby'?: string;
}>(function NavigationRegion({ 
  children, 
  'aria-label': ariaLabel, 
  'aria-labelledby': ariaLabelledby,
  ...props 
}, ref) {
  return (
    <Box
      ref={ref}
      component="nav"
      role="navigation"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Semantic complementary region (sidebar)
 */
export const ComplementaryRegion = forwardRef<HTMLElement, BoxProps & {
  'aria-label'?: string;
  'aria-labelledby'?: string;
}>(function ComplementaryRegion({ 
  children, 
  'aria-label': ariaLabel, 
  'aria-labelledby': ariaLabelledby,
  ...props 
}, ref) {
  return (
    <Box
      ref={ref}
      component="aside"
      role="complementary"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Semantic content info region (footer)
 */
export const ContentInfoRegion = forwardRef<HTMLElement, BoxProps & {
  'aria-label'?: string;
}>(function ContentInfoRegion({ children, 'aria-label': ariaLabel, ...props }, ref) {
  return (
    <Box
      ref={ref}
      component="footer"
      role="contentinfo"
      aria-label={ariaLabel || 'Footer'}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Semantic banner region (header)
 */
export const BannerRegion = forwardRef<HTMLElement, BoxProps & {
  'aria-label'?: string;
}>(function BannerRegion({ children, 'aria-label': ariaLabel, ...props }, ref) {
  return (
    <Box
      ref={ref}
      component="header"
      role="banner"
      aria-label={ariaLabel || 'Site header'}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Semantic section with proper heading structure
 */
interface SectionProps extends BoxProps {
  headingId?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const Section = forwardRef<HTMLElement, SectionProps>(function Section({ 
  children, 
  headingId,
  'aria-label': ariaLabel, 
  'aria-labelledby': ariaLabelledby,
  level: _level,
  ...props 
}, ref) {
  return (
    <Box
      ref={ref}
      component="section"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby || headingId}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Semantic article component
 */
interface ArticleProps extends BoxProps {
  headingId?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Article = forwardRef<HTMLElement, ArticleProps>(function Article({ 
  children, 
  headingId,
  'aria-label': ariaLabel, 
  'aria-labelledby': ariaLabelledby,
  ...props 
}, ref) {
  return (
    <Box
      ref={ref}
      component="article"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby || headingId}
      {...props}
    >
      {children}
    </Box>
  );
});

/**
 * Skip links for keyboard navigation
 */
interface SkipLinksProps {
  links: Array<{
    href: string;
    label: string;
  }>;
}

export function SkipLinks({ links }: SkipLinksProps) {
  return (
    <Box
      component="nav"
      aria-label="Skip navigation links"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      {links.map(({ href, label }) => (
        <Box
          key={href}
          component="a"
          href={href}
          sx={{
            position: 'absolute',
            left: '-9999px',
            zIndex: 9999,
            padding: 1,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            textDecoration: 'none',
            borderRadius: 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            '&:focus': {
              left: 2,
              top: 2,
            },
          }}
        >
          {label}
        </Box>
      ))}
    </Box>
  );
}