"""Insights bars split by repository for the cards on what the agents use: skills, MCP servers, Kusto runs, models.

Each view splits its bars by the ranking of insights.repo_rank (rows repo_split; repo '' is every other repository),
and the shape puts the segments on each bar (``repos``). The segments of a bar sum to the bar, follow the screen's
repo_order with every other repository last, and keep to the node scope. The views run through the replay harness
(recorded against the scratch database), on invented rows.
"""

from __future__ import annotations

import json

import pytest
from kusto_replay import LOCAL_NODE

from aictl.dashboard import insights, insights_flows
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.kusto.reader import _VIEWS

PERIOD = Filters(since=0.0, until=100_000.0)
OTHER = "node-two"
ROOT = "/work/t"
REPOS = [f"{ROOT}{i}" for i in range(10)]
WORKTREE = f"{REPOS[0]}/.claude/worktrees/w1"


def _card(store, card, node=None, qualified=False):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    return body


def _local(store, card):
    return _card(store, card, node=LOCAL_NODE, qualified=True)


def _node(node):
    return {"node_id": node} if node else {}


def _session(store, sid, path, node=None, tool="claude-code"):
    store.insert("sessions", session_id=sid, tool=tool, project_path=path, project=path, started_at=10.0, ended_at=5000.0,
                 last_activity_at=5000.0, **_node(node))


def _request(store, key, sid, path, cost, ts=100.0, node=None, tool="claude-code", **values):
    store.insert("requests", dedup_key=key, session_id=sid, agent_id="", tool=tool, project_path=path, project=path, ts=ts,
                 input_tokens=10, output_tokens=5, cost_usd=cost, duration_ms=1000.0, **_node(node),
                 **{"model": "claude-opus-5-5", **values})


def _call(store, key, sid, path, ts, name, node=None, tool="claude-code", **values):
    store.insert("tool_invocations", dedup_key=key, session_id=sid, agent_id="", tool=tool, tool_name=name, project_path=path,
                 project=path, ts=ts, source="transcript", **_node(node), **values)


def _repos(store):
    """Ten repositories, one session each (s0 to s9), costing 10, 9, ... 1: r0 to r7 are ranked, r8 and r9 are "other".
    A worktree session w1 belongs to r0. On another node r9 costs the most, so in the fleet it is ranked first."""
    for i, path in enumerate(REPOS):
        _session(store, f"s{i}", path)
        _request(store, f"q{i}", f"s{i}", path, float(10 - i), prompt_id=f"p{i}")
    _session(store, "w1", WORKTREE)
    _request(store, "qw", "w1", WORKTREE, 5.0, prompt_id="pw")
    _session(store, "o9", REPOS[9], node=OTHER)
    _request(store, "qo", "o9", REPOS[9], 100.0, node=OTHER, prompt_id="po")


def _segments(bar, measure):
    return [(segment["repo"], segment[measure]) for segment in bar["repos"]]


def _sums(bar, measures):
    """The segments of each measure the bar states sum to it, in shares summing to 1; an unstated measure has none."""
    for measure in measures:
        if bar[measure] is None:
            assert all(segment[measure] is None for segment in bar["repos"]), measure
            continue
        assert sum(segment[measure] for segment in bar["repos"]) == pytest.approx(bar[measure]), measure
        if bar[measure]:
            assert sum(segment["share"][measure] for segment in bar["repos"]) == pytest.approx(1.0), measure


def _ordered(body, bar):
    """The segments follow the screen's repo_order, with every other repository last."""
    rank = {item["repo"]: place for place, item in enumerate(body["repo_order"])}
    places = [rank.get(segment["repo"], len(rank)) for segment in bar["repos"]]
    assert places == sorted(places) and all(segment["repo"] in rank or segment["repo"] == "" for segment in bar["repos"])


@pytest.mark.parametrize("card", ["skills", "mcp", "kql", "models"])
def test_the_card_is_split_and_its_view_returns_the_split_columns(card):
    # test_insight_repo_split.py checks that each card of REPO_SPLIT_CARDS carries the rank block, identical everywhere.
    assert card in insights.REPO_SPLIT_CARDS
    view = insights.CARDS[card]
    assert {"split_key", "repo"} <= set(_VIEWS[view][1].split())


# ─── Skills ────────────────────────────────────────────────────────────────────


def _use(store, key, sid, path, ts, name, prompt, node=None, tool="claude-code"):
    store.insert("skill_uses", dedup_key=key, ts=ts, session_id=sid, agent_id="", tool=tool, name=name, prompt_id=prompt,
                 trigger="agent-invoked", project_path=path, project=path, **_node(node))


def _listed(store, sid, path, name, tokens, node=None):
    store.insert("session_context_items", session_id=sid, agent_id="", kind="skills", name=name, ts=5.0, path="",
                 chars=tokens * 4, tokens=tokens, estimated=True, removed=False, tool="claude-code", project=path, **_node(node))


def _seed_skills(store):
    _repos(store)
    # kql: twice in s0 (an edit follows both in the same turn), once each in w1 (r0), s1, s8 and s9 (both "other").
    _use(store, "u0a", "s0", REPOS[0], 50.0, "kql", "p0")
    _use(store, "u0b", "s0", REPOS[0], 60.0, "kql", "p0")
    _call(store, "e0", "s0", REPOS[0], 70.0, "edit", target_kind="file", target="a.kql", is_edit=True, prompt_id="p0")
    _use(store, "uw", "w1", WORKTREE, 50.0, "kql", "pw")
    _use(store, "u1", "s1", REPOS[1], 50.0, "kql", "p1")
    _use(store, "u8", "s8", REPOS[8], 50.0, "kql", "p8")
    _use(store, "u9", "s9", REPOS[9], 50.0, "kql", "p9")
    _use(store, "uo", "o9", REPOS[9], 50.0, "kql", "po", node=OTHER)
    # lint three times in s0, so that its project (t0) has the 5 uses a project needs; review once in s2.
    for i in range(3):
        _use(store, f"ul{i}", "s0", REPOS[0], 80.0 + i, "lint", "p0")
    # never-used listed in s0 and s9.
    _use(store, "u2", "s2", REPOS[2], 50.0, "review", "p2", tool="copilot-cli")
    _listed(store, "s0", REPOS[0], "never-used", 100)
    _listed(store, "s9", REPOS[9], "never-used", 50)


def test_skills_split_uses_turn_cost_and_what_followed_by_repository(kusto_store):
    _seed_skills(kusto_store)
    body = _local(kusto_store, "skills")
    assert [item["repo"] for item in body["repo_order"]] == REPOS[:8]
    every = {item["name"]: item for item in body["skills"] + body["small_skills"]}
    kql = _skill(body, "kql")
    assert (kql["uses"], kql["cost_usd"], kql["with_turn"]) == (6, 27.0, 6)
    assert _segments(kql, "uses") == [(REPOS[0], 3), (REPOS[1], 1), ("", 2)]
    # The turns once per skill: r0's s0 (10) and w1 (5), r1 (9), r8 and r9 as "other" (2 + 1).
    assert _segments(kql, "cost_usd") == [(REPOS[0], 15.0), (REPOS[1], 9.0), ("", 3.0)]
    # Two of the six uses with a turn were followed by an edit, both in r0: its segment is 2/6 of the share 1/3.
    assert kql["after_edit"] == pytest.approx(1 / 3)
    assert _segments(kql, "after_edit") == [(REPOS[0], pytest.approx(1 / 3)), (REPOS[1], 0.0), ("", 0.0)]
    # r0 has 6 uses (3 of kql, 3 of lint): kql's segment is half of the repository's own uses.
    assert kql["repos"][0]["of_repo"]["uses"] == pytest.approx(0.5)
    (unused,) = body["unused"]
    assert _segments(unused, "list_tokens") == [(REPOS[0], 100), ("", 50)]
    tools = {item["tool"]: item for item in body["tools"]}
    assert _segments(tools["copilot-cli"], "uses") == [(REPOS[2], 1)]
    assert [(item["project"], _segments(item, "uses")) for item in body["projects"]] == [("t0", [(REPOS[0], 5)])]
    for item in [*every.values()]:
        _sums(item, insights_flows.SKILL_MEASURES)
        _ordered(body, item)
    for item in body["unused"]:
        _sums(item, ("list_tokens",))
    for item in [*body["tools"], *body["projects"]]:
        _sums(item, ("uses",))
        _ordered(body, item)
    # The skills listed per tool are distinct skills: not split.
    assert all("repos" not in item for item in body["listings"])


def _skill(body, name):
    return {item["name"]: item for item in body["skills"] + body["small_skills"]}[name]


def test_skills_split_follows_the_node_scope(kusto_store):
    _seed_skills(kusto_store)
    local = _skill(_local(kusto_store, "skills"), "kql")
    fleet_body = _card(kusto_store, "skills")
    fleet = _skill(fleet_body, "kql")
    # On this node r9 is "other"; in the fleet it is ranked first and holds both of its uses (s9 and the other node's o9).
    assert ("", 2) in _segments(local, "uses")
    assert fleet_body["repo_order"][0]["repo"] == REPOS[9] and _segments(fleet, "uses")[0] == (REPOS[9], 2)
    assert fleet["uses"] == 7
    _sums(fleet, insights_flows.SKILL_MEASURES)



# ─── MCP servers ───────────────────────────────────────────────────────────────


def _mcp(store, key, sid, path, server, tool_name, output, node=None, **values):
    _call(store, key, sid, path, 50.0, f"mcp__{server}__{tool_name}", node=node, target_kind="other", mcp_server=server,
          mcp_tool=tool_name, duration_ms=100.0, output_bytes=output, **values)


def _tools_listed(store, sid, path, name, tokens):
    store.insert("session_context_items", session_id=sid, agent_id="", kind="tools_listed", name=name, ts=5.0, path="",
                 chars=tokens * 4, tokens=tokens, estimated=True, removed=False, tool="claude-code", project=path)


def _seed_mcp(store):
    _repos(store)
    # kusto query: twice in s0 (one failed), once each in w1 (r0), s1, s8 and s9; every call has one later request.
    _mcp(store, "m0a", "s0", REPOS[0], "kusto", "query", 100)
    _mcp(store, "m0b", "s0", REPOS[0], "kusto", "query", 100, failed=True, is_error=True)
    _mcp(store, "mw", "w1", WORKTREE, "kusto", "query", 40)
    _mcp(store, "m1", "s1", REPOS[1], "kusto", "query", 30)
    _mcp(store, "m8", "s8", REPOS[8], "kusto", "query", 20)
    _mcp(store, "m9", "s9", REPOS[9], "kusto", "query", 10)
    _mcp(store, "mo", "o9", REPOS[9], "kusto", "query", 5, node=OTHER)
    _mcp(store, "m2", "s2", REPOS[2], "docs", "fetch", 7)
    # s0 lists kusto (called) and docs (not called); s9 lists docs (not called).
    _tools_listed(store, "s0", REPOS[0], "mcp__kusto__query", 40)
    _tools_listed(store, "s0", REPOS[0], "mcp__docs__fetch", 70)
    _tools_listed(store, "s9", REPOS[9], "mcp__docs__fetch", 30)


def test_mcp_splits_server_tool_project_and_listing_bars_by_repository(kusto_store):
    _seed_mcp(kusto_store)
    body = _local(kusto_store, "mcp")
    servers = {item["server"]: item for item in body["servers"] + body["small_servers"]}
    kusto = servers["kusto"]
    assert (kusto["calls"], kusto["failures"], kusto["output_bytes"], kusto["carried_bytes"]) == (6, 1, 300, 300.0)
    assert _segments(kusto, "calls") == [(REPOS[0], 3), (REPOS[1], 1), ("", 2)]
    assert _segments(kusto, "failures") == [(REPOS[0], 1), (REPOS[1], 0), ("", 0)]
    assert _segments(kusto, "output_bytes") == [(REPOS[0], 240), (REPOS[1], 30), ("", 30)]
    assert _segments(kusto, "carried_bytes") == _segments(kusto, "output_bytes")
    (query,) = kusto["calls_by_tool"]
    assert _segments(query, "calls") == _segments(kusto, "calls")
    assert _segments(servers["docs"], "sum_ms") == [(REPOS[2], 100.0)]
    listed = {item["server"]: item for item in body["listed"]}
    assert _segments(listed["docs"], "sessions") == [(REPOS[0], 1), ("", 1)]
    assert _segments(listed["docs"], "unused_tokens") == [(REPOS[0], 70), ("", 30)]
    assert _segments(listed["kusto"], "called_sessions") == [(REPOS[0], 1)]
    for item in servers.values():
        _sums(item, insights_flows.MCP_MEASURES)
        _ordered(body, item)
        for tool in item["calls_by_tool"]:
            _sums(tool, ("calls", "failures"))
    for item in body["listed"]:
        _sums(item, insights_flows.LISTED_MEASURES)
        _ordered(body, item)


def test_mcp_fleet_scope_ranks_every_node(kusto_store):
    _seed_mcp(kusto_store)
    body = _card(kusto_store, "mcp")
    kusto = {item["server"]: item for item in body["servers"] + body["small_servers"]}["kusto"]
    assert body["repo_order"][0]["repo"] == REPOS[9] and kusto["calls"] == 7
    assert _segments(kusto, "calls")[0] == (REPOS[9], 2) and _segments(kusto, "calls")[-1] == ("", 1)
    _sums(kusto, insights_flows.MCP_MEASURES)


def test_mcp_project_bars_take_their_split_rows():
    order = [{"repo": "/a", "name": "a"}]
    rows = [{"row_type": "project", "project_name": "alpha", "calls": 30, "sessions": 5, "servers": 1, "failures": 3,
             "sum_ms": 900.0, "output_bytes": 300},
            {"row_type": "repo_split", "tool": "", "split_key": "project:alpha", "repo": "/a", "calls": 20, "failures": 1,
             "sum_ms": 600.0, "output_bytes": 200},
            {"row_type": "repo_split", "tool": "", "split_key": "project:alpha", "repo": "", "calls": 10, "failures": 2,
             "sum_ms": 300.0, "output_bytes": 100}]
    (project,) = insights_flows.mcp(rows, order)["projects"]
    assert _segments(project, "calls") == [("/a", 20), ("", 10)]
    _sums(project, insights_flows.MCP_PROJECT_MEASURES)


# ─── Kusto runs ────────────────────────────────────────────────────────────────

CLUSTER = "https://help.kusto.windows.net"


def _run(store, key, sid, path, query, node=None, **values):
    _call(store, key, sid, path, 50.0, "mcp__kusto__kusto_query", node=node, target_kind="other", mcp_server="kusto",
          mcp_tool="kusto_query", duration_ms=100.0, **values)
    store.insert("tool_invocations_text", dedup_key=key, project=path, target="",
                 input=json.dumps({"query": query, "cluster": CLUSTER, "database": "Samples"}), **_node(node))


def _seed_kql(store):
    _repos(store)
    # The same shape three times in s0 (the last fails on syntax), once each in w1 (r0), s1, s8 and s9; s1's brings 200 KB.
    for i in range(3):
        _run(store, f"k0{i}", "s0", REPOS[0], f"T | take {i + 1}",
             **({"failed": True, "is_error": True, "error_summary": "Syntax error: SYN0002"} if i == 2 else {}))
    _run(store, "kw", "w1", WORKTREE, "T | take 9")
    _run(store, "k1", "s1", REPOS[1], "T | take 8", output_bytes=200_000)
    _run(store, "k8", "s8", REPOS[8], "T | take 7")
    _run(store, "k9", "s9", REPOS[9], "T | take 6")
    _run(store, "ko", "o9", REPOS[9], "T | take 5", node=OTHER)


def test_kql_splits_runs_per_route_failure_kind_target_shape_and_large_run(kusto_store):
    _seed_kql(kusto_store)
    body = _local(kusto_store, "kql")
    runs = [(REPOS[0], 4), (REPOS[1], 1), ("", 2)]
    routes = {item["route"]: item for item in body["routes"]}
    assert routes["mcp"]["runs"] == 7 and _segments(routes["mcp"], "runs") == runs
    assert routes["cli"] == {"route": "cli", "runs": 0, "repos": []}
    assert [(item["failure"], _segments(item, "runs")) for item in body["failure_kinds"]] == [("syntax", [(REPOS[0], 1)])]
    (kind,) = body["kinds"]
    assert (kind["kind"], kind["runs"]) == ("query", 7) and _segments(kind, "runs") == runs
    assert _segments(kind, "failures") == [(REPOS[0], 1), (REPOS[1], 0), ("", 0)]
    (target,) = body["targets"]
    assert (target["cluster"], target["database"]) == ("help.kusto.windows.net", "Samples") and _segments(target, "runs") == runs
    (shape,) = body["shapes"]
    assert shape["snippet"] == "T | take ?" and _segments(shape, "runs") == runs
    (large,) = body["large"]
    assert _segments(large, "output_bytes") == [(REPOS[1], 200_000)]
    for item in [*body["routes"], *body["failure_kinds"]]:
        _sums(item, ("runs",))
    for item in [*body["kinds"], *body["targets"], *body["shapes"]]:
        _sums(item, insights_flows.KQL_MEASURES)
        _ordered(body, item)


def test_kql_fleet_scope_ranks_every_node(kusto_store):
    _seed_kql(kusto_store)
    body = _card(kusto_store, "kql")
    (shape,) = body["shapes"]
    assert body["repo_order"][0]["repo"] == REPOS[9] and shape["runs"] == 8
    assert _segments(shape, "runs") == [(REPOS[9], 2), (REPOS[0], 4), (REPOS[1], 1), ("", 1)]
    _sums(shape, insights_flows.KQL_MEASURES)


def test_kql_project_bars_take_their_split_rows():
    order = [{"repo": "/a", "name": "a"}]
    rows = [{"row_type": "project", "project_name": "alpha", "runs": 6, "sessions": 3, "failures": 1},
            {"row_type": "repo_split", "tool": "", "split_key": "project:alpha", "repo": "/a", "runs": 4, "failures": 1},
            {"row_type": "repo_split", "tool": "", "split_key": "project:alpha", "repo": "/b", "runs": 2, "failures": 0}]
    (project,) = insights_flows.kql(rows, order)["projects"]
    # A root the screen's order does not hold is "other".
    assert _segments(project, "runs") == [("/a", 4), ("", 2)]
    _sums(project, insights_flows.KQL_MEASURES)


# ─── Models ────────────────────────────────────────────────────────────────────


def _seed_models(store):
    _repos(store)
    # Ten more requests in s1, so that the model has the 20 priced requests a per-request figure needs.
    for i in range(10):
        _request(store, f"q1-{i}", "s1", REPOS[1], 0.01, ts=101.0 + i, prompt_id="p1")


def _model(body, tool="claude-code", name="claude-opus-5-5"):
    return {model["model"]: model for item in body["tools"] if item["tool"] == tool for model in item["models"]}[name]


def test_models_split_requests_and_per_request_figures_by_repository(kusto_store):
    _seed_models(kusto_store)
    body = _local(kusto_store, "models")
    model = _model(body)
    assert (model["requests"], model["priced"]) == (21, 21)
    assert model["cost_per_request"] == pytest.approx(60.1 / 21)
    assert _segments(model, "requests") == [(REPOS[0], 2), (REPOS[1], 11), *[(repo, 1) for repo in REPOS[2:8]], ("", 2)]
    # A segment of a per-request figure is the repository's sum over all the model's requests: r0's 10 + 5 of 60.1.
    cost = dict(_segments(model, "cost_per_request"))
    assert cost[REPOS[0]] == pytest.approx(15 / 21) and cost[""] == pytest.approx(3 / 21)
    assert dict(_segments(model, "input_per_request"))[REPOS[1]] == pytest.approx(110 / 21)
    # r0's requests are all of this model: its share of the repository's own requests is 1.
    assert model["repos"][0]["of_repo"]["requests"] == pytest.approx(1.0)
    _sums(model, insights.MODEL_MEASURES)
    _ordered(body, model)


def test_models_fleet_scope_ranks_every_node(kusto_store):
    _seed_models(kusto_store)
    body = _card(kusto_store, "models")
    model = _model(body)
    assert body["repo_order"][0]["repo"] == REPOS[9] and model["requests"] == 22
    assert _segments(model, "requests")[0] == (REPOS[9], 2)
    _sums(model, insights.MODEL_MEASURES)


def test_models_failure_share_is_split_into_the_parts_of_each_repository():
    order = [{"repo": "/a", "name": "a"}]
    rows = [{"row_type": "model", "tool": "t", "model": "m", "requests": 40, "sessions": 5, "priced": 40, "cost_usd": 8.0,
             "cache_reported": 40, "input_tokens": 400, "output_tokens": 200, "calls": 200, "failures": 20,
             "call_sessions": 5, "exit_unknown": 0},
            {"row_type": "repo_split", "tool": "t", "split_key": "m", "repo": "/a", "requests": 30, "priced": 30,
             "cost_usd": 6.0, "cache_reported": 30, "input_tokens": 300, "output_tokens": 150, "calls": 150, "failures": 15},
            {"row_type": "repo_split", "tool": "t", "split_key": "m", "repo": "", "requests": 10, "priced": 10,
             "cost_usd": 2.0, "cache_reported": 10, "input_tokens": 100, "output_tokens": 50, "calls": 50, "failures": 5}]
    (tool,) = insights.model_report(rows, order)["tools"]
    (model,) = tool["models"]
    assert model["failure_share"] == pytest.approx(0.1)
    assert _segments(model, "failure_share") == [("/a", pytest.approx(0.075)), ("", pytest.approx(0.025))]
    assert _segments(model, "cost_per_request") == [("/a", pytest.approx(0.15)), ("", pytest.approx(0.05))]
    # The model reports no prompt without the cache split, and no cache read: those bars and their segments are None.
    assert model["unsplit_prompt_per_request"] is None and model["repos"][0]["unsplit_prompt_per_request"] is None
    _sums(model, insights.MODEL_MEASURES)
