# Requirements Document

## Introduction

This document specifies the requirements for fixing the analysis data fetching issue in the Python Code Analyzer frontend. Currently, the `AnalysisResults` component uses hardcoded mock data instead of fetching real analysis results from the backend API. This causes the frontend to display stale/incorrect data when analyzing different projects.

## Glossary

- **AnalysisResults Component**: The React component responsible for displaying analysis results after a project is analyzed
- **Analysis Data**: The structured data returned by the backend containing project information, modules, classes, functions, dependencies, and architectural patterns
- **API Service**: The frontend service layer that communicates with the backend REST API
- **Backend Session**: The server-side storage that holds the current analysis results (via `current_session`)

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the actual analysis results for the project I just analyzed, so that I can explore my project's code structure accurately.

#### Acceptance Criteria

1. WHEN the analysis completes successfully THEN the AnalysisResults component SHALL fetch real data from the `/api/data` endpoint
2. WHEN fetching analysis data THEN the system SHALL display a loading indicator until data is received
3. WHEN the API returns analysis data THEN the system SHALL update the UI with the actual project information, modules, classes, and functions
4. IF the API request fails THEN the system SHALL display an appropriate error message to the user
5. WHEN a new project is analyzed THEN the system SHALL clear any previously cached data and fetch fresh results

### Requirement 2

**User Story:** As a user, I want the analysis data to be properly synchronized between the backend and frontend, so that I always see consistent and up-to-date information.

#### Acceptance Criteria

1. WHEN the backend reset endpoint is called THEN the frontend SHALL clear its local analysis data state
2. WHEN switching between different views (mindmap, architecture, code explorer) THEN the system SHALL use the same analysis data without re-fetching
3. WHEN the analysis data is loaded THEN the system SHALL store it in the application state for use by other components

### Requirement 3

**User Story:** As a user, I want clear feedback during the data loading process, so that I understand what the application is doing.

#### Acceptance Criteria

1. WHEN analysis data is being fetched THEN the system SHALL display a loading spinner with descriptive text
2. WHEN analysis data fetch completes successfully THEN the system SHALL transition smoothly to displaying the results
3. IF no analysis data is available THEN the system SHALL display a message prompting the user to analyze a project first
