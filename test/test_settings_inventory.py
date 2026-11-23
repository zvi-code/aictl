# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Every declared MCP server and hook per tool, with its scope, file, plugin and state; secrets masked."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.monitoring import tool_config as tc

FAKE = "FAKEMCPSECRET0099value"


@pytest.fixture()
def homes(tmp_path, monkeypatch):
    home = tmp_path / "home"
    copilot = tmp_path / "copilot-home"
    claude = tmp_path / "claude-home"
    vscode = tmp_path / "vscode-user"
    project = tmp_path / "project"
    for d in (home, copilot, claude, vscode, project):
        d.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("COPILOT_HOME", str(copilot))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(claude))
    for name in ("COPILOT_MODEL", "ANTHROPIC_MODEL", "OTEL_EXPORTER_OTLP_ENDPOINT", "COPILOT_OTEL_ENABLED"):
        monkeypatch.delenv(name, raising=False)
    fixed = tmp_path / "fixed"
    for name in ("COPILOT_MANAGED_FILES", "CLAUDE_MANAGED_FILES", "CLAUDE_MANAGED_DIRS", "VSCODE_POLICY_FILES"):
        monkeypatch.setattr(tc, name, [fixed / name.lower() / "managed-settings.json"])
    monkeypatch.setattr(tc, "vscode_user_dir", lambda: vscode)
    monkeypatch.setattr(tc, "COPILOT_HOOK_POLICY_DIRS", [fixed / "policy.d"])
    monkeypatch.setattr(tc.shutil, "which", lambda _name: None)
    monkeypatch.setattr(tc, "_macos_login_items", lambda: set())
    return {"home": home, "copilot": copilot, "claude": claude, "vscode": vscode, "project": project, "fixed": fixed}


def _write(path: Path, data: object) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))
    return path


def _stdio(name: str) -> dict:
    return {"command": "npx", "args": [name, "--api-key", FAKE], "env": {"SERVICE_TOKEN": FAKE}}


def _by_name(inventory: list[dict]) -> dict[str, dict]:
    return {f"{e['scope']}:{e['name']}": e for e in inventory}


def test_claude_code_lists_every_scope_plugin_and_approval_state(homes):
    root, claude = homes["project"], homes["claude"]
    _write(claude / "settings.json", {"enabledPlugins": {"on@market": True, "off@market": False}})
    _write(root / ".claude" / "settings.local.json", {"enabledMcpjsonServers": ["proj-ok"], "disabledMcpjsonServers": ["proj-no"]})
    _write(
        claude / ".claude.json",
        {
            "mcpServers": {"user-srv": _stdio("user-srv")},
            "projects": {str(root): {"mcpServers": {"local-srv": _stdio("local-srv")}, "disabledMcpServers": ["user-srv"]}},
        },
    )
    _write(root / ".mcp.json", {"mcpServers": {"proj-ok": _stdio("a"), "proj-no": _stdio("b"), "proj-new": {
        "type": "http", "url": f"https://mcp.example.test/v1?token={FAKE}", "headers": {"Authorization": f"Bearer {FAKE}"}}}})
    plugins = claude / "plugins"
    on_dir, off_dir = tmp_plugin(plugins / "cache" / "on"), tmp_plugin(plugins / "cache" / "off")
    _write(on_dir / ".mcp.json", {"mcpServers": {"plug-on": _stdio("p1")}})
    _write(off_dir / ".mcp.json", {"mcpServers": {"plug-off": _stdio("p2")}})
    _write(plugins / "installed_plugins.json", {"version": 2, "plugins": {
        "on@market": [{"scope": "user", "installPath": str(on_dir)}],
        "off@market": [{"scope": "user", "installPath": str(off_dir)}],
    }})
    managed = homes["fixed"] / "claude_managed_files"
    _write(managed / "managed-mcp.json", {"mcpServers": {"corp-srv": {"url": "https://corp.example.test/mcp"}}})

    cfg = tc._parse_claude_code_config(root)
    inv = _by_name(cfg.mcp_inventory)
    assert inv["user:user-srv"]["state"] == "disabled"  # turned off for this project in ~/.claude.json
    assert inv["user:user-srv"]["source"] == str(claude / ".claude.json")
    assert inv["local:local-srv"]["state"] == "enabled"
    assert inv["project:proj-ok"]["state"] == "approved"
    assert inv["project:proj-ok"]["state_source"] == str(root / ".claude" / "settings.local.json")
    assert inv["project:proj-no"]["state"] == "rejected"
    assert inv["project:proj-new"]["state"] == "needs-approval" and inv["project:proj-new"]["transport"] == "http"
    assert inv["plugin:plug-on"]["plugin"] == "on@market" and inv["plugin:plug-on"]["state"] == "enabled"
    assert inv["plugin:plug-off"]["state"] == "plugin-disabled"
    assert inv["managed:corp-srv"]["source"] == str(managed / "managed-mcp.json")
    assert inv["user:user-srv"]["command"].startswith("npx user-srv --api-key")
    assert inv["user:user-srv"]["env_names"] == ["SERVICE_TOKEN"]
    assert inv["project:proj-new"]["header_names"] == ["Authorization"]
    assert FAKE not in json.dumps(cfg.to_dict())


def tmp_plugin(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def test_copilot_cli_reads_plugins_projects_and_honours_state(homes):
    root, copilot = homes["project"], homes["copilot"]
    _write(copilot / "settings.json", {"enabledPlugins": {"off-plugin@market": False}, "disabledMcpServers": ["user-off"]})
    _write(copilot / "mcp-config.json", {"mcpServers": {"user-on": _stdio("u1"), "user-off": _stdio("u2")}})
    installed = copilot / "installed-plugins"
    _write(installed / "market" / "on-plugin" / "mcp.json", {"$schema": "x", "mcpServers": {"from-mcp-json": _stdio("p")}})
    _write(installed / "market" / "off-plugin" / ".mcp.json", {"mcpServers": {"from-off": _stdio("q")}})
    _write(installed / "market" / "manifest-plugin" / ".github" / "plugin" / "plugin.json",
           {"name": "manifest-plugin", "mcpServers": {"inline-srv": {"url": "https://inline.example.test/mcp"}}})
    _write(installed / "_direct" / "src-id" / "plugin.json", {"name": "d", "mcpServers": "servers.json"})
    _write(installed / "_direct" / "src-id" / "servers.json", {"mcpServers": {"direct-srv": _stdio("d")}})
    _write(root / ".mcp.json", {"bare-srv": _stdio("bare")})  # project files may use the bare format
    _write(root / ".github" / "mcp.json", {"mcpServers": {"gh-srv": _stdio("gh")}})
    # Undocumented locations the old parser read are not MCP sources.
    _write(root / ".copilot" / "mcp-config.json", {"mcpServers": {"not-a-source": _stdio("x")}})

    for tool in ("copilot-cli",):
        cfg = tc._parse_copilot_home_config(root, tool=tool)
        inv = _by_name(cfg.mcp_inventory)
        assert inv["user:user-on"]["state"] == "enabled"
        assert inv["user:user-off"]["state"] == "disabled"
        assert inv["user:user-off"]["state_source"] == str(copilot / "settings.json")
        assert inv["plugin:from-mcp-json"]["plugin"] == "on-plugin@market"
        assert inv["plugin:from-off"]["state"] == "plugin-disabled"
        assert inv["plugin:inline-srv"]["transport"] == "http"
        assert inv["plugin:direct-srv"]["plugin"] == "src-id"
        assert inv["project:bare-srv"]["source"] == str(root / ".mcp.json")
        assert inv["project:gh-srv"]["source"] == str(root / ".github" / "mcp.json")
        assert not any(e["name"] == "not-a-source" for e in cfg.mcp_inventory)
        assert FAKE not in json.dumps(cfg.to_dict())


def test_vscode_mcp_comes_from_vscode_files_not_the_copilot_cli(homes):
    root, vscode = homes["project"], homes["vscode"]
    _write(vscode / "settings.json", {"github.copilot.enable": {"*": True}, "mcp": {"servers": {"settings-srv": _stdio("s")}}})
    _write(vscode / "mcp.json", {"servers": {"user-srv": _stdio("u")}})
    _write(root / ".vscode" / "mcp.json", {"servers": {"ws-srv": {"type": "sse", "url": "https://ws.example.test/sse"}}})
    _write(root / ".copilot" / "mcp-config.json", {"mcpServers": {"cli-only": _stdio("c")}})
    _write(root / ".copilot-mcp.json", {"mcpServers": {"cli-only-2": _stdio("c")}})
    cfg = tc._parse_copilot_config(root)
    inv = _by_name(cfg.mcp_inventory)
    assert set(inv) == {"user:settings-srv", "user:user-srv", "workspace:ws-srv"}
    assert inv["workspace:ws-srv"]["transport"] == "sse" and inv["user:user-srv"]["state"] == "declared"
    assert "cli-only" not in cfg.mcp_servers and "cli-only-2" not in cfg.mcp_servers
    assert FAKE not in json.dumps(cfg.to_dict())


def test_mcp_inventory_is_always_in_the_record(homes):
    cfg = tc.ToolConfig(tool="x")
    assert cfg.to_dict()["mcp_inventory"] == [] and cfg.to_dict()["hook_inventory"] == []


# ─── Hooks ─────────────────────────────────────────────────────────


def _claude_rule(command: str, matcher: str = "") -> dict:
    return {"matcher": matcher, "hooks": [{"type": "command", "command": command}]}


def test_claude_code_lists_user_project_and_plugin_hooks_masked(homes):
    root, claude = homes["project"], homes["claude"]
    _write(claude / "settings.json", {
        "enabledPlugins": {"hooky@market": True},
        "hooks": {
            "PreToolUse": [_claude_rule(f"guard --token {FAKE}", "Bash"), _claude_rule("lint.sh", "Edit|Write")],
            "Stop": [{"hooks": [{"type": "command", "command": "notify done"}],
                      "_aictl_owner": "aictl"}],
        },
    })
    _write(root / ".claude" / "settings.json", {"hooks": {"SessionStart": [_claude_rule("echo hello")]}})
    plugin = claude / "plugins" / "cache" / "hooky"
    _write(plugin / "hooks" / "hooks.json", {"hooks": {"PostToolUse": [_claude_rule("fmt.sh", "Write")]}})
    _write(claude / "plugins" / "installed_plugins.json", {"version": 2, "plugins": {
        "hooky@market": [{"scope": "user", "installPath": str(plugin)}]}})
    cfg = tc._parse_claude_code_config(root)
    hooks = cfg.hook_inventory
    by = {(h["event"], h["matcher"], h["scope"]): h for h in hooks}
    guard = by[("PreToolUse", "Bash", "user")]
    assert guard["command"].startswith("guard --token") and FAKE not in guard["command"]
    assert guard["source"] == str(claude / "settings.json") and guard["enabled"] is True and guard["aictl"] is False
    assert by[("PreToolUse", "Edit|Write", "user")]["command"] == "lint.sh"
    assert by[("SessionStart", "", "project")]["source"] == str(root / ".claude" / "settings.json")
    assert by[("PostToolUse", "Write", "plugin")]["plugin"] == "hooky@market"
    assert len({h["event"] for h in hooks}) == 4  # every event the files define, not only aictl's
    assert FAKE not in json.dumps(cfg.to_dict())


def test_copilot_cli_lists_hook_files_inline_hooks_and_plugin_hooks(homes):
    root, copilot = homes["project"], homes["copilot"]
    _write(copilot / "settings.json", {"hooks": {"sessionStart": [{"type": "command", "bash": "echo user"}]}})
    _write(copilot / "hooks" / "audit.json", {"version": 1, "hooks": {"preToolUse": [
        {"type": "command", "bash": f"audit --api-key {FAKE}", "powershell": "audit.ps1"}]}})
    _write(root / ".github" / "hooks" / "repo.json", {"version": 1, "hooks": {"postToolUse": [
        {"type": "http", "url": f"https://hooks.example.test/x?token={FAKE}"}]}})
    _write(root / ".claude" / "settings.json", {"hooks": {"PreToolUse": [_claude_rule("claude-format.sh", "Bash")]}})
    _write(copilot / "installed-plugins" / "market" / "p" / "hooks" / "hooks.json",
           {"hooks": {"UserPromptSubmit": [_claude_rule("plugin-hook.sh")]}})
    policy = homes["fixed"] / "policy.d"
    _write(policy / "corp.json", {"version": 1, "hooks": {"preToolUse": [{"type": "command", "bash": "corp-check"}]}})
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    by = {(h["event"], h["scope"]): h for h in cfg.hook_inventory}
    assert by[("sessionStart", "user")]["source"] == str(copilot / "settings.json")
    assert by[("preToolUse", "user")]["command"].startswith("audit --api-key")
    assert by[("postToolUse", "project")]["type"] == "http" and FAKE not in by[("postToolUse", "project")]["url"]
    assert by[("PreToolUse", "project")]["matcher"] == "Bash"  # the repository's .claude/settings.json is read too
    assert by[("UserPromptSubmit", "plugin")]["plugin"] == "p@market"
    assert by[("preToolUse", "policy")]["source"] == str(policy / "corp.json")
    assert FAKE not in json.dumps(cfg.to_dict())


def test_disable_all_hooks_marks_hooks_off(homes):
    root, copilot = homes["project"], homes["copilot"]
    _write(copilot / "settings.json", {"disableAllHooks": True})
    _write(copilot / "hooks" / "a.json", {"version": 1, "hooks": {"preToolUse": [{"bash": "x"}]}})
    cfg = tc._parse_copilot_home_config(root, tool="copilot-cli")
    assert [h["enabled"] for h in cfg.hook_inventory] == [False]
    assert "disableAllHooks" in cfg.hook_inventory[0]["note"]
