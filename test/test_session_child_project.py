# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A session's child rows (agents, agents_text, session_turns) are filed under the project of
their session row, in whichever order the rows arrive, and move with it.

Before, an agent read before its session row was stored under project "" and again under the
session's project later, and a turn under its own folder: two current rows of one key, so every
join on (session_id, agent_id) or (session_id, prompt_id) found two parents.
"""

from __future__ import annotations

import time

from core_store_fakes import current

from aictl.records import AgentRow, SessionRow, SessionTurnRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter

T = time.time() - 600
SID = "sess-1"
PROJECT = "/work/app"
CHILD_TABLES = ("agents", "agents_text", "session_turns")


def facts(writer=None, **kwargs) -> SessionFacts:
    return SessionFacts(writer or MemoryWriter(), keeps_text=lambda: True, **kwargs)


def session(project: str = PROJECT) -> SessionRow:
    return SessionRow(SID, "copilot-cli", project_path=project, started_at=T)


def agent(agent_id: str = "a1", **kwargs) -> AgentRow:
    return AgentRow(agent_id=agent_id, session_id=SID, tool="copilot-cli", task="look at the build",
                    started_at=T + 1, **kwargs)


def turn(prompt_id: str = "p1", cwd: str = PROJECT + "/sub") -> SessionTurnRow:
    return SessionTurnRow(session_id=SID, prompt_id=prompt_id, ts=T + 2, project_path=cwd)


def keys_under_more_than_one_project(writer, table: str) -> int:
    projects: dict[tuple, set] = {}
    for row in current(writer, table):
        key = tuple(row[k] for k in ("session_id", "agent_id" if table != "session_turns" else "prompt_id"))
        projects.setdefault(key, set()).add(row["project"])
    return sum(1 for found in projects.values() if len(found) > 1)


def write_children(db: SessionFacts) -> None:
    db.agents([agent()])
    db._turns([turn()])


def test_children_after_their_session_are_filed_under_its_project():
    db = facts()
    db.session(session())
    write_children(db)
    for table in CHILD_TABLES:
        assert {r["project"] for r in current(db.writer, table)} == {PROJECT}, table


def test_children_before_their_session_wait_and_then_take_its_project():
    db = facts()
    write_children(db)
    assert not any(current(db.writer, table) for table in CHILD_TABLES), "nothing is written under a guessed project"
    db.session(session())
    for table in CHILD_TABLES:
        assert {r["project"] for r in current(db.writer, table)} == {PROJECT}, table
        assert keys_under_more_than_one_project(db.writer, table) == 0


def test_a_turn_in_a_subfolder_is_filed_under_the_session_project_not_its_own_folder():
    db = facts()
    db.session(session())
    db._turns([turn(cwd=PROJECT + "/worktrees/x")])
    row, = current(db.writer, "session_turns")
    assert (row["project"], row["project_path"]) == (PROJECT, PROJECT + "/worktrees/x")


def test_children_move_with_their_session_and_leave_a_tombstone():
    db = facts()
    db.session(session())
    write_children(db)
    db.session(session("/work/other"))
    for table in CHILD_TABLES:
        assert {r["project"] for r in current(db.writer, table)} == {"/work/other"}, table
        deletes = [row for op, name, rows in db.writer.operations if op == "delete" and name == table for row in rows]
        assert [row["project"] for row in deletes] == [PROJECT], table
    # A later report of the agent goes to the new project only.
    db.agents([agent(status="completed")])
    assert keys_under_more_than_one_project(db.writer, "agents") == 0


def test_a_child_waiting_for_its_session_survives_a_restart(tmp_path):
    writer = MemoryWriter()
    first = facts(writer, state=StateFile(tmp_path / "sessions.json"))
    write_children(first)
    first.save()
    second = facts(writer, state=StateFile(tmp_path / "sessions.json"))
    second.session(session())
    for table in CHILD_TABLES:
        assert {r["project"] for r in current(writer, table)} == {PROJECT}, table


def test_a_retired_monitor_session_keeps_the_session_it_went_to():
    """A monitor session (tool:pid:time) bound to the tool's own session is deleted, but events and
    process links still name its id: the tombstone names the session that holds them now."""
    db = facts()
    db.session(SessionRow("copilot-cli:4242:1700000000", "copilot-cli", project_path=PROJECT, started_at=T))
    db.retire([("copilot-cli:4242:1700000000", PROJECT, SID), ("gone:1:1", PROJECT)])
    deletes = {r["session_id"]: r for op, name, rows in db.writer.operations if op == "delete" and name == "sessions"
               for r in rows}
    assert deletes["copilot-cli:4242:1700000000"]["merged_into"] == SID
    assert deletes["gone:1:1"]["merged_into"] == ""


def test_a_waiting_agent_the_evidence_removes_is_never_written():
    db = facts()
    db.agents([agent("copy")])
    db.forget_agents([(SID, "copy")])
    db.session(session())
    assert [r["agent_id"] for r in current(db.writer, "agents")] == []
