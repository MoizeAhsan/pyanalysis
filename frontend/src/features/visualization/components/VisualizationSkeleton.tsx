import React from 'react';
import { Box, Skeleton, Typography, LinearProgress } from '@mui/material';

interface VisualizationSkeletonProps {
  type?: 'mindmap' | 'architecture' | 'force-graph' | 'network';
  height?: number | string;
  showProgress?: boolean;
}

const VisualizationSkeleton: React.FC<VisualizationSkeletonProps> = ({
  type = 'mindmap',
  height = 600,
  showProgress = true
}) => {
  const getSkeletonContent = () => {
    switch (type) {
      case 'mindmap':
        return (
          <>
            {/* Mind map nodes scattered pattern */}
            <Skeleton
              variant="circular"
              width={80}
              height={80}
              sx={{ position: 'absolute', top: '20%', left: '30%' }}
            />
            <Skeleton
              variant="circular"
              width={60}
              height={60}
              sx={{ position: 'absolute', top: '40%', left: '60%' }}
            />
            <Skeleton
              variant="circular"
              width={70}
              height={70}
              sx={{ position: 'absolute', top: '60%', left: '20%' }}
            />
            <Skeleton
              variant="circular"
              width={50}
              height={50}
              sx={{ position: 'absolute', top: '30%', left: '70%' }}
            />
            <Skeleton
              variant="circular"
              width={65}
              height={65}
              sx={{ position: 'absolute', top: '70%', left: '50%' }}
            />
            {/* Connection lines */}
            <Skeleton
              variant="rectangular"
              width={100}
              height={2}
              sx={{ position: 'absolute', top: '35%', left: '40%', transform: 'rotate(25deg)' }}
            />
            <Skeleton
              variant="rectangular"
              width={80}
              height={2}
              sx={{ position: 'absolute', top: '55%', left: '35%', transform: 'rotate(-15deg)' }}
            />
          </>
        );

      case 'architecture':
        return (
          <>
            {/* Hierarchical structure */}
            <Skeleton
              variant="rectangular"
              width={120}
              height={60}
              sx={{ position: 'absolute', top: '10%', left: '40%' }}
            />
            <Skeleton
              variant="rectangular"
              width={100}
              height={50}
              sx={{ position: 'absolute', top: '35%', left: '20%' }}
            />
            <Skeleton
              variant="rectangular"
              width={100}
              height={50}
              sx={{ position: 'absolute', top: '35%', left: '60%' }}
            />
            <Skeleton
              variant="rectangular"
              width={80}
              height={40}
              sx={{ position: 'absolute', top: '60%', left: '15%' }}
            />
            <Skeleton
              variant="rectangular"
              width={80}
              height={40}
              sx={{ position: 'absolute', top: '60%', left: '35%' }}
            />
            <Skeleton
              variant="rectangular"
              width={80}
              height={40}
              sx={{ position: 'absolute', top: '60%', left: '55%' }}
            />
            <Skeleton
              variant="rectangular"
              width={80}
              height={40}
              sx={{ position: 'absolute', top: '60%', left: '75%' }}
            />
          </>
        );

      case 'force-graph':
        return (
          <>
            {/* Force-directed layout pattern */}
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{ position: 'absolute', top: '25%', left: '25%' }}
            />
            <Skeleton
              variant="circular"
              width={60}
              height={60}
              sx={{ position: 'absolute', top: '45%', left: '45%' }}
            />
            <Skeleton
              variant="circular"
              width={35}
              height={35}
              sx={{ position: 'absolute', top: '65%', left: '25%' }}
            />
            <Skeleton
              variant="circular"
              width={45}
              height={45}
              sx={{ position: 'absolute', top: '35%', left: '65%' }}
            />
            <Skeleton
              variant="circular"
              width={50}
              height={50}
              sx={{ position: 'absolute', top: '15%', left: '55%' }}
            />
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{ position: 'absolute', top: '75%', left: '60%' }}
            />
          </>
        );

      case 'network':
        return (
          <>
            {/* Network topology pattern */}
            <Skeleton
              variant="circular"
              width={50}
              height={50}
              sx={{ position: 'absolute', top: '20%', left: '50%' }}
            />
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{ position: 'absolute', top: '40%', left: '30%' }}
            />
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{ position: 'absolute', top: '40%', left: '70%' }}
            />
            <Skeleton
              variant="circular"
              width={35}
              height={35}
              sx={{ position: 'absolute', top: '65%', left: '40%' }}
            />
            <Skeleton
              variant="circular"
              width={35}
              height={35}
              sx={{ position: 'absolute', top: '65%', left: '60%' }}
            />
          </>
        );

      default:
        return (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            sx={{ borderRadius: 2 }}
          />
        );
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        overflow: 'hidden'
      }}
    >
      {showProgress && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Skeleton pattern based on visualization type */}
      {getSkeletonContent()}

      {/* Loading text */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 5
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Loading {type.replace('-', ' ')} visualization...
        </Typography>
        <Typography variant="caption" color="text.secondary">
          This may take a moment for large datasets
        </Typography>
      </Box>

      {/* Overlay to create loading effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
          animation: 'shimmer 2s infinite',
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' }
          }
        }}
      />
    </Box>
  );
};

export default VisualizationSkeleton;