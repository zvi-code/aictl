"""Test typed observation handoff, retry, and report completeness."""

from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import pytest

from aictl.kusto import KustoSettings
from aictl.dashboard.models import DashboardSnapshot
from aictl.monitoring.collectors import BaseCollector
from aictl.orchestrator import SnapshotPersistence
from aictl.records import EventRow, RequestRow, ToolInvocationRow
from aictl.session_facts import SessionFacts
from aictl.sink import SampleSink
from aictl.stores import Store
from aictl.stores.base import StoreError
from aictl.stores.kusto.writer import KustoWriter
from aictl.stores.testing import MemoryWriter


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


class RefusingWriter(MemoryWriter):
    error = None

    def append(self, table, rows):
        if self.error is not None:
            raise self.error
        super().append(table, rows)

    def upsert(self, table, rows):
        if self.error is not None:
            raise self.error
        super().upsert(table, rows)


@pytest.fixture
def observation_writer():
    return RefusingWriter()


def test_distinct_source_events_keep_separate_keys_and_replay_stays_stable():
    from dataclasses import asdict

    ingester = RecordingIngester()
    writer = KustoWriter(ingester, node_id="test")
    facts = SessionFacts(writer)
    event = EventRow(100, "t", "k")
    before = asdict(event)
    for key in ("first", "second", "first"):
        facts.events([event], source="monitor", source_key=key)
    writer.flush()
    [(table, [first, second, replay])] = ingester.batches
    assert table == "events" and asdict(event) == before
    assert first["seq"] != second["seq"]
    assert first["rowid"] == replay["rowid"] and first["seq"] == replay["seq"]


def test_process_and_system_snapshots_are_ingested():
    ingester = RecordingIngester()
    writer = KustoWriter(ingester, node_id="test")
    persistence = SnapshotPersistence(writer=writer)
    persistence.capture_mode = lambda: "full"
    snap = DashboardSnapshot(timestamp=100, root="", tools=[], cpu_per_core=[20, 40])
    snap.total_cpu = 1.23
    snap.cpu_per_core = [20, 40]
    persistence._persist_samples(snap, [("tool", 1, 2, 0, 0)])
    snap.timestamp = 101
    persistence._persist_samples(snap, [("tool", 1, 3, 0, 0)])
    writer.flush()
    batches = dict(ingester.batches)
    assert [r["memory_rss_mb"] for r in batches["process_snapshots"]] == [2, 3]
    snapshot, = batches["system_snapshots"]
    assert snapshot["cpu_percent"] == 1.23
    assert snapshot["node_id"] == "test" and snapshot["host_cpu_percent"] == 30
    assert snapshot["capture_mode"] == "full" and snapshot["settings_captured_at"] == snapshot["ts"]


def test_sample_change_filters(observation_writer):
    sink = SampleSink(history_store=Store(writer=observation_writer))
    stale = SampleSink.DEDUP_STALE_SECONDS
    sink.emit_if_changed("m", 3.14159, ts=100, gauge=True)
    sink.emit_if_changed("m", 3.14159, ts=101, gauge=True)
    sink.emit_if_changed("m", 3.14159, ts=100 + stale, gauge=True)
    sink.emit_with_sensitivity("s", 2.04, ts=100, rounding=1, max_threshold=10)
    sink.emit_with_sensitivity("s", 2.01, ts=101, rounding=1, max_threshold=10)
    sink.emit("e", 5, ts=102)
    rows = observation_writer.written("metrics")
    assert [(r["metric"], r["value"], r["ts"]) for r in rows] == [
        ("m", 3.14159, 100),
        ("m", 3.14159, 100 + stale),
        ("s", 2.0, 100),
        ("e", 5, 102),
    ]
    assert sink.stats()["buffer_size"] == 0


def test_sample_flood_limit(observation_writer):
    sink = SampleSink(history_store=Store(writer=observation_writer))
    sink._flood_max = 2
    notices = []
    sink.record_data_quality = lambda component, status, **kw: notices.append((component, status))
    for value in (1, 2, 3):
        sink.emit("m", value, ts=100)
    rows = observation_writer.written("metrics")
    assert [r["value"] for r in rows] == [1, 2]
    assert sink.stats()["total_dropped"] == 1
    assert notices == [("sample-sink", "degraded")]


def test_failed_handoff_does_not_suppress_the_value_sent_again(observation_writer):
    sink = SampleSink(history_store=Store(writer=observation_writer))
    observation_writer.error = StoreError("offline")
    with pytest.raises(StoreError, match="offline"):
        sink.emit_if_changed("m", 7, ts=100, gauge=True)
    observation_writer.error = None
    sink.emit_if_changed("m", 7, ts=101, gauge=True)
    sink.emit_if_changed("m", 7, ts=102, gauge=True)
    rows = observation_writer.written("metrics")
    assert [r["ts"] for r in rows] == [101]


def test_node_health_counters_piggyback_on_snapshots_without_sampling_each_tick(observation_writer):
    from test_kusto_connection import FakeClient

    from aictl.health import ObservedKustoClient
    from aictl.orchestrator import SnapshotStore
    from aictl.stores.kusto.reader import KustoReader

    client = ObservedKustoClient(FakeClient())
    client.reads.finish(client.reads.begin(), error="example private query")
    reader = KustoReader(client, "test")
    persistence = SnapshotStore(history_store=Store(reader=reader, writer=observation_writer))._persistence
    samples = []
    persistence.runtime_sample = lambda: samples.append(True) or {"threads": 42}
    snap = DashboardSnapshot(timestamp=100, root="", tools=[])
    for ts in (100, 101, 130):
        snap.timestamp = ts
        persistence._persist_samples(snap, [])
    first, second = observation_writer.written("system_snapshots")
    assert second["ts"] == 130
    counters = json.loads(first["node_health_counters"])
    assert counters["runtime"] == {"threads": 42} and len(samples) == 2
    assert counters["store"]["reads"]["failed"] == 1
    assert "example private query" not in first["node_health_counters"]
    assert counters["pid"] == first["daemon_pid"]


def test_collector_rounds_and_filters_memory(observation_writer):
    class Collector(BaseCollector):
        name = "test:memory"

        async def run(self):
            self.sink_emit_memory("memory", 65537, {"pid": 42})
            self.sink_emit_memory("memory", 65540, {"pid": 42})
            await self.sink_flush_batch()

    collector = Collector()
    collector.set_sink(SampleSink(history_store=Store(writer=observation_writer)))
    asyncio.run(collector.run())
    assert [r["value"] for r in observation_writer.written("metrics")] == [65536]


def test_collector_batch_that_writer_refuses_is_sent_again_on_the_next_scan(observation_writer):
    class Collector(BaseCollector):
        name = "test:retry"

        async def run(self):
            self.sink_emit_if_changed("m", 7, gauge=True)
            await self.sink_flush_batch()

    collector = Collector()
    sink = SampleSink(history_store=Store(writer=observation_writer))
    collector.set_sink(sink)
    observation_writer.error = StoreError("offline")
    asyncio.run(collector.run())
    observation_writer.error = None
    asyncio.run(collector.run())
    asyncio.run(collector.run())
    assert [r["value"] for r in observation_writer.written("metrics")] == [7]


def test_refused_handoff_raises_and_does_not_claim_acceptance(observation_writer):
    observation_writer.error = StoreError("unavailable")
    sink = SampleSink(history_store=Store(writer=observation_writer))
    with pytest.raises(StoreError, match="unavailable"):
        sink.emit("m", 2, ts=100)
    assert sink.stats()["total_emitted"] == 0
    assert sink.get_latest("m") is None


def test_fact_buffer_coalesces_pending_versions():
    from aictl.ingesters.call_facts import FactBuffer
    from aictl.session_facts import SessionFacts
    from aictl.stores.testing import MemoryWriter

    writer = MemoryWriter()
    buffer = FactBuffer(SessionFacts(writer))
    row = RequestRow(ts=100, session_id="s", dedup_key="logical", output_tokens=1)
    buffer.add_request(row)
    row.output_tokens = 2
    buffer.add_request(row)
    assert len(buffer) == 1
    buffer.flush()
    assert len(buffer) == 0
    [(_, table, [row])] = writer.operations
    assert table == "requests"
    assert row["output_tokens"] == 2
    assert row["dedup_key"] == "logical"


def test_failed_full_fact_buffer_does_not_retry_for_every_new_fact(observation_writer, monkeypatch):
    from aictl.ingesters import call_facts

    facts = SessionFacts(observation_writer)
    monkeypatch.setattr(call_facts, "BUFFER_FLUSH_ROWS", 2)
    attempts = []
    write = facts.write_call_facts

    def record(facts):
        attempts.append(len(facts))
        return write(facts)

    monkeypatch.setattr(facts, "write_call_facts", record)
    observation_writer.error = StoreError("offline")
    buffer = call_facts.FactBuffer(facts)
    for i in range(4):
        buffer.add_request(RequestRow(ts=100 + i, session_id="s", dedup_key=str(i)))
    assert attempts == [2]
    assert len(buffer) == 4 and buffer.write_error is not None
    observation_writer.error = None
    buffer.flush()
    assert attempts == [2, 4]
    assert len(buffer) == 0 and buffer.write_error is None
    assert len(observation_writer.written("requests")) == 4


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
            raise StoreError("offline")
        accepted.extend(facts.requests)
        return len(facts)

    store = SimpleNamespace(
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
    with pytest.raises(StoreError, match="offline"):
        ingester.poll()
    assert attempts == [1]
    assert ingester._offsets[path] == len(lines[0].encode("utf-8"))
    assert path not in ingester._read_complete
    assert "session" in ingester._pending_sessions
    with pytest.raises(StoreError, match="offline"):
        ingester.poll()
    assert attempts[1] >= 1  # Steps and links of the same source record can also be pending.
    assert ingester._offsets[path] == len(lines[0].encode("utf-8"))
    failure[0] = False
    ingester.poll()
    assert [row.output_tokens for row in accepted] == [1, 2]
    assert len({row.dedup_key for row in accepted}) == 2
    assert sessions[-1]["output_tokens"] == 3
    assert ingester._offsets[path] == path.stat().st_size
    assert not len(ingester.facts)


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


def test_current_upserts_reuse_the_key_and_write_newer_versions():
    ingester = RecordingIngester()
    writer = KustoWriter(ingester, node_id="test")
    writer.upsert("requests", [
        {"project": "", "dedup_key": key, "ts": 100, "output_tokens": n}
        for n, key in enumerate(("a", "b", "a"))
    ])
    writer.flush()
    [(table, [first, other, latest])] = ingester.batches
    assert table == "requests"
    assert first["rowid"] == latest["rowid"] != other["rowid"]
    assert first["_v"] < latest["_v"] and latest["output_tokens"] == 2


def test_fact_privacy_is_applied_before_writer_handoff():
    from aictl.ingesters.call_facts import FactBuffer
    from aictl.session_facts import SessionFacts
    from aictl.stores.testing import MemoryWriter
    from aictl.tool_calls import ToolCalls

    writer = MemoryWriter()
    buffer = FactBuffer(SessionFacts(writer), tool_calls=ToolCalls(writer, keeps_text=lambda: False))
    buffer.add_tool(ToolInvocationRow(ts=100, session_id="s", tool_name="Bash",
                                      input={"command": "ls private text"}, result_summary="private"))
    buffer.flush()
    assert any(table == "tool_invocations" for _, table, _ in writer.operations)
    assert "private" not in repr(writer.operations)
    # The program a command ran is metadata and is kept; its arguments are text.
    assert any(row.get("target") == "ls" for _, table, rows in writer.operations if table == "tool_invocations"
               for row in rows)


def test_otel_derived_write_path_does_not_read_canonical_rows(tmp_path, monkeypatch):
    import gzip

    from aictl.dashboard.otel_receiver import OtelReceiver
    from aictl.dashboard.web_server import _DashboardHandler
    from aictl.stores.kusto.otel_sink import OtelExportWriter
    from aictl.orchestrator import SnapshotStore
    from aictl.stores import Store
    from aictl.stores.kusto.recorded import RecordedKustoClient
    from aictl.stores.kusto.writer import KustoWriter

    class NoReads(RecordedKustoClient):
        def _execute(self, *args):
            pytest.fail(f"Unexpected Kusto request: {args}")

    recording = tmp_path / "empty.jsonl.gz"
    with gzip.open(recording, "wt"):
        pass
    client = NoReads(recording)
    writer = KustoWriter(client, node_id="test")
    store = SnapshotStore(history_store=Store(writer=writer, otlp=OtelExportWriter(writer, "test")))
    receiver = OtelReceiver()
    monkeypatch.setattr(receiver, "parse_logs", lambda _: [EventRow(100, "t", "otel:api_request")])
    monkeypatch.setattr(receiver, "extract_requests", lambda _: [
        RequestRow(ts=100, session_id="s", pid=42, source="otel")
    ])
    monkeypatch.setattr(receiver, "extract_tool_invocations", lambda _: [
        ToolInvocationRow(ts=100, session_id="s", source_event_id="native-call")
    ])
    receiver._note_trace("trace", "s")
    replies = []
    handler = SimpleNamespace(
        _read_post_otlp=lambda _: {"resourceLogs": [{"scopeLogs": [{"logRecords": [{"body": {"stringValue": "ok"}}]}]}]},
        server=SimpleNamespace(otel_receiver=receiver, store=store, raw_otel_metrics=SimpleNamespace(accept=None)),
        _json_response_raw=lambda body: replies.append(body),
        send_error=lambda status, message: pytest.fail(f"{status}: {message}"),
    )
    handler._capture_otlp = lambda signal, data: _DashboardHandler._capture_otlp(handler, signal, data)
    _DashboardHandler._receive_otel(handler, "logs")
    writer.flush()
    assert replies == [b'{"ok":true}']
    tables = dict(client.ingestions)
    assert {"events", "requests", "sessions", "session_processes", "otel_trace_sessions", "OTELLogs"} <= tables.keys()
    assert tables["tool_invocations"][0]["source_event_id"] == "native-call"


def test_failed_late_trace_handoff_restores_the_links():
    from aictl.dashboard.otel_receiver import OtelReceiver
    receiver = OtelReceiver()
    receiver._note_trace("trace", "s")
    links = receiver.take_trace_links()
    receiver.restore_trace_links(links)
    assert receiver.take_trace_links() == [("trace", "s")]


def test_auto_streams_live_tables_but_respects_overrides_and_emulator():
    cloud = KustoSettings("https://example.kusto.windows.net")
    for table in ("events", "metrics", "hook_calls", "process_snapshots", "tool_stats", "OTELLogs"):
        assert cloud.ingestion_mode(table) == "streaming"
    assert cloud.ingestion_mode("sessions") == "inline"
    assert KustoSettings(cloud.cluster, table_ingestion={"events": "queued"}).ingestion_mode("events") == "queued"
    assert KustoSettings("http://localhost:8080").ingestion_mode("events") == "inline"


def test_discovery_sends_only_changed_tool_totals(tmp_path, monkeypatch):
    from aictl import tools
    from aictl.monitoring.config import MonitorConfig
    from aictl.monitoring.runtime import DiscoveryCollector
    from aictl.stores import Store
    from aictl.stores.testing import MemoryWriter
    from aictl.tools import MAX_FILE_SAMPLES_PER_TOOL, ResourceFile, ToolResources

    writer = MemoryWriter()
    files = [
        ResourceFile(str(tmp_path / f"f{i}.md"), "rules", size=4, tokens=2)
        for i in range(MAX_FILE_SAMPLES_PER_TOOL + 1)
    ]
    monkeypatch.setattr(tools, "discover_all", lambda *_args, **_kwargs: [ToolResources("t", "T", files=files)])
    collector = DiscoveryCollector(MonitorConfig(root=tmp_path, workspace_paths=(tmp_path,), state_paths=()))
    collector.set_sink(SampleSink(history_store=Store(writer=writer)))

    class PollComplete(Exception):
        pass

    async def report(**_kwargs):
        pass

    scans = []

    async def stop(_interval):
        scans.append(len(writer.operations))
        if len(scans) == 2:
            raise PollComplete

    collector.report_status = report
    collector.sleep_paced = stop
    with pytest.raises(PollComplete):
        asyncio.run(collector.run())
    assert scans == [1, 1]
    assert writer.operations[0][1] == "metrics"
    assert len(writer.operations[0][2]) == 5
    assert all(row["metric"].startswith("aictl.discovery.") for row in writer.operations[0][2])


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
        emit_batch=lambda _batch: (_ for _ in ()).throw(StoreError("ingestion down")),
        record_data_quality=lambda comp, status, **kw: qualities.append((comp, status, kw.get("message"))),
    )
    collector = DummyCollector()
    collector.set_sink(sink)
    asyncio.run(collector.run())
    assert len(qualities) == 1
    assert qualities[0][:2] == ("collector:test:dummy", "degraded")


def test_cursor_ingester_writes_session_and_message_facts_without_reading_history(tmp_path):
    import sqlite3

    from aictl.ingesters.cursor_conversations import CursorConversationsIngester
    from core_store_fakes import message_facts, written

    src_path = tmp_path / "conversations.db"
    src = sqlite3.connect(src_path)
    src.execute("CREATE TABLE conversations(id TEXT PRIMARY KEY, workspace_path TEXT, created_at REAL)")
    src.execute("CREATE TABLE messages(id INTEGER PRIMARY KEY, conversation_id TEXT, role TEXT, content TEXT, created_at REAL)")
    src.execute("INSERT INTO conversations VALUES('conv-1', '/work/proj', 100.0)")
    src.execute("INSERT INTO messages VALUES(1, 'conv-1', 'user', 'hello', 101.0)")
    src.commit()
    src.close()

    facts = message_facts(tmp_path)
    assert CursorConversationsIngester(src_path, facts).poll() == 1
    session = written(facts.writer, "sessions")[-1]
    [message] = written(facts.writer, "cursor_session_messages")
    assert session["session_id"] == message["session_id"] == "conv-1"
    assert message["role"] == "user"


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
        _read_post_otlp=lambda _: current_body[0],
        _capture_otlp=lambda *_: True,
        server=SimpleNamespace(otel_receiver=receiver, store=SimpleNamespace(
            session_facts=SimpleNamespace(writer=object()), _sink=SimpleNamespace(emit_otel=append_samples))),
        _json_response_raw=lambda _b: None,
        send_error=lambda status, msg: errors.append((status, msg)),
    )

    # 1. Baseline 100 accepted
    _DashboardHandler._receive_otel(handler, "metrics")
    assert [s.value for s in accepted] == [100.0]

    # 2. Export 110 fails during append_samples -> 503
    current_body[0] = payload_110
    should_fail[0] = True
    _DashboardHandler._receive_otel(handler, "metrics")
    assert errors and errors[-1][0] == 503
    assert [s.value for s in accepted] == [100.0]

    # 3. Retry of export 110 succeeds and still emits delta 10.0, not 0.0
    should_fail[0] = False
    _DashboardHandler._receive_otel(handler, "metrics")
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


def test_azcli_shared_token_replaces_stale_provider_token(monkeypatch):
    import time

    from aictl.stores.kusto import client as C

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


def test_deferred_collector_samples_keep_original_timestamps(observation_writer):
    sink = SampleSink(history_store=Store(writer=observation_writer))

    class StampedCollector(BaseCollector):
        name = "test:stamped"

        async def run(self):
            self._pending_samples.append(("m.early", 1.0, {"a": "1"}, 1234.5))
            self._pending_samples.append(("m.late", 2.0, {"a": "2"}, 1239.5))
            await self.sink_flush_batch()

    c = StampedCollector()
    c.set_sink(sink)
    asyncio.run(c.run())
    rows = observation_writer.written("metrics")
    assert [r["ts"] for r in rows] == [1234.5, 1239.5]


