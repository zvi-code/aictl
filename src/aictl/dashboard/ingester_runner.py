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
import sqlite3
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
from ..ingesters.transcript_usage import (
    POLL_INTERVAL_S as TRANSCRIPT_USAGE_POLL_INTERVAL_S,
)
from ..ingesters.transcript_usage import TranscriptUsageIngester
from ..ingesters.vscode_chat_logs import (
    POLL_INTERVAL_S as VSCODE_CHAT_POLL_INTERVAL_S,
)
from ..ingesters.vscode_chat_logs import (
    VSCodeChatLogsIngester,
)
from ..ingesters.vscode_chat_logs import (
    default_log_dir as vscode_chat_default_log_dir,
)
from ..storage import is_lock_error

log = logging.getLogger(__name__)

# An ingester whose store stays busy this long is reported as failed, and again after as long.
LOCKED_REPORT_S = 300.0


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

    # ── Transcript usage: exact tokens for Claude Code, Codex, Copilot CLI ──
    t_ing = TranscriptUsageIngester(db)
    t_enabled = t_ing.source_exists()
    t_handle = IngesterHandle(
        name="transcript-usage",
        enabled=t_enabled,
        source_path=t_ing.claude_projects,
        source_exists=t_enabled,
    )
    if t_enabled:
        t_handle.ingester = t_ing
        t_thread = threading.Thread(
            target=_poll_loop,
            args=(t_ing, t_handle.stop_event, TRANSCRIPT_USAGE_POLL_INTERVAL_S, t_handle.name),
            daemon=True,
            name="ingester-transcript-usage",
        )
        t_handle.thread = t_thread
        t_thread.start()
    handles[t_handle.name] = t_handle
    return handles


def _record_poll_failure(ingester, name: str, exc: Exception) -> None:
    """Record a data-quality event when an ingester poll raises.

    The poll loop previously only logged, so a crashing ingester was
    invisible in the dashboard. Surface it via the shared data-quality
    channel (guarded — a store without ``record_data_quality`` is a no-op).
    """
    store = getattr(ingester, "store", None)
    if store is None or not hasattr(store, "record_data_quality"):
        return
    try:
        store.record_data_quality(
            f"ingester:{name}",
            "failed",
            kind="ingester",
            severity="error",
            message="Ingester poll loop raised",
            source=str(getattr(ingester, "db_path", getattr(ingester, "log_dir", ""))),
            detail={"error": str(exc)},
        )
    except Exception:  # noqa: BLE001  # pragma: no cover - recording must never crash the loop
        log.debug("%s ingester: failed to record poll-failure quality event", name)


def _poll_loop(
    ingester,
    stop: threading.Event,
    interval: float,
    name: str,
) -> None:
    """Call ``ingester.poll()`` every *interval* seconds until *stop* is set."""
    locked_since: float | None = None  # a busy store skips the round: logged once, until a poll succeeds
    reported_at = 0.0
    first = True  # initial poll immediately so the first data point is available
    while first or not stop.wait(timeout=interval):
        first = False
        try:
            inserted = ingester.poll()
            locked_since = None
            if inserted:
                log.debug("%s ingester: poll inserted %d rows", name, inserted)
        except sqlite3.OperationalError as exc:
            if not is_lock_error(exc):
                log.exception("%s ingester: poll loop error", name)
                _record_poll_failure(ingester, name, exc)
                continue
            store = getattr(ingester, "store", None)
            writes = ", ".join(store.active_writes()) if hasattr(store, "active_writes") else ""
            now = time.monotonic()
            if locked_since is None:
                locked_since = reported_at = now
                level = logging.WARNING
            elif now - reported_at >= LOCKED_REPORT_S:
                # Still locked after a long time: say so loudly and mark the ingester failed.
                reported_at = now
                level = logging.WARNING
                _record_poll_failure(ingester, name, exc)
            else:
                level = logging.DEBUG
            log.log(
                level,
                "%s ingester: store busy for %.0f s, round skipped and retried: %s. Writes running in this process: %s",
                name,
                now - locked_since,
                exc,
                writes or "none",
            )
        except Exception as exc:  # pragma: no cover - defensive
            log.exception("%s ingester: poll loop error", name)
            _record_poll_failure(ingester, name, exc)


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
