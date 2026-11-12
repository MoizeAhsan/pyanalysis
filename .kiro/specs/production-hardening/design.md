# Design Document

The design is described in [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). This document records the decisions and their reasons.

## Decisions

| Decision | Reason |
|---|---|
| One stateless extraction pass per file | The original parsed each file three times and shared a parser between threads, which attributed elements to the wrong file. |
| Worker processes, not threads | Parsing is CPU-bound; under the GIL, 16 threads were slower than serial (1.02 s vs 0.71 s on a 60-file sample). |
| Resolve names through each file's own bindings | Matching by bare name linked `config.get()` to every function called `get`, and `import os` to any path containing "os". |
| Cache only per-file records | Cross-file results recomputed each run can never be stale relative to one another. |
| Restricted unpickling for the cache | Pickle is the fastest format for the records; an allow-list of data classes removes its code-execution risk. |
| Background job with polling | A synchronous request blocked the server and hit the client's 30 s timeout on large projects. Polling needs no extra transport and works with React Query. |
| Element ids as query parameters | Ids contain slashes and colons. |
| Offset pagination | Results are an immutable snapshot, so offsets are stable. |
| Server-side search and graph bounding | The browser must never hold the whole analysis. |
| One graph engine (Cytoscape) | Three engines were shipped; two had no node limits and quadratic loops. |
| View state in the URL | Makes views linkable; replaces a global store. |
| Generated API types | Hand-written types existed twice and had drifted. |

## API

`POST /api/analysis`, `GET /api/analysis`, `POST /api/analysis/cancel`, `DELETE /api/analysis`, `GET /api/summary`, `/tree`, `/elements`, `/element`, `/usages`, `/search`, `/graph`, `/issues`, `/cycles`, `/patterns`, `/source`, `/health`. Errors are `{"error": {"code", "message"}}`. The authoritative reference is the OpenAPI document at `/docs`.

## Removed

- `/api/analyze`, `/api/data`, `/api/architecture`, `/api/reset` (whole-project payloads).
- JSON-embedded gzip responses; HTTP gzip is used instead.
- SVG and PDF graph export, and the force-graph and vis-network renderers. PNG export remains.
- Client-side web-worker search (it was never wired up) and drag-and-drop path entry (browsers do not expose absolute paths).

## Known limitations

- Attribute access on values of unknown type is not resolved, so some real usages are not shown and dead-code results are candidates only.
- First-run speed is bounded by CPython's parser.
- Lighthouse performance was not measured.
