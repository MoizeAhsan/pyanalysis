import { Fragment } from 'react';
import { Box } from '@mui/material';

/** Case-insensitive ranges of ``query`` in ``text``, without overlaps. */
export function matchRanges(text: string, query: string): [number, number][] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const haystack = text.toLowerCase();
  const ranges: [number, number][] = [];
  let from = haystack.indexOf(needle);
  while (from !== -1) {
    ranges.push([from, from + needle.length]);
    from = haystack.indexOf(needle, from + needle.length);
  }
  return ranges;
}

/** ``text`` with every occurrence of ``query`` marked. */
export function Highlight({ text, query }: { text: string; query?: string | undefined }) {
  const ranges = query ? matchRanges(text, query) : [];
  if (ranges.length === 0) return <>{text}</>;
  const parts: JSX.Element[] = [];
  let cursor = 0;
  ranges.forEach(([start, end]) => {
    parts.push(<Fragment key={`t${start}`}>{text.slice(cursor, start)}</Fragment>);
    parts.push(
      <Box
        component="mark"
        key={`m${start}`}
        sx={{
          display: 'inline',
          bgcolor: 'warning.light',
          color: 'text.primary',
          borderRadius: 0.5,
          px: 0.25,
        }}
      >
        {text.slice(start, end)}
      </Box>,
    );
    cursor = end;
  });
  parts.push(<Fragment key="rest">{text.slice(cursor)}</Fragment>);
  return <>{parts}</>;
}
