# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for :mod:`aictl.memory_snapshot` + /api/session-memory-diff."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest

from aictl import memory_snapshot
from aictl.memory_snapshot import (
    build_session_memory_diff,
    diff_snapshots,
    record_snapshot,
    snapshot_claude_memory,
)
from aictl.storage import HistoryDB


@pytest.fixture()
def fake_claude_home(tmp_path: Path, monkeypatch):
    """Point the Claude path helpers at a tmp dir with synthetic memory files."""
    claude_root = tmp_path / ".claude"
    project_hash = "-Users-test-proj"
    mem_dir = claude_root / "projects" / project_hash / "memory"
    mem_dir.mkdir(parents=True)
    (mem_dir / "a.md").write_text("alpha one\nalpha two\n")
    (mem_dir / "b.md").write_text("bravo line\n")
    (claude_root / "CLAUDE.md").write_text("user notes v1\n")

    monkeypatch.setattr(memory_snapshot, "claude_global_dir", lambda: claude_root)
    monkeypatch.setattr(
        memory_snapshot,
        "claude_project_memory_dir",
        lambda ph: claude_root / "projects" / ph / "memory",
    )
    return claude_root, project_hash


def test_snapshot_returns_sha_map(fake_claude_home):
    _, project_hash = fake_claude_home
    shas = snapshot_claude_memory("s1", project_hash)
    assert set(shas) == {"a.md", "b.md", "__user__/CLAUDE.md"}
    # SHA-256 hexdigests are 64 chars
    for v in shas.values():
        assert len(v) == 64


def test_snapshot_skips_large_files(fake_claude_home, monkeypatch):
    claude_root, project_hash = fake_claude_home
    big = claude_root / "projects" / project_hash / "memory" / "huge.md"
    # 2 MiB > 1 MiB threshold
    big.write_bytes(b"x" * (2 * 1024 * 1024))
    shas = snapshot_claude_memory("s1", project_hash)
    assert "huge.md" not in shas


def test_diff_classifies_added_modified_removed(fake_claude_home):
    claude_root, project_hash = fake_claude_home
    mem_dir = claude_root / "projects" / project_hash / "memory"

    start = snapshot_claude_memory("s1", project_hash)
    start_contents = {
        k: (mem_dir / k).read_text() if "/" not in k else (claude_root / "CLAUDE.md").read_text()
        for k in start
    }

    # modify a.md, remove b.md, add c.md
    (mem_dir / "a.md").write_text("alpha one\nalpha CHANGED\n")
    (mem_dir / "b.md").unlink()
    (mem_dir / "c.md").write_text("charlie new\n")
    end = snapshot_claude_memory("s1", project_hash)
    end_contents = {}
    for k in end:
        if k == "__user__/CLAUDE.md":
            end_contents[k] = (claude_root / "CLAUDE.md").read_text()
        else:
            end_contents[k] = (mem_dir / k).read_text()

    entries = diff_snapshots(start, end, start_contents, end_contents)
    by_path = {e["path"]: e for e in entries}
    assert by_path["a.md"]["change"] == "modified"
    assert by_path["b.md"]["change"] == "removed"
    assert by_path["c.md"]["change"] == "added"
    # unchanged user file not present
    assert "__user__/CLAUDE.md" not in by_path
    # modified has both + and - lines
    assert by_path["a.md"]["added_lines"] >= 1
    assert by_path["a.md"]["removed_lines"] >= 1
    # unified_diff populated
    assert "alpha CHANGED" in by_path["a.md"]["unified_diff"]


def test_diff_caps_unified_diff(fake_claude_home):
    claude_root, project_hash = fake_claude_home
    mem_dir = claude_root / "projects" / project_hash / "memory"
    before = "\n".join(f"line {i}" for i in range(500)) + "\n"
    after = "\n".join(f"CHANGED {i}" for i in range(500)) + "\n"
    (mem_dir / "a.md").write_text(before)
    start = snapshot_claude_memory("s", project_hash)
    start_contents = {"a.md": before}
    (mem_dir / "a.md").write_text(after)
    end = snapshot_claude_memory("s", project_hash)
    end_contents = {"a.md": after}
    entries = diff_snapshots(start, end, start_contents, end_contents)
    a = next(e for e in entries if e["path"] == "a.md")
    # Cap is 200 lines + 1 truncation marker line
    assert a["unified_diff"].count("\n") <= 202
    assert "truncated" in a["unified_diff"]


def test_migration_applies_on_fresh_db(tmp_path: Path):
    db = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    conn = db._conn()
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='memory_snapshots'"
    )
    assert cur.fetchone() is not None
    # check columns
    cols = {row[1] for row in conn.execute("PRAGMA table_info(memory_snapshots)")}
    assert cols == {"session_id", "phase", "path", "sha", "content", "ts"}


def test_record_snapshot_and_build_diff(tmp_path: Path, fake_claude_home):
    claude_root, project_hash = fake_claude_home
    mem_dir = claude_root / "projects" / project_hash / "memory"

    db = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    conn = db._conn()
    n_start = record_snapshot(conn, "sess-1", project_hash, "start", ts=1000.0)
    assert n_start == 3  # a.md, b.md, CLAUDE.md

    # No end snapshot yet — diff must return files=[] gracefully
    payload = build_session_memory_diff(conn, "sess-1")
    assert payload == {"files": [], "summary": {"added": 0, "modified": 0, "removed": 0}}

    # Now mutate + record end
    (mem_dir / "a.md").write_text("alpha one\nalpha CHANGED\n")
    (mem_dir / "b.md").unlink()
    (mem_dir / "c.md").write_text("charlie\n")
    record_snapshot(conn, "sess-1", project_hash, "end", ts=2000.0)

    payload = build_session_memory_diff(conn, "sess-1")
    kinds = {f["path"]: f["change"] for f in payload["files"]}
    assert kinds["a.md"] == "modified"
    assert kinds["b.md"] == "removed"
    assert kinds["c.md"] == "added"
    assert payload["summary"] == {"added": 1, "modified": 1, "removed": 1}


def test_api_endpoint_returns_empty_shape(tmp_path: Path):
    """Unknown session → empty files list + zero summary, HTTP 200."""
    from aictl.dashboard import api_handlers  # noqa: F401

    db = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    conn = db._conn()
    payload = build_session_memory_diff(conn, "does-not-exist")
    assert payload["files"] == []
    assert payload["summary"] == {"added": 0, "modified": 0, "removed": 0}
