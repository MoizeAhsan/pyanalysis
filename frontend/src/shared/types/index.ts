// Backend API Response Types (matching exact backend structure)
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ProjectInfo {
  name: string;
  path: string;
  total_files: number;
  total_lines: number;
  languages: string[];
  analysis_timestamp: string;
}

export interface Location {
  file_path: string;
  line_number: number;
  column_number: number;
  end_line: number;
  end_column: number;
}

export interface Parameter {
  name: string;
  type_hint?: string;
  default_value?: string;
}

export interface Usage {
  location: Location;
  context: string;
  usage_type: string;
}

export interface CodeElement {
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

export interface DependencyGraphNode {
  id: string;
  name: string;
  type: string;
  metadata: Record<string, any>;
}

export interface DependencyGraphEdge {
  source: string;
  target: string;
  relationship_type: string;
  weight: number;
}

export interface DependencyGraphMetrics {
  node_count: number;
  edge_count: number;
  density: number;
  avg_degree: number;
}

export interface DependencyGraph {
  nodes: Record<string, DependencyGraphNode>;
  edges: DependencyGraphEdge[];
  metrics?: DependencyGraphMetrics;
}

export interface ArchitecturalPattern {
  name: string;
  type: string;
  confidence: number;
  elements: string[];
  description: string;
}

export interface AnalysisData {
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

export interface ArchitecturalData {
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

export interface SearchMatchResult {
  element: CodeElement;
  match_type: 'name' | 'docstring' | 'file_path';
  match_text: string;
  // Enhanced client-side fields
  fuzzyScore?: number;
  nameMatches?: any[];
  docMatches?: any[];
  relevanceScore?: number;
}

export interface SearchResponse {
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

// Legacy types for backward compatibility - gradually migrate away from these
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

// Analysis request types
export interface AnalyzeRequest {
  project_path: string;
}

export interface AnalyzeStats {
  project_name: string;
  total_files: number;
  total_lines: number;
  modules_count: number;
  classes_count: number;
  functions_count: number;
  total_elements: number;
}

// Visualization data transformation helpers
export interface VisualizationNode {
  id: string;
  label: string;
  type: 'module' | 'class' | 'function';
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}

export interface VisualizationEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
  color?: string;
}