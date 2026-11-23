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

from ..ingesters import context_items_backfill, loaded_files_backfill, session_titles, tool_size_backfill
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
from ..ingesters.cursor_conversations import CursorConversationsIngester, cursor_ingester_enabled
from ..ingesters.message_facts import MessageFacts, load_checkpoint
from ..ingesters.session_artifacts import (
    POLL_INTERVAL_S as SESSION_ARTIFACTS_POLL_INTERVAL_S,
)
from ..ingesters.session_artifacts import SessionArtifactIndexer
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
from ..monitoring.pace import PACE
from ..state_file import StateFile, restart_directory

log = logging.getLogger(__name__)

# The tool size backfill starts after the first rounds of the readers: both read every transcript.
BACKFILL_DELAY_S = 120.0


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
        poll = getattr(self.ingester, "_aictl_poll_status", {})
        return {
            "name": self.name,
            "enabled": self.enabled,
            "source_path": str(self.source_path),
            "source_exists": self.source_exists,
            "last_poll_ts": getattr(self.ingester, "last_poll_ts", 0.0),
            "last_poll_inserted": getattr(self.ingester, "last_poll_inserted", 0),
            **({"unavailable": unavailable} if (unavailable := getattr(self.ingester, "unavailable", "")) else {}),
            **poll,
        }


def start_ingesters(store) -> dict[str, IngesterHandle]:
    """Start all enabled ingesters. Returns a dict keyed by ingester name."""
    handles: dict[str, IngesterHandle] = {}
    restart_dir = store.restart_dir
    if store.history_store.writer is None or restart_dir is None:
        return handles

    def messages(name: str) -> MessageFacts:
        return MessageFacts(store.session_facts, store.collection_status, StateFile(restart_dir / f"{name}.json"))

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
        ingester = CopilotSessionStoreIngester(copilot_path, messages("copilot_messages"))
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
    cursor_enabled = cursor_ingester_enabled()
    cursor_exists = cursor_path.is_file()
    c_handle = IngesterHandle(
        name="cursor-conversations",
        enabled=cursor_enabled and cursor_exists,
        source_path=cursor_path,
        source_exists=cursor_exists,
    )
    if cursor_enabled:
        c_ing = CursorConversationsIngester(cursor_path, messages("cursor_messages"))
        c_handle.ingester = c_ing
        c_thread = threading.Thread(
            target=_poll_loop,
            args=(c_ing, c_handle.stop_event, CURSOR_POLL_INTERVAL_S, c_handle.name),
            kwargs={"watch_source": c_handle},
            daemon=True,
            name="ingester-cursor-conversations",
        )
        c_handle.thread = c_thread
        c_thread.start()
    handles[c_handle.name] = c_handle

    # ── VS Code Copilot Chat logs (Slice 3.4a) ─────────────────
    vscode_path = vscode_chat_default_log_dir()
    v_ing = VSCodeChatLogsIngester(vscode_path, messages("vscode_messages"), discover=True)
    vscode_enabled = any(d.is_dir() for dirs in v_ing.scan_dirs() for d in dirs)
    v_handle = IngesterHandle(
        name="vscode-chat-logs",
        enabled=vscode_enabled,
        source_path=vscode_path,
        source_exists=vscode_enabled,
    )
    if vscode_enabled:
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
    checkpoint = StateFile(restart_dir / "transcript_usage.json")
    # No saved read position: this node has stored nothing from session files yet.
    new_node = not checkpoint.read()
    from ..platforms import load_config

    t_ing = TranscriptUsageIngester(None, defer_old=True, tool_calls=store.tool_calls,
                                    backfill_days=load_config().history_days,
                                    source_index=lambda rows: store.history_store.writer.upsert("session_sources", rows),
                                    fact_target=store.session_facts, checkpoint=checkpoint,
                                    quality=store.collection_status)
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

    # ── Session folders: an index of each session's files (stat only) ──
    a_ing = SessionArtifactIndexer(store.session_evidence)
    a_handle = IngesterHandle(
        name="session-artifacts",
        enabled=True,
        source_path=t_ing.copilot_state,
        source_exists=t_ing.copilot_state.exists(),
        ingester=a_ing,
    )
    a_thread = threading.Thread(
        target=_poll_loop,
        args=(a_ing, a_handle.stop_event, SESSION_ARTIFACTS_POLL_INTERVAL_S, a_handle.name),
        daemon=True,
        name="ingester-session-artifacts",
    )
    a_handle.thread = a_thread
    a_thread.start()
    handles[a_handle.name] = a_handle

    # ── One-time backfill of tool call sizes (v33) ──────────────
    if t_enabled:
        b_thread = threading.Thread(target=_backfill_transcripts, args=(store, new_node), daemon=True,
                                    name="transcript-backfill")
        b_thread.start()
    return handles


def _backfill_transcripts(store, new_node: bool = False) -> None:
    """Run the one-time transcript backfills.

    They add rows that older versions did not write, to a store that those versions
    filled. A new node has no such rows: its reader writes them all, so each backfill
    is recorded as done and no session file is read a second time. The session names pass
    reads only the name lines and metadata files, and renames after it come with the
    normal polling.
    """
    if store.restart_dir is None:
        return
    backfills = ((tool_size_backfill, store.history_store.writer), (loaded_files_backfill, store.session_facts),
                 (context_items_backfill, store.session_facts), (session_titles, store.session_facts))

    def state(module) -> StateFile:
        return StateFile(store.restart_dir / f"{module.__name__.rsplit('.', 1)[-1]}.json")

    if new_node:
        for module, _ in backfills:
            if not state(module).read().get(module.STATE_KEY):
                state(module).replace({module.STATE_KEY: time.time()})
        return
    time.sleep(BACKFILL_DELAY_S)
    for module, target in backfills:
        try:
            module.run(target, state(module))
        except Exception:
            log.exception("%s failed; it runs again on the next start", module.__name__)


def _record_poll_failure(ingester, name: str, exc: Exception) -> None:
    """Record a data-quality event when an ingester poll raises.

    The poll loop previously only logged, so a crashing ingester was
    invisible in the dashboard. Surface it via the shared data-quality
    channel when the ingester supplies it.
    """
    record_quality = getattr(getattr(ingester, "quality", None), "record_data_quality", None)
    if record_quality is None:
        record_quality = getattr(getattr(ingester, "store", None), "record_data_quality", None)
    if record_quality is None:
        return
    try:
        record_quality(
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
    *,
    watch_source: IngesterHandle | None = None,
) -> None:
    """Call ``ingester.poll()`` every *interval* seconds until *stop* is set."""
    first = True  # initial poll immediately so the first data point is available
    while first or not stop.wait(timeout=interval):
        first = False
        if watch_source is not None:
            watch_source.source_exists = watch_source.source_path.is_file()
            if not watch_source.source_exists:
                # Never installed: optional/off. Disappeared after use: enabled with no source.
                continue
            watch_source.enabled = True
        started = time.perf_counter()
        poll = dict(getattr(ingester, "_aictl_poll_status", {}))
        poll.update(last_poll_ts=time.time(), poll_in_flight=True)
        ingester._aictl_poll_status = poll
        try:
            inserted = ingester.poll()
            poll.update(
                last_success_at=time.time(),
                last_success_started_at=poll["last_poll_ts"],
                last_error=None,
                last_poll_inserted=inserted,
                rows_ingested_total=poll.get("rows_ingested_total", 0) + (inserted or 0),
            )
            if inserted:
                # New session data means a tool is working: collectors keep their full pace.
                PACE.note_activity()
                log.debug("%s ingester: poll inserted %d rows", name, inserted)
        except Exception as exc:
            poll.update(last_error=str(exc), last_error_at=time.time())
            log.exception("%s ingester: poll loop error", name)
            _record_poll_failure(ingester, name, exc)
        finally:
            poll.update(poll_in_flight=False, last_poll_duration_ms=(time.perf_counter() - started) * 1000)
            ingester._aictl_poll_status = poll


def collect_status(handles: dict[str, IngesterHandle] | None) -> list[dict]:
    """Return serialisable status for each registered ingester."""
    if not handles:
        return []
    return [h.status() for h in handles.values()]


def ingester_status_for_doctor(db_path: Path | str | None = None) -> list[dict]:
    """Report source presence and the last checkpoint without opening history."""
    from ..stores import configured_destination

    src = default_db_path()
    exists = src.exists()
    last_poll_ts = 0.0
    if (settings := configured_destination()) is not None:
        directory = restart_directory(settings.cluster, settings.database, settings.node_id)
        saved = load_checkpoint(StateFile(directory / "copilot_messages.json"), src)
        ts = saved.get("last_poll_ts")
        if type(ts) in (float, int) and ts > 0:
            last_poll_ts = ts
    return [
        {
            "name": "copilot-session-store",
            "enabled": exists,
            "source_path": str(src),
            "source_exists": exists,
            "last_poll_ts": last_poll_ts,
            "last_poll_age_s": (time.time() - last_poll_ts) if last_poll_ts else None,
        },
    ]


__all__ = [
    "IngesterHandle",
    "start_ingesters",
    "collect_status",
    "ingester_status_for_doctor",
]
