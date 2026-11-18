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
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from . import KustoSettings, engine_url
from .connection import KustoClientFactory, Result
from .schema import DELETED, NODE, ROWID, VERSION, Table, node_predicate, quote, store_schema


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
    schema_refresh_s: float = 60.0
    policy_refresh_s: float = 300.0
    reconcile_interval_s: float = 300.0
    reconcile_partitions: int = 8
    subscriber_batches: int = 16
    max_subscribers: int = 64
    dedup_entities: int = 8192
    dedup_bytes: int = 4_000_000
    result_bytes: int = 4_000_000
    query_memory_bytes: int = 134_217_728
    failures_before_resync: int = 3
    tables_per_probe: int = 4

    def __post_init__(self) -> None:
        for name, value in vars(self).items():
            if value <= 0:
                raise ValueError(f"{name} must be positive")
        if self.max_idle_s < self.min_poll_s:
            raise ValueError("max_idle_s must be at least min_poll_s")


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


@dataclass(frozen=True)
class _Spec:
    name: str
    key: tuple[str, ...] = ()
    metadata: tuple[str, ...] = ()

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


class ReaderQueryError(RuntimeError):
    """A failed or incomplete read. Its page and cursor must not be committed."""


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


@lru_cache(maxsize=1)
def _managed_tables() -> dict[str, Table]:
    return store_schema()


def _specs(tables: Mapping[str, Table]) -> dict[str, _Spec]:
    result = {}
    for name, table in tables.items():
        metadata = tuple(
            dict.fromkeys((*table.key, ROWID, *(n for n in ("session_id", "project_path") if n in table.column_names)))
        )
        result[name] = _Spec(name, table.key, metadata)
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
        self.config = config or ReaderConfig()
        self._client = client
        self._known = _specs(_managed_tables() if tables is None else tables)
        if tables is None:
            from .otel import TABLES

            self._known.update({t.name: _Spec(t.name) for t in TABLES})
        requested = set(self._known) if table_names is None else set(table_names)
        unknown = requested - self._known.keys()
        if unknown:
            raise ValueError("Unknown managed Kusto tables: " + ", ".join(sorted(unknown)))
        self._requested = tuple(sorted(requested))
        self._available: dict[str, _Spec] | None = None
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
                "row_payload": "identity_and_scope_only",
                "streaming_cursor_lag": "Cursor assignment may follow queryable streaming data by up to 60 seconds.",
                "preview_is_checkpoint": False,
                "cursor_guarantees": "Direct ingestion with ingestiontime enabled at original ingestion only.",
                "reconciliation_target_s": self.config.reconcile_interval_s,
                "schema_refresh_target_s": self.config.schema_refresh_s,
                "reconciliation_completed_at": dict(self._last_reconcile_at),
                "last_query_completed_at": self._last_query_at,
                "catching_up": self._catching_up(),
                "limits": {
                    "page_rows": self.config.page_size,
                    "queries_per_poll": self.config.queries_per_poll,
                    "tables_per_probe": self.config.tables_per_probe,
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
                stale=self._stale,
                reason=self._reason,
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
            self._wake.wait(self._idle_delay if active else self.config.max_idle_s)
            self._wake.clear()

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
            batch = replace(
                self.latest_status(),
                kind=kind,
                rows=rows,
                changed_tables=tables,
                reason=reason if reason is not None else self._reason,
                sequence=self._sequence,
            )
            subscriptions = tuple(self._subscriptions)
            if self._emitted is not None:
                self._emitted.append(batch)
        for subscription in subscriptions:
            subscription._offer(batch)

    def _execute(self, text: str, *, management: bool = False) -> list[dict[str, Any]]:
        from azure.kusto.data import ClientRequestProperties

        props = ClientRequestProperties()
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
        props.set_option("maxmemoryconsumptionperiterator", self.config.query_memory_bytes)
        props.set_option("max_memory_consumption_per_query_per_node", self.config.query_memory_bytes)
        props.set_option("query_fanout_threads_percent", 25)
        if self._client is None:
            self._client = KustoClientFactory.client(self.settings)
        call = self._client.execute_mgmt if management else self._client.execute
        response = call(self.settings.database, text, props)
        if getattr(response, "errors_count", 0):
            raise ReaderQueryError("Kusto returned an incomplete result")
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
        rows = self._execute(".show database schema | project TableName, ColumnName", management=True)
        columns: dict[str, set[str]] = {}
        for row in rows:
            columns.setdefault(str(row["TableName"]), set()).add(str(row["ColumnName"]))
        available = {}
        for name in self._requested:
            spec = self._known[name]
            required = {*spec.metadata, NODE, VERSION, DELETED} if spec.versioned else {NODE}
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
        rows = self._execute(f".show table {quote(name)} policy ingestiontime", management=True)
        if len(rows) != 1 or "Policy" not in rows[0]:
            raise ReaderQueryError("Missing ingestiontime policy")
        policy = json.loads(rows[0]["Policy"]) if isinstance(rows[0]["Policy"], str) else rows[0]["Policy"]
        with self._lock:
            enabled = isinstance(policy, dict) and policy.get("IsEnabled") is True
            previous = self._policy_checked.get(name)
            if enabled:
                self._cursor_tables.add(name)
                self._frontier.setdefault(name, self._last_cursor)
            else:
                self._frontier.pop(name, None)
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

    def _catching_up(self) -> bool:
        return any(self._frontier[name] != self._last_cursor for name in self._cursor_tables)

    def _detect(self, names: list[str]) -> None:
        upper = self._last_cursor
        arms = [
            f"({quote(name)} | where cursor_after({_text(self._frontier[name])}) and cursor_before_or_at({_text(upper)})"
            f" | where {node_predicate(self.settings.node_id)}"
            f" | take 1 | summarize aictl_live_count=count() | project aictl_live_table={_text(name)}, aictl_live_count)"
            for name in names
        ]
        rows = self._execute("union " + ",\n".join(arms))
        # An empty range must return an explicit zero; a missing arm is not a checkpoint.
        counts = {row["aictl_live_table"]: row["aictl_live_count"] for row in rows}
        if len(rows) != len(names) or counts.keys() != set(names) or any(n not in (0, 1) for n in counts.values()):
            raise ReaderQueryError("Incomplete or unexpected cursor probe result")
        raw_changed = []
        with self._lock:
            assert self._available is not None
            for name in names:
                if counts[name] and self._available[name].versioned:
                    self._ranges.append(_Scan(name, "cursor", self._frontier[name], upper))
                else:
                    self._frontier[name] = upper
                    if counts[name]:
                        raw_changed.append(name)
        if raw_changed:
            self._publish("changes", tables=tuple(raw_changed))
        elif 0 in counts.values():
            self._publish("status")

    def _page_query(self, spec: _Spec, scan: _Scan) -> str:
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
        metadata = ", ".join(quote(n) for n in spec.metadata)
        source = f"{quote(spec.name)} | where {node_predicate(self.settings.node_id)}"
        return (
            f"let aictl_live_changed = materialize({source} | where {predicate}"
            f" | extend aictl_live_key={spec.key_expression}{partition}"
            f" | where strcmp(aictl_live_key, {_text(scan.after)}) > 0 | summarize by aictl_live_key"
            f" | order by aictl_live_key asc | take {self.config.page_size + 1});\n"
            "aictl_live_changed | join kind=leftouter ("
            f"{source} | extend aictl_live_key={spec.key_expression}"
            " | where aictl_live_key in (aictl_live_changed)"
            f" | summarize arg_max({quote(VERSION)}, {quote(DELETED)}, {metadata}) by aictl_live_key"
            ") on aictl_live_key"
            f" | project aictl_live_key, aictl_live_version=tostring({quote(VERSION)}),"
            f" aictl_live_deleted=coalesce({quote(DELETED)}, true), {metadata}"
            " | order by aictl_live_key asc"
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
        raw = self._execute(self._page_query(spec, scan))
        if len(raw) > self.config.page_size + 1:
            raise ReaderQueryError("Kusto page exceeded the row budget")
        keyed = {}
        for value in raw:
            token = value.get("aictl_live_key")
            if not isinstance(token, str):
                raise ReaderQueryError("Missing stable row identity")
            if token > scan.after:
                keyed[token] = value
        tokens = sorted(keyed)
        if raw and not tokens:
            raise ReaderQueryError("Kusto page did not advance")
        more = len(tokens) > self.config.page_size or len(raw) >= self.config.page_size + 1
        parsed = []
        for token in tokens[: self.config.page_size]:
            value = keyed[token]
            if (
                "aictl_live_version" not in value
                or not isinstance(value.get("aictl_live_deleted"), bool)
                or any(name not in value for name in spec.metadata)
            ):
                raise ReaderQueryError("Missing or invalid row metadata")
            native_key = json.loads(base64.b64decode(token, validate=True).decode("utf-8"))
            if not isinstance(native_key, list) or len(native_key) != len(spec.key):
                raise ReaderQueryError("Invalid native row identity")
            parsed.append(
                (
                    token,
                    KustoRow(
                        spec.name,
                        tuple(native_key),
                        value.get("aictl_live_version") or None,
                        bool(value.get("aictl_live_deleted", True)),
                        {name: value.get(name) for name in spec.metadata},
                    ),
                )
            )
        hints = tuple(row for token, row in parsed if self._remember(row, token))
        if tokens:
            scan.after = tokens[min(len(tokens), self.config.page_size) - 1]
        if scan.kind == "cursor" and not more:
            with self._lock:
                self._frontier[scan.table] = scan.upper
        if hints:
            self._publish("changes", rows=hints, tables=(spec.name,))
        elif scan.kind == "cursor" and not more:
            self._publish("status")
        return more

    def _cursor_step(self) -> bool:
        # Hold the captured upper until every lagging table has been probed and drained.
        scheduled = {scan.table for scan in self._ranges}
        pending = sorted(name for name in self._cursor_tables - scheduled if self._frontier[name] != self._last_cursor)
        if pending:
            self._detect(pending[: self.config.tables_per_probe])
            return True
        if self._ranges:
            scan = self._ranges[0]
            more = self._page(scan)
            self._ranges.popleft()
            if more:
                self._ranges.append(scan)
            return True
        if time.monotonic() < self._capture_next:
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
        names = sorted(self._cursor_tables)
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
            self._preview_next = time.monotonic() + max(self.config.preview_interval_s, self._idle_delay)
        return True

    def _reconcile_step(self) -> bool:
        assert self._available is not None
        plan = [
            (name, part)
            for name, spec in self._available.items()
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
            self._preview = self._reconcile = None
            self._preview_stamps.clear()
            self._reconciled_partitions.clear()
            self._dedup.clear()
            self._dedup_bytes = 0
            self._capture_next = self._preview_next = self._reconcile_next = 0.0
            self._schema_next = self._policy_next = 0.0
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
                        self._policy()
                    else:
                        if not self._ready:
                            with self._lock:
                                self._ready = True
                                self._reason = None
                            self._publish("status")
                        steps = (
                            self._cursor_step,
                            self._preview_step,
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
                active = self._catching_up() or any(b.kind == "changes" for b in self._emitted)
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
