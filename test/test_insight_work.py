"""The cards on what the agents do: insights.flows (and the cards after it) on invented tool calls, and their shapes.

Each view reduces a key to its winning version, drops a tombstoned key and applies the period after the reduction.
A group with too little data is named as too small and drives nothing. The views run through the replay harness
(recorded against the scratch database); the recordings hold only the rows these tests invent.
"""

from __future__ import annotations

import json
from urllib.parse import urlencode

import pytest
from kusto_replay import SeededStore

from aictl.dashboard import board_routes, insights, insights_work
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope

NEWER = "2026-02-01"
ALPHA = "/work/alpha"
BETA = "/work/beta"


def _card(store, card, since=0.0, until=100_000.0, *, qualified=False):
    status, body = insights.insight(card, Filters(since=since, until=until), 200_000.0,
                                    history=HistoryScope(store.history_store.reader, None, qualified=qualified))
    assert status == 200
    assert body["view"] == insights.CARDS[card] and body["query"]["view"] == insights.CARDS[card]
    return body


def _call(store, key, ts, name, *, session, tool="copilot-cli", agent="", kind="", target="", project=ALPHA, **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 target_kind=kind, target=target, project_path=project, project=project,
                 source=values.pop("source", "transcript"), **values)


def _request(store, key, ts, *, session, cost=1.0, tool="copilot-cli", project=ALPHA, **values):
    store.insert("requests", dedup_key=key, ts=ts, session_id=session, agent_id="", tool=tool, cost_usd=cost,
                 project_path=project, project=project, input_tokens=10, **values)


READ = {"name": "view", "kind": "file", "target": "src/a.py"}
SEARCH = {"name": "rg", "kind": "query", "target": "needle"}


# ─── Flows ─────────────────────────────────────────────────────────────────────


def _seed_flows(s, project=ALPHA, prefix=""):
    p = prefix
    # a: skill, then read and search take turns 3 rounds (a cycle), an edit by file creation, a commit, then done.
    _call(s, f"{p}a0", 10.0, "skill", session=f"{p}a", kind="skill", target="kql", project=project)
    for i, spec in enumerate([READ, SEARCH, READ, SEARCH, READ, SEARCH]):
        _call(s, f"{p}a{i + 1}", 20.0 + i * 10, spec["name"], session=f"{p}a", kind=spec["kind"], target=spec["target"],
              project=project)
    _call(s, f"{p}a7", 100.0, "create", session=f"{p}a", kind="file", target="src/b.py", project=project)
    _call(s, f"{p}a8", 110.0, "bash", session=f"{p}a", kind="command", target="git commit -m one", command_name="git",
          project=project)
    _call(s, f"{p}a9", 120.0, "task_complete", session=f"{p}a", project=project)
    _request(s, f"{p}ra", 15.0, session=f"{p}a", cost=2.0, project=project)
    # b: Claude Code reads, edits and runs tests, never commits; a subagent's search between does not break its run.
    _call(s, f"{p}b1", 10.0, "Read", session=f"{p}b", tool="claude-code", kind="file", target="x.py", project=project)
    _call(s, f"{p}b2", 20.0, "Edit", session=f"{p}b", tool="claude-code", kind="file", target="x.py", is_edit=True,
          project=project)
    _call(s, f"{p}b3", 25.0, "Grep", session=f"{p}b", tool="claude-code", agent="sub", kind="query", target="y",
          project=project)
    _call(s, f"{p}b4", 30.0, "Bash", session=f"{p}b", tool="claude-code", kind="command", target="python -m pytest -q",
          command_name="python", is_test_run=True, project=project)
    _call(s, f"{p}b5", 40.0, "Bash", session=f"{p}b", tool="claude-code", kind="command", target="npm test",
          command_name="npm", project=project)     # names a test runner but is not flagged: counted as unflagged
    _request(s, f"{p}rb", 15.0, session=f"{p}b", cost=1.0, tool="claude-code", project=project)
    # c: only reads and searches; its last call's winning version is a search; a deleted edit changed nothing.
    _call(s, f"{p}c1", 10.0, "view", session=f"{p}c", kind="file", target="r.md", project=project)
    _call(s, f"{p}c2", 20.0, "view", session=f"{p}c", kind="file", target="r.md", project=project)
    _call(s, f"{p}c2", 20.0, "rg", session=f"{p}c", kind="query", target="z", project=project, _v=NEWER)
    _call(s, f"{p}c3", 30.0, "edit", session=f"{p}c", kind="file", target="r.md", is_edit=True, project=project)
    s.insert("tool_invocations", dedup_key=f"{p}c3", ts=30.0, session_id=f"{p}c", agent_id="", tool="copilot-cli",
             tool_name="edit", source="transcript", project=project, _deleted=True, _v=NEWER)
    _request(s, f"{p}rc", 15.0, session=f"{p}c", cost=0.5, project=project)
    # d: after the period.
    _call(s, f"{p}d1", 150_000.0, "edit", session=f"{p}d", kind="file", target="q.py", is_edit=True, project=project)


def test_flows_classify_steps_join_repeats_and_find_cycles(kusto_store):
    s = kusto_store
    _seed_flows(s)
    body = _card(s, "flows")
    endings = body["endings"]
    assert (endings["committed"]["sessions"], endings["changed"]["sessions"], endings["no_change"]["sessions"]) == (1, 1, 1)
    assert endings["no_change"]["last_steps"] == [{"step": "search", "sessions": 1, "cost_usd": 0.5}]
    assert endings["committed"]["last_steps"][0]["step"] == "finish"
    # b's last main-agent step: npm test is a command (not flagged as a test run).
    assert endings["changed"]["last_steps"][0]["step"] == "command"
    # Paths need 3 sessions: none here.
    assert body["first_paths"] == [] and body["summary"]["small_paths"] > 0
    tools = {tool["tool"]: tool for tool in body["tools"]}
    assert (tools["claude-code"]["test_runs"], tools["claude-code"]["unflagged_tests"]) == (1, 1)
    assert tools["copilot-cli"]["test_runs"] == 0 and body["summary"]["no_test_tools"] == ["copilot-cli"]
    # One cycle read <> search of 3 rounds, in one session: too few sessions to compare.
    assert body["cycles"] == [] and body["summary"]["small_cycles"] == 1
    sessions = {row["session_id"]: row for row in body["sessions"]}
    assert sessions["a"]["loops"] == 1 and sessions["a"]["pair"] == ["read", "search"]
    assert sessions["a"]["cycle_seconds"] == pytest.approx(50.0)
    assert sessions["c"]["outcome"] == "no_change" and "d" not in sessions
    summary = body["summary"]
    assert (summary["sessions"], summary["no_change"], summary["cost_usd"], summary["no_change_cost"]) == (3, 1, 3.5, 0.5)
    assert summary["enough"] is False and summary["small_projects"] == ["alpha"]


def test_flows_transitions_count_each_call_and_the_next_of_its_agent(kusto_store):
    s = kusto_store
    _seed_flows(s)
    rows = s.history_store.reader.read("insights.flows", {"all_nodes": True, "requested_node": "", "since": 0.0,
                                                          "until": 100_000.0, "limit": 1000}).rows
    pairs = {(row["from_step"], row["to_step"]): row["calls"] for row in rows if row["row_type"] == "transition"}
    # a: skill>read, read>search x3, search>read x2, search>edit, edit>commit, commit>finish;
    # b main: read>edit, edit>test, test>command; c: read>search.
    assert pairs == {("skill", "read"): 1, ("read", "search"): 4, ("search", "read"): 2, ("search", "edit"): 1,
                     ("edit", "commit"): 1, ("commit", "finish"): 1, ("read", "edit"): 1, ("edit", "test"): 1,
                     ("test", "command"): 1}


def _flow_rows(sessions=40, no_change=12):
    rows = [{"row_type": "transition", "from_step": "edit", "to_step": to, "calls": calls}
            for to, calls in (("test", 30), ("edit", 15), ("commit", 5))]
    rows += [{"row_type": "transition", "from_step": "ask", "to_step": "edit", "calls": 3}]
    rows += [{"row_type": "ending", "outcome": "no_change", "last_step": "read", "sessions": 8, "priced": 8, "cost_usd": 40.0},
             {"row_type": "ending", "outcome": "no_change", "last_step": "mcp", "sessions": no_change - 8, "priced": 1,
              "cost_usd": 10.0},
             {"row_type": "ending", "outcome": "committed", "last_step": "finish", "sessions": sessions - no_change,
              "priced": 9, "cost_usd": 150.0}]
    rows += [{"row_type": "first_path", "path": "skill > read", "sessions": 20},
             {"row_type": "first_path", "path": "read", "sessions": 2}]
    rows += [{"row_type": "cycle", "pair": "edit <> test", "loops": 9, "sessions": 6, "calls": 120, "seconds": 3600.0,
              "rounds": 40},
             {"row_type": "cycle", "pair": "mcp <> read", "loops": 1, "sessions": 1, "calls": 12, "seconds": 9000.0,
              "rounds": 3}]
    rows += [{"row_type": "project", "project_name": "alpha", "sessions": 30, "committed": 20, "changed": 0, "no_change": 10,
              "priced": 10, "cost_usd": 180.0, "no_change_cost": 45.0, "loops": 9, "seconds": 3600.0, "tools": ["copilot-cli"]},
             {"row_type": "project", "project_name": "beta", "sessions": 2, "committed": 0, "changed": 0, "no_change": 2,
              "priced": 1, "cost_usd": 20.0, "no_change_cost": 20.0, "loops": 0, "seconds": 0.0, "tools": ["claude-code"]}]
    rows += [{"row_type": "tool", "tool": "copilot-cli", "calls": 900, "sessions": 35, "seconds": 18_000.0, "test_runs": 0,
              "unflagged_tests": 4},
             {"row_type": "tool", "tool": "claude-code", "calls": 100, "sessions": 5, "seconds": 0.0, "test_runs": 7,
              "unflagged_tests": 0}]
    rows += [{"row_type": "meta", "sessions": sessions, "priced": 18, "cost_usd": 200.0, "first_ts": 1.0, "last_ts": 2.0,
              "computed_at": 3.0}]
    return rows


def test_flows_shape_applies_the_evidence_rule():
    body = insights_work.flows(_flow_rows())
    # Transitions out of ask (3 calls) are too few to show as shares.
    assert [item["from_step"] for item in body["transitions"]] == ["edit"]
    assert body["transitions"][0]["next"][0] == {"to_step": "test", "calls": 30, "share": 0.6}
    assert body["summary"]["small_steps"] == ["ask"]
    # A path of 2 sessions, a cycle of 1 session and a project of 2 sessions are named as too small, never compared.
    assert [path["steps"] for path in body["first_paths"]] == [["skill", "read"]] and body["summary"]["small_paths"] == 1
    assert [cycle["pair"] for cycle in body["cycles"]] == [["edit", "test"]] and body["summary"]["small_cycles"] == 1
    assert body["cycles"][0]["time_share"] == pytest.approx(0.2)
    assert [project["project"] for project in body["projects"]] == ["alpha"] and body["summary"]["small_projects"] == ["beta"]
    summary = body["summary"]
    assert (summary["no_change"], summary["no_change_share"], summary["no_change_cost"]) == (12, pytest.approx(0.3), 50.0)
    assert summary["no_change_cost_share"] == pytest.approx(0.25)
    assert summary["no_change_last"] == {"step": "read", "sessions": 8, "cost_usd": 40.0}
    assert summary["top_cycle"]["pair"] == ["edit", "test"] and summary["cycle_share"] == pytest.approx(0.2)
    assert summary["enough"] is True and summary["no_test_tools"] == ["copilot-cli"] and summary["unflagged_tests"] == 4


def test_flows_of_too_few_sessions_state_no_finding():
    summary = insights_work.flows(_flow_rows(sessions=9, no_change=9))["summary"]
    assert summary["enough"] is False


def test_flows_of_an_empty_period_report_nothing_as_zero():
    body = insights_work.flows([{"row_type": "meta", "first_ts": None, "last_ts": None, "computed_at": 1.0}])
    summary = body["summary"]
    assert (summary["cost_usd"], summary["no_change_share"], summary["no_change_cost"], summary["cycle_share"]) == (None,) * 4
    assert body["endings"]["no_change"]["cost_usd"] is None and body["sessions"] == []


def test_flows_in_fleet_scope_name_each_session_with_its_node(kusto_store):
    _seed_flows(kusto_store)
    body = _card(kusto_store, "flows", qualified=True)
    # Fleet scope: every session is named by its node and id, so the link opens the right node's session.
    assert body["sessions"] and all(json.loads(row["session_id"]) == ["test-node", raw]
                                    for row, raw in zip(body["sessions"], [r["session_id"] for r in _card(kusto_store, "flows")["sessions"]]))


# ─── The project filter, for every card of this file ───────────────────────────


def _get(store, path, **params):
    status, body = board_routes.handle_get(path, urlencode(params, doseq=True), store, store, now=200_000.0)
    assert status == 200, body
    return json.loads(body)


@pytest.mark.parametrize("card", ["flows"])
def test_a_card_of_a_project_equals_the_card_of_only_its_rows(kusto_tape, kusto_store, card):
    _seed_flows(kusto_store, ALPHA)
    _seed_flows(kusto_store, BETA, prefix="x")
    only = SeededStore(kusto_tape)
    _seed_flows(only, ALPHA)
    window = {"since": 0.0, "until": 100_000.0}
    filtered = _get(kusto_store, f"/api/board/insights/{card}", **window, project=ALPHA)
    alone = _get(only, f"/api/board/insights/{card}", **window)
    everything = _get(kusto_store, f"/api/board/insights/{card}", **window)
    assert filtered["summary"] == alone["summary"]
    assert filtered["summary"] != everything["summary"]
    assert "restrict_projects" in filtered["query"]["kql"]
