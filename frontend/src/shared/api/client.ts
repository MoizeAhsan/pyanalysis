import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

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
  detail?: unknown;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isCancel(error)) return new ApiError(0, 'cancelled', 'Request cancelled');
  if (error instanceof AxiosError) {
    const response = error.response;
    if (!response) {
      return new ApiError(0, 'network_error', 'Cannot reach the analyzer. Is the backend running?');
    }
    const body = response.data as ErrorBody | undefined;
    const reported = body?.error;
    if (reported && typeof reported.code === 'string' && typeof reported.message === 'string') {
      return new ApiError(response.status, reported.code, reported.message);
    }
    if (response.status === 422) {
      return new ApiError(422, 'invalid_request', 'The request was not valid.');
    }
    return new ApiError(response.status, 'http_error', `Request failed (${response.status}).`);
  }
  return new ApiError(0, 'unknown_error', error instanceof Error ? error.message : 'Unknown error');
}

const http = axios.create({
  // Same origin by default: the Vite dev server proxies /api, and in production
  // the backend serves the built frontend itself.
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`,
  timeout: 30_000,
  // FastAPI expects repeated keys for lists and no `key[]` suffix.
  paramsSerializer: { indexes: null },
});

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<T>(config);
    return response.data;
  } catch (error) {
    throw toApiError(error);
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
