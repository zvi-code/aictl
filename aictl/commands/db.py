# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI command: database maintenance — compact, vacuum, stats."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import click


@click.group()
@click.option("--db", "db_path", default=None, type=click.Path(),
              help="Path to SQLite history database")
@click.pass_context
def db(ctx, db_path):
    """Database maintenance — compact, vacuum, stats."""
    ctx.ensure_object(dict)
    ctx.obj["db_path"] = db_path


@db.command()
@click.option("--vacuum/--no-vacuum", default=True,
              help="Run VACUUM after compaction to reclaim disk space")
@click.pass_context
def compact(ctx, vacuum):
    """Compact the database — downsample old data, delete expired rows, reclaim space.

    \b
    Retention policy:
      Samples:  full res 1h → 1-min buckets 24h → 5-min buckets 7d → delete
      Metrics:  full res 24h → 1-min buckets 7d → 5-min buckets 30d → delete
      Events:   30 days → delete
      Telemetry: 30 days → delete
    """
    from ..storage import HistoryDB, DEFAULT_DB_PATH

    db_path = ctx.obj.get("db_path")
    path = Path(db_path) if db_path else DEFAULT_DB_PATH
    if not path.exists():
        click.echo(f"Database not found: {path}", err=True)
        sys.exit(1)

    size_before = path.stat().st_size
    click.echo(f"Database: {path}")
    click.echo(f"Size before: {size_before / 1024**2:.1f} MB")

    hist_db = HistoryDB(db_path=db_path)

    click.echo("Compacting...")
    t0 = time.time()
    result = hist_db.compact()
    elapsed = time.time() - t0

    click.echo(f"Compacted in {elapsed:.1f}s:")
    for k, v in sorted(result.items()):
        if v:
            click.echo(f"  {k}: {v:,}")

    if vacuum:
        click.echo("Running VACUUM (reclaiming disk space)...")
        t0 = time.time()
        conn = hist_db._conn()
        conn.execute("VACUUM")
        click.echo(f"VACUUM done in {time.time() - t0:.1f}s")

    hist_db.close()

    size_after = path.stat().st_size
    saved = size_before - size_after
    click.echo(f"\nSize after:  {size_after / 1024**2:.1f} MB")
    if saved > 0:
        click.echo(f"Reclaimed:   {saved / 1024**2:.1f} MB ({saved / size_before * 100:.0f}%)")


@db.command()
@click.pass_context
def stats(ctx):
    """Show database size, row counts, and time ranges."""
    from ..storage import HistoryDB, DEFAULT_DB_PATH

    db_path = ctx.obj.get("db_path")
    path = Path(db_path) if db_path else DEFAULT_DB_PATH
    if not path.exists():
        click.echo(f"Database not found: {path}", err=True)
        sys.exit(1)

    hist_db = HistoryDB(db_path=db_path)
    s = hist_db.stats()
    hist_db.close()

    click.echo(f"Database: {path}")
    click.echo(f"File size: {s['file_size_bytes'] / 1024**2:.1f} MB")
    click.echo()

    click.echo("Table                  Rows")
    click.echo("-" * 40)
    for k in sorted(s):
        if k.endswith("_count"):
            name = k.replace("_count", "")
            click.echo(f"{name:22s} {s[k]:>12,}")

    if s.get("earliest_ts") and s.get("latest_ts"):
        import datetime
        earliest = datetime.datetime.fromtimestamp(s["earliest_ts"])
        latest = datetime.datetime.fromtimestamp(s["latest_ts"])
        span = latest - earliest
        click.echo(f"\nTime range: {earliest:%Y-%m-%d %H:%M} — {latest:%Y-%m-%d %H:%M} ({span.days}d {span.seconds//3600}h)")

    if s.get("files_tracked"):
        click.echo(f"Files tracked: {s['files_tracked']:,} ({s['files_total_bytes'] / 1024**2:.1f} MB, {s['files_total_tokens']:,} tokens)")


@db.command()
@click.option("--yes", "-y", is_flag=True,
              help="Skip confirmation prompt")
@click.pass_context
def reset(ctx, yes):
    """Delete the database and start fresh.

    \b
    Removes the existing history database and initialises an empty one.
    All recorded metrics, events, and telemetry are permanently deleted.
    """
    from ..storage import HistoryDB, DEFAULT_DB_PATH

    db_path = ctx.obj.get("db_path")
    path = Path(db_path) if db_path else DEFAULT_DB_PATH

    if path.exists():
        size_mb = path.stat().st_size / 1024 ** 2
        click.echo(f"Database: {path}")
        click.echo(f"Size: {size_mb:.1f} MB")
        if not yes:
            click.confirm(
                "Permanently delete ALL data and start a new database?",
                abort=True,
            )
        path.unlink()
        click.secho("Database deleted.", fg="yellow")
    else:
        click.echo(f"Database: {path}")
        click.echo("(does not exist yet — will be created fresh)")

    # Initialise a fresh empty database by opening it.
    HistoryDB(db_path=str(path)).close()
    click.secho(f"Fresh database initialised: {path}", fg="green")
