import time

import pytest

from aictl.dashboard.live.hub import LiveHub
from aictl.dashboard.live.projection import LiveDashboard
from aictl.dashboard.live.protocol import canonical_scope, parse_agent_watch, watched_agent_id


def test_agent_watch_is_not_a_board_filter():
    query = "tools=claude-code&agent_watch=flow%3Asession%3Aagent&history=1"
    assert canonical_scope(query) == "tools=claude-code"
    assert parse_agent_watch(query) == ("flow", "session:agent")
    for bad in ("agent_watch=", "agent_watch=events:x", "agent_watch=flow:", "agent_watch=flow:x&agent_watch=flow:y"):
        with pytest.raises(ValueError, match="Invalid agent watch"):
            parse_agent_watch(bad)


def test_watched_history_is_private_to_the_selected_agent_and_view():
    hub = LiveHub(epoch="drawer")
    agent = watched_agent_id(("flow", "a"))
    other = watched_agent_id(("flow", "b"))
    details = watched_agent_id(("detail", "a"))
    data = {"status": 404, "value": None}
    for key in (agent, other, details):
        hub.publish("history.agent", key, data, source="kusto.queryable")
    watcher = hub.subscribe("tools=x", agent_entity=agent)
    ordinary = hub.subscribe("tools=x")
    runtime = hub.subscribe("tools=x", history=False, agent_entity=agent)
    watch_frame = watcher.next(0)
    assert watch_frame and [row["id"] for row in watch_frame[1]["entities"]] == [agent]
    assert ordinary.next(0)[1]["entities"] == runtime.next(0)[1]["entities"] == []

    hub.remove("history.agent", other, source="kusto.queryable")
    assert watcher.next(0) is None
    hub.remove("history.agent", agent, source="kusto.queryable")
    assert [row["id"] for row in watcher.next(0)[1]["removals"]] == [agent]
    assert ordinary.next(0) is None

    resumed = hub.subscribe("tools=x", agent_entity=details, cursor=watch_frame[1]["cursor"])
    assert resumed.next(0)[1]["removals"] == []
    hub.close()


def test_open_agent_projects_once_and_removes_state_when_last_view_closes(monkeypatch):
    seen = []

    def project(db, store, watch):
        seen.append(watch)
        return 200, {"agent": {"id": watch[1]}}

    monkeypatch.setattr("aictl.dashboard.live.projection.project_agent", project)
    hub = LiveHub()
    dashboard = LiveDashboard(hub, None, None, health_provider=lambda: {}, compute=lambda *_args, **_kw: {})
    subscription = dashboard.subscribe("agent_watch=detail%3Aa")
    try:
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            frame = subscription.next(0.1)
            if frame:
                upserts = frame[1].get("upserts", frame[1].get("entities", []))
                changed = [row for row in upserts if row["topic"] == "history.agent"]
                if changed:
                    assert changed[0]["data"] == {
                        "agent_id": "a", "view": "detail", "status": 200, "value": {"agent": {"id": "a"}},
                    }
                    break
        else:
            pytest.fail("No agent projection was delivered")
        assert seen == [("detail", "a")]
    finally:
        subscription.close()
        dashboard.close()
    assert hub.values("history.agent") == ()


def test_changes_to_timer_written_tables_alone_do_not_read_a_flow_again():
    """The flow of a session reads its records again only when a table it can show changed."""
    from types import SimpleNamespace

    hub = LiveHub()
    dashboard = LiveDashboard(hub, None, None, health_provider=lambda: {}, compute=lambda *_args, **_kw: {})

    def batch(kind, tables, background):
        return SimpleNamespace(kind=kind, changed_tables=tables, background=background, frontier={}, ready=True,
                               stale=False, reason=None, details={})

    try:
        flow, detail = ("flow", "a"), ("detail", "a")
        before = dashboard._watch_generation(flow), dashboard._watch_generation(detail)
        dashboard._on_batch(batch("changes", ("metrics",), True))
        assert dashboard._watch_generation(flow) == before[0]
        assert dashboard._watch_generation(detail) == before[1] + 1  # the detail view shows resource samples
        dashboard._on_batch(batch("changes", ("metrics", "requests"), False))
        assert dashboard._watch_generation(flow) == before[0] + 1
        dashboard._on_batch(batch("resync", ("metrics",), False))
        assert dashboard._watch_generation(flow) == before[0] + 2
    finally:
        dashboard.close()
        hub.close()
