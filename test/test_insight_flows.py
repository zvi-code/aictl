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

from aictl.dashboard import board_routes, insights, insights_flows
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
    body = insights_flows.flows(_flow_rows())
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
    summary = insights_flows.flows(_flow_rows(sessions=9, no_change=9))["summary"]
    assert summary["enough"] is False


def test_flows_of_an_empty_period_report_nothing_as_zero():
    body = insights_flows.flows([{"row_type": "meta", "first_ts": None, "last_ts": None, "computed_at": 1.0}])
    summary = body["summary"]
    assert (summary["cost_usd"], summary["no_change_share"], summary["no_change_cost"], summary["cycle_share"]) == (None,) * 4
    assert body["endings"]["no_change"]["cost_usd"] is None and body["sessions"] == []


def test_flows_in_fleet_scope_name_each_session_with_its_node(kusto_store):
    _seed_flows(kusto_store)
    body = _card(kusto_store, "flows", qualified=True)
    # Fleet scope: every session is named by its node and id, so the link opens the right node's session.
    assert body["sessions"] and all(json.loads(row["session_id"]) == ["test-node", raw]
                                    for row, raw in zip(body["sessions"], [r["session_id"] for r in _card(kusto_store, "flows")["sessions"]]))


# ─── Skills ────────────────────────────────────────────────────────────────────


def _use(store, key, ts, name, *, session, prompt, tool="copilot-cli", project=ALPHA, **values):
    store.insert("skill_uses", dedup_key=key, ts=ts, session_id=session, agent_id="", tool=tool, name=name, prompt_id=prompt,
                 trigger="agent-invoked", project_path=project, project=project, **values)


def _listed(store, ts, name, *, session, tokens, project=ALPHA, tool="claude-code"):
    store.insert("session_context_items", session_id=session, agent_id="", kind="skills", name=name, ts=ts, path="",
                 chars=tokens * 4, tokens=tokens, estimated=True, removed=False, tool=tool, project=project)


def _seed_skills(s, project=ALPHA, prefix=""):
    p = prefix
    # k1: kql in turn t1, then an edit and a commit in the same turn; the turn's two requests cost 3.0.
    _use(s, f"{p}u1", 10.0, "kql", session=f"{p}k1", prompt="t1", project=project)
    _call(s, f"{p}k1e", 20.0, "edit", session=f"{p}k1", kind="file", target="a.kql", is_edit=True, prompt_id="t1", project=project)
    _call(s, f"{p}k1c", 30.0, "bash", session=f"{p}k1", kind="command", target="git commit -m q", prompt_id="t1",
          project=project)
    _call(s, f"{p}k1x", 5.0, "edit", session=f"{p}k1", kind="file", target="b.kql", is_edit=True, prompt_id="t1",
          project=project)      # before the use: does not follow it
    _request(s, f"{p}k1r1", 12.0, session=f"{p}k1", cost=1.0, prompt_id="t1", project=project)
    _request(s, f"{p}k1r2", 22.0, session=f"{p}k1", cost=2.0, prompt_id="t1", project=project)
    # k2: kql twice in one turn (the turn counts once), nothing follows; then review in another turn.
    _use(s, f"{p}u2", 10.0, "kql", session=f"{p}k2", prompt="t2", project=project)
    _use(s, f"{p}u3", 11.0, "kql", session=f"{p}k2", prompt="t2", project=project)
    _request(s, f"{p}k2r", 12.0, session=f"{p}k2", cost=0.5, prompt_id="t2", project=project)
    _use(s, f"{p}u4", 50.0, "review", session=f"{p}k2", prompt="t3", project=project)
    # A use after the period.
    _use(s, f"{p}u5", 150_000.0, "kql", session=f"{p}k3", prompt="t4", project=project)
    # c1: Claude Code lists review and never-used; it uses review.
    _listed(s, 5.0, "review", session=f"{p}c1", tokens=100, project=project)
    _listed(s, 5.0, "never-used", session=f"{p}c1", tokens=300, project=project)
    _use(s, f"{p}u6", 20.0, "review", session=f"{p}c1", prompt="t5", tool="claude-code", project=project)


def test_skills_count_uses_turns_and_what_follows_in_the_same_turn(kusto_store):
    _seed_skills(kusto_store)
    body = _card(kusto_store, "skills")
    every = {item["name"]: item for item in body["skills"] + body["small_skills"]}
    kql = every["kql"]
    assert (kql["uses"], kql["sessions"], kql["turns"], kql["cost_usd"], kql["with_turn"]) == (3, 2, 2, 3.5, 3)
    assert (kql["after_edit"], kql["after_test"], kql["after_commit"]) == (pytest.approx(1 / 3), 0.0, pytest.approx(1 / 3))
    assert every["review"]["tools"] == ["claude-code", "copilot-cli"] and every["review"]["uses"] == 2
    # 3 uses in 2 sessions is too few to compare: no skill drives the finding.
    assert body["skills"] == [] and body["summary"]["small_skills"] == 2 and body["summary"]["top"] is None
    assert body["unused"] == [{"tool": "claude-code", "name": "never-used", "sessions": 1, "list_tokens": 300}]
    assert body["listings"] == [{"tool": "claude-code", "listed": 2, "unused": 1, "sessions": 1, "list_tokens": 400,
                                 "unused_tokens": 300}]
    assert {tool["tool"]: tool["uses"] for tool in body["tools"]} == {"copilot-cli": 4, "claude-code": 1}
    assert body["summary"]["uses"] == 5 and body["summary"]["cost_usd"] == 3.5
    assert [row["session_id"] for row in body["sessions"]][0] == "k2"


def _skill_row(name, uses, sessions, cost, **values):
    return {"row_type": "skill", "name": name, "uses": uses, "sessions": sessions, "projects": 1, "tools": ["copilot-cli"],
            "turns": uses, "turn_tokens": 1000, "priced": uses, "cost_usd": cost, "with_turn": uses, "after_edit": uses,
            "after_test": 0, "after_commit": 0, **values}


def test_skills_shape_applies_the_evidence_rule():
    rows = [_skill_row("big", 140, 140, 1300.0), _skill_row("cheap", 50, 40, 60.0), _skill_row("rare", 4, 4, 900.0),
            {"row_type": "meta", "priced": 100, "cost_usd": 4000.0, "first_ts": 1.0, "last_ts": 2.0, "computed_at": 3.0},
            {"row_type": "project", "project_name": "alpha", "uses": 190, "skills": 2, "sessions": 150},
            {"row_type": "project", "project_name": "beta", "uses": 4, "skills": 1, "sessions": 4}]
    body = insights_flows.skills(rows)
    # A skill of 4 uses never leads, however costly its turns.
    assert [item["name"] for item in body["skills"]] == ["big", "cheap"] and body["summary"]["small_skills"] == 1
    assert body["summary"]["top"]["name"] == "big" and body["summary"]["top"]["cost_share"] == pytest.approx(0.325)
    assert [item["project"] for item in body["projects"]] == ["alpha"] and body["summary"]["small_projects"] == ["beta"]
    assert body["summary"]["unused_tokens"] is None and body["summary"]["listing_tools"] == ["claude-code"]


# ─── MCP servers ───────────────────────────────────────────────────────────────


def _mcp_call(store, key, ts, server, tool_name, *, session, project=ALPHA, tool="copilot-cli", **values):
    _call(store, key, ts, f"mcp__{server}__{tool_name}", session=session, tool=tool, kind="other", project=project,
          mcp_server=server, mcp_tool=tool_name, **values)


def _seed_mcp(s, project=ALPHA, prefix=""):
    p = prefix
    # m1: two kusto query calls (one failed) and a docs fetch; two requests after the first call, one after the second.
    _request(s, f"{p}m1r0", 5.0, session=f"{p}m1", project=project)
    _mcp_call(s, f"{p}m1a", 10.0, "kusto", "query", session=f"{p}m1", duration_ms=100.0, output_bytes=1000, project=project)
    _request(s, f"{p}m1r1", 15.0, session=f"{p}m1", project=project)
    _mcp_call(s, f"{p}m1b", 20.0, "kusto", "query", session=f"{p}m1", duration_ms=300.0, output_bytes=10, failed=True,
              is_error=True, project=project)
    _request(s, f"{p}m1r2", 25.0, session=f"{p}m1", project=project)
    _mcp_call(s, f"{p}m1c", 30.0, "docs", "fetch", session=f"{p}m1", duration_ms=50.0, output_bytes=500, project=project)
    # A deleted call and a plain read do not count; the read counts in all calls.
    _mcp_call(s, f"{p}m1d", 40.0, "kusto", "query", session=f"{p}m1", duration_ms=9000.0, project=project)
    s.insert("tool_invocations", dedup_key=f"{p}m1d", ts=40.0, session_id=f"{p}m1", agent_id="", tool="copilot-cli",
             tool_name="mcp__kusto__query", source="transcript", project=project, _deleted=True, _v=NEWER)
    _call(s, f"{p}m1e", 45.0, "view", session=f"{p}m1", kind="file", target="a", duration_ms=10.0, project=project)
    # c1: Claude Code lists kusto and docs tools and calls only kusto.
    for name, tokens in (("mcp__kusto__query", 40), ("mcp__docs__fetch", 70), ("mcp__docs__search", 30), ("Read", 500)):
        s.insert("session_context_items", session_id=f"{p}c1", agent_id="", kind="tools_listed", name=name, ts=5.0, path="",
                 chars=tokens * 4, tokens=tokens, estimated=True, removed=False, tool="claude-code", project=project)
    _mcp_call(s, f"{p}c1a", 10.0, "kusto", "query", session=f"{p}c1", tool="claude-code", duration_ms=200.0, output_bytes=40,
              project=project)


def test_mcp_counts_calls_failures_durations_and_bytes_carried_per_server(kusto_store):
    _seed_mcp(kusto_store)
    body = _card(kusto_store, "mcp")
    servers = {item["server"]: item for item in body["servers"] + body["small_servers"]}
    kusto = servers["kusto"]
    assert (kusto["calls"], kusto["sessions"], kusto["failures"], kusto["sum_ms"], kusto["output_bytes"]) == (3, 2, 1, 600.0, 1050)
    # Carried as insights.context_carry counts it: 1000 bytes x 2 later requests, 10 x 1; the Claude call has none after it.
    assert kusto["carried_bytes"] == 2010.0
    assert kusto["tools"] == ["claude-code", "copilot-cli"] and kusto["calls_by_tool"][0]["tool_name"] == "query"
    # 3 calls in 2 sessions: too few to give a failure share.
    assert kusto["failure_share"] is None and body["servers"] == [] and body["summary"]["small_servers"] == 2
    assert body["listed"] == [{"server": "docs", "tool": "claude-code", "sessions": 1, "called_sessions": 0, "list_tokens": 100,
                               "unused_tokens": 100, "listed_tools": 2},
                              {"server": "kusto", "tool": "claude-code", "sessions": 1, "called_sessions": 1, "list_tokens": 40,
                               "unused_tokens": 0, "listed_tools": 1}]
    summary = body["summary"]
    assert (summary["calls"], summary["all_calls"], summary["sum_ms"]) == (4, 5, 650.0)
    assert summary["time_share"] == pytest.approx(650 / 660) and summary["never_called"] == 1 and summary["unused_tokens"] == 100
    assert summary["listed_servers"] == 2


def _server_row(server, calls, sessions, sum_ms, **values):
    return {"row_type": "server", "server": server, "calls": calls, "sessions": sessions, "projects": 1, "failures": calls // 10,
            "timed": calls, "p50_ms": 100.0, "p95_ms": 900.0, "sum_ms": sum_ms, "output_bytes": 1000, "sized": calls,
            "carried_bytes": 5000.0, "tools": ["copilot-cli"], "server_tools": 3, **values}


def test_mcp_shape_applies_the_evidence_rule():
    rows = [_server_row("big", 1000, 13, 3_600_000.0), _server_row("slow", 19, 5, 9_000_000.0),
            {"row_type": "meta", "calls": 10_000, "sum_ms": 36_000_000.0, "first_ts": 1.0, "last_ts": 2.0, "computed_at": 3.0}]
    body = insights_flows.mcp(rows)
    # 19 calls never lead, however slow.
    assert [item["server"] for item in body["servers"]] == ["big"] and body["summary"]["top"]["server"] == "big"
    assert body["servers"][0]["failure_share"] == pytest.approx(0.1) and body["small_servers"][0]["failure_share"] is None
    assert body["summary"]["call_share"] == pytest.approx(0.1019) and body["summary"]["unused_tokens"] is None


# ─── Kusto runs ────────────────────────────────────────────────────────────────


def _kusto_mcp(store, key, ts, args, *, session, project=ALPHA, **values):
    _mcp_call(store, key, ts, "kusto", "kusto_query", session=session, project=project, **values)
    store.insert("tool_invocations_text", dedup_key=key, project=project, input=json.dumps(args), target="")


def _shell_text(store, key, ts, line, *, session, project=ALPHA, tool="copilot-cli", **values):
    _call(store, key, ts, "bash", session=session, tool=tool, kind="command", target=line, command_name=line.split()[0],
          project=project, **values)
    store.insert("tool_invocations_text", dedup_key=key, project=project, input=json.dumps({"command": line}), target=line)


CLUSTER = "https://help.kusto.windows.net"


def _seed_kql(s, project=ALPHA, prefix=""):
    p = prefix
    # q1: the same query with three different literals (one shape, 3 runs in one session); the last failed on syntax.
    for i, (state, n) in enumerate((("TEXAS", 10), ("OHIO", 20), ("IOWA", 5))):
        _kusto_mcp(s, f"{p}q1-{i}", 10.0 + i, {"query": f"StormEvents | where State == '{state}' | take {n}", "cluster": CLUSTER,
                                               "database": "Samples"}, session=f"{p}q1", project=project, duration_ms=100.0,
                   output_bytes=1000, **({"failed": True, "is_error": True, "error_summary": "Syntax error: SYN0002 bad"}
                                         if i == 2 else {}))
    # q2: a management command that changes schema and one that reads.
    _kusto_mcp(s, f"{p}q2-a", 10.0, {"command": ".create table Logs (ts:datetime, msg:string)", "cluster": CLUSTER,
                                     "database": "Samples"}, session=f"{p}q2", project=project, duration_ms=50.0)
    _kusto_mcp(s, f"{p}q2-b", 11.0, {"query": "  .show tables", "cluster": CLUSTER, "database": "Samples"}, session=f"{p}q2",
               project=project, duration_ms=20.0)
    # q3: Kusto.Cli drops a table; a script queries through KustoClient and brings 200 KB back.
    _shell_text(s, f"{p}q3-a", 10.0, f'Kusto.Cli.exe "{CLUSTER}/Samples;Fed=true" -execute:".drop table Old"', session=f"{p}q3",
                project=project)
    _shell_text(s, f"{p}q3-b", 20.0, "python -c \"from azure.kusto.data import KustoClient; c = KustoClient('https://x.kusto.windows.net'); "
                "c.execute('mydb', 'Events | summarize count() by bin(ts, 1h)')\"", session=f"{p}q3", project=project,
                output_bytes=200_000)
    # Not runs: az kusto cluster show manages the Azure resource, grep only searches; both are counted as not recognised.
    _shell_text(s, f"{p}q3-c", 30.0, "az kusto cluster show -n c -g g", session=f"{p}q3", project=project)
    _shell_text(s, f"{p}q3-d", 40.0, "grep -rn kusto src", session=f"{p}q3", project=project)
    # A run after the period and a deleted run.
    _kusto_mcp(s, f"{p}q4", 150_000.0, {"query": "T | take 1"}, session=f"{p}q4", project=project)
    _kusto_mcp(s, f"{p}q5", 50.0, {"query": ".drop table X"}, session=f"{p}q1", project=project)
    s.insert("tool_invocations", dedup_key=f"{p}q5", ts=50.0, session_id=f"{p}q1", agent_id="", tool="copilot-cli",
             tool_name="mcp__kusto__kusto_query", source="transcript", project=project, _deleted=True, _v=NEWER)


def test_kql_recognises_runs_and_classifies_queries_and_management_commands(kusto_store):
    _seed_kql(kusto_store)
    body = _card(kusto_store, "kql")
    coverage = {item["tool"]: item for item in body["coverage"]}["copilot-cli"]
    assert (coverage["runs"], coverage["mcp"], coverage["cli"], coverage["script"], coverage["unrecognised"]) == (7, 5, 1, 1, 2)
    kinds = {(item["kind"], item["verb"]): item for item in body["kinds"]}
    assert kinds[("query", None)]["runs"] == 4
    assert kinds[("management", "create")]["change"] is True and kinds[("management", "drop")]["change"] is True
    assert kinds[("management", "show")]["change"] is False
    summary = body["summary"]
    assert (summary["runs"], summary["changes"], summary["failures"], summary["large"]) == (7, 2, 1, 1)
    assert summary["change_verbs"] == ["create", "drop"]
    targets = {(item["cluster"], item["database"]): item["runs"] for item in body["targets"]}
    assert targets == {("help.kusto.windows.net", "Samples"): 5, ("help.kusto.windows.net", None): 1, ("x.kusto.windows.net", "mydb"): 1}
    assert body["failure_kinds"] == [{"failure": "syntax", "runs": 1}]
    assert body["large"][0]["output_bytes"] == 200_000 and body["large"][0]["kind"] == "query"
    assert body["large"][0]["text"] == "Events | summarize count() by bin(ts, 1h)"


def test_kql_normalises_literals_into_one_shape_and_counts_repeats(kusto_store):
    _seed_kql(kusto_store)
    shapes = {item["snippet"]: item for item in _card(kusto_store, "kql")["shapes"]}
    storm = shapes["StormEvents | where State == ? | take ?"]
    assert (storm["runs"], storm["sessions"], storm["failures"], storm["most_in_session"], storm["repeated_sessions"]) == (3, 1, 1, 3, 1)
    assert "Events | summarize count() by bin(ts, ?)" in shapes and ".create table Logs (ts:datetime, msg:string)" in shapes


def _kql_meta(runs, sessions, **values):
    return {"row_type": "meta", "runs": runs, "sessions": sessions, "failures": 4, "changes": 3, "large": 1, "sum_ms": 1000.0,
            "output_bytes": 5000, "large_bytes": 200_000, "first_ts": 1.0, "last_ts": 2.0, "computed_at": 3.0, **values}


def test_kql_shape_applies_the_evidence_rule():
    rows = [_kql_meta(19, 5), {"row_type": "failure", "failure": "syntax", "runs": 4},
            {"row_type": "shape", "shape_key": "a", "snippet": "T | take ?", "run_kind": "query", "runs": 10, "sessions": 2},
            {"row_type": "project", "project_name": "alpha", "runs": 15, "sessions": 4},
            {"row_type": "project", "project_name": "beta", "runs": 4, "sessions": 1},
            {"row_type": "coverage", "tool": "copilot-cli", "runs": 19, "unrecognised": 7, "mcp": 19, "cli": 0, "script": 0}]
    summary = insights_flows.kql(rows)["summary"]
    # 19 runs: no finding, no failure share, no top failure or shape.
    assert (summary["enough"], summary["failure_share"], summary["top_failure"], summary["top_shape"]) == (False, None, None, None)
    assert summary["small_projects"] == ["beta"] and summary["unrecognised"] == 7
    enough = insights_flows.kql([_kql_meta(40, 5), *rows[1:]])
    assert enough["summary"]["failure_share"] == 0.1 and enough["summary"]["top_failure"] == {"failure": "syntax", "runs": 4}
    assert [item["project"] for item in enough["projects"]] == ["alpha"]


# ─── The project filter, for every card of this file ───────────────────────────


def _get(store, path, **params):
    status, body = board_routes.handle_get(path, urlencode(params, doseq=True), store, store, now=200_000.0)
    assert status == 200, body
    return json.loads(body)


SEEDS = {"flows": _seed_flows, "skills": _seed_skills, "mcp": _seed_mcp, "kql": _seed_kql}


@pytest.mark.parametrize("card", sorted(SEEDS))
def test_a_card_of_a_project_equals_the_card_of_only_its_rows(kusto_tape, kusto_store, card):
    seed = SEEDS[card]
    seed(kusto_store, ALPHA)
    seed(kusto_store, BETA, prefix="x")
    only = SeededStore(kusto_tape)
    seed(only, ALPHA)
    window = {"since": 0.0, "until": 100_000.0}
    filtered = _get(kusto_store, f"/api/board/insights/{card}", **window, project=ALPHA)
    alone = _get(only, f"/api/board/insights/{card}", **window)
    everything = _get(kusto_store, f"/api/board/insights/{card}", **window)
    assert filtered["summary"] == alone["summary"]
    assert filtered["summary"] != everything["summary"]
    assert "restrict_projects" in filtered["query"]["kql"]
