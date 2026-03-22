# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Unified data emission pipeline for all collectors and derived metrics.

Every data point in aictl flows through ``SampleSink.emit()``.  The sink
handles buffering, SQLite persistence (via HistoryDB), in-memory ring
buffers for real-time charting, and dispatching to registered handlers
for async post-processing (anomaly detection, trend analysis, alerts).

Architecture::

    Collector ──► sink.emit("cpu.core.3", 45.2, {"tool":"..."})
    Discovery ──► sink.emit("file.tokens", 2040, {"path":"..."})
    Correlator ─► sink.emit("tool.tokens.input", 1000, {...})
                        │
                        ├──► SQLite samples table (write-behind)
                        ├──► Handler chain (sync or async)
                        └──► Metrics aggregator (optional)

Design goals:
  * Single entry point for ALL metric emission
  * Thread-safe (collectors run on different threads)
  * Non-blocking (handlers must not slow down emission)
  * Testable (works without DB or handlers)
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict, deque
from typing import Any, Callable, Protocol

log = logging.getLogger(__name__)


class SampleHandler(Protocol):
    """Protocol for sample post-processing handlers."""

    def __call__(self, metric: str, value: float, tags: dict[str, Any], ts: float) -> None: ...


class SampleSink:
    """Single entry point for all metric emission.

    Parameters
    ----------
    db : HistoryDB | None
        SQLite persistence layer.  If None, samples are only dispatched
        to handlers (useful for testing or ephemeral runs).
    buffer_size : int
        Max samples to buffer before auto-flush.  0 = flush on every emit.
    """

    def __init__(
        self,
        db: Any | None = None,
        buffer_size: int = 5000,
        datapoint_logger: Any | None = None,
    ) -> None:
        self._db = db
        self._buffer_size = buffer_size
        self._datapoint_logger = datapoint_logger
        self._lock = threading.Lock()
        self._buffer: list[tuple[float, str, float, dict]] = []
        self._handlers: list[SampleHandler] = []
        # Per-metric latest value cache (for quick lookups)
        self._latest: dict[str, tuple[float, float, dict]] = {}  # metric → (ts, value, tags)
        # Per-metric mini ring buffers for real-time charting (last 120 points)
        self._series: dict[str, deque] = defaultdict(lambda: deque(maxlen=120))
        # Dedup cache for emit_if_changed: cache_key → (value, ts)
        self._dedup_cache: dict[str, tuple[float, float]] = {}
        # Stats
        self._total_emitted: int = 0
        self._total_flushed: int = 0
        # Flood protection
        self._flood_window: float = 1.0  # 1-second window
        self._flood_max: int = 5000  # max emissions per window
        self._flood_count: int = 0
        self._flood_window_start: float = 0.0
        self._total_dropped: int = 0  # lifetime count of flood-dropped samples
        self._drop_logged: bool = False  # avoid log spam

    # ── Emission ──────────────────────────────────────────────────

    def emit(
        self,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        ts: float | None = None,
    ) -> None:
        """Write one data point.  Thread-safe, non-blocking.

        Parameters
        ----------
        metric : str
            Dotted metric name, e.g. ``'cpu.core.3'``, ``'proc.71416.cpu'``.
        value : float
            Numeric value.
        tags : dict, optional
            Key-value metadata (tool, pid, path, etc.).
        ts : float, optional
            Unix timestamp.  Defaults to ``time.time()``.
        """
        if ts is None:
            ts = time.time()
        t = tags or {}

        # Flood protection: drop if exceeding rate limit
        if ts - self._flood_window_start > self._flood_window:
            self._flood_window_start = ts
            self._flood_count = 0
            self._drop_logged = False
        self._flood_count += 1
        if self._flood_count > self._flood_max:
            self._total_dropped += 1
            if not self._drop_logged:
                log.warning("Flood protection: dropping samples (>%d/s). "
                            "Total dropped: %d", self._flood_max,
                            self._total_dropped)
                self._drop_logged = True
            return

        # Update latest + series cache
        self._latest[metric] = (ts, value, t)
        self._series[metric].append((ts, value))

        # Write to datapoint log file (if configured)
        if self._datapoint_logger:
            try:
                self._datapoint_logger.log_sample(
                    ts, metric, value, t,
                    session_id=t.get("session_id", ""),
                    tool=t.get("tool", ""),
                )
            except Exception:
                pass  # never block emission on log I/O

        # Buffer for SQLite persistence
        with self._lock:
            self._buffer.append((ts, metric, value, t))
            self._total_emitted += 1
            should_flush = (self._buffer_size == 0 or
                            len(self._buffer) >= self._buffer_size)

        # Dispatch to handlers (outside lock)
        for handler in self._handlers:
            try:
                handler(metric, value, t, ts)
            except Exception as exc:
                log.debug("Handler error on %s: %s", metric, exc)

        if should_flush:
            self.flush()

    # Max seconds before re-emitting an unchanged value (avoids stale gaps)
    DEDUP_STALE_SECONDS = 300  # 5 minutes

    @staticmethod
    def _is_event_like(value: float) -> bool:
        """True if the value carries no distinguishing numeric info.

        Datapoints with value 0 or 1 (boolean markers) or NaN are
        event-like — their uniqueness is in the timestamp, not the
        value.  These must never be deduplicated.
        """
        return value in (0.0, 1.0) or value != value  # NaN check

    def emit_if_changed(
        self,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        ts: float | None = None,
    ) -> None:
        """Emit only if the value changed or >5 min since last emission.

        Event-like datapoints (value is 0 or 1, i.e. boolean markers
        where uniqueness is in the timestamp) are never suppressed.

        Uses a composite key of metric + ALL tag values to detect
        duplicates. Unchanged values are still updated in the in-memory
        latest/series caches but NOT persisted to SQLite — unless
        the last persist was more than DEDUP_STALE_SECONDS ago, in which
        case we re-emit to keep time-series continuous.
        """
        if ts is None:
            ts = time.time()

        # Event-like datapoints: never suppress
        if self._is_event_like(value):
            self.emit(metric, value, tags, ts)
            return

        t = tags or {}
        # Build cache key from metric + ALL tag key-value pairs
        cache_key = metric
        for k in sorted(t):
            cache_key += f"|{k}={t[k]}"

        prev = self._dedup_cache.get(cache_key)
        if prev is not None:
            prev_value, prev_ts = prev
            stale = (ts - prev_ts) >= self.DEDUP_STALE_SECONDS
            if prev_value == value and not stale:
                # Value unchanged and recent — update in-memory caches only
                self._latest[metric] = (ts, value, t)
                self._series[metric].append((ts, value))
                return
        self._dedup_cache[cache_key] = (value, ts)
        self.emit(metric, value, tags, ts)

    def emit_with_sensitivity(
        self,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        ts: float | None = None,
        *,
        abs_threshold: float = 0.0,
        max_threshold: float = 0.0,
        rounding: int | None = None,
    ) -> None:
        """Emit with time-decaying sensitivity — for continuously varying metrics.

        Designed for process CPU/memory where:
        - Small jitter should be suppressed at high frequency
        - But over time, even small drifts should be recorded
        - Large jumps always emit immediately
        - Zero vs non-zero always emits

        Parameters
        ----------
        abs_threshold : float
            Diff above this ALWAYS emits regardless of time
            (e.g. 1MB for memory, 0.10 for CPU ratio).
        max_threshold : float
            Diff threshold at t=0 (just emitted). Decays linearly to 0
            over DEDUP_STALE_SECONDS. At t=stale, any diff emits.
        rounding : int | None
            Round value to this many decimal places before comparison.
        """
        if ts is None:
            ts = time.time()
        if rounding is not None:
            value = round(value, rounding)

        t = tags or {}
        cache_key = metric
        for k in sorted(t):
            cache_key += f"|{k}={t[k]}"

        prev = self._dedup_cache.get(cache_key)
        if prev is not None:
            prev_value, prev_ts = prev
            elapsed = ts - prev_ts
            diff = abs(value - prev_value)

            # Zero crossing always emits
            zero_cross = (prev_value == 0) != (value == 0)
            # Absolute threshold always emits
            abs_hit = diff >= abs_threshold > 0
            # Time-decaying threshold: full at t=0, zero at t=stale
            decay = max(0.0, 1.0 - elapsed / self.DEDUP_STALE_SECONDS)
            effective = max_threshold * decay
            sensitivity_hit = diff > effective
            # Staleness: re-emit after 5 min regardless
            stale = elapsed >= self.DEDUP_STALE_SECONDS

            if not (zero_cross or abs_hit or sensitivity_hit or stale):
                # Suppressed — update in-memory caches only
                self._latest[metric] = (ts, value, t)
                self._series[metric].append((ts, value))
                return

        self._dedup_cache[cache_key] = (value, ts)
        self.emit(metric, value, tags, ts)

    def emit_batch(
        self,
        samples: list[tuple[str, float, dict[str, Any] | None]],
        ts: float | None = None,
    ) -> None:
        """Write multiple samples with the same timestamp.

        More efficient than calling ``emit()`` in a loop — single lock
        acquisition, single handler dispatch batch.
        """
        if ts is None:
            ts = time.time()

        with self._lock:
            for metric, value, tags in samples:
                t = tags or {}
                self._latest[metric] = (ts, value, t)
                self._series[metric].append((ts, value))
                self._buffer.append((ts, metric, value, t))
                self._total_emitted += 1

        # Dispatch handlers
        for metric, value, tags in samples:
            t = tags or {}
            for handler in self._handlers:
                try:
                    handler(metric, value, t, ts)
                except Exception:
                    pass

        if self._buffer_size == 0 or len(self._buffer) >= self._buffer_size:
            self.flush()

    # ── Handlers ──────────────────────────────────────────────────

    def register_handler(self, handler: SampleHandler) -> None:
        """Register a post-processing handler.

        Handlers are called synchronously on ``emit()``.  They should be
        fast and non-blocking.  For expensive processing, the handler
        should enqueue work to a background thread/queue.
        """
        self._handlers.append(handler)

    def unregister_handler(self, handler: SampleHandler) -> None:
        """Remove a previously registered handler."""
        try:
            self._handlers.remove(handler)
        except ValueError:
            pass

    # ── Flush (persist to SQLite) ─────────────────────────────────

    def flush(self) -> int:
        """Persist buffered samples to SQLite.  Returns count flushed."""
        with self._lock:
            buf = self._buffer
            self._buffer = []

        if not buf or not self._db:
            return 0

        try:
            from .storage import Sample
            samples = [
                Sample(ts=ts, metric=metric, value=value, tags=tags)
                for ts, metric, value, tags in buf
            ]
            self._db.append_samples(samples)
            self._total_flushed += len(samples)
            return len(samples)
        except Exception as exc:
            log.warning("SampleSink flush error: %s", exc)
            return 0

    # ── Query (from cache, not DB) ────────────────────────────────

    def get_latest(self, metric: str) -> tuple[float, float, dict] | None:
        """Return (ts, value, tags) for the most recent emit of *metric*."""
        return self._latest.get(metric)

    def get_series(self, metric: str) -> list[tuple[float, float]]:
        """Return recent (ts, value) pairs from the in-memory ring buffer."""
        return list(self._series.get(metric, []))

    def get_latest_by_prefix(self, prefix: str) -> dict[str, tuple[float, float, dict]]:
        """Return latest values for all metrics matching *prefix*."""
        return {k: v for k, v in self._latest.items() if k.startswith(prefix)}

    def list_metrics(self) -> list[str]:
        """Return all known metric names (from cache, not DB)."""
        return sorted(self._latest.keys())

    # ── Stats ─────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        """Return emission statistics."""
        return {
            "total_emitted": self._total_emitted,
            "total_flushed": self._total_flushed,
            "total_dropped": self._total_dropped,
            "buffer_size": len(self._buffer),
            "metrics_tracked": len(self._latest),
            "handlers": len(self._handlers),
            "is_flooding": self._flood_count > self._flood_max,
        }

    # ── Lifecycle ─────────────────────────────────────────────────

    def close(self) -> None:
        """Flush remaining buffer and clean up."""
        self.flush()
