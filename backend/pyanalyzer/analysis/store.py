"""Thread-safe holder for the current analysis."""

from __future__ import annotations

import threading

from pyanalyzer.analysis.index import AnalysisIndex
from pyanalyzer.analysis.pipeline import AnalysisResult


class AnalysisStore:
    """Holds the most recent successful analysis and its index.

    An analysis is swapped in whole once it succeeds, so readers always see a
    complete snapshot and a failed run never destroys the previous one.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._index: AnalysisIndex | None = None

    @property
    def index(self) -> AnalysisIndex | None:
        with self._lock:
            return self._index

    @property
    def result(self) -> AnalysisResult | None:
        index = self.index
        return None if index is None else index.result

    def set(self, result: AnalysisResult) -> AnalysisIndex:
        index = AnalysisIndex(result)
        with self._lock:
            self._index = index
        return index

    def clear(self) -> None:
        with self._lock:
            self._index = None
