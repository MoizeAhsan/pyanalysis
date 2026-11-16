# Python Code Analyzer

Explore the structure of a Python project in your browser: what depends on what, where every class and function is used, and where the code has problems. Analysis is static (the project's code is parsed, never run) and everything stays on your machine.

## What it shows

- **Mind map**: the project as a tree of directories, modules, classes, and functions that you expand as you go.
- **Architecture**: dependency graphs at package, module, or class level, with import cycles and detected design patterns.
- **Code explorer**: every element with its documentation, signature, class hierarchy, method overrides, and each place it is used, with source.
- **Search**: by name, path, or documentation.
- **Findings**: import cycles, unused imports, code nothing appears to use, and code smells (long or complex functions, too many parameters, large classes).

## Requirements

- Python 3.12 or newer
- Node.js 22 or newer (only to build the web interface)

## Quick start

```bash
make setup     # backend virtualenv + frontend dependencies
make serve     # build the frontend and start the app
```

Then open <http://localhost:8000>, enter the path of a Python project, and choose **Analyze**.

To analyze a project straight away, or to get a summary without the browser:

```bash
backend/.venv/bin/pyanalyzer serve /path/to/project
backend/.venv/bin/pyanalyzer analyze /path/to/project          # prints a summary
backend/.venv/bin/pyanalyzer analyze /path/to/project --json   # machine-readable
```

## Performance

Measured on a 2-core (4-thread) laptop:

| Project | Size | First run | Repeat run |
|---|---|---|---|
| Synthetic benchmark (`backend/tests/test_scale.py`) | 10,100 files | 6.9 s | 3.2 s |
| Third-party packages in a virtualenv | 2,612 files, 1.0 M lines | 12.0 s | 3.4 s |

Repeat runs are faster because per-file results are cached and only changed files are parsed again. The first run is limited by Python's own parser and scales with CPU cores. Queries against a finished analysis (search, graphs, lists) took under 300 ms on the 10,100-file project.

## Configuration

Set these environment variables before starting the server. All are optional.

| Variable | Default | Meaning |
|---|---|---|
| `PYANALYZER_HOST` | `127.0.0.1` | Interface to bind |
| `PYANALYZER_PORT` | `8000` | Port |
| `PYANALYZER_ALLOWED_HOSTS` | `["localhost","127.0.0.1","[::1]"]` | Host headers the server answers to |
| `PYANALYZER_CORS_ORIGINS` | Vite dev-server origins | Browser origins allowed to call the API |
| `PYANALYZER_WORKERS` | CPU count, at most 8 | Worker processes for parsing |
| `PYANALYZER_USE_CACHE` | `true` | Reuse results for unchanged files |
| `PYANALYZER_CACHE_DIR` | per-user cache directory | Where cached results are stored |
| `PYANALYZER_MAX_FILE_SIZE` | `2097152` | Files larger than this many bytes are skipped |
| `PYANALYZER_MAX_FUNCTION_LINES` | `60` | Long-function threshold |
| `PYANALYZER_MAX_PARAMETERS` | `6` | Parameter-count threshold |
| `PYANALYZER_MAX_COMPLEXITY` | `10` | Cyclomatic-complexity threshold |
| `PYANALYZER_MAX_CLASS_METHODS` | `20` | Large-class threshold |

By default the scanner skips virtual environments, caches, build output, and anything matched by `.gitignore`. Both can be turned off, and extra exclude patterns (in `.gitignore` syntax) added, under **Options** on the start page.

## Security

The server is a local tool with no authentication: anyone who can reach it can ask it to read Python files in any directory the server's user can read. It therefore binds to `127.0.0.1`, rejects requests whose `Host` header is not local, and refuses state-changing requests (`POST`, `DELETE`) whose browser `Origin` is neither the server itself nor one of `PYANALYZER_CORS_ORIGINS`, so other web sites cannot start, cancel or reset an analysis. Do not expose it to a network without putting your own access control in front of it.

## What the analysis cannot see

Results come from reading source code, so anything decided at run time is invisible:

- A call on a value of unknown type, such as `thing.save()`, is not linked to any `save` method. Usages are recorded only where a name provably refers to an element (through an import, a definition in the same file, or `self`/`super()` in a method).
- "Dead-code candidates" are code with no reference found inside the project. Code reached dynamically, registered with a framework, or used by other projects will appear here. Decorated functions, dunder methods, test code, names in `__all__`, and methods of classes with external base classes are never reported.
- Symbolic links are not followed.

## Development

```bash
make dev-backend    # API with auto-reload on :8000
make dev-frontend   # Vite dev server on :3000, proxying /api
make check          # lint, format check, type-check, and tests for both halves
make e2e            # browser tests against the real backend
make api-types      # regenerate frontend types after changing the API
```

| | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Lint and format | ruff | ESLint (zero warnings), Prettier |
| Types | mypy `--strict` | TypeScript strict |
| Tests | pytest, hypothesis; coverage floor 90% | Vitest, Testing Library, MSW, fast-check, axe; Playwright |

The API is documented at `/docs` while the server is running. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together, and `.kiro/specs/` for the specifications.
