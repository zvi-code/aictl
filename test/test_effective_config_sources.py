"""User-level sources, Windows locations, the command and the read-only promise."""

from __future__ import annotations

import json
import ntpath
from pathlib import Path

from click.testing import CliRunner

from aictl.context_audit import run_audit
from aictl.effective_config import expand_windows, inside_windows, settings_table, windows_locations

WIN_ENV = {
    "appdata": r"C:\Users\Dev\AppData\Roaming",
    "LOCALAPPDATA": r"C:\Users\Dev\AppData\Local",
    "UserProfile": r"C:\Users\Dev",
    "PROGRAMDATA": r"C:\ProgramData",
    "OneDrive": r"C:\Users\Dev\OneDrive - Org",
}
PROJECT = r"C:\work\repo"


def write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def locations(env=None, project=PROJECT, dirs=None, present=()):
    dirs = dirs or {}
    wanted = {p.lower() for p in present}
    return windows_locations(env or WIN_ENV, project, list_dir=lambda p: dirs.get(p.lower(), []), exists=lambda p: p.lower() in wanted)


def by_raw(rows, raw):
    return next(r for r in rows if r["raw"].lower() == raw.lower())


# ─── Windows ──────────────────────────────────────────────────────


def test_env_lookup_is_case_insensitive_and_shows_both_forms():
    row = by_raw(locations(), r"%APPDATA%\Code\User\settings.json")
    assert row["expanded"] == r"C:\Users\Dev\AppData\Roaming\Code\User\settings.json"
    assert row["in_project"] is False
    assert "Not in this project, still in effect" in row["why_in_effect"]


def test_unset_variable_expands_to_nothing_rather_than_a_guess():
    assert expand_windows(r"%NOPE%\x", WIN_ENV) == ""
    assert by_raw(locations(), r"%VSCODE_PORTABLE%\user-data\User\settings.json")["expanded"] == ""


def test_vscode_tree_covers_every_user_file_for_both_editors():
    rows = locations()
    for editor in ("Code", "Code - Insiders"):
        for name in ("settings.json", "mcp.json", "chatLanguageModels.json", r"prompts\*.prompt.md", r"globalStorage\github.copilot-chat\*-agent\*.agent.md", r"profiles\<id>\settings.json"):
            assert by_raw(rows, rf"%APPDATA%\{editor}\User\{name}")


def test_profiles_are_listed_one_by_one():
    tree = ntpath.join(WIN_ENV["appdata"], "Code", "User", "profiles").lower()
    rows = locations(dirs={tree: ["abc123"]})
    row = by_raw(rows, r"%APPDATA%\Code\User\profiles\abc123\settings.json")
    assert row["expanded"].endswith(r"Code\User\profiles\abc123\settings.json")
    assert "profile" in row["note"]


def test_msix_virtualized_paths():
    rows = locations()
    assert by_raw(rows, r"%LOCALAPPDATA%\Packages\<package>\LocalCache\Roaming")["verified"] is True
    assert by_raw(rows, r"%LOCALAPPDATA%\Packages\<package>\LocalCache\Local")
    packages = r"c:\users\dev\appdata\local\packages"
    actual = r"C:\Users\Dev\AppData\Local\Packages\Python.3\LocalCache\Roaming\Code\User\settings.json"
    found = locations(dirs={packages: ["Python.3"]}, present=[actual])
    row = by_raw(found, r"%LOCALAPPDATA%\Packages\Python.3\LocalCache\Roaming\Code\User\settings.json")
    assert row["exists"] is True and row["id"] == "msix-vscode-settings"


def test_onedrive_documents_redirection():
    row = by_raw(locations(), r"%OneDrive%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1")
    assert row["expanded"].startswith(r"C:\Users\Dev\OneDrive - Org\Documents")
    assert "COPILOT_MODEL" in row["note"]


def test_copilot_home_replaces_the_default_and_says_so():
    rows = locations(env={**WIN_ENV, "copilot_home": r"D:\cfg"})
    assert by_raw(rows, r"%COPILOT_HOME%\settings.json")["expanded"] == r"D:\cfg\settings.json"
    assert "Ignored" in by_raw(rows, r"%USERPROFILE%\.copilot\settings.json")["note"]


def test_parent_directories_walk_to_the_drive_root():
    rows = locations()
    paths = [r["expanded"] for r in rows if r["id"] == "parent-dir"]
    assert r"C:\AGENTS.md" in paths and r"C:\.github\copilot-instructions.md" in paths and r"C:\work\AGENTS.md" in paths
    assert not any(p.lower().startswith(PROJECT.lower() + "\\") for p in paths)


def test_policy_registry_and_programdata_are_listed_and_unknowns_marked():
    rows = locations()
    assert by_raw(rows, r"HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\VSCode")["scope"] == "machine-policy"
    mdm = by_raw(rows, r"%ProgramFiles%\GitHubCopilot\managed-settings.json")
    assert mdm["verified"] is True and mdm["exists"] is False
    assert by_raw(rows, r"HKEY_LOCAL_MACHINE\SOFTWARE\Policies\GitHubCopilot")["scope"] == "machine-policy"


def test_portable_install_is_listed():
    rows = locations(env={**WIN_ENV, "VSCODE_PORTABLE": r"E:\vsc\data"})
    assert by_raw(rows, r"%VSCODE_PORTABLE%\user-data\User\settings.json")["expanded"] == r"E:\vsc\data\user-data\User\settings.json"


def test_containment_ignores_case_and_slash_direction():
    assert inside_windows(r"c:\WORK\Repo\.github\x", PROJECT)
    assert inside_windows("C:/work/repo/AGENTS.md", PROJECT)
    assert not inside_windows(r"C:\work\repo2\AGENTS.md", PROJECT)


def test_path_table_rows_are_reused():
    rows = locations()
    assert by_raw(rows, r"%APPDATA%\Code\User\memories\*.md")["scope"] == "user"


# ─── User-level sources in the audit ──────────────────────────────


def _audit(tmp_path, env, baseline):
    return run_audit(tmp_path / "repo", env=env, ps_output="", baseline_file=baseline)


def test_every_source_says_whether_it_is_in_the_project(tmp_path):
    home = tmp_path / "copilot-home"
    write(home / "copilot-instructions.md", "Be brief.\n")
    write(tmp_path / "repo" / "AGENTS.md", "Project rules.\n")
    report = _audit(tmp_path, {"COPILOT_HOME": str(home)}, tmp_path / "b.json")
    rows = {Path(s["path"]).name: s for s in report["sources"] if s["tool"] == "copilot-cli"}
    assert rows["AGENTS.md"]["in_project"] is True
    assert rows["AGENTS.md"]["why_in_effect"] == "In this project."
    assert rows["copilot-instructions.md"]["in_project"] is False
    assert str(home) in rows["copilot-instructions.md"]["why_in_effect"]
    hit = [f for f in report["findings"] if f["rule"] == "source.user-level-outside-root" and f["path"].endswith("copilot-instructions.md")]
    assert [f["severity"] for f in hit] == ["low"]


def test_user_source_is_raised_when_it_contradicts_the_repo(tmp_path):
    home = tmp_path / "copilot-home"
    write(home / "settings.json", json.dumps({"theme": "dark", "model": "gpt-6.1-terra"}))
    write(home / "config.json", "{}")
    write(tmp_path / "repo" / ".github/copilot/settings.json", json.dumps({"theme": "light", "model": "gpt-6.1-terra"}))
    report = _audit(tmp_path, {"COPILOT_HOME": str(home)}, tmp_path / "b.json")
    assert report["effective_models"]["copilot-cli"]["value"] == "gpt-6.1-terra"
    hit = [f for f in report["findings"] if f["rule"] == "source.user-level-outside-root" and f["path"] == str(home / "settings.json")]
    assert [f["severity"] for f in hit] == ["medium"]
    assert "theme" in hit[0]["snippet"]
    assert "model" not in hit[0]["snippet"].split("on:")[1]


def test_project_sources_get_no_outside_root_finding(tmp_path):
    write(tmp_path / "repo" / "AGENTS.md", "Rules.\n")
    report = _audit(tmp_path, {"COPILOT_HOME": str(tmp_path / "none")}, tmp_path / "b.json")
    assert not [f for f in report["findings"] if f["rule"] == "source.user-level-outside-root" and "/repo/" in f["path"]]


def test_audit_carries_model_findings_and_tool_filter(tmp_path):
    home = tmp_path / "copilot-home"
    write(home / "settings.json", json.dumps({"model": "claude-sonnet-5"}))
    write(tmp_path / "repo" / ".github/agents/flow.agent.md", "---\nmodel: gpt-6.1-terra\n---\n")
    report = run_audit(tmp_path / "repo", "copilot", env={"COPILOT_HOME": str(home)}, ps_output="", baseline_file=tmp_path / "b.json")
    assert {"model.pin-conflicts-request", "model.outside-project"} <= {f["rule"] for f in report["findings"]}
    assert report["counts"]["high"] >= 1
    assert "copilot-cli" in report["effective_models"]
    report = run_audit(tmp_path / "repo", "cursor", env={"COPILOT_HOME": str(home)}, ps_output="", baseline_file=tmp_path / "b.json")
    assert report["effective_models"] == {}
    assert not [f for f in report["findings"] if f["rule"].startswith("model.")]


# ─── Settings table ───────────────────────────────────────────────


def test_settings_table_names_source_and_what_was_overridden_and_hides_secrets(tmp_path):
    home = tmp_path / "copilot-home"
    project = tmp_path / "repo"
    write(home / "settings.json", json.dumps({"effortLevel": "high", "apiToken": "abc", "nested": {"a": 1}, "logLevel": "info"}))
    write(project / ".github/copilot/settings.json", json.dumps({"effortLevel": "low"}))
    rows = {r["setting"]: r for r in settings_table("copilot-cli", project, {"COPILOT_HOME": str(home)})}
    assert rows["effortLevel"]["value"] == "low"
    assert rows["effortLevel"]["overrode"][0]["value"] == "high"
    assert rows["logLevel"]["in_project"] is False
    assert rows["apiToken"]["value"] == "<hidden>"
    assert "nested" not in rows


# ─── The command ──────────────────────────────────────────────────


def _invoke(*args):
    from aictl.cli import main

    return CliRunner().invoke(main, ["ctx", "effective", *args])


def test_command_json_and_text(tmp_path, monkeypatch):
    home = tmp_path / "copilot-home"
    project = tmp_path / "repo"
    project.mkdir()
    write(home / "settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    monkeypatch.setenv("COPILOT_HOME", str(home))
    result = _invoke("--project", str(project), "--tool", "copilot-cli", "--json", "--search-path")
    assert result.exit_code == 0, result.output
    report = json.loads(result.output)
    assert report["effective_models"]["copilot-cli"]["value"] == "gpt-6.1-terra"
    assert any(not row["exists"] for row in report["search_path"])
    assert list(report["effective_models"]) == ["copilot-cli"]
    text = _invoke("--project", str(project), "--tool", "copilot-cli", "--search-path").output
    assert "effective model: gpt-6.1-terra" in text
    assert "still in effect" in text
    assert "absent" in text


def test_nothing_is_written_under_home_or_project(tmp_path, monkeypatch):
    home = tmp_path / "copilot-home"
    project = tmp_path / "repo"
    write(home / "settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    write(project / "AGENTS.md", "Use model claude-sonnet-5.\n")
    write(home / "session-state/s1/events.jsonl", json.dumps({"type": "session.start", "data": {"context": {"cwd": str(project)}}}) + "\n")
    monkeypatch.setenv("COPILOT_HOME", str(home))
    before = sorted((str(p), p.stat().st_mtime_ns) for p in tmp_path.rglob("*"))
    assert _invoke("--project", str(project), "--search-path").exit_code == 0
    assert sorted((str(p), p.stat().st_mtime_ns) for p in tmp_path.rglob("*")) == before


def test_no_prompt_text_in_output(tmp_path, monkeypatch):
    home = tmp_path / "copilot-home"
    project = tmp_path / "repo"
    project.mkdir()
    lines = [
        {"type": "session.start", "data": {"context": {"cwd": str(project)}, "selectedModel": "gpt-6.1-terra"}},
        {"type": "user.message", "data": {"content": "PROMPTTEXT"}},
        {"type": "session.error", "data": {"errorType": "query", "message": 'Model "x" is not available PROMPTTEXT'}},
        {"type": "tool.execution_start", "data": {"toolCallId": "a", "arguments": {"model": "y", "prompt": "PROMPTTEXT"}}},
        {"type": "assistant.message", "data": {"model": "z", "content": "PROMPTTEXT"}},
    ]
    write(home / "session-state/s1/events.jsonl", "\n".join(json.dumps(x) for x in lines))
    monkeypatch.setenv("COPILOT_HOME", str(home))
    result = _invoke("--project", str(project), "--tool", "copilot-cli", "--json")
    assert "request-failed" in result.output
    assert "PROMPTTEXT" not in result.output
