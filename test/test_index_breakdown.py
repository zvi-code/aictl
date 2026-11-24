"""The Index breakdown: what a node's readers find on disk, how far they read it, and what the store holds of it.

Every tool folder here is invented under the test's own folder; Windows paths are plain strings.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from kusto_replay import NOW

from aictl import index_breakdown as ib
from aictl.dashboard.history_scope import Scope
from aictl.dashboard.projections.history import HistoryScope
from aictl.ingesters.transcript_usage import READER_VERSIONS, TranscriptUsageIngester
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter

SID_A = "aaaaaaaa-0000-4000-8000-000000000001"  # events file, read completely, stored
SID_B = "aaaaaaaa-0000-4000-8000-000000000002"  # events file, never read
SID_C = "aaaaaaaa-0000-4000-8000-000000000003"  # session folder without events.jsonl
SID_D = "aaaaaaaa-0000-4000-8000-000000000004"  # in session-store.db only, recent, stored from it
SID_E = "aaaaaaaa-0000-4000-8000-000000000005"  # in session-store.db only, older than history_days
SID_F = "bbbbbbbb-0000-4000-8000-000000000006"  # Claude Code main file and a subagent
ROOT_THREAD = "cccccccc-0000-4000-8000-000000000007"  # a Codex thread
SUB_THREAD = "cccccccc-0000-4000-8000-000000000008"  # its sub-agent's rollout
SID_V = "dddddddd-0000-4000-8000-000000000009"  # a VS Code chat
DAY = 86400.0


def _write(path: Path, lines: list[dict], *, mtime: float | None = None) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
    if mtime is not None:
        os.utime(path, (mtime, mtime))
    return path


@pytest.fixture
def tree(tmp_path, monkeypatch):
    """Session folders of every reader, with saved read positions in each state the reader knows."""
    from aictl import tool_homes

    monkeypatch.setattr(tool_homes, "scan_processes", lambda read_open_files=True: [])
    now = time.time()
    copilot = tmp_path / "home" / ".copilot"
    state = copilot / "session-state"
    a = _write(state / SID_A / "events.jsonl", [{"type": "session.start"}, {"type": "user.message"}])
    _write(state / SID_B / "events.jsonl", [{"type": "session.start"}])
    (state / SID_C).mkdir(parents=True)
    with sqlite3.connect(copilot / "session-store.db") as db:
        db.execute("CREATE TABLE sessions (id TEXT, cwd TEXT, created_at TEXT, updated_at TEXT)")
        db.executemany("INSERT INTO sessions VALUES (?, ?, ?, ?)", [
            (SID_A, "/work/a", "2026-11-01T00:00:00Z", "2026-11-01T01:00:00Z"),
            (SID_D, "/work/d", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now - DAY)), None),
            (SID_E, "/work/e", "2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"),
        ])
    claude = tmp_path / "home" / ".claude" / "projects"
    main = _write(claude / "-work-proj" / f"{SID_F}.jsonl", [{"type": "user", "sessionId": SID_F}])
    sub = _write(claude / "-work-proj" / SID_F / "subagents" / "agent-x1.jsonl", [{"type": "user", "sessionId": SID_F}])
    codex = tmp_path / "home" / ".codex" / "sessions"
    root = _write(codex / "2026" / "11" / "01" / f"rollout-2026-11-01T00-00-00-{ROOT_THREAD}.jsonl",
                  [{"type": "session_meta", "payload": {"id": ROOT_THREAD}}])
    _write(codex / "2026" / "09" / "01" / f"rollout-2026-09-01T00-00-00-{SUB_THREAD}.jsonl",
           [{"type": "session_meta", "payload": {"id": SUB_THREAD, "session_id": ROOT_THREAD}}], mtime=now - 60 * DAY)
    vscode = tmp_path / "vscode" / "workspaceStorage"
    _write(vscode / "hash1" / "chatSessions" / f"{SID_V}.jsonl", [{"kind": 0, "v": {"sessionId": SID_V, "requests": []}}])
    _write(state.parent / "session-state" / SID_A / "notes.jsonl.bak", [{}])  # a backup: not a session file form
    checkpoint = StateFile(tmp_path / "restart" / "transcript_usage.json")

    def make():
        return TranscriptUsageIngester(None, claude_projects=claude, codex_sessions=codex, copilot_state=state,
                                       vscode_workspaces=vscode, backfill_days=30, checkpoint=checkpoint)

    def sig(path: Path, version: int, *, size: int | None = None) -> list[int]:
        st = path.stat()
        return [st.st_mtime_ns, st.st_size if size is None else size, version]

    checkpoint.replace({make()._checkpoint_key: {"ts": now, "saved_at": now, "files": {
        str(a): sig(a, READER_VERSIONS["copilot-events"]),
        str(main): sig(main, 0),  # read by an older reader version: read again
        str(sub): sig(sub, READER_VERSIONS["claude-transcript"], size=1),  # grew since it was read
        str(root): sig(root, READER_VERSIONS["codex-rollout"]),
    }}})
    return SimpleNamespace(ing=make(), now=now, tmp=tmp_path, state=state, copilot=copilot, claude=claude, codex=codex,
                           vscode=vscode)


def _breakdown(tree, stored=None, **extra):
    inputs = ib.NodeInputs(node_id="test-node", ingester=tree.ing, live=False, roots=[str(tree.tmp / "work")],
                           settings={"history_days": 30, "ignored_dirs": ["node_modules"]}, context_files=[],
                           repositories=[], stored=stored, homes=[], **extra)
    return ib.build_node(inputs, tree.now)


def _location(body, tool):
    return next(loc for loc in body["locations"] if loc["tool"] == tool and loc["exists"])


def test_each_session_location_counts_its_files_sessions_and_read_states(tree):
    body = _breakdown(tree)
    assert body["reader_state"] == "saved read positions"
    copilot = _location(body, "copilot-cli")
    assert copilot["path"] == str(tree.state)
    assert (copilot["files"], copilot["sessions"], copilot["folders_without_transcript"], copilot["unclaimed"]) == (2, 2, 1, 1)
    assert {k: v for k, v in copilot["states"].items() if v} == {"complete": 1, "waiting": 1}
    claude = _location(body, "claude-code")
    assert (claude["files"], claude["sessions"]) == (2, 1)
    assert {k: v for k, v in claude["states"].items() if v} == {"reread": 1, "changed": 1}
    assert claude["older_version_files"] == 1
    codex = _location(body, "codex-cli")
    # Two rollouts, one thread: the sub-agent's rollout names its root thread.
    assert (codex["files"], codex["sessions"]) == (2, 1)
    assert {k: v for k, v in codex["states"].items() if v} == {"complete": 1, "outside_window": 1}
    vscode = _location(body, "copilot-vscode")
    assert (vscode["files"], vscode["sessions"], vscode["states"]["waiting"]) == (1, 1, 1)


def test_the_copilot_database_counts_sessions_with_and_without_an_events_file(tree):
    db, = _breakdown(tree)["databases"]
    assert db["path"] == str(tree.copilot / "session-store.db")
    assert (db["sessions"], db["with_events_file"], db["without_events_file"], db["outside_window"]) == (3, 1, 2, 1)
    assert db["usage_rows_read"] is True and db["error"] == ""


def test_disk_against_stored_names_each_gap_and_why(tree):
    stored = [
        {"session_id": SID_A, "tool": "copilot-cli", "source": "transcript", "last_activity_at": 1.0},
        {"session_id": SID_D, "tool": "copilot-cli", "source": "copilot-session-store", "last_activity_at": 2.0},
        {"session_id": "aaaaaaaa-0000-4000-8000-0000000000ff", "tool": "copilot-cli", "source": "transcript"},
        {"session_id": "copilot-cli:4242:1.5", "tool": "copilot-cli", "source": "correlator"},
        {"session_id": ROOT_THREAD, "tool": "codex-cli", "source": "transcript"},
        {"session_id": f"vscode-chat:{SID_V}", "tool": "copilot-vscode", "source": "vscode-chat-logs"},
        {"session_id": "cursor:1", "tool": "cursor", "source": "cursor"},
    ]
    rows = {row["tool"]: row for row in _breakdown(tree, stored)["compare"]}
    copilot = rows["copilot-cli"]
    assert (copilot["on_disk"], copilot["stored"], copilot["matched"]) == (5, 4, 2)
    assert copilot["missing_ids"] == {"not_read": [SID_B], "folder_only": [SID_C], "outside_window": [SID_E]}
    assert copilot["stored_only_ids"] == {"gone": ["aaaaaaaa-0000-4000-8000-0000000000ff"], "live": ["copilot-cli:4242:1.5"]}
    assert rows["claude-code"]["missing"] == {"not_read": 1} and rows["claude-code"]["stored"] == 0
    assert (rows["codex-cli"]["on_disk"], rows["codex-cli"]["matched"]) == (1, 1)
    # The VS Code chat reader's vscode-chat:<id> names the chat file's own session.
    assert (rows["copilot-vscode"]["matched"], rows["copilot-vscode"]["missing"]) == (1, {})
    assert rows["cursor"]["comparable"] is False and rows["cursor"]["stored"] == 1


def test_a_comparison_that_is_not_possible_says_why_and_shows_no_figure(tree):
    body = _breakdown(tree, None, stored_error="store unreachable")
    assert all(not row["comparable"] and row["matched"] is None for row in body["compare"])
    assert body["compare"][0]["reason"] == "stored sessions not read: store unreachable"
    filtered = _breakdown(tree, [], project_filter=("/work/a",))
    assert all("project filter" in row["reason"] and row["on_disk"] is None for row in filtered["compare"])


def test_windows_paths_compare_without_regard_to_case_or_separators():
    assert ib.is_under(r"c:/users/dev/repo/src", r"C:\Users\Dev\Repo")
    assert not ib.is_under(r"C:\Users\Dev\Repo2", r"C:\Users\Dev\Repo")
    assert ib.location_of("copilot-cli", r"C:\Users\Dev\.copilot\session-state\s1\events.jsonl") == \
        r"C:\Users\Dev\.copilot\session-state"
    assert ib.location_of("copilot-vscode", r"D:\Data\Code\User\workspaceStorage\h1\chatSessions\x.jsonl") == \
        r"D:\Data\Code\User\workspaceStorage"
    assert ib.location_of("claude-code", "/home/u/.claude/projects/-w/x.jsonl") == "/home/u/.claude/projects"
    assert ib.location_of("claude-code", r"C:\elsewhere\x.jsonl") == ""
    assert ib.thread_id("codex-cli", f"rollout-2026-11-01T00-00-00-{ROOT_THREAD.upper()}") == ROOT_THREAD


def test_projects_merge_windows_paths_and_flag_ignored_and_outside_folders():
    rows = ib.projects(
        roots=[r"C:\Work"], repositories=[r"C:\Work\RepoA"],
        stored=[{"project_path": "c:/work/repoa", "tool": "copilot-cli", "last_activity_at": 5.0},
                {"project_path": r"C:\Work\RepoA", "tool": "copilot-vscode", "last_activity_at": 9.0},
                {"project_path": r"D:\Other\node_modules\pkg", "tool": "copilot-cli", "last_activity_at": 1.0}],
        context_files=[{"path": r"C:\Work\RepoA\.github\copilot-instructions.md", "category": "instructions"},
                       {"path": r"C:\Work\RepoA\.github\skills\deploy\SKILL.md", "category": "skills"},
                       {"path": r"C:\Users\Dev\.claude\projects\-w\memory\MEMORY.md", "category": "memory",
                        "project": r"c:\work\repoa"}],
        ignored_dirs=["node_modules"], local=False)
    by_path = {ib.fold(r["path"]): r for r in rows}
    repo = by_path["c:/work/repoa"]
    assert repo["found_by"] == ["discovered repository", "working folder of a stored session", "memory files"]
    assert repo["sessions"] == {"copilot-cli": 1, "copilot-vscode": 1} and repo["last_activity"] == 9.0
    assert (repo["instructions"], repo["skills"], repo["memory"], repo["ignored"], repo["outside_roots"]) == (1, 1, 1, False, False)
    other = by_path["d:/other/node_modules/pkg"]
    assert (other["ignored"], other["outside_roots"], other["exists"]) == (True, True, None)
    assert [r["path"] for r in ib.projects(roots=[r"C:\Work"], repositories=[r"C:\Work\RepoA"], stored=[],
                                           context_files=[], ignored_dirs=[], local=False,
                                           project_filter=["c:/work/repoa"])] == [r"C:\Work\RepoA"]


def test_context_folders_group_files_and_list_catalog_folders_that_hold_none():
    files = [
        {"path": r"C:\Work\RepoA\.github\skills\deploy\SKILL.md", "tool": "copilot-cli", "category": "skills", "scope": "project", "size": 10},
        {"path": r"C:\Work\RepoA\.github\skills\test\SKILL.md", "tool": "copilot-cli", "category": "skills", "scope": "project", "size": 5},
        {"path": "/home/u/.claude/plugins/cache/p/skills/s/SKILL.md", "tool": "claude-code", "category": "skills", "scope": "global"},
        {"path": "/home/u/.claude/CLAUDE.md", "tool": "claude-code", "category": "instructions", "scope": "global"},
        {"path": "/home/u/.claude/settings.json", "tool": "claude-code", "category": "settings", "scope": "global"},
    ]
    missing = {"tool": "claude-code", "category": "agents", "scope": "global", "path": "/home/u/.claude/agents",
               "exists": False, "pattern": "~/.claude/agents/*.md"}
    groups = {(g["category"], g["path"]): g for g in ib.context_locations(files, [missing])}
    skills = groups[("skills", r"C:\Work\RepoA\.github\skills")]
    assert (skills["files"], skills["bytes"], skills["scope"]) == (2, 15, "project")
    assert groups[("skills", "/home/u/.claude/plugins/cache/p/skills")]["scope"] == "plugin"
    assert groups[("instructions", "/home/u/.claude")]["files"] == 1
    assert groups[("agents", "/home/u/.claude/agents")] | {} == {**missing, "files": 0, "bytes": 0, "newest": None, "listed": []}
    assert not any(category == "settings" for category, _ in groups)


def test_a_published_snapshot_stays_under_its_size_and_is_written_as_the_nodes_row(tree):
    body = _breakdown(tree, [])
    body["compare"][0]["missing_ids"] = {"not_read": [f"id-{n:05d}" for n in range(30000)]}
    text = ib.compact(body, max_bytes=60_000)
    assert len(text.encode()) <= 60_000
    assert len(json.loads(text)["compare"][0]["missing_ids"]["not_read"]) <= ib.PUBLISHED_IDS
    writer = MemoryWriter()
    ib.publish(writer, _breakdown(tree, []))
    (op, table, rows), = writer.operations
    assert (op, table, rows[0]["key"], rows[0]["value"]) == ("upsert", "maintenance_state", ib.SNAPSHOT_KEY, tree.now)
    assert json.loads(rows[0]["text"])["node_id"] == "test-node"


def test_the_text_form_names_every_section_with_its_values(tree):
    stored = [{"session_id": SID_A, "tool": "copilot-cli", "source": "transcript"}]
    text = ib.format_text(_breakdown(tree, stored), ids=True)
    assert f"Copilot database {tree.copilot / 'session-store.db'}" in text
    assert "3 sessions: 1 with an events.jsonl" in text
    assert "1 session folders without events.jsonl" in text
    assert f"not stored, {ib.MISSING_REASONS['folder_only']}: 1" in text and SID_C in text


def test_this_node_live_from_the_running_reader(tree, monkeypatch):
    handle = SimpleNamespace(name="transcript-usage", enabled=True, ingester=tree.ing,
                             status=lambda: {"last_poll_ts": 10.0, "last_success_at": 11.0, "last_error": None})
    server = SimpleNamespace(root=tree.tmp / "work", ingesters={"transcript-usage": handle},
                             store=SimpleNamespace(snapshot=None))
    body = ib.breakdown(server, Scope(), now=tree.now)
    node, = body["nodes"]
    assert (body["scope"], node["origin"], node["reader_state"]) == ({"kind": "local", "node_id": None}, "live", "running daemon")
    assert node["settings"]["polls"] == [{"reader": "transcript-usage", "enabled": True, "last_poll_at": 10.0,
                                          "last_completed_at": 11.0, "last_error": None}]
    assert node["compare"][0]["reason"] == "stored sessions not read: no store configured"
    assert body["tool_labels"]["copilot-cli"] and body["tool_labels"]["codex-cli"]
    assert _location(node, "copilot-cli")["files"] == 2


# ── from the store ──────────────────────────────────────────────────────

WIN = r"C:\Users\Dev\.copilot\session-state"


def _seed_windows_node(kusto_store):
    seed = kusto_store.insert
    started = NOW - 3600
    for sid, status, indexed in (("s1", "complete", NOW - 60), ("s2", "waiting", NOW - 60), ("s3", "complete", NOW - 7200)):
        seed("session_sources", node_id="win-node", source_file=rf"{WIN}\{sid}\events.jsonl", session_id=sid,
             tool="copilot-cli", size_bytes=100, mtime=NOW - 100, bytes_read=100 if status == "complete" else 0,
             status=status, indexed_at=indexed)
    seed("sessions", node_id="win-node", session_id="s1", tool="copilot-cli", source="transcript", project_path=r"C:\Work\A",
         last_activity_at=NOW - 50)
    seed("sessions", node_id="win-node", session_id="s9", tool="copilot-cli", source="transcript", last_activity_at=NOW - 40)
    seed("sessions", node_id="win-node", session_id="s9", tool="copilot-cli", source="transcript", _deleted=True,
         _v="2026-02-01")
    seed("sessions", node_id="win-node", session_id="s8", tool="copilot-cli", source="transcript", last_activity_at=NOW - 30)
    snapshot = {"node_id": "win-node", "origin": "live", "computed_at": NOW - 120,
                "settings": {"daemon_started_at": started, "roots": [r"C:\Work"]},
                "projects": [{"path": r"C:\Work\A"}, {"path": r"C:\Work\B"}]}
    seed("maintenance_state", node_id="win-node", key=ib.SNAPSHOT_KEY, value=NOW - 300, text="{}", _v="2026-01-01")
    seed("maintenance_state", node_id="win-node", key=ib.SNAPSHOT_KEY, value=NOW - 120, text=json.dumps(snapshot),
         _v="2026-01-02")
    seed("sessions", node_id="lin-node", session_id="l1", tool="claude-code", source="transcript", project_path="/w")


def test_stored_sessions_and_indexed_files_page_through_every_row(kusto_store):
    _seed_windows_node(kusto_store)
    history = HistoryScope(kusto_store.history_store.reader, "win-node")
    assert [r["session_id"] for r in history.read("index.stored_sessions", limit=1)] == ["s1", "s8"]
    rows = history.read("index.disk_sessions", seen_since=NOW - 3600, limit=1)
    assert [(r["session_id"], r["complete"], r["waiting"]) for r in rows] == [("s1", 1, 0), ("s2", 0, 1)]
    assert len(history.read("index.disk_sessions", limit=1)) == 3


def test_another_node_comes_from_its_published_snapshot_and_its_indexed_files(kusto_store):
    _seed_windows_node(kusto_store)
    server = SimpleNamespace(store=kusto_store)
    body = ib.breakdown(server, Scope("node", "win-node"), project_filter=[r"c:\work\a"], now=NOW)
    node, = body["nodes"]
    assert (node["origin"], node["published_at"], node["settings"]["roots"]) == ("published", NOW - 120, [r"C:\Work"])
    assert [p["path"] for p in node["projects"]] == [r"C:\Work\A"]
    index = node["store_index"]
    location, = index["locations"]
    assert (location["path"], location["files"], location["sessions"]) == (WIN, 2, 2)
    assert index["since_daemon_start"] == NOW - 3600
    copilot = next(row for row in index["compare"] if row["tool"] == "copilot-cli")
    assert copilot["reason"].startswith("not compared with a project filter")
    whole = ib.breakdown(server, Scope("node", "win-node"), now=NOW)["nodes"][0]["store_index"]["compare"]
    copilot = next(row for row in whole if row["tool"] == "copilot-cli")
    assert (copilot["on_disk"], copilot["stored"], copilot["matched"]) == (2, 2, 1)
    assert copilot["missing_ids"] == {"not_read": ["s2"]} and copilot["stored_only_ids"] == {"gone": ["s8"]}


def test_the_fleet_lists_a_node_without_a_snapshot_with_what_the_store_has(kusto_store):
    _seed_windows_node(kusto_store)
    body = ib.breakdown(SimpleNamespace(store=kusto_store), Scope("fleet"), now=NOW)
    nodes = {node["node_id"]: node for node in body["nodes"]}
    assert set(nodes) == {"win-node", "lin-node"}
    linux = nodes["lin-node"]
    assert (linux["origin"], linux["homes"], linux["published_at"]) == ("store", None, None)
    assert "publishes no breakdown" in linux["note"]
    assert [p["path"] for p in linux["projects"]] == ["/w"]
    claude = next(row for row in linux["store_index"]["compare"] if row["tool"] == "claude-code")
    assert (claude["comparable"], claude["on_disk"], claude["stored"]) == (False, None, 1)
    assert claude["reason"].startswith("the store holds no indexed session file of this node")
