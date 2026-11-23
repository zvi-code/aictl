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
    tables = {name: TABLES[name] for name in ("requests", "tool_invocations", "requests_observations")}
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
    # Each node writes its own tables (nodes.py); an observation companion only where one existed.
    key = N.node_key("")
    assert any(f"['requests_observations__{key}']" in command for command in creates) == (
        existing == "requests_observations")
    assert any(f"['requests__{key}']" in command for command in creates)
    assert any(f"['tool_invocations__{key}']" in command for command in creates)
