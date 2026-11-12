import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { api, withAnalysis } from '@/test/server';
import IssuesPage from './IssuesPage';

describe('IssuesPage', () => {
  it('lists findings with counts per kind', async () => {
    withAnalysis();
    renderApp(<IssuesPage />, { route: '/issues' });

    expect(await screen.findByText('3 findings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unused imports (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dead-code candidates (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import cycles/ })).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Findings' });
    expect(within(list).getByText("'os' is imported but never used")).toBeInTheDocument();
    expect(within(list).getByText('shop/api.py:2')).toBeInTheDocument();
  });

  it('filters by kind and severity on the server and in the URL', async () => {
    withAnalysis();
    const { user } = renderApp(<IssuesPage />, { route: '/issues' });
    await user.click(await screen.findByRole('button', { name: 'Dead-code candidates (1)' }));

    expect(await screen.findByText('1 finding')).toBeInTheDocument();
    expect(api.requests).toContain('GET /api/issues?kind=dead_code&offset=0&limit=100');
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/issues?kind=dead_code'),
    );

    await user.click(screen.getByLabelText('Severity'));
    await user.click(screen.getByRole('option', { name: 'Warnings' }));
    expect(await screen.findByText('No findings')).toBeInTheDocument();
    expect(screen.getByText('Nothing matches these filters.')).toBeInTheDocument();
  });

  it('applies filters from the URL and ignores invalid ones', async () => {
    withAnalysis();
    renderApp(<IssuesPage />, { route: '/issues?kind=unused_import&severity=bogus' });
    expect(await screen.findByText('2 findings')).toBeInTheDocument();
    expect(api.requests).toContain('GET /api/issues?kind=unused_import&offset=0&limit=100');
  });

  it('opens the element a finding is about', async () => {
    withAnalysis();
    const { user } = renderApp(<IssuesPage />, { route: '/issues' });
    await user.click(await screen.findByRole('button', { name: /legacy_export/ }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore?id=function%3Ashop%2Fjobs.py%3Alegacy_export',
      ),
    );
  });

  it('asks for an analysis when there is none', async () => {
    renderApp(<IssuesPage />, { route: '/issues' });
    expect(await screen.findByText('No project has been analyzed yet')).toBeInTheDocument();
  });
});
