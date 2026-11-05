# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI: aictl ctx audit — find hidden context that reaches AI tools."""

from __future__ import annotations

import json
import sys

import click

from ..context_audit import SEVERITIES, escape_invisible, run_audit

_COLORS = {"high": "red", "medium": "yellow", "low": "cyan", "info": "bright_black"}


def _print_report(report: dict, show_info: bool) -> None:
    counts = report["counts"]
    click.secho(f"\nContext audit: {report['project']}", bold=True)
    tools = ", ".join(f"{k} {v}" for k, v in sorted(report["sources_per_tool"].items()))
    click.echo(f"  sources: {len(report['sources'])} ({tools})")
    always = sum(s["est_tokens"] for s in report["sources"] if s["loading"] == "always")
    click.echo(f"  always-loaded: about {always} tokens (estimate)")
    drift = report["drift"]
    if drift["baseline_created"]:
        click.echo(f"  baseline: created at {drift['baseline_path'] or 'memory only'}")
    else:
        click.echo(
            f"  drift: {len(drift['new'])} new, {len(drift['changed'])} changed, {len(drift['removed'])} removed, "
            f"{len(drift['agent_writes'])} agent writes"
        )
    for row in report["unattributed"]:
        click.echo(
            f"  unattributed ({row['tool']}): about {row['residual_tokens']} of {row['first_request_tokens_median']} "
            f"first-request tokens, after a {row['builtin_allowance_tokens']} token built-in allowance (estimate)"
        )
    click.echo(f"  findings: {counts['high']} high, {counts['medium']} medium, {counts['low']} low, {counts['info']} info")
    click.echo(f"  took {report['duration_ms']} ms\n")
    for finding in report["findings"]:
        if finding["severity"] == "info" and not show_info:
            continue
        where = finding["path"] + (f":{finding['line']}" if finding["line"] else "")
        extra = f" (x{finding['count']})" if finding["count"] > 1 else ""
        click.secho(f"{finding['severity'].upper():6} {finding['rule']}{extra}", fg=_COLORS[finding["severity"]], bold=finding["severity"] == "high")
        click.echo(f"       {escape_invisible(where)}")
        if finding["snippet"]:
            click.echo(f"       {finding['snippet']}")
        if finding["why"]:
            click.echo(f"       why: {finding['why']}")
        if finding["session_id"]:
            click.echo(f"       session: {finding['session_id']}")
        if finding["action"]:
            click.echo(f"       do: {finding['action']}")


@click.command("audit")
@click.option("--project", "project", type=click.Path(exists=True, file_okay=False), default=None, help="Project root (default: current directory)")
@click.option("--tool", default=None, help="Only this tool, e.g. claude-code, codex, copilot, cursor, windsurf, gemini")
@click.option("--json", "as_json", is_flag=True, help="Print the full report as JSON")
@click.option("--update-baseline", is_flag=True, help="Accept the current state as the new baseline")
@click.option("--baseline", "baseline_file", type=click.Path(dir_okay=False), default=None, help="Baseline file (default: context-baseline.json in aictl's config dir)")
@click.option("--fail-on", type=click.Choice(["high", "medium"]), default=None, help="Exit 1 when a finding of this severity or worse exists")
@click.option("--all", "show_info", is_flag=True, help="Also list info findings")
def audit_cmd(project, tool, as_json, update_baseline, baseline_file, fail_on, show_info):
    """Find hidden context: what reaches the model, and what conceals itself.

    Read-only over everything it scans. It never runs a hook or an MCP server.
    """
    report = run_audit(project, tool, update_baseline=update_baseline, baseline_file=baseline_file)
    if as_json:
        click.echo(json.dumps(report, indent=2))
    else:
        _print_report(report, show_info)
    if fail_on:
        limit = SEVERITIES.index(fail_on)
        if any(report["counts"][sev] for sev in SEVERITIES[: limit + 1]):
            sys.exit(1)
