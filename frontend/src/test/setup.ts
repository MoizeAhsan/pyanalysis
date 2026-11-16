import '@testing-library/jest-dom/vitest';
import { transferableAbortController } from 'node:util';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { fakeInstances } from './fakeCytoscape';
import { resetApiState, server } from './server';

// jsdom replaces AbortController with its own, which Node's fetch rejects
// ("Expected signal to be an instance of AbortSignal"). Browsers have one
// implementation, so restore Node's for the tests.
const nativeController = transferableAbortController();
globalThis.AbortController = nativeController.constructor as typeof AbortController;
globalThis.AbortSignal = nativeController.signal.constructor as typeof AbortSignal;

// Status is polled every 400 ms, so a multi-step analysis outlasts the 1 s default.
configure({ asyncUtilTimeout: 5000 });

// jsdom does not implement these browser APIs.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub;

// Rows are positioned by measured size; give every element one so lists render.
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 600 },
  offsetWidth: { configurable: true, get: () => 800 },
});
HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  };
};
window.scrollTo = () => undefined;
Element.prototype.scrollTo = () => undefined;

// Cytoscape needs a real canvas. Tests assert on what the app hands to it.
vi.mock('cytoscape', async () => {
  const { fakeCytoscape } = await import('./fakeCytoscape');
  return { default: fakeCytoscape };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetApiState();
  fakeInstances.length = 0;
  window.localStorage.clear();
});
afterAll(() => server.close());
