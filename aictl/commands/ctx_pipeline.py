# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: deploy + scan + diff + validate + init — ctx pipeline commands."""

from __future__ import annotations

import difflib
import json
import re
import signal
import stat
import threading
from collections import Counter
from contextlib import ExitStack
from dataclasses import dataclass, field
from pathlib import Path
from unittest.mock import patch

import click

from ..context import scan, SKIP_DIRS
from ..resolver import resolve
from .. import emitters as registry
from ..resolver import load_manifest, save_manifest, cleanup_stale
from ..memory import swap_memory
from ..utils import estimate_tokens
from ..context import check_parsed_features
from ..context import AICTX_FILENAME, parse_aictx
from .integrations import HOOK_EVENTS as _HOOK_EVENTS


# ─── deploy ──────────────────────────────────────────────────────────────────


def _run_deploy(root: Path, profile: str | None, emitter_names: list[str], dry_run: bool) -> bool:
    """Run a single deploy cycle. Returns True if files were found and deployed."""
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.toml files found under {root}\n", fg="yellow")
        return False

    click.secho(f"\n\U0001f4e6  Deploying from {root}", bold=True)
    if profile:
        click.secho(f"   profile: {profile}", fg="magenta")
    click.secho(f"   scanned: {len(scanned)} .toml file(s)", fg="bright_black")
    for rel, _ in scanned:
        click.secho(f"      {rel}/", fg="bright_black")

    # --- Feature compatibility warnings (non-blocking) ---
    for rel, parsed in scanned:
        compat_warnings = check_parsed_features(parsed)
        for kind, label, tools in compat_warnings:
            tool_list = ", ".join(tools)
            click.secho(f"   \u26a0 [{label}] \u2014 {kind} not supported by: {tool_list}", fg="yellow")

    # --- Phase 2: Resolve ---
    resolved = resolve(root, scanned, profile)

    # --- Phase 3: Emit ---
    old_manifest = None if dry_run else load_manifest(root)
    all_paths: list[str] = []

    for ename in emitter_names:
        emitter = registry.get(ename)
        results = emitter.emit(root, resolved, dry_run=dry_run)
        for r in results:
            all_paths.append(r["path"])
            pfx = click.style("   (dry)", fg="yellow") if dry_run else click.style("   \u2713", fg="green")
            tok = click.style(f'{r["tokens"]} tok', fg="cyan")
            fp = click.style(r["path"], fg="bright_black")
            click.echo(f"{pfx} {ename} \u2192 {fp} ({tok})")

    # Report capabilities
    kinds = Counter(c.kind for c in resolved.capabilities)
    if kinds:
        click.secho("   caps: " + ", ".join(f"{v} {k}{'s' * (v > 1)}" for k, v in kinds.items()), fg="bright_black")
    if resolved.mcp_servers:
        click.secho("   mcp: " + ", ".join(resolved.mcp_servers), fg="bright_black")
    if resolved.hooks:
        n = sum(len(r) for r in resolved.hooks.values())
        click.secho(f"   hooks: {len(resolved.hooks)} event(s), {n} rule(s)", fg="bright_black")
    if resolved.lsp_servers:
        click.secho("   lsp: " + ", ".join(resolved.lsp_servers), fg="bright_black")
    if resolved.ignores:
        click.secho(f"   ignores: {len(resolved.ignores)} pattern(s)", fg="bright_black")

    # --- Phase 4: Cleanup ---
    if not dry_run:
        removed = cleanup_stale(root, old_manifest, set(all_paths))
        if removed:
            click.secho(f"\n   \U0001f9f9  Cleaned {len(removed)} stale file(s):", fg="yellow")
            for f in removed:
                click.secho(f"      - {f}", fg="bright_black")

        # --- Phase 5: Memory swap ---
        old_profile = old_manifest["profile"] if old_manifest else None
        if profile != old_profile:
            sr = swap_memory(root, old_profile, profile)
            if sr:
                if sr["stashed"]:
                    click.secho(f"\n   \U0001f9e0  Memory stashed: {sr['stashed']}", fg="blue")
                if sr["restored"]:
                    click.secho(f"   \U0001f9e0  Memory restored: {sr['restored']}", fg="blue")
                if sr["created"]:
                    click.secho(f"   \U0001f9e0  Memory initialized: fresh for {profile}", fg="blue")

        save_manifest(root, profile, all_paths)

    click.echo()
    return True


def _collect_watch_dirs(root: Path) -> set[str]:
    """Return parent directories of all .toml files under root."""
    dirs: set[str] = set()

    def _walk(d: Path) -> None:
        if (d / AICTX_FILENAME).is_file():
            dirs.add(str(d))
        for item in sorted(d.iterdir()):
            if item.is_dir() and item.name not in SKIP_DIRS:
                _walk(item)

    _walk(root)
    return dirs


def _watch_loop(root: Path, profile: str | None, emitter_names: list[str], dry_run: bool) -> None:
    """Watch .toml files and re-deploy on changes."""

    try:
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer
    except ImportError:
        raise click.ClickException(
            "watchdog is required for --watch mode.\n"
            "Install it with: pip install aictl[monitor]"
        )

    # Initial deploy
    _run_deploy(root, profile, emitter_names, dry_run)

    # Collect directories to watch
    watch_dirs = _collect_watch_dirs(root)
    if not watch_dirs:
        click.secho("No .toml directories to watch.", fg="yellow")
        return

    # Debounce state
    lock = threading.Lock()
    timer: threading.Timer | None = None
    DEBOUNCE_SECONDS = 0.5

    def _schedule_redeploy(changed_path: str) -> None:
        nonlocal timer
        with lock:
            if timer is not None:
                timer.cancel()
            timer = threading.Timer(
                DEBOUNCE_SECONDS,
                _do_redeploy,
                args=[changed_path],
            )
            timer.daemon = True
            timer.start()

    def _do_redeploy(changed_path: str) -> None:
        rel = str(Path(changed_path).relative_to(root))
        click.secho(f"\nDetected change in {rel}, re-deploying...", fg="cyan")
        try:
            _run_deploy(root, profile, emitter_names, dry_run)
        except Exception as exc:  # noqa: BLE001 — watch loop must survive redeploy errors
            click.secho(f"Deploy error: {exc}", fg="red")
        click.secho("Watching for changes...", fg="bright_black")

    class AictxHandler(FileSystemEventHandler):
        def _on_aictx_event(self, event):
            if not event.is_directory and event.src_path.endswith(AICTX_FILENAME):
                _schedule_redeploy(event.src_path)

        on_created = on_modified = on_deleted = _on_aictx_event

    observer = Observer()
    handler = AictxHandler()
    # Watch root recursively to catch new .toml files in any subdirectory
    observer.schedule(handler, str(root), recursive=True)
    observer.start()

    click.secho("Watching for changes...", fg="bright_black")

    # Block until Ctrl+C
    stop = threading.Event()

    def _on_sigint(sig, frame):
        stop.set()

    original_handler = signal.getsignal(signal.SIGINT)
    signal.signal(signal.SIGINT, _on_sigint)

    try:
        stop.wait()
    finally:
        signal.signal(signal.SIGINT, original_handler)
        click.secho("\nStopping watcher...", fg="bright_black")
        with lock:
            if timer is not None:
                timer.cancel()
        observer.stop()
        observer.join(timeout=2.0)


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to deploy from")
@click.option("-p", "--profile", help="Active profile (debug, docs, review, ...)")
@click.option("-e", "--emit", "emitters", default="claude,copilot,cursor,windsurf,gemini", help="Comma-separated emitters")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
@click.option("--watch", is_flag=True, help="Re-deploy when .toml files change")
def deploy(root_dir, profile, emitters, dry_run, watch):
    """Scan .toml files and deploy native AI context files."""
    from ..utils import WriteGuard
    if not dry_run:
        WriteGuard.install("deploy")
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise click.ClickException(f"Not a directory: {root}")

    emitter_names = [e.strip() for e in emitters.split(",")]

    if watch:
        _watch_loop(root, profile, emitter_names, dry_run)
    else:
        _run_deploy(root, profile, emitter_names, dry_run)


# ─── scan ────────────────────────────────────────────────────────────────────


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
def scan_cmd(root_dir):
    """Discover .context.toml files and show scope map."""
    root = Path(root_dir).resolve()
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.toml files under {root}\n", fg="bright_black")
        return

    click.secho(f"\n🔍  Scanning {root}\n", bold=True)
    for rel, parsed in scanned:
        label = "(root)" if rel == "." else rel
        is_root_marker = click.style(" ← root", fg="green") if rel == "." else ""
        click.echo(f"   {click.style(label, bold=True)}{is_root_marker}")

        # Instructions
        instr_sections = [k for k in parsed.instructions if parsed.instructions[k]]
        if instr_sections:
            lines_info = ", ".join(f"{s} ({len(parsed.instructions[s].splitlines())}L)" for s in instr_sections)
            click.secho(f"      instructions: {lines_info}", fg="bright_black")

        # Capabilities
        cap_kinds = Counter(f"{c.kind}:{c.profile}" for c in parsed.capabilities)
        if cap_kinds:
            click.secho(f"      capabilities: {', '.join(f'{v} {k}' for k, v in cap_kinds.items())}", fg="bright_black")

        # MCP
        if parsed.mcp_servers:
            names = [f"{m.name} ({m.profile})" for m in parsed.mcp_servers]
            click.secho(f"      mcp: {', '.join(names)}", fg="bright_black")

        # Inherit
        if parsed.inherit:
            for direction, kinds in parsed.inherit.items():
                click.secho(f"      inherit {direction}: {', '.join(kinds)}", fg="yellow")

        click.echo()

    click.echo(f"   Total: {len(scanned)} scope(s)")
    caps_total = sum(len(p.capabilities) for _, p in scanned)
    mcp_total = sum(len(p.mcp_servers) for _, p in scanned)
    if caps_total:
        click.echo(f"   Capabilities: {caps_total} (root-only unless inherited)")
    if mcp_total:
        click.echo(f"   MCP servers: {mcp_total}")
    click.echo()


# ─── diff ────────────────────────────────────────────────────────────────────


# Regex to normalize the deploy-timestamp inside marker comments so that
# timestamp-only differences don't show up as spurious diffs.
_DEPLOY_TS_RE = re.compile(
    r"(<!-- AI-CONTEXT:DEPLOYED\b[^|]*\|[^|]*\| deployed: )\S+(-->)"
)

_DIFF_STYLES = [
    ("+++", "white", True), ("---", "white", True),
    ("@@", "cyan", False), ("+", "green", False), ("-", "red", False),
]

# Modules whose write_safe we patch to capture intended file content.
# All emitters route through emit_file() → write_safe() in aictl.utils.
_WRITE_SAFE_TARGETS = [
    "aictl.utils",
]


@click.command("diff")
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to deploy from")
@click.option("-p", "--profile", help="Active profile (debug, docs, review, ...)")
@click.option("-e", "--emit", "emitters", default=None, help="Comma-separated emitters (default: all)")
def diff(root_dir: str, profile: str | None, emitters: str | None) -> None:
    """Show what would change on the next deploy (dry-run diff)."""
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise click.ClickException(f"Not a directory: {root}")

    emitter_names = (
        [e.strip() for e in emitters.split(",")]
        if emitters
        else registry.all_names()
    )

    # --- Phase 1: Scan ---
    scanned = scan(root)
    if not scanned:
        click.secho("No .context.toml files found.", fg="yellow")
        return

    # --- Phase 2: Resolve ---
    resolved = resolve(root, scanned, profile)

    # --- Phase 3: Emit into a capture dict (no disk writes) ---
    # Emitters import write_safe into their own namespace, so we must patch
    # each module individually to intercept the call.
    captured: dict[str, str] = {}  # abs path → intended content

    def _capture_write(path: Path, content: str) -> None:
        captured[str(path)] = content

    new_paths: set[str] = set()

    with ExitStack() as stack:
        for target in _WRITE_SAFE_TARGETS:
            stack.enter_context(patch(f"{target}.write_safe", _capture_write))
        for ename in emitter_names:
            emitter = registry.get(ename)
            results = emitter.emit(root, resolved, dry_run=False)
            for r in results:
                new_paths.add(r["path"])

    # --- Phase 4: Diff each file ---
    has_changes = False

    for file_path in sorted(new_paths):
        intended = captured.get(file_path)
        if intended is None:
            # Emitter returned this path but dry_run=True style (no content captured).
            # This can happen if the emitter conditionally skips write_safe.
            # Fall back: nothing to diff for this path.
            continue

        disk_path = Path(file_path)
        if disk_path.is_file():
            current = disk_path.read_text(encoding="utf-8")
        else:
            current = ""

        # Normalize deploy timestamps so re-deploys with identical content
        # don't produce noise.
        norm_current = _normalize_ts(current)
        norm_intended = _normalize_ts(intended)

        if norm_current == norm_intended:
            continue

        has_changes = True
        from_label = f"a/{_rel(file_path, root)}"
        to_label = f"b/{_rel(file_path, root)}"

        if not current:
            click.secho(f"\n--- /dev/null", fg="red")
            click.secho(f"+++ {to_label}", fg="green")
            click.secho("(new file)", fg="cyan")
            for line in intended.splitlines():
                click.secho(f"+{line}", fg="green")
        else:
            diff_lines = list(difflib.unified_diff(
                norm_current.splitlines(),
                norm_intended.splitlines(),
                fromfile=from_label,
                tofile=to_label,
                lineterm="",
            ))
            for line in diff_lines:
                for prefix, fg, bold in _DIFF_STYLES:
                    if line.startswith(prefix):
                        click.secho(line, fg=fg, bold=bold)
                        break
                else:
                    click.echo(line)

    # --- Phase 5: Check for stale files that would be removed ---
    old_manifest = load_manifest(root)
    if old_manifest and old_manifest.get("files"):
        for f in old_manifest["files"]:
            if f not in new_paths and Path(f).is_file():
                has_changes = True
                label = _rel(f, root)
                click.secho(f"\n--- a/{label}", fg="red")
                click.secho("+++ /dev/null", fg="green")
                click.secho("(file would be removed)", fg="cyan")
                for line in Path(f).read_text(encoding="utf-8").splitlines():
                    click.secho(f"-{line}", fg="red")

    if not has_changes:
        click.secho("\nNo changes — deploy output matches files on disk.\n", fg="green")


def _normalize_ts(text: str) -> str:
    """Strip deploy timestamps so they don't cause spurious diffs."""
    return _DEPLOY_TS_RE.sub(r"\1<TS>\2", text)


def _rel(file_path: str, root: Path) -> str:
    """Return a display-friendly relative path."""
    try:
        return str(Path(file_path).relative_to(root))
    except ValueError:
        return file_path


# ─── validate ────────────────────────────────────────────────────────────────


_SECTION_RE = re.compile(r"^\[([^\]]+)\]$")

KNOWN_TYPES = {
    "command", "agent", "skill", "mcp", "hook", "lsp",
    "setting", "permission", "env", "ignore",
    "memory", "inherit", "exclude",
}

KNOWN_HOOK_EVENTS = set(_HOOK_EVENTS)

# Types whose content must be valid JSON.
JSON_TYPES = {"mcp", "hook", "lsp"}


@dataclass
class Issue:
    file: str
    line: int | None
    level: str  # "error" or "warning"
    message: str


@dataclass
class FileResult:
    path: str
    issues: list[Issue] = field(default_factory=list)

    def err(self, msg: str, line: int | None = None) -> None:
        self.issues.append(Issue(self.path, line, "error", msg))

    def warn(self, msg: str, line: int | None = None) -> None:
        self.issues.append(Issue(self.path, line, "warning", msg))


def _walk(root: Path):
    """Yield .context.toml files, same skip logic as scanner."""
    f = root / AICTX_FILENAME
    if f.is_file():
        yield f
    for item in sorted(root.iterdir()):
        if item.is_dir() and item.name not in SKIP_DIRS:
            yield from _walk(item)


def _classify_header(header: str) -> tuple[str | None, str | None, str | None]:
    """Classify a section header into (kind, profile, name).

    Returns:
        For 3-part headers like "mcp:_always:github": ("mcp", "_always", "github")
        For 2-part headers like "memory:debug": ("memory", "debug", None)
        For 1-part headers like "base" or "inherit": (None, None, "base")
    """
    parts = [p.strip() for p in header.split(":")]
    if len(parts) == 3:
        return parts[0].lower(), parts[1], parts[2]
    elif len(parts) == 2:
        return parts[0].lower(), parts[1], None
    elif len(parts) == 1:
        return None, None, parts[0]
    return None, None, None


def _validate_file(path: Path, rel: str) -> FileResult:
    """Validate a single .toml file."""
    result = FileResult(path=rel)
    try:
        raw = path.read_text(encoding="utf-8")
    except (OSError, PermissionError) as exc:
        result.err(f"Cannot read file: {exc}")
        return result

    lines = raw.splitlines()

    # First pass: extract sections with their line numbers and content.
    sections: list[tuple[str, int, list[str]]] = []  # (header, start_line, content_lines)
    seen_headers: dict[str, int] = {}  # header -> first line number (1-based)
    current_header: str | None = None
    current_start: int = 0
    current_lines: list[str] = []

    for i, line in enumerate(lines):
        m = _SECTION_RE.match(line.strip())
        if m:
            if current_header is not None:
                sections.append((current_header, current_start, current_lines))
            current_header = m.group(1).strip()
            current_start = i + 1  # 1-based
            current_lines = []
            if current_header in seen_headers:
                result.err(
                    f"Duplicate section [{current_header}] "
                    f"(first seen at line {seen_headers[current_header]})",
                    current_start)
            else:
                seen_headers[current_header] = current_start
        else:
            if current_header is not None:
                current_lines.append(line)

    if current_header is not None:
        sections.append((current_header, current_start, current_lines))

    # Validate each section
    for header, start_line, content_lines in sections:
        content = "\n".join(content_lines).strip()
        kind, profile, name = _classify_header(header)

        if kind is not None:
            if kind not in KNOWN_TYPES:
                result.err(f"Unknown section type '{kind}' in [{header}]", start_line)
                continue
        else:
            if name and name.lower() in KNOWN_TYPES:
                kind = name.lower()

        if not content:
            result.warn(f"Empty section [{header}]", start_line)
            continue

        if kind in JSON_TYPES:
            try:
                parsed = json.loads(content)
                if kind == "hook":
                    _check_hook(header, start_line, profile, name, parsed, content_lines, rel, result)
            except json.JSONDecodeError as exc:
                json_err_line = start_line + _find_json_error_line(content_lines, exc)
                result.err(f"Malformed JSON in [{header}]: {exc.msg}", json_err_line)

        if kind == "hook" and name is not None and name not in KNOWN_HOOK_EVENTS:
            result.warn(f"Unknown hook event '{name}' in [{header}]", start_line)

    return result


def _check_hook(
    header: str,
    start_line: int,
    profile: str | None,
    name: str | None,
    parsed: object,
    content_lines: list[str],
    rel: str,
    result: FileResult,
):
    """Additional validation for parsed hook JSON."""
    # Hook content should be a dict or list of dicts.
    rules = parsed if isinstance(parsed, list) else [parsed]
    for rule in rules:
        if not isinstance(rule, dict):
            result.warn(f"Hook rule in [{header}] is not a JSON object", start_line)


def _find_json_error_line(content_lines: list[str], exc: json.JSONDecodeError) -> int:
    """Estimate which content line the JSON error is on.

    Returns offset from the section header (0-based), so caller adds start_line.
    """
    # json.JSONDecodeError has lineno (1-based within the JSON string).
    # content_lines may have leading blank lines before the JSON starts.
    # We count from the first non-blank line.
    first_content = next((i for i, line in enumerate(content_lines) if line.strip()), 0)
    return first_content + (exc.lineno - 1)


def _check_feature_compat(path: Path, rel: str) -> list[str]:
    """Check feature compatibility for a single .toml file.

    Returns a list of warning strings for unsupported features.
    """
    parsed = parse_aictx(path)
    if parsed is None:
        return []
    warnings = check_parsed_features(parsed)
    result: list[str] = []
    for kind, label, tools in warnings:
        tool_list = ", ".join(tools)
        result.append(f"\u26a0 [{label}] \u2014 {kind} not supported by: {tool_list}")
    return result


@click.command("validate")
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to scan")
def validate_cmd(root_dir):
    """Lint .context.toml files for common problems."""
    root = Path(root_dir).resolve()
    files = list(_walk(root))

    if not files:
        click.secho(f"\nNo .context.toml files under {root}\n", fg="bright_black")
        return

    click.secho(f"\nValidating {len(files)} .toml file(s) under {root}\n", bold=True)

    def _rel_display(path: Path) -> str:
        rel = str(path.parent.relative_to(root))
        return f"./{AICTX_FILENAME}" if rel == "." else f"{rel}/{AICTX_FILENAME}"

    all_results = [_validate_file(path, _rel_display(path)) for path in files]

    error_count = sum(1 for fr in all_results for i in fr.issues if i.level == "error")
    warning_count = sum(1 for fr in all_results for i in fr.issues if i.level != "error")

    for fr in all_results:
        if not fr.issues:
            continue
        click.secho(f"  {fr.path}", bold=True)
        for issue in fr.issues:
            line_hint = f":{issue.line}" if issue.line else ""
            marker = (click.style("error", fg="red", bold=True) if issue.level == "error"
                      else click.style("warn ", fg="yellow"))
            click.echo(f"    {marker} {issue.message} (line{line_hint})")
        click.echo()

    # Feature compatibility checks
    compat_count = 0
    for path, fr in zip(files, all_results):
        compat_warnings = _check_feature_compat(path, fr.path)
        if compat_warnings:
            if compat_count == 0:
                click.secho("  Feature compatibility:", bold=True)
            for w in compat_warnings:
                click.secho(f"    {w}", fg="yellow")
                compat_count += 1

    if compat_count:
        click.echo()

    # Summary
    if error_count == 0 and warning_count == 0 and compat_count == 0:
        click.secho("  All files valid.\n", fg="green")
    else:
        parts = [s for n, label, kw in [
            (error_count,   "error(s)",        {"fg": "red", "bold": True}),
            (warning_count, "warning(s)",       {"fg": "yellow"}),
            (compat_count,  "compat warning(s)", {"fg": "yellow"}),
        ] if n and (s := click.style(f"{n} {label}", **kw))]
        click.echo(f"  {', '.join(parts)}\n")

    if error_count > 0:
        raise SystemExit(1)


# ─── init ────────────────────────────────────────────────────────────────────


_TEMPLATE_HOOKS_COMMENT = """\
[hooks._always]
# Lifecycle hooks run automatically at specific events.
# Content is a JSON string of rule objects.
# Example (uncomment to activate):
# PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/lint-check.sh"}]}]'
"""

_TEMPLATE_HOOKS_ACTIVE = """\
[hooks._always]
# Block dangerous rm -rf commands before they execute.
PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/block-rm.sh"}]}]'
# Run a linter after every file write.
PostToolUse = '[{"matcher": "Write", "hooks": [{"type": "command", "command": ".claude/hooks/lint-on-write.sh"}]}]'
"""

_TEMPLATE_BASE = """\
# .context.toml — AI tool context for this project
# Docs: https://github.com/zvi-code/aictx
#
# TOML format. Profiles (_always, debug, docs, review, …) control when
# content is active. _always applies unconditionally.

[instructions]
# Project name and one-line description.
# Architecture overview, build/test commands, key conventions.
# Example:
# base = '''
# my-project — A web service for widget management.
# Stack: Python 3.12, FastAPI, PostgreSQL, pytest.
# Build: pip install -e '.[dev]'  Test: pytest  Lint: ruff check .
# Conventions: type hints everywhere, no bare except, ruff-formatted.
# '''

# Hints for debugging common issues.
# Example:
# debug = '''
# DB connection errors: check DATABASE_URL and pg_isready.
# Slow queries: enable EXPLAIN ANALYZE, check missing indexes.
# Import errors: ensure virtualenv is activated.
# '''

{hooks_section}
# [mcp._always.example]
# MCP server configuration.
# Uncomment and customize:
# type = "http"
# url = "https://api.example.com/mcp/"

# [inherit]
# Inherit capabilities from parent or ancestor .toml files.
# Uncomment and customize:
# parent = ["mcp", "commands"]
# recursive = ["skills"]

# [commands._always.example]
# Slash commands available to AI tools.
# Uncomment and customize:
# content = '''
# Show project health: run linter, type-checker, and test suite.
# '''
"""

_TEMPLATE = _TEMPLATE_BASE.format(hooks_section=_TEMPLATE_HOOKS_COMMENT)
_TEMPLATE_WITH_HOOKS = _TEMPLATE_BASE.format(hooks_section=_TEMPLATE_HOOKS_ACTIVE)

_BLOCK_RM_SH = """\
#!/usr/bin/env bash
# aictl hook: block-rm.sh — PreToolUse hook for Claude Code
# Copyright (c) 2026 Zvi Schneider. MIT License.
#
# PURPOSE
#   Intercept Bash tool calls and block dangerous "rm -rf" patterns before
#   they execute.  Designed as a PreToolUse hook (matcher: Bash).
#
# HOW HOOKS WORK
#   Claude Code pipes a JSON object to stdin describing the tool invocation.
#   For Bash calls the relevant field is .input.command.
#
#   Exit codes:
#     0  — allow the tool call to proceed
#     2  — block the tool call (Claude sees the rejection reason on stdout)
#   Any other exit code is treated as a hook error.
#
# INSTALL
#   Reference this script in your .context.toml or settings.json:
#   [hooks._always]
#   PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/block-rm.sh"}]}]'

set -euo pipefail

# Read the tool-call JSON from stdin.
input="$(cat)"

# Extract the command string.  Works with jq if available; falls back to
# a simple grep for environments without jq.
if command -v jq &>/dev/null; then
    cmd="$(echo "$input" | jq -r '.input.command // empty')"
else
    cmd="$(echo "$input" | grep -oP '"command"\\s*:\\s*"\\K[^"]+' || true)"
fi

# Nothing to check if we could not extract a command.
if [[ -z "${cmd:-}" ]]; then
    exit 0
fi

# ---- Pattern checks -------------------------------------------------------

# Block: rm -rf /  (root wipe)
if echo "$cmd" | grep -qE '\\brm\\s+(-[a-zA-Z]*r[a-zA-Z]*f|(-[a-zA-Z]*f[a-zA-Z]*r))\\s+/\\s*$'; then
    echo "BLOCKED: refusing to run 'rm -rf /' — this would destroy the filesystem."
    exit 2
fi

# Block: rm -rf with broad wildcards or important directories
if echo "$cmd" | grep -qE '\\brm\\s+(-[a-zA-Z]*r[a-zA-Z]*f|(-[a-zA-Z]*f[a-zA-Z]*r))\\s+(/|/\\*|~|~/\\*|\\.\\./)'; then
    echo "BLOCKED: refusing destructive rm -rf targeting root, home, or parent directories."
    exit 2
fi

# Block: rm -rf on common critical paths
if echo "$cmd" | grep -qE '\\brm\\s+(-[a-zA-Z]*r[a-zA-Z]*f|(-[a-zA-Z]*f[a-zA-Z]*r))\\s+/(usr|etc|var|bin|sbin|lib|boot|System)'; then
    echo "BLOCKED: refusing rm -rf on a system directory."
    exit 2
fi

# All checks passed — allow the command.
exit 0
"""

_LINT_ON_WRITE_SH = """\
#!/usr/bin/env bash
# aictl hook: lint-on-write.sh — PostToolUse hook for Claude Code
# Copyright (c) 2026 Zvi Schneider. MIT License.
#
# PURPOSE
#   After a file is written (Write tool), run the first available linter to
#   catch style or syntax issues immediately.  Designed as a PostToolUse hook
#   (matcher: Write).
#
# HOW HOOKS WORK
#   Claude Code pipes a JSON object to stdin describing the completed tool
#   invocation.  For Write calls the relevant field is .input.file_path.
#
#   Exit codes for PostToolUse hooks:
#     0  — success (informational output is shown to Claude)
#     non-zero — hook error (Claude sees stderr)
#
# INSTALL
#   Reference this script in your .context.toml or settings.json:
#   [hooks._always]
#   PostToolUse = '[{"matcher": "Write", "hooks": [{"type": "command", "command": ".claude/hooks/lint-on-write.sh"}]}]'

set -euo pipefail

# Read the tool-call JSON from stdin.
input="$(cat)"

# Extract the written file path.
if command -v jq &>/dev/null; then
    file="$(echo "$input" | jq -r '.input.file_path // empty')"
else
    file="$(echo "$input" | grep -oP '"file_path"\\s*:\\s*"\\K[^"]+' || true)"
fi

if [[ -z "${file:-}" ]] || [[ ! -f "$file" ]]; then
    exit 0
fi

ext="${file##*.}"

# ---- Linter dispatch -------------------------------------------------------

case "$ext" in
    py)
        if command -v ruff &>/dev/null; then
            ruff check --fix --quiet "$file" 2>&1 || true
            echo "lint: ruff checked $file"
        elif command -v flake8 &>/dev/null; then
            flake8 --max-line-length=120 "$file" 2>&1 || true
            echo "lint: flake8 checked $file"
        elif command -v pylint &>/dev/null; then
            pylint --errors-only "$file" 2>&1 || true
            echo "lint: pylint checked $file"
        fi
        ;;
    js|jsx|ts|tsx|mjs|cjs)
        if command -v eslint &>/dev/null; then
            eslint --fix --quiet "$file" 2>&1 || true
            echo "lint: eslint checked $file"
        elif command -v biome &>/dev/null; then
            biome check --apply "$file" 2>&1 || true
            echo "lint: biome checked $file"
        fi
        ;;
    rb)
        if command -v rubocop &>/dev/null; then
            rubocop -a --format quiet "$file" 2>&1 || true
            echo "lint: rubocop checked $file"
        fi
        ;;
    go)
        if command -v gofmt &>/dev/null; then
            gofmt -w "$file" 2>&1 || true
            echo "lint: gofmt checked $file"
        fi
        ;;
    rs)
        if command -v rustfmt &>/dev/null; then
            rustfmt --edition 2021 "$file" 2>&1 || true
            echo "lint: rustfmt checked $file"
        fi
        ;;
    sh|bash)
        if command -v shellcheck &>/dev/null; then
            shellcheck "$file" 2>&1 || true
            echo "lint: shellcheck checked $file"
        fi
        ;;
    *)
        # No linter configured for this extension — skip silently.
        ;;
esac

exit 0
"""


@click.command("init")
@click.option(
    "-r",
    "--root",
    type=click.Path(exists=True, file_okay=False, resolve_path=True),
    default=".",
    help="Directory to create .context.toml in (defaults to cwd).",
)
@click.option(
    "--force",
    is_flag=True,
    default=False,
    help="Overwrite existing .context.toml file.",
)
@click.option(
    "--hooks",
    is_flag=True,
    default=False,
    help="Generate example Claude Code hook scripts in .claude/hooks/.",
)
def init(root: str, force: bool, hooks: bool) -> None:
    """Scaffold a starter .context.toml file."""
    from ..utils import WriteGuard
    guard = WriteGuard.install("init")
    root_path = Path(root)
    target = root_path / AICTX_FILENAME

    if target.exists() and not force:
        raise click.ClickException(
            f"{target} already exists. Use --force to overwrite."
        )

    # Choose the template variant based on --hooks.
    template = _TEMPLATE_WITH_HOOKS if hooks else _TEMPLATE
    guard.confirm(target, "replace")
    target.write_text(template, encoding="utf-8")
    click.echo(f"Created {target}")

    if hooks:
        _write_hook_scripts(root_path, force)


def _write_hook_scripts(root_path: Path, force: bool = False) -> None:
    """Create .claude/hooks/ directory and write example hook scripts."""
    hooks_dir = root_path / ".claude" / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)

    scripts = {
        "block-rm.sh": _BLOCK_RM_SH,
        "lint-on-write.sh": _LINT_ON_WRITE_SH,
    }

    for name, content in scripts.items():
        script_path = hooks_dir / name
        if script_path.exists() and not force:
            click.echo(f"Skipped {script_path} (already exists, use --force to overwrite)")
            continue
        from ..utils import WriteGuard
        _guard = WriteGuard.current()
        if _guard:
            _guard.confirm(script_path, "replace")
        script_path.write_text(content, encoding="utf-8")
        # Make executable: owner rwx, group rx, others rx.
        script_path.chmod(
            script_path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )
        click.echo(f"Created {script_path}")
