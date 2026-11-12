"""Read-only endpoints over a finished analysis.

Every list is paginated and every graph is bounded, so response size does not
grow with project size.
"""

from __future__ import annotations

import tokenize
from collections import Counter
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Query

from pyanalyzer.analysis.index import (
    LEVEL_CLASS,
    LEVEL_MODULE,
    LEVEL_PACKAGE,
    ROOT_ID,
    AnalysisIndex,
    UnknownNodeError,
)
from pyanalyzer.analyzers.quality_analyzer import IssueKind, Severity
from pyanalyzer.api.dependencies import IndexDep
from pyanalyzer.api.errors import ApiError, ErrorResponse
from pyanalyzer.api.schemas import (
    CycleList,
    CycleOut,
    ElementDetail,
    ElementPage,
    ElementRef,
    ElementSummary,
    GraphEdgeOut,
    GraphNodeOut,
    GraphOut,
    IssueOut,
    IssuePage,
    ModuleRank,
    NameCount,
    ParameterOut,
    PatternList,
    PatternOut,
    SearchPage,
    SearchResult,
    SkippedFileOut,
    SourceOut,
    Summary,
    TreeChildren,
    TreeNodeOut,
    UsageFileCount,
    UsageOut,
    UsagePage,
)
from pyanalyzer.models.core import CodeElement, ElementType, UsageType

router = APIRouter(responses={404: {"model": ErrorResponse}})

Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=500)]
ElementId = Annotated[str, Query(min_length=1, max_length=2000, description="Element id")]

_MAX_SOURCE_LINES = 400
_SUMMARY_LIST_SIZE = 10
_SKIPPED_LIST_SIZE = 200


def _next(offset: int, shown: int, total: int) -> int | None:
    return offset + shown if offset + shown < total else None


def _element(index: AnalysisIndex, element_id: str) -> CodeElement:
    element = index.elements.get(element_id)
    if element is None:
        raise ApiError(404, "unknown_element", f"No element with id {element_id!r}")
    return element


def _refs(index: AnalysisIndex, ids: list[str]) -> list[ElementRef]:
    return [ElementRef.of(index.elements[i]) for i in ids if i in index.elements]


@router.get("/summary", tags=["explore"])
def summary(index: IndexDep) -> Summary:
    """Headline numbers for the analyzed project."""
    result = index.result
    resolution = result.resolution
    counts = index.counts()
    ranked = sorted(
        (n for n in result.module_graph.nodes.values() if n.in_degree),
        key=lambda node: (-node.in_degree, node.id),
    )[:_SUMMARY_LIST_SIZE]
    metrics = result.module_graph.metrics
    return Summary(
        name=result.project.name,
        path=result.project.path,
        analyzed_at=result.project.analysis_timestamp,
        duration_seconds=round(result.duration_seconds, 3),
        total_files=result.project.total_files,
        total_lines=result.project.total_lines,
        cached_files=result.cached_files,
        modules=counts[ElementType.MODULE.value],
        classes=counts[ElementType.CLASS.value],
        functions=counts[ElementType.FUNCTION.value],
        usages=sum(len(usages) for usages in resolution.usages.values()),
        dependency_edges=metrics.edge_count if metrics else 0,
        import_cycles=len(result.cycles),
        patterns=len(result.patterns),
        issues=dict(Counter(issue.kind for issue in result.issues)),
        skipped_files=[
            SkippedFileOut(file_path=s.file_path, reason=s.reason)
            for s in result.skipped[:_SKIPPED_LIST_SIZE]
        ],
        skipped_total=len(result.skipped),
        external_packages=[
            NameCount(name=name, count=count)
            for name, count in list(resolution.external_packages.items())[:_SUMMARY_LIST_SIZE]
        ],
        most_imported_modules=[
            ModuleRank(
                id=node.id,
                name=node.name,
                file_path=node.file_path,
                imported_by=node.in_degree,
                imports=node.out_degree,
            )
            for node in ranked
        ],
    )


@router.get("/tree", tags=["explore"])
def tree(
    index: IndexDep,
    parent: Annotated[str, Query(max_length=2000)] = ROOT_ID,
) -> TreeChildren:
    """Children of a directory (``dir:<path>``) or element, for lazy expansion."""
    try:
        children = index.tree_children(parent)
    except UnknownNodeError as exc:
        raise ApiError(404, "unknown_node", f"No tree node with id {parent!r}") from exc
    return TreeChildren(parent=parent, children=[TreeNodeOut.of(node) for node in children])


@router.get("/elements", tags=["explore"])
def elements(
    index: IndexDep,
    type: ElementType | None = None,
    file: Annotated[str | None, Query(max_length=2000)] = None,
    offset: Offset = 0,
    limit: Limit = 100,
) -> ElementPage:
    """Elements ordered by file and line, optionally filtered by type or file."""
    total, page = index.list_elements(type, file, offset, limit)
    return ElementPage(
        items=[ElementSummary.of(element, index) for element in page],
        total=total,
        offset=offset,
        limit=limit,
        next_offset=_next(offset, len(page), total),
    )


@router.get("/element", tags=["explore"])
def element_detail(index: IndexDep, id: ElementId) -> ElementDetail:
    """Full detail for one element, including its place in the class hierarchy."""
    element = _element(index, id)
    result = index.result
    resolution = result.resolution
    hierarchy = result.hierarchy
    parent = index.elements.get(element.parent_id) if element.parent_id else None
    overrides = index.elements.get(hierarchy.overrides.get(id, ""))
    return ElementDetail(
        **ElementSummary.of(element, index).model_dump(),
        column=element.location.column_number,
        docstring=element.docstring,
        parameters=[
            ParameterOut(
                name=p.name, kind=p.kind, type_hint=p.type_hint, default_value=p.default_value
            )
            for p in element.parameters
        ],
        return_type=element.return_type,
        decorators=element.decorators,
        complexity=element.complexity,
        line_count=element.line_count,
        parent=None if parent is None else ElementRef.of(parent),
        children=_refs(index, resolution.children.get(id, [])),
        dependencies=_refs(index, resolution.dependencies.get(id, [])),
        usage_counts=dict(Counter(u.usage_type for u in resolution.usages.get(id, ()))),
        declared_bases=element.bases,
        bases=_refs(index, hierarchy.bases.get(id, [])),
        external_bases=hierarchy.external_bases.get(id, []),
        subclasses=_refs(index, hierarchy.subclasses.get(id, [])),
        overrides=None if overrides is None else ElementRef.of(overrides),
        overridden_by=_refs(index, hierarchy.overridden_by.get(id, [])),
        issues=[IssueOut.of(issue) for issue in result.issues if issue.element_id == id],
    )


@router.get("/usages", tags=["explore"])
def usages(
    index: IndexDep,
    id: ElementId,
    type: UsageType | None = None,
    file: Annotated[str | None, Query(max_length=2000)] = None,
    offset: Offset = 0,
    limit: Limit = 100,
) -> UsagePage:
    """Where an element is used, ordered by file and line, with per-file counts."""
    _element(index, id)
    found = [
        usage
        for usage in index.result.resolution.usages.get(id, ())
        if type is None or usage.usage_type is type
    ]
    by_file = Counter(usage.location.file_path for usage in found)
    if file is not None:
        found = [usage for usage in found if usage.location.file_path == file]
    found.sort(
        key=lambda u: (u.location.file_path, u.location.line_number, u.location.column_number)
    )
    page = found[offset : offset + limit]
    return UsagePage(
        items=[UsageOut.of(usage, index) for usage in page],
        total=len(found),
        offset=offset,
        limit=limit,
        next_offset=_next(offset, len(page), len(found)),
        by_file=[
            UsageFileCount(file_path=path, count=count)
            for path, count in sorted(by_file.items(), key=lambda item: (-item[1], item[0]))
        ],
    )


@router.get("/search", tags=["explore"])
def search(
    index: IndexDep,
    q: Annotated[str, Query(max_length=200)] = "",
    type: ElementType | None = None,
    docstrings: bool = False,
    offset: Offset = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> SearchPage:
    """Search by name, qualified name, and path; optionally docstrings too."""
    total, hits = index.search(q, type, include_docstrings=docstrings, offset=offset, limit=limit)
    return SearchPage(
        query=q.strip(),
        items=[
            SearchResult(
                element=ElementSummary.of(hit.element, index),
                match_type=hit.match_type,
                match_text=hit.match_text,
            )
            for hit in hits
        ],
        total=total,
        offset=offset,
        limit=limit,
        next_offset=_next(offset, len(hits), total),
    )


@router.get("/graph", tags=["explore"])
def graph(
    index: IndexDep,
    level: Literal["package", "module", "class"] = LEVEL_MODULE,
    package_depth: Annotated[int, Query(ge=1, le=10)] = 1,
    focus: Annotated[str | None, Query(max_length=2000)] = None,
    depth: Annotated[int, Query(ge=1, le=5)] = 1,
    max_nodes: Annotated[int, Query(ge=1, le=2000)] = 300,
    connected_only: bool = True,
) -> GraphOut:
    """A bounded dependency graph at package, module, or class level."""
    assert level in (LEVEL_PACKAGE, LEVEL_MODULE, LEVEL_CLASS)
    try:
        view = index.graph_view(
            level,
            package_depth=package_depth,
            focus=focus,
            depth=depth,
            max_nodes=max_nodes,
            connected_only=connected_only,
        )
    except UnknownNodeError as exc:
        raise ApiError(404, "unknown_node", f"No {level} graph node with id {focus!r}") from exc
    return GraphOut(
        level=level,
        focus=focus,
        nodes=[GraphNodeOut.of(node) for node in view.nodes],
        edges=[GraphEdgeOut.of(edge) for edge in view.edges],
        total_nodes=view.total_nodes,
        total_edges=view.total_edges,
        truncated=view.truncated,
    )


@router.get("/issues", tags=["explore"])
def issues(
    index: IndexDep,
    kind: IssueKind | None = None,
    severity: Severity | None = None,
    file: Annotated[str | None, Query(max_length=2000)] = None,
    offset: Offset = 0,
    limit: Limit = 100,
) -> IssuePage:
    """Findings: import cycles, unused imports, dead-code candidates, and smells."""
    everything = index.result.issues
    found = [
        issue
        for issue in everything
        if (kind is None or issue.kind is kind)
        and (severity is None or issue.severity is severity)
        and (file is None or issue.file_path == file)
    ]
    page = found[offset : offset + limit]
    return IssuePage(
        items=[IssueOut.of(issue) for issue in page],
        total=len(found),
        offset=offset,
        limit=limit,
        next_offset=_next(offset, len(page), len(found)),
        counts=dict(Counter(issue.kind for issue in everything)),
    )


@router.get("/cycles", tags=["explore"])
def cycles(index: IndexDep, limit: Limit = 50) -> CycleList:
    """Groups of modules that import each other, largest first."""
    found = index.result.cycles
    return CycleList(
        items=[CycleOut(modules=_refs(index, cycle)) for cycle in found[:limit]],
        total=len(found),
    )


@router.get("/patterns", tags=["explore"])
def patterns(index: IndexDep) -> PatternList:
    """Detected architectural patterns."""
    return PatternList(
        items=[
            PatternOut(
                name=pattern.name,
                type=pattern.type,
                confidence=round(pattern.confidence, 2),
                description=pattern.description,
                elements=_refs(index, pattern.elements[:200]),
            )
            for pattern in index.result.patterns
        ]
    )


@router.get("/source", tags=["explore"])
def source(
    index: IndexDep,
    file: Annotated[str, Query(min_length=1, max_length=2000)],
    start: Annotated[int, Query(ge=1)] = 1,
    end: Annotated[int | None, Query(ge=1)] = None,
) -> SourceOut:
    """Lines of an analyzed file. Only files that are part of the analysis can be read."""
    if file not in index.by_file:
        raise ApiError(404, "unknown_file", f"{file!r} is not part of the analyzed project")
    path = Path(index.result.project.path, file)
    try:
        with tokenize.open(path) as handle:
            lines = handle.read().splitlines()
    except (OSError, SyntaxError, UnicodeDecodeError) as exc:
        raise ApiError(404, "unreadable_file", f"{file!r} can no longer be read") from exc
    last = min(len(lines), end if end is not None else start + _MAX_SOURCE_LINES - 1)
    last = min(last, start + _MAX_SOURCE_LINES - 1)
    return SourceOut(
        file_path=file,
        start_line=start,
        end_line=max(last, start - 1),
        total_lines=len(lines),
        lines=lines[start - 1 : last],
    )
