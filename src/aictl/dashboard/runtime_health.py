"""Project machine activity, collection health, and store metadata."""

from __future__ import annotations

import logging
import math
import os
import threading
import time
from pathlib import Path
from typing import Any

from ..health import host_memory as _host_memory
from ..stores import reader_feature, store_for
from ..stores.base import StoreError
from .projection_utils import (
    MAX_LIST_ROWS,
    _as_int,
    _as_number,
    _display_folder,
    _label,
    _one_line,
    _proc_field,
    mask_secrets,
)
from .projections.history import (
    HistoryScope,
    local_scope,
)

logger = logging.getLogger(__name__)


SELF_TTL_S = 10.0


_self_memo: list = [0.0, None]


_self_lock = threading.Lock()


def _self_usage() -> dict:
    """One local resource sample shared by board, Machine, and Health readers."""
    with _self_lock:
        if _self_memo[1] is not None and time.monotonic() - _self_memo[0] < SELF_TTL_S:
            return _self_memo[1]
        try:
            usage = self_usage()
        except Exception:  # noqa: BLE001 - a psutil failure must not take the board down
            usage = {}
        if usage.get("daemon_cpu_percent") == 0:
            if usage.get("daemon_memory_rss_bytes") == 0:
                # self_usage returns this sentinel pair if it could not read the parent.
                usage = {**usage, "daemon_cpu_percent": None, "daemon_memory_rss_bytes": None}
            elif (_self_memo[1] or {}).get("daemon_memory_rss_bytes") is None:
                # psutil's first nonblocking CPU read establishes a baseline, not a measured zero.
                usage = {**usage, "daemon_cpu_percent": None}
        sample = {**usage, **_own_process(), "host_memory": _host_memory(), "checked_at": time.time()}
        _self_memo[:] = [time.monotonic(), sample]
        return sample


def _self_section(db: Any) -> dict:
    usage = _self_usage()
    return {
        "cpu_percent": usage.get("cpu_percent"),
        "memory_rss_bytes": usage.get("memory_rss_bytes"),
        "children": usage.get("children", []),
        "history_bytes": None,
        "history_live_bytes": None,
        "history_limit_bytes": None,
        "retention_days": getattr(db, "_retention_days", None),
    }


MACHINE_CMDLINE_CHARS = 200


SUBAGENT_RAM_ALERT_MB = 2048.0


MANY_ANOMALIES = 5


MACHINE_QUALITY_ROWS = 50


DB_STATS_TTL_S = 60.0


KUSTO_VOLUME_TTL_S = 300.0  # Logical counts resolve row versions; don't pay for that every minute.


TABLE_INVENTORY_TTL_S = 300.0


TABLE_INVENTORY_LIMIT = 512


_SUBAGENT_TYPES = frozenset({"subagent", "agent"})


_ORPHAN_PARENTS = (0, 1)


_NO_FRESHNESS_TOOLS = frozenset({"aictl", "any"})


_ANOMALY_KINDS = {
    "high_memory": ("High memory", "warn"),
    "cpu_spike": ("CPU spike", "warn"),
    "zombie": ("Zombie process", "crit"),
    "known_leak": ("Known leak", "crit"),
    "high_file_count": ("High file count", "info"),
    "long_running": ("Long running", "info"),
}


_db_stats_memo: dict[tuple, tuple[float, dict]] = {}


_db_stats_inflight: set[tuple] = set()


_health_cache_lock = threading.Lock()


_health_cache: dict[tuple, dict] = {}


def _volume_interval(db: Any) -> float:
    return KUSTO_VOLUME_TTL_S


def _cached_health_data(db: Any, now: float, reader=None) -> dict:
    """Refresh costly store reads off the HTTP thread, with one refresh per store."""
    reader = reader or HistoryScope.local(db).reader
    key = reader
    with _health_cache_lock:
        entry = _health_cache.setdefault(key, {"data": {}, "at": -math.inf, "refreshing": False})
        if not entry["refreshing"] and time.monotonic() - entry["at"] >= HOOKS_TTL_S:
            entry["refreshing"] = True

            def refresh() -> None:
                try:
                    prev = entry["data"]
                    policies = _health_kusto_policies(reader, prev.get("policies"))
                    capacity = _health_kusto_capacity(reader, prev.get("capacity"))
                    inventory = _health_table_inventory(reader, prev.get("table_inventory"))
                    with _health_cache_lock:
                        entry["data"] = {**prev, "policies": policies, "capacity": capacity, "table_inventory": inventory}
                    cluster = prev.get("cluster_resources")
                    try:
                        cluster = reader_feature(reader, "cluster_resources", cluster)
                    except Exception:  # noqa: BLE001 - optional telemetry
                        logger.debug("Cluster resource metrics unavailable", exc_info=True)
                        if cluster is not None:
                            cluster = {**cluster, "status": "stale", "attempted_at": time.time(),
                                       "last_error": "Cluster resource metrics unavailable"}
                    with _health_cache_lock:
                        entry["data"] = {**entry["data"], "cluster_resources": cluster}
                    volume = _db_stats_sample(db, reader)
                    quality = _quality_rows(reader)
                    hooks = _hooks_by_tool(reader, now)
                    with _health_cache_lock:
                        entry["data"] = {**entry["data"], "volume": volume, "quality": quality, "hooks": hooks}
                finally:
                    with _health_cache_lock:
                        entry["at"] = time.monotonic()
                        entry["refreshing"] = False

            threading.Thread(target=refresh, name="aictl-health-stats", daemon=True).start()
        return dict(entry["data"])


def _empty_table_inventory(reader) -> dict:
    kusto = reader_feature(reader, "connection_info") is not None
    return {
        "status": "pending" if kusto else "unsupported",
        "checked_at": None, "attempted_at": None, "last_error": None,
        "scope": (
            "Physical tables in the configured ADX database. Rows are from a cached summary of sealed extents "
            "(up to 15 minutes old at read time). They include stored versions and tombstones, not just current "
            "logical rows. Unsealed streaming rows and queued submissions are not measured."
            if kusto else "Native ADX table metadata is not available for this store."
        ),
        "size_scope": (
            "extent_bytes and hot_bytes include compressed data and indexes, for all extents and hot extents "
            "respectively. original_bytes is pre-compression size; compressed data alone is not reported."
        ) if kusto else None,
        "refresh_interval_s": TABLE_INVENTORY_TTL_S if kusto else None,
        "limit": TABLE_INVENTORY_LIMIT if kusto else None, "truncated": None, "tables": [],
    }


def _health_table_inventory(reader, previous: dict | None = None) -> dict:
    """Read one bounded native metadata projection; never enumerate or count table contents."""
    result = previous if previous is not None else _empty_table_inventory(reader)
    attempted = result["attempted_at"]
    if attempted is not None and time.time() - attempted < TABLE_INVENTORY_TTL_S:
        return result
    metadata = reader_feature(reader, "health_metadata")
    if metadata is None:
        if result["status"] == "cached":
            return {**result, "status": "stale", "last_error": "No initialized Kusto client available"}
        return result
    attempted = time.time()
    try:
        rows = metadata.table_inventory(TABLE_INVENTORY_LIMIT)
        tables = []
        for row in rows[:TABLE_INVENTORY_LIMIT]:
            if not row.get("TableName"):
                raise ValueError("Unnamed table in ADX table metadata")
            tables.append({
                "name": row["TableName"], "rows": _as_int(row.get("TotalRowCount")),
                "extent_count": _as_int(row.get("TotalExtents")), "extent_bytes": _as_int(row.get("TotalExtentSize")),
                "original_bytes": _as_int(row.get("TotalOriginalSize")), "hot_bytes": _as_int(row.get("HotExtentSize")),
                "compressed_bytes": None,
                "retention_days": row.get("retention_days"),
            })
        return {**result, "tables": tables, "truncated": len(rows) > TABLE_INVENTORY_LIMIT,
                "status": "cached", "checked_at": time.time(), "attempted_at": attempted, "last_error": None}
    except Exception as exc:  # noqa: BLE001 - permissions and metadata availability vary by cluster
        return {**result, "status": "stale" if result["checked_at"] is not None else "error",
                "attempted_at": attempted, "last_error": _one_line(str(exc), 300) or "Table metadata read failed"}


def _health_kusto_capacity(reader, previous: dict | None = None) -> dict | None:
    result = dict(previous or {})
    if time.time() - result.get("attempted_at", 0) < DB_STATS_TTL_S:
        return result
    metadata = reader_feature(reader, "health_metadata")
    if metadata is None:
        return result or None
    result["attempted_at"] = time.time()
    try:
        row = metadata.ingestion_capacity()
        if row.get("Total") is None:
            raise ValueError("Ingestion capacity was not reported by the cluster")
        result.update(
            total=int(row["Total"]), in_use=_as_int(row.get("Consumed")), available=_as_int(row.get("Remaining")),
            checked_at=time.time(), status="cached", last_error=None,
        )
    except Exception as exc:  # noqa: BLE001 - optional management read; keep its last successful sample
        result.update(status="stale" if result.get("checked_at") else "error", last_error=mask_secrets(str(exc)))
    return result


def _health_kusto_policies(reader, previous: dict | None = None) -> dict | None:
    """Read database policies only on the existing background health refresh."""
    result = dict(previous or {})
    if time.time() - result.get("attempted_at", 0) < 300:
        return result
    metadata = reader_feature(reader, "health_metadata")
    if metadata is None:
        return result or {"status": "pending", "batching": None, "streaming": None}

    result.update(attempted_at=time.time(), last_error=None, status="ok")
    for key in ("batching", "streaming"):
        try:
            result[key] = metadata.database_policy(key)
        except Exception as exc:  # noqa: BLE001 - policy permissions do not prevent client health
            result.setdefault(key, None)
            result.update(last_error=mask_secrets(str(exc)), status="error")
    if result["status"] == "ok":
        result["checked_at"] = time.time()
    return result


def _mb_text(mb: float | None) -> str:
    if mb is None:
        return "n/a"
    return f"{mb / 1000:.1f} GB" if mb >= 1000 else f"{mb:.0f} MB"


def _anomaly_detail(kind: str, a: dict, proc: Any) -> str:
    if kind == "high_memory":
        detail = _mb_text(_as_number(a.get("actual_mb")))
        expected = _as_number(a.get("expected_mb"))
        return detail + (f", expected {_mb_text(expected)}" if expected is not None else "")
    if kind == "cpu_spike":
        cpu = _as_number(_proc_field(proc, "cpu_pct"))
        return f"{cpu:.0f}% CPU" if cpu is not None else ""
    if kind == "zombie":
        return f"its parent is gone (parent PID {a.get('ppid')}), risk {a.get('risk') or 'n/a'}"
    if kind == "known_leak":
        return str(a.get("pattern") or "")
    if kind == "high_file_count":
        files = _proc_field(proc, "file_count")
        return f"{files} open files" if files else ""
    if kind == "long_running":
        up = _as_number(_proc_field(proc, "uptime_s"))
        return f"running for {up / 60:.0f} min" if up else ""
    return ""


def _anomaly(raw: Any, proc: Any) -> dict:
    """One anomaly the process scan found, as a label, a severity and a sentence."""
    a = raw if isinstance(raw, dict) else {"type": str(raw)}
    kind = str(a.get("type") or "unknown")
    label, severity = _ANOMALY_KINDS.get(kind, (kind.replace("_", " ").capitalize(), "warn"))
    detail = _anomaly_detail(kind, a, proc)
    return {"kind": kind, "severity": severity, "label": label, "text": f"{label}: {detail}" if detail else label}


_parent_pid_lock = threading.Lock()


_parent_pid_snapshot: tuple[float, dict[int, int]] | None = None


PARENT_PID_TTL_S = 5.0


def _parent_pid(pid: int) -> int | None:
    """The parent of a process the scan reported without one. None when it is gone."""
    from .. import platforms

    if platforms.IS_WINDOWS:
        global _parent_pid_snapshot
        with _parent_pid_lock:
            now = time.monotonic()
            if _parent_pid_snapshot is None or now - _parent_pid_snapshot[0] >= PARENT_PID_TTL_S:
                try:
                    parents = platforms.cached_windows_process_parents(now=now, max_age=PARENT_PID_TTL_S)
                except OSError as exc:
                    logger.warning("Cannot read Windows process parents: %s", exc)
                    parents = {}
                _parent_pid_snapshot = (now, parents)
            return _parent_pid_snapshot[1].get(pid)
    try:
        import psutil

        return psutil.Process(pid).ppid()
    except Exception:  # noqa: BLE001 - a process can end between the scan and this read
        return None


def _process_row(proc: Any, tool_id: str, live: dict | None) -> dict:
    zombie = _proc_field(proc, "zombie_risk") or ""
    ppid = _as_int((live or {}).get("ppid"))
    if ppid is None:
        ppid = _as_int(_proc_field(proc, "ppid"))
    return {
        "pid": _as_int(_proc_field(proc, "pid")),
        "ppid": ppid,
        "parent_name": None,
        "name": _proc_field(proc, "name") or "",
        "tool": tool_id,
        "process_type": _proc_field(proc, "process_type") or None,
        "cpu_pct": _as_number(_proc_field(proc, "cpu_pct")),
        "mem_mb": _as_number(_proc_field(proc, "mem_mb")),
        "cmdline": _one_line(_proc_field(proc, "cmdline") or (live or {}).get("exe"), MACHINE_CMDLINE_CHARS) or None,
        "anomalies": [_anomaly(a, proc) for a in (_proc_field(proc, "anomalies") or [])],
        "zombie_risk": zombie if zombie and zombie != "none" else None,
        "cleanup_cmd": mask_secrets(_proc_field(proc, "cleanup_cmd") or "") or None,
    }


def _machine_tools(snapshot: Any) -> list[Any]:
    return [tool for tool in getattr(snapshot, "tools", None) or [] if not getattr(tool, "meta", False)]


def machine_processes(snapshot: Any) -> list[dict]:
    """Every AI-tool process the scan and the live monitor report, with its parent and its anomalies."""
    tools = _machine_tools(snapshot)
    live_by_pid: dict[int, dict] = {}
    for tool in tools:
        for p in (getattr(tool, "live", None) or {}).get("processes") or []:
            pid = _as_int(p.get("pid")) if isinstance(p, dict) else None
            if pid is not None:
                live_by_pid.setdefault(pid, {**p, "tool": getattr(tool, "tool", "")})
    rows: dict[int, dict] = {}
    for tool in tools:
        for proc in getattr(tool, "processes", None) or []:
            pid = _as_int(_proc_field(proc, "pid"))
            if pid is not None and pid not in rows:
                rows[pid] = _process_row(proc, getattr(tool, "tool", ""), live_by_pid.get(pid))
    # The live monitor also follows child processes that the scan does not match.
    for pid, p in live_by_pid.items():
        if pid not in rows:
            rows[pid] = _process_row(p, p["tool"], p)
    names = {pid: r["name"] for pid, r in rows.items()}
    for pid, row in rows.items():
        if row["ppid"] is None:
            row["ppid"] = _parent_pid(pid)
        row["parent_name"] = names.get(row["ppid"]) if row["ppid"] is not None else None
    out = sorted(rows.values(), key=lambda r: (-(r["cpu_pct"] or 0.0), -(r["mem_mb"] or 0.0), r["pid"]))
    return out[:MAX_LIST_ROWS]


def machine_alerts(processes: list[dict]) -> list[dict]:
    """Machine-wide findings over the processes: subagent RAM, orphaned MCP servers, headless browsers, anomalies."""
    alerts = []
    subagents = [p for p in processes if (p["process_type"] or "").lower() in _SUBAGENT_TYPES]
    sub_mb = sum(p["mem_mb"] or 0.0 for p in subagents)
    if sub_mb > SUBAGENT_RAM_ALERT_MB:
        alerts.append(
            {
                "kind": "subagent_ram",
                "severity": "crit",
                "text": f"Subagents use {_mb_text(sub_mb)} of RAM, more than 2 GB",
                "detail": f"{len(subagents)} subagent {'process' if len(subagents) == 1 else 'processes'}. Stop the subagents that are no longer needed.",
                "pids": [p["pid"] for p in subagents],
                "tool": _one_tool(subagents),
                "action": None,
            }
        )
    orphans = [
        p
        for p in processes
        if (p["process_type"] or "").lower() == "mcp-server"
        and (p["ppid"] in _ORPHAN_PARENTS or any(a["kind"] == "zombie" for a in p["anomalies"]))
    ]
    if orphans:
        alerts.append(
            {
                "kind": "orphan_mcp",
                "severity": "warn",
                "text": f"{len(orphans)} MCP {'server has' if len(orphans) == 1 else 'servers have'} no parent process and may be orphaned",
                "detail": ", ".join(f"{p['name']} (PID {p['pid']})" for p in orphans[:10]),
                "pids": [p["pid"] for p in orphans],
                "tool": _one_tool(orphans),
                "action": _cleanup_of(orphans),
            }
        )
    headless = [
        p
        for p in processes
        if (p["process_type"] or "").lower() == "browser" or "headless" in (p["name"] or "").lower()
    ]
    if headless:
        alerts.append(
            {
                "kind": "headless_browser",
                "severity": "info",
                "text": f"{len(headless)} headless browser {'process' if len(headless) == 1 else 'processes'}. Check that they are still in use.",
                "detail": ", ".join(f"{p['name']} (PID {p['pid']}, {_mb_text(p['mem_mb'])})" for p in headless[:10]),
                "pids": [p["pid"] for p in headless],
                "tool": _one_tool(headless),
                "action": _cleanup_of(headless),
            }
        )
    flagged = [p for p in processes if p["anomalies"]]
    count = sum(len(p["anomalies"]) for p in flagged)
    if count > MANY_ANOMALIES:
        alerts.append(
            {
                "kind": "anomalies",
                "severity": "warn",
                "text": f"{count} process anomalies in {len(flagged)} processes",
                "detail": ", ".join(sorted({a["label"] for p in flagged for a in p["anomalies"]})),
                "pids": [p["pid"] for p in flagged],
                "tool": _one_tool(flagged),
                "action": None,
            }
        )
    for alert in alerts:
        alert["pid"] = alert["pids"][0] if len(alert["pids"]) == 1 else None
    return alerts


def _one_tool(processes: list[dict]) -> str | None:
    tools = {p["tool"] for p in processes}
    return next(iter(tools)) if len(tools) == 1 else None


def _cleanup_of(processes: list[dict]) -> str:
    """The catalog's cleanup command when the processes share one, else a kill of their PIDs."""
    commands = {p["cleanup_cmd"] for p in processes if p["cleanup_cmd"]}
    if len(commands) == 1 and all(p["cleanup_cmd"] for p in processes):
        return next(iter(commands))
    return "kill " + " ".join(str(p["pid"]) for p in processes)


def _monitor_section(snapshot: Any) -> dict:
    lm = getattr(snapshot, "live_monitor", None) or {}
    collectors = [
        {
            "name": name,
            "mode": d.get("mode") or None,
            "status": d.get("status") or "unknown",
            "detail": d.get("detail") or None,
            "last_run_at": _as_number(d.get("last_run_at")) or None,
        }
        for name, d in sorted((lm.get("diagnostics") or {}).items())
        if isinstance(d, dict)
    ]
    roots = [{"kind": "workspace", "path": p} for p in lm.get("workspace_paths") or []]
    roots += [{"kind": "state", "path": p} for p in lm.get("state_paths") or []]
    per_tool = []
    for tool in _machine_tools(snapshot):
        live = getattr(tool, "live", None)
        if not live:
            continue
        tokens = live.get("token_estimate") or {}
        mcp = live.get("mcp")
        size_mb = _as_number(live.get("workspace_size_mb"))
        est = None
        if tokens:
            est = int((_as_number(tokens.get("input_tokens")) or 0) + (_as_number(tokens.get("output_tokens")) or 0))
        per_tool.append(
            {
                "tool": tool.tool,
                "label": getattr(tool, "label", "") or _label(tool.tool),
                "sessions": _as_int(live.get("session_count")),
                "pids": _as_int(live.get("pid_count")),
                "inbound_bps": _as_number(live.get("inbound_rate_bps")),
                "outbound_bps": _as_number(live.get("outbound_rate_bps")),
                "est_tokens": est,
                "est_confidence": _as_number(tokens.get("confidence")) if tokens else None,
                "est_source": tokens.get("source") or None,
                "mcp_loop": {
                    "detected": bool(mcp.get("detected")),
                    "loops": _as_int(mcp.get("loops")) or 0,
                    "confidence": _as_number(mcp.get("confidence")),
                }
                if isinstance(mcp, dict)
                else None,
                "file_events": _as_int(live.get("file_events")),
                "files_touched": _as_int(live.get("files_touched")),
                "cpu_pct": _as_number(live.get("cpu_percent")),
                "cpu_peak": _as_number(live.get("peak_cpu_percent")),
                "workspace_bytes": int(size_mb * 1048576) if size_mb is not None else None,
                "workspaces": list(live.get("workspaces") or [])[:5],
                "last_seen": _as_number(live.get("last_seen_at")) or None,
            }
        )
    return {"collectors": collectors, "roots": roots, "per_tool": per_tool}


def _db_stats_sample(db: Any, reader) -> dict:
    """Keep the original scan interval with the counts, including after a failed refresh."""
    from .projections.health import logical_stats

    if reader is None:
        return {}
    key = reader
    with _health_cache_lock:
        cached = _db_stats_memo.get(key)
        if cached and time.monotonic() - cached[0] < _volume_interval(db):
            return cached[1]
        if key in _db_stats_inflight:
            return cached[1] if cached else {}
        _db_stats_inflight.add(key)
    started = time.time()
    try:
        stats = logical_stats(reader)
        if not any(k.endswith("_count") and isinstance(v, int) for k, v in stats.items()):
            raise ValueError("Store statistics did not return row counts")
    except Exception:  # noqa: BLE001 - a busy or damaged store still answers the rest
        logger.debug("History stats failed", exc_info=True)
        sample = dict(cached[1]) if cached else {}
        sample.update(attempted_at=started, last_error="Could not read history counts",
                      status="stale" if sample.get("checked_at") else "error")
    else:
        sample = {"stats": stats, "started_at": started, "checked_at": time.time(), "attempted_at": started,
                  "last_error": None, "status": "cached"}
    with _health_cache_lock:
        _db_stats_memo[key] = (time.monotonic(), sample)
        _db_stats_inflight.discard(key)
    return sample


def _own_process() -> dict:
    try:
        import psutil

        proc = psutil.Process(os.getpid())
        return {"threads": proc.num_threads(), "uptime_s": round(time.time() - proc.create_time(), 1)}
    except Exception:  # noqa: BLE001 - psutil is optional on some platforms
        return {"threads": None, "uptime_s": None}


def _host_activity(snapshot: Any) -> dict:
    return {
        "active_sessions": getattr(snapshot, "total_live_sessions", None),
        "active_processes": getattr(snapshot, "total_processes", None),
        "inbound_bps": getattr(snapshot, "total_live_inbound_rate_bps", None),
        "outbound_bps": getattr(snapshot, "total_live_outbound_rate_bps", None),
        "activity_at": getattr(snapshot, "timestamp", None),
    }


def _health_resources(snapshot: Any, usage: dict, cluster: dict | None) -> dict:
    cores = getattr(snapshot, "cpu_per_core", None) or []
    host_cpu = round(sum(cores) / len(cores), 1) if cores else None
    cpu_at = getattr(snapshot, "timestamp", None) if cores else None
    memory = usage["host_memory"]
    memory_at = usage["checked_at"] if memory["memory_total_bytes"] is not None else None
    daemon = {"cpu_percent": usage.get("daemon_cpu_percent"), "rss_bytes": usage.get("daemon_memory_rss_bytes"),
              "threads": usage.get("threads")}
    return {
        "daemon": {
            **daemon, "checked_at": usage["checked_at"] if any(v is not None for v in daemon.values()) else None,
            "scope": "aictl daemon process only, excluding children; 100% CPU is one logical core",
        },
        "host": {
            "cpu_percent": host_cpu, **memory, **_host_activity(snapshot),
            "cpu_checked_at": cpu_at, "memory_checked_at": memory_at,
            "checked_at": max((t for t in (cpu_at, memory_at) if t is not None), default=None),
            "scope": "Whole daemon host. CPU is the mean across logical cores in the monitor snapshot; "
                     "memory used is total minus available. checked_at is the latest component sample.",
        },
        "cluster": cluster,
    }


def _sink_section(store: Any) -> dict | None:
    sink = getattr(store, "_sink", None)
    if sink is None:
        return None
    try:
        s = sink.stats()
    except Exception:  # noqa: BLE001 - a sink failure must not take the board down
        return None
    return {
        "emitted": s.get("total_emitted"),
        "flushed": s.get("total_flushed"),
        "dropped": s.get("total_dropped"),
        "flood": bool(s.get("is_flooding")),
        "flood_drops": s.get("flood_drop_count"),
        "buffered": s.get("buffer_size"),
        "tracked": s.get("metrics_tracked"),
    }


def _quality_rows(reader) -> list[dict]:
    from .projections.history import _json_object

    if reader is None:
        return []
    try:
        rows = reader.read("health.quality", {**local_scope(), "limit": MACHINE_QUALITY_ROWS}).rows
    except Exception:  # noqa: BLE001 - an old store without the table still answers the rest
        return []
    out = []
    for r in rows:
        detail = _json_object(r.get("detail"))
        out.append(
            {
                "ts": r.get("updated_at"),
                "component": r.get("component") or "",
                "source": r.get("source") or "",
                "kind": r.get("kind") or "",
                "status": r.get("status") or "",
                "severity": r.get("severity") or "",
                "text": mask_secrets(r.get("message") or ""),
                "error": mask_secrets(str(detail.get("error"))) if detail.get("error") else None,
                "tool": detail.get("tool") or None,
                "count": r.get("count"),
                "last_ok": r.get("last_ok_at") or None,
                **_backlog(detail),
            }
        )
    return out


def _backlog(detail: dict) -> dict:
    """The files an ingester has not read yet, by tool, when its status record reports them."""
    waiting = detail.get("files_waiting")
    older = detail.get("older_files_waiting")
    out: dict = {}
    if isinstance(waiting, dict):
        out["files_waiting"] = {str(tool): n for tool, n in waiting.items() if isinstance(n, int) and not isinstance(n, bool)}
    if isinstance(older, int) and not isinstance(older, bool):
        out["older_files_waiting"] = older
    return out


def _ingester_rows(handles: Any, quality: list[dict]) -> list[dict]:
    from .ingester_runner import collect_status

    by_component = {q["component"]: q for q in reversed(quality)}  # newest quality row first
    out = []
    for h in collect_status(handles):
        name = h.get("name") or ""
        q = by_component.get(f"ingester:{name}") or by_component.get(name)
        polled = h.get("last_poll_ts") or None
        last_ok = h.get("last_success_at")
        if not h.get("enabled"):
            status = "off"
        elif not h.get("source_exists"):
            status = "no source"
        elif h.get("unavailable"):
            status, last_ok = "unavailable", None
        elif h.get("last_error"):
            status = "failed"
        elif (
            q and q["status"] not in ("ok", "") and q["severity"] in ("error", "warning")
            and not (h.get("last_success_started_at") and h["last_success_started_at"] > (q.get("ts") or 0))
        ):
            # Some adapters return zero after recording a read error. A normal
            # return from that same poll is not evidence that the source recovered.
            status = q["status"]
            if last_ok and last_ok >= (q.get("ts") or 0):
                last_ok = None
        elif h.get("poll_in_flight"):
            status = "running"
        elif h.get("last_success_at"):
            status = "ok"
        else:
            status = "waiting"
        failing = status not in ("ok", "off", "waiting", "running")
        out.append(
            {
                "name": name,
                "status": status,
                "last_ok": last_ok,
                "last_poll": polled,
                "error": mask_secrets(str(h.get("unavailable") or h.get("last_error") or (q or {}).get("error") or (q or {}).get("text") or "")) if failing else None,
                "rows": h.get("last_poll_inserted") if last_ok else None,
                "rows_total": h.get("rows_ingested_total"),
                "source": _display_folder(Path(h["source_path"])) if h.get("source_path") else None,
                "source_path": h.get("source_path"),
                "poll_in_flight": h.get("poll_in_flight"),
                "last_poll_duration_ms": h.get("last_poll_duration_ms"),
            }
        )
    return out


def _freshness(snapshot: Any) -> list[dict]:
    telemetry = {t.get("tool"): t for t in getattr(snapshot, "tool_telemetry", None) or [] if isinstance(t, dict)}
    out = []
    for tool in _machine_tools(snapshot):
        if tool.tool in _NO_FRESHNESS_TOOLS:
            continue
        live = getattr(tool, "live", None) or {}
        telem = telemetry.get(tool.tool) or {}
        errors = [e for e in telem.get("errors") or [] if isinstance(e, dict)]
        estimate = live.get("token_estimate") or {}
        confidence = _as_number(telem.get("confidence")) or _as_number(estimate.get("confidence"))
        out.append(
            {
                "tool": tool.tool,
                "label": getattr(tool, "label", "") or _label(tool.tool),
                "last_seen": _as_number(live.get("last_seen_at")) or None,
                "source": telem.get("source") or ("live-monitor" if live.get("session_count") else "discovery"),
                "confidence": confidence or None,
                "errors": len(errors),
                "last_error": _one_line(errors[0].get("message"), 200) if errors else None,
            }
        )
    return out


def _code_changed_at() -> float | None:
    from ..code_age import code_changed_at

    return code_changed_at()


def _process_started_at() -> float:
    from ..code_age import STARTED_AT

    return STARTED_AT


# The hook counts are one query per store, 80-300 ms here; the machine panel asks every tick.
HOOKS_TTL_S = 15.0


_HOOKS_MEMO: dict[tuple, tuple[float, dict]] = {}


def _hooks_by_tool(reader, now: float) -> dict[str, dict]:
    """Hook events each tool sent in the last 24 hours: ``{tool: {count, last_fire_ts}}``. Kept HOOKS_TTL_S."""
    from .hooks_status import _activity, _hook_event_counts

    key = reader
    hit = _HOOKS_MEMO.get(key)
    if hit is not None and 0 <= now - hit[0] < HOOKS_TTL_S:
        return hit[1]
    try:
        result = _hook_event_counts(_activity(reader, now - 86400, counts_only=True))["by_tool"]
    except StoreError:
        return {}
    _HOOKS_MEMO.clear()
    _HOOKS_MEMO[key] = (now, result)
    return result


def _otel_setup(port: int | None) -> dict:
    """Per tool, whether the variable that sends its OTel to aictl is set: Copilot CLI's only for now."""
    from ..monitoring.tool_config import copilot_cli_otel_endpoint

    try:
        return {"copilot-cli": copilot_cli_otel_endpoint(port)}
    except OSError:
        return {}


def _collection_health(
    db: Any,
    store: Any,
    *,
    otel: Any,
    ingesters: Any,
    stream_clients: int | None,
    now: float,
    port: int | None,
    cached: dict,
) -> dict:
    snapshot = getattr(store, "snapshot", None)
    usage = _self_usage()
    reader = HistoryScope.local(store).reader
    sample = cached.get("volume", {})
    stats = sample.get("stats", {})
    counts = {k[: -len("_count")]: v for k, v in stats.items() if k.endswith("_count") and isinstance(v, int)}
    quality = cached.get("quality", [])
    try:
        otel_status = otel.status() if otel is not None else None
    except Exception:  # noqa: BLE001 - the receiver is optional
        otel_status = None
    snap_ts = _as_number(getattr(snapshot, "timestamp", None)) if snapshot is not None else None
    payload = {
        "generated_at": now,
        "monitor": _monitor_section(snapshot),
        "pipeline": {
            "self": {
                "pid": os.getpid(),
                "cpu": usage.get("cpu_percent"),
                "rss": usage.get("memory_rss_bytes"),
                "threads": usage["threads"],
                "uptime_s": usage["uptime_s"],
                "db_bytes": stats.get("file_size_bytes") if isinstance(getattr(db, "_path", None), Path) else None,
                "db_rows": sum(counts.values()) if counts else None,
                "db_tables": counts,
                "writes": db.running_writes() if hasattr(db, "running_writes") else [],
                # The code on disk changed after this daemon started: it needs a restart.
                "code_changed_at": _code_changed_at(),
                "started_at": _process_started_at(),
            },
            "sink": _sink_section(store),
            "otel_receiver": otel_status,
            "otel_setup": _otel_setup(port),
            "hooks": cached.get("hooks", {}),
            "ingesters": _ingester_rows(ingesters, quality),
            "data_quality": quality,
            "freshness": _freshness(snapshot),
            "stream": {
                "connected_clients": stream_clients,
                "snapshot_ts": snap_ts,
                "snapshot_age_s": round(max(0.0, now - snap_ts), 1) if snap_ts else None,
            },
        },
    }
    payload["resources"] = _health_resources(snapshot, usage, cached.get("cluster_resources"))
    settings = reader_feature(reader, "connection_info")
    if settings is not None:
        payload["resources"]["host"]["node_id"] = settings.node_id
    return payload


def compute_health(
    db: Any,
    store: Any,
    *,
    otel: Any = None,
    ingesters: Any = None,
    stream_clients: int | None = None,
    port: int | None = None,
    http_reads: Any = None,
    http_writes: Any = None,
    now: float | None = None,
) -> dict:
    """Lightweight live collection health; no store query runs on this thread."""
    from urllib.parse import urlsplit, urlunsplit

    from .projections.health import store_health

    now = time.time() if now is None else now
    reader = HistoryScope.local(store).reader
    cached = _cached_health_data(db, now, reader)
    payload = _collection_health(
        db, store, otel=otel, ingesters=ingesters, stream_clients=stream_clients,
        now=now, port=port, cached=cached,
    )
    settings = reader_feature(reader, "connection_info")
    path = str(getattr(db, "_path", ":memory:"))
    kind = "kusto" if settings is not None else "memory"
    reads = http_reads.snapshot() if http_reads is not None else None
    writes = http_writes.snapshot() if http_writes is not None else None
    cluster_url = database = ingestion_mode = capacity = commands = pending = None
    operations = None
    pending_groups: dict[str, int] = {}
    pending_history_groups: dict[str, int] = {}
    ingestion_details = None
    scope = "daemon HTTP GET/POST requests, including dashboard assets; not SQL operations"
    if settings is not None:
        parsed = urlsplit(settings.cluster)
        host = parsed.hostname or ""
        if ":" in host:
            host = f"[{host}]"
        netloc = host + (f":{parsed.port}" if parsed.port else "")
        cluster_url = urlunsplit((parsed.scheme, netloc, parsed.path.rstrip("/"), "", ""))
        database, ingestion_mode = settings.database, settings.ingestion
        transport = reader_feature(reader, "transport_diagnostics", store_for(store).writer) or {}
        ingester = transport.get("ingester")
        reads = transport["reads"].snapshot() if transport.get("reads") is not None else None
        commands = transport["commands"].snapshot() if transport.get("commands") is not None else None
        operations = getattr(ingester, "operations", None)
        writes = operations.snapshot() if operations is not None else None
        children = getattr(ingester, "ingesters", {})
        capacity = {"total": None, "in_use": None, "available": None, "checked_at": None,
                    "status": "pending", "last_error": None, **(cached.get("capacity") or {})}
        queued = children.get("queued") if children else ingester
        lock = getattr(queued, "_lock", None)
        if lock is not None and hasattr(queued, "_pending_rows"):
            with lock:
                pending = queued._pending_rows
                from ..health import traffic_group

                for submission in queued._pending.values():
                    group_id = traffic_group(submission.table)
                    pending_groups[group_id] = pending_groups.get(group_id, 0) + len(submission.markers)
                pending_history_groups = dict(pending_groups)
        ingestion_details = {
            "mode": settings.ingestion,
            "default_mode": settings.default_ingestion,
            "table_overrides": dict(settings.table_ingestion),
            "client_limits": transport.get("client_limits", {}),
            "batches": {key: (writes or {}).get(key) for key in ("successful_requests", "avg_rows", "avg_bytes", "last_rows", "last_bytes")},
            "batch_scope": "acknowledged client upload batches, not DM merged ingestion batches",
        }
        scope = "this process's Kusto SDK request attempts; ingestion volume is acknowledged submission"
    operation_snapshots = [v for v in (reads, writes, commands) if v is not None]
    for operation in operation_snapshots:
        if operation.get("last_error"):
            operation["last_error"] = mask_secrets(operation["last_error"])
    success = max((v.get("last_success_at") or 0 for v in operation_snapshots), default=0) or None
    degraded = getattr(db, "degraded_reason", "") if db is not None else ""
    failures = [v for v in operation_snapshots if (v.get("last_error_at") or 0) > (v.get("last_success_at") or 0)]
    failure = max(failures, key=lambda v: v["last_error_at"], default={})
    state = "degraded" if degraded or failures else "ok" if success else "unknown"
    sink = store_for(store).otlp
    try:
        otel_sink = sink.stats() if sink is not None else None
    except Exception:  # noqa: BLE001 - optional sink diagnostics cannot break health
        otel_sink = None
    if otel_sink is not None and otel_sink.get("last_error"):
        otel_sink["last_error"] = mask_secrets(str(otel_sink["last_error"]))
    if otel_sink is not None and otel_sink.get("pending_rows") is not None:
        pending_groups["otel"] = pending_groups.get("otel", 0) + otel_sink["pending_rows"]
    if ingestion_details is not None:
        policies = dict(cached.get("policies") or {"status": "pending", "batching": None, "streaming": None})
        policies["age_s"] = max(0.0, now - policies["checked_at"]) if policies.get("checked_at") else None
        policies.setdefault("checked_at", None)
        policies.setdefault("attempted_at", None)
        policies.setdefault("last_error", None)
        policies["batching_scope"] = "DM queued ingestion database policy"
        policies["streaming_scope"] = "engine streaming ingestion database policy"
        ingestion_details["policies"] = policies
    from ..health import ingestion_traffic, traffic_groups

    transport_traffic = ingestion_traffic(
        operations, settings, pending_history_rows=pending, pending_history_groups=pending_history_groups,
    )
    for mode_stats in (transport_traffic or {}).values():
        if mode_stats.get("last_error"):
            mode_stats["last_error"] = mask_secrets(mode_stats["last_error"])
    payload["store"] = {
        **store_health(store),
        "kind": kind,
        "destination": f"{cluster_url}/{database}" if cluster_url else path,
        "cluster_url": cluster_url,
        "database": database,
        "ingestion_mode": ingestion_mode,
        "ingestion_details": ingestion_details,
        "traffic_groups": traffic_groups(operations, settings, pending_groups),
        "ingestion_traffic": transport_traffic,
        "reads": reads,
        "writes": writes,
        "commands": commands,
        "commands_scope": "management requests include inline ingestion; do not add them to writes",
        "measurement_scope": scope,
        "ingestion_capacity": capacity,
        "capacity_scope": "cluster-wide ingestion slots at the last successful .show capacity ingestions read",
        "table_inventory": cached.get("table_inventory") or _empty_table_inventory(reader),
        "queued_history_rows_unconfirmed": pending,
        "otel_sink": otel_sink,
        "volume": {
            "rows": payload["pipeline"]["self"]["db_rows"],
            "bytes": payload["pipeline"]["self"]["db_bytes"],
            "tables": payload["pipeline"]["self"]["db_tables"],
            **{k: cached.get("volume", {}).get(k) for k in ("started_at", "checked_at", "attempted_at", "last_error")},
            "scope": "Current logical rows of selected history tables (store stats names); excludes raw OTel export "
                     "tables and metric samples. See physical ADX table inventory for sample volume. "
                     "Not physical extent rows, submitted rows, or a cluster-wide total.",
            "status": cached.get("volume", {}).get("status", "pending"),
            "refresh_interval_s": _volume_interval(db),
        },
        "storage_budget_bytes": getattr(db, "_budget_bytes", None) if kind != "kusto" else None,
        "counter_scope": "process lifetime; reset on daemon restart; rates use up to the last 60 seconds",
        "write_volume_scope": (
            "acknowledged JSON payload rows and ASCII bytes, excluding command headers; "
            "queued acknowledgements do not confirm queryability"
            if settings else "HTTP requests only; SQL rows and payload bytes are not measured"
        ),
        "health": {
            "state": state,
            "checked_at": now,
            "last_success_at": success,
            "last_error": mask_secrets(degraded) if degraded else failure.get("last_error"),
            "scope": "client operations only; not cluster-wide health" if settings else scope,
        },
    }
    return payload


def node_runtime_sample(store: Any, otel_receiver: Any, ingesters: Any) -> dict:
    """Report operational measurements; paths, command lines and error text stay local."""
    from .node_views import agent_inventory

    usage = _self_usage()
    otel = otel_receiver.status()
    diagnostics = (getattr(store.snapshot, "live_monitor", None) or {}).get("diagnostics", {})
    return {
        "agents": agent_inventory(getattr(store, "live_hub", None), time.time()),
        "daemon": {"cpu_percent": usage.get("daemon_cpu_percent"), "rss_bytes": usage.get("daemon_memory_rss_bytes"),
                   "threads": usage.get("threads"), "uptime_s": usage.get("uptime_s")},
        "sink": _sink_section(store),
        "otel_receiver": {k: otel.get(k) for k in ("metrics_received", "events_received", "errors", "dropped", "last_receive_at", "active")},
        "collectors": [{"name": name, "status": d.get("status"), "mode": d.get("mode")}
                       for name, d in diagnostics.items() if isinstance(d, dict)],
        "ingesters": [{k: row.get(k) for k in ("name", "status", "last_ok", "last_poll")} for row in _ingester_rows(ingesters, [])],
    }


def live_health_and_machine(store: Any, **health_options: Any) -> tuple[dict, dict]:
    health = compute_health(store, store, **health_options)
    # A monitor's token/file estimates are not queryable historical activity.
    monitor = health.get("monitor") or {}
    monitor["per_tool"] = [
        {
            key: value
            for key, value in row.items()
            if key in {
                "tool", "label", "sessions", "pids", "inbound_bps", "outbound_bps",
                "cpu_pct", "cpu_peak", "workspaces", "last_seen",
            }
        }
        for row in monitor.get("per_tool") or []
    ]
    snapshot = store.snapshot
    processes = machine_processes(snapshot)
    for process in processes:
        process["cmdline"] = process["cleanup_cmd"] = None
    return health, {
        "generated_at": health["generated_at"],
        "monitor": monitor,
        "processes": processes,
        "cpu_per_core": list(getattr(snapshot, "cpu_per_core", None) or []),
        "cpu_cores": getattr(snapshot, "cpu_cores", None),
        "alerts": machine_alerts(processes),
    }


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
