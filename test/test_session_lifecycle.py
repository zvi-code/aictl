"""One row per agent session, and a status that states its evidence.

Each test injects the clock and the process samples: no sleep, no real process.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

from aictl import session_lifecycle as lc
from aictl.dashboard.board_projection import ACTIVE_WINDOW_S, _Board, _Cell
from aictl.dashboard.live.hub import LiveHub
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.monitoring import native_binding
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import ALIVE_EVERY_S, SessionCorrelator
from aictl.monitoring.live_sources import LiveRuntimeSources
from aictl.monitoring.session import ProcessInfo
from aictl.orchestrator import SnapshotPersistence
from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter
from aictl.tool_calls import ToolCalls

SID = "0b9e4c1a-2d3f-4e5a-8b6c-7d8e9f0a1b2c"
OTHER = "1c0f5d2b-3e4a-4f6b-9c7d-8e9f0a1b2c3d"
BIRTH = 1_795_000_000.25  # the process start time, with a fraction like psutil's


def claude(tmp_path: Path, *, pid: int = 4312, birth: float = BIRTH, cmdline: tuple[str, ...] = ("claude",)):
    return ProcessInfo(pid=pid, ppid=1, name="claude", exe="/opt/claude/claude", cmdline=cmdline,
                       cwd=str(tmp_path), created_at=birth)


def ctime_utc(ts: float) -> str:
    return datetime.fromtimestamp(int(ts), timezone.utc).strftime("%a %b %d %H:%M:%S %Y")


def session_file(home: Path, *, pid: int = 4312, sid: str = SID, proc_start: object = None,
                 started_ms: int | None = None, status: str = "busy", status_ms: int | None = None) -> Path:
    path = home / "sessions" / f"{pid}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"pid": pid, "sessionId": sid, "cwd": str(home), "kind": "interactive", "entrypoint": "cli",
            "startedAt": started_ms if started_ms is not None else int((BIRTH + 0.4) * 1000),
            "status": status, "statusUpdatedAt": status_ms or int((BIRTH + 30) * 1000),
            "updatedAt": status_ms or int((BIRTH + 30) * 1000)}
    if proc_start is not None:
        data["procStart"] = proc_start
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def bound_correlator(tmp_path: Path, home: Path) -> SessionCorrelator:
    binder = native_binding.NativeBinder(claude=lambda: [home], copilot=lambda: [])
    return SessionCorrelator(MonitorConfig(root=tmp_path, workspace_paths=(tmp_path,), state_paths=()),
                             native_binder=binder)


def persistence() -> tuple[SnapshotPersistence, SessionFacts, MemoryWriter]:
    writer = MemoryWriter()
    facts = SessionFacts(writer)
    return SnapshotPersistence(None, writer, session_facts=facts), facts, writer


def session_rows(writer: MemoryWriter) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for row in writer.written("sessions"):
        rows[row["session_id"]] = row
    return rows


# ── Binding a process to its native session ────────────────────────────────


def test_a_plain_claude_process_binds_through_its_session_file(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH), status="busy")
    binding = native_binding.binding_for(claude(tmp_path), [home])
    assert binding is not None
    assert binding["session_id"] == SID
    assert binding["state"] == "running"
    assert binding["started_at"] == (BIRTH + 0.4)


def test_a_reused_pid_does_not_bind_to_the_file_of_an_earlier_process(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH - 3600))
    assert native_binding.binding_for(claude(tmp_path), [home]) is None
    # Without procStart, a file written before this process started is an old one too.
    session_file(home, started_ms=int((BIRTH - 3600) * 1000))
    assert native_binding.binding_for(claude(tmp_path), [home]) is None
    session_file(home, started_ms=int((BIRTH + 1) * 1000))
    assert native_binding.binding_for(claude(tmp_path), [home])["session_id"] == SID


def test_proc_start_is_read_in_the_forms_tools_write():
    stamp = ctime_utc(BIRTH)
    assert native_binding.parse_proc_start(stamp) == int(BIRTH)
    assert native_binding.parse_proc_start("2026-11-18T07:33:20Z") == datetime(
        2026, 11, 18, 7, 33, 20, tzinfo=timezone.utc).timestamp()
    assert native_binding.parse_proc_start(int(BIRTH * 1000)) == int(BIRTH * 1000) / 1000
    assert native_binding.parse_proc_start("not a time") is None


def test_command_line_and_copilot_lock_bind_and_a_stale_lock_does_not(tmp_path):
    assert native_binding.command_line_session(claude(tmp_path, cmdline=("claude", "--resume", SID))) == SID
    assert native_binding.command_line_session(claude(tmp_path, cmdline=("claude", "--resume"))) is None
    copilot = tmp_path / "copilot-home"
    lock = copilot / "session-state" / SID / f"inuse.{77}.lock"
    lock.parent.mkdir(parents=True)
    lock.touch()
    os.utime(lock, (BIRTH - 600, BIRTH - 600))
    process = ProcessInfo(pid=77, ppid=1, name="copilot", exe="copilot", cmdline=("copilot",), created_at=BIRTH)
    clock = [0.0]
    binder = native_binding.NativeBinder(claude=lambda: [], copilot=lambda: [copilot], clock=lambda: clock[0])
    assert binder(process, "copilot-cli") is None  # the lock is older than the process
    os.utime(lock, (BIRTH + 5, BIRTH + 5))
    assert binder(process, "copilot-cli") is None  # the next search waits for the retry interval
    clock[0] = native_binding.COPILOT_RETRY_S
    assert binder(process, "copilot-cli")["session_id"] == SID
    assert binder(process, "copilot-vscode") is None  # an app process holds many sessions


# ── The store gets one row per agent session ───────────────────────────────


def test_a_bound_session_produces_no_monitor_session_row(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH))
    runtime = bound_correlator(tmp_path, home)
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 10)
    events = runtime.drain_events()
    start = next(e for e in events if e["kind"] == "session_start")
    assert start["detail"]["native_session_id"] == SID
    store, facts, writer = persistence()
    store._persist_session_events(events, BIRTH + 10)
    rows = session_rows(writer)
    assert list(rows) == [SID]
    assert not any(":" in sid for sid in rows)
    assert rows[SID]["pid"] == 4312
    links = writer.written("session_processes")
    assert [(link["session_id"], link["pid"]) for link in links] == [(SID, 4312)]


def test_a_binding_found_after_start_retires_the_monitor_row(tmp_path):
    home = tmp_path / "claude-home"
    runtime = bound_correlator(tmp_path, home)
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 1)  # no session file yet
    store, facts, writer = persistence()
    store._persist_session_events(runtime.drain_events(), BIRTH + 1)
    monitor_id = next(iter(session_rows(writer)))
    assert monitor_id.startswith("claude-code:4312:")
    session_file(home, proc_start=ctime_utc(BIRTH))
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 3)
    store._persist_session_events(runtime.drain_events(), BIRTH + 3)
    deleted = [key for op, table, keys in writer.operations if op == "delete" and table == "sessions" for key in keys]
    assert [key["session_id"] for key in deleted] == [monitor_id]
    assert SID in session_rows(writer)


def test_process_exit_ends_the_session_at_the_exit_time(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH))
    runtime = bound_correlator(tmp_path, home)
    store, facts, writer = persistence()
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 10)
    runtime.on_process_exit(4312, ts=BIRTH + 50)
    store._persist_session_events(runtime.drain_events(), BIRTH + 60)
    row = session_rows(writer)[SID]
    assert row["ended_at"] == BIRTH + 50
    assert row["end_reason"] == "process_exit"
    # The later clean-up of the monitor session does not end it a second time, or later.
    runtime.sessions[next(iter(runtime.sessions))].last_seen_at = 0.0
    runtime.tool_reports()
    assert not [e for e in runtime.drain_events() if e["kind"] == "session_end"]


def test_a_live_bound_process_keeps_an_idle_end_from_closing_the_session(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH))
    runtime = bound_correlator(tmp_path, home)
    store, facts, writer = persistence()
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 10)
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 10 + ALIVE_EVERY_S)
    events = runtime.drain_events()
    assert [e["kind"] for e in events if e["kind"].startswith("session_")] == ["session_start", "session_alive"]
    store._persist_session_events(events, BIRTH + 400)
    # The transcript reader infers an idle end at the last line, before the process was last seen.
    facts.session(SessionRow(SID, "claude-code", ended_at=BIRTH + 200, last_activity_at=BIRTH + 200,
                             end_reason="idle", source="transcript"))
    assert session_rows(writer)[SID]["ended_at"] is None


def test_claude_clear_ends_the_previous_session_as_switched(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH))
    runtime = bound_correlator(tmp_path, home)
    store, facts, writer = persistence()
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 10)
    session_file(home, sid=OTHER, proc_start=ctime_utc(BIRTH))
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 20)
    store._persist_session_events(runtime.drain_events(), BIRTH + 20)
    rows = session_rows(writer)
    assert rows[SID]["end_reason"] == "switched"
    assert rows[OTHER]["ended_at"] is None


# ── Lifecycle merge in SessionFacts ─────────────────────────────────────────


def test_an_idle_end_from_the_transcript_is_marked_idle_and_resumed_activity_clears_it():
    facts = SessionFacts(MemoryWriter())
    facts.session(SessionRow(SID, "claude-code", started_at=100.0, ended_at=500.0, last_activity_at=500.0,
                             end_reason="idle", source="transcript"))
    row = facts._sessions[SID]["row"]
    assert (row["ended_at"], row["end_reason"]) == (500.0, "idle")
    # The session is resumed: a later write has no end and newer activity.
    facts.session(SessionRow(SID, "claude-code", started_at=100.0, last_activity_at=2000.0, source="transcript"))
    row = facts._sessions[SID]["row"]
    assert (row["ended_at"], row["end_reason"]) == (None, "")


def test_a_hook_end_survives_the_last_lines_written_just_after_it():
    facts = SessionFacts(MemoryWriter())
    facts.session(SessionRow(SID, "claude-code", ended_at=900.0, end_reason="hook", source="hook"),
                  activity=900.0, terminal=True)
    facts.session(SessionRow(SID, "claude-code", last_activity_at=900.0 + lc.END_GRACE_S, source="transcript"))
    row = facts._sessions[SID]["row"]
    assert (row["ended_at"], row["end_reason"]) == (900.0, "hook")


def test_the_exit_after_a_hook_end_keeps_the_tool_reported_end():
    facts = SessionFacts(MemoryWriter())
    facts.session(SessionRow(SID, "claude-code", ended_at=900.0, end_reason="hook"), activity=900.0, terminal=True)
    facts.session(SessionRow(SID, ended_at=903.0, end_reason="process_exit"), activity=903.0, terminal=True)
    row = facts._sessions[SID]["row"]
    assert (row["ended_at"], row["end_reason"]) == (900.0, "hook")


def test_rows_saved_before_the_lifecycle_columns_still_merge():
    facts = SessionFacts(MemoryWriter())
    # A restart state file written before this change has rows without the two columns.
    row = asdict(SessionRow(SID, "claude-code", started_at=1.0))
    del row["last_activity_at"], row["end_reason"]
    facts._sessions[SID] = {"row": row, "clock": 0}
    facts.session(SessionRow(SID, "claude-code", ended_at=50.0, last_activity_at=50.0, end_reason="idle"))
    assert facts._sessions[SID]["row"]["end_reason"] == "idle"


# ── Status rules and the words that explain them ───────────────────────────


def test_a_live_process_overrides_the_idle_window():
    state = lc.assess(now=10_000.0, pids=[4312], last_activity=10_000.0 - 3 * ACTIVE_WINDOW_S)
    assert state.live and state.evidence == "process 4312 running"


def test_an_observed_end_wins_over_recent_activity_and_an_idle_end_is_inferred():
    exited = lc.assess(now=1000.0, last_activity=990.0, ended_at=995.0, end_reason="process_exit")
    assert not exited.live and exited.end_reason == "process_exit"
    assert exited.evidence.startswith("process exited ")
    quiet = lc.assess(now=5000.0, last_activity=5000.0 - ACTIVE_WINDOW_S - 1)
    assert not quiet.live and quiet.inferred
    assert quiet.evidence == "no activity for 15 min (inferred)"
    recent = lc.assess(now=5000.0, last_activity=4880.0)
    assert recent.live and recent.evidence == "no process seen; last activity 2 min ago"
    resumed = lc.assess(now=5000.0, last_activity=4990.0, ended_at=4000.0, end_reason="hook")
    assert resumed.live


def _board(now: float, *, cells=(), live_by_sid=None, meta=None) -> _Board:
    board = _Board.__new__(_Board)
    board.now = now
    board.cells = list(cells)
    board.tool_agg, board.prompt_agg, board.sub_rows = {}, {}, {}
    board.live_by_sid = live_by_sid or {}
    board.loops = []
    board.meta = meta or {}
    board.status, board.sub_status, board.lifecycle = {}, {}, {}
    board.history = SimpleNamespace(read=lambda *_a, **_k: [], keys=lambda ids: sorted(ids))
    return board


def _cell(sid: str, ts: float) -> _Cell:
    return _Cell(sid, "", "m", 0, "claude-code", "/p", 1, 1, 1, 0, 0, 0, ts, ts, None)


def test_board_status_follows_the_bound_process_not_the_timer():
    now = 100_000.0
    old = now - 4 * ACTIVE_WINDOW_S
    board = _board(now, cells=[_cell(SID, old), _cell(OTHER, old)],
                   live_by_sid={SID: {"pids": {4312}, "matched_by": "evidence"}})
    board._assign_status()
    assert board.status[SID] == "idle"  # alive but quiet: live, not ended
    assert board.lifecycle[SID].evidence == "process 4312 running"
    assert board.status[OTHER] == "ended"
    assert board.lifecycle[OTHER].evidence == "no activity for 15 min (inferred)"


def test_board_status_ends_at_a_seen_exit_inside_the_idle_window():
    now = 100_000.0
    board = _board(now, cells=[_cell(SID, now - 30)],
                   meta={SID: {"ended_at": now - 10, "end_reason": "process_exit"}})
    board._assign_status()
    assert board.status[SID] == "ended"
    assert board._status_evidence(SID, True, {}, False)["end_reason"] == "process_exit"


def test_board_takes_the_native_session_of_a_live_process_without_guessing(tmp_path):
    now = 100_000.0
    board = _board(now, cells=[_cell(SID, now - 5), _cell(OTHER, now - 1)])
    board.live_sessions = [{"session_id": "claude-code:4312:1.0", "native_session_id": SID, "tool": "claude-code",
                            "project": "/p", "pids": [4312], "root_pid": 4312, "started_at": now - 100,
                            "last_seen_at": now}]
    board.session_project = {SID: "/p", OTHER: "/p"}
    board.session_tool = {SID: "claude-code", OTHER: "claude-code"}
    board.only_session = None
    board.snapshot = None
    board.placeholders = []
    board._match_live()
    assert set(board.live_by_sid) == {SID}
    assert board.live_by_sid[SID]["matched_by"] == "evidence"


# ── The live path ───────────────────────────────────────────────────────────


def test_live_agent_of_a_plain_claude_process_is_its_native_session(tmp_path):
    home = tmp_path / "claude-home"
    session_file(home, proc_start=ctime_utc(BIRTH), status="idle")
    runtime = bound_correlator(tmp_path, home)
    producer = LiveRuntimeSources(LiveHub(), tmp_path, capture_mode=lambda: "full", config_provider=lambda _: [],
                                  host="test-host")
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 10)
    runtime.on_process(claude(tmp_path), 1.0, 1024, 0, ts=BIRTH + 11)
    producer.flush_runtime()
    agents = _agents(producer.hub)
    assert len(agents) == 1
    agent = agents[0]
    assert agent["session_id"] == SID and agent["native_session_id"] == SID
    assert agent["status"] == "idle" and agent["native_activity"] == "idle"
    assert agent["status_evidence"] == "process 4312 running; session file reports idle"
    producer.stop()


def _agents(hub: LiveHub) -> list[dict]:
    subscription = hub.subscribe()
    try:
        _, bootstrap = subscription.next(0)
        return [entity["data"] for entity in bootstrap["entities"] if entity["topic"] == "runtime.agent"]
    finally:
        subscription.close()


# ── Ends the transcript reader writes ──────────────────────────────────────


USAGE = ("session.usage_record", {"usage": {"model": "gpt-6-astra", "inputTokens": 10, "outputTokens": 3}})


def _copilot_history(tmp_path: Path, rows: list[tuple[str, dict]], at: float) -> SessionFacts:
    root = tmp_path / "session-state"
    path = root / SID / "events.jsonl"
    path.parent.mkdir(parents=True)
    stamp = datetime.fromtimestamp(at, timezone.utc).isoformat()
    path.write_text("\n".join(json.dumps(dict(type=kind, id=kind, timestamp=stamp, data=data))
                              for kind, data in rows) + "\n", encoding="utf-8")
    os.utime(path, (at, at))
    writer = MemoryWriter()
    facts = SessionFacts(writer)
    TranscriptUsageIngester(
        None, fact_target=facts, tool_calls=ToolCalls(writer, keeps_text=lambda: True), copilot_state=root,
        claude_projects=tmp_path / "claude", codex_sessions=tmp_path / "codex", vscode_workspaces=tmp_path / "vscode",
    ).poll()
    return facts


def test_imported_history_without_an_end_record_ends_as_idle(tmp_path):
    facts = _copilot_history(tmp_path, [("user.message", {"content": "a prompt"}), USAGE], at=BIRTH)
    row = facts._sessions[SID]["row"]
    assert row["end_reason"] == "idle"
    assert row["ended_at"] == row["last_activity_at"] == BIRTH


def test_a_transcript_end_record_is_the_tool_reporting_the_end(tmp_path):
    facts = _copilot_history(tmp_path, [USAGE, ("session.shutdown", {"modelMetrics": {}})], at=BIRTH)
    row = facts._sessions[SID]["row"]
    assert (row["ended_at"], row["end_reason"]) == (BIRTH, "transcript")
