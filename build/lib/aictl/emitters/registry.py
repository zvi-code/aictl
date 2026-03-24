"""Emitter registry."""

from . import claude, copilot, cursor

_EMITTERS = {"claude": claude, "copilot": copilot, "cursor": cursor}


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
