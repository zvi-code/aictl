# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
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
@click.option("--port", type=int, default=None,
              help="Port of running aictl serve (auto-detect if not set)")
@click.option("--host", default=None,
              help="Host of running aictl serve")
def dashboard(root_dir, interval, include_live_monitor, port, host):
    """Launch a live terminal dashboard showing AI tool resources.

    Automatically connects to a running 'aictl serve' instance for
    richer data (SQLite history, persistent sessions, events).
    Falls back to standalone collection if no server is running.
    """
    from ..config import load_config
    cfg = load_config()
    root = Path(root_dir).resolve()

    server_host = host or cfg.serve_host
    server_port = port or cfg.serve_port

    try:
        from ..dashboard.tui import run_dashboard
    except ImportError:
        click.secho(
            "The dashboard requires the 'textual' package.\n"
            "Install it with:  pip install textual",
            fg="red",
        )
        raise SystemExit(1)

    run_dashboard(root, interval=interval,
                  include_live_monitor=include_live_monitor,
                  server_host=server_host, server_port=server_port)
