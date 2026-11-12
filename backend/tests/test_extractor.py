"""Unit tests for single-file extraction."""

from __future__ import annotations

import textwrap

from pyanalyzer.models.core import ElementType, ParameterKind
from pyanalyzer.models.records import FileRecord, RefKind, TargetKind
from pyanalyzer.parsers.extractor import dotted_module_name, extract_file, extract_source


def extract(source: str, rel_path: str = "pkg/mod.py") -> FileRecord:
    return extract_source(textwrap.dedent(source).encode(), rel_path)


def refs(record: FileRecord) -> set[tuple[str, str, str, tuple[str, ...], str]]:
    """(kind, target kind, root name, attrs, user qualname) for every reference."""
    return {
        (r.kind.value, r.target_kind.value, r.name, r.attrs, r.scope_id.rpartition(":")[2])
        for r in record.references
    }


def test_dotted_module_name() -> None:
    assert dotted_module_name("pkg/sub/mod.py") == "pkg.sub.mod"
    assert dotted_module_name("pkg/__init__.py") == "pkg"
    assert dotted_module_name("script.py") == "script"
    assert dotted_module_name("__init__.py") == "__init__"


def test_module_element_is_always_first() -> None:
    record = extract('"""Module doc."""\nX = 1\n')

    module = record.elements[0]
    assert (module.id, module.name, module.type) == ("module:pkg/mod.py", "mod", ElementType.MODULE)
    assert module.docstring == "Module doc."
    assert record.line_count == 2
    assert record.error is None


def test_nested_definitions_have_qualified_ids_and_parents() -> None:
    record = extract(
        """
        class Outer:
            class Inner:
                def method(self): ...
            async def run(self): ...

        def top():
            def helper(): ...
        """
    )

    by_id = {e.id: e for e in record.elements}
    assert set(by_id) == {
        "module:pkg/mod.py",
        "class:pkg/mod.py:Outer",
        "class:pkg/mod.py:Outer.Inner",
        "function:pkg/mod.py:Outer.Inner.method",
        "function:pkg/mod.py:Outer.run",
        "function:pkg/mod.py:top",
        "function:pkg/mod.py:top.helper",
    }
    method = by_id["function:pkg/mod.py:Outer.Inner.method"]
    assert method.parent_id == "class:pkg/mod.py:Outer.Inner"
    assert method.is_method is True
    assert by_id["function:pkg/mod.py:Outer.run"].is_async is True
    helper = by_id["function:pkg/mod.py:top.helper"]
    assert (helper.parent_id, helper.is_method) == ("function:pkg/mod.py:top", False)
    assert by_id["class:pkg/mod.py:Outer"].parent_id == "module:pkg/mod.py"


def test_redefinitions_keep_unique_ids() -> None:
    record = extract(
        """
        class Box:
            @property
            def value(self): ...
            @value.setter
            def value(self, new): ...
        """
    )

    ids = [e.id for e in record.elements if e.name == "value"]
    assert ids == ["function:pkg/mod.py:Box.value", "function:pkg/mod.py:Box.value@6"]


def test_all_parameter_kinds_are_captured() -> None:
    record = extract("def f(a, /, b: int = 2, *args: str, c, d: 'X' = None, **kw): ...\n")

    parameters = record.elements[1].parameters
    assert [(p.name, p.kind, p.type_hint, p.default_value) for p in parameters] == [
        ("a", ParameterKind.POSITIONAL_ONLY, None, None),
        ("b", ParameterKind.POSITIONAL, "int", "2"),
        ("args", ParameterKind.VAR_POSITIONAL, "str", None),
        ("c", ParameterKind.KEYWORD_ONLY, None, None),
        ("d", ParameterKind.KEYWORD_ONLY, "'X'", "None"),
        ("kw", ParameterKind.VAR_KEYWORD, None, None),
    ]


def test_complex_annotations_and_defaults_are_rendered_as_source() -> None:
    record = extract("def f(x: dict[str, list[int]] | None = {'a': [1]}) -> tuple[int, ...]: ...\n")

    function = record.elements[1]
    assert function.parameters[0].type_hint == "dict[str, list[int]] | None"
    assert function.parameters[0].default_value == "{'a': [1]}"
    assert function.return_type == "tuple[int, ...]"


def test_class_bases_and_decorators_are_recorded() -> None:
    record = extract(
        """
        import abc, dataclasses

        @dataclasses.dataclass(frozen=True)
        class Point(abc.ABC, metaclass=abc.ABCMeta):
            pass
        """
    )

    point = record.elements[1]
    assert point.bases == ["abc.ABC"]
    assert point.decorators == ["dataclasses.dataclass(frozen=True)"]


def test_cyclomatic_complexity_counts_branches() -> None:
    record = extract(
        """
        def simple():
            return 1

        def branchy(items, flag):
            for item in items:
                if item and flag or item is None:
                    continue
            while flag:
                flag = False
            try:
                pass
            except ValueError:
                pass
            return [i for i in items if i] if items else None
        """
    )

    complexity = {e.name: e.complexity for e in record.elements}
    assert complexity["simple"] == 1
    # 1 + for + if + (and, or) + while + except + comprehension (for, if) + ternary
    assert complexity["branchy"] == 10


def test_nested_function_complexity_is_not_charged_to_its_parent() -> None:
    record = extract(
        """
        def outer(x):
            def inner(y):
                if y:
                    return 1
                return 2
            return inner
        """
    )

    complexity = {e.name: e.complexity for e in record.elements}
    assert (complexity["outer"], complexity["inner"]) == (1, 2)


def test_import_forms_are_bound_and_marked_used_or_unused() -> None:
    record = extract(
        """
        from __future__ import annotations
        import os.path
        import json as j
        import unused_module
        from . import sibling
        from ..core import Base as B, helper
        from typing import Any  # noqa: F401

        print(os.path.sep, j.dumps({}), sibling, B)
        """
    )

    imports = {b.local_name: b for b in record.imports}
    assert set(imports) == {"os", "j", "unused_module", "sibling", "B", "helper", "Any"}
    assert (imports["os"].module, imports["os"].name, imports["os"].level) == ("os.path", None, 0)
    assert (imports["j"].module, imports["j"].name) == ("json", None)
    assert (imports["sibling"].module, imports["sibling"].name, imports["sibling"].level) == (
        "",
        "sibling",
        1,
    )
    assert (imports["B"].module, imports["B"].name, imports["B"].level) == ("core", "Base", 2)
    assert {name for name, b in imports.items() if not b.used} == {"unused_module", "helper", "Any"}
    assert {name for name, b in imports.items() if b.suppressed} == {"Any"}


def test_names_listed_in_dunder_all_count_as_used() -> None:
    record = extract(
        """
        from .core import Engine, Wheel
        __all__ = ["Engine"]
        __all__ += ["Wheel"]
        """
    )

    assert record.exports == ["Engine", "Wheel"]
    assert all(binding.used for binding in record.imports)


def test_reference_kinds() -> None:
    record = extract(
        """
        from lib import Base, deco, Thing, make

        @deco
        class Child(Base):
            field: Thing

            def build(self, other: "Thing") -> Thing:
                return make(Thing)
        """
    )

    assert refs(record) == {
        ("decorator", "import", "deco", (), "Child"),
        ("base", "import", "Base", (), "Child"),
        ("annotation", "import", "Thing", (), "Child"),
        ("annotation", "import", "Thing", (), "Child.build"),
        ("call", "import", "make", (), "Child.build"),
        ("name", "import", "Thing", (), "Child.build"),
    }
    annotations = [r for r in record.references if r.kind is RefKind.ANNOTATION]
    assert sorted(r.line for r in annotations) == [6, 8, 8]


def test_attribute_chains_are_one_reference_rooted_at_the_bound_name() -> None:
    record = extract(
        """
        import os.path
        import numpy as np

        value = np.linalg.norm(os.path.join("a", "b"))
        """
    )

    assert refs(record) == {
        ("call", "import", "np", ("linalg", "norm"), "pkg/mod.py"),
        ("call", "import", "os", ("path", "join"), "pkg/mod.py"),
    }
    assert record.attribute_names == ["join", "linalg", "norm", "path"]


def test_local_variables_parameters_and_builtins_are_not_references() -> None:
    record = extract(
        """
        from lib import helper

        def run(helper_arg, data):
            local = len(data)
            for item in data:
                print(item, local, helper_arg)
            return [x for x in data]
        """
    )

    assert record.references == []
    assert record.imports[0].used is False


def test_a_parameter_shadows_an_import_of_the_same_name() -> None:
    record = extract(
        """
        from lib import config

        def shadowed(config):
            return config.value

        def direct():
            return config.value
        """
    )

    assert refs(record) == {("name", "import", "config", ("value",), "direct")}


def test_class_body_names_are_not_visible_inside_methods() -> None:
    record = extract(
        """
        from lib import helper as outer_helper

        class Tool:
            def helper(self): ...

            def run(self):
                return helper()

            alias = helper
        """
    )

    # ``helper()`` inside ``run`` is a global lookup that finds nothing; the
    # class-body assignment does see the method defined just above it.
    assert refs(record) == {("name", "local", "helper", (), "Tool")}


def test_global_declaration_binds_at_module_level() -> None:
    record = extract(
        """
        from lib import factory

        def configure():
            global factory
            factory = None

        def use():
            return factory()
        """
    )

    assert refs(record) == {("call", "import", "factory", (), "use")}


def test_self_and_super_references_point_at_the_enclosing_class() -> None:
    record = extract(
        """
        class Service:
            def start(self):
                self.prepare()
                super().start()
                return self.name

            @classmethod
            def create(cls):
                return cls.build()

            @staticmethod
            def static(value):
                return value.prepare()
        """
    )

    self_refs = {
        (r.name, r.attrs, r.scope_id.rpartition(":")[2], r.target_id)
        for r in record.references
        if r.target_kind is TargetKind.SELF
    }
    assert self_refs == {
        ("self", ("prepare",), "Service.start", "class:pkg/mod.py:Service"),
        ("super", ("start",), "Service.start", "class:pkg/mod.py:Service"),
        ("self", ("name",), "Service.start", "class:pkg/mod.py:Service"),
        ("cls", ("build",), "Service.create", "class:pkg/mod.py:Service"),
    }


def test_same_file_definitions_resolve_locally_even_when_defined_later() -> None:
    record = extract(
        """
        def first():
            return second()

        def second():
            return Helper.build()

        class Helper:
            @staticmethod
            def build(): ...
        """
    )

    assert {
        (r.name, r.attrs, r.target_id, r.scope_id.rpartition(":")[2]) for r in record.references
    } == {
        ("second", (), "function:pkg/mod.py:second", "first"),
        ("Helper", ("build",), "class:pkg/mod.py:Helper", "second"),
    }


def test_unbound_names_are_kept_only_when_a_star_import_could_supply_them() -> None:
    without_star = extract("value = mystery()\n")
    with_star = extract("from lib import *\nvalue = mystery(len([]))\n")

    assert without_star.references == []
    assert refs(with_star) == {("call", "unbound", "mystery", (), "pkg/mod.py")}


def test_reference_context_is_the_trimmed_source_line() -> None:
    record = extract("from lib import run\n\nif True:\n        result = run(1, 2)   \n")

    assert [(r.line, r.context) for r in record.references] == [(4, "result = run(1, 2)")]


def test_syntax_error_yields_a_module_only_record_with_the_reason() -> None:
    record = extract("def broken(:\n    pass\n")

    assert [e.type for e in record.elements] == [ElementType.MODULE]
    assert record.error is not None
    assert record.error.startswith("syntax error at line 1")
    assert record.line_count == 2


def test_undecodable_bytes_are_reported_not_raised() -> None:
    record = extract_source(b"x = '\xff\xfe'\n", "bad.py")

    assert record.error is not None
    assert record.error.startswith("encoding error")
    assert [e.id for e in record.elements] == ["module:bad.py"]


def test_unknown_encoding_cookie_is_reported() -> None:
    record = extract_source(b"# -*- coding: not-a-codec -*-\nx = 1\n", "bad.py")

    assert record.error is not None
    assert record.error.startswith("encoding error")


def test_null_bytes_are_reported() -> None:
    record = extract_source(b"x = 1\x00\n", "bad.py")

    assert record.error is not None


def test_utf8_bom_is_accepted() -> None:
    record = extract_source(b"\xef\xbb\xbfdef f(): ...\n", "bom.py")

    assert record.error is None
    assert [e.name for e in record.elements] == ["bom", "f"]


def test_invalid_escape_sequences_do_not_emit_warnings() -> None:
    record = extract_source(b"pattern = '\\d+'\n", "warn.py")

    assert record.error is None


def test_deeply_nested_source_is_reported_not_raised() -> None:
    record = extract_source(("x = " + "(" * 5000 + "1" + ")" * 5000 + "\n").encode(), "deep.py")

    assert record.error is not None
    assert [e.id for e in record.elements] == ["module:deep.py"]


def test_missing_file_is_reported(tmp_path: object) -> None:
    record = extract_file(str(tmp_path), "nope.py")

    assert record.error is not None
    assert record.error.startswith("unreadable")
    assert [e.id for e in record.elements] == ["module:nope.py"]


def test_match_statement_captures_are_local() -> None:
    record = extract(
        """
        from lib import point

        def describe(value):
            match value:
                case {"x": x, **rest}:
                    return x, rest
                case [first, *others]:
                    return first, others
                case point as captured:
                    return captured
        """
    )

    assert record.references == []


def test_lambda_and_comprehension_variables_are_local() -> None:
    record = extract(
        """
        from lib import item, scale

        key = lambda item: item.weight
        total = sum(scale(item) for item in [])
        """
    )

    assert refs(record) == {("call", "import", "scale", (), "pkg/mod.py")}
