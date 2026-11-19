"""Read-only, node-qualified canonical facts for the historical dashboard.

The bounded in-memory projection is not a second store. It lets the dashboard
use its normal joins and aggregates once, over the whole selected population.
"""

from __future__ import annotations

import json
import logging
import math
import sqlite3
import threading
import time
import uuid
from collections import Counter
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from dataclasses import asdict, dataclass, replace
from datetime import datetime, timedelta, timezone
from typing import Any

from ..kusto import KustoSettings, normalize_node_id
from ..kusto.connection import KustoClientFactory, kql_literal, to_python
from ..kusto.observations import FAMILIES, UnresolvedObservationsError
from ..kusto.schema import NODE, current, quote, store_schema
from ..storage import HistoryDB

logger = logging.getLogger(__name__)
MAX_ROWS = 250_000
MAX_BYTES = 48 * 1024 * 1024
MAX_RANGE_S = 31 * 86400
TIMED_READ_S = 86400
MAX_MATERIALIZED_ROWS = 2_000_000
CACHE_S = 45
WIDE_CACHE_S = 120


class ScopeError(ValueError):
    def __init__(self, message: str, status: int = 400, reason: str = "invalid_scope") -> None:
        super().__init__(message)
        self.status = status
        self.reason = reason


@dataclass(frozen=True)
class Scope:
    kind: str = "local"
    node: str | None = None  # None = all; '' = untagged history

    def contains(self, node: str) -> bool:
        return self.kind == "fleet" or self.node == node


def _node(label: str) -> str:
    if label == "legacy":
        return ""
    try:
        return normalize_node_id(label)
    except ValueError as exc:
        raise ScopeError("Invalid node_id") from exc


def parse_scope(params: dict[str, list[str]]) -> Scope:
    scopes, nodes = params.get("scope", ["local"]), params.get("node_id", [])
    if len(scopes) != 1 or len(nodes) > 1 or scopes[0] not in {"local", "node", "fleet"}:
        raise ScopeError("Unknown or repeated node scope")
    kind = scopes[0]
    if (kind == "node") != bool(nodes):
        raise ScopeError("Only named node scope takes a node_id, and it requires one")
    if kind == "local":
        return Scope()
    node = _node(nodes[0].strip().lower()) if nodes else None
    return Scope(kind, node)


def label(node: str) -> str:
    return node or "legacy"


def identity(node: str, value: str) -> str:
    return json.dumps([label(node), value], ensure_ascii=False, separators=(",", ":")) if value else ""


def parse_identity(value: str, scope: Scope, *, max_length: int = 384) -> tuple[str, str]:
    try:
        parts = json.loads(value)
        if not isinstance(parts, list) or len(parts) != 2 or not all(isinstance(p, str) for p in parts):
            raise ValueError
        node, raw = _node(parts[0]), parts[1]
        if identity(node, raw) != value or not 1 <= len(raw) <= max_length or any(ord(c) < 32 for c in raw):
            raise ValueError
    except ValueError as exc:
        raise ScopeError("A valid node-qualified identity is required") from exc
    if not scope.contains(node):
        raise ScopeError("The record does not belong to the selected node")
    return node, raw


def identity_parts(value: str | None) -> tuple[str, str] | None:
    if not value or not value.startswith("["):
        return None
    try:
        return parse_identity(value, Scope("fleet"))
    except ScopeError:
        return None


_layout_lock = threading.Lock()
_layouts: dict[tuple, tuple[float, bool]] = {}


def _store_key(settings: KustoSettings) -> tuple[str, str, str]:
    return settings.cluster, settings.database, settings.auth_mode


def _settings(db: Any) -> KustoSettings:
    settings = getattr(db, "_kusto", None)
    if settings is None:
        raise ScopeError("Node history requires a shared Kusto store", 422, "unsupported_scope")
    current_history = getattr(db, "current_history", None)
    if current_history is True:
        return settings
    if current_history is False:
        raise UnresolvedObservationsError(FAMILIES)
    key = _store_key(settings)
    with _layout_lock:
        cached = _layouts.get(key)
        if cached is None or time.monotonic() - cached[0] >= CACHE_S:
            from ..kusto.observations import LAYOUT_QUERY, has_current_store

            response = KustoClientFactory.client(settings).execute_mgmt(settings.database, LAYOUT_QUERY)
            if not response.primary_results or response.errors_count:
                raise ScopeError("Cannot determine the history layout", 503, "query_failed")
            cached = (time.monotonic(), has_current_store({row[0] for row in response.primary_results[0]}))
            _layouts.clear()
            _layouts[key] = cached
    if not cached[1]:
        raise UnresolvedObservationsError(FAMILIES)
    return settings


def _canonical(name: str, scope: Scope, prefilter: str = "", *, columns: tuple[str, ...] | None = None) -> str:
    # current() partitions fleet winners by (node_id, physical key). Date,
    # session, search, and detail predicates must only see surviving winners.
    return current(store_schema()[name], node_id=scope.node, prefilter=prefilter, columns=columns)


def _candidate_filter(table: str, scope: Scope, condition: str) -> str:
    # Keep every version, including tombstones, of keys with any matching row.
    # A shared key component only adds candidates; versions are still resolved
    # by the full physical key and reporting node, then checked against condition.
    key = quote(store_schema()[table].key[0])
    node = f" | where node_id == {_lit(scope.node)}" if scope.node is not None else ""
    return f"{key} in ({quote(table)}{node} | where {condition} | project {key})"


@dataclass(frozen=True)
class Read:
    table: str
    where: str = ""
    cols: tuple[str, ...] | None = None
    extra: str = ""
    prefilter: str = ""
    predicate_columns: tuple[str, ...] = ()
    candidate_keys: bool = False

    def columns(self) -> tuple[str, ...]:
        return self.cols if self.cols is not None else tuple(c.name for c in store_schema()[self.table].columns)

    @classmethod
    def sessions(cls, table: str, condition: str, cols: tuple[str, ...] | None = None) -> Read:
        # A newer version can change session_id or clear it in a tombstone. Only
        # push the predicate below arg_max when session_id is a physical key.
        keys = store_schema()[table].key
        return cls(
            table,
            condition,
            cols,
            prefilter=condition if "session_id" in keys else "",
            predicate_columns=("session_id", "node_id"),
            candidate_keys="session_id" not in keys,
        )

    def kql(self, scope: Scope) -> str:
        narrow = self.cols is not None and (not self.where and not self.extra or self.predicate_columns)
        prefilter = self.prefilter
        if self.candidate_keys:
            assert self.where and not prefilter
            prefilter = _candidate_filter(self.table, scope, self.where)
        source = _canonical(
            self.table, scope, prefilter, columns=(*self.cols, *self.predicate_columns) if narrow else None
        )
        columns = ", ".join(quote(c) for c in (NODE, *self.columns()))
        return (
            source
            + (f" | where {self.where}" if self.where else "")
            + self.extra
            + f" | project {columns} | take {MAX_ROWS + 1}"
        )


_read_slots = threading.BoundedSemaphore(2)


def _batch(settings: KustoSettings, queries: list[str]) -> list[list[tuple]]:
    from azure.kusto.data import ClientRequestProperties
    from azure.kusto.data.exceptions import KustoApiError, KustoMultiApiError

    props = ClientRequestProperties()
    props.client_request_id = f"aictl.BoardHistory;{uuid.uuid4()}"
    for key, value in {
        "request_readonly": True,
        "request_readonly_hardline": True,
        "deferpartialqueryfailures": False,
        "servertimeout": timedelta(seconds=25),
        "truncationmaxrecords": MAX_ROWS + 1,
        "truncationmaxsize": MAX_BYTES,
        "max_memory_consumption_per_query_per_node": 512 * 1024 * 1024,
        "query_fanout_threads_percent": 1,
    }.items():
        props.set_option(key, value)
    # Board, Context, Machine and session search can open together. Bound their
    # combined scan concurrency, not just the parallelism of each projection.
    try:
        with _read_slots:
            response = KustoClientFactory.client(settings).execute_query(settings.database, ";\n".join(queries), props)
    except (KustoApiError, KustoMultiApiError) as exc:
        errors = exc.get_api_errors() if isinstance(exc, KustoMultiApiError) else [exc.get_api_error()]
        low_memory = errors and all(
            e.code == "LowMemoryCondition" or "E_LOW_MEMORY_CONDITION" in (e.description or "") for e in errors
        )
        if not low_memory:
            raise
        if len(queries) > 1:
            mid = len(queries) // 2
            return _batch(settings, queries[:mid]) + _batch(settings, queries[mid:])
        raise ScopeError(
            f"Kusto could not read this history within its memory budget ({props.client_request_id})",
            503,
            "query_failed",
        ) from exc
    if response.errors_count or len(response.primary_results) != len(queries):
        raise ScopeError("Kusto returned incomplete history", 503, "query_failed")
    out = []
    for table in response.primary_results:
        if table.rows_count > MAX_ROWS:
            raise ScopeError("History exceeds the dashboard limit; narrow the time range", 422, "history_limit")
        types = [column.column_type for column in table.columns]
        out.append([tuple(to_python(v, typ) for v, typ in zip(row, types, strict=True)) for row in table])
    return out


def _lit(value: str) -> str:
    return kql_literal(value, "string")


def _time_range(lo: float, hi: float) -> str:
    return f"ts between ({float(lo)!r} .. {float(hi)!r})"


def _time_pages(lo: float, hi: float) -> Iterator[str]:
    while lo + TIMED_READ_S < hi:
        end = lo + TIMED_READ_S
        yield f"ts >= {float(lo)!r} and ts < {float(end)!r}"
        lo = end
    yield _time_range(lo, hi)


class HistoryConnection(sqlite3.Connection):
    _reported_history = True


class HistoryProjection:
    """Only methods needed by the dashboard; no delegation to the serving store."""

    _reported_history = True
    capture = "full"  # Read only retained text; no serving-daemon capture/retention settings.
    _content_retention_days = None

    def __init__(self, scope: Scope) -> None:
        self.scope = scope
        self.conn = sqlite3.connect(":memory:", check_same_thread=False, factory=HistoryConnection)
        schema = store_schema()
        for name in _PROJECTION_TABLES:
            sql_type = {"long": "INTEGER", "real": "REAL", "bool": "INTEGER"}
            cols = ", ".join(
                f'"{c.name}" {c.sqlite_type or sql_type.get(c.kusto_type, "TEXT")}' for c in schema[name].columns
            )
            self.conn.execute(f'CREATE TABLE "{name}" ({cols}, node_id TEXT NOT NULL)')
        self.conn.execute("CREATE TABLE scoped_request_sessions (session_id TEXT PRIMARY KEY)")
        self.conn.execute("CREATE TABLE scoped_other_sessions (session_id TEXT PRIMARY KEY)")

    def _conn(self) -> sqlite3.Connection:
        return self.conn

    def _keeps_text(self) -> bool:
        return True

    def query_session_usage(self, **kwargs: Any) -> list[dict]:
        return HistoryDB.query_session_usage(self, **kwargs)  # type: ignore[arg-type]

    def get_session(self, session_id: str) -> dict | None:
        return HistoryDB.get_session(self, session_id)  # type: ignore[arg-type]

    def query_sessions(self, **kwargs: Any) -> list[dict]:
        return HistoryDB.query_sessions(self, **kwargs)  # type: ignore[arg-type]

    def query_events(self, **kwargs: Any) -> list:
        return HistoryDB.query_events(self, **kwargs)  # type: ignore[arg-type]

    def _overlay_session_usage(self, rows: list[dict]) -> None:
        # Already qualified; no unqualified UUID lookup in this connection.
        from ..storage import row_provenance, usage_provenance

        usage = {r["session_id"]: r for r in self.query_session_usage(session_ids=[r["session_id"] for r in rows])}
        for row in rows:
            hit = usage.get(row["session_id"])
            row.update(usage_provenance(hit) if hit else row_provenance(row))
            if hit:
                row.update(
                    {
                        name: hit[name]
                        for name in (
                            "input_tokens",
                            "output_tokens",
                            "cache_read_tokens",
                            "cache_creation_tokens",
                            "request_count",
                            "tool_call_count",
                            "turn_count",
                            "models",
                        )
                    }
                )
                row["model"] = hit["model"] or row.get("model", "")

    def count_session_commits(self, session_id: str) -> int:
        return HistoryDB.count_session_commits(self, session_id)  # type: ignore[arg-type]

    def get_session_commits(self, session_id: str) -> list[dict]:
        return HistoryDB.get_session_commits(self, session_id)  # type: ignore[arg-type]

    def load(self, read: Read, rows: list[tuple], scope: Scope) -> None:
        cols = read.columns()
        session_col = cols.index("session_id") if "session_id" in cols else -1
        keys = {"session_id", "agent_id", "parent_agent_id", "root_session_id", "source_event_id"}
        # Events are joined to file edits by source_event_id. Other detail
        # identifiers are already inside a single validated session.
        qualify = [i for i, c in enumerate(cols) if c in keys]

        def transformed() -> Iterator[tuple]:
            for node, *values in rows:
                try:
                    valid = isinstance(node, str) and (not node or normalize_node_id(node) == node)
                except ValueError:
                    valid = False
                if not valid or not scope.contains(node):
                    raise ScopeError("History returned an invalid reporting node", 503, "query_failed")
                if session_col != -1 and values[session_col] == "aictl-verify":
                    continue
                for i in qualify:
                    values[i] = identity(node, values[i] or "")
                yield (*values, node)

        fields = ", ".join(f'"{c}"' for c in (*cols, NODE))
        markers = ", ".join("?" for _ in range(len(cols) + 1))
        self.conn.executemany(f'INSERT INTO "{read.table}" ({fields}) VALUES ({markers})', transformed())

    def seal(self) -> None:
        schema = store_schema()
        for name in _PROJECTION_TABLES:
            columns = {c.name for c in schema[name].columns}
            for idx, fields in enumerate((("session_id", "ts"), ("ts",), ("agent_id",), ("path", "node_id"))):
                usable = [c for c in fields if c in columns or c == NODE]
                if usable:
                    self.conn.execute(f'CREATE INDEX "{name}_{idx}" ON "{name}" ({", ".join(usable)})')
        self.conn.commit()
        self.conn.execute("PRAGMA query_only=ON")


_BOARD_READS = (
    Read(
        "requests",
        cols=(
            "id",
            "ts",
            "session_id",
            "agent_id",
            "tool",
            "project_path",
            "model",
            "input_tokens",
            "output_tokens",
            "cache_read_tokens",
            "cache_creation_tokens",
            "cost_usd",
            "duration_ms",
            "finish_reason",
            "is_error",
            "error_type",
            "http_status",
            "source",
            "ttft_ms",
        ),
    ),
    Read(
        "tool_invocations",
        cols=(
            "id",
            "ts",
            "session_id",
            "agent_id",
            "tool",
            "tool_name",
            "project_path",
            "target",
            "is_error",
            "duration_ms",
            "input",
            "result_summary",
            "source",
            "confirm",
            "confirm_wait_ms",
            "exit_code",
            "input_bytes",
            "output_bytes",
        ),
    ),
    Read("session_prompts"),
    Read("file_write_events"),
    Read("skill_uses"),
    Read("process_snapshots", cols=("ts", "pid", "tool", "cpu_percent", "memory_rss_mb")),
    Read("sessions"),
    Read("agents"),
    Read("session_usage"),
    Read(
        "files",
        "category contains 'memory' or category contains 'instruction'",
        ("path", "tool", "category", "scope", "tokens", "last_changed"),
    ),
)
_TIMED_BOARD = {
    "requests",
    "tool_invocations",
    "session_prompts",
    "file_write_events",
    "skill_uses",
    "process_snapshots",
}
_ENTITY_TABLES = (
    "sessions",
    "agents",
    "session_usage",
    "requests",
    "tool_invocations",
    "session_prompts",
    "events",
    "session_steps",
    "session_step_text",
    "context_events",
    "session_context_items",
    "session_loaded_files",
    "skill_uses",
    "file_write_events",
    "session_artifacts",
    "session_folders",
    "session_commits",
    "copilot_session_messages",
    "cursor_session_messages",
    "vscode_chat_messages",
    "session_processes",
)
_PROJECTION_TABLES = sorted(
    {r.table for r in _BOARD_READS}
    | set(_ENTITY_TABLES)
    | {"file_history", "file_blobs", "tool_stats", "system_snapshots"}
)

_lock = threading.Lock()  # Bound simultaneous materializations and cached SQLite memory.
_cached: dict[tuple, tuple[float, HistoryProjection]] = {}
_boards: dict[tuple, tuple[float, bytes]] = {}


@contextmanager
def _projection(
    settings: KustoSettings,
    scope: Scope,
    key: tuple,
    reads: list[Read],
    *,
    historical_request_presence: bool = False,
    other_session_presence: bool = False,
    cache: bool = False,
) -> Iterator[HistoryProjection]:
    key = (_store_key(settings), scope, *key)
    cached = _cached.get(key) if cache else None
    if key[2] in {"board", "wide-board"} and cached is None:
        # A brushed window uses the same canonical corpus when the base
        # projection already covers its previous period and current period.
        cached = next(
            (
                hit
                for k, hit in _cached.items()
                if k[:3] == key[:3]
                and k[3] <= key[3]
                and k[4] >= key[4]
                and time.monotonic() - hit[0] < (WIDE_CACHE_S if k[2] == "wide-board" else CACHE_S)
            ),
            None,
        )
    if cached is not None and time.monotonic() - cached[0] < (WIDE_CACHE_S if key[2] == "wide-board" else CACHE_S):
        yield cached[1]
        return
    projection = HistoryProjection(scope)
    queries = [r.kql(scope) for r in reads]
    if historical_request_presence:
        queries.append(
            _canonical("requests", scope, columns=("session_id",))
            + " | distinct node_id, session_id"
            + f" | take {MAX_ROWS + 1}"
        )
    if other_session_presence:
        queries += [
            _canonical(t, scope, columns=("session_id",)) + f" | distinct node_id, session_id | take {MAX_ROWS + 1}"
            for t in ("tool_invocations", "session_usage")
        ]
    try:
        if key[2] == "wide-board":
            # Keep at most two pages pending in Python, in addition to SQLite.
            heavy = {"requests", "tool_invocations"}
            groups = [[i] for i, r in enumerate(reads) if r.table in heavy]
            small = [i for i, r in enumerate(reads) if r.table not in heavy]
            groups += [small[i : i + 6] for i in range(0, len(small), 6)]
            groups += [list(range(len(reads), len(queries)))]
            count = 0
            with ThreadPoolExecutor(max_workers=2) as pool:
                for at in range(0, len(groups), 2):
                    pair = groups[at : at + 2]
                    fetched = pool.map(lambda ids: _batch(settings, [queries[i] for i in ids]), pair)
                    for ids, results in zip(pair, fetched, strict=True):
                        for i, rows in zip(ids, results, strict=True):
                            count += len(rows)
                            if count > MAX_MATERIALIZED_ROWS:
                                raise ScopeError(
                                    "History exceeds the dashboard limit; narrow the time range", 422, "history_limit"
                                )
                            if i < len(reads):
                                projection.load(reads[i], rows, scope)
                            else:
                                assert historical_request_presence and not other_session_presence
                                projection.conn.executemany(
                                    "INSERT INTO scoped_request_sessions VALUES (?)",
                                    [(identity(node, sid),) for node, sid in rows if sid],
                                )
            projection.seal()
            # One wide projection is enough to reuse the current view for
            # filtering and drill-downs without retaining several large stores.
            for old in [k for k in _cached if k[2] == "wide-board"]:
                _cached.pop(old)[1].conn.close()
            _cached[key] = (time.monotonic(), projection)
            yield projection
            return
        # Split the largest fact tables across requests. All small tables share
        # one request; request count does not depend on the number of nodes.
        if key[2] == "board":
            groups = [queries[:1], queries[1:2], queries[2:]]
        else:
            groups = [queries[i : i + 4] for i in range(0, len(queries), 4)]
        with ThreadPoolExecutor(max_workers=min(len(groups), 3 if key[2] == "board" else 2)) as pool:
            results = [r for result in pool.map(lambda group: _batch(settings, group), groups) for r in result]
        for read, rows in zip(reads, results[: len(reads)], strict=True):
            projection.load(read, rows, scope)
        if historical_request_presence:
            projection.conn.executemany(
                "INSERT INTO scoped_request_sessions VALUES (?)",
                [(identity(node, sid),) for node, sid in results[len(reads)] if sid],
            )
        if other_session_presence:
            projection.conn.executemany(
                "INSERT OR IGNORE INTO scoped_other_sessions VALUES (?)",
                [(identity(node, sid),) for family in results[-2:] for node, sid in family if sid],
            )
        projection.seal()
        if cache:
            previous = _cached.pop(key, None)
            if previous is not None:
                previous[1].conn.close()
            # Session search/details must not evict the warm board on each click.
            family = "board" if key[2] == "board" else "detail"
            same = [k for k in _cached if k[2] != "wide-board" and (k[2] == "board") == (family == "board")]
            if len(same) >= 2:
                _, oldest = _cached.pop(same[0])
                oldest.conn.close()
            _cached[key] = (time.monotonic(), projection)
        yield projection
    finally:
        if not cache or key not in _cached or _cached[key][1] is not projection:
            projection.conn.close()


@contextmanager
def _board_projection(settings, scope, filters):
    span = filters.until - filters.since
    if span > MAX_RANGE_S:
        raise ScopeError("Node history supports a time range of up to 31 days", 422, "history_limit")
    lo, hi = max(0.0, filters.since - span - 1), filters.until
    wide = hi - lo > 2 * TIMED_READ_S + 1
    pages = list(_time_pages(lo, hi)) if wide else [_time_range(lo, hi)]
    reads = []
    for r in _BOARD_READS:
        if r.table not in _TIMED_BOARD:
            reads.append(replace(r, predicate_columns=("category",) if r.table == "files" else ()))
            continue
        for condition in pages:
            extra, cols, prefilter = "", r.cols, ""
            candidates = r.table == "tool_invocations" or wide and store_schema()[r.table].key == ("rowid",)
            if wide and r.table == "tool_invocations":
                # Board loop detection only compares inputs for equality; it
                # does not need the stored bodies. Detail routes retain them.
                extra = " | extend input=iff(isempty(input), '', hash_sha256(input))"
            if wide and r.table == "process_snapshots":
                prefilter = condition  # ts is an immutable part of the key.
                cols = ("ts", "tool", "cpu_percent", "memory_rss_mb")
                extra = " | summarize cpu_percent=sum(cpu_percent), memory_rss_mb=sum(memory_rss_mb) by ts,tool,node_id"
            reads.append(Read(r.table, condition, cols, extra, prefilter, ("ts",), candidates))
    with _projection(
        settings,
        scope,
        ("wide-board" if wide else "board", lo, hi),
        reads,
        historical_request_presence=True,
        cache=True,
    ) as proj:
        yield proj


def board_bytes(db: Any, scope: Scope, query: str, now: float) -> bytes:
    from .board_api import _clock_range, compute_board, parse_filters

    filters = parse_filters(query, now)
    rolling = abs(filters.until - now) <= 10
    if rolling:
        filters = _clock_range(filters)
    settings = _settings(db)
    key = (_store_key(settings), scope, filters)
    with _lock:
        hit = _boards.get(key)
        if hit is not None and time.monotonic() - hit[0] < (
            WIDE_CACHE_S if filters.until - filters.since > TIMED_READ_S else CACHE_S
        ):
            return hit[1]
        with _board_projection(settings, scope, filters) as proj:
            payload = compute_board(proj, filters, now=now)
        payload["node_scope"] = {"kind": scope.kind, "node_id": label(scope.node) if scope.node is not None else None}
        answer = json.dumps(payload).encode()
        _boards[key] = (time.monotonic(), answer)
        while len(_boards) > 12:
            _boards.pop(next(iter(_boards)))
        return answer


def _session_condition(values: list[tuple[str, str]], scope: Scope, column: str = "session_id") -> str:
    per_node: dict[str, set[str]] = {}
    for node, sid in values:
        per_node.setdefault(node, set()).add(sid)
    return (
        " or ".join(
            "("
            + (f"node_id == {_lit(node)} and " if scope.node is None else "")
            + f"{column} in ({', '.join(map(_lit, sorted(ids)))})"
            + ")"
            for node, ids in sorted(per_node.items())
        )
        or "false"
    )


def _reported_context(settings: KustoSettings, scope: Scope, tools: tuple[str, ...] | None, now: float) -> dict:
    from ..storage import _TOOL_STATS_SELECT, _tool_stats_row
    from ..tool_scope import is_selected
    from . import board_api as board
    from .queryable_context import _POLICY_FIELDS, INVENTORY_COLUMNS, inventory_snapshot

    start = board._context_days(now)[1]
    policies = ", ".join(f"'{k}', tostring(parse_json(meta).{k})" for k in _POLICY_FIELDS)
    step = int(board.CONTEXT_GROWTH_S / board.CONTEXT_GROWTH_POINTS)
    reads = [
        Read(
            "files",
            cols=INVENTORY_COLUMNS,
            extra=f" | extend meta=tostring(bag_pack({policies}))",
            predicate_columns=("meta",),
        ),
        Read("tool_stats", extra=" | summarize arg_max(ts, *) by node_id, tool"),
        Read(
            "requests",
            _time_range(start, now),
            (
                "ts",
                "session_id",
                "tool",
                "model",
                "input_tokens",
                "output_tokens",
                "cache_read_tokens",
                "cache_creation_tokens",
                "cost_usd",
            ),
            predicate_columns=("ts",),
        ),
        Read(
            "system_snapshots",
            _time_range(now - board.CONTEXT_GROWTH_S, now),
            ("ts", "mem_tokens", "memory_entries"),
            extra=f" | summarize arg_max(ts, mem_tokens, memory_entries) by node_id, bucket=bin(ts, {step}.0)",
            predicate_columns=("ts",),
        ),
    ]
    with _projection(settings, scope, ("context",), reads) as proj:
        conn = proj.conn
        nodes = [r[0] for r in conn.execute(" UNION ".join(f'SELECT DISTINCT node_id FROM "{r.table}"' for r in reads))]
        parts = []
        for node in nodes:
            files = conn.execute(f"SELECT {', '.join(INVENTORY_COLUMNS)} FROM files WHERE node_id=?", (node,))
            telemetry = [
                asdict(_tool_stats_row(r)) for r in conn.execute(_TOOL_STATS_SELECT + " WHERE node_id=?", (node,))
            ]
            for t in telemetry:
                t["as_of"] = datetime.fromtimestamp(t["ts"], timezone.utc).isoformat(timespec="seconds")
            snapshot = inventory_snapshot(files, telemetry, reported=True)
            snapshot.agent_memory = [m for m in snapshot.agent_memory if is_selected(m["tool"], tools)]
            growth = [
                {"ts": ts, "mem_tokens": tokens, "memory_entries": entries}
                for ts, tokens, entries in conn.execute(
                    "SELECT ts,mem_tokens,memory_entries FROM system_snapshots WHERE node_id=? ORDER BY ts", (node,)
                )
            ]
            data = board._context_from_snapshot(
                snapshot,
                tools,
                now,
                True,
                {"daily": board._context_daily(conn, tools, now, node), "growth": growth},
                global_budget=True,
            )
            parts.append({**data, "node_id": label(node)})
    return {"generated_at": now, "nodes": sorted(parts, key=lambda r: (r["node_id"] == "legacy", r["node_id"]))}


def _reported_machine(settings: KustoSettings, scope: Scope, tools: tuple[str, ...] | None, now: float) -> dict:
    from ..tool_scope import stored_ids_for
    from .node_views import _status

    host = (
        "ts",
        "host_cpu_percent",
        "host_memory_used_mb",
        "host_memory_total_mb",
        "live_sessions",
        "active_processes",
        "daemon_pid",
        "files",
        "live_in_rate",
        "live_out_rate",
        "ai_token_rate",
    )
    optional = {
        "host_cpu_percent": "real",
        "host_memory_used_mb": "real",
        "host_memory_total_mb": "real",
        "daemon_pid": "long",
    }
    extra = " | extend " + ", ".join(f"{k}=column_ifexists('{k}', {typ}(null))" for k, typ in optional.items())
    reads = [
        Read("system_snapshots", cols=host, extra=extra + " | summarize arg_max(ts, *) by node_id"),
        Read("session_processes"),
    ]
    with _projection(settings, scope, ("machine",), reads) as proj:
        rows = [
            dict(zip(("node_id", *host), (label(node), *values), strict=True))
            for node, *values in proj.conn.execute(
                f"SELECT node_id, {', '.join(host)} FROM system_snapshots ORDER BY node_id"
            )
        ]
        for r in rows:
            r["status"] = _status(r["ts"], now)
            if not r["daemon_pid"]:
                r["active_processes"] = None
        allowed = set(stored_ids_for(tools)) if tools is not None else None
        procs = [
            {"node_id": label(node), "session_id": sid, "pid": pid, "tool": tool, "role": role, "joined_at": ts}
            for node, sid, pid, tool, role, ts in proj.conn.execute(
                "SELECT node_id,session_id,pid,tool,role,joined_at FROM session_processes ORDER BY joined_at DESC,node_id,pid"
            )
            if allowed is None or tool in allowed
        ]
    return {"generated_at": now, "hosts": rows, "recorded_processes": procs[:1000], "recorded_total": len(procs)}


def _entity(settings: KustoSettings, node: str, raw: str, *, agent: bool) -> tuple[str, str]:
    if not agent:
        return raw, raw
    scope = Scope("node", node)
    match = f"agent_id == {_lit(raw)}"
    result = _batch(
        settings,
        [
            _canonical("agents", scope, match, columns=("agent_id", "session_id")) + " | project session_id | take 1",
            _canonical(
                "requests", scope, _candidate_filter("requests", scope, match), columns=("agent_id", "session_id")
            )
            + f" | where {match} | distinct session_id | take 2",
        ],
    )
    if not result[0] and len(result[1]) > 1:
        raise ScopeError("Agent identity is ambiguous within the selected node", 409, "ambiguous_identity")
    return ((result[0] or result[1])[0][0] if result[0] or result[1] else raw), raw


def _session_search(
    settings: KustoSettings,
    scope: Scope,
    q: str,
    tools: list[str] | None,
    lo: float | None,
    hi: float | None,
    limit: int,
    offset: int,
) -> dict:
    from .board_api import _session_uuid
    from .session_record import (
        _HIT_SQL,
        _add_numbers,
        _filters_sql,
        _hits_sql,
        _like,
        _match_of,
        _page_rows,
        _representative,
    )

    q = q.strip()
    session_pred = "session_id != ''"
    if lo is not None:
        session_pred += f" and started_at >= {lo!r}"
    if hi is not None:
        session_pred += f" and started_at <= {hi!r}"
    listing = [
        Read(
            "sessions",
            session_pred,
            ("session_id", "tool", "project_path", "started_at", "ended_at"),
            predicate_columns=("session_id", "started_at"),
        ),
        Read("session_prompts", cols=("session_id", "agent_id", "ts", "text")),
    ]
    if q:
        listing += [
            Read("session_artifacts", cols=("session_id", "path", "mtime")),
            Read("file_write_events", cols=("session_id", "path", "ts")),
            Read("session_commits", cols=("session_id", "subject", "ts")),
        ]
    where, args = _filters_sql(tools, lo, hi)
    if tools == []:
        where += " AND 0"
    with _projection(
        settings,
        scope,
        ("listing", lo, hi, bool(q)),
        listing,
        historical_request_presence=True,
        other_session_presence=True,
        cache=True,
    ) as proj:
        conn = proj.conn
        # Candidates come from current fact existence, not an arbitrary top-N per node.
        eligible = (
            "(EXISTS (SELECT 1 FROM scoped_request_sessions r WHERE r.session_id=s.session_id) "
            "OR EXISTS (SELECT 1 FROM session_prompts p WHERE p.session_id=s.session_id) "
            "OR EXISTS (SELECT 1 FROM scoped_other_sessions r WHERE r.session_id=s.session_id))"
        )
        if q:
            found = conn.execute(
                f"WITH hits(sid,rank,text) AS ({_hits_sql()}) "
                f"SELECT s.session_id,s.started_at,MIN(h.rank),h.text FROM sessions s JOIN hits h ON h.sid=s.session_id "
                f"WHERE {where} AND {eligible} GROUP BY s.session_id",
                [*(_like(q),) * len(_HIT_SQL), *args],
            ).fetchall()
        else:
            found = conn.execute(
                f"SELECT s.session_id,s.started_at,0,'' FROM sessions s WHERE {where} AND {eligible}",
                args,
            ).fetchall()
        groups: dict[str, list[str]] = {}
        started: dict[str, float] = {}
        hits = {}
        for sid, at, rank, text in found:
            key = _session_uuid(sid) or sid
            groups.setdefault(key, []).append(sid)
            started[key] = max(started.get(key, 0), at or 0)
            hits[sid] = (rank, text)
        ordered = sorted(groups, key=lambda key: (-started[key], key))
        page = {k: _representative(k, groups[k]) for k in ordered[offset : offset + limit]}
        store_of = {sid: 0 for key in page for sid in groups[key]}
        rows = _page_rows([conn], store_of, page, groups)
    if page:
        wanted = [parse_identity(sid, scope) for sid in rows]
        condition = _session_condition(wanted, scope)
        names = (
            "requests",
            "tool_invocations",
            "session_usage",
            "session_prompts",
            "sessions",
            "agents",
            "session_artifacts",
            "session_folders",
            "session_commits",
        )
        compact = {r.table: r.cols for r in _BOARD_READS}
        compact["tool_invocations"] = tuple(
            c for c in compact["tool_invocations"] if c not in {"input", "result_summary", "target"}
        )
        reads = [Read.sessions(t, condition, compact.get(t)) for t in names]
        with _projection(settings, scope, ("page", *sorted(rows)), reads, cache=True) as proj:
            _add_numbers(proj, [proj.conn], store_of, set(), rows)
    out = []
    for key, sid in page.items():
        row = rows[sid]
        row.pop("_closed", None)
        node, raw = parse_identity(sid, scope)
        row.update(node_id=label(node), session_id=raw)
        row["match"], row["match_text"] = _match_of(row["title"], [hits[s] for s in groups[key]], q) if q else ("", "")
        out.append(row)
    counts = Counter(label(parse_identity(sids[0], scope)[0]) for sids in groups.values())
    return {
        "rows": out,
        "total": len(groups),
        "by_node": [{"node_id": n, "sessions": c} for n, c in sorted(counts.items())],
    }


_aux_locks = {name: threading.Lock() for name in ("machine", "context")}
_aux_cache: dict[str, dict[tuple, tuple[float, bytes]]] = {name: {} for name in _aux_locks}


def _session_records(settings: KustoSettings, node: str, raw: str, part: str) -> dict:
    from . import board_api as board

    tables = {
        "events": ("events",),
        "processes": ("session_processes",),
        "calls": ("requests",),
        "mcp": ("tool_invocations", "events"),
    }
    if part not in tables:
        raise ScopeError("Unknown session record type")
    scope = Scope("node", node)
    sid = identity(node, raw)
    cond = _session_condition([(node, raw)], scope)
    columns = {
        "requests": (
            "ts",
            "session_id",
            "model",
            "input_tokens",
            "output_tokens",
            "duration_ms",
            "is_error",
            "error_type",
            "http_status",
            "finish_reason",
        ),
        "tool_invocations": ("ts", "session_id", "tool_name", "source", "is_error", "duration_ms"),
    }
    reads = [Read.sessions(t, cond, columns.get(t)) for t in tables[part]]
    with _projection(settings, scope, ("records", raw, part), reads, cache=True) as db:
        conn = db.conn
        if part == "events":
            events = conn.execute(
                "SELECT ts,kind,tool,detail,seq FROM events WHERE session_id=? ORDER BY ts DESC,seq DESC LIMIT 500",
                (sid,),
            )
            return {
                "total": conn.execute("SELECT count(*) FROM events WHERE session_id=?", (sid,)).fetchone()[0],
                "rows": [
                    {"ts": ts, "kind": kind, "tool": tool, "detail": board.mask_secrets(detail), "seq": seq}
                    for ts, kind, tool, detail, seq in events
                ],
            }
        if part == "processes":
            rows = HistoryDB.get_session_processes(db, sid)
            return {"total": len(rows), "processes": rows}
        if part == "mcp":
            from ..analysis.mcp_usage import session_mcp_calls

            observed = {}
            for name, calls, errors, duration, ts in conn.execute(
                f"SELECT tool_name,COUNT(*),SUM(is_error),SUM(duration_ms),MAX(ts) FROM tool_invocations WHERE session_id=? AND {board._IS_CALL_SQL} GROUP BY tool_name",
                (sid,),
            ):
                if server := board.mcp_server_of(name):
                    r = observed.setdefault(
                        server,
                        {
                            "server_name": server,
                            "call_count": 0,
                            "err_count": 0,
                            "total_duration_ms": None,
                            "last_ts": ts,
                        },
                    )
                    r["call_count"] += calls
                    r["err_count"] += errors or 0
                    if duration:
                        r["total_duration_ms"] = (r["total_duration_ms"] or 0) + duration
                    r["last_ts"] = max(ts, r["last_ts"])
            for r in session_mcp_calls(db, sid, limit=MAX_ROWS):
                observed.setdefault(r["server_name"], r)
            return {"servers": list(observed.values()), "total_calls": sum(r["call_count"] for r in observed.values())}
        cols = columns["requests"]
        rows = [
            dict(zip(cols, r, strict=True))
            for r in conn.execute(
                f"SELECT {','.join(cols)} FROM requests WHERE session_id=? ORDER BY ts DESC LIMIT 200", (sid,)
            )
        ]
        for r in rows:
            r["status"] = "error" if r["is_error"] else "ok"
        totals = conn.execute(
            "SELECT model,COUNT(*),SUM(is_error) FROM requests WHERE session_id=? GROUP BY model", (sid,)
        ).fetchall()
        times = [
            r[0]
            for r in conn.execute(
                "SELECT duration_ms FROM requests WHERE session_id=? AND duration_ms>0 AND NOT is_error ORDER BY duration_ms",
                (sid,),
            )
        ]
        return {
            "calls": rows,
            "summary": {
                "total_calls": sum(n for _, n, _ in totals),
                "total_errors": sum(e or 0 for _, _, e in totals),
                "by_model": {m: n for m, n, _ in totals},
                "avg_latency_ms": sum(times) / len(times) if times else None,
                "p95_latency_ms": board._percentile(times, 0.95),
            },
        }


def route(db: Any, scope: Scope, path: str, query: str, params: dict[str, list[str]], now: float) -> tuple[int, bytes]:
    from ..tool_scope import normalize_selection, stored_ids_for
    from . import board_api as board
    from .session_evidence import EvidenceInputError, session_evidence

    def one(name: str) -> str:
        values = params.get(name, [""])
        if len(values) != 1 or len(values[0]) > 4096:
            raise ScopeError(f"Invalid {name}")
        return values[0]

    def number(name: str) -> float | None:
        value = one(name)
        if not value:
            return None
        try:
            result = float(value)
            if math.isfinite(result) and result >= 0:
                return result
        except ValueError:
            pass
        raise ScopeError(f"Invalid {name}")

    def integer(name: str, default: int, maximum: int) -> int:
        value = number(name)
        if value is None:
            return default
        if not value.is_integer() or value > maximum:
            raise ScopeError(f"{name} must be an integer between 0 and {maximum}")
        return int(value)

    contract = {"kind": scope.kind, "node_id": label(scope.node) if scope.node is not None else None}

    def result(status: int, body: dict) -> tuple[int, bytes]:
        if status == 200:
            body = {**body, "node_scope": contract}
        return status, json.dumps(body).encode()

    def selected() -> tuple[str, ...] | None:
        return normalize_selection(p for v in params["tool"] for p in v.split(",")) if "tool" in params else None

    local_only = {"excerpt", "health", "action"}
    endpoint = path.removeprefix("/api/board/") if path.startswith("/api/board/") else path
    if endpoint in local_only:
        raise ScopeError("This route is available only on This node", 422, "local_only")
    try:
        if path == "/api/board":
            return 200, board_bytes(db, scope, query, now)
        lo, hi = number("since"), number("until")
        if lo is not None and hi is not None and lo >= hi:
            raise ScopeError("since must be earlier than until")
        settings = _settings(db)
        if endpoint in _aux_locks:
            tools = selected()
            key = (_store_key(settings), scope, tools)
            cache = _aux_cache[endpoint]
            with _aux_locks[endpoint]:
                hit = cache.get(key)
                if hit and time.monotonic() - hit[0] < (300 if endpoint == "context" else CACHE_S):
                    return 200, hit[1]
                fn = _reported_context if endpoint == "context" else _reported_machine
                status, body = result(200, fn(settings, scope, tools, now))
                cache[key] = (time.monotonic(), body)
                while len(cache) > 6:
                    cache.pop(next(iter(cache)))
                return status, body
        with _lock:
            if endpoint == "session/records":
                node, raw = parse_identity(one("session_id"), scope)
                return result(200, {"node_id": label(node), **_session_records(settings, node, raw, one("part"))})
            if endpoint in {"tool", "error"}:
                name = one("name" if endpoint == "tool" else "key")
                if not name:
                    raise ScopeError("Missing detail identifier")
                filters = board.parse_filters(query, now)
                if abs(filters.until - now) <= 10:
                    filters = board._clock_range(filters)
                with _board_projection(settings, scope, filters) as proj:
                    if endpoint == "tool":
                        return result(*board.tool_detail(proj, name, now, filters=filters))
                    return result(*board.error_detail(proj, name, now, filters=filters))
            if endpoint == "sessions":
                tools = selected()
                return result(
                    200,
                    _session_search(
                        settings,
                        scope,
                        one("q"),
                        stored_ids_for(tools) if tools is not None else None,
                        lo,
                        hi,
                        max(1, integer("limit", 50, 200)),
                        integer("offset", 0, MAX_ROWS),
                    ),
                )
            if endpoint in {"agent", "agent/flow", "agent/transcript", "prompt", "/api/session-evidence"}:
                agent = endpoint.startswith("agent")
                key = "id" if agent else "session_id"
                node, raw = parse_identity(one(key), scope)
                narrow = Scope("node", node)
                sid, who = _entity(settings, node, raw, agent=agent)
                if not sid:
                    return result(404, {"error": "No such agent"})
                aid = identity(node, who)
                if endpoint == "/api/session-evidence":
                    names = ("session_steps", "session_step_text")
                elif endpoint == "prompt":
                    names = ("session_prompts", "requests", "tool_invocations", "sessions", "agents")
                else:
                    names = _ENTITY_TABLES
                cond = _session_condition([(node, sid)], narrow)
                reads = [Read.sessions(t, cond) for t in names]
                if endpoint.startswith("agent"):
                    root = _canonical("sessions", narrow) + f" | where {cond}"
                    run_scope = (
                        f"ended_at >= {float(now - board.RUN_HISTORY_DAYS * 86400)!r}"
                        f" and project_path in ({root} | project project_path)"
                        f" and tool in ({root} | project tool)"
                    )
                    reads[0] = Read("sessions", f"({cond}) or ({run_scope})")
                    reads.append(
                        Read(
                            "files",
                            "category contains 'memory' or category contains 'instruction'",
                            ("path", "tool", "category", "scope", "tokens", "last_changed"),
                        )
                    )
                with _projection(settings, narrow, ("entity", sid, names), reads, cache=True) as proj:
                    if endpoint == "agent":
                        return result(*board.agent_detail(proj, aid, now=now))
                    if endpoint == "agent/flow":
                        failed = one("failed")
                        if failed not in {"", "0", "1"}:
                            raise ScopeError("failed must be 0 or 1")
                        status, body = board.agent_flow(
                            proj,
                            aid,
                            lo,
                            hi,
                            now=now,
                            limit=integer("limit", board.FLOW_DEFAULT_EVENTS, board.MAX_FLOW_EVENTS),
                            failed=failed == "1",
                            **{
                                k: one(k)
                                for k in ("q", "category", "tool_name", "flow_agent", "skill_name", "skill_phase")
                            },
                        )
                        return result(status, {**body, "node_id": label(node)})
                    if endpoint == "agent/transcript":
                        return result(
                            *board.agent_transcript(
                                proj, aid, now=now, turn=number("turn"), brief=one("full") not in {"1", "true", "yes"}
                            )
                        )
                    if endpoint == "prompt":
                        ts = number("ts")
                        if ts is None:
                            raise ScopeError("Missing ts")
                        return result(*board.prompt_detail(proj, ts, aid, now))
                    return result(200, session_evidence(proj, params))
            names = ("sessions", "agents")
            reads = [Read(t) for t in names]
            window = f" and {_time_range(lo, hi)}" if lo is not None and hi is not None else ""
            if endpoint == "skill" and (name := one("name")):
                reads += [
                    Read("skill_uses", f"name == {_lit(name)} or name endswith {_lit(':' + name)}"),
                    Read("tool_invocations", "target contains 'SKILL.md'"),
                    Read("session_prompts", "agent_id == ''", ("session_id", "agent_id", "ts")),
                ]
                fn = lambda p: board.skill_detail(p, name, now, lo, hi, selected())
            elif endpoint == "file" and (name := one("path")):
                if record := one("record"):
                    node, raw_path = parse_identity(record, scope, max_length=4096)
                    if raw_path != name:
                        raise ScopeError("The record does not match the requested path")
                    scope = Scope("node", node)
                elif scope.node is None:
                    raise ScopeError("A fleet file detail requires a node-qualified record")
                edit_filter = f"path == {_lit(name)}{window}"
                reads += [Read("file_write_events", edit_filter, candidate_keys=True)]
                if scope.node is not None:
                    events = _canonical(
                        "file_write_events",
                        scope,
                        _candidate_filter("file_write_events", scope, edit_filter),
                        columns=("path", "ts", "source_event_id"),
                    )
                    event_ids = events + f" | where {edit_filter} | project source_event_id"
                    version_filter = f"path == {_lit(name)}" + (f" and ts <= {hi!r}" if hi is not None else "")
                    blobs = (
                        _canonical("file_history", scope, version_filter, columns=("blob_hash", "ts"))
                        + " | top 2 by ts | project blob_hash"
                    )
                    reads += [
                        Read("file_history", version_filter, extra=" | top 2 by ts", prefilter=version_filter),
                        Read("file_blobs", f"hash in ({blobs})", prefilter=f"hash in ({blobs})"),
                        Read(
                            "tool_invocations",
                            f"source_event_id != '' and source_event_id in ({event_ids})",
                            candidate_keys=True,
                        ),
                    ]
                fn = lambda p: board.file_detail(p, name, now, since=lo, until=hi)
            elif endpoint in {"tool", "error", "skill", "file"}:
                raise ScopeError("Missing detail identifier")
            else:
                return result(404, {"error": "No such route"})
            with _projection(settings, scope, ("detail", endpoint, query), reads) as proj:
                return result(*fn(proj))
    except EvidenceInputError as exc:
        raise ScopeError(str(exc)) from exc
    except (ScopeError, UnresolvedObservationsError, board.BoardRequestError):
        raise
    except Exception as exc:
        logger.exception("Historical dashboard query failed")
        raise ScopeError("Could not read the selected node history", 503, "query_failed") from exc
