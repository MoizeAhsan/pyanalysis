import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError, server } from '@/test/server';
import { ApiError, compact, request } from './client';

async function failure(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('expected the request to fail');
}

describe('request', () => {
  it('returns the response body', async () => {
    server.use(http.get('*/api/health', () => HttpResponse.json({ status: 'ok', version: '1' })));
    await expect(request({ url: '/health' })).resolves.toEqual({ status: 'ok', version: '1' });
  });

  it('turns an API error body into an ApiError with its code and message', async () => {
    server.use(http.get('*/api/summary', () => apiError(404, 'no_analysis', 'Analyze first.')));
    const error = await failure(() => request({ url: '/summary' }));
    expect([error.status, error.code, error.message]).toEqual([
      404,
      'no_analysis',
      'Analyze first.',
    ]);
    expect(error.retryable).toBe(false);
  });

  it('describes validation errors without leaking the raw body', async () => {
    server.use(
      http.get('*/api/elements', () =>
        HttpResponse.json({ detail: [{ loc: ['x'] }] }, { status: 422 }),
      ),
    );
    const error = await failure(() => request({ url: '/elements' }));
    expect([error.status, error.code]).toEqual([422, 'invalid_request']);
  });

  it('marks server errors and network failures as retryable', async () => {
    server.use(http.get('*/api/summary', () => new HttpResponse('boom', { status: 500 })));
    const serverError = await failure(() => request({ url: '/summary' }));
    expect([serverError.code, serverError.retryable]).toEqual(['http_error', true]);

    server.use(http.get('*/api/summary', () => HttpResponse.error()));
    const offline = await failure(() => request({ url: '/summary' }));
    expect([offline.status, offline.code, offline.retryable]).toEqual([0, 'network_error', true]);
  });

  it('reports a cancelled request distinctly', async () => {
    server.use(http.get('*/api/summary', () => HttpResponse.json({})));
    const controller = new AbortController();
    controller.abort();
    const error = await failure(() => request({ url: '/summary', signal: controller.signal }));
    expect(error.code).toBe('cancelled');
  });
});

describe('compact', () => {
  it('drops empty values but keeps zero and false', () => {
    expect(compact({ a: 1, b: undefined, c: null, d: '', e: 0, f: false, g: 'x' })).toEqual({
      a: 1,
      e: 0,
      f: false,
      g: 'x',
    });
  });
});
