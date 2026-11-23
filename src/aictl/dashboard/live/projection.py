"""Live dashboard coordination, separate from runtime producers."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, replace
from dataclasses import field as dataclass_field
from typing import Any

from ...stores import OBSERVATION_FAMILIES, UnresolvedObservationsError, reader_feature, retains_unresolved_facts
from ..projections.history import configured_reader
from .drawer import project_agent
from .hub import LiveCapacityError, LiveHub
from .protocol import canonical_scope, parse_agent_watch, stable_id, watched_agent_id

logger = logging.getLogger(__name__)
_BOARD_TOPICS = {"history.board", "configuration.board", "catalog.board", "source.status"}
_CONFIG_FIELDS = frozenset({"settings_at", "project_prompts_searched"})
_ROW_KEYS = {
    "agents": ("id", "parent_id"),
    "attention": ("kind", "agent_id", "since_ts"),
    "by_model": ("model",),
    "by_role": ("kind",),
    "projects": ("project",),
    "prompts": ("id", "session_id", "agent_id"),
    "project_prompts": ("project", "file"),
    "skills": ("name",),
    "tools": ("name",),
    "errors": ("key",),
    "latency": ("what",),
    "loops": ("agent_id", "pattern", "since_ts"),
    "tests": ("project", "command"),
    "memory_files": ("path", "declared_for"),
    "sources": ("tool",),
}


def _accepts(function: Any, name: str) -> bool:
    """Whether *function* takes the keyword argument *name*."""
    import inspect

    try:
        parameters = inspect.signature(function).parameters
    except (TypeError, ValueError):
        return False
    return name in parameters or any(p.kind is inspect.Parameter.VAR_KEYWORD for p in parameters.values())


def board_entities(scope: str, payload: dict) -> list[tuple[str, str, dict, str]]:
    """Keep row identity/order separate from values; separate mixed-source fields."""
    entities: list[tuple[str, str, dict, str]] = []
    prefix = stable_id(scope)

    def add(topic: str, field: str, value: Any, *, key: str | None = None, **extra: Any) -> None:
        source = {
            "history.board": "kusto.queryable",
            "configuration.board": "filesystem.config",
            "catalog.board": "catalog",
        }[topic]
        entity_id = f"{prefix}:{field}" + (f":{key}" if key is not None else "")
        data = {"scope": scope, "field": field, "value": value, **extra}
        if key is not None:
            data["key"] = key
        entities.append((topic, entity_id, data, source))

    for field, raw_value in payload.items():
        if field in {"self", "processes"}:
            continue
        topic = (
            "configuration.board"
            if field in _CONFIG_FIELDS
            else "catalog.board"
            if field == "tool_labels"
            else "history.board"
        )
        value = raw_value
        if field == "kpis":
            # Session activity comes from the runtime report. The runtime report has no subagents,
            # so the count of running subagents stays: it is the only source of that number.
            value = {key: item for key, item in value.items() if key not in {"running", "idle"}}
        if not isinstance(value, list):
            add(topic, field, value)
            continue
        add(topic, field, [], collection=True)
        seen: set[str] = set()
        for order, item in enumerate(value):
            if not isinstance(item, dict):
                key = stable_id(item)
                if key not in seen:
                    add(topic, field, item, key=key, order=order)
                seen.add(key)
                continue
            keys = _ROW_KEYS.get(field)
            if not keys:
                raise ValueError(f"No native row identity defined for board field {field!r}")
            identity = tuple(item.get(name) for name in keys)
            if field == "project_prompts":
                from ..projection_utils import _basename

                identity = (item.get("project"), _basename(item.get("_history_file") or item.get("file") or ""))
            if all(part is None for part in identity):
                raise ValueError(f"Board row has no identity in {field!r}")
            key = stable_id(field, identity)
            if key in seen:
                raise ValueError(f"Duplicate board row identity in {field!r}")
            seen.add(key)
            row = dict(item)
            if field == "agents":
                historical = row.pop("status", None)
                row["historical_status"] = historical
                # The runtime report covers sessions only; a subagent's status comes from its own transcript.
                row["status"] = historical if row.get("parent_id") or (
                    historical in {"ended", "failed"} and row.get("ended_at")) else "unknown"
                for name in ("cpu_percent", "mem_mb", "pids"):
                    row.pop(name, None)
            if field == "skills":
                disk = {name: row.pop(name) for name in ("scope", "path", "description", "file_tokens") if name in row}
                if disk:
                    add("configuration.board", field, disk, key=key, order=order, merge=True)
            elif field == "project_prompts":
                configured = row.pop("_configured_on_disk", False)
                history_file = row.pop("_history_file", None)
                if configured:
                    disk = {"file": row.pop("file"), "project": row["project"], "configured_only": True}
                    add("configuration.board", field, disk, key=key, order=order, merge=True)
                if not history_file:
                    continue
                row["recorded_file"] = history_file
                if not configured:
                    row["file"] = history_file
            add(topic, field, row, key=key, order=order, merge=field in {"skills", "project_prompts"})
    return entities


class _ProjectionDB:
    """Keep live board keys distinct from HTTP cache keys."""

    _live_projection = True

    def __init__(self, db: Any, epoch: str) -> None:
        self._db = db
        self._path = f"{getattr(db, '_path', '')}:live:{epoch}"

    def __getattr__(self, name: str) -> Any:
        return getattr(self._db, name)


@dataclass
class _Scope:
    query: str
    filters: Any
    rolling: bool
    span: float
    refs: int = 0
    dirty: bool = True
    has_data: bool = False
    last_used: float = 0.0
    grid: tuple = ()
    retry_at: float = 0.0
    blocked: bool = False
    status: dict = dataclass_field(default_factory=dict)
    running: bool = False
    started_at: float | None = None
    # How long the last refresh of this scope's board took.
    cost_s: float = 0.0


class LiveDashboard:
    """One reader, a few history workers, and an independent operational-health worker."""

    MAX_SCOPES = 8
    # An unwatched scope keeps its last board this long, so a return to it shows that board at once.
    IDLE_SCOPE_S = 600.0
    HEALTH_INTERVAL_S = 1.0
    # A new scope does not wait behind the refresh of another one.
    HISTORY_WORKERS = 3
    AGENT_WORKERS = 2
    # A wider range changes less, relative to its size, per new row: it is refreshed less often.
    REFRESH_SPAN_DIVISOR = 8640.0
    MAX_REFRESH_INTERVAL_S = 60.0
    # A board that is slow to compute rests this many times its own compute time before the next
    # refresh, so refreshing it takes at most a fifth of the cluster's time whatever the cluster's size.
    REFRESH_REST_FACTOR = 4.0

    def __init__(
        self,
        hub: LiveHub,
        db: Any,
        store: Any,
        *,
        health_provider: Any,
        reader_factory: Any = None,
        compute: Any = None,
    ) -> None:
        self.hub = hub
        self.db = db
        self.store = store
        self._health_provider = health_provider
        self._reader_factory = reader_factory
        self._compute = compute
        self._projection_db = _ProjectionDB(db, hub.epoch)
        self._lock = threading.RLock()
        self._start_lock = threading.Lock()
        self._wake = threading.Event()
        self._agent_wake = threading.Event()
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        self._scopes: dict[str, _Scope] = {}
        self._agent_refs: dict[tuple[str, str], int] = {}
        self._agent_refresh: dict[tuple[str, str], tuple[int, float]] = {}
        self._agent_running: set[tuple[str, str]] = set()
        # The last failure of each watched agent, so that a failure that repeats on each refresh
        # is logged once with its traceback.
        self._agent_errors: dict[tuple[str, str], str] = {}
        self._reader: Any = None
        self._reader_handle: Any = None
        self._poll_history = False
        self._next_poll = 0.0
        self._frontier: dict = {}
        self._reader_ready = False
        self._reader_stale = False
        self._reader_reason: str | None = "on_demand"
        self._generation = 0
        self._reset_generation = 0
        self._baseline_allowed = False
        self._clients = 0
        self.hub.publish(
            "source.status",
            "health",
            {
                "component": "health",
                "topic": "runtime.health",
                "topics": ["runtime.health", "runtime.machine"],
                "ready": False,
                "pending": True,
                "stale": False,
                "error": None,
                "reason": "baseline_pending",
            },
            source="runtime.operational",
        )

    def subscribe(self, query: str, *, history: bool = True, cursor: str | None = None) -> _DashboardSubscription:
        from ..board_filters import CLOCK_RANGE_SLACK_S, parse_filters

        scope = canonical_scope(query)
        watch = parse_agent_watch(query)
        if not history:
            watch = None
        read_history = history
        if history:
            filters = parse_filters(scope, time.time())
            with self._lock:
                entry = self._scopes.get(scope)
                if entry is None:
                    self._expire_scopes_locked(force=len(self._scopes) >= self.MAX_SCOPES)
                    if len(self._scopes) >= self.MAX_SCOPES:
                        raise LiveCapacityError("Too many active live history scopes")
                    entry = _Scope(
                        scope,
                        filters,
                        abs(time.time() - filters.until) <= CLOCK_RANGE_SLACK_S,
                        filters.until - filters.since,
                    )
                    self._scopes[scope] = entry
                    self._scope_status(
                        scope, ready=False, pending=True, stale=False, error=None, reason="baseline_pending"
                    )
                elif not entry.refs:
                    entry.dirty = True
                entry.refs += 1
                entry.last_used = time.monotonic()
                if retains_unresolved_facts(self.db) and not entry.blocked:
                    self._block_history(entry, UnresolvedObservationsError(OBSERVATION_FAMILIES))
                read_history = not entry.blocked
        with self._lock:
            self._clients += 1
            if watch:
                self._agent_refs[watch] = self._agent_refs.get(watch, 0) + 1
        subscription = None
        try:
            subscription = self.hub.subscribe(
                scope, history=history, cursor=cursor, agent_entity=watched_agent_id(watch) if watch else None,
            )
            self._ensure_started(read_history)
        except Exception:
            if subscription is not None:
                subscription.close()
            self._release_client(watch)
            if history:
                self._release(scope)
            raise
        self._wake.set()
        if watch:
            self._agent_wake.set()
        return _DashboardSubscription(self, subscription, scope, history, watch)

    def _ensure_started(self, history: bool) -> None:
        with self._start_lock:
            if self._stop.is_set():
                raise RuntimeError("Live dashboard is closed")
            if not self._threads:
                for name, target in (("live-health", self._health_loop), ("live-history", self._history_loop),
                                     ("live-agent", self._agent_loop)):
                    thread = threading.Thread(target=target, name=name, daemon=True)
                    self._threads.append(thread)
                    thread.start()
            if history and self._reader is None and not self._poll_history:
                reader = configured_reader(self.store)
                if self._reader_factory is not None:
                    self._reader = self._reader_factory(reader_feature(reader, "connection_info"))
                else:
                    self._reader = reader_feature(reader, "live_feed")
                if self._reader is None:
                    with self._lock:
                        self._poll_history = self._baseline_allowed = True
                        self._reader_ready = True
                        self._reader_reason = None
                else:
                    self._reader_handle = self._reader.subscribe(self._on_batch)
                    self._reader.start()

    def _on_batch(self, batch: Any) -> None:
        if self._stop.is_set():
            return
        consumer_gap = batch.kind == "resync" and batch.reason in {"subscriber_overflow", "subscriber_error"}
        if batch.kind in {"bootstrap", "changes", "resync"}:
            from ..board_projection import _facts_lock, _sources_memo

            # The per-tool facts scan the whole store; their cache refreshes itself in the background.
            with _facts_lock:
                for key in tuple(_sources_memo):
                    if key[0] == self._projection_db._path:
                        del _sources_memo[key]
        with self._lock:
            self._frontier = dict(batch.frontier)
            self._reader_ready, self._reader_stale = batch.ready, batch.stale
            self._reader_reason = batch.reason
            if batch.kind == "bootstrap":
                self._baseline_allowed = True
            if consumer_gap:
                self._reset_generation += 1
            if batch.kind in {"bootstrap", "changes", "resync"}:
                self._generation += 1
                for entry in self._scopes.values():
                    entry.dirty = True
                    if consumer_gap:
                        entry.started_at = None
            stale_scopes = (
                [entry for entry in self._scopes.values() if not entry.blocked] if batch.stale or consumer_gap else []
            )
        self.hub.publish(
            "source.status",
            "kusto.reader",
            {
                "component": "history_reader",
                "ready": batch.ready,
                "stale": batch.stale,
                "reason": self._safe_reason(batch.reason),
                "frontier": dict(batch.frontier),
                "details": getattr(batch, "details", {}) or {},
            },
            source="runtime.operational",
        )
        for entry in stale_scopes:
            self._scope_status(
                entry.query,
                ready=entry.has_data and not consumer_gap,
                stale=True,
                reason=self._safe_reason(batch.reason),
                reader_ready=batch.ready,
                pending=consumer_gap,
                error=None if consumer_gap else self._safe_reason(batch.reason) or "History reader unavailable",
                refresh_pending=consumer_gap,
            )
        if consumer_gap:
            # A full baseline can replace pending native entries too; do not claim
            # contiguous ordered delivery after discarding a client's old queue.
            self.hub.invalidate(batch.reason, ordered_gap=True)
        self._wake.set()
        self._agent_wake.set()

    def _agent_loop(self) -> None:
        from concurrent.futures import ThreadPoolExecutor

        pool = ThreadPoolExecutor(max_workers=self.AGENT_WORKERS, thread_name_prefix="live-agent-watch")
        try:
            while not self._stop.is_set():
                self._agent_wake.wait(1.0)
                self._agent_wake.clear()
                with self._lock:
                    if not self._agent_refs:
                        continue
                    blocked = retains_unresolved_facts(self.db)
                    if not blocked and not self._baseline_allowed:
                        continue
                    generation = self._generation
                    now = time.monotonic()
                    busy = len(self._agent_running)
                    candidates = [
                        watch for watch in self._agent_refs
                        if watch not in self._agent_running and (
                            (last := self._agent_refresh.get(watch)) is None
                            or (last[0] != generation and now >= last[1])
                            or (self._poll_history and now >= last[1] + 4)
                        )
                    ]
                    # A newly opened tab/agent with no data yet goes ahead of background refreshes.
                    candidates.sort(key=lambda watch: watch in self._agent_refresh)
                    launched = []
                    for watch in candidates:
                        if busy >= self.AGENT_WORKERS:
                            break
                        self._agent_running.add(watch)
                        busy += 1
                        launched.append(watch)
                for watch in launched:
                    pool.submit(self._refresh_agent, watch, generation, blocked)
        finally:
            pool.shutdown(wait=True, cancel_futures=True)

    def _refresh_agent(self, watch: tuple[str, str], generation: int, blocked: bool) -> None:
        started = time.monotonic()
        failure = None
        try:
            if self._stop.is_set():
                return
            try:
                status, payload = ((503, {}) if blocked else project_agent(self._projection_db, self.store, watch))
            except Exception as exc:
                failure = f"{type(exc).__name__}: {exc}"
                if self._agent_errors.get(watch) != failure:
                    logger.exception("Live agent projection failed")
                else:
                    logger.debug("Live agent projection failed again: %s", failure)
                status, payload = 503, {}
            elapsed = time.monotonic() - started
            cooldown = max(1.0, min(self.MAX_REFRESH_INTERVAL_S, elapsed * 2.0)) if failure is None else 10.0
            with self._lock:
                if failure is None:
                    self._agent_errors.pop(watch, None)
                else:
                    self._agent_errors[watch] = failure
                if watch not in self._agent_refs or self._stop.is_set():
                    return
                # A slow or failed projection waits longer before the next try.
                self._agent_refresh[watch] = generation, time.monotonic() + cooldown
                self._publish_agent(watch, status, payload)
        finally:
            with self._lock:
                self._agent_running.discard(watch)
            self._agent_wake.set()

    def _publish_agent(self, watch: tuple[str, str], status: int, payload: dict) -> None:
        entity_id = watched_agent_id(watch)
        view, agent_id = watch
        data = {"agent_id": agent_id, "view": view, "status": status, "value": payload if status == 200 else None}
        try:
            self.hub.publish("history.agent", entity_id, data, source="kusto.queryable")
        except LiveCapacityError:
            try:
                self.hub.publish("history.agent", entity_id, {**data, "status": 413, "value": None},
                                 source="kusto.queryable")
            except LiveCapacityError:
                logger.warning("Live history capacity reached while publishing agent availability")

    def _scope_status(self, scope: str, **fields: Any) -> None:
        entity_id = f"history:{stable_id(scope)}"
        with self._lock:
            entry = self._scopes.get(scope)
            if entry is None:
                return
            data = {**entry.status, "scope": scope, "component": "history", "topic": "history.board", **fields}
            entry.status = data
            self.hub.publish("source.status", entity_id, data, source="runtime.operational")

    def _block_history(self, entry: _Scope, error: UnresolvedObservationsError) -> None:
        with self._lock:
            entry.blocked = True
            entry.dirty = False
            self._scope_status(
                entry.query,
                **error.to_dict(),
                ready=False,
                pending=False,
                stale=True,
                refresh_pending=False,
            )

    @staticmethod
    def _safe_reason(reason: Any) -> str | None:
        from ..projection_utils import mask_secrets

        return mask_secrets(str(reason))[:600] if reason else None

    def _filters_now(self, entry: _Scope, now: float) -> Any:
        from ..board_filters import _clock_range

        filters = entry.filters
        if entry.rolling:
            filters = _clock_range(replace(filters, since=now - entry.span, until=now))
        if filters.status in {"active", "running", "idle", "waiting"}:
            from ...records import _session_uuid

            ready = any(
                row.get("producer") == "runtime-collector" and row.get("ready")
                for row in self.hub.values("source.status")
            )
            if not ready:
                return None
            statuses = {}
            for row in self.hub.values("runtime.agent"):
                status = str(row.get("status") or "unknown")
                if status == "unknown" and row.get("running"):
                    status = "running"
                for key in ("id", "session_id", "native_session_id", "monitor_session_id"):
                    identity = row.get(key)
                    if isinstance(identity, str) and identity:
                        statuses[identity] = status
                        uuid = _session_uuid(identity)
                        if uuid:
                            statuses[uuid] = status
            filters = replace(filters, runtime_statuses=tuple(sorted(statuses.items())))
        return filters

    def _refresh_interval(self, entry: _Scope) -> float:
        by_span = min(self.MAX_REFRESH_INTERVAL_S, entry.span / self.REFRESH_SPAN_DIVISOR)
        return max(by_span, entry.cost_s * (1.0 + self.REFRESH_REST_FACTOR))

    def _history_loop(self) -> None:
        from concurrent.futures import ThreadPoolExecutor

        from ..board_projection import compute_board
        from ..projections.history import HistoryScope

        compute = self._compute or (
            lambda db, filters, **kwargs: compute_board(db, filters, history=HistoryScope.local(self.store), **kwargs)
        )
        pool = ThreadPoolExecutor(max_workers=self.HISTORY_WORKERS, thread_name_prefix="live-history-scope")
        try:
            while not self._stop.is_set():
                self._wake.wait(1.0)
                self._wake.clear()
                with self._lock:
                    self._expire_scopes_locked()
                    now_mono = time.monotonic()
                    if self._poll_history and now_mono >= self._next_poll:
                        self._next_poll = now_mono + 5.0
                        for entry in self._scopes.values():
                            if entry.refs and not entry.blocked:
                                entry.dirty = True
                    busy = sum(1 for entry in self._scopes.values() if entry.running)
                    candidates = [
                        entry
                        for entry in self._scopes.values()
                        if self._baseline_allowed
                        and entry.refs
                        and not entry.blocked
                        and not entry.running
                        and now_mono >= entry.retry_at
                    ]
                    # A scope that shows nothing yet goes first, then the one used last.
                    candidates.sort(key=lambda entry: (entry.has_data, -entry.last_used))
                for entry in candidates:
                    if self._stop.is_set():
                        return
                    if busy >= self.HISTORY_WORKERS:
                        break
                    job = self._start_refresh(entry)
                    if job is not None:
                        busy += 1
                        pool.submit(self._refresh_scope, compute, entry, *job)
        finally:
            pool.shutdown(wait=True, cancel_futures=True)

    def _start_refresh(self, entry: _Scope) -> tuple | None:
        """Claim *entry* for one refresh, or None when it needs none yet."""
        now = time.time()
        filters = self._filters_now(entry, now)
        if filters is None:
            self._scope_status(
                entry.query,
                ready=False,
                pending=True,
                stale=entry.has_data,
                error=None,
                reason="runtime_baseline_pending",
            )
            return None
        grid = (filters.since, filters.until, filters.buckets, filters.runtime_statuses)
        with self._lock:
            if entry.running or (not entry.dirty and entry.grid == grid):
                return None
            now_mono = time.monotonic()
            if (entry.has_data and entry.started_at is not None
                    and now_mono < entry.started_at + self._refresh_interval(entry)):
                return None
            entry.dirty = False
            entry.running = True
            entry.started_at = now_mono
            return filters, grid, now, dict(self._frontier), self._generation, self._reset_generation

    def _refresh_scope(self, compute: Any, entry: _Scope, filters: Any, grid: tuple, now: float,
                       frontier: dict, generation: int, reset_generation: int) -> None:
        started = time.monotonic()
        try:
            self._compute_scope(compute, entry, filters, grid, now, frontier, generation, reset_generation)
        finally:
            with self._lock:
                entry.running = False
                entry.cost_s = time.monotonic() - started
            self._wake.set()

    def _compute_scope(self, compute: Any, entry: _Scope, filters: Any, grid: tuple, now: float,
                       frontier: dict, generation: int, reset_generation: int) -> None:
        self._scope_status(
            entry.query,
            ready=entry.status.get("ready", entry.has_data),
            pending=not entry.status.get("ready", entry.has_data),
            error=None,
            refresh_pending=True,
            attempted_at=now,
        )
        try:
            field_errors: dict[str, str] = {}
            options: dict[str, Any] = {}
            if _accepts(compute, "field_errors"):
                options["field_errors"] = field_errors
            if not entry.has_data and _accepts(compute, "on_partial"):
                # A first load shows each field once it is complete; a scope that shows a board
                # keeps it until the next whole one is ready.
                def on_partial(fields: dict, pending: list[str]) -> None:
                    self._publish_partial(entry, fields, pending, frontier, reset_generation)

                options["on_partial"] = on_partial
            payload = compute(self._projection_db, filters, snapshot=None, now=now, **options)
            entities = board_entities(entry.query, payload)
            with self._lock:
                if reset_generation != self._reset_generation:
                    entry.dirty = True
                    return
                refresh_pending = generation != self._generation
                status = {
                    "scope": entry.query,
                    "component": "history",
                    "topic": "history.board",
                    "ready": True,
                    "pending": False,
                    "error": None,
                    "stale": self._reader_stale,
                    "reader_ready": self._reader_ready,
                    "reason": (
                        self._safe_reason(self._reader_reason)
                        if self._reader_stale or not self._reader_ready
                        else None
                    ),
                    "frontier": frontier,
                    "computed_at": time.time(),
                    "refresh_pending": refresh_pending,
                    "consistency": "queryable results; input frontier is not a cluster-wide atomic snapshot",
                }
                if field_errors:
                    # The fields of a failed optional section are left out; each says why.
                    status["field_errors"] = {
                        field: self._safe_reason(reason) or "History read failed" for field, reason in field_errors.items()
                    }
            entities.append(
                ("source.status", f"history:{stable_id(entry.query)}", status, "runtime.operational")
            )
            if self._stop.is_set():
                return
            with self._lock:
                if self._scopes.get(entry.query) is not entry or not entry.refs:
                    return
                if reset_generation != self._reset_generation:
                    entry.dirty = True
                    return
                self._replace_scope_topics(entry.query, entities)
                entry.has_data = True
                entry.grid = grid
                entry.retry_at = 0.0
                entry.status = status
                if field_errors:
                    # The failed sections are read again after the usual retry delay.
                    entry.retry_at = time.monotonic() + 5.0
                    entry.dirty = True
                    entry.started_at = None
        except UnresolvedObservationsError as exc:
            self._block_history(entry, exc)
        except Exception as exc:  # noqa: BLE001 - a failed source must preserve the last complete projection
            error = self._safe_reason(exc) or type(exc).__name__
            logger.warning("Live history projection failed: %s", error)
            with self._lock:
                entry.retry_at = time.monotonic() + 5.0
            self._scope_status(
                entry.query,
                ready=entry.has_data,
                pending=False,
                stale=True,
                error=error,
                reason=error,
                frontier=frontier,
                refresh_pending=False,
            )

    def _publish_partial(self, entry: _Scope, fields: dict, pending: list[str], frontier: dict,
                         reset_generation: int) -> None:
        """Publish the complete fields of a first load; *pending* names the fields still to come."""
        if self._stop.is_set():
            return
        entities = board_entities(entry.query, fields)
        with self._lock:
            if self._scopes.get(entry.query) is not entry or not entry.refs or entry.has_data:
                return
            if reset_generation != self._reset_generation:
                return
            status = {
                "scope": entry.query,
                "component": "history",
                "topic": "history.board",
                "ready": False,
                "pending": True,
                "pending_fields": list(pending),
                "error": None,
                "stale": self._reader_stale,
                "reader_ready": self._reader_ready,
                "reason": (
                    self._safe_reason(self._reader_reason)
                    if self._reader_stale or not self._reader_ready
                    else None
                ),
                "frontier": frontier,
                "computed_at": time.time(),
                "refresh_pending": True,
                "consistency": "queryable results; input frontier is not a cluster-wide atomic snapshot",
            }
            entities.append(("source.status", f"history:{stable_id(entry.query)}", status, "runtime.operational"))
            self._replace_scope_topics(entry.query, entities)
            entry.status = status

    def _replace_scope_topics(self, scope: str, entities: list) -> None:
        """Publish a scope's board; unwatched scopes give up their space first. Call under the lock."""
        while True:
            try:
                self.hub.replace_topics(scope, entities, _BOARD_TOPICS)
                return
            except LiveCapacityError:
                idle = [other for other, entry in self._scopes.items() if not entry.refs and other != scope]
                if not idle:
                    raise
                oldest = min(idle, key=lambda other: self._scopes[other].last_used)
                self.hub.replace_topics(oldest, [], _BOARD_TOPICS)
                self._scopes.pop(oldest)

    def _health_loop(self) -> None:
        ready = False
        inventory_version = None
        while not self._stop.is_set():
            with self._lock:
                watched = bool(self._clients)
            try:
                if watched:
                    health, machine = self._health_provider()
                    if self._stop.is_set():
                        return
                    # Inventory changes minutes apart. Don't encode and transmit all
                    # table rows with each one-second operational heartbeat.
                    store = health.get("store", {})
                    inventory = store.get("table_inventory")
                    separate = []
                    version = None
                    if inventory is not None:
                        version = (store.get("destination"), inventory.get("status"), inventory.get("checked_at"), inventory.get("attempted_at"))
                        health = {**health, "store": {k: v for k, v in store.items() if k != "table_inventory"}}
                        if version != inventory_version:
                            # The inventory's human-readable scope is not a live subscription scope.
                            separate.append(("runtime.health", "table_inventory", {"inventory": inventory}, "runtime.operational"))
                    self.hub.commit(
                        [
                            ("runtime.health", "local", health, "runtime.operational"),
                            *separate,
                            ("runtime.machine", "local", machine, "runtime.collector"),
                            (
                                "source.status",
                                "health",
                                {
                                    "component": "health",
                                    "topic": "runtime.health",
                                    "topics": ["runtime.health", "runtime.machine"],
                                    "ready": True,
                                    "pending": False,
                                    "stale": False,
                                    "error": None,
                                    "reason": None,
                                    "computed_at": time.time(),
                                },
                                "runtime.operational",
                            ),
                        ], removals=[("runtime.health", "table_inventory")] if inventory_version and version is None else None,
                    )
                    inventory_version = version
                    ready = True
            except Exception as exc:  # noqa: BLE001 - optional diagnostics must not terminate the live worker
                error = self._safe_reason(exc) or type(exc).__name__
                logger.warning("Live operational health failed: %s", error)
                self.hub.publish(
                    "source.status",
                    "health",
                    {
                        "component": "health",
                        "topic": "runtime.health",
                        "topics": ["runtime.health", "runtime.machine"],
                        "ready": ready,
                        "pending": False,
                        "stale": True,
                        "error": error,
                        "reason": error,
                        "checked_at": time.time(),
                    },
                    source="runtime.operational",
                )
            self._stop.wait(self.HEALTH_INTERVAL_S)

    def _expire_scopes_locked(self, *, force: bool = False) -> None:
        now = time.monotonic()
        for scope, entry in sorted(self._scopes.items(), key=lambda item: item[1].last_used):
            if not entry.refs and (force or now - entry.last_used > self.IDLE_SCOPE_S):
                self.hub.replace_topics(scope, [], _BOARD_TOPICS)
                self._scopes.pop(scope)
                if force:
                    return

    def _release(self, scope: str) -> None:
        with self._lock:
            entry = self._scopes.get(scope)
            if entry is not None:
                entry.refs = max(0, entry.refs - 1)
                entry.last_used = time.monotonic()

    def _release_client(self, watch: tuple[str, str] | None = None) -> None:
        with self._lock:
            self._clients = max(0, self._clients - 1)
            if watch:
                refs = self._agent_refs[watch] - 1
                if refs:
                    self._agent_refs[watch] = refs
                else:
                    del self._agent_refs[watch]
                    self._agent_refresh.pop(watch, None)
                    self._agent_errors.pop(watch, None)
                    self.hub.remove("history.agent", watched_agent_id(watch), source="kusto.queryable")

    def close(self) -> None:
        self._stop.set()
        self._wake.set()
        self._agent_wake.set()
        with self._start_lock:
            if self._reader_handle is not None:
                self._reader_handle.close()
            if self._reader is not None:
                self._reader.close()
        for thread in self._threads:
            thread.join(timeout=1.0)


class _DashboardSubscription:
    def __init__(
        self, dashboard: LiveDashboard, subscription: Any, scope: str, history: bool,
        watch: tuple[str, str] | None = None,
    ) -> None:
        self._dashboard = dashboard
        self._subscription = subscription
        self._scope = scope
        self._history = history
        self._watch = watch
        self._closed = False

    def next(self, timeout: float = 30.0) -> tuple[str, dict] | None:
        return self._subscription.next(timeout)

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._subscription.close()
        self._dashboard._release_client(self._watch)
        if self._history:
            self._dashboard._release(self._scope)
