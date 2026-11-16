import { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useElements } from '@shared/api/queries';
import type { ElementType } from '@shared/api/types';
import { EmptyState, QueryState } from '@shared/components/QueryState';
import { VirtualList } from '@shared/components/VirtualList';
import { useDebounce } from '@shared/hooks/useDebounce';
import { optionalOneOf, useUrlState } from '@shared/hooks/useUrlState';
import { plural } from '@shared/lib/format';
import { ElementDetailPanel } from './ElementDetailPanel';
import { ELEMENT_ROW_HEIGHT, ElementRow } from './ElementRow';

const TYPES: readonly ElementType[] = ['module', 'class', 'function'];
export const FILTER_DEBOUNCE_MS = 250;
const TYPE_LABELS: Record<ElementType, string> = {
  module: 'Modules',
  class: 'Classes',
  function: 'Functions',
};

export default function ExplorePage() {
  const [params, setParams] = useUrlState();
  const type = optionalOneOf(params.get('type'), TYPES);
  const selectedId = params.get('id');
  const urlName = params.get('name') ?? '';
  const [text, setText] = useState(urlName);
  const debounced = useDebounce(text, FILTER_DEBOUNCE_MS);

  // Typing updates the URL after a pause, so the filter survives reloads and links.
  useEffect(() => {
    if (debounced.trim() !== urlName) setParams({ name: debounced.trim() || null });
    // Only react to typing, not to URL changes it caused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const elements = useElements({ type, name: urlName || undefined });
  const items = elements.data?.pages.flatMap((page) => page.items) ?? [];
  const total = elements.data?.pages[0]?.total ?? 0;

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h4" component="h2">
          Code explorer
        </Typography>
        <Typography color="text.secondary">
          Browse every module, class, and function, and see where each one is used.
        </Typography>
      </div>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Paper
          variant="outlined"
          component="section"
          aria-label="Elements"
          sx={{ width: { xs: '100%', md: 420 }, flexShrink: 0 }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            useFlexGap
            flexWrap="wrap"
            sx={{ p: 2 }}
          >
            <TextField
              size="small"
              label="Filter by name"
              value={text}
              onChange={(event) => setText(event.target.value)}
              sx={{ flex: '1 1 160px' }}
              inputProps={{ maxLength: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="explore-type-label">Show</InputLabel>
              <Select
                labelId="explore-type-label"
                label="Show"
                value={type ?? ''}
                onChange={(event) => setParams({ type: event.target.value || null })}
              >
                <MenuItem value="">Everything</MenuItem>
                {TYPES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {elements.data ? plural(total, 'element') : ''}
            </Typography>
          </Stack>
          <QueryState
            isPending={elements.isPending}
            error={elements.error}
            onRetry={() => void elements.refetch()}
            loadingLabel="Loading elements"
          >
            {items.length === 0 ? (
              <EmptyState
                title="Nothing to show"
                hint={
                  urlName
                    ? `No element names contain “${urlName}”.`
                    : 'No elements of this kind were found.'
                }
              />
            ) : (
              <VirtualList
                items={items}
                estimateSize={ELEMENT_ROW_HEIGHT}
                height={560}
                ariaLabel="Elements"
                getKey={(element) => element.id}
                hasMore={elements.hasNextPage}
                loadingMore={elements.isFetchingNextPage}
                onEndReached={() => void elements.fetchNextPage()}
                renderItem={(element) => (
                  <ElementRow
                    element={element}
                    selected={element.id === selectedId}
                    highlight={urlName}
                    onSelect={(id) => setParams({ id }, { replace: false })}
                  />
                )}
              />
            )}
          </QueryState>
        </Paper>
        <Paper
          variant="outlined"
          component="section"
          aria-label="Element details"
          sx={{ flexGrow: 1, minWidth: 0, p: 2, width: { xs: '100%', md: 'auto' } }}
        >
          {selectedId ? (
            <ElementDetailPanel key={selectedId} elementId={selectedId} />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">
                Select an element to see its documentation, relationships, and uses.
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Stack>
  );
}
