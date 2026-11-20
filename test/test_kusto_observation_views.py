"""Offline tests for the shared database's observation and current-row KQL."""

from aictl.kusto.observations import CURRENT_STORE, has_current_store


def test_observation_companions_override_the_current_layout_marker():
    assert has_current_store({CURRENT_STORE, "requests"})
    assert not has_current_store({"requests"})
    assert not has_current_store({CURRENT_STORE, "requests", "requests_observations"})
