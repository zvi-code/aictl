"""A session flow is read in segments: newest first, older ones on demand, only changed ones again.

The views are modelled in Python (rows by time window, stamps per segment), so the reads the flow
issues can be counted and their limits checked.
"""

from __future__ import annotations

import pytest

from aictl.dashboard import flow_projection
from aictl.dashboard.projections.history import HistoryScope
from aictl.stores import Store
from aictl.stores.testing import FixtureReader

T = 1_795_000_000.0
SID = "long-s"


class Session:
    """The records of one session: (ts, row) with a version each, and the reads made of them."""

    def __init__(self, turns: int, calls_per_turn: int = 3):
        self.version = 0
        self.records: list[dict] = []
        self.reads: list[tuple[str, dict]] = []
        self.add({"row_type": "session", "values": ["claude-code", "/p", T, None]}, None, key="session")
        self.add({"row_type": "known", "values": [True]}, None, key="known")
        for turn in range(turns):
            self.turn(T + 100 * turn + 1, calls_per_turn)

    def add(self, row: dict, ts: float | None, *, key: str) -> None:
        self.version += 1
        self.records = [r for r in self.records if r["key"] != key]
        self.records.append({"key": key, "ts": ts, "v": self.version, "row": row})

    def turn(self, at: float, calls: int) -> None:
        self.add({"row_type": "prompt", "values": [at, "", f"prompt {at}"]}, at, key=f"p{at}")
        for i in range(calls):
            ts = at + 1 + i
            self.add({"row_type": "call", "values": [ts, "", "m", 10, 2, 0, 0, 0.0, 100.0, 50.0, "stop", 0, "", None]},
                     ts, key=f"c{ts}")
            self.add({"row_type": "use", "values": [ts + 0.5, "", "Bash", f"run {ts}", "", "", 5.0, 0, 0, "auto"]},
                     ts + 0.5, key=f"u{ts}")

    def flow(self, params: dict) -> list[dict]:
        self.reads.append(("sequence.flow", dict(params)))
        lo, hi = params["since"], params["until"]
        return [r["row"] for r in self.records if r["ts"] is None or lo <= r["ts"] < hi]

    def bounds(self, params: dict) -> list[dict]:
        self.reads.append(("sequence.flow_bounds", dict(params)))
        since, until, layout = params["since"], params["until"], list(params.get("segment_bounds") or [])
        before = layout[0] if layout else until
        versions = [(until if r["key"] == "session" or r["ts"] is None else r["ts"], r["v"]) for r in self.records]
        stamps = []
        for index, lo in enumerate(layout):
            hi = layout[index + 1] if index + 1 < len(layout) else float("inf")
            inside = [v for ts, v in versions if lo <= ts < hi]
            if inside:
                stamps.append({"segment": index, "versions": len(inside), "newest": str(max(inside))})
        records = sorted((ts for ts, _ in versions if since <= ts < before), reverse=True)
        starts = [r["ts"] for r in self.records if r["row"]["row_type"] == "prompt" and since < r["ts"] < before]
        rows = params["page_rows"]
        cutoff = records[rows - 1] if len(records) >= rows else None
        start = max((s for s in starts if cutoff is not None and s <= cutoff), default=None)
        page_lo = since if cutoff is None or start is None else start
        page = [v for ts, v in versions if page_lo <= ts and (ts < before or not layout)]
        last = max((r["ts"] for r in self.records if r["row"]["row_type"] == "prompt" and since < r["ts"] < until),
                   default=None)
        return [{"stamps": stamps, "page_lo": page_lo, "page_stamp": [len(page), str(max(page, default=""))],
                 "older": bool(records), "last_turn": last}]

    def event_log(self, params: dict) -> list[dict]:
        self.reads.append(("sequence.event_log", dict(params)))
        return []

    def store(self) -> Store:
        return Store(reader=FixtureReader({
            "agents.resolve": [],
            "sequence.flow": self.flow,
            "sequence.flow_bounds": self.bounds,
            "sequence.event_log": self.event_log,
            "sequence.pid_sessions": [],
        }))

    def flow_reads(self) -> list[dict]:
        return [params for view, params in self.reads if view == "sequence.flow"]


@pytest.fixture(autouse=True)
def small_pages(monkeypatch):
    # Four records a page: a session of a few turns is read in several segments.
    monkeypatch.setattr(flow_projection, "FLOW_PAGE_ROWS", 4)


def test_a_flow_opens_with_its_newest_segment_and_no_read_returns_more_than_the_limit():
    session = Session(turns=20)
    db = session.store()
    status, body = flow_projection.agent_flow(db, SID, now=T + 10_000)
    assert status == 200
    reads = session.flow_reads()
    assert len(reads) == 1 and reads[0]["since"] > T  # the newest turn only, not the session
    assert all(params["limit"] < flow_projection.FLOW_READ_ROWS for view, params in session.reads
               if view in ("sequence.flow", "sequence.event_log"))
    summary = body["summary"]
    assert summary["older_events"] and not summary["complete"] and summary["first_offset"] == 0
    assert [e["type"] for e in body["turns"]][0] == "user_message"


def test_older_segments_load_on_demand_and_keep_the_positions_of_events_already_shown():
    session = Session(turns=20)
    db = session.store()
    _, newest = flow_projection.agent_flow(db, SID, now=T + 10_000)
    shown = {(e["ts"], e["type"]): e["step"] for e in newest["turns"]}
    _, older = flow_projection.agent_flow(db, SID, now=T + 10_000, offset=newest["summary"]["first_offset"] - 5,
                                         limit=5)
    assert older["summary"]["first_offset"] < newest["summary"]["first_offset"]
    assert older["summary"]["flow_epoch"] == newest["summary"]["flow_epoch"]
    assert all(e["ts"] < min(ts for ts, _ in shown) for e in older["turns"])
    _, again = flow_projection.agent_flow(db, SID, now=T + 10_000, offset=0, limit=500)
    assert {(e["ts"], e["type"]): e["step"] for e in again["turns"]} == shown


def test_the_live_stream_and_the_http_route_read_one_flow_cache():
    # The stream's newest window and the HTTP route's older windows must share one epoch and anchor,
    # or the page can never join an older window to the window it has.
    from aictl.dashboard.live.projection import _ProjectionDB

    session = Session(turns=20)
    db = session.store()
    live = _ProjectionDB(db, "epoch-1")
    history = HistoryScope.local(db)
    _, newest = flow_projection.agent_flow(live, SID, now=T + 10_000, limit=500, history=history)
    _, older = flow_projection.agent_flow(db, SID, now=T + 10_000, offset=newest["summary"]["first_offset"] - 5, limit=5,
                                         history=history)
    assert older["summary"]["flow_epoch"] == newest["summary"]["flow_epoch"] != ""
    assert older["summary"]["first_offset"] < newest["summary"]["first_offset"]
    assert older["summary"]["matched_events"] >= newest["summary"]["matched_events"]


def test_all_segments_read_give_the_events_of_one_whole_read_in_the_same_order():
    session = Session(turns=12)
    db = session.store()
    history = HistoryScope.local(db)
    flow_projection.agent_flow(db, SID, now=T + 10_000)
    _, paged, _ = flow_projection._session_flow(db, SID, 0.0, T + 10_060, None, history, open_end=True, whole=True)
    _, whole, _ = flow_projection._session_flow_build(db, None, SID, 0.0, T + 10_060, None, history=history)
    key = lambda e: (e["ts"], e["type"], e.get("to"), e.get("message"))  # noqa: E731
    assert [key(e) for e in paged] == [key(e) for e in whole]
    assert len(paged) == 12 * 7 + 1  # and the session start


def test_a_live_update_reads_only_the_segment_that_changed():
    session = Session(turns=12)
    db = session.store()
    flow_projection.agent_flow(db, SID, now=T + 10_000)
    flow_projection.agent_flow(db, SID, now=T + 10_000, offset=-10_000, limit=500)  # every segment read
    session.reads.clear()
    _, same = flow_projection.agent_flow(db, SID, now=T + 10_000)
    assert session.flow_reads() == []  # unchanged stamps: nothing is read again
    session.turn(T + 5000, calls=2)
    _, grown = flow_projection.agent_flow(db, SID, now=T + 10_000)
    reads = session.flow_reads()
    assert reads and all(params["since"] >= T + 1101 for params in reads)  # the newest turns, not the session
    assert grown["turns"][-1]["ts"] > same["turns"][-1]["ts"]
    assert grown["summary"]["flow_epoch"] == same["summary"]["flow_epoch"]
