# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Ingest VS Code Copilot Chat conversation logs.

VS Code's Copilot Chat extension persists each chat session as a
``.jsonl`` file under
``workspaceStorage/<workspace_hash>/chatSessions/<session_id>.jsonl``.

The first line (``kind=0``) is a snapshot of the chat state:

    {"kind": 0, "v": {"sessionId": "...", "creationDate": ...,
                       "requests": [...], ...}}

Each later line is a patch with a path ``k`` and a value ``v``. Kind 1
sets the value at the path. Kind 2 appends the list ``v`` to the list at
the path; with an ``"i"`` field it first cuts that list to ``i`` items.
The snapshot's ``requests`` is often empty: the requests arrive as
kind-2 patches to ``["requests"]``, and each response streams in as
kind-2 patches to ``["requests", i, "response"]``, some of them written
after the request's ``result`` and ``modelState`` patches.

The file is read incrementally from a byte offset. A regular expression
on the head of each line selects the lines that carry messages; all
other lines, the large ``result`` patches among them, are skipped
without being parsed.

Each request becomes **two** messages in our store: a ``user`` row
from ``request.message.text`` and an ``assistant`` row built by
concatenating text parts from ``request.response`` (a list of markdown
fragments / thinking blocks / tool-call markers). The user row is
written when the request appears. The assistant row is written when the
request is finished (a ``result`` or completed ``modelState`` patch),
when a newer request appears, or when the file has been idle, and it is
written again whenever later parts change its text.

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
import re
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import IO, TYPE_CHECKING, Any

from ._common import coerce_ts, provision_session, record_quality, session_tool, writer_conn

if TYPE_CHECKING:
    from ..storage import HistoryDB

log = logging.getLogger(__name__)

POLL_INTERVAL_S: float = 60.0
"""Default polling interval (seconds) — chat logs move slower than CLI stores."""

# Cap individual message length so a single pathological chat can't
# blow out the DB. Matches the limit used by /api/session-messages.
_MAX_CONTENT_CHARS = 20_000

# The head of a patch line names its path. Only ``["requests"]`` and
# ``["requests", i, <key>]`` match; deeper paths do not.
_HEAD_RE = re.compile(rb'^\{"kind":(\d),"k":\["requests"(?:,(\d+),"(\w+)")?\]')
_HEAD_BYTES = 256
_CHUNK_BYTES = 1 << 20


def default_log_dir() -> Path:
    """Return the default VS Code ``workspaceStorage`` directory.

    Delegates platform resolution to :func:`aictl.platforms.vscode_user_dir`
    so the VS Code ``User`` path lives in exactly one place.
    """
    from ..platforms import vscode_user_dir

    return vscode_user_dir() / "workspaceStorage"


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
        skip unchanged files. ``None`` loads the saved cursor.
    idle_after_s:
        A file unchanged for this long is idle: its unfinished requests
        are written as they stand and forgotten.
    """

    def __init__(
        self,
        log_dir: Path | str | None,
        our_store: HistoryDB,
        last_cursor: dict[str, tuple[float, int]] | None = None,
        *,
        idle_after_s: float = 2 * POLL_INTERVAL_S,
    ) -> None:
        self.log_dir = Path(log_dir).expanduser() if log_dir else default_log_dir()
        self.store = our_store
        self.last_cursor: dict[str, tuple[float, int]] = dict(last_cursor or {})
        self.idle_after_s = idle_after_s
        self.last_poll_ts: float = 0.0
        self.last_poll_inserted: int = 0
        self._provisioned: set[str] = set()
        # Read position and unfinished requests per file.
        self._files: dict[str, _FileState] = {}
        if last_cursor is None:
            self._load_cursor()

    # The cursor outlives the daemon, so a restart does not read every chat file
    # again. Per file: [mtime, size, resume offset, request count at that offset,
    # VS Code sessionId, creationDate]. The resume offset is the start of the
    # line that added the oldest unfinished request, so a restart rebuilds that
    # request's text. The first cursor key held [mtime, size, requests] and is
    # not read.
    _CURSOR_KEY = "vscode_chat_logs:files2"

    def _load_cursor(self) -> None:
        try:
            row = (
                writer_conn(self.store)
                .execute("SELECT text, value FROM maintenance_state WHERE key = ?", (self._CURSOR_KEY,))
                .fetchone()
            )
            # An older version kept the JSON in ``value``; the cursor is not lost on upgrade.
            raw = row[0] if row and row[0] else (row[1] if row and isinstance(row[1], str) else "")
            saved = json.loads(raw) if raw else {}
            for key, (mtime, size, offset, count, vscode_sid, created) in saved.items():
                self._files[key] = _FileState(
                    offset=int(offset), count=int(count), vscode_sid=str(vscode_sid), created=float(created)
                )
                if int(offset) >= int(size):
                    self.last_cursor[key] = (float(mtime), int(size))
        except Exception:  # noqa: BLE001 - a store without the table or a bad value starts over
            self._files.clear()
            self.last_cursor.clear()

    def _save_cursor(self) -> None:
        value = {}
        for key, (mtime, size) in self.last_cursor.items():
            st = self._files.get(key)
            if st is not None:
                offset, count = st.resume_point()
                value[key] = [mtime, size, offset, count, st.vscode_sid, st.created]
        try:
            conn = writer_conn(self.store)
            conn.execute(
                "INSERT OR REPLACE INTO maintenance_state(key, value, text) VALUES(?,?,?)",
                (self._CURSOR_KEY, time.time(), json.dumps(value)),
            )
            conn.commit()
        except Exception as exc:  # noqa: BLE001 - the next poll saves again
            log.debug("vscode chat ingester: cursor not saved (%s)", exc)

    def _quality(self, status: str, *, severity: str = "", message: str = "", detail: dict | None = None) -> None:
        record_quality(
            self.store, "vscode-chat-logs", self.log_dir, status, severity=severity, message=message, detail=detail
        )

    # ── public API ─────────────────────────────────────────────

    def poll(self) -> int:
        """Scan for new/changed chat session files and ingest any new turns."""
        self.last_poll_ts = time.time()
        if not self.log_dir.exists() or not self.log_dir.is_dir():
            self._quality(
                "source_missing",
                severity="warning",
                message="VS Code workspaceStorage directory is missing",
            )
            self.last_poll_inserted = 0
            return 0

        inserted = 0
        failed = 0
        advanced = False
        try:
            files = list(self.log_dir.glob("*/chatSessions/*.jsonl"))
        except OSError as exc:
            log.debug("vscode chat ingester: glob failed (%s)", exc)
            self._quality(
                "query_failed",
                severity="warning",
                message="VS Code chat-log scan failed",
                detail={"error": str(exc)},
            )
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
                state = self._files.get(key)
                if state is not None and state.pending and self.last_poll_ts - st.st_mtime > self.idle_after_s:
                    # The file stopped changing: its last requests are done.
                    inserted += self._settle(path, state, idle=True)
                    writer_conn(self.store).commit()
                    advanced = True
                continue
            try:
                n, ok = self._ingest_file(path)
            except Exception as exc:  # noqa: BLE001  # pragma: no cover - defensive
                log.debug("vscode chat ingester: %s failed (%s)", path, exc)
                failed += 1
                continue
            inserted += n
            if not ok:
                # Parse failure — leave the per-file cursor unadvanced so the
                # broken file is retried on the next poll instead of being
                # skipped forever.
                failed += 1
                continue
            # Refresh mtime/size after ingest — the file may have grown
            # again in between, but we'll pick that up on the next poll.
            try:
                st2 = path.stat()
                self.last_cursor[key] = (st2.st_mtime, st2.st_size)
                advanced = True
            except OSError:
                pass

        self.last_poll_inserted = inserted
        if advanced:
            self._save_cursor()
        if failed:
            self._quality(
                "parse_failed",
                severity="warning",
                message="VS Code chat-log parse failures (will retry next poll)",
                detail={"inserted": inserted, "failed_files": failed},
            )
        else:
            self._quality(
                "ok",
                severity="info",
                message="VS Code chat-logs poll completed",
                detail={"inserted": inserted},
            )
        return inserted

    # ── file parsing ──────────────────────────────────────────

    def _ingest_file(self, path: Path) -> tuple[int, bool]:
        """Read the new complete lines of one ``.jsonl`` session file and write its messages.

        Returns ``(written, ok)``. ``ok`` is False only when the file could
        not be read or its snapshot line is corrupt; the caller then leaves
        the per-file cursor where it was, so the file is retried next poll.
        """
        key = str(path)
        state = self._files.get(key)
        if state is None:
            state = self._files[key] = _FileState()
        written = 0
        try:
            with path.open("rb") as fh:
                st = os.fstat(fh.fileno())
                if st.st_size < state.offset:
                    # The file shrank: it was rewritten, so read it from the top.
                    state.reset()
                for end, event in _iter_lines(fh, state.offset):
                    if event is None:
                        state.offset = end
                        continue
                    if event.start == 0:
                        n, ok = self._apply_snapshot(path, state, end)
                        if not ok:
                            return written, False
                        written += n
                    else:
                        written += self._apply(path, state, event)
                    state.offset = end
                mtime = os.fstat(fh.fileno()).st_mtime
            written += self._settle(path, state, idle=time.time() - mtime > self.idle_after_s)
        except OSError as exc:
            log.debug("vscode chat ingester: read %s failed (%s)", path, exc)
            return written, False
        finally:
            # One commit per file; on an error keep the rows already written.
            writer_conn(self.store).commit()
        return written, True

    def _apply_snapshot(self, path: Path, state: _FileState, end: int) -> tuple[int, bool]:
        """Start the file's state from its first line, which ends at byte ``end``. Returns ``(written, ok)``.

        The snapshot can be tens of MB when it already holds the requests, so
        it is read in chunks and its requests are decoded one at a time.
        """
        state.reset()
        written = 0
        try:
            with path.open("rb") as fh:
                for key, value in _snapshot_items(_JsonStream(fh, end)):
                    if key == "sessionId":
                        state.vscode_sid = str(value or "")
                    elif key == "creationDate":
                        state.created = coerce_ts(value)
                    elif key == "request":
                        # VS Code writes sessionId and creationDate before requests.
                        written += self._push(path, state, [value], 0, 0)
        except ValueError:
            log.debug("vscode chat ingester: corrupt first line in %s", path)
            state.reset()
            return written, False
        return written, True

    def _apply(self, path: Path, state: _FileState, event: _Event) -> int:
        """Apply one patch line to the file's state. Returns rows written."""
        if event.index is None:
            obj = _loads(event.value)
            if obj is None:
                return 0
            values = obj.get("v") if isinstance(obj.get("v"), list) else []
            cut = 0 if event.kind == 1 else obj.get("i")
            count_before = state.count
            if isinstance(cut, int) and 0 <= cut < state.count:
                self._cut(path, state, cut)
            return self._push(path, state, values, event.start, count_before)
        req = state.pending.get(event.index)
        if req is None:
            # A request that is done, or one this reader never saw added.
            return 0
        if event.key != "response":
            req.finished = True
            return 0
        obj = _loads(event.value)
        if obj is not None:
            values = obj.get("v") if isinstance(obj.get("v"), list) else []
            cut = 0 if event.kind == 1 else obj.get("i")
            if isinstance(cut, int) and cut >= 0:
                del req.parts[cut:]
            req.parts.extend(_part_text(p) for p in values)
            req.dirty = True
        return 0

    def _push(self, path: Path, state: _FileState, requests: list, start: int, count_before: int) -> int:
        """Add requests at the end of the file's list; write their user rows."""
        written = 0
        for req in requests:
            idx = state.count
            state.count += 1
            if not isinstance(req, dict):
                continue
            model_state = req.get("modelState")
            pending = _Request(
                ts=coerce_ts(req.get("timestamp")) or state.created,
                model=str(req.get("modelId") or ""),
                parts=[_part_text(p) for p in req.get("response") or []]
                if isinstance(req.get("response"), list)
                else [],
                finished=req.get("result") is not None
                or (isinstance(model_state, dict) and model_state.get("completedAt") is not None),
                start=start,
                count_before=count_before,
            )
            state.pending[idx] = pending
            user_text = _extract_user_text(req.get("message"))
            if user_text and self._write(path, state, idx * 2, "user", user_text, pending):
                written += 1
        return written

    def _cut(self, path: Path, state: _FileState, cut: int) -> None:
        """Drop requests from index ``cut`` on: a later patch replaced them."""
        for idx in [i for i in state.pending if i >= cut]:
            del state.pending[idx]
        state.count = cut
        writer_conn(self.store).execute(
            "DELETE FROM vscode_chat_messages WHERE source_file = ? AND source_row_id >= ?", (str(path), cut * 2)
        )

    def _settle(self, path: Path, state: _FileState, *, idle: bool) -> int:
        """Write the assistant rows of finished requests and forget the requests that are done.

        A request is done when it is finished and a newer request exists, or
        when the file is idle. Parts may still arrive after the finish patch,
        so a finished request that is still the newest one is kept.
        """
        written = 0
        for idx, req in list(state.pending.items()):
            newer = idx < state.count - 1
            if req.dirty and (req.finished or newer or idle):
                req.dirty = False
                text = "".join(req.parts).strip()
                if text and self._write(path, state, idx * 2 + 1, "assistant", text, req):
                    written += 1
            if idle or (req.finished and newer):
                del state.pending[idx]
        return written

    def _write(self, path: Path, state: _FileState, row_id: int, role: str, text: str, req: _Request) -> bool:
        if not state.session_id:
            state.session_id = self._correlate(state.vscode_sid or path.stem, state.created)
        return self._insert_message(
            session_id=state.session_id,
            source_file=str(path),
            source_row_id=row_id,
            role=role,
            content=text,
            model=req.model,
            ts=req.ts,
            ingested_at=time.time(),
        )

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
        """Insert the row, or replace its content when the text changed. True when a row was written."""
        conn = writer_conn(self.store)
        cur = conn.execute(
            "INSERT INTO vscode_chat_messages"
            "(session_id, source_file, source_row_id, role, content, model, ts, ingested_at)"
            " VALUES(?,?,?,?,?,?,?,?)"
            " ON CONFLICT(session_id, source_file, source_row_id) DO UPDATE SET"
            " role = excluded.role, content = excluded.content, model = excluded.model,"
            " ts = excluded.ts, ingested_at = excluded.ingested_at"
            " WHERE content != excluded.content",
            (session_id, source_file, source_row_id, role, content[:_MAX_CONTENT_CHARS], model, ts, ingested_at),
        )
        return cur.rowcount > 0

    def _correlate(self, vscode_sid: str, ts: float) -> str:
        """Map VS Code's chat sessionId to one of our ``sessions`` rows.

        Strategy:
        1. Exact match on ``sessions.session_id`` with ``tool='copilot-vscode'``.
        2. Otherwise provision ``vscode-chat:<sessionId>`` and insert a
           stub session row (``INSERT OR IGNORE`` — safe on repeated polls).
        """
        if session_tool(self.store, vscode_sid) == "copilot-vscode":
            return vscode_sid
        provisional = f"vscode-chat:{vscode_sid}"
        # Through the store's writer: a store split by project places the row.
        from ..storage import SessionRow

        provision_session(
            self.store,
            self._provisioned,
            SessionRow(
                session_id=provisional, tool="copilot-vscode", started_at=ts or time.time(), source="vscode-chat-logs"
            ),
        )
        return provisional


# ─── helpers ──────────────────────────────────────────────────────


@dataclass
class _Request:
    """A request whose assistant text may still grow. ``parts`` holds the text of each response part."""

    ts: float
    model: str
    parts: list[str]
    finished: bool
    start: int  # offset of the line that added the request
    count_before: int  # request count before that line
    dirty: bool = True


@dataclass
class _FileState:
    """How far one chat file has been read, and its requests that are not done."""

    offset: int = 0
    count: int = 0
    vscode_sid: str = ""
    created: float = 0.0
    session_id: str = ""
    pending: dict[int, _Request] = field(default_factory=dict)

    def reset(self) -> None:
        self.offset = 0
        self.count = 0
        self.session_id = ""
        self.pending.clear()

    def resume_point(self) -> tuple[int, int]:
        """(offset, request count) from which a fresh reader rebuilds the requests that are not done."""
        if not self.pending:
            return self.offset, self.count
        oldest = min(self.pending.values(), key=lambda r: r.start)
        return oldest.start, oldest.count_before


@dataclass
class _Event:
    """A line that matters: the snapshot, a change to ``requests``, a response patch or a finish patch."""

    start: int
    kind: int
    index: int | None
    key: str
    value: bytes | None = None


def _iter_lines(fh: IO[bytes], offset: int) -> Iterator[tuple[int, _Event | None]]:
    """Yield ``(end offset, event)`` for each complete line after ``offset``.

    Only the ``["requests"]`` and ``["requests", i, "response"]`` patches
    are kept whole; the snapshot line and the finish patches yield an event
    without a value, and any other line yields None. A line longer
    than its head is read in chunks, and the chunks of a line that is not kept
    are dropped as they are read. A last line without a newline is still being
    written and is not yielded.
    """
    fh.seek(offset)
    pos = offset
    while True:
        head = fh.readline(_HEAD_BYTES)
        if not head:
            return
        start = pos
        event: _Event | None = None
        keep = False
        if start == 0:
            # The snapshot is read again in chunks once it is known to be complete.
            event = _Event(0, 0, None, "")
        else:
            m = _HEAD_RE.match(head)
            if m:
                kind = int(m.group(1))
                if m.group(2) is None:
                    event, keep = _Event(start, kind, None, ""), True
                else:
                    key = m.group(3).decode()
                    if key == "response":
                        event, keep = _Event(start, kind, int(m.group(2)), key), True
                    elif key == "result" or (key == "modelState" and b'"completedAt"' in head):
                        event = _Event(start, kind, int(m.group(2)), key)
        size = len(head)
        pieces = [head] if keep else None
        line_end = head.endswith(b"\n")
        while not line_end:
            chunk = fh.readline(_CHUNK_BYTES)
            if not chunk:
                return
            size += len(chunk)
            if pieces is not None:
                pieces.append(chunk)
            line_end = chunk.endswith(b"\n")
        pos += size
        if event is not None and pieces is not None:
            event.value = pieces[0] if len(pieces) == 1 else b"".join(pieces)
        pieces = None
        yield pos, event


_WS_RE = re.compile(rb"[ \t\n\r]*")
_RUN_RE = re.compile(rb'(?:[^"{}\[\]]+|"[^"\\]*(?:\\.[^"\\]*)*")*')
_STRING_REST_RE = re.compile(rb'[^"\\]*(?:\\.[^"\\]*)*"')
_SCALAR_RE = re.compile(rb"[-+.0-9A-Za-z]+")
# The request fields a message needs; the others, ``result`` among them, are skipped undecoded.
_REQUEST_KEYS = frozenset({"message", "timestamp", "modelId", "response", "modelState"})


class _JsonStream:
    """JSON values from a file up to byte ``end``, read in chunks.

    A value is first passed over at the byte level to find where it ends, and
    only then decoded, once; a value that is not needed is never decoded. The
    quote, backslash and bracket bytes never occur inside a UTF-8 sequence, so
    the scan works on the raw bytes. Text already consumed is dropped.
    """

    def __init__(self, fh: IO[bytes], end: int) -> None:
        self.fh = fh
        self.left = end - fh.tell()
        self.buf = b""
        self.pos = 0
        self.mark: int | None = None  # start of the value being scanned, kept across reads

    def _more(self) -> bool:
        if self.left <= 0:
            return False
        cut = self.pos if self.mark is None else self.mark
        # Read at least as much as is held, so a large value is scanned a few times at most.
        data = self.fh.read(min(max(len(self.buf) - cut, _CHUNK_BYTES), self.left))
        self.left = self.left - len(data) if data else 0
        self.buf = self.buf[cut:] + data
        self.pos -= cut
        if self.mark is not None:
            self.mark = 0
        return bool(data)

    def char(self) -> bytes:
        """The next byte that is not whitespace, not consumed; empty at the end."""
        while True:
            self.pos = _WS_RE.match(self.buf, self.pos).end()  # type: ignore[union-attr]
            if self.pos < len(self.buf) or not self._more():
                return self.buf[self.pos : self.pos + 1]

    def expect(self, c: bytes) -> None:
        if self.char() != c:
            raise ValueError(f"{c!r} expected")
        self.pos += 1

    def skip(self) -> tuple[int, int]:
        """Pass over the next value; returns its extent in ``buf``, valid until the next read."""
        c = self.char()
        self.mark = self.pos
        try:
            if c == b'"':
                self.pos += 1
                while (rest := _STRING_REST_RE.match(self.buf, self.pos)) is None:
                    if not self._more():
                        raise ValueError("unterminated string")
                self.pos = rest.end()
            elif c in (b"{", b"["):
                depth = 0
                while True:
                    # Text and whole strings up to the next bracket, or to a string not yet read in full.
                    self.pos = _RUN_RE.match(self.buf, self.pos).end()  # type: ignore[union-attr]
                    c = self.buf[self.pos : self.pos + 1]
                    if c and c != b'"':
                        self.pos += 1
                        depth += 1 if c in b"{[" else -1
                        if depth == 0:
                            break
                    elif not self._more():
                        raise ValueError("unterminated value")
            else:
                while (m := _SCALAR_RE.match(self.buf, self.pos)) is not None and m.end() == len(self.buf):
                    # A number at the end of the bytes read so far may continue.
                    if not self._more():
                        break
                if m is None:
                    raise ValueError("value expected")
                self.pos = m.end()
            return self.mark, self.pos
        finally:
            self.mark = None

    def value(self) -> Any:
        start, end = self.skip()
        return json.loads(self.buf[start:end].decode("utf-8", errors="replace"))

    def request(self) -> Any:
        """Decode a request, keeping only the fields in ``_REQUEST_KEYS``."""
        if self.char() != b"{":
            return self.value()
        req: dict[str, Any] = {}
        for key in self.keys():
            if key in _REQUEST_KEYS:
                req[key] = self.value()
            elif key == "result" and self.char() != b"n":
                self.skip()
                req[key] = True
            else:
                self.skip()
        return req

    def keys(self) -> Iterator[str]:
        """The keys of an object, one at a time; the caller consumes each value before asking for the next key."""
        self.expect(b"{")
        if self.char() == b"}":
            self.pos += 1
            return
        while True:
            key = self.value()
            if not isinstance(key, str):
                raise ValueError("key expected")
            self.expect(b":")
            yield key
            c = self.char()
            self.pos += 1
            if c == b"}":
                return
            if c != b",":
                raise ValueError("',' or '}' expected")

    def items(self) -> Iterator[None]:
        """One step per array element; the caller consumes each element before asking for the next."""
        self.expect(b"[")
        if self.char() == b"]":
            self.pos += 1
            return
        while True:
            yield None
            c = self.char()
            self.pos += 1
            if c == b"]":
                return
            if c != b",":
                raise ValueError("',' or ']' expected")


def _snapshot_items(stream: _JsonStream, *, whole: bool = False) -> Iterator[tuple[str, Any]]:
    """The fields of a snapshot line ``{"kind":0,"v":{...}}``, one at a time.

    Yields ``("sessionId", v)``, ``("creationDate", v)`` and ``("request", r)``
    for each request, so only one request is decoded at a time: with *whole*
    every field of it, otherwise the fields a message needs. Yields nothing for
    a blank line and raises ValueError when the line is not such an object.
    """
    if not stream.char():
        return
    found = False
    for key in stream.keys():
        if key == "v" and stream.char() == b"{":
            found = True
            for name in stream.keys():
                if name == "requests" and stream.char() == b"[":
                    for _ in stream.items():
                        yield "request", (stream.value() if whole else stream.request())
                elif name in ("sessionId", "creationDate"):
                    yield name, stream.value()
                else:
                    stream.skip()
        else:
            stream.skip()
    if not found:
        raise ValueError("no snapshot object")


def _first_line_end(path: Path) -> int:
    """The byte offset after the file's first newline; 0 while the first line is still being written."""
    end = 0
    with path.open("rb") as fh:
        while True:
            chunk = fh.readline(_CHUNK_BYTES)
            if not chunk:
                return 0
            end += len(chunk)
            if chunk.endswith(b"\n"):
                return end


def snapshot_events(path: Path) -> tuple[int, Iterator[dict]]:
    """A chat file's snapshot line as patch events, and the offset where the patch lines begin.

    The first event is the snapshot with no requests; each request follows as
    its own push, ``{"kind": 2, "k": ["requests"], "i": n, "v": [request]}``,
    decoded whole but one at a time: a snapshot with its requests is tens of MB
    here, and parsed as one object it cost hundreds of MB. ``(0, nothing)``
    while the first line has no newline yet. The events raise ValueError on a
    corrupt line.
    """
    end = _first_line_end(path)
    if not end:
        return 0, iter(())

    def events() -> Iterator[dict]:
        head: dict[str, Any] = {"requests": []}
        count = 0
        with path.open("rb") as fh:
            for key, value in _snapshot_items(_JsonStream(fh, end), whole=True):
                if key != "request":
                    head[key] = value
                    continue
                if count == 0:
                    yield {"kind": 0, "v": head}
                yield {"kind": 2, "k": ["requests"], "i": count, "v": [value]}
                count += 1
        if count == 0:
            yield {"kind": 0, "v": head}

    return end, events()


def _loads(line: bytes | None) -> dict | None:
    try:
        obj = json.loads(line) if line else None
    except ValueError:
        return None
    return obj if isinstance(obj, dict) else None


def _extract_user_text(message: Any) -> str:
    """Pull visible text out of a request's ``message`` field."""
    if isinstance(message, dict):
        text = message.get("text")
        if isinstance(text, str):
            return text
        # Fall back to joining part texts when ``text`` is absent.
        parts = message.get("parts")
        if isinstance(parts, list):
            return "\n".join(str(p.get("text", "")) for p in parts if isinstance(p, dict) and p.get("text"))
    if isinstance(message, str):
        return message
    return ""


def _part_text(p: Any) -> str:
    """The text one response part adds to the assistant message.

    Response parts come in several shapes: markdown text blocks
    (``{"value": "..."}``), thinking blocks (``{"kind": "thinking",
    "value": "..."}``), tool-call markers (rendered as ``[tool: X]``),
    and various structural markers we skip.
    """
    if not isinstance(p, dict):
        return ""
    kind = p.get("kind")
    if kind == "thinking":
        val = p.get("value", "")
        return f"[thinking] {val}" if val else ""
    if kind in {"toolInvocation", "toolCall"}:
        name = p.get("toolCallId") or p.get("toolName") or p.get("name") or "tool"
        return f"[tool: {name}]"
    # Plain markdown parts typically carry a "value" string.
    val = p.get("value")
    return val if isinstance(val, str) and val.strip() else ""


__all__ = [
    "VSCodeChatLogsIngester",
    "POLL_INTERVAL_S",
    "default_log_dir",
    "snapshot_events",
]
