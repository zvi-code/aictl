"""The board's long periods in node and fleet scope: 90 days, and all history (full_history.py)."""

from __future__ import annotations

import json

import pytest

DAY = 86400
# 2026-11-24 12:00 UTC.
NOW = 1_795_521_600


@pytest.fixture
def add(kusto_store):
    """Insert one stored row the way the writer files it: a version, its node and its project."""
    from aictl.stores.kusto.tables import TABLES

    def add(table, node, key, version=1, deleted=False, **fields):
        schema = TABLES[table]
        columns = dict(schema.columns)
        row = {k: v for k, v in fields.items() if k in columns}
        row.update(node_id=node, _v=f"2026-01-{version:02d}")
        if schema.tombstone:
            row[schema.tombstone] = deleted
        if "dedup_key" in columns:
            row.setdefault("dedup_key", str(key))
        kusto_store.insert(table, **row)

    return add


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch):
    """No answer, selection or memo of an earlier read: every read below reaches the reader."""
    from aictl.dashboard import board_projection, history_board

    for name in ("_cache", "_inflight", "_latest", "_selections", "_viewers", "_latest_selection"):
        monkeypatch.setattr(history_board, name, {})
    for name in ("_facts_memo", "_facts_inflight", "_sources_memo"):
        monkeypatch.setattr(board_projection, name, {})


def _section(store, query, section):
    from aictl.dashboard.history_board import read_section

    return json.loads(read_section(store, f"{query}&section={section}", now=NOW))


def test_a_fleet_board_answers_90_days_in_30_buckets_of_3_days(kusto_store, add):
    """90 d is longer than the 31 days node and fleet history once allowed: it was refused with 422."""
    sid = "9d000000-0000-4000-8000-000000000001"
    add("sessions", "host-a", sid, session_id=sid, tool="claude-code", project="/p/alpha", project_path="/p/alpha",
        started_at=NOW - 80 * DAY, ended_at=NOW - 80 * DAY + 600)
    until = NOW - NOW % (3 * DAY) + 3 * DAY
    usage = _section(kusto_store, f"scope=fleet&since={until - 90 * DAY}&until={until}&buckets=30", "usage")
    span = usage["fields"]["range"]
    assert span["bucket_s"] == 3 * DAY
    assert len(span["bucket_starts"]) == 30
    assert span["since"] == until - 90 * DAY


# ── All history: since=all (full_history.py) ──

# 2026-07-09 13:20 UTC: the first session the store holds in the fleet.
FIRST = 1_783_555_200 + 13 * 3600 + 20 * 60
ALL = f"scope=fleet&since=all&until={NOW}"


@pytest.fixture
def stored(add):
    """Sessions on two nodes and in two projects; the oldest one is deleted, and one has no start."""
    def session(node, n, project, deleted=False, version=1, **times):
        sid = f"a1100000-0000-4000-8000-00000000000{n}"
        add("sessions", node, sid, version=version, deleted=deleted, session_id=sid, tool="claude-code",
            project=project, project_path=project, **times)
        if not deleted:
            ts = times.get("started_at") or times["last_activity_at"]
            add("requests", node, n, id=n, session_id=sid, ts=ts + 60, tool="claude-code", model="model-a",
                project=project, input_tokens=100, output_tokens=10)

    session("host-a", 1, "/p/alpha", started_at=FIRST, ended_at=FIRST + 600)
    session("host-b", 2, "/p/beta", started_at=FIRST + 23 * DAY, ended_at=FIRST + 23 * DAY + 600)
    session("host-b", 3, "/p/beta", last_activity_at=FIRST + 40 * DAY)
    # Deleted: its tombstone hides the oldest start of all.
    session("host-b", 4, "/p/beta", started_at=FIRST - 30 * DAY)
    session("host-b", 4, "/p/beta", version=2, deleted=True, started_at=FIRST - 30 * DAY)


def _day(ts):
    return ts - ts % DAY


def test_all_history_starts_at_the_first_stored_session_in_whole_days(kusto_store, stored):
    span = _section(kusto_store, ALL, "usage")["fields"]["range"]
    assert span["since"] == _day(FIRST)
    assert span["bucket_s"] % DAY == 0
    assert len(span["bucket_starts"]) <= 60
    assert span["until"] >= NOW and span["until"] - NOW < span["bucket_s"]
    assert span["since"] + len(span["bucket_starts"]) * span["bucket_s"] == span["until"]


def test_every_section_and_the_single_board_read_one_window(kusto_store, stored):
    from aictl.dashboard import history_board
    from aictl.dashboard.board_sections import SECTIONS

    usage = _section(kusto_store, ALL, "usage")["fields"]["range"]
    for name in SECTIONS:
        _section(kusto_store, ALL, name)
    windows = {(s.filters.since, s.filters.until, s.filters.buckets) for s in history_board._selections.values()}
    assert windows == {(usage["since"], usage["until"], len(usage["bucket_starts"]))}
    tools = _section(kusto_store, ALL, "tools")["fields"]["series"]["messages"]
    assert all(len(values) == len(usage["bucket_starts"]) for values in tools.values())
    board = json.loads(history_board.read_board(kusto_store, ALL, now=NOW))
    assert {k: board["range"][k] for k in ("since", "until", "bucket_s")} == {k: usage[k] for k in ("since", "until", "bucket_s")}


@pytest.mark.parametrize(("query", "first"), [
    (f"{ALL}&project=/p/beta", FIRST + 23 * DAY),
    (ALL.replace("scope=fleet", "scope=node&node_id=host-b"), FIRST + 23 * DAY),
    (ALL.replace("scope=fleet", "scope=node&node_id=host-a"), FIRST),
])
def test_all_history_follows_the_node_scope_and_the_project_filter(kusto_store, stored, query, first):
    assert _section(kusto_store, query, "usage")["fields"]["range"]["since"] == _day(first)


def test_the_start_is_read_once_per_scope_for_a_few_minutes(monkeypatch):
    from types import SimpleNamespace

    from aictl.dashboard import full_history

    monkeypatch.setattr(full_history, "_cache", {})
    reads = []
    history = SimpleNamespace(reader="r", node=None,
                              read=lambda view, **params: reads.append(view) or [{"first_ts": FIRST, "sessions": 3}])
    assert full_history.history_start(history) == full_history.history_start(history) == FIRST
    assert reads == ["board.history_start"]
    monkeypatch.setattr(full_history.time, "monotonic", lambda: 1e12)
    full_history.history_start(history)
    assert len(reads) == 2


@pytest.mark.parametrize(("age", "step", "most"), [
    (5 * 3600, 3600, 6), (2 * DAY, 3600, 49), (4 * DAY, 2 * 3600, 49), (7 * DAY, 3 * 3600, 57),
    (20 * DAY, DAY, 21), (59 * DAY, DAY, 60), (139 * DAY, 3 * DAY, 47), (3 * 365 * DAY, 19 * DAY, 58),
])
def test_the_buckets_are_whole_hours_for_a_young_store_and_whole_days_after(age, step, most):
    from aictl.dashboard.full_history import MAX_FULL_BUCKETS, window

    since, until, buckets = window(NOW - age, NOW)
    assert (until - since) / buckets == step
    assert since % (step if step < DAY else DAY) == 0
    assert since <= NOW - age and until >= NOW and buckets <= min(most, MAX_FULL_BUCKETS)


def test_an_empty_scope_shows_the_last_day_and_other_routes_read_from_the_start_of_time():
    from aictl.dashboard.board_filters import parse_filters
    from aictl.dashboard.full_history import window

    since, until, buckets = window(None, NOW)
    assert until - since == DAY and buckets == 24
    filters = parse_filters(f"since=all&until={NOW}", NOW)
    assert filters.full_history and filters.since == 0.0
