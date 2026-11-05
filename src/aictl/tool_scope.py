# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The dashboard tool filter, server side: which stored tool ids count as selected.

The UI sends the filter as ``tools=a,b`` (see ``ui/src/utils/toolScope.js`` for
the same rule on the client). No parameter is every tool, an empty ``tools=``
is no tool at all, and ids are compared exactly: ``copilot`` and
``copilot-vscode`` are different ids.

This module is the one place that maps a *selected* id to the *stored*
spellings that belong to it. Stored ids come from the writers: hooks and the
live monitor write the snapshot ids (``claude-code``, ``gemini-cli``,
``copilot-vscode`` ...), the OTel receiver maps ``service.name`` to the same
ids (``codex`` becomes ``codex-cli``) and falls back to ``unknown``.
"""

from __future__ import annotations

from collections.abc import Iterable
from urllib.parse import parse_qs

# Stored values that name no tool. A row with one of these has no tool unless
# its session names one (the session row is the only other place that holds it).
UNATTRIBUTED_IDS: tuple[str, ...] = ("", "any", "unknown")

# A stored id that more than one selectable id can claim. `copilot` is the card
# and file spelling for the settings the VS Code Copilot extension reads, so
# selecting Copilot in VS Code includes it. Nothing is matched by prefix: every
# other id belongs only to itself.
STORED_ID_OWNERS: dict[str, tuple[str, ...]] = {
    "copilot": ("copilot", "copilot-vscode"),
}

_MAX_IDS = 64


def parse_tools_param(query: str) -> tuple[str, ...] | None:
    """Selection from a raw query string.

    ``None`` when ``tools`` is absent (all tools). ``()`` when it is present but
    names nothing (no tool). Otherwise the distinct ids, sorted.
    """
    values = parse_qs(query, keep_blank_values=True).get("tools")
    if values is None:
        return None
    return normalize_selection(part for raw in values for part in raw.split(","))


def normalize_selection(tools: Iterable[str] | None) -> tuple[str, ...] | None:
    """Distinct, sorted, non-blank ids; ``None`` stays ``None`` (all tools)."""
    if tools is None:
        return None
    ids = {t.strip() for t in tools if t and t.strip()}
    return tuple(sorted(ids))[:_MAX_IDS]


def is_unattributed(stored_id: str | None) -> bool:
    """True when a stored tool value names no tool."""
    return (stored_id or "") in UNATTRIBUTED_IDS


def stored_ids_for(selected: Iterable[str]) -> list[str]:
    """The stored spellings that count as one of the selected ids, sorted.

    A selected id always stands for itself; a stored spelling listed in
    ``STORED_ID_OWNERS`` also stands for each id that owns it. Ids that name no
    tool are never selectable.
    """
    chosen = {t for t in selected if not is_unattributed(t)}
    stored = set(chosen)
    for spelling, owners in STORED_ID_OWNERS.items():
        if chosen.intersection(owners):
            stored.add(spelling)
    return sorted(stored)


def is_selected(stored_id: str | None, selected: Iterable[str] | None) -> bool:
    """Does a row stored under `stored_id` belong to the selection?

    Used where rows are filtered in Python; SQL callers use ``stored_ids_for``
    so both read the same rule.
    """
    if selected is None:
        return True
    if is_unattributed(stored_id):
        return False
    return stored_id in stored_ids_for(selected)


def selection_block(tools: tuple[str, ...] | None) -> dict:
    """The selection a response covers, as the response states it."""
    return {"all_tools": tools is None, "tools": None if tools is None else list(tools)}
