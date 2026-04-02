# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Collector implementations for live monitoring.

Every collector inherits from ``BaseCollector`` and implements ``run()``.

Collectors have two output channels:
  * ``self.correlator``  → SessionCorrelator typed methods (session tracking)
  * ``self.sink_emit()`` → SampleSink (persistence to SQLite)
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from typing import Any, ClassVar, TYPE_CHECKING

from ...data.schema import metric_name as M

if TYPE_CHECKING:
    from ..correlator import SessionCorrelator
    from ..config import MonitorConfig


class BaseCollector(ABC):
    """Async collector base with correlator + sink integration."""

    name: ClassVar[str] = "collector"

    def __init__(self, config: "MonitorConfig | None" = None) -> None:
        self._sink: Any | None = None
        self._correlator: SessionCorrelator | None = None
        self.config = config

    def set_sink(self, sink: Any) -> None:
        """Inject a SampleSink for direct metric persistence."""
        self._sink = sink

    def set_correlator(self, correlator: "SessionCorrelator") -> None:
        """Inject the correlator for typed session tracking calls."""
        self._correlator = correlator

    @property
    def correlator(self) -> "SessionCorrelator | None":
        return self._correlator

    def sink_emit(self, metric: str, value: float,
                  tags: dict[str, Any] | None = None) -> None:
        """Emit a metric sample through the sink (if available)."""
        if self._sink is not None:
            self._sink.emit(metric, value, tags)

    def sink_emit_if_changed(self, metric: str, value: float,
                              tags: dict[str, Any] | None = None) -> None:
        """Emit only if value changed (skip DB write for unchanged)."""
        if self._sink is not None:
            self._sink.emit_if_changed(metric, value, tags)

    def sink_emit_cpu(self, metric: str, value: float,
                      tags: dict[str, Any] | None = None) -> None:
        """Emit CPU metric with sensitivity (ratio 0-1, rounded to 0.1%)."""
        if self._sink is not None:
            self._sink.emit_with_sensitivity(
                metric, value, tags,
                abs_threshold=0.10,   # 10% of a core always emits
                max_threshold=0.05,   # at t=0, need >5% diff; decays to 0
                rounding=3,           # 0.1% precision
            )

    def sink_emit_memory(self, metric: str, value: float,
                         tags: dict[str, Any] | None = None) -> None:
        """Emit memory metric with sensitivity (bytes, rounded to 64KB)."""
        if self._sink is not None:
            # Round to nearest 64KB
            rounded = round(value / 65536) * 65536
            self._sink.emit_with_sensitivity(
                metric, rounded, tags,
                abs_threshold=1_048_576,  # 1MB always emits
                max_threshold=10_485_760, # at t=0, need >10MB diff; decays
                rounding=0,
            )

    @abstractmethod
    async def run(self) -> None:
        """Run collector until cancelled."""

    async def report_status(self, *, status: str, mode: str, detail: str) -> None:
        """Report collector health to correlator + sink."""
        if self._correlator:
            self._correlator.on_collector_status(self.name, status, mode, detail)
        self.sink_emit_if_changed(M("aictl.collector.status"),
                       1.0 if status == "active" else 0.0,
                       {"aictl.collector.name": self.name, "aictl.collector.mode": mode})

    async def sleep(self, seconds: float) -> None:
        await asyncio.sleep(seconds)
