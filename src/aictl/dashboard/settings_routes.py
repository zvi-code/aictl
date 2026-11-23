"""HTTP handlers and inventory for local tool settings."""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from ..stores.base import StoreError
from .http_request import _names_another_machine
from .projections.history import (
    HistoryScope,
    configured_reader,
)

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
        logging.getLogger(__name__).debug("Could not discover tool home directories", exc_info=True)
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
                # A folder or an absent file has no size and holds no settings rows: unknown, never 0.
                "settings": None if e["is_dir"] else e["settings"],
                "bytes": size if exists and not e["is_dir"] else None,
                "mtime": mtime if exists else None,
                "git_state": git_state,
                "loading": str(audit.get("loading") or ""),
                "exists": exists,
                "is_dir": e["is_dir"],
            }
        )
    files.sort(key=lambda f: (f["location"], f["location_root"], f["path"]))
    return {"files": files, "generated_at": time.time()}


class SettingsRoutes:
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
        audit = AUDIT_CACHE._fresh(AUDIT_CACHE._key(root, None, HistoryScope.local(self.server.store))) or {}
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
        if self._reject_scoped_action(data):
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
        if self._reject_scoped_action(data):
            return
        try:
            self._json_response(save_settings_file(data.get("path"), data, self.server.allowed.is_allowed))
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)

    def _serve_hooks_status(self) -> None:
        """Return installed hook health and recent hook activity."""
        from .hooks_status import collect_hooks_status

        # Pass the serving port so hooks installed against another port are
        # flagged instead of showing as "configured" with 0 events forever.
        try:
            server_port = int(self.server.server_address[1])
        except (AttributeError, IndexError, TypeError, ValueError):
            server_port = None
        try:
            status = collect_hooks_status(configured_reader(self.server.store), self.server.root, server_port=server_port)
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return
        self._json_response(status)

    def _serve_context_audit(self) -> None:
        """Hidden-context audit of the served project, or of ?project= when given.

        The answer is kept for a few minutes; ``?refresh=1`` runs it again.
        With ``?nowait=1`` a scan runs in the background and the answer says how far it is.
        """
        from .audit_cache import AUDIT_CACHE
        from .projections.history import HistoryScope

        wanted = self._qs_get("project")
        project = wanted if wanted and not _names_another_machine(wanted) and Path(wanted).is_dir() else self.server.root
        try:
            refresh = self._qs_get("refresh") in ("1", "true")
            lookup = AUDIT_CACHE.poll if self._qs_get("nowait") == "1" else AUDIT_CACHE.get
            history = HistoryScope.local(getattr(self.server, "store", None))
            self._json_response(lookup(project, self._qs_get("tool") or None, refresh=refresh, history=history))
        except Exception as exc:  # noqa: BLE001 — report the failure to the settings panel
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)

    def _serve_effective_models(self) -> None:
        """The model in force for each Copilot tool and for Claude Code in the served project."""
        from ..effective_config import CLAUDE_TOOL, COPILOT_TOOLS, model_summary

        try:
            self._json_response({tool: model_summary(self.server.root, tool) for tool in (*COPILOT_TOOLS, CLAUDE_TOOL)})
        except Exception as exc:  # noqa: BLE001 — report the failure to the settings panel
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
