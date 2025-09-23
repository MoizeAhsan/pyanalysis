import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@app/App'
import { ThemeProvider } from '@design-system/providers/ThemeProvider'
import { ErrorBoundary } from '@app/components/ErrorBoundary'
import { NotificationProvider } from '@shared/components/NotificationSystem'
import '@design-system/styles/cssVariables.css'
import '@shared/styles/global.css'
import '@shared/styles/accessibility.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // In production, you might want to send this to an error reporting service
        console.error('Global error caught:', error, errorInfo);
      }}
    >
      <ThemeProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)