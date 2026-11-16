# Implementation Plan

- [x] 1. Reproducible environment and guardrails
  - Package the backend as `pyanalyzer` with `pyproject.toml`; ruff and mypy `--strict`
  - pytest suite replacing the print-based root scripts; regression tests for audited defects
  - Makefile, GitHub Actions workflow, pre-commit configuration
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 2. Correct analysis core
  - [x] 2.1 Single-pass stateless extractor with qualified ids and scope tracking
  - [x] 2.2 Scanner: one pass, pruning, `.gitignore`, exclude patterns, symlink-safe, skipped-file reasons
  - [x] 2.3 Resolver: module index, relative imports, re-exports, star imports, binding-based usages
  - [x] 2.4 Graph builder for module, class, and package levels; cycles as strongly connected components
  - _Requirements: 1.1 to 1.7, 3.1, 3.2, 3.5_

- [x] 3. Scale
  - [x] 3.1 Process-pool extraction with serial fallback
  - [x] 3.2 Incremental on-disk cache with restricted unpickling
  - [x] 3.3 Background jobs with progress and cancellation
  - [x] 3.4 Read index, paginated endpoints, bounded graphs
  - [x] 3.5 Property-based tests and the 10,000-file benchmark
  - _Requirements: 2.1 to 2.6, 4.3_

- [x] 4. Missing analysis features
  - Class hierarchy and overrides; unused imports, dead-code candidates, smells; type-hint edges; pattern detection on structure
  - _Requirements: 3.3, 3.4, 3.6_

- [x] 5. Server hardening and packaging
  - Settings from environment, Host allow-list, gzip, uniform errors, confined source endpoint
  - `pyanalyzer serve` and `pyanalyzer analyze`; serving the built frontend
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 6. Frontend rebuild
  - [x] 6.1 Generated API types and React Query data layer
  - [x] 6.2 Routing with state in the URL
  - [x] 6.3 Analysis flow with real progress and cancel
  - [x] 6.4 Mind map, architecture, explorer, search, and findings views on the paginated API
  - [x] 6.5 Remove legacy components, unused dependencies, and sample-data fallbacks
  - [x] 6.6 ESLint zero warnings, Prettier, accessibility scans, unit and browser tests
  - _Requirements: 3.7, 5.1, 5.2, 5.3, 5.6_

- [x] 7. Documentation
  - README, architecture document, this spec; corrections to the earlier specs' task lists

## Not done

- [ ] Lighthouse performance audit (frontend-modernization 10.2)
- [ ] Screen-reader testing with real assistive technology (frontend-modernization 10.3); automated axe scans pass
- [x] Resolving calls on instances by type inference (constructors, annotations, return annotations, typed instance attributes, call results; C3 method resolution order)
