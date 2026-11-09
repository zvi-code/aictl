"""A Kusto database behind the ``sqlite3.Connection`` surface the store uses.

``HistoryDB`` keeps issuing its SQLite statements on a connection per thread. Here
each statement goes through the translator, and the :mod:`statements` it returns run
on the cluster: a query with ``KustoClient.execute``, a write as rows to ingest or a
``.set-or-append`` command, a pragma answered from the schema. The connection is
cheap; the Kusto clients behind it are shared by every connection of the process.

Inserts are buffered until ``commit()``, the way SQLite code expects a transaction to
work, and because one ingest of many rows costs about what one row costs. Any read or
other write on the connection flushes the buffer first, so the connection always sees
its own writes.
"""

from __future__ import annotations

import json
import logging
import math
import os
import random
import re
import sqlite3
import threading
import time
from collections.abc import Callable, Iterable, Iterator, Sequence
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

from .ingest import RowIngester, make_ingester
from .schema import (
    DELETED,
    ROWID,
    SYSTEM_COLUMNS,
    VERSION,
    Table,
    create_commands,
    current,
    information_commands,
    quote,
    store_schema,
)
from .statements import Insert, Mutation, Noop, Pragma, Query, Statement, Unsupported

if TYPE_CHECKING:
    from . import KustoSettings

QUERY_TIMEOUT = timedelta(seconds=60)
# Past this many buffered rows of one table the buffer is sent without waiting for
# commit(), so a long transaction does not hold an unbounded amount of memory.
FLUSH_ROWS = 5000
# Keys per existence query of INSERT OR IGNORE / ON CONFLICT DO UPDATE: bounds the
# size of the KQL text.
KEYS_PER_QUERY = 200
# Mutations of one executemany batch sent as one union query, at most.
MUTATIONS_PER_QUERY = 100


class KustoStoreError(sqlite3.OperationalError):
    """A statement that failed on Kusto, or that has no KQL form.

    A subclass of ``sqlite3.OperationalError`` so the store's ``except sqlite3.Error``
    handlers treat it as the database error it is.
    """

    def __init__(
        self, message: str, *, kql: str | None = None, sql: str | None = None, server_message: str | None = None
    ):
        parts = [message]
        if server_message and server_message not in message:
            parts.append(server_message)
        if sql:
            parts.append(f"SQL: {sql[:500]}")
        if kql:
            parts.append(f"KQL: {kql[:1000]}")
        super().__init__("\n".join(parts))
        self.kql = kql
        self.sql = sql
        self.server_message = server_message


def _server_message(exc: BaseException) -> str:
    return str(getattr(exc, "message_text", "") or exc)


# A small cluster throttles (HTTP 429) when ingestion commands or queries arrive
# faster than it takes them, and streaming ingestion into a table created moments
# ago can fail inside the service (a 5xx whose error says ``@permanent: false``,
# such as a RowStore "trimmable stream" exception) until its row store is ready.
# Either request is sound and succeeds a little later; wait up to about a minute.
log = logging.getLogger(__name__)
RETRY_DELAYS_S = (0.5, 1.0, 2.0, 4.0, 8.0, 15.0, 30.0)


def _throttled(exc: BaseException) -> bool:
    if type(exc).__name__ == "KustoThrottlingError":
        return True
    response = getattr(exc, "http_response", None)
    status = getattr(response, "status_code", None)
    return status in (429, 503) or "throttled" in str(exc).lower()


def _transient(exc: BaseException) -> bool:
    """Whether the service itself says the request may succeed when repeated."""
    if _throttled(exc):
        return True
    errors = []
    for getter in ("get_api_error", "get_api_errors"):
        fn = getattr(exc, getter, None)
        if callable(fn):
            try:
                got = fn()
            except Exception:  # noqa: BLE001 - a malformed error body is not a reason to retry
                got = None
            errors.extend(got if isinstance(got, list) else [got] if got is not None else [])
    permanence = [e.permanent for e in errors if getattr(e, "permanent", None) is not None]
    if permanence:
        return not all(permanence)
    response = getattr(exc, "http_response", None)
    status = getattr(response, "status_code", None)
    if status is not None:
        return status >= 500
    return type(exc).__name__ == "KustoNetworkError"


def retrying(call: Callable[[], Any], what: str) -> Any:
    """Run *call*, waiting out throttling and transient service errors before giving up."""
    for delay in RETRY_DELAYS_S:
        try:
            return call()
        except Exception as exc:  # noqa: BLE001 - only a transient failure is retried; the rest is raised below
            if not _transient(exc):
                raise
            say = log.warning if delay >= 8 else log.debug
            say("Kusto %s failed transiently (%s); retrying in %.0f s", what, _server_message(exc).splitlines()[0][:160], delay)
            time.sleep(delay)
    return call()


# Row ids: milliseconds since the epoch in the high bits, then 8 bits that tell
# processes apart and a 12-bit sequence within the millisecond. The tag is random
# per process (drawn again in a forked child), so two processes writing in the same
# millisecond collide only if they drew the same tag; the sequence keeps ids from one
# process strictly increasing, borrowing the next millisecond when 4096 run out.
_SEQ_BITS = 12
_TAG_BITS = 8
_rowid_lock = threading.Lock()
_rowid_state = {"ms": 0, "seq": 0, "tag": random.getrandbits(_TAG_BITS), "v_us": 0}


def _reseed_after_fork() -> None:
    _rowid_state["tag"] = random.getrandbits(_TAG_BITS)


if hasattr(os, "register_at_fork"):
    os.register_at_fork(after_in_child=_reseed_after_fork)


def next_rowid() -> int:
    """A new rowid: unique in the process, increasing over time, 64-bit signed."""
    with _rowid_lock:
        ms = int(time.time() * 1000)
        if ms <= _rowid_state["ms"]:
            ms = _rowid_state["ms"]
            seq = _rowid_state["seq"] + 1
            if seq >> _SEQ_BITS:
                ms, seq = ms + 1, 0
        else:
            seq = 0
        _rowid_state["ms"], _rowid_state["seq"] = ms, seq
        return (ms << 20) | (_rowid_state["tag"] << _SEQ_BITS) | seq


def next_version() -> str:
    """A ``_v`` value: now in UTC, strictly later than the last one this process wrote.

    A read keeps the version with the largest ``_v``; two versions of a key written
    in one batch must not tie, or the cluster would pick either.
    """
    with _rowid_lock:
        us = max(int(time.time() * 1_000_000), _rowid_state["v_us"] + 1)
        _rowid_state["v_us"] = us
    stamp = datetime.fromtimestamp(us // 1_000_000, tz=timezone.utc).replace(microsecond=us % 1_000_000, tzinfo=None)
    return stamp.isoformat(timespec="microseconds") + "Z"


def coerce(value: object, kusto_type: str) -> object:
    """A value for a column of *kusto_type*, converted the way SQLite's type affinity would.

    Kusto drops a JSON value of the wrong type to null, where SQLite would have kept
    it; converting first keeps ``True`` in an INTEGER column as 1 and 5 in a TEXT
    column as ``'5'``.
    """
    if value is None:
        return None
    if kusto_type == "string":
        if isinstance(value, str):
            return value
        if isinstance(value, bool):
            return str(int(value))
        if isinstance(value, (bytes, bytearray, memoryview)):
            return bytes(value).decode("utf-8", errors="replace")
        if isinstance(value, float):
            return repr(value)
        if isinstance(value, (dict, list, tuple)):
            return json.dumps(value)
        return str(value)
    if kusto_type == "long":
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                try:
                    f = float(value)
                except ValueError:
                    return value
                return int(f) if f.is_integer() else f
        return value
    if kusto_type == "real":
        if isinstance(value, (bool, int)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return value
        return value
    if kusto_type == "bool":
        return bool(value)
    return value


def kql_literal(value: object, kusto_type: str) -> str:
    """A KQL literal of *kusto_type*. A JSON string literal is a valid KQL string, escapes included."""
    value = coerce(value, kusto_type)
    if kusto_type == "string":
        return json.dumps("" if value is None else str(value))
    if value is None:
        return f"{kusto_type}(null)"
    if kusto_type == "bool":
        return "true" if value else "false"
    if kusto_type == "datetime":
        if isinstance(value, (int, float)):
            value = datetime.fromtimestamp(value, tz=timezone.utc)
        if isinstance(value, datetime):
            if value.tzinfo is not None:
                value = value.astimezone(timezone.utc).replace(tzinfo=None)
            value = value.isoformat() + "Z"
        return f"datetime({value})"
    if kusto_type == "long" and isinstance(value, int):
        return f"long({value})"
    if isinstance(value, (int, float)):
        f = float(value)
        if math.isnan(f):
            return "real(nan)"
        if math.isinf(f):
            return "real(+inf)" if f > 0 else "real(-inf)"
        return f"real({f!r})" if kusto_type == "real" else f"{kusto_type}({f!r})"
    # Text in a numeric column: Kusto parses it or yields null, as ingestion would.
    return f"{kusto_type}({json.dumps(str(value))})"


def to_python(value: object, kusto_type: str) -> object:
    """A Kusto result value as SQLite would have returned it."""
    if value is None:
        return None
    t = kusto_type.lower()
    if t == "dynamic":
        return json.dumps(value)
    if t == "datetime":
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.timestamp()
        return value
    if t == "timespan":
        return value.total_seconds() if isinstance(value, timedelta) else value
    if t in ("long", "int"):
        return int(value)  # type: ignore[call-overload]
    if t in ("real", "double", "decimal"):
        return float(value)  # type: ignore[arg-type]
    if t == "bool":
        return bool(value)
    if t in ("string", "guid"):
        return str(value)
    return value


class Row(tuple):
    """A result row with both index and column-name access, like ``sqlite3.Row``.

    ``sqlite3.Row`` cannot be built without a SQLite cursor, so this stands in for it
    when ``row_factory`` is set to ``sqlite3.Row``. Names match case-insensitively,
    as SQLite's do.
    """

    _names: tuple[str, ...]

    def __new__(cls, names: Sequence[str], values: Iterable[Any]) -> Row:
        row = super().__new__(cls, values)
        row._names = tuple(names)
        return row

    def keys(self) -> list[str]:
        return list(self._names)

    def __getitem__(self, key: Any) -> Any:  # type: ignore[override]
        if isinstance(key, str):
            lowered = key.lower()
            for i, name in enumerate(self._names):
                if name.lower() == lowered:
                    return tuple.__getitem__(self, i)
            raise IndexError(f"No item with that key: {key!r}")
        return tuple.__getitem__(self, key)

    def __repr__(self) -> str:
        return f"Row({dict(zip(self._names, self, strict=False))!r})"


def connection_string(settings: KustoSettings) -> Any:
    """The SDK's connection string builder for the settings' sign-in mode."""
    from azure.kusto.data import KustoConnectionStringBuilder as K

    mode = settings.auth_mode
    if mode == "none":
        return K.with_no_authentication(settings.cluster)
    if mode == "azcli":
        return K.with_az_cli_authentication(settings.cluster)
    if mode == "device":
        return K.with_aad_device_authentication(settings.cluster)
    if mode == "managed-identity":
        return K.with_aad_managed_service_identity_authentication(settings.cluster)
    raise ValueError(f"unknown Kusto auth mode {mode!r}")


class KustoClientFactory:
    """One query client and one ingester per (cluster, database, auth) for the whole process.

    The SDK clients are thread-safe and hold a connection pool and a token cache;
    one per connection would sign in again on every thread.
    """

    _lock = threading.Lock()
    _clients: dict[tuple[str, str, str], Any] = {}
    _ingesters: dict[tuple[str, str, str], RowIngester] = {}

    @staticmethod
    def key(settings: KustoSettings) -> tuple[str, str, str]:
        return (settings.cluster, settings.database, settings.auth_mode)

    @classmethod
    def client(cls, settings: KustoSettings) -> Any:
        key = cls.key(settings)
        with cls._lock:
            client = cls._clients.get(key)
            if client is None:
                from azure.kusto.data import KustoClient

                client = cls._clients[key] = KustoClient(connection_string(settings))
            return client

    @classmethod
    def ingester(cls, settings: KustoSettings) -> RowIngester:
        client = cls.client(settings)
        key = cls.key(settings)
        with cls._lock:
            ingester = cls._ingesters.get(key)
            if ingester is None:
                ingester = cls._ingesters[key] = make_ingester(settings, client)
            return ingester


_tables_lock = threading.Lock()
_store_tables: dict[str, Table] | None = None


def _default_tables() -> dict[str, Table]:
    """The store's tables, parsed once: the schema text is a constant of the code."""
    global _store_tables
    with _tables_lock:
        if _store_tables is None:
            _store_tables = store_schema()
        return _store_tables


_CREATE_TABLE = re.compile(r"^\s*CREATE\s+(?:TEMP\s+|TEMPORARY\s+)?TABLE\b", re.IGNORECASE)
_LEADING_COMMENTS = re.compile(r"^(?:\s+|--[^\n]*(?:\n|$)|/\*.*?\*/)*", re.DOTALL)


def split_script(sql: str) -> list[str]:
    """A script's statements. ``sqlite3.complete_statement`` knows quotes, comments and trigger bodies."""
    out: list[str] = []
    buf = ""
    for piece in sql.split(";"):
        buf += piece + ";"
        if sqlite3.complete_statement(buf):
            if buf.strip(" \t\r\n;"):
                out.append(buf)
            buf = ""
    rest = buf[:-1]  # the ";" added after the last piece
    if _LEADING_COMMENTS.sub("", rest).strip():
        out.append(rest)
    return out


def is_create_table(stmt: str) -> bool:
    return bool(_CREATE_TABLE.match(_LEADING_COMMENTS.sub("", stmt, count=1)))


class Result:
    """Column names, Kusto types and Python rows of one result table."""

    def __init__(self, names: list[str], types: list[str], rows: list[tuple[Any, ...]]):
        self.names = names
        self.types = types
        self.rows = rows

    @classmethod
    def from_response(cls, response: Any) -> Result:
        tables = getattr(response, "primary_results", None) or []
        if not tables:
            return cls([], [], [])
        table = tables[0]
        names = [c.column_name for c in table.columns]
        types = [str(c.column_type or "string") for c in table.columns]
        rows = [tuple(to_python(v, t) for v, t in zip(row, types, strict=False)) for row in table]
        return cls(names, types, rows)

    def dicts(self) -> list[dict[str, Any]]:
        return [dict(zip(self.names, r, strict=False)) for r in self.rows]


class KustoCursor:
    """The ``sqlite3.Cursor`` surface: results of the last statement run through it."""

    arraysize = 1

    def __init__(self, connection: KustoConnection):
        self.connection = connection
        self.row_factory: Any = connection.row_factory
        self.description: tuple[tuple[Any, ...], ...] | None = None
        self.rowcount = -1
        self.lastrowid: int | None = None
        self._rows: list[tuple[Any, ...]] = []
        self._pos = 0
        self._names: list[str] = []

    def _set(self, names: list[str], rows: list[tuple[Any, ...]], rowcount: int = -1) -> None:
        self._names = names
        self._rows = rows
        self._pos = 0
        self.rowcount = rowcount
        self.description = tuple((n, None, None, None, None, None, None) for n in names) if names else None

    def _make(self, values: tuple[Any, ...]) -> Any:
        factory = self.row_factory
        if factory is None:
            return values
        if factory is sqlite3.Row or factory is Row:
            return Row(self._names, values)
        return factory(self, values)

    def execute(self, sql: str, params: Any = ()) -> KustoCursor:
        self.row_factory = self.connection.row_factory
        self.connection._execute(self, sql, params)
        return self

    def executemany(self, sql: str, seq_of_params: Iterable[Any]) -> KustoCursor:
        self.row_factory = self.connection.row_factory
        self.connection._executemany(self, sql, seq_of_params)
        return self

    def executescript(self, sql: str) -> KustoCursor:
        self.connection.executescript(sql)
        self._set([], [], -1)
        return self

    def fetchone(self) -> Any:
        if self._pos >= len(self._rows):
            return None
        row = self._rows[self._pos]
        self._pos += 1
        return self._make(row)

    def fetchmany(self, size: int | None = None) -> list[Any]:
        n = self.arraysize if size is None else size
        rows = self._rows[self._pos : self._pos + n]
        self._pos += len(rows)
        return [self._make(r) for r in rows]

    def fetchall(self) -> list[Any]:
        rows = self._rows[self._pos :]
        self._pos = len(self._rows)
        return [self._make(r) for r in rows]

    def __iter__(self) -> Iterator[Any]:
        while True:
            row = self.fetchone()
            if row is None:
                return
            yield row

    def close(self) -> None:
        self._rows = []
        self._pos = 0

    def setinputsizes(self, sizes: Any) -> None:
        pass

    def setoutputsize(self, size: Any, column: Any = None) -> None:
        pass


# Pragmas whose value a connection keeps when set and reports when read.
_SETTABLE_PRAGMAS: dict[str, object] = {
    "synchronous": 1,
    "cache_size": -2000,
    "temp_store": 0,
    "busy_timeout": 0,
    "wal_autocheckpoint": 1000,
    "journal_size_limit": -1,
    "mmap_size": 0,
    "max_page_count": 1073741823,
    "foreign_keys": 0,
}
# Pragmas with one fixed answer: what the store reads to size or check a SQLite file.
_FIXED_PRAGMAS: dict[str, list[tuple[Any, ...]]] = {
    "journal_mode": [("wal",)],
    "page_count": [(0,)],
    "freelist_count": [(0,)],
    "page_size": [(4096,)],
    "auto_vacuum": [(0,)],
    "user_version": [(0,)],
    "schema_version": [(0,)],
    "wal_checkpoint": [(0, 0, 0)],
    "quick_check": [("ok",)],
    "integrity_check": [("ok",)],
    "encoding": [("UTF-8",)],
}
_PRAGMA_COLUMNS: dict[str, list[str]] = {
    "table_info": ["cid", "name", "type", "notnull", "dflt_value", "pk"],
    "table_xinfo": ["cid", "name", "type", "notnull", "dflt_value", "pk", "hidden"],
    "index_list": ["seq", "name", "unique", "origin", "partial"],
    "index_info": ["seqno", "cid", "name"],
    "index_xinfo": ["seqno", "cid", "name", "desc", "coll", "key"],
    "foreign_key_list": ["id", "seq", "table", "from", "to", "on_update", "on_delete", "match"],
    "table_list": ["schema", "name", "type", "ncol", "wr", "strict"],
    "database_list": ["seq", "name", "file"],
    "wal_checkpoint": ["busy", "log", "checkpointed"],
}


def mutation_columns(table: Table) -> list[str]:
    """The table's columns in the order ``schema.create_commands`` creates them."""
    return [c.name for c in table.columns if c.name != ROWID] + [n for n, _ in SYSTEM_COLUMNS]


def _sql_default(value: object) -> str | None:
    """A DEFAULT as ``PRAGMA table_info`` shows it: the SQL text of the literal."""
    if value is None:
        return None
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return str(value)


def _unquote(name: str | None) -> str:
    name = (name or "").strip()
    if "." in name and not name.startswith(("'", '"', "[", "`")):
        name = name.split(".", 1)[1]
    if len(name) >= 2 and name[0] in "'\"`[" and name[-1] in "'\"`]":
        name = name[1:-1]
    return name


class KustoConnection:
    """The ``sqlite3.Connection`` surface over one Kusto database.

    *client* runs queries and management commands (``execute``/``execute_mgmt`` of
    ``azure.kusto.data.KustoClient``); *ingester* writes rows. Both are shared with
    other connections; this object only holds the insert buffer and per-connection
    settings, so it should be used from one thread at a time, like a SQLite connection.
    """

    _schema_lock = threading.Lock()
    _schema_done: set[tuple[str, str]] = set()

    def __init__(
        self,
        settings: KustoSettings,
        client: Any,
        ingester: RowIngester,
        translator: Any = None,
        tables: dict[str, Table] | None = None,
    ):
        self.settings = settings
        self.database = settings.database
        self.client = client
        self.ingester = ingester
        self.tables = tables if tables is not None else _default_tables()
        self._translator = translator
        self.row_factory: Any = None
        self.isolation_level: str | None = ""
        self.total_changes = 0
        self._trace: Callable[[str], Any] | None = None
        # Buffered rows per table, in first-insert order (dicts keep insertion order),
        # and the newest buffered row per tuple of each conflict set (key, unique indexes),
        # so a conflict clause sees rows not yet sent.
        self._pending: dict[str, list[dict[str, Any]]] = {}
        self._pending_index: dict[str, list[dict[tuple[Any, ...], dict[str, Any]]]] = {}
        self._pragmas: dict[str, object] = dict(_SETTABLE_PRAGMAS)
        self._closed = False

    @property
    def translator(self) -> Any:
        if self._translator is None:
            from .translate import Translator

            self._translator = Translator(self.tables)
        return self._translator

    @property
    def in_transaction(self) -> bool:
        return any(self._pending.values())

    def ensure_schema(self) -> None:
        """Create or widen every store table, once per process per (cluster, database)."""
        key = (self.settings.cluster, self.database)
        with KustoConnection._schema_lock:
            if key in KustoConnection._schema_done:
                return
            # One read of what the database has, then commands only for what differs: a
            # command per table on every start took half a minute on a real cluster.
            have: dict[str, set[str]] = {}
            for table_name, column in self._mgmt(".show database schema | project TableName, ColumnName").rows:
                have.setdefault(str(table_name), set())
                if column:
                    have[str(table_name)].add(str(column))
            for name, table in self.tables.items():
                wanted = {c.name for c in table.columns} | {n for n, _t in SYSTEM_COLUMNS}
                if name not in have or not wanted <= have[name]:
                    for command in create_commands({name: table}, streaming=False):
                        self._mgmt(command)
            if self.settings.streaming:
                # Table policies inherit from the database's: one command instead of one per table.
                self._mgmt(f".alter database {quote(self.database)} policy streamingingestion enable")
            # The schema described as data, for anyone querying the database directly.
            for command in information_commands(self.tables):
                self._mgmt(command)
            KustoConnection._schema_done.add(key)

    def command(self, text: str) -> list[tuple[Any, ...]]:
        """Run one management command (``.alter-merge database ...``) and return its result rows."""
        self._check_open()
        self._flush()
        return self._mgmt(text).rows

    def cursor(self) -> KustoCursor:
        return KustoCursor(self)

    def execute(self, sql: str, params: Any = ()) -> KustoCursor:
        return self.cursor().execute(sql, params)

    def executemany(self, sql: str, seq_of_params: Iterable[Any]) -> KustoCursor:
        return self.cursor().executemany(sql, seq_of_params)

    def executescript(self, sql: str) -> KustoCursor:
        """Run a script; its CREATE TABLE statements become :meth:`ensure_schema`.

        The Kusto tables come from the store schema as a whole, not one statement at
        a time, so the CREATE TABLE text is not translated at all.
        """
        self._check_open()
        if self._trace is not None:
            self._trace(sql)
        # sqlite3 commits a pending transaction before running a script.
        self.commit()
        statements = split_script(sql)
        rest = [s for s in statements if not is_create_table(s)]
        if len(rest) < len(statements):
            self.ensure_schema()
        cursor = self.cursor()
        if rest:
            script = "\n".join(rest)
            try:
                translated = self.translator.translate_script(script)
            except Unsupported as exc:
                raise KustoStoreError(str(exc), sql=exc.sql or script) from exc
            for stmt in translated:
                self._run(cursor, stmt, script)
        self.commit()
        return cursor

    def commit(self) -> None:
        self._flush()

    def rollback(self) -> None:
        self._pending.clear()
        self._pending_index.clear()

    def close(self) -> None:
        # Like sqlite3: closing without commit() discards the open transaction.
        self.rollback()
        self._closed = True

    def interrupt(self) -> None:
        pass

    def set_trace_callback(self, fn: Callable[[str], Any] | None) -> None:
        self._trace = fn

    def __enter__(self) -> KustoConnection:
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        if exc_type is None:
            self.commit()
        else:
            self.rollback()

    def _check_open(self) -> None:
        if self._closed:
            raise sqlite3.ProgrammingError("Cannot operate on a closed database.")

    def _translate(self, sql: str, params: Any) -> Statement:
        try:
            return self.translator.translate(sql, params if params is not None else ())
        except Unsupported as exc:
            raise KustoStoreError(str(exc), sql=exc.sql or sql) from exc

    def _execute(self, cursor: KustoCursor, sql: str, params: Any) -> None:
        self._check_open()
        if self._trace is not None:
            self._trace(sql)
        self._run(cursor, self._translate(sql, params), sql)

    def _executemany(self, cursor: KustoCursor, sql: str, seq_of_params: Iterable[Any]) -> None:
        """Every Insert of the batch becomes one buffered write; other statements run in order."""
        self._check_open()
        group: Insert | None = None
        total = 0
        last_rowid: int | None = None

        def run_group() -> None:
            nonlocal group, total, last_rowid
            if group is not None:
                n, rid = self._insert(group)
                total += n
                last_rowid = rid if rid is not None else last_rowid
                group = None

        mutations: list[Mutation] = []

        def run_mutations() -> None:
            nonlocal total
            if mutations:
                total += self._mutate_many(mutations, sql)
                mutations.clear()

        for params in seq_of_params:
            if self._trace is not None:
                self._trace(sql)
            stmt = self._translate(sql, params)
            if isinstance(stmt, Insert):
                run_mutations()
                same = group is not None and (
                    group.table,
                    group.on_conflict,
                    group.update_columns,
                    group.update_kql,
                ) == (stmt.table, stmt.on_conflict, stmt.update_columns, stmt.update_kql)
                if same and group is not None:
                    group.rows.extend(stmt.rows)
                else:
                    run_group()
                    group = Insert(stmt.table, list(stmt.rows), stmt.on_conflict, stmt.update_columns, stmt.update_kql)
                continue
            run_group()
            if isinstance(stmt, Mutation):
                # Consecutive mutations of one table go to the cluster as one query.
                if mutations and (mutations[0].table, mutations[0].kind) != (stmt.table, stmt.kind):
                    run_mutations()
                mutations.append(stmt)
                if len(mutations) >= MUTATIONS_PER_QUERY:
                    run_mutations()
                continue
            run_mutations()
            self._run(cursor, stmt, sql)
            total += max(cursor.rowcount, 0)
        run_group()
        run_mutations()
        cursor._set([], [], total)
        if last_rowid is not None:
            cursor.lastrowid = last_rowid

    def _mutate_many(self, stmts: list[Mutation], sql: str) -> int:
        """Run a batch of mutations of one table as one query: ``union`` of their bodies over one read of the table.

        Every mutation's KQL opens with the same ``let`` binding of the table's current
        rows; the batch keeps one, materialized, and unions the bodies. An
        ``executemany`` of an UPDATE over a few hundred sessions was a few hundred
        round trips of half a second each; it is one. The arms do not see each other's
        changes, as SQLite's sequential statements would; a batch whose arms touch the
        same row is written as the union of their versions.
        """
        if len(stmts) == 1:
            return self._mutate(stmts[0], sql)
        preludes = {s.kql.split(";\n", 1)[0] for s in stmts}
        if len(preludes) != 1 or " = " not in next(iter(preludes)) or not next(iter(preludes)).startswith("let "):
            return sum(self._mutate(s, sql) for s in stmts)
        prelude = next(iter(preludes))
        name, definition = prelude[len("let ") :].split(" = ", 1)
        bodies = [s.kql.split(";\n", 1)[1] for s in stmts]
        kql = f"let {name} = materialize({definition});\nunion isfuzzy=false " + ", ".join(f"({b})" for b in bodies)
        return self._mutate(Mutation(stmts[0].table, kql, stmts[0].kind), sql)

    def _run(self, cursor: KustoCursor, stmt: Statement, sql: str) -> None:
        if isinstance(stmt, Insert):
            n, rid = self._insert(stmt)
            cursor._set([], [], n)
            if rid is not None:
                cursor.lastrowid = rid
        elif isinstance(stmt, Query):
            self._flush()
            result = self._query(stmt.kql, sql)
            names = result.names
            if stmt.columns and len(stmt.columns) == len(names):
                names = list(stmt.columns)
            cursor._set(names, result.rows, -1)
        elif isinstance(stmt, Mutation):
            self._flush()
            cursor._set([], [], self._mutate(stmt, sql))
        elif isinstance(stmt, Pragma):
            self._flush()
            names, rows = self._pragma(stmt)
            cursor._set(names, rows, -1)
        elif isinstance(stmt, Noop):
            cursor._set([], [], 0)
        else:
            raise KustoStoreError(f"unknown statement {type(stmt).__name__}", sql=sql)

    def _query(self, kql: str, sql: str | None = None) -> Result:
        from azure.kusto.data import ClientRequestProperties

        props = ClientRequestProperties()
        props.set_option(ClientRequestProperties.request_timeout_option_name, QUERY_TIMEOUT)
        try:
            response = retrying(lambda: self.client.execute(self.database, kql, props), "query")
        except Exception as exc:  # noqa: BLE001 - every SDK and transport failure is a store error
            raise KustoStoreError("Kusto query failed", kql=kql, sql=sql, server_message=_server_message(exc)) from exc
        return Result.from_response(response)

    def _mgmt(self, command: str, sql: str | None = None) -> Result:
        try:
            response = retrying(lambda: self.client.execute_mgmt(self.database, command), "command")
        except Exception as exc:  # noqa: BLE001 - every SDK and transport failure is a store error
            raise KustoStoreError(
                "Kusto command failed", kql=command, sql=sql, server_message=_server_message(exc)
            ) from exc
        return Result.from_response(response)

    def _mutate(self, stmt: Mutation, sql: str) -> int:
        """Run the mutation's query and buffer its rows as new versions, like inserted rows.

        The cluster computes the new versions (the UPDATE's SET, the DELETE's tombstone);
        they reach the table through the same streaming ingestion as inserts, at the
        next flush. ``.set-or-append`` would write them in one command, but it takes an
        ingestion-capacity slot, of which a small cluster has one: a poll of a few
        hundred updates queued for minutes behind itself. The version stamp is this
        process's, so it orders against the rows it inserted in the same transaction.
        """
        kql = stmt.kql
        table = self.tables.get(stmt.table)
        if table is not None:
            # The rows carry every column, in the table's own order.
            kql += " | project " + ", ".join(quote(n) for n in mutation_columns(table))
        result = self._query(kql, sql)
        rows: list[dict[str, Any]] = []
        for values in result.rows:
            row = dict(zip(result.names, values, strict=False))
            row[VERSION] = next_version()
            row[DELETED] = bool(row.get(DELETED))
            if ROWID in row and row[ROWID] is not None:
                row[ROWID] = int(row[ROWID])
            rows.append(row)
        for row in rows:
            self._buffer(stmt.table, table, row)
        if len(self._pending.get(stmt.table) or ()) >= FLUSH_ROWS:
            self._flush()
        self.total_changes += len(rows)
        return len(rows)

    def _complete(self, table: Table | None, row: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        """The row with its system columns, typed for its table; and whether its rowid is new."""
        out = dict(row)
        if table is not None:
            for name, value in out.items():
                col = table.column(name)
                if col is not None:
                    out[name] = coerce(value, col.kusto_type)
        rc = table.rowid_column if table is not None else None
        fresh = False
        if rc is not None and out.get(rc) is not None:
            rowid = int(out[rc])  # type: ignore[arg-type]
        elif out.get(ROWID) is not None:
            rowid = int(out[ROWID])  # type: ignore[arg-type]
        else:
            rowid, fresh = next_rowid(), True
        if rc is not None and out.get(rc) is None:
            out[rc] = rowid
        out[ROWID] = rowid
        out[VERSION] = next_version()
        out[DELETED] = False
        return out, fresh

    def _set_key(
        self, table: Table, names: tuple[str, ...], row: dict[str, Any], partial: bool
    ) -> tuple[Any, ...] | None:
        """The row's values in one conflict set as a comparable tuple, or None when the set does not apply.

        Kusto has no null string, so None text compares as ''. A unique index of the
        store is partial (``WHERE dedup_key != ''``): with *partial*, a row with None or
        '' in any column of the set is outside the index and cannot conflict on it.
        """
        out = []
        for name in names:
            ktype = self._key_type(table, name)
            value = coerce(row.get(name), ktype)
            if partial and value in (None, ""):
                return None
            out.append("" if value is None and ktype == "string" else value)
        return tuple(out)

    def _key(self, table: Table, row: dict[str, Any]) -> tuple[Any, ...]:
        key = self._set_key(table, table.key, row, partial=False)
        assert key is not None
        return key

    def _keys(self, table: Table, row: dict[str, Any]) -> list[tuple[Any, ...] | None]:
        """The row's tuple in every conflict set of the table (the key first), None where a set does not apply."""
        return [self._set_key(table, names, row, partial=i > 0) for i, names in enumerate(table.conflict_keys)]

    def _key_type(self, table: Table, name: str) -> str:
        col = table.column(name)
        return col.kusto_type if col is not None else "long"

    def _set_filter(self, table: Table, names: tuple[str, ...], keys: list[tuple[Any, ...]]) -> str:
        if len(names) == 1:
            ktype = self._key_type(table, names[0])
            return f"{quote(names[0])} in ({', '.join(kql_literal(k[0], ktype) for k in keys)})"
        terms = []
        for k in keys:
            terms.append(
                "("
                + " and ".join(
                    f"{quote(n)} == {kql_literal(v, self._key_type(table, n))}" for n, v in zip(names, k, strict=True)
                )
                + ")"
            )
        return " or ".join(terms)

    def _existing(self, table: Table, ask: list[set[tuple[Any, ...]]]) -> list[dict[tuple[Any, ...], dict[str, Any]]]:
        """The current rows matching any asked tuple of any conflict set, indexed by every set.

        One query per batch (per KEYS_PER_QUERY tuples): the filters of all sets are
        joined with ``or``, so a row is found whichever of its sets the new row shares.
        """
        sets = table.conflict_keys
        found: list[dict[tuple[Any, ...], dict[str, Any]]] = [{} for _ in sets]
        pairs = [(i, k) for i, keys in enumerate(ask) for k in keys]
        for start in range(0, len(pairs), KEYS_PER_QUERY):
            part = pairs[start : start + KEYS_PER_QUERY]
            filters = []
            for i, names in enumerate(sets):
                keys = [k for j, k in part if j == i]
                if keys:
                    filters.append(f"({self._set_filter(table, names, keys)})")
            for row in self._query(f"{current(table)} | where {' or '.join(filters)}").dicts():
                for i, k in enumerate(self._keys(table, row)):
                    if k is not None:
                        found[i][k] = row
        return found

    def _passing(self, table: Table, pairs: list[tuple[dict[str, Any], dict[str, Any]]], update_kql: str) -> set[int]:
        """Which (existing row, new row) pairs satisfy the DO UPDATE's WHERE, by position in *pairs*.

        The new values sit in a datatable as ``__new_<column>`` beside the existing
        row's key, joined to the current rows by key; the predicate then sees both, as
        the SQLite WHERE sees the row and ``excluded``. The pair's position rides along,
        since two new rows may meet the same existing row.
        """
        cols = [c for c in table.columns if c.name not in table.key]
        on = ", ".join(quote(n) for n in table.key)
        out: set[int] = set()
        for start in range(0, len(pairs), KEYS_PER_QUERY):
            part = pairs[start : start + KEYS_PER_QUERY]
            schema = [f"{quote(n)}:{self._key_type(table, n)}" for n in table.key]
            schema += [f"{quote('__new_' + c.name)}:{c.kusto_type}" for c in cols] + ["aictl_i:long"]
            values = []
            for n, (base, row) in enumerate(part, start):
                values += [kql_literal(base.get(k), self._key_type(table, k)) for k in table.key]
                values += [kql_literal(row.get(c.name), c.kusto_type) for c in cols]
                values.append(f"long({n})")
            kql = (
                f"let aictl_new = datatable({', '.join(schema)})[{', '.join(values)}];\n"
                f"{current(table)} | lookup kind=inner (aictl_new) on {on}"
                f" | where ({update_kql}) | project aictl_i"
            )
            out.update(int(r[0]) for r in self._query(kql).rows)
        return out

    def _insert(self, stmt: Insert) -> tuple[int, int | None]:
        """Buffer the rows of an Insert, resolving its conflict clause; returns (rows written, last rowid)."""
        table = self.tables.get(stmt.table)
        completed = [self._complete(table, r) for r in stmt.rows]
        resolve = table is not None and (
            stmt.on_conflict in ("ignore", "update") or (stmt.on_conflict == "replace" and table.unique_sets)
        )
        if table is None or not resolve:
            rows = [r for r, _ in completed]
            written = len(rows)
        else:
            rows, written = self._resolve(table, stmt, completed)
        for row in rows:
            self._buffer(stmt.table, table, row)
        if self._pending.get(stmt.table) and len(self._pending[stmt.table]) >= FLUSH_ROWS:
            self._flush()
        self.total_changes += written
        live = [r for r in rows if not r[DELETED]]
        return written, (live[-1][ROWID] if live else None)

    def _resolve(
        self, table: Table, stmt: Insert, completed: list[tuple[dict[str, Any], bool]]
    ) -> tuple[list[dict[str, Any]], int]:
        """Apply a conflict clause over every conflict set of the table: key and unique indexes.

        A new row meets an earlier row of the same batch first, then a buffered row,
        then the current row on the cluster, on the first set (key first) it shares
        with one. ``ignore`` drops it; ``update`` merges its ``update_columns`` onto that
        row, which keeps its rowid; ``replace`` writes it as the newest version of that
        row: same rowid, or, when the table's key is not the rowid, after a tombstone
        of the old row. Returns the rows to buffer and how many rows the statement
        changed.
        """
        mode = stmt.on_conflict
        if mode == "update" and stmt.update_kql and table.name in self._pending:
            # The predicate runs on the cluster, so the rows it judges must be there.
            self._flush()
        sets = table.conflict_keys
        local = self._pending_index.get(table.name) or [{} for _ in sets]
        keyed = [(row, fresh, self._keys(table, row)) for row, fresh in completed]

        # A replace on the key is just a newer version; only the unique sets need asking.
        first = 1 if mode == "replace" else 0
        ask: list[set[tuple[Any, ...]]] = [set() for _ in sets]
        for _, fresh, keys in keyed:
            for i in range(first, len(sets)):
                k = keys[i]
                if k is None or k in local[i]:
                    continue
                if i == 0 and fresh and table.key == (ROWID,):
                    continue  # a freshly drawn rowid cannot exist yet
                ask[i].add(k)
        existing = self._existing(table, ask) if any(ask) else [{} for _ in sets]

        def cluster_match(keys: list[tuple[Any, ...] | None]) -> dict[str, Any] | None:
            for i in range(first, len(sets)):
                k = keys[i]
                if k is not None and k in existing[i]:
                    return existing[i][k]
            return None

        passing: set[int] | None = None
        if mode == "update" and stmt.update_kql:
            pairs = []
            pair_of: dict[int, int] = {}
            for n, (row, _, keys) in enumerate(keyed):
                base = cluster_match(keys)
                if base is not None:
                    pair_of[n] = len(pairs)
                    pairs.append((base, row))
            hits = self._passing(table, pairs, stmt.update_kql) if pairs else set()
            passing = {n for n, p in pair_of.items() if p in hits}

        batch: list[dict[tuple[Any, ...], dict[str, Any]]] = [{} for _ in sets]
        out: list[dict[str, Any]] = []
        written = 0

        def accept(row: dict[str, Any]) -> None:
            out.append(row)
            for i, k in enumerate(self._keys(table, row)):
                if k is not None:
                    batch[i][k] = row

        for n, (row, _, keys) in enumerate(keyed):
            base, from_cluster = None, False
            for i in range(first, len(sets)):
                k = keys[i]
                if k is None:
                    continue
                if k in batch[i] or k in local[i]:
                    base = batch[i].get(k) or local[i][k]
                    break
                if k in existing[i]:
                    base, from_cluster = existing[i][k], True
                    break
            if base is None:
                accept(row)
                written += 1
            elif mode == "ignore":
                continue
            elif mode == "update":
                if from_cluster and passing is not None and n not in passing:
                    continue  # DO UPDATE ... WHERE false: the row stays as it is
                merged = {k: v for k, v in base.items() if k not in (VERSION, DELETED)}
                for name in stmt.update_columns:
                    if name in row:
                        merged[name] = row[name]
                accept(self._complete(table, merged)[0])
                written += 1
            else:  # replace through a unique index
                if table.key == (ROWID,):
                    row[ROWID] = base[ROWID]
                    if table.rowid_column:
                        row[table.rowid_column] = base[ROWID]
                elif self._key(table, base) != self._key(table, row):
                    gone, _ = self._complete(table, {k: v for k, v in base.items() if k not in (VERSION, DELETED)})
                    gone[DELETED] = True
                    out.append(gone)
                accept(row)
                written += 1
        return out, written

    def _buffer(self, name: str, table: Table | None, row: dict[str, Any]) -> None:
        self._pending.setdefault(name, []).append(row)
        if table is None:
            return
        index = self._pending_index.setdefault(name, [{} for _ in table.conflict_keys])
        for i, k in enumerate(self._keys(table, row)):
            if k is None:
                continue
            if row[DELETED]:
                # A tombstone: a later conflict check must not meet the row it removed.
                index[i].pop(k, None)
            else:
                index[i][k] = row

    def _flush(self) -> None:
        """Send every buffered row, table by table in first-insert order."""
        while self._pending:
            name = next(iter(self._pending))
            rows = self._pending[name]
            if rows:
                try:
                    self.ingester.ingest(name, rows)
                except KustoStoreError:
                    raise
                except Exception as exc:  # noqa: BLE001 - every SDK and transport failure is a store error
                    raise KustoStoreError(
                        f"Kusto ingestion into {name} failed ({len(rows)} rows)", server_message=_server_message(exc)
                    ) from exc
            del self._pending[name]
            self._pending_index.pop(name, None)

    def _pragma(self, stmt: Pragma) -> tuple[list[str], list[tuple[Any, ...]]]:
        name = stmt.name.lower()
        arg = _unquote(stmt.argument)
        if name in ("table_info", "table_xinfo"):
            table = self.tables.get(arg)
            rows: list[tuple[Any, ...]] = []
            if table is not None:
                pk_cols = (
                    list(table.key) if table.key != (ROWID,) else ([table.rowid_column] if table.rowid_column else [])
                )
                for i, c in enumerate(table.columns):
                    pk = pk_cols.index(c.name) + 1 if c.name in pk_cols else 0
                    row: tuple[Any, ...] = (i, c.name, c.sqlite_type, int(c.not_null), _sql_default(c.default), pk)
                    rows.append(row + (0,) if name == "table_xinfo" else row)
            return _PRAGMA_COLUMNS[name], rows
        if name in ("index_list", "index_info", "index_xinfo", "foreign_key_list"):
            return _PRAGMA_COLUMNS[name], []
        if name == "table_list":
            rows = [("main", t.name, "table", len(t.columns), 0, 0) for t in self.tables.values()]
            return _PRAGMA_COLUMNS[name], rows
        if name == "database_list":
            return _PRAGMA_COLUMNS[name], [(0, "main", self.settings.uri)]
        if name in _SETTABLE_PRAGMAS:
            if stmt.value is not None:
                value = _unquote(stmt.value)
                try:
                    self._pragmas[name] = int(value)
                except ValueError:
                    self._pragmas[name] = value
                if name != "busy_timeout":
                    return [], []
            return [name], [(self._pragmas[name],)]
        if name in _FIXED_PRAGMAS:
            return _PRAGMA_COLUMNS.get(name, [name]), list(_FIXED_PRAGMAS[name])
        # optimize, incremental_vacuum, shrink_memory and anything unknown: nothing to say.
        return [], []


def connect(
    settings: KustoSettings,
    translator: Any = None,
    tables: dict[str, Table] | None = None,
    client: Any = None,
    ingester: RowIngester | None = None,
) -> KustoConnection:
    """A connection to the settings' database, its tables created on the first call of the process.

    *client* and *ingester* default to the process-wide shared ones; tests pass fakes.
    """
    if client is None:
        client = KustoClientFactory.client(settings)
        if ingester is None:
            ingester = KustoClientFactory.ingester(settings)
    elif ingester is None:
        ingester = make_ingester(settings, client)
    conn = KustoConnection(settings, client, ingester, translator=translator, tables=tables)
    conn.ensure_schema()
    return conn


__all__ = [
    "KustoClientFactory",
    "KustoConnection",
    "KustoCursor",
    "KustoStoreError",
    "Row",
    "connect",
    "connection_string",
    "next_rowid",
]
