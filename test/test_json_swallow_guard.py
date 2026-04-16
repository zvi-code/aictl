# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Guards against silent data loss when existing JSON config is corrupted.

See claude-plan.md item #4: prior behaviour swallowed ``JSONDecodeError``
from ``merge_json_block`` / ``_load_settings`` and then clobbered the
user's settings file with aictl-only content on the next write.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aictl.utils import (
    CorruptJSONError,
    merge_json_block,
    read_json_or_fail,
)
from aictl.emitters._helpers import _load_settings


# ── read_json_or_fail ──────────────────────────────────────────────


def test_missing_file_returns_empty_dict(tmp_path: Path) -> None:
    """A path that does not exist is treated as ``{}`` — not an error."""
    assert read_json_or_fail(tmp_path / "missing.json") == {}


def test_empty_file_returns_empty_dict(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    p.write_text("", encoding="utf-8")
    assert read_json_or_fail(p) == {}


def test_whitespace_only_file_returns_empty_dict(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    p.write_text("   \n\t  \n", encoding="utf-8")
    assert read_json_or_fail(p) == {}


def test_valid_json_returns_parsed_dict(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    p.write_text(json.dumps({"env": {"FOO": "bar"}}), encoding="utf-8")
    assert read_json_or_fail(p) == {"env": {"FOO": "bar"}}


def test_corrupt_json_without_force_raises(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    original = '{"env": {"FOO": "bar",}'  # trailing comma + missing brace
    p.write_text(original, encoding="utf-8")

    with pytest.raises(CorruptJSONError) as exc:
        read_json_or_fail(p)

    # Error message mentions the path so the user can find it.
    assert str(p) in str(exc.value)
    # File on disk is untouched.
    assert p.read_text("utf-8") == original


def test_corrupt_json_with_force_quarantines_and_returns_empty(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    original = '{"env": {"FOO": "bar",}'
    p.write_text(original, encoding="utf-8")

    result = read_json_or_fail(p, force=True)
    assert result == {}

    # A sibling .bak.<timestamp> containing the corrupted original must exist.
    baks = list(tmp_path.glob("settings.json.bak.*"))
    assert len(baks) == 1, f"expected one backup, got {baks}"
    assert baks[0].read_text("utf-8") == original


def test_non_dict_top_level_without_force_raises(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    p.write_text("[1, 2, 3]", encoding="utf-8")
    with pytest.raises(CorruptJSONError):
        read_json_or_fail(p)


def test_non_dict_top_level_with_force_quarantines(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    p.write_text("[1, 2, 3]", encoding="utf-8")
    assert read_json_or_fail(p, force=True) == {}
    assert list(tmp_path.glob("settings.json.bak.*"))


# ── merge_json_block ───────────────────────────────────────────────


def test_merge_json_block_missing_file_writes_fresh(tmp_path: Path) -> None:
    p = tmp_path / "mcp.json"
    out = merge_json_block(p, "mcpServers", {"a": {"command": "x"}})
    assert json.loads(out) == {"mcpServers": {"a": {"command": "x"}}}


def test_merge_json_block_valid_preserves_user_keys(tmp_path: Path) -> None:
    p = tmp_path / "mcp.json"
    p.write_text(json.dumps({
        "mcpServers": {"user-srv": {"command": "user"}},
        "unrelated": 42,
    }), encoding="utf-8")

    out = merge_json_block(p, "mcpServers", {"aictl-srv": {"command": "aictl"}})
    parsed = json.loads(out)
    assert parsed["unrelated"] == 42
    assert parsed["mcpServers"]["user-srv"] == {"command": "user"}
    assert parsed["mcpServers"]["aictl-srv"] == {"command": "aictl"}


def test_merge_json_block_corrupt_without_force_raises_and_preserves_file(
    tmp_path: Path,
) -> None:
    p = tmp_path / "mcp.json"
    original = '{"mcpServers": {"user-srv": {"command": "user",}'
    p.write_text(original, encoding="utf-8")

    with pytest.raises(CorruptJSONError):
        merge_json_block(p, "mcpServers", {"aictl-srv": {"command": "aictl"}})

    # Critically: the original file has not been modified.
    assert p.read_text("utf-8") == original
    # And no backup is written on the refusal path — the user's file is intact,
    # so there's nothing to back up.
    assert not list(tmp_path.glob("mcp.json.bak.*"))


def test_merge_json_block_corrupt_with_force_writes_backup_and_merges(
    tmp_path: Path,
) -> None:
    p = tmp_path / "mcp.json"
    original = '{"mcpServers": {"user-srv": {"command": "user",}'
    p.write_text(original, encoding="utf-8")

    out = merge_json_block(
        p, "mcpServers", {"aictl-srv": {"command": "aictl"}}, force=True,
    )
    parsed = json.loads(out)
    # User content is lost (it was unparseable) but aictl entries made it in.
    assert parsed == {"mcpServers": {"aictl-srv": {"command": "aictl"}}}

    baks = list(tmp_path.glob("mcp.json.bak.*"))
    assert len(baks) == 1
    assert baks[0].read_text("utf-8") == original


# ── _load_settings (thin wrapper) ──────────────────────────────────


def test_load_settings_corrupt_raises_without_force(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    p.write_text("{not json", encoding="utf-8")
    with pytest.raises(CorruptJSONError):
        _load_settings(p)


def test_load_settings_corrupt_with_force_backs_up(tmp_path: Path) -> None:
    p = tmp_path / "settings.json"
    original = "{not json"
    p.write_text(original, encoding="utf-8")
    assert _load_settings(p, force=True) == {}
    baks = list(tmp_path.glob("settings.json.bak.*"))
    assert len(baks) == 1
    assert baks[0].read_text("utf-8") == original


def test_load_settings_missing_returns_empty(tmp_path: Path) -> None:
    assert _load_settings(tmp_path / "nope.json") == {}
