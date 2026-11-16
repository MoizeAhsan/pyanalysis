import { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { createTheme } from '@mui/material/styles';
import fc from 'fast-check';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { fakeInstances, lastGraph } from '@/test/fakeCytoscape';
import { MODULE_GRAPH, TREE } from '@/test/fixtures';
import { renderApp } from '@/test/render';
import { api, server, withAnalysis } from '@/test/server';
import type { TreeNode } from '@shared/api/types';
import ArchitecturePage, { shortLabel, toCanvas } from './ArchitecturePage';
import {
  GraphCanvas,
  LARGE_GRAPH_NODES,
  buildStylesheet,
  graphToSvg,
  layoutOptions,
  toElements,
} from './GraphCanvas';
import MindMapPage, { ROOT_ID, buildMindMap } from './MindMapPage';

const nodeIds = () =>
  (fakeInstances.at(-1)?.elementsData ?? [])
    .filter((element) => element.group === 'nodes')
    .map((element) => String(element.data.id));

describe('toElements', () => {
  it('drops edges whose endpoints are not drawn', () => {
    const elements = toElements(
      [
        { id: 'a', label: 'a', type: 'module' },
        { id: 'b', label: 'b', type: 'module' },
      ],
      [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'missing' },
      ],
    );
    expect(elements.filter((element) => element.group === 'edges')).toHaveLength(1);
  });

  it('gives parallel edges of different kinds distinct ids', () => {
    const elements = toElements(
      [
        { id: 'a', label: 'a', type: 'class' },
        { id: 'b', label: 'b', type: 'class' },
      ],
      [
        { source: 'a', target: 'b', kind: 'inherits' },
        { source: 'a', target: 'b', kind: 'uses' },
      ],
    );
    const ids = elements.map((element) => element.data.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sizes nodes by weight within fixed bounds', () => {
    const elements = toElements(
      [
        { id: 'small', label: 's', type: 'module', weight: 0 },
        { id: 'big', label: 'b', type: 'module', weight: 100 },
      ],
      [],
    );
    expect(elements.map((element) => element.data.size)).toEqual([18, 48]);
  });
});

describe('layoutOptions', () => {
  it('animates only when asked, never on large graphs, and iterates less on them', () => {
    const small = layoutOptions('cose', 10) as { animate: boolean; numIter: number };
    const large = layoutOptions('cose', LARGE_GRAPH_NODES + 1, true) as {
      animate: boolean;
      numIter: number;
    };
    expect(small.animate).toBe(false);
    expect((layoutOptions('cose', 10, true) as { animate: boolean }).animate).toBe(true);
    expect(large.animate).toBe(false);
    expect(large.numIter).toBeLessThan(small.numIter);
  });

  it.each(['breadthfirst', 'concentric', 'circle', 'grid'] as const)('supports %s', (name) => {
    expect(layoutOptions(name, 5).name).toBe(name);
  });
});

describe('graphToSvg', () => {
  const theme = createTheme();
  const placed = [
    { id: 'module:a.py', label: 'a <main>', type: 'module', x: 0, y: 0, size: 20 },
    { id: 'class:a.py:C', label: 'C', type: 'class', x: 100, y: 50, size: 30 },
    { id: 'pkg', label: 'pkg', type: 'package', x: -50, y: 80, size: 24 },
  ];

  it('draws every node with its shape and colour, and escapes labels', () => {
    const svg = graphToSvg(
      placed,
      [
        { source: 'module:a.py', target: 'class:a.py:C', kind: 'uses_type' },
        { source: 'pkg', target: 'missing' },
      ],
      theme,
    );
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('circle')).toHaveLength(1);
    expect(doc.querySelectorAll('polygon')).toHaveLength(1);
    expect(doc.querySelectorAll('rect[rx]')).toHaveLength(1);
    expect(doc.querySelectorAll('line')).toHaveLength(1); // edge to an absent node is dropped
    expect(doc.querySelector('line')?.getAttribute('stroke-dasharray')).toBe('6 4');
    expect(svg).toContain('a &#60;main&#62;');
    expect(doc.querySelector('circle')?.getAttribute('fill')).toBe(theme.palette.primary.main);
  });
});

describe('buildStylesheet', () => {
  it('styles every element type in both themes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const selectors = buildStylesheet(createTheme({ palette: { mode } })).map(
        (rule) => rule.selector,
      );
      for (const type of ['directory', 'package', 'module', 'class', 'function']) {
        expect(selectors).toContain(`node[type = "${type}"]`);
      }
    }
  });
});

describe('GraphCanvas', () => {
  const nodes = [
    { id: 'a', label: 'a', type: 'module' },
    { id: 'b', label: 'b', type: 'module' },
  ];

  it('draws the graph, reports selection, and cleans up', async () => {
    const selections: (string | null)[] = [];
    const view = renderApp(
      <GraphCanvas
        nodes={nodes}
        edges={[{ source: 'a', target: 'b' }]}
        layout="grid"
        selectedId="b"
        onSelect={(id) => selections.push(id)}
        ariaLabel="Test graph"
      />,
    );
    await waitFor(() => expect(nodeIds()).toEqual(['a', 'b']));
    const graph = lastGraph();
    expect(screen.getByRole('img', { name: 'Test graph' })).toBeInTheDocument();
    expect(graph.layouts.at(-1)?.name).toBe('grid');
    expect(graph.selected).toBe('b');

    graph.tapNode('a');
    graph.tapBackground();
    expect(selections).toEqual(['a', null]);

    view.unmount();
    expect(graph.destroyed).toBe(true);
  });

  it('animates a layout change on the same data instead of redrawing it', async () => {
    const edges: { source: string; target: string }[] = [];
    function Harness() {
      const [layout, setLayout] = useState<'grid' | 'circle'>('grid');
      return (
        <>
          <button onClick={() => setLayout('circle')}>relayout</button>
          <GraphCanvas nodes={nodes} edges={edges} layout={layout} ariaLabel="g" />
        </>
      );
    }
    const { user } = renderApp(<Harness />);
    await waitFor(() => expect(lastGraph().layouts.at(-1)?.name).toBe('grid'));
    expect(lastGraph().layouts.at(-1)?.animate).toBe(false);
    await user.click(screen.getByRole('button', { name: 'relayout' }));
    await waitFor(() => expect(lastGraph().layouts.at(-1)?.name).toBe('circle'));
    expect(lastGraph().layouts.at(-1)?.animate).toBe(true);
    expect(nodeIds()).toEqual(['a', 'b']);
  });

  it('updates the existing graph when data changes instead of creating another', async () => {
    function Harness() {
      const [count, setCount] = useState(2);
      return (
        <>
          <button onClick={() => setCount(1)}>shrink</button>
          <GraphCanvas nodes={nodes.slice(0, count)} edges={[]} layout="grid" ariaLabel="g" />
        </>
      );
    }
    const { user } = renderApp(<Harness />);
    await waitFor(() => expect(nodeIds()).toEqual(['a', 'b']));
    await user.click(screen.getByRole('button', { name: 'shrink' }));
    await waitFor(() => expect(nodeIds()).toEqual(['a']));
    expect(fakeInstances).toHaveLength(1);
  });
});

describe('buildMindMap', () => {
  const children = new Map<string, readonly TreeNode[]>(Object.entries(TREE));

  it('shows only the children of expanded nodes', () => {
    const collapsed = buildMindMap('shop', [ROOT_ID], children);
    expect(collapsed.nodes.map((node) => node.id)).toEqual([
      ROOT_ID,
      'dir:shop',
      'module:setup.py',
    ]);
    expect(collapsed.nodes.find((node) => node.id === 'dir:shop')?.expandable).toBe(true);
    expect(collapsed.nodes.find((node) => node.id === 'module:setup.py')?.expandable).toBe(false);

    const open = buildMindMap('shop', [ROOT_ID, 'dir:shop'], children);
    expect(open.nodes).toHaveLength(5);
    expect(open.nodes.find((node) => node.id === 'dir:shop')?.expandable).toBe(false);
    expect(open.edges).toContainEqual({
      source: 'dir:shop',
      target: 'module:shop/orders.py',
      kind: 'contains',
    });
  });

  it('ignores an expanded node whose parent is collapsed', () => {
    const map = buildMindMap('shop', [ROOT_ID, 'module:shop/orders.py'], children);
    expect(map.nodes).toHaveLength(3);
  });

  it('always yields a tree: unique nodes, and every edge joins two of them', () => {
    const ids = Object.keys(TREE);
    fc.assert(
      fc.property(fc.subarray(ids), (expanded) => {
        const map = buildMindMap('p', [ROOT_ID, ...expanded], children);
        const drawn = map.nodes.map((node) => node.id);
        expect(new Set(drawn).size).toBe(drawn.length);
        expect(map.edges).toHaveLength(drawn.length - 1);
        for (const edge of map.edges) {
          expect(drawn).toContain(edge.source);
          expect(drawn).toContain(edge.target);
        }
      }),
    );
  });
});

describe('MindMapPage', () => {
  it('loads children only when a node is expanded', async () => {
    withAnalysis();
    renderApp(<MindMapPage />, { route: '/map' });
    await waitFor(() => expect(nodeIds()).toEqual([ROOT_ID, 'dir:shop', 'module:setup.py']));
    expect(api.requests.filter((entry) => entry.startsWith('GET /api/tree'))).toEqual([
      'GET /api/tree?parent=dir:',
    ]);
    expect(screen.getByText('3 nodes shown')).toBeInTheDocument();

    lastGraph().tapNode('dir:shop');
    await waitFor(() => expect(nodeIds()).toHaveLength(5));
    expect(api.requests).toContain('GET /api/tree?parent=dir:shop');
    const panel = screen.getByRole('complementary', { name: 'Selected node' });
    expect(within(panel).getByRole('heading', { name: 'shop' })).toBeInTheDocument();

    lastGraph().tapNode('dir:shop');
    await waitFor(() => expect(nodeIds()).toHaveLength(3));
  });

  it('links a selected element to the explorer', async () => {
    withAnalysis();
    renderApp(<MindMapPage />, { route: '/map' });
    await waitFor(() => expect(nodeIds()).toContain('module:setup.py'));
    lastGraph().tapNode('module:setup.py');
    expect(await screen.findByRole('link', { name: 'Open in explorer' })).toHaveAttribute(
      'href',
      '/explore?id=module%3Asetup.py',
    );
  });

  it('asks for an analysis when there is none', async () => {
    renderApp(<MindMapPage />, { route: '/map' });
    expect(await screen.findByText('No project has been analyzed yet')).toBeInTheDocument();
  });
});

describe('ArchitecturePage', () => {
  it('shortens long dotted names for labels', () => {
    expect(shortLabel('a.b.c.d')).toBe('c.d');
    expect(shortLabel('a.b')).toBe('a.b');
    expect(toCanvas(MODULE_GRAPH).nodes[0]).toMatchObject({ label: 'shop.api', weight: 2 });
  });

  it('draws the module graph and shows cycles and patterns from the server', async () => {
    withAnalysis();
    renderApp(<ArchitecturePage />, { route: '/architecture' });
    await waitFor(() => expect(nodeIds()).toHaveLength(3));
    expect(
      screen.getByRole('img', { name: 'module dependency graph with 3 nodes and 3 edges' }),
    ).toBeInTheDocument();

    const cycles = screen.getByRole('region', { name: 'Import cycles' });
    expect(await within(cycles).findByText('shop.a, shop.b')).toBeInTheDocument();
    const patterns = screen.getByRole('region', { name: 'Detected patterns' });
    expect(
      await within(patterns).findByText('Factory (OrderFactory) (60% confidence)'),
    ).toBeInTheDocument();
  });

  it('requests another abstraction level and records it in the URL', async () => {
    withAnalysis();
    const { user } = renderApp(<ArchitecturePage />, { route: '/architecture' });
    await waitFor(() => expect(nodeIds()).toHaveLength(3));
    await user.click(screen.getByRole('button', { name: 'Classes' }));

    await waitFor(() => expect(api.requests).toContain('GET /api/graph?level=class&max_nodes=300'));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/architecture?level=class'),
    );
  });

  it('restores its state from the URL', async () => {
    withAnalysis();
    renderApp(<ArchitecturePage />, {
      route: '/architecture?level=package&package_depth=2&max_nodes=100&layout=grid',
    });
    await waitFor(() =>
      expect(api.requests).toContain('GET /api/graph?level=package&max_nodes=100&package_depth=2'),
    );
    await waitFor(() => expect(lastGraph().layouts.at(-1)?.name).toBe('grid'));
  });

  it('says so when the graph was cut down, instead of silently dropping nodes', async () => {
    withAnalysis();
    server.use(
      http.get('*/api/graph', () =>
        HttpResponse.json({ ...MODULE_GRAPH, truncated: true, total_nodes: 4200 }),
      ),
    );
    renderApp(<ArchitecturePage />, { route: '/architecture' });
    expect(
      await screen.findByText(/Showing the 3 best-connected of 4,200 modules/),
    ).toBeInTheDocument();
  });

  it('focuses on a selected node', async () => {
    withAnalysis();
    const { user } = renderApp(<ArchitecturePage />, { route: '/architecture' });
    await waitFor(() => expect(nodeIds()).toHaveLength(3));
    lastGraph().tapNode('module:shop/orders.py');
    await user.click(await screen.findByRole('button', { name: 'Focus on this' }));

    await waitFor(() =>
      expect(api.requests).toContain(
        'GET /api/graph?level=module&max_nodes=300&focus=module:shop/orders.py&depth=1',
      ),
    );
    expect(await screen.findByText('Focused on shop.orders')).toBeInTheDocument();
  });
});
