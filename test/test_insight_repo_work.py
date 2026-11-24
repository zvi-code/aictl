"""Insights bars split by repository: the work cards (Flows, Work per instruction, Verified before commit, Where session
time goes, What the agents changed).

Each card's view splits its bars by the repository rank of insights.repo_rank (rows repo_split; repo '' is every other
repository), and its shape puts the segments on the bar (``repos``). The segments of a bar sum to the bar, follow the
screen's repo_order with every other repository last, and keep to the node scope. A bar that is one repository's own
is one segment. The views run through the replay harness (recorded against the scratch database), on invented rows.
"""

from __future__ import annotations

import pytest
from kusto_replay import LOCAL_NODE

from aictl.dashboard import insights, insights_work
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.kusto.reader import _VIEWS

PERIOD = Filters(since=0.0, until=100_000.0)
OTHER = "node-two"
ROOT = "/work/r"
REPOS = [f"{ROOT}{i}" for i in range(10)]
WORKTREE = f"{REPOS[0]}/.claude/worktrees/w1"
WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet", "kilo", "lima", "mike",
         "november", "oscar", "papa"]
CARDS = ("flows", "autonomy", "verified", "durations", "changes")


def _card(store, card, node=None, qualified=False):
    status, body = insights.insight(card, PERIOD, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    return body


def _work(store, n, sid, path, cost, *, commit, late=False, node=None):
    """One session of work: a prompt, a priced request, read and edit three times in turn (a cycle), a test run, a
    commit when asked, a file write, then a second prompt after a wait (over 5 minutes when late) and a reply."""
    at = {"node_id": node} if node else {}
    word = WORDS[n]

    def call(key, ts, name, kind, target, **values):
        store.insert("tool_invocations", dedup_key=f"{sid}-{key}", session_id=sid, agent_id="", tool="claude-code", tool_name=name,
                     project_path=path, project=path, ts=ts, target_kind=kind, target=target,
                     command_name=target.split(" ")[0] if kind == "command" else "", duration_ms=500.0, is_error=0, failed=False,
                     **at, **values)

    store.insert("sessions", session_id=sid, tool="claude-code", project_path=path, project=path, started_at=10.0, ended_at=5000.0,
                 last_activity_at=5000.0, **at)
    store.insert("session_prompts", dedup_key=f"{sid}-p1", session_id=sid, agent_id="", tool="claude-code", project_path=path,
                 project=path, ts=50.0, text=f"{word} please fix the parser bug in the importer module", **at)
    store.insert("requests", dedup_key=f"{sid}-q1", session_id=sid, agent_id="", tool="claude-code", model="claude-opus-5-5",
                 project_path=path, project=path, ts=100.0, input_tokens=10, output_tokens=5, cost_usd=cost, duration_ms=1000.0, **at)
    for i, ts in enumerate((105.0, 111.0, 113.0)):
        call(f"r{i}", ts, "Read", "file", "src/m.py")
    for i, ts in enumerate((110.0, 112.0, 114.0)):
        call(f"e{i}", ts, "Edit", "file", "src/m.py", is_edit=True)
    call("t", 120.0, "Bash", "command", "python -m pytest -q", is_test_run=True)
    if commit:
        call("c", 130.0, "Bash", "command", "git commit -m work")
    store.insert("file_write_events", dedup_key=f"{sid}-w", session_id=sid, tool="claude-code", tool_name="Edit", operation="edit",
                 path=f"{path}/src/m.py", project_path=path, project=path, ts=110.0, actor="agent", lines_added=3, lines_removed=1, **at)
    store.insert("session_turns", session_id=sid, prompt_id=f"{sid}-t1", ts=50.0, ended_at=140.0, origin="human", project=path,
                 project_path=path, tool="claude-code", **at)
    second = 1000.0 if late else 200.0
    store.insert("session_prompts", dedup_key=f"{sid}-p2", session_id=sid, agent_id="", tool="claude-code", project_path=path,
                 project=path, ts=second, text=f"{word} now the next step of the plan", **at)
    store.insert("requests", dedup_key=f"{sid}-q2", session_id=sid, agent_id="", tool="claude-code", model="claude-opus-5-5",
                 project_path=path, project=path, ts=second + 10, input_tokens=10, output_tokens=5, cost_usd=0.0, duration_ms=1000.0,
                 **at)


def _seed(store):
    # Ten repositories, one session each, costing 10, 9, ... 1: r0 to r7 are ranked, r8 and r9 are "other". Even
    # sessions commit; r1's waits run over 5 minutes.
    for i, path in enumerate(REPOS):
        _work(store, i, f"s{i}", path, float(10 - i), commit=i % 2 == 0, late=i == 1)
    # A worktree session belongs to its repository r0 (the folder above .claude/worktrees/<name>).
    _work(store, 10, "w1", WORKTREE, 5.0, commit=True)
    # Four more sessions in r1 at no cost, so the project r1 has 5 sessions (a project bar is drawn from 5).
    for i in range(4):
        _work(store, 11 + i, f"x{i}", REPOS[1], 0.0, commit=False)
    # Another node: r9 costs the most there, so in the fleet it is ranked first.
    _work(store, 15, "o9", REPOS[9], 100.0, commit=True, node=OTHER)


def _sums(bar, measures, field="repos"):
    """The segments of each measure sum to the bar's own value; a measure the bar does not report is None in each."""
    for measure in measures:
        if bar.get(measure) is None:
            assert all(segment[measure] is None for segment in bar[field]), measure
            continue
        assert sum(segment[measure] for segment in bar[field]) == pytest.approx(bar[measure]), measure


def _ordered(bar, order, field="repos"):
    """The segments follow the screen's order of repositories, every other repository last."""
    ranked = [item["repo"] for item in order]
    seen = [segment["repo"] for segment in bar[field]]
    assert seen == [repo for repo in [*ranked, ""] if repo in seen]


def _of(bar, field="repos"):
    return {segment["repo"]: segment for segment in bar[field]}


def test_the_work_views_carry_the_rank_block_and_declare_their_split_columns():
    for card in CARDS:
        assert card in insights.REPO_SPLIT_CARDS
        columns = _VIEWS[insights.CARDS[card]][1].split()
        assert {"split_key", "repo"} <= set(columns), card


def test_flows_splits_endings_steps_paths_projects_cycles_and_tools(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "flows", node=LOCAL_NODE, qualified=True)
    order = body["repo_order"]
    assert [item["repo"] for item in order] == REPOS[:8]
    committed, changed = body["endings"]["committed"], body["endings"]["changed"]
    assert (committed["sessions"], changed["sessions"]) == (6, 9)
    for ending in (committed, changed):
        _sums(ending, ("sessions", "cost_usd"))
        _ordered(ending, order)
        for item in ending["last_steps"]:
            _sums(item, ("sessions", "cost_usd"))
    # r0 committed twice (its own folder and the worktree); r8 is "other"; r9 changed and is "other" too.
    assert (_of(committed)[REPOS[0]]["sessions"], _of(committed)[""]["sessions"]) == (2, 1)
    assert _of(committed)[REPOS[0]]["cost_usd"] == pytest.approx(15.0)
    assert _of(committed)[REPOS[0]]["of_repo"]["sessions"] == pytest.approx(1.0)
    assert _of(changed)[REPOS[1]]["sessions"] == 5 and _of(changed)[""]["sessions"] == 1
    (project,) = body["projects"]
    # The project bar counts its sessions by how they ended (the view once counted them after blanking the outcome).
    assert (project["sessions"], project["committed"], project["changed"], project["no_change"]) == (5, 0, 5, 0)
    _sums(project, ("sessions", "committed", "changed", "no_change"))
    assert project["project"] == "r1" and [(s["repo"], s["sessions"], s["changed"]) for s in project["repos"]] == [(REPOS[1], 5, 5)]
    for path in [*body["first_paths"], *body["last_paths"]]:
        _sums(path, ("sessions",))
        _ordered(path, order)
    assert body["cycles"]
    for cycle in body["cycles"]:
        _sums(cycle, ("seconds",))
    (tool,) = body["tools"]
    _sums(tool, ("calls", "seconds"))
    _ordered(tool, order)
    assert _of(tool)[REPOS[1]]["calls"] == 5 * 7 and _of(tool)[""]["calls"] == 8 + 7


def test_work_per_instruction_splits_each_tools_answered_waits(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "autonomy", node=LOCAL_NODE, qualified=True)
    (tool,) = [tool for tool in body["tools"] if tool["tool"] == "claude-code"]
    assert (tool["waits"], tool["over_5m"]) == (15, 1)
    _sums(tool, insights.AUTONOMY_SPLIT)
    _ordered(tool, body["repo_order"])
    assert (_of(tool)[REPOS[1]]["waits"], _of(tool)[REPOS[1]]["over_5m"]) == (5, 1)
    assert _of(tool)[""]["waits"] == 2


def test_verified_commits_splits_the_commit_bar_and_the_session_bar(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "verified", node=LOCAL_NODE, qualified=True)
    (tool,) = [tool for tool in body["tools"] if tool["tool"] == "claude-code"]
    assert tool["commits"] == 6 and tool["passed"] is None
    _sums(tool, insights.VERIFIED_SPLIT)
    _sums(tool, insights.VERIFIED_SESSION_SPLIT, "session_repos")
    _ordered(tool, body["repo_order"])
    _ordered(tool, body["repo_order"], "session_repos")
    assert (_of(tool)[REPOS[0]]["commits"], _of(tool)[""]["commits"]) == (2, 1)
    assert _of(tool, "session_repos")[REPOS[1]]["edit_sessions"] == 5


def test_durations_splits_tool_and_model_time_and_gives_each_repository_its_own_bar(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "durations", node=LOCAL_NODE, qualified=True)
    order = body["repo_order"]
    for tool in body["tools"]:
        _sums(tool, ("total_ms",))
        _ordered(tool, order)
    reads = next(tool for tool in body["tools"] if tool["name"] == "Read")
    assert _of(reads)[REPOS[0]]["total_ms"] == 2 * 3 * 500.0 and _of(reads)[""]["total_ms"] == 2 * 3 * 500.0
    # Both sessions of r0 commit: 8 calls of 500 ms each, of which Read is 3.
    assert _of(reads)[REPOS[0]]["of_repo"]["total_ms"] == pytest.approx(3 / 8)
    for model in body["models"]:
        _sums(model, ("total_ms",))
    for repo in body["repos"]:
        _sums(repo, ("agent_ms", "wait_ms", "model_ms", "tool_ms"))
        assert [segment["repo"] for segment in repo["repos"]] == [repo["repo"] if repo["repo"] in REPOS[:8] else ""]


def test_changes_splits_bins_kinds_files_and_repository_bars(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "changes", node=LOCAL_NODE, qualified=True)
    (day,) = body["bins"]
    assert (day["commits"], day["writes"]) == (6, 15)
    _sums(day, ("commits", "writes"))
    _ordered(day, body["repo_order"])
    assert (_of(day)[REPOS[1]]["writes"], _of(day)[""]["writes"], _of(day)[""]["commits"]) == (5, 2, 1)
    source = body["summary"]["kind_repos"]["source"]
    assert sum(segment["files"] for segment in source) == body["summary"]["kinds"]["source"]
    for repo in body["repos"]:
        _sums(repo, insights_work.CHANGE_SPLIT)


def test_fleet_scope_ranks_and_splits_every_node(kusto_store):
    _seed(kusto_store)
    for card in CARDS:
        body = _card(kusto_store, card)
        assert [item["repo"] for item in body["repo_order"]] == [REPOS[9], *REPOS[:7]], card
    tool = next(tool for tool in _card(kusto_store, "verified")["tools"] if tool["tool"] == "claude-code")
    # r9 commits on the other node; r7 (now 8th) is ranked, r8 is "other".
    assert tool["commits"] == 7 and _of(tool)[REPOS[9]]["commits"] == 1 and _of(tool)[""]["commits"] == 1
    _sums(tool, insights.VERIFIED_SPLIT)
    flows = _card(kusto_store, "flows")
    assert _of(flows["endings"]["committed"])[REPOS[9]]["cost_usd"] == pytest.approx(100.0)


def test_a_shape_without_an_order_puts_every_segment_in_other():
    rows = [{"row_type": "tool", "tool": "t", "commits": 3, "edit_sessions": 1, "untested_sessions": 0},
            {"row_type": "repo_split", "tool": "t", "split_key": "commits", "repo": "/a", "commits": 2},
            {"row_type": "repo_split", "tool": "t", "split_key": "commits", "repo": "", "commits": 1}]
    (tool,) = insights.verified_commits(rows)["tools"]
    assert [(segment["repo"], segment["commits"]) for segment in tool["repos"]] == [("", 3)]
    assert tool["session_repos"] == []
