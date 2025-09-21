# Python Code Analyzer Frontend

This is the React frontend for the Python Code Analyzer application. It provides a visual interface for analyzing Python projects with interactive mind maps and architectural overviews.

## Features

- **Project Input**: Simple interface to input Python project paths
- **Analysis Results**: Display parsed files, statistics, and code elements
- **Mind Map Visualization**: Interactive visualization of project structure
- **Reset Functionality**: Clear analysis data and start fresh
- **Responsive Design**: Works on different screen sizes

## Components

### ProjectInput
- Handles project path input and validation
- Triggers analysis and reset operations
- Shows loading states and error/success messages

### AnalysisResults
- Displays comprehensive analysis results
- Shows project statistics (files, lines, classes, functions)
- Lists parsed files and code elements
- Provides visual cards for different metrics

### MindMapViewer
- Interactive visualization of project structure
- Multiple graph types (Cytoscape, Force Graph, Vis Network)
- Node selection and detail display
- Handles both real data and sample data

## API Integration

The frontend communicates with the Python backend through REST API endpoints:
- `POST /api/analyze` - Analyze a project
- `POST /api/reset` - Reset analysis data
- `GET /api/data` - Get analysis results

## Running the Application

```bash
npm start
```

## Building for Production

```bash
npm run build
```

## Testing

```bash
npm test
```

## Technologies Used

- React 18
- Material-UI (MUI)
- React Query for data fetching
- Cytoscape.js for graph visualization
- D3.js for custom visualizations
- Axios for HTTP requests