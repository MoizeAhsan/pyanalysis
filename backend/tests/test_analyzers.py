"""Tests for the inheritance and quality analyzers."""

from __future__ import annotations

from collections.abc import Mapping

from pyanalyzer.analysis.pipeline import AnalysisResult
from pyanalyzer.analyzers.quality_analyzer import (
    IssueKind,
    QualityThresholds,
    Severity,
    is_test_file,
)
from tests.conftest import Analyze, ProjectFactory


def issues_of(result: AnalysisResult, kind: IssueKind) -> list[tuple[str, int, str]]:
    return [(i.file_path, i.line, i.message) for i in result.issues if i.kind is kind]


def dead(analyze: Analyze, files: Mapping[str, str]) -> set[str]:
    """Element ids reported as dead-code candidates."""
    return {
        issue.element_id or ""
        for issue in analyze(files).issues
        if issue.kind is IssueKind.DEAD_CODE
    }


# ---------------------------------------------------------------- inheritance

HIERARCHY = {
    "shapes.py": """
        import abc

        class Shape(abc.ABC):
            def area(self): ...
            def describe(self): ...

        class Polygon(Shape):
            def area(self): ...
            def sides(self): ...

        class Square(Polygon):
            def area(self): ...

        class Circle(Shape):
            def describe(self): ...
    """
}


def test_bases_subclasses_and_closures(analyze: Analyze) -> None:
    hierarchy = analyze(HIERARCHY).hierarchy
    shape, polygon, square, circle = (
        f"class:shapes.py:{name}" for name in ("Shape", "Polygon", "Square", "Circle")
    )

    assert hierarchy.bases == {polygon: [shape], square: [polygon], circle: [shape]}
    assert hierarchy.subclasses == {shape: [polygon, circle], polygon: [square]}
    assert hierarchy.ancestors(square) == [polygon, shape]
    assert hierarchy.descendants(shape) == [polygon, circle, square]
    assert hierarchy.ancestors(shape) == []


def test_overrides_point_at_the_nearest_ancestor_definition(analyze: Analyze) -> None:
    hierarchy = analyze(HIERARCHY).hierarchy

    def method(name: str) -> str:
        return f"function:shapes.py:{name}"

    assert hierarchy.overrides == {
        method("Polygon.area"): method("Shape.area"),
        method("Square.area"): method("Polygon.area"),
        method("Circle.describe"): method("Shape.describe"),
    }
    assert hierarchy.overridden_by == {
        method("Shape.area"): [method("Polygon.area")],
        method("Polygon.area"): [method("Square.area")],
        method("Shape.describe"): [method("Circle.describe")],
    }


def test_external_bases_are_listed_separately(analyze: Analyze) -> None:
    hierarchy = analyze(
        {
            "m.py": """
                import threading
                from typing import Generic, TypeVar

                T = TypeVar("T")

                class Local: ...
                class Worker(threading.Thread, Local): ...
                class Box(Local, Generic[T]): ...
            """
        }
    ).hierarchy

    assert hierarchy.external_bases == {
        "class:m.py:Worker": ["threading.Thread"],
        "class:m.py:Box": ["Generic[T]"],
    }
    assert hierarchy.bases["class:m.py:Worker"] == ["class:m.py:Local"]


def test_inheritance_cycles_do_not_hang(analyze: Analyze) -> None:
    result = analyze(
        {
            "a.py": "from b import B\nclass A(B):\n    def run(self): ...\n",
            "b.py": "from a import A\nclass B(A):\n    def run(self): ...\n",
        }
    )

    assert result.hierarchy.ancestors("class:a.py:A") == ["class:b.py:B"]
    assert result.hierarchy.descendants("class:a.py:A") == ["class:b.py:B"]


# ------------------------------------------------------------- unused imports


def test_unused_imports_are_reported_with_their_line(analyze: Analyze) -> None:
    result = analyze(
        {
            "m.py": """
                import os
                import sys
                from json import dumps, loads

                print(sys.argv, loads("1"))
            """
        }
    )

    assert issues_of(result, IssueKind.UNUSED_IMPORT) == [
        ("m.py", 2, "'os' is imported but never used"),
        ("m.py", 4, "'dumps' is imported but never used"),
    ]
    assert {i.severity for i in result.issues} == {Severity.WARNING}


def test_imports_kept_on_purpose_are_not_reported(analyze: Analyze) -> None:
    result = analyze(
        {
            "pkg/__init__.py": "from .impl import Engine\n",
            "pkg/impl.py": "class Engine: ...\n",
            "exported.py": "from pkg import Engine\n__all__ = ['Engine']\n",
            "silenced.py": "import readline  # noqa: F401\n",
            "typed.py": "from pkg import Engine\n\ndef f(e: 'Engine') -> None: ...\n",
            "starred.py": "from pkg import *\n",
        }
    )

    assert issues_of(result, IssueKind.UNUSED_IMPORT) == []


def test_an_import_another_module_reaches_through_counts_as_used(analyze: Analyze) -> None:
    result = analyze(
        {
            "impl.py": "def real(): ...\n",
            "compat.py": "from impl import real\n",
            "app.py": "from compat import real\n\nreal()\n",
        }
    )

    assert issues_of(result, IssueKind.UNUSED_IMPORT) == []


def test_files_that_failed_to_parse_report_no_unused_imports(analyze: Analyze) -> None:
    result = analyze({"bad.py": "import os\ndef broken(:\n"})

    assert issues_of(result, IssueKind.UNUSED_IMPORT) == []


# ------------------------------------------------------------------ dead code


def test_unreferenced_functions_classes_and_methods_are_candidates(analyze: Analyze) -> None:
    result = analyze(
        {
            "lib.py": """
                def used(): ...
                def unused(): ...

                class UsedClass:
                    def touched(self): ...
                    def untouched(self): ...

                class UnusedClass: ...
            """,
            "app.py": """
                from lib import used, UsedClass

                used()
                UsedClass().touched()
            """,
        }
    )

    assert issues_of(result, IssueKind.DEAD_CODE) == [
        ("lib.py", 3, "No references to function 'unused' were found"),
        ("lib.py", 7, "No references to method 'UsedClass.untouched' were found"),
        ("lib.py", 9, "No references to class 'UnusedClass' were found"),
    ]
    assert {i.severity for i in result.issues if i.kind is IssueKind.DEAD_CODE} == {Severity.INFO}


def test_recursion_alone_does_not_keep_a_function_alive(analyze: Analyze) -> None:
    assert dead(analyze, {"m.py": "def loop(n):\n    return loop(n - 1)\n"}) == {
        "function:m.py:loop"
    }


def test_a_class_used_only_by_its_own_methods_is_a_candidate(analyze: Analyze) -> None:
    files = {
        "m.py": """
            class Lonely:
                def copy(self):
                    return Lonely()
        """
    }

    assert dead(analyze, files) == {"class:m.py:Lonely", "function:m.py:Lonely.copy"}


def test_use_of_a_member_keeps_its_class_alive(analyze: Analyze) -> None:
    files = {
        "lib.py": "class Tool:\n    @staticmethod\n    def make(): ...\n",
        "app.py": "import lib\n\nlib.Tool.make()\n",
    }

    assert dead(analyze, files) == set()


def test_things_reachable_dynamically_are_not_candidates(analyze: Analyze) -> None:
    files = {
        "m.py": """
            import functools
            import threading

            __all__ = ["public_api"]

            def public_api(): ...

            @functools.cache
            def decorated(): ...

            class Thing:
                def __repr__(self): ...
                def by_attribute(self): ...

            class Worker(threading.Thread):
                def run(self): ...

            class Base:
                def hook(self): ...

            class Child(Base):
                def hook(self): ...

            def outer():
                def closure(): ...
                return closure

            def call_dynamic(obj):
                return obj.by_attribute()

            call_dynamic(Thing()), outer(), Worker(), Child(), Base()
        """,
        "tests/test_m.py": "def test_something(): ...\ndef helper(): ...\n",
        "conftest.py": "def fixture_like(): ...\n",
    }

    assert dead(analyze, files) == set()


def test_is_test_file() -> None:
    assert all(
        is_test_file(path)
        for path in (
            "tests/x.py",
            "pkg/tests/x.py",
            "test/x.py",
            "test_a.py",
            "pkg/a_test.py",
            "conftest.py",
        )
    )
    assert not any(
        is_test_file(path) for path in ("contest.py", "pkg/latest/x.py", "attest.py", "testing.py")
    )


# --------------------------------------------------------------------- smells


def test_smells_respect_thresholds(make_project: ProjectFactory) -> None:
    from pyanalyzer.analysis.pipeline import AnalysisOptions, analyze_project

    body = "\n".join(f"    x{i} = {i}" for i in range(8))
    project = make_project(
        {
            "m.py": f"""
def long_one():
{body}

def many(a, b, c, d): ...

def twisty(x):
    if x:
        if x > 1:
            return 1
    return 0

class Wide:
    def a(self, p, q, r): ...
    def b(self): ...
    def c(self): ...
"""
        }
    )
    thresholds = QualityThresholds(
        max_function_lines=5, max_parameters=3, max_complexity=2, max_class_methods=2
    )

    result = analyze_project(str(project), AnalysisOptions(workers=1, thresholds=thresholds))
    relaxed = analyze_project(str(project), AnalysisOptions(workers=1))

    assert issues_of(result, IssueKind.LONG_FUNCTION) == [
        ("m.py", 2, "'long_one' is 9 lines long (limit 5)")
    ]
    assert issues_of(result, IssueKind.TOO_MANY_PARAMETERS) == [
        ("m.py", 12, "'many' takes 4 parameters (limit 3)")
    ]
    assert issues_of(result, IssueKind.HIGH_COMPLEXITY) == [
        ("m.py", 14, "'twisty' has cyclomatic complexity 3 (limit 2)")
    ]
    assert issues_of(result, IssueKind.LARGE_CLASS) == [
        ("m.py", 20, "'Wide' has 3 methods (limit 2)")
    ]
    smells = {
        IssueKind.LONG_FUNCTION,
        IssueKind.TOO_MANY_PARAMETERS,
        IssueKind.HIGH_COMPLEXITY,
        IssueKind.LARGE_CLASS,
    }
    assert not any(issue.kind in smells for issue in relaxed.issues)


def test_self_is_not_counted_as_a_parameter(make_project: ProjectFactory) -> None:
    from pyanalyzer.analysis.pipeline import AnalysisOptions, analyze_project

    project = make_project(
        {
            "m.py": """
                class C:
                    def method(self, a, b): ...
                    @staticmethod
                    def static(a, b, c): ...
            """
        }
    )

    result = analyze_project(
        str(project), AnalysisOptions(workers=1, thresholds=QualityThresholds(max_parameters=2))
    )

    assert issues_of(result, IssueKind.TOO_MANY_PARAMETERS) == [
        ("m.py", 5, "'C.static' takes 3 parameters (limit 2)")
    ]


# --------------------------------------------------------------------- cycles


def test_import_cycles_are_reported_as_issues(analyze: Analyze) -> None:
    result = analyze({"a.py": "import b\n", "b.py": "import a\n"})

    assert issues_of(result, IssueKind.IMPORT_CYCLE) == [
        ("a.py", 1, "2 modules depend on each other in a cycle: a, b")
    ]


def test_issues_are_sorted_by_location(analyze: Analyze) -> None:
    result = analyze({"b.py": "import os\nimport sys\n", "a.py": "import json\n"})

    assert [(i.file_path, i.line) for i in result.issues] == [("a.py", 1), ("b.py", 1), ("b.py", 2)]
