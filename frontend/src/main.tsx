import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from '@app/App';
import { ErrorBoundary } from '@app/components/ErrorBoundary';
import { ThemeProvider } from '@design-system/providers/ThemeProvider';
import { createQueryClient } from '@shared/api/queries';
import { NotificationProvider } from '@shared/components/NotificationSystem';
import { logger } from '@shared/lib/logger';
import '@design-system/styles/cssVariables.css';
import '@shared/styles/global.css';
import '@shared/styles/accessibility.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const queryClient = createQueryClient();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary onError={(error, info) => logger.error('Unhandled UI error', error, info)}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
