/**
 * Hook for detecting touch devices and adapting animations accordingly
 */

import { useState, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Check for touch support
    const hasTouch = 'ontouchstart' in window || 
                    navigator.maxTouchPoints > 0 || 
                    // @ts-expect-error - for legacy browsers
                    navigator.msMaxTouchPoints > 0;
    
    setIsTouchDevice(hasTouch);
  }, []);

  return {
    isTouchDevice,
    isMobile,
    // Reduce motion for touch devices to improve performance
    shouldReduceMotion: isTouchDevice && isMobile,
    // Use different animation durations for touch devices
    animationDuration: {
      fast: isTouchDevice ? 0.1 : 0.15,
      normal: isTouchDevice ? 0.15 : 0.25,
      slow: isTouchDevice ? 0.2 : 0.35,
    },
  };
}

/**
 * Get motion-safe animation variants based on user preferences and device capabilities
 */
export function useMotionSafeAnimations() {
  const { shouldReduceMotion, animationDuration } = useTouchDevice();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isReducedMotion = shouldReduceMotion || prefersReducedMotion;

  return {
    isReducedMotion,
    // Fade animations that respect motion preferences
    fadeIn: isReducedMotion ? {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: animationDuration.fast } },
      exit: { opacity: 0, transition: { duration: animationDuration.fast } }
    } : {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: animationDuration.normal } },
      exit: { opacity: 0, transition: { duration: animationDuration.fast } }
    },
    // Scale animations with reduced motion support
    scaleIn: isReducedMotion ? {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: animationDuration.fast } },
      exit: { opacity: 0, transition: { duration: animationDuration.fast } }
    } : {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1, transition: { duration: animationDuration.normal } },
      exit: { opacity: 0, scale: 0.95, transition: { duration: animationDuration.fast } }
    },
    // Slide animations with fallback
    slideUp: isReducedMotion ? {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: animationDuration.fast } },
      exit: { opacity: 0, transition: { duration: animationDuration.fast } }
    } : {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, transition: { duration: animationDuration.normal } },
      exit: { opacity: 0, y: -10, transition: { duration: animationDuration.fast } }
    },
    // Hover effects that work on touch
    touchHover: isReducedMotion ? {} : {
      whileTap: { scale: 0.98 },
      transition: { duration: animationDuration.fast }
    },
    // Stagger timing
    staggerDelay: isReducedMotion ? 0.02 : 0.05,
  };
}