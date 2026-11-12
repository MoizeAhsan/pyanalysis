"""Cross-file resolution: turns per-file records into project-wide relationships.

The resolver maps import statements to project modules, then follows each
recorded reference through the importing file's own bindings to the element it
denotes. A usage is recorded only when a name is actually bound to that
element; attribute access on values of unknown type is never guessed at.

Everything here is dictionary lookups over data already in memory, so
resolution is linear in the number of references.
"""

from __future__ import annotations

import sys
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from typing import Final

from pyanalyzer.models.core import CodeElement, ElementType, SourceLocation, Usage, UsageType
from pyanalyzer.models.records import FileRecord, ImportBinding, Reference, RefKind, TargetKind
from pyanalyzer.parsers.extractor import module_id

_MAX_REEXPORT_DEPTH: Final = 8

_USAGE_TYPE: Final = {
    RefKind.CALL: UsageType.CALL,
    RefKind.NAME: UsageType.REFERENCE,
    RefKind.BASE: UsageType.INHERITANCE,
    RefKind.ANNOTATION: UsageType.TYPE_HINT,
    RefKind.DECORATOR: UsageType.DECORATOR,
}


@dataclass(slots=True)
class Resolution:
    """Project-wide relationships derived from all file records."""

    elements: dict[str, CodeElement] = field(default_factory=dict)
    children: dict[str, list[str]] = field(default_factory=dict)
    usages: dict[str, list[Usage]] = field(default_factory=dict)
    dependencies: dict[str, list[str]] = field(default_factory=dict)
    class_bases: dict[str, list[str]] = field(default_factory=dict)
    external_packages: dict[str, int] = field(default_factory=dict)
    stdlib_modules: dict[str, int] = field(default_factory=dict)
    #: ``(file, local name)`` of imports that another module reached through.
    reexported: set[tuple[str, str]] = field(default_factory=set)


class ModuleIndex:
    """Maps dotted module names and relative imports to project files."""

    def __init__(self, rel_paths: Iterable[str], root_name: str | None = None) -> None:
        """Index ``rel_paths``.

        ``root_name`` is the name of the project directory. It matters only when
        that directory is itself a package (it contains ``__init__.py``): its
        modules are then imported as ``<root_name>.<module>``.
        """
        self._paths = set(rel_paths)
        package_dirs = {
            path.rpartition("/")[0] for path in self._paths if path.endswith("__init__.py")
        }
        root_is_package = bool(root_name) and "" in package_dirs
        self._by_name: dict[str, list[str]] = defaultdict(list)
        self.names: dict[str, str] = {}

        for path in sorted(self._paths):
            parts = path.removesuffix(".py").split("/")
            is_package = parts[-1] == "__init__"
            directories = parts[:-1]
            # The importable name starts at the outermost directory that is a package.
            top = len(directories)
            while top > 0 and "/".join(directories[:top]) in package_dirs:
                top -= 1
            anchored_parts = directories[top:] if is_package else [*directories[top:], parts[-1]]
            if top == 0 and root_is_package and root_name:
                anchored_parts = [root_name, *anchored_parts]
            path_parts = directories if is_package else parts
            anchored = ".".join(anchored_parts)
            from_root = ".".join(path_parts)
            self.names[path] = anchored or from_root or parts[-1]
            for name in {anchored, from_root}:
                if name:
                    self._by_name[name].append(path)

    def __contains__(self, rel_path: str) -> bool:
        return rel_path in self._paths

    def absolute(self, dotted: str, importer: str) -> str | None:
        """File for an absolute module name, preferring the one nearest the importer."""
        candidates = self._by_name.get(dotted)
        if not candidates:
            return None
        importer_dirs = importer.split("/")[:-1]
        if dotted.partition(".")[0] in sys.stdlib_module_names:
            # A project file only shadows the standard library for its own directory.
            candidates = [c for c in candidates if c.split("/")[:-1] == importer_dirs]
            if not candidates:
                return None
        if len(candidates) == 1:
            return candidates[0]

        def closeness(candidate: str) -> tuple[int, int, str]:
            shared = 0
            for ours, theirs in zip(importer_dirs, candidate.split("/")[:-1], strict=False):
                if ours != theirs:
                    break
                shared += 1
            return (-shared, candidate.count("/"), candidate)

        return min(candidates, key=closeness)

    def relative(self, importer: str, level: int, parts: Sequence[str]) -> str | None:
        """File for ``from <level dots><parts> import ...`` written in ``importer``."""
        base = importer.split("/")[:-1]
        if level - 1 > len(base):
            return None
        if level > 1:
            base = base[: len(base) - (level - 1)]
        return self.at_path([*base, *parts])

    def at_path(self, parts: Sequence[str]) -> str | None:
        """File for a module or package located at the given directory parts."""
        if not parts:
            return "__init__.py" if "__init__.py" in self._paths else None
        stem = "/".join(parts)
        for candidate in (f"{stem}.py", f"{stem}/__init__.py"):
            if candidate in self._paths:
                return candidate
        return None


class _Resolver:
    def __init__(self, records: Sequence[FileRecord], root_name: str | None) -> None:
        self._records = records
        self._index = ModuleIndex((record.rel_path for record in records), root_name)
        self._elements: dict[str, CodeElement] = {}
        self._members: dict[str, dict[str, str]] = defaultdict(dict)
        self._children: dict[str, list[str]] = defaultdict(list)
        self._bindings: dict[str, dict[str, ImportBinding]] = {}
        self._stars: dict[str, list[ImportBinding]] = {}
        self._usages: dict[str, list[Usage]] = defaultdict(list)
        self._dependencies: dict[str, set[str]] = defaultdict(set)
        self._class_bases: dict[str, list[str]] = defaultdict(list)
        self._externals: Counter[str] = Counter()
        self._stdlib: Counter[str] = Counter()
        self._reexported: set[tuple[str, str]] = set()
        self._chain_cache: dict[tuple[str, int, tuple[str, ...]], str | None] = {}

    # ------------------------------------------------------------------ driver

    def run(self) -> Resolution:
        self._index_elements()
        # Bases first: member lookup on a class needs its ancestors resolved.
        for record in self._records:
            for reference in record.references:
                if reference.kind is RefKind.BASE:
                    self._record_reference(record, reference)
        for record in self._records:
            self._record_imports(record)
            for reference in record.references:
                if reference.kind is not RefKind.BASE:
                    self._record_reference(record, reference)

        return Resolution(
            elements=self._elements,
            children=dict(self._children),
            usages=dict(self._usages),
            dependencies={key: sorted(value) for key, value in self._dependencies.items()},
            class_bases=dict(self._class_bases),
            external_packages=dict(self._externals.most_common()),
            stdlib_modules=dict(self._stdlib.most_common()),
            reexported=self._reexported,
        )

    def _index_elements(self) -> None:
        for record in self._records:
            own_module = module_id(record.rel_path)
            for element in record.elements:
                self._elements[element.id] = element
                if element.type is ElementType.MODULE:
                    element.qualified_name = self._index.names[record.rel_path]
                if element.parent_id is not None:
                    self._children[element.parent_id].append(element.id)
                    self._members[element.parent_id].setdefault(element.name, element.id)
            self._bindings[record.rel_path] = {
                binding.local_name: binding
                for binding in record.imports
                if not binding.is_star and binding.scope_id == own_module
            }
            self._stars[record.rel_path] = [
                binding
                for binding in record.imports
                if binding.is_star and binding.scope_id == own_module
            ]

    # ----------------------------------------------------------------- imports

    @staticmethod
    def _binding_parts(binding: ImportBinding, *, statement: bool) -> tuple[str, ...]:
        """Dotted parts a binding denotes.

        ``import a.b`` binds only ``a`` for later references, although the
        statement itself imports ``a.b``; ``statement`` selects which is meant.
        """
        module_parts = tuple(binding.module.split(".")) if binding.module else ()
        if binding.name is not None:
            return (*module_parts, binding.name)
        if statement or binding.local_name != module_parts[0]:
            return module_parts
        return module_parts[:1]

    def _record_imports(self, record: FileRecord) -> None:
        own_module = module_id(record.rel_path)
        seen_external: set[str] = set()
        for binding in record.imports:
            parts = self._binding_parts(binding, statement=True)
            target = self._resolve_chain(record.rel_path, binding.level, parts)
            if target is None:
                if binding.level == 0 and parts and parts[0] not in seen_external:
                    seen_external.add(parts[0])
                    counter = (
                        self._stdlib if parts[0] in sys.stdlib_module_names else self._externals
                    )
                    counter[parts[0]] += 1
                continue
            if target == own_module:
                continue
            self._add_usage(
                target,
                Usage(
                    location=SourceLocation(record.rel_path, binding.line, binding.col),
                    context=_import_text(binding),
                    usage_type=UsageType.IMPORT,
                    used_by=binding.scope_id,
                ),
            )

    # -------------------------------------------------------------- references

    def _record_reference(self, record: FileRecord, reference: Reference) -> None:
        target = self._resolve_reference(record, reference)
        if target is None or target == reference.scope_id:
            return
        usage_type = _USAGE_TYPE[reference.kind]
        if reference.kind is RefKind.BASE:
            if self._elements[target].type is ElementType.CLASS:
                self._class_bases[reference.scope_id].append(target)
            else:
                usage_type = UsageType.REFERENCE
        self._add_usage(
            target,
            Usage(
                location=SourceLocation(record.rel_path, reference.line, reference.col),
                context=reference.context,
                usage_type=usage_type,
                used_by=reference.scope_id,
            ),
        )

    def _add_usage(self, target: str, usage: Usage) -> None:
        self._usages[target].append(usage)
        self._dependencies[usage.used_by].add(target)

    def _resolve_reference(self, record: FileRecord, reference: Reference) -> str | None:
        kind = reference.target_kind
        if kind is TargetKind.LOCAL:
            return self._descend(reference.target_id, reference.attrs, 0)
        if kind is TargetKind.IMPORT:
            binding = record.imports[reference.import_index]
            parts = (*self._binding_parts(binding, statement=False), *reference.attrs)
            target = self._resolve_chain(record.rel_path, binding.level, parts)
            # A bare mention of an imported module is covered by the import usage.
            if target is not None and not reference.attrs and binding.name is None:
                return None
            return target
        if kind is TargetKind.SELF:
            return self._class_member(
                reference.target_id, reference.attrs[0], skip_own=reference.name == "super"
            )
        for star in self._stars.get(record.rel_path, ()):
            module = self._resolve_chain(
                record.rel_path, star.level, self._binding_parts(star, statement=True)
            )
            if module is None:
                continue
            member = self._member(module, reference.name, 1)
            if member is not None:
                return self._descend(member, reference.attrs, 1)
        return None

    def _resolve_chain(self, importer: str, level: int, parts: tuple[str, ...]) -> str | None:
        """Element denoted by a dotted chain as seen from ``importer``."""
        key = (importer, level, parts)
        if key in self._chain_cache:
            return self._chain_cache[key]
        self._chain_cache[key] = None  # guards against import cycles while resolving
        result = self._resolve_chain_uncached(importer, level, parts, 0)
        self._chain_cache[key] = result
        return result

    def _resolve_chain_uncached(
        self, importer: str, level: int, parts: tuple[str, ...], depth: int
    ) -> str | None:
        for split in range(len(parts), -1, -1):
            if level:
                path = self._index.relative(importer, level, parts[:split])
            elif split:
                path = self._index.absolute(".".join(parts[:split]), importer)
            else:
                path = None
            if path is not None:
                return self._descend(module_id(path), parts[split:], depth)
        return None

    def _descend(self, element_id: str, attrs: Sequence[str], depth: int) -> str:
        """Follow attribute names from an element as far as they resolve."""
        current = element_id
        for attr in attrs:
            member = self._member(current, attr, depth)
            if member is None:
                break
            current = member
        return current

    def _member(self, element_id: str, name: str, depth: int) -> str | None:
        direct = self._members.get(element_id, {}).get(name)
        if direct is not None:
            return direct
        element = self._elements[element_id]
        if element.type is ElementType.CLASS:
            return self._class_member(element_id, name, skip_own=True)
        if element.type is not ElementType.MODULE or depth >= _MAX_REEXPORT_DEPTH:
            return None

        # Not defined in the module: a submodule, a re-export, or a star import.
        rel_path = element.location.file_path
        if rel_path.endswith("__init__.py"):
            submodule = self._index.at_path([*rel_path.split("/")[:-1], name])
            if submodule is not None:
                return module_id(submodule)
        binding = self._bindings.get(rel_path, {}).get(name)
        if binding is not None:
            self._reexported.add((rel_path, name))
            parts = self._binding_parts(binding, statement=False)
            return self._resolve_chain_uncached(rel_path, binding.level, parts, depth + 1)
        for star in self._stars.get(rel_path, ()):
            parts = self._binding_parts(star, statement=True)
            module = self._resolve_chain_uncached(rel_path, star.level, parts, depth + 1)
            if module is not None and module != element_id:
                member = self._member(module, name, depth + 1)
                if member is not None:
                    return member
        return None

    def _class_member(self, class_id: str, name: str, *, skip_own: bool) -> str | None:
        """Find ``name`` on a class or, breadth-first, on its resolved ancestors."""
        seen = {class_id}
        queue = [class_id]
        position = 0
        while position < len(queue):
            current = queue[position]
            position += 1
            if not (skip_own and current == class_id):
                member = self._members.get(current, {}).get(name)
                if member is not None:
                    return member
            for base in self._class_bases.get(current, ()):
                if base not in seen:
                    seen.add(base)
                    queue.append(base)
        return None


def _import_text(binding: ImportBinding) -> str:
    """Reconstruct the import statement for display."""
    if binding.name is None and not binding.is_star:
        alias = "" if binding.local_name == binding.module.split(".")[0] else binding.local_name
        suffix = f" as {alias}" if alias and alias != binding.module else ""
        return f"import {binding.module}{suffix}"
    imported = "*" if binding.is_star else binding.name
    suffix = (
        "" if binding.is_star or binding.local_name == imported else f" as {binding.local_name}"
    )
    return f"from {'.' * binding.level}{binding.module} import {imported}{suffix}"


def resolve(records: Sequence[FileRecord], root_name: str | None = None) -> Resolution:
    """Resolve all cross-file relationships for a set of file records.

    ``root_name`` is the project directory's name; see :class:`ModuleIndex`.
    """
    return _Resolver(records, root_name).run()
