# Architecture

## Overview

```
browser ──HTTP──▶ FastAPI app (pyanalyzer.main)
                    ├─ api/analysis.py   start / status / cancel / reset
                    ├─ api/explore.py    read-only, paginated queries
                    └─ static files      the built frontend
                          │
            AnalysisManager (analysis/jobs.py)      one background job at a time
                          │
            analyze_project (analysis/pipeline.py)
              1. scan      scanner/file_scanner.py
              2. extract   parsers/extractor.py   (worker processes, cached)
              3. resolve   analysis/resolver.py
              4. graph     graph/builder.py
              5. analyze   analyzers/*.py
                          │
            AnalysisStore ─▶ AnalysisIndex (analysis/index.py)   read by every request
```

## Backend

**Scan.** One pass over the directory tree. Excluded directories are pruned without being entered, `.gitignore` files are honoured at every level, symbolic links are never followed, and oversized files are skipped. Skipped files are reported with a reason.

**Extract.** `extract_file` turns one file into a `FileRecord`: its elements (module, classes, functions with qualified names), import bindings, and references. It is a pure function with no shared state, which is what makes it safe to run in parallel. It tracks lexical scopes, so a reference is kept only when its root name is bound to an import, to a definition in the same file, or is `self`/`cls` inside a method. Parsing is CPU-bound, so large projects use a process pool; small ones run serially because starting processes costs more than it saves.

**Cache.** Records are stored per project in SQLite, keyed by path, size, and modification time, and discarded when the extractor version or Python version changes. Only this per-file stage is cached; everything that spans files is recomputed on every run, so cached data cannot become inconsistent with itself. Records are unpickled with an allow-list of data classes, so a tampered cache file cannot execute code. Any cache failure is treated as a miss.

**Resolve.** Builds an index of importable module names (packages, `src/` layouts, a project root that is itself a package, loose scripts) and resolves each import, including relative imports, re-exports through `__init__.py`, and star imports. Each reference is then followed through its file's bindings to the element it denotes, producing usages, dependencies, and class bases. All of this is dictionary lookups, linear in the number of references.

Attributes are looked up along each class's C3 method resolution order (`analysis/mro.py`), as Python does; hierarchies Python would reject fall back to breadth-first order. Calls on instances are resolved when the instance's class is known: the extractor records where a variable's type comes from (a constructor or function call, a parameter or variable annotation, unwrapping `Optional`/`X | None`/string annotations), each function's return annotation, and typed instance attributes; the resolver follows these to a project class. A variable bound to conflicting or unknown types is left unresolved rather than guessed.

**Graph.** Module, class, and package graphs are derived from usages. Edges carry a reference count. Import cycles are strongly connected components.

**Analyze.** Class hierarchy and method overrides; pattern detection; findings (cycles, unused imports, dead-code candidates, smells).

**Search.** Ranked tiers over a prebuilt index: exact name, name prefix, name substring, qualified name, path, optionally docstrings, and finally fuzzy names (the query's letters in order within three times its length).

**Serve.** A finished analysis is wrapped in an `AnalysisIndex` (lookup tables by type and file, search rows, directory tree, lazily built graphs) and swapped into the store atomically, so a failed or cancelled run leaves the previous result in place. Every list endpoint is paginated and every graph is bounded by `max_nodes` with a `truncated` flag, so response size does not grow with project size.

### Local-server security

The server has no accounts, so it binds to `127.0.0.1`, rejects requests whose `Host` is not local (DNS rebinding), and refuses `POST`/`DELETE` requests whose browser `Origin` is neither the server nor a configured CORS origin (`api/origin.py`), so other web sites cannot start, cancel, or reset an analysis. Built assets are served with immutable caching; pages are revalidated.

### Identifiers

Element ids are `kind:relative/path.py:Qualified.Name`, for example `function:app/models.py:User.save`. Paths are POSIX-style and relative to the project root. Because ids contain slashes they are passed as query parameters, never as path segments.

## Frontend

- **Server state** lives only in React Query (`src/shared/api/queries.ts`). Types come from `src/shared/api/schema.d.ts`, generated from the backend's OpenAPI document.
- **View state** (filters, selection, graph level, focus) lives in the URL, so every view can be linked to and survives a reload.
- **Pages** are lazy-loaded routes under `src/features/`. Cytoscape is loaded only when a graph is shown.
- **Large data**: lists are virtualized and load a page at a time; the mind map requests children when a node is expanded; graphs are bounded by the server.
- **Start-up**: only MUI's styling core is a shared chunk; components load with the pages that use them. The current route's chunk is requested before the first render, and the first render runs in a transition so React yields instead of blocking. The API client is a small `fetch` wrapper.
- **Connectivity**: a polled health check and the browser's online state drive a banner; data already loaded stays usable.

## Testing strategy

- Each defect found in the original implementation has a regression test in `backend/tests/test_regressions.py`.
- Property-based tests generate random project layouts and check invariants (unique ids, closed graphs, determinism).
- `backend/tests/test_scale.py` analyzes a synthetic 10,000-file project with time budgets.
- Frontend component tests run against a mock backend (MSW) whose responses are typed by the generated schema.
- Playwright drives the built frontend against the real backend. `e2e/accessibility.spec.ts` runs axe (WCAG 2.x A/AA) in Chromium on every route in light and dark mode, where colour contrast is actually computed, and checks a keyboard-only journey, landmarks, and headings.
- `knip` fails the build on unused files, exports, or dependencies.
