"""Calls on instances whose class is known from constructors and annotations."""

from __future__ import annotations

from pyanalyzer.analysis.pipeline import AnalysisResult
from tests.conftest import Analyze

REPO = """
    class Repo:
        def save(self, item): ...
        def load(self): ...

    class Cache(Repo):
        def load(self): ...

    def make_repo() -> Repo:
        return Repo()

    def make_optional() -> "Repo | None":
        return None
"""


def callers(result: AnalysisResult, target: str) -> set[str]:
    return {usage.used_by for usage in result.resolution.usages.get(target, ())}


def test_constructor_assignment_types_a_local(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO,
            "app.py": """
                from repo import Repo, Cache

                def run():
                    repo = Repo()
                    repo.save(1)
                    cache = Cache()
                    cache.save(2)
                    cache.load()
            """,
        }
    )

    assert "function:app.py:run" in callers(result, "function:repo.py:Repo.save")
    # Inherited method found through the MRO; override wins over the base.
    assert "function:app.py:run" in callers(result, "function:repo.py:Cache.load")
    assert "function:app.py:run" not in callers(result, "function:repo.py:Repo.load")


def test_parameter_and_variable_annotations(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO,
            "app.py": """
                from typing import Optional
                import repo as r

                def by_param(store: r.Repo):
                    store.save(1)

                def by_optional(store: Optional["r.Repo"] = None):
                    store.load()

                def by_union(store: r.Repo | None):
                    store.load()

                def by_variable():
                    store: r.Repo = get()
                    store.save(2)
            """,
        }
    )

    assert callers(result, "function:repo.py:Repo.save") >= {
        "function:app.py:by_param",
        "function:app.py:by_variable",
    }
    assert callers(result, "function:repo.py:Repo.load") >= {
        "function:app.py:by_optional",
        "function:app.py:by_union",
    }


def test_return_annotations_type_call_results(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO,
            "app.py": """
                from repo import make_repo, make_optional

                def run():
                    a = make_repo()
                    a.save(1)
                    b = make_optional()
                    b.load()
            """,
        }
    )

    assert "function:app.py:run" in callers(result, "function:repo.py:Repo.save")
    assert "function:app.py:run" in callers(result, "function:repo.py:Repo.load")


def test_instance_attributes_carry_their_type(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO,
            "service.py": """
                from dataclasses import dataclass
                from repo import Repo

                class Service:
                    def __init__(self):
                        self.repo = Repo()

                    def store(self):
                        self.repo.save(1)

                @dataclass
                class Holder:
                    repo: Repo

                    def fetch(self):
                        return self.repo.load()

                class Child(Service):
                    def again(self):
                        self.repo.save(2)
            """,
        }
    )

    assert callers(result, "function:repo.py:Repo.save") >= {
        "function:service.py:Service.store",
        "function:service.py:Child.again",
    }
    assert "function:service.py:Holder.fetch" in callers(result, "function:repo.py:Repo.load")


def test_unknown_or_conflicting_types_are_not_guessed(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO
            + """
    class Other:
        def save(self, item): ...
""",
            "app.py": """
                from repo import Repo, Other

                def reassigned(flag):
                    thing = Repo()
                    if flag:
                        thing = Other()
                    thing.save(1)

                def untyped(thing):
                    thing.save(2)

                def loop(items):
                    for thing in items:
                        thing.save(3)
                    thing = Repo()

                def unpacked():
                    thing, other = Repo(), Repo()
                    thing.save(4)
            """,
        }
    )

    assert callers(result, "function:repo.py:Repo.save") == set()
    assert callers(result, "function:repo.py:Other.save") == set()


def test_inferred_calls_clear_dead_code_candidates(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO,
            "app.py": """
                from repo import Repo

                def main():
                    Repo().load()
                    repo = Repo()
                    repo.save(1)

                if __name__ == "__main__":
                    main()
            """,
        }
    )

    dead = {issue.element_id for issue in result.issues if issue.kind.value == "dead_code"}
    assert "function:repo.py:Repo.save" not in dead


def test_calls_on_call_results(analyze: Analyze) -> None:
    result = analyze(
        {
            "repo.py": REPO,
            "app.py": """
                from repo import Repo, make_repo

                def run():
                    Repo().load()
                    make_repo().save(1)
            """,
        }
    )

    assert "function:app.py:run" in callers(result, "function:repo.py:Repo.load")
    assert "function:app.py:run" in callers(result, "function:repo.py:Repo.save")
