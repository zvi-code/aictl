# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The relation table of docs/storage-schema.md must match the definitions.

Every documented relation names real columns with the same type on both sides, and every
column of a table that links to another row (``session_id``, ``agent_id``, ``request_key``,
...) is either in a relation, the target of one, part of its own table's key, or in the list
of link-named columns that refer to no stored row.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from aictl.stores.kusto import otel
from aictl.stores.kusto.schema import logical_columns
from aictl.stores.kusto.tables import TABLES

DOC = Path(__file__).resolve().parents[1] / "docs" / "storage-schema.md"
TEXT = DOC.read_text(encoding="utf-8")
LOGICAL = set(TABLES) | {t.name for t in otel.TABLES}

# Columns that name another row. A table carrying one must say where it points.
LINK_COLUMNS = frozenset({
    "session_id", "agent_id", "parent_agent_id", "request_id", "request_key", "response_id", "prompt_id",
    "step_key", "tool_call_id", "tool_use_id", "parent_tool_use_id", "source_event_id", "event_key",
    "trace_id", "turn_id", "root_session_id", "root_turn_id", "resumed_from", "blob_hash", "text_hash",
    "before_hash", "after_hash", "list_id", "call_id",
    "SessionId", "AgentId", "ParentAgentId", "PromptId", "ToolCallId", "RequestId", "ResponseId", "TraceID",
    "SourceRowKey",
})


def _section(heading: str) -> str:
    match = re.search(rf"^{re.escape(heading)}\n(.*?)(?=^#{{2,3}} )", TEXT, re.MULTILINE | re.DOTALL)
    assert match, f"no section {heading!r}"
    return match[1]


def _names(cell: str) -> list[str]:
    return re.findall(r"`([^`]+)`", cell)


def _relations() -> list[tuple[str, list[str], list[tuple[str, str]], str]]:
    rows = []
    for line in _section("### Relation table").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) != 4 or not cells[0].startswith("`"):
            continue
        if cells[3] in ("N:1", "1:1", "N:M"):
            refers = [tuple(n.split(".", 1)) for n in _names(cells[2])]
            rows.append((_names(cells[0])[0], _names(cells[1]), refers, cells[3]))
    return rows


def _unrelated() -> set[tuple[str, str]]:
    out = set()
    for line in _section("### Relation table").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0].startswith("`") and cells[1].startswith("`"):
            out.add((_names(cells[0])[0], _names(cells[1])[0]))
    return out


def _older_tables() -> set[str]:
    part = TEXT.split("\n## Tables: Observation tables of an older aictl\n", 1)[1].split("\n## ", 1)[0]
    return set(re.findall(r"^### (\w+)$", part, re.MULTILINE))


RELATIONS = _relations()
UNRELATED = _unrelated()
OLDER = _older_tables()


def _types(table: str) -> dict[str, str]:
    return dict(logical_columns(table))


def test_the_doc_has_relations_and_unrelated_columns():
    assert len(RELATIONS) > 50
    assert UNRELATED


@pytest.mark.parametrize("child,columns,refers,cardinality", RELATIONS,
                         ids=[f"{r[0]}.{'+'.join(r[1])}" for r in RELATIONS])
def test_a_relation_names_real_columns_of_the_same_type(child, columns, refers, cardinality):
    assert child in LOGICAL, f"{child} is not a table"
    assert len(columns) == len(refers), "a relation pairs each column with one column"
    child_types = _types(child)
    for column, (parent, parent_column) in zip(columns, refers, strict=True):
        assert parent in LOGICAL, f"{parent} is not a table"
        assert column in child_types, f"{child}.{column} is not a column"
        parent_types = _types(parent)
        assert parent_column in parent_types, f"{parent}.{parent_column} is not a column"
        assert child_types[column] == parent_types[parent_column], (
            f"{child}.{column} is {child_types[column]} but {parent}.{parent_column} is {parent_types[parent_column]}")
    assert len({p for p, _ in refers}) == 1, "a relation refers to one table"


def test_an_unrelated_column_is_a_real_column():
    for table, column in UNRELATED:
        assert column in _types(table), f"{table}.{column} is not a column"


def _covered() -> set[tuple[str, str]]:
    covered = set(UNRELATED)
    for child, columns, refers, _ in RELATIONS:
        covered |= {(child, c) for c in columns}
        covered |= set(refers)
    return covered


@pytest.mark.parametrize("table", sorted(LOGICAL))
def test_every_link_column_of_a_table_is_in_a_relation(table):
    if table in OLDER:
        return
    own_key = set(TABLES[table].key) if table in TABLES else set()
    covered = _covered()
    missing = [c for c, _ in logical_columns(table)
               if c in LINK_COLUMNS and c not in own_key and (table, c) not in covered]
    assert not missing, f"{table}: {missing} link to another row but are not in the relation table"


def test_the_older_tables_are_the_observation_tables():
    assert OLDER and all(t.endswith(("_observations", "_observations_text")) for t in OLDER)
