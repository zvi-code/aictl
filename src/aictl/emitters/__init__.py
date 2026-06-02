# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emitters package."""

# ── Registry (from registry.py) ──
from . import claude, copilot, cursor, gemini, windsurf

_EMITTERS = {"claude": claude, "copilot": copilot, "cursor": cursor, "windsurf": windsurf, "gemini": gemini}


def get(name: str):
    if name not in _EMITTERS:
        raise SystemExit(f'Unknown emitter "{name}". Available: {", ".join(_EMITTERS)}')
    return _EMITTERS[name]


def all_names() -> list[str]:
    return list(_EMITTERS)
