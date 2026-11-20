"""Run the contract projections against the test database on request."""

import os

import pytest
from test_contract import check_history_projections


@pytest.mark.skipif(os.environ.get("AICTL_RECORD_KUSTO") != "1", reason="opt-in Kusto recording mode")
def test_database_contract(kusto_tape, kusto_store):
    # Use the read-only request options and database guard in Tape.execute.
    kusto_tape.replay = None
    check_history_projections(kusto_store)
