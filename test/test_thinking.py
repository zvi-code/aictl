"""The thinking text of model calls: the blocks of one call that the session flow opens, in local and fleet scope.

Every text here is invented for the test.
"""

from __future__ import annotations

import json

from kusto_replay import LOCAL_NODE, NOW

from aictl.dashboard.history_scope import identity
from aictl.dashboard.projections.history import HistoryScope
from aictl.dashboard.thinking import call_thinking, one_block

SID = "22222222-2222-4222-8222-222222222222"
OTHER = "33333333-3333-4333-8333-333333333333"
REMOTE = "host-b"


def history(store) -> HistoryScope:
    return HistoryScope(store.history_store.reader, None)


def seed_calls(store):
    """Two calls of the main agent and one of a subagent in one session, one unlinked block, and another session."""
    seed = store.insert
    for key, ts, agent in (("call-1", NOW - 100, ""), ("call-2", NOW - 60, ""), ("call-sub", NOW - 60, "sub-1")):
        seed("requests", session_id=SID, ts=ts, dedup_key=key, agent_id=agent, tool="claude-code", model="model-x",
             project="/work/demo", source="transcript")
    seed("session_thinking", session_id=SID, thinking_key="t-1b", ts=NOW - 99, request_key="call-1", block_index=1,
         model="model-x", chars=24, text="second plan of the first", tool="claude-code", project="/work/demo")
    seed("session_thinking", session_id=SID, thinking_key="t-1a", ts=NOW - 99, request_key="call-1", block_index=0,
         model="model-x", chars=23, text="first plan of the first", tool="claude-code", project="/work/demo")
    seed("session_thinking", session_id=SID, thinking_key="t-2", ts=NOW - 59, request_key="call-2", block_index=0,
         model="model-x", chars=18, text="the second call's", tool="claude-code", project="/work/demo")
    seed("session_thinking", session_id=SID, thinking_key="t-sub", ts=NOW - 59, request_key="call-sub", agent_id="sub-1",
         block_index=0, model="model-x", chars=15, text="subagent musing", tool="claude-code", project="/work/demo")
    seed("session_thinking", session_id=SID, thinking_key="t-free", ts=NOW - 98, request_key="", block_index=0,
         model="model-x", chars=9, text="unlinked", tool="claude-code", project="/work/demo")
    seed("session_thinking", session_id=OTHER, thinking_key="t-o", ts=NOW - 99, request_key="call-1", block_index=0,
         model="model-x", chars=5, text="other", tool="claude-code", project="/work/demo")


def test_a_call_returns_its_own_blocks_in_block_order(kusto_store):
    seed_calls(kusto_store)
    body = call_thinking(history(kusto_store), SID, NOW - 100, keep=True, floor=0.0)
    assert [(b["thinking_key"], b["block_index"], b["chars"], b["text"], b["text_state"]) for b in body["blocks"]] == [
        ("t-1a", 0, 23, "first plan of the first", "kept"), ("t-1b", 1, 24, "second plan of the first", "kept")]
    # Two calls at one time: the agent tells them apart.
    main = call_thinking(history(kusto_store), SID, NOW - 60, keep=True, floor=0.0)
    sub = call_thinking(history(kusto_store), SID, NOW - 60, "sub-1", keep=True, floor=0.0)
    assert [b["thinking_key"] for b in main["blocks"]] == ["t-2"]
    assert [b["thinking_key"] for b in sub["blocks"]] == ["t-sub"]
    # No call at that time: nothing, not the nearest call's blocks.
    assert call_thinking(history(kusto_store), SID, NOW - 80, keep=True, floor=0.0)["blocks"] == []


def test_text_that_is_not_kept_says_why_and_keeps_its_size(kusto_store):
    seed_calls(kusto_store)
    off = call_thinking(history(kusto_store), SID, NOW - 100, keep=False, floor=0.0)
    assert [(b["text"], b["text_state"], b["chars"]) for b in off["blocks"]] == [("", "not_kept", 23), ("", "not_kept", 24)]
    old = call_thinking(history(kusto_store), SID, NOW - 100, keep=True, floor=NOW - 90)
    assert [(b["text"], b["text_state"]) for b in old["blocks"]] == [("", "expired"), ("", "expired")]


def test_one_block_by_its_key(kusto_store):
    seed_calls(kusto_store)
    body = one_block(history(kusto_store), SID, "t-free", keep=True, floor=0.0)
    assert [(b["thinking_key"], b["text"]) for b in body["blocks"]] == [("t-free", "unlinked")]
    assert body["ts"] == NOW - 98


def test_the_route_reads_a_call_in_local_and_fleet_scope(kusto_store):
    from test_contract import validate_detail

    from aictl.dashboard.board_routes import handle_get

    seed_calls(kusto_store)
    # The same session id on a second node, with its own call at the same time.
    kusto_store.insert("requests", node_id=REMOTE, session_id=SID, ts=NOW - 100, dedup_key="call-1", agent_id="",
                       tool="claude-code", model="model-x", project="/work/demo", source="transcript")
    kusto_store.insert("session_thinking", node_id=REMOTE, session_id=SID, thinking_key="t-r", ts=NOW - 99,
                       request_key="call-1", block_index=0, model="model-x", chars=6, text="remote", tool="claude-code",
                       project="/work/demo")

    def get(query):
        status, body = handle_get("/api/board/thinking", query, kusto_store, kusto_store, now=NOW)
        payload = json.loads(body)
        assert status == 200, payload
        validate_detail("/api/board/thinking", payload)
        return [b["thinking_key"] for b in payload["blocks"]]

    assert get(f"session_id={SID}&ts={NOW - 100}") == ["t-1a", "t-1b"]
    for node, keys in ((LOCAL_NODE, ["t-1a", "t-1b"]), (REMOTE, ["t-r"])):
        assert get(f"scope=fleet&session_id={identity(node, SID)}&ts={NOW - 100}") == keys
        assert get(f"scope=node&node_id={node}&session_id={identity(node, SID)}&ts={NOW - 100}") == keys
    status, _ = handle_get("/api/board/thinking", f"session_id={SID}", kusto_store, kusto_store, now=NOW)
    assert status == 400


def seed_search(store):
    """Blocks of two tools, two models, two days, two projects and two nodes; one block changed its text."""
    seed = store.insert
    rows = [
        # node, session, key, ts, tool, model, project, text
        (LOCAL_NODE, SID, "s-1", NOW - 3600, "claude-code", "model-x", "/work/demo", "check the parser before the release"),
        (LOCAL_NODE, SID, "s-2", NOW - 1800, "claude-code", "model-y", "/work/demo", "the parser needs a test of empty input"),
        (LOCAL_NODE, OTHER, "s-3", NOW - 90_000, "copilot-cli", "model-x", "/work/other", "release notes mention the parser"),
        (REMOTE, SID, "s-4", NOW - 600, "copilot-cli", "model-x", "/work/demo", "remote parser plan"),
    ]
    for node, sid, key, ts, tool, model, project, text in rows:
        seed("session_thinking", node_id=node, session_id=sid, thinking_key=key, ts=ts, request_key="", tool=tool,
             model=model, project=project, chars=len(text), text=text, block_index=0)
    # A newer version of s-1 no longer holds "release": the old version must not match.
    seed("session_thinking", node_id=LOCAL_NODE, session_id=SID, thinking_key="s-1", ts=NOW - 3600, request_key="",
         tool="claude-code", model="model-x", project="/work/demo", chars=26, text="check the parser once more",
         block_index=0, _v="2026-01-02")
    seed("sessions", session_id=SID, tool="claude-code", project_path="/work/demo", started_at=NOW - 4000,
         project="/work/demo")


def search(store, query, status=200):
    from test_contract import validate_detail

    from aictl.dashboard.board_routes import handle_get

    code, body = handle_get("/api/board/thinking/search", f"since={NOW - 200_000}&until={NOW}&{query}",
                            store, store, now=NOW)
    payload = json.loads(body)
    assert code == status, payload
    if status == 200:
        validate_detail("/api/board/thinking/search", payload)
    return payload


def test_search_matches_whole_terms_and_quoted_phrases_on_the_newest_text(kusto_store):
    seed_search(kusto_store)
    assert [b["thinking_key"] for b in search(kusto_store, "q=parser+release")["blocks"]] == ["s-3"]
    # Whole terms: a part of a word does not match.
    assert search(kusto_store, "q=pars")["total"] == 0
    phrase = search(kusto_store, "q=%22test+of+empty%22")
    assert [(b["thinking_key"], b["snippet"]) for b in phrase["blocks"]] == [("s-2", "the parser needs a test of empty input")]
    assert search(kusto_store, "q=%22of+emp%22")["total"] == 1  # a phrase is a substring


def test_an_empty_search_lists_the_newest_blocks_with_counts_by_tool_model_and_day(kusto_store):
    seed_search(kusto_store)
    # This node's blocks only (the remote block is in the fleet test).
    body = search(kusto_store, "")
    assert [b["thinking_key"] for b in body["blocks"]] == ["s-2", "s-1", "s-3"]
    assert body["total"] == 3
    assert {item["name"]: item["blocks"] for item in body["by_tool"]} == {"claude-code": 2, "copilot-cli": 1}
    assert {item["name"]: item["blocks"] for item in body["by_model"]} == {"model-x": 2, "model-y": 1}
    assert sum(day["blocks"] for day in body["by_day"]) == 3 and len(body["by_day"]) == 2
    # Paging and sorting are the store's: the second largest block.
    page = search(kusto_store, "sort=chars&order=desc&offset=1&limit=1")
    assert [(b["thinking_key"], b["position"]) for b in page["blocks"]] == [("s-3", 2)] and page["total"] == 3
    assert search(kusto_store, "tool=copilot-cli&model=model-x")["total"] == 1
    assert search(kusto_store, "model=model-y")["total"] == 1
    assert search(kusto_store, "limit=201", status=400)["error"]


def test_the_search_respects_the_project_filter(kusto_store):
    seed_search(kusto_store)
    assert [b["thinking_key"] for b in search(kusto_store, "project=/work/other")["blocks"]] == ["s-3"]
    assert {b["thinking_key"] for b in search(kusto_store, "q=parser&project=/work/demo")["blocks"]} == {"s-1", "s-2"}
    assert search(kusto_store, "scope=fleet&q=parser&project=/work/demo")["total"] == 3


def test_the_search_respects_the_node_scope(kusto_store):
    seed_search(kusto_store)
    fleet = search(kusto_store, "scope=fleet&q=parser")
    assert {(b["node_id"], b["thinking_key"]) for b in fleet["blocks"]} == {
        (LOCAL_NODE, "s-1"), (LOCAL_NODE, "s-2"), (LOCAL_NODE, "s-3"), (REMOTE, "s-4")}
    # Fleet rows name their session with its node, so the flow link opens that node's session.
    assert {b["session_id"] for b in fleet["blocks"] if b["node_id"] == REMOTE} == {identity(REMOTE, SID)}
    node = search(kusto_store, f"scope=node&node_id={REMOTE}&q=parser")
    assert [b["thinking_key"] for b in node["blocks"]] == ["s-4"]


def test_text_that_is_not_kept_is_not_searched_or_shown(kusto_store):
    seed_search(kusto_store)
    kusto_store.capture = "off"
    assert search(kusto_store, "q=parser")["total"] == 0
    body = search(kusto_store, "")
    assert body["total"] == 3 and not body["text_kept"] and {b["snippet"] for b in body["blocks"]} == {""}


def test_a_search_is_split_into_terms_and_phrases_and_bounded():
    import pytest

    from aictl.dashboard.thinking import ThinkingRequestError, parse_search

    assert parse_search('Parser "empty input" release') == (["parser", "release"], ["empty input"])
    with pytest.raises(ThinkingRequestError):
        parse_search(" ".join(f"w{i}" for i in range(13)))
