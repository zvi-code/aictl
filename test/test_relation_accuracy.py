# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Every relation aictl stores rests on evidence the tool wrote.

A subagent belongs to the session whose lines it wrote, under the parent agent its
``meta.json`` names; a resumed session's file replays the earlier session's lines with that
session's id, and those copies belong to the earlier session; content is stored under the
session id its source carries. The fixtures use the tools' real field shapes.
"""

from __future__ import annotations

import json
import sqlite3
import time
from datetime import datetime
from pathlib import Path

import pytest
from core_store_fakes import current

from aictl.collection_status import CollectionStatus
from aictl.dashboard.history_scope import ScopeError
from aictl.dashboard.projection_utils import _resolve_agent, agent_address
from aictl.dashboard.projections.history import HistoryScope
from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester
from aictl.ingesters.cursor_conversations import CursorConversationsIngester
from aictl.ingesters.message_facts import MessageFacts
from aictl.ingesters.transcript_usage import (
    TranscriptUsageIngester,
    claude_resume_origin,
    request_reread,
    resumed_claude_sessions,
)
from aictl.ingesters.vscode_chat_logs import VSCodeChatLogsIngester
from aictl.records import AgentRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.testing import FixtureReader, MemoryWriter
from aictl.tool_calls import ToolCalls

NOW = time.time()
A = "aaaaaaaa-0000-4000-8000-000000000001"
B = "bbbbbbbb-0000-4000-8000-000000000002"
C = "cccccccc-0000-4000-8000-000000000003"
MODEL = "claude-sonnet-4-5"


def iso(ago: float) -> str:
    return datetime.fromtimestamp(NOW - ago).astimezone().isoformat()


def write(path: Path, lines: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        for line in lines:
            fh.write(json.dumps(line) + "\n")


def user(sid, text, ago, *, cwd="/work/repo", branch="main", agent="", prompt="p1"):
    return {"type": "user", "uuid": f"u-{sid[:4]}-{agent}-{ago}", "timestamp": iso(ago), "sessionId": sid,
            "cwd": cwd, "gitBranch": branch, "isSidechain": bool(agent), "promptId": prompt,
            **({"agentId": agent} if agent else {}), "message": {"role": "user", "content": text}}


def assistant(sid, msg_id, ago, *, cwd="/work/repo", branch="main", agent="", tools=(), stop="end_turn"):
    content = [{"type": "tool_use", "id": tid, "name": name, "input": args} for tid, name, args in tools]
    return {"type": "assistant", "uuid": f"a-{msg_id}", "timestamp": iso(ago), "sessionId": sid, "cwd": cwd,
            "gitBranch": branch, "isSidechain": bool(agent), "requestId": f"req-{msg_id}",
            **({"agentId": agent} if agent else {}),
            "message": {"id": msg_id, "model": MODEL, "role": "assistant",
                        "stop_reason": "tool_use" if tools else stop,
                        "content": content or [{"type": "text", "text": "done"}],
                        "usage": {"input_tokens": 10, "output_tokens": 5, "cache_read_input_tokens": 0,
                                  "cache_creation_input_tokens": 0}}}


def result(sid, tool_id, ago, *, agent="", agent_result=None, cwd="/work/repo"):
    line = {"type": "user", "uuid": f"r-{tool_id}", "timestamp": iso(ago), "sessionId": sid, "cwd": cwd,
            "isSidechain": bool(agent), "promptId": "p1", **({"agentId": agent} if agent else {}),
            "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tool_id, "content": "ok"}]}}
    if agent_result is not None:
        line["toolUseResult"] = agent_result
    return line


def agent_tool(tool_id, kind="Explore"):
    return (tool_id, "Agent", {"description": "look around", "prompt": "find it", "subagent_type": kind})


class Facts(SessionFacts):
    def __init__(self, writer=None, **kwargs):
        super().__init__(writer or MemoryWriter(), keeps_text=lambda: True, **kwargs)
        self.tool_calls = ToolCalls(self.writer, keeps_text=lambda: True)


def ingester(db, projects: Path, **kwargs) -> TranscriptUsageIngester:
    root = projects.parent
    return TranscriptUsageIngester(db, claude_projects=projects, codex_sessions=root / "codex",
                                   copilot_state=root / "copilot" / "session-state",
                                   vscode_workspaces=root / "vscode" / "workspaceStorage",
                                   tool_calls=db.tool_calls, **kwargs)


def agents(db) -> dict[tuple[str, str], dict]:
    return {(r["session_id"], r["agent_id"]): r for r in current(db.writer, "agents")}


def requests(db) -> dict[str, dict]:
    return {r["dedup_key"]: r for r in current(db.writer, "requests")}


def tools(db) -> dict[str, dict]:
    return {r["source_event_id"]: r for r in current(db.writer, "tool_invocations")}


def sessions(db) -> dict[str, dict]:
    return {r["session_id"]: r for r in current(db.writer, "sessions")}


def subagent(folder: Path, agent: str, lines: list[dict], meta: dict | None) -> None:
    path = folder / "subagents" / f"agent-{agent}.jsonl"
    write(path, lines)
    if meta is not None:
        path.with_name(f"agent-{agent}.meta.json").write_text(json.dumps(meta), encoding="utf-8")


# ── 1. Two sessions, same agent types, one nested ─────────────────────


def two_sessions(projects: Path) -> None:
    repo = projects / "-work-repo"
    for sid, n in ((A, "1"), (B, "2")):
        write(repo / f"{sid}.jsonl", [
            user(sid, "go", 600),
            assistant(sid, f"m{n}a", 590, tools=[agent_tool(f"toolu_{n}_main")]),
            result(sid, f"toolu_{n}_main", 300, agent_result={"agentId": f"x{n}", "status": "completed"}),
            assistant(sid, f"m{n}b", 290),
        ])
        # The main agent's subagent x<n> starts y<n>, which runs two levels down.
        subagent(repo / sid, f"x{n}", [
            user(sid, "find it", 580, agent=f"x{n}"),
            assistant(sid, f"x{n}a", 570, agent=f"x{n}", tools=[agent_tool(f"toolu_{n}_nested")]),
            result(sid, f"toolu_{n}_nested", 400, agent=f"x{n}"),
            assistant(sid, f"x{n}b", 390, agent=f"x{n}"),
        ], {"agentType": "Explore", "description": "look around", "toolUseId": f"toolu_{n}_main", "spawnDepth": 1})
        subagent(repo / sid, f"y{n}", [
            user(sid, "deeper", 560, agent=f"y{n}"),
            assistant(sid, f"y{n}a", 550, agent=f"y{n}"),
        ], {"agentType": "Explore", "description": "deeper", "toolUseId": f"toolu_{n}_nested", "spawnDepth": 2,
            "parentAgentId": f"x{n}"})


def test_each_subagent_lands_under_its_own_session_and_parent(tmp_path):
    projects = tmp_path / "projects"
    two_sessions(projects)
    db = Facts()
    ingester(db, projects).poll()

    found = agents(db)
    assert set(found) == {(A, "x1"), (A, "y1"), (B, "x2"), (B, "y2")}
    calls = tools(db)
    for sid, n in ((A, "1"), (B, "2")):
        top, nested = found[(sid, f"x{n}")], found[(sid, f"y{n}")]
        assert (top["parent_agent_id"], top["spawn_depth"]) == ("", 1)
        assert (nested["parent_agent_id"], nested["spawn_depth"]) == (f"x{n}", 2)
        # The spawning call is a tool call of the parent agent, in the same session.
        spawn = calls[nested["parent_tool_use_id"]]
        assert (spawn["session_id"], spawn["agent_id"], spawn["tool_name"]) == (sid, f"x{n}", "Agent")
        assert calls[top["parent_tool_use_id"]]["session_id"] == sid
        assert calls[top["parent_tool_use_id"]]["agent_id"] == ""


# ── 2. A resumed session's copy ───────────────────────────────────────


def original(projects: Path) -> Path:
    folder = projects / "-work-repo"
    write(folder / f"{A}.jsonl", [
        {"type": "custom-title", "customTitle": "the original", "sessionId": A},
        user(A, "first", 900),
        assistant(A, "a1", 890, tools=[agent_tool("toolu_a")]),
        result(A, "toolu_a", 700, agent_result={"agentId": "sub1", "status": "completed"}),
        assistant(A, "a2", 690),
    ])
    subagent(folder / A, "sub1", [
        user(A, "find it", 880, agent="sub1"),
        assistant(A, "s1", 870, agent="sub1"),
    ], {"agentType": "Explore", "description": "look around", "toolUseId": "toolu_a", "spawnDepth": 1})
    return folder


def resumed(projects: Path, origin_folder: Path, folder_name: str = "-work-repo") -> None:
    """B replays A's lines (with A's id), then adds its own; its subagents/ folder is a copy without meta."""
    folder = projects / folder_name
    copied = [json.loads(line) for line in (origin_folder / f"{A}.jsonl").read_text().splitlines()]
    write(folder / f"{B}.jsonl", [
        *copied,
        {"type": "custom-title", "customTitle": "the resumed one", "sessionId": B},
        user(B, "continue", 500, cwd="/work/other", branch="feature", prompt="p2"),
        assistant(B, "b1", 490, cwd="/work/other", branch="feature"),
    ])
    source = origin_folder / A / "subagents" / "agent-sub1.jsonl"
    copy = folder / B / "subagents" / "agent-sub1.jsonl"
    copy.parent.mkdir(parents=True, exist_ok=True)
    copy.write_bytes(source.read_bytes())


def check_resume(db) -> None:
    calls = requests(db)
    assert {r["session_id"] for r in calls.values()} == {A, B}
    assert sorted(r["session_id"] for r in calls.values()) == [A, A, A, B]  # a1, a2, s1 and b1, once each
    assert {k for k, r in calls.items() if r["session_id"] == B} == {
        k for k, r in calls.items() if r["model"] and r["session_id"] == B}
    assert {(s, a) for s, a in agents(db)} == {(A, "sub1")}
    assert {r["session_id"] for r in tools(db).values()} == {A}
    prompts = current(db.writer, "session_prompts")
    assert sorted((r["session_id"], r["agent_id"]) for r in prompts) == [(A, ""), (A, "sub1"), (B, "")]
    rows = sessions(db)
    assert rows[B]["resumed_from"] == A and not rows[A].get("resumed_from")
    assert (rows[B]["project_path"], rows[B]["git_branch"]) == ("/work/other", "feature")
    assert rows[A]["title"] == "the original"
    assert rows[A]["request_count"] + rows[B]["request_count"] == len(calls)


@pytest.mark.parametrize("copy_first", [False, True])
def test_a_resumed_copy_never_takes_or_repeats_the_original(tmp_path, copy_first):
    projects = tmp_path / "projects"
    folder = original(projects)
    resumed(projects, folder)
    db = Facts()
    if copy_first:
        # B is older on disk: it is read first.
        for path in (projects / "-work-repo").rglob("*.jsonl"):
            if B in str(path):
                import os
                os.utime(path, (NOW - 3000, NOW - 3000))
    ingester(db, projects).poll()
    check_resume(db)


def test_a_resumed_copy_read_after_a_restart_with_the_original_stored(tmp_path):
    projects = tmp_path / "projects"
    folder = original(projects)
    state = StateFile(tmp_path / "transcript_usage.json")
    db = Facts()
    ingester(db, projects, checkpoint=state).poll()
    resumed(projects, folder)
    restarted = Facts(db.writer)
    reader = ingester(restarted, projects, checkpoint=StateFile(tmp_path / "transcript_usage.json"))
    reader._resume_before = time.time() + 60  # A's files are unchanged since the saved start: not read again
    reader.poll()
    assert not any(A in str(p) for p in reader._offsets)
    check_resume(restarted)


def test_a_resumed_copy_under_another_project_folder(tmp_path):
    projects = tmp_path / "projects"
    folder = original(projects)
    resumed(projects, folder, "-work-other")
    db = Facts()
    ingester(db, projects).poll()
    check_resume(db)
    assert claude_resume_origin(projects / "-work-other" / f"{B}.jsonl") == A
    assert resumed_claude_sessions([projects]) == {B: A}


def test_a_copied_subagent_row_left_by_an_older_reader_is_deleted(tmp_path):
    projects = tmp_path / "projects"
    folder = original(projects)
    resumed(projects, folder)
    db = Facts()
    db.agents([AgentRow(agent_id="sub1", session_id=B, tool="claude-code", is_sidechain=1, started_at=NOW - 880)])
    ingester(db, projects).poll()
    assert set(agents(db)) == {(A, "sub1")}


def test_a_reread_request_reimports_only_those_files(tmp_path):
    projects = tmp_path / "projects"
    folder = original(projects)
    state = StateFile(tmp_path / "transcript_usage.json")
    ingester(Facts(), projects, checkpoint=state).poll()
    files = sorted(folder.rglob("*.jsonl"))
    request_reread(tmp_path, files[:1])
    db = Facts()
    ingester(db, projects, checkpoint=StateFile(tmp_path / "transcript_usage.json")).poll()
    written = {name for _, name, rows in db.writer.operations if rows}
    assert "requests" in written
    assert not list(tmp_path.glob("transcript_usage.reread-*.json"))


# ── 3. One agent id under two sessions ────────────────────────────────


def resolver(rows):
    reader = FixtureReader({"agents.resolve": lambda params: [
        r for r in rows if not params["requested_session"] or r["session_id"] == params["requested_session"]]})
    return HistoryScope(reader, None, qualified=False)


def test_the_same_agent_id_in_two_sessions_is_two_agents(tmp_path):
    db = Facts()
    db.agents([AgentRow(agent_id="dup", session_id=A, tool="claude-code", started_at=NOW - 10),
               AgentRow(agent_id="dup", session_id=C, tool="claude-code", started_at=NOW - 5)])
    assert set(agents(db)) == {(A, "dup"), (C, "dup")}

    history = resolver([{"node_id": "n1", "agent_id": "dup", "session_id": A, "priority": 0},
                        {"node_id": "n2", "agent_id": "dup", "session_id": C, "priority": 0}])
    with pytest.raises(ScopeError) as err:
        _resolve_agent(history, "dup")
    assert err.value.status == 409 and agent_address(A, "dup") in str(err.value) and agent_address(C, "dup") in str(err.value)
    assert _resolve_agent(history, agent_address(C, "dup")) == (C, "dup")
    assert _resolve_agent(resolver([{"node_id": "n1", "agent_id": "one", "session_id": A, "priority": 0}]), "one") == (A, "one")


# ── 4. A worktree subagent ────────────────────────────────────────────


def test_a_worktree_subagent_keeps_its_own_folder_and_branch(tmp_path):
    projects = tmp_path / "projects"
    repo = projects / "-work-repo"
    tree = "/work/repo/.claude/worktrees/agent-w1"
    write(repo / f"{A}.jsonl", [user(A, "go", 600), assistant(A, "m1", 590, tools=[agent_tool("toolu_w")])])
    subagent(repo / A, "w1", [
        user(A, "work", 580, agent="w1", cwd=tree, branch="worktree-agent-w1"),
        assistant(A, "w1a", 570, agent="w1", cwd=tree, branch="worktree-agent-w1"),
    ], {"agentType": "general-purpose", "toolUseId": "toolu_w", "spawnDepth": 1, "worktreePath": tree,
        "worktreeBranch": "worktree-agent-w1"})
    db = Facts()
    ingester(db, projects).poll()
    row = sessions(db)[A]
    assert (row["project_path"], row["git_branch"]) == ("/work/repo", "main")
    agent = agents(db)[(A, "w1")]
    assert (agent["cwd"], agent["git_branch"], agent["worktree_path"]) == (tree, "worktree-agent-w1", tree)


# ── completion is what the latest observation says ────────────────────


def test_a_subagent_is_completed_only_after_its_final_reply(tmp_path):
    projects = tmp_path / "projects"
    folder = projects / "-work-repo"
    write(folder / f"{A}.jsonl", [user(A, "go", 900)])
    path = folder / A / "subagents" / "agent-r1.jsonl"
    db = Facts()
    reader = ingester(db, projects)
    meta = {"agentType": "Explore", "toolUseId": "toolu_r", "spawnDepth": 1}
    subagent(folder / A, "r1", [user(A, "look", 800, agent="r1"),
                                assistant(A, "r1a", 790, agent="r1", tools=[("toolu_x", "Read", {"file_path": "x"})])],
             meta)
    reader.poll()
    assert agents(db)[(A, "r1")]["completed"] == 0  # a pending tool call is not an end
    write(path, [result(A, "toolu_x", 780, agent="r1"), assistant(A, "r1b", 770, agent="r1")])
    reader.poll()
    done = agents(db)[(A, "r1")]
    assert done["completed"] == 1 and done["ended_at"] == pytest.approx(NOW - 770, abs=1)
    write(path, [user(A, "once more", 700, agent="r1"), assistant(A, "r1c", 690, agent="r1",
                                                                  tools=[("toolu_y", "Read", {"file_path": "y"})])])
    reader.poll()
    again = agents(db)[(A, "r1")]
    assert again["completed"] == 0 and again["ended_at"] is None  # resumed: running again


def test_an_older_observation_never_overrides_a_newer_one():
    db = Facts()
    db.agents([AgentRow(agent_id="z", session_id=A, completed=0, observed_at=NOW - 10)])
    db.agents([AgentRow(agent_id="z", session_id=A, completed=1, ended_at=NOW - 50, observed_at=NOW - 50)])
    assert agents(db)[(A, "z")]["completed"] == 0
    db.agents([AgentRow(agent_id="z", session_id=A, completed=1, ended_at=NOW - 5, observed_at=NOW - 5)])
    assert agents(db)[(A, "z")]["completed"] == 1


def test_the_agent_team_scan_needs_a_final_reply_too(tmp_path):
    from aictl.monitoring.tool_telemetry import _parse_agent_file

    path = tmp_path / "agent-q.jsonl"
    write(path, [user(A, "go", 10, agent="q"), assistant(A, "q1", 9, agent="q", tools=[("t", "Read", {})])])
    assert _parse_agent_file(path)["completed"] is False
    write(path, [result(A, "t", 8, agent="q"), assistant(A, "q2", 7, agent="q")])
    assert _parse_agent_file(path)["completed"] is True


# ── 5. Message content under the source's own id ──────────────────────


def message_facts(tmp_path, name):
    writer = MemoryWriter()
    facts = SessionFacts(writer, keeps_text=lambda: True)
    return MessageFacts(facts, CollectionStatus(writer), StateFile(tmp_path / f"{name}.json"))


def test_a_copilot_message_before_its_session_and_one_with_no_session(tmp_path):
    src = tmp_path / "session-store.db"
    with sqlite3.connect(src) as conn:
        conn.execute("CREATE TABLE messages(session_id, role, content, created_at)")
        conn.executemany("INSERT INTO messages VALUES(?,?,?,?)", [
            ("real-uuid", "user", "hello", NOW - 20), ("", "user", "orphan", NOW - 10), (None, "user", "x", NOW - 5)])
    conn.close()
    target = message_facts(tmp_path, "copilot")
    assert CopilotSessionStoreIngester(src, target).poll() == 3
    rows = current(target.writer, "copilot_session_messages")
    assert sorted(r["session_id"] for r in rows) == ["", "", "real-uuid"]
    assert not current(target.writer, "sessions")


def test_a_vscode_chat_with_no_known_session_keeps_its_own_id(tmp_path):
    chat = tmp_path / "workspaceStorage" / "ws1" / "chatSessions" / "chat-1.jsonl"
    chat.parent.mkdir(parents=True)
    chat.write_text(json.dumps({"kind": 0, "v": {"sessionId": "vs-real", "creationDate": int(NOW * 1000), "requests": [
        {"requestId": "r1", "timestamp": int(NOW * 1000), "message": {"text": "hi"},
         "response": [{"value": "hello"}], "modelId": "gpt-4o"}]}}) + "\n", encoding="utf-8")
    target = message_facts(tmp_path, "vscode")
    assert VSCodeChatLogsIngester(tmp_path / "workspaceStorage", target).poll() >= 1
    assert {r["session_id"] for r in current(target.writer, "vscode_chat_messages")} == {"vs-real"}


def test_a_cursor_message_belongs_to_its_chat_not_the_other_one_open(tmp_path):
    src = tmp_path / "conversations.db"
    with sqlite3.connect(src) as conn:
        conn.executescript(
            "CREATE TABLE messages(id INTEGER PRIMARY KEY, conversation_id, role, content, created_at);"
            "CREATE TABLE conversations(id, workspace_path, created_at);"
            "INSERT INTO conversations VALUES('chat-1', '/proj', 0), ('chat-2', '/proj', 0)")
        conn.executemany("INSERT INTO messages VALUES(?,?,?,?,?)", [
            (1, "chat-1", "user", "one", NOW - 20), (2, "chat-2", "user", "two", NOW - 10)])
    conn.close()
    target = message_facts(tmp_path, "cursor")
    from aictl.records import SessionRow
    target.sessions.session(SessionRow("chat-1", "cursor", project_path="/proj", started_at=NOW - 100))
    assert CursorConversationsIngester(src, target).poll() == 2
    rows = {r["content"]: r["session_id"] for r in current(target.writer, "cursor_session_messages")}
    assert rows == {"one": "chat-1", "two": "chat-2"}


# ── 6. A second start with unchanged files writes nothing ─────────────


def test_a_second_start_with_unchanged_files_writes_nothing(tmp_path):
    projects = tmp_path / "projects"
    folder = original(projects)
    resumed(projects, folder)
    two_sessions(tmp_path / "other")
    for path in (tmp_path / "other").rglob("*"):
        target = projects / path.relative_to(tmp_path / "other")
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif not target.exists():
            target.write_bytes(path.read_bytes())
    state = tmp_path / "transcript_usage.json"
    sessions_state = tmp_path / "sessions.json"
    first = Facts(state=StateFile(sessions_state))
    reader = ingester(first, projects, checkpoint=StateFile(state))
    reader.poll()
    first.save()
    assert current(first.writer, "agents")

    second = Facts(state=StateFile(sessions_state))
    restarted = ingester(second, projects, checkpoint=StateFile(state))
    restarted._resume_before = time.time() + 60  # files written in this test are older than the saved start
    restarted.poll()
    touched = {"agents", "agents_text", "sessions", "requests", "tool_invocations", "session_prompts"}
    assert not [name for _, name, rows in second.writer.operations if name in touched and rows]
