"""Tests for the on-disk record cache and its use by the pipeline."""

from __future__ import annotations

import os
import pickle
import sqlite3
from pathlib import Path

import pytest

from pyanalyzer.analysis import cache as cache_module
from pyanalyzer.analysis import pipeline
from pyanalyzer.analysis.cache import RecordCache, default_cache_dir
from pyanalyzer.analysis.pipeline import AnalysisOptions, analyze_project
from pyanalyzer.parsers.extractor import extract_file
from pyanalyzer.scanner.file_scanner import ScannedFile, scan_project
from tests.conftest import ProjectFactory


def options(cache_dir: Path) -> AnalysisOptions:
    return AnalysisOptions(workers=1, cache_dir=cache_dir)


def count_extractions(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Record every path the pipeline actually parses."""
    extracted: list[str] = []

    def spy(root: str, rel_path: str) -> object:
        extracted.append(rel_path)
        return extract_file(root, rel_path)

    monkeypatch.setattr(pipeline, "extract_file", spy)
    return extracted


def test_second_run_reuses_every_record(
    sample_project: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache_dir = tmp_path / "cache"
    first = analyze_project(str(sample_project), options(cache_dir))
    extracted = count_extractions(monkeypatch)

    second = analyze_project(str(sample_project), options(cache_dir))

    assert (first.cached_files, second.cached_files) == (0, 5)
    assert extracted == []
    assert second.resolution.elements == first.resolution.elements
    assert second.resolution.usages == first.resolution.usages
    assert second.module_graph == first.module_graph


def test_only_changed_files_are_parsed_again(
    sample_project: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache_dir = tmp_path / "cache"
    analyze_project(str(sample_project), options(cache_dir))
    (sample_project / "utils.py").write_text("def brand_new() -> None: ...\n")
    extracted = count_extractions(monkeypatch)

    result = analyze_project(str(sample_project), options(cache_dir))

    assert extracted == ["utils.py"]
    assert result.cached_files == 4
    assert "function:utils.py:brand_new" in result.resolution.elements
    assert "function:utils.py:helper_function" not in result.resolution.elements
    # Cross-file results are recomputed, so the caller of the removed function loses its link.
    assert "function:utils.py:helper_function" not in result.resolution.usages


def test_touching_a_file_without_changing_its_size_invalidates_it(
    sample_project: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache_dir = tmp_path / "cache"
    analyze_project(str(sample_project), options(cache_dir))
    target = sample_project / "models.py"
    stat = target.stat()
    os.utime(target, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))
    extracted = count_extractions(monkeypatch)

    analyze_project(str(sample_project), options(cache_dir))

    assert extracted == ["models.py"]


def test_added_and_removed_files_are_handled(
    sample_project: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache_dir = tmp_path / "cache"
    analyze_project(str(sample_project), options(cache_dir))
    (sample_project / "utils.py").unlink()
    (sample_project / "extra.py").write_text("def extra() -> None: ...\n")
    extracted = count_extractions(monkeypatch)

    result = analyze_project(str(sample_project), options(cache_dir))

    assert extracted == ["extra.py"]
    assert "module:utils.py" not in result.resolution.elements
    with RecordCache.for_project(cache_dir, str(sample_project.resolve())) as cache:
        stale = ScannedFile("utils.py", 0, 0)
        assert cache.load([stale]) == {}


def test_cache_can_be_disabled(sample_project: Path, tmp_path: Path) -> None:
    cache_dir = tmp_path / "cache"

    result = analyze_project(
        str(sample_project), AnalysisOptions(workers=1, use_cache=False, cache_dir=cache_dir)
    )

    assert result.cached_files == 0
    assert not cache_dir.exists()


def test_corrupt_cache_file_is_replaced(sample_project: Path, tmp_path: Path) -> None:
    cache_dir = tmp_path / "cache"
    analyze_project(str(sample_project), options(cache_dir))
    (database,) = cache_dir.glob("*.sqlite3")
    database.write_bytes(b"this is not a database")

    broken = analyze_project(str(sample_project), options(cache_dir))
    healed = analyze_project(str(sample_project), options(cache_dir))

    assert broken.project.total_files == 5
    assert healed.project.total_files == 5


def test_tampered_records_cannot_execute_code(sample_project: Path, tmp_path: Path) -> None:
    cache_dir = tmp_path / "cache"
    analyze_project(str(sample_project), options(cache_dir))
    (database,) = cache_dir.glob("*.sqlite3")
    marker = tmp_path / "executed"

    class Exploit:
        def __reduce__(self) -> tuple[object, tuple[str]]:
            return (os.system, (f"touch {marker}",))

    connection = sqlite3.connect(database)
    connection.execute("UPDATE files SET record = ?", (pickle.dumps(Exploit()),))
    connection.commit()
    connection.close()

    result = analyze_project(str(sample_project), options(cache_dir))

    assert not marker.exists()
    assert result.cached_files == 0
    assert result.project.total_files == 5


def test_records_from_another_extractor_version_are_discarded(
    sample_project: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache_dir = tmp_path / "cache"
    analyze_project(str(sample_project), options(cache_dir))
    monkeypatch.setattr(cache_module, "EXTRACTOR_VERSION", 999_999)

    result = analyze_project(str(sample_project), options(cache_dir))

    assert result.cached_files == 0


def test_unusable_cache_directory_does_not_break_analysis(
    sample_project: Path, tmp_path: Path
) -> None:
    blocker = tmp_path / "not-a-directory"
    blocker.write_text("")

    result = analyze_project(str(sample_project), options(blocker / "cache"))

    assert result.project.total_files == 5
    assert result.cached_files == 0


def test_each_project_gets_its_own_cache_file(make_project: ProjectFactory, tmp_path: Path) -> None:
    cache_dir = tmp_path / "cache"
    first = make_project({"a.py": ""})
    second = make_project({"a.py": "def different() -> None: ...\n"})

    analyze_project(str(first), options(cache_dir))
    result = analyze_project(str(second), options(cache_dir))

    assert len(list(cache_dir.glob("*.sqlite3"))) == 2
    assert "function:a.py:different" in result.resolution.elements


def test_store_and_load_round_trip(sample_project: Path, tmp_path: Path) -> None:
    files = scan_project(str(sample_project)).files
    extracted = [(f, extract_file(str(sample_project), f.rel_path)) for f in files]

    with RecordCache(tmp_path / "c" / "records.sqlite3") as cache:
        assert cache.enabled
        cache.store(extracted)
        loaded = cache.load(files)

    assert loaded == {scanned.rel_path: record for scanned, record in extracted}


def test_default_cache_dir_honours_xdg(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr("sys.platform", "linux")
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))

    assert default_cache_dir() == tmp_path / "pyanalyzer"


def test_analysis_falls_back_to_serial_when_worker_processes_fail(
    make_project: ProjectFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = make_project({f"m{i}.py": f"def f{i}(): ...\n" for i in range(6)})
    monkeypatch.setattr(pipeline, "PARALLEL_THRESHOLD", 1)

    def refuse(*_args: object, **_kwargs: object) -> object:
        raise OSError("process creation is not permitted")

    monkeypatch.setattr(pipeline, "ProcessPoolExecutor", refuse)

    result = analyze_project(str(project), AnalysisOptions(workers=4, use_cache=False))

    assert result.project.total_files == 6
    assert len(result.resolution.elements) == 12
