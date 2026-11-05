"""Copilot surfaces: shared stores, billing units, and Windows-shaped data."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from datetime import datetime

import pytest

from aictl.dashboard.analytics import compute_usage_summary
from aictl.ingesters._common import decode_file_uri, open_readonly, project_key
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.storage import HistoryDB, SessionRow

NOW = time.time()
CLI_SID = "aaaaaaaa-0000-4000-8000-000000000001"
APP_SID = "aaaaaaaa-0000-4000-8000-000000000002"
APP_CLI_SID = "aaaaaaaa-0000-4000-8000-000000000003"
VS_SID = "bbbbbbbb-0000-4000-8000-000000000001"
VS_CHAT_SID = "bbbbbbbb-0000-4000-8000-000000000002"


def iso(ago):
    return datetime.fromtimestamp(NOW - ago).astimezone().isoformat()


def build_store(home):
    home.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(home / "session-store.db")
    con.executescript(
        """
        CREATE TABLE sessions(id TEXT PRIMARY KEY, cwd TEXT, branch TEXT);
        CREATE TABLE turns(id INTEGER PRIMARY KEY, session_id TEXT, user_message TEXT);
        CREATE TABLE assistant_usage_events(id INTEGER PRIMARY KEY, session_id TEXT, model TEXT,
            input_tokens INT, output_tokens INT, cache_read_tokens INT, cache_write_tokens INT,
            total_nano_aiu INT, request_multiplier REAL, created_at TEXT);
        """
    )
    rows = [
        (CLI_SID, "gpt-6.1-sol", 1000, 10, 700, 200, 2_000_000_000, 1.0),
        (APP_SID, "claude-opus-5", 5000, 50, 4000, 500, 30_000_000_000, 3.0),
        (APP_CLI_SID, "gpt-6-astra", 100, 1, 0, 0, 1_000_000_000, 1.0),
        (CLI_SID, "worklist-improver", 100, 1, 0, 0, 500_000_000, 0.0),
    ]
    for r in rows:
        con.execute(
            "INSERT INTO assistant_usage_events(session_id, model, input_tokens, output_tokens,"
            " cache_read_tokens, cache_write_tokens, total_nano_aiu, request_multiplier, created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            (*r, iso(1000)),
        )
    con.execute("INSERT INTO sessions VALUES(?,?,?)", (CLI_SID, "C:\\Users\\Dev\\Proj", "main"))
    con.execute("INSERT INTO sessions VALUES(?,?,?)", (APP_SID, "c:/users/dev/proj/", "main"))
    con.execute("INSERT INTO turns(session_id, user_message) VALUES(?,?)", (CLI_SID, ""))
    con.commit()
    con.close()
    con = sqlite3.connect(home / "data.db")
    con.execute("CREATE TABLE sessions(id TEXT PRIMARY KEY, session_type TEXT)")
    con.execute("INSERT INTO sessions VALUES(?,?)", (APP_SID, "project"))
    con.execute("INSERT INTO sessions VALUES(?,?)", (APP_CLI_SID, "cli_session"))
    for col in ("total_input_tokens INT", "total_cached_tokens INT", "total_output_tokens INT", "total_nano_aiu INT", "model TEXT", "created_at TEXT", "updated_at TEXT"):
        con.execute(f"ALTER TABLE sessions ADD COLUMN {col}")
    con.commit()
    con.close()


@pytest.fixture
def db(tmp_path):
    d = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    yield d
    d.close()


@pytest.fixture
def ing(tmp_path, db):
    return TranscriptUsageIngester(
        db,
        claude_projects=tmp_path / "none-claude",
        codex_sessions=tmp_path / "none-codex",
        copilot_state=tmp_path / "copilot" / "session-state",
        vscode_workspaces=tmp_path / "workspaceStorage",
    )


def row(db, sid):
    rows = db.query_session_usage(session_ids=[sid])
    assert rows, sid
    return rows[0]


class TestSurfaces:
    def test_each_session_lands_on_its_surface_once(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        ing.poll()
        assert row(db, CLI_SID)["tool"] == "copilot-cli"
        assert row(db, APP_SID)["tool"] == "copilot-desktop"
        assert row(db, APP_CLI_SID)["tool"] == "copilot-cli"  # listed in the app, run by the CLI
        summary = compute_usage_summary(db, NOW - 86400)
        assert {t["tool"]: t["sessions"] for t in summary["tools"]} == {"copilot-cli": 2, "copilot-desktop": 1}

    def test_store_and_events_file_are_one_source(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        events = tmp_path / "copilot" / "session-state" / CLI_SID / "events.jsonl"
        events.parent.mkdir(parents=True)
        lines = [
            {"type": "session.usage_record", "timestamp": iso(1000), "data": {"usage": {"model": "gpt-6.1-sol", "inputTokens": 1000, "outputTokens": 10, "cacheReadTokens": 700, "cacheWriteTokens": 200}}},
            {"type": "tool.execution_complete", "timestamp": iso(999), "data": {}},
        ]
        events.write_text("".join(json.dumps(x) + "\n" for x in lines), encoding="utf-8")
        ing.poll()
        u = row(db, CLI_SID)
        assert u["output_tokens"] == 11  # store rows, not store + events
        assert u["input_tokens"] == 100 + 100  # input excludes its cache classes
        assert u["tool_call_count"] == 1  # tool calls come from the events file

    def test_live_session_ahead_of_the_store_uses_its_events(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        events = tmp_path / "copilot" / "session-state" / CLI_SID / "events.jsonl"
        events.parent.mkdir(parents=True)
        events.write_text(
            json.dumps({"type": "session.usage_record", "timestamp": iso(10), "data": {"usage": {"model": "gpt-6.1-sol", "inputTokens": 90000, "outputTokens": 900, "cacheReadTokens": 0, "cacheWriteTokens": 0}}}) + "\n",
            encoding="utf-8",
        )
        ing.poll()
        assert row(db, CLI_SID)["output_tokens"] == 900

    def test_agent_name_in_the_model_column_is_not_a_model(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        ing.poll()
        assert "worklist-improver" not in row(db, CLI_SID)["models"]

    def test_polling_again_adds_only_new_store_rows(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        ing.poll()
        assert ing.poll() == 0
        assert row(db, CLI_SID)["output_tokens"] == 11


class TestBilling:
    def test_copilot_shows_credits_and_never_a_list_price_as_cost(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        ing.poll()
        u = row(db, APP_SID)
        assert u["cost_usd"] is None
        assert u["cost_quality"] == "unknown"
        assert u["billing_unit"] == "ai_credits"
        assert u["billing_amount"] == pytest.approx(30.0)  # nano-AIU / 1e9
        assert not u["premium_requests"]  # the store has only per-call multipliers
        assert u["estimated_list_usd"] > 0  # separately named, and only ever an estimate
        assert "not vendor list prices" in u["cost_reason"]

    def test_premium_requests_come_from_the_session_count(self, tmp_path, db, ing):
        events = tmp_path / "copilot" / "session-state" / CLI_SID / "events.jsonl"
        events.parent.mkdir(parents=True)
        events.write_text(
            json.dumps({"type": "session.usage_record", "timestamp": iso(10), "data": {"usage": {"model": "gpt-6.1-sol", "inputTokens": 5, "outputTokens": 5, "cost": 27.0}}}) + "\n"
            + json.dumps({"type": "session.shutdown", "timestamp": iso(9), "data": {"totalPremiumRequests": 2, "modelMetrics": {}}}) + "\n",
            encoding="utf-8",
        )
        ing.poll()
        assert row(db, CLI_SID)["premium_requests"] == pytest.approx(2.0)

    @pytest.mark.parametrize("totals, expected", [((22, 22), 22.0), ((5, 9), 9.0)])
    def test_a_repeated_shutdown_restates_the_premium_count(self, tmp_path, db, ing, totals, expected):
        events = tmp_path / "copilot" / "session-state" / CLI_SID / "events.jsonl"
        events.parent.mkdir(parents=True)
        lines = [{"type": "session.usage_record", "timestamp": iso(10), "data": {"usage": {"model": "gpt-6.1-sol", "inputTokens": 5, "outputTokens": 5, "cost": 27.0}}}]
        lines += [{"type": "session.shutdown", "timestamp": iso(9), "data": {"totalPremiumRequests": n, "modelMetrics": {}}} for n in totals]
        events.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
        ing.poll()
        assert row(db, CLI_SID)["premium_requests"] == pytest.approx(expected)

    def test_events_ahead_of_the_store_keep_the_store_credits(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        events = tmp_path / "copilot" / "session-state" / CLI_SID / "events.jsonl"
        events.parent.mkdir(parents=True)
        events.write_text(
            json.dumps({"type": "session.usage_record", "timestamp": iso(10), "data": {"usage": {"model": "gpt-6.1-sol", "inputTokens": 90000, "outputTokens": 900}}}) + "\n",
            encoding="utf-8",
        )
        ing.poll()
        ing.poll()
        u = row(db, CLI_SID)
        assert (u["output_tokens"], u["billing_amount"]) == (900, pytest.approx(2.5))
        summary = compute_usage_summary(db, NOW - 86400)
        assert {t["tool"]: t for t in summary["tools"]}["copilot-cli"]["billing_amount"] == pytest.approx(3.5)

    def test_app_session_without_request_rows_uses_its_counters(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        con = sqlite3.connect(tmp_path / "copilot" / "data.db")
        con.execute(
            "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,?)",
            ("cccccccc-0000-4000-8000-000000000001", "project", 1000, 900, 50, 5_000_000_000, "gpt-6-astra", iso(100), iso(90)),
        )
        con.commit()
        con.close()
        ing.poll()
        u = row(db, "cccccccc-0000-4000-8000-000000000001")
        assert (u["tool"], u["quality"]) == ("copilot-desktop", "partial")
        assert (u["input_tokens"], u["cache_read_tokens"], u["output_tokens"]) == (100, 900, 50)
        assert u["billing_amount"] == pytest.approx(5.0)

    def test_rollup_keeps_cost_null_and_sums_credits(self, tmp_path, db, ing):
        build_store(tmp_path / "copilot")
        ing.poll()
        summary = compute_usage_summary(db, NOW - 86400)
        tool = {t["tool"]: t for t in summary["tools"]}["copilot-desktop"]
        assert tool["cost_usd"] is None
        assert tool["billing_amount"] == pytest.approx(30.0)
        assert tool["billing_usd_value"] == pytest.approx(0.30)
        assert tool["by_model"][0]["cost_usd"] is None
        assert summary["daily"][0]["cost_usd"] == 0

    def test_hook_row_for_copilot_is_not_list_priced(self, db):
        db.upsert_session(SessionRow(session_id=VS_SID, tool="copilot-vscode", source="otel", started_at=NOW - 10, model="gpt-6.1-sol", input_tokens=1000))
        r = db.get_session(VS_SID)
        assert r["cost_usd"] is None
        assert r["billing_unit"] == "ai_credits"

    def test_cloud_only_tool_is_not_available_rather_than_zero(self, db):
        summary = compute_usage_summary(db, NOW - 86400)
        assert summary["not_available"][0]["tool"] == "copilot365"
        assert summary["totals"] is None


def windows_workspace(root):
    ws = root / "workspaceStorage" / "0123abcd"
    ws.mkdir(parents=True)
    (ws / "workspace.json").write_bytes(json.dumps({"folder": "file:///c%3A/Users/Dev/Proj"}).encode("utf-8"))
    return ws


def crlf(rows):
    return "".join(json.dumps(r, ensure_ascii=False) + "\r\n" for r in rows).encode("utf-8")


class TestVSCode:
    def test_debug_log_rolls_children_into_the_session(self, tmp_path, db, ing):
        ws = windows_workspace(tmp_path)
        logs = ws / "GitHub.copilot-chat" / "debug-logs" / VS_SID
        logs.mkdir(parents=True)
        ms = int((NOW - 500) * 1000)
        (logs / "main.jsonl").write_bytes(
            crlf(
                [
                    {"ts": ms, "type": "user_message", "attrs": {"content": "héllo"}},
                    {"ts": ms, "type": "llm_request", "attrs": {"model": "gpt-6.1-sol", "inputTokens": 1000, "outputTokens": 20, "cachedTokens": 800, "copilotUsageNanoAiu": 4_000_000_000}},
                    {"ts": ms, "type": "tool_call", "attrs": {}},
                ]
            )
        )
        (logs / "runSubagent-1.jsonl").write_bytes(
            crlf([{"ts": ms, "type": "llm_request", "attrs": {"model": "gpt-6.1-sol", "inputTokens": 50, "outputTokens": 5}}, {"ts": ms, "type": "user_message", "attrs": {}}])
        )
        ing.poll()
        u = row(db, VS_SID)
        assert u["tool"] == "copilot-vscode"
        assert (u["input_tokens"], u["cache_read_tokens"], u["output_tokens"]) == (250, 800, 25)
        assert u["turn_count"] == 1
        assert u["tool_call_count"] == 1
        assert u["billing_amount"] == pytest.approx(4.0)
        assert u["quality"] == "partial"
        assert u["project_path"] == "c:/Users/Dev/Proj"

    def test_chat_log_is_used_only_without_a_debug_log(self, tmp_path, db, ing):
        ws = windows_workspace(tmp_path)
        chats = ws / "chatSessions"
        chats.mkdir()
        result = {"kind": 1, "k": ["requests", 0, "result"], "v": {"metadata": {"promptTokens": 70, "outputTokens": 7}}}
        (chats / f"{VS_CHAT_SID}.jsonl").write_bytes(crlf([{"kind": 0, "v": {"requests": []}}, result, result]))
        logs = ws / "GitHub.copilot-chat" / "debug-logs" / VS_SID
        logs.mkdir(parents=True)
        (logs / "main.jsonl").write_bytes(crlf([{"ts": int((NOW - 9) * 1000), "type": "llm_request", "attrs": {"model": "gpt-6.1-sol", "inputTokens": 5, "outputTokens": 5}}]))
        (chats / f"{VS_SID}.jsonl").write_bytes(crlf([result]))
        ing.poll()
        assert row(db, VS_CHAT_SID)["output_tokens"] == 7
        assert row(db, VS_CHAT_SID)["quality"] == "partial"
        assert row(db, VS_SID)["output_tokens"] == 5


class TestWindowsShapes:
    @pytest.mark.parametrize(
        "spelling",
        ["C:\\Users\\Dev\\Proj", "c:/users/dev/proj", "C:/Users/Dev/Proj/", "file:///c%3A/Users/Dev/Proj", "C:\\USERS\\dev\\proj\\"],
    )
    def test_spellings_of_one_project_share_a_key(self, spelling):
        assert project_key(spelling) == "c:/users/dev/proj"

    def test_posix_paths_stay_case_sensitive(self):
        assert project_key("/home/dev/Proj") != project_key("/home/dev/proj")
        assert project_key("/home/dev/proj/") == "/home/dev/proj"

    def test_file_uri_decoding(self):
        assert decode_file_uri("file:///c%3A/Users/D%20v/P") == "c:/Users/D v/P"
        assert decode_file_uri("file:///home/dev/p") == "/home/dev/p"
        assert decode_file_uri("C:\\x") == "C:\\x"

    def test_crlf_and_utf8_transcript_counts_exactly(self, tmp_path, db):
        path = tmp_path / "claude" / "p" / f"{CLI_SID}.jsonl"
        path.parent.mkdir(parents=True)
        path.write_bytes(
            crlf(
                [
                    {"type": "user", "timestamp": iso(50), "cwd": "C:\\Users\\Dev\\Pröj", "message": {"content": "naïve"}},
                    {"type": "assistant", "timestamp": iso(49), "requestId": "r", "message": {"id": "m", "model": "claude-opus-5-5", "usage": {"input_tokens": 3, "output_tokens": 4}}},
                ]
            )
        )
        ing = TranscriptUsageIngester(db, claude_projects=tmp_path / "claude", codex_sessions=tmp_path / "n1", copilot_state=tmp_path / "n2" / "s", vscode_workspaces=tmp_path / "n3")
        ing.poll()
        u = row(db, CLI_SID)
        assert (u["input_tokens"], u["output_tokens"], u["turn_count"]) == (3, 4, 1)
        assert u["project_path"] == "C:\\Users\\Dev\\Pröj"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def test_open_readonly_leaves_wal_and_shm_untouched(tmp_path):
    db_path = tmp_path / "other.db"
    writer = sqlite3.connect(db_path)
    writer.execute("PRAGMA journal_mode=WAL")
    writer.execute("CREATE TABLE t(x)")
    writer.execute("INSERT INTO t VALUES(1)")
    writer.commit()
    shm, wal = tmp_path / "other.db-shm", tmp_path / "other.db-wal"
    before = digest(db_path), digest(wal), digest(shm)
    reader = open_readonly(db_path, "test")
    assert reader is not None
    try:
        reader.execute("SELECT * FROM sqlite_master").fetchall()
    except sqlite3.Error:
        pass  # a main file not yet checkpointed may read as empty or fail; it must never write
    reader.close()
    assert (digest(db_path), digest(wal), digest(shm)) == before
    writer.close()


def test_open_readonly_handles_a_path_with_spaces_and_a_missing_file(tmp_path):
    folder = tmp_path / "Application Support"
    folder.mkdir()
    con = sqlite3.connect(folder / "x.db")
    con.execute("CREATE TABLE t(x)")
    con.commit()
    con.close()
    reader = open_readonly(folder / "x.db", "test")
    assert reader.execute("SELECT COUNT(*) FROM t").fetchone() == (0,)
    reader.close()
    assert open_readonly(folder / "absent.db", "test") is None


@pytest.mark.parametrize(
    ("service", "tool"),
    [
        ("github-copilot-cli", "copilot-cli"),
        ("github-copilot-desktop", "copilot-desktop"),
        ("github-copilot-chat", "copilot-vscode"),
        ("copilot-chat", "copilot-vscode"),
        ("GitHub-Copilot-CLI", "copilot-cli"),
        ("some-copilot-cli-build", "copilot-cli"),
    ],
)
def test_otel_service_name_selects_the_surface(service, tool):
    from aictl.dashboard.otel_receiver import _resolve_tool

    assert _resolve_tool(service) == tool


class _QualityRecorder:
    def __init__(self):
        self.statuses = []

    def record_data_quality(self, component, status, **kwargs):
        self.statuses.append((status, kwargs.get("severity")))


def test_session_store_ingester_names_the_current_schema(tmp_path):
    from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester

    build_store(tmp_path / "copilot")
    rec = _QualityRecorder()
    assert CopilotSessionStoreIngester(tmp_path / "copilot" / "session-store.db", rec).poll() == 0
    assert rec.statuses == [("not_applicable", "info")]


def test_session_store_ingester_reports_an_unrecognised_schema(tmp_path):
    from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester

    path = tmp_path / "other.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE unrelated(x)")
    con.commit()
    con.close()
    rec = _QualityRecorder()
    assert CopilotSessionStoreIngester(path, rec).poll() == 0
    assert rec.statuses == [("schema_unknown", "warning")]
