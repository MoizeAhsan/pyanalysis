"""
Usage analyzer that tracks where code elements are used throughout the codebase
"""

import ast
import logging
from dataclasses import dataclass

from pyanalyzer.models.core import CodeElement, ElementType, SourceLocation, Usage, UsageType

logger = logging.getLogger(__name__)


@dataclass
class UsageContext:
    """Context information for a usage occurrence"""

    element_id: str
    usage_type: UsageType
    location: SourceLocation
    context_line: str
    surrounding_context: list[str]


class UsageAnalyzer:
    """
    Analyzer that finds usage patterns of code elements across the codebase
    """

    def __init__(self) -> None:
        self.elements_by_name: dict[str, list[CodeElement]] = {}
        self.elements_by_id: dict[str, CodeElement] = {}
        self.file_contents: dict[str, list[str]] = {}

    def analyze_usage(self, elements: list[CodeElement], file_paths: list[str]) -> None:
        """
        Analyze usage patterns for all code elements across the given files

        Args:
            elements: List of code elements to track usage for
            file_paths: List of Python files to scan for usage
        """
        logger.info(
            "Starting usage analysis for %d elements across %d files",
            len(elements),
            len(file_paths),
        )

        # Index elements for quick lookup
        self._index_elements(elements)

        # Load file contents
        self._load_file_contents(file_paths)

        # Find usage patterns in each file
        for file_path in file_paths:
            try:
                self._analyze_file_usage(file_path)
            except (SyntaxError, UnicodeDecodeError, OSError) as e:
                logger.error("Failed to analyze usage in file %s: %s", file_path, e)

        logger.info("Usage analysis completed")

    def _index_elements(self, elements: list[CodeElement]) -> None:
        """Index elements by name and ID for quick lookup"""
        self.elements_by_name.clear()
        self.elements_by_id.clear()

        for element in elements:
            # Index by ID
            self.elements_by_id[element.id] = element

            # Index by name for lookup
            if element.name not in self.elements_by_name:
                self.elements_by_name[element.name] = []
            self.elements_by_name[element.name].append(element)

    def _load_file_contents(self, file_paths: list[str]) -> None:
        """Load and cache file contents for context extraction"""
        self.file_contents.clear()

        for file_path in file_paths:
            try:
                with open(file_path, encoding="utf-8") as f:
                    self.file_contents[file_path] = f.readlines()
            except (OSError, UnicodeDecodeError) as e:
                logger.warning("Could not read file %s: %s", file_path, e)
                self.file_contents[file_path] = []

    def _analyze_file_usage(self, file_path: str) -> None:
        """Analyze usage patterns in a single file"""
        try:
            # Parse the file
            with open(file_path, encoding="utf-8") as f:
                source_code = f.read()

            tree = ast.parse(source_code, filename=file_path)

            # Walk the AST and find usage patterns
            for node in ast.walk(tree):
                self._check_node_for_usage(node, file_path)

        except (SyntaxError, UnicodeDecodeError, OSError) as e:
            logger.warning("Could not parse file %s for usage analysis: %s", file_path, e)

    def _check_node_for_usage(self, node: ast.AST, file_path: str) -> None:
        """Check an AST node for usage of tracked elements"""

        # Function/method calls
        if isinstance(node, ast.Call):
            self._handle_call_usage(node, file_path)

        # Name references (variable usage, function calls without parentheses)
        elif isinstance(node, ast.Name):
            self._handle_name_usage(node, file_path)

        # Attribute access (obj.method, obj.attr)
        elif isinstance(node, ast.Attribute):
            self._handle_attribute_usage(node, file_path)

        # Import statements
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            self._handle_import_usage(node, file_path)

        # Class inheritance
        elif isinstance(node, ast.ClassDef):
            self._handle_inheritance_usage(node, file_path)

    def _handle_call_usage(self, node: ast.Call, file_path: str) -> None:
        """Handle function/method call usage"""
        func_name = self._get_call_name(node)
        if func_name and func_name in self.elements_by_name:
            for element in self.elements_by_name[func_name]:
                if element.type == ElementType.FUNCTION and element.location.file_path != file_path:
                    usage = self._create_usage(node, file_path, UsageType.CALL, f"{func_name}(...)")
                    element.usages.append(usage)

    def _handle_name_usage(self, node: ast.Name, file_path: str) -> None:
        """Handle name reference usage"""
        if node.id in self.elements_by_name:
            for element in self.elements_by_name[node.id]:
                # Don't count usage in the same file where it's defined (for now)
                if element.location.file_path != file_path:
                    usage = self._create_usage(node, file_path, UsageType.CALL, node.id)
                    element.usages.append(usage)

    def _handle_attribute_usage(self, node: ast.Attribute, file_path: str) -> None:
        """Handle attribute access usage"""
        attr_name = node.attr
        if attr_name in self.elements_by_name:
            for element in self.elements_by_name[attr_name]:
                if element.location.file_path != file_path:
                    full_attr = self._get_full_attribute_name(node)
                    usage = self._create_usage(node, file_path, UsageType.CALL, full_attr)
                    element.usages.append(usage)

    def _handle_import_usage(self, node: ast.AST, file_path: str) -> None:
        """Handle import statement usage"""
        if isinstance(node, ast.Import):
            for alias in node.names:
                module_name = alias.name.split(".")[0]  # Get root module
                if module_name in self.elements_by_name:
                    for element in self.elements_by_name[module_name]:
                        if element.type == ElementType.MODULE:
                            usage = self._create_usage(
                                node,
                                file_path,
                                UsageType.IMPORT,
                                f"import {alias.name}",
                            )
                            element.usages.append(usage)

        elif isinstance(node, ast.ImportFrom) and node.module:
            module_name = node.module.split(".")[0]  # Get root module
            if module_name in self.elements_by_name:
                for element in self.elements_by_name[module_name]:
                    if element.type == ElementType.MODULE:
                        imported_names = [alias.name for alias in node.names]
                        usage = self._create_usage(
                            node,
                            file_path,
                            UsageType.IMPORT,
                            f"from {node.module} import {', '.join(imported_names)}",
                        )
                        element.usages.append(usage)

    def _handle_inheritance_usage(self, node: ast.ClassDef, file_path: str) -> None:
        """Handle class inheritance usage"""
        for base in node.bases:
            base_name = self._get_node_name(base)
            if base_name and base_name in self.elements_by_name:
                for element in self.elements_by_name[base_name]:
                    if (
                        element.type == ElementType.CLASS
                        and element.location.file_path != file_path
                    ):
                        usage = self._create_usage(
                            node,
                            file_path,
                            UsageType.INHERITANCE,
                            f"class {node.name}({base_name})",
                        )
                        element.usages.append(usage)

    def _create_usage(
        self, node: ast.AST, file_path: str, usage_type: UsageType, context: str
    ) -> Usage:
        """Create a Usage object from an AST node"""
        location = SourceLocation(
            file_path=file_path,
            line_number=getattr(node, "lineno", 1),
            column_number=getattr(node, "col_offset", 0),
            end_line=getattr(node, "end_lineno", getattr(node, "lineno", 1)),
            end_column=getattr(node, "end_col_offset", getattr(node, "col_offset", 0)),
        )

        # Get context from file contents
        context_line = self._get_context_line(file_path, location.line_number)

        return Usage(
            location=location,
            context=context_line.strip() if context_line else context,
            usage_type=usage_type,
        )

    def _get_context_line(self, file_path: str, line_number: int) -> str:
        """Get the source code line for context"""
        if file_path in self.file_contents:
            lines = self.file_contents[file_path]
            if 1 <= line_number <= len(lines):
                return lines[line_number - 1].rstrip("\n")
        return ""

    def _get_call_name(self, node: ast.Call) -> str | None:
        """Extract function name from call node"""
        if isinstance(node.func, ast.Name):
            return node.func.id
        if isinstance(node.func, ast.Attribute):
            return node.func.attr
        return None

    def _get_full_attribute_name(self, node: ast.Attribute) -> str:
        """Get full attribute name like 'obj.attr'"""
        if isinstance(node.value, ast.Name):
            return f"{node.value.id}.{node.attr}"
        if isinstance(node.value, ast.Attribute):
            return f"{self._get_full_attribute_name(node.value)}.{node.attr}"
        return node.attr

    def _get_node_name(self, node: ast.AST) -> str | None:
        """Get name from various AST node types"""
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return self._get_full_attribute_name(node)
        return None
