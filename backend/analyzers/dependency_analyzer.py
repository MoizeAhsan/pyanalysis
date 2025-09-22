"""
Dependency analyzer that tracks dependencies between code elements
"""

import ast
import logging
from typing import List, Dict, Optional

from models.core import CodeElement, ElementType

logger = logging.getLogger(__name__)


class DependencyAnalyzer:
    """
    Analyzer that identifies dependencies between code elements
    """

    def __init__(self) -> None:
        self.elements_by_name: Dict[str, List[CodeElement]] = {}
        self.elements_by_file: Dict[str, List[CodeElement]] = {}

    def analyze_dependencies(
        self, elements: List[CodeElement], file_paths: List[str]
    ) -> None:
        """
        Analyze dependencies for all code elements

        Args:
            elements: List of code elements to analyze dependencies for
            file_paths: List of Python files to scan
        """
        logger.info("Starting dependency analysis for %d elements", len(elements))

        # Index elements for quick lookup
        self._index_elements(elements)

        # Analyze each file for dependencies
        for file_path in file_paths:
            try:
                self._analyze_file_dependencies(file_path)
            except (SyntaxError, UnicodeDecodeError, OSError) as e:
                logger.error(
                    "Failed to analyze dependencies in file %s: %s", file_path, e
                )

        logger.info("Dependency analysis completed")

    def _index_elements(self, elements: List[CodeElement]) -> None:
        """Index elements by name and file for quick lookup"""
        self.elements_by_name.clear()
        self.elements_by_file.clear()

        for element in elements:
            # Index by name
            if element.name not in self.elements_by_name:
                self.elements_by_name[element.name] = []
            self.elements_by_name[element.name].append(element)

            # Index by file
            file_path = element.location.file_path
            if file_path not in self.elements_by_file:
                self.elements_by_file[file_path] = []
            self.elements_by_file[file_path].append(element)

    def _analyze_file_dependencies(self, file_path: str) -> None:
        """Analyze dependencies in a single file"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                source_code = f.read()

            tree = ast.parse(source_code, filename=file_path)

            # Get elements defined in this file
            file_elements = self.elements_by_file.get(file_path, [])

            # Find dependencies for each element in this file
            for element in file_elements:
                if element.type in [ElementType.CLASS, ElementType.FUNCTION]:
                    self._find_element_dependencies(element, tree, file_path)

        except (SyntaxError, UnicodeDecodeError, OSError) as e:
            logger.warning(
                "Could not parse file %s for dependency analysis: %s", file_path, e
            )

    def _find_element_dependencies(
        self, element: CodeElement, tree: ast.AST, file_path: str
    ) -> None:
        """Find dependencies for a specific element"""
        dependencies = set(element.dependencies)  # Start with existing dependencies

        # Find the AST node for this element
        element_node = self._find_element_node(element, tree)
        if not element_node:
            return

        # Walk the element's AST and find dependencies
        for node in ast.walk(element_node):
            # Function calls
            if isinstance(node, ast.Call):
                dep_name = self._get_call_name(node)
                if dep_name and self._is_external_dependency(dep_name, file_path):
                    dependencies.add(dep_name)

            # Name references
            elif isinstance(node, ast.Name):
                if self._is_external_dependency(node.id, file_path):
                    dependencies.add(node.id)

            # Attribute access
            elif isinstance(node, ast.Attribute):
                attr_name = self._get_root_name(node)
                if attr_name and self._is_external_dependency(attr_name, file_path):
                    dependencies.add(attr_name)

        # Update element dependencies
        element.dependencies = list(dependencies)

    def _find_element_node(
        self, element: CodeElement, tree: ast.AST
    ) -> Optional[ast.AST]:
        """Find the AST node corresponding to a code element"""
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and element.type == ElementType.CLASS:
                if (
                    node.name == element.name
                    and node.lineno == element.location.line_number
                ):
                    return node
            elif (
                isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and element.type == ElementType.FUNCTION
            ):
                if (
                    node.name == element.name
                    and node.lineno == element.location.line_number
                ):
                    return node
        return None

    def _is_external_dependency(self, name: str, current_file: str) -> bool:
        """Check if a name refers to an external dependency"""
        if name in self.elements_by_name:
            # Check if any element with this name is from a different file
            for element in self.elements_by_name[name]:
                if element.location.file_path != current_file:
                    return True
        return False

    def _get_call_name(self, node: ast.Call) -> Optional[str]:
        """Get the name being called"""
        if isinstance(node.func, ast.Name):
            return node.func.id
        if isinstance(node.func, ast.Attribute):
            return self._get_root_name(node.func)
        return None

    def _get_root_name(self, node: ast.Attribute) -> Optional[str]:
        """Get the root name from an attribute chain (e.g., 'obj' from 'obj.method.attr')"""
        if isinstance(node.value, ast.Name):
            return node.value.id
        if isinstance(node.value, ast.Attribute):
            return self._get_root_name(node.value)
        return None
