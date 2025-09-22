import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchInterface from './SearchInterface';
import apiService from '../services/api';

// Mock the API service
jest.mock('../services/api');

// Mock lodash debounce to make tests synchronous
jest.mock('lodash', () => ({
  debounce: (fn) => fn,
}));

const mockData = {
  data: {
    has_data: true,
    modules: [
      {
        id: 'test_module',
        name: 'test_module',
        type: 'module',
        location: { file_path: '/project/test_module.py', line_number: 1 },
        docstring: 'Test module for unit testing',
        dependencies: ['unittest'],
        usages: []
      }
    ],
    classes: [
      {
        id: 'test_class',
        name: 'TestClass',
        type: 'class',
        location: { file_path: '/project/models.py', line_number: 10 },
        docstring: 'A test class for demonstration',
        parameters: [],
        decorators: [],
        dependencies: [],
        usages: []
      }
    ],
    functions: [
      {
        id: 'test_function',
        name: 'test_function',
        type: 'function',
        location: { file_path: '/project/utils.py', line_number: 25 },
        docstring: 'A test function that processes data',
        parameters: [],
        return_type: 'bool',
        decorators: [],
        dependencies: [],
        usages: []
      }
    ]
  }
};

describe('SearchInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders search interface with no data', () => {
    render(<SearchInterface data={null} />);
    
    expect(screen.getByText('No analysis data available')).toBeInTheDocument();
    expect(screen.getByText('Please analyze a project first to enable search functionality.')).toBeInTheDocument();
  });

  test('renders search interface with data', () => {
    render(<SearchInterface data={mockData} />);
    
    expect(screen.getByPlaceholderText('Search classes, functions, modules...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('performs search when query is entered', async () => {
    const mockSearchResults = {
      success: true,
      data: {
        results: [
          {
            element: mockData.data.classes[0],
            match_type: 'name',
            match_text: 'TestClass'
          }
        ],
        query: 'test',
        total_results: 1
      }
    };

    apiService.searchElements.mockResolvedValue(mockSearchResults);

    render(<SearchInterface data={mockData} />);
    
    const searchInput = screen.getByPlaceholderText('Search classes, functions, modules...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(apiService.searchElements).toHaveBeenCalledWith('test', null);
    });

    await waitFor(() => {
      expect(screen.getByText('Found 1 results')).toBeInTheDocument();
    });
  });

  test('filters by element type', async () => {
    const mockSearchResults = {
      success: true,
      data: {
        results: [
          {
            element: mockData.data.classes[0],
            match_type: 'name',
            match_text: 'TestClass'
          }
        ],
        query: 'test',
        element_type: 'class',
        total_results: 1
      }
    };

    apiService.searchElements.mockResolvedValue(mockSearchResults);

    render(<SearchInterface data={mockData} />);
    
    const searchInput = screen.getByPlaceholderText('Search classes, functions, modules...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const typeSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(typeSelect);
    fireEvent.click(screen.getByText('Classes'));

    await waitFor(() => {
      expect(apiService.searchElements).toHaveBeenCalledWith('test', 'class');
    });
  });

  test('calls onElementSelect when element is clicked', async () => {
    const mockOnElementSelect = jest.fn();
    const mockSearchResults = {
      success: true,
      data: {
        results: [
          {
            element: mockData.data.classes[0],
            match_type: 'name',
            match_text: 'TestClass'
          }
        ],
        query: 'test',
        total_results: 1
      }
    };

    apiService.searchElements.mockResolvedValue(mockSearchResults);

    render(<SearchInterface data={mockData} onElementSelect={mockOnElementSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Search classes, functions, modules...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('TestClass')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('TestClass'));
    expect(mockOnElementSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockData.data.classes[0],
        elementType: 'class',
        icon: expect.any(Object)
      })
    );
  });

  test('handles search errors', async () => {
    apiService.searchElements.mockRejectedValue(new Error('Search failed'));

    render(<SearchInterface data={mockData} />);
    
    const searchInput = screen.getByPlaceholderText('Search classes, functions, modules...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Search failed: Search failed')).toBeInTheDocument();
    });
  });

  test('clears search when clear button is clicked', () => {
    render(<SearchInterface data={mockData} />);
    
    const searchInput = screen.getByPlaceholderText('Search classes, functions, modules...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const clearButton = screen.getByRole('button', { name: '' }); // Clear button
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe('');
  });

  test('shows no results message when search returns empty', async () => {
    const mockSearchResults = {
      success: true,
      data: {
        results: [],
        query: 'nonexistent',
        total_results: 0
      }
    };

    apiService.searchElements.mockResolvedValue(mockSearchResults);

    render(<SearchInterface data={mockData} />);
    
    const searchInput = screen.getByPlaceholderText('Search classes, functions, modules...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search query or filter type.')).toBeInTheDocument();
    });
  });
});