import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ELEMENTS } from '@/test/fixtures';
import { renderApp } from '@/test/render';
import { api, server, withAnalysis } from '@/test/server';
import SearchPage from './SearchPage';

const searches = () => api.requests.filter((entry) => entry.startsWith('GET /api/search'));

describe('SearchPage', () => {
  it('searches once typing pauses, not on every keystroke', async () => {
    withAnalysis();
    const { user } = renderApp(<SearchPage />, { route: '/search' });
    await user.type(screen.getByLabelText('Search the project'), 'order');

    expect(await screen.findByText('3 results for “order”')).toBeInTheDocument();
    expect(searches()).toEqual(['GET /api/search?q=order&offset=0&limit=50']);
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=order');
  });

  it('runs the query from the URL on load', async () => {
    withAnalysis();
    renderApp(<SearchPage />, { route: '/search?q=total&type=function&docs=1' });

    expect(await screen.findByText('1 result for “total”')).toBeInTheDocument();
    expect(screen.getByLabelText('Search the project')).toHaveValue('total');
    expect(searches()).toEqual([
      'GET /api/search?q=total&type=function&docstrings=true&offset=0&limit=50',
    ]);
  });

  it('sends the chosen filters to the server', async () => {
    withAnalysis();
    const { user } = renderApp(<SearchPage />, { route: '/search?q=order' });
    await screen.findByText('3 results for “order”');
    await user.click(screen.getByLabelText('Kind'));
    await user.click(screen.getByRole('option', { name: 'Classes' }));

    expect(await screen.findByText('1 result for “order”')).toBeInTheDocument();
    expect(searches().at(-1)).toBe('GET /api/search?q=order&type=class&offset=0&limit=50');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('3 results for “order”')).toBeInTheDocument();
  });

  it('never lets a slow earlier response replace a newer one', async () => {
    withAnalysis();
    server.use(
      http.get('*/api/search', async ({ request }) => {
        const query = new URL(request.url).searchParams.get('q') ?? '';
        if (query === 'ord') await delay(600);
        const items = ELEMENTS.filter((item) => item.name.includes(query)).map((item) => ({
          element: item,
          match_type: 'name',
          match_text: item.name,
        }));
        return HttpResponse.json({
          query,
          items,
          total: items.length,
          offset: 0,
          limit: 50,
          next_offset: null,
        });
      }),
    );
    const { user } = renderApp(<SearchPage />, { route: '/search' });
    const input = screen.getByLabelText('Search the project');
    await user.type(input, 'ord');
    await waitFor(() => expect(searches()).toHaveLength(1));
    await user.type(input, 'ers');

    expect(await screen.findByText('1 result for “orders”')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.getByText('1 result for “orders”')).toBeInTheDocument();
  });

  it('explains an empty result and suggests the documentation search', async () => {
    withAnalysis();
    renderApp(<SearchPage />, { route: '/search?q=zzz' });
    expect(await screen.findByText('No matches')).toBeInTheDocument();
    expect(screen.getByText(/turn on “Also search documentation”/)).toBeInTheDocument();
  });

  it('opens a result in the explorer and remembers the query', async () => {
    withAnalysis();
    const { user, unmount } = renderApp(<SearchPage />, { route: '/search?q=place' });
    await user.click(await screen.findByRole('button', { name: /place_order/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore?id=function%3Ashop%2Forders.py%3Aplace_order',
    );
    unmount();

    const again = renderApp(<SearchPage />, { route: '/search' });
    await again.user.click(await screen.findByRole('button', { name: 'place' }));
    expect(screen.getByLabelText('Search the project')).toHaveValue('place');
  });

  it('does not search for an empty query', async () => {
    withAnalysis();
    renderApp(<SearchPage />, { route: '/search' });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(searches()).toEqual([]);
    expect(screen.queryByRole('region', { name: 'Search results' })).not.toBeInTheDocument();
  });
});
