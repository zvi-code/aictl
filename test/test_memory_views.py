"""The views that read memory changes, memory file versions and checkpoints, and the drawer fields built on them."""

from __future__ import annotations

import json

from kusto_replay import NOW

from aictl.dashboard.projections.history import HistoryScope

SID = "11111111-1111-4111-8111-111111111111"
OTHER = "99999999-9999-4999-8999-999999999999"
MEMORY = "/home/u/.claude/projects/-work-proj/memory/MEMORY.md"


def history(store) -> HistoryScope:
    return HistoryScope(store.history_store.reader, None)


def test_memory_changes_of_a_session_with_hashes_sizes_and_who(kusto_store):
    seed = kusto_store.insert
    seed("file_write_events", session_id=SID, ts=NOW - 50, dedup_key="w1", path=MEMORY, mechanism="claude_auto_memory",
         operation="edit", tool="claude-code", tool_name="Edit", agent_id="", actor="agent", prompt_id="p1",
         turn_index=1, lines_added=2, lines_removed=1, before_hash="b1", after_hash="a1", before_bytes=9,
         after_bytes=20, before_source="tool_result", after_source="file_at_ingest", source_event_id="tu-1")
    seed("file_write_events", session_id=SID, ts=NOW - 40, dedup_key="w2", path=MEMORY, mechanism="claude_auto_memory",
         operation="write", agent_id="sub9", actor="subagent", after_hash="a2", after_source="tool_input")
    seed("file_write_events", session_id=SID, ts=NOW - 30, dedup_key="w3", path="/work/proj/a.py", operation="edit")
    seed("file_write_events", session_id=OTHER, ts=NOW - 20, dedup_key="w4", path=MEMORY, mechanism="claude_auto_memory")
    rows = history(kusto_store).read("memory.changes", sid=SID)
    assert [r["key"] for r in rows] == ["w1", "w2"]
    first = rows[0]
    assert (first["before_hash"], first["after_hash"], first["before_bytes"], first["after_bytes"]) == ("b1", "a1", 9, 20)
    assert (first["actor"], first["prompt_id"], first["turn_index"], first["source_event_id"]) == ("agent", "p1", 1, "tu-1")
    sub = history(kusto_store).read("memory.changes", sid=SID, requested_agent="sub9")
    assert [r["key"] for r in sub] == ["w2"]


def test_the_versions_of_a_memory_file_across_sessions_in_time_order(kusto_store):
    seed = kusto_store.insert
    seed("file_history", path=MEMORY, ts=NOW - 300, blob_hash="v0", size_bytes=5)  # an inventory scan: actor unknown
    seed("file_write_events", session_id=SID, ts=NOW - 200, dedup_key="w1", path=MEMORY, mechanism="claude_auto_memory",
         actor="agent", after_hash="v1", after_bytes=7, before_hash="v0")
    seed("file_history", path=MEMORY, ts=NOW - 150, blob_hash="v1", session_id=OTHER, source_event_id="u-1",
         origin="claude_file_history", state="backup")
    seed("file_write_events", session_id=OTHER, ts=NOW - 100, dedup_key="w2", path=MEMORY,
         mechanism="claude_auto_memory", actor="outside_session", after_hash="v2")
    seed("file_write_events", session_id=SID, ts=NOW - 50, dedup_key="w3", path="/other.md")
    rows = history(kusto_store).read("memory.versions", requested_path=MEMORY)
    assert [(r["origin"], r["session_id"], r["actor"], r["content_hash"]) for r in rows] == [
        ("scan", "", "", "v0"),
        ("write_event", SID, "agent", "v1"),
        ("claude_file_history", OTHER, "", "v1"),
        ("write_event", OTHER, "outside_session", "v2"),
    ]


def test_the_diff_read_returns_the_two_contents(kusto_store):
    seed = kusto_store.insert
    seed("file_blobs", project="", hash="h-before", content="old line\n", size_bytes=9, created_at=NOW)
    seed("file_blobs", project="", hash="h-after", content="new line\n", size_bytes=9, created_at=NOW)
    seed("file_blobs", project="", hash="h-other", content="x", size_bytes=1, created_at=NOW)
    rows = history(kusto_store).read("memory.diff", first_hash="h-before", second_hash="h-after")
    assert {r["side"]: r["content"] for r in rows} == {"first": "old line\n", "second": "new line\n"}
    assert history(kusto_store).read("memory.diff", first_hash="h-before", second_hash="h-after", keep_text=False) == []


def test_the_checkpoints_of_a_session_with_their_summaries(kusto_store):
    seed = kusto_store.insert
    seed("context_events", session_id=SID, ts=NOW - 90, dedup_key="c1", kind="compaction", tool="claude-code",
         trigger="auto", before_tokens=9000, after_tokens=900, cumulative_dropped_tokens=8100, preserved_messages=4,
         summary_kind="compact_summary", summary_seq=1)
    seed("session_digests", session_id=SID, kind="compact_summary", seq=1, ts=NOW - 89, text="What was kept",
         text_bytes=13, event_key="c1")
    seed("context_events", session_id=SID, ts=NOW - 80, dedup_key="r1", kind="rewind_point", message_id="u-1",
         files_count=3, tool="claude-code", trigger="snapshot")
    seed("context_events", session_id=SID, ts=NOW - 70, dedup_key="m1", kind="memory_recall", path=MEMORY)
    rows = history(kusto_store).read("checkpoints.session", sid=SID)
    assert [r["kind"] for r in rows] == ["compaction", "rewind_point"]
    compaction, point = rows
    assert (compaction["summary"], compaction["summary_bytes"], compaction["cumulative_dropped_tokens"]) == (
        "What was kept", 13, 8100)
    assert (point["message_id"], point["files_count"], point["summary"]) == ("u-1", 3, "")


def test_the_files_a_rewind_point_covers(kusto_store):
    seed = kusto_store.insert
    seed("file_history", path="/work/proj/a.py", ts=NOW - 80, session_id=SID, source_event_id="u-1",
         origin="claude_file_history", state="backup", version=2)
    seed("file_history", path=MEMORY, ts=NOW - 80, session_id=SID, source_event_id="u-1",
         origin="claude_file_history", state="absent", mechanism="claude_auto_memory")
    seed("file_history", path=MEMORY, ts=NOW - 70, session_id=SID, source_event_id="u-1",
         origin="claude_file_history", state="backup", mechanism="claude_auto_memory", blob_hash="b1", version=1)
    seed("file_history", path="/work/proj/b.py", ts=NOW - 80, session_id=SID, source_event_id="u-2",
         origin="claude_file_history", state="backup")
    rows = history(kusto_store).read("checkpoints.files", sid=SID, requested_message="u-1")
    assert [(r["path"], r["state"], r["blob_hash"]) for r in rows] == [
        (MEMORY, "backup", "b1"), ("/work/proj/a.py", "backup", "")]


def test_the_drawer_carries_memory_changes_and_checkpoints(kusto_store):
    from aictl.dashboard import session_details

    seed = kusto_store.insert
    seed("sessions", session_id=SID, tool="claude-code", project_path="/work/proj", started_at=NOW - 100,
         ended_at=NOW - 10)
    seed("requests", session_id=SID, tool="claude-code", project_path="/work/proj", ts=NOW - 95, dedup_key="c0",
         model="m", input_tokens=10, output_tokens=1, source="transcript")
    seed("file_write_events", session_id=SID, project="/work/proj", ts=NOW - 50, dedup_key="w1", path=MEMORY,
         mechanism="claude_auto_memory", operation="edit", tool_name="Edit", actor="agent", after_hash="a1",
         after_source="file_at_ingest", source_event_id="tu-1")
    seed("context_events", session_id=SID, project="/work/proj", ts=NOW - 40, dedup_key="c1", kind="compaction",
         tool="claude-code", detail=json.dumps({"all_uuids": 9}), summary_kind="compact_summary", summary_seq=1)
    seed("session_digests", session_id=SID, project="/work/proj", kind="compact_summary", seq=1, ts=NOW - 39,
         text="Kept", text_bytes=4)
    status, body = session_details.agent_detail(kusto_store, SID, None, NOW)
    assert status == 200, body
    [change] = body["memory_changes"]
    assert (change["path"], change["actor"], change["after_hash"], change["tool_call_id"]) == (MEMORY, "agent", "a1", "tu-1")
    [checkpoint] = body["checkpoints"]
    assert checkpoint["detail"] == {"all_uuids": 9}
    assert checkpoint["summary"] == {"kind": "compact_summary", "seq": 1, "title": "", "text": "Kept", "hash": "",
                                     "bytes": 4}
    from test_contract import validate_detail

    validate_detail("/api/board/agent", body)


# The board's on-demand routes over these views (dashboard/memory_views.py).

CLAUDE_MD = "/work/proj/CLAUDE.md"


def _get(store, path, query, db=None):
    from test_contract import validate_detail

    from aictl.dashboard.board_routes import handle_get

    status, body = handle_get(path, query, db if db is not None else store, store, NOW)
    payload = json.loads(body)
    if status == 200:
        validate_detail(path, payload)
    return status, payload


def _scoped(store, path, **params):
    from test_contract import validate_detail

    from aictl.dashboard.history_scope import Scope
    from aictl.dashboard.scoped_history import route

    query = {"scope": ["node"], "node_id": ["test-node"], **{k: [v] for k, v in params.items()}}
    status, body = route(store, Scope("node", "test-node"), path, "", query, NOW, reader=store.history_store.reader)
    payload = json.loads(body)
    assert status == 200, payload
    validate_detail(path, payload)
    return payload


def test_the_diff_route_compares_two_stored_contents(kusto_store):
    seed = kusto_store.insert
    seed("file_blobs", project="", hash="h-before", content="keep\nold\n", size_bytes=9, created_at=NOW)
    seed("file_blobs", project="", hash="h-after", content="keep\nnew\n", size_bytes=9, created_at=NOW)
    status, body = _get(kusto_store, "/api/board/memory/diff", "first=h-before&second=h-after")
    assert status == 200
    assert (body["first"]["state"], body["second"]["state"], body["second"]["text"]) == ("kept", "kept", "keep\nnew\n")
    assert [(line["kind"], line["text"]) for line in body["diff"]] == [("same", "keep"), ("del", "old"), ("add", "new")]
    assert body["truncated"] is False


def test_the_diff_route_says_why_a_side_is_missing_and_makes_no_diff_from_it(kusto_store):
    from types import SimpleNamespace

    seed = kusto_store.insert
    seed("file_blobs", project="", hash="h-after", content="new\n", size_bytes=4, created_at=NOW)
    # The file did not exist before the write: its before-side is the empty file.
    _, created = _get(kusto_store, "/api/board/memory/diff", "first=&second=h-after&absent=first")
    assert created["first"] == {"hash": "", "state": "absent", "bytes": 0, "text": ""}
    assert [(line["kind"], line["text"]) for line in created["diff"]] == [("add", "new")]
    # A hash whose content is no longer stored, and a side with no hash at all, never diff as "no change".
    _, gone = _get(kusto_store, "/api/board/memory/diff", "first=h-gone&second=")
    assert (gone["first"]["state"], gone["second"]["state"], gone["diff"]) == ("expired", "not_recorded", None)
    _, off = _get(kusto_store, "/api/board/memory/diff", "first=h-after&second=h-after",
                  db=SimpleNamespace(capture="metadata"))
    assert (off["first"]["state"], off["first"]["text"], off["diff"]) == ("not_kept", None, None)
    assert _get(kusto_store, "/api/board/memory/diff", "first=a&second=b&absent=both")[0] == 400


def test_the_versions_route_lists_a_memory_files_versions_with_session_titles(kusto_store):
    seed = kusto_store.insert
    seed("sessions", session_id=SID, tool="claude-code", project_path="/work/proj", started_at=NOW - 400)
    seed("file_history", path=CLAUDE_MD, ts=NOW - 300, blob_hash="v0", size_bytes=5)
    seed("file_write_events", session_id=SID, ts=NOW - 200, dedup_key="w1", path=CLAUDE_MD, mechanism="claude_md",
         actor="agent", operation="edit", after_hash="v1", after_bytes=7, before_hash="v0", lines_added=1, lines_removed=0)
    seed("file_write_events", session_id=SID, ts=NOW - 100, dedup_key="w2", path="/work/proj/a.py", operation="edit")
    status, body = _get(kusto_store, "/api/board/memory/versions", f"path={CLAUDE_MD}")
    assert status == 200 and body["mechanism"] == "claude_md"
    assert [(v["origin"], v["session_id"], v["actor"], v["content_hash"], v["lines_added"]) for v in body["versions"]] == [
        ("scan", "", "", "v0", None), ("write_event", SID, "agent", "v1", 1)]
    # A file of no memory mechanism has no versions here: its edits are the file detail's.
    _, code = _get(kusto_store, "/api/board/memory/versions", "path=/work/proj/a.py")
    assert (code["mechanism"], code["versions"]) == ("", [])
    assert _get(kusto_store, "/api/board/memory/versions", "")[0] == 400


def test_the_checkpoint_files_route_lists_a_rewind_points_files(kusto_store):
    seed = kusto_store.insert
    seed("file_history", path="/work/proj/a.py", ts=NOW - 80, session_id=SID, source_event_id="u-1",
         origin="claude_file_history", state="backup", version=2)
    seed("file_history", path=MEMORY, ts=NOW - 80, session_id=SID, source_event_id="u-1",
         origin="claude_file_history", state="backup", mechanism="claude_auto_memory", blob_hash="b1", version=1,
         size_bytes=12)
    status, body = _get(kusto_store, "/api/board/agent/checkpoint/files", f"id={SID}&message_id=u-1")
    assert status == 200 and body["message_id"] == "u-1"
    assert [(f["path"], f["blob_hash"], f["size_bytes"]) for f in body["files"]] == [
        (MEMORY, "b1", 12), ("/work/proj/a.py", "", None)]
    assert _get(kusto_store, "/api/board/agent/checkpoint/files", f"id={SID}")[0] == 400


def test_the_recalls_route_lists_a_sessions_memory_recalls(kusto_store):
    seed = kusto_store.insert
    seed("context_events", session_id=SID, ts=NOW - 60, dedup_key="m1", kind="memory_recall", tool="claude-code",
         trigger="nested_memory", path=CLAUDE_MD, content_hash="v1", turn_index=2, detail=json.dumps({"bytes": 7}))
    seed("context_events", session_id=SID, ts=NOW - 50, dedup_key="m2", kind="memory_recall", tool="copilot-cli",
         trigger="session_store_sql", tool_call_id="call-1", prompt_id="p1")
    seed("context_events", session_id=SID, ts=NOW - 40, dedup_key="c1", kind="compaction")
    seed("context_events", session_id=OTHER, ts=NOW - 30, dedup_key="m3", kind="memory_recall", path=CLAUDE_MD)
    status, body = _get(kusto_store, "/api/board/agent/recalls", f"id={SID}")
    assert status == 200
    assert [(r["trigger"], r["path"], r["content_hash"], r["bytes"], r["turn_index"], r["tool_call_id"])
            for r in body["recalls"]] == [
        ("nested_memory", CLAUDE_MD, "v1", 7, 2, ""), ("session_store_sql", "", "", None, None, "call-1")]


def test_the_memory_routes_answer_in_a_node_scope(kusto_store):
    from aictl.dashboard.history_scope import identity

    seed = kusto_store.insert
    seed("file_blobs", project="", hash="b1", content="remembered\n", size_bytes=11, created_at=NOW)
    seed("file_history", path=MEMORY, ts=NOW - 80, session_id=SID, source_event_id="u-1",
         origin="claude_file_history", state="backup", mechanism="claude_auto_memory", blob_hash="b1")
    seed("context_events", session_id=SID, ts=NOW - 60, dedup_key="m1", kind="memory_recall", path=MEMORY)
    agent = identity("test-node", SID)
    files = _scoped(kusto_store, "/api/board/agent/checkpoint/files", id=agent, message_id="u-1")
    assert [f["blob_hash"] for f in files["files"]] == ["b1"]
    recalls = _scoped(kusto_store, "/api/board/agent/recalls", id=agent)
    assert [(r["path"], r["agent_id"]) for r in recalls["recalls"]] == [(MEMORY, "")]
    content = _scoped(kusto_store, "/api/board/memory/diff", first="b1")
    assert (content["first"]["text"], content["second"]["state"]) == ("remembered\n", "not_recorded")
