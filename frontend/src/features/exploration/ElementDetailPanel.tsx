import { useState, type ReactNode } from 'react';
import { Alert, Box, Chip, Divider, Link, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useElement } from '@shared/api/queries';
import type { ElementDetail, ElementRef, Parameter } from '@shared/api/types';
import { ElementTypeChip } from '@shared/components/ElementTypeChip';
import { QueryState } from '@shared/components/QueryState';
import { elementLink, plural } from '@shared/lib/format';
import { SourceSnippet } from './SourceSnippet';
import { UsageList } from './UsageList';

const MAX_SNIPPET_LINES = 60;
const MAX_LISTED = 40;

const PARAMETER_PREFIX: Record<Parameter['kind'], string> = {
  positional_only: '',
  positional: '',
  var_positional: '*',
  keyword_only: '',
  var_keyword: '**',
};

/** Render a function signature the way it would be written in source. */
export function formatSignature(element: ElementDetail): string {
  const parts: string[] = [];
  let sawKeywordOnly = false;
  element.parameters.forEach((parameter, index) => {
    if (
      parameter.kind === 'keyword_only' &&
      !sawKeywordOnly &&
      !element.parameters.some((other) => other.kind === 'var_positional')
    ) {
      parts.push('*');
    }
    sawKeywordOnly ||= parameter.kind === 'keyword_only';
    let text = PARAMETER_PREFIX[parameter.kind] + parameter.name;
    if (parameter.type_hint) text += `: ${parameter.type_hint}`;
    if (parameter.default_value !== null) {
      text += parameter.type_hint ? ` = ${parameter.default_value}` : `=${parameter.default_value}`;
    }
    parts.push(text);
    const next = element.parameters[index + 1];
    if (parameter.kind === 'positional_only' && next?.kind !== 'positional_only') parts.push('/');
  });
  const prefix = element.is_async ? 'async def' : 'def';
  const returns = element.return_type ? ` -> ${element.return_type}` : '';
  return `${prefix} ${element.name}(${parts.join(', ')})${returns}`;
}

function RefLinks({ refs, empty }: { refs: ElementRef[]; empty?: string }) {
  if (refs.length === 0) {
    return empty ? <Typography color="text.secondary">{empty}</Typography> : null;
  }
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {refs.slice(0, MAX_LISTED).map((ref) => (
        <Chip
          key={ref.id}
          size="small"
          variant="outlined"
          clickable
          component={RouterLink}
          to={elementLink(ref.id)}
          label={ref.qualified_name}
          title={`${ref.file_path}:${ref.line}`}
        />
      ))}
      {refs.length > MAX_LISTED && (
        <Typography variant="body2" color="text.secondary">
          and {refs.length - MAX_LISTED} more
        </Typography>
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section">
      <Typography variant="subtitle1" component="h4" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

type DetailTab = 'overview' | 'uses' | 'source';

function Detail({ element }: { element: ElementDetail }) {
  const isFunction = element.type === 'function';
  const snippetEnd = Math.min(element.end_line, element.line + MAX_SNIPPET_LINES - 1);
  const totalUses = Object.values(element.usage_counts).reduce((sum, count) => sum + count, 0);
  const [tab, setTab] = useState<DetailTab>('overview');
  const tabProps = (value: DetailTab) => ({
    value,
    id: `detail-tab-${value}`,
    'aria-controls': `detail-panel-${value}`,
  });
  return (
    <Stack spacing={2}>
      <Stack spacing={1} alignItems="flex-start">
        <ElementTypeChip type={element.type} isMethod={element.is_method} />
        <Typography variant="h5" component="h3" sx={{ wordBreak: 'break-word' }}>
          {element.qualified_name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {element.file_path}:{element.line}
          {element.parent && (
            <>
              {' · in '}
              <Link component={RouterLink} to={elementLink(element.parent.id)}>
                {element.parent.qualified_name}
              </Link>
            </>
          )}
        </Typography>
        {isFunction && (
          <Box
            component="code"
            sx={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {formatSignature(element)}
          </Box>
        )}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={plural(element.line_count, 'line')} />
          {isFunction && <Chip size="small" label={`Complexity ${element.complexity}`} />}
          {element.decorators.map((decorator) => (
            <Chip key={decorator} size="small" variant="outlined" label={`@${decorator}`} />
          ))}
        </Stack>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_event, value: DetailTab) => setTab(value)}
        aria-label="Element information"
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview" {...tabProps('overview')} />
        <Tab label={`Used by (${totalUses})`} {...tabProps('uses')} />
        {element.type !== 'module' && <Tab label="Source" {...tabProps('source')} />}
      </Tabs>

      {/* Only the visible tab is mounted, so uses and source load on demand. */}
      <Box role="tabpanel" id={`detail-panel-${tab}`} aria-labelledby={`detail-tab-${tab}`}>
        {tab === 'overview' && <Overview element={element} />}
        {tab === 'uses' && <UsageList elementId={element.id} usageCounts={element.usage_counts} />}
        {tab === 'source' && (
          <>
            <SourceSnippet file={element.file_path} start={element.line} end={snippetEnd} />
            {snippetEnd < element.end_line && (
              <Typography variant="caption" color="text.secondary">
                Showing the first {MAX_SNIPPET_LINES} of {element.line_count} lines.
              </Typography>
            )}
          </>
        )}
      </Box>
    </Stack>
  );
}

/** Findings, documentation, and relationships: the default tab. */
function Overview({ element }: { element: ElementDetail }) {
  const isClass = element.type === 'class';
  const hasContent =
    element.issues.length > 0 ||
    Boolean(element.docstring) ||
    isClass ||
    Boolean(element.overrides) ||
    element.overridden_by.length > 0 ||
    element.children.length > 0 ||
    element.dependencies.length > 0;
  if (!hasContent) {
    return (
      <Typography color="text.secondary">
        No documentation, findings, or relationships for this element.
      </Typography>
    );
  }
  return (
    <Stack spacing={2} divider={<Divider flexItem />}>
      {element.issues.length > 0 && (
        <Stack spacing={1}>
          {element.issues.map((issue) => (
            <Alert
              key={`${issue.kind}:${issue.line}`}
              severity={issue.severity === 'warning' ? 'warning' : 'info'}
            >
              {issue.message}
            </Alert>
          ))}
        </Stack>
      )}

      {element.docstring && (
        <Section title="Documentation">
          <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}>
            {element.docstring}
          </Typography>
        </Section>
      )}

      {isClass && (
        <Section title="Class hierarchy">
          <Stack spacing={1}>
            <Typography variant="body2">Inherits from</Typography>
            <RefLinks refs={element.bases} />
            {element.external_bases.length > 0 && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {element.external_bases.map((base) => (
                  <Chip key={base} size="small" label={`${base} (external)`} />
                ))}
              </Stack>
            )}
            {element.bases.length === 0 && element.external_bases.length === 0 && (
              <Typography color="text.secondary">No base classes.</Typography>
            )}
            <Typography variant="body2">Subclasses</Typography>
            <RefLinks refs={element.subclasses} empty="No subclasses in the project." />
          </Stack>
        </Section>
      )}

      {(element.overrides || element.overridden_by.length > 0) && (
        <Section title="Overrides">
          <Stack spacing={1}>
            {element.overrides && (
              <Typography variant="body2">
                Overrides{' '}
                <Link component={RouterLink} to={elementLink(element.overrides.id)}>
                  {element.overrides.qualified_name}
                </Link>
              </Typography>
            )}
            {element.overridden_by.length > 0 && (
              <>
                <Typography variant="body2">Overridden by</Typography>
                <RefLinks refs={element.overridden_by} />
              </>
            )}
          </Stack>
        </Section>
      )}

      {element.children.length > 0 && (
        <Section title={isClass ? 'Members' : 'Contains'}>
          <RefLinks refs={element.children} />
        </Section>
      )}

      {element.dependencies.length > 0 && (
        <Section title="Uses">
          <RefLinks refs={element.dependencies} />
        </Section>
      )}
    </Stack>
  );
}

/** Everything known about one element. Re-mounts per element so filters reset. */
export function ElementDetailPanel({ elementId }: { elementId: string }) {
  const element = useElement(elementId);
  return (
    <QueryState
      isPending={element.isPending}
      error={element.error}
      onRetry={() => void element.refetch()}
      loadingLabel="Loading element"
    >
      {element.data && <Detail key={element.data.id} element={element.data} />}
    </QueryState>
  );
}
