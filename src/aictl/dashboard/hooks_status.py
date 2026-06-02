"""Hook installation and firing status for the dashboard."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from .._hook_owner import _AICTL_OWNER_MARKER, _is_legacy_aictl_hook
from ..commands.integrations import (
    _extract_hook_command,
    _extract_port_from_cmd,
    _hook_cmd_summary,
    _iter_installed_aictl_hooks,
    _iter_installed_vscode_hooks,
)
from ..platforms import claude_global_dir, copilot_global_dir, gemini_global_dir, vscode_user_dir

HOOK_WINDOW_SECONDS = 24 * 60 * 60


def _default_paths(root: Path) -> dict[str, Path]:
    return {
        "claude_user": claude_global_dir() / "settings.json",
        "claude_project": root / ".claude" / "settings.local.json",
        "gemini_user": gemini_global_dir() / "settings.json",
        "gemini_project": root / ".gemini" / "settings.json",
        "vscode_user": copilot_global_dir() / "hooks" / "aictl.json",
        "vscode_project": root / ".github" / "hooks" / "aictl.json",
        "vscode_settings": vscode_user_dir() / "settings.json",
    }


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _tool_bucket(tool: str) -> dict[str, Any]:
    return {
        "tool": tool,
        "configured": False,
        "configured_count": 0,
        "configured_events": [],
        "fired_24h": 0,
        "last_fire_ts": None,
        "status": "missing",
        "sources": [],
        "warnings": [],
    }


def _vscode_location_enabled(settings: dict[str, Any], location_key: str) -> tuple[bool, str]:
    if settings.get("chat.useHooks") is False:
        return False, "chat.useHooks is false"
    locations = settings.get("chat.hookFilesLocations")
    if not isinstance(locations, dict):
        return True, "chat.hookFilesLocations default"
    if locations.get(location_key) is False:
        return False, f"chat.hookFilesLocations[{location_key!r}] is false"
    return True, "chat.hookFilesLocations allows this location"


def _claude_hooks_enabled(settings: dict[str, Any]) -> tuple[bool, str]:
    if settings.get("disableAllHooks") is True:
        return False, "disableAllHooks is true"
    return True, "hooks enabled"


def _source_summary(
    *,
    tool: str,
    scope: str,
    path: Path,
    schema: str,
    loader,
    host_enabled: bool = True,
    host_reason: str = "",
) -> dict[str, Any]:
    checks = [_summarize_hook(event, rule) for event, rule in loader(path)]
    events = sorted({c["event"] for c in checks})
    statuses = [c.get("status", "OK") for c in checks]
    if not checks:
        status = "missing"
    elif not host_enabled:
        status = "disabled"
    elif any(s == "FAIL" for s in statuses):
        status = "fail"
    elif any(s == "WARN" for s in statuses):
        status = "warn"
    else:
        status = "ok"
    return {
        "tool": tool,
        "scope": scope,
        "path": str(path),
        "exists": path.exists(),
        "schema": schema,
        "host_enabled": host_enabled,
        "host_reason": host_reason,
        "configured": bool(checks),
        "configured_count": len(checks),
        "configured_events": events,
        "status": status,
        "checks": checks,
    }


def _summarize_hook(event: str, rule: dict) -> dict[str, Any]:
    """Return cheap hook metadata without running the full doctor probes."""
    cmd = _extract_hook_command(rule)
    owner = rule.get("_aictl_owner")
    legacy = owner != _AICTL_OWNER_MARKER and _is_legacy_aictl_hook(rule)
    status = "WARN" if legacy else "OK"
    reasons = ["legacy aictl version (missing current owner marker)"] if legacy else []
    return {
        "event": event,
        "command": cmd,
        "command_summary": _hook_cmd_summary(cmd),
        "port": _extract_port_from_cmd(cmd),
        "owner": owner,
        "legacy": legacy,
        "status": status,
        "reasons": reasons,
    }


def _hook_event_counts(db, cutoff: float) -> dict[str, Any]:
    empty = {"total": 0, "last_fire_ts": None, "by_tool": {}, "by_kind": {}, "by_tool_kind": {}}
    if db is None:
        return empty
    conn = db._conn()  # noqa: SLF001 - read-only dashboard aggregation
    rows = conn.execute(
        """
        SELECT tool, kind, COUNT(*) AS n, MAX(ts) AS last_ts
          FROM events
         WHERE kind LIKE 'hook:%' AND ts >= ?
           AND COALESCE(json_extract(detail, '$._aictl_verify'), 0) = 0
         GROUP BY tool, kind
        """,
        (cutoff,),
    ).fetchall()
    out = {"total": 0, "last_fire_ts": None, "by_tool": {}, "by_kind": {}, "by_tool_kind": {}}
    for tool, kind, count, last_ts in rows:
        event = str(kind)[5:] if str(kind).startswith("hook:") else str(kind)
        count = int(count or 0)
        last_ts = float(last_ts or 0)
        out["total"] += count
        out["by_kind"][event] = out["by_kind"].get(event, 0) + count
        tool_bucket = out["by_tool"].setdefault(str(tool), {"count": 0, "last_fire_ts": None})
        tool_bucket["count"] += count
        if last_ts and (tool_bucket["last_fire_ts"] is None or last_ts > tool_bucket["last_fire_ts"]):
            tool_bucket["last_fire_ts"] = last_ts
        out["by_tool_kind"].setdefault(str(tool), {})[event] = count
        if last_ts and (out["last_fire_ts"] is None or last_ts > out["last_fire_ts"]):
            out["last_fire_ts"] = last_ts
    return out


def _skill_usage(db, cutoff: float) -> dict[str, Any]:
    if db is None:
        return {"total_calls_24h": 0, "by_skill": [], "by_tool": {}}
    conn = db._conn()  # noqa: SLF001 - read-only dashboard aggregation
    rows = conn.execute(
        """
        SELECT tool,
               COALESCE(
                 json_extract(detail, '$.skill_name'),
                 json_extract(detail, '$.tool_input.skill'),
                 json_extract(detail, '$.tool_input.name'),
                 json_extract(detail, '$.input.skill'),
                 json_extract(detail, '$.input.name'),
                 'unknown'
               ) AS skill,
               COUNT(*) AS n
          FROM events
         WHERE kind = 'hook:PostToolUse'
           AND ts >= ?
           AND COALESCE(json_extract(detail, '$._aictl_verify'), 0) = 0
           AND COALESCE(json_extract(detail, '$.tool_name'), json_extract(detail, '$.name'), '') = 'Skill'
         GROUP BY tool, skill
         ORDER BY n DESC, skill ASC
        """,
        (cutoff,),
    ).fetchall()
    by_skill: dict[str, int] = {}
    by_tool: dict[str, int] = {}
    total = 0
    for tool, skill, count in rows:
        count = int(count or 0)
        skill = str(skill or "unknown")
        by_skill[skill] = by_skill.get(skill, 0) + count
        by_tool[str(tool)] = by_tool.get(str(tool), 0) + count
        total += count
    return {
        "total_calls_24h": total,
        "by_skill": [
            {"skill": k, "count": v} for k, v in sorted(by_skill.items(), key=lambda item: (-item[1], item[0]))
        ],
        "by_tool": by_tool,
    }


def _subagent_usage(db, cutoff: float) -> dict[str, Any]:
    if db is None:
        return {"starts_24h": 0, "stops_24h": 0, "by_tool": {}, "recent": []}
    conn = db._conn()  # noqa: SLF001 - read-only dashboard aggregation
    rows = conn.execute(
        """
        SELECT ts, tool, kind,
               COALESCE(json_extract(detail, '$.agent_id'), json_extract(detail, '$.subagent_id'), '') AS agent_id
          FROM events
         WHERE ts >= ?
           AND COALESCE(json_extract(detail, '$._aictl_verify'), 0) = 0
           AND (kind IN ('hook:SubagentStart', 'hook:SubagentStop') OR lower(kind) LIKE '%subagent%')
         ORDER BY ts DESC
         LIMIT 50
        """,
        (cutoff,),
    ).fetchall()
    by_tool: dict[str, dict[str, int]] = {}
    starts = stops = 0
    recent = []
    for ts, tool, kind, agent_id in rows:
        event = str(kind)[5:] if str(kind).startswith("hook:") else str(kind)
        bucket = by_tool.setdefault(str(tool), {"starts": 0, "stops": 0})
        if "stop" in event.lower():
            stops += 1
            bucket["stops"] += 1
        else:
            starts += 1
            bucket["starts"] += 1
        recent.append({"ts": float(ts), "tool": str(tool), "event": event, "agent_id": str(agent_id or "")})
    return {"starts_24h": starts, "stops_24h": stops, "by_tool": by_tool, "recent": recent[:10]}


def _tool_call_usage(db, cutoff: float) -> dict[str, Any]:
    """Aggregate general tool-call activity (Read/Write/Bash/…) from PostToolUse hooks.

    Mirrors ``_skill_usage`` but covers every tool name *except* ``Skill`` (which has
    its own dedicated panel). Returns global totals plus a per-agent breakdown so the
    Agents tab can show the top tools each agent actually invoked.
    """
    if db is None:
        return {"total_calls_24h": 0, "by_name": [], "by_tool": {}, "by_tool_name": {}}
    conn = db._conn()  # noqa: SLF001 - read-only dashboard aggregation
    rows = conn.execute(
        """
        SELECT tool,
               COALESCE(json_extract(detail, '$.tool_name'), json_extract(detail, '$.name'), 'unknown') AS name,
               COUNT(*) AS n
          FROM events
         WHERE kind = 'hook:PostToolUse'
           AND ts >= ?
           AND COALESCE(json_extract(detail, '$._aictl_verify'), 0) = 0
           AND COALESCE(json_extract(detail, '$.tool_name'), json_extract(detail, '$.name'), '') != 'Skill'
         GROUP BY tool, name
         ORDER BY n DESC, name ASC
        """,
        (cutoff,),
    ).fetchall()
    by_name: dict[str, int] = {}
    by_tool: dict[str, int] = {}
    by_tool_name: dict[str, dict[str, int]] = {}
    total = 0
    for tool, name, count in rows:
        count = int(count or 0)
        name = str(name or "unknown")
        tool = str(tool)
        by_name[name] = by_name.get(name, 0) + count
        by_tool[tool] = by_tool.get(tool, 0) + count
        by_tool_name.setdefault(tool, {})[name] = count
        total += count
    return {
        "total_calls_24h": total,
        "by_name": [
            {"name": k, "count": v} for k, v in sorted(by_name.items(), key=lambda item: (-item[1], item[0]))
        ],
        "by_tool": by_tool,
        "by_tool_name": by_tool_name,
    }


def collect_hooks_status(
    db, root: Path, *, now: float | None = None, paths: dict[str, Path] | None = None
) -> dict[str, Any]:
    """Collect installed-hook health and recent hook activity."""
    root = Path(root)
    now = time.time() if now is None else now
    cutoff = now - HOOK_WINDOW_SECONDS
    paths = {**_default_paths(root), **(paths or {})}

    vscode_settings = _read_json(paths["vscode_settings"])
    claude_user_enabled, claude_user_reason = _claude_hooks_enabled(_read_json(paths["claude_user"]))
    claude_project_enabled, claude_project_reason = _claude_hooks_enabled(_read_json(paths["claude_project"]))
    vscode_user_enabled, vscode_user_reason = _vscode_location_enabled(vscode_settings, "~/.copilot/hooks")
    vscode_project_enabled, vscode_project_reason = _vscode_location_enabled(vscode_settings, ".github/hooks")

    sources = [
        _source_summary(
            tool="claude-code",
            scope="user",
            path=paths["claude_user"],
            schema="claude",
            loader=_iter_installed_aictl_hooks,
            host_enabled=claude_user_enabled,
            host_reason=claude_user_reason,
        ),
        _source_summary(
            tool="claude-code",
            scope="project",
            path=paths["claude_project"],
            schema="claude",
            loader=_iter_installed_aictl_hooks,
            host_enabled=claude_project_enabled,
            host_reason=claude_project_reason,
        ),
        _source_summary(
            tool="gemini-cli",
            scope="user",
            path=paths["gemini_user"],
            schema="gemini",
            loader=_iter_installed_aictl_hooks,
        ),
        _source_summary(
            tool="gemini-cli",
            scope="project",
            path=paths["gemini_project"],
            schema="gemini",
            loader=_iter_installed_aictl_hooks,
        ),
        _source_summary(
            tool="copilot-vscode",
            scope="user",
            path=paths["vscode_user"],
            schema="vscode",
            loader=_iter_installed_vscode_hooks,
            host_enabled=vscode_user_enabled,
            host_reason=vscode_user_reason,
        ),
        _source_summary(
            tool="copilot-vscode",
            scope="project",
            path=paths["vscode_project"],
            schema="vscode",
            loader=_iter_installed_vscode_hooks,
            host_enabled=vscode_project_enabled,
            host_reason=vscode_project_reason,
        ),
    ]

    counts = _hook_event_counts(db, cutoff)
    tools: dict[str, dict[str, Any]] = {}
    warnings: list[dict[str, str]] = []
    for source in sources:
        bucket = tools.setdefault(source["tool"], _tool_bucket(source["tool"]))
        bucket["sources"].append(source)
        if source["configured"]:
            bucket["configured"] = True
            bucket["configured_count"] += source["configured_count"]
            bucket["configured_events"] = sorted(set(bucket["configured_events"]) | set(source["configured_events"]))
        if source["configured"] and not source["host_enabled"]:
            warning = {
                "tool": source["tool"],
                "scope": source["scope"],
                "path": source["path"],
                "message": source["host_reason"],
            }
            bucket["warnings"].append(warning)
            warnings.append(warning)

    for tool, fired in counts["by_tool"].items():
        bucket = tools.setdefault(tool, _tool_bucket(tool))
        bucket["fired_24h"] = fired["count"]
        bucket["last_fire_ts"] = fired["last_fire_ts"]

    for bucket in tools.values():
        if bucket["warnings"]:
            bucket["status"] = "disabled"
        elif bucket["configured"] and bucket["fired_24h"] > 0:
            bucket["status"] = "active"
        elif bucket["configured"]:
            bucket["status"] = "configured"
        elif bucket["fired_24h"] > 0:
            bucket["status"] = "observed"
        else:
            bucket["status"] = "missing"

    return {
        "generated_at": now,
        "window_seconds": HOOK_WINDOW_SECONDS,
        "total_configured": sum(t["configured_count"] for t in tools.values()),
        "total_fired_24h": counts["total"],
        "last_fire_ts": counts["last_fire_ts"],
        "counts_by_kind": counts["by_kind"],
        "counts_by_tool_kind": counts["by_tool_kind"],
        "tools": tools,
        "sources": sources,
        "warnings": warnings,
        "vscode": {
            "settings_path": str(paths["vscode_settings"]),
            "use_hooks": vscode_settings.get("chat.useHooks"),
            "hook_files_locations": vscode_settings.get("chat.hookFilesLocations", {}),
        },
        "skill_usage": _skill_usage(db, cutoff),
        "subagents": _subagent_usage(db, cutoff),
        "tool_calls": _tool_call_usage(db, cutoff),
    }
