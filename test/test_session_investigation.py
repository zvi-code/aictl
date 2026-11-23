# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The facts kept a year to investigate a session: what each tool call acted on, turns,
subagent labels, outcomes, touched files; and the 14-day digests. Fixtures use the field
shapes found in the tools' real files."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest
from core_store_fakes import current
from test_board_facts import (
    COPILOT_SID,
    MODEL,
    NOW,
    SESSION,
    VSCODE_SID,
    c_assistant,
    c_tool_result,
    c_tool_use,
    c_user,
    chat_file,
    claude_path,
    copilot_events,
    debug_dir,
    ev,
    iso,
    usage_record,
    v_line,
    workspace_json,
    write_lines,
)

from aictl.dashboard import projection_utils
from aictl.ingesters.session_outcomes import OutcomeBook
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.kusto.tables import SESSION_HISTORY_TABLES, TABLES
from aictl.stores.kusto.writer import KustoWriter
from aictl.stores.testing import MemoryWriter
from aictl.tool_calls import ToolCalls
from aictl.tool_targets import call_target, describe_call, program_name, split_mcp, url_host

NEW_TABLES = ("session_turns", "session_files", "session_outcomes", "session_digests", "session_thinking")
PROSE = (
    "please refactor",
    "secret message",
    "how to parse",
    "Explain the bug in detail",
    "Summary of work",
    "Let me think hard",
    "Reasoning in the open",
)
THOUGHT = "Let me think hard about the parser"


class ValidatingWriter(MemoryWriter):
    """Keeps every row, after checking it against the table's columns and types as the Kusto writer does."""

    def __init__(self) -> None:
        super().__init__()
        self._kusto = KustoWriter(None, node_id="test", capture=False)

    def _check(self, table: str, rows: list) -> None:
        spec = TABLES[table]
        owned = {"node_id", spec.version} | ({spec.tombstone} if spec.tombstone else set())
        columns = dict(spec.columns)
        for row in rows:
            self._kusto._encode(table, spec, row, columns, set(columns) - owned, delete=False)

    def append(self, table, rows):
        rows = list(rows)
        self._check(table, rows)
        super().append(table, rows)

    def upsert(self, table, rows):
        rows = list(rows)
        self._check(table, rows)
        super().upsert(table, rows)


class Facts(SessionFacts):
    def __init__(self, *, keeps_text: bool = True) -> None:
        super().__init__(ValidatingWriter(), keeps_text=lambda: keeps_text)
        self.tool_calls = ToolCalls(self.writer, keeps_text=lambda: keeps_text)


def ingester(facts: Facts, root: Path, **kwargs) -> TranscriptUsageIngester:
    return TranscriptUsageIngester(
        facts,
        claude_projects=root / "claude" / "projects",
        codex_sessions=root / "codex",
        copilot_state=root / "copilot" / "session-state",
        vscode_workspaces=root / "vscode" / "workspaceStorage",
        tool_calls=facts.tool_calls,
        **kwargs,
    )


def table(facts: Facts, name: str, **filters) -> list[dict]:
    return [r for r in current(facts.writer, name) if all(r.get(k) == v for k, v in filters.items())]


def written(facts: Facts, name: str) -> int:
    return len(facts.writer.written(name))


def one(rows: list[dict]) -> dict:
    assert len(rows) == 1, rows
    return rows[0]


# ─── The MCP split and the call target ────────────────────────────


class TestSplitMcp:
    def test_every_form_names_its_server_and_tool(self):
        assert split_mcp("mcp__github__get_issue") == ("github", "get_issue")
        assert split_mcp("mcp__plugin_playwright_playwright__browser_click") == (
            "plugin_playwright_playwright",
            "browser_click",
        )
        assert split_mcp("kusto/query") == ("kusto", "query")  # VS Code's server/tool form
        # Copilot reports the server and the tool beside the call; they win over the name.
        assert split_mcp("mcp__a__b__c", server="a__b", tool="c") == ("a__b", "c")
        assert split_mcp("whatever", server="srv", tool="x") == ("srv", "x")

    def test_claude_attribution_only_decides_where_a_server_with_underscores_ends(self):
        assert split_mcp("mcp__my__srv__do_it", hint="my__srv") == ("my__srv", "do_it")
        # Claude Code spells "Claude Browser" as "Claude_Browser" in tool names: one spelling stays.
        assert split_mcp("mcp__Claude_Browser__navigate", hint="Claude Browser") == ("Claude_Browser", "navigate")
        # A hint for another server than the call's own is not used.
        assert split_mcp("mcp__ccd_turn__wrap_up", hint="Claude Browser") == ("ccd_turn", "wrap_up")

    def test_unknown_stays_empty(self):
        assert split_mcp("mcp_github_get_issue") == ("", "")  # server and tool cannot be told apart
        assert split_mcp("mcp__onlyserver") == ("", "")
        assert split_mcp("Bash") == ("", "")
        assert split_mcp("") == ("", "")

    def test_the_board_uses_the_same_split(self):
        assert projection_utils.mcp_server_of("mcp__github__get_issue") == "github"
        assert projection_utils.mcp_server_of("kusto/query") == "kusto"
        assert projection_utils.mcp_server_of("mcp_github_get_issue") == ""
        assert projection_utils.mcp_server_of("Bash") is None


class TestCallTarget:
    def test_kinds_and_identifiers(self):
        assert call_target("Read", {"file_path": "/w/a.py"}) == ("file", "/w/a.py")
        assert call_target("Bash", {"command": "git commit -m 'secret message'"}) == ("command", "git")
        assert call_target(
            "WebFetch", {"url": "https://user:pw@docs.example.com:8443/x?q=1", "prompt": "how to parse"}
        ) == ("url", "docs.example.com")
        assert call_target("Skill", {"skill": "ui-review"}) == ("skill", "ui-review")
        assert call_target("Agent", {"subagent_type": "Explore", "prompt": "please refactor"}) == ("agent", "Explore")
        assert call_target("task", {"agent_type": "explore", "description": "d"}) == ("agent", "explore")
        assert call_target("runSubagent", {"agentName": "Plan"}) == ("agent", "Plan")
        assert call_target("mcp__github__get_issue", {"owner": "o"}) == ("other", "get_issue")
        assert call_target("TodoWrite", {"todos": []}) == ("other", "")

    def test_search_text_is_a_target_only_while_text_is_kept(self):
        assert call_target("WebSearch", {"query": "how to parse"}) == ("query", "")
        grep = describe_call("Grep", {"pattern": "secret message", "path": "/w/src"}, keep_text=False)
        assert (grep["target"], grep["search_path"]) == ("", "/w/src")
        grep = describe_call("grep", {"pattern": "needle", "paths": ["/w"]}, keep_text=True)
        assert (grep["target_kind"], grep["target"], grep["search_path"]) == ("query", "needle", "/w")
        assert call_target("sql", {"query": "select secret", "description": "d"}) == ("query", "")


class TestYearLongCallFields:
    """What survives the 24-hour tool content: command, file, URL, search, MCP, subagent and skill fields."""

    def test_each_kind_with_and_without_text(self):
        cases = {
            ("Bash", "cd /w && FOO=1 pytest -q tests"): ("command", "cd /w && FOO=1 pytest -q tests", "pytest"),
            ("WebFetch", "https://docs.example.com/a/b?q=1"): ("url", "https://docs.example.com/a/b?q=1", "docs.example.com"),
        }
        for (name, value), (kind, full, ident) in cases.items():
            key = "command" if kind == "command" else "url"
            on = describe_call(name, {key: value}, keep_text=True)
            off = describe_call(name, {key: value}, keep_text=False)
            assert (on["target_kind"], on["target"]) == (kind, full)
            assert (off["target_kind"], off["target"]) == (kind, ident)
            assert ident in (on["command_name"], on["url_host"]) and ident in (off["command_name"], off["url_host"])
        read = describe_call("Read", {"file_path": "/w/a.py", "offset": 10, "limit": 20}, keep_text=False)
        assert (read["target"], read["read_offset"], read["read_limit"]) == ("/w/a.py", 10, 20)
        view = describe_call("view", {"path": "C:\\w\\a.py", "view_range": [5, 9]}, keep_text=False)
        assert (view["target"], view["read_offset"], view["read_limit"]) == ("C:\\w\\a.py", 5, 5)
        mcp = describe_call("mcp__github__create_issue", {"title": "please refactor", "body": "x"}, keep_text=True)
        assert (mcp["target"], mcp["arg_names"]) == ("create_issue", "body,title")
        agent = describe_call("Agent", {"subagent_type": "Explore", "description": "Find the parser",
                                        "prompt": "please refactor"}, keep_text=False)
        assert (agent["target"], agent["agent_label"]) == ("Explore", "Find the parser")
        assert describe_call("Skill", {"skill": "ui-review"}, keep_text=False)["target"] == "ui-review"

    def test_secrets_in_a_command_line_or_url_are_redacted(self):
        curl = describe_call("Bash", {"command": 'curl -H "Authorization: Bearer abc123" https://x.test'}, keep_text=True)
        assert "abc123" not in curl["target"] and curl["command_name"] == "curl"
        env = describe_call("Bash", {"command": "FOO_TOKEN=xyz cmd --password hunter22"}, keep_text=True)
        assert "xyz" not in env["target"] and "hunter22" not in env["target"] and env["command_name"] == "cmd"
        url = describe_call("WebFetch", {"url": "https://u:pw@h.test/a?access_token=abc&x=1"}, keep_text=True)
        assert url["target"] == "https://h.test/a" and url["url_host"] == "h.test"

    def test_a_long_command_line_is_cut_and_says_so(self):
        found = describe_call("Bash", {"command": "echo " + "x" * 600}, keep_text=True)
        assert (len(found["target"]), found["target_chars"], found["target_truncated"]) == (500, 605, True)
        short = describe_call("Bash", {"command": "ls"}, keep_text=True)
        assert (short["target_chars"], short["target_truncated"]) == (2, False)

    def test_program_names_and_hosts(self):
        assert program_name("FOO=1 BAR=2 make test") == "make"
        assert program_name(r"C:\Python311\python.exe -m pytest") == "python.exe"
        assert (
            program_name('"C:\\Program Files\\Git\\bin\\git.exe" status') == "Program"
        )  # quoted paths with spaces stop at the first word
        assert program_name("") == ""
        assert url_host("not a url") == ""

    def test_windows_and_uri_paths_stay_as_given(self):
        assert call_target("view", {"path": r"C:\Users\me\proj\a.py"}) == ("file", r"C:\Users\me\proj\a.py")
        assert call_target("read_file", {"filePath": "file:///c%3A/Users/me/a.py"}) == ("file", "c:/Users/me/a.py")
        kind, target = call_target("apply_patch", {"input": "*** Begin Patch\n*** Update File: C:\\w\\b.py\n+x\n"})
        assert (kind, target) == ("file", "C:\\w\\b.py")


# ─── Claude Code ──────────────────────────────────────────────────


def claude_session(root: Path) -> None:
    """A session with two turns, a subagent, MCP and file calls, and the session lines."""
    main = claude_path(root)
    agent_call = c_tool_use(
        "tu-agent",
        "Agent",
        {"subagent_type": "Explore", "description": "Find the parser", "prompt": "please refactor", "model": "haiku"},
    )
    write_lines(
        main,
        [
            c_user(
                "please refactor",
                600,
                promptId="p1",
                permissionMode="auto",
                turnOrigin="human",
                turnPosition={"promptIndex": 1, "turnIndex": 1},
            ),
            # Claude Code writes one line per content block; the thinking block comes first.
            c_assistant(
                "m1",
                "r1",
                595,
                apiBlockIndex=0,
                thinkingDurationMs=800,
                blocks=[{"type": "thinking", "thinking": THOUGHT, "signature": "SIG-SECRET"}],
            ),
            c_assistant(
                "m1",
                "r1",
                590,
                effort="high",
                thinkingDurationMs=1200,
                requestedModel="claude-opus-5-5",
                attributionMcpServer="Claude Browser",
                attributionSkill="ui-review",
                blocks=[
                    c_tool_use("tu-read", "Read", {"file_path": "/work/proj/a.py"}),
                    c_tool_use("tu-mcp", "mcp__Claude_Browser__navigate", {"url": "https://x.test"}),
                    c_tool_use("tu-bash", "Bash", {"command": "git commit -m 'secret message'"}),
                    c_tool_use("tu-search", "WebSearch", {"query": "how to parse"}),
                ],
            ),
            {**c_tool_result("tu-read", 585), "promptId": "p1"},
            {**c_tool_result("tu-mcp", 584), "promptId": "p1"},
            {**c_tool_result("tu-bash", 583, is_error=True, content="Exit code 1"), "promptId": "p1"},
            {**c_tool_result("tu-search", 582), "promptId": "p1"},
            c_assistant("m2", "r2", 581, apiBlockIndex=0, blocks=[{"type": "redacted_thinking", "data": "ENC-SECRET"}]),
            c_assistant(
                "m2",
                "r2",
                580,
                blocks=[
                    c_tool_use(
                        "tu-edit", "Edit", {"file_path": "/work/proj/a.py", "old_string": "a", "new_string": "b"}
                    ),
                    c_tool_use("tu-write", "Write", {"file_path": "/work/proj/new.py", "content": "x\n"}),
                    agent_call,
                    c_tool_use(
                        "tu-todo",
                        "TodoWrite",
                        {
                            "todos": [
                                {"content": "Explain the bug in detail", "status": "completed"},
                                {"content": "write tests", "status": "pending"},
                            ]
                        },
                    ),
                ],
            ),
            {**c_tool_result("tu-edit", 575), "promptId": "p1"},
            {**c_tool_result("tu-write", 574, result={"type": "create"}), "promptId": "p1"},
            {
                **c_tool_result(
                    "tu-agent",
                    573,
                    result={
                        "status": "completed",
                        "agentId": "sub1",
                        "agentType": "Explore",
                        "resolvedModel": "claude-haiku-5-5",
                        "prompt": "please refactor",
                    },
                ),
                "promptId": "p1",
            },
            {**c_tool_result("tu-todo", 572), "promptId": "p1"},
            {
                "type": "system",
                "subtype": "stop_hook_summary",
                "timestamp": iso(571),
                "sessionId": SESSION,
                "hookCount": 2,
                "hookInfos": [{"command": "x", "durationMs": 5}],
                "hookErrors": ["failed"],
                "preventedContinuation": False,
            },
            c_user(
                "second ask",
                500,
                promptId="p2",
                turnOrigin="human",
                permissionMode="auto",
                turnPosition={"promptIndex": 2, "turnIndex": 2},
            ),
            {
                "type": "system",
                "subtype": "api_error",
                "timestamp": iso(495),
                "sessionId": SESSION,
                "uuid": "e1",
                "error": {"status": 529, "error": {"type": "overloaded_error"}},
            },
            {
                "type": "system",
                "subtype": "compact_boundary",
                "timestamp": iso(490),
                "sessionId": SESSION,
                "uuid": "cb1",
                "compactMetadata": {"trigger": "auto", "preTokens": 1000, "postTokens": 100},
            },
            {**c_user("Summary of work so far", 489, promptId="p2"), "isCompactSummary": True},
            {
                "type": "pr-link",
                "sessionId": SESSION,
                "prNumber": 7,
                "prUrl": "https://github.com/o/r/pull/7",
                "prRepository": "o/r",
                "timestamp": iso(480),
            },
            {"type": "mode", "mode": "normal", "sessionId": SESSION},
            {"type": "permission-mode", "permissionMode": "bypassPermissions", "sessionId": SESSION},
            {
                "type": "cost-state",
                "sessionId": SESSION,
                "totalCostUSD": 1.25,
                "totalAPIDuration": 9000,
                "totalToolDuration": 3000,
                "totalLinesAdded": 12,
                "totalLinesRemoved": 4,
            },
        ],
    )
    sub = main.parent / SESSION / "subagents" / "agent-sub1.jsonl"
    write_lines(
        sub,
        [
            {**c_user("please refactor", 570, agentId="sub1", isSidechain=True), "promptId": "p1"},
            c_assistant(
                "m3",
                "r3",
                565,
                agentId="sub1",
                isSidechain=True,
                blocks=[c_tool_use("tu-sub", "Grep", {"pattern": "secret message", "path": "/work/proj"})],
            ),
        ],
    )
    sub.with_name("agent-sub1.meta.json").write_text(
        json.dumps({"agentType": "Explore", "description": "Find the parser", "toolUseId": "tu-agent", "spawnDepth": 1})
    )
    workflows = main.parent / SESSION / "workflows"
    workflows.mkdir(parents=True)
    for run, status in (("wf_1", "completed"), ("wf_2", "failed")):
        (workflows / f"{run}.json").write_text(
            json.dumps(
                {
                    "runId": run,
                    "workflowName": f"review {run}",
                    "status": status,
                    "durationMs": 10,
                    "agentCount": 2,
                    "summary": "Summary of work",
                    "startTime": int((NOW - 450) * 1000),
                    "script": "x",
                }
            )
        )


class TestClaude:
    @pytest.fixture
    def facts(self, tmp_path):
        claude_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        return facts

    def test_tool_calls_keep_their_target_server_and_turn(self, facts):
        calls = {r["source_event_id"]: r for r in table(facts, "tool_invocations")}
        assert (calls["tu-read"]["target_kind"], calls["tu-read"]["target"]) == ("file", "/work/proj/a.py")
        mcp = calls["tu-mcp"]
        assert (mcp["mcp_server"], mcp["mcp_tool"], mcp["target_kind"], mcp["target"]) == (
            "Claude_Browser",
            "navigate",
            "other",
            "navigate",
        )
        bash = calls["tu-bash"]
        assert (bash["target_kind"], bash["target"], bash["command_name"]) == ("command", "git commit -m 'secret message'", "git")
        assert (bash["is_error"], bash["exit_code"], bash["error_summary"]) == (1, 1, "Exit code 1")
        assert (calls["tu-search"]["target_kind"], calls["tu-search"]["target"]) == ("query", "how to parse")
        assert (calls["tu-agent"]["target_kind"], calls["tu-agent"]["target"]) == ("agent", "Explore")
        assert {calls[k]["turn_index"] for k in ("tu-read", "tu-edit", "tu-agent")} == {1}
        assert calls["tu-sub"]["turn_index"] == 1 and calls["tu-sub"]["prompt_id"] == "p1"
        # A tool call joins the model call that asked for it.
        keys = {r["dedup_key"] for r in table(facts, "requests")}
        assert calls["tu-read"]["request_key"] in keys

    def test_requests_carry_turn_effort_and_attribution(self, facts):
        calls = {r["dedup_key"]: r for r in table(facts, "requests")}
        first = next(r for r in calls.values() if r["effort"] == "high")
        assert (first["turn_index"], first["prompt_id"], first["thinking_ms"]) == (1, "p1", 1200.0)
        assert (first["attribution_mcp_server"], first["attribution_skill"]) == ("Claude Browser", "ui-review")
        assert first["requested_model"] == "claude-opus-5-5"  # differs from the model that answered
        other = next(
            r
            for r in calls.values()
            if r["turn_index"] == 1 and r["effort"] == "" and not r["is_error"] and not r["agent_id"]
        )
        assert other["requested_model"] == ""
        error = one([r for r in calls.values() if r["is_error"]])
        assert (error["turn_index"], error["prompt_id"]) == (2, "p2")

    def test_subagent_has_its_label_parent_and_state(self, facts):
        agent = one(table(facts, "agents", agent_id="sub1"))
        assert agent["description"] == "Find the parser"
        assert (agent["parent_agent_id"], agent["parent_tool_use_id"], agent["spawn_depth"]) == ("", "tu-agent", 1)
        assert (agent["resolved_model"], agent["status"]) == ("claude-haiku-5-5", "completed")

    def test_one_row_per_turn(self, facts):
        turns = {r["turn_index"]: r for r in table(facts, "session_turns", session_id=SESSION)}
        first, second = turns[1], turns[2]
        assert (first["prompt_id"], first["origin"], first["permission_mode"]) == ("p1", "human", "auto")
        # Two model calls of the main agent and one of the subagent; its Grep counts too.
        assert (first["request_count"], first["tool_call_count"], first["error_count"]) == (3, 9, 1)
        assert first["files_changed"] == 2 and first["input_tokens"] == 30 and first["ended_with_api_error"] == 0
        assert first["ts"] < first["ended_at"]
        assert (second["api_error_count"], second["ended_with_api_error"], second["compactions"]) == (1, 1, 1)

    def test_files_are_counted_by_how_they_were_touched(self, facts):
        files = {(r["path"], r["how"]): r for r in table(facts, "session_files", session_id=SESSION)}
        assert set(files) == {
            ("/work/proj/a.py", "read"),
            ("/work/proj/a.py", "edited"),
            ("/work/proj/new.py", "created"),
        }
        assert files[("/work/proj/a.py", "edited")]["tool_name"] == "Edit"
        assert files[("/work/proj/a.py", "read")]["count"] == 1

    def test_outcome_row(self, facts):
        row = one(table(facts, "session_outcomes", session_id=SESSION))
        assert row["tool"] == "claude-code"
        assert row["pr_refs"] == ["https://github.com/o/r/pull/7"]
        assert set(row["permission_modes"]) == {"auto", "bypassPermissions"} and row["last_mode"] == "normal"
        assert (row["reported_cost_usd"], row["reported_api_ms"], row["reported_tool_ms"]) == (1.25, 9000.0, 3000.0)
        assert (row["lines_added"], row["lines_removed"], row["files_changed"]) == (12, 4, 2)
        assert (row["hook_runs"], row["hook_failures"], row["compactions"]) == (2, 1, 1)
        assert (row["todos_total"], row["todos_completed"]) == (2, 1)
        assert (row["workflow_runs"], row["workflows_failed"]) == (2, 1)
        assert row["task_complete"] is None  # Claude Code does not report one

    def test_digests_hold_the_readable_summaries(self, facts):
        kinds = {(r["kind"], r["seq"]): r for r in table(facts, "session_digests", session_id=SESSION)}
        assert kinds[("compact_summary", 1)]["text"] == "Summary of work so far"
        assert "[completed] Explain the bug in detail" in kinds[("todo_list", 0)]["text"]
        workflows = [r for (kind, _), r in kinds.items() if kind == "workflow_summary"]
        assert {r["title"] for r in workflows} == {"review wf_1", "review wf_2"}


# ─── The text gate ────────────────────────────────────────────────


class TestTextGate:
    def test_text_off_writes_no_digest_and_no_prose_in_year_long_tables(self, tmp_path):
        claude_session(tmp_path)
        copilot_session(tmp_path)
        facts = Facts(keeps_text=False)
        ingester(facts, tmp_path).poll()
        assert written(facts, "session_digests") == 0
        for name in SESSION_HISTORY_TABLES:
            dumped = json.dumps(facts.writer.written(name))
            for prose in PROSE:
                assert prose not in dumped, (name, prose)
        # The subagent's label is a name, kept like one.
        assert one(table(facts, "agents", agent_id="sub1"))["description"] == "Find the parser"

    def test_old_digests_are_not_written(self, tmp_path):
        facts = Facts()
        from aictl.records import CallFacts, SessionDigestRow

        facts.write(CallFacts(digests=[SessionDigestRow(SESSION, "task_summary", 1, NOW - 30 * 86400, text="old")]))
        assert written(facts, "session_digests") == 0


# ─── Copilot CLI and desktop ──────────────────────────────────────


def copilot_session(root: Path) -> None:
    write_lines(
        copilot_events(root),
        [
            ev("session.start", 900, {"context": {"cwd": "C:\\work\\cli"}}),
            ev("user.message", 800, {"content": "please refactor", "interactionId": "i1", "turnId": "0"}),
            usage_record(790, api="a1", reasoningEffort="xhigh"),
            ev(
                "tool.execution_start",
                780,
                {"toolCallId": "v1", "toolName": "view", "arguments": {"path": "C:\\work\\cli\\a.py"}, "turnId": "0"},
            ),
            ev("tool.execution_complete", 779, {"toolCallId": "v1", "success": True}),
            ev(
                "tool.execution_start",
                778,
                {
                    "toolCallId": "m1",
                    "toolName": "get_issue",
                    "mcpServerName": "git__hub",
                    "mcpToolName": "get_issue",
                    "arguments": {"query": "how to parse"},
                },
            ),
            ev("tool.execution_complete", 777, {"toolCallId": "m1", "success": True}),
            ev(
                "tool.execution_start",
                776,
                {
                    "toolCallId": "t1",
                    "toolName": "task",
                    "arguments": {
                        "agent_type": "explore",
                        "description": "Find the parser",
                        "name": "finder",
                        "prompt": "please refactor",
                    },
                },
            ),
            ev(
                "subagent.started",
                775,
                {
                    "toolCallId": "t1",
                    "agentName": "explore",
                    "agentDescription": "Explores code",
                    "model": "claude-haiku-5-5",
                },
                agentId="ag1",
            ),
            ev("subagent.completed", 770, {"agentName": "explore"}, agentId="ag1"),
            ev("hook.end", 765, {"hookInvocationId": "h1", "hookType": "preToolUse", "success": True}),
            ev("hook.end", 764, {"hookInvocationId": "h2", "hookType": "postToolUse", "success": False}),
            ev("session.mode_changed", 760, {"previousMode": "interactive", "newMode": "autopilot"}),
            ev("user.message", 700, {"content": "second", "interactionId": "i2", "turnId": "0"}),
            usage_record(690, api="a2", inp=50, out=5, read=10, write=0),
            ev(
                "session.compaction_complete",
                680,
                {
                    "success": True,
                    "summaryContent": "Summary of work",
                    "checkpointNumber": 1,
                    "preCompactionTokens": 900,
                    "postCompactionTokens": 100,
                },
            ),
            ev("session.task_complete", 670, {"summary": "Summary of work", "success": True}),
            ev(
                "session.shutdown",
                660,
                {
                    "totalPremiumRequests": 3,
                    "totalApiDurationMs": 4500,
                    "codeChanges": {"linesAdded": 8, "linesRemoved": 2, "filesModified": ["C:\\work\\cli\\a.py"]},
                },
            ),
        ],
    )
    home = root / "copilot"
    conn = sqlite3.connect(home / "session-store.db")
    conn.executescript("""
        CREATE TABLE sessions (id TEXT PRIMARY KEY, cwd TEXT, branch TEXT, summary TEXT);
        CREATE TABLE checkpoints (id INTEGER PRIMARY KEY, session_id TEXT, checkpoint_number INTEGER, title TEXT,
            overview TEXT, history TEXT, work_done TEXT, technical_details TEXT, important_files TEXT, next_steps TEXT,
            created_at TEXT);
        CREATE TABLE session_files (id INTEGER PRIMARY KEY, session_id TEXT, file_path TEXT, tool_name TEXT,
            turn_index INTEGER, first_seen_at TEXT);
        CREATE TABLE session_refs (id INTEGER PRIMARY KEY, session_id TEXT, ref_type TEXT, ref_value TEXT,
            turn_index INTEGER, created_at TEXT);
    """)
    conn.execute("INSERT INTO sessions VALUES (?, 'C:\\work\\cli', 'main', '')", (COPILOT_SID,))
    conn.execute(
        "INSERT INTO checkpoints (session_id, checkpoint_number, title, overview, work_done, next_steps, created_at)"
        " VALUES (?, 1, 'Parser fix', 'Summary of work', 'done', 'more', ?)",
        (COPILOT_SID, iso(650)),
    )
    conn.executemany(
        "INSERT INTO session_files (session_id, file_path, tool_name, turn_index, first_seen_at) VALUES (?,?,?,?,?)",
        [
            (COPILOT_SID, "C:\\work\\cli\\a.py", "edit", 0, iso(700)),
            (COPILOT_SID, "C:\\work\\cli\\a.py", "edit", 1, iso(690)),
            (COPILOT_SID, "C:\\work\\cli\\new.py", "create", 1, iso(680)),
        ],
    )
    conn.executemany(
        "INSERT INTO session_refs (session_id, ref_type, ref_value, turn_index, created_at) VALUES (?,?,?,?,?)",
        [(COPILOT_SID, "commit", "abc1234", 0, iso(660)), (COPILOT_SID, "pr", "12", 1, iso(655))],
    )
    conn.commit()
    conn.close()
    todos = sqlite3.connect(copilot_events(root).parent / "session.db")
    todos.execute(
        "CREATE TABLE todos (id TEXT, title TEXT, description TEXT, status TEXT, created_at TEXT, updated_at TEXT)"
    )
    todos.executemany(
        "INSERT INTO todos VALUES (?,?,?,?,?,?)",
        [("1", "Explain the bug in detail", "", "done", "1", "1"), ("2", "tests", "", "pending", "2", "2")],
    )
    todos.commit()
    todos.close()


class TestCopilot:
    @pytest.fixture
    def facts(self, tmp_path):
        copilot_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        return facts

    def test_tool_calls_requests_and_agents(self, facts):
        calls = {r["source_event_id"]: r for r in table(facts, "tool_invocations")}
        assert (calls["v1"]["target_kind"], calls["v1"]["target"], calls["v1"]["turn_index"]) == (
            "file",
            "C:\\work\\cli\\a.py",
            1,
        )
        mcp = calls["m1"]
        assert (mcp["mcp_server"], mcp["mcp_tool"], mcp["target_kind"], mcp["target"]) == (
            "git__hub",
            "get_issue",
            "other",
            "get_issue",
        )
        assert (calls["t1"]["target_kind"], calls["t1"]["target"]) == ("agent", "explore")
        by_turn = {r["turn_index"]: r for r in table(facts, "requests")}
        assert by_turn[1]["effort"] == "xhigh" and 2 in by_turn
        agent = one(table(facts, "agents", agent_id="ag1"))
        assert (agent["description"], agent["parent_tool_use_id"], agent["status"]) == (
            "Find the parser",
            "t1",
            "completed",
        )
        assert agent["resolved_model"] == "claude-haiku-5-5"

    def test_outcome_files_and_digests(self, facts):
        row = one(table(facts, "session_outcomes", session_id=COPILOT_SID))
        assert (row["modes"], row["last_mode"]) == (["autopilot"], "autopilot")
        assert (row["hook_runs"], row["hook_failures"], row["compactions"], row["task_complete"]) == (2, 1, 1, 1)
        assert (row["lines_added"], row["lines_removed"], row["files_changed"]) == (8, 2, 1)
        assert (row["premium_requests"], row["reported_api_ms"]) == (3.0, 4500.0)
        assert (row["pr_refs"], row["commit_refs"]) == (["12"], ["abc1234"])
        assert (row["todos_total"], row["todos_completed"]) == (2, 1)
        files = {(r["path"], r["how"]): r for r in table(facts, "session_files", session_id=COPILOT_SID)}
        assert files[("C:\\work\\cli\\a.py", "read")]["tool_name"] == "view"
        assert files[("C:\\work\\cli\\a.py", "edited")]["count"] == 2
        assert files[("C:\\work\\cli\\new.py", "created")]["tool_name"] == "create"
        digests = {(r["kind"], r["seq"]): r for r in table(facts, "session_digests", session_id=COPILOT_SID)}
        assert set(digests) == {("checkpoint", 1), ("compact_summary", 1), ("task_summary", 1), ("todo_list", 0)}
        assert digests[("checkpoint", 1)]["title"] == "Parser fix"
        assert "## Overview\nSummary of work" in digests[("checkpoint", 1)]["text"]

    def test_new_store_rows_are_read_on_the_next_poll_and_only_they(self, tmp_path):
        copilot_session(tmp_path)
        facts = Facts()
        reader = ingester(facts, tmp_path)
        reader.poll()
        before = {name: written(facts, name) for name in NEW_TABLES}
        conn = sqlite3.connect(tmp_path / "copilot" / "session-store.db")
        conn.execute(
            "INSERT INTO session_refs (session_id, ref_type, ref_value, created_at) VALUES (?, 'commit', 'def5678', ?)",
            (COPILOT_SID, iso(10)),
        )
        conn.commit()
        conn.close()
        reader.poll()
        assert one(table(facts, "session_outcomes"))["commit_refs"] == ["abc1234", "def5678"]
        assert written(facts, "session_outcomes") == before["session_outcomes"] + 1
        assert written(facts, "session_digests") == before["session_digests"]
        assert written(facts, "session_files") == before["session_files"]


# ─── VS Code ──────────────────────────────────────────────────────


class TestVSCode:
    def test_debug_log_calls_and_chat_file_outcomes(self, tmp_path):
        workspace_json(tmp_path)
        write_lines(
            debug_dir(tmp_path) / "main.jsonl",
            [
                v_line("user_message", 500, "u1", content="please refactor"),
                v_line("llm_request", 490, "l1", model=MODEL, inputTokens=100, outputTokens=20, cachedTokens=60),
                v_line(
                    "tool_call",
                    480,
                    "t1",
                    name="run_in_terminal",
                    args=json.dumps({"command": "npm run build --secret message"}),
                ),
                v_line("tool_call", 470, "t2", name="read_file", args=json.dumps({"filePath": "/work/vs/a.py"})),
                v_line(
                    "tool_call",
                    460,
                    "t3",
                    name="create_file",
                    args=json.dumps({"filePath": "/work/vs/n.py", "content": "x"}),
                ),
            ],
        )
        request = {
            "requestId": "r1",
            "timestamp": int((NOW - 500) * 1000),
            "message": {"text": "please refactor"},
            "modeInfo": {"kind": "agent", "modeId": "agent", "modeName": "Agent", "permissionLevel": "autoApprove"},
            "response": [
                {
                    "kind": "toolInvocationSerialized",
                    "toolCallId": "c1",
                    "toolId": "manage_todo_list",
                    "toolSpecificData": {
                        "kind": "todoList",
                        "todoList": [{"id": "1", "title": "Explain the bug in detail", "status": "completed"}],
                    },
                },
                {"kind": "toolInvocationSerialized", "toolCallId": "c2", "toolId": "task_complete"},
            ],
        }
        write_lines(chat_file(tmp_path, VSCODE_SID), [{"kind": 0, "v": {"requests": [request]}}])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        calls = {r["source_event_id"]: r for r in table(facts, "tool_invocations")}
        assert (calls["t1"]["target_kind"], calls["t1"]["target"], calls["t1"]["turn_index"]) == (
            "command", "npm run build --secret <redacted>", 1)
        assert calls["t1"]["command_name"] == "npm"
        assert one(table(facts, "requests"))["turn_index"] == 1
        files = {(r["path"], r["how"]) for r in table(facts, "session_files", session_id=VSCODE_SID)}
        assert files == {("/work/vs/a.py", "read"), ("/work/vs/n.py", "created")}
        row = one(table(facts, "session_outcomes", session_id=VSCODE_SID))
        assert (row["modes"], row["permission_modes"], row["last_mode"]) == (["agent"], ["autoApprove"], "agent")
        assert (row["todos_total"], row["todos_completed"], row["task_complete"]) == (1, 1, 1)

    def test_chat_only_session_takes_edits_from_edited_file_events(self, tmp_path):
        workspace_json(tmp_path)
        request = {
            "requestId": "r1",
            "timestamp": int((NOW - 500) * 1000),
            "message": {"text": "x"},
            "editedFileEvents": [
                {"uri": {"$mid": 1, "fsPath": "c:\\work\\vs\\a.py", "scheme": "file"}, "eventKind": 1}
            ],
            "response": [
                {
                    "kind": "toolInvocationSerialized",
                    "toolCallId": "c1",
                    "toolId": "run_in_terminal",
                    "toolSpecificData": {"kind": "terminal", "commandLine": {"original": "pytest -k secret"}},
                }
            ],
        }
        write_lines(chat_file(tmp_path, VSCODE_SID), [{"kind": 0, "v": {"requests": [request]}}])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        assert one(table(facts, "session_files"))["path"] == "c:\\work\\vs\\a.py"
        call = one(table(facts, "tool_invocations"))
        assert (call["target_kind"], call["target"], call["command_name"], call["turn_index"]) == (
            "command", "pytest -k secret", "pytest", 1)


# ─── Restarts ─────────────────────────────────────────────────────


class TestRestart:
    def test_a_second_start_with_unchanged_files_writes_nothing_new(self, tmp_path):
        claude_session(tmp_path)
        copilot_session(tmp_path)
        workspace_json(tmp_path)
        write_lines(
            debug_dir(tmp_path) / "main.jsonl",
            [
                v_line("user_message", 500, "u1", content="x"),
                v_line("tool_call", 470, "t2", name="read_file", args=json.dumps({"filePath": "/work/vs/a.py"})),
            ],
        )
        state = StateFile(tmp_path / "state" / "transcript_usage.json")
        first = Facts()
        ingester(first, tmp_path, checkpoint=state).poll()
        assert all(written(first, name) for name in NEW_TABLES)
        second = Facts()
        ingester(second, tmp_path, checkpoint=state).poll()
        assert {name: written(second, name) for name in NEW_TABLES} == dict.fromkeys(NEW_TABLES, 0)
        assert written(second, "tool_invocations") == 0

    def test_a_new_line_after_a_restart_writes_the_whole_turn_and_outcome(self, tmp_path):
        claude_session(tmp_path)
        state = StateFile(tmp_path / "state" / "transcript_usage.json")
        ingester(Facts(), tmp_path, checkpoint=state).poll()
        write_lines(
            claude_path(tmp_path),
            [
                {
                    "type": "pr-link",
                    "sessionId": SESSION,
                    "prUrl": "https://github.com/o/r/pull/8",
                    "timestamp": iso(100),
                },
                c_assistant("m9", "r9", 99),
            ],
        )
        second = Facts()
        ingester(second, tmp_path, checkpoint=state).poll()
        row = one(table(second, "session_outcomes"))
        # The parts read before the restart are kept: workflows and hooks are still there.
        assert row["pr_refs"] == ["https://github.com/o/r/pull/7", "https://github.com/o/r/pull/8"]
        assert (row["workflow_runs"], row["hook_runs"]) == (2, 2)
        turn = one(table(second, "session_turns"))
        assert (turn["turn_index"], turn["request_count"]) == (2, 1)


class TestOutcomeBook:
    def test_a_part_read_again_replaces_itself_and_parts_combine(self):
        book = OutcomeBook()
        book.part("s", "t:", 10.0, tool="claude-code")["hook_runs"] = 2
        book.part("s", "t:a", 11.0)["hook_runs"] = 1
        book.replace("s", "refs", {"pr_refs": ["1"]}, 12.0)
        assert book.changed_rows()[0]["hook_runs"] == 3
        assert book.changed_rows() == []
        book.reset("s", "t:")
        book.part("s", "t:", 10.0)["hook_runs"] = 2
        assert book.changed_rows() == []  # the same values again: nothing to write
        saved = json.loads(json.dumps(book.dump(0.0)))
        again = OutcomeBook()
        again.load(saved)
        again.part("s", "t:a", 13.0)["hook_runs"] = 4
        assert again.changed_rows()[0]["hook_runs"] == 6


# ─── Thinking ─────────────────────────────────────────────────────


class TestThinking:
    def test_claude_counts_every_call_and_stores_visible_text_joined_to_the_request(self, tmp_path):
        claude_session(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        calls = {r["dedup_key"]: r for r in table(facts, "requests") if not r["is_error"] and not r["agent_id"]}
        first = next(r for r in calls.values() if r["thinking_blocks"])
        assert (first["thinking_chars"], first["thinking_blocks"], first["thinking_redacted"]) == (len(THOUGHT), 1, 0)
        assert first["thinking_ms"] == 1200.0  # the longest duration a line of the call reported
        second = next(r for r in calls.values() if r["thinking_redacted"])
        assert (second["thinking_chars"], second["thinking_blocks"], second["thinking_redacted"]) == (0, 0, 1)
        row = one(table(facts, "session_thinking"))
        assert row["request_key"] == first["dedup_key"]
        assert (row["text"], row["chars"], row["block_index"], row["turn_index"]) == (THOUGHT, len(THOUGHT), 0, 1)
        turn = one(table(facts, "session_turns", turn_index=1))
        assert (turn["thinking_chars"], turn["thinking_blocks"], turn["thinking_redacted"], turn["thinking_ms"]) == (
            len(THOUGHT),
            1,
            1,
            1200.0,
        )
        everything = json.dumps(facts.writer.operations)
        assert "SIG-SECRET" not in everything and "ENC-SECRET" not in everything

    def test_text_off_keeps_the_counts_and_writes_no_text(self, tmp_path):
        claude_session(tmp_path)
        copilot_thinking(tmp_path)
        facts = Facts(keeps_text=False)
        ingester(facts, tmp_path).poll()
        assert written(facts, "session_thinking") == 0
        assert any(r["thinking_chars"] == len(THOUGHT) for r in table(facts, "requests"))
        assert any(r["thinking_tokens"] == 50 for r in table(facts, "requests"))

    def test_copilot_reasoning_text_is_stored_and_encrypted_reasoning_only_counted(self, tmp_path):
        copilot_thinking(tmp_path)
        facts = Facts()
        ingester(facts, tmp_path).poll()
        request = one([r for r in table(facts, "requests") if r["thinking_tokens"] == 50])
        assert (request["thinking_chars"], request["thinking_blocks"], request["thinking_redacted"]) == (21, 1, 2)
        row = one(table(facts, "session_thinking"))
        assert (row["request_key"], row["text"], row["turn_index"]) == (
            request["dedup_key"],
            "Reasoning in the open",
            1,
        )
        assert "OPAQUE-SECRET" not in json.dumps(facts.writer.operations)

    def test_vscode_thinking_parts_count_on_the_turn_request(self, tmp_path):
        workspace_json(tmp_path)
        request = {
            "requestId": "r1",
            "timestamp": int((NOW - 500) * 1000),
            "message": {"text": "x"},
            "modelId": f"copilot/{MODEL}",
            "response": [
                {"kind": "thinking", "value": "Reasoning in the open", "id": "th1"},
                {"kind": "thinking", "value": "", "id": ""},
            ],
            "result": {"metadata": {"promptTokens": 10, "outputTokens": 5}},
        }
        write_lines(chat_file(tmp_path, VSCODE_SID), [{"kind": 0, "v": {"requests": [request]}}])
        facts = Facts()
        ingester(facts, tmp_path).poll()
        turn = one(table(facts, "requests"))
        assert (turn["thinking_chars"], turn["thinking_blocks"], turn["thinking_redacted"]) == (21, 1, 0)
        row = one(table(facts, "session_thinking"))
        assert (row["request_key"], row["turn_index"]) == (turn["dedup_key"], 1)


def copilot_thinking(root: Path) -> None:
    write_lines(
        copilot_events(root),
        [
            ev("session.start", 900, {"context": {"cwd": "/work/cli"}}),
            ev("user.message", 800, {"content": "x", "interactionId": "i1"}),
            usage_record(790, api="a1", reasoningTokens=50),
            ev(
                "assistant.message",
                789,
                {
                    "messageId": "msg1",
                    "apiCallId": "a1",
                    "model": MODEL,
                    "content": "",
                    "reasoningText": "Reasoning in the open",
                    "reasoningOpaque": "OPAQUE-SECRET",
                },
            ),
            ev(
                "assistant.message",
                788,
                {
                    "messageId": "msg2",
                    "apiCallId": "a1",
                    "model": MODEL,
                    "content": "",
                    "reasoningBlocks": {
                        "provider": "x",
                        "blocks": [{"type": "reasoning", "id": "b", "encrypted_content": "OPAQUE-SECRET"}],
                    },
                },
            ),
        ],
    )
