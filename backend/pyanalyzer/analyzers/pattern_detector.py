"""
Architectural pattern detector for identifying common design patterns in Python code
"""

import logging
from collections import defaultdict

from pyanalyzer.models.core import (
    ArchitecturalPattern,
    CodeElement,
    DependencyGraph,
    ElementType,
    PatternType,
)

logger = logging.getLogger(__name__)


class ArchitecturalPatternDetector:
    """
    Detects common architectural patterns in Python codebases
    """

    def __init__(self) -> None:
        self.elements_by_type: dict[ElementType, list[CodeElement]] = defaultdict(list)
        self.elements_by_name: dict[str, CodeElement] = {}
        self.dependency_graph: DependencyGraph | None = None

    def detect_patterns(
        self, elements: list[CodeElement], dependency_graph: DependencyGraph | None
    ) -> list[ArchitecturalPattern]:
        """
        Detect architectural patterns in the given code elements

        Args:
            elements: List of code elements to analyze
            dependency_graph: Dependency graph for relationship analysis

        Returns:
            List of detected architectural patterns
        """
        logger.info("Starting architectural pattern detection for %d elements", len(elements))

        # Index elements for pattern detection
        self._index_elements(elements)
        self.dependency_graph = dependency_graph

        patterns = []

        # Detect different pattern types
        patterns.extend(self._detect_mvc_pattern())
        patterns.extend(self._detect_factory_pattern())
        patterns.extend(self._detect_observer_pattern())
        patterns.extend(self._detect_singleton_pattern())

        logger.info("Detected %d architectural patterns", len(patterns))
        return patterns

    def _index_elements(self, elements: list[CodeElement]) -> None:
        """Index elements by type and name for efficient lookup"""
        self.elements_by_type.clear()
        self.elements_by_name.clear()

        for element in elements:
            self.elements_by_type[element.type].append(element)
            self.elements_by_name[element.id] = element

    def _detect_mvc_pattern(self) -> list[ArchitecturalPattern]:
        """Detect Model-View-Controller pattern"""
        patterns = []

        # Look for MVC indicators in class names and file paths
        models = []
        views = []
        controllers = []

        for element in self.elements_by_type[ElementType.CLASS]:
            name_lower = element.name.lower()
            file_path_lower = element.location.file_path.lower()

            # Model detection
            if (
                name_lower.endswith("model")
                or "model" in file_path_lower
                or name_lower.endswith("entity")
                or name_lower.endswith("data")
            ):
                models.append(element)

            # View detection
            elif (
                name_lower.endswith("view")
                or "view" in file_path_lower
                or name_lower.endswith("template")
                or name_lower.endswith("ui")
                or "frontend" in file_path_lower
            ):
                views.append(element)

            # Controller detection
            elif (
                name_lower.endswith("controller")
                or "controller" in file_path_lower
                or name_lower.endswith("handler")
                or name_lower.endswith("service")
                or "api" in file_path_lower
            ):
                controllers.append(element)

        # If we have components from all three categories, it's likely MVC
        if models and views and controllers:
            confidence = min(0.9, (len(models) + len(views) + len(controllers)) / 10.0)

            pattern = ArchitecturalPattern(
                name="Model-View-Controller (MVC)",
                type=PatternType.MVC,
                confidence=confidence,
                elements=[e.id for e in models + views + controllers],
                description=f"MVC pattern detected with {len(models)} models, "
                f"{len(views)} views, and {len(controllers)} controllers",
            )
            patterns.append(pattern)

        return patterns

    def _detect_factory_pattern(self) -> list[ArchitecturalPattern]:
        """Detect Factory pattern"""
        patterns = []

        for element in self.elements_by_type[ElementType.CLASS]:
            name_lower = element.name.lower()

            # Look for factory naming patterns
            if "factory" in name_lower or "builder" in name_lower or "creator" in name_lower:
                # Check if it has methods that create other objects
                factory_methods = []
                for func_element in self.elements_by_type[ElementType.FUNCTION]:
                    if func_element.location.file_path == element.location.file_path:
                        func_name_lower = func_element.name.lower()
                        if (
                            "create" in func_name_lower
                            or "build" in func_name_lower
                            or "make" in func_name_lower
                            or "get" in func_name_lower
                        ):
                            factory_methods.append(func_element)

                if factory_methods:
                    confidence = min(0.8, len(factory_methods) / 5.0)

                    pattern = ArchitecturalPattern(
                        name=f"Factory Pattern ({element.name})",
                        type=PatternType.FACTORY,
                        confidence=confidence,
                        elements=[element.id] + [m.id for m in factory_methods],
                        description=f"Factory pattern detected in {element.name} "
                        f"with {len(factory_methods)} factory methods",
                    )
                    patterns.append(pattern)

        return patterns

    def _detect_observer_pattern(self) -> list[ArchitecturalPattern]:
        """Detect Observer pattern"""
        patterns = []

        # Look for observer-like classes and methods
        observers = []
        subjects = []

        for element in self.elements_by_type[ElementType.CLASS]:
            name_lower = element.name.lower()

            # Observer detection
            if (
                "observer" in name_lower
                or "listener" in name_lower
                or "subscriber" in name_lower
                or "watcher" in name_lower
            ):
                observers.append(element)

            # Subject detection
            elif (
                "subject" in name_lower
                or "publisher" in name_lower
                or "notifier" in name_lower
                or "observable" in name_lower
            ):
                subjects.append(element)

        # Look for notify/update method patterns
        notify_methods = []
        update_methods = []

        for func_element in self.elements_by_type[ElementType.FUNCTION]:
            func_name_lower = func_element.name.lower()

            if (
                "notify" in func_name_lower
                or "publish" in func_name_lower
                or "broadcast" in func_name_lower
            ):
                notify_methods.append(func_element)
            elif (
                "update" in func_name_lower
                or "handle" in func_name_lower
                or "on_" in func_name_lower
            ):
                update_methods.append(func_element)

        # If we have observers/subjects and related methods, it's likely Observer pattern
        if (observers or subjects) and (notify_methods or update_methods):
            total_elements = (
                len(observers) + len(subjects) + len(notify_methods) + len(update_methods)
            )
            confidence = min(0.7, total_elements / 8.0)

            all_elements = observers + subjects + notify_methods + update_methods
            pattern = ArchitecturalPattern(
                name="Observer Pattern",
                type=PatternType.OBSERVER,
                confidence=confidence,
                elements=[e.id for e in all_elements],
                description=f"Observer pattern detected with {len(observers)} observers, "
                f"{len(subjects)} subjects, {len(notify_methods)} notify methods, "
                f"and {len(update_methods)} update methods",
            )
            patterns.append(pattern)

        return patterns

    def _detect_singleton_pattern(self) -> list[ArchitecturalPattern]:
        """Detect Singleton pattern"""
        patterns = []

        for element in self.elements_by_type[ElementType.CLASS]:
            name_lower = element.name.lower()

            # Look for singleton naming patterns
            if "singleton" in name_lower:
                confidence = 0.8

                pattern = ArchitecturalPattern(
                    name=f"Singleton Pattern ({element.name})",
                    type=PatternType.SINGLETON,
                    confidence=confidence,
                    elements=[element.id],
                    description=f"Singleton pattern detected in {element.name}",
                )
                patterns.append(pattern)
                continue

            # Look for singleton implementation patterns
            singleton_indicators = 0

            # Check for private constructor patterns or instance methods
            for func_element in self.elements_by_type[ElementType.FUNCTION]:
                if func_element.location.file_path == element.location.file_path:
                    func_name_lower = func_element.name.lower()

                    if (
                        "instance" in func_name_lower
                        or "get_instance" in func_name_lower
                        or "__new__" in func_name_lower
                    ):
                        singleton_indicators += 1

            # Check for global variables that might be singleton instances
            for var_element in self.elements_by_type[ElementType.VARIABLE]:
                if var_element.location.file_path == element.location.file_path:
                    var_name_lower = var_element.name.lower()

                    if (
                        "instance" in var_name_lower
                        or "_instance" in var_name_lower
                        or var_name_lower == element.name.lower()
                    ):
                        singleton_indicators += 1

            if singleton_indicators >= 2:
                confidence = min(0.6, singleton_indicators / 4.0)

                pattern = ArchitecturalPattern(
                    name=f"Singleton Pattern ({element.name})",
                    type=PatternType.SINGLETON,
                    confidence=confidence,
                    elements=[element.id],
                    description=f"Potential singleton pattern detected in {element.name} "
                    f"with {singleton_indicators} indicators",
                )
                patterns.append(pattern)

        return patterns
