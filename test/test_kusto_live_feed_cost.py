"""The change feed's query budget: an idle feed is cheap, a local write makes it fast.

The reader runs against a fake SDK on a fake clock; queries are counted, never timed.
"""

from __future__ import annotations

import json
import re
from types import SimpleNamespace

import pytest

from aictl.kusto import KustoSettings
from aictl.stores.kusto import live_reader
from aictl.stores.kusto.live_reader import BACKGROUND_TABLES, ReaderConfig, SharedKustoReader
from aictl.stores.kusto.tables import Table

VERSIONED = Table(
    (("session_id", "string"), ("project_path", "string"), ("rowid", "long")),
    key=("session_id",), ingestion="inline", tombstone="_deleted",
)
RAW = Table((), key=(), ingestion="inline")
# Fifty-five tables, as many as a real store has: the cost must not grow with their number.
TABLES = {"requests": VERSIONED, "metrics": RAW, "events": RAW,
          **{f"quiet_{i}": Table((), key=(), ingestion="inline") for i in range(52)}}
SETTINGS = KustoSettings("http://feed.invalid:1", "test", auth="none", ingestion="queued",
                         table_ingestion={"events": "streaming", "metrics": "streaming"})


class _Table:
    def __init__(self, row):
        self.columns = [SimpleNamespace(column_name=name, column_type="bool" if isinstance(value, bool) else "string")
                        for name, value in row.items()]
        self.rows = [list(row.values())]

    def __iter__(self):
        return iter(self.rows)


def _response(row):
    return SimpleNamespace(primary_results=[_Table(row)], errors_count=0)


class FakeCluster:
    """Rows per table with the cursor position that ingested them; counts every request."""

    def __init__(self):
        self.position = 0
        self.rows: dict[str, list[dict]] = {name: [] for name in TABLES}
        self.queries: list[str] = []
        self.commands: list[str] = []

    def write(self, table, *, assigned=True):
        if assigned:
            self.position += 1
        self.rows[table].append({"cursor": self.position if assigned else None, "ingestion": None if not assigned else self.position})

    def execute_mgmt(self, database, command, properties=None):
        self.commands.append(command)
        if command.startswith(".show database schema"):
            columns = ("session_id", "project_path", "rowid", "_v", "_deleted", "node_id")
            rows = [{"TableName": "requests", "ColumnName": c} for c in columns]
            rows += [{"TableName": name, "ColumnName": "node_id"} for name in TABLES if name != "requests"]
            return SimpleNamespace(primary_results=[_Rows(rows)], errors_count=0)
        assert command == ".show table * policy ingestiontime", command
        rows = [{"EntityName": f"[test].[{name}]", "Policy": json.dumps({"IsEnabled": True})} for name in TABLES]
        return SimpleNamespace(primary_results=[_Rows(rows)], errors_count=0)

    def execute(self, database, query, properties=None):
        self.queries.append(query)
        if query.startswith("print aictl_live_cursor"):
            return _response({"aictl_live_cursor": f"c{self.position}", "aictl_live_now": "2026-11-24T10:00:00+00:00"})
        if query.startswith("let aictl_upper=cursor_current();"):
            row = {"aictl_live_cursor": f"c{self.position}", "aictl_live_now": "2026-11-24T10:00:00+00:00"}
            for arm, name, lower in re.findall(r"(aictl_hit_\d+)=isnotnull\(toscalar\(\['(\w+)'\] \| where cursor_after\(\"c(\d+)\"\)", query):
                row[arm] = any(r["cursor"] is not None and r["cursor"] > int(lower) for r in self.rows[name])
            for arm, name in re.findall(r"(aictl_preview_\d+)=toscalar\(\['(\w+)'\]", query):
                recent = self.rows[name]
                pending = [r for r in recent if r["ingestion"] is None]
                latest = max((r["ingestion"] for r in recent if r["ingestion"] is not None), default="")
                row[arm] = json.dumps([len(recent), len(pending), str(latest)])
            return _response(row)
        if query.startswith("print aictl_count_"):
            row = {}
            for arm, name in re.findall(r"(aictl_count_\d+)=toscalar\(\['(\w+)'\]", query):
                row[arm] = json.dumps([len(self.rows[name]), ""])
            return _response(row)
        raise AssertionError(f"unexpected query: {query[:80]}")


class _Rows:
    def __init__(self, rows):
        names = list(dict.fromkeys(name for row in rows for name in row))
        self.columns = [SimpleNamespace(column_name=name, column_type="string") for name in names]
        self.rows = [[row.get(name) for name in names] for row in rows]

    def __iter__(self):
        return iter(self.rows)


@pytest.fixture
def clock(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(live_reader.time, "monotonic", lambda: now[0])
    return now


def ready_reader(cluster):
    reader = SharedKustoReader(SETTINGS, client=cluster, tables=TABLES, config=ReaderConfig())
    batches = []
    for _ in range(10):
        batches.extend(reader.poll_once())
        if reader.latest_status().ready:
            break
    assert reader.latest_status().ready
    return reader, batches


def run_for(reader, clock, seconds):
    """Poll whenever the reader says its next query is due, for *seconds* of fake time."""
    batches = []
    end = clock[0] + seconds
    while clock[0] < end:
        batches.extend(reader.poll_once())
        clock[0] += max(reader._next_wait(), 0.05)
    return batches


def requests_and_commands(cluster):
    return len(cluster.queries) + len(cluster.commands)


def test_an_idle_feed_sends_at_most_six_queries_a_minute_whatever_the_number_of_tables(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    before = requests_and_commands(cluster)
    batches = run_for(reader, clock, 3600)
    sent = requests_and_commands(cluster) - before
    assert sent <= 6 * 60, f"{sent} queries in an idle hour"
    assert not [b for b in batches if b.kind == "changes"]
    # One probe covers every table: no per-table or per-group probe, no key or winner pages.
    probes = [q for q in cluster.queries if q.startswith("let aictl_upper")]
    assert probes and all(q.count("cursor_after(") == len(TABLES) for q in probes)
    assert not any("aictl_live_key" in q for q in cluster.queries)


def test_background_tables_alone_keep_the_feed_at_the_idle_pace_but_are_still_published(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    before = requests_and_commands(cluster)
    end = clock[0] + 600
    published = []
    while clock[0] < end:
        cluster.write("metrics")
        published.extend(b for b in reader.poll_once() if b.kind == "changes")
        clock[0] += max(reader._next_wait(), 0.05)
    sent = requests_and_commands(cluster) - before
    assert sent <= 6 * 10
    assert published and all(set(b.changed_tables) <= BACKGROUND_TABLES for b in published)


def test_a_local_write_wakes_the_feed_and_the_row_is_published_on_the_next_poll(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    run_for(reader, clock, 120)
    assert not reader.capabilities()["busy"]
    cluster.write("requests")
    reader.local_write("requests")
    assert reader._next_wait() == 0.0
    batches = reader.poll_once()
    assert any(b.kind == "changes" and "requests" in b.changed_tables for b in batches)
    # Still busy: the next probe is due at the busy pace.
    assert reader._next_wait() <= reader.config.busy_poll_s


def test_a_write_to_a_background_table_does_not_wake_the_feed(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    run_for(reader, clock, 120)
    waiting = reader._next_wait()
    reader.local_write("metrics")
    assert reader._next_wait() == waiting


def test_streaming_rows_without_a_cursor_are_published_from_the_preview_stamp(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    run_for(reader, clock, 30)
    cluster.write("events", assigned=False)
    clock[0] += reader._next_wait()
    batches = reader.poll_once()
    assert any(b.kind == "changes" and "events" in b.changed_tables for b in batches)
    frontier = reader.latest_status().frontier["events"]
    assert frontier == f"c{cluster.position}"  # the preview never moves a frontier past the cursor


def test_rows_removed_from_a_covered_range_resync_the_table_at_reconciliation(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    cluster.write("requests")
    run_for(reader, clock, 30)
    cluster.rows["requests"].clear()
    batches = run_for(reader, clock, reader.config.reconcile_interval_s + 1)
    assert any(b.kind == "resync" and b.reason == "reconcile" and b.changed_tables == ("requests",) for b in batches)


def test_a_failed_probe_keeps_every_frontier(clock):
    cluster = FakeCluster()
    reader, _ = ready_reader(cluster)
    run_for(reader, clock, 30)
    frontier = reader.latest_status().frontier
    cluster.write("requests")
    original = cluster.execute
    cluster.execute = lambda database, query, properties=None: (_ for _ in ()).throw(OSError("offline"))
    clock[0] += reader._next_wait()
    reader.poll_once()
    assert reader.latest_status().stale and reader.latest_status().frontier == frontier
    cluster.execute = original
    clock[0] += reader._next_wait()
    batches = reader.poll_once()
    assert any(b.kind == "changes" and "requests" in b.changed_tables for b in batches)
    assert not reader.latest_status().stale


def test_the_table_ingester_wakes_the_feed_of_its_destination(clock):
    from aictl.stores.kusto.ingest import TableIngester

    settings = KustoSettings("http://wake.invalid:1", "wake", auth="none", ingestion="queued")
    reader = live_reader.shared_reader(settings, table_names=("requests",))
    try:
        reader._tick_next = clock[0] + 60
        sent = []
        ingester = TableIngester(settings, {"queued": SimpleNamespace(ingest_lines=lambda t, lines: sent.append(t))})
        ingester.ingest_lines("metrics", ["{}"])
        assert reader._tick_next == clock[0] + 60  # a background table does not wake it
        ingester.ingest_lines("requests", ["{}"])
        assert sent == ["metrics", "requests"]
        assert reader._tick_next == 0.0 and reader.capabilities()["busy"]
    finally:
        reader.close()
