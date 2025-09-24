import { create } from 'zustand';
import type { AnalysisData, CodeElement } from '@shared/types';

export interface AppState {
  // Analysis state
  analysisTriggered: boolean;
  analysisData: AnalysisData | null;
  loading: boolean;
  
  // Navigation state
  currentView: string;
  selectedElement: CodeElement | null;
  
  // Performance state
  preloadedComponents: Set<string>;
  
  // Actions
  setAnalysisTriggered: (triggered: boolean) => void;
  setAnalysisData: (data: AnalysisData | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: string) => void;
  setSelectedElement: (element: CodeElement | null) => void;
  addPreloadedComponent: (component: string) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  analysisTriggered: false,
  analysisData: null,
  loading: false,
  currentView: 'home',
  selectedElement: null,
  preloadedComponents: new Set(),

  // Actions
  setAnalysisTriggered: (triggered: boolean) => {
    set({ analysisTriggered: triggered });
  },

  setAnalysisData: (data: AnalysisData | null) => {
    set({ analysisData: data });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setCurrentView: (view: string) => {
    set({ currentView: view });
  },

  setSelectedElement: (element: CodeElement | null) => {
    set({ selectedElement: element });
  },

  addPreloadedComponent: (component: string) => {
    const preloadedComponents = new Set(get().preloadedComponents);
    preloadedComponents.add(component);
    set({ preloadedComponents });
  },

  reset: () => {
    set({
      analysisTriggered: false,
      analysisData: null,
      loading: false,
      currentView: 'home',
      selectedElement: null,
    });
  },
}));

// Individual property selectors to avoid object recreation
export const useAnalysisTriggered = () => useAppStore((state) => state.analysisTriggered);
export const useAnalysisData = () => useAppStore((state) => state.analysisData);
export const useLoading = () => useAppStore((state) => state.loading);
export const useCurrentView = () => useAppStore((state) => state.currentView);
export const useSelectedElement = () => useAppStore((state) => state.selectedElement);

// Action selectors
export const useSetAnalysisTriggered = () => useAppStore((state) => state.setAnalysisTriggered);
export const useSetAnalysisData = () => useAppStore((state) => state.setAnalysisData);
export const useSetLoading = () => useAppStore((state) => state.setLoading);
export const useSetCurrentView = () => useAppStore((state) => state.setCurrentView);
export const useSetSelectedElement = () => useAppStore((state) => state.setSelectedElement);