"""How long the Kusto store keeps each class of table: show it, compare it with the cluster, change it.

The days per class come from ``[storage.retention]``; the class of each table from
``tables.TABLE_RETENTION_CLASS``. Kusto deletes rows older than a table's soft-delete
period by their ingestion time, so lowering a period removes data and cannot be undone.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import datetime

from .client import Result, quote
from .health_metadata import _retention_days
from .tables import TABLE_RETENTION_CLASS, format_period, tables_with_retention

POLICY_QUERY = ".show tables details | project TableName, RetentionPolicy, TotalRowCount, TotalExtentSize"

Command = Callable[[str], Result]


@dataclass(frozen=True)
class TableRetention:
    table: str
    retention_class: str
    configured_hours: int
    cluster_hours: float | None  # None: the table is not on the cluster, or has no soft-delete period
    rows: int = 0
    extent_bytes: int = 0

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


def cluster_policies(mgmt: Command) -> dict[str, float | None]:
    """The soft-delete period, in hours, of every table on the cluster."""
    return {name: _hours(row.get("RetentionPolicy")) for name, row in _details(mgmt).items()}


def status(hours_by_class: Mapping[str, int], mgmt: Command) -> list[TableRetention]:
    """Every table: its class, the configured period, the period on the cluster, its rows and extent size."""
    tables = tables_with_retention(hours_by_class)
    details = _details(mgmt)
    return [
        TableRetention(name, TABLE_RETENTION_CLASS[name], table.retention_period_hours,
                       _hours(details[name].get("RetentionPolicy")) if name in details else None,
                       int(details.get(name, {}).get("TotalRowCount") or 0),
                       int(details.get(name, {}).get("TotalExtentSize") or 0))
        for name, table in sorted(tables.items())
    ]


def alter_command(table: str, hours: int) -> str:
    return f".alter-merge table {quote(table)} policy retention softdelete = {format_period(hours)}"


def count_command(table: str, hours: int) -> str:
    return (f"{quote(table)} | where ingestion_time() < ago({format_period(hours)})"
            " | summarize rows = count(), oldest = min(ingestion_time())")


def plan(cls: str, hours: int, mgmt: Command) -> tuple[list[str], list[str]]:
    """(tables whose period changes, of them the ones whose period gets shorter) for class *cls* set to *hours*."""
    on_cluster = cluster_policies(mgmt)
    names = sorted(name for name, c in TABLE_RETENTION_CLASS.items() if c == cls and name in on_cluster)
    change = [name for name in names if on_cluster[name] != hours]
    lower = [name for name in change if on_cluster[name] is not None and hours < on_cluster[name]]
    return change, lower


def removals(tables: list[str], hours: int, query: Command) -> list[Removal]:
    """What a shorter period deletes: rows older than the period per table, and the oldest of them."""
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
