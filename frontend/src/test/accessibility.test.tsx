import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@design-system/providers/ThemeProvider'
import { NotificationProvider } from '@shared/components/NotificationSystem'
import App from '@app/App'

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

describe('Accessibility Tests', () => {
  it('should not have any accessibility violations in the main app', async () => {
    const { container } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    
    const results = await axe(container)
    
    // Log violations for debugging if any exist
    if (results.violations.length > 0) {
      console.log('Accessibility violations:', results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length
      })))
    }
    
    expect(results.violations).toHaveLength(0)
  })

  it('should have proper heading structure', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    
    // Check for main heading
    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toBeInTheDocument()
    expect(mainHeading).toHaveTextContent('Python Code Analyzer')
  })

  it('should have accessible navigation', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    
    // Check for main navigation landmark
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toBeInTheDocument()
    
    // Check for skip link
    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
  })

  it('should support keyboard navigation', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    
    // Check that at least some interactive elements are focusable
    // Note: Some buttons may have tabindex="-1" as part of roving tabindex pattern
    const buttons = screen.getAllByRole('button')
    const focusableButtons = buttons.filter(button => 
      button.getAttribute('tabindex') !== '-1'
    )
    // At least some buttons should be focusable
    expect(focusableButtons.length).toBeGreaterThan(0)
  })

  it('should have proper ARIA labels', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )
    
    // Check theme toggle has proper label
    const themeToggle = screen.getByLabelText(/toggle.*theme/i)
    expect(themeToggle).toBeInTheDocument()
  })
})