import { useState, useCallback } from 'react';
import { apiService } from '@shared/services/api';
import type { AnalysisData, AppError } from '@shared/types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
}

interface UseApiReturn<T, TArgs extends unknown[] = unknown[]> extends UseApiState<T> {
  execute: (...args: TArgs) => Promise<T | null>;
  reset: () => void;
}

function useApi<T = unknown, TArgs extends unknown[] = unknown[]>(
  apiFunction: (...args: TArgs) => Promise<T>
): UseApiReturn<T, TArgs> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: TArgs): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const appError: AppError = {
          type: 'network',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          recoverable: true,
          retryAction: () => execute(...args),
        };

        setState({ data: null, loading: false, error: appError });
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specific hooks for common API operations
export function useAnalyzeProject() {
  return useApi<AnalysisData, [string]>((projectPath: string) => 
    apiService.analyzeProject(projectPath)
  );
}

export function useHealthCheck() {
  return useApi<{ status: string; version?: string }, []>(() => 
    apiService.healthCheck()
  );
}

export default useApi;