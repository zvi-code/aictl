"""Shared shaping helpers for board and session projections."""

from __future__ import annotations

import json
import math
import os
import re
from collections.abc import Iterable
from pathlib import Path, PureWindowsPath
from typing import Any

from ..records import _session_uuid as _raw_session_uuid
from ..secret_mask import mask_text
from ..tool_targets import split_mcp
from ..tools import TOOL_LABELS
from .history_scope import ScopeError, identity, identity_parts
from .projections.history import (
    HistoryScope,
    node_scope,
    session_row,
)

MAX_DETAIL_ROWS = 200


MAX_LIST_ROWS = 200


TITLE_CHARS = 80
# A stored session name is cut when it is stored, to this many characters.
STORED_TITLE_CHARS = 120


def mask_secrets(text: str | None) -> str:
    """Text with values that look like secrets replaced."""
    return mask_text(text)


def _one_line(text: str | None, limit: int) -> str:
    clean = " ".join(mask_secrets(text).split())
    return clean[: limit - 1] + "…" if len(clean) > limit else clean


def _percentile(ordered: list[float], p: float) -> float | None:
    """Nearest-rank percentile of a sorted list, or None for an empty one."""
    if not ordered:
        return None
    return ordered[max(0, math.ceil(p * len(ordered)) - 1)]


def _ms(value: float | None) -> float | None:
    return None if value is None else round(value, 1)


def _usd(value: float | None) -> float | None:
    return None if value is None else round(value, 6)


def _ratio(part: float | None, whole: float | None) -> float | None:
    if part is None or not whole:
        return None
    return round(part / whole, 4)


def _label(tool: str) -> str:
    return TOOL_LABELS.get(tool, tool)


def _short(identifier: str) -> str:
    parts = identity_parts(identifier)
    if parts:
        identifier = parts[1]
    # A subagent's address "<session>/<agent>" is shown by its agent id.
    return identifier.rsplit(AGENT_SEPARATOR, 1)[-1].rsplit(":", 1)[-1][:8] if identifier else ""


def _session_uuid(identifier: str) -> str | None:
    parts = identity_parts(identifier)
    if parts:
        uuid = _raw_session_uuid(parts[1])
        return identity(parts[0], uuid) if uuid else None
    return _raw_session_uuid(identifier)


def _is_reported_history(obj: Any) -> bool:
    return getattr(obj, "_reported_history", False) is True


def _basename(path: str) -> str:
    return re.split(r"[\\/]", path.rstrip("\\/"))[-1] if path else ""


def _names_another_machine(path: str) -> bool:
    return PureWindowsPath(path).drive.startswith("\\\\")


_MCP_TOOL_RE = re.compile(r"^mcp(__|_|\.|:)|^[\w.-]+/[\w.-]+$")


def is_server_tool(name: str | None) -> bool:
    return bool(name and _MCP_TOOL_RE.search(name))


def _proc_field(proc: Any, name: str) -> Any:
    return proc.get(name) if isinstance(proc, dict) else getattr(proc, name, None)


def _as_number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _display_folder(folder: Path) -> str:
    home = str(Path.home())
    text = str(folder)
    return "~" + text[len(home):].replace("\\", "/") if text == home or text.startswith(home + os.sep) else text


AGENT_SEPARATOR = "/"  # an agent addressed with its session: "<session id>/<agent id>"


def agent_address(session_id: str, agent_id: str) -> str:
    """How a route or a deep link (``?agent=``) names a subagent: with its session, since an agent
    id is unique only within its session (a resumed session copies its subagents)."""
    return f"{session_id}{AGENT_SEPARATOR}{agent_id}" if agent_id and agent_id != session_id else session_id


def _resolve_agent(history: HistoryScope, agent_id: str) -> tuple[str, str]:
    """(session id, agent key) of a board agent, named ``<session>/<agent>`` or by its id alone.

    An id alone is resolved only when exactly one session holds it; more than one is an
    ambiguity error that lists the candidates, never the earliest or the latest of them.
    """
    node, raw = history.split(agent_id)
    session, _, bare = raw.rpartition(AGENT_SEPARATOR)
    bare = bare or raw
    result = history.require_reader().read("agents.resolve", {
        **node_scope(node), "requested_agent": bare, "requested_session": session, "limit": 20,
    })
    def qualify(value: str) -> str:
        return identity(node or "", value) if history.qualified else value

    key = qualify(bare)
    if not result.rows:
        # The main agent is named by its session id; a named session keeps its name.
        return qualify(session) if session else agent_id, key
    best = min(row["priority"] for row in result.rows)
    owners = sorted({(row.get("node_id", ""), row["session_id"]) for row in result.rows if row["priority"] == best})
    if len({sid for _, sid in owners}) > 1 or (history.qualified and len(owners) > 1):
        listed = ", ".join(agent_address(sid, bare) for _, sid in owners)
        raise ScopeError(f"Agent {bare} is in more than one session; name it with its session: {listed}",
                         409, "ambiguous_identity")
    return qualify(owners[0][1]), key


def _json_list(value: Any) -> list[str]:
    """A list attribute that Copilot sends as a JSON string, or as a list."""
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str) and value.startswith("["):
        try:
            got = json.loads(value)
        except ValueError:
            return []
        return [str(v) for v in got] if isinstance(got, list) else []
    return []


def _num_or_none(value: Any) -> float | None:
    try:
        return float(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None


def _parse_detail(raw: Any) -> dict:
    try:
        d = json.loads(raw or "{}")
    except (TypeError, ValueError):
        return {}
    return d if isinstance(d, dict) else {}


def _session_row(history: HistoryScope, sid: str) -> dict:
    """The sessions-table row of a board session, also when it is stored under a monitor id with the same UUID."""
    node, raw = history.split(sid)
    row = session_row(history.require_reader(), raw, node_scope(node), fragment=_raw_session_uuid(raw) or "")
    if row and history.qualified:
        row["session_id"] = identity(node or "", row["session_id"])
    return row or {}


def mcp_server_of(tool_name: str, known: Iterable[str] = ()) -> str | None:
    """The MCP server of a server tool; '' when it cannot be determined; None for other tools.

    This is the one place that derives a server from a tool name. ``mcp__<server>__<tool>``,
    ``mcp:<server>:<tool>`` and ``<server>/<tool>`` name it. In ``mcp_a_b`` or ``mcp.a.b`` the
    server and the tool cannot be told apart from the name alone, since both may hold the
    separator: the server is then the longest of the *known* server names (seen in one of the
    other forms, or configured) that the rest of the name starts with, followed by the separator.
    A hyphen or dot in a known name also matches an underscore.
    """
    if not is_server_tool(tool_name):
        return None
    server = split_mcp(tool_name)[0]
    if server:
        return server
    if tool_name.startswith("mcp__"):
        return tool_name[5:].split("__", 1)[0]
    if tool_name.startswith("mcp:"):
        return tool_name[4:].split(":", 1)[0]
    if "/" in tool_name:
        return tool_name.split("/", 1)[0]
    sep, rest = tool_name[3], tool_name[4:]
    for name in sorted({k for k in known if k}, key=lambda k: (-len(k), k)):
        spellings = {name, re.sub(r"[-.]", "_", name)} if sep == "_" else {name}
        if any(rest.startswith(spelled + sep) for spelled in spellings):
            return name
    return ""


def known_mcp_servers(tool_names: Iterable[str]) -> set[str]:
    """The server names that tool names state without doubt, to resolve ``mcp_a_b`` names with."""
    return {server for name in tool_names if (server := mcp_server_of(name))}


def _as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
