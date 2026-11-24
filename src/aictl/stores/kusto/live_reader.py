"""A shared, read-only invalidation feed from query-visible Kusto data.

The hub owns UI snapshots, entity revisions and replay. This reader supplies
bounded identity/version hints, not a second history store. Its bootstrap cursor
is captured before consumers start their baseline queries. Cursor ranges are
drained completely before their checkpoints advance.

Cursor assignment follows query visibility, and streaming rows can precede their
cursor by up to 60 seconds. A recent/null-ingestion-time preview reduces that
delay; it is not a correctness watermark. Rotating reconciliation also covers
old policy-less rows, extent moves and physical retention/deletion. See
``docs/kusto-live-reader.md`` for the guarantees and limits.
"""

from __future__ import annotations

import base64
import json
import math
import os
import threading
import time
import uuid
from collections import OrderedDict, deque
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from ...kusto import KustoSettings, engine_url
from .client import ROWID, VERSION, KustoClientFactory, Result, kql_literal, quote
from .tables import TABLES, Table

DELETED = "_deleted"
# How long table-mode polls probe in groups after the cluster refused the one-query probe for lack of memory.
GROUPED_PROBE_S = 300.0
NODE = "node_id"

# Tables this node's daemon writes on a timer whether or not any AI tool is working: a change in
# one of them alone does not make the feed poll fast. It is still published like any other change.
BACKGROUND_TABLES = frozenset({
    "metrics", "OTELMetrics", "system_snapshots", "process_snapshots", "data_quality_status",
    "datapoint_catalog", "maintenance_state", "schema_version",
})


@dataclass(frozen=True)
class ReaderConfig:
    page_size: int = 250
    queries_per_poll: int = 4
    min_poll_s: float = 0.5
    max_idle_s: float = 15.0
    max_error_s: float = 60.0
    query_timeout_s: float = 15.0
    preview_lookback_s: float = 120.0
    preview_interval_s: float = 2.0
    schema_refresh_s: float = 600.0
    policy_refresh_s: float = 600.0
    reconcile_interval_s: float = 300.0
    reconcile_partitions: int = 8
    subscriber_batches: int = 16
    max_subscribers: int = 64
    dedup_entities: int = 8192
    dedup_bytes: int = 4_000_000
    result_bytes: int = 4_000_000
    query_memory_bytes: int = 512 * 1024**2
    failures_before_resync: int = 3
    tables_per_probe: int = 4
    probe_memory_bytes: int | None = None
    iterator_memory_bytes: int = 128 * 1024**2
    # Per-row identity hints (key and winner pages per changed table). Off, the feed is a table
    # invalidation feed: one query per poll captures the cursor, probes every table and previews
    # the streaming tables, and the dashboard, which rebuilds from its views, gets the same signal.
    row_hints: bool = False
    # Table mode: the poll interval while nothing but background tables changes, and while the
    # store is busy (a local write, or a change the probe saw in a table that is not background).
    idle_poll_s: float = 12.0
    busy_poll_s: float = 2.0
    busy_window_s: float = 30.0
    # Streaming and background tables are large and probed less often (see _due_tables).
    slow_poll_s: float = 30.0
    background_poll_s: float = 60.0
    table_reconcile_s: float = 900.0
    # A local write through queued ingestion becomes visible minutes after it is acknowledged.
    queued_window_s: float = 300.0

    def __post_init__(self) -> None:
        for name, value in vars(self).items():
            if name == "probe_memory_bytes" and value is None or type(value) is bool:
                continue
            if value <= 0:
                raise ValueError(f"{name} must be positive")
        if self.max_idle_s < self.min_poll_s:
            raise ValueError("max_idle_s must be at least min_poll_s")
        if self.idle_poll_s < self.busy_poll_s:
            raise ValueError("idle_poll_s must be at least busy_poll_s")

    @classmethod
    def from_env(cls) -> ReaderConfig:
        value = os.getenv("AICTL_KUSTO_LIVE_PROBE_MEMORY_MIB")
        if value is None:
            return cls()
        if not value.isascii() or not value.isdecimal() or int(value) == 0:
            raise ValueError("AICTL_KUSTO_LIVE_PROBE_MEMORY_MIB must be a positive integer in MiB")
        return cls(probe_memory_bytes=int(value) * 1024**2)


@dataclass(frozen=True)
class KustoRow:
    table: str
    key: tuple[Any, ...]
    version: str | None
    deleted: bool
    # Identity and scope only. Never includes prompts, content, arguments or configuration values.
    data: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ReaderBatch:
    kind: str
    rows: tuple[KustoRow, ...] = ()
    changed_tables: tuple[str, ...] = ()
    frontier: dict[str, str] = field(default_factory=dict)
    ready: bool = False
    stale: bool = False
    reason: str | None = None
    sequence: int = 0
    details: dict[str, Any] = field(default_factory=dict)
    # Changes only to tables written on a timer (BACKGROUND_TABLES): nothing a session flow shows.
    background: bool = False


@dataclass(frozen=True)
class _Spec:
    name: str
    key: tuple[str, ...] = ()
    metadata: tuple[str, ...] = ()
    first_key_type: str = "long"
    tombstone: str | None = None

    @property
    def versioned(self) -> bool:
        return bool(self.key)

    @property
    def key_expression(self) -> str:
        return "base64_encode_tostring(tostring(pack_array(" + ", ".join(quote(k) for k in self.key) + ")))"


@dataclass
class _Scan:
    table: str
    kind: str
    lower: str = ""
    upper: str = ""
    after: str = ""
    anchor: str = ""
    partition: int = 0
    page_size: int | None = None
    # One page of (encoded key, native first column) awaiting its winner lookup.
    pending: tuple[tuple[str, Any], ...] = ()
    lookahead: bool = False


class ReaderQueryError(RuntimeError):
    """A failed or incomplete read. Its page and cursor must not be committed."""


class _QueryMemoryError(ReaderQueryError):
    """ADX could not allocate memory to complete this query."""


@dataclass
class _CursorRetry:
    scan: _Scan
    due: float
    delay: float


class ReaderSubscription:
    """A bounded mailbox; slow consumers cannot stop the destination reader."""

    def __init__(self, reader: SharedKustoReader, callback: Callable[[ReaderBatch], None] | None = None) -> None:
        self._reader = reader
        self._callback = callback
        self._condition = threading.Condition()
        self._queue: deque[ReaderBatch] = deque()
        self._closed = False
        self._offered_sequence = -1
        self._thread: threading.Thread | None = None

    def _offer(self, batch: ReaderBatch) -> None:
        with self._condition:
            if self._closed or batch.sequence <= self._offered_sequence:
                return
            self._offered_sequence = batch.sequence
            if len(self._queue) >= self._reader.config.subscriber_batches:
                self._queue.clear()
                batch = replace(
                    batch,
                    kind="resync",
                    rows=(),
                    changed_tables=self._reader.table_names,
                    reason="subscriber_overflow",
                )
            self._queue.append(batch)
            self._condition.notify()

    def get(self, timeout: float | None = None) -> ReaderBatch | None:
        with self._condition:
            self._condition.wait_for(lambda: self._queue or self._closed, timeout)
            return self._queue.popleft() if self._queue else None

    def _dispatch(self) -> None:
        while not self._closed:
            batch = self.get()
            if batch is None:
                return
            try:
                if self._callback is not None:
                    self._callback(batch)
            except Exception:  # noqa: BLE001 - consumer recovery must not stop Kusto reads
                reset = replace(
                    self._reader.latest_status(),
                    kind="resync",
                    changed_tables=self._reader.table_names,
                    reason="subscriber_error",
                )
                try:
                    if self._callback is not None:
                        self._callback(reset)
                except Exception:  # noqa: BLE001 - a broken callback cannot retry itself without a bound
                    self.close()
                    return

    def close(self) -> None:
        with self._condition:
            self._closed = True
            self._queue.clear()
            self._condition.notify_all()
        self._reader._unsubscribe(self)
        if self._thread is not None and self._thread is not threading.current_thread():
            self._thread.join(timeout=1)

    def __enter__(self) -> ReaderSubscription:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


def node_predicate(node_id: str) -> str:
    return f"{quote(NODE)} == {json.dumps(node_id, ensure_ascii=True)}"


def _specs(tables: Mapping[str, Table]) -> dict[str, _Spec]:
    result = {}
    for name, table in tables.items():
        columns = dict(table.columns)
        metadata = tuple(
            dict.fromkeys((*table.key, *(n for n in (ROWID, "session_id", "project_path") if n in columns)))
        )
        # Node scope is already fixed. Use the first data key for pagination.
        key = tuple(k for k in table.key if k not in ("project", NODE)) + tuple(
            k for k in table.key if k in ("project", NODE)
        )
        result[name] = _Spec(name, key, metadata, columns[key[0]] if key else "long", table.tombstone)
    return result


def _text(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


class SharedKustoReader:
    """One bounded query worker and subscription fan-out for one destination.

    ``poll_once`` permits deterministic embedding/tests; ``start`` runs the same
    work on its own thread, never the runtime collector or an HTTP request thread.
    Consumers must rebuild affected projections on bootstrap/resync, including
    resync batches without row hints. Source ``_v`` values are not UI revisions.
    """

    def __init__(
        self,
        settings: KustoSettings,
        *,
        config: ReaderConfig | None = None,
        client: Any = None,
        tables: Mapping[str, Table] | None = None,
        table_names: Iterable[str] | None = None,
    ) -> None:
        self.settings = settings
        self.config = config or ReaderConfig.from_env()
        self._client = client
        self._known = _specs(TABLES if tables is None else tables)
        if tables is None:
            from .otel import TABLES as OTEL_TABLES

            self._known.update({t.name: _Spec(t.name) for t in OTEL_TABLES})
        requested = set(self._known) if table_names is None else set(table_names)
        unknown = requested - self._known.keys()
        if unknown:
            raise ValueError("Unknown managed Kusto tables: " + ", ".join(sorted(unknown)))
        self._requested = tuple(sorted(requested))
        self._available: dict[str, _Spec] | None = None
        # The physical tables behind each logical name: itself, or one table per node (nodes.py).
        self._physical: dict[str, tuple[str, ...]] = {}
        self._policies: deque[str] = deque()
        self._cursor_tables: set[str] = set()
        self._policy_checked: dict[str, bool] = {}
        self._policy_checked_at: dict[str, float] = {}
        self._frontier: dict[str, str] = {}
        self._seeded = self._ready = self._stale = self._closed = False
        self._reason: str | None = "starting"
        self._server_now = ""
        self._last_cursor = ""
        self._schema_next = self._policy_next = 0.0
        self._last_query_at: float | None = None
        self._query_successes = 0
        self._last_reconcile_at: dict[str, float] = {}
        self._reconciled_partitions: dict[str, set[int]] = {}
        self._sequence = self._failures = 0
        self._ranges: deque[_Scan] = deque()
        self._cursor_retries: dict[str, _CursorRetry] = {}
        self._preview: _Scan | None = None
        self._preview_index = 0
        self._preview_next = 0.0
        self._preview_stamps: dict[str, tuple[Any, ...]] = {}
        self._reconcile: _Scan | None = None
        self._reconcile_index = 0
        self._reconcile_next = 0.0
        self._capture_next = 0.0
        self._lane = 0
        self._dedup: OrderedDict[tuple[str, str], tuple[str, int]] = OrderedDict()
        self._dedup_bytes = 0
        self._idle_delay = self.config.min_poll_s
        # Table mode: when the next probe and reconciliation are due, and until when the store is busy.
        self._tick_next = 0.0
        self._busy_until = 0.0
        # Until when every table-mode poll probes in groups: the cluster refused the one-query probe for memory.
        self._grouped_until = 0.0
        self._slow_next = self._background_next = self._local_next = 0.0
        self._still = False
        # Until when each table this process wrote to is probed (and previewed) on every poll.
        self._local_until: dict[str, float] = {}
        self._counts: dict[str, tuple[Any, ...]] = {}
        self._lock = threading.RLock()
        self._poll_lock = threading.Lock()
        self._subscriptions: set[ReaderSubscription] = set()
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread: threading.Thread | None = None
        self._emitted: list[ReaderBatch] | None = None

    @property
    def table_names(self) -> tuple[str, ...]:
        return tuple(self._available) if self._available is not None else self._requested

    def capabilities(self) -> dict[str, Any]:
        with self._lock:
            return {
                "queryable_only": True,
                "node_id": self.settings.node_id,
                "available_tables": list(self.table_names),
                "missing_tables": sorted(set(self._requested) - set(self.table_names)),
                "cursor_tables": sorted(self._cursor_tables),
                "reconciliation_only_tables": sorted(set(self.table_names) - self._cursor_tables - set(self._policies))
                if self._seeded
                else [],
                "policy_check_pending": len(self._policies),
                "policy_checked_at": dict(self._policy_checked_at),
                "row_payload": "identity_and_scope_only" if self.config.row_hints else "none",
                "mode": "row_hints" if self.config.row_hints else "tables",
                "busy": time.monotonic() < self._busy_until,
                "streaming_cursor_lag": "Cursor assignment may follow queryable streaming data by up to 60 seconds.",
                "preview_is_checkpoint": False,
                "cursor_guarantees": "Direct ingestion with ingestiontime enabled at original ingestion only.",
                "reconciliation_target_s": self.config.reconcile_interval_s,
                "schema_refresh_target_s": self.config.schema_refresh_s,
                "reconciliation_completed_at": dict(self._last_reconcile_at),
                "last_query_completed_at": self._last_query_at,
                "catching_up": self._catching_up(),
                "cursor_memory_retry_tables": sorted(self._cursor_retries),
                "limits": {
                    "page_rows": self.config.page_size,
                    "queries_per_poll": self.config.queries_per_poll,
                    "tables_per_probe": self.config.tables_per_probe,
                    "query_memory_bytes": self.config.query_memory_bytes,
                    "iterator_memory_bytes": self.config.iterator_memory_bytes,
                    "probe_memory_bytes": self.config.probe_memory_bytes or self.config.query_memory_bytes,
                    "subscriber_batches": self.config.subscriber_batches,
                    "dedup_entities": self.config.dedup_entities,
                    "dedup_bytes": self.config.dedup_bytes,
                    "result_bytes": self.config.result_bytes,
                    "max_idle_s": self.config.max_idle_s,
                },
            }

    def latest_status(self) -> ReaderBatch:
        with self._lock:
            return ReaderBatch(
                "status",
                frontier=dict(self._frontier),
                ready=self._ready,
                stale=self._stale or bool(self._cursor_retries),
                reason=self._reason or ("cursor_memory_retry" if self._cursor_retries else None),
                sequence=self._sequence,
                details=self.capabilities(),
            )

    def subscribe(self, callback: Callable[[ReaderBatch], None] | None = None) -> ReaderSubscription:
        with self._lock:
            if self._closed:
                raise RuntimeError("Kusto reader is closed")
            if len(self._subscriptions) >= self.config.max_subscribers:
                raise RuntimeError("Kusto reader subscriber limit reached")
            subscription = ReaderSubscription(self, callback)
            self._subscriptions.add(subscription)
            status = self.latest_status()
            subscription._offer(
                replace(status, kind="bootstrap", changed_tables=self.table_names) if self._seeded else status
            )
        if callback is not None:
            subscription._thread = threading.Thread(
                target=subscription._dispatch, name="aictl-kusto-subscriber", daemon=True
            )
            subscription._thread.start()
        self._wake.set()
        return subscription

    def _unsubscribe(self, subscription: ReaderSubscription) -> None:
        with self._lock:
            self._subscriptions.discard(subscription)
        self._wake.set()

    def start(self) -> None:
        with self._lock:
            if self._closed:
                raise RuntimeError("Kusto reader is closed")
            if self._thread is None:
                self._thread = threading.Thread(target=self._run, name="aictl-kusto-live", daemon=True)
                self._thread.start()

    def _run(self) -> None:
        while not self._stop.is_set():
            with self._lock:
                active = bool(self._subscriptions)
            if active:
                self.poll_once()
            self._wake.wait(self._next_wait() if active else self.config.max_idle_s)
            self._wake.clear()

    def _next_wait(self) -> float:
        """Seconds until the next query is due. Row-hint mode polls on its own backoff."""
        if self.config.row_hints or not self._ready or self._stale or self._cursor_retries:
            return self._idle_delay
        due = min(self._tick_next, self._reconcile_next, self._schema_next, self._policy_next)
        return min(self.config.idle_poll_s, max(0.0, due - time.monotonic()))

    def local_write(self, table: str) -> None:
        """This process stored rows in *table*: poll at the busy pace until they are visible.

        It does not publish anything or move a frontier; only a successful query does that.
        """
        if table in BACKGROUND_TABLES:
            return
        queued = self.settings.ingestion_mode(table) == "queued"
        window = self.config.queued_window_s if queued else self.config.busy_window_s
        with self._lock:
            until = time.monotonic() + window
            self._busy_until = max(self._busy_until, until)
            self._local_until[table] = max(self._local_until.get(table, 0.0), until)
            self._tick_next = 0.0
        self._wake.set()

    def close(self) -> None:
        with self._lock:
            self._closed = True
            subscriptions = tuple(self._subscriptions)
        self._stop.set()
        self._wake.set()
        for subscription in subscriptions:
            subscription.close()
        if self._thread is not None and self._thread is not threading.current_thread():
            self._thread.join(timeout=self.config.query_timeout_s + 2)

    def _publish(
        self,
        kind: str,
        *,
        rows: tuple[KustoRow, ...] = (),
        tables: tuple[str, ...] = (),
        reason: str | None = None,
    ) -> None:
        with self._lock:
            self._sequence += 1
            status = self.latest_status()
            batch = replace(
                status,
                kind=kind,
                rows=rows,
                changed_tables=tables,
                reason=reason if reason is not None else status.reason,
                sequence=self._sequence,
                background=kind == "changes" and bool(tables) and set(tables) <= BACKGROUND_TABLES,
            )
            subscriptions = tuple(self._subscriptions)
            if self._emitted is not None:
                self._emitted.append(batch)
        for subscription in subscriptions:
            subscription._offer(batch)

    def _execute(self, text: str, *, management: bool = False, memory_bytes: int | None = None,
                 operation: str = "read") -> list[dict[str, Any]]:
        from azure.kusto.data import ClientRequestProperties
        from azure.kusto.data.exceptions import KustoApiError, KustoMultiApiError

        props = ClientRequestProperties()
        props.client_request_id = f"aictl.live.{operation};{uuid.uuid4()}"
        props.set_option("servertimeout", timedelta(seconds=self.config.query_timeout_s))
        props.set_option("queryconsistency", "strongconsistency")
        props.set_option("query_results_cache_max_age", timedelta(0))
        props.set_option("request_readonly", True)
        props.set_option("request_readonly_hardline", True)
        props.set_option("deferpartialqueryfailures", False)
        props.set_option("truncationmaxsize", self.config.result_bytes)
        props.set_option(
            "truncationmaxrecords", 20_000 if management else max(2 + len(self._known), self.config.page_size + 1)
        )
        memory = memory_bytes or self.config.query_memory_bytes
        props.set_option("maxmemoryconsumptionperiterator", min(memory, self.config.iterator_memory_bytes))
        props.set_option("max_memory_consumption_per_query_per_node", memory)
        props.set_option("query_fanout_threads_percent", 1)
        if self._client is None:
            self._client = KustoClientFactory.client(self.settings)
        call = self._client.execute_mgmt if management else self._client.execute
        try:
            response = call(self.settings.database, text, props)
        except (KustoApiError, KustoMultiApiError) as exc:
            errors = exc.get_api_errors() if isinstance(exc, KustoMultiApiError) else [exc.get_api_error()]
            if errors and all(
                e.code == "LowMemoryCondition" or "E_LOW_MEMORY_CONDITION" in (e.description or "") for e in errors
            ):
                raise _QueryMemoryError("Kusto reported E_LOW_MEMORY_CONDITION") from exc
            raise
        if getattr(response, "errors_count", 0):
            raise ReaderQueryError("Kusto returned an incomplete result")
        if not response.primary_results:
            raise ReaderQueryError("Kusto returned no primary result")
        result = Result.from_response(response)
        if len(result.rows) > (20_000 if management else max(2 + len(self._known), self.config.page_size + 1)):
            raise ReaderQueryError("Kusto result exceeded the row budget")
        rows = result.dicts()
        if len(json.dumps(rows, default=str).encode("utf-8")) > self.config.result_bytes:
            raise ReaderQueryError("Kusto result exceeded the byte budget")
        self._last_query_at = time.time()
        self._query_successes += 1
        return rows

    def _discover(self) -> None:
        from . import nodes

        rows = self._execute(".show database schema | project TableName, ColumnName", management=True)
        columns: dict[str, set[str]] = {}
        physical: dict[str, set[str]] = {}
        for row in rows:
            name = str(row["TableName"])
            # A node table counts for its logical table, which a stored function of that name reads.
            node_table = nodes.parse(name, None, self._known)
            logical = node_table.logical if node_table is not None else name
            columns.setdefault(logical, set()).add(str(row["ColumnName"]))
            physical.setdefault(logical, set()).add(name)
        self._physical = {name: tuple(sorted(tables)) for name, tables in physical.items()}
        available = {}
        for name in self._requested:
            spec = self._known[name]
            required = {*spec.metadata, NODE, VERSION} if spec.versioned else {NODE}
            if spec.tombstone:
                required.add(spec.tombstone)
            if name in columns and required <= columns[name]:
                available[name] = spec
        with self._lock:
            previous = set(self._available) if self._available is not None else set()
            added = set(available) - previous
            removed = previous - set(available)
            self._available = available
            if self._seeded:
                for name in added:
                    self._frontier[name] = self._last_cursor
                for name in removed:
                    self._frontier.pop(name, None)
                    self._cursor_retries.pop(name, None)
                    self._cursor_tables.discard(name)
                    self._policy_checked.pop(name, None)
                    self._policy_checked_at.pop(name, None)
                    self._preview_stamps.pop(name, None)
                    self._last_reconcile_at.pop(name, None)
                    self._reconciled_partitions.pop(name, None)
                self._ranges = deque(scan for scan in self._ranges if scan.table in available)
                if self._preview is not None and self._preview.table not in available:
                    self._preview = None
                if self._reconcile is not None and self._reconcile.table not in available:
                    self._reconcile = None
                self._policies = deque(name for name in self._policies if name in available)
                self._policies.extend(sorted(added - set(self._policies)))
            self._schema_next = time.monotonic() + self.config.schema_refresh_s
        if self._seeded and (added or removed):
            self._publish("resync", tables=tuple(sorted(added | removed)), reason="schema_changed")

    def _seed(self) -> None:
        cursor, anchor = self._read_cursor()
        with self._lock:
            self._frontier = {name: cursor for name in self.table_names}
            self._server_now = anchor
            self._last_cursor = cursor
            self._policies = deque(self.table_names)
            self._policy_next = time.monotonic() + self.config.policy_refresh_s
            self._seeded = True
            self._reason = "policy_check"
        self._publish("bootstrap", tables=self.table_names)

    def _read_cursor(self) -> tuple[str, str]:
        rows = self._execute("print aictl_live_cursor=cursor_current(), aictl_live_now=tostring(now())")
        if len(rows) != 1 or rows[0].get("aictl_live_cursor") is None:
            raise ReaderQueryError("Missing or repeated cursor header")
        cursor = str(rows[0]["aictl_live_cursor"])
        anchor = datetime.fromisoformat(str(rows[0]["aictl_live_now"]).replace("Z", "+00:00")).isoformat()
        return cursor, anchor

    def _policy(self) -> None:
        name = self._policies[0]
        tables = self._physical.get(name, (name,))
        if tables == (name,):
            rows = self._execute(f".show table {quote(name)} policy ingestiontime", management=True)
            if len(rows) != 1 or "Policy" not in rows[0]:
                raise ReaderQueryError("Missing ingestiontime policy")
        else:
            # Node tables: the logical table has cursors only if every one of its tables has them.
            wanted = {f"].[{table}]" for table in tables}
            rows = [row for row in self._execute(".show table * policy ingestiontime", management=True)
                    if any(str(row.get("EntityName", "")).endswith(end) for end in wanted)]
            if len(rows) != len(tables) or any("Policy" not in row for row in rows):
                raise ReaderQueryError("Missing ingestiontime policy")
        policies = [json.loads(row["Policy"]) if isinstance(row["Policy"], str) else row["Policy"] for row in rows]
        with self._lock:
            enabled = all(isinstance(policy, dict) and policy.get("IsEnabled") is True for policy in policies)
            previous = self._policy_checked.get(name)
            if enabled:
                self._cursor_tables.add(name)
                self._frontier.setdefault(name, self._last_cursor)
            else:
                self._frontier.pop(name, None)
                self._cursor_retries.pop(name, None)
                self._cursor_tables.discard(name)
                self._ranges = deque(scan for scan in self._ranges if scan.table != name)
                if self._preview is not None and self._preview.table == name:
                    self._preview = None
            self._policy_checked[name] = enabled
            self._policy_checked_at[name] = time.time()
            self._policies.popleft()
        if previous is not None and previous != enabled:
            self._reconciled_partitions.pop(name, None)
            self._publish("resync", tables=(name,), reason="policy_changed")

    def _catching_up(self, *, runnable_only: bool = False) -> bool:
        names = self._cursor_tables - self._cursor_retries.keys() if runnable_only else self._cursor_tables
        return any(self._frontier[name] != self._last_cursor for name in names)

    def _defer_cursor(self, scans: list[_Scan]) -> None:
        now = time.monotonic()
        with self._lock:
            for scan in scans:
                previous = self._cursor_retries.pop(scan.table, None)
                delay = (
                    0.0
                    if len(scans) > 1
                    else min(
                        self.config.max_error_s, max(self.config.min_poll_s, 2 * previous.delay if previous else 0)
                    )
                )
                self._cursor_retries[scan.table] = _CursorRetry(scan, now + delay, delay)
                if self._preview and self._preview.table == scan.table:
                    self._preview = None
                if self._reconcile and self._reconcile.table == scan.table:
                    self._reconcile = None
        self._publish("status")

    def _detect(self, names: list[str], upper: str) -> None:
        # A non-null constant for a hit; toscalar on an empty int column yields null.
        flags = [
            f"{quote(name)}=isnotnull(toscalar({quote(name)} | where cursor_after({_text(self._frontier[name])})"
            f" and cursor_before_or_at({_text(upper)})"
            f" | where {node_predicate(self.settings.node_id)}"
            f" | project hit=1 | take 1))"
            for name in names
        ]
        try:
            rows = self._execute("print " + ",\n".join(flags), memory_bytes=self.config.probe_memory_bytes,
                                 operation="probe")
        except _QueryMemoryError:
            self._defer_cursor([_Scan(name, "probe", self._frontier[name], upper) for name in names])
            return
        if len(rows) != 1 or rows[0].keys() != set(names) or not all(isinstance(v, bool) for v in rows[0].values()):
            raise ReaderQueryError("Incomplete or unexpected cursor probe result")
        changed = rows[0]
        raw_changed = []
        recovered = False
        with self._lock:
            assert self._available is not None
            for name in names:
                if self._cursor_retries.pop(name, None) is not None:
                    recovered = True
                if changed[name] and self._available[name].versioned and self.config.row_hints:
                    self._ranges.append(_Scan(name, "cursor", self._frontier[name], upper))
                else:
                    self._frontier[name] = upper
                    if changed[name]:
                        raw_changed.append(name)
        if raw_changed:
            self._saw_changes(raw_changed)
            self._publish("changes", tables=tuple(raw_changed))
        elif recovered or not all(changed.values()):
            self._publish("status")

    def _key_page_query(self, spec: _Spec, scan: _Scan, limit: int) -> str:
        if scan.kind == "cursor":
            predicate = f"cursor_after({_text(scan.lower)}) and cursor_before_or_at({_text(scan.upper)})"
        elif scan.kind == "preview":
            predicate = f"isnull(ingestion_time()) or ingestion_time() >= ago({self.config.preview_lookback_s}s)"
        else:
            predicate = "true"
        partition = (
            f" | where hash(aictl_live_key, {self.config.reconcile_partitions}) == {scan.partition}"
            if scan.kind == "reconcile"
            else ""
        )
        return (
            f"{quote(spec.name)} | where {predicate} | where {node_predicate(self.settings.node_id)}"
            f" | project aictl_live_key={spec.key_expression}, aictl_live_first={quote(spec.key[0])}{partition}"
            f" | where strcmp(aictl_live_key, {_text(scan.after)}) > 0"
            f" | top {limit + 1} by aictl_live_key asc"
        )

    def _winner_query(self, spec: _Spec, scan: _Scan) -> str:
        # Filter the native column first (e.g. ts on metrics/events), then match the
        # exact composite identity. Neither filter evaluates a tabular IN subquery.
        first = quote(spec.key[0])
        values = {value for _, value in scan.pending}
        terms = []
        if None in values:
            terms.append(f"isnull({first})")
            values.remove(None)
        if any(isinstance(v, float) and math.isnan(v) for v in values):
            terms.append(f"isnan({first})")
            values = {v for v in values if not isinstance(v, float) or not math.isnan(v)}
        if values:
            literals = sorted(kql_literal(value, spec.first_key_type) for value in values)
            terms.append(f"{first} in ({', '.join(literals)})")
        tokens = ", ".join(_text(token) for token, _ in scan.pending)
        metadata = ", ".join(quote(n) for n in spec.metadata)
        columns = f"{quote(spec.tombstone)}, {metadata}" if spec.tombstone else metadata
        deleted = f"coalesce({quote(spec.tombstone)}, true)" if spec.tombstone else "false"
        return (
            f"{quote(spec.name)} | where {node_predicate(self.settings.node_id)} | where {' or '.join(terms)}"
            f" | extend aictl_live_key={spec.key_expression} | where aictl_live_key in ({tokens})"
            f" | summarize arg_max({quote(VERSION)}, {columns}) by aictl_live_key"
            f" | project aictl_live_key, aictl_live_version=tostring({quote(VERSION)}),"
            f" aictl_live_deleted={deleted}, {metadata}"
        )

    def _remember(self, row: KustoRow, token: str) -> bool:
        key = (row.table, token)
        fingerprint = json.dumps((row.version, row.deleted, row.data), sort_keys=True, default=str)
        previous = self._dedup.pop(key, None)
        if previous is not None:
            self._dedup_bytes -= previous[1]
        size = len(token.encode("utf-8")) + len(fingerprint.encode("utf-8")) + 128
        if size <= self.config.dedup_bytes:
            self._dedup[key] = (fingerprint, size)
            self._dedup_bytes += size
        while self._dedup and (
            len(self._dedup) > self.config.dedup_entities or self._dedup_bytes > self.config.dedup_bytes
        ):
            _, (_, removed) = self._dedup.popitem(last=False)
            self._dedup_bytes -= removed
        return previous is None or previous[0] != fingerprint

    def _page(self, scan: _Scan) -> bool:
        assert self._available is not None
        spec = self._available[scan.table]
        if not scan.pending:
            limit = scan.page_size or self.config.page_size
            raw = self._execute(self._key_page_query(spec, scan, limit), operation="keys")
            if len(raw) > limit + 1:
                raise ReaderQueryError("Kusto page exceeded the row budget")
            keys = {}
            for value in raw:
                token = value.get("aictl_live_key")
                if not isinstance(token, str) or token <= scan.after or "aictl_live_first" not in value:
                    raise ReaderQueryError("Invalid or non-advancing Kusto key page")
                keys[token] = value["aictl_live_first"]
            if keys:
                scan.pending = tuple(sorted(keys.items())[:limit])
                # top operates on versions, not distinct keys. Even a single repeated
                # key can fill the page while more identities remain beyond it.
                scan.lookahead = len(raw) == limit + 1
                return True

        keyed = {}
        if scan.pending:
            for value in self._execute(self._winner_query(spec, scan), operation="winners"):
                token = value.get("aictl_live_key")
                if not isinstance(token, str) or token in keyed:
                    raise ReaderQueryError("Invalid or repeated Kusto winner identity")
                keyed[token] = value
            if keyed.keys() - {token for token, _ in scan.pending}:
                raise ReaderQueryError("Unexpected Kusto winner identity")
        parsed = []
        for token, _ in scan.pending:
            value = keyed.get(token)
            native_key = json.loads(base64.b64decode(token, validate=True).decode("utf-8"))
            if not isinstance(native_key, list) or len(native_key) != len(spec.key):
                raise ReaderQueryError("Invalid native row identity")
            if value is None:
                continue  # Retention between requests requires a table refresh, not an invented tombstone.
            if (
                "aictl_live_version" not in value
                or not isinstance(value.get("aictl_live_deleted"), bool)
                or any(name not in value for name in spec.metadata)
            ):
                raise ReaderQueryError("Missing or invalid row metadata")
            parsed.append(
                (
                    token,
                    KustoRow(
                        spec.name,
                        tuple(native_key),
                        value["aictl_live_version"] or None,
                        value["aictl_live_deleted"],
                        {name: value.get(name) for name in spec.metadata},
                    ),
                )
            )
        more = scan.lookahead
        disappeared = len(parsed) != len(scan.pending)
        hints = () if disappeared else tuple(row for token, row in parsed if self._remember(row, token))
        if scan.pending:
            scan.after = scan.pending[-1][0]
            scan.pending = ()
            scan.lookahead = False
        if scan.kind == "cursor" and not more:
            with self._lock:
                self._frontier[scan.table] = scan.upper
        if disappeared:
            self._publish("resync", tables=(spec.name,), reason="key_disappeared")
        elif hints:
            self._publish("changes", rows=hints, tables=(spec.name,))
        elif scan.kind == "cursor" and not more:
            self._publish("status")
        return more

    def _cursor_page(self, scan: _Scan) -> bool:
        try:
            more = self._page(scan)
        except _QueryMemoryError:
            scan.page_size = max(1, (scan.page_size or self.config.page_size) // 2)
            if len(scan.pending) > scan.page_size:
                scan.pending = scan.pending[: scan.page_size]
                scan.lookahead = True
            self._defer_cursor([scan])
            return False
        if scan.pending:
            return True  # Discovery succeeded; a deferred page is not recovered until its lookup succeeds.
        with self._lock:
            recovered = self._cursor_retries.pop(scan.table, None) is not None
        if recovered:
            self._publish("status")
        return more

    def _retry_cursor_step(self) -> bool:
        now = time.monotonic()
        for retry in self._cursor_retries.values():
            if retry.due <= now:
                scan = retry.scan
                if scan.kind == "probe":
                    self._detect([scan.table], scan.upper)
                elif self._cursor_page(scan) and not scan.pending:
                    self._ranges.append(scan)
                return True
        return False

    def _cursor_step(self) -> bool:
        # A deferred table retains its own upper; do not hold healthy tables at that cursor.
        eligible = self._cursor_tables - self._cursor_retries.keys()
        scheduled = {scan.table for scan in self._ranges}
        pending = sorted(name for name in eligible - scheduled if self._frontier[name] != self._last_cursor)
        if pending:
            self._detect(pending[: self.config.tables_per_probe], self._last_cursor)
            return True
        if self._ranges:
            scan = self._ranges[0]
            more = self._cursor_page(scan)
            self._ranges.popleft()
            if more:
                self._ranges.append(scan)
            return True
        if (self._cursor_retries and not eligible) or time.monotonic() < self._capture_next:
            return False
        upper, anchor = self._read_cursor()
        if not upper and any(self._frontier.values()):
            raise ReaderQueryError("The database cursor was reset")
        with self._lock:
            self._last_cursor, self._server_now = upper, anchor
        self._capture_next = time.monotonic() + self._idle_delay
        return True

    def _preview_step(self) -> bool:
        assert self._available is not None
        names = sorted(self._cursor_tables - self._cursor_retries.keys())
        if not names or time.monotonic() < self._preview_next:
            return False
        if self._preview is None:
            name = names[self._preview_index % len(names)]
            self._preview_index += 1
            self._preview = _Scan(name, "preview", anchor=self._server_now)
        scan = self._preview
        spec = self._available[scan.table]
        if spec.versioned:
            more = self._page(scan)
        else:
            rows = self._execute(
                f"{quote(spec.name)} | where {node_predicate(self.settings.node_id)}"
                " | where isnull(ingestion_time()) or ingestion_time() >= "
                f"ago({self.config.preview_lookback_s}s)"
                " | summarize aictl_live_count=count(), aictl_live_latest=tostring(max(ingestion_time()))"
            )
            if len(rows) != 1 or "aictl_live_count" not in rows[0]:
                raise ReaderQueryError("Missing raw telemetry preview count")
            stamp = (rows[0]["aictl_live_count"], rows[0].get("aictl_live_latest"))
            previous = self._preview_stamps.get(spec.name)
            self._preview_stamps[spec.name] = stamp
            if stamp != previous and (stamp[0] or previous is not None):
                self._publish("changes", tables=(spec.name,))
            more = False
        if not more:
            self._preview = None
        if not scan.pending:
            self._preview_next = time.monotonic() + max(self.config.preview_interval_s, self._idle_delay)
        return True

    def _reconcile_step(self) -> bool:
        assert self._available is not None
        plan = [
            (name, part)
            for name, spec in self._available.items()
            if name not in self._cursor_retries
            for part in range(self.config.reconcile_partitions if spec.versioned else 1)
        ]
        if not plan or time.monotonic() < self._reconcile_next:
            return False
        if self._reconcile is None:
            name, partition = plan[self._reconcile_index % len(plan)]
            self._reconcile_index += 1
            self._reconcile = _Scan(name, "reconcile", partition=partition)
        scan = self._reconcile
        if self._available[scan.table].versioned:
            more = self._page(scan)
        else:
            rows = self._execute(f"{quote(scan.table)} | where {node_predicate(self.settings.node_id)} | summarize aictl_live_count=count()")
            if len(rows) != 1 or "aictl_live_count" not in rows[0]:
                raise ReaderQueryError("Missing reconciliation result")
            more = False
        if not more:
            with self._lock:
                parts = self._reconciled_partitions.setdefault(scan.table, set())
                parts.add(scan.partition)
                expected = self.config.reconcile_partitions if self._available[scan.table].versioned else 1
                if len(parts) == expected:
                    self._last_reconcile_at[scan.table] = time.time()
                    parts.clear()
            self._publish("resync", tables=(scan.table,), reason="reconcile")
            self._reconcile = None
        if not scan.pending:
            self._reconcile_next = time.monotonic() + self.config.reconcile_interval_s / len(plan)
        return True

    def _refresh_step(self) -> bool:
        now = time.monotonic()
        if now >= self._schema_next:
            self._discover()
            return True
        if now >= self._policy_next:
            with self._lock:
                self._policies = deque(self.table_names)
                self._policy_next = now + self.config.policy_refresh_s
            if self._policies:
                self._policy()
                return True
        return False

    # Table mode: one query per poll, and two rare ones (reconciliation, schema and policies).

    def _saw_changes(self, tables: Iterable[str]) -> None:
        if any(name not in BACKGROUND_TABLES for name in tables):
            with self._lock:
                self._busy_until = max(self._busy_until, time.monotonic() + self.config.busy_window_s)

    def _streaming(self, name: str) -> bool:
        try:
            return self.settings.ingestion_mode(name) == "streaming"
        except Exception:  # noqa: BLE001 - settings without per-table modes have no streaming tables
            return False

    def _due_tables(self, now: float) -> tuple[list[str], list[str]]:
        """The cursor tables this poll probes, and the streaming ones among them it previews.

        A probe arm reads its table's ingestion times however small its cursor range, so a large
        table costs a fraction of a CPU second each time: the tables a live board waits for are
        probed each poll, streaming tables (large, written every few seconds) every slow_poll_s,
        and the timer-written background tables every background_poll_s. A streaming table this
        process wrote to is probed and previewed every third busy poll while that write is recent."""
        names = sorted(self._cursor_tables - self._cursor_retries.keys())
        slow = now >= self._slow_next
        background = now >= self._background_next
        local_pass = now >= self._local_next
        due, previews = [], []
        for name in names:
            local = local_pass and now < self._local_until.get(name, 0.0)
            if name in BACKGROUND_TABLES:
                if background:
                    due.append(name)
            elif self._streaming(name):
                if slow or local:
                    due.append(name)
                if local:
                    previews.append(name)
            else:
                due.append(name)
        if slow:
            self._slow_next = now + self.config.slow_poll_s
        if background:
            self._background_next = now + self.config.background_poll_s
        if local_pass and previews:
            self._local_next = now + 3 * self.config.busy_poll_s
        return due, previews

    def _tick_step(self) -> bool:
        now = time.monotonic()
        if now < self._tick_next:
            return False
        names, previews = self._due_tables(now)
        # Even an arm that reads no table costs query planning: while the store is still (the last
        # poll found the cursor where it was), a cursor read alone says whether anything was stored.
        if (self._still and not previews and names
                and all(self._frontier[name] == self._last_cursor for name in names)):
            upper, anchor = self._read_cursor()
            with self._lock:
                self._server_now = anchor
            self._still = upper == self._last_cursor
            if self._still:
                busy = time.monotonic() < self._busy_until
                self._tick_next = time.monotonic() + (self.config.busy_poll_s if busy else self.config.idle_poll_s)
                return True
        before = self._last_cursor
        grouped = time.monotonic() < self._grouped_until
        try:
            if grouped:
                raise _QueryMemoryError("The cluster refused the one-query probe a short while ago")
            self._probe_all(names, previews)
        except _QueryMemoryError:
            # Too large for one query: capture the cursor alone and probe in groups, now and for the next
            # GROUPED_PROBE_S, so a cluster short of memory is not asked the refused query again on every poll.
            if not grouped:
                self._grouped_until = time.monotonic() + GROUPED_PROBE_S
            upper, anchor = self._read_cursor()
            with self._lock:
                self._last_cursor, self._server_now = upper, anchor
            for start in range(0, len(names), self.config.tables_per_probe):
                self._detect(names[start:start + self.config.tables_per_probe], upper)
        self._still = self._last_cursor == before
        busy = time.monotonic() < self._busy_until
        self._tick_next = time.monotonic() + (self.config.busy_poll_s if busy else self.config.idle_poll_s)
        return True

    def _probe_all(self, names: list[str], previews: list[str]) -> None:
        """Capture the cursor, probe *names* up to it and stamp the recent rows of *previews*.

        An arm reads its table only when the cursor moved past the table's frontier: with
        nothing stored anywhere, a poll reads no table."""
        node = node_predicate(self.settings.node_id)
        arms = ["aictl_live_cursor=aictl_upper", "aictl_live_now=tostring(now())"]
        for index, name in enumerate(names):
            lower = _text(self._frontier[name])
            arms.append(
                f"aictl_hit_{index}=aictl_upper != {lower} and isnotnull(toscalar({quote(name)}"
                f" | where aictl_upper != {lower} | where cursor_after({lower}) and cursor_before_or_at(aictl_upper)"
                f" | where {node} | project hit=1 | take 1))"
            )
        for index, name in enumerate(previews):
            # Streaming rows are queryable before their cursor is assigned (up to a minute later).
            arms.append(
                f"aictl_preview_{index}=toscalar({quote(name)} | where {node}"
                f" | where isnull(ingestion_time()) or ingestion_time() >= ago({self.config.preview_lookback_s}s)"
                " | summarize tostring(pack_array(count(), countif(isnull(ingestion_time())),"
                " tostring(max(ingestion_time())))))"
            )
        rows = self._execute(
            "let aictl_upper=cursor_current();\nprint " + ",\n".join(arms),
            memory_bytes=self.config.probe_memory_bytes, operation="probe",
        )
        expected = {"aictl_live_cursor", "aictl_live_now", *(f"aictl_hit_{i}" for i in range(len(names))),
                    *(f"aictl_preview_{i}" for i in range(len(previews)))}
        if len(rows) != 1 or rows[0].keys() != expected or rows[0].get("aictl_live_cursor") is None:
            raise ReaderQueryError("Incomplete or unexpected cursor probe result")
        row = rows[0]
        hits = [row[f"aictl_hit_{i}"] for i in range(len(names))]
        if not all(isinstance(hit, bool) for hit in hits):
            raise ReaderQueryError("Incomplete or unexpected cursor probe result")
        stamps = {}
        for index, name in enumerate(previews):
            try:
                stamp = json.loads(row[f"aictl_preview_{index}"])
                stamps[name] = (int(stamp[0]), int(stamp[1]), str(stamp[2] or ""))
            except (TypeError, ValueError, IndexError, KeyError) as exc:
                raise ReaderQueryError("Invalid streaming preview stamp") from exc
        upper = str(row["aictl_live_cursor"])
        if not upper and any(self._frontier.values()):
            raise ReaderQueryError("The database cursor was reset")
        anchor = datetime.fromisoformat(str(row["aictl_live_now"]).replace("Z", "+00:00")).isoformat()
        changed = [name for name, hit in zip(names, hits, strict=True) if hit]
        with self._lock:
            self._last_cursor, self._server_now = upper, anchor
            for name in names:
                self._frontier[name] = upper
            for name, stamp in stamps.items():
                previous = self._preview_stamps.get(name)
                self._preview_stamps[name] = stamp
                # New rows raise the count, the count without a cursor or the latest ingestion time;
                # rows that only age out of the window lower the count and are not a change.
                grew = stamp[0] > 0 if previous is None else (
                    stamp[0] > previous[0] or stamp[1] > previous[1] or stamp[2] > previous[2])
                if grew and name not in changed:
                    changed.append(name)
        if changed:
            self._saw_changes(changed)
            self._publish("changes", tables=tuple(sorted(changed)))

    def _reconcile_all_step(self) -> bool:
        """Physical deletion (retention, purges, dropped extents) and policy-less tables change no
        cursor: count each table's rows (for a cursor table, those its frontier already covers)."""
        assert self._available is not None
        if time.monotonic() < self._reconcile_next:
            return False
        names = sorted(name for name in self._available if name not in self._cursor_retries)
        node = node_predicate(self.settings.node_id)
        arms = []
        for index, name in enumerate(names):
            covered = (f" | where cursor_before_or_at({_text(self._frontier[name])})"
                       if name in self._cursor_tables else "")
            arms.append(
                f"aictl_count_{index}=toscalar({quote(name)} | where {node}{covered}"
                " | summarize tostring(pack_array(count(), tostring(max(ingestion_time())))))"
            )
        if arms:
            rows = self._execute("print " + ",\n".join(arms), operation="reconcile")
            if len(rows) != 1 or rows[0].keys() != {f"aictl_count_{i}" for i in range(len(names))}:
                raise ReaderQueryError("Missing reconciliation result")
            changed = []
            with self._lock:
                for index, name in enumerate(names):
                    try:
                        value = json.loads(rows[0][f"aictl_count_{index}"])
                        stamp = (int(value[0]), str(value[1] or ""))
                    except (TypeError, ValueError, IndexError) as exc:
                        raise ReaderQueryError("Invalid reconciliation result") from exc
                    previous = self._counts.get(name)
                    self._counts[name] = stamp
                    # A cursor table's covered rows only change when rows are removed; a table
                    # without cursors changes in any way.
                    if previous is not None and previous != stamp:
                        changed.append(name)
                    self._last_reconcile_at[name] = time.time()
            if changed:
                self._publish("resync", tables=tuple(changed), reason="reconcile")
        self._reconcile_next = time.monotonic() + self.config.table_reconcile_s
        return True

    def _policy_all(self) -> None:
        """Every table's ingestion-time policy in one read-only command."""
        rows = self._execute(".show table * policy ingestiontime", management=True)
        by_table: dict[str, Any] = {}
        for row in rows:
            entity = str(row.get("EntityName", ""))
            by_table[entity.rpartition("].[")[2].rstrip("]")] = row.get("Policy")
        names = list(self.table_names)
        flipped = []
        with self._lock:
            for name in names:
                policies = [by_table.get(table) for table in self._physical.get(name, (name,))]
                parsed = [json.loads(p) if isinstance(p, str) else p for p in policies]
                enabled = all(isinstance(p, dict) and p.get("IsEnabled") is True for p in parsed)
                previous = self._policy_checked.get(name)
                if enabled:
                    self._cursor_tables.add(name)
                    self._frontier.setdefault(name, self._last_cursor)
                else:
                    self._frontier.pop(name, None)
                    self._cursor_retries.pop(name, None)
                    self._cursor_tables.discard(name)
                self._policy_checked[name] = enabled
                self._policy_checked_at[name] = time.time()
                if previous is not None and previous != enabled:
                    flipped.append(name)
            self._policies.clear()
            self._policy_next = time.monotonic() + self.config.policy_refresh_s
        for name in flipped:
            self._counts.pop(name, None)
            self._publish("resync", tables=(name,), reason="policy_changed")

    def _table_refresh_step(self) -> bool:
        now = time.monotonic()
        if now >= self._schema_next:
            self._discover()
            return True
        if now >= self._policy_next:
            self._policy_all()
            return True
        return False

    def _reset(self) -> None:
        with self._lock:
            self._ready = self._seeded = False
            self._available = None
            self._policies.clear()
            self._cursor_tables.clear()
            self._policy_checked.clear()
            self._policy_checked_at.clear()
            self._frontier.clear()
            self._ranges.clear()
            self._cursor_retries.clear()
            self._preview = self._reconcile = None
            self._preview_stamps.clear()
            self._reconciled_partitions.clear()
            self._dedup.clear()
            self._dedup_bytes = 0
            self._capture_next = self._preview_next = self._reconcile_next = 0.0
            self._schema_next = self._policy_next = 0.0
            self._tick_next = self._slow_next = self._background_next = self._local_next = 0.0
            self._counts.clear()
        self._publish("resync", tables=self._requested, reason="reader_recovery")

    def poll_once(self) -> tuple[ReaderBatch, ...]:
        with self._poll_lock:
            if self._closed:
                return ()
            self._emitted = []
            successes_before = self._query_successes
            try:
                for _ in range(self.config.queries_per_poll):
                    if self._stop.is_set():
                        break
                    if self._available is None:
                        self._discover()
                    elif not self._seeded:
                        self._seed()
                    elif self._policies:
                        if self.config.row_hints:
                            self._policy()
                        else:
                            self._policy_all()
                    else:
                        if not self._ready:
                            with self._lock:
                                self._ready = True
                                self._reason = None
                            self._publish("status")
                        if not self.config.row_hints:
                            table_steps = (self._retry_cursor_step, self._tick_step, self._reconcile_all_step,
                                           self._table_refresh_step)
                            if not any(step() for step in table_steps):
                                break
                            continue
                        steps = (
                            self._cursor_step,
                            self._preview_step,
                            self._retry_cursor_step,
                            self._cursor_step,
                            self._reconcile_step,
                            self._refresh_step,
                        )
                        for _ in steps:
                            step = steps[self._lane % len(steps)]
                            self._lane += 1
                            if step():
                                break
                        else:
                            break
                successful_query = self._query_successes > successes_before
                if self._stale and self._ready and successful_query:
                    with self._lock:
                        self._stale = False
                        self._reason = None
                    self._publish("status")
                if successful_query:
                    self._failures = 0
                active = (
                    self._catching_up(runnable_only=True)
                    or any(retry.due <= time.monotonic() for retry in self._cursor_retries.values())
                    or any(b.kind == "changes" for b in self._emitted)
                )
                if not self._stale:
                    self._idle_delay = (
                        self.config.min_poll_s
                        if active or not self._ready
                        else min(self.config.max_idle_s, self._idle_delay * 1.5)
                    )
            except Exception as exc:  # noqa: BLE001 - keep the last successful frontier on all SDK failures
                with self._lock:
                    self._stale = True
                    self._reason = f"query_error:{type(exc).__name__}"
                self._failures += 1
                self._publish("status")
                self._idle_delay = min(self.config.max_error_s, self.config.min_poll_s * 2 ** min(self._failures, 16))
                if self._failures >= self.config.failures_before_resync:
                    self._reset()
                    self._failures = 0
            finally:
                events = tuple(self._emitted)
                self._emitted = None
            return events


_readers_lock = threading.Lock()
_readers: dict[tuple[str, str, str, str], SharedKustoReader] = {}


def _destination(settings: KustoSettings) -> tuple[str, str, str, str]:
    parts = urlsplit(engine_url(settings.cluster).rstrip("/"))
    cluster = urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, "", ""))
    return cluster, settings.database.casefold(), settings.auth_mode, settings.node_id


def local_write(settings: KustoSettings, table: str) -> None:
    """Wake the process's reader for this destination, if one runs, after rows were stored in *table*."""
    try:
        key = _destination(settings)
    except Exception:  # noqa: BLE001 - a destination without an engine URL has no reader
        return
    with _readers_lock:
        reader = _readers.get(key)
    if reader is not None and not reader._closed:
        reader.local_write(table)


def shared_reader(
    settings: KustoSettings,
    *,
    config: ReaderConfig | None = None,
    table_names: Iterable[str] | None = None,
) -> SharedKustoReader:
    """Get the process's reader; ingestion mode overrides do not create pollers."""
    names = tuple(sorted(set(table_names))) if table_names is not None else None
    with _readers_lock:
        key = _destination(settings)
        reader = _readers.get(key)
        if reader is None or reader._closed:
            reader = _readers[key] = SharedKustoReader(settings, config=config, table_names=names)
        elif config is not None and config != reader.config:
            raise ValueError("The destination already has a reader with different limits")
        elif names is not None and not set(names) <= set(reader._requested):
            raise ValueError("The destination already has a reader with a smaller table set")
        return reader
