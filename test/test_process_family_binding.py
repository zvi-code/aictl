"""A process family (wrapper + native process + helpers) is one agent session.

The process shapes are the ones seen on a Mac running Claude desktop and Copilot CLI:

* Claude desktop starts ``disclaimer --pgroup -- .../claude`` (pid N) whose child ``claude``
  (pid N+1) writes ``sessions/<N+1>.json``.
* ``node /opt/homebrew/bin/copilot --resume=<name>`` (the wrapper) starts the native
  ``copilot-darwin-arm64/copilot --resume=<name>``; the session folder's ``inuse.<pid>.lock``
  belongs to the native child, and ``<name>`` is the session NAME from workspace.yaml.

Process samples and clocks are injected: no real process, no sleep.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl.dashboard.live.hub import LiveHub
from aictl.monitoring import native_binding
from aictl.monitoring.config import MonitorConfig
from aictl.monitoring.correlator import SessionCorrelator
from aictl.monitoring.live_sources import LiveRuntimeSources
from aictl.monitoring.session import ProcessInfo
from aictl.orchestrator import SnapshotPersistence
from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter

CLAUDE_SID = "95cfd1ac-0b1c-4d2e-8f3a-4b5c6d7e8f90"
COPILOT_SID = "1f4c8ec7-7a9a-44a9-b1b5-056b06402d35"
NAME = "aictl-test-session"
BIRTH = 1_795_355_174.42
APP = "/Users/u/Library/Application Support/Claude/claude-code/2.1.325/x/claude.app/Contents/MacOS/claude"


def disclaimer(cwd: Path) -> ProcessInfo:
    return ProcessInfo(pid=19700, ppid=33357, name="disclaimer", exe="/Applications/Claude.app/Contents/Helpers/disclaimer",
                       cmdline=("/Applications/Claude.app/Contents/Helpers/disclaimer", "--pgroup", "--", APP,
                                "--output-format", "stream-json"), cwd=str(cwd), created_at=BIRTH)


def claude_main(cwd: Path) -> ProcessInfo:
    return ProcessInfo(pid=19701, ppid=19700, name="claude", exe=APP, cmdline=(APP, "--output-format", "stream-json"),
                       cwd=str(cwd), created_at=BIRTH + 0.3)


def copilot_wrapper(cwd: Path) -> ProcessInfo:
    return ProcessInfo(pid=66852, ppid=38794, name="node", exe="/opt/homebrew/bin/node",
                       cmdline=("node", "/opt/homebrew/bin/copilot", f"--resume={NAME}"), cwd=str(cwd), created_at=BIRTH)


NATIVE = "/opt/homebrew/lib/node_modules/@github/copilot/node_modules/@github/copilot-darwin-arm64/copilot"


def copilot_native(cwd: Path) -> ProcessInfo:
    return ProcessInfo(pid=66865, ppid=66852, name="copilot", exe=NATIVE, cmdline=(NATIVE, f"--resume={NAME}"),
                       cwd=str(cwd), created_at=BIRTH + 0.2)


def claude_file(home: Path, process: ProcessInfo, sid: str = CLAUDE_SID) -> None:
    path = home / "sessions" / f"{process.pid}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    proc_start = datetime.fromtimestamp(int(process.created_at), timezone.utc).strftime("%a %b %d %H:%M:%S %Y")
    path.write_text(json.dumps({"pid": process.pid, "sessionId": sid, "cwd": process.cwd, "procStart": proc_start,
                                "startedAt": int((process.created_at + 0.5) * 1000), "status": "busy",
                                "statusUpdatedAt": int((process.created_at + 9) * 1000)}), encoding="utf-8")


def copilot_session(home: Path, holder: ProcessInfo) -> None:
    folder = home / "session-state" / COPILOT_SID
    folder.mkdir(parents=True)
    (folder / "workspace.yaml").write_text(f"id: {COPILOT_SID}\nname: {NAME}\n", encoding="utf-8")
    lock = folder / f"inuse.{holder.pid}.lock"
    lock.touch()
    os.utime(lock, (holder.created_at + 1, holder.created_at + 1))


def correlator(tmp_path: Path, *, claude=(), copilot=()) -> SessionCorrelator:
    binder = native_binding.NativeBinder(claude=lambda: list(claude), copilot=lambda: list(copilot),
                                         codex=lambda: [], clock=lambda: 0.0)
    return SessionCorrelator(MonitorConfig(root=tmp_path, workspace_paths=(tmp_path,), state_paths=()),
                             native_binder=binder)


def store():
    writer = MemoryWriter()
    facts = SessionFacts(writer)
    return SnapshotPersistence(None, writer, session_facts=facts), facts, writer


def stored_sessions(writer: MemoryWriter) -> dict[str, dict]:
    """The sessions table after every upsert and delete, in order."""
    rows: dict[tuple[str, str], dict] = {}
    for op, table, items in writer.operations:
        if table != "sessions":
            continue
        for item in items:
            key = (item["project"], item["session_id"])
            if op == "delete":
                rows.pop(key, None)
            else:
                rows[key] = item
    return {sid: row for (_, sid), row in rows.items()}


def sample(runtime: SessionCorrelator, processes, ts: float) -> None:
    for process in processes:
        runtime.on_process(process, 1.0, 1024, 0, ts=ts)


# ── 1. Wrapper parent + main child, the session file is the child's ───────


@pytest.mark.parametrize("child_first", [False, True], ids=["parent-first", "child-first"])
def test_a_claude_wrapper_and_its_main_process_are_one_bound_session(tmp_path, child_first):
    home = tmp_path / "claude-home"
    claude_file(home, claude_main(tmp_path))
    runtime = correlator(tmp_path, claude=[home])
    persistence, facts, writer = store()
    order = [claude_main(tmp_path), disclaimer(tmp_path)] if child_first else [disclaimer(tmp_path), claude_main(tmp_path)]
    sample(runtime, order, BIRTH + 10)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 10)
    sample(runtime, order, BIRTH + 15)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 15)

    assert len(runtime.sessions) == 1
    assert list(stored_sessions(writer)) == [CLAUDE_SID]
    row = stored_sessions(writer)[CLAUDE_SID]
    assert row["pid"] == 19700 and row["tool"] == "claude-code" and row["source"] == "process"
    links = {(link["session_id"], link["pid"]) for link in writer.written("session_processes")
             if link["session_id"] == CLAUDE_SID}
    assert links >= {(CLAUDE_SID, 19701)}


def test_a_family_with_no_evidence_still_has_one_row(tmp_path):
    runtime = correlator(tmp_path, claude=[tmp_path / "empty"])
    persistence, facts, writer = store()
    order = [claude_main(tmp_path), disclaimer(tmp_path)]  # the child is seen first
    sample(runtime, order, BIRTH + 10)
    sample(runtime, order, BIRTH + 11)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 11)
    rows = stored_sessions(writer)
    assert len(runtime.sessions) == 1
    assert list(rows) == [next(iter(runtime.sessions))]
    assert rows[next(iter(rows))]["source"] == "correlator"


def test_a_helper_child_of_the_same_tool_does_not_flip_the_binding(tmp_path):
    home = tmp_path / "claude-home"
    claude_file(home, claude_main(tmp_path))
    nested = ProcessInfo(pid=19800, ppid=19701, name="claude", exe=APP, cmdline=(APP, "-p", "x"),
                         cwd=str(tmp_path), created_at=BIRTH + 50)
    claude_file(home, nested, sid="0e0e0e0e-0000-4000-8000-000000000000")
    runtime = correlator(tmp_path, claude=[home])
    sample(runtime, [disclaimer(tmp_path), claude_main(tmp_path), nested], BIRTH + 60)
    sample(runtime, [disclaimer(tmp_path), claude_main(tmp_path), nested], BIRTH + 61)
    (binding,) = runtime.native.values()
    assert binding["session_id"] == CLAUDE_SID
    bound = [e["detail"]["native_session_id"] for e in runtime.drain_events() if e["kind"] == "session_bound"]
    assert bound == [CLAUDE_SID]


# ── 2. node wrapper + native child, the lock is the child's, --resume=<name> ─


@pytest.mark.parametrize("child_first", [False, True], ids=["parent-first", "child-first"])
def test_copilot_resume_by_name_binds_the_family_through_the_childs_lock(tmp_path, child_first):
    home = tmp_path / "copilot-home"
    copilot_session(home, copilot_native(tmp_path))
    runtime = correlator(tmp_path, copilot=[home])
    persistence, facts, writer = store()
    order = [copilot_native(tmp_path), copilot_wrapper(tmp_path)]
    if not child_first:
        order.reverse()
    sample(runtime, order, BIRTH + 10)
    sample(runtime, order, BIRTH + 12)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 12)

    rows = stored_sessions(writer)
    assert NAME not in rows  # a session name never becomes a session id
    assert list(rows) == [COPILOT_SID]
    assert rows[COPILOT_SID]["pid"] == 66852
    links = {link["pid"] for link in writer.written("session_processes") if link["session_id"] == COPILOT_SID}
    assert 66865 in links


def test_a_resume_name_alone_binds_nothing(tmp_path):
    home = tmp_path / "copilot-home"
    copilot_session(home, ProcessInfo(pid=1, ppid=0, name="x", created_at=BIRTH))
    binder = native_binding.NativeBinder(claude=lambda: [], copilot=lambda: [home], codex=lambda: [], clock=lambda: 0.0)
    assert binder(copilot_wrapper(tmp_path), "copilot-cli") is None
    resumed = ProcessInfo(pid=5, ppid=1, name="copilot", exe=NATIVE, cmdline=(NATIVE, "--resume", COPILOT_SID),
                          cwd=str(tmp_path), created_at=BIRTH)
    assert binder(resumed, "copilot-cli")["session_id"] == COPILOT_SID  # an existing folder is an id
    assert not native_binding.known_session_id("../x", "copilot-cli", [home])
    assert not native_binding.known_session_id(NAME, "claude-code", [home])


def test_the_resumed_copilot_session_reads_running_with_its_processes(tmp_path):
    home = tmp_path / "copilot-home"
    copilot_session(home, copilot_native(tmp_path))
    runtime = correlator(tmp_path, copilot=[home])
    producer = LiveRuntimeSources(LiveHub(), tmp_path, capture_mode=lambda: "full", config_provider=lambda _: [],
                                  host="test-host")
    producer.attach_runtime(SimpleNamespace(correlator=runtime))
    sample(runtime, [copilot_wrapper(tmp_path), copilot_native(tmp_path)], BIRTH + 10)
    sample(runtime, [copilot_wrapper(tmp_path), copilot_native(tmp_path)], BIRTH + 11)
    producer.flush_runtime()
    subscription = producer.hub.subscribe()
    try:
        _, bootstrap = subscription.next(0)
    finally:
        subscription.close()
    agents = [e["data"] for e in bootstrap["entities"] if e["topic"] == "runtime.agent"]
    assert len(agents) == 1
    assert agents[0]["session_id"] == COPILOT_SID
    assert agents[0]["running"] is True
    assert agents[0]["status_evidence"].startswith("processes 66852, 66865 running")
    producer.stop()


# ── 3. A row from process evidence is never an empty shell ─────────────────


def test_a_row_from_process_evidence_has_tool_source_start_pid_and_project(tmp_path):
    home = tmp_path / "claude-home"
    claude_file(home, claude_main(tmp_path))
    runtime = correlator(tmp_path, claude=[home])
    persistence, facts, writer = store()
    sample(runtime, [disclaimer(tmp_path), claude_main(tmp_path)], BIRTH + 10)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 10)
    row = stored_sessions(writer)[CLAUDE_SID]
    assert row["tool"] == "claude-code"
    assert row["source"] == "process"
    assert row["started_at"] == pytest.approx(BIRTH + 0.8)  # the session file's startedAt
    assert row["pid"] == 19700
    assert row["project_path"] == str(tmp_path)
    # The transcript arrives later: its source and project win, the earliest start stays.
    facts.session(SessionRow(CLAUDE_SID, "claude-code", project_path="/repo", started_at=BIRTH + 5,
                             last_activity_at=BIRTH + 9, source="transcript", input_tokens=10))
    row = stored_sessions(writer)[CLAUDE_SID]
    assert (row["source"], row["project_path"], row["pid"]) == ("transcript", "/repo", 19700)
    assert row["started_at"] == pytest.approx(BIRTH + 0.8)
    # Later process evidence does not take the fields back.
    sample(runtime, [disclaimer(tmp_path), claude_main(tmp_path)], BIRTH + 10 + 600)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 610)
    row = stored_sessions(writer)[CLAUDE_SID]
    assert (row["source"], row["project_path"]) == ("transcript", "/repo")


def test_ends_and_switches_from_process_evidence_are_not_shells(tmp_path):
    home = tmp_path / "claude-home"
    claude_file(home, claude_main(tmp_path))
    runtime = correlator(tmp_path, claude=[home])
    persistence, facts, writer = store()
    sample(runtime, [disclaimer(tmp_path), claude_main(tmp_path)], BIRTH + 10)
    other = "167847d7-1111-4222-8333-444455556666"
    claude_file(home, claude_main(tmp_path), sid=other)
    sample(runtime, [disclaimer(tmp_path), claude_main(tmp_path)], BIRTH + 20)
    runtime.on_process_exit(19701, ts=BIRTH + 30)
    runtime.on_process_exit(19700, ts=BIRTH + 30)
    persistence._persist_session_events(runtime.drain_events(), BIRTH + 30)
    rows = stored_sessions(writer)
    assert set(rows) == {CLAUDE_SID, other}
    for row in rows.values():
        assert row["tool"] == "claude-code" and row["started_at"] > BIRTH - 1 and row["source"] == "process"
    assert rows[CLAUDE_SID]["end_reason"] == "switched"
    assert rows[other]["end_reason"] == "process_exit"
