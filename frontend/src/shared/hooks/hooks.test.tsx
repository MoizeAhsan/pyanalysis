import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';
import { isStringArray, useLocalStorage } from './useLocalStorage';
import { intInRange, oneOf, optionalOneOf } from './useUrlState';
import { createCommonShortcuts, useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useLocalStorage', () => {
  it('persists updates and reads them back', () => {
    const first = renderHook(() => useLocalStorage<string[]>('k', [], isStringArray));
    act(() => first.result.current[1](['a']));
    act(() => first.result.current[1]((previous) => [...previous, 'b']));
    expect(first.result.current[0]).toEqual(['a', 'b']);

    const second = renderHook(() => useLocalStorage<string[]>('k', [], isStringArray));
    expect(second.result.current[0]).toEqual(['a', 'b']);
  });

  it.each(['{not json', '{"a":1}', '[1,2]'])('falls back when the stored value is %s', (stored) => {
    window.localStorage.setItem('k', stored);
    const { result } = renderHook(() =>
      useLocalStorage<string[]>('k', ['fallback'], isStringArray),
    );
    expect(result.current[0]).toEqual(['fallback']);
  });
});

describe('useDebounce', () => {
  it('only publishes the value after it stops changing', () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
        initialProps: { value: 'a' },
      });
      rerender({ value: 'ab' });
      act(() => vi.advanceTimersByTime(150));
      rerender({ value: 'abc' });
      act(() => vi.advanceTimersByTime(150));
      expect(result.current).toBe('a');
      act(() => vi.advanceTimersByTime(60));
      expect(result.current).toBe('abc');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('query-string parsing', () => {
  it('accepts only allowed values', () => {
    expect(oneOf('class', ['module', 'class'] as const, 'module')).toBe('class');
    expect(oneOf('bogus', ['module', 'class'] as const, 'module')).toBe('module');
    expect(oneOf(null, ['module', 'class'] as const, 'module')).toBe('module');
    expect(optionalOneOf('bogus', ['module'] as const)).toBeUndefined();
  });

  it('accepts only integers in range', () => {
    expect(intInRange('3', 1, 5, 1)).toBe(3);
    expect(intInRange('9', 1, 5, 1)).toBe(1);
    expect(intInRange('abc', 1, 5, 2)).toBe(2);
    expect(intInRange(null, 1, 5, 2)).toBe(2);
  });
});

describe('useKeyboardShortcuts', () => {
  it('moves focus to the main region on Escape', () => {
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    const button = document.createElement('button');
    document.body.append(main, button);
    try {
      renderHook(() => useKeyboardShortcuts({ shortcuts: createCommonShortcuts({}) }));
      button.focus();
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.activeElement).toBe(main);
    } finally {
      main.remove();
      button.remove();
    }
  });
});
