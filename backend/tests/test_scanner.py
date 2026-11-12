"""Unit tests for project scanning."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from pyanalyzer.scanner.file_scanner import (
    ProjectPathError,
    ScanOptions,
    scan_project,
    validate_project_path,
)
from tests.conftest import ProjectFactory


def paths(project: Path, options: ScanOptions | None = None) -> list[str]:
    return [scanned.rel_path for scanned in scan_project(str(project), options).files]


def test_finds_python_files_recursively_in_sorted_order(make_project: ProjectFactory) -> None:
    project = make_project(
        {"z.py": "", "a/b/c.py": "", "a/__init__.py": "", "notes.txt": "", "a/data.json": ""}
    )

    assert paths(project) == ["a/__init__.py", "a/b/c.py", "z.py"]


def test_records_size_and_mtime_for_caching(make_project: ProjectFactory) -> None:
    project = make_project({"m.py": "x = 1\n"})

    scanned = scan_project(str(project)).files[0]

    stat = (project / "m.py").stat()
    assert (scanned.size, scanned.mtime_ns) == (stat.st_size, stat.st_mtime_ns)


def test_default_excludes_prune_tooling_directories(make_project: ProjectFactory) -> None:
    project = make_project(
        {
            "app.py": "",
            ".venv/lib/site.py": "",
            "node_modules/pkg/gyp.py": "",
            "__pycache__/x.py": "",
            "build/lib/app.py": "",
            "thing.egg-info/top.py": "",
            "src/.git/hook.py": "",
        }
    )

    assert paths(project) == ["app.py"]
    assert len(paths(project, ScanOptions(use_default_excludes=False))) == 7


def test_user_exclude_patterns_use_gitignore_syntax(make_project: ProjectFactory) -> None:
    project = make_project(
        {
            "app.py": "",
            "tests/test_app.py": "",
            "pkg/tests/test_pkg.py": "",
            "pkg/generated_pb2.py": "",
            "pkg/real.py": "",
        }
    )

    assert paths(project, ScanOptions(exclude=("tests/", "*_pb2.py"))) == ["app.py", "pkg/real.py"]
    assert paths(project, ScanOptions(exclude=("/tests/",))) == [
        "app.py",
        "pkg/generated_pb2.py",
        "pkg/real.py",
        "pkg/tests/test_pkg.py",
    ]


def test_gitignore_files_are_respected_at_every_level(make_project: ProjectFactory) -> None:
    project = make_project(
        {
            ".gitignore": "ignored_dir/\n*.gen.py\n",
            "app.py": "",
            "ignored_dir/x.py": "",
            "out.gen.py": "",
            "pkg/.gitignore": "/local_only.py\n",
            "pkg/local_only.py": "",
            "pkg/sub/local_only.py": "",
            "pkg/keep.py": "",
        }
    )

    assert paths(project) == ["app.py", "pkg/keep.py", "pkg/sub/local_only.py"]
    assert len(paths(project, ScanOptions(respect_gitignore=False))) == 6


def test_oversized_files_are_skipped_with_a_reason(make_project: ProjectFactory) -> None:
    project = make_project({"small.py": "x = 1\n", "big.py": "x = 1\n" * 100})

    result = scan_project(str(project), ScanOptions(max_file_size=50))

    assert [f.rel_path for f in result.files] == ["small.py"]
    assert [(s.file_path, s.reason) for s in result.skipped] == [("big.py", "larger than 50 bytes")]


@pytest.mark.skipif(not hasattr(os, "symlink"), reason="requires symlink support")
def test_symlinked_files_are_reported_and_linked_directories_are_not_entered(
    make_project: ProjectFactory, tmp_path: Path
) -> None:
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "secret.py").write_text("x = 1\n")
    project = make_project({"real.py": ""})
    (project / "link.py").symlink_to(project / "real.py")
    (project / "linked_dir").symlink_to(outside, target_is_directory=True)

    result = scan_project(str(project))

    assert [f.rel_path for f in result.files] == ["real.py"]
    assert [(s.file_path, s.reason) for s in result.skipped] == [("link.py", "symbolic link")]


@pytest.mark.skipif(os.name == "nt" or os.geteuid() == 0, reason="needs POSIX permissions")
def test_unreadable_directories_are_reported_and_scanning_continues(
    make_project: ProjectFactory,
) -> None:
    project = make_project({"ok.py": "", "locked/hidden.py": ""})
    locked = project / "locked"
    locked.chmod(0o000)
    try:
        result = scan_project(str(project))
    finally:
        locked.chmod(0o755)

    assert [f.rel_path for f in result.files] == ["ok.py"]
    assert [s.file_path for s in result.skipped] == ["locked"]
    assert result.skipped[0].reason.startswith("unreadable directory")


def test_cancellation_stops_the_walk(make_project: ProjectFactory) -> None:
    project = make_project({"a/x.py": "", "b/y.py": ""})

    result = scan_project(str(project), should_cancel=lambda: True)

    assert result.files == []


@pytest.mark.parametrize("bad", ["", "   "])
def test_empty_path_is_rejected(bad: str) -> None:
    with pytest.raises(ProjectPathError, match="cannot be empty"):
        validate_project_path(bad)


def test_missing_path_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ProjectPathError, match="does not exist"):
        scan_project(str(tmp_path / "nope"))


def test_file_path_is_rejected(tmp_path: Path) -> None:
    file_path = tmp_path / "f.py"
    file_path.write_text("")
    with pytest.raises(ProjectPathError, match="not a directory"):
        scan_project(str(file_path))


def test_root_is_resolved_to_an_absolute_path(
    make_project: ProjectFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = make_project({"m.py": ""})
    monkeypatch.chdir(project.parent)

    assert scan_project("project").root == str(project.resolve())
