/**
 * Animated Page Wrapper for smooth page transitions
 * Respects user motion preferences and device capabilities
 */

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useMotionSafeAnimations } from '../hooks/useMotionSafeAnimations';

interface AnimatedPageProps {
  children: React.ReactNode;
  /** Unique key for the page (used for exit animations) */
  pageKey?: string;
  /** Custom animation variants */
  variants?: Variants;
  /** Whether to enable exit animations */
  exitAnimation?: boolean;
  /** Custom className */
  className?: string;
}

export function AnimatedPage({
  children,
  pageKey,
  variants,
  exitAnimation = true,
  className,
}: AnimatedPageProps) {
  const { slideUp } = useMotionSafeAnimations();
  const animationVariants = variants || slideUp;

  const motionProps = {
    key: pageKey,
    variants: animationVariants,
    initial: "initial" as const,
    animate: "animate" as const,
    style: { width: '100%' },
    className,
    ...(exitAnimation && { exit: "exit" as const }),
  };

  const content = (
    <motion.div {...motionProps}>
      {children}
    </motion.div>
  );

  if (pageKey && exitAnimation) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        {content}
      </AnimatePresence>
    );
  }

  return content;
}

// Preset page animation components for different use cases
export function FadeInPage({ children, ...props }: Omit<AnimatedPageProps, 'variants'>) {
  const { fadeIn } = useMotionSafeAnimations();
  return (
    <AnimatedPage variants={fadeIn} {...props}>
      {children}
    </AnimatedPage>
  );
}

export function SlideUpPage({ children, ...props }: Omit<AnimatedPageProps, 'variants'>) {
  const { slideUp } = useMotionSafeAnimations();
  return (
    <AnimatedPage variants={slideUp} {...props}>
      {children}
    </AnimatedPage>
  );
}