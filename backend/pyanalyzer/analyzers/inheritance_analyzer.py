"""Class hierarchies and method overrides."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from pyanalyzer.analysis.mro import linearize
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
    _mro: dict[str, list[str]] = field(default_factory=dict, repr=False)

    def ancestors(self, class_id: str) -> list[str]:
        """Project ancestors in method resolution order. Safe on cyclic input."""
        return linearize(class_id, self.bases, self._mro)[1:]

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
        external = _unresolved_bases(
            element.bases, resolution.resolved_base_names.get(element.id, set())
        )
        if external:
            hierarchy.external_bases[element.id] = external
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


def _unresolved_bases(declared: list[str], resolved: set[str]) -> list[str]:
    """Declared base expressions that did not resolve to a project class.

    Compared by the expression as written (``Parent`` for
    ``from base import Internal as Parent``), so aliases are not mistaken
    for external bases. ``Generic[T]`` is compared without its subscript.
    """
    return [expression for expression in declared if expression.split("[", 1)[0] not in resolved]
