/** A mock backend for tests, with a little mutable state for the analysis lifecycle. */
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import type { AnalysisRequest, AnalysisStatus } from '@shared/api/types';
import {
  COMPLETED,
  CYCLES,
  ELEMENTS,
  IDLE,
  ISSUES,
  MODULE_GRAPH,
  ORDER_DETAIL,
  PATTERNS,
  SOURCE,
  SUMMARY,
  TOTAL_DETAIL,
  TREE,
  USAGES,
  issuePage,
  running,
} from './fixtures';

interface ApiState {
  /** Statuses returned by successive polls; the last one repeats. */
  statuses: AnalysisStatus[];
  /** Every request received, as "METHOD /path?query". */
  requests: string[];
  startBodies: AnalysisRequest[];
}

export const api: ApiState = { statuses: [IDLE], requests: [], startBodies: [] };

export function resetApiState(): void {
  api.statuses = [IDLE];
  api.requests = [];
  api.startBodies = [];
}

/** Make the mock backend behave as if an analysis has already completed. */
export function withAnalysis(): void {
  api.statuses = [COMPLETED];
}

export function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

const NO_ANALYSIS = () =>
  apiError(404, 'no_analysis', 'No analysis is available. Analyze a project first.');

function hasResult(): boolean {
  return api.statuses[api.statuses.length - 1]?.has_result === true;
}

function guarded(respond: (url: URL) => JsonBodyType | Response) {
  return ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    if (!hasResult()) return NO_ANALYSIS();
    const body = respond(url);
    return body instanceof Response ? body : HttpResponse.json(body);
  };
}

function page<T>(items: T[], url: URL) {
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const shown = items.slice(offset, offset + limit);
  return {
    items: shown,
    total: items.length,
    offset,
    limit,
    next_offset: offset + shown.length < items.length ? offset + shown.length : null,
  };
}

export const handlers = [
  http.get('*/api/health', () => HttpResponse.json({ status: 'ok', version: 'test' })),
  http.get('*/api/analysis', () => {
    const status = api.statuses.length > 1 ? api.statuses.shift() : api.statuses[0];
    return HttpResponse.json(status ?? IDLE);
  }),
  http.post('*/api/analysis', async ({ request }) => {
    const body = (await request.json()) as AnalysisRequest;
    api.startBodies.push(body);
    if (body.project_path.includes('missing')) {
      return apiError(
        400,
        'invalid_project_path',
        `Project path does not exist: ${body.project_path}`,
      );
    }
    api.statuses = [running(0, 0, 'scanning'), running(6, 12), COMPLETED];
    return HttpResponse.json(api.statuses[0], { status: 202 });
  }),
  http.post('*/api/analysis/cancel', () => {
    api.statuses = [{ ...IDLE, state: 'cancelled', project_path: '/work/shop' }];
    return HttpResponse.json(api.statuses[0]);
  }),
  http.delete('*/api/analysis', () => {
    api.statuses = [IDLE];
    return HttpResponse.json(IDLE);
  }),
  http.get(
    '*/api/summary',
    guarded(() => SUMMARY),
  ),
  http.get(
    '*/api/tree',
    guarded((url) => {
      const parent = url.searchParams.get('parent') ?? 'dir:';
      return { parent, children: TREE[parent] ?? [] };
    }),
  ),
  http.get(
    '*/api/elements',
    guarded((url) => {
      const type = url.searchParams.get('type');
      return page(
        ELEMENTS.filter((item) => !type || item.type === type),
        url,
      );
    }),
  ),
  http.get(
    '*/api/element',
    guarded((url) => {
      const id = url.searchParams.get('id');
      if (id === ORDER_DETAIL.id) return ORDER_DETAIL;
      if (id === TOTAL_DETAIL.id) return TOTAL_DETAIL;
      return apiError(404, 'unknown_element', `No element with id '${id}'`);
    }),
  ),
  http.get(
    '*/api/usages',
    guarded((url) => {
      const type = url.searchParams.get('type');
      const file = url.searchParams.get('file');
      const ofType = USAGES.filter((usage) => !type || usage.usage_type === type);
      const counts = new Map<string, number>();
      for (const usage of ofType)
        counts.set(usage.file_path, (counts.get(usage.file_path) ?? 0) + 1);
      return {
        ...page(
          ofType.filter((usage) => !file || usage.file_path === file),
          url,
        ),
        by_file: [...counts].map(([file_path, count]) => ({ file_path, count })),
      };
    }),
  ),
  http.get(
    '*/api/search',
    guarded((url) => {
      const query = (url.searchParams.get('q') ?? '').toLowerCase();
      const type = url.searchParams.get('type');
      const matches = ELEMENTS.filter(
        (item) => item.name.toLowerCase().includes(query) && (!type || item.type === type),
      ).map((item) => ({ element: item, match_type: 'name', match_text: item.name }));
      return { ...page(matches, url), query };
    }),
  ),
  http.get(
    '*/api/graph',
    guarded((url) => ({
      ...MODULE_GRAPH,
      level: url.searchParams.get('level') ?? 'module',
      focus: url.searchParams.get('focus'),
    })),
  ),
  http.get(
    '*/api/issues',
    guarded((url) => {
      const kind = url.searchParams.get('kind');
      const severity = url.searchParams.get('severity');
      return issuePage(
        ISSUES.filter(
          (issue) => (!kind || issue.kind === kind) && (!severity || issue.severity === severity),
        ),
      );
    }),
  ),
  http.get(
    '*/api/cycles',
    guarded(() => CYCLES),
  ),
  http.get(
    '*/api/patterns',
    guarded(() => PATTERNS),
  ),
  http.get(
    '*/api/source',
    guarded((url) => ({
      ...SOURCE,
      file_path: url.searchParams.get('file') ?? SOURCE.file_path,
      start_line: Number(url.searchParams.get('start') ?? 1),
    })),
  ),
];

export const server = setupServer(...handlers);

server.events.on('request:start', ({ request }) => {
  const url = new URL(request.url);
  // Logged decoded, so assertions do not depend on how the client escapes values.
  api.requests.push(`${request.method} ${url.pathname}${decodeURIComponent(url.search)}`);
});
