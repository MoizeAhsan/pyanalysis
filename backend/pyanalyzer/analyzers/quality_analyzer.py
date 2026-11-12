"""Code-quality findings: unused imports, dead-code candidates, and smells.

Findings are deliberately conservative. Static analysis cannot see dynamic
dispatch, framework registration, or use from outside the project, so anything
that might plausibly be reached that way is not reported, and dead code is
reported as a *candidate* at ``info`` severity.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from pyanalyzer.analysis.resolver import Resolution
from pyanalyzer.analyzers.inheritance_analyzer import ClassHierarchy
from pyanalyzer.models.core import CodeElement, ElementType, ParameterKind
from pyanalyzer.models.records import FileRecord
from pyanalyzer.parsers.extractor import module_id

_TEST_FILE: Final = re.compile(r"(^|/)(tests?/|test_[^/]*\.py$|[^/]*_test\.py$|conftest\.py$)")


class IssueKind(StrEnum):
    """Kinds of finding the analyzer reports."""

    IMPORT_CYCLE = "import_cycle"
    UNUSED_IMPORT = "unused_import"
    DEAD_CODE = "dead_code"
    HIGH_COMPLEXITY = "high_complexity"
    LONG_FUNCTION = "long_function"
    TOO_MANY_PARAMETERS = "too_many_parameters"
    LARGE_CLASS = "large_class"


class Severity(StrEnum):
    """How much attention a finding deserves."""

    INFO = "info"
    WARNING = "warning"


@dataclass(slots=True, frozen=True)
class Issue:
    """One finding, anchored to a file and line."""

    kind: IssueKind
    severity: Severity
    message: str
    file_path: str
    line: int
    element_id: str | None = None


@dataclass(slots=True, frozen=True)
class QualityThresholds:
    """Limits above which a smell is reported."""

    max_function_lines: int = 60
    max_parameters: int = 6
    max_complexity: int = 10
    max_class_methods: int = 20


def find_issues(
    records: Sequence[FileRecord],
    resolution: Resolution,
    hierarchy: ClassHierarchy,
    cycles: Sequence[Sequence[str]],
    thresholds: QualityThresholds | None = None,
) -> list[Issue]:
    """All findings for a project, sorted by file, line, and kind."""
    thresholds = thresholds or QualityThresholds()
    issues: list[Issue] = []
    issues.extend(_import_cycles(cycles, resolution))
    issues.extend(_unused_imports(records, resolution))
    issues.extend(_dead_code(records, resolution, hierarchy))
    issues.extend(_smells(resolution, thresholds))
    issues.sort(key=lambda issue: (issue.file_path, issue.line, issue.kind.value, issue.message))
    return issues


def is_test_file(file_path: str) -> bool:
    """Whether a path looks like test code by common naming conventions."""
    return _TEST_FILE.search(file_path) is not None


def _import_cycles(cycles: Sequence[Sequence[str]], resolution: Resolution) -> list[Issue]:
    issues: list[Issue] = []
    for cycle in cycles:
        names = [resolution.elements[member].qualified_name for member in cycle]
        shown = ", ".join(names[:5]) + (f", and {len(names) - 5} more" if len(names) > 5 else "")
        first = resolution.elements[cycle[0]]
        issues.append(
            Issue(
                kind=IssueKind.IMPORT_CYCLE,
                severity=Severity.WARNING,
                message=f"{len(names)} modules depend on each other in a cycle: {shown}",
                file_path=first.location.file_path,
                line=1,
                element_id=first.id,
            )
        )
    return issues


def _unused_imports(records: Sequence[FileRecord], resolution: Resolution) -> list[Issue]:
    issues: list[Issue] = []
    for record in records:
        if record.error is not None or record.rel_path.endswith("__init__.py"):
            # Package __init__ files import names in order to re-export them.
            continue
        for binding in record.imports:
            if (
                binding.used
                or binding.suppressed
                or (record.rel_path, binding.local_name) in resolution.reexported
            ):
                continue
            issues.append(
                Issue(
                    kind=IssueKind.UNUSED_IMPORT,
                    severity=Severity.WARNING,
                    message=f"'{binding.local_name}' is imported but never used",
                    file_path=record.rel_path,
                    line=binding.line,
                    element_id=module_id(record.rel_path),
                )
            )
    return issues


def _dead_code(
    records: Sequence[FileRecord], resolution: Resolution, hierarchy: ClassHierarchy
) -> list[Issue]:
    elements = resolution.elements
    attribute_names: set[str] = set()
    exported: set[tuple[str, str]] = set()
    for record in records:
        attribute_names.update(record.attribute_names)
        exported.update((record.rel_path, name) for name in record.exports or ())

    issues: list[Issue] = []
    for element in elements.values():
        if element.type is ElementType.MODULE or not _could_be_dead(
            element, elements, hierarchy, attribute_names, exported
        ):
            continue
        if _has_outside_usage(element.id, resolution):
            continue
        kind = "method" if element.is_method else element.type.value
        issues.append(
            Issue(
                kind=IssueKind.DEAD_CODE,
                severity=Severity.INFO,
                message=f"No references to {kind} '{element.qualified_name}' were found",
                file_path=element.location.file_path,
                line=element.location.line_number,
                element_id=element.id,
            )
        )
    return issues


def _could_be_dead(
    element: CodeElement,
    elements: dict[str, CodeElement],
    hierarchy: ClassHierarchy,
    attribute_names: set[str],
    exported: set[tuple[str, str]],
) -> bool:
    """Rule out elements that may be reached in ways static analysis cannot see."""
    name = element.name
    file_path = element.location.file_path
    if (
        (name.startswith("__") and name.endswith("__"))
        or element.decorators
        or name in attribute_names
        or (file_path, name) in exported
        or is_test_file(file_path)
        or element.parent_id is None
    ):
        return False
    parent = elements[element.parent_id]
    if parent.type is ElementType.FUNCTION:
        return False  # closures are usually returned or passed, not named
    if parent.type is ElementType.CLASS:
        if element.type is ElementType.FUNCTION and (
            parent.id in hierarchy.external_bases
            or element.id in hierarchy.overrides
            or element.id in hierarchy.overridden_by
        ):
            return False  # may implement or provide a hook called polymorphically
        if (parent.location.file_path, parent.name) in exported:
            return False
    return True


def _has_outside_usage(element_id: str, resolution: Resolution) -> bool:
    """Whether anything other than the element's own body refers to it or its members."""
    pending = [element_id]
    own: set[str] = set()
    while pending:
        current = pending.pop()
        own.add(current)
        pending.extend(resolution.children.get(current, ()))
    return any(
        usage.used_by not in own for member in own for usage in resolution.usages.get(member, ())
    )


def _smells(resolution: Resolution, thresholds: QualityThresholds) -> list[Issue]:
    elements = resolution.elements
    issues: list[Issue] = []

    def report(kind: IssueKind, element: CodeElement, message: str) -> None:
        issues.append(
            Issue(
                kind=kind,
                severity=Severity.WARNING,
                message=message,
                file_path=element.location.file_path,
                line=element.location.line_number,
                element_id=element.id,
            )
        )

    for element in elements.values():
        name = element.qualified_name
        if element.type is ElementType.FUNCTION:
            if element.line_count > thresholds.max_function_lines:
                report(
                    IssueKind.LONG_FUNCTION,
                    element,
                    f"'{name}' is {element.line_count} lines long "
                    f"(limit {thresholds.max_function_lines})",
                )
            if element.complexity > thresholds.max_complexity:
                report(
                    IssueKind.HIGH_COMPLEXITY,
                    element,
                    f"'{name}' has cyclomatic complexity {element.complexity} "
                    f"(limit {thresholds.max_complexity})",
                )
            parameters = [
                p
                for index, p in enumerate(element.parameters)
                if not (
                    index == 0
                    and element.is_method
                    and "staticmethod" not in element.decorators
                    and p.kind in (ParameterKind.POSITIONAL, ParameterKind.POSITIONAL_ONLY)
                )
            ]
            if len(parameters) > thresholds.max_parameters:
                report(
                    IssueKind.TOO_MANY_PARAMETERS,
                    element,
                    f"'{name}' takes {len(parameters)} parameters "
                    f"(limit {thresholds.max_parameters})",
                )
        elif element.type is ElementType.CLASS:
            method_count = sum(
                elements[child].type is ElementType.FUNCTION
                for child in resolution.children.get(element.id, ())
            )
            if method_count > thresholds.max_class_methods:
                report(
                    IssueKind.LARGE_CLASS,
                    element,
                    f"'{name}' has {method_count} methods (limit {thresholds.max_class_methods})",
                )
    return issues
