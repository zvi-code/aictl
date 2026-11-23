"""The Verified before commit card: insights.verified_commits on invented tool calls, and its shape.

A commit is a successful shell call that runs `git commit`; it is classified by whether a test run saw the source
changes before it. The view reduces each call to its winning version, drops a tombstone after the reduction and
applies the period after it. A count a tool does not record stays None. The view runs through the replay harness
(recorded against the scratch database).
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from aictl.dashboard import insights
from aictl.stores.kusto.tables import TABLES
from aictl.dashboard.board_filters import Filters
from aictl.dashboard.projections.history import HistoryScope

NEWER = "2026-02-01"
QUERIES = Path(__file__).resolve().parent.parent / "src" / "aictl" / "stores" / "kusto" / "queries"


def _card(store, since=0.0, until=100_000.0):
    status, body = insights.insight("verified", Filters(since=since, until=until), 200_000.0,
                                    history=HistoryScope(store.history_store.reader, None))
    assert status == 200
    assert body["view"] == "insights.verified_commits" and body["query"]["view"] == "insights.verified_commits"
    return body


def _shell(store, key, ts, text, *, session, tool="copilot-cli", name="bash", agent="", failed=0, code=None, program=None,
           **values):
    program = program or text.split()[0]
    chars = values.pop("target_chars", len(text))
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 target_kind="command", target=text, command_name=program, target_chars=chars, is_error=failed,
                 exit_code=code, source=values.pop("source", "transcript"), **values)


def _edit(store, key, ts, path, *, session, tool="copilot-cli", name="edit", agent="", **values):
    store.insert("tool_invocations", dedup_key=key, ts=ts, session_id=session, agent_id=agent, tool=tool, tool_name=name,
                 target_kind="file" if path else "", target=path, source=values.pop("source", "transcript"), **values)


def _tools(body):
    return {tool["tool"]: tool for tool in body["tools"]}


def test_commits_are_split_by_what_the_last_test_run_saw(kusto_store):
    s = kusto_store
    # a: Copilot CLI, which records an exit code of 0, so a pass is reported.
    _edit(s, "a1", 10.0, "src/a.py", session="a")
    _shell(s, "a2", 20.0, "python -m pytest -q", session="a", code=0)
    _shell(s, "a3", 30.0, "git commit -m one", session="a", code=0)                  # tested, passed
    _edit(s, "a4", 40.0, "src/b.py", session="a")
    _shell(s, "a5", 45.0, "python -m pytest", session="a", code=0)                   # deleted: it never saw b.py
    s.insert("tool_invocations", dedup_key="a5", ts=45.0, session_id="a", tool="copilot-cli", tool_name="bash",
             _deleted=True, _v=NEWER)
    _shell(s, "a6", 50.0, "git add -A && git commit -m two", session="a", code=0)    # changed after the last test
    _shell(s, "a7", 55.0, 'echo "git commit"', session="a", code=0)                  # printed, not a commit
    _shell(s, "a8", 60.0, "python -m pytest | tail -5", session="a", code=0)         # piped: result not recorded
    _shell(s, "a9", 70.0, "git commit -m three", session="a", code=0)                # tested, result not recorded
    _edit(s, "a10", 80.0, "README.md", session="a")                                  # documentation: not a source change
    _shell(s, "a11", 90.0, "git commit -m four", session="a", code=0)                # tested, result not recorded
    _shell(s, "a12", 95.0, "git commit -m five", session="a", code=0)
    _shell(s, "a12", 95.0, "git commit -m five", session="a", failed=1, code=1, _v=NEWER)  # the winning version failed
    _shell(s, "a13", 96.0, "git commit --dry-run", session="a", code=0)               # not a commit
    # b: never tested; the second commit is a subagent's.
    _edit(s, "b1", 10.0, "src/c.py", session="b")
    _shell(s, "b2", 20.0, "git commit -m x", session="b", code=0)
    _shell(s, "b3", 30.0, "git commit -m y", session="b", agent="sub", code=0)
    # h: a test run at the same time as a change did not see it.
    _edit(s, "h1", 10.0, "src/h.py", session="h")
    _shell(s, "h2", 10.0, "pytest", session="h", code=0)
    _shell(s, "h3", 20.0, "git commit -m h", session="h", code=0)                    # changed after the last test
    # i: one line edits in place, tests and commits, in that order.
    _shell(s, "i1", 10.0, "sed -i 's/a/b/' src/i.py && python -m pytest && git commit -m i", session="i", code=0)
    # d: a session known only from Copilot's session store: its edits are not recorded.
    _shell(s, "d1", 10.0, "git commit -m d", session="d", code=0, source="copilot-session-store")
    # f: a commit over ssh runs on another machine.
    _shell(s, "f1", 10.0, "ssh host 'cd repo && git commit -m f'", session="f", code=0)
    # c: Claude Code reports failures only. A failed test run, then an edit that names no file.
    _edit(s, "c1", 10.0, "src/x.ts", session="c", tool="claude-code", name="Edit")
    _shell(s, "c2", 20.0, "npm test", session="c", tool="claude-code", name="Bash", failed=1, code=1)
    _shell(s, "c3", 30.0, "git commit -m c", session="c", tool="claude-code", name="Bash")   # tested, failed
    _edit(s, "c4", 40.0, "", session="c", tool="claude-code", name="Edit")
    _shell(s, "c5", 50.0, "git commit -m c2", session="c", tool="claude-code", name="Bash")  # change unknown
    # j: a subagent ran the tests the main agent's commit relies on.
    _edit(s, "j1", 10.0, "src/m.py", session="j", tool="claude-code", name="Edit")
    _shell(s, "j2", 20.0, "pytest", session="j", tool="claude-code", name="Bash", agent="sub")
    _shell(s, "j3", 30.0, "git commit -m j", session="j", tool="claude-code", name="Bash")   # tested, result not recorded
    # e: Codex CLI keeps the program name only, so no commit can be seen.
    _shell(s, "e1", 10.0, "git", session="e", tool="codex-cli", name="shell", target_chars=None)
    # g: after the period.
    _edit(s, "g1", 150_000.0, "src/g.py", session="g")
    _shell(s, "g2", 150_001.0, "git commit -m g", session="g", code=0)
    body = _card(s)
    tools = _tools(body)
    cli = tools["copilot-cli"]
    assert {key: cli[key] for key in ("commits", "passed", "unreported", "failed", "changed_after", "never_tested",
                                      "no_change", "unknown_change", "not_recorded", "by_subagent", "remote_commits")} == {
        "commits": 9, "passed": 2, "unreported": 2, "failed": 0, "changed_after": 2, "never_tested": 2, "no_change": 0,
        "unknown_change": 0, "not_recorded": 1, "by_subagent": 1, "remote_commits": 1}
    assert (cli["classified"], cli["unseen"], cli["unseen_share"]) == (8, 4, 0.5)
    claude = tools["claude-code"]
    assert {key: claude[key] for key in ("commits", "passed", "failed", "unreported", "unknown_change", "own_unseen")} == {
        "commits": 3, "passed": None, "failed": 1, "unreported": 1, "unknown_change": 1, "own_unseen": 1}
    assert (claude["classified"], claude["unseen_share"], claude["own_unseen_share"]) == (2, 0.0, 0.5)
    assert claude["edits_no_file"] == 1
    codex = tools["codex-cli"]
    assert (codex["commits"], codex["untested_sessions"], codex["passed"], codex["failed"]) == (None, None, None, None)
    assert codex["sessions_no_text"] == 1
    summary = body["summary"]
    assert (summary["commits"], summary["classified"], summary["unseen"], summary["unchecked"]) == (12, 10, 4, 2)
    assert summary["not_reported"] == ["codex-cli"] and summary["remote_commits"] == 1
    assert [(row["session_id"], row["unseen"], row["commits"], row["by_subagent"]) for row in body["sessions"]] == [
        ("b", 2, 2, 1), ("a", 1, 4, 0), ("h", 1, 1, 0)]
    assert "g" not in {row["session_id"] for row in body["sessions"]}


def test_history_before_the_period_counts_and_commits_before_it_do_not(kusto_store):
    s = kusto_store
    _edit(s, "k1", 500.0, "src/k.py", session="k")
    _shell(s, "k2", 600.0, "pytest", session="k", code=0)
    _shell(s, "k3", 700.0, "git commit -m early", session="k", code=0)               # before the period
    _shell(s, "k4", 1500.0, "git commit -m late", session="k", code=0)               # saw the test at 600: passed
    _edit(s, "m1", 500.0, "src/m.py", session="m")
    _shell(s, "m2", 1500.0, "git commit -m m", session="m", code=0)                  # never tested
    body = _card(s, since=1000.0)
    cli = _tools(body)["copilot-cli"]
    assert (cli["commits"], cli["never_tested"], cli["commit_sessions"]) == (2, 1, 2)
    # The pass of k4 is in the session counts, but no test run of the period has a recorded result, so the tool's
    # passed and failed are not reported.
    assert (cli["passed"], cli["failed"], cli["test_runs"]) == (None, None, 0)
    # Untested sessions are those that changed source in the period: neither did.
    assert (cli["edit_sessions"], cli["untested_sessions"]) == (0, 0)


def _tool(tool, **counts):
    row = {"row_type": "tool", "tool": tool, **dict.fromkeys(insights.VERIFIED_COUNTS, 0)}
    row.update(counts)
    return row


def test_the_shape_pools_classified_commits_and_keeps_unreported_counts_none():
    rows = [
        _tool("copilot-cli", commits=506, passed=40, unreported=60, failed=6, changed_after=120, never_tested=95, no_change=90,
              unknown_change=0, not_recorded=95, own_unseen=170, top_session_commits=48, edit_sessions=59, untested_sessions=13,
              test_results=50),
        _tool("copilot-desktop", commits=141, passed=None, failed=None, not_recorded=136, unreported=0, no_change=5,
              top_session_commits=116, edit_sessions=1, untested_sessions=0),
        _tool("claude-code", commits=10, passed=None, unreported=4, failed=None, changed_after=2, never_tested=1, no_change=1,
              unknown_change=2, own_unseen=2, top_session_commits=3, edit_sessions=6, untested_sessions=2),
        _tool("codex-cli", commits=None, passed=None, failed=None, unreported=None, changed_after=None, never_tested=None,
              no_change=None, unknown_change=None, not_recorded=None, own_unseen=None, untested_sessions=None, edit_sessions=3,
              sessions_no_text=4),
        {"row_type": "session", "tool": "claude-code", "node_id": "n", "session_id": "s2", "commits": 3, "untested": 3,
         "never_tested": 1, "own_unseen": 2, "by_subagent": 0, "last_commit": 50.0},
        {"row_type": "session", "tool": "copilot-cli", "node_id": "n", "session_id": "s1", "commits": 48, "untested": 30,
         "never_tested": 10, "own_unseen": 20, "by_subagent": 5, "last_commit": 90.0},
        {"row_type": "meta", "first_ts": 1.0, "last_ts": 2.0, "computed_at": 3.0},
    ]
    body = insights.verified_commits(rows)
    tools = _tools(body)
    assert [tool["tool"] for tool in body["tools"]] == ["copilot-cli", "copilot-desktop", "claude-code", "codex-cli"]
    assert (tools["copilot-cli"]["classified"], tools["copilot-cli"]["unseen"]) == (411, 215)
    assert tools["copilot-cli"]["unseen_share"] == pytest.approx(215 / 411)
    assert tools["copilot-cli"]["own_unseen_share"] == pytest.approx(170 / 411)
    # The Copilot app: 5 of 141 commits classified is no share; all its commits count as unchecked.
    desktop = tools["copilot-desktop"]
    assert (desktop["classified"], desktop["checked"], desktop["unseen_share"], desktop["unchecked"], desktop["passed"]) == \
        (5, False, None, 141, None)
    assert tools["claude-code"]["checked"] is True and tools["claude-code"]["unseen_share"] == pytest.approx(3 / 8)
    codex = tools["codex-cli"]
    assert (codex["commits"], codex["classified"], codex["unseen"], codex["unseen_share"], codex["unchecked"]) == (None,) * 5
    summary = body["summary"]
    assert summary["commits"] == 657 and summary["classified"] == 411 + 8
    assert summary["unseen"] == 218 and summary["unseen_share"] == pytest.approx(218 / 419)
    assert summary["own_unseen"] == 172 and summary["own_unseen_share"] == pytest.approx(172 / 419)
    assert (summary["failed"], summary["passed"], summary["unchecked"]) == (6, 40, 95 + 141 + 2)
    # Untested sessions count only tools that report them: Codex CLI keeps no command text.
    assert (summary["edit_sessions"], summary["untested_sessions"]) == (66, 15)
    assert summary["not_reported"] == ["codex-cli"] and summary["sessions_no_text"] == 4
    assert summary["checked_tools"] == ["copilot-cli", "claude-code"]
    assert summary["not_classified"] == ["copilot-desktop"] and summary["one_session"] == ["copilot-desktop"]
    assert [(row["session_id"], row["unseen"]) for row in body["sessions"]] == [("s1", 30), ("s2", 3)]
    assert "untested" not in body["sessions"][0]


def test_a_tool_whose_edits_are_not_recorded_is_not_classified():
    body = insights.verified_commits([_tool("copilot-desktop", commits=4, not_recorded=4, passed=None, failed=None)])
    tool = body["tools"][0]
    assert (tool["classified"], tool["unseen_share"], tool["own_unseen_share"]) == (0, None, None)
    summary = body["summary"]
    assert (summary["classified"], summary["unseen_share"], summary["unchecked"]) == (0, None, 4)
    assert summary["not_classified"] == ["copilot-desktop"] and summary["checked_tools"] == []


@pytest.mark.parametrize("rows", [[], [{"row_type": "meta", "first_ts": None, "last_ts": None, "computed_at": 1.0}]])
def test_an_empty_period_reports_nothing_as_zero(rows):
    body = insights.verified_commits(rows)
    assert body["tools"] == [] and body["sessions"] == []
    summary = body["summary"]
    for key in ("commits", "classified", "unseen", "unseen_share", "own_unseen", "own_unseen_share", "failed", "passed",
                "unchecked", "edit_sessions", "untested_sessions"):
        assert summary[key] is None, key


def test_only_a_text_less_tool_reports_no_commits():
    body = insights.verified_commits([_tool("codex-cli", **{**dict.fromkeys(insights.VERIFIED_COUNTS, None), "sessions_no_text": 2})])
    summary = body["summary"]
    assert (summary["commits"], summary["classified"], summary["unseen_share"], summary["untested_sessions"]) == (None,) * 4
    assert summary["not_reported"] == ["codex-cli"] and summary["sessions_no_text"] == 2


def test_no_insight_view_names_a_let_after_a_stored_table():
    # A let named after a table (sessions, events, session_steps) runs on the cluster, where it shadows the table, but
    # the replay harness inlines a table under every identifier that names one, and two lets of one name do not run.
    for view in insights.CARDS.values():
        names = set(re.findall(r"^let (\w+) =", (QUERIES / f"{view}.kql").read_text(), re.M))
        assert not names & set(TABLES), (view, sorted(names & set(TABLES)))
