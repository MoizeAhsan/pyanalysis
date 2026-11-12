import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Read and update query-string parameters, so view state is shareable and
 * survives reloads. Setting a value to `null` or `''` removes the parameter.
 */
export function useUrlState(): [
  URLSearchParams,
  (changes: Record<string, string | null>, options?: { replace?: boolean }) => void,
] {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (changes: Record<string, string | null>, options: { replace?: boolean } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: options.replace ?? true },
      );
    },
    [setParams],
  );
  return [params, update];
}

/** Narrow a query-string value to one of the allowed options, or use the fallback. */
export function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function optionalOneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function intInRange(
  value: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
