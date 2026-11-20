"""Provision the Kusto store outside the data write path."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from ...kusto.observations import COMPANIONS, CURRENT_STORE
from ..base import StoreConfigurationError, StorePermissionError
from .client import Result, quote, retrying
from .tables import TABLES, IngestionMode, Table

log = logging.getLogger(__name__)
_SCHEMA_QUERY = ".show database schema | project TableName, ColumnName, ColumnType"
_POLICY_QUERY = ".show tables details | project TableName, RetentionPolicy, StreamingIngestionPolicy"
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


@dataclass(frozen=True)
class SchemaStatus:
    streaming_available: bool
    warning: str | None = None


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


def ensure_schema(
    client: Any,
    database: str,
    *,
    modes: Mapping[str, IngestionMode] | None = None,
    tables: Mapping[str, Table] = TABLES,
) -> SchemaStatus:
    """Create missing tables/columns and apply retention. Refuse incompatible types."""

    def command(text: str, permission: str, operation: str) -> Any:
        try:
            return retrying(lambda: client.execute_mgmt(database, text), operation)
        except Exception as exc:  # noqa: BLE001 - SDKs and transport use different exception types
            if _denied(exc):
                raise StorePermissionError(permission, operation) from exc
            raise StoreConfigurationError(f"{operation} failed: {exc}") from exc

    have: dict[str, dict[str, str]] = {}
    response = command(_SCHEMA_QUERY, "Database Viewer", "Read database schema")
    for name, column, kind in Result.from_response(response).rows:
        if column:
            have.setdefault(name, {})[column] = _TYPES.get(kind, kind)

    report_tables = {"requests", "tool_invocations"}
    if report_tables <= tables.keys() and not have.keys() & (report_tables | COMPANIONS | {CURRENT_STORE}):
        # A fresh layout is complete once both fact tables exist. Never mark an
        # existing baseline whose unresolved evidence may not be represented.
        command(f".create-merge table {quote(CURRENT_STORE)} (['version']:long)",
                "Database User (create)", "Mark native report layout")
    tables = {name: table for name, table in tables.items()
              if "_observations" not in name or name in have}

    details = {}
    if have:
        response = command(_POLICY_QUERY, "Database Viewer", "Read table policies")
        details = {
            row["TableName"]: (_policy(row["RetentionPolicy"]), _policy(row["StreamingIngestionPolicy"]))
            for row in Result.from_response(response).dicts() if "RetentionPolicy" in row
        }

    changed = False
    for name, table in tables.items():
        existing = have.get(name, {})
        wanted = (*table.columns, *LEGACY_COLUMNS.get(name, ()))
        for column, kind in wanted:
            if column in existing and existing[column] != kind:
                raise StoreConfigurationError(f"{name}.{column} has Kusto type {existing[column]}; expected {kind}")
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
        if details.get(name, ({}, {}))[0].get("SoftDeletePeriod") == f"{table.retention_days}.00:00:00":
            continue
        command(
            f".alter-merge table {quote(name)} policy retention softdelete = {table.retention_days}d",
            "Table Admin or Database Admin",
            f"Set retention for {name}",
        )
    if changed and streaming:
        clear_streaming_schema_cache(
            lambda text: Result.from_response(command(text, "Database Ingestor", "Clear streaming schema cache"))
        )
    return SchemaStatus(streaming, warning)


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
