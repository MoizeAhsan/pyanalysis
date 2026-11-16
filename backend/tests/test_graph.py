"""Unit tests for dependency graph construction."""

from __future__ import annotations

import pytest

from pyanalyzer.graph.builder import (
    build_class_graph,
    build_module_graph,
    build_package_graph,
    find_cycles,
    package_of,
)
from pyanalyzer.models.core import DependencyGraph
from tests.conftest import Analyze

LAYERED = {
    "app/__init__.py": "",
    "app/api/__init__.py": "",
    "app/api/routes.py": """
        from app.services.users import UserService
        from app.models import User

        def list_users() -> list[User]:
            return UserService().all()
    """,
    "app/services/__init__.py": "",
    "app/services/users.py": """
        from app.models import User, Base

        class UserService(Base):
            def all(self) -> list[User]:
                return [User(), User()]
    """,
    "app/models.py": "class Base: ...\nclass User(Base): ...\n",
    "main.py": "from app.api import routes\nroutes.list_users()\n",
}


def edges(graph: DependencyGraph) -> set[tuple[str, str, str, int]]:
    """Edges as (source, target, relationship, weight) with the id prefix removed."""
    return {
        (e.source.split(":", 1)[-1], e.target.split(":", 1)[-1], e.relationship_type, e.weight)
        for e in graph.edges
    }


def test_module_graph_edges_are_weighted_by_reference_count(analyze: Analyze) -> None:
    graph = build_module_graph(analyze(LAYERED).resolution)

    assert edges(graph) == {
        # import + the UserService() call + ``.all()`` on the new instance
        ("app/api/routes.py", "app/services/users.py", "import", 3),
        ("app/api/routes.py", "app/models.py", "import", 2),
        ("app/services/users.py", "app/models.py", "import", 6),
        ("main.py", "app/api/routes.py", "import", 2),
    }
    assert len(graph.nodes) == 7


def test_module_graph_node_degrees_and_metrics(analyze: Analyze) -> None:
    graph = build_module_graph(analyze(LAYERED).resolution)

    models = graph.nodes["module:app/models.py"]
    assert (models.in_degree, models.out_degree, models.name) == (2, 0, "app.models")
    routes = graph.nodes["module:app/api/routes.py"]
    assert (routes.in_degree, routes.out_degree) == (1, 2)
    assert graph.metrics is not None
    assert (graph.metrics.node_count, graph.metrics.edge_count) == (7, 4)
    assert graph.metrics.density == pytest.approx(4 / 42)
    assert graph.metrics.avg_degree == pytest.approx(8 / 7)


def test_class_graph_separates_inheritance_type_hints_and_use(analyze: Analyze) -> None:
    graph = build_class_graph(analyze(LAYERED).resolution)

    assert edges(graph) == {
        ("app/models.py:User", "app/models.py:Base", "inherits", 1),
        ("app/services/users.py:UserService", "app/models.py:Base", "inherits", 1),
        ("app/services/users.py:UserService", "app/models.py:User", "uses", 2),
        ("app/services/users.py:UserService", "app/models.py:User", "uses_type", 1),
    }
    assert set(graph.nodes) == {
        "class:app/models.py:Base",
        "class:app/models.py:User",
        "class:app/services/users.py:UserService",
    }


def test_package_graph_collapses_modules_by_directory_depth(analyze: Analyze) -> None:
    resolution = analyze(LAYERED).resolution

    shallow = build_package_graph(resolution, depth=1)
    assert {n.id: n.size for n in shallow.nodes.values()} == {".": 1, "app": 6}
    assert edges(shallow) == {(".", "app", "import", 2)}

    deep = build_package_graph(resolution, depth=2)
    assert set(deep.nodes) == {".", "app", "app/api", "app/services"}
    assert edges(deep) == {
        (".", "app/api", "import", 2),
        ("app/api", "app/services", "import", 3),
        ("app/api", "app", "import", 2),
        ("app/services", "app", "import", 6),
    }


def test_package_of() -> None:
    assert package_of("main.py", 1) == "."
    assert package_of("a/b/c.py", 1) == "a"
    assert package_of("a/b/c.py", 2) == "a/b"
    assert package_of("a/b/c.py", 5) == "a/b"


def test_cycles_are_sorted_largest_first(analyze: Analyze) -> None:
    result = analyze(
        {
            "a.py": "import b\n",
            "b.py": "import c\n",
            "c.py": "import a\n",
            "x.py": "import y\n",
            "y.py": "import x\n",
            "lone.py": "import a\n",
        }
    )

    assert find_cycles(result.module_graph) == [
        ["module:a.py", "module:b.py", "module:c.py"],
        ["module:x.py", "module:y.py"],
    ]
    assert result.cycles == find_cycles(result.module_graph)


def test_empty_project_produces_an_empty_graph(analyze: Analyze) -> None:
    graph = analyze({}).module_graph

    assert (graph.nodes, graph.edges) == ({}, [])
    assert graph.metrics is not None
    assert (graph.metrics.density, graph.metrics.avg_degree) == (0.0, 0.0)
