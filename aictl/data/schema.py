# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Load metric, telemetry, and config schemas from YAML data files.

This module is the single import point for all schema-driven constants.
No Python file should hardcode metric names, telemetry field paths,
or tool config locations — they come from here.

Usage:
    from aictl.data.schema import METRICS, TELEMETRY_SOURCES, TOOL_CONFIGS
    from aictl.data.schema import metric_name  # helper for template metrics
"""

from __future__ import annotations

import functools
from pathlib import Path
from typing import Any

import yaml

_DATA_DIR = Path(__file__).parent


@functools.cache
def _load_yaml(name: str) -> dict:
    path = _DATA_DIR / name
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# ─── Metrics ─────────────────────────────────────────────────────

@functools.cache
def load_metrics() -> dict[str, dict]:
    """Load metrics.yaml → {metric_key: {unit, tags, description, ...}}."""
    return _load_yaml("metrics.yaml")


def metric_name(key: str, **kwargs: str) -> str:
    """Return the canonical metric name for a given key.

    With OTel conventions, metric names are stable strings — instance
    dimensions go in tags, not in the metric name.  The **kwargs are
    accepted for backward compatibility but ignored for the name.

    Examples:
        metric_name("process.cpu.utilization", pid="1234")
            → "process.cpu.utilization"  (pid goes in tags)
        metric_name("aictl.discovery.files")
            → "aictl.discovery.files"
        metric_name("aictl.collector.status", name="process:psutil")
            → "aictl.collector.status"  (name goes in tags)
    """
    # Validate the key exists in the schema (fail-fast in dev)
    if __debug__:
        metrics = load_metrics()
        if key not in metrics:
            import warnings
            warnings.warn(f"Unknown metric key: {key!r}", stacklevel=2)
    return key


def validate_metric(name: str) -> bool:
    """Check if a metric name matches a known definition."""
    return name in load_metrics()


# ─── Telemetry sources ───────────────────────────────────────────

@functools.cache
def load_telemetry_sources() -> dict[str, dict]:
    """Load telemetry-sources.yaml → {tool: {source_id, files, fields, ...}}."""
    return _load_yaml("telemetry-sources.yaml")


# ─── Tool configs ────────────────────────────────────────────────

@functools.cache
def load_tool_configs() -> dict[str, dict]:
    """Load tool-configs.yaml → {tool: {config_files, features, otel, ...}}."""
    return _load_yaml("tool-configs.yaml")


# ─── Convenience aliases ─────────────────────────────────────────

METRICS = load_metrics
TELEMETRY_SOURCES = load_telemetry_sources
TOOL_CONFIGS = load_tool_configs
