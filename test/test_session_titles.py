"""Session names: where each tool keeps them, which name wins, and what is stored."""

from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from types import SimpleNamespace

from aictl.dashboard.ingester_runner import _backfill_transcripts
from aictl.dashboard.session_record import _match_of, _project_search_page
from aictl.ingesters import session_titles
from aictl.ingesters.session_titles import (
    CodexTitles,
    CopilotTitles,
    best_title,
    chat_title,
    claude_title,
    clean_title,
    outranks,
    read_claude_titles,
)
from aictl.ingesters.transcript_usage import ClaudeAccumulator, TranscriptUsageIngester
from aictl.records import SessionRow
from aictl.session_facts import SessionFacts
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter

SID = "11111111-2222-3333-4444-555555555555"
OTHER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def _facts(keeps_text: bool = True) -> SessionFacts:
    return SessionFacts(MemoryWriter(), keeps_text=lambda: keeps_text)


def _row(sid: str = SID, title: str = "", source: str = "", row_source: str = "transcript", **extra) -> SessionRow:
    return SessionRow(sid, "claude-code", started_at=100.0, source=row_source, title=title, title_source=source, **extra)


def _stored(facts: SessionFacts, sid: str = SID) -> dict:
    return [r for r in facts.writer.written("sessions") if r["session_id"] == sid][-1]


def _jsonl(path: Path, lines: list[dict]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
    return path


def _assistant(ts: str = "2026-11-01T10:00:00Z") -> dict:
    return {"type": "assistant", "timestamp": ts, "requestId": "r1", "cwd": "/work/proj",
            "message": {"id": "m1", "model": "claude-opus-5-5", "usage": {"input_tokens": 3, "output_tokens": 4}}}


# ─── The rule ─────────────────────────────────────────────────────


class TestRule:
    def test_a_higher_source_replaces_and_a_lower_one_does_not(self):
        assert outranks("from prompt", "prompt", "from tool", "tool")
        assert outranks("from tool", "tool", "by user", "user")
        assert not outranks("by user", "user", "from tool", "tool")
        assert not outranks("from tool", "tool", "from prompt", "prompt")

    def test_the_same_source_takes_the_latest_text_and_ignores_a_repeat(self):
        assert outranks("old", "user", "new", "user")
        assert not outranks("same", "user", "same", "user")

    def test_an_empty_name_or_an_unknown_source_never_replaces(self):
        assert not outranks("kept", "tool", "", "user")
        assert not outranks("kept", "tool", "text", "mystery")
        assert outranks("", "", "first", "prompt")

    def test_best_title_follows_the_order_the_names_are_met_in(self):
        assert best_title([("a", "tool"), ("b", "user"), ("c", "tool"), ("d", "prompt")]) == ("b", "user")
        assert best_title([("a", "user"), ("b", "user")]) == ("b", "user")
        assert best_title([]) == ("", "")

    def test_a_title_is_one_line_of_at_most_120_characters(self):
        text = clean_title("line one\nline\ttwo " + "x" * 300)
        assert "\n" not in text and "\t" not in text and len(text) == 120 and text.endswith("...")
        assert clean_title(None) == "" and clean_title(5) == ""


# ─── What is stored ───────────────────────────────────────────────


class TestMerge:
    def test_names_are_taken_by_source_and_a_rename_wins(self):
        facts = _facts()
        facts.session(_row(title="what I typed first", source="prompt"))
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("what I typed first", "prompt")
        facts.session(_row(title="Tool summary", source="tool"))
        assert _stored(facts)["title_source"] == "tool"
        facts.session(_row(title="My name", source="user"))
        facts.session(_row(title="Tool again", source="tool"))
        facts.session(_row(title="later prompt", source="prompt"))
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("My name", "user")
        facts.session(_row(title="Renamed", source="user"))
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("Renamed", "user")

    def test_an_empty_name_never_clears_a_stored_one_and_a_repeat_writes_nothing(self):
        facts = _facts()
        facts.session(_row(title="Named", source="user"))
        written = len(facts.writer.written("sessions"))
        facts.session(_row(title="Named", source="user"))
        facts.session(_row(input_tokens=5))
        assert len(facts.writer.written("sessions")) == written + 1  # only the counter changed
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("Named", "user")

    def test_a_session_row_from_otel_carries_no_name(self):
        facts = _facts()
        facts.session(_row(title="Named", source="user", row_source="otel"))
        assert _stored(facts)["title"] == ""
        facts.session(_row(title="Named", source="user"))
        facts.session(_row(title="Other", source="user", row_source="otel"))
        assert _stored(facts)["title"] == "Named"

    def test_a_name_made_from_prompt_text_is_stored_only_while_text_is_kept(self):
        off, on = _facts(keeps_text=False), _facts(keeps_text=True)
        for facts in (off, on):
            facts.session(_row(title="secret prompt words", source="prompt"))
            facts.session(_row(title="Tool summary", source="tool", input_tokens=1))
        assert _stored(off)["title"] == "Tool summary" and _stored(on)["title"] == "Tool summary"
        assert "secret prompt words" not in json.dumps(off.writer.written("sessions"))
        assert "secret prompt words" in json.dumps(on.writer.written("sessions"))

    def test_the_names_of_known_sessions_are_set_and_unknown_ones_are_returned(self):
        facts = _facts()
        facts.session(_row(input_tokens=9))
        unknown = facts.titles({SID: ("Named", "user"), OTHER: ("Lost", "user")})
        assert unknown == {OTHER}
        assert _stored(facts)["title"] == "Named" and _stored(facts)["input_tokens"] == 9
        written = len(facts.writer.written("sessions"))
        assert facts.titles({SID: ("Named", "user"), "x": ("t", "tool")}) == {"x"}
        assert len(facts.writer.written("sessions")) == written

    def test_a_late_name_does_not_pass_the_keep_text_gate_either(self):
        facts = _facts(keeps_text=False)
        facts.session(_row())
        facts.titles({SID: ("prompt words", "prompt")})
        assert _stored(facts)["title"] == ""

    def test_names_survive_a_restart_through_the_saved_state(self, tmp_path):
        state = StateFile(tmp_path / "sessions.json")
        first = SessionFacts(MemoryWriter(), state=state)
        first.session(_row(title="Named", source="user"))
        first.save()
        second = SessionFacts(MemoryWriter(), state=state)
        second.session(_row(title="Tool", source="tool", input_tokens=1))
        assert _stored(second)["title"] == "Named"


# ─── Claude Code ──────────────────────────────────────────────────


CLAUDE_LINES = [
    {"type": "ai-title", "aiTitle": "Tool made this", "sessionId": SID},
    {"type": "last-prompt", "lastPrompt": "the last thing I asked", "sessionId": SID},
    {"type": "custom-title", "customTitle": "My name for it", "sessionId": SID},
    {"type": "agent-name", "agentName": "My name for it (agent)", "sessionId": SID},
]


class TestClaude:
    def test_each_line_type_gives_its_text_and_source(self):
        assert [claude_title(line) for line in CLAUDE_LINES] == [
            ("Tool made this", "tool"), ("the last thing I asked", "prompt"),
            ("My name for it", "user"), ("My name for it (agent)", "user"),
        ]
        assert claude_title({"type": "assistant"}) is None
        assert claude_title({"type": "ai-title", "aiTitle": "  "}) is None

    def test_the_accumulator_keeps_the_winning_name_per_session(self):
        acc = ClaudeAccumulator()
        for line in CLAUDE_LINES[:3]:
            acc.feed(SID, line)
        acc.feed(SID, {"type": "ai-title", "aiTitle": "Later tool title"})
        usage = acc.sessions[SID]
        assert (usage.title, usage.title_source) == ("My name for it", "user")

    def test_a_scan_reads_only_the_name_lines(self, tmp_path):
        path = _jsonl(tmp_path / "p" / f"{SID}.jsonl", [_assistant(), *CLAUDE_LINES])
        with path.open("a", encoding="utf-8") as fh:
            fh.write('{"type":"custom-title","customTitle":"half written')  # no newline: not read
        assert read_claude_titles(path) == ("My name for it (agent)", "user")
        assert read_claude_titles(tmp_path / "missing.jsonl") == ("", "")

    def test_the_reader_stores_the_name_and_picks_up_a_rename_in_a_growing_file(self, tmp_path):
        facts = _facts()
        root = tmp_path / "projects"
        path = _jsonl(root / "p" / f"{SID}.jsonl", [_assistant(), CLAUDE_LINES[0], CLAUDE_LINES[1]])
        ing = TranscriptUsageIngester(facts, claude_projects=root, codex_sessions=tmp_path / "c",
                                      copilot_state=tmp_path / "cp" / "session-state", vscode_workspaces=tmp_path / "v")
        ing.poll()
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("Tool made this", "tool")
        os.utime(path, (time.time() + 5, time.time() + 5))
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"type": "custom-title", "customTitle": "Renamed by me"}) + "\n")
        ing.poll()
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("Renamed by me", "user")
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"type": "custom-title", "customTitle": "Renamed again"}) + "\n")
        ing.poll()
        assert _stored(facts)["title"] == "Renamed again"

    def test_a_prompt_name_waits_for_text_retention(self, tmp_path):
        facts = _facts(keeps_text=False)
        root = tmp_path / "projects"
        _jsonl(root / "p" / f"{SID}.jsonl", [_assistant(), CLAUDE_LINES[1]])
        TranscriptUsageIngester(facts, claude_projects=root, codex_sessions=tmp_path / "c",
                                copilot_state=tmp_path / "cp" / "session-state", vscode_workspaces=tmp_path / "v").poll()
        assert _stored(facts)["title"] == ""


# ─── GitHub Copilot ───────────────────────────────────────────────


def _copilot_home(tmp_path: Path) -> Path:
    home = tmp_path / ".copilot"
    state = home / "session-state"
    for sid, yaml in {
        "user-named": "id: user-named\nname: My own name\nuser_named: true\n",
        "tool-named": "id: tool-named\nname: Tool made name\nuser_named: false\n",
        "block": "id: block\nname: |-\n  first line\n  second line\nuser_named: false\ncwd: /x\n",
        "quoted": "id: quoted\nname: 'It''s a long\n  quoted name'\nuser_named: true\n",
        "unnamed": "id: unnamed\ncwd: /x\n",
    }.items():
        (state / sid).mkdir(parents=True)
        (state / sid / "workspace.yaml").write_text(yaml, encoding="utf-8")
    con = sqlite3.connect(home / "session-store.db")
    con.execute("CREATE TABLE sessions(id TEXT PRIMARY KEY, summary TEXT)")
    con.executemany("INSERT INTO sessions VALUES(?,?)", [("unnamed", "Summary of it"), ("user-named", "ignored summary"),
                                                         ("only-store", "Store only")])
    con.commit()
    con.close()
    return home


class TestCopilot:
    def test_workspace_names_and_store_summaries_are_read_with_their_sources(self, tmp_path):
        home = _copilot_home(tmp_path)
        found = CopilotTitles(home / "session-state", home / "session-store.db").read()
        assert found == {
            "user-named": ("My own name", "user"),
            "tool-named": ("Tool made name", "tool"),
            "block": ("first line second line", "tool"),
            "quoted": ("It's a long quoted name", "user"),
            "unnamed": ("Summary of it", "tool"),
            "only-store": ("Store only", "tool"),
        }

    def test_a_file_is_read_again_only_when_it_changed(self, tmp_path):
        home = _copilot_home(tmp_path)
        reader = CopilotTitles(home / "session-state", home / "session-store.db")
        reader.read()
        assert reader.read() == {}
        yaml = home / "session-state" / "tool-named" / "workspace.yaml"
        yaml.write_text("id: tool-named\nname: Renamed by me\nuser_named: true\n", encoding="utf-8")
        assert reader.read() == {"tool-named": ("Renamed by me", "user")}
        con = sqlite3.connect(home / "session-store.db")
        con.execute("UPDATE sessions SET summary = 'New summary' WHERE id = 'unnamed'")
        con.commit()
        con.close()
        assert reader.read() == {"unnamed": ("New summary", "tool")}

    def test_a_missing_home_gives_nothing(self, tmp_path):
        assert CopilotTitles(tmp_path / "a" / "session-state", tmp_path / "a" / "session-store.db").read() == {}


# ─── Codex ────────────────────────────────────────────────────────


class TestCodex:
    def _home(self, tmp_path: Path) -> Path:
        home = tmp_path / ".codex"
        home.mkdir()
        con = sqlite3.connect(home / "state_5.sqlite")
        con.execute("CREATE TABLE threads(id TEXT PRIMARY KEY, title TEXT, name TEXT, first_user_message TEXT)")
        con.executemany("INSERT INTO threads VALUES(?,?,?,?)", [
            ("named", "first words", "Mine", "first words"),
            ("generated", "A generated title", None, "first words"),
            ("from-prompt", "first words", "", "first words"),
            ("empty", "", None, ""),
        ])
        con.commit()
        con.close()
        (home / "session_index.jsonl").write_text(
            json.dumps({"id": "indexed", "thread_name": "In the index", "updated_at": "x"}) + "\n"
            + json.dumps({"id": "named", "thread_name": "Index wins", "updated_at": "x"}) + "\nnot json\n", encoding="utf-8")
        return home

    def test_names_come_from_the_threads_table_and_the_index(self, tmp_path):
        found = CodexTitles(self._home(tmp_path)).read()
        assert found == {
            "named": ("Index wins", "user"), "generated": ("A generated title", "tool"),
            "from-prompt": ("first words", "prompt"), "indexed": ("In the index", "user"),
        }

    def test_nothing_is_read_again_until_a_file_changes(self, tmp_path):
        home = self._home(tmp_path)
        reader = CodexTitles(home)
        reader.read()
        assert reader.read() == {}
        with (home / "session_index.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"id": "generated", "thread_name": "Now named"}) + "\n")
        assert reader.read() == {"generated": ("Now named", "user")}

    def test_a_missing_home_gives_nothing(self, tmp_path):
        assert CodexTitles(tmp_path / "none").read() == {}


# ─── VS Code chat ─────────────────────────────────────────────────


class TestVSCodeChat:
    def test_the_header_and_a_patch_line_both_set_the_name(self):
        assert chat_title({"kind": 0, "v": {"customTitle": "Header name", "requests": []}}) == "Header name"
        assert chat_title({"kind": 1, "k": ["customTitle"], "v": "Patched name"}) == "Patched name"
        assert chat_title({"kind": 1, "k": ["requests", 0, "result"], "v": {"customTitle": "no"}}) == ""
        assert chat_title({"kind": 2, "k": ["requests"], "v": [{"customTitle": "no"}]}) == ""

    def _poll(self, tmp_path, lines, facts):
        ws = tmp_path / "workspaceStorage" / "hash"
        _jsonl(ws / "chatSessions" / f"{OTHER}.jsonl", lines)
        result = {"kind": 1, "k": ["requests", 0, "result"], "v": {"metadata": {"promptTokens": 7, "outputTokens": 3}}}
        with (ws / "chatSessions" / f"{OTHER}.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(result) + "\n")
        ing = TranscriptUsageIngester(facts, claude_projects=tmp_path / "n1", codex_sessions=tmp_path / "n2",
                                      copilot_state=tmp_path / "n3" / "session-state",
                                      vscode_workspaces=tmp_path / "workspaceStorage")
        ing.poll()
        return ing

    def test_the_chat_row_the_board_lists_carries_the_name(self, tmp_path):
        facts = _facts()
        self._poll(tmp_path, [{"kind": 0, "v": {"sessionId": OTHER, "customTitle": "Chat name", "requests": []}},
                              {"kind": 1, "k": ["customTitle"], "v": "Chat renamed"}], facts)
        assert (_stored(facts, OTHER)["title"], _stored(facts, OTHER)["title_source"]) == ("Chat renamed", "user")

    def test_the_one_time_scan_finds_the_name_in_a_chat_file(self, tmp_path):
        ws = tmp_path / "workspaceStorage" / "hash"
        _jsonl(ws / "chatSessions" / f"{OTHER}.jsonl",
               [{"kind": 0, "v": {"sessionId": OTHER, "customTitle": "Chat name", "requests": []}}])
        ing = TranscriptUsageIngester(None, claude_projects=tmp_path / "n1", codex_sessions=tmp_path / "n2",
                                      copilot_state=tmp_path / "n3" / "session-state",
                                      vscode_workspaces=tmp_path / "workspaceStorage")
        assert ing.scan_titles() == {OTHER: ("Chat name", "user")}


# ─── Names kept outside the transcripts, in the reader ────────────


class TestExternalNames:
    def _reader(self, tmp_path, facts):
        return TranscriptUsageIngester(facts, claude_projects=tmp_path / "n1", codex_sessions=tmp_path / ".codex" / "sessions",
                                       copilot_state=tmp_path / ".copilot" / "session-state",
                                       vscode_workspaces=tmp_path / "v")

    def test_a_copilot_name_reaches_a_session_stored_before_it_was_read(self, tmp_path):
        facts = _facts()
        home = _copilot_home(tmp_path)
        facts.session(SessionRow("tool-named", "copilot-cli", started_at=5.0, source="transcript", input_tokens=1))
        ing = self._reader(tmp_path, facts)
        ing.poll()
        assert (_stored(facts, "tool-named")["title"], _stored(facts, "tool-named")["title_source"]) == ("Tool made name", "tool")
        assert ing._title_retry == {"user-named", "block", "quoted", "unnamed", "only-store"}
        # The next sessions are stored later: their names go out then, with no new file change.
        facts.session(SessionRow("user-named", "copilot-cli", started_at=5.0, source="transcript"))
        ing.poll()
        assert _stored(facts, "user-named")["title"] == "My own name"
        (home / "session-state" / "tool-named" / "workspace.yaml").write_text(
            "id: tool-named\nname: Renamed\nuser_named: true\n", encoding="utf-8")
        ing.poll()
        assert (_stored(facts, "tool-named")["title"], _stored(facts, "tool-named")["title_source"]) == ("Renamed", "user")


# ─── The one-time pass for sessions stored before ─────────────────


class TestBackfill:
    def _ingester(self, tmp_path, facts):
        return lambda: TranscriptUsageIngester(None, claude_projects=tmp_path / "projects", codex_sessions=tmp_path / "n2",
                                               copilot_state=tmp_path / "n3" / "session-state",
                                               vscode_workspaces=tmp_path / "n4", fact_target=facts)

    def test_stored_sessions_get_their_names_once_without_a_new_row_for_others(self, tmp_path):
        facts = _facts()
        facts.session(_row(input_tokens=3))
        _jsonl(tmp_path / "projects" / "p" / f"{SID}.jsonl", [_assistant(), *CLAUDE_LINES])
        _jsonl(tmp_path / "projects" / "p" / f"{OTHER}.jsonl", [_assistant(), CLAUDE_LINES[0]])
        _jsonl(tmp_path / "projects" / "p" / SID / "subagents" / "agent-x.jsonl", [CLAUDE_LINES[0]])
        state = StateFile(tmp_path / "session_titles.json")
        assert session_titles.run(facts, state, self._ingester(tmp_path, facts)) is True
        assert (_stored(facts)["title"], _stored(facts)["title_source"]) == ("My name for it (agent)", "user")
        assert _stored(facts)["input_tokens"] == 3
        assert not [r for r in facts.writer.written("sessions") if r["session_id"] == OTHER]
        written = len(facts.writer.written("sessions"))

        def refuse():
            raise AssertionError("the pass ran twice")

        assert session_titles.run(facts, state, refuse) is True
        assert len(facts.writer.written("sessions")) == written
        assert state.read()[session_titles.STATE_KEY] > 0

    def test_a_new_node_records_the_pass_as_done_and_reads_no_file(self, tmp_path):
        store = SimpleNamespace(restart_dir=tmp_path, history_store=SimpleNamespace(writer=None),
                                session_facts=_facts())
        _backfill_transcripts(store, new_node=True)
        assert StateFile(tmp_path / "session_titles.json").read()[session_titles.STATE_KEY] > 0


# ─── What the search returns and the board shows ──────────────────


def _hit(**extra) -> dict:
    return dict(session_id=SID, tool="claude-code", project="/work/proj", started_at=100.0, ended_at=None, **extra)


class TestSearchPage:
    def _page(self, data, first_prompt=None):
        return _project_search_page({SID: SID}, {SID: [SID]}, {SID: data}, first_prompt or {})[SID]

    def test_the_stored_name_is_shown_before_the_first_prompt_and_says_who_gave_it(self):
        row = self._page(_hit(name="Stored name", name_source="user"), {SID: (1.0, "first prompt words")})
        assert (row["title"], row["title_source"]) == ("Stored name", "user")

    def test_a_name_of_120_characters_is_not_cut_to_80(self):
        row = self._page(_hit(name="n" * 120, name_source="tool"))
        assert row["title"] == "n" * 120

    def test_without_a_stored_name_the_old_fallbacks_stay(self):
        row = self._page(_hit(name="", name_source=""), {SID: (1.0, "first prompt words")})
        assert (row["title"], row["title_source"]) == ("first prompt words", "prompt")
        row = self._page(_hit())
        assert row["title"].endswith("proj") and row["title_source"] == ""

    def test_a_hit_in_the_session_id_is_reported_as_the_id(self):
        assert _match_of("Some title", [(6, SID)], SID[:8].upper(), [SID]) == ("id", SID)
        assert _match_of("Find Me", [], "find", [SID]) == ("title", "Find Me")


def test_the_search_query_matches_the_stored_name_and_the_session_id_and_returns_both():
    from aictl.stores.kusto.reader import KustoReader

    seen = {}

    def execute(_database, text, props):
        seen["text"], seen["search_text"] = text, props.get_parameter("search_text", None)
        table = [("item", 1, "n1", SID, [{"session_id": SID, "name": "Found by name", "name_source": "user"}])]
        table = type("Table", (list,), {})(table)
        table.columns = [SimpleNamespace(column_name=n, column_type="string")
                         for n in ("row_type", "total", "node_id", "session_id", "data")]
        return SimpleNamespace(primary_results=[table])

    rows = KustoReader(SimpleNamespace(execute_query=execute), "db").read("sessions.search", {"search_text": "needle"}).rows
    assert seen["search_text"] == "needle" and "needle" not in seen["text"]
    assert "['title'] contains search_text" in seen["text"] and "session_id contains search_text" in seen["text"]
    assert "'name',['title'],'name_source',title_source" in seen["text"]
    assert rows[0]["data"][0]["name"] == "Found by name"
