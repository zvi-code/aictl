# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI: aictl ctx effective — which settings are in force, and where each comes from."""

from __future__ import annotations

import json

import click

from ..context_audit import escape_invisible
from ..effective_config import effective_report

_COLORS = {"high": "red", "medium": "yellow", "low": "cyan", "info": "bright_black"}


def _where(path: str, line: int) -> str:
    return escape_invisible(f"{path}:{line}" if line else path)


def _print_model(eff: dict) -> None:
    click.secho(f"\n{eff['tool']}", bold=True)
    if eff["value"]:
        suffix = "" if eff["verified"] else "  (order unverified)"
        click.secho(f"  effective model: {eff['value']}{suffix}", bold=True)
        click.echo(f"    from: {_where(eff['source'], eff['line'])} (scope {eff['scope']})")
        click.echo(f"    {eff['why_in_effect']}")
    else:
        click.echo(f"  effective model: none pinned. {eff['why_in_effect']}")
    for row in eff["overrides"]:
        click.echo(f"    overrides: {row['value']} at {_where(row['path'], row['line'])} (scope {row['scope']})")
    for item in eff["conflicts"]:
        request = item["request"]
        click.secho(f"    CONFLICT: {', '.join(request['values'])} requested at {_where(request['path'], request['line'])}", fg="red")
    for row in eff["limited"]:
        click.echo(f"  limited to {row['applies']}: {row['setting']} = {row['value']}")
        click.echo(f"    from: {_where(row['path'], row['line'])} (scope {row['scope']})")
        if not row["in_project"]:
            click.echo(f"    {row['why_in_effect']}")
    for row in eff["restrictions"]:
        click.echo(f"  restriction: {row['name']} = {row['value']} at {escape_invisible(row['path'])}")
    for note in eff["unverified"]:
        click.echo(f"  unverified: {note}")


@click.command("effective")
@click.option("--project", "project", type=click.Path(exists=True, file_okay=False), default=None, help="Project root (default: current directory)")
@click.option("--tool", default=None, help="Only this tool, e.g. copilot-cli, copilot-vscode, claude-code")
@click.option("--json", "as_json", is_flag=True, help="Print the full report as JSON")
@click.option("--search-path", "show_search", is_flag=True, help="Also list every location checked, including absent ones")
def effective_cmd(project, tool, as_json, show_search):
    """Show which settings are in force, where each comes from, and what it overrode.

    Read-only. It runs no tool and writes nothing.
    """
    report = effective_report(project, tool, include_search_path=show_search)
    if as_json:
        click.echo(json.dumps(report, indent=2))
        return
    click.secho(f"\nEffective configuration: {report['project']}", bold=True)
    for eff in report["effective_models"].values():
        _print_model(eff)
    for name, rows in report["settings"].items():
        if not rows:
            continue
        click.secho(f"\nSettings: {name}", bold=True)
        for row in rows:
            place = "here" if row["in_project"] else "not in this project, still in effect"
            click.echo(f"  {row['setting']} = {row['value']}  [{row['scope']}, {place}] {escape_invisible(row['path'])}")
            for over in row["overrode"]:
                click.echo(f"    overrode {over['value']} [{over['scope']}] {escape_invisible(over['path'])}")
    findings = report["findings"]
    if findings:
        click.secho("\nFindings", bold=True)
    for finding in sorted(findings, key=lambda f: ("high", "medium", "low", "info").index(f["severity"])):
        click.secho(f"{finding['severity'].upper():6} {finding['rule']}", fg=_COLORS[finding["severity"]])
        click.echo(f"       {_where(finding['path'], finding['line'])}")
        if finding["snippet"]:
            click.echo(f"       {escape_invisible(finding['snippet'])}")
        if finding["session_id"]:
            click.echo(f"       session: {finding['session_id']}")
    if show_search:
        click.secho("\nSearch path", bold=True)
        for row in report.get("search_path", []):
            mark = "found " if row["exists"] else "absent"
            verified = "" if row["verified"] else "  (unverified)"
            place = "in project" if row["in_project"] else "outside project"
            click.echo(f"  {mark} {escape_invisible(row['raw'])}{verified}")
            click.echo(f"         {escape_invisible(row['expanded'] or 'variable not set')} [{row['scope']}, {place}]")
