"""VS Code stores linked to Copilot sessions: surface evidence, aliases, artifacts, large chat files."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import sqlite3
from pathlib import Path

import pytest
from click.testing import CliRunner

from aictl import platforms
from aictl.commands.session import session_group
from aictl.observe import sessions as mod
from aictl.observe.sessions import ArtifactRefused, SessionIndex, confine, read_artifact

CLI_ID = "11111111-1111-4111-8111-111111111111"
HOST_ID = "33333333-3333-4333-8333-333333333333"
OTHER_ID = "44444444-4444-4444-8444-444444444444"
CHAT_ID = "55555555-5555-4555-8555-555555555555"
OPENED_ID = "77777777-7777-4777-8777-777777777777"
SECRET = "SYNTHETIC-SECRET-VALUE"


def _folder(state: Path, sid: str, client: str = "github/cli") -> Path:
    d = state / sid
    d.mkdir(parents=True)
    (d / "workspace.yaml").write_text(f"id: {sid}\ncwd: /work/{sid[:4]}\nclient_name: {client}\n")
    (d / "events.jsonl").write_text(json.dumps({"type": "session.start", "data": {"sessionId": sid}}) + "\n")
    return d


def _state_db(path: Path, **items: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.execute("create table ItemTable (key, value)")
    db.execute("insert into ItemTable values ('secret://github.token', ?)", (SECRET,))
    for key, value in items.items():
        db.execute("insert into ItemTable values (?, ?)", (key.replace("__", "."), json.dumps(value)))
    db.commit()
    db.close()


def _cache_row(resource: str, provider: str, label: str = "Cached title", cwd: str = "/work/cached") -> dict:
    return {
        "providerType": provider,
        "resource": resource,
        "label": label,
        "timing": {"created": 1771865104553, "lastRequestEnded": 1771865204553},
        "metadata": {"workingDirectoryPath": cwd},
    }


@pytest.fixture
def env(tmp_path, monkeypatch):
    copilot = tmp_path / "home" / ".copilot"
    state = copilot / "session-state"
    state.mkdir(parents=True)
    user = tmp_path / "vscode" / "Code" / "User"
    monkeypatch.setenv("COPILOT_HOME", str(copilot))
    monkeypatch.setattr(platforms, "vscode_user_dir", lambda: user)
    monkeypatch.setattr(platforms, "vscode_insiders_user_dir", lambda: tmp_path / "vscode" / "Code - Insiders" / "User")
    monkeypatch.setattr(mod, "_csv_user_dirs", lambda env=None, windows=None: [])
    monkeypatch.setattr(mod, "snapshot", lambda: None)
    monkeypatch.setattr(mod, "capture_mode", lambda: "full")
    ws = user / "workspaceStorage" / "hash1"
    (ws / "chatSessions").mkdir(parents=True)
    (ws / "workspace.json").write_text(json.dumps({"folder": "file:///work/vs"}))
    return {"state": state, "user": user, "ws": ws, "copilot": copilot}


def _store_row(copilot: Path, sid: str) -> None:
    db = sqlite3.connect(copilot / "session-store.db")
    db.execute("create table if not exists sessions (id, cwd, repository, branch, summary, created_at, updated_at)")
    db.execute("insert into sessions values (?,?,?,?,?,?,?)", (sid, "/work/store", None, None, None, None, None))
    db.commit()
    db.close()


# ── surface ──────────────────────────────────────────────────────────


def test_agent_host_resource_makes_a_folder_vscode_hosted_and_resolves_both_ways(env):
    _folder(env["state"], HOST_ID)
    alias = f"agent-host-copilotcli:/{HOST_ID}"
    _state_db(env["ws"] / "state.vscdb", agentSessions__model__cache=[_cache_row(alias, "agent-host-copilotcli")])
    ix = SessionIndex()
    rec = ix.records[HOST_ID]
    assert rec["surface"] == "copilot-vscode"
    assert "agent-host-copilotcli" in rec["surface_source"]
    assert alias in rec["aliases"]
    assert ix.resolve(alias)["session"]["id"] == HOST_ID
    assert ix.resolve(HOST_ID)["session"]["aliases"] == [alias]


def test_metadata_origin_other_is_not_evidence_of_vscode_hosting(env):
    d = _folder(env["state"], CLI_ID)
    (d / "vscode.metadata.json").write_text(json.dumps({"origin": "other", "created": 1, "modified": 1}))
    rec = SessionIndex().records[CLI_ID]
    assert rec["surface"] == "copilot-cli"
    assert "vscode.metadata.json" in rec["sources"]


def test_folder_with_metadata_and_no_client_stays_unknown(env):
    d = env["state"] / CLI_ID
    d.mkdir()
    (d / "vscode.metadata.json").write_text(json.dumps({"origin": "other"}))
    assert SessionIndex().records[CLI_ID]["surface"] == "unknown"


def test_model_cache_row_gives_alias_and_timing_but_no_surface(env):
    _store_row(env["copilot"], OTHER_ID)
    _folder(env["state"], CLI_ID)
    rows = [_cache_row(f"copilotcli:/{OTHER_ID}", "copilotcli"), _cache_row(f"copilotcli:/{CLI_ID}", "copilotcli")]
    _state_db(env["ws"] / "state.vscdb", agentSessions__model__cache=rows)
    ix = SessionIndex()
    stored = ix.records[OTHER_ID]
    assert stored["surface"] == "unknown"
    assert stored["title"] == "Cached title"
    assert stored["started_at"] and stored["last_activity_at"]
    assert ix.resolve(f"copilotcli:/{OTHER_ID}")["session"]["id"] == OTHER_ID
    assert ix.records[CLI_ID]["surface"] == "copilot-cli"
    assert ix.records[CLI_ID]["project"] == f"/work/{CLI_ID[:4]}"


def test_chat_index_entry_decides_only_an_unknown_surface(env):
    _store_row(env["copilot"], OPENED_ID)
    _folder(env["state"], CLI_ID)
    entries = {
        f"copilotcli:/{OPENED_ID}": {"title": "Opened", "timing": {"created": 1771865104553}, "isExternal": True},
        f"copilotcli:/{CLI_ID}": {"title": "Also opened", "isExternal": True},
    }
    _state_db(env["ws"] / "state.vscdb", chat__ChatSessionStore__index={"entries": entries})
    ix = SessionIndex()
    assert ix.records[OPENED_ID]["surface"] == "copilot-vscode"
    assert ix.records[OPENED_ID]["title"] == "Opened"
    assert ix.records[CLI_ID]["surface"] == "copilot-cli"
    assert ix.resolve(f"copilotcli:/{CLI_ID}")["session"]["id"] == CLI_ID


# ── false links ──────────────────────────────────────────────────────


def test_different_sessions_stay_separate(env):
    _folder(env["state"], CLI_ID)
    _folder(env["state"], OTHER_ID)
    (env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl").write_text(
        json.dumps({"kind": 0, "v": {"sessionId": CHAT_ID, "requests": [{"text": f"copilot-cli:{CLI_ID} copilotcli:/{OTHER_ID}"}]}})
        + "\n"
    )
    cache = [
        _cache_row(f"claude-code:/{CLI_ID}", "claude-code"),
        _cache_row(f"copilotcli:/{OTHER_ID}/extra", "copilotcli"),
        _cache_row("copilotcli:/untitled-88888888-8888-4888-8888-888888888888", "copilotcli"),
    ]
    index = {"entries": {f"claude-code:/{OTHER_ID}": {"title": "Not Copilot"}}}
    _state_db(env["ws"] / "state.vscdb", agentSessions__model__cache=cache, chat__ChatSessionStore__index=index)
    edits = env["ws"] / "chatEditingSessions"
    (edits / hashlib.sha1(f"claude-code:/{CLI_ID}".encode()).hexdigest()).mkdir(parents=True)
    ix = SessionIndex()
    for sid in (CLI_ID, OTHER_ID, CHAT_ID):
        assert ix.records[sid]["aliases"] == [], sid
    assert len({CLI_ID, OTHER_ID, CHAT_ID} & set(ix.records)) == 3
    assert ix.records[CLI_ID]["surface"] == "copilot-cli"
    assert ix.records[CHAT_ID]["surface"] == "copilot-vscode"
    assert "88888888-8888-4888-8888-888888888888" not in ix.records
    assert len(ix.records[CLI_ID]["roots"]) == 1


def test_local_chat_resource_links_the_chat_it_encodes(env):
    (env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl").write_text('{"kind":0,"v":{}}\n')
    encoded = base64.urlsafe_b64encode(CHAT_ID.encode()).decode().rstrip("=")
    resource = f"vscode-chat-session://local/{encoded}"
    _state_db(env["ws"] / "state.vscdb", agentSessions__model__cache=[_cache_row(resource, "local")])
    ix = SessionIndex()
    assert ix.resolve(resource)["session"]["id"] == CHAT_ID
    assert ix.records[CHAT_ID]["title"] == "Cached title"


# ── artifacts ────────────────────────────────────────────────────────


def _chat_folders(ws: Path, sid: str) -> None:
    ghcp = ws / "GitHub.copilot-chat"
    for folder, name in (
        (ws / "chatEditingSessions" / sid, "state.json"),
        (ghcp / "debug-logs" / sid, "main.jsonl"),
        (ghcp / "chat-session-resources" / sid, "tool-1"),
    ):
        folder.mkdir(parents=True)
        (folder / name).write_text("synthetic\n")
    (ghcp / "transcripts").mkdir()
    (ghcp / "transcripts" / f"{sid}.jsonl").write_text("synthetic\n")


def test_per_chat_folders_are_listed_and_readable_and_confined(env, tmp_path):
    (env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl").write_text('{"kind":0,"v":{}}\n')
    _chat_folders(env["ws"], CHAT_ID)
    _chat_folders_other = env["ws"] / "chatEditingSessions" / OTHER_ID
    _chat_folders_other.mkdir()
    (_chat_folders_other / "state.json").write_text("other\n")
    outside = tmp_path / "outside.txt"
    outside.write_text("outside\n")
    os.symlink(outside, env["ws"] / "GitHub.copilot-chat" / "debug-logs" / CHAT_ID / "link.txt")
    _state_db(env["ws"] / "state.vscdb")
    ix = SessionIndex()
    rec = ix.records[CHAT_ID]
    items = {a["name"]: a for a in ix.artifacts(rec)}
    assert items["chatEditingSessions/" + CHAT_ID + "/state.json"]["type"] == "metadata"
    assert items["GitHub.copilot-chat/debug-logs/" + CHAT_ID + "/main.jsonl"]["type"] == "event_log"
    assert items["GitHub.copilot-chat/chat-session-resources/" + CHAT_ID + "/tool-1"]["type"] == "tool_output"
    assert items["GitHub.copilot-chat/transcripts/" + CHAT_ID + ".jsonl"]["type"] == "event_log"
    for name, item in items.items():
        if not item.get("symlink"):
            assert read_artifact(rec, name)["content"], name
    with pytest.raises(ArtifactRefused):
        confine(rec, "GitHub.copilot-chat/debug-logs/" + CHAT_ID + "/link.txt")
    with pytest.raises(ArtifactRefused):
        confine(rec, str(_chat_folders_other / "state.json"))
    with pytest.raises(ArtifactRefused):
        confine(rec, "state.vscdb")


def test_hashed_editing_folder_joins_its_cli_session(env):
    _folder(env["state"], CLI_ID)
    _folder(env["state"], OTHER_ID)
    name = hashlib.sha1(f"copilotcli:/{CLI_ID}".encode()).hexdigest()
    folder = env["ws"] / "chatEditingSessions" / name
    folder.mkdir(parents=True)
    (folder / "state.json").write_text("edits\n")
    ix = SessionIndex()
    rec = ix.records[CLI_ID]
    assert str(folder) in rec["roots"]
    assert f"copilotcli:/{CLI_ID}" in rec["aliases"]
    assert ix.resolve(str(folder))["session"]["id"] == CLI_ID
    listed = [a for a in ix.artifacts(rec) if a["path"] == str(folder / "state.json")]
    assert listed and read_artifact(rec, listed[0]["name"])["content"] == "edits\n"
    assert str(folder) not in ix.records[OTHER_ID]["roots"]
    assert ix.records[CLI_ID]["surface"] == "copilot-cli"


# ── large chat files ─────────────────────────────────────────────────


def test_large_chat_file_gives_title_and_timing_from_head_and_tail(env):
    path = env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl"
    prompt = 'quoted "customTitle":"FROM-PROMPT" text'
    header = {"kind": 0, "v": {"version": 3, "creationDate": 1771865104553, "sessionId": CHAT_ID, "requests": [{"t": prompt}]}}
    with path.open("w") as fh:
        fh.write(json.dumps(header) + "\n")
        fh.write(json.dumps({"kind": 2, "k": ["requests"], "v": "x" * (9 * 1024 * 1024)}) + "\n")
        fh.write(json.dumps({"kind": 1, "k": ["customTitle"], "v": "Tail title"}) + "\n")
    assert path.stat().st_size > 8 * 1024 * 1024
    rec = SessionIndex().records[CHAT_ID]
    assert rec["title"] == "Tail title"
    assert rec["started_at"] == pytest.approx(1771865104.553)


def test_chat_header_naming_another_session_is_ignored(env):
    path = env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl"
    path.write_text(json.dumps({"kind": 0, "v": {"creationDate": 1771865104553, "customTitle": "Wrong", "sessionId": OTHER_ID}}) + "\n")
    rec = SessionIndex().records[CHAT_ID]
    assert rec["title"] is None
    assert rec["started_at"] is None
    assert OTHER_ID not in SessionIndex().records


def test_prompt_text_never_becomes_a_title(env):
    path = env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl"
    path.write_text(json.dumps({"kind": 0, "v": {"sessionId": CHAT_ID, "requests": [{"customTitle": "FROM-REQUEST"}]}}) + "\n")
    assert SessionIndex().records[CHAT_ID]["title"] is None


# ── secrets ──────────────────────────────────────────────────────────


def test_secret_key_never_appears_in_output(env, monkeypatch):
    monkeypatch.setattr("aictl.commands.session._daemon_sessions", lambda *a, **k: None, raising=False)
    _folder(env["state"], HOST_ID)
    alias = f"agent-host-copilotcli:/{HOST_ID}"
    _state_db(env["ws"] / "state.vscdb", agentSessions__model__cache=[_cache_row(alias, "agent-host-copilotcli")])
    (env["ws"] / "chatSessions" / f"{CHAT_ID}.jsonl").write_text('{"kind":0,"v":{}}\n')
    runner = CliRunner()
    for args in (["show", HOST_ID, "--json"], ["find", "copilotcli", "--json"], ["artifacts", CHAT_ID, "--json"]):
        result = runner.invoke(session_group, args)
        assert result.exit_code == 0, result.output
        assert SECRET not in result.output
        assert "secret://" not in result.output
    assert SECRET not in json.dumps(SessionIndex().records, default=str)


# ── Windows ──────────────────────────────────────────────────────────


def test_simulated_windows_insiders_profile_links_resolve(tmp_path, monkeypatch):
    appdata = tmp_path / "E_drive" / "AppData" / "Roaming"
    home = tmp_path / "C_drive" / "Users" / "Me"
    state = home / ".copilot" / "session-state"
    state.mkdir(parents=True)
    monkeypatch.setenv("APPDATA", str(appdata))
    monkeypatch.setenv("USERPROFILE", str(home))
    monkeypatch.delenv("COPILOT_HOME", raising=False)
    monkeypatch.setattr(platforms, "IS_WINDOWS", True)
    monkeypatch.setattr(platforms, "IS_MACOS", False)
    monkeypatch.setattr(mod, "snapshot", lambda: None)
    monkeypatch.setattr(mod, "capture_mode", lambda: "full")
    monkeypatch.setattr(
        mod, "expand_location", lambda raw, env=None, windows=None: raw.replace("%APPDATA%", str(appdata)).replace("\\", "/")
    )
    _folder(state, HOST_ID)
    _folder(state, CLI_ID)
    insiders = appdata / "Code - Insiders" / "User"
    alias = f"agent-host-copilotcli:/{HOST_ID}"
    row = _cache_row(alias, "agent-host-copilotcli", cwd="c:\\work\\proj")
    _state_db(insiders / "profiles" / "-abc" / "globalStorage" / "state.vscdb", agentSessions__model__cache=[row])
    ws = appdata / "Code" / "User" / "workspaceStorage" / "hash1"
    edits = ws / "chatEditingSessions" / hashlib.sha1(f"copilotcli:/{CLI_ID}".encode()).hexdigest()
    edits.mkdir(parents=True)
    ix = SessionIndex()
    assert ix.records[HOST_ID]["surface"] == "copilot-vscode"
    assert ix.resolve(alias)["session"]["id"] == HOST_ID
    assert str(edits) in ix.records[CLI_ID]["roots"]
