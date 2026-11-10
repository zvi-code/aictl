"""Live projection tests with fake readers and in-memory query results only."""

import sqlite3
import threading
import time
from types import SimpleNamespace

from aictl.dashboard.live_hub import LiveHub
from aictl.dashboard.live_projection import LiveDashboard, board_entities
from aictl.dashboard.live_queries import ProjectionQueries


def test_query_memo_invalidates_only_changed_table_dependencies():
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        "CREATE TABLE requests (id INTEGER, value INTEGER);"
        "CREATE TABLE files (path TEXT);"
        "INSERT INTO requests VALUES (1, 5); INSERT INTO files VALUES ('one');"
    )
    trace = []
    conn.set_trace_callback(trace.append)
    queries = ProjectionQueries()
    assert queries.execute(conn, "SELECT SUM(value) FROM requests").fetchone()[0] == 5
    assert queries.execute(conn, "SELECT path FROM files").fetchone()[0] == "one"
    assert queries.execute(conn, "SELECT SUM(value) FROM requests").fetchone()[0] == 5
    queries.invalidate(("files",))
    assert queries.execute(conn, "SELECT SUM(value) FROM requests").fetchone()[0] == 5
    conn.execute("INSERT INTO files VALUES ('two')")
    assert len(queries.execute(conn, "SELECT path FROM files").fetchall()) == 2
    assert sum(sql == "SELECT SUM(value) FROM requests" for sql in trace) == 1
    conn.execute("UPDATE requests SET value=9")
    queries.invalidate(("requests",))
    assert queries.execute(conn, "SELECT SUM(value) FROM requests").fetchone()[0] == 9
    assert sum(sql == "SELECT SUM(value) FROM requests" for sql in trace) == 2
    conn.close()


def test_nested_dependency_and_bounded_result_eviction_never_drop_query_rows():
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        "CREATE TABLE requests (id INTEGER); CREATE TABLE sessions (id INTEGER);"
        "INSERT INTO requests VALUES (1); INSERT INTO sessions VALUES (1);"
    )
    queries = ProjectionQueries(max_entries=1, max_bytes=1024)
    sql = "SELECT id FROM sessions WHERE EXISTS (SELECT 1 FROM requests WHERE requests.id=sessions.id)"
    assert queries.execute(conn, sql).fetchone()[0] == 1
    conn.execute("DELETE FROM requests")
    queries.invalidate(("requests",))
    assert queries.execute(conn, sql).fetchall() == []
    queries.execute(conn, "SELECT id FROM sessions").fetchall()
    assert len(queries._answers) <= 1 and queries._bytes <= 1024
    tiny = ProjectionQueries(max_bytes=1)
    assert tiny.execute(conn, "SELECT id FROM sessions").fetchall() == [(1,)]
    assert not tiny._answers
    conn.close()


def test_board_rows_have_stable_identity_and_mixed_fields_keep_their_authority():
    payload = {
        "agents": [
            {"id": "a", "status": "running", "cpu_percent": 20, "mem_mb": 10, "pids": [1], "activity": [1], "input": 50}
        ],
        "skills": [{"name": "skill", "uses": 2, "tokens": 10, "path": "skill.md", "description": "Configured skill"}],
        "project_prompts": [
            {
                "file": "prompt.md",
                "project": "p",
                "uses": 3,
                "last_ts": 10,
                "_history_file": "prompt.md",
                "_configured_on_disk": True,
            }
        ],
        "kpis": {"running": 1, "tokens": 50},
    }
    entities = board_entities("scope", payload)
    agent = next(
        data
        for topic, _, data, _ in entities
        if topic == "history.board" and data.get("key") and data["field"] == "agents"
    )
    assert agent["value"]["input"] == 50 and agent["value"]["activity"] == [1]
    assert agent["value"]["status"] == "unknown" and agent["value"]["historical_status"] == "running"
    assert not {"cpu_percent", "mem_mb", "pids"} & agent["value"].keys()
    disk = [data for topic, _, data, source in entities if source == "filesystem.config"]
    assert any(data["value"].get("path") == "skill.md" for data in disk)
    assert all("uses" not in data["value"] for data in disk)
    history_skills = [
        data
        for topic, _, data, _ in entities
        if topic == "history.board" and data["field"] == "skills" and data.get("key")
    ]
    assert history_skills[0]["value"] == {"name": "skill", "uses": 2, "tokens": 10}
    old_id = next(entity_id for topic, entity_id, data, _ in entities if data is agent)
    payload["agents"][0]["input"] = 100
    new_id = next(
        entity_id
        for topic, entity_id, data, _ in board_entities("scope", payload)
        if topic == "history.board" and data["field"] == "agents" and data.get("key")
    )
    assert old_id == new_id


def test_existing_board_aggregate_math_works_through_the_result_memo(monkeypatch):
    from aictl.dashboard import board_api
    from aictl.dashboard.live_projection import _ProjectionDB
    from aictl.storage import HistoryDB

    monkeypatch.setattr(board_api, "_prompt_files_on_disk", lambda _: ([], []))
    monkeypatch.setattr(board_api, "_skill_file", lambda *_: {"scope": None, "path": None, "description": None})
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.executescript(
            "INSERT INTO sessions(session_id,tool,project_path,started_at,ended_at)"
            " VALUES ('s','copilot-cli','project',100,190);"
            "INSERT INTO requests(ts,session_id,tool,project_path,model,input_tokens,output_tokens)"
            " VALUES (120,'s','copilot-cli','project','gpt-5',7,3);"
            "INSERT INTO skill_uses(ts,session_id,tool,project_path,name)"
            " VALUES (130,'s','copilot-cli','project','example');"
            "INSERT INTO tool_invocations(ts,session_id,tool,project_path,tool_name,target)"
            " VALUES (140,'s','copilot-cli','project','Bash','pytest tests');"
            "INSERT INTO session_prompts(ts,session_id,tool,project_path,text,prompt_file)"
            " VALUES (110,'s','copilot-cli','project','prompt','example.prompt.md');"
        )
        filters = board_api.Filters(90, 200, buckets=4)
        expected = board_api.compute_board(db, filters, now=200)
        actual = board_api.compute_board(_ProjectionDB(db, ProjectionQueries(), "offline"), filters, now=200)
        assert actual["kpis"] == expected["kpis"]
        assert actual["agents"] == expected["agents"]
        assert actual["series"] == expected["series"]
        assert actual["skills"] == expected["skills"]
        assert board_entities("scope", actual)
    finally:
        db.close()


def test_equal_timestamp_prompts_use_native_ids_not_list_positions(monkeypatch):
    from aictl.dashboard import board_api
    from aictl.dashboard.live_projection import _ProjectionDB
    from aictl.storage import HistoryDB

    monkeypatch.setattr(board_api, "_prompt_files_on_disk", lambda _: ([], []))
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.executescript(
            "INSERT INTO sessions(session_id,tool,started_at,ended_at) VALUES ('s','copilot-cli',100,190);"
            "INSERT INTO session_prompts(ts,session_id,tool,text) VALUES (110,'s','copilot-cli','first');"
            "INSERT INTO session_prompts(ts,session_id,tool,text) VALUES (110,'s','copilot-cli','second');"
        )
        filters = board_api.Filters(90, 200, buckets=4)
        live_db = _ProjectionDB(db, ProjectionQueries(), "offline-prompts")
        payload = board_api.compute_board(live_db, filters, now=200)
        assert len({row["id"] for row in payload["prompts"]}) == 2
        identities = {
            data["value"]["id"]: entity_id
            for topic, entity_id, data, _ in board_entities("scope", payload)
            if data["field"] == "prompts" and data.get("key")
        }
        assert len(identities) == 2
        assert all("id" not in row for row in board_api.compute_board(db, filters, now=200)["prompts"])
    finally:
        db.close()


def test_live_status_filter_selects_queryable_usage_by_runtime_not_hook_activity(monkeypatch):
    from aictl.dashboard import board_api
    from aictl.storage import HistoryDB

    monkeypatch.setattr(board_api, "_prompt_files_on_disk", lambda _: ([], []))
    db = HistoryDB(db_path=":memory:", flush_interval=0)
    try:
        conn = db._conn()
        conn.executescript(
            "INSERT INTO sessions(session_id,tool,started_at) VALUES ('s','copilot-cli',100);"
            "INSERT INTO requests(ts,session_id,tool,model,input_tokens,output_tokens)"
            " VALUES (120,'s','copilot-cli','gpt-5',7,3);"
        )
        legacy = board_api.Filters(90, 200, status="idle", buckets=4)
        current = board_api.Filters(90, 200, status="idle", buckets=4, runtime_statuses=(("s", "idle"),))
        assert board_api.compute_board(db, legacy, now=200)["kpis"]["tokens"] == 0
        payload = board_api.compute_board(db, current, now=200)
        assert payload["kpis"]["tokens"] == 10
        assert payload["agents"][0]["status"] == "running"  # Still the historical status, not a copied runtime fact.
    finally:
        db.close()


class FakeReader:
    def __init__(self):
        self.started = 0
        self.closed = False
        self.callback = None

    def subscribe(self, callback):
        self.callback = callback
        return SimpleNamespace(close=lambda: None)

    def start(self):
        self.started += 1
        self.emit("bootstrap")

    def emit(self, kind, tables=("requests",), **kwargs):
        status = {"ready": True, "stale": False, "reason": None, **kwargs}
        self.callback(
            SimpleNamespace(
                kind=kind,
                changed_tables=tables,
                frontier={"cursor": "queryable"},
                **status,
            )
        )

    def close(self):
        self.closed = True


def wait_for(predicate):
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.01)
    raise AssertionError("Live worker did not finish")


def test_one_history_worker_is_shared_and_slow_kusto_cannot_block_runtime():
    hub = LiveHub()
    reader = FakeReader()
    entered, finish = threading.Event(), threading.Event()
    calls = []

    def compute(_db, filters, snapshot, now):
        calls.append(filters)
        assert snapshot is None
        entered.set()
        assert finish.wait(3)
        return {"agents": [{"id": "agent", "input": len(calls)}], "kpis": {"tokens": len(calls)}}

    dashboard = LiveDashboard(
        hub,
        SimpleNamespace(_kusto=object()),
        SimpleNamespace(),
        health_provider=lambda: ({"ok": True}, {"cpu_per_core": [1]}),
        reader_factory=lambda _: reader,
        compute=compute,
    )
    one = two = None
    try:
        one = dashboard.subscribe("since=1&until=2")
        two = dashboard.subscribe("until=2&since=1")
        assert entered.wait(1)
        assert reader.started == 1 and len(calls) == 1
        assert dashboard._scopes["since=1&until=2"].status["refresh_pending"]
        assert dashboard._scopes["since=1&until=2"].status["ready"] is False
        assert dashboard._scopes["since=1&until=2"].status["pending"]
        assert dashboard._scopes["since=1&until=2"].status["error"] is None
        runtime = hub.subscribe(history=False)
        runtime.next(0)
        hub.publish("runtime.agent", "live", {"id": "live", "cpu_percent": 7}, source="runtime.collector")
        assert any(
            row["topic"] == "runtime.agent" and row["data"]["cpu_percent"] == 7 for row in runtime.next(0)[1]["upserts"]
        )
        finish.set()
        wait_for(lambda: dashboard._scopes["since=1&until=2"].has_data)
        assert dashboard._scopes["since=1&until=2"].status["pending"] is False
        assert len(calls) == 1
        reader.emit("changes")
        wait_for(lambda: len(calls) == 2)
        wait_for(lambda: not dashboard._scopes["since=1&until=2"].dirty)
        latest = hub.subscribe("since=1&until=2").next(0)[1]
        assert any(
            row["topic"] == "history.board" and row["data"].get("value") == {"tokens": 2} for row in latest["entities"]
        )
    finally:
        finish.set()
        if one:
            one.close()
        if two:
            two.close()
        dashboard.close()
        hub.close()
    assert reader.closed


def test_runtime_only_health_subscription_does_not_start_history_reader():
    factory_calls = []
    hub = LiveHub()
    dashboard = LiveDashboard(
        hub,
        SimpleNamespace(),
        SimpleNamespace(),
        health_provider=lambda: ({}, {}),
        reader_factory=lambda _: factory_calls.append(True),
        compute=lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("history was queried")),
    )
    subscription = dashboard.subscribe("history=0", history=False)
    try:
        assert subscription.next(0)[0] == "bootstrap"
        assert not factory_calls and not dashboard._scopes
    finally:
        subscription.close()
        dashboard.close()
        hub.close()


def test_current_status_scope_waits_for_runtime_baseline_and_ignores_gauge_changes():
    hub = LiveHub()
    reader = FakeReader()
    calls = []

    def compute(_db, filters, **_kwargs):
        calls.append(filters.runtime_statuses)
        return {"kpis": {"tokens": 7}}

    dashboard = LiveDashboard(
        hub,
        SimpleNamespace(_kusto=object()),
        SimpleNamespace(),
        health_provider=lambda: ({}, {}),
        reader_factory=lambda _: reader,
        compute=compute,
    )
    subscription = dashboard.subscribe("since=1&until=2&status=running")
    try:
        wait_for(lambda: dashboard._baseline_allowed)
        assert calls == []
        hub.publish(
            "runtime.agent",
            "agent",
            {"id": "s", "status": "running", "running": True, "cpu_percent": 1},
            source="runtime.collector",
        )
        hub.publish(
            "source.status",
            "runtime",
            {"producer": "runtime-collector", "ready": True},
            source="runtime.operational",
        )
        dashboard._wake.set()
        wait_for(lambda: dashboard._scopes["since=1&status=running&until=2"].has_data)
        assert calls == [(("s", "running"),)]
        hub.publish(
            "runtime.agent",
            "agent",
            {"id": "s", "status": "running", "running": True, "cpu_percent": 99},
            source="runtime.collector",
        )
        entry = dashboard._scopes["since=1&status=running&until=2"]
        filters = dashboard._filters_now(entry, time.time())
        assert entry.grid[-1] == filters.runtime_statuses
    finally:
        subscription.close()
        dashboard.close()
        hub.close()


def test_history_error_keeps_prior_entities_and_publishes_stale_status():
    hub = LiveHub()
    reader = FakeReader()
    calls = []

    def compute(*_args, **_kwargs):
        calls.append(True)
        if len(calls) > 1:
            raise RuntimeError("cluster unavailable")
        return {"agents": [{"id": "agent", "input": 5}]}

    dashboard = LiveDashboard(
        hub,
        SimpleNamespace(_kusto=object()),
        SimpleNamespace(),
        health_provider=lambda: ({}, {}),
        reader_factory=lambda _: reader,
        compute=compute,
    )
    subscription = dashboard.subscribe("since=1&until=2")
    try:
        wait_for(lambda: dashboard._scopes["since=1&until=2"].has_data)
        reader.emit("changes")
        wait_for(lambda: dashboard._scopes["since=1&until=2"].retry_at > 0)
        baseline = hub.subscribe("since=1&until=2").next(0)[1]
        assert any(
            row["topic"] == "history.board" and row["data"].get("value", {}).get("id") == "agent"
            for row in baseline["entities"]
            if isinstance(row["data"].get("value"), dict)
        )
        statuses = [
            row["data"]
            for row in baseline["entities"]
            if row["topic"] == "source.status" and row["data"].get("component") == "history"
        ]
        assert statuses[0]["ready"] and statuses[0]["stale"] and statuses[0]["reason"] == "cluster unavailable"
        assert statuses[0]["pending"] is False and statuses[0]["error"] == "cluster unavailable"
        assert statuses[0]["refresh_pending"] is False
    finally:
        subscription.close()
        dashboard.close()
        hub.close()


def test_reader_mailbox_gap_forces_baseline_and_exposes_reconciliation_capabilities():
    hub = LiveHub()
    reader = FakeReader()
    entered, finish = threading.Event(), threading.Event()
    calls = []

    def compute(*_args, **_kwargs):
        calls.append(True)
        if len(calls) > 1:
            entered.set()
            assert finish.wait(3)
        return {"kpis": {"tokens": len(calls)}}

    dashboard = LiveDashboard(
        hub,
        SimpleNamespace(_kusto=object()),
        SimpleNamespace(),
        health_provider=lambda: ({}, {}),
        reader_factory=lambda _: reader,
        compute=compute,
    )
    subscription = dashboard.subscribe("since=1&until=2")
    try:
        subscription.next(0)
        wait_for(lambda: dashboard._scopes["since=1&until=2"].has_data)
        reader.emit(
            "resync",
            reason="subscriber_overflow",
            details={"reconciliation_only_tables": ["requests"], "policy_checked_at": {"requests": 123}},
        )
        assert entered.wait(1)
        event, baseline = subscription.next(0)
        assert event == "bootstrap" and baseline["reason"] == "subscriber_overflow"
        scoped = next(
            row["data"]
            for row in baseline["entities"]
            if row["topic"] == "source.status" and row["data"].get("component") == "history"
        )
        assert scoped["ready"] is False and scoped["stale"] and scoped["refresh_pending"]
        assert scoped["pending"] and scoped["error"] is None
        reader_status = next(row["data"] for row in baseline["entities"] if row["id"] == "kusto.reader")
        assert reader_status["details"]["reconciliation_only_tables"] == ["requests"]
        finish.set()
        wait_for(lambda: dashboard._scopes["since=1&until=2"].status["ready"])
        assert dashboard._scopes["since=1&until=2"].status["stale"] is False
    finally:
        finish.set()
        subscription.close()
        dashboard.close()
        hub.close()


def test_health_bootstrap_is_pending_until_late_payload_and_ready_status_arrive_together():
    hub = LiveHub()
    entered, finish = threading.Event(), threading.Event()

    def health():
        entered.set()
        assert finish.wait(3)
        return {"ok": True}, {"cpu_per_core": [7]}

    dashboard = LiveDashboard(hub, SimpleNamespace(), SimpleNamespace(), health_provider=health)
    subscription = dashboard.subscribe("", history=False)
    try:
        assert entered.wait(1)
        event, baseline = subscription.next(0)
        status = next(row["data"] for row in baseline["entities"] if row["id"] == "health")
        assert event == "bootstrap" and status["pending"] and status["ready"] is False
        assert status["error"] is None
        assert not any(row["topic"] == "runtime.health" for row in baseline["entities"])
        finish.set()
        event, delta = subscription.next(1)
        payloads = {row["topic"]: row for row in delta["upserts"]}
        assert event == "change"
        assert payloads["runtime.health"]["data"] == {"ok": True}
        assert payloads["runtime.machine"]["data"] == {"cpu_per_core": [7]}
        status = payloads["source.status"]["data"]
        assert status["ready"] and status["pending"] is False and status["error"] is None
        assert status["topics"] == ["runtime.health", "runtime.machine"]
        assert len({row["revision"] for row in payloads.values()}) == 1
    finally:
        finish.set()
        subscription.close()
        dashboard.close()
        hub.close()


def test_health_failures_are_explicit_and_keep_prior_success_for_paused_clients():
    hub = LiveHub()
    recover, fail_again = threading.Event(), threading.Event()

    def health():
        if not recover.is_set():
            raise RuntimeError()
        if fail_again.is_set():
            raise RuntimeError("health refresh failed")
        return {"ok": True}, {"cpu_per_core": [7]}

    dashboard = LiveDashboard(hub, SimpleNamespace(), SimpleNamespace(), health_provider=health)
    dashboard.HEALTH_INTERVAL_S = 0.01
    subscription = dashboard.subscribe("", history=False)

    def status():
        return next(row for row in hub.values("source.status") if row.get("component") == "health")

    try:
        wait_for(lambda: status()["error"] == "RuntimeError")
        assert status()["ready"] is False and status()["pending"] is False and status()["stale"]
        assert not hub.values("runtime.health")
        recover.set()
        wait_for(lambda: status()["ready"] and status()["error"] is None)
        assert status()["pending"] is False and status()["stale"] is False
        fail_again.set()
        wait_for(lambda: status()["error"] == "health refresh failed")
        assert status()["ready"] and status()["stale"] and status()["pending"] is False
        assert hub.values("runtime.health") == ({"ok": True},)
        assert hub.values("runtime.machine") == ({"cpu_per_core": [7]},)
    finally:
        subscription.close()
        dashboard.close()
        hub.close()
