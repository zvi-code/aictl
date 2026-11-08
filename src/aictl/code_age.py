# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Whether the code on disk is newer than the code this process runs.

An editable install, or a checkout aictl runs from, changes on disk while the daemon keeps
running the code it loaded at start. The board's page is read from disk on every load, so it
can ask the old daemon for routes it does not have. The board shows one banner instead.
"""

from __future__ import annotations

import os
import threading
import time
from pathlib import Path

STARTED_AT = time.time()  # when this process loaded aictl
CHECK_EVERY_S = 60.0
_PACKAGE = Path(__file__).resolve().parent
_lock = threading.Lock()
_checked: tuple[float, float | None] = (0.0, None)  # (checked at, newest change after start)


def _newest_change() -> float:
    newest = 0.0
    for folder, dirs, files in os.walk(_PACKAGE):
        dirs[:] = [d for d in dirs if d not in ("__pycache__", "ui", "node_modules")]
        for name in files:
            if name.endswith((".py", ".html", ".js", ".css")):
                try:
                    newest = max(newest, os.stat(os.path.join(folder, name)).st_mtime)
                except OSError:
                    continue
    return newest


def code_changed_at(now: float | None = None) -> float | None:
    """The newest change of aictl's code on disk after this process started, or None. Checked once a minute."""
    global _checked
    now = time.time() if now is None else now
    with _lock:
        checked, value = _checked
        if now - checked < CHECK_EVERY_S:
            return value
    newest = _newest_change()
    value = newest if newest > STARTED_AT + 1.0 else None
    with _lock:
        _checked = (now, value)
    return value
