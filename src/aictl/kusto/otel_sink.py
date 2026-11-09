"""OTLP export requests written to the OTel tables of a Kusto database, off the request's thread.

``submit`` turns one export request into JSON lines (``otel.convert_*``) and puts them
on the queue of their table. It never talks to the cluster, so a slow or throttling
cluster cannot hold up the tool that is exporting. One thread per table sends what has
gathered, at most ``LINGER_S`` after the first row arrived and sooner when a request's
worth is waiting: the four tables are written in parallel, each in few wide requests,
which is what a small cluster's streaming ingestion takes best.

Nothing is lost quietly:

- Rows the cluster refuses for now (throttling, a transient fault, no sign-in) stay
  queued and are sent again.
- A request the cluster refuses for good is sent once more after the tables were
  checked, then split until the row at fault is alone; that row is dropped, counted
  and logged, and the rest is stored.
- The queue is bounded. Past ``MAX_PENDING_BYTES`` a new request's rows are dropped
  and counted, so an unreachable cluster costs rows, never the daemon's memory.

A request repeated after a timeout may store a row twice; ``RowKey`` is the same for
both copies, so ``summarize take_any(*) by RowKey`` reads each row once.
"""

from __future__ import annotations

import logging
import socket
import threading
import time
from collections import deque
from typing import Any

from . import KustoSettings, otel
from .ingest import INLINE_MAX_BYTES, STREAMING_MAX_BYTES
from .schema import quote

log = logging.getLogger(__name__)

LINGER_S = 0.2
"""The longest a row waits for others before its request is sent."""
MAX_PENDING_BYTES = 64 * 1024 * 1024
"""Rows waiting or being sent, as bytes of JSON, over all tables."""
RETRY_WAIT_S = (2.0, 5.0, 15.0, 30.0, 60.0)
"""Waits after a request failed once the ingester's own retries were used up."""
_WARN_EVERY_S = 60.0

_CONVERTERS = {
    "logs": otel.convert_logs,
    "metrics": otel.convert_metrics,
    "traces": otel.convert_traces,
}


def refused_for_good(exc: BaseException) -> bool:
    """Whether the cluster says these rows can never be stored (bad data), not merely not now."""
    from .connection import _transient, schema_cache_behind

    if _transient(exc) or schema_cache_behind(exc):
        return False
    status = getattr(getattr(exc, "http_response", None), "status_code", None)
    return status in (400, 413)


class _Queue:
    """One table's waiting rows."""

    def __init__(self, lock: threading.Lock) -> None:
        self.lines: deque[str] = deque()
        self.size = 0  # bytes of the waiting lines
        self.first_at = 0.0  # when the oldest waiting line arrived
        self.ready = threading.Condition(lock)


class OtelSink:
    """Queues OTLP requests as rows and writes them to the OTel tables in the background."""

    def __init__(
        self,
        settings: KustoSettings,
        client: Any = None,
        ingester: Any = None,
        *,
        keep_text: bool = True,
        linger_s: float = LINGER_S,
        max_pending_bytes: int = MAX_PENDING_BYTES,
    ) -> None:
        self.settings = settings
        self.keep_text = keep_text
        self.linger_s = linger_s
        self.max_pending_bytes = max_pending_bytes
        self.host = socket.gethostname()
        self._client = client
        self._ingester = ingester
        self._lock = threading.Lock()
        self._queues = {t.name: _Queue(self._lock) for t in otel.TABLES}
        self._idle = threading.Condition(self._lock)
        self._threads: list[threading.Thread] = []
        self._closing = False
        self._pending_bytes = 0  # waiting and being sent
        self._pending_rows = 0
        self._tables_lock = threading.Lock()
        self._tables_ready = False
        self._warned_at = 0.0
        self._stats: dict[str, Any] = {
            "requests": 0,
            "convert_errors": 0,
            "rows_queued": 0,
            "rows_sent": 0,
            "rows_dropped_queue_full": 0,
            "rows_rejected": 0,
            "ingest_requests": 0,
            "ingest_failures": 0,
            "bytes_sent": 0,
            "last_sent_at": None,
            "last_error": None,
            "last_error_at": None,
        }
        self._converted: dict[str, int] = {}
        self._sent = dict.fromkeys(self._queues, 0)

    # ── The request's side ────────────────────────────────────────────

    def submit(self, signal: str, body: Any, received_ns: int | None = None) -> None:
        """Queue one OTLP export request (``logs``, ``metrics`` or ``traces``). Never raises."""
        try:
            converted = _CONVERTERS[signal](
                body, received_ns=received_ns or time.time_ns(), host=self.host, keep_text=self.keep_text
            )
            lines = {name: [otel.json_line(r) for r in rows] for name, rows in converted.rows.items() if rows}
        except Exception:  # noqa: BLE001 - this path is extra; the receiver's own store must not see its faults
            log.exception("OTel %s request could not be converted for Kusto", signal)
            with self._lock:
                self._stats["convert_errors"] += 1
            return
        size = sum(len(line) for group in lines.values() for line in group)
        count = sum(len(group) for group in lines.values())
        with self._lock:
            self._stats["requests"] += 1
            for key, value in converted.stats.items():
                if value:
                    self._converted[key] = self._converted.get(key, 0) + value
            if not count or self._closing:
                return
            if self._pending_bytes + size > self.max_pending_bytes:
                self._stats["rows_dropped_queue_full"] += count
                self._warn(
                    "OTel rows for Kusto dropped: %d MB are already waiting for the cluster",
                    self._pending_bytes // (1024 * 1024),
                )
                return
            self._pending_bytes += size
            self._pending_rows += count
            self._stats["rows_queued"] += count
            now = time.monotonic()
            for name, group in lines.items():
                q = self._queues[name]
                if not q.lines:
                    q.first_at = now
                q.lines.extend(group)
                q.size += sum(len(line) for line in group)
                q.ready.notify()
            if not self._threads:
                self._start()

    def stats(self) -> dict[str, Any]:
        """Counters since the daemon started, and what is waiting now."""
        with self._lock:
            return {
                **self._stats,
                "pending_rows": self._pending_rows,
                "pending_bytes": self._pending_bytes,
                "converted": dict(self._converted),
                "tables": {
                    name: {
                        "ingestion": self.settings.ingestion_mode(name),
                        "rows_sent": self._sent[name],
                        "rows_waiting": len(q.lines),
                    }
                    for name, q in self._queues.items()
                },
            }

    def flush(self, timeout: float = 30.0) -> bool:
        """Wait until every queued row is stored or dropped. False when *timeout* passed first."""
        deadline = time.monotonic() + timeout
        with self._lock:
            while self._pending_rows:
                left = deadline - time.monotonic()
                if left <= 0:
                    return False
                self._idle.wait(left)
        return True

    def close(self, timeout: float = 5.0) -> None:
        """Send what is waiting, for at most *timeout* seconds, and stop the threads."""
        with self._lock:
            self._closing = True
            for q in self._queues.values():
                q.ready.notify_all()
            self._idle.notify_all()
            threads = list(self._threads)
        deadline = time.monotonic() + timeout
        for t in threads:
            t.join(max(0.0, deadline - time.monotonic()))
        with self._lock:
            if self._pending_rows:
                log.warning("%d OTel rows were not written to Kusto before the daemon stopped", self._pending_rows)

    # ── The cluster's side ────────────────────────────────────────────

    def _start(self) -> None:
        for name in self._queues:
            t = threading.Thread(target=self._run, args=(name,), name=f"aictl-kusto-{name}", daemon=True)
            self._threads.append(t)
            t.start()

    def _warn(self, message: str, *args: Any) -> None:
        now = time.monotonic()
        if now - self._warned_at >= _WARN_EVERY_S or not self._warned_at:
            self._warned_at = now
            log.warning(message, *args)

    def _batch_bytes(self, table: str) -> int:
        # One request per batch: a batch sent in two requests could be half stored when it fails.
        return STREAMING_MAX_BYTES if self.settings.ingestion_mode(table) == "streaming" else INLINE_MAX_BYTES - 1024

    def _take(self, table: str) -> list[str] | None:
        """The next batch of *table*, waiting for rows to gather. None when the sink is closed and empty."""
        q = self._queues[table]
        limit = self._batch_bytes(table)
        with self._lock:
            while not q.lines:
                if self._closing:
                    return None
                q.ready.wait()
            while q.size < limit and not self._closing:
                left = q.first_at + self.linger_s - time.monotonic()
                if left <= 0:
                    break
                q.ready.wait(left)
            batch = [q.lines.popleft()]
            size = len(batch[0]) + 1
            while q.lines and size + len(q.lines[0]) + 1 <= limit:
                line = q.lines.popleft()
                batch.append(line)
                size += len(line) + 1
            q.size -= sum(len(line) for line in batch)
            return batch

    def _run(self, table: str) -> None:
        q = self._queues[table]
        failures = 0
        while True:
            batch = self._take(table)
            if batch is None:
                return
            again = self._deliver(table, batch)
            if not again:
                failures = 0
                continue
            with self._lock:
                q.lines.extendleft(reversed(again))
                q.size += sum(len(line) for line in again)
                if self._closing:
                    return  # one try at shutdown; ``close`` reports what stayed behind
                wait = RETRY_WAIT_S[min(failures, len(RETRY_WAIT_S) - 1)]
                failures += 1
                # Not ``q.ready``: new rows must not cut the wait short.
                self._idle.wait_for(lambda: self._closing, wait)

    def _deliver(self, table: str, lines: list[str], checked: bool = False) -> list[str]:
        """Send *lines* as one request. Returns the lines to send again later."""
        size = sum(len(line) for line in lines)
        try:
            self._ensure_tables()
        except Exception as exc:  # noqa: BLE001 - a setup failure says nothing about the rows: keep them
            self._failed(table, exc, "OTel tables could not be prepared; %d rows are kept", len(lines))
            return lines
        try:
            self._ingest(table, lines)
        except Exception as exc:  # noqa: BLE001 - whatever the SDK raises, the rows are kept or accounted for
            from .connection import schema_cache_behind

            if schema_cache_behind(exc):
                # The table is gone or a node has not seen it: look again before the next try.
                self._tables_ready = False
            if not refused_for_good(exc):
                self._failed(table, exc, "Kusto did not take %d OTel rows; they are kept and sent again", len(lines))
                return lines
            message = self._failed(table, exc)
            if not checked:
                # The refusal may be about the table (dropped, a column changed), not the rows.
                self._tables_ready = False
                return self._deliver(table, lines, checked=True)
            if len(lines) == 1:
                log.warning("Kusto refused one %s row of %d bytes for good (%s); it is dropped", table, size, message)
                with self._lock:
                    self._stats["rows_rejected"] += 1
                self._settle(1, size)
                return []
            half = len(lines) // 2
            return self._deliver(table, lines[:half], True) + self._deliver(table, lines[half:], True)
        with self._lock:
            self._stats["ingest_requests"] += 1
            self._stats["rows_sent"] += len(lines)
            self._stats["bytes_sent"] += size
            self._stats["last_sent_at"] = time.time()
            self._sent[table] += len(lines)
        self._settle(len(lines), size)
        return []

    def _failed(self, table: str, exc: BaseException, warning: str = "", *args: Any) -> str:
        """Count a failed request and keep its first line for ``stats``."""
        from .connection import _server_message

        text = _server_message(exc).strip()
        message = text.splitlines()[0][:300] if text else type(exc).__name__
        with self._lock:
            self._stats["ingest_failures"] += 1
            self._stats["last_error"] = f"{table}: {message}"
            self._stats["last_error_at"] = time.time()
        if warning:
            self._warn(f"{table}: {warning} (%s)", *args, message)
        return message

    def _settle(self, rows: int, size: int) -> None:
        """*rows* left the sink, stored or dropped."""
        with self._lock:
            self._pending_rows -= rows
            self._pending_bytes -= size
            if not self._pending_rows:
                self._idle.notify_all()

    def _ingest(self, table: str, lines: list[str]) -> None:
        if self._ingester is None:
            from .connection import KustoClientFactory

            self._ingester = KustoClientFactory.ingester(self.settings)
        self._ingester.ingest_lines(table, lines)

    def _mgmt(self, command: str) -> list[dict[str, Any]]:
        from .connection import KustoClientFactory, retrying

        if self._client is None:
            self._client = KustoClientFactory.client(self.settings)
        response = retrying(lambda: self._client.execute_mgmt(self.settings.database, command), "OTel table setup")
        table = response.primary_results[0]
        names = [c.column_name for c in table.columns]
        return [dict(zip(names, row, strict=False)) for row in table]

    def _ensure_tables(self) -> None:
        """Create or widen the OTel tables, once per start and again after one went missing."""
        if self._tables_ready:
            return
        with self._tables_lock:
            if self._tables_ready:
                return
            have: dict[str, set[str]] = {}
            for row in self._mgmt(".show database schema | project TableName, ColumnName"):
                columns = have.setdefault(str(row["TableName"]), set())
                if row["ColumnName"]:
                    columns.add(str(row["ColumnName"]))
            changed = False
            for table, create, document in zip(
                otel.TABLES, otel.create_commands(), otel.docstring_commands(), strict=True
            ):
                if table.name in have and {c.name for c in table.columns} <= have[table.name]:
                    continue
                self._mgmt(create)
                self._mgmt(document)
                changed = True
            if any(self.settings.ingestion_mode(t.name) == "streaming" for t in otel.TABLES):
                # Table policies inherit the database's; the store's own setup issues the same command.
                self._mgmt(f".alter database {quote(self.settings.database)} policy streamingingestion enable")
                if changed:
                    # Every node must read the new tables before rows are streamed in (see
                    # KustoConnection._clear_streaming_schema_cache). Without the role for it
                    # the first requests are refused and sent again until the nodes catch up.
                    try:
                        self._mgmt(".clear database cache streamingingestion schema")
                    except Exception as exc:  # noqa: BLE001 - ingestion works without it, later
                        log.warning("Kusto streaming schema cache was not cleared: %s", str(exc)[:300])
            self._tables_ready = True
