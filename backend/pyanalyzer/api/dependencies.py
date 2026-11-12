"""FastAPI dependencies shared by all routers."""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import Depends, Request

from pyanalyzer.analysis.store import AnalysisStore


def get_store(request: Request) -> AnalysisStore:
    """The application's analysis store."""
    return cast(AnalysisStore, request.app.state.store)


StoreDep = Annotated[AnalysisStore, Depends(get_store)]
