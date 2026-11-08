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


# ─── Any settings file, as text ──────────────────────────────────────────────
# The Settings screen opens a file aictl has found and lets the user change its
# text. Only files a scan or the file list found are opened; no file is created.

EDITABLE_SUFFIXES = frozenset({".md", ".mdc", ".json", ".jsonc", ".toml", ".yaml", ".yml", ".txt"})
EDIT_MAX_BYTES = 1_000_000


def _editable_path(path: object, is_allowed: Any = None) -> Path:
    """The file at *path* when aictl may edit it, else the error to answer with."""
    from ..context_audit import _path_key
    from .audit_cache import AUDIT_CACHE

    text = str(path or "")
    if not text or not os.path.isabs(os.path.expanduser(text)):
        raise ToolConfigEditError(400, "path must be an absolute path")
    p = Path(os.path.normpath(os.path.expanduser(text)))
    if p.suffix.lower() not in EDITABLE_SUFFIXES:
        raise ToolConfigEditError(403, "aictl edits only text settings and instruction files.")
    if _path_key(str(p)) not in AUDIT_CACHE.source_paths() and not (is_allowed and is_allowed(str(p))):
        raise ToolConfigEditError(403, "aictl has not found this file in a scan.")
    if not p.is_file():
        raise ToolConfigEditError(404, "The file does not exist.")
    return p


def _read_settings_text(p: Path) -> str:
    from ..hook_removal import read_text_exact

    try:
        if p.stat().st_size > EDIT_MAX_BYTES:
            raise ToolConfigEditError(413, "The file is larger than 1 MB. Edit it in an editor.")
        return read_text_exact(p)
    except UnicodeDecodeError as exc:
        raise ToolConfigEditError(415, "The file is not UTF-8 text.") from exc
    except OSError as exc:
        raise ToolConfigEditError(500, f"Could not read the file: {exc}") from exc


def load_settings_file(path: object, is_allowed: Any = None) -> dict[str, Any]:
    """The text of a settings file for editing, with secret-shaped values masked."""
    from .board_api import mask_secrets

    p = _editable_path(path, is_allowed)
    text = _read_settings_text(p)
    masked = mask_secrets(text)
    st = p.stat()
    return {"path": str(p), "text": masked, "masked": masked != text, "mtime": st.st_mtime, "size": st.st_size}


def restore_masked(original: str, masked: str, edited: str) -> str:
    """*edited* with every line the user left as it was masked put back to its real text.

    The editor shows masked text. A line that still reads as it was shown keeps
    its original value; a line the user changed is written as typed.
    """
    if masked == original:
        return edited
    import difflib

    orig_lines = original.splitlines(keepends=True)
    masked_lines = masked.splitlines(keepends=True)
    edited_lines = edited.splitlines(keepends=True)
    out: list[str] = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, masked_lines, edited_lines, autojunk=False).get_opcodes():
        out.extend(orig_lines[i1:i2] if tag == "equal" else edited_lines[j1:j2])
    return "".join(out)


def _format_error(p: Path, text: str) -> str | None:
    from ..hook_removal import config_error

    error = config_error(p, text)
    if error is None and p.suffix.lower() in (".yaml", ".yml"):
        try:
            import yaml

            yaml.safe_load(text)
        except yaml.YAMLError as exc:
            error = str(exc).splitlines()[0] if str(exc) else "invalid YAML"
        except ImportError:
            error = None
    return error


def save_settings_file(path: object, payload: dict[str, Any], is_allowed: Any = None, *, now: float | None = None) -> dict[str, Any]:
    """Write the text of a settings file. Keeps a backup and records the change in the ledger.

    ``payload`` carries ``text`` and ``expected_mtime``, the file's mtime as the
    editor read it; a file changed since is refused with 409.
    """
    from ..hook_removal import InvalidConfigError, write_atomic

    p = _editable_path(path, is_allowed)
    text = payload.get("text")
    if not isinstance(text, str):
        raise ToolConfigEditError(400, "text must be a string")
    if len(text.encode("utf-8")) > EDIT_MAX_BYTES:
        raise ToolConfigEditError(413, "The text is larger than 1 MB.")
    expected = payload.get("expected_mtime")
    if expected is not None:
        try:
            if abs(p.stat().st_mtime - float(expected)) > 0.0001:
                raise ToolConfigEditError(409, "The file changed since it was loaded. Reload it and make the change again.")
        except (TypeError, ValueError) as exc:
            raise ToolConfigEditError(400, "expected_mtime must be a number") from exc
    from .board_api import mask_secrets

    current = _read_settings_text(p)
    new_text = restore_masked(current, mask_secrets(current), text)
    error = _format_error(p, new_text)
    if error:
        raise ToolConfigEditError(400, f"The file would not parse, so it is unchanged: {error}")
    now = time.time() if now is None else now
    backup = _backup_path(p, now)
    try:
        backup.write_bytes(current.encode("utf-8"))
        write_atomic(p, new_text)
    except InvalidConfigError as exc:
        raise ToolConfigEditError(400, str(exc)) from exc
    except OSError as exc:
        raise ToolConfigEditError(500, f"Could not write the file: {exc}") from exc

    from .. import mutation_ledger

    mutation_ledger.record(
        command="dashboard:settings-file", path=p, op="modify", previous_content=current.encode("utf-8"), new_content=new_text.encode("utf-8")
    )
    updated = load_settings_file(p, is_allowed)
    updated["backup_path"] = str(backup)
    return updated
