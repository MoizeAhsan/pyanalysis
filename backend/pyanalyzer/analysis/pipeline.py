"""The analysis pipeline: scan, extract, resolve, build graphs, detect patterns."""

from __future__ import annotations

import logging
import os
import time
from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from dataclasses import dataclass, field
from datetime import datetime
from itertools import repeat
from pathlib import Path
from typing import Final

from pyanalyzer.analysis.cache import RecordCache, default_cache_dir
from pyanalyzer.analysis.resolver import Resolution, resolve
from pyanalyzer.analyzers.inheritance_analyzer import ClassHierarchy, build_hierarchy
from pyanalyzer.analyzers.pattern_detector import detect_patterns
from pyanalyzer.analyzers.quality_analyzer import Issue, QualityThresholds, find_issues
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

logger = logging.getLogger(__name__)

#: Below this many files a process pool costs more to start than it saves.
PARALLEL_THRESHOLD: Final = 200
MAX_DEFAULT_WORKERS: Final = 8

PHASE_SCANNING: Final = "scanning"
PHASE_PARSING: Final = "parsing"
PHASE_RESOLVING: Final = "resolving"
PHASE_GRAPH: Final = "graph"
PHASE_ANALYZING: Final = "analyzing"

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
    use_cache: bool = True
    cache_dir: Path | None = None
    thresholds: QualityThresholds = field(default_factory=QualityThresholds)

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
    hierarchy: ClassHierarchy
    issues: list[Issue]
    skipped: list[SkippedFile] = field(default_factory=list)
    duration_seconds: float = 0.0
    cached_files: int = 0


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

    records, cached_files = _extract_with_cache(scan.root, scan.files, options, progress, cancelled)

    progress(PHASE_RESOLVING, 0, 0)
    root_name = os.path.basename(scan.root) or scan.root
    resolution = resolve(records, root_name)
    _check(cancelled)

    progress(PHASE_GRAPH, 0, 0)
    module_graph = build_module_graph(resolution)
    cycles = find_cycles(module_graph)
    _check(cancelled)

    progress(PHASE_ANALYZING, 0, 0)
    hierarchy = build_hierarchy(resolution)
    patterns = detect_patterns(resolution)
    issues = find_issues(records, resolution, hierarchy, cycles, options.thresholds)
    _check(cancelled)

    skipped = [
        *scan.skipped,
        *(SkippedFile(r.rel_path, r.error) for r in records if r.error is not None),
    ]
    skipped.sort(key=lambda item: item.file_path)
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
        hierarchy=hierarchy,
        issues=issues,
        skipped=skipped,
        duration_seconds=time.perf_counter() - started,
        cached_files=cached_files,
    )


def _extract_with_cache(
    root: str,
    files: list[ScannedFile],
    options: AnalysisOptions,
    progress: ProgressCallback,
    cancelled: CancelCheck,
) -> tuple[list[FileRecord], int]:
    """Records for ``files`` in order, re-extracting only what the cache lacks."""
    total = len(files)
    progress(PHASE_PARSING, 0, total)
    if not options.use_cache:
        fresh = _extract(root, files, options.workers, progress, cancelled, 0, total)
        return [fresh[scanned.rel_path] for scanned in files], 0

    cache_dir = options.cache_dir or default_cache_dir()
    with RecordCache.for_project(cache_dir, root) as cache:
        known = cache.load(files)
        missing = [scanned for scanned in files if scanned.rel_path not in known]
        if known:
            progress(PHASE_PARSING, len(known), total)
        fresh = _extract(root, missing, options.workers, progress, cancelled, len(known), total)
        cache.store((scanned, fresh[scanned.rel_path]) for scanned in missing)
        cache.prune(scanned.rel_path for scanned in files)
    known.update(fresh)
    return [known[scanned.rel_path] for scanned in files], total - len(missing)


def _extract(
    root: str,
    files: list[ScannedFile],
    workers: int | None,
    progress: ProgressCallback,
    cancelled: CancelCheck,
    already_done: int,
    total: int,
) -> dict[str, FileRecord]:
    """Extract ``files``, in parallel when there are enough of them to benefit."""
    paths = [scanned.rel_path for scanned in files]
    worker_count = default_workers() if workers is None else max(1, workers)
    records: dict[str, FileRecord] = {}

    if worker_count > 1 and len(paths) >= PARALLEL_THRESHOLD:
        try:
            _extract_parallel(
                root, paths, worker_count, progress, cancelled, already_done, total, records
            )
        except (BrokenProcessPool, OSError) as exc:
            # Worker processes can be unavailable (restricted sandboxes, frozen
            # executables). Analysis still has to work, just more slowly.
            logger.warning("Parallel extraction unavailable, continuing serially: %s", exc)
        else:
            return records

    for path in paths:
        if path in records:
            continue
        _check(cancelled)
        records[path] = extract_file(root, path)
        progress(PHASE_PARSING, already_done + len(records), total)
    return records


def _extract_parallel(
    root: str,
    paths: list[str],
    worker_count: int,
    progress: ProgressCallback,
    cancelled: CancelCheck,
    already_done: int,
    total: int,
    records: dict[str, FileRecord],
) -> None:
    chunk_size = max(1, min(64, len(paths) // (worker_count * 4)))
    executor = ProcessPoolExecutor(max_workers=worker_count)
    try:
        results = executor.map(extract_file, repeat(root), paths, chunksize=chunk_size)
        for record in results:
            if cancelled():
                raise AnalysisCancelled
            records[record.rel_path] = record
            if len(records) % chunk_size == 0 or len(records) == len(paths):
                progress(PHASE_PARSING, already_done + len(records), total)
    finally:
        executor.shutdown(wait=True, cancel_futures=True)


def _check(cancelled: CancelCheck) -> None:
    if cancelled():
        raise AnalysisCancelled


def _ignore_progress(_phase: str, _done: int, _total: int) -> None:
    return None


def _never_cancel() -> bool:
    return False
