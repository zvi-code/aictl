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
# The runner prepends ``let report_days = N;`` to every query; 0 means all data.
DAYS_PARAMETER = "report_days"
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


def parameterized(kql: str, days: int | None) -> str:
    return f"let {DAYS_PARAMETER} = {int(days or 0)};\n{kql}"


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


def run_section(client: Any, database: str, section: Section, days: int | None) -> SectionResult:
    """Run one section's query; a failure becomes the result's error text."""
    from azure.kusto.data import ClientRequestProperties

    from ..connection import _server_message, _throttled

    kql = read_query(section)
    result = SectionResult(section.name, kql)
    props = ClientRequestProperties()
    props.set_option(ClientRequestProperties.request_timeout_option_name, REPORT_TIMEOUT)
    started = time.perf_counter()
    try:
        response = _execute(client, database, parameterized(kql, days), props, _throttled)
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
) -> list[SectionResult]:
    """Run every section against *settings*' store, one after another."""
    from ..connection import KustoClientFactory

    client = KustoClientFactory.client(settings)
    results = []
    for section in SECTIONS if sections is None else sections:
        result = run_section(client, settings.database, section, days)
        results.append(result)
        if on_result is not None:
            on_result(result)
    return results


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
) -> str:
    """The HTML page for *results*; every header fact comes from the arguments."""
    host = cluster.split("://", 1)[-1].split("/", 1)[0]
    generated = (generated or datetime.now(timezone.utc)).astimezone(timezone.utc)
    report = {
        "cluster": host,
        "database": database,
        "generated": generated.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "days": days,
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
    return read_template().replace(DATA_MARKER, "const REPORT=" + _script_json(report) + ";")
