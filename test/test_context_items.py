"""What fills a session's context: Claude attachments, Copilot system prompt sections, v36, the backfill, the API."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import pytest

# One clock: iso() counts back from test_board_facts.NOW, so the expected times must too.
from test_board_facts import (
    NOW,
    c_assistant,
    claude_path,
    copilot_events,
    ev,
    iso,
    make_ingester,
    usage_record,
    write_lines,
)

from aictl.dashboard import board_api
from aictl.ingesters import context_items, context_items_backfill
from aictl.ingesters.context_items import Item, claude_attachment, copilot_system_prompt
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.project_stores import PROJECT_TABLES, ProjectStores, store_key
from aictl.storage import CallFacts, ContextItemRow, HistoryDB

SESSION = "11111111-1111-4111-8111-111111111111"
COPILOT_SID = "22222222-2222-4222-8222-222222222222"


@pytest.fixture
def db(tmp_path):
    store = HistoryDB(tmp_path / "history.db", flush_interval=0)
    yield store
    store.close()


def attachment(ago: float, att: dict, **extra) -> dict:
    return {
        "type": "attachment",
        "timestamp": iso(ago),
        "sessionId": SESSION,
        "cwd": "/work/proj",
        "attachment": att,
        **extra,
    }


def compact(ago: float) -> dict:
    return {
        "type": "system",
        "subtype": "compact_boundary",
        "uuid": f"c-{ago}",
        "timestamp": iso(ago),
        "sessionId": SESSION,
        "compactMetadata": {"trigger": "auto", "preTokens": 9000, "postTokens": 1000},
    }


def instructions(user_chars: int, project_chars: int) -> dict:
    return {
        "type": "instructions",
        "files": [
            {"path": "/home/u/.claude/CLAUDE.md", "type": "User", "content": "u" * user_chars},
            {"path": "/work/proj/AGENTS.md", "type": "Project", "content": "p" * project_chars},
        ],
    }


def mcp(names: list[str], sizes: list[int], removed: tuple[str, ...] = ()) -> dict:
    return {
        "type": "mcp_instructions_delta",
        "addedNames": names,
        "addedBlocks": ["x" * n for n in sizes],
        "removedNames": list(removed),
    }


def tools(added: list[str], removed: tuple[str, ...] = ()) -> dict:
    return {
        "type": "deferred_tools_delta",
        "addedNames": added,
        "addedLines": added,
        "removedNames": list(removed),
        "wireHiddenNames": [],
        "readdedNames": [],
    }


LISTING = (
    "- build-plan: Turn a plan into a page.\n"
    "  It also estimates.\n"
    "- backlog (backlog-grinder): Fully autonomous.\n"
    "- data:analyze: Answer data questions.\n"
    "- finance:audit-support\n"
)
SKILLS = {
    "type": "skill_listing",
    "content": LISTING,
    "skillCount": 4,
    "isInitial": True,
    "names": ["build-plan", "backlog", "data:analyze", "finance:audit-support"],
    "digests": [],
}


def items_of(db, sid: str) -> dict:
    return {
        (kind, name): (chars, tokens, removed)
        for kind, name, chars, tokens, removed in db._conn().execute(
            "SELECT kind, name, chars, tokens, removed FROM session_context_items WHERE session_id = ?", (sid,)
        )
    }


# ── Claude Code attachments ───────────────────────────────────────────


class TestClaudeAttachments:
    def test_instructions_and_nested_memory_are_memory_files_with_their_sizes(self):
        assert claude_attachment(instructions(40, 8)) == [
            Item("memory_file", "/home/u/.claude/CLAUDE.md", 40, "/home/u/.claude/CLAUDE.md"),
            Item("memory_file", "/work/proj/AGENTS.md", 8, "/work/proj/AGENTS.md"),
        ]
        nested = {
            "type": "nested_memory",
            "path": "/work/proj/sub/CLAUDE.md",
            "content": {"path": "/work/proj/sub/CLAUDE.md", "type": "Project", "content": "n" * 12},
        }
        assert claude_attachment(nested) == [
            Item("memory_file", "/work/proj/sub/CLAUDE.md", 12, "/work/proj/sub/CLAUDE.md")
        ]

    def test_skill_listing_is_one_item_per_skill_names_with_colons_and_aliases(self):
        out = claude_attachment(SKILLS)
        assert out[0] == Item("reset", "skills")
        lines = LISTING.splitlines(keepends=True)
        assert out[1:] == [
            Item("skills", "build-plan", len(lines[0]) + len(lines[1])),
            Item("skills", "backlog", len(lines[2])),
            Item("skills", "data:analyze", len(lines[3])),
            Item("skills", "finance:audit-support", len(lines[4])),
        ]
        # A delta (not initial) adds without a reset.
        delta = {**SKILLS, "isInitial": False, "content": lines[2], "names": ["backlog"]}
        assert claude_attachment(delta) == [Item("skills", "backlog", len(lines[2]))]

    def test_deltas_add_and_remove_by_name(self):
        assert claude_attachment(mcp(["a", "b"], [10, 20], removed=("c",))) == [
            Item("mcp_instructions", "a", 10),
            Item("mcp_instructions", "b", 20),
            Item("mcp_instructions", "c", removed=True),
        ]
        agents = {
            "type": "agent_listing_delta",
            "addedTypes": ["Explore"],
            "addedLines": ["- Explore: x"],
            "removedTypes": ["Old"],
            "isInitial": True,
        }
        assert claude_attachment(agents) == [
            Item("reset", "custom_agents"),
            Item("custom_agents", "Explore", 13),
            Item("custom_agents", "Old", removed=True),
        ]
        hidden = {**tools(["mcp__s__a"], removed=("mcp__s__b",)), "wireHiddenNames": ["mcp__s__c"]}
        assert claude_attachment(hidden) == [
            Item("tools_listed", "mcp__s__a", 10),
            Item("tools_listed", "mcp__s__b", removed=True),
            Item("tools_listed", "mcp__s__c", removed=True),
        ]
        assert claude_attachment({"type": "deferred_tools_record", "entries": []}) == []
        assert claude_attachment(None) == []


def _claude_session(tmp_path) -> None:
    write_lines(
        claude_path(tmp_path),
        [
            attachment(900, instructions(400, 800)),
            attachment(899, mcp(["alpha", "beta"], [400, 80])),
            attachment(898, tools(["mcp__alpha__x", "mcp__alpha__y", "Read"])),
            attachment(897, SKILLS),
            c_assistant("m1", "r1", 880, inp=100, read=1000, write=200),
            attachment(870, tools([], removed=("Read",))),
            compact(600),
            # Re-sent after the compaction: the project file grew, beta is gone without a removal.
            attachment(599, instructions(400, 1200)),
            attachment(598, mcp(["alpha"], [400])),
            attachment(597, tools(["mcp__alpha__x", "mcp__alpha__y"])),
            c_assistant("m2", "r2", 500, inp=50, read=3000, write=100),
        ],
    )


class TestClaudeIngest:
    def test_a_resend_after_compaction_keeps_the_latest_and_drops_what_was_not_sent(self, db, tmp_path):
        _claude_session(tmp_path)
        make_ingester(db, tmp_path).poll()
        rows = items_of(db, SESSION)
        assert rows[("memory_file", "/work/proj/AGENTS.md")] == (1200, 300, 0)
        assert rows[("tools_listed", "Read")] == (0, 0, 1)
        assert ("reset", "*") in rows
        # Nothing of the content is kept.
        assert (
            not db._conn()
            .execute("SELECT 1 FROM session_context_items WHERE name LIKE '%uuu%' OR path LIKE '%ppp%'")
            .fetchall()
        )

        b = board_api._agent_context(db._conn(), SESSION, SESSION, True)["breakdown"]
        assert b["total"] == 3150 and b["limit"] is None
        parts = {p["key"]: p for p in b["parts"]}
        # Skills were not re-sent. The only call after the compaction is the fixed part: no conversation yet.
        assert set(parts) == {"memory_files", "mcp_instructions", "tools_listed", "conversation"}
        assert b["fixed"] == 3150 and parts["conversation"]["tokens"] == 0
        assert parts["memory_files"]["tokens"] == 100 + 300 and parts["memory_files"]["estimated"] is True
        assert [i["name"] for i in parts["memory_files"]["items"]] == ["AGENTS.md", "CLAUDE.md"]
        assert [i["name"] for i in parts["mcp_instructions"]["items"]] == ["alpha"]
        assert parts["tools_listed"]["items"] == [
            {"name": "alpha (MCP): 2 tools", "path": None, "tokens": 8, "estimated": True}
        ]
        assert parts["tools_listed"]["label"] == "Deferred tools"
        assert [p["tokens"] for p in b["parts"]] == sorted((p["tokens"] for p in b["parts"]), reverse=True)
        assert b["rest"] == {
            "key": "rest",
            "label": "System prompt and tool definitions (not itemized)",
            "tokens": 3150 - 400 - 100 - 8,
            "clamped": False,
        }
        assert b["heaviest"] == [] and "reported" not in b

    def test_before_the_compaction_the_older_items_count(self, db, tmp_path):
        _claude_session(tmp_path)
        make_ingester(db, tmp_path).poll()
        rows = board_api._context_item_rows(db._conn(), SESSION, "", True, NOW - 880)
        assert ("skills", "backlog", "", rows[[r[1] for r in rows].index("backlog")][3]) in rows
        assert ("mcp_instructions", "beta", "", 20) in rows

    def test_a_subagent_has_its_own_rows_or_no_breakdown(self, db, tmp_path):
        side = {"isSidechain": True, "agentId": "agent-1"}
        write_lines(
            claude_path(tmp_path),
            [
                attachment(300, instructions(40, 40), **side),
                c_assistant("m1", "r1", 290, **side),
                c_assistant("m2", "r2", 280),
            ],
        )
        make_ingester(db, tmp_path).poll()
        conn = db._conn()
        sub = board_api._agent_context(conn, SESSION, "agent-1", False)
        assert [p["key"] for p in sub["breakdown"]["parts"]] == ["memory_files", "conversation"]
        # The main agent has no attachments of its own: only the measured parts.
        main = board_api._agent_context(conn, SESSION, SESSION, True)["breakdown"]
        assert [p["key"] for p in main["parts"]] == ["conversation"]


# ── Copilot CLI system prompt ─────────────────────────────────────────


def _lines(prefix: str, n: int) -> list[str]:
    return [f"{prefix} rule number {i}: always do the thing the way it is written here" for i in range(n)]


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    (repo / ".github" / "agents").mkdir(parents=True)
    (repo / ".github" / "copilot-instructions.md").write_text("# Title\n" + "\n".join(_lines("repo", 12)) + "\n")
    (repo / ".github" / "agents" / "intake.agent.md").write_text(
        "---\nname: intake\n---\n" + "\n".join(_lines("intake", 10)) + "\n"
    )
    return repo


def _prompt() -> str:
    skills = "".join(
        f"<skill>\n  <name>{n}</name>\n  <description>{n} does things</description>\n</skill>\n" for n in ("one", "two")
    )
    return (
        "You are the GitHub Copilot CLI.\n"
        "<tools>\n" + "t" * 400 + "\n</tools>\n"
        "<available_skills>\n" + skills + "</available_skills>\n"
        "<custom_instruction>\n" + "\n".join(_lines("repo", 12)) + "\n</custom_instruction>\n"
        "<custom_instruction>\nUser level rules that are in no file of the repository.\n</custom_instruction>\n"
        "<agent_instructions>\n" + "\n".join(_lines("intake", 10)) + "\n</agent_instructions>\n"
    )


class TestCopilotSections:
    def test_the_prompt_splits_into_files_skills_agents_and_other_sections(self, tmp_path):
        repo = _repo(tmp_path)
        content = _prompt()
        out = copilot_system_prompt(content, str(repo))
        assert out[0] == Item("reset", "*")
        by = {(i.kind, i.name): i for i in out[1:]}
        instr = str(repo / ".github" / "copilot-instructions.md")
        agent = str(repo / ".github" / "agents" / "intake.agent.md")
        assert by[("instruction_file", instr)].path == instr
        assert by[("custom_agents", agent)].path == agent
        assert ("instruction_file", "custom instruction 1") in by  # the section that matched no file
        assert {n for k, n in by if k == "skills"} == {"one", "two"}
        assert by[("system_prompt_other", "tools")].chars == len("<tools>\n" + "t" * 400 + "\n</tools>")
        assert ("system_prompt_other", "untagged text") in by
        # Every character is counted once.
        assert sum(i.chars for i in out) == len(content)

    def _events(self, tmp_path, *, shutdown: bool) -> None:
        repo = _repo(tmp_path)
        lines = [
            ev("session.start", 500, {"context": {"cwd": str(repo), "gitRoot": str(repo)}}),
            ev("system.message", 480, {"role": "system", "content": _prompt()}),
            usage_record(400, inp=5000, read=4000, write=900, api="c1", maxPromptTokens=200000, toolTokenCount=1500),
        ]
        if shutdown:
            lines.append(
                ev(
                    "session.shutdown",
                    300,
                    {
                        "currentTokens": 6000,
                        "systemTokens": 1200,
                        "conversationTokens": 3300,
                        "toolDefinitionsTokens": 1500,
                    },
                )
            )
        write_lines(copilot_events(tmp_path, COPILOT_SID), lines)

    def test_without_a_split_the_system_prompt_is_estimated_and_tools_measured(self, db, tmp_path):
        self._events(tmp_path, shutdown=False)
        make_ingester(db, tmp_path).poll()
        b = board_api._agent_context(db._conn(), COPILOT_SID, COPILOT_SID, True)["breakdown"]
        assert b["total"] == 5000 and b["limit"] == 200000
        parts = {p["key"]: p for p in b["parts"]}
        assert set(parts) == {"system_prompt", "tool_definitions"}
        assert parts["tool_definitions"] == {
            "key": "tool_definitions",
            "label": "Tool definitions",
            "tokens": 1500,
            "estimated": False,
            "items": [],
            "count": 0,
        }
        sp = parts["system_prompt"]
        assert sp["estimated"] is True and sp["tokens"] == sum(i["tokens"] for i in sp["items"])
        names = [i["name"] for i in sp["items"]]
        assert "copilot-instructions.md" in names and "intake.agent.md" in names and "Skills: 2 skills" in names
        assert b["rest"]["label"] == "Conversation (not itemized)"
        assert b["rest"]["tokens"] == 5000 - 1500 - sp["tokens"]

    def test_with_the_shutdown_split_the_three_parts_are_measured_and_rest_never_negative(self, db, tmp_path):
        self._events(tmp_path, shutdown=True)
        make_ingester(db, tmp_path).poll()
        b = board_api._agent_context(db._conn(), COPILOT_SID, COPILOT_SID, True)["breakdown"]
        assert [(p["key"], p["tokens"], p["estimated"]) for p in b["parts"]] == [
            ("conversation", 3300, False),
            ("tool_definitions", 1500, False),
            ("system_prompt", 1200, False),
        ]
        assert b["parts"][2]["items"]  # the sections, as estimates
        # 3300 + 1500 + 1200 = 6000 is more than the last call's 5000: rest is 0 and says it was clamped.
        assert b["rest"] == {"key": "rest", "label": "Not itemized", "tokens": 0, "clamped": True}

    def test_a_new_system_prompt_replaces_the_old_sections(self, db, tmp_path):
        self._events(tmp_path, shutdown=False)
        write_lines(
            copilot_events(tmp_path, COPILOT_SID),
            [
                ev("system.message", 350, {"role": "system", "content": "<tools>\nshort\n</tools>"}),
                usage_record(340, inp=10, read=10, write=10, api="c2", toolTokenCount=900),
            ],
        )
        make_ingester(db, tmp_path).poll()
        b = board_api._agent_context(db._conn(), COPILOT_SID, COPILOT_SID, True)["breakdown"]
        sp = next(p for p in b["parts"] if p["key"] == "system_prompt")
        assert [i["name"] for i in sp["items"]] == ["tools"]


# ── API arithmetic, unknowns ──────────────────────────────────────────


def _request(
    db, ts: float, size: int, out: int = 0, agent: str = "", sid: str = "s", tool: str = "claude-code"
) -> None:
    from aictl.storage import RequestRow

    db.write_call_facts(
        CallFacts(
            requests=[
                RequestRow(
                    dedup_key=f"{sid}-{agent}-{ts}",
                    ts=ts,
                    session_id=sid,
                    agent_id=agent,
                    tool=tool,
                    input_tokens=size,
                    output_tokens=out,
                )
            ]
        )
    )


def _breakdown(db, sid="s", tool="claude-code", at_ts=1e9, total=None, **kw):
    conn = db._conn()
    if total is None:
        total = conn.execute(
            "SELECT input_tokens FROM requests WHERE session_id = ? AND agent_id = '' ORDER BY ts DESC LIMIT 1", (sid,)
        ).fetchone()[0]
    args = {"limit": None, "tool_tokens": None, "split": None, **kw}
    return board_api._context_breakdown(conn, sid, "", True, tool=tool, at_ts=at_ts, total=total, **args)


def test_fixed_parts_are_scaled_to_fit_and_rest_is_what_they_leave(db):
    _request(db, 15.0, 600)
    db.write_call_facts(
        CallFacts(
            context_items=[
                ContextItemRow(
                    session_id="s",
                    kind="memory_file",
                    name="/a/CLAUDE.md",
                    path="/a/CLAUDE.md",
                    ts=10.0,
                    chars=4000,
                    tokens=1000,
                ),
                ContextItemRow(session_id="s", kind="skills", name="x", ts=10.0, chars=800, tokens=200),
            ]
        )
    )
    b = _breakdown(db, at_ts=20.0)
    parts = {p["key"]: p for p in b["parts"]}
    # 1200 estimated into a fixed 600: scaled by half, and nothing is left for rest.
    assert b["fixed"] == 600 and parts["memory_files"]["tokens"] == 500 and parts["skills"]["tokens"] == 100
    assert parts["memory_files"]["scaled"] == 0.5 and parts["memory_files"]["estimated"] is True
    assert b["rest"] == {
        "key": "rest",
        "label": "System prompt and tool definitions (not itemized)",
        "tokens": 0,
        "clamped": False,
    }
    assert b["limit"] is None
    # No call at or before the time: nothing is known.
    assert _breakdown(db, at_ts=5.0, total=600) is None


def test_conversation_is_measured_from_call_deltas_and_compaction_starts_a_segment(db):
    from aictl.storage import ContextEventRow, SessionPromptRow, ToolInvocationRow

    for ts, size, out in ((10.0, 1000, 50), (20.0, 1200, 30), (30.0, 5200, 40), (40.0, 5100, 10), (50.0, 5600, 0)):
        _request(db, ts, size, out)
    db.write_call_facts(
        CallFacts(
            tools=[
                ToolInvocationRow(
                    dedup_key="t1", ts=21.0, session_id="s", tool="claude-code", tool_name="Read", output_bytes=16000
                ),
                ToolInvocationRow(
                    dedup_key="t2", ts=22.0, session_id="s", tool="claude-code", tool_name="Bash", output_bytes=0
                ),
            ],
            prompts=[SessionPromptRow(dedup_key="p1", ts=45.0, session_id="s", tool="claude-code", text="x" * 1960)],
        )
    )
    b = _breakdown(db)
    conv = next(p for p in b["parts"] if p["key"] == "conversation")
    assert b["fixed"] == 1000 and conv["tokens"] == 4600 and conv["estimated"] is False
    items = {i["name"]: i["tokens"] for i in conv["items"]}
    # 10->20: the reply of call 1 (200). 20->30: Read 4000 of weight 4000+0+30. 30->40 shrank: 0. 40->50: prompt 490 + reply 10.
    assert items["Replies and tool calls"] == round(200 + 4000 * 30 / 4030 + 500 * 10 / 500)
    assert items["Tool results: Read"] == round(4000 * 4000 / 4030)
    assert items["User prompts"] == round(500 * 490 / 500)
    assert conv["estimated"] is False  # the part is measured
    assert all(i["basis"] == "call delta" and i["estimated"] is True for i in conv["items"])  # its split is by size
    assert b["heaviest"][0] == {"ts": 30.0, "tokens": 4000, "kind": "Tool results", "name": "Read"}
    assert [h["tokens"] for h in b["heaviest"]] == [4000, 500, 200]
    # A compaction at 35 starts a new segment: the call at 40 is fixed.
    db.write_call_facts(
        CallFacts(
            context_events=[
                ContextEventRow(dedup_key="c1", ts=35.0, session_id="s", tool="claude-code", kind="compaction"),
            ]
        )
    )
    b = _breakdown(db)
    assert b["fixed"] == 5100 and next(p for p in b["parts"] if p["key"] == "conversation")["tokens"] == 500
    # The last call below the fixed one: shown as 0, and said.
    _request(db, 60.0, 4000)
    b = _breakdown(db)
    assert next(p for p in b["parts"] if p["key"] == "conversation")["tokens"] == 0 and b["rest"]["clamped"] is True


def test_copilot_unknowns_stay_null(db):
    assert _breakdown(db, sid="c", tool="copilot-cli", at_ts=20.0, total=600) is None
    db.write_call_facts(
        CallFacts(
            context_items=[
                ContextItemRow(
                    session_id="c",
                    kind="system_prompt_other",
                    name="tools",
                    ts=10.0,
                    chars=400,
                    tokens=100,
                    tool="copilot-cli",
                ),
            ]
        )
    )
    b = _breakdown(db, sid="c", tool="copilot-cli", at_ts=20.0, total=600)
    assert next(p for p in b["parts"] if p["key"] == "tool_definitions")["tokens"] is None
    assert b["rest"]["tokens"] is None


def test_the_upsert_keeps_the_newest_record(db):
    def row(ts, chars, removed=0):
        return ContextItemRow(
            session_id="s", kind="skills", name="x", ts=ts, chars=chars, tokens=chars // 4, removed=removed
        )

    db.write_call_facts(CallFacts(context_items=[row(200.0, 80)]))
    db.write_call_facts(CallFacts(context_items=[row(100.0, 40)]))  # an older line read again
    assert items_of(db, "s") == {("skills", "x"): (80, 20, 0)}
    db.write_call_facts(CallFacts(context_items=[row(300.0, 0, removed=1)]))
    assert items_of(db, "s") == {("skills", "x"): (0, 0, 1)}


def test_kinds_are_the_api_values():
    assert board_api._CLAUDE_PARTS["memory_file"] == ("memory_files", "Memory files")
    assert {
        context_items.MEMORY_FILE,
        context_items.SKILLS,
        context_items.MCP_INSTRUCTIONS,
        context_items.CUSTOM_AGENTS,
        context_items.TOOLS_LISTED,
    } == set(board_api._CLAUDE_PARTS)
    from aictl.utils import BYTES_PER_TOKEN, estimate_tokens, estimate_tokens_from_size

    assert BYTES_PER_TOKEN == 4 and estimate_tokens_from_size(9) == 3 == estimate_tokens("é" * 4 + "x")
    assert estimate_tokens_from_size(0) == 0 == estimate_tokens_from_size(-5)
    assert not hasattr(context_items, "estimate_tokens") and not hasattr(context_items, "CHARS_PER_TOKEN")


# ── Schema v36, project stores, backfill ─────────────────────────────


def test_a_v35_store_gets_the_table_and_a_rerun_changes_nothing(tmp_path):
    from aictl.storage_migrations import CURRENT_VERSION, m036_session_context_items

    path = tmp_path / "old.db"
    HistoryDB(db_path=str(path), flush_interval=0).close()
    conn = sqlite3.connect(path)
    conn.execute("DROP TABLE session_context_items")
    conn.execute("DELETE FROM schema_version WHERE version > 35")
    conn.commit()
    conn.close()
    store = HistoryDB(db_path=str(path), flush_interval=0)
    try:
        conn = store._conn()
        assert conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0] == CURRENT_VERSION >= 36
        m036_session_context_items.apply(conn)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(session_context_items)")]
        assert cols == [
            "session_id",
            "agent_id",
            "kind",
            "name",
            "ts",
            "path",
            "chars",
            "tokens",
            "estimated",
            "removed",
            "tool",
        ]
    finally:
        store.close()


def test_project_stores_write_the_rows_to_the_session_store(tmp_path):
    from aictl.storage import SessionRow

    assert "session_context_items" in PROJECT_TABLES
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    stores = ProjectStores(db_path=tmp_path / "config" / "history.db", flush_interval=0)
    try:
        stores.upsert_session(
            SessionRow(session_id="s", tool="claude-code", project_path=str(repo), started_at=NOW - 200)
        )
        stores.write_call_facts(
            CallFacts(
                context_items=[
                    ContextItemRow(
                        session_id="s", kind="skills", name="x", ts=NOW - 100, chars=8, tokens=2, project_path=str(repo)
                    ),
                ]
            )
        )
        conn = sqlite3.connect(stores._file_of(store_key(str(repo))))
        try:
            assert conn.execute("SELECT session_id, kind, name FROM session_context_items").fetchall() == [
                ("s", "skills", "x")
            ]
        finally:
            conn.close()
        assert stores._conn().execute("SELECT name FROM session_context_items").fetchall() == [("x",)]
    finally:
        stores.close()


def _factory(root: Path):
    def make(target):
        return TranscriptUsageIngester(
            target,
            claude_projects=root / "claude" / "projects",
            codex_sessions=root / "codex",
            copilot_state=root / "copilot" / "session-state",
            vscode_workspaces=root / "vscode" / "workspaceStorage",
            backfill_days=36500.0,
        )

    return make


def test_the_backfill_writes_only_context_items_and_runs_once(db, tmp_path):
    old = {"type": "attachment", "timestamp": iso(90 * 86400), "sessionId": SESSION, "attachment": instructions(40, 40)}
    path = claude_path(tmp_path)
    write_lines(path, [old])
    stamp = NOW - 90 * 86400
    os.utime(path, (stamp, stamp))
    assert context_items_backfill.run(db, _factory(tmp_path)) is True
    assert set(items_of(db, SESSION)) == {
        ("memory_file", "/home/u/.claude/CLAUDE.md"),
        ("memory_file", "/work/proj/AGENTS.md"),
    }
    conn = db._conn()
    assert conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
    assert conn.execute("SELECT COUNT(*) FROM session_loaded_files").fetchone()[0] == 0
    assert db.state_value(context_items_backfill.STATE_KEY) is not None

    def never(target):
        raise AssertionError("the backfill ran twice")

    assert context_items_backfill.run(db, never) is True


# ── Claude Code /context report ───────────────────────────────────────

REPORT = """<local-command-stdout>## Context Usage

**Model:** claude-test-1  
**Tokens:** 131k / 600k (22%)

### Estimated usage by category

| Category | Tokens | Percentage |
|----------|--------|------------|
| System prompt | 10.6k | 1.8% |
| System tools | 19k | 3.2% |
| MCP tools | 1.2k | 0.2% |
| MCP tools (deferred) | 167k | 27.8% |
| Memory files | 4.9k | 0.8% |
| Skills | 10k | 1.7% |
| Messages | 59.8k | 10.0% |
| Free space | 436k | 72.7% |
| Autocompact buffer | 33k | 5.5% |

### MCP Tools

| Tool | Server | Tokens |
|------|--------|--------|
| mcp__docs__search | docs | 156 |
| mcp__docs__fetch | docs | 1.1k |

### Skills

| Skill | Source | Tokens |
|-------|--------|--------|
| build-plan | User | ~120 |
| security-review | Built-in | ~30 |
</local-command-stdout>"""


def report_line(ago: float, content: str = REPORT) -> dict:
    return {
        "type": "system",
        "subtype": "local_command",
        "content": content,
        "level": "info",
        "uuid": f"r-{ago}",
        "timestamp": iso(ago),
        "sessionId": SESSION,
        "cwd": "/work/proj",
        "isSidechain": False,
    }


def test_report_values_parse():
    from aictl.ingesters.context_items import claude_context_report, report_tokens

    assert [report_tokens(v) for v in ("10.6k", "167k", "~120", "1.2M", "436", "n/a")] == [
        10600,
        167000,
        120,
        1200000,
        436,
        None,
    ]
    rows = claude_context_report(REPORT)
    assert rows[0] == context_items.ReportRow("report", "", 131000, 600000, "claude-test-1")
    cats = {r.name: r.tokens for r in rows if r.kind == "report_category"}
    assert cats["MCP tools (deferred)"] == 167000 and cats["Free space"] == 436000 and len(cats) == 9
    items = [(r.name, r.path, r.tokens) for r in rows if r.kind == "report_item"]
    assert ("MCP Tools|mcp__docs__fetch", "docs", 1100) in items and ("Skills|build-plan", "User", 120) in items


def test_the_latest_report_is_served_and_gives_the_limit(db, tmp_path):
    older = REPORT.replace("131k / 600k", "90k / 600k").replace(
        "| build-plan | User | ~120 |\n", "| gone | User | 5 |\n"
    )
    write_lines(
        claude_path(tmp_path),
        [
            report_line(900, older),
            c_assistant("m1", "r1", 800, inp=100, read=1000, write=200),
            report_line(700),
            c_assistant("m2", "r2", 600, inp=100, read=2000, write=200),
        ],
    )
    make_ingester(db, tmp_path).poll()
    b = board_api._agent_context(db._conn(), SESSION, SESSION, True)["breakdown"]
    rep = b["reported"]
    assert rep["total"] == 131000 and rep["limit"] == 600000 and rep["model"] == "claude-test-1"
    assert rep["source"] == "claude /context" and rep["ts"] == pytest.approx(NOW - 700, abs=1)
    parts = {p["key"]: p for p in rep["parts"]}
    assert parts["mcp_tools_deferred"]["tokens"] == 167000 and rep["parts"][0]["label"] == "Free space"
    assert [i["name"] for i in parts["skills"]["items"]] == ["build-plan", "security-review"]  # not the older report's
    assert [i["tokens"] for i in parts["mcp_tools"]["items"]] == [1100, 156]
    # The model of the report is not the model of the calls: its limit is not used.
    assert b["limit"] is None
    b = board_api._context_breakdown(
        db._conn(),
        SESSION,
        "",
        True,
        tool="claude-code",
        at_ts=NOW,
        total=2300,
        limit=None,
        tool_tokens=None,
        split=None,
        model="claude-test-1",
    )
    assert b["limit"] == 600000
