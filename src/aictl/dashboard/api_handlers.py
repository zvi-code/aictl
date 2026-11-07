# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""REST API endpoint handler methods for the dashboard.

Provides _APIHandlersMixin which is mixed into _DashboardHandler to
supply all /api/* endpoint implementations.
"""

from __future__ import annotations

import dataclasses
import json
import logging
import os
import re
import time
from collections import Counter
from pathlib import Path

from ..data.model_pricing import context_window_for, resolve_pricing
from ..data.provenance import combine_cost_quality, combine_tokens_quality, row_provenance
from ..data.token_usage import TokenUsage
from ..ingesters._common import decode_file_uri, project_key
from ..ingesters.transcript_usage import local_day
from ..tool_scope import selection_block
from ..tools import budget_tools, compute_token_budget
from .analytics import _day_is_partial, compute_usage_summary, window_sessions
from .models import _slim_agent_teams
from .otel_receiver import API_ERROR_EVENTS, API_REQUEST_EVENTS, _num
from .session_flow import build_session_flow

# Synthesized process-based session_id format: "tool:pid:timestamp".
# Used by copilot-vscode (and other tools that don't emit their own ids)
# to synthesize a session id from the process. Such ids never appear in
# OTel events — OTel emitters tag events with the tool's own chat/session
# id — so strict session_id matching misses everything. When we see one
# of these, we fall back to matching on tool + the session's time window.
_SYNTHETIC_SESSION_RE = re.compile(r"^[a-z][a-z0-9-]*:\d+:\d+$")

# psutil measures CPU between two calls on the same Process object, so the
# objects must outlive one request. Keyed by pid; dead pids are dropped.
_SELF_PROCS: dict[int, object] = {}


def self_usage(pid: int | None = None) -> dict:
    """CPU and memory of this process plus its child processes.

    ``cpu_percent`` and ``memory_rss_bytes`` are the totals. The daemon share is
    ``daemon_*`` and every child is listed in ``children`` so a costly helper
    is visible instead of hidden behind a quiet parent.
    """
    import os

    import psutil

    pid = os.getpid() if pid is None else pid
    parent = _SELF_PROCS.get(pid) or psutil.Process(pid)
    _SELF_PROCS[pid] = parent
    procs = [parent]
    try:
        procs += parent.children(recursive=True)
    except psutil.Error:
        pass
    live = {p.pid for p in procs}
    for stale in [k for k in _SELF_PROCS if k not in live]:
        del _SELF_PROCS[stale]

    rows = []
    for proc in procs:
        proc = _SELF_PROCS.setdefault(proc.pid, proc)
        try:
            rows.append(
                {
                    "pid": proc.pid,
                    "name": proc.name(),
                    "cpu_percent": round(proc.cpu_percent(interval=0), 1),
                    "memory_rss_bytes": proc.memory_info().rss,
                }
            )
        except psutil.Error:
            continue
    daemon = rows[0] if rows and rows[0]["pid"] == pid else {"cpu_percent": 0.0, "memory_rss_bytes": 0}
    children = [r for r in rows if r["pid"] != pid]
    return {
        "cpu_percent": round(sum(r["cpu_percent"] for r in rows), 1),
        "memory_rss_bytes": sum(r["memory_rss_bytes"] for r in rows),
        "daemon_cpu_percent": daemon["cpu_percent"],
        "daemon_memory_rss_bytes": daemon["memory_rss_bytes"],
        "children": children,
    }


_IMPORTED_SESSION_SOURCES = {
    "claude-code-jsonl",
    "copilot-session-store",
    "cursor-ingester",
    "vscode-chat-logs",
}

# Server-side clamp for the tool-invocation ``input`` payload surfaced by
# /api/session-tool-calls — a pathological command line must not bloat the
# response; the UI expands the (clipped) text on demand.
_INPUT_MAX_CHARS = 500


def tool_history_for_api(tool_data: dict[str, dict[str, list]]) -> dict[str, dict[str, list]]:
    """Per-tool history series for ``/api/history``, without the series the store does not keep.

    The store samples CPU and memory per process; it keeps no per-tool token or
    traffic series over time. Those keys are left out, so the page shows them as
    not available instead of a flat line of zeros.
    """
    return {t: {k: v for k, v in series.items() if k not in ("tokens", "traffic")} for t, series in tool_data.items()}


def _match_live_session(profile: dict, live_sessions: list[dict]) -> dict | None:
    """Find the live snapshot session that corresponds to a DB profile row.

    Live snapshot ids (``tool:pid:started``) and persisted row ids (tool
    UUIDs, correlator composites) come from different sources, so exact
    id equality misses and the same session shows up twice — one "live"
    row plus a stale historical row.  Match, in order of confidence, by:

    1. exact session_id
    2. shared UUID component in the ids
    3. same tool + the profile's PID appearing in the live session's PIDs
    4. same tool + near-total time overlap + no workspace conflict
    """
    from ..storage import _session_uuid

    # 1. Exact id
    for live in live_sessions:
        if live.get("session_id") == profile.get("session_id"):
            return live

    # 2. Shared UUID component
    p_uuid = _session_uuid(profile.get("session_id", ""))
    if p_uuid:
        for live in live_sessions:
            if _session_uuid(live.get("session_id", "")) == p_uuid:
                return live

    # 3. PID linkage
    p_pid = int(profile.get("pid", 0) or 0)
    if p_pid:
        for live in live_sessions:
            if live.get("tool") != profile.get("tool"):
                continue
            if p_pid == (live.get("root_pid") or 0) or p_pid in (live.get("pids") or []):
                return live

    # 4. Time-window overlap (workspace-compatible)
    now = time.time()
    p_start = float(profile.get("started_at", 0) or 0)
    p_end = float(profile.get("ended_at") or now)
    p_duration = max(p_end - p_start, 1.0)
    p_workspace = profile.get("project_path") or profile.get("project") or ""
    for live in live_sessions:
        if live.get("tool") != profile.get("tool"):
            continue
        l_uuid = _session_uuid(live.get("session_id", ""))
        if p_uuid and l_uuid and p_uuid != l_uuid:
            continue  # a sibling in the same cwd, not this session
        l_start = float(live.get("started_at", 0) or 0)
        if l_start <= 0:
            continue  # no reliable window to compare against
        l_end = float(live.get("last_seen_at") or now)
        l_workspace = live.get("project") or ""
        if (
            p_workspace
            and l_workspace
            and project_key(p_workspace) != project_key(l_workspace)
            and project_key(p_workspace) not in {project_key(w) for w in (live.get("workspaces") or [])}
        ):
            continue
        overlap = min(p_end, l_end) - max(p_start, l_start)
        if overlap / p_duration >= 0.8:
            return live
    return None


def _one_row_per_session(rows: list[dict]) -> list[dict]:
    """Drop extra rows for a session recorded under several ids (in place order).

    A hook row and a correlator ``tool:pid:<uuid>`` row share a UUID, so both
    resolve to one transcript and would each report its full totals. The first
    row stays (a live row keeps its live fields) and takes the transcript's
    numbers if another row has them.
    """
    from ..storage import _USAGE_PROFILE_KEYS, _session_uuid

    kept: dict[str, dict] = {}
    out: list[dict] = []
    for row in rows:
        uuid = _session_uuid(row.get("session_id", ""))
        if uuid is None:
            out.append(row)
            continue
        first = kept.get(uuid)
        if first is None:
            kept[uuid] = row
            out.append(row)
        elif row.get("tokens_source") == "transcript" and first.get("tokens_source") != "transcript":
            first.update({k: row[k] for k in _USAGE_PROFILE_KEYS if k in row})
    return out


def _mark_counted(rows: list[dict], covered_tools: set[str]) -> None:
    """Set ``counted_in_totals`` on rows, so a client summing them can skip views.

    For a tool with transcript coverage only transcript rows count: any other
    row, such as a live ``tool:pid:start`` row, shows the same tokens again.
    """
    for row in rows:
        row["counted_in_totals"] = row.get("tokens_source") == "transcript" or row.get("tool") not in covered_tools


def _kill_session_pids(pids: list[int], sig_name: str) -> dict[str, list[int]]:
    """Send SIGTERM/SIGKILL to the given PIDs and their child trees.

    Skips aictl's own process (defensive — a tracked PID should never be the
    server itself, but a kill on ourselves would take down the very dashboard
    issuing the command). Returns ``{signaled, failed}`` lists of PIDs.
    """
    import os
    import signal as _signal

    # SIGKILL does not exist on Windows; fall back to SIGTERM so the kill
    # endpoint works out of the box there (os.kill on Windows terminates the
    # process via TerminateProcess regardless of the signal value).
    sig = getattr(_signal, "SIGKILL", _signal.SIGTERM) if sig_name == "KILL" else _signal.SIGTERM
    own = os.getpid()
    targets: list[int] = []
    for pid in pids:
        if pid == own:
            continue
        targets.append(pid)
        try:
            import psutil

            for child in psutil.Process(pid).children(recursive=True):
                if child.pid != own:
                    targets.append(child.pid)
        except Exception:
            # psutil missing / process gone / access denied — still attempt
            # the parent below; child discovery is best-effort.
            pass
    signaled: list[int] = []
    failed: list[int] = []
    for pid in dict.fromkeys(targets):  # dedupe, preserve discovery order
        try:
            os.kill(pid, sig)
            signaled.append(pid)
        except OSError:
            failed.append(pid)
    return {"signaled": signaled, "failed": failed}


def _cache_hit_ratio(session: dict) -> float | None:
    """Fraction of prompt tokens served from cache for a session.

    ``cache_read / (input + cache_read)``. Live snapshot dicts use the
    ``exact_*`` token keys; persisted rows use the plain keys. Returns
    ``None`` when no token data is present so the UI can render an
    empty-state rather than a misleading 0.0.
    """
    cache_read = int(session.get("cache_read_tokens", session.get("exact_cache_read_tokens", 0)) or 0)
    input_tokens = int(session.get("input_tokens", session.get("exact_input_tokens", 0)) or 0)
    denom = input_tokens + cache_read
    if denom <= 0:
        return None
    return round(cache_read / denom, 4)


def _db_session_lifecycle_status(row: dict, entity_state: object | None = None) -> tuple[str, bool]:
    """Return (lifecycle_status, active) for a persisted session row."""
    if row.get("ended_at"):
        return "ended", False
    state = getattr(entity_state, "state", "") if entity_state is not None else ""
    if state and state != "inactive":
        return "active", True
    if row.get("source", "") in _IMPORTED_SESSION_SOURCES:
        return "imported", False
    return "open", False


_USAGE_TOKEN_KEYS = ("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens")


# ─── Budget cache ────────────────────────────────────────────────

_budget_cache: tuple[tuple[int, tuple[str, ...] | None], dict] | None = None


# ─── Settings files: every file aictl reads, grouped by location ──

SETTINGS_FILE_KINDS = ("settings", "instructions", "agents", "skills", "prompts", "hooks", "mcp", "memory", "other")
_AUDIT_KINDS = {
    "agent": "agents",
    "skill": "skills",
    "prompt": "prompts",
    "hook": "hooks",
    "instruction": "instructions",
}


def _file_kind(path: str, audit_kind: str = "") -> str:
    """Kind of a file: the audit's kind when it names one, else from the file name."""
    kind = _AUDIT_KINDS.get(audit_kind, audit_kind)
    if kind in SETTINGS_FILE_KINDS:
        return kind
    low = path.replace("\\", "/").lower()
    name = low.rsplit("/", 1)[-1]
    if "mcp" in name:
        return "mcp"
    if "/hooks/" in low or name.startswith("hooks."):
        return "hooks"
    if "/skills/" in low or name == "skill.md":
        return "skills"
    if "/agents/" in low or name.endswith(".agent.md"):
        return "agents"
    if "/prompts/" in low or name.endswith(".prompt.md"):
        return "prompts"
    if "memory" in name:
        return "memory"
    if name.endswith(".md"):
        return "instructions"
    if name.endswith((".json", ".jsonc", ".toml", ".yaml", ".yml")):
        return "settings"
    return "other"


def _tool_home_roots() -> list[str]:
    """Folders that hold a tool's own files, longest first."""
    from .. import platforms, tool_homes

    roots: list[Path] = []
    for fn_name in (
        "claude_global_dir",
        "codex_global_dir",
        "copilot_global_dir",
        "gemini_global_dir",
        "windsurf_global_dir",
        "cursor_user_dir",
    ):
        fn = getattr(platforms, fn_name, None)
        if fn is not None:
            try:
                roots.append(fn())
            except Exception:  # noqa: BLE001 - one unknown home must not hide the others
                continue
    try:
        roots += [h.path for h in tool_homes.homes()]
    except Exception:  # noqa: BLE001
        pass
    out = {os.path.normpath(str(r)) for r in roots}
    return sorted(out, key=len, reverse=True)


def _location(path: str, root: str, home: str, vscode_user: str, tool_roots: list[str]) -> tuple[str, str]:
    """(location, location_root) of a normalized path."""

    def under(folder: str) -> bool:
        return bool(folder) and (path == folder or path.startswith(folder.rstrip(os.sep) + os.sep))

    if under(root):
        return "project", root
    if under(vscode_user):
        return "vscode-user", vscode_user
    for folder in tool_roots:
        if under(folder):
            return "tool-home", folder
    if under(home):
        rel = os.path.relpath(path, home).split(os.sep)
        if len(rel) > 1 and rel[0].startswith("."):
            return "tool-home", os.path.join(home, rel[0])
        return "home", home
    return "other", os.path.dirname(path)


def settings_files(
    root: str | Path,
    tool_configs: list[dict],
    audit_sources: list[dict] | None = None,
    monitor_paths: list[str] | None = None,
) -> dict:
    """Every file aictl reads for the settings view, merged by path.

    Sources are each tool's config files and row sources, the hidden-context
    audit's file rows, and the live monitor's folders (``is_dir``). No file is
    opened: each entry carries only stat facts, its git state and how many
    setting rows read it. A path that cannot be stat'ed has ``exists: false``.
    """
    from ..context_audit import _git_states, _path_key
    from ..monitoring.tool_config import setting_scope

    root_s = os.path.normpath(str(root))
    entries: dict[str, dict] = {}

    def entry(path: str) -> dict | None:
        if not path or not os.path.isabs(os.path.expanduser(path)):
            return None
        norm = os.path.normpath(os.path.expanduser(path))
        key = _path_key(norm)
        if key not in entries:
            entries[key] = {"path": norm, "tools": [], "settings": 0, "audit": None, "is_dir": False}
        return entries[key]

    def add_tool(e: dict, tool: str) -> None:
        if tool and tool not in e["tools"]:
            e["tools"].append(tool)

    for cfg in tool_configs or []:
        tool = str(cfg.get("tool", ""))
        for f in cfg.get("config_files") or []:
            if (e := entry(str(f))) is not None:
                add_tool(e, tool)
        for section in cfg.get("sections") or []:
            for row in section.get("rows") or []:
                if (e := entry(str(row.get("source") or ""))) is not None:
                    add_tool(e, tool)
                    e["settings"] += 1
    for src in audit_sources or []:
        if src.get("scope") == "dynamic" or src.get("readable") is False:
            continue  # a label, not a file
        if (e := entry(str(src.get("path") or ""))) is not None:
            add_tool(e, str(src.get("tool", "")))
            if e["audit"] is None:
                e["audit"] = src
    for folder in monitor_paths or []:
        if (e := entry(str(folder))) is not None:
            e["is_dir"] = True

    home = os.path.normpath(str(Path.home()))
    try:
        from ..platforms import vscode_user_dir

        vscode_user = os.path.normpath(str(vscode_user_dir()))
    except Exception:  # noqa: BLE001
        vscode_user = ""
    tool_roots = _tool_home_roots()

    def in_project(path: str) -> bool:
        return path == root_s or path.startswith(root_s.rstrip(os.sep) + os.sep)

    project_paths = sorted({e["path"] for e in entries.values() if in_project(e["path"])})
    states = _git_states(Path(root_s), project_paths) if project_paths else {}

    files: list[dict] = []
    for e in entries.values():
        path = e["path"]
        audit = e["audit"] or {}
        location, location_root = _location(path, root_s, home, vscode_user, tool_roots)
        try:
            st = os.stat(path)
            exists, size, mtime = True, int(st.st_size), float(st.st_mtime)
        except OSError:
            exists, size, mtime = False, 0, 0.0
        git_state = states.get(path, "outside-repo") if in_project(path) else "outside-repo"
        if git_state == "unknown":
            git_state = ""
        audit_scope = str(audit.get("scope") or "")
        scope = "managed" if audit_scope == "managed" else setting_scope(path, root_s)
        files.append(
            {
                "path": path,
                "name": os.path.basename(path),
                "location": location,
                "location_root": location_root,
                "scope": scope,
                "kind": "other" if e["is_dir"] else _file_kind(path, str(audit.get("kind") or "")),
                "tools": sorted(e["tools"]),
                "settings": e["settings"],
                "bytes": 0 if e["is_dir"] else size,
                "mtime": mtime,
                "git_state": git_state,
                "loading": str(audit.get("loading") or ""),
                "exists": exists,
                "is_dir": e["is_dir"],
            }
        )
    files.sort(key=lambda f: (f["location"], f["location_root"], f["path"]))
    return {"files": files, "generated_at": time.time()}


class _APIHandlersMixin:
    """REST API endpoint handler methods.

    Mixed into _DashboardHandler to keep endpoint logic in a separate module.
    Methods access ``self.server``, ``self._db``, ``self._qs_get``, etc.
    which are defined on the actual handler class.
    """

    def _serve_agent_teams(self) -> None:
        """Return full agent detail for a specific team (lazy-loaded by frontend).

        Usage: GET /api/agent-teams?session_id=<id>
        Without session_id, returns slim summaries for all teams.
        """
        snap = self.server.store.snapshot
        if snap is None or not snap.agent_teams:
            self._json_response([])
            return
        session_id = self._qs_get("session_id")
        if session_id:
            for team in snap.agent_teams:
                if team.get("session_id") == session_id:
                    self._json_response(team)
                    return
            self.send_error(404, "Team not found")
        else:
            self._json_response(_slim_agent_teams(snap.agent_teams))

    def _serve_self_status(self) -> None:
        """Return aictl's own resource usage and DB stats."""
        import os

        result = {}
        try:
            import psutil

            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            # interval=0 returns since last call — non-blocking.
            # CollectorHealth polls every 15s so the measurement window is fine.
            result["pid"] = os.getpid()
            result.update(self_usage(os.getpid()))
            result["memory_vms_bytes"] = mem.vms
            result["threads"] = proc.num_threads()
            result["uptime_s"] = round(time.time() - proc.create_time(), 1)
        except Exception:
            result["pid"] = os.getpid()
        db = self._db
        if db:
            try:
                result["db"] = db.stats()
            except Exception:
                result["db"] = {}
        # Sink stats (emission rates, flood protection)
        sink = getattr(self.server.store, "_sink", None)
        if sink:
            try:
                result["sink"] = sink.stats()
            except Exception:
                result["sink"] = {}
        try:
            result.update(db.storage_status())
        except Exception as exc:  # no DB at all still answers the contract
            result.update(
                capture_mode="off",
                storage_bytes=0,
                storage_budget_bytes=0,
                storage_degraded=True,
                storage_degraded_reason=str(exc),
            )
        self._json_response(result)

    def _serve_settings_files(self) -> None:
        """Every file aictl reads, grouped by location. Never starts an audit scan."""
        from ..monitoring.config import MonitorConfig
        from .audit_cache import AUDIT_CACHE

        root = self.server.root
        snap = self.server.store.snapshot
        tool_configs = list(getattr(snap, "tool_configs", None) or [])
        if not tool_configs:
            from ..monitoring.tool_config import collect_tool_configs

            tool_configs = [c.to_dict() for c in collect_tool_configs(Path(root))]
        audit = AUDIT_CACHE._fresh(AUDIT_CACHE._key(root, None)) or {}
        live = getattr(snap, "live_monitor", None) or {}
        if "workspace_paths" in live or "state_paths" in live:
            folders = [*live.get("workspace_paths", []), *live.get("state_paths", [])]
        else:
            monitor = MonitorConfig.for_root(Path(root))
            folders = [str(p) for p in (*monitor.workspace_paths, *monitor.state_paths)]
        self._json_response(settings_files(root, tool_configs, audit.get("sources") or [], folders))

    def _serve_settings_tools(self) -> None:
        """Every tool's complete settings records, with the knobs no file sets, for the settings screen."""
        from .. import orchestrator

        snap = self.server.store.snapshot
        tool_configs = orchestrator.full_tool_configs() or list(getattr(snap, "tool_configs", None) or [])
        if not tool_configs:
            from ..monitoring.tool_config import collect_tool_configs

            tool_configs = [c.to_dict() for c in collect_tool_configs(Path(self.server.root))]
        tools = []
        for t in getattr(snap, "tools", None) or []:
            tool_id = t.get("tool") if isinstance(t, dict) else getattr(t, "tool", None)
            label = t.get("label") if isinstance(t, dict) else getattr(t, "label", None)
            if tool_id:
                tools.append({"tool": tool_id, "label": label or tool_id})
        live = getattr(snap, "live_monitor", None) or {}
        monitor = {
            "diagnostics": live.get("diagnostics") or {},
            "workspace_paths": list(live.get("workspace_paths") or []),
            "state_paths": list(live.get("state_paths") or []),
        }
        self._json_response({"generated_at": time.time(), "tools": tools, "tool_configs": tool_configs, "monitor": monitor})

    def _tool_name_from_config_path(self) -> str:
        from urllib.parse import unquote

        return unquote(self.path.split("/api/tool-config/", 1)[-1].split("?", 1)[0])

    def _serve_tool_config_get(self) -> None:
        """Return an editable tool config payload; ``?scope=project-local`` picks the local file."""
        from urllib.parse import parse_qs, urlparse

        from .tool_config_editor import ToolConfigEditError, load_editable_tool_config

        scope = (parse_qs(urlparse(self.path).query).get("scope") or [None])[0]
        try:
            payload = load_editable_tool_config(self.server.root, self._tool_name_from_config_path(), scope)
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)
            return
        self._json_response(payload)

    def _serve_tool_config_put(self) -> None:
        """Persist editable tool config fields at the payload's ``scope`` (project by default)."""
        from .tool_config_editor import ToolConfigEditError, save_editable_tool_config

        content_length = self._content_length()
        if content_length is None:
            return
        if content_length > 200_000:
            self.send_error(413, "Payload too large")
            return
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body or b"{}")
        except (json.JSONDecodeError, OSError):
            self._json_response({"error": "Invalid JSON"}, status=400)
            return
        if not isinstance(data, dict):
            self._json_response({"error": "Request body must be a JSON object"}, status=400)
            return
        try:
            payload = save_editable_tool_config(self.server.root, self._tool_name_from_config_path(), data)
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)
            return
        self._json_response(payload)

    def _serve_session_flow(self) -> None:
        """Return conversation-turn-level data for a session.

        Correlates hook events (UserPromptSubmit, PreToolUse, PostToolUse,
        PreCompact, PostCompact) and OTel API request events into an ordered
        list of conversation turns for the session flow waterfall view.

        When no UserPromptSubmit hooks are available, falls back to building
        turns from OTel API request events grouped by time gaps.

        Params: ?session_id=<id>&since=<unix_ts>
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self._json_response({"error": "session_id required", "turns": []})
            return

        db = self._db
        if not db:
            self._json_response({"turns": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 86400 * 7)
        until = self._qs_float("until", time.time())

        result = build_session_flow(db, session_id, since, until)
        self._json_response(result)

    def _serve_board_agent_flow(self) -> None:
        """The session flow of a board agent, from the store with hook and OTel events merged in.

        GET /api/board/agent/flow?id=<agent id>&since=<unix ts>&until=<unix ts>
        A subagent id gives the whole session of its main agent.
        """
        from .board_api import agent_flow

        agent_id = self._qs_get("id")
        if not agent_id:
            self._json_response({"error": "Missing id"}, status=400)
            return
        if not self._db:
            self._json_response({"error": "History is not available"}, status=503)
            return
        try:
            since, until = self._qs_float_opt("since"), self._qs_float_opt("until")
        except ValueError:
            self._json_response({"error": "since and until must be numbers"}, status=400)
            return
        try:
            status, payload = agent_flow(self._db, agent_id, since, until)
        except Exception as exc:  # any failure must reach the tab's error state
            logging.getLogger(__name__).exception("Board agent flow failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response(payload, status=status)

    def _serve_board_agent_transcript(self) -> None:
        """The transcript of a board agent's session, from the store with the live transcript merged in.

        GET /api/board/agent/transcript?id=<agent id>
        """
        from .board_api import agent_transcript

        agent_id = self._qs_get("id")
        if not agent_id:
            self._json_response({"error": "Missing id"}, status=400)
            return
        if not self._db:
            self._json_response({"error": "History is not available"}, status=503)
            return
        analyzer = getattr(self.server, "session_analyzer", None)

        def live(session_id: str) -> dict | None:
            transcript = analyzer.get_transcript(session_id) if analyzer is not None else None
            return transcript.to_dict() if transcript is not None else None

        try:
            status, payload = agent_transcript(self._db, agent_id, legacy_transcript=live)
        except Exception as exc:  # any failure must reach the tab's error state
            logging.getLogger(__name__).exception("Board agent transcript failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response(payload, status=status)

    def _serve_session_memory_diff(self) -> None:
        """Return Claude memory diff between session start and end snapshots.

        GET /api/session-memory-diff?session_id=<id>
        Response: {files: [...], summary: {added, modified, removed}}.
        Returns an empty file list (not an error) if one/both phases
        are missing, so the UI can render an empty-state gracefully.
        """
        from ..memory_snapshot import build_session_memory_diff

        session_id = self._qs_get("session_id")
        if not session_id:
            self._json_response(
                {"error": "session_id required", "files": [], "summary": {"added": 0, "modified": 0, "removed": 0}},
                status=400,
            )
            return
        db = self._db
        if not db:
            self._json_response({"files": [], "summary": {"added": 0, "modified": 0, "removed": 0}})
            return
        try:
            conn = db._conn()  # noqa: SLF001 — read-only per-thread connection
            payload = build_session_memory_diff(conn, session_id)
        except Exception:  # noqa: BLE001 — never 500 the UI
            payload = {"files": [], "summary": {"added": 0, "modified": 0, "removed": 0}}
        self._json_response(payload)

    def _serve_file_writes(self) -> None:
        """Return write-like file events attributed to sessions/tools.

        GET /api/file-writes?session_id=X&path=/tmp/a.py&since=0
        """
        db = self._db
        if not db:
            self._json_response({"writes": [], "count": 0})
            return
        limit = min(int(self._qs_get("limit", "500")), 2000)
        rows = db.query_file_writes(
            session_id=self._qs_get("session_id") or None,
            path=self._qs_get("path") or None,
            tool=self._qs_get("tool") or None,
            since=self._qs_float_opt("since"),
            until=self._qs_float_opt("until"),
            limit=limit,
        )
        self._json_response({"writes": rows, "count": len(rows)})

    def _serve_data_quality(self) -> None:
        """Return current health of collectors, ingesters, and sinks.

        GET /api/data-quality?status=degraded&kind=ingester
        """
        db = self._db
        if not db:
            self._json_response({"items": [], "summary": {}})
            return
        limit = min(int(self._qs_get("limit", "500")), 2000)
        rows = db.query_data_quality(
            status=self._qs_get("status") or None,
            kind=self._qs_get("kind") or None,
            component=self._qs_get("component") or None,
            limit=limit,
        )
        summary = dict(Counter(row.get("status", "") for row in rows))
        self._json_response({"items": rows, "summary": summary})

    def _serve_transcript(self) -> None:
        """Return structured transcript for a single session.

        GET /api/transcript/<session_id>
        Returns the full SessionTranscript (turns, actions, summary).
        """
        from urllib.parse import unquote

        # Extract session_id from path: /api/transcript/<session_id>
        path = self.path.split("?")[0]
        session_id = unquote(path.split("/api/transcript/", 1)[-1])
        if not session_id:
            self._json_response({"error": "session_id required"}, status=400)
            return

        analyzer = self.server.session_analyzer
        transcript = analyzer.get_transcript(session_id)

        if transcript is None:
            # Fall back to building from DB events (for historical sessions)
            db = self._db
            if db:
                since = self._qs_float("since", time.time() - 86400 * 7)
                until = self._qs_float("until", time.time())
                result = build_session_flow(db, session_id, since, until)
                self._json_response(result)
            else:
                self._json_response({"error": "session not found"}, status=404)
            return

        self._json_response(transcript.to_dict())

    def _serve_transcripts(self) -> None:
        """Return list of active session transcripts.

        GET /api/transcripts?cutoff=300
        """
        cutoff = self._qs_float("cutoff", 300)
        analyzer = self.server.session_analyzer
        transcripts = analyzer.get_active_transcripts(cutoff_seconds=cutoff)
        self._json_response(
            {
                "transcripts": [
                    {
                        "session_id": t.session_id,
                        "tool": t.tool,
                        "project": t.project,
                        "model": t.model,
                        "started_at": t.started_at,
                        "is_live": t.is_live,
                        "last_updated": t.last_updated,
                        "turns": len(t.turns),
                        "summary": t.build_summary().to_dict(),
                    }
                    for t in transcripts
                ],
                "count": len(transcripts),
            }
        )

    def _serve_session_messages(self) -> None:
        """Return merged conversation messages for a session.

        GET /api/session-messages?session_id=X&limit=200

        Merges messages derived from OTel events (``otel:user_prompt`` /
        ``otel:user_message`` / ``hook:UserPromptSubmit``) with rows
        ingested from Copilot CLI's ``session-store.db``
        (:class:`aictl.ingesters.copilot_session_store.CopilotSessionStoreIngester`),
        Cursor's ``conversations.db``
        (:class:`aictl.ingesters.cursor_conversations.CursorConversationsIngester`),
        and VS Code Copilot Chat ``chatSessions/*.jsonl`` files
        (:class:`aictl.ingesters.vscode_chat_logs.VSCodeChatLogsIngester`).

        Cross-source duplicates (the same logical message captured by both
        OTel and an ingester) are collapsed within a small time tolerance,
        while messages legitimately repeated within a single source are kept.
        Sorted oldest first. Returns ``{"messages": [...], "sources": {"otel":
        N, "copilot_store": M, "cursor": K, "vscode_chat": V}}``.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        limit = min(int(self._qs_get("limit", "200") or "200"), 2000)
        db = self._db
        if not db:
            self._json_response(
                {
                    "messages": [],
                    "sources": {"otel": 0, "copilot_store": 0, "cursor": 0, "vscode_chat": 0},
                }
            )
            return

        otel_msgs: list[dict] = []
        try:
            events = db.query_events(session_id=session_id, limit=limit * 2)
        except Exception:
            events = []
        for ev in events:
            kind = ev.kind or ""
            is_otel_prompt = kind in ("otel:user_prompt", "otel:user_message") or kind.endswith(
                (".user_prompt", ".user_message")
            )
            if not (is_otel_prompt or kind == "hook:UserPromptSubmit"):
                continue
            detail = ev.detail if isinstance(ev.detail, dict) else {}
            content = (
                detail.get("message")
                or detail.get("content")
                or detail.get("prompt")
                or detail.get("gen_ai.prompt")
                or ""
            )
            if not content:
                continue
            otel_msgs.append(
                {
                    "role": "user",
                    "content": str(content)[:4000],
                    "ts": float(ev.ts or 0),
                    "source": "otel",
                }
            )

        copilot_msgs: list[dict] = []
        try:
            conn = db._conn()
            rows = conn.execute(
                "SELECT role, content, ts FROM copilot_session_messages"
                " WHERE session_id = ? ORDER BY ts ASC, source_row_id ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            for role, content, ts in rows:
                copilot_msgs.append(
                    {
                        "role": str(role or ""),
                        "content": str(content or "")[:4000],
                        "ts": float(ts or 0),
                        "source": "copilot_store",
                    }
                )
        except Exception:
            pass

        cursor_msgs: list[dict] = []
        try:
            conn = db._conn()
            rows = conn.execute(
                "SELECT role, content, ts FROM cursor_session_messages"
                " WHERE session_id = ? ORDER BY ts ASC, source_row_id ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            for role, content, ts in rows:
                cursor_msgs.append(
                    {
                        "role": str(role or ""),
                        "content": str(content or "")[:4000],
                        "ts": float(ts or 0),
                        "source": "cursor",
                    }
                )
        except Exception:
            pass

        vscode_msgs: list[dict] = []
        try:
            conn = db._conn()
            rows = conn.execute(
                "SELECT role, content, ts FROM vscode_chat_messages"
                " WHERE session_id = ? ORDER BY ts ASC, source_row_id ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            for role, content, ts in rows:
                vscode_msgs.append(
                    {
                        "role": str(role or ""),
                        "content": str(content or "")[:4000],
                        "ts": float(ts or 0),
                        "source": "vscode_chat",
                    }
                )
        except Exception:
            pass

        # Merge sources, collapsing only *cross-source* duplicates (the same
        # logical message captured by both OTel and an ingester) while keeping
        # legitimately-repeated messages within a single source.
        #
        # The previous key `(role, content, int(ts))` silently dropped distinct
        # messages that shared role+content within the same wall-clock second
        # (e.g. two identical "continue" turns). Instead we dedup per-source:
        # each source's own rows are always kept; a later source's row is only
        # dropped if an earlier source already contributed a row with the same
        # (role, content) within a small time tolerance that hasn't been
        # matched yet.
        _TS_TOLERANCE = 2.0  # seconds — same message, slightly skewed clocks
        merged: list[dict] = []
        # (role, content) -> list of [ts, matched?] from already-added sources.
        accepted_index: dict[tuple[str, str], list[list]] = {}
        for source_msgs in (otel_msgs, copilot_msgs, cursor_msgs, vscode_msgs):
            for m in source_msgs:
                key = (m["role"], m["content"])
                candidates = accepted_index.get(key, [])
                matched = next(
                    (c for c in candidates if not c[1] and abs(c[0] - m["ts"]) <= _TS_TOLERANCE),
                    None,
                )
                if matched is not None:
                    matched[1] = True  # consume this cross-source duplicate
                    continue
                merged.append(m)
            # Only after a source is fully processed do its rows become
            # dedup anchors for *later* sources — never for its own siblings.
            for m in source_msgs:
                accepted_index.setdefault((m["role"], m["content"]), []).append([m["ts"], False])
        merged.sort(key=lambda m: (m["ts"], m["role"]))
        if len(merged) > limit:
            merged = merged[:limit]

        self._json_response(
            {
                "session_id": session_id,
                "messages": merged,
                "sources": {
                    "otel": len(otel_msgs),
                    "copilot_store": len(copilot_msgs),
                    "cursor": len(cursor_msgs),
                    "vscode_chat": len(vscode_msgs),
                },
            }
        )

    def _serve_otel_status(self) -> None:
        """Return OTel receiver health status."""
        status = self.server.otel_receiver.status()
        self._json_response(status)

    def _serve_ingesters(self) -> None:
        """Return per-ingester poller health (copilot/cursor/vscode).

        Surfaces ``ingester_runner.collect_status`` — last poll time, rows
        inserted on the last poll, and whether the on-disk source exists —
        which was computed but had no caller, so ingester health was
        invisible. Returns ``{"ingesters": [ {name, enabled, source_path,
        source_exists, last_poll_ts, last_poll_inserted}, ... ]}``; an empty
        list when no ingesters are registered.
        """
        from .ingester_runner import collect_status

        handles = getattr(self.server, "ingesters", None)
        self._json_response({"ingesters": collect_status(handles)})

    def _serve_hooks_status(self) -> None:
        """Return installed hook health and recent hook activity."""
        from .hooks_status import collect_hooks_status

        # Pass the serving port so hooks installed against another port are
        # flagged instead of showing as "configured" with 0 events forever.
        try:
            server_port = int(self.server.server_address[1])
        except (AttributeError, IndexError, TypeError, ValueError):
            server_port = None
        self._json_response(collect_hooks_status(self._db, self.server.root, server_port=server_port))

    def _serve_session_mcp_usage(self) -> None:
        """Return per-session MCP server usage.

        GET /api/session-mcp-usage?session_id=X

        Joins ``.vscode/mcp.json`` (and friends) discovered under the
        session's project root with OTel events that touched an MCP
        server during the session. Returns:

        ``{session_id, servers: [{server_name, call_count, first_ts,
        last_ts, total_duration_ms, err_count}], total_calls,
        configured_servers: [name, ...]}``.

        Configured-but-unused servers appear in ``configured_servers``
        only (not in ``servers``); the UI renders them dimmed.
        """
        from ..analysis.mcp_usage import configured_servers, session_mcp_calls

        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._db
        if not db:
            self._json_response(
                {
                    "session_id": session_id,
                    "servers": [],
                    "total_calls": 0,
                    "configured_servers": [],
                }
            )
            return
        servers = session_mcp_calls(db, session_id)
        sess = db.get_session(session_id) or {}
        project_path = sess.get("project_path", "") or ""
        configured = configured_servers(project_path)
        total_calls = sum(int(s.get("call_count", 0)) for s in servers)
        self._json_response(
            {
                "session_id": session_id,
                "servers": servers,
                "total_calls": total_calls,
                "configured_servers": configured,
            }
        )

    def _serve_api_calls(self) -> None:
        """Return API call data from OTel events.

        Queries events for every known api_request / api_error kind
        (Claude Code, Copilot, Codex, and the generic
        ``gen_ai.client.inference.operation.details`` spans) for
        latency/frequency analysis.
        """
        db = self._db
        if not db:
            self._json_response({"calls": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 3600)
        until = self._qs_float("until", time.time())
        limit = min(int(self._qs_get("limit", "500")), 2000)
        session_id = self._qs_get("session_id") or None

        # Resolve filter strategy. For synthesized process-based session
        # ids (e.g. ``copilot-vscode:3716:1776541738``), OTel events carry
        # the tool's own chat/session id and will never match — fall back
        # to tool-scoped querying over the session's active time window.
        filter_session_id: str | None = session_id
        filter_tool: str | None = None
        if session_id and _SYNTHETIC_SESSION_RE.match(session_id):
            sess = db.get_session(session_id)
            if sess:
                filter_session_id = None
                filter_tool = sess.get("tool") or None
                started = float(sess.get("started_at") or 0)
                ended = sess.get("ended_at")
                if started and started > since:
                    since = started
                if ended is not None:
                    try:
                        until = min(until, float(ended))
                    except (TypeError, ValueError):
                        pass

        # Query API request events across all known kinds
        api_events = []
        for name in API_REQUEST_EVENTS:
            api_events.extend(
                db.query_events(
                    since=since,
                    until=until,
                    kind=f"otel:{name}",
                    tool=filter_tool,
                    session_id=filter_session_id,
                    limit=limit,
                )
            )
        error_events = []
        for name in API_ERROR_EVENTS:
            error_events.extend(
                db.query_events(
                    since=since,
                    until=until,
                    kind=f"otel:{name}",
                    tool=filter_tool,
                    session_id=filter_session_id,
                    limit=limit,
                )
            )

        def _enrich(d: dict, is_error: bool) -> dict:
            extra: dict = {}
            # finish_reason: prefer OTel list `gen_ai.response.finish_reasons`,
            # fall back to legacy scalar keys.
            reasons = d.get("gen_ai.response.finish_reasons")
            fr = None
            if isinstance(reasons, list) and reasons:
                fr = reasons[0]
            elif isinstance(reasons, str) and reasons:
                fr = reasons
            if not fr:
                fr = d.get("finish_reason") or d.get("stop_reason")
            if fr:
                extra["finish_reason"] = str(fr)
            # http_status: accept OTel `http.status_code` and newer
            # `http.response.status_code`, plus legacy keys. Coerce to int.
            hs = (
                d.get("http.status_code")
                or d.get("http.response.status_code")
                or d.get("http_status")
                or d.get("status_code")
            )
            if hs is not None and hs != "":
                try:
                    extra["http_status"] = int(hs)
                except (TypeError, ValueError):
                    pass
            # error_type: prefer OTel `error.type`, fall back to legacy keys.
            # Only fall back to bare `type` on error events (too generic on
            # api_request).
            et = d.get("error.type") or d.get("error_type")
            if not et and is_error:
                et = d.get("type")
            if et:
                extra["error_type"] = str(et)
            return extra

        def _model(d: dict) -> str:
            # OTel GenAI semconv uses namespaced keys; legacy emitters use `model`.
            return str(d.get("gen_ai.response.model") or d.get("gen_ai.request.model") or d.get("model") or "")

        calls = []
        for ev in api_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            usage = TokenUsage.from_dict(d)
            calls.append(
                {
                    "ts": ev.ts,
                    "tool": ev.tool or d.get("tool", ""),
                    "session_id": ev.session_id or d.get("session_id", ""),
                    "pid": ev.pid or int(d.get("pid", 0) or 0),
                    "model": _model(d),
                    "duration_ms": _num(d.get("duration_ms", d.get("duration", 0))),
                    "input_tokens": usage.input,
                    "output_tokens": usage.output,
                    "cache_read_tokens": usage.cache_read,
                    "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                    "status": "ok",
                    **_enrich(d, is_error=False),
                }
            )
        for ev in error_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            calls.append(
                {
                    "ts": ev.ts,
                    "tool": ev.tool or d.get("tool", ""),
                    "session_id": ev.session_id or d.get("session_id", ""),
                    "pid": ev.pid or int(d.get("pid", 0) or 0),
                    "model": _model(d),
                    "error": d.get("error", d.get("message", "unknown")),
                    "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                    "status": "error",
                    **_enrich(d, is_error=True),
                }
            )
        calls.sort(key=lambda c: c["ts"], reverse=True)

        # Build summary
        ok_calls = [c for c in calls if c["status"] == "ok"]
        durations = [c["duration_ms"] for c in ok_calls if c.get("duration_ms")]
        models = Counter(c.get("model", "unknown") for c in ok_calls)

        summary = {
            "total_calls": len(ok_calls),
            "total_errors": len(calls) - len(ok_calls),
            "avg_latency_ms": round(sum(durations) / len(durations), 1) if durations else 0,
            "p95_latency_ms": round(sorted(durations)[int(len(durations) * 0.95)] if durations else 0, 1),
            "by_model": models,
        }

        self._json_response({"calls": calls[:limit], "summary": summary})

    def _serve_budget(self) -> None:
        global _budget_cache
        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return
        version = self.server.store.version
        selection = self._qs_tools()
        key = (version, selection)
        if _budget_cache is None or _budget_cache[0] != key:
            _budget_cache = (key, compute_token_budget(budget_tools(snap.tools, selection), snap.root))
        budget = {**_budget_cache[1], "selection": selection_block(selection)}
        self._json_response(budget, indent=2)

    def _serve_history(self) -> None:
        """Serve time-series history.

        Without ?range or ?since, returns in-memory ring buffer (fast, ~35 min).
        With ?range=1h|6h|24h|7d, queries SQLite for longer history.
        With ?since=<ts>[&until=<ts>][&tool=<name>], queries SQLite for custom range.
        """
        import json

        range_str = self._qs_get("range")
        since_str = self._qs_get("since")
        tool_filter = self._qs_get("tool")

        use_db = (range_str or since_str) and self._db
        if use_db:
            import time as _time

            if since_str:
                since = float(since_str)
            else:
                range_map = {"1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800}
                secs = range_map.get(range_str, 3600)
                since = _time.time() - secs
            until = self._qs_float_opt("until")
            data = self._db.query_metrics(since=since, until=until)
            tool_data = self._db.query_tool_metrics(tool=tool_filter, since=since, until=until)
            data["by_tool"] = tool_history_for_api(tool_data)
            body = json.dumps(data).encode("utf-8")
        else:
            body = self.server.store.history_json().encode("utf-8")

        self._json_response_raw(body)

    def _serve_samples(self) -> None:
        """Serve universal samples.

        Params: ?metric=X&prefix=X&since=<ts>&tag.tool=X&limit=N
        Or: ?list=1&prefix=X  to list distinct metric names.
        Or: ?series=X&since=<ts>  to get a single metric as time-series.
        """
        db = self._require_db()
        if not db:
            return

        qs = self._qs
        # Mode: list metrics
        if "list" in qs:
            prefix = self._qs_get("prefix", "")
            result = db.list_metrics(prefix=prefix)
        # Mode: single metric series
        elif "series" in qs:
            metric = qs["series"][0]
            since = self._qs_float("since", time.time() - 3600)
            result = db.query_samples_series(metric, since=since)
        # Mode: query samples
        else:
            metric = self._qs_get("metric")
            prefix = self._qs_get("prefix")
            since = self._qs_float("since", time.time() - 3600)
            limit = int(self._qs_get("limit", "1000"))
            # Extract tag filters from tag.X=Y params
            tag_filter = {k[4:]: v[0] for k, v in qs.items() if k.startswith("tag.")}
            try:
                rows = db.query_samples(
                    metric=metric,
                    metric_prefix=prefix,
                    since=since,
                    tag_filter=tag_filter or None,
                    limit=limit,
                )
            except ValueError as exc:
                self._json_response({"error": str(exc)}, status=400)
                return
            result = [{"ts": s.ts, "metric": s.metric, "value": s.value, "tags": s.tags} for s in rows]

        self._json_response(result)

    def _serve_usage(self) -> None:
        """Headline usage per tool and local day, with provenance.

        Params: ?since=<unix_ts>&until=<unix_ts>, or ?days=<N> (default 7).
        See :func:`aictl.dashboard.analytics.compute_usage_summary`.
        """
        db = self._require_db()
        if not db:
            return
        days = self._qs_float("days", 7.0)
        since = self._qs_float("since", time.time() - days * 86400)
        self._json_response(compute_usage_summary(db, since, self._qs_float_opt("until")))

    def _serve_project_costs(self) -> None:
        """Serve per-project cumulative token/cost data.

        Params: ?since=<unix_ts>&until=<unix_ts>&days=<N>
        Returns: [{project, sessions, input_tokens, output_tokens,
                   cache_read_tokens, cache_creation_tokens, total_tokens,
                   cost_usd, cost_quality, cost_reason, unpriced_models,
                   tokens_source, tokens_quality, pricing_models,
                   daily: [{date, input_tokens, output_tokens, ...}]}]

        ``daily`` buckets by the local day. ``window`` says how the range was
        applied: figures are stored per local day, so a session day wholly outside
        ``since``..``until`` is left out and one the edge cuts through counts
        whole (``approximate``). ``cost_usd`` is ``None`` when no
        session in the project could be priced. ``total_tokens`` counts every
        class; it used to leave out cache reads and writes, which are most of
        the tokens a coding agent uses.
        """
        days = int(self._qs_get("days", "7"))
        since = self._qs_float("since", time.time() - days * 86400)
        until = self._qs_float_opt("until")

        sessions: list[dict] = []
        db = self._db
        seen: set[str] = set()
        covered_tools: set[str] = set()
        if db:
            sessions, _ = window_sessions(db, since, until)
            for s in sessions:
                seen.add(s["session_id"])
                if s["tokens_source"] == "transcript":
                    covered_tools.add(s["tool"])

        def add_unmatched(row: dict, ts: float) -> None:
            prov = row_provenance(row)
            tokens = {k: int(row.get(k) or 0) for k in _USAGE_TOKEN_KEYS}
            sessions.append(
                {
                    **tokens,
                    "tool": row.get("tool", ""),
                    "project": row.get("project_path") or "",
                    "model": row.get("model") or "",
                    "billing_unit": prov["billing_unit"],
                    "cost_usd": prov["cost_usd"],
                    "cost_quality": prov["cost_quality"],
                    "cost_reason": prov["cost_reason"],
                    "unpriced_models": prov["unpriced_models"],
                    "tokens_source": prov["tokens_source"],
                    "tokens_quality": prov["tokens_quality"],
                    "daily": {local_day(ts): {**tokens}},
                }
            )

        # Live sessions no stored row accounts for yet. A tool with transcript
        # coverage is skipped: its live row is a view of the same tokens.
        snap = self.server.store.snapshot
        for s in (snap.sessions if snap is not None else None) or []:
            if s.get("tool") in covered_tools or s.get("session_id") in seen:
                continue
            if until is not None and (s.get("started_at") or 0) > until:
                continue
            if not (s.get("exact_input_tokens") or s.get("exact_output_tokens")):
                continue
            add_unmatched(
                {
                    "tool": s.get("tool", ""),
                    "project_path": s.get("project"),
                    "model": s.get("model"),
                    "source": "otel",
                    "input_tokens": s.get("exact_input_tokens"),
                    "output_tokens": s.get("exact_output_tokens"),
                    "cache_read_tokens": s.get("exact_cache_read_tokens"),
                },
                time.time(),
            )

        # Older sessions that only ever produced a session_end event.
        if db:
            for ev in db.query_events(since=since, until=until, kind="session_end", limit=5000):
                detail = ev.detail or {}
                if detail.get("session_id") and detail["session_id"] in seen:
                    continue
                if ev.tool in covered_tools:
                    continue
                add_unmatched(
                    {
                        "tool": ev.tool,
                        "project_path": detail.get("project"),
                        "model": detail.get("model"),
                        "source": "event",
                        "input_tokens": detail.get("input_tokens"),
                        "output_tokens": detail.get("output_tokens"),
                        "cache_read_tokens": detail.get("cache_read_tokens"),
                        "cache_creation_tokens": detail.get("cache_creation_tokens"),
                        "cost_usd": detail.get("cost_usd"),
                    },
                    ev.ts,
                )

        # Grouped by comparison key so spellings of one path stay one row.
        by_project: dict[str, list[dict]] = {}
        for s in sessions:
            by_project.setdefault(project_key(s["project"]) or "(unknown)", []).append(s)

        result = []
        for key, group in by_project.items():
            proj = decode_file_uri(next((s["project"] for s in group if s["project"]), "")) or key
            tokens = {k: sum(s[k] for s in group) for k in _USAGE_TOKEN_KEYS}
            priced = [s["cost_usd"] for s in group if s["cost_usd"] is not None]
            daily: dict[str, dict] = {}
            for s in group:
                for date, v in s["daily"].items():
                    d = daily.setdefault(date, dict.fromkeys(_USAGE_TOKEN_KEYS, 0))
                    for k in _USAGE_TOKEN_KEYS:
                        d[k] += int(v.get(k) or 0)
            pricing_models = {resolve_pricing(s["model"])[0] for s in group} - {None}
            approximate = sum(len(s.get("approximate_days") or ()) for s in group)
            result.append(
                {
                    "project": proj,
                    "window": {"granularity": "day", "approximate": approximate > 0, "approximate_session_days": approximate},
                    "sessions": len(group),
                    **tokens,
                    "total_tokens": sum(tokens.values()),
                    "cost_usd": round(sum(priced), 2) if priced else None,
                    "cost_quality": combine_cost_quality({s["cost_quality"] for s in group}),
                    "cost_reason": next((s["cost_reason"] for s in group if s["unpriced_models"]), group[0]["cost_reason"]),
                    "unpriced_models": sorted({m for s in group for m in s["unpriced_models"]}),
                    "tokens_source": sorted({s["tokens_source"] for s in group}),
                    "tokens_quality": combine_tokens_quality({s["tokens_quality"] for s in group}),
                    "billing_unit": "ai_credits" if any(s.get("billing_unit") for s in group) else "",
                    "billing_amount": (sum(s.get("billing_amount") or 0.0 for s in group) or None),
                    "premium_requests": (sum(s.get("premium_requests") or 0.0 for s in group) or None),
                    "estimated_list_usd": (sum(s.get("estimated_list_usd") or 0.0 for s in group) or None),
                    "pricing_models": sorted(pricing_models),
                    "daily": [
                        {"date": d, **v, "partial": _day_is_partial(d, since, until or time.time(), time.time())}
                        for d, v in sorted(daily.items())
                    ],
                }
            )
        result.sort(key=lambda r: r["total_tokens"], reverse=True)
        self._json_response(result)

    def _serve_session_runs(self) -> None:
        """Serve historical session runs grouped by project+tool for trend analysis.

        Params: ?project=<path>&tool=<name>&days=<N>&limit=<N>
        Returns: [{session_id, ts, project, tool, duration_s, input_tokens,
                   output_tokens, total_tokens}] sorted by ts desc.
        Enables run-over-run comparison for scheduled/recurring sessions.
        """
        project = self._qs_get("project")
        tool = self._qs_get("tool")
        days = int(self._qs_get("days", "30"))
        limit = int(self._qs_get("limit", "50"))
        since = time.time() - days * 86400

        runs = []
        db = self._db
        if db:
            seen_session_ids: set[str] = set()
            rows = _one_row_per_session(db.query_sessions(since=0, tool=tool or None, active=False, limit=5000))
            for row in rows:
                ended_at = float(row.get("ended_at", 0) or 0)
                if ended_at < since:
                    continue
                ev_project = row.get("project_path") or ""
                if project and ev_project != project:
                    continue
                started_at = float(row.get("started_at", 0) or 0)
                in_tok = int(row.get("input_tokens", 0) or 0)
                out_tok = int(row.get("output_tokens", 0) or 0)
                sid = row.get("session_id", "")
                runs.append(
                    {
                        "session_id": sid,
                        "ts": ended_at,
                        "project": ev_project,
                        "tool": row.get("tool", ""),
                        "duration_s": round(ended_at - started_at, 1) if started_at else 0,
                        "input_tokens": in_tok,
                        "output_tokens": out_tok,
                        "cache_read_tokens": int(row.get("cache_read_tokens", 0) or 0),
                        "cache_creation_tokens": int(row.get("cache_creation_tokens", 0) or 0),
                        "total_tokens": in_tok + out_tok,
                        "cost_usd": row.get("cost_usd"),
                        "cost_quality": row.get("cost_quality"),
                        "tokens_source": row.get("tokens_source"),
                        "tokens_quality": row.get("tokens_quality"),
                        "file_churn": int(row.get("files_modified", 0) or 0),
                    }
                )
                if sid:
                    seen_session_ids.add(sid)

            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                sid = detail.get("session_id", "")
                if sid in seen_session_ids:
                    continue
                ev_project = detail.get("project") or ""
                if project and ev_project != project:
                    continue
                if tool and ev.tool != tool:
                    continue
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                runs.append(
                    {
                        "session_id": sid,
                        "ts": ev.ts,
                        "project": ev_project,
                        "tool": ev.tool,
                        "duration_s": detail.get("duration_s") or 0,
                        "input_tokens": in_tok,
                        "output_tokens": out_tok,
                        "total_tokens": in_tok + out_tok,
                        "file_churn": 0,
                    }
                )
        # Sort by timestamp descending (most recent first), apply limit
        runs.sort(key=lambda r: r["ts"], reverse=True)
        runs = runs[:limit]

        # Enrich legacy event-only rows with file_churn from sessions table.
        if db and runs:
            sids = [r["session_id"] for r in runs if r["session_id"] and r["file_churn"] == 0]
            if sids:
                try:
                    conn = db._conn()
                    placeholders = ",".join("?" for _ in sids)
                    cur = conn.execute(
                        f"SELECT session_id, files_modified FROM sessions WHERE session_id IN ({placeholders})",
                        sids,
                    )
                    churn_by_sid = {row[0]: int(row[1] or 0) for row in cur.fetchall()}
                    for r in runs:
                        # Only fill rows that were missing churn (file_churn == 0).
                        # Overwriting every run with ``.get(sid, 0)`` would reset
                        # already-correct values to 0 for sessions not in the
                        # zero-churn re-query.
                        if r["file_churn"] == 0 and r["session_id"] in churn_by_sid:
                            r["file_churn"] = churn_by_sid[r["session_id"]]
                except Exception:
                    pass

        self._json_response(runs)

    # ── Analytics endpoint ─────────────────────────────────────────

    def _serve_analytics(self) -> None:
        """Serve pre-computed analytics from the background cache.

        Zero SQL on the request path — the background thread recomputes
        every 15 seconds.  Response time: <1ms.

        Params: ?since=<ts>&until=<ts>&tools=<id>,<id>
        ``tools`` absent is every tool, ``tools=`` is none. The response names the
        selection it covers (``selection``), and is ``{"pending": true}`` until
        that exact range and selection has been computed.
        """
        result = self.server.analytics_cache.get(
            self._qs_float_opt("since"), self._qs_float_opt("until"), self._qs_tools()
        )
        self._json_response(result)

    def _serve_events(self) -> None:
        """Serve recent events from SQLite.

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>&limit=<n>
        """
        events_list = []
        db = self._db
        if db:
            since = self._qs_float("since", time.time() - 3600)
            until = self._qs_float_opt("until")
            tool = self._qs_get("tool")
            kind = self._qs_get("kind")
            session_id = self._qs_get("session_id")
            limit = int(self._qs_get("limit", "200"))
            rows = db.query_events(since=since, until=until, tool=tool, kind=kind, session_id=session_id, limit=limit)
            events_list = [dataclasses.asdict(r) for r in rows]

        self._json_response(events_list)

    def _serve_events_count(self) -> None:
        """Serve the true number of events for the filters of ``/api/events`` (no limit).

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>
        Returns ``{count: int}``; ``count`` is ``null`` when there is no store.
        """
        db = self._db
        if not db:
            self._json_response({"count": None})
            return
        count = db.count_events(
            since=self._qs_float("since", time.time() - 3600),
            until=self._qs_float_opt("until"),
            tool=self._qs_get("tool"),
            kind=self._qs_get("kind"),
            session_id=self._qs_get("session_id"),
        )
        self._json_response({"count": count})

    def _serve_datapoint_catalog(self) -> None:
        """Serve the datapoint catalog.

        Params: ?tab=<tab>&key=<key>&source_type=<raw|deduced|aggregated>
        """
        tab = self._qs_get("tab")
        key = self._qs_get("key")
        source_type = self._qs_get("source_type")

        entries = []
        db = self._db
        if db:
            entries = db.query_datapoint_catalog(tab=tab, key=key, source_type=source_type)

        self._json_response(entries)

    def _serve_session_cost_by_model(self) -> None:
        """Serve a session's cost/token breakdown grouped by model.

        Params: ?session_id=X (required)
        Returns ``{session_id, models: [{model, requests, input_tokens,
        output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd}],
        totals: {...}}``. Surfaces the per-model attribution that the
        session-level ``cost_usd`` aggregate hides.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        models = db.query_session_cost_by_model(session_id)
        totals = {
            "requests": sum(int(m.get("requests", 0)) for m in models),
            "input_tokens": sum(int(m.get("input_tokens", 0)) for m in models),
            "output_tokens": sum(int(m.get("output_tokens", 0)) for m in models),
            "cache_read_tokens": sum(int(m.get("cache_read_tokens", 0)) for m in models),
            "cache_creation_tokens": sum(int(m.get("cache_creation_tokens", 0)) for m in models),
            "cost_usd": round(sum(float(m.get("cost_usd") or 0.0) for m in models), 6),
            "unpriced_models": sorted(m["model"] for m in models if m.get("cost_usd") is None),
        }
        self._json_response({"session_id": session_id, "models": models, "totals": totals})

    def _serve_session_processes(self) -> None:
        """Serve the persisted process genealogy for a session.

        Params: ?session_id=X (required)
        Returns ``{session_id, processes: [{pid, tool, role, joined_at}]}``.
        Unlike ``/api/session-subprocesses`` (live-snapshot counts only),
        this reads the persisted ``session_processes`` table so the process
        tree survives after a session ends.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        processes = db.get_session_processes(session_id)
        roles = Counter(str(p.get("role", "") or "unknown") for p in processes)
        self._json_response(
            {
                "session_id": session_id,
                "total": len(processes),
                "by_role": dict(roles),
                "processes": processes,
            }
        )

    def _serve_session_tool_calls(self) -> None:
        """Serve the per-session tool-invocation timeline.

        Params: ?session_id=X (required) &limit=N
        Returns ``{session_id, total, errors, by_tool: {name: count},
        calls: [{ts, tool_name, duration_ms, is_error, result_summary,
        input, input_truncated}]}``. ``input`` is the stored invocation
        payload (the actual Bash command line / file path), truncated
        server-side to ``_INPUT_MAX_CHARS`` with ``input_truncated: true``
        when clipped. Surfaces the ``tool_invocations`` table (incl. its
        ``input`` column) which was previously captured but never exposed
        per session.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        limit = min(int(self._qs_get("limit", "500")), 2000)
        rows = db.query_tool_invocations(session_id=session_id, limit=limit)
        calls = []
        for r in rows:
            raw_input = r.get("input")
            input_str = raw_input if isinstance(raw_input, str) else (json.dumps(raw_input) if raw_input else "")
            truncated = len(input_str) > _INPUT_MAX_CHARS
            calls.append(
                {
                    "ts": float(r.get("ts", 0.0) or 0.0),
                    "tool_name": r.get("tool_name", "") or r.get("tool", ""),
                    "duration_ms": float(r.get("duration_ms", 0.0) or 0.0),
                    "is_error": bool(r.get("is_error", 0)),
                    "result_summary": r.get("result_summary", ""),
                    "input": input_str[:_INPUT_MAX_CHARS],
                    "input_truncated": truncated,
                }
            )
        totals = db.session_tool_invocation_totals(session_id)
        self._json_response(
            {
                "session_id": session_id,
                "total": totals["total"],
                "errors": totals["errors"],
                "by_tool": totals["by_tool"],
                "returned": len(calls),
                "calls": calls,
            }
        )

    def _serve_session_kill(self) -> None:
        """Signal a live session's tracked process tree (control action).

        POST body: ``{session_id: str (required), confirm: true (required),
        signal: "TERM"|"KILL" (default TERM)}``. Sends the signal to every PID
        the correlator has linked to the session plus their children, refusing
        to touch aictl's own process. The action is audited via an ``EventRow``
        so it surfaces in the session's action timeline.

        ``confirm:true`` is mandatory so an accidental/replayed request can't
        tear down a session — the destructive intent must be explicit.
        """
        from ..storage import EventRow

        content_length = self._content_length()
        if content_length is None:
            return
        if content_length > 100_000:
            self.send_error(413, "Payload too large")
            return
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body or b"{}")
        except (json.JSONDecodeError, OSError):
            self._json_response({"error": "Invalid JSON"}, status=400)
            return
        if not isinstance(data, dict):
            self._json_response({"error": "Request body must be a JSON object"}, status=400)
            return

        session_id = str(data.get("session_id", "") or "")
        if not session_id:
            self._json_response({"error": "Missing session_id"}, status=400)
            return
        if not data.get("confirm"):
            self._json_response({"error": "Kill requires confirm:true"}, status=400)
            return
        sig_name = str(data.get("signal", "TERM") or "TERM").upper()
        if sig_name.startswith("SIG"):
            sig_name = sig_name[3:]
        if sig_name not in ("TERM", "KILL"):
            self._json_response({"error": "signal must be TERM or KILL"}, status=400)
            return

        snap = self.server.store.snapshot
        if snap is None:
            self._json_response({"error": "No live session data"}, status=503)
            return
        session = next((s for s in snap.sessions if s.get("session_id") == session_id), None)
        if session is not None:
            pids = [int(p) for p in (session.get("pids") or []) if int(p) > 0]
        else:
            # The dashboard names an agent by its stored id, not by the monitor's.
            from .board_api import live_pids_of

            pids = live_pids_of(self._db, snap, session_id) if self._db else []
            session = {"tool": ""}
            if not pids:
                self._json_response({"error": "This agent has no running process"}, status=404)
                return
        if not pids:
            self._json_response({"error": "Session has no tracked PIDs"}, status=409)
            return

        result = _kill_session_pids(pids, sig_name)
        db = self._db
        if db:
            try:
                db.append_event(
                    EventRow(
                        ts=time.time(),
                        tool=str(session.get("tool", "")),
                        kind="action:session_kill",
                        detail={
                            "session_id": session_id,
                            "signal": "SIG" + sig_name,
                            "signaled": result["signaled"],
                            "failed": result["failed"],
                        },
                        session_id=session_id,
                    )
                )
            except Exception:
                # Audit logging must never block the control action itself.
                pass
        # A stop that reached no process is a failure, whatever the reason.
        status = 200 if result["signaled"] else 409
        payload = {"session_id": session_id, "signal": "SIG" + sig_name, **result}
        if not result["signaled"]:
            payload["error"] = f"No process could be stopped. Tried {len(result['failed'])}."
        self._json_response(payload, status=status)

    def _serve_sessions(self) -> None:
        """Serve active and historical sessions.

        Params: ?tool=X&active=true&since=<ts>&until=<ts>&limit=N

        ``since``/``until`` select sessions by their start time. Each row carries
        the session's own totals, which are not cut to the window.

        Queries both the live snapshot (for active sessions) and the sessions
        table (for historical/ended sessions).
        """
        tool = self._qs_get("tool")
        active_only = (self._qs_get("active", "")).lower() == "true"
        limit = int(self._qs_get("limit", "100"))
        until = self._qs_float_opt("until")

        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return

        # Active sessions from live snapshot
        sessions = list(snap.sessions)
        if until is not None:
            sessions = [s for s in sessions if (s.get("started_at") or 0) <= until]
        for s in sessions:
            s.setdefault("active", True)
            s.setdefault("lifecycle_status", "active")

        # Filter by tool
        if tool:
            sessions = [s for s in sessions if s.get("tool") == tool]

        # If not active_only, also include historical sessions
        if not active_only:
            db = self._db
            if db:
                since = self._qs_float("since", time.time() - 86400)
                active_ids = {s.get("session_id") for s in sessions}

                # Query sessions table (v20)
                db_sessions = db.query_sessions(
                    since=since,
                    until=until,
                    tool=tool or None,
                    active=None,
                    limit=limit,
                )
                for s in db_sessions:
                    sid = s.get("session_id", "")
                    if sid and sid not in active_ids:
                        entity = self.server.entity_tracker.get_session_state(sid)
                        lifecycle_status, active = _db_session_lifecycle_status(s, entity)
                        sessions.append(
                            {
                                "session_id": sid,
                                "tool": s.get("tool", ""),
                                "pid": s.get("pid", 0),
                                "started_at": s.get("started_at"),
                                "ended_at": s.get("ended_at"),
                                "duration_s": (
                                    round(s["ended_at"] - s["started_at"], 1)
                                    if s.get("ended_at") and s.get("started_at")
                                    else None
                                ),
                                "active": active,
                                "lifecycle_status": lifecycle_status,
                                "source": s.get("source", ""),
                                "model": s.get("model", ""),
                                "input_tokens": s.get("input_tokens", 0),
                                "output_tokens": s.get("output_tokens", 0),
                                "cache_read_tokens": s.get("cache_read_tokens", 0),
                                "cache_creation_tokens": s.get("cache_creation_tokens", 0),
                                "cost_usd": s.get("cost_usd"),
                                "cost_source": s.get("cost_source"),
                                "cost_quality": s.get("cost_quality"),
                                "cost_reason": s.get("cost_reason"),
                                "unpriced_models": s.get("unpriced_models") or [],
                                "billing_unit": s.get("billing_unit") or "",
                                "billing_amount": s.get("billing_amount"),
                                "premium_requests": s.get("premium_requests"),
                                "estimated_list_usd": s.get("estimated_list_usd"),
                                "tokens_source": s.get("tokens_source"),
                                "tokens_quality": s.get("tokens_quality"),
                                "tokens_reason": s.get("tokens_reason"),
                                "request_count": s.get("request_count", 0),
                                "tool_call_count": s.get("tool_call_count", 0),
                                "turn_count": s.get("turn_count", 0),
                                "context_window": context_window_for(s.get("model")),
                                "project": s.get("project_path", ""),
                                "git_branch": s.get("git_branch", ""),
                                "git_commit": s.get("git_commit", ""),
                                "commit_count": db.count_session_commits(sid),
                            }
                        )
                        active_ids.add(sid)

                # Also fall back to event-based reconstruction for sessions
                # not yet in the sessions table
                ended = db.query_events(since=since, until=until, kind="session_end", limit=limit)
                for ev in ended:
                    d = ev.detail if isinstance(ev.detail, dict) else {}
                    sid = d.get("session_id", "")
                    if sid and sid not in active_ids:
                        sessions.append(
                            {
                                "session_id": sid,
                                "tool": ev.tool,
                                "ended_at": ev.ts,
                                "duration_s": d.get("duration_s", 0),
                                "active": False,
                                "lifecycle_status": "ended",
                            }
                        )
                        active_ids.add(sid)

        # Mark active sessions
        for s in sessions:
            if "active" not in s:
                s["active"] = True
            if "lifecycle_status" not in s:
                s["lifecycle_status"] = "active" if s["active"] else "open"
            if "commit_count" not in s:
                sid = s.get("session_id", "")
                s["commit_count"] = self._db.count_session_commits(sid) if (self._db and sid) else 0
            s["cache_hit_ratio"] = _cache_hit_ratio(s)

        sessions = _one_row_per_session(sessions)
        covered: set[str] = set()
        if self._db:
            covered = {
                u["tool"]
                for u in self._db.query_session_usage(active_since=self._qs_float("since", time.time() - 86400), active_until=until)
            }
        _mark_counted(sessions, covered)
        sessions = sessions[:limit]
        retention_db = self._db
        for s in sessions:
            s["content_retained"] = bool(retention_db and retention_db.content_retained(s))
        self._json_response(sessions)

    def _serve_session_stats(self) -> None:
        """Serve deduced session metrics from entity state + JSONL enrichment.

        Params: ?session_id=X (optional — omit for all sessions)
        Returns per-session deduced stats: tool calls, skill calls, prompt
        count, tool call rate, agent stats with token/tool breakdown.
        """
        session_id = self._qs_get("session_id")
        tracker = self.server.entity_tracker
        snap = self.server.store.snapshot

        # Enrich agent states with JSONL data when available
        if snap and snap.agent_teams:
            tracker.enrich_from_agent_teams(snap.agent_teams)

        if session_id:
            sess = tracker.get_session_state(session_id)
            if not sess:
                self._json_response({"error": "session not found"})
                return
            out = sess.to_dict()
            # Enrich with VS Code Language-Model usage (Slice 3.4c): a
            # per-extension token breakdown derived from OTel events. Empty
            # when no LM-usage events exist for the session.
            db = self._db
            if db:
                try:
                    from ..analysis.lm_usage import session_lm_usage

                    lm = session_lm_usage(db, session_id)
                    if lm.get("total_calls", 0) or lm.get("by_extension"):
                        out["vscode_lm_usage"] = lm
                except Exception:
                    pass
            self._json_response(out)
        else:
            # All sessions with deduced metrics
            result = tracker.all_sessions()
            # Add global aggregates
            totals = {
                "total_tool_calls": sum(s.get("tool_calls", 0) for s in result),
                "total_skill_calls": sum(s.get("skill_calls", 0) for s in result),
                "total_prompts": sum(s.get("prompt_count", 0) for s in result),
                "sessions": result,
            }
            self._json_response(totals)

    def _serve_session_subprocesses(self) -> None:
        """Serve the per-session subprocess breakdown.

        Params: ?session_id=X (required)
        Returns {session_id, total, counts: [{name, count}], recent:
        [{ts, name}]}. Subprocess data lives in the live snapshot only
        (not persisted); an unknown session yields empty arrays rather
        than a 404 so the UI can render an empty-state.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return

        snap = self.server.store.snapshot
        sess = None
        if snap is not None:
            for s in snap.sessions:
                if s.get("session_id") == session_id:
                    sess = s
                    break

        counts_map = (sess or {}).get("subprocess_count") or {}
        recent = (sess or {}).get("recent_subprocesses") or []
        counts = [
            {"name": name, "count": n} for name, n in sorted(counts_map.items(), key=lambda kv: kv[1], reverse=True)
        ]
        self._json_response(
            {
                "session_id": session_id,
                "total": sum(counts_map.values()),
                "counts": counts,
                "recent": list(recent),
            }
        )

    def _serve_session_commits(self) -> None:
        """Serve the git commits attributed to a session's time window.

        Params: ?session_id=X (required)
        Returns ``{session_id, commits: [{sha, short_sha, author_name,
        author_email, ts, subject, current_branch_match}], branch}``.

        On first request for an ended session with no cached rows we
        compute the attribution lazily and persist it.
        """
        from ..analysis.git_attribution import attribute_session, is_reachable

        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        sess = db.get_session(session_id) or {}
        project_dir = sess.get("project_path", "") or ""
        branch = sess.get("git_branch", "") or ""
        ended_at = sess.get("ended_at")
        started_at = float(sess.get("started_at", 0.0) or 0.0)

        commits = db.get_session_commits(session_id)
        if not commits and ended_at and started_at > 0 and project_dir:
            # Lazy attribution: compute and cache on first request.
            commits = attribute_session(db, session_id, project_dir, started_at, float(ended_at))

        out = []
        for c in commits:
            sha = str(c.get("sha", ""))
            out.append(
                {
                    "sha": sha,
                    "short_sha": sha[:7],
                    "author_name": c.get("author_name", ""),
                    "author_email": c.get("author_email", ""),
                    "ts": float(c.get("ts", 0.0) or 0.0),
                    "subject": c.get("subject", ""),
                    "current_branch_match": bool(branch and project_dir and is_reachable(project_dir, sha, branch)),
                }
            )
        self._json_response(
            {
                "session_id": session_id,
                "branch": branch,
                "commits": out,
            }
        )

    def _serve_session_timeline(self) -> None:
        """Serve enriched session profiles for the timeline bar.

        Params: ?since=<unix_ts>&until=<unix_ts>
        Returns ``{sessions: [...], filtered_count: N}`` — the profiles with
        conversations, agents, file stats, plus per-session ``error_count``
        (aggregated ``is_error`` across tool_invocations + requests). Short,
        no-file sessions are still hidden from the list, but their count is
        now reported in ``filtered_count`` rather than dropped silently.
        """
        db = self._require_db(empty={"sessions": [], "filtered_count": 0})
        if not db:
            return

        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float_opt("until")

        all_profiles = db.query_session_profiles(since=since, until=until)

        # Filter to meaningful sessions (have file activity or >60s duration).
        # The number dropped is reported so the UI can say "N short sessions
        # hidden" instead of silently omitting them.
        profiles = [
            p
            for p in all_profiles
            if p["files_modified"] > 0
            or (p.get("duration_s") and p["duration_s"] > 60)
            or p.get("tokens_source") == "transcript"
        ]
        filtered_count = len(all_profiles) - len(profiles)

        # Per-session error_count: one grouped query over tool_invocations +
        # requests (not per-row), keyed by the surviving session ids.
        self._enrich_error_counts(db, profiles)

        # Merge live session data for active sessions.  Matching falls
        # back to UUID/PID/time-window heuristics because live snapshot
        # ids and persisted row ids use different formats — the DB row is
        # marked as the live one rather than surfacing a stale duplicate.
        snap = self.server.store.snapshot
        if snap:
            live_sessions = list(snap.sessions)
            for p in profiles:
                live = _match_live_session(p, live_sessions)
                if live:
                    p["active"] = True
                    p["live_session_id"] = live.get("session_id", "")
                    p["project"] = p.get("project") or live.get("project", "")
                    p["cpu_percent"] = live.get("cpu_percent", 0)
                    # Same tokens observed from different vantage points —
                    # keep the larger count, never sum.
                    if p.get("tokens_source") != "transcript":
                        p["input_tokens"] = max(int(p.get("input_tokens", 0) or 0), live.get("exact_input_tokens", 0))
                        p["output_tokens"] = max(int(p.get("output_tokens", 0) or 0), live.get("exact_output_tokens", 0))

        self._json_response({"sessions": profiles, "filtered_count": filtered_count})

    @staticmethod
    def _enrich_error_counts(db, profiles: list[dict]) -> None:
        """Attach ``error_count`` to each profile via one grouped query.

        Aggregates ``is_error`` from both ``tool_invocations`` and
        ``requests`` for the surviving session ids — including each
        profile's ``alt_session_ids`` (merged profiles remain reachable
        by every id they were known by) — in a single UNION-ALL grouped
        query (no per-row / per-session round-trips). Sessions with no
        errored rows get ``error_count = 0``.
        """

        def _profile_ids(p: dict) -> list[str]:
            ids = [p.get("session_id", "")] + list(p.get("alt_session_ids") or [])
            return [i for i in ids if i]

        sids = sorted({sid for p in profiles for sid in _profile_ids(p)})
        err_by_sid: dict[str, int] = {}
        if sids:
            placeholders = ",".join("?" for _ in sids)
            sql = (
                "SELECT session_id, SUM(errs) FROM ("
                f"  SELECT session_id, is_error AS errs FROM tool_invocations WHERE session_id IN ({placeholders})"
                "  UNION ALL"
                f"  SELECT session_id, is_error AS errs FROM requests WHERE session_id IN ({placeholders})"
                ") GROUP BY session_id"
            )
            try:
                conn = db._conn()  # noqa: SLF001 — read-only per-thread connection
                for sid, n in conn.execute(sql, sids + sids).fetchall():
                    err_by_sid[sid] = int(n or 0)
            except Exception:
                err_by_sid = {}
        for p in profiles:
            p["error_count"] = sum(err_by_sid.get(sid, 0) for sid in _profile_ids(p))

    def _serve_files(self) -> None:
        """Serve tracked files from the file store.

        Params: ?tool=X&category=Y&changed_since=<ts>
        """
        db = self._require_db()
        if not db:
            return

        tool = self._qs_get("tool")
        category = self._qs_get("category")
        changed_since_str = self._qs_get("changed_since")
        changed_since = float(changed_since_str) if changed_since_str else None

        files = db.list_files(tool=tool, category=category, changed_since=changed_since)
        self._json_response([{k: v for k, v in dataclasses.asdict(f).items() if k != "content"} for f in files])

    def _serve_file_history(self) -> None:
        """Serve file change history.

        Params: ?path=X&limit=N
        Or: ?path=X&ts=<unix_ts> to get content at a point in time.
        """
        file_path = self._qs_get("path")

        if not file_path:
            self.send_error(400, "Missing path parameter")
            return

        db = self._require_db()
        if not db:
            return

        # Content at timestamp mode
        ts_str = self._qs_get("ts")
        if ts_str:
            ts = float(ts_str)
            content = db.file_content_at(file_path, ts)
            if content is None:
                self.send_error(404, "No content at that timestamp")
                return
            body = content.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self._send_cors_header()
            self.end_headers()
            self.wfile.write(body)
            return

        # History timeline mode
        limit = int(self._qs_get("limit", "50"))
        history = db.file_history(file_path, limit=limit)
        self._json_response(history)

    def _serve_telemetry(self) -> None:
        """Serve historical telemetry data.

        Params: ?tool=X&since=<ts>&until=<ts>
        """
        db = self._require_db()
        if not db:
            return

        tool = self._qs_get("tool")
        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float("until", time.time())

        rows = db.query_telemetry(tool=tool, since=since, until=until)
        self._json_response([dataclasses.asdict(r) for r in rows])
