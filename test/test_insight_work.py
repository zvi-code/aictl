"""The work cards: what each repository cost and produced, where the time went, what was changed.

Each card reads one view on invented rows (replayed; recorded against the scratch database). Folders group into
repositories by the evidence the store holds; a repository with too little data is marked small and never leads
the finding; the page's project filter and the fleet scope apply.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlencode

from aictl.dashboard import board_routes, insights, insights_work
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.kusto.reader import _CACHE_TTL_S, _VIEWS

QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"
APP = "/work/app"
WORKTREE = "/work/app/.claude/worktrees/w1"
SUB = "/work/app/sub"
SCRATCH = "/tmp/scratch"
OTHER = "node-two"
NEWER = "2026-02-01"
PERIOD = Filters(since=0.0, until=100_000.0)
LOOP = "Run the nightly loop over the backlog items"


def _card(store, card, filters=PERIOD, node=None, qualified=False):
    status, body = insights.insight(card, filters, 200_000.0, history=HistoryScope(store.history_store.reader, node, qualified))
    assert status == 200
    assert body["view"] == insights.CARDS[card]
    return body


def _session(store, sid, path, tool="copilot-cli", start=10.0, node=None, branch="", **values):
    store.insert("sessions", session_id=sid, tool=tool, project_path=path, project=path, started_at=start, ended_at=start + 5000,
                 last_activity_at=start + 5000, git_branch=branch, **({"node_id": node} if node else {}), **values)


def _requests(store, sid, path, n, cost, tool="copilot-cli", start=100.0, node=None, model="gpt-5", **values):
    for i in range(n):
        store.insert("requests", dedup_key=f"{node or ''}{sid}-r{i}", session_id=sid, tool=tool, model=model, project_path=path,
                     project=path, ts=start + i, input_tokens=10, output_tokens=5, cost_usd=cost, duration_ms=1000.0,
                     **({"node_id": node} if node else {}), **values)


def _call(store, key, sid, path, ts, name="bash", target="", kind="command", tool="copilot-cli", failed=False, **values):
    store.insert("tool_invocations", dedup_key=key, session_id=sid, tool=tool, tool_name=name, project_path=path, project=path,
                 ts=ts, target_kind=kind, target=target, command_name=target.split(" ")[0] if target else "", is_error=failed,
                 failed=failed, duration_ms=100.0, **values)


def _write(store, key, sid, path, ts, file, added=3, removed=1):
    store.insert("file_write_events", dedup_key=key, session_id=sid, tool="copilot-cli", tool_name="edit", operation="edit",
                 path=file, project_path=path, project=path, ts=ts, actor="agent", lines_added=added, lines_removed=removed)


def _prompt(store, sid, path, text, ts=50.0, tool="copilot-cli"):
    store.insert("session_prompts", dedup_key=f"{sid}-p", session_id=sid, agent_id="", tool=tool, project_path=path,
                 project=path, ts=ts, text=text)


def _seed(store):
    # The app repository: its own folder (a git branch recorded), a worktree folder, a sub-folder the node's Index found.
    _session(store, "s1", APP, tool="claude-code", branch="main")
    _requests(store, "s1", APP, 30, 1.0, tool="claude-code", model="claude-opus-5.5")
    _call(store, "c1", "s1", APP, 200.0, name="Edit", target="src/a.py", kind="file", tool="claude-code", is_edit=True)
    _call(store, "c2", "s1", APP, 210.0, name="Bash", target="git add -A && git commit -m one", tool="claude-code")
    _call(store, "c3", "s1", APP, 220.0, name="Bash", target="git commit -m two", tool="claude-code", failed=True)
    _call(store, "c4", "s1", APP, 230.0, name="Bash", target='echo "git commit"', tool="claude-code")
    _call(store, "c5", "s1", APP, 240.0, name="Bash", target="python -m pytest", tool="claude-code", is_test_run=True)
    _call(store, "c6", "s1", APP, 250.0, name="Read", target="src/b.py", kind="file", tool="claude-code", failed=True)
    store.insert("session_turns", session_id="s1", prompt_id="t1", ts=100.0, ended_at=400.0, origin="human", project=APP,
                 project_path=APP, tool="claude-code")
    _prompt(store, "s1", APP, "Fix the parser bug in the importer please", tool="claude-code")
    _session(store, "s2", WORKTREE)
    _requests(store, "s2", WORKTREE, 25, 2.0)
    _write(store, "w1", "s2", WORKTREE, 1100.0, "src/x.py")
    _write(store, "w2", "s2", WORKTREE, 1200.0, "src/x.py", added=None, removed=None)
    _write(store, "w3", "s2", WORKTREE, 1300.0, "tests/test_x.py")
    store.insert("session_turns", session_id="s2", prompt_id="t2", ts=1000.0, ended_at=1600.0, origin="human", project=WORKTREE,
                 project_path=WORKTREE, tool="copilot-cli")
    _prompt(store, "s2", WORKTREE, "<scheduled-task name=nightly>")
    _session(store, "s3", SUB)
    _requests(store, "s3", SUB, 1, 0.5)
    _prompt(store, "s3", SUB, LOOP)
    store.insert("maintenance_state", key="index_breakdown", value=500.0, project="",
                 text=json.dumps({"projects": [{"path": SUB, "git_root": APP, "worktree_of": ""}]}))
    # Another node: a session in the same repository; a request after the period and a deleted one do not count.
    _session(store, "s6", APP, tool="claude-code", node=OTHER)
    _requests(store, "s6", APP, 5, 1.0, tool="claude-code", node=OTHER, model="claude-opus-5.5")
    store.insert("requests", dedup_key="late", session_id="s6", tool="claude-code", model="claude-opus-5.5", project_path=APP,
                 project=APP, node_id=OTHER, ts=150_000.0, input_tokens=10, cost_usd=100.0)
    store.insert("requests", dedup_key=f"{OTHER}s6-r0", session_id="s6", tool="claude-code", ts=100.0, project=APP,
                 node_id=OTHER, _deleted=True, _v=NEWER)
    # A folder that is no repository: two sessions a loop started with the same prompt as s3.
    for sid in ("s4", "s5"):
        _session(store, sid, SCRATCH)
        _requests(store, sid, SCRATCH, 2, 0.1)
        _prompt(store, sid, SCRATCH, LOOP)
    # A session with no request and no call in the period does not count.
    _session(store, "s7", SCRATCH)


def _repos(body):
    return {repo["repo"]: repo for repo in body["repos"]}


def test_every_work_view_is_registered_cached_and_bounded():
    for card, view in insights_work.CARDS.items():
        assert insights.CARDS[card] == view and card in insights.SHAPES and card in insights.READS
        assert _VIEWS[view][0].split()[:4] == ["all_nodes", "requested_node", "since", "until"]
        assert 0 < _CACHE_TTL_S[view] <= 300


def test_every_work_view_carries_the_same_repository_map():
    block = re.compile(r"// <repository map>.*?// </repository map>", re.S)
    texts = {view: block.search((QUERIES / f"{view}.kql").read_text()) for view in insights_work.CARDS.values()}
    assert all(texts.values())
    assert len({match.group(0) for match in texts.values()}) == 1


def test_repositories_group_folders_and_count_what_each_produced(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "repos")
    repos = _repos(body)
    assert set(repos) == {APP, SCRATCH}
    app = repos[APP]
    assert (app["kind"], app["projects"], app["nodes"], app["sessions"]) == ("repository", 3, 2, 4)
    assert (app["requests"], app["cost_usd"], app["small"]) == (60, 84.5, False)
    assert (app["commits"], app["files"], app["writes"], app["lines_added"], app["lines_removed"], app["lines_unknown"]) == (
        1, 2, 3, 6, 2, 1)
    assert (app["calls"], app["failed"], app["test_runs"], app["idle_sessions"]) == (6, 2, 1, 2)
    assert (app["scripted"], app["person"], app["unclassified"]) == (2, 1, 1)
    assert app["agent_ms"] == 900_000.0
    assert app["cost_per_commit"] is None and app["cost_per_file"] is None
    assert [model["model"] for model in app["models"]] == ["claude-opus-5-5", "gpt-5"]
    assert [session["session_id"] for session in app["top_sessions"]] == ["s2", "s1", "s6"]
    assert sum(bin_["cost_usd"] for bin_ in app["bins"]) == 84.5 and sum(bin_["commits"] for bin_ in app["bins"]) == 1
    scratch = repos[SCRATCH]
    assert (scratch["kind"], scratch["sessions"], scratch["scripted"], scratch["small"]) == ("folder", 2, 2, True)
    summary = body["summary"]
    assert summary["top"]["repo"] == APP and round(summary["top"]["cost_share"], 4) == round(84.5 / 84.9, 4)
    assert summary["small"] == ["scratch"] and summary["folders"] == 1 and summary["sessions"] == 6


def test_a_repository_with_too_little_data_never_leads_the_finding(kusto_store):
    _session(kusto_store, "big", SCRATCH)
    _requests(kusto_store, "big", SCRATCH, 10, 50.0)
    _session(kusto_store, "many", APP, branch="main")
    _requests(kusto_store, "many", APP, 60, 0.1)
    body = _card(kusto_store, "repos")
    repos = _repos(body)
    assert repos[SCRATCH]["small"] and not repos[APP]["small"]
    assert body["repos"][0]["repo"] == SCRATCH  # still listed first by spend
    assert body["summary"]["top"]["repo"] == APP and body["summary"]["small"] == ["scratch"]


def test_the_project_filter_keeps_only_the_chosen_folders(kusto_store):
    _seed(kusto_store)
    status, raw = board_routes.handle_get("/api/board/insights/repos", urlencode({"since": 0, "until": 100_000, "project": SCRATCH}),
                                          kusto_store, kusto_store, now=200_000.0)
    body = json.loads(raw)
    assert status == 200 and "restrict_projects" in body["query"]["kql"]
    assert [repo["repo"] for repo in body["repos"]] == [SCRATCH] and body["repos"][0]["sessions"] == 2


def test_fleet_scope_counts_every_node_and_node_scope_one(kusto_store):
    _seed(kusto_store)
    fleet = _repos(_card(kusto_store, "repos", qualified=True))
    assert fleet[APP]["nodes"] == 2 and fleet[APP]["sessions"] == 4
    other = _repos(_card(kusto_store, "repos", node=OTHER, qualified=True))
    assert set(other) == {APP} and (other[APP]["sessions"], other[APP]["requests"]) == (1, 4)


def test_the_tool_and_model_filters_choose_sessions():
    assert insights_work.filter_params(Filters(since=0.0, until=1.0)) == {}
    params = insights_work.filter_params(Filters(since=0.0, until=1.0, tools=("claude-code",), model="claude-opus-5.5"))
    assert params == {"restrict_tools": True, "requested_tools": ["claude-code"], "requested_models": ["claude-opus-5-5"]}
    assert insights_work.step_for(Filters(since=0.0, until=1.0)) == 7 * insights_work.WEEK
    assert insights_work.step_for(Filters(since=1000.0, until=1000.0 + 30 * 86400)) == insights_work.WEEK


def test_the_tool_filter_reaches_the_view(kusto_store):
    _seed(kusto_store)
    body = _card(kusto_store, "repos", Filters(since=0.0, until=100_000.0, tools=("claude-code",)))
    assert {repo["repo"]: repo["sessions"] for repo in body["repos"]} == {APP: 2}


def _more_turns(store):
    # s1: a second turn a person started 600 s after the first ended (a wait), then one the autopilot started (no wait).
    store.insert("session_turns", session_id="s1", prompt_id="t3", ts=1000.0, ended_at=1100.0, origin="human", project=APP,
                 project_path=APP, tool="claude-code")
    store.insert("session_turns", session_id="s1", prompt_id="t4", ts=2000.0, ended_at=2050.0, origin="autopilot", project=APP,
                 project_path=APP, tool="claude-code")


def test_durations_split_working_and_waiting_time_by_repository(kusto_store):
    _seed(kusto_store)
    _more_turns(kusto_store)
    body = _card(kusto_store, "durations")
    repos = _repos(body)
    app = repos[APP]
    assert (app["sessions"], app["timed"], app["small"]) == (4, 2, True)
    assert (app["agent_ms"], app["wait_ms"], app["waits"]) == (1_050_000.0, 600_000.0, 1)
    assert (app["model_ms"], app["tool_ms"], app["requests"], app["calls"]) == (60_000.0, 600.0, 60, 6)
    assert (app["changed"], app["p50_first_change_ms"], app["walled"], app["max_wall_ms"]) == (1, 1_090_000.0, 4, 5_000_000.0)
    assert repos[SCRATCH]["agent_ms"] is None and repos[SCRATCH]["timed"] == 0
    tools = {tool["name"]: tool for tool in body["tools"]}
    assert (tools["git"]["program"], tools["git"]["calls"], tools["git"]["total_ms"], tools["git"]["small"]) == (True, 2, 200.0, True)
    assert tools["Read"]["program"] is False and tools["Read"]["repo"] == APP
    models = {model["model"]: model for model in body["models"]}
    assert (models["claude-opus-5-5"]["requests"], models["claude-opus-5-5"]["small"]) == (34, False)
    summary = body["summary"]
    assert (summary["timed"], summary["agent_ms"], summary["wait_ms"]) == (2, 1_050_000.0, 600_000.0)
    # Every repository has fewer than 5 sessions with turn times: none leads the finding.
    assert summary["top"] is None and set(summary["small"]) == {"app", "scratch"}
    assert summary["top_tool"]["name"] in {"git", "Edit", "Read", "echo", "python"}
    assert summary["slowest_tool"] is None and summary["slowest_model"]["model"] == "claude-opus-5-5"
    assert [session["session_id"] for session in body["sessions"]][:2] == ["s2", "s1"]


def test_durations_follow_the_project_filter_and_the_node_scope(kusto_store):
    _seed(kusto_store)
    status, raw = board_routes.handle_get("/api/board/insights/durations", urlencode({"since": 0, "until": 100_000, "project": SCRATCH}),
                                          kusto_store, kusto_store, now=200_000.0)
    body = json.loads(raw)
    assert status == 200 and [repo["repo"] for repo in body["repos"]] == [SCRATCH]
    other = _card(kusto_store, "durations", node=OTHER, qualified=True)
    assert [(repo["repo"], repo["sessions"], repo["agent_ms"]) for repo in other["repos"]] == [(APP, 1, None)]


def _more_writes(store):
    # s1 writes before its commit (committed) and after it (not); s3 writes the file s1 and s2 wrote (a third session).
    _write(store, "w4", "s1", APP, 150.0, "src/x.py")
    _write(store, "w6", "s1", APP, 300.0, "README.md")
    _write(store, "w5", "s3", SUB, 1500.0, "src/x.py")


def test_changes_count_files_kinds_rework_and_what_ended_in_a_commit(kusto_store):
    _seed(kusto_store)
    _more_writes(kusto_store)
    body = _card(kusto_store, "changes")
    repos = _repos(body)
    app = repos[APP]
    assert (app["writes"], app["committed_writes"], app["files"], app["reworked"]) == (6, 1, 3, 1)
    assert app["kinds"] == {"source": 1, "tests": 1, "docs": 1, "config": 0, "memory": 0, "other": 0}
    assert (app["lines_added"], app["lines_removed"], app["lines_unknown"]) == (15, 5, 1)
    assert (app["commits"], app["commit_days"], app["change_sessions"], app["uncommitted_sessions"]) == (1, 1, 3, 2)
    assert app["small"] is True and app["cost_per_commit"] is None
    assert repos[SCRATCH]["writes"] == 0 and repos[SCRATCH]["small"] is True
    assert [(item["path"], item["writes"], item["sessions"], item["most_in_session"]) for item in body["files"]] == [("src/x.py", 4, 3, 2)]
    assert [session["session_id"] for session in body["sessions"]][0] == "s2"
    assert sum(item["commits"] for item in body["bins"]) == 1 and sum(item["writes"] for item in body["bins"]) == 6
    summary = body["summary"]
    assert (summary["writes"], summary["committed_writes"], summary["reworked"]) == (6, 1, 1)
    # Every repository is too small: none leads the finding.
    assert summary["top"] is None and summary["most_uncommitted"] is None and set(summary["small"]) == {"app", "scratch"}


def test_changes_follow_the_project_filter_and_the_fleet_scope(kusto_store):
    _seed(kusto_store)
    status, raw = board_routes.handle_get("/api/board/insights/changes", urlencode({"since": 0, "until": 100_000, "project": WORKTREE}),
                                          kusto_store, kusto_store, now=200_000.0)
    body = json.loads(raw)
    assert status == 200 and [(repo["repo"], repo["writes"]) for repo in body["repos"]] == [(APP, 3)]
    fleet = _repos(_card(kusto_store, "changes", qualified=True))
    assert fleet[APP]["sessions"] == 4 and fleet[APP]["commits"] == 1
    assert insights_work.day_step_for(Filters(since=1000.0, until=1000.0 + 30 * 86400)) == 86400.0
    assert insights_work.day_step_for(Filters(since=1000.0, until=1000.0 + 90 * 86400)) == 3 * 86400.0
