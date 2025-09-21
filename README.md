# Python Code Analyzer

A comprehensive visual exploration tool for Python projects that provides interactive mind maps, architectural overviews, and detailed code relationship analysis.

## Features

- **Visual Project Exploration**: Interactive mind maps showing project structure
- **Architectural Overview**: High-level design patterns and component organization
- **Code Relationships**: Detailed analysis of classes, functions, and their usage
- **Static Analysis**: AST-based parsing without code execution
- **Scalable Design**: Handles large projects with thousands of files
- **Progressive Disclosure**: Information presented in manageable chunks
- **Visual Interface**: Designed for visual thinkers with intuitive UX

## Architecture

- **Backend**: FastAPI with Python AST parsing and NetworkX for graph analysis
- **Frontend**: React with Material-UI, D3.js, and Cytoscape.js for visualizations
- **Analysis**: Static analysis using Python's AST, astroid, and rope libraries

## Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The web interface will be available at `http://localhost:3000`

## Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── models/                 # Data models and core types
│   ├── api/                    # REST API endpoints
│   ├── analysis_engine/        # Core analysis orchestration
│   ├── parsers/                # AST parsing and code extraction
│   ├── graph/                  # Dependency graph building
│   └── analyzers/              # Pattern detection and analysis
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   └── services/           # API communication
│   └── public/                 # Static assets
└── .kiro/specs/               # Project specifications
```

## Usage

1. Start both backend and frontend servers
2. Open the web interface at `http://localhost:3000`
3. Enter the path to your Python project
4. Click "Analyze Project" to begin analysis
5. Explore the generated mind maps and architectural views

## Development Status

This project is currently in development. See the implementation tasks in `.kiro/specs/python-code-analyzer/tasks.md` for current progress and upcoming features.

## Requirements

- Python 3.8+
- Node.js 16+
- Modern web browser with JavaScript enabled