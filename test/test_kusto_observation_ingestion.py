"""Kusto observation acceptance performs ingestion, not read-before-write SQL."""

from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import pytest

from aictl.kusto import KustoSettings
from aictl.kusto.connection import KustoConnection, KustoStoreError
from aictl.kusto.schema import store_schema
from aictl.monitoring.collectors import BaseCollector
from aictl.sink import SampleSink
from aictl.storage import (
    AgentRow,
    EventRow,
    HistoryDB,
    HookCallRow,
    Metric,
    ProcessSnapshotRow,
    RequestRow,
    SessionRow,
    SystemSnapshotRow,
    ToolInvocationRow,
)


class NoQueryClient:
    def execute(self, *_args, **_kwargs):
        pytest.fail("Accepting an observation must not query stored data")

    def execute_mgmt(self, *_args, **_kwargs):
        pytest.fail("Schema setup must finish before observation acceptance")


class RecordingIngester:
    def __init__(self):
        self.batches = []
        self.error = None

    def ingest(self, table, rows):
        if self.error is not None:
            raise self.error
        self.batches.append((table, rows))

    def ingest_lines(self, table, lines):
        self.ingest(table, [json.loads(line) for line in lines])


@pytest.fixture
def observation_store():
    settings = KustoSettings("https://example.kusto.windows.net")
    ingester = RecordingIngester()
    conn = KustoConnection(settings, NoQueryClient(), ingester, tables=store_schema(), observation_writes=True)
    # Test the typed acceptance boundary without schema/bootstrap or background workers.
    db = HistoryDB.__new__(HistoryDB)
    db._kusto = settings
    db._shared_conn = None
    db.capture = "full"
    db._retention_days = 30
    db._content_retention_days = 14
    db._datapoint_logger = None
    db._event_listeners = []
    db._writers = {}
    db._conn = lambda: conn
    return db, ingester


def test_events_and_samples_keep_equal_observations_without_queries(observation_store):
    db, ingester = observation_store
    db.append_events([EventRow(100, "t", "otel:health"), EventRow(100, "t", "otel:health")])
    db.append_samples([Metric(100, "m", 7), Metric(100, "m", 7)])
    for table, rows in ingester.batches:
        assert table in ("events", "metrics")
        assert len(rows) == 2
        assert rows[0]["seq"] != rows[1]["seq"]
        assert rows[0]["rowid"] != rows[1]["rowid"]

def test_retrying_the_same_typed_observation_keeps_its_identity(observation_store):
    from dataclasses import asdict

    db, ingester = observation_store
    event = EventRow(100, "t", "k")
    sample = Metric(100, "m", 7)
    for row, append in ((event, db.append_events), (sample, db.append_samples)):
        before = asdict(row)
        append([row])
        first = ingester.batches[-1][1][0]
        append([row])
        second = ingester.batches[-1][1][0]
        assert first["rowid"] == second["rowid"]
        assert first["seq"] == second["seq"]
        assert asdict(row) == before


def test_project_wrapper_does_not_suppress_heartbeats(observation_store):
    from aictl.project_stores import ProjectStores

    db, ingester = observation_store
    stores = ProjectStores.__new__(ProjectStores)
    stores.machine = db
    stores.append_events([EventRow(100, "t", "otel:health"), EventRow(101, "t", "otel:health")])
    assert len(ingester.batches[0][1]) == 2


def test_all_process_snapshots_and_system_snapshots_are_ingested(observation_store):
    db, ingester = observation_store
    db.append_tool_metrics([
        ProcessSnapshotRow(100, pid=42, threads=2),
        ProcessSnapshotRow(101, pid=42, threads=3),
    ])
    db.append_metrics(SystemSnapshotRow(100, cpu_percent=1.23456789, cpu_per_core=[20, 40]))
    assert [r["threads"] for r in ingester.batches[0][1]] == [2, 3]
    assert ingester.batches[1][1][0]["cpu_percent"] == 1.23456789
    snapshot = ingester.batches[1][1][0]
    assert snapshot["node_id"] == db._kusto.node_id and snapshot["host_cpu_percent"] == 30
    assert snapshot["capture_mode"] == "full" and snapshot["content_retention_days"] == 14
    assert snapshot["settings_captured_at"] >= snapshot["ts"]


def test_kusto_samples_use_the_same_change_filters_as_sqlite(observation_store):
    db, ingester = observation_store
    sink = SampleSink(db=db)
    stale = SampleSink.DEDUP_STALE_SECONDS
    sink.emit_if_changed("m", 3.14159, ts=100, gauge=True)
    sink.emit_if_changed("m", 3.14159, ts=101, gauge=True)
    sink.emit_if_changed("m", 3.14159, ts=100 + stale, gauge=True)
    sink.emit_with_sensitivity("s", 2.04, ts=100, rounding=1, max_threshold=10)
    sink.emit_with_sensitivity("s", 2.01, ts=101, rounding=1, max_threshold=10)
    sink.emit("e", 5, ts=102)
    rows = [r for table, batch in ingester.batches for r in batch if table == "metrics"]
    assert [(r["metric"], r["value"], r["ts"]) for r in rows] == [
        ("m", 3.14159, 100),
        ("m", 3.14159, 100 + stale),
        ("s", 2.0, 100),
        ("e", 5, 102),
    ]
    assert sink.stats()["buffer_size"] == 0


def test_kusto_samples_keep_the_flood_limit(observation_store):
    db, ingester = observation_store
    sink = SampleSink(db=db)
    sink._flood_max = 2
    notices = []
    sink.record_data_quality = lambda component, status, **kw: notices.append((component, status))
    for value in (1, 2, 3):
        sink.emit("m", value, ts=100)
    rows = [r for table, batch in ingester.batches for r in batch if table == "metrics"]
    assert [r["value"] for r in rows] == [1, 2]
    assert sink.stats()["total_dropped"] == 1
    assert notices == [("sample-sink", "degraded")]


def test_failed_kusto_handoff_does_not_suppress_the_value_sent_again(observation_store):
    db, ingester = observation_store
    sink = SampleSink(db=db)
    ingester.error = RuntimeError("offline")
    with pytest.raises(KustoStoreError, match="offline"):
        sink.emit_if_changed("m", 7, ts=100, gauge=True)
    ingester.error = None
    sink.emit_if_changed("m", 7, ts=101, gauge=True)
    sink.emit_if_changed("m", 7, ts=102, gauge=True)
    rows = [r for table, batch in ingester.batches for r in batch if table == "metrics"]
    assert [r["ts"] for r in rows] == [101]


def test_node_health_counters_piggyback_without_logging_requests_or_sampling_each_tick(observation_store, monkeypatch):
    from aictl.health import OperationStats
    from aictl.kusto.connection import KustoClientFactory

    db, ingester = observation_store
    reads = OperationStats()
    reads.finish(reads.begin(), error="example private query")
    client = type("Client", (), {"reads": reads})()
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda settings: (client, None))
    for ts in (100, 101):
        db.append_metrics(SystemSnapshotRow(ts))
    first, second = [rows[0] for _, rows in ingester.batches]
    counters = json.loads(first["node_health_counters"])
    assert counters["store"]["reads"]["total"] == counters["store"]["reads"]["recent_completed"] == 1
    assert counters["pid"] == first["daemon_pid"]
    assert "example private query" not in first["node_health_counters"]
    assert not second.get("node_health_counters")


def test_collector_rounds_and_filters_memory_in_kusto_mode(observation_store):
    db, ingester = observation_store

    class Collector(BaseCollector):
        name = "test:memory"

        async def run(self):
            self.sink_emit_memory("memory", 65537, {"pid": 42})
            self.sink_emit_memory("memory", 65540, {"pid": 42})
            await self.sink_flush_batch()

    collector = Collector()
    collector.set_sink(SampleSink(db=db))
    asyncio.run(collector.run())
    assert [[r["value"] for r in rows] for table, rows in ingester.batches if table == "metrics"] == [[65536]]


def test_collector_batch_that_kusto_refuses_is_sent_again_on_the_next_scan(observation_store):
    db, ingester = observation_store

    class Collector(BaseCollector):
        name = "test:retry"

        async def run(self):
            self.sink_emit_if_changed("m", 7, gauge=True)
            await self.sink_flush_batch()

    collector = Collector()
    sink = SampleSink(db=db)
    collector.set_sink(sink)
    ingester.error = RuntimeError("offline")
    asyncio.run(collector.run())
    ingester.error = None
    asyncio.run(collector.run())
    asyncio.run(collector.run())
    assert [[r["value"] for r in rows] for table, rows in ingester.batches if table == "metrics"] == [[7]]


def test_refused_handoff_raises_and_does_not_claim_acceptance(observation_store):
    db, ingester = observation_store
    ingester.error = RuntimeError("unavailable")
    sink = SampleSink(db=db)
    with pytest.raises(KustoStoreError, match="unavailable"):
        sink.emit("m", 2, ts=100)
    assert sink.stats()["total_emitted"] == 0
    assert sink.get_latest("m") is None


def test_hook_capture_mode_applies_before_direct_ingestion(observation_store):
    db, ingester = observation_store
    db.capture = "metadata"
    db.append_hook_call(HookCallRow("call", 100, 101, payload={"prompt": "private"}, command="private"))
    table, rows = ingester.batches[0]
    assert table == "hook_calls"
    assert rows[0]["command"] == ""
    assert "private" not in rows[0]["payload"]


def test_mutable_state_is_not_silently_treated_as_an_append(observation_store):
    db, _ = observation_store
    with pytest.raises(ValueError, match="not an append-only"):
        db._conn().ingest_observations("sessions", [{"session_id": "s"}])

def test_mutable_typed_writers_append_evidence_without_reading_baseline(observation_store):
    db, ingester = observation_store
    db.append_request(RequestRow(ts=100, session_id="s", output_tokens=4, source="otel"))
    db.append_tool_invocation(ToolInvocationRow(ts=101, session_id="s", source_event_id="call-1"))
    db.upsert_session(SessionRow(session_id="s", started_at=99))
    db.update_session_stats("s", output_tokens=4)
    db.update_session_end("s", 120)
    db.batch_link_sessions([("s", "t", 42, 99, "otel")])
    db.upsert_agent(AgentRow(agent_id="a", session_id="s"))
    db.update_tool_invocation_duration("call-key", 120)
    db.tie_otel_traces([("trace-id", "s")])
    db.set_sessions_tool(["s"], "copilot-desktop")
    db.clear_stale_pending_confirms(50)
    assert all(table.endswith("_observations") for table, _ in ingester.batches)
    request = ingester.batches[0][1][0]
    assert request["source_revision"] is None
    assert request["source_entity_id"] == ""
    assert request["event_time"].startswith("1970-01-01")
    patches = [r for t, rows in ingester.batches if t == "sessions_observations" for r in rows]
    clear = next(r for r in patches if r["observation_operation"] == "patch" and r["ended_at"] is None)
    assert clear["source_presence_known"] is False
    assert clear["presence"] is None
    assert "ended_at" in json.loads(clear["serialized_fields"])
    assert "started_at" not in json.loads(clear["serialized_fields"])


def test_fact_buffer_retains_intermediate_versions_and_failed_batches(observation_store):
    from aictl.ingesters.call_facts import FactBuffer

    db, ingester = observation_store
    buffer = FactBuffer(db)
    row = RequestRow(ts=100, session_id="s", dedup_key="logical", output_tokens=1)
    buffer.add_request(row)
    row.output_tokens = 2
    buffer.add_request(row)
    assert len(buffer) == 2
    ingester.error = RuntimeError("offline")
    buffer.flush()
    assert len(buffer) == 2
    ingester.error = None
    buffer.flush()
    assert len(buffer) == 0
    rows = ingester.batches[0][1]
    assert [r["output_tokens"] for r in rows] == [1, 2]
    assert all(r["source_revision"] is None for r in rows)
    assert rows[0]["observation_id"] != rows[1]["observation_id"]


def test_failed_full_fact_buffer_does_not_retry_for_every_new_fact(observation_store, monkeypatch):
    from aictl.ingesters import call_facts

    db, ingester = observation_store
    monkeypatch.setattr(call_facts, "BUFFER_FLUSH_ROWS", 2)
    attempts = []
    write = db.write_call_facts

    def record(facts):
        attempts.append(len(facts))
        return write(facts)

    monkeypatch.setattr(db, "write_call_facts", record)
    ingester.error = RuntimeError("offline")
    buffer = call_facts.FactBuffer(db)
    for i in range(4):
        buffer.add_request(RequestRow(ts=100 + i, session_id="s", dedup_key=str(i)))
    assert attempts == [2]
    assert len(buffer) == 4 and buffer.write_error is not None
    ingester.error = None
    buffer.flush()
    assert attempts == [2, 4]
    assert len(buffer) == 0 and buffer.write_error is None
    assert len(ingester.batches[0][1]) == 4


def test_transcript_poll_pauses_at_record_boundary_and_retries_before_reading_more(tmp_path, monkeypatch):
    import time
    from datetime import datetime, timezone

    from aictl.ingesters import call_facts
    from aictl.ingesters.transcript_usage import TranscriptUsageIngester

    monkeypatch.setattr(call_facts, "BUFFER_FLUSH_ROWS", 1)
    failure = [True]
    accepted = []
    attempts = []
    sessions = []

    def write(facts):
        attempts.append(len(facts))
        if failure[0]:
            raise KustoStoreError("offline")
        accepted.extend(facts.requests)
        return len(facts)

    store = SimpleNamespace(
        streams_observations=True,
        write_call_facts=write,
        upsert_session_usage=lambda row: sessions.append(row),
        upsert_session=lambda row: None,
    )
    root = tmp_path / "session-state"
    path = root / "session" / "events.jsonl"
    path.parent.mkdir(parents=True)
    stamp = datetime.fromtimestamp(time.time(), timezone.utc).isoformat()
    lines = [
        json.dumps(
            {
                "type": "session.usage_record",
                "id": f"event-{i}",
                "timestamp": stamp,
                "data": {"usage": {"model": "gpt-6-astra", "inputTokens": i * 10, "outputTokens": i}},
            }
        )
        + "\n"
        for i in (1, 2)
    ]
    path.write_text("".join(lines), encoding="utf-8", newline="\n")
    ingester = TranscriptUsageIngester(
        store,
        copilot_state=root,
        claude_projects=tmp_path / "claude",
        codex_sessions=tmp_path / "codex",
        vscode_workspaces=tmp_path / "vscode",
    )
    with pytest.raises(KustoStoreError, match="offline"):
        ingester.poll()
    assert attempts == [1]
    assert ingester._offsets[path] == len(lines[0].encode("utf-8"))
    assert path not in ingester._read_complete
    assert "session" in ingester._pending_sessions
    with pytest.raises(KustoStoreError, match="offline"):
        ingester.poll()
    assert attempts == [1, 1]
    assert ingester._offsets[path] == len(lines[0].encode("utf-8"))
    failure[0] = False
    ingester.poll()
    assert [row.output_tokens for row in accepted] == [1, 2]
    assert len({row.dedup_key for row in accepted}) == 2
    assert sessions[-1]["output_tokens"] == 3
    assert ingester._offsets[path] == path.stat().st_size
    assert not len(ingester.facts)


def test_canonical_reads_report_unresolved_evidence_instead_of_guessing():
    from test_kusto_connection import FakeClient, response

    from aictl.kusto.observations import UnresolvedObservationsError

    client = FakeClient(on_query=lambda _: response([("family", "string")], [["requests"]]))
    conn = KustoConnection(
        KustoSettings("https://example.kusto.windows.net"), client, RecordingIngester(),
        tables=store_schema(), observation_writes=True,
    )
    with pytest.raises(UnresolvedObservationsError, match="incomplete"):
        conn.execute("SELECT COUNT(*) FROM requests")
    assert client.queries == []


def test_backfill_is_fill_only_evidence_and_cannot_mutate_the_baseline(observation_store):
    from aictl.kusto.observations import UnresolvedObservationsError

    db, ingester = observation_store
    assert db.fill_tool_sizes([("s", "key", 10, None)]) == 1
    table, rows = ingester.batches[-1]
    assert table == "tool_invocations_observations"
    assert rows[0]["observation_operation"] == "fill_missing_sizes"
    assert rows[0]["source_presence_known"] is False
    with pytest.raises(UnresolvedObservationsError):
        db._conn().execute("UPDATE tool_invocations SET input_bytes = 10 WHERE dedup_key = 'key'")


def test_report_sections_do_not_publish_baseline_totals_over_unresolved_evidence():
    from test_kusto_connection import FakeClient, response

    from aictl.kusto.report import SECTIONS, run_section

    client = FakeClient(on_query=lambda _: response([("family", "string")], [["requests"]]))
    result = run_section(client, "test", SECTIONS[0], 7)
    assert "incomplete" in result.error
    assert result.tables == []
    assert len(client.queries) == 1


def test_report_completeness_fails_closed_when_cutover_state_is_missing():
    from test_kusto_connection import FakeClient, response

    from aictl.kusto.report import SECTIONS, run_section

    client = FakeClient(on_query=lambda _: response([], []))
    result = run_section(client, "test", SECTIONS[0], 7)
    assert "cutover state is unavailable" in result.error
    assert result.tables == []
    assert len(client.queries) == 1
    assert ".show tables" in client.queries[0]


def test_cutover_control_metadata_precedes_queued_evidence(monkeypatch):
    from test_kusto_connection import FakeClient

    monkeypatch.setattr(KustoConnection, "_cutover_done", set())
    settings = KustoSettings("https://example.kusto.windows.net", ingestion="queued")
    client = FakeClient()
    conn = KustoConnection(
        settings, client, RecordingIngester(), tables=store_schema(), observation_writes=True
    )
    conn.ensure_observation_cutover()
    conn.ensure_observation_cutover()
    assert len(client.commands) == 1
    assert client.commands[0].startswith(".ingest inline into table ['maintenance_state']")
    assert "observation_cutover:requests" in client.commands[0]
    assert "retain_unresolved" in client.commands[0]
    assert not client.queries


@pytest.mark.parametrize(
    ("existing", "current"),
    [
        ([], True),
        (["aictl_current_store_v1", "sessions"], True),
        (["sessions"], False),
        (["aictl_current_store_v1", "requests_observations"], False),
    ],
)
def test_history_layout_revives_only_fresh_stores(monkeypatch, existing, current):
    from test_kusto_connection import FakeClient, response

    from aictl.kusto.connection import connect

    client = FakeClient(on_mgmt=lambda _: response([("TableName", "string")], [[n] for n in existing]))
    monkeypatch.setattr(KustoConnection, "ensure_schema", lambda conn: None)
    monkeypatch.setattr(KustoConnection, "_cutover_done", set())
    conn = connect(KustoSettings("https://example.kusto.windows.net"), client=client,
                   ingester=RecordingIngester(), history_store=True)
    assert conn.observation_writes is not current
    assert ("requests_observations" not in conn.tables) is current
    assert any("create-merge" in cmd for cmd in client.commands) == (not existing)
    assert any("retain_unresolved" in cmd for cmd in client.commands) is not current


def test_current_report_runs_analytical_query_and_returns_its_data():
    from test_kusto_connection import FakeClient, response

    from aictl.kusto.report import SECTIONS, run_section

    def query(kql):
        if kql.startswith(".show"):
            return response([("TableName", "string")], [[t] for t in ("aictl_current_store_v1", "requests", "tool_invocations")])
        return response([("n", "long")], [[7]])

    client = FakeClient(on_query=query)
    result = run_section(client, "test", SECTIONS[0], 7)
    assert result.error is None and result.tables == [[{"n": 7}]]
    assert client.queries[-1] == result.kql


def test_current_upserts_with_a_repeated_key_do_not_read_the_same_baseline(monkeypatch):
    import threading

    from test_kusto_connection import FakeClient

    from aictl.storage import _REQUEST_UPSERT, _request_params

    conn = KustoConnection(KustoSettings("https://example.kusto.windows.net"), FakeClient(), RecordingIngester())
    conn._history_writer = threading.Lock()
    batches = []
    monkeypatch.setattr(conn, "_mutate_many", lambda group, _: batches.append([s.upsert_key for s in group]) or len(group))
    conn.executemany(_REQUEST_UPSERT, [_request_params(RequestRow(ts=1, dedup_key=k)) for k in ("a", "b", "a")])
    assert batches == [[("a",), ("b",)], [("a",)]]


def test_fact_privacy_is_applied_before_a_failed_handoff_is_buffered(observation_store):
    from aictl.ingesters.call_facts import FactBuffer

    db, ingester = observation_store
    db.capture = "metadata"
    buffer = FactBuffer(db)
    buffer.add_tool(ToolInvocationRow(ts=100, input={"command": "private text"}, result_summary="private"))
    ingester.error = RuntimeError("offline")
    buffer.flush()
    saved = buffer._versions["tools"][0]
    assert saved.input == {}
    assert saved.result_summary == ""


def test_otel_derived_write_path_does_not_read_canonical_rows(observation_store, monkeypatch):
    from aictl.dashboard.otel_receiver import OtelReceiver
    from aictl.dashboard.web_server import _DashboardHandler

    db, ingester = observation_store
    receiver = OtelReceiver()
    monkeypatch.setattr(receiver, "parse_logs", lambda _: [EventRow(100, "t", "otel:api_request")])
    monkeypatch.setattr(receiver, "extract_requests", lambda _: [
        RequestRow(ts=100, session_id="s", pid=42, source="otel")
    ])
    monkeypatch.setattr(receiver, "extract_tool_invocations", lambda _: [
        ToolInvocationRow(ts=100, session_id="s", source_event_id="native-call")
    ])
    receiver._late_traces = [("trace", "s")]
    replies = []
    handler = SimpleNamespace(
        _db=db,
        _read_post_otlp=lambda _: {},
        _otel_to_kusto=lambda *_: True,
        server=SimpleNamespace(
            otel_receiver=receiver, store=SimpleNamespace(request_refresh=lambda: None)
        ),
        _json_response_raw=lambda body: replies.append(body),
        send_error=lambda status, message: pytest.fail(f"{status}: {message}"),
    )
    _DashboardHandler._receive_otel_logs(handler)
    assert replies == [b'{"ok":true}']
    tables = {table for table, _ in ingester.batches}
    assert {"events", "requests_observations", "tool_invocations_observations", "sessions_observations",
            "session_processes_observations"} <= tables


def test_failed_late_trace_handoff_restores_the_links():
    from aictl.dashboard.otel_receiver import OtelReceiver
    from aictl.dashboard.web_server import _tie_late_traces

    receiver = OtelReceiver()
    receiver._late_traces = [("trace", "s")]

    def fail(_rows):
        raise RuntimeError("offline")

    with pytest.raises(RuntimeError, match="offline"):
        _tie_late_traces(receiver, SimpleNamespace(tie_otel_traces=fail))
    assert receiver.take_late_traces() == [("trace", "s")]


def test_auto_streams_live_tables_but_respects_overrides_and_emulator():
    cloud = KustoSettings("https://example.kusto.windows.net")
    for table in ("events", "metrics", "hook_calls", "process_snapshots", "tool_stats", "OTELLogs"):
        assert cloud.ingestion_mode(table) == "streaming"
    assert cloud.ingestion_mode("sessions") == "inline"
    assert KustoSettings(cloud.cluster, table_ingestion={"events": "queued"}).ingestion_mode("events") == "queued"
    assert KustoSettings("http://localhost:8080").ingestion_mode("events") == "inline"


def test_discovery_sends_one_batch_of_changed_samples_with_the_file_cap(tmp_path, monkeypatch, observation_store):
    from aictl import tools
    from aictl.monitoring.config import MonitorConfig
    from aictl.monitoring.runtime import DiscoveryCollector
    from aictl.tools import MAX_FILE_SAMPLES_PER_TOOL, ResourceFile, ToolResources

    db, ingester = observation_store
    files = [
        ResourceFile(str(tmp_path / f"f{i}.md"), "rules", size=4, tokens=2)
        for i in range(MAX_FILE_SAMPLES_PER_TOOL + 1)
    ]
    monkeypatch.setattr(tools, "discover_all", lambda *_args, **_kwargs: [ToolResources("t", "T", files=files)])
    collector = DiscoveryCollector(MonitorConfig(root=tmp_path, workspace_paths=(tmp_path,), state_paths=()))
    collector.set_sink(SampleSink(db=db))

    class PollComplete(Exception):
        pass

    async def report(**_kwargs):
        pass

    scans = []

    async def stop(_interval):
        scans.append(len(ingester.batches))
        if len(scans) == 2:
            raise PollComplete

    collector.report_status = report
    collector.sleep_paced = stop
    with pytest.raises(PollComplete):
        asyncio.run(collector.run())
    assert scans == [1, 1]
    table, rows = ingester.batches[0]
    assert table == "metrics"
    assert len(rows) == 5 + 2 * MAX_FILE_SAMPLES_PER_TOOL


def test_collector_delivery_failure_records_degraded_quality_without_killing_collector():
    class DummyCollector(BaseCollector):
        name = "test:dummy"

        async def run(self):
            self.sink_emit("m1", 1.0, {"k": "v"})
            ok = await self.sink_flush_batch([("m2", 2.0, None)])
            assert ok is False

    qualities = []
    sink = SimpleNamespace(
        streams_observations=True,
        emit_batch=lambda _batch: (_ for _ in ()).throw(KustoStoreError("ingestion down")),
        record_data_quality=lambda comp, status, **kw: qualities.append((comp, status, kw.get("message"))),
    )
    collector = DummyCollector()
    collector.set_sink(sink)
    asyncio.run(collector.run())
    assert len(qualities) == 1
    assert qualities[0][:2] == ("collector:test:dummy", "degraded")


def test_trim_text_scrubs_baseline_and_companion_observation_tables():
    from test_kusto_connection import FakeClient, response

    from aictl.kusto.observations import UnresolvedObservationsError

    queried_kql: list[str] = []

    def on_query(kql: str):
        queried_kql.append(kql)
        if "['session_step_text']" in kql and "count()" in kql:
            return response([("n", "long")], [[0]])
        return response([], [])

    settings = KustoSettings("https://example.kusto.windows.net")
    client = FakeClient(on_query=on_query)
    ingester = RecordingIngester()
    conn = KustoConnection(settings, client, ingester, tables=store_schema(), observation_writes=True)
    db = HistoryDB.__new__(HistoryDB)
    db._kusto = settings
    db._shared_conn = None
    db.capture = "full"
    db._retention_days = 30
    db._content_retention_days = 14
    db._writers = {}
    db._conn = lambda: conn

    assert db.trim_text(before=500.0) == 0
    joined = "\n".join(queried_kql)
    assert "['session_prompts_observations']" in joined
    assert "['tool_invocations_observations']" in joined
    assert "['agents_observations']" in joined
    # Outside maintenance_scope, canonical queries remain blocked.
    with pytest.raises(UnresolvedObservationsError):
        conn.execute("SELECT COUNT(*) FROM session_prompts")


def test_cursor_ingester_provisions_session_observation_without_querying_baseline(tmp_path, observation_store):
    import sqlite3

    from aictl.ingesters.cursor_conversations import CursorConversationsIngester

    src_path = tmp_path / "conversations.db"
    src = sqlite3.connect(src_path)
    src.execute("CREATE TABLE conversations(id TEXT PRIMARY KEY, workspace_path TEXT, created_at REAL)")
    src.execute("CREATE TABLE messages(id INTEGER PRIMARY KEY, conversation_id TEXT, role TEXT, content TEXT, created_at REAL)")
    src.execute("INSERT INTO conversations VALUES('conv-1', '/work/proj', 100.0)")
    src.execute("INSERT INTO messages VALUES(1, 'conv-1', 'user', 'hello', 101.0)")
    src.commit()
    src.close()

    db, ingester = observation_store
    cursor_ing = CursorConversationsIngester(src_path, db)
    # Stub _insert_message since NoQueryClient refuses SQLite-style INSERT OR IGNORE on cursor_session_messages
    inserted = []
    cursor_ing._insert_message = lambda **kw: (
        inserted.append((kw["session_id"], kw["source_row_id"], kw["role"], kw["content"])),
        True,
    )[1]
    cursor_ing._quality = lambda *_a, **_kw: None

    assert cursor_ing.poll() == 1
    assert inserted == [("cursor:conv-1", 1, "user", "hello")]
    tables = [t for t, _ in ingester.batches]
    assert "sessions_observations" in tables


def test_retried_cumulative_otel_metrics_preserve_delta_after_failed_handoff():
    from aictl.dashboard.otel_receiver import OtelReceiver
    from aictl.dashboard.web_server import _DashboardHandler

    payload = {
        "resourceMetrics": [
            {
                "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "copilot-cli"}}]},
                "scopeMetrics": [
                    {
                        "metrics": [
                            {
                                "name": "gen_ai.client.token.usage",
                                "sum": {
                                    "aggregationTemporality": 2,
                                    "dataPoints": [{"timeUnixNano": "1700000000000000000", "asInt": "100"}],
                                },
                            }
                        ]
                    }
                ],
            }
        ]
    }
    payload_110 = {
        "resourceMetrics": [
            {
                "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "copilot-cli"}}]},
                "scopeMetrics": [
                    {
                        "metrics": [
                            {
                                "name": "gen_ai.client.token.usage",
                                "sum": {
                                    "aggregationTemporality": 2,
                                    "dataPoints": [{"timeUnixNano": "1700000010000000000", "asInt": "110"}],
                                },
                            }
                        ]
                    }
                ],
            }
        ]
    }

    receiver = OtelReceiver()
    accepted = []
    should_fail = [False]
    errors = []

    def append_samples(items):
        if should_fail[0]:
            raise RuntimeError("Kusto unavailable")
        accepted.extend(items)

    current_body = [payload]
    handler = SimpleNamespace(
        _db=SimpleNamespace(streams_observations=True, append_samples=append_samples),
        _read_post_otlp=lambda _: current_body[0],
        _otel_to_kusto=lambda *_: True,
        server=SimpleNamespace(otel_receiver=receiver),
        _json_response_raw=lambda _b: None,
        send_error=lambda status, msg: errors.append((status, msg)),
    )

    # 1. Baseline 100 accepted
    _DashboardHandler._receive_otel_signal(handler, "metrics", "parse_metrics", "append_samples", "samples")
    assert [s.value for s in accepted] == [100.0]

    # 2. Export 110 fails during append_samples -> 503
    current_body[0] = payload_110
    should_fail[0] = True
    _DashboardHandler._receive_otel_signal(handler, "metrics", "parse_metrics", "append_samples", "samples")
    assert errors and errors[-1][0] == 503
    assert [s.value for s in accepted] == [100.0]

    # 3. Retry of export 110 succeeds and still emits delta 10.0, not 0.0
    should_fail[0] = False
    _DashboardHandler._receive_otel_signal(handler, "metrics", "parse_metrics", "append_samples", "samples")
    assert [s.value for s in accepted] == [100.0, 10.0]


def test_concurrent_cumulative_otel_metrics_do_not_double_count_deltas():
    import threading

    from aictl.dashboard.otel_receiver import OtelReceiver

    def make_payload(val: int, ts_s: int, start_s: int = 1700000000) -> dict:
        return {
            "resourceMetrics": [
                {
                    "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "copilot-cli"}}]},
                    "scopeMetrics": [
                        {
                            "metrics": [
                                {
                                    "name": "gen_ai.client.token.usage",
                                    "sum": {
                                        "aggregationTemporality": 2,
                                        "dataPoints": [
                                            {
                                                "startTimeUnixNano": str(start_s * 1_000_000_000),
                                                "timeUnixNano": str(ts_s * 1_000_000_000),
                                                "asInt": str(val),
                                            }
                                        ],
                                    },
                                }
                            ]
                        }
                    ],
                }
            ]
        }

    receiver = OtelReceiver()
    accepted = []
    receiver.ingest_metrics(make_payload(100, 1700000001), accepted.extend)
    assert [s.value for s in accepted] == [100.0]

    # Even if newer 120 (ts=3) arrives before delayed 110 (ts=2), the total after 130 (ts=4) must equal 130.0.
    receiver.ingest_metrics(make_payload(120, 1700000003), accepted.extend)
    receiver.ingest_metrics(make_payload(110, 1700000002), accepted.extend)
    receiver.ingest_metrics(make_payload(130, 1700000004), accepted.extend)
    assert [s.value for s in accepted] == [100.0, 20.0, 0.0, 10.0]
    assert sum(s.value for s in accepted) == 130.0
    assert accepted[2].tags["otel_ordering"] == "out_of_order_ignored"
    assert accepted[2].tags["otel_raw_cumulative"] == 110.0

    # Concurrent threads with equal/ambiguous timestamps also preserve exact total 130.0 without inventing a reset.
    receiver2 = OtelReceiver()
    accepted2 = []
    receiver2.ingest_metrics(make_payload(100, 1700000010), accepted2.extend)
    barrier = threading.Barrier(2)

    def run_export(val: int) -> None:
        barrier.wait(timeout=5.0)
        receiver2.ingest_metrics(make_payload(val, 1700000010), accepted2.extend)

    t1 = threading.Thread(target=run_export, args=(110,))
    t2 = threading.Thread(target=run_export, args=(120,))
    t1.start()
    t2.start()
    t1.join(timeout=5.0)
    t2.join(timeout=5.0)
    receiver2.ingest_metrics(make_payload(130, 1700000020), accepted2.extend)
    assert sum(s.value for s in accepted2) == 130.0

    # Cross-epoch reordering:
    # Epoch A (start=100) point 110 value 100 -> +100
    # Epoch B (start=200) point 210 value 5   -> +5
    # Delayed final Epoch A (start=100) point 120 value 120 -> +20 (not dropped as 0)
    # Retry of delayed final Epoch A (start=100) point 120 value 120 -> +0
    # Epoch B continuation (start=200) point 220 value 15 -> +10
    # Total across epochs A and B = 120 + 15 = 135.0
    receiver3 = OtelReceiver()
    accepted3 = []
    receiver3.ingest_metrics(make_payload(100, ts_s=110, start_s=100), accepted3.extend)
    receiver3.ingest_metrics(make_payload(5, ts_s=210, start_s=200), accepted3.extend)
    receiver3.ingest_metrics(make_payload(120, ts_s=120, start_s=100), accepted3.extend)
    receiver3.ingest_metrics(make_payload(120, ts_s=120, start_s=100), accepted3.extend)
    receiver3.ingest_metrics(make_payload(15, ts_s=220, start_s=200), accepted3.extend)
    assert [s.value for s in accepted3] == [100.0, 5.0, 20.0, 0.0, 10.0]
    assert sum(s.value for s in accepted3) == 135.0

    # First observed epoch is B (start=200), then older epoch A (start=100) arrives later:
    receiver4 = OtelReceiver()
    accepted4 = []
    receiver4.ingest_metrics(make_payload(5, ts_s=210, start_s=200), accepted4.extend)
    receiver4.ingest_metrics(make_payload(100, ts_s=110, start_s=100), accepted4.extend)
    receiver4.ingest_metrics(make_payload(120, ts_s=120, start_s=100), accepted4.extend)
    receiver4.ingest_metrics(make_payload(15, ts_s=220, start_s=200), accepted4.extend)
    assert [s.value for s in accepted4] == [5.0, 100.0, 20.0, 10.0]
    assert sum(s.value for s in accepted4) == 135.0

    # Exceeding _MAX_EPOCHS_PER_SERIES (8) across mixed missing/present startTimeUnixNano
    # stays strictly bounded to 8 epochs after every transition and marks evicted old epochs
    # as unresolved_epoch_baseline.
    receiver5 = OtelReceiver()
    accepted5 = []
    for i in range(1, 12):
        # Valid OTLP times (ts_s >= start_s), alternating missing start_s=0 lower-value restart
        # and explicit new start_s=i*100 higher value:
        receiver5.ingest_metrics(make_payload(1, ts_s=i * 100 + 1, start_s=0), accepted5.extend)
        state = next(iter(receiver5._cumulative_last.values()))
        assert len(state[3]) <= 8
        receiver5.ingest_metrics(make_payload(10, ts_s=i * 100 + 5, start_s=i * 100), accepted5.extend)
        state = next(iter(receiver5._cumulative_last.values()))
        assert len(state[3]) <= 8
    # Late arrival for an evicted old epoch (start_s=100, ts_s=199) is marked unresolved_epoch_baseline with delta 0.0
    receiver5.ingest_metrics(make_payload(50, ts_s=199, start_s=100), accepted5.extend)
    assert accepted5[-1].value == 0.0
    assert accepted5[-1].tags["otel_ordering"] == "unresolved_epoch_baseline"
    assert accepted5[-1].tags["otel_raw_cumulative"] == 50.0


def test_timestamp_less_patch_has_retention_ts_and_pre_upgrade_null_rows_trim_by_received_time(observation_store, tmp_path):
    db, ingester = observation_store
    db.update_tool_invocation_duration("call-key", 250.0, 1, "boom")
    table, rows = ingester.batches[-1]
    assert table == "tool_invocations_observations"
    row = rows[0]
    assert row["event_time"] is None
    assert isinstance(row["retention_ts"], float) and row["retention_ts"] > 0
    assert row["result_summary"] == "boom"

    # Simulate a pre-upgrade row in tool_invocations_observations where both retention_ts and ts are NULL,
    # and only received_time is populated.
    sqlite_db = HistoryDB(db_path=tmp_path / "upgrade.db", flush_interval=0)
    try:
        conn = sqlite_db._conn()
        conn.execute(
            "CREATE TABLE tool_invocations_observations ("
            " dedup_key TEXT, ts REAL, input TEXT DEFAULT '{}', result_summary TEXT DEFAULT '',"
            " target TEXT DEFAULT '', retention_ts REAL, received_time TEXT)"
        )
        conn.execute(
            "INSERT INTO tool_invocations_observations(dedup_key, ts, input, result_summary, target, retention_ts, received_time)"
            " VALUES('call-key', NULL, '{\"cmd\":\"secret\"}', 'secret summary', 'secret target', NULL, '2026-11-01T00:00:00Z')"
        )
        conn.commit()
        trimmed = sqlite_db._trim_table_text(
            "tool_invocations_observations",
            "COALESCE(NULLIF(retention_ts, 0), NULLIF(ts, 0), unixepoch(received_time))",
            {"input": "{}", "result_summary": "", "target": ""},
            0.0,
            2_000_000_000.0,
        )
        assert trimmed == 1
        after = conn.execute(
            "SELECT input, result_summary, target FROM tool_invocations_observations WHERE dedup_key = 'call-key'"
        ).fetchone()
        assert after == ("{}", "", "")
    finally:
        sqlite_db.close()


def test_azcli_shared_token_replaces_stale_provider_token(monkeypatch):
    import time

    from aictl.kusto import connection as C

    C._ensure_azcli_token_cache()
    from azure.kusto.data._token_providers import AzCliTokenProvider

    now = time.time()
    stale = SimpleNamespace(token="stale-tok", expires_on=now - 10)
    fresh = SimpleNamespace(token="fresh-tok", expires_on=now + 3600)
    scope = "https://example-dev.swedencentral.dev.kusto.windows.net/.default"
    monkeypatch.setitem(C._azcli_tokens, scope, fresh)

    provider = SimpleNamespace(_scopes=[scope], _kusto_uri="https://example-dev.swedencentral.dev.kusto.windows.net", _az_token=stale)
    cached = AzCliTokenProvider._get_token_from_cache_impl(provider)
    assert cached is not None
    assert "fresh-tok" in cached.values()
    assert provider._az_token is fresh


def test_deferred_collector_samples_keep_original_timestamps(observation_store):
    db, ingester = observation_store
    sink = SampleSink(db=db)

    class StampedCollector(BaseCollector):
        name = "test:stamped"

        async def run(self):
            self._pending_samples.append(("m.early", 1.0, {"a": "1"}, 1234.5))
            self._pending_samples.append(("m.late", 2.0, {"a": "2"}, 1239.5))
            await self.sink_flush_batch()

    c = StampedCollector()
    c.set_sink(sink)
    asyncio.run(c.run())
    rows = ingester.batches[-1][1]
    assert [r["ts"] for r in rows] == [1234.5, 1239.5]


