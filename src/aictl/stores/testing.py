"""In-memory writer for tests of store consumers."""

from __future__ import annotations

from collections.abc import Iterable
from copy import deepcopy
from typing import Any

from .base import InvalidRowError, ReadResult, Row, UnknownViewError


class FixtureReader:
    """Return caller-supplied results for named views and record their parameters."""

    def __init__(self, views) -> None:
        self.views = dict(views)
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def read(self, view, params) -> ReadResult:
        self.calls.append((view, dict(params)))
        if view not in self.views:
            raise UnknownViewError(view)
        result = self.views[view]
        result = result(params) if callable(result) else result
        return result if isinstance(result, ReadResult) else ReadResult(deepcopy(result))

    def capabilities(self) -> dict[str, Any]:
        return {"views": dict.fromkeys(self.views, {}), "change_feed": False, "query_languages": []}

    def health(self) -> dict[str, Any]:
        return {"status": "ready"}


class MemoryWriter:
    def __init__(self) -> None:
        self.operations: list[tuple[str, str, list[Row]]] = []
        self.flushes = 0

    def append(self, table: str, rows: Iterable[Row]) -> None:
        self.operations.append(("append", table, deepcopy(list(rows))))

    def upsert(self, table: str, rows: Iterable[Row]) -> None:
        self.operations.append(("upsert", table, deepcopy(list(rows))))

    def delete(self, table: str, keys: Iterable[Row]) -> None:
        rows = deepcopy(list(keys))
        from .kusto.tables import TABLES

        # The same refusal as the Kusto writer, so a caller that drops these is caught in its own tests.
        scope = TABLES[table].tombstone_scope if table in TABLES else ()
        for row in rows:
            if missing := [column for column in scope if column not in row]:
                raise InvalidRowError(f"{table}: a tombstone carries {', '.join(missing)} of the row it deletes")
        self.operations.append(("delete", table, rows))

    def flush(self) -> None:
        self.flushes += 1

    def health(self) -> dict[str, Any]:
        return {"status": "in memory", "operations": len(self.operations), "flushes": self.flushes}

    def written(self, table: str) -> list[Row]:
        """Return rows sent to a table, in write order."""
        return [row for op, name, rows in self.operations if name == table and op != "delete" for row in rows]
