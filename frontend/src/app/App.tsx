import { Suspense, useCallback, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DATA_KEY, useAnalysisStatus } from '@shared/api/queries';
import { AccessibilityButton } from '@shared/components/AccessibilityButton';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ROUTES, pathForId, routeForPath } from './routes';

const APP_NAME = 'Python Code Analyzer';

function PageFallback() {
  return (
    <Box role="status" sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
      <CircularProgress aria-label="Loading page" />
    </Box>
  );
}

function NotFound() {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Page not found
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to the start page
      </Button>
    </Box>
  );
}

/** Drop cached analysis data whenever a new analysis finishes, so views refetch. */
function useRefreshOnNewAnalysis(): void {
  const client = useQueryClient();
  const status = useAnalysisStatus();
  const state = status.data?.state;
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === 'running' && state === 'completed') {
      void client.invalidateQueries({ queryKey: DATA_KEY });
    }
    previous.current = state;
  }, [client, state]);
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = routeForPath(location.pathname);
  useRefreshOnNewAnalysis();

  useEffect(() => {
    document.title = current && current.id !== 'home' ? `${current.title} · ${APP_NAME}` : APP_NAME;
  }, [current]);

  const handleViewChange = useCallback(
    (id: string) => {
      const path = pathForId(id);
      if (path) navigate(path);
    },
    [navigate],
  );

  return (
    <AppShell currentView={current?.id ?? ''} onViewChange={handleViewChange}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
        {/* A failure in one page must not take the navigation down with it. */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {ROUTES.map(({ path, component: Page }) => (
                <Route key={path} path={path} element={<Page />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Container>
      <AccessibilityButton />
    </AppShell>
  );
}
