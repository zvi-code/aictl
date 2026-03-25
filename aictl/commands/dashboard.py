"""Launch the live TUI dashboard."""

from __future__ import annotations

from pathlib import Path

import click


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
@click.option("--interval", type=float, default=5.0,
              help="Refresh interval in seconds (default: 5)")
@click.option("--monitor/--no-monitor", "include_live_monitor", default=True,
              help="Enable live runtime monitoring overlay")
def dashboard(root_dir, interval, include_live_monitor):
    """Launch a live terminal dashboard showing AI tool resources."""
    root = Path(root_dir).resolve()

    try:
        from ..dashboard.tui import run_dashboard
    except ImportError:
        click.secho(
            "The dashboard requires the 'textual' package.\n"
            "Install it with:  pip install textual",
            fg="red",
        )
        raise SystemExit(1)

    run_dashboard(root, interval=interval, include_live_monitor=include_live_monitor)
