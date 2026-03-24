"""Show all resources for AI coding tools in the current project."""

from __future__ import annotations

import dataclasses
import json
from pathlib import Path

import click

from ..discovery import discover_all, backtrace_process, ToolResources


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory")
@click.option("--tool", "tool_filter", default=None,
              help="Filter to one tool (claude, copilot, cursor, windsurf, aictl)")
@click.option("--processes", "show_procs", is_flag=True,
              help="Include running processes for each tool")
@click.option("--backtrace", "bt_pid", type=int, default=None, metavar="PID",
              help="Sample a process stack trace by PID")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("--html", "as_html", is_flag=True,
              help="Generate a self-contained HTML report (stdout)")
@click.option("-o", "--output", "out_file", default=None, type=click.Path(),
              help="Write HTML report to file instead of stdout")
def status(root_dir, tool_filter, show_procs, bt_pid, as_json, as_html, out_file):
    """Show all resources for AI coding tools."""
    root = Path(root_dir).resolve()

    # --backtrace PID: just sample and exit
    if bt_pid is not None:
        _do_backtrace(bt_pid)
        return

    # HTML report always includes processes
    include_procs = show_procs or as_html or out_file
    results = discover_all(root, include_processes=include_procs)

    if tool_filter:
        results = [r for r in results if r.tool == tool_filter]
        if not results:
            raise SystemExit(f"Unknown tool: {tool_filter}")

    if as_html or out_file:
        _emit_html(results, root, out_file)
    elif as_json:
        _print_json(results)
    else:
        _print_human(results, root, show_procs)


# ─── HTML output ─────────────────────────────────────────────────────

def _emit_html(results: list[ToolResources], root: Path, out_file: str | None) -> None:
    from ..dashboard.collector import DashboardSnapshot
    from ..dashboard.html_report import render_html
    from ..discovery import collect_agent_memory, collect_mcp_status
    import time

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
                    click.echo(
                        f"    PID {click.style(str(p.pid), fg='green')}"
                        f"  CPU {p.cpu_pct}%"
                        f"  MEM {p.mem_mb}MB"
                        f"  {p.name}"
                    )
                    if len(p.cmdline) > len(p.name):
                        click.secho(f"      {p.cmdline[:120]}", fg="bright_black")
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


# ─── Formatting helpers ─────────────────────────────────────────────

def _rel_display(path_str: str, root: Path, home: Path) -> str:
    """Show path relative to root, or with ~ for home."""
    p = Path(path_str)
    try:
        return str(p.relative_to(root))
    except ValueError:
        pass
    try:
        return "~/" + str(p.relative_to(home))
    except ValueError:
        return path_str


def _human_size(n: int) -> str:
    if n < 1024:
        return f"{n}B"
    k = n / 1024
    if k < 1024:
        return f"{k:.1f}KB"
    return f"{k / 1024:.1f}MB"
