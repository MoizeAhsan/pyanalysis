/** Small pure formatting helpers shared by the views. */
import type { IssueKind, UsageType } from '@shared/api/types';

const numberFormat = new Intl.NumberFormat('en-US');

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
}

export const PHASE_LABELS: Record<string, string> = {
  scanning: 'Finding Python files',
  parsing: 'Parsing files',
  resolving: 'Resolving imports and references',
  graph: 'Building dependency graph',
  analyzing: 'Looking for patterns and issues',
  indexing: 'Preparing results',
};

export const ISSUE_LABELS: Record<IssueKind, string> = {
  import_cycle: 'Import cycles',
  unused_import: 'Unused imports',
  dead_code: 'Dead-code candidates',
  high_complexity: 'High complexity',
  long_function: 'Long functions',
  too_many_parameters: 'Too many parameters',
  large_class: 'Large classes',
};

export const USAGE_LABELS: Record<UsageType, string> = {
  call: 'Call',
  import: 'Import',
  inheritance: 'Inheritance',
  reference: 'Reference',
  type_hint: 'Type hint',
  decorator: 'Decorator',
};

/** `/explore?id=...` link for an element. Ids contain slashes, so they travel as a query parameter. */
export function elementLink(id: string): string {
  return `/explore?id=${encodeURIComponent(id)}`;
}
