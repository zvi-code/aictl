"""Tests for live monitoring."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import Mock

from click.testing import CliRunner

from aictl.cli import main
from aictl.monitoring.collectors.network import parse_nettop_line, parse_ss_snapshot
from aictl.monitoring.collectors.process import PsutilProcessCollector, classify_process
from aictl.monitoring.collectors.telemetry import StructuredTelemetryCollector
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import MonitorSnapshot, SessionCorrelator
from aictl.monitoring.runtime import CollectorPlan
from aictl.monitoring.session import ProcessInfo


def test_process_classifier_distinguishes_codex_from_vscode():
    codex = ProcessInfo(
        pid=1,
        ppid=0,
        name="codex",
        exe="/usr/local/bin/codex",
        cmdline=("codex",),
        username=None,
        cwd=None,
    )
    code_helper = ProcessInfo(
        pid=2,
        ppid=0,
        name="Code Helper (Plugin)",
        exe=None,
        cmdline=("Code Helper (Plugin)",),
        username=None,
        cwd=None,
    )
    claude_desktop = ProcessInfo(
        pid=3,
        ppid=0,
        name="Claude",
        exe="/Applications/Claude.app/Contents/MacOS/Claude",
        cmdline=("/Applications/Claude.app/Contents/MacOS/Claude",),
        username=None,
        cwd=None,
    )

    assert classify_process(codex).tool == "codex-cli"
    assert classify_process(code_helper).tool == "copilot-vscode"
    assert classify_process(claude_desktop).tool == "claude-desktop"


def test_parse_nettop_line_emits_deltas():
    previous = {71420: (1000, 2000)}
    line = "20:19:31.649777,Code Helper.71420,,,1500,2800,0,0,0,,,,,,,,,,,,"

    sample = parse_nettop_line(line, previous)

    assert sample is not None
    assert sample.pid == 71420
    assert sample.name == "Code Helper"
    assert sample.bytes_in == 500
    assert sample.bytes_out == 800


def test_parse_ss_snapshot(monkeypatch):
    sample = "\n".join(
        [
            'ESTAB 0 0 127.0.0.1:12345 104.18.32.47:443 users:(("codex",pid=42,fd=29))',
            "\t cubic wscale:7,7 rto:201 rtt:0.677/0.207 ato:40 mss:1448 pmtu:1500 rcvmss:536 advmss:1448 cwnd:10 bytes_sent:2048 bytes_acked:2048 bytes_received:1024",
        ]
    )
    monkeypatch.setattr(
        "aictl.monitoring.collectors.network.subprocess.run",
        lambda *args, **kwargs: Mock(returncode=0, stdout=sample),
    )

    snapshot = parse_ss_snapshot()

    assert snapshot[(42, "127.0.0.1:12345", "104.18.32.47:443")] == (1024, 2048, "codex")


def test_correlator_resolves_network_pid_from_process_collector(tmp_path):
    """Network samples with short names (e.g. 'node' from nettop) resolve
    to a session when the process collector has already classified the PID."""
    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    # Process collector registers the PID with full cmdline
    rich_proc = ProcessInfo(
        pid=555,
        ppid=1,
        name="node",
        exe="/usr/local/bin/node",
        cmdline=("node", "/usr/local/bin/claude", "--print"),
        cwd=str(tmp_path),
    )
    correlator.on_process(rich_proc, cpu_percent=10.0, memory_rss=0, child_count=0, is_new=True)

    # Network collector sends a sample with only the short name
    session_id = correlator.on_network(
        555,
        bytes_in=1024,
        bytes_out=2048,
        process=ProcessInfo(pid=555, ppid=None, name="node"),
    )

    assert session_id is not None
    # The session should have the network bytes
    session = correlator.sessions[session_id]
    assert session.tool == "claude-code"
    assert session.inbound_bytes > 0


def test_correlator_pid_reuse_creates_new_session(tmp_path):
    """A process that reuses a PID from an old session (>10min ago) must
    create a new session rather than reattaching to the stale one."""
    import time as _time

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    now = _time.time()
    old_ts = now - 3600  # 1 hour ago

    # First session with PID 7777
    proc_old = ProcessInfo(
        pid=7777,
        ppid=1,
        name="claude",
        cmdline=("claude",),
        cwd=str(tmp_path),
    )
    correlator.on_process(proc_old, cpu_percent=5.0, memory_rss=0, child_count=0, ts=old_ts, is_new=True)
    old_session_id = correlator.pid_to_session[7777]

    # Simulate exit 5 minutes later (last_seen_at = old_ts + 300)
    correlator.on_process_exit(7777, ts=old_ts + 300)

    # New process reuses PID 7777, much later (well beyond 10min window)
    new_ts = now
    proc_new = ProcessInfo(
        pid=7777,
        ppid=1,
        name="claude",
        cmdline=("claude",),
        cwd=str(tmp_path),
    )
    correlator.on_process(proc_new, cpu_percent=3.0, memory_rss=0, child_count=0, ts=new_ts, is_new=True)
    new_session_id = correlator.pid_to_session[7777]

    assert new_session_id != old_session_id, "Reused PID should create a new session, not reattach to old one"
    assert len(correlator.sessions) == 2


def test_correlator_brief_disappearance_reattaches(tmp_path):
    """A process that briefly disappears from a scan (e.g. missed one cycle)
    and reappears within 10 minutes must reattach to its existing session,
    NOT create a duplicate."""
    import time as _time

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    now = _time.time()
    proc = ProcessInfo(
        pid=9999,
        ppid=1,
        name="claude",
        cmdline=("claude",),
        cwd=str(tmp_path),
    )
    correlator.on_process(proc, cpu_percent=5.0, memory_rss=0, child_count=0, ts=now, is_new=True)
    original_sid = correlator.pid_to_session[9999]

    # Process disappears from scan (missed cycle)
    correlator.on_process_exit(9999, ts=now + 5)

    # Reappears 10 seconds later — same session
    correlator.on_process(proc, cpu_percent=3.0, memory_rss=0, child_count=0, ts=now + 15, is_new=True)
    reattached_sid = correlator.pid_to_session[9999]

    assert reattached_sid == original_sid, "Brief disappearance should reattach to existing session"
    assert len(correlator.sessions) == 1


def test_correlator_resolves_network_via_parent_pid(tmp_path):
    """Network for a child PID resolves via stored ppid even when nettop
    provides ppid=None."""
    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    # Parent process is a known claude-code session
    parent = ProcessInfo(
        pid=100,
        ppid=1,
        name="claude",
        cmdline=("claude",),
    )
    correlator.on_process(parent, cpu_percent=5.0, memory_rss=0, child_count=1, is_new=True)

    # Child process registered by process collector with ppid
    child = ProcessInfo(pid=200, ppid=100, name="node", cmdline=("node",))
    correlator.on_process(child, cpu_percent=1.0, memory_rss=0, child_count=0, is_new=False)

    # Network arrives for child with ppid=None (nettop doesn't know ppid)
    session_id = correlator.on_network(
        200,
        bytes_in=512,
        bytes_out=256,
        process=ProcessInfo(pid=200, ppid=None, name="node"),
    )

    assert session_id is not None
    session = correlator.sessions[session_id]
    assert session.tool == "claude-code"


def test_correlator_builds_report(tmp_path):
    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config, workspace_sizes={str(tmp_path): 5 * 1024 * 1024})

    process = ProcessInfo(
        pid=101,
        ppid=1,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "chat"),
        username="user",
        cwd=str(tmp_path),
    )
    correlator.on_process(process, cpu_percent=32.0, memory_rss=0, child_count=0, is_new=True)
    correlator.on_network(101, bytes_in=6000, bytes_out=24000)
    correlator.on_file(
        str(tmp_path / ".copilot" / "session-state" / "one.json"),
        growth_bytes=4096,
        tool_hint="copilot-cli",
        workspace=str(tmp_path),
    )
    correlator.on_telemetry(input_tokens=1200, output_tokens=400, tool_hint="copilot-cli")

    reports = correlator.tool_reports()

    assert len(reports) == 1
    report = reports[0]
    assert report.tool == "copilot-cli"
    assert report.pid_count == 1
    assert report.workspace_size_mb == 5.0
    assert report.token_estimate.source == "telemetry"
    assert report.token_estimate.input_tokens == 1200
    assert report.files_touched == 1
    assert report.state_bytes_written == 4096

    # Verify state_bytes_written appears in serialized output
    report_dict = report.to_dict()
    assert report_dict["state_bytes_written"] == 4096


def test_monitor_doctor_cli_json(monkeypatch, tmp_path):
    class DummyRuntime:
        def __init__(self, config):
            self.config = config

        async def snapshot_after(self, seconds):
            return MonitorSnapshot(
                generated_at=0.0,
                platform="macos",
                diagnostics={
                    "process:psutil": {
                        "status": "active",
                        "mode": "polling",
                        "detail": "ok",
                    }
                },
                tools=[],
                workspace_paths=[str(tmp_path)],
                state_paths=[],
            )

        def collector_plan(self):
            return CollectorPlan(names=["process:psutil", "network:macos-bpf"])

    monkeypatch.setattr("aictl.commands.daemon.MonitorRuntime", DummyRuntime)

    result = CliRunner().invoke(main, ["daemon", "monitor", "doctor", "-r", str(tmp_path), "--json"])

    assert result.exit_code == 0
    assert '"platform": "macos"' in result.output
    assert '"process:psutil"' in result.output


def test_correlator_process_tree_with_agent_roles(tmp_path):
    """Process tree classifies lead, teammate, and subprocess roles."""
    import time as _time

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    # Lead process (root of session)
    lead = ProcessInfo(
        pid=100,
        ppid=1,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "chat"),
        cwd=str(tmp_path),
    )
    # Teammate (same tool, child of lead)
    teammate = ProcessInfo(
        pid=101,
        ppid=100,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "--teammate"),
        cwd=str(tmp_path),
    )
    # Subprocess (non-tool child of lead)
    child = ProcessInfo(
        pid=102,
        ppid=100,
        name="git",
        exe="/usr/bin/git",
        cmdline=("git", "status"),
        cwd=str(tmp_path),
    )
    # Subagent (same tool, child of teammate)
    subagent = ProcessInfo(
        pid=103,
        ppid=101,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "--subagent"),
        cwd=str(tmp_path),
    )

    ts = _time.time()
    correlator.on_process(lead, cpu_percent=10.0, memory_rss=100_000_000, child_count=0, ts=ts, is_new=True)
    correlator.on_process(teammate, cpu_percent=5.0, memory_rss=80_000_000, child_count=0, ts=ts, is_new=True)
    correlator.on_process(child, cpu_percent=0.5, memory_rss=10_000_000, child_count=0, ts=ts, is_new=True)
    correlator.on_process(subagent, cpu_percent=3.0, memory_rss=60_000_000, child_count=0, ts=ts, is_new=True)

    sessions = correlator.active_sessions()
    assert len(sessions) == 1

    tree = sessions[0]["process_tree"]
    assert len(tree) == 1  # single root

    root = tree[0]
    assert root["pid"] == 100
    assert root["role"] == "lead"
    assert len(root["children"]) == 2  # teammate + git subprocess

    # Find teammate and subprocess among children
    roles = {c["pid"]: c["role"] for c in root["children"]}
    assert roles[101] == "teammate"
    assert roles[102] == "subprocess"

    # Find subagent under teammate
    teammate_node = [c for c in root["children"] if c["pid"] == 101][0]
    assert len(teammate_node["children"]) == 1
    assert teammate_node["children"][0]["pid"] == 103
    assert teammate_node["children"][0]["role"] == "subagent"


def test_correlator_process_tree_empty_when_no_processes(tmp_path):
    """Process tree is empty list when session has no live process info."""
    import time as _time

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    # Create a session via telemetry (no process data)
    correlator.on_telemetry(input_tokens=100, output_tokens=50, tool_hint="copilot-cli", ts=_time.time())

    sessions = correlator.active_sessions()
    assert len(sessions) == 1
    assert sessions[0]["process_tree"] == []


def test_session_project_derived_from_git_root(tmp_path):
    """SessionState.project is derived from cwd → git root."""
    import time as _time

    # Create a fake git repo
    (tmp_path / ".git").mkdir()
    subdir = tmp_path / "src" / "app"
    subdir.mkdir(parents=True)

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    process = ProcessInfo(
        pid=200,
        ppid=1,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "chat"),
        cwd=str(subdir),  # cwd is a subdirectory of the git root
    )
    correlator.on_process(process, cpu_percent=5.0, memory_rss=0, child_count=0, ts=_time.time(), is_new=True)

    sessions = correlator.active_sessions()
    assert len(sessions) == 1
    # Project should be the git root, not the subdirectory
    assert sessions[0]["project"] == str(tmp_path)


def test_session_project_fallback_to_cwd(tmp_path):
    """Without a .git directory, project falls back to cwd."""
    import time as _time

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    process = ProcessInfo(
        pid=201,
        ppid=1,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "chat"),
        cwd=str(tmp_path),
    )
    correlator.on_process(process, cpu_percent=5.0, memory_rss=0, child_count=0, ts=_time.time(), is_new=True)

    sessions = correlator.active_sessions()
    assert len(sessions) == 1
    assert sessions[0]["project"] == str(tmp_path.resolve())


def test_session_files_loaded_from_on_file(tmp_path):
    """Files with sent_to_llm=yes/conditional are tracked in files_loaded."""
    import time as _time

    config = MonitorConfig.for_root(tmp_path)
    correlator = SessionCorrelator(config)

    process = ProcessInfo(
        pid=202,
        ppid=1,
        name="copilot",
        exe="/usr/local/bin/copilot",
        cmdline=("copilot", "chat"),
        cwd=str(tmp_path),
    )
    correlator.on_process(process, cpu_percent=5.0, memory_rss=0, child_count=0, ts=_time.time(), is_new=True)

    # File with sent_to_llm=yes → should be in files_loaded
    correlator.on_file(
        str(tmp_path / "CLAUDE.md"),
        growth_bytes=0,
        tool_hint="copilot-cli",
        workspace=str(tmp_path),
        sent_to_llm="yes",
    )
    # File with sent_to_llm=conditional → also in files_loaded
    correlator.on_file(
        str(tmp_path / ".copilot" / "rules" / "auth.md"),
        growth_bytes=0,
        tool_hint="copilot-cli",
        workspace=str(tmp_path),
        sent_to_llm="conditional",
    )
    # File without sent_to_llm → NOT in files_loaded
    correlator.on_file(
        str(tmp_path / "output.log"),
        growth_bytes=100,
        tool_hint="copilot-cli",
        workspace=str(tmp_path),
    )

    sessions = correlator.active_sessions()
    assert len(sessions) == 1
    loaded = sessions[0]["files_loaded"]
    assert str(tmp_path / "CLAUDE.md") in loaded
    assert str(tmp_path / ".copilot" / "rules" / "auth.md") in loaded
    assert str(tmp_path / "output.log") not in loaded
    # All three should be in files_touched
    assert len(sessions[0]["files_touched"]) == 3


class _RecordingSink:
    """Minimal sink stub capturing every emitted sample."""

    def __init__(self):
        self.samples: list[tuple[str, float, dict]] = []

    def emit_with_sensitivity(self, metric, value, tags=None, ts=None, **_kwargs):
        self.samples.append((metric, value, dict(tags or {})))

    def emit_if_changed(self, metric, value, tags=None, ts=None):
        self.samples.append((metric, value, dict(tags or {})))

    def values(self, metric):
        return [value for name, value, _ in self.samples if name == metric]


def test_tool_report_memory_is_summed_rss_not_cpu(tmp_path):
    """aictl.tool.memory must be the summed per-PID RSS in bytes.

    Regression: the old emission was ``peak_cpu_percent * 1048576`` — CPU
    dressed up as memory."""
    config = MonitorConfig.for_root(tmp_path)
    sink = _RecordingSink()
    correlator = SessionCorrelator(config, sink=sink)

    parent = ProcessInfo(pid=301, ppid=1, name="claude", cmdline=("claude",), cwd=str(tmp_path))
    child = ProcessInfo(pid=302, ppid=301, name="node", cmdline=("node",))
    correlator.on_process(parent, cpu_percent=87.0, memory_rss=100 * 1048576, child_count=1, is_new=True)
    correlator.on_process(child, cpu_percent=3.0, memory_rss=50 * 1048576, child_count=0, is_new=True)

    reports = correlator.tool_reports()
    assert len(reports) == 1
    report = reports[0]
    assert report.memory_rss_bytes == 150 * 1048576
    assert report.to_dict()["memory_rss_bytes"] == 150 * 1048576

    emitted = sink.values("aictl.tool.memory")
    assert emitted == [150 * 1048576], "metric must equal the summed RSS bytes"
    # Guard against the old bug: the CPU-derived value must not come back.
    cpu_derived = round(float(report.peak_cpu_percent * 1048576) / 65536) * 65536
    assert emitted[0] != cpu_derived


def test_session_for_tool_prefers_workspace_match(tmp_path):
    """Two concurrent same-tool sessions in different workspaces: an event
    carrying a workspace hint must land on the session whose workspace
    matches, not simply on the most recently seen one."""
    import time as _time

    root = tmp_path.resolve()
    ws_a = root / "proj-a"
    ws_b = root / "proj-b"
    ws_a.mkdir()
    ws_b.mkdir()
    config = MonitorConfig(root=root, workspace_paths=(ws_a, ws_b), state_paths=())
    correlator = SessionCorrelator(config)

    now = _time.time()
    proc_b = ProcessInfo(pid=402, ppid=1, name="claude", cmdline=("claude",), cwd=str(ws_b))
    proc_a = ProcessInfo(pid=401, ppid=1, name="claude", cmdline=("claude",), cwd=str(ws_a))
    correlator.on_process(proc_b, cpu_percent=1.0, memory_rss=0, child_count=0, ts=now - 10, is_new=True)
    # Session A is the most recently seen — the workspace hint must still win.
    correlator.on_process(proc_a, cpu_percent=1.0, memory_rss=0, child_count=0, ts=now, is_new=True)

    session_a = correlator.sessions[correlator.pid_to_session[401]]
    session_b = correlator.sessions[correlator.pid_to_session[402]]
    assert session_a is not session_b

    correlator.on_telemetry(
        input_tokens=500,
        output_tokens=100,
        tool_hint="claude-code",
        workspace=str(ws_b),
        ts=now + 1,
    )
    assert session_b.exact_input_tokens == 500
    assert session_a.exact_input_tokens == 0

    # Without a hint the most recent session still wins (documented fallback).
    correlator.on_telemetry(input_tokens=10, output_tokens=1, tool_hint="claude-code", ts=now + 2)
    assert session_b.exact_input_tokens == 510


# ── Structured telemetry collector: cumulative rewrite-in-place JSON ─


def _telemetry_collector(tmp_path):
    config = MonitorConfig(root=tmp_path, workspace_paths=(tmp_path,), state_paths=())
    return StructuredTelemetryCollector(config)


def test_cumulative_json_emits_deltas_not_lifetime_totals(tmp_path):
    """Rewrite-in-place cumulative JSON (e.g. ~/.claude/stats-cache.json)
    must baseline on first sight and emit only positive deltas — the old
    tail path re-ingested the full lifetime totals on every rewrite."""
    import os as _os

    collector = _telemetry_collector(tmp_path)
    stats = tmp_path / "stats-cache.json"
    stats.write_text(json.dumps({"input_tokens": 1000, "output_tokens": 100}))
    _os.utime(stats, (1_000_000, 1_000_000))

    # First sight: lifetime totals are a baseline, nothing is emitted.
    assert collector._parse_file(stats) == []

    # Rewrite in place with grown totals → only the delta is emitted.
    stats.write_text(json.dumps({"input_tokens": 1500, "output_tokens": 150}))
    _os.utime(stats, (1_000_010, 1_000_010))
    samples = collector._parse_file(stats)
    assert len(samples) == 1
    assert samples[0]["input_tokens"] == 500
    assert samples[0]["output_tokens"] == 50

    # Unchanged file → nothing (mtime/size guard, no duplicate adds).
    assert collector._parse_file(stats) == []


def test_cumulative_json_shrink_rebaselines(tmp_path):
    """A shrinking counter (file replaced / reset) must re-baseline without
    emitting negative deltas or re-adding absolute totals."""
    import os as _os

    collector = _telemetry_collector(tmp_path)
    stats = tmp_path / "usage-totals.json"
    stats.write_text(json.dumps({"input_tokens": 1000, "output_tokens": 100}))
    _os.utime(stats, (1_000_000, 1_000_000))
    assert collector._parse_file(stats) == []

    # Counter reset: totals shrink → re-baseline, no emission.
    stats.write_text(json.dumps({"input_tokens": 200, "output_tokens": 20}))
    _os.utime(stats, (1_000_010, 1_000_010))
    assert collector._parse_file(stats) == []

    # Growth from the new baseline emits only the new delta.
    stats.write_text(json.dumps({"input_tokens": 300, "output_tokens": 25}))
    _os.utime(stats, (1_000_020, 1_000_020))
    samples = collector._parse_file(stats)
    assert len(samples) == 1
    assert samples[0]["input_tokens"] == 100
    assert samples[0]["output_tokens"] == 5


def test_jsonl_files_still_tail_per_line(tmp_path):
    """Append-only JSONL keeps the offset-tail behavior: each appended line
    is an independent per-request sample."""
    collector = _telemetry_collector(tmp_path)
    log = tmp_path / "usage-events.jsonl"
    log.write_text(json.dumps({"input_tokens": 10, "output_tokens": 1}) + "\n")
    samples = collector._parse_file(log)
    assert [(s["input_tokens"], s["output_tokens"]) for s in samples] == [(10, 1)]

    with log.open("a") as handle:
        handle.write(json.dumps({"input_tokens": 20, "output_tokens": 2}) + "\n")
    samples = collector._parse_file(log)
    assert [(s["input_tokens"], s["output_tokens"]) for s in samples] == [(20, 2)]


def test_process_collector_sticky_pids():
    """Once a PID is classified as AI-tool-related, keep tracking it
    even if classify_process is inconsistent on subsequent cycles."""
    from collections import defaultdict

    collector = PsutilProcessCollector(
        MonitorConfig(
            root=Path("/tmp"),
            workspace_paths=(),
            state_paths=(),
        )
    )

    # Cycle 1: PID 100 is a claude-code root (name matches ^claude$ pattern)
    procs_cycle1 = {
        100: {
            "pid": 100,
            "ppid": 1,
            "name": "claude",
            "cmdline": ("claude", "-p", "hello"),
            "exe": "/usr/bin/claude",
            "username": "dev",
        },
        200: {
            "pid": 200,
            "ppid": 100,
            "name": "node",
            "cmdline": ("node", "worker"),
            "exe": "/usr/bin/node",
            "username": "dev",
        },
    }
    children1 = defaultdict(set, {100: {200}})
    tracked1 = collector._tracked_pids(procs_cycle1, children1)
    assert 100 in tracked1, "root should be tracked"
    assert 200 in tracked1, "child should be tracked"

    # Cycle 2: classify_process no longer sees PID 100 as root
    # (simulates cmdline temporarily unavailable — returns empty tuple)
    procs_cycle2 = {
        100: {"pid": 100, "ppid": 1, "name": "node", "cmdline": (), "exe": None, "username": "dev"},
        200: {
            "pid": 200,
            "ppid": 100,
            "name": "node",
            "cmdline": ("node", "worker"),
            "exe": "/usr/bin/node",
            "username": "dev",
        },
    }
    children2 = defaultdict(set, {100: {200}})
    tracked2 = collector._tracked_pids(procs_cycle2, children2)
    assert 100 in tracked2, "sticky PID should survive inconsistent classification"
    assert 200 in tracked2, "child of sticky PID should still be tracked"

    # Cycle 3: PID 100 is gone (process actually exited)
    procs_cycle3 = {
        200: {
            "pid": 200,
            "ppid": 1,
            "name": "node",
            "cmdline": ("node", "worker"),
            "exe": "/usr/bin/node",
            "username": "dev",
        },
    }
    children3: dict = defaultdict(set)
    tracked3 = collector._tracked_pids(procs_cycle3, children3)
    assert 100 not in tracked3, "exited PID should be pruned"
    assert 100 not in collector._sticky_pids, "exited PID should leave sticky set"


def test_process_collector_snapshot_tolerates_psutil_error():
    """Regression: `_snapshot` referenced `psutil.Error` but only receives
    `psutil_module` as a parameter (psutil is imported locally inside
    `run()`). A single process that raised during iteration would
    therefore trigger NameError and crash the whole monitor event loop —
    surfacing as 'Monitor event loop exited: name psutil is not defined'
    in the daemon log."""

    class FakePsutilError(Exception):
        pass

    class FakeProc:
        def __init__(self, raise_on_info: bool = False):
            self._raise = raise_on_info
            self._info = {
                "pid": 42,
                "ppid": 1,
                "name": "claude",
                "cmdline": ["claude", "-p", "x"],
                "exe": "/usr/bin/claude",
                "username": "dev",
            }

        @property
        def info(self):
            if self._raise:
                raise FakePsutilError("NoSuchProcess")
            return self._info

    class FakePsutil:
        Error = FakePsutilError

        @staticmethod
        def process_iter(_fields):
            # Second proc raises — snapshot must keep going, not crash.
            return [FakeProc(raise_on_info=True), FakeProc(raise_on_info=False)]

        class Process:  # noqa: D401 - dummy
            def __init__(self, _pid):
                raise FakePsutilError("handle open fails")

    collector = PsutilProcessCollector(MonitorConfig(root=Path("/tmp"), workspace_paths=(), state_paths=()))
    # Must not raise NameError or FakePsutilError.
    snap = collector._snapshot(FakePsutil)
    assert snap == {}, "all handles fail, so the snapshot is empty but the loop survived"
