"""Explicit administration. Collectors and the writer do not run commands."""

import math
from datetime import datetime, timezone

from ...state_file import StateFile, TextWatermark, restart_directory
from ..base import StoreError
from .client import KustoClientFactory, Result, kql_literal, quote, retrying
from .tables import TABLES


def store_stats(settings):
    """Keep extent metadata separate from logical current-row counts."""
    from .reader import KustoReader

    client = KustoClientFactory.client(settings)
    command = ".show tables details | project TableName, TotalExtents, TotalRowCount, TotalExtentSize"
    response = retrying(lambda: client.execute_mgmt(settings.database, command), "Read table details")
    details = [row for row in Result.from_response(response).dicts() if row["TableName"] in TABLES]
    counts = KustoReader(client, settings.database).read("health.totals", {"limit": 100})
    if counts.truncated:
        raise StoreError("Kusto returned incomplete logical counts")
    return details, counts.rows


def schema_rows():
    """Yield the canonical aictl table definitions, including raw OTLP tables."""
    for name, spec in sorted(TABLES.items()):
        yield {
            "table": name, "key": list(spec.key), "version": spec.version, "tombstone": spec.tombstone,
            "retention_days": spec.retention_days, "ingestion": spec.ingestion,
            "columns": dict(spec.columns),
        }

# Do not soft-delete raw signals that also hold counts or timings.
TRIM_TIMESTAMPS = {
    name: ("ts", "real") for name in (
        "agents_text", "events_text", "file_history_text", "hook_calls_text", "memory_snapshots_text",
        "session_prompts", "session_step_text",
    )
}
TRIM_TIMESTAMPS.update({
    name: ("_v", "datetime") for name in (
        "agents_observations_text", "file_blobs", "files_text", "tool_invocations_text", "tool_invocations_observations_text",
    )
})
TRIM_TIMESTAMPS["OTELPayloads"] = ("Timestamp", "datetime")


def trim_text(settings, before: float, *, dry_run: bool) -> list[str]:
    if not math.isfinite(before):
        raise ValueError("The trim cutoff must be finite")
    client = KustoClientFactory.client(settings)
    if not dry_run:
        directory = restart_directory(settings.cluster, settings.database, settings.node_id)
        TextWatermark(StateFile(directory / "text_trim.json")).advance(before)
    node = kql_literal(settings.node_id, "string")
    instant = kql_literal(datetime.fromtimestamp(before, timezone.utc), "datetime")
    completed = []
    for table, (column, kind) in sorted(TRIM_TIMESTAMPS.items()):
        # Older W2 rows have no source time. Use their version time for the cutoff.
        modifier = " with (whatif=true)" if dry_run else ""
        cutoff = instant if kind == "datetime" else kql_literal(before, "real")
        age = f"{column} < {cutoff}"
        if column != "_v":
            age += f" or (isnull({column}) and _v < {instant})"
        command = (f".delete table {quote(table)} records{modifier} <| {quote(table)}"
                   f" | where node_id == {node} | where {age}")
        retrying(lambda command=command: client.execute_mgmt(settings.database, command), f"Trim {table}")
        completed.append(table)
    return completed


def reset_history(settings) -> int:
    client = KustoClientFactory.client(settings)
    response = client.execute_mgmt(settings.database, ".show tables | project TableName")
    existing = {str(row[0]) for row in Result.from_response(response).rows}
    tables = sorted(existing & TABLES.keys())
    for table in tables:
        client.execute_mgmt(settings.database, f".clear table {quote(table)} data")
    directory = restart_directory(settings.cluster, settings.database, settings.node_id)
    if directory.is_dir():
        for path in directory.glob("*.json"):
            path.unlink()
    return len(tables)
