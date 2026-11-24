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
    assert "let requests = requests | where aictl_project_key(['project']) in (restrict_projects);" in text
    # Tables the view does not read are not touched.
    assert "let sessions" not in text
    commits = restricted_query(_query("sessions.commits"))
    assert "let session_commits = session_commits | join kind=leftsemi aictl_project_sessions" in commits
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
