import { useSyncExternalStore } from 'react';
import { Alert, Button } from '@mui/material';
import { ApiError } from '@shared/api/client';
import { useBackendHealth } from '@shared/api/queries';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Whether the browser believes it has a network connection. */
function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Says when the browser is offline or the analyzer backend cannot be reached.
 * Results already on screen stay usable; requests resume on reconnection.
 */
export function ConnectionBanner() {
  const online = useOnline();
  const health = useBackendHealth();
  const unreachable = health.error instanceof ApiError && health.error.code === 'network_error';

  if (!online) {
    return (
      <Alert severity="warning" role="status" sx={{ mb: 2 }}>
        You are offline. Results already loaded stay available; new data loads when you reconnect.
      </Alert>
    );
  }
  if (unreachable) {
    return (
      <Alert
        severity="error"
        role="status"
        sx={{ mb: 2 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => void health.refetch()}
            disabled={health.isFetching}
          >
            Retry now
          </Button>
        }
      >
        Cannot reach the analyzer backend. Results already loaded stay available; checking again
        every 15 seconds.
      </Alert>
    );
  }
  return null;
}
