"""Every table the store writes belongs to a named ingestion traffic group, whatever name the ingester sends."""

import pytest

from aictl.health import TRAFFIC_LABELS, logical_table, traffic_group
from aictl.stores.kusto import nodes
from aictl.stores.kusto.tables import TABLES


@pytest.mark.parametrize("table", sorted(TABLES))
def test_every_table_has_a_named_group_other_than_the_catch_all(table):
    group = traffic_group(table)
    assert group in TRAFFIC_LABELS
    assert group != "other", f"{table} is in no traffic group: add it to the group map in aictl/health.py"


@pytest.mark.parametrize("table", sorted(TABLES))
def test_a_physical_node_table_counts_in_the_group_of_its_logical_table(table):
    key = nodes.node_key("some-host")
    assert logical_table(nodes.physical(table, key)) == table
    assert traffic_group(nodes.physical(table, key)) == traffic_group(table)
    assert traffic_group(nodes.LEGACY_PREFIX + table) == traffic_group(table)


def test_a_table_outside_the_store_is_other():
    assert traffic_group("no_such_table") == "other"
    assert traffic_group("no_such_table__abc_12345678") == "other"
