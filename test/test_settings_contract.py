from __future__ import annotations

from aictl.dashboard.tool_config_editor import load_editable_tool_config, save_editable_tool_config
from aictl.monitoring.live_sources import _config_payload
from test_contract import VALIDATORS, validate_detail


def test_normalized_settings_provenance_validates_without_private_environment():
    settings = "/project/.claude/settings.json"
    configs = [{
        "tool": "claude-code",
        "scopes": [{"id": "project", "path": settings, "changeable": True, "exists": True}],
        "sections": [{"id": "agents", "rows": [{
            "key": "agent/reviewer", "scope": "project", "source": settings, "kind": "agent", "wins": 0,
            "chain": [{"scope": "project", "source": settings, "line": 2, "value": "haiku"}],
            "agent": {"name": "reviewer", "model": "haiku", "pinned_in": settings, "tools": ["Read"]},
        }, {"key": "unset_row", "set": False}]}],
        "env_vars": [{
            "name": "CLAUDE_MODEL", "set": True, "masked": False, "process": "launch-only", "in_process": True,
            "persisted": [{"origin": settings, "kind": "settings", "value": "haiku"}],
            "drives": [{"key": "model", "label": "Model"}],
        }],
    }]
    payload = _config_payload(configs)
    VALIDATORS["topics"]["configuration.file"].validate(payload)
    config = payload["tool_configs"][0]
    assert [row["key"] for row in config["sections"][0]["rows"]] == ["agent/reviewer"]
    assert config["sections"][0]["rows"][0]["chain"][0]["line"] == 2
    assert "process" not in config["env_vars"][0]


def test_permission_read_and_write_payloads_share_the_contract(tmp_path, monkeypatch):
    from aictl import mutation_ledger

    monkeypatch.setattr(mutation_ledger, "record", lambda **_: None)
    tool, scope = "claude-code", "project-local"
    folder = tmp_path / ".claude"
    folder.mkdir()
    (folder / "settings.local.json").write_text('{"permissions":{"allow":["Read"]}}', encoding="utf-8")
    current = load_editable_tool_config(tmp_path, tool, scope)
    validate_detail("/api/tool-config/{tool}", current)
    update = {
        "scope": scope, "expected_mtime": current["mtime"],
        "permissions": {"allow": ["Read", "Glob"], "deny": [], "ask": []},
    }
    VALIDATORS["shared"]["settings-permission-write"].validate(update)
    saved = save_editable_tool_config(tmp_path, tool, update)
    validate_detail("/api/tool-config/{tool}", saved)
    assert saved["backup_path"]
    assert saved["permissions"]["allow"] == ["Read", "Glob"]
