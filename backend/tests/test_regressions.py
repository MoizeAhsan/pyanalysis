"""Regression tests for defects found during the production-hardening audit.

Each test states the behaviour the analyzer must have. Tests still marked
``xfail(strict=True)`` document a defect that has not been fixed yet; the marker
is removed in the same change that fixes the defect.
"""

from __future__ import annotations

import os
import sys
from collections import Counter
from collections.abc import Iterator
from pathlib import Path

import pytest

from pyanalyzer.analysis.project_analyzer import ProjectAnalyzer
from pyanalyzer.api.routes import _detect_circular_dependencies
from pyanalyzer.models.core import (
    DependencyGraph,
    ElementType,
    GraphEdge,
    GraphNode,
    current_session,
)
from pyanalyzer.scanner.file_scanner import FileSystemScanner
from tests.conftest import ProjectFactory


@pytest.fixture(autouse=True)
def _clean_session() -> Iterator[None]:
    current_session.reset()
    yield
    current_session.reset()


@pytest.fixture
def aggressive_thread_switching() -> Iterator[None]:
    """Make thread interleavings frequent so data races show up deterministically."""
    previous = sys.getswitchinterval()
    sys.setswitchinterval(1e-5)
    yield
    sys.setswitchinterval(previous)


@pytest.mark.xfail(strict=True, reason="shared parser state races across worker threads")
@pytest.mark.usefixtures("aggressive_thread_switching")
def test_parallel_parsing_attributes_elements_to_their_own_file(
    make_project: ProjectFactory,
) -> None:
    files = {
        f"m{i}.py": "\n".join(f"def f{i}_{j}(a, b=1):\n    return a" for j in range(200))
        for i in range(40)
    }
    project = make_project(files)

    session = ProjectAnalyzer(max_workers=8).analyze_project(str(project))

    misattributed = [
        element.id
        for element in session.functions.values()
        if Path(element.location.file_path).stem != element.name.split("_")[0].replace("f", "m")
    ]
    assert misattributed == []
    assert len(session.functions) == 40 * 200


@pytest.mark.xfail(strict=True, reason="function ids omit the enclosing class")
def test_same_named_methods_in_one_file_get_distinct_ids(make_project: ProjectFactory) -> None:
    project = make_project(
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

    session = ProjectAnalyzer(max_workers=1).analyze_project(str(project))

    names = Counter(element.name for element in session.functions.values())
    assert names == {"__init__": 2, "area": 2}


@pytest.mark.xfail(strict=True, reason="import targets are matched by path substring")
def test_stdlib_import_does_not_link_to_project_files(make_project: ProjectFactory) -> None:
    project = make_project(
        {
            "main.py": "import os\n\nprint(os.sep)\n",
            "positions.py": "ORIGIN = (0, 0)\n",
        }
    )

    session = ProjectAnalyzer(max_workers=1).analyze_project(str(project))

    assert session.dependency_graph is not None
    assert [
        (Path(edge.source).name, Path(edge.target).name) for edge in session.dependency_graph.edges
    ] == []


@pytest.mark.xfail(strict=True, reason="usages are matched on bare attribute names")
def test_unrelated_attribute_access_is_not_a_usage(make_project: ProjectFactory) -> None:
    project = make_project(
        {
            "store.py": "def get(key: str) -> str:\n    return key\n",
            "other.py": "config: dict[str, str] = {}\nvalue = config.get('a')\n",
        }
    )

    session = ProjectAnalyzer(max_workers=1).analyze_project(str(project))

    get_function = next(e for e in session.functions.values() if e.name == "get")
    assert get_function.usages == []


@pytest.mark.xfail(strict=True, reason="cycle detection recurses once per node")
def test_cycle_detection_handles_deep_import_chains() -> None:
    size = 5000
    nodes = {
        f"m{i}": GraphNode(id=f"m{i}", name=f"m{i}", type=ElementType.MODULE) for i in range(size)
    }
    edges = [GraphEdge(f"m{i}", f"m{i + 1}", "import") for i in range(size - 1)]
    edges.append(GraphEdge(f"m{size - 1}", "m0", "import"))
    current_session.dependency_graph = DependencyGraph(nodes=nodes, edges=edges)

    cycles = _detect_circular_dependencies()

    assert len(cycles) == 1
    assert len(set(cycles[0])) == size


@pytest.mark.xfail(strict=True, reason="a found cycle leaves stale state behind and crashes")
def test_cycle_detection_survives_a_node_that_imports_into_a_cycle() -> None:
    nodes = {n: GraphNode(id=n, name=n, type=ElementType.MODULE) for n in "abx"}
    edges = [
        GraphEdge("a", "b", "import"),
        GraphEdge("b", "a", "import"),
        GraphEdge("x", "a", "import"),
    ]
    current_session.dependency_graph = DependencyGraph(nodes=nodes, edges=edges)

    cycles = _detect_circular_dependencies()

    assert [sorted(set(cycle)) for cycle in cycles] == [["a", "b"]]


@pytest.mark.skipif(not hasattr(os, "symlink"), reason="requires symlink support")
@pytest.mark.xfail(strict=True, reason="scanner follows directory symlinks")
def test_scanner_visits_each_file_once_despite_symlink_loops(make_project: ProjectFactory) -> None:
    project = make_project({"pkg/mod.py": "x = 1\n"})
    (project / "pkg" / "loop").symlink_to(project, target_is_directory=True)

    found = FileSystemScanner().scan_project(str(project))

    assert [Path(p).relative_to(project).as_posix() for p in found] == ["pkg/mod.py"]


@pytest.mark.xfail(
    strict=True, reason="files are opened as UTF-8 regardless of their coding cookie"
)
def test_files_with_declared_encoding_are_parsed(make_project: ProjectFactory) -> None:
    project = make_project({})
    (project / "latin.py").write_bytes(
        "# -*- coding: latin-1 -*-\ndef caf\xe9() -> str:\n    return 'ol\xe9'\n".encode("latin-1")
    )

    session = ProjectAnalyzer(max_workers=1).analyze_project(str(project))

    assert [element.name for element in session.functions.values()] == ["café"]
