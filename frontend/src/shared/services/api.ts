import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Backend API response types
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

interface ProjectInfo {
  name: string;
  path: string;
  total_files: number;
  total_lines: number;
  languages: string[];
  analysis_timestamp: string;
}

interface Location {
  file_path: string;
  line_number: number;
  column_number: number;
  end_line: number;
  end_column: number;
}

interface Parameter {
  name: string;
  type_hint?: string;
  default_value?: string;
}

interface Usage {
  location: Location;
  context: string;
  usage_type: string;
}

interface CodeElement {
  id: string;
  name: string;
  type: string;
  location: Location;
  docstring?: string;
  parameters: Parameter[];
  return_type?: string;
  decorators: string[];
  dependencies: string[];
  usages: Usage[];
  metadata: Record<string, any>;
}

interface DependencyGraphNode {
  id: string;
  name: string;
  type: string;
  metadata: Record<string, any>;
}

interface DependencyGraphEdge {
  source: string;
  target: string;
  relationship_type: string;
  weight: number;
}

interface DependencyGraphMetrics {
  node_count: number;
  edge_count: number;
  density: number;
  avg_degree: number;
}

interface DependencyGraph {
  nodes: Record<string, DependencyGraphNode>;
  edges: DependencyGraphEdge[];
  metrics?: DependencyGraphMetrics;
}

interface ArchitecturalPattern {
  name: string;
  type: string;
  confidence: number;
  elements: string[];
  description: string;
}

interface AnalysisData {
  has_data: boolean;
  project_info?: ProjectInfo;
  modules: CodeElement[];
  classes: CodeElement[];
  functions: CodeElement[];
  dependency_graph?: DependencyGraph;
  architectural_patterns: ArchitecturalPattern[];
  statistics: {
    total_elements: number;
    modules_count: number;
    classes_count: number;
    functions_count: number;
    patterns_count: number;
  };
}

interface ArchitecturalData {
  has_data: boolean;
  project_info?: ProjectInfo;
  modules: CodeElement[];
  dependency_graph?: DependencyGraph;
  architectural_patterns: ArchitecturalPattern[];
  circular_dependencies: string[][];
  statistics: {
    modules_count: number;
    classes_count: number;
    functions_count: number;
    patterns_count: number;
  };
}

interface SearchMatchResult {
  element: CodeElement;
  match_type: 'name' | 'docstring' | 'file_path';
  match_text: string;
}

interface SearchResponse {
  has_data: boolean;
  results: SearchMatchResult[];
  query: string;
  element_type?: string;
  pagination?: {
    page: number;
    page_size: number;
    total_results: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    start_index: number;
    end_index: number;
  };
  truncated?: boolean;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (import.meta.env.VITE_DEV_MODE === 'true') {
          console.log('API Request:', config.method?.toUpperCase(), config.url);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (import.meta.env.VITE_DEV_MODE === 'true') {
          console.log('API Response:', response.status, response.config.url);
        }
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // Root endpoint - health check
  async healthCheck(): Promise<{ message: string }> {
    const response = await this.client.get('/');
    return response.data;
  }

  // Analysis endpoints
  async analyzeProject(projectPath: string): Promise<ApiResponse<{
    project_name: string;
    total_files: number;
    total_lines: number;
    modules_count: number;
    classes_count: number;
    functions_count: number;
    total_elements: number;
  }>> {
    const response = await this.client.post('/api/analyze', {
      project_path: projectPath,
    });
    return response.data;
  }

  // Reset analysis session
  async resetAnalysis(): Promise<ApiResponse<{ session_cleared: boolean }>> {
    const response = await this.client.post('/api/reset');
    return response.data;
  }

  // Get full analysis data
  async getAnalysisData(): Promise<ApiResponse<AnalysisData>> {
    const response = await this.client.get('/api/data');
    return response.data;
  }

  // Get architectural overview data
  async getArchitecturalData(): Promise<ApiResponse<ArchitecturalData>> {
    const response = await this.client.get('/api/architecture');
    return response.data;
  }

  // Search endpoints
  async searchElements(
    query: string,
    elementType?: string | null,
    page: number = 1,
    pageSize: number = 20,
    maxResults: number = 100
  ): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      page_size: pageSize.toString(),
      max_results: maxResults.toString(),
    });

    if (elementType) {
      params.append('element_type', elementType);
    }

    const response = await this.client.get(`/api/search?${params.toString()}`);
    return response.data;
  }

  // Generic request method for custom endpoints
  async request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.request({
      method,
      url,
      data,
    });
    return response.data;
  }

  // Utility methods for error handling
  isApiError(error: any): error is { response: { data: { detail: string } } } {
    return error?.response?.data?.detail !== undefined;
  }

  getErrorMessage(error: any): string {
    if (this.isApiError(error)) {
      return error.response.data.detail;
    }
    return error?.message || 'An unexpected error occurred';
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

// Export types for use in components
export type {
  ApiResponse,
  AnalysisData,
  ArchitecturalData,
  CodeElement,
  SearchResponse,
  SearchMatchResult,
  ProjectInfo,
  DependencyGraph,
  ArchitecturalPattern,
};