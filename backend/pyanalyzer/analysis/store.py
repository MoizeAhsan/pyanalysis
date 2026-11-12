"""Thread-safe holder for the current analysis result."""

from __future__ import annotations

import threading

from pyanalyzer.analysis.pipeline import AnalysisResult


class AnalysisStore:
    """Holds the most recent successful analysis.

    A result is swapped in whole once an analysis succeeds, so readers always
    see a complete snapshot and a failed run never destroys the previous one.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._result: AnalysisResult | None = None

    @property
    def result(self) -> AnalysisResult | None:
        with self._lock:
            return self._result

    def set(self, result: AnalysisResult) -> None:
        with self._lock:
            self._result = result

    def clear(self) -> None:
        with self._lock:
            self._result = None
