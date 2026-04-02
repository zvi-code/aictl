# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Shared view computation helpers for TUI, HTML, and web dashboards.

Extracts duplicated summary/formatting logic so each renderer
focuses only on its output format.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import DashboardTool


# ── Safe numeric parsing ─────────────────────────────────────────

def safe_float(val: str, default: float = 0.0) -> float:
    """Safely parse a numeric string that might have non-digit chars.

    Handles the common pattern ``p.cpu_pct.replace('.', '', 1).isdigit()``
    used across dashboard renderers.
    """
    try:
        if val and val.replace(".", "", 1).isdigit():
            return float(val)
    except (ValueError, TypeError, AttributeError):
        pass
    return default


# ── Per-tool summary ─────────────────────────────────────────────

@dataclass
class ToolSummary:
    """Pre-computed summary stats for a single tool."""

    tool: str
    label: str
    file_count: int
    total_tokens: int
    total_cpu: float
    total_mem: float
    process_count: int
    mcp_count: int
    has_live: bool


def compute_tool_summary(tr: DashboardTool) -> ToolSummary:
    """Compute summary stats from a DashboardTool.

    Used by TUI and HTML renderers to avoid duplicating CPU/mem/token
    aggregation logic.
    """
    total_tokens = sum(f.tokens for f in tr.files)
    total_cpu = sum(safe_float(p.cpu_pct) for p in tr.processes)
    total_mem = sum(safe_float(p.mem_mb) for p in tr.processes)
    return ToolSummary(
        tool=tr.tool,
        label=tr.label,
        file_count=len(tr.files),
        total_tokens=total_tokens,
        total_cpu=total_cpu,
        total_mem=total_mem,
        process_count=len(tr.processes),
        mcp_count=len(tr.mcp_servers),
        has_live=tr.live is not None and bool(tr.live),
    )


# ── Formatting helpers ───────────────────────────────────────────

def format_duration(dur_s: float) -> str:
    """Format seconds into a human-readable duration (e.g. '2m 15s')."""
    if dur_s < 60:
        return f"{dur_s:.0f}s"
    if dur_s < 3600:
        return f"{dur_s // 60:.0f}m {dur_s % 60:.0f}s"
    return f"{dur_s // 3600:.0f}h {(dur_s % 3600) // 60:.0f}m"
