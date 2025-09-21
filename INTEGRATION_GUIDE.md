# Python Code Analyzer - Integration Guide

## Overview

The Python Code Analyzer is now fully integrated with all MVP components working together. This guide explains how to use the complete application.

## Architecture

The application consists of:
- **Backend**: FastAPI server with analysis engine (Port 8000)
- **Frontend**: React application with visualizations (Port 3000)
- **Integration**: Seamless communication between frontend and backend

## Starting the Application

### 1. Start the Backend

```bash
cd backend
python main.py
```

The backend will start on `http://localhost:8000`

### 2. Start the Frontend

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## Using the Application

### 1. Access the Web Interface

Open your browser and navigate to `http://localhost:3000`

### 2. Analyze a Python Project

1. Enter the full path to a Python project in the input field
2. Click "Analyze Project"
3. Wait for the analysis to complete (progress indicators will show)
4. View the results in the Analysis Results section
5. Explore the interactive mind map visualization

### 3. Reset and Analyze Another Project

1. Click the "Reset" button to clear current analysis
2. Enter a new project path
3. Repeat the analysis process

## Features Integrated

### ✅ Core Analysis Engine
- Recursive Python file scanning
- AST parsing for code structure extraction
- Dependency graph generation
- Error handling for syntax errors and inaccessible files

### ✅ API Layer
- RESTful endpoints for analysis operations
- Proper error handling and validation
- Session management with reset functionality
- JSON serialization of complex data structures

### ✅ Web Interface
- Responsive React application
- Real-time loading states and progress indicators
- Error handling with user-friendly messages
- Success notifications and feedback

### ✅ Mind Map Visualization
- Interactive Cytoscape.js graphs
- Visual differentiation for modules, classes, and functions
- Node selection with detailed information panels
- Multiple visualization options (Cytoscape, Vis Network)

### ✅ Data Integration
- Seamless data flow from backend to frontend
- Proper data transformation for visualizations
- Comprehensive project statistics and metrics
- Detailed code element information

## Testing

### Automated Tests

Run the integration test to verify everything works:

```bash
python test_integration.py
```

Run the end-to-end test with the actual backend project:

```bash
python test_e2e.py
```

### Manual Testing

1. **Basic Flow**: Analyze a simple Python project
2. **Large Project**: Test with a complex project (like the backend itself)
3. **Error Cases**: Try invalid paths, empty inputs, non-Python directories
4. **Reset Functionality**: Reset and analyze different projects
5. **Visualization**: Interact with the mind map, click nodes, explore relationships

## Sample Test Projects

### Small Test Project
Use the sample project created by `test_integration.py` or create your own with:
- A few Python files
- Classes and functions
- Import relationships

### Medium Test Project
Use the backend project itself:
```
/path/to/python-code-analyzer/backend
```

### Large Test Project
Try analyzing any substantial Python project on your system.

## Troubleshooting

### Backend Issues
- **Port 8000 in use**: Change port in `backend/main.py`
- **Module import errors**: Ensure all dependencies are installed
- **Permission errors**: Check file system permissions for the project path

### Frontend Issues
- **Port 3000 in use**: React will offer an alternative port
- **API connection errors**: Ensure backend is running on port 8000
- **Visualization not loading**: Check browser console for JavaScript errors

### Integration Issues
- **CORS errors**: Backend is configured for localhost:3000
- **Data not loading**: Check network tab in browser dev tools
- **Analysis fails**: Verify the project path exists and contains Python files

## Performance Notes

- **Large projects**: Analysis may take several seconds for projects with hundreds of files
- **Memory usage**: Large projects will use more memory for graph storage
- **Visualization**: Complex graphs may take time to render and layout

## Next Steps

The MVP integration is complete. Future enhancements could include:
- Enhanced architectural pattern detection
- Search and filtering capabilities
- Export functionality for analysis results
- Performance optimizations for very large projects
- Additional visualization types and layouts

## API Endpoints

- `GET /`: Root endpoint with API information
- `POST /api/analyze`: Analyze a Python project
- `POST /api/reset`: Reset current analysis session
- `GET /api/data`: Retrieve all analysis data

## Data Flow

1. User enters project path in frontend
2. Frontend sends POST request to `/api/analyze`
3. Backend analyzes project and stores results in session
4. Frontend receives analysis confirmation
5. Frontend requests detailed data from `/api/data`
6. Backend returns serialized analysis results
7. Frontend displays results and renders visualizations
8. User can reset and start over with `/api/reset`

## Success Criteria Met

✅ **Connected all components**: Backend, API, and frontend work together seamlessly
✅ **Added loading states**: Progress indicators during analysis
✅ **Error handling**: Comprehensive error handling throughout the application
✅ **End-to-end functionality**: Complete workflow from project input to visualization
✅ **Code quality**: Mypy and pylint checks pass with minimal warnings

The Python Code Analyzer MVP is now fully integrated and ready for use!