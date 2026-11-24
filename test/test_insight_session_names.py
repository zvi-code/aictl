"""Insights session rows carry the session's name: its stored title, branch and folder.

A card's view gives a session by its id only; after the card is shaped, insights.session_names reads the sessions table
once for the ids the answer holds and puts title, git_branch and (when the row has none) project_path on every row that
carries a session_id. The views run through the replay harness (recorded against the scratch database), on invented rows.
"""

from __future__ import annotations

from kusto_replay import LOCAL_NODE

from aictl.dashboard import insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.history_scope import identity
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.base import ReadResult, StoreError
from aictl.stores.kusto.reader import _CACHE_TTL_S, _VIEWS

PERIOD = Filters(since=0.0, until=100_000.0)
OTHER = "node-two"


def _card(store, card, node=None, qualified=False):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    return body


def _session(store, sid, title, branch, node=None):
    store.insert("sessions", session_id=sid, tool="claude-code", project_path=f"/work/{sid}", project=f"/work/{sid}",
                 started_at=10.0, ended_at=5000.0, last_activity_at=5000.0, title=title, git_branch=branch,
                 **({"node_id": node} if node else {}))


def _spend(store, sid, cost, node=None):
    for key, agent in (("m", ""), ("a", "sub-a")):
        store.insert("requests", dedup_key=f"{sid}-{key}", session_id=sid, agent_id=agent, tool="claude-code",
                     model="claude-opus-5-5", ts=100.0, input_tokens=10, output_tokens=5, cost_usd=cost,
                     **({"node_id": node} if node else {}))


def _seed(store):
    _session(store, "s1", "Fix the login page", "feature/login")
    _spend(store, "s1", 3.0)
    _session(store, "s2", None, None)
    _spend(store, "s2", 2.0)
    _session(store, "o1", "Other node work", "main", node=OTHER)
    _spend(store, "o1", 1.0, node=OTHER)


def _names(body):
    return {row["session_id"]: (row.get("title"), row.get("git_branch"), row.get("project_path")) for row in body["sessions"]}


def test_the_names_view_is_registered_and_cached():
    assert _VIEWS["insights.session_names"][0].split() == ["all_nodes", "requested_node", "session_keys"]
    assert 0 < _CACHE_TTL_S["insights.session_names"] <= 300


def test_node_scope_session_rows_carry_title_and_branch(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "subagents", node=LOCAL_NODE, qualified=True)
    assert _names(body) == {
        identity(LOCAL_NODE, "s1"): ("Fix the login page", "feature/login", "/work/s1"),
        identity(LOCAL_NODE, "s2"): (None, None, "/work/s2"),
    }


def test_fleet_scope_names_the_sessions_of_every_node_by_their_qualified_ids(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "subagents", qualified=True)
    assert _names(body) == {
        identity(LOCAL_NODE, "s1"): ("Fix the login page", "feature/login", "/work/s1"),
        identity(LOCAL_NODE, "s2"): (None, None, "/work/s2"),
        identity(OTHER, "o1"): ("Other node work", "main", "/work/o1"),
    }


def test_unqualified_fleet_rows_are_named_by_their_node(kusto_store):
    _seed(kusto_store)
    _session(kusto_store, "s1", "Same id on the other node", "other", node=OTHER)
    _spend(kusto_store, "s1", 1.0, node=OTHER)
    body = _card(kusto_store, "subagents")
    by_node = {(row["node_id"], row["session_id"]): row["title"] for row in body["sessions"]}
    assert by_node[(LOCAL_NODE, "s1")] == "Fix the login page"
    assert by_node[(OTHER, "s1")] == "Same id on the other node"


class _Reader:
    def __init__(self, rows, fail=False):
        self.rows, self.fail, self.views = rows, fail, []

    def read(self, view, params):
        self.views.append(view)
        if view == "insights.session_names":
            if self.fail:
                raise StoreError("Kusto view insights.session_names failed")
            return ReadResult([{"node_id": "n", "session_id": "s1", "title": "T", "git_branch": "b", "project_path": "/p"}])
        if view == "insights.repo_rank":
            return ReadResult([])
        return ReadResult(self.rows)


SUBAGENT_ROWS = [{"row_type": "tool", "tool": "t", "requests": 1, "priced": 1, "cost_usd": 1.0},
                 {"row_type": "session", "tool": "t", "node_id": "n", "session_id": "s1", "requests": 1, "cost_usd": 1.0,
                  "main_cost": 0.5, "agents": 1}]


def test_a_card_without_session_rows_makes_no_names_read():
    reader = _Reader([{"row_type": "tool", "tool": "t", "requests": 1, "priced": 1, "cost_usd": 1.0}])
    status, body = insights.insight("subagents", PERIOD, 1.0, history=HistoryScope(reader, "n"))
    assert status == 200 and body["sessions"] == []
    assert "insights.session_names" not in reader.views


def test_one_names_read_per_answer_and_a_failed_read_leaves_the_card_intact():
    reader = _Reader(SUBAGENT_ROWS)
    status, body = insights.insight("subagents", PERIOD, 1.0, history=HistoryScope(reader, "n"))
    assert status == 200 and reader.views.count("insights.session_names") == 1
    assert (body["sessions"][0]["title"], body["sessions"][0]["git_branch"], body["sessions"][0]["project_path"]) == ("T", "b", "/p")
    failing = _Reader(SUBAGENT_ROWS, fail=True)
    status, body = insights.insight("subagents", PERIOD, 1.0, history=HistoryScope(failing, "n"))
    assert status == 200
    assert body["sessions"] == [{"session_id": "s1", "node_id": "n", "tool": "t", "requests": 1, "cost_usd": 1.0,
                                 "main_cost": 0.5, "agents": 1}]


def test_every_row_that_carries_a_session_id_is_named_nested_or_not():
    reader = _Reader([])
    shape = {"sessions": [{"session_id": "s1", "node_id": "n"}], "summary": {"top": {"session_id": "s1", "node_id": "n"}},
             "other": [{"session_id": "s9", "node_id": "n", "project_path": "/own"}]}
    insights.session_names(HistoryScope(reader, "n"), shape)
    assert reader.views == ["insights.session_names"]
    assert shape["sessions"][0]["title"] == shape["summary"]["top"]["title"] == "T"
    # A session the store has no row for keeps the row as the card gave it.
    assert shape["other"][0] == {"session_id": "s9", "node_id": "n", "project_path": "/own"}
