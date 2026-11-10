"""A self-contained HTML report of what the Kusto store knows about coding agents.

``aictl db report`` runs one KQL file per section against the configured store and
writes one HTML page. A section is a name, a query file in ``queries/`` and a part of
``template.html`` keyed by the same name: its markup in ``<template data-section=NAME>``
and its draw function in ``RENDER.NAME``. To add a section, drop ``queries/NAME.kql``,
add the markup and the function to the template and one line to :data:`SECTIONS`.

A query that fails gives a section that shows the server's error text; a query with
no rows gives a section that says so. The rest of the page renders either way.
"""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from importlib import resources
from typing import Any

from .. import KustoSettings

# One query may scan the whole history of a large store.
REPORT_TIMEOUT = timedelta(seconds=300)
# The runner puts ``let report_days = N;`` (0 means all data) and the two sources of
# :func:`filter_prelude` in front of every query. No query reads a store table itself.
DAYS_PARAMETER = "report_days"
REQUESTS_SOURCE = "report_requests"
TOOL_CALLS_SOURCE = "report_tool_calls"
DATA_MARKER = "/*__DATA__*/"


@dataclass(frozen=True)
class Section:
    name: str
    query: str  # file name inside queries/
    prelude: str = ""  # a shared file inside queries/ that goes in front of the query


# The order here is the order on the page.
SECTIONS: tuple[Section, ...] = (
    Section("dna", "dna.kql"),
    Section("relay", "relay.kql"),
    Section("cost", "cost.kql"),
    Section("slow", "slow.kql"),
    Section("context", "context.kql"),
    Section("returns", "returns.kql", "_events.kql"),
    Section("stuck", "stuck.kql", "_events.kql"),
    Section("models", "models.kql", "_events.kql"),
    Section("skills", "skills.kql", "_events.kql"),
    Section("mcp", "mcp.kql", "_events.kql"),
)


@dataclass
class SectionResult:
    name: str
    kql: str
    seconds: float = 0.0
    tables: list[list[dict[str, Any]]] = field(default_factory=list)
    error: str | None = None

    @property
    def empty(self) -> bool:
        return self.error is None and not any(self.tables)


def read_query(section: Section) -> str:
    queries = resources.files(__package__) / "queries"
    names = (section.prelude, section.query) if section.prelude else (section.query,)
    return "".join((queries / name).read_text(encoding="utf-8") for name in names)


def read_template() -> str:
    return (resources.files(__package__) / "template.html").read_text(encoding="utf-8")


_UUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


def _jsonable(value: Any) -> Any:
    """A cell as JSON holds it: datetimes in UTC to the second, UUIDs cut to 8 characters."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, float) and value != value:
        return None
    if isinstance(value, str) and _UUID.match(value):
        return value[:8]
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


@dataclass(frozen=True)
class ReportFilter:
    """Which rows a report reads. An empty field does not filter; values of one field are alternatives.

    ``start``, ``end``, ``projects``, ``tools`` and ``models`` choose rows. ``mcps``, ``skills``
    and ``agents`` choose sessions: every row of a session in which one of them was used
    inside the time range. Use is read from the tool calls, as the sections read it.
    """

    start: datetime | None = None
    end: datetime | None = None  # rows before this time
    projects: tuple[str, ...] = ()  # the folder name of the project, or its full path
    tools: tuple[str, ...] = ()
    models: tuple[str, ...] = ()
    mcps: tuple[str, ...] = ()  # MCP server names
    skills: tuple[str, ...] = ()
    agents: tuple[str, ...] = ()  # agent types

    def describe(self) -> list[list[str]]:
        """The active fields as (label, value) pairs for the page header and the command output."""
        stamp = "%Y-%m-%d %H:%M UTC"
        pairs = [
            ("from", self.start.astimezone(timezone.utc).strftime(stamp) if self.start else ""),
            ("before", self.end.astimezone(timezone.utc).strftime(stamp) if self.end else ""),
            ("project", ", ".join(self.projects)),
            ("tool", ", ".join(self.tools)),
            ("model", ", ".join(self.models)),
            ("sessions that used the MCP server", ", ".join(self.mcps)),
            ("sessions that used the skill", ", ".join(self.skills)),
            ("sessions that used the agent", ", ".join(self.agents)),
        ]
        return [[label, value] for label, value in pairs if value]


def _strings(values: tuple[str, ...]) -> str:
    """*values* as KQL string literals. A JSON string is a KQL string, and a line break cannot end it."""
    for value in values:
        if any(ord(ch) < 32 for ch in value):
            raise ValueError(f"A filter value holds a control character: {value!r}")
    return ", ".join(json.dumps(v, ensure_ascii=False) for v in values)


def _current(table: str) -> str:
    return f"{table} | summarize arg_max(_v, *) by id | where _deleted == false"


def filter_prelude(days: int | None, only: ReportFilter | None = None) -> str:
    """The ``let`` statements in front of every query: the window and the two sources the queries read.

    ``report_requests`` and ``report_tool_calls`` are the current rows of ``requests`` and
    ``tool_invocations`` that pass *only*. A part of the filter that is not set adds no KQL.
    """
    f = only or ReportFilter()
    since = (
        repr(f.start.timestamp())
        if f.start
        else f"iff({DAYS_PARAMETER} > 0, (now() - unixtime_seconds_todatetime(0)) / 1s - 86400.0 * {DAYS_PARAMETER}, 0.0)"
    )
    rows = ["ts >= report_since"]
    if f.end:
        rows.append(f"ts < {f.end.timestamp()!r}")
    if f.tools:
        rows.append(f"tool in~ ({_strings(f.tools)})")
    if f.projects:
        names = _strings(f.projects)
        rows.append(
            f'(tostring(split(replace_string(project_path, "\\\\", "/"), "/")[-1]) in~ ({names}) or project_path in~ ({names}))'
        )
    where = " and ".join(rows)
    out = [
        f"let {DAYS_PARAMETER} = {int(days or 0)};",
        f"let report_since = {since};",
        f"let report_request_rows = {_current('requests')} and {where};",
        f"let report_tool_rows = {_current('tool_invocations')} and {where};",
    ]
    sessions = []
    if f.mcps:
        sessions.append("report_mcp_sessions")
        out.append(
            'let report_mcp_sessions = report_tool_rows | extend report_norm = replace_string(tool_name, "__", ":")'
            f' | where report_norm startswith "mcp:" and tostring(split(report_norm, ":")[1]) in~ ({_strings(f.mcps)})'
            " | distinct session_id;"
        )
    if f.skills:
        names = _strings(f.skills)
        sessions.append("report_skill_sessions")
        out.append(
            f'let report_skill_sessions = report_tool_rows | where tolower(tool_name) == "skill" and target in~ ({names})'
            " | distinct session_id;"
        )
    if f.agents:
        names = _strings(f.agents)
        sessions.append("report_agent_sessions")
        out.append(
            'let report_agent_sessions = report_tool_rows | where tool_name in ("Agent", "Task", "task")'
            " | extend report_input = parse_json(input)"
            f" | where coalesce(tostring(report_input.subagent_type), tostring(report_input.agent_type)) in~ ({names})"
            " | distinct session_id;"
        )
    chosen = "".join(f" | where session_id in ({name})" for name in sessions)
    if not f.models:
        out.append(f"let {REQUESTS_SOURCE} = report_request_rows{chosen};")
        out.append(f"let {TOOL_CALLS_SOURCE} = report_tool_rows{chosen};")
        return "\n".join(out) + "\n"
    # A tool call row holds no model. It belongs to the latest request before it in its
    # context (a session plus one agent), so it passes when that request's model passes.
    models = _strings(f.models)
    out += [
        f"let {REQUESTS_SOURCE} = report_request_rows{chosen} | where model in~ ({models});",
        'let report_line = union (report_request_rows | project report_stream = strcat(session_id, "|", agent_id), ts,'
        ' report_is_request = 1, report_model = model), (report_tool_rows | project report_stream = strcat(session_id, "|", agent_id),'
        " ts, report_is_request = 0, report_call = id)"
        " | order by report_stream asc, ts asc, report_is_request desc"
        " | extend report_seq = row_cumsum(report_is_request, report_stream != prev(report_stream));",
        "let report_model_calls = report_line | where report_is_request == 0 | project report_stream, report_seq, report_call"
        " | join kind = inner (report_line | where report_is_request == 1 | project report_stream, report_seq, report_model)"
        f" on report_stream, report_seq | where report_model in~ ({models}) | project report_call;",
        f"let {TOOL_CALLS_SOURCE} = report_tool_rows{chosen}"
        " | join kind = inner report_model_calls on $left.id == $right.report_call | project-away report_call;",
    ]
    return "\n".join(out) + "\n"


def parameterized(kql: str, days: int | None, only: ReportFilter | None = None) -> str:
    return filter_prelude(days, only) + kql


# A missing table or a syntax error is permanent and goes straight to the section; only throttling is waited out.
THROTTLE_DELAYS_S = (1.0, 2.0, 4.0, 8.0)


def _execute(client: Any, database: str, kql: str, props: Any, throttled: Callable[[BaseException], bool]) -> Any:
    for delay in THROTTLE_DELAYS_S:
        try:
            return client.execute(database, kql, props)
        except Exception as exc:  # noqa: BLE001 - only throttling is repeated
            if not throttled(exc):
                raise
            time.sleep(delay)
    return client.execute(database, kql, props)


def run_section(
    client: Any, database: str, section: Section, days: int | None, only: ReportFilter | None = None
) -> SectionResult:
    """Run one section's query; a failure becomes the result's error text. The result holds the KQL as it ran."""
    from azure.kusto.data import ClientRequestProperties

    from ..connection import _server_message, _throttled

    kql = parameterized(read_query(section), days, only)
    result = SectionResult(section.name, kql)
    props = ClientRequestProperties()
    props.set_option(ClientRequestProperties.request_timeout_option_name, REPORT_TIMEOUT)
    started = time.perf_counter()
    try:
        response = _execute(client, database, kql, props, _throttled)
        for table in response.primary_results:
            names = [c.column_name for c in table.columns]
            result.tables.append([{n: _jsonable(v) for n, v in zip(names, row, strict=False)} for row in table])
    except Exception as exc:  # noqa: BLE001 - every SDK and transport failure is shown in the section
        result.tables = []
        result.error = _server_message(exc).strip() or type(exc).__name__
    result.seconds = time.perf_counter() - started
    return result


def run_report(
    settings: KustoSettings,
    days: int | None = None,
    sections: tuple[Section, ...] | None = None,
    on_result: Callable[[SectionResult], None] | None = None,
    only: ReportFilter | None = None,
) -> list[SectionResult]:
    """Run every section against *settings*' store, one after another."""
    from ..connection import KustoClientFactory

    client = KustoClientFactory.client(settings)
    results = []
    for section in SECTIONS if sections is None else sections:
        result = run_section(client, settings.database, section, days, only)
        results.append(result)
        if on_result is not None:
            on_result(result)
    return results


# Not a section of the page: the values a filter can name, with the sessions behind each.
VALUES = Section("values", "_values.kql")


def run_values(settings: KustoSettings, days: int | None = None, only: ReportFilter | None = None) -> SectionResult:
    """What the store holds inside the window and *only*: every tool, model, project, MCP server, skill and agent."""
    from ..connection import KustoClientFactory

    return run_section(KustoClientFactory.client(settings), settings.database, VALUES, days, only)


def _script_json(data: Any) -> str:
    # ASCII-only JSON cannot hold a raw line separator; "<" is escaped so no cell closes the script.
    return json.dumps(data, separators=(",", ":")).replace("<", "\\u003c")


def build_page(
    results: list[SectionResult],
    *,
    cluster: str,
    database: str,
    days: int | None,
    generated: datetime | None = None,
    only: ReportFilter | None = None,
) -> str:
    """The HTML page for *results*; every header fact comes from the arguments."""
    report = report_data(results, cluster=cluster, database=database, days=days, generated=generated, only=only)
    return read_template().replace(DATA_MARKER, "const REPORT=" + _script_json(report) + ";")


def report_data(
    results: list[SectionResult],
    *,
    cluster: str,
    database: str,
    days: int | None,
    generated: datetime | None = None,
    only: ReportFilter | None = None,
) -> dict[str, Any]:
    """What the page draws from, as plain data: the header facts, and per section the KQL as it ran and its rows."""
    host = cluster.split("://", 1)[-1].split("/", 1)[0]
    generated = (generated or datetime.now(timezone.utc)).astimezone(timezone.utc)
    return {
        "cluster": host,
        "database": database,
        "generated": generated.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "days": days,
        "filter": (only or ReportFilter()).describe(),
        "sections": [
            {
                "name": r.name,
                "seconds": round(r.seconds, 2),
                "error": r.error,
                "tables": r.tables,
                "kql": r.kql,
            }
            for r in results
        ],
    }
