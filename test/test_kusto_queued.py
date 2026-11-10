"""Queued ingestion and its asynchronous visibility boundary, without a live cluster."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
import test_kusto_connection as connection_tests
from azure.kusto.data.data_format import DataFormat
from azure.kusto.ingest import ReportLevel
from azure.kusto.ingest.base_ingest_client import IngestionResult, IngestionStatus
from test_kusto_connection import (
    TABLES,
    FakeClient,
    FakeStreamingClient,
    StubTranslator,
    response,
    session_row,
)

from aictl.kusto import (
    CLUSTER_ENV,
    INGESTION_ENV,
    TABLE_INGESTION_ENV,
    KustoSettings,
    kusto_settings,
    otel,
)
from aictl.kusto import ingest as I
from aictl.kusto.connection import KustoClientFactory, KustoConnection, KustoStoreError, connection_string
from aictl.kusto.ingest import QueuedIngester, TableIngester, make_ingester
from aictl.kusto.statements import Insert, Mutation, Query

kusto_config = connection_tests.kusto_config

ENGINE = "https://example.swedencentral.dev.kusto.windows.net"
DM = "https://ingest-example.swedencentral.dev.kusto.windows.net"
VERSION = "2026-11-09T20:00:00.123456Z"


class QueueClient:
    def __init__(self):
        self.calls = []
        self.error = None

    def ingest_from_stream(self, descriptor, properties):
        self.calls.append((descriptor.source_id, descriptor.stream.read(), properties))
        if self.error:
            raise self.error
        return IngestionResult(IngestionStatus.QUEUED, properties.database, properties.table, descriptor.source_id)


def marked(rowid=1, **fields):
    return {"rowid": rowid, "_v": VERSION, "_deleted": False, **fields}


def missing(count):
    return response([("Count", "long")], [[count]])


@pytest.mark.parametrize("endpoint", [ENGINE, DM])
def test_query_and_queued_clients_use_separate_endpoints(endpoint, monkeypatch):
    import azure.kusto.ingest

    settings = KustoSettings.from_values(endpoint)
    assert settings is not None
    assert settings.cluster == ENGINE
    assert settings.ingestion_cluster == DM
    assert connection_string(settings).data_source == ENGINE
    seen = []
    queue = QueueClient()

    def make_queue(kcsb, auto_correct_endpoint):
        seen.append((kcsb.data_source, auto_correct_endpoint))
        return queue

    monkeypatch.setattr(azure.kusto.ingest, "QueuedIngestClient", make_queue)
    ingester = QueuedIngester(settings, FakeClient())
    ingester.ingest("events", [marked(text="one")])
    assert seen == [(DM, False)]
    assert queue.calls[0][2].database == "aictl"


def test_automatic_routing_queues_telemetry_and_keeps_state_tables_synchronous():
    settings = KustoSettings(DM)
    queue, client = QueueClient(), FakeClient()
    ingester = make_ingester(settings, client, queued_client=queue)
    ingester.ingest("path_defs", [marked(path_template="x")])
    ingester.ingest("sessions", [marked(session_id="s")])
    ingester.ingest("events", [marked(text="event")])
    ingester.ingest_lines(otel.LOGS, ['{"Body":"log","RowKey":"r"}'])
    assert len(client.commands) == 2
    assert [call[2].table for call in queue.calls] == ["events", otel.LOGS]
    assert not client.queries
    assert not any("streamingingestion" in command for command in client.commands)


def test_explicit_global_mode_and_table_overrides_can_select_all_three_backends():
    settings = KustoSettings(DM, ingestion="queued", table_ingestion={"path_defs": "inline", "events": "streaming"})
    queue, stream, client = QueueClient(), FakeStreamingClient(), FakeClient()
    ingester = make_ingester(settings, client, stream, queued_client=queue)
    ingester.ingest("path_defs", [marked()])
    ingester.ingest("events", [marked()])
    ingester.ingest("sessions", [marked()])
    assert len(client.commands) == len(stream.calls) == len(queue.calls) == 1
    assert queue.calls[0][2].table == "sessions"
    assert settings.ingestion_mode("process_defs") == "queued"  # explicit mode overrides auto's profile


def test_queued_ingestion_leaves_batching_to_dm_and_does_not_claim_completion():
    queue, client = QueueClient(), FakeClient()
    ingester = QueuedIngester(KustoSettings(DM), client, queue)
    rows = [marked(text='a\n"b"'), marked(2, text="next")]
    ingester.ingest("events", rows)
    assert len(queue.calls) == 1 and not client.queries
    source_id, payload, props = queue.calls[0]
    assert [json.loads(line) for line in payload.splitlines()] == rows
    assert props.format == DataFormat.MULTIJSON
    assert props.flush_immediately is False
    assert props.report_level == ReportLevel.FailuresOnly
    assert props.ingest_by_tags is None and props.ingest_if_not_exists is None
    assert props.additional_properties is None
    assert str(source_id) in ingester._pending


def test_raw_otel_lines_are_queued_without_sql_history_markers():
    queue, client = QueueClient(), FakeClient()
    ingester = QueuedIngester(KustoSettings(DM), client, queue)
    lines = ['{"Body":"one","RowKey":"a"}', '{"Body":"two","RowKey":"b"}']
    ingester.ingest_lines(otel.LOGS, lines)
    assert queue.calls[0][1].decode("ascii").splitlines() == lines
    assert not ingester._pending and not client.queries


def test_submission_failures_preserve_rows_without_switching_backends():
    queue, client = QueueClient(), FakeClient()
    queue.error = RuntimeError("enqueue failed")
    settings = KustoSettings(DM, ingestion="queued")
    ingester = QueuedIngester(settings, client, queue)
    conn = KustoConnection(
        settings,
        client,
        ingester,
        translator=StubTranslator({"s": Insert("sessions", [session_row("a")])}),
        tables=TABLES,
    )
    conn.execute("s")
    with pytest.raises(KustoStoreError, match="enqueue failed"):
        conn.commit()
    assert conn.in_transaction and len(queue.calls) == 1
    assert not ingester._pending and not client.commands


def test_missing_queued_acknowledgement_is_an_error():
    queue = SimpleNamespace(ingest_from_stream=lambda *args: None)
    ingester = QueuedIngester(KustoSettings(DM), FakeClient(), queue)
    with pytest.raises(RuntimeError, match="queued acknowledgement"):
        ingester.ingest("events", [marked()])
    assert not ingester._pending


@pytest.mark.parametrize(("kind", "table"), [("update", "sessions"), ("delete", "sessions"), ("insert", "events")])
def test_ordinary_reads_are_eventual_but_dependent_mutations_wait(kind, table, monkeypatch):
    queue = QueueClient()
    order = []
    checks = iter([1, 0])

    def on_query(kql):
        if "join kind=leftanti" in kql:
            order.append("visibility")
            return missing(next(checks))
        order.append(kql.split(" | ")[0])
        return response([], [])

    monkeypatch.setattr(I.time, "sleep", lambda delay: None)
    settings = KustoSettings(DM, ingestion="queued")
    client = FakeClient(on_query=on_query)
    conn = KustoConnection(
        settings,
        client,
        QueuedIngester(settings, client, queue),
        translator=StubTranslator(
            {
                "s": Insert("sessions", [session_row("a")]),
                "q": Query("read"),
                "u": Mutation(table, "change", kind=kind),
            }
        ),
        tables=TABLES,
    )
    conn.execute("s")
    conn.execute("q")
    assert order == ["read"] and len(queue.calls) == 1
    conn.execute("u")
    assert order == ["read", "visibility", "visibility", "change"]
    assert len(queue.calls) == 1


def test_conflict_checks_wait_for_a_previous_connections_queued_writes():
    queue = QueueClient()
    settings = KustoSettings(DM, ingestion="queued")
    calls = []

    def on_query(kql):
        calls.append("visible" if "join kind=leftanti" in kql else "existing")
        if "join kind=leftanti" in kql:
            return missing(0)
        return response([("session_id", "string"), ("rowid", "long")], [["a", 1]])

    client = FakeClient(on_query=on_query)
    ingester = QueuedIngester(settings, client, queue)
    first = KustoConnection(
        settings,
        client,
        ingester,
        translator=StubTranslator({"s": Insert("sessions", [session_row("a")])}),
        tables=TABLES,
    )
    second = KustoConnection(
        settings,
        client,
        ingester,
        translator=StubTranslator({"s": Insert("sessions", [session_row("a")], on_conflict="ignore")}),
        tables=TABLES,
    )
    first.execute("s")
    first.commit()
    assert second.execute("s").rowcount == 0
    assert calls == ["visible", "existing"] and len(queue.calls) == 1


def test_visibility_wait_checks_all_versions_and_preserves_receipts_on_timeout(monkeypatch):
    queue = QueueClient()
    client = FakeClient(on_query=lambda kql: missing(1))
    ingester = QueuedIngester(KustoSettings(DM), client, queue)
    ingester.ingest("events", [marked(), marked(2, _deleted=True)])
    now = [0.0]
    monkeypatch.setattr(I, "QUEUED_VISIBILITY_TIMEOUT_S", 2)
    monkeypatch.setattr(I.time, "monotonic", lambda: now[0])
    monkeypatch.setattr(I.time, "sleep", lambda delay: now.__setitem__(0, now[0] + delay))
    with pytest.raises(TimeoutError, match="not been resubmitted") as error:
        ingester.wait_for_pending("events")
    assert str(queue.calls[0][0]) in str(error.value)
    query = client.queries[0]
    assert "datatable(rowid:long, _v:datetime)" in query and "join kind=leftanti" in query
    assert "1, datetime(" in query and "2, datetime(" in query
    assert "_deleted" not in query  # tombstones count as ingested row versions too
    assert len(ingester._pending) == 1 and len(queue.calls) == 1
    client.on_query = lambda kql: missing(0)
    ingester.wait_for_pending("events")
    assert not ingester._pending and ingester._pending_rows == 0


def test_failed_visibility_query_is_not_treated_as_completion():
    client, queue = FakeClient(on_query=lambda kql: response([], [])), QueueClient()
    settings = KustoSettings(DM, ingestion="queued")
    ingester = QueuedIngester(settings, client, queue)
    ingester.ingest("events", [marked()])
    conn = KustoConnection(
        settings,
        client,
        ingester,
        translator=StubTranslator({"u": Mutation("events", "change")}),
        tables=TABLES,
    )
    with pytest.raises(KustoStoreError, match="invalid result"):
        conn.execute("u")
    assert ingester._pending and len(queue.calls) == 1
    assert len(client.queries) == 1 and "change" not in client.queries[0]


def test_session_upserts_do_not_wait_for_unrelated_queued_telemetry():
    client, queue = FakeClient(), QueueClient()
    settings = KustoSettings(DM)
    ingester = QueuedIngester(settings, client, queue)
    ingester.ingest("metrics", [marked()])
    conn = KustoConnection(settings, client, ingester, tables=TABLES)
    conn.executemany(
        "INSERT INTO sessions(session_id, started_at) VALUES(?, ?)"
        " ON CONFLICT(session_id) DO UPDATE SET started_at = MIN(sessions.started_at, excluded.started_at)",
        [("a", 100.0), ("b", 200.0)],
    )
    assert len(client.queries) == 1
    assert "['sessions']" in client.queries[0] and "['metrics']" not in client.queries[0]
    assert ingester._pending_rows == 1


def test_insert_select_waits_for_its_source_but_not_unrelated_tables():
    client = FakeClient(on_query=lambda q: missing(0) if "datatable(rowid:long" in q else response([], []))
    queue = QueueClient()
    settings = KustoSettings(DM)
    ingester = QueuedIngester(settings, client, queue)
    ingester.ingest("events", [marked()])
    ingester.ingest("metrics", [marked(2)])
    conn = KustoConnection(settings, client, ingester, tables=TABLES)
    conn.execute("INSERT INTO sessions(session_id) SELECT session_id FROM events")
    assert len(client.queries) == 2
    assert "datatable(rowid:long" in client.queries[0] and "['events']" in client.queries[0]
    assert all("['metrics']" not in q for q in client.queries)
    assert ingester._pending_rows == 1


def test_pending_row_budget_waits_without_forcing_a_dm_flush(monkeypatch):
    monkeypatch.setattr(I, "QUEUED_PENDING_ROWS", 1)
    client, queue = FakeClient(on_query=lambda kql: missing(0)), QueueClient()
    ingester = QueuedIngester(KustoSettings(DM), client, queue)
    ingester.ingest("events", [marked()])
    ingester.ingest("metrics", [marked(2)])
    assert len(client.queries) == 1 and "['events']" in client.queries[0]
    assert ingester._pending_rows == 1 and len(queue.calls) == 2
    assert all(not call[2].flush_immediately for call in queue.calls)


def test_visibility_queries_split_large_marker_sets_without_splitting_dm_batches(monkeypatch):
    monkeypatch.setattr(I, "VISIBILITY_QUERY_ROWS", 1)
    client, queue = FakeClient(on_query=lambda kql: missing(0)), QueueClient()
    ingester = QueuedIngester(KustoSettings(DM), client, queue)
    ingester.ingest("events", [marked(), marked(2)])
    ingester.wait_for_pending("events")
    assert len(queue.calls) == 1 and len(client.queries) == 2


def test_factory_does_not_reuse_an_explicit_queued_router_for_auto(monkeypatch):
    auto, explicit = KustoSettings(DM), KustoSettings(DM, ingestion="queued")
    client = FakeClient()
    monkeypatch.setattr(KustoClientFactory, "_clients", {KustoClientFactory.key(auto): client})
    monkeypatch.setattr(KustoClientFactory, "_ingesters", {})
    assert isinstance(KustoClientFactory.ingester(auto), TableIngester)
    assert isinstance(KustoClientFactory.ingester(explicit), QueuedIngester)


def test_queued_config_env_and_cli_options(kusto_config, monkeypatch):
    from click.testing import CliRunner

    from aictl.commands import daemon

    kusto_config.write_text(
        '[storage]\nkusto_cluster = "' + DM + '"\nkusto_ingestion = "queued"\n'
        '[storage.kusto_table_ingestion]\npath_defs = "inline"\n',
        encoding="utf-8",
    )
    settings = kusto_settings()
    assert settings is not None and settings.ingestion_mode("events") == "queued"
    assert settings.ingestion_mode("path_defs") == "inline"
    monkeypatch.setenv(INGESTION_ENV, "inline")
    monkeypatch.setenv(TABLE_INGESTION_ENV, "events=queued")
    assert kusto_settings().ingestion_mode("events") == "queued"
    seen = []
    monkeypatch.setattr(daemon, "start_server", lambda *a, **kw: seen.append(kusto_settings()))
    monkeypatch.setattr(daemon.os, "_exit", lambda code: None)
    result = CliRunner().invoke(
        daemon.serve,
        ["--kusto-cluster", DM, "--kusto-ingestion", "queued", "--kusto-table-ingestion", "sessions=inline"],
    )
    assert result.exit_code == 0, result.output
    assert seen[0].cluster == ENGINE and seen[0].ingestion_cluster == DM
    assert seen[0].ingestion_mode("events") == "queued"
    assert seen[0].ingestion_mode("sessions") == seen[0].ingestion_mode("path_defs") == "inline"
    assert daemon.os.environ[CLUSTER_ENV] == DM
