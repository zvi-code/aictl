"""Codex stores a finished session as ``rollout-*.jsonl.zst``: the reader must read it, once, and say so when it cannot.

All fixtures are invented lines in a temporary folder; nothing here reads the real Codex folder.
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import pytest
from core_store_fakes import UsageFacts

from aictl.ingesters import session_files, zstd_stream
from aictl.ingesters.transcript_usage import TranscriptUsageIngester

SID = "01a1ab04-b303-7ec3-9a37-24651494cea2"
NAME = f"rollout-2026-11-05T11-22-54-{SID}"

try:
    from compression import zstd as _std
except ImportError:  # Python < 3.14
    _std = None
    try:
        import zstandard as _pkg
    except ImportError:
        _pkg = None

needs_zstd = pytest.mark.skipif(
    _std is None and _pkg is None,
    reason="no zstd implementation (compression.zstd or zstandard) in this Python",
)


def compress(data: bytes) -> bytes:
    if _std is not None:
        return _std.compress(data)
    return _pkg.ZstdCompressor().compress(data)


def ts(ago):
    return datetime.fromtimestamp(time.time() - ago).astimezone().isoformat()


def total(inp, cached, out):
    return {"input_tokens": inp, "cached_input_tokens": cached, "cache_write_input_tokens": 0, "output_tokens": out}


def lines(steps=((1000, 800, 50), (3000, 2500, 80))):
    rows = [
        {"type": "session_meta", "timestamp": ts(2000),
         "payload": {"id": SID, "session_id": SID, "source": "cli", "cwd": "/synthetic/project"}},
        {"type": "event_msg", "timestamp": ts(1999), "payload": {"type": "task_started"}},
        {"type": "turn_context", "timestamp": ts(1999), "payload": {"model": "gpt-6.1-sol"}},
    ]
    for i, step in enumerate(steps):
        rows.append({"type": "response_item", "timestamp": ts(1500 - i), "payload": {"type": "function_call"}})
        rows.append({"type": "event_msg", "timestamp": ts(1500 - i),
                     "payload": {"type": "token_count", "info": {"total_token_usage": total(*step)}}})
    return rows


def encode(rows):
    return b"".join(json.dumps(r).encode() + b"\n" for r in rows)


class Quality:
    def __init__(self):
        self.events = []

    def record_data_quality(self, component, status, **kw):
        self.events.append((component, status, kw))

    def last(self):
        return self.events[-1]


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "home"))
    return tmp_path


def day(tmp_path):
    folder = tmp_path / "codex" / "2026" / "11" / "05"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def reader(tmp_path, db=None, quality=None):
    db = db or UsageFacts()
    ing = TranscriptUsageIngester(
        db, claude_projects=tmp_path / "claude", codex_sessions=tmp_path / "codex",
        copilot_state=tmp_path / "copilot", vscode_workspaces=tmp_path / "vscode", quality=quality,
    )
    return ing, db


def usage(db):
    rows = db.usage_rows(session_ids=[SID])
    assert rows, "no usage row: the rollout was not read"
    row = rows[0]
    return (row["input_tokens"], row["cache_read_tokens"], row["output_tokens"], row["turn_count"], row["tool_call_count"])


EXPECTED = (500, 2500, 80, 1, 2)


@needs_zstd
class TestCompressedRollout:
    def test_a_compressed_rollout_gives_the_facts_of_the_same_lines_plain(self, home):
        plain_root = home / "a"
        (plain_root / "codex").mkdir(parents=True)
        rows = lines()
        (plain_root / "codex" / f"{NAME}.jsonl").write_bytes(encode(rows))
        ing, plain_db = reader(plain_root)
        ing.poll()
        day(home).joinpath(f"{NAME}.jsonl.zst").write_bytes(compress(encode(rows)))
        ing, zst_db = reader(home)
        ing.poll()
        assert usage(zst_db) == usage(plain_db) == EXPECTED

    def test_reading_twice_does_not_count_again(self, home):
        day(home).joinpath(f"{NAME}.jsonl.zst").write_bytes(compress(encode(lines())))
        ing, db = reader(home)
        ing.poll()
        ing.poll()
        assert usage(db) == EXPECTED

    def test_a_restarted_reader_with_the_same_file_does_not_count_again(self, home):
        day(home).joinpath(f"{NAME}.jsonl.zst").write_bytes(compress(encode(lines())))
        db = UsageFacts()
        for _ in range(2):
            ing, _ = reader(home, db)
            ing.poll()
        assert usage(db) == EXPECTED

    def test_plain_then_compressed_form_of_one_session_reads_each_line_once(self, home):
        rows = lines()
        folder = day(home)
        plain = folder / f"{NAME}.jsonl"
        plain.write_bytes(encode(rows[:5]))  # a session still being written
        ing, db = reader(home)
        ing.poll()
        # The session ends: Codex compresses the whole rollout and removes the plain file.
        (folder / f"{NAME}.jsonl.zst").write_bytes(compress(encode(rows)))
        plain.unlink()
        ing.poll()
        assert usage(db) == EXPECTED
        ing.poll()
        assert usage(db) == EXPECTED

    def test_both_forms_present_at_once_are_one_session(self, home):
        rows = lines()
        folder = day(home)
        (folder / f"{NAME}.jsonl").write_bytes(encode(rows))
        (folder / f"{NAME}.jsonl.zst").write_bytes(compress(encode(rows)))
        ing, db = reader(home)
        ing.poll()
        assert usage(db) == EXPECTED

    def test_a_compressed_file_that_gains_a_frame_reads_only_the_new_lines(self, home):
        rows = lines()
        path = day(home) / f"{NAME}.jsonl.zst"
        path.write_bytes(compress(encode(rows[:5])))
        ing, db = reader(home)
        ing.poll()
        path.write_bytes(path.read_bytes() + compress(encode(rows[5:])))
        ing.poll()
        assert usage(db) == EXPECTED

    def test_a_truncated_file_is_reported_and_does_not_stop_the_others(self, home):
        folder = day(home)
        good = compress(encode(lines()))
        (folder / f"{NAME}.jsonl.zst").write_bytes(good)
        other = "rollout-2026-11-05T12-00-00-01a1ab04-0000-7000-8000-000000000001.jsonl.zst"
        (folder / other).write_bytes(compress(encode(lines()))[:-8])
        quality = Quality()
        ing, db = reader(home, quality=quality)
        ing.poll()
        ing.poll()
        assert usage(db) == EXPECTED
        component, status, kw = quality.last()
        assert component == "ingester:transcript-usage" and status == "degraded"
        assert "1 Codex rollout" in kw["message"] and "cannot be read" in kw["message"]
        assert kw["detail"]["unreadable"]["codex-cli"] == 1

    def test_a_file_that_is_not_zstd_is_reported(self, home):
        (day(home) / f"{NAME}.jsonl.zst").write_bytes(b"this is not compressed data\n")
        quality = Quality()
        ing, _ = reader(home, quality=quality)
        ing.poll()
        assert quality.last()[1] == "degraded"
        assert quality.last()[2]["detail"]["unreadable"]["codex-cli"] == 1

    def test_a_file_fixed_after_an_error_is_read(self, home):
        path = day(home) / f"{NAME}.jsonl.zst"
        good = compress(encode(lines()))
        path.write_bytes(good[:-8])
        quality = Quality()
        ing, db = reader(home, quality=quality)
        ing.poll()
        path.write_bytes(good)
        ing.poll()
        assert usage(db) == EXPECTED
        assert quality.last()[1] == "ok"


@needs_zstd
class TestWithoutTheStandardLibraryModule:
    def test_the_zstandard_package_is_used_when_the_standard_module_is_absent(self, home, monkeypatch):
        """A stand-in package with the zstandard API, over the real codec, with ``compression.zstd`` hidden."""
        import types

        data = compress(encode(lines()))
        real = _std

        class Package(types.ModuleType):
            class ZstdDecompressor:
                def decompressobj(self):
                    return real.ZstdDecompressor()

        if real is None:
            pytest.skip("the real zstandard package is exercised directly on this Python")
        monkeypatch.setitem(sys.modules, "compression.zstd", None)
        monkeypatch.setitem(sys.modules, "zstandard", Package("zstandard"))
        day(home).joinpath(f"{NAME}.jsonl.zst").write_bytes(data)
        ing, db = reader(home)
        ing.poll()
        assert usage(db) == EXPECTED


class TestNoZstdLibrary:
    def hide_libraries(self, monkeypatch):
        monkeypatch.setitem(sys.modules, "compression.zstd", None)
        monkeypatch.setitem(sys.modules, "zstandard", None)

    def test_the_reader_says_how_many_rollouts_it_cannot_read_and_why(self, home, monkeypatch):
        self.hide_libraries(monkeypatch)
        folder = day(home)
        for i in range(3):
            (folder / f"rollout-2026-11-05T11-22-5{i}-01a1ab04-b303-7ec3-9a37-24651494ce{i}2.jsonl.zst").write_bytes(b"x")
        quality = Quality()
        ing, db = reader(home, quality=quality)
        ing.poll()
        component, status, kw = quality.last()
        assert (component, status, kw["severity"]) == ("ingester:transcript-usage", "degraded", "warning")
        assert "3 Codex rollout(s) cannot be read" in kw["message"]
        assert "zstd" in kw["message"] and "zstandard" in kw["message"]
        assert kw["detail"]["unreadable"] == {"codex-cli": 3, "reason": zstd_stream.NO_LIBRARY}
        assert not db.usage_rows()

    def test_plain_rollouts_are_still_read_without_a_library(self, home, monkeypatch):
        self.hide_libraries(monkeypatch)
        (day(home) / f"{NAME}.jsonl").write_bytes(encode(lines()))
        quality = Quality()
        ing, db = reader(home, quality=quality)
        ing.poll()
        assert usage(db) == EXPECTED
        assert quality.last()[1] == "ok"

    def test_the_library_is_found_when_it_appears_later(self, home, monkeypatch):
        if not zstd_stream.available():
            pytest.skip("no zstd implementation in this Python")
        self.hide_libraries(monkeypatch)
        day(home).joinpath(f"{NAME}.jsonl.zst").write_bytes(compress(encode(lines())))
        ing, db = reader(home)
        ing.poll()
        assert not db.usage_rows()
        monkeypatch.undo()
        ing.poll()
        assert usage(db) == EXPECTED


class TestEverySessionFileHasADecision:
    """A session-like file is read, ignored with a reason, or reported: never skipped in silence."""

    TREES = {
        "claude-code": {
            "projects/-p/aaaa.jsonl": "read",
            "projects/-p/aaaa/subagents/agent-1.jsonl": "read",
            "projects/-p/aaaa/subagents/agent-1.meta.json": None,
            "projects/-p/notes.txt": None,
            "projects/-p/aaaa.jsonl.bak": "ignored",
            "projects/-p/aaaa.jsonl.zst": "unclaimed",
        },
        "codex-cli": {
            f"2026/11/05/{NAME}.jsonl": "read",
            f"2026/11/05/{NAME}.jsonl.zst": "read",
            f"2026/11/05/{NAME}.jsonl.gz": "unclaimed",
            "2026/11/05/rollout-x.tmp": "unclaimed",
            "2026/11/05/other.txt": None,
        },
        "copilot-cli": {
            "sid/events.jsonl": "read",
            "sid/workspace.yaml": None,
            "sid/events.jsonl.zst": "unclaimed",
            "sid/extra.jsonl": "unclaimed",
        },
    }

    @pytest.mark.parametrize("tool", sorted(TREES))
    def test_the_rules_classify_each_fixture_file(self, tool):
        for rel, want in self.TREES[tool].items():
            assert session_files.classify(tool, rel.rsplit("/", 1)[-1]) == want, rel

    @pytest.mark.parametrize("tool", sorted(TREES))
    def test_the_reader_reads_exactly_the_files_the_rules_call_read(self, tmp_path, tool):
        tree = tmp_path / {"claude-code": "claude", "codex-cli": "codex", "copilot-cli": "copilot"}[tool]
        folder = tree / {"claude-code": "", "codex-cli": "", "copilot-cli": ""}[tool]
        for rel in self.TREES[tool]:
            path = folder / rel.removeprefix("projects/") if tool == "claude-code" else folder / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"{}\n")
        ing = TranscriptUsageIngester(
            UsageFacts(), claude_projects=tmp_path / "claude", codex_sessions=tmp_path / "codex",
            copilot_state=tmp_path / "copilot", vscode_workspaces=tmp_path / "vscode",
        )
        ing.poll()
        found = {p.relative_to(tree).as_posix() for p, (t, _, _) in ing._found.items() if t == tool}
        expected = {
            (rel.removeprefix("projects/") if tool == "claude-code" else rel)
            for rel, kind in self.TREES[tool].items() if kind == "read"
        }
        # a compressed rollout beside its plain twin is the same session
        if tool == "codex-cli":
            expected -= {f"2026/11/05/{NAME}.jsonl.zst"}
        assert found == expected

    def test_no_unclaimed_file_is_in_the_fixture_of_a_tool_unless_marked_so(self):
        for tool, tree in self.TREES.items():
            names = [rel.rsplit("/", 1)[-1] for rel in tree]
            unclaimed = {n for n in names if session_files.classify(tool, n) == "unclaimed"}
            marked = {rel.rsplit("/", 1)[-1] for rel, kind in tree.items() if kind == "unclaimed"}
            assert unclaimed == marked, tool

    def test_the_reader_reports_a_rollout_form_it_does_not_know(self, home):
        (day(home) / f"{NAME}.jsonl.gz").write_bytes(b"x")
        (day(home) / f"{NAME}.jsonl").write_bytes(encode(lines()))
        quality = Quality()
        ing, _ = reader(home, quality=quality)
        ing.poll()
        status, kw = quality.last()[1], quality.last()[2]
        assert status == "degraded"
        assert "not a form the reader knows" in kw["message"]
        assert kw["detail"]["unclaimed_files"] == {"codex-cli": 1}


def test_a_compressed_rollout_and_its_plain_form_share_one_name():
    assert session_files.logical_path(Path(f"/s/2026/11/05/{NAME}.jsonl.zst")) == Path(f"/s/2026/11/05/{NAME}.jsonl")
    assert session_files.logical_path(Path(f"/s/{NAME}.jsonl")) == Path(f"/s/{NAME}.jsonl")
