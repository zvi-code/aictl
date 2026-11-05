# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Mutation ledger — append-only JSONL audit trail of every file mutation
performed by aictl.

Used by ``aictl audit`` and for post-hoc forensics. The ledger is an audit
trail, not a correctness dependency: I/O failures must never propagate into
callers (see :func:`record`), and ``aictl disable`` works from the real config
files, so rotation dropping an entry loses history and nothing else.

Bounded: the active file rotates to one ``.1`` sibling at ``_MAX_LEDGER_BYTES``,
so the two together stay near twice that. A rewrite of identical bytes is not a
mutation and is not recorded.

TODO: delete recording — no central delete helper exists yet. When one is
introduced, route it through ``record(..., op="delete", new_content=None)``.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger(__name__)


_MAX_LEDGER_BYTES = 1024 * 1024


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
    if op == "modify" and previous_content is not None and previous_content == new_content:
        return
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
        if ledger.exists() and ledger.stat().st_size >= _MAX_LEDGER_BYTES:
            _rotate(ledger)
        with open(ledger, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError as exc:
        log.warning("mutation ledger write failed: %s", exc)


def _rotated_path(ledger: Path) -> Path:
    return ledger.with_name(ledger.name + ".1")


def _rotate(ledger: Path) -> None:
    """Move the active file to ``.1``, keeping at most the newest cap's worth of whole lines.

    The trim is what bounds a file that is already far over the cap (a ledger
    written before rotation existed), which a plain rename would only relocate.
    """
    rotated = _rotated_path(ledger)
    if ledger.stat().st_size > _MAX_LEDGER_BYTES:
        with open(ledger, "rb") as f:
            f.seek(-_MAX_LEDGER_BYTES, os.SEEK_END)
            kept = f.read()
        kept = kept[kept.find(b"\n") + 1 :]
        tmp = ledger.with_name(ledger.name + ".tmp")
        tmp.write_bytes(kept)
        os.replace(tmp, rotated)
        ledger.unlink()
    else:
        os.replace(ledger, rotated)


def _read_all() -> list[dict]:
    ledger = _ledger_path()
    out: list[dict] = []
    for path in (_rotated_path(ledger), ledger):
        if not path.is_file():
            continue
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
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
    """Return all entries still held, oldest-first. Rotation may have dropped older ones."""
    return _read_all()
