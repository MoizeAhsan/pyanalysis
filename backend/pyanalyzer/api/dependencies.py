"""FastAPI dependencies shared by all routers."""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import Depends, Request

from pyanalyzer.analysis.index import AnalysisIndex
from pyanalyzer.analysis.jobs import AnalysisManager
from pyanalyzer.analysis.store import AnalysisStore
from pyanalyzer.api.errors import no_analysis
from pyanalyzer.settings import Settings


def get_store(request: Request) -> AnalysisStore:
    return cast(AnalysisStore, request.app.state.store)


def get_manager(request: Request) -> AnalysisManager:
    return cast(AnalysisManager, request.app.state.manager)


def get_settings(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


def get_index(request: Request) -> AnalysisIndex:
    """The current analysis, or a 404 ``no_analysis`` error."""
    index = get_store(request).index
    if index is None:
        raise no_analysis()
    return index


StoreDep = Annotated[AnalysisStore, Depends(get_store)]
ManagerDep = Annotated[AnalysisManager, Depends(get_manager)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
IndexDep = Annotated[AnalysisIndex, Depends(get_index)]
