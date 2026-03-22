# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Configure Claude Code hook events to push to aictl.

Claude Code passes rich JSON data to hooks via stdin. The hook command
reads stdin, merges it with environment variables ($SESSION_ID, $CWD),
and POSTs the full payload to aictl's /api/hooks endpoint. This gives
aictl access to tool names, inputs/outputs, token counts, file paths,
and all other event-specific data.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click

# All Claude Code hook events — complete list as of 2026-03.
# Grouped by category for readability.
HOOK_EVENTS = [
    # Session lifecycle
    "SessionStart", "SessionEnd",
    "InstructionsLoaded",
    # User interaction
    "UserPromptSubmit",
    # Tool execution
    "PreToolUse", "PostToolUse", "PostToolUseFailure",
    "PermissionRequest",
    # Agent response
    "Stop", "StopFailure",
    # Subagents & teams
    "SubagentStart", "SubagentStop",
    "TeammateIdle",
    "TaskCreated", "TaskCompleted",
    # Notifications & file events
    "Notification",
    # Context compaction
    "PreCompact", "PostCompact",
    # Configuration
    "ConfigChange",
    # Worktrees
    "WorktreeCreate", "WorktreeRemove",
    # MCP elicitation
    "Elicitation", "ElicitationResult",
]


def _settings_path(scope: str) -> Path:
    """Return the Claude Code settings path for the given scope."""
    if scope == "project":
        return Path.cwd() / ".claude" / "settings.json"
    # User-level settings
    home = Path.home()
    return home / ".claude" / "settings.json"


def _is_aictl_hook(hook: dict) -> bool:
    """Return True if the hook entry was installed by aictl."""
    return isinstance(hook, dict) and "/api/hooks" in str(hook.get("command", ""))


def _build_hook_config(port: int, events: list[str] | None) -> dict:
    """Build the hooks configuration dict for Claude Code.

    Each hook reads the rich JSON payload from stdin, merges in
    environment variables, and POSTs everything to aictl.
    The jq-free approach uses python3 one-liner for portability.
    """
    target_events = events or HOOK_EVENTS
    hooks: dict[str, list[dict]] = {}

    # The hook command: read stdin (Claude's rich JSON), merge env vars, POST to aictl.
    # Claude Code provides: tool_name, tool_input, tool_output, session_id, etc. via stdin.
    # We add the event name and env vars ($SESSION_ID, $CWD, $TOOL_NAME) as fallbacks.
    for event in target_events:
        cmd = (
            f"python3 -c \""
            f"import sys,json,os,urllib.request as u;"
            f"d=json.load(sys.stdin) if not sys.stdin.isatty() else {{}};"
            f"d['event']='{event}';"
            f"d.setdefault('session_id',os.environ.get('SESSION_ID',''));"
            f"d.setdefault('cwd',os.environ.get('CWD',''));"
            f"exec('try:\\n u.urlopen(u.Request(\\\"http://localhost:{port}/api/hooks\\\","
            f"json.dumps(d).encode(),{{\\\"Content-Type\\\":\\\"application/json\\\"}}))\\nexcept:pass')"
            f"\""
        )
        hooks[event] = [{"type": "command", "command": cmd}]
    return hooks


@click.group()
def hooks():
    """Manage hook event integration with AI coding tools."""


@hooks.command()
@click.option("--port", default=None, type=int, help="aictl server port (default: $AICTL_PORT or 8484)")
@click.option("--scope", type=click.Choice(["project", "user"]), default="user",
              help="Install hooks at project or user level")
@click.option("--events", default=None, help="Comma-separated event names (default: all)")
@click.option("--force", is_flag=True, help="Install even if non-aictl hooks exist on the same events")
def install(port: int | None, scope: str, events: str | None, force: bool):
    """Configure Claude Code to push hook events to aictl.

    Adds command-based hooks to Claude Code's settings that read the
    full event payload from stdin and POST it to aictl's /api/hooks
    endpoint. This captures all rich data: tool names, inputs/outputs,
    token counts, file paths, and event-specific fields.

    If non-aictl hooks already exist on the same events, installation
    is rejected unless --force is passed.
    """
    import os
    if port is None:
        try:
            port = int(os.environ.get("AICTL_PORT", "8484"))
        except ValueError:
            port = 8484
    event_list = [e.strip() for e in events.split(",")] if events else None
    if event_list:
        invalid = [e for e in event_list if e not in HOOK_EVENTS]
        if invalid:
            click.echo(f"Unknown events: {', '.join(invalid)}", err=True)
            click.echo(f"Valid events: {', '.join(HOOK_EVENTS)}", err=True)
            sys.exit(1)

    settings_path = _settings_path(scope)
    settings_path.parent.mkdir(parents=True, exist_ok=True)

    # Read existing settings
    existing: dict = {}
    if settings_path.exists():
        try:
            existing = json.loads(settings_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    # Check for conflicting non-aictl hooks
    target_events = event_list or HOOK_EVENTS
    existing_hooks = existing.get("hooks", {})
    conflicts: list[str] = []
    for event in target_events:
        user_hooks = [h for h in existing_hooks.get(event, []) if not _is_aictl_hook(h)]
        if user_hooks:
            conflicts.append(event)
    if conflicts and not force:
        click.echo(f"Existing non-aictl hooks found on {len(conflicts)} event(s):", err=True)
        for ev in conflicts:
            user_hooks = [h for h in existing_hooks.get(ev, []) if not _is_aictl_hook(h)]
            for h in user_hooks:
                cmd = h.get("command", h.get("url", str(h)))
                if len(cmd) > 80:
                    cmd = cmd[:77] + "..."
                click.echo(f"  {ev}: {cmd}", err=True)
        click.echo(f"\nUse --force to install alongside existing hooks.", err=True)
        sys.exit(1)

    # Merge hooks into existing settings (per-event, preserving user hooks)
    hook_config = _build_hook_config(port, event_list)
    for event, new_rules in hook_config.items():
        current = existing_hooks.get(event, [])
        # Remove old aictl entries, keep user hooks
        current = [h for h in current if not _is_aictl_hook(h)]
        current.extend(new_rules)
        existing_hooks[event] = current
    existing["hooks"] = existing_hooks

    settings_path.write_text(json.dumps(existing, indent=2) + "\n")

    click.echo(f"Installed {len(target_events)} hook events → localhost:{port}/api/hooks")
    click.echo(f"  Scope: {scope} ({settings_path})")
    click.echo(f"  Mode: stdin passthrough (reads full event payload)")
    if conflicts:
        click.echo(f"  Note: {len(conflicts)} event(s) have additional non-aictl hooks (preserved)")


@hooks.command()
@click.option("--scope", type=click.Choice(["project", "user"]), default="user",
              help="Remove hooks at project or user level")
def uninstall(scope: str):
    """Remove aictl hook configuration from Claude Code settings."""
    settings_path = _settings_path(scope)
    if not settings_path.exists():
        click.echo("No settings file found.")
        return

    try:
        existing = json.loads(settings_path.read_text())
    except (json.JSONDecodeError, OSError):
        click.echo("Could not read settings file.")
        return

    hooks_config = existing.get("hooks", {})
    removed = 0
    for event in HOOK_EVENTS:
        if event in hooks_config:
            # Remove only aictl-related hook entries
            hooks_config[event] = [
                h for h in hooks_config[event]
                if not _is_aictl_hook(h)
            ]
            if not hooks_config[event]:
                del hooks_config[event]
            removed += 1

    if hooks_config:
        existing["hooks"] = hooks_config
    elif "hooks" in existing:
        del existing["hooks"]

    settings_path.write_text(json.dumps(existing, indent=2) + "\n")
    click.echo(f"Removed aictl hooks from {settings_path}")
