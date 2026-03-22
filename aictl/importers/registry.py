# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Importer registry."""

from . import claude, copilot, cursor, windsurf, plugin

_IMPORTERS = {"claude": claude, "copilot": copilot, "cursor": cursor, "windsurf": windsurf, "plugin": plugin}


def get(name: str):
    if name not in _IMPORTERS:
        raise SystemExit(f'Unknown importer "{name}". Available: {", ".join(_IMPORTERS)}')
    return _IMPORTERS[name]


def all_names() -> list[str]:
    return list(_IMPORTERS)
