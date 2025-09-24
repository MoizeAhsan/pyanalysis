import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { AnalysisData } from '@shared/types';

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

  // Analysis endpoints
  async analyzeProject(projectPath: string): Promise<AnalysisData> {
    const response: AxiosResponse<AnalysisData> = await this.client.post('/analyze', {
      project_path: projectPath,
    });
    return response.data;
  }

  async getAnalysisStatus(analysisId: string): Promise<{ status: string; progress?: number }> {
    const response = await this.client.get(`/analysis/${analysisId}/status`);
    return response.data;
  }

  async cancelAnalysis(analysisId: string): Promise<void> {
    await this.client.delete(`/analysis/${analysisId}`);
  }

  // Search endpoints
  async searchElements(
    query: string,
    elementType?: string | null,
    page: number = 1,
    pageSize: number = 20,
    maxResults: number = 100
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      has_data: boolean;
      results: Array<{
        element: any;
        match_type: string;
        match_text: string;
      }>;
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
    };
  }> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      page_size: pageSize.toString(),
      max_results: maxResults.toString(),
    });

    if (elementType) {
      params.append('element_type', elementType);
    }

    const response = await this.client.get(`/search?${params.toString()}`);
    return response.data;
  }

  async getAnalysisData(): Promise<any> {
    const response = await this.client.get('/data');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version?: string }> {
    const response = await this.client.get('/health');
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;