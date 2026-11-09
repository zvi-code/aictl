# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for the agents section, scope layers, locked rows, every-key reading and the settings catalog."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.effective_config import frontmatter_fields
from aictl.monitoring import tool_config as tc
from aictl.monitoring.tool_config import ToolConfig, normalize_sections

AGENT_FIELDS = {
    "name",
    "description",
    "model",
    "model_policy",
    "effort",
    "context_tier",
    "tools",
    "target",
    "defined_in",
    "defined_line",
    "pinned_in",
    "pinned_line",
    "inherits",
    "scope_defined",
    "scope_pinned",
}
SCOPE_FIELDS = {"id", "label", "path", "exists", "changeable", "note"}


@pytest.fixture()
def env(tmp_path, monkeypatch):
    """Every tool home, managed file and the catalog pointed at temp paths; returns them."""
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("USERPROFILE", str(home))
    for var in (
        "ANTHROPIC_MODEL",
        "CLAUDE_CODE_ENABLE_TELEMETRY",
        "CLAUDE_CODE_SUBAGENT_MODEL",
        "COPILOT_MODEL",
        "COPILOT_OTEL_ENABLED",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
    ):
        monkeypatch.delenv(var, raising=False)
    paths: dict[str, Path] = {}
    for name in (
        "claude_global_dir",
        "codex_global_dir",
        "copilot_global_dir",
        "cursor_user_dir",
        "vscode_user_dir",
        "windsurf_global_dir",
        "gemini_global_dir",
    ):
        d = tmp_path / name
        d.mkdir()
        paths[name] = d
        monkeypatch.setattr(f"aictl.monitoring.tool_config.{name}", lambda d=d: d, raising=False)
        monkeypatch.setattr(f"aictl.platforms.{name}", lambda d=d: d)
    monkeypatch.setattr("aictl.monitoring.tool_config.claude_desktop_config", lambda: tmp_path / "desktop.json")
    monkeypatch.setattr("aictl.monitoring.tool_config._macos_login_items", lambda: set())
    monkeypatch.setattr("aictl.monitoring.tool_config.shutil.which", lambda _name: None)
    fixed = tmp_path / "fixed"
    fixed.mkdir()
    for name in (
        "COPILOT_MANAGED_FILES",
        "CLAUDE_MANAGED_FILES",
        "CLAUDE_MANAGED_DIRS",
        "CODEX_SYSTEM_FILES",
        "CODEX_REQUIREMENTS_FILES",
        "VSCODE_POLICY_FILES",
    ):
        monkeypatch.setattr(tc, name, [fixed / name.lower()])
        paths[name] = fixed / name.lower()
    paths["catalog"] = tmp_path / "settings-catalog.yaml"
    monkeypatch.setattr(tc, "SETTINGS_CATALOG_PATH", paths["catalog"])
    proj = tmp_path / "proj"
    proj.mkdir()
    paths["proj"] = proj
    return paths


def _collect(proj: Path) -> dict[str, ToolConfig]:
    return {c.tool: c for c in tc.collect_tool_configs(proj)}


def _rows(cfg: ToolConfig, section: str | None = None) -> dict[str, dict]:
    return {r["key"]: r for s in cfg.sections if section in (None, s["id"]) for r in s["rows"]}


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


# ─── Agents ─────────────────────────────────────────────────────


def test_copilot_agents_pin_file_policy(env):
    home, proj = env["copilot_global_dir"], env["proj"]
    settings = _write(
        home / "settings.json",
        json.dumps(
            {
                "model": "gpt-5",
                "subagents": {
                    "agents": {
                        "strict": {"model": "pinned-a"},
                        "loose": {"model": "pinned-b", "effortLevel": "high", "contextTier": "long"},
                        "orphan": {"model": "pinned-c"},
                    }
                },
            },
            indent=2,
        ),
    )
    strict = _write(
        proj / ".github" / "agents" / "strict.agent.md",
        "---\nname: strict\ndescription: Strict one\nmodel: file-a\nmodel-policy: required\ntools: read, edit\n---\nbody\n",
    )
    loose = _write(
        home / "agents" / "loose.agent.md",
        "---\nname: loose\nmodel: [file-b, file-c]\nreasoningEffort: low\ntools:\n  - read\n---\n",
    )
    _write(proj / ".claude" / "agents" / "plain.md", "---\ndescription: Nothing set\n---\n")
    cfg = _collect(proj)["copilot-cli"]
    rows = _rows(cfg, "agents")
    assert set(rows) == {"agent/strict", "agent/loose", "agent/orphan", "agent/plain"}
    for row in rows.values():
        assert row["kind"] == "agent" and set(row["agent"]) == AGENT_FIELDS

    s = rows["agent/strict"]
    assert s["value"] == "file-a" and s["scope"] == "project" and s["source"] == str(strict)
    assert [e["value"] for e in s["chain"]] == ["file-a", "pinned-a"] and s["wins"] == 0
    assert s["agent"]["model_policy"] == "required" and s["agent"]["tools"] == ["read", "edit"]
    assert s["agent"]["defined_line"] == 4 and s["agent"]["pinned_in"] == str(settings)
    assert "required" in s["note"]

    lo = rows["agent/loose"]
    assert lo["value"] == "pinned-b" and lo["scope"] == "user" and lo["source"] == str(settings)
    assert [e["source"] for e in lo["chain"]] == [str(loose), str(settings)] and lo["wins"] == 1
    assert lo["agent"]["effort"] == "high" and lo["agent"]["context_tier"] == "long"
    pin_line = next(i for i, ln in enumerate(settings.read_text().splitlines(), 1) if '"pinned-b"' in ln)
    assert lo["agent"]["pinned_line"] == pin_line and lo["line"] == pin_line

    orphan = rows["agent/orphan"]
    assert (
        orphan["value"] == "pinned-c" and orphan["agent"]["defined_in"] == "" and orphan["agent"]["defined_line"] == 0
    )

    plain = rows["agent/plain"]
    assert plain["value"] == "inherits" and plain["agent"]["inherits"] is True
    assert "gpt-5" in plain["note"] and plain["agent"]["description"] == "Nothing set"


def test_claude_agent_alias_effort_and_env_fallback(env, monkeypatch):
    monkeypatch.setenv("CLAUDE_CODE_SUBAGENT_MODEL", "haiku")
    user_dir, proj = env["claude_global_dir"], env["proj"]
    _write(user_dir / "settings.json", json.dumps({"model": "opus"}))
    rev = _write(
        proj / ".claude" / "agents" / "reviewer.md",
        "---\nname: reviewer\nmodel: sonnet\neffort: high\ntools: Read, Grep\n---\n",
    )
    _write(user_dir / "agents" / "helper.md", "---\nname: helper\n---\n")
    _write(user_dir / "agents" / "inheritor.md", "---\nname: inheritor\nmodel: inherit\n---\n")
    rows = _rows(_collect(proj)["claude-code"], "agents")
    r = rows["agent/reviewer"]
    assert r["value"] == "sonnet" and r["scope"] == "project" and r["source"] == str(rev) and r["line"] == 3
    assert r["agent"]["effort"] == "high" and r["agent"]["tools"] == ["Read", "Grep"]
    helper = rows["agent/helper"]
    assert helper["value"] == "haiku" and helper["scope"] == "env" and helper["chain"][0]["scope"] == "env"
    assert helper["source"] == helper["chain"][0]["source"] == "env:CLAUDE_CODE_SUBAGENT_MODEL"
    inheritor = rows["agent/inheritor"]
    assert inheritor["value"] == "inherits" and "opus" in inheritor["note"]


def test_codex_agent_inherits_and_subagent_defaults(env):
    home, proj = env["codex_global_dir"], env["proj"]
    _write(
        home / "config.toml",
        'model = "gpt-5"\n\n[agents]\ndefault_subagent_model = "gpt-5-mini"\ndefault_subagent_reasoning_effort = "low"\n',
    )
    _write(home / "agents" / "explorer.toml", 'name = "explorer"\ndescription = "Looks around"\n')
    _write(home / "agents" / "pinned.toml", 'name = "pinned"\nmodel = "o4"\nmodel_reasoning_effort = "high"\n')
    cfg = _collect(proj)["codex-cli"]
    agents = _rows(cfg, "agents")
    assert agents["agent/explorer"]["value"] == "inherits" and "gpt-5-mini" in agents["agent/explorer"]["note"]
    assert agents["agent/pinned"]["value"] == "o4" and agents["agent/pinned"]["line"] == 2
    assert agents["agent/pinned"]["agent"]["effort"] == "high"
    model = _rows(cfg, "model")
    assert model["agents.default_subagent_model"]["label"] == "Subagent default model"
    assert model["agents.default_subagent_model"]["value"] == "gpt-5-mini"
    assert model["agents.default_subagent_model"]["line"] == 4
    assert model["agents.default_subagent_reasoning_effort"]["label"] == "Subagent default reasoning effort"


# ─── Scopes, chains and locked rows ─────────────────────────────


def test_copilot_project_local_overrides_project_and_user(env):
    home, proj = env["copilot_global_dir"], env["proj"]
    user = _write(home / "settings.json", json.dumps({"effortLevel": "low", "planModel": "u"}))
    committed = _write(proj / ".github" / "copilot" / "settings.json", '{\n  "effortLevel": "medium"\n}\n')
    local = _write(proj / ".github" / "copilot" / "settings.local.json", '{\n  // mine\n  "effortLevel": "high"\n}\n')
    cfg = _collect(proj)["copilot-cli"]
    row = _rows(cfg)["effortLevel"]
    assert row["value"] == "high" and row["scope"] == "project-local" and row["label"] == "Reasoning effort"
    assert [(e["scope"], e["value"], e["source"]) for e in row["chain"]] == [
        ("user", "low", str(user)),
        ("project", "medium", str(committed)),
        ("project-local", "high", str(local)),
    ]
    assert row["wins"] == 2 and row["line"] == 3
    keys = _rows(cfg)
    assert "effort" not in keys  # the earlier flat row does not repeat the labelled one
    assert cfg.settings["effort"] == "low"  # but stays in settings


def test_copilot_managed_floor_is_locked(env):
    home, proj = env["copilot_global_dir"], env["proj"]
    managed = _write(
        env["COPILOT_MANAGED_FILES"],
        json.dumps({"sandbox": {"allowBypass": False}, "model": "corp-model", "logLevel": "error"}),
    )
    _write(home / "settings.json", json.dumps({"sandbox": {"allowBypass": True}, "model": "mine"}))
    cfg = _collect(proj)["copilot-cli"]
    rows = _rows(cfg)
    bypass = rows["sandbox.allowBypass"]
    assert bypass["value"] is False and bypass["locked"] is True and bypass["scope"] == "managed"
    assert [e["scope"] for e in bypass["chain"]] == ["user", "managed"] and bypass["danger"] is False
    model = rows["model"]  # a managed baseline the user overrides
    assert model["value"] == "mine" and model["locked"] is False
    assert [e["scope"] for e in model["chain"]] == ["managed", "user"]
    log = rows["logLevel"]  # a managed baseline nobody overrides: still not locked
    assert log["value"] == "error" and log["scope"] == "managed" and log["locked"] is False
    scopes = {s["id"]: s for s in cfg.to_dict()["scopes"]}
    assert scopes["managed"]["exists"] is True and scopes["managed"]["changeable"] is False
    assert scopes["managed"]["path"] == str(managed)


def test_managed_symlink_is_ignored(env, tmp_path):
    real = _write(tmp_path / "elsewhere.json", json.dumps({"logLevel": "x"}))
    env["COPILOT_MANAGED_FILES"].symlink_to(real)
    _write(env["copilot_global_dir"] / "settings.json", "{}")
    cfg = _collect(env["proj"])["copilot-cli"]
    assert "logLevel" not in cfg.settings
    assert next(s for s in cfg.scopes if s["id"] == "managed")["exists"] is False


def test_codex_requirements_key_is_locked(env):
    home, proj = env["codex_global_dir"], env["proj"]
    _write(home / "config.toml", 'model = "gpt-5"\napproval_policy = "never"\n')
    req = _write(
        env["CODEX_REQUIREMENTS_FILES"], 'approval_policy = "on-request"\nallowed_sandbox_modes = ["read-only"]\n'
    )
    cfg = _collect(proj)["codex-cli"]
    rows = _rows(cfg)
    approval = rows["approval_policy"]
    assert approval["value"] == "on-request" and approval["locked"] is True and approval["source"] == str(req)
    assert [e["scope"] for e in approval["chain"]] == ["user", "managed"]
    assert rows["allowed_sandbox_modes"]["locked"] is True
    assert rows["model"]["locked"] is False


def test_codex_project_file_read_only_when_trusted(env):
    home, proj = env["codex_global_dir"], env["proj"]
    _write(proj / ".codex" / "config.toml", 'model = "project-model"\n')
    _write(home / "config.toml", 'model = "gpt-5"\n')
    cfg = _collect(proj)["codex-cli"]
    assert cfg.model == "gpt-5"
    assert "not trusted" in next(s for s in cfg.scopes if s["id"] == "project")["note"]
    _write(home / "config.toml", f'model = "gpt-5"\n\n[projects."{proj}"]\ntrust_level = "trusted"\n')
    cfg = _collect(proj)["codex-cli"]
    assert cfg.model == "project-model"
    assert [e["scope"] for e in _rows(cfg)["model"]["chain"]] == ["user", "project"]


def test_scopes_are_emitted_in_order(env, monkeypatch):
    monkeypatch.setenv("COPILOT_MODEL", "env-model")
    _write(env["copilot_global_dir"] / "settings.json", '{"model": "file-model"}')
    _write(env["claude_global_dir"] / "settings.json", '{"model": "opus"}')
    _write(env["codex_global_dir"] / "config.toml", 'model = "m"\n')
    configs = _collect(env["proj"])
    for tool, expected in (
        ("copilot-cli", ["managed", "user", "project", "project-local", "env"]),
        ("claude-code", ["user", "project", "project-local", "env", "managed"]),
        ("codex-cli", ["system", "user", "profile", "project", "env", "managed"]),
    ):
        scopes = configs[tool].to_dict()["scopes"]
        assert [s["id"] for s in scopes] == expected, tool
        assert all(set(s) == SCOPE_FIELDS | ({"vars"} if s["id"] == "env" else set()) for s in scopes)
        assert all(s["changeable"] is (s["id"] not in ("managed", "system")) for s in scopes)
    copilot = {s["id"]: s for s in configs["copilot-cli"].scopes}
    assert copilot["user"]["exists"] is True and copilot["project"]["exists"] is False
    assert copilot["env"]["exists"] is True and "COPILOT_MODEL" in copilot["env"]["note"]
    # The Environment layer has no file: it names the variables that are set, never a path.
    assert copilot["env"]["path"] == "" and "COPILOT_MODEL" in copilot["env"]["vars"]
    model = _rows(configs["copilot-cli"])["model"]
    assert model["value"] == "env-model" and model["scope"] == "env"
    assert model["source"] == "env:COPILOT_MODEL"
    assert [(c["scope"], c["value"], c["source"]) for c in model["chain"]] == [
        ("user", "file-model", str(env["copilot_global_dir"] / "settings.json")),
        ("env", "env-model", "env:COPILOT_MODEL"),
    ]
    vscode_scopes = [s["id"] for s in configs["copilot"].scopes] if "copilot" in configs else []
    if vscode_scopes:
        assert vscode_scopes == ["user", "workspace", "env", "policy"]


@pytest.mark.parametrize(
    ("source", "scope"),
    [
        ("/work/proj/.claude/settings.local.json", "project-local"),
        ("/work/proj/.github/copilot/settings.local.json", "project-local"),
        ("/home/me/.codex/fast.config.toml", "profile"),
        ("/etc/codex/config.toml", "system"),
        ("/etc/codex/requirements.toml", "managed"),
        ("/etc/vscode/policy.json", "policy"),
        ("C:\\ProgramData\\OpenAI\\Codex\\requirements.toml", "managed"),
        ("C:\\ProgramData\\Other\\config.toml", "system"),
        ("/Library/Application Support/GitHubCopilot/managed-settings.json", "managed"),
    ],
)
def test_setting_scope_new_layers(source, scope):
    assert tc.setting_scope(source, "/work/proj") == scope


# ─── Copilot files read narrowly ────────────────────────────────


def test_config_json_with_comments_read_for_trusted_folders_only(env):
    home = env["copilot_global_dir"]
    _write(home / "settings.json", "{}")
    _write(
        home / "config.json",
        '// Written by Copilot\n{\n  // folders\n  "trustedFolders": ["/a", "/b"],\n'
        '  "last_logged_in_user": {"login": "SOMEONE-MARKER"},\n  "staff": true\n}\n',
    )
    _write(home / "mcp-oauth-config.json", '{"x": "OAUTH-MARKER"}')
    _write(home / "permissions-config.json", json.dumps({"locations": {"/p": {"tool_approvals": [{}, {}, {}]}}}))
    cfg = _collect(env["proj"])["copilot-cli"]
    rows = _rows(cfg)
    trusted = rows["trustedFolders"]
    assert trusted["value"] == ["/a", "/b"] and trusted["scope"] == "user" and trusted["label"] == "Trusted folders"
    assert "edit with the tool" in trusted["note"]
    assert rows["savedToolApprovals"]["value"] == {"/p": 3}
    dumped = json.dumps(cfg.to_dict())
    assert "SOMEONE-MARKER" not in dumped and "staff" not in cfg.settings and "OAUTH-MARKER" not in dumped


def test_credential_named_keys_and_hook_commands_are_skipped(env):
    _write(
        env["copilot_global_dir"] / "settings.json",
        json.dumps(
            {
                "githubToken": "TOKEN-MARKER",
                "proxy": {"password": "PW-MARKER", "host": "h"},
                "hooks": {"preToolUse": [{"command": "HOOK-MARKER"}]},
            }
        ),
    )
    cfg = _collect(env["proj"])["copilot-cli"]
    rows = _rows(cfg)
    dumped = json.dumps(cfg.to_dict())
    assert "TOKEN-MARKER" not in dumped and "PW-MARKER" not in dumped and "HOOK-MARKER" not in dumped
    assert "githubToken" not in rows and rows["proxy.host"]["value"] == "h"
    assert rows["hooks"]["value"] == "configured" and rows["hooks"]["label"] == "Hooks"


def test_copilot_labelled_rows_and_danger(env):
    _write(
        env["copilot_global_dir"] / "settings.json",
        json.dumps(
            {
                "defaultMode": "autopilot",
                "defaultPermissionMode": "allow-all",
                "enabledPlugins": {"a@m": True, "b@m": False},
                "extraKnownMarketplaces": {"m1": {"source": "x"}},
                "footer": {"showModel": True, "showAgent": False},
                "disabledMcpServers": ["s1"],
                "subagents": {"maxDepth": 2},
            }
        ),
    )
    cfg = _collect(env["proj"])["copilot-cli"]
    rows = _rows(cfg)
    assert rows["defaultMode"]["danger"] and rows["defaultPermissionMode"]["danger"]
    assert rows["enabledPlugins"]["value"] == ["a@m"] and rows["enabledPlugins"]["label"] == "Enabled plugins"
    assert "extensions" not in rows and cfg.extensions == ["a@m"]
    assert rows["extraKnownMarketplaces"]["value"] == ["m1"]
    assert rows["footer"]["kind"] == "map" and rows["footer"]["label"] == "Footer"
    assert "disabled_mcp_servers" not in rows and rows["disabledMcpServers"]["value"] == ["s1"]
    assert rows["subagents.maxDepth"]["label"] == "Max subagent depth"
    sections = {r["key"]: s["id"] for s in cfg.sections for r in s["rows"]}
    assert sections["subagents.maxDepth"] == "autonomy" and sections["footer"] == "other"
    assert sections["disabledMcpServers"] == "mcp" and sections["enabledPlugins"] == "extensions"


def test_vscode_agent_locations_and_new_model_keys(env):
    proj = env["proj"]
    extra = proj / "custom-agents"
    _write(extra / "x.agent.md", "---\nname: x\nmodel: gpt-5\n---\n")
    _write(proj / ".github" / "agents" / "y.agent.md", "---\nname: y\n---\n")
    _write(
        env["vscode_user_dir"] / "settings.json",
        json.dumps({"chat.agentFilesLocations": {"custom-agents": True}, "inlineChat.defaultModel": "m1"}),
    )
    cfg = _collect(proj)["copilot"]
    agents = _rows(cfg, "agents")
    assert agents["agent/x"]["value"] == "gpt-5" and agents["agent/y"]["value"] == "inherits"
    model = _rows(cfg, "model")
    assert (
        model["inlineChat.defaultModel"]["value"] == "m1" and model["inlineChat.defaultModel"]["label"] == "Inline chat"
    )
    for key in ("chat.utilityModel", "chat.utilitySmallModel", "chat.subagents.defaultToAuto"):
        assert key in model


# ─── Every key, flattening and the catalog ──────────────────────


def test_unknown_nested_key_flattens_with_generic_label(env):
    _write(
        env["claude_global_dir"] / "settings.json",
        json.dumps(
            {
                "someNewThing": {"innerFlag": True, "depth": {"level": 3}},
                "modelSettings": {"claude-x-1": {"effortLevel": "high"}},
            }
        ),
    )
    cfg = _collect(env["proj"])["claude-code"]
    rows = _rows(cfg)
    inner = rows["someNewThing.innerFlag"]
    assert inner["documented"] is False and inner["label"] == "Some new thing inner flag"
    assert inner["set"] is True and inner["kind"] == "flag"
    assert rows["someNewThing.depth.level"]["value"] == 3
    assert rows["modelSettings"]["kind"] == "map"  # keys are model ids, not setting names


def test_codex_auth_command_and_headers_are_not_read(env):
    _write(
        env["codex_global_dir"] / "config.toml",
        'model = "m"\n\n[model_providers.p]\nname = "P"\nhttp_headers = { X = "HDR-MARKER" }\n'
        '[model_providers.p.auth]\ncommand = "tool"\nargs = ["ARG-MARKER"]\n',
    )
    cfg = _collect(env["proj"])["codex-cli"]
    dumped = json.dumps(cfg.to_dict())
    assert "ARG-MARKER" not in dumped and "HDR-MARKER" not in dumped
    assert _rows(cfg)["model_providers.p.name"]["value"] == "P"


def test_large_object_is_one_map_row():
    data = {"big": {f"k{i}": i for i in range(tc.MAP_ROW_MAX_KEYS + 1)}, "small": {"a": 1}}
    flat = tc.flatten_settings(data)
    assert set(flat) == {"big", "small.a"}


def test_catalog_unset_rows_labels_and_danger(env):
    env["catalog"].write_text(
        "tools:\n"
        "  copilot-cli:\n"
        "    keys:\n"
        "      - key: beep\n"
        "        label: Beep\n"
        "        section: other\n"
        "        type: boolean\n"
        "        default: true\n"
        "        description: Beep when done.\n"
        "      - key: remoteExport\n"
        "        label: Remote export\n"
        "        section: telemetry\n"
        "        type: boolean\n"
        "        danger_when: true\n"
        "        note: Sessions are exported.\n"
        "      - key: neverSet\n"
        "        section: autonomy\n"
        "        type: list\n"
    )
    _write(env["copilot_global_dir"] / "settings.json", json.dumps({"remoteExport": True, "oddKey": 1}))
    cfg = _collect(env["proj"])["copilot-cli"]
    rows = _rows(cfg)
    beep = rows["beep"]
    assert beep["set"] is False and beep["scope"] == "default" and beep["source"] == "" and beep["value"] is True
    assert beep["documented"] is True and beep["note"] == "Beep when done." and beep["label"] == "Beep"
    assert rows["neverSet"]["value"] is None and rows["neverSet"]["kind"] == "list"
    remote = rows["remoteExport"]
    assert remote["set"] is True and remote["danger"] is True and remote["note"] == "Sessions are exported."
    assert remote["label"] == "Remote export" and remote["documented"] is True
    assert rows["oddKey"]["documented"] is False
    desktop = _collect(env["proj"]).get("copilot-desktop")
    if desktop:  # reads the same file, so the Copilot CLI catalog applies
        assert _rows(desktop)["remoteExport"]["documented"] is True


def test_catalog_missing_or_broken_is_empty(env):
    assert tc.settings_catalog("copilot-cli") == {}
    env["catalog"].write_text("tools: [unclosed\n")
    assert tc.settings_catalog("copilot-cli") == {}
    cfg = ToolConfig(tool="copilot-cli", settings={"a": 1})
    assert normalize_sections(cfg)[0]["rows"][0]["key"] == "a"


def test_frontmatter_fields_spellings_and_lines():
    text = "---\nname: a\nmodel-policy: required\nreasoningEffort: high\ntools:\n  - read\n  - edit\n---\nmodel: no\n"
    found = frontmatter_fields(text, ("name", "model", "model-policy", "reasoningEffort", "tools"))
    assert found == {
        "name": ("a", 2),
        "model-policy": ("required", 3),
        "reasoningEffort": ("high", 4),
        "tools": (["read", "edit"], 5),
    }
    assert frontmatter_fields("no frontmatter", ("name",)) == {}
