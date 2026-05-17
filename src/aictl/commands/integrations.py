# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: hooks + otel + enable — integration commands."""

from __future__ import annotations

import difflib
import json
import os
import subprocess
import sys
from pathlib import Path

import click


def _run_env_persist(argv: list[str]) -> None:
    """Best-effort env persistence via an external tool (setx / launchctl).

    Never raises; surfaces non-zero exits as a warning on stderr and
    continues. argv is a list — never a shell string — so values that
    contain spaces or shell metacharacters can't inject commands.
    """
    try:
        result = subprocess.run(argv, check=False, capture_output=True, text=True)
    except OSError as exc:
        click.echo(f"warning: {argv[0]} failed: {exc}", err=True)
        return
    if result.returncode != 0:
        stderr = (result.stderr or "").strip() or f"exit {result.returncode}"
        click.echo(f"warning: {argv[0]} failed: {stderr}", err=True)


from .._hook_owner import (  # re-exported for tests
    _AICTL_OWNER_MARKER,
    _is_aictl_hook,
    _is_legacy_aictl_hook,
)
from ..platforms import (
    IS_MACOS,
    IS_WINDOWS,
    claude_global_dir,
    codex_global_dir,
    copilot_global_dir,
    gemini_global_dir,
    vscode_user_dir,
)
from ..utils import CorruptJSONError, WriteGuard, read_json_or_fail


def _read_json_strict(path: Path, *, force: bool = False) -> dict:
    """Thin CLI adapter around ``aictl.utils.read_json_or_fail``.

    Converts ``CorruptJSONError`` into ``click.ClickException`` so the CLI
    surfaces a clean actionable message (and non-zero exit) rather than a
    traceback. On ``force=True`` the underlying helper quarantines the
    corrupted original to a ``.bak.<timestamp>`` sibling before returning {}.
    """
    try:
        return read_json_or_fail(path, force=force)
    except CorruptJSONError as exc:
        raise click.ClickException(str(exc)) from exc


def _fetch_otel_status(port: int) -> dict | None:
    """GET /api/otel-status from the running aictl server. Returns dict or None."""
    import urllib.error
    import urllib.request

    try:
        with urllib.request.urlopen(f"http://localhost:{port}/api/otel-status", timeout=5) as resp:
            return json.loads(resp.read())
    except (OSError, urllib.error.URLError, ValueError):
        return None


# ─── hooks ───────────────────────────────────────────────────────────────────


# All Claude Code hook events — complete list as of 2026-03.
# Grouped by category for readability.
HOOK_EVENTS = [
    # Session lifecycle
    "SessionStart",
    "SessionEnd",
    "InstructionsLoaded",
    # User interaction
    "UserPromptSubmit",
    # Tool execution
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PermissionRequest",
    # Agent response
    "Stop",
    "StopFailure",
    # Subagents & teams
    "SubagentStart",
    "SubagentStop",
    "TeammateIdle",
    "TaskCreated",
    "TaskCompleted",
    # Notifications & file events
    "Notification",
    # Context compaction
    "PreCompact",
    "PostCompact",
    # Configuration
    "ConfigChange",
    # Worktrees
    "WorktreeCreate",
    "WorktreeRemove",
    # MCP elicitation
    "Elicitation",
    "ElicitationResult",
]


# Gemini CLI specific hook events (from official documentation)
GEMINI_HOOK_EVENTS = [
    "SessionStart",
    "SessionEnd",
    "BeforeAgent",
    "AfterAgent",
    "BeforeModel",
    "AfterModel",
    "BeforeToolSelection",
    "BeforeTool",
    "AfterTool",
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


# VS Code Copilot lifecycle events. The VS Code chat runtime loads hook
# files from ``chat.hookFilesLocations`` (defaults: ``.github/hooks``,
# ``~/.copilot/hooks``) and, with ``chat.useClaudeHooks=false`` (the
# default), only parses the Copilot-native flat schema:
#
#     {"hooks": {"EventName": [{"type": "command", "command": "..."}]}}
#
# Event set tracks the runtime enum in
# ``out/vs/workbench/workbench.desktop.main.js`` (as of VS Code 1.116).
# ``SessionEnd`` and ``ErrorOccurred`` were added in early 2026 releases.
VSCODE_HOOK_EVENTS = [
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
    "Stop",
    "ErrorOccurred",
]


_AICTL_ENV_BEGIN = "# >>> aictl env >>>"
_AICTL_ENV_END = "# <<< aictl env <<<"
_AICTL_ENV_SOURCE_BLOCK = (
    f'{_AICTL_ENV_BEGIN}\n[ -f "$HOME/.config/aictl/env.sh" ] && . "$HOME/.config/aictl/env.sh"\n{_AICTL_ENV_END}'
)


def _aictl_env_file() -> Path:
    """Path to the regenerated env.sh that shell profiles source."""
    return Path.home() / ".config" / "aictl" / "env.sh"


def _write_env_file(env_block: dict[str, str]) -> Path:
    """Regenerate ~/.config/aictl/env.sh atomically with the given env vars."""
    path = _aictl_env_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f'export {k}="{v}"' for k, v in env_block.items()]
    lines.append("# generated by aictl, do not edit")
    content = "\n".join(lines) + "\n"
    guard = WriteGuard.current()
    if guard:
        guard.confirm(path, "modify" if path.exists() else "create")
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(content, encoding="utf-8")
    os.replace(tmp, path)
    return path


def _strip_legacy_otel_block(content: str) -> str:
    """One-time migration: remove the OLD in-profile `_OTEL_MARKER` block.

    Old scheme inlined ``export`` lines inside the profile under a single
    marker line, with no closing marker. Strip the marker line plus the
    contiguous run of ``export``/blank lines that follow — but stop at
    anything else (including user comments) to avoid eating unrelated
    content.
    """
    if _OTEL_MARKER not in content:
        return content
    out: list[str] = []
    skipping = False
    for line in content.split("\n"):
        if not skipping and _OTEL_MARKER in line:
            skipping = True
            continue
        if skipping:
            stripped = line.strip()
            if stripped == "" or stripped.startswith("export "):
                continue
            skipping = False
        out.append(line)
    return "\n".join(out)


def _ensure_source_line_in_profiles(actions: list[str]) -> None:
    """Append the aictl env source block to shell profiles; idempotent.

    If the new-scheme begin marker is already present, leave the profile
    alone (aside from stripping any legacy inline block).
    """
    for profile in _shell_profiles():
        original = profile.read_text(encoding="utf-8") if profile.exists() else ""
        migrated = _strip_legacy_otel_block(original)
        has_new = _AICTL_ENV_BEGIN in migrated
        if has_new and migrated == original:
            continue  # already up-to-date
        if has_new:
            new_content = migrated
            label = f"Migrated legacy OTel block in {profile}"
        else:
            sep = "" if migrated == "" or migrated.endswith("\n") else "\n"
            new_content = migrated + sep + _AICTL_ENV_SOURCE_BLOCK + "\n"
            label = f"Created {profile}" if not profile.exists() else f"Updated {profile}"
        guard = WriteGuard.current()
        if guard:
            guard.confirm(profile, "modify" if profile.exists() else "create")
        profile.parent.mkdir(parents=True, exist_ok=True)
        profile.write_text(new_content, encoding="utf-8")
        actions.append(label)


def _update_shell_profiles_block(
    marker: str,  # kept for signature compat; unused under sourced-file scheme
    env_block: dict[str, str],
    actions: list[str],
    update_label: str = "Updated {profile}",
    create_label: str = "Created {profile}",
) -> None:
    """Write env vars to ~/.config/aictl/env.sh and ensure profiles source it."""
    env_path = _write_env_file(env_block)
    actions.append(f"Wrote env vars → {env_path} ({len(env_block)} vars)")
    # Translate static labels into per-profile action entries via wrapper.
    profile_actions: list[str] = []
    _ensure_source_line_in_profiles(profile_actions)
    for entry in profile_actions:
        if entry.startswith("Updated "):
            profile = entry[len("Updated ") :]
            actions.append(update_label.format(profile=profile))
        elif entry.startswith("Created "):
            profile = entry[len("Created ") :]
            actions.append(create_label.format(profile=profile))
        else:
            actions.append(entry)


def _settings_path(scope: str) -> Path:
    """Return the Claude Code settings path for the given scope."""
    if scope == "project":
        # Use settings.local.json — hooks contain localhost:PORT which is
        # machine-specific and must not be committed to git.
        return Path.cwd() / ".claude" / "settings.local.json"
    # User-level: ~/.claude/settings.json (macOS/Linux) or
    # %APPDATA%\Claude\settings.json (Windows)
    return claude_global_dir() / "settings.json"


_AICTL_HOOK_MARKERS = ("/api/hooks", "aictl.hook_handler")  # kept for backward-compat imports


def _python_cmd() -> str:
    """Return a quoted path to the current Python interpreter.

    Using sys.executable ensures we invoke the exact same Python that runs
    aictl — correct venv, correct version — on every platform including
    Windows where 'python3' is not available.
    """
    exe = sys.executable
    # Quote the path in case it contains spaces (common on Windows).
    return f'"{exe}"'


def _sanitize_project_name(name: str) -> str:
    """Coerce an arbitrary directory basename into a safe source-id token.

    Rules: lowercase; any char not in ``[a-z0-9_-]`` becomes ``-``; runs of
    ``-`` collapse to a single ``-``; leading/trailing ``-`` are stripped.
    Empty → ``"unknown"``. The result is safe to embed in a shell token
    without quoting.
    """
    import re

    if not name:
        return "unknown"
    lowered = name.lower()
    replaced = re.sub(r"[^a-z0-9_-]+", "-", lowered)
    collapsed = re.sub(r"-{2,}", "-", replaced).strip("-")
    return collapsed or "unknown"


def _source_id(scope: str, tool: str) -> str:
    """Compute the ``--source`` identifier stamped on installed hook commands.

    Shape: ``<project|root>.<tool>-<scope>``. ``root`` is used for user
    scope; project scope uses the sanitized ``cwd`` basename.
    """
    safe_tool = _sanitize_project_name(tool)
    if scope == "user":
        return f"root.{safe_tool}-user"
    project = _sanitize_project_name(Path.cwd().name)
    return f"{project}.{safe_tool}-project"


def _build_hook_config(
    port: int,
    events: list[str] | None,
    event_map: dict[str, str] | None = None,
    matcher: str = "",
    *,
    source_tool: str = "claude",
    scope: str = "user",
) -> dict:
    """Build the hooks configuration dict for AI tools.

    Each hook invokes ``python -m aictl.hook_handler`` which reads the
    rich JSON payload from stdin, merges environment variables, POSTs
    everything to aictl, and passes the payload through to stdout.

    Using a module invocation instead of an inline ``-c`` one-liner
    avoids shell-escaping issues on Windows and complex quoting.

    Optional event_map can translate internal HOOK_EVENTS names to tool-specific names.
    matcher: "" for Claude (default), "*" for Gemini.
    source_tool/scope: stamp the command with a ``--source <id>`` flag so
    events can be attributed to the exact wrapper that emitted them.
    """
    target_events = events or HOOK_EVENTS
    hooks: dict[str, list[dict]] = {}
    python = _python_cmd()
    source_id = _source_id(scope, source_tool)

    for event in target_events:
        tool_event_name = event_map.get(event, event) if event_map else event
        cmd = f"{python} -m aictl.hook_handler --event {event} --port {port} --source {source_id}"
        hooks[tool_event_name] = [
            {
                "_aictl_owner": _AICTL_OWNER_MARKER,
                "matcher": matcher,
                "hooks": [{"type": "command", "command": cmd}],
            }
        ]
    return hooks


@click.group()
def hooks():
    """Manage hook event integration with AI coding tools."""


@hooks.command()
@click.option("--port", default=None, type=int, help="aictl server port (default: $AICTL_PORT or 8484)")
@click.option(
    "--scope", type=click.Choice(["project", "user"]), default="user", help="Install hooks at project or user level"
)
@click.option("--events", default=None, help="Comma-separated event names (default: all)")
@click.option(
    "--force",
    is_flag=True,
    help="Install even if non-aictl hooks exist on the same events, and overwrite a corrupted settings.json",
)
@click.option("--dry-run", is_flag=True, help="Print the settings.json diff that would be applied and exit 0")
def install(port: int | None, scope: str, events: str | None, force: bool, dry_run: bool):
    """Configure Claude Code to push hook events to aictl.

    Adds command-based hooks to Claude Code's settings that read the
    full event payload from stdin and POST it to aictl's /api/hooks
    endpoint. This captures all rich data: tool names, inputs/outputs,
    token counts, file paths, and event-specific fields.

    If non-aictl hooks already exist on the same events, installation
    is rejected unless --force is passed.
    """
    if not dry_run:
        guard = WriteGuard.install("hooks install")
    if port is None:
        port = _default_port()
    event_list = [e.strip() for e in events.split(",")] if events else None
    if event_list:
        invalid = [e for e in event_list if e not in HOOK_EVENTS]
        if invalid:
            raise click.ClickException(f"Unknown events: {', '.join(invalid)}. Valid events: {', '.join(HOOK_EVENTS)}")

    settings_path = _settings_path(scope)
    if not dry_run:
        settings_path.parent.mkdir(parents=True, exist_ok=True)

    # Read existing settings (strict: refuse to silently clobber corrupt JSON)
    existing: dict = _read_json_strict(settings_path, force=force)
    before_snapshot = json.loads(json.dumps(existing))  # deep copy for diff

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
        click.echo("\nUse --force to install alongside existing hooks.", err=True)
        raise SystemExit(1)

    # Merge hooks into existing settings (per-event, preserving user hooks)
    hook_config = _build_hook_config(port, event_list, source_tool="claude", scope=scope)
    for event, new_rules in hook_config.items():
        current = existing_hooks.get(event, [])
        # Remove old aictl entries, keep user hooks
        current = [h for h in current if not _is_aictl_hook(h)]
        current.extend(new_rules)
        existing_hooks[event] = current
    existing["hooks"] = existing_hooks

    if dry_run:
        _print_settings_diff(settings_path, before_snapshot, existing)
        click.echo(f"\n[dry-run] Would install {len(target_events)} hook events → localhost:{port}/api/hooks")
        return

    guard.confirm(settings_path, "modify")
    settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")

    click.echo(f"Installed {len(target_events)} hook events → localhost:{port}/api/hooks")
    click.echo(f"  Scope: {scope} ({settings_path})")
    click.echo("  Mode: stdin passthrough (reads full event payload)")
    if conflicts:
        click.echo(f"  Note: {len(conflicts)} event(s) have additional non-aictl hooks (preserved)")


@hooks.command()
@click.option(
    "--scope", type=click.Choice(["project", "user"]), default="user", help="Remove hooks at project or user level"
)
@click.option("--force", is_flag=True, help="Overwrite a corrupted settings.json instead of refusing")
@click.option("--dry-run", is_flag=True, help="Print the settings.json diff that would be applied and exit 0")
def uninstall(scope: str, force: bool, dry_run: bool):
    """Remove aictl hook configuration from Claude Code settings."""
    if not dry_run:
        guard = WriteGuard.install("hooks uninstall")
    settings_path = _settings_path(scope)
    if not settings_path.exists():
        click.echo("No settings file found.")
        return

    existing = _read_json_strict(settings_path, force=force)
    before_snapshot = json.loads(json.dumps(existing))

    hooks_config = existing.get("hooks", {})
    removed = 0
    for event in HOOK_EVENTS:
        if event in hooks_config:
            # Remove only aictl-related hook entries
            hooks_config[event] = [h for h in hooks_config[event] if not _is_aictl_hook(h)]
            if not hooks_config[event]:
                del hooks_config[event]
            removed += 1

    if hooks_config:
        existing["hooks"] = hooks_config
    elif "hooks" in existing:
        del existing["hooks"]

    if dry_run:
        _print_settings_diff(settings_path, before_snapshot, existing)
        click.echo(f"\n[dry-run] Would remove aictl hooks from {settings_path}")
        return

    guard.confirm(settings_path, "modify")
    settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    click.echo(f"Removed aictl hooks from {settings_path}")

    # Also remove the VS Code Copilot hook file (scope-symmetric).
    vscode_actions: list[str] = []
    _uninstall_vscode_hooks(scope, vscode_actions)
    for action in vscode_actions:
        click.echo(action)


def _print_settings_diff(path: Path, before: dict, after: dict) -> None:
    """Print a unified diff of two JSON settings blobs."""
    before_text = json.dumps(before, indent=2, sort_keys=True).splitlines(keepends=True)
    after_text = json.dumps(after, indent=2, sort_keys=True).splitlines(keepends=True)
    if before_text == after_text:
        click.echo(f"[dry-run] No changes to {path}.")
        return
    diff = difflib.unified_diff(
        before_text,
        after_text,
        fromfile=f"{path} (current)",
        tofile=f"{path} (proposed)",
    )
    click.echo("".join(diff), nl=False)


# ─── hooks doctor / verify ──────────────────────────────────────────────────


def _iter_installed_aictl_hooks(settings_path: Path):
    """Yield (event, rule_dict) for every aictl-owned hook in *settings_path*.

    The rule dict is the nested {"matcher", "hooks": [...]} shape produced by
    ``_build_hook_config``. Emits legacy entries too — the caller decides
    how to classify them.
    """
    if not settings_path.exists():
        return
    try:
        settings = read_json_or_fail(settings_path)
    except CorruptJSONError:
        return
    hooks_cfg = settings.get("hooks", {})
    if not isinstance(hooks_cfg, dict):
        return
    for event, rules in hooks_cfg.items():
        if not isinstance(rules, list):
            continue
        for rule in rules:
            if isinstance(rule, dict) and _is_aictl_hook(rule):
                yield event, rule


def _extract_hook_command(rule: dict) -> str:
    """Return the command string from an aictl hook rule (nested or flat)."""
    inner = rule.get("hooks")
    if isinstance(inner, list) and inner and isinstance(inner[0], dict):
        return str(inner[0].get("command", ""))
    return str(rule.get("command", ""))


def _shlex_split_cmd(cmd: str) -> list[str]:
    """Split a command string using shlex; posix=False on Windows to handle quotes."""
    import shlex

    try:
        return shlex.split(cmd, posix=not IS_WINDOWS)
    except ValueError:
        return cmd.split()


def _extract_port_from_cmd(cmd: str) -> int | None:
    tokens = _shlex_split_cmd(cmd)
    for i, tok in enumerate(tokens):
        if tok == "--port" and i + 1 < len(tokens):
            try:
                return int(tokens[i + 1])
            except ValueError:
                return None
        if tok.startswith("--port="):
            try:
                return int(tok.split("=", 1)[1])
            except ValueError:
                return None
    return None


def _hook_cmd_summary(cmd: str, max_len: int = 60) -> str:
    if len(cmd) <= max_len:
        return cmd
    return cmd[: max_len - 3] + "..."


def _doctor_check_one(event: str, rule: dict) -> dict:
    """Run static checks against a single hook rule. Returns a result dict."""
    import shutil

    cmd = _extract_hook_command(rule)
    tokens = _shlex_split_cmd(cmd)
    interp = tokens[0].strip('"') if tokens else ""
    port = _extract_port_from_cmd(cmd)

    owner = rule.get("_aictl_owner")
    legacy = owner != _AICTL_OWNER_MARKER and _is_legacy_aictl_hook(rule)

    status = "OK"
    reasons: list[str] = []

    if not tokens:
        status = "FAIL"
        reasons.append("empty command")
    else:
        # Check 1: interpreter resolvable
        is_path_like = any(sep in interp for sep in ("/", "\\"))
        if is_path_like:
            p = Path(interp)
            if not p.exists():
                status = "FAIL"
                reasons.append(f"interpreter not found: {interp}")
            elif not os.access(str(p), os.X_OK) and not IS_WINDOWS:
                status = "FAIL"
                reasons.append(f"interpreter not executable: {interp}")
        else:
            if shutil.which(interp) is None:
                status = "FAIL"
                reasons.append(f"command not on PATH: {interp}")

        # Check 2: aictl importable from this interpreter (only when -m aictl.hook_handler)
        if status != "FAIL" and "-m aictl.hook_handler" in cmd:
            try:
                probe = subprocess.run(
                    [interp, "-c", "import aictl.hook_handler"],
                    capture_output=True,
                    timeout=5,
                    text=True,
                )
                if probe.returncode != 0:
                    status = "FAIL"
                    err = (probe.stderr or "").strip().splitlines()[-1:]
                    reasons.append(f"aictl not importable: {' '.join(err) or 'import failed'}")
            except (OSError, subprocess.TimeoutExpired) as exc:
                status = "FAIL"
                reasons.append(f"import probe failed: {exc}")

    if legacy:
        # Legacy takes WARN unless something else already FAILed.
        if status == "OK":
            status = "WARN"
        reasons.append("legacy aictl version (missing current owner marker)")

    return {
        "event": event,
        "command": cmd,
        "command_summary": _hook_cmd_summary(cmd),
        "interpreter": interp,
        "port": port,
        "owner": owner,
        "legacy": legacy,
        "status": status,
        "reasons": reasons,
    }


def _iter_installed_vscode_hooks(hook_path: Path):
    """Yield (event, rule_dict) for every aictl-owned Copilot flat hook entry."""
    if not hook_path.exists():
        return
    try:
        data = read_json_or_fail(hook_path)
    except CorruptJSONError:
        return
    hooks_cfg = data.get("hooks", {})
    if not isinstance(hooks_cfg, dict):
        return
    for event, rules in hooks_cfg.items():
        if not isinstance(rules, list):
            continue
        for rule in rules:
            if isinstance(rule, dict) and _is_aictl_hook(rule):
                yield event, rule


def _collect_doctor_results(scope: str) -> list[dict]:
    settings_path = _settings_path(scope)
    results = [_doctor_check_one(event, rule) for event, rule in _iter_installed_aictl_hooks(settings_path)]
    vscode_path = _vscode_hook_settings_path(scope)
    results.extend(
        _doctor_check_one(event, rule)
        for event, rule in _iter_installed_vscode_hooks(vscode_path)
    )
    return results


def _emit_doctor_text(results: list[dict], settings_path: Path) -> None:
    if not results:
        click.echo(f"No aictl hooks found in {settings_path}")
        return
    click.echo(f"Checking {len(results)} aictl hook(s) in {settings_path}")
    for r in results:
        reason = "; ".join(r["reasons"]) if r["reasons"] else ""
        tag = f"[{r['status']}]"
        line = f"  {tag} {r['event']} -> {r['command_summary']}"
        if reason:
            line += f"   {reason}"
        if r["port"] is not None:
            line += f"   port={r['port']}"
        click.echo(line)


@hooks.command(name="doctor")
@click.option(
    "--scope", type=click.Choice(["project", "user"]), default="user", help="Check hooks at project or user level"
)
@click.option("--json", "as_json", is_flag=True, help="Emit machine-readable JSON")
def doctor(scope: str, as_json: bool):
    """Run static health checks against installed aictl hooks.

    Verifies the interpreter exists, ``aictl`` is importable from it, and
    flags entries left behind by a previous aictl version. No network
    calls — see ``aictl hooks verify`` for a live ping.
    """
    settings_path = _settings_path(scope)
    results = _collect_doctor_results(scope)
    if as_json:
        click.echo(
            json.dumps(
                {
                    "settings_path": str(settings_path),
                    "results": results,
                },
                indent=2,
            )
        )
    else:
        _emit_doctor_text(results, settings_path)
    if any(r["status"] == "FAIL" for r in results):
        raise SystemExit(1)


def _hook_verify_ping(port: int, event: str, timeout: float = 5.0) -> dict:
    """POST a synthetic hook payload. Returns {status, detail}."""
    import urllib.error
    import urllib.request

    payload = json.dumps(
        {
            "event": event,
            "session_id": "aictl-verify",
            "_aictl_verify": True,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"http://localhost:{port}/api/hooks",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
            if 200 <= code < 300:
                return {"status": "OK", "http": code, "detail": f"HTTP {code}"}
            return {"status": "WARN", "http": code, "detail": f"HTTP {code}"}
    except urllib.error.HTTPError as exc:
        return {"status": "WARN", "http": exc.code, "detail": f"HTTP {exc.code}"}
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        msg = str(reason)
        if "refused" in msg.lower():
            return {"status": "FAIL", "http": None, "detail": f"server not running on port {port}"}
        if "timed out" in msg.lower() or isinstance(reason, TimeoutError):
            return {"status": "FAIL", "http": None, "detail": "timeout"}
        return {"status": "FAIL", "http": None, "detail": msg}
    except TimeoutError:
        return {"status": "FAIL", "http": None, "detail": "timeout"}
    except OSError as exc:
        return {"status": "FAIL", "http": None, "detail": str(exc)}


@hooks.command(name="verify")
@click.option(
    "--scope", type=click.Choice(["project", "user"]), default="user", help="Check hooks at project or user level"
)
@click.option("--port", default=None, type=int, help="Override port discovered from each hook's command")
@click.option("--json", "as_json", is_flag=True, help="Emit machine-readable JSON")
def verify_hooks(scope: str, port: int | None, as_json: bool):
    """Live-check every installed aictl hook by POSTing a synthetic payload.

    Runs the same static checks as ``hooks doctor``, then pings each hook's
    port with ``{"_aictl_verify": true}``. The aictl server may log these as
    events; that's noise but harmless.
    """
    settings_path = _settings_path(scope)
    static_results = _collect_doctor_results(scope)
    combined: list[dict] = []
    for r in static_results:
        entry = dict(r)
        if r["status"] == "FAIL":
            entry["verify"] = {"status": "SKIP", "detail": "static check failed"}
        else:
            target_port = port if port is not None else r["port"]
            if target_port is None:
                entry["verify"] = {"status": "FAIL", "detail": "no --port in hook command"}
                entry["status"] = "FAIL"
            else:
                res = _hook_verify_ping(target_port, r["event"])
                entry["verify"] = res
                # Verify status dominates the final status for live check
                entry["status"] = res["status"]
        combined.append(entry)

    if as_json:
        click.echo(
            json.dumps(
                {
                    "settings_path": str(settings_path),
                    "results": combined,
                },
                indent=2,
            )
        )
    else:
        if not combined:
            click.echo(f"No aictl hooks found in {settings_path}")
        else:
            click.echo(f"Live-checking {len(combined)} aictl hook(s) in {settings_path}")
            click.echo("Note: verify payloads carry _aictl_verify:true and may appear in the event feed as noise.")
            for r in combined:
                v = r.get("verify", {})
                tag = f"[{r['status']}]"
                click.echo(f"  {tag} {r['event']} -> {_hook_cmd_summary(r['command'])}   {v.get('detail', '')}")
    if any(r["status"] == "FAIL" for r in combined):
        raise SystemExit(1)


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
@click.option("--port", default=None, type=int, help="aictl server port (default: $AICTL_PORT or 8484)")
@click.option(
    "--tool",
    type=click.Choice(["claude", "copilot", "codex", "gemini", "all"]),
    default="all",
    help="Which tool(s) to configure",
)
@click.option(
    "--print", "print_only", is_flag=True, help="Print shell exports to stdout instead of persisting (for eval)"
)
@click.option(
    "--shell",
    type=click.Choice(["bash", "zsh", "fish", "powershell"]),
    default=None,
    help="Shell format for --print output (auto-detected)",
)
@click.option("--force", is_flag=True, help="Overwrite corrupted settings.json files instead of refusing")
def enable(port: int | None, tool: str, print_only: bool, shell: str | None, force: bool):
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
            _run_env_persist(["setx", key, val])
            os.environ[key] = val
        actions.append(f"Windows user env vars set via setx ({len(env_block)} vars)")
        actions.append("Note: new terminals will inherit these; current session updated")
    else:
        # Unix: append to shell profiles
        _update_shell_profiles_block(_OTEL_MARKER, env_block, actions)

    # ── macOS launchctl (for GUI apps) ──────────────────────────
    if IS_MACOS:
        for key, val in env_block.items():
            _run_env_persist(["launchctl", "setenv", key, val])
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
                settings = _read_json_strict(settings_path, force=force)
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
                        f.write(f'\n[otel]\nenabled = true\nendpoint = "{endpoint}"\n')
                    actions.append(f"Codex config: added [otel] to {codex_toml}")
                else:
                    actions.append(f"Codex config: [otel] already present in {codex_toml}")
            else:
                codex_toml.parent.mkdir(parents=True, exist_ok=True)
                codex_toml.write_text(f'[otel]\nenabled = true\nendpoint = "{endpoint}"\n', encoding="utf-8")
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
        env.update(
            {
                "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
                "OTEL_METRICS_EXPORTER": "otlp",
                "OTEL_LOGS_EXPORTER": "otlp",
                "OTEL_LOG_USER_PROMPTS": "1",
                "OTEL_LOG_TOOL_DETAILS": "1",
            }
        )

    if "copilot" in tools:
        env.update(
            {
                "COPILOT_OTEL_ENABLED": "true",
                "COPILOT_OTEL_ENDPOINT": endpoint,
            }
        )

    if "codex" in tools:
        env.update(
            {
                "CODEX_OTEL_ENABLED": "1",
                "CODEX_OTEL_ENDPOINT": endpoint,
            }
        )

    if "gemini" in tools:
        env.update(
            {
                "GEMINI_OTEL_ENABLED": "1",
                "OTEL_METRICS_EXPORTER": "otlp",
                "OTEL_LOGS_EXPORTER": "otlp",
            }
        )

    env.update(
        {
            "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
            "OTEL_EXPORTER_OTLP_ENDPOINT": endpoint,
        }
    )
    return env


_OTEL_MARKER = "# ── aictl: OTel for AI tools ──"  # legacy marker — used only for migration


def _shell_profiles() -> list:
    """Return shell profile paths to update.

    Writes to both ~/.bashrc and ~/.zshrc when either exists, so the
    sourced env.sh stays available when users switch shells. If neither
    exists, fall back to a single file matching $SHELL (or ~/.bashrc).
    """
    home = Path.home()
    shell = os.environ.get("SHELL", "")
    if "fish" in shell:
        return [home / ".config" / "fish" / "config.fish"]
    bashrc = home / ".bashrc"
    zshrc = home / ".zshrc"
    existing = [p for p in (bashrc, zshrc) if p.exists()]
    if existing:
        # Also include ~/.bash_profile if it exists (macOS default login shell).
        bp = home / ".bash_profile"
        if bp.exists() and bp not in existing:
            existing.append(bp)
        return existing
    # No profile yet — create one for the current shell.
    return [zshrc if "zsh" in shell else bashrc]


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


def _write_json_settings(path: Path, updates: dict, *, force: bool = False) -> str:
    """Merge updates into an existing JSON settings file. Returns status string."""
    if path.exists():
        existing = _read_json_strict(path, force=force)
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


def _vscode_hook_settings_path(scope: str) -> Path:
    """Return the VS Code Copilot hook file path for the given scope.

    aictl owns a single file per scope so uninstall is trivial (delete
    the file). The file is one of the default entries in VS Code's
    ``chat.hookFilesLocations``.
    """
    if scope == "project":
        return Path.cwd() / ".github" / "hooks" / "aictl.json"
    return copilot_global_dir() / "hooks" / "aictl.json"


def _build_vscode_hook_config(
    port: int, events: list[str] | None, *, scope: str
) -> dict[str, list[dict]]:
    """Build the Copilot-native flat hook config.

    Copilot loads ``{"hooks": {"EventName": [{"type":"command","command":"..."}]}}``.
    Each command entry carries the ``_aictl_owner`` marker so doctor / diff
    tooling can attribute it back to us. VS Code ignores unknown keys in
    hook entries, so the marker is safe to include.
    """
    target_events = events or VSCODE_HOOK_EVENTS
    python = _python_cmd()
    source_id = _source_id(scope, "vscode")
    hooks: dict[str, list[dict]] = {}
    for event in target_events:
        cmd = f"{python} -m aictl.hook_handler --event {event} --port {port} --source {source_id}"
        hooks[event] = [
            {
                "type": "command",
                "command": cmd,
                "_aictl_owner": _AICTL_OWNER_MARKER,
            }
        ]
    return hooks


def _install_vscode_hooks(
    scope: str, port: int, actions: list[str], *, force: bool = False  # noqa: ARG001
) -> None:
    """Install VS Code Copilot hooks at the given scope.

    Writes a dedicated ``aictl.json`` hook file (user: ``~/.copilot/hooks/``;
    project: ``.github/hooks/``). Because the file is aictl-owned end to end
    the installer just replaces it; ``force`` is accepted for signature parity
    with the Claude/Gemini installers but is not needed.
    """
    try:
        hook_path = _vscode_hook_settings_path(scope)
    except (KeyError, OSError) as exc:
        actions.append(f"VS Code Copilot hooks FAILED ({exc})")
        return

    hook_path.parent.mkdir(parents=True, exist_ok=True)
    hook_config = _build_vscode_hook_config(port, None, scope=scope)
    payload = {"hooks": hook_config}
    guard = WriteGuard.current()
    if guard:
        guard.confirm(hook_path, "modify" if hook_path.exists() else "create")
    hook_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    actions.append(
        f"VS Code Copilot hooks ({len(VSCODE_HOOK_EVENTS)} events) → {hook_path}"
    )


def _uninstall_vscode_hooks(scope: str, actions: list[str]) -> None:
    """Remove the aictl-owned VS Code Copilot hook file if present.

    The file is wholly owned by aictl (one file per scope, created by
    ``_install_vscode_hooks``), so removal is a direct delete.
    """
    hook_path = _vscode_hook_settings_path(scope)
    if not hook_path.exists():
        return
    # Defensive: only remove if the file actually looks like one of ours.
    try:
        data = read_json_or_fail(hook_path)
    except CorruptJSONError:
        return
    if not _vscode_hook_file_is_ours(data):
        actions.append(f"VS Code Copilot hooks left intact at {hook_path} (not aictl-owned)")
        return
    guard = WriteGuard.current()
    if guard:
        guard.confirm(hook_path, "delete")
    hook_path.unlink()
    actions.append(f"Removed aictl VS Code Copilot hooks → {hook_path}")


def _vscode_hook_file_is_ours(data: dict) -> bool:
    """True if every hook entry in a Copilot hook file carries the aictl marker."""
    if not isinstance(data, dict):
        return False
    hooks_cfg = data.get("hooks", {})
    if not isinstance(hooks_cfg, dict) or not hooks_cfg:
        return False
    for rules in hooks_cfg.values():
        if not isinstance(rules, list):
            return False
        for rule in rules:
            if not _is_aictl_hook(rule):
                return False
    return True


def _install_hooks(scope: str, port: int, actions: list[str], *, force: bool = False) -> None:
    """Install Claude Code hooks and report actions."""
    if scope == "project":
        settings_path = Path.cwd() / ".claude" / "settings.local.json"
    else:
        settings_path = claude_global_dir() / "settings.json"

    settings_path.parent.mkdir(parents=True, exist_ok=True)

    existing: dict = _read_json_strict(settings_path, force=force)

    existing_hooks = existing.get("hooks", {})
    # Purge ALL old aictl hooks from ALL event keys first
    # This cleans up events that may have been renamed or removed (like Claude->Gemini map)
    for ev in list(existing_hooks.keys()):
        cleaned = [h for h in existing_hooks[ev] if not _is_aictl_hook(h)]
        if not cleaned:
            del existing_hooks[ev]
        else:
            existing_hooks[ev] = cleaned

    hook_config = _build_hook_config(port, None, source_tool="claude", scope=scope)
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
    g_existing: dict = _read_json_strict(gemini_path, force=force)
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
    hook_config = _build_hook_config(
        port, gemini_only_events, event_map=GEMINI_HOOK_MAP, matcher="*", source_tool="gemini", scope=scope
    )

    for tool_event, new_rules in hook_config.items():
        g_hooks.setdefault(tool_event, []).extend(new_rules)
    g_existing["hooks"] = g_hooks

    if guard:
        guard.confirm(gemini_path, "modify")
    gemini_path.write_text(json.dumps(g_existing, indent=2) + "\n", encoding="utf-8")
    actions.append(f"Gemini CLI hooks ({len(GEMINI_HOOK_MAP)} events) → {gemini_path}")

    # VS Code Copilot hooks — separate file under chat.hookFilesLocations
    # defaults (``.github/hooks`` for project, ``~/.copilot/hooks`` for user).
    _install_vscode_hooks(scope, port, actions, force=force)


def _enable_otel(port: int, actions: list[str], *, force: bool = False) -> None:
    """Enable OTel for all tools and report actions."""
    endpoint = f"http://localhost:{port}"
    tools = ["claude", "copilot", "codex", "gemini"]
    env_block = _build_env_block(port, tools)

    if IS_WINDOWS:
        for key, val in env_block.items():
            _run_env_persist(["setx", key, val])
            os.environ[key] = val
        actions.append(f"OTel env vars → Windows user environment ({len(env_block)} vars via setx)")
        actions.append("  Note: new terminals will inherit; current session updated")
    else:
        _update_shell_profiles_block(
            _OTEL_MARKER,
            env_block,
            actions,
            update_label="OTel env vars → {profile}",
            create_label="OTel env vars → {profile} (created)",
        )

    if IS_MACOS:
        for key, val in env_block.items():
            _run_env_persist(["launchctl", "setenv", key, val])
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
        status = _write_json_settings(settings_path, otel_settings, force=force)
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


def _enable_vscode(scope: str, port: int, actions: list[str], *, force: bool = False) -> None:
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
        status = _write_json_settings(settings_path, _VSCODE_AGENT_SETTINGS, force=force)
        n = len(_VSCODE_AGENT_SETTINGS)
        actions.append(f"VS Code agent/hooks/context ({n} settings) → {settings_path} ({status})")
    except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
        actions.append(f"VS Code agent settings → {settings_path} FAILED ({exc})")


@click.command("enable")
@click.option(
    "--scope",
    type=click.Choice(["user", "project"]),
    default="user",
    help="user: global (default)  project: write to cwd/.claude/ and .vscode/",
)
@click.option("--port", default=None, type=int, help="aictl server port (default: $AICTL_PORT or 8484)")
@click.option("--dry-run", is_flag=True, help="Show what would be done without writing anything")
@click.option("--force", is_flag=True, help="Overwrite corrupted settings.json files instead of refusing")
def enable(scope: str, port: int | None, dry_run: bool, force: bool) -> None:
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

        vscode_hooks_path = _vscode_hook_settings_path(scope)

        click.echo(f"  [hooks]  {hooks_path}")
        click.echo(f"           {len(HOOK_EVENTS)} Claude Code events → {endpoint}/api/hooks")
        click.echo(f"  [hooks]  {gemini_hooks_path}")
        click.echo(f"           {len(GEMINI_HOOK_MAP)} Gemini CLI events → {endpoint}/api/hooks")
        click.echo(f"  [hooks]  {vscode_hooks_path}")
        click.echo(f"           {len(VSCODE_HOOK_EVENTS)} VS Code Copilot events → {endpoint}/api/hooks")
        if IS_WINDOWS:
            click.echo(
                f"  [otel]   Windows env vars via setx ({len(_build_env_block(port, ['claude', 'copilot', 'codex', 'gemini']))} vars)"
            )
        else:
            for p in _shell_profiles():
                click.echo(f"  [otel]   {p}")
            if IS_MACOS:
                click.echo("  [otel]   macOS launchctl")
        click.echo(f"  [otel]   {vscode_path} (Copilot OTel keys)")
        click.echo(f"  [vscode] {vscode_path} ({len(_VSCODE_AGENT_SETTINGS)} agent/hooks/context keys)")
        return

    actions: list[str] = []

    _install_hooks(scope, port, actions, force=force)
    _enable_otel(port, actions, force=force)
    _enable_vscode(scope, port, actions, force=force)

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
