"""Which files of a tool's session folder the reader reads, ignores on purpose, or does not know.

A file that looks like a session transcript but is neither read nor listed here with a reason is
``unclaimed``: the reader reports it, and a test fails when a fixture tree of any tool holds one.
A new file form (a new compression, a new name) can then never be skipped in silence.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from fnmatch import fnmatchcase
from pathlib import Path

ZSTD = ".zst"


@dataclass(frozen=True)
class SessionFileRules:
    read: tuple[str, ...]
    ignored: dict[str, str] = field(default_factory=dict)  # name pattern -> why it is left alone


RULES: dict[str, SessionFileRules] = {
    "claude-code": SessionFileRules(
        read=("*.jsonl",),
        ignored={"*.jsonl.bak": "a backup copy of a transcript; the transcript itself is read"},
    ),
    "codex-cli": SessionFileRules(read=("rollout-*.jsonl", "rollout-*.jsonl" + ZSTD)),
    "copilot-cli": SessionFileRules(read=("events.jsonl",)),
}


def looks_like_session(name: str) -> bool:
    """A name a session transcript could have, in any form: plain, compressed, backed up or renamed."""
    return ".jsonl" in name or name.startswith("rollout-")


def classify(tool: str, name: str) -> str | None:
    """``read``, ``ignored`` or ``unclaimed`` for a session-like file name; None for any other file."""
    if not looks_like_session(name):
        return None
    rules = RULES[tool]
    if any(fnmatchcase(name, pattern) for pattern in rules.read):
        return "read"
    if any(fnmatchcase(name, pattern) for pattern in rules.ignored):
        return "ignored"
    return "unclaimed"


def codex_rollouts(root: Path) -> tuple[list[Path], list[Path]]:
    """The rollout files under a Codex ``sessions`` folder, and the session-like files nothing reads."""
    read: list[Path] = []
    unclaimed: list[Path] = []
    try:
        for path in root.glob("**/*"):
            kind = classify("codex-cli", path.name)
            if kind == "read":
                read.append(path)
            elif kind == "unclaimed":
                unclaimed.append(path)
    except OSError:
        pass
    return read, unclaimed


def logical_path(path: Path) -> Path:
    """The plain name of a rollout, whether it is stored plain or compressed.

    Codex compresses a finished session by appending ``.zst`` to its name; the session id inside
    the name does not change, so both forms are one session and share one read position.
    """
    return path.with_name(path.name.removesuffix(ZSTD)) if path.name.endswith(ZSTD) else path
