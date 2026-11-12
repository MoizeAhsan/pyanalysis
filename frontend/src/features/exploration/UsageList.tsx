import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useUsages } from '@shared/api/queries';
import type { Usage, UsageType } from '@shared/api/types';
import { QueryState } from '@shared/components/QueryState';
import { USAGE_LABELS, elementLink, formatCount, plural } from '@shared/lib/format';
import { SourceSnippet, rangeAround } from './SourceSnippet';

interface UsageListProps {
  elementId: string;
  usageCounts: Partial<Record<UsageType, number>>;
}

const MAX_FILE_CHIPS = 12;

function UsageRow({ usage }: { usage: Usage }) {
  const [open, setOpen] = useState(false);
  const range = rangeAround(usage.file_path, usage.line);
  return (
    <Box component="li" sx={{ py: 1, borderBottom: 1, borderColor: 'divider', listStyle: 'none' }}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Chip size="small" label={USAGE_LABELS[usage.usage_type]} />
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {usage.file_path}:{usage.line}
        </Typography>
        {usage.used_by && (
          <Typography variant="body2" color="text.secondary">
            in{' '}
            <Link component={RouterLink} to={elementLink(usage.used_by.id)}>
              {usage.used_by.qualified_name}
            </Link>
          </Typography>
        )}
        <Button size="small" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? 'Hide source' : 'Show source'}
        </Button>
      </Stack>
      <Box
        component="code"
        sx={{
          display: 'block',
          mt: 0.5,
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {usage.context}
      </Box>
      {open && (
        <Box sx={{ mt: 1 }}>
          <SourceSnippet
            file={range.file}
            start={range.start}
            end={range.end}
            highlightLine={usage.line}
          />
        </Box>
      )}
    </Box>
  );
}

/** Where an element is used: filterable by kind and file, loaded a page at a time. */
export function UsageList({ elementId, usageCounts }: UsageListProps) {
  const [type, setType] = useState<UsageType | ''>('');
  const [file, setFile] = useState<string | null>(null);
  const usages = useUsages(elementId, { type: type || undefined, file: file ?? undefined });
  const first = usages.data?.pages[0];
  const items = usages.data?.pages.flatMap((page) => page.items) ?? [];
  const kinds = (Object.keys(usageCounts) as UsageType[]).sort();

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="usage-kind-label">Kind of use</InputLabel>
          <Select
            labelId="usage-kind-label"
            label="Kind of use"
            value={type}
            onChange={(event) => {
              setType(event.target.value as UsageType | '');
              setFile(null);
            }}
          >
            <MenuItem value="">All kinds</MenuItem>
            {kinds.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {USAGE_LABELS[kind]} ({formatCount(usageCounts[kind] ?? 0)})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {first && (
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {plural(first.total, 'use')}
            {file ? ` in ${file}` : ` across ${plural(first.by_file.length, 'file')}`}
          </Typography>
        )}
      </Stack>

      {first && first.by_file.length > 1 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" aria-label="Filter by file">
          {first.by_file.slice(0, MAX_FILE_CHIPS).map((entry) => (
            <Chip
              key={entry.file_path}
              size="small"
              variant={file === entry.file_path ? 'filled' : 'outlined'}
              color={file === entry.file_path ? 'primary' : 'default'}
              label={`${entry.file_path} (${entry.count})`}
              onClick={() => setFile(file === entry.file_path ? null : entry.file_path)}
            />
          ))}
          {first.by_file.length > MAX_FILE_CHIPS && (
            <Typography variant="body2" color="text.secondary">
              and {first.by_file.length - MAX_FILE_CHIPS} more files
            </Typography>
          )}
        </Stack>
      )}

      <QueryState isPending={usages.isPending} error={usages.error} loadingLabel="Loading uses">
        {items.length === 0 ? (
          <Typography color="text.secondary">No uses were found in the project.</Typography>
        ) : (
          <Box component="ul" sx={{ m: 0, p: 0 }}>
            {items.map((usage) => (
              <UsageRow
                key={`${usage.file_path}:${usage.line}:${usage.column}:${usage.usage_type}`}
                usage={usage}
              />
            ))}
          </Box>
        )}
        {usages.hasNextPage && (
          <Button onClick={() => void usages.fetchNextPage()} disabled={usages.isFetchingNextPage}>
            {usages.isFetchingNextPage ? 'Loading…' : 'Show more uses'}
          </Button>
        )}
      </QueryState>
    </Stack>
  );
}
