"""Class hierarchies and method overrides."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from pyanalyzer.analysis.resolver import Resolution
from pyanalyzer.models.core import ElementType


@dataclass(slots=True)
class ClassHierarchy:
    """Inheritance relationships between project classes.

    Only bases that resolve to classes inside the project are included; a
    class may additionally inherit from external classes (see
    :attr:`external_bases`).
    """

    bases: dict[str, list[str]] = field(default_factory=dict)
    subclasses: dict[str, list[str]] = field(default_factory=dict)
    external_bases: dict[str, list[str]] = field(default_factory=dict)
    overrides: dict[str, str] = field(default_factory=dict)
    overridden_by: dict[str, list[str]] = field(default_factory=dict)

    def ancestors(self, class_id: str) -> list[str]:
        """All project ancestors, nearest first. Safe on cyclic input."""
        return _closure(class_id, self.bases)

    def descendants(self, class_id: str) -> list[str]:
        """All project descendants, nearest first. Safe on cyclic input."""
        return _closure(class_id, self.subclasses)


def _closure(start: str, edges: dict[str, list[str]]) -> list[str]:
    seen = {start}
    order: list[str] = []
    queue = [start]
    position = 0
    while position < len(queue):
        for neighbour in edges.get(queue[position], ()):
            if neighbour not in seen:
                seen.add(neighbour)
                order.append(neighbour)
                queue.append(neighbour)
        position += 1
    return order


def build_hierarchy(resolution: Resolution) -> ClassHierarchy:
    """Derive the class hierarchy and method overrides from resolved bases."""
    elements = resolution.elements
    hierarchy = ClassHierarchy()
    subclasses: dict[str, list[str]] = defaultdict(list)

    for class_id, bases in resolution.class_bases.items():
        unique = list(dict.fromkeys(bases))
        hierarchy.bases[class_id] = unique
        for base in unique:
            subclasses[base].append(class_id)
    hierarchy.subclasses = dict(subclasses)

    methods: dict[str, dict[str, str]] = {}
    for element in elements.values():
        if element.type is not ElementType.CLASS:
            continue
        resolved = len(hierarchy.bases.get(element.id, ()))
        if len(element.bases) > resolved:
            hierarchy.external_bases[element.id] = _unresolved_bases(
                element.bases, [elements[b].name for b in hierarchy.bases.get(element.id, ())]
            )
        methods[element.id] = {
            elements[child].name: child
            for child in reversed(resolution.children.get(element.id, ()))
            if elements[child].type is ElementType.FUNCTION
        }

    overridden_by: dict[str, list[str]] = defaultdict(list)
    for class_id in hierarchy.bases:
        ancestors = hierarchy.ancestors(class_id)
        for name, method_id in methods.get(class_id, {}).items():
            for ancestor in ancestors:
                inherited = methods.get(ancestor, {}).get(name)
                if inherited is not None:
                    hierarchy.overrides[method_id] = inherited
                    overridden_by[inherited].append(method_id)
                    break
    hierarchy.overridden_by = dict(overridden_by)
    return hierarchy


def _unresolved_bases(declared: list[str], resolved_names: list[str]) -> list[str]:
    """Declared base expressions that did not resolve to a project class."""
    remaining = list(resolved_names)
    external: list[str] = []
    for expression in declared:
        short_name = expression.split("[", 1)[0].rsplit(".", 1)[-1]
        if short_name in remaining:
            remaining.remove(short_name)
        else:
            external.append(expression)
    return external
