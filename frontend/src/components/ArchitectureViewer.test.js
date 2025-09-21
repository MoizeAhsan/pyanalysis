import { render, screen } from '@testing-library/react';
import ArchitectureViewer from './ArchitectureViewer';

// Mock Cytoscape to avoid issues in test environment
jest.mock('./CytoscapeGraph', () => {
    return function MockCytoscapeGraph() {
        return <div data-testid="cytoscape-graph">Mock Cytoscape Graph</div>;
    };
});

describe('ArchitectureViewer', () => {
    test('renders architectural overview title', () => {
        render(<ArchitectureViewer />);
        const titleElement = screen.getByText(/Architectural Overview/i);
        expect(titleElement).toBeTruthy();
    });

    test('renders view type toggle buttons', () => {
        render(<ArchitectureViewer />);
        const dependenciesButton = screen.getByRole('button', { name: /dependency view/i });
        const importsButton = screen.getByRole('button', { name: /imports view/i });
        expect(dependenciesButton).toBeTruthy();
        expect(importsButton).toBeTruthy();
    });

    test('renders control switches', () => {
        render(<ArchitectureViewer />);
        const circularDepsSwitch = screen.getByText(/Show Circular Dependencies/i);
        const importsSwitch = screen.getByText(/Show Import Relationships/i);
        const modulesOnlySwitch = screen.getByText(/Modules Only/i);

        expect(circularDepsSwitch).toBeTruthy();
        expect(importsSwitch).toBeTruthy();
        expect(modulesOnlySwitch).toBeTruthy();
    });

    test('renders legend', () => {
        render(<ArchitectureViewer />);
        const legendTitle = screen.getByText(/Legend:/i);
        expect(legendTitle).toBeTruthy();
    });

    test('renders cytoscape graph', () => {
        render(<ArchitectureViewer />);
        const cytoscapeGraph = screen.getByTestId('cytoscape-graph');
        expect(cytoscapeGraph).toBeTruthy();
    });

    test('shows sample data when no analysis data provided', () => {
        render(<ArchitectureViewer data={null} />);
        // Should still render the graph with sample data
        const cytoscapeGraph = screen.getByTestId('cytoscape-graph');
        expect(cytoscapeGraph).toBeTruthy();
    });
});