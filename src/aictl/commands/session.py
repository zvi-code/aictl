# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: session — inspect and control live AI tool sessions.

These talk to a running ``aictl daemon serve`` over HTTP via ``ServerClient``;
there is nothing to control without the daemon, so all commands require it.
"""

from __future__ import annotations

import json
import urllib.error

import click

from ..client import ServerClient


def _connect() -> ServerClient:
    client = ServerClient.try_connect()
    if client is None:
        raise click.ClickException("No running aictl daemon found. Start one with: aictl daemon serve")
    return client


@click.group("session")
def session_group():
    """Inspect and control live AI tool sessions."""


@session_group.command("list")
@click.option("--tool", default=None, help="Filter to one tool")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def session_list(tool, as_json):
    """List active sessions (with their PIDs) from the running daemon."""
    client = _connect()
    snap = client.get_snapshot()
    sessions = [s for s in snap.get("sessions", []) if not tool or s.get("tool") == tool]
    if as_json:
        click.echo(json.dumps(sessions, indent=2))
        return
    if not sessions:
        click.echo("No active sessions.")
        return
    for s in sessions:
        pids = s.get("pids") or []
        click.echo(f"{s.get('session_id', '?'):<40} {s.get('tool', ''):<14} pids={','.join(map(str, pids)) or '-'}")


@session_group.command("kill")
@click.argument("session_id")
@click.option("--signal", "sig", type=click.Choice(["TERM", "KILL"]), default="TERM", help="Signal to send")
@click.option("--yes", "-y", is_flag=True, help="Skip the confirmation prompt")
def session_kill(session_id, sig, yes):
    """Signal a live session's process tree (SIGTERM by default)."""
    if not yes:
        click.confirm(f"Send SIG{sig} to session {session_id}?", abort=True)
    client = _connect()
    try:
        result = client.kill_session(session_id, signal=sig)
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode("utf-8"))
            msg = body.get("error", str(exc))
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            msg = str(exc)
        raise click.ClickException(f"Kill failed: {msg}") from exc
    signaled = result.get("signaled", [])
    failed = result.get("failed", [])
    click.echo(f"Sent {result.get('signal', 'SIG' + sig)} to {len(signaled)} process(es): {signaled}")
    if failed:
        click.echo(f"Failed for {len(failed)} process(es): {failed}")
