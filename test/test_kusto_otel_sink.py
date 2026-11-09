"""The background writer of the OTel tables (aictl.kusto.otel_sink), against fakes."""

from __future__ import annotations

import json
import threading

import pytest

from aictl.kusto import KustoSettings, connection, otel, otel_sink
from aictl.kusto.otel_sink import OtelSink

T1 = 1_700_000_012_123_456_700


def logs(*bodies: str, session: str = "s1") -> dict:
    return {
        "resourceLogs": [
            {
                "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "claude-code"}}]},
                "scopeLogs": [
                    {
                        "logRecords": [
                            {
                                "timeUnixNano": str(T1 + i),
                                "body": {"stringValue": body},
                                "attributes": [{"key": "session.id", "value": {"stringValue": session}}],
                            }
                            for i, body in enumerate(bodies)
                        ]
                    }
                ],
            }
        ]
    }


SPANS = {
    "resourceSpans": [
        {
            "scopeSpans": [
                {
                    "spans": [
                        {
                            "traceId": "5b8efff798038103d269b633813fc60c",
                            "spanId": "eee19b7ec3c1b174",
                            "name": "turn",
                            "startTimeUnixNano": str(T1),
                            "endTimeUnixNano": str(T1 + 5_000_000),
                        }
                    ]
                }
            ]
        }
    ]
}


class Refused(Exception):
    """What the SDK raises for an HTTP error, as far as the sink looks at it."""

    def __init__(self, status: int, text: str = "refused"):
        super().__init__(text)
        self.http_response = type("Response", (), {"status_code": status})()


class Column:
    def __init__(self, name: str):
        self.column_name = name


class Client:
    """Answers the schema read from *tables* and records every management command."""

    def __init__(self, tables: dict[str, list[str]] | None = None):
        self.tables = tables or {}
        self.commands: list[str] = []

    def execute_mgmt(self, database: str, command: str):
        self.commands.append(command)
        rows = []
        if command.startswith(".show database schema"):
            rows = [(t, c) for t, columns in self.tables.items() for c in columns]
        elif command.startswith(".create-merge table "):
            name = command.split()[2]
            self.tables[name] = [c.name for c in otel.TABLES_BY_NAME[name].columns]
        primary = type(
            "Table", (), {"columns": [Column("TableName"), Column("ColumnName")], "__iter__": lambda _: iter(rows)}
        )()
        return type("Response", (), {"primary_results": [primary]})()


class Ingester:
    """Records each request; *fail* may raise for one."""

    def __init__(self, fail=None):
        self.requests: list[tuple[str, list[dict]]] = []
        self.fail = fail
        self.lock = threading.Lock()

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        rows = [json.loads(line) for line in lines]
        if self.fail is not None:
            self.fail(table, rows)
        with self.lock:
            self.requests.append((table, rows))

    def rows(self, table: str) -> list[dict]:
        return [row for name, rows in self.requests if name == table for row in rows]


def settings(**kw) -> KustoSettings:
    return KustoSettings(cluster="https://c.westeurope.kusto.windows.net", database="db", **kw)


@pytest.fixture
def no_waiting(monkeypatch):
    """Retries wait on a condition, never on the clock."""
    monkeypatch.setattr(otel_sink, "RETRY_WAIT_S", (0.0,))
    monkeypatch.setattr(connection, "RETRY_DELAYS_S", ())


def make(ingester=None, client=None, **kw) -> tuple[OtelSink, Ingester, Client]:
    ingester = ingester or Ingester()
    client = client or Client()
    return OtelSink(settings(), client=client, ingester=ingester, linger_s=0.0, **kw), ingester, client


def test_rows_of_a_request_reach_their_tables():
    sink, ingester, client = make()
    sink.submit("logs", logs("one", "two"))
    sink.submit("traces", SPANS)
    assert sink.flush(10)
    sink.close()
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["one", "two"]
    assert [r["SpanName"] for r in ingester.rows(otel.TRACES)] == ["turn"]
    assert {r["SessionId"] for r in ingester.rows(otel.LOGS)} == {"s1"}
    stats = sink.stats()
    assert stats["requests"] == 2
    assert stats["rows_queued"] == stats["rows_sent"] == 3
    assert stats["pending_rows"] == 0 and stats["pending_bytes"] == 0
    assert stats["tables"][otel.LOGS] == {"ingestion": "streaming", "rows_sent": 2, "rows_waiting": 0}


def test_tables_are_created_once_and_only_when_they_differ():
    whole = {t.name: [c.name for c in t.columns] for t in otel.TABLES}
    stale = dict(whole, **{otel.LOGS: whole[otel.LOGS][:-1]})
    del stale[otel.PAYLOADS]
    sink, ingester, client = make(client=Client(stale))
    sink.submit("logs", logs("one"))
    assert sink.flush(10)
    sink.submit("logs", logs("two"))
    assert sink.flush(10)
    sink.close()
    created = [c.split()[2] for c in client.commands if c.startswith(".create-merge table ")]
    assert sorted(created) == sorted([otel.LOGS, otel.PAYLOADS])
    assert sum(c.startswith(".show database schema") for c in client.commands) == 1
    # New tables that take streamed rows: the policy is on and every node reads the schema again.
    assert ".alter database ['db'] policy streamingingestion enable" in client.commands
    assert client.commands[-1] == ".clear database cache streamingingestion schema"
    # Nothing is streamed before the tables exist.
    assert len(ingester.rows(otel.LOGS)) == 2


def test_inline_tables_need_no_streaming_policy():
    ingester, client = Ingester(), Client()
    sink = OtelSink(settings(streaming=False), client=client, ingester=ingester, linger_s=0.0)
    sink.submit("logs", logs("one"))
    assert sink.flush(10)
    sink.close()
    assert not [c for c in client.commands if "streamingingestion" in c]
    assert sink.stats()["tables"][otel.LOGS]["ingestion"] == "inline"


def test_a_table_override_decides_how_the_table_is_written():
    sink = OtelSink(settings(table_ingestion={otel.LOGS: "inline"}), client=Client(), ingester=Ingester())
    tables = sink.stats()["tables"]
    assert tables[otel.LOGS]["ingestion"] == "inline"
    assert tables[otel.TRACES]["ingestion"] == "streaming"
    # One request per batch on either path.
    assert sink._batch_bytes(otel.LOGS) < otel_sink.INLINE_MAX_BYTES < sink._batch_bytes(otel.TRACES)


def test_rows_refused_for_now_are_kept_and_sent_again(no_waiting):
    failed = []

    def fail(table, rows):
        if len(failed) < 3:
            failed.append(len(rows))
            raise Refused(429, "throttled")

    sink, ingester, _ = make(Ingester(fail))
    sink.submit("logs", logs("one", "two"))
    assert sink.flush(10)
    sink.close()
    assert failed == [2, 2, 2]
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["one", "two"]
    stats = sink.stats()
    assert stats["rows_sent"] == 2 and stats["rows_rejected"] == 0
    assert stats["ingest_failures"] == 3
    assert stats["last_error"] == f"{otel.LOGS}: throttled"


def test_a_sign_in_failure_keeps_the_rows(no_waiting):
    calls = []

    def fail(table, rows):
        calls.append(len(rows))
        if len(calls) == 1:
            raise RuntimeError("az login required")

    sink, ingester, _ = make(Ingester(fail))
    sink.submit("logs", logs("one"))
    assert sink.flush(10)
    sink.close()
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["one"]
    assert sink.stats()["rows_rejected"] == 0


def test_only_the_row_refused_for_good_is_dropped(no_waiting, caplog):
    def fail(table, rows):
        if any(r["Body"] == "bad" for r in rows):
            raise Refused(400, "BadRequest_MalformedData: row too wide")

    sink, ingester, client = make(Ingester(fail))
    sink.submit("logs", logs("a", "b", "bad", "c", "d"))
    assert sink.flush(10)
    sink.close()
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["a", "b", "c", "d"]
    stats = sink.stats()
    assert stats["rows_sent"] == 4 and stats["rows_rejected"] == 1 and stats["pending_rows"] == 0
    # The tables were looked at again before anything was dropped.
    assert sum(c.startswith(".show database schema") for c in client.commands) == 2
    dropped = [r.getMessage() for r in caplog.records if "dropped" in r.getMessage()]
    assert len(dropped) == 1 and "bad" not in dropped[0].replace("BadRequest", "")


def test_a_table_that_went_missing_is_created_again(no_waiting):
    client = Client()
    state = {"dropped": False}

    def fail(table, rows):
        if state["dropped"] and table not in client.tables:
            raise Refused(400, "BadRequest_EntityNotFound: Table 'OTELLogs' could not be found")

    sink, ingester, _ = make(Ingester(fail), client)
    sink.submit("logs", logs("one"))
    assert sink.flush(10)
    del client.tables[otel.LOGS]
    state["dropped"] = True
    sink.submit("logs", logs("two"))
    assert sink.flush(10)
    sink.close()
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["one", "two"]
    assert sink.stats()["rows_rejected"] == 0
    assert sum(c.startswith(f".create-merge table {otel.LOGS} ") for c in client.commands) == 2


def test_a_setup_failure_drops_nothing(no_waiting):
    class Flaky(Client):
        def execute_mgmt(self, database, command):
            if not self.commands:
                self.commands.append(command)
                raise Refused(400, "Request is invalid: no permission to create tables")
            return super().execute_mgmt(database, command)

    sink, ingester, _ = make(client=Flaky())
    sink.submit("logs", logs("one", "two"))
    assert sink.flush(10)
    sink.close()
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["one", "two"]
    assert sink.stats()["rows_rejected"] == 0


def test_the_tables_are_written_in_parallel():
    both = threading.Barrier(2, timeout=10)

    def meet(table, rows):
        both.wait()  # passes only while the other table's request is in flight too

    sink, ingester, _ = make(Ingester(meet))
    big = "x" * (otel.SPILL_BYTES + 1)  # spills, so OTELPayloads gets rows in the same request
    sink.submit("logs", logs(big))
    assert sink.flush(10)
    sink.close()
    assert {name for name, _ in ingester.requests} == {otel.LOGS, otel.PAYLOADS}


def test_a_slow_cluster_never_blocks_the_request():
    release = threading.Event()
    started = threading.Event()

    def hold(table, rows):
        started.set()
        assert release.wait(10)

    sink, ingester, _ = make(Ingester(hold))
    sink.submit("logs", logs("one"))
    assert started.wait(10)
    for i in range(50):  # each returns while the first request is still held
        sink.submit("logs", logs(f"more {i}"))
    assert sink.stats()["pending_rows"] == 51
    release.set()
    assert sink.flush(10)
    sink.close()
    assert len(ingester.rows(otel.LOGS)) == 51
    # What gathered while the cluster was busy went out together.
    assert len(ingester.requests) == 2


def test_a_full_queue_drops_the_new_request_and_counts_it():
    release = threading.Event()
    started = threading.Event()

    def hold(table, rows):
        started.set()
        assert release.wait(10)

    sink, ingester, _ = make(Ingester(hold))
    sink.submit("logs", logs("a" * 1000))
    assert started.wait(10)
    sink.max_pending_bytes = sink.stats()["pending_bytes"]  # full: the row being sent still counts
    sink.submit("logs", logs("late", "later"))
    stats = sink.stats()
    assert stats["rows_dropped_queue_full"] == 2 and stats["pending_rows"] == 1
    release.set()
    assert sink.flush(10)
    sink.close()
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["a" * 1000]


def test_a_request_that_cannot_be_converted_is_counted_not_raised(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("converter bug")

    monkeypatch.setitem(otel_sink._CONVERTERS, "logs", boom)
    sink, ingester, _ = make()
    sink.submit("logs", logs("one"))
    sink.close()
    assert sink.stats()["convert_errors"] == 1 and not ingester.requests


def test_keep_text_false_stores_no_text():
    sink, ingester, _ = make(keep_text=False)
    big = "secret " * 10_000
    sink.submit("logs", logs(big))
    assert sink.flush(10)
    sink.close()
    assert "secret" not in json.dumps(ingester.requests)
    assert not ingester.rows(otel.PAYLOADS)


def test_close_sends_what_is_waiting():
    sink, ingester, _ = make()
    sink.linger_s = 3600.0  # nothing would be sent for an hour
    sink.submit("logs", logs("one"))
    sink.close(10)
    assert [r["Body"] for r in ingester.rows(otel.LOGS)] == ["one"]
    sink.submit("logs", logs("after close"))
    assert sink.stats()["pending_rows"] == 0


def test_an_otel_table_may_have_its_own_ingestion_mode():
    tables = connection._default_tables()

    class NoCluster:
        def execute_mgmt(self, *a):
            raise RuntimeError("no cluster")

        execute = execute_mgmt

    # The name is accepted, so the connection goes on to the cluster, which this one does not have.
    with pytest.raises(connection.KustoStoreError):
        connection.connect(settings(table_ingestion={otel.LOGS: "inline"}), tables=tables, client=NoCluster())
    with pytest.raises(ValueError, match="OTELLog"):
        connection.connect(settings(table_ingestion={"OTELLog": "inline"}), tables=tables, client=NoCluster())
