"""FastAPI application for the Python Code Analyzer."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pyanalyzer import __version__
from pyanalyzer.analysis.store import AnalysisStore
from pyanalyzer.api import legacy

_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def create_app() -> FastAPI:
    """Build an application instance with its own analysis store."""
    application = FastAPI(
        title="Python Code Analyzer",
        description="Visual exploration tool for Python projects",
        version=__version__,
    )
    application.state.store = AnalysisStore()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=_DEV_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(legacy.router, prefix="/api")

    @application.get("/")
    def root() -> dict[str, str]:
        """Identify the service."""
        return {"message": "Python Code Analyzer API"}

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
