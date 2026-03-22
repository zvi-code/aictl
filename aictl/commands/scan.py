"""Scan: show discovered .aictx files and sections."""

from __future__ import annotations
from pathlib import Path
import click
from ..scanner import scan


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
def scan_cmd(root_dir):
    """Discover .context.aictx files and show scope map."""
    root = Path(root_dir).resolve()
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.aictx files under {root}\n", fg="bright_black")
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
        cap_kinds: dict[str, int] = {}
        for c in parsed.capabilities:
            cap_kinds[f"{c.kind}:{c.profile}"] = cap_kinds.get(f"{c.kind}:{c.profile}", 0) + 1
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
