import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

/**
 * Enhanced loading spinner with smooth animations and customizable styles
 */
const LoadingSpinner = ({ 
  size = 40,
  message = 'Loading...',
  showMessage = true,
  variant = 'circular',
  color = 'primary',
  fullScreen = false,
  className = ''
}) => {
  if (variant === 'skeleton') {
    return (
      <Box className={`loading-skeleton ${className}`}>
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 1, borderRadius: 2 }} />
        <Skeleton variant="rectangular" width="80%" height={40} sx={{ mb: 1, borderRadius: 1 }} />
        <Skeleton variant="rectangular" width="60%" height={40} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
      className={`loading-spinner ${className}`}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress
          size={size}
          color={color}
          sx={{
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': {
                transform: 'rotate(0deg)',
              },
              '100%': {
                transform: 'rotate(360deg)',
              },
            },
          }}
        />
        {/* Outer ring for enhanced visual effect */}
        <CircularProgress
          size={size + 8}
          color={color}
          variant="determinate"
          value={25}
          sx={{
            position: 'absolute',
            opacity: 0.3,
            animation: 'spin-reverse 2s linear infinite',
            '@keyframes spin-reverse': {
              '0%': {
                transform: 'rotate(0deg)',
              },
              '100%': {
                transform: 'rotate(-360deg)',
              },
            },
          }}
        />
      </Box>
      
      {showMessage && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontWeight: 500,
            textAlign: 'center',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': {
                opacity: 0.6,
              },
              '50%': {
                opacity: 1,
              },
              '100%': {
                opacity: 0.6,
              },
            },
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.9)' 
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

/**
 * Shimmer loading effect for content placeholders
 */
export const ShimmerLoader = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 1,
  className = ''
}) => {
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)'
          : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200px 100%',
        animation: 'shimmer 1.5s infinite',
        '@keyframes shimmer': {
          '0%': {
            backgroundPosition: '-200px 0',
          },
          '100%': {
            backgroundPosition: 'calc(200px + 100%) 0',
          },
        },
      }}
      className={`shimmer-loader ${className}`}
    />
  );
};

/**
 * Dots loading animation
 */
export const DotsLoader = ({ 
  size = 8, 
  color = 'primary.main',
  className = ''
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
      }}
      className={`dots-loader ${className}`}
    >
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            animation: `bounce 1.4s ease-in-out ${index * 0.16}s infinite both`,
            '@keyframes bounce': {
              '0%, 80%, 100%': {
                transform: 'scale(0)',
              },
              '40%': {
                transform: 'scale(1)',
              },
            },
          }}
        />
      ))}
    </Box>
  );
};

/**
 * Progress bar with smooth animation
 */
export const ProgressLoader = ({ 
  progress = 0, 
  showPercentage = true,
  color = 'primary',
  className = ''
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
      className={`progress-loader ${className}`}
    >
      <Box sx={{ width: '100%', mr: 1 }}>
        <Box
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'action.hover',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              height: '100%',
              borderRadius: 4,
              background: (theme) => {
                const primaryColor = theme.palette.primary.main;
                const lightColor = theme.palette.primary.light;
                return color === 'primary' 
                  ? `linear-gradient(90deg, ${primaryColor} 0%, ${lightColor} 100%)`
                  : color;
              },
              width: `${progress}%`,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 2s infinite',
              },
            }}
          />
        </Box>
      </Box>
      {showPercentage && (
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 35 }}>
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;