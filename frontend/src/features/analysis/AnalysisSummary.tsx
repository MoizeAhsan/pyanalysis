import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useSummary } from '@shared/api/queries';
import type { IssueKind, Summary } from '@shared/api/types';
import { BarList } from '@shared/components/BarList';
import { QueryState } from '@shared/components/QueryState';
import { ISSUE_LABELS, elementLink, formatCount, formatDuration, plural } from '@shared/lib/format';

interface StatProps {
  label: string;
  value: number;
  to?: string;
}

function Stat({ label, value, to }: StatProps) {
  const body = (
    <>
      <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
        {formatCount(value)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </>
  );
  return (
    <Paper variant="outlined" sx={{ flex: '1 1 130px', minWidth: 130 }}>
      {to ? (
        <Button
          component={RouterLink}
          to={to}
          color="inherit"
          sx={{ display: 'block', textAlign: 'left', textTransform: 'none', p: 2, width: '100%' }}
        >
          {body}
        </Button>
      ) : (
        <Box sx={{ p: 2 }}>{body}</Box>
      )}
    </Paper>
  );
}

function SummaryBody({ summary }: { summary: Summary }) {
  const issueKinds = (Object.keys(summary.issues) as IssueKind[]).sort();
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" component="h3">
          {summary.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {summary.path}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {plural(summary.total_files, 'file')}, {plural(summary.total_lines, 'line')}; analyzed in{' '}
          {formatDuration(summary.duration_seconds)}
          {summary.cached_files > 0 &&
            ` (${formatCount(summary.cached_files)} unchanged files reused from cache)`}
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
        <Stat label="Modules" value={summary.modules} to="/explore?type=module" />
        <Stat label="Classes" value={summary.classes} to="/explore?type=class" />
        <Stat label="Functions" value={summary.functions} to="/explore?type=function" />
        <Stat label="References" value={summary.usages} />
        <Stat label="Module dependencies" value={summary.dependency_edges} to="/architecture" />
        <Stat label="Import cycles" value={summary.import_cycles} to="/issues?kind=import_cycle" />
        <Stat label="Patterns" value={summary.patterns} to="/architecture" />
      </Stack>

      {issueKinds.length > 0 && (
        <Box>
          <Typography variant="subtitle1" component="h4" gutterBottom>
            Findings
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {issueKinds.map((kind) => (
              <Chip
                key={kind}
                component={RouterLink}
                to={`/issues?kind=${kind}`}
                clickable
                label={`${ISSUE_LABELS[kind]}: ${formatCount(summary.issues[kind] ?? 0)}`}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}

      {summary.most_imported_modules.length > 0 && (
        <Box>
          <Typography variant="subtitle1" component="h4" gutterBottom>
            Most depended-on modules
          </Typography>
          <BarList
            label="Most depended-on modules, by number of importing modules"
            items={summary.most_imported_modules.map((module) => ({
              key: module.id,
              value: module.imported_by,
              detail: `used by ${plural(module.imported_by, 'module')}`,
              label: (
                <Button
                  component={RouterLink}
                  to={elementLink(module.id)}
                  size="small"
                  sx={{ textTransform: 'none', p: 0, minWidth: 0, maxWidth: '100%' }}
                >
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {module.name}
                  </Box>
                </Button>
              ),
            }))}
          />
        </Box>
      )}

      {summary.external_packages.length > 0 && (
        <Box>
          <Typography variant="subtitle1" component="h4" gutterBottom>
            Third-party packages
          </Typography>
          <BarList
            label="Third-party packages, by number of files importing them"
            items={summary.external_packages.map((entry) => ({
              key: entry.name,
              value: entry.count,
              detail: `imported in ${plural(entry.count, 'file')}`,
              label: <Typography variant="body2">{entry.name}</Typography>,
            }))}
          />
        </Box>
      )}

      {summary.skipped_total > 0 && (
        <Alert severity="warning">
          {plural(summary.skipped_total, 'file')} could not be analyzed.
          <List dense disablePadding>
            {summary.skipped_files.slice(0, 10).map((skipped) => (
              <ListItem key={skipped.file_path} disableGutters sx={{ py: 0 }}>
                <ListItemText primary={skipped.file_path} secondary={skipped.reason} />
              </ListItem>
            ))}
          </List>
          {summary.skipped_total > 10 && (
            <Typography variant="body2">
              and {formatCount(summary.skipped_total - 10)} more.
            </Typography>
          )}
        </Alert>
      )}
    </Stack>
  );
}

/** Headline numbers for the current analysis, each linking into the detailed views. */
export function AnalysisSummary() {
  const summary = useSummary();
  return (
    <Paper component="section" aria-label="Analysis summary" sx={{ p: { xs: 2, md: 3 } }}>
      <QueryState
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
        loadingLabel="Loading summary"
      >
        {summary.data && <SummaryBody summary={summary.data} />}
      </QueryState>
    </Paper>
  );
}
