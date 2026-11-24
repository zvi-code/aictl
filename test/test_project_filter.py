"""The project filter of the whole web interface (dashboard/project_filter.py, stores/kusto/project_scope.py).

A figure read for chosen projects must equal the same figure read from a store that holds only those
projects' rows. Each test seeds two projects into one store and only the chosen one into a second store,
reads the first with the filter and the second without, and compares. The views run through the replay
harness (recorded against the scratch database).
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode

import pytest
from kusto_replay import NOW, SeededStore

from aictl.dashboard import board_routes, history_board
from aictl.dashboard.board_filters import Filters, parse_filters
from aictl.dashboard.board_projection import compute_board
from aictl.dashboard.panel_kql import filled_query
from aictl.dashboard.project_filter import ProjectReader, requested_projects, scoped
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores.kusto.project_scope import PROJECT_TABLES, SESSION_TABLES, restricted_query
from aictl.stores.kusto.reader import _VIEWS, _query
from aictl.stores.kusto.tables import TABLES

ALPHA = "/work/alpha"
BETA = "/work/beta"
SINCE, UNTIL = NOW - 6 * 3600, NOW
QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"


def _seed(store: SeededStore, *projects: str) -> None:
    """Two sessions in alpha, one in beta; each with requests, tool calls and a prompt, filed under its folder."""
    sessions = {
        ALPHA: [("a1", "claude-code", "claude-sonnet-4-5"), ("a2", "copilot-cli", "gpt-5")],
        BETA: [("b1", "claude-code", "claude-sonnet-4-5")],
    }
    for project in projects:
        for n, (sid, tool, model) in enumerate(sessions[project]):
            start = NOW - 3000 + n * 100
            store.insert("sessions", session_id=sid, tool=tool, project_path=project, project=project, model=model,
                         started_at=start, ended_at=start + 900, last_activity_at=start + 900)
            for i in range(3 + n):
                store.insert("requests", dedup_key=f"{sid}-r{i}", session_id=sid, tool=tool, model=model,
                             project_path=project, project=project, ts=start + 60 * (i + 1), input_tokens=100 * (i + 1),
                             output_tokens=10, cost_usd=0.01 * (i + 1), duration_ms=1500.0)
                store.insert("tool_invocations", dedup_key=f"{sid}-t{i}", session_id=sid, tool=tool, tool_name="Read",
                             project_path=project, project=project, ts=start + 60 * (i + 1) + 5, duration_ms=20.0,
                             is_error=int(i == 0 and project == BETA))
            store.insert("session_prompts", session_id=sid, tool=tool, project_path=project, project=project,
                         ts=start + 30, text=f"prompt of {sid}", dedup_key=f"{sid}-p")


@pytest.fixture
def stores(kusto_tape, kusto_store):
    """(both projects, alpha only)."""
    _seed(kusto_store, ALPHA, BETA)
    only = SeededStore(kusto_tape)
    _seed(only, ALPHA)
    return kusto_store, only


def _get(store, path, **params):
    status, body = board_routes.handle_get(path, urlencode(params, doseq=True), store, store, now=NOW)
    assert status == 200, body
    return json.loads(body)


# ─── The restriction itself ────────────────────────────────────────────────────


def test_every_view_can_be_restricted_and_keeps_the_tombstone_rule():
    from test_tombstone_scope import _violations

    for path in sorted(QUERIES.glob("*.kql")):
        text = restricted_query(path.read_text())
        assert "restrict_projects:dynamic" in text.split(";", 1)[0], path.name
        assert _violations(text) == [], path.name


def test_a_restricted_view_reads_only_project_tables_through_the_restriction():
    text = restricted_query(_query("insights.pause_tax"))
    assert "let requests = requests | where ['project'] in (restrict_projects);" in text
    # Tables the view does not read are not touched.
    assert "let sessions" not in text
    commits = restricted_query(_query("sessions.commits"))
    assert "let session_commits = session_commits | join kind=leftsemi aictl_project_sessions" in commits
    # A view that reads a current view (stores/kusto/current.py) has it restricted the same way.
    cells = restricted_query(_query("requests.cells"))
    assert "let requests_current = requests_current | where ['project'] in (restrict_projects);" in cells
    assert "let requests =" not in cells
    # Every table with a project of its own, and only those, is in the restriction.
    assert set(PROJECT_TABLES) | set(SESSION_TABLES) <= TABLES.keys()
    assert not {"files", "context_lists", "OTELLogs", "system_snapshots", "metrics"} & set(PROJECT_TABLES)


def test_the_query_a_card_shows_is_the_query_it_ran():
    shown = filled_query("insights.pause_tax", {"since": 0.0, "until": 1.0, "restrict_projects": [ALPHA], "limit": 5})
    assert 'let restrict_projects = dynamic(["/work/alpha"]);' in shown
    assert "aictl_project_view()" in shown


def test_the_url_names_each_project_once_and_all_means_every_project():
    assert requested_projects({"project": [BETA, ALPHA, BETA, " "]}) == (ALPHA, BETA)
    assert requested_projects({"project": ["all"]}) == ()
    assert parse_filters(urlencode({"project": [BETA, ALPHA]}, doseq=True), NOW).projects == (ALPHA, BETA)


def test_no_project_leaves_the_reader_as_it_is(kusto_store):
    history = HistoryScope.local(kusto_store)
    assert scoped(history, ()) is history
    narrowed = scoped(history, (ALPHA,))
    assert isinstance(narrowed.reader, ProjectReader) and narrowed.reader.projects == (ALPHA,)
    # Equal readers for equal choices, so the caches keyed by reader keep one entry per choice.
    assert scoped(history, (ALPHA,)).reader == narrowed.reader
    assert scoped(narrowed, (BETA,)).reader.base is history.reader


# ─── Each kind of route: the filtered figure equals the figure of only that project's rows ───


def test_the_board_of_a_project_equals_the_board_of_only_its_rows(stores):
    both, only = stores
    window = {"since": SINCE, "until": UNTIL, "buckets": 6}
    filtered = compute_board(both, Filters(**window, projects=(ALPHA,)), None, NOW)
    alone = compute_board(only, Filters(**window), None, NOW)
    unfiltered = compute_board(both, Filters(**window), None, NOW)
    assert filtered["kpis"] == alone["kpis"]
    assert filtered["kpis"] != unfiltered["kpis"]
    assert filtered["by_model"] == alone["by_model"]
    assert filtered["tools"] == alone["tools"]
    assert {row["id"] for row in filtered["agents"]} == {row["id"] for row in alone["agents"]} == {"a1", "a2"}
    assert [p["project"] for p in filtered["projects"]] == [ALPHA]


def test_the_fleet_board_route_of_a_project_equals_the_board_of_only_its_rows(stores):
    both, only = stores
    window = {"since": SINCE, "until": UNTIL, "buckets": 6, "scope": "fleet"}
    filtered = json.loads(history_board.read_board(both, urlencode({**window, "project": ALPHA}), now=NOW))
    alone = json.loads(history_board.read_board(only, urlencode(window), now=NOW))
    assert filtered["kpis"] == alone["kpis"]
    assert filtered["by_model"] == alone["by_model"]
    assert len(filtered["agents"]) == 2


def test_a_detail_route_of_a_project_equals_the_detail_of_only_its_rows(stores):
    both, only = stores
    window = {"name": "Read", "since": SINCE, "until": UNTIL}
    filtered = _get(both, "/api/board/tool", **window, project=ALPHA)
    alone = _get(only, "/api/board/tool", **window)
    everything = _get(both, "/api/board/tool", **window)
    assert filtered["total"] == alone["total"] == 7
    assert everything["total"] == 10
    assert sorted(c["ts"] for c in filtered["calls"]) == sorted(c["ts"] for c in alone["calls"])


def test_an_insights_card_of_a_project_equals_the_card_of_only_its_rows(stores):
    both, only = stores
    window = {"since": SINCE, "until": UNTIL}
    filtered = _get(both, "/api/board/insights/pause", **window, project=ALPHA)
    alone = _get(only, "/api/board/insights/pause", **window)
    everything = _get(both, "/api/board/insights/pause", **window)
    assert filtered["tools"] == alone["tools"]
    assert filtered["tools"] != everything["tools"]
    assert "restrict_projects" in filtered["query"]["kql"]


def test_the_session_finder_of_a_project_equals_the_finder_of_only_its_rows(stores):
    both, only = stores
    filtered = _get(both, "/api/board/sessions", project=ALPHA)
    alone = _get(only, "/api/board/sessions")
    assert filtered["total"] == alone["total"] == 2
    assert {r["id"] for r in filtered["rows"]} == {r["id"] for r in alone["rows"]} == {"a1", "a2"}
    two = _get(both, "/api/board/sessions", project=[ALPHA, BETA])
    assert two["total"] == 3


def _active(store, sid, project, **values):
    """A session the finder lists: its row and one model call, filed under *project*."""
    store.insert("sessions", session_id=sid, tool="claude-code", project_path=project, project=project,
                 started_at=NOW - 500, last_activity_at=NOW - 400, **values)
    store.insert("requests", dedup_key=f"{sid}-r", session_id=sid, tool="claude-code", project_path=project,
                 project=project, ts=NOW - 450, input_tokens=10, model="claude-sonnet-4-5")


def test_a_tombstoned_session_does_not_come_back_under_its_old_project(kusto_store):
    # The session moved from alpha to beta: its row under alpha was deleted with a tombstone.
    _active(kusto_store, "m", ALPHA)
    kusto_store.insert("sessions", session_id="m", project=ALPHA, _deleted=True, _v="2026-02-01")
    kusto_store.insert("requests", dedup_key="m-r", project=ALPHA, session_id="m", ts=NOW - 450, tool="claude-code",
                       _deleted=True, _v="2026-02-01")
    _active(kusto_store, "m", BETA, _v="2026-02-01")
    kusto_store.insert("session_commits", session_id="m", sha="abc1234", ts=NOW - 450, project="/work")
    assert _get(kusto_store, "/api/board/sessions", project=ALPHA)["total"] == 0
    assert _get(kusto_store, "/api/board/sessions", project=BETA)["total"] == 1
    # A commit is filed under the repository root; it counts for its session's project.
    history = HistoryScope.local(kusto_store)
    commits = lambda projects: scoped(history, projects).read("sessions.commits", sid="m")  # noqa: E731
    assert [r["sha"] for r in commits((BETA,))] == ["abc1234"]
    assert commits((ALPHA,)) == []


def test_every_spelling_of_a_windows_project_counts(kusto_store):
    for i, spelling in enumerate([r"C:\Work\Gamma", r"c:\work\gamma\\", "C:/Work/Gamma"]):
        _active(kusto_store, f"w{i}", spelling)
    assert _get(kusto_store, "/api/board/sessions", project="C:/work/GAMMA")["total"] == 3


# ─── The picker's list ─────────────────────────────────────────────────────────


def test_the_picker_lists_every_project_of_the_scope_most_recent_first(stores):
    both, _ = stores
    both.insert("sessions", session_id="old", tool="codex-cli", project_path="/work/old", project="/work/old",
                started_at=1000.0, last_activity_at=2000.0)
    both.insert("sessions", session_id="gone", project="/work/gone", _deleted=True)
    body = _get(both, "/api/board/projects", project=ALPHA)
    assert [(p["project"], p["name"], p["sessions"]) for p in body["projects"]] == [
        (ALPHA, "alpha", 2), (BETA, "beta", 1), ("/work/old", "old", 1)]
    assert body["projects"][-1]["last_ts"] == 2000.0
    assert body["truncated"] is False
    fleet = _get(both, "/api/board/projects", scope="fleet")
    assert [p["project"] for p in fleet["projects"]] == [ALPHA, BETA, "/work/old"]
    assert fleet["node_scope"] == {"kind": "fleet", "node_id": None}


def test_the_catalog_view_is_registered():
    assert _VIEWS["projects.catalog"][0].split() == ["all_nodes", "requested_node"]


# ─── Repositories: a repository and its worktrees and sub-folders as one choice ───

REPO = "/work/repo"
COMMITTED = "/work/repo-hotfix"       # a linked worktree outside the repository folder: a commit names the repository
AGENT_TREE = "/work/repo-feature"     # an agent of a repository session worked in it as a worktree
PATTERN = "/work/repo/.claude/worktrees/fix-1"
SUB = "/work/repo/docs"
LOOKALIKE = "/work/repo-tools"        # shares a prefix, holds no evidence: never grouped


def _project(path, sessions=1, last_ts=1000.0):
    return {"project": path, "name": path.rsplit("/", 1)[-1], "sessions": sessions, "last_ts": last_ts, "nodes": 1}


def test_a_repository_groups_its_worktrees_and_folders_by_evidence_never_by_a_common_prefix():
    from aictl.dashboard.project_filter import repositories

    projects = [_project(p, last_ts=t) for p, t in [(REPO, 900.0), (COMMITTED, 950.0), (AGENT_TREE, 800.0),
                                                     (PATTERN, 700.0), (SUB, 600.0), (LOOKALIKE, 990.0)]]
    evidence = [
        {"project_path": COMMITTED, "root": REPO, "evidence": "commit", "sessions": 2},
        {"project_path": AGENT_TREE, "root": REPO, "evidence": "worktree", "sessions": 1},
    ]
    groups = repositories(projects, evidence, local=False)
    assert [g["root"] for g in groups] == [REPO]
    group = groups[0]
    assert [m["project"] for m in group["members"]] == [REPO, COMMITTED, AGENT_TREE, PATTERN, SUB]
    assert [m["evidence"].split(" ")[:2] for m in group["members"]] == [
        ["the", "repository's"], ["a", "commit"], ["an", "agent"], ["a", "worktree"], ["a", "folder"]]
    assert group["sessions"] == 5 and group["last_ts"] == 950.0
    # A folder with no evidence is not grouped by its name, even when the store holds nothing else.
    assert repositories([_project(REPO), _project(LOOKALIKE)], [], local=False) == []


def test_two_spellings_of_one_windows_folder_are_one_project_and_never_break_the_list():
    # Tools on Windows store one folder with either drive-letter case and either separator. The picker failed with
    # "Could not read the selected node history" when two spellings met: they were grouped as one repository whose
    # second member had no evidence.
    from aictl.dashboard.project_filter import EVIDENCE, one_per_folder, repositories

    def item(path, sessions, last_ts, nodes=1, node_ids=("win",)):
        return {"project": path, "name": path.replace("/", "\\").split("\\")[-1], "sessions": sessions, "last_ts": last_ts, "nodes": nodes,
                "node_ids": list(node_ids)}

    listed = one_per_folder([item("C:\\OSS\\app", 3, 50.0), item("c:\\oss\\app", 9, 40.0, nodes=2, node_ids=("cpc", "win")), item("C:/OSS/app", 1, None, node_ids=("mac",)),
                             item("C:\\OSS\\other", 2, 10.0), item("/srv/App", 1, 5.0), item("/srv/app", 1, 6.0)])
    assert [(p["project"], p["sessions"], p["last_ts"], p["nodes"]) for p in listed] == [
        ("c:\\oss\\app", 13, 50.0, 3), ("C:\\OSS\\other", 2, 10.0, 1), ("/srv/App", 1, 5.0, 1), ("/srv/app", 1, 6.0, 1)]
    # One folder on three nodes is one entry that names all three.
    assert listed[0]["node_ids"] == ["cpc", "mac", "win"]

    # Even when both spellings reach the grouping (older callers), it answers: both are the repository's own folder.
    both = [item("C:\\OSS\\app", 3, 50.0), item("c:\\oss\\app", 9, 40.0)]
    (group,) = repositories(both, [], local=False)
    assert {m["evidence"] for m in group["members"]} == {EVIDENCE["root"]}

    # Evidence stored under one spelling places the project listed under the other.
    listed = [item("C:\\OSS\\app", 3, 50.0), item("c:\\oss\\app-wt", 2, 45.0)]
    evidence = [{"row_type": "root", "project_path": "C:\\oss\\app-wt", "root": "c:\\oss\\app", "evidence": "worktree", "sessions": 2}]
    (group,) = repositories(listed, evidence, local=False)
    assert [(m["project"], m["evidence"]) for m in group["members"]] == [
        ("C:\\OSS\\app", EVIDENCE["root"]), ("c:\\oss\\app-wt", EVIDENCE["worktree"])]


def test_a_worktree_of_a_worktree_belongs_to_the_first_repository():
    from aictl.dashboard.project_filter import repositories

    nested = "/work/repo-hotfix-2"
    groups = repositories([_project(p) for p in (REPO, COMMITTED, nested)], [
        {"project_path": COMMITTED, "root": REPO, "evidence": "commit", "sessions": 1},
        {"project_path": nested, "root": COMMITTED, "evidence": "worktree", "sessions": 1},
    ], local=False)
    assert [m["project"] for m in groups[0]["members"]] == [REPO, COMMITTED, nested]


def test_this_nodes_git_folders_group_a_linked_worktree_only_in_this_nodes_scope(tmp_path, monkeypatch):
    from aictl.dashboard.project_filter import repositories
    from aictl.ingesters import _common

    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    repo, tree = tmp_path / "src" / "repo", tmp_path / "src" / "repo-wt"
    (repo / ".git" / "worktrees" / "wt").mkdir(parents=True)
    tree.mkdir(parents=True)
    (tree / ".git").write_text(f"gitdir: {repo}/.git/worktrees/wt\n")
    _common._git_root.cache_clear()
    try:
        projects = [_project(str(repo)), _project(str(tree)), _project(str(repo / "web"))]
        local = repositories(projects, [], local=True)
        assert [m["project"] for m in local[0]["members"]] == [str(repo), str(tree), str(repo / "web")]
        # Another node's paths are not looked up on this node's disk.
        assert repositories(projects, [], local=False) == []
    finally:
        _common._git_root.cache_clear()


def _repo_store(store, *, members=(REPO, COMMITTED, AGENT_TREE, LOOKALIKE)):
    """Sessions in a repository, two of its worktrees and a look-alike folder, with the evidence the store keeps."""
    for n, project in enumerate(members):
        sid = f"r{n}"
        _active(store, sid, project)
        if project == COMMITTED:
            store.insert("session_commits", session_id=sid, sha=f"abc{n}def", ts=NOW - 440, project=REPO)
        if project == REPO:
            store.insert("agents", session_id=sid, agent_id="sub", tool="claude-code", project=REPO,
                         worktree_path=AGENT_TREE, started_at=NOW - 480)


def test_the_picker_names_the_nodes_of_each_folder_in_the_fleet_scope(kusto_store):
    # The same path on two nodes is one entry: without the node names nothing tells the nodes' folders apart.
    for sid, path, node in [("a1", "/work/shared", None), ("a2", "/work/shared", "node-two"), ("b1", "/work/far", "node-two")]:
        kusto_store.insert("sessions", session_id=sid, tool="codex-cli", project_path=path, project=path, started_at=1000.0,
                           last_activity_at=2000.0, **({"node_id": node} if node else {}))
    fleet = _get(kusto_store, "/api/board/projects", scope="fleet")
    named = {p["project"]: p["node_ids"] for p in fleet["projects"]}
    assert named["/work/far"] == ["node-two"]
    assert len(named["/work/shared"]) == 2 and "node-two" in named["/work/shared"]
    assert {p["project"]: p["nodes"] for p in fleet["projects"]} == {"/work/shared": 2, "/work/far": 1}


def test_the_picker_lists_the_repository_with_its_members(kusto_store):
    _repo_store(kusto_store)
    body = _get(kusto_store, "/api/board/projects")
    assert {p["project"] for p in body["projects"]} == {REPO, COMMITTED, AGENT_TREE, LOOKALIKE}
    assert [(r["root"], [m["project"] for m in r["members"]]) for r in body["repos"]] == [
        (REPO, [REPO, AGENT_TREE, COMMITTED])]
    why = {m["project"]: m["evidence"] for m in body["repos"][0]["members"]}
    assert why[COMMITTED].startswith("a commit") and why[AGENT_TREE].startswith("an agent worked in it")


def test_a_repository_filter_equals_the_figures_of_its_member_projects_only(kusto_tape, kusto_store):
    _repo_store(kusto_store)
    only = SeededStore(kusto_tape)
    _repo_store(only, members=(REPO, COMMITTED, AGENT_TREE))
    assert _get(kusto_store, "/api/board/sessions", repo=REPO)["total"] == _get(only, "/api/board/sessions")["total"] == 3
    assert _get(kusto_store, "/api/board/sessions", repo=REPO, project=LOOKALIKE)["total"] == 4
    window = {"since": NOW - 3600, "until": NOW, "buckets": 6}
    filtered = compute_board(kusto_store, Filters(**window, repos=(REPO,)), None, NOW)
    alone = compute_board(only, Filters(**window), None, NOW)
    assert filtered["kpis"] == alone["kpis"]
    assert {p["project"] for p in filtered["projects"]} == {REPO, COMMITTED, AGENT_TREE}
    query = urlencode({**window, "scope": "fleet"})
    fleet = json.loads(history_board.read_board(kusto_store, query + "&" + urlencode({"repo": REPO}), now=NOW))
    assert fleet["kpis"] == json.loads(history_board.read_board(only, query, now=NOW))["kpis"]


def test_the_route_helper_resolves_a_repository_into_project_keys(kusto_store):
    from urllib.parse import parse_qs

    from aictl.dashboard.project_filter import apply_request

    _repo_store(kusto_store)
    history, query = apply_request(HistoryScope.local(kusto_store), "since=1&" + urlencode({"repo": REPO, "q": "x"}))
    assert history.reader.projects == (REPO, AGENT_TREE, COMMITTED)
    assert parse_qs(query) == {"since": ["1"], "q": ["x"], "project": [REPO, AGENT_TREE, COMMITTED]}
    # A repository the store holds no group for stands for its own folder.
    history, _ = apply_request(HistoryScope.local(kusto_store), urlencode({"repo": "/work/new"}))
    assert history.reader.projects == ("/work/new",)
