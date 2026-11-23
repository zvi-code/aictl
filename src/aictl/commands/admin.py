# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""CLI command groups: db + config + catalog — admin commands."""

from __future__ import annotations

import json
import shutil
import time
from collections import Counter
from pathlib import Path

import click

from ..cli_context import CliContext
from ..kusto import kusto_settings
from ..platforms import config_path, show_config, write_default_config
from ..stores.base import StoreError

# ─── db ─────────────────────────────────────────────────────────────────────


@click.group()
@click.option("--db", "db_path", default=None, type=click.Path(), hidden=True)
@click.pass_context
def db(ctx, db_path):
    """Inspect or maintain stored history."""
    ctx.ensure_object(CliContext)
    ctx.obj.db_path = db_path


def _admin_settings(ctx):
    if ctx.obj and ctx.obj.db_path:
        raise click.ClickException("This operation no longer supports --db. Configure a Kusto store.")
    settings = kusto_settings()
    if settings is None:
        raise click.ClickException("No store configured")
    return settings


@db.command("trim-text")
@click.option("--dry-run", is_flag=True, help="Check the trim predicates without deleting records")
@click.option("--older-than-days", type=click.FloatRange(min=0), default=0, help="Only text older than this")
@click.pass_context
def trim_text(ctx, dry_run, older_than_days):
    """Soft-delete text for this node. Keep metadata in separate tables."""
    from ..stores.kusto.maintenance import trim_text as trim

    settings = _admin_settings(ctx)
    try:
        tables = trim(settings, time.time() - older_than_days * 86400, dry_run=dry_run)
    except Exception as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(f"{'Dry run checked' if dry_run else 'Trim completed for'} {len(tables)} text tables in {settings.uri}.")


@db.command()
@click.pass_context
def stats(ctx):
    """Show current logical rows and physical extent metadata."""
    from datetime import datetime, timezone

    from ..stores.kusto.maintenance import store_stats

    settings = _admin_settings(ctx)
    try:
        details, logical = store_stats(settings)
    except Exception as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(f"Database: {settings.uri}")
    click.echo("\nCurrent logical rows (selected history tables, all nodes)")
    for row in logical:
        click.echo(f"{row['table']:32s} {row['rows']:>12,}")
        if row.get("earliest_ts") is not None and row.get("latest_ts") is not None:
            start = datetime.fromtimestamp(row["earliest_ts"], timezone.utc)
            end = datetime.fromtimestamp(row["latest_ts"], timezone.utc)
            click.echo(f"  Time range: {start.isoformat()} to {end.isoformat()}")
    click.echo("\nPhysical extent metadata (includes old versions and tombstones)")
    click.echo(f"{'Table':32s} {'Extents':>10s} {'Extent rows':>14s} {'Extent bytes':>14s}")
    for row in sorted(details, key=lambda row: row["TableName"]):
        counts = ["—" if row[k] is None else f"{row[k]:,}" for k in ("TotalExtents", "TotalRowCount", "TotalExtentSize")]
        click.echo(f"{row['TableName']:32s} {counts[0]:>10s} {counts[1]:>14s} {counts[2]:>14s}")


@db.command()
@click.option("--markdown", is_flag=True, help="Print as Markdown")
@click.option("--json", "as_json", is_flag=True, help="Print one JSON object per table")
def schema(markdown, as_json):
    """Print native Kusto table keys, columns, retention and ingestion modes."""
    from ..stores.kusto.maintenance import schema_rows

    if markdown and not as_json:
        click.echo("# aictl Kusto tables")
    for row in schema_rows():
        if as_json:
            click.echo(json.dumps(row))
            continue
        click.echo(f"\n{'## ' if markdown else ''}{row['table']}")
        click.echo(f"Key: {', '.join(row['key'])}; retention: {row['retention_days']} days; ingestion: {row['ingestion']}")
        click.echo("    " + ", ".join(f"{name}:{kind}" for name, kind in row["columns"].items()))


def _report_settings(cluster: str | None, database: str | None):
    """The store to read: the options first, then the configured cluster. The report only reads, so no ingestion mode."""
    import os
    from dataclasses import replace

    from ..kusto import AUTH_ENV, DATABASE_ENV, KustoSettings

    configured = kusto_settings()
    if cluster:
        return KustoSettings.from_values(
            cluster,
            database or (configured.database if configured else os.environ.get(DATABASE_ENV, "")),
            configured.auth if configured else os.environ.get(AUTH_ENV, ""),
        )
    if configured is not None and database:
        return replace(configured, database=database)
    return configured


@db.command()
@click.option(
    "--out",
    "out_path",
    type=click.Path(dir_okay=False, path_type=Path),
    default="aictl-kusto-report.html",
    show_default=True,
    help="File to write",
)
@click.option("--days", type=click.IntRange(min=1), default=None, help="Only data of the last N days (default: all)")
@click.option("--sections", "names", default=None, help="Only these sections, comma-separated, in this order (default: all)")
@click.option("--kusto-cluster", default=None, help="Read from this Kusto cluster (URL) instead of the configured one")
@click.option("--kusto-database", default=None, help="The Kusto database (default: the configured one, else aictl)")
@click.option("--from", "start", default=None, metavar="TIME", help="Only rows from this time on, UTC: 2026-11-01 or 2026-11-01T14:30")
@click.option("--to", "end", default=None, metavar="TIME", help="Only rows up to this time, UTC; a date alone includes that day")
@click.option("--node", "nodes", multiple=True, help="Only rows from this node ID (default: all nodes; legacy: untagged rows)")
@click.option("--project", "projects", multiple=True, help="Only rows of this project: its folder name or its full path")
@click.option("--tool", "tools", multiple=True, help="Only rows of this tool, for example copilot-cli")
@click.option("--model", "models", multiple=True, help="Only requests of this model, and the tool calls they issued")
@click.option("--mcp", "mcps", multiple=True, help="Only sessions that used this MCP server")
@click.option("--skill", "skills", multiple=True, help="Only sessions that loaded this skill")
@click.option("--agent", "agents", multiple=True, help="Only sessions that started an agent of this type")
@click.option("--values", "list_values", is_flag=True, help="Print the values the filters can name, with their sessions, and write no page")
@click.option(
    "--json",
    "json_path",
    type=click.Path(dir_okay=False, path_type=Path),
    default=None,
    help="Also write the results as JSON: per section the KQL as it ran and its rows",
)
def report(
    out_path, days, names, kusto_cluster, kusto_database, start, end, nodes, projects, tools, models, mcps, skills, agents, list_values, json_path
):
    """Write an HTML report of what the Kusto store knows about coding agents.

    Runs one KQL query per section against the configured cluster (see
    docs/kusto-cluster.md) and writes one self-contained HTML file. A section whose
    query fails shows the error; the rest of the page still renders.

    The filter options narrow what every section reads. Repeat an option or separate
    values with commas to name alternatives; different options must all hold.
    By default the report covers all nodes. --sections nodes compares their activity;
    --node legacy selects history without a recorded node ID.
    --mcp, --skill and --agent keep whole sessions: every row of a session in which
    the MCP server, skill or agent type was used. --values lists what can be named.
    """
    import json
    from datetime import datetime, timezone

    from ..kusto import report as kusto_report

    def values(given):
        return tuple(v.strip() for item in given for v in item.split(",") if v.strip())

    if days and (start or end):
        raise click.ClickException("Give the time range as --days or as --from and --to, not both.")
    only = kusto_report.ReportFilter(
        start=_report_time(start, "--from", end_of_day=False) if start else None,
        end=_report_time(end, "--to", end_of_day=True) if end else None,
        nodes=values(nodes),
        projects=values(projects),
        tools=values(tools),
        models=values(models),
        mcps=values(mcps),
        skills=values(skills),
        agents=values(agents),
    )
    if only.start and only.end and only.start >= only.end:
        raise click.ClickException("--from must be before --to.")
    try:
        kusto_report.filter_prelude(days, only)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc

    try:
        settings = _report_settings(kusto_cluster, kusto_database)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc
    if settings is None:
        raise click.ClickException(
            "No Kusto cluster is configured. Pass --kusto-cluster URL (and --kusto-database), set AICTL_KUSTO_CLUSTER "
            "(and AICTL_KUSTO_DATABASE) in this terminal, or set kusto_cluster in config.toml (see docs/kusto-cluster.md). "
            "On Windows, a variable set with setx reaches only terminals opened after it."
        )
    known = {s.name: s for s in kusto_report.SECTIONS}
    wanted = [n.strip() for n in names.split(",") if n.strip()] if names else list(known)
    unknown = [n for n in wanted if n not in known]
    if unknown or not wanted:
        raise click.ClickException(f"Unknown section: {', '.join(unknown) or repr(names)}. The sections are: {', '.join(known)}.")
    chosen = tuple(known[n] for n in wanted)

    window = f", last {days} days" if days else "" if only.start or only.end else ", all data"
    narrowed = "".join(f"\n  only {label}: {value}" for label, value in only.describe())
    if list_values:
        click.echo(f"Reading the filter values from {settings.uri}{window}{narrowed}")
        _report_values(kusto_report.run_values(settings, days, only))
        return
    click.echo(f"Running {len(chosen)} queries on {settings.uri}{window}{narrowed}")

    def show(result):
        what = "FAILED" if result.error else "no data" if result.empty else "ok"
        click.echo(f"  {result.name:<10} {result.seconds:6.2f} s  {what}")
        if result.error:
            click.echo("    " + result.error.strip().splitlines()[0][:300])

    results = kusto_report.run_report(settings, days, sections=chosen, on_result=show, only=only)
    facts = {"cluster": settings.cluster, "database": settings.database, "days": days, "only": only}
    facts["generated"] = datetime.now(timezone.utc)
    page = kusto_report.build_page(results, **facts)
    out_path = Path(out_path).expanduser()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page, encoding="utf-8")
    click.echo(f"Wrote {out_path.resolve()}")
    if json_path:
        json_path = Path(json_path).expanduser()
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(kusto_report.report_data(results, **facts), indent=1), encoding="utf-8")
        click.echo(f"Wrote {json_path.resolve()}")
    failed = [r.name for r in results if r.error]
    if failed:
        click.echo(f"{len(failed)} of {len(results)} sections failed: {', '.join(failed)}", err=True)
    if narrowed and all(r.empty for r in results):
        click.echo("No row passed the filter. Run the same line with --values to see what the store holds.", err=True)
    if len(failed) == len(results):
        raise SystemExit(1)


def _report_time(text: str, option: str, *, end_of_day: bool):
    """A --from or --to value as a UTC time. A date alone given as the end means the end of that day."""
    from datetime import datetime, timedelta, timezone

    text = text.strip()
    try:
        if len(text) == 10:
            day = datetime.strptime(text, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return day + timedelta(days=1) if end_of_day else day
        moment = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise click.ClickException(f"{option} takes a date or a time such as 2026-11-01 or 2026-11-01T14:30, not {text!r}.") from exc
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _report_values(result) -> None:
    """Print what --values read: the size of the data, then every value by the option that takes it."""
    if result.error:
        raise click.ClickException(result.error.strip().splitlines()[0][:300])
    totals, rows = (result.tables + [[], []])[:2]
    for row in totals:
        if row["rows"]:
            span = f", {row['first_row']} to {row['last_row']}"
            click.echo(f"{row['source']}: {row['rows']:,} rows in {row['sessions']:,} sessions{span}")
        else:
            click.echo(f"{row['source']}: no rows")
    field = None
    for row in rows:
        if row["field"] != field:
            field = row["field"]
            click.echo(f"\n--{field}  (sessions)")
        click.echo(f"  {row['sessions']:>6,}  {row['value']}")


def _store_options(command):
    """--kusto-cluster and --kusto-database, as `aictl daemon serve` takes them, for one command."""
    command = click.option("--kusto-database", default=None, help="The Kusto database (default: configured)")(command)
    return click.option("--kusto-cluster", default=None, help="The Kusto cluster URL (default: configured)")(command)


def _target_settings(ctx, kusto_cluster, kusto_database):
    import os

    from ..kusto import CLUSTER_ENV, DATABASE_ENV

    if kusto_cluster:
        os.environ[CLUSTER_ENV] = kusto_cluster
    if kusto_database:
        os.environ[DATABASE_ENV] = kusto_database
    try:
        return _admin_settings(ctx)
    except ValueError as exc:
        raise click.UsageError(str(exc)) from exc


@db.command()
@_store_options
@click.pass_context
def layout(ctx, kusto_cluster, kusto_database):
    """Show the stored data layout, this aictl's layout, the verdict and the changelog."""
    from ..stores.kusto import layout as L
    from ..stores.kusto.client import KustoClientFactory
    from ..stores.kusto.schema import check_layout

    settings = _target_settings(ctx, kusto_cluster, kusto_database)
    try:
        state = check_layout(KustoClientFactory.client(settings), settings.database)
    except StoreError as exc:
        raise click.ClickException(str(exc)) from exc
    stored, verdict = state.stored, state.verdict
    click.echo(f"Database:            {settings.database} on {settings.cluster}")
    click.echo(f"Stored layout:       {L.describe(L.UNVERSIONED if stored is None and state.has_data else stored)}")
    if stored is not None:
        click.echo(f"  compatible since:  {stored.compatible_since}")
        click.echo(f"  data epoch:        {stored.data_epoch or '-'} (began by {stored.origin or '-'})")
        click.echo(f"  written by aictl:  {stored.aictl_version or '-'} at {stored.written_at or '-'}")
        if stored.migrations_done:
            click.echo(f"  migrations done:   {', '.join(sorted(stored.migrations_done))}")
    click.echo(f"This aictl:          layout {L.LAYOUT_VERSION}, reads layouts {L.COMPATIBLE_SINCE} to "
               f"{L.LAYOUT_VERSION}")
    click.echo(f"Verdict:             {verdict}")
    if verdict not in L.COMPATIBLE:
        click.echo("\n" + L.message(verdict, stored, cluster=settings.cluster, database=settings.database))
    click.echo("\nChangelog:")
    for line in L.changelog_lines():
        click.echo(line)


@db.command()
@click.option("--dry-run", is_flag=True, help="Print each step's commands and the rows they change; change nothing")
@click.option("--yes", "-y", is_flag=True, help="Skip the confirmation prompt")
@_store_options
@click.pass_context
def migrate(ctx, dry_run, yes, kusto_cluster, kusto_database):
    """Upgrade the stored data to this aictl's layout and keep the history. Stop all writers first."""
    from ..stores.kusto import layout as L
    from ..stores.kusto.maintenance import migrate_store

    settings = _target_settings(ctx, kusto_cluster, kusto_database)
    if not dry_run and not yes:
        click.confirm(f"Migrate the stored data in {settings.database} on {settings.cluster} to layout "
                      f"{L.LAYOUT_VERSION}? Stop the other aictl writers of this database first.", abort=True)
    try:
        verdict, _ = migrate_store(settings, dry_run=dry_run, echo=click.echo)
    except (StoreError, RuntimeError) as exc:
        raise click.ClickException(str(exc)) from exc
    if verdict == L.MIGRATE:
        click.echo("Dry run: nothing was changed." if dry_run else
                   f"Migrated {settings.database} on {settings.cluster} to layout {L.LAYOUT_VERSION}.")


def confirm_and_reset(settings, *, yes: bool, echo=click.echo, confirm=click.confirm) -> bool:
    """Print what a reset deletes, ask unless *yes*, reset. Returns False when the user says no."""
    from ..stores.kusto.maintenance import reset_plan, reset_store

    plan = reset_plan(settings)
    echo(f"A reset deletes every aictl table in {settings.database} on {settings.cluster}, for ALL nodes:")
    for name, rows in plan:
        echo(f"  {name:40s} {'unknown' if rows is None else f'{rows:,}':>14s} rows")
    echo("Tables aictl does not own are kept. Each node then reads its history again from the session files "
         "still on its disk; data whose session files are gone, and data older than the retention period, "
         "cannot be rebuilt.")
    if not yes and not confirm(f"Delete the stored data in {settings.database} on {settings.cluster} and start "
                               "again?", default=False):
        return False
    status = reset_store(settings, [name for name, _ in plan])
    echo(f"Dropped {len(plan)} aictl tables and created them again; new data epoch {status.data_epoch}.")
    return True


@db.command()
@click.option("--yes", "-y", is_flag=True, help="Skip the confirmation prompt")
@_store_options
@click.pass_context
def reset(ctx, yes, kusto_cluster, kusto_database):
    """Delete all stored aictl data (every node) and start again. Prefer `aictl db migrate` when it applies.

    Stop all writers first.
    """
    from ..stores.kusto import layout as L
    from ..stores.kusto.client import KustoClientFactory
    from ..stores.kusto.schema import check_layout

    settings = _target_settings(ctx, kusto_cluster, kusto_database)
    try:
        if check_layout(KustoClientFactory.client(settings), settings.database).verdict == L.MIGRATE:
            click.echo("A migration upgrades this data and keeps the history: aictl db migrate --dry-run, then "
                       "aictl db migrate. A reset deletes it.")
        if not confirm_and_reset(settings, yes=yes):
            raise click.exceptions.Exit(1)
    except StoreError as exc:
        raise click.ClickException(str(exc)) from exc


# ─── config ──────────────────────────────────────────────────────────────────


@click.group()
def config():
    """Show or manage aictl configuration."""


@config.command()
def show():
    """Show current effective configuration."""
    click.echo(show_config())


@config.command()
def init():
    """Create default config.toml if it doesn't exist."""
    path = write_default_config()
    if path.is_file():
        click.echo(f"Config file: {path}")
    else:
        click.echo(f"Created: {path}")


@config.command()
def path():
    """Print config file path."""
    click.echo(config_path())


def _find_project_root() -> Path:
    """Find the aictl source root (directory containing pyproject.toml).

    When installed via pipx, __file__ points into site-packages, not the
    source tree.  Walk up from cwd first, then fall back to __file__.

    Supports both the src-layout (``<root>/src/aictl``) and the legacy
    flat layout (``<root>/aictl``).
    """
    for anchor in (Path.cwd(), Path(__file__).resolve()):
        p = anchor
        for _ in range(10):
            if (p / "pyproject.toml").is_file() and (
                (p / "aictl").is_dir() or (p / "src" / "aictl").is_dir()
            ):
                return p
            if p.parent == p:
                break
            p = p.parent
    return None


def _find_package_dir(root: Path) -> Path:
    """Return the ``aictl`` package directory under ``root``.

    Handles both the src-layout (``<root>/src/aictl``) and the legacy
    flat layout (``<root>/aictl``).
    """
    src_pkg = root / "src" / "aictl"
    if src_pkg.is_dir():
        return src_pkg
    return root / "aictl"


# On Windows, npm is a .cmd wrapper — subprocess needs shell=True to find it.
from ..platforms import IS_WINDOWS as _IS_WINDOWS


def _npm() -> str:
    """Path of npm. With shell=True a missing command is only a non-zero exit, so check first."""

    npm = shutil.which("npm")
    if not npm:
        raise FileNotFoundError("npm")
    return npm


@click.command("build-ui")
def build_ui():
    """Build the dashboard frontend (npm run build).

    Automates the process of installing dependencies, building the
    Vite/Preact frontend, and syncing assets to the Python package.
    """
    import subprocess

    root = _find_project_root()
    if root is None:
        raise click.ClickException("Cannot find aictl source tree. Run this from the project directory.")
    pkg_dir = _find_package_dir(root)
    ui_dir = pkg_dir / "dashboard" / "ui"
    dist_dir = pkg_dir / "dashboard" / "dist"

    if not ui_dir.is_dir():
        raise click.ClickException(f"UI source directory not found at {ui_dir}")

    click.echo(f"Building UI in {ui_dir}...")

    # 1. npm install
    click.echo("Running npm install...")
    try:
        subprocess.run([_npm(), "install"], cwd=ui_dir, check=True, shell=_IS_WINDOWS)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise click.ClickException(f"npm install failed. Make sure Node.js/npm is installed. ({exc})")

    # 2. npm run build
    click.echo("Running npm run build...")
    try:
        subprocess.run([_npm(), "run", "build"], cwd=ui_dir, check=True, shell=_IS_WINDOWS)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise click.ClickException(f"npm build failed ({exc})")

    # 3. Verify
    if not dist_dir.is_dir():
        raise click.ClickException(f"Build completed but {dist_dir} not found")

    click.secho("\nUI build successful!", fg="green", bold=True)
    click.echo(f"Assets located in: {dist_dir}")


def _is_index_url(value: str) -> bool:
    """True for a URL a package installer can use as its index."""
    from urllib.parse import urlsplit

    try:
        return urlsplit(value).scheme in ("http", "https", "file")
    except ValueError:
        return False


def _pip_configured_index() -> str | None:
    """The index pip is set up to use: ``PIP_INDEX_URL``, then pip's own config files."""
    import os
    import subprocess

    from_env = os.environ.get("PIP_INDEX_URL")
    if from_env:
        return from_env
    pip = shutil.which("pip3") or shutil.which("pip")
    if not pip:
        return None
    try:
        proc = subprocess.run([pip, "config", "list"], capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    # Lines look like: global.index-url='https://packages.example/simple'
    for line in str(proc.stdout or "").splitlines():
        key, _, value = line.partition("=")
        value = value.strip().strip("'\"")
        if key.strip().endswith(".index-url") and _is_index_url(value):
            return value
    return None


def _install_env(index_url: str | None) -> dict[str, str]:
    """Environment for the install, so packages come from the same place under pip and uv.

    pipx may create environments with uv, and uv ignores ``pip.ini`` and ``PIP_INDEX_URL``,
    so a machine set up only for pip would otherwise download from PyPI. The URL goes
    through the environment because it can hold credentials: it must not reach a command
    line or the batch file used on Windows.
    """
    import os

    env = {**os.environ, "UV_VENV_CLEAR": "1"}
    if index_url:
        env["PIP_INDEX_URL"] = index_url
        env["UV_DEFAULT_INDEX"] = index_url
        env.pop("UV_INDEX_URL", None)
    elif not (env.get("UV_DEFAULT_INDEX") or env.get("UV_INDEX_URL")):
        configured = _pip_configured_index()
        if configured:
            env["UV_DEFAULT_INDEX"] = configured
    return env


def _package_source(env: dict[str, str]) -> str:
    """Where the install gets Python packages. Only the host: the URL can hold credentials."""
    from urllib.parse import urlsplit

    url = env.get("UV_DEFAULT_INDEX") or env.get("UV_INDEX_URL")
    if not url:
        return "public PyPI, unless a uv.toml sets another index"
    try:
        return urlsplit(url).hostname or "a local index"
    except ValueError:
        return "a custom index"


def _ui_has_local_edits(root: Path, ui_dir: Path) -> bool:
    """Whether a build is needed: no built dashboard, or uncommitted changes to its source.

    The built dashboard is tracked in git, so a pull already brings the matching build.
    """
    import subprocess

    if not (ui_dir.parent / "dist" / "index.html").is_file():
        return True
    try:
        done = subprocess.run(
            ["git", "-C", str(root), "status", "--porcelain", "--", str(ui_dir)],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return done.returncode == 0 and bool(done.stdout.strip())


@click.command("reinstall")
@click.option("--skip-ui", is_flag=True, help="Never build the dashboard UI")
@click.option("--build-ui", "force_ui", is_flag=True, help="Build the dashboard UI even with no local UI changes")
@click.option(
    "--index-url",
    envvar="AICTL_INDEX_URL",
    default=None,
    help="Install Python packages only from this index (http, https or file URL). Also skips the npm UI build.",
)
def reinstall(skip_ui, force_ui, index_url):
    """Rebuild and reinstall aictl so code changes take effect.

    \b
    This runs:
      1. npm install + build (dashboard UI)    — only with local UI changes or --build-ui
      2. pipx install --force -e ".[all]"      — reinstalls the CLI

    Use this after pulling changes or editing source code. Without it,
    the installed 'aictl' command runs stale copies from site-packages.
    """
    import subprocess

    if index_url and not _is_index_url(index_url):
        raise click.BadParameter("must be an http, https or file URL", param_hint="--index-url")

    root = _find_project_root()
    if root is None:
        raise click.ClickException("Cannot find aictl source tree. Run this from the project directory.")
    ui_dir = _find_package_dir(root) / "dashboard" / "ui"

    # ── Step 1: UI build ────────────────────────────────────────────────────
    if skip_ui:
        click.echo("⏭  Skipping UI build (--skip-ui)")
    elif index_url and not force_ui:
        # npm does not read the Python index: it uses its own registry settings.
        click.echo(
            "⏭  Skipping UI build, which would use npm's registry. The dashboard from git stays in place."
            " Add --build-ui to build it with npm's own settings."
        )
    elif not ui_dir.is_dir():
        click.echo("⏭  UI source not found, skipping")
    elif not force_ui and not _ui_has_local_edits(root, ui_dir):
        click.echo("⏭  No local UI changes. The dashboard from git stays in place.")
    else:
        click.echo("→ Building dashboard UI...")
        try:
            if not (ui_dir / "node_modules").is_dir():
                subprocess.run([_npm(), "install"], cwd=ui_dir, check=True, capture_output=True, shell=_IS_WINDOWS)
            subprocess.run([_npm(), "run", "build"], cwd=ui_dir, check=True, capture_output=True, shell=_IS_WINDOWS)
            click.secho("  ✅ UI built", fg="green")
        except FileNotFoundError:
            click.secho("  ⚠ npm not found — skipping UI build", fg="yellow")
        except subprocess.CalledProcessError as exc:
            click.secho(f"  ⚠ UI build failed: {exc}", fg="yellow")

    # ── Step 2: Python reinstall ────────────────────────────────────────────
    pipx = shutil.which("pipx")
    if pipx:
        install_cmd = [pipx, "install", "--force", "-e", f"{root}[all]"]
        installer_label = "pipx (--force --editable)"
    else:
        pip = shutil.which("pip3") or shutil.which("pip")
        if not pip:
            raise click.ClickException("Neither pipx nor pip found on PATH")
        install_cmd = [pip, "install", "-e", f"{root}[all]"]
        installer_label = "pip (editable)"

    install_env = _install_env(index_url)
    click.echo(f"→ Python packages: {_package_source(install_env)}")

    if _IS_WINDOWS:
        # On Windows the running `aictl.exe` console-script holds its own image
        # locked, so an in-process pip/pipx reinstall fails with WinError 32 and
        # leaves the environment half-uninstalled. Hand the install off to a new
        # console that waits for THIS process to exit before replacing the exe.
        _reinstall_detached_windows(install_cmd, root, install_env)
        return

    try:
        from ..platforms import load_config
        from .daemon import _stop_daemon

        cfg = load_config()
        _stop_daemon(cfg.effective_pid_file(), cfg.serve_port)
    except Exception as exc:  # noqa: BLE001 - best-effort daemon stop before replacing the environment
        click.echo(f"  (could not stop running daemon before reinstall: {exc})", err=True)

    click.echo(f"→ Reinstalling via {installer_label} from {root}...")
    try:
        subprocess.run(install_cmd, check=True, env=install_env)
        click.secho("✅ aictl reinstalled", fg="green", bold=True)
    except subprocess.CalledProcessError as exc:
        raise click.ClickException(f"reinstall failed: {exc}")

    click.echo("\nRun 'aictl --version' to verify.")


def _pipx_venv_dir() -> Path:
    """Directory of aictl's pipx venv on Windows.

    ``PIPX_HOME`` wins, then the venv this process runs from. Otherwise the pipx
    defaults: ``~/pipx``, or ``~/.local/pipx`` for installs made by older pipx.
    """
    import os
    import sys

    pipx_home = os.environ.get("PIPX_HOME")
    if pipx_home:
        return Path(pipx_home) / "venvs" / "aictl"
    if sys.prefix != sys.base_prefix and Path(sys.prefix).parent.name == "venvs":
        return Path(sys.prefix)
    legacy = Path.home() / ".local" / "pipx" / "venvs" / "aictl"
    return legacy if legacy.is_dir() else Path.home() / "pipx" / "venvs" / "aictl"


_REINSTALL_ATTEMPTS = 5


def _batch_quote(arg: str) -> str:
    """Quote one argument for a batch file line; ``%`` is special even inside quotes."""
    return '"' + arg.replace("%", "%%") + '"'


def _reinstall_detached_windows(install_cmd: list[str], root: Path, env: dict[str, str] | None = None) -> None:
    """Relaunch the Python reinstall in a new console that waits for this
    process to exit first.

    The running ``aictl.exe`` cannot be overwritten while it is in use, so we
    write a small batch script that pauses until this process releases its
    image lock, runs the install, then keeps the window open so the user can
    read the result. This process then exits immediately.
    """
    import os
    import subprocess
    import tempfile

    quoted = " ".join(_batch_quote(arg) for arg in install_cmd)

    # Locate the pipx venv so we can evict any process (running `aictl serve`
    # daemon, a stray python.exe) that holds its directory locked — uv cannot
    # clear the venv while it is in use (Windows os error 32).
    venv_dir = str(_pipx_venv_dir()).replace("'", "''").replace("%", "%%")

    # Text that varies is read from the environment with !NAME!, which cmd expands after
    # parsing, so a path holding "&" prints as text instead of running as a command.
    base = dict(os.environ) if env is None else env
    env = {**base, "AICTL_REINSTALL_FROM": str(root), "AICTL_PACKAGE_SOURCE": _package_source(base)}
    # uv clears an existing environment only when told to, and pipx starts uv with that
    # environment as its working folder: Windows will not delete a process's working
    # folder, so the clear failed with os error 32. The script removes the old
    # environment itself, from outside it, and uv always starts on an empty folder.
    env.pop("UV_VENV_CLEAR", None)
    venv_path = _pipx_venv_dir()
    owned = venv_path.name == "aictl" and venv_path.parent.name == "venvs"
    if owned:
        env["AICTL_VENV"] = str(venv_path)
    remove_old = (
        (
            'if exist "!AICTL_VENV!\\" (\r\n'
            "  echo Removing the old aictl environment...\r\n"
            '  rmdir /s /q "!AICTL_VENV!" >nul 2>&1\r\n'
            ")\r\n"
            'if exist "!AICTL_VENV!\\" (\r\n'
            "  echo The old aictl environment is still in use, so it cannot be removed yet.\r\n"
            "  goto attempt_failed\r\n"
            ")\r\n"
        )
        if owned
        else ""
    )

    bat = (
        "@echo off\r\n"
        # The file is UTF-8, so a non-ASCII profile path survives.
        "chcp 65001 >nul\r\n"
        "setlocal enabledelayedexpansion\r\n"
        "title aictl reinstall\r\n"
        "echo aictl reinstall\r\n"
        "echo   From:            !AICTL_REINSTALL_FROM!\r\n"
        "echo   Python packages: !AICTL_PACKAGE_SOURCE!\r\n"
        f"echo   Attempts:        up to {_REINSTALL_ATTEMPTS}\r\n"
        "echo.\r\n"
        "echo The last message in this window gives the result.\r\n"
        "echo An error along the way is fine if a later attempt succeeds.\r\n"
        "echo.\r\n"
        "echo Waiting for aictl to exit...\r\n"
        "ping -n 3 127.0.0.1 >nul\r\n"
        # Kill any process whose image lives inside the pipx venv (the running
        # `aictl serve` dashboard/daemon keeps python.exe — and the venv dir —
        # locked, so uv's clear fails with os error 32). Best-effort. We use
        # PowerShell .Where()/member-enumeration (no pipe) because a piped
        # command inside a cmd `for /f` requires fragile caret escaping.
        "for /f \"tokens=1\" %%P in ('powershell -NoProfile -Command "
        f"\"(Get-CimInstance Win32_Process).Where({{ $_.ExecutablePath -like '{venv_dir}\\*' -or $_.CommandLine -like '*{venv_dir}\\*' -or $_.CommandLine -like '*aictl*serve*' }}).ProcessId\"') do (\r\n"
        "  echo Stopping process %%P, which runs from the aictl environment...\r\n"
        "  taskkill /PID %%P /T /F >nul 2>&1\r\n"
        ")\r\n"
        # Not inside the environment: a process's working folder cannot be deleted.
        'cd /d "!AICTL_REINSTALL_FROM!"\r\n'
        "set UV_VENV_CLEAR=\r\n"
        # Retry a few times: the directory lock is transient and clears once the
        # evicted process fully releases its handles.
        "set ATTEMPT=0\r\n"
        ":retry\r\n"
        "set /a ATTEMPT+=1\r\n"
        f"title aictl reinstall - attempt !ATTEMPT! of {_REINSTALL_ATTEMPTS}\r\n"
        "echo.\r\n"
        f"echo --- Attempt !ATTEMPT! of {_REINSTALL_ATTEMPTS} ---\r\n"
        f"{remove_old}"
        f"{quoted}\r\n"
        "if not errorlevel 1 goto success\r\n"
        ":attempt_failed\r\n"
        f"if !ATTEMPT! geq {_REINSTALL_ATTEMPTS} goto failed\r\n"
        "echo.\r\n"
        f"echo Attempt !ATTEMPT! of {_REINSTALL_ATTEMPTS} did not finish. The aictl folder may still be in use.\r\n"
        "echo This usually clears within seconds. Trying again. You do not need to do anything.\r\n"
        "ping -n 4 127.0.0.1 >nul\r\n"
        "goto retry\r\n"
        ":failed\r\n"
        "title aictl reinstall - FAILED\r\n"
        "echo.\r\n"
        "echo ============================================================\r\n"
        f"echo FAILED: aictl was not reinstalled after {_REINSTALL_ATTEMPTS} attempts.\r\n"
        "echo The last error is above. aictl may not start until it is installed again.\r\n"
        "echo To install it again, see Troubleshooting in README.md.\r\n"
        "echo ============================================================\r\n"
        "goto done\r\n"
        ":success\r\n"
        "title aictl reinstall - done\r\n"
        "echo.\r\n"
        "echo ============================================================\r\n"
        "echo DONE: aictl is reinstalled. Check it with: aictl --version\r\n"
        "echo ============================================================\r\n"
        ":done\r\n"
        "echo.\r\n"
        "echo Press any key to close this window.\r\n"
        "pause >nul\r\n"
    )

    fd, bat_path = tempfile.mkstemp(suffix=".bat", prefix="aictl-reinstall-")
    # Binary: the script already has CRLF endings, and text mode would turn them into CR CR LF.
    with os.fdopen(fd, "wb") as fh:
        fh.write(bat.encode("utf-8"))

    CREATE_NEW_CONSOLE = 0x00000010
    subprocess.Popen(
        ["cmd", "/c", bat_path],
        creationflags=CREATE_NEW_CONSOLE,
        close_fds=True,
        env=env,
    )
    click.secho("→ The install continues in a new window.", fg="green", bold=True)
    click.echo("  Its last message gives the result.")
    # Exit hard so aictl.exe releases its image lock immediately.
    os._exit(0)


# ─── catalog ─────────────────────────────────────────────────────────────────


@click.group(invoke_without_command=True)
@click.option("-o", "--output", "out_path", default=None, type=click.Path(), help="Output file path (default: stdout)")
@click.option(
    "--format", "fmt", default="md", type=click.Choice(["md", "json"]), help="Output format: md (table) or json"
)
@click.option("--tab", default=None, help="Filter by tab name")
@click.option(
    "--source-type", default=None, type=click.Choice(["raw", "deduced", "aggregated"]), help="Filter by source type"
)
@click.option("--db", "db_path", default=None, type=click.Path(), help="Path to SQLite history database")
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
    ctx.ensure_object(CliContext)
    ctx.obj.db_path = db_path
    if ctx.invoked_subcommand is not None:
        return

    entries = _read_catalog(_admin_settings(ctx), tab=tab, source_type=source_type)

    if not entries:
        raise click.ClickException("No catalog entries found. Run 'aictl catalog sync' to seed the DB.")

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
    """Send changed catalog definitions to the configured store."""
    click.echo(f"Synced {_sync_catalog(_admin_settings(ctx))} changed catalog entries")


def _read_catalog(settings, **filters):
    from ..dashboard.projections.metrics import catalog_entries
    from ..stores import open_store

    try:
        return catalog_entries(open_store("kusto", settings=settings, read_only=True).reader, **filters)
    except StoreError as exc:
        raise click.ClickException(str(exc)) from exc


def _sync_catalog(settings) -> int:
    from ..collection_status import DatapointCatalog
    from ..state_file import StateFile, restart_directory, sync_data_epoch
    from ..stores import open_store

    store = open_store("kusto", settings=settings)
    writer = store.writer
    layout = store.layout or {}
    directory = sync_data_epoch(restart_directory(settings.cluster, settings.database, settings.node_id),
                                layout.get("data_epoch"), kept_data=bool(layout.get("epoch_kept_data")))
    try:
        state = StateFile(directory / "datapoint_catalog.json")
        catalog = DatapointCatalog(writer, state)
        catalog.state = None
        count = catalog.sync()
        writer.flush()
        if errors := [t["last_error"] for t in writer.health()["tables"].values() if t["last_error"]]:
            raise click.ClickException("; ".join(errors))
        if catalog.changed:
            state.replace(catalog.rows)
        return count
    finally:
        writer.close()


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
    entries = _read_catalog(_admin_settings(ctx))

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
        with open(yaml_path, encoding="utf-8") as f:
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
        with open(q_path, encoding="utf-8") as f:
            yaml_queries = yaml.safe_load(f) or {}
        missing_queries = yaml_keys - set(yaml_queries.keys())
        if missing_queries:
            issues.append(f"In catalog YAML but no query: {sorted(missing_queries)}")

    # Report
    by_type = Counter(e["source_type"] for e in entries)
    dynamic = sum(1 for e in entries if e.get("dynamic_source"))
    click.echo(f"Catalog: {len(entries)} entries")
    click.echo(
        f"  Raw: {by_type.get('raw', 0)} | "
        f"Deduced: {by_type.get('deduced', 0)} | "
        f"Aggregated: {by_type.get('aggregated', 0)}"
    )
    click.echo(f"  Dynamic: {dynamic} | Static: {len(entries) - dynamic}")

    if issues:
        click.echo(f"\n{len(issues)} issue(s) found:")
        for issue in issues:
            click.echo(f"  - {issue}")
        if fix:
            click.echo("\nRe-syncing from YAML...")
            count = _sync_catalog(_admin_settings(ctx))
            click.echo(f"Synced {count} entries. Re-run validate to check.")
        else:
            click.echo("\nRun with --fix to auto-sync from YAML files.")
        raise SystemExit(1)
    else:
        click.echo("\nAll checks passed.")


def _render_markdown(entries: list[dict]) -> str:
    """Render catalog entries as a markdown table grouped by tab."""

    def esc(s: str) -> str:
        return " ".join(s.strip().split()).replace("|", "\\|")

    type_counts = Counter(e["source_type"] for e in entries)
    tabs: dict[str, list[dict]] = {}
    for e in entries:
        tabs.setdefault(e["tab"], []).append(e)

    lines: list[str] = []
    lines.append("# aictl Dashboard Datapoint Catalog")
    lines.append("")
    lines.append(f"> **{len(entries)}** datapoints across **{len(tabs)}** tabs.")
    lines.append(
        f"> Raw: {type_counts.get('raw', 0)}"
        f" | Deduced: {type_counts.get('deduced', 0)}"
        f" | Aggregated: {type_counts.get('aggregated', 0)}"
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
    lines.append("- **RAW**: Direct reading from a DB table or config lookup")
    lines.append("- **DEDUCED**: Requires calculation over queried data")
    lines.append("- **AGGREGATED**: SUM/COUNT/GROUP BY over queried rows")
    lines.append("- **\\***: Dynamic \u2014 live provenance JSON updated each cycle (`GET /api/datapoints?key=<key>`)")
    lines.append("- `?param?` in queries: bind parameter (tool name, PID, timestamp, session ID)")
    lines.append("")

    return "\n".join(lines)
