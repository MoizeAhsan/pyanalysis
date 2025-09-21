import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisResults from './AnalysisResults';

// Mock the API service
jest.mock('../services/api', () => ({
    getAnalysisData: jest.fn(() => Promise.resolve({
        project_name: 'test-project',
        modules_count: 145,
        classes_count: 8,
        functions_count: 50,
        total_files: 145,
        total_lines: 5400,
        modules: [],
        classes: [],
        functions: [],
        imports: []
    }))
}));

test('does not render when analysis is not triggered', () => {
    render(<AnalysisResults analysisTriggered={false} />);

    // Component should not render anything when analysis is not triggered
    expect(screen.queryByText('Analysis Results')).not.toBeInTheDocument();
});

test('renders loading state when analysis is triggered', () => {
    render(<AnalysisResults analysisTriggered={true} />);

    // Should show loading initially
    expect(screen.getByText('Loading analysis results...')).toBeInTheDocument();
});