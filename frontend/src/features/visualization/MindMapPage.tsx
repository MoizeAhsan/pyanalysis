import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { treeQuery, useSummary } from '@shared/api/queries';
import type { TreeNode } from '@shared/api/types';
import { ElementTypeChip } from '@shared/components/ElementTypeChip';
import { QueryState } from '@shared/components/QueryState';
import { elementLink, plural } from '@shared/lib/format';
import {
  GraphCanvas,
  type CanvasEdge,
  type CanvasLayout,
  type CanvasNode,
  type GraphCanvasHandle,
} from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';

export const ROOT_ID = 'dir:';
/** Expanding further than this would make the map unreadable and slow. */
const MAX_VISIBLE_NODES = 600;

interface MindMap {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  byId: Map<string, TreeNode>;
}

/** Combine the loaded children of every expanded node into one drawable tree. */
export function buildMindMap(
  rootLabel: string,
  expanded: readonly string[],
  childrenOf: ReadonlyMap<string, readonly TreeNode[]>,
): MindMap {
  const open = new Set(expanded);
  const byId = new Map<string, TreeNode>();
  const nodes: CanvasNode[] = [
    { id: ROOT_ID, label: rootLabel, type: 'directory', weight: 1, expandable: !open.has(ROOT_ID) },
  ];
  const edges: CanvasEdge[] = [];
  const pending = [ROOT_ID];
  while (pending.length > 0) {
    const parent = pending.pop();
    if (parent === undefined || !open.has(parent)) continue;
    for (const child of childrenOf.get(parent) ?? []) {
      if (byId.has(child.id)) continue;
      byId.set(child.id, child);
      nodes.push({
        id: child.id,
        label: child.name,
        type: child.type,
        weight: child.child_count,
        expandable: child.child_count > 0 && !open.has(child.id),
      });
      edges.push({ source: parent, target: child.id, kind: 'contains' });
      pending.push(child.id);
    }
  }
  return { nodes, edges, byId };
}

export default function MindMapPage() {
  const summary = useSummary();
  const [expanded, setExpanded] = useState<string[]>([ROOT_ID]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layout, setLayout] = useState<CanvasLayout>('breadthfirst');
  const canvas = useRef<GraphCanvasHandle>(null);
  const graphFrame = useRef<HTMLDivElement>(null);

  // One cached request per expanded node: collapsing and re-expanding is instant.
  const results = useQueries({ queries: expanded.map((id) => treeQuery(id)) });
  const loadedKey = results.map((result) => result.dataUpdatedAt).join(',');
  const map = useMemo(() => {
    const childrenOf = new Map<string, readonly TreeNode[]>();
    results.forEach((result, index) => {
      const parent = expanded[index];
      if (parent !== undefined && result.data) childrenOf.set(parent, result.data.children);
    });
    return buildMindMap(summary.data?.name ?? 'Project', expanded, childrenOf);
    // `results` is a new array every render; its content is captured by loadedKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, loadedKey, summary.data?.name]);

  const atLimit = map.nodes.length >= MAX_VISIBLE_NODES;
  const selected = selectedId ? map.byId.get(selectedId) : undefined;

  const toggle = useCallback(
    (id: string) => {
      setExpanded((current) => {
        if (current.includes(id)) return id === ROOT_ID ? current : current.filter((x) => x !== id);
        return atLimit ? current : [...current, id];
      });
    },
    [atLimit],
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id === null) return;
      const node = map.byId.get(id);
      if (id === ROOT_ID || (node && node.child_count > 0)) toggle(id);
    },
    [map, toggle],
  );

  const firstError = results.find((result) => result.error)?.error ?? summary.error;
  const loading = results[0]?.isPending ?? true;

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <div>
        <Typography variant="h4" component="h2">
          Mind map
        </Typography>
        <Typography color="text.secondary">
          Click a node with a double border to expand it; click it again to collapse.
        </Typography>
      </div>
      <QueryState
        isPending={loading}
        error={firstError ?? null}
        loadingLabel="Loading project tree"
      >
        <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="mindmap-layout-label">Layout</InputLabel>
            <Select
              labelId="mindmap-layout-label"
              label="Layout"
              value={layout}
              onChange={(event) => setLayout(event.target.value as CanvasLayout)}
            >
              <MenuItem value="breadthfirst">Tree</MenuItem>
              <MenuItem value="concentric">Radial</MenuItem>
              <MenuItem value="cose">Force-directed</MenuItem>
            </Select>
          </FormControl>
          <Button onClick={() => setExpanded([ROOT_ID])} disabled={expanded.length <= 1}>
            Collapse all
          </Button>
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {plural(map.nodes.length, 'node')} shown
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <GraphToolbar canvas={canvas} exportName="mind-map" fullscreenTarget={graphFrame} />
        </Stack>
        {atLimit && (
          <Alert severity="info">
            The map is showing its maximum of {MAX_VISIBLE_NODES} nodes. Collapse a branch before
            expanding another.
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ flexGrow: 1, minHeight: 0 }}
        >
          <Paper
            ref={graphFrame}
            variant="outlined"
            sx={{
              flexGrow: 1,
              minHeight: 480,
              overflow: 'hidden',
              '&:fullscreen': { bgcolor: 'background.paper', borderRadius: 0 },
            }}
          >
            <GraphCanvas
              ref={canvas}
              nodes={map.nodes}
              edges={map.edges}
              layout={layout}
              selectedId={selectedId}
              onSelect={handleSelect}
              ariaLabel={`Mind map of the project with ${map.nodes.length} nodes shown`}
            />
          </Paper>
          <Paper
            variant="outlined"
            component="aside"
            aria-label="Selected node"
            sx={{ p: 2, width: { xs: '100%', md: 300 }, flexShrink: 0 }}
          >
            {selected ? (
              <Stack spacing={1} alignItems="flex-start">
                <ElementTypeChip type={selected.type} />
                <Typography variant="h6" component="h3" sx={{ wordBreak: 'break-word' }}>
                  {selected.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {selected.file_path}
                  {selected.line > 0 && `:${selected.line}`}
                </Typography>
                <Typography variant="body2">
                  {plural(selected.child_count, 'child', 'children')}
                  {selected.type !== 'directory' &&
                    `, ${plural(selected.usage_count, 'reference')}`}
                </Typography>
                {selected.type !== 'directory' && (
                  <Button component={RouterLink} to={elementLink(selected.id)} variant="outlined">
                    Open in explorer
                  </Button>
                )}
              </Stack>
            ) : (
              <Typography color="text.secondary">Select a node to see its details.</Typography>
            )}
          </Paper>
        </Stack>
      </QueryState>
    </Stack>
  );
}
