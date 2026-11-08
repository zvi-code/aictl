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


# ─── Any settings file, as text ──────────────────────────────────────────────

from aictl.dashboard.tool_config_editor import load_settings_file, restore_masked, save_settings_file  # noqa: E402

SECRET = "sk-abcdefghijklmnopqrstuvwxyz0123456789"


def _allow(*paths):
    keys = {str(p) for p in paths}
    return lambda p: p in keys


def _mcp(tmp_path, text=None):
    f = tmp_path / "mcp.json"
    f.write_text(text if text is not None else f'{{\n  "env": {{"OPENAI_API_KEY": "{SECRET}"}},\n  "a": 1\n}}\n')
    return f


def test_load_masks_a_secret_and_says_so(tmp_path):
    f = _mcp(tmp_path)
    r = load_settings_file(str(f), _allow(f))
    assert r["masked"] is True
    assert SECRET not in r["text"]
    assert "<redacted>" in r["text"]
    assert r["mtime"] == f.stat().st_mtime


def test_a_file_no_scan_found_is_refused(tmp_path):
    f = _mcp(tmp_path)
    with pytest.raises(ToolConfigEditError) as exc:
        load_settings_file(str(f), _allow())
    assert exc.value.status == 403


def test_only_text_settings_files_are_edited(tmp_path):
    f = tmp_path / "run.py"
    f.write_text("print(1)\n")
    with pytest.raises(ToolConfigEditError) as exc:
        load_settings_file(str(f), _allow(f))
    assert exc.value.status == 403


def test_a_missing_file_is_404_and_never_created(tmp_path):
    f = tmp_path / "settings.json"
    with pytest.raises(ToolConfigEditError) as exc:
        save_settings_file(str(f), {"text": "{}"}, _allow(f))
    assert exc.value.status == 404
    assert not f.exists()


def test_save_keeps_the_real_value_of_an_untouched_masked_line(tmp_path, monkeypatch):
    import aictl.mutation_ledger as ml

    calls = []
    monkeypatch.setattr(ml, "record", lambda **kw: calls.append(kw))
    f = _mcp(tmp_path)
    r = load_settings_file(str(f), _allow(f))
    out = save_settings_file(str(f), {"text": r["text"].replace('"a": 1', '"a": 2'), "expected_mtime": r["mtime"]}, _allow(f), now=1_779_000_000)
    data = json.loads(f.read_text())
    assert data == {"env": {"OPENAI_API_KEY": SECRET}, "a": 2}
    assert Path(out["backup_path"]).read_text().endswith('"a": 1\n}\n')
    assert out["text"].count("<redacted>") == 1
    assert calls[0]["command"] == "dashboard:settings-file" and calls[0]["op"] == "modify"
    assert SECRET in calls[0]["new_content"].decode()


def test_save_writes_a_masked_line_the_user_changed_as_typed(tmp_path):
    f = _mcp(tmp_path)
    r = load_settings_file(str(f), _allow(f))
    save_settings_file(str(f), {"text": r["text"].replace("<redacted>", "sk-new-key-0123456789abcdefghijklmnop")}, _allow(f))
    assert json.loads(f.read_text())["env"]["OPENAI_API_KEY"] == "sk-new-key-0123456789abcdefghijklmnop"


def test_restore_masked_handles_added_and_removed_lines():
    original = f"a=1\nkey={SECRET}\nb=2\n"
    masked = "a=1\nkey=<redacted>\nb=2\n"
    assert restore_masked(original, masked, "a=1\nkey=<redacted>\nc=3\nb=2\n") == f"a=1\nkey={SECRET}\nc=3\nb=2\n"
    assert restore_masked(original, masked, "key=<redacted>\n") == f"key={SECRET}\n"
    assert restore_masked("plain\n", "plain\n", "other\n") == "other\n"


def test_save_refuses_text_the_tool_could_not_parse_and_leaves_the_file(tmp_path):
    f = _mcp(tmp_path, '{"a": 1}\n')
    with pytest.raises(ToolConfigEditError) as exc:
        save_settings_file(str(f), {"text": "{oops"}, _allow(f))
    assert exc.value.status == 400
    assert "unchanged" in exc.value.message
    assert f.read_text() == '{"a": 1}\n'
    assert not list(tmp_path.glob("*.bak.*"))


@pytest.mark.parametrize("name,bad", [("x.toml", "a = [1,\n"), ("x.yaml", "a: [1\n")])
def test_save_validates_toml_and_yaml(tmp_path, name, bad):
    f = tmp_path / name
    f.write_text("a: 1\n" if name.endswith("yaml") else "a = 1\n")
    with pytest.raises(ToolConfigEditError) as exc:
        save_settings_file(str(f), {"text": bad}, _allow(f))
    assert exc.value.status == 400


def test_save_refuses_a_file_changed_since_it_was_loaded(tmp_path):
    f = _mcp(tmp_path, '{"a": 1}\n')
    r = load_settings_file(str(f), _allow(f))
    import os

    os.utime(f, (r["mtime"] + 5, r["mtime"] + 5))
    with pytest.raises(ToolConfigEditError) as exc:
        save_settings_file(str(f), {"text": "{}", "expected_mtime": r["mtime"]}, _allow(f))
    assert exc.value.status == 409
    assert f.read_text() == '{"a": 1}\n'


def test_markdown_is_written_as_typed(tmp_path):
    f = tmp_path / "AGENTS.md"
    f.write_text("# Rules\n")
    save_settings_file(str(f), {"text": "# Rules\n\n- one\n"}, _allow(f))
    assert f.read_text() == "# Rules\n\n- one\n"
