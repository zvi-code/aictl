"""Provision the Kusto store outside the data write path.

Each node has its own tables, and a stored function per logical table reads all nodes
(see ``nodes.py``). ``ensure_schema`` runs at every start of a writing node, in this order:

1. Read the database: the table schemas, the table details, the stored functions and the
   ``schema_version`` registry. Nothing is changed before the checks pass.
2. Database-wide: a database still on the shared tables of layout 1 or older is reset
   (``aictl db reset --all-nodes``); until then no node writes.
3. This node: its own recorded layout decides (new, current, upgrade, reset, newer);
   another node's layout is never an error here.
4. Create or widen this node's tables in one ``.create-merge tables`` command, give new
   tables their docstring, apply retention and streaming policies, record this node's
   layout row.
5. Regenerate the stored functions from the registry and the tables, until a second read
   finds nothing to change (two nodes doing it at once end with the same content).
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any

from ...kusto.observations import COMPANIONS, CURRENT_STORE
from ..base import StoreConfigurationError, StorePermissionError
from . import current as C
from . import layout as L
from . import nodes as N
from .client import Result, kql_literal, quote, retrying
from .tables import TABLES, IngestionMode, Table

log = logging.getLogger(__name__)
_SCHEMA_QUERY = ".show database schema | project TableName, ColumnName, ColumnType"
_POLICY_QUERY = (".show tables details | project TableName, TotalRowCount, TotalExtents, TotalExtentSize, "
                 "MaxExtentsCreationTime, RetentionPolicy, StreamingIngestionPolicy, Folder, DocString")
_FUNCTIONS_QUERY = ".show functions | project Name, Body"
LAYOUT_TABLE = N.LAYOUT_TABLE
_LAYOUT_COLUMNS = ("kind", "node_id", "version", "compatible_since", "data_epoch", "aictl_version", "written_at",
                   "step", "detail")
LAYOUT_QUERY = f"{quote(LAYOUT_TABLE)} | project {', '.join(quote(c) for c in _LAYOUT_COLUMNS)} | take 100000"
# Tables earlier aictl versions created. They belong to aictl, and a reset drops them.
LEGACY_OWNED = frozenset({"aictl_information_schema"})
NODE_TABLES = "node_tables"  # the registry step of the database-wide copy that made the node tables (layout 3)
_TYPES = {
    "System.Int32": "int",
    "System.Int64": "long",
    "System.Double": "real",
    "System.String": "string",
    "System.DateTime": "datetime",
    "System.Boolean": "bool",
    "System.SByte": "bool",
    "System.Object": "dynamic",
    "System.TimeSpan": "timespan",
    "System.Guid": "guid",
}


def logical_tables() -> frozenset[str]:
    """Every logical table aictl defines, the shared ones included."""
    from .otel import TABLES as OTEL_TABLES

    return frozenset(TABLES) | {t.name for t in OTEL_TABLES} | COMPANIONS


def owned_tables() -> frozenset[str]:
    """The logical and shared tables aictl creates. A reset drops these (or their node tables) and no other."""
    return logical_tables() | {CURRENT_STORE} | LEGACY_OWNED


def is_owned(name: str) -> bool:
    """A table aictl owns: a logical or shared table, a node table, or a legacy__ table of the migration."""
    logical = logical_tables()
    if name in owned_tables():
        return True
    if name.startswith(N.LEGACY_PREFIX) and name.removeprefix(N.LEGACY_PREFIX) in logical:
        return True
    return N.parse(name, None, logical) is not None


@dataclass(frozen=True)
class SchemaStatus:
    streaming_available: bool
    warning: str | None = None
    # The layout object of the store health (layout.summary), and the facts of the data
    # epoch that the restart state check needs.
    layout: dict | None = None
    data_epoch: str = ""
    epoch_kept_data: bool = False
    tables: Mapping[str, str] = field(default_factory=dict)  # logical -> this node's physical table


def _denied(exc: Exception) -> bool:
    status = getattr(getattr(exc, "http_response", None), "status_code", None)
    if status in (401, 403):
        return True
    message = str(exc).casefold()
    return any(s in message for s in ("forbidden", "unauthorized", "not authorized", "insufficient permission"))


def _policy(value: Any) -> dict:
    if isinstance(value, str):
        value = json.loads(value) if value and value != "null" else {}
    return value if isinstance(value, dict) else {}


# Legacy report and read projections still use these physical aliases.
LEGACY_COLUMNS: dict[str, tuple[tuple[str, str], ...]] = {
    name: tuple((column, kind) for column, kind in (("rowid", "long"), ("_deleted", "bool"))
                if column not in dict(TABLES[name].columns))
    for name in ("tool_invocations", "files", "file_history", "file_blobs", "metrics",
                 "system_snapshots", "process_snapshots", "tool_stats", "requests", "sessions", "agents", "events",
                 "session_usage", "session_processes", "session_steps", "session_step_text", "turn_request_links",
                 "session_prompts", "skill_uses", "session_loaded_files", "session_context_items",
                 "context_events", "file_write_events", "hook_calls", "datapoint_catalog", "data_quality_status",
                 "copilot_session_messages", "cursor_session_messages", "vscode_chat_messages", "session_artifacts",
                 "session_folders", "session_commits", "memory_snapshots")
}


def logical_columns(name: str) -> tuple[tuple[str, str], ...]:
    """The columns of logical table *name*, as its function and its node tables have them."""
    return (*TABLES[name].columns, *LEGACY_COLUMNS.get(name, ()))


Command = Callable[[str, str, str], Any]
Query = Callable[[str, str], Result]


def management(client: Any, database: str) -> Command:
    """Run a management command; name the missing role when the cluster refuses it."""

    def command(text: str, permission: str, operation: str) -> Any:
        try:
            return retrying(lambda: client.execute_mgmt(database, text), operation)
        except Exception as exc:  # noqa: BLE001 - SDKs and transport use different exception types
            if _denied(exc):
                raise StorePermissionError(permission, operation) from exc
            raise StoreConfigurationError(f"{operation} failed: {exc}") from exc

    return command


def querying(client: Any, database: str) -> Query:
    def query(text: str, operation: str) -> Result:
        try:
            return Result.from_response(retrying(lambda: client.execute_query(database, text), operation))
        except Exception as exc:  # noqa: BLE001 - SDKs and transport use different exception types
            if _denied(exc):
                raise StorePermissionError("Database Viewer", operation) from exc
            raise StoreConfigurationError(f"{operation} failed: {exc}") from exc

    return query


def _aictl_version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("aictl")
    except PackageNotFoundError:
        return "unknown"


# ── the registry ────────────────────────────────────────────────────


def _when(row: dict) -> tuple:
    # The client returns datetimes as epoch seconds; a test double may use ISO text.
    value = row.get("written_at")
    if isinstance(value, datetime):
        return (0, value.timestamp(), "")
    return (0, float(value), "") if isinstance(value, (int, float)) else (1, 0.0, str(value or ""))


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, timezone.utc).isoformat(timespec="seconds")
    return str(value or "")


def done_steps(rows: list[dict]) -> frozenset[str]:
    return frozenset(str(r.get("step")) for r in rows
                     if r.get("kind") == "migration" and str(r.get("detail") or "").startswith("done"))


def _plain_layouts(rows: list[dict]) -> list[dict]:
    """Layout rows of nodes: not the database record, not a migration lock."""
    return [r for r in rows if r.get("kind") == "layout" and r.get("version") is not None and not r.get("step")]


def stored_layout(rows: list[dict]) -> L.StoredLayout | None:
    """The layout of the shared tables (layout 1 and older), or None without a layout row.

    The version is the highest any node recorded, so an older node never lowers it. The
    data epoch is the one recorded first: when two nodes start on a new database at once,
    each writes a row, and both then follow the earlier one.
    """
    layouts = _plain_layouts(rows)
    steps = [r for r in rows if r.get("kind") == "migration"]
    done = done_steps(rows)

    def earliest(candidates: list[dict]) -> dict:
        return min((r for r in candidates if r.get("data_epoch")),
                   key=lambda r: (_when(r), str(r["data_epoch"])), default={})

    if not layouts:
        if not steps:
            return None
        # A migration of unversioned data was interrupted: resume it in the same data epoch.
        return L.StoredLayout(0, 0, data_epoch=str(earliest(steps).get("data_epoch") or ""), origin="migrate",
                              migrations_done=done)
    top = max(layouts, key=lambda r: (int(r["version"]), _when(r)))
    first = earliest(layouts)
    return L.StoredLayout(
        version=int(top["version"]),
        compatible_since=int(top.get("compatible_since") or 0),
        data_epoch=str(first.get("data_epoch") or ""),
        aictl_version=str(top.get("aictl_version") or ""),
        written_at=_iso(top.get("written_at")),
        origin=str(first.get("detail") or ""),
        migrations_done=done,
    )


def node_layout(rows: list[dict], node_id: str) -> L.StoredLayout | None:
    """The layout recorded for *node_id*; None when the registry has no layout row of it.

    The data epoch is the one of the node's latest layout row (a reset starts a new one);
    the version is the highest recorded in that epoch, so an older aictl never lowers it.
    """
    layouts = [r for r in _plain_layouts(rows) if str(r.get("node_id") or "") == node_id]
    if not layouts:
        return None
    latest = max(layouts, key=_when)
    epoch = str(latest.get("data_epoch") or "")
    same = [r for r in layouts if str(r.get("data_epoch") or "") == epoch]
    top = max(same, key=lambda r: (int(r["version"]), _when(r)))
    first = min(same, key=_when)
    mine = frozenset(str(r.get("step")) for r in rows if r.get("kind") == "migration"
                     and str(r.get("node_id") or "") == node_id and str(r.get("detail") or "").startswith("done"))
    return L.StoredLayout(
        version=int(top["version"]), compatible_since=int(top.get("compatible_since") or 0), data_epoch=epoch,
        aictl_version=str(top.get("aictl_version") or ""), written_at=_iso(top.get("written_at")),
        origin=str(first.get("detail") or ""), migrations_done=mine | done_steps(rows),
    )


def database_record(rows: list[dict]) -> dict | None:
    records = [r for r in rows if r.get("kind") == "database"]
    return max(records, key=lambda r: (int(r.get("compatible_since") or 0), _when(r))) if records else None


def record_command(*, version: int, compatible_since: int, epoch: str, node_id: str, kind: str,
                   step: str = "", detail: str = "") -> str:
    """Append one ``schema_version`` row synchronously, by management command, not by ingestion."""
    values = {
        "version": f"long({int(version)})",
        "project": kql_literal("", "string"),
        "node_id": kql_literal(node_id, "string"),
        "_v": "now()",
        "compatible_since": f"long({int(compatible_since)})",
        "aictl_version": kql_literal(_aictl_version(), "string"),
        "data_epoch": kql_literal(epoch, "string"),
        "written_at": "now()",
        "kind": kql_literal(kind, "string"),
        "step": kql_literal(step, "string"),
        "detail": kql_literal(detail, "string"),
    }
    if values.keys() != dict(TABLES[LAYOUT_TABLE].columns).keys():
        raise StoreConfigurationError("schema_version columns and its layout row disagree")
    table = quote(LAYOUT_TABLE)
    printed = ", ".join(f"{quote(name)}={value}" for name, value in values.items())
    # .set-or-append matches columns by position: the union puts the table's columns first.
    return f".set-or-append {table} <| {table} | take 0 | union (print {printed})"


# ── what the database holds ────────────────────────────────────────


EMPTY = "empty"    # no aictl data yet
SHARED = "shared"  # the shared tables of layout 1 and older: the node_tables migration has not finished
NODES = "nodes"    # one table set per node


@dataclass(frozen=True)
class LayoutState:
    """What a database holds, read before anything is changed."""

    have: dict[str, dict[str, str]]
    details: dict[str, dict]
    counts: dict[str, int | None]
    stored: L.StoredLayout | None  # this node's layout; on shared tables, the database's
    has_data: bool  # this node's tables hold rows; on shared tables, the shared tables do
    rows: list[dict] = field(default_factory=list)
    functions: dict[str, str] = field(default_factory=dict)
    node_id: str = ""
    mode: str = EMPTY
    shared: L.StoredLayout | None = None
    nodes: dict[str, N.Node] = field(default_factory=dict)
    legacy: dict[str, int | None] = field(default_factory=dict)  # shared tables named like logical ones
    renamed: dict[str, int | None] = field(default_factory=dict)  # legacy__ tables kept by the migration
    views: dict[str, dict] = field(default_factory=dict)  # materialized views: name -> SourceTable, IsEnabled

    @property
    def verdict(self) -> str:
        if self.mode == SHARED:
            verdict = L.assess(self.shared, has_data=True)
            return L.RESET if verdict in L.COMPATIBLE else verdict
        return L.assess(self.stored, has_data=self.has_data)

    @property
    def node(self) -> N.Node | None:
        return self.nodes.get(N.node_key(self.node_id))

    def error(self, cluster: str, database: str) -> L.StoreLayoutError:
        verdict = self.verdict
        if self.mode == SHARED:
            return L.ERRORS[verdict](verdict, self.shared, cluster=cluster, database=database)
        return L.ERRORS[verdict](verdict, self.stored, cluster=cluster, database=database, node=self.node_id)

    def node_list(self) -> list[dict]:
        return [node.as_dict() for _, node in sorted(self.nodes.items())]

    def legacy_list(self) -> list[dict]:
        return [{"table": name, "sealed_bytes": int(self.details.get(name, {}).get("TotalExtentSize") or 0)}
                for name in sorted(self.renamed)]

    def summary(self, verdict: str | None = None, warning: str | None = None) -> dict[str, Any]:
        epoch = self.stored.data_epoch if self.stored is not None else ""
        return {**L.summary(verdict or self.verdict, self.stored, epoch, warning, self.node_list(),
                            self.legacy_list()),
                "epoch_kept_data": bool(self.stored and self.stored.epoch_kept_data), "mode": self.mode}


def _counted(counts: Mapping[str, int | None], names: Iterable[str]) -> bool:
    # A table whose size is not reported counts as holding data: a wrong guess here must
    # not take old rows for a new database.
    return any(counts.get(name) is None or (counts[name] or 0) > 0 for name in names)


def _rows_in(query: Query, names: set[str]) -> bool:
    """Read the tables themselves: table details can lag fresh writes."""
    tables = ", ".join(f"(table({json.dumps(name)}))" for name in sorted(names))
    rows = query(f"union isfuzzy=true {tables} | take 1 | count", "Check aictl tables for rows").dicts()
    return bool(rows and int(rows[0].get("Count") or 0))


def count_query(names: Iterable[str]) -> str:
    """One query: the row count and newest ingestion time of each table, in one row per table."""
    legs = ", ".join(f"(table({json.dumps(name)}) | summarize n=count(), newest=max(ingestion_time())"
                     f" | extend t={json.dumps(name)})" for name in sorted(names))
    return f"union {legs}"


def count_tables(query: Query, names: Iterable[str]) -> dict[str, tuple[int, float | None]]:
    """Table -> (rows, newest ingestion time as epoch seconds; None if there is none), counted by query.

    Table details leave out rows still in the row store and in extents not yet sealed, so they
    are never the row count of a table. This reads the tables: one request for all of *names*.
    """
    names = sorted(names)
    if not names:
        return {}
    result = query(count_query(names), "Count the rows of the tables").dicts()
    found = {str(row["t"]): (int(row.get("n") or 0), row.get("newest")) for row in result}
    return {name: found.get(name, (0, None)) for name in names}


def inspect(command: Command, query: Query, node_id: str = "") -> LayoutState:
    """Read the schema, the table details, the functions and the registry. Changes nothing."""
    have: dict[str, dict[str, str]] = {}
    response = command(_SCHEMA_QUERY, "Database Viewer", "Read database schema")
    for name, column, kind in Result.from_response(response).rows:
        if name and column:
            have.setdefault(name, {})[column] = _TYPES.get(kind, kind)
    details: dict[str, dict] = {}
    if have:
        response = command(_POLICY_QUERY, "Database Viewer", "Read table policies")
        details = {row["TableName"]: row for row in Result.from_response(response).dicts() if row.get("TableName")}
    counts = N.table_counts(details)
    response = command(_FUNCTIONS_QUERY, "Database Viewer", "Read stored functions")
    functions = {str(row["Name"]): str(row.get("Body") or "") for row in Result.from_response(response).dicts()
                 if row.get("Name")}
    response = command(C.VIEWS_QUERY, "Database Viewer", "Read materialized views")
    views = {str(row["Name"]): row for row in Result.from_response(response).dicts() if row.get("Name")}
    rows: list[dict] = []
    if {"kind", "version", "compatible_since", "data_epoch"} <= have.get(LAYOUT_TABLE, {}).keys():
        rows = query(LAYOUT_QUERY, "Read the data layout").dicts()

    logical = logical_tables()
    nodes: dict[str, N.Node] = {}
    for name in have:
        table = N.parse(name, details.get(name, {}).get("DocString"), logical)
        if table is None:
            continue
        node = nodes.setdefault(table.key, N.Node(table.key))
        node.tables[table.logical] = name
        node.node_id = node.node_id if node.node_id is not None else table.node_id
        row = details.get(name, {})
        node.extents += int(row.get("TotalExtents") or 0)
        node.sealed += int(row.get("TotalExtentSize") or 0)
    for row in _plain_layouts(rows):
        ident = str(row.get("node_id") or "")
        node = nodes.setdefault(N.node_key(ident), N.Node(N.node_key(ident)))
        node.node_id = ident
    for node in nodes.values():
        if node.node_id is not None:
            node.stored = node_layout(rows, node.node_id)
        node.included, node.reason = N.readable(node.stored, L.LAYOUT_VERSION, L.COMPATIBLE_SINCE)

    legacy = {name: counts.get(name) for name in have
              if name in logical and name not in N.SHARED_TABLES and name not in N.COLLECTOR_TABLES}
    renamed = {name: counts.get(name) for name in have if name.startswith(N.LEGACY_PREFIX)}
    done = done_steps(rows)
    started = any(str(r.get("step") or "").startswith(NODE_TABLES) for r in rows if r.get("kind") != "database")
    record = database_record(rows)
    # The layout of the shared tables: without the database record and without the node layout
    # rows an interrupted node_tables migration already wrote (those belong to the node tables).
    shared = stored_layout([r for r in rows if r.get("kind") != "database" and not (
        r.get("kind") == "layout" and int(r.get("version") or 0) >= L.NODE_TABLES_SINCE
        and int(r.get("compatible_since") or 0) <= L.LAYOUT_VERSION)]) if rows else None
    if record is not None and (NODE_TABLES in done or not started):
        mode = NODES
    elif record is not None or started:
        mode = SHARED  # the node_tables migration was interrupted: resume it
    elif shared is not None or (legacy and (_counted(counts, legacy) or _rows_in(query, set(legacy)))):
        mode = SHARED
    else:
        mode = EMPTY

    if mode == SHARED:
        return LayoutState(have, details, counts, shared, True, rows, functions, node_id, mode, shared, nodes,
                           legacy, renamed, views)
    mine = nodes.get(N.node_key(node_id))
    stored = mine.stored if mine is not None else None
    tables = set(mine.tables.values()) if mine is not None else set()
    has_data = _counted(counts, tables)
    if stored is None and tables and not has_data:
        has_data = _rows_in(query, tables)
    return LayoutState(have, details, counts, stored, has_data, rows, functions, node_id, mode, shared, nodes,
                       legacy, renamed, views)


def check_layout(client: Any, database: str, node_id: str = "") -> LayoutState:
    """The stored layout and its verdict, for a read-only open, ``aictl db layout`` and the start prompt."""
    return inspect(management(client, database), querying(client, database), node_id)


# ── stored functions ────────────────────────────────────────────────


def function_commands(state: LayoutState, logical: Iterable[str]) -> list[str]:
    """The ``.create-or-alter function`` (or drop) commands that bring the functions up to date."""
    included = [node for node in state.nodes.values() if node.included]
    commands = []
    for name in sorted(set(logical) - N.SHARED_TABLES):
        if name not in TABLES:
            continue  # a table a newer aictl added: its nodes keep its function
        legs = sorted(node.tables[name] for node in included if name in node.tables)
        if "_observations" in name and not legs:
            if name in state.functions:
                commands.append(f".drop function {quote(name)} ifexists")
            continue
        collector = name if name in N.COLLECTOR_TABLES and name in state.have else None
        body = N.function_body(logical_columns(name), legs, collector)
        if N.normalized_body(state.functions.get(name)) != N.normalized_body(body):
            commands.append(N.function_command(name, body, N.function_docstring(
                name, [leg.rsplit(N.SEPARATOR, 1)[1] for leg in legs], bool(collector))))
    for name in sorted(C.CURRENT_TABLES):
        # The current view of each included node; a node whose view does not exist yet is left out of
        # it until its start creates the view (current.py).
        views = sorted(view for node in included if name in node.tables
                       if (view := C.physical(name, node.key)) in state.views)
        columns = (*logical_columns(name), (C.HOUR, "datetime"))
        body = N.function_body(columns, views)
        if N.normalized_body(state.functions.get(C.logical(name))) != N.normalized_body(body):
            docstring = (f"aictl current view {C.logical(name)}: the union of {len(views)} node view(s) of the current "
                         f"row of each {name} key. See docs/storage-schema.md.")
            commands.append(N.function_command(C.logical(name), body, docstring))
    registry = N.registry_function_command()
    if N.normalized_body(state.functions.get("aictl_nodes")) != N.normalized_body(_body(registry)):
        commands.append(registry)
    return commands


def _body(command: str) -> str:
    return command[command.index("{"):]


def sync_functions(command: Command, query: Query, node_id: str, logical: Iterable[str],
                   attempts: int = 3) -> LayoutState:
    """Regenerate the functions until a read after the writes finds nothing to change.

    Each node records its tables and layout row before it calls this, so a node that reads
    after another node's writes includes that node; a read after one's own writes catches
    a stale write that landed after another node's newer one.
    """
    logical = set(logical)
    state = inspect(command, query, node_id)
    for _ in range(attempts):
        pending = function_commands(state, logical)
        if not pending:
            return state
        for text in pending:
            command(text, "Database User (create) or Function Admin", "Create or alter the stored functions")
        state = inspect(command, query, node_id)
    return state


# ── this node's tables ──────────────────────────────────────────────


def _created_docstrings(command: Command, node_id: str, key: str, created: Iterable[tuple[str, str]]) -> None:
    for logical, name in created:
        command(f".alter table {quote(name)} docstring {json.dumps(N.table_docstring(node_id, key, logical))}",
                "Table Admin", f"Describe {name}")


def create_node_tables(command: Command, node_id: str, specs: Mapping[str, tuple[tuple[str, str], ...]],
                       have: Mapping[str, Mapping[str, str]]) -> list[tuple[str, str]]:
    """Create or widen this node's tables in one command. Returns (logical, physical) of the new ones."""
    key = N.node_key(node_id)
    wanted = {}
    for logical, columns in specs.items():
        name = N.physical(logical, key)
        if not set(dict(columns)) <= have.get(name, {}).keys():
            wanted[name] = (logical, columns)
    if not wanted:
        return []
    spec = ", ".join(f"{quote(name)}(" + ", ".join(f"{quote(c)}:{t}" for c, t in columns) + ")"
                     for name, (_, columns) in sorted(wanted.items()))
    command(f".create-merge tables {spec} with (folder = {json.dumps(N.folder(key))}, docstring = "
            f"{json.dumps(N.node_docstring(node_id, key))})",
            "Database User (create) or Table Admin (alter)", f"Create or widen the tables of node {node_id}")
    created = [(logical, name) for name, (logical, _) in sorted(wanted.items()) if name not in have]
    _created_docstrings(command, node_id, key, created)
    return created


def ensure_current_views(command: Command, state: LayoutState, node_id: str, tables: Mapping[str, Table], *,
                         created: set[str], retained: set[str], wait_s: float = 3600.0) -> list[str]:
    """Create this node's current views (current.py) that do not exist, and enable a disabled one.

    A view over a table this start created is empty and readable at once; a view over a table
    that may hold rows is built from them (backfill), which the start waits for, because the
    view cannot be read before. Returns the names of the views created.
    """
    key = N.node_key(node_id)
    made = []
    for name, table in sorted(tables.items()):
        view = C.physical(name, key)
        row = state.views.get(view)
        if row is not None:
            if str(row.get("IsEnabled")).lower() in ("false", "0"):
                command(f".enable materialized-view {quote(view)}", "Materialized View Admin or Database Admin",
                        f"Enable {view}")
            if N.physical(name, key) in retained:
                command(C.retention_command(name, key, table.retention_timespan), "Database Admin",
                        f"Set retention for {view}")
            continue
        backfill = name not in created
        result = command(C.create_command(name, node_id, key, table.key, backfill=backfill), "Database Admin",
                         f"Create the current view {view}")
        if backfill:
            _wait_for_operation(command, Result.from_response(result).dicts(), view, wait_s)
        command(C.partitioning_command(name, key), "Database Admin", f"Partition {view} by day")
        command(C.retention_command(name, key, table.retention_timespan), "Database Admin",
                f"Set retention for {view}")
        made.append(view)
    return made


def _wait_for_operation(command: Command, rows: list[dict], what: str, wait_s: float) -> None:
    """Wait for the async operation a ``.create async`` started; raise when it fails or takes too long."""
    import time

    operation = str(rows[0].get("OperationId") or "") if rows else ""
    if not operation:
        return
    deadline = time.monotonic() + wait_s
    log.info("Building %s from the rows already stored (operation %s)", what, operation)
    while True:
        states = Result.from_response(command(f".show operations {operation}", "Database Viewer",
                                              f"Read the progress of {what}")).dicts()
        state = str(states[-1].get("State") or "") if states else ""
        if state == "Completed":
            return
        if state in ("Failed", "Abandoned", "BadInput", "Canceled", "Throttled", "PartiallySucceeded"):
            raise StoreConfigurationError(f"Building {what} failed ({state}): {states[-1].get('Status')}. "
                                          "Start aictl again to retry.")
        if time.monotonic() > deadline:
            raise StoreConfigurationError(f"Building {what} did not finish in {wait_s:.0f} s (operation {operation}); "
                                          "start aictl again once it is done (.show operations).")
        time.sleep(5)


def retention_commands(periods: Mapping[str, tuple[str, str]], details: Mapping[str, dict]) -> list[str]:
    """``.alter tables (...) policy retention`` per period, for tables whose period differs.

    *periods*: {physical table: (timespan as Kusto shows it, e.g. 365.00:00:00)}.
    """
    by_period: dict[str, list[str]] = {}
    for name, (timespan, _) in periods.items():
        if _policy(details.get(name, {}).get("RetentionPolicy")).get("SoftDeletePeriod") != timespan:
            by_period.setdefault(timespan, []).append(name)
    policy = '{{"SoftDeletePeriod": "{0}", "Recoverability": "Enabled"}}'
    return [f".alter tables ({', '.join(quote(n) for n in sorted(names))}) policy retention "
            f"{json.dumps(policy.format(timespan))}" for timespan, names in sorted(by_period.items())]


def ensure_schema(
    client: Any,
    database: str,
    *,
    modes: Mapping[str, IngestionMode] | None = None,
    tables: Mapping[str, Table] = TABLES,
    node_id: str = "",
    cluster: str = "",
    origin: str = "new",
    reset: bool = False,
) -> SchemaStatus:
    """Check the database and this node's layout, then create this node's tables and the functions.

    Nothing is created, widened or written before the checks pass. A database on the shared
    tables, or this node's tables on an older incompatible layout, raises: such data is reset,
    never converted. Refuse incompatible column types. *reset*: this node's tables were just
    dropped; start a new data epoch for it whatever its earlier layout rows say.
    """
    command, query = management(client, database), querying(client, database)
    state = inspect(command, query, node_id)
    if state.mode == SHARED:
        raise state.error(cluster, database)

    verdict = state.verdict
    if reset and state.mode != SHARED and verdict != L.NEWER:
        state = replace(state, stored=None, has_data=False)
        verdict = L.NEW
    if verdict not in L.COMPATIBLE:
        raise state.error(cluster, database)
    key = N.node_key(node_id)
    have, details = state.have, state.details
    specs = {name: logical_columns(name) for name, table in tables.items()
             if name not in N.SHARED_TABLES and ("_observations" not in name or N.physical(name, key) in have
                                                    or name in have or N.legacy_name(name) in have)}
    mapping = {name: N.physical(name, key) for name in specs}
    for name, columns in [*((mapping[n], c) for n, c in specs.items()),
                          (LAYOUT_TABLE, TABLES[LAYOUT_TABLE].columns)]:
        existing = have.get(name, {})
        for column, kind in columns:
            if column in existing and existing[column] != kind:
                raise StoreConfigurationError(f"{name}.{column} has Kusto type {existing[column]}; expected {kind}")

    if state.mode == EMPTY:
        if state.legacy:
            # Empty shared tables of an older aictl: move them out of the way of the functions.
            command(".rename tables " + ", ".join(f"{quote(N.legacy_name(n))} = {quote(n)}" for n in sorted(state.legacy)),
                    "Database Admin", "Rename the empty shared tables")
        report_tables = {"requests", "tool_invocations"}
        if report_tables <= tables.keys() and not have.keys() & (report_tables | COMPANIONS | {CURRENT_STORE}):
            # A fresh layout is complete once both fact tables exist. Never mark an
            # existing baseline whose unresolved evidence may not be represented.
            command(f".create-merge table {quote(CURRENT_STORE)} (['version']:long)",
                    "Database User (create)", "Mark native report layout")
    if not set(dict(TABLES[LAYOUT_TABLE].columns)) <= have.get(LAYOUT_TABLE, {}).keys():
        command(f".create-merge table {quote(LAYOUT_TABLE)} ("
                + ", ".join(f"{quote(c)}:{t}" for c, t in TABLES[LAYOUT_TABLE].columns) + ")",
                "Database User (create) or Table Admin (alter)", "Create or widen schema_version")
    created = create_node_tables(command, node_id, specs, have)
    changed = bool(created) or any(not set(dict(c)) <= have.get(mapping[n], {}).keys() for n, c in specs.items())

    streamed = {mapping[name] for name, table in tables.items() if name in mapping
                and (modes.get(name, table.ingestion) if modes is not None else table.ingestion) == "streaming"}
    streaming = bool(streamed)
    warning = None
    if streaming and not all(_policy(details.get(name, {}).get("StreamingIngestionPolicy")).get("IsEnabled") is True
                             for name in streamed):
        try:
            result = command(f".show database {quote(database)} policy streamingingestion", "Database Viewer",
                             "Read database streaming ingestion policy")
            rows = Result.from_response(result).dicts()
            if not any(_policy(row.get("Policy")).get("IsEnabled") is True for row in rows):
                command(f".alter database {quote(database)} policy streamingingestion enable", "Database Admin",
                        "Set streaming ingestion policy")
            else:
                for name in sorted(streamed & details.keys()):
                    if _policy(details[name].get("StreamingIngestionPolicy")).get("IsEnabled") is False:
                        command(f".alter table {quote(name)} policy streamingingestion enable", "Table Admin",
                                f"Set streaming ingestion policy for {name}")
        except StoreConfigurationError as exc:
            streaming = False
            warning = f"{exc}; using queued ingestion"
            log.warning("%s", warning)

    periods = {mapping[name]: (table.retention_timespan, table.retention_literal)
               for name, table in tables.items() if name in mapping}
    periods[LAYOUT_TABLE] = (TABLES[LAYOUT_TABLE].retention_timespan, TABLES[LAYOUT_TABLE].retention_literal)
    retained = set()
    for text in retention_commands(periods, details):
        names = ", ".join(n.strip("[]'") for n in text.split("(", 1)[1].split(")", 1)[0].split(", "))
        retained |= set(names.split(", "))
        command(text, "Table Admin or Database Admin", f"Set retention for {names}")
    if changed and streaming:
        clear_streaming_schema_cache(
            lambda text: Result.from_response(command(text, "Database Ingestor", "Clear streaming schema cache"))
        )

    stored = state.stored
    has_epoch = stored is not None and bool(stored.data_epoch)
    epoch = stored.data_epoch if has_epoch else uuid.uuid4().hex
    # A new epoch for data that was kept (an upgrade of unversioned data) keeps restart state.
    kept = stored.epoch_kept_data if has_epoch else verdict != L.NEW

    def record(kind: str, detail: str, step: str = "", version: int = L.LAYOUT_VERSION, node: str = node_id,
               compatible_since: int = L.COMPATIBLE_SINCE) -> None:
        command(record_command(version=version, compatible_since=compatible_since, epoch=epoch, node_id=node,
                               kind=kind, step=step, detail=detail),
                "Database User or Table Ingestor", "Record the data layout")

    if state.mode == EMPTY and database_record(state.rows) is None:
        record("database", "node tables", NODE_TABLES, compatible_since=L.NODE_TABLES_SINCE, node="")
    if verdict == L.NEW:
        record("layout", origin)
    elif verdict == L.UPGRADE:
        record("layout", "upgrade")
    if verdict != L.CURRENT:
        log.info("Data layout %s recorded for node %s in %s (stored: %s; data epoch %s)", L.LAYOUT_VERSION, node_id,
                 database, L.describe(stored), epoch)
    ensure_current_views(command, state, node_id, {name: tables[name] for name in C.CURRENT_TABLES if name in mapping},
                         created={logical for logical, _ in created}, retained=retained)
    final = sync_functions(command, query, node_id, set(tables) | {n for node in state.nodes.values()
                                                                   for n in node.tables})
    reported = verdict
    stored_now = final.stored or stored
    summary = {**L.summary(reported, stored, epoch, None, final.node_list(), final.legacy_list()),
               "epoch_kept_data": kept, "mode": final.mode}
    if stored_now is not None and stored_now.data_epoch:
        epoch = stored_now.data_epoch
    return SchemaStatus(streaming, warning, summary, epoch, kept, {**mapping, LAYOUT_TABLE: LAYOUT_TABLE})


def clear_streaming_schema_cache(command: Callable[[str], Result]) -> None:
    """Refresh engine schema caches after a table change, if permitted."""
    for _ in range(3):
        try:
            rows = command(".clear database cache streamingingestion schema").dicts()
        except Exception as exc:  # noqa: BLE001 - stale caches can be retried on ingestion
            log.warning("Kusto streaming schema cache was not cleared: %s", str(exc)[:300])
            return
        failed = [row for row in rows if str(row.get("Status", "Succeeded")) != "Succeeded"]
        if not failed:
            return
    log.warning("Kusto streaming schema cache was not cleared on %d node(s)", len(failed))
