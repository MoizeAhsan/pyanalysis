import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import type { Core, ElementDefinition, LayoutOptions, StylesheetJson } from 'cytoscape';
import { logger } from '@shared/lib/logger';

export interface CanvasNode {
  id: string;
  label: string;
  /** Drives colour and shape: directory, package, module, class, function. */
  type: string;
  /** Relative importance; larger nodes are drawn bigger. */
  weight?: number;
  /** Marks nodes that can still be expanded. */
  expandable?: boolean;
}

export interface CanvasEdge {
  source: string;
  target: string;
  weight?: number;
  /** import, inherits, uses, uses_type, or contains. */
  kind?: string;
}

export type CanvasLayout = 'cose' | 'breadthfirst' | 'concentric' | 'circle' | 'grid';

export interface GraphCanvasHandle {
  fit: () => void;
  zoomBy: (factor: number) => void;
  /** A PNG data URL of the whole graph, or null before the graph is ready. */
  toPng: () => string | null;
  /** The graph as standalone SVG markup, or null before the graph is ready. */
  toSvg: () => string | null;
}

interface GraphCanvasProps {
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  layout: CanvasLayout;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string | null) => void) | undefined;
  ariaLabel: string;
  height?: number | string | undefined;
}

/** Above this many nodes, animation and per-frame edge drawing are switched off. */
export const LARGE_GRAPH_NODES = 250;

const TYPE_SHAPES: Record<string, string> = {
  directory: 'round-rectangle',
  package: 'round-rectangle',
  module: 'ellipse',
  class: 'diamond',
  function: 'round-triangle',
};

function typeColors(theme: Theme): Record<string, string> {
  const { palette } = theme;
  return {
    directory: palette.grey[palette.mode === 'dark' ? 500 : 600],
    package: palette.grey[palette.mode === 'dark' ? 500 : 600],
    module: palette.primary.main,
    class: palette.secondary.main,
    function: palette.success.main,
  };
}

export function buildStylesheet(theme: Theme): StylesheetJson {
  const colors = typeColors(theme);
  const text = theme.palette.text.primary;
  const edge = theme.palette.text.disabled;
  const styles: StylesheetJson = [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        color: text,
        'font-size': 11,
        'font-family': theme.typography.fontFamily ?? 'sans-serif',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'text-wrap': 'ellipsis',
        'text-max-width': '120px',
        'min-zoomed-font-size': 7,
        width: 'data(size)',
        height: 'data(size)',
        'background-color': theme.palette.grey[500],
        'border-width': 0,
      },
    },
    {
      selector: 'node[?expandable]',
      style: { 'border-width': 3, 'border-style': 'double', 'border-color': text },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-style': 'solid',
        'border-color': theme.palette.warning.main,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 'data(width)',
        'line-color': edge,
        'target-arrow-color': edge,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'curve-style': 'bezier',
        opacity: 0.7,
      },
    },
    {
      selector: 'edge[kind = "contains"]',
      style: { 'target-arrow-shape': 'none', 'line-style': 'solid' },
    },
    {
      selector: 'edge[kind = "inherits"]',
      style: {
        'line-color': theme.palette.secondary.main,
        'target-arrow-color': theme.palette.secondary.main,
        'target-arrow-shape': 'triangle-backcurve',
      },
    },
    { selector: 'edge[kind = "uses_type"]', style: { 'line-style': 'dashed' } },
  ];
  for (const [type, color] of Object.entries(colors)) {
    styles.push({
      selector: `node[type = "${type}"]`,
      style: { 'background-color': color, shape: (TYPE_SHAPES[type] ?? 'ellipse') as 'ellipse' },
    });
  }
  return styles;
}

export function toElements(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
): ElementDefinition[] {
  const maxWeight = Math.max(1, ...nodes.map((node) => node.weight ?? 0));
  const maxEdge = Math.max(1, ...edges.map((edge) => edge.weight ?? 1));
  const known = new Set(nodes.map((node) => node.id));
  const elements: ElementDefinition[] = nodes.map((node) => ({
    group: 'nodes',
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      expandable: node.expandable === true,
      // Area, not diameter, grows with weight so big nodes do not dominate.
      size: 18 + 30 * Math.sqrt((node.weight ?? 0) / maxWeight),
    },
  }));
  edges.forEach((edge, index) => {
    if (!known.has(edge.source) || !known.has(edge.target)) return;
    elements.push({
      group: 'edges',
      data: {
        id: `e${index}:${edge.source}>${edge.target}:${edge.kind ?? ''}`,
        source: edge.source,
        target: edge.target,
        kind: edge.kind ?? 'import',
        width: 1 + 3 * Math.sqrt((edge.weight ?? 1) / maxEdge),
      },
    });
  });
  return elements;
}

/** Positioned node, as read back from the renderer, for SVG export. */
export interface PlacedNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  size: number;
}

const SVG_PADDING = 40;

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function svgShape(node: PlacedNode, fill: string): string {
  const r = node.size / 2;
  const { x, y } = node;
  switch (TYPE_SHAPES[node.type]) {
    case 'round-rectangle':
      return `<rect x="${x - r}" y="${y - r}" width="${node.size}" height="${node.size}" rx="${r / 3}" fill="${fill}"/>`;
    case 'diamond':
      return `<polygon points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${fill}"/>`;
    case 'round-triangle':
      return `<polygon points="${x},${y - r} ${x + r},${y + r} ${x - r},${y + r}" fill="${fill}" stroke-linejoin="round"/>`;
    default:
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  }
}

/**
 * Standalone SVG for a laid-out graph: shapes and colours match the canvas,
 * edges are straight lines with arrowheads. Vector output scales cleanly in
 * documents, unlike the PNG export.
 */
export function graphToSvg(
  nodes: readonly PlacedNode[],
  edges: readonly CanvasEdge[],
  theme: Theme,
): string {
  const colors = typeColors(theme);
  const xs = nodes.flatMap((node) => [node.x - node.size, node.x + node.size]);
  const ys = nodes.flatMap((node) => [node.y - node.size, node.y + node.size + 16]);
  const minX = Math.min(0, ...xs) - SVG_PADDING;
  const minY = Math.min(0, ...ys) - SVG_PADDING;
  const width = Math.max(1, ...xs) - minX + SVG_PADDING;
  const height = Math.max(1, ...ys) - minY + SVG_PADDING;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edgeColor = theme.palette.text.disabled;
  const lines = edges.flatMap((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return [];
    const dash = edge.kind === 'uses_type' ? ' stroke-dasharray="6 4"' : '';
    const color = edge.kind === 'inherits' ? theme.palette.secondary.main : edgeColor;
    const marker = edge.kind === 'contains' ? '' : ' marker-end="url(#arrow)"';
    return [
      `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${color}" stroke-opacity="0.7"${dash}${marker}/>`,
    ];
  });
  const shapes = nodes.map((node) => {
    const fill = colors[node.type] ?? theme.palette.grey[500];
    const label = `<text x="${node.x}" y="${node.y + node.size / 2 + 14}" text-anchor="middle">${escapeXml(node.label)}</text>`;
    return `<g><title>${escapeXml(node.id)}</title>${svgShape(node, fill)}${label}</g>`;
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${Math.round(width)}" height="${Math.round(height)}">`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${edgeColor}"/></marker></defs>`,
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${theme.palette.background.paper}"/>`,
    `<g font-family="${escapeXml(String(theme.typography.fontFamily ?? 'sans-serif'))}" font-size="11" fill="${theme.palette.text.primary}">`,
    ...lines,
    ...shapes,
    '</g></svg>',
  ].join('\n');
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function layoutOptions(
  layout: CanvasLayout,
  nodeCount: number,
  animate = false,
): LayoutOptions {
  const large = nodeCount > LARGE_GRAPH_NODES;
  const common = {
    fit: true,
    padding: 30,
    animate: animate && !large,
    animationDuration: 450,
    animationEasing: 'ease-in-out-cubic' as const,
  };
  switch (layout) {
    case 'breadthfirst':
      return { name: 'breadthfirst', directed: true, spacingFactor: large ? 0.9 : 1.2, ...common };
    case 'concentric':
      return { name: 'concentric', minNodeSpacing: large ? 8 : 25, ...common };
    case 'circle':
      return { name: 'circle', ...common };
    case 'grid':
      return { name: 'grid', ...common };
    case 'cose':
      return {
        name: 'cose',
        nodeRepulsion: () => 600_000,
        idealEdgeLength: () => 90,
        nodeOverlap: 24,
        componentSpacing: 60,
        numIter: large ? 300 : 1000,
        ...common,
      };
  }
}

/**
 * Interactive graph drawn with Cytoscape. The library is loaded on demand so it
 * stays out of the initial bundle. One instance is created per mount; data and
 * theme changes update it in place.
 */
export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { nodes, edges, layout, selectedId, onSelect, ariaLabel, height = '100%' },
  ref,
) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const drawnRef = useRef<{ nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[] } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      fit: () => cyRef.current?.fit(undefined, 30),
      zoomBy: (factor) => {
        const cy = cyRef.current;
        if (!cy) return;
        cy.zoom({
          level: cy.zoom() * factor,
          renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
        });
      },
      toPng: () =>
        cyRef.current?.png({ full: true, scale: 2, bg: theme.palette.background.paper }) ?? null,
      toSvg: () => {
        const cy = cyRef.current;
        if (!cy) return null;
        const placed = cy.nodes().map((node) => ({
          id: String(node.id()),
          label: String(node.data('label')),
          type: String(node.data('type')),
          size: Number(node.data('size')),
          ...node.position(),
        }));
        return graphToSvg(placed, edgesRef.current, theme);
      },
    }),
    [theme],
  );

  // Create the instance once.
  useEffect(() => {
    let cancelled = false;
    let cy: Core | null = null;
    import('cytoscape')
      .then(({ default: cytoscape }) => {
        if (cancelled || !containerRef.current) return;
        cy = cytoscape({
          container: containerRef.current,
          minZoom: 0.05,
          maxZoom: 4,
          wheelSensitivity: 0.3,
          boxSelectionEnabled: false,
        });
        cy.on('tap', 'node', (event) => onSelectRef.current?.(String(event.target.id())));
        cy.on('tap', (event) => {
          if (event.target === cy) onSelectRef.current?.(null);
        });
        cyRef.current = cy;
        setReady(true);
      })
      .catch((error: unknown) => {
        logger.error('Could not load the graph renderer', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      cyRef.current = null;
      cy?.destroy();
    };
  }, []);

  useEffect(() => {
    if (ready) cyRef.current?.style(buildStylesheet(theme));
  }, [ready, theme]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!ready || !cy) return;
    const large = nodes.length > LARGE_GRAPH_NODES;
    const drawn = drawnRef.current;
    // Same data, new layout: move the existing nodes smoothly instead of redrawing.
    const layoutOnly = drawn !== null && drawn.nodes === nodes && drawn.edges === edges;
    if (!layoutOnly) {
      cy.batch(() => {
        cy.elements().remove();
        cy.add(toElements(nodes, edges));
      });
      drawnRef.current = { nodes, edges };
    }
    // Skip expensive per-frame work while the user pans or zooms a big graph.
    const renderer = cy as unknown as {
      renderer?: () => { hideEdgesOnViewport?: boolean; textureOnViewport?: boolean };
    };
    const options = renderer.renderer?.();
    if (options) {
      options.hideEdgesOnViewport = large;
      options.textureOnViewport = large;
    }
    cy.layout(layoutOptions(layout, nodes.length, layoutOnly && !prefersReducedMotion())).run();
  }, [ready, nodes, edges, layout]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!ready || !cy) return;
    cy.nodes(':selected').unselect();
    if (selectedId) cy.getElementById(selectedId).select();
  }, [ready, selectedId, nodes]);

  if (failed) {
    return <Alert severity="error">The graph could not be displayed.</Alert>;
  }
  return (
    <Box sx={{ position: 'relative', width: '100%', height, minHeight: 320 }}>
      {!ready && (
        <Box
          role="status"
          sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
        >
          <CircularProgress aria-label="Loading graph" />
        </Box>
      )}
      <Box
        ref={containerRef}
        role="img"
        aria-label={ariaLabel}
        data-testid="graph-canvas"
        sx={{ position: 'absolute', inset: 0 }}
      />
    </Box>
  );
});
