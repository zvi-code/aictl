# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""VS Code layers: an active profile replaces the default user settings; .code-workspace settings sit
between user and folder settings; rows name their file, never a bare scope word."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.monitoring import tool_config as tc


@pytest.fixture()
def vscode(tmp_path, monkeypatch):
    user = tmp_path / "Code" / "User"
    user.mkdir(parents=True)
    project = tmp_path / "project"
    project.mkdir()
    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    monkeypatch.setenv("COPILOT_HOME", str(tmp_path / "copilot-home"))
    monkeypatch.setattr(tc, "vscode_user_dir", lambda: user)
    monkeypatch.setattr(tc, "VSCODE_POLICY_FILES", [tmp_path / "policy.json"])
    monkeypatch.setattr(tc, "SETTINGS_CATALOG_PATH", tmp_path / "no-catalog.yaml")
    for name in ("OTEL_EXPORTER_OTLP_ENDPOINT", "COPILOT_OTEL_ENABLED"):
        monkeypatch.delenv(name, raising=False)
    return {"user": user, "project": project}


def _write(path: Path, data: object) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))
    return path


def _associate(user: Path, project: Path, profile_id: str, name: str) -> Path:
    _write(user / "globalStorage" / "storage.json", {
        "profileAssociations": {"workspaces": {project.resolve().as_uri(): profile_id}, "emptyWindows": {}},
        "userDataProfiles": [{"location": profile_id, "name": name}],
    })
    return user / "profiles" / profile_id / "settings.json"


def _rows(cfg: tc.ToolConfig, root: Path) -> dict[str, dict]:
    cfg.project_root = str(root)
    return {r["key"]: r for s in tc.normalize_sections(cfg, {}) for r in s["rows"]}


def test_active_profile_replaces_the_default_user_settings(vscode):
    user, project = vscode["user"], vscode["project"]
    _write(user / "settings.json", {"chat.agent.maxRequests": 10, "chat.defaultOnly": True})
    profile = _write(_associate(user, project, "-abc123", "Work"), {"chat.agent.maxRequests": 40})
    cfg = tc._parse_vscode_config(project)
    rows = _rows(cfg, project)
    assert rows["maxRequests"]["value"] == 40
    assert rows["maxRequests"]["scope"] == "profile" and rows["maxRequests"]["source"] == str(profile)
    assert "chat.defaultOnly" not in rows  # the default profile's user settings are not used here
    scopes = {s["id"]: s for s in cfg.scopes}
    assert scopes["profile"]["label"] == "Profile Work" and "not documented" in scopes["profile"]["note"]
    assert "not used for this folder" in scopes["user"]["note"]


def test_default_profile_uses_the_user_settings(vscode):
    user, project = vscode["user"], vscode["project"]
    _write(user / "settings.json", {"chat.agent.maxRequests": 10})
    rows = _rows(tc._parse_vscode_config(project), project)
    assert rows["maxRequests"]["scope"] == "user" and rows["maxRequests"]["value"] == 10


def test_code_workspace_settings_sit_between_user_and_folder(vscode):
    user, project = vscode["user"], vscode["project"]
    _write(user / "settings.json", {"chat.agent.maxRequests": 10, "chat.autoReply": False})
    ws_file = _write(project / "team.code-workspace", {"folders": [{"path": "."}],
                                                     "settings": {"chat.agent.maxRequests": 20, "chat.autoReply": True}})
    folder = _write(project / ".vscode" / "settings.json", {"chat.agent.maxRequests": 30})
    cfg = tc._parse_vscode_config(project)
    rows = _rows(cfg, project)
    chain = [(e["scope"], e["value"]) for e in rows["maxRequests"]["chain"]]
    assert chain == [("user", 10), ("workspace-file", 20), ("workspace", 30)]
    assert rows["maxRequests"]["source"] == str(folder)
    assert rows["autoReply"]["source"] == str(ws_file) and rows["autoReply"]["scope"] == "workspace-file"
    assert any(s["id"] == "workspace-file" for s in cfg.scopes)


def test_copilot_configurable_model_rows_name_their_file(vscode):
    user, project = vscode["user"], vscode["project"]
    settings = _write(user / "settings.json", {"github.copilot.enable": {"*": True}, "chat.planAgent.defaultModel": "m"})
    cfg = tc._parse_copilot_config(project)
    rows = _rows(cfg, project)
    plan = rows["chat.planAgent.defaultModel"]
    assert plan["source"] == str(settings) and plan["line"] > 0  # "settings.json, line N", never "user:N"
