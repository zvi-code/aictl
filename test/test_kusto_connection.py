"""The Kusto connection: sqlite3's surface over translated statements.

The offline tests drive ``KustoConnection`` with a fake SDK client and a stub
translator that hands back prepared statements, so they check the connection's own
work (buffering, rowids, conflict clauses, pragmas, types) and nothing of the
translator's. The emulator tests run the same paths against the local Kusto
emulator when it answers, and are skipped otherwise.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import urllib.request
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from aictl.kusto import (
    AUTH_ENV,
    CLUSTER_ENV,
    DATABASE_ENV,
    INGESTION_ENV,
    TABLE_INGESTION_ENV,
    KustoSettings,
    engine_url,
    kusto_settings,
    parse_table_ingestion,
)
from aictl.kusto.connection import (
    FLUSH_ROWS,
    KustoClientFactory,
    KustoConnection,
    KustoStoreError,
    Row,
    coerce,
    connect,
    connection_string,
    is_create_table,
    kql_literal,
    mutation_columns,
    next_rowid,
    next_version,
    split_script,
    to_python,
)
from aictl.kusto.ingest import (
    InlineIngester,
    StreamingIngester,
    ingestion_capacity,
    json_line,
    make_ingester,
    uses_inline,
)
from aictl.kusto.schema import DELETED, ROWID, VERSION, current, row_defaults, store_schema
from aictl.kusto.statements import Insert, Mutation, Noop, Pragma, Query, Unsupported

TABLES = store_schema()


def response(columns: list[tuple[str, str]], rows: list[list[Any]]) -> Any:
    cols = [SimpleNamespace(column_name=n, column_type=t) for n, t in columns]
    return SimpleNamespace(primary_results=[_Table(cols, rows)])


class _Table:
    def __init__(self, columns: list[Any], rows: list[list[Any]]):
        self.columns = columns
        self._rows = rows

    def __iter__(self):
        return iter(self._rows)


class FakeClient:
    """Records every request; answers queries with *on_query(kql)* and commands with *on_mgmt(cmd)*."""

    def __init__(self, on_query=None, on_mgmt=None):
        self.queries: list[str] = []
        self.properties: list[Any] = []
        self.commands: list[str] = []
        self.on_query = on_query or (lambda kql: response([], []))
        self.on_mgmt = on_mgmt or (lambda cmd: response([], []))

    def execute(self, database, kql, properties=None):
        self.queries.append(kql)
        self.properties.append(properties)
        return self.on_query(kql)

    def execute_mgmt(self, database, command, properties=None):
        self.commands.append(command)
        return self.on_mgmt(command)


class FakeIngester:
    def __init__(self):
        self.calls: list[tuple[str, list[dict[str, Any]]]] = []

    def ingest(self, table, rows):
        self.calls.append((table, list(rows)))


class FakeStreamingClient:
    def __init__(self):
        self.calls: list[tuple[str, bytes]] = []

    def ingest_from_stream(self, stream, properties):
        self.calls.append((properties.table, stream.read()))


class StubTranslator:
    """Maps a SQL string to the statement a test prepared for it; calls with a list of params map by params."""

    def __init__(self, mapping=None):
        self.mapping: dict[str, Any] = mapping or {}
        self.scripts: list[str] = []

    def translate(self, sql, params=()):
        stmt = self.mapping[sql]
        if callable(stmt):
            return stmt(params)
        if isinstance(stmt, Exception):
            raise stmt
        return stmt

    def translate_script(self, sql):
        self.scripts.append(sql)
        return [Noop("script")]


SETTINGS = KustoSettings("http://fake.local:1", "aictl", streaming=False)


def make(mapping=None, client=None):
    client = client or FakeClient()
    ingester = FakeIngester()
    conn = KustoConnection(SETTINGS, client, ingester, translator=StubTranslator(mapping), tables=TABLES)
    return conn, client, ingester


def session_row(sid: str, **values: Any) -> dict[str, Any]:
    row = row_defaults(TABLES["sessions"])
    row.update(session_id=sid, **values)
    return row


def test_rowids_are_unique_and_increasing_across_threads():
    out: list[list[int]] = []

    def work():
        ids = [next_rowid() for _ in range(3000)]
        out.append(ids)

    threads = [threading.Thread(target=work) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    every = [i for ids in out for i in ids]
    assert len(set(every)) == len(every)
    for ids in out:
        assert ids == sorted(ids)
    assert all(0 < i < 2**63 for i in every)


def test_versions_strictly_increase():
    vs = [next_version() for _ in range(2000)]
    assert vs == sorted(vs) and len(set(vs)) == len(vs)
    assert vs[0].endswith("Z") and "T" in vs[0]


def test_inserts_wait_for_commit_and_flush_in_first_insert_order():
    ev = row_defaults(TABLES["events"]) | {"ts": 1.0, "tool": "t", "kind": "k"}
    conn, _, ing = make({"s": Insert("sessions", [session_row("a")]), "e": Insert("events", [ev])})
    conn.execute("e")
    conn.execute("s")
    conn.execute("e")
    assert ing.calls == [] and conn.in_transaction
    conn.commit()
    assert [(t, len(r)) for t, r in ing.calls] == [("events", 2), ("sessions", 1)]
    assert not conn.in_transaction
    row = ing.calls[1][1][0]
    assert row["_deleted"] is False and row["_v"].endswith("Z") and isinstance(row[ROWID], int)


def test_rollback_and_close_drop_buffered_rows():
    conn, _, ing = make({"s": Insert("sessions", [session_row("a")])})
    conn.execute("s")
    conn.rollback()
    conn.commit()
    conn.execute("s")
    conn.close()
    assert ing.calls == []
    with pytest.raises(sqlite3.ProgrammingError):
        conn.execute("s")


def test_buffer_flushes_at_row_limit():
    conn, _, ing = make({"s": lambda p: Insert("sessions", [session_row(f"s{i}") for i in range(FLUSH_ROWS)])})
    conn.execute("s")
    assert len(ing.calls) == 1 and len(ing.calls[0][1]) == FLUSH_ROWS


def test_reads_mutations_and_pragmas_flush_first():
    order: list[str] = []
    client = FakeClient(on_query=lambda k: order.append("query") or response([], []))
    conn, _, ing = make(
        {
            "s": Insert("sessions", [session_row("a")]),
            "q": Query("T"),
            "m": Mutation("sessions", "T"),
            "p": Pragma("page_size"),
        },
        client,
    )
    ing.ingest = lambda t, r: order.append("ingest")  # type: ignore[method-assign]
    for sql in ("s", "q", "s", "m", "s", "p"):
        conn.execute(sql)
    # A mutation is a query too: the buffer is sent first, its rows come back and wait for the next flush.
    assert order == ["ingest", "query", "ingest", "query", "ingest"]
    assert not client.commands
    assert client.queries[1].startswith("T | project ['session_id']")
    assert client.queries[1].endswith("['rowid'], ['_v'], ['_deleted']")


def test_rowid_fills_integer_primary_key_and_lastrowid():
    proc = row_defaults(TABLES["processes"]) | {"pid": 7}
    explicit = dict(proc, id=42)
    conn, _, ing = make({"a": Insert("processes", [proc]), "b": Insert("processes", [explicit])})
    cur = conn.execute("a")
    assert cur.rowcount == 1 and cur.lastrowid is not None
    assert conn.execute("b").lastrowid == 42
    conn.commit()
    first, second = ing.calls[0][1]
    assert first["id"] == first[ROWID] == cur.lastrowid
    assert second["id"] == second[ROWID] == 42


def test_insert_or_ignore_skips_existing_buffered_and_duplicate_keys():
    def on_query(kql):
        assert 'in ("old", "new")' in kql or 'in ("new", "old")' in kql
        return response([("session_id", "string"), ("rowid", "long")], [["old", 1]])

    client = FakeClient(on_query=on_query)
    rows = [session_row("old"), session_row("new"), session_row("new", tool="second"), session_row("pending")]
    conn, _, ing = make(
        {"p": Insert("sessions", [session_row("pending")]), "i": Insert("sessions", rows, "ignore")}, client
    )
    conn.execute("p")
    cur = conn.execute("i")
    assert cur.rowcount == 1
    assert len(client.queries) == 1 and current(TABLES["sessions"]) in client.queries[0]
    conn.commit()
    ids = [r["session_id"] for r in ing.calls[0][1]]
    assert ids == ["pending", "new"] and ing.calls[0][1][1]["tool"] == ""


def test_insert_or_ignore_with_fresh_rowids_needs_no_query():
    proc = row_defaults(TABLES["processes"]) | {"pid": 1}
    conn, client, ing = make({"i": Insert("processes", [proc, dict(proc)], "ignore")})
    assert conn.execute("i").rowcount == 2
    assert client.queries == []


def test_executemany_batches_inserts_into_one_existence_query():
    client = FakeClient(on_query=lambda k: response([], []))
    conn, _, ing = make({"i": lambda p: Insert("sessions", [session_row(p[0])], "ignore")}, client)
    cur = conn.executemany("i", [("a",), ("b",), ("c",)])
    assert cur.rowcount == 3 and len(client.queries) == 1
    conn.commit()
    assert [r["session_id"] for r in ing.calls[0][1]] == ["a", "b", "c"]


def test_on_conflict_do_update_merges_update_columns_into_the_current_row():
    cols = [
        ("session_id", "string"),
        ("tool", "string"),
        ("model", "string"),
        ("started_at", "real"),
        ("rowid", "long"),
    ]
    client = FakeClient(on_query=lambda k: response(cols, [["s1", "claude", "old", 5.0, 99]]))
    new = [session_row("s1", tool="other", model="new", started_at=9.0), session_row("s2", model="m2")]
    conn, _, ing = make({"u": Insert("sessions", new, "update", update_columns=("model",))}, client)
    cur = conn.execute("u")
    assert cur.rowcount == 2
    conn.commit()
    merged, fresh = ing.calls[0][1]
    assert (merged["session_id"], merged["tool"], merged["model"], merged["started_at"], merged[ROWID]) == (
        "s1",
        "claude",
        "new",
        5.0,
        99,
    )
    assert fresh["session_id"] == "s2" and fresh["model"] == "m2"


def test_on_conflict_do_update_where_decides_on_the_cluster():
    cols = [("session_id", "string"), ("model", "string"), ("started_at", "real"), ("rowid", "long")]

    def on_query(kql):
        if "lookup" in kql:
            assert (
                "datatable(" in kql
                and "['__new_started_at']:real" in kql
                and "(['__new_started_at'] > ['started_at'])" in kql
            )
            return response([("aictl_i", "long")], [[0]])  # the first pair (s1) passes
        return response(cols, [["s1", "old", 5.0, 1], ["s2", "old", 5.0, 2]])

    client = FakeClient(on_query=on_query)
    new = [session_row("s1", model="n1", started_at=9.0), session_row("s2", model="n2", started_at=1.0)]
    stmt = Insert(
        "sessions", new, "update", update_columns=("model",), update_kql="['__new_started_at'] > ['started_at']"
    )
    conn, _, ing = make({"u": stmt}, client)
    assert conn.execute("u").rowcount == 1
    conn.commit()
    assert [(r["session_id"], r["model"]) for r in ing.calls[0][1]] == [("s1", "n1")]


def request_row(dedup: str, **values: Any) -> dict[str, Any]:
    row = row_defaults(TABLES["requests"])
    row.update(dedup_key=dedup, ts=1.0, **values)
    return row


REQUEST_COLS = [
    ("id", "long"),
    ("dedup_key", "string"),
    ("input_tokens", "long"),
    ("model", "string"),
    ("rowid", "long"),
]


def test_insert_or_ignore_conflicts_on_a_unique_index_and_skips_empty_values():
    def on_query(kql):
        assert "['dedup_key'] in (" in kql and '"d1"' in kql and '"d2"' in kql and '""' not in kql
        assert "['rowid'] in" not in kql  # fresh rowids are never asked about
        return response(REQUEST_COLS, [[77, "d1", 5, "m", 77]])

    client = FakeClient(on_query=on_query)
    rows = [request_row("d1"), request_row("d2"), request_row("d2", model="dup"), request_row(""), request_row("")]
    conn, _, ing = make({"i": Insert("requests", rows, "ignore")}, client)
    assert conn.execute("i").rowcount == 3
    assert len(client.queries) == 1
    conn.commit()
    written = ing.calls[0][1]
    assert [r["dedup_key"] for r in written] == ["d2", "", ""] and written[0]["model"] == ""
    assert len({r[ROWID] for r in written}) == 3


def test_do_update_through_a_unique_index_merges_onto_the_existing_row():
    client = FakeClient(on_query=lambda k: response(REQUEST_COLS, [[77, "d1", 5, "old", 77]]))
    rows = [request_row("d1", input_tokens=9, model="new"), request_row("d9", input_tokens=1)]
    conn, _, ing = make({"u": Insert("requests", rows, "update", update_columns=("input_tokens",))}, client)
    cur = conn.execute("u")
    assert cur.rowcount == 2
    conn.commit()
    merged, fresh = ing.calls[0][1]
    assert (merged[ROWID], merged["id"], merged["input_tokens"], merged["model"]) == (77, 77, 9, "old")
    assert fresh["dedup_key"] == "d9" and fresh[ROWID] != 77 and fresh["id"] == fresh[ROWID]


def test_do_update_where_through_a_unique_index_joins_on_the_existing_key():
    def on_query(kql):
        if "lookup" in kql:
            # The datatable carries the existing row's rowid (77), not the new row's.
            assert "long(77)" in kql and "project aictl_i" in kql
            return response([("aictl_i", "long")], [])
        return response(REQUEST_COLS, [[77, "d1", 5, "old", 77]])

    stmt = Insert(
        "requests",
        [request_row("d1", input_tokens=1)],
        "update",
        ("input_tokens",),
        "['__new_input_tokens'] > ['input_tokens']",
    )
    conn, client, ing = make({"u": stmt}, FakeClient(on_query=on_query))
    assert conn.execute("u").rowcount == 0
    conn.commit()
    assert ing.calls == []


def test_replace_through_a_unique_index_reuses_the_existing_rowid():
    client = FakeClient(on_query=lambda k: response(REQUEST_COLS, [[77, "d1", 5, "old", 77]]))
    rows = [request_row("d1", model="new"), request_row("d3", model="a"), request_row("d3", model="b"), request_row("")]
    conn, _, ing = make(
        {"r": Insert("requests", rows, "replace"), "s": Insert("sessions", [session_row("x")], "replace")}, client
    )
    assert conn.execute("r").rowcount == 4
    assert len(client.queries) == 1
    conn.execute("s")  # no unique index: a replace needs no query
    assert len(client.queries) == 1
    conn.commit()
    d1, d3a, d3b, empty = ing.calls[0][1]
    assert (d1[ROWID], d1["id"], d1["model"]) == (77, 77, "new")
    assert d3b[ROWID] == d3a[ROWID] and d3b["id"] == d3a[ROWID] and d3b[VERSION] > d3a[VERSION]
    assert empty[ROWID] not in (77, d3a[ROWID])


def test_replace_sees_buffered_rows_of_a_unique_index():
    client = FakeClient()
    conn, _, ing = make({"r": lambda p: Insert("requests", [request_row("d5", model=p[0])], "replace")}, client)
    first = conn.execute("r", ("a",)).lastrowid
    second = conn.execute("r", ("b",)).lastrowid
    assert first == second
    assert len(client.queries) == 1  # the second row met the buffered one


def test_mutation_rows_become_buffered_versions():
    """The cluster computes the new versions; they are ingested with the next flush, stamped by this process."""
    table = TABLES["sessions"]
    names = mutation_columns(table)
    types = [next((c.kusto_type for c in table.columns if c.name == n), "string") for n in names]
    types = [
        "long" if n == ROWID else "datetime" if n == VERSION else "bool" if n == DELETED else t
        for n, t in zip(names, types, strict=False)
    ]
    base = row_defaults(table) | {"session_id": "a", ROWID: 5, VERSION: "2026-01-01T00:00:00Z", DELETED: True}
    rows = iter([[tuple(base[n] for n in names), tuple((base | {"session_id": "b", ROWID: 6})[n] for n in names)], []])
    client = FakeClient(on_query=lambda k: response(list(zip(names, types, strict=False)), next(rows)))
    conn, _, ing = make({"m": Mutation("sessions", "X", "delete")}, client)
    assert conn.execute("m").rowcount == 2
    assert conn.execute("m").rowcount == 0
    assert conn.total_changes == 2
    conn.commit()
    ((table_name, sent),) = ing.calls
    assert table_name == "sessions" and [r[ROWID] for r in sent] == [5, 6]
    assert all(r[DELETED] is True and r[VERSION] != "2026-01-01T00:00:00Z" for r in sent)


def test_pragmas_are_answered_from_the_schema():
    conn, client, _ = make(
        {
            "ti": Pragma("table_info", "sessions"),
            "il": Pragma("index_list", "'sessions'"),
            "jm": Pragma("journal_mode", value="WAL"),
            "ps": Pragma("page_size"),
            "wc": Pragma("wal_checkpoint", "TRUNCATE"),
            "bt": Pragma("busy_timeout", value="5000"),
            "cs": Pragma("cache_size", value="-2048"),
            "cs?": Pragma("cache_size"),
            "av": Pragma("auto_vacuum"),
            "qc": Pragma("quick_check"),
            "x": Pragma("no_such_pragma"),
            "pk": Pragma("table_info", "processes"),
        }
    )
    info = conn.execute("ti").fetchall()
    assert info[0] == (0, "session_id", "TEXT", 0, None, 1)
    assert info[1][1] == "tool" and info[1][4] == "''"
    assert conn.execute("ti").description[0][0] == "cid"
    assert next(r for r in conn.execute("pk").fetchall() if r[1] == "id")[5] == 1
    assert conn.execute("il").fetchall() == []
    assert conn.execute("jm").fetchone() == ("wal",)
    assert conn.execute("ps").fetchone()[0] == 4096
    assert conn.execute("wc").fetchall() == [(0, 0, 0)]
    assert conn.execute("bt").fetchone() == (5000,)
    conn.execute("cs")
    assert conn.execute("cs?").fetchone() == (-2048,)
    assert conn.execute("av").fetchone() == (0,)
    assert conn.execute("qc").fetchone() == ("ok",)
    assert conn.execute("x").fetchall() == []
    assert client.queries == [] and client.commands == []


def test_result_types_map_to_what_sqlite_returned():
    when = datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
    cols = [
        ("l", "long"),
        ("r", "real"),
        ("s", "string"),
        ("b", "bool"),
        ("d", "datetime"),
        ("j", "dynamic"),
        ("n", "long"),
    ]
    client = FakeClient(on_query=lambda k: response(cols, [[1, 2.5, "x", True, when, {"a": [1]}, None]]))
    conn, _, _ = make({"q": Query("K", columns=["L", "R", "S", "B", "D", "J", "N"])}, client)
    cur = conn.execute("q")
    assert cur.fetchone() == (1, 2.5, "x", True, when.timestamp(), '{"a": [1]}', None)
    assert [d[0] for d in cur.description] == ["L", "R", "S", "B", "D", "J", "N"]
    assert len(cur.description[0]) == 7
    assert to_python("2026-01-02T03:04:05Z", "datetime") == when.timestamp()
    assert client.properties[0].get_option("servertimeout", None).total_seconds() == 60


def test_row_factory_sqlite_row_and_custom_callable():
    client = FakeClient(on_query=lambda k: response([("a", "long"), ("B", "string")], [[1, "x"], [2, "y"]]))
    conn, _, _ = make({"q": Query("K")}, client)
    conn.row_factory = sqlite3.Row
    row = conn.execute("q").fetchone()
    assert row[0] == 1 and row["b"] == "x" and row["a"] == 1 and row.keys() == ["a", "B"]
    assert dict(row) == {"a": 1, "B": "x"} and tuple(row) == (1, "x")
    with pytest.raises(IndexError):
        row["missing"]
    seen = []
    conn.row_factory = lambda cur, values: seen.append(cur) or {"first": values[0]}
    assert [r["first"] for r in conn.execute("q")] == [1, 2]
    assert seen and seen[0].description[0][0] == "a"
    assert Row(["x"], [5])["X"] == 5


def test_fetchmany_and_iteration():
    client = FakeClient(on_query=lambda k: response([("a", "long")], [[i] for i in range(5)]))
    conn, _, _ = make({"q": Query("K")}, client)
    cur = conn.cursor().execute("q")
    assert cur.fetchmany(2) == [(0,), (1,)]
    assert cur.fetchone() == (2,)
    assert list(cur) == [(3,), (4,)]
    assert cur.fetchone() is None


def test_sdk_errors_and_unsupported_become_store_errors():
    from azure.kusto.data.exceptions import KustoServiceError

    def boom(kql):
        raise KustoServiceError("Semantic error: no such column")

    conn, _, _ = make(
        {"q": Query("bad | kql"), "u": Unsupported("WINDOW frame", "SELECT 1")}, FakeClient(on_query=boom)
    )
    with pytest.raises(sqlite3.Error) as info:
        conn.execute("q")
    err = info.value
    assert isinstance(err, KustoStoreError) and isinstance(err, sqlite3.OperationalError)
    assert err.kql == "bad | kql" and "no such column" in str(err) and err.sql == "q"
    with pytest.raises(KustoStoreError) as info2:
        conn.execute("u")
    assert "WINDOW frame" in str(info2.value) and info2.value.sql == "SELECT 1"


class _ApiError(Exception):
    """A KustoApiError look-alike: an HTTP status and the service's one-api error body."""

    def __init__(self, status: int, permanent: bool | None, text: str = "boom"):
        super().__init__(text)
        self.http_response = SimpleNamespace(status_code=status)
        self._error = SimpleNamespace(permanent=permanent)

    def get_api_error(self):
        return self._error


def test_retrying_repeats_transient_service_errors_and_raises_permanent_ones(monkeypatch):
    from aictl.kusto import connection as C

    monkeypatch.setattr(C, "RETRY_DELAYS_S", (0.0, 0.0, 0.0))
    monkeypatch.setattr(C.time, "sleep", lambda s: None)
    # The Windows start: streaming ingestion into a just-created table, 520 with @permanent false.
    attempts = iter([_ApiError(520, False, "RowStoreTrimmableStreamException"), _ApiError(520, False), "rows in"])
    assert C.retrying(lambda: (lambda a: (_ for _ in ()).throw(a) if isinstance(a, Exception) else a)(next(attempts)), "ingestion") == "rows in"
    # A 5xx without a verdict on permanence is retried; a permanent one and a 4xx are not.
    assert C._transient(_ApiError(500, None)) is True
    assert C._transient(_ApiError(520, True)) is False
    assert C._transient(_ApiError(400, None)) is False
    assert C._transient(_ApiError(429, True)) is True  # throttling always is
    calls = []

    def permanent():
        calls.append(1)
        raise _ApiError(400, True, "Syntax error")

    with pytest.raises(_ApiError):
        C.retrying(permanent, "command")
    assert len(calls) == 1
    # After the delays run out the failure is raised, not swallowed.
    with pytest.raises(_ApiError):
        C.retrying(lambda: (_ for _ in ()).throw(_ApiError(520, False)), "ingestion")


def test_streaming_into_a_table_the_node_has_not_seen_yet_is_repeated(monkeypatch, caplog):
    from aictl.kusto import connection as C
    from aictl.kusto.ingest import StreamingIngester

    monkeypatch.setattr(C, "RETRY_DELAYS_S", (0.0, 0.0, 0.0))
    monkeypatch.setattr(C.time, "sleep", lambda s: None)
    not_found = "BadRequest_EntityNotFound: Entity ID 'sessions' of kind 'Table' was not found."
    answers = iter([_ApiError(400, True, not_found), _ApiError(400, True, not_found), None])
    sent: list[bytes] = []

    class Client:
        def ingest_from_stream(self, stream, ingestion_properties):
            sent.append(stream.read())
            answer = next(answers)
            if answer is not None:
                raise answer

    ingester = StreamingIngester(KustoSettings("https://c.kusto.windows.net", "aictl"), ingest_client=Client())
    with caplog.at_level("WARNING", logger="aictl.kusto.connection"):
        ingester.ingest("sessions", [{"session_id": "s1"}])
    # The same rows three times, and the first refusal is in the log.
    assert len(sent) == 3 and len(set(sent)) == 1
    assert sum("BadRequest_EntityNotFound" in r.getMessage() for r in caplog.records) == 1
    # A query or a command that names a missing table is a real error: not repeated.
    calls = []

    def missing():
        calls.append(1)
        raise _ApiError(400, True, not_found)

    with pytest.raises(_ApiError):
        C.retrying(missing, "query")
    assert len(calls) == 1
    # Any other refusal of the rows is raised at once.
    refused = iter([_ApiError(400, True, "BadRequest_InvalidBlob")])

    class Refusing:
        def ingest_from_stream(self, stream, ingestion_properties):
            raise next(refused)

    with pytest.raises(_ApiError):
        StreamingIngester(KustoSettings("https://c.kusto.windows.net", "aictl"), ingest_client=Refusing()).ingest(
            "sessions", [{"session_id": "s1"}]
        )


def _schema_client(have_rows, clear_answers):
    """A client whose database has *have_rows* and whose cache-clear command answers from *clear_answers*."""

    def on_mgmt(cmd):
        if cmd.startswith(".show database schema"):
            return response([("TableName", "string"), ("ColumnName", "string")], have_rows)
        if cmd.startswith(".clear database cache streamingingestion schema"):
            answer = next(clear_answers)
            if isinstance(answer, Exception):
                raise answer
            return response([("NodeId", "string"), ("Status", "string")], answer)
        return response([], [])

    return FakeClient(on_mgmt=on_mgmt)


def _streaming_conn(client):
    settings = KustoSettings("https://c.kusto.windows.net", "aictl")
    return KustoConnection(settings, client, FakeIngester(), translator=StubTranslator(), tables=TABLES)


def _complete_schema():
    return [[name, col] for name, table in TABLES.items() for col in [c.name for c in table.columns] + [ROWID, VERSION, DELETED]]


def test_new_tables_clear_the_streaming_schema_cache_until_every_node_succeeds(monkeypatch):
    monkeypatch.setattr(KustoConnection, "_schema_done", set())
    clear = ".clear database cache streamingingestion schema"
    client = _schema_client([], iter([[["N0", "Succeeded"], ["N1", "Failed"]], [["N0", "Succeeded"], ["N1", "Succeeded"]]]))
    _streaming_conn(client).ensure_schema()
    assert client.commands.count(clear) == 2
    # The clear comes after every table is created and the policy is set.
    first_clear = client.commands.index(clear)
    assert all(i < first_clear for i, c in enumerate(client.commands) if c.startswith((".create-merge table", ".alter database")))
    assert sum(c.startswith(".create-merge table") for c in client.commands) > len(TABLES)


def test_an_unchanged_schema_leaves_the_streaming_cache_alone(monkeypatch):
    monkeypatch.setattr(KustoConnection, "_schema_done", set())
    client = _schema_client(_complete_schema(), iter([]))
    _streaming_conn(client).ensure_schema()
    assert not [c for c in client.commands if c.startswith(".clear")]
    assert not [c for c in client.commands if c.startswith(".create-merge table ['sessions']")]


def test_a_widened_table_clears_the_cache_and_a_refused_clear_does_not_stop_the_start(monkeypatch, caplog):
    monkeypatch.setattr(KustoConnection, "_schema_done", set())
    have = [r for r in _complete_schema() if r != ["maintenance_state", "text"]]
    client = _schema_client(have, iter([RuntimeError("Principal is not authorized")]))
    with caplog.at_level("WARNING", logger="aictl.kusto.connection"):
        _streaming_conn(client).ensure_schema()
    assert [c for c in client.commands if c.startswith(".create-merge table ['maintenance_state']")]
    assert not [c for c in client.commands if c.startswith(".create-merge table ['sessions']")]
    assert any("not cleared" in r.getMessage() and "not authorized" in r.getMessage() for r in caplog.records)


def test_ingest_endpoint_url_is_turned_into_the_engine_url():
    assert engine_url("https://ingest-zdev3.swedencentral.dev.kusto.windows.net") == "https://zdev3.swedencentral.dev.kusto.windows.net"
    assert engine_url("https://zdev3.swedencentral.dev.kusto.windows.net/") == "https://zdev3.swedencentral.dev.kusto.windows.net/"
    assert engine_url("http://localhost:8080") == "http://localhost:8080"
    settings = KustoSettings.from_values("ingest-aictlzvif358.westeurope.kusto.windows.net/", "aictl")
    assert settings is not None
    assert settings.cluster == "https://aictlzvif358.westeurope.kusto.windows.net"
    assert settings.uri == "kusto://aictlzvif358.westeurope.kusto.windows.net/aictl"
    assert settings.streaming is True


def test_ingest_failure_is_a_store_error():
    conn, _, ing = make({"s": Insert("sessions", [session_row("a")])})

    def fail(table, rows):
        raise RuntimeError("503 from cluster")

    ing.ingest = fail  # type: ignore[method-assign]
    conn.execute("s")
    with pytest.raises(KustoStoreError, match="503"):
        conn.commit()


STREAMED = KustoSettings("https://c.kusto.windows.net", "aictl")


def _three_tables(ingester, settings=STREAMED):
    ev = row_defaults(TABLES["events"]) | {"ts": 1.0, "tool": "t", "kind": "k"}
    metric = row_defaults(TABLES["metrics"]) | {"ts": 1.0, "metric": "m", "value": 1.0}
    mapping = {"s": Insert("sessions", [session_row("a")]), "e": Insert("events", [ev]), "m": Insert("metrics", [metric])}
    conn = KustoConnection(settings, FakeClient(), ingester, translator=StubTranslator(mapping), tables=TABLES)
    for sql in mapping:
        conn.execute(sql)
    return conn


def test_a_flush_sends_its_streamed_tables_at_the_same_time():
    together = threading.Barrier(3, timeout=10)  # passes only when three sends are under way at once
    ing = FakeIngester()
    record = ing.ingest

    def ingest(table, rows):
        together.wait()
        record(table, rows)

    ing.ingest = ingest  # type: ignore[method-assign]
    conn = _three_tables(ing)
    conn.commit()
    assert sorted(t for t, _ in ing.calls) == ["events", "metrics", "sessions"]
    assert not conn.in_transaction


def test_inline_tables_are_sent_one_after_another():
    busy = threading.Lock()
    ing = FakeIngester()
    record = ing.ingest

    def ingest(table, rows):
        assert busy.acquire(blocking=False), "two inline commands at once"
        try:
            record(table, rows)
        finally:
            busy.release()

    ing.ingest = ingest  # type: ignore[method-assign]
    conn = _three_tables(ing, SETTINGS)
    conn.commit()
    assert [t for t, _ in ing.calls] == ["sessions", "events", "metrics"]


def test_a_table_that_fails_in_a_flush_keeps_its_rows_and_the_others_are_sent():
    ing = FakeIngester()
    record = ing.ingest
    refuse = {"events"}

    def ingest(table, rows):
        if table in refuse:
            raise RuntimeError("503 from cluster")
        record(table, rows)

    ing.ingest = ingest  # type: ignore[method-assign]
    conn = _three_tables(ing)
    with pytest.raises(KustoStoreError, match="(?s)ingestion into events failed.*503"):
        conn.commit()
    assert sorted(t for t, _ in ing.calls) == ["metrics", "sessions"]
    assert conn.in_transaction
    refuse.clear()
    conn.commit()
    assert [(t, len(r)) for t, r in ing.calls[2:]] == [("events", 1)]
    assert not conn.in_transaction


def test_half_a_surrogate_pair_is_written_as_the_replacement_character():
    # Kusto stores a lone surrogate as U+0000 and says nothing.
    row = {"cut": "ab\ud83d", "low": "\ude00x", "two": "\ud83d\ud83d", "whole": "a😀b", "plain": "\\ud83d \\\\ud83d"}
    line = json_line(row)
    assert line.isascii()
    assert json.loads(line) == {
        "cut": "ab\ufffd",
        "low": "\ufffdx",
        "two": "\ufffd\ufffd",
        "whole": "a😀b",
        "plain": "\\ud83d \\\\ud83d",
    }
    assert json_line({"a": "no such text"}) == '{"a":"no such text"}'


def test_noop_begin_trace_and_interrupt():
    traced: list[str] = []
    conn, client, _ = make({"BEGIN": Noop("tx"), "COMMIT": Noop("tx")})
    conn.set_trace_callback(traced.append)
    cur = conn.execute("BEGIN")
    assert cur.rowcount == 0 and cur.fetchall() == [] and cur.description is None
    conn.execute("COMMIT")
    conn.interrupt()
    assert traced == ["BEGIN", "COMMIT"] and client.queries == []


def test_executescript_turns_create_table_into_ensure_schema(monkeypatch):
    monkeypatch.setattr(KustoConnection, "_schema_done", set())
    conn, client, _ = make()
    script = """
    -- the store
    CREATE TABLE IF NOT EXISTS a (x TEXT);
    CREATE INDEX IF NOT EXISTS ia ON a(x);
    CREATE TRIGGER t AFTER INSERT ON a BEGIN SELECT 1; SELECT 2; END;
    """
    conn.executescript(script)
    assert any(c.startswith(".create-merge table ['sessions']") for c in client.commands)
    n = len(client.commands)
    conn.executescript("CREATE TABLE b (y INT);")
    assert len(client.commands) == n  # once per process per database
    sent = conn.translator.scripts[0]
    assert "CREATE TABLE" not in sent and "CREATE INDEX" in sent and "SELECT 2; END" in sent


def test_split_script_keeps_trigger_bodies_and_strings():
    parts = split_script(
        "CREATE TABLE a (x TEXT DEFAULT ';');\nCREATE TRIGGER t AFTER INSERT ON a BEGIN SELECT 1; END;\n-- tail"
    )
    assert len(parts) == 2 and "';'" in parts[0] and "END" in parts[1]
    assert is_create_table("/* c */ -- x\n  create temp table z (a)") and not is_create_table("CREATE INDEX i ON a(x)")


def test_command_returns_rows_and_wraps_errors():
    def on_mgmt(cmd):
        if "bad" in cmd:
            raise RuntimeError("Syntax error")
        return response([("PolicyName", "string")], [["RetentionPolicy"]])

    conn, client, _ = make(client=FakeClient(on_mgmt=on_mgmt))
    assert conn.command(".show database ['aictl'] policy retention") == [("RetentionPolicy",)]
    with pytest.raises(KustoStoreError, match="Syntax error") as info:
        conn.command(".bad")
    assert info.value.kql == ".bad"


def test_coerce_and_literals_follow_sqlite_affinity():
    assert coerce(True, "long") == 1 and coerce(5, "string") == "5" and coerce(2, "real") == 2.0
    assert coerce("7", "long") == 7 and coerce(b"hi", "string") == "hi" and coerce(3.0, "long") == 3
    assert kql_literal(None, "long") == "long(null)" and kql_literal(None, "string") == '""'
    assert kql_literal(5, "long") == "long(5)" and kql_literal(1.5, "real") == "real(1.5)"
    assert kql_literal('a"b\n', "string") == '"a\\"b\\n"'
    assert kql_literal(float("nan"), "real") == "real(nan)"


def test_inline_ingest_keeps_rows_on_their_lines_and_under_the_size_limit():
    client = FakeClient()
    rows = [{"text": f'line\none\r\n\x00 {i} "q" é', "n": i, "f": float("inf"), "ok": True} for i in range(300)]
    ing = InlineIngester(client, "aictl", max_bytes=4000)
    ing.ingest("session_prompts", rows)
    assert len(client.commands) > 1
    back = []
    for cmd in client.commands:
        assert len(cmd.encode()) <= 4000
        head, _, body = cmd.partition("<|\n")
        assert head == ".ingest inline into table ['session_prompts'] with (format=\"multijson\") "
        back += [json.loads(line) for line in body.split("\n")]
    assert back[7]["text"] == rows[7]["text"] and back[7]["f"] is None and len(back) == 300
    assert "\n" not in json_line({"a": "x\ny"})


def test_ingester_choice_and_connection_strings():
    assert isinstance(make_ingester(SETTINGS, FakeClient()), InlineIngester)
    for mode in ("none", "azcli", "device", "managed-identity"):
        # The SDK takes no authentication only over plain http, as the emulator serves.
        scheme = "http" if mode == "none" else "https"
        kcsb = connection_string(KustoSettings(f"{scheme}://c.kusto.windows.net", "db", auth=mode))
        assert "c.kusto.windows.net" in str(kcsb.data_source)
    with pytest.raises(ValueError):
        connection_string(KustoSettings("https://c", "db", auth="bogus"))


@pytest.mark.parametrize(
    ("cluster", "mode", "expected"),
    [
        ("https://c.kusto.windows.net", "auto", "streaming"),
        ("https://c.kusto.windows.net", "streaming", "streaming"),
        ("https://c.kusto.windows.net", "inline", "inline"),
        ("http://localhost:8080", "auto", "inline"),
        ("http://localhost:8080", "inline", "inline"),
    ],
)
def test_global_ingestion_default(cluster, mode, expected):
    settings = KustoSettings.from_values(cluster, ingestion=mode)
    assert settings is not None
    assert settings.ingestion_mode("path_defs") == expected


@pytest.mark.parametrize(
    "options",
    [{"ingestion": "streaming"}, {"table_ingestion": {"events": "streaming"}}],
)
def test_local_cluster_rejects_explicit_streaming(options):
    with pytest.raises(ValueError, match="does not support streaming"):
        KustoSettings.from_values("http://localhost:8080", **options)


@pytest.mark.parametrize(
    "overrides",
    ["inline", ["path_defs"], {"path_defs": "queued"}, {"path_defs": "auto"}, {"": "inline"}, {"events": True}],
)
def test_invalid_table_ingestion_is_rejected(overrides):
    with pytest.raises(ValueError):
        KustoSettings.from_values("https://c.kusto.windows.net", table_ingestion=overrides)


@pytest.mark.parametrize("value", ["inline", "path_defs=", "=inline", "path_defs=inline,"])
def test_malformed_table_ingestion_environment_is_rejected(value):
    with pytest.raises(ValueError):
        parse_table_ingestion(value)


@pytest.fixture
def kusto_config(tmp_path, monkeypatch):
    from aictl import platforms

    path = tmp_path / "config.toml"
    monkeypatch.setattr(platforms, "config_path", lambda: path)
    for name in (CLUSTER_ENV, DATABASE_ENV, AUTH_ENV, INGESTION_ENV, TABLE_INGESTION_ENV):
        monkeypatch.setenv(name, "")
        monkeypatch.delenv(name)
    return path


def test_kusto_ingestion_config_and_environment_precedence(kusto_config, monkeypatch):
    from aictl.platforms import load_config, show_config

    kusto_config.write_text(
        '[storage]\nkusto_cluster = "https://c.kusto.windows.net"\nkusto_ingestion = "inline"\n'
        '[storage.kusto_table_ingestion]\npath_defs = "streaming"\nevents = "inline"\n',
        encoding="utf-8",
    )
    settings = kusto_settings()
    assert settings is not None
    assert settings.ingestion_mode("sessions") == "inline"
    assert settings.ingestion_mode("path_defs") == "streaming"
    monkeypatch.setenv(INGESTION_ENV, "streaming")
    monkeypatch.setenv(TABLE_INGESTION_ENV, "path_defs=inline,sessions=inline")
    settings = kusto_settings()
    assert settings is not None
    assert settings.ingestion_mode("processes") == "streaming"
    assert dict(settings.table_ingestion) == {"path_defs": "inline", "events": "inline", "sessions": "inline"}
    assert load_config().kusto_ingestion == "streaming"
    assert "kusto_ingestion = streaming" in show_config()
    monkeypatch.setenv(CLUSTER_ENV, "https://other.kusto.windows.net")
    settings = kusto_settings()
    assert settings is not None and settings.cluster == "https://other.kusto.windows.net"
    assert settings.table_ingestion["events"] == "inline"
    assert settings.table_ingestion["path_defs"] == "inline"
    env_settings = KustoSettings.from_env()
    assert env_settings is not None and env_settings.ingestion_mode("sessions") == "inline"


@pytest.mark.parametrize(
    "text",
    [
        '[storage]\nkusto_ingestion = "queued"\n',
        '[storage]\nkusto_table_ingestion = "inline"\n',
        '[storage.kusto_table_ingestion]\npath_defs = "queued"\n',
    ],
)
def test_bad_ingestion_config_does_not_fall_back_to_sqlite(kusto_config, text):
    kusto_config.write_text(text, encoding="utf-8")
    with pytest.raises(ValueError):
        kusto_settings()


def test_daemon_ingestion_cli_merges_and_exports_overrides(kusto_config, monkeypatch):
    from click.testing import CliRunner

    from aictl.commands import daemon

    kusto_config.write_text(
        '[storage]\nkusto_ingestion = "streaming"\n'
        '[storage.kusto_table_ingestion]\npath_defs = "streaming"\nsessions = "inline"\n',
        encoding="utf-8",
    )
    monkeypatch.setenv(INGESTION_ENV, "streaming")
    monkeypatch.setenv(TABLE_INGESTION_ENV, "events=inline,processes=inline")
    seen = []
    monkeypatch.setattr(daemon, "start_server", lambda *a, **kw: seen.append(kusto_settings()))
    monkeypatch.setattr(daemon.os, "_exit", lambda code: None)
    result = CliRunner().invoke(
        daemon.serve,
        [
            "--kusto-cluster",
            "https://c.kusto.windows.net",
            "--kusto-ingestion",
            "inline",
            "--kusto-table-ingestion",
            "path_defs=inline",
            "--kusto-table-ingestion",
            "events=inline",
            "--kusto-table-ingestion",
            "events=streaming",
            "--no-open",
        ],
    )
    assert result.exit_code == 0, result.output
    assert len(seen) == 1
    settings = seen[0]
    assert settings is not None and settings.ingestion_mode("requests") == "inline"
    assert dict(settings.table_ingestion) == {
        "path_defs": "inline",
        "sessions": "inline",
        "events": "streaming",
        "processes": "inline",
    }
    assert parse_table_ingestion(daemon.os.environ[TABLE_INGESTION_ENV])["events"] == "streaming"
    assert daemon.os.environ[INGESTION_ENV] == "inline"


@pytest.mark.parametrize(
    "args",
    [
        ["--kusto-ingestion", "queued"],
        ["--kusto-table-ingestion", "path_defs"],
        ["--kusto-table-ingestion", "path_defs=queued"],
        ["--kusto-cluster", "http://localhost:8080", "--kusto-ingestion", "streaming"],
    ],
)
def test_daemon_rejects_invalid_ingestion_before_start(kusto_config, monkeypatch, args):
    from click.testing import CliRunner

    from aictl.commands import daemon

    monkeypatch.setattr(daemon, "start_server", lambda *a, **kw: pytest.fail("must not start"))
    monkeypatch.setattr(daemon.os, "_exit", lambda code: pytest.fail("must not exit"))
    result = CliRunner().invoke(daemon.serve, args)
    assert result.exit_code == 2, result.output
    assert "Error" in result.output


@pytest.mark.parametrize(
    ("default", "overrides"),
    [("streaming", {"path_defs": "inline"}), ("inline", {"events": "streaming"})],
)
def test_ingestion_routes_tables_without_changing_payloads(default, overrides):
    settings = KustoSettings.from_values("https://c.kusto.windows.net", ingestion=default, table_ingestion=overrides)
    assert settings is not None
    client, streaming = FakeClient(), FakeStreamingClient()
    ingester = make_ingester(settings, client, streaming)
    rows = [{"text": 'a\n"b"', "n": 3, "_deleted": False}]
    ingester.ingest("path_defs", rows)
    ingester.ingest("events", rows)
    assert len(client.commands) == 1 and len(streaming.calls) == 1
    command = client.commands[0]
    assert command.startswith(".ingest inline into table ['path_defs']")
    assert json.loads(command.partition("<|\n")[2]) == rows[0]
    assert streaming.calls[0][0] == "events"
    assert json.loads(streaming.calls[0][1]) == rows[0]


def test_inline_default_does_not_create_a_streaming_client(monkeypatch):
    import azure.kusto.ingest

    monkeypatch.setattr(
        azure.kusto.ingest, "KustoStreamingIngestClient", lambda *a: pytest.fail("must not use streaming")
    )
    settings = KustoSettings.from_values("https://c.kusto.windows.net", ingestion="inline")
    assert settings is not None
    client = FakeClient()
    make_ingester(settings, client).ingest("path_defs", [{"path": "x"}])
    assert len(client.commands) == 1


def test_mixed_ingestion_flushes_both_backends_before_read():
    settings = KustoSettings("https://c.kusto.windows.net", table_ingestion={"events": "inline"})
    order = []
    client = FakeClient(
        on_mgmt=lambda command: order.append("inline") or response([], []),
        on_query=lambda query: order.append("query") or response([], []),
    )
    streaming = SimpleNamespace(ingest_from_stream=lambda *a: order.append("streaming"))
    conn = KustoConnection(
        settings,
        client,
        make_ingester(settings, client, streaming),
        translator=StubTranslator(
            {
                "e": Insert("events", [row_defaults(TABLES["events"])]),
                "s": Insert("sessions", [session_row("a")]),
                "q": Query("T"),
            }
        ),
        tables=TABLES,
    )
    conn.execute("e")
    conn.execute("s")
    conn.execute("q")
    assert order == ["inline", "streaming", "query"]
    assert not conn.in_transaction


def test_inline_ingestion_retries_transient_errors_and_preserves_failed_rows(monkeypatch):
    from aictl.kusto import connection as C

    monkeypatch.setattr(C, "RETRY_DELAYS_S", (0.0,))
    monkeypatch.setattr(C.time, "sleep", lambda delay: None)
    outcomes = iter([_ApiError(503, False), response([], [])])

    def on_mgmt(command):
        outcome = next(outcomes)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    client = FakeClient(on_mgmt=on_mgmt)
    ingester = make_ingester(SETTINGS, client)
    ingester.ingest("sessions", [session_row("a")])
    assert len(client.commands) == 2 and client.commands[0] == client.commands[1]

    def fail(command):
        raise _ApiError(400, True, "inline rejected")

    client.on_mgmt = fail
    conn = KustoConnection(
        SETTINGS,
        client,
        ingester,
        translator=StubTranslator({"s": Insert("sessions", [session_row("b")])}),
        tables=TABLES,
    )
    conn.execute("s")
    with pytest.raises(KustoStoreError, match="inline rejected"):
        conn.commit()
    assert conn.in_transaction
    assert len(client.commands) == 3


def test_ingester_cache_distinguishes_defaults_and_table_overrides(monkeypatch):
    streaming = KustoSettings("https://c.kusto.windows.net")
    inline = KustoSettings(streaming.cluster, streaming=False)
    mixed = KustoSettings(streaming.cluster, streaming=False, table_ingestion={"events": "streaming"})
    client = FakeClient()
    monkeypatch.setattr(KustoClientFactory, "_clients", {KustoClientFactory.key(streaming): client})
    monkeypatch.setattr(KustoClientFactory, "_ingesters", {})
    assert isinstance(KustoClientFactory.ingester(streaming), StreamingIngester)
    assert isinstance(KustoClientFactory.ingester(inline), InlineIngester)
    mixed_ingester = KustoClientFactory.ingester(mixed)
    assert mixed_ingester is not KustoClientFactory.ingester(inline)
    assert KustoClientFactory.ingester(mixed) is mixed_ingester
    assert KustoClientFactory.client(mixed) is client


def test_inline_only_schema_skips_streaming_until_an_override_needs_it(monkeypatch):
    monkeypatch.setattr(KustoConnection, "_schema_done", set())
    inline = KustoSettings("https://c.kusto.windows.net", streaming=False)
    client = FakeClient()
    connect(inline, client=client, ingester=FakeIngester(), tables=TABLES)
    assert not any("streamingingestion" in command for command in client.commands)
    mixed = KustoSettings(inline.cluster, streaming=False, table_ingestion={"events": "streaming"})
    connect(mixed, client=client, ingester=FakeIngester(), tables=TABLES)
    assert sum("policy streamingingestion enable" in command for command in client.commands) == 1
    n = len(client.commands)
    connect(mixed, client=client, ingester=FakeIngester(), tables=TABLES)
    assert len(client.commands) == n


def test_unknown_override_table_is_rejected_before_creating_clients(monkeypatch):
    monkeypatch.setattr(KustoClientFactory, "client", lambda *a: pytest.fail("must validate first"))
    settings = KustoSettings("https://c.kusto.windows.net", table_ingestion={"path_def": "inline"})
    with pytest.raises(ValueError, match="Unknown.*path_def"):
        connect(settings, tables=TABLES)


def test_connect_runs_schema_creation_once(monkeypatch):
    monkeypatch.setattr(KustoConnection, "_schema_done", set())
    client = FakeClient()
    connect(SETTINGS, translator=StubTranslator(), tables=TABLES, client=client)
    n = len(client.commands)
    # One schema listing, a create per table (the fake database has none), the information schema's two.
    assert n == len(TABLES) + 3
    connect(SETTINGS, translator=StubTranslator(), tables=TABLES, client=client)
    assert len(client.commands) == n


EMULATOR = KustoSettings("http://localhost:8080", "aictl", streaming=False)


def _emulator_up() -> bool:
    try:
        urllib.request.urlopen("http://localhost:8080/", timeout=2)
    except urllib.error.HTTPError:
        return True
    except Exception:  # noqa: BLE001 - anything else means no emulator
        return False
    return True


emulator = pytest.mark.skipif(not _emulator_up(), reason="Kusto emulator not running on localhost:8080")


@pytest.fixture
def live():
    tag = "kct-" + uuid.uuid4().hex[:10]
    tr = StubTranslator()
    conn = connect(EMULATOR, translator=tr)
    yield conn, tr, tag
    # Tombstone every row this test wrote; the shared tables themselves stay.
    for name, col in (
        ("sessions", "session_id"),
        ("events", "session_id"),
        ("processes", "tool"),
        ("requests", "session_id"),
    ):
        t = TABLES[name]
        tr.mapping["del"] = Mutation(
            name,
            f"{current(t)} | where {col} startswith '{tag}' | extend ['_v'] = now(), ['_deleted'] = true",
            "delete",
        )
        conn.execute("del")


def _read(conn, tr, kql, columns=None):
    tr.mapping["read"] = Query(kql, columns)
    return conn.execute("read").fetchall()


@emulator
def test_emulator_insert_read_update_delete(live):
    conn, tr, tag = live
    S, E = TABLES["sessions"], TABLES["events"]
    tr.mapping["ins"] = Insert("sessions", [session_row(f"{tag}-a", tool="claude", model='x\ny "q"', started_at=1.5)])
    conn.execute("ins")
    tr.mapping["ev"] = lambda p: Insert(
        "events", [row_defaults(E) | {"ts": p[0], "tool": "t", "kind": "k", "session_id": tag, "seq": p[0]}]
    )
    conn.executemany("ev", [(1,), (2,), (3,)])
    conn.commit()
    rows = _read(conn, tr, f"{current(S)} | where session_id == '{tag}-a' | project session_id, model, started_at")
    assert rows == [(f"{tag}-a", 'x\ny "q"', 1.5)]
    assert _read(conn, tr, f"{current(E)} | where session_id == '{tag}' | order by seq asc | project seq") == [
        (1,),
        (2,),
        (3,),
    ]

    tr.mapping["upd"] = Mutation(
        "sessions",
        f"{current(S)} | where session_id == '{tag}-a' | extend model = 'updated', ['_v'] = now(), ['_deleted'] = false",
    )
    assert conn.execute("upd").rowcount == 1
    assert _read(conn, tr, f"{current(S)} | where session_id == '{tag}-a' | project model") == [("updated",)]

    tr.mapping["del"] = Mutation(
        "events",
        f"{current(E)} | where session_id == '{tag}' and seq == 2 | extend ['_v'] = now(), ['_deleted'] = true",
        "delete",
    )
    assert conn.execute("del").rowcount == 1
    assert _read(conn, tr, f"{current(E)} | where session_id == '{tag}' | order by seq asc | project seq") == [
        (1,),
        (3,),
    ]
    tr.mapping["none"] = Mutation(
        "events",
        f"{current(E)} | where session_id == '{tag}-nothing' | extend ['_v'] = now(), ['_deleted'] = false",
        "update",
    )
    assert conn.execute("none").rowcount == 0


@emulator
def test_emulator_insert_or_ignore_and_do_update(live):
    conn, tr, tag = live
    S = TABLES["sessions"]
    tr.mapping["ins"] = Insert("sessions", [session_row(f"{tag}-a", model="first", started_at=5.0)])
    conn.execute("ins")
    conn.commit()
    tr.mapping["ign"] = Insert(
        "sessions", [session_row(f"{tag}-a", model="ignored"), session_row(f"{tag}-b", model="b")], "ignore"
    )
    assert conn.execute("ign").rowcount == 1
    conn.commit()
    read = f"{current(S)} | where session_id startswith '{tag}' | order by session_id asc | project session_id, model, started_at"
    assert _read(conn, tr, read) == [(f"{tag}-a", "first", 5.0), (f"{tag}-b", "b", 0.0)]

    tr.mapping["up"] = Insert(
        "sessions",
        [session_row(f"{tag}-a", model="second", started_at=9.0), session_row(f"{tag}-c", model="c")],
        "update",
        update_columns=("model",),
    )
    assert conn.execute("up").rowcount == 2
    conn.commit()
    assert _read(conn, tr, read) == [(f"{tag}-a", "second", 5.0), (f"{tag}-b", "b", 0.0), (f"{tag}-c", "c", 0.0)]

    guarded = "['__new_started_at'] > ['started_at']"
    tr.mapping["g"] = lambda p: Insert(
        "sessions", [session_row(f"{tag}-a", model=p[0], started_at=p[1])], "update", ("model",), guarded
    )
    conn.execute("g", ("older", 1.0))
    conn.execute("g", ("newer", 50.0))
    conn.commit()
    assert _read(conn, tr, read)[0] == (f"{tag}-a", "newer", 5.0)


@emulator
def test_emulator_rowid_alias_lastrowid_and_row_factory(live):
    conn, tr, tag = live
    P = TABLES["processes"]
    tr.mapping["p"] = Insert("processes", [row_defaults(P) | {"pid": 11, "tool": tag}])
    rid = conn.execute("p").lastrowid
    conn.commit()
    conn.row_factory = sqlite3.Row
    row = _read(conn, tr, f"{current(P)} | where tool == '{tag}' | project id, rowid, pid")[0]
    assert row["id"] == row["rowid"] == rid and row["pid"] == 11


@emulator
def test_emulator_unique_index_on_requests(live):
    conn, tr, tag = live
    R = TABLES["requests"]
    tr.mapping["i"] = lambda p: Insert(
        "requests", [request_row(f"{tag}-d1", model=p[0], input_tokens=p[1], session_id=tag)], p[2], ("input_tokens",)
    )
    first = conn.execute("i", ("first", 1, "fail")).lastrowid
    conn.commit()
    assert conn.execute("i", ("ignored", 2, "ignore")).rowcount == 0
    conn.commit()
    read = f"{current(R)} | where dedup_key == '{tag}-d1' | project id, rowid, model, input_tokens"
    assert _read(conn, tr, read) == [(first, first, "first", 1)]
    assert conn.execute("i", ("kept", 3, "update")).lastrowid == first
    conn.commit()
    assert _read(conn, tr, read) == [(first, first, "first", 3)]
    assert conn.execute("i", ("replaced", 4, "replace")).lastrowid == first
    conn.commit()
    assert _read(conn, tr, read) == [(first, first, "replaced", 4)]


def test_inline_commands_wait_for_one_of_the_clusters_ingestion_slots():
    """A development cluster runs one ingestion at a time and refuses the rest with 429.

    On the Azure test cluster six writer threads were refused 77 times in 140 seconds
    and one commit failed after seven refusals in a row.
    """
    free_during: list[bool] = []

    def on_mgmt(command):
        got = ing.slots.acquire(blocking=False)
        free_during.append(got)
        if got:
            ing.slots.release()
        return response([], [])

    client = FakeClient(on_mgmt=on_mgmt)
    ing = InlineIngester(client, "aictl", max_bytes=4000, slots=1)
    ing.ingest("path_defs", [{"path": "x" * 3000}, {"path": "y" * 3000}])
    assert len(client.commands) == 2 and free_during == [False, False]
    # Given back after each command, also after one that failed for good.
    client.on_mgmt = lambda command: (_ for _ in ()).throw(_ApiError(400, True, "rejected"))
    with pytest.raises(_ApiError):
        ing.ingest("path_defs", [{"path": "z"}])
    assert ing.slots.acquire(blocking=False)
    ing.slots.release()

    free_during.clear()
    client.on_mgmt = on_mgmt
    ing = InlineIngester(client, "aictl", slots=2)
    ing.ingest("path_defs", [{"path": "x"}])
    assert free_during == [True]
    assert InlineIngester(client, "aictl").slots is None and make_ingester(SETTINGS, client).slots is None


def test_the_ingestion_capacity_is_read_once_for_a_destination_that_ingests_inline(monkeypatch):
    def on_mgmt(command):
        assert command == ".show capacity ingestions"
        return response([("Resource", "string"), ("Total", "long")], [{"Resource": "Ingestions", "Total": 1}])

    client = FakeClient(on_mgmt=on_mgmt)
    assert ingestion_capacity(client, "aictl") == 1
    assert ingestion_capacity(FakeClient(on_mgmt=lambda c: (_ for _ in ()).throw(_ApiError(403, True))), "aictl") is None
    assert ingestion_capacity(FakeClient(), "aictl") is None  # an answer without the row

    streamed = KustoSettings("https://c.kusto.windows.net", "aictl")
    mixed = KustoSettings("https://c.kusto.windows.net", "aictl", table_ingestion={"path_defs": "inline"})
    assert uses_inline(SETTINGS) and uses_inline(mixed) and not uses_inline(streamed)

    client.commands.clear()
    monkeypatch.setattr(KustoClientFactory, "_clients", {KustoClientFactory.key(SETTINGS): client})
    monkeypatch.setattr(KustoClientFactory, "_ingesters", {})
    ingester = KustoClientFactory.ingester(SETTINGS)
    assert KustoClientFactory.ingester(SETTINGS) is ingester and client.commands == [".show capacity ingestions"]
    assert ingester.slots.acquire(blocking=False) and not ingester.slots.acquire(blocking=False)


@emulator
def test_emulator_hook_calls_store_once_per_call_and_trim():
    """The store's own statements for hook_calls, through the real translator: a retried call is one row,
    and the text trim reaches the payload, which has no trigger on a cluster."""
    from aictl.storage import HistoryDB, HookCallRow

    tag = "kct-" + uuid.uuid4().hex[:10]
    db = HistoryDB(kusto=EMULATOR, flush_interval=0)
    try:
        for _ in range(2):
            db.append_hook_call(
                HookCallRow(
                    call_id=tag, ts=100.0, received_at=101.0, session_id=tag, payload={"prompt": "secret", "n": 1},
                    wrapped=1, command="guard.sh", exit_code=2,
                )
            )
        read = "SELECT call_id, payload, command, exit_code, wrapped FROM hook_calls WHERE session_id = ?"
        rows = db._conn().execute(read, (tag,)).fetchall()
        assert [tuple(r) for r in rows] == [(tag, '{"prompt": "secret", "n": 1}', "guard.sh", 2, 1)]
        assert db.trim_text(before=200.0, since=50.0) >= 1
        rows = db._conn().execute(read, (tag,)).fetchall()
        assert [tuple(r) for r in rows] == [(tag, '{"prompt_chars": 6, "n": 1}', "", 2, 1)]
    finally:
        db._conn().execute("DELETE FROM hook_calls WHERE session_id = ?", (tag,))
        db._conn().commit()
        db.close()
