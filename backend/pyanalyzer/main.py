"""FastAPI application for the Python Code Analyzer."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from pyanalyzer import __version__
from pyanalyzer.analysis.jobs import AnalysisManager
from pyanalyzer.analysis.store import AnalysisStore
from pyanalyzer.api import analysis, explore
from pyanalyzer.api.errors import ApiError, install_error_handlers
from pyanalyzer.api.origin import SameOriginMiddleware
from pyanalyzer.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build an application instance with its own settings and analysis state."""
    settings = settings or Settings()
    application = FastAPI(
        title="Python Code Analyzer",
        description="Static analysis and visual exploration of Python projects",
        version=__version__,
    )
    store = AnalysisStore()
    application.state.settings = settings
    application.state.store = store
    application.state.manager = AnalysisManager(store)

    application.add_middleware(GZipMiddleware, minimum_size=1024)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type"],
    )
    application.add_middleware(SameOriginMiddleware, trusted_origins=settings.cors_origins)
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    install_error_handlers(application)

    application.include_router(analysis.router, prefix="/api")
    application.include_router(explore.router, prefix="/api")

    if settings.static_dir is not None:
        _serve_frontend(application, settings.static_dir.resolve())
    else:

        @application.get("/", include_in_schema=False)
        def root() -> dict[str, str]:
            return {"message": "Python Code Analyzer API", "docs": "/docs"}

    return application


def _serve_frontend(application: FastAPI, static_dir: Path) -> None:
    """Serve the built single-page app, falling back to index.html for client routes."""
    index_file = static_dir / "index.html"

    @application.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise ApiError(404, "not_found", f"No such endpoint: /{path}")
        candidate = (static_dir / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(static_dir):
            return FileResponse(candidate)
        return FileResponse(index_file)


def _default_app() -> FastAPI:
    return create_app()


app = _default_app()
