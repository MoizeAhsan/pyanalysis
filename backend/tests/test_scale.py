"""Scale benchmark on a synthetic 10,000-file project.

Deselected by default in CI's fast lane (``-m "not slow"``). The budgets are
loose on purpose: they catch accidental quadratic behaviour, not small
regressions, and must hold on a modest laptop.
"""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from pyanalyzer.analysis.index import AnalysisIndex
from pyanalyzer.analysis.pipeline import AnalysisOptions, analyze_project
from pyanalyzer.models.core import ElementType

FILES = 10_000
PACKAGES = 100


def _module_source(number: int) -> str:
    """A module that imports a few others, subclasses one, and calls into them."""
    targets = [(number * 7 + step) % FILES for step in (1, 13, 101)]
    lines = [f'"""Module {number}."""', "import os", "import json"]
    for target in targets:
        package = f"pkg{target % PACKAGES:03d}.mod{target:05d}"
        lines.append(f"from {package} import Service{target}, helper{target}")
    lines += [
        "",
        f"class Service{number}(Service{targets[0]}):",
        f'    """Service number {number}."""',
        "",
        "    def run(self, value: int) -> int:",
        "        if value > 10:",
        f"            return helper{targets[1]}(value)",
        "        return self.fallback(value)",
        "",
        "    def fallback(self, value: int) -> int:",
        "        return value + 1",
        "",
        f"def helper{number}(value: int) -> int:",
        f"    service = Service{targets[2]}()",
        "    return service.run(value) + len(os.sep)",
        "",
    ]
    return "\n".join(lines)


@pytest.fixture(scope="module")
def big_project(tmp_path_factory: pytest.TempPathFactory) -> Path:
    root = tmp_path_factory.mktemp("big") / "project"
    for package in range(PACKAGES):
        directory = root / f"pkg{package:03d}"
        directory.mkdir(parents=True)
        (directory / "__init__.py").write_text("")
    for number in range(FILES):
        path = root / f"pkg{number % PACKAGES:03d}" / f"mod{number:05d}.py"
        path.write_text(_module_source(number))
    return root


@pytest.mark.slow
def test_ten_thousand_files(big_project: Path, tmp_path: Path) -> None:
    options = AnalysisOptions(cache_dir=tmp_path / "cache")

    started = time.perf_counter()
    cold = analyze_project(str(big_project), options)
    cold_seconds = time.perf_counter() - started

    started = time.perf_counter()
    warm = analyze_project(str(big_project), options)
    warm_seconds = time.perf_counter() - started

    # Correctness at scale.
    assert cold.project.total_files == FILES + PACKAGES
    assert cold.skipped == []
    elements = cold.resolution.elements
    assert sum(e.type is ElementType.CLASS for e in elements.values()) == FILES
    assert sum(e.type is ElementType.FUNCTION for e in elements.values()) == 3 * FILES
    assert len(cold.resolution.class_bases) == FILES
    assert cold.module_graph.metrics is not None
    assert cold.module_graph.metrics.edge_count == 3 * FILES
    # Per module: json, one Service, and two helpers are imported but unused.
    assert sum(issue.kind == "unused_import" for issue in cold.issues) == 4 * FILES

    # The cache serves every file and the warm result is identical.
    assert (cold.cached_files, warm.cached_files) == (0, FILES + PACKAGES)
    assert warm.resolution.usages == cold.resolution.usages
    assert warm.module_graph == cold.module_graph

    # Time budgets.
    assert cold_seconds < 180, f"cold analysis took {cold_seconds:.1f}s"
    assert warm_seconds < cold_seconds / 1.5, (
        f"warm {warm_seconds:.1f}s is not clearly faster than cold {cold_seconds:.1f}s"
    )

    # Interactive queries stay fast once indexed.
    started = time.perf_counter()
    index = AnalysisIndex(cold)
    index_seconds = time.perf_counter() - started
    assert index_seconds < 15, f"indexing took {index_seconds:.1f}s"

    def timed(action: object) -> float:
        assert callable(action)
        begin = time.perf_counter()
        action()
        return time.perf_counter() - begin

    budgets = {
        "search": timed(
            lambda: index.search("service12", None, include_docstrings=False, offset=0, limit=50)
        ),
        "search+docstrings": timed(
            lambda: index.search("number 77", None, include_docstrings=True, offset=0, limit=50)
        ),
        "module graph": timed(lambda: index.graph_view("module", max_nodes=300)),
        "focused graph": timed(
            lambda: index.graph_view("module", focus="module:pkg001/mod00001.py", depth=2)
        ),
        "package graph": timed(lambda: index.graph_view("package")),
        "class graph": timed(lambda: index.graph_view("class", max_nodes=300)),
        "tree": timed(lambda: index.tree_children("dir:pkg001")),
        "elements page": timed(
            lambda: index.list_elements(ElementType.FUNCTION, None, 20_000, 100)
        ),
    }
    print(
        f"\ncold {cold_seconds:.1f}s, warm {warm_seconds:.1f}s, index {index_seconds:.2f}s; "
        + ", ".join(f"{name} {seconds * 1000:.0f}ms" for name, seconds in budgets.items())
    )
    first_use = {"package graph", "class graph", "focused graph"}  # build a graph on first call
    for name, seconds in budgets.items():
        limit = 5.0 if name in first_use else 0.5
        assert seconds < limit, f"{name} took {seconds:.2f}s"
