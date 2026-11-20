# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Unified data emission pipeline for all collectors and derived metrics.

Every data point in aictl flows through ``SampleSink.emit()``.  The sink
handles handoff to the store writer, in-memory ring
buffers for real-time charting, and dispatching to registered handlers
for async post-processing (anomaly detection, trend analysis, alerts).

Architecture::

    Collector ──► sink.emit("cpu.core.3", 45.2, {"tool":"..."})
    Discovery ──► sink.emit("file.tokens", 2040, {"path":"..."})
    Correlator ─► sink.emit("tool.tokens.input", 1000, {...})
                        │
                        ├──► Store writer (bounded write-behind)
                        ├──► Handler chain (sync or async)
                        └──► Metrics aggregator (optional)

Design goals:
  * Single entry point for ALL metric emission
  * Thread-safe (collectors run on different threads)
  * Non-blocking (handlers must not slow down emission)
  * Testable (works without DB or handlers)
"""

from __future__ import annotations

import json
import logging
import threading
import time
from collections import OrderedDict, deque
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol

log = logging.getLogger(__name__)


class SampleHandler(Protocol):
    """Protocol for sample post-processing handlers."""

    def __call__(self, metric: str, value: float, tags: dict[str, Any], ts: float) -> None: ...


class OtelMetricGate:
    """Limit OTLP volume before handing rows to the writer."""

    def __init__(self, *, limit: int = 5000, series_limit: int = 20_000, clock=time.monotonic) -> None:
        self.limit = limit
        self.series_limit = series_limit
        self.clock = clock
        self._lock = threading.Lock()
        self._window = -1
        self._count = 0
        self.dropped = 0
        self._series: OrderedDict = OrderedDict()

    def accept(self, rows, *, series, value, identity=None, suppress=lambda row: True):
        accepted = []
        with self._lock:
            now = self.clock()
            if int(now) != self._window:
                self._window, self._count = int(now), 0
            for row in rows:
                key, number = series(row), value(row)
                sample_id = identity(row) if identity else None
                previous = self._series.get(key)
                if previous and ((sample_id is not None and previous[2] == sample_id)
                                 or (suppress(row) and previous[0] == number and now - previous[1] < 300)):
                    continue
                if self._count >= self.limit:
                    self.dropped += 1
                    continue
                self._count += 1
                self._series[key] = (number, now, sample_id)
                self._series.move_to_end(key)
                if len(self._series) > self.series_limit:
                    self._series.popitem(last=False)
                accepted.append(row)
        return accepted


class SampleSink:
    """Single entry point for all metric emission.

    Parameters
    ----------
    The store writer buffers accepted samples. Live handlers can run without
    a configured writer.
    """

    LATEST_MAXSIZE: int = 10_000
    SERIES_MAXSIZE: int = 10_000
    DEDUP_MAXSIZE: int = 100_000
    DEDUP_TTL: float = 600.0  # seconds before dedup entries expire
    _DEDUP_GC_INTERVAL: int = 1000  # run GC every N emits

    def __init__(
        self,
        *,
        datapoint_logger: Any | None = None,
        history_store=None,
        quality=None,
    ) -> None:
        from .collection_status import CollectionStatus
        from .stores import Store, writer_or_discard

        writer = (history_store or Store()).writer
        self._writer = writer_or_discard(writer)
        self._quality = quality or CollectionStatus(writer)
        self._otel_gate = OtelMetricGate()
        self._datapoint_logger = datapoint_logger
        self._lock = threading.Lock()
        self._handlers: list[SampleHandler] = []
        # Per-metric latest value cache (LRU-bounded OrderedDict)
        self._latest: OrderedDict[str, tuple[float, float, dict]] = OrderedDict()
        # Per-metric mini ring buffers for real-time charting (last 120
        # points each; LRU-bounded — metric names can embed PIDs so the
        # key space grows without bound otherwise)
        self._series: OrderedDict[str, deque] = OrderedDict()
        # Dedup cache for emit_if_changed (LRU-bounded OrderedDict)
        self._dedup_cache: OrderedDict[str, tuple[float, float]] = OrderedDict()
        # Stats
        self._total_emitted: int = 0
        self._total_flushed: int = 0
        self._emit_count_since_gc: int = 0
        # Flood protection
        self._flood_window: float = 1.0  # 1-second window
        self._flood_max: int = 5000  # max emissions per window
        self._flood_count: int = 0
        self._flood_window_start: float = 0.0
        self._total_dropped: int = 0  # lifetime count of flood-dropped samples
        self._flood_drop_count: int = 0  # drops in current window (for stats)
        self._drop_logged: bool = False  # avoid log spam

    @property
    def streams_observations(self) -> bool:
        return True

    # ── LRU helpers (all callers must hold self._lock) ──────────────

    def _lru_set_latest(self, metric: str, entry: tuple[float, float, dict]) -> None:
        """Insert/update *metric* in _latest, evicting oldest if over maxsize."""
        if metric in self._latest:
            self._latest.move_to_end(metric)
        self._latest[metric] = entry
        if len(self._latest) > self.LATEST_MAXSIZE:
            self._latest.popitem(last=False)

    def _series_append(self, metric: str, point: tuple[float, float]) -> None:
        """Append *point* to the metric's ring buffer, evicting the LRU metric."""
        dq = self._series.get(metric)
        if dq is None:
            dq = deque(maxlen=120)
            self._series[metric] = dq
        else:
            self._series.move_to_end(metric)
        dq.append(point)
        if len(self._series) > self.SERIES_MAXSIZE:
            self._series.popitem(last=False)

    def _lru_set_dedup(self, cache_key: str, entry: tuple[float, float]) -> None:
        """Insert/update *cache_key* in _dedup_cache, evicting oldest if over maxsize."""
        if cache_key in self._dedup_cache:
            self._dedup_cache.move_to_end(cache_key)
        self._dedup_cache[cache_key] = entry
        if len(self._dedup_cache) > self.DEDUP_MAXSIZE:
            self._dedup_cache.popitem(last=False)

    def _dedup_gc(self) -> None:
        """Evict dedup entries older than DEDUP_TTL seconds."""
        now = time.time()
        cutoff = now - self.DEDUP_TTL
        stale_keys = [k for k, (_, ts) in self._dedup_cache.items() if ts < cutoff]
        for k in stale_keys:
            del self._dedup_cache[k]

    def _count_emits_for_gc_locked(self, count: int) -> None:
        self._emit_count_since_gc += count
        if self._emit_count_since_gc >= self._DEDUP_GC_INTERVAL:
            self._emit_count_since_gc = 0
            self._dedup_gc()

    def _flood_check_locked(self, ts: float, notices: list[tuple[str, str, str, dict]]) -> tuple[bool, bool, int]:
        """Count one emission against the flood limit: ``(dropped, first_drop, total_dropped)``."""
        if ts - self._flood_window_start > self._flood_window:
            if self._flood_drop_count:
                notices.append(
                    (
                        "ok",
                        "info",
                        "sample emission rate back under flood limit",
                        {"dropped_in_previous_window": self._flood_drop_count},
                    )
                )
            self._flood_window_start = ts
            self._flood_count = 0
            self._flood_drop_count = 0
            self._drop_logged = False
        self._flood_count += 1
        if self._flood_count <= self._flood_max:
            return False, False, self._total_dropped
        self._total_dropped += 1
        self._flood_drop_count += 1
        first_drop = not self._drop_logged
        if first_drop:
            self._drop_logged = True
            notices.append(
                (
                    "degraded",
                    "warning",
                    "sample flood protection is dropping datapoints",
                    {"flood_max_per_second": self._flood_max, "total_dropped": self._total_dropped},
                )
            )
        return True, first_drop, self._total_dropped

    def _report_flood(
        self,
        metric: str,
        ts: float,
        notices: list[tuple[str, str, str, dict]],
        dropped: bool,
        first_drop: bool,
        total_dropped: int,
    ) -> None:
        for status, severity, message, detail in notices:
            self.record_data_quality(
                "sample-sink",
                status,
                kind="sink",
                severity=severity,
                message=message,
                detail=detail,
                ts=ts,
            )
        if dropped:
            log.debug("Flood drop: metric=%s total_dropped=%d", metric, total_dropped)
            if first_drop:
                log.warning(
                    "Too many samples: dropping those over %d per second, starting with %s. Dropped so far: %d",
                    self._flood_max,
                    metric,
                    total_dropped,
                )

    def _forget_dedup(self, samples: list[tuple[str, float, dict[str, Any], float]]) -> None:
        """Forget the change-filter entries of samples whose handoff failed, so the next value is sent."""
        with self._lock:
            for metric, value, t, sample_ts in samples:
                key = self._cache_key(metric, t)
                if self._dedup_cache.get(key) == (value, sample_ts):
                    del self._dedup_cache[key]

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
        self.emit_batch([(metric, value, tags)], ts)

    # Max seconds before re-emitting an unchanged value (avoids stale gaps)
    DEDUP_STALE_SECONDS = 300  # 5 minutes

    @staticmethod
    def _cache_key(metric: str, tags: dict) -> str:
        return metric + "".join(f"|{k}={tags[k]}" for k in sorted(tags))

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
        *,
        gauge: bool = False,
    ) -> None:
        """Emit only if the value changed or >5 min since last emission.

        Event-like datapoints (value is 0 or 1, i.e. boolean markers
        where uniqueness is in the timestamp) are never suppressed, unless
        ``gauge`` says that 0 and 1 are ordinary levels of this metric.

        Uses a composite key of metric + ALL tag values to detect
        duplicates. Unchanged values are still updated in the in-memory
        latest/series caches but NOT persisted — unless
        the last persist was more than DEDUP_STALE_SECONDS ago, in which
        case we re-emit to keep time-series continuous. Kusto mode applies
        the same rule; only the buffering differs.
        """
        if ts is None:
            ts = time.time()
        if self.admit_if_changed(metric, value, tags, ts, gauge=gauge):
            self.emit(metric, value, tags, ts)

    def admit_if_changed(
        self,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        ts: float | None = None,
        *,
        gauge: bool = False,
    ) -> bool:
        """The change decision of :meth:`emit_if_changed`, for producers that send their own batch.

        True means the caller must persist the sample with this ``ts``. A
        Kusto handoff that fails forgets the decision, so the value is sent again.
        """
        if ts is None:
            ts = time.time()
        # Event-like datapoints: never suppress
        if not gauge and self._is_event_like(value):
            return True

        t = tags or {}
        cache_key = self._cache_key(metric, t)
        with self._lock:
            prev = self._dedup_cache.get(cache_key)
            if prev is not None:
                prev_value, prev_ts = prev
                # Skip expired dedup entries
                if (ts - prev_ts) < self.DEDUP_TTL:
                    stale = (ts - prev_ts) >= self.DEDUP_STALE_SECONDS
                    if prev_value == value and not stale:
                        # Value unchanged and recent — update in-memory caches only
                        self._lru_set_latest(metric, (ts, value, t))
                        self._series_append(metric, (ts, value))
                        return False
            self._lru_set_dedup(cache_key, (value, ts))
        return True

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
        admitted = self.admit_with_sensitivity(
            metric,
            value,
            tags,
            ts,
            abs_threshold=abs_threshold,
            max_threshold=max_threshold,
            rounding=rounding,
        )
        if admitted is not None:
            self.emit(metric, admitted, tags, ts)

    def admit_with_sensitivity(
        self,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        ts: float | None = None,
        *,
        abs_threshold: float = 0.0,
        max_threshold: float = 0.0,
        rounding: int | None = None,
    ) -> float | None:
        """The decision of :meth:`emit_with_sensitivity`, for producers that send their own batch.

        Returns the (rounded) value to persist with this ``ts``, or None when
        the sample is suppressed. A Kusto handoff that fails forgets the decision.
        """
        if ts is None:
            ts = time.time()
        if rounding is not None:
            value = round(value, rounding)

        t = tags or {}
        cache_key = self._cache_key(metric, t)
        with self._lock:
            prev = self._dedup_cache.get(cache_key)
            if prev is not None:
                prev_value, prev_ts = prev
                elapsed = ts - prev_ts

                # Skip expired dedup entries
                if elapsed >= self.DEDUP_TTL:
                    prev = None

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
                    self._lru_set_latest(metric, (ts, value, t))
                    self._series_append(metric, (ts, value))
                    return None

            self._lru_set_dedup(cache_key, (value, ts))
        return value

    def emit_otel(self, samples) -> None:
        samples = self._otel_gate.accept(
            samples,
            series=lambda sample: (sample.metric, json.dumps(sample.tags, sort_keys=True, default=str)),
            value=lambda sample: sample.value,
            identity=lambda sample: getattr(sample, "source_key", None),
            # Equal nonzero deltas report separate work.
            suppress=lambda sample: getattr(sample, "gauge", False),
        )
        self.emit_batch([(sample.metric, sample.value, sample.tags, sample.ts) for sample in samples])

    def emit_batch(
        self,
        samples: list[tuple[str, float, dict[str, Any] | None] | tuple[str, float, dict[str, Any] | None, float]],
        ts: float | None = None,
    ) -> None:
        """Write multiple samples with the same or per-sample timestamp.

        More efficient than calling ``emit()`` in a loop — single lock
        acquisition, single handler dispatch batch.
        """
        if ts is None:
            ts = time.time()

        normalized: list[tuple[str, float, dict[str, Any], float]] = [
            (item[0], item[1], item[2] or {}, item[3] if len(item) == 4 else ts) for item in samples
        ]

        accepted = []
        dropped_samples = []
        notices = []
        first = None
        with self._lock:
            now = time.time()
            for item in normalized:
                metric, _, _, sample_ts = item
                dropped, first_drop, total = self._flood_check_locked(now, notices)
                if dropped:
                    dropped_samples.append(item)
                    if first_drop:
                        first = metric, sample_ts, total
                else:
                    accepted.append(item)
        self._forget_dedup(dropped_samples)
        if first is not None:
            self._report_flood(first[0], first[1], notices, True, True, first[2])
        elif notices:
            self._report_flood("", ts, notices, False, False, 0)
        if accepted:
            from .tool_calls import call_key

            rows = []
            for metric, value, tags, sample_ts in accepted:
                serialized = json.dumps(tags, sort_keys=True, default=str)
                project = str(tags.get("project_path") or tags.get("cwd") or "")
                rows.append(dict(ts=sample_ts, metric=metric, value=value, tags=serialized,
                                 tool=str(tags.get("tool") or tags.get("aictl.tool") or ""),
                                 project=project, project_path=project, session_id=str(tags.get("session_id") or ""),
                                 seq=int(call_key(serialized, repr(value)), 16) & (2**63 - 1)))
            try:
                self._writer.append("metrics", rows)
            except Exception:
                self._forget_dedup(accepted)
                raise
        with self._lock:
            for metric, value, tags, sample_ts in accepted:
                self._lru_set_latest(metric, (sample_ts, value, tags))
                self._series_append(metric, (sample_ts, value))
            self._total_emitted += len(accepted)
            self._total_flushed += len(accepted)
            self._count_emits_for_gc_locked(len(accepted))
        for metric, value, tags, sample_ts in accepted:
            if self._datapoint_logger:
                try:
                    self._datapoint_logger.log_sample(sample_ts, metric, value, tags,
                                                       session_id=tags.get("session_id", ""), tool=tags.get("tool", ""))
                except Exception:
                    log.debug("Datapoint log failed for %s", metric, exc_info=True)
            for handler in self._handlers:
                try:
                    handler(metric, value, tags, sample_ts)
                except Exception:
                    log.debug("Sample handler failed for %s", metric, exc_info=True)

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

    def record_data_quality(
        self,
        component: str,
        status: str,
        *,
        kind: str = "",
        severity: str = "",
        message: str = "",
        source: str = "",
        detail: dict[str, Any] | None = None,
        ts: float | None = None,
    ) -> None:
        """Record data-source health."""
        try:
            self._quality.record_data_quality(
                component,
                status,
                kind=kind,
                severity=severity,
                message=message,
                source=source,
                detail=detail,
                ts=ts,
            )
        except Exception as exc:
            log.debug("Data-quality write error for %s: %s", component, exc)

    def flush(self) -> int:
        """Flush the configured writer. The writer owns transmission counters."""
        self._writer.flush()
        return 0

    # ── Query (from cache, not DB) ────────────────────────────────

    def get_latest(self, metric: str) -> tuple[float, float, dict] | None:
        """Return (ts, value, tags) for the most recent emit of *metric*."""
        with self._lock:
            return self._latest.get(metric)

    def get_series(self, metric: str) -> list[tuple[float, float]]:
        """Return recent (ts, value) pairs from the in-memory ring buffer."""
        with self._lock:
            dq = self._series.get(metric)
            return list(dq) if dq is not None else []

    def get_latest_by_prefix(self, prefix: str) -> dict[str, tuple[float, float, dict]]:
        """Return latest values for all metrics matching *prefix*."""
        with self._lock:
            return {k: v for k, v in self._latest.items() if k.startswith(prefix)}

    def list_metrics(self) -> list[str]:
        """Return all known metric names (from cache, not DB)."""
        with self._lock:
            return sorted(self._latest.keys())

    # ── Stats ─────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        """Return emission statistics."""
        with self._lock:
            return {
                "total_emitted": self._total_emitted,
                "total_flushed": self._total_flushed,
                "total_dropped": self._total_dropped,
                "flood_drop_count": self._flood_drop_count,
                "buffer_size": 0,
                "metrics_tracked": len(self._latest),
                "dedup_cache_size": len(self._dedup_cache),
                "handlers": len(self._handlers),
                "is_flooding": self._flood_count > self._flood_max,
            }

    # ── Lifecycle ─────────────────────────────────────────────────

    def close(self) -> None:
        """Flush remaining buffer and clean up."""
        self.flush()


# ── DatapointLogger ─────────────────────────────────────────────────


def _make_rotating_logger(
    name: str,
    filepath: Path,
    max_bytes: int,
    backup_count: int,
) -> logging.Logger:
    """Create a logger with a RotatingFileHandler, no formatting overhead."""
    logger = logging.getLogger(f"aictl.datalog.{name}")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    # Remove existing handlers (in case of re-init)
    for h in list(logger.handlers):
        logger.removeHandler(h)
    handler = RotatingFileHandler(
        str(filepath),
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


class DatapointLogger:
    """Writes every datapoint as a JSON line to rotating log files.

    Parameters
    ----------
    log_dir : str | Path
        Directory to write log files into (created if missing).
    max_bytes : int
        Rotate file after this many bytes (default 1 MB).
    backup_count : int
        Number of rotated backup files to keep.
    """

    def __init__(
        self,
        log_dir: str | Path = "logs",
        max_bytes: int = 1_048_576,
        backup_count: int = 10,
    ) -> None:
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self._samples_log = _make_rotating_logger("samples", self.log_dir / "samples.log", max_bytes, backup_count)
        self._events_log = _make_rotating_logger("events", self.log_dir / "events.log", max_bytes, backup_count)

    def log_sample(
        self,
        ts: float,
        metric: str,
        value: float,
        tags: dict[str, Any] | None = None,
        session_id: str = "",
        tool: str = "",
    ) -> None:
        """Write one sample as a JSON line."""
        line: dict[str, Any] = {"ts": ts, "metric": metric, "value": value}
        line.update({k: v for k, v in {"tags": tags, "session_id": session_id, "tool": tool}.items() if v})
        self._samples_log.info(json.dumps(line, separators=(",", ":")))

    def log_event(
        self,
        ts: float,
        tool: str,
        kind: str,
        detail: dict[str, Any] | None = None,
        session_id: str = "",
        pid: int = 0,
        model: str = "",
        path: str = "",
        input_tokens: int = 0,
        output_tokens: int = 0,
        duration_ms: float = 0,
        tool_name: str = "",
        prompt_id: str = "",
    ) -> None:
        """Write one event as a JSON line."""
        line: dict[str, Any] = {"ts": ts, "tool": tool, "kind": kind}
        line.update(
            {
                k: v
                for k, v in {
                    "session_id": session_id,
                    "pid": pid,
                    "model": model,
                    "path": path,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "duration_ms": round(duration_ms, 1),
                    "tool_name": tool_name,
                    "prompt_id": prompt_id,
                    "detail": detail,
                }.items()
                if v
            }
        )
        self._events_log.info(json.dumps(line, separators=(",", ":")))

    def close(self) -> None:
        """Flush and close all log handlers."""
        for logger in (self._samples_log, self._events_log):
            for h in list(logger.handlers):
                h.flush()
                h.close()
                logger.removeHandler(h)


# ── DatapointProvenance ─────────────────────────────────────────────

if TYPE_CHECKING:
    from .dashboard.models import DashboardSnapshot


def _get(obj, key: str, default=None):
    """Get *key* from a dict-or-object uniformly."""
    return obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)


def _build_provenance(snap: DashboardSnapshot) -> dict[str, dict[str, Any]]:
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
        "contributing_tools": {t.tool: t.live.get("session_count", 0) for t in live_tools},
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
        "estimation_tiers_used": sorted(set(v["method"] for v in token_sources.values())),
    }

    # Traffic rates
    prov["overview.total_live_outbound_rate_bps"] = {
        "contributing_tools": {t.tool: round(float(t.live.get("outbound_rate_bps", 0)), 2) for t in live_tools},
        "total_bps": snap.total_live_outbound_rate_bps,
    }

    prov["overview.total_live_inbound_rate_bps"] = {
        "contributing_tools": {t.tool: round(float(t.live.get("inbound_rate_bps", 0)), 2) for t in live_tools},
        "total_bps": snap.total_live_inbound_rate_bps,
    }

    # Resource bars
    prov["overview.live_traffic_bar"] = {
        "tools": {
            t.tool: round(float(t.live.get("outbound_rate_bps", 0)) + float(t.live.get("inbound_rate_bps", 0)), 2)
            for t in live_tools
        },
    }

    # ── Collector health ─────────────────────────────────────────

    tools_with_telemetry = [te.get("tool") for te in telemetry if te.get("source") and te.get("confidence", 0) > 0]
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
            error_tools.append(
                {
                    "tool": te.get("tool"),
                    "error_count": len(errs),
                    "latest_type": errs[-1].get("type", "") if errs else "",
                }
            )
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
            anoms = _get(p, "anomalies") or []
            if anoms:
                pid = _get(p, "pid", 0)
                anomaly_tools.append(
                    {
                        "tool": t.tool,
                        "pid": pid,
                        "anomalies": [a if isinstance(a, str) else str(a) for a in anoms[:3]],
                    }
                )
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
        for proc in t.live.get("processes") or []:
            mem_by_tool.setdefault(t.tool, 0)
            mem_by_tool[t.tool] += int(_get(proc, "mem", 0))
    prov["alerts.subagent_memory"] = {
        "memory_by_tool": mem_by_tool,
        "total_bytes": sum(mem_by_tool.values()),
    }

    # Orphan MCP
    orphans = []
    for s in mcp_detail:
        if _get(s, "status", "") == "orphan":
            orphans.append(_get(s, "name", ""))
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
        for suffix in (
            "input_tokens",
            "output_tokens",
            "cache_read",
            "cache_write",
            "sessions",
            "messages",
            "cost_usd",
            "by_model",
            "confidence",
            "errors",
        ):
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
        source = _get(m, "source", "unknown")
        mem_sources.setdefault(source, {"files": 0, "tokens": 0})
        mem_sources[source]["files"] += 1
        mem_sources[source]["tokens"] += _get(m, "tokens", 0)

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
        "models": sorted(set(model for te in telemetry for model in (te.get("by_model") or {}).keys())),
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
        "active_sessions": len([s for s in sessions if isinstance(s, dict) and not s.get("ended_at")]),
        "total_sessions": len(sessions),
    }

    prov["sessions.agent_teams"] = {
        "team_count": len(agent_teams),
        "total_agents": sum(len(team.get("agents", [])) for team in agent_teams),
    }

    # Active session provenance (aggregated across all active sessions)
    active = [s for s in sessions if isinstance(s, dict) and not s.get("ended_at")]
    for key_suffix in ("duration", "cpu", "input_tokens", "output_tokens", "file_events", "pids", "process_tree"):
        prov[f"sessions.active.{key_suffix}"] = {
            "active_session_count": len(active),
            "tools": list(set(s.get("tool", "") for s in active)),
        }

    prov["sessions.history"] = {
        "total": len(sessions),
        "tools": sorted(set(s.get("tool", "") for s in sessions if isinstance(s, dict))),
    }

    # ── Events tab ────────────────────────────────────────────────

    from collections import Counter

    event_kinds = Counter(_get(e, "kind", "") for e in events if _get(e, "kind"))
    prov["events.feed"] = {
        "event_count": len(events),
        "by_kind": event_kinds,
        "sources": ["SessionCorrelator", "FilesystemWatcher", "HookReceiver", "AnomalyDetector"],
    }

    # ── Metrics Explorer / File activity (static notes) ─────────────
    for _key, _note in [
        ("samples.metric_list", "Populated from samples table — all metrics emitted through SampleSink"),
        ("samples.metric_chart", "Time series from samples table for selected metric, last 30 minutes"),
        ("samples.metric_table", "Recent 50 samples from samples table with parsed JSON tags"),
        (
            "files.item.activity",
            "Based on file mtime: green if changed since last cycle, orange if <5min, grey otherwise",
        ),
    ]:
        prov[_key] = {"note": _note}

    # ── MCP server status ─────────────────────────────────────────

    mcp_running = []
    mcp_configured = []
    for s in mcp_detail:
        name = _get(s, "name", "")
        (mcp_running if "running" in str(_get(s, "status", "")).lower() else mcp_configured).append(name)

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
            for key in (
                "procs.tool.telemetry.premium_requests",
                "procs.tool.telemetry.api_duration_ms",
                "procs.tool.telemetry.code_changes",
            ):
                prov.setdefault(key, {"by_tool": {}})
                prov[key]["by_tool"][tool] = {
                    "premium_requests": qs.get("premium_requests_used", 0),
                    "api_duration_ms": qs.get("total_api_duration_ms", 0),
                    "code_changes": qs.get("code_changes", {}),
                }
        for key in (
            "procs.tool.telemetry.active_session_input",
            "procs.tool.telemetry.active_session_output",
            "procs.tool.telemetry.active_session_messages",
        ):
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
    for key in ("live.diagnostics.collector_name", "live.diagnostics.status", "live.diagnostics.mode"):
        prov[key] = {"collectors": collectors}

    # Collector pipeline
    for key in (
        "overview.collector_pipeline.name",
        "overview.collector_pipeline.status",
        "overview.collector_pipeline.detail",
    ):
        prov[key] = {"collectors": collectors}

    # OTel receiver stats
    otel_status = snap.live_monitor.get("otel", {}) if snap.live_monitor else {}
    for key in (
        "overview.collector_health.otel_events_received",
        "overview.collector_health.otel_api_calls",
        "overview.collector_health.otel_api_errors",
        "overview.collector_health.otel_parse_errors",
        "overview.collector_health.otel_last_receive",
    ):
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
        for key in (
            "events.tool.live.session_count",
            "events.tool.live.pid_count",
            "events.tool.live.cpu_percent",
            "events.tool.live.mem_mb",
            "events.tool.live.outbound_rate_bps",
            "events.tool.live.inbound_rate_bps",
        ):
            prov.setdefault(key, {"by_tool": {}})
            prov[key]["by_tool"][t.tool] = tool_summary

    # Session timeline tooltip extras
    for key in (
        "sessions.timeline.conversations",
        "sessions.timeline.subagents",
        "sessions.timeline.source_files",
        "sessions.timeline.unique_files",
        "sessions.timeline.bytes_written",
    ):
        prov[key] = {
            "total_sessions": len(sessions),
            "note": "Computed per-session from events and file data in query_session_profiles()",
        }

    # Session detail extras
    active_tools = list(set(s.get("tool", "") for s in active))
    for key in (
        "sessions.active.peak_cpu",
        "sessions.active.traffic",
        "sessions.active.state_writes",
        "sessions.active.workspaces",
        "sessions.active.subprocesses",
        "sessions.active.files_touched_list",
    ):
        prov[key] = {
            "active_session_count": len(active),
            "tools": active_tools,
        }

    # Agent team extras
    prov["sessions.agent_teams.tools_used"] = {
        "team_count": len(agent_teams),
        "all_tools": sorted(set(tool_name for team in agent_teams for tool_name in team.get("tools_used", []))),
    }

    for key in (
        "sessions.agent_teams.agent_slug",
        "sessions.agent_teams.agent_is_sidechain",
        "sessions.agent_teams.warmup_count",
    ):
        prov[key] = {
            "team_count": len(agent_teams),
            "total_agents": sum(len(team.get("agents", [])) for team in agent_teams),
        }

    # Budget extras
    prov["budget.model_detected"] = {
        "models": sorted(set(te.get("model", "") for te in telemetry if te.get("model"))),
    }

    # API-only endpoints
    prov["api.project_costs"] = {
        "tools_with_cost": [te.get("tool") for te in telemetry if te.get("cost_usd", 0) > 0],
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
    for key in (
        "otel.traces.token_usage",
        "otel.traces.operation_duration",
        "otel.traces.span_events",
        "otel.traces.api_calls",
        "otel.traces.api_errors",
        "otel.receiver.metrics_received",
        "otel.receiver.events_received",
        "otel.receiver.traces_received",
        "otel.receiver.api_calls_total",
        "otel.receiver.api_errors_total",
        "otel.receiver.parse_errors",
        "otel.receiver.last_receive",
        "otel.receiver.active",
    ):
        prov[key] = {"otel": otel_status}

    return prov
