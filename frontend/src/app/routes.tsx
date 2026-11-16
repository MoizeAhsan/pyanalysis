import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type PageModule = { default: ComponentType };

export interface AppRoute {
  /** Navigation id, also used by the app shell to mark the current item. */
  id: string;
  path: string;
  title: string;
  /** Fetches the page's chunk; safe to call repeatedly. */
  load: () => Promise<PageModule>;
  component: LazyExoticComponent<ComponentType>;
}

function page(id: string, path: string, title: string, load: () => Promise<PageModule>): AppRoute {
  return { id, path, title, load, component: lazy(load) };
}

/** Each page is its own chunk; the graph library loads only when a graph is shown. */
export const ROUTES: readonly AppRoute[] = [
  page('home', '/', 'Home', () => import('@features/analysis/HomePage')),
  page('mindmap', '/map', 'Mind map', () => import('@features/visualization/MindMapPage')),
  page(
    'architecture',
    '/architecture',
    'Architecture',
    () => import('@features/visualization/ArchitecturePage'),
  ),
  page(
    'code-explorer',
    '/explore',
    'Code explorer',
    () => import('@features/exploration/ExplorePage'),
  ),
  page('search', '/search', 'Search', () => import('@features/search/SearchPage')),
  page('issues', '/issues', 'Findings', () => import('@features/issues/IssuesPage')),
];

export function routeForPath(pathname: string): AppRoute | undefined {
  return ROUTES.find((route) => route.path === pathname);
}

export function pathForId(id: string): string | undefined {
  return ROUTES.find((route) => route.id === id)?.path;
}

/**
 * Start downloading the page for ``pathname`` without waiting for React to
 * render. Called before the first render, so the page chunk arrives while the
 * app shell is being drawn instead of after it.
 */
export function preloadRoute(pathname: string): void {
  void routeForPath(pathname)
    ?.load()
    .catch(() => undefined); // a failed preload is retried, and reported, by React.lazy
}
