import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectInput from './components/ProjectInput';
import AnalysisResults from './components/AnalysisResults';

// Mock the API service to avoid network calls in tests
jest.mock('./services/api', () => ({
  getAnalysisData: jest.fn(() => Promise.resolve({})),
  analyzeProject: jest.fn(() => Promise.resolve({ success: true })),
  resetAnalysis: jest.fn(() => Promise.resolve({ success: true }))
}));

test('renders project input component', () => {
  render(<ProjectInput />);
  const inputElement = screen.getByLabelText(/Python Project Path/i);
  expect(inputElement).toBeInTheDocument();
});

test('renders analyze button', () => {
  render(<ProjectInput />);
  const analyzeButton = screen.getByRole('button', { name: /Analyze Project/i });
  expect(analyzeButton).toBeInTheDocument();
});

test('renders reset button', () => {
  render(<ProjectInput />);
  const resetButton = screen.getByRole('button', { name: /Reset/i });
  expect(resetButton).toBeInTheDocument();
});

test('renders analysis results component without data', () => {
  render(<AnalysisResults analysisTriggered={false} />);
  // Component should render without errors even when no data is provided
  expect(document.body).toBeInTheDocument();
});