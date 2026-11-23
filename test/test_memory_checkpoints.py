"""Memory saves, checkpoints and the summaries a session leaves: what aictl stores of them.

Every fixture is invented text in tmp_path; nothing here reads a real tool folder.
"""

from __future__ import annotations

import sqlite3

from test_board_facts import (
    COPILOT_SID,
    SESSION,
    c_assistant,
    c_tool_result,
    c_tool_use,
    c_user,
    claude_path,
    copilot_events,
    ev,
    iso,
    write_lines,
)
from test_session_investigation import Facts, copilot_session, ingester, one, table

from aictl.records import CallFacts, SessionDigestRow
from aictl.stores.kusto.tables import TABLE_RETENTION_CLASS

OTHER = "99999999-9999-4999-8999-999999999999"


def blob(facts: Facts, digest: str) -> str:
    return one([r for r in table(facts, "file_blobs") if r["hash"] == digest])["content"]


def compaction_lines(sid: str, summary: str, *, ago: float = 400, agent: str = "", uuid: str = "cb1") -> list[dict]:
    extra = {"agentId": agent, "isSidechain": True} if agent else {}
    return [
        {**c_user("ask", ago + 10, promptId="p1", sessionId=sid), **extra},
        {"type": "system", "subtype": "compact_boundary", "timestamp": iso(ago), "sessionId": sid, "uuid": uuid,
         "cwd": "/work/proj", **extra,
         "compactMetadata": {"trigger": "auto", "preTokens": 9000, "postTokens": 900}},
        {**c_user(summary, ago - 1, promptId="p1", sessionId=sid), "isCompactSummary": True, **extra},
    ]


class TestDigestStorage:
    def test_two_sessions_large_summaries_both_survive_whole_and_apart(self, tmp_path):
        first, second = "A" * 40_000 + " first", "B" * 40_000 + " second"
        main = claude_path(tmp_path)
        write_lines(main, compaction_lines(SESSION, first))
        write_lines(main.with_name(f"{OTHER}.jsonl"), compaction_lines(OTHER, second, uuid="cb2"))
        facts = Facts()
        ingester(facts, tmp_path).poll()
        a = one(table(facts, "session_digests", session_id=SESSION, kind="compact_summary"))
        b = one(table(facts, "session_digests", session_id=OTHER, kind="compact_summary"))
        assert (a["seq"], b["seq"]) == (1, 1)
        assert a["text_hash"] and a["text_hash"] != b["text_hash"]
        assert (blob(facts, a["text_hash"]), blob(facts, b["text_hash"])) == (first, second)
        assert (a["text_bytes"], b["text_bytes"]) == (len(first), len(second))
        assert len(a["text"]) < len(first) and "file_blobs" in a["text"]
        # The full text is not in the 24-hour payload table.
        assert not [r for r in table(facts, "text_payloads") if r["source_table"] == "session_digests"]

    def test_the_full_text_is_kept_as_long_as_file_text(self):
        assert TABLE_RETENTION_CLASS["file_blobs"] == "file_text"
        assert TABLE_RETENTION_CLASS["session_digests"] == "text"

    def test_a_large_digest_is_kept_whole_with_a_one_day_large_payload_class(self):
        facts = Facts()
        facts.retention["large_payload"] = 1
        row = SessionDigestRow(session_id=SESSION, kind="checkpoint", seq=1, ts=iso_ts(100), text="x" * 50_000)
        facts.write(CallFacts(digests=[row]), only="digests")
        stored = one(table(facts, "session_digests"))
        assert blob(facts, stored["text_hash"]) == "x" * 50_000

    def test_a_short_digest_stays_in_its_row(self, tmp_path):
        write_lines(claude_path(tmp_path), compaction_lines(SESSION, "Short summary"))
        facts = Facts()
        ingester(facts, tmp_path).poll()
        row = one(table(facts, "session_digests", kind="compact_summary"))
        assert (row["text"], row["text_hash"], row["text_bytes"]) == ("Short summary", "", len("Short summary"))

    def test_every_spill_key_names_its_session(self):
        facts = Facts()
        for sid in (SESSION, OTHER):
            facts.spill("events_text", "same-key", "detail", "y" * 40_000, ts=iso_ts(10), session_id=sid)
        keys = {r["source_key"] for r in table(facts, "text_payloads")}
        assert len(keys) == 2 and all(SESSION in k or OTHER in k for k in keys)

    def test_a_subagent_compaction_summary_is_kept_under_its_agent(self, tmp_path):
        main = claude_path(tmp_path)
        write_lines(main, compaction_lines(SESSION, "Main summary"))
        sub = main.parent / SESSION / "subagents" / "agent-sub7.jsonl"
        write_lines(sub, compaction_lines(SESSION, "Subagent summary", ago=300, agent="sub7", uuid="cb-sub"))
        facts = Facts()
        ingester(facts, tmp_path).poll()
        rows = {(r["agent_id"], r["seq"]): r["text"] for r in table(facts, "session_digests", kind="compact_summary")}
        assert rows == {("", 1): "Main summary", ("sub7", 1): "Subagent summary"}

    def test_a_compaction_summary_links_to_its_compaction(self, tmp_path):
        write_lines(claude_path(tmp_path), compaction_lines(SESSION, "Linked summary"))
        facts = Facts()
        ingester(facts, tmp_path).poll()
        event = one(table(facts, "context_events", kind="compaction"))
        digest = one(table(facts, "session_digests", kind="compact_summary"))
        assert (event["summary_kind"], event["summary_seq"]) == ("compact_summary", 1)
        assert digest["event_key"] == event["dedup_key"]

    def test_copilot_compaction_summary_links_to_its_compaction(self, tmp_path):
        copilot_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        event = one(table(facts, "context_events", session_id=COPILOT_SID, kind="compaction"))
        digest = one(table(facts, "session_digests", session_id=COPILOT_SID, kind="compact_summary"))
        assert (event["summary_kind"], event["summary_seq"], digest["event_key"]) == (
            "compact_summary", 1, event["dedup_key"])

    def test_copilot_checkpoint_keeps_all_seven_fields(self, tmp_path):
        copilot_session(tmp_path)
        conn = sqlite3.connect(tmp_path / "copilot" / "session-store.db")
        conn.execute("UPDATE checkpoints SET history='Earlier steps', technical_details='Uses a lexer',"
                     " important_files='parser.py'")
        conn.commit()
        conn.close()
        facts = Facts()
        ingester(facts, tmp_path).poll()
        text = one(table(facts, "session_digests", session_id=COPILOT_SID, kind="checkpoint"))["text"]
        for head, body in (("Overview", "Summary of work"), ("History", "Earlier steps"), ("Work done", "done"),
                           ("Technical details", "Uses a lexer"), ("Important files", "parser.py"),
                           ("Next steps", "more")):
            assert f"## {head}\n{body}" in text


def iso_ts(ago: float) -> float:
    from datetime import datetime

    return datetime.fromisoformat(iso(ago).replace("Z", "+00:00")).timestamp()


def todo(tool_id: str, items: list[tuple[str, str]]) -> dict:
    return c_tool_use(tool_id, "TodoWrite", {"todos": [{"content": c, "status": s} for c, s in items]})


class TestTodoVersions:
    def test_each_todo_write_is_a_version_also_for_a_subagent(self, tmp_path):
        main = claude_path(tmp_path)
        write_lines(main, [
            c_user("plan it", 500, promptId="p1"),
            c_assistant("m1", "r1", 490, blocks=[todo("t1", [("parse", "pending")])]),
            c_tool_result("t1", 489),
            c_assistant("m2", "r2", 480, blocks=[todo("t2", [("parse", "completed"), ("test", "pending")])]),
            c_tool_result("t2", 479),
            c_assistant("m3", "r3", 470, blocks=[
                c_tool_use("k1", "TaskCreate", {"subject": "Write the lexer", "description": "d", "activeForm": "a"}),
                c_tool_use("k2", "TaskUpdate", {"taskId": "1", "status": "in_progress"})]),
            c_tool_result("k1", 469, result={"task": {"id": "1", "subject": "Write the lexer"}}),
            c_tool_result("k2", 468, result={"success": True, "taskId": "1", "updatedFields": ["status"],
                                             "statusChange": {"from": "pending", "to": "in_progress"}}),
        ])
        sub = main.parent / SESSION / "subagents" / "agent-s2.jsonl"
        write_lines(sub, [
            {**c_user("sub task", 460, promptId="p1"), "agentId": "s2", "isSidechain": True},
            c_assistant("m4", "r4", 455, agentId="s2", isSidechain=True, blocks=[todo("t3", [("sub step", "pending")])]),
            {**c_tool_result("t3", 454), "agentId": "s2", "isSidechain": True},
        ])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        todos = {(r["agent_id"], r["seq"]): r["text"] for r in table(facts, "session_digests", kind="todo_list")}
        assert set(todos) == {("", 1), ("", 2), ("s2", 1)}
        assert "[completed] parse" in todos[("", 2)] and "[pending] parse" in todos[("", 1)]
        changes = {r["seq"]: r for r in table(facts, "session_digests", kind="task_change")}
        assert set(changes) == {1, 2}
        assert "create" in changes[1]["text"] and "Write the lexer" in changes[1]["text"]
        assert "update" in changes[2]["text"] and "status: in_progress" in changes[2]["text"]
        outcome = one(table(facts, "session_outcomes", session_id=SESSION))
        assert (outcome["todos_total"], outcome["todos_completed"]) == (2, 1)  # the main agent's last list

    def test_copilot_update_todo_is_a_version(self, tmp_path):
        write_lines(copilot_events(tmp_path), [
            ev("session.start", 900, {"context": {"cwd": "/work/cli"}}),
            ev("tool.execution_start", 800, {"toolCallId": "u1", "toolName": "update_todo",
                                             "arguments": {"todos": "- [ ] parse\n- [ ] test"}}),
            ev("tool.execution_complete", 799, {"toolCallId": "u1", "success": True}),
            ev("tool.execution_start", 700, {"toolCallId": "u2", "toolName": "update_todo",
                                             "arguments": {"todos": "- [x] parse\n- [ ] test"}}, agentId="ag5"),
            ev("tool.execution_complete", 699, {"toolCallId": "u2", "success": True}, agentId="ag5"),
        ])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        todos = {(r["agent_id"], r["seq"]): r["text"] for r in table(facts, "session_digests", session_id=COPILOT_SID,
                                                                         kind="todo_list")}
        assert todos == {("", 1): "- [ ] parse\n- [ ] test", ("ag5", 1): "- [x] parse\n- [ ] test"}
