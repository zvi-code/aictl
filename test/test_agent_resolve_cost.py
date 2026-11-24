"""agents.resolve runs for every flow, transcript and detail read: it must read one agent's rows.

It reduced the versions of every request in the store before it looked at the agent id, so each
read of a main agent (named by its session id, which matches no row) cost seconds of cluster CPU
to return nothing.
"""

from __future__ import annotations

import re
from pathlib import Path

from aictl.stores.kusto.tables import TABLES

QUERY = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries" / "agents.resolve.kql"


def branches(text: str) -> dict[str, str]:
    """The pipeline of each table the union reads, up to its reduction."""
    return {m.group(1): m.group(2) for m in re.finditer(r"\(\s*(\w+)\s*\n(.*?)\| summarize arg_max", text, re.S)}


def test_every_branch_selects_the_agent_before_it_reduces_versions():
    text = QUERY.read_text(encoding="utf-8")
    found = branches(text)
    assert set(found) == {"agents", "requests"}
    for table, pipeline in found.items():
        assert re.search(r"where agent_id == requested_agent", pipeline), table


def test_the_early_filters_keep_tombstones():
    # A where before the reduction drops a tombstone that lacks the column; these columns are in its scope.
    scope = set(TABLES["requests"].tombstone_scope)
    assert {"agent_id", "session_id"} <= scope
