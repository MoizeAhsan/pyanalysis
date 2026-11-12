"""Core data model shared by every analysis stage.

All file paths stored in these objects are POSIX-style and relative to the
analyzed project's root, so results are stable across machines and never leak
absolute paths.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class ElementType(StrEnum):
    """Kinds of code elements the analyzer tracks."""

    MODULE = "module"
    CLASS = "class"
    FUNCTION = "function"


class UsageType(StrEnum):
    """How a code element is used at a given location."""

    CALL = "call"
    IMPORT = "import"
    INHERITANCE = "inheritance"
    REFERENCE = "reference"
    TYPE_HINT = "type_hint"
    DECORATOR = "decorator"


class PatternType(StrEnum):
    """Architectural patterns the detector can report."""

    MVC = "mvc"
    FACTORY = "factory"
    OBSERVER = "observer"
    SINGLETON = "singleton"


class ParameterKind(StrEnum):
    """Parameter kinds, mirroring :class:`inspect.Parameter`."""

    POSITIONAL_ONLY = "positional_only"
    POSITIONAL = "positional"
    VAR_POSITIONAL = "var_positional"
    KEYWORD_ONLY = "keyword_only"
    VAR_KEYWORD = "var_keyword"


@dataclass(slots=True, frozen=True)
class SourceLocation:
    """A span in a source file. Lines are 1-based, columns 0-based."""

    file_path: str
    line_number: int
    column_number: int = 0
    end_line: int = 0
    end_column: int = 0


@dataclass(slots=True)
class Parameter:
    """A function or method parameter."""

    name: str
    kind: ParameterKind = ParameterKind.POSITIONAL
    type_hint: str | None = None
    default_value: str | None = None


@dataclass(slots=True)
class CodeElement:
    """A module, class, or function (including methods and nested definitions)."""

    id: str
    name: str
    qualified_name: str
    type: ElementType
    location: SourceLocation
    parent_id: str | None = None
    docstring: str | None = None
    parameters: list[Parameter] = field(default_factory=list)
    return_type: str | None = None
    decorators: list[str] = field(default_factory=list)
    bases: list[str] = field(default_factory=list)
    is_method: bool = False
    is_async: bool = False
    complexity: int = 0

    @property
    def line_count(self) -> int:
        """Number of source lines the element spans."""
        if self.location.end_line < self.location.line_number:
            return 1
        return self.location.end_line - self.location.line_number + 1


@dataclass(slots=True, frozen=True)
class Usage:
    """One place where an element is used, and by which element."""

    location: SourceLocation
    context: str
    usage_type: UsageType
    used_by: str


@dataclass(slots=True)
class ProjectInfo:
    """Summary of the analyzed project."""

    name: str
    path: str
    total_files: int = 0
    total_lines: int = 0
    languages: list[str] = field(default_factory=lambda: ["python"])
    analysis_timestamp: datetime = field(default_factory=datetime.now)


@dataclass(slots=True)
class ArchitecturalPattern:
    """A detected architectural pattern and the elements that form it."""

    name: str
    type: PatternType
    confidence: float
    elements: list[str]
    description: str


@dataclass(slots=True)
class GraphNode:
    """A node in a dependency graph."""

    id: str
    name: str
    type: str
    file_path: str = ""
    in_degree: int = 0
    out_degree: int = 0
    size: int = 0


@dataclass(slots=True)
class GraphEdge:
    """A weighted, typed edge in a dependency graph."""

    source: str
    target: str
    relationship_type: str
    weight: int = 1


@dataclass(slots=True)
class GraphMetrics:
    """Whole-graph metrics."""

    node_count: int
    edge_count: int
    density: float
    avg_degree: float


@dataclass(slots=True)
class DependencyGraph:
    """Nodes, edges, and metrics for one abstraction level."""

    nodes: dict[str, GraphNode] = field(default_factory=dict)
    edges: list[GraphEdge] = field(default_factory=list)
    metrics: GraphMetrics | None = None


@dataclass(slots=True, frozen=True)
class SkippedFile:
    """A file that was found but not analyzed, with the reason."""

    file_path: str
    reason: str
