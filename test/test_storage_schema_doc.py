# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""docs/storage-schema.md is the contract for KQL against an aictl database: it must match the code.

Each logical table has a ``### <name>`` section under a ``## Tables`` heading, with its key,
version, tombstone, ingestion and retention lines and a ``| column | type | meaning |`` table.
"""

from __future__ import annotations

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
    "leftouter", "on",
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
    checked = 0
    for query in _queries():
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
