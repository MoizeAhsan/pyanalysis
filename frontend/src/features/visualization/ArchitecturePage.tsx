import { useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useCycles, useGraph, usePatterns } from '@shared/api/queries';
import type { Graph, GraphLevel, GraphNode } from '@shared/api/types';
import { ElementTypeChip } from '@shared/components/ElementTypeChip';
import { QueryState } from '@shared/components/QueryState';
import { intInRange, oneOf, useUrlState } from '@shared/hooks/useUrlState';
import { elementLink, formatCount, plural } from '@shared/lib/format';
import {
  GraphCanvas,
  type CanvasEdge,
  type CanvasLayout,
  type CanvasNode,
  type GraphCanvasHandle,
} from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';

const LEVELS: readonly GraphLevel[] = ['package', 'module', 'class'];
const LAYOUTS: readonly CanvasLayout[] = ['cose', 'breadthfirst', 'concentric', 'circle', 'grid'];
const LAYOUT_LABELS: Record<CanvasLayout, string> = {
  cose: 'Force-directed',
  breadthfirst: 'Layered',
  concentric: 'Concentric',
  circle: 'Circle',
  grid: 'Grid',
};
const NODE_LIMITS = [100, 300, 600, 1000] as const;

/** Last two parts of a dotted name: enough to recognise a node without crowding the graph. */
export function shortLabel(name: string): string {
  const parts = name.split('.');
  return parts.length <= 2 ? name : parts.slice(-2).join('.');
}

export function toCanvas(graph: Graph): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: shortLabel(node.name),
      type: node.type,
      weight: node.in_degree + node.out_degree,
    })),
    edges: graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      kind: edge.relationship_type,
    })),
  };
}

function CyclesPanel({ onFocus }: { onFocus: (id: string) => void }) {
  const cycles = useCycles();
  return (
    <QueryState isPending={cycles.isPending} error={cycles.error} loadingLabel="Loading cycles">
      {cycles.data && cycles.data.total === 0 && (
        <Typography variant="body2" color="text.secondary">
          No import cycles were found.
        </Typography>
      )}
      <List dense disablePadding>
        {cycles.data?.items.map((cycle) => {
          const first = cycle.modules[0];
          if (!first) return null;
          return (
            <ListItem key={first.id} disableGutters alignItems="flex-start">
              <ListItemText
                primary={plural(cycle.modules.length, 'module')}
                secondary={
                  cycle.modules
                    .slice(0, 4)
                    .map((module) => module.qualified_name)
                    .join(', ') + (cycle.modules.length > 4 ? ', …' : '')
                }
              />
              <Button size="small" onClick={() => onFocus(first.id)}>
                Show
              </Button>
            </ListItem>
          );
        })}
      </List>
    </QueryState>
  );
}

function PatternsPanel() {
  const patterns = usePatterns();
  return (
    <QueryState
      isPending={patterns.isPending}
      error={patterns.error}
      loadingLabel="Loading patterns"
    >
      {patterns.data?.items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No design patterns were detected.
        </Typography>
      )}
      <List dense disablePadding>
        {patterns.data?.items.map((pattern) => {
          const first = pattern.elements[0];
          return (
            <ListItem key={`${pattern.name}:${first?.id ?? ''}`} disableGutters>
              <ListItemText
                primary={`${pattern.name} (${Math.round(pattern.confidence * 100)}% confidence)`}
                secondary={pattern.description}
              />
              {first && (
                <Button size="small" component={RouterLink} to={elementLink(first.id)}>
                  Open
                </Button>
              )}
            </ListItem>
          );
        })}
      </List>
    </QueryState>
  );
}

function NodePanel({
  node,
  level,
  onFocus,
}: {
  node: GraphNode;
  level: GraphLevel;
  onFocus: () => void;
}) {
  return (
    <Stack spacing={1} alignItems="flex-start">
      <ElementTypeChip type={node.type} />
      <Typography variant="h6" component="h3" sx={{ wordBreak: 'break-word' }}>
        {node.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
        {node.file_path}
      </Typography>
      <Typography variant="body2">
        Used by {formatCount(node.in_degree)}, uses {formatCount(node.out_degree)}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small" onClick={onFocus}>
          Focus on this
        </Button>
        {level !== 'package' && (
          <Button size="small" component={RouterLink} to={elementLink(node.id)}>
            Open in explorer
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export default function ArchitecturePage() {
  const [params, setParams] = useUrlState();
  const level = oneOf(params.get('level'), LEVELS, 'module');
  const layout = oneOf(params.get('layout'), LAYOUTS, 'cose');
  const packageDepth = intInRange(params.get('package_depth'), 1, 6, 1);
  const depth = intInRange(params.get('depth'), 1, 5, 1);
  const maxNodes = intInRange(params.get('max_nodes'), 1, 2000, 300);
  const focus = params.get('focus') ?? undefined;
  const selectedId = params.get('selected');
  const canvas = useRef<GraphCanvasHandle>(null);
  const graphFrame = useRef<HTMLDivElement>(null);

  const graph = useGraph({
    level,
    max_nodes: maxNodes,
    focus,
    depth: focus ? depth : undefined,
    package_depth: level === 'package' ? packageDepth : undefined,
  });
  const drawable = useMemo(() => (graph.data ? toCanvas(graph.data) : null), [graph.data]);
  const selected = graph.data?.nodes.find((node) => node.id === selectedId);
  const focusNode = graph.data?.nodes.find((node) => node.id === focus);

  const focusOn = (id: string) => setParams({ focus: id, selected: id }, { replace: false });

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h4" component="h2">
          Architecture
        </Typography>
        <Typography color="text.secondary">
          How packages, modules, and classes depend on each other.
        </Typography>
      </div>

      <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={level}
          aria-label="Abstraction level"
          onChange={(_, next: GraphLevel | null) => {
            if (next) setParams({ level: next, focus: null, selected: null });
          }}
        >
          <ToggleButton value="package">Packages</ToggleButton>
          <ToggleButton value="module">Modules</ToggleButton>
          <ToggleButton value="class">Classes</ToggleButton>
        </ToggleButtonGroup>
        {level === 'package' && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="arch-package-depth">Directory depth</InputLabel>
            <Select
              labelId="arch-package-depth"
              label="Directory depth"
              value={String(packageDepth)}
              onChange={(event) =>
                setParams({ package_depth: event.target.value, focus: null, selected: null })
              }
            >
              {[1, 2, 3, 4].map((value) => (
                <MenuItem key={value} value={String(value)}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="arch-layout">Layout</InputLabel>
          <Select
            labelId="arch-layout"
            label="Layout"
            value={layout}
            onChange={(event) => setParams({ layout: event.target.value })}
          >
            {LAYOUTS.map((value) => (
              <MenuItem key={value} value={value}>
                {LAYOUT_LABELS[value]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="arch-max-nodes">Node limit</InputLabel>
          <Select
            labelId="arch-max-nodes"
            label="Node limit"
            value={String(maxNodes)}
            onChange={(event) => setParams({ max_nodes: event.target.value })}
          >
            {[...new Set([...NODE_LIMITS, maxNodes])]
              .sort((a, b) => a - b)
              .map((value) => (
                <MenuItem key={value} value={String(value)}>
                  {value}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        {focus && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="arch-depth">Hops</InputLabel>
            <Select
              labelId="arch-depth"
              label="Hops"
              value={String(depth)}
              onChange={(event) => setParams({ depth: event.target.value })}
            >
              {[1, 2, 3].map((value) => (
                <MenuItem key={value} value={String(value)}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <GraphToolbar
          canvas={canvas}
          exportName={`architecture-${level}`}
          fullscreenTarget={graphFrame}
        />
      </Stack>

      {focus && (
        <Chip
          color="primary"
          label={`Focused on ${focusNode?.name ?? focus}`}
          onDelete={() => setParams({ focus: null })}
          sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
        />
      )}

      <QueryState
        isPending={graph.isPending}
        error={graph.error}
        onRetry={() => void graph.refetch()}
        loadingLabel="Loading graph"
      >
        {graph.data && drawable && (
          <>
            {graph.data.truncated && (
              <Alert severity="info">
                Showing the {formatCount(graph.data.nodes.length)} best-connected of{' '}
                {formatCount(graph.data.total_nodes)} {level === 'class' ? 'classes' : `${level}s`}.
                Raise the node limit, or select a node and focus on it to see its neighbourhood.
              </Alert>
            )}
            {graph.data.nodes.length === 0 && (
              <Alert severity="info">
                Nothing at this level depends on anything else in the project.
              </Alert>
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Paper
                ref={graphFrame}
                variant="outlined"
                sx={{
                  flexGrow: 1,
                  height: 560,
                  overflow: 'hidden',
                  '&:fullscreen': { bgcolor: 'background.paper', borderRadius: 0 },
                }}
              >
                <GraphCanvas
                  ref={canvas}
                  nodes={drawable.nodes}
                  edges={drawable.edges}
                  layout={layout}
                  selectedId={selectedId}
                  onSelect={(id) => setParams({ selected: id })}
                  ariaLabel={`${level} dependency graph with ${graph.data.nodes.length} nodes and ${graph.data.edges.length} edges`}
                />
              </Paper>
              <Stack spacing={2} sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
                <Paper
                  variant="outlined"
                  component="aside"
                  aria-label="Selected node"
                  sx={{ p: 2 }}
                >
                  {selected ? (
                    <NodePanel node={selected} level={level} onFocus={() => focusOn(selected.id)} />
                  ) : (
                    <Typography color="text.secondary">
                      Select a node to see what it depends on.
                    </Typography>
                  )}
                </Paper>
                <Paper
                  variant="outlined"
                  component="section"
                  aria-labelledby="arch-cycles"
                  sx={{ p: 2 }}
                >
                  <Typography id="arch-cycles" variant="subtitle1" component="h3" gutterBottom>
                    Import cycles
                  </Typography>
                  <CyclesPanel
                    onFocus={(id) =>
                      setParams({ level: 'module', focus: id, selected: id }, { replace: false })
                    }
                  />
                </Paper>
                <Paper
                  variant="outlined"
                  component="section"
                  aria-labelledby="arch-patterns"
                  sx={{ p: 2 }}
                >
                  <Typography id="arch-patterns" variant="subtitle1" component="h3" gutterBottom>
                    Detected patterns
                  </Typography>
                  <PatternsPanel />
                </Paper>
              </Stack>
            </Stack>
          </>
        )}
      </QueryState>
    </Stack>
  );
}
