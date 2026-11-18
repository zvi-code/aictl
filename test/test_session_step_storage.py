import time

from aictl.storage import STEP_TEXT_LIMIT, CallFacts, HistoryDB, RequestRow, SessionStepRow, TurnRequestLink


def test_steps_replay_without_duplicating_searchable_text(tmp_path):
    db = HistoryDB(tmp_path / "history.db", flush_interval=0)
    ts = time.time() - 10
    try:
        step = SessionStepRow("event:1", ts, "s", "message", turn_id="turn",
                              text="token=secretvalue\npytest " + "x" * STEP_TEXT_LIMIT, context_tokens=0)
        db.write_call_facts(CallFacts(steps=[step]))
        db.write_call_facts(CallFacts(steps=[step]))
        conn = db._conn()
        assert [tuple(r) for r in conn.execute("SELECT turn_id,context_tokens,context_limit,text_status FROM session_steps")] == [
            ("turn", 0, None, "truncated")]
        texts = [r[0] for r in conn.execute("SELECT text FROM session_step_text")]
        assert len(texts) == 1 and len(texts[0]) == STEP_TEXT_LIMIT
        assert "secretvalue" not in texts[0] and "\npytest" in texts[0]
        db.trim_text(before=ts + 1)
        db.write_call_facts(CallFacts(steps=[step]))
        assert not conn.execute("SELECT 1 FROM session_step_text WHERE text != ''").fetchone()
    finally:
        db.close()


def test_metadata_capture_never_writes_session_step_text(tmp_path):
    db = HistoryDB(tmp_path / "history.db", capture="metadata", flush_interval=0)
    try:
        db.write_call_facts(CallFacts(steps=[SessionStepRow("key", time.time(), "s", "agent_prompt", text="private")]))
        assert db._conn().execute("SELECT text_status FROM session_steps").fetchone()[0] == "withheld"
        assert db._conn().execute("SELECT COUNT(*) FROM session_step_text").fetchone()[0] == 0
    finally:
        db.close()


def test_cost_link_replay_joins_one_canonical_request_without_charging_twice(tmp_path):
    with HistoryDB(tmp_path / "cost.db", flush_interval=0) as db:
        ts = time.time()
        request = RequestRow(ts, session_id="s", agent_id="a", dedup_key="r", cost_usd=0.25)
        link = TurnRequestLink("r", ts, "s", agent_id="a", turn_id="child-turn",
                               root_session_id="s", root_turn_id="parent-turn", basis="source")
        for _ in range(2):
            db.write_call_facts(CallFacts(requests=[request], cost_links=[link]))
        row = db._conn().execute(
            "SELECT l.root_turn_id,count(*),sum(r.cost_usd) FROM requests r JOIN turn_request_links l "
            "ON r.session_id=l.session_id AND r.dedup_key=l.request_key GROUP BY l.root_turn_id"
        ).fetchone()
        assert tuple(row) == ("parent-turn", 1, 0.25)
