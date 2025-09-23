import { lazy } from 'react';

// Lazy load visualization components for code splitting
export const LazyCytoscapeGraph = lazy(() => 
  import('./CytoscapeGraph').then(module => ({ default: module.default }))
);

export const LazyForceGraph = lazy(() => 
  import('./ForceGraph').then(module => ({ default: module.default }))
);

export const LazyVisNetwork = lazy(() => 
  import('./VisNetwork').then(module => ({ default: module.default }))
);

// Re-export error boundary and skeleton for convenience
export { default as VisualizationErrorBoundary } from './VisualizationErrorBoundary';
export { default as VisualizationSkeleton } from './VisualizationSkeleton';