# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: hooks + otel + enable — integration commands."""

from __future__ import annotations

import difflib
import json
import os
import re
import shlex
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


from .. import mutation_ledger
from .._hook_owner import (  # re-exported for tests
    _AICTL_OWNER_MARKER,
    _is_aictl_hook,
    _is_legacy_aictl_hook,
    merge_aictl_hooks,
    strip_aictl_hooks,
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


def _ledger_command() -> str:
    """Name of the running CLI command for ledger entries (``aictl`` outside click)."""
    ctx = click.get_current_context(silent=True)
    return ctx.command_path if ctx is not None else "aictl"


def _write_text_atomic(path: Path, content: str) -> None:
    """Write *content* to *path* atomically and record it in the mutation ledger.

    Every settings / hook / env file aictl touches goes through here. The
    previous code used bare ``write_text`` at eight sites: a crash mid-write
    left a truncated ``~/.claude/settings.json``, and ``aictl disable`` —
    which plans its reverts from the ledger — never saw any of these files.
    No ``.bak`` sibling is dropped next to the user's settings; the ledger
    keeps the previous bytes instead.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    previous: bytes | None = None
    if path.exists():
        try:
            previous = path.read_bytes()
        except OSError:
            previous = None
    tmp = path.with_name(path.name + ".aictl-tmp")
    try:
        tmp.write_text(content, encoding="utf-8")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
    mutation_ledger.record(
        command=_ledger_command(),
        path=path,
        op="modify" if previous is not None else "create",
        previous_content=previous,
        new_content=content.encode("utf-8"),
    )


def _write_json_atomic(path: Path, data: dict, *, indent: int = 2) -> None:
    _write_text_atomic(path, json.dumps(data, indent=indent) + "\n")


def _delete_with_ledger(path: Path) -> None:
    try:
        previous: bytes | None = path.read_bytes()
    except OSError:
        previous = None
    path.unlink()
    mutation_ledger.record(
        command=_ledger_command(), path=path, op="delete", previous_content=previous, new_content=None
    )


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


# Claude Code hook events aictl can observe without event-specific matcher data.
# Grouped by category for readability.
HOOK_EVENTS = [
    # Session lifecycle
    "SessionStart",
    "Setup",
    "SessionEnd",
    "InstructionsLoaded",
    # User interaction
    "UserPromptSubmit",
    "UserPromptExpansion",
    # Tool execution
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PostToolBatch",
    "PermissionRequest",
    "PermissionDenied",
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
    "CwdChanged",
    "DirectoryAdded",
    # Model switches (/model, fallback)
    "PreModelSwitch",
    "PostModelSwitch",
    # FileChanged is intentionally omitted: Claude uses its matcher to build a
    # literal watch list, so an empty catch-all hook would not observe changes.
    # Worktrees. WorktreeCreate is intentionally omitted: configuring ANY
    # WorktreeCreate hook replaces Claude's default `git worktree` creation
    # and Claude reads the hook's stdout as the new worktree path — an
    # observer hook that echoes JSON makes `claude --worktree` and
    # Agent(isolation="worktree") fail. WorktreeRemove is a plain
    # side-effect event and safe to observe.
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

# Map internal HOOK_EVENTS (Claude-style) to Gemini CLI events.
# Values must be unique: _build_hook_config writes ONE rule per tool event,
# so two internal events mapping to the same Gemini event would collide and
# the later one would silently replace the first (PostToolUseFailure used to
# shadow PostToolUse under AfterTool, so every Gemini tool call was recorded
# as a failure). Gemini's AfterTool/AfterAgent already fire for both success
# and failure, so the *Failure variants have no separate Gemini event.
GEMINI_HOOK_MAP = {
    "SessionStart": "SessionStart",
    "SessionEnd": "SessionEnd",
    "UserPromptSubmit": "BeforeAgent",
    "PreToolUse": "BeforeTool",
    "PostToolUse": "AfterTool",
    "Stop": "AfterAgent",
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


# Env var names must be valid shell identifiers — anything else could smuggle
# shell syntax into sourced profiles / eval'd output.
_ENV_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _validate_env_key(key: str) -> str:
    """Return *key* if it is a valid env var name, else raise ValueError."""
    if not _ENV_KEY_RE.match(key):
        raise ValueError(f"Invalid environment variable name: {key!r}")
    return key


def _write_env_file(env_block: dict[str, str]) -> Path:
    """Regenerate ~/.config/aictl/env.sh atomically with the given env vars."""
    path = _aictl_env_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"export {_validate_env_key(k)}={shlex.quote(str(v))}" for k, v in env_block.items()]
    lines.append("# generated by aictl, do not edit")
    content = "\n".join(lines) + "\n"
    guard = WriteGuard.current()
    if guard:
        guard.confirm(path, "modify" if path.exists() else "create")
    _write_text_atomic(path, content)
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


def _ensure_source_line_in_profiles() -> list[tuple[Path, str]]:
    """Append the aictl env source block to shell profiles; idempotent.

    If the new-scheme begin marker is already present, leave the profile
    alone (aside from stripping any legacy inline block). Returns
    ``(profile, "created" | "updated" | "migrated")`` for every profile
    that was written so callers can label the action without re-parsing
    prose.
    """
    written: list[tuple[Path, str]] = []
    for profile in _shell_profiles():
        original = profile.read_text(encoding="utf-8") if profile.exists() else ""
        migrated = _strip_legacy_otel_block(original)
        has_new = _AICTL_ENV_BEGIN in migrated
        if has_new and migrated == original:
            continue  # already up-to-date
        if has_new:
            new_content = migrated
            kind = "migrated"
        else:
            sep = "" if migrated == "" or migrated.endswith("\n") else "\n"
            new_content = migrated + sep + _AICTL_ENV_SOURCE_BLOCK + "\n"
            kind = "created" if not profile.exists() else "updated"
        guard = WriteGuard.current()
        if guard:
            guard.confirm(profile, "modify" if profile.exists() else "create")
        _write_text_atomic(profile, new_content)
        written.append((profile, kind))
    return written


def _update_shell_profiles_block(
    env_block: dict[str, str],
    actions: list[str],
    update_label: str = "Updated {profile}",
    create_label: str = "Created {profile}",
) -> None:
    """Write env vars to ~/.config/aictl/env.sh and ensure profiles source it."""
    env_path = _write_env_file(env_block)
    actions.append(f"Wrote env vars → {env_path} ({len(env_block)} vars)")
    for profile, kind in _ensure_source_line_in_profiles():
        if kind == "updated":
            actions.append(update_label.format(profile=profile))
        elif kind == "created":
            actions.append(create_label.format(profile=profile))
        else:
            actions.append(f"Migrated legacy OTel block in {profile}")


def _settings_path(scope: str) -> Path:
    """Return the Claude Code settings path for the given scope."""
    if scope == "project":
        # Use settings.local.json — hooks contain localhost:PORT which is
        # machine-specific and must not be committed to git.
        return Path.cwd() / ".claude" / "settings.local.json"
    # User-level: ~/.claude/settings.json (macOS/Linux) or
    # %USERPROFILE%\.claude\settings.json (Windows)
    return claude_global_dir() / "settings.json"


def _python_cmd(*, powershell: bool = False) -> str:
    """Return an invokable reference to the current Python interpreter.

    Using sys.executable ensures we invoke the exact same Python that runs
    aictl — correct venv, correct version — on every platform including
    Windows where 'python3' is not available.

    The path is always quoted in case it contains spaces (common on
    Windows, e.g. ``C:\\Users\\First Last\\...``). A quoted path executes
    directly under bash/zsh/sh and cmd.exe, but PowerShell parses a leading
    quoted string as a string *literal* and then chokes on ``-m``
    (``Unexpected token '-m'``). When the rule will be run by PowerShell
    the caller passes ``powershell=True`` and the call operator ``&`` is
    prefixed. It is never emitted otherwise: Claude Code's hook shell
    defaults to bash (Git Bash) even on Windows, and Gemini/VS Code run
    hooks through Node's shell (cmd.exe on Windows), where a leading ``&``
    is a syntax error.
    """
    quoted = f'"{sys.executable}"'
    return f"& {quoted}" if powershell else quoted


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

    On Windows, Claude Code rules are pinned to ``"shell": "powershell"``
    (a documented per-hook field) and the command gets PowerShell's call
    operator — PowerShell is always present, whereas Claude's default bash
    shell needs Git Bash. Gemini rules have no shell field and run under
    Node's shell, so they get the plain quoted interpreter path.
    """
    target_events = events or HOOK_EVENTS
    hooks: dict[str, list[dict]] = {}
    use_powershell = IS_WINDOWS and source_tool == "claude"
    python = _python_cmd(powershell=use_powershell)
    source_id = _source_id(scope, source_tool)

    for event in target_events:
        tool_event_name = event_map.get(event, event) if event_map else event
        if tool_event_name in hooks:
            # Two internal events mapped to one tool event: the second would
            # silently replace the first rule (and its --event label).
            raise ValueError(
                f"hook event map collision: {event!r} and an earlier event both map to {tool_event_name!r}"
            )
        cmd = f"{python} -m aictl.hook_handler --event {event} --port {port} --source {source_id}"
        inner: dict = {"type": "command", "command": cmd}
        if use_powershell:
            inner["shell"] = "powershell"
        hooks[tool_event_name] = [
            {
                "_aictl_owner": _AICTL_OWNER_MARKER,
                "matcher": matcher,
                "hooks": [inner],
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
    if not isinstance(existing_hooks, dict):
        existing_hooks = {}
    conflicts: list[str] = []
    for event in target_events:
        user_hooks = [h for h in _rules_list(existing_hooks, event) if not _is_aictl_hook(h)]
        if user_hooks:
            conflicts.append(event)
    if conflicts and not force:
        click.echo(f"Existing non-aictl hooks found on {len(conflicts)} event(s):", err=True)
        for ev in conflicts:
            user_hooks = [h for h in _rules_list(existing_hooks, ev) if not _is_aictl_hook(h)]
            for h in user_hooks:
                cmd = h.get("command", h.get("url", str(h))) if isinstance(h, dict) else str(h)
                if len(cmd) > 80:
                    cmd = cmd[:77] + "..."
                click.echo(f"  {ev}: {cmd}", err=True)
        click.echo("\nUse --force to install alongside existing hooks.", err=True)
        raise SystemExit(1)

    # Merge hooks into existing settings: strip every prior aictl rule (from
    # all events, so stale ones go too), keep user hooks, append ours.
    hook_config = _build_hook_config(port, event_list, source_tool="claude", scope=scope)
    existing["hooks"] = merge_aictl_hooks(existing_hooks, hook_config)

    if dry_run:
        _print_settings_diff(settings_path, before_snapshot, existing)
        click.echo(f"\n[dry-run] Would install {len(target_events)} hook events → localhost:{port}/api/hooks")
        return

    guard.confirm(settings_path, "modify")
    _write_json_atomic(settings_path, existing)

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
    """Remove aictl hook configuration from Claude Code, Gemini CLI and VS Code.

    Each tool's file is handled independently: a missing or corrupt Claude
    settings.json must not leave Gemini / Copilot hooks firing forever.
    """
    if not dry_run:
        guard = WriteGuard.install("hooks uninstall")
    settings_path = _settings_path(scope)
    failures: list[str] = []

    if not settings_path.exists():
        click.echo(f"No settings file found for Claude Code at {settings_path}.")
    else:
        try:
            existing = _read_json_strict(settings_path, force=force)
        except click.ClickException as exc:
            # Keep going: the other tools' files are independent of this one.
            click.echo(f"Claude Code hooks left intact at {settings_path}: {exc.message}", err=True)
            failures.append(str(settings_path))
            existing = None
        if existing is not None:
            before_snapshot = json.loads(json.dumps(existing))
            # Walk every event present in the file, not just the current
            # HOOK_EVENTS: rules aictl installed under an event that was later
            # dropped from the list (e.g. WorktreeCreate) must still go.
            hooks_config, removed = strip_aictl_hooks(existing.get("hooks", {}))
            if hooks_config:
                existing["hooks"] = hooks_config
            elif "hooks" in existing:
                del existing["hooks"]

            if dry_run:
                _print_settings_diff(settings_path, before_snapshot, existing)
                click.echo(f"\n[dry-run] Would remove {removed} aictl hook rule(s) from {settings_path}")
            else:
                guard.confirm(settings_path, "modify")
                _write_json_atomic(settings_path, existing)
                click.echo(f"Removed {removed} aictl hook rule(s) from {settings_path}")

    if dry_run:
        click.echo(f"[dry-run] Would also purge aictl hooks from {_vscode_hook_settings_path(scope)}")
        click.echo(f"[dry-run] Would also purge aictl hooks from {_gemini_settings_path(scope)}")
        return

    # Also purge the VS Code Copilot hook file and Gemini CLI settings
    # (scope-symmetric — `aictl disable` inherits this via ctx.invoke).
    other_actions: list[str] = []
    _uninstall_vscode_hooks(scope, other_actions)
    _uninstall_gemini_hooks(scope, other_actions)
    for action in other_actions:
        click.echo(action)

    if failures:
        raise SystemExit(1)


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


def _rules_list(hooks_cfg: dict, event: str) -> list:
    """The rule list under *event*, or ``[]`` when absent or malformed."""
    rules = hooks_cfg.get(event, [])
    return rules if isinstance(rules, list) else []


def _iter_aictl_hook_rules(settings: object):
    """Yield (event, rule_dict) for every aictl-owned rule in a parsed settings dict.

    Works for both the nested Claude/Gemini shape (``{"matcher", "hooks":
    [...]}``) and the flat Copilot shape (``{"type", "command"}``) — the
    owner marker is what identifies ours. Emits legacy entries too; the
    caller decides how to classify them.
    """
    if not isinstance(settings, dict):
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


def _iter_installed_aictl_hooks(settings_path: Path):
    """Yield (event, rule_dict) for every aictl-owned hook in the file at *settings_path*."""
    if not settings_path.exists():
        return
    try:
        settings = read_json_or_fail(settings_path)
    except CorruptJSONError:
        return
    yield from _iter_aictl_hook_rules(settings)


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


def _probe_import(interp: str, cache: dict[str, str | None] | None = None) -> str | None:
    """Return None when ``import aictl.hook_handler`` succeeds under *interp*, else the error.

    Spawning an interpreter costs ~50-100 ms; every installed rule points at
    the same interpreter, so callers pass a per-run *cache* and doctor /
    verify pay for exactly one spawn per distinct interpreter.
    """
    if cache is not None and interp in cache:
        return cache[interp]
    try:
        probe = subprocess.run(
            [interp, "-c", "import aictl.hook_handler"],
            capture_output=True,
            timeout=5,
            text=True,
        )
        if probe.returncode != 0:
            err = (probe.stderr or "").strip().splitlines()[-1:]
            result: str | None = f"aictl not importable: {' '.join(err) or 'import failed'}"
        else:
            result = None
    except (OSError, subprocess.TimeoutExpired) as exc:
        result = f"import probe failed: {exc}"
    if cache is not None:
        cache[interp] = result
    return result


def _doctor_check_one(event: str, rule: dict, probe_cache: dict[str, str | None] | None = None) -> dict:
    """Run static checks against a single hook rule. Returns a result dict."""
    import shutil

    cmd = _extract_hook_command(rule)
    tokens = _shlex_split_cmd(cmd)
    # On Windows the command is prefixed with PowerShell's call operator
    # (``& "C:\\...\\python.exe" ...``); the interpreter is the next token.
    if tokens and tokens[0] == "&":
        tokens = tokens[1:]
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
            probe_error = _probe_import(interp, probe_cache)
            if probe_error:
                status = "FAIL"
                reasons.append(probe_error)

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


# The flat Copilot hook file uses the same owner marker, so the same iterator
# applies. Kept as a name for callers that read better with it.
_iter_installed_vscode_hooks = _iter_installed_aictl_hooks


def _collect_doctor_results(scope: str) -> list[dict]:
    probe_cache: dict[str, str | None] = {}
    settings_path = _settings_path(scope)
    results = [
        _doctor_check_one(event, rule, probe_cache) for event, rule in _iter_installed_aictl_hooks(settings_path)
    ]
    vscode_path = _vscode_hook_settings_path(scope)
    results.extend(
        _doctor_check_one(event, rule, probe_cache) for event, rule in _iter_installed_aictl_hooks(vscode_path)
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
    port with ``{"_aictl_verify": true}``. The aictl server acknowledges
    these without persisting them.
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
    type=click.Choice(["claude", "copilot", "codex", "gemini", "agent-workspace", "all"]),
    default="all",
    help="Which tool(s) to configure",
)
@click.option(
    "--profile",
    default=None,
    help="Tag agent-workspace runs with this aictl profile (sets AW_CONTEXT_PROFILE)",
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
def enable(port: int | None, tool: str, profile: str | None, print_only: bool, shell: str | None, force: bool):
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
        aictl otel enable --tool agent-workspace --profile review
                                       # workspace runs export, tagged 'review'
    """
    if print_only:
        _print_exports(port, tool, shell, profile)
        return
    WriteGuard.install("otel enable")

    port = port if port is not None else _default_port()
    endpoint = f"http://localhost:{port}"
    tools = list(_ALL_OTEL_TOOLS) if tool == "all" else [tool]

    actions: list[str] = []
    _enable_otel(port, actions, tools=tools, profile=profile, force=force)

    # ── Summary ────────────────────────────────────────────────
    failures = [a for a in actions if "FAILED" in a]
    click.secho("OTel enabled:", fg="green", bold=True)
    for action in actions:
        click.echo(f"  {action}")
    click.echo()
    click.echo(f"Endpoint: {endpoint}")
    click.echo(f"Tools:    {', '.join(tools)}")
    if "agent-workspace" in tools:
        click.echo(
            f"Workspace: runs export to {endpoint} (AW_OTLP_ENDPOINT)" + (f", profile '{profile}'" if profile else "")
        )
    click.echo()
    click.echo("Restart AI tools to pick up changes.")
    if "copilot" in tools:
        click.echo("VS Code: Cmd/Ctrl+Shift+P → 'Developer: Reload Window'")
    if failures:
        raise SystemExit(1)


def _print_exports(port: int | None, tool: str, shell: str | None, profile: str | None = None) -> None:
    """Print env var exports to stdout for eval."""
    port = port if port is not None else _default_port()
    endpoint = f"http://localhost:{port}"
    tools = list(_ALL_OTEL_TOOLS) if tool == "all" else [tool]

    if shell is None:
        if IS_WINDOWS:
            shell = "powershell"
        elif "zsh" in os.environ.get("SHELL", ""):
            shell = "zsh"
        elif "fish" in os.environ.get("SHELL", ""):
            shell = "fish"
        else:
            shell = "bash"

    env_block = _build_env_block(port, tools, profile)
    for key, val in env_block.items():
        _validate_env_key(key)
        val = str(val)
        if shell in ("bash", "zsh"):
            click.echo(f"export {key}={shlex.quote(val)}")
        elif shell == "fish":
            # shlex single-quoting is valid fish syntax for these values too.
            click.echo(f"set -x {key} {shlex.quote(val)}")
        elif shell == "powershell":
            # PowerShell single-quoted strings: only ' needs escaping (doubled).
            click.echo("$env:{} = '{}'".format(key, val.replace("'", "''")))

    print(f"\n# OTel endpoint: {endpoint}", file=sys.stderr)
    print(f"# Tools: {', '.join(tools)}", file=sys.stderr)
    print(f"# Make sure 'aictl serve --port {port}' is running", file=sys.stderr)


# Every tool `otel enable` / `aictl enable` configures by default.
_ALL_OTEL_TOOLS = ("claude", "copilot", "codex", "gemini", "agent-workspace")


def _copilot_otel_settings(endpoint: str) -> dict[str, object]:
    """VS Code settings that turn on Copilot Chat's OTLP/HTTP export to *endpoint*.

    Single definition shared by ``enable`` and ``verify`` so the two can
    never disagree about which keys constitute "configured".
    """
    return {
        "github.copilot.chat.otel.enabled": True,
        "github.copilot.chat.otel.exporterType": "otlp-http",
        "github.copilot.chat.otel.otlpEndpoint": endpoint,
        "github.copilot.chat.otel.captureContent": True,
    }


def _codex_otel_block(endpoint: str) -> str:
    """The ``[otel]`` TOML table Codex CLI actually reads.

    Codex has no ``enabled``/``endpoint`` keys (an earlier aictl wrote those
    and Codex silently ignored them). The schema is ``exporter = { otlp-http
    = { endpoint, protocol } }`` for logs, ``metrics_exporter`` for metrics,
    and per-signal endpoints. ``protocol = "json"`` matches the receiver's
    OTLP/JSON path without needing the protobuf extra.
    """
    return (
        "[otel]\n"
        "# managed by aictl — OTLP/JSON export to the aictl dashboard\n"
        'environment = "dev"\n'
        "log_user_prompt = true\n"
        f'exporter = {{ otlp-http = {{ endpoint = "{endpoint}/v1/logs", protocol = "json" }} }}\n'
        f'metrics_exporter = {{ otlp-http = {{ endpoint = "{endpoint}/v1/metrics", protocol = "json" }} }}\n'
    )


_CODEX_OTEL_SECTION_RE = re.compile(r"(?ms)^\[otel\][^\n]*\n.*?(?=^\[|\Z)")


def _codex_otel_exporter_configured(content: str) -> bool:
    """True when the ``[otel]`` table already names a real exporter."""
    m = _CODEX_OTEL_SECTION_RE.search(content)
    if not m:
        return False
    section = m.group(0)
    return bool(re.search(r"^\s*exporter\s*=\s*(?!\"none\")", section, re.M))


def _upsert_codex_otel(codex_toml: Path, endpoint: str) -> str:
    """Write/replace the aictl ``[otel]`` table in *codex_toml*. Returns an action label.

    * No file → create it with the block.
    * No ``[otel]`` → append the block.
    * ``[otel]`` with a real ``exporter`` → leave the user's config alone.
    * ``[otel]`` without an exporter (the legacy aictl ``enabled = true``
      shape, which Codex ignores) → replace that table with the block.
    """
    block = _codex_otel_block(endpoint)
    guard = WriteGuard.current()
    if not codex_toml.exists():
        if guard:
            guard.confirm(codex_toml, "create")
        _write_text_atomic(codex_toml, block)
        return "created"
    content = codex_toml.read_text(encoding="utf-8")
    if "[otel]" not in content:
        if guard:
            guard.confirm(codex_toml, "modify")
        sep = "" if content.endswith("\n") or not content else "\n"
        _write_text_atomic(codex_toml, content + sep + "\n" + block)
        return "appended"
    if _codex_otel_exporter_configured(content):
        return "already configured"
    if guard:
        guard.confirm(codex_toml, "modify")
    _write_text_atomic(codex_toml, _CODEX_OTEL_SECTION_RE.sub(lambda _m: block, content, count=1))
    return "replaced legacy [otel] table"


def _build_env_block(port: int, tools: list[str], profile: str | None = None) -> dict[str, str]:
    """Build the full set of env vars for the given tools.

    Only variables the tools actually read are emitted: Claude Code's
    ``CLAUDE_CODE_ENABLE_TELEMETRY`` + standard ``OTEL_*``; Gemini CLI's
    ``GEMINI_TELEMETRY_*`` (it does not consume ``OTEL_*_EXPORTER``, and
    defaults to gRPC, so the protocol is pinned to http and the collector
    path enabled); Copilot's ``COPILOT_OTEL_*`` for the CLI. Codex is
    configured through ``config.toml`` and has no OTel env vars.
    """
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

    if "gemini" in tools:
        env.update(
            {
                "GEMINI_TELEMETRY_ENABLED": "true",
                "GEMINI_TELEMETRY_TARGET": "local",
                "GEMINI_TELEMETRY_USE_COLLECTOR": "true",
                "GEMINI_TELEMETRY_OTLP_ENDPOINT": endpoint,
                "GEMINI_TELEMETRY_OTLP_PROTOCOL": "http",
            }
        )

    # agent-workspace exports its run journal as OTLP traces when AW_OTLP_ENDPOINT
    # is set (aw-otel is opt-in on that var). Pointing it at aictl makes each
    # workspace RUN show up as a session/turn/tool trace; tagging it with the
    # active aictl profile closes the configuration↔action loop in the dashboard.
    if "agent-workspace" in tools:
        env["AW_OTLP_ENDPOINT"] = endpoint
        if profile:
            env["AW_CONTEXT_PROFILE"] = profile

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

    # Verify exactly what enable writes — derived from the same builder so
    # the two can't drift (endpoint/port values are not asserted).
    _value_free = {
        "AICTL_PORT",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "COPILOT_OTEL_ENDPOINT",
        "GEMINI_TELEMETRY_OTLP_ENDPOINT",
        "AW_OTLP_ENDPOINT",
    }
    required = [
        (key, None if key in _value_free else val)
        for key, val in _build_env_block(_default_port(), list(_ALL_OTEL_TOOLS)).items()
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
                content = profile.read_text(encoding="utf-8")
                # Recognise either the new source-block marker (current scheme)
                # or the legacy inline-export marker (pre-migration profiles).
                if _AICTL_ENV_BEGIN in content or _OTEL_MARKER in content:
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
            settings = json.loads(settings_path.read_text(encoding="utf-8"))
            copilot_keys = {
                k: (None if k == "github.copilot.chat.otel.otlpEndpoint" else v)
                for k, v in _copilot_otel_settings("").items()
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
        if _codex_otel_exporter_configured(content):
            click.echo(f"    {ok}  {codex_toml} — [otel] exporter configured")
        elif "[otel]" in content:
            click.echo(
                f"    {warn}  {codex_toml} — [otel] present but no exporter (legacy aictl block? re-run otel enable)"
            )
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
    # Hook discovery locations. VS Code's defaults are ``.github/hooks`` and
    # ``~/.copilot/hooks``; a user-set map REPLACES the defaults, so the
    # user-scope aictl file must be listed explicitly. Merged into any
    # existing map by _enable_vscode (never overwrites user entries).
    "chat.hookFilesLocations": {
        ".github/hooks": True,
        "~/.copilot/hooks": True,
        ".claude/settings.json": True,
        ".claude/settings.local.json": True,
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
    """Merge updates into an existing JSON settings file. Returns status string.

    Top-level keys are replaced, except that a dict value is merged one
    level deep into an existing dict (so ``chat.hookFilesLocations`` adds
    aictl's locations without dropping the user's own entries).
    """
    if path.exists():
        existing = _read_json_strict(path, force=force)
        status = "updated"
    else:
        existing = {}
        path.parent.mkdir(parents=True, exist_ok=True)
        status = "created"
    for key, value in updates.items():
        current = existing.get(key)
        if isinstance(value, dict) and isinstance(current, dict):
            existing[key] = {**current, **value}
        else:
            existing[key] = value
    guard = WriteGuard.current()
    if guard:
        guard.confirm(path, "modify")
    _write_json_atomic(path, existing, indent=4)
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


def _build_vscode_hook_config(port: int, events: list[str] | None, *, scope: str) -> dict[str, list[dict]]:
    """Build the Copilot-native flat hook config.

    Copilot loads ``{"hooks": {"EventName": [{"type":"command","command":"..."}]}}``.
    Each command entry carries the ``_aictl_owner`` marker so doctor / diff
    tooling can attribute it back to us. VS Code ignores unknown keys in
    hook entries, so the marker is safe to include.
    """
    target_events = events or VSCODE_HOOK_EVENTS
    python = _python_cmd()  # Node shell (cmd.exe on Windows): plain quoted path, no PowerShell `&`
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
    scope: str,
    port: int,
    actions: list[str],
    *,
    force: bool = False,  # noqa: ARG001
) -> None:
    """Install VS Code Copilot hooks at the given scope.

    Writes a dedicated ``aictl.json`` hook file (user: ``~/.copilot/hooks/``;
    project: ``.github/hooks/``). The file is aictl's, but a user may add
    entries of their own to it, so it is merged per entry like every other
    hook file: prior aictl rules are stripped from every event, user rules
    stay, ours are appended.
    """
    try:
        hook_path = _vscode_hook_settings_path(scope)
    except (KeyError, OSError) as exc:
        actions.append(f"VS Code Copilot hooks FAILED ({exc})")
        return

    hook_path.parent.mkdir(parents=True, exist_ok=True)
    existing = _read_json_strict(hook_path, force=force) if hook_path.exists() else {}
    hook_config = _build_vscode_hook_config(port, None, scope=scope)
    existing["hooks"] = merge_aictl_hooks(existing.get("hooks", {}), hook_config)
    guard = WriteGuard.current()
    if guard:
        guard.confirm(hook_path, "modify" if hook_path.exists() else "create")
    _write_json_atomic(hook_path, existing)
    actions.append(f"VS Code Copilot hooks ({len(VSCODE_HOOK_EVENTS)} events) → {hook_path}")


def _uninstall_vscode_hooks(scope: str, actions: list[str]) -> None:
    """Remove aictl-owned entries from the VS Code Copilot hook file.

    Deletes the file when nothing else is left in it; otherwise rewrites it
    with only the user's entries (a mixed file used to be left untouched, so
    aictl hooks kept firing after uninstall).
    """
    hook_path = _vscode_hook_settings_path(scope)
    if not hook_path.exists():
        return
    try:
        data = read_json_or_fail(hook_path)
    except CorruptJSONError:
        actions.append(f"VS Code Copilot hooks left intact at {hook_path} (unreadable JSON)")
        return
    remaining, removed = strip_aictl_hooks(data.get("hooks", {}))
    if not removed:
        actions.append(f"VS Code Copilot hooks left intact at {hook_path} (not aictl-owned)")
        return
    guard = WriteGuard.current()
    other_keys = {k: v for k, v in data.items() if k != "hooks"}
    if not remaining and not other_keys:
        if guard:
            guard.confirm(hook_path, "delete")
        _delete_with_ledger(hook_path)
        actions.append(f"Removed aictl VS Code Copilot hooks → {hook_path}")
        return
    if remaining:
        other_keys["hooks"] = remaining
    if guard:
        guard.confirm(hook_path, "modify")
    _write_json_atomic(hook_path, other_keys)
    actions.append(f"Removed {removed} aictl VS Code Copilot hook(s) → {hook_path} (user entries kept)")


def _gemini_settings_path(scope: str) -> Path:
    """Return the Gemini CLI settings path for the given scope."""
    if scope == "project":
        return Path.cwd() / ".gemini" / "settings.json"
    return gemini_global_dir() / "settings.json"


def _uninstall_gemini_hooks(scope: str, actions: list[str]) -> None:
    """Remove aictl-owned hook entries from Gemini CLI settings.

    Mirrors the Gemini half of ``_install_hooks``: only entries carrying
    the aictl ownership marker (or matching the legacy aictl command
    shape) are purged. User hooks and every other settings key are
    preserved byte-for-byte in the JSON structure.
    """
    gemini_path = _gemini_settings_path(scope)
    if not gemini_path.exists():
        return
    try:
        existing = read_json_or_fail(gemini_path)
    except CorruptJSONError:
        actions.append(f"Gemini CLI hooks left intact at {gemini_path} (unreadable settings.json)")
        return

    g_hooks, removed = strip_aictl_hooks(existing.get("hooks", {}))
    if not removed:
        return

    if g_hooks:
        existing["hooks"] = g_hooks
    else:
        existing.pop("hooks", None)

    guard = WriteGuard.current()
    if guard:
        guard.confirm(gemini_path, "modify")
    _write_json_atomic(gemini_path, existing)
    actions.append(f"Removed aictl Gemini CLI hooks → {gemini_path}")


def _install_hooks(scope: str, port: int, actions: list[str], *, force: bool = False) -> None:
    """Install Claude Code hooks and report actions."""
    if scope == "project":
        settings_path = Path.cwd() / ".claude" / "settings.local.json"
    else:
        settings_path = claude_global_dir() / "settings.json"

    settings_path.parent.mkdir(parents=True, exist_ok=True)

    existing: dict = _read_json_strict(settings_path, force=force)

    # merge_aictl_hooks purges ALL old aictl rules from ALL event keys first
    # (cleans up renamed/removed events), keeps user rules, appends ours.
    hook_config = _build_hook_config(port, None, source_tool="claude", scope=scope)
    existing["hooks"] = merge_aictl_hooks(existing.get("hooks", {}), hook_config)

    guard = WriteGuard.current()
    if guard:
        guard.confirm(settings_path, "modify")
    _write_json_atomic(settings_path, existing)
    actions.append(f"Claude Code hooks ({len(HOOK_EVENTS)} events) → {settings_path}")

    # Gemini CLI hooks
    gemini_path = _gemini_settings_path(scope)
    gemini_path.parent.mkdir(parents=True, exist_ok=True)
    g_existing: dict = _read_json_strict(gemini_path, force=force)

    # Map internal HOOK_EVENTS (PascalCase) to official Gemini CLI events
    # Use the same hook configuration logic as Claude but with Gemini names
    gemini_only_events = [e for e in HOOK_EVENTS if e in GEMINI_HOOK_MAP]
    hook_config = _build_hook_config(
        port, gemini_only_events, event_map=GEMINI_HOOK_MAP, matcher="*", source_tool="gemini", scope=scope
    )
    g_existing["hooks"] = merge_aictl_hooks(g_existing.get("hooks", {}), hook_config)

    if guard:
        guard.confirm(gemini_path, "modify")
    _write_json_atomic(gemini_path, g_existing)
    actions.append(f"Gemini CLI hooks ({len(hook_config)} events) → {gemini_path}")

    # VS Code Copilot hooks — separate file under chat.hookFilesLocations
    # defaults (``.github/hooks`` for project, ``~/.copilot/hooks`` for user).
    _install_vscode_hooks(scope, port, actions, force=force)


def _enable_otel(
    port: int,
    actions: list[str],
    *,
    tools: list[str] | tuple[str, ...] | None = None,
    profile: str | None = None,
    force: bool = False,
) -> None:
    """Enable OTel export for *tools* (default: all) and report actions.

    The single implementation behind both ``aictl otel enable`` and
    ``aictl enable``: env vars (shell profiles / setx / launchctl), Copilot's
    VS Code settings, and Codex's ``config.toml``.
    """
    endpoint = f"http://localhost:{port}"
    tools = list(tools) if tools is not None else list(_ALL_OTEL_TOOLS)
    env_block = _build_env_block(port, tools, profile)

    if IS_WINDOWS:
        for key, val in env_block.items():
            _run_env_persist(["setx", key, val])
            os.environ[key] = val
        actions.append(f"OTel env vars → Windows user environment ({len(env_block)} vars via setx)")
        actions.append("  Note: new terminals will inherit; current session updated")
    else:
        _update_shell_profiles_block(
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
    if "copilot" in tools:
        try:
            settings_path = vscode_user_dir() / "settings.json"
            status = _write_json_settings(settings_path, _copilot_otel_settings(endpoint), force=force)
            actions.append(f"Copilot OTel → VS Code settings.json ({status})")
        except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
            actions.append(f"Copilot OTel → VS Code settings.json FAILED ({exc})")

    # Codex config.toml
    if "codex" in tools:
        codex_toml = codex_global_dir() / "config.toml"
        try:
            status = _upsert_codex_otel(codex_toml, endpoint)
            actions.append(f"Codex OTel → {codex_toml} ({status})")
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
                f"  [otel]   Windows env vars via setx ({len(_build_env_block(port, list(_ALL_OTEL_TOOLS)))} vars)"
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
