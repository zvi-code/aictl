# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""``aictl disable`` — symmetric teardown for ``aictl enable``.

Uses the mutation ledger (``aictl.mutation_ledger``) to plan reverts, and
delegates structured teardown to the existing ``hooks uninstall`` /
``otel disable`` commands via Click's programmatic invocation.

Also exposes a small ``aictl audit`` command group for reading the ledger.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import click

from aictl import mutation_ledger
from aictl.commands.integrations import (
    _AICTL_ENV_BEGIN,
    _AICTL_ENV_END,
    _aictl_env_file,
    _shell_profiles,
)
from aictl.commands.integrations import (
    uninstall as hooks_uninstall,
)
from aictl.utils import WriteGuard


def _iter_reverts(since_ts: str | None) -> list[dict]:
    """Ledger entries since *since_ts* (or all), deduped newest-first by path."""
    entries = mutation_ledger.all_entries()
    if since_ts:
        entries = [e for e in entries if e.get("ts", "") > since_ts]
    seen: set[str] = set()
    out: list[dict] = []
    for e in reversed(entries):
        p = e.get("path", "")
        if p in seen:
            continue
        seen.add(p)
        out.append(e)
    return out


def _strip_env_source_block(profile: Path) -> bool:
    """Remove the aictl env source block from *profile*. Returns True if changed."""
    if not profile.exists():
        return False
    try:
        content = profile.read_text(encoding="utf-8")
    except OSError:
        return False
    pattern = re.compile(
        re.escape(_AICTL_ENV_BEGIN) + r".*?" + re.escape(_AICTL_ENV_END) + r"\n?",
        re.DOTALL,
    )
    new_content = pattern.sub("", content)
    if new_content == content:
        return False
    try:
        profile.write_text(new_content, encoding="utf-8")
    except OSError:
        return False
    return True


@click.command("disable")
@click.option("--dry-run", is_flag=True, help="Print the planned revert actions without mutating anything.")
@click.option("--since", "since_ts", default=None, help="Only revert ledger entries after this ISO8601 timestamp.")
@click.option("--force", is_flag=True, help="Pass --force through to subcommands (tolerate corrupt settings.json).")
def disable(dry_run: bool, since_ts: str | None, force: bool) -> None:
    """Revert what ``aictl enable`` installed: hooks, env source-block, env.sh.

    Best-effort symmetric teardown. Structured reverts go through the
    existing ``hooks uninstall`` command; filesystem artifacts (env.sh
    and shell profile source-block) are cleaned up directly.
    """
    planned = _iter_reverts(since_ts)

    if dry_run:
        click.secho("Dry run — nothing will be reverted.\n", fg="yellow")
        click.echo("Planned reverts:")
        click.echo("  [hooks uninstall] --scope user (+ project if present)")
        click.echo("  [env]             remove source-block from shell profiles")
        env_file = _aictl_env_file()
        click.echo(f"  [env]             delete {env_file}")
        if planned:
            click.echo(f"\nLedger entries that would be surfaced ({len(planned)}):")
            for e in planned[:20]:
                click.echo(f"  {e['ts']}  {e['op']:<6}  {e['path']}")
            if len(planned) > 20:
                click.echo(f"  ... and {len(planned) - 20} more")
        else:
            click.echo("\nNo ledger entries to surface.")
        return

    WriteGuard.install("disable")
    actions: list[str] = []

    # 1. hooks uninstall — user scope, then project scope if that file exists.
    ctx = click.get_current_context()
    for scope in ("user", "project"):
        try:
            sub_args = ["--scope", scope]
            if force:
                sub_args.append("--force")
            ctx.invoke(hooks_uninstall, scope=scope, force=force, dry_run=False)
            actions.append(f"hooks uninstall --scope {scope}")
        except SystemExit:
            actions.append(f"hooks uninstall --scope {scope}: FAILED")
        except click.Abort:
            actions.append(f"hooks uninstall --scope {scope}: aborted")
            raise
        except Exception as exc:  # noqa: BLE001 — best-effort teardown
            actions.append(f"hooks uninstall --scope {scope}: FAILED ({exc})")

    # 2. Remove source-block from shell profiles.
    for profile in _shell_profiles():
        if _strip_env_source_block(profile):
            actions.append(f"Removed aictl source-block from {profile}")

    # 3. Delete the env.sh file.
    env_file = _aictl_env_file()
    if env_file.exists():
        try:
            env_file.unlink()
            actions.append(f"Deleted {env_file}")
            # Record the delete in the ledger.
            mutation_ledger.record(
                command="disable",
                path=env_file,
                op="delete",
                previous_content=None,
                new_content=None,
            )
        except OSError as exc:
            actions.append(f"Delete {env_file}: FAILED ({exc})")

    # 4. Log the disable invocation itself.
    mutation_ledger.record(
        command="disable",
        path=Path("<summary>"),
        op="modify",
        previous_content=None,
        new_content=None,
    )

    click.secho("aictl disable:", fg="green", bold=True)
    for a in actions:
        click.echo(f"  {a}")
    if planned:
        click.echo(f"\nLedger: {len(planned)} mutation(s) since last enable.")


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
