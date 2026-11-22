"""Offline SDK tests: visibility, checkpointing and bounded shared fan-out."""

from __future__ import annotations

import base64
import json
import re
import threading
from dataclasses import replace
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from aictl.kusto import KustoSettings
from aictl.stores.kusto.live_reader import ReaderConfig, SharedKustoReader, shared_reader
from aictl.stores.kusto.tables import Table

TABLE = Table(
    (("session_id", "string"), ("project_path", "string"), ("rowid", "long")),
    key=("session_id",),
    ingestion="inline",
    tombstone="_deleted",
)
RAW = Table((), key=(), ingestion="inline")
SETTINGS = KustoSettings("http://reader.invalid:1", "test", auth="none", ingestion="inline")
NOW = datetime(2026, 11, 10, 10, tzinfo=timezone.utc)


class _ResultTable:
    def __init__(self, rows):
        names = list(dict.fromkeys(name for row in rows for name in row))
        self.columns = [
            SimpleNamespace(
                column_name=name,
                column_type="bool"
                if name == "aictl_live_deleted" or any(isinstance(row.get(name), bool) for row in rows)
                else "long"
                if name in {"rowid", "aictl_live_count"}
                else "string",
            )
            for name in names
        ]
        self.rows = [[row.get(name) for name in names] for row in rows]

    def __iter__(self):
        return iter(self.rows)


def response(rows, errors=0):
    return SimpleNamespace(primary_results=[_ResultTable(rows)], errors_count=errors)


def token(sid):
    return base64.b64encode(json.dumps([sid], separators=(",", ":"), ensure_ascii=False).encode("utf-8")).decode(
        "ascii"
    )


class FakeSDK:
    """Models cursor assignment separately from query visibility; never performs I/O."""

    def __init__(self, policy=True):
        self.rows = []
        self.raw_rows = []
        self.raw_enabled = False
        self.empty_tables = ()
        self.present = True
        self.policy = policy
        self.position = 0
        self.queries = []
        self.properties = []
        self.commands = []
        self.after_seed = None
        self.key_page_hook = None
        self.page_hook = None
        self.probe_hook = None
        self.seeded = threading.Event()

    @property
    def cursor(self):
        return f"opaque-{self.position}"

    def add(self, sid, version, *, deleted=False, assigned=True, ingestion=NOW, **extra):
        if assigned:
            self.position += 1
        row = dict(
            session_id=sid,
            project_path="C:\\repo",
            rowid=100 + len(self.rows),
            _v=version,
            _deleted=deleted,
            _cursor=self.position if assigned else None,
            _ingestion=ingestion,
            **extra,
        )
        self.rows.append(row)
        return row

    def assign(self, row):
        self.position += 1
        row["_cursor"] = self.position
        row["_ingestion"] = NOW

    def add_raw(self, *, assigned=True, ingestion=NOW):
        if assigned:
            self.position += 1
        row = {"_cursor": self.position if assigned else None, "_ingestion": ingestion}
        self.raw_rows.append(row)
        return row

    @staticmethod
    def _position(value):
        return int(value.removeprefix("opaque-")) if value else 0

    def execute_mgmt(self, database, command, properties=None):
        self.commands.append(command)
        if command.startswith(".show database schema"):
            rows = (
                [
                    {"TableName": "sessions", "ColumnName": name}
                    for name in ("session_id", "project_path", "rowid", "_v", "_deleted", "node_id")
                ]
                if self.present
                else []
            )
            if self.raw_enabled:
                rows.append({"TableName": "OTELLogs", "ColumnName": "node_id"})
            rows.extend({"TableName": name, "ColumnName": "node_id"} for name in self.empty_tables)
            return response(rows)
        assert command in {
            f".show table ['{n}'] policy ingestiontime" for n in ("sessions", "OTELLogs", *self.empty_tables)
        }
        return response([{"Policy": json.dumps({"IsEnabled": self.policy})}])

    def execute(self, database, query, properties=None):
        self.queries.append(query)
        self.properties.append(properties)
        if query.startswith("print aictl_live_cursor"):
            result = response([{"aictl_live_cursor": self.cursor, "aictl_live_now": NOW.isoformat()}])
            if self.after_seed is not None:
                self.after_seed()
                self.after_seed = None
            self.seeded.set()
            return result
        if query.startswith("print ["):
            flags = {}
            arms = re.findall(
                r"\['([^']+)'\]=isnotnull\(toscalar\(\['\1'\] \| where cursor_after\((\"(?:\\.|[^\"\\])*\")\) and cursor_before_or_at\((\"(?:\\.|[^\"\\])*\")\) \| where \['node_id'\] == (\"(?:\\.|[^\"\\])*\") \| project hit=1 \| take 1\)\)",
                query,
            )
            assert arms and len(arms) == query.count("cursor_after(")
            for name, lower, upper, node in arms:
                low, high = map(self._position, (json.loads(lower), json.loads(upper)))
                source = self.rows if name == "sessions" else self.raw_rows if name == "OTELLogs" else []
                changed = any(
                    row["_cursor"] is not None
                    and low < row["_cursor"] <= high
                    and row.get("node_id", SETTINGS.node_id) == json.loads(node)
                    for row in source
                )
                flags[name] = changed
            if self.probe_hook is not None:
                return self.probe_hook([flags])
            return response([flags])
        if "summarize aictl_live_count" in query:
            assert query.startswith("['OTELLogs']")
            candidates = self.raw_rows
            if "isnull(ingestion_time())" in query:
                candidates = [
                    row
                    for row in candidates
                    if row["_ingestion"] is None or (NOW - row["_ingestion"]).total_seconds() <= 120
                ]
            latest = max((row["_ingestion"] for row in candidates if row["_ingestion"] is not None), default=None)
            return response(
                [
                    {
                        "aictl_live_count": len(candidates),
                        "aictl_live_latest": latest.isoformat() if latest else "",
                    }
                ]
            )
        candidates = [r for r in self.rows if r.get("node_id", SETTINGS.node_id) == SETTINGS.node_id]
        assert f"['node_id'] == {json.dumps(SETTINGS.node_id)}" in query
        if " | summarize arg_max(" in query:
            literal_keys = re.search(r"where aictl_live_key in \(([^)]+)\)", query).group(1)
            keys = json.loads(f"[{literal_keys}]")
            first = re.search(r"where \['session_id'\] in \((.*?)\) \|", query).group(1)
            ids = json.loads(f"[{first}]")
            result = []
            for key in keys:
                matching = [r for r in candidates if r["session_id"] in ids and token(r["session_id"]) == key]
                if matching:
                    current = max(matching, key=lambda row: row["_v"])
                    result.append(
                        dict(
                            aictl_live_key=key,
                            aictl_live_version=current["_v"],
                            aictl_live_deleted=current["_deleted"],
                            **{name: current[name] for name in ("session_id", "project_path", "rowid")},
                        )
                    )
            return self.page_hook(query, result) if self.page_hook is not None else response(result)
        if "cursor_after(" in query:
            lower, upper = re.search(
                r"cursor_after\((\"(?:\\.|[^\"\\])*\")\) and cursor_before_or_at\((\"(?:\\.|[^\"\\])*\")\)",
                query,
            ).groups()
            low, high = map(self._position, (json.loads(lower), json.loads(upper)))
            candidates = [row for row in candidates if row["_cursor"] is not None and low < row["_cursor"] <= high]
        elif "isnull(ingestion_time())" in query:
            candidates = [
                row
                for row in candidates
                if row["_ingestion"] is None or (NOW - row["_ingestion"]).total_seconds() <= 120
            ]
        if "hash(aictl_live_key" in query:
            count, partition = map(int, re.search(r"hash\(aictl_live_key, (\d+)\) == (\d+)", query).groups())
            candidates = [
                row for row in candidates if sum(token(row["session_id"]).encode("utf-8")) % count == partition
            ]
        after = json.loads(re.search(r"strcmp\(aictl_live_key, (\"(?:\\.|[^\"\\])*\")\) > 0", query).group(1))
        limit = int(re.search(r"top (\d+) by aictl_live_key asc", query).group(1))
        pairs = sorted((token(row["session_id"]), row["session_id"]) for row in candidates)
        result = [dict(aictl_live_key=k, aictl_live_first=sid) for k, sid in pairs if k > after][:limit]
        return self.key_page_hook(query, result) if self.key_page_hook is not None else response(result)


def make_reader(sdk=None, **limits):
    config = ReaderConfig(
        **{
            "queries_per_poll": 1,
            "page_size": 2,
            "reconcile_partitions": 1,
            **limits,
        }
    )
    return SharedKustoReader(SETTINGS, client=sdk or FakeSDK(), tables={"sessions": TABLE}, config=config)


def initialize(reader):
    events = []
    for _ in range(len(reader.table_names) + 5):
        events.extend(reader.poll_once())
        if reader.latest_status().ready:
            break
    assert reader.latest_status().ready
    reader._preview_next = float("inf")
    reader._reconcile_next = float("inf")
    return events


def detect(reader):
    reader._capture_next = 0
    events = reader.poll_once()
    if reader.latest_status().details["catching_up"]:
        events += reader.poll_once()
    return events


def drain_range(reader):
    batches = []
    for _ in range(300):
        if not reader.latest_status().details["catching_up"]:
            return batches
        batches.extend(reader.poll_once())
    pytest.fail(f"Cursor did not drain: {reader.latest_status().reason}")


def row_hints(batches):
    return [row for batch in batches for row in batch.rows]


def test_idle_cursor_poll_skips_all_tables_and_active_probes_share_one_fixed_upper():
    sdk = FakeSDK()
    sdk.empty_tables = tuple(f"quiet_{i}" for i in range(54))
    reader = SharedKustoReader(
        SETTINGS,
        client=sdk,
        tables={"sessions": TABLE, **{name: Table((), key=(), ingestion="inline") for name in sdk.empty_tables}},
        config=ReaderConfig(queries_per_poll=1),
    )
    initialize(reader)
    sdk.queries.clear()
    detect(reader)
    assert len(sdk.queries) == 1 and sdk.queries[0].startswith("print aictl_live_cursor=cursor_current()")

    sdk.add("first", "v1")
    reader._capture_next = 0
    reader.poll_once()
    sdk.add("after-capture", "v2")
    events = drain_range(reader)
    probes = [q for q in sdk.queries if q.startswith("print [")]
    sizes = [q.count("cursor_after(") for q in probes]
    assert sum(sizes) == 55 and max(sizes) <= 4
    assert all(q.count('cursor_before_or_at("opaque-1")') == size for q, size in zip(probes, sizes, strict=True))
    assert [row.key for row in row_hints(events)] == [("first",)]
    assert set(reader.latest_status().frontier.values()) == {"opaque-1"}
    reader._capture_next = 0
    reader.poll_once()
    assert [row.key for row in row_hints(drain_range(reader))] == [("after-capture",)]


def test_scalar_probe_ignores_other_nodes_and_advances_empty_range():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    sdk.queries.clear()
    sdk.add("foreign", "v1", node_id=SETTINGS.node_id + "-other")
    events = [*detect(reader), *drain_range(reader)]
    assert not row_hints(events)
    assert not any(batch.changed_tables for batch in events)
    assert reader.latest_status().frontier == {"sessions": "opaque-1"}
    assert not any("aictl_live_key" in query for query in sdk.queries)

    sdk.add("local", "v2", node_id=SETTINGS.node_id)
    events = [*detect(reader), *drain_range(reader)]
    assert [row.key for row in row_hints(events)] == [("local",)]
    assert reader.latest_status().frontier == {"sessions": "opaque-2"}


@pytest.mark.parametrize("failure", ["partial", "missing_arm", "invalid_flag"])
def test_failed_probe_retries_its_exact_range_without_advancing_or_reprobing_completed_tables(failure):
    sdk = FakeSDK()
    sdk.raw_enabled = True
    reader = SharedKustoReader(
        SETTINGS,
        client=sdk,
        tables={"sessions": TABLE, "OTELLogs": RAW},
        table_names=("OTELLogs", "sessions"),
        config=ReaderConfig(queries_per_poll=1, tables_per_probe=1),
    )
    initialize(reader)
    sdk.add("pending", "v1")
    detect(reader)
    expected = {"OTELLogs": "opaque-1", "sessions": "opaque-0"}
    assert reader.latest_status().frontier == expected
    sdk.probe_hook = lambda rows: (
        response(rows, errors=1)
        if failure == "partial"
        else response([{} if failure == "missing_arm" else {"sessions": None}])
    )
    failed = reader.poll_once()
    assert failed[-1].stale and failed[-1].frontier == expected
    failed_query = sdk.queries[-1]
    sdk.probe_hook = None
    reader.poll_once()
    assert sdk.queries[-1] == failed_query and "OTELLogs" not in failed_query
    assert reader.latest_status().frontier == expected
    assert [row.key for row in row_hints(drain_range(reader))] == [("pending",)]
    assert set(reader.latest_status().frontier.values()) == {"opaque-1"}


def fail_low_memory():
    from azure.kusto.data.exceptions import KustoMultiApiError

    raise KustoMultiApiError(
        [
            {
                "OneApiErrors": [
                    {
                        "error": {
                            "code": "LowMemoryCondition",
                            "message": "bad allocation",
                            "@message": "E_LOW_MEMORY_CONDITION",
                        }
                    }
                ]
            }
        ]
    )


def test_memory_failure_splits_batch_backs_off_one_table_and_lets_others_pass_watermark(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr("aictl.stores.kusto.live_reader.time.monotonic", lambda: clock[0])
    sdk = FakeSDK()
    sdk.raw_enabled = True
    reader = SharedKustoReader(
        SETTINGS,
        client=sdk,
        tables={"sessions": TABLE, "OTELLogs": RAW},
        table_names=("OTELLogs", "sessions"),
        config=ReaderConfig(queries_per_poll=1, min_poll_s=2, max_error_s=4, failures_before_resync=1),
    )
    initialize(reader)
    sdk.add_raw()
    sdk.probe_hook = lambda rows: fail_low_memory() if "OTELLogs" in rows[0] else response(rows)
    detect(reader)
    reader._capture_next = float("inf")
    assert reader.latest_status().stale and reader.latest_status().reason == "cursor_memory_retry"
    for _ in range(5):
        reader.poll_once()
    assert reader.latest_status().frontier == {"OTELLogs": "opaque-0", "sessions": "opaque-1"}
    assert reader.latest_status().details["cursor_memory_retry_tables"] == ["OTELLogs"]

    sdk.add("newer", "v2")
    reader._capture_next = 0
    events = [b for _ in range(5) for b in reader.poll_once()]
    assert [row.key for row in row_hints(events)] == [("newer",)]
    assert reader.latest_status().frontier == {"OTELLogs": "opaque-0", "sessions": "opaque-2"}
    assert reader.latest_status().stale
    single = [q for q in sdk.queries if q.startswith("print ['OTELLogs']") and q.count("toscalar(") == 1]
    assert len(single) == 1
    for delay in (2, 4, 4):
        clock[0] += delay
        reader.poll_once()
        reader.poll_once()
    assert sdk.queries.count(single[0]) == 4
    sdk.probe_hook = None
    clock[0] += 4
    recovered = [b for _ in range(6) for b in reader.poll_once()]
    assert any(b.changed_tables == ("OTELLogs",) and b.frontier["OTELLogs"] == "opaque-1" for b in recovered)
    assert not reader.latest_status().stale
    assert set(reader.latest_status().frontier.values()) == {"opaque-2"}


def test_memory_failure_mid_page_preserves_the_page_token_and_retry_upper(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr("aictl.stores.kusto.live_reader.time.monotonic", lambda: clock[0])
    sdk = FakeSDK()
    reader = make_reader(sdk, page_size=1, failures_before_resync=1)
    initialize(reader)
    sdk.add("a", "v1")
    sdk.add("b", "v1")
    detect(reader)
    reader.poll_once()  # key page
    assert [row.key for row in row_hints(reader.poll_once())] == [("a",)]
    sdk.page_hook = lambda query, rows: fail_low_memory()
    reader.poll_once()  # next key page
    reader.poll_once()
    failed = sdk.queries[-1]
    assert reader.latest_status().stale and reader.latest_status().frontier == {"sessions": "opaque-0"}
    sdk.add("c", "v1")
    sdk.page_hook = None
    clock[0] += 1
    recovered = reader.poll_once()
    assert sdk.queries[-1] == failed
    assert [row.key for row in row_hints(recovered)] == [("b",)]
    assert reader.latest_status().frontier == {"sessions": "opaque-2"} and not reader.latest_status().stale


@pytest.mark.parametrize("stage", ["keys", "winners"])
def test_cursor_memory_retry_reduces_the_page_until_it_can_drain_without_skips(monkeypatch, stage):
    clock = [1000.0]
    monkeypatch.setattr("aictl.stores.kusto.live_reader.time.monotonic", lambda: clock[0])
    sdk = FakeSDK()
    reader = make_reader(sdk, page_size=4)
    initialize(reader)
    for sid in ("a", "b", "c", "d", "e"):
        sdk.add(sid, "v1")
    detect(reader)
    reader._capture_next = float("inf")
    if stage == "keys":
        sdk.key_page_hook = lambda q, rows: fail_low_memory() if len(rows) > 2 else response(rows)
    else:
        sdk.page_hook = lambda q, rows: fail_low_memory() if len(rows) > 1 else response(rows)

    hints = []
    for _ in range(40):
        before = len(sdk.queries)
        hints.extend(row_hints(reader.poll_once()))
        assert len(sdk.queries) - before <= 1  # queries_per_poll includes both stages and retries
        if reader.latest_status().stale:
            assert reader.latest_status().frontier["sessions"] == "opaque-0"
        if not reader.latest_status().details["catching_up"]:
            break
        clock[0] += 60
    assert [row.key for row in hints] == [(s,) for s in "abcde"]
    assert not reader.latest_status().stale and reader.latest_status().frontier == {"sessions": "opaque-5"}


def test_duplicate_versions_can_fill_key_page_without_hiding_next_key():
    sdk = FakeSDK()
    reader = make_reader(sdk, page_size=2)
    initialize(reader)
    for v in range(5):
        sdk.add("a", f"v{v}")
    sdk.add("b", "v1")
    sdk.add("b", "v9", deleted=True, node_id=SETTINGS.node_id + "-other")
    detect(reader)
    hints = row_hints(drain_range(reader))
    assert [(r.key, r.version, r.deleted) for r in hints] == [(("a",), "v4", False), (("b",), "v1", False)]
    assert reader.latest_status().frontier == {"sessions": "opaque-7"}


def test_key_removed_between_queries_invalidates_table_without_fabricating_a_deletion():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    sdk.add("gone", "v1")
    remaining = sdk.add("still-visible", "v1")
    detect(reader)
    reader.poll_once()
    sdk.rows[:] = [remaining]
    result = reader.poll_once()
    assert not row_hints(result) and not reader._dedup
    assert any(b.kind == "resync" and b.changed_tables == ("sessions",) for b in result)
    assert reader.latest_status().frontier == {"sessions": "opaque-2"}


def test_bootstrap_checkpoint_precedes_concurrent_other_machine_writes():
    sdk = FakeSDK()
    sdk.add("existing", "2030-01-01T00:00:00Z")
    sdk.after_seed = lambda: sdk.add("other-machine", "2020-01-01T00:00:00Z")
    reader = make_reader(sdk)
    events = initialize(reader)
    bootstrap = next(batch for batch in events if batch.kind == "bootstrap")
    assert bootstrap.frontier == {"sessions": "opaque-1"}
    assert not bootstrap.ready and bootstrap.reason == "policy_check"
    assert bootstrap.rows == ()
    events.extend(drain_range(reader))
    assert [row.key for row in row_hints(events)] == [("other-machine",)]
    assert reader.latest_status().frontier == {"sessions": "opaque-2"}
    assert all(command.startswith(".show ") for command in sdk.commands)


def test_fixed_cursor_range_pages_do_not_skip_late_low_key_or_old_version():
    sdk = FakeSDK()
    reader = make_reader(sdk, page_size=1)
    initialize(reader)
    for sid in ("a", "b", "c"):
        sdk.add(sid, "2030-01-01T00:00:00Z")
    detect(reader)
    first = (*reader.poll_once(), *reader.poll_once())
    assert [row.key for row in row_hints(first)] == [("a",)]
    assert reader.latest_status().frontier["sessions"] == "opaque-0"
    sdk.add("0-late", "2000-01-01T00:00:00Z")
    remaining = drain_range(reader)
    assert [row.key for row in row_hints(remaining)] == [("b",), ("c",)]
    assert reader.latest_status().frontier["sessions"] == "opaque-3"
    detect(reader)
    late = drain_range(reader)
    assert [row.key for row in row_hints(late)] == [("0-late",)]
    assert reader.latest_status().frontier["sessions"] == "opaque-4"
    assert all("max(['_v'])" not in query for query in sdk.queries)


def test_late_older_version_cannot_resurrect_tombstone_and_newer_update_can():
    sdk = FakeSDK()
    sdk.add("same", "2030-01-01T00:00:00Z", deleted=True)
    reader = make_reader(sdk)
    initialize(reader)
    sdk.add("same", "2020-01-01T00:00:00Z", content="private prompt", command="private arguments")
    detect(reader)
    deleted = row_hints(drain_range(reader))
    assert len(deleted) == 1 and deleted[0].deleted
    assert deleted[0].version == "2030-01-01T00:00:00Z"
    sdk.add("same", "2031-01-01T00:00:00Z")
    detect(reader)
    current = row_hints(drain_range(reader))
    assert current[0].key == deleted[0].key and not current[0].deleted
    assert set(current[0].data) == {"session_id", "rowid", "project_path"}
    assert not any("private" in str(batch) for batch in (*deleted, *current))
    page_queries = [query for query in sdk.queries if "aictl_live_key" in query]
    assert all("materialize(" not in query and " join " not in query for query in page_queries)
    assert any("arg_max(['_v']" in query and "cursor_after" not in query for query in page_queries)
    assert not any("content" in query or "command" in query for query in page_queries)


def test_queryable_streaming_rows_are_previewed_before_cursor_assignment():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    pending = sdk.add("streaming", "2000-01-01T00:00:00Z", assigned=False, ingestion=None)
    detect(reader)
    assert not reader._ranges
    reader._preview_next = 0
    reader._capture_next = float("inf")
    preview = (*reader.poll_once(), *reader.poll_once())
    assert [row.key for row in row_hints(preview)] == [("streaming",)]
    assert reader.latest_status().frontier["sessions"] == "opaque-0"
    sdk.assign(pending)
    detect(reader)
    completed = drain_range(reader)
    assert row_hints(completed) == []  # Same visible winner, now durably checkpointed.
    assert completed[-1].kind == "status" and completed[-1].frontier["sessions"] == "opaque-1"
    assert reader.latest_status().frontier["sessions"] == "opaque-1"


def test_native_keys_round_trip_quotes_unicode_and_non_bmp_characters_across_pages():
    sdk = FakeSDK()
    reader = make_reader(sdk, page_size=1)
    initialize(reader)
    identities = {'quoted"\\\n', "\ue000", "😀"}
    for sid in identities:
        sdk.add(sid, "2026-01-01T00:00:00Z")
    detect(reader)
    hints = row_hints(drain_range(reader))
    assert {row.key[0] for row in hints} == identities
    assert all(token(sid).isascii() for sid in identities)
    assert reader.latest_status().frontier["sessions"] == "opaque-3"


def test_raw_otel_visibility_is_table_invalidation_not_invented_event_identity():
    sdk = FakeSDK()
    sdk.raw_enabled = True
    reader = SharedKustoReader(
        SETTINGS,
        client=sdk,
        tables={"sessions": TABLE, "OTELLogs": RAW},
        table_names=("sessions", "OTELLogs"),
        config=ReaderConfig(queries_per_poll=1, reconcile_partitions=1),
    )
    initialize(reader)
    pending = sdk.add_raw(assigned=False, ingestion=None)
    detect(reader)
    reader._capture_next = float("inf")
    reader._preview_next = 0
    preview = reader.poll_once()
    assert any(batch.changed_tables == ("OTELLogs",) and not batch.rows for batch in preview)
    assert reader.latest_status().frontier["OTELLogs"] == "opaque-0"
    sdk.assign(pending)
    batches = detect(reader)
    assert any(batch.changed_tables == ("OTELLogs",) and not batch.rows for batch in batches)
    assert reader.latest_status().frontier["OTELLogs"] == "opaque-1"
    sdk.raw_rows.clear()
    reader._capture_next = float("inf")
    reader._preview_next = float("inf")
    reader._reconcile_next = 0
    batches = reader.poll_once()
    assert any(batch.kind == "resync" and batch.changed_tables == ("OTELLogs",) for batch in batches)


def test_disabled_policy_uses_explicit_reconciliation_without_cursor_claims():
    sdk = FakeSDK(policy=False)
    sdk.add("legacy", "1999-01-01T00:00:00Z", assigned=False, ingestion=None)
    reader = make_reader(sdk)
    initialize(reader)
    status = reader.latest_status()
    assert status.frontier == {}
    assert status.details["reconciliation_only_tables"] == ["sessions"]
    reader._reconcile_next = 0
    reader._capture_next = float("inf")
    batches = (*reader.poll_once(), *reader.poll_once())
    assert [row.key for row in row_hints(batches)] == [("legacy",)]
    assert any(batch.kind == "resync" and batch.reason == "reconcile" for batch in batches)
    assert not any("['sessions'] | where cursor_after" in query for query in sdk.queries)
    sdk.rows.clear()
    reader._reconcile_next = 0
    batches = reader.poll_once()
    assert any(batch.kind == "resync" and batch.changed_tables == ("sessions",) and not batch.rows for batch in batches)


def test_shared_metadata_refresh_discovers_new_tables_and_explicitly_removes_dropped_tables():
    sdk = FakeSDK()
    reader = SharedKustoReader(
        SETTINGS,
        client=sdk,
        tables={"sessions": TABLE, "OTELLogs": RAW},
        table_names=("sessions", "OTELLogs"),
        config=ReaderConfig(queries_per_poll=1, reconcile_partitions=1),
    )
    initialize(reader)
    assert reader.capabilities()["missing_tables"] == ["OTELLogs"]
    sdk.raw_enabled = True
    sdk.add_raw()
    reader._capture_next = float("inf")
    reader._schema_next = 0
    added = reader.poll_once()
    assert added[-1].kind == "resync" and added[-1].reason == "schema_changed"
    assert added[-1].changed_tables == ("OTELLogs",)
    reader.poll_once()
    batches = detect(reader)
    assert any(batch.changed_tables == ("OTELLogs",) for batch in batches)
    assert reader.latest_status().frontier["OTELLogs"] == "opaque-1"
    sdk.present = False
    reader._capture_next = float("inf")
    reader._schema_next = 0
    removed = reader.poll_once()
    assert removed[-1].reason == "schema_changed" and removed[-1].changed_tables == ("sessions",)
    assert "sessions" not in reader.latest_status().frontier


def test_changed_ingestiontime_policy_requires_reconciliation_and_a_new_baseline():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    sdk.policy = False
    reader._capture_next = float("inf")
    reader._policy_next = 0
    changed = reader.poll_once()
    assert changed[-1].kind == "resync" and changed[-1].reason == "policy_changed"
    assert changed[-1].changed_tables == ("sessions",)
    assert reader.latest_status().frontier == {}
    assert reader.capabilities()["reconciliation_only_tables"] == ["sessions"]
    sdk.policy = True
    reader._policy_next = 0
    changed = reader.poll_once()
    assert changed[-1].reason == "policy_changed"
    assert reader.latest_status().frontier == {"sessions": "opaque-0"}


def test_duplicate_entries_are_idempotent_and_a_replayed_page_cannot_advance():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    for sid in ("a", "b"):
        sdk.add(sid, "2026-01-01T00:00:00Z")
    detect(reader)
    sdk.key_page_hook = lambda query, rows: response([rows[0], rows[0], rows[1]])
    first = (*reader.poll_once(), *reader.poll_once())
    assert [row.key for row in row_hints(first)] == [("a",), ("b",)]
    assert reader.latest_status().frontier["sessions"] == "opaque-0"
    replay = dict(
        aictl_live_key=token("a"),
        aictl_live_first="a",
    )
    sdk.key_page_hook = lambda query, rows: response([replay])
    failed = reader.poll_once()
    assert failed[-1].stale and reader.latest_status().frontier["sessions"] == "opaque-0"
    sdk.key_page_hook = None
    assert row_hints(drain_range(reader)) == []
    assert reader.latest_status().frontier["sessions"] == "opaque-2"


@pytest.mark.parametrize("failure", ["transport", "partial", "malformed", "missing_tombstone"])
def test_failed_pages_preserve_checkpoint_and_do_not_consume_unpublished_hints(failure):
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    sdk.add("a", "2026-01-01T00:00:00Z")
    sdk.add("b", "2026-01-01T00:00:00Z")
    detect(reader)

    def fail(query, rows):
        if failure == "transport":
            raise OSError("offline")
        if failure == "partial":
            return response(rows, errors=1)
        if failure == "missing_tombstone":
            return response([rows[0], {name: value for name, value in rows[1].items() if name != "aictl_live_deleted"}])
        return response([rows[0], {**rows[1], "aictl_live_key": "not-json"}])

    sdk.page_hook = fail
    reader.poll_once()  # key discovery succeeds, winner lookup must not consume the page on failure
    failed_query = len(sdk.queries)
    failed = reader.poll_once()
    assert failed[-1].stale
    assert reader.latest_status().frontier["sessions"] == "opaque-0"
    assert reader._ranges[0].after == "" and not reader._dedup
    sdk.page_hook = None
    recovered = reader.poll_once()
    assert sdk.queries[failed_query] == sdk.queries[failed_query + 1]
    assert [row.key for row in row_hints(recovered)] == [("a",), ("b",)]
    assert reader.latest_status().frontier["sessions"] == "opaque-2"
    assert not reader.latest_status().stale


def test_repeated_query_failure_requires_resync_and_new_bootstrap_not_silent_skip():
    sdk = FakeSDK()
    reader = make_reader(sdk, failures_before_resync=2)
    initialize(reader)
    sdk.add("a", "2026-01-01T00:00:00Z")
    detect(reader)
    sdk.page_hook = lambda query, rows: response(rows, errors=1)
    reader.poll_once()
    reader.poll_once()
    events = reader.poll_once()
    assert events[-1].kind == "resync" and events[-1].reason == "reader_recovery"
    assert events[-1].changed_tables == ("sessions",) and not events[-1].ready
    assert reader.latest_status().frontier == {}
    sdk.page_hook = None
    events = initialize(reader)
    bootstrap = next(batch for batch in events if batch.kind == "bootstrap")
    assert bootstrap.changed_tables == ("sessions",) and bootstrap.frontier["sessions"] == "opaque-1"
    assert not reader.latest_status().stale


def test_an_idle_iteration_does_not_clear_stale_status_without_a_successful_query():
    reader = make_reader()
    initialize(reader)
    reader._stale = True
    reader._reason = "query_error:OSError"
    reader._capture_next = reader._schema_next = reader._policy_next = float("inf")
    assert reader.poll_once() == ()
    assert reader.latest_status().stale and reader.latest_status().reason == "query_error:OSError"


def test_subscriber_reconnect_gets_bootstrap_without_querying_or_advancing_reader():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    first = reader.subscribe()
    baseline = first.get(timeout=0)
    assert baseline.kind == "bootstrap"
    first.close()
    queries = len(sdk.queries)
    second = reader.subscribe()
    restored = second.get(timeout=0)
    assert restored.kind == "bootstrap" and restored.frontier == baseline.frontier
    assert len(sdk.queries) == queries
    second.close()
    reader.close()


def test_mailboxes_and_dedup_are_bounded_and_overflow_explicitly_invalidates_resume():
    sdk = FakeSDK()
    reader = make_reader(sdk, page_size=1, subscriber_batches=2, max_subscribers=2, dedup_entities=2, dedup_bytes=700)
    initialize(reader)
    slow = reader.subscribe()
    other = reader.subscribe()
    with pytest.raises(RuntimeError, match="subscriber limit"):
        reader.subscribe()
    for sid in ("a", "b", "c", "d", "e", "f"):
        sdk.add(sid, "2026-01-01T00:00:00Z")
    detect(reader)
    drain_range(reader)
    assert len(slow._queue) <= 2 and len(other._queue) <= 2
    assert len(reader._dedup) <= 2 and reader._dedup_bytes <= 700
    batches = []
    while (batch := slow.get(timeout=0)) is not None:
        batches.append(batch)
    assert any(batch.kind == "resync" and batch.reason == "subscriber_overflow" for batch in batches)
    reset = next(batch for batch in batches if batch.kind == "resync")
    assert reset.changed_tables == ("sessions",) and reset.ready and not reset.stale
    reader.close()


def test_registry_normalizes_ingestion_endpoint_and_uses_one_idempotent_worker():
    settings = KustoSettings("https://shared-reader.invalid/", "shared-test", auth="none", ingestion="inline")
    ingest_settings = KustoSettings(
        "https://ingest-shared-reader.invalid", "SHARED-TEST", auth="none", ingestion="queued"
    )
    config = ReaderConfig(min_poll_s=0.01, max_idle_s=0.1, queries_per_poll=1)
    reader = shared_reader(settings, table_names=("sessions",), config=config)
    sdk = FakeSDK()
    reader._client = sdk
    assert shared_reader(ingest_settings) is reader
    first, second = reader.subscribe(), reader.subscribe()
    reader.start()
    thread = reader._thread
    reader.start()
    assert reader._thread is thread and sdk.seeded.wait(2)
    assert thread.name == "aictl-kusto-live" and thread.is_alive()
    with pytest.raises(ValueError, match="different limits"):
        shared_reader(settings, config=replace(config, page_size=1))
    reader.close()
    assert not thread.is_alive()
    assert first.get(timeout=0) is None and second.get(timeout=0) is None
    replacement = shared_reader(settings, table_names=("sessions",), config=config)
    assert replacement is not reader
    replacement.close()


def test_blocked_sdk_query_does_not_block_runtime_updates_on_the_same_hub():
    from aictl.dashboard.live.hub import LiveHub

    hub = LiveHub()
    stream = hub.subscribe(history=False)
    stream.next(timeout=0)
    sdk = FakeSDK()
    blocked, release, published = threading.Event(), threading.Event(), threading.Event()

    def wait_in_query():
        blocked.set()
        if not release.wait(5):
            raise TimeoutError("test SDK query was not released")

    sdk.after_seed = wait_in_query
    reader = make_reader(sdk, min_poll_s=0.01, max_idle_s=0.1)
    handle = reader.subscribe(
        lambda batch: hub.publish(
            "source.status",
            "kusto.reader",
            {"ready": batch.ready, "stale": batch.stale},
            source="runtime.operational",
        )
    )

    def publish_runtime():
        hub.publish(
            "runtime.machine",
            "local",
            {"cpu_percent": 17.0, "mem_percent": 28.0},
            source="runtime.collector",
        )
        published.set()

    publisher = threading.Thread(target=publish_runtime)
    try:
        reader.start()
        assert blocked.wait(2)
        publisher.start()
        assert published.wait(1), "Runtime publishing waited for the blocked SDK query"
        assert not release.is_set()
        updates = [stream.next(timeout=0.1), stream.next(timeout=0.1)]
        assert any(
            event is not None and any(row["topic"] == "runtime.machine" for row in event[1].get("upserts", []))
            for event in updates
        )
    finally:
        release.set()
        reader.close()
        handle.close()
        if publisher.ident is not None:
            publisher.join(timeout=1)
        stream.close()
        hub.close()


def test_query_properties_bound_work_and_disable_stale_result_caching():
    sdk = FakeSDK()
    reader = make_reader(sdk)
    initialize(reader)
    props = sdk.properties[0]
    assert props.get_option("queryconsistency", None) == "strongconsistency"
    assert props.get_option("query_results_cache_max_age", None).total_seconds() == 0
    assert props.get_option("request_readonly", None)
    assert props.get_option("request_readonly_hardline", None)
    assert props.get_option("servertimeout", None).total_seconds() == reader.config.query_timeout_s
    assert props.get_option("truncationmaxsize", None) == reader.config.result_bytes
    assert props.get_option("maxmemoryconsumptionperiterator", None) == reader.config.iterator_memory_bytes
    assert props.get_option("max_memory_consumption_per_query_per_node", None) == reader.config.query_memory_bytes
    assert props.get_option("query_fanout_threads_percent", None) == 1
    assert not props.get_option("deferpartialqueryfailures", None)


def test_memory_override_is_applied_only_to_probes(monkeypatch):
    monkeypatch.setenv("AICTL_KUSTO_LIVE_PROBE_MEMORY_MIB", "256")
    sdk = FakeSDK()
    reader = SharedKustoReader(SETTINGS, client=sdk, tables={"sessions": TABLE})
    initialize(reader)
    sdk.add("seen", "v2")
    detect(reader)
    drain_range(reader)
    assert any(q.startswith("print [") for q in sdk.queries)
    for query, props in zip(sdk.queries, sdk.properties, strict=True):
        memory = 256 * 1024**2 if query.startswith("print [") else reader.config.query_memory_bytes
        assert props.get_option("maxmemoryconsumptionperiterator", None) == min(memory, reader.config.iterator_memory_bytes)
        assert props.get_option("max_memory_consumption_per_query_per_node", None) == memory
        if query.startswith("print ["):
            assert props.client_request_id.startswith("aictl.live.probe;")
    monkeypatch.setenv("AICTL_KUSTO_LIVE_PROBE_MEMORY_MIB", "-1")
    with pytest.raises(ValueError, match="AICTL_KUSTO_LIVE_PROBE_MEMORY_MIB"):
        SharedKustoReader(SETTINGS, client=sdk, tables={"sessions": TABLE})


def test_multipage_reconcile_and_preview_pace_each_page_across_polls():
    sdk = FakeSDK(policy=False)
    for sid in ("a", "b", "c"):
        sdk.add(sid, "2026-01-01T00:00:00Z", assigned=False, ingestion=None)
    reader = make_reader(sdk, page_size=1, queries_per_poll=4, reconcile_interval_s=30)
    initialize(reader)
    sdk.queries.clear()
    reader._capture_next = float("inf")
    reader._reconcile_next = 0
    batches = reader.poll_once()
    assert [row.key for row in row_hints(batches)] == [("a",)]
    # One key page + one winner page ran, then reconciliation waited for its next interval.
    assert len(sdk.queries) == 2
    assert reader._reconcile is not None and reader._reconcile_next > 0

