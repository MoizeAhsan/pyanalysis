import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Cancel, ExpandMore, PlayArrow, RestartAlt } from '@mui/icons-material';
import {
  useAnalysisStatus,
  useCancelAnalysis,
  useResetAnalysis,
  useStartAnalysis,
} from '@shared/api/queries';
import { isStringArray, useLocalStorage } from '@shared/hooks/useLocalStorage';
import { PHASE_LABELS, formatCount } from '@shared/lib/format';
import { useNotifications } from '@shared/components/NotificationSystem';

const RECENT_KEY = 'pyanalyzer.recentProjects';
const MAX_RECENT = 5;

/** One pattern per line; blank lines and `#` comments are ignored, as in a .gitignore. */
export function parsePatterns(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

export function ProjectInput() {
  const status = useAnalysisStatus();
  const start = useStartAnalysis();
  const cancel = useCancelAnalysis();
  const reset = useResetAnalysis();
  const notifications = useNotifications();

  const [path, setPath] = useState('');
  const [excludeText, setExcludeText] = useState('');
  const [respectGitignore, setRespectGitignore] = useState(true);
  const [useDefaultExcludes, setUseDefaultExcludes] = useState(true);
  const [recent, setRecent] = useLocalStorage<string[]>(RECENT_KEY, [], isStringArray);
  const helpId = useId();

  const job = status.data;
  const running = job?.state === 'running';

  // Announce the outcome once, when a run this page was watching finishes.
  const previousState = useRef(job?.state);
  useEffect(() => {
    const before = previousState.current;
    previousState.current = job?.state;
    if (before !== 'running' || !job) return;
    if (job.state === 'completed') {
      notifications.success(`Analyzed ${formatCount(job.total)} files`);
    } else if (job.state === 'failed') {
      notifications.error(job.error ?? 'Analysis failed');
    } else if (job.state === 'cancelled') {
      notifications.info('Analysis cancelled');
    }
  }, [job, notifications]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const projectPath = path.trim();
    if (!projectPath || running) return;
    start.mutate(
      {
        project_path: projectPath,
        exclude: parsePatterns(excludeText),
        respect_gitignore: respectGitignore,
        use_default_excludes: useDefaultExcludes,
      },
      {
        onSuccess: (started) => {
          const resolved = started.project_path ?? projectPath;
          setRecent((previous) =>
            [resolved, ...previous.filter((entry) => entry !== resolved)].slice(0, MAX_RECENT),
          );
        },
      },
    );
  };

  const percent =
    running && job.total > 0 ? Math.round((job.processed / job.total) * 100) : undefined;
  const phase = job?.phase ? (PHASE_LABELS[job.phase] ?? job.phase) : 'Starting';

  return (
    <Paper component="section" aria-labelledby="project-input-title" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography id="project-input-title" variant="h6" component="h3" gutterBottom>
        Analyze a project
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <TextField
            label="Project path"
            placeholder="/path/to/your/python/project"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            disabled={running}
            fullWidth
            required
            autoComplete="off"
            spellCheck={false}
            inputProps={{ 'aria-describedby': helpId }}
            helperText={
              <span id={helpId}>A directory on the machine where the analyzer is running.</span>
            }
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            disabled={running || start.isPending || path.trim() === ''}
            sx={{ minHeight: 56, flexShrink: 0 }}
          >
            Analyze
          </Button>
        </Stack>

        {recent.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            sx={{ mt: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Recent:
            </Typography>
            {recent.map((entry) => (
              <Chip
                key={entry}
                label={entry}
                size="small"
                variant="outlined"
                disabled={running}
                onClick={() => setPath(entry)}
                onDelete={() => setRecent((previous) => previous.filter((item) => item !== entry))}
              />
            ))}
          </Stack>
        )}

        <Accordion disableGutters elevation={0} sx={{ mt: 2, '&::before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0 }}>
            <Typography variant="body2">Options</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0 }}>
            <Stack spacing={2}>
              <TextField
                label="Exclude patterns"
                value={excludeText}
                onChange={(event) => setExcludeText(event.target.value)}
                disabled={running}
                multiline
                minRows={2}
                maxRows={6}
                placeholder={'tests/\n*_pb2.py'}
                helperText="One pattern per line, using .gitignore syntax."
                spellCheck={false}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={respectGitignore}
                    onChange={(event) => setRespectGitignore(event.target.checked)}
                    disabled={running}
                  />
                }
                label="Skip files ignored by .gitignore"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={useDefaultExcludes}
                    onChange={(event) => setUseDefaultExcludes(event.target.checked)}
                    disabled={running}
                  />
                }
                label="Skip virtual environments, caches, and build output"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>

      {start.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {start.error.message}
        </Alert>
      )}
      {job?.state === 'failed' && !start.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Analysis failed: {job.error}
        </Alert>
      )}

      {running && (
        <Box sx={{ mt: 2 }} role="status" aria-live="polite">
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Typography variant="body2">
              {phase}
              {job.total > 0 &&
                ` (${formatCount(job.processed)} of ${formatCount(job.total)} files)`}
            </Typography>
            <Button
              size="small"
              color="inherit"
              startIcon={<Cancel />}
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              Cancel
            </Button>
          </Stack>
          <LinearProgress
            aria-label="Analysis progress"
            sx={{ mt: 1, height: 8, borderRadius: 1 }}
            {...(percent === undefined
              ? { variant: 'indeterminate' as const }
              : { variant: 'determinate' as const, value: percent })}
          />
        </Box>
      )}

      {job?.has_result && !running && (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<RestartAlt />}
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
          >
            Clear results
          </Button>
        </Box>
      )}
    </Paper>
  );
}
