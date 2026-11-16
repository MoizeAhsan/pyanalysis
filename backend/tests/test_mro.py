"""Tests for the C3 method resolution order helper."""

from __future__ import annotations

from pyanalyzer.analysis.mro import linearize


def test_matches_python_for_a_diamond() -> None:
    class Root: ...

    class A(Root): ...

    class B(Root): ...

    class C(A, B): ...

    bases = {"C": ["A", "B"], "A": ["Root"], "B": ["Root"]}
    assert linearize("C", bases) == [cls.__name__ for cls in C.__mro__[:-1]]


def test_shared_cache_reuses_ancestor_orders() -> None:
    bases = {"C": ["B"], "B": ["A"]}
    cache: dict[str, list[str]] = {}
    assert linearize("C", bases, cache) == ["C", "B", "A"]
    assert cache["B"] == ["B", "A"]


def test_inconsistent_order_falls_back_to_breadth_first() -> None:
    # Python raises TypeError for this class; analysis must still answer.
    bases = {"D": ["B", "C"], "C": ["B"], "B": []}
    assert linearize("D", bases) == ["D", "B", "C"]


def test_cycles_terminate() -> None:
    bases = {"A": ["B"], "B": ["A"]}
    assert linearize("A", bases) == ["A", "B"]


def test_deep_chains_do_not_recurse() -> None:
    depth = 5_000
    bases = {f"c{i}": [f"c{i + 1}"] for i in range(depth)}
    order = linearize("c0", bases)
    assert len(order) == depth + 1
    assert order[-1] == f"c{depth}"
