"""
Core data models for the Python Code Analyzer
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


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
    type_hint: Optional[str] = None
    default_value: Optional[str] = None


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
    docstring: Optional[str] = None
    parameters: List[Parameter] = field(default_factory=list)
    return_type: Optional[str] = None
    decorators: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    usages: List[Usage] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProjectInfo:
    """Information about the analyzed project."""

    name: str
    path: str
    total_files: int = 0
    total_lines: int = 0
    languages: List[str] = field(default_factory=lambda: ["python"])
    analysis_timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ArchitecturalPattern:
    """Detected architectural pattern in the codebase."""

    name: str
    type: PatternType
    confidence: float
    elements: List[str]
    description: str


@dataclass
class GraphNode:
    """Node in the dependency graph."""

    id: str
    name: str
    type: ElementType
    metadata: Dict[str, Any] = field(default_factory=dict)


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

    nodes: Dict[str, GraphNode] = field(default_factory=dict)
    edges: List[GraphEdge] = field(default_factory=list)
    metrics: Optional[GraphMetrics] = None


class AnalysisSession:
    """Session-based storage for current analysis"""

    def __init__(self) -> None:
        self.project_info: Optional[ProjectInfo] = None
        self.modules: Dict[str, CodeElement] = {}
        self.classes: Dict[str, CodeElement] = {}
        self.functions: Dict[str, CodeElement] = {}
        self.dependency_graph: Optional[DependencyGraph] = None
        self.architectural_patterns: List[ArchitecturalPattern] = []
        self.all_elements: Dict[str, CodeElement] = {}

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
