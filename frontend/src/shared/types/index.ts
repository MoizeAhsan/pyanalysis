// Core data types
export interface AnalysisData {
  project_name: string;
  total_files: number;
  total_lines: number;
  modules: ModuleData[];
  dependencies: DependencyData[];
  architecture: ArchitectureData;
  mindmap: MindMapData;
}

export interface ModuleData {
  name: string;
  path: string;
  type: 'module' | 'package' | 'script';
  lines_of_code: number;
  functions: FunctionData[];
  classes: ClassData[];
  imports: ImportData[];
}

export interface FunctionData {
  name: string;
  line_number: number;
  parameters: string[];
  return_type?: string;
  docstring?: string;
  complexity?: number;
}

export interface ClassData {
  name: string;
  line_number: number;
  methods: FunctionData[];
  attributes: string[];
  inheritance: string[];
  docstring?: string;
}

export interface ImportData {
  module: string;
  alias?: string;
  from_module?: string;
  line_number: number;
}

export interface DependencyData {
  source: string;
  target: string;
  type: 'import' | 'inheritance' | 'composition' | 'usage';
  weight?: number;
}

export interface ArchitectureData {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  layers: string[];
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: 'module' | 'class' | 'function' | 'package';
  layer?: string;
  size?: number;
  color?: string;
}

export interface ArchitectureEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface MindMapNode {
  id: string;
  label: string;
  type: 'root' | 'module' | 'class' | 'function';
  level: number;
  parent?: string;
  children?: string[];
  metadata?: Record<string, unknown>;
}

export interface MindMapEdge {
  source: string;
  target: string;
  type: 'contains' | 'imports' | 'inherits';
}

// UI-specific types
export interface CodeElement {
  id: string;
  name: string;
  type: 'module' | 'class' | 'function' | 'variable';
  path: string;
  line_number?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  element: CodeElement;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: string;
  value: string;
  indices: [number, number][];
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

// Error types
export interface AppError {
  type: 'network' | 'validation' | 'runtime' | 'permission';
  message: string;
  code?: string;
  recoverable: boolean;
  retryAction?: () => void;
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}