"""Regression tests for defects found during the production-hardening audit.

Each test states behaviour the analyzer must keep. Every one of them failed
against the original implementation.
"""

from __future__ import annotations

import os
from collections import Counter
from pathlib import Path

import pytest

from pyanalyzer.analysis import pipeline
from pyanalyzer.analysis.pipeline import AnalysisOptions, analyze_project
from pyanalyzer.graph.builder import find_cycles
from pyanalyzer.models.core import DependencyGraph, ElementType, GraphEdge, GraphNode
from pyanalyzer.scanner.file_scanner import scan_project
from tests.conftest import Analyze, ProjectFactory


def test_parallel_extraction_matches_serial_extraction(
    make_project: ProjectFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Originally a parser shared between threads attributed elements to the wrong file."""
    files = {
        f"pkg/m{i}.py": f"from pkg import m{(i + 1) % 30}\n"
        + "\n".join(
            f"def f{i}_{j}(a, b=1):\n    return m{(i + 1) % 30}.f{(i + 1) % 30}_{j}(a)"
            for j in range(40)
        )
        for i in range(30)
    }
    files["pkg/__init__.py"] = ""
    project = str(make_project(files))
    monkeypatch.setattr(pipeline, "PARALLEL_THRESHOLD", 1)

    serial = analyze_project(project, AnalysisOptions(workers=1)).resolution
    parallel = analyze_project(project, AnalysisOptions(workers=4)).resolution

    assert parallel.elements == serial.elements
    assert parallel.usages == serial.usages
    functions = [e for e in serial.elements.values() if e.type is ElementType.FUNCTION]
    assert len(functions) == 30 * 40
    for function in functions:
        module_number = function.name.split("_")[0].removeprefix("f")
        assert function.location.file_path == f"pkg/m{module_number}.py"
        assert function.id == f"function:pkg/m{module_number}.py:{function.name}"


def test_same_named_methods_in_one_file_get_distinct_ids(analyze: Analyze) -> None:
    result = analyze(
        {
            "shapes.py": """
                class Circle:
                    def __init__(self) -> None: ...
                    def area(self) -> float: ...

                class Square:
                    def __init__(self) -> None: ...
                    def area(self) -> float: ...
            """
        }
    )

    functions = [e for e in result.resolution.elements.values() if e.type is ElementType.FUNCTION]
    assert Counter(f.name for f in functions) == {"__init__": 2, "area": 2}
    assert {f.id for f in functions} == {
        "function:shapes.py:Circle.__init__",
        "function:shapes.py:Circle.area",
        "function:shapes.py:Square.__init__",
        "function:shapes.py:Square.area",
    }


def test_stdlib_import_does_not_link_to_project_files(analyze: Analyze) -> None:
    """Originally ``import os`` matched any file whose path contained "os"."""
    result = analyze(
        {
            "main.py": "import os\n\nprint(os.sep)\n",
            "positions.py": "ORIGIN = (0, 0)\n",
        }
    )

    assert result.module_graph.edges == []
    assert result.resolution.stdlib_modules == {"os": 1}


def test_unrelated_attribute_access_is_not_a_usage(analyze: Analyze) -> None:
    """Originally ``config.get(...)`` counted as a use of every function named ``get``."""
    result = analyze(
        {
            "store.py": "def get(key: str) -> str:\n    return key\n",
            "other.py": "config: dict[str, str] = {}\nvalue = config.get('a')\n",
        }
    )

    assert "function:store.py:get" not in result.resolution.usages


def test_a_call_is_counted_once(analyze: Analyze) -> None:
    """Originally each call was recorded as both a call and a name reference."""
    result = analyze(
        {
            "store.py": "def get(key: str) -> str:\n    return key\n",
            "other.py": "from store import get\n\nvalue = get('a')\n",
        }
    )

    usages = result.resolution.usages["function:store.py:get"]
    assert [(u.usage_type.value, u.location.line_number) for u in usages] == [
        ("import", 1),
        ("call", 3),
    ]


def _chain_graph(size: int) -> DependencyGraph:
    nodes = {f"m{i}": GraphNode(id=f"m{i}", name=f"m{i}", type="module") for i in range(size)}
    edges = [GraphEdge(f"m{i}", f"m{i + 1}", "import") for i in range(size - 1)]
    return DependencyGraph(nodes=nodes, edges=edges)


def test_cycle_detection_handles_deep_import_chains() -> None:
    """Originally a recursive search hit Python's recursion limit."""
    size = 5000
    graph = _chain_graph(size)
    graph.edges.append(GraphEdge(f"m{size - 1}", "m0", "import"))

    cycles = find_cycles(graph)

    assert len(cycles) == 1
    assert len(cycles[0]) == size


def test_cycle_detection_survives_a_node_that_imports_into_a_cycle() -> None:
    """Originally stale search state raised ValueError for this shape."""
    nodes = {n: GraphNode(id=n, name=n, type="module") for n in "abx"}
    edges = [
        GraphEdge("a", "b", "import"),
        GraphEdge("b", "a", "import"),
        GraphEdge("x", "a", "import"),
    ]

    assert find_cycles(DependencyGraph(nodes=nodes, edges=edges)) == [["a", "b"]]


def test_acyclic_graph_has_no_cycles() -> None:
    assert find_cycles(_chain_graph(50)) == []


@pytest.mark.skipif(not hasattr(os, "symlink"), reason="requires symlink support")
def test_scanner_visits_each_file_once_despite_symlink_loops(make_project: ProjectFactory) -> None:
    """Originally a directory link back to the root repeated every file about forty times."""
    project = make_project({"pkg/mod.py": "x = 1\n"})
    (project / "pkg" / "loop").symlink_to(project, target_is_directory=True)

    found = scan_project(str(project))

    assert [scanned.rel_path for scanned in found.files] == ["pkg/mod.py"]


def test_files_with_declared_encoding_are_parsed(make_project: ProjectFactory) -> None:
    """Originally every file was decoded as UTF-8, so such files were silently dropped."""
    project = make_project({})
    Path(project, "latin.py").write_bytes(
        "# -*- coding: latin-1 -*-\ndef caf\xe9() -> str:\n    return 'ol\xe9'\n".encode("latin-1")
    )

    result = analyze_project(str(project), AnalysisOptions(workers=1))

    assert "function:latin.py:café" in result.resolution.elements
    assert result.skipped == []
