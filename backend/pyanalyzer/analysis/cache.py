"""On-disk cache of per-file extraction records.

Re-analyzing a project only re-parses files whose size or modification time
changed. Everything derived across files (resolution, graphs, findings) is
recomputed each run, so the cache can never make results inconsistent with one
another; at worst a stale entry is one file's own record.

The cache is an optimisation only: every failure to read or write it is
swallowed and treated as a miss.
"""

from __future__ import annotations

import contextlib
import hashlib
import io
import logging
import os
import pickle
import sqlite3
import sys
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any, Final

from pyanalyzer.models import core, records
from pyanalyzer.models.records import FileRecord
from pyanalyzer.parsers.extractor import EXTRACTOR_VERSION
from pyanalyzer.scanner.file_scanner import ScannedFile

logger = logging.getLogger(__name__)

_SCHEMA: Final = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS files (
    rel_path TEXT PRIMARY KEY,
    size INTEGER NOT NULL,
    mtime_ns INTEGER NOT NULL,
    record BLOB NOT NULL
) WITHOUT ROWID;
"""

#: Records are pickled for speed, but unpickling is restricted to exactly these
#: data classes, so a tampered cache file cannot run code.
_ALLOWED_GLOBALS: Final[dict[tuple[str, str], Any]] = {
    (cls.__module__, cls.__qualname__): cls
    for cls in (
        core.CodeElement,
        core.ElementType,
        core.Parameter,
        core.ParameterKind,
        core.SourceLocation,
        records.FileRecord,
        records.ImportBinding,
        records.Reference,
        records.RefKind,
        records.TargetKind,
    )
}


class _RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module: str, name: str) -> Any:
        try:
            return _ALLOWED_GLOBALS[module, name]
        except KeyError:
            raise pickle.UnpicklingError(f"forbidden global {module}.{name}") from None


def _fingerprint() -> str:
    """Identifies record compatibility: extractor version and Python's AST version."""
    return f"{EXTRACTOR_VERSION}:{sys.version_info.major}.{sys.version_info.minor}"


def default_cache_dir() -> Path:
    """Per-user cache directory following each platform's convention."""
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    elif sys.platform == "darwin":
        base = str(Path.home() / "Library" / "Caches")
    else:
        base = os.environ.get("XDG_CACHE_HOME") or str(Path.home() / ".cache")
    return Path(base) / "pyanalyzer"


class RecordCache:
    """SQLite-backed cache of :class:`FileRecord` objects for one project."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._connection: sqlite3.Connection | None = None
        try:
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            self._connection = self._open()
        except (OSError, sqlite3.Error) as exc:
            logger.warning("Analysis cache disabled (%s): %s", path, exc)

    @classmethod
    def for_project(cls, cache_dir: Path, project_root: str) -> RecordCache:
        """Cache file for ``project_root`` inside ``cache_dir``."""
        digest = hashlib.sha256(project_root.encode("utf-8", "surrogateescape")).hexdigest()[:20]
        return cls(cache_dir / f"{digest}.sqlite3")

    def _open(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._path, check_same_thread=False)
        try:
            connection.executescript(_SCHEMA)
            row = connection.execute("SELECT value FROM meta WHERE key = 'fingerprint'").fetchone()
            if row is None or row[0] != _fingerprint():
                connection.execute("DELETE FROM files")
                connection.execute(
                    "INSERT OR REPLACE INTO meta (key, value) VALUES ('fingerprint', ?)",
                    (_fingerprint(),),
                )
            connection.commit()
        except sqlite3.Error:
            connection.close()
            raise
        return connection

    @property
    def enabled(self) -> bool:
        return self._connection is not None

    def load(self, files: Sequence[ScannedFile]) -> dict[str, FileRecord]:
        """Cached records for the files whose size and mtime are unchanged."""
        if self._connection is None:
            return {}
        wanted = {scanned.rel_path: scanned for scanned in files}
        hits: dict[str, FileRecord] = {}
        try:
            cursor = self._connection.execute("SELECT rel_path, size, mtime_ns, record FROM files")
            for rel_path, size, mtime_ns, blob in cursor:
                scanned = wanted.get(rel_path)
                if scanned is None or scanned.size != size or scanned.mtime_ns != mtime_ns:
                    continue
                record = _RestrictedUnpickler(io.BytesIO(blob)).load()
                if isinstance(record, FileRecord) and record.rel_path == rel_path:
                    hits[rel_path] = record
        except (sqlite3.Error, pickle.UnpicklingError, EOFError, AttributeError, TypeError) as exc:
            logger.warning("Ignoring unreadable analysis cache %s: %s", self._path, exc)
            self._discard()
            return {}
        return hits

    def store(self, entries: Iterable[tuple[ScannedFile, FileRecord]]) -> None:
        """Insert or replace records for freshly extracted files."""
        if self._connection is None:
            return
        rows = (
            (
                scanned.rel_path,
                scanned.size,
                scanned.mtime_ns,
                pickle.dumps(record, protocol=pickle.HIGHEST_PROTOCOL),
            )
            for scanned, record in entries
        )
        try:
            with self._connection:
                self._connection.executemany(
                    "INSERT OR REPLACE INTO files (rel_path, size, mtime_ns, record) "
                    "VALUES (?, ?, ?, ?)",
                    rows,
                )
        except sqlite3.Error as exc:
            logger.warning("Could not update analysis cache %s: %s", self._path, exc)

    def prune(self, keep: Iterable[str]) -> None:
        """Drop entries for files that are no longer part of the project."""
        if self._connection is None:
            return
        keep_set = set(keep)
        try:
            with self._connection:
                stale = [
                    (rel_path,)
                    for (rel_path,) in self._connection.execute("SELECT rel_path FROM files")
                    if rel_path not in keep_set
                ]
                self._connection.executemany("DELETE FROM files WHERE rel_path = ?", stale)
        except sqlite3.Error as exc:
            logger.warning("Could not prune analysis cache %s: %s", self._path, exc)

    def _discard(self) -> None:
        """Throw the cache file away after finding it corrupt."""
        self.close()
        with contextlib.suppress(OSError):
            self._path.unlink()
        with contextlib.suppress(OSError, sqlite3.Error):
            self._connection = self._open()

    def close(self) -> None:
        if self._connection is not None:
            with contextlib.suppress(sqlite3.Error):
                self._connection.close()
            self._connection = None

    def __enter__(self) -> RecordCache:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()
