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
