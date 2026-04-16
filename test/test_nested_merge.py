# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Regression tests for deep-merge semantics in ``merge_json_block``.

The original implementation did a single-level ``dict.update``, which
clobbered entire nested sub-objects.  VS Code namespaced settings like
``"[python]": {...}`` made this a live footgun: writing one sub-key would
drop every other sub-key previously configured for that namespace.
"""

from __future__ import annotations

import json
from pathlib import Path

from aictl.utils import merge_json_block


def test_flat_keys_behaviour_unchanged(tmp_path: Path) -> None:
    """Top-level scalar updates: new wins, untouched keys preserved."""
    p = tmp_path / "settings.json"
    p.write_text(json.dumps({"editor.tabSize": 4, "editor.fontSize": 14}), encoding="utf-8")

    out = merge_json_block(p, None, {"editor.tabSize": 2})
    parsed = json.loads(out)
    assert parsed == {"editor.tabSize": 2, "editor.fontSize": 14}


def test_nested_dict_preserves_unrelated_subkeys(tmp_path: Path) -> None:
    """The critical VS Code ``[python]`` namespace case."""
    p = tmp_path / "settings.json"
    p.write_text(
        json.dumps(
            {
                "[python]": {
                    "editor.formatOnSave": True,
                    "editor.rulers": [80, 120],
                    "editor.defaultFormatter": "ms-python.black-formatter",
                }
            }
        ),
        encoding="utf-8",
    )

    out = merge_json_block(p, None, {"[python]": {"editor.tabSize": 4}})
    parsed = json.loads(out)
    assert parsed["[python]"] == {
        "editor.formatOnSave": True,
        "editor.rulers": [80, 120],
        "editor.defaultFormatter": "ms-python.black-formatter",
        "editor.tabSize": 4,
    }


def test_nested_merge_under_wrapper_key(tmp_path: Path) -> None:
    """Deep merge must also apply inside a wrapper_key block."""
    p = tmp_path / "settings.json"
    p.write_text(
        json.dumps({"mcpServers": {"user-srv": {"command": "user", "args": ["--flag"], "env": {"A": "1"}}}}),
        encoding="utf-8",
    )

    out = merge_json_block(
        p,
        "mcpServers",
        {"user-srv": {"env": {"B": "2"}}},
    )
    parsed = json.loads(out)
    # command and args preserved; env deep-merged
    assert parsed["mcpServers"]["user-srv"] == {
        "command": "user",
        "args": ["--flag"],
        "env": {"A": "1", "B": "2"},
    }


def test_scalar_incoming_replaces_existing_dict(tmp_path: Path) -> None:
    """Explicit override: if the caller passes a scalar where a dict existed, scalar wins."""
    p = tmp_path / "settings.json"
    p.write_text(json.dumps({"foo": {"nested": 1}}), encoding="utf-8")

    out = merge_json_block(p, None, {"foo": "scalar"})
    assert json.loads(out) == {"foo": "scalar"}


def test_dict_incoming_replaces_existing_scalar(tmp_path: Path) -> None:
    """Symmetric: dict incoming where scalar existed — dict wins wholesale."""
    p = tmp_path / "settings.json"
    p.write_text(json.dumps({"foo": "old-scalar"}), encoding="utf-8")

    out = merge_json_block(p, None, {"foo": {"nested": 1}})
    assert json.loads(out) == {"foo": {"nested": 1}}


def test_list_replaces_list_no_concat(tmp_path: Path) -> None:
    """Lists are replaced, not concatenated (concatenation would duplicate on redeploy)."""
    p = tmp_path / "settings.json"
    p.write_text(json.dumps({"rulers": [80, 120]}), encoding="utf-8")

    out = merge_json_block(p, None, {"rulers": [100]})
    assert json.loads(out) == {"rulers": [100]}


def test_deep_nested_three_levels(tmp_path: Path) -> None:
    """Recursion works at arbitrary depth."""
    p = tmp_path / "settings.json"
    p.write_text(
        json.dumps({"a": {"b": {"c": 1, "d": 2}, "e": 3}}),
        encoding="utf-8",
    )

    out = merge_json_block(p, None, {"a": {"b": {"c": 99}}})
    parsed = json.loads(out)
    assert parsed == {"a": {"b": {"c": 99, "d": 2}, "e": 3}}
