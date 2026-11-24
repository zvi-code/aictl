"""Bounded ingestion queues. The daemon schedules flushes outside collector threads."""

from __future__ import annotations

import hashlib
import json
import logging
import math
import threading
import time
from collections import deque
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from ..base import InvalidRowError, Row, StoreError
from .client import next_version, retrying, schema_cache_behind
from .current import untimed_tombstone
from .ingest import RowIngester, json_line
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
        # A collector's 0/1 flag is a bool; the writer stores it as one (stored_value).
        return isinstance(value, bool) or (type(value) is int and value in (0, 1))
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
        # Collectors keep times as epoch seconds; the writer stores them as UTC datetimes.
        return type(value) in (float, int) and math.isfinite(value) and _EPOCH_MIN <= value <= _EPOCH_MAX
    return kind == "dynamic"


# The epoch seconds a time column accepts: 1970 to 2200. A time outside is a unit error
# (milliseconds), which the writer refuses rather than storing a date centuries away.
_EPOCH_MIN = 0.0
_EPOCH_MAX = 7_258_118_400.0


def epoch_datetime(seconds: float) -> str:
    """Epoch seconds as the ISO UTC text Kusto ingests into a ``datetime`` column, to the microsecond.

    The one conversion of a time at ingest: equal floats give equal text, so a time in a key stays
    one key."""
    us = round(seconds * 1_000_000)
    stamp = datetime.fromtimestamp(us // 1_000_000, tz=timezone.utc).replace(microsecond=us % 1_000_000, tzinfo=None)
    return stamp.isoformat(timespec="microseconds") + "Z"


def stored_value(value: Any, kind: str) -> Any:
    """*value*, valid for a column of *kind* (``_column_type``), as it is stored: epoch seconds as a UTC
    datetime, a 0/1 flag as a bool, JSON text in a ``dynamic`` column as its structure."""
    if value is None:
        return None
    if kind == "datetime" and type(value) in (float, int):
        return epoch_datetime(value)
    if kind == "bool":
        return bool(value)
    if kind == "dynamic" and isinstance(value, (str, bytes)):
        if not value:
            return None
        try:
            return json.loads(value)
        except ValueError:
            # Not JSON: keep the text as a JSON string value rather than lose it.
            return value
    return value


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
        """Store tombstones. Each row is the last known version of the row it deletes, or at least
        its key and the table's ``tombstone_scope`` columns; the tombstone keeps every column given."""
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
        input_columns = set(columns) - owned
        for row in rows:
            with self._lock:
                if self._closed:
                    return
                line = self._encode(name, table, row, columns, input_columns, delete=delete)
                ts = None
                if spec := TRIM_TIMESTAMPS.get(name):
                    ts = row.get(spec[0])
                    if isinstance(ts, str):
                        ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if isinstance(ts, datetime):
                        ts = (ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)).timestamp()
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
        if delete and (missing := [column for column in table.tombstone_scope if column not in row]):
            # A view that filters on these before it reduces versions would drop a tombstone
            # without them, and the deleted row would show again.
            raise InvalidRowError(f"{name}: a tombstone carries {', '.join(missing)} of the row it deletes")
        if delete and (problem := untimed_tombstone(name, row)):
            raise InvalidRowError(problem)
        for column in table.key:
            if column == "node_id":
                continue
            value = row.get(column)
            # Node-wide rows need no project. Some facts need no agent or source, and the
            # total of a context report is the item of its kind that has no name.
            if value is None or (
                value == "" and column != "project"
                and (name, column) not in {("session_context_items", "agent_id"), ("session_context_items", "name"),
                                           ("data_quality_status", "source"), ("session_files", "agent_id"),
                                           ("session_files", "tool_name"), ("session_digests", "agent_id")}
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
        record.update({column: stored_value(value, columns[column]) for column, value in row.items()})
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

    def pace(self) -> None:
        """Flush queued rows when a table reaches half its budget; fail if it stays crowded."""
        if not self._capture or self._ingester is None:
            return
        with self._lock:
            crowded = any(
                len(q.rows) * 2 >= self._max_rows or q.size * 2 >= self._max_bytes
                for q in self._queues.values()
            )
        if not crowded:
            return
        self.flush()
        with self._lock:
            for q in self._queues.values():
                if (len(q.rows) * 2 >= self._max_rows or q.size * 2 >= self._max_bytes) and q.error:
                    raise StoreError(q.error)

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
