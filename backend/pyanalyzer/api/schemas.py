"""Request and response models for the v2 API."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from pyanalyzer.analysis.index import AnalysisIndex, TreeNode
from pyanalyzer.analysis.jobs import JobState, JobStatus
from pyanalyzer.analyzers.quality_analyzer import Issue, IssueKind, Severity
from pyanalyzer.models.core import (
    CodeElement,
    ElementType,
    GraphEdge,
    GraphNode,
    ParameterKind,
    PatternType,
    Usage,
    UsageType,
)

Pattern = Annotated[str, StringConstraints(min_length=1, max_length=200)]


class AnalysisRequest(BaseModel):
    """Start an analysis. Exclude patterns use ``.gitignore`` syntax."""

    project_path: Annotated[str, StringConstraints(max_length=4096)]
    exclude: Annotated[list[Pattern], Field(max_length=100)] = []
    respect_gitignore: bool = True
    use_default_excludes: bool = True


class AnalysisStatus(BaseModel):
    state: JobState
    phase: str | None
    processed: int
    total: int
    project_path: str | None
    error: str | None
    started_at: datetime | None
    elapsed_seconds: float
    has_result: bool

    @classmethod
    def of(cls, status: JobStatus) -> AnalysisStatus:
        return cls(
            state=status.state,
            phase=status.phase,
            processed=status.processed,
            total=status.total,
            project_path=status.project_path,
            error=status.error,
            started_at=status.started_at,
            elapsed_seconds=round(status.elapsed_seconds, 3),
            has_result=status.has_result,
        )


class Health(BaseModel):
    status: str
    version: str


class SkippedFileOut(BaseModel):
    file_path: str
    reason: str


class NameCount(BaseModel):
    name: str
    count: int


class ModuleRank(BaseModel):
    id: str
    name: str
    file_path: str
    imported_by: int
    imports: int


class Summary(BaseModel):
    """Headline facts about the analyzed project."""

    name: str
    path: str
    analyzed_at: datetime
    duration_seconds: float
    total_files: int
    total_lines: int
    cached_files: int
    modules: int
    classes: int
    functions: int
    usages: int
    dependency_edges: int
    import_cycles: int
    patterns: int
    issues: dict[IssueKind, int]
    skipped_files: list[SkippedFileOut]
    skipped_total: int
    external_packages: list[NameCount]
    most_imported_modules: list[ModuleRank]


class TreeNodeOut(BaseModel):
    id: str
    name: str
    type: str
    child_count: int
    file_path: str
    line: int
    usage_count: int

    @classmethod
    def of(cls, node: TreeNode) -> TreeNodeOut:
        return cls(
            id=node.id,
            name=node.name,
            type=node.type,
            child_count=node.child_count,
            file_path=node.file_path,
            line=node.line,
            usage_count=node.usage_count,
        )


class TreeChildren(BaseModel):
    parent: str
    children: list[TreeNodeOut]


class ElementSummary(BaseModel):
    """An element without its relationships; cheap enough to list by the thousand."""

    id: str
    name: str
    qualified_name: str
    type: ElementType
    file_path: str
    line: int
    end_line: int
    parent_id: str | None
    is_method: bool
    is_async: bool
    summary: str | None
    usage_count: int

    @classmethod
    def of(cls, element: CodeElement, index: AnalysisIndex) -> ElementSummary:
        docstring = element.docstring
        return cls(
            id=element.id,
            name=element.name,
            qualified_name=element.qualified_name,
            type=element.type,
            file_path=element.location.file_path,
            line=element.location.line_number,
            end_line=element.location.end_line,
            parent_id=element.parent_id,
            is_method=element.is_method,
            is_async=element.is_async,
            summary=docstring.strip().split("\n", 1)[0][:200] if docstring else None,
            usage_count=index.usage_count(element.id),
        )


class ElementPage(BaseModel):
    items: list[ElementSummary]
    total: int
    offset: int
    limit: int
    next_offset: int | None


class ParameterOut(BaseModel):
    name: str
    kind: ParameterKind
    type_hint: str | None
    default_value: str | None


class ElementRef(BaseModel):
    """A pointer to another element."""

    id: str
    name: str
    qualified_name: str
    type: ElementType
    file_path: str
    line: int

    @classmethod
    def of(cls, element: CodeElement) -> ElementRef:
        return cls(
            id=element.id,
            name=element.name,
            qualified_name=element.qualified_name,
            type=element.type,
            file_path=element.location.file_path,
            line=element.location.line_number,
        )


class ElementDetail(ElementSummary):
    """Everything known about one element except its usages, which are paginated."""

    column: int
    docstring: str | None
    parameters: list[ParameterOut]
    return_type: str | None
    decorators: list[str]
    complexity: int
    line_count: int
    parent: ElementRef | None
    children: list[ElementRef]
    dependencies: list[ElementRef]
    usage_counts: dict[UsageType, int]
    declared_bases: list[str]
    bases: list[ElementRef]
    external_bases: list[str]
    subclasses: list[ElementRef]
    overrides: ElementRef | None
    overridden_by: list[ElementRef]
    issues: list[IssueOut]


class UsageOut(BaseModel):
    file_path: str
    line: int
    column: int
    context: str
    usage_type: UsageType
    used_by: ElementRef | None

    @classmethod
    def of(cls, usage: Usage, index: AnalysisIndex) -> UsageOut:
        user = index.elements.get(usage.used_by)
        return cls(
            file_path=usage.location.file_path,
            line=usage.location.line_number,
            column=usage.location.column_number,
            context=usage.context,
            usage_type=usage.usage_type,
            used_by=None if user is None else ElementRef.of(user),
        )


class UsageFileCount(BaseModel):
    file_path: str
    count: int


class UsagePage(BaseModel):
    items: list[UsageOut]
    total: int
    offset: int
    limit: int
    next_offset: int | None
    by_file: list[UsageFileCount]


class SearchResult(BaseModel):
    element: ElementSummary
    match_type: str
    match_text: str


class SearchPage(BaseModel):
    query: str
    items: list[SearchResult]
    total: int
    offset: int
    limit: int
    next_offset: int | None


class GraphNodeOut(BaseModel):
    id: str
    name: str
    type: str
    file_path: str
    in_degree: int
    out_degree: int
    size: int

    @classmethod
    def of(cls, node: GraphNode) -> GraphNodeOut:
        return cls(
            id=node.id,
            name=node.name,
            type=node.type,
            file_path=node.file_path,
            in_degree=node.in_degree,
            out_degree=node.out_degree,
            size=node.size,
        )


class GraphEdgeOut(BaseModel):
    source: str
    target: str
    relationship_type: str
    weight: int

    @classmethod
    def of(cls, edge: GraphEdge) -> GraphEdgeOut:
        return cls(
            source=edge.source,
            target=edge.target,
            relationship_type=edge.relationship_type,
            weight=edge.weight,
        )


class GraphOut(BaseModel):
    """A drawable slice of a dependency graph.

    ``truncated`` is true when ``nodes`` is a subset chosen by connectivity;
    ``total_nodes`` and ``total_edges`` describe the full graph at this level.
    """

    level: str
    focus: str | None
    nodes: list[GraphNodeOut]
    edges: list[GraphEdgeOut]
    total_nodes: int
    total_edges: int
    truncated: bool


class IssueOut(BaseModel):
    kind: IssueKind
    severity: Severity
    message: str
    file_path: str
    line: int
    element_id: str | None

    @classmethod
    def of(cls, issue: Issue) -> IssueOut:
        return cls(
            kind=issue.kind,
            severity=issue.severity,
            message=issue.message,
            file_path=issue.file_path,
            line=issue.line,
            element_id=issue.element_id,
        )


class IssuePage(BaseModel):
    items: list[IssueOut]
    total: int
    offset: int
    limit: int
    next_offset: int | None
    counts: dict[IssueKind, int]


class CycleOut(BaseModel):
    modules: list[ElementRef]


class CycleList(BaseModel):
    items: list[CycleOut]
    total: int


class PatternOut(BaseModel):
    name: str
    type: PatternType
    confidence: float
    description: str
    elements: list[ElementRef]


class PatternList(BaseModel):
    items: list[PatternOut]


class SourceOut(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    total_lines: int
    lines: list[str]


ElementDetail.model_rebuild()
