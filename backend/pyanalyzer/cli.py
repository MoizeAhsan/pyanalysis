"""Command-line interface: ``pyanalyzer serve`` and ``pyanalyzer analyze``."""

from __future__ import annotations

import argparse
import json
import sys
import threading
import webbrowser
from collections import Counter
from collections.abc import Sequence

from pyanalyzer import __version__
from pyanalyzer.analysis.pipeline import AnalysisOptions, AnalysisResult, analyze_project
from pyanalyzer.models.core import ElementType
from pyanalyzer.scanner.file_scanner import ProjectPathError
from pyanalyzer.settings import Settings


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pyanalyzer", description="Explore the structure of a Python project."
    )
    parser.add_argument("--version", action="version", version=f"pyanalyzer {__version__}")
    commands = parser.add_subparsers(dest="command", required=True)

    serve = commands.add_parser("serve", help="start the local web application")
    serve.add_argument("path", nargs="?", help="project to analyze on startup")
    serve.add_argument("--host", help="interface to bind (default: 127.0.0.1)")
    serve.add_argument("--port", type=int, help="port to listen on (default: 8000)")
    serve.add_argument("--no-browser", action="store_true", help="do not open a browser")

    analyze = commands.add_parser("analyze", help="analyze a project and print a summary")
    analyze.add_argument("path", help="project directory")
    analyze.add_argument(
        "--exclude",
        action="append",
        default=[],
        metavar="PATTERN",
        help="gitignore-style pattern to skip (repeatable)",
    )
    analyze.add_argument("--no-gitignore", action="store_true", help="ignore .gitignore files")
    analyze.add_argument("--no-cache", action="store_true", help="do not read or write the cache")
    analyze.add_argument("--json", action="store_true", help="print machine-readable JSON")
    return parser


def summarize(result: AnalysisResult) -> dict[str, object]:
    """Compact, JSON-serializable summary of a result."""
    types = Counter(element.type for element in result.resolution.elements.values())
    return {
        "project": result.project.name,
        "path": result.project.path,
        "files": result.project.total_files,
        "lines": result.project.total_lines,
        "cached_files": result.cached_files,
        "modules": types[ElementType.MODULE],
        "classes": types[ElementType.CLASS],
        "functions": types[ElementType.FUNCTION],
        "usages": sum(len(usages) for usages in result.resolution.usages.values()),
        "import_cycles": len(result.cycles),
        "issues": dict(sorted(Counter(issue.kind.value for issue in result.issues).items())),
        "patterns": [pattern.name for pattern in result.patterns],
        "skipped_files": len(result.skipped),
        "duration_seconds": round(result.duration_seconds, 3),
    }


def _analyze(arguments: argparse.Namespace) -> int:
    options = AnalysisOptions(
        exclude=tuple(arguments.exclude),
        respect_gitignore=not arguments.no_gitignore,
        use_cache=not arguments.no_cache,
    )
    try:
        result = analyze_project(arguments.path, options)
    except (ProjectPathError, PermissionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    summary = summarize(result)
    if arguments.json:
        print(json.dumps(summary, indent=2))
        return 0
    for key, value in summary.items():
        if isinstance(value, dict):
            value = ", ".join(f"{name}={count}" for name, count in value.items()) or "none"
        elif isinstance(value, list):
            value = ", ".join(str(item) for item in value) or "none"
        print(f"{key.replace('_', ' '):>18}: {value}")
    return 0


def _serve(arguments: argparse.Namespace) -> int:
    import uvicorn

    from pyanalyzer.main import create_app

    settings = Settings()
    host = arguments.host or settings.host
    port = arguments.port or settings.port
    application = create_app(settings)
    if arguments.path:
        try:
            application.state.manager.start(arguments.path)
        except (ProjectPathError, PermissionError) as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
    url = f"http://{'localhost' if host in ('127.0.0.1', '0.0.0.0') else host}:{port}"
    if settings.static_dir is None:
        print("Frontend build not found; serving the API only. See the README to build it.")
    elif not arguments.no_browser:
        threading.Timer(1.0, webbrowser.open, args=(url,)).start()
    print(f"Python Code Analyzer running at {url}")
    uvicorn.run(application, host=host, port=port, log_level="warning")
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    """Entry point for the ``pyanalyzer`` console script."""
    arguments = _parser().parse_args(argv)
    return _serve(arguments) if arguments.command == "serve" else _analyze(arguments)


if __name__ == "__main__":
    raise SystemExit(main())
