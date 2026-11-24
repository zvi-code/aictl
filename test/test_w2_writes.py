import gzip
import json
import os
import time
from datetime import datetime, timezone

import pytest

from aictl.dashboard.otel_receiver import OtelReceiver
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.orchestrator import SnapshotPersistence
from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.sink import OtelMetricGate
from aictl.state_file import StateFile
from aictl.stores.kusto.otel_sink import OtelExportWriter
from aictl.stores.kusto.recorded import RecordedKustoClient
from aictl.stores.kusto.writer import KustoWriter, epoch_datetime
from aictl.tool_calls import ToolCalls


@pytest.fixture
def writer(tmp_path):
    class NoReads(RecordedKustoClient):
        def _execute(self, *args):
            pytest.fail(f"Unexpected Kusto request: {args}")

    recording = tmp_path / "empty.jsonl.gz"
    with gzip.open(recording, "wt"):
        pass
    client = NoReads(recording)
    return KustoWriter(client, node_id="test"), client


def test_transcript_lifecycle_replay_without_queries(writer, tmp_path):
    writer, client = writer
    now = time.time()
    sid = "session"
    state = StateFile(tmp_path / "lifecycle.json")
    checkpoint = StateFile(tmp_path / "transcript.json")
    facts = SessionFacts(writer, state=state, keeps_text=lambda: True)
    facts.session(SessionRow(sid, "copilot-cli", 7, "demo", started_at=now), activity=now)
    facts.link(sid, 7, "copilot-cli", now, "lead", "demo")
    facts.save()
    facts = SessionFacts(writer, state=state, keeps_text=lambda: True)
    runtime = SnapshotPersistence(None, writer, session_facts=facts)
    runtime._persist_session_events([dict(kind="session_end", tool="copilot-cli", ts=now + 5,
                                         detail={"session_id": sid, "output_tokens": 2})], now)
    assert facts.started_at(sid) == now

    root = tmp_path / "session-state"
    path = root / sid / "events.jsonl"
    path.parent.mkdir(parents=True)
    stamp = datetime.fromtimestamp(now, timezone.utc).isoformat()
    path.write_text("\n".join(json.dumps(dict(type=typ, id=typ, timestamp=stamp, data=data)) for typ, data in [
        ("user.message", {"content": "a prompt"}),
        ("session.usage_record", {"usage": {"model": "gpt-6-astra", "inputTokens": 10, "outputTokens": 3}}),
    ]) + "\n", encoding="utf-8")
    os.utime(path, (now - 7200, now - 7200))

    def run(state: StateFile | None):
        ingester = TranscriptUsageIngester(
            None, fact_target=facts, checkpoint=state, tool_calls=ToolCalls(writer, keeps_text=lambda: True),
            copilot_state=root, claude_projects=tmp_path / "claude",
            codex_sessions=tmp_path / "codex", vscode_workspaces=tmp_path / "vscode",
        )
        return ingester.poll()

    assert run(checkpoint) == 1
    assert checkpoint.read()
    assert run(checkpoint) == 0
    assert run(None) == 1
    writer.flush()
    tables = dict(client.ingestions)
    assert not any(t["last_error"] for t in writer.health()["tables"].values())
    # Times are sent as UTC datetimes, converted once by the writer.
    assert all(r["pid"] == 7 and r["started_at"] == epoch_datetime(now) for r in tables["sessions"])
    assert tables["sessions"][-1]["ended_at"] == epoch_datetime(now + 5)
    assert tables["session_usage"][-1]["output_tokens"] == 3
    assert tables["requests"][0]["source"] == "transcript"
    assert len({r["rowid"] for r in tables["requests"]}) == 1
    assert tables["session_step_text"][0]["text"] == "a prompt"
    assert len({r["step_key"] for r in tables["session_steps"] if r["kind"] == "message"}) == 1


def test_raw_metric_limits_and_replay_keys(writer):
    writer, client = writer
    clock = [0]
    gate = OtelMetricGate(limit=1, clock=lambda: clock[0])
    raw = OtelExportWriter(writer, "test")

    def metric(name, timestamp, value):
        return {"name": name, "gauge": {"dataPoints": [{"timeUnixNano": str(timestamp), "asInt": str(value)}]}}

    def push(*rows):
        raw.ingest("metrics", {"resourceMetrics": [{"scopeMetrics": [{"metrics": list(rows)}]}]},
                   keep_text=False, admit_metrics=gate.accept)

    push(metric("series", 1, 4), metric("flooded", 1, 3))
    clock[0] = 50
    push(metric("series", 2, 4))
    clock[0] = 300
    push(metric("series", 3, 4))
    clock[0] = 700
    push(metric("series", 3, 4))
    writer.flush()
    [(table, rows)] = client.ingestions
    assert table == "OTELMetrics"
    assert gate.dropped == 1
    assert [r["MetricName"] for r in rows] == ["series", "series"]
    assert rows[0]["RowKey"] != rows[1]["RowKey"]


def test_timestamp_less_otel_retry_keeps_source_identity(writer, monkeypatch):
    writer, client = writer
    body = {"resourceLogs": [{"scopeLogs": [{"logRecords": [{"body": {"stringValue": "one"}}]}]}]}
    facts = SessionFacts(writer)
    for now in (100, 200):
        monkeypatch.setattr("aictl.dashboard.otel_receiver.time.time", lambda now=now: now)
        facts.events(OtelReceiver().parse_logs(body), source="logs")
    writer.flush()
    [(_, [one, two])] = client.ingestions
    assert one["ts"] != two["ts"]
    assert one["source_key"] == two["source_key"]
