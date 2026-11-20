"""Numbers on the older dashboard screens must come from the whole store.

Each test pins one case where a screen used to show a page, a last sample or
a placeholder zero as if it were the total.
"""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from kusto_replay import NOW

from aictl.dashboard.hooks_status import _activity, _post_tool_use_usage, _subagent_usage
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import SessionCorrelator
from aictl.monitoring.session import ProcessInfo
from aictl.dashboard.projections.history import HistoryScope


def test_session_tool_totals_count_every_stored_call(kusto_store):
    for i in range(30):
        kusto_store.insert("tool_invocations", ts=NOW - i, session_id="s1", tool="claude-code",
                           tool_name="Bash" if i % 3 == 0 else "Read", is_error=int(i % 10 == 0),
                           source_event_id=f"u{i}")
    history = HistoryScope.local(kusto_store)
    rows = history.read("tools.totals", sid="s1")
    assert {row["tool_name"]: row["calls"] for row in rows} == {"Bash": 10, "Read": 20}
    assert sum(row["failures"] for row in rows) == 3
    assert history.read("tools.totals", sid="other") == []


# ── 3. Agents tab: counts come from the store ─────────────────────


def test_agents_activity_counts_stored_calls_skills_and_subagents(kusto_store):
    db, now = kusto_store, NOW
    for i in range(4):
        db.insert("tool_invocations", ts=now - 10 - i, session_id="s1", tool="claude-code", tool_name="Read", source_event_id=f"r{i}")
    db.insert("tool_invocations", ts=now - 5, session_id="s1", tool="claude-code", tool_name="Skill")
    db.insert("skill_uses", dedup_key="k1", ts=now - 5, session_id="s1", tool="claude-code", project_path="/w", name="review-pr")
    db.insert("agents", agent_id="a1", session_id="s1", tool="claude-code", is_sidechain=1, started_at=now - 100, ended_at=now - 50)
    db.insert("agents", agent_id="old", session_id="s0", tool="claude-code", is_sidechain=1, started_at=now - 90_000, ended_at=now - 89_000)
    activity = _activity(db.history_store.reader, now - 86400)
    skills, calls = _post_tool_use_usage(activity)
    assert calls["by_tool"] == {"claude-code": 4}  # the Skill call is a skill use, not a general call
    assert calls["by_tool_name"]["claude-code"] == {"Read": 4}
    assert skills["by_tool"] == {"claude-code": 1}
    assert skills["by_skill"] == [{"skill": "review-pr", "count": 1}]
    sub = _subagent_usage(activity)
    assert sub["by_tool"]["claude-code"] == {"starts": 1, "stops": 1}
    assert sub["starts_24h"] == 1


def test_agents_activity_does_not_double_count_hook_and_store(kusto_store):
    db, now = kusto_store, NOW
    db.insert("events", ts=now - 20, tool="claude-code", kind="hook:PostToolUse", session_id="s1", detail='{"tool_name":"Read"}')
    db.insert("tool_invocations", ts=now - 20, session_id="s1", tool="claude-code", tool_name="Read", source_event_id="x")
    _, calls = _post_tool_use_usage(_activity(db.history_store.reader, now - 86400))
    assert calls["by_tool_name"]["claude-code"] == {"Read": 1}


def test_subagent_starts_are_not_cut_at_50_events(kusto_store):
    db, now = kusto_store, NOW
    for i in range(80):
        db.insert("events", ts=now - 100 + i * 0.01, tool="claude-code", kind="hook:SubagentStart", session_id="s",
                  detail='{"agent_id":"a%d"}' % i)
    sub = _subagent_usage(_activity(db.history_store.reader, now - 86400))
    assert sub["starts_24h"] == 80
    assert len(sub["recent"]) == 10


# ── 4. Token estimate for large files ─────────────────────────────


def test_large_file_gets_a_size_based_token_estimate(tmp_path, monkeypatch):
    from aictl import tools

    big = tmp_path / "big.jsonl"
    big.write_bytes(b"x" * 2_000_000)
    small = tmp_path / "small.md"
    small.write_text("y" * 400, encoding="utf-8")
    # No file is read: the estimate comes from the size, bytes / 4 as for text.
    monkeypatch.setattr(Path, "read_text", lambda *a, **k: (_ for _ in ()).throw(AssertionError("read")))
    assert tools._file_tokens(big, big.stat()) == 500_000
    assert tools._file_tokens(small, small.stat()) == 100


# ── 7. Events count ──────────────────────────────────────────────


def test_count_events_ignores_the_page_limit(kusto_store):
    for i in range(12):
        kusto_store.insert("events", ts=NOW-i, tool="claude-code", kind="hook:Stop", session_id="s")
    kusto_store.insert("events", ts=NOW, tool="codex-cli", kind="hook:Stop", session_id="t")
    history = HistoryScope.local(kusto_store)
    params = {"since": NOW-100, "until": NOW+1}
    assert len(history.read("events.page", requested_tool="claude-code", limit=5, page=True, **params)) == 5
    assert history.read("events.count", requested_tool="claude-code", **params)[0]["count"] == 12
    assert history.read("events.count", **params)[0]["count"] == 13
    assert history.read("events.count", sid="t", **params)[0]["count"] == 1


# ── 8. CPU is the sum over a session's processes ──────────────────


def _proc(pid, ppid, tmp_path):
    return ProcessInfo(
        pid=pid, ppid=ppid, name="node", exe="/usr/local/bin/node",
        cmdline=("node", "/usr/local/bin/claude", "--print"), cwd=str(tmp_path),
    )


def test_session_cpu_is_the_sum_of_its_processes(tmp_path):
    c = SessionCorrelator(MonitorConfig.for_root(tmp_path))
    now = time.time()
    c.on_process(_proc(10, 1, tmp_path), cpu_percent=100.0, memory_rss=0, child_count=0, ts=now, is_new=True)
    c.on_process(_proc(11, 10, tmp_path), cpu_percent=50.0, memory_rss=0, child_count=0, ts=now, is_new=True)
    c.on_process(_proc(10, 1, tmp_path), cpu_percent=20.0, memory_rss=0, child_count=0, ts=now + 1)
    (report,) = c.tool_reports()
    assert report.cpu_percent == 70.0  # 20 + 50, not the last sample (20)
    assert report.peak_cpu_percent == 150.0  # the highest sum, not the highest single sample


def test_cpu_drops_when_a_process_exits(tmp_path):
    c = SessionCorrelator(MonitorConfig.for_root(tmp_path))
    now = time.time()
    c.on_process(_proc(10, 1, tmp_path), cpu_percent=100.0, memory_rss=0, child_count=0, ts=now, is_new=True)
    c.on_process(_proc(11, 10, tmp_path), cpu_percent=50.0, memory_rss=0, child_count=0, ts=now, is_new=True)
    c.on_process_exit(10, ts=now + 1)
    (report,) = c.tool_reports()
    assert report.cpu_percent == 50.0  # not the 150 of the last sample before the exit
    assert report.peak_cpu_percent == 150.0


def test_unmeasured_cpu_sample_is_not_recorded_as_zero(tmp_path):
    c = SessionCorrelator(MonitorConfig.for_root(tmp_path))
    now = time.time()
    c.on_process(_proc(10, 1, tmp_path), cpu_percent=None, memory_rss=0, child_count=0, ts=now, is_new=True)
    assert 10 not in c.pid_cpu
    (report,) = c.tool_reports()
    assert report.peak_cpu_percent == 0.0 and report.pid_count == 1


def test_first_cpu_sample_of_a_new_process_is_not_known():
    """psutil measures CPU between two calls; the call right after priming spans a
    few milliseconds and returns noise (2508.8 here). It must not become a sample."""
    import contextlib
    import os

    from aictl.monitoring.collectors.process import PsutilProcessCollector

    class FakeError(Exception):
        pass

    info = {"pid": 42, "ppid": 1, "name": "claude", "cmdline": ["claude", "-p", "x"], "exe": "/usr/bin/claude", "username": "dev"}

    class FakeProc:
        @property
        def info(self):
            return info

        def as_dict(self, _attrs):
            return info

    class FakeHandle:
        def __init__(self, _pid):
            pass

        def cpu_percent(self, _interval):
            return 2508.8

        def oneshot(self):
            return contextlib.nullcontext()

        def memory_info(self):
            return type("M", (), {"rss": 1})()

        def cwd(self):
            return "/"

        def create_time(self):
            return 42.0

        def is_running(self):
            return True

    class FakePsutil:
        Error = FakeError
        Process = FakeHandle

        @staticmethod
        def process_iter(_fields):
            return [FakeProc()]

    collector = PsutilProcessCollector(MonitorConfig(root=Path("/tmp"), workspace_paths=(), state_paths=()))
    first = collector._snapshot(FakePsutil)
    assert first[42]["cpu_percent"] is None
    second = collector._snapshot(FakePsutil)
    assert second[42]["cpu_percent"] == min(2508.8, 100.0 * (os.cpu_count() or 1))
