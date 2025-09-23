import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByText('Visual Python Project Explorer')).toBeInTheDocument()
  })

  it('renders the Python Code Analyzer title', () => {
    render(<App />)
    expect(screen.getByText('Python Code Analyzer')).toBeInTheDocument()
  })
})