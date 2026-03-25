"""Start a live web dashboard with REST + SSE API."""

from __future__ import annotations

from pathlib import Path

import click


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
@click.option("--port", type=int, default=8484, help="Port to listen on")
@click.option("--host", default="127.0.0.1", help="Host to bind to")
@click.option("--interval", type=float, default=5.0,
              help="Refresh interval in seconds")
@click.option("--open/--no-open", "open_browser", default=True,
              help="Open browser automatically")
@click.option("--monitor/--no-monitor", "include_live_monitor", default=True,
              help="Enable live runtime monitoring overlay")
def serve(root_dir, port, host, interval, open_browser, include_live_monitor):
    """Start a live web dashboard with REST + SSE API."""
    from ..dashboard.web_server import run_server
    root = Path(root_dir).resolve()
    run_server(root, host=host, port=port, interval=interval,
               open_browser=open_browser,
               include_live_monitor=include_live_monitor)
