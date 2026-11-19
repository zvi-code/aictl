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
import logging
import time
from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import TYPE_CHECKING, Any, ClassVar

from ...data.schema import metric_name as M
from ..pace import PACE

if TYPE_CHECKING:
    from ..config import MonitorConfig
    from ..correlator import SessionCorrelator

log = logging.getLogger(__name__)
MAX_DEFERRED_SAMPLES = 256


class BaseCollector(ABC):
    """Async collector base with correlator + sink integration."""

    name: ClassVar[str] = "collector"

    def __init__(self, config: MonitorConfig | None = None) -> None:
        self._sink: Any | None = None
        self._correlator: SessionCorrelator | None = None
        self.config = config
        self._pending_samples: list[tuple[str, float, dict[str, Any] | None, float]] = []

    def set_sink(self, sink: Any) -> None:
        """Inject a SampleSink for direct metric persistence."""
        self._sink = sink

    def set_correlator(self, correlator: SessionCorrelator) -> None:
        """Inject the correlator for typed session tracking calls."""
        self._correlator = correlator

    @property
    def correlator(self) -> SessionCorrelator | None:
        return self._correlator

    def _streams_on_event_loop(self) -> bool:
        """True when samples must be queued here and sent off the event loop as one Kusto batch."""
        return (
            self._sink is not None
            and getattr(self._sink, "streams_observations", False) is True
            and asyncio._get_running_loop() is not None
        )

    def _defer_on_event_loop(self, metric: str, value: float, tags: dict[str, Any] | None) -> bool:
        """Queue sample with its observation timestamp when streaming on an asyncio loop."""
        if self._streams_on_event_loop():
            self._pending_samples.append((metric, value, tags, time.time()))
            return True
        return False

    def sink_emit(self, metric: str, value: float, tags: dict[str, Any] | None = None) -> None:
        """Emit a metric sample through the sink (if available)."""
        if self._sink is not None:
            if self._defer_on_event_loop(metric, value, tags):
                return
            self._sink.emit(metric, value, tags)

    def sink_emit_if_changed(
        self, metric: str, value: float, tags: dict[str, Any] | None = None, *, gauge: bool = False
    ) -> None:
        """Emit only if value changed (skip DB write for unchanged)."""
        if self._sink is None:
            return
        if self._streams_on_event_loop():
            ts = time.time()
            if self._sink.admit_if_changed(metric, value, tags, ts, gauge=gauge):
                self._pending_samples.append((metric, value, tags, ts))
            return
        self._sink.emit_if_changed(metric, value, tags, gauge=gauge)

    def _sink_emit_sensitive(self, metric: str, value: float, tags: dict[str, Any] | None, **limits: Any) -> None:
        if self._streams_on_event_loop():
            ts = time.time()
            admitted = self._sink.admit_with_sensitivity(metric, value, tags, ts, **limits)
            if admitted is not None:
                self._pending_samples.append((metric, admitted, tags, ts))
            return
        self._sink.emit_with_sensitivity(metric, value, tags, **limits)

    def sink_emit_cpu(self, metric: str, value: float, tags: dict[str, Any] | None = None) -> None:
        """Emit CPU metric with sensitivity (ratio 0-1, rounded to 0.1%)."""
        if self._sink is not None:
            self._sink_emit_sensitive(
                metric,
                value,
                tags,
                abs_threshold=0.10,  # 10% of a core always emits
                max_threshold=0.05,  # at t=0, need >5% diff; decays to 0
                rounding=3,  # 0.1% precision
            )

    def sink_emit_memory(self, metric: str, value: float, tags: dict[str, Any] | None = None) -> None:
        """Emit memory metric with sensitivity (bytes, rounded to 64KB)."""
        if self._sink is not None:
            # Round to nearest 64KB
            rounded = round(value / 65536) * 65536
            self._sink_emit_sensitive(
                metric,
                rounded,
                tags,
                abs_threshold=1_048_576,  # 1MB always emits
                max_threshold=10_485_760,  # at t=0, need >10MB diff; decays
                rounding=0,
            )

    async def sink_flush_batch(
        self, samples: list[tuple[str, float, dict[str, Any] | None]] | None = None
    ) -> bool:
        """Send buffered and supplied samples off the event loop; log and degrade on failure."""
        if self._sink is None:
            self._pending_samples.clear()
            return True
        batch: list[tuple[str, float, dict[str, Any] | None]] = []
        if self._pending_samples:
            batch.extend(self._pending_samples)
            self._pending_samples.clear()
        if samples:
            batch.extend(samples)
        if not batch:
            return True
        try:
            await asyncio.to_thread(self._sink.emit_batch, batch)
            return True
        except Exception as exc:
            log.warning("Collector %s sample batch delivery failed: %s", self.name, exc)
            if hasattr(self._sink, "record_data_quality"):
                await asyncio.to_thread(
                    self._sink.record_data_quality,
                    f"collector:{self.name}",
                    "degraded",
                    kind="collector",
                    severity="warning",
                    message=f"Sample batch delivery failed: {type(exc).__name__}",
                    detail={"error": str(exc), "batch_size": len(batch)},
                )
            return False

    @abstractmethod
    async def run(self) -> None:
        """Run collector until cancelled."""

    async def report_status(self, *, status: str, mode: str, detail: str) -> None:
        """Report collector health to correlator + sink."""
        if self._correlator:
            self._correlator.on_collector_status(self.name, status, mode, detail)
        if self._sink is not None and hasattr(self._sink, "record_data_quality"):
            await asyncio.to_thread(
                self._sink.record_data_quality,
                f"collector:{self.name}",
                "ok" if status == "active" else "degraded",
                kind="collector",
                severity="info" if status == "active" else "warning",
                message=detail,
                detail={"status": status, "mode": mode},
            )
        self.sink_emit_if_changed(
            M("aictl.collector.status"),
            1.0 if status == "active" else 0.0,
            {"aictl.collector.name": self.name, "aictl.collector.mode": mode},
        )
        if self._pending_samples:
            await self.sink_flush_batch()

    async def sleep(self, seconds: float) -> None:
        if self._pending_samples:
            await self.sink_flush_batch()
        await asyncio.sleep(seconds)

    async def sleep_paced(self, seconds: float) -> None:
        """Sleep for ``seconds`` times the current pace; ends early when a client attaches."""
        if self._pending_samples:
            await self.sink_flush_batch()
        waited = 0.0
        while waited < seconds * PACE.factor():
            step = min(1.0, max(seconds, 0.01))
            await asyncio.sleep(step)
            waited += step


# Seconds between full discovery scans at full pace.
DISCOVERY_INTERVAL_S = 30.0


# ── Collector registry ───────────────────────────────────────────────────────

# Registry: name → (factory_callable, config_check)
# config_check is a callable(MonitorConfig) → bool that determines if collector is enabled
_COLLECTOR_REGISTRY: dict[str, tuple[type | Callable, Callable]] = {}


def register_collector(
    name: str,
    cls: type | Callable,
    enabled_check: Callable[[MonitorConfig], bool] = lambda cfg: True,
) -> None:
    """Register a collector class (or factory) with the registry."""
    _COLLECTOR_REGISTRY[name] = (cls, enabled_check)


def build_collectors(config: MonitorConfig) -> list[BaseCollector]:
    """Build all enabled collectors from the registry."""
    collectors: list[BaseCollector] = []
    for _name, (cls_or_factory, enabled_check) in _COLLECTOR_REGISTRY.items():
        if enabled_check(config):
            collectors.append(cls_or_factory(config))
    return collectors


def _register_builtins() -> None:
    """Register all built-in collectors. Called once at import time."""
    from .process import PsutilProcessCollector, WatchdogFileCollector
    from .telemetry import StructuredTelemetryCollector

    # _select_network_collector lives in runtime; import lazily to avoid circular dep
    def _network_factory(config: MonitorConfig) -> BaseCollector:
        from ..runtime import _select_network_collector

        return _select_network_collector(config)

    def _discovery_factory(config: MonitorConfig) -> BaseCollector:
        from ..runtime import DiscoveryCollector

        return DiscoveryCollector(config, interval=DISCOVERY_INTERVAL_S, include_processes=True)

    register_collector("process", PsutilProcessCollector)
    register_collector("network", _network_factory)
    register_collector("discovery", _discovery_factory)
    register_collector(
        "filesystem",
        WatchdogFileCollector,
        enabled_check=lambda cfg: cfg.filesystem_enabled,
    )
    register_collector(
        "telemetry",
        StructuredTelemetryCollector,
        enabled_check=lambda cfg: cfg.telemetry_enabled,
    )


_register_builtins()
