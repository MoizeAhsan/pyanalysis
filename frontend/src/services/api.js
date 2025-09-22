/**
 * API service for communicating with the Python Code Analyzer backend
 */

const API_BASE_URL = '/api';

class ApiService {
  async analyzeProject(projectPath) {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_path: projectPath }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async resetAnalysis() {
    const response = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAnalysisData() {
    const response = await fetch(`${API_BASE_URL}/data`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getMindMapData() {
    const response = await fetch(`${API_BASE_URL}/mindmap`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getArchitectureData() {
    const response = await fetch(`${API_BASE_URL}/architecture`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async searchElements(query, elementType = null) {
    const params = new URLSearchParams({ q: query });
    if (elementType) {
      params.append('element_type', elementType);
    }
    
    const response = await fetch(`${API_BASE_URL}/search?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

const apiService = new ApiService();
export default apiService;