# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Configure AI coding tools to export OpenTelemetry data to aictl."""

from __future__ import annotations

import os
import sys

import click


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
@click.option("--tool", type=click.Choice(["claude", "copilot", "codex", "all"]),
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
    import json
    import platform
    from pathlib import Path
    from ..guard import WriteGuard
    guard = WriteGuard.install("otel enable")

    port = port if port is not None else _default_port()
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex"] if tool == "all" else [tool]
    is_windows = platform.system() == "Windows"
    is_macos = platform.system() == "Darwin"

    actions: list[str] = []

    # ── Env vars for all tools ──────────────────────────────────
    env_block = _build_env_block(port, tools)

    # ── Shell profiles ──────────────────────────────────────────
    if is_windows:
        # Windows: set via setx (persistent user env vars)
        # Also update current process so verify works immediately
        for key, val in env_block.items():
            os.system(f'setx {key} "{val}" >nul 2>&1')
            os.environ[key] = val
        actions.append(f"Windows user env vars set via setx ({len(env_block)} vars)")
        actions.append("Note: new terminals will inherit these; current session updated")
    else:
        # Unix: append to shell profiles
        marker = "# ── aictl: OTel for AI tools ──"
        lines = [marker]
        lines.append(f'export AICTL_PORT={port}')
        for key, val in env_block.items():
            if key == "AICTL_PORT":
                continue
            # Use ${AICTL_PORT} for endpoint values
            val_out = val.replace(f":{port}", ":${AICTL_PORT}")
            lines.append(f'export {key}="{val_out}"')
        block = "\n".join(lines) + "\n"

        for profile in _shell_profiles():
            if profile.exists():
                content = profile.read_text()
                if marker in content:
                    # Replace existing block
                    before = content.split(marker)[0].rstrip()
                    # Find end: next non-export/non-comment/non-blank line
                    after_lines = content.split(marker, 1)[1].split("\n")
                    rest = []
                    past_block = False
                    for line in after_lines[1:]:  # skip the marker line itself
                        if past_block:
                            rest.append(line)
                        elif line.strip() == "" or line.startswith("export ") or line.startswith("#"):
                            continue
                        else:
                            past_block = True
                            rest.append(line)
                    new_content = before + "\n" + block
                    if rest:
                        new_content += "\n".join(rest)
                    guard.confirm(profile, "modify")
                    profile.write_text(new_content)
                else:
                    guard.confirm(profile, "modify")
                    with open(profile, "a") as f:
                        f.write("\n" + block)
                actions.append(f"Updated {profile}")
            else:
                profile.write_text(block)
                actions.append(f"Created {profile}")

    # ── macOS launchctl (for GUI apps) ──────────────────────────
    if is_macos:
        for key, val in env_block.items():
            os.system(f'launchctl setenv {key} "{val}" 2>/dev/null')
        actions.append(f"macOS launchctl setenv ({len(env_block)} vars)")

    # ── VS Code settings.json ──────────────────────────────────
    if "copilot" in tools:
        try:
            from ..platforms import vscode_user_dir
            settings_path = vscode_user_dir() / "settings.json"
            copilot_settings = {
                "github.copilot.chat.otel.enabled": True,
                "github.copilot.chat.otel.exporterType": "otlp-http",
                "github.copilot.chat.otel.otlpEndpoint": endpoint,
                "github.copilot.chat.otel.captureContent": True,
            }
            if settings_path.exists():
                content = settings_path.read_text()
                try:
                    settings = json.loads(content)
                except json.JSONDecodeError:
                    settings = {}
            else:
                settings = {}
                settings_path.parent.mkdir(parents=True, exist_ok=True)
            settings.update(copilot_settings)
            guard.confirm(settings_path, "modify")
            settings_path.write_text(json.dumps(settings, indent=4) + "\n")
            actions.append(f"VS Code settings: {settings_path}")
        except Exception as exc:
            actions.append(f"VS Code settings: FAILED ({exc})")

    # ── Codex config.toml ──────────────────────────────────────
    if "codex" in tools:
        codex_toml = Path.home() / ".codex" / "config.toml"
        try:
            if codex_toml.exists():
                content = codex_toml.read_text()
                if "[otel]" not in content:
                    guard.confirm(codex_toml, "modify")
                    with open(codex_toml, "a") as f:
                        f.write(f'\n[otel]\nenabled = true\n'
                                f'endpoint = "{endpoint}"\n')
                    actions.append(f"Codex config: added [otel] to {codex_toml}")
                else:
                    actions.append(f"Codex config: [otel] already present in {codex_toml}")
            else:
                codex_toml.parent.mkdir(parents=True, exist_ok=True)
                codex_toml.write_text(f'[otel]\nenabled = true\n'
                                      f'endpoint = "{endpoint}"\n')
                actions.append(f"Codex config: created {codex_toml}")
        except Exception as exc:
            actions.append(f"Codex config: FAILED ({exc})")

    # ── Summary ────────────────────────────────────────────────
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


def _print_exports(port: int | None, tool: str, shell: str | None) -> None:
    """Print env var exports to stdout for eval."""
    import platform

    port = port if port is not None else _default_port()
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex"] if tool == "all" else [tool]

    if shell is None:
        if platform.system() == "Windows":
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

    env.update({
        "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
        "OTEL_EXPORTER_OTLP_ENDPOINT": endpoint,
    })
    return env


def _shell_profiles() -> list:
    """Return shell profile paths that exist or should be created."""
    from pathlib import Path
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
    import json
    import platform
    from pathlib import Path

    ok = click.style("OK", fg="green")
    miss = click.style("MISSING", fg="red")
    warn = click.style("WARN", fg="yellow")

    click.secho("OTel configuration check:", bold=True)

    # ── Env vars ───────────────────────────────────────────────
    click.echo("\n  Environment variables:")
    is_windows = platform.system() == "Windows"

    # On Windows, check registry (setx target) since current shell
    # won't have vars until a new terminal is opened.
    reg_env: dict[str, str] = {}
    if is_windows:
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
        except Exception:
            pass

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
    if platform.system() != "Windows":
        click.echo("\n  Shell profiles:")
        marker = "# ── aictl: OTel for AI tools ──"
        for profile in _shell_profiles():
            if profile.exists():
                content = profile.read_text()
                if marker in content:
                    click.echo(f"    {ok}  {profile}")
                else:
                    click.echo(f"    {miss}  {profile} — no aictl OTel block")
            else:
                click.echo(f"    {miss}  {profile} — file not found")

    # ── VS Code settings ──────────────────────────────────────
    click.echo("\n  VS Code settings:")
    try:
        from ..platforms import vscode_user_dir
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
    except Exception as exc:
        click.echo(f"    {warn}  Could not check: {exc}")

    # ── Codex config ──────────────────────────────────────────
    click.echo("\n  Codex config:")
    codex_toml = Path.home() / ".codex" / "config.toml"
    if codex_toml.exists():
        content = codex_toml.read_text()
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
    try:
        import urllib.request
        url = f"http://localhost:{port}/api/otel-status"
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read())
        total = data.get("metrics_received", 0) + data.get("events_received", 0)
        errors = data.get("errors", 0)
        if total > 0 and errors == 0:
            click.echo(f"    {ok}  localhost:{port} — {total} received, 0 errors")
        elif total > 0:
            click.echo(f"    {warn}  localhost:{port} — {total} received, {errors} errors")
        else:
            click.echo(f"    {warn}  localhost:{port} — running but no data received yet")
    except Exception:
        click.echo(f"    {miss}  localhost:{port} — not reachable")


@otel.command()
@click.option("--port", default=None, type=int, help="aictl server port (default: $AICTL_PORT or 8484)")
def status(port: int | None):
    """Check OTel receiver health on the running aictl server."""
    port = port if port is not None else _default_port()
    import json
    import urllib.request
    import urllib.error

    url = f"http://localhost:{port}/api/otel-status"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read())
    except urllib.error.URLError:
        click.echo(f"Could not connect to aictl at localhost:{port}", err=True)
        raise SystemExit(1)

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
