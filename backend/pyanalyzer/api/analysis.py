"""Endpoints that start, observe, and cancel an analysis."""

from __future__ import annotations

from fastapi import APIRouter, status

from pyanalyzer import __version__
from pyanalyzer.analysis.jobs import JobAlreadyRunningError
from pyanalyzer.analysis.pipeline import AnalysisOptions
from pyanalyzer.analyzers.quality_analyzer import QualityThresholds
from pyanalyzer.api.dependencies import ManagerDep, SettingsDep
from pyanalyzer.api.errors import ApiError, ErrorResponse
from pyanalyzer.api.schemas import AnalysisRequest, AnalysisStatus, Health
from pyanalyzer.scanner.file_scanner import ProjectPathError
from pyanalyzer.settings import Settings

router = APIRouter()


def build_options(
    settings: Settings,
    *,
    exclude: tuple[str, ...] = (),
    respect_gitignore: bool = True,
    use_default_excludes: bool = True,
) -> AnalysisOptions:
    """Combine server settings with per-request choices."""
    return AnalysisOptions(
        exclude=exclude,
        respect_gitignore=respect_gitignore,
        use_default_excludes=use_default_excludes,
        max_file_size=settings.max_file_size,
        workers=settings.workers,
        use_cache=settings.use_cache,
        cache_dir=settings.cache_dir,
        thresholds=QualityThresholds(
            max_function_lines=settings.max_function_lines,
            max_parameters=settings.max_parameters,
            max_complexity=settings.max_complexity,
            max_class_methods=settings.max_class_methods,
        ),
    )


@router.get("/health", tags=["service"])
def health() -> Health:
    """Liveness check."""
    return Health(status="ok", version=__version__)


@router.post(
    "/analysis",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["analysis"],
    responses={
        400: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
def start_analysis(
    request: AnalysisRequest, manager: ManagerDep, settings: SettingsDep
) -> AnalysisStatus:
    """Start analyzing a project in the background; poll ``GET /analysis`` for progress."""
    options = build_options(
        settings,
        exclude=tuple(request.exclude),
        respect_gitignore=request.respect_gitignore,
        use_default_excludes=request.use_default_excludes,
    )
    try:
        job = manager.start(request.project_path, options)
    except ProjectPathError as exc:
        raise ApiError(400, "invalid_project_path", str(exc)) from exc
    except PermissionError as exc:
        raise ApiError(403, "permission_denied", str(exc)) from exc
    except JobAlreadyRunningError as exc:
        raise ApiError(409, "analysis_running", str(exc)) from exc
    return AnalysisStatus.of(job)


@router.get("/analysis", tags=["analysis"])
def analysis_status(manager: ManagerDep) -> AnalysisStatus:
    """State and progress of the current or most recent analysis."""
    return AnalysisStatus.of(manager.status())


@router.post("/analysis/cancel", tags=["analysis"])
def cancel_analysis(manager: ManagerDep) -> AnalysisStatus:
    """Stop a running analysis. Results of an earlier analysis are kept."""
    return AnalysisStatus.of(manager.cancel())


@router.delete("/analysis", tags=["analysis"])
def reset_analysis(manager: ManagerDep) -> AnalysisStatus:
    """Stop any running analysis and discard the stored results."""
    return AnalysisStatus.of(manager.reset())
