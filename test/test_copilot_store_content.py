# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Copilot sessions that only ``session-store.db`` still holds: Copilot removes old session folders,
their rows stay in the database. Before this reader, aictl took only usage numbers and a few outcome
fields from the database, so such a session had no row, no prompts and no tool calls. A session with
an ``events.jsonl`` keeps that file as its only source, also after its folder is gone.

All text here is invented."""

from __future__ import annotations

import json
import shutil
import sqlite3
from pathlib import Path

import pytest
from test_board_facts import iso, write_lines
from test_session_investigation import Facts, ingester, table, written

from aictl.ingesters import copilot_store_content
from aictl.records import COPILOT_STORE_SOURCE
from aictl.state_file import StateFile

EVENTS_SID = "aaaaaaaa-0000-4000-8000-00000000000a"
STORE_SID = "bbbbbbbb-0000-4000-8000-00000000000b"
EMPTY_SID = "cccccccc-0000-4000-8000-00000000000c"
OTHER_SID = "dddddddd-0000-4000-8000-00000000000d"
SECRET = "ghp_inventedinventedinventedinvented0000"
PROSE = ("invented question one", "invented answer one", "invented question two", "invented event prompt")
CONTENT_TABLES = (
    "session_prompts",
    "session_steps",
    "tool_invocations",
    "tool_invocations_text",
    "context_events",
    "session_files",
)

SCHEMA = """
    CREATE TABLE sessions (id TEXT PRIMARY KEY, cwd TEXT, repository TEXT, host_type TEXT, branch TEXT, summary TEXT,
        created_at TEXT, updated_at TEXT);
    CREATE TABLE turns (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, turn_index INTEGER, user_message TEXT,
        assistant_response TEXT, timestamp TEXT);
    CREATE TABLE forge_trajectory_events (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, tool_call_id TEXT,
        turn_index INTEGER, event_type TEXT, command TEXT, output TEXT, exit_code INTEGER, event_key TEXT,
        event_value TEXT, created_at TEXT);
    CREATE TABLE session_files (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, file_path TEXT, tool_name TEXT,
        turn_index INTEGER, first_seen_at TEXT);
"""


def store(home: Path, schema: str = SCHEMA) -> sqlite3.Connection:
    home.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(home / "session-store.db")
    conn.executescript(schema)
    return conn


def session(conn, sid, ago, *, cwd="/work/invented", repo="example/invented", branch="main"):
    conn.execute(
        "INSERT INTO sessions VALUES (?, ?, ?, 'github', ?, 'Invented summary', ?, ?)",
        (sid, cwd, repo, branch, iso(ago), iso(ago - 50)),
    )


def turn(conn, sid, index, prompt, reply, ago):
    conn.execute(
        "INSERT INTO turns (session_id, turn_index, user_message, assistant_response, timestamp)"
        " VALUES (?, ?, ?, ?, ?)",
        (sid, index, prompt, reply, iso(ago)),
    )


def command(conn, sid, index, text, ago, exit_code=None):
    conn.execute(
        "INSERT INTO forge_trajectory_events (session_id, turn_index, event_type, command, created_at)"
        " VALUES (?, ?, 'command', ?, ?)",
        (sid, index, text, iso(ago)),
    )
    if exit_code is not None:
        conn.execute(
            "INSERT INTO forge_trajectory_events (session_id, turn_index, event_type, command, exit_code,"
            " created_at) VALUES (?, ?, 'result', ?, ?, ?)",
            (sid, index, text, exit_code, iso(ago - 2)),
        )


def events_session(root: Path, sid: str = EVENTS_SID) -> None:
    write_lines(
        root / "copilot" / "session-state" / sid / "events.jsonl",
        [
            {"type": "session.start", "id": "e1", "timestamp": iso(900), "data": {"context": {"cwd": "/work/events"}}},
            {"type": "user.message", "id": "e2", "timestamp": iso(890), "data": {"content": "invented event prompt"}},
            {
                "type": "tool.execution_start",
                "id": "e3",
                "timestamp": iso(880),
                "data": {"toolCallId": "call-1", "toolName": "bash", "arguments": {"command": "git status"}},
            },
            {
                "type": "tool.execution_complete",
                "id": "e4",
                "timestamp": iso(879),
                "data": {"toolCallId": "call-1", "success": True, "result": {"content": "clean"}},
            },
            {
                "type": "assistant.message",
                "id": "e5",
                "timestamp": iso(870),
                "data": {"content": "invented event reply"},
            },
        ],
    )


def build(root: Path) -> sqlite3.Connection:
    """A session with an events file (also in the database), one with database rows only, and one the
    database lists with no turn at all."""
    events_session(root)
    conn = store(root / "copilot")
    session(conn, EVENTS_SID, 900)
    turn(conn, EVENTS_SID, 0, "invented event prompt", "invented event reply", 870)
    command(conn, EVENTS_SID, 0, "git status", 880, exit_code=0)
    session(conn, STORE_SID, 700)
    command(conn, STORE_SID, 0, "pytest -q", 690, exit_code=0)
    command(
        conn, STORE_SID, 0, f'curl -H "Authorization: Bearer {SECRET}" https://api.example.test/v1', 685, exit_code=7
    )
    turn(conn, STORE_SID, 0, "invented question one", "invented answer one", 680)
    command(conn, STORE_SID, 1, "make build", 670)  # never got a result
    turn(conn, STORE_SID, 1, "invented question two", "", 660)
    conn.execute(
        "INSERT INTO session_files (session_id, file_path, tool_name, turn_index, first_seen_at)"
        " VALUES (?, '/work/invented/a.py', 'edit', 0, ?)",
        (STORE_SID, iso(686)),
    )
    session(conn, EMPTY_SID, 500)
    conn.commit()
    return conn


def from_store(facts: Facts, name: str, sid: str) -> list[dict]:
    return [r for r in table(facts, name, session_id=sid)]


def content_counts(facts: Facts) -> dict[str, int]:
    return {name: written(facts, name) for name in CONTENT_TABLES}


class TestDatabaseOnlySessions:
    def test_every_session_the_database_lists_gets_a_row(self, tmp_path):
        build(tmp_path).close()
        facts = Facts()
        ingester(facts, tmp_path).poll()
        rows = {r["session_id"]: r for r in table(facts, "sessions")}
        assert set(rows) == {EVENTS_SID, STORE_SID, EMPTY_SID}
        assert rows[EVENTS_SID]["source"] == "transcript"
        assert rows[STORE_SID]["source"] == rows[EMPTY_SID]["source"] == COPILOT_STORE_SOURCE
        store_row = rows[STORE_SID]
        assert (store_row["tool"], store_row["project_path"], store_row["git_branch"]) == (
            "copilot-cli",
            "/work/invented",
            "main",
        )
        assert store_row["title"] == "Invented summary"
        assert store_row["tool_call_count"] == 3
        assert store_row["started_at"] < store_row["last_activity_at"]
        # No usage row: the database reports no tokens for these sessions, which is not a zero.
        assert {r["session_id"] for r in table(facts, "session_usage")} == {EVENTS_SID}

    def test_prompts_replies_calls_and_files_of_a_session_with_no_events_file(self, tmp_path):
        build(tmp_path).close()
        facts = Facts()
        ingester(facts, tmp_path).poll()
        prompts = sorted(from_store(facts, "session_prompts", STORE_SID), key=lambda r: r["ts"])
        assert [p["text"] for p in prompts] == ["invented question one", "invented question two"]
        # A turn row is written when the turn ends; the prompt takes the time of the turn's first command.
        assert prompts[0]["ts"] == pytest.approx(tmp_path_now() - 690, abs=5)
        steps = from_store(facts, "session_steps", STORE_SID)
        assert {s["source"] for s in steps} == {COPILOT_STORE_SOURCE}
        assert sorted((s["role"], s["kind"]) for s in steps) == [
            ("assistant", "message"),
            ("user", "message"),
            ("user", "message"),
        ]
        texts = {r["text"] for r in from_store(facts, "session_steps", STORE_SID)}
        assert texts == {"invented question one", "invented answer one", "invented question two"}
        calls = sorted(from_store(facts, "tool_invocations", STORE_SID), key=lambda r: r["ts"])
        assert [(c["tool_name"], c["command_name"], c["exit_code"], c["is_error"], c["turn_index"]) for c in calls] == [
            (copilot_store_content.SHELL_TOOL, "pytest", 0, 0, 1),
            (copilot_store_content.SHELL_TOOL, "curl", 7, 1, 1),
            (copilot_store_content.SHELL_TOOL, "make", None, 0, 2),
        ]
        assert {c["source"] for c in calls} == {COPILOT_STORE_SOURCE}
        assert calls[0]["duration_ms"] == pytest.approx(2000, abs=50)
        assert calls[0]["output_bytes"] is None  # the database keeps no output here: not reported
        assert [f["path"] for f in from_store(facts, "session_files", STORE_SID)] == ["/work/invented/a.py"]
        start = [e for e in from_store(facts, "context_events", STORE_SID) if e["kind"] == "config.session_start"]
        assert len(start) == 1 and start[0]["trigger"] == COPILOT_STORE_SOURCE
        assert json.loads(start[0]["detail"])["context"]["repository"] == "example/invented"

    def test_a_session_with_an_events_file_gets_nothing_from_the_database(self, tmp_path):
        build(tmp_path).close()
        facts = Facts()
        ingester(facts, tmp_path).poll()
        assert [p["text"] for p in from_store(facts, "session_prompts", EVENTS_SID)] == ["invented event prompt"]
        assert len(from_store(facts, "tool_invocations", EVENTS_SID)) == 1
        for name in ("session_steps", "tool_invocations", "context_events"):
            assert all(
                COPILOT_STORE_SOURCE not in (r.get("source"), r.get("trigger"))
                for r in from_store(facts, name, EVENTS_SID)
            ), name

    def test_a_second_poll_writes_nothing_new(self, tmp_path):
        build(tmp_path).close()
        facts = Facts()
        reader = ingester(facts, tmp_path)
        reader.poll()
        before = content_counts(facts) | {"sessions": written(facts, "sessions")}
        reader.poll()
        assert content_counts(facts) | {"sessions": written(facts, "sessions")} == before

    def test_a_restart_stores_no_row_twice(self, tmp_path):
        build(tmp_path).close()
        facts = Facts()
        state = StateFile(tmp_path / "state.json")
        ingester(facts, tmp_path, checkpoint=state).poll()
        before = content_counts(facts)
        ingester(facts, tmp_path, checkpoint=state).poll()
        assert content_counts(facts) == before

    def test_a_removed_folder_adds_no_database_rows_on_top_of_its_events_rows(self, tmp_path):
        conn = build(tmp_path)
        facts = Facts()
        state = StateFile(tmp_path / "state.json")
        reader = ingester(facts, tmp_path, checkpoint=state)
        reader.poll()
        shutil.rmtree(tmp_path / "copilot" / "session-state" / EVENTS_SID)
        # The database changes, as it does while Copilot runs.
        session(conn, OTHER_SID, 120)
        turn(conn, OTHER_SID, 0, "invented other prompt", "", 100)
        conn.commit()
        conn.close()
        reader.poll()
        ingester(facts, tmp_path, checkpoint=state).poll()  # and after a restart
        assert [p["text"] for p in from_store(facts, "session_prompts", EVENTS_SID)] == ["invented event prompt"]
        assert len(from_store(facts, "tool_invocations", EVENTS_SID)) == 1
        assert not [s for s in from_store(facts, "session_steps", EVENTS_SID) if s["source"] == COPILOT_STORE_SOURCE]
        assert [p["text"] for p in from_store(facts, "session_prompts", OTHER_SID)] == ["invented other prompt"]

    def test_a_folder_removed_before_this_reader_kept_its_ids_counts_by_the_saved_positions(self, tmp_path):
        # An older aictl saved the events file as read; it then disappeared. Its session stays the file's.
        build(tmp_path).close()
        events = tmp_path / "copilot" / "session-state" / EVENTS_SID / "events.jsonl"
        state = StateFile(tmp_path / "state.json")
        ingester(Facts(), tmp_path, checkpoint=state).poll()
        saved = state.read()
        for entry in saved.values():
            entry.pop("copilot_event_sessions", None)
            entry.pop("copilot_store_content", None)
            entry.pop("copilot_store_content_version", None)
            assert str(events) in entry["files"]
        state.replace(saved)
        shutil.rmtree(events.parent)
        facts = Facts()
        ingester(facts, tmp_path, checkpoint=state).poll()
        assert from_store(facts, "session_prompts", EVENTS_SID) == []
        assert [p["text"] for p in sorted(from_store(facts, "session_prompts", STORE_SID), key=lambda r: r["ts"])] == [
            "invented question one",
            "invented question two",
        ]

    def test_text_capture_off_writes_no_text(self, tmp_path):
        build(tmp_path).close()
        facts = Facts(keeps_text=False)
        ingester(facts, tmp_path).poll()
        assert {p["text"] for p in from_store(facts, "session_prompts", STORE_SID)} == {""}
        assert {s["text"] for s in from_store(facts, "session_steps", STORE_SID)} == {None}
        assert {s["text_status"] for s in from_store(facts, "session_steps", STORE_SID)} == {"withheld"}
        calls = from_store(facts, "tool_invocations", STORE_SID)
        assert sorted(c["command_name"] for c in calls) == ["curl", "make", "pytest"]
        dumped = json.dumps([facts.writer.written(name) for name in {name for _, name, _ in facts.writer.operations}])
        for prose in (*PROSE[:3], "Authorization", SECRET, "api.example.test/v1"):
            assert prose not in dumped, prose

    def test_a_secret_in_a_command_is_masked(self, tmp_path):
        build(tmp_path).close()
        facts = Facts()
        ingester(facts, tmp_path).poll()
        dumped = json.dumps([facts.writer.written(name) for name in {name for _, name, _ in facts.writer.operations}])
        assert SECRET not in dumped
        keys = {c["dedup_key"] for c in from_store(facts, "tool_invocations", STORE_SID) if c["command_name"] == "curl"}
        curl = [r for r in table(facts, "tool_invocations_text") if r["dedup_key"] in keys]
        assert curl and "<redacted>" in curl[0]["target"] and "<redacted>" in curl[0]["input"]

    def test_a_large_store_is_read_in_batches_and_pairs_results_across_them(self, tmp_path, monkeypatch):
        monkeypatch.setattr(copilot_store_content, "BATCH_ROWS", 2)
        build(tmp_path).close()
        facts = Facts()
        reader = ingester(facts, tmp_path)
        for _ in range(6):
            reader.poll()
        calls = sorted(from_store(facts, "tool_invocations", STORE_SID), key=lambda r: r["ts"])
        assert [(c["command_name"], c["exit_code"]) for c in calls] == [("pytest", 0), ("curl", 7), ("make", None)]
        assert len(from_store(facts, "session_prompts", STORE_SID)) == 2

    def test_a_missing_table_or_column_leaves_that_part_unreported(self, tmp_path):
        conn = store(
            tmp_path / "copilot",
            """
            CREATE TABLE sessions (id TEXT PRIMARY KEY, cwd TEXT, created_at TEXT, updated_at TEXT);
            CREATE TABLE turns (id INTEGER PRIMARY KEY, session_id TEXT, turn_index INTEGER, user_message TEXT,
                timestamp TEXT);
        """,
        )
        conn.execute("INSERT INTO sessions VALUES (?, '/work/invented', ?, ?)", (STORE_SID, iso(700), iso(650)))
        turn_row = "INSERT INTO turns (session_id, turn_index, user_message, timestamp) VALUES (?, 0, ?, ?)"
        conn.execute(turn_row, (STORE_SID, "invented question one", iso(660)))
        conn.execute(turn_row, (OTHER_SID, "invented question unlisted", iso(640)))  # a session the table lacks
        conn.commit()
        conn.close()
        facts = Facts()
        ingester(facts, tmp_path).poll()
        assert one_row(table(facts, "sessions"))["git_branch"] == ""
        assert [p["text"] for p in from_store(facts, "session_prompts", OTHER_SID)] == ["invented question unlisted"]
        assert [p["text"] for p in from_store(facts, "session_prompts", STORE_SID)] == ["invented question one"]
        assert [s["role"] for s in from_store(facts, "session_steps", STORE_SID)] == ["user"]
        assert from_store(facts, "tool_invocations", STORE_SID) == []

    def test_a_locked_store_is_read_at_the_next_poll(self, tmp_path, monkeypatch):
        build(tmp_path).close()
        facts = Facts()
        reader = ingester(facts, tmp_path)
        real = copilot_store_content.open_readonly

        def busy(path, prefix):
            conn = real(path, prefix)

            class Busy:
                def execute(self, *a, **k):
                    raise sqlite3.OperationalError("database is locked")

                def close(self):
                    conn.close()

            return Busy()

        monkeypatch.setattr(copilot_store_content, "open_readonly", busy)
        reader.poll()
        assert from_store(facts, "session_prompts", STORE_SID) == []
        monkeypatch.setattr(copilot_store_content, "open_readonly", real)
        reader.poll()
        assert len(from_store(facts, "session_prompts", STORE_SID)) == 2

    def test_every_copilot_home_is_read(self, tmp_path, monkeypatch):
        from aictl import tool_homes

        build(tmp_path).close()
        other = tmp_path / "elsewhere" / "copilot"
        (other / "session-state").mkdir(parents=True)
        conn = store(other)
        session(conn, OTHER_SID, 400)
        turn(conn, OTHER_SID, 0, "invented question elsewhere", "invented answer elsewhere", 390)
        conn.commit()
        conn.close()
        monkeypatch.setattr(
            tool_homes, "session_dirs", lambda tool: [other / "session-state"] if tool == "copilot" else []
        )
        facts = Facts()
        reader = ingester(facts, tmp_path)
        reader._discover = True
        reader.poll()
        assert one_row(table(facts, "sessions", session_id=OTHER_SID))["source"] == COPILOT_STORE_SOURCE
        assert [p["text"] for p in from_store(facts, "session_prompts", OTHER_SID)] == ["invented question elsewhere"]
        assert len(from_store(facts, "session_prompts", STORE_SID)) == 2


def one_row(rows: list[dict]) -> dict:
    assert len(rows) == 1, rows
    return rows[0]


def tmp_path_now() -> float:
    from test_board_facts import NOW

    return NOW
