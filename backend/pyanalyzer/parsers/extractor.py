"""Single-pass, stateless extraction of one Python source file.

:func:`extract_file` is a pure function of the file's bytes: it keeps no state
between calls, so it is safe to run in any number of worker processes at once.
It records definitions, import bindings, and every reference whose root name is
bound to something the resolver could map to a project element (an import, a
definition in the same file, or ``self``/``cls`` inside a method). References
to plain local variables and builtins are dropped here, which keeps records
small on large code bases.
"""

from __future__ import annotations

import ast
import builtins
import io
import tokenize
import warnings
from pathlib import Path
from typing import Final

from pyanalyzer.models.core import (
    CodeElement,
    ElementType,
    Parameter,
    ParameterKind,
    SourceLocation,
)
from pyanalyzer.models.records import (
    FileRecord,
    ImportBinding,
    Reference,
    RefKind,
    TargetKind,
)

#: Bump whenever the shape or meaning of :class:`FileRecord` changes, so that
#: cached records produced by an older extractor are discarded.
EXTRACTOR_VERSION: Final = 3

_MAX_CONTEXT: Final = 200
_MAX_EXPR_TEXT: Final = 120
_MAX_STRING_ANNOTATION: Final = 500
_BUILTIN_NAMES: Final = frozenset(dir(builtins))

_LOCAL: Final = "local"
_DEF: Final = "def"
_IMPORT: Final = "import"

type _Binding = tuple[str, str, int]
#: Where a variable's type comes from: ``(kind, root, attrs, scope)``. The
#: dotted name ``root.attrs`` is looked up from ``scope`` once the module is
#: complete; ``kind`` is CALL for ``x = make()`` and ANNOTATION for ``x: T``.
type _TypeSource = tuple[RefKind, str, tuple[str, ...], "_Scope"]
type _FunctionNode = ast.FunctionDef | ast.AsyncFunctionDef
type _Comprehension = ast.ListComp | ast.SetComp | ast.DictComp | ast.GeneratorExp


def module_id(rel_path: str) -> str:
    """Element id of the module defined by ``rel_path``."""
    return f"module:{rel_path}"


def dotted_module_name(rel_path: str) -> str:
    """Dotted name implied by a path relative to the project root.

    ``pkg/mod.py`` becomes ``pkg.mod`` and ``pkg/__init__.py`` becomes ``pkg``.
    """
    parts = rel_path.removesuffix(".py").split("/")
    if parts[-1] == "__init__" and len(parts) > 1:
        parts.pop()
    return ".".join(parts)


def extract_file(root: str, rel_path: str) -> FileRecord:
    """Read ``rel_path`` under ``root`` and extract its record.

    Never raises for problems with the file itself: unreadable, undecodable, or
    syntactically invalid files produce a record whose ``error`` is set.
    """
    try:
        raw = Path(root, rel_path).read_bytes()
    except OSError as exc:
        record = FileRecord(rel_path=rel_path, error=f"unreadable: {exc.strerror or exc}")
        record.elements.append(_module_element(rel_path, None, 0))
        return record
    return extract_source(raw, rel_path)


def extract_source(raw: bytes, rel_path: str) -> FileRecord:
    """Extract a record from source bytes. See :func:`extract_file`."""
    record = FileRecord(rel_path=rel_path)
    try:
        encoding, _ = tokenize.detect_encoding(io.BytesIO(raw).readline)
        text = raw.decode(encoding)
    except (SyntaxError, UnicodeDecodeError, LookupError) as exc:
        record.error = f"encoding error: {exc}"
        record.elements.append(_module_element(rel_path, None, 0))
        return record

    lines = text.splitlines()
    record.line_count = len(lines)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            tree = ast.parse(text, filename=rel_path)
    except SyntaxError as exc:
        record.error = f"syntax error at line {exc.lineno or 0}: {exc.msg}"
    except (ValueError, RecursionError, MemoryError) as exc:
        record.error = f"unparsable source: {type(exc).__name__}"
    if record.error is not None:
        record.elements.append(_module_element(rel_path, None, record.line_count))
        return record

    module = _module_element(rel_path, ast.get_docstring(tree), record.line_count)
    extractor = _Extractor(rel_path, lines, module)
    try:
        extractor.run(tree)
    except RecursionError:
        record.error = "source is nested too deeply to analyze"
        record.elements.append(module)
        return record
    extractor.finish(record)
    return record


def _module_element(rel_path: str, docstring: str | None, line_count: int) -> CodeElement:
    return CodeElement(
        id=module_id(rel_path),
        name=rel_path.rsplit("/", 1)[-1].removesuffix(".py"),
        qualified_name=dotted_module_name(rel_path),
        type=ElementType.MODULE,
        location=SourceLocation(rel_path, 1, 0, max(line_count, 1), 0),
        docstring=docstring,
    )


def _expr_text(node: ast.AST, limit: int = _MAX_EXPR_TEXT) -> str:
    """Source text for an expression, shortened to ``limit`` characters."""
    try:
        text = ast.unparse(node)
    except (ValueError, RecursionError):  # pragma: no cover - defensive
        return "..."
    return text if len(text) <= limit else text[: limit - 3] + "..."


def _dotted(node: ast.expr) -> tuple[str, tuple[str, ...]] | None:
    """``a.b.c`` as ``("a", ("b", "c"))``; ``None`` for anything else."""
    attrs: list[str] = []
    while isinstance(node, ast.Attribute):
        attrs.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        return node.id, tuple(reversed(attrs))
    return None


def _is_none(node: ast.expr) -> bool:
    return (isinstance(node, ast.Constant) and node.value is None) or (
        isinstance(node, ast.Name) and node.id == "None"
    )


_OPTIONAL_WRAPPERS: Final = frozenset({"Optional", "Annotated", "Final", "ClassVar"})


def _type_chain(node: ast.expr, depth: int = 0) -> tuple[str, tuple[str, ...]] | None:
    """The class named by a type annotation, if it names exactly one.

    Unwraps ``Optional[T]``, ``T | None``, ``Union[T, None]``, ``Final[T]``
    and string annotations. ``Repo[User]`` names ``Repo``; containers such as
    ``list[User]`` name ``list``, which never resolves to a project class.
    """
    if depth > 5:
        return None
    if isinstance(node, ast.Constant):
        if not isinstance(node.value, str) or len(node.value) > _MAX_STRING_ANNOTATION:
            return None
        try:
            parsed = ast.parse(node.value.strip(), mode="eval")
        except (SyntaxError, ValueError, RecursionError):
            return None
        return _type_chain(parsed.body, depth + 1)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        sides = [side for side in (node.left, node.right) if not _is_none(side)]
        return _type_chain(sides[0], depth + 1) if len(sides) == 1 else None
    if isinstance(node, ast.Subscript):
        head = _dotted(node.value)
        if head is None:
            return None
        name = head[1][-1] if head[1] else head[0]
        arguments = node.slice.elts if isinstance(node.slice, ast.Tuple) else [node.slice]
        if name in _OPTIONAL_WRAPPERS and arguments:
            return _type_chain(arguments[0], depth + 1)
        if name == "Union":
            members = [argument for argument in arguments if not _is_none(argument)]
            return _type_chain(members[0], depth + 1) if len(members) == 1 else None
        return head
    return _dotted(node)


def _merge_type[K](types: dict[K, _TypeSource | None], key: K, source: _TypeSource | None) -> None:
    """Record a type source; conflicting or unknown bindings make it unknown."""
    if source is None:
        types[key] = None
        return
    existing = types.get(key, source)
    if existing is None or existing[:3] != source[:3]:
        types[key] = None
    else:
        types[key] = existing


class _Scope:
    """A lexical scope: the module, a class body, or a function-like body."""

    __slots__ = (
        "bindings",
        "class_id",
        "global_names",
        "kind",
        "parent",
        "self_name",
        "types",
    )

    def __init__(self, kind: str, parent: _Scope | None) -> None:
        self.kind = kind
        self.parent = parent
        self.bindings: dict[str, _Binding] = {}
        self.global_names: set[str] = set()
        self.self_name = ""
        self.class_id = ""
        #: Known type source per local name; ``None`` once the name has been
        #: bound in a way whose type is unknown or conflicting.
        self.types: dict[str, _TypeSource | None] = {}


class _Extractor(ast.NodeVisitor):
    """Walks one module, collecting elements, imports, and pending references."""

    def __init__(self, rel_path: str, lines: list[str], module: CodeElement) -> None:
        self._rel_path = rel_path
        self._lines = lines
        self._elements: list[CodeElement] = [module]
        self._ids: set[str] = {module.id}
        self._imports: list[ImportBinding] = []
        self._pending: list[tuple[_Scope, str, str, tuple[str, ...], int, int, RefKind]] = []
        self._attribute_names: set[str] = set()
        self._exports: list[str] | None = None
        self._module_scope = _Scope("module", None)
        self._scope = self._module_scope
        self._user_id = module.id
        self._qualname: list[str] = []
        self._kind: RefKind | None = None
        self._complexity: list[int] = []
        self._position: tuple[int, int] | None = None
        self._pending_type: tuple[str, _TypeSource] | None = None
        #: ``make().attr`` chains: (user id, callee source, attrs, line, col, kind).
        self._pending_results: list[
            tuple[str, _TypeSource, tuple[str, ...], int, int, RefKind]
        ] = []
        self._return_sources: dict[str, _TypeSource] = {}
        self._attribute_sources: dict[tuple[str, str], _TypeSource | None] = {}
        self._class_lines: dict[str, int] = {}

    # ------------------------------------------------------------------ driver

    def run(self, tree: ast.Module) -> None:
        for statement in tree.body:
            self.visit(statement)

    def finish(self, record: FileRecord) -> None:
        """Resolve pending references against the completed scopes."""
        has_star = any(binding.is_star for binding in self._imports)
        used_imports: set[str] = set()
        references: list[Reference] = []

        for scope, user_id, root, attrs, line, col, kind in self._pending:
            found = self._lookup(scope, root)
            if found is None and root == "super":
                method_scope = self._enclosing_method(scope)
                if method_scope is not None:
                    references.append(
                        Reference(
                            user_id,
                            line,
                            col,
                            kind,
                            TargetKind.SELF,
                            target_id=method_scope.class_id,
                            name="super",
                            attrs=attrs,
                            context=self._context(line),
                        )
                    )
                continue
            if found is None:
                if has_star and root not in _BUILTIN_NAMES:
                    references.append(
                        Reference(
                            user_id,
                            line,
                            col,
                            kind,
                            TargetKind.UNBOUND,
                            name=root,
                            attrs=attrs,
                            context=self._context(line),
                        )
                    )
                continue
            (tag, target, index), owner = found
            if tag == _DEF:
                reference = Reference(user_id, line, col, kind, TargetKind.LOCAL, target_id=target)
            elif tag == _IMPORT:
                used_imports.add(root)
                reference = Reference(
                    user_id, line, col, kind, TargetKind.IMPORT, import_index=index
                )
            elif attrs and owner.self_name == root:
                reference = Reference(
                    user_id, line, col, kind, TargetKind.SELF, target_id=owner.class_id
                )
            elif attrs and (source := owner.types.get(root)) is not None:
                via = self._source_reference(source, user_id, line, col)
                if via is None:
                    continue
                reference = Reference(user_id, line, col, kind, TargetKind.TYPED, via=via)
            else:
                continue
            reference.name = root
            reference.attrs = attrs
            reference.context = self._context(line)
            references.append(reference)

        for user_id, source, attrs, line, col, kind in self._pending_results:
            via = self._source_reference(source, user_id, line, col)
            if via is not None:
                typed = Reference(user_id, line, col, kind, TargetKind.TYPED, via=via)
                typed.attrs = attrs
                typed.context = self._context(line)
                references.append(typed)

        exported = set(self._exports or ())
        for binding in self._imports:
            binding.used = (
                binding.is_star
                or binding.local_name in used_imports
                or binding.local_name in exported
            )
            binding.suppressed = "# noqa" in self._context(binding.line, limit=None).lower()

        record.elements = self._elements
        record.imports = self._imports
        record.references = references
        record.exports = self._exports
        record.attribute_names = sorted(self._attribute_names)
        for function_id, source in self._return_sources.items():
            via = self._source_reference(source, function_id, 0, 0)
            if via is not None:
                record.return_types[function_id] = via
        for (class_id, attr), maybe_source in self._attribute_sources.items():
            if maybe_source is None:
                continue
            via = self._source_reference(maybe_source, class_id, self._class_lines[class_id], 0)
            if via is not None:
                record.attribute_types.append((class_id, attr, via))

    # ----------------------------------------------------------------- helpers

    def _context(self, line: int, limit: int | None = _MAX_CONTEXT) -> str:
        if 1 <= line <= len(self._lines):
            text = self._lines[line - 1].strip()
            return text if limit is None else text[:limit]
        return ""

    @staticmethod
    def _lookup(scope: _Scope, name: str) -> tuple[_Binding, _Scope] | None:
        """Find ``name`` following Python's rules: class bodies are not enclosing scopes."""
        current: _Scope | None = scope
        first = True
        while current is not None:
            if first or current.kind != "class":
                binding = current.bindings.get(name)
                if binding is not None:
                    return binding, current
            first = False
            current = current.parent
        return None

    @staticmethod
    def _enclosing_method(scope: _Scope) -> _Scope | None:
        current: _Scope | None = scope
        while current is not None:
            if current.self_name:
                return current
            current = current.parent
        return None

    def _source_reference(
        self, source: _TypeSource, user_id: str, line: int, col: int
    ) -> Reference | None:
        """The reference a type source's dotted name denotes, if it is bound."""
        kind, root, attrs, scope = source
        found = self._lookup(scope, root)
        if found is None:
            return None
        (tag, target, index), _ = found
        if tag == _DEF:
            reference = Reference(user_id, line, col, kind, TargetKind.LOCAL, target_id=target)
        elif tag == _IMPORT:
            reference = Reference(user_id, line, col, kind, TargetKind.IMPORT, import_index=index)
        else:
            return None
        reference.name = root
        reference.attrs = attrs
        return reference

    def _bind(
        self,
        name: str,
        tag: str = _LOCAL,
        target: str = "",
        index: int = -1,
        type_source: _TypeSource | None = None,
    ) -> None:
        scope = self._module_scope if name in self._scope.global_names else self._scope
        if tag == _LOCAL:
            pending = self._pending_type
            if type_source is None and pending is not None and pending[0] == name:
                type_source = pending[1]
            _merge_type(scope.types, name, type_source)
        existing = scope.bindings.get(name)
        if tag == _LOCAL and existing is not None and existing[0] != _LOCAL:
            return
        scope.bindings[name] = (tag, target, index)

    def _unique_id(self, prefix: str, node: ast.stmt) -> str:
        candidate = f"{prefix}:{self._rel_path}:{'.'.join(self._qualname)}"
        if candidate in self._ids:
            candidate = f"{candidate}@{node.lineno}"
        if candidate in self._ids:
            candidate = f"{candidate}:{node.col_offset}"
        self._ids.add(candidate)
        return candidate

    def _location(self, node: ast.stmt) -> SourceLocation:
        return SourceLocation(
            self._rel_path,
            node.lineno,
            node.col_offset,
            node.end_lineno or node.lineno,
            node.end_col_offset or node.col_offset,
        )

    def _reference(self, root: str, attrs: tuple[str, ...], node: ast.expr, kind: RefKind) -> None:
        line, col = self._position or (node.lineno, node.col_offset)
        self._pending.append(
            (self._scope, self._user_id, root, attrs, line, col, self._kind or kind)
        )

    def _chain(self, node: ast.Attribute, kind: RefKind) -> None:
        """Record ``a.b.c`` as one reference rooted at ``a``."""
        attrs: list[str] = []
        current: ast.expr = node
        while isinstance(current, ast.Attribute):
            attrs.append(current.attr)
            current = current.value
        self._attribute_names.update(attrs)
        attrs.reverse()
        if isinstance(current, ast.Name):
            self._reference(current.id, tuple(attrs), current, kind)
        elif (
            isinstance(current, ast.Call)
            and isinstance(current.func, ast.Name)
            and current.func.id == "super"
        ):
            self._reference("super", tuple(attrs), current, kind)
        else:
            source = self._value_source(current)
            if source is not None:
                line, col = self._position or (node.lineno, node.col_offset)
                self._pending_results.append(
                    (self._user_id, source, tuple(attrs), line, col, self._kind or kind)
                )
            self.visit(current)

    def _visit_as(self, kind: RefKind, nodes: list[ast.expr]) -> None:
        previous = self._kind
        self._kind = kind
        for node in nodes:
            self.visit(node)
        self._kind = previous

    def _bump(self, amount: int = 1) -> None:
        if self._complexity:
            self._complexity[-1] += amount

    def _parameters(self, args: ast.arguments) -> list[Parameter]:
        parameters: list[Parameter] = []
        positional = [*args.posonlyargs, *args.args]
        first_default = len(positional) - len(args.defaults)
        for index, arg in enumerate(positional):
            default = args.defaults[index - first_default] if index >= first_default else None
            kind = (
                ParameterKind.POSITIONAL_ONLY
                if index < len(args.posonlyargs)
                else ParameterKind.POSITIONAL
            )
            parameters.append(self._parameter(arg, kind, default))
        if args.vararg is not None:
            parameters.append(self._parameter(args.vararg, ParameterKind.VAR_POSITIONAL, None))
        for arg, default in zip(args.kwonlyargs, args.kw_defaults, strict=True):
            parameters.append(self._parameter(arg, ParameterKind.KEYWORD_ONLY, default))
        if args.kwarg is not None:
            parameters.append(self._parameter(args.kwarg, ParameterKind.VAR_KEYWORD, None))
        return parameters

    @staticmethod
    def _parameter(arg: ast.arg, kind: ParameterKind, default: ast.expr | None) -> Parameter:
        return Parameter(
            name=arg.arg,
            kind=kind,
            type_hint=_expr_text(arg.annotation) if arg.annotation is not None else None,
            default_value=_expr_text(default) if default is not None else None,
        )

    def _visit_signature(self, args: ast.arguments, returns: ast.expr | None) -> None:
        """Visit defaults and annotations, which evaluate in the enclosing scope."""
        for default in [*args.defaults, *args.kw_defaults]:
            if default is not None:
                self.visit(default)
        annotations = [
            arg.annotation
            for arg in [*args.posonlyargs, *args.args, *args.kwonlyargs, args.vararg, args.kwarg]
            if arg is not None and arg.annotation is not None
        ]
        if returns is not None:
            annotations.append(returns)
        self._visit_as(RefKind.ANNOTATION, annotations)

    def _bind_parameters(self, args: ast.arguments) -> None:
        for arg in [*args.posonlyargs, *args.args, *args.kwonlyargs]:
            self._bind(arg.arg, type_source=self._annotation_source(arg.annotation))
        for variadic in (args.vararg, args.kwarg):
            if variadic is not None:
                self._bind(variadic.arg)

    def _annotation_source(self, annotation: ast.expr | None) -> _TypeSource | None:
        chain = _type_chain(annotation) if annotation is not None else None
        if chain is None or self._scope.parent is None:
            return None
        # Annotations are evaluated where the function is defined.
        return (RefKind.ANNOTATION, chain[0], chain[1], self._scope.parent)

    def _value_source(self, value: ast.expr | None) -> _TypeSource | None:
        """``Foo(...)`` or ``make(...)``: the callee may name the value's type."""
        if not isinstance(value, ast.Call):
            return None
        chain = _dotted(value.func)
        if chain is None:
            return None
        return (RefKind.CALL, chain[0], chain[1], self._scope)

    def _record_assignment_type(
        self, target: ast.expr, source: _TypeSource | None
    ) -> tuple[str, _TypeSource] | None:
        """Remember typed ``self.attr`` / class attributes; return a pending local type."""
        scope = self._scope
        if isinstance(target, ast.Name):
            if scope.kind == "class":
                self._merge_attribute(scope.class_id, target.id, source)
            return (target.id, source) if source is not None else None
        if (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and scope.self_name
            and target.value.id == scope.self_name
        ):
            self._merge_attribute(scope.class_id, target.attr, source)
        return None

    def _merge_attribute(self, class_id: str, attr: str, source: _TypeSource | None) -> None:
        _merge_type(self._attribute_sources, (class_id, attr), source)

    # ------------------------------------------------------------- definitions

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self._qualname.append(node.name)
        element_id = self._unique_id("class", node)
        self._bind(node.name, _DEF, element_id)

        parent_id, self._user_id = self._user_id, element_id
        self._visit_as(RefKind.DECORATOR, node.decorator_list)
        for base in node.bases:
            # ``Generic[User]``: only ``Generic`` is a base; ``User`` is a type use.
            if isinstance(base, ast.Subscript):
                self._visit_as(RefKind.BASE, [base.value])
                self._visit_as(RefKind.ANNOTATION, [base.slice])
            else:
                self._visit_as(RefKind.BASE, [base])
        for keyword in node.keywords:
            self.visit(keyword.value)

        self._elements.append(
            CodeElement(
                id=element_id,
                name=node.name,
                qualified_name=".".join(self._qualname),
                type=ElementType.CLASS,
                location=self._location(node),
                parent_id=parent_id,
                docstring=ast.get_docstring(node),
                decorators=[_expr_text(d) for d in node.decorator_list],
                bases=[_expr_text(b) for b in node.bases],
            )
        )

        self._class_lines[element_id] = node.lineno
        scope = _Scope("class", self._scope)
        scope.class_id = element_id
        self._scope = scope
        for statement in node.body:
            self.visit(statement)
        assert scope.parent is not None
        self._scope = scope.parent
        self._user_id = parent_id
        self._qualname.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._function(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._function(node)

    def _function(self, node: _FunctionNode) -> None:
        self._qualname.append(node.name)
        element_id = self._unique_id("function", node)
        self._bind(node.name, _DEF, element_id)
        enclosing = self._scope
        is_method = enclosing.kind == "class"

        parent_id, self._user_id = self._user_id, element_id
        self._visit_as(RefKind.DECORATOR, node.decorator_list)
        self._visit_signature(node.args, node.returns)

        decorators = [_expr_text(d) for d in node.decorator_list]
        element = CodeElement(
            id=element_id,
            name=node.name,
            qualified_name=".".join(self._qualname),
            type=ElementType.FUNCTION,
            location=self._location(node),
            parent_id=parent_id,
            docstring=ast.get_docstring(node),
            parameters=self._parameters(node.args),
            return_type=_expr_text(node.returns) if node.returns is not None else None,
            decorators=decorators,
            is_method=is_method,
            is_async=isinstance(node, ast.AsyncFunctionDef),
        )
        self._elements.append(element)

        returns = _type_chain(node.returns) if node.returns is not None else None
        if returns is not None:
            self._return_sources[element_id] = (
                RefKind.ANNOTATION,
                returns[0],
                returns[1],
                enclosing,
            )

        scope = _Scope("function", enclosing)
        self._scope = scope
        self._bind_parameters(node.args)
        positional = [*node.args.posonlyargs, *node.args.args]
        if is_method and positional and "staticmethod" not in decorators:
            scope.self_name = positional[0].arg
            scope.class_id = enclosing.class_id

        self._complexity.append(1)
        for statement in node.body:
            self.visit(statement)
        element.complexity = self._complexity.pop()

        self._scope = enclosing
        self._user_id = parent_id
        self._qualname.pop()

    def visit_Lambda(self, node: ast.Lambda) -> None:
        self._visit_signature(node.args, None)
        scope = _Scope("function", self._scope)
        self._scope = scope
        self._bind_parameters(node.args)
        self.visit(node.body)
        assert scope.parent is not None
        self._scope = scope.parent

    def _comprehension(self, node: _Comprehension) -> None:
        scope = _Scope("function", self._scope)
        self._scope = scope
        for generator in node.generators:
            self._bump(1 + len(generator.ifs))
            self.visit(generator.iter)
            self.visit(generator.target)
            for condition in generator.ifs:
                self.visit(condition)
        if isinstance(node, ast.DictComp):
            self.visit(node.key)
            self.visit(node.value)
        else:
            self.visit(node.elt)
        assert scope.parent is not None
        self._scope = scope.parent

    def visit_ListComp(self, node: ast.ListComp) -> None:
        self._comprehension(node)

    def visit_SetComp(self, node: ast.SetComp) -> None:
        self._comprehension(node)

    def visit_DictComp(self, node: ast.DictComp) -> None:
        self._comprehension(node)

    def visit_GeneratorExp(self, node: ast.GeneratorExp) -> None:
        self._comprehension(node)

    # ----------------------------------------------------------------- imports

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            local_name = alias.asname or alias.name.split(".", 1)[0]
            self._add_import(local_name, alias.name, None, 0, node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        module = node.module or ""
        if module == "__future__":
            return
        for alias in node.names:
            if alias.name == "*":
                self._add_import("*", module, None, node.level, node, is_star=True)
            else:
                self._add_import(alias.asname or alias.name, module, alias.name, node.level, node)

    def _add_import(
        self,
        local_name: str,
        module: str,
        name: str | None,
        level: int,
        node: ast.stmt,
        *,
        is_star: bool = False,
    ) -> None:
        index = len(self._imports)
        self._imports.append(
            ImportBinding(
                local_name=local_name,
                module=module,
                name=name,
                level=level,
                line=node.lineno,
                col=node.col_offset,
                scope_id=self._user_id,
                is_star=is_star,
            )
        )
        if not is_star:
            self._bind(local_name, _IMPORT, "", index)

    # -------------------------------------------------------------- references

    def visit_Name(self, node: ast.Name) -> None:
        if isinstance(node.ctx, ast.Load):
            self._reference(node.id, (), node, RefKind.NAME)
        elif isinstance(node.ctx, ast.Store):
            self._bind(node.id)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if isinstance(node.ctx, ast.Load):
            self._chain(node, RefKind.NAME)
        else:
            self._attribute_names.add(node.attr)
            self.visit(node.value)

    def visit_Call(self, node: ast.Call) -> None:
        func = node.func
        if isinstance(func, ast.Name):
            self._reference(func.id, (), func, RefKind.CALL)
        elif isinstance(func, ast.Attribute):
            self._chain(func, RefKind.CALL)
        else:
            self.visit(func)
        for argument in node.args:
            self.visit(argument)
        for keyword in node.keywords:
            self.visit(keyword.value)

    def visit_Constant(self, node: ast.Constant) -> None:
        """Parse string annotations such as ``x: "Foo"`` so they count as references."""
        value = node.value
        if (
            self._kind is not RefKind.ANNOTATION
            or self._position is not None
            or not isinstance(value, str)
            or len(value) > _MAX_STRING_ANNOTATION
        ):
            return
        try:
            parsed = ast.parse(value.strip(), mode="eval")
        except (SyntaxError, ValueError, RecursionError):
            return
        self._position = (node.lineno, node.col_offset)
        self.visit(parsed.body)
        self._position = None

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        self._visit_as(RefKind.ANNOTATION, [node.annotation])
        if node.value is not None:
            self.visit(node.value)
            self._collect_exports(node.target, node.value, extend=False)
        chain = _type_chain(node.annotation)
        source: _TypeSource | None = (
            (RefKind.ANNOTATION, chain[0], chain[1], self._scope)
            if chain is not None
            else self._value_source(node.value)
        )
        self._visit_target(node.target, source)

    def visit_Assign(self, node: ast.Assign) -> None:
        self.visit(node.value)
        source = self._value_source(node.value)
        for target in node.targets:
            self._visit_target(target, source)
            self._collect_exports(target, node.value, extend=False)

    def _visit_target(self, target: ast.expr, source: _TypeSource | None) -> None:
        previous = self._pending_type
        self._pending_type = self._record_assignment_type(target, source)
        self.visit(target)
        self._pending_type = previous

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        self.visit(node.value)
        self.visit(node.target)
        self._collect_exports(node.target, node.value, extend=True)

    def _collect_exports(self, target: ast.expr, value: ast.expr, *, extend: bool) -> None:
        """Track string literals assigned to a module-level ``__all__``."""
        if (
            self._scope is not self._module_scope
            or not isinstance(target, ast.Name)
            or target.id != "__all__"
            or not isinstance(value, (ast.List, ast.Tuple, ast.Set))
        ):
            return
        names = [
            element.value
            for element in value.elts
            if isinstance(element, ast.Constant) and isinstance(element.value, str)
        ]
        if extend and self._exports is not None:
            self._exports.extend(names)
        else:
            self._exports = names

    # ------------------------------------------------------- bindings and flow

    def visit_Global(self, node: ast.Global) -> None:
        self._scope.global_names.update(node.names)

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        self._bump()
        if node.name:
            self._bind(node.name)
        self.generic_visit(node)

    def visit_MatchAs(self, node: ast.MatchAs) -> None:
        if node.name:
            self._bind(node.name)
        self.generic_visit(node)

    def visit_MatchStar(self, node: ast.MatchStar) -> None:
        if node.name:
            self._bind(node.name)

    def visit_MatchMapping(self, node: ast.MatchMapping) -> None:
        if node.rest:
            self._bind(node.rest)
        self.generic_visit(node)

    def visit_match_case(self, node: ast.match_case) -> None:
        self._bump()
        self.generic_visit(node)

    def visit_If(self, node: ast.If) -> None:
        self._bump()
        self.generic_visit(node)

    def visit_For(self, node: ast.For) -> None:
        self._bump()
        self.generic_visit(node)

    def visit_AsyncFor(self, node: ast.AsyncFor) -> None:
        self._bump()
        self.generic_visit(node)

    def visit_While(self, node: ast.While) -> None:
        self._bump()
        self.generic_visit(node)

    def visit_IfExp(self, node: ast.IfExp) -> None:
        self._bump()
        self.generic_visit(node)

    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        self._bump(len(node.values) - 1)
        self.generic_visit(node)
