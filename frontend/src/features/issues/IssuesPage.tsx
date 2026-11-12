import {
  Box,
  ButtonBase,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { ErrorOutline, InfoOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '@shared/api/queries';
import type { Issue, IssueKind, Severity } from '@shared/api/types';
import { EmptyState, QueryState } from '@shared/components/QueryState';
import { VirtualList } from '@shared/components/VirtualList';
import { optionalOneOf, useUrlState } from '@shared/hooks/useUrlState';
import { ISSUE_LABELS, elementLink, formatCount, plural } from '@shared/lib/format';

const KINDS = Object.keys(ISSUE_LABELS) as IssueKind[];
const SEVERITIES: readonly Severity[] = ['warning', 'info'];

function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: (issue: Issue) => void }) {
  const warning = issue.severity === 'warning';
  const Icon = warning ? ErrorOutline : InfoOutlined;
  return (
    <ButtonBase
      onClick={() => onOpen(issue)}
      disabled={issue.element_id === null}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon fontSize="small" color={warning ? 'warning' : 'info'} aria-hidden="true" />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {ISSUE_LABELS[issue.kind]}
          <Box component="span" sx={visuallyHidden}>
            {warning ? ' (warning)' : ' (information)'}
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap title={issue.file_path}>
          {issue.file_path}:{issue.line}
        </Typography>
      </Stack>
      <Typography variant="body2" noWrap title={issue.message}>
        {issue.message}
      </Typography>
    </ButtonBase>
  );
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export default function IssuesPage() {
  const [params, setParams] = useUrlState();
  const navigate = useNavigate();
  const kind = optionalOneOf(params.get('kind'), KINDS);
  const severity = optionalOneOf(params.get('severity'), SEVERITIES);

  const issues = useIssues({ kind, severity });
  const first = issues.data?.pages[0];
  const items = issues.data?.pages.flatMap((page) => page.items) ?? [];
  const counts = first?.counts ?? {};
  const present = KINDS.filter((value) => (counts[value] ?? 0) > 0);

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h4" component="h2">
          Findings
        </Typography>
        <Typography color="text.secondary">
          Import cycles, unused imports, code that nothing appears to use, and code smells.
          Dead-code candidates are hints: code reached dynamically or from outside the project
          cannot be seen.
        </Typography>
      </div>
      <QueryState
        isPending={issues.isPending}
        error={issues.error}
        onRetry={() => void issues.refetch()}
        loadingLabel="Loading findings"
      >
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Chip
            label="All"
            color={kind ? 'default' : 'primary'}
            variant={kind ? 'outlined' : 'filled'}
            onClick={() => setParams({ kind: null })}
          />
          {present.map((value) => (
            <Chip
              key={value}
              label={`${ISSUE_LABELS[value]} (${formatCount(counts[value] ?? 0)})`}
              color={kind === value ? 'primary' : 'default'}
              variant={kind === value ? 'filled' : 'outlined'}
              onClick={() => setParams({ kind: kind === value ? null : value })}
            />
          ))}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="issue-severity-label">Severity</InputLabel>
            <Select
              labelId="issue-severity-label"
              label="Severity"
              value={severity ?? ''}
              onChange={(event) => setParams({ severity: event.target.value || null })}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="warning">Warnings</MenuItem>
              <MenuItem value="info">Information</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Paper variant="outlined" component="section" aria-label="Findings list">
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }} aria-live="polite">
            {plural(first?.total ?? 0, 'finding')}
          </Typography>
          {items.length === 0 ? (
            <EmptyState
              title="No findings"
              hint={kind || severity ? 'Nothing matches these filters.' : 'Nothing to report.'}
            />
          ) : (
            <VirtualList
              items={items}
              estimateSize={62}
              height={560}
              ariaLabel="Findings"
              getKey={(issue, index) => `${issue.kind}:${issue.file_path}:${issue.line}:${index}`}
              hasMore={issues.hasNextPage}
              loadingMore={issues.isFetchingNextPage}
              onEndReached={() => void issues.fetchNextPage()}
              renderItem={(issue) => (
                <IssueRow
                  issue={issue}
                  onOpen={(opened) => {
                    if (opened.element_id) navigate(elementLink(opened.element_id));
                  }}
                />
              )}
            />
          )}
        </Paper>
      </QueryState>
    </Stack>
  );
}
