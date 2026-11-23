"""Offline source-boundary, active-tail, and runtime identity regressions."""

from __future__ import annotations

import contextlib
import copy
import json
import os
import threading
import time
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.dashboard.live.hub import HubLimits, LiveHub
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.monitoring.collectors.process import PsutilProcessCollector
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import SessionCorrelator
from aictl.monitoring.live_sources import LiveRuntimeSources
from aictl.monitoring.native_sessions import MAX_LINE_BYTES, NativeSessionTail
from aictl.monitoring.session import ProcessInfo
from aictl.monitoring.tool_config import ToolConfig

SID = "11111111-1111-4111-8111-111111111111"
EXE = r"C:\Tools\copilot.exe"


class RecordingHub(LiveHub):
    def __init__(self):
        super().__init__()
        self.calls = []

    def publish(self, topic, entity_id, data, *, source):
        self.calls.append(("publish", topic, entity_id, copy.deepcopy(data), source))
        return super().publish(topic, entity_id, data, source=source)

    def remove(self, topic, entity_id, *, source):
        self.calls.append(("remove", topic, entity_id, None, source))
        return super().remove(topic, entity_id, source=source)


def entities(hub, topic):
    subscription = hub.subscribe()
    try:
        _, bootstrap = subscription.next(0)
        return [entity for entity in bootstrap["entities"] if entity["topic"] == topic]
    finally:
        subscription.close()


def one(hub, topic):
    found = entities(hub, topic)
    assert len(found) == 1
    return found[0]["data"]


def process(tmp_path, *, pid=41, birth=10.0, flags=()):
    return ProcessInfo(
        pid=pid,
        ppid=1,
        name="copilot",
        exe=EXE,
        cmdline=(EXE, *flags),
        cwd=str(tmp_path),
        created_at=birth,
    )


def correlator(tmp_path):
    return SessionCorrelator(MonitorConfig(root=tmp_path, workspace_paths=(tmp_path,), state_paths=()))


def source(tmp_path, hub=None, **kwargs):
    return LiveRuntimeSources(
        hub or RecordingHub(),
        tmp_path,
        capture_mode=lambda: "full",
        config_provider=lambda _: [],
        host="test-host",
        **kwargs,
    )


def ingester(tmp_path):
    store = SimpleNamespace(_keeps_text=lambda: True)
    reader = TranscriptUsageIngester(
        store,
        claude_projects=tmp_path / "claude",
        codex_sessions=tmp_path / "codex",
        copilot_state=tmp_path / "copilot",
        vscode_workspaces=tmp_path / "vscode",
    )
    reader.poll = lambda: pytest.fail("Native freshness must not wait for bulk history ingestion")
    return reader


def event(kind, identifier, *, ts=100.0, **data):
    return {"type": kind, "id": identifier, "timestamp": ts, "data": data}


def write_rows(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as stream:
        for row in rows:
            stream.write(json.dumps(row) + "\n")


def append_rows(path, rows):
    with path.open("a", encoding="utf-8") as stream:
        for row in rows:
            stream.write(json.dumps(row) + "\n")


def held_file(reader, rows, *, pid=41, lock_at=20.0):
    path = reader.copilot_state / SID / "events.jsonl"
    write_rows(path, rows)
    marker = path.parent / f"inuse.{pid}.lock"
    marker.touch()
    os.utime(marker, (lock_at, lock_at))
    return path, marker


def wait_for(predicate, timeout=2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.01)
    assert predicate(), "Live producer did not become responsive"


def test_ready_empty_baseline_and_late_attachment_do_not_invent_zeroes(tmp_path):
    runtime = correlator(tmp_path)
    producer = source(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    producer.flush_runtime()
    status = one(producer.hub, "source.status")
    assert status["ready"] is False
    assert status["process_count"] is None

    runtime.on_process_snapshot(0, ts=90.0)
    producer.flush_runtime()
    assert one(producer.hub, "source.status")["process_count"] == 0
    assert one(producer.hub, "source.status")["ready"] is True

    runtime.on_process(process(tmp_path), 5, 1000, 0, ts=100.0, is_new=True)
    runtime.on_process_snapshot(1, ts=100.0)
    late = source(tmp_path)
    late.attach_runtime(SimpleNamespace(correlator=runtime))
    late.flush_runtime()
    assert one(late.hub, "runtime.process")["pid"] == 41
    assert one(late.hub, "source.status")["ready"] is True
    runtime.on_process_exit(41, ts=101.0)
    late.flush_runtime()
    assert entities(late.hub, "runtime.process") == []
    assert entities(late.hub, "runtime.agent") == []
    late.stop()
    producer.stop()


def test_gauges_coalesce_but_start_end_between_drains_are_retained(tmp_path):
    runtime = correlator(tmp_path)
    producer = source(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    proc = process(tmp_path)
    for cpu in range(100):
        runtime.on_process(proc, cpu, 1024 + cpu, 0, ts=100.0 + cpu)
    producer.flush_runtime()
    samples = [call for call in producer.hub.calls if call[1] == "runtime.process"]
    assert [call[3]["cpu_percent"] for call in samples] == [0, 99]
    assert one(producer.hub, "runtime.process")["memory_rss_bytes"] == 1123
    assert one(producer.hub, "runtime.agent")["native_activity"] == "unknown"

    transient = process(tmp_path, pid=42, birth=11)
    runtime.on_process(transient, 1, 100, 0, ts=201.0)
    runtime.on_process_exit(42, ts=202.0)
    producer.flush_runtime()
    changes = [call for call in producer.hub.calls if call[1] == "runtime.process"]
    assert changes[-2][0] == "publish"
    assert changes[-2][3]["pid"] == 42
    assert changes[-1][0] == "remove"
    assert changes[-2][2] == changes[-1][2]
    assert [row["data"]["pid"] for row in entities(producer.hub, "runtime.process")] == [41]
    producer.stop()


def test_rapid_pid_reuse_clears_cpu_and_creates_new_identity(tmp_path):
    runtime = correlator(tmp_path)
    producer = source(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 80, 1000, 0, ts=100.0)
    producer.flush_runtime()
    before = entities(producer.hub, "runtime.process")[0]
    old_session = runtime.pid_to_session[41]
    runtime.on_process(process(tmp_path, birth=11), None, 2000, 0, ts=100.5)
    producer.flush_runtime()
    after = entities(producer.hub, "runtime.process")[0]
    assert after["id"] != before["id"]
    assert after["data"]["cpu_percent"] is None
    assert one(producer.hub, "runtime.agent")["cpu_percent"] is None
    assert runtime.pid_to_session[41] != old_session
    producer.stop()


def test_lifecycle_overflow_rebaselines_stale_entities_and_invalidates_resume(tmp_path):
    runtime = correlator(tmp_path)
    producer = source(tmp_path, lifecycle_limit=1)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    producer.flush_runtime()
    subscriber = producer.hub.subscribe()
    _, initial = subscriber.next(0)
    runtime.on_process_exit(41, ts=101)
    runtime.on_process(process(tmp_path, pid=42, birth=11), 2, 2, 0, ts=102)
    producer.flush_runtime()
    kind, reset = subscriber.next(0)
    assert kind == "bootstrap"
    assert reset["reason"] == "runtime-lifecycle-overflow"
    assert reset["ordered_gap"] is True
    assert [row["data"]["pid"] for row in reset["entities"] if row["topic"] == "runtime.process"] == [42]
    resumed = producer.hub.subscribe(cursor=initial["cursor"])
    try:
        assert resumed.next(0)[0] == "bootstrap"
    finally:
        resumed.close()
        subscriber.close()
        producer.stop()


def test_native_and_resources_run_while_configuration_and_history_are_blocked(tmp_path):
    entered, release = threading.Event(), threading.Event()

    def blocked_configuration(_):
        entered.set()
        assert release.wait(5)
        return []

    producer = LiveRuntimeSources(
        RecordingHub(),
        tmp_path,
        config_provider=blocked_configuration,
        capture_mode=lambda: "full",
        native_poll_s=0.05,
        host="test-host",
    )
    reader = ingester(tmp_path)
    runtime = correlator(tmp_path)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    producer.start()
    try:
        assert entered.wait(1)
        runtime.on_process(process(tmp_path), 12, 4096, 0, ts=100)
        path, _ = held_file(reader, [event("assistant.message", "m1", content="current output")])
        runtime.on_file(str(path), event_type="modified")
        wait_for(lambda: bool(entities(producer.hub, "runtime.output")))
        wait_for(lambda: bool(entities(producer.hub, "runtime.process")))
        assert one(producer.hub, "runtime.output")["text"] == "current output"
        assert one(producer.hub, "runtime.process")["cpu_percent"] == 12
        assert not release.is_set()
    finally:
        release.set()
        producer.stop()
    assert all(not thread.is_alive() for thread in producer._threads)


def test_native_dedup_partial_line_and_ordered_delivery(tmp_path):
    path = tmp_path / "events.jsonl"
    first = event("assistant.message", "m1", content="one")
    write_rows(path, [first, {**first, "usage": {"tokens": 999}}])
    tail = NativeSessionTail(path, "copilot-cli", SID)
    seen = []
    tail.refresh(capture="full", emit=seen.append)
    assert [item["text"] for item in seen] == ["one"]
    partial = json.dumps(event("assistant.message", "m2", content="two"))
    with path.open("a", encoding="utf-8") as stream:
        stream.write(partial[:20])
    tail.refresh(capture="full", emit=seen.append)
    assert len(seen) == 1
    with path.open("a", encoding="utf-8") as stream:
        stream.write(partial[20:] + "\n")
    tail.refresh(capture="full", emit=seen.append)
    tail.refresh(capture="full", emit=seen.append)
    assert [(item["text"], item["order"]) for item in seen] == [("one", 1), ("two", 2)]

    hub = LiveHub()
    subscriber = hub.subscribe()
    subscriber.next(0)
    for item in seen:
        hub.publish("runtime.output", item["entry_id"], item, source="runtime.native")
    _, change = subscriber.next(0)
    assert [item["data"]["text"] for item in change["upserts"]] == ["one", "two"]
    subscriber.close()


def test_same_size_rewrite_and_replay_update_without_duplicates(tmp_path):
    path = tmp_path / "events.jsonl"
    original = event("assistant.message", "m1", content="one")
    write_rows(path, [original])
    tail = NativeSessionTail(path, "copilot-cli", SID)
    seen = []
    tail.refresh(capture="full", emit=seen.append)
    write_rows(path, [event("assistant.message", "m1", content="two")])
    tail.refresh(capture="full", emit=seen.append)
    assert tail.rewrites == 1
    assert seen[0]["entry_id"] == seen[1]["entry_id"]
    assert [item["order"] for item in seen] == [1, 2]

    write_rows(path, [original, event("assistant.message", "m2", content="new")])
    tail.refresh(capture="full", emit=seen.append)
    assert [item["text"] for item in seen][-2:] == ["one", "new"]
    before = len(seen)
    write_rows(path, [original, event("assistant.message", "m2", content="new")])
    tail.refresh(capture="full", emit=seen.append)
    assert len(seen) == before


def test_large_history_suffix_and_oversized_partial_skip_are_bounded(tmp_path, monkeypatch):
    import aictl.ingesters.transcript_tail as framing

    path = tmp_path / "events.jsonl"
    write_rows(
        path,
        [
            {"type": "api-request-blob", "system_prompt": "private " * 100_000},
            event("assistant.message", "m1", content="visible"),
        ],
    )
    loads = framing.json.loads
    parsed = []

    def observed_loads(raw):
        assert b"private " not in raw
        parsed.append(len(raw))
        return loads(raw)

    monkeypatch.setattr(framing.json, "loads", observed_loads)
    tail = NativeSessionTail(path, "copilot-cli", SID)
    seen = []
    tail.refresh(capture="full", emit=seen.append)
    assert [item["text"] for item in seen] == ["visible"]
    assert tail.tail_truncated is True

    with path.open("ab") as stream:
        stream.write(b"x" * (MAX_LINE_BYTES + 100))
    tail.refresh(capture="full", emit=seen.append)
    offset = tail.offset
    tail.refresh(capture="full", emit=seen.append)
    assert tail.offset == offset == path.stat().st_size
    assert tail.discarded_lines == 1
    assert len(parsed) == 1
    with path.open("ab") as stream:
        stream.write(b"\n")
    append_rows(path, [event("assistant.message", "m2", content="after oversized line")])
    tail.refresh(capture="full", emit=seen.append)
    assert [item["text"] for item in seen] == ["visible", "after oversized line"]


@pytest.mark.parametrize("capture", ["full", "metadata", "off"])
def test_capture_and_redaction_exclude_user_system_usage_and_tool_arguments(tmp_path, capture):
    path = tmp_path / "events.jsonl"
    write_rows(
        path,
        [
            {"type": "api-request-blob", "system_prompt": "PRIVATE-SYSTEM"},
            event("user.message", "u1", content="PRIVATE-PROMPT"),
            event("session.usage_record", "usage", usage={"cost": 123, "tokens": 456}),
            event("assistant.message", "a1", content="token=supersecretvalue Bearer abcdefghijklmnop"),
            event("tool.execution_start", "call1", toolCallId="c1", toolName="view", arguments={"path": "PRIVATE-ARGUMENT"}),
            event("tool.execution_complete", "call2", toolCallId="c1", result={"content": "PRIVATE-RESULT"}),
        ],
    )
    tail = NativeSessionTail(path, "copilot-cli", SID)
    seen = []
    tail.refresh(capture=capture, emit=seen.append)
    serialized = json.dumps(seen)
    for private in ("PRIVATE-SYSTEM", "PRIVATE-PROMPT", "supersecretvalue", "abcdefghijklmnop", "PRIVATE-ARGUMENT", "PRIVATE-RESULT"):
        assert private not in serialized
    assert {item["kind"] for item in seen} == {"assistant.message", "tool.execution_start", "tool.execution_complete"}
    assert seen[0]["content_retained"] is (capture == "full")
    assert bool(seen[0]["text"]) is (capture == "full")
    assert seen[1]["progress"] == "view"


def test_native_authority_and_actual_turn_state_never_change_history_totals(tmp_path):
    runtime = correlator(tmp_path)
    producer = source(tmp_path)
    reader = ingester(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    producer.attach_ingester(reader)
    historical = {"kpis": {"tokens": 99, "cost": 12}, "agents": {"main": {"activity": [1, 2, 3]}}}
    producer.hub.publish("history.board", "history", historical, source="kusto.queryable")
    runtime.on_process(process(tmp_path), 0, 4096, 0, ts=100)
    path, _ = held_file(
        reader,
        [
            event("assistant.turn_start", "turn-start", turnId="t1"),
            event("assistant.message", "message", content="native output"),
            event("session.usage_record", "usage", usage={"tokens": 100000}),
        ],
    )
    producer.poll_native()
    producer.flush_runtime()
    assert one(producer.hub, "runtime.agent")["native_activity"] == "working"
    assert one(producer.hub, "history.board") == historical
    append_rows(path, [event("assistant.turn_end", "turn-end", turnId="t1")])
    producer.poll_native()
    runtime.on_process(process(tmp_path), 99, 4096, 0, ts=101)
    producer.flush_runtime()
    assert one(producer.hub, "runtime.agent")["native_activity"] == "idle"
    append_rows(path, [event("session.shutdown", "shutdown")])
    producer.poll_native()
    producer.flush_runtime()
    assert one(producer.hub, "runtime.agent")["running"] is False
    assert one(producer.hub, "runtime.process")["present"] is True
    assert one(producer.hub, "history.board") == historical
    assert not any(key in one(producer.hub, "runtime.agent") for key in ("activity", "tokens", "cost"))
    producer.stop()


def test_stale_lock_and_pid_reuse_cannot_apply_previous_native_settings(tmp_path):
    runtime = correlator(tmp_path)
    producer = source(tmp_path)
    reader = ingester(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    producer.attach_ingester(reader)
    runtime.on_process(process(tmp_path), 1, 4096, 0, ts=100)
    path, marker = held_file(reader, [event("session.start", "start", ts=15, selectedModel="gpt-6.1-sol")], lock_at=5)
    producer.poll_native()
    producer.flush_runtime()
    assert entities(producer.hub, "runtime.output") == []
    assert one(producer.hub, "configuration.loaded")["effective_known"] is False
    os.utime(marker, (20, 20))
    producer._queue_candidate(path, "copilot-cli")
    producer.poll_native()
    producer.flush_runtime()
    assert one(producer.hub, "configuration.loaded")["effective_known"] is True
    assert one(producer.hub, "runtime.agent")["native_session_id"] == SID

    runtime.on_process(process(tmp_path, birth=30), None, 5000, 0, ts=101)
    producer.flush_runtime()
    # Even before native polling validates the stale lock again, the old
    # holder's PID+birth cannot bind this new process to its loaded model.
    assert one(producer.hub, "runtime.agent")["native_session_id"] is None
    assert one(producer.hub, "configuration.loaded")["effective_known"] is False
    producer.poll_native()
    producer.flush_runtime()
    assert one(producer.hub, "configuration.loaded")["evidence"] == []
    producer.stop()


def test_configured_file_values_do_not_become_loaded_without_runtime_evidence(tmp_path):
    current = [{"tool": "copilot-cli", "model": "gpt-6-astra", "sections": []}]
    producer = LiveRuntimeSources(
        RecordingHub(), tmp_path, config_provider=lambda _: current, capture_mode=lambda: "full", host="test-host"
    )
    runtime = correlator(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    producer.flush_runtime()
    producer.poll_configuration()
    assert one(producer.hub, "configuration.file")["configured_only"] is True
    assert one(producer.hub, "configuration.loaded")["effective_known"] is False
    current[0]["model"] = "gpt-6.1-sol"
    producer.poll_configuration()
    assert one(producer.hub, "configuration.loaded")["evidence"] == []

    runtime.on_process(process(tmp_path, flags=("--model", "gpt-6-sol")), 2, 2, 0, ts=101)
    producer.flush_runtime()
    loaded = one(producer.hub, "configuration.loaded")
    assert loaded["evidence"][0]["value"] == "gpt-6-sol"
    assert loaded["evidence"][0]["source"] == "process-flag"
    assert loaded["unknown"] == ["reasoning_effort", "approval_policy", "sandbox_policy"]
    producer.stop()


def test_configuration_pending_status_exists_before_any_worker_starts(tmp_path, monkeypatch):
    import aictl.monitoring.live_sources as live

    producer = source(tmp_path)
    starts = []

    class Thread:
        def __init__(self, *, target, name, daemon):
            self.name = name

        def start(self):
            status = one(producer.hub, "source.status")
            assert status["component"] == "configuration"
            assert status["topic"] == "configuration.file"
            assert status["ready"] is False
            assert status["pending"] is True
            assert status["stale"] is False
            assert status["error"] is None
            starts.append(self.name)

        def join(self, timeout):
            pass

    monkeypatch.setattr(live.threading, "Thread", Thread)
    producer.start()
    assert len(starts) == 3
    assert entities(producer.hub, "configuration.file") == []
    assert entities(producer.hub, "source.status")[0]["id"] == "configuration"
    producer.stop()


@pytest.mark.parametrize("prior_success", [False, True])
def test_configuration_error_retains_data_and_unchanged_success_clears_error(tmp_path, prior_success):
    failing = [False]
    configs = [{"tool": "copilot-cli", "model": "gpt-6.1-sol", "sections": []}]

    def provide(_):
        if failing[0]:
            raise RuntimeError("configuration unavailable; token=supersecretvalue123")
        return configs

    producer = LiveRuntimeSources(RecordingHub(), tmp_path, config_provider=provide)
    if prior_success:
        producer.poll_configuration()
        first = entities(producer.hub, "configuration.file")[0]
        status = entities(producer.hub, "source.status")[0]
        assert first["revision"] == status["revision"]
    subscriber = producer.hub.subscribe()
    subscriber.next(0)  # A transport bootstrap alone is not configuration readiness.
    failing[0] = True
    producer.poll_configuration()
    subscriber.next(0)
    status = one(producer.hub, "source.status")
    assert status["ready"] is prior_success
    assert status["pending"] is False
    assert status["stale"] is True
    assert status["topic"] == "configuration.file"
    assert status["error"]
    assert status["reason"] == status["error"]
    assert "supersecretvalue123" not in json.dumps(status)
    if prior_success:
        assert entities(producer.hub, "configuration.file")[0] == first
    else:
        assert entities(producer.hub, "configuration.file") == []
    failing[0] = False
    producer.poll_configuration()
    _, recovered = subscriber.next(0)
    status = one(producer.hub, "source.status")
    assert status["ready"] is True
    assert status["pending"] is False
    assert status["stale"] is False
    assert status["error"] is status["reason"] is None
    assert one(producer.hub, "configuration.file")["tool_configs"][0]["model"] == "gpt-6.1-sol"
    if not prior_success:
        assert {row["topic"] for row in recovered["upserts"]} == {"configuration.file", "source.status"}
        assert len({row["revision"] for row in recovered["upserts"]}) == 1
    subscriber.close()
    producer.stop()


def test_config_live_payload_and_process_flags_do_not_leak_private_content(tmp_path):
    private = "PRIVATE-NOT-FOR-STREAM"
    configs = [{
        "tool": "copilot-cli",
        "settings": {"raw": private},
        "sections": [{"id": "other", "rows": [
            {"key": "systemPrompt", "value": private},
            {"key": "customInstructions", "value": private},
            {"key": "apiKey", "value": private},
            {"key": "endpoint", "value": "https://user:password@example.test"},
            {"key": "model", "value": "gpt-6.1-sol", "set": True},
        ]}],
        "env_vars": [{"name": "TOKEN", "set": True, "value": "••••", "process": private, "persisted": []}],
    }]
    producer = LiveRuntimeSources(RecordingHub(), tmp_path, config_provider=lambda _: configs)
    producer.poll_configuration()
    assert private not in json.dumps(one(producer.hub, "configuration.file"))
    assert "user:password" not in json.dumps(one(producer.hub, "configuration.file"))

    runtime = correlator(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), None, None, 0, ts=100)
    child = ProcessInfo(pid=42, ppid=41, name="git", cmdline=("git", "commit", "-m", private), created_at=11)
    runtime.on_process(child, 0, None, 0, ts=101)
    producer.flush_runtime()
    assert one(producer.hub, "configuration.loaded")["effective_known"] is False
    assert one(producer.hub, "runtime.agent")["mem_mb"] is None
    public = json.dumps([call[3] for call in producer.hub.calls])
    assert private not in public
    assert EXE not in public
    producer.stop()


def test_config_signature_cache_is_shared_and_reloads_atomic_replacement(tmp_path, monkeypatch):
    from aictl.monitoring import tool_config

    path = tmp_path / "settings.json"
    path.write_text("first", encoding="utf-8")
    calls = []

    def collect(_):
        calls.append(1)
        tool_config._LAST_WATCHED = (str(path),)
        return [ToolConfig(tool="copilot-cli", model=path.read_text(encoding="utf-8"))]

    monkeypatch.setattr(tool_config, "collect_tool_configs", collect)
    monkeypatch.setattr(tool_config, "_CURRENT_CONFIGS", {})
    assert tool_config.current_tool_configs(tmp_path)[0]["model"] == "first"
    producer = LiveRuntimeSources(RecordingHub(), tmp_path)
    producer.poll_configuration()
    assert len(calls) == 1
    original = path.stat()
    replacement = tmp_path / "replacement.json"
    replacement.write_text("other", encoding="utf-8")
    os.utime(replacement, ns=(original.st_atime_ns, original.st_mtime_ns))
    replacement.replace(path)
    producer.poll_configuration()
    assert len(calls) == 2
    assert one(producer.hub, "configuration.file")["tool_configs"][0]["model"] == "other"
    producer.stop()


def test_native_fallback_discovers_held_file_without_history_walk(tmp_path, monkeypatch):
    producer = source(tmp_path)
    reader = ingester(tmp_path)
    runtime = correlator(tmp_path)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    held_file(reader, [event("assistant.message", "m1", content="from fallback")])
    monkeypatch.setattr(Path, "rglob", lambda *args: pytest.fail("Native fallback must not walk history"))
    producer.poll_native()
    status = next(
        row["data"] for row in entities(producer.hub, "source.status")
        if row["data"]["producer"] == "native-session-adapter"
    )
    assert status["fallback"] is True
    assert status["poll_interval_s"] == 0.5
    assert one(producer.hub, "runtime.output")["text"] == "from fallback"
    producer.stop()


def test_native_watcher_reuses_ingester_inventory_without_second_folder_scan(tmp_path, monkeypatch):
    reader = ingester(tmp_path)
    path, _ = held_file(reader, [event("assistant.message", "m1", content="cached native file")])
    reader._note_transcript_paths([path], "copilot-cli")
    producer = source(tmp_path)
    runtime = correlator(tmp_path)
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_collector_status("filesystem:watchdog", "active", "native-fs-events", "")
    monkeypatch.setattr(producer, "_discover_copilot", lambda **_: pytest.fail("Do not duplicate the inventory walk"))
    producer.poll_native()
    assert one(producer.hub, "runtime.output")["text"] == "cached native file"
    assert one(producer.hub, "source.status")["fallback"] is False
    producer.stop()


def test_native_filesystem_priority_is_not_displaced_by_history_inventory(tmp_path, monkeypatch):
    import aictl.monitoring.live_sources as live

    monkeypatch.setattr(live, "_MAX_CANDIDATES", 2)
    reader = ingester(tmp_path)
    path, _ = held_file(reader, [event("assistant.message", "m1", content="priority output")])
    producer = source(tmp_path)
    runtime = correlator(tmp_path)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_collector_status("filesystem:watchdog", "active", "native-fs-events", "")
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    runtime.on_file(str(path), event_type="modified")
    for index in range(10):
        producer._queue_candidate(reader.copilot_state / str(index) / "events.jsonl", "copilot-cli")
    producer.poll_native()
    assert one(producer.hub, "runtime.output")["text"] == "priority output"
    producer.stop()


def test_fallback_reconciles_a_resumed_session_in_an_existing_process(tmp_path, monkeypatch):
    import aictl.monitoring.live_sources as live

    clock = [0.0]
    monkeypatch.setattr(live, "time", SimpleNamespace(monotonic=lambda: clock[0]))
    reader = ingester(tmp_path)
    path = reader.copilot_state / SID / "events.jsonl"
    write_rows(path, [event("assistant.message", "m1", content="resumed output")])
    producer = source(tmp_path)
    runtime = correlator(tmp_path)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    producer.poll_native()
    assert entities(producer.hub, "runtime.output") == []
    root_time = reader.copilot_state.stat().st_mtime_ns
    marker = path.parent / "inuse.41.lock"
    marker.touch()
    os.utime(marker, (20, 20))
    # A new lock in an existing session folder does not change the root's
    # directory signature or the long-lived desktop process's PID.
    assert reader.copilot_state.stat().st_mtime_ns == root_time
    clock[0] = 5.1
    producer.poll_native()
    assert one(producer.hub, "runtime.output")["text"] == "resumed output"
    producer.stop()


def test_capture_change_clears_retained_and_unsent_text_without_restoring_old_content(tmp_path):
    capture = ["full"]
    hub = LiveHub(limits=HubLimits(output_entries=2))
    producer = LiveRuntimeSources(
        hub, tmp_path, capture_mode=lambda: capture[0], config_provider=lambda _: [], host="test-host"
    )
    reader = ingester(tmp_path)
    runtime = correlator(tmp_path)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    path, _ = held_file(
        reader,
        [
            event("assistant.message", "a", content="private a"),
            event("assistant.message", "b", content="private b"),
            event("assistant.message", "a", content="updated private a"),
            event("assistant.message", "c", content="private c"),
        ],
    )
    producer.poll_native()
    subscriber = hub.subscribe()
    # Its initial full-text bootstrap is deliberately left unread.
    cursor = f"{hub.epoch}:{hub.sequence}"
    capture[0] = "metadata"
    producer.poll_native()
    kind, reset = subscriber.next(0)
    assert kind == "bootstrap"
    assert reset["reason"] == "native-capture-policy-changed"
    assert not any(row["topic"] == "runtime.output" for row in reset["entities"])
    resumed = hub.subscribe(cursor=cursor)
    try:
        assert not any(row["topic"] == "runtime.output" for row in resumed.next(0)[1]["entities"])
    finally:
        resumed.close()
    capture[0] = "full"
    producer.poll_native()
    assert entities(hub, "runtime.output") == []
    append_rows(path, [event("assistant.message", "d", content="newly captured output")])
    producer.poll_native()
    assert one(hub, "runtime.output")["text"] == "newly captured output"
    subscriber.close()
    producer.stop()


def test_codex_metadata_never_decodes_instruction_bodies_and_omits_analysis(tmp_path, monkeypatch):
    import aictl.monitoring.native_sessions as native

    path = tmp_path / f"rollout-{SID}.jsonl"
    write_rows(path, [
        {"type": "session_meta", "timestamp": 100, "payload": {
            "id": SID, "cwd": str(tmp_path), "base_instructions": {"text": "PRIVATE-SYSTEM"},
        }},
        {"type": "turn_context", "timestamp": 101, "payload": {
            "model": "gpt-6.1-sol", "effort": "xhigh", "approval_policy": "never",
            "sandbox_policy": {"type": "read-only"}, "developer_instructions": "PRIVATE-DEVELOPER",
        }},
        {"type": "response_item", "timestamp": 102, "payload": {
            "type": "message", "role": "assistant", "channel": "analysis",
            "content": [{"type": "output_text", "text": "PRIVATE-REASONING"}],
        }},
        {"type": "response_item", "timestamp": 103, "payload": {
            "id": "final", "type": "message", "role": "assistant", "channel": "final",
            "content": [{"type": "output_text", "text": "public output"}],
        }},
    ])
    loads = native.json.loads

    def safe_loads(raw):
        assert b"PRIVATE-SYSTEM" not in raw
        assert b"PRIVATE-DEVELOPER" not in raw
        return loads(raw)

    monkeypatch.setattr(native.json, "loads", safe_loads)
    tail = NativeSessionTail(path, "codex-cli", SID, process_started_at=10)
    seen = []
    tail.refresh(capture="full", emit=seen.append)
    assert tail.metadata_limited is True
    assert {key: value["value"] for key, value in tail.evidence.items()} == {
        "model": "gpt-6.1-sol", "reasoning_effort": "xhigh", "approval_policy": "never", "sandbox_policy": "read-only",
    }
    assert [item["text"] for item in seen if item["text"]] == ["public output"]
    assert "PRIVATE-REASONING" not in json.dumps(seen)


def test_claude_adapter_only_emits_text_and_uses_reported_turn_end(tmp_path):
    path = tmp_path / f"{SID}.jsonl"
    write_rows(path, [{
        "type": "assistant", "timestamp": 100, "cwd": str(tmp_path),
        "message": {"id": "m1", "model": "recorded-model", "stop_reason": "end_turn", "content": [
            {"type": "thinking", "thinking": "PRIVATE-THINKING"},
            {"type": "tool_use", "name": "task", "input": {"prompt": "PRIVATE-ARGUMENT"}},
            {"type": "text", "text": "public output"},
        ]},
    }])
    tail = NativeSessionTail(path, "claude-code", SID, process_started_at=10)
    seen = []
    tail.refresh(capture="full", emit=seen.append)
    assert [item["text"] for item in seen] == ["public output"]
    assert tail.status == "idle"
    assert tail.evidence["model"]["value"] == "recorded-model"
    assert "PRIVATE-" not in json.dumps(seen)


def test_undated_old_native_reports_do_not_become_current_process_evidence(tmp_path):
    path = tmp_path / "events.jsonl"
    old = event("session.start", "old", selectedModel="old-model")
    old.pop("timestamp")
    write_rows(path, [old])
    tail = NativeSessionTail(path, "copilot-cli", SID, process_started_at=10)
    seen = []
    tail.refresh(capture="full", emit=seen.append)
    assert seen == []
    assert tail.evidence == {}
    new = event("session.model_change", "new", newModel="current-model")
    new.pop("timestamp")
    append_rows(path, [new])
    tail.refresh(capture="full", emit=seen.append)
    assert tail.evidence["model"]["value"] == "current-model"
    assert tail.evidence["model"]["observed_at"] is None


def test_oversized_native_record_forces_explicit_rebaseline_not_silent_loss(tmp_path):
    reader = ingester(tmp_path)
    producer = source(tmp_path)
    runtime = correlator(tmp_path)
    producer.attach_ingester(reader)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    path, _ = held_file(reader, [event("assistant.turn_start", "start", turnId="t1")])
    producer.poll_native()
    producer.flush_runtime()
    subscriber = producer.hub.subscribe()
    subscriber.next(0)
    append_rows(path, [event("assistant.message", "too-large", content="x" * (MAX_LINE_BYTES + 100))])
    append_rows(path, [event("assistant.message", "after-gap", content="retained output")])
    producer.poll_native()
    producer.flush_runtime()
    kind, reset = subscriber.next(0)
    assert kind == "bootstrap"
    assert reset["reason"] == "native-record-gap"
    assert reset["ordered_gap"] is True
    assert one(producer.hub, "runtime.agent")["native_activity"] == "unknown"
    assert any(row["data"].get("text") == "retained output" for row in reset["entities"])
    subscriber.close()
    producer.stop()


def test_collector_reuses_native_parent_snapshot_and_resets_reused_handle(tmp_path, monkeypatch):
    from aictl import platforms
    from aictl.monitoring.collectors import process as collector_module

    native_calls = []
    state = {"birth": 10.0, "flags": ("--model", "gpt-6-sol"), "parent": 1}
    monkeypatch.setattr(collector_module, "IS_WINDOWS", True)
    monkeypatch.setattr(platforms, "_windows_parent_snapshot", None)
    monkeypatch.setattr(platforms, "windows_process_parents", lambda: native_calls.append(1) or {41: state["parent"]})

    class FakeError(Exception):
        pass

    class FakeAccessDenied(FakeError):
        pass

    class Handle:
        def __init__(self, _=None):
            self.birth = state["birth"]
            self.info = {"pid": 41, "name": "copilot"}

        def as_dict(self, _):
            return {"cmdline": [EXE, *state["flags"]], "exe": EXE}

        def create_time(self):
            if state.get("denied_birth"):
                raise FakeAccessDenied()
            return self.birth

        def is_running(self):
            return self.birth == state["birth"]

        def cpu_percent(self, _):
            return 25

        def memory_info(self):
            if state.get("denied"):
                raise FakeAccessDenied()
            return SimpleNamespace(rss=1024)

        def cwd(self):
            return str(tmp_path)

        def oneshot(self):
            return contextlib.nullcontext()

    def process_iter(fields):
        assert "ppid" not in fields
        return [Handle()]

    psutil = SimpleNamespace(Error=FakeError, AccessDenied=FakeAccessDenied, Process=Handle, process_iter=process_iter)
    collector = PsutilProcessCollector(MonitorConfig(root=tmp_path, workspace_paths=(), state_paths=()))
    first = collector._snapshot(psutil)[41]
    second = collector._snapshot(psutil)[41]
    assert first["cpu_percent"] is None
    assert second["cpu_percent"] == 25
    assert first["process"].ppid == 1
    assert len(native_calls) == 1
    state["denied"] = True
    protected = collector._snapshot(psutil)[41]
    assert protected["memory_rss"] is None
    assert protected["process"].created_at == 10
    state["denied"] = False
    state["denied_birth"] = True
    protected_collector = PsutilProcessCollector(MonitorConfig(root=tmp_path, workspace_paths=(), state_paths=()))
    unknown_birth = protected_collector._snapshot(psutil)[41]
    assert unknown_birth["process"].created_at is None
    assert unknown_birth["memory_rss"] is None
    state["denied_birth"] = False
    state.update(birth=11, flags=("--model", "gpt-6.1-sol"), parent=2)
    reused = collector._snapshot(psutil)[41]
    assert reused["process"].created_at == 11
    assert reused["process"].cmdline[-1] == "gpt-6.1-sol"
    assert reused["process"].ppid == 2
    assert reused["cpu_percent"] is None
    assert reused["replaced"] is True
    assert len(native_calls) == 2


# ── Processes with no session, and a session file state that arrives after the first sample ──


def test_newest_known_session_file_state_wins_over_a_stale_unknown_sample():
    from aictl.monitoring.live_sources import _with_session_file

    sid = "062629b0-4651-4769-a3d8-3d9a1ed0735f"
    # The wrapper was sampled before Claude Code wrote "status"; its child carries the state read since.
    samples = [{"native_session_id": sid, "native_state": "unknown", "native_status_at": None},
               {"native_session_id": sid, "native_state": "idle", "native_status_at": 1_795_423_849.4}]
    out = _with_session_file({"session_id": sid, "status": "unknown"}, samples)
    assert (out["status"], out["status_source"]) == ("idle", "session file")
    assert _with_session_file({"session_id": sid}, samples[:1]) == {"session_id": sid}


def test_an_unlinked_process_says_why_and_a_linked_one_does_not(tmp_path):
    from aictl.monitoring.live_sources import UNLINKED_REASONS, unlinked_reason
    from aictl.monitoring.native_binding import NativeBinder

    # The binder looks for per-process session evidence for exactly these tools.
    assert set(UNLINKED_REASONS) == set(NativeBinder()._homes)
    assert "sessions/<pid>.json" in unlinked_reason("claude-code")
    assert unlinked_reason("openclaw") == "aictl has no session source for this tool"
    assert "Copilot CLI" in unlinked_reason("copilot-desktop")

    runtime = correlator(tmp_path)
    producer = source(tmp_path)
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(process(tmp_path), 1, 1, 0, ts=100)
    producer.flush_runtime()
    agent = one(producer.hub, "runtime.agent")
    assert agent["native_session_id"] is None and agent["unlinked_reason"] == unlinked_reason("copilot-cli")
    producer.stop()
