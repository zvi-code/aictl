"""The Copilot session index: finding sessions per surface, ids, artifacts and confinement."""

from __future__ import annotations

import io
import json
import os
import sqlite3
import time
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import platforms
from aictl.commands.session import session_group
from aictl.observe import sessions as mod
from aictl.observe.render import safe_text
from aictl.observe.sessions import ArtifactRefused, SessionIndex, confine, expand_location, read_artifact, uri_to_path

CLI_ID = "11111111-1111-4111-8111-111111111111"
DESK_ID = "22222222-2222-4222-8222-222222222222"
HOSTED_ID = "33333333-3333-4333-8333-333333333333"
STORE_ID = "44444444-4444-4444-8444-444444444444"
CHAT_ID = "55555555-5555-4555-8555-555555555555"
SHARED_A = "abcdabcd-0000-4000-8000-000000000001"
SHARED_B = "abcdabcd-0000-4000-8000-000000000002"


def _state_dir(base: Path, sid: str, client: str, **files) -> Path:
    d = base / sid
    (d / "checkpoints").mkdir(parents=True)
    (d / "workspace.yaml").write_text(
        f"id: {sid}\ncwd: /work/{sid[:4]}\ngit_root: /work/{sid[:4]}\nbranch: main\nclient_name: {client}\n"
        "name: Synthetic title\ncreated_at: 2026-10-01T10:00:00Z\nupdated_at: 2026-10-02T10:00:00Z\n"
    )
    (d / "events.jsonl").write_text(json.dumps({"type": "session.start", "data": {"sessionId": sid}}) + "\n")
    (d / "checkpoints" / "index.md").write_text("# index\n")
    (d / "checkpoints" / "001-first.md").write_text("# one\n")
    for name, text in files.items():
        (d / name).write_text(text)
    return d


@pytest.fixture
def stores(tmp_path, monkeypatch):
    copilot = tmp_path / "copilot-home"
    state = copilot / "session-state"
    state.mkdir(parents=True)
    monkeypatch.setenv("COPILOT_HOME", str(copilot))
    user = tmp_path / "vscode" / "Code" / "User"
    monkeypatch.setattr(platforms, "vscode_user_dir", lambda: user)
    monkeypatch.setattr(platforms, "vscode_insiders_user_dir", lambda: tmp_path / "vscode" / "Code - Insiders" / "User")
    monkeypatch.setattr(mod, "_csv_user_dirs", lambda env=None, windows=None: [])
    monkeypatch.setattr(mod, "snapshot", lambda: None)

    cli = _state_dir(state, CLI_ID, "github/cli", **{"new-format.xyz": "new\n"})
    (cli / "files").mkdir()
    (cli / "files" / "out.log").write_text("log line\n")
    backups = cli / "rewind-file-snapshots" / "backups"
    backups.mkdir(parents=True)
    (backups / "abc123").write_bytes(b"\x00binary")
    (cli / "rewind-file-snapshots" / "index.json").write_text(
        json.dumps(
            {
                "snapshots": [
                    {
                        "snapshotId": "snap-1",
                        "eventId": "evt-1",
                        "userMessage": "PROMPT-TEXT-MUST-NOT-LEAK",
                        "files": {"k": {"path": "a.py", "preimage": {"backupFile": "abc123"}}},
                    }
                ]
            }
        )
    )
    _state_dir(state, DESK_ID, "github/autopilot")
    hosted = _state_dir(state, HOSTED_ID, "github/cli")
    (hosted / "vscode.metadata.json").write_text(json.dumps({"origin": "vscode"}))
    (state / "pending-session:draft:66666666-6666-4666-8666-666666666666").mkdir()
    (state / ".session-operation-locks").mkdir()
    _state_dir(state, SHARED_A, "github/cli")
    _state_dir(state, SHARED_B, "github/cli")
    (cli / "inuse.4242.lock").write_text("")

    db = sqlite3.connect(copilot / "session-store.db")
    db.execute("create table sessions (id, cwd, repository, host_type, branch, summary, created_at, updated_at)")
    db.execute("create table assistant_usage_events (session_id, model, agent_id)")
    db.execute("create table checkpoints (session_id, checkpoint_number, created_at)")
    db.execute(
        "insert into sessions values (?,?,?,?,?,?,?,?)",
        (STORE_ID, "/work/gone", "o/r", None, "dev", "Store summary", "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"),
    )
    db.execute("insert into sessions values (?,?,?,?,?,?,?,?)", (CLI_ID, None, "o/cli", None, None, None, None, None))
    db.execute("insert into assistant_usage_events values (?,?,?)", (CLI_ID, "model-a", "agent-1"))
    db.execute("insert into checkpoints values (?,?,?)", (CLI_ID, 1, "2026-01-01T00:00:00Z"))
    db.commit()
    db.close()
    secret = sqlite3.connect(copilot / "data.db")
    secret.execute("create table sessions (id, title, model, is_running, created_at, updated_at)")
    secret.execute("create table settings (github_access_token)")
    secret.execute("insert into settings values ('gho_SECRET_TOKEN')")
    secret.execute("insert into sessions values (?,?,?,?,?,?)", (DESK_ID, "Desk title", "model-d", 0, None, None))
    secret.commit()
    secret.close()

    ws = user / "workspaceStorage" / "deadbeefhash"
    (ws / "chatSessions").mkdir(parents=True)
    (ws / "workspace.json").write_text(json.dumps({"folder": "file:///work/vs%20project"}))
    (ws / "chatSessions" / f"{CHAT_ID}.jsonl").write_text('{"kind":0,"v":{}}\n')
    transcripts = ws / "GitHub.copilot-chat" / "transcripts"
    transcripts.mkdir(parents=True)
    (transcripts / f"{CHAT_ID}.jsonl").write_text('{"type":"session.start","data":{}}\n')
    resources = ws / "GitHub.copilot-chat" / "chat-session-resources" / CHAT_ID
    resources.mkdir(parents=True)
    (resources / "tool-1").write_text("output\n")
    state_db = sqlite3.connect(ws / "state.vscdb")
    state_db.execute("create table ItemTable (key, value)")
    state_db.execute(
        "insert into ItemTable values ('chat.ChatSessionStore.index', ?)",
        (json.dumps({"entries": {CHAT_ID: {"title": "Chat title", "timing": {"created": 1771865104553}}}}),),
    )
    state_db.commit()
    state_db.close()
    return {"copilot": copilot, "state": state, "user": user, "ws": ws, "cli": cli, "tmp": tmp_path}


def _tree(root: Path) -> dict[str, tuple[int, float]]:
    return {str(p): (p.stat().st_size, p.stat().st_mtime) for p in root.rglob("*") if p.is_file()}


def test_every_surface_is_found_and_says_how_it_was_decided(stores):
    ix = SessionIndex()
    assert ix.records[CLI_ID]["surface"] == "copilot-cli"
    assert "client_name=github/cli" in ix.records[CLI_ID]["surface_source"]
    assert ix.records[DESK_ID]["surface"] == "copilot-desktop"
    assert ix.records[HOSTED_ID]["surface"] == "copilot-vscode"
    assert ix.records[CHAT_ID]["surface"] == "copilot-vscode"
    assert ".session-operation-locks" not in ix.records


def test_store_only_session_keeps_an_unknown_surface(stores):
    rec = SessionIndex().records[STORE_ID]
    assert rec["surface"] == "unknown"
    assert rec["folder"] is None and rec["partial"]
    assert rec["project"] == "/work/gone"


def test_vscode_session_shows_project_not_hash(stores):
    rec = SessionIndex().records[CHAT_ID]
    assert rec["project"] == "/work/vs project"
    assert rec["title"] == "Chat title"
    assert len(rec["roots"]) == 3


def test_every_id_form_resolves(stores):
    ix = SessionIndex()
    for query, expected in [
        (CLI_ID, CLI_ID),
        (CLI_ID[:8], CLI_ID),
        (str(stores["cli"]), CLI_ID),
        (str(stores["cli"] / "events.jsonl"), CLI_ID),
        (f"copilot-cli:4242:{time.time()}", CLI_ID),
        ("4242", CLI_ID),
        (CHAT_ID, CHAT_ID),
        (str(stores["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl"), CHAT_ID),
        ("66666666-6666-4666-8666-666666666666", "pending-session:draft:66666666-6666-4666-8666-666666666666"),
    ]:
        result = ix.resolve(query)
        assert result["status"] == "ok", query
        assert result["session"]["id"] == expected


def test_ambiguous_prefix_lists_matches(stores):
    result = SessionIndex().resolve("abcdabcd")
    assert result["status"] == "ambiguous"
    assert {r["id"] for r in result["matches"]} == {SHARED_A, SHARED_B}


def test_not_found_lists_expanded_locations(stores):
    result = SessionIndex().resolve("ffffffff")
    assert result["status"] == "not_found"
    joined = "\n".join(result["looked_in"])
    assert str(stores["state"]) in joined
    assert str(stores["user"] / "workspaceStorage") in joined
    assert "%" not in joined


def test_find_searches_project_and_title(stores):
    ix = SessionIndex()
    assert [r["id"] for r in ix.find("vs project")] == [CHAT_ID]
    assert [r["id"] for r in ix.find("Store summary")] == [STORE_ID]


def test_artifacts_classified_and_unknown_still_listed(stores):
    ix = SessionIndex()
    rows = ix.artifacts(ix.records[CLI_ID])
    by_name = {a["name"]: a for a in rows}
    assert by_name["events.jsonl"]["type"] == "event_log"
    assert by_name["checkpoints/001-first.md"]["checkpoint"] == 1
    assert by_name["files/out.log"]["type"] == "tool_output"
    assert by_name["new-format.xyz"]["type"] == "unknown"
    assert by_name["rewind-file-snapshots/backups/abc123"]["snapshot_id"] == "snap-1"
    assert by_name["session-store.db#checkpoint/1"]["readable"] is False
    assert "PROMPT-TEXT-MUST-NOT-LEAK" not in json.dumps(rows)
    assert ix.artifacts(ix.records[CLI_ID], "unknown") == [by_name["new-format.xyz"]]


def test_chat_artifacts_span_linked_stores(stores):
    ix = SessionIndex()
    types = {a["type"] for a in ix.artifacts(ix.records[CHAT_ID])}
    assert types == {"event_log", "tool_output"}


def test_nothing_is_written_under_the_stores(stores):
    before = _tree(stores["tmp"])
    ix = SessionIndex()
    ix.list(include_partial=True)
    ix.artifacts(ix.records[CLI_ID])
    ix.details(ix.records[CLI_ID])
    read_artifact(ix.records[CLI_ID], "events.jsonl")
    assert _tree(stores["tmp"]) == before


def test_titles_hidden_when_capture_keeps_metadata_only(stores, monkeypatch):
    monkeypatch.setattr(mod, "capture_mode", lambda: "metadata")
    ix = SessionIndex()
    assert ix.records[CLI_ID]["title"] is None
    assert ix.records[CLI_ID]["folder"] == str(stores["cli"])


# ── confinement ──────────────────────────────────────────────────────


@pytest.mark.parametrize("bad", ["../other/x", "..\\other\\x", "files/../../x", "a\x00b"])
def test_traversal_refused(stores, bad):
    ix = SessionIndex()
    with pytest.raises(ArtifactRefused):
        confine(ix.records[CLI_ID], bad)


def test_symlink_leaving_the_folder_refused(stores):
    outside = stores["tmp"] / "outside.txt"
    outside.write_text("secret")
    os.symlink(outside, stores["cli"] / "escape.txt")
    ix = SessionIndex()
    with pytest.raises(ArtifactRefused):
        confine(ix.records[CLI_ID], "escape.txt")
    listed = {a["name"]: a for a in ix.artifacts(ix.records[CLI_ID])}
    assert listed["escape.txt"]["symlink"] and not listed["escape.txt"]["readable"]


def test_absolute_path_of_another_session_refused(stores):
    ix = SessionIndex()
    with pytest.raises(ArtifactRefused):
        confine(ix.records[CLI_ID], str(stores["state"] / DESK_ID / "events.jsonl"))


def test_data_db_never_served_even_through_a_link_or_copy(stores):
    (stores["cli"] / "data.db").write_text("gho_SECRET_TOKEN")
    os.symlink(stores["copilot"] / "data.db", stores["cli"] / "harmless.txt")
    ix = SessionIndex()
    for name in ("data.db", "harmless.txt", str(stores["copilot"] / "data.db")):
        with pytest.raises(ArtifactRefused):
            confine(ix.records[CLI_ID], name)


def test_cat_is_bounded_and_refuses_binary(stores):
    ix = SessionIndex()
    rec = ix.records[CLI_ID]
    assert read_artifact(rec, "rewind-file-snapshots/backups/abc123")["content"] is None
    assert read_artifact(rec, "rewind-file-snapshots/backups/abc123", allow_binary=True)["binary"]
    small = read_artifact(rec, "workspace.yaml", max_bytes=5)
    assert small["truncated"] and len(small["content"]) == 5


# ── Windows locations ────────────────────────────────────────────────


def test_windows_rows_expand_on_their_own_drives():
    env = {"appdata": r"E:\Data\AppData\ROAMING", "USERPROFILE": r"C:\Users\Me"}
    dirs = mod._csv_user_dirs(env, windows=True)
    assert r"E:\Data\AppData\ROAMING\Code\User" in dirs
    assert r"E:\Data\AppData\ROAMING\Code - Insiders\User" in dirs
    assert all(d.startswith("E:") for d in dirs)
    assert expand_location(r"%USERPROFILE%\.copilot", env, windows=True) == r"C:\Users\Me\.copilot"
    assert expand_location(r"%MISSING%\x", env, windows=True) is None


def test_windows_paths_compare_case_insensitively():
    assert mod._fold(r"E:\Data\ROAMING\Code") == mod._fold(r"e:/data/roaming/code")
    assert mod._inside(mod._fold(r"E:\Data\roaming\Code\x.json"), mod._fold(r"e:\DATA\Roaming\Code"))


def test_windows_workspace_uris():
    assert uri_to_path("file:///c%3A/Users/me/proj") == r"c:\Users\me\proj"
    assert uri_to_path("file://server/share/proj") == r"\\server\share\proj"


def test_simulated_windows_env_finds_appdata_and_profile_chats(tmp_path, monkeypatch):
    """APPDATA and USERPROFILE apart, and chat data held in a named profile."""
    appdata = tmp_path / "E_drive" / "AppData" / "ROAMING"
    home = tmp_path / "C_drive" / "Users" / "Me"
    (home / ".copilot" / "session-state").mkdir(parents=True)
    monkeypatch.setenv("APPDATA", str(appdata))
    monkeypatch.setenv("USERPROFILE", str(home))
    monkeypatch.delenv("COPILOT_HOME", raising=False)
    monkeypatch.setattr(platforms, "IS_WINDOWS", True)
    monkeypatch.setattr(platforms, "IS_MACOS", False)
    monkeypatch.setattr(mod, "snapshot", lambda: None)
    monkeypatch.setattr(mod, "expand_location", lambda raw, env=None, windows=None: raw.replace("%APPDATA%", str(appdata)).replace("\\", "/"))
    ws = appdata / "Code" / "User" / "workspaceStorage" / "hash1"
    (ws / "chatSessions").mkdir(parents=True)
    (ws / "workspace.json").write_text(json.dumps({"folder": "file:///d%3A/proj"}))
    (ws / "chatSessions" / f"{CHAT_ID}.jsonl").write_text("{}\n")
    profile = appdata / "Code - Insiders" / "User" / "profiles" / "-abc" / "globalStorage" / "emptyWindowChatSessions"
    profile.mkdir(parents=True)
    (profile / f"{HOSTED_ID}.jsonl").write_text("{}\n")
    ix = SessionIndex()
    assert ix.records[CHAT_ID]["project"] == r"d:\proj"
    assert ix.records[CHAT_ID]["folder"] == str(ws)
    assert HOSTED_ID in ix.records
    looked = ix.resolve("ffffffff")["looked_in"]
    assert str(home / ".copilot" / "session-state") in looked
    assert str(appdata / "Code" / "User" / "workspaceStorage") in looked
    assert str(appdata / "Code - Insiders" / "User" / "workspaceStorage") in looked


# ── CLI ──────────────────────────────────────────────────────────────


@pytest.fixture
def no_daemon(monkeypatch):
    monkeypatch.setattr("aictl.commands.session.ServerClient.try_connect", staticmethod(lambda: None))


def test_cli_list_show_path_artifacts_cat(stores, no_daemon):
    run = CliRunner().invoke
    out = run(session_group, ["list", "--json"])
    assert out.exit_code == 0
    ids = {r["id"] for r in json.loads(out.output)}
    assert CLI_ID in ids and STORE_ID not in ids
    assert STORE_ID in {r["id"] for r in json.loads(run(session_group, ["list", "--all", "--json"]).output)}
    assert {r["id"] for r in json.loads(run(session_group, ["list", "--tool", "copilot-desktop", "--json"]).output)} == {DESK_ID}
    assert run(session_group, ["path", CLI_ID[:8]]).output.strip() == str(stores["cli"])
    shown = run(session_group, ["show", CLI_ID[:8]]).output
    assert str(stores["cli"]) in shown.splitlines()[0]
    assert "checkpoints/001-first.md" in shown
    arts = json.loads(run(session_group, ["artifacts", CLI_ID, "--type", "checkpoint", "--json"]).output)
    assert {a["type"] for a in arts} == {"checkpoint"}
    assert "log line" in run(session_group, ["cat", CLI_ID, "files/out.log"]).output
    assert run(session_group, ["cat", CLI_ID, "../x"]).exit_code != 0


def test_cli_not_found_and_ambiguous_messages(stores, no_daemon):
    run = CliRunner().invoke
    missing = run(session_group, ["path", "ffffffff"])
    assert missing.exit_code != 0 and "looked in" in missing.output
    assert str(stores["state"]) in missing.output
    assert "ambiguous" in run(session_group, ["show", "abcdabcd"]).output


def test_cli_list_uses_the_daemon_when_no_index_option_is_given(monkeypatch):
    class Fake:
        def get_snapshot(self):
            return {"sessions": [{"session_id": "live", "tool": "t", "pids": [1]}]}

    monkeypatch.setattr("aictl.commands.session.ServerClient.try_connect", staticmethod(lambda: Fake()))
    assert "live" in CliRunner().invoke(session_group, ["list"]).output


def test_cp1252_console_output_does_not_raise():
    stream = io.TextIOWrapper(io.BytesIO(), encoding="cp1252")
    text = safe_text("project \u2192 \u65e5\u672c\u8a9e", stream)
    text.encode("cp1252")


def test_ps_document_gains_folder_and_artifact_count(stores):
    doc = {"tools": [{"sessions": [{"id": CLI_ID}, {"id": "not-indexed"}]}]}
    mod.annotate_observed(doc)
    first, second = doc["tools"][0]["sessions"]
    assert first["folder"] == str(stores["cli"])
    assert first["artifact_count"] >= 5 and first["artifact_bytes"] > 0
    assert "folder" not in second
