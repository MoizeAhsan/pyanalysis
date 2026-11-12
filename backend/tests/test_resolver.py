"""Unit tests for cross-file resolution."""

from __future__ import annotations

from pyanalyzer.analysis.pipeline import AnalysisResult
from pyanalyzer.analysis.resolver import ModuleIndex
from pyanalyzer.models.core import UsageType
from tests.conftest import Analyze


def used_by(result: AnalysisResult, target: str) -> set[tuple[str, str]]:
    """(usage type, user qualname) pairs for one target element."""
    return {
        (usage.usage_type.value, usage.used_by.partition(":")[2])
        for usage in result.resolution.usages.get(target, ())
    }


class TestModuleIndex:
    def test_names_are_anchored_at_the_outermost_package(self) -> None:
        index = ModuleIndex(
            [
                "src/app/__init__.py",
                "src/app/core/__init__.py",
                "src/app/core/engine.py",
                "scripts/tool.py",
                "setup.py",
            ]
        )

        assert index.names == {
            "src/app/__init__.py": "app",
            "src/app/core/__init__.py": "app.core",
            "src/app/core/engine.py": "app.core.engine",
            "scripts/tool.py": "tool",
            "setup.py": "setup",
        }

    def test_absolute_lookup_accepts_anchored_and_root_relative_names(self) -> None:
        index = ModuleIndex(["src/app/__init__.py", "src/app/engine.py"])

        assert index.absolute("app.engine", "x.py") == "src/app/engine.py"
        assert index.absolute("src.app.engine", "x.py") == "src/app/engine.py"
        assert index.absolute("app", "x.py") == "src/app/__init__.py"
        assert index.absolute("engine", "x.py") is None

    def test_ambiguous_names_prefer_the_module_nearest_the_importer(self) -> None:
        index = ModuleIndex(["a/utils.py", "a/main.py", "b/utils.py", "b/deep/main.py"])

        assert index.absolute("utils", "a/main.py") == "a/utils.py"
        assert index.absolute("utils", "b/deep/main.py") == "b/utils.py"

    def test_standard_library_names_are_only_shadowed_within_a_directory(self) -> None:
        index = ModuleIndex(["tools/json.py", "tools/run.py", "app/main.py"])

        assert index.absolute("json", "tools/run.py") == "tools/json.py"
        assert index.absolute("json", "app/main.py") is None

    def test_relative_lookup(self) -> None:
        index = ModuleIndex(
            ["pkg/__init__.py", "pkg/a.py", "pkg/sub/__init__.py", "pkg/sub/b.py", "top.py"]
        )

        assert index.relative("pkg/sub/b.py", 1, []) == "pkg/sub/__init__.py"
        assert index.relative("pkg/sub/b.py", 2, ["a"]) == "pkg/a.py"
        assert index.relative("pkg/sub/b.py", 2, []) == "pkg/__init__.py"
        assert index.relative("pkg/sub/b.py", 3, ["top"]) == "top.py"
        assert index.relative("pkg/sub/b.py", 4, ["top"]) is None
        assert index.relative("pkg/a.py", 1, ["missing"]) is None


def test_from_import_of_function_and_class(analyze: Analyze) -> None:
    result = analyze(
        {
            "lib.py": "class Tool: ...\ndef helper(): ...\n",
            "app.py": """
                from lib import Tool, helper

                def main():
                    helper()
                    return Tool()
            """,
        }
    )

    assert used_by(result, "function:lib.py:helper") == {
        ("import", "app.py"),
        ("call", "app.py:main"),
    }
    assert used_by(result, "class:lib.py:Tool") == {("import", "app.py"), ("call", "app.py:main")}
    assert result.resolution.dependencies["function:app.py:main"] == [
        "class:lib.py:Tool",
        "function:lib.py:helper",
    ]


def test_module_import_with_attribute_access(analyze: Analyze) -> None:
    result = analyze(
        {
            "pkg/__init__.py": "",
            "pkg/sub/__init__.py": "",
            "pkg/sub/lib.py": "class Tool:\n    @staticmethod\n    def make(): ...\n",
            "app.py": """
                import pkg.sub.lib
                import pkg.sub.lib as aliased

                pkg.sub.lib.Tool.make()
                aliased.Tool()
            """,
        }
    )

    assert used_by(result, "function:pkg/sub/lib.py:Tool.make") == {("call", "app.py")}
    assert used_by(result, "class:pkg/sub/lib.py:Tool") == {("call", "app.py")}
    assert used_by(result, "module:pkg/sub/lib.py") == {("import", "app.py")}


def test_relative_imports(analyze: Analyze) -> None:
    result = analyze(
        {
            "pkg/__init__.py": "",
            "pkg/core.py": "def run(): ...\n",
            "pkg/sub/__init__.py": "",
            "pkg/sub/mod.py": """
                from .. import core
                from ..core import run
                from . import sibling

                core.run()
                run()
                sibling.go()
            """,
            "pkg/sub/sibling.py": "def go(): ...\n",
        }
    )

    assert used_by(result, "function:pkg/core.py:run") == {
        ("import", "pkg/sub/mod.py"),
        ("call", "pkg/sub/mod.py"),
    }
    assert used_by(result, "function:pkg/sub/sibling.py:go") == {("call", "pkg/sub/mod.py")}
    assert ("import", "pkg/sub/mod.py") in used_by(result, "module:pkg/core.py")


def test_reexports_through_package_init_are_followed(analyze: Analyze) -> None:
    result = analyze(
        {
            "pkg/__init__.py": "from .impl import Engine\nfrom ._deep import *\n",
            "pkg/impl.py": "class Engine: ...\n",
            "pkg/_deep.py": "def buried(): ...\n",
            "app.py": """
                from pkg import Engine, buried
                import pkg

                Engine()
                buried()
                pkg.Engine()
            """,
        }
    )

    assert ("call", "app.py") in used_by(result, "class:pkg/impl.py:Engine")
    assert ("call", "app.py") in used_by(result, "function:pkg/_deep.py:buried")


def test_star_import_supplies_unbound_names(analyze: Analyze) -> None:
    result = analyze(
        {
            "lib.py": "def helper(): ...\n",
            "app.py": "from lib import *\n\nhelper()\n",
        }
    )

    assert used_by(result, "function:lib.py:helper") == {("call", "app.py")}


def test_circular_reexports_terminate(analyze: Analyze) -> None:
    result = analyze(
        {
            "a.py": "from b import thing\n",
            "b.py": "from a import thing\n",
            "c.py": "from a import thing\nthing()\n",
        }
    )

    assert result.cycles == [["module:a.py", "module:b.py"]]


def test_inheritance_is_recorded_and_methods_resolve_through_bases(analyze: Analyze) -> None:
    result = analyze(
        {
            "base.py": """
                class Base:
                    def shared(self): ...
                    def overridden(self): ...
            """,
            "child.py": """
                from base import Base

                class Child(Base):
                    def overridden(self):
                        super().overridden()
                        self.shared()
                        self.own()

                    def own(self): ...

                Child.shared
            """,
        }
    )

    resolution = result.resolution
    assert resolution.class_bases == {"class:child.py:Child": ["class:base.py:Base"]}
    assert ("inheritance", "child.py:Child") in used_by(result, "class:base.py:Base")
    assert used_by(result, "function:base.py:Base.shared") == {
        ("call", "child.py:Child.overridden"),
        ("reference", "child.py"),
    }
    assert used_by(result, "function:base.py:Base.overridden") == {
        ("call", "child.py:Child.overridden")
    }
    assert used_by(result, "function:child.py:Child.own") == {("call", "child.py:Child.overridden")}


def test_recursion_is_not_a_usage(analyze: Analyze) -> None:
    result = analyze({"m.py": "def loop(n):\n    return loop(n - 1)\n"})

    assert "function:m.py:loop" not in result.resolution.usages


def test_type_hints_and_decorators_have_their_own_usage_types(analyze: Analyze) -> None:
    result = analyze(
        {
            "lib.py": "class Model: ...\ndef traced(f): return f\n",
            "app.py": """
                from lib import Model, traced

                @traced
                def load(item: Model) -> "Model":
                    return item
            """,
        }
    )

    assert used_by(result, "class:lib.py:Model") == {
        ("import", "app.py"),
        ("type_hint", "app.py:load"),
    }
    assert used_by(result, "function:lib.py:traced") == {
        ("import", "app.py"),
        ("decorator", "app.py:load"),
    }
    assert {u.usage_type for u in result.resolution.usages["class:lib.py:Model"]} == {
        UsageType.IMPORT,
        UsageType.TYPE_HINT,
    }


def test_usage_location_and_context(analyze: Analyze) -> None:
    result = analyze(
        {
            "lib.py": "def helper(): ...\n",
            "app.py": "from lib import helper\n\n\nvalue = helper()\n",
        }
    )

    call = result.resolution.usages["function:lib.py:helper"][1]
    assert (call.location.file_path, call.location.line_number, call.location.column_number) == (
        "app.py",
        4,
        8,
    )
    assert call.context == "value = helper()"
    import_usage = result.resolution.usages["function:lib.py:helper"][0]
    assert import_usage.context == "from lib import helper"


def test_external_imports_are_classified(analyze: Analyze) -> None:
    result = analyze(
        {
            "a.py": "import os, sys\nimport requests\nfrom numpy import array\n",
            "b.py": "import os\nimport requests.adapters\nfrom . import missing\n",
        }
    )

    assert result.resolution.stdlib_modules == {"os": 2, "sys": 1}
    assert result.resolution.external_packages == {"requests": 2, "numpy": 1}
    assert result.module_graph.edges == []


def test_module_qualified_names_use_the_importable_name(analyze: Analyze) -> None:
    result = analyze({"src/app/__init__.py": "", "src/app/engine.py": "", "tool.py": ""})

    names = {e.location.file_path: e.qualified_name for e in result.resolution.elements.values()}
    assert names == {
        "src/app/__init__.py": "app",
        "src/app/engine.py": "app.engine",
        "tool.py": "tool",
    }


def test_function_level_imports_are_attributed_to_the_function(analyze: Analyze) -> None:
    result = analyze(
        {
            "lib.py": "def helper(): ...\n",
            "app.py": "def lazy():\n    from lib import helper\n    return helper()\n",
        }
    )

    assert used_by(result, "function:lib.py:helper") == {
        ("import", "app.py:lazy"),
        ("call", "app.py:lazy"),
    }


def test_children_index_lists_direct_members(analyze: Analyze) -> None:
    result = analyze(
        {"m.py": "class A:\n    def x(self): ...\n    def y(self): ...\ndef f(): ...\n"}
    )

    children = result.resolution.children
    assert children["module:m.py"] == ["class:m.py:A", "function:m.py:f"]
    assert children["class:m.py:A"] == ["function:m.py:A.x", "function:m.py:A.y"]
