"""Property-based tests: invariants that must hold for any project layout."""

from __future__ import annotations

import tempfile
from pathlib import Path

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from pyanalyzer.analysis.pipeline import AnalysisOptions, AnalysisResult, analyze_project
from pyanalyzer.graph.builder import build_class_graph, build_package_graph
from pyanalyzer.models.core import ElementType

_NAMES = st.sampled_from(["alpha", "beta", "gamma", "delta", "core", "util", "api"])
_PATHS = st.lists(_NAMES, min_size=1, max_size=3).map("/".join)


@st.composite
def projects(draw: st.DrawFn) -> dict[str, str]:
    """A random tree of modules that import, subclass, and call one another."""
    stems = sorted(draw(st.sets(_PATHS, min_size=1, max_size=8)))
    files: dict[str, str] = {}
    for stem in stems:
        if draw(st.booleans()):
            for depth in range(1, stem.count("/") + 1):
                files.setdefault("/".join(stem.split("/")[:depth]) + "/__init__.py", "")
        lines: list[str] = []
        bases: list[str] = []
        calls: list[str] = []
        for target in draw(st.lists(st.sampled_from(stems), max_size=3, unique=True)):
            dotted = target.replace("/", ".")
            alias = "m_" + dotted.replace(".", "_")
            style = draw(st.sampled_from(["import", "from", "relative", "star"]))
            if style == "import":
                lines.append(f"import {dotted} as {alias}")
                bases.append(f"{alias}.Thing")
                calls.append(f"{alias}.run()")
            elif style == "from":
                lines.append(f"from {dotted} import Thing as T_{alias}, run as r_{alias}")
                bases.append(f"T_{alias}")
                calls.append(f"r_{alias}()")
            elif style == "relative":
                lines.append(f"from .{target.rsplit('/', 1)[-1]} import run as rel_{alias}")
                calls.append(f"rel_{alias}()")
            else:
                lines.append(f"from {dotted} import *")
        lines.append(f"class Thing({', '.join(bases[:2])}):")
        lines.append("    def method(self):\n        return self.method()")
        lines.append("def run():")
        lines.extend(f"    {call}" for call in calls)
        lines.append("    return Thing()")
        files[f"{stem}.py"] = "\n".join(lines) + "\n"
    return files


def _analyze(files: dict[str, str]) -> AnalysisResult:
    with tempfile.TemporaryDirectory() as directory:
        for rel_path, source in files.items():
            target = Path(directory, rel_path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(source)
        return analyze_project(directory, AnalysisOptions(workers=1, use_cache=False))


@settings(max_examples=60, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(projects())
def test_results_are_internally_consistent(files: dict[str, str]) -> None:
    result = _analyze(files)
    resolution = result.resolution
    elements = resolution.elements

    # Every file became exactly one module and every id is its own key.
    modules = [e for e in elements.values() if e.type is ElementType.MODULE]
    assert sorted(m.location.file_path for m in modules) == sorted(files)
    assert all(key == element.id for key, element in elements.items())
    assert result.skipped == []

    # Parent links, child lists, usages, and dependencies only mention known elements.
    for element in elements.values():
        assert element.parent_id is None or element.parent_id in elements
    for parent, children in resolution.children.items():
        assert parent in elements
        assert all(elements[child].parent_id == parent for child in children)
    for target, usages in resolution.usages.items():
        assert target in elements
        for usage in usages:
            assert usage.used_by in elements
            assert usage.used_by != target
            assert target in resolution.dependencies[usage.used_by]
    for class_id, bases in resolution.class_bases.items():
        assert elements[class_id].type is ElementType.CLASS
        assert all(elements[base].type is ElementType.CLASS for base in bases)

    # Graphs at every level are closed over their own nodes and have no self-loops.
    for graph in (
        result.module_graph,
        build_class_graph(resolution),
        build_package_graph(resolution, 1),
        build_package_graph(resolution, 2),
    ):
        for edge in graph.edges:
            assert edge.source in graph.nodes
            assert edge.target in graph.nodes
            assert edge.source != edge.target
            assert edge.weight >= 1
        assert graph.metrics is not None
        assert graph.metrics.edge_count == len(graph.edges)
        assert sum(n.out_degree for n in graph.nodes.values()) == len(graph.edges)

    # Cycles are disjoint groups of at least two real modules.
    members = [member for cycle in result.cycles for member in cycle]
    assert len(members) == len(set(members))
    assert all(len(cycle) >= 2 for cycle in result.cycles)
    assert all(member in result.module_graph.nodes for member in members)

    # Findings point at real files and elements.
    for issue in result.issues:
        assert issue.file_path in files
        assert issue.element_id is None or issue.element_id in elements


@settings(max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(projects())
def test_analysis_is_deterministic(files: dict[str, str]) -> None:
    first, second = _analyze(files), _analyze(files)

    assert first.resolution.elements == second.resolution.elements
    assert first.resolution.usages == second.resolution.usages
    assert first.module_graph == second.module_graph
    assert first.cycles == second.cycles
    assert first.issues == second.issues
