# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: session — find Copilot sessions and their files, and control live sessions.

``list`` with index options, ``find``, ``show``, ``path``, ``artifacts`` and ``cat``
read the tools' files directly and need no daemon. ``kill``, and a plain ``list``
while a daemon runs, talk to ``aictl daemon serve`` over HTTP via ``ServerClient``.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error

import click

from ..client import ServerClient

DEFAULT_LIST_LIMIT = 30


def _connect() -> ServerClient:
    client = ServerClient.try_connect()
    if client is None:
        raise click.ClickException("No running aictl daemon found. Start one with: aictl daemon serve")
    return client


def _echo(text: str) -> None:
    """Print without raising on consoles whose encoding lacks a character (cp1252, for example)."""
    from ..observe.render import safe_text

    click.echo(safe_text(text, click.get_text_stream("stdout")))


def _when(ts: float | None) -> str:
    return time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)) if ts else "-"


def _row(rec: dict) -> str:
    from ..observe.render import fmt_bytes

    size = fmt_bytes(rec["artifact_bytes"]) if rec["artifact_bytes"] else "-"
    where = rec["project"] or rec["folder"] or "-"
    title = f"  {rec['title']}" if rec["title"] else ""
    return (
        f"{rec['id']:<38} {rec['surface']:<16} {rec['state']:<8} {_when(rec['last_activity_at']):<17}"
        f"{rec['artifact_count'] if rec['artifact_count'] is not None else '-':>6} {size:>9}  {where}{title}"
    )


def _resolve(index, query: str) -> dict:
    """The one session *query* names, or a click error listing what matched or where it looked."""
    result = index.resolve(query)
    if result["status"] == "ok":
        return result["session"]
    if result["status"] == "ambiguous":
        lines = [f"ambiguous: {query!r} matches {len(result['matches'])} sessions by {result['matched_by']}:"]
        lines += [f"  {r['id']}  {r['surface']}  {r['project'] or r['folder'] or '-'}" for r in result["matches"][:20]]
        raise click.ClickException(_safe("\n".join(lines)))
    lines = [f"not found: {query!r}, looked in:"] + [f"  {p}" for p in result["looked_in"]]
    raise click.ClickException(_safe("\n".join(lines)))


def _safe(text: str) -> str:
    from ..observe.render import safe_text

    return safe_text(text, sys.stderr)


@click.group("session")
def session_group():
    """Find Copilot sessions and their files; inspect and control live sessions."""


@session_group.command("list")
@click.option("--tool", default=None, help="Filter to one tool, for example copilot-cli")
@click.option("--all", "show_all", is_flag=True, help="Every session on disk, including ones with no folder left")
@click.option("--project", default=None, help="Only sessions whose project path contains this text")
@click.option("--limit", type=int, default=None, help=f"Show at most N sessions (default {DEFAULT_LIST_LIMIT})")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def session_list(tool, show_all, project, limit, as_json):
    """List sessions: from the running daemon, else from the Copilot session index.

    Any of --all, --project or --limit always reads the index, which needs no daemon.
    """
    client = None if show_all or project or limit is not None else ServerClient.try_connect()
    if client is not None:
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
        return
    from ..observe.sessions import SessionIndex

    index = SessionIndex()
    effective = limit if limit is not None else (None if show_all else DEFAULT_LIST_LIMIT)
    rows, total = index.list(tool=tool, project=project, include_partial=show_all, limit=effective)
    if as_json:
        click.echo(json.dumps(rows, indent=2))
        return
    if not rows:
        click.echo("No sessions found.")
        return
    _echo(f"{'ID':<38} {'SURFACE':<16} {'STATE':<8} {'LAST ACTIVITY':<17}{'FILES':>6} {'SIZE':>9}  PROJECT")
    for rec in rows:
        _echo(_row(rec))
    if total > len(rows):
        click.echo(f"{len(rows)} of {total} shown. Use --limit N or --all.")


@session_group.command("find")
@click.argument("text")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def session_find(text, as_json):
    """Search sessions by id, alias, project path, repository, branch or title."""
    from ..observe.sessions import SessionIndex

    rows = SessionIndex().find(text)
    if as_json:
        click.echo(json.dumps(rows, indent=2))
        return
    if not rows:
        click.echo(f"No session matches {text!r}.")
        return
    for rec in rows:
        _echo(_row(rec))


@session_group.command("show")
@click.argument("session_id")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def session_show(session_id, as_json):
    """Everything about one session: its folder, ids, project, state and artifacts.

    SESSION_ID is a full id, a prefix, a live PID, a folder or transcript path,
    a tool:pid:timestamp id, or a VS Code chat session id.
    """
    from ..observe.render import fmt_bytes
    from ..observe.sessions import SessionIndex

    index = SessionIndex()
    rec = _resolve(index, session_id)
    info = index.details(rec)
    artifacts = index.artifacts(rec)
    if as_json:
        click.echo(json.dumps({**info, "artifacts": artifacts}, indent=2))
        return
    lines = [
        f"folder:     {info['folder'] or 'none on disk (known only from a store)'}",
        f"id:         {info['id']}",
        f"surface:    {info['surface']} ({info['surface_source']})",
    ]
    if info["aliases"]:
        lines.append(f"aliases:    {', '.join(info['aliases'])}")
    lines += [
        f"project:    {info['project'] or 'unknown'}",
        f"git root:   {info['git_root'] or 'unknown'}",
        f"repository: {info['repository'] or 'unknown'}",
        f"branch:     {info['branch'] or 'unknown'}",
        f"title:      {info['title'] or 'unknown'}",
        f"state:      {info['state']}",
        f"started:    {_when(info['started_at'])}",
        f"last seen:  {_when(info['last_activity_at'])}",
        f"models:     {', '.join(info['models']) or 'unknown'}",
        f"pids:       {', '.join(map(str, info['pids'])) or 'none live'}",
        f"sub-agents: {len(info['sub_agents'])}",
        f"sources:    {', '.join(info['sources'])}",
    ]
    lines.append(f"artifacts:  {len(artifacts)} ({fmt_bytes(info['artifact_bytes'] or 0)})")
    lines += [_artifact_row(a) for a in artifacts]
    _echo("\n".join(lines))


def _artifact_row(a: dict) -> str:
    from ..observe.render import fmt_bytes

    size = fmt_bytes(a["size"]) if a["size"] is not None else "-"
    tag = f" checkpoint {a['checkpoint']}" if "checkpoint" in a else ""
    tag += f" snapshot {a['snapshot_id']}" if a.get("snapshot_id") else ""
    return f"  {a['type']:<15} {size:>9}  {_when(a['modified_at']):<17} {a['name']}{tag}"


@session_group.command("path")
@click.argument("session_id")
def session_path(session_id):
    """Print only the session's folder, for use in scripts."""
    from ..observe.sessions import SessionIndex

    rec = _resolve(SessionIndex(), session_id)
    if not rec["folder"]:
        raise click.ClickException(f"Session {rec['id']} has no folder on disk; it is known only from a store.")
    _echo(rec["folder"])


@session_group.command("artifacts")
@click.argument("session_id")
@click.option("--type", "kind", default=None, help="Only this type, for example checkpoint or event_log")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def session_artifacts(session_id, kind, as_json):
    """List and classify every file that belongs to a session."""
    from ..observe.sessions import SessionIndex

    index = SessionIndex()
    rows = index.artifacts(_resolve(index, session_id), kind)
    if as_json:
        click.echo(json.dumps(rows, indent=2))
        return
    if not rows:
        click.echo("No artifacts.")
        return
    for a in rows:
        _echo(_artifact_row(a))


@session_group.command("cat")
@click.argument("session_id")
@click.argument("artifact")
@click.option("--max-bytes", type=int, default=None, help="Stop after this many bytes (default 256 KiB)")
@click.option("--binary", is_flag=True, help="Write a binary file to stdout instead of refusing")
def session_cat(session_id, artifact, max_bytes, binary):
    """Print one file from inside a session's folder, with a size limit."""
    from ..observe.sessions import DEFAULT_CAT_BYTES, ArtifactRefused, SessionIndex, read_artifact

    index = SessionIndex()
    rec = _resolve(index, session_id)
    try:
        result = read_artifact(rec, artifact, max_bytes or DEFAULT_CAT_BYTES, allow_binary=binary)
    except ArtifactRefused as exc:
        raise click.ClickException(str(exc)) from exc
    if result["binary"] and result["content"] is None:
        raise click.ClickException(f"{result['path']} is binary ({result['size']} bytes). Use --binary to print it.")
    if result["binary"]:
        click.get_binary_stream("stdout").write(result["content"])
    else:
        _echo(result["content"])
    if result["truncated"]:
        click.echo(f"[truncated: file is {result['size']} bytes; use --max-bytes for more]", err=True)


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
