"""Narrow contract reads for scoped panels and whole-window charts."""

import json
import logging
import threading
import time
from concurrent.futures import Future
from dataclasses import replace
from urllib.parse import parse_qs

from ..stores import UnresolvedObservationsError, has_history
from ..stores.base import StoreError
from .board_filters import BoardRequestError, parse_filters
from .board_projection import compute_board
from .history_scope import ScopeError, label, parse_scope
from .projection_utils import safe_reason
from .projections.history import HistoryScope

_PANEL_FIELDS = (
    "range", "series", "generated_at", "agents", "attention", "by_model", "by_role", "capture_mode", "changes", "confirms",
    "coverage", "credits", "errors", "kpis", "latency", "loops", "memory_files", "options", "project_prompts",
    "project_prompts_searched", "projects", "prompts", "prompts_total", "saved_usd", "scope", "skills",
    "sources", "tests", "tests_piped", "tool_labels", "tools", "unpriced",
)
# Per key: (read at, body, complete). An incomplete answer lacks the fields of an optional section that failed.
_cache: dict[tuple, tuple[float, bytes, bool]] = {}
_inflight: dict[tuple, Future] = {}
_lock = threading.Lock()
_CACHE_KEYS = 12
# An answer older than its TTL is still returned at once, up to this age, while a new one is read.
_STALE_MAX_S = 600.0
# An incomplete answer is kept this long, and never served once older, so a later request reads the
# failed sections again; the same delay as the live board's retry.
_INCOMPLETE_TTL_S = 5.0
# A range that follows the clock is asked for with a new window every few seconds. The board of the
# window read last answers such a request while it is younger than its lifetime and than this many
# times the time it took to read, plus that time: a board that is slow to read is then read at most a
# fifth of the time, and two windows of one range are never read side by side.
_REST_FACTOR = 4.0
# A request whose window ends this close to now follows the clock.
_ROLLING_S = 120.0
# Per range that follows the clock: the key of the window read last, and how long that read took.
_latest: dict[tuple, tuple[tuple, float]] = {}
logger = logging.getLogger(__name__)


def read_board(store, query: str, now: float | None = None) -> bytes:
    params = parse_qs(query, keep_blank_values=True)
    scope = parse_scope(params)
    view = params.get("view", ["panels"] if scope.kind != "local" else ["charts"])
    if view != ["charts"] and (view != ["panels"] or scope.kind == "local"):
        raise BoardRequestError("Use the charts view for local reads, or charts or panels for scoped reads")
    charts = view == ["charts"]
    now = time.time() if now is None else now
    filters = parse_filters(query, now)
    local = scope.kind == "local"
    span = filters.until - filters.since
    history = HistoryScope.local(store)
    if not local:
        if span > 31 * 86400:
            raise ScopeError("Node history supports a time range of up to 31 days", 422, "history_limit")
        if not has_history(history.reader):
            raise ScopeError("Node history requires a shared history store", 422, "unsupported_scope")
        history = HistoryScope(history.reader, scope.node, qualified=True)
    history.require_reader()
    ttl = 15 if local else 120 if span > 86400 else 45
    key = (history.reader, history.node, scope, filters, charts)
    rolling = (history.reader, history.node, scope, replace(filters, since=0.0, until=0.0), round(span), charts)
    follows_clock = 0 <= now - filters.until < _ROLLING_S

    def build() -> tuple[bytes, bool]:
        # Only the panels view leaves a failed optional section out; the charts need none.
        field_errors: dict[str, str] | None = None if charts else {}
        try:
            fields = compute_board(store, filters, getattr(store, "snapshot", None) if local else None,
                                   now, history=history, charts_only=charts, field_errors=field_errors)
        except StoreError as exc:
            if local:
                raise
            raise ScopeError(str(exc), 503, "query_failed") from exc
        payload = fields if charts else {
            name: fields[name] for name in _PANEL_FIELDS if name in fields or name not in field_errors}
        if field_errors:
            payload["field_errors"] = {
                field: safe_reason(reason) or "History read failed" for field, reason in field_errors.items()}
        payload["node_scope"] = {"kind": scope.kind, "node_id": label(scope.node) if scope.node is not None else None}
        return json.dumps(payload).encode("utf-8"), not field_errors

    def timed_build() -> tuple[bytes, bool]:
        started = time.monotonic()
        with _lock:
            if follows_clock:
                _latest[rolling] = (key, 0.0)
        result = build()
        with _lock:
            if follows_clock and _latest.get(rolling, (None,))[0] == key:
                _latest[rolling] = (key, time.monotonic() - started)
                while len(_latest) > _CACHE_KEYS:
                    _latest.pop(next(iter(_latest)))
        return result

    # Each key is read by one caller at a time; other keys do not wait for it.
    with _lock:
        if follows_clock and (latest := _latest.get(rolling)) is not None and latest[0] != key:
            earlier, cost = latest
            answer = _cache.get(earlier)
            behind = filters.until - earlier[3].until
            return_pending = None
            if earlier in _inflight:
                # The window before this one is being read: its board answers this request too.
                if answer and answer[2]:
                    return answer[1]
                return_pending = _inflight[earlier]
            else:
                rest = max(ttl, cost * (1.0 + _REST_FACTOR))
                if answer and answer[2] and 0 <= behind < rest and time.monotonic() - answer[0] < rest:
                    return answer[1]
        else:
            return_pending = None
    if return_pending is not None:
        return return_pending.result()
    with _lock:
        hit = _cache.get(key)
        pending = _inflight.get(key)
        age = time.monotonic() - hit[0] if hit else None
        if hit and age < (ttl if hit[2] else _INCOMPLETE_TTL_S):
            return hit[1]
        if hit and hit[2] and age < _STALE_MAX_S:
            if pending is None:
                _inflight[key] = Future()
                threading.Thread(target=_refresh_quietly, args=(key, timed_build), daemon=True,
                                 name="history-board").start()
            return hit[1]
        if pending is None:
            _inflight[key] = Future()
    if pending is not None:
        return pending.result()
    return _refresh(key, timed_build)


def _refresh(key: tuple, build) -> bytes:
    with _lock:
        future = _inflight[key]
    try:
        body, complete = build()
    except BaseException as exc:
        with _lock:
            _inflight.pop(key, None)
        future.set_exception(exc)
        raise
    with _lock:
        _cache.pop(key, None)
        _cache[key] = (time.monotonic(), body, complete)
        if len(_cache) > _CACHE_KEYS:
            _cache.pop(next(iter(_cache)))
        _inflight.pop(key, None)
    future.set_result(body)
    return body


def _refresh_quietly(key: tuple, build) -> None:
    try:
        _refresh(key, build)
    except Exception:  # noqa: BLE001 - the earlier answer stays in use until it is too old
        logger.debug("Dashboard history refresh failed", exc_info=True)


def serve(handler, query: str) -> None:
    try:
        body = read_board(handler.server.store, query)
    except BoardRequestError as exc:
        handler._json_response({"error": str(exc)}, status=400)
    except ScopeError as exc:
        handler._json_response({"error": str(exc), "reason": exc.reason}, status=exc.status)
    except UnresolvedObservationsError as exc:
        handler._json_response(exc.to_dict(), status=409)
    except StoreError as exc:
        handler._json_response({"error": str(exc)}, status=503)
    except Exception:
        logger.exception("Could not read dashboard history")
        handler._json_response({"error": "Could not read dashboard history"}, status=503)
    else:
        handler._json_response_raw(body)
