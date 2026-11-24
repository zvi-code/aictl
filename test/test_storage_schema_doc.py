# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""docs/storage-schema.md is the contract for KQL against an aictl database: it must match the code.

Each logical table has a ``### <name>`` section under a ``## Tables`` heading, with its key,
version, tombstone, ingestion and retention lines and a ``| column | type | meaning |`` table.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from aictl.stores.kusto import layout as L
from aictl.stores.kusto import otel
from aictl.stores.kusto.schema import logical_columns
from aictl.stores.kusto.tables import RETENTION_DEFAULTS, TABLE_RETENTION_CLASS, TABLES, format_period

DOC = Path(__file__).resolve().parents[1] / "docs" / "storage-schema.md"
TEXT = DOC.read_text(encoding="utf-8")
LOGICAL = set(TABLES) | {t.name for t in otel.TABLES}
_COLUMN_ROW = re.compile(r"\| `([^`]+)` \| (\w+) \| (.+) \|")
_META = re.compile(r"- ([A-Za-z ]+): (.+)")
# KQL words the example queries may use besides column names.
_KQL_WORDS = frozenset({
    "let", "summarize", "arg_max", "by", "where", "not", "coalesce", "and", "or", "isnull", "isnotempty",
    "project", "unixtime_seconds_todatetime", "order", "desc", "asc", "count", "sum", "countif", "dcount",
    "take", "true", "false", "tostring", "extend", "iff", "isempty", "matches", "regex", "substring", "join",
    "leftouter", "on", "between", "bin", "union", "in", "h", "datetime",
})


def _sections() -> dict[str, dict]:
    """{table: {"meta": {label: value}, "columns": [(name, type)]}} for each ### under a ## Tables heading."""
    out: dict[str, dict] = {}
    in_tables, current = False, None
    for line in TEXT.splitlines():
        if line.startswith("## "):
            in_tables, current = line.startswith("## Tables"), None
        elif in_tables and line.startswith("### "):
            current = line[4:].strip()
            assert current not in out, f"two sections for {current}"
            out[current] = {"meta": {}, "columns": []}
        elif current is not None:
            if match := _COLUMN_ROW.fullmatch(line):
                out[current]["columns"].append((match[1], match[2]))
            elif match := _META.fullmatch(line):
                out[current]["meta"][match[1]] = match[2]
    return out


SECTIONS = _sections()


def _columns(name: str) -> list[tuple[str, str]]:
    return [(c, t) for c, t in logical_columns(name)]


def test_the_doc_states_the_current_layout():
    assert re.search(rf"`LAYOUT_VERSION = {L.LAYOUT_VERSION}`", TEXT)
    assert re.search(rf"`COMPATIBLE_SINCE = {L.COMPATIBLE_SINCE}`", TEXT)
    versions = [int(v) for v in re.findall(r"^\| (\d+) \| (?:yes|no) \|", TEXT, re.MULTILINE)]
    assert versions == [c.version for c in L.CHANGES]


def test_every_table_has_one_section_and_no_other():
    assert set(SECTIONS) == LOGICAL


@pytest.mark.parametrize("name", sorted(LOGICAL))
def test_each_section_lists_every_column_with_its_type(name):
    assert SECTIONS[name]["columns"] == _columns(name)


@pytest.mark.parametrize("table", otel.TABLES, ids=lambda t: t.name)
def test_otel_columns_have_the_types_otel_defines(table):
    documented = dict(SECTIONS[table.name]["columns"])
    assert {c.name: c.kusto_type for c in table.columns} == {c.name: documented.get(c.name) for c in table.columns}


@pytest.mark.parametrize("name", sorted(TABLES))
def test_each_section_states_key_version_tombstone_ingestion_and_retention(name):
    table, meta = TABLES[name], SECTIONS[name]["meta"]
    cls = TABLE_RETENTION_CLASS[name]
    assert meta["Key"] == ", ".join(f"`{k}`" for k in table.key)
    assert meta["Version column"] == f"`{table.version}`"
    assert meta["Tombstone column"] == (f"`{table.tombstone}`" if table.tombstone else "none")
    assert meta["Ingestion"] == f"`{table.ingestion}`"
    assert meta["Retention class"] == f"`{cls}` (default {format_period(RETENTION_DEFAULTS[cls])})"


@pytest.mark.parametrize("name", sorted(TABLES))
def test_a_section_names_the_columns_every_tombstone_carries(name):
    carries = SECTIONS[name]["meta"].get("Tombstone carries")
    assert carries == (", ".join(f"`{c}`" for c in TABLES[name].tombstone_scope) or None)


def test_the_retention_class_table_matches_the_code():
    rows = {m[1]: (m[2], set(re.findall(r"`(\w+)`", m[3])))
            for m in re.finditer(r"^\| `(\w+)` \| (\d+[hd]) \| (.+) \|$", TEXT, re.MULTILINE)}
    assert rows == {cls: (format_period(hours), {n for n, c in TABLE_RETENTION_CLASS.items() if c == cls})
                    for cls, hours in RETENTION_DEFAULTS.items()}


def test_a_table_dot_column_reference_names_a_real_column():
    for table, column in re.findall(r"`(\w+)\.(\w+)`", TEXT):
        if table in LOGICAL:
            assert column in dict(logical_columns(table)), f"{table}.{column} is not a column"


def _queries() -> list[str]:
    return re.findall(r"```kql\n(.*?)```", TEXT, re.DOTALL)


def test_example_queries_dedup_by_the_key_and_name_only_real_columns():
    from test_tombstone_scope import current_view_problems

    from aictl.stores.kusto.current import HOUR, current_names

    checked = 0
    for query in _queries():
        current = re.search(r"^let \w+ = (\w+)$", query, re.MULTILINE)
        if current and current[1] in current_names():
            # An example of a current view reads it in the one shape the views use (test_tombstone_scope.py).
            assert current_view_problems(query) == [], query
            table = current[1].removesuffix("_current")
            body = re.sub(r"//[^\n]*|\['\w+'\]|\"[^\"]*\"|'[^']*'", " ", query)
            aliases = set(re.findall(r"(\w+)\s*=(?!=)", body)) | set(re.findall(r"^let (\w+)", query, re.MULTILINE))
            names = {w for w in re.findall(r"[A-Za-z_]\w*", body) if w not in _KQL_WORDS and w not in aliases}
            assert names - {current[1], HOUR} <= dict(logical_columns(table)).keys(), sorted(names)
            checked += 1
            continue
        lines = [line for line in query.splitlines() if line.strip() and not line.startswith("let ")]
        source = lines[0].strip()
        name = "schema_version" if source == "aictl_nodes()" else source
        assert name in LOGICAL, f"query reads {source!r}, not a logical table"
        for line in query.splitlines():
            # A let may read another table (let lists = context_lists | ...): its dedup uses that table's key.
            other = re.match(r"let \w+ = (\w+) \|", line)
            table = other[1] if other else name
            for keys in re.findall(r"\| summarize arg_max\(_v, \*\) by ([^|\n;]+)", line):
                assert [k.strip().strip("[]'") for k in keys.split(",")] == list(TABLES[table].key)
        body = "\n".join(lines[1:])
        names = set(re.findall(r"\['(\w+)'\]", body))
        body = re.sub(r"\['\w+'\]|\"[^\"]*\"|'[^']*'", " ", body)
        aliases = set(re.findall(r"(\w+)\s*=(?!=)", body)) | set(re.findall(r"^let (\w+)", query, re.MULTILINE))
        names |= {w for w in re.findall(r"[A-Za-z_]\w*", body) if w not in _KQL_WORDS and w not in aliases}
        columns = dict(logical_columns(name))
        assert names <= columns.keys(), f"{name}: {sorted(names - columns.keys())} are not columns"
        checked += 1
    assert checked >= 6


def _meanings() -> list[tuple[str, str, str, str]]:
    """(table, column, type, meaning) of every column row under a ## Tables heading."""
    out, in_tables, current = [], False, None
    for line in TEXT.splitlines():
        if line.startswith("## "):
            in_tables, current = line.startswith("## Tables"), None
        elif in_tables and line.startswith("### "):
            current = line[4:].strip()
        elif current is not None and (match := _COLUMN_ROW.fullmatch(line)):
            out.append((current, match[1], match[2], match[3]))
    return out


# A real is a duration or an amount: its unit is in its name or stated in its meaning.
_UNIT_NAME = re.compile(r"(_ms|Ms|_usd|Usd|_mb|_percent|_rate)$")
_UNIT_WORDS = re.compile(r"\b(USD|ms|milliseconds|seconds|percent|per second|0 to 1|units?|MiB|MB|bytes)\b")


def test_every_time_is_a_utc_datetime_and_every_real_states_its_unit():
    rows = _meanings()
    assert len(rows) == sum(len(logical_columns(name)) for name in LOGICAL)
    not_utc = [f"{t}.{c}" for t, c, typ, meaning in rows if typ == "datetime" and "UTC" not in meaning]
    assert not_utc == [], "a datetime column's meaning says it is UTC"
    no_unit = [f"{t}.{c}" for t, c, typ, meaning in rows
               if typ == "real" and not _UNIT_NAME.search(c) and not _UNIT_WORDS.search(meaning)]
    assert no_unit == [], "a real column names its unit"


# What a time is called when it is stored as a number: the old mistake of layouts 6 and older.
_TIME_NAME = re.compile(r"^(ts|first_ts|last_ts|mtime|.*_at|first_seen|last_seen|last_read|last_changed|covered_through)$")


# Columns named like a time that are not one, each with the reason its doc row states.
_NOT_A_TIME = {
    ("process_defs", "starts_at"): "text of a process definition: when its process starts, not a point in time",
    ("process_defs", "stops_at"): "text of a process definition: when its process stops, not a point in time",
}


@pytest.mark.parametrize("name", sorted(LOGICAL))
def test_no_time_is_stored_as_a_number_and_no_flag_as_a_count(name):
    wrong = [(c, t) for c, t in logical_columns(name)
             if _TIME_NAME.match(c) and t != "datetime" and (name, c) not in _NOT_A_TIME]
    assert wrong == [], f"{name}: a point in time is a datetime"
    flags = [(c, t) for c, t in logical_columns(name) if re.match(r"^(is_|has_)", c) and t != "bool"]
    assert flags == [], f"{name}: a flag is a bool"


# ── the doc, the code and a database created from the code ─────────────────
# A database created from the definitions answers `.show table T cslschema` with the type Kusto gave each
# column. The answers are recorded (AICTL_RECORD_KUSTO=1, AICTL_PARITY_DB=aictl_perf_test, as docs/testing.md
# says) in CREATED; the test compares them with the code and with this page. A change to the definitions
# changes the fingerprint, and the test asks for the recording to be made again from the new code.
CREATED = Path(__file__).resolve().parent / "recordings" / "kusto" / "test_storage_schema_doc" / "created_schema.json"
_SCHEMA_NODE = "schema-doc-check"


def _record_created_schema() -> None:
    import os

    from aictl.kusto import KustoSettings
    from aictl.stores.kusto import nodes as N
    from aictl.stores.kusto.client import KustoClientFactory, Result, quote
    from aictl.stores.kusto.schema import create_node_tables, management

    database = os.environ["AICTL_PARITY_DB"]
    assert database == "aictl_perf_test", "record against the scratch database only"
    client = KustoClientFactory.client(KustoSettings(os.environ["AICTL_KUSTO_CLUSTER"], database))
    command = management(client, database)
    key = N.node_key(_SCHEMA_NODE)
    names = sorted(name for name in LOGICAL if name not in N.SHARED_TABLES)
    physical = {name: N.physical(name, key) for name in names}
    drop = f".drop tables ({', '.join(quote(t) for t in physical.values())}) ifexists"
    command(drop, "Database Admin", "Drop the tables of the schema check")
    create_node_tables(command, _SCHEMA_NODE, {name: logical_columns(name) for name in names}, {})
    created = {}
    try:
        for name, table in physical.items():
            response = command(f".show table {quote(table)} cslschema", "Database Viewer", "Read a table schema")
            schema = str(Result.from_response(response).dicts()[0]["Schema"])
            # A column named like a KQL keyword is shown quoted: ['project'].
            created[name] = [[column.strip("[]'"), kind] for column, kind in (part.split(":", 1) for part in schema.split(","))]
    finally:
        command(drop, "Database Admin", "Drop the tables of the schema check")
    CREATED.parent.mkdir(parents=True, exist_ok=True)
    CREATED.write_text(json.dumps({"fingerprint": L.fingerprint(), "tables": created}, indent=1, sort_keys=True) + "\n")


def test_a_database_created_from_the_code_has_the_types_of_the_code_and_this_page():
    import os

    from aictl.stores.kusto import nodes as N

    if os.environ.get("AICTL_RECORD_KUSTO") == "1":
        _record_created_schema()
    recorded = json.loads(CREATED.read_text(encoding="utf-8"))
    assert recorded["fingerprint"] == L.fingerprint(), (
        "The table definitions changed since the database schema was recorded: record it again "
        "(AICTL_RECORD_KUSTO=1 AICTL_PARITY_DB=aictl_perf_test, docs/testing.md)")
    created = {name: [tuple(column) for column in columns] for name, columns in recorded["tables"].items()}
    assert set(created) == LOGICAL - N.SHARED_TABLES
    assert created == {name: list(logical_columns(name)) for name in created}
    assert {name: SECTIONS[name]["columns"] for name in created} == created
