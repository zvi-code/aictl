# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emitters package."""

from abc import ABC, abstractmethod
from typing import ClassVar

# ── Registry (from registry.py) ──

from . import claude, copilot, cursor, windsurf, gemini

_EMITTERS = {"claude": claude, "copilot": copilot, "cursor": cursor, "windsurf": windsurf, "gemini": gemini}


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


# ── BaseEmitter ──

class BaseEmitter(ABC):
    NAME: ClassVar[str]
    GITIGNORE: ClassVar[list[str]] = []

    @abstractmethod
    def emit(self, root, resolved, dry_run: bool = False) -> list[dict]: ...

    def _combine_scope_text(self, scope) -> str:
        combined = scope.base
        if getattr(scope, "profile_text", None):
            combined += "\n\n" + scope.profile_text
        return combined
