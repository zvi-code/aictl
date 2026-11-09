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

from ..data.token_usage import TokenUsage
from ..tool_scope import selection_block
from ..tools import budget_tools, compute_token_budget
from .otel_receiver import API_ERROR_EVENTS, API_REQUEST_EVENTS, _num

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


def tool_history_for_api(tool_data: dict[str, dict[str, list]]) -> dict[str, dict[str, list]]:
    """Per-tool history series for ``/api/history``, without the series the store does not keep.

    The store samples CPU and memory per process; it keeps no per-tool token or
    traffic series over time. Those keys are left out, so the page shows them as
    not available instead of a flat line of zeros.
    """
    return {t: {k: v for k, v in series.items() if k not in ("tokens", "traffic")} for t, series in tool_data.items()}


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

    def _serve_settings_file_get(self) -> None:
        """The text of one settings file aictl has found, for the editor."""
        from .tool_config_editor import ToolConfigEditError, load_settings_file

        try:
            self._json_response(load_settings_file(self._qs.get("path", [None])[0], self.server.allowed.is_allowed))
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)

    def _serve_settings_file_put(self) -> None:
        """Write the text of one settings file. The body carries path, text and expected_mtime."""
        from .tool_config_editor import ToolConfigEditError, save_settings_file

        content_length = self._content_length()
        if content_length is None:
            return
        if content_length > 1_200_000:
            self.send_error(413, "Payload too large")
            return
        try:
            data = json.loads(self.rfile.read(content_length) or b"{}")
        except (json.JSONDecodeError, OSError):
            self._json_response({"error": "Invalid JSON"}, status=400)
            return
        if not isinstance(data, dict):
            self._json_response({"error": "Request body must be a JSON object"}, status=400)
            return
        try:
            self._json_response(save_settings_file(data.get("path"), data, self.server.allowed.is_allowed))
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)

    def _serve_board_agent_flow(self) -> None:
        """The session flow of a board agent, from the store with hook and OTel events merged in.

        GET /api/board/agent/flow?id=<agent id>&since=<unix ts>&until=<unix ts>&limit=<events>
        A subagent id gives the whole session of its main agent. ``limit`` is how many of the
        newest events to return; the summary counts them all.
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
            limit = self._qs_float_opt("limit")
        except ValueError:
            self._json_response({"error": "since, until and limit must be numbers"}, status=400)
            return
        try:
            status, payload = agent_flow(self._db, agent_id, since, until, limit=int(limit) if limit else None)
        except Exception as exc:  # any failure must reach the tab's error state
            logging.getLogger(__name__).exception("Board agent flow failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response(payload, status=status)

    def _serve_board_agent_transcript(self) -> None:
        """The transcript of a board agent's session, from the store with the live transcript merged in.

        GET /api/board/agent/transcript?id=<agent id>[&turn=<unix ts>][&full=1]
        Without ``turn`` the turns are brief: previews, counts and tokens. ``turn`` returns one
        turn whole, with its actions and texts; ``full=1`` returns every turn whole.
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
            turn = self._qs_float_opt("turn")
        except ValueError:
            self._json_response({"error": "turn must be a number"}, status=400)
            return
        full = self._qs_get("full") in ("1", "true", "yes")
        try:
            status, payload = agent_transcript(self._db, agent_id, legacy_transcript=live, turn=turn, brief=not full)
        except Exception as exc:  # any failure must reach the tab's error state
            logging.getLogger(__name__).exception("Board agent transcript failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response(payload, status=status)

    def _serve_otel_status(self) -> None:
        """Return OTel receiver health status."""
        status = self.server.otel_receiver.status()
        sink = getattr(self._db, "otel_sink", None)
        if sink is not None:
            # What reached the cluster's OTel tables, what waits and what was dropped.
            status["kusto"] = sink.stats()
        self._json_response(status)

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

    # ── Analytics endpoint ─────────────────────────────────────────

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

    def _serve_session_processes(self) -> None:
        """Serve the persisted process genealogy for a session.

        Params: ?session_id=X (required)
        Returns ``{session_id, processes: [{pid, tool, role, joined_at}]}``.
        It reads the persisted ``session_processes`` table so the process
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

