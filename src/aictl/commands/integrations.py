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


from .. import hook_removal, mutation_ledger
from .._hook_owner import (  # re-exported for tests
    _AICTL_OWNER_MARKER,
    _is_aictl_hook,
    _is_legacy_aictl_hook,
    merge_aictl_hooks,
)
from ..hook_removal import jsonc_loads
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
    keeps the previous bytes instead. A symlinked file is written at its
    target, so a dotfile-managed link stays a link.
    """
    previous: bytes | None = None
    if path.exists():
        try:
            previous = path.read_bytes()
        except OSError:
            previous = None
    try:
        hook_removal.write_atomic(path, content)
    except (hook_removal.InvalidConfigError, hook_removal.ConfigBusyError) as exc:
        raise click.ClickException(str(exc)) from exc
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
    JSONC (comments, trailing commas) is valid input, not corruption: treating
    it as corrupt made ``--force`` replace a commented VS Code settings file.
    """
    try:
        return jsonc_loads(path.read_text("utf-8"))
    except (OSError, ValueError):
        pass  # falls through to the strict reader's corrupt-file policy
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
    # Model switches (/model, fallback). PreModelSwitch is a gate, see below.
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
]

# Every Claude Code hook event, from https://code.claude.com/docs/en/hooks.
# A key outside this set is reported as a "Settings Warning" by Claude Code,
# so nothing outside it is ever written.
CLAUDE_KNOWN_EVENTS = frozenset(
    {
        *HOOK_EVENTS,
        "FileChanged",
        "WorktreeCreate",
        "Elicitation",
        "ElicitationResult",
        "PreModelSwitch",
        "MessageDisplay",
    }
)

# Events where having a hook, or what it prints, changes what the host does:
# WorktreeCreate replaces `git worktree` and reads stdout as the path;
# Elicitation/ElicitationResult read stdout as the elicitation answer; PreModelSwitch
# exists to gate the switch and PostModelSwitch observes the same thing. An
# observer has no business on any of them, whatever its current output.
NEVER_REGISTER_EVENTS = frozenset({"WorktreeCreate", "Elicitation", "ElicitationResult", "PreModelSwitch"})

# Short limits: the handler needs ~20 ms and a hung hook must not hold the host.
_CLAUDE_HOOK_TIMEOUT_SEC = 5
_GEMINI_HOOK_TIMEOUT_MS = 2000
_COPILOT_HOOK_TIMEOUT_SEC = 5
# Claude may tear down async hooks as the session exits, so this one stays sync.
_CLAUDE_SYNC_EVENTS = frozenset({"SessionEnd"})


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
# The file needs ``"version": 1``: Copilot rejects a whole file with a bad or
# missing version. PascalCase names are documented aliases of the camelCase
# events and select the snake_case payload the receiver reads; the two events
# with no documented alias use the camelCase name.
# https://docs.github.com/en/copilot/reference/hooks-configuration
VSCODE_HOOK_EVENTS = [
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "subagentStart",
    "SubagentStop",
    "PreCompact",
    "Stop",
    "errorOccurred",
]
_COPILOT_HOOK_FILE_VERSION = 1
# The name reported to the receiver, which keys on PascalCase event names.
_COPILOT_EVENT_LABELS = {"subagentStart": "SubagentStart", "errorOccurred": "ErrorOccurred"}


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


def _handler_command(event: str, port: int, source_id: str, *, shell: str = "posix") -> str:
    """The one command line every registered hook runs.

    * ``-I -S`` with a file path: no site-packages scan and no aictl package
      import, so one invocation costs ~20 ms instead of ~60 ms.
    * The trailing guard is what makes the hook fail-open when the interpreter
      or script is gone (pipx removed or moved): without it the shell exits 127
      and the host shows a hook error on every event.
    """
    python = _python_cmd(powershell=shell == "powershell")
    script = str(Path(__file__).resolve().parent.parent / "hook_handler.py")
    base = f'{python} -I -S "{script}" --event {event} --port {port} --source {source_id}'
    if shell == "powershell":
        return f"{base} 2>$null; exit 0"
    if shell == "cmd":
        return f"{base} 2>nul & exit /b 0"
    return f"{base} 2>/dev/null || true"


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

    Each hook runs :func:`_handler_command`, which reads the JSON payload from
    stdin, POSTs it to aictl and prints nothing. Refuses any event the tool does
    not define and any event in :data:`NEVER_REGISTER_EVENTS`.

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
    is_claude = source_tool == "claude"
    use_powershell = IS_WINDOWS and is_claude
    shell = "powershell" if use_powershell else ("cmd" if IS_WINDOWS else "posix")
    source_id = _source_id(scope, source_tool)
    known = CLAUDE_KNOWN_EVENTS if is_claude else frozenset(GEMINI_HOOK_EVENTS)

    for event in target_events:
        tool_event_name = event_map.get(event, event) if event_map else event
        if event in NEVER_REGISTER_EVENTS or tool_event_name in NEVER_REGISTER_EVENTS:
            raise ValueError(f"refusing to register {event!r}: a hook there changes host behaviour")
        if tool_event_name not in known:
            raise ValueError(f"refusing to register {tool_event_name!r}: not a {source_tool} hook event")
        if tool_event_name in hooks:
            # Two internal events mapped to one tool event: the second would
            # silently replace the first rule (and its --event label).
            raise ValueError(
                f"hook event map collision: {event!r} and an earlier event both map to {tool_event_name!r}"
            )
        inner: dict = {"type": "command", "command": _handler_command(event, port, source_id, shell=shell)}
        if is_claude:
            inner["timeout"] = _CLAUDE_HOOK_TIMEOUT_SEC
            if event not in _CLAUDE_SYNC_EVENTS:
                inner["async"] = True
        else:
            inner["timeout"] = _GEMINI_HOOK_TIMEOUT_MS
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


def _would_be_committed(path: Path) -> bool:
    """True when *path* sits in a git work tree and is not ignored.

    Hook rules carry this machine's interpreter path and port, so they must not
    land in a file the repository shares. Outside a repository (or without git)
    the answer is False.
    """
    try:
        proc = subprocess.run(
            ["git", "-C", str(path.parent if path.parent.exists() else Path.cwd()), "check-ignore", "-q", str(path)],
            capture_output=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return proc.returncode == 1  # 0 ignored, 128 not a repository


def _update_json_file(path: Path, updates: dict, *, force: bool = False, note: bool = False) -> bool:
    """Apply top-level *updates* to a JSON(C) file, preserving every other byte.

    Returns False, with no write, when nothing changes (a second install leaves
    the file and its mtime alone).
    """
    existing = _read_json_strict(path, force=force) if path.exists() else {}
    try:
        text = hook_removal.read_text_exact(path) if path.exists() else ""
        jsonc_loads(text)
    except (OSError, ValueError):
        text = ""  # force quarantined a corrupt file above
    new_text = hook_removal.update_json_text(text, updates, note=note)
    if text and new_text == text:
        return False
    if text and json.dumps(existing, sort_keys=True) == json.dumps(jsonc_loads(new_text), sort_keys=True):
        return False
    guard = WriteGuard.current()
    if guard:
        guard.confirm(path, "modify" if path.exists() else "create")
    if not new_text.endswith("\n") and not text:
        new_text += "\n"
    _write_text_atomic(path, new_text)
    return True


def _register_hook_file(path: Path, rules: dict[str, list[dict]], *, force: bool = False, **top_level: object) -> bool:
    """The single merge-and-write used for every tool's hook file."""
    existing = _read_json_strict(path, force=force) if path.exists() else {}
    current = existing.get("hooks", {})
    if not isinstance(current, dict):
        raise click.ClickException(f'{path}: "hooks" is not an object; fix it by hand, then re-run')
    updates: dict = {"hooks": merge_aictl_hooks(current, rules), **top_level}
    return _update_json_file(path, updates, force=force)


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
        WriteGuard.install("hooks install")
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
    if dry_run:
        existing["hooks"] = merge_aictl_hooks(existing_hooks, hook_config)
        _print_settings_diff(settings_path, before_snapshot, existing)
        click.echo(f"\n[dry-run] Would install {len(target_events)} hook events → localhost:{port}/api/hooks")
        return

    _register_hook_file(settings_path, hook_config, force=force)

    click.echo(f"Installed {len(target_events)} hook events → localhost:{port}/api/hooks")
    click.echo(f"  Scope: {scope} ({settings_path})")
    click.echo("  Mode: async, fail-open (reads full event payload, prints nothing)")
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
        WriteGuard.install("hooks uninstall")
    settings_path = _settings_path(scope)
    if force and settings_path.exists():
        _read_json_strict(settings_path, force=True)  # quarantine a corrupt file first
    if not settings_path.exists():
        click.echo(f"No settings file found for Claude Code at {settings_path}.")
    sink = _removal_sink(dry_run)
    for path in (settings_path, _vscode_hook_settings_path(scope), _gemini_settings_path(scope)):
        hook_removal.remove_from_hook_file(path, sink, delete_if_only=("version",))
    hook_removal.print_result(sink.result, dry_run=dry_run, echo=click.echo)
    if sink.result.failures:
        click.echo(f"Hooks left intact in: {', '.join(sink.result.failures)}", err=True)
        raise SystemExit(1)


def _removal_sink(dry_run: bool) -> hook_removal._Sink:
    """A removal sink wired to this CLI's write guard and mutation ledger."""

    def before(path: Path, op: str) -> None:
        guard = WriteGuard.current()
        if guard:
            guard.confirm(path, op)

    def after(path: Path, op: str, previous: bytes | None, new: bytes | None) -> None:
        mutation_ledger.record(_ledger_command(), path, op, previous, new)

    return hook_removal._Sink(dry_run, after, before)


def _uninstall_from(path: Path, label: str, actions: list[str]) -> None:
    """Remove aictl rules from one hook file, describing the outcome in *actions*."""
    sink = _removal_sink(dry_run=False)
    removed = hook_removal.remove_from_hook_file(path, sink, delete_if_only=("version",))
    if removed:
        actions.append(f"Removed {removed} aictl {label} hook(s) → {path}")
    elif sink.result.failures:
        actions.append(f"{label} hooks left intact at {path} (unreadable JSON)")
    elif path.exists():
        actions.append(f"{label} hooks left intact at {path} (not aictl-owned)")


def _uninstall_vscode_hooks(scope: str, actions: list[str]) -> None:
    _uninstall_from(_vscode_hook_settings_path(scope), "VS Code Copilot", actions)


def _uninstall_gemini_hooks(scope: str, actions: list[str]) -> None:
    _uninstall_from(_gemini_settings_path(scope), "Gemini CLI", actions)


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


# ─── hooks status / doctor / verify ──────────────────────────────────────────────────


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
    try:
        settings = jsonc_loads(settings_path.read_text("utf-8"))
    except (OSError, ValueError):
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


def _hook_script_from_tokens(tokens: list[str]) -> str:
    """The handler script a command runs, or "" for the older ``-m`` form."""
    for tok in tokens:
        if tok.strip('"').endswith("hook_handler.py"):
            return tok.strip('"')
    return ""


def _doctor_check_one(
    event: str,
    rule: dict,
    probe_cache: dict[str, str | None] | None = None,
    *,
    known_events: frozenset[str] | None = None,
    expected_port: int | None = None,
    scope: str = "user",
) -> dict:
    """Run static checks against a single hook rule. Returns a result dict.

    ``state`` names what is wrong in words a user can act on, and ``fix`` is the
    exact command that repairs it. `hooks install` purges every old aictl rule
    from every event, so it cures all of these.
    """
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
    state = "registered"
    reasons: list[str] = []
    script = _hook_script_from_tokens(tokens)

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
                state = "missing-interpreter"
                reasons.append(f"interpreter not found: {interp}")
            elif not os.access(str(p), os.X_OK) and not IS_WINDOWS:
                status = "FAIL"
                state = "missing-interpreter"
                reasons.append(f"interpreter not executable: {interp}")
        else:
            if shutil.which(interp) is None:
                status = "FAIL"
                state = "missing-interpreter"
                reasons.append(f"command not on PATH: {interp}")
        if status != "FAIL" and script and not Path(script).exists():
            status = "FAIL"
            state = "stale-path"
            reasons.append(f"handler script not found: {script}")

        # Check 2: aictl importable from this interpreter (only when -m aictl.hook_handler)
        if status != "FAIL" and "-m aictl.hook_handler" in cmd:
            probe_error = _probe_import(interp, probe_cache)
            if probe_error:
                status = "FAIL"
                state = "stale-path"
                reasons.append(probe_error)

    if event in NEVER_REGISTER_EVENTS or (known_events is not None and event not in known_events):
        status = "FAIL"
        state = "invalid-event"
        reasons.append(
            f"{event} changes host behaviour when hooked"
            if event in NEVER_REGISTER_EVENTS
            else f"{event} is not an event of this tool"
        )

    if expected_port is not None and port is not None and port != expected_port:
        if status == "OK":
            status = "WARN"
            state = "port-mismatch"
        reasons.append(f"hook posts to port {port}, aictl is configured for {expected_port}")

    if legacy:
        # Legacy takes WARN unless something else already FAILed.
        if status == "OK":
            status = "WARN"
        reasons.append("legacy aictl version (missing current owner marker)")
    if tokens and "|| true" not in cmd and "exit" not in cmd:
        reasons.append("old command form: not fail-open, slow")
        if status == "OK":
            status = "WARN"
            state = "old-form"

    fix = ""
    if status != "OK":
        port_arg = f" --port {expected_port}" if state == "port-mismatch" else ""
        fix = f"aictl hooks install --scope {scope}{port_arg}"
        if state in ("missing-interpreter", "stale-path"):
            remover = hook_removal.aictl_config_dir(Path.home()) / "remove-hooks.py"
            fix += f'   (if aictl itself is gone: python "{remover}")'

    return {
        "event": event,
        "command": cmd,
        "command_summary": _hook_cmd_summary(cmd),
        "interpreter": interp,
        "script": script,
        "port": port,
        "owner": owner,
        "legacy": legacy,
        "status": status,
        "state": state,
        "reasons": reasons,
        "fix": fix,
    }


# The flat Copilot hook file uses the same owner marker, so the same iterator
# applies. Kept as a name for callers that read better with it.
_iter_installed_vscode_hooks = _iter_installed_aictl_hooks


def _hook_targets(scope: str) -> list[tuple[str, Path, frozenset[str], int]]:
    """``(tool, file, valid events, expected rule count)`` for each tool aictl registers.

    This is the one list of where hooks go; status, doctor and verify read it.
    """
    return [
        ("claude-code", _settings_path(scope), CLAUDE_KNOWN_EVENTS, len(HOOK_EVENTS)),
        ("gemini-cli", _gemini_settings_path(scope), frozenset(GEMINI_HOOK_EVENTS), len(GEMINI_HOOK_MAP)),
        ("copilot", _vscode_hook_settings_path(scope), frozenset(VSCODE_HOOK_EVENTS), len(VSCODE_HOOK_EVENTS)),
    ]


def _collect_doctor_results(scope: str) -> list[dict]:
    probe_cache: dict[str, str | None] = {}
    results: list[dict] = []
    expected_port = _default_port()
    for tool, path, known, _count in _hook_targets(scope):
        for event, rule in _iter_installed_aictl_hooks(path):
            entry = _doctor_check_one(
                event, rule, probe_cache, known_events=known, expected_port=expected_port, scope=scope
            )
            entry["tool"] = tool
            entry["path"] = str(path)
            results.append(entry)
    return results


def _invalid_tool_configs(scope: str) -> list[dict]:
    """Every tool config that does not parse, each with the exact fix.

    A tool cannot read these, so they fail the check whether or not aictl caused it.
    """
    paths = [path for _tool, path, _known, _count in _hook_targets(scope)]
    paths.extend([copilot_global_dir() / "config.json", copilot_global_dir() / "settings.json"])
    paths.extend(hook_removal.vscode_settings_paths(Path.home()))
    paths.append(codex_global_dir() / "config.toml")
    out: list[dict] = []
    for path in dict.fromkeys(paths):
        try:
            text = hook_removal.read_text_exact(path)
        except (OSError, UnicodeDecodeError):
            continue
        error = hook_removal.config_error(path, text)
        if not error:
            continue
        repairable = path.suffix == ".toml" and not hook_removal.toml_error(hook_removal.repair_codex_text(text))
        fix = (
            "aictl hooks repair"
            if repairable
            else f"fix the syntax in {path} by hand ({error}), then re-run this check"
        )
        out.append({"path": str(path), "error": error, "fix": fix})
    return out


def _file_state(path: Path) -> str:
    """``absent``, ``corrupt`` or ``ok``, so a broken file is reported rather than read as empty."""
    if not path.exists():
        return "absent"
    try:
        jsonc_loads(path.read_text("utf-8"))
    except (OSError, ValueError):
        return "corrupt"
    return "ok"


def _disabled_files(tool: str, path: Path) -> list[Path]:
    """aictl hook files switched off by renaming, next to this tool's hook file."""
    return hook_removal.disabled_by_rename(path.parent) if tool == "copilot" else []


def _collect_hook_status(scope: str) -> dict:
    """Per-tool truth: what is registered, what is wrong, and the command that fixes it."""
    results = _collect_doctor_results(scope)
    tools: list[dict] = []
    for tool, path, _known, expected in _hook_targets(scope):
        rules = [r for r in results if r["tool"] == tool]
        file_state = _file_state(path)
        problems = sorted({r["state"] for r in rules if r["status"] != "OK"})
        renamed = _disabled_files(tool, path)
        if file_state == "corrupt":
            state, fix = "corrupt", f"fix the JSON in {path}, then: aictl hooks install --scope {scope}"
        elif not rules and renamed:
            state = "disabled-by-rename"
            fix = "to remove it: aictl disable; to turn hooks back on: aictl enable --replace-disabled"
        elif not rules and tool != "copilot" and not path.exists() and _tool_folder_missing(path, scope):
            state, fix = "not-installed", ""
        elif not rules:
            state, fix = "not-registered", ""
        elif problems:
            state = problems[0]
            fix = next(r["fix"] for r in rules if r["state"] == state)
        elif len(rules) < expected:
            state, fix = "partial", f"aictl hooks install --scope {scope}"
        else:
            state, fix = "registered", ""
        warnings = []
        if tool == "copilot" and scope == "project" and rules and copilot_cli_trusts(Path.cwd()) is False:
            warnings.append(_untrusted_folder_steps(Path.cwd()))
        tools.append(
            {
                "tool": tool,
                "scope": scope,
                "warnings": warnings,
                "path": str(path),
                "symlink": path.is_symlink(),
                "state": state,
                "problems": problems,
                "rules": len(rules),
                "expected_rules": expected,
                "ports": sorted({r["port"] for r in rules if r["port"] is not None}),
                "disabled_files": [str(p) for p in renamed],
                "fix": fix,
            }
        )
    leftovers = hook_removal.remove_everything(Path.home(), projects=[Path.cwd()], dry_run=True)
    invalid = _invalid_tool_configs(scope)
    return {
        "scope": scope,
        "port": _default_port(),
        "tools": tools,
        "invalid_configs": invalid,
        "leftovers": leftovers.changes,
        "notes": leftovers.notes,
        "ok": not invalid
        and not any(
            t["state"] not in ("registered", "not-registered", "not-installed", "disabled-by-rename") for t in tools
        ),
    }


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
    fixes = sorted({r["fix"] for r in results if r.get("fix")})
    for fix in fixes:
        click.echo(f"  fix: {fix}")


@hooks.command(name="status")
@click.option("--scope", type=click.Choice(["project", "user"]), default="user", help="Which hook files to report")
@click.option("--json", "as_json", is_flag=True, help="Emit machine-readable JSON")
def hooks_status_cmd(scope: str, as_json: bool):
    """Report each tool's real hook state and the exact command that fixes it.

    Also lists every leftover `aictl disable` would remove. Reads only; exits 1
    when a tool's hooks need attention.
    """
    report = _collect_hook_status(scope)
    if as_json:
        click.echo(json.dumps(report, indent=2))
    else:
        for t in report["tools"]:
            link = " (symlink)" if t["symlink"] else ""
            ports = f" port {','.join(map(str, t['ports']))}" if t["ports"] else ""
            click.echo(
                f"{t['tool']:<12} {t['state']:<20} {t['rules']}/{t['expected_rules']} rules{ports}  {t['path']}{link}"
            )
            for renamed in t["disabled_files"]:
                click.echo(f"  disabled by rename: {renamed}")
            for warning in t["warnings"]:
                click.secho(f"  [WARN] {warning}", fg="red")
            if t["fix"]:
                click.echo(f"  fix: {t['fix']}")
        for bad in report["invalid_configs"]:
            click.echo(f"[FAIL] invalid config: {bad['path']}: {bad['error']}")
            click.echo(f"  fix: {bad['fix']}")
        if report["leftovers"]:
            click.echo("\nLeftovers. To remove them: aictl disable")
            for line in report["leftovers"]:
                click.echo(f"  {line}")
        for line in report["notes"]:
            click.echo(f"  note: {line}")
    if not report["ok"]:
        raise SystemExit(1)


@hooks.command(name="repair")
@click.option("--dry-run", is_flag=True, help="Say what would change and write nothing")
def repair(dry_run: bool):
    """Repair a Codex config.toml that an older `aictl enable` made invalid.

    Removes only aictl's inline exporter keys that collide with an
    ``[otel.exporter.*]`` subtable. Anything else invalid is left for you to fix.
    """
    path = codex_global_dir() / "config.toml"
    try:
        text = hook_removal.read_text_exact(path)
    except OSError:
        click.echo(f"Nothing to repair: {path} does not exist")
        return
    if not hook_removal.toml_error(text):
        click.echo(f"Nothing to repair: {path} is valid")
        return
    fixed = hook_removal.repair_codex_text(text)
    error = hook_removal.toml_error(fixed)
    if error:
        raise click.ClickException(f"cannot repair {path} automatically ({error}); fix it by hand")
    if dry_run:
        click.echo(f"[dry-run] would remove the colliding inline exporter keys from {path}")
        return
    WriteGuard.install("hooks repair")
    _write_text_atomic(path, fixed)
    click.echo(f"Repaired {path}")


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
    invalid = _invalid_tool_configs(scope)
    renamed = [str(p) for tool, path, _k, _c in _hook_targets(scope) for p in _disabled_files(tool, path)]
    if as_json:
        click.echo(
            json.dumps(
                {
                    "settings_path": str(settings_path),
                    "results": results,
                    "invalid_configs": invalid,
                    "disabled_by_rename": renamed,
                },
                indent=2,
            )
        )
    else:
        _emit_doctor_text(results, settings_path)
        for path in renamed:
            click.echo(f"  disabled by rename: {path}")
        for bad in invalid:
            click.echo(f"  [FAIL] invalid config: {bad['path']}: {bad['error']}")
            click.echo(f"  fix: {bad['fix']}")
    if invalid or any(r["status"] == "FAIL" for r in results):
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
    _enable_otel(port, actions, tools=tools, profile=profile, force=force, create_missing=tool != "all")

    # ── Summary ────────────────────────────────────────────────
    failures = [a for a in actions if "FAILED" in a]
    click.secho("OTel enabled:", fg="green", bold=True)
    for action in actions:
        if not action.startswith(NEEDS_YOU):
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
    needs_you = _report_needs_you(actions)
    if failures:
        raise SystemExit(1)
    if needs_you:
        raise SystemExit(EXIT_NEEDS_YOU)


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


# What Claude Code needs to export to aictl. It has no default OTLP protocol and
# its default endpoint is not aictl's port, so both are always set.
CLAUDE_OTEL_ENV_KEYS = (
    "CLAUDE_CODE_ENABLE_TELEMETRY",
    "OTEL_METRICS_EXPORTER",
    "OTEL_LOGS_EXPORTER",
    "OTEL_LOG_USER_PROMPTS",
    "OTEL_LOG_TOOL_DETAILS",
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
)

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
_CODEX_EXPORTER_TABLE_RE = re.compile(r"(?m)^\s*\[otel\.(exporter|metrics_exporter|trace_exporter)\b")


def _codex_otel_exporter_configured(content: str) -> bool:
    """True when an exporter exists in either TOML form.

    ``exporter = {...}`` inside ``[otel]`` and an ``[otel.exporter.otlp-http]``
    subtable declare the same key. Adding the first next to the second makes the
    file invalid TOML, so both count.
    """
    if _CODEX_EXPORTER_TABLE_RE.search(content):
        return True
    m = _CODEX_OTEL_SECTION_RE.search(content)
    if not m:
        return False
    return bool(re.search(r"^\s*(metrics_exporter\s*=|exporter\s*=\s*(?!\"none\"))", m.group(0), re.M))


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
    # Hooks: none needed. The Copilot harness loads ~/.copilot/hooks whatever
    # chat.useHooks says; that toggle only drives the legacy Local harness, so a
    # person's own value there is theirs. chat.useClaudeHooks stays off: with it
    # VS Code runs every Claude hook too, and aictl's Claude rules fire twice.
    "chat.useCustomAgentHooks": True,
    # Instructions & context files
    "chat.useAgentsMdFile": True,
    "chat.includeApplyingInstructions": True,
    "chat.useNestedAgentsMdFiles": True,
    "chat.useCustomizationsInParentRepositories": True,
    # MCP
    "chat.mcp.discovery.enabled": True,
    "chat.mcp.autoStart": True,
}


def _ours(path: Path, key: str, value: object, member: str | None = None) -> bool:
    """*value* at *key* (or *key*.*member*) is what aictl wrote there earlier."""
    entry = hook_removal.load_manifest(Path.home()).get(str(path), {}).get(key)
    if not isinstance(entry, dict):
        return False
    wrote = entry.get("wrote")
    if member is None:
        return wrote == value
    return isinstance(wrote, dict) and wrote.get(member, hook_removal.DELETE) == value


NEEDS_YOU = "NEEDS YOU: "
# Exit codes: 1 when a write failed, 2 when a setting was left for the person to change.
EXIT_NEEDS_YOU = 2


def _report_needs_you(actions: list[str]) -> bool:
    """Print every setting aictl left alone as numbered steps, loudly. True when there was one."""
    needs = [a[len(NEEDS_YOU) :] for a in actions if a.startswith(NEEDS_YOU)]
    if not needs:
        return False
    click.echo()
    click.secho(
        f"NOT CHANGED: {len(needs)} setting(s) need you: aictl does not change your own values or a tool's trust.",
        fg="red",
        bold=True,
    )
    click.secho("Until you change them, that data does not reach aictl. To change them:", fg="red")
    for i, step in enumerate(needs, 1):
        click.secho(f"  {i}. {step}", fg="red")
    click.secho("Then run the same aictl command again to check.", fg="red")
    return True


def _windows_user_env(key: str) -> str | None:
    """The value of user environment variable *key* (``HKCU\\Environment``), or None."""
    out = hook_removal._reg("query", "HKCU\\Environment", "/v", key)
    for line in (out or "").splitlines():
        parts = line.split(None, 2)
        if len(parts) == 3 and parts[0].lower() == key.lower() and parts[1].startswith("REG_"):
            return parts[2].strip()
    return None


def _env_is_trivial(key: str, have: str | None, want: str) -> bool:
    """aictl may set *key*: it is unset, already *want*, aictl's own, or an endpoint on this machine."""
    if have is None or have == want or key.startswith("AICTL_"):
        return True
    return key.endswith("ENDPOINT") and hook_removal._is_local_endpoint(have)


def _write_json_settings(
    path: Path, updates: dict, *, force: bool = False, note: bool = False, conflicts: list[str] | None = None
) -> str:
    """Merge updates into a JSON(C) settings file, recording how to undo them.

    Top-level keys are replaced, except that a dict value is merged one level
    deep into an existing dict. Comments and formatting survive. Each changed
    key's previous value goes into a manifest so ``aictl disable`` restores
    exactly what was there. Returns a status string.
    """
    status = "updated" if path.exists() else "created"
    existing = _read_json_strict(path, force=force) if path.exists() else {}
    merged: dict = {}
    edits: dict = {}
    skipped: list[str] = []
    for key, value in updates.items():
        current = existing.get(key, hook_removal.DELETE)
        if isinstance(value, dict) and isinstance(current, dict):
            # Only aictl's entries change inside the person's block, and only an entry
            # that is missing or still holds what aictl wrote. Anything else is theirs.
            take = {}
            for k, v in value.items():
                have = current.get(k, hook_removal.DELETE)
                if have is hook_removal.DELETE or have == v or _ours(path, key, have, k):
                    take[k] = v
                else:
                    skipped.append(
                        f'In {path}, set "{k}" inside "{key}" to {json.dumps(v)}. It is {json.dumps(have)} now.'
                    )
            if take:
                merged[key] = {**current, **take}
                edits[key] = hook_removal.Members(
                    {k: v for k, v in take.items() if current.get(k, hook_removal.DELETE) != v}
                )
        elif current is hook_removal.DELETE or current == value or _ours(path, key, current):
            merged[key] = edits[key] = value
        else:
            skipped.append(f'In {path}, set "{key}" to {json.dumps(value)}. It is {json.dumps(current)} now.')
    if conflicts is not None:
        conflicts.extend(skipped)
    if not edits:
        return "unchanged"
    _record_vscode_manifest(path, existing, merged)
    if not _update_json_file(path, edits, force=force, note=note):
        return "unchanged"
    return status


def _record_vscode_manifest(path: Path, existing: dict, merged: dict) -> None:
    """Remember the pre-aictl value of each key (first write wins across re-runs)."""
    home = Path.home()
    manifest = hook_removal.load_manifest(home)
    entries = manifest.setdefault(str(path), {})
    changed = False
    for key, value in merged.items():
        if key in entries:
            if entries[key].get("wrote") != value:
                entries[key]["wrote"] = value
                changed = True
        elif existing.get(key, hook_removal.DELETE) != value:
            entries[key] = {"had": key in existing, "prev": existing.get(key), "wrote": value}
            changed = True
    if changed:
        _write_json_atomic(hook_removal.manifest_path(home), manifest)


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

    Copilot loads ``{"version": 1, "hooks": {"EventName": [{"type":"command","command":"..."}]}}``.
    Each command entry carries the ``_aictl_owner`` marker so doctor / diff
    tooling can attribute it back to us. VS Code ignores unknown keys in
    hook entries, so the marker is safe to include.
    """
    target_events = events or VSCODE_HOOK_EVENTS
    source_id = _source_id(scope, "vscode")
    shell = "cmd" if IS_WINDOWS else "posix"  # Node shell: plain quoted path, no PowerShell `&`
    hooks: dict[str, list[dict]] = {}
    for event in target_events:
        if event not in VSCODE_HOOK_EVENTS:
            raise ValueError(f"refusing to register {event!r}: not a Copilot hook event")
        label = _COPILOT_EVENT_LABELS.get(event, event)
        entry: dict = {"type": "command", "command": _handler_command(label, port, source_id, shell=shell)}
        if IS_WINDOWS:
            # Copilot copies `command` into `powershell` when that is absent, and
            # the cmd.exe guard is a syntax error there. Each shell gets its own line.
            entry["bash"] = _handler_command(label, port, source_id, shell="posix")
            entry["powershell"] = _handler_command(label, port, source_id, shell="powershell")
        entry["timeoutSec"] = _COPILOT_HOOK_TIMEOUT_SEC
        entry["_aictl_owner"] = _AICTL_OWNER_MARKER
        hooks[event] = [entry]
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

    if scope == "project" and _would_be_committed(hook_path):
        actions.append(f"VS Code Copilot hooks skipped: {hook_path} is not gitignored and holds machine paths")
        return
    hook_config = _build_vscode_hook_config(port, None, scope=scope)
    _register_hook_file(hook_path, hook_config, force=force, version=_COPILOT_HOOK_FILE_VERSION)
    actions.append(f"VS Code Copilot hooks ({len(VSCODE_HOOK_EVENTS)} events) → {hook_path}")
    if scope == "project" and copilot_cli_trusts(Path.cwd()) is False:
        actions.append(NEEDS_YOU + _untrusted_folder_steps(Path.cwd()))


def copilot_cli_trusts(folder: Path) -> bool | None:
    """Whether Copilot CLI loads ``.github/hooks`` in *folder*: it skips them in a folder it does not trust.

    True when *folder* is in, or under, a ``trustedFolders`` entry of ``~/.copilot/config.json``.
    None when that file is absent or unreadable (Copilot CLI is not set up here).
    """
    config = copilot_global_dir() / "config.json"
    try:
        trusted = jsonc_loads(config.read_text("utf-8")).get("trustedFolders")
    except (OSError, ValueError, AttributeError):
        return None
    if not isinstance(trusted, list):
        return False
    here = Path(os.path.realpath(folder))
    for entry in trusted:
        if not isinstance(entry, str) or not entry:
            continue
        root = Path(os.path.realpath(os.path.expanduser(entry)))
        if here == root or root in here.parents:
            return True
    return False


def _untrusted_folder_steps(folder: Path) -> str:
    config = copilot_global_dir() / "config.json"
    return (
        f"Copilot CLI does not trust {folder}, so it skips the hooks in {folder / '.github' / 'hooks'}. "
        f'To trust it: run copilot in {folder} and choose to trust the folder, or add "{folder}" to '
        f'"trustedFolders" in {config}. VS Code reads the hooks without this.'
    )


def _gemini_settings_path(scope: str) -> Path:
    """Return the Gemini CLI settings path for the given scope."""
    if scope == "project":
        return Path.cwd() / ".gemini" / "settings.json"
    return gemini_global_dir() / "settings.json"


def _tool_folder_missing(path: Path, scope: str) -> bool:
    """True when a user-scope config file's folder is absent, so the tool is not installed.

    Registering must not create a tool's folder: that would leave a stray
    ``~/.gemini`` or ``~/.claude`` behind for a tool the machine does not have.
    Project scope keeps creating its folders.
    """
    return scope == "user" and not path.parent.is_dir()


def _install_hooks(scope: str, port: int, actions: list[str], *, force: bool = False) -> None:
    """Register hooks for every supported tool, one file and one rule builder per tool.

    A tool whose file cannot be used is reported as FAILED and the others still
    get registered. At user scope a tool whose folder does not exist is skipped
    (Copilot's ``~/.copilot/hooks`` is exempt: VS Code reads it without a CLI).
    """

    def register(label: str, path: Path, rules: dict, count: int, **top_level: object) -> None:
        if _tool_folder_missing(path, scope):
            actions.append(f"{label} hooks skipped: {path.parent} does not exist (tool not installed)")
            return
        try:
            _register_hook_file(path, rules, force=force, **top_level)
            actions.append(f"{label} hooks ({count} events) → {path}")
        except click.ClickException as exc:
            actions.append(f"{label} hooks FAILED: {exc.message}")

    register(
        "Claude Code",
        _settings_path(scope),
        _build_hook_config(port, None, source_tool="claude", scope=scope),
        len(HOOK_EVENTS),
    )

    # Map internal HOOK_EVENTS (PascalCase) to official Gemini CLI events.
    gemini_path = _gemini_settings_path(scope)
    if scope == "project" and _would_be_committed(gemini_path):
        actions.append(f"Gemini CLI hooks skipped: {gemini_path} is not gitignored and holds machine paths")
    else:
        gemini_only_events = [e for e in HOOK_EVENTS if e in GEMINI_HOOK_MAP]
        gemini_rules = _build_hook_config(
            port, gemini_only_events, event_map=GEMINI_HOOK_MAP, matcher="*", source_tool="gemini", scope=scope
        )
        register("Gemini CLI", gemini_path, gemini_rules, len(gemini_rules))

    # Copilot: a separate file in chat.hookFilesLocations' default directories
    # (``.github/hooks`` for project, ``~/.copilot/hooks`` for user).
    try:
        _install_vscode_hooks(scope, port, actions, force=force)
    except click.ClickException as exc:
        actions.append(f"VS Code Copilot hooks FAILED: {exc.message}")


def _enable_otel(
    port: int,
    actions: list[str],
    *,
    tools: list[str] | tuple[str, ...] | None = None,
    profile: str | None = None,
    force: bool = False,
    create_missing: bool = False,
) -> None:
    """Enable OTel export for *tools* (default: all) and report actions.

    VS Code's settings file is created only when *create_missing* is set, which
    ``aictl otel enable --tool copilot`` does because the tool was named.

    The single implementation behind both ``aictl otel enable`` and
    ``aictl enable``: env vars (shell profiles / setx / launchctl), Copilot's
    VS Code settings, and Codex's ``config.toml``.
    """
    endpoint = f"http://localhost:{port}"
    tools = list(tools) if tools is not None else list(_ALL_OTEL_TOOLS)
    env_block = _build_env_block(port, tools, profile)

    if IS_WINDOWS:
        written = 0
        for key, val in env_block.items():
            have = _windows_user_env(key)
            if not _env_is_trivial(key, have, val):
                actions.append(
                    f'{NEEDS_YOU}Windows user environment variable {key} is "{have}"; aictl needs "{val}". '
                    f'To change it, run: setx {key} "{val}"'
                )
                continue
            if have != val:
                _run_env_persist(["setx", key, val])
                written += 1
            os.environ[key] = val
        actions.append(f"OTel env vars → Windows user environment ({written} set via setx, {len(env_block)} wanted)")
        actions.append("  Note: new terminals will inherit; current session updated")
    else:
        _update_shell_profiles_block(
            env_block,
            actions,
            update_label="OTel env vars → {profile}",
            create_label="OTel env vars → {profile} (created)",
        )

    # launchd state is per user, not per $HOME: a redirected HOME must not leak out.
    if IS_MACOS and hook_removal.is_real_home(Path.home()):
        for key, val in env_block.items():
            _run_env_persist(["launchctl", "setenv", key, val])
        actions.append(f"OTel env vars → macOS launchctl ({len(env_block)} vars)")

    # Claude Code reads the `env` block of its user settings however it is started:
    # from a terminal, the desktop app or an editor. Shell profiles reach only the
    # first, and launchctl values do not survive a restart.
    if "claude" in tools:
        settings_path = claude_global_dir() / "settings.json"
        claude_env = {k: env_block[k] for k in CLAUDE_OTEL_ENV_KEYS if k in env_block}
        try:
            if not create_missing and not settings_path.parent.is_dir():
                actions.append(f"Claude Code OTel settings skipped: {settings_path.parent} does not exist")
            else:
                needs: list[str] = []
                status = _write_json_settings(settings_path, {"env": claude_env}, force=force, conflicts=needs)
                actions.append(f"Claude Code OTel → {settings_path} env ({len(claude_env)} vars, {status})")
                actions.extend(NEEDS_YOU + n for n in needs)
        except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
            actions.append(f"Claude Code OTel → {settings_path} FAILED ({exc})")

    # Copilot OTel settings in VS Code
    if "copilot" in tools:
        try:
            settings_path = vscode_user_dir() / "settings.json"
            if not create_missing and not settings_path.parent.is_dir():
                actions.append(f"Copilot OTel skipped: {settings_path.parent} does not exist (VS Code not installed)")
            else:
                needs = []
                status = _write_json_settings(
                    settings_path, _copilot_otel_settings(endpoint), force=force, note=True, conflicts=needs
                )
                actions.append(f"Copilot OTel → VS Code settings.json ({status})")
                actions.extend(NEEDS_YOU + n for n in needs)
        except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
            actions.append(f"Copilot OTel → VS Code settings.json FAILED ({exc})")

    # Codex config.toml is read for status but never written: a config using
    # [otel.exporter.*] subtables cannot safely gain the inline form, and the
    # result would stop Codex from starting.
    if "codex" in tools:
        actions.append(
            f"Codex OTel not configured, {codex_global_dir() / 'config.toml'} left untouched: "
            "aictl no longer writes this file, so add an [otel] exporter there yourself"
        )


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

    if scope == "project" and _would_be_committed(settings_path):
        actions.append(f"VS Code agent settings skipped: {settings_path} is not gitignored")
        return
    if _tool_folder_missing(settings_path, scope):
        actions.append(f"VS Code agent settings skipped: {settings_path.parent} does not exist (VS Code not installed)")
        return
    try:
        updates = dict(_VSCODE_AGENT_SETTINGS)
        # A user-set map REPLACES VS Code's defaults, so only then does our hook
        # location need listing. Without a map the defaults already include it.
        current = _read_json_strict(settings_path, force=force) if settings_path.exists() else {}
        locations = current.get("chat.hookFilesLocations")
        if isinstance(locations, dict) and scope == "user" and "~/.copilot/hooks" not in locations:
            updates["chat.hookFilesLocations"] = {"~/.copilot/hooks": True}
        needs: list[str] = []
        status = _write_json_settings(settings_path, updates, force=force, note=True, conflicts=needs)
        n = len(updates)
        actions.append(f"VS Code agent/hooks/context ({n} settings) → {settings_path} ({status})")
        actions.extend(NEEDS_YOU + x for x in needs)
    except Exception as exc:  # noqa: BLE001 — best-effort integration; FAILED is reported and exits 1
        actions.append(f"VS Code agent settings → {settings_path} FAILED ({exc})")


def _leave_removal_script(actions: list[str]) -> None:
    """Copy the standalone remover where it survives `pipx uninstall aictl`."""
    target = hook_removal.aictl_config_dir(Path.home()) / "remove-hooks.py"
    source = Path(hook_removal.__file__)
    try:
        if not target.exists() or target.read_bytes() != source.read_bytes():
            target.parent.mkdir(parents=True, exist_ok=True)
            hook_removal.write_atomic(target, source.read_text("utf-8"))
        actions.append(f"Removal script → {target} (needs only python3, works without aictl)")
    except OSError as exc:
        actions.append(f"Removal script not written: {exc}")


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
@click.option(
    "--replace-disabled",
    is_flag=True,
    help="Register Copilot hooks even though a renamed aictl.json*.disabled file is present",
)
def enable(scope: str, port: int | None, dry_run: bool, force: bool, replace_disabled: bool) -> None:
    """Enable all aictl integrations: hooks, OTel, and VS Code agent features.

    \b
    Enables in one shot:
      - Claude Code hooks (all events → aictl /api/hooks)
      - OTel telemetry for Claude Code, Copilot, and Codex
      - VS Code Copilot agent, hooks, nested agents, MCP discovery

    \b
    Scope:
      --scope user     global — applies to all projects (default)
      --scope project  local  — writes hooks to .claude/settings.local.json; never to a file
                       the repository would commit; OTel is not touched

    Undo with `aictl disable`, or without aictl: run remove-hooks.py from aictl's config directory

    \b
    Examples:
        aictl enable                     # enable everything globally
        aictl enable --scope project     # enable for current project only
        aictl enable --dry-run           # preview without writing
    """
    port = port if port is not None else _default_port()
    renamed = hook_removal.disabled_by_rename(_vscode_hook_settings_path(scope).parent)
    if renamed and not replace_disabled:
        names = ", ".join(str(p) for p in renamed)
        raise click.ClickException(
            f"Copilot hooks were disabled by renaming: {names}. Nothing was changed. "
            "To turn them back on: aictl enable --replace-disabled. To remove them: aictl disable."
        )
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
            if scope == "user":
                for p in _shell_profiles():
                    click.echo(f"  [otel]   {p}")
                if IS_MACOS:
                    click.echo("  [otel]   macOS launchctl")
        if scope == "user":
            click.echo(f"  [otel]   {vscode_path} (Copilot OTel keys)")
        click.echo(f"  [vscode] {vscode_path} ({len(_VSCODE_AGENT_SETTINGS)} agent/hooks/context keys)")
        return

    actions: list[str] = []

    _install_hooks(scope, port, actions, force=force)
    if scope == "user":
        _enable_otel(port, actions, force=force)
    else:
        actions.append("OTel not touched: it is machine-wide, enable it with `aictl otel enable`")
    _enable_vscode(scope, port, actions, force=force)
    _leave_removal_script(actions)

    failures = [a for a in actions if "FAILED" in a]
    click.secho("\naictl integrations enabled:", fg="green", bold=True)
    for action in actions:
        if not action.startswith(NEEDS_YOU):
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
    needs_you = _report_needs_you(actions)
    if failures:
        raise SystemExit(1)
    if needs_you:
        raise SystemExit(EXIT_NEEDS_YOU)
