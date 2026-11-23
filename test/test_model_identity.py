"""One model, one row: the board groups a model by its canonical id.

Tools spell the same model id differently. Claude Code stores ``claude-opus-5-5``
(its transcripts use dashes, and the ingester normalizes them); GitHub Copilot CLI
stores what its logs report, ``claude-opus-5.5``. The stored rows keep what the
tool reported. The board must group both spellings as one model in the Model
filter, the usage and cost by model, and the filter itself, and still show the
reported spellings as detail.
"""

from __future__ import annotations

import time
from types import SimpleNamespace

import pytest
from kusto_replay import NOW

from aictl.dashboard import board_projection, runtime_health
from aictl.dashboard.artifact_details import error_detail
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.board_projection import compute_board
from aictl.dashboard.session_record import SessionQuery, search_sessions
from aictl.data.model_pricing import cost_usd

DAY = 86400.0
DASHED = "claude-opus-5-5"   # Claude Code
DOTTED = "claude-opus-5.5"   # GitHub Copilot CLI
OLDER = "claude-opus-5"      # a different model with a different price
UNKNOWN = "Acme-Model.2"     # no price, no known spelling rule


def _request(db, ts, sid, tool, model, i=0, o=0, duration=0.0, **extra):
    db.insert("requests", ts=ts, session_id=sid, agent_id="", tool=tool, project_path="/p/one", model=model,
              input_tokens=i, output_tokens=o, cache_read_tokens=0, cache_creation_tokens=0,
              duration_ms=duration, source="test", **extra)


def seed(db) -> None:
    t = NOW - DAY
    for sid, tool in (("cc", "claude-code"), ("cp", "copilot-cli"), ("old", "claude-code"), ("acme", "copilot-vscode")):
        db.insert("sessions", session_id=sid, tool=tool, project_path="/p/one", started_at=t, ended_at=t + 600)
    _request(db, t + 10, "cc", "claude-code", DASHED, i=1000, o=100, duration=1000)
    _request(db, t + 20, "cp", "copilot-cli", DOTTED, i=2000, o=200, duration=3000)
    _request(db, t + 30, "cp", "copilot-cli", DOTTED, is_error=1, error_type="rate_limit", http_status=429)
    _request(db, t + 40, "old", "claude-code", OLDER, i=500, o=50, duration=500)
    _request(db, t + 50, "acme", "copilot-vscode", UNKNOWN, i=70, o=7, duration=200)
    # The period before the window, for the comparison figures.
    prev = NOW - 10 * DAY
    _request(db, prev, "cc-before", "claude-code", DASHED, i=10, o=1)
    _request(db, prev + 1, "cp-before", "copilot-cli", DOTTED, i=20, o=2)


@pytest.fixture(autouse=True)
def _fresh_board(monkeypatch):
    for memo in (board_projection._facts_memo, board_projection._sources_memo, board_projection._disk_prompts_memo):
        memo.clear()
    runtime_health._self_memo[:] = [0.0, None]
    monkeypatch.setattr(board_projection, "_process_start", lambda pid: 0.0)
    frozen = SimpleNamespace(**(vars(time) | {"time": lambda: NOW}))
    for module in (board_projection, runtime_health):
        monkeypatch.setattr(module, "time", frozen)


@pytest.fixture()
def db(kusto_store):
    seed(kusto_store)
    return kusto_store


def _board(db, **kw) -> dict:
    return compute_board(db, Filters(since=NOW - 7 * DAY, until=NOW, **kw), None, NOW)


def _sessions(payload) -> set[str]:
    return {a["id"] for a in payload["agents"]}


def test_model_menu_lists_one_entry_for_both_spellings(db):
    models = _board(db)["options"]["models"]
    ids = [m["id"] for m in models]
    assert ids.count(DASHED) == 1
    assert DOTTED not in ids
    entry = next(m for m in models if m["id"] == DASHED)
    assert entry["agents"] == 2


def test_model_menu_keeps_the_reported_spellings_with_their_tools(db):
    entry = next(m for m in _board(db)["options"]["models"] if m["id"] == DASHED)
    assert entry["reported_as"] == [
        {"id": DASHED, "tools": ["claude-code"]},
        {"id": DOTTED, "tools": ["copilot-cli"]},
    ]
    older = next(m for m in _board(db)["options"]["models"] if m["id"] == OLDER)
    assert older["reported_as"] == [{"id": OLDER, "tools": ["claude-code"]}]


@pytest.mark.parametrize("chosen", [DASHED, DOTTED])
def test_filtering_by_the_model_returns_the_requests_of_both_tools(db, chosen):
    payload = _board(db, model=chosen)
    assert _sessions(payload) == {"cc", "cp"}
    assert payload["kpis"]["tokens"] == 1100 + 2200
    # Latency, API errors and the previous period are read per model too.
    assert payload["kpis"]["p95_ms"] == 3000
    assert sum(e["count"] for e in payload["errors"] if e["kind"] == "API") == 1
    assert payload["kpis"]["prev"]["tokens"] == 11 + 22


def test_tokens_and_cost_by_model_have_one_row_with_the_summed_totals(db):
    payload = _board(db)
    rows = [r for r in payload["by_model"] if r["model"] in (DASHED, DOTTED)]
    assert len(rows) == 1
    row = rows[0]
    assert row["model"] == DASHED
    assert row["msgs"] == 3
    assert row["tokens"] == 1100 + 2200
    assert row["agents"] == 2
    assert row["p95_ms"] == 3000
    expected = cost_usd(DASHED, 1000, 100) + cost_usd(DOTTED, 2000, 200)
    assert row["cost_usd"] == pytest.approx(expected)
    assert row["reported_as"] == [{"id": DASHED, "tools": ["claude-code"]}, {"id": DOTTED, "tools": ["copilot-cli"]}]
    cost_series = payload["series"]["cost"]["by_model"]
    assert DOTTED not in cost_series
    assert sum(v or 0.0 for v in cost_series[DASHED]) == pytest.approx(expected)


def test_a_different_version_stays_a_different_model(db):
    rows = {r["model"]: r for r in _board(db)["by_model"]}
    assert rows[OLDER]["tokens"] == 550
    assert rows[OLDER]["cost_usd"] == pytest.approx(cost_usd(OLDER, 500, 50))
    assert _sessions(_board(db, model=OLDER)) == {"old"}


def test_an_unknown_model_passes_through_unchanged(db):
    payload = _board(db)
    assert UNKNOWN in [m["id"] for m in payload["options"]["models"]]
    rows = {r["model"]: r for r in payload["by_model"]}
    assert rows[UNKNOWN]["tokens"] == 77
    assert rows[UNKNOWN]["cost_usd"] is None
    assert [m["model"] for m in payload["unpriced"]["models"]] == [UNKNOWN]
    assert _sessions(_board(db, model=UNKNOWN)) == {"acme"}


@pytest.mark.parametrize("chosen", [DASHED, DOTTED, DASHED.upper()])
def test_the_error_drawer_lists_the_errors_of_every_spelling_and_of_no_other_model(db, chosen):
    t = NOW - DAY
    _request(db, t + 35, "cc", "claude-code", DASHED, is_error=1, error_type="rate_limit", http_status=429)
    # The same session, another model: the model filter leaves this error out.
    _request(db, t + 36, "cc", "claude-code", OLDER, is_error=1, error_type="rate_limit", http_status=429)
    filters = Filters(since=NOW - 7 * DAY, until=NOW, model=chosen)
    status, body = error_detail(db, "api:rate_limit:429", NOW, filters=filters)
    assert status == 200
    assert [(item["agent_id"], item["ts"]) for item in body["items"]] == [("cc", t + 35), ("cp", t + 30)]


@pytest.mark.parametrize("view", ["requests.errors", "requests.intervals"])
def test_a_model_parameter_filters_the_views_that_read_the_requests_table(db, view):
    """The requests table has a column named requested_model; a parameter of that name must not be read as the column."""
    from aictl.dashboard.projections.history import HistoryScope

    t = NOW - DAY
    _request(db, t + 35, "cc", "claude-code", DASHED, is_error=1, error_type="rate_limit", http_status=429)
    _request(db, t + 36, "cc", "claude-code", OLDER, is_error=1, error_type="rate_limit", http_status=429)
    history = HistoryScope.local(db)
    extra = {"intervals": [["test-node", "cc", t, t + 100]]} if view == "requests.intervals" else {"since": NOW - 7 * DAY, "until": NOW}
    only = history.read(view, requested_model=OLDER, **extra)
    every = history.read(view, requested_model="", **extra)
    if view == "requests.errors":
        assert [row["ts"] for row in only] == [t + 36]
        assert len(every) == 3
    else:
        assert [row["tokens"] for row in only] == [0]  # the request of that model carries no tokens
        assert [row["tokens"] for row in every] == [1100]
        assert [row["tokens"] for row in history.read(view, requested_model=DASHED, **extra)] == [1100]


@pytest.mark.parametrize("chosen", [DASHED, DOTTED, DASHED.upper()])
def test_the_session_finder_filters_by_the_model_whichever_spelling_a_session_used(db, chosen):
    query = SessionQuery(since=NOW - 7 * DAY, until=NOW, model=chosen)
    found = search_sessions(db, query=query, now=NOW)
    assert {row["id"] for row in found["rows"]} == {"cc", "cp"}
    assert found["total"] == 2
    # The facets count the same sessions, and the model filter leaves the others.
    assert found["facets"]["sessions"] == 2
    assert found["without"]["model"] >= 4


def test_the_session_finder_keeps_a_different_version_and_an_unknown_model_apart(db):
    window = {"since": NOW - 7 * DAY, "until": NOW}
    assert {r["id"] for r in search_sessions(db, query=SessionQuery(model=OLDER, **window), now=NOW)["rows"]} == {"old"}
    assert {r["id"] for r in search_sessions(db, query=SessionQuery(model=UNKNOWN, **window), now=NOW)["rows"]} == {"acme"}
    assert search_sessions(db, query=SessionQuery(model=UNKNOWN.lower(), **window), now=NOW)["rows"] == []


def test_the_previous_period_counts_a_spelling_only_that_period_used(db):
    """A third spelling that no request of the window used still belongs to the model."""
    prev = NOW - 10 * DAY
    db.insert("sessions", session_id="cc-only", tool="claude-code", project_path="/p/one", started_at=prev, ended_at=prev + 60)
    _request(db, prev + 5, "cc-only", "claude-code", "Claude-Opus-5.5", i=300, o=30)
    for chosen in (DASHED, DOTTED):
        assert _board(db, model=chosen)["kpis"]["prev"]["tokens"] == 11 + 22 + 330
