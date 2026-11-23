"""Tests for the file inventory content policy and snapshot integration."""

from __future__ import annotations

import hashlib
import os
import time

import pytest

from aictl.dashboard.models import DashboardSnapshot, DashboardTool
from aictl.file_inventory import FileInventory
from aictl.orchestrator import FILE_SYNC_INTERVAL, SnapshotPersistence
from aictl.records import FILE_SYNC_MAX_CONTENT_BYTES, LARGE_FILE_THRESHOLD, _is_sensitive_path
from aictl.state_file import StateFile
from aictl.stores.testing import MemoryWriter
from aictl.tools import ResourceFile


@pytest.fixture()
def inventory(tmp_path):
    def build(*, max_reads=250, keeps_text=lambda: True):
        writer = MemoryWriter()
        return FileInventory(writer, StateFile(tmp_path / "inventory.json"), keeps_text=keeps_text,
                             sensitive=_is_sensitive_path, max_reads=max_reads), writer

    return build


def _disc(path, tool="t", category="config", scope="project", **overrides):
    """Build a discovery dict for a real on-disk file."""
    st = os.stat(path)
    item = {
        "path": str(path),
        "tool": tool,
        "category": category,
        "scope": scope,
        "mtime": st.st_mtime,
        "size_bytes": st.st_size,
        "tokens": 0,
        "meta": "{}",
    }
    item.update(overrides)
    return item


def _set_mtime(path, mtime: float) -> None:
    os.utime(path, (mtime, mtime))


def _blob_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:32]


# ── Sensitive-basename guard ───────────────────────────────────────


class TestSensitivePatterns:
    @pytest.mark.parametrize(
        "name",
        [
            ".env",
            ".env.local",
            ".ENV.production",
            "credentials.json",
            "aws_credentials",
            "secrets.yaml",
            "client_secret.json",
            "server.pem",
            "private.key",
            "id_rsa",
            "id_ed25519",
            "github_token.txt",
        ],
    )
    def test_sensitive_basenames_match(self, name):
        assert _is_sensitive_path(f"/home/user/project/{name}") is True

    @pytest.mark.parametrize(
        "name",
        ["CLAUDE.md", "settings.json", "config.toml", "mcp.json", "keybindings.json"],
    )
    def test_normal_basenames_do_not_match(self, name):
        assert _is_sensitive_path(f"/home/user/project/{name}") is False

    def test_sensitive_dirname_does_not_trigger(self):
        # Only the basename is checked, not parent directories.
        assert _is_sensitive_path("/home/user/secrets/README.md") is False


class TestSyncContentPolicy:
    def test_small_changed_file_stores_content_and_history(self, inventory, tmp_path):
        sync, writer = inventory()
        path = tmp_path / "notes.md"
        path.write_text("hello world")
        assert sync.sync([_disc(path)], now=5) == dict(added=1, unchanged=0, updated=0, removed=0, deferred=0)
        row, = writer.written("files")
        history, = writer.written("file_history")
        blob, = writer.written("file_blobs")
        assert row["blob_hash"] == history["blob_hash"] == blob["hash"] == _blob_hash("hello world")
        assert blob["content"] == "hello world" and history["ts"] == 5

    def test_blob_range_file_stores_blob(self, inventory, tmp_path):
        sync, writer = inventory()
        content = "y" * (LARGE_FILE_THRESHOLD + 1000)
        path = tmp_path / "big.md"
        path.write_text(content)
        sync.sync([_disc(path)])
        blob, = writer.written("file_blobs")
        assert blob["content"] == content and blob["hash"] == _blob_hash(content)

    @pytest.mark.parametrize("name,size", [("huge.log", FILE_SYNC_MAX_CONTENT_BYTES + 1), (".env", 20)])
    def test_metadata_only_does_not_spend_read_budget(self, inventory, tmp_path, name, size):
        sync, writer = inventory(max_reads=0)
        path = tmp_path / name
        path.write_bytes(b"x" * size)
        discovered = [_disc(path)]
        assert sync.sync(discovered)["added"] == 1
        row, = writer.written("files")
        assert row["size_bytes"] == size and not row["content_hash"] and not row["blob_hash"]
        history, = writer.written("file_history")
        assert history["size_bytes"] == size and not history["blob_hash"] and not writer.written("file_blobs")
        assert sync.sync(discovered)["unchanged"] == 1

    def test_unreadable_file_upserts_metadata(self, inventory, tmp_path):
        sync, writer = inventory()
        path = tmp_path / "gone.md"
        path.write_text("x")
        discovered = [_disc(path)]
        path.unlink()
        assert sync.sync(discovered)["added"] == 1
        row, = writer.written("files")
        assert not row["blob_hash"] and not writer.written("file_blobs")


class TestVersionRowsInEveryCaptureMode:
    """A file's versions are recorded whether or not the capture mode keeps its text."""

    def test_metadata_capture_writes_a_version_row_for_a_new_file_and_for_each_change(self, inventory, tmp_path):
        sync, writer = inventory(keeps_text=lambda: False)
        path = tmp_path / "MEMORY.md"
        path.write_text("one")
        _set_mtime(path, 1_000_000.0)
        sync.sync([_disc(path)], now=10)
        assert sync.sync([_disc(path)], now=20)["unchanged"] == 1
        path.write_text("one and two")
        _set_mtime(path, 1_000_100.0)
        sync.sync([_disc(path)], now=30)
        first, second = writer.written("file_history")
        assert (first["ts"], first["size_bytes"], first["blob_hash"]) == (10, 3, "")
        assert (second["ts"], second["size_bytes"], second["blob_hash"]) == (30, 11, "")
        assert not writer.written("file_blobs")

    def test_full_capture_writes_the_hash_and_keeps_the_content(self, inventory, tmp_path):
        sync, writer = inventory()
        path = tmp_path / "MEMORY.md"
        path.write_text("one")
        sync.sync([_disc(path)], now=10)
        history, = writer.written("file_history")
        assert history["blob_hash"] == _blob_hash("one") and [b["content"] for b in writer.written("file_blobs")] == ["one"]

    def test_switching_the_mode_off_does_not_repeat_a_version_that_did_not_change(self, tmp_path):
        mode = {"text": True}
        writer = MemoryWriter()
        sync = FileInventory(writer, StateFile(tmp_path / "inventory.json"), keeps_text=lambda: mode["text"],
                             sensitive=_is_sensitive_path)
        path = tmp_path / "MEMORY.md"
        path.write_text("one")
        sync.sync([_disc(path)], now=10)
        mode["text"] = False
        sync.sync([_disc(path)], now=20)
        sync.sync([_disc(path)], now=30)
        assert [h["ts"] for h in writer.written("file_history")] == [10]


class TestProjectOfARow:
    def test_a_row_keeps_the_project_it_is_attributed_to_in_the_inventory_and_the_history(self, inventory, tmp_path):
        sync, writer = inventory()
        path = tmp_path / "MEMORY.md"
        path.write_text("one")
        sync.sync([_disc(path, project="/p/alpha")], now=10)
        row, = writer.written("files")
        history, = writer.written("file_history")
        assert row["project"] == history["project"] == "/p/alpha"
        assert sync.sync([_disc(path, project="/p/alpha")], now=20)["unchanged"] == 1

    def test_a_removed_file_is_deleted_under_its_project(self, inventory, tmp_path):
        sync, writer = inventory()
        path = tmp_path / "MEMORY.md"
        path.write_text("one")
        other = tmp_path / "other.md"
        other.write_text("x")
        sync.sync([_disc(path, project="/p/alpha"), _disc(other)], now=10)
        sync.sync([_disc(other)], now=20)
        assert writer.operations[-1] == ("delete", "files", [{"project": "/p/alpha", "path": str(path)}])

    def test_a_file_that_gains_a_project_replaces_its_old_row(self, inventory, tmp_path):
        sync, writer = inventory()
        path = tmp_path / "MEMORY.md"
        path.write_text("one")
        sync.sync([_disc(path)], now=10)
        sync.sync([_disc(path, project="/p/alpha")], now=20)
        assert [op for op in writer.operations if op[0] == "delete"] == [("delete", "files", [{"project": "", "path": str(path)}])]
        assert writer.written("files")[-1]["project"] == "/p/alpha"


def test_read_budget_defers_then_stores_next_pass(inventory, tmp_path):
    sync, writer = inventory(max_reads=1)
    a, b = tmp_path / "a.md", tmp_path / "b.md"
    a.write_text("content-a")
    b.write_text("content-b")
    discovered = [_disc(a), _disc(b)]
    assert sync.sync(discovered) == dict(added=1, unchanged=0, updated=0, removed=0, deferred=1)
    assert [r["path"] for r in writer.written("files")] == [str(a)]
    assert sync.sync(discovered) == dict(added=1, unchanged=1, updated=0, removed=0, deferred=0)
    assert [r["content"] for r in writer.written("file_blobs")] == ["content-a", "content-b"]


def test_changed_mtime_triggers_reread_and_unchanged_mtime_does_not(inventory, tmp_path):
    sync, writer = inventory()
    path = tmp_path / "a.md"
    path.write_text("v1")
    _set_mtime(path, 1_000_000.0)
    sync.sync([_disc(path)])
    assert sync.sync([_disc(path)])["unchanged"] == 1
    assert len(writer.written("file_blobs")) == 1
    path.write_text("v2")
    _set_mtime(path, 1_000_100.0)
    assert sync.sync([_disc(path)])["updated"] == 1
    assert [r["content"] for r in writer.written("file_blobs")] == ["v1", "v2"]


def test_removed_files_are_deleted(inventory, tmp_path):
    sync, writer = inventory()
    a, b = tmp_path / "a.md", tmp_path / "b.md"
    a.write_text("a")
    b.write_text("b")
    sync.sync([_disc(a), _disc(b)])
    assert sync.sync([_disc(a)])["removed"] == 1
    assert writer.operations[-1] == ("delete", "files", [{"project": "", "path": str(b)}])


def _rf(path, tool="claude-code", kind="instructions", scope="project"):
    st = os.stat(path)
    return ResourceFile(
        path=str(path),
        kind=kind,
        size=st.st_size,
        tokens=1,
        tool=tool,
        scope=scope,
        mtime=st.st_mtime,
    )


def _snapshot(root, files):
    return DashboardSnapshot(
        timestamp=time.time(),
        root=str(root),
        tools=[DashboardTool(tool="claude-code", label="Claude Code", files=files)],
    )


class TestPersistIntegration:
    def test_sync_reports_quality_but_does_not_raise(self, tmp_path, monkeypatch):
        from types import SimpleNamespace

        from aictl.file_inventory import FileInventory
        from aictl.state_file import StateFile
        from aictl.stores.testing import MemoryWriter

        f = tmp_path / "CLAUDE.md"
        f.write_text("x")
        snap = _snapshot(tmp_path, [_rf(f)])
        quality = []
        health = SimpleNamespace(record_data_quality=lambda component, status, **_: quality.append((component, status)))
        writer = MemoryWriter()
        inventory = FileInventory(writer, StateFile(tmp_path / "manifest.json"),
                                  keeps_text=lambda: False, sensitive=_is_sensitive_path)
        p = SnapshotPersistence(None, writer, inventory, quality=health)
        p._sync_files(snap, now=1000)

        def fail(*args, **kwargs):
            raise OSError("manifest failed")

        monkeypatch.setattr(inventory, "sync", fail)
        p._sync_files(snap, now=1000 + FILE_SYNC_INTERVAL)
        assert quality == [("file-sync", "ok"), ("file-sync", "failed")]

    def test_dedup_prefers_non_empty_tool(self, tmp_path):
        from aictl.file_inventory import FileInventory
        from aictl.state_file import StateFile
        from aictl.stores.testing import MemoryWriter

        f = tmp_path / "shared.md"
        f.write_text("shared")
        st = os.stat(f)
        anon = ResourceFile(path=str(f), kind="config", size=st.st_size, tokens=1, tool="", scope="", mtime=st.st_mtime)
        named = _rf(f, tool="claude-code")
        snap = DashboardSnapshot(
            timestamp=time.time(),
            root=str(tmp_path),
            tools=[
                DashboardTool(tool="", label="Anon", files=[anon]),
                DashboardTool(tool="claude-code", label="Claude Code", files=[named]),
            ],
        )
        writer = MemoryWriter()
        p = SnapshotPersistence(None, writer,
                                FileInventory(writer, StateFile(tmp_path / "manifest.json"),
                                              keeps_text=lambda: False, sensitive=_is_sensitive_path))
        p._sync_files(snap)
        entry, = [r for _, table, rows in writer.operations if table == "files" for r in rows]
        assert entry["path"] == named.path
        assert entry["tool"] == "claude-code"

    def test_no_db_is_noop(self, tmp_path):
        p = SnapshotPersistence(None)
        p._sync_files(_snapshot(tmp_path, []))  # must not raise
