"""Who owns a process: sibling sessions, helpers, and the desktop app's CLI child."""

from __future__ import annotations

import time

from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import SessionCorrelator
from aictl.monitoring.session import ProcessInfo

DESKTOP_EXE = "/Applications/Claude.app/Contents/MacOS/Claude"
BUNDLED_CLI = "/Users/x/Library/Application Support/Claude/claude-code/2.1.0/claude"


def proc(pid, ppid, name, exe=None, cmdline=(), cwd="/synthetic/project"):
    return ProcessInfo(pid=pid, ppid=ppid, name=name, exe=exe or name, cmdline=tuple(cmdline) or (name,), cwd=cwd)


def make(tmp_path):
    return SessionCorrelator(MonitorConfig.for_root(tmp_path))


def feed(correlator, *processes):
    now = time.time()
    for p in processes:
        correlator.on_process(p, 1.0, 1_000_000, 0, ts=now, is_new=True)


def session_of(correlator, pid):
    sid = correlator.pid_to_session.get(pid)
    return correlator.sessions.get(sid) if sid else None


def test_two_sessions_in_one_cwd_stay_separate(tmp_path):
    c = make(tmp_path)
    feed(c, proc(100, 1, "claude"), proc(200, 1, "claude"))
    a, b = session_of(c, 100), session_of(c, 200)
    assert a is not None and b is not None
    assert a.session_id != b.session_id


def test_a_claude_subprocess_joins_its_parent_session(tmp_path):
    c = make(tmp_path)
    feed(c, proc(100, 1, "claude"), proc(101, 100, "claude"))
    assert session_of(c, 101).session_id == session_of(c, 100).session_id
    assert len(c.sessions) == 1


def test_an_unclassified_helper_joins_its_parent_session(tmp_path):
    c = make(tmp_path)
    feed(c, proc(100, 1, "claude"), proc(101, 100, "ripgrep-helper-binary"))
    assert session_of(c, 101).session_id == session_of(c, 100).session_id


def test_cli_spawned_by_the_desktop_app_is_not_a_desktop_session(tmp_path):
    c = make(tmp_path)
    feed(
        c,
        proc(50, 1, "Claude", exe=DESKTOP_EXE),
        proc(51, 50, "claude", exe=BUNDLED_CLI),
    )
    child = session_of(c, 51)
    assert child is not None
    assert child.tool == "claude-code"
    parent = session_of(c, 50)
    if parent is not None:
        assert parent.session_id != child.session_id


def test_concurrent_tool_telemetry_goes_to_the_session_in_that_workspace(tmp_path):
    c = make(tmp_path)
    feed(c, proc(100, 1, "claude", cwd=str(tmp_path / "a")), proc(200, 1, "claude", cwd=str(tmp_path / "b")))
    a, b = session_of(c, 100), session_of(c, 200)
    a.workspaces.add("wa")
    b.workspaces.add("wb")
    c.on_telemetry(10, 1, tool_hint="claude-code", workspace="wa")
    assert (a.exact_input_tokens, b.exact_input_tokens) == (10, 0)
