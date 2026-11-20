"""Bounded ingestion queues. The daemon schedules flushes outside collector threads."""

from __future__ import annotations

import hashlib
import logging
import math
import threading
import time
from collections import deque
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .ingest import RowIngester, json_line
from ..base import InvalidRowError, Row
from .client import next_version, retrying, schema_cache_behind
from .maintenance import TRIM_TIMESTAMPS
from .schema import LEGACY_COLUMNS
from .tables import TABLES, IngestionMode, Table

log = logging.getLogger(__name__)
_BATCH_BYTES = 900_000  # Fits one request on all three ingestion backends.
_BATCH_ROWS = 1000


@dataclass(frozen=True)
class _Pending:
    line: str
    size: int
    text_ts: float | None = None


@dataclass
class _Queue:
    rows: deque[_Pending] = field(default_factory=deque)
    size: int = 0
    in_flight: int = 0
    sent: int = 0
    dropped: int = 0
    lost: int = 0
    error: str | None = None
    requests: int = 0
    failures: int = 0
    bytes_sent: int = 0
    last_sent_at: float | None = None
    last_error_at: float | None = None


def _column_type(value: Any, kind: str) -> bool:
    if kind == "string":
        return isinstance(value, str)
    if kind == "bool":
        return isinstance(value, bool)
    if kind == "long":
        return type(value) is int and -(2**63) <= value < 2**63
    if kind == "int":
        return type(value) is int and -(2**31) <= value < 2**31
    if kind == "real":
        return type(value) in (float, int) and math.isfinite(value)
    if kind == "datetime":
        if isinstance(value, datetime):
            return True
        if isinstance(value, str):
            try:
                datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return False
            return True
        return False
    return kind == "dynamic"


class KustoWriter:
    def __init__(
        self,
        ingester: RowIngester | None,
        *,
        node_id: str,
        capture: bool = True,
        max_rows: int = 10_000,
        max_bytes: int = 8_000_000,
        modes: Mapping[str, IngestionMode] | None = None,
        schema_warning: str | None = None,
        trim_before=lambda: 0.0,
    ) -> None:
        if max_rows < 1 or max_bytes < 1:
            raise ValueError("Queue row and byte limits must be positive")
        if capture and ingester is None:
            raise ValueError("Capture requires an ingester")
        self._ingester = ingester
        self._capture = capture
        self._node_id = node_id
        self._max_rows = max_rows
        self._max_bytes = max_bytes
        self._modes = {name: table.ingestion for name, table in TABLES.items()}
        if modes is not None:
            self._modes.update(modes)
        self._warning = schema_warning
        self._trim_before = trim_before
        self._queues: dict[str, _Queue] = {}
        self._closed = False
        self._lock = threading.Lock()
        self._flush_lock = threading.Lock()

    def append(self, table: str, rows: Iterable[Row]) -> None:
        self._enqueue(table, rows, delete=False)

    def upsert(self, table: str, rows: Iterable[Row]) -> None:
        """Store complete versions. Omitted nullable values are cleared, not merged."""
        self._enqueue(table, rows, delete=False)

    def delete(self, table: str, keys: Iterable[Row]) -> None:
        self._enqueue(table, keys, delete=True)

    def _enqueue(self, name: str, rows: Iterable[Row], *, delete: bool) -> None:
        if not self._capture:
            return
        table = TABLES.get(name)
        if table is None:
            raise InvalidRowError(f"Unknown table {name!r}")
        if delete and not table.tombstone:
            raise InvalidRowError(f"{name} does not accept tombstones")
        owned = {"node_id", table.version}
        if table.tombstone:
            owned.add(table.tombstone)
        columns = dict(table.columns)
        input_columns = set(table.key if delete else columns) - owned
        for row in rows:
            with self._lock:
                if self._closed:
                    return
                line = self._encode(name, table, row, columns, input_columns, delete=delete)
                ts = None
                if spec := TRIM_TIMESTAMPS.get(name):
                    ts = row.get(spec[0])
                    if ts is not None and spec[1] == "datetime":
                        ts = (datetime.fromisoformat(ts.replace("Z", "+00:00")) if isinstance(ts, str) else ts).timestamp()
                item = _Pending(line, len(line) + 1, ts)  # json_line returns ASCII.
                queue = self._queues.setdefault(name, _Queue())
                if item.size > min(self._max_bytes, _BATCH_BYTES):
                    queue.dropped += 1
                    continue
                queue.rows.append(item)
                queue.size += item.size
                self._fit(queue)

    def _encode(
        self, name: str, table: Table, row: Row, columns: dict[str, str], allowed: set[str], *, delete: bool
    ) -> str:
        if not isinstance(row, dict):
            raise InvalidRowError(f"{name} expects row dictionaries")
        if unknown := row.keys() - allowed:
            raise InvalidRowError(f"{name}: unknown or writer-owned columns: {', '.join(sorted(map(str, unknown)))}")
        for column in table.key:
            if column == "node_id":
                continue
            value = row.get(column)
            # Node-wide rows need no project. Some facts need no agent or source.
            if value is None or (
                value == "" and column != "project"
                and (name, column) not in {("session_context_items", "agent_id"), ("data_quality_status", "source")}
            ):
                raise InvalidRowError(f"{name}: a deterministic key requires {column}")
        for column, value in row.items():
            try:
                valid = value is None or _column_type(value, columns[column])
            except OverflowError:
                valid = False
            if not valid:
                raise InvalidRowError(f"{name}.{column} expects {columns[column]}")
        record = dict.fromkeys(columns)
        record.update(row)
        record.update(node_id=self._node_id, **{table.version: next_version()})
        if name in LEGACY_COLUMNS:
            identity = "\x00".join(str(record[key]) for key in table.key if key != "project")
            rowid = int.from_bytes(hashlib.sha256(identity.encode("utf-8", errors="replace")).digest()[:7], "big")
            record.update(rowid=rowid, _deleted=delete)
            if "id" in columns:
                record["id"] = rowid
        if table.tombstone:
            record[table.tombstone] = delete
        try:
            return json_line(record)
        except (TypeError, ValueError, OverflowError, RecursionError) as exc:
            raise InvalidRowError(f"{name}: row is not JSON serializable") from exc

    def _fit(self, queue: _Queue) -> None:
        while len(queue.rows) > self._max_rows or queue.size > self._max_bytes:
            queue.size -= queue.rows.popleft().size
            queue.dropped += 1

    def flush(self) -> None:
        """Submit rows queued at entry. Keep failed batches for the next flush."""
        ingester = self._ingester
        if not self._capture or ingester is None:
            return
        with self._flush_lock:
            with self._lock:
                # Identity of the tail bounds each flush even if producers are active.
                tails = [(name, queue.rows[-1]) for name, queue in self._queues.items() if queue.rows]
            for name, tail in tails:
                self._flush_table(name, tail, ingester)

    def _flush_table(self, name: str, tail: _Pending, ingester: RowIngester) -> None:
        queue = self._queues[name]
        while True:
            batch: list[_Pending] = []
            size = 0
            with self._lock:
                # If producers dropped the original tail, all remaining rows are newer.
                if not any(item is tail for item in queue.rows):
                    return
                while queue.rows and len(batch) < _BATCH_ROWS and size + queue.rows[0].size <= _BATCH_BYTES:
                    item = queue.rows.popleft()
                    batch.append(item)
                    size += item.size
                    if item is tail:
                        break
                queue.size -= size
                queue.in_flight = len(batch)
            sent = batch

            def submit(batch=batch):
                nonlocal sent
                if name in TRIM_TIMESTAMPS:
                    before = self._trim_before()
                    sent = [item for item in batch if item.text_ts is None or item.text_ts >= before]
                if sent:
                    with self._lock:
                        queue.requests += 1
                    ingester.ingest_lines(name, [item.line for item in sent])

            try:
                also = schema_cache_behind if self._modes[name] == "streaming" else None
                retrying(submit, f"ingest into {name}", also=also)
            except Exception as exc:  # noqa: BLE001 - keep failed transport batches without blocking collectors
                with self._lock:
                    queue.in_flight = 0
                    queue.error = str(exc)
                    queue.failures += 1
                    queue.last_error_at = time.time()
                    queue.rows.extendleft(reversed(batch))
                    queue.size += size
                    self._fit(queue)
                log.warning("Kusto ingestion into %s failed: %s", name, exc)
                return
            with self._lock:
                queue.in_flight = 0
                queue.dropped += len(batch) - len(sent)
                queue.sent += len(sent)
                queue.bytes_sent += sum(item.size for item in sent)
                if sent:
                    queue.last_sent_at = time.time()
                queue.error = None
            if batch[-1] is tail:
                return

    def close(self) -> None:
        """Stop capture and count queued rows left after the last flush."""
        with self._flush_lock, self._lock:
            if self._closed:
                return
            self._closed = True
            for queue in self._queues.values():
                queue.lost += len(queue.rows)
                queue.rows.clear()
                queue.size = 0
            if self._capture:
                log.info("Kusto writer stopped: lost_at_exit=%d", sum(q.lost for q in self._queues.values()))

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "status": "stopped" if self._closed else "active" if self._capture else "capture is off",
                "warning": self._warning,
                "tables": {
                    name: {
                        "mode": mode,
                        "queue_depth": len(q.rows),
                        "queue_bytes": q.size,
                        "in_flight": q.in_flight,
                        "rows_sent": q.sent,
                        "rows_dropped": q.dropped,
                        "lost_at_exit": q.lost,
                        "last_error": q.error,
                        "ingest_requests": q.requests,
                        "ingest_failures": q.failures,
                        "bytes_sent": q.bytes_sent,
                        "last_sent_at": q.last_sent_at,
                        "last_error_at": q.last_error_at if q.error else None,
                    }
                    for name, mode in self._modes.items()
                    for q in [self._queues.get(name) or _Queue()]
                },
            }
