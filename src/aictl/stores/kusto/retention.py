"""How long the Kusto store keeps each class of table: show it, compare it with the cluster, change it.

The days per class come from ``[storage.retention]``; the class of each table from
``tables.TABLE_RETENTION_CLASS``. Kusto deletes rows older than a table's soft-delete
period by their ingestion time, so lowering a period removes data and cannot be undone.

Each node has its own tables (``nodes.py``); a period applies to physical tables, so the
listing shows every node's table with its size, and a change applies to this node's tables
unless every node's are asked for. Each node applies its own configured periods when it
starts.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import datetime

from . import nodes as N
from .client import Result, quote
from .health_metadata import _retention_days
from .tables import TABLE_RETENTION_CLASS, format_period, tables_with_retention

POLICY_QUERY = ".show tables details | project TableName, RetentionPolicy, TotalExtentSize, DocString"

Command = Callable[[str], Result]


@dataclass(frozen=True)
class TableRetention:
    table: str  # the physical table
    retention_class: str
    configured_hours: int
    cluster_hours: float | None  # None: the table is not on the cluster, or has no soft-delete period
    extent_bytes: int = 0  # sealed extents only: rows not yet sealed are in no size
    logical: str = ""
    node_key: str | None = None  # None: a table named like the logical one (shared, or a collector's)

    @property
    def differs(self) -> bool:
        return self.cluster_hours is not None and round(self.cluster_hours, 3) != self.configured_hours


@dataclass(frozen=True)
class Removal:
    table: str
    rows: int
    oldest: datetime | None


def _details(mgmt: Command) -> dict[str, dict]:
    return {str(row["TableName"]): row for row in mgmt(POLICY_QUERY).dicts()}


def _hours(policy: object) -> float | None:
    days = _retention_days(policy)
    return None if days is None else round(days * 24, 3)


def _logical(name: str, row: Mapping) -> tuple[str, str | None] | None:
    """(logical table, node key) of physical table *name*; None for a table without a retention class."""
    if name in TABLE_RETENTION_CLASS:
        return name, None
    table = N.parse(name, row.get("DocString"), TABLE_RETENTION_CLASS)
    return None if table is None or table.logical not in TABLE_RETENTION_CLASS else (table.logical, table.key)


def cluster_policies(mgmt: Command) -> dict[str, float | None]:
    """The soft-delete period, in hours, of every table on the cluster."""
    return {name: _hours(row.get("RetentionPolicy")) for name, row in _details(mgmt).items()}


def status(hours_by_class: Mapping[str, int], mgmt: Command) -> list[TableRetention]:
    """Every table of every node: its class, the configured period, the period on the cluster, rows, size.

    A logical table that no node has yet is listed once, by its logical name, without a period.
    """
    tables = tables_with_retention(hours_by_class)
    details = _details(mgmt)
    out, seen = [], set()
    for name, row in sorted(details.items()):
        found = _logical(name, row)
        if found is None:
            continue
        logical, key = found
        seen.add(logical)
        out.append(TableRetention(name, TABLE_RETENTION_CLASS[logical], tables[logical].retention_period_hours,
                                  _hours(row.get("RetentionPolicy")), int(row.get("TotalExtentSize") or 0), logical, key))
    for name, table in sorted(tables.items()):
        if name not in seen:
            out.append(TableRetention(name, TABLE_RETENTION_CLASS[name], table.retention_period_hours, None,
                                      logical=name))
    return sorted(out, key=lambda r: r.table)


def alter_command(table: str, hours: int) -> str:
    return f".alter-merge table {quote(table)} policy retention softdelete = {format_period(hours)}"


def count_command(table: str, hours: int) -> str:
    return (f"{quote(table)} | where ingestion_time() < ago({format_period(hours)})"
            " | summarize rows = count(), oldest = min(ingestion_time())")


def plan(cls: str, hours: int, mgmt: Command, node_key: str | None = None,
         all_nodes: bool = False) -> tuple[list[str], list[str]]:
    """(tables whose period changes, of them the ones whose period gets shorter) for class *cls* set to *hours*.

    The tables: those of node *node_key* and the tables named like logical ones; with
    *all_nodes*, every node's.
    """
    details = _details(mgmt)
    names = []
    for name, row in sorted(details.items()):
        found = _logical(name, row)
        if found is None or TABLE_RETENTION_CLASS[found[0]] != cls:
            continue
        if all_nodes or found[1] is None or found[1] == node_key:
            names.append(name)
    on_cluster = {name: _hours(details[name].get("RetentionPolicy")) for name in names}
    change = [name for name in names if on_cluster[name] != hours]
    lower = [name for name in change if on_cluster[name] is not None and hours < on_cluster[name]]
    return change, lower


def removals(tables: list[str], hours: int, query: Command) -> list[Removal]:
    """What a shorter period deletes: rows older than the period per table, and the oldest of them.

    The age is ``ingestion_time()``. Rows the node_tables migration copied carry the time of
    the copy there, while their extents carry the source's creation time, which retention
    uses: for copied rows this undercounts what is deleted.
    """
    out = []
    for name in tables:
        rows = query(count_command(name, hours)).dicts()
        row = rows[0] if rows else {}
        out.append(Removal(name, int(row.get("rows") or 0), row.get("oldest")))
    return out


def apply(tables: list[str], hours: int, mgmt: Command) -> list[str]:
    commands = [alter_command(name, hours) for name in tables]
    for text in commands:
        mgmt(text)
    return commands
