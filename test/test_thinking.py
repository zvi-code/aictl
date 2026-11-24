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
