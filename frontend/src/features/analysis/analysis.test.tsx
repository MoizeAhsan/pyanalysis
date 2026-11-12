import { screen, waitFor, within } from '@testing-library/react';
import fc from 'fast-check';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { COMPLETED, SUMMARY, running } from '@/test/fixtures';
import { renderApp } from '@/test/render';
import { api, apiError, server, withAnalysis } from '@/test/server';
import type { Summary } from '@shared/api/types';
import { formatCount } from '@shared/lib/format';
import { AnalysisSummary } from './AnalysisSummary';
import HomePage from './HomePage';
import { ProjectInput, parsePatterns } from './ProjectInput';

describe('parsePatterns', () => {
  it('keeps one pattern per line and ignores blanks and comments', () => {
    expect(parsePatterns('tests/\n\n  *_pb2.py  \n# generated\n')).toEqual(['tests/', '*_pb2.py']);
  });
});

describe('ProjectInput', () => {
  it('cannot be submitted without a path', () => {
    renderApp(<ProjectInput />);
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeDisabled();
  });

  it('starts an analysis with the chosen options and shows real progress', async () => {
    const { user } = renderApp(<ProjectInput />);
    await user.type(screen.getByLabelText(/Project path/), '  /work/shop ');
    await user.click(screen.getByText('Options'));
    await user.type(screen.getByLabelText('Exclude patterns'), 'tests/\n*_pb2.py');
    await user.click(screen.getByLabelText('Skip files ignored by .gitignore'));
    await user.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByText(/6 of 12 files/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Analysis progress' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(api.startBodies).toEqual([
      {
        project_path: '/work/shop',
        exclude: ['tests/', '*_pb2.py'],
        respect_gitignore: false,
        use_default_excludes: true,
      },
    ]);

    expect(await screen.findByText('Analyzed 12 files')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear results' })).toBeInTheDocument();
  });

  it('remembers analyzed projects and offers them again', async () => {
    const { user, unmount } = renderApp(<ProjectInput />);
    await user.type(screen.getByLabelText(/Project path/), '/work/shop');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    await screen.findByText('Analyzed 12 files');
    unmount();

    const again = renderApp(<ProjectInput />);
    await again.user.click(await screen.findByRole('button', { name: '/work/shop' }));
    expect(screen.getByLabelText(/Project path/)).toHaveValue('/work/shop');
  });

  it("shows the server's explanation when the path is rejected", async () => {
    const { user } = renderApp(<ProjectInput />);
    await user.type(screen.getByLabelText(/Project path/), '/missing');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Project path does not exist: /missing',
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('cancels on the server, not just in the UI', async () => {
    api.statuses = [running(3, 12)];
    const { user } = renderApp(<ProjectInput />);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(api.requests).toContain('POST /api/analysis/cancel'));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });

  it('reports a failed analysis', async () => {
    api.statuses = [
      { ...COMPLETED, state: 'failed', has_result: false, error: 'RuntimeError: boom' },
    ];
    renderApp(<ProjectInput />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Analysis failed: RuntimeError: boom',
    );
  });

  it('clears results through the API', async () => {
    withAnalysis();
    const { user } = renderApp(<ProjectInput />);
    await user.click(await screen.findByRole('button', { name: 'Clear results' }));

    await waitFor(() => expect(api.requests).toContain('DELETE /api/analysis'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Clear results' })).not.toBeInTheDocument(),
    );
  });
});

describe('AnalysisSummary', () => {
  it('shows a loading state, then the fetched data', async () => {
    withAnalysis();
    renderApp(<AnalysisSummary />);
    expect(screen.getByText('Loading summary…')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'shop' })).toBeInTheDocument();
    expect(screen.getByText(/12 files, 3,456 lines/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unused imports: 3/ })).toHaveAttribute(
      'href',
      '/issues?kind=unused_import',
    );
    expect(screen.getByRole('link', { name: 'shop.models' })).toBeInTheDocument();
    expect(screen.getByText('requests (4 files)')).toBeInTheDocument();
  });

  it('lists files that could not be analyzed, with the reason', async () => {
    withAnalysis();
    renderApp(<AnalysisSummary />);
    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('1 file could not be analyzed');
    expect(within(warning).getByText('shop/broken.py')).toBeInTheDocument();
    expect(within(warning).getByText(/syntax error at line 3/)).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    withAnalysis();
    server.use(
      http.get('*/api/summary', () => apiError(500, 'internal', 'Database on fire'), {
        once: true,
      }),
    );
    const { user } = renderApp(<AnalysisSummary />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Database on fire');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'shop' })).toBeInTheDocument();
  });

  // Feature: analysis-data-fetch-fix, Property 2: Data Rendering Consistency.
  it('renders exactly the counts the API returned', async () => {
    const count = fc.integer({ min: 0, max: 5_000_000 });
    await fc.assert(
      fc.asyncProperty(count, count, count, async (modules, classes, functions) => {
        withAnalysis();
        const summary: Summary = { ...SUMMARY, modules, classes, functions };
        server.use(http.get('*/api/summary', () => HttpResponse.json(summary)));
        const view = renderApp(<AnalysisSummary />);
        try {
          await screen.findByRole('heading', { name: 'shop' });
          const stat = (label: string) =>
            screen.getByText(label, { selector: 'p' }).previousElementSibling?.textContent;
          expect(stat('Modules')).toBe(formatCount(modules));
          expect(stat('Classes')).toBe(formatCount(classes));
          expect(stat('Functions')).toBe(formatCount(functions));
        } finally {
          view.unmount();
        }
      }),
      { numRuns: 15 },
    );
  });
});

describe('HomePage', () => {
  it('shows no summary until a project has been analyzed', async () => {
    renderApp(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Visual Python Project Explorer' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(api.requests).toContain('GET /api/analysis'));
    expect(screen.queryByRole('region', { name: 'Analysis summary' })).not.toBeInTheDocument();
    expect(api.requests).not.toContain('GET /api/summary');
  });

  // Feature: analysis-data-fetch-fix, Property 1: Fresh Data Fetch on Analysis Complete.
  it('fetches the summary once an analysis completes', async () => {
    const { user } = renderApp(<HomePage />);
    await user.type(screen.getByLabelText(/Project path/), '/work/shop');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByRole('heading', { name: 'shop' })).toBeInTheDocument();
    expect(api.requests.filter((entry) => entry === 'GET /api/summary')).toHaveLength(1);
  });
});
