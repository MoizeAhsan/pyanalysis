# Design Document: Analysis Data Fetch Fix

## Overview

This design addresses the critical bug where the `AnalysisResults` component uses hardcoded mock data instead of fetching real analysis results from the backend API. The fix involves replacing the mock data with actual API calls to the `/api/data` endpoint and properly integrating with the application's state management.

## Architecture

The fix follows the existing architecture pattern:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ProjectInput   │────▶│  Backend API    │────▶│ current_session │
│  (triggers      │     │  /api/analyze   │     │ (stores results)│
│   analysis)     │     └─────────────────┘     └─────────────────┘
└─────────────────┘                                      │
        │                                                │
        ▼                                                ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ AnalysisResults │────▶│  Backend API    │────▶│ Returns stored  │
│ (fetches data)  │     │  /api/data      │     │ analysis data   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│  Zustand Store  │
│  (appStore)     │
└─────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Other Views (MindMap, Architecture, CodeExplorer)      │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Modified Component: AnalysisResults

**Current Implementation (Broken):**
- Uses hardcoded `mockAnalysisData` object
- Never calls the API
- Always displays the same data regardless of which project is analyzed

**New Implementation:**
- Calls `apiService.getAnalysisData()` when `analysisTriggered` becomes true
- Handles loading, success, and error states properly
- Passes real data to `onDataLoaded` callback for storage in Zustand

### API Service (Existing)

The `apiService.getAnalysisData()` method already exists and is correctly implemented:

```typescript
async getAnalysisData(): Promise<ApiResponse<AnalysisData>> {
  const response = await this.client.get('/api/data');
  return response.data;
}
```

### State Management (Existing)

The Zustand store already has the correct structure:
- `analysisData: AnalysisData | null` - stores the analysis results
- `setAnalysisData(data)` - action to update the data
- Data is shared across all views (MindMap, Architecture, CodeExplorer)

## Data Models

The `AnalysisData` interface is already defined in `frontend/src/shared/types/index.ts`:

```typescript
interface AnalysisData {
  has_data: boolean;
  project_info?: ProjectInfo;
  modules: CodeElement[];
  classes: CodeElement[];
  functions: CodeElement[];
  dependency_graph?: DependencyGraph;
  architectural_patterns: ArchitecturalPattern[];
  statistics: {
    total_elements: number;
    modules_count: number;
    classes_count: number;
    functions_count: number;
    patterns_count: number;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Fresh Data Fetch on Analysis Complete

*For any* project path that is successfully analyzed, when the analysis completes, the AnalysisResults component should fetch data from the `/api/data` endpoint and the displayed project name should match the analyzed project's name.

**Validates: Requirements 1.1, 1.5**

### Property 2: Data Rendering Consistency

*For any* valid AnalysisData object returned from the API, the rendered UI should display the correct project name, and the counts shown (modules, classes, functions) should match the lengths of the corresponding arrays in the data.

**Validates: Requirements 1.3**

### Property 3: Data Consistency Across Views

*For any* analysis data loaded into the application state, switching between views (home, mindmap, architecture, code-explorer) should not trigger additional API calls, and all views should receive the same data object reference.

**Validates: Requirements 2.2**

## Error Handling

1. **API Request Failure**: Display an error alert with the error message from the API
2. **Network Timeout**: Show a timeout error and allow retry
3. **No Data Available**: Display a message prompting the user to analyze a project first
4. **Invalid Data Format**: Log the error and display a generic error message

## Testing Strategy

### Unit Tests

Unit tests will verify:
- Component renders loading state while fetching
- Component renders error state on API failure
- Component renders data correctly when API succeeds
- `onDataLoaded` callback is called with the correct data

### Property-Based Tests

Property-based testing will use **fast-check** library for TypeScript/JavaScript.

Each property test will:
1. Generate random valid AnalysisData objects
2. Verify that the component correctly renders the data
3. Run a minimum of 100 iterations

**Test File Location**: `frontend/src/features/analysis/components/AnalysisResults.test.tsx`

**Property Test Format**:
```typescript
// **Feature: analysis-data-fetch-fix, Property 1: Fresh Data Fetch on Analysis Complete**
// **Validates: Requirements 1.1, 1.5**
test.prop([validAnalysisDataArbitrary])('displays correct project name', (data) => {
  // Test implementation
});
```
