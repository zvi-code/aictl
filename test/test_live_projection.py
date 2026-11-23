"""Live projection tests with fake readers and in-memory query results only."""

import threading
import time
from types import SimpleNamespace

from aictl.dashboard.live import projection
from aictl.dashboard.live.hub import LiveHub
from aictl.dashboard.live.projection import LiveDashboard, board_entities


def test_a_subagent_keeps_its_transcript_status_on_the_live_board():
    """The runtime report has no subagent entities: blanking a subagent's status left it unknown or ended."""
    payload = {"agents": [
        {"id": "s", "parent_id": None, "status": "running", "ended_at": None},
        {"id": "a1", "parent_id": "s", "status": "running", "ended_at": 99.0},
        {"id": "a2", "parent_id": "s", "status": "idle", "ended_at": None},
    ]}
    values = {data["value"]["id"]: data["value"] for topic, _, data, _ in board_entities("scope", payload)
              if topic == "history.board" and data.get("key")}
    assert values["s"]["status"] == "unknown"
    assert (values["a1"]["status"], values["a2"]["status"]) == ("running", "idle")


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
        "kpis": {"running": 1, "idle": 2, "subagents_running": 3, "tokens": 50},
    }
    entities = board_entities("scope", payload)
    kpis = next(data["value"] for topic, _, data, _ in entities if topic == "history.board" and data["field"] == "kpis")
    # Sessions running and idle come from the runtime report; it has no subagents, so their
    # count must reach the page from the stored rows (the Overview tile showed none).
    assert kpis == {"subagents_running": 3, "tokens": 50}
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


def test_existing_board_aggregate_math_works_through_the_result_memo(monkeypatch, kusto_store):
    from aictl.dashboard import board_filters, board_projection, skill_inventory
    from aictl.dashboard.live.projection import _ProjectionDB

    monkeypatch.setattr(board_projection, "_prompt_files_on_disk", lambda _: ([], []))
    monkeypatch.setattr(skill_inventory, "_skill_file", lambda *_: {"scope": None, "path": None, "description": None})
    db = kusto_store
    fields = {"session_id": "s", "tool": "copilot-cli", "project_path": "project"}
    db.insert("sessions", **fields, started_at=100, ended_at=190)
    db.insert("requests", **fields, ts=120, model="gpt-5", input_tokens=7, output_tokens=3)
    db.insert("skill_uses", **fields, ts=130, name="example")
    call = db.insert("tool_invocations", **fields, ts=140, tool_name="Bash")
    db.insert("tool_invocations_text", dedup_key=call["dedup_key"], target="pytest tests")
    db.insert("session_prompts", **fields, ts=110, text="prompt", prompt_file="example.prompt.md")
    filters = board_filters.Filters(90, 200, buckets=4)
    expected = board_projection.compute_board(db, filters, now=200)
    actual = board_projection.compute_board(_ProjectionDB(db, "offline"), filters, now=200)
    assert actual["kpis"] == expected["kpis"]
    assert actual["agents"] == expected["agents"]
    assert actual["series"] == expected["series"]
    assert actual["skills"] == expected["skills"]
    assert board_entities("scope", actual)


def test_equal_timestamp_prompts_use_native_ids_not_list_positions(monkeypatch, kusto_store):
    from aictl.dashboard import board_filters, board_projection
    from aictl.dashboard.live.projection import _ProjectionDB

    monkeypatch.setattr(board_projection, "_prompt_files_on_disk", lambda _: ([], []))
    db = kusto_store
    db.insert("sessions", session_id="s", tool="copilot-cli", started_at=100, ended_at=190)
    for prompt in ("first", "second"):
        db.insert("session_prompts", ts=110, session_id="s", tool="copilot-cli", text=prompt)
    filters = board_filters.Filters(90, 200, buckets=4)
    live_db = _ProjectionDB(db, "offline-prompts")
    payload = board_projection.compute_board(live_db, filters, now=200)
    assert len({row["id"] for row in payload["prompts"]}) == 2
    identities = {
        data["value"]["id"]: entity_id
        for topic, entity_id, data, _ in board_entities("scope", payload)
        if data["field"] == "prompts" and data.get("key")
    }
    assert len(identities) == 2
    assert all("id" not in row for row in board_projection.compute_board(db, filters, now=200)["prompts"])


def test_live_status_filter_selects_queryable_usage_by_runtime_not_hook_activity(monkeypatch, kusto_store):
    from aictl.dashboard import board_filters, board_projection

    monkeypatch.setattr(board_projection, "_prompt_files_on_disk", lambda _: ([], []))
    db = kusto_store
    db.insert("sessions", session_id="s", tool="copilot-cli", started_at=100)
    db.insert("requests", ts=120, session_id="s", tool="copilot-cli", model="gpt-5",
              input_tokens=7, output_tokens=3)
    legacy = board_filters.Filters(90, 200, status="idle", buckets=4)
    current = board_filters.Filters(90, 200, status="idle", buckets=4, runtime_statuses=(("s", "idle"),))
    assert board_projection.compute_board(db, legacy, now=200)["kpis"]["tokens"] == 0
    payload = board_projection.compute_board(db, current, now=200)
    assert payload["kpis"]["tokens"] == 10
    assert payload["agents"][0]["status"] == "running"  # Still the historical status, not a copied runtime fact.


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


def test_history_poll_emits_only_diffs_without_a_change_feed(monkeypatch):
    from aictl.dashboard import board_projection
    from aictl.stores import Store
    from aictl.stores.testing import FixtureReader

    agents = [{"id": "a", "input": 1}, {"id": "b", "input": 2}]
    reader = FixtureReader({"board.agents": agents})
    store = Store(reader=reader)
    assert not reader.capabilities()["change_feed"]
    monkeypatch.setattr(
        board_projection,
        "compute_board",
        lambda _db, _filters, *, history, **_: {"agents": history.read("board.agents")},
    )
    clock = [1000.0]
    monkeypatch.setattr(projection, "time", SimpleNamespace(time=lambda: clock[0], monotonic=lambda: clock[0]))
    hub = LiveHub()
    dashboard = LiveDashboard(hub, store, store, health_provider=lambda: ({}, {}))
    scope = "since=1&until=2"
    subscription = dashboard.subscribe(scope)

    def history_changes():
        # Operational status can change independently of the board data.
        upserts = []
        while (message := subscription.next(0)) is not None:
            event, payload = message
            assert event == "change"
            assert not payload["removals"]
            upserts.extend(row for row in payload["upserts"] if row["topic"] == "history.board")
        return upserts

    def wait_for_poll():
        wait_for(lambda: dashboard._scopes[scope].status.get("computed_at") == clock[0])

    try:
        event, bootstrap = subscription.next(0)
        assert event == "bootstrap" and bootstrap["scope"] == scope
        wait_for_poll()
        baseline = {row["data"]["value"]["id"]: row for row in history_changes() if "key" in row["data"]}
        assert set(baseline) == {"a", "b"}

        agents[0]["input"] = 3
        clock[0] += 5
        dashboard._wake.set()
        wait_for_poll()
        (changed,) = history_changes()
        assert changed["id"] == baseline["a"]["id"]
        assert changed["data"]["value"]["input"] == 3

        clock[0] += 5
        dashboard._wake.set()
        wait_for_poll()
        assert len(reader.calls) == 3
        assert history_changes() == []
    finally:
        subscription.close()
        dashboard.close()
        hub.close()


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


def test_unresolved_cutover_does_not_start_reader_or_compute_history(caplog):
    hub = LiveHub()
    calls = []

    def unexpected(*_args, **_kwargs):
        calls.append(True)
        raise AssertionError("Unresolved history must not start cluster work")

    dashboard = LiveDashboard(
        hub,
        SimpleNamespace(streams_observations=True),
        SimpleNamespace(),
        health_provider=lambda: ({}, {}),
        reader_factory=unexpected,
        compute=unexpected,
    )
    subscription = dashboard.subscribe("since=1&until=2")
    try:
        baseline = subscription.next(0)[1]
        status = next(
            row["data"]
            for row in baseline["entities"]
            if row["topic"] == "source.status" and row["data"].get("component") == "history"
        )
        assert status["incomplete"] and status["stale"]
        assert not status["ready"] and not status["pending"] and not status["retryable"]
        assert status["reason"] == "unresolved_observations"
        assert "requests" in status["unresolved_families"]
        assert dashboard._reader is None and calls == []
        hub.publish("runtime.agent", "a", {"id": "a"}, source="runtime.collector")
        assert any(row["topic"] == "runtime.agent" for row in subscription.next(1)[1]["upserts"])
        assert not any("Live history projection failed" in record.message for record in caplog.records)
    finally:
        subscription.close()
        dashboard.close()
        hub.close()


def test_unresolved_history_is_not_retried_after_clock_or_source_changes(monkeypatch, caplog):
    from aictl.dashboard.board_filters import Filters
    from aictl.kusto.observations import UnresolvedObservationsError

    hub = LiveHub()
    calls = []
    clock = [100.0]

    def compute(*_args, **_kwargs):
        calls.append(True)
        raise UnresolvedObservationsError(("requests",))

    dashboard = LiveDashboard(
        hub, SimpleNamespace(), SimpleNamespace(), health_provider=lambda: ({}, {}), compute=compute
    )
    entry = projection._Scope("since=1&until=2", Filters(1, 2), False, 1, refs=1)
    dashboard._scopes[entry.query] = entry
    dashboard._baseline_allowed = True

    class Wake:
        def wait(self, _timeout):
            clock[0] += 10
            if clock[0] > 140:
                dashboard._stop.set()
            dashboard._on_batch(
                SimpleNamespace(
                    kind="changes",
                    changed_tables=("requests_observations",),
                    frontier={},
                    ready=True,
                    stale=False,
                    reason=None,
                )
            )

        def clear(self):
            pass

        def set(self):
            pass

    dashboard._wake = Wake()
    monkeypatch.setattr(projection, "time", SimpleNamespace(time=lambda: clock[0], monotonic=lambda: clock[0]))
    try:
        dashboard._history_loop()
        assert calls == [True]
        assert entry.blocked and entry.status["incomplete"]
        assert entry.status["unresolved_families"] == ["requests"]
        assert not entry.status["retryable"]
        assert not any("Live history projection failed" in record.message for record in caplog.records)
    finally:
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


def _scope_view(hub, scope):
    """The board values and the history status a new subscriber of *scope* receives."""
    entities = hub.subscribe(scope).next(0)[1]["entities"]
    fields = {row["data"]["field"] for row in entities if row["topic"] == "history.board"}
    status = next(row["data"] for row in entities
                  if row["topic"] == "source.status" and row["data"].get("component") == "history")
    return fields, status, entities


def _staged_dashboard(compute):
    hub, reader = LiveHub(), FakeReader()
    dashboard = LiveDashboard(
        hub, SimpleNamespace(_kusto=object()), SimpleNamespace(), health_provider=lambda: ({}, {}),
        reader_factory=lambda _: reader, compute=compute,
    )
    return hub, reader, dashboard


def test_a_first_load_publishes_the_complete_fields_before_the_slow_sections_finish():
    """A first load showed nothing until every query returned: one slow or failed section blanked the board."""
    partial_sent, finish = threading.Event(), threading.Event()

    def compute(_db, _filters, *, snapshot, now, on_partial=None, field_errors=None):
        on_partial({"kpis": {"tokens": 5}, "agents": [{"id": "agent", "input": 5}]}, ["loops", "kpis.prev"])
        partial_sent.set()
        assert finish.wait(3)
        return {"kpis": {"tokens": 5, "prev": {"tokens": 1}}, "agents": [{"id": "agent", "input": 5}], "loops": []}

    hub, _reader, dashboard = _staged_dashboard(compute)
    subscription = dashboard.subscribe("since=1&until=2")
    try:
        assert partial_sent.wait(3)
        fields, status, _ = _scope_view(hub, "since=1&until=2")
        # The early fields are there while the slow section still runs; the late ones are absent, not empty.
        assert fields == {"kpis", "agents"}
        assert status["ready"] is False and status["pending"] is True
        assert status["pending_fields"] == ["loops", "kpis.prev"]
        assert not dashboard._scopes["since=1&until=2"].has_data
        finish.set()
        wait_for(lambda: dashboard._scopes["since=1&until=2"].has_data)
        fields, status, _ = _scope_view(hub, "since=1&until=2")
        assert fields == {"kpis", "agents", "loops"}
        assert status["ready"] is True and status["pending"] is False and "pending_fields" not in status
    finally:
        finish.set()
        subscription.close()
        dashboard.close()
        hub.close()


def test_a_refresh_of_a_scope_with_a_board_publishes_nothing_partial():
    calls = []

    def compute(_db, _filters, *, snapshot, now, on_partial=None, field_errors=None):
        calls.append(on_partial)
        return {"kpis": {"tokens": len(calls)}}

    hub, reader, dashboard = _staged_dashboard(compute)
    subscription = dashboard.subscribe("since=1&until=2")
    try:
        wait_for(lambda: dashboard._scopes["since=1&until=2"].has_data)
        reader.emit("changes")
        wait_for(lambda: len(calls) == 2)
        # The first load may show its fields early; a refresh keeps the whole board until the next whole one.
        assert calls[0] is not None and calls[1] is None
    finally:
        subscription.close()
        dashboard.close()
        hub.close()


def test_a_failed_optional_section_leaves_only_its_fields_out_with_the_reason():
    def compute(_db, _filters, *, snapshot, now, on_partial=None, field_errors=None):
        field_errors["changes"] = field_errors["projects"] = "Kusto view board.changes failed: timeout"
        return {"kpis": {"tokens": 5}, "agents": [{"id": "agent", "input": 5}]}

    hub, _reader, dashboard = _staged_dashboard(compute)
    subscription = dashboard.subscribe("since=1&until=2")
    try:
        wait_for(lambda: dashboard._scopes["since=1&until=2"].has_data)
        fields, status, _ = _scope_view(hub, "since=1&until=2")
        assert fields == {"kpis", "agents"}
        assert status["ready"] is True and status["error"] is None
        assert status["field_errors"] == {"changes": "Kusto view board.changes failed: timeout",
                                          "projects": "Kusto view board.changes failed: timeout"}
        entry = dashboard._scopes["since=1&until=2"]
        # The scope is read again, after the retry delay, without waiting for the refresh interval.
        assert entry.retry_at > 0 and entry.started_at is None
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


def test_unscoped_health_subscriber_receives_table_inventory_once_not_each_tick():
    hub = LiveHub()
    inventory = {"scope": "Physical extent rows, not a subscription scope", "status": "cached",
                 "checked_at": 42, "tables": [{"name": "sessions", "rows": 4}]}
    def health():
        return {"generated_at": time.time(), "store": {"table_inventory": inventory}}, {}

    dashboard = LiveDashboard(hub, SimpleNamespace(), SimpleNamespace(), health_provider=health)
    dashboard.HEALTH_INTERVAL_S = .03
    subscription = dashboard.subscribe("", history=False)
    seen_inventory = 0
    ticks = 0
    try:
        deadline = time.monotonic() + 2
        while ticks < 3 and time.monotonic() < deadline:
            msg = subscription.next(0.5)
            if not msg:
                continue
            _, payload = msg
            for entity in payload.get("entities", []) + payload.get("upserts", []):
                if entity["topic"] == "runtime.health" and entity["id"] == "table_inventory":
                    assert entity["data"]["inventory"] == inventory
                    seen_inventory += 1
                if entity["topic"] == "runtime.health" and entity["id"] == "local":
                    assert "table_inventory" not in entity["data"]["store"]
                    ticks += 1
        assert seen_inventory == 1 and ticks >= 3
    finally:
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


def test_a_board_that_is_slow_to_compute_rests_in_proportion_before_its_next_refresh():
    """A 60 s board refreshed every 60 s keeps the cluster busy all the time, and no load can then finish."""
    dashboard = LiveDashboard(LiveHub(), SimpleNamespace(), SimpleNamespace(), health_provider=lambda: ({}, {}))
    day = projection._Scope(query="day", filters=None, rolling=True, span=86400.0)
    month = projection._Scope(query="month", filters=None, rolling=True, span=30 * 86400.0)
    # A board that computes fast keeps the interval its span gives it.
    day.cost_s = month.cost_s = 0.5
    assert dashboard._refresh_interval(day) == 10.0
    assert dashboard._refresh_interval(month) == LiveDashboard.MAX_REFRESH_INTERVAL_S
    # A slow one waits its own compute time and the rest that follows it.
    day.cost_s, month.cost_s = 12.0, 90.0
    assert dashboard._refresh_interval(day) == 12.0 * (1 + LiveDashboard.REFRESH_REST_FACTOR)
    assert dashboard._refresh_interval(month) == 90.0 * (1 + LiveDashboard.REFRESH_REST_FACTOR)
