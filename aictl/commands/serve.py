# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Start a live web dashboard with REST + SSE API."""

from __future__ import annotations

import os
import signal
import sys
from pathlib import Path

import click

from ..config import load_config


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
    from ..orchestrator import start_server
    root = Path(root_dir).resolve()
    start_server(root, host=host, port=port, interval=interval,
                 open_browser=open_browser,
                 include_live_monitor=include_live_monitor,
                 db_path=db_path)


def _start_daemon(root_dir, host, port, interval, include_live_monitor, pid_file, cfg):
    """Fork to background and run the server."""
    from ..platforms import IS_WINDOWS

    if IS_WINDOWS:
        click.secho("Daemon mode is not supported on Windows. "
                     "Use 'aictl serve' in a terminal or as a Windows Service.",
                     fg="red")
        return

    # Check if already running
    if pid_file.is_file():
        try:
            old_pid = int(pid_file.read_text().strip())
            os.kill(old_pid, 0)  # Check if alive
            click.secho(f"Daemon already running (PID {old_pid}). "
                        f"Use 'aictl serve --stop' first.", fg="yellow")
            return
        except (OSError, ValueError):
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
