import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ORDER_DETAIL, TOTAL_DETAIL } from '@/test/fixtures';
import { renderApp } from '@/test/render';
import { api, withAnalysis } from '@/test/server';
import type { ElementDetail, Parameter } from '@shared/api/types';
import { ElementDetailPanel, formatSignature } from './ElementDetailPanel';
import ExplorePage from './ExplorePage';
import { rangeAround } from './SourceSnippet';
import { groupByFile } from './UsageList';
import type { Usage } from '@shared/api/types';

function withParameters(
  parameters: Parameter[],
  extra: Partial<ElementDetail> = {},
): ElementDetail {
  return { ...TOTAL_DETAIL, name: 'f', parameters, return_type: null, ...extra };
}

const param = (
  name: string,
  kind: Parameter['kind'],
  rest: Partial<Parameter> = {},
): Parameter => ({
  name,
  kind,
  type_hint: null,
  default_value: null,
  ...rest,
});

describe('formatSignature', () => {
  it('renders annotations, defaults, and the return type', () => {
    expect(formatSignature(TOTAL_DETAIL)).toBe(
      "def total(self, currency: str = 'EUR', *, rounding=True) -> Money",
    );
  });

  it('places the positional-only and keyword-only markers', () => {
    const signature = formatSignature(
      withParameters([
        param('a', 'positional_only'),
        param('b', 'positional'),
        param('args', 'var_positional'),
        param('c', 'keyword_only'),
        param('kw', 'var_keyword'),
      ]),
    );
    expect(signature).toBe('def f(a, /, b, *args, c, **kw)');
  });

  it('marks coroutines', () => {
    expect(formatSignature(withParameters([], { is_async: true }))).toBe('async def f()');
  });
});

describe('groupByFile', () => {
  it('keeps server order and starts a group whenever the file changes', () => {
    const at = (file_path: string, line: number) => ({ file_path, line }) as Usage;
    const groups = groupByFile([at('a.py', 1), at('a.py', 9), at('b.py', 2), at('a.py', 20)]);
    expect(groups.map(([path, items]) => [path, items.map((u) => u.line)])).toEqual([
      ['a.py', [1, 9]],
      ['b.py', [2]],
      ['a.py', [20]],
    ]);
  });
});

describe('rangeAround', () => {
  it('pads a line with context without going below line 1', () => {
    expect(rangeAround('a.py', 2)).toEqual({ file: 'a.py', start: 1, end: 6 });
    expect(rangeAround('a.py', 50)).toEqual({ file: 'a.py', start: 46, end: 54 });
  });
});

describe('ElementDetailPanel', () => {
  it('shows documentation, hierarchy, members, findings, and source for a class', async () => {
    withAnalysis();
    renderApp(<ElementDetailPanel elementId={ORDER_DETAIL.id} />);

    expect(await screen.findByRole('heading', { name: 'Order' })).toBeInTheDocument();
    expect(screen.getByText(/Holds line items and computes totals/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("'Order' has 25 methods (limit 20)");
    expect(screen.getByRole('link', { name: 'Entity' })).toHaveAttribute(
      'href',
      '/explore?id=class%3Ashop%2Fmodels.py%3AEntity',
    );
    expect(screen.getByText('abc.ABC (external)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GiftOrder' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Order.total' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Money' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Source of shop/orders.py')).toHaveTextContent(
      'class Order(Entity):',
    );
    expect(api.requests).toContain('GET /api/source?file=shop/orders.py&start=5&end=28');
  });

  it('shows the signature and override links for a method', async () => {
    withAnalysis();
    renderApp(<ElementDetailPanel elementId={TOTAL_DETAIL.id} />);

    expect(await screen.findByText(/def total\(self, currency: str = 'EUR'/)).toBeInTheDocument();
    expect(screen.getByText('Complexity 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entity.total' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GiftOrder.total' })).toBeInTheDocument();
  });

  it('lists usages with who uses the element, and filters them on the server', async () => {
    withAnalysis();
    const { user } = renderApp(<ElementDetailPanel elementId={ORDER_DETAIL.id} />);

    expect(await screen.findByText('3 uses across 2 files')).toBeInTheDocument();
    expect(screen.getByText('order = Order(items)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'create' })).toHaveAttribute(
      'href',
      '/explore?id=function%3Ashop%2Fapi.py%3Acreate',
    );

    await user.click(screen.getByRole('button', { name: 'shop/jobs.py (1)' }));
    expect(await screen.findByText('1 use in shop/jobs.py')).toBeInTheDocument();
    expect(screen.queryByText('order = Order(items)')).not.toBeInTheDocument();
    expect(api.requests.some((entry) => entry.includes('file=shop/jobs.py'))).toBe(true);

    await user.click(screen.getByLabelText('Kind of use'));
    await user.click(screen.getByRole('option', { name: 'Call (2)' }));
    await waitFor(() =>
      expect(api.requests.some((entry) => entry.includes('type=call'))).toBe(true),
    );
    expect(await screen.findByText('2 uses across 2 files')).toBeInTheDocument();
  });

  it('shows a usage in its surrounding source on request', async () => {
    withAnalysis();
    const { user } = renderApp(<ElementDetailPanel elementId={ORDER_DETAIL.id} />);
    const buttons = await screen.findAllByRole('button', { name: 'Show source' });
    await user.click(buttons[1] as HTMLElement);

    await waitFor(() =>
      expect(api.requests).toContain('GET /api/source?file=shop/api.py&start=14&end=22'),
    );
    expect(screen.getByRole('button', { name: 'Hide source' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('explains an unknown element', async () => {
    withAnalysis();
    renderApp(<ElementDetailPanel elementId="function:nope.py:nope" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No element with id');
  });
});

describe('ExplorePage', () => {
  it('lists elements and opens the one that is clicked', async () => {
    withAnalysis();
    const { user } = renderApp(<ExplorePage />, { route: '/explore' });
    const list = screen.getByRole('region', { name: 'Elements' });

    expect(await within(list).findByText('4 elements')).toBeInTheDocument();
    expect(screen.getByText(/Select an element to see/)).toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: /^Class Order/ }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore?id=class%3Ashop%2Forders.py%3AOrder',
      ),
    );
    const details = screen.getByRole('region', { name: 'Element details' });
    expect(await within(details).findByRole('heading', { name: 'Order' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /^Class Order/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('filters by name after typing pauses, and marks the match', async () => {
    withAnalysis();
    const { user } = renderApp(<ExplorePage />, { route: '/explore' });
    await screen.findByText('4 elements');
    await user.type(screen.getByLabelText('Filter by name'), 'TOTAL');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/explore?name=TOTAL'),
    );
    const nameRequests = api.requests.filter((entry) => entry.includes('name='));
    expect(nameRequests).toEqual(['GET /api/elements?name=TOTAL&offset=0&limit=100']);
    const list = screen.getByRole('region', { name: 'Elements' });
    expect(await within(list).findByText('1 element')).toBeInTheDocument();
    for (const mark of list.querySelectorAll('mark')) {
      expect(mark.textContent?.toLowerCase()).toBe('total');
    }
    expect(list.querySelectorAll('mark').length).toBeGreaterThan(0);
  });

  it('says why the list is empty when no name matches', async () => {
    withAnalysis();
    renderApp(<ExplorePage />, { route: '/explore?name=zzz' });
    expect(await screen.findByText('No element names contain “zzz”.')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by name')).toHaveValue('zzz');
  });

  it('filters by kind through the API and the URL', async () => {
    withAnalysis();
    const { user } = renderApp(<ExplorePage />, { route: '/explore' });
    await screen.findByText('4 elements');
    await user.click(screen.getByLabelText('Show'));
    await user.click(screen.getByRole('option', { name: 'Classes' }));

    expect(await screen.findByText('1 element')).toBeInTheDocument();
    expect(api.requests).toContain('GET /api/elements?type=class&offset=0&limit=100');
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/explore?type=class'),
    );
  });

  it('ignores an invalid kind in the URL', async () => {
    withAnalysis();
    renderApp(<ExplorePage />, { route: '/explore?type=bogus' });
    expect(await screen.findByText('4 elements')).toBeInTheDocument();
  });

  it('asks for an analysis when there is none', async () => {
    renderApp(<ExplorePage />, { route: '/explore' });
    expect(await screen.findByText('No project has been analyzed yet')).toBeInTheDocument();
  });
});
