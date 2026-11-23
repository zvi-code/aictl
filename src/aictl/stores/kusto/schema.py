"""Provision the Kusto store outside the data write path."""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from ...kusto.observations import COMPANIONS, CURRENT_STORE
from ..base import StoreConfigurationError, StorePermissionError
from . import layout as L
from .client import Result, kql_literal, quote, retrying
from .tables import TABLES, IngestionMode, Table

log = logging.getLogger(__name__)
_SCHEMA_QUERY = ".show database schema | project TableName, ColumnName, ColumnType"
_POLICY_QUERY = ".show tables details | project TableName, TotalRowCount, RetentionPolicy, StreamingIngestionPolicy"
LAYOUT_TABLE = "schema_version"
_LAYOUT_COLUMNS = ("kind", "version", "compatible_since", "data_epoch", "aictl_version", "written_at", "step",
                   "detail")
LAYOUT_QUERY = f"{quote(LAYOUT_TABLE)} | project {', '.join(quote(c) for c in _LAYOUT_COLUMNS)} | take 10000"
# Tables earlier aictl versions created. They belong to aictl, and a reset drops them.
LEGACY_OWNED = frozenset({"aictl_information_schema"})
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


def owned_tables() -> frozenset[str]:
    """Every table aictl creates in its database. A reset drops these and no other table."""
    from .otel import TABLES as OTEL_TABLES

    return frozenset(TABLES) | {t.name for t in OTEL_TABLES} | {CURRENT_STORE} | COMPANIONS | LEGACY_OWNED


@dataclass(frozen=True)
class SchemaStatus:
    streaming_available: bool
    warning: str | None = None
    # The layout object of the store health (layout.summary), and the facts of the data
    # epoch that the restart state check needs.
    layout: dict | None = None
    data_epoch: str = ""
    epoch_kept_data: bool = False


def _denied(exc: Exception) -> bool:
    status = getattr(getattr(exc, "http_response", None), "status_code", None)
    if status in (401, 403):
        return True
    message = str(exc).casefold()
    return any(s in message for s in ("forbidden", "unauthorized", "not authorized", "insufficient permission"))


def _policy(value: Any) -> dict:
    if isinstance(value, str):
        value = json.loads(value)
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


def stored_layout(rows: list[dict]) -> L.StoredLayout | None:
    """The layout that the ``schema_version`` rows record, or None without a layout row.

    The version is the highest any node recorded, so an older node never lowers it. The
    data epoch is the one recorded first: when two nodes start on a new database at once,
    each writes a row, and both then follow the earlier one.
    """
    layouts = [r for r in rows if r.get("kind") == "layout" and r.get("version") is not None]
    steps = [r for r in rows if r.get("kind") == "migration"]
    done = frozenset(str(r.get("step")) for r in steps if str(r.get("detail") or "").startswith("done"))

    def when(row: dict) -> tuple:
        # The client returns datetimes as epoch seconds; a test double may use ISO text.
        value = row.get("written_at")
        return (0, float(value), "") if isinstance(value, (int, float)) else (1, 0.0, str(value or ""))

    def earliest(candidates: list[dict]) -> dict:
        return min((r for r in candidates if r.get("data_epoch")),
                   key=lambda r: (when(r), str(r["data_epoch"])), default={})

    if not layouts:
        if not steps:
            return None
        # A migration of unversioned data was interrupted: resume it in the same data epoch.
        return L.StoredLayout(0, 0, data_epoch=str(earliest(steps).get("data_epoch") or ""), origin="migrate",
                              migrations_done=done)
    top = max(layouts, key=lambda r: (int(r["version"]), when(r)))
    first = earliest(layouts)
    return L.StoredLayout(
        version=int(top["version"]),
        compatible_since=int(top.get("compatible_since") or 0),
        data_epoch=str(first.get("data_epoch") or ""),
        aictl_version=str(top.get("aictl_version") or ""),
        written_at=(datetime.fromtimestamp(top["written_at"], timezone.utc).isoformat(timespec="seconds")
                    if isinstance(top.get("written_at"), (int, float)) else str(top.get("written_at") or "")),
        origin=str(first.get("detail") or ""),
        migrations_done=done,
    )


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


@dataclass(frozen=True)
class LayoutState:
    """What a database holds, read before anything is changed."""

    have: dict[str, dict[str, str]]
    details: dict[str, tuple[dict, dict]]
    counts: dict[str, int | None]
    stored: L.StoredLayout | None
    has_data: bool

    @property
    def verdict(self) -> str:
        return L.assess(self.stored, has_data=self.has_data)


def inspect(command: Command, query: Query) -> LayoutState:
    """Read the schema, the table sizes and the layout rows. Changes nothing."""
    have: dict[str, dict[str, str]] = {}
    response = command(_SCHEMA_QUERY, "Database Viewer", "Read database schema")
    for name, column, kind in Result.from_response(response).rows:
        if column:
            have.setdefault(name, {})[column] = _TYPES.get(kind, kind)
    details: dict[str, tuple[dict, dict]] = {}
    counts: dict[str, int | None] = {}
    if have:
        response = command(_POLICY_QUERY, "Database Viewer", "Read table policies")
        for row in Result.from_response(response).dicts():
            if "TableName" not in row:
                continue
            count = row.get("TotalRowCount")
            counts[row["TableName"]] = None if count is None else int(count)
            if "RetentionPolicy" in row:
                details[row["TableName"]] = (_policy(row["RetentionPolicy"]), _policy(row["StreamingIngestionPolicy"]))
    stored = None
    if set(_LAYOUT_COLUMNS) <= have.get(LAYOUT_TABLE, {}).keys():
        stored = stored_layout(query(LAYOUT_QUERY, "Read the data layout").dicts())
    # A table whose size is not reported counts as holding data: a wrong guess here must
    # not take old rows for a new database.
    data_tables = (have.keys() & owned_tables()) - {LAYOUT_TABLE, CURRENT_STORE}
    has_data = any(counts.get(name) is None or counts[name] > 0 for name in data_tables)
    if stored is None and data_tables and not has_data:
        # Table details can lag fresh writes: read the tables themselves before calling them empty.
        tables = ", ".join(quote(name) for name in sorted(data_tables))
        rows = query(f"union isfuzzy=true {tables} | take 1 | count", "Check aictl tables for rows").dicts()
        has_data = bool(rows and int(rows[0].get("Count") or 0))
    return LayoutState(have, details, counts, stored, has_data)


def check_layout(client: Any, database: str) -> LayoutState:
    """The stored layout and its verdict, for a read-only open, ``aictl db layout`` and the start prompt."""
    return inspect(management(client, database), querying(client, database))


# migrate(stored, data_epoch, record) runs the migration steps; record(change, migration, detail).
Migrate = Callable[..., None]


def ensure_schema(
    client: Any,
    database: str,
    *,
    modes: Mapping[str, IngestionMode] | None = None,
    tables: Mapping[str, Table] = TABLES,
    node_id: str = "",
    cluster: str = "",
    migrate: Migrate | None = None,
    origin: str = "new",
) -> SchemaStatus:
    """Check the stored layout, then create missing tables/columns and apply retention.

    Nothing is created, widened or written before the layout check passes. An older,
    incompatible layout raises unless *migrate* is given; *migrate* runs after the tables
    are widened and before the new version is recorded. Refuse incompatible column types.
    """
    command = management(client, database)
    state = inspect(command, querying(client, database))
    have, details, stored, verdict = state.have, state.details, state.stored, state.verdict
    migrating = verdict == L.MIGRATE and migrate is not None
    if verdict not in L.COMPATIBLE and not migrating:
        raise L.ERRORS[verdict](verdict, stored, cluster=cluster, database=database)
    tables = {**tables, LAYOUT_TABLE: TABLES[LAYOUT_TABLE]}
    for name, table in tables.items():
        existing = have.get(name, {})
        for column, kind in (*table.columns, *LEGACY_COLUMNS.get(name, ())):
            if column in existing and existing[column] != kind:
                raise StoreConfigurationError(f"{name}.{column} has Kusto type {existing[column]}; expected {kind}")

    report_tables = {"requests", "tool_invocations"}
    if report_tables <= tables.keys() and not have.keys() & (report_tables | COMPANIONS | {CURRENT_STORE}):
        # A fresh layout is complete once both fact tables exist. Never mark an
        # existing baseline whose unresolved evidence may not be represented.
        command(f".create-merge table {quote(CURRENT_STORE)} (['version']:long)",
                "Database User (create)", "Mark native report layout")
    tables = {name: table for name, table in tables.items()
              if "_observations" not in name or name in have}

    changed = False
    for name, table in tables.items():
        existing = have.get(name, {})
        wanted = (*table.columns, *LEGACY_COLUMNS.get(name, ()))
        if not set(dict(wanted)) <= existing.keys():
            spec = ", ".join(f"{quote(column)}:{kind}" for column, kind in wanted)
            command(
                f".create-merge table {quote(name)} ({spec})",
                "Database User (create) or Table Admin (alter)",
                f"Create or widen {name}",
            )
            changed = True

    streamed = {name for name, table in tables.items()
                if (modes.get(name, table.ingestion) if modes is not None else table.ingestion) == "streaming"}
    streaming = bool(streamed)
    warning = None
    if streaming and not all(details.get(name, ({}, {}))[1].get("IsEnabled") is True for name in streamed):
        try:
            result = command(f".show database {quote(database)} policy streamingingestion", "Database Viewer",
                             "Read database streaming ingestion policy")
            rows = Result.from_response(result).dicts()
            if not any(_policy(row.get("Policy")).get("IsEnabled") is True for row in rows):
                command(f".alter database {quote(database)} policy streamingingestion enable", "Database Admin",
                        "Set streaming ingestion policy")
            else:
                for name in sorted(streamed & details.keys()):
                    if details[name][1].get("IsEnabled") is False:
                        command(f".alter table {quote(name)} policy streamingingestion enable", "Table Admin",
                                f"Set streaming ingestion policy for {name}")
        except StoreConfigurationError as exc:
            streaming = False
            warning = f"{exc}; using queued ingestion"
            log.warning("%s", warning)

    for name, table in tables.items():
        if details.get(name, ({}, {}))[0].get("SoftDeletePeriod") == table.retention_timespan:
            continue
        command(
            f".alter-merge table {quote(name)} policy retention softdelete = {table.retention_literal}",
            "Table Admin or Database Admin",
            f"Set retention for {name}",
        )
    if changed and streaming:
        clear_streaming_schema_cache(
            lambda text: Result.from_response(command(text, "Database Ingestor", "Clear streaming schema cache"))
        )

    has_epoch = stored is not None and bool(stored.data_epoch)
    epoch = stored.data_epoch if has_epoch else uuid.uuid4().hex
    # A new epoch for data that was kept (a migration of unversioned data) keeps restart state.
    kept = stored.epoch_kept_data if has_epoch else verdict != L.NEW

    def record(kind: str, detail: str, step: str = "", version: int = L.LAYOUT_VERSION) -> None:
        command(record_command(version=version, compatible_since=L.COMPATIBLE_SINCE, epoch=epoch,
                               node_id=node_id, kind=kind, step=step, detail=detail),
                "Database User or Table Ingestor", "Record the data layout")

    if migrating:
        assert migrate is not None
        migrate(stored or L.UNVERSIONED, epoch,
                lambda change, migration, detail: record("migration", detail, migration.name, change.version))
        record("layout", "migrate")
    elif verdict == L.NEW:
        record("layout", origin)
    elif verdict == L.UPGRADE:
        record("layout", "upgrade")
    if verdict != L.CURRENT:
        log.info("Data layout %s recorded in %s (stored: %s; data epoch %s)", L.LAYOUT_VERSION, database,
                 L.describe(stored), epoch)
    summary = {**L.summary(verdict, stored, epoch), "epoch_kept_data": kept}
    return SchemaStatus(streaming, warning, summary, epoch, kept)


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
