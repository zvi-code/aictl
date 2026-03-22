"""Deploy: scan .aictx → resolve → emit native files → cleanup → memory swap."""

from __future__ import annotations

from pathlib import Path

import click

from ..scanner import scan
from ..resolver import resolve
from ..emitters import registry
from ..manifest import load_manifest, save_manifest, cleanup_stale
from ..memory import swap_memory
from ..utils import estimate_tokens


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to deploy from")
@click.option("-p", "--profile", help="Active profile (debug, docs, review, ...)")
@click.option("-e", "--emit", "emitters", default="claude,copilot,cursor", help="Comma-separated emitters")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
def deploy(root_dir, profile, emitters, dry_run):
    """Scan .aictx files and deploy native AI context files."""
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    emitter_names = [e.strip() for e in emitters.split(",")]

    # --- Phase 1: Scan ---
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.aictx files found under {root}\n", fg="yellow")
        return

    click.secho(f"\n📦  Deploying from {root}", bold=True)
    if profile:
        click.secho(f"   profile: {profile}", fg="magenta")
    click.secho(f"   scanned: {len(scanned)} .aictx file(s)", fg="bright_black")
    for rel, _ in scanned:
        click.secho(f"      {rel}/", fg="bright_black")

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
            pfx = click.style("   (dry)", fg="yellow") if dry_run else click.style("   ✓", fg="green")
            tok = click.style(f'{r["tokens"]} tok', fg="cyan")
            fp = click.style(r["path"], fg="bright_black")
            click.echo(f"{pfx} {ename} → {fp} ({tok})")

    # Report capabilities
    kinds: dict[str, int] = {}
    for c in resolved.capabilities:
        kinds[c.kind] = kinds.get(c.kind, 0) + 1
    if kinds:
        click.secho("   caps: " + ", ".join(f"{v} {k}{'s' * (v > 1)}" for k, v in kinds.items()), fg="bright_black")
    if resolved.mcp_servers:
        click.secho("   mcp: " + ", ".join(resolved.mcp_servers), fg="bright_black")

    # --- Phase 4: Cleanup ---
    if not dry_run:
        removed = cleanup_stale(root, old_manifest, set(all_paths))
        if removed:
            click.secho(f"\n   🧹  Cleaned {len(removed)} stale file(s):", fg="yellow")
            for f in removed:
                click.secho(f"      - {f}", fg="bright_black")

        # --- Phase 5: Memory swap ---
        old_profile = old_manifest["profile"] if old_manifest else None
        if profile != old_profile:
            sr = swap_memory(root, old_profile, profile)
            if sr:
                if sr["stashed"]:
                    click.secho(f"\n   🧠  Memory stashed: {sr['stashed']}", fg="blue")
                if sr["restored"]:
                    click.secho(f"   🧠  Memory restored: {sr['restored']}", fg="blue")
                if sr["created"]:
                    click.secho(f"   🧠  Memory initialized: fresh for {profile}", fg="blue")

        save_manifest(root, profile, all_paths)

    # Total tokens
    total = sum(r["tokens"] for r in [{"tokens": estimate_tokens("")}])  # placeholder
    click.echo()
