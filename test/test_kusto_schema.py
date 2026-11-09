"""The Kusto schema is derived from the SQLite schema, and its documentation from the code."""

from pathlib import Path

from aictl.kusto import schema as S

ROOT = Path(__file__).resolve().parents[1]


def test_every_store_table_is_grouped_once():
    tables = S.store_schema()
    grouped = [n for _, names in S.TABLE_GROUPS for n in names]
    assert sorted(grouped) == sorted(tables), "a table joined or left the store without a group"
    assert len(grouped) == len(set(grouped))


def test_information_rows_cover_every_column_and_system_column():
    tables = S.store_schema()
    rows = S.information_rows(tables)
    by_table: dict[str, list[dict]] = {}
    for r in rows:
        by_table.setdefault(str(r["table_name"]), []).append(r)
    for name, table in tables.items():
        own = by_table[name]
        system = 2 if table.rowid_column else 3  # rowid is the INTEGER PRIMARY KEY column when there is one
        assert len(own) == len(table.columns) + system, name
        assert [r["ordinal"] for r in own] == list(range(1, len(own) + 1))
        keyed = [r["column_name"] for r in sorted(own, key=lambda r: r["key_position"]) if r["key_position"]]
        expected = (table.rowid_column,) if table.rowid_column and table.key == (S.ROWID,) else table.key
        assert tuple(keyed) == expected, name
    assert {r["scope"] for r in rows} == {"session", "machine"}
    assert all(r["table_group"] for r in rows)


def test_information_commands_are_two_and_quote_every_identifier():
    create, fill = S.information_commands()
    assert create.startswith(".create-merge table ['aictl_information_schema'] (")
    assert fill.startswith(".set-or-replace ['aictl_information_schema'] <| datatable(")
    assert "'requests', 'dedup_key'" in fill and "'dedup_key'," in fill


def test_kusto_schema_doc_is_current():
    doc = (ROOT / "docs" / "kusto-schema.md").read_text(encoding="utf-8")
    assert doc == S.render_markdown(), (
        "docs/kusto-schema.md is stale: run `aictl db schema --markdown > docs/kusto-schema.md`"
    )
