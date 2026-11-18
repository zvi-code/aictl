import time

from aictl.storage import STEP_TEXT_LIMIT, CallFacts, HistoryDB, SessionStepRow


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
