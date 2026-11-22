"""Narrow contract reads for scoped panels and whole-window charts."""

import json
import logging
import threading
import time
from concurrent.futures import Future
from urllib.parse import parse_qs

from ..stores import UnresolvedObservationsError, has_history
from ..stores.base import StoreError
from .board_filters import BoardRequestError, parse_filters
from .board_projection import compute_board
from .history_scope import ScopeError, label, parse_scope
from .projections.history import HistoryScope

_PANEL_FIELDS = (
    "range", "series", "generated_at", "agents", "attention", "by_model", "by_role", "capture_mode", "changes", "confirms",
    "coverage", "credits", "errors", "kpis", "latency", "loops", "memory_files", "options", "project_prompts",
    "project_prompts_searched", "projects", "prompts", "prompts_total", "saved_usd", "scope", "skills",
    "sources", "tests", "tests_piped", "tool_labels", "tools", "unpriced",
)
_cache: dict[tuple, tuple[float, bytes]] = {}
_inflight: dict[tuple, Future] = {}
_lock = threading.Lock()
_CACHE_KEYS = 12
# An answer older than its TTL is still returned at once, up to this age, while a new one is read.
_STALE_MAX_S = 600.0
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

    def build() -> bytes:
        try:
            fields = compute_board(store, filters, getattr(store, "snapshot", None) if local else None,
                                   now, history=history, charts_only=charts)
        except StoreError as exc:
            if local:
                raise
            raise ScopeError(str(exc), 503, "query_failed") from exc
        payload = fields if charts else {name: fields[name] for name in _PANEL_FIELDS}
        payload["node_scope"] = {"kind": scope.kind, "node_id": label(scope.node) if scope.node is not None else None}
        return json.dumps(payload).encode("utf-8")

    # Each key is read by one caller at a time; other keys do not wait for it.
    with _lock:
        hit = _cache.get(key)
        pending = _inflight.get(key)
        age = time.monotonic() - hit[0] if hit else None
        if hit and age < ttl:
            return hit[1]
        if hit and age < _STALE_MAX_S:
            if pending is None:
                _inflight[key] = Future()
                threading.Thread(target=_refresh_quietly, args=(key, build), daemon=True,
                                 name="history-board").start()
            return hit[1]
        if pending is None:
            _inflight[key] = Future()
    if pending is not None:
        return pending.result()
    return _refresh(key, build)


def _refresh(key: tuple, build) -> bytes:
    with _lock:
        future = _inflight[key]
    try:
        body = build()
    except BaseException as exc:
        with _lock:
            _inflight.pop(key, None)
        future.set_exception(exc)
        raise
    with _lock:
        _cache.pop(key, None)
        _cache[key] = (time.monotonic(), body)
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
