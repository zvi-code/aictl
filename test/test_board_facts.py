# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Per-call fact tables, from fixture files that use the tools' real field shapes."""

from __future__ import annotations

import json
import sqlite3
import time
from datetime import datetime
from pathlib import Path

import pytest

from aictl.ingesters.call_facts import apply_patch_files, command_head, edit_line_counts, target_of
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.monitoring import tool_telemetry as tt
from aictl.storage import AgentRow, FileWriteRow, HistoryDB, RequestRow, ToolInvocationRow
from aictl.storage_migrations import CURRENT_VERSION

NOW = time.time()
SESSION = "11111111-1111-4111-8111-111111111111"
COPILOT_SID = "22222222-2222-4222-8222-222222222222"
DESKTOP_SID = "33333333-3333-4333-8333-333333333333"
VSCODE_SID = "44444444-4444-4444-8444-444444444444"
CHAT_ONLY_SID = "55555555-5555-4555-8555-555555555555"
MODEL = "claude-sonnet-4-5"


def iso(ago: float) -> str:
    return datetime.fromtimestamp(NOW - ago).astimezone().isoformat()


def write_lines(path: Path, lines: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        for line in lines:
            fh.write(json.dumps(line) + "\n")


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    return tmp_path


@pytest.fixture
def db(tmp_path):
    store = HistoryDB(tmp_path / "history.db", flush_interval=0)
    yield store
    store.close()


def make_ingester(db, root: Path) -> TranscriptUsageIngester:
    return TranscriptUsageIngester(
        db,
        claude_projects=root / "claude" / "projects",
        codex_sessions=root / "codex",
        copilot_state=root / "copilot" / "session-state",
        vscode_workspaces=root / "vscode" / "workspaceStorage",
    )


def rows(db, sql: str, *params) -> list[dict]:
    cur = db._conn().execute(sql, params)
    names = [c[0] for c in cur.description]
    return [dict(zip(names, r, strict=True)) for r in cur.fetchall()]


def count(db, table: str) -> int:
    return db._conn().execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


FACT_TABLES = ("requests", "tool_invocations", "session_prompts", "skill_uses", "agents", "file_write_events")


def all_counts(db) -> dict[str, int]:
    return {t: count(db, t) for t in FACT_TABLES}


# ── Claude Code fixtures ───────────────────────────────────────────────


def c_user(text, ago, **extra):
    return {
        "type": "user",
        "uuid": f"u-{ago}-{text[:6]}",
        "timestamp": iso(ago),
        "sessionId": SESSION,
        "cwd": "/work/proj",
        "isSidechain": False,
        "message": {"role": "user", "content": text},
        **extra,
    }


def c_assistant(msg_id, req, ago, *, inp=10, out=5, read=100, write=20, blocks=(), ref="", **extra):
    return {
        "type": "assistant",
        "uuid": f"a-{msg_id}-{ago}",
        "timestamp": iso(ago),
        "sessionId": SESSION,
        "cwd": "/work/proj",
        "isSidechain": False,
        "requestId": req,
        "requestRef": ref,
        "message": {
            "id": msg_id,
            "model": MODEL,
            "role": "assistant",
            "stop_reason": "end_turn",
            "content": list(blocks),
            "usage": {
                "input_tokens": inp,
                "output_tokens": out,
                "cache_read_input_tokens": read,
                "cache_creation_input_tokens": write,
                "cache_creation": {"ephemeral_1h_input_tokens": 0},
            },
        },
        **extra,
    }


def c_tool_use(tool_id, name, tool_input):
    return {"type": "tool_use", "id": tool_id, "name": name, "input": tool_input}


def c_tool_result(tool_id, ago, *, is_error=False, content="ok", decision=None, result=None):
    line = {
        "type": "user",
        "uuid": f"r-{tool_id}",
        "timestamp": iso(ago),
        "sessionId": SESSION,
        "cwd": "/work/proj",
        "isSidechain": False,
        "toolUseResult": result if result is not None else {"stdout": "x"},
        "message": {
            "role": "user",
            "content": [{"type": "tool_result", "tool_use_id": tool_id, "is_error": is_error, "content": content}],
        },
    }
    if decision:
        line["permissionDecision"] = decision
    return line


def claude_path(root: Path) -> Path:
    return root / "claude" / "projects" / "-work-proj" / f"{SESSION}.jsonl"


class TestClaude:
    def test_streamed_call_is_one_row_with_its_final_numbers(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [
                {"type": "api-request", "id": "ref-1", "timestamp": iso(300), "sessionId": SESSION},
                c_user("do it", 310),
                c_assistant("m1", "r1", 295, out=1, ref="ref-1"),
                c_assistant("m1", "r1", 290, out=40, ref="ref-1"),
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT * FROM requests")
        assert len(got) == 1
        row = got[0]
        assert (row["input_tokens"], row["output_tokens"], row["cache_read_tokens"], row["cache_creation_tokens"]) == (10, 40, 100, 20)
        assert row["source"] == "transcript"
        assert row["tool"] == "claude-code"
        assert row["project_path"] == "/work/proj"
        assert row["cost_usd"] > 0
        # From the api-request line to the last line of the reply.
        assert row["duration_ms"] == pytest.approx(10_000, abs=50)
        assert row["ttft_ms"] == 0

    def test_tokens_match_the_session_row(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [c_assistant("m1", "r1", 100, inp=7, out=8, read=9, write=3), c_assistant("m2", "r2", 90, inp=1, out=2, read=3, write=4)],
        )
        make_ingester(db, tmp_path).poll()
        usage = rows(db, "SELECT * FROM session_usage")[0]
        total = rows(db, "SELECT SUM(input_tokens) i, SUM(output_tokens) o, SUM(cache_read_tokens) r, SUM(cache_creation_tokens) w FROM requests")[0]
        assert (total["i"], total["o"], total["r"], total["w"]) == (
            usage["input_tokens"],
            usage["output_tokens"],
            usage["cache_read_tokens"],
            usage["cache_creation_tokens"],
        )

    def test_subagent_calls_count_once_with_role(self, db, tmp_path):
        sub = claude_path(tmp_path).parent / SESSION / "subagents" / "agent-abc.jsonl"
        write_lines(claude_path(tmp_path), [c_assistant("m1", "r1", 100)])
        sub_line = c_assistant("m2", "r2", 90, agentId="abc", isSidechain=True)
        write_lines(sub, [{**c_user("explore this", 95), "agentId": "abc", "isSidechain": True}, sub_line])
        sub.with_name("agent-abc.meta.json").write_text(json.dumps({"agentType": "Explore", "description": "x"}))
        # A resumed session replays the same call in another file.
        write_lines(claude_path(tmp_path).with_name("99999999-9999-4999-8999-999999999999.jsonl"), [sub_line])
        make_ingester(db, tmp_path).poll()
        got = {r["agent_id"]: r for r in rows(db, "SELECT * FROM requests")}
        assert set(got) == {"", "abc"}
        assert got["abc"]["session_id"] == SESSION
        agent = rows(db, "SELECT * FROM agents")[0]
        assert (agent["agent_id"], agent["session_id"], agent["task"], agent["is_sidechain"]) == ("abc", SESSION, "Explore", 1)
        prompts = rows(db, "SELECT agent_id, text FROM session_prompts")
        assert prompts == [{"agent_id": "abc", "text": "explore this"}]

    def test_prompts_exclude_tool_results_notifications_and_local_commands(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [
                c_user("real prompt", 100, origin={"kind": "human"}),
                c_user("<task-notification>done</task-notification>", 95, origin={"kind": "task-notification"}),
                c_user("<command-name>/clear</command-name>", 94),
                c_user("<local-command-stdout>x</local-command-stdout>", 93),
                c_user("injected", 92, isMeta=True),
                c_user("<system-reminder>note</system-reminder>\nafter reminder", 91),
                c_tool_result("t1", 90),
            ],
        )
        make_ingester(db, tmp_path).poll()
        assert [r["text"] for r in rows(db, "SELECT text FROM session_prompts ORDER BY ts")] == ["real prompt", "after reminder"]

    def test_task_notification_is_not_a_human_turn(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [
                c_user("real prompt", 100, origin={"kind": "human"}),
                c_user("<task-notification>done</task-notification>", 95, origin={"kind": "task-notification"}),
                c_assistant("m1", "r1", 90),
            ],
        )
        make_ingester(db, tmp_path).poll()
        assert rows(db, "SELECT turn_count FROM session_usage")[0]["turn_count"] == 1

    def test_command_resolves_to_a_prompt_file_and_a_skill(self, db, tmp_path):
        project = tmp_path / "proj"
        (project / ".claude" / "commands").mkdir(parents=True)
        (project / ".claude" / "commands" / "review.md").write_text("x")
        (project / ".claude" / "skills" / "grind").mkdir(parents=True)
        (project / ".claude" / "skills" / "grind" / "SKILL.md").write_text("x")
        cwd = {"cwd": str(project)}
        write_lines(
            claude_path(tmp_path),
            [
                c_user("<command-message>review</command-message><command-name>/review</command-name><command-args>src</command-args>", 100) | cwd,
                c_user("<command-name>/grind</command-name>", 90) | cwd,
                c_user("<command-name>/gone</command-name>", 80) | cwd,
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT text, prompt_file FROM session_prompts ORDER BY ts")
        assert got[0] == {"text": "/review src", "prompt_file": ".claude/commands/review.md"}
        assert got[1]["prompt_file"] == ".claude/skills/grind/SKILL.md"
        assert got[2] == {"text": "/gone", "prompt_file": ""}
        assert [(r["name"], r["trigger"]) for r in rows(db, "SELECT name, trigger FROM skill_uses")] == [("grind", "user")]

    def test_tool_call_fields_and_confirmations(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [
                c_assistant("m1", "r1", 100, blocks=[c_tool_use("t1", "Bash", {"command": "pytest -q tests", "description": "run"})]),
                c_tool_result("t1", 90, is_error=True, content="Exit code 2\nfailed", decision={"decision": "accept", "source": "user_temporary"}),
                c_assistant("m2", "r2", 80, blocks=[c_tool_use("t2", "Read", {"file_path": "/work/proj/a.py"})]),
                c_tool_result("t2", 79, decision={"decision": "accept", "source": "config"}),
                c_assistant("m3", "r3", 70, blocks=[c_tool_use("t3", "Bash", {"command": "rm -rf x"})]),
                c_tool_result("t3", 69, is_error=True, content="denied", decision={"decision": "reject", "source": "config"}),
                c_assistant("m4", "r4", 60, blocks=[c_tool_use("t4", "Skill", {"skill": "ui-review"})]),
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = {r["source_event_id"]: r for r in rows(db, "SELECT * FROM tool_invocations")}
        assert got["t1"]["target"] == "pytest -q tests"
        assert got["t1"]["exit_code"] == 2
        assert got["t1"]["is_error"] == 1
        assert got["t1"]["confirm"] == "approved"
        assert got["t1"]["duration_ms"] == pytest.approx(10_000, abs=50)
        assert got["t2"]["confirm"] == "auto"
        assert got["t2"]["exit_code"] is None
        assert got["t3"]["confirm"] == "denied"
        assert got["t4"]["duration_ms"] == 0  # no result yet
        assert [r["name"] for r in rows(db, "SELECT name FROM skill_uses")] == ["ui-review"]

    def test_line_counts_prefer_the_patch_then_the_input(self, db, tmp_path):
        patch = {"filePath": "/work/proj/a.py", "structuredPatch": [{"lines": [" same", "-old", "+new", "+more"]}]}
        write_lines(
            claude_path(tmp_path),
            [
                c_assistant("m1", "r1", 100, blocks=[c_tool_use("e1", "Edit", {"file_path": "a.py", "old_string": "old", "new_string": "new\nmore"})]),
                c_tool_result("e1", 99, result=patch),
                c_assistant("m2", "r2", 90, blocks=[c_tool_use("w1", "Write", {"file_path": "/work/proj/b.py", "content": "1\n2\n3\n"})]),
                c_tool_result("w1", 89, result={"type": "create", "structuredPatch": []}),
                c_assistant("m3", "r3", 80, blocks=[c_tool_use("e2", "Edit", {"file_path": "/work/proj/c.py", "old_string": "a", "new_string": "b"})]),
                c_tool_result("e2", 79, is_error=True, content="no match"),
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = {r["path"]: json.loads(r["detail"]) for r in rows(db, "SELECT path, detail FROM file_write_events")}
        assert (got["/work/proj/a.py"]["lines_added"], got["/work/proj/a.py"]["lines_removed"]) == (2, 1)
        assert (got["/work/proj/b.py"]["lines_added"], got["/work/proj/b.py"]["lines_removed"]) == (3, 0)
        assert "/work/proj/c.py" not in got  # the edit failed
        edit = rows(db, "SELECT input FROM tool_invocations WHERE source_event_id = 'e1'")[0]
        assert json.loads(edit["input"])["new_string"] == "new\nmore"

    def test_api_error_is_a_failed_request_with_no_tokens(self, db, tmp_path):
        line = c_assistant("m9", "r9", 100, inp=0, out=0, read=0, write=0, isApiErrorMessage=True, error="rate_limit")
        line["message"]["model"] = "<synthetic>"
        synthetic = c_assistant("m8", "r8", 99, inp=0, out=0, read=0, write=0)
        synthetic["message"]["model"] = "<synthetic>"
        write_lines(claude_path(tmp_path), [line, synthetic])
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT is_error, error_type, input_tokens FROM requests")
        assert got == [{"is_error": 1, "error_type": "rate_limit", "input_tokens": 0}]


class TestSupersededRows:
    def test_other_writers_rows_for_covered_calls_go_away(self, db, tmp_path):
        ts = NOW - 200
        db.append_request(RequestRow(ts=ts, source_ts=ts, session_id=SESSION, tool="claude-code", model=MODEL, input_tokens=10, source="otel"))
        db.append_request(RequestRow(ts=ts, source_ts=ts, session_id=SESSION, tool="claude-code", model=MODEL, input_tokens=10, source="claude-code-jsonl"))
        db.append_tool_invocation(ToolInvocationRow(ts=ts, session_id=SESSION, tool="claude-code", tool_name="Bash", source="otel", source_event_id="span"))
        db.append_tool_invocation(
            ToolInvocationRow(ts=ts, session_id=SESSION, tool="claude-code", tool_name="Bash", source="hook", source_event_id="t1", result_summary="kept", input={"command": "ls"})
        )
        # A live row for a call newer than the file stays until the file catches up.
        live = NOW - 1
        db.append_request(RequestRow(ts=live, source_ts=live, session_id=SESSION, tool="claude-code", model=MODEL, source="otel"))
        db.flush()
        write_lines(
            claude_path(tmp_path),
            [c_assistant("m1", "r1", 100, blocks=[c_tool_use("t1", "Bash", {"command": "ls"})]), c_tool_result("t1", 90)],
        )
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT source FROM requests ORDER BY ts")
        assert sorted(r["source"] for r in got) == ["otel", "transcript"]
        tools = rows(db, "SELECT * FROM tool_invocations")
        assert len(tools) == 1
        assert tools[0]["source"] == "transcript"
        assert tools[0]["result_summary"] == "kept"  # what only the hook had
        assert tools[0]["duration_ms"] > 0

    def test_team_scan_cannot_bring_rows_back(self, db, tmp_path):
        write_lines(claude_path(tmp_path), [c_assistant("m1", "r1", 100)])
        make_ingester(db, tmp_path).poll()
        db.append_request(RequestRow(ts=NOW - 100, source_ts=NOW - 100, session_id=SESSION, tool="claude-code", model=MODEL, input_tokens=10, source="claude-code-jsonl"))
        db.flush()
        assert count(db, "requests") == 1

    def test_team_scan_row_stays_without_a_transcript(self, db):
        db.append_request(RequestRow(ts=NOW, source_ts=NOW, session_id="other", tool="claude-code", model=MODEL, source="claude-code-jsonl"))
        db.flush()
        assert count(db, "requests") == 1

    def test_team_scan_keeps_a_stored_role(self, db):
        db.write_call_facts(_agent_facts())
        db.upsert_agent(AgentRow(agent_id="abc", session_id=SESSION, tool="claude-code", task="first prompt text", input_tokens=5))
        row = rows(db, "SELECT task, input_tokens FROM agents")[0]
        assert row == {"task": "Explore", "input_tokens": 5}

    def test_hook_file_write_after_transcript_is_ignored(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [c_assistant("m1", "r1", 100, blocks=[c_tool_use("e1", "Write", {"file_path": "/x/a.py", "content": "1\n"})]), c_tool_result("e1", 90, result={})],
        )
        make_ingester(db, tmp_path).poll()
        late = FileWriteRow(ts=NOW, path="/x/a.py", session_id=SESSION, source_event_id="e1", source_event_kind="hook:PostToolUse")
        assert db.record_file_write(late) is False
        assert count(db, "file_write_events") == 1

    def test_hook_file_write_before_transcript_is_replaced(self, db, tmp_path):
        early = FileWriteRow(ts=NOW - 100, path="/x/a.py", session_id=SESSION, source_event_id="e1", source_event_kind="hook:PostToolUse")
        assert db.record_file_write(early) is True
        write_lines(
            claude_path(tmp_path),
            [c_assistant("m1", "r1", 100, blocks=[c_tool_use("e1", "Write", {"file_path": "/x/a.py", "content": "1\n"})]), c_tool_result("e1", 90, result={})],
        )
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT detail FROM file_write_events")
        assert len(got) == 1
        assert json.loads(got[0]["detail"])["lines_added"] == 1


def _agent_facts():
    from aictl.storage import CallFacts

    return CallFacts(agents=[AgentRow(agent_id="abc", session_id=SESSION, tool="claude-code", task="Explore", is_sidechain=1, started_at=NOW)])


# ── Copilot fixtures ───────────────────────────────────────────────────


def ev(kind, ago, data=None, **extra):
    return {"type": kind, "id": f"{kind}-{ago}", "timestamp": iso(ago), "data": data or {}, **extra}


def usage_record(ago, *, inp=120, out=30, read=80, write=10, agent="", api="", **more):
    usage = {
        "model": MODEL,
        "inputTokens": inp,
        "outputTokens": out,
        "cacheReadTokens": read,
        "cacheWriteTokens": write,
        "duration": 1500,
        "timeToFirstTokenMs": 400.0,
        "finishReason": "stop",
        "apiCallId": api,
        **more,
    }
    return ev("session.usage_record", ago, {"usage": usage}, **({"agentId": agent} if agent else {}))


def copilot_events(root: Path, sid: str = COPILOT_SID) -> Path:
    return root / "copilot" / "session-state" / sid / "events.jsonl"


def make_store(root: Path, rows_: list[tuple], app_sessions: dict[str, str] | None = None) -> None:
    home = root / "copilot"
    home.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(home / "session-store.db")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS assistant_usage_events (id INTEGER PRIMARY KEY, session_id TEXT, turn_index INT, agent_id TEXT,"
        " parent_tool_call_id TEXT, model TEXT, input_tokens INT, output_tokens INT, cache_read_tokens INT, cache_write_tokens INT,"
        " total_nano_aiu INT, duration_ms INT, time_to_first_token_ms REAL, output_ttft_ms REAL, finish_reason TEXT, created_at TEXT)"
    )
    conn.execute("CREATE TABLE IF NOT EXISTS turns (id INTEGER PRIMARY KEY, session_id TEXT)")
    conn.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, cwd TEXT, branch TEXT)")
    conn.execute("INSERT OR REPLACE INTO sessions VALUES(?, '/work/stored', 'main')", (COPILOT_SID,))
    conn.executemany(
        "INSERT INTO assistant_usage_events(session_id, agent_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,"
        " total_nano_aiu, duration_ms, time_to_first_token_ms, output_ttft_ms, finish_reason, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        rows_,
    )
    conn.commit()
    conn.close()
    if app_sessions:
        data = sqlite3.connect(home / "data.db")
        data.execute(
            "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, session_type TEXT, total_input_tokens INT, total_cached_tokens INT,"
            " total_output_tokens INT, total_nano_aiu INT, model TEXT, created_at TEXT, updated_at TEXT)"
        )
        data.executemany(
            "INSERT OR REPLACE INTO sessions VALUES(?,?,0,0,0,0,'','','')", list(app_sessions.items())
        )
        data.commit()
        data.close()


class TestCopilot:
    def test_requests_with_disjoint_tokens_ttft_and_subagent(self, db, tmp_path):
        write_lines(
            copilot_events(tmp_path),
            [
                ev("session.start", 500, {"context": {"cwd": "/work/cli"}}),
                usage_record(400, api="a1"),
                usage_record(390, inp=200, out=50, read=150, write=0, agent="sub-1", api="a2"),
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = {r["agent_id"]: r for r in rows(db, "SELECT * FROM requests")}
        main = got[""]
        assert (main["input_tokens"], main["output_tokens"], main["cache_read_tokens"], main["cache_creation_tokens"]) == (30, 30, 80, 10)
        assert (main["duration_ms"], main["ttft_ms"], main["finish_reason"]) == (1500, 400, "stop")
        assert main["tool"] == "copilot-cli"
        assert main["project_path"] == "/work/cli"
        assert got["sub-1"]["input_tokens"] == 50

    def test_same_call_in_events_and_store_is_one_row(self, db, tmp_path):
        write_lines(copilot_events(tmp_path), [usage_record(400, api="a1"), usage_record(390, api="a2")])
        # Two calls with identical counts stay two; the store has both, plus one more only it has.
        same = (COPILOT_SID, "", MODEL, 120, 30, 80, 10, 0, 1500, 400.0, None, "stop", iso(400))
        make_store(tmp_path, [same, same, (COPILOT_SID, "sub-9", "Explore", 60, 20, 10, 0, 0, 900, None, 300.0, "stop", iso(380))])
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT * FROM requests ORDER BY ts")
        assert len(got) == 3
        only_store = next(r for r in got if r["agent_id"] == "sub-9")
        assert (only_store["input_tokens"], only_store["ttft_ms"], only_store["project_path"]) == (50, 300, "/work/stored")
        assert only_store["model"] == "unknown"
        agent = rows(db, "SELECT * FROM agents WHERE agent_id = 'sub-9'")[0]
        assert (agent["task"], agent["session_id"], agent["is_sidechain"]) == ("Explore", COPILOT_SID, 1)
        usage = rows(db, "SELECT SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens) t FROM requests")[0]["t"]
        assert usage == rows(db, "SELECT input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens t FROM session_usage")[0]["t"]

    def test_tool_call_fields(self, db, tmp_path):
        write_lines(
            copilot_events(tmp_path),
            [
                ev("session.start", 500, {"context": {"cwd": "/work/cli"}}),
                ev("tool.execution_start", 400, {"toolCallId": "c1", "toolName": "bash", "arguments": {"command": "pytest -x", "description": "d"}}),
                ev("tool.execution_complete", 390, {"toolCallId": "c1", "success": False, "error": {"message": "boom", "code": "failure"}, "shellExecution": {"exitCode": 3}}),
                ev(
                    "tool.execution_start",
                    380,
                    {"toolCallId": "c2", "toolName": "srv-x", "mcpServerName": "srv", "mcpToolName": "x", "arguments": {}},
                    agentId="sub-1",
                ),
                ev("tool.execution_complete", 379, {"toolCallId": "c2", "success": True}, agentId="sub-1"),
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = {r["source_event_id"]: r for r in rows(db, "SELECT * FROM tool_invocations")}
        c1 = got["c1"]
        assert (c1["tool_name"], c1["target"], c1["is_error"], c1["exit_code"], c1["result_summary"]) == ("bash", "pytest -x", 1, 3, "boom")
        assert c1["duration_ms"] == pytest.approx(10_000, abs=50)
        assert c1["confirm"] == "auto"
        assert (got["c2"]["tool_name"], got["c2"]["agent_id"]) == ("mcp__srv__x", "sub-1")

    def test_permissions(self, db, tmp_path):
        write_lines(
            copilot_events(tmp_path),
            [
                ev("permission.requested", 400, {"requestId": "p1", "permissionRequest": {"kind": "shell", "toolCallId": "c1"}}),
                ev("permission.completed", 395, {"requestId": "p1", "result": {"kind": "approved"}, "decisionSource": "user"}),
                ev("tool.execution_start", 394, {"toolCallId": "c1", "toolName": "bash", "arguments": {"command": "ls"}}),
                ev("tool.execution_complete", 393, {"toolCallId": "c1", "success": True}),
                ev("permission.requested", 300, {"requestId": "p2", "permissionRequest": {"kind": "extension-permission-access", "extensionName": "ext"}}),
                ev("permission.completed", 299, {"requestId": "p2", "result": {"kind": "denied-no-approval-rule-and-could-not-request-from-user"}, "decisionSource": "unattended_fallback"}),
                ev("permission.requested", 200, {"requestId": "p3", "permissionRequest": {"kind": "extension-permission-access", "extensionName": "ext"}}),
                ev("permission.completed", 199, {"requestId": "p3", "result": {"kind": "approved"}, "decisionSource": "host_policy"}),
                ev("permission.requested", 100, {"requestId": "p4", "permissionRequest": {"kind": "extension-permission-access", "extensionName": "ext"}}),
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = {r["source_event_id"]: r for r in rows(db, "SELECT * FROM tool_invocations")}
        assert got["c1"]["confirm"] == "approved"
        assert got["c1"]["confirm_wait_ms"] == pytest.approx(5000, abs=50)
        assert (got["p2"]["confirm"], got["p2"]["tool_name"]) == ("denied", "permission:extension-permission-access")
        assert got["p3"]["confirm"] == "auto"
        assert got["p4"]["confirm"] == "pending"

    def test_pending_prompt_resolves_in_a_later_poll_and_stale_ones_clear(self, db, tmp_path):
        path = copilot_events(tmp_path)
        write_lines(path, [ev("permission.requested", 100, {"requestId": "p1", "permissionRequest": {"kind": "url"}})])
        ingester = make_ingester(db, tmp_path)
        ingester.poll()
        assert rows(db, "SELECT confirm FROM tool_invocations")[0]["confirm"] == "pending"
        write_lines(path, [ev("permission.completed", 90, {"requestId": "p1", "result": {"kind": "approved"}, "decisionSource": "user"})])
        ingester.poll()
        got = rows(db, "SELECT confirm, confirm_wait_ms FROM tool_invocations")
        assert got[0]["confirm"] == "approved"
        assert got[0]["confirm_wait_ms"] > 0
        db._conn().execute("UPDATE tool_invocations SET confirm = 'pending', ts = ?", (NOW - 86400,))
        assert db.clear_stale_pending_confirms(NOW - 3600) == 1

    def test_prompts_skills_agents_errors_edits(self, db, tmp_path):
        write_lines(
            copilot_events(tmp_path),
            [
                ev("user.message", 500, {"content": "real prompt", "transformedContent": "wrapped"}),
                ev("user.message", 490, {"content": "autopilot said", "source": "autopilot"}),
                ev("user.message", 480, {"content": "sub task", "source": "agent-1"}, agentId="sub-1"),
                ev("skill.invoked", 470, {"name": "grind", "trigger": "agent-invoked", "content": "long"}),
                ev("subagent.started", 460, {"toolCallId": "c9", "agentName": "explore", "model": MODEL}, agentId="sub-1"),
                ev("subagent.completed", 450, {"toolCallId": "c9", "agentName": "explore", "totalTokens": 9, "durationMs": 10}, agentId="sub-1"),
                ev("session.error", 440, {"errorType": "rate_limit", "message": "slow down", "statusCode": 429}),
                ev("tool.execution_start", 430, {"toolCallId": "c5", "toolName": "apply_patch", "arguments": {}}),
                ev(
                    "tool.execution_complete",
                    429,
                    {
                        "toolCallId": "c5",
                        "success": True,
                        "fileEdits": [{"path": "/work/a.py", "kind": "edit"}],
                        "toolTelemetry": {"metrics": {"linesAdded": 4, "linesRemoved": 2}},
                    },
                ),
            ],
        )
        make_ingester(db, tmp_path).poll()
        assert {(r["agent_id"], r["text"]) for r in rows(db, "SELECT agent_id, text FROM session_prompts")} == {("", "real prompt"), ("sub-1", "sub task")}
        assert rows(db, "SELECT name, trigger FROM skill_uses") == [{"name": "grind", "trigger": "agent-invoked"}]
        agent = rows(db, "SELECT * FROM agents")[0]
        assert (agent["agent_id"], agent["task"], agent["completed"], agent["session_id"]) == ("sub-1", "explore", 1, COPILOT_SID)
        assert agent["started_at"] > 0
        assert agent["ended_at"] > agent["started_at"]
        error = rows(db, "SELECT is_error, error_type, http_status FROM requests")[0]
        assert error == {"is_error": 1, "error_type": "rate_limit", "http_status": 429}
        detail = json.loads(rows(db, "SELECT detail FROM file_write_events")[0]["detail"])
        assert (detail["lines_added"], detail["lines_removed"]) == (4, 2)

    def test_compaction_is_a_call_unless_it_has_a_record(self, db, tmp_path):
        used = {"inputTokens": 500, "outputTokens": 50, "cacheReadTokens": 0, "cacheWriteTokens": 0, "model": MODEL}
        write_lines(
            copilot_events(tmp_path),
            [
                ev("session.compaction_complete", 400, {"requestId": "cmp-1", "compactionTokensUsed": used}),
                usage_record(300, api="cmp-2"),
                ev("session.compaction_complete", 200, {"requestId": "cmp-2", "compactionTokensUsed": used}),
            ],
        )
        make_ingester(db, tmp_path).poll()
        assert count(db, "requests") == 2

    def test_desktop_sessions_keep_their_tool_id_on_every_table(self, db, tmp_path):
        make_store(tmp_path, [], {DESKTOP_SID: "project", COPILOT_SID: "cli_session"})
        for sid in (DESKTOP_SID, COPILOT_SID):
            write_lines(
                copilot_events(tmp_path, sid),
                [
                    usage_record(400, api="a"),
                    ev("user.message", 390, {"content": "hi"}),
                    ev("skill.invoked", 380, {"name": "s"}),
                    ev("subagent.started", 375, {"agentName": "r"}, agentId=f"agent-{sid}"),
                    ev("tool.execution_start", 370, {"toolCallId": "c1", "toolName": "bash", "arguments": {}}),
                    ev(
                        "tool.execution_complete",
                        360,
                        {"toolCallId": "c1", "success": True, "fileEdits": [{"path": "/x", "kind": "edit"}]},
                    ),
                ],
            )
        make_ingester(db, tmp_path).poll()
        for table in FACT_TABLES:
            got = {r["session_id"]: r["tool"] for r in rows(db, f"SELECT session_id, tool FROM {table}")}
            assert got == {DESKTOP_SID: "copilot-desktop", COPILOT_SID: "copilot-cli"}, table

    def test_rows_written_before_the_app_listed_a_session_are_corrected(self, db, tmp_path):
        write_lines(copilot_events(tmp_path, DESKTOP_SID), [usage_record(400)])
        ingester = make_ingester(db, tmp_path)
        ingester.poll()
        assert rows(db, "SELECT tool FROM requests")[0]["tool"] == "copilot-cli"
        make_store(tmp_path, [], {DESKTOP_SID: "project"})
        ingester.poll()
        assert rows(db, "SELECT tool FROM requests")[0]["tool"] == "copilot-desktop"


# ── VS Code fixtures ───────────────────────────────────────────────────


def v_line(kind, ago, span, *, sid=VSCODE_SID, dur=100, status="ok", name="", **attrs):
    return {
        "ts": int((NOW - ago) * 1000),
        "dur": dur,
        "sid": sid,
        "type": kind,
        "name": name or kind,
        "spanId": span,
        "status": status,
        "attrs": attrs,
    }


def debug_dir(root: Path, sid: str = VSCODE_SID) -> Path:
    return root / "vscode" / "workspaceStorage" / "wsp" / "GitHub.copilot-chat" / "debug-logs" / sid


def chat_file(root: Path, sid: str) -> Path:
    return root / "vscode" / "workspaceStorage" / "wsp" / "chatSessions" / f"{sid}.jsonl"


def workspace_json(root: Path) -> None:
    path = root / "vscode" / "workspaceStorage" / "wsp" / "workspace.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"folder": "file:///work/vs"}))


def chat_request(req_id, ago, text, **extra):
    return {
        "requestId": req_id,
        "timestamp": int((NOW - ago) * 1000),
        "modelId": f"copilot/{MODEL}",
        "message": {"text": text},
        "response": [],
        "variableData": {"variables": []},
        **extra,
    }


class TestVSCode:
    def test_requests_tools_and_subagent_from_debug_logs(self, db, tmp_path):
        workspace_json(tmp_path)
        d = debug_dir(tmp_path)
        write_lines(
            d / "main.jsonl",
            [
                v_line("session_start", 500, "s0"),
                v_line("child_session_ref", 490, "s1", childSessionId="child-1", childLogFile="runSubagent-Explore-x.jsonl", label="runSubagent-Explore"),
                v_line("llm_request", 400, "l1", dur=2000, model=MODEL, inputTokens=100, outputTokens=20, cachedTokens=60, ttft=350),
                v_line("llm_request", 390, "l2", status="error", model=MODEL, error="rate limit reached"),
                v_line("tool_call", 380, "t1", name="run_in_terminal", dur=900, args=json.dumps({"command": "pytest", "goal": "g"}), result="Command exited with code 2"),
                v_line("tool_call", 370, "t2", name="grep_search", status="error", args=json.dumps({"query": "needle"}), error="bad regex"),
                v_line("tool_call", 360, "t3", name="replace_string_in_file", args=json.dumps({"filePath": "a.py", "oldString": "a", "newString": "b\nc"})),
                v_line("tool_call", 350, "t4", name="apply_patch", args=json.dumps({"input": "*** Update File: /work/vs/b.py\n-old\n+new\n+more\n"})),
            ],
        )
        write_lines(
            d / "runSubagent-Explore-x.jsonl",
            [
                v_line("session_start", 340, "c0", sid="child-1", parentSessionId=VSCODE_SID, label="runSubagent-Explore"),
                v_line("llm_request", 330, "c1", sid="child-1", model=MODEL, inputTokens=50, outputTokens=5, cachedTokens=0),
                v_line("user_message", 335, "c2", sid="child-1", content="find it"),
                v_line("tool_call", 320, "c3", sid="child-1", name="read_file", args=json.dumps({"filePath": "/work/vs/a.py"})),
            ],
        )
        write_lines(d / "title-x.jsonl", [v_line("llm_request", 300, "x1", sid="title", model=MODEL, inputTokens=9, outputTokens=1, cachedTokens=0)])
        make_ingester(db, tmp_path).poll()
        got = {r["input_tokens"]: r for r in rows(db, "SELECT * FROM requests")}
        main = got[40]
        assert (main["cache_read_tokens"], main["ttft_ms"], main["duration_ms"], main["agent_id"]) == (60, 350, 2000, "")
        assert main["tool"] == "copilot-vscode"
        assert main["project_path"] == "/work/vs"
        assert got[50]["agent_id"] == "child-1"
        assert got[50]["session_id"] == VSCODE_SID
        assert got[9]["agent_id"] == ""  # a title call is not a subagent
        failed = rows(db, "SELECT is_error, error_type FROM requests WHERE is_error = 1")
        assert failed == [{"is_error": 1, "error_type": "rate limit reached"}]
        agent = rows(db, "SELECT * FROM agents")[0]
        assert (agent["agent_id"], agent["task"], agent["session_id"]) == ("child-1", "Explore", VSCODE_SID)
        tools = {r["source_event_id"]: r for r in rows(db, "SELECT * FROM tool_invocations")}
        assert (tools["t1"]["target"], tools["t1"]["exit_code"], tools["t1"]["duration_ms"]) == ("pytest", 2, 900)
        assert (tools["t2"]["is_error"], tools["t2"]["result_summary"]) == (1, "bad regex")
        assert tools["c3"]["agent_id"] == "child-1"
        edits = {r["path"]: json.loads(r["detail"]) for r in rows(db, "SELECT path, detail FROM file_write_events")}
        assert edits["/work/vs/a.py"] == {"lines_added": 2, "lines_removed": 1}
        assert edits["/work/vs/b.py"] == {"lines_added": 2, "lines_removed": 1}
        assert rows(db, "SELECT agent_id, text FROM session_prompts") == [{"agent_id": "child-1", "text": "find it"}]

    def test_totals_match_the_session_row(self, db, tmp_path):
        d = debug_dir(tmp_path)
        write_lines(d / "main.jsonl", [v_line("llm_request", 400, "l1", model=MODEL, inputTokens=100, outputTokens=20, cachedTokens=60)])
        write_lines(d / "categorization-x.jsonl", [v_line("llm_request", 300, "x1", sid="c", model=MODEL, inputTokens=9, outputTokens=1, cachedTokens=0)])
        make_ingester(db, tmp_path).poll()
        expected = rows(db, "SELECT input_tokens + output_tokens + cache_read_tokens t FROM session_usage")[0]["t"]
        assert rows(db, "SELECT SUM(input_tokens + output_tokens + cache_read_tokens) t FROM requests")[0]["t"] == expected

    def test_prompts_come_from_the_chat_file_with_their_prompt_file(self, db, tmp_path):
        workspace_json(tmp_path)
        write_lines(debug_dir(tmp_path) / "main.jsonl", [v_line("user_message", 400, "u1", content="from log")])
        variable = {"kind": "promptFile", "name": "prompt:x", "value": {"path": "/work/vs/.github/prompts/x.prompt.md", "scheme": "file"}, "automaticallyAdded": False}
        auto = {"kind": "promptFile", "name": "i", "value": {"path": "/work/vs/.github/copilot-instructions.md"}, "automaticallyAdded": True}
        write_lines(
            chat_file(tmp_path, VSCODE_SID),
            [
                {"kind": 0, "v": {"sessionId": VSCODE_SID, "creationDate": int(NOW * 1000), "requests": [chat_request("req-1", 400, "from chat", variableData={"variables": [auto, variable]})]}},
                {"kind": 2, "k": ["requests"], "v": [chat_request("req-2", 300, "second", variableData={"variables": [auto]})]},
                {"kind": 2, "k": ["requests"], "v": [chat_request("req-3", 200, "system", isSystemInitiated=True)]},
            ],
        )
        make_ingester(db, tmp_path).poll()
        got = rows(db, "SELECT text, prompt_file, project_path, tool FROM session_prompts ORDER BY ts")
        assert [r["text"] for r in got] == ["from chat", "second"]
        assert got[0]["prompt_file"] == "/work/vs/.github/prompts/x.prompt.md"
        assert got[1]["prompt_file"] == ""
        assert got[0]["project_path"] == "/work/vs"
        assert got[0]["tool"] == "copilot-vscode"
        assert count(db, "requests") == 0  # the debug log owns requests for this session

    def test_debug_log_prompts_are_used_when_there_is_no_chat_file(self, db, tmp_path):
        write_lines(debug_dir(tmp_path) / "main.jsonl", [v_line("user_message", 400, "u1", content="from log")])
        make_ingester(db, tmp_path).poll()
        assert [r["text"] for r in rows(db, "SELECT text FROM session_prompts")] == ["from log"]

    def test_chat_only_session_gets_requests_and_tools_with_confirmations(self, db, tmp_path):
        tool_part = {"kind": "toolInvocationSerialized", "toolCallId": "toolu_1", "toolId": "copilot_readFile", "isConfirmed": {"type": 4}, "invocationMessage": {"value": "Reading a.py"}}
        auto_part = {"kind": "toolInvocationSerialized", "toolCallId": "toolu_2", "toolId": "copilot_grep", "isConfirmed": {"type": 1}}
        denied_part = {"kind": "toolInvocationSerialized", "toolCallId": "toolu_3", "toolId": "run", "isConfirmed": {"type": 0}}
        write_lines(
            chat_file(tmp_path, CHAT_ONLY_SID),
            [
                {"kind": 0, "v": {"sessionId": CHAT_ONLY_SID, "creationDate": int((NOW - 500) * 1000), "requests": []}},
                {"kind": 2, "k": ["requests"], "v": [chat_request("req-1", 400, "hello")]},
                {"kind": 2, "k": ["requests", 0, "response"], "v": [tool_part, auto_part, denied_part]},
                {"kind": 1, "k": ["requests", 0, "elapsedMs"], "v": 2500},
                {"kind": 1, "k": ["requests", 0, "result"], "v": {"metadata": {"promptTokens": 70, "outputTokens": 7, "resolvedModel": MODEL}}},
            ],
        )
        make_ingester(db, tmp_path).poll()
        request = rows(db, "SELECT * FROM requests")[0]
        assert (request["input_tokens"], request["output_tokens"], request["model"], request["duration_ms"]) == (70, 7, MODEL, 2500)
        tools = {r["source_event_id"]: r for r in rows(db, "SELECT * FROM tool_invocations")}
        assert (tools["toolu_1"]["confirm"], tools["toolu_1"]["target"]) == ("approved", "Reading a.py")
        assert tools["toolu_2"]["confirm"] == "auto"
        assert (tools["toolu_3"]["confirm"], tools["toolu_3"]["is_error"]) == ("denied", 1)


# ── Re-reads ───────────────────────────────────────────────────────────


def full_fixture(root: Path) -> None:
    write_lines(
        claude_path(root),
        [
            c_user("prompt", 400),
            c_assistant("m1", "r1", 390, blocks=[c_tool_use("t1", "Write", {"file_path": "/x/a", "content": "1\n"})]),
            c_tool_result("t1", 380, result={}),
        ],
    )
    write_lines(
        copilot_events(root),
        [
            ev("user.message", 400, {"content": "hi"}),
            usage_record(390),
            ev("skill.invoked", 385, {"name": "s"}),
            ev("subagent.started", 384, {"agentName": "r"}, agentId="sub-1"),
            ev("tool.execution_start", 380, {"toolCallId": "c1", "toolName": "bash", "arguments": {}}),
            ev("tool.execution_complete", 370, {"toolCallId": "c1", "success": True}),
        ],
    )
    write_lines(debug_dir(root) / "main.jsonl", [v_line("llm_request", 390, "l1", model=MODEL, inputTokens=10, outputTokens=1, cachedTokens=0), v_line("tool_call", 380, "t1", name="read_file", args="{}")])
    write_lines(chat_file(root, VSCODE_SID), [{"kind": 0, "v": {"sessionId": VSCODE_SID, "requests": [chat_request("req-1", 400, "hello")]}}])


class TestRereads:
    def test_second_poll_and_a_restart_add_nothing(self, db, tmp_path):
        full_fixture(tmp_path)
        ingester = make_ingester(db, tmp_path)
        ingester.poll()
        first = all_counts(db)
        assert all(first.values()), first
        ingester.poll()
        assert all_counts(db) == first
        make_ingester(db, tmp_path).poll()  # all offsets are gone after a restart
        assert all_counts(db) == first

    def test_new_lines_are_read_from_where_the_last_poll_stopped(self, db, tmp_path):
        path = claude_path(tmp_path)
        write_lines(path, [c_assistant("m1", "r1", 400, out=1, blocks=[c_tool_use("t1", "Bash", {"command": "ls"})])])
        ingester = make_ingester(db, tmp_path)
        ingester.poll()
        assert rows(db, "SELECT duration_ms FROM tool_invocations")[0]["duration_ms"] == 0
        offset = ingester._offsets[path]
        assert offset == path.stat().st_size
        write_lines(path, [c_assistant("m1", "r1", 395, out=9), c_tool_result("t1", 390)])
        ingester.poll()
        assert ingester._offsets[path] == path.stat().st_size
        assert rows(db, "SELECT output_tokens FROM requests") == [{"output_tokens": 9}]
        assert rows(db, "SELECT duration_ms FROM tool_invocations")[0]["duration_ms"] > 0

    def test_half_written_last_line_waits_for_its_newline(self, db, tmp_path):
        path = copilot_events(tmp_path)
        write_lines(path, [usage_record(400)])
        line = json.dumps(usage_record(390, inp=999))
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line[:20])
        ingester = make_ingester(db, tmp_path)
        ingester.poll()
        assert count(db, "requests") == 1
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line[20:] + "\n")
        ingester.poll()
        assert count(db, "requests") == 2

    def test_rewritten_events_file_does_not_duplicate_calls(self, db, tmp_path):
        path = copilot_events(tmp_path)
        write_lines(path, [usage_record(400), usage_record(390, inp=500)])
        ingester = make_ingester(db, tmp_path)
        ingester.poll()
        path.write_text(json.dumps(usage_record(400)) + "\n")
        ingester.poll()
        assert count(db, "requests") == 2

    def test_lines_older_than_the_window_are_left_out(self, db, tmp_path):
        write_lines(claude_path(tmp_path), [c_assistant("m1", "r1", 40 * 86400), c_assistant("m2", "r2", 100)])
        make_ingester(db, tmp_path).poll()
        assert count(db, "requests") == 1

    def test_failed_write_is_kept_and_retried(self, db, tmp_path, monkeypatch):
        write_lines(claude_path(tmp_path), [c_assistant("m1", "r1", 100)])
        ingester = make_ingester(db, tmp_path)
        real = db.write_call_facts

        def locked(_facts):
            raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(db, "write_call_facts", locked)
        ingester.poll()
        assert count(db, "requests") == 0
        monkeypatch.setattr(db, "write_call_facts", real)
        ingester.poll()
        assert count(db, "requests") == 1


# ── Capture mode ───────────────────────────────────────────────────────


class TestMetadataCapture:
    @pytest.fixture
    def meta_db(self, tmp_path):
        store = HistoryDB(tmp_path / "meta.db", flush_interval=0, capture="metadata")
        yield store
        store.close()

    def test_no_text_is_stored(self, meta_db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [
                c_user("secret plan", 400),
                c_assistant("m1", "r1", 390, blocks=[c_tool_use("t1", "Bash", {"command": "curl https://x/y --data z && pytest -q"})]),
                c_tool_result("t1", 380, is_error=True, content="Exit code 1\nsecret output"),
                c_assistant("m2", "r2", 370, blocks=[c_tool_use("t2", "Bash", {"command": "/usr/bin/git push origin main"})]),
                c_tool_result("t2", 360),
                c_assistant("m3", "r3", 350, blocks=[c_tool_use("t3", "Grep", {"pattern": "secret"})]),
                c_tool_result("t3", 340),
            ],
        )
        sub = claude_path(tmp_path).parent / SESSION / "subagents" / "agent-abc.jsonl"
        write_lines(sub, [c_assistant("m4", "r4", 330, agentId="abc", isSidechain=True)])
        sub.with_name("agent-abc.meta.json").write_text(json.dumps({"agentType": "Explore"}))
        make_ingester(meta_db, tmp_path).poll()
        assert rows(meta_db, "SELECT text FROM session_prompts") == [{"text": ""}]
        got = {r["source_event_id"]: r for r in rows(meta_db, "SELECT * FROM tool_invocations")}
        assert got["t1"]["target"] == "pytest"  # a test run can still be recognised
        assert got["t1"]["exit_code"] == 1
        assert got["t1"]["input"] == "{}"
        assert got["t1"]["result_summary"] == ""
        assert got["t2"]["target"] == "git"
        assert got["t3"]["target"] == ""
        # A role is not conversation text, and the board groups by it.
        assert rows(meta_db, "SELECT task FROM agents") == [{"task": "Explore"}]

    def test_team_scan_prompt_is_not_stored(self, meta_db):
        meta_db.upsert_agent(AgentRow(agent_id="x", session_id=SESSION, task="first prompt text"))
        assert rows(meta_db, "SELECT task FROM agents") == [{"task": ""}]

    def test_trim_blanks_targets_and_prompts(self, db, tmp_path):
        write_lines(
            claude_path(tmp_path),
            [c_user("plan", 400), c_assistant("m1", "r1", 390, blocks=[c_tool_use("t1", "Bash", {"command": "pytest"})])],
        )
        make_ingester(db, tmp_path).poll()
        assert db.trim_text() > 0
        assert rows(db, "SELECT text FROM session_prompts") == [{"text": ""}]
        assert rows(db, "SELECT target FROM tool_invocations") == [{"target": ""}]


class TestTextHelpers:
    def test_targets_hide_secrets_and_are_short(self):
        got = target_of({"command": "curl -H 'token: abcdef123456' " + "x" * 500}, True)
        assert "abcdef123456" not in got
        assert len(got) <= 300

    def test_target_prefers_the_command(self):
        assert target_of({"description": "d", "command": "ls -la"}, True) == "ls -la"
        assert target_of({"file_path": "/a/b.py", "limit": 3}, True) == "/a/b.py"
        assert target_of({"paths": ["/a"], "pattern": "p"}, True) == "/a"
        assert target_of({"query": "needle"}, True) == "needle"
        assert target_of({"query": "needle"}, False) == ""

    def test_command_head(self):
        assert command_head("python3 -m pytest -q") == "pytest"
        assert command_head("cd x && npm test") == "npm test"
        assert command_head("/usr/bin/git status") == "git"
        assert command_head("C:\\tools\\node.exe app.js") == "node.exe"
        assert command_head("") == ""

    def test_line_counts(self):
        assert edit_line_counts("a\nb\nc", "a\nx\ny\nc") == (2, 1)
        assert edit_line_counts("", "a\nb") == (2, 0)
        assert edit_line_counts("same", "same") == (0, 0)

    def test_patch_files(self):
        patch = "*** Begin Patch\n*** Update File: a.py\n@@\n-x\n+y\n+z\n*** Add File: b.py\n+1\n*** End Patch\n"
        assert apply_patch_files(patch) == [("a.py", 2, 1), ("b.py", 1, 0)]


# ── Migration ──────────────────────────────────────────────────────────


class TestMigration:
    def _old_db(self, path: Path) -> None:
        store = HistoryDB(path, flush_interval=0)
        store.close()
        conn = sqlite3.connect(path)
        conn.execute("DROP TABLE session_prompts")
        conn.execute("DROP TABLE skill_uses")
        conn.execute("ALTER TABLE requests DROP COLUMN ttft_ms")
        for column in ("agent_id", "confirm", "confirm_wait_ms", "target", "exit_code"):
            conn.execute(f"ALTER TABLE tool_invocations DROP COLUMN {column}")
        conn.execute("DELETE FROM schema_version")
        conn.execute("INSERT INTO schema_version(version) VALUES(29)")
        conn.commit()
        conn.close()

    def test_upgrade_adds_columns_and_tables(self, tmp_path):
        path = tmp_path / "old.db"
        self._old_db(path)
        store = HistoryDB(path, flush_interval=0)
        conn = store._conn()
        assert {r[1] for r in conn.execute("PRAGMA table_info(requests)")} >= {"ttft_ms"}
        assert {r[1] for r in conn.execute("PRAGMA table_info(tool_invocations)")} >= {"agent_id", "confirm", "confirm_wait_ms", "target", "exit_code"}
        assert conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0] == CURRENT_VERSION >= 30
        for table in ("session_prompts", "skill_uses"):
            indexes = {r[1]: r[2] for r in conn.execute(f"PRAGMA index_list({table})")}
            assert indexes[f"idx_{table}_dedup"] == 1
            assert f"idx_{table}_ts" in indexes
        store.close()

    def test_migrated_and_fresh_schemas_have_the_same_columns(self, tmp_path):
        old = tmp_path / "old.db"
        self._old_db(old)
        migrated = HistoryDB(old, flush_interval=0)
        fresh = HistoryDB(tmp_path / "fresh.db", flush_interval=0)
        for table in ("requests", "tool_invocations", "session_prompts", "skill_uses"):
            a = {r[1] for r in migrated._conn().execute(f"PRAGMA table_info({table})")}
            b = {r[1] for r in fresh._conn().execute(f"PRAGMA table_info({table})")}
            assert a == b, table
        migrated.close()
        fresh.close()

    def test_new_tables_follow_retention(self, db):
        db._conn().execute("INSERT INTO session_prompts(ts, session_id) VALUES(?, 's')", (NOW - 400 * 86400,))
        db._conn().execute("INSERT INTO skill_uses(ts, session_id, name) VALUES(?, 's', 'n')", (NOW - 400 * 86400,))
        db._conn().commit()
        db.compact()
        assert count(db, "session_prompts") == 0
        assert count(db, "skill_uses") == 0

    def test_fact_columns_flow_through_the_buffered_writers(self, db):
        db.append_request(RequestRow(ts=NOW, source_ts=NOW, session_id="s", model=MODEL, ttft_ms=12.5, source="otel"))
        db.append_tool_invocation(
            ToolInvocationRow(ts=NOW, session_id="s", tool_name="Bash", source="hook", source_event_id="i", agent_id="a", confirm="approved", confirm_wait_ms=5, target="ls", exit_code=0)
        )
        db.flush()
        assert rows(db, "SELECT ttft_ms FROM requests") == [{"ttft_ms": 12.5}]
        got = rows(db, "SELECT agent_id, confirm, confirm_wait_ms, target, exit_code FROM tool_invocations")
        assert got == [{"agent_id": "a", "confirm": "approved", "confirm_wait_ms": 5, "target": "ls", "exit_code": 0}]


# ── Accuracy guards in the telemetry parsers ───────────────────────────


class TestClaudeErrorDetector:
    def report(self):
        return tt.ToolTelemetryReport(tool="t", source="s")

    def test_429_inside_an_id_is_not_a_rate_limit(self):
        report = self.report()
        obj = {"type": "system", "subtype": "stop_hook_summary", "uuid": "a4291234-0000", "timestamp": "2026-04-29T00:00:00.429Z"}
        tt._detect_claude_errors(obj, "system", report)
        assert report.errors == []

    def test_tool_output_in_a_progress_event_is_not_an_api_error(self):
        report = self.report()
        obj = {"type": "progress", "data": {"output": "test timed out, rate limit, quota"}, "toolUseID": "x"}
        tt._detect_claude_errors(obj, "progress", report)
        assert report.errors == []

    def test_429_as_a_word_is_a_rate_limit(self):
        report = self.report()
        tt._detect_claude_errors({"type": "system", "content": "API returned 429"}, "system", report)
        assert [e["type"] for e in report.errors] == ["rate_limit"]

    def test_api_error_message_line_is_found(self):
        report = self.report()
        obj = {
            "type": "assistant",
            "isApiErrorMessage": True,
            "error": "rate_limit",
            "timestamp": "t",
            "message": {"model": "<synthetic>", "content": [{"type": "text", "text": "limit reached"}]},
        }
        tt._detect_claude_errors(obj, "assistant", report)
        assert report.errors[0]["type"] == "rate_limit"
        assert report.errors[0]["message"] == "limit reached"

    def test_errors_of_every_recent_session_are_found(self, tmp_path, monkeypatch):
        tt._claude_error_cache.clear()
        root = tmp_path / "proj"
        root.mkdir()
        projects = tmp_path / "projects"
        slug = str(root.resolve()).replace("\\", "/").replace("/", "-").lstrip("-")
        monkeypatch.setattr(tt, "claude_projects_dir", lambda: projects)
        error = {"type": "assistant", "isApiErrorMessage": True, "error": "overloaded", "message": {"content": []}}
        write_lines(projects / slug / "older.jsonl", [error])
        newest = projects / slug / "newest.jsonl"
        write_lines(newest, [c_assistant("m1", "r1", 10)])
        report = self.report()
        tt._parse_claude_active_session(root, report)
        assert [e["type"] for e in report.errors] == ["overloaded"]
        assert report.active_session_input == 10

    def test_only_the_end_of_a_large_file_is_read(self, tmp_path, monkeypatch):
        monkeypatch.setattr(tt, "_CLAUDE_TAIL_BYTES", 300)
        path = tmp_path / "big.jsonl"
        write_lines(path, [{"n": i, "pad": "x" * 50} for i in range(100)])
        got = [o["n"] for o in tt._tail_objects(path)]
        assert got[-1] == 99
        assert 0 < len(got) < 10


class TestCopilotTelemetry:
    def test_slow_tool_uses_start_and_complete(self, tmp_path):
        path = tmp_path / "events.jsonl"
        write_lines(
            path,
            [
                ev("tool.execution_start", 500, {"toolCallId": "slow", "toolName": "bash"}),
                ev("tool.execution_complete", 400, {"toolCallId": "slow", "success": True}),
                ev("tool.execution_start", 300, {"toolCallId": "fast", "toolName": "view"}),
                ev("tool.execution_complete", 299, {"toolCallId": "fast", "success": True}),
            ],
        )
        report = tt.ToolTelemetryReport(tool="copilot-cli", source="s")
        tt._parse_copilot_events(path, report)
        assert [e["type"] for e in report.errors] == ["timeout"]
        assert "bash" in report.errors[0]["message"]

    def test_desktop_and_cli_reports_hold_their_own_sessions(self, tmp_path, monkeypatch):
        monkeypatch.setattr(tt.Path, "home", classmethod(lambda cls: tmp_path))
        monkeypatch.setattr(tt, "_copilot_report_cache", None)
        monkeypatch.setattr(tt, "_copilot_app_sessions_cache", None)
        home = tmp_path / ".copilot"
        home.mkdir()
        data = sqlite3.connect(home / "data.db")
        data.execute("CREATE TABLE sessions (id TEXT PRIMARY KEY, session_type TEXT, secret TEXT)")
        data.execute("INSERT INTO sessions VALUES(?, 'project', 'never read')", (DESKTOP_SID,))
        data.execute("INSERT INTO sessions VALUES(?, 'cli_session', 'never read')", (COPILOT_SID,))
        data.commit()
        data.close()
        write_lines(home / "session-state" / DESKTOP_SID / "events.jsonl", [usage_record(100, out=11)])
        write_lines(home / "session-state" / COPILOT_SID / "events.jsonl", [usage_record(100, out=22)])
        write_lines(home / "session-state" / "unlisted" / "events.jsonl", [usage_record(100, out=33)])
        cli = tt.parse_copilot_telemetry(tool="copilot-cli")
        desktop = tt.parse_copilot_telemetry(tool="copilot-desktop")
        assert (cli.tool, cli.output_tokens) == ("copilot-cli", 55)
        assert (desktop.tool, desktop.output_tokens) == ("copilot-desktop", 11)
        # Each keeps its own cached result rather than evicting the other's.
        assert tt.parse_copilot_telemetry(tool="copilot-cli") is cli
        assert tt.parse_copilot_telemetry(tool="copilot-desktop") is desktop
