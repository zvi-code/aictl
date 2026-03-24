"""Importer registry."""

from . import claude, copilot, cursor

_IMPORTERS = {"claude": claude, "copilot": copilot, "cursor": cursor}


def get(name: str):
    if name not in _IMPORTERS:
        raise SystemExit(f'Unknown importer "{name}". Available: {", ".join(_IMPORTERS)}')
    return _IMPORTERS[name]


def all_names() -> list[str]:
    return list(_IMPORTERS)
