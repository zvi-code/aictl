# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Dynamic source provenance for the datapoint catalog.

After each collection cycle, ``update_provenance(db, snap)`` refreshes
the ``source_dynamic`` JSON column for every catalog entry whose
``dynamic_source`` flag is set.  This gives the dashboard
"explain this metric" capability with live, concrete data sources.
"""

from __future__ import annotations

import json
import logging
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .dashboard.models import DashboardSnapshot
    from .storage import HistoryDB

log = logging.getLogger(__name__)

# Throttle: only refresh provenance every N seconds to avoid DB churn.
_REFRESH_INTERVAL = 30.0
_last_refresh: float = 0.0


def update_provenance(db: "HistoryDB", snap: "DashboardSnapshot") -> int:
    """Refresh dynamic source provenance from a live snapshot.

    Returns the number of catalog entries updated.
    """
    global _last_refresh
    now = time.time()
    if now - _last_refresh < _REFRESH_INTERVAL:
        return 0
    _last_refresh = now

    builders = _build_provenance(snap)
    count = 0
    for key, prov in builders.items():
        try:
            db.update_datapoint_source(key, prov)
            count += 1
        except Exception:
            pass  # don't crash collection on provenance failure
    return count


def _build_provenance(snap: "DashboardSnapshot") -> dict[str, dict[str, Any]]:
    """Build source_dynamic dicts for all dynamic datapoints."""
    prov: dict[str, dict[str, Any]] = {}

    tools = [t for t in snap.tools if t.tool != "aictl"]
    live_tools = [t for t in tools if t.live]
    telemetry = snap.tool_telemetry or []
    sessions = snap.sessions or []
    agent_teams = snap.agent_teams or []
    mcp_detail = snap.mcp_detail or []
    agent_memory = snap.agent_memory or []
    events = snap.events or []

    # ── Overview: live monitor metrics ────────────────────────────

    prov["overview.total_live_sessions"] = {
        "contributing_tools": {
            t.tool: t.live.get("session_count", 0)
            for t in live_tools
        },
        "total": snap.total_live_sessions,
        "tool_count": len(live_tools),
    }

    # Token estimation — the richest provenance
    token_sources: dict[str, dict] = {}
    for t in live_tools:
        te = t.live.get("token_estimate", {})
        token_sources[t.tool] = {
            "method": te.get("source", "unknown"),
            "confidence": te.get("confidence", 0),
            "input_tokens": te.get("input_tokens", 0),
            "output_tokens": te.get("output_tokens", 0),
        }
    prov["overview.total_live_estimated_tokens"] = {
        "contributing_tools": token_sources,
        "total": snap.total_live_estimated_tokens,
        "estimation_tiers_used": sorted(set(
            v["method"] for v in token_sources.values()
        )),
    }

    # Traffic rates
    prov["overview.total_live_outbound_rate_bps"] = {
        "contributing_tools": {
            t.tool: round(float(t.live.get("outbound_rate_bps", 0)), 2)
            for t in live_tools
        },
        "total_bps": snap.total_live_outbound_rate_bps,
    }

    prov["overview.total_live_inbound_rate_bps"] = {
        "contributing_tools": {
            t.tool: round(float(t.live.get("inbound_rate_bps", 0)), 2)
            for t in live_tools
        },
        "total_bps": snap.total_live_inbound_rate_bps,
    }

    # Resource bars
    prov["overview.live_traffic_bar"] = {
        "tools": {
            t.tool: round(
                float(t.live.get("outbound_rate_bps", 0))
                + float(t.live.get("inbound_rate_bps", 0)), 2
            )
            for t in live_tools
        },
    }

    # ── Collector health ─────────────────────────────────────────

    tools_with_telemetry = [
        te.get("tool") for te in telemetry
        if te.get("source") and te.get("confidence", 0) > 0
    ]
    prov["overview.collector_health.tools_with_telemetry"] = {
        "tools_with_telemetry": tools_with_telemetry,
        "total_tools": len(tools),
        "coverage": f"{len(tools_with_telemetry)}/{len(tools)}",
    }

    prov["overview.collector_health.live_tools"] = {
        "live_tools": [t.tool for t in live_tools],
        "count": len(live_tools),
    }

    stale_tools = []
    for te in telemetry:
        last_seen = te.get("last_seen", 0)
        if last_seen and snap.timestamp - last_seen > 300:
            stale_tools.append({"tool": te.get("tool"), "last_seen": last_seen})
    prov["overview.collector_health.stale_tools"] = {
        "stale_tools": stale_tools,
        "count": len(stale_tools),
    }

    error_tools = []
    for te in telemetry:
        errs = te.get("errors", [])
        if errs:
            error_tools.append({
                "tool": te.get("tool"),
                "error_count": len(errs),
                "latest_type": errs[-1].get("type", "") if errs else "",
            })
    prov["overview.collector_health.errors"] = {
        "tools_with_errors": error_tools,
        "total_errors": sum(e["error_count"] for e in error_tools),
    }

    prov["overview.collector_health.otel_status"] = {
        "active": bool(snap.live_monitor.get("diagnostics", {}).get("otel_active")),
    }

    prov["overview.collector_health.otel_metrics_received"] = {
        "active": bool(snap.live_monitor.get("diagnostics", {}).get("otel_active")),
    }

    # ── Alerts ────────────────────────────────────────────────────

    anomaly_tools: list[dict] = []
    for t in tools:
        for p in t.processes:
            anoms = (p.get("anomalies") if isinstance(p, dict)
                     else getattr(p, "anomalies", None)) or []
            if anoms:
                pid = (p.get("pid") if isinstance(p, dict)
                       else getattr(p, "pid", 0))
                anomaly_tools.append({
                    "tool": t.tool,
                    "pid": pid,
                    "anomalies": [a if isinstance(a, str) else str(a) for a in anoms[:3]],
                })
    prov["alerts.process_anomalies"] = {
        "affected_processes": anomaly_tools[:20],
        "total": len(anomaly_tools),
    }

    prov["procs.tool.anomaly"] = {
        "affected_processes": anomaly_tools[:20],
        "total": len(anomaly_tools),
        "detection_rules": ["memory_threshold", "cpu_spike", "known_leak", "orphan_process"],
    }

    # Subagent memory
    mem_by_tool: dict[str, int] = {}
    for t in live_tools:
        for proc in (t.live.get("processes") or []):
            mem_by_tool.setdefault(t.tool, 0)
            mem_by_tool[t.tool] += int(proc.get("mem", 0)) if isinstance(proc, dict) else 0
    prov["alerts.subagent_memory"] = {
        "memory_by_tool": mem_by_tool,
        "total_bytes": sum(mem_by_tool.values()),
    }

    # Orphan MCP
    orphans = []
    for s in mcp_detail:
        status = (s.get("status") if isinstance(s, dict)
                  else getattr(s, "status", ""))
        if status == "orphan":
            name = (s.get("name") if isinstance(s, dict)
                    else getattr(s, "name", ""))
            orphans.append(name)
    prov["alerts.orphan_mcp"] = {
        "orphan_servers": orphans,
        "count": len(orphans),
    }

    prov["alerts.headless_browser"] = {
        "note": "Detected from process tree inspection of AI tool sessions",
    }

    # ── Per-tool telemetry (shared provenance for all telemetry fields) ──

    for te in telemetry:
        tool = te.get("tool", "")
        if not tool:
            continue
        base = {
            "source": te.get("source", ""),
            "confidence": te.get("confidence", 0),
            "model": te.get("model", ""),
            "models": list((te.get("by_model") or {}).keys()),
            "sessions": te.get("total_sessions", 0),
            "error_count": len(te.get("errors", [])),
        }
        for suffix in ("input_tokens", "output_tokens", "cache_read",
                        "cache_write", "sessions", "messages", "cost_usd",
                        "by_model", "confidence", "errors"):
            key = f"procs.tool.telemetry.{suffix}"
            if key not in prov:
                prov[key] = {"by_tool": {}}
            prov[key]["by_tool"][tool] = base

    # ── Per-tool live metrics ─────────────────────────────────────

    for t in live_tools:
        live = t.live or {}
        te = live.get("token_estimate", {})
        tool_live = {
            "session_count": live.get("session_count", 0),
            "pid_count": live.get("pid_count", 0),
            "token_method": te.get("source", "unknown"),
            "token_confidence": te.get("confidence", 0),
            "mcp_detected": live.get("mcp", {}).get("detected", False),
            "mcp_confidence": live.get("mcp", {}).get("confidence", 0),
            "cpu_percent": live.get("cpu_percent", 0),
            "workspaces": live.get("workspaces", []),
        }
        for key_prefix in (
            "procs.tool.live.session_count",
            "procs.tool.live.pid_count",
            "procs.tool.live.traffic",
            "procs.tool.live.tokens",
            "procs.tool.live.mcp_detected",
            "procs.tool.live.files_touched",
            "procs.tool.live.cpu",
            "procs.tool.live.workspaces",
            "live.tool.sessions",
            "live.tool.traffic",
            "live.tool.tokens",
            "live.tool.mcp",
            "live.tool.files",
            "live.tool.workspace",
        ):
            if key_prefix not in prov:
                prov[key_prefix] = {"by_tool": {}}
            prov[key_prefix]["by_tool"][t.tool] = tool_live

    # Monitor roots
    all_workspaces = set()
    all_state_paths = set()
    for s in sessions:
        if isinstance(s, dict):
            for w in s.get("workspaces", []):
                all_workspaces.add(w)
            for sp in s.get("state_paths", s.get("files_loaded", [])):
                all_state_paths.add(sp)
    prov["live.monitor_roots"] = {
        "workspaces": sorted(all_workspaces)[:10],
        "state_paths": sorted(all_state_paths)[:10],
    }

    # ── Memory tab ────────────────────────────────────────────────

    mem_sources: dict[str, dict] = {}
    for m in agent_memory:
        source = (m.get("source") if isinstance(m, dict)
                  else getattr(m, "source", "unknown"))
        mem_sources.setdefault(source, {"files": 0, "tokens": 0})
        mem_sources[source]["files"] += 1
        tokens = (m.get("tokens", 0) if isinstance(m, dict)
                  else getattr(m, "tokens", 0))
        mem_sources[source]["tokens"] += tokens

    prov["memory.growth_chart"] = {
        "sources": mem_sources,
        "total_entries": len(agent_memory),
        "total_tokens": snap.total_memory_tokens,
    }

    prov["memory.source_group"] = {
        "sources": mem_sources,
    }

    prov["memory.entry.activity"] = {
        "total_entries": len(agent_memory),
        "note": "Activity determined by file mtime vs collection timestamp",
    }

    # ── Budget tab (dynamic parts) ─────────────────────────────────

    prov["budget.live_token_usage"] = {
        "contributing_tools": {
            t.tool: t.live.get("token_estimate", {}).get("input_tokens", 0)
            + t.live.get("token_estimate", {}).get("output_tokens", 0)
            for t in live_tools
        },
        "total": snap.total_live_estimated_tokens,
    }

    daily_sources: list[str] = []
    for te in telemetry:
        if te.get("daily"):
            daily_sources.append(te.get("tool", ""))
    prov["budget.daily_tokens"] = {
        "tools_with_daily_data": daily_sources,
        "models": sorted(set(
            model
            for te in telemetry
            for model in (te.get("by_model") or {}).keys()
        )),
    }

    prov["budget.token_by_tool"] = {
        "tools": [
            {
                "tool": te.get("tool"),
                "source": te.get("source"),
                "confidence": te.get("confidence", 0),
            }
            for te in telemetry
        ],
    }

    # ── Sessions tab ──────────────────────────────────────────────

    prov["sessions.timeline"] = {
        "active_sessions": len([
            s for s in sessions
            if isinstance(s, dict) and not s.get("ended_at")
        ]),
        "total_sessions": len(sessions),
    }

    prov["sessions.agent_teams"] = {
        "team_count": len(agent_teams),
        "total_agents": sum(
            len(team.get("agents", []))
            for team in agent_teams
        ),
    }

    # Active session provenance (aggregated across all active sessions)
    active = [s for s in sessions
              if isinstance(s, dict) and not s.get("ended_at")]
    for key_suffix in ("duration", "cpu", "input_tokens", "output_tokens",
                        "file_events", "pids", "process_tree"):
        prov[f"sessions.active.{key_suffix}"] = {
            "active_session_count": len(active),
            "tools": list(set(
                s.get("tool", "") for s in active
            )),
        }

    prov["sessions.history"] = {
        "total": len(sessions),
        "tools": sorted(set(
            s.get("tool", "") for s in sessions if isinstance(s, dict)
        )),
    }

    # ── Events tab ────────────────────────────────────────────────

    event_kinds: dict[str, int] = {}
    for e in events:
        kind = e.get("kind", "") if isinstance(e, dict) else ""
        if kind:
            event_kinds[kind] = event_kinds.get(kind, 0) + 1
    prov["events.feed"] = {
        "event_count": len(events),
        "by_kind": event_kinds,
        "sources": ["SessionCorrelator", "FilesystemWatcher", "HookReceiver", "AnomalyDetector"],
    }

    # ── Metrics Explorer ──────────────────────────────────────────

    prov["samples.metric_list"] = {
        "note": "Populated from samples table — all metrics emitted through SampleSink",
    }

    prov["samples.metric_chart"] = {
        "note": "Time series from samples table for selected metric, last 30 minutes",
    }

    prov["samples.metric_table"] = {
        "note": "Recent 50 samples from samples table with parsed JSON tags",
    }

    # ── File activity ─────────────────────────────────────────────

    prov["files.item.activity"] = {
        "note": "Based on file mtime: green if changed since last cycle, orange if <5min, grey otherwise",
    }

    # ── MCP server status ─────────────────────────────────────────

    mcp_running = []
    mcp_configured = []
    for s in mcp_detail:
        name = (s.get("name") if isinstance(s, dict)
                else getattr(s, "name", ""))
        status = (s.get("status") if isinstance(s, dict)
                  else getattr(s, "status", ""))
        if "running" in str(status).lower():
            mcp_running.append(name)
        else:
            mcp_configured.append(name)

    prov["mcp.server.status"] = {
        "running": mcp_running,
        "configured_only": mcp_configured,
        "total": len(mcp_detail),
    }

    prov["mcp.server.cpu"] = {
        "running_servers": mcp_running,
    }

    prov["mcp.server.mem"] = {
        "running_servers": mcp_running,
    }

    # ── New entries from Phase 2 gap analysis ─────────────────────

    # Telemetry operational metrics
    for te in telemetry:
        tool = te.get("tool", "")
        if not tool:
            continue
        qs = te.get("quota_state", {})
        if qs:
            for key in ("procs.tool.telemetry.premium_requests",
                        "procs.tool.telemetry.api_duration_ms",
                        "procs.tool.telemetry.code_changes"):
                prov.setdefault(key, {"by_tool": {}})
                prov[key]["by_tool"][tool] = {
                    "premium_requests": qs.get("premium_requests_used", 0),
                    "api_duration_ms": qs.get("total_api_duration_ms", 0),
                    "code_changes": qs.get("code_changes", {}),
                }
        for key in ("procs.tool.telemetry.active_session_input",
                    "procs.tool.telemetry.active_session_output",
                    "procs.tool.telemetry.active_session_messages"):
            prov.setdefault(key, {"by_tool": {}})
            prov[key]["by_tool"][tool] = {
                "input": te.get("active_session_input", 0),
                "output": te.get("active_session_output", 0),
                "messages": te.get("active_session_messages", 0),
            }

    # Collector diagnostics
    diag = snap.live_monitor.get("diagnostics", {}) if snap.live_monitor else {}
    collectors = {}
    if isinstance(diag, dict):
        for name, info in diag.items():
            if isinstance(info, dict):
                collectors[name] = {
                    "status": info.get("status", "unknown"),
                    "mode": info.get("mode", ""),
                }
    for key in ("live.diagnostics.collector_name",
                "live.diagnostics.status",
                "live.diagnostics.mode"):
        prov[key] = {"collectors": collectors}

    # Collector pipeline
    for key in ("overview.collector_pipeline.name",
                "overview.collector_pipeline.status",
                "overview.collector_pipeline.detail"):
        prov[key] = {"collectors": collectors}

    # OTel receiver stats
    otel_status = snap.live_monitor.get("otel", {}) if snap.live_monitor else {}
    for key in ("overview.collector_health.otel_events_received",
                "overview.collector_health.otel_api_calls",
                "overview.collector_health.otel_api_errors",
                "overview.collector_health.otel_parse_errors",
                "overview.collector_health.otel_last_receive"):
        prov[key] = {"otel": otel_status}

    # Events tab live monitor cards (same data source as procs.tool.live)
    for t in live_tools:
        live = t.live or {}
        tool_summary = {
            "session_count": live.get("session_count", 0),
            "pid_count": live.get("pid_count", 0),
            "cpu_percent": live.get("cpu_percent", 0),
            "outbound_rate_bps": live.get("outbound_rate_bps", 0),
            "inbound_rate_bps": live.get("inbound_rate_bps", 0),
        }
        for key in ("events.tool.live.session_count",
                     "events.tool.live.pid_count",
                     "events.tool.live.cpu_percent",
                     "events.tool.live.mem_mb",
                     "events.tool.live.outbound_rate_bps",
                     "events.tool.live.inbound_rate_bps"):
            prov.setdefault(key, {"by_tool": {}})
            prov[key]["by_tool"][t.tool] = tool_summary

    # Session timeline tooltip extras
    for key in ("sessions.timeline.conversations",
                "sessions.timeline.subagents",
                "sessions.timeline.source_files",
                "sessions.timeline.unique_files",
                "sessions.timeline.bytes_written"):
        prov[key] = {
            "total_sessions": len(sessions),
            "note": "Computed per-session from events and file data in query_session_profiles()",
        }

    # Session detail extras
    active_tools = list(set(s.get("tool", "") for s in active))
    for key in ("sessions.active.peak_cpu",
                "sessions.active.traffic",
                "sessions.active.state_writes",
                "sessions.active.workspaces",
                "sessions.active.subprocesses",
                "sessions.active.files_touched_list"):
        prov[key] = {
            "active_session_count": len(active),
            "tools": active_tools,
        }

    # Agent team extras
    prov["sessions.agent_teams.tools_used"] = {
        "team_count": len(agent_teams),
        "all_tools": sorted(set(
            tool_name
            for team in agent_teams
            for tool_name in team.get("tools_used", [])
        )),
    }

    for key in ("sessions.agent_teams.agent_slug",
                "sessions.agent_teams.agent_is_sidechain",
                "sessions.agent_teams.warmup_count"):
        prov[key] = {
            "team_count": len(agent_teams),
            "total_agents": sum(
                len(team.get("agents", []))
                for team in agent_teams
            ),
        }

    # Budget extras
    prov["budget.model_detected"] = {
        "models": sorted(set(
            te.get("model", "") for te in telemetry if te.get("model")
        )),
    }

    # API-only endpoints
    prov["api.project_costs"] = {
        "tools_with_cost": [
            te.get("tool") for te in telemetry if te.get("cost_usd", 0) > 0
        ],
    }

    prov["api.session_runs"] = {
        "total_sessions": len(sessions),
    }

    prov["api.api_calls"] = {
        "otel_active": bool(otel_status),
    }

    prov["api.file_history"] = {
        "note": "Stored in file_history table, updated on content_hash changes",
    }

    # OTel receiver / traces datapoints
    for key in ("otel.traces.token_usage", "otel.traces.operation_duration",
                "otel.traces.span_events", "otel.traces.api_calls",
                "otel.traces.api_errors", "otel.receiver.metrics_received",
                "otel.receiver.events_received", "otel.receiver.traces_received",
                "otel.receiver.api_calls_total", "otel.receiver.api_errors_total",
                "otel.receiver.parse_errors", "otel.receiver.last_receive",
                "otel.receiver.active"):
        prov[key] = {"otel": otel_status}

    return prov
