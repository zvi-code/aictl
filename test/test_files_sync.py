"""Tests for files/file_history sync wiring.

Covers the content policy in ``HistoryDB.sync_files_from_discovery``
(oversize/sensitive metadata-only, per-pass read budget, single
transaction), the blob GC step in ``compact()``, and the throttled
``SnapshotPersistence._sync_files`` integration in the orchestrator.

Per wip/open-items/files-sync-design.md. The end-to-end check uses
direct ``db.get_file`` / ``db.file_history`` / ``db.file_content_at``
assertions (same data the /api/files and /api/files/history endpoints
serve) rather than spinning up the web server, to keep this file
independent of the shared API test harness.
"""

from __future__ import annotations

import hashlib
import os
import time

import pytest

from aictl.dashboard.models import DashboardSnapshot, DashboardTool
from aictl.orchestrator import FILE_SYNC_INTERVAL, SnapshotPersistence
from aictl.storage import (
    FILE_SYNC_MAX_CONTENT_BYTES,
    LARGE_FILE_THRESHOLD,
    HistoryDB,
    _is_sensitive_path,
)
from aictl.tools import ResourceFile


@pytest.fixture()
def db():
    """In-memory DB with immediate flush (flush_interval=0)."""
    d = HistoryDB(db_path=":memory:", flush_interval=0)
    yield d
    d.close()


def _disc(path, tool="t", category="config", scope="project", **overrides):
    """Build a discovery dict for a real on-disk file."""
    st = os.stat(path)
    item = {
        "path": str(path),
        "tool": tool,
        "category": category,
        "scope": scope,
        "mtime": st.st_mtime,
        "size": st.st_size,
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


# ── Content policy inside sync_files_from_discovery ───────────────


class TestSyncContentPolicy:
    def test_small_changed_file_stores_content_and_history(self, db, tmp_path):
        f = tmp_path / "notes.md"
        f.write_text("hello world")
        stats = db.sync_files_from_discovery([_disc(f)], read_content=True)
        assert stats["added"] == 1
        assert stats["deferred"] == 0

        entry = db.get_file(str(f))
        assert entry is not None
        assert entry.content == "hello world"
        assert entry.content_hash != ""
        assert db.file_history(str(f)), "content change must produce a history row"

    def test_blob_range_file_stores_blob(self, db, tmp_path):
        # Between LARGE_FILE_THRESHOLD and the sync content cap: content is
        # read and the blob store is used.
        content = "y" * (LARGE_FILE_THRESHOLD + 1000)
        f = tmp_path / "big.md"
        f.write_text(content)
        db.sync_files_from_discovery([_disc(f)], read_content=True)

        entry = db.get_file(str(f))
        assert entry.content == content
        assert entry.blob_hash == _blob_hash(content)
        conn = db._conn()
        row = conn.execute("SELECT content FROM file_blobs WHERE hash = ?", (entry.blob_hash,)).fetchone()
        assert row is not None and row[0] == content

    def test_oversize_file_metadata_only(self, db, tmp_path):
        f = tmp_path / "huge.log"
        f.write_text("z" * (FILE_SYNC_MAX_CONTENT_BYTES + 1))
        stats = db.sync_files_from_discovery([_disc(f)], read_content=True)
        assert stats["added"] == 1

        entry = db.get_file(str(f))
        assert entry is not None
        assert entry.content == ""
        assert entry.content_hash == ""
        assert entry.mtime == pytest.approx(os.stat(f).st_mtime)
        assert db.file_history(str(f)) == []

        # mtime was stored, so the next pass needs no read at all:
        # max_reads=0 would defer any required read, yet nothing defers.
        stats = db.sync_files_from_discovery([_disc(f)], read_content=True, max_reads=0)
        assert stats["unchanged"] == 1
        assert stats["deferred"] == 0

    def test_sensitive_file_metadata_only_even_when_small(self, db, tmp_path):
        f = tmp_path / ".env"
        f.write_text("API_KEY=super-secret")
        stats = db.sync_files_from_discovery([_disc(f)], read_content=True, max_reads=0)
        # Sensitive files never consume the read budget.
        assert stats["added"] == 1
        assert stats["deferred"] == 0

        entry = db.get_file(str(f))
        assert entry is not None
        assert entry.content == ""
        assert entry.content_hash == ""
        assert db.file_history(str(f)) == []
        # Content never lands anywhere in the store.
        conn = db._conn()
        for table, col in (("files", "content"), ("file_history", "content"), ("file_blobs", "content")):
            rows = conn.execute(f"SELECT {col} FROM {table}").fetchall()
            assert all("super-secret" not in (r[0] or "") for r in rows)

    def test_inline_oversize_content_metadata_only(self, db, tmp_path):
        # Content supplied inline by discovery is subject to the same cap.
        f = tmp_path / "inline.md"
        f.write_text("on disk")
        item = _disc(f, content="q" * (FILE_SYNC_MAX_CONTENT_BYTES + 1))
        db.sync_files_from_discovery([item], read_content=True)
        entry = db.get_file(str(f))
        assert entry.content == ""

    def test_unreadable_file_upserts_metadata(self, db, tmp_path):
        # Existing behavior: a failed read falls back to metadata-only.
        f = tmp_path / "gone.md"
        f.write_text("x")
        item = _disc(f)
        f.unlink()
        stats = db.sync_files_from_discovery([item], read_content=True)
        assert stats["added"] == 1
        entry = db.get_file(str(f))
        assert entry is not None
        assert entry.content == ""


# ── Per-pass read budget ───────────────────────────────────────────


class TestReadBudget:
    def test_budget_defers_then_stores_next_pass(self, db, tmp_path):
        f1 = tmp_path / "a.md"
        f2 = tmp_path / "b.md"
        f1.write_text("content-a")
        f2.write_text("content-b")
        discovered = [_disc(f1), _disc(f2)]

        stats = db.sync_files_from_discovery(discovered, read_content=True, max_reads=1)
        assert stats["added"] == 1
        assert stats["deferred"] == 1
        # The deferred file is NOT upserted — no stored mtime to mask it.
        assert db.get_file(str(f1)) is not None
        assert db.get_file(str(f1)).content == "content-a"
        assert db.get_file(str(f2)) is None

        # Second pass: the stored file is unchanged (no read), so the
        # deferred one fits the same budget of 1.
        stats = db.sync_files_from_discovery(discovered, read_content=True, max_reads=1)
        assert stats["added"] == 1
        assert stats["deferred"] == 0
        assert stats["unchanged"] == 1
        assert db.get_file(str(f2)).content == "content-b"


# ── Single transaction per pass ────────────────────────────────────


class _CountingConn:
    """Proxy around sqlite3.Connection counting commit() calls."""

    def __init__(self, real):
        self._real = real
        self.commits = 0

    def commit(self):
        self.commits += 1
        self._real.commit()

    def __getattr__(self, name):
        return getattr(self._real, name)


class TestSingleTransaction:
    def test_sync_pass_commits_once(self, db, tmp_path, monkeypatch):
        files = []
        for i in range(3):
            f = tmp_path / f"f{i}.md"
            f.write_text(f"content-{i}")
            files.append(f)

        proxy = _CountingConn(db._conn())
        monkeypatch.setattr(db, "_conn", lambda: proxy)

        stats = db.sync_files_from_discovery([_disc(f) for f in files], read_content=True)
        assert stats["added"] == 3
        assert proxy.commits == 1

    def test_upsert_file_still_commits_by_default(self, db, monkeypatch):
        # Other upsert_file callers keep per-call commit semantics.
        proxy = _CountingConn(db._conn())
        monkeypatch.setattr(db, "_conn", lambda: proxy)
        db.upsert_file(path="/x.md", tool="t", content="v1")
        assert proxy.commits == 1
        assert db.get_file("/x.md").content == "v1"


# ── Lazy mtime-compare + removal (regression guards) ──────────────


class TestLazyAndRemoval:
    def test_unchanged_mtime_skips_read(self, db, tmp_path):
        f = tmp_path / "a.md"
        f.write_text("v1")
        db.sync_files_from_discovery([_disc(f)], read_content=True)
        # Same mtime: no read needed (max_reads=0 proves it), no update.
        stats = db.sync_files_from_discovery([_disc(f)], read_content=True, max_reads=0)
        assert stats == {"added": 0, "updated": 0, "unchanged": 1, "removed": 0, "deferred": 0}

    def test_changed_mtime_triggers_reread(self, db, tmp_path):
        f = tmp_path / "a.md"
        f.write_text("v1")
        _set_mtime(f, 1_000_000.0)
        db.sync_files_from_discovery([_disc(f)], read_content=True)
        f.write_text("v2")
        _set_mtime(f, 1_000_100.0)
        stats = db.sync_files_from_discovery([_disc(f)], read_content=True)
        assert stats["updated"] == 1
        assert db.get_file(str(f)).content == "v2"

    def test_removed_files_are_deleted(self, db, tmp_path):
        f1 = tmp_path / "a.md"
        f2 = tmp_path / "b.md"
        f1.write_text("a")
        f2.write_text("b")
        db.sync_files_from_discovery([_disc(f1), _disc(f2)], read_content=True)

        stats = db.sync_files_from_discovery([_disc(f1)], read_content=True)
        assert stats["removed"] == 1
        assert db.get_file(str(f2)) is None
        assert db.get_file(str(f1)) is not None


# ── Blob GC in compact() ───────────────────────────────────────────


class TestBlobGC:
    def test_gc_removes_orphans_keeps_referenced(self, db):
        v1 = "1" * (LARGE_FILE_THRESHOLD + 10)
        v2 = "2" * (LARGE_FILE_THRESHOLD + 10)
        h1, h2 = _blob_hash(v1), _blob_hash(v2)

        db.upsert_file(path="/big.md", tool="t", content=v1)
        time.sleep(0.01)
        db.upsert_file(path="/big.md", tool="t", content=v2)

        conn = db._conn()
        blobs = {r[0] for r in conn.execute("SELECT hash FROM file_blobs")}
        assert blobs == {h1, h2}

        # Age the v1 history row past the 30d retention window, then compact.
        conn.execute(
            "UPDATE file_history SET ts = ts - ? WHERE blob_hash = ?",
            (40 * 86_400, h1),
        )
        conn.commit()

        result = db.compact()
        assert result["file_history_deleted_30d"] == 1
        assert result["file_blobs_deleted"] == 1

        blobs = {r[0] for r in conn.execute("SELECT hash FROM file_blobs")}
        assert blobs == {h2}
        # Referenced content still resolvable.
        assert db.get_file("/big.md").content == v2

    def test_gc_noop_when_all_referenced(self, db):
        content = "3" * (LARGE_FILE_THRESHOLD + 10)
        db.upsert_file(path="/big.md", tool="t", content=content)
        result = db.compact()
        assert result["file_blobs_deleted"] == 0
        conn = db._conn()
        assert conn.execute("SELECT COUNT(*) FROM file_blobs").fetchone()[0] == 1


# ── SnapshotPersistence integration ────────────────────────────────


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
    def test_persist_throttles_file_sync(self, db, tmp_path, monkeypatch):
        f = tmp_path / "CLAUDE.md"
        f.write_text("# instructions")
        snap = _snapshot(tmp_path, [_rf(f)])

        calls = []
        orig = db.sync_files_from_discovery

        def counting(*args, **kwargs):
            calls.append(1)
            return orig(*args, **kwargs)

        monkeypatch.setattr(db, "sync_files_from_discovery", counting)

        p = SnapshotPersistence(db)
        p.persist(snap, tool_rows=[])
        p.persist(snap, tool_rows=[])  # inside the interval → throttled
        assert len(calls) == 1

        # After the interval elapses, sync runs again.
        p._last_file_sync -= FILE_SYNC_INTERVAL + 1
        p.persist(snap, tool_rows=[])
        assert len(calls) == 2

        # The first pass actually stored content read from disk.
        entry = db.get_file(_rf(f).path)
        assert entry is not None
        assert entry.content == "# instructions"

    def test_sync_failure_never_propagates(self, db, tmp_path, monkeypatch):
        f = tmp_path / "CLAUDE.md"
        f.write_text("x")
        snap = _snapshot(tmp_path, [_rf(f)])

        def boom(*args, **kwargs):
            raise RuntimeError("disk exploded")

        monkeypatch.setattr(db, "sync_files_from_discovery", boom)

        p = SnapshotPersistence(db)
        p._sync_files(snap)  # must not raise

        rows = db.query_data_quality(component="file-sync")
        assert rows and rows[0]["status"] == "failed"

    def test_sync_success_records_data_quality_ok(self, db, tmp_path):
        f = tmp_path / "CLAUDE.md"
        f.write_text("x")
        p = SnapshotPersistence(db)
        p._sync_files(_snapshot(tmp_path, [_rf(f)]))
        rows = db.query_data_quality(component="file-sync")
        assert rows and rows[0]["status"] == "ok"

    def test_empty_discovery_does_not_wipe_store(self, db, tmp_path):
        f = tmp_path / "CLAUDE.md"
        f.write_text("x")
        p = SnapshotPersistence(db)
        p._sync_files(_snapshot(tmp_path, [_rf(f)]))
        assert db.get_file(_rf(f).path) is not None

        # A snapshot with zero files (e.g. transient discovery failure)
        # must not trigger removed-files handling.
        p._last_file_sync = 0.0
        p._sync_files(_snapshot(tmp_path, []))
        assert db.get_file(_rf(f).path) is not None

    def test_dedup_prefers_non_empty_tool(self, db, tmp_path):
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
        p = SnapshotPersistence(db)
        p._sync_files(snap)
        entry = db.get_file(named.path)
        assert entry is not None
        assert entry.tool == "claude-code"

    def test_no_db_is_noop(self, tmp_path):
        p = SnapshotPersistence(None)
        p._sync_files(_snapshot(tmp_path, []))  # must not raise

    def test_end_to_end_history_after_sync(self, db, tmp_path):
        """After syncs, the data behind /api/files and /api/files/history
        is queryable: list rows, history rows, and content at a change
        point. (Direct-db variant of the endpoint check — the web-server
        harness lives in shared test files edited concurrently.)"""
        f = tmp_path / "CLAUDE.md"
        f.write_text("version-1")
        _set_mtime(f, 1_000_000.0)
        p = SnapshotPersistence(db)
        p._sync_files(_snapshot(tmp_path, [_rf(f)]))

        mid_ts = time.time()
        time.sleep(0.02)

        f.write_text("version-2")
        _set_mtime(f, 1_000_100.0)
        p._last_file_sync = 0.0  # bypass throttle for the second pass
        p._sync_files(_snapshot(tmp_path, [_rf(f)]))

        path = _rf(f).path
        listed = db.list_files()
        assert [e.path for e in listed] == [path]

        history = db.file_history(path)
        assert len(history) == 2

        assert db.file_content_at(path, mid_ts) == "version-1"
        assert db.file_content_at(path, time.time()) == "version-2"
        assert db.get_file(path).content == "version-2"
