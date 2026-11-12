"""Tests for the end-to-end analysis pipeline."""

from __future__ import annotations

from pathlib import Path

import pytest

from pyanalyzer.analysis import pipeline
from pyanalyzer.analysis.pipeline import (
    AnalysisCancelled,
    AnalysisOptions,
    AnalysisResult,
    analyze_project,
    default_workers,
)
from pyanalyzer.analysis.store import AnalysisStore
from pyanalyzer.scanner.file_scanner import ProjectPathError
from tests.conftest import Analyze, ProjectFactory


def test_project_info_totals(sample_project: Path) -> None:
    result = analyze_project(str(sample_project), AnalysisOptions(workers=1))

    project = result.project
    assert (project.name, project.path) == ("project", str(sample_project.resolve()))
    assert project.total_files == 5
    assert project.total_lines == sum(
        len(p.read_text().splitlines()) for p in sample_project.rglob("*.py")
    )
    assert project.analysis_timestamp.tzinfo is not None
    assert result.duration_seconds > 0


def test_progress_reports_each_phase_and_every_file(sample_project: Path) -> None:
    events: list[tuple[str, int, int]] = []

    analyze_project(
        str(sample_project),
        AnalysisOptions(workers=1),
        on_progress=lambda phase, done, total: events.append((phase, done, total)),
    )

    assert [phase for phase, _, _ in events if phase != "parsing"] == [
        "scanning",
        "resolving",
        "graph",
        "analyzing",
    ]
    assert [(done, total) for phase, done, total in events if phase == "parsing"] == [
        (i, 5) for i in range(6)
    ]


def test_parallel_progress_ends_at_the_total(
    make_project: ProjectFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = make_project({f"m{i}.py": f"def f{i}(): ...\n" for i in range(12)})
    monkeypatch.setattr(pipeline, "PARALLEL_THRESHOLD", 1)
    parsing: list[tuple[int, int]] = []

    result = analyze_project(
        str(project),
        AnalysisOptions(workers=2),
        on_progress=lambda phase, done, total: (
            parsing.append((done, total)) if phase == "parsing" else None
        ),
    )

    assert parsing[0] == (0, 12)
    assert parsing[-1] == (12, 12)
    assert [done for done, _ in parsing] == sorted(done for done, _ in parsing)
    assert result.project.total_files == 12


@pytest.mark.parametrize("workers", [1, 2])
def test_cancellation_raises_and_stops_work(
    make_project: ProjectFactory, monkeypatch: pytest.MonkeyPatch, workers: int
) -> None:
    project = make_project({f"m{i}.py": "x = 1\n" for i in range(20)})
    monkeypatch.setattr(pipeline, "PARALLEL_THRESHOLD", 1)
    seen: list[int] = []

    def on_progress(phase: str, done: int, _total: int) -> None:
        if phase == "parsing":
            seen.append(done)

    with pytest.raises(AnalysisCancelled):
        analyze_project(
            str(project),
            AnalysisOptions(workers=workers),
            on_progress=on_progress,
            should_cancel=lambda: len(seen) >= 2,
        )

    assert max(seen) < 20


def test_unparsable_files_are_listed_as_skipped_and_others_still_analyzed(
    analyze: Analyze,
) -> None:
    result = analyze({"good.py": "def ok(): ...\n", "bad.py": "def broken(:\n"})

    assert [(s.file_path, s.reason.split(":")[0]) for s in result.skipped] == [
        ("bad.py", "syntax error at line 1")
    ]
    assert "function:good.py:ok" in result.resolution.elements
    assert "module:bad.py" in result.resolution.elements
    assert result.project.total_files == 2


def test_options_are_passed_to_the_scanner(make_project: ProjectFactory) -> None:
    project = make_project({"app.py": "", "tests/test_app.py": "", "big.py": "x = 1\n" * 50})

    result = analyze_project(
        str(project), AnalysisOptions(exclude=("tests/",), max_file_size=20, workers=1)
    )

    assert set(result.resolution.elements) == {"module:app.py"}
    assert [s.file_path for s in result.skipped] == ["big.py"]


def test_invalid_path_raises_before_any_work(tmp_path: Path) -> None:
    with pytest.raises(ProjectPathError):
        analyze_project(str(tmp_path / "missing"))


def test_analysis_is_deterministic(sample_project: Path) -> None:
    first = analyze_project(str(sample_project), AnalysisOptions(workers=1))
    second = analyze_project(str(sample_project), AnalysisOptions(workers=1))

    assert first.resolution.elements == second.resolution.elements
    assert first.resolution.usages == second.resolution.usages
    assert first.module_graph == second.module_graph
    assert list(first.resolution.elements) == list(second.resolution.elements)


def test_default_workers_is_bounded() -> None:
    assert 1 <= default_workers() <= pipeline.MAX_DEFAULT_WORKERS


def test_store_swaps_results_atomically(sample_project: Path) -> None:
    store = AnalysisStore()

    def current() -> AnalysisResult | None:
        return store.result

    assert current() is None
    result = analyze_project(str(sample_project), AnalysisOptions(workers=1))
    store.set(result)
    assert current() is result
    store.clear()
    assert current() is None
