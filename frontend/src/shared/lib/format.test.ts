import { describe, expect, it } from 'vitest';
import { elementLink, formatCount, formatDuration, plural } from './format';

describe('format helpers', () => {
  it('formats counts with separators', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('pluralises regular and irregular nouns', () => {
    expect(plural(1, 'file')).toBe('1 file');
    expect(plural(0, 'file')).toBe('0 files');
    expect(plural(2, 'child', 'children')).toBe('2 children');
    expect(plural(1500, 'use')).toBe('1,500 uses');
  });

  it('formats durations at a sensible precision', () => {
    expect(formatDuration(0.067)).toBe('67 ms');
    expect(formatDuration(6.94)).toBe('6.9 s');
    expect(formatDuration(125)).toBe('2 min 5 s');
  });

  it('encodes element ids for the explorer link', () => {
    expect(elementLink('function:a/b.py:C.run')).toBe('/explore?id=function%3Aa%2Fb.py%3AC.run');
  });
});
