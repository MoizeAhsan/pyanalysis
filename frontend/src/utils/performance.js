/**
 * Performance monitoring utilities for the frontend
 */
import React from 'react';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  /**
   * Start timing an operation
   */
  startTiming(label) {
    this.metrics.set(label, {
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    });
  }

  /**
   * End timing an operation and return metrics
   */
  endTiming(label) {
    const start = this.metrics.get(label);
    if (!start) {
      console.warn(`No timing started for label: ${label}`);
      return null;
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const metrics = {
      duration: endTime - start.startTime,
      memoryDelta: endMemory - start.startMemory,
      label
    };

    this.metrics.delete(label);
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${metrics.duration.toFixed(2)}ms`, metrics);
    }

    return metrics;
  }

  /**
   * Get current memory usage (if available)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Monitor component render performance
   */
  measureRender(componentName, renderFn) {
    this.startTiming(`render-${componentName}`);
    const result = renderFn();
    this.endTiming(`render-${componentName}`);
    return result;
  }

  /**
   * Debounce function for performance optimization
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function for performance optimization
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Observe long tasks (if supported)
   */
  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn(`🐌 Long task detected: ${entry.duration.toFixed(2)}ms`);
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', observer);
      } catch (e) {
        console.debug('Long task observation not supported');
      }
    }
  }

  /**
   * Observe largest contentful paint
   */
  observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log(`📊 LCP: ${entry.startTime.toFixed(2)}ms`);
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', observer);
      } catch (e) {
        console.debug('LCP observation not supported');
      }
    }
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights() {
    const insights = {
      memory: this.getMemoryUsage(),
      timing: performance.timing,
      navigation: performance.navigation
    };

    if (performance.memory) {
      insights.memoryPressure = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    }

    return insights;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.observeLongTasks();
  performanceMonitor.observeLCP();
}

export default performanceMonitor;

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitor = () => {
  return {
    startTiming: performanceMonitor.startTiming.bind(performanceMonitor),
    endTiming: performanceMonitor.endTiming.bind(performanceMonitor),
    measureRender: performanceMonitor.measureRender.bind(performanceMonitor),
    debounce: performanceMonitor.debounce.bind(performanceMonitor),
    throttle: performanceMonitor.throttle.bind(performanceMonitor),
    getInsights: performanceMonitor.getPerformanceInsights.bind(performanceMonitor)
  };
};

/**
 * Higher-order component for performance monitoring
 */
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.forwardRef((props, ref) => {
    return performanceMonitor.measureRender(componentName, () => (
      <WrappedComponent {...props} ref={ref} />
    ));
  });
};