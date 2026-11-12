"""The analysis pipeline: scan, extract, resolve, build graphs, detect patterns."""

from __future__ import annotations

import os
import time
from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime
from itertools import repeat
from typing import Final

from pyanalyzer.analysis.resolver import Resolution, resolve
from pyanalyzer.analyzers.pattern_detector import detect_patterns
from pyanalyzer.graph.builder import build_module_graph, find_cycles
from pyanalyzer.models.core import (
    ArchitecturalPattern,
    DependencyGraph,
    ProjectInfo,
    SkippedFile,
)
from pyanalyzer.models.records import FileRecord
from pyanalyzer.parsers.extractor import extract_file
from pyanalyzer.scanner.file_scanner import (
    DEFAULT_MAX_FILE_SIZE,
    ScannedFile,
    ScanOptions,
    scan_project,
)

#: Below this many files a process pool costs more to start than it saves.
PARALLEL_THRESHOLD: Final = 200
MAX_DEFAULT_WORKERS: Final = 8

PHASE_SCANNING: Final = "scanning"
PHASE_PARSING: Final = "parsing"
PHASE_RESOLVING: Final = "resolving"
PHASE_GRAPH: Final = "graph"

type ProgressCallback = Callable[[str, int, int], None]
type CancelCheck = Callable[[], bool]


class AnalysisCancelled(Exception):
    """Raised inside the pipeline when the caller asked it to stop."""


@dataclass(slots=True, frozen=True)
class AnalysisOptions:
    """User-facing knobs for one analysis run."""

    exclude: tuple[str, ...] = ()
    respect_gitignore: bool = True
    use_default_excludes: bool = True
    max_file_size: int = DEFAULT_MAX_FILE_SIZE
    workers: int | None = None

    def scan_options(self) -> ScanOptions:
        return ScanOptions(
            exclude=self.exclude,
            respect_gitignore=self.respect_gitignore,
            use_default_excludes=self.use_default_excludes,
            max_file_size=self.max_file_size,
        )


@dataclass(slots=True)
class AnalysisResult:
    """Immutable-by-convention snapshot of one completed analysis."""

    project: ProjectInfo
    resolution: Resolution
    module_graph: DependencyGraph
    cycles: list[list[str]]
    patterns: list[ArchitecturalPattern]
    skipped: list[SkippedFile] = field(default_factory=list)
    duration_seconds: float = 0.0


def default_workers() -> int:
    """Worker processes to use when the caller does not say."""
    return max(1, min(os.cpu_count() or 1, MAX_DEFAULT_WORKERS))


def analyze_project(
    project_path: str,
    options: AnalysisOptions | None = None,
    on_progress: ProgressCallback | None = None,
    should_cancel: CancelCheck | None = None,
) -> AnalysisResult:
    """Analyze the project at ``project_path`` and return a result snapshot.

    Raises:
        ProjectPathError: the path does not exist or is not a directory.
        PermissionError: the directory cannot be read.
        AnalysisCancelled: ``should_cancel`` returned true during the run.
    """
    options = options or AnalysisOptions()
    progress = on_progress or _ignore_progress
    cancelled = should_cancel or _never_cancel
    started = time.perf_counter()

    progress(PHASE_SCANNING, 0, 0)
    scan = scan_project(project_path, options.scan_options(), cancelled)
    _check(cancelled)

    records = _extract_all(scan.root, scan.files, options.workers, progress, cancelled)

    progress(PHASE_RESOLVING, 0, 0)
    resolution = resolve(records)
    _check(cancelled)

    progress(PHASE_GRAPH, 0, 0)
    module_graph = build_module_graph(resolution)
    cycles = find_cycles(module_graph)
    patterns = detect_patterns(resolution)
    _check(cancelled)

    skipped = [
        *scan.skipped,
        *(SkippedFile(r.rel_path, r.error) for r in records if r.error is not None),
    ]
    skipped.sort(key=lambda item: item.file_path)
    root_name = os.path.basename(scan.root) or scan.root
    return AnalysisResult(
        project=ProjectInfo(
            name=root_name,
            path=scan.root,
            total_files=len(records),
            total_lines=sum(record.line_count for record in records),
            analysis_timestamp=datetime.now().astimezone(),
        ),
        resolution=resolution,
        module_graph=module_graph,
        cycles=cycles,
        patterns=patterns,
        skipped=skipped,
        duration_seconds=time.perf_counter() - started,
    )


def _extract_all(
    root: str,
    files: list[ScannedFile],
    workers: int | None,
    progress: ProgressCallback,
    cancelled: CancelCheck,
) -> list[FileRecord]:
    """Extract every file, in parallel when the project is large enough to benefit."""
    total = len(files)
    paths = [scanned.rel_path for scanned in files]
    worker_count = default_workers() if workers is None else max(1, workers)
    progress(PHASE_PARSING, 0, total)
    records: list[FileRecord] = []

    if worker_count == 1 or total < PARALLEL_THRESHOLD:
        for done, path in enumerate(paths, start=1):
            _check(cancelled)
            records.append(extract_file(root, path))
            progress(PHASE_PARSING, done, total)
        return records

    chunk_size = max(1, min(64, total // (worker_count * 4)))
    executor = ProcessPoolExecutor(max_workers=worker_count)
    try:
        results = executor.map(extract_file, repeat(root), paths, chunksize=chunk_size)
        for done, record in enumerate(results, start=1):
            if cancelled():
                raise AnalysisCancelled
            records.append(record)
            if done % chunk_size == 0 or done == total:
                progress(PHASE_PARSING, done, total)
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
    return records


def _check(cancelled: CancelCheck) -> None:
    if cancelled():
        raise AnalysisCancelled


def _ignore_progress(_phase: str, _done: int, _total: int) -> None:
    return None


def _never_cancel() -> bool:
    return False
