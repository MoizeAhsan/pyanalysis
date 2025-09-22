import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeExplorer from './CodeExplorer';

// Mock data for testing
const mockData = {
  data: {
    modules: [
      {
        id: 'test_module',
        name: 'test_module',
        type: 'module',
        location: { file_path: '/project/test_module.py', line_number: 1 },
        docstring: 'Test module for unit testing',
        dependencies: ['unittest', 'mock'],
        usages: [
          {
            location: { file_path: '/project/main.py', line_number: 5, column_number: 1 },
            context: 'import test_module',
            usage_type: 'import'
          }
        ]
      }
    ],
    classes: [
      {
        id: 'test_class',
        name: 'TestClass',
        type: 'class',
        location: { file_path: '/project/models.py', line_number: 10 },
        docstring: 'A test class for demonstration',
        parameters: [
          { name: 'name', type_hint: 'str' },
          { name: 'value', type_hint: 'int', default_value: '0' }
        ],
        decorators: ['dataclass'],
        dependencies: ['dataclasses'],
        usages: [
          {
            location: { file_path: '/project/views.py', line_number: 15, column_number: 8 },
            context: 'instance = TestClass(name="test", value=42)',
            usage_type: 'call'
          }
        ]
      }
    ],
    functions: [
      {
        id: 'test_function',
        name: 'test_function',
        type: 'function',
        location: { file_path: '/project/utils.py', line_number: 25 },
        docstring: 'A test function that processes data',
        parameters: [
          { name: 'data', type_hint: 'List[str]' },
          { name: 'options', type_hint: 'Optional[Dict]', default_value: 'None' }
        ],
        return_type: 'bool',
        decorators: ['staticmethod'],
        dependencies: ['typing'],
        usages: [
          {
            location: { file_path: '/project/main.py', line_number: 45, column_number: 12 },
            context: 'result = test_function(input_data)',
            usage_type: 'call'
          }
        ]
      }
    ]
  }
};

describe('CodeExplorer', () => {
  test('renders without crashing', () => {
    render(<CodeExplorer />);
    expect(screen.getByText('Code Explorer')).toBeInTheDocument();
  });

  test('displays search input and filters', () => {
    render(<CodeExplorer data={mockData} />);
    
    expect(screen.getByPlaceholderText('Search elements...')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
  });

  test('displays statistics correctly', () => {
    render(<CodeExplorer data={mockData} />);
    
    expect(screen.getByText('1 Modules')).toBeInTheDocument();
    expect(screen.getByText('1 Classes')).toBeInTheDocument();
    expect(screen.getByText('1 Functions')).toBeInTheDocument();
  });

  test('displays elements in the list', () => {
    render(<CodeExplorer data={mockData} />);
    
    expect(screen.getByText('test_module')).toBeInTheDocument();
    expect(screen.getByText('TestClass')).toBeInTheDocument();
    expect(screen.getByText('test_function')).toBeInTheDocument();
  });

  test('filters elements by type', async () => {
    render(<CodeExplorer data={mockData} />);
    
    // Click on the Type filter dropdown
    const typeFilter = screen.getByLabelText('Type');
    fireEvent.mouseDown(typeFilter);
    
    // Select "Classes" option
    const classesOption = screen.getByText('Classes');
    fireEvent.click(classesOption);
    
    await waitFor(() => {
      expect(screen.getByText('TestClass')).toBeInTheDocument();
      expect(screen.queryByText('test_module')).not.toBeInTheDocument();
      expect(screen.queryByText('test_function')).not.toBeInTheDocument();
    });
  });

  test('searches elements by name', async () => {
    render(<CodeExplorer data={mockData} />);
    
    const searchInput = screen.getByPlaceholderText('Search elements...');
    fireEvent.change(searchInput, { target: { value: 'TestClass' } });
    
    await waitFor(() => {
      expect(screen.getByText('TestClass')).toBeInTheDocument();
      expect(screen.queryByText('test_module')).not.toBeInTheDocument();
      expect(screen.queryByText('test_function')).not.toBeInTheDocument();
    });
  });

  test('selects element and shows details', async () => {
    render(<CodeExplorer data={mockData} />);
    
    // Click on TestClass element
    const testClassElement = screen.getByText('TestClass');
    fireEvent.click(testClassElement);
    
    await waitFor(() => {
      // Should show element details in the right panel
      expect(screen.getByText('TestClass')).toBeInTheDocument();
      expect(screen.getByText('A test class for demonstration')).toBeInTheDocument();
    });
  });

  test('expands element to show detailed information', async () => {
    render(<CodeExplorer data={mockData} />);
    
    // Find and click the expand button for TestClass
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('[data-testid="ExpandMoreIcon"]')
    );
    
    if (expandButton) {
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('Element Details')).toBeInTheDocument();
        expect(screen.getByText('Parameters:')).toBeInTheDocument();
        expect(screen.getByText('Decorators:')).toBeInTheDocument();
      });
    }
  });

  test('shows usage information when element is expanded', async () => {
    render(<CodeExplorer data={mockData} />);
    
    // Click on TestClass element to select it
    const testClassElement = screen.getByText('TestClass');
    fireEvent.click(testClassElement);
    
    // Find and click the expand button
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('[data-testid="ExpandMoreIcon"]')
    );
    
    if (expandButton) {
      fireEvent.click(expandButton);
      
      await waitFor(() => {
        expect(screen.getByText('Usage Locations (1)')).toBeInTheDocument();
        expect(screen.getByText('instance = TestClass(name="test", value=42)')).toBeInTheDocument();
      });
    }
  });

  test('handles empty data gracefully', () => {
    const emptyData = { data: { modules: [], classes: [], functions: [] } };
    render(<CodeExplorer data={emptyData} />);
    
    expect(screen.getByText('No elements found')).toBeInTheDocument();
    expect(screen.getByText('0 Modules')).toBeInTheDocument();
    expect(screen.getByText('0 Classes')).toBeInTheDocument();
    expect(screen.getByText('0 Functions')).toBeInTheDocument();
  });

  test('shows placeholder when no element is selected', () => {
    render(<CodeExplorer data={mockData} />);
    
    expect(screen.getByText('Select an element to view details')).toBeInTheDocument();
    expect(screen.getByText('Click on any element from the list to see detailed information and usage patterns')).toBeInTheDocument();
  });

  test('switches between tabs in element details', async () => {
    render(<CodeExplorer data={mockData} />);
    
    // Select an element first
    const testClassElement = screen.getByText('TestClass');
    fireEvent.click(testClassElement);
    
    await waitFor(() => {
      // Should see the tabs
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Usages (1)')).toBeInTheDocument();
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
    });
    
    // Click on Usages tab
    const usagesTab = screen.getByText('Usages (1)');
    fireEvent.click(usagesTab);
    
    await waitFor(() => {
      expect(screen.getByText('Usage Locations (1)')).toBeInTheDocument();
    });
    
    // Click on Dependencies tab
    const dependenciesTab = screen.getByText('Dependencies');
    fireEvent.click(dependenciesTab);
    
    await waitFor(() => {
      expect(screen.getByText('Dependencies (1)')).toBeInTheDocument();
      expect(screen.getByText('dataclasses')).toBeInTheDocument();
    });
  });
});