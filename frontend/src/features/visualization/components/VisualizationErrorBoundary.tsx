import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Alert, AlertTitle } from '@mui/material';
import { Refresh, BugReport } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class VisualizationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console for debugging
    console.error('Visualization Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            p: 3,
            textAlign: 'center'
          }}
        >
          <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
            <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport />
              Visualization Error
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              There was an error loading the visualization component. This might be due to:
            </Typography>
            <Box component="ul" sx={{ textAlign: 'left', pl: 2 }}>
              <li>Large dataset causing memory issues</li>
              <li>Invalid data format</li>
              <li>Browser compatibility issues</li>
              <li>Network connectivity problems</li>
            </Box>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              color="primary"
            >
              Retry Visualization
            </Button>
          </Box>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 1,
                maxWidth: 800,
                overflow: 'auto'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Error Details (Development Mode):
              </Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default VisualizationErrorBoundary;