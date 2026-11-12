import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderApp } from '@/test/render';
import { api, withAnalysis } from '@/test/server';
import App from './App';
import { ROUTES, pathForId, routeForPath } from './routes';

describe('routes', () => {
  it('map ids and paths both ways', () => {
    for (const route of ROUTES) {
      expect(pathForId(route.id)).toBe(route.path);
      expect(routeForPath(route.path)?.id).toBe(route.id);
    }
    expect(pathForId('nope')).toBeUndefined();
    expect(routeForPath('/nope')).toBeUndefined();
  });
});

describe('App', () => {
  it('renders the start page with its landmarks', async () => {
    renderApp(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Visual Python Project Explorer' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Python Code Analyzer');
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(document.title).toBe('Python Code Analyzer');
  });

  it.each([
    ['/map', 'Mind map'],
    ['/architecture', 'Architecture'],
    ['/explore', 'Code explorer'],
    ['/search', 'Search'],
    ['/issues', 'Findings'],
  ])('opens %s directly from its URL', async (route, heading) => {
    withAnalysis();
    renderApp(<App />, { route });
    expect(await screen.findByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    expect(document.title).toBe(`${heading} · Python Code Analyzer`);
  });

  it('navigates from the sidebar', async () => {
    withAnalysis();
    const { user } = renderApp(<App />);
    await screen.findByRole('heading', { name: 'Visual Python Project Explorer' });
    await user.click(screen.getAllByText('Findings')[0] as HTMLElement);

    expect(await screen.findByRole('heading', { level: 2, name: 'Findings' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/issues');
  });

  it('handles unknown URLs', async () => {
    renderApp(<App />, { route: '/nowhere' });
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
  });

  it('refetches data when a new analysis completes', async () => {
    withAnalysis();
    const { user } = renderApp(<App />);
    await screen.findByRole('heading', { name: 'shop' });
    const before = api.requests.filter((entry) => entry === 'GET /api/summary').length;

    await user.type(screen.getByLabelText(/Project path/), '/work/shop');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    await screen.findByText('Analyzed 12 files');

    await waitFor(() =>
      expect(api.requests.filter((entry) => entry === 'GET /api/summary').length).toBeGreaterThan(
        before,
      ),
    );
  });
});

describe('accessibility', () => {
  it.each([
    '/',
    '/explore?id=class%3Ashop%2Forders.py%3AOrder',
    '/issues',
    '/search?q=order',
    '/architecture',
  ])('has no axe violations on %s', async (route) => {
    withAnalysis();
    const { container } = renderApp(<App />, { route });
    await screen.findByRole('heading', { level: 2 });
    await waitFor(() => expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument());

    const results = await axe(container);
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.html.slice(0, 160)),
      })),
    ).toEqual([]);
  });
});
