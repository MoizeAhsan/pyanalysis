/**
 * Global Error Boundary with fallback UI and error reporting
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@shared/lib/logger';
import { Box, Typography, Button, Paper, Alert, AlertTitle, Collapse, Stack } from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    logger.error('Error boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'background.default',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              maxWidth: 600,
              width: '100%',
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />

            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600, color: 'error.main' }}
            >
              Oops! Something went wrong
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              We're sorry, but something unexpected happened. The application has encountered an
              error and needs to be refreshed. Your work may not be saved.
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                size="large"
              >
                Try Again
              </Button>

              <Button variant="outlined" onClick={this.handleReload} size="large">
                Reload Page
              </Button>
            </Stack>

            {/* Error Details (Development/Debug) */}
            {(import.meta.env.DEV || this.state.showDetails) && (
              <Box sx={{ textAlign: 'left' }}>
                <Button
                  startIcon={this.state.showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={this.toggleDetails}
                  size="small"
                  sx={{ mb: 2 }}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Error Details
                </Button>

                <Collapse in={this.state.showDetails}>
                  <Alert severity="error" icon={<BugReportIcon />} sx={{ textAlign: 'left' }}>
                    <AlertTitle>Error Details</AlertTitle>

                    {this.state.error && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Error Message:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            p: 1,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {this.state.error.message}
                        </Typography>
                      </Box>
                    )}

                    {this.state.error?.stack && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Stack Trace:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            p: 1,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            maxHeight: 200,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {this.state.error.stack}
                        </Typography>
                      </Box>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Component Stack:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            p: 1,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            maxHeight: 200,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Typography>
                      </Box>
                    )}
                  </Alert>
                </Collapse>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
              If this problem persists, please contact support with the error details above.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Feature-specific error boundary for isolated error handling
interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function FeatureErrorBoundary({
  children,
  featureName,
  onError,
}: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={
        <Alert
          severity="error"
          sx={{
            m: 2,
            borderRadius: 2,
          }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Reload
            </Button>
          }
        >
          <AlertTitle>Error in {featureName}</AlertTitle>
          Something went wrong while loading this feature. Please try reloading the page.
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
