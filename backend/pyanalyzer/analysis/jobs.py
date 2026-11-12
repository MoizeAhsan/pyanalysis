"""Background execution of analyses with progress reporting and cancellation."""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum

from pyanalyzer.analysis.pipeline import (
    AnalysisCancelled,
    AnalysisOptions,
    AnalysisResult,
    CancelCheck,
    ProgressCallback,
    analyze_project,
)
from pyanalyzer.analysis.store import AnalysisStore
from pyanalyzer.scanner.file_scanner import validate_project_path

logger = logging.getLogger(__name__)

PHASE_INDEXING = "indexing"

type Runner = Callable[
    [str, AnalysisOptions, ProgressCallback, CancelCheck],
    AnalysisResult,
]


class JobState(StrEnum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobAlreadyRunningError(RuntimeError):
    """An analysis was requested while another one is still running."""


@dataclass(slots=True, frozen=True)
class JobStatus:
    """A point-in-time snapshot of the current (or last) analysis job."""

    state: JobState = JobState.IDLE
    phase: str | None = None
    processed: int = 0
    total: int = 0
    project_path: str | None = None
    error: str | None = None
    started_at: datetime | None = None
    elapsed_seconds: float = 0.0
    has_result: bool = False


class AnalysisManager:
    """Runs at most one analysis at a time on a background thread."""

    def __init__(self, store: AnalysisStore, runner: Runner = analyze_project) -> None:
        self._store = store
        self._runner = runner
        self._lock = threading.Lock()
        self._status = JobStatus()
        self._started = 0.0
        self._thread: threading.Thread | None = None
        self._cancel = threading.Event()

    def start(self, project_path: str, options: AnalysisOptions | None = None) -> JobStatus:
        """Validate the path and begin analyzing it in the background.

        Raises:
            ProjectPathError: the path is not an existing directory.
            PermissionError: the directory cannot be read.
            JobAlreadyRunningError: another analysis is in progress.
        """
        root = str(validate_project_path(project_path))
        with self._lock:
            if self._status.state is JobState.RUNNING:
                raise JobAlreadyRunningError("An analysis is already running")
            self._cancel = threading.Event()
            self._started = time.perf_counter()
            self._status = JobStatus(
                state=JobState.RUNNING,
                phase="scanning",
                project_path=root,
                started_at=datetime.now().astimezone(),
            )
            self._thread = threading.Thread(
                target=self._run,
                args=(root, options or AnalysisOptions(), self._cancel),
                name="pyanalyzer-analysis",
                daemon=True,
            )
            self._thread.start()
        return self.status()

    def status(self) -> JobStatus:
        with self._lock:
            status = self._status
            elapsed = status.elapsed_seconds
            if status.state is JobState.RUNNING:
                elapsed = time.perf_counter() - self._started
        return replace(status, elapsed_seconds=elapsed, has_result=self._store.index is not None)

    def cancel(self) -> JobStatus:
        """Ask a running analysis to stop. The previous result, if any, is kept."""
        self._cancel.set()
        return self.status()

    def reset(self) -> JobStatus:
        """Stop any running analysis, wait for it, and discard the stored result."""
        self._cancel.set()
        self.wait()
        self._store.clear()
        with self._lock:
            self._status = JobStatus()
        return self.status()

    def wait(self, timeout: float | None = None) -> JobStatus:
        """Block until the current job, if any, has finished."""
        thread = self._thread
        if thread is not None:
            thread.join(timeout)
        return self.status()

    # ---------------------------------------------------------------- internals

    def _update(self, token: threading.Event, **changes: object) -> None:
        with self._lock:
            if token is self._cancel:  # ignore late updates from a superseded job
                self._status = replace(self._status, **changes)  # type: ignore[arg-type]

    def _run(self, root: str, options: AnalysisOptions, token: threading.Event) -> None:
        def on_progress(phase: str, done: int, total: int) -> None:
            if total:
                self._update(token, phase=phase, processed=done, total=total)
            else:  # phases without a file count keep the last counts on display
                self._update(token, phase=phase)

        try:
            result = self._runner(root, options, on_progress, token.is_set)
            self._update(token, phase=PHASE_INDEXING)
            if token.is_set():
                raise AnalysisCancelled
            self._store.set(result)
        except AnalysisCancelled:
            final: dict[str, object] = {"state": JobState.CANCELLED}
        except Exception as exc:
            logger.exception("Analysis of %s failed", root)
            final = {"state": JobState.FAILED, "error": f"{type(exc).__name__}: {exc}"}
        else:
            final = {"state": JobState.COMPLETED}
            logger.info(
                "Analyzed %s: %d files (%d cached) in %.2fs",
                root,
                result.project.total_files,
                result.cached_files,
                result.duration_seconds,
            )
        self._update(
            token, phase=None, elapsed_seconds=time.perf_counter() - self._started, **final
        )
