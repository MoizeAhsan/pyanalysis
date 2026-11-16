import { useEffect, useState } from 'react';
import {
  Chip,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@shared/api/queries';
import type { ElementType, SearchResult } from '@shared/api/types';
import { EmptyState, QueryState } from '@shared/components/QueryState';
import { VirtualList } from '@shared/components/VirtualList';
import { useDebounce } from '@shared/hooks/useDebounce';
import { isStringArray, useLocalStorage } from '@shared/hooks/useLocalStorage';
import { optionalOneOf, useUrlState } from '@shared/hooks/useUrlState';
import { elementLink, plural } from '@shared/lib/format';
import { ELEMENT_ROW_HEIGHT, ElementRow } from '@features/exploration/ElementRow';

const TYPES: readonly ElementType[] = ['module', 'class', 'function'];
const HISTORY_KEY = 'pyanalyzer.searchHistory';
const MAX_HISTORY = 8;
export const SEARCH_DEBOUNCE_MS = 250;

const MATCH_NOTES: Record<string, (result: SearchResult) => string | undefined> = {
  docstring: (result) => `Documentation: ${result.match_text}`,
  file_path: () => 'Matched the file path',
  qualified_name: () => undefined,
  name: () => undefined,
};

export default function SearchPage() {
  const [params, setParams] = useUrlState();
  const navigate = useNavigate();
  const urlQuery = params.get('q') ?? '';
  const type = optionalOneOf(params.get('type'), TYPES);
  const docstrings = params.get('docs') === '1';

  const [text, setText] = useState(urlQuery);
  const debounced = useDebounce(text, SEARCH_DEBOUNCE_MS);
  const [history, setHistory] = useLocalStorage<string[]>(HISTORY_KEY, [], isStringArray);

  // The URL is the source of truth for the query; typing updates it after a pause.
  useEffect(() => {
    if (debounced !== urlQuery) setParams({ q: debounced });
    // Only react to the user's typing, not to URL changes it caused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const search = useSearch({ q: urlQuery, type, docstrings: docstrings || undefined });
  const results = search.data?.pages.flatMap((page) => page.items) ?? [];
  const total = search.data?.pages[0]?.total ?? 0;
  const hasQuery = urlQuery.trim() !== '';

  const open = (id: string) => {
    const query = urlQuery.trim();
    if (query) {
      setHistory((previous) =>
        [query, ...previous.filter((entry) => entry !== query)].slice(0, MAX_HISTORY),
      );
    }
    navigate(elementLink(id));
  };

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h4" component="h2">
          Search
        </Typography>
        <Typography color="text.secondary">
          Find modules, classes, and functions by name or path.
        </Typography>
      </div>
      <Paper variant="outlined" role="search" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="Search the project"
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoFocus
            fullWidth
            autoComplete="off"
            spellCheck={false}
            inputProps={{ maxLength: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon aria-hidden="true" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="search-type-label">Kind</InputLabel>
              <Select
                labelId="search-type-label"
                label="Kind"
                value={type ?? ''}
                onChange={(event) => setParams({ type: event.target.value || null })}
              >
                <MenuItem value="">Any kind</MenuItem>
                <MenuItem value="module">Modules</MenuItem>
                <MenuItem value="class">Classes</MenuItem>
                <MenuItem value="function">Functions</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={docstrings}
                  onChange={(event) => setParams({ docs: event.target.checked ? '1' : null })}
                />
              }
              label="Also search documentation"
            />
            {(type || docstrings) && (
              <Chip
                label="Clear filters"
                variant="outlined"
                onClick={() => setParams({ type: null, docs: null })}
              />
            )}
          </Stack>
          {!hasQuery && history.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                Recent searches:
              </Typography>
              {history.map((entry) => (
                <Chip
                  key={entry}
                  size="small"
                  variant="outlined"
                  label={entry}
                  onClick={() => setText(entry)}
                  onDelete={() =>
                    setHistory((previous) => previous.filter((item) => item !== entry))
                  }
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {hasQuery && (
        <Paper variant="outlined" component="section" aria-label="Search results">
          <QueryState
            isPending={search.isPending}
            error={search.error}
            onRetry={() => void search.refetch()}
            loadingLabel="Searching"
          >
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }} aria-live="polite">
              {plural(total, 'result')} for “{urlQuery.trim()}”
            </Typography>
            {results.length === 0 ? (
              <EmptyState
                title="No matches"
                hint={
                  docstrings
                    ? 'Try a shorter or different term.'
                    : 'Try a different term, or turn on “Also search documentation”.'
                }
              />
            ) : (
              <VirtualList
                items={results}
                estimateSize={ELEMENT_ROW_HEIGHT}
                height={560}
                ariaLabel="Search results"
                getKey={(result) => result.element.id}
                hasMore={search.hasNextPage}
                loadingMore={search.isFetchingNextPage}
                onEndReached={() => void search.fetchNextPage()}
                renderItem={(result) => (
                  <ElementRow
                    element={result.element}
                    onSelect={open}
                    note={MATCH_NOTES[result.match_type]?.(result)}
                    highlight={urlQuery}
                  />
                )}
              />
            )}
          </QueryState>
        </Paper>
      )}
    </Stack>
  );
}
