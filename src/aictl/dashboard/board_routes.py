"""HTTP delivery for board and terminal detail routes."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable
from typing import Any
from urllib.parse import parse_qs, urlparse

from ..stores.base import StoreError
from ..tool_scope import normalize_selection
from .artifact_details import error_detail, file_detail, file_excerpt, prompt_detail, skill_detail, tool_detail
from .board_filters import BoardRequestError, parse_filters
from .history_scope import ScopeError, identity_parts, parse_scope
from .http_request import _local_request
from .live import stream as live_stream
from .projection_utils import _as_number
from .projections.history import (
    HistoryScope,
)
from .session_details import agent_detail

logger = logging.getLogger(__name__)


def handle_get(
    path: str, query: str, db: Any, store: Any, now: float | None = None, is_allowed: Callable[[str], bool] | None = None
) -> tuple[int, bytes]:
    """Route a GET under /api/board. Returns the status and the JSON body."""
    qs = parse_qs(query, keep_blank_values=True)

    def one(key: str) -> str:
        return (qs.get(key) or [""])[0]

    try:
        scope = parse_scope(qs)
        history = HistoryScope.local(store)
        if scope.kind != "local":
            from .scoped_history import route

            return route(db, scope, path, query, qs, time.time() if now is None else now, reader=history.reader)
        # A scoped deep link is never interpreted as a local native ID.
        if any(identity_parts(one(key)) for key in ("id", "session_id")):
            raise ScopeError("A node-qualified record requires a historical scope")
        if path in {"/api/board/agent", "/api/board/sessions", "/api/board/file"}:
            history.require_reader()
        from . import memory_views

        snapshot = getattr(store, "snapshot", None)
        if path in {
            "/api/board/terminal/resources", "/api/board/terminal/sessions", "/api/board/terminal/events",
            "/api/board/terminal/metrics", "/api/board/terminal/file",
        }:
            from .projections.terminal import terminal_detail

            try:
                status, payload = terminal_detail(
                    path.rsplit("/", 1)[-1], qs, snapshot, history.reader, is_allowed,
                    time.time() if now is None else now,
                )
            except ValueError as exc:
                status, payload = 400, {"error": str(exc)}
        elif path in memory_views.ROUTES:
            status, payload = memory_views.handle(path, one, db, history, now)
        elif path == "/api/board/agent":
            status, payload = agent_detail(db, one("id"), snapshot, now, history=history) if one("id") else (400, {"error": "Missing id"})
        elif path == "/api/board/sessions":
            from .session_record import finder_query, live_activity, live_pids, search_sessions

            try:
                finder = finder_query(qs)
            except ValueError as exc:
                raise BoardRequestError(str(exc)) from exc
            status, payload = 200, search_sessions(
                db, query=finder, history=history, live=live_pids(snapshot), now=now, activity=live_activity(snapshot),
            )
        elif path == "/api/board/tool":
            if one("name"):
                filters = parse_filters(query, time.time() if now is None else now) if one("since") and one("until") else None
                status, payload = tool_detail(db, one("name"), now, filters=filters, history=history)
            else:
                status, payload = 400, {"error": "Missing name"}
        elif path == "/api/board/error":
            filters = parse_filters(query, time.time() if now is None else now) if one("since") and one("until") else None
            status, payload = error_detail(db, one("key"), now, filters=filters, history=history) if one("key") else (400, {"error": "Missing key"})
        elif path == "/api/board/skill":
            if one("name"):
                tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
                status, payload = skill_detail(db, one("name"), now, _as_number(one("since")), _as_number(one("until")), tools,
                                               history=history)
            else:
                status, payload = 400, {"error": "Missing name"}
        elif path in {"/api/board/mcp", "/api/board/mcp/server", "/api/board/convergence"}:
            status, payload = _pattern_view(path, qs, query, time.time() if now is None else now, history)
        elif path == "/api/board/session/convergence":
            if not one("session_id"):
                status, payload = 400, {"error": "Missing session_id"}
            else:
                from .convergence import session_convergence

                status, payload = session_convergence(one("session_id"), now, history=history)
        elif path == "/api/board/excerpt":
            at = _as_number(one("line"))
            status, payload = file_excerpt(one("path"), max(1, int(at or 1)), is_allowed) if one("path") else (400, {"error": "Missing path"})
        elif path == "/api/board/file":
            status, payload = file_detail(db, one("path"), now, since=_as_number(one("since")),
                                          until=_as_number(one("until")), history=history) if one("path") else (400, {"error": "Missing path"})
        elif path == "/api/board/prompt":
            ts = _as_number(one("ts"))
            if ts is None or not one("session_id"):
                status, payload = 400, {"error": "Missing ts or session_id"}
            else:
                status, payload = prompt_detail(db, ts, one("session_id"), now, history=history)
        else:
            status, payload = 404, {"error": "No such route"}
    except BoardRequestError as exc:
        status, payload = 400, {"error": str(exc)}
    except ScopeError as exc:
        status, payload = exc.status, {"error": str(exc), "reason": exc.reason}
    except StoreError as exc:
        status, payload = 503, {"error": str(exc)}
    return status, json.dumps(payload).encode("utf-8")


def _pattern_view(path: str, qs: dict[str, list[str]], query: str, now: float, history: HistoryScope) -> tuple[int, dict]:
    """The MCP and convergence panels and the MCP server drawer, for the board's filters."""
    from .convergence import convergence_board
    from .mcp_view import mcp_board, mcp_server_detail

    filters = parse_filters(query, now)
    if path == "/api/board/convergence":
        return convergence_board(filters, now, history=history)
    if path == "/api/board/mcp":
        return mcp_board(filters, now, history=history)
    group = (qs.get("id") or [""])[0]
    if not group:
        return 400, {"error": "Missing id"}
    return mcp_server_detail(group, filters, now, history=history)


class BoardRoutes:
    def _serve_board_nodes(self, params: dict[str, list[str]]) -> None:
        from .node_views import NodeViewError, agent_inventory, node_view
        from .projections.history import configured_reader
        from .runtime_health import _cached_health_data

        try:
            reader = configured_reader(self.server.store)
            body = node_view(
                self._db, params, reader=reader, local_health=self._board_health,
                shared_health=lambda: _cached_health_data(self._db, time.time(), reader),
                local_inventory=lambda: agent_inventory(getattr(self.server.store, "live_hub", None), time.time()),
            )
        except NodeViewError as exc:
            self._json_response({"error": str(exc)}, status=exc.status)
            return
        except Exception:  # noqa: BLE001 — contain a failed detail read in this request
            logger.exception("Could not read the node board")
            self._json_response({"error": "Could not read node data from the configured store"}, status=503)
            return
        self._send_body(json.dumps(body).encode("utf-8"), "application/json", cache_control="no-store", cors=False)

    def _serve_board_agent_kql(self) -> None:
        from .drawer_kql import kql_templates

        keys = ("preset", "session", "reporting_node", "model", "tool", "keyword", "since", "until", "include_all_sessions")
        try:
            body = kql_templates({key: self._qs_get(key, "") for key in keys})
        except ValueError as exc:
            self._json_response({"error": str(exc)}, status=400)
        else:
            self._json_response(body)

    def _serve_board(self, path: str) -> None:
        """The panel dashboard and its detail routes."""
        from ..stores import UnresolvedObservationsError

        try:
            status, body = handle_get(path, urlparse(self.path).query, self._db, self.server.store, is_allowed=self.server.allowed.is_allowed)
        except BoardRequestError as exc:
            self._json_response({"error": str(exc)}, status=400)
            return
        except UnresolvedObservationsError as exc:
            self._json_response(exc.to_dict(), status=409)
            return
        except Exception as exc:  # noqa: BLE001 — make the error visible in the panel
            logger.exception("Board route failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response_raw(body, status=status)

    def _board_health(self) -> dict:
        from .runtime_health import compute_health

        return compute_health(
            self._db,
            self.server.store,
            otel=getattr(self.server, "otel_receiver", None),
            ingesters=getattr(self.server, "ingesters", None),
            stream_clients=live_stream.client_count(),
            port=int(self.server.server_address[1]),
            http_reads=self.server.health_reads,
            http_writes=self.server.health_writes,
        )

    def _serve_board_context(self) -> None:
        """Context-window budget, files, memory and lifetime telemetry for the board."""
        from ..stores import UnresolvedObservationsError
        from .context_projection import context_bytes

        try:
            body = context_bytes(self._db, self.server.store, urlparse(self.path).query)
        except UnresolvedObservationsError as exc:
            self._json_response(exc.to_dict(), status=409)
            return
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return
        except Exception as exc:  # noqa: BLE001 — make the error visible in the panel
            logger.exception("Board context route failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response_raw(body)

    def _serve_board_action(self) -> None:
        """Run one maintenance action of the panel dashboard. This machine only."""
        from .board_actions import run_action

        if not _local_request(self.client_address[0], self.headers.get("Host")):
            self._json_response({"error": "This route answers requests from this machine only."}, status=403)
            return
        content_length = self._content_length()
        if content_length is None:
            return
        if content_length > 100_000:
            self.send_error(413, "Payload too large")
            return
        try:
            data = json.loads(self.rfile.read(content_length) or b"{}")
        except (json.JSONDecodeError, OSError):
            self._json_response({"error": "Invalid JSON"}, status=400)
            return
        if self._reject_scoped_action(data):
            return
        status, payload = run_action(self._db, self.server.root, data, self.server.server_address[1])
        self._json_response(payload, status=status)
