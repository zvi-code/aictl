import time

from core_store_fakes import current, written
from aictl.ingesters.call_facts import FactBuffer
from aictl.records import STEP_TEXT_LIMIT, CallFacts, RequestRow, SessionStepRow, TurnRequestLink
from aictl.session_facts import SessionFacts
from aictl.stores.testing import MemoryWriter


def test_steps_keep_replay_keys_and_apply_the_capture_floor():
    writer = MemoryWriter()
    floor = 0.0
    facts = SessionFacts(writer, keeps_text=lambda: True, trim_before=lambda: floor)
    buffer = FactBuffer(facts)
    ts = time.time() - 10
    for _ in range(2):
        buffer.add_step(SessionStepRow("event:1", ts, "s", "message", turn_id="turn",
                                       text="token=secretvalue\npytest " + "x" * STEP_TEXT_LIMIT, context_tokens=0))
        buffer.flush()
    row, = current(writer, "session_steps")
    assert (row["turn_id"], row["context_tokens"], row["context_limit"], row["text_status"]) == (
        "turn", 0, None, "truncated",
    )
    text = row  # the step's own row holds a preview; the full text is in text_payloads
    assert "preview of" in text["text"] and len(text["text"]) < STEP_TEXT_LIMIT
    assert "secretvalue" not in text["text"] and "\npytest" in text["text"]
    full = "".join(r["text"] for r in sorted(written(writer, "text_payloads"), key=lambda r: r["chunk_no"]))
    assert len(full) > STEP_TEXT_LIMIT and "secretvalue" not in full
    writer.operations.clear()
    floor = ts + 1
    facts.write(CallFacts(steps=[SessionStepRow("event:1", ts, "s", "message", text="old")]))
    assert current(writer, "session_steps")[0]["text_status"] == "expired"
    assert current(writer, "session_steps")[0]["text"] is None


def test_metadata_capture_never_hands_off_session_step_text():
    writer = MemoryWriter()
    facts = SessionFacts(writer)
    facts.write(CallFacts(steps=[SessionStepRow("key", time.time(), "s", "agent_prompt", text="private")]))
    row, = current(writer, "session_steps")
    assert row["text_status"] == "withheld" and row["text"] is None


def test_cost_link_replay_reuses_the_request_key():
    writer = MemoryWriter()
    facts = SessionFacts(writer)
    ts = time.time()
    request = RequestRow(ts, session_id="s", agent_id="a", dedup_key="r", cost_usd=0.25)
    link = TurnRequestLink("r", ts, "s", agent_id="a", turn_id="child-turn",
                           root_session_id="s", root_turn_id="parent-turn", basis="source")
    for _ in range(2):
        facts.write(CallFacts(requests=[request], cost_links=[link]))
    row, = written(writer, "requests")
    assert (row["dedup_key"], row["cost_usd"]) == ("r", 0.25)
    links = written(writer, "turn_request_links")
    assert len(links) == 2
    assert {(r["request_key"], r["root_turn_id"]) for r in links} == {("r", "parent-turn")}
