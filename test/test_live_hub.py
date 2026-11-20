"""Offline protocol, authority, replay, and slow-consumer checks."""

import json

import pytest

from aictl.dashboard.live.hub import HubLimits, LiveCapacityError, LiveHub
from aictl.dashboard.live.protocol import canonical_scope, sse_bytes, stable_id


def publish(hub, value, entity_id="agent"):
    return hub.publish("runtime.agent", entity_id, {"id": entity_id, "cpu_percent": value}, source="runtime.collector")


def test_source_and_field_authority_cannot_turn_pending_usage_into_runtime_data():
    hub = LiveHub()
    with pytest.raises(ValueError, match="not authoritative"):
        hub.publish("history.board", "usage", {"tokens": 100}, source="runtime.collector")
    with pytest.raises(ValueError, match="historical fields"):
        hub.publish("runtime.agent", "agent", {"cost_usd": 1}, source="runtime.collector")
    with pytest.raises(ValueError, match="historical fields"):
        hub.publish("runtime.agent", "agent", {"activity": [1, 2]}, source="runtime.collector")
    assert hub.sequence == 0


def test_latest_gauges_coalesce_but_native_output_keeps_source_order():
    hub = LiveHub()
    subscription = hub.subscribe()
    assert subscription.next(0)[0] == "bootstrap"
    first = publish(hub, 1)
    hub.publish("runtime.output", "one", {"session_id": "s", "entry_id": "one", "text": "a"}, source="runtime.native")
    publish(hub, 2)
    hub.publish("runtime.output", "two", {"session_id": "s", "entry_id": "two", "text": "b"}, source="runtime.native")
    _, change = subscription.next(0)
    assert [row["id"] for row in change["upserts"]] == ["one", "agent", "two"]
    agent = next(row for row in change["upserts"] if row["topic"] == "runtime.agent")
    assert agent["data"]["cpu_percent"] == 2 and agent["revision"] > first
    assert subscription.next(0) is None


def test_bootstrap_registration_has_no_gap_and_removed_entity_revisions_do_not_restart():
    hub = LiveHub(epoch="daemon")
    publish(hub, 1)
    subscription = hub.subscribe()
    event, baseline = subscription.next(0)
    assert event == "bootstrap" and baseline["entities"][0]["data"]["cpu_percent"] == 1
    removed = hub.remove("runtime.agent", "agent", source="runtime.collector")
    _, change = subscription.next(0)
    assert change["removals"] == [{"topic": "runtime.agent", "id": "agent", "revision": removed}]
    readded = publish(hub, 3)
    assert readded > removed > baseline["sequence"]
    assert subscription.next(0)[1]["upserts"][0]["revision"] == readded


def test_reconnect_replays_or_explicitly_replaces_the_baseline():
    hub = LiveHub(epoch="daemon", limits=HubLimits(journal_entries=2))
    publish(hub, 1)
    original = hub.subscribe()
    cursor = original.next(0)[1]["cursor"]
    original.close()
    publish(hub, 2)
    resumed = hub.subscribe(cursor=cursor)
    event, change = resumed.next(0)
    assert event == "change" and change["upserts"][0]["data"]["cpu_percent"] == 2
    publish(hub, 3)
    publish(hub, 4)
    missed = hub.subscribe(cursor=cursor)
    event, baseline = missed.next(0)
    assert event == "bootstrap" and baseline["reason"] == "resume_miss"
    assert baseline["entities"][0]["data"]["cpu_percent"] == 4
    restarted = LiveHub(epoch="new-daemon").subscribe(cursor=baseline["cursor"])
    assert restarted.next(0)[1]["reason"] == "resume_miss"


def test_ordered_queue_overflow_forces_fresh_baseline_and_declares_the_gap():
    hub = LiveHub(limits=HubLimits(pending_entities=2, output_entries=2))
    subscription = hub.subscribe()
    subscription.next(0)
    for index in range(3):
        hub.publish("runtime.output", str(index), {"entry_id": str(index), "text": str(index)}, source="runtime.native")
    event, baseline = subscription.next(0)
    assert event == "bootstrap" and baseline["reason"] == "overflow" and baseline["ordered_gap"]
    assert [row["id"] for row in baseline["entities"]] == ["1", "2"]
    assert baseline["retention"]["native_output"]["evicted_entries"] == 1


def test_producer_loss_invalidates_replay_and_connected_subscribers():
    hub = LiveHub()
    publish(hub, 1)
    subscription = hub.subscribe()
    cursor = subscription.next(0)[1]["cursor"]
    hub.invalidate("runtime-lifecycle-overflow")
    assert subscription.next(0)[1]["reason"] == "runtime-lifecycle-overflow"
    assert hub.subscribe(cursor=cursor).next(0)[1]["reason"] == "resume_miss"


def test_invalidation_replaces_even_an_unsent_baseline_with_old_native_text():
    hub = LiveHub()
    hub.publish("runtime.output", "one", {"text": "old text"}, source="runtime.native")
    subscription = hub.subscribe()
    hub.publish("runtime.output", "one", {"text": "", "text_suppressed": True}, source="runtime.native")
    hub.invalidate("native-capture-policy-changed", ordered_gap=False)
    event, baseline = subscription.next(0)
    assert event == "bootstrap" and baseline["reason"] == "native-capture-policy-changed"
    assert not baseline["ordered_gap"]
    assert baseline["entities"][0]["data"]["text"] == ""


def test_history_limit_reserves_space_for_new_runtime_observations():
    hub = LiveHub(limits=HubLimits(history_entities=1))
    hub.replace(
        "history.board", "a", [("one", {"scope": "a", "field": "tokens", "value": 1})], source="kusto.queryable"
    )
    with pytest.raises(LiveCapacityError, match="runtime capacity is reserved"):
        hub.replace(
            "history.board", "b", [("two", {"scope": "b", "field": "tokens", "value": 2})], source="kusto.queryable"
        )
    publish(hub, 3)
    assert any(row["topic"] == "runtime.agent" for row in hub.subscribe("a").next(0)[1]["entities"])


def test_scopes_and_runtime_only_subscriptions_do_not_leak_other_queries():
    hub = LiveHub()
    runtime = hub.subscribe("a", history=False)
    scoped = hub.subscribe("a")
    runtime.next(0)
    scoped.next(0)
    hub.replace(
        "history.board", "b", [("b:agents", {"scope": "b", "field": "agents", "value": []})], source="kusto.queryable"
    )
    assert scoped.next(0) is None and runtime.next(0) is None
    hub.replace(
        "history.board", "a", [("a:agents", {"scope": "a", "field": "agents", "value": []})], source="kusto.queryable"
    )
    assert scoped.next(0)[1]["upserts"][0]["data"]["scope"] == "a"
    assert runtime.next(0) is None
    hub.replace("history.board", "a", [], source="kusto.queryable")
    assert scoped.next(0)[1]["removals"][0]["id"] == "a:agents"


def test_capacity_failure_preserves_the_whole_prior_projection():
    hub = LiveHub(limits=HubLimits(state_entities=2))
    old = [("one", {"scope": "a", "field": "tokens", "value": 1})]
    hub.replace("history.board", "a", old, source="kusto.queryable")
    version = hub.sequence
    with pytest.raises(LiveCapacityError):
        hub.replace(
            "history.board",
            "a",
            [(str(index), {"scope": "a", "field": str(index), "value": index}) for index in range(3)],
            source="kusto.queryable",
        )
    assert hub.sequence == version
    baseline = hub.subscribe("a").next(0)[1]
    assert [(row["id"], row["data"]["value"]) for row in baseline["entities"]] == [("one", 1)]


def test_data_is_frozen_at_publish_and_wire_cursor_matches_the_frame():
    hub = LiveHub(epoch="daemon")
    data = {"entry_id": "one", "text": "line\nid: injected"}
    hub.publish("runtime.output", "one", data, source="runtime.native")
    data["text"] = "mutated"
    event, baseline = hub.subscribe().next(0)
    wire = sse_bytes(event, baseline).decode()
    assert wire.startswith("id: daemon:1\nevent: bootstrap\ndata: ")
    assert len(wire.splitlines()) == 4
    assert json.loads(wire.splitlines()[2][6:])["entities"][0]["data"]["text"] != "mutated"
    assert canonical_scope("tool=b&cursor=old&history=0&tool=a") == "tool=a&tool=b"
    assert stable_id("a:b", "c") != stable_id("a", "b:c")


def test_canonical_scope_preserves_empty_tools_instead_of_broadening_to_all_tools():
    from aictl.dashboard.board_filters import parse_filters

    empty = canonical_scope("until=2&tool=&since=1&cursor=&history=1")
    all_tools = canonical_scope("until=2&since=1")
    assert empty == "since=1&tool=&until=2"
    assert empty != all_tools
    assert parse_filters(empty, 2).tools == ()
    assert parse_filters(all_tools, 2).tools is None
