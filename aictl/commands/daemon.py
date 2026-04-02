# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: serve + monitor + dashboard — daemon commands."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import sys
from pathlib import Path

import click

from ..orchestrator import start_server
from ..platforms import load_config, IS_WINDOWS
from ..monitoring.config import MonitorConfig
from ..monitoring.runtime import MonitorRuntime


# ─── serve ───────────────────────────────────────────────────────────────────


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
@click.option("--port", type=int, default=None, help="Port to listen on")
@click.option("--host", default=None, help="Host to bind to")
@click.option("--interval", type=float, default=None,
              help="Refresh interval in seconds")
@click.option("--open/--no-open", "open_browser", default=None,
              help="Open browser automatically")
@click.option("--monitor/--no-monitor", "include_live_monitor", default=None,
              help="Enable live runtime monitoring overlay")
@click.option("--daemon/--no-daemon", "daemon_mode", default=False,
              help="Run as background daemon")
@click.option("--db", "db_path", default=None, type=click.Path(),
              help="Path to SQLite history database")
@click.option("--stop", is_flag=True, help="Stop a running daemon")
@click.option("--status", "show_status", is_flag=True, help="Show daemon status")
def serve(root_dir, port, host, interval, open_browser, include_live_monitor,
          db_path, daemon_mode, stop, show_status):
    """Start a live web dashboard with REST + SSE API."""
    cfg = load_config()

    # Apply config file defaults, CLI overrides take precedence
    port = port if port is not None else cfg.serve_port
    host = host if host is not None else cfg.serve_host
    interval = interval if interval is not None else cfg.serve_interval
    open_browser = open_browser if open_browser is not None else cfg.serve_open_browser
    include_live_monitor = include_live_monitor if include_live_monitor is not None else cfg.serve_monitor

    # Warn if AICTL_PORT is set but doesn't match the effective port
    env_port = os.environ.get("AICTL_PORT")
    if env_port and port != int(env_port):
        click.secho(
            f"Warning: AICTL_PORT={env_port} but serving on port {port}. "
            f"OTel tools will send to port {env_port}.",
            fg="yellow", err=True,
        )

    db_path = db_path or cfg.effective_db_path()
    pid_file = cfg.effective_pid_file()

    if show_status:
        _show_daemon_status(pid_file, host, port)
        return

    if stop:
        _stop_daemon(pid_file)
        return

    if daemon_mode:
        _start_daemon(root_dir, host, port, interval, include_live_monitor, pid_file, cfg)
        return

    # Foreground mode
    root = Path(root_dir).resolve()
    start_server(root, host=host, port=port, interval=interval,
                 open_browser=open_browser,
                 include_live_monitor=include_live_monitor,
                 db_path=db_path)


def _start_daemon(root_dir, host, port, interval, include_live_monitor, pid_file, cfg):
    """Fork to background and run the server."""

    if IS_WINDOWS:
        click.secho("Daemon mode is not supported on Windows. "
                     "Use 'aictl serve' in a terminal or as a Windows Service.",
                     fg="red")
        return

    # Kill existing daemon on the same port before starting
    if pid_file.is_file():
        try:
            old_pid = int(pid_file.read_text().strip())
            os.kill(old_pid, 0)  # Check if alive
            click.echo(f"  killing old daemon (PID {old_pid})")
            os.kill(old_pid, signal.SIGTERM)
            # Wait briefly for clean shutdown
            import time
            for _ in range(50):
                try:
                    os.kill(old_pid, 0)
                    time.sleep(0.1)
                except OSError:
                    break
        except (OSError, ValueError):
            pass
        pid_file.unlink(missing_ok=True)

    log_file = cfg.effective_log_file()
    pid_file.parent.mkdir(parents=True, exist_ok=True)
    log_file.parent.mkdir(parents=True, exist_ok=True)

    # Double-fork to detach from terminal
    pid = os.fork()
    if pid > 0:
        # Parent — wait briefly to confirm child started
        click.echo(f"  aictl daemon starting (PID {pid})")
        click.echo(f"  dashboard at http://{host}:{port}")
        click.echo(f"  log: {log_file}")
        click.echo(f"  pid: {pid_file}")
        click.echo(f"  stop: aictl serve --stop")
        return

    # Child — detach
    os.setsid()
    pid2 = os.fork()
    if pid2 > 0:
        os._exit(0)

    # Grandchild — daemon process
    sys.stdin.close()
    log_fd = open(log_file, "a")
    os.dup2(log_fd.fileno(), sys.stdout.fileno())
    os.dup2(log_fd.fileno(), sys.stderr.fileno())

    # Write PID
    pid_file.write_text(str(os.getpid()))

    # Run server
    try:
        from ..orchestrator import start_server
        root = Path(root_dir).resolve()
        start_server(root, host=host, port=port, interval=interval,
                     open_browser=False,
                     include_live_monitor=include_live_monitor)
    finally:
        pid_file.unlink(missing_ok=True)


def _stop_daemon(pid_file: Path):
    """Stop a running daemon by PID file."""
    if not pid_file.is_file():
        click.echo("No daemon running (no PID file).")
        return
    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, signal.SIGTERM)
        click.echo(f"Stopped daemon (PID {pid}).")
        pid_file.unlink(missing_ok=True)
    except ProcessLookupError:
        click.echo("Daemon not running (stale PID file removed).")
        pid_file.unlink(missing_ok=True)
    except ValueError:
        click.echo("Invalid PID file.")
        pid_file.unlink(missing_ok=True)


def _show_daemon_status(pid_file: Path, host: str, port: int):
    """Show whether daemon is running."""
    if not pid_file.is_file():
        click.echo("No daemon running.")
        return
    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, 0)  # Check if alive
        click.secho(f"Daemon running (PID {pid})", fg="green")
        click.echo(f"  dashboard: http://{host}:{port}")
        click.echo(f"  pid file:  {pid_file}")
    except ProcessLookupError:
        click.echo("Daemon not running (stale PID file).")
        pid_file.unlink(missing_ok=True)
    except ValueError:
        click.echo("Invalid PID file.")


# ─── monitor ─────────────────────────────────────────────────────────────────


@click.group()
def monitor():
    """Passive live observability for AI tool usage."""


@monitor.command("live")
@click.option("-r", "--root", "root_dir", default=".", help="Workspace root")
@click.option("--interval", type=float, default=1.0, help="Refresh interval in seconds")
@click.option("--duration", type=float, default=None, help="Optional total runtime in seconds")
@click.option("--once", is_flag=True, help="Capture briefly and print a single snapshot")
@click.option("--json", "as_json", is_flag=True, help="Emit JSON snapshots instead of text")
@click.option("--no-files", is_flag=True, help="Disable filesystem activity monitoring")
@click.option("--no-telemetry", is_flag=True, help="Disable structured telemetry scanning")
@click.option("--debug-network", is_flag=True, help="Log nettop samples and PID resolution for debugging")
def live(root_dir, interval, duration, once, as_json, no_files, no_telemetry, debug_network):
    """Run the live monitor."""

    if debug_network:
        logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")

    config = MonitorConfig.for_root(
        Path(root_dir).resolve(),
        sample_interval=interval,
        refresh_interval=interval,
        process_interval=interval,
        network_interval=interval,
        telemetry_interval=max(interval * 5, 5.0),
        filesystem_enabled=not no_files,
        telemetry_enabled=not no_telemetry,
        json_output=as_json,
        once=once,
        duration_seconds=duration,
        debug_network=debug_network,
    )
    runtime = MonitorRuntime(config)
    try:
        raise SystemExit(asyncio.run(runtime.run_live()))
    except KeyboardInterrupt:
        raise SystemExit(130)


@monitor.command("doctor")
@click.option("-r", "--root", "root_dir", default=".", help="Workspace root")
@click.option("--json", "as_json", is_flag=True, help="Emit JSON instead of human output")
@click.option("--sample-seconds", type=float, default=2.0, help="How long to warm up collectors")
def doctor(root_dir, as_json, sample_seconds):
    """Show platform adapters, paths, and a short sample snapshot."""

    config = MonitorConfig.for_root(
        Path(root_dir).resolve(),
        sample_interval=1.0,
        refresh_interval=1.0,
        process_interval=1.0,
        network_interval=1.0,
        telemetry_interval=5.0,
        json_output=as_json,
        once=True,
    )
    runtime = MonitorRuntime(config)
    snapshot = asyncio.run(runtime.snapshot_after(max(sample_seconds, 1.0)))
    payload = {
        "platform": snapshot.platform,
        "workspace_paths": snapshot.workspace_paths,
        "state_paths": snapshot.state_paths,
        "collectors": runtime.collector_plan().names,
        "diagnostics": snapshot.diagnostics,
        "tools": snapshot.tools,
    }

    if as_json:
        click.echo(json.dumps(payload, indent=2))
        return

    click.echo(f"Platform: {payload['platform']}")
    click.echo(f"Workspace: {', '.join(payload['workspace_paths'])}")
    click.echo("Collectors:")
    for collector_name in payload["collectors"]:
        click.echo(f"  {collector_name}")
    click.echo("State paths:")
    for state_path in payload["state_paths"]:
        click.echo(f"  {state_path}")
    click.echo("")
    click.echo("Diagnostics:")
    if not payload["diagnostics"]:
        click.echo("  (no collector status yet)")
    else:
        for name, diagnostic in payload["diagnostics"].items():
            click.echo(
                f"  {name}: {diagnostic.get('status', 'unknown')} [{diagnostic.get('mode', 'unknown')}]"
                f" - {diagnostic.get('detail', '')}"
            )
    if payload["tools"]:
        click.echo("")
        click.echo("Detected tools:")
        for tool in payload["tools"]:
            click.echo(f"  {tool['label']}: {tool['pid_count']} pid(s), confidence {tool['confidence']:.2f}")


# ─── dashboard ───────────────────────────────────────────────────────────────


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
