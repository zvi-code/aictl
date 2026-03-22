# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emitter registry."""

from . import claude, copilot, cursor, windsurf

_EMITTERS = {"claude": claude, "copilot": copilot, "cursor": cursor, "windsurf": windsurf}


def get(name: str):
    if name not in _EMITTERS:
        raise SystemExit(f'Unknown emitter "{name}". Available: {", ".join(_EMITTERS)}')
    return _EMITTERS[name]


def all_names() -> list[str]:
    return list(_EMITTERS)


def all_gitignore() -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for mod in _EMITTERS.values():
        for e in mod.GITIGNORE:
            if e not in seen:
                seen.add(e)
                out.append(e)
    return out
