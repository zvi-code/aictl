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
    "and", "or", "not", "in", "has", "contains", "between", "startswith", "endswith", "has_any", "has_all",
    "matches", "regex", "like", "true", "false", "null", "contains_cs", "startswith_cs", "endswith_cs", "has_cs",
    "notcontains", "hasprefix", "hassuffix", "datetime", "timespan", "long", "int", "real", "string", "bool",
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
        name: (name, {}) for name, table in TABLES.items() if table.tombstone}
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
                before = code[:match.start()].rstrip()
                if not code[match.end():].lstrip().startswith("|") or not (
                        not before or before[-1] in "(=,;" or re.search(r"\bunion$", before)):
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
                            if word in _OPERATORS or word in names or body[ident.end():].lstrip().startswith("("):
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
    return [(name, column) for name, column in filtered_before_dedup(text)
            if column not in carried(name)]


@pytest.mark.parametrize("path", sorted(QUERIES.glob("*.kql")), ids=lambda path: path.name)
def test_views_filter_tombstone_tables_before_dedup_only_on_columns_a_tombstone_carries(path):
    assert _violations(path.read_text()) == [], (
        f"{path.name} filters before `summarize arg_max(_v, *)` on columns a tombstone does not carry. "
        "Reduce versions first, or add the column to the table's tombstone_scope (tables.py) and make "
        "every writer of a delete supply it.")


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
        ("requests", "id"), ("requests", "model"), ("requests", "session_id"), ("requests", "ts")]
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
    assert {"requests.records.kql", "agents.resolve.kql", "tools.totals.kql", "files.changes.kql"} <= flagged


# The views that read a current view (stores/kusto/current.py) instead of reducing the whole table.
CONVERTED = ("requests",)


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
            bound = re.search(r"\blet (\w+) = $", code[:match.start()])
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
            crossed = re.search(rf"\blet (\w+) = {rows} \| summarize copies=count\(\) by dedup_key "
                                r"\| where copies > 1 \| project dedup_key;", code)
            reduced = crossed and re.search(
                rf"union \({rows} \| where dedup_key !in \({crossed.group(1)}\)\), \({rows} \| where dedup_key in "
                rf"\({crossed.group(1)}\) \| summarize arg_max\(_v, \*\) by {re.escape(key)}\) "
                r"\| where not\(coalesce\(_deleted, false\)\)", code)
            if not reduced:
                problems.append(f"{view}: the keys with two rows are not reduced by {key}, then tombstones dropped")
            elif len(re.findall(rf"(?<![\w.]){rows}(?!\w)", code)) != 4:
                problems.append(f"{view}: {rows} is read other than to reduce the keys with two rows")
    return problems


@pytest.mark.parametrize("path", sorted(QUERIES.glob("*.kql")), ids=lambda path: path.name)
def test_a_view_reads_a_current_view_or_reduces_versions_itself(path):
    text = path.read_text()
    assert current_view_problems(text) == [], path.name
    table = path.name.split(".", 1)[0]
    if table in CONVERTED:
        # The defect this replaces: the whole table reduced before the time range was applied.
        assert not re.search(rf"(?<![\w.]){table}(?!\w)", _code(text)), (
            f"{path.name} reads the versioned table {table}; read {logical(table)}")


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
        "requests_current is read outside `let <rows> = requests_current | where ...`"]
    # Every row taken as current: a key whose time crossed an hour is counted twice.
    unreduced = GOOD.replace("in (crossed) | summarize arg_max(_v, *) by ['project'], node_id, dedup_key)", "in (crossed))")
    assert current_view_problems(unreduced) == [
        "requests_current: the keys with two rows are not reduced by project, node_id, dedup_key, then tombstones dropped"]
    no_tombstones = GOOD.replace("| where not(coalesce(_deleted, false))\n", "")
    assert current_view_problems(no_tombstones) == [
        "requests_current: the keys with two rows are not reduced by project, node_id, dedup_key, then tombstones dropped"]
    early = GOOD.replace("let current_rows = requests_current\n", "let current_rows = requests_current | where not(_deleted)\n")
    assert "requests_current: tombstones are dropped before the reduction" in current_view_problems(early)
    narrow = GOOD.replace(" - 1h ..", " ..").replace(" + 1h)", ")")
    assert current_view_problems(narrow) == [
        "requests_current: event_hour is read without the one-hour margin: where event_hour between "
        "(bin(unixtime_seconds_todatetime(since), 1h) .. unixtime_seconds_todatetime(until))"]
    reused = GOOD + "\n| join (current_rows | where is_error == 1) on dedup_key"
    assert current_view_problems(reused) == [
        "requests_current: current_rows is read other than to reduce the keys with two rows"]
    # A filter before the reduction on a column a tombstone does not carry is the old mistake again.
    model = GOOD.replace("let current_rows = requests_current\n", "let current_rows = requests_current | where model == 'm'\n")
    assert _violations(model) == [("requests", "model")]


def test_the_kql_tab_presets_reduce_versions_before_any_filter_on_a_column_a_tombstone_does_not_carry():
    from aictl.dashboard.drawer_kql import kql_templates
    options = {"reporting_node": "node-a", "session": "sid-1", "include_all_sessions": "1", "since": "1", "until": "9",
               "model": "m", "tool": "t"}
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


@pytest.mark.parametrize("name", sorted(CURRENT_TABLES))
def test_writers_refuse_a_tombstone_without_the_time_its_current_view_keys_by(name):
    # A current view keys rows by hour of their time: a tombstone without one never meets its row.
    table = TABLES[name]
    row = {**{column: "k" for column in table.key if column != "node_id"},
           **{column: "s" for column in table.tombstone_scope}, CURRENT_TABLES[name]: None}
    with pytest.raises(InvalidRowError, match="current view keys by hour"):
        KustoWriter(Sink(), node_id="node").delete(name, [row])
    with pytest.raises(InvalidRowError, match="current view keys by hour"):
        MemoryWriter().delete(name, [row])


def test_a_tombstone_keeps_the_columns_of_the_row_it_deletes():
    sink = Sink()
    writer = KustoWriter(sink, node_id="node")
    row = {"project": "repo", "dedup_key": "k", "session_id": "s", "agent_id": "", "ts": 5.0, "tool": "claude-code",
           "source": "otel", "model": "m", "input_tokens": 3}
    writer.upsert("requests", [row])
    writer.delete("requests", [row])
    writer.flush()
    stored, tombstone = sink.lines["requests"]
    assert tombstone["_deleted"] and not stored["_deleted"]
    assert {k: tombstone[k] for k in row} == row and tombstone["id"] == stored["id"]


SESSION = "tomb-session"


def _paired_call_rows() -> list[dict]:
    """The requests rows the Kusto writer sends for one call reported by telemetry, then read from the transcript."""
    sink = Sink()
    facts = SessionFacts(KustoWriter(sink, node_id="test-node"))
    counts = dict(input_tokens=10, output_tokens=5, cache_read_tokens=100, cache_creation_tokens=20)
    facts.requests([RequestRow(ts=1000.0, source_ts=1000.0, session_id=SESSION, tool="claude-code", model="m",
                               source="otel", project_path="/repo", prompt_id="p1", **counts)])
    facts.requests([RequestRow(ts=1000.5, source_ts=1000.5, session_id=SESSION, tool="claude-code", model="m",
                               project_path="/repo", **counts)], transcript=True)
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
    state.replace({"otel_calls": [[[SESSION, *counts.values()], [
        {"dedup_key": "otel-key", "project_path": "/repo", "prompt_id": "p1", "duration_ms": 9.0, "ttft_ms": 0.0,
         "pid": 0, "finish_reason": "", "request_id": "", "response_id": ""}]]]})
    writer = MemoryWriter()
    facts = SessionFacts(writer, state=state)
    facts.requests([RequestRow(ts=1000.5, source_ts=1000.5, session_id=SESSION, tool="claude-code", model="m",
                               agent_id="a1", project_path="/repo", **counts)], transcript=True)
    (tombstone,) = [row for op, table, rows in writer.operations if op == "delete" for row in rows]
    assert tombstone["dedup_key"] == "otel-key" and tombstone["project"] == "/repo"
    # The scope comes from the transcript row of the same call; the source is the telemetry's.
    assert (tombstone["session_id"], tombstone["agent_id"], tombstone["ts"], tombstone["tool"], tombstone["source"]) \
        == (SESSION, "a1", 1000.5, "claude-code", "otel")


def test_a_telemetry_call_paired_with_its_transcript_row_is_counted_once(kusto_tape):
    rows = _paired_call_rows()
    assert sorted((r["source"], r["_deleted"]) for r in rows) == [
        ("otel", False), ("otel", True), ("transcript", False)]
    tombstone = next(r for r in rows if r["_deleted"])
    assert tombstone["session_id"] == SESSION and tombstone["ts"] == 1000.0
    seeded = Facts()
    for row in rows:
        seeded.insert("requests", **row)
    result = kusto_tape.reader(seeded).read("requests.records", {"requested_session": SESSION, "limit": 100})
    examples = [r for r in result.rows if r["row_type"] == "example"]
    models = [r for r in result.rows if r["row_type"] == "model"]
    assert len(examples) == 1 and examples[0]["ts"] == 1000.5
    assert [(m["model"], m["calls"]) for m in models] == [("m", 1)]
