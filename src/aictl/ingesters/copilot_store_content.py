# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""What ``session-store.db`` still holds of the Copilot sessions whose ``events.jsonl`` aictl never had.

GitHub Copilot CLI and the Copilot app keep a session whole in ``session-state/<id>/events.jsonl``
and a searchable part of it in ``session-store.db``. Copilot removes old session folders, but their
rows stay in the database. For a session aictl never saw an events file of, this reader takes:

``sessions``
    The session's folder, repository, branch and its first and last time, for its session row and
    its ``config.session_start`` context event.
``turns``
    Each turn's prompt (``session_prompts`` and a ``message`` step) and reply (a ``message`` step).
    A turn row is written when the turn ends: the prompt's time is the turn's first command, if any.
``forge_trajectory_events``
    Each shell command (``command`` row) and its exit code (the ``result`` row with the same command
    in the same turn, in order). The database names no tool call id and keeps no output text here.

A session with an events file keeps that file as its only source of prompts, replies and tool
calls, also after Copilot removed its folder: the ingester keeps the ids of every session whose
events file it saw (see ``TranscriptUsageIngester``). ``session_files`` (the files a session wrote)
is read for every session by ``session_outcomes.MetadataReaders``.

Every row this reader writes carries ``COPILOT_STORE_SOURCE`` where its table has a source field
(``tool_invocations.source``, ``session_steps.source``, ``sessions.source``, the context event's
trigger); a prompt row has no such field and carries it in its key only.

Each table is read by row id from a saved position, at most ``BATCH_ROWS`` rows a poll. A missing
table or column leaves that part unreported. A locked or busy database is read at the next poll.
"""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

from .. import platforms
from ..context_audit import _redact
from ..records import (
    COPILOT_STORE_SOURCE,
    ContextEventRow,
    SessionPromptRow,
    SessionStepRow,
    ToolInvocationRow,
    _dedup_key,
)
from ._common import coerce_ts, open_readonly
from .call_facts import PROMPT_MAX_CHARS, _keep_text, stored_input, target_fields, target_of

if TYPE_CHECKING:
    import sqlite3

    from .call_facts import FactBuffer

log = logging.getLogger(__name__)

# Rows read per table per poll: the first read of a large database is spread over polls.
BATCH_ROWS = 20000
# Sessions named in one SQL statement.
_IN_CHUNK = 500
# The tool that runs a shell command, as Copilot names it on this system.
SHELL_TOOL = "powershell" if platforms.IS_WINDOWS else "bash"
# The tables this reader takes, in the order it reads them.
TABLES = ("sessions", "turns", "forge_trajectory_events")


@dataclass(slots=True)
class StoreSession:
    """What the database lists of one session: the values of its session row."""

    cwd: str = ""
    repository: str = ""
    branch: str = ""
    host_type: str = ""
    created: float = 0.0
    updated: float = 0.0
    turns: int = 0
    commands: int = 0


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {str(row[1]) for row in conn.execute(f"PRAGMA table_info({table})")}  # noqa: S608 - fixed names


def _pick(present: set[str], name: str, default: str = "NULL") -> str:
    return name if name in present else f"{default} AS {name}"


def _chunks(values: list[str]) -> list[list[str]]:
    return [values[i : i + _IN_CHUNK] for i in range(0, len(values), _IN_CHUNK)]


class CopilotStoreContent:
    """One Copilot home's ``session-store.db``: sessions, prompts, replies and shell commands of the
    sessions aictl has no events file of. ``read`` returns the sessions whose row changed."""

    def __init__(self, buffer: FactBuffer, store_db: Path) -> None:
        self.buffer = buffer
        self.store_db = store_db
        # The last row id read per table; saved by the ingester once the rows are stored.
        self.ids: dict[str, int] = {}
        # The sessions this home's database lists that have no events file, by id.
        self.sessions: dict[str, StoreSession] = {}
        # Sessions whose turns and commands are counted, and those that got rows since they were.
        self._counted: set[str] = set()
        self._recount: set[str] = set()
        # Commands still waiting for their result: (session, turn, command) -> [(row id, call row)],
        # and the latest turn read of each session: a later turn ends the waiting of the earlier ones.
        self._open: dict[tuple[str, int, str], deque[tuple[int, ToolInvocationRow]]] = {}
        self._latest_turn: dict[str, int] = {}
        self._cwd: dict[str, str] = {}
        self._sig: tuple[int, int] | None = None
        self.backlog = False

    # ── state ──

    def position(self) -> dict[str, int]:
        """The ids to save: a table is read again from its first command still waiting for a result."""
        saved = dict(self.ids)
        if self._open and "forge_trajectory_events" in saved:
            first = min(row_id for calls in self._open.values() for row_id, _ in calls)
            saved["forge_trajectory_events"] = min(saved["forge_trajectory_events"], first - 1)
        return saved

    def load(self, saved: Any) -> None:
        if isinstance(saved, dict):
            self.ids = {str(k): int(v) for k, v in saved.items() if isinstance(v, int) and v >= 0}

    # ── reading ──

    def read(self, event_sessions: set[str], cutoff: float) -> set[str]:
        """Read what is new for the sessions not in *event_sessions*; list those active since *cutoff*."""
        try:
            st = self.store_db.stat()
        except OSError:
            return set()
        sig = (st.st_mtime_ns, st.st_size)
        if sig == self._sig and not self.backlog:
            return set()
        try:
            import sqlite3
        except ImportError:
            return set()
        conn = open_readonly(self.store_db, "copilot-store-content")
        if conn is None:
            return set()
        changed: set[str] = set()
        self.backlog = False
        try:
            tables = {str(r[0]) for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
            if "sessions" in tables:
                changed |= self._sessions(conn, tables, event_sessions, cutoff)
            if "turns" in tables:
                changed |= self._turns(conn, event_sessions)
            if "forge_trajectory_events" in tables:
                changed |= self._commands(conn, event_sessions)
            if not self.backlog:
                self._sig = sig
        except sqlite3.Error as exc:
            # Locked, busy, or a checkpoint raced the read: what was read stays, the rest follows next poll.
            log.debug("copilot-store-content: store read failed, retrying next poll: %s", exc)
        finally:
            conn.close()
        return changed

    def _start(self, conn: sqlite3.Connection, table: str) -> int:
        """The id after which *table* is read; 0 when the database started over."""
        last = self.ids.get(table, 0)
        top = conn.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}").fetchone()[0] or 0  # noqa: S608
        if top < last:
            last = 0
            self._open.clear()
            self._latest_turn.clear()
        return last

    def _sessions(
        self, conn: sqlite3.Connection, tables: set[str], event_sessions: set[str], cutoff: float
    ) -> set[str]:
        present = _columns(conn, "sessions")
        if "id" not in present:
            return set()
        changed: set[str] = set()
        listed: dict[str, StoreSession] = {}
        fields = ", ".join(_pick(present, name, "''") for name in ("cwd", "repository", "branch", "host_type"))
        times = ", ".join(_pick(present, name) for name in ("created_at", "updated_at"))
        for sid, cwd, repo, branch, host, created, updated in conn.execute(
            f"SELECT id, {fields}, {times} FROM sessions"
        ):  # noqa: S608
            sid = str(sid or "")
            self._cwd[sid] = str(cwd or "")
            if not sid or sid in event_sessions:
                continue
            first, last = coerce_ts(created), coerce_ts(updated)
            if max(first, last) < cutoff:
                continue
            prior = self.sessions.get(sid)
            listed[sid] = StoreSession(
                cwd=str(cwd or ""),
                repository=str(repo or ""),
                branch=str(branch or ""),
                host_type=str(host or ""),
                created=first,
                updated=last,
                turns=prior.turns if prior else 0,
                commands=prior.commands if prior else 0,
            )
        # Counted over the whole table, so the rows a later batch reads are in the count already.
        self._count(conn, tables, [sid for sid in listed if sid not in self._counted or sid in self._recount], listed)
        self._recount.clear()
        for sid, info in listed.items():
            if self.sessions.get(sid) != info:
                changed.add(sid)
        self.sessions = listed
        return changed

    def _count(
        self, conn: sqlite3.Connection, tables: set[str], sids: list[str], listed: dict[str, StoreSession]
    ) -> None:
        """The turns and commands of sessions not counted yet in this process, or that got rows since."""
        for part in _chunks(sids):
            marks = ",".join("?" * len(part))
            if "turns" in tables:
                for sid, n in conn.execute(
                    f"SELECT session_id, COUNT(*) FROM turns WHERE session_id IN ({marks})"  # noqa: S608
                    " GROUP BY session_id",
                    part,
                ):
                    listed[str(sid)].turns = int(n)
            if "forge_trajectory_events" in tables and {"event_type", "session_id"} <= _columns(
                conn, "forge_trajectory_events"
            ):
                for sid, n in conn.execute(
                    "SELECT session_id, COUNT(*) FROM forge_trajectory_events WHERE event_type = 'command'"
                    f" AND session_id IN ({marks}) GROUP BY session_id",
                    part,
                ):  # noqa: S608
                    listed[str(sid)].commands = int(n)
            self._counted.update(part)

    def _turns(self, conn: sqlite3.Connection, event_sessions: set[str]) -> set[str]:
        present = _columns(conn, "turns")
        if not {"id", "session_id"} <= present:
            return set()
        keep_text = _keep_text(self.buffer.store)
        # Text the store would not keep is not even read; the reply's length says whether there is one.
        prompt = "user_message" if keep_text and "user_message" in present else "''"
        reply = "assistant_response" if keep_text and "assistant_response" in present else "''"
        reply_len = "length(assistant_response)" if "assistant_response" in present else "0"
        last = self._start(conn, "turns")
        rows = conn.execute(
            f"SELECT id, session_id, {_pick(present, 'turn_index')}, {prompt}, {reply}, {reply_len},"  # noqa: S608
            f" {_pick(present, 'timestamp')} FROM turns WHERE id > ? ORDER BY id LIMIT ?",
            (last, BATCH_ROWS),
        ).fetchall()
        self.backlog = self.backlog or len(rows) >= BATCH_ROWS
        wanted = [r for r in rows if str(r[1] or "") and str(r[1]) not in event_sessions]
        starts = self._turn_starts(conn, sorted({str(r[1]) for r in wanted}))
        changed: set[str] = set()
        for row_id, sid, turn, asked, answered, answer_len, stamp in wanted:
            sid, ended = str(sid), coerce_ts(stamp)
            index = int(turn) + 1 if isinstance(turn, int) else None  # the events reader counts turns from 1
            first = starts.get((sid, turn), 0.0)
            began = min(t for t in (first, ended) if t) if ended or first else 0.0
            project = self._cwd.get(sid, "")
            slot = str(turn) if isinstance(turn, int) else f"#{row_id}"
            self.buffer.add_prompt(
                SessionPromptRow(
                    dedup_key=_dedup_key("copilot-store-prompt", sid, slot),
                    ts=began,
                    session_id=sid,
                    tool="copilot-cli",
                    project_path=project,
                    text=_redact(str(asked or "")[:PROMPT_MAX_CHARS]) if keep_text else "",
                )
            )
            self._step(sid, slot, "user", began, project, str(asked or ""), keep_text, order=2 * (index or 0))
            if answer_len:
                self._step(
                    sid,
                    slot,
                    "assistant",
                    ended or began,
                    project,
                    str(answered or ""),
                    keep_text,
                    order=2 * (index or 0) + 1,
                )
            if turn == 0:
                self._session_start(sid)
            self._recount.add(sid)
            changed.add(sid)
        if rows:
            self.ids["turns"] = int(rows[-1][0])
        return changed

    def _turn_starts(self, conn: sqlite3.Connection, sids: list[str]) -> dict[tuple[str, Any], float]:
        """The first command time of each turn of *sids*: a turn row is written when the turn ends."""
        present = _columns(conn, "forge_trajectory_events") if sids else set()
        if not {"session_id", "turn_index", "created_at"} <= present:
            return {}
        starts: dict[tuple[str, Any], float] = {}
        for part in _chunks(sids):
            marks = ",".join("?" * len(part))
            for sid, turn, first in conn.execute(
                f"SELECT session_id, turn_index, MIN(created_at) FROM forge_trajectory_events WHERE session_id IN ({marks})"  # noqa: S608
                " GROUP BY session_id, turn_index",
                part,
            ):
                starts[(str(sid), turn)] = coerce_ts(first)
        return starts

    def _step(
        self, sid: str, slot: str, role: str, ts: float, project: str, text: str, keep_text: bool, *, order: int
    ) -> None:
        # FactBuffer.add_step masks the text, or withholds it when the store keeps none.
        self.buffer.add_step(
            SessionStepRow(
                step_key=_dedup_key("\0".join(("copilot-store-step", sid, slot, role))),
                ts=ts,
                session_id=sid,
                kind="message",
                tool="copilot-cli",
                project_path=project,
                source=COPILOT_STORE_SOURCE,
                source_order=order,
                role=role,
                text=text,
                text_status="" if text or keep_text else "withheld",
            )
        )

    def _session_start(self, sid: str) -> None:
        """The folder, repository and branch the session started in, as the events reader keeps them."""
        info = self.sessions.get(sid)
        if info is None:
            return
        context = {
            name: value
            for name, value in (
                ("cwd", info.cwd),
                ("repository", info.repository),
                ("branch", info.branch),
                ("hostType", info.host_type),
            )
            if value
        }
        self.buffer.add_context_event(
            ContextEventRow(
                dedup_key=_dedup_key("copilot-store-session-start", sid),
                ts=info.created,
                session_id=sid,
                kind="config.session_start",
                tool="copilot-cli",
                trigger=COPILOT_STORE_SOURCE,
                detail={"context": context} if context else {},
            )
        )

    def _commands(self, conn: sqlite3.Connection, event_sessions: set[str]) -> set[str]:
        present = _columns(conn, "forge_trajectory_events")
        if not {"id", "session_id", "event_type", "command"} <= present:
            return set()
        keep_text = _keep_text(self.buffer.store)
        size = "length(CAST(output AS BLOB))" if "output" in present else "NULL"
        last = self._start(conn, "forge_trajectory_events")
        rows = conn.execute(
            f"SELECT id, session_id, {_pick(present, 'turn_index')}, event_type, command, {_pick(present, 'exit_code')},"  # noqa: S608
            f" {size}, {_pick(present, 'created_at')} FROM forge_trajectory_events"
            " WHERE id > ? AND event_type IN ('command', 'result') ORDER BY id LIMIT ?",
            (last, BATCH_ROWS),
        ).fetchall()
        self.backlog = self.backlog or len(rows) >= BATCH_ROWS
        changed: set[str] = set()
        for row_id, sid, turn, kind, command, code, out_bytes, created in rows:
            sid = str(sid or "")
            if not sid or sid in event_sessions or not isinstance(command, str):
                continue
            number = turn if isinstance(turn, int) else -1
            key = (sid, number, command)
            ts = coerce_ts(created)
            if number > self._latest_turn.get(sid, number):
                # The session went on to a later turn: its earlier commands get no result any more.
                for stale in [k for k in self._open if k[0] == sid and k[1] < number]:
                    del self._open[stale]
            self._latest_turn[sid] = max(number, self._latest_turn.get(sid, number))
            if kind == "command":
                row = self._call(row_id, sid, turn, command, ts, keep_text)
                self._open.setdefault(key, deque()).append((row_id, row))
                self.buffer.add_tool(row)
                self._recount.add(sid)
                changed.add(sid)
                continue
            waiting = self._open.get(key)
            if not waiting:
                continue  # the result of a command read before this process started and never paired
            _, row = waiting.popleft()
            if not waiting:
                del self._open[key]
            if isinstance(code, int):
                row.exit_code = code
                row.is_error = 1 if code != 0 else 0
            row.output_bytes = int(out_bytes) if isinstance(out_bytes, int) else None
            if ts and row.ts:
                row.duration_ms = max(0.0, (ts - row.ts) * 1000)
            self.buffer.add_tool(row)
        if rows:
            self.ids["forge_trajectory_events"] = int(rows[-1][0])
        if not self.backlog:
            # Read to the end: a command of a session that has no events file and no result yet keeps none.
            self._open.clear()
            self._latest_turn.clear()
        return changed

    def _call(self, row_id: int, sid: str, turn: Any, command: str, ts: float, keep_text: bool) -> ToolInvocationRow:
        """A shell call as the events reader writes one, from what the database keeps of it."""
        args = {"command": command}
        return ToolInvocationRow(
            dedup_key=_dedup_key("copilot-store-tool", sid, str(row_id)),
            ts=ts,
            session_id=sid,
            tool="copilot-cli",
            tool_name=SHELL_TOOL,
            project_path=self._cwd.get(sid, ""),
            input=stored_input(args, keep_text),
            source=COPILOT_STORE_SOURCE,
            source_event_id=f"forge:{row_id}",
            target=target_of(args, keep_text),
            **target_fields(SHELL_TOOL, args, keep_text=keep_text),
            turn_index=int(turn) + 1 if isinstance(turn, int) else None,
        )
