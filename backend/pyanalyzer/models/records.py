"""Per-file extraction records.

A :class:`FileRecord` is everything the analyzer learns from one source file in
isolation. Records are plain picklable data so they can cross process
boundaries and be cached on disk; cross-file meaning is added later by the
resolver.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from pyanalyzer.models.core import CodeElement


class RefKind(StrEnum):
    """Syntactic role of a reference."""

    CALL = "call"
    NAME = "name"
    BASE = "base"
    ANNOTATION = "annotation"
    DECORATOR = "decorator"


class TargetKind(StrEnum):
    """How the root name of a reference is bound within its own file."""

    LOCAL = "local"  # a class or function defined in the same file
    IMPORT = "import"  # a name bound by an import statement
    SELF = "self"  # the instance/class parameter of a method
    UNBOUND = "unbound"  # not bound in the file; may come from a star import


@dataclass(slots=True)
class ImportBinding:
    """One name bound by an ``import`` or ``from ... import`` statement."""

    local_name: str
    module: str
    name: str | None
    level: int
    line: int
    col: int
    scope_id: str
    is_star: bool = False
    used: bool = False
    suppressed: bool = False


@dataclass(slots=True)
class Reference:
    """A use of a name that may refer to a project element."""

    scope_id: str
    line: int
    col: int
    kind: RefKind
    target_kind: TargetKind
    target_id: str = ""
    import_index: int = -1
    name: str = ""
    attrs: tuple[str, ...] = ()
    context: str = ""


@dataclass(slots=True)
class FileRecord:
    """Everything extracted from one file."""

    rel_path: str
    line_count: int = 0
    elements: list[CodeElement] = field(default_factory=list)
    imports: list[ImportBinding] = field(default_factory=list)
    references: list[Reference] = field(default_factory=list)
    exports: list[str] | None = None
    attribute_names: list[str] = field(default_factory=list)
    error: str | None = None
