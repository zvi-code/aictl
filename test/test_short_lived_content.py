# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Short-lived content, long-lived metadata: tool call content and large payloads are kept 24 hours,
while what a call ran, on which file, its sizes and its result stay for the year."""

from __future__ import annotations

from test_board_facts import NOW, SESSION, c_assistant, c_tool_result, c_tool_use, c_user, claude_path, write_lines
from test_session_investigation import Facts, ingester, one, table

from aictl.records import CallFacts, SessionDigestRow, SessionPromptRow, SessionStepRow, SessionThinkingRow
from aictl.tool_calls import ToolCalls


class TestToolContent:
    def test_an_old_call_keeps_its_metadata_and_writes_no_content(self, tmp_path):
        write_lines(claude_path(tmp_path), [
            c_user("go", 3 * 86400 + 20, promptId="p1"),
            c_assistant("m1", "r1", 3 * 86400 + 10, blocks=[c_tool_use("tu-old", "Bash", {"command": "make build"})]),
            {**c_tool_result("tu-old", 3 * 86400, is_error=True, content="Exit code 2\nboom"), "promptId": "p1"},
            c_assistant("m2", "r2", 60, blocks=[c_tool_use("tu-new", "Bash", {"command": "make test"})]),
            {**c_tool_result("tu-new", 50), "promptId": "p1"},
        ])
        facts = Facts()
        floor = NOW - 24 * 3600  # tool content is kept 24 hours
        facts.tool_calls = ToolCalls(facts.writer, keeps_text=lambda: True, text_floor=lambda: floor)
        ingester(facts, tmp_path).poll()
        old = one(table(facts, "tool_invocations", source_event_id="tu-old"))
        assert (old["target"], old["command_name"], old["exit_code"], old["is_error"]) == ("make build", "make", 2, 1)
        assert old["error_summary"].startswith("Exit code 2") and old["input_bytes"] > 0
        content = {r["dedup_key"] for r in table(facts, "tool_invocations_text")}
        assert old["dedup_key"] not in content
        assert one(table(facts, "tool_invocations", source_event_id="tu-new"))["dedup_key"] in content


def _facts() -> Facts:
    facts = Facts()
    facts.large_payload_bytes = 1024
    return facts


class TestLargePayloads:
    def test_a_large_value_keeps_a_preview_and_its_full_text_goes_to_the_payload_table(self):
        facts = _facts()
        big = "line of a long summary\n" * 20_000
        facts.write(CallFacts(digests=[SessionDigestRow(SESSION, "task_summary", 1, NOW - 60, text=big),
                                       SessionDigestRow(SESSION, "task_summary", 2, NOW - 60, text="small")]))
        rows = {r["seq"]: r["text"] for r in table(facts, "session_digests")}
        assert rows[2] == "small"
        assert rows[1].startswith("line of a long summary") and len(rows[1]) < 5000
        assert f"preview of {len(big)} bytes" in rows[1] and "kept 24 hours" in rows[1]
        chunks = sorted(table(facts, "text_payloads"), key=lambda r: r["chunk_no"])
        assert {r["source_table"] for r in chunks} == {"session_digests"}
        assert len(chunks) == chunks[0]["chunk_count"] > 1
        assert "".join(r["text"] for r in chunks) == big and chunks[0]["total_bytes"] == len(big)

    def test_large_step_text_is_moved_too(self):
        facts = _facts()
        step = SessionStepRow(step_key="k1", ts=NOW - 60, session_id=SESSION, kind="tool_result", text="z" * 3000)
        facts.write(CallFacts(steps=[step]))
        assert "preview of 3000 bytes" in one(table(facts, "session_step_text"))["text"]
        assert one(table(facts, "text_payloads"))["source_key"] == "k1"

    def test_an_old_large_value_writes_its_preview_only(self):
        facts = _facts()
        facts.write(CallFacts(digests=[SessionDigestRow(SESSION, "task_summary", 1, NOW - 3 * 86400, text="y" * 5000)]))
        assert "preview of 5000 bytes" in one(table(facts, "session_digests"))["text"]
        assert table(facts, "text_payloads") == []

    def test_prompts_and_thinking_keep_their_whole_text(self):
        facts = _facts()
        facts.write(CallFacts(prompts=[SessionPromptRow("p", NOW, SESSION, text="p" * 8000)],
                              thinking=[SessionThinkingRow(SESSION, "t", NOW, text="t" * 100_000)]))
        assert len(one(table(facts, "session_prompts"))["text"]) == 8000
        assert len(one(table(facts, "session_thinking"))["text"]) == 100_000
        assert table(facts, "text_payloads") == []
