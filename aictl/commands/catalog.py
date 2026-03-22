# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI command group: datapoint catalog — dump, sync, validate."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import click

from ..config import load_config


@click.group(invoke_without_command=True)
@click.option("-o", "--output", "out_path", default=None, type=click.Path(),
              help="Output file path (default: stdout)")
@click.option("--format", "fmt", default="md", type=click.Choice(["md", "json"]),
              help="Output format: md (table) or json")
@click.option("--tab", default=None, help="Filter by tab name")
@click.option("--source-type", default=None,
              type=click.Choice(["raw", "deduced", "aggregated"]),
              help="Filter by source type")
@click.option("--db", "db_path", default=None, type=click.Path(),
              help="Path to SQLite history database")
@click.pass_context
def catalog(ctx, out_path, fmt, tab, source_type, db_path):
    """Datapoint catalog — explanations, queries, sources for every dashboard metric.

    \b
    Without a subcommand, dumps the catalog:
      aictl catalog                        # markdown to stdout
      aictl catalog -o docs/catalog.md     # write to file
      aictl catalog --format json          # JSON output
      aictl catalog --tab budget           # only budget tab

    \b
    Subcommands:
      aictl catalog sync                   # re-sync DB from YAML files
      aictl catalog validate               # check for gaps
    """
    if ctx.invoked_subcommand is not None:
        ctx.ensure_object(dict)
        ctx.obj["db_path"] = db_path
        return

    from ..storage import HistoryDB
    db = HistoryDB(db_path=db_path)
    entries = db.query_datapoint_catalog(tab=tab, source_type=source_type)
    db.close()

    if not entries:
        click.echo("No catalog entries found. Run 'aictl catalog sync' to seed the DB.", err=True)
        sys.exit(1)

    if fmt == "json":
        output = json.dumps(entries, indent=2, default=str)
    else:
        output = _render_markdown(entries)

    if out_path:
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(out_path).write_text(output, encoding="utf-8")
        click.echo(f"Written {len(entries)} entries to {out_path}")
    else:
        click.echo(output)


@catalog.command()
@click.pass_context
def sync(ctx):
    """Re-sync the datapoint catalog from YAML source files.

    Reads datapoint-catalog.yaml and datapoint-queries.yaml from the
    aictl data directory and upserts all entries into the DB. Safe to
    run repeatedly — uses INSERT OR REPLACE.
    """
    from ..storage import HistoryDB
    db_path = ctx.obj.get("db_path") if ctx.obj else None
    db = HistoryDB(db_path=db_path)
    count = db.sync_datapoint_catalog()
    db.close()
    click.echo(f"Synced {count} catalog entries to DB")


@catalog.command()
@click.option("--fix", is_flag=True, help="Auto-sync to fix gaps")
@click.pass_context
def validate(ctx, fix):
    """Validate catalog completeness — check for missing queries, explanations, or gaps.

    \b
    Checks:
      - Every entry has explanation, source, query, calc
      - No duplicate keys
      - YAML and DB are in sync
    """
    from ..storage import HistoryDB
    from collections import Counter

    db_path = ctx.obj.get("db_path") if ctx.obj else None
    db = HistoryDB(db_path=db_path)
    entries = db.query_datapoint_catalog()

    issues = []
    # Check required fields
    for e in entries:
        key = e["key"]
        if not e.get("explanation", "").strip():
            issues.append(f"{key}: missing explanation")
        if not e.get("source_static", "").strip():
            issues.append(f"{key}: missing source")
        if not e.get("query", "").strip():
            issues.append(f"{key}: missing query")
        if not e.get("calc", "").strip():
            issues.append(f"{key}: missing calc")
        if e["source_type"] not in ("raw", "deduced", "aggregated"):
            issues.append(f"{key}: invalid source_type={e['source_type']}")

    # Check duplicates
    key_counts = Counter(e["key"] for e in entries)
    for k, c in key_counts.items():
        if c > 1:
            issues.append(f"{k}: duplicate key ({c} copies)")

    # Check YAML vs DB sync
    import yaml
    yaml_path = Path(__file__).parent.parent / "data" / "datapoint-catalog.yaml"
    if yaml_path.exists():
        with open(yaml_path) as f:
            yaml_catalog = yaml.safe_load(f) or {}
        db_keys = {e["key"] for e in entries}
        yaml_keys = set(yaml_catalog.keys())
        in_yaml_not_db = yaml_keys - db_keys
        in_db_not_yaml = db_keys - yaml_keys
        if in_yaml_not_db:
            issues.append(f"In YAML but not DB: {sorted(in_yaml_not_db)}")
        if in_db_not_yaml:
            issues.append(f"In DB but not YAML: {sorted(in_db_not_yaml)}")

    # Check queries YAML
    q_path = Path(__file__).parent.parent / "data" / "datapoint-queries.yaml"
    if q_path.exists():
        with open(q_path) as f:
            yaml_queries = yaml.safe_load(f) or {}
        missing_queries = yaml_keys - set(yaml_queries.keys())
        if missing_queries:
            issues.append(f"In catalog YAML but no query: {sorted(missing_queries)}")

    db.close()

    # Report
    by_type = Counter(e["source_type"] for e in entries)
    dynamic = sum(1 for e in entries if e.get("dynamic_source"))
    click.echo(f"Catalog: {len(entries)} entries")
    click.echo(f"  Raw: {by_type.get('raw', 0)} | "
               f"Deduced: {by_type.get('deduced', 0)} | "
               f"Aggregated: {by_type.get('aggregated', 0)}")
    click.echo(f"  Dynamic: {dynamic} | Static: {len(entries) - dynamic}")

    if issues:
        click.echo(f"\n{len(issues)} issue(s) found:")
        for issue in issues:
            click.echo(f"  - {issue}")
        if fix:
            click.echo("\nRe-syncing from YAML...")
            db2 = HistoryDB(db_path=db_path)
            count = db2.sync_datapoint_catalog()
            db2.close()
            click.echo(f"Synced {count} entries. Re-run validate to check.")
        else:
            click.echo("\nRun with --fix to auto-sync from YAML files.")
        sys.exit(1)
    else:
        click.echo("\nAll checks passed.")


def _render_markdown(entries: list[dict]) -> str:
    """Render catalog entries as a markdown table grouped by tab."""

    def esc(s: str) -> str:
        return " ".join(s.strip().split()).replace("|", "\\|")

    type_counts: dict[str, int] = {}
    tabs: dict[str, list[dict]] = {}
    for e in entries:
        type_counts[e["source_type"]] = type_counts.get(e["source_type"], 0) + 1
        tabs.setdefault(e["tab"], []).append(e)

    lines: list[str] = []
    lines.append("# aictl Dashboard Datapoint Catalog")
    lines.append("")
    lines.append(
        f"> **{len(entries)}** datapoints across **{len(tabs)}** tabs.  "
    )
    lines.append(
        f"> Raw: {type_counts.get('raw', 0)}"
        f" | Deduced: {type_counts.get('deduced', 0)}"
        f" | Aggregated: {type_counts.get('aggregated', 0)}  "
    )
    lines.append(f"> Generated: {time.strftime('%Y-%m-%d %H:%M')}")
    lines.append("")

    # TOC
    lines.append("## Contents")
    lines.append("")
    for tab_name in sorted(tabs):
        lines.append(f"- [{tab_name}](#{tab_name}) ({len(tabs[tab_name])})")
    lines.append("")

    # Per-tab tables
    for tab_name in sorted(tabs):
        tab_entries = sorted(tabs[tab_name], key=lambda e: (e["section"], e["key"]))
        lines.append("---")
        lines.append(f"## {tab_name}")
        lines.append("")
        lines.append("| Key | Type | Explanation | Query | Calculation |")
        lines.append("|-----|------|-------------|-------|-------------|")

        for e in tab_entries:
            key = f"`{e['key']}`"
            badge = e["source_type"].upper()
            if e.get("dynamic_source"):
                badge += " *"
            expl = esc(e.get("explanation", ""))
            query = esc(e.get("query", "") or "")
            calc = esc(e.get("calc", "") or "")
            if query:
                query = f"`{query}`"
            else:
                query = "\u2014"
            lines.append(f"| {key} | {badge} | {expl} | {query} | {calc} |")

        lines.append("")

    # Legend
    lines.append("---")
    lines.append("## Legend")
    lines.append("")
    lines.append(
        "- **RAW**: Direct reading from a DB table or config lookup"
    )
    lines.append("- **DEDUCED**: Requires calculation over queried data")
    lines.append("- **AGGREGATED**: SUM/COUNT/GROUP BY over queried rows")
    lines.append(
        "- **\\***: Dynamic \u2014 live provenance JSON updated each cycle"
        " (`GET /api/datapoints?key=<key>`)"
    )
    lines.append(
        "- `?param?` in queries: bind parameter"
        " (tool name, PID, timestamp, session ID)"
    )
    lines.append("")

    return "\n".join(lines)
