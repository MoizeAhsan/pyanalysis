/**
 * Search History Manager for storing and retrieving search history
 */

export interface SearchHistoryItem {
  query: string;
  elementType?: string;
  resultCount: number;
  timestamp: number;
}

const STORAGE_KEY = 'pyanalysis-search-history';
const FAVORITES_KEY = 'pyanalysis-search-favorites';
const MAX_HISTORY_ITEMS = 20;
const MAX_FAVORITES = 10;

export class SearchHistoryManager {
  private history: SearchHistoryItem[] = [];
  private favorites: string[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const historyData = localStorage.getItem(STORAGE_KEY);
      const favoritesData = localStorage.getItem(FAVORITES_KEY);

      if (historyData) {
        this.history = JSON.parse(historyData);
      }

      if (favoritesData) {
        this.favorites = JSON.parse(favoritesData);
      }
    } catch (error) {
      console.warn('Failed to load search history from storage:', error);
      this.history = [];
      this.favorites = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favorites));
    } catch (error) {
      console.warn('Failed to save search history to storage:', error);
    }
  }

  addSearch(item: SearchHistoryItem): void {
    // Remove existing entry with same query if it exists
    this.history = this.history.filter(h => h.query !== item.query);
    
    // Add to beginning
    this.history.unshift(item);
    
    // Limit history size
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
    }
    
    this.saveToStorage();
  }

  getHistory(): SearchHistoryItem[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    this.saveToStorage();
  }

  addFavorite(query: string): void {
    if (this.favorites.includes(query)) {
      return;
    }
    
    this.favorites.unshift(query);
    
    // Limit favorites size
    if (this.favorites.length > MAX_FAVORITES) {
      this.favorites = this.favorites.slice(0, MAX_FAVORITES);
    }
    
    this.saveToStorage();
  }

  removeFavorite(query: string): void {
    this.favorites = this.favorites.filter(f => f !== query);
    this.saveToStorage();
  }

  getFavorites(): string[] {
    return [...this.favorites];
  }

  clearFavorites(): void {
    this.favorites = [];
    this.saveToStorage();
  }

  getRecentQueries(limit: number = 5): string[] {
    return this.history
      .slice(0, limit)
      .map(item => item.query)
      .filter((query, index, arr) => arr.indexOf(query) === index);
  }

  getPopularQueries(limit: number = 5): string[] {
    const queryFrequency = new Map<string, number>();
    
    this.history.forEach(item => {
      const count = queryFrequency.get(item.query) || 0;
      queryFrequency.set(item.query, count + 1);
    });
    
    return Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }

  getHistoryStats(): {
    totalSearches: number;
    uniqueQueries: number;
    favoriteCount: number;
    averageResultCount: number;
  } {
    const uniqueQueries = new Set(this.history.map(item => item.query));
    const totalResults = this.history.reduce((sum, item) => sum + item.resultCount, 0);
    
    return {
      totalSearches: this.history.length,
      uniqueQueries: uniqueQueries.size,
      favoriteCount: this.favorites.length,
      averageResultCount: this.history.length > 0 ? totalResults / this.history.length : 0
    };
  }
}