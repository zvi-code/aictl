# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Build the ``aictl ps`` document from tool stores and the process table.

Selection is by liveness and recency, so the cost does not grow with the number
of session directories that exist. A figure with no data is ``None`` with its
reason in the node's ``na`` map, never 0.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any

from ..ingesters._common import coerce_ts, open_readonly
from ..platforms import config_path, copilot_global_dir, copilot_session_dir, vscode_user_dir
from .copilot_events import EventsFile, EventsParse, clean
from .procs import ProcTable, assign_shares, snapshot

SCHEMA_VERSION = 1
FRESH_S = 120.0
RECENT_ENDED_S = 86400.0
MAX_ENDED = 15
LIST_MAX_BYTES = 32 * 1024 * 1024
STATE_RANK = {"running": 0, "waiting": 1, "idle": 2, "ended": 3}
_DB_COLUMNS = (
    "id title session_type model is_running created_at updated_at total_input_tokens total_output_tokens "
    "total_cached_tokens total_reasoning_tokens context_current_tokens context_input_token_limit"
).split()
_LABELS = {
    "copilot-cli": "GitHub Copilot CLI",
    "copilot-desktop": "GitHub Copilot desktop app",
    "copilot-vscode": "Copilot in VS Code",
    "copilot365": "Microsoft 365 Copilot",
}
NESTING_FLAT = "sub-agent nesting: not recorded by this surface's data, shown flat"
FILES_SOURCE = "inferred from tool-call arguments; files touched by shell commands are not included"


def capture_mode() -> str:
    """Read ``[storage] capture``; an unreadable config is treated as ``metadata``."""
    path = config_path()
    if not path.is_file():
        return "full"
    try:
        try:
            import tomllib
        except ImportError:
            import tomli as tomllib  # type: ignore[no-redef]
        with open(path, "rb") as fh:
            data = tomllib.load(fh)
    except (OSError, ValueError):  # unreadable or invalid TOML: assume text must stay hidden
        return "metadata"
    storage = data.get("storage")
    mode = storage.get("capture") if isinstance(storage, dict) else None
    return mode if mode in ("metadata", "off") else "full"


def _workspace_yaml(session_dir: Path) -> dict[str, str]:
    """Top-level scalar keys only; multi-line values are not needed here."""
    out: dict[str, str] = {}
    try:
        with (session_dir / "workspace.yaml").open(encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if line[:1].isalpha() and ": " in line:
                    key, value = line.split(": ", 1)
                    if key in ("client_name", "cwd", "git_root", "branch", "name"):
                        out[key] = value.strip().strip("'\"")
    except OSError:
        pass
    return out


def _connect_no_side_files(path: Path) -> sqlite3.Connection | None:
    """``mode=ro`` still creates -wal and -shm beside a cleanly closed WAL database.

    With neither file present no writer is attached, so ``immutable=1`` reads the
    same data and leaves the tool's directory untouched.
    """
    try:
        with path.open("rb") as fh:
            header = fh.read(20)
    except OSError:
        return None
    is_wal = len(header) == 20 and header[18] == 2
    if is_wal and not Path(f"{path}-wal").exists() and not Path(f"{path}-shm").exists():
        try:
            return sqlite3.connect(f"{path.as_uri()}?immutable=1", uri=True, timeout=1.0)
        except sqlite3.Error:
            return None
    return open_readonly(path, "observe")


def _query(path: Path, sql: str, args: tuple = ()) -> list[tuple]:
    conn = _connect_no_side_files(path)
    if conn is None:
        return []
    try:
        return conn.execute(sql, args).fetchall()
    except sqlite3.Error:
        return []
    finally:
        conn.close()


def _desktop_rows(ids: list[str]) -> dict[str, dict[str, Any]]:
    """Named columns of ``sessions`` only; other tables in this store hold credentials."""
    path = copilot_global_dir() / "data.db"
    columns = {r[1] for r in _query(path, "pragma table_info(sessions)")}
    wanted = [c for c in _DB_COLUMNS if c in columns]
    if "id" not in wanted:
        return {}
    marks = ",".join("?" * len(ids))
    running = "or is_running = 1" if "is_running" in wanted else ""
    sql = f"select {','.join(wanted)} from sessions where id in ({marks}) {running}"
    return {row[0]: dict(zip(wanted, row)) for row in _query(path, sql, tuple(ids))}


def context_files(cwd: str, git_root: str) -> list[dict[str, Any]]:
    """Instruction and memory files in effect, by size; tokens are bytes/4 estimates."""
    candidates: list[tuple[str, Path]] = [("instructions", copilot_global_dir() / "copilot-instructions.md")]
    if cwd:
        folder = Path(cwd)
        stop = Path(git_root) if git_root else folder
        for _ in range(12):
            for rel in ("AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"):
                candidates.append(("instructions", folder / rel))
            if folder == stop or folder.parent == folder:
                break
            folder = folder.parent
        try:
            for item in sorted((stop / ".github" / "instructions").glob("*.instructions.md"))[:30]:
                candidates.append(("instructions", item))
        except OSError:
            pass
    try:
        for item in sorted((vscode_user_dir() / "globalStorage" / "github.copilot-chat" / "memory-tool").rglob("*"))[:50]:
            candidates.append(("memory", item))
    except OSError:
        pass
    out = []
    for kind, path in candidates:
        try:
            if path.is_file():
                size = path.stat().st_size
                out.append({"kind": kind, "path": clean(path, 240), "bytes": size, "est_tokens": size // 4})
        except OSError:
            continue
    return out


def _tool_rows(stats: list[Any]) -> tuple[list[dict[str, Any]], list[str]]:
    merged: dict[str, list[Any]] = {}
    for scope in stats:
        for name, e in scope.by_tool.items():
            m = merged.setdefault(name, [0, 0, 0, 0.0, 0.0, None])
            for i in range(3):
                m[i] += e[i]
            m[3] += e[3]
            m[4] = max(m[4], e[4])
            m[5] = m[5] or e[5]
    rows = [
        {
            "name": n,
            "calls": m[0],
            "failures": m[1],
            "avg_ms": round(m[3] / m[2], 1) if m[2] else None,
            "max_ms": round(m[4], 1) if m[2] else None,
            "mcp_server": m[5],
        }
        for n, m in merged.items()
    ]
    rows.sort(key=lambda r: r["calls"], reverse=True)
    return rows, sorted({r["mcp_server"] for r in rows if r["mcp_server"]})


def _agent_tree(p: EventsParse, now: float, session_live: bool) -> list[dict[str, Any]]:
    nodes: dict[str, dict[str, Any]] = {}
    for call_id, a in p.agents.items():
        scope = p.scopes.get(call_id)
        rows, mcp = _tool_rows([scope] if scope else [])
        running = a["ended_at"] is None and session_live
        end = a["ended_at"] or (now if running else p.last_ts)
        nodes[call_id] = {
            "id": a["id"],
            "name": a["name"],
            "model": a["model"] or None,
            "state": "running" if running else "ended",
            "failed": a["failed"],
            "started_at": a["started_at"] or None,
            "age_s": max(0.0, end - a["started_at"]) if a["started_at"] else None,
            "idle_s": None if a["ended_at"] else max(0.0, now - p.last_ts),
            "turns": a["turns"],
            "tool_calls": scope.calls if scope else 0,
            "failures": scope.failures if scope else 0,
            "by_tool": rows,
            "mcp_servers": mcp,
            "total_tokens": a["total_tokens"],
            "na": {} if a["total_tokens"] is not None else {"total_tokens": "reported only when the sub-agent completes"},
            "agents": [],
        }
    roots = []
    for call_id, node in nodes.items():
        owner = p.owning_agent(call_id)
        (nodes[owner]["agents"] if owner in nodes else roots).append(node)
    return roots


def _base_session(sid: str, tool: str, capture: str) -> dict[str, Any]:
    return {
        "id": sid,
        "tool": tool,
        "state": "ended",
        "started_at": None,
        "last_activity_at": None,
        "age_s": None,
        "idle_s": None,
        "cwd": None,
        "branch": None,
        "model": None,
        "title": None,
        "pids": [],
        "attribution": "none",
        "rss_bytes": None,
        "processes": [],
        "agents": [],
        "memory": {"context": {"files": [], "total_bytes": 0, "est_tokens": 0, "current_tokens": None, "token_limit": None}},
        "tools": {"calls": None, "failures": None, "running": [], "by_tool": [], "mcp_servers": []},
        "prompts": {"count": None, "capture": capture, "recent": []},
        "files": {"inferred": True, "source": FILES_SOURCE, "read": [], "written": []},
        "activity": {
            "turns": None,
            "tool_calls": None,
            "tokens": None,
            "requests": None,
            "premium_requests": None,
            "duration_s": None,
            "tool_calls_per_min": None,
        },
        "notes": [],
        "na": {},
    }


def _apply_parse(s: dict[str, Any], p: EventsParse, now: float, live: bool, capture: str) -> None:
    s["started_at"] = p.first_ts or s["started_at"]
    s["last_activity_at"] = p.last_ts or s["last_activity_at"]
    s["cwd"] = p.cwd or s["cwd"]
    s["branch"] = p.branch or s["branch"]
    s["model"] = p.model or s["model"]
    all_scopes = list(p.scopes.values())
    main = [v for k, v in p.scopes.items() if k not in p.agents]
    rows, mcp = _tool_rows(all_scopes)
    calls = sum(v.calls for v in all_scopes)
    s["tools"] = {
        "calls": calls,
        "failures": sum(v.failures for v in all_scopes),
        "running": [
            {"name": c["name"], "running_s": max(0.0, now - c["ts"]) if c["ts"] else None}
            for c in p.pending.values()
            if live
        ],
        "by_tool": rows,
        "mcp_servers": mcp,
        "main_agent_calls": sum(v.calls for v in main),
    }
    s["prompts"] = {
        "count": p.prompt_count,
        "capture": capture,
        "recent": [
            {k: v for k, v in item.items() if k != "text" or capture == "full"} for item in p.recent_prompts
        ],
    }
    def by_recent(table: dict[str, list[Any]]) -> list[dict[str, Any]]:
        items = [{"path": k, "count": v[0], "last_at": v[1] or None} for k, v in table.items()]
        return sorted(items, key=lambda i: i["last_at"] or 0, reverse=True)

    s["files"].update(read=by_recent(p.read), written=by_recent(p.written))
    s["agents"] = _agent_tree(p, now, live)
    act = s["activity"]
    act["turns"] = p.turns
    act["tool_calls"] = calls
    if p.has_usage:
        act["tokens"] = dict(p.tokens)
        if p.requests:
            act["requests"] = p.requests
        else:
            s["na"]["requests"] = "per-request usage records absent from this log"
    else:
        s["na"]["tokens"] = "no usage records in this session's log"
        s["na"]["requests"] = "no usage records in this session's log"
    act["premium_requests"] = p.premium_requests
    if p.premium_requests is None:
        s["na"]["premium_requests"] = "logged only at usage checkpoints and shutdown; none yet"
    if p.first_ts and p.last_ts:
        span = (now if live else p.last_ts) - p.first_ts
        act["duration_s"] = max(0.0, span)
        if span > 0:
            act["tool_calls_per_min"] = round(calls / (span / 60.0), 2)
    ctx = s["memory"]["context"]
    ctx["current_tokens"] = p.context_current
    ctx["token_limit"] = p.context_limit
    ctx["skills"] = dict(p.skills)
    ctx["instruction_updates"] = dict(p.instructions)


def _finish_session(s: dict[str, Any], now: float, git_root: str = "") -> None:
    if s["started_at"]:
        s["age_s"] = max(0.0, (s["last_activity_at"] if s["state"] == "ended" else now) - s["started_at"])
    if s["last_activity_at"]:
        s["idle_s"] = max(0.0, now - s["last_activity_at"])
    ctx = s["memory"]["context"]
    ctx["files"] = context_files(s["cwd"] or "", git_root)
    ctx["total_bytes"] = sum(f["bytes"] for f in ctx["files"])
    ctx["est_tokens"] = sum(f["est_tokens"] for f in ctx["files"])
    ctx["note"] = "file tokens are bytes/4 estimates; Copilot cloud memory is not readable locally"
    if ctx["current_tokens"] is None:
        s["na"]["context_tokens"] = "no context telemetry in this session's data"


class Collector:
    """Holds parse caches so repeated collection only reads new bytes."""

    def __init__(self) -> None:
        self.files: dict[Path, EventsFile] = {}
        self.chats: dict[Path, tuple[tuple[int, int], dict[str, Any]]] = {}

    def _events(self, path: Path, capture: str) -> EventsParse:
        ef = self.files.get(path)
        if ef is None or ef.keep_previews != (capture == "full"):
            ef = self.files[path] = EventsFile(path, capture == "full")
        return ef.refresh()

    # ── Copilot session-state: CLI, desktop app, and sessions VS Code hosts ──

    def _scan_state_dirs(self, table: ProcTable | None, now: float) -> list[dict[str, Any]]:
        base = copilot_session_dir()
        out = []
        try:
            entries = list(os.scandir(base))
        except OSError:
            return out
        for entry in entries:
            try:
                if not entry.is_dir():
                    continue
                mtime = 0.0
                size = 0
                held: list[int] = []
                with os.scandir(entry.path) as inner:
                    for f in inner:
                        if f.name == "events.jsonl":
                            st = f.stat()
                            mtime, size = st.st_mtime, st.st_size
                        elif f.name.startswith("inuse.") and f.name.endswith(".lock"):
                            pid = f.name[6:-5]
                            if pid.isdigit() and self._lock_valid(int(pid), f.stat().st_mtime, table):
                                held.append(int(pid))
            except OSError:
                continue
            out.append({"id": entry.name, "dir": Path(entry.path), "mtime": mtime, "size": size, "pids": held})
        return out

    @staticmethod
    def _lock_valid(pid: int, lock_mtime: float, table: ProcTable | None) -> bool:
        """Lock files outlive their process, and PIDs get reused: check who holds the PID now."""
        row = table.rows.get(pid) if table else None
        if row is None:
            return False
        tool_ok = bool(row.tool and row.tool.startswith("copilot")) or "copilot" in row.name.lower()
        return tool_ok and row.create_time <= lock_mtime + 5.0

    def copilot_state_sessions(
        self, table: ProcTable | None, now: float, capture: str, include_ended: bool, target: str | None
    ) -> list[dict[str, Any]]:
        dirs = self._scan_state_dirs(table, now)
        if target:
            picked = [d for d in dirs if d["id"].startswith(target) or (target.isdigit() and int(target) in d["pids"])]
        else:
            picked = [d for d in dirs if d["pids"] or now - d["mtime"] < FRESH_S]
            if include_ended:
                ended = [d for d in dirs if d not in picked and now - d["mtime"] < RECENT_ENDED_S]
                ended.sort(key=lambda d: d["mtime"], reverse=True)
                picked += ended[:MAX_ENDED]
        by_id = {d["id"]: d for d in dirs}
        ids = [d["id"] for d in picked]
        desktop = _desktop_rows(ids) if ids or not target else {}
        for sid, row in desktop.items():
            if row.get("is_running") and sid in by_id and by_id[sid] not in picked:
                picked.append(by_id[sid])
        out = []
        for d in picked:
            out.append(self._state_session(d, desktop.get(d["id"]), table, now, capture, bool(target)))
        known = {s["id"] for s in out}
        for sid, row in desktop.items():
            if sid not in known and row.get("is_running"):
                out.append(self._desktop_only(sid, row, now, capture))
        return out

    def _state_session(
        self, d: dict[str, Any], db: dict[str, Any] | None, table: ProcTable | None, now: float, capture: str, drill: bool
    ) -> dict[str, Any]:
        meta = _workspace_yaml(d["dir"])
        holder = table.rows[d["pids"][0]].tool if d["pids"] and table else None
        client = meta.get("client_name", "")
        too_big = not drill and d["size"] > LIST_MAX_BYTES and d["dir"] / "events.jsonl" not in self.files
        p = None if too_big or not d["mtime"] else self._events(d["dir"] / "events.jsonl", capture)
        if holder in ("copilot-vscode", "copilot-desktop"):
            tool = holder
        elif client == "github/autopilot" or (db and not client):
            tool = "copilot-desktop"
        elif p is not None and p.vscode:
            tool = "copilot-vscode"
        else:
            tool = "copilot-cli"
        s = _base_session(d["id"], tool, capture)
        s["cwd"] = clean(meta.get("cwd") or "", 240) or None
        s["branch"] = clean(meta.get("branch") or "", 80) or None
        live = bool(d["pids"]) or bool(db and db.get("is_running"))
        if p is not None:
            active = live or (not p.shutdown and now - (p.last_ts or d["mtime"]) < FRESH_S)
            _apply_parse(s, p, now, active, capture)
        else:
            s["last_activity_at"] = d["mtime"] or None
            reason = f"log is {d['size'] // 1048576} MB; run: aictl ps {d['id'][:8]}" if too_big else "no events.jsonl"
            s["na"].update(tokens=reason, requests=reason, premium_requests=reason, tool_calls=reason, turns=reason)
        if capture == "full":
            s["title"] = clean((db or {}).get("title") or meta.get("name") or "", 80) or None
        last = (p.last_ts if p else 0.0) or d["mtime"]
        fresh = now - last < FRESH_S
        if p is not None and p.shutdown and not live:
            s["state"] = "ended"
        elif not live and not fresh:
            s["state"] = "ended"
        elif p is not None and p.waiting():
            s["state"] = "waiting"
        elif p is not None and (p.open_turns or p.pending):
            s["state"] = "running"
        else:
            s["state"] = "idle"
        if d["pids"]:
            s["pids"] = d["pids"]
            s["attribution"] = "inuse lock file, holder verified live"
        elif s["state"] != "ended":
            s["attribution"] = "none"
            s["notes"].append("no verified owner process: state comes from recent log activity")
        if db:
            s["model"] = s["model"] or (clean(db["model"], 60) if db.get("model") else None)
            ctx = s["memory"]["context"]
            ctx["current_tokens"] = ctx["current_tokens"] or db.get("context_current_tokens")
            ctx["token_limit"] = ctx["token_limit"] or db.get("context_input_token_limit")
            if s["activity"]["tokens"] is None and db.get("total_input_tokens") is not None:
                s["activity"]["tokens"] = {
                    "input": db.get("total_input_tokens"),
                    "output": db.get("total_output_tokens"),
                    "cache_read": db.get("total_cached_tokens"),
                    "reasoning": db.get("total_reasoning_tokens"),
                }
                s["na"].pop("tokens", None)
        if drill and (p is None or not p.first_ts):
            self._fill_from_store(s)
        _finish_session(s, now, p.git_root if p else "")
        return s

    def _desktop_only(self, sid: str, row: dict[str, Any], now: float, capture: str) -> dict[str, Any]:
        s = _base_session(sid, "copilot-desktop", capture)
        s["state"] = "running"
        s["started_at"] = coerce_ts(row.get("created_at")) or None
        s["last_activity_at"] = coerce_ts(row.get("updated_at")) or None
        s["model"] = clean(row["model"], 60) if row.get("model") else None
        s["notes"].append("desktop session store says running; no log directory and no attributable process")
        s["na"].update(turns="no log directory", tool_calls="no log directory", premium_requests="no log directory")
        _finish_session(s, now)
        return s

    def _fill_from_store(self, s: dict[str, Any]) -> None:
        """Past sessions keep turn, file and usage rows in ``session-store.db``."""
        path = copilot_global_dir() / "session-store.db"
        sid = s["id"]
        turns = _query(path, "select count(*) from turns where session_id = ?", (sid,))
        if turns and turns[0][0]:
            s["activity"]["turns"] = turns[0][0]
            s["na"].pop("turns", None)
        files = _query(path, "select file_path, tool_name, count(*) from session_files where session_id = ? group by 1,2", (sid,))
        for fp, tool, count in files[:200]:
            lname = (tool or "").lower()
            table = "read" if lname in ("view", "read", "read_file") else "written"
            s["files"][table].append({"path": clean(fp, 240), "count": count, "last_at": None})
        usage = _query(
            path,
            "select sum(input_tokens), sum(output_tokens), sum(cache_read_tokens), sum(cache_write_tokens), "
            "sum(reasoning_tokens), count(*) from assistant_usage_events where session_id = ?",
            (sid,),
        )
        if usage and usage[0][5]:
            u = usage[0]
            s["activity"]["tokens"] = {"input": u[0], "output": u[1], "cache_read": u[2], "cache_write": u[3], "reasoning": u[4]}
            s["activity"]["requests"] = u[5]
            s["na"].pop("tokens", None)
            s["na"].pop("requests", None)

    # ── Copilot in VS Code chat sessions ─────────────────────────────────

    def vscode_chat_sessions(
        self, editor_running: bool, now: float, capture: str, include_ended: bool, target: str | None
    ) -> list[dict[str, Any]]:
        root = vscode_user_dir() / "workspaceStorage"
        try:
            found = list(root.glob("*/chatSessions/*.json*"))
        except OSError:
            return []
        items = []
        for path in found:
            try:
                st = path.stat()
            except OSError:
                continue
            items.append((st.st_mtime, st.st_size, path))
        items.sort(key=lambda i: i[0], reverse=True)
        out = []
        ended = 0
        for mtime, size, path in items:
            if target and not path.stem.startswith(target):
                continue
            recent = now - mtime < 1800 and editor_running
            if not target and not recent:
                if not include_ended or now - mtime >= RECENT_ENDED_S or ended >= MAX_ENDED:
                    continue
                ended += 1
            out.append(self._chat_session(path, mtime, size, editor_running, now, capture, bool(target)))
        return out

    def _chat_session(
        self, path: Path, mtime: float, size: int, editor_running: bool, now: float, capture: str, drill: bool
    ) -> dict[str, Any]:
        s = _base_session(path.stem, "copilot-vscode", capture)
        s["last_activity_at"] = mtime
        s["notes"].append(NESTING_FLAT)
        s["attribution"] = "none"
        s["na"]["process"] = "chat session files carry no process id"
        s["na"]["premium_requests"] = "not recorded in VS Code chat session files"
        s["cwd"] = _vscode_workspace(path.parent.parent)
        chat = None
        if size > LIST_MAX_BYTES and not drill:
            reason = f"session file is {size // 1048576} MB; run: aictl ps {path.stem[:8]}"
            s["na"].update(turns=reason, tokens=reason, tool_calls=reason, requests=reason)
        else:
            chat = self._chat_summary(path, (int(mtime * 1e9), size), capture)
        fresh = now - mtime < FRESH_S
        if chat is not None:
            _apply_chat(s, chat, now, capture)
        transcript = path.parent.parent / "GitHub.copilot-chat" / "transcripts" / f"{path.stem}.jsonl"
        if transcript.is_file():
            p = self._events(transcript, capture)
            keep_tokens = dict(s["activity"])
            keep_prompts = s["prompts"]
            cwd, na = s["cwd"], dict(s["na"])
            _apply_parse(s, p, now, editor_running and fresh, capture)
            s["cwd"] = s["cwd"] or cwd
            s["prompts"] = keep_prompts if keep_prompts["count"] is not None else s["prompts"]
            s["activity"].update(turns=keep_tokens["turns"], tokens=keep_tokens["tokens"], requests=keep_tokens["requests"])
            s["na"] = na
            for key in ("tool_calls",):
                s["na"].pop(key, None)
        else:
            s["na"]["durations"] = "per-tool durations come from transcripts; none for this session"
        if not editor_running or now - mtime >= 1800:
            s["state"] = "ended"
        elif fresh and chat is not None and chat["open"]:
            s["state"] = "running"
        else:
            s["state"] = "idle"
        if capture == "full" and chat is not None:
            s["title"] = chat["title"]
        _finish_session(s, now)
        return s

    def _chat_summary(self, path: Path, sig: tuple[int, int], capture: str) -> dict[str, Any] | None:
        cached = self.chats.get(path)
        if cached and cached[0] == sig:
            return cached[1]
        snap = _replay_chat(path)
        if snap is None:
            return None
        summary = _summarize_chat(snap, capture)
        self.chats[path] = (sig, summary)
        return summary

    # ── document ─────────────────────────────────────────────────────────

    def collect(
        self, tool: str | None = None, include_ended: bool = False, target: str | None = None
    ) -> dict[str, Any]:
        started = time.perf_counter()
        now = time.time()
        capture = capture_mode()
        table = snapshot()
        notes = []
        if table is None:
            notes.append("psutil is not installed: process data is n/a. Install with: pip install aictl[processes]")
        roots = table.tool_roots() if table else {}
        sessions = self.copilot_state_sessions(table, now, capture, include_ended, target)
        editor_running = "copilot-vscode" in roots
        sessions += self.vscode_chat_sessions(editor_running, now, capture, include_ended, target)
        doc_tools: dict[str, dict[str, Any]] = {}

        def tool_node(name: str) -> dict[str, Any]:
            return doc_tools.setdefault(
                name,
                {
                    "tool": name,
                    "label": _LABELS.get(name, name),
                    "state": "ended",
                    "rss_bytes": None,
                    "sessions": [],
                    "unattributed_processes": [],
                    "notes": [],
                },
            )

        attributed: set[int] = set()
        for s in sessions:
            if s["state"] != "ended" or target:
                tool_node(s["tool"])["sessions"].append(s)
            elif include_ended:
                tool_node(s["tool"])["sessions"].append(s)
            else:
                continue
            if table is None:
                s["na"]["process"] = "psutil is not installed"
                continue
            nodes = [n for pid in s["pids"] if (n := table.node(pid, now))]
            s["processes"] = nodes
            s["rss_bytes"] = assign_shares(nodes)
            attributed.update(pid for pid in s["pids"])
            if not nodes and "process" not in s["na"]:
                s["na"]["process"] = "no process could be attributed to this session"
        for name, rows in roots.items():
            node = tool_node(name)
            node["unattributed_processes"] = [
                n for r in rows if r.pid not in attributed and (n := table.node(r.pid, now, attributed))
            ]
            assign_shares(node["unattributed_processes"])
            if not name.startswith("copilot"):
                node["notes"].append("processes only: no session reader for this tool in this view")
            elif name == "copilot365":
                node["notes"].append("session data isn't available locally: the app is a cloud client")
        target_pid = int(target) if target and target.isdigit() else None
        if target_pid is not None and table is not None and target_pid in table.rows and not sessions:
            row = table.rows[target_pid]
            node = tool_node(row.tool or "unclassified")
            built = table.node(target_pid, now)
            node["unattributed_processes"] = [built] if built else []
            assign_shares(node["unattributed_processes"])
        for node in doc_tools.values():
            node["sessions"].sort(key=lambda s: (STATE_RANK[s["state"]], -(s["last_activity_at"] or 0)))
            if node["sessions"]:
                node["state"] = node["sessions"][0]["state"]
            elif node["unattributed_processes"]:
                node["state"] = "idle"
            totals = [s["rss_bytes"] for s in node["sessions"] if s["rss_bytes"] is not None]
            totals += [p["tree_rss_bytes"] for p in node["unattributed_processes"] if p["tree_rss_bytes"] is not None]
            node["rss_bytes"] = sum(totals) if totals else None
        if target and table is not None:
            for name in list(doc_tools):
                node = doc_tools[name]
                if not node["sessions"] and not (target_pid and any(p["pid"] == target_pid for p in node["unattributed_processes"])):
                    del doc_tools[name]
                elif node["sessions"] and target_pid is None:
                    node["unattributed_processes"] = []
        tools = list(doc_tools.values())
        if tool:
            tools = [t for t in tools if t["tool"] == tool]
        tools.sort(
            key=lambda t: (
                STATE_RANK[t["state"]],
                -max((s["last_activity_at"] or 0 for s in t["sessions"]), default=0),
                -(t["rss_bytes"] or 0),
            )
        )
        return {
            "schema_version": SCHEMA_VERSION,
            "generated_at": now,
            "capture": capture,
            "psutil_available": table is not None,
            "elapsed_ms": round((time.perf_counter() - started) * 1000.0, 1),
            "notes": notes,
            "tools": tools,
        }


def _vscode_workspace(ws_dir: Path) -> str | None:
    try:
        with (ws_dir / "workspace.json").open(encoding="utf-8") as fh:
            folder = json.load(fh).get("folder")
    except (OSError, ValueError, AttributeError):
        return None
    if not isinstance(folder, str) or not folder.startswith("file://"):
        return None
    from urllib.parse import unquote, urlparse

    path = unquote(urlparse(folder).path)
    if len(path) > 2 and path[0] == "/" and path[2] == ":":
        path = path[1:]
    return clean(path, 240)


def _apply_patch(snap: Any, kind: int, keys: list[Any], value: Any, index: int | None) -> None:
    cur = snap
    for key in keys[:-1]:
        try:
            cur = cur[key]
        except (KeyError, IndexError, TypeError):
            return
    last = keys[-1]
    try:
        if kind == 1:
            cur[last] = value
        else:
            arr = cur[last]
            if index is not None:
                del arr[index:]
            arr.extend(value if isinstance(value, list) else [value])
    except (KeyError, IndexError, TypeError, AttributeError):
        return


def _replay_chat(path: Path) -> dict[str, Any] | None:
    """A ``.jsonl`` chat session is a snapshot plus set/append patches; ``.json`` is a snapshot."""
    try:
        with path.open(encoding="utf-8", errors="replace") as fh:
            first = fh.readline()
            if path.suffix == ".json":
                loaded = json.loads(first + fh.read())
                return loaded if isinstance(loaded, dict) else None
            rec = json.loads(first)
            snap = rec.get("v") if isinstance(rec, dict) else None
            if not isinstance(snap, dict):
                return None
            for line in fh:
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if isinstance(rec, dict) and rec.get("kind") in (1, 2) and isinstance(rec.get("k"), list) and rec["k"]:
                    _apply_patch(snap, rec["kind"], rec["k"], rec.get("v"), rec.get("i"))
            return snap
    except (OSError, ValueError):
        return None


def _summarize_chat(snap: dict[str, Any], capture: str) -> dict[str, Any]:
    requests = [r for r in snap.get("requests") or () if isinstance(r, dict)]
    tools: dict[str, list[Any]] = {}
    written: dict[str, list[Any]] = {}
    prompts = []
    tokens = {"input": 0, "output": 0}
    seen_tokens = False
    open_request = False
    model = ""
    for req in requests:
        ts = coerce_ts(req.get("timestamp"))
        model = str(req.get("modelId") or model)
        message = req.get("message")
        text = message.get("text") if isinstance(message, dict) else None
        item: dict[str, Any] = {"ts": ts, "length": len(text) if isinstance(text, str) else None}
        if capture == "full" and isinstance(text, str):
            item["text"] = clean(text[:800], 200)
        prompts.append(item)
        result = req.get("result")
        meta = result.get("metadata") if isinstance(result, dict) else None
        if isinstance(meta, dict):
            for key, src in (("input", "promptTokens"), ("output", "outputTokens")):
                if isinstance(meta.get(src), (int, float)):
                    tokens[key] += int(meta[src])
                    seen_tokens = True
        open_request = not isinstance(result, dict)
        for part in req.get("response") or ():
            if not isinstance(part, dict):
                continue
            if part.get("kind") == "toolInvocationSerialized":
                name = clean(part.get("toolId") or "?", 60)
                source = part.get("source")
                server = clean(source.get("label") or "", 60) if isinstance(source, dict) and source.get("type") == "mcp" else None
                slot = tools.setdefault(name, [0, server])
                slot[0] += 1
            elif part.get("kind") == "textEditGroup":
                uri = part.get("uri")
                target = uri.get("path") if isinstance(uri, dict) else None
                if isinstance(target, str):
                    entry = written.setdefault(clean(target, 240), [0, ts])
                    entry[0] += 1
                    entry[1] = max(entry[1], ts)
    return {
        "title": clean(snap.get("customTitle") or "", 80) or None,
        "created": coerce_ts(snap.get("creationDate")),
        "requests": len(requests),
        "open": open_request,
        "model": clean(model, 60),
        "tools": tools,
        "written": written,
        "prompts": prompts,
        "tokens": tokens if seen_tokens else None,
    }


def _apply_chat(s: dict[str, Any], chat: dict[str, Any], now: float, capture: str) -> None:
    s["started_at"] = chat["created"] or None
    s["model"] = chat["model"] or None
    calls = sum(v[0] for v in chat["tools"].values())
    rows = [
        {"name": n, "calls": v[0], "failures": None, "avg_ms": None, "max_ms": None, "mcp_server": v[1]}
        for n, v in sorted(chat["tools"].items(), key=lambda kv: kv[1][0], reverse=True)
    ]
    s["tools"].update(
        calls=calls,
        failures=None,
        by_tool=rows,
        mcp_servers=sorted({r["mcp_server"] for r in rows if r["mcp_server"]}),
    )
    s["na"]["failures"] = "chat session files do not record tool failure"
    recent = chat["prompts"][-5:]
    s["prompts"] = {
        "count": len(chat["prompts"]),
        "capture": capture,
        "recent": [{k: v for k, v in i.items() if k != "text" or capture == "full"} for i in recent],
    }
    s["files"]["written"] = [{"path": k, "count": v[0], "last_at": v[1] or None} for k, v in chat["written"].items()]
    s["na"]["files_read"] = "chat session files do not record read targets without a transcript"
    act = s["activity"]
    act.update(turns=chat["requests"], tool_calls=calls, requests=chat["requests"], tokens=chat["tokens"])
    if chat["tokens"] is None:
        s["na"]["tokens"] = "no token counts in this session file"
    if chat["created"] and s["last_activity_at"]:
        span = s["last_activity_at"] - chat["created"]
        act["duration_s"] = max(0.0, span)
        if span > 0:
            act["tool_calls_per_min"] = round(calls / (span / 60.0), 2)
