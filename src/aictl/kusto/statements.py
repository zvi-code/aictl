"""What one SQL statement becomes on Kusto: the contract between the translator and the connection.

The translator (``translate.py``) turns a SQLite statement with its parameters into
one of these. The connection (``connection.py``) runs it: a :class:`Query` as a KQL
query, an :class:`Insert` as rows to ingest, a :class:`Mutation` as a
``.set-or-append`` command that writes new versions of rows, a :class:`Pragma`
from the schema it knows, a :class:`Noop` not at all.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Query:
    """A read. ``kql`` is complete: its ``let`` prelude reads every store table as current rows."""

    kql: str
    # The column names of the result in SQLite's order, when the translator knows
    # them (SELECT a, b AS c): the connection uses them for cursor.description.
    columns: list[str] | None = None


@dataclass
class Insert:
    """Rows for one table, every column present (defaults filled from the schema).

    ``rowid``, ``_v`` and ``_deleted`` are not in ``rows``: the connection adds them,
    and copies the rowid into the table's INTEGER PRIMARY KEY column when it has one
    and the row leaves it None.

    ``on_conflict`` is SQLite's conflict clause: ``fail`` (plain INSERT), ``replace``
    (INSERT OR REPLACE), ``ignore`` (INSERT OR IGNORE, ON CONFLICT DO NOTHING) or
    ``update`` (ON CONFLICT DO UPDATE SET ...). For ``update``, ``update_columns`` are
    the columns the SET assigns from the new row (``excluded.col``), and ``update_kql``
    an optional KQL predicate (over the current row's columns) that the SET's WHERE
    adds; other SET expressions are not supported and raise at translation.
    """

    table: str
    rows: list[dict[str, object]]
    on_conflict: str = "fail"
    update_columns: tuple[str, ...] = ()
    update_kql: str | None = None


@dataclass
class Mutation:
    """An UPDATE, DELETE or INSERT ... SELECT: new row versions written by the cluster itself.

    ``kql`` is the query whose rows are appended to ``table`` (the part after ``<|``
    of ``.set-or-append``). Its result has every column of the table, including
    ``rowid``, ``_v`` (``now()``) and ``_deleted`` (``true`` for a DELETE). The
    connection runs ``.set-or-append <table> <| <kql>`` and reports the row count.
    """

    table: str
    kql: str
    kind: str = "update"  # update | delete | insert


@dataclass
class Pragma:
    """``PRAGMA name`` or ``PRAGMA name(argument)`` or ``PRAGMA name = value``: the connection answers."""

    name: str
    argument: str | None = None
    value: str | None = None


@dataclass
class Noop:
    """A statement with no meaning on Kusto: CREATE INDEX, triggers, ATTACH, BEGIN, VACUUM ..."""

    reason: str = ""
    original: str = ""


@dataclass
class Unsupported(Exception):
    """A statement the translator cannot express in KQL. ``reason`` says what construct."""

    reason: str
    sql: str = ""
    details: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return f"{self.reason}: {self.sql[:200]}"


Statement = Query | Insert | Mutation | Pragma | Noop
