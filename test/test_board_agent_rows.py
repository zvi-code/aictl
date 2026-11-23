# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The agents list: what a subagent is called, whether it runs, and a row order that holds between refreshes."""

from __future__ import annotations

from types import SimpleNamespace

from aictl.dashboard import subagents
from aictl.dashboard.board_projection import ACTIVE_WINDOW_S, _Board, _Cell, _ToolAgg

SID = "0b9e4c1a-2d3f-4e5a-8b6c-7d8e9f0a1b2c"
OTHER = "1c0f5d2b-3e4a-4f6b-9c7d-8e9f0a1b2c3d"
NOW = 1_800_000_000.0
BRIEF = ("You are implementing one bounded change in the aictl repository (your working directory is an isolated git "
         "worktree of it). Do the work yourself; do not delegate. Read AGENTS.md first and follow it.\n\n")


def _sub(aid: str, started: float, *, sid: str = SID, task: str = "", **extra) -> dict:
    return {"agent_id": aid, "session_id": sid, "row_kind": "agent", "task": task, "model": "claude-opus-5-5",
            "started_at": started, "ended_at": started + 5, "completed": 0, **extra}


def _spawn(use_id: str, ts: float, description: str, prompt: str, *, sid: str = SID, agent_type: str = "general-purpose",
           model: str = "opus") -> dict:
    return {"agent_id": f"spawn:{use_id}", "session_id": sid, "row_kind": "spawn", "started_at": ts,
            "description": description, "agent_type": agent_type, "spawn_model": model, "spawn_prompt": prompt[:500],
            "spawned_by": "", "spawn_tool_use_id": use_id}


# ── Which call started a subagent ─────────────────────────────────────────


def test_parallel_spawns_with_the_same_opening_match_by_prompt_then_time():
    first, second = BRIEF + "Item 1: session names", BRIEF + "Item 5: session finder"
    subs = {"a1": _sub("a1", NOW + 0.020, task=second[:200]), "a2": _sub("a2", NOW + 0.010, task=first[:200])}
    spawns = [_spawn("toolu_1", NOW, "Item 1: session names", first), _spawn("toolu_2", NOW + 0.001, "Item 5: session finder", second)]
    found = subagents.match_spawns(subs, spawns, {"a1": second, "a2": first})
    assert found["a1"]["description"] == "Item 5: session finder"
    assert found["a2"]["description"] == "Item 1: session names"


def test_a_recorded_tool_use_id_wins_over_time_and_far_calls_do_not_match():
    subs = {"a1": _sub("a1", NOW, parent_tool_use_id="toolu_far"), "a2": _sub("a2", NOW + 500)}
    spawns = [_spawn("toolu_near", NOW, "near", ""), _spawn("toolu_far", NOW - 3600, "far", "")]
    found = subagents.match_spawns(subs, spawns)
    assert found["a1"]["description"] == "far"
    assert "a2" not in found  # 500 s from any unclaimed call: no guess


def test_calls_of_another_session_never_name_a_subagent():
    found = subagents.match_spawns({"a1": _sub("a1", NOW)}, [_spawn("toolu_1", NOW, "x", "", sid=OTHER)])
    assert found == {}


# ── Names ─────────────────────────────────────────────────────────────────


def test_name_chain_never_uses_the_prompt():
    prompt = BRIEF + "Item 1"
    spawn = _spawn("toolu_1", NOW, "Item 1: session names", prompt)
    assert subagents.subagent_name({"description": "Stored by the tool"}, spawn, "a1b2c3d4") == ("Stored by the tool", "description")
    assert subagents.subagent_name({"task": prompt[:200]}, spawn, "a1b2c3d4") == ("Item 1: session names", "caller")
    no_text = {**spawn, "description": ""}
    assert subagents.subagent_name({"task": prompt[:200]}, no_text, "a1b2c3d4") == ("general-purpose a1b2c3d4", "agent type")
    # Claude Code stores the prompt as the task: it is never the name.
    assert subagents.subagent_name({"task": "Fix it"}, None, "a1b2c3d4", "Fix it", task_is_prompt=True) == ("Subagent a1b2c3d4", "id")
    assert subagents.subagent_name({"task": prompt[:200]}, None, "a1b2c3d4", prompt) == ("Subagent a1b2c3d4", "id")
    # Copilot stores the agent's name as the task.
    assert subagents.subagent_name({"task": "code-review"}, None, "a1b2c3d4", "Review the diff") == ("code-review a1b2c3d4", "agent type")


def test_prompt_line_is_the_first_non_empty_line_clamped():
    assert subagents.prompt_line("\n\n  Read-only investigation.\nMore") == "Read-only investigation."
    assert len(subagents.prompt_line("x" * 500)) == subagents.PROMPT_LINE_CHARS
    assert subagents.prompt_line(None) is None


# ── Status ────────────────────────────────────────────────────────────────


def _status(sub: dict, last_line: float | None, *, parent_live: bool = True, **kw):
    return subagents.subagent_status(now=NOW, parent_live=parent_live, parent_evidence="process 4312 running",
                                     parent_end_reason="", sub=sub, last_line=last_line, idle_window=ACTIVE_WINDOW_S, **kw)


def test_a_subagent_writing_lines_runs_even_when_its_completed_flag_is_set():
    # The importer sets completed whenever the newest line is an assistant line, and never clears it.
    status, words, reason = _status({"completed": 1, "started_at": NOW - 600}, NOW - 12)
    assert (status, words, reason) == ("running", "last line 12 s ago", "")


def test_an_open_tool_call_keeps_a_quiet_subagent_running():
    sub = {"completed": 1, "started_at": NOW - 900, "last_call_ts": NOW - 400, "last_call_name": "Bash",
           "last_call_target": "pytest -q", "last_call_open": True}
    status, words, _ = _status(sub, NOW - 400)
    assert status == "running" and words.startswith("waiting for its Bash call to return")
    assert subagents.now_text(sub, status) == "Bash pytest -q"


def test_a_final_reply_and_quiet_after_it_is_an_end_and_says_when():
    status, words, reason = _status({"completed": 1, "started_at": NOW - 900}, NOW - 300)
    assert status == "ended" and words.startswith("finished: its last recorded line (") and reason == "transcript"


def test_quiet_without_a_final_reply_is_idle_then_an_inferred_end():
    assert _status({"completed": 0, "started_at": NOW - 900}, NOW - 300)[0] == "idle"
    status, words, reason = _status({"completed": 0, "started_at": NOW - 9000}, NOW - 2 * ACTIVE_WINDOW_S)
    assert (status, reason) == ("ended", "idle") and "inferred" in words


def test_a_subagent_ends_with_its_parent_and_unknown_is_never_ended():
    status, words, _ = _status({"started_at": NOW - 60}, NOW - 5, parent_live=False)
    assert status == "ended" and words.startswith("parent session ended")
    # One that finished by itself says so, not that its parent ended.
    status, words, reason = _status({"started_at": NOW - 600, "completed": 1}, NOW - 500, parent_live=False)
    assert (status, reason) == ("ended", "transcript") and words.startswith("finished: its last recorded line (")
    assert _status({}, None)[0] == "unknown"


def test_a_status_the_tool_stored_is_used_as_recorded():
    assert _status({"agent_status": "completed", "started_at": NOW - 60}, NOW - 5)[:2] == ("ended", "tool recorded completed")
    assert _status({"agent_status": "failed", "started_at": NOW - 60}, NOW - 5)[0] == "failed"


# ── The board's rows ──────────────────────────────────────────────────────


def _board(subs: list[dict], *, spawns: list[dict] = (), parent_last: float = NOW - 5, meta: dict | None = None) -> _Board:
    board = _Board.__new__(_Board)
    board.now = NOW
    board.cells = [_Cell(SID, "", "m", 0, "claude-code", "/p", 1, 1, 1, 0, 0, 0, NOW - 3000, parent_last, None),
                   _Cell(OTHER, "", "m", 0, "claude-code", "/p", 1, 1, 1, 0, 0, 0, NOW - 100, NOW - 50, None)]
    board.tool_agg, board.prompt_agg, board.loops = {}, {}, []
    board.sub_rows = {row["agent_id"]: row for row in subs}
    board.spawns = list(spawns)
    board.live_by_sid = {}
    board.meta = meta or {SID: {"started_at": NOW - 3000}, OTHER: {"started_at": NOW - 100}}
    board.status, board.sub_status, board.lifecycle = {}, {}, {}
    board.session_tool = {SID: "claude-code", OTHER: "claude-code"}
    board.session_project = {SID: "/p", OTHER: "/p"}
    board.history = SimpleNamespace(read=lambda *_a, **_k: [], keys=lambda ids: sorted(ids))
    board._assign_status()
    board.scope = {SID, OTHER}
    board.first_ts = {}
    return board


def test_running_subagents_of_a_live_session_read_running_with_their_own_evidence():
    subs = [_sub("a-old", NOW - 2000, completed=1, ended_at=NOW - 1500),
            _sub("a-new", NOW - 600, completed=1, ended_at=NOW - 8, task=BRIEF[:200])]
    board = _board(subs)
    assert board.sub_status == {"a-old": "ended", "a-new": "running"}
    assert board._status_evidence(SID, False, subs[1], True, "a-new")["status_evidence"] == "last line 8 s ago"


def test_order_and_names_hold_when_only_activity_times_change():
    spawns = [_spawn("toolu_1", NOW - 2000, "Live vs historical sessions", BRIEF),
              _spawn("toolu_2", NOW - 600, "Agents and subagents list UX", BRIEF)]

    def snapshot(parent_last: float, sub_last: float) -> tuple[list[tuple[str, str]], dict]:
        subs = [_sub("a-new", NOW - 600, completed=1, ended_at=sub_last, task=BRIEF[:200]),
                _sub("a-old", NOW - 2000, completed=1, ended_at=NOW - 1500, task=BRIEF[:200])]
        board = _board(subs, spawns=spawns, parent_last=parent_last)
        keys = board._ordered_agent_keys()
        return keys, board._format_titles(keys, {})

    first_keys, first_names = snapshot(NOW - 5, NOW - 10)
    second_keys, second_names = snapshot(NOW - 1, NOW - 2)
    assert first_keys == second_keys
    # Running sessions first, newest start first; subagents in spawn order, not by activity.
    assert first_keys == [(OTHER, OTHER), (SID, SID), (SID, "a-old"), (SID, "a-new")]
    assert first_names == second_names
    assert first_names[(SID, "a-old")] == "Live vs historical sessions"
    assert first_names[(SID, "a-new")] == "Agents and subagents list UX"


def test_view_rows_from_before_and_after_the_new_agent_columns_both_name_rows():
    # Before: no row_kind, no description, no spawn rows. The prompt is still not the name.
    before = _board([{"agent_id": "a1", "session_id": SID, "task": BRIEF[:200], "model": "m",
                      "started_at": NOW - 60, "ended_at": NOW - 5, "completed": 0}])
    assert before._format_titles([(SID, "a1")], {(SID, "a1"): BRIEF})[(SID, "a1")] == "Subagent a1"
    # After: the tool's own description column names it.
    after = _board([_sub("a1", NOW - 60, task=BRIEF[:200], description="OTel flattening into columns")])
    assert after._format_titles([(SID, "a1")], {})[(SID, "a1")] == "OTel flattening into columns"
    assert after.name_meta[(SID, "a1")] == {"name_source": "description", "prompt_line": BRIEF.splitlines()[0][:139] + "…"}


def test_pending_permission_on_a_subagent_reads_waiting():
    subs = [_sub("a1", NOW - 60, ended_at=NOW - 3)]
    board = _board(subs)
    board.tool_agg[(SID, "a1")] = _ToolAgg(1, 0, 1, 0, 1, NOW - 30, NOW - 30, None, "claude-code", "/p")
    board._assign_status()
    assert board.sub_status["a1"] == "waiting"
