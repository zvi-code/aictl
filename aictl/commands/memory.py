# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Inspect Claude Code auto-memory."""

from __future__ import annotations
from pathlib import Path
import click
from ..memory import get_summary, list_stashes, swap_memory


@click.group()
def memory():
    """Inspect Claude Code auto-memory (read-only)."""


@memory.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
def show(root_dir):
    """Show active memory content and token cost."""
    s = get_summary(Path(root_dir).resolve())
    if not s:
        click.secho("\nNo auto-memory found.\n", fg="bright_black")
        return
    click.secho(f"\n🧠  Active memory: {s['dir']}", bold=True)
    click.secho(f"   Total: {s['total_tokens']} tokens loaded every session\n", fg="bright_black")
    for f in s["files"]:
        click.echo(f"   {click.style(f['file'], fg='cyan')} — {f['lines']} lines, {click.style(str(f['tokens'])+' tok', fg='yellow')}")
        preview = [l for l in f["content"].splitlines() if l.strip() and not l.startswith("#")][:3]
        for line in preview:
            click.secho(f"     {line}", fg="bright_black")
    click.echo()


@memory.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
def stashes(root_dir):
    """List per-profile memory stashes."""
    items = list_stashes(Path(root_dir).resolve())
    if not items:
        click.secho("\nNo memory stashes.\n", fg="bright_black")
        return
    click.secho("\n🧠  Memory stashes:\n", bold=True)
    for s in items:
        marker = click.style("●", fg="green") if s["profile"] == "(active)" else click.style("○", fg="bright_black")
        click.echo(f"   {marker} {s['profile']} — {s['files']} file(s), {s['lines']} lines")
    click.secho("\n   Swapped automatically on profile switch.\n", fg="bright_black")
