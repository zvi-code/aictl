"""Reader versions: a file last read by a lower reader version is read again from its start.

The upgrade path for session history: a reader that learns a record type, or a store that
stops dropping rows, gets its rows for old sessions too. A re-read writes the keys a first
read writes, waits behind new and changed files, shares each poll's bytes fairly between the
tools, and survives a crash. Invented lines in temporary folders only.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from test_board_facts import (
    COPILOT_SID,
    MODEL,
    NOW,
    SESSION,
    c_assistant,
    c_user,
    chat_file,
    chat_request,
    claude_path,
    copilot_events,
    debug_dir,
    ev,
    iso,
    make_store,
    usage_record,
    v_line,
    workspace_json,
    write_lines,
)
from test_codex_zstd_rollouts import NAME as CODEX_NAME
from test_codex_zstd_rollouts import encode as codex_encode
from test_codex_zstd_rollouts import lines as codex_lines
from test_session_investigation import Facts, claude_session, copilot_session, ingester

from aictl.ingesters import transcript_usage
from aictl.ingesters.transcript_usage import READER_VERSIONS, reader_kind
from aictl.state_file import StateFile
from aictl.stores.base import StoreError
from aictl.stores.kusto.tables import TABLES

DAY = 86400.0
# The tables the fact readers fill (sessions and usage are totals, keyed by session).
FACT_TABLES = ("requests", "tool_invocations", "session_prompts", "session_turns", "session_digests",
               "session_outcomes", "agents", "context_events", "session_files")


def keys(facts: Facts) -> dict[str, set[tuple]]:
    """Per table, the keys of the rows written (a row written again under its key is the same row)."""
    found: dict[str, set[tuple]] = {}
    for op, name, rows in facts.writer.operations:
        if op == "delete" or name not in TABLES:
            continue
        key = TABLES[name].key
        found.setdefault(name, set()).update(tuple(str(row.get(k)) for k in key) for row in rows)
    return found


def every_tool(root) -> None:
    claude_session(root)
    copilot_session(root)
    workspace_json(root)
    write_lines(debug_dir(root) / "main.jsonl", [
        v_line("user_message", 500, "u1", content="please refactor"),
        v_line("llm_request", 490, "l1", model=MODEL, inputTokens=100, outputTokens=20, cachedTokens=60),
        v_line("tool_call", 470, "t2", name="read_file", args=json.dumps({"filePath": "/work/vs/a.py"})),
    ])
    write_lines(chat_file(root, "66666666-6666-4666-8666-666666666666"), [
        {"kind": 0, "v": {"sessionId": "66666666-6666-4666-8666-666666666666",
                          "requests": [chat_request("r1", 300, "explain the parser")]}}])
    rollout = root / "codex" / "2026" / "11" / "05" / f"{CODEX_NAME}.jsonl"
    rollout.parent.mkdir(parents=True)
    rollout.write_bytes(codex_encode(codex_lines()))


def as_older_aictl(state: StateFile) -> None:
    """The saved positions as an aictl before reader versions saved them: (mtime, size) only."""
    data = state.read()
    for entry in data.values():
        entry["files"] = {path: sig[:2] for path, sig in entry["files"].items()}
        entry.pop("copilot_store_version", None)
        entry.pop("metadata_version", None)
    state.replace(data)


def bump(monkeypatch, *kinds: str) -> None:
    for kind in kinds or READER_VERSIONS:
        monkeypatch.setitem(READER_VERSIONS, kind, READER_VERSIONS[kind] + 1)


def test_every_session_file_has_a_reader_kind_with_a_version(tmp_path):
    every_tool(tmp_path)
    ing = ingester(Facts(), tmp_path)
    ing.poll()
    kinds = {reader_kind(tool, path) for path, (tool, _, _) in ing._found.items()}
    assert kinds == set(READER_VERSIONS) - {"copilot-store", "session-metadata"}
    assert all(type(v) is int and v >= 1 for v in READER_VERSIONS.values())


def test_a_newer_reader_reads_every_file_again_and_writes_the_same_keys(tmp_path, monkeypatch):
    every_tool(tmp_path)
    state = StateFile(tmp_path / "state" / "transcript_usage.json")
    first = Facts()
    ingester(first, tmp_path, checkpoint=state).poll()
    before = keys(first)
    assert all(before.get(name) for name in FACT_TABLES), {n: len(before.get(n, ())) for n in FACT_TABLES}

    unchanged = Facts()
    ingester(unchanged, tmp_path, checkpoint=state).poll()
    assert not any(keys(unchanged).get(name) for name in ("session_prompts", "session_turns", "session_digests"))

    bump(monkeypatch)
    again = Facts()
    ingester(again, tmp_path, checkpoint=state).poll()
    after = keys(again)
    # Every row comes again under the key it had: an upsert, never a second row.
    for name in before:
        assert after.get(name) == before[name], name
    saved = next(iter(state.read().values()))["files"]
    assert saved and all(sig[2] == READER_VERSIONS[reader_kind(_tool_of(p), Path(p))] for p, sig in saved.items())

    # Read by the current version: the next start writes nothing again.
    later = Facts()
    ingester(later, tmp_path, checkpoint=state).poll()
    assert not keys(later).get("session_prompts")


def _tool_of(path: str) -> str:
    if "claude" in path:
        return "claude-code"
    if "codex" in path:
        return "codex-cli"
    return "copilot-cli" if path.endswith("events.jsonl") else "copilot-vscode"


def test_only_the_kind_whose_version_rose_is_read_again(tmp_path, monkeypatch):
    every_tool(tmp_path)
    state = StateFile(tmp_path / "state" / "transcript_usage.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    bump(monkeypatch, "copilot-events")
    again = Facts()
    ingester(again, tmp_path, checkpoint=state).poll()
    prompts = {row["session_id"] for row in again.writer.written("session_prompts")}
    assert prompts == {COPILOT_SID}


class _OldStore(Facts):
    """The store of an aictl before 2cd9ee2a: prompts older than 14 days were not written."""

    def __init__(self) -> None:
        super().__init__()
        self.retention["prompt"] = 14 * 24


def old_claude_session(root) -> None:
    write_lines(claude_path(root), [
        c_user("first old prompt", 20 * DAY, promptId="p1"),
        c_assistant("m1", "r1", 20 * DAY - 5),
        c_user("second old prompt", 19 * DAY, promptId="p2"),
        c_assistant("m2", "r2", 19 * DAY - 5),
    ])


def test_rows_an_older_aictl_left_out_are_written_when_the_reader_version_rises(tmp_path):
    # The cause of the missing prompts: an older store dropped prompts older than 14 days, the
    # file was saved as read, and a restart read it again only to rebuild its totals.
    old_claude_session(tmp_path)
    state = StateFile(tmp_path / "state" / "transcript_usage.json")
    first = _OldStore()
    ingester(first, tmp_path, checkpoint=state).poll()
    assert first.writer.written("session_prompts") == []
    assert len(first.writer.written("requests")) == 2

    os.utime(claude_path(tmp_path), (NOW - 60, NOW - 60))
    write_lines(claude_path(tmp_path), [c_user("a new prompt", 30, promptId="p3"), c_assistant("m3", "r3", 25)])
    restarted = Facts()
    ingester(restarted, tmp_path, checkpoint=state).poll()
    # Without a version the rows up to the saved size count as stored: only the new prompt comes.
    assert [row["text"] for row in restarted.writer.written("session_prompts")] == ["a new prompt"]

    as_older_aictl(state)
    upgraded = Facts()
    ingester(upgraded, tmp_path, checkpoint=state).poll()
    texts = [row["text"] for row in upgraded.writer.written("session_prompts")]
    assert sorted(texts) == ["a new prompt", "first old prompt", "second old prompt"]
    assert len(texts) == len(set(texts))


def _claude_segment(n: int, ago: float) -> list[dict]:
    pid = f"p{n}"
    return [
        c_user(f"prompt number {n}", ago, promptId=pid),
        c_assistant(f"m{n}", f"r{n}", ago - 2),
        {"type": "system", "subtype": "compact_boundary", "timestamp": iso(ago - 3), "sessionId": SESSION,
         "uuid": f"cb{n}", "compactMetadata": {"trigger": "auto", "preTokens": 1000, "postTokens": 100}},
        {**c_user(f"Summary of part {n}", ago - 4, promptId=pid), "isCompactSummary": True},
        {"type": "pr-link", "sessionId": SESSION, "prNumber": n, "prUrl": f"https://github.com/o/r/pull/{n}",
         "prRepository": "o/r", "timestamp": iso(ago - 5)},
    ]


def _copilot_segment(n: int, ago: float) -> list[dict]:
    first = [ev("session.start", ago + 1, {"context": {"cwd": "/work/cli"}})] if n == 1 else [
        ev("session.resume", ago + 1, {"context": {"cwd": "/work/cli"}, "eventCount": n})]
    return [*first,
            ev("user.message", ago, {"content": f"copilot prompt {n}", "interactionId": f"i{n}"}),
            usage_record(ago - 1, inp=100 + n, api=f"a{n}"),
            ev("session.task_complete", ago - 2, {"summary": f"Summary of task {n}"}),
            ev("session.shutdown", ago - 3, {"totalPremiumRequests": n})]


def _full_read(tmp_path, name, segments) -> dict[str, set[tuple]]:
    root = tmp_path / name
    for path, lines in segments:
        write_lines(path(root), lines)
    facts = Facts()
    ingester(facts, root).poll()
    return keys(facts)


def test_a_session_appended_to_across_restarts_stores_each_row_once(tmp_path):
    # The shape of a session resumed many times: the file grows between daemon runs, each run
    # saves its position at the end of the file and the next run reads it again from the start.
    claude = [(claude_path, _claude_segment(n, 5000 - 500 * n)) for n in range(1, 5)]
    copilot = [(copilot_events, _copilot_segment(n, 5000 - 500 * n)) for n in range(1, 5)]
    whole = _full_read(tmp_path, "whole", [*claude, *copilot])
    root = tmp_path / "appended"
    state = StateFile(tmp_path / "state.json")
    seen: dict[str, list[tuple]] = {}
    for n in range(4):
        for path, lines in (claude[n], copilot[n]):
            write_lines(path(root), lines)
        facts = Facts()
        ingester(facts, root, checkpoint=state).poll()
        for op, name, rows in facts.writer.operations:
            if op != "delete" and name in ("session_prompts", "session_digests"):
                seen.setdefault(name, []).extend(tuple(str(r.get(k)) for k in TABLES[name].key) for r in rows)
        for name, found in keys(facts).items():
            seen.setdefault(f"keys:{name}", []).extend(found)
    assert len(whole["session_prompts"]) == 8
    for name in ("session_prompts", "session_digests"):
        # Each prompt and digest written once over the four runs, and none missing.
        assert sorted(seen[name]) == sorted(whole[name]), name
    for name in ("session_turns", "session_outcomes", "requests"):
        assert set(seen[f"keys:{name}"]) == whole[name], name


class _FailingWrites(Facts):
    """A store that goes offline after a number of fact batches."""

    def __init__(self, batches: int) -> None:
        super().__init__()
        self.left = batches

    def write_call_facts(self, facts):
        if self.left <= 0:
            raise StoreError("offline")
        self.left -= 1
        return super().write_call_facts(facts)


def test_a_crash_in_the_middle_of_a_re_read_resumes_without_loss_or_a_second_row(tmp_path, monkeypatch):
    for n in range(6):
        write_lines(copilot_events(tmp_path, f"cccccccc-0000-4000-8000-00000000000{n}"), _copilot_segment(1, 900 - n))
    state = StateFile(tmp_path / "state.json")
    first = Facts()
    ingester(first, tmp_path, checkpoint=state).poll()
    expected = keys(first)["session_prompts"]
    monkeypatch.setattr(transcript_usage, "PROGRESS_SAVE_S", 0.0)
    bump(monkeypatch, "copilot-events")
    crashed = _FailingWrites(batches=2)
    with pytest.raises(StoreError):
        ingester(crashed, tmp_path, checkpoint=state).poll()
    # The files whose rows were stored are saved as read by the new version; the rest are not.
    saved = next(iter(state.read().values()))["files"]
    done = {p for p, sig in saved.items() if sig[2] == READER_VERSIONS["copilot-events"]}
    assert 0 < len(done) < 6
    resumed = Facts()
    ingester(resumed, tmp_path, checkpoint=state).poll()
    stored = keys(crashed).get("session_prompts", set()) | keys(resumed).get("session_prompts", set())
    assert stored == expected
    # The resumed run read only the files the crashed run had not finished.
    assert len(keys(resumed)["session_prompts"]) == 6 - len(done)


def test_the_copilot_store_rows_are_written_again_when_its_reader_version_rises(tmp_path, monkeypatch):
    rows = [(COPILOT_SID, "", MODEL, 120, 30, 80, 10, 0, 1500, 400.0, None, "stop", iso(400 - i)) for i in range(3)]
    make_store(tmp_path, rows)
    state = StateFile(tmp_path / "state.json")
    first = Facts()
    ingester(first, tmp_path, checkpoint=state).poll()
    assert len(keys(first)["requests"]) == 3
    same = Facts()
    ingester(same, tmp_path, checkpoint=state).poll()
    assert not keys(same).get("requests")
    bump(monkeypatch, "copilot-store")
    again = Facts()
    ingester(again, tmp_path, checkpoint=state).poll()
    assert keys(again)["requests"] == keys(first)["requests"]
    later = Facts()
    ingester(later, tmp_path, checkpoint=state).poll()
    assert not keys(later).get("requests")


# ── The backlog: fair shares, newest first, progress ──────────────────


def _old(path, days: float) -> int:
    os.utime(path, (NOW - days * DAY, NOW - days * DAY))
    return path.stat().st_size


def backlog_tree(root) -> dict[str, list]:
    """Three Copilot and three Claude Code sessions, 3, 4 and 5 days old."""
    files: dict[str, list] = {"copilot-cli": [], "claude-code": []}
    for i, days in enumerate((3, 4, 5)):
        events = copilot_events(root, f"dddddddd-0000-4000-8000-00000000000{i}")
        write_lines(events, [ev("user.message", days * DAY, {"content": f"old copilot prompt {i}"}),
                             usage_record(days * DAY - 1)])
        files["copilot-cli"].append((events, _old(events, days)))
        claude = root / "claude" / "projects" / "-work" / f"eeeeeeee-0000-4000-8000-00000000000{i}.jsonl"
        write_lines(claude, [{**c_user(f"old claude prompt {i}", days * DAY), "sessionId": claude.stem},
                             {**c_assistant(f"o{i}", f"q{i}", days * DAY - 1), "sessionId": claude.stem}])
        files["claude-code"].append((claude, _old(claude, days)))
    return files


def _read_in(ing) -> set:
    return {p for p in ing._found if p not in ing._waiting and p in ing._offsets}


def test_each_tool_gets_its_share_of_a_poll_in_the_owner_s_order_newest_first(tmp_path, monkeypatch):
    files = backlog_tree(tmp_path)
    state = StateFile(tmp_path / "state.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    as_older_aictl(state)
    smallest = min(size for group in files.values() for _, size in group)
    monkeypatch.setattr(transcript_usage, "DEFERRED_BYTES_PER_POLL", 2 * smallest)
    ing = ingester(Facts(), tmp_path, checkpoint=state, defer_old=True)

    ing.poll()  # the first poll reads the recent files only
    status = ing.backlog_status()
    assert {tool: entry["reread_files_waiting"] for tool, entry in status.items()} == {"copilot-cli": 3, "claude-code": 3}
    assert status["claude-code"]["oldest_waiting"] == transcript_usage.local_day(NOW - 5 * DAY)
    assert status["copilot-cli"]["bytes_waiting"] == sum(size for _, size in files["copilot-cli"])

    for step in range(3):
        ing.poll()
        # One session of each tool per poll: Claude's backlog does not hold Copilot's back.
        newest = {tool: group[step][0] for tool, group in files.items()}
        assert all(path in ing._offsets for path in newest.values()), step
        waiting = {tool: entry["reread_files_waiting"] for tool, entry in ing.backlog_status().items()}
        assert waiting == ({"copilot-cli": 2 - step, "claude-code": 2 - step} if step < 2 else {})


def test_the_priority_order_decides_who_reads_when_a_poll_has_room_for_one(tmp_path, monkeypatch):
    files = backlog_tree(tmp_path)
    state = StateFile(tmp_path / "state.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    as_older_aictl(state)
    monkeypatch.setattr(transcript_usage, "DEFERRED_BYTES_PER_POLL", 1)
    ing = ingester(Facts(), tmp_path, checkpoint=state, defer_old=True)
    ing.poll()
    ing.poll()
    # Half a byte each: Copilot comes first in the owner's order and takes one file, Claude none.
    assert files["copilot-cli"][0][0] in ing._offsets
    assert not any(path in ing._offsets for path, _ in files["claude-code"])


def test_a_never_read_file_comes_before_a_file_to_read_again(tmp_path, monkeypatch):
    files = backlog_tree(tmp_path)
    state = StateFile(tmp_path / "state.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    as_older_aictl(state)
    new = copilot_events(tmp_path, "ffffffff-0000-4000-8000-000000000000")
    write_lines(new, [ev("user.message", 10 * DAY, {"content": "never read"})])
    _old(new, 10)
    monkeypatch.setattr(transcript_usage, "DEFERRED_BYTES_PER_POLL", 2)
    ing = ingester(Facts(), tmp_path, checkpoint=state, defer_old=True)
    ing.poll()
    assert ing.backlog_status()["copilot-cli"]["files_waiting"] == 4
    ing.poll()
    assert new in ing._offsets
    assert not any(path in ing._offsets for path, _ in files["copilot-cli"])


def test_a_poll_reads_no_more_backlog_than_its_bound_and_one_file_per_tool(tmp_path, monkeypatch):
    files = backlog_tree(tmp_path)
    state = StateFile(tmp_path / "state.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    as_older_aictl(state)
    budget = 3 * max(size for group in files.values() for _, size in group)
    monkeypatch.setattr(transcript_usage, "DEFERRED_BYTES_PER_POLL", budget)
    ing = ingester(Facts(), tmp_path, checkpoint=state, defer_old=True)
    ing.poll()
    ing.poll()
    read = sum(size for group in files.values() for path, size in group if path in ing._offsets)
    largest = max(size for group in files.values() for _, size in group)
    assert read <= budget + largest * len(files)


def test_the_status_record_carries_the_backlog_per_tool(tmp_path):
    class Quality:
        def __init__(self):
            self.events = []

        def record_data_quality(self, component, status, **kw):
            self.events.append(kw)

    backlog_tree(tmp_path)
    state = StateFile(tmp_path / "state.json")
    ingester(Facts(), tmp_path, checkpoint=state).poll()
    as_older_aictl(state)
    quality = Quality()
    ingester(Facts(), tmp_path, checkpoint=state, defer_old=True, quality=quality).poll()
    detail = quality.events[-1]["detail"]
    assert detail["older_files_waiting"] == 6
    assert set(detail["backlog"]) == {"copilot-cli", "claude-code"}
    assert set(detail["backlog"]["copilot-cli"]) == {"files_waiting", "bytes_waiting", "reread_files_waiting",
                                                     "reread_bytes_waiting", "oldest_waiting"}


# ── The Copilot call key ──────────────────────────────────────────────

# The folder make_store gives the session: a row's key holds its project, so both readers must see the same one.
START = [ev("session.start", 420, {"context": {"cwd": "/work/stored"}})]


def _store_and_events(root, store_rows, events) -> Facts:
    make_store(root, store_rows)
    write_lines(copilot_events(root), events)
    facts = Facts()
    ingester(facts, root).poll()
    return facts


def test_a_call_in_the_store_and_in_the_events_file_is_one_row_with_one_key(tmp_path):
    # Two calls with the same four token counts: the n-th of each reader is the same call.
    rows = [(COPILOT_SID, "", MODEL, 120, 30, 80, 10, 0, 1500, 400.0, None, "stop", iso(400 - i)) for i in range(2)]
    events = [*START, ev("user.message", 410, {"content": "hi"}), usage_record(400), usage_record(399)]
    facts = _store_and_events(tmp_path, rows, events)
    assert len(keys(facts)["requests"]) == 2
    again = Facts()
    ingester(again, tmp_path).poll()
    assert keys(again)["requests"] == keys(facts)["requests"]


def test_the_store_and_the_events_file_give_a_compaction_and_an_equal_call_the_same_keys(tmp_path):
    # A compaction call is written by the events reader at the end of its read, after the usage
    # records; the store lists calls in the order they were made. With equal token counts the
    # occurrence number decides the key, so each reader gives the n-th key to a different call.
    rows = [(COPILOT_SID, "", MODEL, 120, 30, 80, 10, 0, 900, 0.0, None, "compaction", iso(400)),
            (COPILOT_SID, "", MODEL, 120, 30, 80, 10, 0, 1500, 400.0, None, "stop", iso(300))]
    used = {"inputTokens": 120, "outputTokens": 30, "cacheReadTokens": 80, "cacheWriteTokens": 10, "model": MODEL}
    events = [*START, ev("user.message", 410, {"content": "hi"}),
              ev("session.compaction_complete", 400, {"compactionTokensUsed": used, "requestId": "c1", "success": True}),
              usage_record(300)]
    facts = _store_and_events(tmp_path, rows, events)
    by_key: dict[str, set[float]] = {}
    for row in facts.writer.written("requests"):
        by_key.setdefault(row["dedup_key"], set()).add(round(row["ts"]))
    assert len(by_key) == 2
    # Each key names one call: the same time from both readers.
    assert all(len(times) == 1 for times in by_key.values()), by_key
