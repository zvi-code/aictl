# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""What a session achieved, and the tool's own summaries of it.

``session_outcomes`` holds one row per session with typed values only: modes, PR and
commit references, line and file counts, the tool's own cost and time figures, hook,
compaction, todo and workflow counts. ``session_digests`` holds the text summaries the
tools write (checkpoints, task summaries, compaction summaries, todo lists, workflow
summaries); it is text, so it is written only while the store keeps text.

A session's row is put together from parts. Each part comes from one source and is
replaced whole when that source is read again: a transcript read from its start rebuilds
its part, a metadata file read again after it changed replaces its part. The parts and a
digest of the last row written are saved with the reader's checkpoint, so a restart that
finds nothing new writes nothing.

The metadata readers here (Claude Code ``workflows/wf_*.json``, Copilot ``session-store.db``
tables and per-session ``session.db``) read a file again only when its size or mtime
changed, or for the store, only rows with an id above the saved one.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any

from ..context_audit import _redact
from ..records import TEXT_VALUE_MAX, SessionDigestRow, SessionFileRow
from ._common import coerce_ts, open_readonly

log = logging.getLogger(__name__)

# How the parts of a session's row are put together.
_UNION = ("permission_modes", "modes", "pr_refs", "commit_refs", "file_keys")
_SUM = ("hook_runs", "hook_failures", "compactions")
_LAST = (
    "last_mode",
    "lines_added",
    "lines_removed",
    "files_changed",
    "reported_cost_usd",
    "reported_api_ms",
    "reported_tool_ms",
    "premium_requests",
    "todos_total",
    "todos_completed",
    "workflow_runs",
    "workflows_failed",
    "task_complete",
)
COLUMNS = ("permission_modes", "modes", "pr_refs", "commit_refs", *_SUM, *_LAST)
TRANSCRIPT = "t:"  # a part read from a transcript, followed by the agent id ('' for the main agent)


# The text sections of a Copilot checkpoint (besides its title), in the order the tool writes them.
_CHECKPOINT_SECTIONS = {
    "overview": "Overview", "history": "History", "work_done": "Work done", "technical_details": "Technical details",
    "important_files": "Important files", "next_steps": "Next steps",
}


def digest_text(text: Any, limit: int = TEXT_VALUE_MAX) -> str:
    """Text as handed to the store: secrets redacted, bounded. The store moves a large value to text_payloads."""
    return _redact(text[:limit]) if isinstance(text, str) else ""


def file_key(path: str) -> str:
    """A short stand-in for a path, enough to count distinct files without keeping their names twice."""
    return hashlib.sha256(path.replace("\\", "/").encode("utf-8", "replace")).hexdigest()[:12]


def _add_unique(values: list, value: Any) -> None:
    if value not in (None, "") and value not in values:
        values.append(value)


class OutcomeBook:
    """The parts of every session's outcome row, and which rows still have to be written."""

    def __init__(self) -> None:
        self._parts: dict[str, dict[str, dict]] = {}
        self._meta: dict[str, dict[str, str]] = {}  # tool and project of a session
        self._written: dict[str, str] = {}
        self._touched: set[str] = set()
        self.dirty = False

    # ── parts ──

    def part(self, sid: str, name: str, ts: float, *, tool: str = "", project: str = "") -> dict:
        """The part *name* of a session, created empty. The caller changes it in place."""
        parts = self._parts.setdefault(sid, {})
        self._touched.add(sid)
        part = parts.get(name)
        if part is None:
            part = parts[name] = {}
        if ts:
            part["ts"] = max(part.get("ts", 0.0), ts)
        self.note(sid, tool, project)
        return part

    def note(self, sid: str, tool: str = "", project: str = "") -> None:
        meta = self._meta.setdefault(sid, {"tool": "", "project_path": ""})
        meta["tool"] = meta["tool"] or tool
        meta["project_path"] = meta["project_path"] or project

    def replace(self, sid: str, name: str, values: dict, ts: float, *, tool: str = "", project: str = "") -> None:
        self._parts.setdefault(sid, {})[name] = dict(values, ts=ts)
        self._touched.add(sid)
        self.note(sid, tool, project)

    def reset(self, sid: str, name: str) -> None:
        """The source of a part is read again from its start."""
        if self._parts.get(sid, {}).pop(name, None) is not None:
            self._touched.add(sid)

    # ── rows ──

    def row(self, sid: str) -> dict | None:
        parts = self._parts.get(sid)
        if not parts:
            return None
        out: dict[str, Any] = {name: [] for name in _UNION}
        for name in _SUM:
            out[name] = None
        latest: dict[str, tuple[float, Any]] = {}
        ts = 0.0
        for part in parts.values():
            pts = part.get("ts", 0.0)
            ts = max(ts, pts)
            for name in _UNION:
                for value in part.get(name) or ():
                    _add_unique(out[name], value)
            for name in _SUM:
                if part.get(name) is not None:
                    out[name] = (out[name] or 0) + part[name]
            for name in _LAST:
                if part.get(name) is not None and (name not in latest or pts >= latest[name][0]):
                    latest[name] = (pts, part[name])
        for name in _LAST:
            out[name] = latest[name][1] if name in latest else None
        keys = out.pop("file_keys")
        if out["files_changed"] is None and keys:
            out["files_changed"] = len(keys)
        if not any(out[name] for name in COLUMNS) and all(out[name] is None for name in (*_SUM, *_LAST)):
            return None
        meta = self._meta.get(sid, {})
        return {
            "session_id": sid,
            "tool": meta.get("tool", ""),
            "project_path": meta.get("project_path", ""),
            "ts": ts,
            **{name: out[name] for name in COLUMNS},
        }

    def changed_rows(self, sids: Any = None) -> list[dict]:
        """Rows that differ from the last row written for their session. Marks them as written."""
        rows = []
        if sids is None:
            sids, self._touched = self._touched, set()
        for sid in list(sids):
            row = self.row(sid)
            if row is None:
                continue
            digest = hashlib.sha256(json.dumps(row, sort_keys=True, default=str).encode()).hexdigest()[:16]
            if self._written.get(sid) != digest:
                self._written[sid] = digest
                self.dirty = True
                rows.append(row)
        return rows

    # ── saved state ──

    def dump(self, cutoff: float) -> dict:
        keep = {
            sid
            for sid, parts in self._parts.items()
            if max((p.get("ts", 0.0) for p in parts.values()), default=0.0) >= cutoff
        }
        return {
            "parts": {sid: self._parts[sid] for sid in keep},
            "meta": {sid: self._meta[sid] for sid in keep if sid in self._meta},
            "written": {sid: self._written[sid] for sid in keep if sid in self._written},
        }

    def load(self, saved: Any) -> None:
        if not isinstance(saved, dict):
            return
        self._parts = {str(k): v for k, v in (saved.get("parts") or {}).items() if isinstance(v, dict)}
        self._meta = {str(k): v for k, v in (saved.get("meta") or {}).items() if isinstance(v, dict)}
        self._written = {str(k): str(v) for k, v in (saved.get("written") or {}).items()}


# ── Metadata files ─────────────────────────────────────────────────────


def _signature(path: Path) -> list[int] | None:
    try:
        st = path.stat()
    except OSError:
        return None
    return [st.st_mtime_ns, st.st_size]


def _scan(root: Path, pattern: str) -> list[Path]:
    try:
        return list(root.glob(pattern))
    except OSError:
        return []


class MetadataReaders:
    """The session metadata files that are not transcripts, read again only when they change.

    ``state`` is saved with the transcript reader's checkpoint: the signature of each file
    read, and the highest store row id read per table.
    """

    def __init__(self, buffer: Any, book: OutcomeBook) -> None:
        self.buffer = buffer
        self.book = book
        self.sigs: dict[str, list[int]] = {}
        self.store_ids: dict[str, dict[str, int]] = {}
        self.dirty = False

    def dump(self) -> dict:
        return {"sigs": self.sigs, "store_ids": self.store_ids}

    def load(self, saved: Any) -> None:
        if isinstance(saved, dict):
            self.sigs = {str(k): list(v) for k, v in (saved.get("sigs") or {}).items() if isinstance(v, list)}
            self.store_ids = {str(k): dict(v) for k, v in (saved.get("store_ids") or {}).items() if isinstance(v, dict)}

    def _changed(self, path: Path) -> list[int] | None:
        """The file's new signature when it changed since it was last read, else None."""
        sig = _signature(path)
        if sig is None or self.sigs.get(str(path)) == sig:
            return None
        return sig

    def _done(self, path: Path, sig: list[int]) -> None:
        self.sigs[str(path)] = sig
        self.dirty = True

    # ── Claude Code ``<project>/<session>/workflows/wf_*.json`` ──

    def claude_workflows(self, projects_dir: Path) -> set[str]:
        touched: set[str] = set()
        for path in _scan(projects_dir, "*/*/workflows/wf_*.json"):
            sig = self._changed(path)
            if sig is None:
                continue
            try:
                if sig[1] > 8 * 1024 * 1024:
                    raise ValueError("too large")
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                log.debug("session-outcomes: workflow file unreadable %s: %s", path.name, exc)
                self._done(path, sig)
                continue
            if not isinstance(data, dict):
                self._done(path, sig)
                continue
            sid = path.parents[1].name
            run_id = str(data.get("runId") or path.stem)
            started = data.get("startTime")
            ts = (
                started / 1000
                if isinstance(started, (int, float)) and started > 1e11
                else coerce_ts(data.get("timestamp"))
            )
            part = self.book.part(sid, "workflows", ts, tool="claude-code")
            runs = part.setdefault("runs", {})
            runs[run_id] = str(data.get("status") or "")
            part["workflow_runs"] = len(runs)
            part["workflows_failed"] = sum(1 for status in runs.values() if status == "failed")
            text = digest_text(data.get("summary"))
            if text:
                seq = int(hashlib.sha256(run_id.encode()).hexdigest()[:12], 16)  # one row per run
                self.buffer.add_digest(
                    SessionDigestRow(
                        session_id=sid,
                        kind="workflow_summary",
                        seq=seq,
                        ts=ts or sig[0] / 1e9,
                        title=str(data.get("workflowName") or "")[:200],
                        text=text,
                        tool="claude-code",
                    )
                )
            touched.add(sid)
            self._done(path, sig)
        return touched

    # ── Copilot ``session-state/<id>/session.db`` todos ──

    def copilot_todos(self, state_dir: Path) -> set[str]:
        touched: set[str] = set()
        try:
            names = [e.name for e in os.scandir(state_dir) if e.is_dir(follow_symlinks=False)]
        except OSError:
            return touched
        for sid in names:
            path = state_dir / sid / "session.db"
            sig = self._changed(path)
            if sig is None:
                continue
            todos = self._read_todos(path)
            self._done(path, sig)
            if todos is None:
                continue
            ts = sig[0] / 1e9
            done = sum(1 for _, status, _ in todos if status in ("done", "completed"))
            self.book.replace(
                sid, "todos", {"todos_total": len(todos), "todos_completed": done}, ts, tool="copilot-cli"
            )
            listing = "\n".join(f"- [{status}] {title}" for title, status, _ in todos)
            self.buffer.add_digest(
                SessionDigestRow(
                    session_id=sid, kind="todo_list", seq=0, ts=ts, text=digest_text(listing), tool="copilot-cli"
                )
            )
            touched.add(sid)
        return touched

    @staticmethod
    def _read_todos(path: Path) -> list[tuple[str, str, str]] | None:
        conn = open_readonly(path, "session-outcomes")
        if conn is None:
            return None
        try:
            if not conn.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'todos'").fetchone():
                return None
            return [
                (str(t or ""), str(s or ""), str(u or ""))
                for t, s, u in conn.execute("SELECT title, status, updated_at FROM todos ORDER BY created_at, id")
            ]
        except Exception as exc:  # noqa: BLE001 - sqlite3.Error; read again when the file changes
            log.debug("session-outcomes: todos unreadable in %s: %s", path.parent.name, exc)
            return None
        finally:
            conn.close()

    # ── Copilot ``session-store.db``: checkpoints, session_files, session_refs ──

    def copilot_store(self, store_db: Path) -> set[str]:
        sig = _signature(store_db)
        key = str(store_db)
        if sig is None or self.sigs.get(key) == sig:
            return set()
        conn = open_readonly(store_db, "session-outcomes")
        if conn is None:
            return set()
        ids = self.store_ids.setdefault(key, {})
        touched: set[str] = set()
        try:
            tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
            cwd = (
                {str(i): str(c or "") for i, c in conn.execute("SELECT id, cwd FROM sessions")}
                if "sessions" in tables
                else {}
            )
            if "checkpoints" in tables:
                touched |= self._checkpoints(conn, ids, cwd)
            if "session_files" in tables:
                touched |= self._store_files(conn, ids, cwd)
            if "session_refs" in tables:
                touched |= self._refs(conn, ids, cwd)
            self.sigs[key] = sig
            self.dirty = True
        except Exception as exc:  # noqa: BLE001 - sqlite3.Error, or a store of another layout
            log.debug("session-outcomes: store read failed, retrying when it changes: %s", exc)
        finally:
            conn.close()
        return touched

    def _new(self, conn: Any, ids: dict, table: str) -> tuple[int, int]:
        last = int(ids.get(table, 0))
        top = conn.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}").fetchone()[0] or 0  # noqa: S608 - fixed names
        if top < last:  # a store started over
            last = 0
        return last, int(top)

    def _checkpoints(self, conn: Any, ids: dict, cwd: dict) -> set[str]:
        last, top = self._new(conn, ids, "checkpoints")
        if top <= last:
            return set()
        touched = set()
        columns = {row[1] for row in conn.execute("PRAGMA table_info(checkpoints)")}
        # All the sections the tool writes; a store of an older Copilot may lack some of them.
        names = [name for name in _CHECKPOINT_SECTIONS if name in columns]
        for _id, sid, number, title, created, *bodies in conn.execute(
            f"SELECT id, session_id, checkpoint_number, title, created_at, {', '.join(names) or 'NULL'}"  # noqa: S608
            " FROM checkpoints WHERE id > ? AND id <= ? ORDER BY id",
            (last, top),
        ):
            sections = [(_CHECKPOINT_SECTIONS[name], body) for name, body in zip(names, bodies) if body]
            text = "\n\n".join(f"## {head}\n{body}" for head, body in sections)
            self.buffer.add_digest(
                SessionDigestRow(
                    session_id=str(sid),
                    kind="checkpoint",
                    seq=int(number or _id),
                    ts=coerce_ts(created),
                    title=str(title or "")[:200],
                    text=digest_text(text),
                    tool="copilot-cli",
                    project_path=cwd.get(str(sid), ""),
                )
            )
            touched.add(str(sid))
        ids["checkpoints"] = top
        return touched

    def _touched(self, conn: Any, table: str, last: int, top: int) -> list[str]:
        return [
            str(r[0])
            for r in conn.execute(f"SELECT DISTINCT session_id FROM {table} WHERE id > ? AND id <= ?", (last, top))
        ]  # noqa: S608

    def _store_files(self, conn: Any, ids: dict, cwd: dict) -> set[str]:
        """The files the tool lists as written in a session, summed up per file and tool."""
        last, top = self._new(conn, ids, "session_files")
        if top <= last:
            return set()
        sids = self._touched(conn, "session_files", last, top)
        for sid in sids:
            for path, tool_name, n, first, latest in conn.execute(
                "SELECT file_path, tool_name, COUNT(*), MIN(first_seen_at), MAX(first_seen_at) FROM session_files"
                " WHERE session_id = ? AND id <= ? GROUP BY file_path, tool_name",
                (sid, top),
            ):
                if not path:
                    continue
                tool_name = str(tool_name or "")
                self.buffer.add_file_row(
                    SessionFileRow(
                        session_id=sid,
                        path=str(path),
                        how="created" if tool_name == "create" else "edited",
                        tool_name=tool_name,
                        ts=coerce_ts(latest),
                        first_ts=coerce_ts(first),
                        count=int(n),
                        tool="copilot-cli",
                        project_path=cwd.get(sid, ""),
                    )
                )
        ids["session_files"] = top
        return set(sids)

    def _refs(self, conn: Any, ids: dict, cwd: dict) -> set[str]:
        last, top = self._new(conn, ids, "session_refs")
        if top <= last:
            return set()
        sids = self._touched(conn, "session_refs", last, top)
        for sid in sids:
            prs: list[str] = []
            commits: list[str] = []
            latest = 0.0
            for ref_type, value, created in conn.execute(
                "SELECT ref_type, ref_value, created_at FROM session_refs WHERE session_id = ? AND id <= ? ORDER BY id",
                (sid, top),
            ):
                latest = max(latest, coerce_ts(created))
                if ref_type == "pr":
                    _add_unique(prs, str(value or "")[:300])
                elif ref_type == "commit":
                    _add_unique(commits, str(value or "")[:64])
            self.book.replace(
                sid,
                "refs",
                {"pr_refs": prs, "commit_refs": commits},
                latest,
                tool="copilot-cli",
                project=cwd.get(sid, ""),
            )
        ids["session_refs"] = top
        return set(sids)
