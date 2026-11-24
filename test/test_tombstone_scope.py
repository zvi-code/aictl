"""A tombstone must reach every view that reads its table.

A view reads the current row as ``summarize arg_max(_v, *) by <key>`` and drops it when
``_deleted`` is set. A ``where`` before that reduction also applies to the tombstone: on a
column the tombstone does not carry, it drops the tombstone and the deleted row shows again.
The columns a tombstone carries besides the key are declared once, as the table's
``tombstone_scope``; the writers refuse a delete without them.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from kusto_replay import Facts

from aictl.records import RequestRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.base import InvalidRowError
from aictl.stores.kusto.current import CURRENT_TABLES, HOUR, logical
from aictl.stores.kusto.schema import LEGACY_COLUMNS
from aictl.stores.kusto.tables import TABLES
from aictl.stores.kusto.writer import KustoWriter
from aictl.stores.testing import MemoryWriter

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
_STRING = re.compile(r"@?'(?:[^'\\\n]|\\.)*'|@?\"(?:[^\"\\\n]|\\.)*\"")
_NAME = re.compile(r"[A-Za-z_]\w*")
_OPERATORS = {
    "and",
    "or",
    "not",
    "in",
    "has",
    "contains",
    "between",
    "startswith",
    "endswith",
    "has_any",
    "has_all",
    "matches",
    "regex",
    "like",
    "true",
    "false",
    "null",
    "contains_cs",
    "startswith_cs",
    "endswith_cs",
    "has_cs",
    "notcontains",
    "hasprefix",
    "hassuffix",
    "datetime",
    "timespan",
    "long",
    "int",
    "real",
    "string",
    "bool",
    "dynamic",
}


def _code(text: str) -> str:
    """KQL without comments and string contents; ``['name']`` becomes ``name``."""
    text = re.sub(r"\[\s*'([A-Za-z_]\w*)'\s*\]", r"\1", text)
    text = _STRING.sub("''", text)
    return re.sub(r"//[^\n]*", "", text)


def _split(text: str, sep: str) -> list[str]:
    parts, depth, current = [], 0, ""
    for ch in text:
        depth += ch in "([{"
        depth -= ch in ")]}"
        if ch == sep and depth == 0:
            parts.append(current)
            current = ""
        else:
            current += ch
    return [*parts, current]


def _pipeline(code: str, start: int) -> list[str]:
    """The operators after a table name, up to the end of its statement or bracket."""
    depth, end = 0, start
    while end < len(code):
        ch = code[end]
        depth += ch in "([{"
        depth -= ch in ")]}"
        if depth < 0 or (depth == 0 and ch == ";"):
            break
        end += 1
    return [part.strip() for part in _split(code[start:end], "|")[1:]]


def filtered_before_dedup(text: str) -> list[tuple[str, str]]:
    """(table, column) for each column of a tombstone-bearing table that a ``where`` reads before
    the pipeline reduces versions. A ``let`` name bound to such a pipeline is followed as the table."""
    code = _code(text)
    declared = re.search(r"declare query_parameters\((.*?)\);", code, re.S)
    names = set(re.findall(r"(\w+)\s*:", declared.group(1))) if declared else set()
    # A source is a table or a let bound to an unreduced pipeline of one, with the columns it extended.
    sources: dict[str, tuple[str, dict[str, set[str]]]] = {
        name: (name, {}) for name, table in TABLES.items() if table.tombstone
    }
    # A current view holds a row per key and hour, tombstones included: the same rule applies before
    # its versions are reduced again (its hour, event_hour, is a key column there).
    sources.update({logical(name): (name, {}) for name in CURRENT_TABLES if TABLES[name].tombstone})
    found: set[tuple[str, str]] = set()
    seen: set[str] = set()
    while pending := [name for name in sources if name not in seen]:
        for source in pending:
            seen.add(source)
            name, inherited = sources[source]
            table = TABLES[name]
            columns = dict(table.columns).keys() - {*table.key, "node_id", "project", table.version}
            for match in re.finditer(rf"(?<![\w.]){source}(?!\w)", code):
                before = code[: match.start()].rstrip()
                if not code[match.end() :].lstrip().startswith("|") or not (
                    not before or before[-1] in "(=,;" or re.search(r"\bunion$", before)
                ):
                    continue
                derived = dict(inherited)
                filtered: set[str] = set()
                reduced = False
                for step in _pipeline(code, match.end()):
                    operator, _, body = step.partition(" ")
                    if operator == "summarize":
                        reduced = True
                        break
                    if operator == "distinct" and {
                        column for word in _NAME.findall(body) for column in derived.get(word, {word})
                    } & columns <= {"id"}:
                        # Keys selected first and joined back to every version: the filters only pick keys.
                        reduced, filtered = True, set()
                        break
                    if operator == "extend":
                        for item in _split(body, ","):
                            target, eq, expr = item.partition("=")
                            if eq:
                                derived[target.strip()] = set(_NAME.findall(expr))
                    if operator == "where":
                        for ident in _NAME.finditer(body):
                            word = ident.group(0)
                            if word in _OPERATORS or word in names or body[ident.end() :].lstrip().startswith("("):
                                continue
                            filtered |= derived.get(word, {word}) & columns
                found |= {(name, column) for column in filtered}
                bound = re.search(r"\blet\s+(\w+)\s*=\s*(?:materialize\(\s*)?$", before)
                if bound and not reduced:
                    sources.setdefault(bound.group(1), (name, derived))
    return sorted(found)


def carried(name: str) -> set[str]:
    """What every tombstone of *name* holds besides its key: the declared scope and what the writer sets."""
    table = TABLES[name]
    # Not the tombstone column itself: a filter on it before the reduction drops every tombstone.
    owned = {table.version, *(("id", "rowid") if name in LEGACY_COLUMNS else ())}
    return {*table.key, *table.tombstone_scope, *owned}


def _violations(text: str) -> list[tuple[str, str]]:
    return [(name, column) for name, column in filtered_before_dedup(text) if column not in carried(name)]


@pytest.mark.parametrize("path", sorted(QUERIES.glob("*.kql")), ids=lambda path: path.name)
def test_views_filter_tombstone_tables_before_dedup_only_on_columns_a_tombstone_carries(path):
    assert _violations(path.read_text()) == [], (
        f"{path.name} filters before `summarize arg_max(_v, *)` on columns a tombstone does not carry. "
        "Reduce versions first, or add the column to the table's tombstone_scope (tables.py) and make "
        "every writer of a delete supply it."
    )


def test_the_check_sees_a_filter_before_dedup_and_ignores_one_after():
    # The defect this guards against, as requests.records had it with a key-only tombstone.
    before = """declare query_parameters(requested_session:string, since:real);
        let calls = materialize(requests
        | where session_id == requested_session and ts >= since and model == 'm'
        | extend fact_key=iff(isempty(dedup_key), tostring(id), dedup_key)
        | where isnotempty(fact_key)
        | summarize arg_max(_v, *) by ['project'], node_id, fact_key);
        calls | where finish_reason == 'stop'"""
    assert filtered_before_dedup(before) == [
        ("requests", "id"),
        ("requests", "model"),
        ("requests", "session_id"),
        ("requests", "ts"),
    ]
    assert _violations(before) == [("requests", "model")]
    after = "requests | summarize arg_max(_v, *) by ['project'], node_id, dedup_key | where model == 'm'"
    assert filtered_before_dedup(after) == []
    hidden = "sessions | where not(_deleted) | summarize arg_max(_v, *) by ['project'], node_id, session_id"
    assert _violations(hidden) == [("sessions", "_deleted")]
    # Keys selected by any version, then every version of those keys: the tombstone comes along.
    keys_first = """let versions = requests | extend fact_key=iff(isempty(dedup_key), tostring(id), dedup_key);
        let keys = versions | where model == 'm' | distinct ['project'], node_id, fact_key;
        versions | join kind=inner keys on ['project'], node_id, fact_key
        | summarize arg_max(_v, *) by ['project'], node_id, fact_key"""
    assert filtered_before_dedup(keys_first) == []
    # A let bound to an unreduced pipeline is the table itself.
    alias = "let v = tool_invocations | where node_id == 'n'; let k = v | where is_error == 1 | project dedup_key, _v;"
    assert filtered_before_dedup(alias) == [("tool_invocations", "is_error")]
    # The views the check knows this defect in today all still read through it.
    flagged = {path.name for path in QUERIES.glob("*.kql") if filtered_before_dedup(path.read_text())}
    assert {"requests.records.kql"} <= flagged


# The views that read a current view (stores/kusto/current.py) instead of reducing the whole table.
CONVERTED = tuple(sorted(CURRENT_TABLES))
# The views that read a converted table itself, and why.
READS_VERSIONS = {
    ("board.revision", "requests"): "counts the stored rows of every version: its change token",
    ("board.revision", "tool_invocations"): "counts the stored rows of every version: its change token",
    ("board.revision", "session_prompts"): "counts the stored rows of every version: its change token",
    ("board.revision", "skill_uses"): "counts the stored rows of every version: its change token",
    ("board.revision", "file_write_events"): "counts the stored rows of every version: its change token",
    ("health.totals", "requests"): "counts the stored rows of each table, every version: the store's size",
    ("health.totals", "tool_invocations"): "counts the stored rows of each table, every version: the store's size",
    ("health.totals", "session_prompts"): "counts the stored rows of each table, every version: the store's size",
    ("health.totals", "skill_uses"): "counts the stored rows of each table, every version: the store's size",
    ("health.totals", "file_write_events"): "counts the stored rows of each table, every version: the store's size",
}


def current_view_problems(text: str) -> list[str]:
    """What a view that reads a current view gets wrong.

    A current view has a row per key and hour of the key's time; a key whose time crossed an hour
    has a row in each. A view reads it in one shape only: the rows it wants (only ``where``, an hour
    range only with the margin either side), the keys among them with more than one row, and those
    keys reduced again to their newest version by the table's key; tombstones are dropped after that.

        let current_rows = requests_current | where ...;
        let crossed = current_rows | summarize copies=count() by dedup_key | where copies > 1 | project dedup_key;
        union (current_rows | where dedup_key !in (crossed)),
            (current_rows | where dedup_key in (crossed) | summarize arg_max(_v, *) by <key>)
        | where not(coalesce(_deleted, false))
    """
    code = re.sub(r"\s+", " ", _code(text))
    problems = []
    for name in CURRENT_TABLES:
        view, key = logical(name), ", ".join(TABLES[name].key)
        for match in re.finditer(rf"(?<![\w.]){view}(?!\w)", code):
            bound = re.search(r"\blet (\w+) = $", code[: match.start()])
            if bound is None:
                problems.append(f"{view} is read outside `let <rows> = {view} | where ...`")
                continue
            rows = bound.group(1)
            steps = _pipeline(code, match.end())
            if not all(step.startswith("where ") for step in steps):
                problems.append(f"{view}: only `where` may come before the rows of a key are reduced")
            for step in steps:
                if "_deleted" in step:
                    problems.append(f"{view}: tombstones are dropped before the reduction")
                if HOUR in step and not ("- 1h" in step or "+ 1h" in step):
                    problems.append(f"{view}: {HOUR} is read without the one-hour margin: {step}")
            table = TABLES[name]
            rest = [column for column in table.key if column not in ("project", "node_id")]
            dropped = r" \| where not\(coalesce\(_deleted, false\)\)" if table.tombstone else ""
            if len(rest) == 1:
                # One key column: only the keys with two rows (a time that crossed an hour) are reduced again.
                k = rest[0]
                crossed = re.search(
                    rf"\blet (\w+) = {rows} \| summarize copies=count\(\) by {k} \| where copies > 1 \| project {k};",
                    code,
                )
                reduced = crossed and re.search(
                    rf"union \({rows} \| where {k} !in \({crossed.group(1)}\)\), \({rows} \| where {k} in "
                    rf"\({crossed.group(1)}\) \| summarize arg_max\(_v, \*\) by {re.escape(key)}\)" + dropped,
                    code,
                )
                reads = 4
            else:
                # A key of several columns: the current rows are reduced again by the whole key.
                reduced = re.search(rf"= {rows} \| summarize arg_max\(_v, \*\) by {re.escape(key)}" + dropped, code)
                reads = 2
            if not reduced:
                problems.append(f"{view}: the keys with two rows are not reduced by {key}, then tombstones dropped")
            elif len(re.findall(rf"(?<![\w.]){rows}(?!\w)", code)) != reads:
                problems.append(f"{view}: {rows} is read other than to reduce the keys with two rows")
    return problems


@pytest.mark.parametrize("path", sorted(QUERIES.glob("*.kql")), ids=lambda path: path.name)
def test_a_view_reads_a_current_view_or_reduces_versions_itself(path):
    text = path.read_text()
    assert current_view_problems(text) == [], path.name
    for table in CONVERTED:
        if (path.stem, table) in READS_VERSIONS:
            continue
        # The defect this replaces: the whole table reduced before the time range was applied.
        assert not re.search(
            rf"(?:\blet \w+ = |\bunion\s+(?:\w+=\w+\s+)*|(?<!\w)\(\s*)\b{table}\s*[|;)]", _code(text)
        ), f"{path.name} reads the versioned table {table}; read {logical(table)}"


_SOURCE_LET = re.compile(r"\blet (\w+)_secs = (union \((\w+)_current_rows|(\w+)\b)")


def unpruned_reads(text: str) -> list[tuple[str, str]]:
    """The tables a view of a time range reads without pruning by their stored time, with how.

    A view of [since, until] reads a table's stored rows as seconds (``let <table>_secs = <table> | extend
    ts = ...``); a range applied to those seconds is applied after every row of the table was read. It
    prunes only through the table's current view with the hour range (``event_hour`` one hour either side)."""
    head = re.match(r"\s*declare query_parameters\((.*?)\);", text, re.S)
    if not head or not re.search(r"\bsince\s*:", head.group(1)):
        return []
    code = _code(text)
    found = []
    for match in _SOURCE_LET.finditer(code):
        table, current = match.group(1), match.group(3)
        if current:
            rows = re.search(rf"\blet {current}_current_rows = {current}_current\b(.*?);", code, re.S)
            if not (rows and HOUR in rows.group(1)):
                found.append((table, "ALL_HOURS"))
        elif match.group(4) == table and table in TABLES:
            found.append((table, "NO_CURRENT_VIEW" if table not in CURRENT_TABLES else "TABLE"))
    return found


# Why a view of a time range reads a table without pruning by its time.
NO_CURRENT_VIEW = (
    "the table has no current view: a range applied before its versions are reduced would leave a "
    "key whose newest version moved out of the range with a stale version"
)
ALL_HOURS = (
    "the view reads the table's current view in every hour: a use of it here is not limited to the "
    "range (a session read whole, or calls before the range)"
)
UNPRUNED: dict[tuple[str, str], tuple[str, str]] = {
    ("analytics.memory", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.memory", "file_history"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.memory", "files"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.memory", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.profiles", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.requests", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.tools", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("analytics.tools", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("board.search_hits", "session_prompts"): ("ALL_HOURS", ALL_HOURS),
    ("context.growth", "system_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("context.telemetry", "tool_stats"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("events.count", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("events.page", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.artifacts", "session_artifacts"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.artifacts", "session_folders"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.detail", "file_blobs"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.detail", "file_history"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.detail", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("files.inventory", "files"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.loaded", "session_loaded_files"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("files.recorded", "session_artifacts"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("health.flows", "system_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("health.sample_count", "metrics"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("health.series", "system_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("history.system", "system_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("history.tools", "process_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("hooks.activity", "agents"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("hooks.activity", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("hooks.activity", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("hooks.activity", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("insights.fixed_context", "session_context_items"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.fixed_context", "skill_uses"): ("ALL_HOURS", ALL_HOURS),
    ("insights.mcp", "session_context_items"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.model_report", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("insights.model_report", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("insights.repositories", "session_turns"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.changes", "session_turns"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.changes", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.durations", "session_turns"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.durations", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.repositories", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.repo_rank", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.context_carry", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.time_split", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.after_failure", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.pause_tax", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.problem_sessions", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.subagents", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.flows", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.work_per_instruction", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.verified_commits", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.skills", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.mcp", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.kql", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.model_report", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.orientation", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("insights.orientation", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    # The context cards read sessions for the repository of each session (the <repository map> block).
    ("insights.orientation", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.context_weight", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.fixed_context", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.rereads", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.problem_sessions", "context_events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.problem_sessions", "session_outcomes"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.problem_sessions", "session_turns"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.problem_sessions", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("insights.rereads", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("insights.skills", "session_context_items"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("insights.work_per_instruction", "session_prompts"): ("ALL_HOURS", ALL_HOURS),
    ("insights.work_per_instruction", "session_steps"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("nodes.reports", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("nodes.reports", "system_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("nodes.sessions", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("runtime.resources", "process_snapshots"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("samples.page", "metrics"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.context", "context_events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.context", "session_context_items"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.context", "session_loaded_files"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.event_log", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.evidence", "session_steps"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "agents"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "agents_text"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "context_events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "copilot_session_messages"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "cursor_session_messages"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("sequence.flow", "session_digests"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "session_steps"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow", "vscode_chat_messages"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "agents"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "context_events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "copilot_session_messages"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "cursor_session_messages"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("sequence.flow_bounds", "session_digests"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "session_prompts"): ("ALL_HOURS", ALL_HOURS),
    ("sequence.flow_bounds", "session_steps"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.flow_bounds", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("sequence.flow_bounds", "vscode_chat_messages"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.otel", "events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.pid_sessions", "session_processes"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.pid_sessions", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.skills", "session_loaded_files"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sequence.skills", "session_steps"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.convergence", "context_events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.convergence", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.convergence", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.convergence_turns", "context_events"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.convergence_turns", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.convergence_turns", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.runs", "session_usage"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.runs", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.search", "file_write_events"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.search", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.search", "session_artifacts"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.search", "session_commits"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.search", "session_prompts"): ("ALL_HOURS", ALL_HOURS),
    ("sessions.search", "session_sources"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.search", "session_usage"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.search", "sessions"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
    ("sessions.search", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("skills.detail", "skill_uses"): ("ALL_HOURS", ALL_HOURS),
    ("tools.detail", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("tools.mcp", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("tools.mcp_detail", "tool_invocations"): ("ALL_HOURS", ALL_HOURS),
    ("usage.sessions", "requests"): ("ALL_HOURS", ALL_HOURS),
    ("usage.sessions", "session_usage"): ("NO_CURRENT_VIEW", NO_CURRENT_VIEW),
}


def test_a_view_of_a_time_range_prunes_by_the_stored_time_or_says_why():
    found = {
        (path.stem, table): how
        for path in sorted(QUERIES.glob("*.kql"))
        for table, how in unpruned_reads(path.read_text())
    }
    # A table with a current view is never read whole by a view of a range.
    assert [read for read, how in found.items() if how == "TABLE"] == []
    assert {read: how for read, how in found.items()} == {read: how for read, (how, _) in UNPRUNED.items()}
    assert all(reason for _, reason in UNPRUNED.values())


@pytest.mark.parametrize("path", sorted(QUERIES.glob("*.kql")), ids=lambda path: path.name)
def test_a_time_parameter_becomes_a_datetime_only_within_the_datetime_range(path):
    # unixtime_seconds_todatetime(1.0e20) is 1970-01-01, not null: an open end (until=1.0e20, a default of
    # some views) turned into an hour filter would keep no row. A parameter is clamped before it converts.
    code = _code(path.read_text())
    assert not re.findall(r"unixtime_seconds_todatetime\(\s*(?:since|until)\s*\)", code), path.name


def test_the_pruning_check_sees_a_seconds_range_and_accepts_the_hour_range():
    seconds = "declare query_parameters(since:real, until:real);\nlet file_history_secs = file_history | extend ts = (ts - datetime(1970-01-01)) / 1s;\nfile_history_secs | where ts between (since .. until)"
    assert unpruned_reads(seconds) == [("file_history", "NO_CURRENT_VIEW")]
    whole = seconds.replace("file_history", "requests")
    assert unpruned_reads(whole) == [("requests", "TABLE")]
    assert unpruned_reads((QUERIES / "tools.series.kql").read_text()) == []
    assert unpruned_reads(seconds.replace("since:real, ", "")) == []


GOOD = """let current_rows = requests_current
    | where event_hour between (bin(unixtime_seconds_todatetime(since), 1h) - 1h .. unixtime_seconds_todatetime(until) + 1h);
let crossed = current_rows | summarize copies=count() by dedup_key | where copies > 1 | project dedup_key;
union (current_rows | where dedup_key !in (crossed)),
    (current_rows | where dedup_key in (crossed) | summarize arg_max(_v, *) by ['project'], node_id, dedup_key)
| where not(coalesce(_deleted, false))
| where ts between (since .. until)"""


def test_the_current_view_check_sees_each_mistake():
    assert current_view_problems(GOOD) == [] and _violations(GOOD) == []
    assert current_view_problems("requests_current | where ts > 1") == [
        "requests_current is read outside `let <rows> = requests_current | where ...`"
    ]
    # Every row taken as current: a key whose time crossed an hour is counted twice.
    unreduced = GOOD.replace(
        "in (crossed) | summarize arg_max(_v, *) by ['project'], node_id, dedup_key)", "in (crossed))"
    )
    assert current_view_problems(unreduced) == [
        "requests_current: the keys with two rows are not reduced by project, node_id, dedup_key, then tombstones dropped"
    ]
    no_tombstones = GOOD.replace("| where not(coalesce(_deleted, false))\n", "")
    assert current_view_problems(no_tombstones) == [
        "requests_current: the keys with two rows are not reduced by project, node_id, dedup_key, then tombstones dropped"
    ]
    early = GOOD.replace(
        "let current_rows = requests_current\n", "let current_rows = requests_current | where not(_deleted)\n"
    )
    assert "requests_current: tombstones are dropped before the reduction" in current_view_problems(early)
    narrow = GOOD.replace(" - 1h ..", " ..").replace(" + 1h)", ")")
    assert current_view_problems(narrow) == [
        "requests_current: event_hour is read without the one-hour margin: where event_hour between "
        "(bin(unixtime_seconds_todatetime(since), 1h) .. unixtime_seconds_todatetime(until))"
    ]
    reused = GOOD + "\n| join (current_rows | where is_error == 1) on dedup_key"
    assert current_view_problems(reused) == [
        "requests_current: current_rows is read other than to reduce the keys with two rows"
    ]
    # A filter before the reduction on a column a tombstone does not carry is the old mistake again.
    model = GOOD.replace(
        "let current_rows = requests_current\n", "let current_rows = requests_current | where model == 'm'\n"
    )
    assert _violations(model) == [("requests", "model")]


def test_the_kql_tab_presets_reduce_versions_before_any_filter_on_a_column_a_tombstone_does_not_carry():
    from aictl.dashboard.drawer_kql import kql_templates

    options = {
        "reporting_node": "node-a",
        "session": "sid-1",
        "include_all_sessions": "1",
        "since": "1",
        "until": "9",
        "model": "m",
        "tool": "t",
    }
    for preset in kql_templates({})["presets"]:
        query = kql_templates({**options, "preset": preset["id"]})["query"]
        assert _violations(query) == [], preset["id"]


class Sink:
    def __init__(self):
        self.lines: dict[str, list[dict]] = {}

    def ingest_lines(self, table, lines):
        self.lines.setdefault(table, []).extend(map(json.loads, lines))


@pytest.mark.parametrize("name", [name for name, table in TABLES.items() if table.tombstone_scope])
def test_writers_refuse_a_tombstone_without_its_scope(name):
    table = TABLES[name]
    key = {column: "k" for column in table.key if column != "node_id"}
    with pytest.raises(InvalidRowError, match="a tombstone carries"):
        KustoWriter(Sink(), node_id="node").delete(name, [key])
    with pytest.raises(InvalidRowError, match="a tombstone carries"):
        MemoryWriter().delete(name, [key])


@pytest.mark.parametrize("name", sorted(name for name in CURRENT_TABLES if TABLES[name].tombstone))
def test_writers_refuse_a_tombstone_without_the_time_its_current_view_keys_by(name):
    # A current view keys rows by hour of their time: a tombstone without one never meets its row.
    table = TABLES[name]
    row = {
        **{column: "k" for column in table.key if column != "node_id"},
        **{column: "s" for column in table.tombstone_scope},
        CURRENT_TABLES[name]: None,
    }
    with pytest.raises(InvalidRowError, match="current view keys by hour"):
        KustoWriter(Sink(), node_id="node").delete(name, [row])
    with pytest.raises(InvalidRowError, match="current view keys by hour"):
        MemoryWriter().delete(name, [row])


def test_a_tombstone_keeps_the_columns_of_the_row_it_deletes():
    sink = Sink()
    writer = KustoWriter(sink, node_id="node")
    row = {
        "project": "repo",
        "dedup_key": "k",
        "session_id": "s",
        "agent_id": "",
        "ts": 5.0,
        "tool": "claude-code",
        "source": "otel",
        "model": "m",
        "input_tokens": 3,
    }
    writer.upsert("requests", [row])
    writer.delete("requests", [row])
    writer.flush()
    stored, tombstone = sink.lines["requests"]
    assert tombstone["_deleted"] and not stored["_deleted"]
    # The writer stores the time as a UTC datetime; the tombstone carries the same stored value.
    assert {k: tombstone[k] for k in row} == {**row, "ts": "1970-01-01T00:00:05.000000Z"} == {k: stored[k] for k in row}
    assert tombstone["id"] == stored["id"]


SESSION = "tomb-session"


def _paired_call_rows() -> list[dict]:
    """The requests rows the Kusto writer sends for one call reported by telemetry, then read from the transcript."""
    sink = Sink()
    facts = SessionFacts(KustoWriter(sink, node_id="test-node"))
    counts = dict(input_tokens=10, output_tokens=5, cache_read_tokens=100, cache_creation_tokens=20)
    facts.requests(
        [
            RequestRow(
                ts=1000.0,
                source_ts=1000.0,
                session_id=SESSION,
                tool="claude-code",
                model="m",
                source="otel",
                project_path="/repo",
                prompt_id="p1",
                **counts,
            )
        ]
    )
    facts.requests(
        [
            RequestRow(
                ts=1000.5,
                source_ts=1000.5,
                session_id=SESSION,
                tool="claude-code",
                model="m",
                project_path="/repo",
                **counts,
            )
        ],
        transcript=True,
    )
    facts.writer.flush()
    columns = dict(TABLES["requests"].columns)
    rows = [{k: v for k, v in line.items() if k in columns} for line in sink.lines["requests"]]
    for n, row in enumerate(rows):  # deterministic versions, in write order, for the recording
        row["_v"] = f"2026-01-01T00:00:{n:02d}Z"
    return rows


def test_a_waiting_call_saved_before_tombstones_had_a_scope_still_gets_one(tmp_path):
    """Restart state written by an older aictl holds a waiting telemetry call without its session or time."""
    counts = dict(input_tokens=10, output_tokens=5, cache_read_tokens=100, cache_creation_tokens=20)
    state = StateFile(tmp_path / "facts.json")
    state.replace(
        {
            "otel_calls": [
                [
                    [SESSION, *counts.values()],
                    [
                        {
                            "dedup_key": "otel-key",
                            "project_path": "/repo",
                            "prompt_id": "p1",
                            "duration_ms": 9.0,
                            "ttft_ms": 0.0,
                            "pid": 0,
                            "finish_reason": "",
                            "request_id": "",
                            "response_id": "",
                        }
                    ],
                ]
            ]
        }
    )
    writer = MemoryWriter()
    facts = SessionFacts(writer, state=state)
    facts.requests(
        [
            RequestRow(
                ts=1000.5,
                source_ts=1000.5,
                session_id=SESSION,
                tool="claude-code",
                model="m",
                agent_id="a1",
                project_path="/repo",
                **counts,
            )
        ],
        transcript=True,
    )
    (tombstone,) = [row for op, table, rows in writer.operations if op == "delete" for row in rows]
    assert tombstone["dedup_key"] == "otel-key" and tombstone["project"] == "/repo"
    # The scope comes from the transcript row of the same call; the source is the telemetry's.
    assert (
        tombstone["session_id"],
        tombstone["agent_id"],
        tombstone["ts"],
        tombstone["tool"],
        tombstone["source"],
    ) == (SESSION, "a1", 1000.5, "claude-code", "otel")


def test_a_telemetry_call_paired_with_its_transcript_row_is_counted_once(kusto_tape):
    rows = _paired_call_rows()
    assert sorted((r["source"], r["_deleted"]) for r in rows) == [
        ("otel", False),
        ("otel", True),
        ("transcript", False),
    ]
    tombstone = next(r for r in rows if r["_deleted"])
    assert tombstone["session_id"] == SESSION and tombstone["ts"] == "1970-01-01T00:16:40.000000Z"
    seeded = Facts()
    for row in rows:
        seeded.insert("requests", **row)
    result = kusto_tape.reader(seeded).read("requests.records", {"requested_session": SESSION, "limit": 100})
    examples = [r for r in result.rows if r["row_type"] == "example"]
    models = [r for r in result.rows if r["row_type"] == "model"]
    assert len(examples) == 1 and examples[0]["ts"] == 1000.5
    assert [(m["model"], m["calls"]) for m in models] == [("m", 1)]
