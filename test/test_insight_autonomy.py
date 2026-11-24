"""Work per instruction: the longest run of main-agent tool calls between two turns of a person, and the wait after.

The view runs through the replay harness (recorded against the scratch database) on invented sessions; the shape
function is also checked on invented rows. A figure a source does not report stays None, never 0.
"""

from __future__ import annotations

import pytest

from aictl.dashboard import insights
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope

PERIOD = Filters(since=0.0, until=100_000.0)
NEWER = "2026-02-01"
TEMPLATE = "Run the nightly dependency audit and write the report"


def _card(store, filters=PERIOD):
    status, body = insights.insight("autonomy", filters, 200_000.0, history=HistoryScope(store.history_store.reader, None))
    assert status == 200
    assert body["query"]["view"] == "insights.work_per_instruction"
    return body


def _prompt(store, key, ts, text, *, session, tool="claude-code", agent=""):
    store.insert("session_prompts", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, text=text)


def _call(store, key, ts, name="Bash", *, session, tool="claude-code", agent="", duration_ms=0.0, **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 duration_ms=duration_ms, **values)


def _reply(store, key, ts, *, session, tool="claude-code", agent="", duration_ms=0.0):
    store.insert("requests", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, duration_ms=duration_ms)


def _turn_end(store, key, ts, *, session, tool="copilot-cli", source="assistant.turn_end"):
    store.insert("session_steps", step_key=key, ts=ts, session_id=session, tool=tool, source=source, kind="turn")


def _tools(body):
    return {tool["tool"]: tool for tool in body["tools"]}


def test_the_longest_chain_runs_from_one_person_turn_to_the_next(kusto_store):
    s = kusto_store
    # c1: three calls after the first instruction (one starts a subagent), a wait of 60 s, two calls, then the
    # person answers the agent's question; the prompt after that answer comes 1 s after the agent stopped (queued)
    # and is never followed by a call or a reply (unread).
    _prompt(s, "c1p1", 1000.0, "please fix the failing parser test in the lexer module", session="c1")
    _call(s, "c1a", 1010.0, session="c1", duration_ms=5000.0)
    _call(s, "c1b", 1020.0, "Read", session="c1")
    _call(s, "c1c", 1030.0, "Agent", session="c1", target_kind="agent")
    _call(s, "c1s", 1035.0, session="c1", agent="sub")                    # a subagent call: not in the chain
    _call(s, "c1x", 1025.0, session="c1")                                 # deleted by a tombstone
    s.insert("tool_invocations", dedup_key="c1x", ts=1025.0, session_id="c1", tool="claude-code", _deleted=True, _v=NEWER)
    _call(s, "c1y", 1026.0, session="c1")                                 # deleted by a scoped tombstone
    s.insert("tool_invocations", dedup_key="c1y", ts=1026.0, session_id="c1", tool="claude-code", _deleted=True, _v=NEWER)
    _reply(s, "c1r1", 1040.0, session="c1")
    _reply(s, "c1rx", 1090.0, session="c1")                               # a deleted reply would make the wait 10 s
    # A tombstone carries the time of the row it deletes (a current view keys rows by hour of their time).
    s.insert("requests", dedup_key="c1rx", ts=1090.0, session_id="c1", tool="claude-code", _deleted=True, _v=NEWER)
    _prompt(s, "c1p2", 1100.0, "now also cover the empty input case please", session="c1")
    _call(s, "c1d", 1110.0, "Edit", session="c1", agent="c1")             # agent id equal to the session id: main agent
    _call(s, "c1e", 1120.0, session="c1")
    _reply(s, "c1r2", 1130.0, session="c1")
    _prompt(s, "c1p3", 1140.0, "/compact keep the parser notes", session="c1")  # session control: not a turn
    _call(s, "c1q", 1150.0, "AskUserQuestion", session="c1")              # the person's answer: a chain, no instruction
    _call(s, "c1f", 1160.0, session="c1")
    _reply(s, "c1r3", 1165.0, session="c1")
    _prompt(s, "c1p4", 1166.0, "and then stop there for today thanks", session="c1")
    # c2: one instruction of five calls, with a template prompt inside that does not cut it; resumed after 25 hours.
    _prompt(s, "c2p1", 5000.0, "rename the config loader and update its callers", session="c2")
    for i, ts in enumerate((5010.0, 5020.0, 5030.0, 5040.0, 5050.0)):
        _call(s, f"c2c{i}", ts, session="c2")
    _prompt(s, "c2t", 5025.0, TEMPLATE, session="c2")
    _reply(s, "c2r1", 5060.0, session="c2")
    _prompt(s, "c2p2", 95_060.0, "back again: commit what you have", session="c2")
    _call(s, "c2c9", 95_070.0, session="c2")
    # n1: a prompt with no stored text cannot be recognised as a template, so it counts as a person.
    _prompt(s, "n1p1", 7000.0, "", session="n1")
    _call(s, "n1c", 7010.0, session="n1")
    # z1: a reply but no recorded call: left out of the figures (no_calls).
    _prompt(s, "z1p1", 8000.0, "what does this repository do in short", session="z1")
    _reply(s, "z1r", 8010.0, session="z1")
    # Three sessions started by one template, and three that share a 40-character opener up to digits.
    for i in range(3):
        _prompt(s, f"t{i}p", 9000.0 + i * 100, TEMPLATE, session=f"t{i}")
        _call(s, f"t{i}c", 9010.0 + i * 100, session=f"t{i}")
        _prompt(s, f"o{i}p", 9500.0 + i * 100, f"Daily build report {i + 10}: summarise the failures of job {i} only",
                session=f"o{i}")
        _call(s, f"o{i}c", 9510.0 + i * 100, session=f"o{i}")
    # A tool that records no prompts.
    _call(s, "x1c", 6000.0, "shell", session="x1", tool="codex-cli")
    body = _card(s)
    tools = _tools(body)
    claude = tools["claude-code"]
    assert {key: claude[key] for key in ("sessions", "instructions", "calls", "delegated", "one_instruction",
                                          "multi_sessions", "p50_longest", "p90_longest", "p50_multi", "p90_multi")} == {
        "sessions": 3, "instructions": 5, "calls": 13, "delegated": 1, "one_instruction": 1, "multi_sessions": 2,
        "p50_longest": 3, "p90_longest": 5, "p50_multi": 3, "p90_multi": 5}
    assert claude["mean_longest"] == pytest.approx(3.0) and claude["mean_multi"] == pytest.approx(4.0)
    assert {key: claude[key] for key in ("turns_answered", "waits", "queued", "resumed", "p50_wait_s", "over_5m")} == {
        "turns_answered": 3, "waits": 1, "queued": 1, "resumed": 1, "p50_wait_s": pytest.approx(60.0), "over_5m": 0}
    assert {key: claude[key] for key in insights.AUTONOMY_COVERAGE} == {
        "active": 10, "prompted": 10, "scripted": 6, "store_only": 0, "start_unread": 1, "no_calls": 1, "unread": 1,
        "unread_sessions": 0}
    # Every led session is in the figures or in a left-out count.
    assert claude["prompted"] - claude["scripted"] - claude["store_only"] == (
        claude["sessions"] + claude["no_calls"] + claude["unread_sessions"])
    codex = tools["codex-cli"]
    assert codex["reported"] is False and codex["active"] == 1 and codex["prompted"] == 0
    assert all(codex[key] is None for key in ("p50_longest", "p50_multi", "mean_multi", "p50_wait_s", "over_5m"))
    assert body["summary"]["lead"] == "claude-code" and body["summary"]["not_reported"] == ["codex-cli"]
    assert body["bin_unit"] == "day" and body["prompts_from"] == pytest.approx(1000.0)
    assert [(row["tool"], row["bin_ts"], row["sessions"], row["multi_sessions"]) for row in body["bins"]] == [
        ("claude-code", 0.0, 3, 2)]
    assert [(row["session_id"], row["longest"], row["instructions"], row["single"]) for row in body["sessions"]] == [
        ("c2", 5, 2, False), ("c1", 3, 2, False), ("n1", 1, 1, True)]
    c1 = body["sessions"][1]
    assert (c1["calls"], c1["delegated"], c1["waits"], c1["queued"], c1["p50_wait_s"], c1["first_ts"]) == (
        6, 1, 1, 1, pytest.approx(60.0), pytest.approx(1000.0))


def test_copilot_turn_ends_stop_a_chain_and_store_only_sessions_are_left_out(kusto_store):
    s = kusto_store
    # k1, Copilot CLI from its events file: the stop is the turn end, not the usage row stamped near the next prompt.
    _prompt(s, "k1p1", 2000.0, "check why the windows build fails on the runner", session="k1", tool="copilot-cli")
    _call(s, "k1a", 2010.0, "powershell", session="k1", tool="copilot-cli", duration_ms=1000.0)
    _call(s, "k1b", 2020.0, "powershell", session="k1", tool="copilot-cli", duration_ms=1000.0)
    _turn_end(s, "k1e1", 2050.0, session="k1")
    _reply(s, "k1u", 2090.0, session="k1", tool="copilot-cli")
    _prompt(s, "k1p2", 2100.0, "ok, apply the fix to the workflow file", session="k1", tool="copilot-cli")
    _call(s, "k1c", 2110.0, "edit", session="k1", tool="copilot-cli")
    _turn_end(s, "k1e2", 2120.0, session="k1")
    # k2, Copilot CLI known only from session-store.db: not comparable, left out.
    _prompt(s, "k2p1", 3000.0, "list the open pull requests in this repository", session="k2", tool="copilot-cli")
    _call(s, "k2a", 3010.0, "powershell", session="k2", tool="copilot-cli", source="copilot-session-store")
    _call(s, "k2b", 3020.0, "powershell", session="k2", tool="copilot-cli", source="copilot-session-store")
    _prompt(s, "k2p2", 3100.0, "and close the stale ones from last year", session="k2", tool="copilot-cli")
    _call(s, "k2c", 3110.0, "powershell", session="k2", tool="copilot-cli", source="copilot-session-store")
    # v1, VS Code: a model call stamps its start and carries its duration; a duration over 24 hours is an error and
    # counts as 0; the last prompt has neither a call nor a reply after it (outside the debug log): unread.
    _prompt(s, "v1p1", 4000.0, "explain the retry policy in the http client", session="v1", tool="copilot-vscode")
    _reply(s, "v1r1", 4010.0, session="v1", tool="copilot-vscode", duration_ms=20_000.0)
    _call(s, "v1a", 4015.0, "read_file", session="v1", tool="copilot-vscode", duration_ms=90_000_000.0)
    _prompt(s, "v1p2", 4100.0, "make the backoff exponential with a cap", session="v1", tool="copilot-vscode")
    _call(s, "v1b", 4110.0, "replace_string_in_file", session="v1", tool="copilot-vscode")
    _reply(s, "v1r2", 4120.0, session="v1", tool="copilot-vscode")
    _prompt(s, "v1p3", 4200.0, "thanks, that is all for now", session="v1", tool="copilot-vscode")
    # v2, VS Code: its only turn is outside the debug log, so the session has no read instruction (unread_sessions).
    _prompt(s, "v2p1", 4500.0, "summarise the open review comments here", session="v2", tool="copilot-vscode")
    tools = _tools(_card(s))
    cli = tools["copilot-cli"]
    assert {key: cli[key] for key in ("sessions", "instructions", "calls", "multi_sessions", "p50_multi", "turns_answered",
                                       "waits", "queued", "p50_wait_s")} == {
        "sessions": 1, "instructions": 2, "calls": 3, "multi_sessions": 1, "p50_multi": 2, "turns_answered": 1,
        "waits": 1, "queued": 0, "p50_wait_s": pytest.approx(50.0)}
    assert (cli["prompted"], cli["store_only"], cli["scripted"], cli["active"]) == (2, 1, 0, 2)
    vscode = tools["copilot-vscode"]
    assert {key: vscode[key] for key in ("sessions", "instructions", "calls", "p50_longest", "turns_answered", "waits",
                                          "queued", "p50_wait_s", "unread")} == {
        "sessions": 1, "instructions": 2, "calls": 2, "p50_longest": 1, "turns_answered": 2, "waits": 2, "queued": 0,
        "p50_wait_s": pytest.approx(70.0), "unread": 2}
    assert (vscode["prompted"], vscode["no_calls"], vscode["unread_sessions"]) == (2, 0, 1)
    assert vscode["over_5m"] == 0 and vscode["over_5m_share"] == 0.0


def test_a_chain_that_started_before_the_period_is_not_counted_in_it(kusto_store):
    s = kusto_store
    _prompt(s, "p1", 1000.0, "start the migration of the user table now", session="m1")
    _call(s, "a", 1010.0, session="m1")
    _call(s, "b", 2010.0, session="m1")                                   # in the period, but its chain began before
    _reply(s, "r", 2020.0, session="m1")
    _prompt(s, "p2", 2100.0, "good, now run the migration tests as well", session="m1")
    _call(s, "c", 2110.0, session="m1")
    body = _card(s, Filters(since=2000.0, until=100_000.0))
    claude = _tools(body)["claude-code"]
    assert (claude["sessions"], claude["instructions"], claude["p50_longest"], claude["multi_sessions"]) == (1, 1, 1, 0)
    assert claude["p50_multi"] is None and claude["mean_multi"] is None
    assert body["sessions"][0]["first_ts"] == pytest.approx(2100.0)


def _rows(**tool):
    figures = {"tool": "copilot-cli", "sessions": 4, "instructions": 9, "calls": 40, "delegated": 2, "one_instruction": 1,
               "p50_longest": 8, "p90_longest": 20, "mean_longest": 10.5, "multi_sessions": 3, "p50_multi": 9,
               "p90_multi": 20, "mean_multi": 12.0, "turns_answered": 5, "waits": 4, "queued": 1, "p50_wait_s": 42.0,
               "over_5m": 1, "resumed": 0, "no_stop": 0, **tool}
    return [
        {"row_type": "tool", **figures},
        {"row_type": "coverage", "tool": "copilot-cli", "active": 6, "prompted": 5, "scripted": 1, "store_only": 0,
         "start_unread": 0, "no_calls": 0, "unread": 0, "unread_sessions": 0},
        {"row_type": "coverage", "tool": "cursor", "active": 3, "prompted": 0},
        {"row_type": "bin", "tool": "copilot-cli", "bin_ts": 86_400.0, "sessions": 4, "multi_sessions": 0, "p50_longest": 8,
         "p90_longest": 20, "p50_multi": None, "turns_answered": 0, "waits": 0, "queued": 0},
        {"row_type": "session", "tool": "copilot-cli", "node_id": "n", "session_id": "s1", "longest": 20, "instructions": 1,
         "calls": 20, "delegated": 0, "waits": 0, "queued": 0, "p50_wait_s": None, "first_ts": 90_000.0},
        {"row_type": "meta", "first_ts": 90_000.0, "last_ts": 95_000.0, "bin_unit": "week", "prompts_from": 80_000.0},
    ]


def test_the_shape_keeps_unreported_figures_none_and_names_tools_that_record_no_prompts():
    body = insights.work_per_instruction(_rows())
    cli, cursor = body["tools"]
    assert cli["tool"] == "copilot-cli" and cli["over_5m_share"] == 0.25 and cli["p50_multi"] == 9
    assert cursor == {**cursor, "tool": "cursor", "reported": False, "sessions": 0, "active": 3, "prompted": 0,
                      "p50_longest": None, "p50_multi": None, "mean_multi": None, "p50_wait_s": None, "over_5m": None,
                      "over_5m_share": None}
    assert body["summary"] == {"lead": "copilot-cli", "sessions": 4, "multi_sessions": 3, "one_instruction": 1,
                               "not_reported": ["cursor"]}
    assert body["bins"][0]["p50_multi"] is None and body["bins"][0]["p50_wait_s"] is None
    assert body["sessions"][0]["single"] is True and body["sessions"][0]["p50_wait_s"] is None
    assert (body["bin_unit"], body["prompts_from"]) == ("week", 80_000.0)
    # The view leaves the wait out when too few answered turns have one: the median and the long count stay None.
    gated = insights.work_per_instruction(_rows(p50_wait_s=None, over_5m=None))["tools"][0]
    assert (gated["waits"], gated["p50_wait_s"], gated["over_5m"], gated["over_5m_share"]) == (4, None, None, None)
    # No multi-instruction session: the multi figures are None, never 0.
    single = insights.work_per_instruction(_rows(multi_sessions=0, p50_multi=None, mean_multi=0.0))["tools"][0]
    assert (single["p50_multi"], single["p90_multi"], single["mean_multi"]) == (None, None, None)


def test_an_empty_answer_has_no_lead_and_no_figures():
    body = insights.work_per_instruction([])
    assert body["tools"] == [] and body["bins"] == [] and body["sessions"] == []
    assert body["summary"] == {"lead": None, "sessions": 0, "multi_sessions": 0, "one_instruction": 0, "not_reported": []}
    assert body["bin_unit"] is None and body["prompts_from"] is None
