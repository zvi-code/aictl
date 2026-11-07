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
    assert payload["permissions"] == {"allow": [], "deny": [], "ask": []}
    assert payload["editable_fields"] == ["permissions.allow", "permissions.deny", "permissions.ask"]
    assert payload["scope"] == "project"


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


def test_save_records_mutation_ledger_entry(tmp_path, monkeypatch):
    import aictl.mutation_ledger as ml

    calls = []
    monkeypatch.setattr(ml, "record", lambda **kw: calls.append(kw))

    save_editable_tool_config(
        tmp_path,
        "claude-code",
        {"permissions": {"allow": ["Read(*)"], "deny": []}},
        now=1_779_000_000,
    )

    assert len(calls) == 1
    entry = calls[0]
    assert entry["command"] == "dashboard:tool-config:claude-code"
    assert entry["op"] == "create"  # file did not exist beforehand
    assert entry["previous_content"] is None
    assert b"Read(*)" in entry["new_content"]


def test_save_records_modify_op_when_file_exists(tmp_path, monkeypatch):
    import aictl.mutation_ledger as ml

    path = tmp_path / ".claude" / "settings.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"permissions": {"allow": [], "deny": []}}))

    calls = []
    monkeypatch.setattr(ml, "record", lambda **kw: calls.append(kw))

    save_editable_tool_config(
        tmp_path,
        "claude-code",
        {"permissions": {"allow": ["Read(*)"], "deny": []}, "expected_mtime": path.stat().st_mtime},
        now=1_779_000_000,
    )

    assert calls[0]["op"] == "modify"
    assert calls[0]["previous_content"] is not None



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


def test_load_reads_ask_rules(tmp_path):
    path = tmp_path / ".claude" / "settings.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"permissions": {"allow": ["Bash"], "ask": ["Edit"]}}))

    payload = load_editable_tool_config(tmp_path, "claude-code")

    assert payload["permissions"] == {"allow": ["Bash"], "deny": [], "ask": ["Edit"]}


def test_project_local_scope_reads_and_writes_the_local_file(tmp_path):
    shared = tmp_path / ".claude" / "settings.json"
    shared.parent.mkdir()
    shared.write_text(json.dumps({"permissions": {"allow": ["Read(*)"]}}))
    local = tmp_path / ".claude" / "settings.local.json"
    local.write_text(json.dumps({"permissions": {"allow": ["Bash(ls)"]}}))

    loaded = load_editable_tool_config(tmp_path, "claude-code", "project-local")
    assert loaded["scope"] == "project-local"
    assert loaded["path"] == str(local)
    assert loaded["permissions"]["allow"] == ["Bash(ls)"]

    saved = save_editable_tool_config(
        tmp_path,
        "claude-code",
        {
            "scope": "project-local",
            "expected_mtime": local.stat().st_mtime,
            "permissions": {"allow": ["Bash(ls)", "Bash(git status)"], "deny": ["WebFetch"], "ask": ["Edit"]},
        },
        now=1_779_000_000,
    )

    assert saved["scope"] == "project-local"
    assert saved["path"] == str(local)
    assert saved["backup_path"] and Path(saved["backup_path"]).name.startswith("settings.local.json.bak.")
    assert json.loads(local.read_text())["permissions"] == {
        "allow": ["Bash(ls)", "Bash(git status)"],
        "deny": ["WebFetch"],
        "ask": ["Edit"],
    }
    # The shared project file is not touched.
    assert json.loads(shared.read_text()) == {"permissions": {"allow": ["Read(*)"]}}


def test_unknown_scope_is_rejected(tmp_path):
    with pytest.raises(ToolConfigEditError) as exc:
        load_editable_tool_config(tmp_path, "claude-code", "user")
    assert exc.value.status == 400

    with pytest.raises(ToolConfigEditError) as exc:
        save_editable_tool_config(tmp_path, "claude-code", {"scope": "managed", "permissions": {"allow": []}})
    assert exc.value.status == 400
    assert not (tmp_path / ".claude").exists()


def test_save_without_ask_keeps_existing_ask_rules(tmp_path):
    path = tmp_path / ".claude" / "settings.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"permissions": {"allow": [], "ask": ["Edit"]}}))

    save_editable_tool_config(
        tmp_path,
        "claude-code",
        {"permissions": {"allow": ["Read(*)"], "deny": []}, "expected_mtime": path.stat().st_mtime},
        now=1_779_000_000,
    )

    assert json.loads(path.read_text())["permissions"]["ask"] == ["Edit"]


def test_save_does_not_add_an_empty_ask_list(tmp_path):
    save_editable_tool_config(
        tmp_path,
        "claude-code",
        {"permissions": {"allow": ["Read(*)"], "deny": [], "ask": []}},
        now=1_779_000_000,
    )

    data = json.loads((tmp_path / ".claude" / "settings.json").read_text())
    assert "ask" not in data["permissions"]


def test_save_rejects_non_string_ask_entries(tmp_path):
    with pytest.raises(ToolConfigEditError) as exc:
        save_editable_tool_config(tmp_path, "claude-code", {"permissions": {"allow": [], "deny": [], "ask": [1]}})

    assert exc.value.status == 400
    assert "permissions.ask" in exc.value.message
