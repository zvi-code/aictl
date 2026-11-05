"""The /api/copilot-sessions routes, including the artifact route's confinement."""

from __future__ import annotations

import os
from urllib.parse import quote

from aictl.dashboard.copilot_sessions_api import PREFIX, handle
from test_copilot_sessions_index import CHAT_ID, CLI_ID, DESK_ID, stores  # noqa: F401


def _artifact(path: str, sid: str = CLI_ID):
    return handle(f"{PREFIX}/{sid}/artifact", {"path": [path]})


def test_list_detail_and_artifacts(stores):  # noqa: F811
    status, body = handle(PREFIX, {})
    assert status == 200 and CLI_ID in {r["id"] for r in body["sessions"]}
    status, body = handle(f"{PREFIX}/{CLI_ID[:8]}", {})
    assert status == 200 and body["folder"] == str(stores["cli"])
    status, body = handle(f"{PREFIX}/{CHAT_ID}/artifacts", {})
    assert status == 200 and body["artifacts"]
    assert handle(f"{PREFIX}/{quote('ffffffff')}", {})[0] == 404
    assert handle(f"{PREFIX}/abcdabcd", {})[0] == 409


def test_artifact_serves_a_file_in_the_folder(stores):  # noqa: F811
    status, body = _artifact("files/out.log")
    assert status == 200 and "log line" in body["content"]


def test_artifact_rejects_traversal_and_missing_path(stores):  # noqa: F811
    assert _artifact("../" + DESK_ID + "/events.jsonl")[0] == 403
    assert _artifact("..\\" + DESK_ID + "\\events.jsonl")[0] == 403
    assert handle(f"{PREFIX}/{CLI_ID}/artifact", {})[0] == 400


def test_artifact_rejects_symlink_escape(stores):  # noqa: F811
    outside = stores["tmp"] / "outside.txt"
    outside.write_text("secret")
    os.symlink(outside, stores["cli"] / "escape.txt")
    status, body = _artifact("escape.txt")
    assert status == 403 and "secret" not in str(body)


def test_data_db_never_served(stores):  # noqa: F811
    for path in ("data.db", str(stores["copilot"] / "data.db"), "DATA.DB", "data.db-wal"):
        status, body = _artifact(path)
        assert status == 403, path
        assert "SECRET" not in str(body)


def test_size_is_capped(stores, monkeypatch):  # noqa: F811
    monkeypatch.setattr("aictl.dashboard.copilot_sessions_api.API_MAX_BYTES", 4)
    status, body = _artifact("workspace.yaml")
    assert status == 200 and body["truncated"] and len(body["content"]) == 4


def test_binary_is_not_returned(stores):  # noqa: F811
    status, body = _artifact("rewind-file-snapshots/backups/abc123")
    assert status == 200 and body["binary"] and body["content"] is None
