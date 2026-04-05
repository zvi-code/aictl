# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: hooks + otel + enable — integration commands."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import click

from ..platforms import IS_MACOS, IS_WINDOWS, claude_global_dir, vscode_user_dir, codex_global_dir, gemini_global_dir
from ..utils import WriteGuard


def _fetch_otel_status(port: int) -> dict | None:
    """GET /api/otel-status from the running aictl server. Returns dict or None."""
    import urllib.error
    import urllib.request
    try:
        with urllib.request.urlopen(
            f"http://localhost:{port}/api/otel-status", timeout=5
        ) as resp:
            return json.loads(resp.read())
    except (OSError, urllib.error.URLError, ValueError):
        return None


# ─── hooks ───────────────────────────────────────────────────────────────────


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


# Gemini CLI specific hook events (from official documentation)
GEMINI_HOOK_EVENTS = [
    "SessionStart", "SessionEnd",
    "BeforeAgent", "AfterAgent",
    "BeforeModel", "AfterModel",
    "BeforeToolSelection",
    "BeforeTool", "AfterTool",
    "PreCompress",
    "Notification",
]

# Map internal HOOK_EVENTS (Claude-style) to Gemini CLI events
GEMINI_HOOK_MAP = {
    "SessionStart": "SessionStart",
    "SessionEnd": "SessionEnd",
    "UserPromptSubmit": "BeforeAgent",
    "PreToolUse": "BeforeTool",
    "PostToolUse": "AfterTool",
    "PostToolUseFailure": "AfterTool",
    "Stop": "AfterAgent",
    "StopFailure": "AfterAgent",
    "PreCompact": "PreCompress",
    "Notification": "Notification",
}


def _update_shell_profiles_block(
    marker: str,
    block: str,
    actions: list[str],
    update_label: str = "Updated {profile}",
    create_label: str = "Created {profile}",
) -> None:
    """Write/replace a marker-delimited env-var block in all shell profile files."""
    for profile in _shell_profiles():
        if profile.exists():
            content = profile.read_text(encoding="utf-8")
            if marker in content:
                before = content.split(marker)[0].rstrip()
                after_lines = content.split(marker, 1)[1].split("\n")
                rest, past_block = [], False
                for line in after_lines[1:]:  # skip marker line itself
                    if past_block:
                        rest.append(line)
                    elif line.strip() == "" or line.startswith("export ") or line.startswith("#"):
                        continue
                    else:
                        past_block = True
                        rest.append(line)
                new_content = before + "\n" + block + ("\n".join(rest) if rest else "")
                _g = WriteGuard.current()
                if _g:
                    _g.confirm(profile, "modify")
                profile.write_text(new_content, encoding="utf-8")
            else:
                _g = WriteGuard.current()
                if _g:
                    _g.confirm(profile, "modify")
                with open(profile, "a", encoding="utf-8") as f:
                    f.write("\n" + block)
            actions.append(update_label.format(profile=profile))
        else:
            profile.write_text(block, encoding="utf-8")
            actions.append(create_label.format(profile=profile))


def _settings_path(scope: str) -> Path:
    """Return the Claude Code settings path for the given scope."""
    if scope == "project":
        # Use settings.local.json — hooks contain localhost:PORT which is
        # machine-specific and must not be committed to git.
        return Path.cwd() / ".claude" / "settings.local.json"
    # User-level: ~/.claude/settings.json (macOS/Linux) or
    # %APPDATA%\Claude\settings.json (Windows)
    return claude_global_dir() / "settings.json"


_AICTL_HOOK_MARKERS = ("/api/hooks", "aictl.hook_handler")


def _is_aictl_hook(hook: dict) -> bool:
    """Return True if the hook entry was installed by aictl.

    Detects three generations of hook format:
    - Current: ``python -m aictl.hook_handler --event ...``
    - Previous: inline ``python -c "... /api/hooks ..."``
    - Legacy flat: ``curl ... /api/hooks ...``
    """
    if not isinstance(hook, dict):
        return False
    # Current nested format: {"matcher": ..., "hooks": [{"type": "command", "command": "..."}]}
    if "hooks" in hook and isinstance(hook["hooks"], list):
        return any(
            any(m in str(h.get("command", "")) for m in _AICTL_HOOK_MARKERS)
            for h in hook["hooks"]
        )
    # Old flat format (pre-fix): {"type": "command", "command": "..."}
    cmd = str(hook.get("command", ""))
    return any(m in cmd for m in _AICTL_HOOK_MARKERS)


def _python_cmd() -> str:
    """Return a quoted path to the current Python interpreter.

    Using sys.executable ensures we invoke the exact same Python that runs
    aictl — correct venv, correct version — on every platform including
    Windows where 'python3' is not available.
    """
    exe = sys.executable
    # Quote the path in case it contains spaces (common on Windows).
    return f'"{exe}"'


def _build_hook_config(port: int, events: list[str] | None, event_map: dict[str, str] | None = None, matcher: str = "") -> dict:
    """Build the hooks configuration dict for AI tools.

    Each hook invokes ``python -m aictl.hook_handler`` which reads the
    rich JSON payload from stdin, merges environment variables, POSTs
    everything to aictl, and passes the payload through to stdout.

    Using a module invocation instead of an inline ``-c`` one-liner
    avoids shell-escaping issues on Windows and complex quoting.

    Optional event_map can translate internal HOOK_EVENTS names to tool-specific names.
    matcher: "" for Claude (default), "*" for Gemini.
    """
    target_events = events or HOOK_EVENTS
    hooks: dict[str, list[dict]] = {}
    python = _python_cmd()

    for event in target_events:
        tool_event_name = event_map.get(event, event) if event_map else event
        cmd = f"{python} -m aictl.hook_handler --event {event} --port {port}"
        hooks[tool_event_name] = [{"matcher": matcher, "hooks": [{"type": "command", "command": cmd}]}]
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
    guard = WriteGuard.install("hooks install")
    if port is None:
        port = _default_port()
    event_list = [e.strip() for e in events.split(",")] if events else None
    if event_list:
        invalid = [e for e in event_list if e not in HOOK_EVENTS]
        if invalid:
            raise click.ClickException(
                f"Unknown events: {', '.join(invalid)}. "
                f"Valid events: {', '.join(HOOK_EVENTS)}"
            )

    settings_path = _settings_path(scope)
    settings_path.parent.mkdir(parents=True, exist_ok=True)

    # Read existing settings
    existing: dict = {}
    if settings_path.exists():
        try:
            existing = json.loads(settings_path.read_text(encoding="utf-8"))
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
        raise SystemExit(1)

    # Merge hooks into existing settings (per-event, preserving user hooks)
    hook_config = _build_hook_config(port, event_list)
    for event, new_rules in hook_config.items():
        current = existing_hooks.get(event, [])
        # Remove old aictl entries, keep user hooks
        current = [h for h in current if not _is_aictl_hook(h)]
        current.extend(new_rules)
        existing_hooks[event] = current
    existing["hooks"] = existing_hooks

    guard.confirm(settings_path, "modify")
    settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")

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
    guard = WriteGuard.install("hooks uninstall")
    settings_path = _settings_path(scope)
    if not settings_path.exists():
        click.echo("No settings file found.")
        return

    try:
        existing = json.loads(settings_path.read_text(encoding="utf-8"))
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

    guard.confirm(settings_path, "modify")
    settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    click.echo(f"Removed aictl hooks from {settings_path}")


# ─── otel ────────────────────────────────────────────────────────────────────


def _default_port() -> int:
    """Return port from AICTL_PORT env var, falling back to 8484."""
    try:
        return int(os.environ.get("AICTL_PORT", "8484"))
    except ValueError:
        return 8484


@click.group()
def otel():
    """Manage OpenTelemetry integration with AI coding tools."""


@otel.command()
@click.option("--port", default=None, type=int,
              help="aictl server port (default: $AICTL_PORT or 8484)")
@click.option("--tool", type=click.Choice(["claude", "copilot", "codex", "gemini", "all"]),
              default="all", help="Which tool(s) to configure")
@click.option("--print", "print_only", is_flag=True,
              help="Print shell exports to stdout instead of persisting (for eval)")
@click.option("--shell", type=click.Choice(["bash", "zsh", "fish", "powershell"]),
              default=None, help="Shell format for --print output (auto-detected)")
def enable(port: int | None, tool: str, print_only: bool, shell: str | None):
    """Enable OTel export for AI coding tools.

    \b
    By default, persists config across shells, VS Code, Codex, and
    platform-specific mechanisms (launchctl on macOS, setx on Windows).
    Idempotent — safe to run multiple times.
    \b
    With --print, outputs shell exports for eval instead of persisting:
        eval $(aictl otel enable --print)
    \b
    Usage:
        aictl otel enable              # persist everywhere
        aictl otel enable --tool claude # Claude Code only
        eval $(aictl otel enable --print)  # current shell only
    """
    if print_only:
        _print_exports(port, tool, shell)
        return
    guard = WriteGuard.install("otel enable")

    port = port if port is not None else _default_port()
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex"] if tool == "all" else [tool]

    actions: list[str] = []

    # ── Env vars for all tools ──────────────────────────────────
    env_block = _build_env_block(port, tools)

    # ── Shell profiles ──────────────────────────────────────────
    if IS_WINDOWS:
        # Windows: set via setx (persistent user env vars)
        # Also update current process so verify works immediately
        for key, val in env_block.items():
            os.system(f'setx {key} "{val}" >nul 2>&1')
            os.environ[key] = val
        actions.append(f"Windows user env vars set via setx ({len(env_block)} vars)")
        actions.append("Note: new terminals will inherit these; current session updated")
    else:
        # Unix: append to shell profiles
        _update_shell_profiles_block(_OTEL_MARKER, _otel_shell_block(port, env_block), actions)

    # ── macOS launchctl (for GUI apps) ──────────────────────────
    if IS_MACOS:
        for key, val in env_block.items():
            os.system(f'launchctl setenv {key} "{val}" 2>/dev/null')
        actions.append(f"macOS launchctl setenv ({len(env_block)} vars)")

    # ── VS Code settings.json ──────────────────────────────────
    if "copilot" in tools:
        try:
            settings_path = vscode_user_dir() / "settings.json"
            copilot_settings = {
                "github.copilot.chat.otel.enabled": True,
                "github.copilot.chat.otel.exporterType": "otlp-http",
                "github.copilot.chat.otel.otlpEndpoint": endpoint,
                "github.copilot.chat.otel.captureContent": True,
            }
            if settings_path.exists():
                content = settings_path.read_text(encoding="utf-8")
                try:
                    settings = json.loads(content)
                except json.JSONDecodeError:
                    settings = {}
            else:
                settings = {}
                settings_path.parent.mkdir(parents=True, exist_ok=True)
            settings.update(copilot_settings)
            guard.confirm(settings_path, "modify")
            settings_path.write_text(json.dumps(settings, indent=4) + "\n", encoding="utf-8")
            actions.append(f"VS Code settings: {settings_path}")
        except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
            actions.append(f"VS Code settings: FAILED ({exc})")

    # ── Codex config.toml ──────────────────────────────────────
    if "codex" in tools:
        codex_toml = codex_global_dir() / "config.toml"
        try:
            if codex_toml.exists():
                content = codex_toml.read_text(encoding="utf-8")
                if "[otel]" not in content:
                    guard.confirm(codex_toml, "modify")
                    with open(codex_toml, "a", encoding="utf-8") as f:
                        f.write(f'\n[otel]\nenabled = true\n'
                                f'endpoint = "{endpoint}"\n')
                    actions.append(f"Codex config: added [otel] to {codex_toml}")
                else:
                    actions.append(f"Codex config: [otel] already present in {codex_toml}")
            else:
                codex_toml.parent.mkdir(parents=True, exist_ok=True)
                codex_toml.write_text(f'[otel]\nenabled = true\n'
                                      f'endpoint = "{endpoint}"\n', encoding="utf-8")
                actions.append(f"Codex config: created {codex_toml}")
        except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
            actions.append(f"Codex config: FAILED ({exc})")

    # ── Summary ────────────────────────────────────────────────
    failures = [a for a in actions if "FAILED" in a]
    click.secho("OTel enabled:", fg="green", bold=True)
    for action in actions:
        click.echo(f"  {action}")
    click.echo()
    click.echo(f"Endpoint: {endpoint}")
    click.echo(f"Tools:    {', '.join(tools)}")
    click.echo()
    click.echo("Restart AI tools to pick up changes.")
    if "copilot" in tools:
        click.echo("VS Code: Cmd/Ctrl+Shift+P → 'Developer: Reload Window'")
    if failures:
        raise SystemExit(1)


def _print_exports(port: int | None, tool: str, shell: str | None) -> None:
    """Print env var exports to stdout for eval."""
    port = port if port is not None else _default_port()
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex"] if tool == "all" else [tool]

    if shell is None:
        if IS_WINDOWS:
            shell = "powershell"
        elif "zsh" in os.environ.get("SHELL", ""):
            shell = "zsh"
        elif "fish" in os.environ.get("SHELL", ""):
            shell = "fish"
        else:
            shell = "bash"

    env_block = _build_env_block(port, tools)
    for key, val in env_block.items():
        if shell in ("bash", "zsh"):
            click.echo(f'export {key}="{val}"')
        elif shell == "fish":
            click.echo(f'set -x {key} "{val}"')
        elif shell == "powershell":
            click.echo(f'$env:{key} = "{val}"')

    print(f"\n# OTel endpoint: {endpoint}", file=sys.stderr)
    print(f"# Tools: {', '.join(tools)}", file=sys.stderr)
    print(f"# Make sure 'aictl serve --port {port}' is running", file=sys.stderr)


def _build_env_block(port: int, tools: list[str]) -> dict[str, str]:
    """Build the full set of env vars for the given tools."""
    endpoint = f"http://localhost:{port}"
    env: dict[str, str] = {"AICTL_PORT": str(port)}

    if "claude" in tools:
        env.update({
            "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
            "OTEL_METRICS_EXPORTER": "otlp",
            "OTEL_LOGS_EXPORTER": "otlp",
            "OTEL_LOG_USER_PROMPTS": "1",
            "OTEL_LOG_TOOL_DETAILS": "1",
        })

    if "copilot" in tools:
        env.update({
            "COPILOT_OTEL_ENABLED": "true",
            "COPILOT_OTEL_ENDPOINT": endpoint,
        })

    if "codex" in tools:
        env.update({
            "CODEX_OTEL_ENABLED": "1",
            "CODEX_OTEL_ENDPOINT": endpoint,
        })

    if "gemini" in tools:
        env.update({
            "GEMINI_OTEL_ENABLED": "1",
            "OTEL_METRICS_EXPORTER": "otlp",
            "OTEL_LOGS_EXPORTER": "otlp",
        })

    env.update({
        "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
        "OTEL_EXPORTER_OTLP_ENDPOINT": endpoint,
    })
    return env


_OTEL_MARKER = "# ── aictl: OTel for AI tools ──"


def _otel_shell_block(port: int, env_block: dict[str, str]) -> str:
    """Build the shell profile block for OTel env vars."""
    lines = [_OTEL_MARKER, f"export AICTL_PORT={port}"]
    for key, val in env_block.items():
        if key == "AICTL_PORT":
            continue
        lines.append(f'export {key}="{val.replace(f":{port}", ":${AICTL_PORT}")}"')
    return "\n".join(lines) + "\n"


def _shell_profiles() -> list:
    """Return shell profile paths that exist or should be created."""
    home = Path.home()
    candidates = []
    # Detect current shell
    shell = os.environ.get("SHELL", "")
    if "zsh" in shell:
        candidates.append(home / ".zshrc")
    elif "fish" in shell:
        candidates.append(home / ".config" / "fish" / "config.fish")
    else:
        candidates.append(home / ".bashrc")
    # Also add bash_profile if it exists
    bp = home / ".bash_profile"
    if bp.exists() and bp not in candidates:
        candidates.append(bp)
    return candidates


@otel.command()
def verify():
    """Check that OTel configuration is correctly persisted everywhere."""
    ok = click.style("OK", fg="green")
    miss = click.style("MISSING", fg="red")
    warn = click.style("WARN", fg="yellow")

    click.secho("OTel configuration check:", bold=True)

    # ── Env vars ───────────────────────────────────────────────
    click.echo("\n  Environment variables:")

    # On Windows, check registry (setx target) since current shell
    # won't have vars until a new terminal is opened.
    reg_env: dict[str, str] = {}
    if IS_WINDOWS:
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                i = 0
                while True:
                    try:
                        name, value, _ = winreg.EnumValue(key, i)
                        reg_env[name] = value
                        i += 1
                    except OSError:
                        break
        except OSError:
            pass  # winreg not available or key unreadable; reg_env stays empty

    required = [
        ("AICTL_PORT", None),
        ("CLAUDE_CODE_ENABLE_TELEMETRY", "1"),
        ("OTEL_METRICS_EXPORTER", "otlp"),
        ("OTEL_LOGS_EXPORTER", "otlp"),
        ("OTEL_EXPORTER_OTLP_PROTOCOL", "http/json"),
        ("OTEL_EXPORTER_OTLP_ENDPOINT", None),
        ("COPILOT_OTEL_ENABLED", "true"),
        ("COPILOT_OTEL_ENDPOINT", None),
        ("CODEX_OTEL_ENABLED", "1"),
        ("CODEX_OTEL_ENDPOINT", None),
    ]
    for key, expected in required:
        # Check current process env, then Windows registry
        val = os.environ.get(key)
        source = ""
        if val is None and reg_env:
            val = reg_env.get(key)
            if val is not None:
                source = " (registry — open new terminal to activate)"
        if val is None:
            click.echo(f"    {miss}  {key} — not set")
        elif expected and val != expected:
            click.echo(f"    {warn}  {key}={val}{source} (expected {expected})")
        else:
            click.echo(f"    {ok}  {key}={val}{source}")

    # ── Shell profiles ─────────────────────────────────────────
    if not IS_WINDOWS:
        click.echo("\n  Shell profiles:")
        for profile in _shell_profiles():
            if profile.exists():
                content = profile.read_text()
                if _OTEL_MARKER in content:
                    click.echo(f"    {ok}  {profile}")
                else:
                    click.echo(f"    {miss}  {profile} — no aictl OTel block")
            else:
                click.echo(f"    {miss}  {profile} — file not found")

    # ── VS Code settings ──────────────────────────────────────
    click.echo("\n  VS Code settings:")
    try:
        settings_path = vscode_user_dir() / "settings.json"
        if settings_path.exists():
            settings = json.loads(settings_path.read_text())
            copilot_keys = {
                "github.copilot.chat.otel.enabled": True,
                "github.copilot.chat.otel.exporterType": "otlp-http",
                "github.copilot.chat.otel.otlpEndpoint": None,
            }
            for key, expected in copilot_keys.items():
                val = settings.get(key)
                if val is None:
                    click.echo(f"    {miss}  {key}")
                elif expected is not None and val != expected:
                    click.echo(f"    {warn}  {key}={val} (expected {expected})")
                else:
                    click.echo(f"    {ok}  {key}={val}")
        else:
            click.echo(f"    {miss}  {settings_path} — not found")
    except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
        click.echo(f"    {warn}  Could not check: {exc}")

    # ── Codex config ──────────────────────────────────────────
    click.echo("\n  Codex config:")
    codex_toml = codex_global_dir() / "config.toml"
    if codex_toml.exists():
        content = codex_toml.read_text(encoding="utf-8")
        if "[otel]" in content and "enabled = true" in content:
            click.echo(f"    {ok}  {codex_toml} — [otel] enabled")
        elif "[otel]" in content:
            click.echo(f"    {warn}  {codex_toml} — [otel] present but check enabled flag")
        else:
            click.echo(f"    {miss}  {codex_toml} — no [otel] section")
    else:
        click.echo(f"    {miss}  {codex_toml} — not found")

    # ── aictl server ──────────────────────────────────────────
    click.echo("\n  aictl server:")
    port = _default_port()
    data = _fetch_otel_status(port)
    if data is not None:
        total = data.get("metrics_received", 0) + data.get("events_received", 0)
        errors = data.get("errors", 0)
        if total > 0 and errors == 0:
            click.echo(f"    {ok}  localhost:{port} — {total} received, 0 errors")
        elif total > 0:
            click.echo(f"    {warn}  localhost:{port} — {total} received, {errors} errors")
        else:
            click.echo(f"    {warn}  localhost:{port} — running but no data received yet")
    else:
        click.echo(f"    {miss}  localhost:{port} — not reachable")


@otel.command()
@click.option("--port", default=None, type=int, help="aictl server port (default: $AICTL_PORT or 8484)")
def status(port: int | None):
    """Check OTel receiver health on the running aictl server."""
    port = port if port is not None else _default_port()
    data = _fetch_otel_status(port)
    if data is None:
        raise click.ClickException(f"Could not connect to aictl at localhost:{port}")

    active = data.get("active", False)
    indicator = click.style("active", fg="green") if active else click.style("inactive", fg="yellow")
    click.echo(f"OTel receiver: {indicator}")
    click.echo(f"  Metrics received: {data.get('metrics_received', 0)}")
    click.echo(f"  Events received:  {data.get('events_received', 0)}")
    click.echo(f"  API calls total:  {data.get('api_calls_total', 0)}")
    click.echo(f"  API errors total: {data.get('api_errors_total', 0)}")
    click.echo(f"  Parse errors:     {data.get('errors', 0)}")

    last = data.get("last_receive_at", 0)
    if last > 0:
        import time
        ago = int(time.time() - last)
        if ago < 60:
            click.echo(f"  Last data:        {ago}s ago")
        elif ago < 3600:
            click.echo(f"  Last data:        {ago // 60}m ago")
        else:
            click.echo(f"  Last data:        {ago // 3600}h ago")
    else:
        click.echo("  Last data:        never")


# ─── enable ──────────────────────────────────────────────────────────────────


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
    guard = WriteGuard.current()
    if guard:
        guard.confirm(path, "modify")
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

    existing_hooks = existing.get("hooks", {})
    # Purge ALL old aictl hooks from ALL event keys first
    # This cleans up events that may have been renamed or removed (like Claude->Gemini map)
    for ev in list(existing_hooks.keys()):
        cleaned = [h for h in existing_hooks[ev] if not _is_aictl_hook(h)]
        if not cleaned:
            del existing_hooks[ev]
        else:
            existing_hooks[ev] = cleaned

    hook_config = _build_hook_config(port, None)
    for event, new_rules in hook_config.items():
        existing_hooks.setdefault(event, []).extend(new_rules)
    existing["hooks"] = existing_hooks

    guard = WriteGuard.current()
    if guard:
        guard.confirm(settings_path, "modify")
    settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    actions.append(f"Claude Code hooks ({len(HOOK_EVENTS)} events) → {settings_path}")

    # Gemini CLI hooks
    if scope == "project":
        gemini_path = Path.cwd() / ".gemini" / "settings.json"
    else:
        gemini_path = gemini_global_dir() / "settings.json"

    gemini_path.parent.mkdir(parents=True, exist_ok=True)
    g_existing: dict = {}
    if gemini_path.exists():
        try:
            g_existing = json.loads(gemini_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    g_hooks = g_existing.get("hooks", {})
    # Purge all old aictl hooks from Gemini settings first
    for ev in list(g_hooks.keys()):
        cleaned = [h for h in g_hooks[ev] if not _is_aictl_hook(h)]
        if not cleaned:
            del g_hooks[ev]
        else:
            g_hooks[ev] = cleaned

    # Map internal HOOK_EVENTS (PascalCase) to official Gemini CLI events
    # Use the same hook configuration logic as Claude but with Gemini names
    gemini_only_events = [e for e in HOOK_EVENTS if e in GEMINI_HOOK_MAP]
    hook_config = _build_hook_config(port, gemini_only_events, event_map=GEMINI_HOOK_MAP, matcher="*")
    
    for tool_event, new_rules in hook_config.items():
        g_hooks.setdefault(tool_event, []).extend(new_rules)
    g_existing["hooks"] = g_hooks

    if guard:
        guard.confirm(gemini_path, "modify")
    gemini_path.write_text(json.dumps(g_existing, indent=2) + "\n", encoding="utf-8")
    actions.append(f"Gemini CLI hooks ({len(GEMINI_HOOK_MAP)} events) → {gemini_path}")


def _enable_otel(port: int, actions: list[str]) -> None:
    """Enable OTel for all tools and report actions."""
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex", "gemini"]
    env_block = _build_env_block(port, tools)

    if IS_WINDOWS:
        for key, val in env_block.items():
            os.system(f'setx {key} "{val}" >nul 2>&1')
            os.environ[key] = val
        actions.append(f"OTel env vars → Windows user environment ({len(env_block)} vars via setx)")
        actions.append("  Note: new terminals will inherit; current session updated")
    else:
        _update_shell_profiles_block(
            _OTEL_MARKER, _otel_shell_block(port, env_block), actions,
            update_label="OTel env vars → {profile}",
            create_label="OTel env vars → {profile} (created)",
        )

    if IS_MACOS:
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
    except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
        actions.append(f"Copilot OTel → VS Code settings.json FAILED ({exc})")

    # Codex config.toml
    codex_toml = codex_global_dir() / "config.toml"
    try:
        if codex_toml.exists():
            content = codex_toml.read_text(encoding="utf-8")
            if "[otel]" not in content:
                _g = WriteGuard.current()
                if _g:
                    _g.confirm(codex_toml, "modify")
                with open(codex_toml, "a", encoding="utf-8") as f:
                    f.write(f'\n[otel]\nenabled = true\nendpoint = "{endpoint}"\n')
                actions.append(f"Codex OTel → {codex_toml} (appended)")
            else:
                actions.append(f"Codex OTel → {codex_toml} (already configured)")
        else:
            codex_toml.parent.mkdir(parents=True, exist_ok=True)
            codex_toml.write_text(f'[otel]\nenabled = true\nendpoint = "{endpoint}"\n', encoding="utf-8")
            actions.append(f"Codex OTel → {codex_toml} (created)")
    except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
        actions.append(f"Codex OTel → {codex_toml} FAILED ({exc})")


def _enable_vscode(scope: str, port: int, actions: list[str]) -> None:
    """Write VS Code agent/hooks/context settings."""
    if scope == "project":
        settings_path = Path.cwd() / ".vscode" / "settings.json"
    else:
        try:
            settings_path = vscode_user_dir() / "settings.json"
        except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
            actions.append(f"VS Code agent settings FAILED ({exc})")
            return

    try:
        status = _write_json_settings(settings_path, _VSCODE_AGENT_SETTINGS)
        n = len(_VSCODE_AGENT_SETTINGS)
        actions.append(f"VS Code agent/hooks/context ({n} settings) → {settings_path} ({status})")
    except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
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
    if not dry_run:
        WriteGuard.install("enable")

    if dry_run:
        click.secho("Dry run — nothing will be written.\n", fg="yellow")
        endpoint = f"http://localhost:{port}"

        if scope == "project":
            hooks_path = Path.cwd() / ".claude" / "settings.local.json"
            gemini_hooks_path = Path.cwd() / ".gemini" / "settings.json"
            vscode_path = Path.cwd() / ".vscode" / "settings.json"
        else:
            hooks_path = claude_global_dir() / "settings.json"
            gemini_hooks_path = gemini_global_dir() / "settings.json"
            try:
                vscode_path = vscode_user_dir() / "settings.json"
            except (KeyError, OSError):
                vscode_path = Path("(VS Code settings not found)")

        click.echo(f"  [hooks]  {hooks_path}")
        click.echo(f"           {len(HOOK_EVENTS)} Claude Code events → {endpoint}/api/hooks")
        click.echo(f"  [hooks]  {gemini_hooks_path}")
        click.echo(f"           {len(GEMINI_HOOK_MAP)} Gemini CLI events → {endpoint}/api/hooks")
        if IS_WINDOWS:
            click.echo(f"  [otel]   Windows env vars via setx ({len(_build_env_block(port, ['claude','copilot','codex','gemini']))} vars)")
        else:
            for p in _shell_profiles():
                click.echo(f"  [otel]   {p}")
            if IS_MACOS:
                click.echo(f"  [otel]   macOS launchctl")
        click.echo(f"  [otel]   {vscode_path} (Copilot OTel keys)")
        click.echo(f"  [vscode] {vscode_path} ({len(_VSCODE_AGENT_SETTINGS)} agent/hooks/context keys)")
        return

    actions: list[str] = []

    _install_hooks(scope, port, actions)
    _enable_otel(port, actions)
    _enable_vscode(scope, port, actions)

    failures = [a for a in actions if "FAILED" in a]
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
    if not IS_WINDOWS:
        click.echo("  3. Reload shell:   source ~/.zshrc  (or open a new terminal)")
    if failures:
        raise SystemExit(1)
