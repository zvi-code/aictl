"""Plugin: build a Claude Code plugin from .aictx files."""

from __future__ import annotations

import json
from pathlib import Path

import click

from ..scanner import scan
from ..resolver import resolve
from ..utils import write_safe, estimate_tokens


@click.group()
def plugin():
    """Manage Claude Code plugin packaging."""


@plugin.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory with .aictx files")
@click.option("-p", "--profile", help="Active profile")
@click.option("-o", "--output", "out_dir", default=None,
              help="Output directory for plugin (default: <root>/plugin)")
@click.option("-n", "--name", "plugin_name", required=True, help="Plugin name (used as namespace)")
@click.option("--description", "plugin_desc", default="", help="Plugin description")
@click.option("--version", "plugin_version", default="1.0.0", help="Plugin version")
@click.option("--author", default="", help="Author name")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
def build(root_dir, profile, out_dir, plugin_name, plugin_desc, plugin_version, author, dry_run):
    """Build a Claude Code plugin from .aictx sources."""
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    output = Path(out_dir).resolve() if out_dir else root / "plugin"

    # --- Scan + resolve ---
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.aictx files found under {root}\n", fg="yellow")
        return

    resolved = resolve(root, scanned, profile)

    click.secho(f"\n🔌  Building plugin '{plugin_name}'", bold=True)
    if profile:
        click.secho(f"   profile: {profile}", fg="magenta")

    results = []

    # --- Plugin manifest ---
    manifest = {
        "name": plugin_name,
        "description": plugin_desc or f"Plugin generated from {root.name}",
        "version": plugin_version,
    }
    if author:
        manifest["author"] = {"name": author}

    manifest_path = output / ".claude-plugin" / "plugin.json"
    content = json.dumps(manifest, indent=2) + "\n"
    if not dry_run:
        write_safe(manifest_path, content)
    results.append({"path": str(manifest_path), "tokens": estimate_tokens(content)})

    # --- Commands → commands/ ---
    for cap in resolved.capabilities:
        if cap.kind == "command":
            fp = output / "commands" / f"{cap.name}.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})

    # --- Skills → skills/ ---
    for cap in resolved.capabilities:
        if cap.kind == "skill":
            fp = output / "skills" / cap.name / "SKILL.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})

    # --- Agents → agents/ ---
    for cap in resolved.capabilities:
        if cap.kind == "agent":
            fp = output / "agents" / f"{cap.name}.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})

    # --- Hooks → hooks/hooks.json ---
    if resolved.hooks:
        fp = output / "hooks" / "hooks.json"
        content = json.dumps({"hooks": resolved.hooks}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    # --- MCP → .mcp.json ---
    if resolved.mcp_servers:
        fp = output / ".mcp.json"
        content = json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    # --- LSP → .lsp.json ---
    if resolved.lsp_servers:
        fp = output / ".lsp.json"
        content = json.dumps(resolved.lsp_servers, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    # --- Settings (default agent if any) ---
    agents = [c for c in resolved.capabilities if c.kind == "agent"]
    if agents:
        fp = output / "settings.json"
        # Set the first agent as default
        content = json.dumps({"agent": agents[0].name}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    # --- Report ---
    for r in results:
        pfx = click.style("   (dry)", fg="yellow") if dry_run else click.style("   ✓", fg="green")
        tok = click.style(f'{r["tokens"]} tok', fg="cyan")
        fp = click.style(r["path"], fg="bright_black")
        click.echo(f"{pfx} {fp} ({tok})")

    click.echo(f"\n   Plugin '{plugin_name}' built with {len(results)} file(s)")
    click.echo(f"   Test: claude --plugin-dir {output}")
    click.echo()
