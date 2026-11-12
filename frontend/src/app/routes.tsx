import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface AppRoute {
  /** Navigation id, also used by the app shell to mark the current item. */
  id: string;
  path: string;
  title: string;
  component: LazyExoticComponent<ComponentType>;
}

/** Each page is its own chunk; the graph library loads only when a graph is shown. */
export const ROUTES: readonly AppRoute[] = [
  {
    id: 'home',
    path: '/',
    title: 'Home',
    component: lazy(() => import('@features/analysis/HomePage')),
  },
  {
    id: 'mindmap',
    path: '/map',
    title: 'Mind map',
    component: lazy(() => import('@features/visualization/MindMapPage')),
  },
  {
    id: 'architecture',
    path: '/architecture',
    title: 'Architecture',
    component: lazy(() => import('@features/visualization/ArchitecturePage')),
  },
  {
    id: 'code-explorer',
    path: '/explore',
    title: 'Code explorer',
    component: lazy(() => import('@features/exploration/ExplorePage')),
  },
  {
    id: 'search',
    path: '/search',
    title: 'Search',
    component: lazy(() => import('@features/search/SearchPage')),
  },
  {
    id: 'issues',
    path: '/issues',
    title: 'Findings',
    component: lazy(() => import('@features/issues/IssuesPage')),
  },
];

export function routeForPath(pathname: string): AppRoute | undefined {
  return ROUTES.find((route) => route.path === pathname);
}

export function pathForId(id: string): string | undefined {
  return ROUTES.find((route) => route.id === id)?.path;
}
