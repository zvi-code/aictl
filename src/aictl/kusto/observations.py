"""Immutable evidence for mutable facts whose source order is not yet established.

These are not replacement canonical rows. Missing source revisions and identity
links remain unknown; readers must not turn arrival order into source authority.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .schema import Table

FAMILIES = (
    "requests", "tool_invocations", "sessions", "agents", "session_usage",
    "session_processes", "session_prompts", "skill_uses", "file_write_events",
    "context_events", "session_loaded_files", "session_context_items",
)
PRODUCER_ID = uuid.uuid4().hex


def table_name(family: str) -> str:
    if family not in FAMILIES:
        raise ValueError(f"Unknown observation family: {family}")
    return family + "_observations"


def tables_for(baseline: dict[str, Table]) -> dict[str, Table]:
    from .schema import Column, Table

    envelope = [
        Column("observation_id", "TEXT", "string"),
        Column("observation_source", "TEXT", "string"),
        Column("source_entity_id", "TEXT", "string"),
        Column("producer_id", "TEXT", "string"),
        Column("source_revision", "INTEGER", "long"),
        Column("event_time", "TEXT", "datetime"),
        Column("received_time", "TEXT", "datetime"),
        Column("presence", "TEXT", "string"),
        Column("source_presence_known", "INTEGER", "bool"),
        Column("serialized_fields", "TEXT", "string"),
        Column("observation_operation", "TEXT", "string"),
    ]
    result = {}
    for family in FAMILIES:
        original = baseline[family]
        columns = [
            Column(c.name, c.sqlite_type, c.kusto_type, c.default, c.not_null)
            for c in original.columns
        ]
        if family in ("requests", "tool_invocations"):
            columns.append(Column("source_ts", "REAL", "real"))
        if family == "session_processes":
            columns.append(Column("trace_id", "TEXT", "string"))
        if not any(c.name == "project_path" for c in columns):
            columns.append(Column("project_path", "TEXT", "string"))
        if family == "sessions":
            columns.append(Column("ts", "REAL", "real"))
        result[table_name(family)] = Table(
            name=table_name(family), columns=columns + envelope, key=("observation_id",)
        )
    return result


def envelope(
    values: dict[str, Any], *, source: str, operation: str,
    source_entity_id: str = "", observation_id: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    stamp = values.get("ts") or values.get("last_activity_at") or values.get("started_at")
    event_time = datetime.fromtimestamp(float(stamp), timezone.utc) if stamp else None
    return values | {
        "observation_id": observation_id or uuid.uuid4().hex,
        "observation_source": source,
        "source_entity_id": source_entity_id,
        "producer_id": PRODUCER_ID,
        # A call start or ingestion timestamp is not an upstream revision.
        "source_revision": None,
        "event_time": event_time,
        "received_time": now,
        "presence": None,
        "source_presence_known": False,
        "serialized_fields": json.dumps(sorted(values)),
        "observation_operation": operation,
    }


def typed_identity(identity: int, values: dict[str, Any]) -> str:
    payload = json.dumps(values, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(f"{PRODUCER_ID}:{identity}:{payload}".encode()).hexdigest()


def unresolved_query(families: tuple[str, ...]) -> str:
    keys = ", ".join(json.dumps("observation_cutover:" + family) for family in sorted(set(families)))
    return (
        "['maintenance_state'] | summarize arg_max(['_v'], *) by ['key']"
        f" | where ['_deleted'] == false and ['key'] in ({keys})"
        " | project family=substring(['key'], 20), policy=['text']"
    )


class UnresolvedObservationsError(RuntimeError):
    def __init__(self, families: tuple[str, ...], *, reason: str = "source identity/revision is unresolved"):
        self.families = families
        super().__init__(
            "Canonical results are incomplete: unresolved source identity/revision in "
            + ", ".join(table_name(family) for family in families)
            + f" ({reason}). Observations are retained; arrival order has not been used to guess totals."
        )
