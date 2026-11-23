"""Kusto on-demand details must not borrow pending or local historical payloads."""

import json
from types import SimpleNamespace

import pytest

from aictl.dashboard import board_filters, board_projection, context_projection, flow_projection, session_record
from aictl.dashboard.queryable_context import session_context_files
from aictl.stores import Store
from aictl.stores.testing import FixtureReader
from aictl.tools import ResourceFile, ToolResources


def test_context_inventory_and_usage_ignore_native_snapshot_values(kusto_store, monkeypatch):
    kusto_store.insert(
        "files", path="C:/recorded/instructions.md", tool="copilot-cli", category="instructions", scope="project",
        size_bytes=800, tokens=200, mtime=100,
        meta=json.dumps({"sent_to_llm": "yes", "loaded_when": "every-call"}),
    )
    kusto_store.insert("files", path="C:/recorded/custom.data", tool="copilot-cli", category="custom-kind",
                       scope="project", tokens=50)
    kusto_store.insert("tool_stats", ts=100, tool="copilot-cli", input_tokens=7, output_tokens=3)
    snapshot = SimpleNamespace(
        root="C:/recorded",
        tools=[ToolResources("copilot-cli", "Copilot", files=[ResourceFile("C:/pending.md", "instructions")])],
        tool_configs=[{"tool": "copilot-cli", "model": "gpt-5"}],
        tool_telemetry=[{"tool": "copilot-cli", "input_tokens": 999999, "output_tokens": 999999}],
        agent_memory=[{"file": "C:/pending-memory.md", "tokens": 999999}],
    )
    monkeypatch.setattr(context_projection, "_file_sessions", lambda: pytest.fail("Native inventory was consulted"))
    result = context_projection.compute_context(kusto_store, SimpleNamespace(snapshot=snapshot), now=1_700_000_000)
    files = [file for tool in result["files"] for file in tool["files"]]
    assert {file["path"] for file in files} == {"C:/recorded/instructions.md", "C:/recorded/custom.data"}
    assert result["telemetry"][0]["input"] == 7 and result["telemetry"][0]["output"] == 3
    assert result["budget"]["totals"]["always"] == 200
    assert result["budget"]["tools"][0]["unknown_policy_tokens"] == 50
    assert next(file for file in files if file["path"].endswith("custom.data"))["policy"] == "unknown"
    assert next(file for file in files if file["path"].endswith("custom.data"))["load"] is None
    assert all(row["file"] != "C:/pending-memory.md" for row in result["memory"]["entries"])
    assert result["source"] == "kusto.queryable"


def test_unresolved_daily_usage_does_not_hide_queryable_context_inventory(kusto_store, monkeypatch):
    from aictl.kusto.observations import UnresolvedObservationsError

    context_projection._context_db_memo.clear()
    calls = []

    def unresolved(*_args):
        calls.append(True)
        raise UnresolvedObservationsError(("requests",))

    monkeypatch.setattr(context_projection, "_read_context_daily", unresolved)
    kusto_store.insert("files", path="C:/recorded/instructions.md", tool="copilot-cli", category="instructions", tokens=200)
    kusto_store.insert("system_snapshots", ts=1_699_999_990, mem_tokens=200, memory_entries=1)
    try:
        store = SimpleNamespace(snapshot=None)
        result = context_projection.compute_context(kusto_store, store, now=1_700_000_000)
        assert result["daily"]["available"] is False
        assert result["daily"]["incomplete"] is True
        assert result["daily"]["retryable"] is False
        assert result["daily"]["unresolved_families"] == ["requests"]
        assert result["daily"]["rows"] == [] and result["daily"]["models"] == []
        assert result["files"][0]["files"][0]["path"] == "C:/recorded/instructions.md"
        assert result["memory"]["growth"] == [{"ts": 1_699_999_990, "mem_tokens": 200, "memory_entries": 1}]
        assert result["source"] == "kusto.queryable"
        context_projection.compute_context(kusto_store, store, now=1_700_000_001)
        assert calls == [True]
    finally:
        context_projection._context_db_memo.clear()


def test_session_file_inventory_lists_only_files_the_tool_sends_to_the_model():
    def inventory(params):
        assert params["requested_path"] == "C:/p_one" and params["requested_tool"] == "copilot-cli"
        return [
            {"path": "C:/p_one/AGENTS.md", "tool": "copilot-cli", "category": "instructions", "scope": "project"},
            {"path": "C:/Users/me/.copilot/copilot-instructions.md", "tool": "copilot-cli", "category": "instructions",
             "scope": "global"},
            # Files the tool keeps for itself: never instructions, whatever their folder.
            {"path": "C:/Users/me/.copilot/session-store.db", "tool": "copilot-cli", "category": "database",
             "scope": "global"},
            {"path": "C:/Users/me/.copilot/data.db-wal", "tool": "", "category": "", "scope": "global"},
            {"path": "C:/p_one/notes.md", "tool": "copilot-cli", "category": "instructions", "scope": "project"},
            {"path": "C:/p_one/rules.md", "tool": "copilot-cli", "category": "other", "scope": "project",
             "meta": '{"sent_to_llm": "yes"}'},
        ]

    history = board_projection.HistoryScope.local(Store(reader=FixtureReader({"files.session_inventory": inventory})))
    result = session_context_files("C:/p_one", [{"path": "C:/loaded/instructions.md", "how": "recorded"}],
                                   "copilot-cli", history=history)
    assert {row["path"] for row in result["files"]} == {
        "C:/p_one/AGENTS.md", "C:/Users/me/.copilot/copilot-instructions.md", "C:/p_one/rules.md",
        "C:/loaded/instructions.md",
    }
    assert result["source"] == "kusto.queryable" and result["total"] == 4
    assert next(row for row in result["files"] if row["path"].startswith("C:/loaded"))["loaded"]


def test_kusto_historical_transcript_never_merges_analyzer_pending_output(monkeypatch):
    monkeypatch.setattr(flow_projection, "_session_flow", lambda *_, **__: ("session", [], "store"))
    store = SimpleNamespace(_reported_history=True, capture="full")
    status, payload = flow_projection.agent_transcript(
        store, "session", legacy_transcript=lambda _: pytest.fail("Pending analyzer payload was used")
    )
    assert status == 200 and payload["turns"] == [] and payload["is_live"] is False


def test_kusto_flow_rejects_an_explicit_native_fallback():
    store = SimpleNamespace(_reported_history=True, capture="full")
    history = board_projection.HistoryScope.local(Store(reader=FixtureReader({"agents.resolve": [], "sequence.flow": []})))
    result = flow_projection._session_flow(store, "session", 0, 100, lambda *_: pytest.fail("Native fallback used"), history)
    assert result is None


def test_kusto_artifacts_use_indexed_metadata_not_local_stat(monkeypatch):
    store = Store(reader=FixtureReader({"files.artifacts": [
        dict(row_type="index", session_id="session", values=["C:/remote/output.txt", "files", 123, 100]),
    ]}))
    history = board_projection.HistoryScope.local(store)
    monkeypatch.setattr(session_record.os, "stat", lambda *_: pytest.fail("Local historical file was stat'ed"))
    artifacts, count, size = session_record.session_artifacts(["session"], "", history=history)
    assert count == 1 and size == 123 and artifacts[0]["size_bytes"] == 123
    assert artifacts[0]["exists"] is None and artifacts[0]["source"] == "kusto.queryable"


def test_kusto_commit_read_never_attributes_local_git_or_looks_up_prs(monkeypatch, kusto_store):
    from aictl.dashboard.history_scope import identity

    monkeypatch.setattr(session_record.PR_FINDER, "lookup", lambda *_: pytest.fail("GitHub lookup supplied history"))
    db = kusto_store
    local = board_projection.HistoryScope.local(db)
    history = board_projection.HistoryScope(local.reader, local.node, qualified=True)
    sid = identity(local.node, "session")
    commits, note = session_record.session_commits(
        db, {"session_id": sid, "project_path": "C:/project", "started_at": 1, "ended_at": 2}, sid, history=history
    )
    assert commits == [] and "queryable history" in note


def test_live_prompt_and_skill_helpers_cannot_leak_disk_only_history(monkeypatch, kusto_store):
    from aictl.dashboard.live.projection import _ProjectionDB, board_entities

    calls = []
    local = "C:/recorded/.github/prompts/local.prompt.md"
    monkeypatch.setattr(
        board_projection,
        "_prompt_files_on_disk",
        lambda roots: calls.append(("prompts", roots)) or ([("C:/recorded", local)], ["C:/recorded/.github/prompts"]),
    )
    monkeypatch.setattr(
        board_projection,
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
    db = kusto_store
    fields = {"session_id": "s", "tool": "copilot-cli", "project_path": "C:/recorded"}
    db.insert("sessions", **fields, started_at=100, ended_at=190)
    db.insert("requests", **fields, ts=120, model="gpt-5", input_tokens=7, output_tokens=3)
    db.insert("session_prompts", **fields, ts=110, prompt_file="recorded.prompt.md")
    db.insert("skill_uses", **fields, ts=115, name="example")
    filters = board_filters.Filters(90, 200, buckets=4)
    live_db = _ProjectionDB(db, "offline-provenance")
    payload = board_projection.compute_board(live_db, filters, now=200)
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
        board_projection,
        "_skill_file",
        lambda *_: {"scope": None, "path": None, "description": None, "file_tokens": None},
    )
    missing = board_entities("scope", board_projection.compute_board(live_db, filters, now=200))
    missing_skills = next(
        data["value"]
        for topic, _, data, _ in missing
        if topic == "history.board" and data["field"] == "skills" and isinstance(data["value"], dict)
    )
    assert missing_skills == skills
