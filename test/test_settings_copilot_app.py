# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The Copilot desktop app's own settings come from app_state in data.db, never from the CLI's settings.json."""

from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path

import pytest

from aictl.monitoring import tool_config as tc

TOKEN = "FAKEAPPTOKEN0077value"


@pytest.fixture()
def app_home(tmp_path, monkeypatch):
    home = tmp_path / "copilot-home"
    home.mkdir()
    monkeypatch.setenv("COPILOT_HOME", str(home))
    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    monkeypatch.setattr(tc, "_copilot_desktop_version", lambda: "")
    monkeypatch.setattr(tc, "SETTINGS_CATALOG_PATH", Path(tc.__file__).resolve().parent.parent / "data" / "settings-catalog.yaml")
    return home


def _db(home: Path, app_state: dict[str, str]) -> Path:
    db = home / "data.db"
    conn = sqlite3.connect(db)
    conn.execute("CREATE TABLE app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT)")
    conn.execute("CREATE TABLE settings (key TEXT, value TEXT)")
    conn.execute("CREATE TABLE accounts (login TEXT, token TEXT)")
    conn.execute("INSERT INTO settings VALUES ('github-token', ?)", (TOKEN,))
    conn.execute("INSERT INTO accounts VALUES ('someone', ?)", (TOKEN,))
    conn.executemany("INSERT INTO app_state (key, value) VALUES (?, ?)", list(app_state.items()))
    conn.commit()
    conn.close()
    return db


def _rows(cfg: tc.ToolConfig) -> dict[str, dict]:
    cfg.project_root = "/nowhere"
    return {r["key"]: r for s in tc.normalize_sections(cfg, {}) for r in s["rows"]}


def test_app_settings_are_its_own_app_state_layer(app_home, tmp_path):
    _db(app_home, {
        "copilot-selected-model": "invented-model",
        "copilot-reasoning-effort": json.dumps({"invented-model": "high"}),
        "feature-flags": json.dumps({"flagA": True, "flagB": False}),
        "telemetry.machine_id": "abc123",
        "copilot-managed-model-by-account": json.dumps({"someone": "m"}),
        "zz-unknown-key": "1",
    })
    # The CLI's settings.json: not the app's settings (the docs do not say the app reads it).
    (app_home / "settings.json").write_text(json.dumps({"logLevel": "debug", "model": "cli-model"}))
    cfg = tc._parse_copilot_desktop_config(tmp_path)
    rows = _rows(cfg)
    selected = rows["copilot-selected-model"]
    assert selected["value"] == "invented-model" and selected["scope"] == "app-state"
    assert selected["state"] == "app-state" and selected["source"] == str(app_home / "data.db")
    assert rows["feature-flags"]["value"] == {"flagA": True, "flagB": False}
    assert rows["zz-unknown-key"]["documented"] is False  # present, not in catalog
    assert rows["telemetry.machine_id"]["value"] == "<hidden>"
    assert rows["copilot-managed-model-by-account"]["value"] == "<hidden>"
    assert "logLevel" not in rows and cfg.model == ""
    assert not any(r["source"].endswith("settings.json") for r in rows.values())
    dumped = json.dumps(cfg.to_dict())
    assert TOKEN not in dumped and "someone" not in dumped and "abc123" not in dumped
    app_scope = next(s for s in cfg.scopes if s["id"] == "app-state")
    assert app_scope["changeable"] is False


def test_shared_mcp_servers_are_marked_shared_with_the_cli(app_home, tmp_path):
    _db(app_home, {})
    (app_home / "mcp-config.json").write_text(json.dumps({"mcpServers": {"srv": {"command": "npx", "args": ["srv"]}}}))
    cfg = tc._parse_copilot_desktop_config(tmp_path)
    assert [s["name"] for s in cfg.mcp_inventory] == ["srv"]
    assert cfg.mcp_inventory[0]["note"].startswith("Shared with Copilot CLI")


def test_reader_sql_names_only_the_app_state_table():
    """Guard: the reader's SQL selects key and value of app_state and names no other table."""
    sql = tc.APP_STATE_SQL
    assert re.fullmatch(r"SELECT key, value FROM app_state", sql)
    words = set(re.findall(r"[a-z_]+", sql.lower()))
    assert not words & {"settings", "accounts", "join", "union", "sqlite_master"}


def test_authorizer_refuses_any_other_table(app_home):
    db = _db(app_home, {"k": "v"})
    conn = sqlite3.connect(db)
    conn.set_authorizer(tc._app_state_authorizer)
    assert conn.execute(tc.APP_STATE_SQL).fetchall() == [("k", "v")]
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("SELECT value FROM settings").fetchall()
    conn.close()


def test_large_values_are_summarised(app_home, tmp_path):
    _db(app_home, {"copilot-available-models": json.dumps([{"id": f"m{i}", "name": "x" * 50} for i in range(200)])})
    rows = _rows(tc._parse_copilot_desktop_config(tmp_path))
    assert rows["copilot-available-models"]["value"] == "200 items"
