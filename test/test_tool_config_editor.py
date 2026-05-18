from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.dashboard.tool_config_editor import (
    ToolConfigEditError,
    load_editable_tool_config,
    save_editable_tool_config,
)


def test_load_claude_code_config_defaults_when_project_file_absent(tmp_path):
    payload = load_editable_tool_config(tmp_path, "claude-code")

    assert payload["tool"] == "claude-code"
    assert payload["exists"] is False
    assert payload["permissions"] == {"allow": [], "deny": []}
    assert payload["editable_fields"] == ["permissions.allow", "permissions.deny"]


def test_save_claude_code_permissions_creates_project_settings(tmp_path):
    payload = save_editable_tool_config(
        tmp_path,
        "claude-code",
        {"permissions": {"allow": ["Read(*)"], "deny": ["Bash(rm -rf *)"]}},
        now=1_779_000_000,
    )

    path = tmp_path / ".claude" / "settings.json"
    assert payload["path"] == str(path)
    assert payload["backup_path"] is None
    assert json.loads(path.read_text()) == {
        "permissions": {"allow": ["Read(*)"], "deny": ["Bash(rm -rf *)"]}
    }


def test_save_preserves_other_settings_and_creates_backup(tmp_path):
    path = tmp_path / ".claude" / "settings.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"model": "opus", "permissions": {"defaultMode": "ask", "allow": []}}))

    payload = save_editable_tool_config(
        tmp_path,
        "claude-code",
        {"permissions": {"allow": ["Read(*)"], "deny": []}, "expected_mtime": path.stat().st_mtime},
        now=1_779_000_000,
    )

    data = json.loads(path.read_text())
    assert data["model"] == "opus"
    assert data["permissions"]["defaultMode"] == "ask"
    assert data["permissions"]["allow"] == ["Read(*)"]
    assert payload["backup_path"]
    assert json.loads(Path(payload["backup_path"]).read_text())["model"] == "opus"


def test_save_rejects_non_string_permission_entries(tmp_path):
    with pytest.raises(ToolConfigEditError) as exc:
        save_editable_tool_config(tmp_path, "claude-code", {"permissions": {"allow": [123], "deny": []}})

    assert exc.value.status == 400
    assert "permissions.allow" in exc.value.message


def test_save_rejects_stale_mtime(tmp_path):
    path = tmp_path / ".claude" / "settings.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"permissions": {"allow": []}}))

    with pytest.raises(ToolConfigEditError) as exc:
        save_editable_tool_config(
            tmp_path,
            "claude-code",
            {"permissions": {"allow": [], "deny": []}, "expected_mtime": 1},
        )

    assert exc.value.status == 409


def test_unsupported_tool_returns_404(tmp_path):
    with pytest.raises(ToolConfigEditError) as exc:
        load_editable_tool_config(tmp_path, "copilot-vscode")

    assert exc.value.status == 404
