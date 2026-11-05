"""Model resolution and findings for the Copilot tools, against fixtures only."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.effective_config import (
    canonical_model,
    classify_model_error,
    effective_model,
    frontmatter_model,
    instruction_requests,
    model_findings,
    read_session,
    same_model,
)


@pytest.fixture
def world(tmp_path):
    home = tmp_path / "copilot-home"
    project = tmp_path / "repo"
    home.mkdir()
    project.mkdir()
    return home, project, {"COPILOT_HOME": str(home)}


def write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def settings(home: Path, **values) -> Path:
    return write(home / "settings.json", json.dumps(values, indent=2))


def agent(project: Path, name: str, model_line: str) -> Path:
    return write(project / ".github" / "agents" / f"{name}.agent.md", f"---\nname: {name}\n{model_line}\n---\nBody\n")


def rules(findings, rule):
    return [f for f in findings if f.rule == rule]


def session_log(home: Path, session: str, project: Path, events: list[dict]) -> Path:
    start = {"type": "session.start", "timestamp": "2026-01-01T00:00:00Z", "data": {"context": {"cwd": str(project)}, "selectedModel": "gpt-6.1-terra"}}
    lines = [json.dumps(e) for e in [start, *events]]
    return write(home / "session-state" / session / "events.jsonl", "\n".join(lines) + "\n")


# ─── Precedence ───────────────────────────────────────────────────


def test_user_settings_pin_is_effective_and_outside_project(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    eff = effective_model(project, "copilot-cli", env=env, ps_output="")
    assert eff["value"] == "claude-sonnet-5"
    assert eff["scope"] == "user"
    assert eff["source"].endswith("settings.json")
    assert eff["line"] == 2
    assert eff["in_project"] is False
    assert "Not in this project, still in effect" in eff["why_in_effect"]


def test_env_beats_user_settings_and_names_what_it_overrides(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    eff = effective_model(project, "copilot-cli", env={**env, "COPILOT_MODEL": "gpt-6.1-terra"}, ps_output="")
    assert (eff["value"], eff["scope"]) == ("gpt-6.1-terra", "env")
    assert [o["value"] for o in eff["overrides"]] == ["claude-sonnet-5"]


def test_flag_beats_env(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    eff = effective_model(project, "copilot-cli", env={**env, "COPILOT_MODEL": "gpt-6.1-terra"}, ps_output="123 /opt/bin/copilot --model=gpt-5-mini -p x")
    assert (eff["value"], eff["scope"]) == ("gpt-5-mini", "flag")
    assert [o["scope"] for o in eff["overrides"]] == ["env", "user"]


def test_other_processes_are_not_read_as_a_flag(world):
    _home, project, env = world
    eff = effective_model(project, "copilot-cli", env=env, ps_output="1 /usr/bin/python serve --model gpt-6.1-terra\n2 /opt/copilot-language-server --model x")
    assert eff["value"] == ""


def test_repo_pin_over_user_pin_is_verified_by_the_config_reference(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    write(project / ".github/copilot/settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    eff = effective_model(project, "copilot-cli", env=env, ps_output="")
    assert (eff["value"], eff["scope"], eff["verified"], eff["in_project"]) == ("gpt-6.1-terra", "repo", True, True)
    assert "repo-overridable" in eff["basis"]
    assert eff["why_in_effect"] == "In this project."


def test_local_settings_beat_repo_settings(world):
    _home, project, env = world
    write(project / ".github/copilot/settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    write(project / ".github/copilot/settings.local.json", json.dumps({"model": "gpt-5-mini"}))
    assert effective_model(project, "copilot-cli", env=env, ps_output="")["scope"] == "repo-local"


def test_no_pin_says_so(world):
    _home, project, env = world
    eff = effective_model(project, "copilot-cli", env=env, ps_output="")
    assert eff["value"] == "" and eff["overrides"] == [] and eff["conflicts"] == []


def test_global_and_per_subagent_pins_are_both_modelled(world):
    home, project, env = world
    settings(home, model="gpt-6.1-terra", subagents={"agents": {"builder": {"model": "claude-sonnet-5", "effortLevel": "high"}, "scout": {"model": "claude-sonnet-5"}}})
    eff = effective_model(project, "copilot-cli", env=env, ps_output="")
    assert eff["value"] == "gpt-6.1-terra"
    limited = {r["setting"]: r for r in eff["limited"]}
    assert limited["subagents.agents.builder.model"]["value"] == "claude-sonnet-5"
    assert limited["subagents.agents.builder.model"]["applies"] == "subagent:builder"
    assert limited["subagents.agents.scout.model"]["line"] > limited["subagents.agents.builder.model"]["line"]


def test_top_level_model_line_is_not_a_nested_one(world):
    home, project, env = world
    settings(home, subagents={"agents": {"builder": {"model": "claude-sonnet-5"}}}, model="gpt-6.1-terra")
    eff = effective_model(project, "copilot-cli", env=env, ps_output="")
    text = (home / "settings.json").read_text().splitlines()
    assert text[eff["line"] - 1].strip().startswith('"model": "gpt-6.1-terra"')


# ─── Parsing ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("line", "expected"),
    [
        ("model: gpt-6.1-terra", ["gpt-6.1-terra"]),
        ("model: 'gpt-6.1-terra'", ["gpt-6.1-terra"]),
        ('model: "gpt-6.1-terra" # note', ["gpt-6.1-terra"]),
        ("model: gpt-6.1-terra # note", ["gpt-6.1-terra"]),
        ("model: [gpt-6.1-terra, 'claude-sonnet-5']", ["gpt-6.1-terra", "claude-sonnet-5"]),
        ("model:\n  - gpt-6.1-terra\n  - claude-sonnet-5", ["gpt-6.1-terra", "claude-sonnet-5"]),
    ],
)
def test_frontmatter_forms(line, expected):
    values, number = frontmatter_model(f"---\nname: a\n{line}\ntools: []\n---\nBody")
    assert values == expected and number == 3


@pytest.mark.parametrize("text", ["# model: gpt-6.1-terra\n", "---\nname: a\n---\nmodel: gpt-6.1-terra\n", ""])
def test_model_outside_frontmatter_is_not_read(text):
    assert frontmatter_model(text) == ([], 0)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Claude Opus 4.1 (200K context)(Preview)", "claude-opus-4-1"),
        ("claude-opus-4.9-test", "claude-opus-4-9-test"),
        ("GPT-6.1-Terra (copilot)", "gpt-6.1-terra"),
        ("sonnet", "claude-sonnet-5"),
    ],
)
def test_display_names_and_families_compare_equal(a, b):
    assert same_model(a, b)


def test_different_versions_are_different_models():
    assert not same_model("claude-sonnet-5", "claude-opus-4-9-test")
    assert canonical_model("Claude Sonnet 5 (200K context)") == "claude-sonnet-5"


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Always use model gpt-6.1-terra here.", ["gpt-6.1-terra"]),
        ("Run `copilot --model claude-sonnet-5`", ["claude-sonnet-5"]),
        ("model: claude-sonnet-5", ["claude-sonnet-5"]),
        ("Do not use gpt-6.1-terra.", []),
        ("Use claude-sonnet-5 instead of gpt-6.1-terra", ["claude-sonnet-5"]),
        ("The gpt-6.1-terra model is priced differently.", []),
        ("Use the --model flag to choose.", []),
    ],
)
def test_instruction_requests(text, expected):
    assert [v for v, _n in instruction_requests(text)] == expected


# ─── model.pin-conflicts-request ──────────────────────────────────


def test_agent_frontmatter_conflict_shows_both_sides_with_lines(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    path = agent(project, "flow", "model: gpt-6.1-terra")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.pin-conflicts-request")
    assert len(hit) == 1 and hit[0].severity == "high"
    assert hit[0].path == str(path) and hit[0].line == 3
    assert "gpt-6.1-terra" in hit[0].snippet and "claude-sonnet-5" in hit[0].snippet
    assert f"{home / 'settings.json'}:2" in hit[0].snippet


def test_agreeing_pin_is_info_not_high(world):
    home, project, env = world
    settings(home, model="gpt-6.1-terra")
    agent(project, "flow", "model:\n  - gpt-6.1-terra")
    write(project / "AGENTS.md", "Use model gpt-6.1-terra for this flow.\n")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.pin-conflicts-request")
    assert {f.severity for f in rules(findings, "model.pin-agrees")} == {"info"}
    assert len(rules(findings, "model.pin-agrees")) == 2


def test_list_agrees_when_any_entry_matches(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    agent(project, "flow", "model: [gpt-6.1-terra, claude-sonnet-5]")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.pin-conflicts-request")


def test_auto_is_not_a_pin(world):
    home, project, env = world
    settings(home, model="auto")
    agent(project, "flow", "model: gpt-6.1-terra")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.pin-conflicts-request")
    assert not rules(findings, "model.outside-project")


def test_instruction_conflict(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    write(project / "AGENTS.md", "# Flow\n\nUse model gpt-6.1-terra for every step.\n")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.pin-conflicts-request")
    assert [(f.line, f.severity) for f in hit] == [(3, "high")]


def test_flag_conflicts_with_instruction(world):
    _home, project, env = world
    write(project / "AGENTS.md", "Use model gpt-6.1-terra.\n")
    _eff, findings = model_findings(project, env=env, ps_output="9 copilot --model claude-sonnet-5", tools=("copilot-cli",))
    assert rules(findings, "model.pin-conflicts-request")
    assert not rules(findings, "model.outside-project")


def test_repo_and_user_pins_that_differ_conflict(world):
    home, project, env = world
    settings(home, model="claude-sonnet-5")
    write(project / ".github/copilot/settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.pin-conflicts-request")
    assert hit and "not confirmed" not in hit[0].why


def test_repo_and_user_pins_that_agree_do_not_conflict(world):
    home, project, env = world
    settings(home, model="gpt-6.1-terra")
    write(project / ".github/copilot/settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.pin-conflicts-request")


def test_subagent_pin_conflicts_with_same_named_agent_only(world):
    home, project, env = world
    settings(home, subagents={"agents": {"builder": {"model": "claude-sonnet-5"}}})
    agent(project, "builder", "model: gpt-6.1-terra")
    agent(project, "other", "model: gpt-6.1-terra")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.pin-conflicts-request")
    assert [Path(f.path).name for f in hit] == ["builder.agent.md"]


def test_subagent_request_in_session_conflicts_with_pin(world):
    home, project, env = world
    settings(home, subagents={"agents": {"builder": {"model": "claude-sonnet-5"}}})
    session_log(home, "s1", project, [{"type": "tool.execution_start", "data": {"toolCallId": "c1", "toolName": "task", "arguments": {"model": "gpt-6.1-terra", "prompt": "SECRET PROMPT"}}}, {"type": "subagent.started", "data": {"toolCallId": "c1", "agentName": "builder", "model": "claude-sonnet-5"}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.pin-conflicts-request")
    assert hit and hit[0].session_id == "s1"
    assert "SECRET" not in json.dumps([f.snippet for f in findings])
    assert rules(findings, "model.ran-differently")


# ─── model.request-failed ─────────────────────────────────────────


@pytest.mark.parametrize(
    ("message", "category"),
    [
        ('Model "gpt-x" is not available.', "not-available"),
        ("No model available. Check policy enablement under GitHub Settings > Copilot", "not-allowed"),
        ('agent.md: model "gpt-x" is not available; will use current model instead', "not-available"),
        ("The requested model is not supported", "unsupported"),
        ("Model '/models/local-model-7bit' not found ", "not-available"),
        ("Image input is not supported by the current model.", ""),
        ("Rate limit reached for this model", ""),
        ("Network is not available", ""),
    ],
)
def test_error_classification(message, category):
    assert classify_model_error(message) == category


def test_request_failed_reports_id_model_and_category_only(world):
    home, project, env = world
    session_log(home, "s1", project, [{"type": "session.error", "data": {"errorType": "query", "statusCode": 400, "message": 'Model "gpt-x" is not available. PROMPT TEXT'}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.request-failed")
    assert len(hit) == 1 and hit[0].severity == "high" and hit[0].session_id == "s1"
    assert "gpt-x" in hit[0].snippet and "not-available" in hit[0].snippet
    assert "PROMPT" not in hit[0].snippet


def test_prompt_text_about_a_model_error_is_not_an_error(world):
    home, project, env = world
    session_log(home, "s1", project, [{"type": "user.message", "data": {"content": 'why is model "x" not available', "message": 'model "x" is not available'}}, {"type": "assistant.message", "data": {"model": "gpt-6.1-terra", "content": 'model "x" is not available'}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.request-failed")


def test_session_in_another_project_is_not_reported(world, tmp_path):
    home, project, env = world
    session_log(home, "s1", tmp_path / "elsewhere", [{"type": "session.error", "data": {"errorType": "query", "message": 'Model "x" is not available.'}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.request-failed")


# ─── model.ran-differently ────────────────────────────────────────


def test_ran_differently_when_replies_differ(world):
    home, project, env = world
    session_log(home, "s1", project, [{"type": "assistant.message", "data": {"model": "gpt-5-mini"}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.ran-differently")
    assert len(hit) == 1 and hit[0].severity == "medium"
    assert "requested gpt-6.1-terra, ran gpt-5-mini" in hit[0].snippet


def test_a_switch_explains_the_difference(world):
    home, project, env = world
    session_log(home, "s1", project, [{"type": "session.model_change", "data": {"previousModel": "gpt-6.1-terra", "newModel": "gpt-5-mini", "cause": "user"}}, {"type": "assistant.message", "data": {"model": "gpt-5-mini"}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.ran-differently")


def test_an_automatic_switch_is_reported(world):
    home, project, env = world
    session_log(home, "s1", project, [{"type": "session.model_change", "data": {"previousModel": "gpt-6.1-terra", "newModel": "gpt-5-mini", "cause": "rate_limit_fallback"}}, {"type": "assistant.message", "data": {"model": "gpt-5-mini"}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert "rate_limit_fallback" in rules(findings, "model.ran-differently")[0].snippet


def test_same_model_and_subagent_replies_do_not_count(world):
    home, project, env = world
    session_log(home, "s1", project, [{"type": "assistant.message", "data": {"model": "gpt-6.1-terra"}}, {"type": "assistant.message", "data": {"model": "claude-sonnet-5", "parentToolCallId": "c1"}}])
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.ran-differently")


def test_session_reader_bounds_oversized_lines(world):
    home, project, _env = world
    events = session_log(home, "s1", project, [{"type": "assistant.message", "data": {"model": "x", "content": "y" * 300_000}}])
    assert read_session(events).mismatches == {}


# ─── model.outside-project and model.unrecognized ─────────────────


def test_outside_project_pin_is_medium(world):
    home, project, env = world
    settings(home, model="gpt-6.1-terra")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.outside-project")
    assert [f.severity for f in hit] == ["medium"]
    assert "Not in this project, still in effect" in hit[0].why


def test_variable_in_this_shell_is_low_and_says_where_it_is(world):
    _home, project, env = world
    _eff, findings = model_findings(project, env={**env, "COPILOT_MODEL": "gpt-6.1-terra"}, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.outside-project")
    assert [(f.severity, f.path) for f in hit] == [("low", "env:COPILOT_MODEL")]


def test_variable_set_by_a_shell_profile_is_medium(world, monkeypatch):
    _home, project, env = world
    monkeypatch.setattr("aictl.effective_config._persistent_env", lambda _f: {"/profile.ps1": {"COPILOT_MODEL": "gpt-6.1-terra", "OTHER": "x"}})
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert [(f.severity, f.path) for f in rules(findings, "model.outside-project")] == [("medium", "/profile.ps1")]


def test_pin_in_project_is_not_outside_project(world):
    _home, project, env = world
    write(project / ".github/copilot/settings.json", json.dumps({"model": "gpt-6.1-terra"}))
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.outside-project")


def test_many_subagent_pins_read_as_one_finding(world):
    home, project, env = world
    settings(home, subagents={"agents": {f"a{i}": {"model": "claude-sonnet-5"} for i in range(13)}})
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.outside-project")
    assert len(hit) == 1 and hit[0].count == 13


def test_unrecognized_wording_never_says_retired(world):
    home, project, env = world
    settings(home, model="made-up-model-9")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    hit = rules(findings, "model.unrecognized")
    assert len(hit) == 1 and hit[0].severity == "medium"
    assert "not in aictl's table" in hit[0].why
    assert "retired" not in hit[0].why.lower()


def test_known_model_is_not_unrecognized(world):
    home, project, env = world
    settings(home, model="gpt-6.1-terra")
    agent(project, "flow", "model: Claude Sonnet 5 (200K context)")
    _eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-cli",))
    assert not rules(findings, "model.unrecognized")


# ─── VS Code ──────────────────────────────────────────────────────


def _vscode_user(tmp_path, monkeypatch) -> Path:
    tree = tmp_path / "Code" / "User"
    tree.mkdir(parents=True)
    monkeypatch.setattr("aictl.effective_config.vscode_user_dir", lambda: tree)
    monkeypatch.setattr("aictl.effective_config.vscode_insiders_user_dir", lambda: tmp_path / "none")
    return tree


def test_vscode_display_name_setting_is_surfaced_outside_project(world, tmp_path, monkeypatch):
    _home, project, env = world
    tree = _vscode_user(tmp_path, monkeypatch)
    write(tree / "settings.json", json.dumps({"chat.planAgent.defaultModel": "Claude Opus 4.1 (200K context)(Preview)", "editor.fontSize": 12}))
    write(tree / "profiles" / "abc" / "settings.json", json.dumps({"inlineChat.defaultModel": "made up model 9 (copilot)"}))
    eff, findings = model_findings(project, env=env, ps_output="", tools=("copilot-vscode",))
    rows = {r["setting"]: r for r in eff["copilot-vscode"]["limited"]}
    assert rows["chat.planAgent.defaultModel"]["in_project"] is False
    assert rows["inlineChat.defaultModel"]["applies"] == "profile:abc"
    assert "editor.fontSize" not in rows
    outside = rules(findings, "model.outside-project")
    assert any("chat.planAgent.defaultModel" in f.snippet for f in outside)
    assert [f.path for f in rules(findings, "model.unrecognized")] == [str(tree / "profiles" / "abc" / "settings.json")]


def test_vscode_reads_prompt_and_claude_format_frontmatter(world, tmp_path, monkeypatch):
    _home, project, env = world
    tree = _vscode_user(tmp_path, monkeypatch)
    write(project / ".github/prompts/a.prompt.md", "---\nmodel: gpt-6.1-terra\n---\n")
    write(project / ".claude/agents/b.md", "---\nmodel: sonnet\n---\n")
    write(tree / "globalStorage/github.copilot-chat/x-agent/c.agent.md", "---\nmodel: 'claude-sonnet-5'\n---\n")
    eff = effective_model(project, "copilot-vscode", env=env, ps_output="")
    assert sorted(r["value"] for r in eff["limited"]) == ["claude-sonnet-5", "gpt-6.1-terra", "sonnet"]
    assert "model picker" in " ".join(eff["unverified"])
    assert eff["value"] == ""


def test_cli_does_not_read_vscode_only_locations(world):
    _home, project, env = world
    write(project / ".github/prompts/a.prompt.md", "---\nmodel: gpt-6.1-terra\n---\n")
    assert effective_model(project, "copilot-cli", env=env, ps_output="")["limited"] == []


def test_live_view_names_the_pin_its_file_and_a_conflict(world, monkeypatch):
    from aictl.effective_config import annotate_models
    from aictl.observe.render import ASCII, build_nodes, flatten

    home, project, env = world
    settings(home, model="model-a")
    agent(project, "worker", "model: model-b")
    monkeypatch.chdir(project)
    empty = {"sessions": [], "unattributed_processes": [], "notes": [], "rss_bytes": 0, "state": "running"}
    doc = {
        "notes": [],
        "tools": [
            {"tool": "copilot-cli", "label": "CLI", **empty},
            {"tool": "claude-code", "label": "Other", **empty},
        ],
    }
    annotate_models(doc, env=env)
    pin = doc["tools"][0]["model_in_force"]
    assert pin["value"] == "model-a" and pin["line"] > 0 and pin["in_project"] is False
    assert "model_in_force" not in doc["tools"][1]
    text = "\n".join(line for line, _ in flatten(build_nodes(doc), ASCII))
    assert f"model pinned model-a  {home / 'settings.json'}:" in text
    assert "not in this project, still in effect" in text
    assert "CONFLICT model-b requested at" in text


def test_vscode_setting_pin_says_what_it_is_limited_to(world, tmp_path, monkeypatch):
    home, project, env = world
    write(project / ".vscode" / "settings.json", json.dumps({"inlineChat.defaultModel": "Some Model (copilot)"}))
    rows = effective_model(project, "copilot-vscode", env=env)["limited"]
    assert [r["applies"] for r in rows if r["setting"] == "inlineChat.defaultModel"] == ["inlineChat"]
