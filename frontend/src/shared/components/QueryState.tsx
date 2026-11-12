import type { ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button, CircularProgress, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ApiError } from '@shared/api/client';

interface QueryStateProps {
  isPending: boolean;
  error: Error | null;
  onRetry?: (() => void) | undefined;
  /** Shown instead of the spinner text, e.g. "Loading graph". */
  loadingLabel?: string | undefined;
  children: ReactNode;
}

/**
 * Renders the loading and error states shared by every data view, and the
 * children once data is available. A missing analysis gets its own message
 * with a link back to the start page instead of a generic error.
 */
export function QueryState({ isPending, error, onRetry, loadingLabel, children }: QueryStateProps) {
  if (error) {
    if (error instanceof ApiError && error.code === 'no_analysis') {
      return <NoAnalysis />;
    }
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        <AlertTitle>Something went wrong</AlertTitle>
        {error.message}
      </Alert>
    );
  }
  if (isPending) {
    return (
      <Box
        role="status"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}
      >
        <CircularProgress size={24} aria-hidden="true" />
        <Typography color="text.secondary">{loadingLabel ?? 'Loading'}…</Typography>
      </Box>
    );
  }
  return <>{children}</>;
}

export function NoAnalysis() {
  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <Typography variant="h6" component="p" gutterBottom>
        No project has been analyzed yet
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Analyze a project to explore its structure here.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Analyze a project
      </Button>
    </Box>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <Typography component="p" gutterBottom>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
}
