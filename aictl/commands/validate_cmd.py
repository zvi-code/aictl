# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Validate: lint .context.toml files for common problems."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import click

from ..scanner import SKIP_DIRS
from ..parser import AICTX_FILENAME, parse_aictx
from ..feature_matrix import check_parsed_features

_SECTION_RE = re.compile(r"^\[([^\]]+)\]$")

KNOWN_TYPES = {
    "command", "agent", "skill", "mcp", "hook", "lsp",
    "setting", "permission", "env", "ignore",
    "memory", "inherit", "exclude",
}

KNOWN_HOOK_EVENTS = {
    "SessionStart", "SessionEnd", "InstructionsLoaded",
    "UserPromptSubmit",
    "PreToolUse", "PostToolUse", "PostToolUseFailure",
    "PermissionRequest",
    "Stop", "StopFailure",
    "SubagentStart", "SubagentStop",
    "TeammateIdle", "TaskCreated", "TaskCompleted",
    "Notification",
    "PreCompact", "PostCompact",
    "ConfigChange",
    "WorktreeCreate", "WorktreeRemove",
    "Elicitation", "ElicitationResult",
}

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
    except Exception as exc:
        result.issues.append(Issue(rel, None, "error", f"Cannot read file: {exc}"))
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
            # Flush previous section
            if current_header is not None:
                sections.append((current_header, current_start, current_lines))
            current_header = m.group(1).strip()
            current_start = i + 1  # 1-based
            current_lines = []

            # Check duplicates
            if current_header in seen_headers:
                result.issues.append(Issue(
                    rel, current_start, "error",
                    f"Duplicate section [{current_header}] "
                    f"(first seen at line {seen_headers[current_header]})",
                ))
            else:
                seen_headers[current_header] = current_start
        else:
            if current_header is not None:
                current_lines.append(line)

    # Flush final section
    if current_header is not None:
        sections.append((current_header, current_start, current_lines))

    # Validate each section
    for header, start_line, content_lines in sections:
        content = "\n".join(content_lines).strip()
        kind, profile, name = _classify_header(header)

        # --- Check: unknown section type ---
        if kind is not None:
            # Typed section (2 or 3 parts)
            if kind not in KNOWN_TYPES:
                result.issues.append(Issue(
                    rel, start_line, "error",
                    f"Unknown section type '{kind}' in [{header}]",
                ))
                continue  # skip further checks for unknown types
        else:
            # 1-part header — must be a known special type or a profile name
            if name and name.lower() in KNOWN_TYPES:
                kind = name.lower()
            # else: it's a profile/instruction name like [base], [debug] — always valid

        # --- Check: empty section ---
        if not content:
            result.issues.append(Issue(
                rel, start_line, "warning",
                f"Empty section [{header}]",
            ))
            continue

        # --- Check: JSON validity for mcp/hook/lsp ---
        if kind in JSON_TYPES:
            try:
                parsed = json.loads(content)
                # For hooks: validate event name
                if kind == "hook":
                    _check_hook(header, start_line, profile, name, parsed, content_lines, rel, result)
            except json.JSONDecodeError as exc:
                # Compute approximate line number within the section
                json_err_line = start_line + _find_json_error_line(content_lines, exc)
                result.issues.append(Issue(
                    rel, json_err_line, "error",
                    f"Malformed JSON in [{header}]: {exc.msg}",
                ))

        # --- Check: hook event name from 2-part or 3-part header ---
        if kind == "hook" and name is not None:
            if name not in KNOWN_HOOK_EVENTS:
                result.issues.append(Issue(
                    rel, start_line, "warning",
                    f"Unknown hook event '{name}' in [{header}]",
                ))

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
            result.issues.append(Issue(
                rel, start_line, "warning",
                f"Hook rule in [{header}] is not a JSON object",
            ))


def _find_json_error_line(content_lines: list[str], exc: json.JSONDecodeError) -> int:
    """Estimate which content line the JSON error is on.

    Returns offset from the section header (0-based), so caller adds start_line.
    """
    # json.JSONDecodeError has lineno (1-based within the JSON string).
    # content_lines may have leading blank lines before the JSON starts.
    # We count from the first non-blank line.
    first_content = 0
    for i, line in enumerate(content_lines):
        if line.strip():
            first_content = i
            break
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

    all_results: list[FileResult] = []
    error_count = 0
    warning_count = 0

    for path in files:
        rel = str(path.parent.relative_to(root))
        if rel == ".":
            rel_display = f"./{AICTX_FILENAME}"
        else:
            rel_display = f"{rel}/{AICTX_FILENAME}"

        fr = _validate_file(path, rel_display)
        all_results.append(fr)

        for issue in fr.issues:
            if issue.level == "error":
                error_count += 1
            else:
                warning_count += 1

    # Print results
    has_output = False
    for fr in all_results:
        if not fr.issues:
            continue
        has_output = True
        click.secho(f"  {fr.path}", bold=True)
        for issue in fr.issues:
            line_hint = f":{issue.line}" if issue.line else ""
            if issue.level == "error":
                marker = click.style("error", fg="red", bold=True)
            else:
                marker = click.style("warn ", fg="yellow")
            click.echo(f"    {marker} {issue.message} (line{line_hint})")
        click.echo()

    # Feature compatibility checks
    compat_count = 0
    for path in files:
        rel = str(path.parent.relative_to(root))
        if rel == ".":
            rel_display = f"./{AICTX_FILENAME}"
        else:
            rel_display = f"{rel}/{AICTX_FILENAME}"

        compat_warnings = _check_feature_compat(path, rel_display)
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
        parts = []
        if error_count:
            parts.append(click.style(f"{error_count} error(s)", fg="red", bold=True))
        if warning_count:
            parts.append(click.style(f"{warning_count} warning(s)", fg="yellow"))
        if compat_count:
            parts.append(click.style(f"{compat_count} compat warning(s)", fg="yellow"))
        click.echo(f"  {', '.join(parts)}\n")

    if error_count > 0:
        raise SystemExit(1)
