"""Offline tests for the shared database's observation and current-row KQL."""

import json

import pytest

from aictl.kusto.observations import (
    COMPANIONS,
    CURRENT_STORE,
    FAMILIES,
    public_function_commands,
    unresolved_query,
)
from aictl.kusto.schema import quote, store_schema


@pytest.mark.parametrize("current", [True, False])
def test_public_functions_keep_colliding_local_keys_in_separate_nodes(current):
    tables = store_schema()
    # A companion overrides the current marker, even when both exist.
    layout = {CURRENT_STORE, *FAMILIES, *(set() if current else COMPANIONS)}
    commands = public_function_commands(tables, layout)
    assert len(commands) == len(FAMILIES)
    for family, command in zip(FAMILIES, commands, strict=True):
        source = family if current else family + "_observations"
        function = "aictl_resolved_" + family if current else "aictl_" + source
        assert f"function {function}() {{\n{quote(source)} |" in command
        keys = command.split("arg_max(['_v'], *) by ", 1)[1].split(" |", 1)[0]
        assert set(keys.split(", ")) == {quote(k) for k in (*tables[source].key, "node_id")}
        assert "where ['_deleted'] == false" in command
        assert "['node_id']" not in command.split("project-away ", 1)[1]
        assert "where ['node_id']" not in command  # No installing daemon baked into shared functions.
    assert not public_function_commands(tables, set(FAMILIES))  # Legacy baseline alone is incomplete.


def test_cutover_policies_group_and_filter_nodes_before_tombstones():
    families = ("sessions", "requests", "sessions")
    fleet = unresolved_query(families)
    assert "by ['node_id'], ['key'] | where ['_deleted'] == false" in fleet
    assert "| project ['node_id'], family=" in fleet
    assert fleet.count('"observation_cutover:sessions"') == 1
    assert "['node_id'] ==" not in fleet
    for node in ("node-a", 'b"\\x', ""):
        local = unresolved_query(families, node_id=node)
        scope = "['node_id'] == " + json.dumps(node)
        assert scope in local.split("summarize", 1)[0]
        assert " or " not in local
    assert "| where false |" in unresolved_query(())
