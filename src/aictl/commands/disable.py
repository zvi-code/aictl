# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""``aictl disable`` — symmetric teardown for ``aictl enable``.

The work is in the stdlib-only ``aictl.hook_removal``, which also runs without
aictl. The mutation ledger records what it changes.

Also exposes a small ``aictl audit`` command group for reading the ledger.
"""

from __future__ import annotations

import json
from pathlib import Path

import click

from aictl import hook_removal, mutation_ledger
from aictl.commands.integrations import (
    _gemini_settings_path,
    _removal_sink,
    _settings_path,
    _vscode_hook_settings_path,
)
from aictl.platforms import vscode_user_dir
from aictl.utils import WriteGuard


@click.command("disable")
@click.option("--dry-run", is_flag=True, help="Print what would change without writing anything.")
@click.option(
    "--project",
    "projects",
    multiple=True,
    type=click.Path(path_type=Path),
    help="Also clean this project directory (repeatable). The current directory is always cleaned.",
)
@click.option(
    "--include-vscode-toggles",
    is_flag=True,
    help="Also remove VS Code feature toggles an older aictl set, which it did not record.",
)
def disable(dry_run: bool, projects: tuple[Path, ...], include_vscode_toggles: bool) -> None:
    """Remove every trace of `aictl enable`, across every tool.

    Hook rules (any aictl version, any event, in every tool's user and project
    files), shell profile lines, env.sh, launchctl variables, the Codex [otel]
    table and the VS Code settings aictl changed. User rules stay. A corrupt file
    is reported and skipped; the rest still runs. Exits 1 if any file was skipped.

    Works with the daemon down. If aictl itself will not start:
    python3 ~/.config/aictl/remove-hooks.py --dry-run
    """
    if not dry_run:
        WriteGuard.install("disable")
    home = Path.home()
    cwd = Path.cwd()
    extra_hook_files = [
        _settings_path("user"),
        _settings_path("project"),
        _vscode_hook_settings_path("user"),
        _vscode_hook_settings_path("project"),
        _gemini_settings_path("user"),
        _gemini_settings_path("project"),
    ]
    try:
        extra_vscode = [vscode_user_dir() / "settings.json"]
    except (KeyError, OSError):
        extra_vscode = []
    sink = _removal_sink(dry_run)
    result = hook_removal.remove_everything(
        home,
        projects=[cwd, *projects],
        extra_hook_files=extra_hook_files,
        extra_vscode_settings=extra_vscode,
        dry_run=dry_run,
        include_vscode_toggles=include_vscode_toggles,
        on_change=sink.on_change,
        before_change=sink.before_change,
    )
    click.secho("Dry run, nothing changed:" if dry_run else "aictl disable:", fg="yellow" if dry_run else "green")
    hook_removal.print_result(result, dry_run=dry_run, echo=click.echo)
    if result.failures:
        raise SystemExit(1)


# ── audit ────────────────────────────────────────────────────────────────────


@click.group("audit")
def audit() -> None:
    """Read the aictl mutation ledger."""


@audit.command("tail")
@click.option("-n", "--count", default=50, type=int, help="Number of entries.")
def audit_tail(count: int) -> None:
    """Print the last N ledger entries."""
    entries = mutation_ledger.tail(count)
    if not entries:
        click.echo("(ledger is empty)")
        return
    for e in entries:
        click.echo(json.dumps(e, ensure_ascii=False))


@audit.command("path")
@click.argument("path", type=click.Path(path_type=Path))
def audit_path(path: Path) -> None:
    """Print all ledger entries for PATH."""
    entries = mutation_ledger.entries_for_path(path)
    if not entries:
        click.echo(f"(no entries for {path})")
        return
    for e in entries:
        click.echo(json.dumps(e, ensure_ascii=False))
