/** Canned API responses shaped exactly like the backend's. */
import type {
  AnalysisStatus,
  CycleList,
  ElementDetail,
  ElementSummary,
  Graph,
  Issue,
  IssuePage,
  PatternList,
  Source,
  Summary,
  TreeNode,
  Usage,
} from '@shared/api/types';

export const IDLE: AnalysisStatus = {
  state: 'idle',
  phase: null,
  processed: 0,
  total: 0,
  project_path: null,
  error: null,
  started_at: null,
  elapsed_seconds: 0,
  has_result: false,
};

export const COMPLETED: AnalysisStatus = {
  ...IDLE,
  state: 'completed',
  processed: 12,
  total: 12,
  project_path: '/work/shop',
  started_at: '2026-01-01T10:00:00+00:00',
  elapsed_seconds: 1.5,
  has_result: true,
};

export function running(processed: number, total: number, phase = 'parsing'): AnalysisStatus {
  return { ...COMPLETED, state: 'running', phase, processed, total, has_result: false };
}

export const SUMMARY: Summary = {
  name: 'shop',
  path: '/work/shop',
  analyzed_at: '2026-01-01T10:00:01+00:00',
  duration_seconds: 1.5,
  total_files: 12,
  total_lines: 3456,
  cached_files: 0,
  modules: 12,
  classes: 7,
  functions: 41,
  usages: 230,
  dependency_edges: 19,
  import_cycles: 1,
  patterns: 1,
  issues: { unused_import: 3, dead_code: 2 },
  skipped_files: [
    { file_path: 'shop/broken.py', reason: 'syntax error at line 3: invalid syntax' },
  ],
  skipped_total: 1,
  external_packages: [{ name: 'requests', count: 4 }],
  most_imported_modules: [
    {
      id: 'module:shop/models.py',
      name: 'shop.models',
      file_path: 'shop/models.py',
      imported_by: 6,
      imports: 0,
    },
  ],
};

export function element(
  overrides: Partial<ElementSummary> & { id: string; name: string },
): ElementSummary {
  return {
    qualified_name: overrides.name,
    type: 'function',
    file_path: 'shop/orders.py',
    line: 10,
    end_line: 20,
    parent_id: 'module:shop/orders.py',
    is_method: false,
    is_async: false,
    summary: null,
    usage_count: 0,
    ...overrides,
  };
}

export const ELEMENTS: ElementSummary[] = [
  element({
    id: 'module:shop/orders.py',
    name: 'orders',
    qualified_name: 'shop.orders',
    type: 'module',
    line: 1,
    parent_id: null,
    summary: 'Order handling.',
  }),
  element({
    id: 'class:shop/orders.py:Order',
    name: 'Order',
    type: 'class',
    line: 5,
    usage_count: 9,
    summary: 'A customer order.',
  }),
  element({
    id: 'function:shop/orders.py:Order.total',
    name: 'total',
    qualified_name: 'Order.total',
    line: 12,
    is_method: true,
    parent_id: 'class:shop/orders.py:Order',
    usage_count: 4,
  }),
  element({
    id: 'function:shop/orders.py:place_order',
    name: 'place_order',
    line: 30,
    usage_count: 2,
    summary: 'Create and store an order.',
  }),
];

export const ORDER_DETAIL: ElementDetail = {
  ...element({
    id: 'class:shop/orders.py:Order',
    name: 'Order',
    type: 'class',
    line: 5,
    end_line: 28,
    usage_count: 3,
    summary: 'A customer order.',
  }),
  column: 0,
  docstring: 'A customer order.\n\nHolds line items and computes totals.',
  parameters: [],
  return_type: null,
  decorators: ['dataclass'],
  complexity: 0,
  line_count: 24,
  parent: {
    id: 'module:shop/orders.py',
    name: 'orders',
    qualified_name: 'shop.orders',
    type: 'module',
    file_path: 'shop/orders.py',
    line: 1,
  },
  children: [
    {
      id: 'function:shop/orders.py:Order.total',
      name: 'total',
      qualified_name: 'Order.total',
      type: 'function',
      file_path: 'shop/orders.py',
      line: 12,
    },
  ],
  dependencies: [
    {
      id: 'class:shop/models.py:Money',
      name: 'Money',
      qualified_name: 'Money',
      type: 'class',
      file_path: 'shop/models.py',
      line: 3,
    },
  ],
  usage_counts: { import: 1, call: 2 },
  declared_bases: ['Entity', 'abc.ABC'],
  bases: [
    {
      id: 'class:shop/models.py:Entity',
      name: 'Entity',
      qualified_name: 'Entity',
      type: 'class',
      file_path: 'shop/models.py',
      line: 20,
    },
  ],
  external_bases: ['abc.ABC'],
  subclasses: [
    {
      id: 'class:shop/orders.py:GiftOrder',
      name: 'GiftOrder',
      qualified_name: 'GiftOrder',
      type: 'class',
      file_path: 'shop/orders.py',
      line: 40,
    },
  ],
  overrides: null,
  overridden_by: [],
  issues: [
    {
      kind: 'large_class',
      severity: 'warning',
      message: "'Order' has 25 methods (limit 20)",
      file_path: 'shop/orders.py',
      line: 5,
      element_id: 'class:shop/orders.py:Order',
    },
  ],
};

export const TOTAL_DETAIL: ElementDetail = {
  ...element({
    id: 'function:shop/orders.py:Order.total',
    name: 'total',
    qualified_name: 'Order.total',
    line: 12,
    end_line: 15,
    is_method: true,
    parent_id: 'class:shop/orders.py:Order',
    usage_count: 0,
  }),
  column: 4,
  docstring: null,
  parameters: [
    { name: 'self', kind: 'positional', type_hint: null, default_value: null },
    { name: 'currency', kind: 'positional', type_hint: 'str', default_value: "'EUR'" },
    { name: 'rounding', kind: 'keyword_only', type_hint: null, default_value: 'True' },
  ],
  return_type: 'Money',
  decorators: [],
  complexity: 3,
  line_count: 4,
  parent: {
    id: 'class:shop/orders.py:Order',
    name: 'Order',
    qualified_name: 'Order',
    type: 'class',
    file_path: 'shop/orders.py',
    line: 5,
  },
  children: [],
  dependencies: [],
  usage_counts: {},
  declared_bases: [],
  bases: [],
  external_bases: [],
  subclasses: [],
  overrides: {
    id: 'function:shop/models.py:Entity.total',
    name: 'total',
    qualified_name: 'Entity.total',
    type: 'function',
    file_path: 'shop/models.py',
    line: 22,
  },
  overridden_by: [
    {
      id: 'function:shop/orders.py:GiftOrder.total',
      name: 'total',
      qualified_name: 'GiftOrder.total',
      type: 'function',
      file_path: 'shop/orders.py',
      line: 42,
    },
  ],
  issues: [],
};

export const USAGES: Usage[] = [
  {
    file_path: 'shop/api.py',
    line: 3,
    column: 0,
    context: 'from shop.orders import Order',
    usage_type: 'import',
    used_by: {
      id: 'module:shop/api.py',
      name: 'api',
      qualified_name: 'shop.api',
      type: 'module',
      file_path: 'shop/api.py',
      line: 1,
    },
  },
  {
    file_path: 'shop/api.py',
    line: 18,
    column: 12,
    context: 'order = Order(items)',
    usage_type: 'call',
    used_by: {
      id: 'function:shop/api.py:create',
      name: 'create',
      qualified_name: 'create',
      type: 'function',
      file_path: 'shop/api.py',
      line: 15,
    },
  },
  {
    file_path: 'shop/jobs.py',
    line: 7,
    column: 8,
    context: 'return Order([])',
    usage_type: 'call',
    used_by: null,
  },
];

export const SOURCE: Source = {
  file_path: 'shop/orders.py',
  start_line: 5,
  end_line: 7,
  total_lines: 60,
  lines: ['class Order(Entity):', '    """A customer order."""', '    items: list[Item]'],
};

export const MODULE_GRAPH: Graph = {
  level: 'module',
  focus: null,
  nodes: [
    {
      id: 'module:shop/api.py',
      name: 'shop.api',
      type: 'module',
      file_path: 'shop/api.py',
      in_degree: 0,
      out_degree: 2,
      size: 80,
    },
    {
      id: 'module:shop/orders.py',
      name: 'shop.orders',
      type: 'module',
      file_path: 'shop/orders.py',
      in_degree: 1,
      out_degree: 1,
      size: 60,
    },
    {
      id: 'module:shop/models.py',
      name: 'shop.models',
      type: 'module',
      file_path: 'shop/models.py',
      in_degree: 2,
      out_degree: 0,
      size: 40,
    },
  ],
  edges: [
    {
      source: 'module:shop/api.py',
      target: 'module:shop/orders.py',
      relationship_type: 'import',
      weight: 3,
    },
    {
      source: 'module:shop/api.py',
      target: 'module:shop/models.py',
      relationship_type: 'import',
      weight: 1,
    },
    {
      source: 'module:shop/orders.py',
      target: 'module:shop/models.py',
      relationship_type: 'import',
      weight: 5,
    },
  ],
  total_nodes: 3,
  total_edges: 3,
  truncated: false,
};

export const CYCLES: CycleList = {
  total: 1,
  items: [
    {
      modules: [
        {
          id: 'module:shop/a.py',
          name: 'a',
          qualified_name: 'shop.a',
          type: 'module',
          file_path: 'shop/a.py',
          line: 1,
        },
        {
          id: 'module:shop/b.py',
          name: 'b',
          qualified_name: 'shop.b',
          type: 'module',
          file_path: 'shop/b.py',
          line: 1,
        },
      ],
    },
  ],
};

export const PATTERNS: PatternList = {
  items: [
    {
      name: 'Factory (OrderFactory)',
      type: 'factory',
      confidence: 0.6,
      description: 'OrderFactory exposes 1 creation method',
      elements: [
        {
          id: 'class:shop/factory.py:OrderFactory',
          name: 'OrderFactory',
          qualified_name: 'OrderFactory',
          type: 'class',
          file_path: 'shop/factory.py',
          line: 4,
        },
      ],
    },
  ],
};

export const ISSUES: Issue[] = [
  {
    kind: 'unused_import',
    severity: 'warning',
    message: "'os' is imported but never used",
    file_path: 'shop/api.py',
    line: 2,
    element_id: 'module:shop/api.py',
  },
  {
    kind: 'unused_import',
    severity: 'warning',
    message: "'json' is imported but never used",
    file_path: 'shop/jobs.py',
    line: 1,
    element_id: 'module:shop/jobs.py',
  },
  {
    kind: 'dead_code',
    severity: 'info',
    message: "No references to function 'legacy_export' were found",
    file_path: 'shop/jobs.py',
    line: 30,
    element_id: 'function:shop/jobs.py:legacy_export',
  },
];

export function issuePage(items: Issue[]): IssuePage {
  return {
    items,
    total: items.length,
    offset: 0,
    limit: 100,
    next_offset: null,
    counts: { unused_import: 2, dead_code: 1 },
  };
}

export const TREE: Record<string, TreeNode[]> = {
  'dir:': [
    {
      id: 'dir:shop',
      name: 'shop',
      type: 'directory',
      child_count: 2,
      file_path: 'shop',
      line: 0,
      usage_count: 0,
    },
    {
      id: 'module:setup.py',
      name: 'setup',
      type: 'module',
      child_count: 0,
      file_path: 'setup.py',
      line: 1,
      usage_count: 0,
    },
  ],
  'dir:shop': [
    {
      id: 'module:shop/orders.py',
      name: 'orders',
      type: 'module',
      child_count: 2,
      file_path: 'shop/orders.py',
      line: 1,
      usage_count: 5,
    },
    {
      id: 'module:shop/models.py',
      name: 'models',
      type: 'module',
      child_count: 0,
      file_path: 'shop/models.py',
      line: 1,
      usage_count: 9,
    },
  ],
  'module:shop/orders.py': [
    {
      id: 'class:shop/orders.py:Order',
      name: 'Order',
      type: 'class',
      child_count: 1,
      file_path: 'shop/orders.py',
      line: 5,
      usage_count: 3,
    },
    {
      id: 'function:shop/orders.py:place_order',
      name: 'place_order',
      type: 'function',
      child_count: 0,
      file_path: 'shop/orders.py',
      line: 30,
      usage_count: 2,
    },
  ],
};
