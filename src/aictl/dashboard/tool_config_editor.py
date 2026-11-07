"""Editable dashboard tool configuration helpers."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

from ..hook_removal import validate_config_text


class ToolConfigEditError(Exception):
    """Error that can be returned directly as an HTTP JSON response."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


# Editable files per scope, relative to the project root.
_CLAUDE_SCOPE_FILES: dict[str, tuple[str, str]] = {
    "project": (".claude", "settings.json"),
    "project-local": (".claude", "settings.local.json"),
}

PERMISSION_BUCKETS = ("allow", "deny", "ask")


def _settings_path(root: Path, tool: str, scope: str | None = None) -> Path:
    if tool != "claude-code":
        raise ToolConfigEditError(404, f"Tool config editing is not supported for {tool}")
    scope = scope or "project"
    if scope not in _CLAUDE_SCOPE_FILES:
        raise ToolConfigEditError(400, f"Scope {scope!r} cannot be edited; use one of: {', '.join(_CLAUDE_SCOPE_FILES)}")
    folder, name = _CLAUDE_SCOPE_FILES[scope]
    return root / folder / name


def _read_json_object(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(errors="replace", encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ToolConfigEditError(409, f"Config file contains invalid JSON: {exc.msg}") from exc
    except OSError as exc:
        raise ToolConfigEditError(500, f"Could not read config file: {exc}") from exc
    if not isinstance(data, dict):
        raise ToolConfigEditError(409, "Config file root must be a JSON object")
    return data


def _string_list(value: object, field: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ToolConfigEditError(400, f"{field} must be a list of strings")
    return list(value)


def _permissions_from_config(data: dict[str, Any]) -> dict[str, list[str]]:
    permissions = data.get("permissions", {})
    if permissions is None:
        permissions = {}
    if not isinstance(permissions, dict):
        raise ToolConfigEditError(409, "permissions must be a JSON object")
    return {b: _string_list(permissions.get(b), f"permissions.{b}") for b in PERMISSION_BUCKETS}


def load_editable_tool_config(root: Path, tool: str, scope: str | None = None) -> dict[str, Any]:
    """Return the editable config payload for a tool at a scope (``project`` or ``project-local``)."""
    path = _settings_path(root, tool, scope)
    data = _read_json_object(path)
    stat = path.stat() if path.exists() else None
    return {
        "tool": tool,
        "scope": scope or "project",
        "path": str(path),
        "exists": path.exists(),
        "mtime": stat.st_mtime if stat else None,
        "editable_fields": [f"permissions.{b}" for b in PERMISSION_BUCKETS],
        "permissions": _permissions_from_config(data),
        "raw": data,
    }


def _backup_path(path: Path, now: float) -> Path:
    stamp = time.strftime("%Y%m%d%H%M%S", time.localtime(now))
    candidate = path.with_name(f"{path.name}.bak.{stamp}")
    suffix = 1
    while candidate.exists():
        candidate = path.with_name(f"{path.name}.bak.{stamp}.{suffix}")
        suffix += 1
    return candidate


def save_editable_tool_config(
    root: Path,
    tool: str,
    payload: dict[str, Any],
    *,
    now: float | None = None,
) -> dict[str, Any]:
    """Persist editable config fields and return the updated payload.

    ``payload["scope"]`` picks the file (``project``, the default, or ``project-local``).
    ``allow`` and ``deny`` are always written; ``ask`` is written only when the payload
    has it, and an empty ``ask`` is not added to a file that has no ``ask`` list.
    """
    scope = payload.get("scope")
    if scope is not None and not isinstance(scope, str):
        raise ToolConfigEditError(400, "scope must be a string")
    path = _settings_path(root, tool, scope)
    data = _read_json_object(path)
    permissions_payload = payload.get("permissions")
    if not isinstance(permissions_payload, dict):
        raise ToolConfigEditError(400, "permissions object is required")
    next_permissions = {
        "allow": _string_list(permissions_payload.get("allow"), "permissions.allow"),
        "deny": _string_list(permissions_payload.get("deny"), "permissions.deny"),
    }
    has_ask = "ask" in permissions_payload
    next_ask = _string_list(permissions_payload.get("ask"), "permissions.ask") if has_ask else []

    expected_mtime = payload.get("expected_mtime")
    if expected_mtime is not None and path.exists():
        try:
            if abs(path.stat().st_mtime - float(expected_mtime)) > 0.0001:
                raise ToolConfigEditError(409, "Config file changed since it was loaded")
        except ValueError as exc:
            raise ToolConfigEditError(400, "expected_mtime must be a number") from exc

    permissions = data.get("permissions", {})
    if permissions is None:
        permissions = {}
    if not isinstance(permissions, dict):
        raise ToolConfigEditError(409, "permissions must be a JSON object")
    permissions["allow"] = next_permissions["allow"]
    permissions["deny"] = next_permissions["deny"]
    if has_ask and (next_ask or "ask" in permissions):
        permissions["ask"] = next_ask
    data["permissions"] = permissions

    backup = None
    now = time.time() if now is None else now
    path.parent.mkdir(parents=True, exist_ok=True)
    previous_bytes = path.read_bytes() if path.exists() else None
    if path.exists():
        backup = _backup_path(path, now)
        backup.write_bytes(path.read_bytes())

    tmp = path.with_name(f".{path.name}.tmp")
    new_text = json.dumps(data, indent=2, sort_keys=True) + "\n"
    try:
        validate_config_text(path, new_text)
        tmp.write_text(new_text, encoding="utf-8")
        os.replace(tmp, path)
    except OSError as exc:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        raise ToolConfigEditError(500, f"Could not write config file: {exc}") from exc

    # Audit the edit in the mutation ledger so dashboard-driven config changes
    # are recorded alongside CLI-driven ones. record() never raises.
    from .. import mutation_ledger

    mutation_ledger.record(
        command=f"dashboard:tool-config:{tool}",
        path=path,
        op="create" if previous_bytes is None else "modify",
        previous_content=previous_bytes,
        new_content=new_text.encode("utf-8"),
    )

    updated = load_editable_tool_config(root, tool, scope)
    updated["backup_path"] = str(backup) if backup else None
    return updated
