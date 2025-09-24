/**
 * Search Worker Manager for handling Web Worker communication
 */
import type { SearchWorkerMessage, SearchWorkerResponse } from '../workers/searchWorker';

export interface SearchRequest {
  query: string;
  options?: {
    threshold?: number;
    caseSensitive?: boolean;
  };
  filters?: Record<string, any>;
  maxResults?: number;
}

export interface SearchResult {
  element: any;
  score: number;
  matches: Record<string, Array<[number, number]>>;
  matchType: string;
}

export class SearchWorkerManager {
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker from inline script to avoid module loading issues
      const workerScript = `
        ${this.getSearchUtilsCode()}
        ${this.getWorkerCode()}
      `;
      
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
    } catch (error) {
      console.warn('Failed to create search worker:', error);
      this.worker = null;
    }
  }

  private getSearchUtilsCode(): string {
    // Inline the fuzzy search utilities for the worker
    return `
      function fuzzyMatch(text, pattern, options = {}) {
        const {
          caseSensitive = false,
          threshold = 0.6,
          includeMatches = true,
          maxPatternLength = 32
        } = options;

        if (!pattern || !text) {
          return { score: 0, matches: [], isMatch: false };
        }

        if (pattern.length > maxPatternLength) {
          pattern = pattern.substring(0, maxPatternLength);
        }

        const searchText = caseSensitive ? text : text.toLowerCase();
        const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

        // Exact match gets highest score
        const exactIndex = searchText.indexOf(searchPattern);
        if (exactIndex !== -1) {
          return {
            score: 1.0,
            matches: includeMatches ? [[exactIndex, exactIndex + searchPattern.length]] : [],
            isMatch: true
          };
        }

        // Calculate fuzzy match score and positions
        const matches = [];
        let patternIndex = 0;
        let textIndex = 0;
        let consecutiveMatches = 0;
        let totalMatches = 0;
        let lastMatchIndex = -1;

        while (textIndex < searchText.length && patternIndex < searchPattern.length) {
          const patternChar = searchPattern[patternIndex];
          const textChar = searchText[textIndex];

          if (patternChar === textChar) {
            if (lastMatchIndex === textIndex - 1) {
              consecutiveMatches++;
            } else {
              consecutiveMatches = 1;
            }

            if (includeMatches) {
              if (matches.length > 0 && matches[matches.length - 1][1] === textIndex) {
                matches[matches.length - 1][1] = textIndex + 1;
              } else {
                matches.push([textIndex, textIndex + 1]);
              }
            }

            totalMatches++;
            lastMatchIndex = textIndex;
            patternIndex++;
          }
          textIndex++;
        }

        if (totalMatches === 0) {
          return { score: 0, matches: [], isMatch: false };
        }

        const completionRatio = totalMatches / searchPattern.length;
        const densityRatio = totalMatches / searchText.length;
        const consecutiveBonus = consecutiveMatches / totalMatches;
        const positionBonus = lastMatchIndex < searchText.length / 2 ? 0.1 : 0;

        const score = Math.min(1.0, 
          completionRatio * 0.6 + 
          densityRatio * 0.2 + 
          consecutiveBonus * 0.15 + 
          positionBonus
        );

        const isMatch = score >= threshold;

        return {
          score: isMatch ? score : 0,
          matches: isMatch && includeMatches ? matches : [],
          isMatch
        };
      }
    `;
  }

  private getWorkerCode(): string {
    return `
      let searchIndex = new Map();
      let isIndexing = false;

      self.onmessage = function(event) {
        const { type, payload, requestId } = event.data;

        try {
          switch (type) {
            case 'INDEX':
              handleIndexing(payload, requestId);
              break;
            
            case 'SEARCH':
              handleSearch(payload, requestId);
              break;
              
            case 'CANCEL':
              break;
              
            default:
              throw new Error('Unknown message type: ' + type);
          }
        } catch (error) {
          postMessage({
            type: 'ERROR',
            payload: { error: error.message || 'Unknown error' },
            requestId
          });
        }
      };

      function handleIndexing(data, requestId) {
        if (isIndexing) {
          postMessage({
            type: 'ERROR',
            payload: { error: 'Already indexing' },
            requestId
          });
          return;
        }

        isIndexing = true;
        const { elements } = data;
        
        try {
          searchIndex.clear();
          
          elements.forEach((element, index) => {
            const searchableText = [
              element.name || '',
              element.docstring || '',
              element.location?.file_path || '',
              element.type || ''
            ].join(' ').toLowerCase();
            
            searchIndex.set(element.id || 'element-' + index, {
              ...element,
              _searchText: searchableText,
              _tokens: searchableText.split(/\\s+/).filter(token => token.length > 0)
            });
          });

          postMessage({
            type: 'INDEX_COMPLETE',
            payload: { indexedCount: elements.length },
            requestId
          });
        } catch (error) {
          postMessage({
            type: 'ERROR',
            payload: { error: error.message || 'Indexing failed' },
            requestId
          });
        } finally {
          isIndexing = false;
        }
      }

      function handleSearch(data, requestId) {
        const { query, options = {}, filters = {}, maxResults = 100 } = data;
        
        if (!query || query.trim().length === 0) {
          postMessage({
            type: 'SEARCH_RESULT',
            payload: { results: [], totalCount: 0 },
            requestId
          });
          return;
        }

        const normalizedQuery = query.toLowerCase();
        const results = [];

        for (const [, indexedElement] of searchIndex) {
          if (filters.elementType && indexedElement.type !== filters.elementType) {
            continue;
          }
          
          if (filters.hasDocstring && !indexedElement.docstring) {
            continue;
          }
          
          if (filters.isPublic && indexedElement.name?.startsWith('_')) {
            continue;
          }

          const nameMatch = fuzzyMatch(indexedElement.name || '', normalizedQuery, {
            ...options,
            includeMatches: true
          });
          
          const docMatch = indexedElement.docstring ? 
            fuzzyMatch(indexedElement.docstring, normalizedQuery, {
              ...options,
              threshold: 0.2,
              includeMatches: true
            }) : { score: 0, matches: [], isMatch: false };
          
          const pathMatch = indexedElement.location?.file_path ?
            fuzzyMatch(indexedElement.location.file_path, normalizedQuery, {
              ...options,
              threshold: 0.3,
              includeMatches: true
            }) : { score: 0, matches: [], isMatch: false };

          let bestScore = 0;
          let matchType = 'none';
          const allMatches = {};

          if (nameMatch.isMatch) {
            bestScore = Math.max(bestScore, nameMatch.score * 1.2);
            matchType = nameMatch.score === bestScore / 1.2 ? 'name' : matchType;
            allMatches.name = nameMatch.matches;
          }
          
          if (docMatch.isMatch) {
            bestScore = Math.max(bestScore, docMatch.score);
            matchType = docMatch.score === bestScore ? 'docstring' : matchType;
            allMatches.docstring = docMatch.matches;
          }
          
          if (pathMatch.isMatch) {
            bestScore = Math.max(bestScore, pathMatch.score * 0.8);
            matchType = pathMatch.score * 0.8 === bestScore ? 'file_path' : matchType;
            allMatches.file_path = pathMatch.matches;
          }

          if (bestScore > 0) {
            results.push({
              element: {
                id: indexedElement.id,
                name: indexedElement.name,
                type: indexedElement.type,
                location: indexedElement.location,
                docstring: indexedElement.docstring,
                ...Object.fromEntries(
                  Object.entries(indexedElement).filter(([key]) => !key.startsWith('_'))
                )
              },
              score: bestScore,
              matches: allMatches,
              matchType
            });
          }
        }

        results.sort((a, b) => b.score - a.score);
        const limitedResults = results.slice(0, maxResults);

        postMessage({
          type: 'SEARCH_RESULT',
          payload: { 
            results: limitedResults, 
            totalCount: results.length,
            truncated: results.length > maxResults
          },
          requestId
        });
      }
    `;
  }

  private handleWorkerMessage(event: MessageEvent<SearchWorkerResponse>) {
    const { type, payload, requestId } = event.data;
    const request = this.pendingRequests.get(requestId);

    if (!request) {
      return;
    }

    clearTimeout(request.timeout);
    this.pendingRequests.delete(requestId);

    switch (type) {
      case 'SEARCH_RESULT':
      case 'INDEX_COMPLETE':
        request.resolve(payload);
        break;
      case 'ERROR':
        request.reject(new Error(payload.error));
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Search worker error:', error);
    // Reject all pending requests
    for (const [requestId, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Worker error: ' + error.message));
      this.pendingRequests.delete(requestId);
    }
  }

  private sendMessage(type: SearchWorkerMessage['type'], payload: any, timeoutMs = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const requestId = (++this.requestId).toString();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Worker request timeout'));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.worker.postMessage({
        type,
        payload,
        requestId
      } as SearchWorkerMessage);
    });
  }

  async indexElements(elements: any[]): Promise<{ indexedCount: number }> {
    return this.sendMessage('INDEX', { elements });
  }

  async search(request: SearchRequest): Promise<{
    results: SearchResult[];
    totalCount: number;
    truncated?: boolean;
  }> {
    return this.sendMessage('SEARCH', request);
  }

  isAvailable(): boolean {
    return this.worker !== null;
  }

  dispose() {
    // Clear pending requests
    for (const [requestId, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Worker disposed'));
      this.pendingRequests.delete(requestId);
    }

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}