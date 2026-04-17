"""Tests for :mod:`aictl.analysis.mcp_usage`.

Covers:
* aggregation of MCP spans for a session;
* server name extraction from multiple attribute shapes;
* empty / non-MCP sessions return an empty list;
* ``configured_servers`` reads ``.vscode/mcp.json`` via the importer.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from aictl.analysis.mcp_usage import configured_servers, session_mcp_calls
from aictl.storage import EventRow, HistoryDB


@pytest.fixture()
def db(tmp_path):
    h = HistoryDB(db_path=str(tmp_path / "aictl.db"), flush_interval=0)
    yield h
    h.close()


def _ev(db, *, session_id, kind, detail, ts=None):
    db.append_event(
        EventRow(
            ts=ts if ts is not None else time.time(),
            tool="copilot-vscode",
            kind=kind,
            detail=detail,
            session_id=session_id,
            pid=0,
        )
    )


def test_aggregates_calls_by_server(db):
    sid = "sess-1"
    base = time.time() - 100
    _ev(db, session_id=sid, kind="otel:mcp.tool.call",
        detail={"aictl.mcp.server": "github", "duration_ms": 12.5}, ts=base)
    _ev(db, session_id=sid, kind="otel:mcp.tool.call",
        detail={"aictl.mcp.server": "github", "duration_ms": 7.5}, ts=base + 10)
    _ev(db, session_id=sid, kind="otel:mcp.tool.call",
        detail={"mcp.server": "filesystem", "duration_ms": 3.0, "is_error": True}, ts=base + 20)
    db.flush()
    servers = session_mcp_calls(db, sid)
    by_name = {s["server_name"]: s for s in servers}
    assert "github" in by_name
    assert by_name["github"]["call_count"] == 2
    assert by_name["github"]["total_duration_ms"] == 20.0
    assert by_name["github"]["err_count"] == 0
    assert by_name["filesystem"]["call_count"] == 1
    assert by_name["filesystem"]["err_count"] == 1
    # Sorted by call_count desc: github first.
    assert servers[0]["server_name"] == "github"


def test_extracts_from_service_name_prefix(db):
    sid = "sess-2"
    _ev(db, session_id=sid, kind="otel:mcp.tool.call",
        detail={"service.name": "mcp:memory"})
    db.flush()
    servers = session_mcp_calls(db, sid)
    assert servers and servers[0]["server_name"] == "memory"


def test_ignores_non_mcp_events(db):
    sid = "sess-3"
    _ev(db, session_id=sid, kind="otel:claude_code.api_request",
        detail={"model": "claude-opus"})
    _ev(db, session_id=sid, kind="hook:UserPromptSubmit", detail={"prompt": "hi"})
    db.flush()
    assert session_mcp_calls(db, sid) == []


def test_empty_session_id_returns_empty(db):
    assert session_mcp_calls(db, "") == []


def test_configured_servers_reads_vscode_mcp_json(tmp_path):
    (tmp_path / ".vscode").mkdir()
    (tmp_path / ".vscode" / "mcp.json").write_text(
        json.dumps(
            {
                "servers": {
                    "github": {"command": "npx", "args": ["-y", "@github/mcp"]},
                    "filesystem": {"command": "mcp-filesystem"},
                }
            }
        )
    )
    names = configured_servers(str(tmp_path))
    assert sorted(names) == ["filesystem", "github"]


def test_configured_servers_dedups_across_files(tmp_path):
    (tmp_path / ".vscode").mkdir()
    (tmp_path / ".vscode" / "mcp.json").write_text(
        json.dumps({"servers": {"github": {"command": "a"}}})
    )
    (tmp_path / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"github": {"command": "b"}, "memory": {"command": "c"}}})
    )
    names = configured_servers(str(tmp_path))
    # First hit wins; dedup ensures no duplicate "github".
    assert sorted(names) == ["github", "memory"]


def test_configured_servers_missing_dir_returns_empty(tmp_path):
    assert configured_servers(str(tmp_path / "nope")) == []
    assert configured_servers("") == []
