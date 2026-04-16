# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tests for aictl.mutation_ledger and its integration with write_safe."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from aictl import mutation_ledger
from aictl.utils import write_safe


@pytest.fixture(autouse=True)
def _fake_home(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    # Force platforms.config_dir() to re-resolve under our fake HOME.
    return tmp_path


def _ledger_entries():
    path = mutation_ledger._ledger_path()
    if not path.is_file():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


class TestRecord:
    def test_create_vs_modify(self, tmp_path):
        f = tmp_path / "a.txt"
        mutation_ledger.record("test", f, "create", None, b"hello")
        mutation_ledger.record("test", f, "modify", b"hello", b"world")
        entries = _ledger_entries()
        assert len(entries) == 2
        assert entries[0]["op"] == "create"
        assert entries[0]["previous_sha256"] is None
        assert entries[0]["new_sha256"] == hashlib.sha256(b"hello").hexdigest()
        assert entries[1]["op"] == "modify"
        assert entries[1]["previous_sha256"] == hashlib.sha256(b"hello").hexdigest()
        assert entries[1]["new_sha256"] == hashlib.sha256(b"world").hexdigest()
        assert all("ts" in e and "aictl_version" in e for e in entries)

    def test_ioerror_does_not_raise(self, monkeypatch, tmp_path):
        monkeypatch.setattr(
            mutation_ledger,
            "_ledger_path",
            lambda: Path("/proc/1/unwritable/ledger.jsonl"),
        )
        # Must not raise.
        mutation_ledger.record("test", tmp_path / "x", "create", None, b"abc")


class TestWriteSafeIntegration:
    def test_write_safe_records_create(self, tmp_path):
        f = tmp_path / "new.txt"
        write_safe(f, "hello", command="unit-test")
        entries = _ledger_entries()
        assert len(entries) == 1
        assert entries[0]["op"] == "create"
        assert entries[0]["path"] == str(f)
        assert entries[0]["command"] == "unit-test"
        assert entries[0]["new_sha256"] == hashlib.sha256(b"hello").hexdigest()

    def test_write_safe_records_modify(self, tmp_path):
        f = tmp_path / "f.txt"
        f.write_text("old")
        write_safe(f, "new", command="unit-test")
        # second entry should be modify
        entries = _ledger_entries()
        assert entries[-1]["op"] == "modify"
        assert entries[-1]["previous_sha256"] == hashlib.sha256(b"old").hexdigest()

    def test_write_safe_survives_ledger_failure(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            mutation_ledger,
            "record",
            lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("boom")),
        )
        f = tmp_path / "still-writes.txt"
        write_safe(f, "payload")
        assert f.read_text() == "payload"


class TestQueries:
    def _seed(self, tmp_path):
        f1 = tmp_path / "a"
        f2 = tmp_path / "b"
        for i in range(3):
            mutation_ledger.record("cmd", f1, "modify", None, f"v{i}".encode())
        for i in range(2):
            mutation_ledger.record("cmd", f2, "modify", None, f"v{i}".encode())
        return f1, f2

    def test_tail(self, tmp_path):
        self._seed(tmp_path)
        assert len(mutation_ledger.tail(2)) == 2
        assert len(mutation_ledger.tail(999)) == 5
        assert mutation_ledger.tail(0) == []

    def test_entries_for_path(self, tmp_path):
        f1, f2 = self._seed(tmp_path)
        assert len(mutation_ledger.entries_for_path(f1)) == 3
        assert len(mutation_ledger.entries_for_path(f2)) == 2
        assert mutation_ledger.entries_for_path(tmp_path / "missing") == []

    def test_since(self, tmp_path):
        f = tmp_path / "f"
        mutation_ledger.record("cmd", f, "create", None, b"x")
        all_so_far = mutation_ledger.all_entries()
        pivot = all_so_far[-1]["ts"]
        mutation_ledger.record("cmd", f, "modify", b"x", b"y")
        after = mutation_ledger.since(pivot)
        assert len(after) == 1
        assert after[0]["new_sha256"] == hashlib.sha256(b"y").hexdigest()
