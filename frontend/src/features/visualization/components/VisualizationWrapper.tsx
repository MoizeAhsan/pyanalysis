import React, { Suspense, ComponentType } from 'react';
import VisualizationErrorBoundary from './VisualizationErrorBoundary';
import VisualizationSkeleton from './VisualizationSkeleton';

interface VisualizationWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  skeletonType?: 'mindmap' | 'architecture' | 'force-graph' | 'network';
  height?: number | string;
}

const VisualizationWrapper: React.FC<VisualizationWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  skeletonType = 'mindmap',
  height = 600
}) => {
  const defaultFallback = fallback || (
    <VisualizationSkeleton 
      type={skeletonType} 
      height={height}
      showProgress={true}
    />
  );

  return (
    <VisualizationErrorBoundary fallback={errorFallback}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </VisualizationErrorBoundary>
  );
};

// Higher-order component to wrap any visualization component
export const withVisualizationWrapper = <P extends object>(
  Component: ComponentType<P>,
  options: {
    skeletonType?: 'mindmap' | 'architecture' | 'force-graph' | 'network';
    height?: number | string;
    errorFallback?: React.ReactNode;
  } = {}
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <VisualizationWrapper
      skeletonType={options.skeletonType || 'mindmap'}
      height={options.height || 600}
      errorFallback={options.errorFallback}
    >
      <Component {...(props as any)} />
    </VisualizationWrapper>
  );

  WrappedComponent.displayName = `withVisualizationWrapper(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default VisualizationWrapper;