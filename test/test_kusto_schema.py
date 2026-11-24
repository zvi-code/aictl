"""The native store schema preserves the report cutover and the OTLP wire columns."""

import pytest
from test_kusto_connection import FakeClient, response

from aictl.kusto.observations import CURRENT_STORE
from aictl.stores.kusto import nodes as N
from aictl.stores.kusto.maintenance import schema_rows
from aictl.stores.kusto.otel import TABLES as OTLP_TABLES
from aictl.stores.kusto.schema import ensure_schema
from aictl.stores.kusto.tables import TABLES


def test_schema_includes_all_otlp_wire_columns():
    rows = {r["table"]: r for r in schema_rows()}
    for raw in OTLP_TABLES:
        assert {c.name: c.kusto_type for c in raw.columns}.items() <= rows[raw.name]["columns"].items()


@pytest.mark.parametrize("existing", [None, "requests", "requests_observations", CURRENT_STORE])
def test_schema_marks_only_a_fresh_report_layout(existing):
    tables = {name: TABLES[name] for name in ("requests", "tool_invocations")}
    columns = [("TableName", "string"), ("ColumnName", "string"), ("ColumnType", "string")]

    def mgmt(command):
        if command.startswith(".show database schema"):
            return response(columns, [[existing, "unrelated", "string"]] if existing else [])
        if command.startswith(".show tables details"):  # an existing table without rows: no layout check needed
            return response([("TableName", "string"), ("TotalRowCount", "long")], [[existing, 0]])
        return response()

    client = FakeClient(on_mgmt=mgmt)
    ensure_schema(client, "test", tables=tables, modes=dict.fromkeys(tables, "queued"))
    creates = [c for c in client.commands if c.startswith(".create-merge table")]
    assert any(CURRENT_STORE in command for command in creates) == (existing is None)
    # Each node writes its own tables (nodes.py); a retired observation table is never created, not even where one exists.
    key = N.node_key("")
    assert not any("_observations" in command for command in creates)
    assert any(f"['requests__{key}']" in command for command in creates)
    assert any(f"['tool_invocations__{key}']" in command for command in creates)


def test_a_retired_table_is_owned_so_the_reset_drops_it_and_its_function_goes():
    from aictl.stores.kusto.schema import RETIRED_TABLES, LayoutState, function_commands, is_owned, logical_tables

    assert RETIRED_TABLES and not RETIRED_TABLES & TABLES.keys()
    key = N.node_key("host-a")
    for name in RETIRED_TABLES:
        assert is_owned(N.physical(name, key)) and is_owned(name)
    state = LayoutState(have={}, details={}, counts={}, stored=None, has_data=False,
                        functions={"files_text": "files_text__x", "tool_invocation_coverage": "y"})
    commands = function_commands(state, logical_tables())
    assert ".drop function ['files_text'] ifexists" in commands
    assert ".drop function ['tool_invocation_coverage'] ifexists" in commands
    assert not any("create" in c and any(f"['{name}']" in c for name in RETIRED_TABLES) for c in commands)
