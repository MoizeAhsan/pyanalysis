import { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// Lazy load heavy components for code splitting
const MindMapViewer = lazy(() => import('@features/visualization/components/MindMapViewer'));
const ArchitectureViewer = lazy(() => import('@features/visualization/components/ArchitectureViewer'));
const CodeExplorer = lazy(() => import('@features/exploration/components/CodeExplorer'));
const SearchInterface = lazy(() => import('@features/search/components/SearchInterface'));
const VisualizationDemo = lazy(() => import('@features/visualization/components/VisualizationDemo'));

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: 2
    }}
  >
    <CircularProgress size={40} thickness={4} />
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// Wrapper components with Suspense boundaries
export const LazyMindMapViewer = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Loading Mind Map Viewer..." />}>
    <MindMapViewer {...props} />
  </Suspense>
);

export const LazyArchitectureViewer = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Loading Architecture Viewer..." />}>
    <ArchitectureViewer {...props} />
  </Suspense>
);

export const LazyCodeExplorer = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Loading Code Explorer..." />}>
    <CodeExplorer {...props} />
  </Suspense>
);

export const LazySearchInterface = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Loading Search Interface..." />}>
    <SearchInterface {...props} />
  </Suspense>
);

export const LazyVisualizationDemo = (props: any) => (
  <Suspense fallback={<LoadingFallback message="Loading Visualization Demo..." />}>
    <VisualizationDemo {...props} />
  </Suspense>
);

// Preload functions for critical routes
export const preloadMindMapViewer = () => {
  const componentImport = () => import('@features/visualization/components/MindMapViewer');
  return componentImport();
};

export const preloadArchitectureViewer = () => {
  const componentImport = () => import('@features/visualization/components/ArchitectureViewer');
  return componentImport();
};

export const preloadCodeExplorer = () => {
  const componentImport = () => import('@features/exploration/components/CodeExplorer');
  return componentImport();
};