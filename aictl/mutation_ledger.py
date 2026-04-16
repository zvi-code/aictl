# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Mutation ledger — append-only JSONL audit trail of every file mutation
performed by aictl.

Used by ``aictl disable``, ``aictl audit``, and for post-hoc forensics.
The ledger is an audit trail, not a correctness dependency: I/O failures
must never propagate into callers (see :func:`record`).

TODO: delete recording — no central delete helper exists yet. When one is
introduced, route it through ``record(..., op="delete", new_content=None)``.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger(__name__)


def _ledger_path() -> Path:
    try:
        from aictl.platforms import config_dir
        return config_dir() / "mutation-log.jsonl"
    except Exception:  # noqa: BLE001
        return Path.home() / ".config" / "aictl" / "mutation-log.jsonl"


def _aictl_version() -> str:
    try:
        from importlib.metadata import PackageNotFoundError, version
        try:
            return version("aictl")
        except PackageNotFoundError:
            return "0.0.0-dev"
    except Exception:  # noqa: BLE001
        return "0.0.0-dev"


def _sha256(data: bytes | None) -> str | None:
    if data is None:
        return None
    return hashlib.sha256(data).hexdigest()


def record(
    command: str,
    path: Path,
    op: str,
    previous_content: bytes | None,
    new_content: bytes | None,
) -> None:
    """Append one entry to the mutation ledger. Never raises."""
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "command": command,
        "path": str(path),
        "op": op,
        "previous_sha256": _sha256(previous_content),
        "new_sha256": _sha256(new_content),
        "aictl_version": _aictl_version(),
    }
    ledger = _ledger_path()
    try:
        ledger.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(entry, ensure_ascii=False) + "\n"
        with open(ledger, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError as exc:
        log.warning("mutation ledger write failed: %s", exc)


def _read_all() -> list[dict]:
    ledger = _ledger_path()
    if not ledger.is_file():
        return []
    try:
        raw = ledger.read_text(encoding="utf-8")
    except OSError:
        return []
    out: list[dict] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def tail(n: int = 50) -> list[dict]:
    """Return the last *n* ledger entries, oldest-first within the tail."""
    entries = _read_all()
    if n <= 0:
        return []
    return entries[-n:]


def entries_for_path(path: Path) -> list[dict]:
    """Return all entries for a given path (exact string match on ``str(path)``)."""
    target = str(path)
    return [e for e in _read_all() if e.get("path") == target]


def since(ts_iso: str) -> list[dict]:
    """Return entries with ts strictly greater than *ts_iso* (ISO8601)."""
    return [e for e in _read_all() if e.get("ts", "") > ts_iso]


def all_entries() -> list[dict]:
    """Return all entries (oldest-first). Used by ``disable`` for planning."""
    return _read_all()
