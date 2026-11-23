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


# ─── Memory change records ────────────────────────────────────────


def memory_file(name: str = "feedback_style.md") -> str:
    from aictl import platforms

    return str(platforms.claude_projects_dir() / "-work-proj" / "memory" / name)


class TestMechanism:
    def test_each_mechanism_from_its_real_path_or_tool(self):
        from aictl import platforms
        from aictl.memory_changes import memory_mechanism

        cases = {
            memory_file(): "claude_auto_memory",
            memory_file("MEMORY.md"): "claude_auto_memory",
            str(platforms.claude_global_dir() / "CLAUDE.md"): "claude_md",
            "/work/proj/CLAUDE.md": "claude_md",
            "/work/proj/.claude/CLAUDE.local.md": "claude_md",
            "/work/proj/.claude/rules/testing.md": "claude_md",
            "/work/proj/AGENTS.md": "agents_md",
            "/work/proj/.github/copilot-instructions.md": "copilot_instructions",
            "/work/proj/.github/instructions/py.instructions.md": "copilot_instructions",
            str(platforms.copilot_global_dir() / "copilot-instructions.md"): "copilot_instructions",
            str(platforms.codex_global_dir() / "memories" / "MEMORY.md"): "codex_memory",
            str(platforms.copilot_global_storage() / "memory-tool" / "memories" / "notes.md"): "vscode_memory",
            "vscode-memory:///memories/notes.md": "vscode_memory",
            "copilot-memory://repository/o/r/testing": "copilot_store_memory",
            "/work/proj/src/memory/model.py": "",
            "/work/proj/README.md": "",
            str(platforms.claude_projects_dir() / "-work-proj" / "abc.jsonl"): "",
        }
        assert {path: memory_mechanism(path) for path in cases} == cases
        assert memory_mechanism("", tool_name="store_memory") == "copilot_store_memory"


def claude_memory_session(root) -> None:
    main = claude_path(root)
    write_lines(main, [
        c_user("remember my style", 500, promptId="p1", turnPosition={"turnIndex": 1}),
        c_assistant("m1", "r1", 490, blocks=[
            c_tool_use("w-mem", "Edit", {"file_path": memory_file(), "old_string": "old line\n",
                                         "new_string": "new line\nsecond line\n"}),
            c_tool_use("w-src", "Edit", {"file_path": "/work/proj/a.py", "old_string": "a", "new_string": "b"})]),
        {**c_tool_result("w-mem", 489), "promptId": "p1"},
        {**c_tool_result("w-src", 488), "promptId": "p1"},
    ])
    sub = main.parent / SESSION / "subagents" / "agent-sub9.jsonl"
    write_lines(sub, [
        {**c_user("save it", 480, promptId="p1"), "agentId": "sub9", "isSidechain": True},
        c_assistant("m2", "r2", 470, agentId="sub9", isSidechain=True, blocks=[
            c_tool_use("w-sub", "Write", {"file_path": memory_file("MEMORY.md"),
                                          "content": "- [Style](feedback_style.md)\n"})]),
        {**c_tool_result("w-sub", 469, result={"type": "create"}), "agentId": "sub9", "isSidechain": True},
    ])


def hook_edit(**detail):
    from aictl.dashboard.ingest_http import _extract_file_write_row

    return _extract_file_write_row(
        ts=iso_ts(489), session_id=SESSION, tool="claude-code", tool_name="Edit",
        detail={"tool_use_id": "w-mem", "cwd": "/work/proj", **detail},
        tool_input={"file_path": memory_file(), "old_string": "old line\n", "new_string": "new line\nsecond line\n"})


class TestMemoryChanges:
    def test_main_and_subagent_memory_writes_carry_who_and_when(self, tmp_path):
        claude_memory_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        writes = {r["source_event_id"]: r for r in table(facts, "file_write_events")}
        main, sub, src = writes["w-mem"], writes["w-sub"], writes["w-src"]
        assert (main["session_id"], main["agent_id"], main["actor"], main["mechanism"]) == (
            SESSION, "", "agent", "claude_auto_memory")
        assert (main["prompt_id"], main["turn_index"], main["lines_added"], main["lines_removed"]) == ("p1", 1, 2, 1)
        assert (sub["session_id"], sub["agent_id"], sub["actor"], sub["mechanism"]) == (
            SESSION, "sub9", "subagent", "claude_auto_memory")
        assert (sub["prompt_id"], sub["lines_added"], sub["lines_removed"]) == ("p1", 1, 0)
        # Every write gets who and when; only memory and instruction paths get a mechanism.
        assert (src["mechanism"], src["actor"], src["prompt_id"]) == ("", "agent", "p1")

    def test_a_hook_and_the_transcript_of_one_edit_are_one_row(self, tmp_path):
        facts = Facts()
        hook = hook_edit()
        facts.file_writes([hook], transcript=False)
        claude_memory_session(tmp_path)
        ingester(facts, tmp_path).poll()
        row = one([r for r in table(facts, "file_write_events") if r["source_event_id"] == "w-mem"])
        assert row["source_event_kind"] == "transcript"
        assert row["content_hash"] == hook.content_hash and row["prompt_id"] == "p1"

    def test_a_hook_after_the_transcript_adds_what_only_it_knows(self, tmp_path):
        claude_memory_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        facts.file_writes([hook_edit(pid=42)], transcript=False)
        row = one([r for r in table(facts, "file_write_events") if r["source_event_id"] == "w-mem"])
        assert (row["source_event_kind"], row["prompt_id"], row["pid"], row["mechanism"]) == (
            "transcript", "p1", 42, "claude_auto_memory")

    def test_a_hook_from_a_subagent_names_the_subagent(self):
        row = hook_edit(agent_id="sub9")
        assert (row.agent_id, row.actor, row.mechanism) == ("sub9", "subagent", "claude_auto_memory")

    def test_an_edit_the_tool_says_was_made_outside_the_session(self, tmp_path):
        write_lines(claude_path(tmp_path), [
            c_user("go on", 300, promptId="p3"),
            {"type": "attachment", "uuid": "att-1", "timestamp": iso(299), "sessionId": SESSION, "cwd": "/work/proj",
             "attachment": {"type": "edited_text_file", "filename": memory_file(), "snippet": "1\tchanged"}},
            {"type": "attachment", "uuid": "att-2", "timestamp": iso(298), "sessionId": SESSION, "cwd": "/work/proj",
             "attachment": {"type": "edited_text_file", "filename": "/work/proj/a.py", "snippet": "1\tx"}},
        ])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        row = one(table(facts, "file_write_events"))
        assert (row["path"], row["actor"], row["operation"], row["mechanism"], row["source_event_id"]) == (
            memory_file(), "outside_session", "outside_edit", "claude_auto_memory", "att-1")
        assert row["agent_id"] == "" and row["prompt_id"] == "p3"

    def test_copilot_store_and_vote_memory_and_instruction_edits(self, tmp_path):
        write_lines(copilot_events(tmp_path), [
            ev("session.start", 900, {"context": {"cwd": "/work/cli", "repository": "octo/repo"}}),
            ev("user.message", 850, {"content": "remember this", "interactionId": "i1"}),
            ev("tool.execution_start", 800, {"toolCallId": "s1", "toolName": "store_memory", "arguments": {
                "scope": "repository", "subject": "testing", "fact": "Run the fast tests first.",
                "reason": "asked", "citations": "README.md"}}, agentId="ag2"),
            ev("tool.execution_complete", 799, {"toolCallId": "s1", "success": True, "interactionId": "i1"},
               agentId="ag2"),
            ev("tool.execution_start", 790, {"toolCallId": "v1", "toolName": "vote_memory", "arguments": {
                "scope": "repository", "direction": "downvote", "fact": "Old fact.", "reason": "wrong"}}),
            ev("tool.execution_complete", 789, {"toolCallId": "v1", "success": True, "interactionId": "i1"}),
            ev("tool.execution_start", 780, {"toolCallId": "e1", "toolName": "edit", "arguments": {
                "path": "/work/cli/.github/copilot-instructions.md"}}),
            ev("tool.execution_complete", 779, {"toolCallId": "e1", "success": True, "interactionId": "i1",
                                                "fileEdits": [{"path": "/work/cli/.github/copilot-instructions.md"}],
                                                "toolTelemetry": {"metrics": {"linesAdded": 3, "linesRemoved": 1}}}),
        ])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        writes = {r["source_event_id"]: r for r in table(facts, "file_write_events", session_id=COPILOT_SID)}
        store, vote, edit = writes["s1"], writes["v1"], writes["e1"]
        assert store["path"] == "copilot-memory://repository/octo/repo/testing"
        assert (store["operation"], store["mechanism"], store["agent_id"], store["actor"], store["prompt_id"]) == (
            "store", "copilot_store_memory", "ag2", "subagent", "i1")
        assert (vote["path"], vote["operation"], vote["actor"]) == (
            "copilot-memory://repository/octo/repo", "downvote", "agent")
        assert (edit["mechanism"], edit["lines_added"], edit["lines_removed"], edit["turn_index"]) == (
            "copilot_instructions", 3, 1, 1)

    def test_vscode_memory_tool_changes(self, tmp_path):
        from test_board_facts import debug_dir, v_line, workspace_json

        workspace_json(tmp_path)
        write_lines(debug_dir(tmp_path) / "main.jsonl", [
            v_line("session_start", 900, "s0"),
            v_line("tool_call", 800, "t1", name="memory",
                   args='{"command": "create", "path": "/memories/notes.md", "file_text": "Use tabs.\\n"}'),
            v_line("tool_call", 790, "t2", name="memory",
                   args='{"command": "str_replace", "path": "/memories/notes.md", "old_str": "tabs", "new_str": "spaces"}'),
            v_line("tool_call", 780, "t3", name="memory", args='{"command": "view", "path": "/memories/"}'),
        ])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        writes = {r["source_event_id"]: r for r in table(facts, "file_write_events")}
        assert set(writes) == {"t1", "t2"}
        assert (writes["t1"]["path"], writes["t1"]["operation"], writes["t1"]["mechanism"]) == (
            "vscode-memory:///memories/notes.md", "create", "vscode_memory")
        assert (writes["t2"]["operation"], writes["t2"]["lines_added"], writes["t2"]["lines_removed"]) == (
            "str_replace", 1, 1)


# ─── Before and after content ─────────────────────────────────────


def put_file(path: str, text: str, ago: float) -> None:
    import os
    from pathlib import Path

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text)
    os.utime(path, (iso_ts(ago), iso_ts(ago)))


def memory_edit_session(root, *, ago: float = 500, original: str | None = "old line\n", new_file: bool = False):
    result = {"filePath": memory_file(), "oldString": "old line\n", "newString": "new line\n",
              "structuredPatch": [], "userModified": False, "replaceAll": False}
    if original is not None:
        result["originalFile"] = original
    write_lines(claude_path(root), [
        c_user("remember", ago + 10, promptId="p1"),
        c_assistant("m1", "r1", ago, blocks=[
            c_tool_use("e1", "Edit", {"file_path": memory_file(), "old_string": "old line\n", "new_string": "new line\n"}),
            c_tool_use("w1", "Write", {"file_path": memory_file("MEMORY.md"), "content": "- [Style](feedback_style.md)\n"})]),
        {**c_tool_result("e1", ago - 2, result=result), "promptId": "p1"},
        {**c_tool_result("w1", ago - 3, result={"type": "create", "filePath": memory_file("MEMORY.md"),
                                                 "content": "x", "originalFile": None}), "promptId": "p1"},
    ])


def hash_of(text: str) -> str:
    from aictl.memory_changes import text_hash

    return text_hash(text)


class TestMemoryContent:
    def test_before_from_the_tool_after_from_the_file_still_at_that_version(self, tmp_path):
        put_file(memory_file(), "new line\n", ago=499)
        memory_edit_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        edit = one(table(facts, "file_write_events", source_event_id="e1"))
        assert (edit["before_source"], edit["before_hash"], edit["before_bytes"]) == (
            "tool_result", hash_of("old line\n"), 9)
        assert (edit["after_source"], edit["after_hash"], edit["after_bytes"]) == (
            "file_at_ingest", hash_of("new line\n"), 9)
        assert blob(facts, edit["before_hash"]) == "old line\n" and blob(facts, edit["after_hash"]) == "new line\n"
        created = one(table(facts, "file_write_events", source_event_id="w1"))
        assert (created["before_source"], created["before_hash"], created["before_bytes"]) == ("absent", "", 0)
        assert created["after_source"] == "tool_input"
        assert blob(facts, created["after_hash"]) == "- [Style](feedback_style.md)\n"

    def test_a_file_changed_since_the_write_has_no_after_image_and_says_so(self, tmp_path):
        put_file(memory_file(), "changed later\n", ago=10)
        memory_edit_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        edit = one(table(facts, "file_write_events", source_event_id="e1"))
        assert (edit["after_source"], edit["after_hash"], edit["after_bytes"]) == (
            "unknown: the file changed after the write", "", None)
        assert hash_of("changed later\n") not in {r["hash"] for r in table(facts, "file_blobs")}

    def test_without_the_tools_copy_the_before_image_is_the_previous_stored_version(self, tmp_path):
        put_file(memory_file(), "new line\n", ago=499)
        memory_edit_session(tmp_path, original=None)
        facts = Facts()
        facts.file_writes([hook_edit_at(memory_file(), "first\n", 600)], transcript=False)
        ingester(facts, tmp_path).poll()
        edit = one(table(facts, "file_write_events", source_event_id="e1"))
        assert (edit["before_source"], edit["before_hash"]) == ("previous_version", hash_of("first\n"))

    def test_content_outlives_the_24_hour_tool_content(self, tmp_path):
        ago = 2 * 86400
        put_file(memory_file(), "new line\n", ago=ago - 1)
        memory_edit_session(tmp_path, ago=ago)
        facts = Facts()
        ingester(facts, tmp_path, backfill_days=30).poll()
        # Retention drops the call's arguments and edit text after 24 hours (tool_content).
        assert TABLE_RETENTION_CLASS["tool_invocations_text"] == "tool_content"
        facts.writer.operations = [op for op in facts.writer.operations if op[1] != "tool_invocations_text"]
        edit = one(table(facts, "file_write_events", source_event_id="e1"))
        assert blob(facts, edit["before_hash"]) == "old line\n" and blob(facts, edit["after_hash"]) == "new line\n"

    def test_without_text_the_hashes_stay_and_no_content_is_stored(self, tmp_path):
        put_file(memory_file(), "new line\n", ago=499)
        memory_edit_session(tmp_path)
        facts = Facts(keeps_text=False)
        ingester(facts, tmp_path).poll()
        edit = one(table(facts, "file_write_events", source_event_id="e1"))
        assert edit["after_hash"] == hash_of("new line\n") and table(facts, "file_blobs") == []

    def test_a_copilot_fact_is_its_own_after_image(self, tmp_path):
        write_lines(copilot_events(tmp_path), [
            ev("session.start", 900, {"context": {"cwd": "/work/cli", "repository": "octo/repo"}}),
            ev("tool.execution_start", 800, {"toolCallId": "s1", "toolName": "store_memory", "arguments": {
                "scope": "repository", "subject": "testing", "fact": "Run the fast tests first.", "reason": "r"}}),
            ev("tool.execution_complete", 799, {"toolCallId": "s1", "success": True}),
        ])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        row = one(table(facts, "file_write_events", source_event_id="s1"))
        assert blob(facts, row["after_hash"]) == "Run the fast tests first."
        assert (row["after_source"], row["before_source"]) == (
            "tool_input", "unknown: the tool keeps this memory in no local file")


def hook_edit_at(path: str, content: str, ago: float):
    from aictl.memory_changes import image_of, set_images
    from aictl.records import FileWriteRow

    row = FileWriteRow(ts=iso_ts(ago), path=path, session_id=SESSION, tool="claude-code", tool_name="Write",
                       operation="write", source_event_id="w0", dedup_key="w0-key")
    set_images(row, None, image_of(content, "tool_input"))
    return row
