/**
 * Live region components for dynamic content announcements
 */

import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  id?: string;
  children?: never;
}

/**
 * A live region that announces messages to screen readers
 */
export function LiveRegion({ message, priority = 'polite', atomic = true, id }: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const previousMessage = useRef<string>('');

  useEffect(() => {
    // Only announce if the message has changed
    if (message !== previousMessage.current && regionRef.current) {
      // Clear the region first, then set the new message
      // This ensures the screen reader will announce it
      regionRef.current.textContent = '';
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
          previousMessage.current = message;
        }
      }, 10);
    }
  }, [message]);

  return (
    <Box
      ref={regionRef}
      id={id}
      aria-live={priority}
      aria-atomic={atomic}
      sx={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
      role="status"
    />
  );
}

/**
 * A polite live region for non-urgent announcements
 */
export function PoliteLiveRegion(props: Omit<LiveRegionProps, 'priority'>) {
  return <LiveRegion {...props} priority="polite" />;
}

/**
 * An assertive live region for urgent announcements
 */
export function AssertiveLiveRegion(props: Omit<LiveRegionProps, 'priority'>) {
  return <LiveRegion {...props} priority="assertive" />;
}

/**
 * Hook for managing live region announcements
 */
export function useLiveRegion(priority: 'polite' | 'assertive' = 'polite') {
  const regionId = `live-region-${Date.now()}`;
  
  const announce = (message: string, customPriority?: 'polite' | 'assertive') => {
    const element = document.getElementById(regionId);
    if (element) {
      // Update the priority if needed
      if (customPriority && customPriority !== priority) {
        element.setAttribute('aria-live', customPriority);
      }
      
      // Clear and set the message
      element.textContent = '';
      setTimeout(() => {
        if (element) {
          element.textContent = message;
        }
      }, 10);
    }
  };

  const LiveRegionComponent = ({ message }: { message: string }) => (
    <LiveRegion id={regionId} message={message} priority={priority} />
  );

  return {
    announce,
    LiveRegionComponent,
    regionId,
  };
}

/**
 * Status announcer for form submissions, loading states, etc.
 */
interface StatusAnnouncerProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
}

export function StatusAnnouncer({
  status,
  loadingMessage = 'Loading...',
  successMessage = 'Operation completed successfully',
  errorMessage = 'An error occurred',
}: StatusAnnouncerProps) {
  const getMessage = () => {
    switch (status) {
      case 'loading':
        return loadingMessage;
      case 'success':
        return successMessage;
      case 'error':
        return errorMessage;
      default:
        return '';
    }
  };

  const getPriority = (): 'polite' | 'assertive' => {
    return status === 'error' ? 'assertive' : 'polite';
  };

  return (
    <LiveRegion
      message={getMessage()}
      priority={getPriority()}
    />
  );
}