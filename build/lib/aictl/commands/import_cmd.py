"""Import: read native tool files → synthesize .context.aictx files."""

from __future__ import annotations

import json
from pathlib import Path

import click

from ..importers import registry
from ..synthesizer import synthesize


@click.command("import")
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to import from")
@click.option("-p", "--profile", help="Override detected profile name")
@click.option("--prefer", type=click.Choice(["claude", "copilot", "cursor"]),
              help="Preferred source when tools disagree")
@click.option("--from", "from_tools", default="claude,copilot,cursor",
              help="Comma-separated importers to read from")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
def import_cmd(root_dir, profile, prefer, from_tools, dry_run):
    """Import native AI tool files and generate .context.aictx files."""
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    tool_names = [t.strip() for t in from_tools.split(",")]

    # --- Phase 1: Import from each tool ---
    imports = []
    for name in tool_names:
        importer = registry.get(name)
        result = importer.import_from(root)
        if result:
            imports.append(result)
            n_scopes = len(result.scopes)
            n_caps = len(result.capabilities)
            n_mcp = len(result.mcp_servers)
            click.secho(f"   found {name}: {n_scopes} scope(s), {n_caps} cap(s), {n_mcp} mcp", fg="green")
        else:
            click.secho(f"   skip {name}: no files found", fg="bright_black")

    if not imports:
        click.secho(f"\nNo native AI tool files found under {root}\n", fg="yellow")
        return

    click.secho(f"\n   Importing into {root}", bold=True)
    if prefer:
        click.secho(f"   prefer: {prefer}", fg="magenta")

    # --- Phase 2: Synthesize .aictx files ---
    results = synthesize(root, imports, prefer=prefer, profile=profile, dry_run=dry_run)

    for r in results:
        pfx = click.style("   (dry)", fg="yellow") if dry_run else click.style("   \u2713", fg="green")
        fp = click.style(r["path"], fg="bright_black")
        click.echo(f"{pfx} {r['rel_path']}/ \u2192 {fp}")

    click.echo(f"\n   Generated {len(results)} .context.aictx file(s)")
    click.echo()
