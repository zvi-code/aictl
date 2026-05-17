# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Ingest VS Code Copilot Chat conversation logs.

VS Code's Copilot Chat extension persists each chat session as a
``.jsonl`` file under
``workspaceStorage/<workspace_hash>/chatSessions/<session_id>.jsonl``.

The first line (``kind=0``) is a full snapshot of the chat state:

    {"kind": 0, "v": {"sessionId": "...", "creationDate": ...,
                       "requests": [...], ...}}

Subsequent lines are incremental mutations (``kind=1``) with a
JSON-path ``k`` and a value ``v``; in practice the snapshot already
contains the bulk of the visible conversation. For simplicity and
robustness we re-parse each changed file on every poll and treat the
snapshot's ``requests`` array as the source of truth.

Each request becomes **two** messages in our store: a ``user`` row
from ``request.message.text`` and an ``assistant`` row built by
concatenating text parts from ``request.response`` (a list of markdown
fragments / thinking blocks / tool-call markers).

Correlation strategy
--------------------
VS Code does not expose its workspace path inside the ``.jsonl`` file,
so we cannot always map a chat session back to one of our
``sessions`` rows by project. We use the file's ``sessionId`` as the
canonical key, prefixed with ``vscode-chat:`` for our provisional
session rows when no existing session matches.

All errors are soft — missing dir, unreadable file, partial JSON — so
``poll()`` returns ``0`` rather than raising.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ..storage import HistoryDB

log = logging.getLogger(__name__)

POLL_INTERVAL_S: float = 60.0
"""Default polling interval (seconds) — chat logs move slower than CLI stores."""

# Cap individual message length so a single pathological chat can't
# blow out the DB. Matches the limit used by /api/session-messages.
_MAX_CONTENT_CHARS = 20_000


def default_log_dir() -> Path:
    """Return the default VS Code ``User`` directory (platform-aware)."""
    if sys.platform == "darwin":
        base = Path("~/Library/Application Support/Code/User").expanduser()
    elif sys.platform.startswith("win"):
        appdata = os.environ.get("APPDATA", "")
        base = Path(appdata) / "Code" / "User" if appdata else Path.home() / "AppData/Roaming/Code/User"
    else:
        base = Path("~/.config/Code/User").expanduser()
    return base / "workspaceStorage"


class VSCodeChatLogsIngester:
    """Periodic ingester for VS Code Copilot Chat ``.jsonl`` sessions.

    Parameters
    ----------
    log_dir:
        Directory to scan. Must be the root ``workspaceStorage``
        directory; we recurse to find ``*/chatSessions/*.jsonl`` files.
        ``None`` uses :func:`default_log_dir`.
    our_store:
        Shared :class:`~aictl.storage.HistoryDB` we write into.
    last_cursor:
        Per-file watermark ``{source_file: (mtime, size)}`` used to
        skip unchanged files.
    """

    def __init__(
        self,
        log_dir: Path | str | None,
        our_store: "HistoryDB",
        last_cursor: dict[str, tuple[float, int]] | None = None,
    ) -> None:
        self.log_dir = Path(log_dir).expanduser() if log_dir else default_log_dir()
        self.store = our_store
        self.last_cursor: dict[str, tuple[float, int]] = dict(last_cursor or {})
        self.last_poll_ts: float = 0.0
        self.last_poll_inserted: int = 0

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Scan for new/changed chat session files and ingest any new turns."""
        self.last_poll_ts = time.time()
        if not self.log_dir.exists() or not self.log_dir.is_dir():
            self.last_poll_inserted = 0
            return 0

        inserted = 0
        try:
            files = list(self.log_dir.glob("*/chatSessions/*.jsonl"))
        except OSError as exc:
            log.debug("vscode chat ingester: glob failed (%s)", exc)
            self.last_poll_inserted = 0
            return 0

        for path in files:
            try:
                st = path.stat()
            except OSError:
                continue
            key = str(path)
            prev = self.last_cursor.get(key)
            if prev and prev == (st.st_mtime, st.st_size):
                continue
            try:
                inserted += self._ingest_file(path)
            except Exception as exc:  # pragma: no cover - defensive
                log.debug("vscode chat ingester: %s failed (%s)", path, exc)
                continue
            # Refresh mtime/size after ingest — the file may have grown
            # again in between, but we'll pick that up on the next poll.
            try:
                st2 = path.stat()
                self.last_cursor[key] = (st2.st_mtime, st2.st_size)
            except OSError:
                pass

        self.last_poll_inserted = inserted
        return inserted

    # ── file parsing ──────────────────────────────────────────

    def _ingest_file(self, path: Path) -> int:
        """Parse one ``.jsonl`` session file, insert any new messages."""
        try:
            with path.open("r", encoding="utf-8", errors="replace") as fh:
                first_line = fh.readline()
        except OSError as exc:
            log.debug("vscode chat ingester: open %s failed (%s)", path, exc)
            return 0
        if not first_line.strip():
            return 0
        try:
            snap_rec = json.loads(first_line)
        except json.JSONDecodeError:
            log.debug("vscode chat ingester: corrupt first line in %s", path)
            return 0
        snap = snap_rec.get("v") if isinstance(snap_rec, dict) else None
        if not isinstance(snap, dict):
            return 0
        vscode_sid = str(snap.get("sessionId") or path.stem)
        creation_date = _coerce_ts(snap.get("creationDate"))
        requests = snap.get("requests")
        if not isinstance(requests, list) or not requests:
            return 0

        session_id = self._correlate(vscode_sid, creation_date)
        inserted = 0
        now = time.time()
        source_file = str(path)
        for idx, req in enumerate(requests):
            if not isinstance(req, dict):
                continue
            ts = _coerce_ts(req.get("timestamp")) or creation_date
            model = str(req.get("modelId") or "")
            user_text = _extract_user_text(req.get("message"))
            if user_text:
                # User row: source_row_id = 2*idx.
                if self._insert_message(
                    session_id=session_id,
                    source_file=source_file,
                    source_row_id=idx * 2,
                    role="user",
                    content=user_text,
                    model=model,
                    ts=ts,
                    ingested_at=now,
                ):
                    inserted += 1
            assistant_text = _extract_assistant_text(req.get("response"))
            if assistant_text:
                if self._insert_message(
                    session_id=session_id,
                    source_file=source_file,
                    source_row_id=idx * 2 + 1,
                    role="assistant",
                    content=assistant_text,
                    model=model,
                    ts=ts,
                    ingested_at=now,
                ):
                    inserted += 1
        return inserted

    # ── storage writes ────────────────────────────────────────

    def _insert_message(
        self,
        *,
        session_id: str,
        source_file: str,
        source_row_id: int,
        role: str,
        content: str,
        model: str,
        ts: float,
        ingested_at: float,
    ) -> bool:
        conn = self.store._conn()
        cur = conn.execute(
            "INSERT OR IGNORE INTO vscode_chat_messages"
            "(session_id, source_file, source_row_id, role, content, model, ts, ingested_at)"
            " VALUES(?,?,?,?,?,?,?,?)",
            (session_id, source_file, source_row_id, role, content[:_MAX_CONTENT_CHARS], model, ts, ingested_at),
        )
        conn.commit()
        return cur.rowcount > 0

    def _correlate(self, vscode_sid: str, ts: float) -> str:
        """Map VS Code's chat sessionId to one of our ``sessions`` rows.

        Strategy:
        1. Exact match on ``sessions.session_id`` with ``tool='copilot-vscode'``.
        2. Otherwise provision ``vscode-chat:<sessionId>`` and insert a
           stub session row (``INSERT OR IGNORE`` — safe on repeated polls).
        """
        conn = self.store._conn()
        cur = conn.execute(
            "SELECT session_id FROM sessions"
            " WHERE tool = 'copilot-vscode' AND session_id = ? LIMIT 1",
            (vscode_sid,),
        )
        row = cur.fetchone()
        if row:
            return str(row[0])
        provisional = f"vscode-chat:{vscode_sid}"
        conn.execute(
            "INSERT OR IGNORE INTO sessions"
            "(session_id, tool, project_path, started_at, source)"
            " VALUES(?, 'copilot-vscode', '', ?, 'vscode-chat-logs')",
            (provisional, ts or time.time()),
        )
        conn.commit()
        return provisional


# ─── helpers ──────────────────────────────────────────────────────


def _coerce_ts(raw: Any) -> float:
    """Best-effort ms-or-s-since-epoch -> seconds."""
    if raw is None or raw == "":
        return 0.0
    if isinstance(raw, (int, float)):
        v = float(raw)
        return v / 1000.0 if v > 1e12 else v
    if isinstance(raw, str):
        try:
            v = float(raw)
            return v / 1000.0 if v > 1e12 else v
        except ValueError:
            return 0.0
    return 0.0


def _extract_user_text(message: Any) -> str:
    """Pull visible text out of a request's ``message`` field."""
    if isinstance(message, dict):
        text = message.get("text")
        if isinstance(text, str):
            return text
        # Fall back to joining part texts when ``text`` is absent.
        parts = message.get("parts")
        if isinstance(parts, list):
            return "\n".join(
                str(p.get("text", "")) for p in parts if isinstance(p, dict) and p.get("text")
            )
    if isinstance(message, str):
        return message
    return ""


def _extract_assistant_text(response: Any) -> str:
    """Flatten a request's ``response`` list into a single string.

    Response parts come in several shapes: markdown text blocks
    (``{"value": "..."}``), thinking blocks (``{"kind": "thinking",
    "value": "..."}``), tool-call markers (rendered as ``[tool: X]``),
    and various structural markers we skip.
    """
    if not isinstance(response, list):
        if isinstance(response, str):
            return response
        return ""
    chunks: list[str] = []
    for p in response:
        if not isinstance(p, dict):
            continue
        kind = p.get("kind")
        if kind == "thinking":
            val = p.get("value", "")
            if val:
                chunks.append(f"[thinking] {val}")
            continue
        if kind in {"toolInvocation", "toolCall"}:
            name = p.get("toolCallId") or p.get("toolName") or p.get("name") or "tool"
            chunks.append(f"[tool: {name}]")
            continue
        # Plain markdown parts typically carry a "value" string.
        val = p.get("value")
        if isinstance(val, str) and val.strip():
            chunks.append(val)
    return "".join(chunks).strip()


__all__ = [
    "VSCodeChatLogsIngester",
    "POLL_INTERVAL_S",
    "default_log_dir",
]
