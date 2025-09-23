import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@app/App'
import { ThemeProvider } from '@design-system/providers/ThemeProvider'
import '@design-system/styles/cssVariables.css'
import '@shared/styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)