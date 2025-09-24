import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@design-system/providers/ThemeProvider'
import { NotificationProvider } from '@shared/components/NotificationSystem'
import App from './App'

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <CssBaseline />
        {children}
      </NotificationProvider>
    </ThemeProvider>
  )
}

describe('App', () => {
  it('renders the main heading', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    expect(screen.getByText('Visual Python Project Explorer')).toBeInTheDocument()
  })

  it('renders the Python Code Analyzer title', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    expect(screen.getByText('Python Code Analyzer')).toBeInTheDocument()
  })
})