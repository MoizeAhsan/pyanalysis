import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  Grow,
  Fade,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// Notification Context
const NotificationContext = createContext();

/**
 * Custom hook to use notifications
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Slide transition component
 */
const SlideTransition = (props) => {
  return <Slide {...props} direction="up" />;
};

/**
 * Enhanced notification component with animations and better UX
 */
const EnhancedNotification = ({
  notification,
  onClose,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  transition = 'slide',
}) => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (notification.autoHide !== false) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration || 6000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway' && !notification.clickAwayClose) {
      return;
    }
    setOpen(false);
    setTimeout(() => onClose(notification.id), 200);
  };

  const getTransitionComponent = () => {
    switch (transition) {
      case 'grow':
        return Grow;
      case 'fade':
        return Fade;
      case 'slide':
      default:
        return SlideTransition;
    }
  };

  const getIcon = () => {
    switch (notification.severity) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return null;
    }
  };

  const TransitionComponent = getTransitionComponent();

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
      TransitionComponent={TransitionComponent}
      sx={{
        '& .MuiSnackbarContent-root': {
          padding: 0,
        },
      }}
    >
      <Alert
        severity={notification.severity}
        onClose={notification.closable !== false ? handleClose : undefined}
        icon={notification.icon !== false ? getIcon() : false}
        sx={{
          minWidth: 300,
          maxWidth: 500,
          borderRadius: 2,
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
          border: `1px solid ${
            notification.severity === 'success' ? '#4caf50' :
            notification.severity === 'error' ? '#f44336' :
            notification.severity === 'warning' ? '#ff9800' :
            '#2196f3'
          }20`,
          '& .MuiAlert-icon': {
            fontSize: '1.5rem',
          },
          '& .MuiAlert-message': {
            padding: '8px 0',
          },
          animation: 'slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '@keyframes slideInUp': {
            from: {
              transform: 'translateY(100%)',
              opacity: 0,
            },
            to: {
              transform: 'translateY(0)',
              opacity: 1,
            },
          },
        }}
      >
        {notification.title && (
          <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
            {notification.title}
          </AlertTitle>
        )}
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
          {notification.message}
        </Typography>
        
        {notification.actions && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            {notification.actions.map((action, index) => (
              <IconButton
                key={index}
                size="small"
                onClick={() => {
                  action.onClick();
                  if (action.closeOnClick !== false) {
                    handleClose();
                  }
                }}
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                {action.icon}
              </IconButton>
            ))}
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
};

/**
 * Notification Provider component
 */
export const NotificationProvider = ({ children, maxNotifications = 3 }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      severity: 'info',
      duration: 6000,
      closable: true,
      clickAwayClose: false,
      autoHide: true,
      icon: true,
      ...notification,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      // Keep only the latest notifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Convenience methods
  const showSuccess = (message, options = {}) => {
    return addNotification({
      message,
      severity: 'success',
      ...options,
    });
  };

  const showError = (message, options = {}) => {
    return addNotification({
      message,
      severity: 'error',
      duration: 8000, // Longer duration for errors
      ...options,
    });
  };

  const showWarning = (message, options = {}) => {
    return addNotification({
      message,
      severity: 'warning',
      ...options,
    });
  };

  const showInfo = (message, options = {}) => {
    return addNotification({
      message,
      severity: 'info',
      ...options,
    });
  };

  const contextValue = {
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    notifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render notifications */}
      {notifications.map((notification, index) => (
        <EnhancedNotification
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        />
      ))}
    </NotificationContext.Provider>
  );
};

/**
 * Toast notification component for quick messages
 */
export const Toast = {
  success: (message, options = {}) => {
    // This would be used with the notification context
    console.log('Success:', message);
  },
  error: (message, options = {}) => {
    console.log('Error:', message);
  },
  warning: (message, options = {}) => {
    console.log('Warning:', message);
  },
  info: (message, options = {}) => {
    console.log('Info:', message);
  },
};

export default EnhancedNotification;