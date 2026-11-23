# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The data files that drive the Settings screen load strictly and hold one entry per key."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import pytest

from aictl.data.schema import DuplicateKeyError, load_unique_yaml

DATA = Path(__file__).resolve().parent.parent / "src" / "aictl" / "data"


def test_loader_refuses_a_duplicate_key():
    with pytest.raises(DuplicateKeyError):
        load_unique_yaml("copilot-cli:\n  a: 1\ncopilot-cli:\n  a: 2\n")
    with pytest.raises(DuplicateKeyError):
        load_unique_yaml("tools:\n  x:\n    keys: []\n    keys: [1]\n")
    assert load_unique_yaml("a: 1\nb: {c: 2}\n") == {"a": 1, "b": {"c": 2}}


@pytest.mark.parametrize("name", ["tool-configs.yaml", "settings-catalog.yaml"])
def test_settings_data_files_have_no_duplicate_keys(name):
    load_unique_yaml((DATA / name).read_text(encoding="utf-8"))


def test_catalog_keys_unique_per_tool_and_typed():
    catalog = load_unique_yaml((DATA / "settings-catalog.yaml").read_text(encoding="utf-8"))
    assert isinstance(catalog, dict) and isinstance(catalog.get("tools"), dict)
    for tool, spec in catalog["tools"].items():
        entries = spec.get("keys") or []
        keys = Counter(str(e.get("key")) for e in entries)
        assert not [k for k, n in keys.items() if n > 1], tool
        for entry in entries:
            assert entry.get("key"), (tool, entry)
            assert entry.get("type"), (tool, entry["key"])


def test_tool_configs_have_one_entry_per_tool():
    from aictl.data.schema import load_tool_configs

    tools = load_tool_configs()
    assert "copilot-cli" in tools and "copilot-desktop" in tools
