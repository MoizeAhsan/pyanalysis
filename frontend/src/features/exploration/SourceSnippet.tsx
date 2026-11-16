import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Highlight, themes } from 'prism-react-renderer';
import { useSource, type SourceRange } from '@shared/api/queries';
import { QueryState } from '@shared/components/QueryState';

interface SourceSnippetProps {
  file: string;
  /** First line to show (1-based). */
  start: number;
  end: number;
  /** A line to emphasise, such as the line of a usage. */
  highlightLine?: number | undefined;
}

const CONTEXT_LINES = 4;

/** The range to request so that `line` is shown with a few lines either side. */
export function rangeAround(file: string, line: number): SourceRange {
  return { file, start: Math.max(1, line - CONTEXT_LINES), end: line + CONTEXT_LINES };
}

/** Syntax-highlighted lines of an analyzed file, with line numbers. */
export function SourceSnippet({ file, start, end, highlightLine }: SourceSnippetProps) {
  const theme = useTheme();
  const source = useSource({ file, start, end });
  const prismTheme = theme.palette.mode === 'dark' ? themes.vsDark : themes.vsLight;

  return (
    <QueryState isPending={source.isPending} error={source.error} loadingLabel="Loading source">
      {source.data && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {source.data.file_path}, lines {source.data.start_line}–{source.data.end_line} of{' '}
            {source.data.total_lines}
          </Typography>
          <Highlight theme={prismTheme} code={source.data.lines.join('\n')} language="python">
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <Box
                component="pre"
                tabIndex={0}
                aria-label={`Source of ${source.data.file_path}`}
                style={style}
                sx={{
                  m: 0,
                  p: 1,
                  borderRadius: 1,
                  overflowX: 'auto',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {tokens.map((line, index) => {
                  const lineNumber = source.data.start_line + index;
                  const emphasised = lineNumber === highlightLine;
                  return (
                    <Box
                      key={lineNumber}
                      {...getLineProps({ line })}
                      sx={{
                        display: 'flex',
                        bgcolor: emphasised ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Box
                        component="span"
                        aria-hidden="true"
                        sx={{
                          width: '4ch',
                          flexShrink: 0,
                          textAlign: 'right',
                          pr: 2,
                          userSelect: 'none',
                          color: 'text.secondary',
                        }}
                      >
                        {lineNumber}
                      </Box>
                      <span>
                        {line.map((token, tokenIndex) => (
                          <span key={tokenIndex} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Highlight>
        </Box>
      )}
    </QueryState>
  );
}
