# Requirements Document

## Introduction

An audit of the Python Code Analyzer found that the analysis produced incorrect results, did not scale, and had no automated verification, although the existing specs marked their tasks complete. This spec covers making the application correct, fast on large code bases, and maintainable. It supersedes the API described in `python-code-analyzer/design.md`.

Scope decisions: the application is a local single-user tool (no authentication, bound to localhost), and the HTTP API may change incompatibly as long as the frontend changes with it.

## Requirements

### Requirement 1: Correct results

**User Story:** As a developer, I want the analysis to be accurate, so that I can trust what the tool tells me.

#### Acceptance Criteria

1. WHEN files are parsed in parallel THEN the system SHALL produce results identical to parsing them serially
2. WHEN two definitions share a name in one file THEN the system SHALL give each a distinct identifier
3. WHEN a module imports a name THEN the system SHALL link it only to the module or element that import resolves to, including relative imports, re-exports, and star imports
4. WHEN code accesses an attribute on a value of unknown type THEN the system SHALL NOT record a usage of same-named elements
5. WHEN a file declares a source encoding THEN the system SHALL decode it with that encoding
6. WHEN the project contains symbolic links THEN the system SHALL visit each file at most once
7. WHEN the dependency graph contains cycles of any size or depth THEN the system SHALL report each group of mutually dependent modules

### Requirement 2: Scale

**User Story:** As a developer with a large code base, I want analysis and exploration to stay fast.

#### Acceptance Criteria

1. WHEN a project of 10,000 files is analyzed THEN the system SHALL finish within the budgets asserted by the scale benchmark
2. WHEN a project is re-analyzed THEN the system SHALL re-parse only files whose size or modification time changed
3. WHEN an analysis is running THEN the system SHALL keep serving other requests and SHALL report phase and file progress
4. WHEN a user cancels an analysis THEN the system SHALL stop it and keep any earlier result
5. WHEN any list is requested THEN the system SHALL return it in bounded pages
6. WHEN a graph is larger than the requested limit THEN the system SHALL return the best-connected nodes and state that it was truncated

### Requirement 3: Missing analysis features

**User Story:** As a developer, I want the capabilities the original specification promised.

#### Acceptance Criteria

1. The system SHALL report files it could not analyze, with reasons (original 1.3)
2. The system SHALL accept exclude patterns and honour `.gitignore` (original 6.5)
3. The system SHALL report unused imports, dead-code candidates, and code smells (original 5.5)
4. The system SHALL show class hierarchies and method overrides (original 3.4)
5. The system SHALL offer package, module, and class levels of the dependency graph (original 4.4)
6. The system SHALL use type annotations as relationships (original 5.4)
7. The system SHALL show syntax-highlighted source for definitions and usages (original 8.6)

### Requirement 4: Safety of a local server

#### Acceptance Criteria

1. The server SHALL bind to localhost by default and reject requests with a non-local Host header
2. WHEN source is requested THEN the system SHALL serve only files that are part of the current analysis
3. WHEN cached data is loaded THEN the system SHALL NOT execute code from it
4. The system SHALL never execute analyzed code

### Requirement 5: Maintainability

#### Acceptance Criteria

1. Backend code SHALL pass ruff and mypy `--strict`; frontend code SHALL pass ESLint with zero warnings, Prettier, and strict TypeScript
2. Backend test coverage SHALL stay at or above 90%; frontend coverage SHALL meet the thresholds in `vitest.config.ts`
3. Frontend API types SHALL be generated from the backend's OpenAPI document, and CI SHALL fail when they are stale
4. Every defect fixed under Requirement 1 SHALL have a regression test
5. CI SHALL run lint, type checks, unit tests, the build, and browser tests against the real backend
6. No view SHALL display sample data in place of real data
