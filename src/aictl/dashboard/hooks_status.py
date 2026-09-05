"""Hook installation and firing status for the dashboard."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from .._hook_owner import _AICTL_OWNER_MARKER, _is_legacy_aictl_hook
from ..commands.integrations import (
    GEMINI_HOOK_MAP,
    HOOK_EVENTS,
    VSCODE_HOOK_EVENTS,
    _extract_hook_command,
    _extract_port_from_cmd,
    _hook_cmd_summary,
    _iter_aictl_hook_rules,
)
from ..platforms import claude_global_dir, copilot_global_dir, gemini_global_dir, vscode_user_dir
from ..utils import read_json_lenient

HOOK_WINDOW_SECONDS = 24 * 60 * 60

# Events each source file is expected to carry after `aictl enable`. Used to
# flag a partial install (e.g. an older aictl wrote 12 of the current 27).
_EXPECTED_EVENTS: dict[str, frozenset[str]] = {
    "claude": frozenset(HOOK_EVENTS),
    "gemini": frozenset(GEMINI_HOOK_MAP.values()),
    "vscode": frozenset(VSCODE_HOOK_EVENTS),
}


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


def _tool_bucket(tool: str) -> dict[str, Any]:
    return {
        "tool": tool,
        "configured": False,
        "configured_count": 0,
        "configured_events": [],
        "missing_events": [],
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
    if location_key not in locations:
        # A user-set map REPLACES VS Code's defaults, so an absent key means
        # this location is NOT loaded even though nothing says "false".
        return False, f"chat.hookFilesLocations does not list {location_key!r} (user map replaces defaults)"
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
    settings: dict[str, Any],
    host_enabled: bool = True,
    host_reason: str = "",
    server_port: int | None = None,
) -> dict[str, Any]:
    """Summarise one hook file that has already been read into *settings*."""
    checks = [_summarize_hook(event, rule, server_port) for event, rule in _iter_aictl_hook_rules(settings)]
    events = sorted({c["event"] for c in checks})
    expected = _EXPECTED_EVENTS.get(schema, frozenset())
    missing = sorted(expected - set(events)) if checks else []
    statuses = [c.get("status", "OK") for c in checks]
    if not checks:
        status = "missing"
    elif not host_enabled:
        status = "disabled"
    elif any(s == "FAIL" for s in statuses):
        status = "fail"
    elif any(s == "WARN" for s in statuses) or missing:
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
        "missing_events": missing,
        "status": status,
        "checks": checks,
    }


def _summarize_hook(event: str, rule: dict, server_port: int | None = None) -> dict[str, Any]:
    """Return cheap hook metadata without running the full doctor probes.

    When *server_port* is known, a rule whose ``--port`` differs is a FAIL:
    hook_handler would POST to a port nothing listens on and swallow the
    error, so the file "looks configured" while zero events ever arrive.
    """
    cmd = _extract_hook_command(rule)
    owner = rule.get("_aictl_owner")
    legacy = owner != _AICTL_OWNER_MARKER and _is_legacy_aictl_hook(rule)
    port = _extract_port_from_cmd(cmd)
    status = "WARN" if legacy else "OK"
    reasons = ["legacy aictl version (missing current owner marker)"] if legacy else []
    if server_port is not None and port is not None and port != server_port:
        status = "FAIL"
        reasons.append(f"hook posts to port {port} but this dashboard serves on {server_port}")
    return {
        "event": event,
        "command": cmd,
        "command_summary": _hook_cmd_summary(cmd),
        "port": port,
        "owner": owner,
        "legacy": legacy,
        "status": status,
        "reasons": reasons,
    }


def _hook_event_counts(db, cutoff: float) -> dict[str, Any]:
    out: dict[str, Any] = {"total": 0, "last_fire_ts": None, "by_tool": {}, "by_kind": {}, "by_tool_kind": {}}
    if db is None:
        return out
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


def _post_tool_use_usage(db, cutoff: float) -> tuple[dict[str, Any], dict[str, Any]]:
    """One scan of PostToolUse hooks → ``(skill_usage, tool_calls)``.

    Skill invocations and general tool calls used to be two full window
    scans with five ``json_extract`` calls each, differing only by
    ``tool_name = 'Skill'`` vs ``!= 'Skill'``. One GROUP BY and a split in
    Python halves the JSON decoding on every dashboard poll.
    """
    skills: dict[str, Any] = {"total_calls_24h": 0, "by_skill": [], "by_tool": {}}
    tools: dict[str, Any] = {"total_calls_24h": 0, "by_name": [], "by_tool": {}, "by_tool_name": {}}
    if db is None:
        return skills, tools
    conn = db._conn()  # noqa: SLF001 - read-only dashboard aggregation
    rows = conn.execute(
        """
        SELECT tool,
               COALESCE(json_extract(detail, '$.tool_name'), json_extract(detail, '$.name'), 'unknown') AS name,
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
         GROUP BY tool, name, skill
        """,
        (cutoff,),
    ).fetchall()
    by_skill: dict[str, int] = {}
    by_name: dict[str, int] = {}
    for tool, name, skill, count in rows:
        count = int(count or 0)
        tool = str(tool)
        name = str(name or "unknown")
        if name == "Skill":
            skill = str(skill or "unknown")
            by_skill[skill] = by_skill.get(skill, 0) + count
            skills["by_tool"][tool] = skills["by_tool"].get(tool, 0) + count
            skills["total_calls_24h"] += count
        else:
            by_name[name] = by_name.get(name, 0) + count
            tools["by_tool"][tool] = tools["by_tool"].get(tool, 0) + count
            per_tool = tools["by_tool_name"].setdefault(tool, {})
            per_tool[name] = per_tool.get(name, 0) + count
            tools["total_calls_24h"] += count
    skills["by_skill"] = [
        {"skill": k, "count": v} for k, v in sorted(by_skill.items(), key=lambda item: (-item[1], item[0]))
    ]
    tools["by_name"] = [
        {"name": k, "count": v} for k, v in sorted(by_name.items(), key=lambda item: (-item[1], item[0]))
    ]
    return skills, tools


def _subagent_usage(db, cutoff: float) -> dict[str, Any]:
    if db is None:
        return {"starts_24h": 0, "stops_24h": 0, "by_tool": {}, "recent": []}
    conn = db._conn()  # noqa: SLF001 - read-only dashboard aggregation
    rows = conn.execute(
        """
        SELECT ts, tool, kind,
               COALESCE(json_extract(detail, '$.agent_id'), json_extract(detail, '$.subagent_id'), '') AS agent_id,
               COALESCE(json_extract(detail, '$.agent_type'), '') AS agent_type
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
    for ts, tool, kind, agent_id, agent_type in rows:
        event = str(kind)[5:] if str(kind).startswith("hook:") else str(kind)
        bucket = by_tool.setdefault(str(tool), {"starts": 0, "stops": 0})
        if "stop" in event.lower():
            stops += 1
            bucket["stops"] += 1
        else:
            starts += 1
            bucket["starts"] += 1
        recent.append(
            {
                "ts": float(ts),
                "tool": str(tool),
                "event": event,
                "agent_id": str(agent_id or ""),
                "agent_type": str(agent_type or ""),
            }
        )
    return {"starts_24h": starts, "stops_24h": stops, "by_tool": by_tool, "recent": recent[:10]}


def collect_hooks_status(
    db,
    root: Path,
    *,
    now: float | None = None,
    paths: dict[str, Path] | None = None,
    server_port: int | None = None,
) -> dict[str, Any]:
    """Collect installed-hook health and recent hook activity.

    *server_port* is the port this dashboard is serving on; hooks installed
    against another port are reported as failing (they never reach us).
    """
    root = Path(root)
    now = time.time() if now is None else now
    cutoff = now - HOOK_WINDOW_SECONDS
    paths = {**_default_paths(root), **(paths or {})}

    # Read each settings file exactly once; both the host-enabled checks and
    # the rule iteration work from the parsed dict.
    files = {key: read_json_lenient(paths[key]) for key in paths}
    vscode_settings = files["vscode_settings"]
    claude_user_enabled, claude_user_reason = _claude_hooks_enabled(files["claude_user"])
    claude_project_enabled, claude_project_reason = _claude_hooks_enabled(files["claude_project"])
    vscode_user_enabled, vscode_user_reason = _vscode_location_enabled(vscode_settings, "~/.copilot/hooks")
    vscode_project_enabled, vscode_project_reason = _vscode_location_enabled(vscode_settings, ".github/hooks")

    def _src(tool: str, scope: str, key: str, schema: str, enabled: bool = True, reason: str = "") -> dict:
        return _source_summary(
            tool=tool,
            scope=scope,
            path=paths[key],
            schema=schema,
            settings=files[key],
            host_enabled=enabled,
            host_reason=reason,
            server_port=server_port,
        )

    sources = [
        _src("claude-code", "user", "claude_user", "claude", claude_user_enabled, claude_user_reason),
        _src("claude-code", "project", "claude_project", "claude", claude_project_enabled, claude_project_reason),
        _src("gemini-cli", "user", "gemini_user", "gemini"),
        _src("gemini-cli", "project", "gemini_project", "gemini"),
        _src("copilot-vscode", "user", "vscode_user", "vscode", vscode_user_enabled, vscode_user_reason),
        _src("copilot-vscode", "project", "vscode_project", "vscode", vscode_project_enabled, vscode_project_reason),
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
            bucket["missing_events"] = sorted(set(bucket["missing_events"]) | set(source["missing_events"]))
        if source["configured"] and not source["host_enabled"]:
            warning = {
                "tool": source["tool"],
                "scope": source["scope"],
                "path": source["path"],
                "message": source["host_reason"],
            }
            bucket["warnings"].append(warning)
            warnings.append(warning)
        for check in source["checks"]:
            for reason in check["reasons"]:
                if "serves on" in reason:  # port mismatch — the file can never reach this dashboard
                    warning = {
                        "tool": source["tool"],
                        "scope": source["scope"],
                        "path": source["path"],
                        "message": f"{check['event']}: {reason}",
                    }
                    bucket["warnings"].append(warning)
                    warnings.append(warning)
        if source["missing_events"]:
            warning = {
                "tool": source["tool"],
                "scope": source["scope"],
                "path": source["path"],
                "message": f"partial install: {len(source['missing_events'])} event(s) not registered "
                f"({', '.join(source['missing_events'][:4])}{'…' if len(source['missing_events']) > 4 else ''})"
                " — re-run `aictl enable`",
            }
            bucket["warnings"].append(warning)
            warnings.append(warning)

    for tool, fired in counts["by_tool"].items():
        bucket = tools.setdefault(tool, _tool_bucket(tool))
        bucket["fired_24h"] = fired["count"]
        bucket["last_fire_ts"] = fired["last_fire_ts"]

    for bucket in tools.values():
        host_disabled = any(s["configured"] and not s["host_enabled"] for s in bucket["sources"])
        port_mismatch = any(
            c["status"] == "FAIL"
            for s in bucket["sources"]
            for c in s["checks"]
            if any("serves on" in r for r in c["reasons"])
        )
        if host_disabled:
            bucket["status"] = "disabled"
        elif port_mismatch and bucket["fired_24h"] == 0:
            bucket["status"] = "misconfigured"
        elif bucket["configured"] and bucket["fired_24h"] > 0:
            bucket["status"] = "active"
        elif bucket["configured"]:
            bucket["status"] = "configured"
        elif bucket["fired_24h"] > 0:
            bucket["status"] = "observed"
        else:
            bucket["status"] = "missing"

    skill_usage, tool_calls = _post_tool_use_usage(db, cutoff)
    return {
        "generated_at": now,
        "window_seconds": HOOK_WINDOW_SECONDS,
        "server_port": server_port,
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
        "skill_usage": skill_usage,
        "subagents": _subagent_usage(db, cutoff),
        "tool_calls": tool_calls,
    }
