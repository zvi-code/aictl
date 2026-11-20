"""Replay phase-0 query and command results without a Kusto connection."""

from __future__ import annotations

import gzip
import json
import threading
from collections import defaultdict, deque
from collections.abc import Iterator
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..base import StoreError


class UnrecordedQueryError(StoreError):
    """The recording has no exact match for a statement."""


class RecordedFailure(StoreError):
    """The recorded request failed."""


@dataclass(frozen=True)
class _Column:
    column_name: str
    column_type: str


class _Row(tuple):
    def __new__(cls, columns: tuple[_Column, ...], values: list[Any]) -> _Row:
        row = super().__new__(cls, values)
        row._names = tuple(c.column_name for c in columns)
        return row

    def __getitem__(self, key: Any) -> Any:
        return super().__getitem__(self._names.index(key) if isinstance(key, str) else key)

    def to_dict(self) -> dict[str, Any]:
        return dict(zip(self._names, self, strict=True))


@dataclass
class _Table:
    columns: tuple[_Column, ...]
    rows: list[list[Any]]

    def __iter__(self) -> Iterator[_Row]:
        return (_Row(self.columns, row) for row in self.rows)


@dataclass
class _Response:
    primary_results: list[_Table]


class RecordedKustoClient:
    """Match exact statement text. Replay occurrences in order, then reuse the last."""

    def __init__(self, path: str | Path):
        self._responses: dict[tuple[str, str], deque[dict[str, Any]]] = defaultdict(deque)
        self._lock = threading.Lock()
        self.ingestions: list[tuple[str, list[dict[str, Any]]]] = []
        self.ingest_error: Exception | None = None
        with gzip.open(path, "rt", encoding="utf-8") as file:
            for line in file:
                record = json.loads(line)
                if record["kind"] in ("query", "command"):
                    self._responses[(record["kind"], record["kql"])].append(record)

    def execute(self, database: str, text: str, properties: Any = None) -> _Response:
        if text.lstrip().startswith("."):
            return self.execute_mgmt(database, text, properties)
        return self.execute_query(database, text, properties)

    def execute_query(self, database: str, text: str, properties: Any = None) -> _Response:
        return self._execute("query", database, text)

    def execute_mgmt(self, database: str, text: str, properties: Any = None) -> _Response:
        return self._execute("command", database, text)

    def _execute(self, kind: str, database: str, text: str) -> _Response:
        with self._lock:
            matches = self._responses.get((kind, text))
            if not matches:
                raise UnrecordedQueryError(f"Unrecorded Kusto {kind} in {database}: {text[:500]}")
            record = matches.popleft() if len(matches) > 1 else matches[0]
        if record["outcome"] != "ok":
            raise RecordedFailure(
                f"Recorded Kusto {kind} failed in {database}: {record.get('error', record['outcome'])}"
            )
        return _Response(
            [
                _Table(tuple(_Column(c["name"], c["type"]) for c in table["columns"]), deepcopy(table["rows"]))
                for table in (record.get("response") or [])
            ]
        )

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        self.ingest(table, [json.loads(line) for line in lines])

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        with self._lock:
            if self.ingest_error is not None:
                raise self.ingest_error
            self.ingestions.append((table, deepcopy(rows)))
