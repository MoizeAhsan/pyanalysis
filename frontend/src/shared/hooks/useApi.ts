import { useState, useCallback } from 'react';
import { apiService } from '@shared/services/api';
import type { ApiResponse, AnalysisData, ArchitecturalData, SearchResponse } from '@shared/services/api';

interface AppError {
  type: 'network' | 'validation' | 'server';
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}

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
  apiFunction: (...args: TArgs) => Promise<ApiResponse<T>>
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
        
        // Handle API response format: { success: boolean, message: string, data: T }
        if (result.success) {
          setState({ data: result.data, loading: false, error: null });
          return result.data;
        } else {
          const appError: AppError = {
            type: 'server',
            message: result.message || 'Server returned an error',
            recoverable: true,
            retryAction: () => execute(...args),
          };
          setState({ data: null, loading: false, error: appError });
          return null;
        }
      } catch (error) {
        const appError: AppError = {
          type: 'network',
          message: apiService.getErrorMessage(error),
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
  return useApi<{
    project_name: string;
    total_files: number;
    total_lines: number;
    modules_count: number;
    classes_count: number;
    functions_count: number;
    total_elements: number;
  }, [string]>((projectPath: string) => 
    apiService.analyzeProject(projectPath)
  );
}

export function useGetAnalysisData() {
  return useApi<AnalysisData, []>(() => 
    apiService.getAnalysisData()
  );
}

export function useGetArchitecturalData() {
  return useApi<ArchitecturalData, []>(() => 
    apiService.getArchitecturalData()
  );
}

export function useSearchElements() {
  return useApi<SearchResponse, [string, string?, number?, number?, number?]>(
    (query: string, elementType?: string, page?: number, pageSize?: number, maxResults?: number) => 
      apiService.searchElements(query, elementType, page, pageSize, maxResults)
  );
}

export function useHealthCheck() {
  return useApi<{ message: string }, []>(() => 
    apiService.healthCheck().then(data => ({ success: true, message: 'OK', data }))
  );
}

export function useResetAnalysis() {
  return useApi<{ session_cleared: boolean }, []>(() => 
    apiService.resetAnalysis()
  );
}

export default useApi;