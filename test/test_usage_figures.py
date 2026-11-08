"""Usage and cost figures agree with the store, whichever endpoint reports them.

Each class pins one way an older endpoint disagreed with the stored rows: a
window edge that was ignored or rounded to the day, a list cut to the newest
rows, lifetime totals placed in one time bucket, a missing price that left
tokens out of the cost without a word, and credits that were stored but never
shown. The numbers are worked out by hand.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta

import pytest

from aictl.dashboard.analytics import _compute_response_time, compute_usage_summary, window_sessions
from aictl.dashboard.board_api import Filters, compute_board
from aictl.ingesters.transcript_usage import local_day
from aictl.storage import HistoryDB

# A fixed local date well in the past, so "now" never falls inside the window.
DAY1 = datetime(2026, 3, 10)
DAY2 = DAY1 + timedelta(days=1)
DAY3 = DAY1 + timedelta(days=2)


def at(day: datetime, hour: float) -> float:
    return (day + timedelta(hours=hour)).timestamp()


def usage_row(sid, tool, started, last, days, **extra):
    """A session_usage row whose totals are the sum of its days (one model, ``m``)."""
    keys = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens")
    daily = {
        local_day(ts): {**dict.fromkeys(keys, 0), "cost_usd": 0.0, **values, "models": {"m": {"requests": 1, **dict.fromkeys(keys, 0), **values}}}
        for ts, values in days
    }
    totals = {k: sum(d[k] for d in daily.values()) for k in keys}
    return {
        "session_id": sid,
        "tool": tool,
        "started_at": started,
        "last_activity_at": last,
        "model": "m",
        "models": {"m": {"requests": len(daily), **totals}},
        "daily": daily,
        "request_count": len(daily),
        "project_path": "/p/one",
        **totals,
        **extra,
    }


@pytest.fixture
def db(tmp_path):
    d = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    yield d
    d.close()


# ── Usage summary window ──────────────────────────────────────────


class TestWindowEdges:
    """A window edge inside a day used to take or drop the whole day of every session."""

    def seed(self, db):
        # Morning only on day 1, evening only on day 1, and one that crosses noon.
        db.upsert_session_usage(usage_row("morning", "claude-code", at(DAY1, 8), at(DAY1, 9), [(at(DAY1, 8), {"output_tokens": 10})]))
        db.upsert_session_usage(usage_row("evening", "claude-code", at(DAY1, 20), at(DAY1, 21), [(at(DAY1, 20), {"output_tokens": 20})]))
        db.upsert_session_usage(usage_row("across", "claude-code", at(DAY1, 11), at(DAY1, 13), [(at(DAY1, 11), {"output_tokens": 40})]))

    def test_a_session_day_wholly_outside_the_window_is_left_out(self, db):
        self.seed(db)
        summary = compute_usage_summary(db, at(DAY1, 12), at(DAY1, 23))
        assert summary["totals"]["output_tokens"] == 20 + 40
        assert summary["totals"]["sessions"] == 2

    def test_until_cuts_the_end(self, db):
        self.seed(db)
        summary = compute_usage_summary(db, at(DAY1, 0), at(DAY1, 10))
        assert summary["totals"]["output_tokens"] == 10  # 'across' began at 11:00, after the end

    def test_a_day_cut_through_its_activity_counts_whole_and_says_so(self, db):
        self.seed(db)
        summary = compute_usage_summary(db, at(DAY1, 12), at(DAY1, 23))
        assert summary["window"] == {"granularity": "day", "approximate": True, "approximate_session_days": 1}
        (day,) = summary["daily"]
        assert day["date"] == local_day(at(DAY1, 0))
        sessions, _ = window_sessions(db, at(DAY1, 12), at(DAY1, 23))
        assert {s["session_id"]: s["approximate_days"] for s in sessions} == {"across": [day["date"]], "evening": []}

    def test_a_window_that_cuts_nothing_is_exact(self, db):
        self.seed(db)
        summary = compute_usage_summary(db, at(DAY1, 0), at(DAY2, 0))
        assert summary["totals"]["output_tokens"] == 70
        assert summary["window"]["approximate"] is False

    def test_the_running_day_is_marked_partial(self, db):
        now = time.time()
        db.upsert_session_usage(usage_row("today", "claude-code", now - 60, now, [(now, {"output_tokens": 5})]))
        db.upsert_session_usage(usage_row("old", "claude-code", at(DAY1, 8), at(DAY1, 9), [(at(DAY1, 8), {"output_tokens": 5})]))
        summary = compute_usage_summary(db, at(DAY1, 0), now)
        assert {d["date"]: d["partial"] for d in summary["daily"]} == {local_day(now): True, local_day(at(DAY1, 0)): False}


# ── Response-time rows ────────────────────────────────────────────


class TestResponseTimeRows:
    """The percentiles came from the newest 2000 rows and the payload did not say so."""

    def seed(self, db, count):
        base = time.time() - 1000
        rows = [
            {"ts": base + i, "session_id": "s", "tool": "claude-code", "model": "m", "duration_ms": float(i), "input_tokens": 1, "output_tokens": 1,
             "dedup_key": f"k{i}"}
            for i in range(count)
        ]
        conn = db._conn()
        for r in rows:
            cols = ", ".join(r)
            conn.execute(f"INSERT INTO requests ({cols}) VALUES ({', '.join('?' * len(r))})", tuple(r.values()))
        conn.commit()
        return base

    def test_model_figures_cover_every_request_and_the_list_says_it_is_cut(self, db):
        base = self.seed(db, 100)
        out = _compute_response_time(db, base - 1, base + 1000, limit=10)
        (group,) = out["by_model"]
        assert group["count"] == 100
        assert group["avg_ms"] == 49.5
        assert group["p50_ms"] == 50  # rank n // 2 of 0..99, not of the newest ten
        assert group["p95_ms"] == 95
        assert group["total_tokens"] == 200
        assert len(out["requests"]) == 10
        assert out["requests_listed"] == {"available": 100, "listed": 10, "limit": 10, "newest_only": True}

    def test_a_list_that_holds_every_request_is_not_marked_cut(self, db):
        base = self.seed(db, 5)
        out = _compute_response_time(db, base - 1, base + 1000, limit=10)
        assert out["requests_listed"] == {"available": 5, "listed": 5, "limit": 10, "newest_only": False}
        assert _compute_response_time(db, base + 5000, base + 6000)["requests_listed"]["available"] == 0


# ── /api/board ────────────────────────────────────────────────────


def board(db, since, until, now=None, **kw):
    return compute_board(db, Filters(since=since, until=until, **kw), None, now or until)


def put_usage(db, sid, tool, started, last, days, models_per_day=True, **extra):
    row = usage_row(sid, tool, started, last, days, **extra)
    if not models_per_day:
        for d in row["daily"].values():
            d.pop("models")
    db.upsert_session_usage(row)


class TestFallbackByDay:
    """A session with no request rows was placed whole at its last activity."""

    def test_each_day_lands_in_its_own_bucket_and_outside_days_are_left_out(self, db):
        put_usage(
            db, "lifetime", "codex-cli", at(DAY1, 10), at(DAY3, 14),
            [(at(DAY1, 10), {"input_tokens": 100}), (at(DAY2, 10), {"input_tokens": 200}), (at(DAY3, 10), {"input_tokens": 400})],
        )
        payload = board(db, at(DAY1, 0), at(DAY3, 0) + 86400, buckets=3)
        assert payload["series"]["tokens"]["input"] == [100, 200, 400]
        # The window holds only the middle day: only that day's tokens count, not the lifetime 700.
        one_day = board(db, at(DAY2, 0), at(DAY3, 0), buckets=2)
        assert sum(one_day["series"]["tokens"]["input"]) == 200
        assert one_day["kpis"]["tokens"] == 200
        assert one_day["kpis"]["prev"]["tokens"] == 100  # the day before is the previous window

    def test_days_that_do_not_add_up_to_the_total_fall_back_to_the_whole_session(self, db):
        put_usage(db, "odd", "codex-cli", at(DAY1, 10), at(DAY2, 14), [(at(DAY1, 10), {"input_tokens": 100}), (at(DAY2, 10), {"input_tokens": 200})])
        db._conn().execute("UPDATE session_usage SET input_tokens = 999 WHERE session_id = 'odd'")
        db._conn().commit()
        payload = board(db, at(DAY1, 0), at(DAY2, 0) + 86400, buckets=2)
        assert payload["series"]["tokens"]["input"] == [0, 999]  # at the last activity, as before


class TestUnpricedTokens:
    def test_tokens_of_a_model_with_no_price_are_reported_with_its_name(self, db):
        now = at(DAY2, 12)
        conn = db._conn()
        for i, (model, tokens) in enumerate((("no-such-model", 70), ("no-such-model", 30), ("other-unknown", 5), ("claude-sonnet-4-5", 1000))):
            conn.execute(
                "INSERT INTO requests(ts, session_id, tool, dedup_key, model, input_tokens) VALUES(?,?,?,?,?,?)",
                (now - 100 + i, "s", "claude-code", f"k{i}", model, tokens),
            )
        conn.commit()
        payload = board(db, now - 3600, now)
        assert payload["unpriced"] == {
            "tokens": 105,
            "share": 0.095,
            "models": [{"model": "no-such-model", "tokens": 100}, {"model": "other-unknown", "tokens": 5}],
        }
        # The cost stays the priced part only, and is not zero.
        assert payload["kpis"]["cost_usd"] > 0

    def test_when_everything_has_a_price_none_is_unpriced(self, db):
        now = at(DAY2, 12)
        db._conn().execute(
            "INSERT INTO requests(ts, session_id, tool, dedup_key, model, input_tokens) VALUES(?,?,?,?,?,?)",
            (now - 10, "s", "claude-code", "k", "claude-sonnet-4-5", 10),
        )
        db._conn().commit()
        assert board(db, now - 3600, now)["unpriced"] == {"tokens": 0, "share": 0.0, "models": []}


class TestCredits:
    def copilot(self, db, sid, credits, tool="copilot-cli", ts=None):
        ts = ts or at(DAY2, 10)
        row = usage_row(sid, tool, ts, ts + 3600, [(ts, {"input_tokens": 10})], billing_unit="ai_credits")
        for d in row["daily"].values():
            if credits is not None:
                d["billing_amount"] = credits
                d["models"]["m"]["billing_amount"] = credits
        row["billing_amount"] = credits
        db.upsert_session_usage(row)

    def test_credits_are_reported_in_their_own_unit_not_as_dollars(self, db):
        self.copilot(db, "a", 1200.5)
        self.copilot(db, "b", 300.25, tool="copilot-desktop")
        payload = board(db, at(DAY2, 0), at(DAY3, 0))
        assert payload["credits"] == {
            "amount": 1500.75,
            "unit": "ai_credits",
            "by_tool": {"copilot-cli": 1200.5, "copilot-desktop": 300.25},
            "approximate": False,
        }
        assert payload["kpis"]["cost_usd"] is None or payload["kpis"]["cost_usd"] != 1500.75

    def test_credits_follow_the_tool_filter(self, db):
        self.copilot(db, "a", 1200.5)
        self.copilot(db, "b", 300.25, tool="copilot-desktop")
        payload = board(db, at(DAY2, 0), at(DAY3, 0), tools=("copilot-desktop",))
        assert payload["credits"]["amount"] == 300.25

    def test_no_copilot_session_in_view_means_no_credits_figure(self, db):
        put_usage(db, "c", "claude-code", at(DAY2, 9), at(DAY2, 10), [(at(DAY2, 9), {"input_tokens": 3})])
        assert board(db, at(DAY2, 0), at(DAY3, 0))["credits"] is None

    def test_credits_not_recorded_are_unknown_not_zero(self, db):
        self.copilot(db, "a", None)
        credits = board(db, at(DAY2, 0), at(DAY3, 0))["credits"]
        assert credits["amount"] is None

    def test_a_window_cutting_through_the_day_is_marked_approximate(self, db):
        self.copilot(db, "a", 10.0)
        assert board(db, at(DAY2, 10.5), at(DAY3, 0))["credits"]["approximate"] is True


class TestPartialBucket:
    def test_the_bucket_that_ends_after_now_is_marked(self, db):
        now = at(DAY2, 12)
        assert board(db, now - 3600, now + 60, now=now, buckets=6)["range"]["partial_bucket"] == 5

    def test_a_window_that_ended_has_no_partial_bucket(self, db):
        now = at(DAY3, 12)
        assert board(db, at(DAY1, 0), at(DAY2, 0), now=now, buckets=6)["range"]["partial_bucket"] is None
