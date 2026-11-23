"""Explicit administration. Collectors and the writer do not run commands."""

import math
from datetime import datetime, timezone

from ...state_file import StateFile, TextWatermark, restart_directory, sync_data_epoch
from ..base import StoreError
from .client import KustoClientFactory, Result, kql_literal, query_memory_error, quote, retrying
from .tables import TABLES


def store_stats(settings):
    """Keep extent metadata separate from logical current-row counts."""
    from .reader import KustoReader

    client = KustoClientFactory.client(settings)
    command = ".show tables details | project TableName, TotalExtents, TotalRowCount, TotalExtentSize"
    response = retrying(lambda: client.execute_mgmt(settings.database, command), "Read table details")
    details = [row for row in Result.from_response(response).dicts() if row["TableName"] in TABLES]
    reader = KustoReader(client, settings.database)
    counts = reader.read("health.totals", {"limit": 100})
    if counts.truncated:
        raise StoreError("Kusto returned incomplete logical counts")
    sample_count = _logical_sample_count(reader)
    rows = counts.rows + [{"table": "metrics", "rows": sample_count, "earliest_ts": None, "latest_ts": None,
                           "files_total_bytes": None, "files_total_tokens": None}]
    return details, sorted(rows, key=lambda row: row["table"])


def _logical_sample_count(reader):
    """Five-minute ranges are disjoint by logical key. Count them serially, never in the dashboard poll."""
    buckets = reader.read("health.sample_buckets", {"limit": 20_000})
    if buckets.truncated:
        raise StoreError("Kusto returned incomplete sample count ranges")

    def count(since, until):
        params = {"null_timestamp": True} if since is None else {"since": since, "until": until}
        try:
            answer = reader.read("health.sample_count", params | {"limit": 1})
        except StoreError as exc:
            if since is None or until - since <= 1 or not query_memory_error(exc.__cause__ or exc):
                raise
            midpoint = (since + until) / 2
            return count(since, midpoint) + count(midpoint, until)
        if answer.truncated or len(answer.rows) != 1:
            raise StoreError("Kusto returned an incomplete sample count")
        return answer.rows[0]["rows"]

    return sum(count(start, None if start is None else start + 300)
               for start in (row["start"] for row in buckets.rows))


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
        directory = restart_state(settings, current_layout(client, settings.database))
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


def current_layout(client, database):
    """The stored layout, read without changing anything; None for a database without aictl data."""
    from .schema import check_layout

    return check_layout(client, database).stored


def restart_state(settings, stored):
    """This node's restart directory, after the data epoch check (state_file.sync_data_epoch)."""
    directory = restart_directory(settings.cluster, settings.database, settings.node_id)
    if stored is None:
        return directory
    return sync_data_epoch(directory, stored.data_epoch, kept_data=stored.epoch_kept_data)


def reset_plan(settings) -> list[tuple[str, int | None]]:
    """The tables a reset drops, with their row counts: aictl's own tables, no other."""
    from .schema import management, owned_tables

    command = management(KustoClientFactory.client(settings), settings.database)
    response = command(".show tables details | project TableName, TotalRowCount", "Database Viewer",
                       "Read table details")
    owned = owned_tables()
    return sorted((str(row["TableName"]), row.get("TotalRowCount"))
                  for row in Result.from_response(response).dicts() if row.get("TableName") in owned)


def reset_store(settings, tables: list[str] | None = None):
    """Drop aictl's tables, create them again, and record a new data epoch.

    Only tables aictl owns are dropped, and only those *tables* when given (the list the
    user confirmed). This node's restart state follows the new epoch at once; other nodes
    discard theirs when they next start.
    """
    from . import _configured_modes
    from .schema import ensure_schema, management, owned_tables

    client = KustoClientFactory.client(settings)
    command = management(client, settings.database)
    names = [name for name, _ in reset_plan(settings)] if tables is None else list(tables)
    if unowned := set(names) - owned_tables():
        raise StoreError(f"Refusing to drop tables aictl does not own: {', '.join(sorted(unowned))}")
    if names:
        command(f".drop tables ({', '.join(quote(name) for name in sorted(names))}) ifexists",
                "Database Admin", "Drop aictl tables")
    status = ensure_schema(client, settings.database, modes=_configured_modes(settings), node_id=settings.node_id,
                           cluster=settings.cluster, origin="reset")
    sync_data_epoch(restart_directory(settings.cluster, settings.database, settings.node_id), status.data_epoch,
                    kept_data=False)
    return status


def migrate_store(settings, *, dry_run: bool, echo=print):
    """Run, or with *dry_run* only count and print, the migrations from the stored layout to this one."""
    from . import _configured_modes
    from . import layout as L
    from .migrations import run, runner
    from .schema import check_layout, ensure_schema, management, querying

    client = KustoClientFactory.client(settings)
    state = check_layout(client, settings.database)
    verdict, stored = state.verdict, state.stored
    if verdict == L.NEWER:
        raise L.LayoutNewerError(verdict, stored, cluster=settings.cluster, database=settings.database)
    if verdict == L.RESET:
        raise L.LayoutResetRequired(verdict, stored, cluster=settings.cluster, database=settings.database)
    if verdict != L.MIGRATE:
        echo(f"Nothing to migrate: the stored layout is {L.describe(stored)} and this aictl writes "
             f"layout {L.LAYOUT_VERSION} ({verdict}).")
        return verdict, []
    if dry_run:
        query, command = querying(client, settings.database), management(client, settings.database)
        results = run(stored or L.UNVERSIONED, count=lambda text: query(text, "Count the rows a migration changes"),
                      execute=lambda text: command(text, "", ""), record=lambda *_: None, dry_run=True, echo=echo)
        return verdict, results
    status = ensure_schema(client, settings.database, modes=_configured_modes(settings), node_id=settings.node_id,
                           cluster=settings.cluster, migrate=runner(client, settings.database, echo))
    sync_data_epoch(restart_directory(settings.cluster, settings.database, settings.node_id), status.data_epoch,
                    kept_data=status.epoch_kept_data)
    return verdict, status
