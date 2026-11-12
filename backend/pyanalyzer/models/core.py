"""
Core data models for the Python Code Analyzer
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class ElementType(Enum):
    """Types of code elements that can be analyzed."""

    MODULE = "module"
    CLASS = "class"
    FUNCTION = "function"
    VARIABLE = "variable"
    IMPORT = "import"


class UsageType(Enum):
    """Types of code element usage patterns."""

    CALL = "call"
    IMPORT = "import"
    INHERITANCE = "inheritance"
    ASSIGNMENT = "assignment"


class PatternType(Enum):
    """Types of architectural patterns that can be detected."""

    MVC = "mvc"
    FACTORY = "factory"
    OBSERVER = "observer"
    SINGLETON = "singleton"


@dataclass
class SourceLocation:
    """Location information for code elements in source files."""

    file_path: str
    line_number: int
    column_number: int = 0
    end_line: int = 0
    end_column: int = 0


@dataclass
class Parameter:
    """Function or method parameter information."""

    name: str
    type_hint: str | None = None
    default_value: str | None = None


@dataclass
class Usage:
    """Usage information for code elements."""

    location: SourceLocation
    context: str
    usage_type: UsageType


@dataclass
class CodeElement:  # pylint: disable=too-many-instance-attributes
    """Represents a code element (class, function, module, etc.) with metadata."""

    id: str
    name: str
    type: ElementType
    location: SourceLocation
    docstring: str | None = None
    parameters: list[Parameter] = field(default_factory=list)
    return_type: str | None = None
    decorators: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    usages: list[Usage] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProjectInfo:
    """Information about the analyzed project."""

    name: str
    path: str
    total_files: int = 0
    total_lines: int = 0
    languages: list[str] = field(default_factory=lambda: ["python"])
    analysis_timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ArchitecturalPattern:
    """Detected architectural pattern in the codebase."""

    name: str
    type: PatternType
    confidence: float
    elements: list[str]
    description: str


@dataclass
class GraphNode:
    """Node in the dependency graph."""

    id: str
    name: str
    type: ElementType
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    """Edge in the dependency graph."""

    source: str
    target: str
    relationship_type: str
    weight: float = 1.0


@dataclass
class GraphMetrics:
    """Metrics for the dependency graph."""

    node_count: int
    edge_count: int
    density: float
    avg_degree: float


@dataclass
class DependencyGraph:
    """Graph representation of code dependencies."""

    nodes: dict[str, GraphNode] = field(default_factory=dict)
    edges: list[GraphEdge] = field(default_factory=list)
    metrics: GraphMetrics | None = None


class AnalysisSession:
    """Session-based storage for current analysis"""

    def __init__(self) -> None:
        self.project_info: ProjectInfo | None = None
        self.modules: dict[str, CodeElement] = {}
        self.classes: dict[str, CodeElement] = {}
        self.functions: dict[str, CodeElement] = {}
        self.dependency_graph: DependencyGraph | None = None
        self.architectural_patterns: list[ArchitecturalPattern] = []
        self.all_elements: dict[str, CodeElement] = {}

    def reset(self) -> None:
        """Clear all analysis data and return to clean state"""
        self.project_info = None
        self.modules.clear()
        self.classes.clear()
        self.functions.clear()
        self.dependency_graph = None
        self.architectural_patterns.clear()
        self.all_elements.clear()

    def add_element(self, element: CodeElement) -> None:
        """Add a code element to the appropriate collection"""
        self.all_elements[element.id] = element

        if element.type == ElementType.MODULE:
            self.modules[element.id] = element
        elif element.type == ElementType.CLASS:
            self.classes[element.id] = element
        elif element.type == ElementType.FUNCTION:
            self.functions[element.id] = element


# Global session instance
current_session = AnalysisSession()
