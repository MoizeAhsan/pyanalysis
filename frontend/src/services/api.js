/**
 * API service for communicating with the Python Code Analyzer backend
 * Includes support for compressed responses and performance optimizations
 */

const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    // Cache for API responses to avoid redundant requests
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Decompress gzip compressed data from base64
   */
  async decompressData(compressedData) {
    try {
      // Decode base64
      const binaryString = atob(compressedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decompress using browser's built-in compression
      const decompressedStream = new Response(bytes).body.pipeThrough(
        new DecompressionStream('gzip')
      );
      const decompressedResponse = new Response(decompressedStream);
      const decompressedText = await decompressedResponse.text();
      
      return JSON.parse(decompressedText);
    } catch (error) {
      console.error('Failed to decompress data:', error);
      throw new Error('Failed to decompress response data');
    }
  }

  /**
   * Process API response, handling compression if present
   */
  async processResponse(response) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if response data is compressed
    if (data.data && typeof data.data === 'object' && data.data.compressed) {
      console.log('Decompressing response data...');
      const compressionInfo = data.data;
      const decompressedData = await this.decompressData(compressionInfo.data);
      
      console.log(`Decompressed: ${compressionInfo.compressed_size} -> ${compressionInfo.original_size} bytes`);
      
      // Replace compressed data with decompressed data
      return {
        ...data,
        data: decompressedData
      };
    }

    return data;
  }

  /**
   * Get cached response or make new request
   */
  async getCachedOrFetch(cacheKey, fetchFn) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Using cached response for ${cacheKey}`);
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
  async analyzeProject(projectPath) {
    // Clear cache when starting new analysis
    this.clearCache();
    
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip', // Request compression
      },
      body: JSON.stringify({ project_path: projectPath }),
    });

    return this.processResponse(response);
  }

  async resetAnalysis() {
    // Clear cache when resetting
    this.clearCache();
    
    const response = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
    });

    return this.processResponse(response);
  }

  async getAnalysisData() {
    return this.getCachedOrFetch('analysis-data', async () => {
      const response = await fetch(`${API_BASE_URL}/data`, {
        headers: {
          'Accept-Encoding': 'gzip', // Request compression
        },
      });

      return this.processResponse(response);
    });
  }

  async getMindMapData() {
    return this.getCachedOrFetch('mindmap-data', async () => {
      const response = await fetch(`${API_BASE_URL}/mindmap`, {
        headers: {
          'Accept-Encoding': 'gzip', // Request compression
        },
      });

      return this.processResponse(response);
    });
  }

  async getArchitectureData() {
    return this.getCachedOrFetch('architecture-data', async () => {
      const response = await fetch(`${API_BASE_URL}/architecture`, {
        headers: {
          'Accept-Encoding': 'gzip', // Request compression
        },
      });

      return this.processResponse(response);
    });
  }

  async searchElements(query, elementType = null, page = 1, pageSize = 20) {
    const params = new URLSearchParams({ 
      q: query,
      page: page.toString(),
      page_size: pageSize.toString()
    });
    if (elementType) {
      params.append('element_type', elementType);
    }
    
    // Cache search results for short period
    const cacheKey = `search-${query}-${elementType || 'all'}-${page}-${pageSize}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(`${API_BASE_URL}/search?${params}`, {
        headers: {
          'Accept-Encoding': 'gzip', // Request compression
        },
      });

      return this.processResponse(response);
    });
  }
}

const apiService = new ApiService();
export default apiService;