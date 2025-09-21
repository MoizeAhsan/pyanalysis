"""
Python AST Parser for extracting code elements from Python files
"""

import ast
import logging
from pathlib import Path
from typing import List, Optional, Union
from dataclasses import dataclass

from models.core import (
    CodeElement,
    ElementType,
    SourceLocation,
    Parameter,
)

# Configure logging for the parser
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class FileAST:
    """Container for parsed AST and metadata"""

    file_path: str
    ast_tree: ast.AST
    source_lines: List[str]
    encoding: str = "utf-8"


class PythonASTParser:
    """
    AST parser for Python files that extracts code elements
    """

    def __init__(self) -> None:
        self.current_file_path: Optional[str] = None
        self.current_source_lines: List[str] = []

    def parse_file(self, file_path: str) -> Optional[FileAST]:
        """
        Parse a Python file and return FileAST object

        Args:
            file_path: Path to the Python file to parse

        Returns:
            FileAST object if successful, None if parsing failed
        """
        try:
            path = Path(file_path)
            if not path.exists():
                logger.error("File not found: %s", file_path)
                return None

            if path.suffix != ".py":
                logger.warning("Skipping non-Python file: %s", file_path)
                return None

            # Read file content
            with open(file_path, "r", encoding="utf-8") as f:
                source_code = f.read()
                source_lines = source_code.splitlines()

            # Parse AST
            ast_tree = ast.parse(source_code, filename=file_path)

            logger.info("Successfully parsed: %s", file_path)
            return FileAST(
                file_path=str(path), ast_tree=ast_tree, source_lines=source_lines
            )

        except SyntaxError as e:
            logger.error(
                "Syntax error in %s at line %s: %s", file_path, e.lineno, e.msg
            )
            return None
        except UnicodeDecodeError as e:
            logger.error("Encoding error in %s: %s", file_path, e)
            return None
        except (OSError, IOError) as e:
            logger.error("File I/O error parsing %s: %s", file_path, e)
            return None

    def extract_elements(self, file_ast: FileAST) -> List[CodeElement]:
        """
        Extract code elements from parsed AST

        Args:
            file_ast: FileAST object containing parsed AST

        Returns:
            List of CodeElement objects
        """
        if not file_ast:
            return []

        self.current_file_path = file_ast.file_path
        self.current_source_lines = file_ast.source_lines

        elements = []

        # Create module element
        module_element = self._create_module_element(file_ast)
        elements.append(module_element)

        # Walk the AST and extract elements
        for node in ast.walk(file_ast.ast_tree):
            if isinstance(node, ast.ClassDef):
                class_element = self._extract_class(node)
                elements.append(class_element)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                function_element = self._extract_function(node)
                elements.append(function_element)
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                import_elements = self._extract_imports(node)
                elements.extend(import_elements)

        return elements

    def _create_module_element(self, file_ast: FileAST) -> CodeElement:
        """Create a module element for the file"""
        module_name = Path(file_ast.file_path).stem
        module_id = f"module:{file_ast.file_path}"

        # Get module docstring if it exists
        docstring = None
        if (
            isinstance(file_ast.ast_tree, ast.Module)
            and file_ast.ast_tree.body
            and isinstance(file_ast.ast_tree.body[0], ast.Expr)
            and isinstance(file_ast.ast_tree.body[0].value, ast.Constant)
            and isinstance(file_ast.ast_tree.body[0].value.value, str)
        ):
            docstring = file_ast.ast_tree.body[0].value.value

        return CodeElement(
            id=module_id,
            name=module_name,
            type=ElementType.MODULE,
            location=SourceLocation(
                file_path=file_ast.file_path, line_number=1, column_number=0
            ),
            docstring=docstring,
        )

    def _extract_class(self, node: ast.ClassDef) -> CodeElement:
        """Extract class information from AST node"""
        class_id = f"class:{self.current_file_path}:{node.name}"

        # Get class location
        location = SourceLocation(
            file_path=self.current_file_path or "",
            line_number=node.lineno,
            column_number=node.col_offset,
            end_line=getattr(node, "end_lineno", node.lineno),
            end_column=getattr(node, "end_col_offset", node.col_offset),
        )

        # Extract docstring
        docstring = ast.get_docstring(node)

        # Extract decorators
        decorators = [self._get_decorator_name(dec) for dec in node.decorator_list]

        # Extract base classes as dependencies
        dependencies = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                dependencies.append(base.id)
            elif isinstance(base, ast.Attribute):
                dependencies.append(self._get_attribute_name(base))

        return CodeElement(
            id=class_id,
            name=node.name,
            type=ElementType.CLASS,
            location=location,
            docstring=docstring,
            decorators=decorators,
            dependencies=dependencies,
            metadata={
                "base_classes": [self._get_node_name(base) for base in node.bases],
                "method_count": len(
                    [
                        n
                        for n in node.body
                        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                    ]
                ),
            },
        )

    def _extract_function(
        self, node: Union[ast.FunctionDef, ast.AsyncFunctionDef]
    ) -> CodeElement:
        """Extract function information from AST node"""
        function_id = f"function:{self.current_file_path}:{node.name}"

        # Get function location
        location = SourceLocation(
            file_path=self.current_file_path or "",
            line_number=node.lineno,
            column_number=node.col_offset,
            end_line=getattr(node, "end_lineno", node.lineno),
            end_column=getattr(node, "end_col_offset", node.col_offset),
        )

        # Extract docstring
        docstring = ast.get_docstring(node)

        # Extract decorators
        decorators = [self._get_decorator_name(dec) for dec in node.decorator_list]

        # Extract parameters
        parameters = self._extract_parameters(node.args)

        # Extract return type
        return_type = None
        if node.returns:
            return_type = self._get_type_annotation(node.returns)

        return CodeElement(
            id=function_id,
            name=node.name,
            type=ElementType.FUNCTION,
            location=location,
            docstring=docstring,
            parameters=parameters,
            return_type=return_type,
            decorators=decorators,
            metadata={
                "is_async": isinstance(node, ast.AsyncFunctionDef),
                "parameter_count": len(parameters),
            },
        )

    def _extract_imports(
        self, node: Union[ast.Import, ast.ImportFrom]
    ) -> List[CodeElement]:
        """Extract import information from AST node"""
        imports = []

        if isinstance(node, ast.Import):
            for alias in node.names:
                import_id = (
                    f"import:{self.current_file_path}:{alias.name}:{node.lineno}"
                )
                imports.append(
                    CodeElement(
                        id=import_id,
                        name=alias.asname or alias.name,
                        type=ElementType.IMPORT,
                        location=SourceLocation(
                            file_path=self.current_file_path or "",
                            line_number=node.lineno,
                            column_number=node.col_offset,
                        ),
                        dependencies=[alias.name],
                        metadata={
                            "module": alias.name,
                            "alias": alias.asname,
                            "import_type": "import",
                        },
                    )
                )

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                import_id = f"import:{self.current_file_path}:{module}.{alias.name}:{node.lineno}"
                full_name = f"{module}.{alias.name}" if module else alias.name
                imports.append(
                    CodeElement(
                        id=import_id,
                        name=alias.asname or alias.name,
                        type=ElementType.IMPORT,
                        location=SourceLocation(
                            file_path=self.current_file_path or "",
                            line_number=node.lineno,
                            column_number=node.col_offset,
                        ),
                        dependencies=[full_name],
                        metadata={
                            "module": module,
                            "imported_name": alias.name,
                            "alias": alias.asname,
                            "import_type": "from_import",
                            "level": node.level,
                        },
                    )
                )

        return imports

    def _extract_parameters(self, args: ast.arguments) -> List[Parameter]:
        """Extract function parameters from arguments node"""
        parameters = []

        # Regular arguments
        for i, arg in enumerate(args.args):
            param = Parameter(
                name=arg.arg,
                type_hint=self._get_type_annotation(arg.annotation)
                if arg.annotation
                else None,
            )

            # Check for default values
            defaults_offset = len(args.args) - len(args.defaults)
            if i >= defaults_offset:
                default_idx = i - defaults_offset
                param.default_value = self._get_default_value(
                    args.defaults[default_idx]
                )

            parameters.append(param)

        # Keyword-only arguments
        for i, arg in enumerate(args.kwonlyargs):
            param = Parameter(
                name=arg.arg,
                type_hint=self._get_type_annotation(arg.annotation)
                if arg.annotation
                else None,
            )

            # Check for default values
            if i < len(args.kw_defaults):
                default_val = args.kw_defaults[i]
                if default_val is not None:
                    param.default_value = self._get_default_value(default_val)

            parameters.append(param)

        return parameters

    def _get_decorator_name(self, decorator: ast.expr) -> str:
        """Get decorator name as string"""
        if isinstance(decorator, ast.Name):
            return decorator.id
        if isinstance(decorator, ast.Attribute):
            return self._get_attribute_name(decorator)
        if isinstance(decorator, ast.Call):
            return self._get_node_name(decorator.func)
        return str(decorator)

    def _get_attribute_name(self, node: ast.Attribute) -> str:
        """Get full attribute name (e.g., 'module.attr')"""
        if isinstance(node.value, ast.Name):
            return f"{node.value.id}.{node.attr}"
        if isinstance(node.value, ast.Attribute):
            return f"{self._get_attribute_name(node.value)}.{node.attr}"
        return node.attr

    def _get_node_name(self, node: ast.expr) -> str:
        """Get name from various AST node types"""
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return self._get_attribute_name(node)
        if isinstance(node, ast.Constant):
            return str(node.value)
        return str(node)

    def _get_type_annotation(self, annotation: ast.expr) -> str:
        """Get type annotation as string"""
        if isinstance(annotation, ast.Name):
            return annotation.id
        if isinstance(annotation, ast.Attribute):
            return self._get_attribute_name(annotation)
        if isinstance(annotation, ast.Constant):
            return str(annotation.value)
        if isinstance(annotation, ast.Subscript):
            # Handle generic types like List[str], Dict[str, int]
            value = self._get_type_annotation(annotation.value)
            slice_val = self._get_type_annotation(annotation.slice)
            return f"{value}[{slice_val}]"
        return str(annotation)

    def _get_default_value(self, default: ast.expr) -> str:
        """Get default parameter value as string"""
        if isinstance(default, ast.Constant):
            if isinstance(default.value, str):
                return f"'{default.value}'"
            return str(default.value)
        if isinstance(default, ast.Name):
            return default.id
        if isinstance(default, ast.Attribute):
            return self._get_attribute_name(default)
        return str(default)
