# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Background runner for periodic local-store ingesters.

Currently drives local session/chat stores for Copilot CLI, Cursor, and
VS Code Copilot chat logs.
Each ingester lives on its own daemon thread and polls every
:data:`POLL_INTERVAL_S` seconds. Failures are logged and swallowed —
the runner never crashes the server.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

from ..ingesters.copilot_session_store import (
    POLL_INTERVAL_S as COPILOT_POLL_INTERVAL_S,
)
from ..ingesters.copilot_session_store import (
    CopilotSessionStoreIngester,
    default_db_path,
)
from ..ingesters.cursor_conversations import (
    DEFAULT_DB_PATH as CURSOR_DEFAULT_DB_PATH,
)
from ..ingesters.cursor_conversations import (
    POLL_INTERVAL_S as CURSOR_POLL_INTERVAL_S,
)
from ..ingesters.cursor_conversations import CursorConversationsIngester
from ..ingesters.vscode_chat_logs import (
    POLL_INTERVAL_S as VSCODE_CHAT_POLL_INTERVAL_S,
)
from ..ingesters.vscode_chat_logs import (
    VSCodeChatLogsIngester,
    default_log_dir as vscode_chat_default_log_dir,
)

log = logging.getLogger(__name__)


@dataclass
class IngesterHandle:
    """Handle to a running ingester (for introspection, e.g. doctor)."""

    name: str
    enabled: bool
    source_path: Path
    source_exists: bool
    ingester: object | None = None
    thread: threading.Thread | None = None
    stop_event: threading.Event = field(default_factory=threading.Event)

    def status(self) -> dict:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "source_path": str(self.source_path),
            "source_exists": self.source_exists,
            "last_poll_ts": getattr(self.ingester, "last_poll_ts", 0.0),
            "last_poll_inserted": getattr(self.ingester, "last_poll_inserted", 0),
        }


def start_ingesters(store) -> dict[str, IngesterHandle]:
    """Start all enabled ingesters. Returns a dict keyed by ingester name."""
    handles: dict[str, IngesterHandle] = {}
    db = getattr(store, "_db", None)
    if db is None:
        return handles

    # ── Copilot CLI session-store (Slice 3.2) ──────────────────
    copilot_path = default_db_path()
    copilot_enabled = copilot_path.exists()
    handle = IngesterHandle(
        name="copilot-session-store",
        enabled=copilot_enabled,
        source_path=copilot_path,
        source_exists=copilot_path.exists(),
    )
    if copilot_enabled:
        ingester = CopilotSessionStoreIngester(copilot_path, db)
        handle.ingester = ingester
        thread = threading.Thread(
            target=_poll_loop,
            args=(ingester, handle.stop_event, COPILOT_POLL_INTERVAL_S, handle.name),
            daemon=True,
            name="ingester-copilot-session-store",
        )
        handle.thread = thread
        thread.start()
    handles[handle.name] = handle

    # ── Cursor conversations DB ─────────────────────────────────
    cursor_path = CURSOR_DEFAULT_DB_PATH
    cursor_enabled = cursor_path.exists()
    c_handle = IngesterHandle(
        name="cursor-conversations",
        enabled=cursor_enabled,
        source_path=cursor_path,
        source_exists=cursor_enabled,
    )
    if cursor_enabled:
        c_ing = CursorConversationsIngester(cursor_path, db)
        c_handle.ingester = c_ing
        c_thread = threading.Thread(
            target=_poll_loop,
            args=(c_ing, c_handle.stop_event, CURSOR_POLL_INTERVAL_S, c_handle.name),
            daemon=True,
            name="ingester-cursor-conversations",
        )
        c_handle.thread = c_thread
        c_thread.start()
    handles[c_handle.name] = c_handle

    # ── VS Code Copilot Chat logs (Slice 3.4a) ─────────────────
    vscode_path = vscode_chat_default_log_dir()
    vscode_enabled = vscode_path.exists()
    v_handle = IngesterHandle(
        name="vscode-chat-logs",
        enabled=vscode_enabled,
        source_path=vscode_path,
        source_exists=vscode_enabled,
    )
    if vscode_enabled:
        v_ing = VSCodeChatLogsIngester(vscode_path, db)
        v_handle.ingester = v_ing
        v_thread = threading.Thread(
            target=_poll_loop,
            args=(v_ing, v_handle.stop_event, VSCODE_CHAT_POLL_INTERVAL_S, v_handle.name),
            daemon=True,
            name="ingester-vscode-chat-logs",
        )
        v_handle.thread = v_thread
        v_thread.start()
    handles[v_handle.name] = v_handle
    return handles


def _poll_loop(
    ingester,
    stop: threading.Event,
    interval: float,
    name: str,
) -> None:
    """Call ``ingester.poll()`` every *interval* seconds until *stop* is set."""
    # Initial poll immediately so the first data point is available.
    try:
        ingester.poll()
    except Exception:  # pragma: no cover - defensive
        log.exception("%s ingester: initial poll failed", name)
    while not stop.wait(timeout=interval):
        try:
            inserted = ingester.poll()
            if inserted:
                log.debug("%s ingester: poll inserted %d rows", name, inserted)
        except Exception:  # pragma: no cover - defensive
            log.exception("%s ingester: poll loop error", name)


def collect_status(handles: dict[str, IngesterHandle] | None) -> list[dict]:
    """Return serialisable status for each registered ingester."""
    if not handles:
        return []
    return [h.status() for h in handles.values()]


def ingester_status_for_doctor(db_path: Path | str | None = None) -> list[dict]:
    """Static status report usable by ``aictl doctor`` (no live server).

    We can't touch the live HTTP server from the monitor CLI, so we
    derive status from filesystem existence + the last ingest-event row
    persisted to the aictl history DB.
    """
    out: list[dict] = []
    src = default_db_path()
    exists = src.exists()
    last_poll_ts = 0.0
    last_row_count = 0
    if db_path:
        try:
            import sqlite3

            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1.0)
            try:
                row = conn.execute(
                    "SELECT MAX(ingested_at) FROM copilot_session_messages"
                ).fetchone()
                if row and row[0]:
                    last_poll_ts = float(row[0])
                row = conn.execute(
                    "SELECT COUNT(*) FROM copilot_session_messages"
                ).fetchone()
                if row:
                    last_row_count = int(row[0])
            finally:
                conn.close()
        except Exception:
            pass
    out.append(
        {
            "name": "copilot-session-store",
            "enabled": exists,
            "source_path": str(src),
            "source_exists": exists,
            "last_poll_ts": last_poll_ts,
            "last_poll_age_s": (time.time() - last_poll_ts) if last_poll_ts else None,
            "rows_ingested_total": last_row_count,
        }
    )
    return out


__all__ = [
    "IngesterHandle",
    "start_ingesters",
    "collect_status",
    "ingester_status_for_doctor",
]
