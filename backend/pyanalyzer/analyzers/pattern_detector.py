"""Detection of common architectural and design patterns.

Detection combines naming conventions with structural evidence (which methods
a class defines). Confidence reflects how much evidence was found; results are
hints for exploration, not proofs.
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Final

from pyanalyzer.analysis.resolver import Resolution
from pyanalyzer.models.core import ArchitecturalPattern, CodeElement, ElementType, PatternType

_MVC_ROLES: Final = {
    "model": (("model", "entity"), ("model", "models", "entities", "domain")),
    "view": (("view", "template"), ("view", "views", "templates")),
    "controller": (
        ("controller", "handler", "viewset"),
        ("controller", "controllers", "handlers", "routes", "routers"),
    ),
}
_FACTORY_CLASS: Final = re.compile(r"(factory|builder|creator)$", re.IGNORECASE)
_FACTORY_METHOD: Final = re.compile(r"^(create|build|make|new)(_|$)", re.IGNORECASE)
_OBSERVER_CLASS: Final = re.compile(r"(observer|listener|subscriber|watcher)$", re.IGNORECASE)
_SUBJECT_CLASS: Final = re.compile(
    r"(subject|publisher|notifier|observable|emitter|dispatcher|eventbus)$", re.IGNORECASE
)
_SUBSCRIBE_METHOD: Final = re.compile(
    r"^(subscribe|attach|register|add_(listener|observer|handler|subscriber)|on)$", re.IGNORECASE
)
_NOTIFY_METHOD: Final = re.compile(
    r"^_?(notify|emit|publish|dispatch|fire|broadcast)(_|$)", re.IGNORECASE
)
_SINGLETON_ACCESSOR: Final = frozenset({"get_instance", "instance", "getinstance", "shared"})


def detect_patterns(resolution: Resolution) -> list[ArchitecturalPattern]:
    """Detect patterns across all classes of a resolved project."""
    elements = resolution.elements
    classes = [e for e in elements.values() if e.type is ElementType.CLASS]
    methods: dict[str, list[CodeElement]] = defaultdict(list)
    for class_element in classes:
        for child_id in resolution.children.get(class_element.id, ()):
            child = elements[child_id]
            if child.type is ElementType.FUNCTION:
                methods[class_element.id].append(child)

    patterns: list[ArchitecturalPattern] = []
    patterns.extend(_detect_mvc(classes))
    patterns.extend(_detect_factories(classes, methods))
    patterns.extend(_detect_observer(classes, methods))
    patterns.extend(_detect_singletons(classes, methods))
    return patterns


def _path_segments(element: CodeElement) -> set[str]:
    return set(element.location.file_path.lower().removesuffix(".py").split("/"))


def _detect_mvc(classes: list[CodeElement]) -> list[ArchitecturalPattern]:
    roles: dict[str, list[CodeElement]] = {role: [] for role in _MVC_ROLES}
    for element in classes:
        name = element.name.lower()
        segments = _path_segments(element)
        for role, (suffixes, directories) in _MVC_ROLES.items():
            if name.endswith(suffixes) or not segments.isdisjoint(directories):
                roles[role].append(element)
                break
    if not all(roles.values()):
        return []
    members = [element for group in roles.values() for element in group]
    return [
        ArchitecturalPattern(
            name="Model-View-Controller (MVC)",
            type=PatternType.MVC,
            confidence=min(0.9, len(members) / 10.0),
            elements=[element.id for element in members],
            description=(
                f"MVC structure with {len(roles['model'])} models, {len(roles['view'])} views, "
                f"and {len(roles['controller'])} controllers"
            ),
        )
    ]


def _detect_factories(
    classes: list[CodeElement], methods: dict[str, list[CodeElement]]
) -> list[ArchitecturalPattern]:
    patterns: list[ArchitecturalPattern] = []
    for element in classes:
        creators = [m for m in methods[element.id] if _FACTORY_METHOD.match(m.name)]
        named = _FACTORY_CLASS.search(element.name) is not None
        if not creators or not (named or len(creators) >= 2):
            continue
        confidence = min(0.9, (0.5 if named else 0.3) + 0.1 * len(creators))
        patterns.append(
            ArchitecturalPattern(
                name=f"Factory ({element.name})",
                type=PatternType.FACTORY,
                confidence=confidence,
                elements=[element.id, *(m.id for m in creators)],
                description=(
                    f"{element.name} exposes {len(creators)} creation "
                    f"method{'s' if len(creators) != 1 else ''}"
                ),
            )
        )
    return patterns


def _detect_observer(
    classes: list[CodeElement], methods: dict[str, list[CodeElement]]
) -> list[ArchitecturalPattern]:
    observers = [e for e in classes if _OBSERVER_CLASS.search(e.name)]
    subjects: list[CodeElement] = []
    structural = 0
    for element in classes:
        names = [m.name for m in methods[element.id]]
        subscribes = any(_SUBSCRIBE_METHOD.match(n) for n in names)
        notifies = any(_NOTIFY_METHOD.match(n) for n in names)
        if subscribes and notifies:
            subjects.append(element)
            structural += 1
        elif _SUBJECT_CLASS.search(element.name):
            subjects.append(element)
    if not subjects or not (observers or structural):
        return []
    members = [*subjects, *(o for o in observers if o not in subjects)]
    return [
        ArchitecturalPattern(
            name="Observer",
            type=PatternType.OBSERVER,
            confidence=min(0.9, 0.3 + 0.2 * structural + 0.1 * len(observers)),
            elements=[element.id for element in members],
            description=(
                f"{len(subjects)} subject{'s' if len(subjects) != 1 else ''} and "
                f"{len(observers)} observer{'s' if len(observers) != 1 else ''}"
            ),
        )
    ]


def _detect_singletons(
    classes: list[CodeElement], methods: dict[str, list[CodeElement]]
) -> list[ArchitecturalPattern]:
    patterns: list[ArchitecturalPattern] = []
    for element in classes:
        names = {m.name.lower() for m in methods[element.id]}
        evidence: list[str] = []
        if "singleton" in element.name.lower():
            evidence.append("its name")
        if "__new__" in names:
            evidence.append("a custom __new__")
        if names & _SINGLETON_ACCESSOR:
            evidence.append("an instance accessor")
        named_only = evidence == ["its name"]
        if len(evidence) < 2 and not named_only:
            continue
        patterns.append(
            ArchitecturalPattern(
                name=f"Singleton ({element.name})",
                type=PatternType.SINGLETON,
                confidence=min(0.9, 0.3 + 0.25 * len(evidence)),
                elements=[element.id],
                description=f"{element.name} looks like a singleton: {', '.join(evidence)}",
            )
        )
    return patterns
