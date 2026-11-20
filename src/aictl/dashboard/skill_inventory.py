"""Read and cache local skill-file metadata."""

from __future__ import annotations

import time
from collections.abc import Iterable
from pathlib import Path

from ..context_audit import skill_description, skill_locations
from .projection_utils import mask_secrets

SKILL_FILE_TTL_S = 300.0


_SKILL_HEAD_CHARS = 4000


_SKILL_TEXT_CHARS = 100_000


_skill_file_memo: dict[tuple[str, tuple[str, ...]], tuple[float, dict]] = {}


def _read_text(path: str, limit: int) -> str | None:
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            return handle.read(limit)
    except OSError:
        return None


def _skill_file_tokens(path: str) -> int | None:
    """An estimate at four characters per token. The tools do not report a skill's size."""
    try:
        from ..utils import estimate_tokens_from_size

        return estimate_tokens_from_size(Path(path).stat().st_size)
    except OSError:
        return None


def _skill_file(name: str, projects: Iterable[str]) -> dict:
    """Scope, path and description for the Skills panel, kept a few minutes to spare the disk."""
    key = (name, tuple(sorted(p for p in projects if p)))
    now = time.monotonic()
    hit = _skill_file_memo.get(key)
    if hit and now - hit[0] < SKILL_FILE_TTL_S:
        return hit[1]
    rows = skill_locations(name, key[1])
    head = _read_text(rows[0]["path"], _SKILL_HEAD_CHARS) if rows else None
    value = {
        "scope": ", ".join(dict.fromkeys(r["scope"] for r in rows)) or None,
        "path": rows[0]["path"] if rows else None,
        "description": mask_secrets(skill_description(head or "")) or None,
        "file_tokens": _skill_file_tokens(rows[0]["path"]) if rows else None,
    }
    if len(_skill_file_memo) >= 500:
        _skill_file_memo.clear()
    _skill_file_memo[key] = (now, value)
    return value
