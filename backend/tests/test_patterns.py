"""Unit tests for pattern detection."""

from __future__ import annotations

from pyanalyzer.models.core import ArchitecturalPattern, PatternType
from tests.conftest import Analyze


def by_type(patterns: list[ArchitecturalPattern], kind: PatternType) -> list[ArchitecturalPattern]:
    return [p for p in patterns if p.type is kind]


def test_mvc_requires_all_three_roles(analyze: Analyze) -> None:
    complete = analyze(
        {
            "models/user.py": "class User: ...\n",
            "views/user.py": "class UserPage: ...\n",
            "web.py": "class UserController: ...\n",
        }
    ).patterns
    partial = analyze(
        {"models/user.py": "class User: ...\n", "web.py": "class UserController: ...\n"}
    ).patterns

    (mvc,) = by_type(complete, PatternType.MVC)
    assert set(mvc.elements) == {
        "class:models/user.py:User",
        "class:views/user.py:UserPage",
        "class:web.py:UserController",
    }
    assert "1 models, 1 views, and 1 controllers" in mvc.description
    assert by_type(partial, PatternType.MVC) == []


def test_mvc_is_not_triggered_by_substrings_of_directory_names(analyze: Analyze) -> None:
    """Originally any path containing "api" or "model" counted towards MVC."""
    patterns = analyze(
        {
            "rapid/remodel.py": "class Engine: ...\n",
            "review/overview.py": "class Report: ...\n",
            "capital/therapist.py": "class Session: ...\n",
        }
    ).patterns

    assert by_type(patterns, PatternType.MVC) == []


def test_factory_by_name_and_by_structure(analyze: Analyze) -> None:
    patterns = analyze(
        {
            "f.py": """
                class WidgetFactory:
                    def create_widget(self): ...

                class Toolbox:
                    def make_hammer(self): ...
                    def build_saw(self): ...

                class Plain:
                    def create_one(self): ...

                class EmptyFactory:
                    def describe(self): ...
            """
        }
    ).patterns

    factories = by_type(patterns, PatternType.FACTORY)
    assert {p.name for p in factories} == {"Factory (WidgetFactory)", "Factory (Toolbox)"}
    named = next(p for p in factories if "WidgetFactory" in p.name)
    structural = next(p for p in factories if "Toolbox" in p.name)
    assert named.elements == [
        "class:f.py:WidgetFactory",
        "function:f.py:WidgetFactory.create_widget",
    ]
    assert named.confidence > structural.confidence
    assert "2 creation methods" in structural.description


def test_observer_needs_a_subject_and_supporting_evidence(analyze: Analyze) -> None:
    structural = analyze(
        {
            "events.py": """
                class Bus:
                    def subscribe(self, fn): ...
                    def publish(self, event): ...
            """
        }
    ).patterns
    named = analyze({"o.py": "class PricePublisher: ...\nclass PriceListener: ...\n"}).patterns
    lonely_subject = analyze({"o.py": "class PricePublisher: ...\n"}).patterns
    lonely_observer = analyze({"o.py": "class PriceListener: ...\n"}).patterns

    assert by_type(structural, PatternType.OBSERVER)[0].elements == ["class:events.py:Bus"]
    assert by_type(named, PatternType.OBSERVER)[0].elements == [
        "class:o.py:PricePublisher",
        "class:o.py:PriceListener",
    ]
    assert by_type(lonely_subject, PatternType.OBSERVER) == []
    assert by_type(lonely_observer, PatternType.OBSERVER) == []


def test_singleton_needs_a_name_or_two_structural_signals(analyze: Analyze) -> None:
    patterns = analyze(
        {
            "s.py": """
                class ConfigSingleton: ...

                class Registry:
                    def __new__(cls): ...
                    @classmethod
                    def get_instance(cls): ...

                class OnlyNew:
                    def __new__(cls): ...

                class Ordinary:
                    def run(self): ...
            """
        }
    ).patterns

    singletons = by_type(patterns, PatternType.SINGLETON)
    assert {p.name for p in singletons} == {"Singleton (ConfigSingleton)", "Singleton (Registry)"}
    registry = next(p for p in singletons if "Registry" in p.name)
    assert registry.description == (
        "Registry looks like a singleton: a custom __new__, an instance accessor"
    )
    assert all(0.0 < p.confidence <= 0.9 for p in patterns)


def test_no_patterns_in_plain_code(analyze: Analyze) -> None:
    assert analyze({"m.py": "class Thing:\n    def run(self): ...\n"}).patterns == []
