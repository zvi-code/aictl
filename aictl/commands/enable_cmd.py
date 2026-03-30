# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI command: aictl enable — enable all aictl integrations in one shot."""

from __future__ import annotations

import json
import os
import platform
from pathlib import Path

import click

from .hooks import _build_hook_config, _is_aictl_hook, HOOK_EVENTS
from .otel import _build_env_block, _shell_profiles
from ..platforms import claude_global_dir, vscode_user_dir


# VS Code settings that unlock the full agent + hooks + context experience.
# Keys are written to VS Code user settings.json (or workspace .vscode/settings.json).
_VSCODE_AGENT_SETTINGS: dict[str, object] = {
    # Agents
    "chat.agent.enabled": True,
    # Hooks
    "chat.useHooks": True,
    "chat.useClaudeHooks": True,
    "chat.useCustomAgentHooks": True,
    # Hook discovery locations
    "chat.hookFilesLocations": {
        ".github/hooks": True,
        ".claude/settings.json": True,
    },
    # Instructions & context files
    "chat.useAgentsMdFile": True,
    "chat.includeApplyingInstructions": True,
    "chat.useNestedAgentsMdFiles": True,
    "chat.useCustomizationsInParentRepositories": True,
    # MCP
    "chat.mcp.discovery.enabled": True,
    "chat.mcp.autoStart": True,
}


def _default_port() -> int:
    try:
        return int(os.environ.get("AICTL_PORT", "8484"))
    except ValueError:
        return 8484


def _write_json_settings(path: Path, updates: dict) -> str:
    """Merge updates into an existing JSON settings file. Returns status string."""
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = {}
        status = "updated"
    else:
        existing = {}
        path.parent.mkdir(parents=True, exist_ok=True)
        status = "created"
    existing.update(updates)
    path.write_text(json.dumps(existing, indent=4) + "\n", encoding="utf-8")
    return status


def _install_hooks(scope: str, port: int, actions: list[str]) -> None:
    """Install Claude Code hooks and report actions."""
    if scope == "project":
        settings_path = Path.cwd() / ".claude" / "settings.local.json"
    else:
        settings_path = claude_global_dir() / "settings.json"

    settings_path.parent.mkdir(parents=True, exist_ok=True)

    existing: dict = {}
    if settings_path.exists():
        try:
            existing = json.loads(settings_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass

    hook_config = _build_hook_config(port, None)
    existing_hooks = existing.get("hooks", {})
    for event, new_rules in hook_config.items():
        current = [h for h in existing_hooks.get(event, []) if not _is_aictl_hook(h)]
        current.extend(new_rules)
        existing_hooks[event] = current
    existing["hooks"] = existing_hooks

    settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    actions.append(f"Claude Code hooks ({len(HOOK_EVENTS)} events) → {settings_path}")


def _enable_otel(port: int, actions: list[str]) -> None:
    """Enable OTel for all tools and report actions."""
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex"]
    env_block = _build_env_block(port, tools)
    is_windows = platform.system() == "Windows"
    is_macos = platform.system() == "Darwin"

    if is_windows:
        for key, val in env_block.items():
            os.system(f'setx {key} "{val}" >nul 2>&1')
            os.environ[key] = val
        actions.append(f"OTel env vars → Windows user environment ({len(env_block)} vars via setx)")
        actions.append("  Note: new terminals will inherit; current session updated")
    else:
        marker = "# ── aictl: OTel for AI tools ──"
        lines = [marker, f"export AICTL_PORT={port}"]
        for key, val in env_block.items():
            if key == "AICTL_PORT":
                continue
            val_out = val.replace(f":{port}", ":${AICTL_PORT}")
            lines.append(f'export {key}="{val_out}"')
        block = "\n".join(lines) + "\n"

        for profile in _shell_profiles():
            if profile.exists():
                content = profile.read_text()
                if marker in content:
                    before = content.split(marker)[0].rstrip()
                    after_lines = content.split(marker, 1)[1].split("\n")
                    rest, past_block = [], False
                    for line in after_lines[1:]:
                        if past_block:
                            rest.append(line)
                        elif line.strip() == "" or line.startswith("export ") or line.startswith("#"):
                            continue
                        else:
                            past_block = True
                            rest.append(line)
                    profile.write_text(before + "\n" + block + ("\n".join(rest) if rest else ""))
                else:
                    with open(profile, "a") as f:
                        f.write("\n" + block)
                actions.append(f"OTel env vars → {profile}")
            else:
                profile.write_text(block)
                actions.append(f"OTel env vars → {profile} (created)")

    if is_macos:
        for key, val in env_block.items():
            os.system(f'launchctl setenv {key} "{val}" 2>/dev/null')
        actions.append(f"OTel env vars → macOS launchctl ({len(env_block)} vars)")

    # Copilot OTel settings in VS Code
    try:
        settings_path = vscode_user_dir() / "settings.json"
        otel_settings = {
            "github.copilot.chat.otel.enabled": True,
            "github.copilot.chat.otel.exporterType": "otlp-http",
            "github.copilot.chat.otel.otlpEndpoint": endpoint,
            "github.copilot.chat.otel.captureContent": True,
        }
        status = _write_json_settings(settings_path, otel_settings)
        actions.append(f"Copilot OTel → VS Code settings.json ({status})")
    except Exception as exc:
        actions.append(f"Copilot OTel → VS Code settings.json FAILED ({exc})")

    # Codex config.toml
    codex_toml = Path.home() / ".codex" / "config.toml"
    try:
        if codex_toml.exists():
            content = codex_toml.read_text()
            if "[otel]" not in content:
                with open(codex_toml, "a") as f:
                    f.write(f'\n[otel]\nenabled = true\nendpoint = "{endpoint}"\n')
                actions.append(f"Codex OTel → {codex_toml} (appended)")
            else:
                actions.append(f"Codex OTel → {codex_toml} (already configured)")
        else:
            codex_toml.parent.mkdir(parents=True, exist_ok=True)
            codex_toml.write_text(f'[otel]\nenabled = true\nendpoint = "{endpoint}"\n')
            actions.append(f"Codex OTel → {codex_toml} (created)")
    except Exception as exc:
        actions.append(f"Codex OTel → {codex_toml} FAILED ({exc})")


def _enable_vscode(scope: str, port: int, actions: list[str]) -> None:
    """Write VS Code agent/hooks/context settings."""
    if scope == "project":
        settings_path = Path.cwd() / ".vscode" / "settings.json"
    else:
        try:
            settings_path = vscode_user_dir() / "settings.json"
        except Exception as exc:
            actions.append(f"VS Code agent settings FAILED ({exc})")
            return

    try:
        status = _write_json_settings(settings_path, _VSCODE_AGENT_SETTINGS)
        n = len(_VSCODE_AGENT_SETTINGS)
        actions.append(f"VS Code agent/hooks/context ({n} settings) → {settings_path} ({status})")
    except Exception as exc:
        actions.append(f"VS Code agent settings → {settings_path} FAILED ({exc})")


@click.command("enable")
@click.option("--scope", type=click.Choice(["user", "project"]), default="user",
              help="user: global (default)  project: write to cwd/.claude/ and .vscode/")
@click.option("--port", default=None, type=int,
              help="aictl server port (default: $AICTL_PORT or 8484)")
@click.option("--dry-run", is_flag=True,
              help="Show what would be done without writing anything")
def enable(scope: str, port: int | None, dry_run: bool) -> None:
    """Enable all aictl integrations: hooks, OTel, and VS Code agent features.

    \b
    Enables in one shot:
      - Claude Code hooks (all events → aictl /api/hooks)
      - OTel telemetry for Claude Code, Copilot, and Codex
      - VS Code Copilot agent, hooks, nested agents, MCP discovery

    \b
    Scope:
      --scope user     global — applies to all projects (default)
      --scope project  local  — writes to .claude/settings.local.json and .vscode/settings.json

    \b
    Examples:
        aictl enable                     # enable everything globally
        aictl enable --scope project     # enable for current project only
        aictl enable --dry-run           # preview without writing
    """
    port = port if port is not None else _default_port()

    if dry_run:
        click.secho("Dry run — nothing will be written.\n", fg="yellow")
        endpoint = f"http://localhost:{port}"
        is_windows = platform.system() == "Windows"
        is_macos = platform.system() == "Darwin"

        if scope == "project":
            hooks_path = Path.cwd() / ".claude" / "settings.local.json"
            vscode_path = Path.cwd() / ".vscode" / "settings.json"
        else:
            hooks_path = claude_global_dir() / "settings.json"
            try:
                vscode_path = vscode_user_dir() / "settings.json"
            except Exception:
                vscode_path = Path("(VS Code settings not found)")

        click.echo(f"  [hooks]  {hooks_path}")
        click.echo(f"           {len(HOOK_EVENTS)} Claude Code events → {endpoint}/api/hooks")
        if is_windows:
            click.echo(f"  [otel]   Windows env vars via setx ({len(_build_env_block(port, ['claude','copilot','codex']))} vars)")
        else:
            for p in _shell_profiles():
                click.echo(f"  [otel]   {p}")
            if is_macos:
                click.echo(f"  [otel]   macOS launchctl")
        click.echo(f"  [otel]   {vscode_path} (Copilot OTel keys)")
        click.echo(f"  [vscode] {vscode_path} ({len(_VSCODE_AGENT_SETTINGS)} agent/hooks/context keys)")
        return

    actions: list[str] = []

    _install_hooks(scope, port, actions)
    _enable_otel(port, actions)
    _enable_vscode(scope, port, actions)

    click.secho("\naictl integrations enabled:", fg="green", bold=True)
    for action in actions:
        click.echo(f"  {action}")

    click.echo()
    click.echo(f"  Port:  {port}")
    click.echo(f"  Scope: {scope}")
    click.echo()
    click.secho("Next steps:", bold=True)
    click.echo("  1. Start aictl:    aictl serve")
    click.echo("  2. Reload VS Code: Ctrl+Shift+P → 'Developer: Reload Window'")
    if platform.system() != "Windows":
        click.echo("  3. Reload shell:   source ~/.zshrc  (or open a new terminal)")
