/**
 * Animated Card component with hover effects and smooth transitions
 * Responsive and touch-friendly with motion preferences support
 */

import { Card, CardProps } from '@mui/material';
import { motion } from 'framer-motion';
import { useMotionSafeAnimations } from '../hooks/useMotionSafeAnimations';

interface AnimatedCardProps extends Omit<CardProps, 'component'> {
  /** Whether to enable hover animations */
  hoverable?: boolean;
  /** Custom animation delay */
  delay?: number;
  /** Whether to apply entrance animation */
  animated?: boolean;
}

export function AnimatedCard({
  children,
  hoverable = true,
  delay = 0,
  animated = true,
  sx = {},
  ...props
}: AnimatedCardProps) {
  const { isReducedMotion, scaleIn, touchHover } = useMotionSafeAnimations();

  const hoverAnimation = hoverable && !isReducedMotion ? {
    whileHover: { 
      y: -4,
      scale: 1.02,
    },
    ...touchHover
  } : {};

  const entranceAnimation = animated ? {
    variants: scaleIn,
    initial: "initial" as const,
    animate: "animate" as const,
    transition: { delay }
  } : {};

  return (
    <motion.div
      {...entranceAnimation}
      {...hoverAnimation}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: '100%',
          transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: hoverable ? 'pointer' : 'default',
          // Touch-friendly hover states
          '@media (hover: hover)': {
            '&:hover': hoverable ? {
              boxShadow: (theme) => theme.shadows[8],
            } : {},
          },
          // Touch states for mobile
          '&:active': hoverable ? {
            transform: 'scale(0.98)',
          } : {},
          ...sx,
        }}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  );
}