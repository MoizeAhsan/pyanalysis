"""Method resolution order for project classes.

Python looks up attributes along a class's C3 linearization, not breadth
first, so ``class C(A, B)`` with ``A(X)`` finds ``X.m`` before ``B.m``.
Hierarchies that Python itself would reject (cycles, inconsistent orders)
can still appear in code being analyzed; for those we fall back to a
breadth-first order so lookups stay total.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence


class _Inconsistent(Exception):
    """No C3 linearization exists (cycle or conflicting base order)."""


def linearize(
    start: str,
    bases: Mapping[str, Sequence[str]],
    cache: dict[str, list[str]] | None = None,
) -> list[str]:
    """The MRO of ``start``, beginning with ``start`` itself.

    ``cache`` may be shared across calls on the same ``bases`` mapping; it
    stores the linearization of every class computed along the way.
    Iterative, so deep chains do not hit the recursion limit.
    """
    memo: dict[str, list[str]] = {} if cache is None else cache
    if start in memo:
        return memo[start]
    try:
        _c3(start, bases, memo)
    except _Inconsistent:
        memo[start] = [start, *_breadth_first(start, bases)]
    return memo[start]


def _c3(start: str, bases: Mapping[str, Sequence[str]], memo: dict[str, list[str]]) -> None:
    visiting: set[str] = set()
    stack: list[tuple[str, bool]] = [(start, False)]
    while stack:
        node, expanded = stack.pop()
        if node in memo:
            continue
        parents = list(dict.fromkeys(bases.get(node, ())))
        if expanded:
            if len(parents) == 1:
                # Single inheritance: the merge is just the parent's order.
                memo[node] = [node, *memo[parents[0]]]
            else:
                sequences: list[Sequence[str]] = [memo[parent] for parent in parents]
                memo[node] = [node, *_merge([*sequences, parents])]
            visiting.discard(node)
            continue
        if node in visiting:
            raise _Inconsistent
        visiting.add(node)
        stack.append((node, True))
        for parent in parents:
            if parent in visiting:
                raise _Inconsistent
            if parent not in memo:
                stack.append((parent, False))


def _merge(sequences: list[Sequence[str]]) -> list[str]:
    """C3 merge, linear in the total length of ``sequences`` times their count."""
    pending = [sequence for sequence in sequences if sequence]
    if len(pending) == 1:
        return list(pending[0])
    tails: Counter[str] = Counter()
    for sequence in pending:
        tails.update(sequence[1:])
    heads = [0] * len(pending)
    result: list[str] = []
    while True:
        candidate = None
        for index, sequence in enumerate(pending):
            if heads[index] < len(sequence) and tails[sequence[heads[index]]] == 0:
                candidate = sequence[heads[index]]
                break
        if candidate is None:
            if any(heads[i] < len(seq) for i, seq in enumerate(pending)):
                raise _Inconsistent
            return result
        result.append(candidate)
        for index, sequence in enumerate(pending):
            if heads[index] < len(sequence) and sequence[heads[index]] == candidate:
                heads[index] += 1
                if heads[index] < len(sequence):
                    tails[sequence[heads[index]]] -= 1


def _breadth_first(start: str, bases: Mapping[str, Sequence[str]]) -> list[str]:
    seen = {start}
    order: list[str] = []
    queue = [start]
    position = 0
    while position < len(queue):
        for parent in bases.get(queue[position], ()):
            if parent not in seen:
                seen.add(parent)
                order.append(parent)
                queue.append(parent)
        position += 1
    return order
