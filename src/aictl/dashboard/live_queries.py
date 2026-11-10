"""Bounded SELECT-result reuse for the queryable-Kusto board projection.

The incremental reader invalidates table dependencies. This caches query answers,
not facts, and never opens SQLite or receives uncommitted/local ingestion rows.
"""

from __future__ import annotations

import functools
import json
import threading
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class _Answer:
    names: tuple[str, ...]
    rows: tuple[tuple, ...]
    dependencies: frozenset[str]
    generations: tuple
    size: int


class ProjectionQueries:
    """One destination's query-result LRU shared by all live filter scopes."""

    def __init__(self, *, max_bytes: int = 16 * 1024 * 1024, max_entries: int = 512) -> None:
        self.max_bytes = max_bytes
        self.max_entries = max_entries
        self._lock = threading.Lock()
        self._answers: OrderedDict[tuple, _Answer] = OrderedDict()
        self._bytes = 0
        self._generations: dict[str, int] = {}
        self._all_generation = 0

    def invalidate(self, tables: tuple[str, ...] | None = None) -> None:
        with self._lock:
            if tables is None:
                self._all_generation += 1
                self._answers.clear()
                self._bytes = 0
                return
            changed = {table.lower() for table in tables}
            for table in changed:
                self._generations[table] = self._generations.get(table, 0) + 1
            for key, answer in list(self._answers.items()):
                if answer.dependencies & changed or "*" in answer.dependencies:
                    self._bytes -= self._answers.pop(key).size

    def _generation_locked(self, dependencies: frozenset[str]) -> tuple:
        if "*" in dependencies:
            return self._all_generation, tuple(sorted(self._generations.items()))
        return self._all_generation, tuple((name, self._generations.get(name, 0)) for name in sorted(dependencies))

    def execute(self, connection: Any, sql: str, params: Any = ()) -> Any:
        from ..kusto.connection import KustoCursor

        if not sql.lstrip().upper().startswith(("SELECT", "WITH")):
            return connection.execute(sql, params)
        key = (sql, json.dumps(params, sort_keys=True, default=str, separators=(",", ":")))
        with self._lock:
            answer = self._answers.get(key)
            if answer is not None:
                self._answers.move_to_end(key)
        if answer is None:
            dependencies = _dependencies(sql)
            with self._lock:
                generations = self._generation_locked(dependencies)
            cursor = connection.execute(sql, params)
            names = tuple(column[0] for column in cursor.description or [])
            rows = tuple(tuple(row) for row in cursor.fetchall())
            # Include container/slot overhead as well as payload bytes in the budget.
            size = len(json.dumps([names, rows], ensure_ascii=True, default=str).encode()) + 256
            size += sum(64 + 8 * len(row) for row in rows)
            answer = _Answer(names, rows, dependencies, generations, size)
            with self._lock:
                if generations == self._generation_locked(dependencies) and size <= self.max_bytes:
                    previous = self._answers.pop(key, None)
                    if previous is not None:
                        self._bytes -= previous.size
                    self._answers[key] = answer
                    self._bytes += size
                    while self._answers and (self._bytes > self.max_bytes or len(self._answers) > self.max_entries):
                        _, evicted = self._answers.popitem(last=False)
                        self._bytes -= evicted.size
        result = KustoCursor(connection)
        result._set(list(answer.names), list(answer.rows))
        return result


@functools.lru_cache(maxsize=512)
def _dependencies(sql: str) -> frozenset[str]:
    # Use the same SQLite grammar as the Kusto translator, including nested queries.
    import sqlglot
    from sqlglot import exp
    from sqlglot.errors import SqlglotError

    try:
        tree = sqlglot.parse_one(sql, read="sqlite")
    except SqlglotError:
        return frozenset({"*"})
    return frozenset(table.name.lower() for table in tree.find_all(exp.Table))


class ProjectionConnection:
    """The existing board's connection surface with dependency-aware result reuse."""

    def __init__(self, connection: Any, queries: ProjectionQueries) -> None:
        self._connection = connection
        self._queries = queries
        self._live_latency_bound = type(connection).__name__ == "KustoConnection"
        self._live_projection = True

    @property
    def row_factory(self) -> Any:
        return self._connection.row_factory

    @row_factory.setter
    def row_factory(self, value: Any) -> None:
        self._connection.row_factory = value

    def execute(self, sql: str, params: Any = ()) -> Any:
        return self._queries.execute(self._connection, sql, params)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._connection, name)
