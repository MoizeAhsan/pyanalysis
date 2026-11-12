"""Discovery of Python source files in a project directory."""

from __future__ import annotations

import os
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

from pathspec import GitIgnoreSpec

from pyanalyzer.models.core import SkippedFile

#: Directories and files that are never worth analyzing. Patterns use
#: ``.gitignore`` syntax, as do user-supplied exclude patterns.
DEFAULT_EXCLUDES: Final[tuple[str, ...]] = (
    "__pycache__/",
    ".git/",
    ".svn/",
    ".hg/",
    "node_modules/",
    ".venv/",
    "venv/",
    ".env/",
    "env/",
    "site-packages/",
    ".mypy_cache/",
    ".pytest_cache/",
    ".ruff_cache/",
    ".tox/",
    ".nox/",
    ".eggs/",
    "*.egg-info/",
    "build/",
    "dist/",
    "htmlcov/",
)

DEFAULT_MAX_FILE_SIZE: Final = 2 * 1024 * 1024


class ProjectPathError(ValueError):
    """The requested project path does not exist or is not a directory."""


@dataclass(slots=True, frozen=True)
class ScanOptions:
    """What to include when scanning a project."""

    exclude: tuple[str, ...] = ()
    respect_gitignore: bool = True
    use_default_excludes: bool = True
    max_file_size: int = DEFAULT_MAX_FILE_SIZE


@dataclass(slots=True, frozen=True)
class ScannedFile:
    """A Python file found by the scanner, with the stat data used for caching."""

    rel_path: str
    size: int
    mtime_ns: int


@dataclass(slots=True)
class ScanResult:
    """Files to analyze, plus files that were found but deliberately left out."""

    root: str
    files: list[ScannedFile] = field(default_factory=list)
    skipped: list[SkippedFile] = field(default_factory=list)


type _IgnoreRules = tuple[tuple[str, GitIgnoreSpec], ...]


def validate_project_path(project_path: str) -> Path:
    """Return the resolved project directory or raise a descriptive error."""
    if not project_path or not project_path.strip():
        raise ProjectPathError("Project path cannot be empty")
    path = Path(project_path.strip()).expanduser()
    if not path.exists():
        raise ProjectPathError(f"Project path does not exist: {project_path}")
    if not path.is_dir():
        raise ProjectPathError(f"Project path is not a directory: {project_path}")
    resolved = path.resolve()
    if not os.access(resolved, os.R_OK | os.X_OK):
        raise PermissionError(f"Cannot access directory: {project_path}")
    return resolved


def scan_project(
    project_path: str,
    options: ScanOptions | None = None,
    should_cancel: Callable[[], bool] | None = None,
) -> ScanResult:
    """Find every ``.py`` file under ``project_path`` in one pass.

    Symbolic links are never followed, so link cycles cannot cause repeated or
    endless traversal. Excluded directories are pruned without being entered.
    Results are sorted by path so analysis is deterministic.
    """
    options = options or ScanOptions()
    root = validate_project_path(project_path)
    patterns = [*(DEFAULT_EXCLUDES if options.use_default_excludes else ()), *options.exclude]
    base_rules: _IgnoreRules = (("", GitIgnoreSpec.from_lines(patterns)),) if patterns else ()

    result = ScanResult(root=str(root))
    pending: list[tuple[str, _IgnoreRules]] = [("", base_rules)]
    while pending:
        if should_cancel is not None and should_cancel():
            break
        rel_dir, rules = pending.pop()
        try:
            with os.scandir(root / rel_dir if rel_dir else root) as iterator:
                entries = list(iterator)
        except OSError as exc:
            result.skipped.append(
                SkippedFile(rel_dir or ".", f"unreadable directory: {exc.strerror}")
            )
            continue

        if options.respect_gitignore:
            rules = _with_gitignore(root, rel_dir, entries, rules)

        for entry in entries:
            rel_path = f"{rel_dir}/{entry.name}" if rel_dir else entry.name
            is_python = entry.name.endswith(".py")
            if entry.is_symlink():
                if is_python and not _is_ignored(rel_path, rules):
                    result.skipped.append(SkippedFile(rel_path, "symbolic link"))
            elif entry.is_dir(follow_symlinks=False):
                if not _is_ignored(rel_path + "/", rules):
                    pending.append((rel_path, rules))
            elif is_python and entry.is_file(follow_symlinks=False):
                if _is_ignored(rel_path, rules):
                    continue
                try:
                    stat = entry.stat(follow_symlinks=False)
                except OSError as exc:
                    result.skipped.append(SkippedFile(rel_path, f"unreadable: {exc.strerror}"))
                    continue
                if stat.st_size > options.max_file_size:
                    result.skipped.append(
                        SkippedFile(rel_path, f"larger than {options.max_file_size} bytes")
                    )
                    continue
                result.files.append(ScannedFile(rel_path, stat.st_size, stat.st_mtime_ns))

    result.files.sort(key=lambda scanned: scanned.rel_path)
    result.skipped.sort(key=lambda skipped: skipped.file_path)
    return result


def _with_gitignore(
    root: Path, rel_dir: str, entries: list[os.DirEntry[str]], rules: _IgnoreRules
) -> _IgnoreRules:
    """Add the rules from ``rel_dir``'s own ``.gitignore``, if it has one."""
    if not any(entry.name == ".gitignore" for entry in entries):
        return rules
    try:
        lines = (root / rel_dir / ".gitignore").read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return rules
    return (*rules, (rel_dir, GitIgnoreSpec.from_lines(lines)))


def _is_ignored(rel_path: str, rules: _IgnoreRules) -> bool:
    """Whether any active rule set ignores ``rel_path`` (directories end with ``/``)."""
    for base, spec in rules:
        relative = rel_path[len(base) + 1 :] if base else rel_path
        if spec.match_file(relative):
            return True
    return False
