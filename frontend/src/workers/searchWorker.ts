/**
 * Search Worker for heavy search computations
 * This runs in a separate thread to avoid blocking the UI
 */

import { fuzzyMatch } from '../shared/utils/search';

export interface SearchWorkerMessage {
  type: 'SEARCH' | 'INDEX' | 'CANCEL';
  payload: any;
  requestId: string;
}

export interface SearchWorkerResponse {
  type: 'SEARCH_RESULT' | 'INDEX_COMPLETE' | 'ERROR';
  payload: any;
  requestId: string;
}

// In-memory search index
let searchIndex: any = null;
let isIndexing = false;

// Handle messages from main thread
self.onmessage = function(event: MessageEvent<SearchWorkerMessage>) {
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
        // Handle search cancellation if needed
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: any) {
    postMessage({
      type: 'ERROR',
      payload: { error: error?.message || 'Unknown error' },
      requestId
    } as SearchWorkerResponse);
  }
};

function handleIndexing(data: { elements: any[] }, requestId: string) {
  if (isIndexing) {
    postMessage({
      type: 'ERROR',
      payload: { error: 'Already indexing' },
      requestId
    } as SearchWorkerResponse);
    return;
  }

  isIndexing = true;
  const { elements } = data;
  
  try {
    // Clear existing index
    searchIndex.clear();
    
    // Build search index
    elements.forEach((element, index) => {
      const searchableText = [
        element.name || '',
        element.docstring || '',
        element.location?.file_path || '',
        element.type || ''
      ].join(' ').toLowerCase();
      
      searchIndex.set(element.id || `element-${index}`, {
        ...element,
        _searchText: searchableText,
        _tokens: searchableText.split(/\s+/).filter(token => token.length > 0)
      });
    });

    postMessage({
      type: 'INDEX_COMPLETE',
      payload: { indexedCount: elements.length },
      requestId
    } as SearchWorkerResponse);
  } catch (error: any) {
    postMessage({
      type: 'ERROR',
      payload: { error: error?.message || 'Indexing failed' },
      requestId
    } as SearchWorkerResponse);
  } finally {
    isIndexing = false;
  }
}

function handleSearch(data: { 
  query: string; 
  options?: any; 
  filters?: Record<string, any>;
  maxResults?: number;
}, requestId: string) {
  const { query, options = {}, filters = {}, maxResults = 100 } = data;
  
  if (!query || query.trim().length === 0) {
    postMessage({
      type: 'SEARCH_RESULT',
      payload: { results: [], totalCount: 0 },
      requestId
    } as SearchWorkerResponse);
    return;
  }

  const normalizedQuery = query.toLowerCase();
  const results: Array<{
    element: any;
    score: number;
    matches: Record<string, Array<[number, number]>>;
    matchType: string;
  }> = [];

  // Search through indexed elements
  for (const [, indexedElement] of searchIndex) {
    // Apply filters first
    if (filters.elementType && indexedElement.type !== filters.elementType) {
      continue;
    }
    
    if (filters.hasDocstring && !indexedElement.docstring) {
      continue;
    }
    
    if (filters.isPublic && indexedElement.name?.startsWith('_')) {
      continue;
    }

    // Perform fuzzy matching on different fields
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

    // Calculate best match
    let bestScore = 0;
    let matchType = 'none';
    const allMatches: Record<string, Array<[number, number]>> = {};

    if (nameMatch.isMatch) {
      bestScore = Math.max(bestScore, nameMatch.score * 1.2); // Boost name matches
      matchType = nameMatch.score === bestScore / 1.2 ? 'name' : matchType;
      allMatches.name = nameMatch.matches;
    }
    
    if (docMatch.isMatch) {
      bestScore = Math.max(bestScore, docMatch.score);
      matchType = docMatch.score === bestScore ? 'docstring' : matchType;
      allMatches.docstring = docMatch.matches;
    }
    
    if (pathMatch.isMatch) {
      bestScore = Math.max(bestScore, pathMatch.score * 0.8); // De-prioritize path matches
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
          // Remove internal search fields
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

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);
  
  // Limit results
  const limitedResults = results.slice(0, maxResults);

  postMessage({
    type: 'SEARCH_RESULT',
    payload: { 
      results: limitedResults, 
      totalCount: results.length,
      truncated: results.length > maxResults
    },
    requestId
  } as SearchWorkerResponse);
}

// Export type for TypeScript compilation (this won't be included in the worker bundle)
export {};