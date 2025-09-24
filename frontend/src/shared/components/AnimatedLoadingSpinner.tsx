/**
 * Animated Loading Spinner with smooth animations
 */

import { Box, CircularProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { easing } from '../animations/constants';

interface AnimatedLoadingSpinnerProps {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: number;
  /** Whether to show the pulsing effect */
  pulsing?: boolean;
}

export function AnimatedLoadingSpinner({
  message = 'Loading...',
  size = 40,
  pulsing = true,
}: AnimatedLoadingSpinnerProps) {
  const spinnerVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3,
        ease: easing.easeOut
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: {
        duration: 0.2,
        ease: easing.easeIn
      }
    }
  };

  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        delay: 0.1,
        ease: easing.easeOut
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: {
        duration: 0.2,
        ease: easing.easeIn
      }
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={4}
    >
      <motion.div
        variants={spinnerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        {...(pulsing && {
          animate: {
            opacity: 1,
            scale: [1, 1.1, 1],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          },
        })}
      >
        <CircularProgress 
          size={size} 
          thickness={4}
          sx={{
            color: 'primary.main',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
      </motion.div>
      
      {message && (
        <motion.div
          variants={textVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </Typography>
        </motion.div>
      )}
    </Box>
  );
}

// Skeleton loading components with animations
export function AnimatedSkeleton({ 
  width = '100%', 
  height = '20px',
  borderRadius = 4,
  delay = 0 
}: { 
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        transition: { 
          duration: 0.3, 
          delay,
          ease: easing.easeOut
        }
      }}
      style={{
        width,
        height,
        backgroundColor: '#f0f0f0',
        borderRadius,
        backgroundImage: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

// CSS for shimmer effect
const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject shimmer keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}