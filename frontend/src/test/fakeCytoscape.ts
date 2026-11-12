/** A stand-in for Cytoscape that records the graphs the app asks it to draw. */
import { vi } from 'vitest';

interface FakeElement {
  group?: string;
  data: Record<string, unknown>;
}

type Handler = (event: { target: unknown }) => void;

export interface FakeCore {
  elementsData: FakeElement[];
  layouts: Record<string, unknown>[];
  selected: string | null;
  destroyed: boolean;
  tapNode: (id: string) => void;
  tapBackground: () => void;
}

export const fakeInstances: FakeCore[] = [];

export function lastGraph(): FakeCore {
  const instance = fakeInstances[fakeInstances.length - 1];
  if (!instance) throw new Error('No graph has been created');
  return instance;
}

export const fakeCytoscape = vi.fn(() => {
  const handlers: { selector: string | null; handler: Handler }[] = [];
  const state: FakeCore = {
    elementsData: [],
    layouts: [],
    selected: null,
    destroyed: false,
    tapNode: (id) => {
      for (const entry of handlers) {
        if (entry.selector === 'node') entry.handler({ target: { id: () => id } });
      }
    },
    tapBackground: () => {
      for (const entry of handlers) {
        if (entry.selector === null) entry.handler({ target: core });
      }
    },
  };
  const core = {
    on: (_event: string, selectorOrHandler: string | Handler, maybeHandler?: Handler) => {
      if (typeof selectorOrHandler === 'string' && maybeHandler) {
        handlers.push({ selector: selectorOrHandler, handler: maybeHandler });
      } else if (typeof selectorOrHandler === 'function') {
        handlers.push({ selector: null, handler: selectorOrHandler });
      }
    },
    style: vi.fn(),
    batch: (run: () => void) => run(),
    elements: () => ({
      remove: () => {
        state.elementsData = [];
      },
    }),
    add: (elements: FakeElement[]) => {
      state.elementsData.push(...elements);
    },
    layout: (options: Record<string, unknown>) => {
      state.layouts.push(options);
      return { run: () => undefined };
    },
    nodes: () => ({
      unselect: () => {
        state.selected = null;
      },
    }),
    getElementById: (id: string) => ({
      select: () => {
        state.selected = id;
      },
    }),
    fit: vi.fn(),
    zoom: vi.fn(() => 1),
    width: () => 800,
    height: () => 600,
    png: vi.fn(() => 'data:image/png;base64,AAAA'),
    destroy: () => {
      state.destroyed = true;
    },
  };
  fakeInstances.push(state);
  return core;
});
