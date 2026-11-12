"""Dependency graphs at package, module, and class level."""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping

import networkx as nx

from pyanalyzer.analysis.resolver import Resolution
from pyanalyzer.models.core import (
    CodeElement,
    DependencyGraph,
    ElementType,
    GraphEdge,
    GraphMetrics,
    GraphNode,
    UsageType,
)
from pyanalyzer.parsers.extractor import module_id

type _EdgeCounts = Counter[tuple[str, str, str]]

ROOT_PACKAGE = "."


def build_module_graph(resolution: Resolution) -> DependencyGraph:
    """One node per module; an edge A -> B when code in A uses something defined in B."""
    elements = resolution.elements
    counts: _EdgeCounts = Counter()
    for target, usages in resolution.usages.items():
        target_module = module_id(elements[target].location.file_path)
        for usage in usages:
            source_module = module_id(usage.location.file_path)
            if source_module != target_module:
                counts[source_module, target_module, "import"] += 1

    nodes = {
        element.id: GraphNode(
            id=element.id,
            name=element.qualified_name,
            type=ElementType.MODULE.value,
            file_path=element.location.file_path,
            size=element.location.end_line,
        )
        for element in elements.values()
        if element.type is ElementType.MODULE
    }
    return _finish(nodes, counts)


def build_class_graph(resolution: Resolution) -> DependencyGraph:
    """One node per class; edges for inheritance and for use of another class."""
    elements = resolution.elements
    owner: dict[str, str | None] = {}

    def owning_class(element_id: str) -> str | None:
        """Nearest class that is, or encloses, the element."""
        if element_id in owner:
            return owner[element_id]
        chain: list[str] = []
        current: str | None = element_id
        found: str | None = None
        while current is not None:
            if current in owner:
                found = owner[current]
                break
            chain.append(current)
            element = elements[current]
            if element.type is ElementType.CLASS:
                found = current
                break
            current = element.parent_id
        for visited in chain:
            owner[visited] = found
        return found

    counts: _EdgeCounts = Counter()
    for target, usages in resolution.usages.items():
        target_class = owning_class(target)
        if target_class is None:
            continue
        for usage in usages:
            source_class = owning_class(usage.used_by)
            if source_class is None or source_class == target_class:
                continue
            relationship = (
                "inherits"
                if usage.usage_type is UsageType.INHERITANCE and target == target_class
                else "uses"
            )
            counts[source_class, target_class, relationship] += 1

    nodes = {
        element.id: GraphNode(
            id=element.id,
            name=element.qualified_name,
            type=ElementType.CLASS.value,
            file_path=element.location.file_path,
            size=element.line_count,
        )
        for element in elements.values()
        if element.type is ElementType.CLASS
    }
    return _finish(nodes, counts)


def package_of(file_path: str, depth: int) -> str:
    """Package id for a file: its first ``depth`` directory components."""
    directories = file_path.split("/")[:-1][:depth]
    return "/".join(directories) if directories else ROOT_PACKAGE


def build_package_graph(resolution: Resolution, depth: int = 1) -> DependencyGraph:
    """Module graph collapsed to directories ``depth`` levels below the project root."""
    module_graph = build_module_graph(resolution)
    nodes: dict[str, GraphNode] = {}
    for node in module_graph.nodes.values():
        package = package_of(node.file_path, depth)
        group = nodes.setdefault(
            package, GraphNode(id=package, name=package, type="package", file_path=package)
        )
        group.size += 1

    counts: _EdgeCounts = Counter()
    for edge in module_graph.edges:
        source = package_of(module_graph.nodes[edge.source].file_path, depth)
        target = package_of(module_graph.nodes[edge.target].file_path, depth)
        if source != target:
            counts[source, target, "import"] += edge.weight
    return _finish(nodes, counts)


def find_cycles(graph: DependencyGraph) -> list[list[str]]:
    """Groups of mutually dependent nodes (strongly connected components).

    Uses an iterative linear-time algorithm, so graph depth is not a limit.
    Each group is sorted; groups are ordered largest first.
    """
    digraph: nx.DiGraph[str] = nx.DiGraph()
    digraph.add_nodes_from(graph.nodes)
    digraph.add_edges_from((edge.source, edge.target) for edge in graph.edges)
    groups = [
        sorted(component)
        for component in nx.strongly_connected_components(digraph)
        if len(component) > 1
    ]
    groups.sort(key=lambda group: (-len(group), group))
    return groups


def element_counts(elements: Mapping[str, CodeElement]) -> dict[ElementType, int]:
    """Number of elements of each type."""
    counts = Counter(element.type for element in elements.values())
    return {element_type: counts.get(element_type, 0) for element_type in ElementType}


def _finish(nodes: dict[str, GraphNode], counts: _EdgeCounts) -> DependencyGraph:
    edges: list[GraphEdge] = []
    for (source, target, relationship), weight in sorted(counts.items()):
        if source not in nodes or target not in nodes:
            continue
        edges.append(GraphEdge(source, target, relationship, weight))
        nodes[source].out_degree += 1
        nodes[target].in_degree += 1

    node_count = len(nodes)
    edge_count = len(edges)
    return DependencyGraph(
        nodes=nodes,
        edges=edges,
        metrics=GraphMetrics(
            node_count=node_count,
            edge_count=edge_count,
            density=edge_count / (node_count * (node_count - 1)) if node_count > 1 else 0.0,
            avg_degree=2 * edge_count / node_count if node_count else 0.0,
        ),
    )
