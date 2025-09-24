/**
 * Advanced search utilities with fuzzy matching and highlighting
 */
import React from 'react';

export interface FuzzyMatchResult {
  score: number;
  matches: Array<[number, number]>; // [start, end] indices for highlighting
  isMatch: boolean;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  threshold?: number; // 0-1, lower = more strict
  includeMatches?: boolean;
  maxPatternLength?: number;
}

/**
 * Simple fuzzy matching algorithm with highlighting support
 */
export function fuzzyMatch(
  text: string,
  pattern: string,
  options: SearchOptions = {}
): FuzzyMatchResult {
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
  const matches: Array<[number, number]> = [];
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
        // Extend the current match or start a new one
        const lastMatch = matches[matches.length - 1];
        if (matches.length > 0 && lastMatch && lastMatch[1] === textIndex) {
          lastMatch[1] = textIndex + 1;
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

  // Calculate score based on various factors
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

/**
 * Highlight matching text with HTML spans
 */
export function highlightMatches(
  text: string,
  matches: Array<[number, number]>,
  className: string = 'search-highlight'
): string {
  if (!matches || matches.length === 0) {
    return text;
  }

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a[0] - b[0]);
  
  let result = '';
  let lastIndex = 0;

  for (const [start, end] of sortedMatches) {
    // Add text before the match
    result += text.substring(lastIndex, start);
    // Add highlighted match
    result += `<span class="${className}">${text.substring(start, end)}</span>`;
    lastIndex = end;
  }

  // Add remaining text
  result += text.substring(lastIndex);

  return result;
}

/**
 * Create a React component for highlighted text
 */
export function createHighlightedText(
  text: string,
  matches: Array<[number, number]>,
  highlightClassName: string = 'search-highlight'
): React.ReactNode {
  if (!matches || matches.length === 0) {
    return text;
  }

  const sortedMatches = [...matches].sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    if (!match) continue;
    
    const [start, end] = match;
    
    // Add text before the match
    if (start > lastIndex) {
      parts.push(text.substring(lastIndex, start));
    }
    
    // Add highlighted match
    parts.push(
      React.createElement(
        'span',
        { 
          key: `highlight-${i}`, 
          className: highlightClassName 
        },
        text.substring(start, end)
      )
    );
    
    lastIndex = end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

/**
 * Search through a list of items with fuzzy matching
 */
export function searchItems<T>(
  items: T[],
  query: string,
  searchFields: Array<keyof T | ((item: T) => string)>,
  options: SearchOptions = {}
): Array<{
  item: T;
  score: number;
  matches: Record<string, Array<[number, number]>>;
  bestMatch: string;
}> {
  if (!query.trim()) {
    return [];
  }

  const results = items.map(item => {
    let bestScore = 0;
    let bestMatch = '';
    const allMatches: Record<string, Array<[number, number]>> = {};

    for (const field of searchFields) {
      const text = typeof field === 'function' 
        ? field(item) 
        : String(item[field] || '');
      
      const fieldName = typeof field === 'function' ? 'computed' : String(field);
      const matchResult = fuzzyMatch(text, query, options);
      
      if (matchResult.isMatch) {
        allMatches[fieldName] = matchResult.matches;
        
        if (matchResult.score > bestScore) {
          bestScore = matchResult.score;
          bestMatch = fieldName;
        }
      }
    }

    return {
      item,
      score: bestScore,
      matches: allMatches,
      bestMatch
    };
  }).filter(result => result.score > 0);

  // Sort by score (descending)
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Filter presets for common search scenarios
 */
export const FILTER_PRESETS = {
  ALL: {
    name: 'All Elements',
    description: 'Search across all code elements',
    filters: {}
  },
  CLASSES_ONLY: {
    name: 'Classes Only',
    description: 'Search only class definitions',
    filters: { elementType: 'class' }
  },
  FUNCTIONS_ONLY: {
    name: 'Functions Only', 
    description: 'Search only function definitions',
    filters: { elementType: 'function' }
  },
  MODULES_ONLY: {
    name: 'Modules Only',
    description: 'Search only module/file names',
    filters: { elementType: 'module' }
  },
  WITH_DOCS: {
    name: 'With Documentation',
    description: 'Search elements that have docstrings',
    filters: { hasDocstring: true }
  },
  PUBLIC_API: {
    name: 'Public API',
    description: 'Search public methods and classes (not starting with _)',
    filters: { isPublic: true }
  }
} as const;

export type FilterPresetKey = keyof typeof FILTER_PRESETS;