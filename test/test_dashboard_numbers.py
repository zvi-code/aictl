"""Numbers on the older dashboard screens must come from the whole store.

Each test pins one case where a screen used to show a page, a last sample or
a placeholder zero as if it were the total.
"""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from aictl.dashboard.api_handlers import tool_history_for_api
from aictl.dashboard.hooks_status import _post_tool_use_usage, _subagent_usage
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import SessionCorrelator
from aictl.monitoring.session import ProcessInfo
from aictl.storage import AgentRow, EventRow, HistoryDB, SessionRow, ToolInvocationRow


@pytest.fixture()
def db(tmp_path):
    d = HistoryDB(db_path=str(tmp_path / "numbers.db"), flush_interval=0)
    yield d
    d.close()


def _sql(db, sql, params=()):
    conn = db._conn()
    conn.execute(sql, params)
    conn.commit()


# ── 1. Tool calls panel: true totals, not the page ────────────────


def test_session_tool_totals_count_every_stored_call(db):
    now = time.time()
    for i in range(30):
        db.append_tool_invocation(
            ToolInvocationRow(
                ts=now - i,
                session_id="s1",
                tool="claude-code",
                tool_name="Bash" if i % 3 == 0 else "Read",
                is_error=1 if i % 10 == 0 else 0,
                source_event_id=f"u{i}",
            )
        )
    db.flush()
    page = db.query_tool_invocations(session_id="s1", limit=5)
    assert len(page) == 5  # the page is capped ...
    totals = db.session_tool_invocation_totals("s1")
    assert totals["total"] == 30  # ... the totals are not
    assert totals["errors"] == 3
    assert totals["by_tool"] == {"Bash": 10, "Read": 20}
    assert db.session_tool_invocation_totals("other") == {"total": 0, "errors": 0, "by_tool": {}}


# ── 2. Session profiles from the sessions table ───────────────────


def test_stored_session_profile_has_project_files_and_subagents(db):
    now = time.time()
    db.upsert_session(
        SessionRow(session_id="sess-a", tool="claude-code", project_path="/w/proj", started_at=now - 600, ended_at=now - 60)
    )
    for i in range(3):
        db.append_event(
            EventRow(
                ts=now - 500 + i,
                tool="claude-code",
                kind="file_modified",
                session_id="sess-a",
                detail={"path": f"/w/proj/f{i % 2}.py", "growth_bytes": 10},
            )
        )
    db.append_event(
        EventRow(
            ts=now - 400,
            tool="claude-code",
            kind="file_modified",
            session_id="sess-a",
            detail={"path": "/h/.claude/projects/p/sess-a/subagents/agent-1.jsonl"},
        )
    )
    db.flush()
    _sql(
        db,
        "INSERT INTO file_write_events(ts, session_id, path, tool) VALUES(?,?,?,?)",
        (now - 300, "sess-a", "/w/proj/other.py", "claude-code"),
    )
    db.upsert_agent(AgentRow(agent_id="ag1", session_id="sess-a", tool="claude-code", is_sidechain=1, started_at=now - 450))
    db.upsert_agent(AgentRow(agent_id="ag2", session_id="sess-a", tool="claude-code", is_sidechain=1, started_at=now - 440))
    db.flush()

    (p,) = db.query_session_profiles(since=now - 3600)
    assert p["project"] == "/w/proj"  # stored rows carry the project as live rows do
    assert p["project_path"] == "/w/proj"
    assert p["files_modified"] == 4
    assert p["unique_files"] == 3
    assert p["subagents"] == 2
    assert p["bytes_written"] == 30


# ── 3. Agents tab: counts come from the store ─────────────────────


def test_agents_activity_counts_stored_calls_skills_and_subagents(db):
    now = time.time()
    for i in range(4):
        db.append_tool_invocation(
            ToolInvocationRow(ts=now - 10 - i, session_id="s1", tool="claude-code", tool_name="Read", source_event_id=f"r{i}")
        )
    db.append_tool_invocation(
        ToolInvocationRow(ts=now - 5, session_id="s1", tool="claude-code", tool_name="Skill", source_event_id="sk")
    )
    db.flush()
    _sql(
        db,
        "INSERT INTO skill_uses(dedup_key, ts, session_id, tool, project_path, name) VALUES(?,?,?,?,?,?)",
        ("k1", now - 5, "s1", "claude-code", "/w", "review-pr"),
    )
    db.upsert_agent(AgentRow(agent_id="a1", session_id="s1", tool="claude-code", is_sidechain=1, started_at=now - 100, ended_at=now - 50))
    db.upsert_agent(AgentRow(agent_id="old", session_id="s0", tool="claude-code", is_sidechain=1, started_at=now - 90_000, ended_at=now - 89_000))
    db.flush()
    # No hook:PostToolUse event exists: only the store knows these.
    skills, calls = _post_tool_use_usage(db, now - 86400)
    assert calls["by_tool"] == {"claude-code": 4}  # the Skill call is a skill use, not a general call
    assert calls["by_tool_name"]["claude-code"] == {"Read": 4}
    assert skills["by_tool"] == {"claude-code": 1}
    assert skills["by_skill"] == [{"skill": "review-pr", "count": 1}]
    sub = _subagent_usage(db, now - 86400)
    assert sub["by_tool"]["claude-code"] == {"starts": 1, "stops": 1}
    assert sub["starts_24h"] == 1


def test_agents_activity_does_not_double_count_hook_and_store(db):
    now = time.time()
    db.append_event(
        EventRow(ts=now - 20, tool="claude-code", kind="hook:PostToolUse", session_id="s1", detail={"tool_name": "Read"})
    )
    db.append_tool_invocation(
        ToolInvocationRow(ts=now - 20, session_id="s1", tool="claude-code", tool_name="Read", source_event_id="x")
    )
    db.flush()
    _, calls = _post_tool_use_usage(db, now - 86400)
    assert calls["by_tool_name"]["claude-code"] == {"Read": 1}


def test_subagent_starts_are_not_cut_at_50_events(db):
    now = time.time()
    for i in range(80):
        db.append_event(
            EventRow(ts=now - 100 + i * 0.01, tool="claude-code", kind="hook:SubagentStart", session_id="s", detail={"agent_id": f"a{i}"})
        )
    db.flush()
    sub = _subagent_usage(db, now - 86400)
    assert sub["starts_24h"] == 80
    assert len(sub["recent"]) == 10


# ── 4. Token estimate for large files ─────────────────────────────


def test_large_file_gets_a_size_based_token_estimate(tmp_path, monkeypatch):
    from aictl import tools

    big = tmp_path / "big.jsonl"
    big.write_bytes(b"x" * 2_000_000)
    small = tmp_path / "small.md"
    small.write_text("y" * 400, encoding="utf-8")
    tools._token_cache.clear()
    assert tools._file_tokens(big, big.stat()) == 500_000  # bytes / 4, as for text
    assert tools._file_tokens(small, small.stat()) == 100
    # No read for the big file: it is estimated from its size.
    monkeypatch.setattr(Path, "read_text", lambda *a, **k: (_ for _ in ()).throw(AssertionError("read")))
    tools._token_cache.clear()
    assert tools._file_tokens(big, big.stat()) == 500_000


# ── 7. Events count and per-tool history ──────────────────────────


def test_count_events_ignores_the_page_limit(db):
    now = time.time()
    for i in range(12):
        db.append_event(EventRow(ts=now - i, tool="claude-code", kind="hook:Stop", session_id="s"))
    db.append_event(EventRow(ts=now, tool="codex-cli", kind="hook:Stop", session_id="t"))
    db.flush()
    assert len(db.query_events(since=now - 100, tool="claude-code", limit=5)) == 5
    assert db.count_events(since=now - 100, tool="claude-code") == 12
    assert db.count_events(since=now - 100) == 13
    assert db.count_events(since=now - 100, session_id="t") == 1


def test_history_api_leaves_out_series_the_store_does_not_keep():
    out = tool_history_for_api(
        {"claude-code": {"ts": [1, 2], "cpu": [3.0, 4.0], "mem_mb": [5.0, 6.0], "tokens": [0, 0], "traffic": [0, 0]}}
    )
    assert out == {"claude-code": {"ts": [1, 2], "cpu": [3.0, 4.0], "mem_mb": [5.0, 6.0]}}


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
    assert second[42]["cpu_percent"] == 100.0 * (os.cpu_count() or 1)  # bounded by the cores
