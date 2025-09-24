/**
 * Animation constants and variants for consistent motion design
 */

import { Variants } from 'framer-motion';

// Animation easing curves
export const easing = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
} as const;

// Animation durations
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  page: 0.4,
} as const;

// Common animation variants
export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

export const bounceIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.3,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.slow,
      ease: easing.bounce,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

// Page transition variants
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.page,
      ease: easing.easeOut,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: duration.normal,
      ease: easing.easeIn,
    },
  },
};

// List animation variants
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
};

// Button interaction variants
export const buttonTap = {
  scale: 0.98,
  transition: {
    duration: duration.fast,
    ease: easing.easeOut,
  },
};

export const buttonHover = {
  scale: 1.02,
  transition: {
    duration: duration.fast,
    ease: easing.easeOut,
  },
};

// Loading animation variants
export const pulseAnimation: Variants = {
  initial: {
    opacity: 0.6,
    scale: 1,
  },
  animate: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      ease: easing.easeInOut,
      repeat: Infinity,
    },
  },
};

// Navigation animation variants
export const navItemHover = {
  x: 4,
  transition: {
    duration: duration.fast,
    ease: easing.easeOut,
  },
};

export const navItemTap = {
  scale: 0.98,
  transition: {
    duration: duration.fast,
    ease: easing.easeOut,
  },
};