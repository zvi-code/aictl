"""Kusto on-demand details must not borrow pending or local historical payloads."""

import json
from types import SimpleNamespace

import pytest

from aictl.dashboard import board_api, session_record
from aictl.dashboard.queryable_context import session_context_files
from aictl.storage import HistoryDB, TelemetryRow
from aictl.tools import ResourceFile, ToolResources


class QueryableFixture:
    """A fake Kusto read facade over seeded memory, never a network connection."""

    _kusto = object()

    def __init__(self, db):
        self._db = db

    def __getattr__(self, name):
        return getattr(self._db, name)


def test_context_inventory_and_usage_ignore_native_snapshot_values(monkeypatch):
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.execute(
            "INSERT INTO files(path,tool,category,scope,size_bytes,tokens,mtime,meta) VALUES (?,?,?,?,?,?,?,?)",
            (
                "C:/recorded/instructions.md",
                "copilot-cli",
                "instructions",
                "project",
                800,
                200,
                100,
                json.dumps({"sent_to_llm": "yes", "loaded_when": "every-call"}),
            ),
        )
        conn.execute(
            "INSERT INTO files(path,tool,category,scope,tokens) VALUES (?,?,?,?,?)",
            ("C:/recorded/custom.data", "copilot-cli", "custom-kind", "project", 50),
        )
        db.append_telemetry(TelemetryRow(ts=100, tool="copilot-cli", input_tokens=7, output_tokens=3))
        snapshot = SimpleNamespace(
            root="C:/recorded",
            tools=[ToolResources("copilot-cli", "Copilot", files=[ResourceFile("C:/pending.md", "instructions")])],
            tool_configs=[{"tool": "copilot-cli", "model": "gpt-5"}],
            tool_telemetry=[{"tool": "copilot-cli", "input_tokens": 999999, "output_tokens": 999999}],
            agent_memory=[{"file": "C:/pending-memory.md", "tokens": 999999}],
        )
        monkeypatch.setattr(board_api, "_file_sessions", lambda: pytest.fail("Native inventory was consulted"))
        result = board_api.compute_context(QueryableFixture(db), SimpleNamespace(snapshot=snapshot), now=1_700_000_000)
        files = [file for tool in result["files"] for file in tool["files"]]
        assert {file["path"] for file in files} == {"C:/recorded/instructions.md", "C:/recorded/custom.data"}
        assert result["telemetry"][0]["input"] == 7 and result["telemetry"][0]["output"] == 3
        assert result["budget"]["totals"]["always"] == 200
        assert result["budget"]["tools"][0]["unknown_policy_tokens"] == 50
        assert next(file for file in files if file["path"].endswith("custom.data"))["policy"] == "unknown"
        assert next(file for file in files if file["path"].endswith("custom.data"))["load"] is None
        assert all(row["file"] != "C:/pending-memory.md" for row in result["memory"]["entries"])
        assert result["source"] == "kusto.queryable"
    finally:
        db.close()


def test_session_file_inventory_uses_stored_paths_and_loaded_evidence_only():
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.executemany(
            "INSERT INTO files(path,tool,scope) VALUES (?,?,?)",
            [
                ("C:/p_one/a.md", "copilot-cli", "project"),
                ("C:/pXone/unrelated.md", "copilot-cli", "project"),
                ("C:/global/current.md", "copilot-cli", "global"),
                ("C:/other-tool.md", "other", "global"),
            ],
        )
        result = session_context_files(
            conn, "C:/p_one", [{"path": "C:/loaded/instructions.md", "how": "recorded"}], "copilot-cli"
        )
        assert {row["path"] for row in result["files"]} == {
            "C:/p_one/a.md",
            "C:/global/current.md",
            "C:/loaded/instructions.md",
        }
        assert result["source"] == "kusto.queryable" and result["total"] == 3
        assert next(row for row in result["files"] if row["path"].startswith("C:/loaded"))["loaded"]
    finally:
        db.close()


def test_kusto_historical_transcript_never_merges_analyzer_pending_output(monkeypatch):
    monkeypatch.setattr(board_api, "_session_flow", lambda *_: ("session", [], "store"))
    db = SimpleNamespace(_kusto=object(), capture="full")
    status, payload = board_api.agent_transcript.__wrapped__(
        db, "session", legacy_transcript=lambda _: pytest.fail("Pending analyzer payload was used")
    )
    assert status == 200 and payload["turns"] == [] and payload["is_live"] is False


def test_kusto_flow_rejects_an_explicit_native_fallback(monkeypatch):
    db = SimpleNamespace(_kusto=object(), _conn=lambda: object())
    forwarded = []
    monkeypatch.setattr(board_api, "_resolve_agent", lambda *_: ("session", "session"))
    monkeypatch.setattr(board_api, "_flow_stamp", lambda *_: ())
    monkeypatch.setattr(
        board_api, "_session_flow_build", lambda *_args: forwarded.append(_args[-1]) or ("session", [], "store")
    )
    board_api._session_flow(db, "session", 0, 100, lambda *_: pytest.fail("Native fallback used"))
    assert forwarded == [None]


def test_kusto_artifacts_use_indexed_metadata_not_local_stat(monkeypatch):
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.execute(
            "INSERT INTO session_artifacts(session_id,path,folder,size_bytes,mtime) VALUES (?,?,?,?,?)",
            ("session", "C:/remote/output.txt", "C:/remote", 123, 100),
        )
        monkeypatch.setattr(session_record, "_stat", lambda _: pytest.fail("Local historical file was stat'ed"))
        artifacts, count, size = session_record.session_artifacts(conn, ["session"], "", queryable_only=True)
        assert count == 1 and size == 123 and artifacts[0]["size_bytes"] == 123
        assert artifacts[0]["exists"] is None and artifacts[0]["source"] == "kusto.queryable"
    finally:
        db.close()


def test_kusto_commit_read_never_attributes_local_git_or_looks_up_prs(monkeypatch):
    monkeypatch.setattr(session_record.PR_FINDER, "lookup", lambda *_: pytest.fail("GitHub lookup supplied history"))
    db = SimpleNamespace(_kusto=object(), get_session_commits=lambda _: [])
    commits, note = session_record.session_commits(
        db, {"session_id": "session", "project_path": "C:/project", "started_at": 1, "ended_at": 2}, "session"
    )
    assert commits == [] and "queryable history" in note


def test_live_prompt_and_skill_helpers_cannot_leak_disk_only_history(monkeypatch):
    from aictl.dashboard.live_projection import _ProjectionDB, board_entities
    from aictl.dashboard.live_queries import ProjectionQueries

    calls = []
    local = "C:/recorded/.github/prompts/local.prompt.md"
    monkeypatch.setattr(
        board_api,
        "_prompt_files_on_disk",
        lambda roots: calls.append(("prompts", roots)) or ([("C:/recorded", local)], ["C:/recorded/.github/prompts"]),
    )
    monkeypatch.setattr(
        board_api,
        "_skill_file",
        lambda *_: (
            calls.append(("skill",))
            or {
                "scope": "project",
                "path": "C:/unpersisted/SKILL.md",
                "description": "Unpersisted configured description",
                "file_tokens": 987654,
            }
        ),
    )
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.executescript(
            "INSERT INTO sessions(session_id,tool,project_path,started_at,ended_at)"
            " VALUES ('s','copilot-cli','C:/recorded',100,190);"
            "INSERT INTO requests(ts,session_id,tool,project_path,model,input_tokens,output_tokens)"
            " VALUES (120,'s','copilot-cli','C:/recorded','gpt-5',7,3);"
            "INSERT INTO session_prompts(ts,session_id,tool,project_path,prompt_file)"
            " VALUES (110,'s','copilot-cli','C:/recorded','recorded.prompt.md');"
            "INSERT INTO skill_uses(ts,session_id,tool,project_path,name)"
            " VALUES (115,'s','copilot-cli','C:/recorded','example');"
        )
        filters = board_api.Filters(90, 200, buckets=4)
        live_db = _ProjectionDB(db, ProjectionQueries(), "offline-provenance")
        payload = board_api.compute_board(live_db, filters, now=200)
        entities = board_entities("scope", payload)
        history = [
            data for topic, _, data, _ in entities if topic == "history.board" and isinstance(data["value"], dict)
        ]
        configured = [
            data
            for topic, _, data, source in entities
            if source == "filesystem.config" and isinstance(data["value"], dict)
        ]
        skills = next(row["value"] for row in history if row["field"] == "skills")
        assert not {"file_tokens", "description", "path"} & skills.keys()
        assert any(row["value"].get("file_tokens") == 987654 for row in configured)
        prompts = [row["value"] for row in history if row["field"] == "project_prompts"]
        assert len(prompts) == 1 and prompts[0]["file"] == "recorded.prompt.md" and prompts[0]["uses"] == 1
        assert any(row["value"].get("file") == local for row in configured)
        assert all("uses" not in row["value"] for row in configured)
        assert calls and any(call[0] == "skill" for call in calls)
        monkeypatch.setattr(
            board_api,
            "_skill_file",
            lambda *_: {"scope": None, "path": None, "description": None, "file_tokens": None},
        )
        missing = board_entities("scope", board_api.compute_board(live_db, filters, now=200))
        missing_skills = next(
            data["value"]
            for topic, _, data, _ in missing
            if topic == "history.board" and data["field"] == "skills" and isinstance(data["value"], dict)
        )
        assert missing_skills == skills
    finally:
        db.close()
