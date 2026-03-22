# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI command: aictl init — scaffold a starter .context.toml file."""

from __future__ import annotations

import stat
from pathlib import Path

import click

from ..parser import AICTX_FILENAME

# ---------------------------------------------------------------------------
# .context.toml templates
# ---------------------------------------------------------------------------

_TEMPLATE = """\
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

[hooks._always]
# Lifecycle hooks run automatically at specific events.
# Content is a JSON string of rule objects.
# Example (uncomment to activate):
# PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/lint-check.sh"}]}]'

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

_TEMPLATE_WITH_HOOKS = """\
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

[hooks._always]
# Block dangerous rm -rf commands before they execute.
PreToolUse = '[{"matcher": "Bash", "hooks": [{"type": "command", "command": ".claude/hooks/block-rm.sh"}]}]'
# Run a linter after every file write.
PostToolUse = '[{"matcher": "Write", "hooks": [{"type": "command", "command": ".claude/hooks/lint-on-write.sh"}]}]'

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

# ---------------------------------------------------------------------------
# Hook script contents
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# CLI command
# ---------------------------------------------------------------------------


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
    root_path = Path(root)
    target = root_path / AICTX_FILENAME

    if target.exists() and not force:
        raise click.ClickException(
            f"{target} already exists. Use --force to overwrite."
        )

    # Choose the template variant based on --hooks.
    template = _TEMPLATE_WITH_HOOKS if hooks else _TEMPLATE
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
        script_path.write_text(content, encoding="utf-8")
        # Make executable: owner rwx, group rx, others rx.
        script_path.chmod(
            script_path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )
        click.echo(f"Created {script_path}")
