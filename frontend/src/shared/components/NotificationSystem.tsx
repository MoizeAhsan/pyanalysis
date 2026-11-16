/**
 * Global Notification System with Toast Messages
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Alert, AlertTitle, IconButton, Slide, Stack, Portal, Box } from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (message: string, options?: Partial<Notification>) => string;
  error: (message: string, options?: Partial<Notification>) => string;
  warning: (message: string, options?: Partial<Notification>) => string;
  info: (message: string, options?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  maxNotifications = 5,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id'>) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const newNotification: Notification = {
        id,
        duration: 6000, // Default 6 seconds
        ...notification,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Limit the number of notifications
        return updated.slice(0, maxNotifications);
      });

      // Auto-remove non-persistent notifications
      if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    [maxNotifications, removeNotification],
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, options?: Partial<Notification>) => {
      return addNotification({ type: 'success', message, ...options });
    },
    [addNotification],
  );

  const error = useCallback(
    (message: string, options?: Partial<Notification>) => {
      return addNotification({
        type: 'error',
        message,
        duration: 8000, // Errors stay longer
        ...options,
      });
    },
    [addNotification],
  );

  const warning = useCallback(
    (message: string, options?: Partial<Notification>) => {
      return addNotification({ type: 'warning', message, ...options });
    },
    [addNotification],
  );

  const info = useCallback(
    (message: string, options?: Partial<Notification>) => {
      return addNotification({ type: 'info', message, ...options });
    },
    [addNotification],
  );

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 70, sm: 88 }, // Smaller offset on mobile
          right: { xs: 8, sm: 16 },
          left: { xs: 8, sm: 'auto' },
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <Stack spacing={1} sx={{ maxWidth: { xs: '100%', sm: 400 } }}>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </Stack>
      </Box>
    </Portal>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Slide direction="left" in={true} mountOnEnter unmountOnExit>
      <Alert
        severity={notification.type}
        icon={getIcon()}
        sx={{
          pointerEvents: 'auto',
          minWidth: { xs: 'auto', sm: 280 },
          maxWidth: { xs: '100%', sm: 400 },
          boxShadow: 3,
          borderRadius: 2,
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          py: { xs: 0.5, sm: 1 },
          '& .MuiAlert-message': {
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          '& .MuiAlert-icon': {
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          },
        }}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {notification.action && (
              <IconButton
                size="small"
                onClick={notification.action.onClick}
                sx={{ color: 'inherit' }}
                aria-label={notification.action.label}
              >
                {notification.action.label}
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: 'inherit' }}
              aria-label="Close notification"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        }
      >
        {notification.title && (
          <AlertTitle sx={{ fontWeight: 600 }}>{notification.title}</AlertTitle>
        )}
        {notification.message}
      </Alert>
    </Slide>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
