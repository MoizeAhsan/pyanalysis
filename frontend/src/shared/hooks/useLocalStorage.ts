import { useCallback, useState } from 'react';
import { logger } from '@shared/lib/logger';

function read<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch (error) {
    logger.warn(`Ignoring unreadable localStorage key "${key}"`, error);
    return fallback;
  }
}

/**
 * State persisted in localStorage. Stored data is validated with `isValid`
 * before use, so a stale or hand-edited value can never break the app.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback, isValid));

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = next instanceof Function ? next(previous) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch (error) {
          logger.warn(`Could not persist localStorage key "${key}"`, error);
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
