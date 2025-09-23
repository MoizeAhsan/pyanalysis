/**
 * Skeleton Loading Components for better loading states
 */


import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Stack,
  Grid,
  useTheme,
} from '@mui/material';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
}

export function SkeletonLoader({ 
  variant = 'rectangular', 
  width = '100%', 
  height = 40,
  animation = 'wave'
}: SkeletonLoaderProps) {
  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      animation={animation}
      sx={{
        borderRadius: variant === 'rectangular' ? 1 : undefined,
      }}
    />
  );
}

// Project Input Skeleton
export function ProjectInputSkeleton() {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={56} />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton variant="rectangular" width={120} height={36} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Analysis Results Skeleton
export function AnalysisResultsSkeleton() {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Skeleton variant="text" width="30%" height={28} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
          
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Card variant="outlined">
                  <CardContent>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" height={24} />
                    <Skeleton variant="text" width="60%" height={20} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Visualization Skeleton
export function VisualizationSkeleton() {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        width: '100%',
        height: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: `radial-gradient(circle at 25% 25%, ${theme.palette.primary.main} 0%, transparent 50%),
                       radial-gradient(circle at 75% 75%, ${theme.palette.secondary.main} 0%, transparent 50%)`,
        }}
      />
      
      {/* Loading content */}
      <Stack alignItems="center" spacing={3} sx={{ zIndex: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              variant="circular"
              width={60}
              height={60}
              animation="wave"
              sx={{
                animationDelay: `${item * 0.2}s`,
              }}
            />
          ))}
        </Box>
        
        <Stack alignItems="center" spacing={1}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="text" width={300} height={20} />
        </Stack>
        
        {/* Mock network visualization */}
        <Box sx={{ position: 'relative', width: 300, height: 200 }}>
          {[
            { top: '20%', left: '20%', size: 40 },
            { top: '20%', right: '20%', size: 30 },
            { bottom: '20%', left: '30%', size: 35 },
            { bottom: '20%', right: '30%', size: 25 },
            { top: '50%', left: '50%', size: 45 },
          ].map((node, index) => (
            <Skeleton
              key={index}
              variant="circular"
              width={node.size}
              height={node.size}
              sx={{
                position: 'absolute',
                ...node,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${index * 0.3}s`,
              }}
            />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

// Search Results Skeleton
export function SearchResultsSkeleton() {
  return (
    <Stack spacing={2}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Card key={item} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="text" width="50%" height={16} />
              </Box>
              <Skeleton variant="rectangular" width={60} height={24} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// Code Explorer Skeleton
export function CodeExplorerSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="60%" height={20} />
        </Box>
        
        {/* Tree structure */}
        <Box>
          {[1, 2, 3, 4, 5].map((item) => (
            <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: item * 20, flexShrink: 0 }} />
              <Skeleton variant="rectangular" width={16} height={16} sx={{ mr: 1 }} />
              <Skeleton variant="text" width={`${Math.random() * 40 + 30}%`} height={20} />
            </Box>
          ))}
        </Box>
        
        {/* Details panel */}
        <Card variant="outlined">
          <CardContent>
            <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
            <Stack spacing={1}>
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} variant="text" width={`${Math.random() * 50 + 40}%`} height={16} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

// Generic List Skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: items }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={`${Math.random() * 40 + 40}%`} height={20} />
        </Box>
      ))}
    </Stack>
  );
}

// Generic Card Grid Skeleton
export function CardGridSkeleton({ 
  items = 6, 
  columns = { xs: 1, sm: 2, md: 3 } 
}: { 
  items?: number;
  columns?: { xs: number; sm: number; md: number };
}) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: items }).map((_, index) => (
        <Grid item xs={12 / columns.xs} sm={12 / columns.sm} md={12 / columns.md} key={index}>
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="80%" height={24} />
              <Skeleton variant="text" width="60%" height={20} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}