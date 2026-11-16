/** An error returned by the API, or a transport failure, in one shape. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** Client errors will fail the same way again, so they are not worth retrying. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

interface ErrorBody {
  error?: { code?: unknown; message?: unknown };
}

export interface RequestConfig {
  /** Path below `/api`, e.g. `/summary`. */
  url: string;
  method?: 'GET' | 'POST' | 'DELETE';
  /** Query parameters; arrays become repeated keys, which is what FastAPI expects. */
  params?: Record<string, unknown> | undefined;
  /** JSON request body. */
  data?: unknown;
  signal?: AbortSignal | undefined;
}

/** Requests that take longer than this fail with a retryable `timeout` error. */
export const REQUEST_TIMEOUT_MS = 30_000;

// Same origin by default: the Vite dev server proxies /api, and in production
// the backend serves the built frontend itself.
const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

export function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) url.searchParams.append(key, String(item));
    }
  }
  return url.toString();
}

async function errorFrom(response: Response): Promise<ApiError> {
  let body: ErrorBody | undefined;
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    body = undefined;
  }
  const reported = body?.error;
  if (reported && typeof reported.code === 'string' && typeof reported.message === 'string') {
    return new ApiError(response.status, reported.code, reported.message);
  }
  if (response.status === 422) {
    return new ApiError(422, 'invalid_request', 'The request was not valid.');
  }
  return new ApiError(response.status, 'http_error', `Request failed (${response.status}).`);
}

export async function request<T>(config: RequestConfig): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (config.signal?.aborted) controller.abort();
  config.signal?.addEventListener('abort', forwardAbort);

  try {
    let response: Response;
    try {
      response = await fetch(buildUrl(config.url, config.params), {
        method: config.method ?? 'GET',
        signal: controller.signal,
        ...(config.data !== undefined && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.data),
        }),
      });
    } catch (error) {
      if (timedOut) {
        throw new ApiError(0, 'timeout', 'The analyzer took too long to respond.');
      }
      if (controller.signal.aborted) throw new ApiError(0, 'cancelled', 'Request cancelled');
      throw new ApiError(
        0,
        'network_error',
        error instanceof TypeError
          ? 'Cannot reach the analyzer. Is the backend running?'
          : 'The request could not be sent.',
      );
    }
    if (!response.ok) throw await errorFrom(response);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    config.signal?.removeEventListener('abort', forwardAbort);
  }
}

/** Drop `undefined`/`null`/empty-string values so they are not sent as query parameters. */
export function compact<T extends Record<string, unknown>>(params: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(params) as (keyof T)[]) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') result[key] = value;
  }
  return result;
}
