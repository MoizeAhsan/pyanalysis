"""Read-optimised view of a finished analysis.

Built once when an analysis completes, then shared read-only by every request.
It holds the lookup tables the API needs so that no endpoint has to scan or
serialize the whole project.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Final

from pyanalyzer.analysis.pipeline import AnalysisResult
from pyanalyzer.graph.builder import build_class_graph, build_package_graph
from pyanalyzer.models.core import CodeElement, DependencyGraph, ElementType, GraphEdge, GraphNode

DIRECTORY_PREFIX: Final = "dir:"
ROOT_ID: Final = "dir:"

LEVEL_PACKAGE: Final = "package"
LEVEL_MODULE: Final = "module"
LEVEL_CLASS: Final = "class"

MATCH_NAME: Final = "name"
MATCH_QUALIFIED_NAME: Final = "qualified_name"
MATCH_FILE_PATH: Final = "file_path"
MATCH_DOCSTRING: Final = "docstring"
MATCH_FUZZY: Final = "fuzzy"
#: Shorter queries match almost everything as a subsequence, so they are not fuzzy-matched.
_MIN_FUZZY_QUERY: Final = 3
#: A fuzzy match's characters must lie within this many times the query's length.
_MAX_FUZZY_SPREAD: Final = 3


@dataclass(slots=True, frozen=True)
class TreeNode:
    """One node of the project tree: a directory or a code element."""

    id: str
    name: str
    type: str
    child_count: int
    file_path: str
    line: int = 0
    usage_count: int = 0


@dataclass(slots=True, frozen=True)
class SearchHit:
    """A search result and why it matched."""

    element: CodeElement
    match_type: str
    match_text: str


@dataclass(slots=True)
class GraphView:
    """A bounded slice of a dependency graph."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    total_nodes: int
    total_edges: int
    truncated: bool


class UnknownNodeError(KeyError):
    """A tree or graph node id that does not exist in this analysis."""


class AnalysisIndex:
    """Lookup tables over one :class:`AnalysisResult`."""

    def __init__(self, result: AnalysisResult) -> None:
        self.result = result
        resolution = result.resolution
        self.elements = resolution.elements

        ordered = sorted(
            self.elements.values(),
            key=lambda e: (e.location.file_path, e.location.line_number, e.id),
        )
        self.by_type: dict[ElementType, list[CodeElement]] = {t: [] for t in ElementType}
        self.by_file: dict[str, list[CodeElement]] = defaultdict(list)
        for element in ordered:
            self.by_type[element.type].append(element)
            self.by_file[element.location.file_path].append(element)
        self._ordered = ordered
        self._search_rows = [
            (e.name.lower(), e.qualified_name.lower(), e.location.file_path.lower(), e)
            for e in sorted(ordered, key=lambda e: (e.name.lower(), e.id))
        ]

        # Directory tree: each directory lists its sub-directories, then its modules.
        self._directories: dict[str, set[str]] = defaultdict(set)
        self._modules_in: dict[str, list[str]] = defaultdict(list)
        self._directories.setdefault("", set())  # the root always exists
        for module in self.by_type[ElementType.MODULE]:
            directory = module.location.file_path.rpartition("/")[0]
            self._modules_in[directory].append(module.id)
            while directory:
                parent = directory.rpartition("/")[0]
                self._directories[parent].add(directory)
                directory = parent

        self._graphs: dict[tuple[str, int], DependencyGraph] = {
            (LEVEL_MODULE, 0): result.module_graph
        }
        self._adjacency: dict[tuple[str, int], dict[str, set[str]]] = {}

    # ------------------------------------------------------------------ counts

    def usage_count(self, element_id: str) -> int:
        return len(self.result.resolution.usages.get(element_id, ()))

    def counts(self) -> dict[str, int]:
        return {t.value: len(items) for t, items in self.by_type.items()}

    # -------------------------------------------------------------------- tree

    def tree_children(self, parent_id: str) -> list[TreeNode]:
        """Direct children of a directory or element, for lazy tree expansion."""
        if parent_id.startswith(DIRECTORY_PREFIX):
            directory = parent_id[len(DIRECTORY_PREFIX) :]
            if directory not in self._directories and directory not in self._modules_in:
                raise UnknownNodeError(parent_id)
            nodes = [self._directory_node(d) for d in sorted(self._directories.get(directory, ()))]
            nodes.extend(self._element_node(m) for m in self._modules_in.get(directory, ()))
            return nodes
        if parent_id not in self.elements:
            raise UnknownNodeError(parent_id)
        return [
            self._element_node(child)
            for child in self.result.resolution.children.get(parent_id, ())
        ]

    def _directory_node(self, directory: str) -> TreeNode:
        return TreeNode(
            id=f"{DIRECTORY_PREFIX}{directory}",
            name=directory.rpartition("/")[2],
            type="directory",
            child_count=len(self._directories.get(directory, ()))
            + len(self._modules_in.get(directory, ())),
            file_path=directory,
        )

    def _element_node(self, element_id: str) -> TreeNode:
        element = self.elements[element_id]
        return TreeNode(
            id=element.id,
            name=element.name,
            type=element.type.value,
            child_count=len(self.result.resolution.children.get(element_id, ())),
            file_path=element.location.file_path,
            line=element.location.line_number,
            usage_count=self.usage_count(element_id),
        )

    # ---------------------------------------------------------------- elements

    def list_elements(
        self,
        element_type: ElementType | None,
        file_path: str | None,
        offset: int,
        limit: int,
        name: str | None = None,
    ) -> tuple[int, list[CodeElement]]:
        """A page of elements ordered by file and line, with the total count.

        ``name`` keeps elements whose qualified name contains it, ignoring case.
        """
        if file_path is not None:
            source = self.by_file.get(file_path, [])
            if element_type is not None:
                source = [e for e in source if e.type is element_type]
        elif element_type is not None:
            source = self.by_type[element_type]
        else:
            source = self._ordered
        needle = (name or "").strip().lower()
        if needle:
            source = [e for e in source if needle in e.qualified_name.lower()]
        return len(source), source[offset : offset + limit]

    # ------------------------------------------------------------------ search

    def search(
        self,
        query: str,
        element_type: ElementType | None,
        *,
        include_docstrings: bool,
        offset: int,
        limit: int,
    ) -> tuple[int, list[SearchHit]]:
        """Ranked matches: exact name, name prefix, name, qualified name, path,
        docstring, then fuzzy names (the query's characters in order, so
        ``usrsvc`` finds ``UserService``), tightest first.
        """
        needle = query.strip().lower()
        if not needle:
            return 0, []
        fuzzy = len(needle) >= _MIN_FUZZY_QUERY and " " not in needle
        ranked: list[tuple[int, int, int, SearchHit]] = []
        for position, (name, qualified, path, element) in enumerate(self._search_rows):
            if element_type is not None and element.type is not element_type:
                continue
            if name == needle:
                rank, kind, text = 0, MATCH_NAME, element.name
            elif name.startswith(needle):
                rank, kind, text = 1, MATCH_NAME, element.name
            elif needle in name:
                rank, kind, text = 2, MATCH_NAME, element.name
            elif needle in qualified:
                rank, kind, text = 3, MATCH_QUALIFIED_NAME, element.qualified_name
            elif needle in path:
                rank, kind, text = 4, MATCH_FILE_PATH, element.location.file_path
            elif include_docstrings and element.docstring and needle in element.docstring.lower():
                rank, kind, text = 5, MATCH_DOCSTRING, _snippet(element.docstring, needle)
            elif (
                fuzzy
                and (span := _subsequence_span(needle, name)) is not None
                and span <= _MAX_FUZZY_SPREAD * len(needle)
            ):
                ranked.append((6, span, position, SearchHit(element, MATCH_FUZZY, element.name)))
                continue
            else:
                continue
            ranked.append((rank, 0, position, SearchHit(element, kind, text)))
        ranked.sort(key=lambda row: row[:3])
        return len(ranked), [hit for *_, hit in ranked[offset : offset + limit]]

    # ------------------------------------------------------------------ graphs

    def graph(self, level: str, package_depth: int = 1) -> DependencyGraph:
        """The whole graph at one abstraction level (built on first use)."""
        key = (level, package_depth if level == LEVEL_PACKAGE else 0)
        graph = self._graphs.get(key)
        if graph is None:
            if level == LEVEL_CLASS:
                graph = build_class_graph(self.result.resolution)
            elif level == LEVEL_PACKAGE:
                graph = build_package_graph(self.result.resolution, package_depth)
            else:
                raise ValueError(f"unknown graph level: {level}")
            self._graphs[key] = graph
        return graph

    def graph_view(
        self,
        level: str,
        *,
        package_depth: int = 1,
        focus: str | None = None,
        depth: int = 1,
        max_nodes: int = 300,
        connected_only: bool = True,
    ) -> GraphView:
        """A slice of a graph small enough to draw.

        With ``focus``, the slice is everything within ``depth`` hops of that
        node in either direction. When more than ``max_nodes`` qualify, the
        best-connected ones are kept and ``truncated`` is set.
        """
        graph = self.graph(level, package_depth)
        if focus is not None:
            if focus not in graph.nodes:
                raise UnknownNodeError(focus)
            selected = self._neighbourhood(level, package_depth, graph, focus, depth)
        elif connected_only:
            selected = {n.id for n in graph.nodes.values() if n.in_degree or n.out_degree}
        else:
            selected = set(graph.nodes)

        truncated = len(selected) > max_nodes
        if truncated:
            ranked = sorted(
                selected,
                key=lambda node_id: (
                    node_id != focus,
                    -(graph.nodes[node_id].in_degree + graph.nodes[node_id].out_degree),
                    node_id,
                ),
            )
            selected = set(ranked[:max_nodes])
        edges = [e for e in graph.edges if e.source in selected and e.target in selected]
        nodes = sorted((graph.nodes[i] for i in selected), key=lambda node: node.id)
        return GraphView(nodes, edges, len(graph.nodes), len(graph.edges), truncated)

    def _neighbourhood(
        self, level: str, package_depth: int, graph: DependencyGraph, focus: str, depth: int
    ) -> set[str]:
        key = (level, package_depth if level == LEVEL_PACKAGE else 0)
        adjacency = self._adjacency.get(key)
        if adjacency is None:
            adjacency = defaultdict(set)
            for edge in graph.edges:
                adjacency[edge.source].add(edge.target)
                adjacency[edge.target].add(edge.source)
            self._adjacency[key] = adjacency
        seen = {focus}
        frontier = [focus]
        for _ in range(depth):
            following: list[str] = []
            for node_id in frontier:
                for neighbour in adjacency.get(node_id, ()):
                    if neighbour not in seen:
                        seen.add(neighbour)
                        following.append(neighbour)
            frontier = following
        return seen


def _subsequence_span(needle: str, text: str) -> int | None:
    """Length of the stretch of ``text`` holding ``needle``'s characters in order."""
    start = position = text.find(needle[0])
    if position < 0:
        return None
    for character in needle[1:]:
        position = text.find(character, position + 1)
        if position < 0:
            return None
    return position - start + 1


def _snippet(text: str, needle: str, radius: int = 60) -> str:
    position = text.lower().find(needle)
    start = max(0, position - radius)
    end = min(len(text), position + len(needle) + radius)
    snippet = " ".join(text[start:end].split())
    return ("..." if start else "") + snippet + ("..." if end < len(text) else "")
