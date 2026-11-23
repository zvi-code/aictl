# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A subagent row gets what its ``meta.json`` says, whenever the reader learns it.

Claude Code writes ``<session>/subagents/agent-<id>.meta.json`` beside the subagent's
transcript: its spawning tool call (``toolUseId``), the caller's description, its depth and
parent. The board links a subagent to its spawn only by that tool call id. A row stored by an
aictl that did not read the meta file, or stored before the meta file was there, must still
get the link, without reading the transcripts again; a subagent with no meta file stays
unlinked: nothing is guessed.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from types import SimpleNamespace

from core_store_fakes import current
from test_relation_accuracy import NOW, Facts, agent_tool, agents, assistant, ingester, tools, user, write

from aictl.dashboard import subagents
from aictl.ingesters.transcript_usage import _claude_session_id
from aictl.state_file import StateFile
from aictl.stores import Store
from aictl.stores.kusto.tables import TABLES
from aictl.stores.testing import FixtureReader

A = "aaaaaaaa-0000-4000-8000-00000000000a"
META = {"agentType": "Explore", "description": "look around", "toolUseId": "toolu_1", "spawnDepth": 1}


def main_session(projects: Path) -> Path:
    """A main transcript whose Agent call has no ``toolUseResult``: only the meta file names the subagent's spawn."""
    folder = projects / "-work-repo"
    write(folder / f"{A}.jsonl", [
        user(A, "go", 600),
        assistant(A, "m1", 590, tools=[agent_tool("toolu_1")]),
        {"type": "user", "uuid": "r-toolu_1", "timestamp": user(A, "", 300)["timestamp"], "sessionId": A,
         "cwd": "/work/repo", "promptId": "p1",
         "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "toolu_1", "content": "ok"}]}},
        assistant(A, "m2", 290),
    ])
    return folder


def sub_file(folder: Path, agent: str = "x1") -> Path:
    path = folder / A / "subagents" / f"agent-{agent}.jsonl"
    write(path, [user(A, "find it", 580, agent=agent), assistant(A, f"{agent}a", 570, agent=agent)])
    return path


def put_meta(transcript: Path, meta: dict, *, age: float = 0.0) -> Path:
    path = transcript.with_name(transcript.stem + ".meta.json")
    path.write_text(json.dumps(meta), encoding="utf-8")
    if age:
        os.utime(path, (time.time() - age, time.time() - age))
    return path


def stored_reader(facts) -> FixtureReader:
    """The store as the pass reads it: the newest row of each agent of the requested sessions."""

    def rows(params):
        sessions = set()
        for key in params["session_keys"]:
            size, rest = key.split(":", 1)
            sessions.add(rest[int(size):])
        assert params["all_nodes"] is False and params["requested_node"]
        return [dict(r) for r in current(facts.writer, "agents") if r["session_id"] in sessions]

    return FixtureReader({"agents.stored": rows})


def owner(facts) -> SimpleNamespace:
    return SimpleNamespace(session_facts=facts, history_store=Store(reader=stored_reader(facts)))


def first_run(tmp_path: Path, projects: Path) -> Facts:
    """An earlier aictl read every file to its end and saved its read positions."""
    facts = Facts(state=StateFile(tmp_path / "sessions.json"))
    ingester(facts, projects, checkpoint=StateFile(tmp_path / "transcript_usage.json")).poll()
    facts.save()
    return facts


def start(tmp_path: Path, projects: Path, earlier: Facts) -> tuple[Facts, object]:
    """The next start: the reader finds every file unchanged, then the meta pass runs."""
    from aictl.ingesters import agent_meta_backfill

    facts = Facts(earlier.writer, state=StateFile(tmp_path / "sessions.json"))
    reader = ingester(facts, projects, checkpoint=StateFile(tmp_path / "transcript_usage.json"))
    reader._resume_before = time.time() + 60  # the files written in this test are older than the saved start
    reader.poll()
    assert not reader._offsets, "no session file is read again"
    pass_owner = owner(facts)
    assert agent_meta_backfill.run(pass_owner, StateFile(tmp_path / "agent_meta_backfill.json"),
                                   lambda: ingester(facts, projects)) is True
    return facts, pass_owner


def board_name(facts, key: tuple[str, str]) -> tuple[str, str]:
    """What the board calls the subagent: its row and the spawning call the row's link names, if any."""
    row = agents(facts)[key]
    call = tools(facts)["toolu_1"]
    spawn = {"agent_id": "spawn:toolu_1", "session_id": call["session_id"], "row_kind": "spawn",
             "description": "look around", "agent_type": "Explore", "spawn_tool_use_id": call["source_event_id"]}
    found = subagents.match_spawns({key: row}, [spawn]).get(key)
    return subagents.subagent_name(row, found, key[1][:8], task_is_prompt=True)


def agent_writes(facts) -> int:
    return sum(len(rows) for _, name, rows in facts.writer.operations if name == "agents")


# ── (a) a row an earlier aictl stored without the link ───────────────


def test_a_stored_row_without_the_link_gets_it_from_the_meta_file_at_the_next_start(tmp_path):
    projects = tmp_path / "projects"
    transcript = sub_file(main_session(projects))
    earlier = first_run(tmp_path, projects)
    before = agents(earlier)[(A, "x1")]
    assert (before["parent_tool_use_id"], before["description"]) == ("", "")
    assert board_name(earlier, (A, "x1")) == ("Subagent x1", "id")
    # The meta file was there for the earlier aictl too; it did not read it. Old enough to predate its start.
    put_meta(transcript, META, age=3 * 86400)

    facts, _ = start(tmp_path, projects, earlier)

    row = agents(facts)[(A, "x1")]
    assert (row["parent_tool_use_id"], row["description"], row["spawn_depth"]) == ("toolu_1", "look around", 1)
    # Everything else is the stored row, under the stored project.
    for name in ("model", "started_at", "ended_at", "completed", "cwd", "git_branch", "observed_at", "project"):
        assert row[name] == before[name], name
    assert board_name(facts, (A, "x1")) == ("look around", "description")
    assert tools(facts)["toolu_1"]["session_id"] == A


def test_only_what_the_row_lacks_is_added_from_the_meta_file(tmp_path):
    projects = tmp_path / "projects"
    transcript = sub_file(main_session(projects))
    earlier = first_run(tmp_path, projects)
    stored = dict(agents(earlier)[(A, "x1")], description="Named by the caller")
    earlier.writer.upsert("agents", [stored])
    put_meta(transcript, {**META, "description": "another name", "parentAgentId": "p0", "spawnDepth": 2})

    facts, _ = start(tmp_path, projects, earlier)

    row = agents(facts)[(A, "x1")]
    assert (row["description"], row["parent_tool_use_id"]) == ("Named by the caller", "toolu_1")
    assert (row["parent_agent_id"], row["spawn_depth"]) == ("p0", 2)


# ── (b) the full pass runs once ───────────────────────────────────────


def test_the_full_pass_runs_once_and_a_second_start_writes_nothing(tmp_path):
    from aictl.ingesters import agent_meta_backfill

    projects = tmp_path / "projects"
    transcript = sub_file(main_session(projects))
    earlier = first_run(tmp_path, projects)
    put_meta(transcript, META, age=3 * 86400)
    facts, first_owner = start(tmp_path, projects, earlier)
    assert agents(facts)[(A, "x1")]["parent_tool_use_id"] == "toolu_1"
    assert StateFile(tmp_path / "agent_meta_backfill.json").read()[agent_meta_backfill.STATE_KEY] > 0
    assert len(first_owner.history_store.reader.calls) == 1
    written = agent_writes(facts)

    again, second_owner = start(tmp_path, projects, facts)
    assert agent_writes(again) == written
    # A meta file older than the last pass was read by that pass: the store is not asked again.
    assert second_owner.history_store.reader.calls == []


def test_a_row_that_already_has_everything_is_not_written(tmp_path):
    projects = tmp_path / "projects"
    put_meta(sub_file(main_session(projects)), META)
    earlier = first_run(tmp_path, projects)
    assert agents(earlier)[(A, "x1")]["parent_tool_use_id"] == "toolu_1"
    written = agent_writes(earlier)
    facts, _ = start(tmp_path, projects, earlier)
    assert agent_writes(facts) == written


# ── (c) a meta file that comes after the transcript was read ──────────


def test_a_meta_file_written_after_the_transcript_was_read_is_picked_up_without_new_lines(tmp_path):
    projects = tmp_path / "projects"
    transcript = sub_file(main_session(projects))
    facts = Facts()
    reader = ingester(facts, projects)
    reader.poll()
    assert agents(facts)[(A, "x1")]["parent_tool_use_id"] == ""
    put_meta(transcript, META)
    reader.poll()
    row = agents(facts)[(A, "x1")]
    assert (row["parent_tool_use_id"], row["description"], row["spawn_depth"]) == ("toolu_1", "look around", 1)
    assert board_name(facts, (A, "x1")) == ("look around", "description")


def test_a_meta_file_written_while_the_subagent_still_writes_lines_is_used(tmp_path):
    projects = tmp_path / "projects"
    transcript = sub_file(main_session(projects))
    facts = Facts()
    reader = ingester(facts, projects)
    reader.poll()
    put_meta(transcript, META)
    write(transcript, [assistant(A, "x1b", 500, agent="x1")])
    reader.poll()
    assert agents(facts)[(A, "x1")]["parent_tool_use_id"] == "toolu_1"


def test_a_meta_file_written_while_aictl_was_stopped_is_picked_up_at_the_next_start(tmp_path):
    projects = tmp_path / "projects"
    transcript = sub_file(main_session(projects))
    earlier = first_run(tmp_path, projects)
    from aictl.ingesters import agent_meta_backfill

    # A pass already ran after that read; the meta file came later.
    StateFile(tmp_path / "agent_meta_backfill.json").replace({agent_meta_backfill.STATE_KEY: time.time() - 3600})
    put_meta(transcript, META)
    facts, _ = start(tmp_path, projects, earlier)
    assert agents(facts)[(A, "x1")]["parent_tool_use_id"] == "toolu_1"


# ── (d) no meta file: no link, no name ────────────────────────────────


def test_a_subagent_without_a_meta_file_stays_unlinked_and_unnamed(tmp_path):
    projects = tmp_path / "projects"
    folder = main_session(projects)
    sub_file(folder)
    # Another subagent of the same session has a meta file; it says nothing about x1.
    put_meta(sub_file(folder, "x2"), {**META, "toolUseId": "toolu_2"})
    earlier = first_run(tmp_path, projects)
    facts, _ = start(tmp_path, projects, earlier)
    row = agents(facts)[(A, "x1")]
    assert (row["parent_tool_use_id"], row["description"], row["parent_agent_id"]) == ("", "", "")
    # The session's only Agent call started 10 s before x1 with x1's prompt: still not a link.
    assert board_name(facts, (A, "x1")) == ("Subagent x1", "id")


def test_a_meta_file_of_an_agent_the_store_does_not_hold_writes_no_row(tmp_path):
    projects = tmp_path / "projects"
    folder = main_session(projects)
    earlier = first_run(tmp_path, projects)
    meta = folder / A / "subagents" / "agent-gone.meta.json"
    meta.parent.mkdir(parents=True, exist_ok=True)
    meta.write_text(json.dumps(META), encoding="utf-8")
    facts, _ = start(tmp_path, projects, earlier)
    assert (A, "gone") not in agents(facts)
    assert _claude_session_id(meta) == A


# ── The store's own views (replayed Kusto) ────────────────────────────

SID = "b9ab60d9-0000-4000-8000-000000000001"
T0 = 1777590000.0


def _stored_agent(**extra) -> dict:
    row = dict(agent_id="ad4c2f1e9b", session_id=SID, tool="claude-code", model="claude-opus-5-5", is_sidechain=1,
               started_at=T0, ended_at=T0 + 60, completed=1, input_tokens=0, output_tokens=0, cache_read_tokens=0,
               cache_creation_tokens=0, cost_usd=0.0, description="", spawn_depth=None, parent_agent_id="",
               parent_tool_use_id="", resolved_model="", status="", project="/work/repo", cwd="/work/repo",
               git_branch="main", worktree_path="", observed_at=T0 + 60)
    return {**row, **extra}


def test_the_store_view_gives_the_pass_the_stored_row_and_the_board_then_names_the_subagent(
        kusto_store, monkeypatch, tmp_path):
    from kusto_replay import LOCAL_NODE, FixtureWriter

    from aictl.ingesters import agent_meta_backfill

    monkeypatch.setattr(agent_meta_backfill, "local_node_id", lambda: LOCAL_NODE)
    kusto_store.insert("agents", **_stored_agent())
    kusto_store.insert("agents", **_stored_agent(agent_id="other", parent_tool_use_id="toolu_other"))
    kusto_store.insert("tool_invocations", ts=T0 - 1, session_id=SID, tool="claude-code", tool_name="Agent",
                       source="transcript", source_event_id="toolu_01Spawn", agent_id="", project="/work/repo",
                       dedup_key="spawn-1")
    kusto_store.insert("tool_invocations_text", dedup_key="spawn-1", project="/work/repo",
                       input=json.dumps({"description": "Fix the meta gap", "subagent_type": "general-purpose",
                                         "prompt": "Do it"}), target="")
    projects = tmp_path / "projects"
    transcript = projects / "-work-repo" / SID / "subagents" / "agent-ad4c2f1e9b.jsonl"
    transcript.parent.mkdir(parents=True)
    transcript.write_text("", encoding="utf-8")
    put_meta(transcript, {"agentType": "general-purpose", "description": "Fix the meta gap",
                          "toolUseId": "toolu_01Spawn"})
    facts = Facts(FixtureWriter(kusto_store.facts))
    pass_owner = SimpleNamespace(session_facts=facts, history_store=kusto_store.history_store)
    assert agent_meta_backfill.run(pass_owner, StateFile(tmp_path / "pass.json"), lambda: ingester(facts, projects))

    assert [r["agent_id"] for _, name, rows in facts.writer.memory.operations if name == "agents" for r in rows] == [
        "ad4c2f1e9b"]
    rows = kusto_store.history_store.reader.read("board.agents", {
        "all_nodes": False, "requested_node": LOCAL_NODE, "session_keys": [f"{len(LOCAL_NODE)}:{LOCAL_NODE}{SID}"],
        "limit": 100}).rows
    subs = {(r["session_id"], r["agent_id"]): r for r in rows if r["row_kind"] == "agent"}
    spawns = [r for r in rows if r["row_kind"] == "spawn"]
    key = (SID, "ad4c2f1e9b")
    assert (subs[key]["parent_tool_use_id"], subs[key]["model"], subs[key]["completed"]) == (
        "toolu_01Spawn", "claude-opus-5-5", 1)
    spawn = subagents.match_spawns(subs, spawns)[key]
    assert subagents.subagent_name({**subs[key], "description": ""}, spawn, "ad4c2f1e") == ("Fix the meta gap", "caller")
    assert subagents.subagent_name(subs[key], spawn, "ad4c2f1e") == ("Fix the meta gap", "description")


# ── Wiring ────────────────────────────────────────────────────────────


def test_the_pass_reads_rows_it_can_write_whole():
    """The upsert replaces the row, so the view returns every column the writer takes, and no other."""
    from aictl.stores.kusto.reader import _VIEWS

    params, fields = _VIEWS["agents.stored"]
    table = TABLES["agents"]
    assert set(fields.split()) == {name for name, _ in table.columns} - {"node_id", table.version, table.tombstone}
    assert set(params.split()) == {"all_nodes", "requested_node", "session_keys"}


def test_a_start_runs_the_pass_and_a_new_node_records_it_as_done(monkeypatch, tmp_path):
    from aictl.dashboard import ingester_runner
    from aictl.ingesters import agent_meta_backfill

    store = SimpleNamespace(restart_dir=tmp_path, history_store=SimpleNamespace(writer=None), session_facts=Facts())
    ingester_runner._backfill_transcripts(store, new_node=True)
    assert StateFile(tmp_path / "agent_meta_backfill.json").read()[agent_meta_backfill.STATE_KEY] > 0

    ran = []
    monkeypatch.setattr(agent_meta_backfill, "run", lambda target, state: ran.append(target))
    for name in ("tool_size_backfill", "loaded_files_backfill", "context_items_backfill", "session_titles"):
        monkeypatch.setattr(getattr(ingester_runner, name), "run", lambda *args, **kwargs: True)
    monkeypatch.setattr(ingester_runner, "BACKFILL_DELAY_S", 0.0)
    ingester_runner._backfill_transcripts(store, new_node=False)
    assert ran == [store]


assert NOW  # the shared fixtures' clock
