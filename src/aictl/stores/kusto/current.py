"""Current views: a materialized view per node table that keeps the current row of each key.

Rows are versions (docs/storage-schema.md, "Read the current row"). A view that reduces the
versions itself (``summarize arg_max(_v, *) by <key>``) reads every version ever stored before it
can apply a time range, so a 15-minute read costs what a 30-day read costs. For the tables in
``CURRENT_TABLES`` each node table ``T__<key>`` has a materialized view ``T_current__<key>``:

    T__<key>
    | extend event_hour = bin(ts, 1h)
    | summarize arg_max(_v, *) by event_hour, ['project'], node_id, dedup_key

and the stored function ``T_current`` unions the views of every node the functions include
(nodes.py). A query of a materialized view combines its materialized part with the rows not yet
materialized, so a row is read as soon as it is ingested; tombstones are rows like any other.

Choices, from the Kusto documentation (management/materialized-views) and measurements:

- ``event_hour`` is a group-by key, so a filter on it reaches the materialized part and the
  rows not yet materialized; a filter on ``ts`` alone would be applied after the whole view is
  combined. A partitioning policy keeps each extent of the view to one day of ``event_hour``,
  so a short range reads few extents.
- The time of a row can move a little between versions (measured on stored data: at most 11
  seconds for ``requests``). A key whose time crossed an hour boundary has a row in each hour,
  the older one stale. Readers therefore read one hour either side of their range, reduce the
  versions again by the key and then drop tombstones and apply the exact range
  (``CURRENT_READ_MARGIN``). A tombstone without a time would sit in no hour and leave its row
  current: the writer refuses one (writer.py).
- ``arg_max(_v, *)`` with ``autoUpdateSchema``: aictl only adds columns (``.create-merge``),
  never drops or retypes one, so the view takes a new column as the table does, with null in
  older rows like the table. With an explicit column list the view would have to be dropped
  and built again for each new column.
- No ``lookback``: the first datetime group-by key already bounds what a materialization
  scans, and a too short lookback would keep stale rows.
- Retention: the table's own period, so the view keeps what the table keeps.
- A view over a table that has rows is built with ``backfill`` (``async``); it is not readable
  until the build is done, so the start waits for it.
"""

from __future__ import annotations

import json
from collections.abc import Iterable

from . import nodes as N
from .client import quote

# The versioned tables that have a current view, and the time column each view keys by hour.
CURRENT_TABLES: dict[str, str] = {"requests": "ts", "tool_invocations": "ts"}
SUFFIX = "_current"
HOUR = "event_hour"
# How far, in hours, the time of one key may move between versions for a reader to still see
# every row of the key: a reader of [since, until] reads the hours [since - margin, until + margin].
CURRENT_READ_MARGIN = "1h"
FOLDER = "aictl/current"
_PARTITION_DAYS = 1


def logical(table: str) -> str:
    return table + SUFFIX


def physical(table: str, key: str) -> str:
    return N.physical(logical(table), key)


def current_names() -> frozenset[str]:
    return frozenset(logical(table) for table in CURRENT_TABLES)


def view_query(table: str, source: str, key_columns: Iterable[str]) -> str:
    """The view's query over *source* (a node table, or a stand-in for one in tests)."""
    time = CURRENT_TABLES[table]
    keys = ", ".join(quote(column) if column == "project" else column for column in key_columns)
    return (f"{source}\n| extend {HOUR} = bin({time}, 1h)\n"
            f"| summarize arg_max(_v, *) by {HOUR}, {keys}")


def docstring(node_id: str, key: str, table: str) -> str:
    return json.dumps({"aictl": "current view", "node_id": node_id, "node_key": key, "table": table},
                      separators=(",", ":"))


def create_command(table: str, node_id: str, key: str, key_columns: Iterable[str], *, backfill: bool) -> str:
    source = N.physical(table, key)
    options = [f"autoUpdateSchema=true, folder={json.dumps(FOLDER)}, docString={json.dumps(docstring(node_id, key, table))}"]
    if backfill:
        options.insert(0, "backfill=true")
    return (f".create {'async ' if backfill else ''}ifnotexists materialized-view with ({', '.join(options)}) "
            f"{quote(physical(table, key))} on table {quote(source)}\n"
            f"{{\n{view_query(table, quote(source), key_columns)}\n}}")


def partitioning_command(table: str, key: str) -> str:
    policy = {"PartitionKeys": [{"ColumnName": HOUR, "Kind": "UniformRange", "Properties": {
        "Reference": "2026-01-01T00:00:00", "RangeSize": f"{_PARTITION_DAYS}.00:00:00", "OverrideCreationTime": False}}],
        "EffectiveDateTime": "2026-01-01T00:00:00"}
    return f".alter materialized-view {quote(physical(table, key))} policy partitioning {json.dumps(json.dumps(policy))}"


def retention_command(table: str, key: str, timespan: str) -> str:
    policy = json.dumps({"SoftDeletePeriod": timespan, "Recoverability": "Enabled"})
    return f".alter materialized-view {quote(physical(table, key))} policy retention {json.dumps(policy)}"


def drop_command(name: str) -> str:
    return f".drop materialized-view {quote(name)} ifexists"


def untimed_tombstone(table: str, row: dict) -> str | None:
    """Why the writers refuse tombstone *row* of *table*: a current view keys it by hour of its time,
    so one without a time would never meet the row it deletes. None when it is fine."""
    time = CURRENT_TABLES.get(table)
    if time is not None and row.get(time) is None:
        return f"{table}: a tombstone carries the {time} of the row it deletes, which its current view keys by hour"
    return None


VIEWS_QUERY =".show materialized-views | project Name, SourceTable, IsEnabled"


def owned(name: str, source: str) -> bool:
    """Whether materialized view *name* over *source* is a current view aictl made."""
    if N.SEPARATOR not in name:
        return False
    logical_name, key = name.rsplit(N.SEPARATOR, 1)
    table = logical_name.removesuffix(SUFFIX)
    return logical_name != table and table in CURRENT_TABLES and source == N.physical(table, key)
