"""Insights bars split by repository: one order of repositories for the screen, and each bar's segments from its view.

insights.repo_rank ranks the repositories of the period by the list-price cost of their requests; every card answer
carries the first 8 as repo_order and the rest summed. A card's view splits each bar by the same ranking (rows
repo_split; repo '' is every other repository), and the shape puts the segments on the bar. The segments of a bar sum
to the bar. The views run through the replay harness (recorded against the scratch database), on invented rows.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlencode

import pytest
from kusto_replay import LOCAL_NODE

from aictl.dashboard import board_routes, insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.base import ReadResult, StoreError
from aictl.stores.kusto.reader import _CACHE_TTL_S, _VIEWS

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
PERIOD = Filters(since=0.0, until=100_000.0)
OTHER = "node-two"
ROOT = "/work/r"
REPOS = [f"{ROOT}{i}" for i in range(10)]
WORKTREE = f"{REPOS[0]}/.claude/worktrees/w1"


def _card(store, card, node=None, qualified=False):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    return body


def _session(store, sid, path, node=None, tool="claude-code"):
    store.insert("sessions", session_id=sid, tool=tool, project_path=path, project=path, started_at=10.0, ended_at=5000.0,
                 last_activity_at=5000.0, **({"node_id": node} if node else {}))


def _request(store, key, sid, path, cost, ts=100.0, duration=1000.0, node=None, tool="claude-code"):
    store.insert("requests", dedup_key=key, session_id=sid, agent_id="", tool=tool, model="claude-opus-5-5", project_path=path,
                 project=path, ts=ts, input_tokens=10, output_tokens=5, cost_usd=cost, duration_ms=duration,
                 **({"node_id": node} if node else {}))


def _call(store, key, sid, path, ts, output, program="pytest", duration=500.0, tool="claude-code", name="Bash"):
    store.insert("tool_invocations", dedup_key=key, session_id=sid, agent_id="", tool=tool, tool_name=name, project_path=path,
                 project=path, ts=ts, target_kind="command", target=f"{program} -q", command_name=program,
                 duration_ms=duration, output_bytes=output, is_error=0)


def _seed(store):
    # Ten repositories, one session each, costing 10, 9, ... 1: r0 to r7 are ranked, r8 and r9 are "other".
    for i, path in enumerate(REPOS):
        _session(store, f"s{i}", path)
        _request(store, f"q{i}", f"s{i}", path, float(10 - i))
    # A worktree session belongs to its repository r0 (the folder above .claude/worktrees/<name>).
    _session(store, "w1", WORKTREE)
    _request(store, "qw", "w1", WORKTREE, 5.0)
    # Results before the session's request (one later request each); a call with no size is not split.
    _call(store, "c0", "s0", REPOS[0], 50.0, 100, program="pytest", duration=1000.0)
    _call(store, "cw", "w1", WORKTREE, 50.0, 40, program="pytest", duration=500.0)
    _call(store, "c1", "s1", REPOS[1], 50.0, 30, program="cargo", duration=2000.0)
    _call(store, "c8", "s8", REPOS[8], 50.0, 20, program="pytest", duration=300.0)
    _call(store, "c9", "s9", REPOS[9], 50.0, 10, program="cargo", duration=200.0, name="Read")
    _call(store, "cn", "s2", REPOS[2], 50.0, None, program="pytest", duration=100.0)
    # Another node: r9 costs the most there, so in the fleet it is ranked first.
    _session(store, "o9", REPOS[9], node=OTHER)
    _request(store, "qo", "o9", REPOS[9], 100.0, node=OTHER)


def _bars_sum(bar, measures):
    for measure in measures:
        if bar[measure] is None:
            assert bar["repos"] == [] or all(segment[measure] is None for segment in bar["repos"])
            continue
        assert sum(segment[measure] for segment in bar["repos"]) == pytest.approx(bar[measure]), measure
        assert sum(segment["share"][measure] for segment in bar["repos"]) == pytest.approx(1.0)


def test_the_rank_view_is_registered_cached_and_carries_the_shared_blocks():
    assert _VIEWS["insights.repo_rank"][0].split() == ["all_nodes", "requested_node", "since", "until"]
    assert 0 < _CACHE_TTL_S["insights.repo_rank"] <= 300
    # One definition of a repository and of the rank: every view that carries a block carries the same text.
    for name in ("repository map", "repository rank"):
        block = re.compile(rf"// <{name}>.*?// </{name}>", re.S)
        texts = {path.name: match.group(0) for path in QUERIES.glob("*.kql") if (match := block.search(path.read_text()))}
        assert len(set(texts.values())) == 1, name
        if name == "repository rank":
            assert set(texts) >= {"insights.repo_rank.kql", "insights.context_carry.kql", "insights.time_split.kql"}
    # Each card that splits its bars carries the rank block, so its "other" is the rank view's "other".
    for card in insights.REPO_SPLIT_CARDS:
        assert "// <repository rank>" in (QUERIES / f"{insights.CARDS[card]}.kql").read_text()


def test_repositories_are_ranked_by_cost_with_every_other_one_summed(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "carry", node=LOCAL_NODE, qualified=True)
    order = body["repo_order"]
    assert [item["repo"] for item in order] == REPOS[:8]
    assert [item["name"] for item in order] == [f"r{i}" for i in range(8)]
    # r0 holds its worktree session: 10 + 5.
    assert (order[0]["cost_usd"], order[0]["sessions"], order[0]["requests"]) == (15.0, 2, 2)
    assert body["repo_others"] == {"repos": 2, "cost_usd": 3.0, "requests": 2, "sessions": 2}
    # Every card answer carries the same order.
    assert _card(kusto_store, "pause", node=LOCAL_NODE, qualified=True)["repo_order"] == order


def test_fleet_scope_ranks_every_node(kusto_store):
    _seed(kusto_store)
    order = _card(kusto_store, "carry")["repo_order"]
    assert [item["repo"] for item in order] == [REPOS[9], *REPOS[:7]]
    assert order[0]["cost_usd"] == 101.0 and order[0]["sessions"] == 2


def test_context_carry_splits_each_bar_by_repository_and_the_segments_sum_to_the_bar(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "carry", node=LOCAL_NODE, qualified=True)
    names = {row["tool_name"]: row for row in body["tool_names"]}
    bash = names["Bash"]
    assert (bash["output_bytes"], bash["carried_bytes"]) == (190, 190)
    assert [(segment["repo"], segment["name"], segment["output_bytes"]) for segment in bash["repos"]] == [
        (REPOS[0], "r0", 140), (REPOS[1], "r1", 30), ("", None, 20)]
    first = bash["repos"][0]
    assert first["share"]["output_bytes"] == pytest.approx(140 / 190)
    # r0's results are all on Bash: its share of the repository's own total is 1. r8's 20 are half of "other".
    assert first["of_repo"]["output_bytes"] == pytest.approx(1.0)
    assert bash["repos"][-1]["of_repo"]["output_bytes"] == pytest.approx(20 / 30)
    # A repository outside the 8 (r9) is in "other", and is the whole of the Read bar.
    assert [(segment["repo"], segment["output_bytes"]) for segment in names["Read"]["repos"]] == [("", 10)]
    for row in [*body["tool_names"], *body["tools"]]:
        _bars_sum(row, insights.CARRY_MEASURES)
    (tool,) = body["tools"]
    assert [segment["repo"] for segment in tool["repos"]] == [REPOS[0], REPOS[1], ""]


def test_time_split_splits_tool_time_and_program_time_by_repository(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "time", node=LOCAL_NODE, qualified=True)
    (tool,) = body["tools"]
    assert tool["time_ms"] == tool["model_ms"] + tool["tool_ms"] == 11_000.0 + 4_100.0
    _bars_sum(tool, insights.TIME_MEASURES)
    by_repo = {segment["repo"]: segment for segment in tool["repos"]}
    assert [segment["repo"] for segment in tool["repos"]] == [*REPOS[:8], ""]
    assert (by_repo[REPOS[0]]["model_ms"], by_repo[REPOS[0]]["tool_ms"]) == (2000.0, 1500.0)
    assert by_repo[""]["time_ms"] == 2000.0 + 500.0
    programs = {row["program"]: row for row in body["programs"] if row["group"] == "program"}
    assert [(segment["repo"], segment["duration_ms"]) for segment in programs["pytest"]["repos"]] == [
        (REPOS[0], 1500.0), (REPOS[2], 100.0), ("", 300.0)]
    for row in body["programs"]:
        _bars_sum(row, ("duration_ms",))
    # Only the programs shown are split: a repository's own total of program time is not known.
    assert all(segment["of_repo"]["duration_ms"] is None for segment in programs["cargo"]["repos"])


def test_the_project_filter_ranks_and_splits_the_chosen_folders_only(kusto_store):
    _seed(kusto_store)
    status, raw = board_routes.handle_get("/api/board/insights/carry", urlencode({"since": 0, "until": 100_000, "project": REPOS[1]}),
                                          kusto_store, kusto_store, now=200_000.0)
    body = json.loads(raw)
    assert status == 200 and [item["repo"] for item in body["repo_order"]] == [REPOS[1]] and body["repo_others"] is None
    assert [(segment["repo"], segment["output_bytes"]) for row in body["tool_names"] for segment in row["repos"]] == [(REPOS[1], 30)]


class _FailingRank:
    def read(self, view, params):
        if view == "insights.repo_rank":
            raise StoreError("Kusto view insights.repo_rank failed")
        return ReadResult([{"row_type": "tool_name", "tool": "t", "tool_name": "Bash", "calls": 1, "output_bytes": 4,
                            "carried_bytes": 4.0},
                           {"row_type": "repo_split", "tool": "t", "split_key": "Bash", "repo": "/a", "output_bytes": 4,
                            "carried_bytes": 4.0}])


def test_a_failed_rank_read_leaves_the_bars_whole_in_one_other_segment():
    status, body = insights.insight("carry", PERIOD, 1.0, history=HistoryScope(_FailingRank(), None))
    assert status == 200 and body["repo_order"] == [] and body["repo_others"] is None
    assert [(segment["repo"], segment["output_bytes"]) for segment in body["tool_names"][0]["repos"]] == [("", 4)]


def test_attach_repos_folds_a_root_the_order_does_not_hold_into_other_and_skips_unreported_measures():
    order = [{"repo": "/a", "name": "a"}]
    rows = [{"repo": "/a", "output_bytes": 5, "carried_bytes": 1}, {"repo": "/b", "output_bytes": 2, "carried_bytes": 1},
            {"repo": "", "output_bytes": 3, "carried_bytes": 0}]
    bar = insights.attach_repos({"output_bytes": 10, "carried_bytes": None}, rows, insights.CARRY_MEASURES, order)
    assert [(segment["repo"], segment["output_bytes"], segment["carried_bytes"]) for segment in bar["repos"]] == [
        ("/a", 5, None), ("", 5, None)]
    assert bar["repos"][1]["share"] == {"output_bytes": 0.5, "carried_bytes": None}
    assert insights.attach_repos({"output_bytes": None, "carried_bytes": None}, rows, insights.CARRY_MEASURES, order)["repos"] == []
