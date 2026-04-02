# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: import + plugin commands."""

from __future__ import annotations

import json
from pathlib import Path

import click

from .. import importers as import_registry
from ..synthesizer import synthesize
from ..context import scan
from ..resolver import resolve
from ..utils import write_safe, estimate_tokens


# ─── import ──────────────────────────────────────────────────────────────────


@click.command("import")
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to import from")
@click.option("-p", "--profile", help="Override detected profile name")
@click.option("--prefer", type=click.Choice(["claude", "copilot", "cursor", "windsurf", "gemini"]),
              help="Preferred source when tools disagree")
@click.option("--from", "from_tools", default="claude,copilot,cursor,windsurf,gemini,plugin",
              help="Comma-separated importers to read from")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
def import_cmd(root_dir, profile, prefer, from_tools, dry_run):
    """Import native AI tool files and generate .context.toml files."""
    from ..utils import WriteGuard
    if not dry_run:
        WriteGuard.install("import")
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise click.ClickException(f"Not a directory: {root}")

    tool_names = [t.strip() for t in from_tools.split(",")]

    # --- Phase 1: Import from each tool ---
    imports = []
    for name in tool_names:
        importer = import_registry.get(name)
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

    # --- Phase 2: Synthesize .toml files ---
    results = synthesize(root, imports, prefer=prefer, profile=profile, dry_run=dry_run)

    for r in results:
        pfx = click.style("   (dry)", fg="yellow") if dry_run else click.style("   \u2713", fg="green")
        fp = click.style(r["path"], fg="bright_black")
        click.echo(f"{pfx} {r['rel_path']}/ \u2192 {fp}")

    click.echo(f"\n   Generated {len(results)} .context.toml file(s)")
    click.echo()


# ─── plugin ──────────────────────────────────────────────────────────────────


@click.group()
def plugin():
    """Manage Claude Code plugin packaging."""


@plugin.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory with .toml files")
@click.option("-p", "--profile", help="Active profile")
@click.option("-o", "--output", "out_dir", default=None,
              help="Output directory for plugin (default: <root>/plugin)")
@click.option("-n", "--name", "plugin_name", default=None, help="Plugin name (used as namespace)")
@click.option("--description", "plugin_desc", default="", help="Plugin description")
@click.option("--version", "plugin_version", default="", help="Plugin version")
@click.option("--author", default="", help="Author name")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
def build(root_dir, profile, out_dir, plugin_name, plugin_desc, plugin_version, author, dry_run):
    """Build a Claude Code plugin from .toml sources.

    Plugin metadata can be supplied via CLI flags or a [plugin] section in the
    root .context.toml file.  CLI flags take precedence over [plugin] values.
    """
    from ..utils import WriteGuard
    if not dry_run:
        WriteGuard.install("plugin build")
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise click.ClickException(f"Not a directory: {root}")

    output = Path(out_dir).resolve() if out_dir else root / "plugin"

    # --- Scan + resolve ---
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.toml files found under {root}\n", fg="yellow")
        return

    resolved = resolve(root, scanned, profile)

    # --- Read [plugin] metadata from root .toml ---
    root_parsed = next((p for rel, p in scanned if rel == "."), None)
    meta = root_parsed.plugin_meta if root_parsed else {}

    # CLI flags override [plugin] section values
    plugin_name = plugin_name or meta.get("name")
    if not plugin_name:
        raise click.ClickException("Plugin name is required: use --name or add 'name: ...' in [plugin] section")
    plugin_desc = plugin_desc or meta.get("description", "")
    plugin_version = plugin_version or meta.get("version", "1.0.0")
    author = author or meta.get("author", "")

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
