# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Per-session MCP server usage analysis.

Joins the MCP servers configured for a session's project (via the
existing config-file parser :func:`aictl.importers._parse_helpers.import_mcp_from_json`)
with OTel spans / tool-invocation events that actually called one of
those servers during the session.

Called MCP servers are identified by any of:

* event kind starting with ``otel:mcp.`` (typical span names like
  ``mcp.tool.call``, ``mcp.list_tools``, ``mcp.initialize``);
* event detail containing a non-empty ``mcp.server`` or
  ``aictl.mcp.server`` attribute;
* event detail's ``service.name`` starting with ``mcp:``.

We intentionally avoid creating a new table — the data is derived from
already-stored events on every request.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from ..importers._parse_helpers import import_mcp_from_json

if TYPE_CHECKING:
    from ..storage import HistoryDB

# Config files that might hold MCP server definitions for a project.
# Order matches what aictl emitters/importers write today.
_CONFIG_CANDIDATES: tuple[str, ...] = (
    ".mcp.json",
    ".vscode/mcp.json",
    ".cursor/mcp.json",
    ".windsurf/mcp.json",
    ".copilot-mcp.json",
    "mcp.json",
)


def configured_servers(project_path: str | Path) -> list[str]:
    """Return de-duplicated MCP server names configured for *project_path*.

    Reads every known MCP config file under the project root and
    collects server names using the same parser as the importers.
    Missing project / missing files → empty list.
    """
    if not project_path:
        return []
    root = Path(project_path)
    if not root.is_dir():
        return []
    seen: set[str] = set()
    names: list[str] = []
    for rel in _CONFIG_CANDIDATES:
        path = root / rel
        if not path.is_file():
            continue
        for mcp in import_mcp_from_json(path, source="mcp_usage", seen=seen):
            names.append(mcp.name)
    return names


def _extract_server_name(ev: Any) -> str:
    """Pull an MCP server name out of an event, if any.

    Returns ``""`` when the event is not an MCP-related event. The
    rules mirror the docstring above.
    """
    kind = getattr(ev, "kind", "") or ""
    detail = getattr(ev, "detail", {}) or {}
    if not isinstance(detail, dict):
        detail = {}

    # Direct attribute match is most reliable.
    for key in ("aictl.mcp.server", "mcp.server", "mcp.server.name", "server.name"):
        val = detail.get(key)
        if isinstance(val, str) and val:
            return val

    service = detail.get("service.name")
    if isinstance(service, str) and service.startswith("mcp:"):
        return service.split(":", 1)[1] or service

    # Span-name heuristic: the OTel receiver emits kind=f"otel:{span.name}".
    # An ``mcp.*`` span without an explicit server attribute is still
    # evidence *some* MCP activity happened, but we can't attribute it to
    # a specific server. Skip it — unattributable calls are not useful.
    if kind.startswith("otel:mcp."):
        # Try a last-ditch guess: some tools put the server under "name".
        name = detail.get("name")
        if isinstance(name, str) and name:
            return name
    return ""


def session_mcp_calls(db: "HistoryDB", session_id: str, limit: int = 2000) -> list[dict]:
    """Aggregate MCP server calls observed during *session_id*.

    Returns one dict per distinct server:

    ``{server_name, call_count, first_ts, last_ts, total_duration_ms, err_count}``

    Sorted by ``call_count`` descending, then by server name.
    """
    if not session_id:
        return []
    events = db.query_events(session_id=session_id, limit=limit)
    per_server: dict[str, dict] = {}
    for ev in events:
        server = _extract_server_name(ev)
        if not server:
            continue
        detail = ev.detail if isinstance(ev.detail, dict) else {}
        duration = 0.0
        dm = detail.get("duration_ms")
        if isinstance(dm, (int, float)):
            duration = float(dm)
        is_err = 0
        status = detail.get("status") or detail.get("status.code")
        if isinstance(status, (int, float)) and int(status) == 2:
            is_err = 1
        elif isinstance(status, str) and status.lower() in {"error", "err"}:
            is_err = 1
        if detail.get("is_error") or detail.get("error"):
            is_err = 1

        entry = per_server.setdefault(
            server,
            {
                "server_name": server,
                "call_count": 0,
                "first_ts": ev.ts,
                "last_ts": ev.ts,
                "total_duration_ms": 0.0,
                "err_count": 0,
            },
        )
        entry["call_count"] += 1
        entry["total_duration_ms"] += duration
        entry["err_count"] += is_err
        if ev.ts < entry["first_ts"]:
            entry["first_ts"] = ev.ts
        if ev.ts > entry["last_ts"]:
            entry["last_ts"] = ev.ts

    out = list(per_server.values())
    out.sort(key=lambda r: (-r["call_count"], r["server_name"]))
    return out


__all__ = [
    "session_mcp_calls",
    "configured_servers",
]
