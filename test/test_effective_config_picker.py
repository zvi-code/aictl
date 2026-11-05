"""The VS Code model picker, read from state.vscdb fixtures only."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from aictl.effective_config import effective_model, model_findings, windows_locations


@pytest.fixture
def vs(tmp_path, monkeypatch):
    tree = tmp_path / "Code" / "User"
    tree.mkdir(parents=True)
    project = tmp_path / "repo"
    project.mkdir()
    monkeypatch.setattr("aictl.effective_config.vscode_user_dir", lambda: tree)
    monkeypatch.setattr("aictl.effective_config.vscode_insiders_user_dir", lambda: tmp_path / "none")
    return tree, project, {"COPILOT_HOME": str(tmp_path / "ch")}


def make_db(path: Path, rows: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)")
    con.executemany("INSERT INTO ItemTable VALUES (?, ?)", list(rows.items()))
    con.commit()
    con.close()


SECRET = "s3cr3t-token-value"


def test_picker_is_read_per_location_and_kept_apart_from_pins(vs):
    tree, project, env = vs
    make_db(
        tree / "globalStorage" / "state.vscdb",
        {
            "chat.currentLanguageModel.panel": "copilot/model-a",
            "chat.currentLanguageModel.editor": "copilot/model-b",
            "chat.currentLanguageModel.editor.isDefault": "true",
            "secret://anything": SECRET,
        },
    )
    eff = effective_model(project, "copilot-vscode", env=env)
    picks = {r["location"]: r for r in eff["picker"]}
    assert picks["panel"]["value"] == "model-a" and picks["panel"]["scope"] == "global"
    assert picks["editor"]["is_default"] is True
    assert eff["value"] == "" and eff["limited"] == []
    assert SECRET not in json.dumps(eff)


def test_workspace_picker_is_mapped_through_workspace_json(vs):
    tree, project, env = vs
    make_db(tree / "workspaceStorage" / "h1" / "state.vscdb", {"chat.currentLanguageModel.panel": "copilot/ws-model"})
    (tree / "workspaceStorage" / "h1" / "workspace.json").write_text(json.dumps({"folder": project.resolve().as_uri()}))
    make_db(tree / "workspaceStorage" / "h2" / "state.vscdb", {"chat.currentLanguageModel.panel": "copilot/other"})
    (tree / "workspaceStorage" / "h2" / "workspace.json").write_text(json.dumps({"folder": "file:///elsewhere/else"}))
    eff = effective_model(project, "copilot-vscode", env=env)
    assert [(r["scope"], r["value"]) for r in eff["picker"]] == [("workspace", "ws-model")]


def test_differing_setting_gives_finding_and_matching_one_does_not(vs):
    tree, project, env = vs
    make_db(tree / "globalStorage" / "state.vscdb", {"chat.currentLanguageModel.panel": "copilot/model-a"})
    (tree / "settings.json").write_text(json.dumps({"chat.planAgent.defaultModel": "model-b"}))
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-vscode",))
    assert [f for f in findings if f.rule == "model.differs-from-picker"]
    (tree / "settings.json").write_text(json.dumps({"chat.planAgent.defaultModel": "model-a"}))
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-vscode",))
    assert not [f for f in findings if f.rule == "model.differs-from-picker"]


@pytest.mark.parametrize("content", [b"not a database at all" * 50, b""])
def test_corrupt_database_is_not_readable_and_does_not_raise(vs, content):
    tree, project, env = vs
    db = tree / "globalStorage" / "state.vscdb"
    db.parent.mkdir(parents=True)
    db.write_bytes(content)
    eff = effective_model(project, "copilot-vscode", env=env)
    assert eff["picker"] == []
    assert any("not readable" in n for n in eff["picker_notes"]) or content == b""


def test_chat_language_models_json_lists_selectable_models_without_keys(vs):
    tree, project, env = vs
    (tree / "chatLanguageModels.json").write_text(json.dumps([{"name": "p", "vendor": "v", "apiKey": SECRET, "settings": {"m1": {}, "m2": {}}}]))
    eff = effective_model(project, "copilot-vscode", env=env)
    assert eff["custom_models"][0]["models"] == ["m1", "m2"]
    assert SECRET not in json.dumps(eff)


def test_windows_locations_list_state_databases_through_simulated_appdata():
    env = {"APPDATA": r"C:\Users\x\AppData\Roaming", "USERPROFILE": r"C:\Users\x"}
    rows = windows_locations(env, r"C:\work\repo", exists=lambda p: False)
    wanted = {r["expanded"].lower(): r for r in rows}
    glob_db = r"c:\users\x\appdata\roaming\code\user\globalstorage\state.vscdb"
    assert glob_db in wanted and wanted[glob_db]["exists"] is False
    assert any(k.endswith(r"workspacestorage\<hash>\state.vscdb") for k in wanted)
    assert any(k.endswith("chatlanguagemodels.json") for k in wanted)
