"""Explicit administration. Collectors and the writer do not run commands."""

import math
import uuid
from datetime import datetime, timezone

from ...state_file import StateFile, TextWatermark, restart_directory, sync_data_epoch
from ..base import StoreError
from . import layout as L
from . import nodes as N
from .client import KustoClientFactory, Result, kql_literal, query_memory_error, quote, retrying
from .tables import TABLES


def store_stats(settings):
    """Keep extent metadata separate from logical current-row counts."""
    from .reader import KustoReader

    client = KustoClientFactory.client(settings)
    command = ".show tables details | project TableName, TotalExtents, TotalRowCount, TotalExtentSize"
    response = retrying(lambda: client.execute_mgmt(settings.database, command), "Read table details")
    from .schema import is_owned

    details = [row for row in Result.from_response(response).dicts() if is_owned(str(row["TableName"]))]
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
    name: ("ts", "datetime") for name in (
        "agents_text", "session_prompts", "session_digests", "session_thinking",
    )
}
TRIM_TIMESTAMPS.update({
    name: ("_v", "datetime") for name in (
        "file_blobs", "tool_invocations_text",
    )
})
TRIM_TIMESTAMPS["OTELPayloads"] = ("Timestamp", "datetime")
# Tables whose rows hold the figures and the text of one data point: the time column, and the text
# columns a trim empties. A trim does not delete these rows; text older than the trim watermark is
# not written (the writer empties these columns of a row still queued), and readers hide older text.
TEXT_COLUMNS = {
    "session_steps": ("ts", ("text",)),
    "events": ("ts", ("full_detail",)),
    "hook_calls": ("ts", ("command", "output", "full_payload")),
    "memory_snapshots": ("ts", ("content",)),
}


def trim_text(settings, before: float, *, dry_run: bool) -> list[str]:
    """Soft-delete this node's old text, in this node's tables (or the shared ones before layout 2)."""
    if not math.isfinite(before):
        raise ValueError("The trim cutoff must be finite")
    client = KustoClientFactory.client(settings)
    state = check_layout(client, settings.database, settings.node_id)
    if not dry_run:
        directory = restart_state(settings, state.stored)
        TextWatermark(StateFile(directory / "text_trim.json")).advance(before)
    node = kql_literal(settings.node_id, "string")
    instant = kql_literal(datetime.fromtimestamp(before, timezone.utc), "datetime")
    names = this_node_tables(state, settings.node_id)
    completed = []
    for table, (column, kind) in sorted(TRIM_TIMESTAMPS.items()):
        name = names.get(table, table)
        if state.have and name not in state.have:
            continue  # this node has no such table
        # Older W2 rows have no source time. Use their version time for the cutoff.
        modifier = " with (whatif=true)" if dry_run else ""
        cutoff = instant if kind == "datetime" else kql_literal(before, "real")
        age = f"{column} < {cutoff}"
        if column != "_v":
            age += f" or (isnull({column}) and _v < {instant})"
        command = (f".delete table {quote(name)} records{modifier} <| {quote(name)}"
                   f" | where node_id == {node} | where {age}")
        retrying(lambda command=command: client.execute_mgmt(settings.database, command), f"Trim {table}")
        completed.append(table)
    return completed


def check_layout(client, database, node_id=""):
    from .schema import check_layout as check

    return check(client, database, node_id)


def this_node_tables(state, node_id: str) -> dict[str, str]:
    """{logical: physical} of *node_id*; on the shared tables of layout 1 each name is its own."""
    from .schema import SHARED, logical_tables

    if state.mode == SHARED:
        return {}
    return N.node_tables(node_id, logical_tables())


def current_layout(client, database, node_id=""):
    """This node's stored layout, read without changing anything; None without aictl data of it."""
    return check_layout(client, database, node_id).stored


def restart_state(settings, stored):
    """This node's restart directory, after the data epoch check (state_file.sync_data_epoch)."""
    directory = restart_directory(settings.cluster, settings.database, settings.node_id)
    if stored is None:
        return directory
    return sync_data_epoch(directory, stored.data_epoch, kept_data=stored.epoch_kept_data)


def whole_database(state, all_nodes: bool) -> bool:
    """A reset of every node: asked for, or the database still has the shared tables of layout 1."""
    from .schema import SHARED

    return all_nodes or state.mode == SHARED


def reset_scope(settings, all_nodes: bool = False) -> bool:
    """Whether a reset deletes every node's data (see whole_database)."""
    return whole_database(check_layout(KustoClientFactory.client(settings), settings.database, settings.node_id),
                          all_nodes)


def reset_plan(settings, node: str | None = None, *, all_nodes: bool = False) -> list[tuple[str, int | None]]:
    """The tables a reset drops, with their row counts.

    By default the tables of *node* (default: this node), nothing of another node. With
    *all_nodes*, or while the database still has the shared tables of layout 1, every table
    aictl owns, the registry included.
    """
    from .schema import is_owned

    state = check_layout(KustoClientFactory.client(settings), settings.database, settings.node_id)
    if whole_database(state, all_nodes):
        return sorted((name, state.counts.get(name)) for name in state.have if is_owned(name))
    mine = state.nodes.get(N.node_key(settings.node_id if node is None else node))
    return sorted((name, state.counts.get(name)) for name in (mine.tables.values() if mine else ()))


def reset_store(settings, tables: list[str] | None = None, *, node: str | None = None, all_nodes: bool = False):
    """Drop one node's tables (default: this node's), or with *all_nodes* every aictl table, and start again.

    Only tables aictl owns are dropped, and only those *tables* when given (the list the
    user confirmed). A node reset gives that node a new data epoch; the other nodes' rows,
    layouts and epochs stay. The functions stop reading the node before its tables are
    dropped. This node's restart state follows its new epoch at once; another node reset
    from here discards its restart state when it next starts.
    """
    from . import _configured_modes
    from .current import drop_command as current_drop
    from .current import owned as current_owned
    from .schema import (
        ensure_schema,
        function_commands,
        is_owned,
        logical_tables,
        management,
        querying,
        record_command,
        sync_functions,
    )

    client = KustoClientFactory.client(settings)
    command, query = management(client, settings.database), querying(client, settings.database)
    target = settings.node_id if node is None else node
    state = check_layout(client, settings.database, settings.node_id)
    whole = whole_database(state, all_nodes)
    names = [name for name, _ in reset_plan(settings, target, all_nodes=whole)] if tables is None else list(tables)
    if unowned := {name for name in names if not is_owned(name)}:
        raise StoreError(f"Refusing to drop tables aictl does not own: {', '.join(sorted(unowned))}")
    if not whole:
        theirs = state.nodes.get(N.node_key(target))
        if other := set(names) - set(theirs.tables.values() if theirs else ()):
            raise StoreError(f"Refusing to drop tables of another node: {', '.join(sorted(other))}")
        if theirs is not None and names:
            theirs.tables = {k: v for k, v in theirs.tables.items() if v not in set(names)}
            for text in function_commands(state, logical_tables()):
                command(text, "Database User (create) or Function Admin", "Create or alter the stored functions")
    # A table cannot be dropped while a materialized view reads it: drop aictl's current views of these tables first.
    for view in sorted(view for view, row in state.views.items()
                       if str(row.get("SourceTable")) in set(names) and current_owned(view, str(row.get("SourceTable")))):
        command(current_drop(view), "Database Admin", "Drop aictl current views")
    if names:
        command(f".drop tables ({', '.join(quote(name) for name in sorted(names))}) ifexists",
                "Database Admin", "Drop aictl tables")
    if not whole and target != settings.node_id:
        # Another node's tables: record its new epoch; that node creates its tables when it starts.
        command(record_command(version=L.LAYOUT_VERSION, compatible_since=L.COMPATIBLE_SINCE, epoch=uuid.uuid4().hex,
                               node_id=target, kind="layout", detail="reset"),
                "Database User or Table Ingestor", "Record the data layout")
        final = sync_functions(command, query, settings.node_id, logical_tables())
        return final.nodes.get(N.node_key(target))
    status = ensure_schema(client, settings.database, modes=_configured_modes(settings), node_id=settings.node_id,
                           cluster=settings.cluster, origin="reset", reset=True)
    sync_data_epoch(restart_directory(settings.cluster, settings.database, settings.node_id), status.data_epoch,
                    kept_data=False)
    return status


def legacy_tables(settings) -> list[tuple[str, int, int]]:
    """The shared tables the node_tables migration kept (legacy__*): name, rows, sealed extent bytes.

    The rows are counted by query: table details leave out rows still in the row store.
    """
    from .schema import count_tables, querying

    client = KustoClientFactory.client(settings)
    state = check_layout(client, settings.database, settings.node_id)
    counts = count_tables(querying(client, settings.database), state.renamed)
    return [(name, counts[name][0], int(state.details.get(name, {}).get("TotalExtentSize") or 0))
            for name in sorted(state.renamed)]


