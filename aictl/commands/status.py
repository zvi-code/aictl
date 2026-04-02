# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI commands: status + memory — status and memory inspection."""

from __future__ import annotations

import dataclasses
import json
import time
from pathlib import Path

import click

from ..tools import (
    discover_all,
    backtrace_process,
    compute_token_budget,
    ToolResources,
    expand_tool_filter,
    TOOL_GROUPS,
    TOOL_LABELS,
    collect_agent_memory,
    collect_mcp_status,
)
from ..dashboard.models import DashboardSnapshot, STATUS_COLOURS, SOURCE_LABELS
from ..dashboard.html_report import render_html
from ..memory import get_summary, list_stashes


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
@click.option("--tool", "tool_filter", default=None,
              help="Filter to one tool (claude, copilot, cursor, windsurf, aictl)")
@click.option("--processes", "show_procs", is_flag=True,
              help="Include running processes for each tool")
@click.option("--backtrace", "bt_pid", type=int, default=None, metavar="PID",
              help="Sample a process stack trace by PID")
@click.option("--budget", "show_budget", is_flag=True,
              help="Show token cost summary")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("--html", "as_html", is_flag=True,
              help="Generate a self-contained HTML report (stdout)")
@click.option("-o", "--output", "out_file", default=None, type=click.Path(),
              help="Write HTML report to file instead of stdout")
@click.option("--server/--no-server", "use_server", default=True,
              help="Try connecting to running aictl serve (default: yes)")
def status(root_dir, tool_filter, show_procs, bt_pid, show_budget, as_json, as_html, out_file, use_server):
    """Show all resources for AI coding tools."""
    root = Path(root_dir).resolve()

    # --backtrace PID: just sample and exit
    if bt_pid is not None:
        _do_backtrace(bt_pid)
        return

    # Try connecting to running server for richer data
    results = None
    if use_server and not as_html and not out_file:
        try:
            from ..client import ServerClient
            client = ServerClient.try_connect()
            if client:
                snap_dict = client.get_snapshot()
                from ..dashboard.models import DashboardSnapshot
                snap = DashboardSnapshot.from_dict(snap_dict)
                results = [t for t in snap.tools]
                if as_json:
                    click.echo(json.dumps(snap_dict, indent=2))
                    return
                click.secho("(connected to aictl serve)", fg="green", err=True)
        except (OSError, ConnectionError):
            pass  # server not running; fall through to local discovery

    # Fall back to local discovery
    if results is None:
        include_procs = show_procs or as_html or out_file
        results = discover_all(root, include_processes=include_procs)

    if tool_filter:
        expanded = expand_tool_filter([tool_filter])
        results = [r for r in results if r.tool in expanded or r.tool == tool_filter]
        # Only error if the tool name is truly unknown (not in groups or labels)
        if not results and tool_filter not in TOOL_GROUPS and tool_filter not in TOOL_LABELS:
            raise click.ClickException(f"Unknown tool: {tool_filter}")

    if as_html or out_file:
        _emit_html(results, root, out_file)
    elif as_json:
        _print_json(results)
    else:
        _print_human(results, root, show_procs)
        if show_budget:
            _print_budget(results, str(root))


# ─── HTML output ─────────────────────────────────────────────────────

def _emit_html(results: list[ToolResources], root: Path, out_file: str | None) -> None:

    snap = DashboardSnapshot(
        timestamp=time.time(),
        root=str(root),
        tools=results,
        agent_memory=collect_agent_memory(root),
        mcp_detail=collect_mcp_status(results),
    )
    html = render_html(snap)

    if out_file:
        Path(out_file).write_text(html, encoding="utf-8")
        click.secho(f"HTML report written to {out_file}", fg="green")
    else:
        click.echo(html)


# ─── Backtrace ──────────────────────────────────────────────────────

def _do_backtrace(pid: int) -> None:
    click.secho(f"\nSampling PID {pid} …", fg="yellow")
    bt = backtrace_process(pid)
    if bt:
        click.echo(bt)
    else:
        click.secho("Could not obtain backtrace. May need elevated permissions.", fg="red")


# ─── JSON output ────────────────────────────────────────────────────

def _print_json(results: list[ToolResources]) -> None:
    click.echo(json.dumps([dataclasses.asdict(r) for r in results], indent=2))


# ─── Human output ───────────────────────────────────────────────────

def _print_human(results: list[ToolResources], root: Path, show_procs: bool) -> None:
    home = Path.home()
    any_found = False

    # Separate aictl from real tool results
    tool_results = [r for r in results if r.tool != "aictl"]
    aictl_results = [r for r in results if r.tool == "aictl"]

    for res in tool_results:
        if not res.files and not res.processes and not res.mcp_servers:
            continue
        any_found = True

        click.secho(f"\n{'─' * 54}", fg="bright_black")
        click.secho(f"  {res.label}", bold=True)
        click.secho(f"{'─' * 54}", fg="bright_black")

        # ── Files
        if res.files:
            click.secho("\n  Files:", fg="cyan", bold=True)
            for f in res.files:
                size_str = _human_size(f.size)
                tok_str = f"  ~{f.tokens} tok" if f.tokens else ""
                kind = click.style(f"[{f.kind}]", fg="yellow")
                rel = _rel_display(f.path, root, home)
                click.echo(f"    {kind} {rel}"
                           f"  {click.style(size_str, fg='bright_black')}"
                           f"{click.style(tok_str, fg='bright_black')}")

        # ── Memory (Claude)
        if res.memory:
            click.secho("\n  Memory:", fg="cyan", bold=True)
            click.echo(f"    {res.memory['total_tokens']} tokens loaded every session")
            click.echo(f"    {len(res.memory['files'])} file(s) in {res.memory['dir']}")

        # ── MCP Servers
        if res.mcp_servers:
            click.secho("\n  MCP Servers:", fg="cyan", bold=True)
            for srv in res.mcp_servers:
                cmd = srv["config"].get("command", "?")
                args = " ".join(srv["config"].get("args", []))
                click.echo(f"    {click.style(srv['name'], fg='green')}"
                           f" — {cmd} {args[:80]}")

        # ── Processes
        if show_procs:
            if res.processes:
                click.secho("\n  Processes:", fg="cyan", bold=True)
                for p in res.processes:
                    pid = p.pid if hasattr(p, 'pid') else p.get('pid', '?')
                    cpu = p.cpu_pct if hasattr(p, 'cpu_pct') else p.get('cpu_pct', 0)
                    mem = p.mem_mb if hasattr(p, 'mem_mb') else p.get('mem_mb', 0)
                    name = p.name if hasattr(p, 'name') else p.get('name', '?')
                    cmdline = p.cmdline if hasattr(p, 'cmdline') else p.get('cmdline', name)
                    anomalies = p.anomalies if hasattr(p, 'anomalies') else p.get('anomalies', [])
                    click.echo(
                        f"    PID {click.style(str(pid), fg='green')}"
                        f"  CPU {cpu}%"
                        f"  MEM {mem}MB"
                        f"  {name}"
                    )
                    if len(cmdline) > len(name):
                        click.secho(f"      {cmdline[:120]}", fg="bright_black")
                    if anomalies:
                        for a in anomalies:
                            click.secho(f"      ⚠ {a}", fg="red")
                        cleanup = p.cleanup_cmd if hasattr(p, 'cleanup_cmd') else p.get('cleanup_cmd', '')
                        if cleanup:
                            click.secho(f"      cleanup: {cleanup}", fg="bright_black")
                click.secho("\n    Tip: aictl status --backtrace <PID>", fg="bright_black")
            else:
                click.secho("\n  Processes: none detected", fg="bright_black")

    if not any_found:
        click.secho("\nNo AI tool resources found in this directory.\n", fg="bright_black")
    else:
        click.echo()

    # ── aictl context files (separate section) ─────────────────────
    for res in aictl_results:
        if not res.files:
            continue
        click.secho(f"\n{'─' * 54}", fg="bright_black")
        click.secho("  aictl context files  (.aictx — not read by LLM tools)", bold=True)
        click.secho(f"{'─' * 54}", fg="bright_black")
        click.secho("\n  Files:", fg="cyan", bold=True)
        for f in res.files:
            size_str = _human_size(f.size)
            tok_str = f"  ~{f.tokens} tok" if f.tokens else ""
            kind = click.style(f"[{f.kind}]", fg="yellow")
            rel = _rel_display(f.path, root, home)
            click.echo(f"    {kind} {rel}"
                       f"  {click.style(size_str, fg='bright_black')}"
                       f"{click.style(tok_str, fg='bright_black')}")
        click.echo()


# ─── Formatting helpers (delegated to utils.py) ───────────────────

from ..utils import human_size as _human_size, rel_display as _rel_display


def _print_budget(results: list[ToolResources], root: str = "") -> None:
    budget = compute_token_budget(results, root)
    click.secho(f"\n{'─' * 54}", fg="bright_black")
    click.secho("  Token Budget", bold=True)
    click.secho(f"{'─' * 54}", fg="bright_black")
    click.echo(f"    Always loaded (every call):  ~{budget['always_loaded_tokens']} tokens")
    click.echo(f"    On-demand (when invoked):    ~{budget['on_demand_tokens']} tokens")
    click.echo(f"    Conditional (file-matched):  ~{budget['conditional_tokens']} tokens")
    click.echo(f"    Cacheable portion:           ~{budget['cacheable_tokens']} tokens")
    click.echo(f"    Survives compaction:         ~{budget['survives_compaction_tokens']} tokens")
    click.secho(f"    Total potential overhead:    ~{budget['total_potential_tokens']} tokens",
                bold=True)
    click.echo(f"    Files never sent to LLM:      {budget['never_sent_count']}")
    click.echo()


# ─── memory ──────────────────────────────────────────────────────────────────


@click.group()
def memory():
    """Inspect Claude Code auto-memory (read-only)."""


@memory.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
def show(root_dir):
    """Show active memory content and token cost."""
    s = get_summary(Path(root_dir).resolve())
    if not s:
        click.secho("\nNo auto-memory found.\n", fg="bright_black")
        return
    click.secho(f"\n🧠  Active memory: {s['dir']}", bold=True)
    click.secho(f"   Total: {s['total_tokens']} tokens loaded every session\n", fg="bright_black")
    for f in s["files"]:
        click.echo(f"   {click.style(f['file'], fg='cyan')} — {f['lines']} lines, {click.style(str(f['tokens'])+' tok', fg='yellow')}")
        preview = [l for l in f["content"].splitlines() if l.strip() and not l.startswith("#")][:3]
        for line in preview:
            click.secho(f"     {line}", fg="bright_black")
    click.echo()


@memory.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
def stashes(root_dir):
    """List per-profile memory stashes."""
    items = list_stashes(Path(root_dir).resolve())
    if not items:
        click.secho("\nNo memory stashes.\n", fg="bright_black")
        return
    click.secho("\n🧠  Memory stashes:\n", bold=True)
    for s in items:
        marker = click.style("●", fg="green") if s["profile"] == "(active)" else click.style("○", fg="bright_black")
        click.echo(f"   {marker} {s['profile']} — {s['files']} file(s), {s['lines']} lines")
    click.secho("\n   Swapped automatically on profile switch.\n", fg="bright_black")
