# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""REST API endpoint handler methods for the dashboard.

Provides _APIHandlersMixin which is mixed into _DashboardHandler to
supply all /api/* endpoint implementations.
"""

from __future__ import annotations

import dataclasses
import json
import re
import time
from collections import Counter
from datetime import datetime, timezone

from ..data.token_usage import TokenUsage
from ..tools import compute_token_budget
from .models import _slim_agent_teams
from .otel_receiver import API_ERROR_EVENTS, API_REQUEST_EVENTS, _num
from .session_flow import build_session_flow

# Synthesized process-based session_id format: "tool:pid:timestamp".
# Used by copilot-vscode (and other tools that don't emit their own ids)
# to synthesize a session id from the process. Such ids never appear in
# OTel events — OTel emitters tag events with the tool's own chat/session
# id — so strict session_id matching misses everything. When we see one
# of these, we fall back to matching on tool + the session's time window.
_SYNTHETIC_SESSION_RE = re.compile(r"^[a-z][a-z0-9-]*:\d+:\d+$")

_IMPORTED_SESSION_SOURCES = {
    "claude-code-jsonl",
    "copilot-session-store",
    "cursor-ingester",
    "vscode-chat-logs",
}


def _match_live_session(profile: dict, live_sessions: list[dict]) -> dict | None:
    """Find the live snapshot session that corresponds to a DB profile row.

    Live snapshot ids (``tool:pid:started``) and persisted row ids (tool
    UUIDs, correlator composites) come from different sources, so exact
    id equality misses and the same session shows up twice — one "live"
    row plus a stale historical row.  Match, in order of confidence, by:

    1. exact session_id
    2. shared UUID component in the ids
    3. same tool + the profile's PID appearing in the live session's PIDs
    4. same tool + near-total time overlap + no workspace conflict
    """
    from ..storage import _session_uuid

    # 1. Exact id
    for live in live_sessions:
        if live.get("session_id") == profile.get("session_id"):
            return live

    # 2. Shared UUID component
    p_uuid = _session_uuid(profile.get("session_id", ""))
    if p_uuid:
        for live in live_sessions:
            if _session_uuid(live.get("session_id", "")) == p_uuid:
                return live

    # 3. PID linkage
    p_pid = int(profile.get("pid", 0) or 0)
    if p_pid:
        for live in live_sessions:
            if live.get("tool") != profile.get("tool"):
                continue
            if p_pid == (live.get("root_pid") or 0) or p_pid in (live.get("pids") or []):
                return live

    # 4. Time-window overlap (workspace-compatible)
    now = time.time()
    p_start = float(profile.get("started_at", 0) or 0)
    p_end = float(profile.get("ended_at") or now)
    p_duration = max(p_end - p_start, 1.0)
    p_workspace = profile.get("project_path") or profile.get("project") or ""
    for live in live_sessions:
        if live.get("tool") != profile.get("tool"):
            continue
        l_start = float(live.get("started_at", 0) or 0)
        if l_start <= 0:
            continue  # no reliable window to compare against
        l_end = float(live.get("last_seen_at") or now)
        l_workspace = live.get("project") or ""
        if (
            p_workspace
            and l_workspace
            and p_workspace != l_workspace
            and p_workspace not in (live.get("workspaces") or [])
        ):
            continue
        overlap = min(p_end, l_end) - max(p_start, l_start)
        if overlap / p_duration >= 0.8:
            return live
    return None


def _kill_session_pids(pids: list[int], sig_name: str) -> dict[str, list[int]]:
    """Send SIGTERM/SIGKILL to the given PIDs and their child trees.

    Skips aictl's own process (defensive — a tracked PID should never be the
    server itself, but a kill on ourselves would take down the very dashboard
    issuing the command). Returns ``{signaled, failed}`` lists of PIDs.
    """
    import os
    import signal as _signal

    # SIGKILL does not exist on Windows; fall back to SIGTERM so the kill
    # endpoint works out of the box there (os.kill on Windows terminates the
    # process via TerminateProcess regardless of the signal value).
    sig = getattr(_signal, "SIGKILL", _signal.SIGTERM) if sig_name == "KILL" else _signal.SIGTERM
    own = os.getpid()
    targets: list[int] = []
    for pid in pids:
        if pid == own:
            continue
        targets.append(pid)
        try:
            import psutil

            for child in psutil.Process(pid).children(recursive=True):
                if child.pid != own:
                    targets.append(child.pid)
        except Exception:
            # psutil missing / process gone / access denied — still attempt
            # the parent below; child discovery is best-effort.
            pass
    signaled: list[int] = []
    failed: list[int] = []
    for pid in dict.fromkeys(targets):  # dedupe, preserve discovery order
        try:
            os.kill(pid, sig)
            signaled.append(pid)
        except OSError:
            failed.append(pid)
    return {"signaled": signaled, "failed": failed}


def _cache_hit_ratio(session: dict) -> float | None:
    """Fraction of prompt tokens served from cache for a session.

    ``cache_read / (input + cache_read)``. Live snapshot dicts use the
    ``exact_*`` token keys; persisted rows use the plain keys. Returns
    ``None`` when no token data is present so the UI can render an
    empty-state rather than a misleading 0.0.
    """
    cache_read = int(session.get("cache_read_tokens", session.get("exact_cache_read_tokens", 0)) or 0)
    input_tokens = int(session.get("input_tokens", session.get("exact_input_tokens", 0)) or 0)
    denom = input_tokens + cache_read
    if denom <= 0:
        return None
    return round(cache_read / denom, 4)


def _db_session_lifecycle_status(row: dict, entity_state: object | None = None) -> tuple[str, bool]:
    """Return (lifecycle_status, active) for a persisted session row."""
    if row.get("ended_at"):
        return "ended", False
    state = getattr(entity_state, "state", "") if entity_state is not None else ""
    if state and state != "inactive":
        return "active", True
    if row.get("source", "") in _IMPORTED_SESSION_SOURCES:
        return "imported", False
    return "open", False


# ─── Budget cache ────────────────────────────────────────────────

_budget_cache: tuple[int, dict] | None = None


class _APIHandlersMixin:
    """REST API endpoint handler methods.

    Mixed into _DashboardHandler to keep endpoint logic in a separate module.
    Methods access ``self.server``, ``self._db``, ``self._qs_get``, etc.
    which are defined on the actual handler class.
    """

    def _serve_agent_teams(self) -> None:
        """Return full agent detail for a specific team (lazy-loaded by frontend).

        Usage: GET /api/agent-teams?session_id=<id>
        Without session_id, returns slim summaries for all teams.
        """
        snap = self.server.store.snapshot
        if snap is None or not snap.agent_teams:
            self._json_response([])
            return
        session_id = self._qs_get("session_id")
        if session_id:
            for team in snap.agent_teams:
                if team.get("session_id") == session_id:
                    self._json_response(team)
                    return
            self.send_error(404, "Team not found")
        else:
            self._json_response(_slim_agent_teams(snap.agent_teams))

    def _serve_self_status(self) -> None:
        """Return aictl's own resource usage and DB stats."""
        import os

        result = {}
        try:
            import psutil

            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            # interval=0 returns since last call — non-blocking.
            # CollectorHealth polls every 15s so the measurement window is fine.
            cpu = proc.cpu_percent(interval=0)
            result["pid"] = os.getpid()
            result["cpu_percent"] = round(cpu, 1)
            result["memory_rss_bytes"] = mem.rss
            result["memory_vms_bytes"] = mem.vms
            result["threads"] = proc.num_threads()
            result["uptime_s"] = round(time.time() - proc.create_time(), 1)
        except Exception:
            result["pid"] = os.getpid()
        db = self._db
        if db:
            try:
                result["db"] = db.stats()
            except Exception:
                result["db"] = {}
        # Sink stats (emission rates, flood protection)
        sink = getattr(self.server.store, "_sink", None)
        if sink:
            try:
                result["sink"] = sink.stats()
            except Exception:
                result["sink"] = {}
        self._json_response(result)

    def _tool_name_from_config_path(self) -> str:
        from urllib.parse import unquote

        return unquote(self.path.split("/api/tool-config/", 1)[-1].split("?", 1)[0])

    def _serve_tool_config_get(self) -> None:
        """Return an editable project-scoped tool config payload."""
        from .tool_config_editor import ToolConfigEditError, load_editable_tool_config

        try:
            payload = load_editable_tool_config(self.server.root, self._tool_name_from_config_path())
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)
            return
        self._json_response(payload)

    def _serve_tool_config_put(self) -> None:
        """Persist editable project-scoped tool config fields."""
        from .tool_config_editor import ToolConfigEditError, save_editable_tool_config

        content_length = self._content_length()
        if content_length is None:
            return
        if content_length > 200_000:
            self.send_error(413, "Payload too large")
            return
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body or b"{}")
        except (json.JSONDecodeError, OSError):
            self._json_response({"error": "Invalid JSON"}, status=400)
            return
        if not isinstance(data, dict):
            self._json_response({"error": "Request body must be a JSON object"}, status=400)
            return
        try:
            payload = save_editable_tool_config(self.server.root, self._tool_name_from_config_path(), data)
        except ToolConfigEditError as exc:
            self._json_response({"error": exc.message}, status=exc.status)
            return
        self._json_response(payload)

    def _serve_session_flow(self) -> None:
        """Return conversation-turn-level data for a session.

        Correlates hook events (UserPromptSubmit, PreToolUse, PostToolUse,
        PreCompact, PostCompact) and OTel API request events into an ordered
        list of conversation turns for the session flow waterfall view.

        When no UserPromptSubmit hooks are available, falls back to building
        turns from OTel API request events grouped by time gaps.

        Params: ?session_id=<id>&since=<unix_ts>
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self._json_response({"error": "session_id required", "turns": []})
            return

        db = self._db
        if not db:
            self._json_response({"turns": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 86400 * 7)
        until = self._qs_float("until", time.time())

        result = build_session_flow(db, session_id, since, until)
        self._json_response(result)

    def _serve_session_memory_diff(self) -> None:
        """Return Claude memory diff between session start and end snapshots.

        GET /api/session-memory-diff?session_id=<id>
        Response: {files: [...], summary: {added, modified, removed}}.
        Returns an empty file list (not an error) if one/both phases
        are missing, so the UI can render an empty-state gracefully.
        """
        from ..memory_snapshot import build_session_memory_diff

        session_id = self._qs_get("session_id")
        if not session_id:
            self._json_response(
                {"error": "session_id required", "files": [], "summary": {"added": 0, "modified": 0, "removed": 0}},
                status=400,
            )
            return
        db = self._db
        if not db:
            self._json_response({"files": [], "summary": {"added": 0, "modified": 0, "removed": 0}})
            return
        try:
            conn = db._conn()  # noqa: SLF001 — read-only per-thread connection
            payload = build_session_memory_diff(conn, session_id)
        except Exception:  # noqa: BLE001 — never 500 the UI
            payload = {"files": [], "summary": {"added": 0, "modified": 0, "removed": 0}}
        self._json_response(payload)

    def _serve_file_writes(self) -> None:
        """Return write-like file events attributed to sessions/tools.

        GET /api/file-writes?session_id=X&path=/tmp/a.py&since=0
        """
        db = self._db
        if not db:
            self._json_response({"writes": [], "count": 0})
            return
        limit = min(int(self._qs_get("limit", "500")), 2000)
        rows = db.query_file_writes(
            session_id=self._qs_get("session_id") or None,
            path=self._qs_get("path") or None,
            tool=self._qs_get("tool") or None,
            since=self._qs_float_opt("since"),
            until=self._qs_float_opt("until"),
            limit=limit,
        )
        self._json_response({"writes": rows, "count": len(rows)})

    def _serve_data_quality(self) -> None:
        """Return current health of collectors, ingesters, and sinks.

        GET /api/data-quality?status=degraded&kind=ingester
        """
        db = self._db
        if not db:
            self._json_response({"items": [], "summary": {}})
            return
        limit = min(int(self._qs_get("limit", "500")), 2000)
        rows = db.query_data_quality(
            status=self._qs_get("status") or None,
            kind=self._qs_get("kind") or None,
            component=self._qs_get("component") or None,
            limit=limit,
        )
        summary = dict(Counter(row.get("status", "") for row in rows))
        self._json_response({"items": rows, "summary": summary})

    def _serve_transcript(self) -> None:
        """Return structured transcript for a single session.

        GET /api/transcript/<session_id>
        Returns the full SessionTranscript (turns, actions, summary).
        """
        from urllib.parse import unquote

        # Extract session_id from path: /api/transcript/<session_id>
        path = self.path.split("?")[0]
        session_id = unquote(path.split("/api/transcript/", 1)[-1])
        if not session_id:
            self._json_response({"error": "session_id required"}, status=400)
            return

        analyzer = self.server.session_analyzer
        transcript = analyzer.get_transcript(session_id)

        if transcript is None:
            # Fall back to building from DB events (for historical sessions)
            db = self._db
            if db:
                since = self._qs_float("since", time.time() - 86400 * 7)
                until = self._qs_float("until", time.time())
                result = build_session_flow(db, session_id, since, until)
                self._json_response(result)
            else:
                self._json_response({"error": "session not found"}, status=404)
            return

        self._json_response(transcript.to_dict())

    def _serve_transcripts(self) -> None:
        """Return list of active session transcripts.

        GET /api/transcripts?cutoff=300
        """
        cutoff = self._qs_float("cutoff", 300)
        analyzer = self.server.session_analyzer
        transcripts = analyzer.get_active_transcripts(cutoff_seconds=cutoff)
        self._json_response(
            {
                "transcripts": [
                    {
                        "session_id": t.session_id,
                        "tool": t.tool,
                        "project": t.project,
                        "model": t.model,
                        "started_at": t.started_at,
                        "is_live": t.is_live,
                        "last_updated": t.last_updated,
                        "turns": len(t.turns),
                        "summary": t.build_summary().to_dict(),
                    }
                    for t in transcripts
                ],
                "count": len(transcripts),
            }
        )

    def _serve_session_messages(self) -> None:
        """Return merged conversation messages for a session.

        GET /api/session-messages?session_id=X&limit=200

        Merges messages derived from OTel events (``otel:user_prompt`` /
        ``otel:user_message`` / ``hook:UserPromptSubmit``) with rows
        ingested from Copilot CLI's ``session-store.db``
        (:class:`aictl.ingesters.copilot_session_store.CopilotSessionStoreIngester`),
        Cursor's ``conversations.db``
        (:class:`aictl.ingesters.cursor_conversations.CursorConversationsIngester`),
        and VS Code Copilot Chat ``chatSessions/*.jsonl`` files
        (:class:`aictl.ingesters.vscode_chat_logs.VSCodeChatLogsIngester`).

        Cross-source duplicates (the same logical message captured by both
        OTel and an ingester) are collapsed within a small time tolerance,
        while messages legitimately repeated within a single source are kept.
        Sorted oldest first. Returns ``{"messages": [...], "sources": {"otel":
        N, "copilot_store": M, "cursor": K, "vscode_chat": V}}``.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        limit = min(int(self._qs_get("limit", "200") or "200"), 2000)
        db = self._db
        if not db:
            self._json_response(
                {
                    "messages": [],
                    "sources": {"otel": 0, "copilot_store": 0, "cursor": 0, "vscode_chat": 0},
                }
            )
            return

        otel_msgs: list[dict] = []
        try:
            events = db.query_events(session_id=session_id, limit=limit * 2)
        except Exception:
            events = []
        for ev in events:
            kind = ev.kind or ""
            is_otel_prompt = kind in ("otel:user_prompt", "otel:user_message") or kind.endswith(
                (".user_prompt", ".user_message")
            )
            if not (is_otel_prompt or kind == "hook:UserPromptSubmit"):
                continue
            detail = ev.detail if isinstance(ev.detail, dict) else {}
            content = (
                detail.get("message")
                or detail.get("content")
                or detail.get("prompt")
                or detail.get("gen_ai.prompt")
                or ""
            )
            if not content:
                continue
            otel_msgs.append(
                {
                    "role": "user",
                    "content": str(content)[:4000],
                    "ts": float(ev.ts or 0),
                    "source": "otel",
                }
            )

        copilot_msgs: list[dict] = []
        try:
            conn = db._conn()
            rows = conn.execute(
                "SELECT role, content, ts FROM copilot_session_messages"
                " WHERE session_id = ? ORDER BY ts ASC, source_row_id ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            for role, content, ts in rows:
                copilot_msgs.append(
                    {
                        "role": str(role or ""),
                        "content": str(content or "")[:4000],
                        "ts": float(ts or 0),
                        "source": "copilot_store",
                    }
                )
        except Exception:
            pass

        cursor_msgs: list[dict] = []
        try:
            conn = db._conn()
            rows = conn.execute(
                "SELECT role, content, ts FROM cursor_session_messages"
                " WHERE session_id = ? ORDER BY ts ASC, source_row_id ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            for role, content, ts in rows:
                cursor_msgs.append(
                    {
                        "role": str(role or ""),
                        "content": str(content or "")[:4000],
                        "ts": float(ts or 0),
                        "source": "cursor",
                    }
                )
        except Exception:
            pass

        vscode_msgs: list[dict] = []
        try:
            conn = db._conn()
            rows = conn.execute(
                "SELECT role, content, ts FROM vscode_chat_messages"
                " WHERE session_id = ? ORDER BY ts ASC, source_row_id ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            for role, content, ts in rows:
                vscode_msgs.append(
                    {
                        "role": str(role or ""),
                        "content": str(content or "")[:4000],
                        "ts": float(ts or 0),
                        "source": "vscode_chat",
                    }
                )
        except Exception:
            pass

        # Merge sources, collapsing only *cross-source* duplicates (the same
        # logical message captured by both OTel and an ingester) while keeping
        # legitimately-repeated messages within a single source.
        #
        # The previous key `(role, content, int(ts))` silently dropped distinct
        # messages that shared role+content within the same wall-clock second
        # (e.g. two identical "continue" turns). Instead we dedup per-source:
        # each source's own rows are always kept; a later source's row is only
        # dropped if an earlier source already contributed a row with the same
        # (role, content) within a small time tolerance that hasn't been
        # matched yet.
        _TS_TOLERANCE = 2.0  # seconds — same message, slightly skewed clocks
        merged: list[dict] = []
        # (role, content) -> list of [ts, matched?] from already-added sources.
        accepted_index: dict[tuple[str, str], list[list]] = {}
        for source_msgs in (otel_msgs, copilot_msgs, cursor_msgs, vscode_msgs):
            for m in source_msgs:
                key = (m["role"], m["content"])
                candidates = accepted_index.get(key, [])
                matched = next(
                    (c for c in candidates if not c[1] and abs(c[0] - m["ts"]) <= _TS_TOLERANCE),
                    None,
                )
                if matched is not None:
                    matched[1] = True  # consume this cross-source duplicate
                    continue
                merged.append(m)
            # Only after a source is fully processed do its rows become
            # dedup anchors for *later* sources — never for its own siblings.
            for m in source_msgs:
                accepted_index.setdefault((m["role"], m["content"]), []).append([m["ts"], False])
        merged.sort(key=lambda m: (m["ts"], m["role"]))
        if len(merged) > limit:
            merged = merged[:limit]

        self._json_response(
            {
                "session_id": session_id,
                "messages": merged,
                "sources": {
                    "otel": len(otel_msgs),
                    "copilot_store": len(copilot_msgs),
                    "cursor": len(cursor_msgs),
                    "vscode_chat": len(vscode_msgs),
                },
            }
        )

    def _serve_otel_status(self) -> None:
        """Return OTel receiver health status."""
        status = self.server.otel_receiver.status()
        self._json_response(status)

    def _serve_hooks_status(self) -> None:
        """Return installed hook health and recent hook activity."""
        from .hooks_status import collect_hooks_status

        self._json_response(collect_hooks_status(self._db, self.server.root))

    def _serve_session_mcp_usage(self) -> None:
        """Return per-session MCP server usage.

        GET /api/session-mcp-usage?session_id=X

        Joins ``.vscode/mcp.json`` (and friends) discovered under the
        session's project root with OTel events that touched an MCP
        server during the session. Returns:

        ``{session_id, servers: [{server_name, call_count, first_ts,
        last_ts, total_duration_ms, err_count}], total_calls,
        configured_servers: [name, ...]}``.

        Configured-but-unused servers appear in ``configured_servers``
        only (not in ``servers``); the UI renders them dimmed.
        """
        from ..analysis.mcp_usage import configured_servers, session_mcp_calls

        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._db
        if not db:
            self._json_response(
                {
                    "session_id": session_id,
                    "servers": [],
                    "total_calls": 0,
                    "configured_servers": [],
                }
            )
            return
        servers = session_mcp_calls(db, session_id)
        sess = db.get_session(session_id) or {}
        project_path = sess.get("project_path", "") or ""
        configured = configured_servers(project_path)
        total_calls = sum(int(s.get("call_count", 0)) for s in servers)
        self._json_response(
            {
                "session_id": session_id,
                "servers": servers,
                "total_calls": total_calls,
                "configured_servers": configured,
            }
        )

    def _serve_api_calls(self) -> None:
        """Return API call data from OTel events.

        Queries events for every known api_request / api_error kind
        (Claude Code, Copilot, Codex, and the generic
        ``gen_ai.client.inference.operation.details`` spans) for
        latency/frequency analysis.
        """
        db = self._db
        if not db:
            self._json_response({"calls": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 3600)
        until = self._qs_float("until", time.time())
        limit = min(int(self._qs_get("limit", "500")), 2000)
        session_id = self._qs_get("session_id") or None

        # Resolve filter strategy. For synthesized process-based session
        # ids (e.g. ``copilot-vscode:3716:1776541738``), OTel events carry
        # the tool's own chat/session id and will never match — fall back
        # to tool-scoped querying over the session's active time window.
        filter_session_id: str | None = session_id
        filter_tool: str | None = None
        if session_id and _SYNTHETIC_SESSION_RE.match(session_id):
            sess = db.get_session(session_id)
            if sess:
                filter_session_id = None
                filter_tool = sess.get("tool") or None
                started = float(sess.get("started_at") or 0)
                ended = sess.get("ended_at")
                if started and started > since:
                    since = started
                if ended is not None:
                    try:
                        until = min(until, float(ended))
                    except (TypeError, ValueError):
                        pass

        # Query API request events across all known kinds
        api_events = []
        for name in API_REQUEST_EVENTS:
            api_events.extend(
                db.query_events(
                    since=since,
                    until=until,
                    kind=f"otel:{name}",
                    tool=filter_tool,
                    session_id=filter_session_id,
                    limit=limit,
                )
            )
        error_events = []
        for name in API_ERROR_EVENTS:
            error_events.extend(
                db.query_events(
                    since=since,
                    until=until,
                    kind=f"otel:{name}",
                    tool=filter_tool,
                    session_id=filter_session_id,
                    limit=limit,
                )
            )

        def _enrich(d: dict, is_error: bool) -> dict:
            extra: dict = {}
            # finish_reason: prefer OTel list `gen_ai.response.finish_reasons`,
            # fall back to legacy scalar keys.
            reasons = d.get("gen_ai.response.finish_reasons")
            fr = None
            if isinstance(reasons, list) and reasons:
                fr = reasons[0]
            elif isinstance(reasons, str) and reasons:
                fr = reasons
            if not fr:
                fr = d.get("finish_reason") or d.get("stop_reason")
            if fr:
                extra["finish_reason"] = str(fr)
            # http_status: accept OTel `http.status_code` and newer
            # `http.response.status_code`, plus legacy keys. Coerce to int.
            hs = (
                d.get("http.status_code")
                or d.get("http.response.status_code")
                or d.get("http_status")
                or d.get("status_code")
            )
            if hs is not None and hs != "":
                try:
                    extra["http_status"] = int(hs)
                except (TypeError, ValueError):
                    pass
            # error_type: prefer OTel `error.type`, fall back to legacy keys.
            # Only fall back to bare `type` on error events (too generic on
            # api_request).
            et = d.get("error.type") or d.get("error_type")
            if not et and is_error:
                et = d.get("type")
            if et:
                extra["error_type"] = str(et)
            return extra

        def _model(d: dict) -> str:
            # OTel GenAI semconv uses namespaced keys; legacy emitters use `model`.
            return str(d.get("gen_ai.response.model") or d.get("gen_ai.request.model") or d.get("model") or "")

        calls = []
        for ev in api_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            usage = TokenUsage.from_dict(d)
            calls.append(
                {
                    "ts": ev.ts,
                    "tool": ev.tool or d.get("tool", ""),
                    "session_id": ev.session_id or d.get("session_id", ""),
                    "pid": ev.pid or int(d.get("pid", 0) or 0),
                    "model": _model(d),
                    "duration_ms": _num(d.get("duration_ms", d.get("duration", 0))),
                    "input_tokens": usage.input,
                    "output_tokens": usage.output,
                    "cache_read_tokens": usage.cache_read,
                    "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                    "status": "ok",
                    **_enrich(d, is_error=False),
                }
            )
        for ev in error_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            calls.append(
                {
                    "ts": ev.ts,
                    "tool": ev.tool or d.get("tool", ""),
                    "session_id": ev.session_id or d.get("session_id", ""),
                    "pid": ev.pid or int(d.get("pid", 0) or 0),
                    "model": _model(d),
                    "error": d.get("error", d.get("message", "unknown")),
                    "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                    "status": "error",
                    **_enrich(d, is_error=True),
                }
            )
        calls.sort(key=lambda c: c["ts"], reverse=True)

        # Build summary
        ok_calls = [c for c in calls if c["status"] == "ok"]
        durations = [c["duration_ms"] for c in ok_calls if c.get("duration_ms")]
        models = Counter(c.get("model", "unknown") for c in ok_calls)

        summary = {
            "total_calls": len(ok_calls),
            "total_errors": len(calls) - len(ok_calls),
            "avg_latency_ms": round(sum(durations) / len(durations), 1) if durations else 0,
            "p95_latency_ms": round(sorted(durations)[int(len(durations) * 0.95)] if durations else 0, 1),
            "by_model": models,
        }

        self._json_response({"calls": calls[:limit], "summary": summary})

    def _serve_budget(self) -> None:
        global _budget_cache
        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return
        version = self.server.store.version
        if _budget_cache is None or _budget_cache[0] != version:
            _budget_cache = (version, compute_token_budget(snap.tools, snap.root))
        budget = _budget_cache[1]
        self._json_response(budget, indent=2)

    def _serve_history(self) -> None:
        """Serve time-series history.

        Without ?range or ?since, returns in-memory ring buffer (fast, ~35 min).
        With ?range=1h|6h|24h|7d, queries SQLite for longer history.
        With ?since=<ts>[&until=<ts>][&tool=<name>], queries SQLite for custom range.
        """
        import json

        range_str = self._qs_get("range")
        since_str = self._qs_get("since")
        tool_filter = self._qs_get("tool")

        use_db = (range_str or since_str) and self._db
        if use_db:
            import time as _time

            if since_str:
                since = float(since_str)
            else:
                range_map = {"1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800}
                secs = range_map.get(range_str, 3600)
                since = _time.time() - secs
            until = self._qs_float_opt("until")
            data = self._db.query_metrics(since=since, until=until)
            tool_data = self._db.query_tool_metrics(tool=tool_filter, since=since, until=until)
            data["by_tool"] = tool_data
            body = json.dumps(data).encode("utf-8")
        else:
            body = self.server.store.history_json().encode("utf-8")

        self._json_response_raw(body)

    def _serve_samples(self) -> None:
        """Serve universal samples.

        Params: ?metric=X&prefix=X&since=<ts>&tag.tool=X&limit=N
        Or: ?list=1&prefix=X  to list distinct metric names.
        Or: ?series=X&since=<ts>  to get a single metric as time-series.
        """
        db = self._require_db()
        if not db:
            return

        qs = self._qs
        # Mode: list metrics
        if "list" in qs:
            prefix = self._qs_get("prefix", "")
            result = db.list_metrics(prefix=prefix)
        # Mode: single metric series
        elif "series" in qs:
            metric = qs["series"][0]
            since = self._qs_float("since", time.time() - 3600)
            result = db.query_samples_series(metric, since=since)
        # Mode: query samples
        else:
            metric = self._qs_get("metric")
            prefix = self._qs_get("prefix")
            since = self._qs_float("since", time.time() - 3600)
            limit = int(self._qs_get("limit", "1000"))
            # Extract tag filters from tag.X=Y params
            tag_filter = {k[4:]: v[0] for k, v in qs.items() if k.startswith("tag.")}
            try:
                rows = db.query_samples(
                    metric=metric,
                    metric_prefix=prefix,
                    since=since,
                    tag_filter=tag_filter or None,
                    limit=limit,
                )
            except ValueError as exc:
                self._json_response({"error": str(exc)}, status=400)
                return
            result = [{"ts": s.ts, "metric": s.metric, "value": s.value, "tags": s.tags} for s in rows]

        self._json_response(result)

    def _serve_project_costs(self) -> None:
        """Serve per-project cumulative token/cost data.

        Params: ?since=<unix_ts>&days=<N>
        Returns: [{project, sessions, input_tokens, output_tokens, total_tokens,
                   cost_usd, daily: [{date, input_tokens, output_tokens}]}]
        """
        days = int(self._qs_get("days", "7"))
        since = self._qs_float("since", time.time() - days * 86400)

        _empty = lambda: {"sessions": 0, "input_tokens": 0, "output_tokens": 0, "daily": {}}
        projects: dict[str, dict] = {}  # project -> aggregate

        # 1. Active sessions from correlator
        snap = self.server.store.latest_snapshot()
        if snap:
            for s in snap.get("sessions") or []:
                proj = s.get("project") or "(unknown)"
                p = projects.setdefault(proj, _empty())
                p["sessions"] += 1
                p["input_tokens"] += s.get("exact_input_tokens") or 0
                p["output_tokens"] += s.get("exact_output_tokens") or 0

        # 2. Historical session_end events from SQLite
        db = self._db
        if db:
            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                proj = detail.get("project") or "(unknown)"
                p = projects.setdefault(proj, _empty())
                p["sessions"] += 1
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                p["input_tokens"] += in_tok
                p["output_tokens"] += out_tok
                # Daily bucketing
                day = datetime.fromtimestamp(ev.ts, tz=timezone.utc).strftime("%Y-%m-%d")
                daily = p["daily"].setdefault(day, {"input_tokens": 0, "output_tokens": 0})
                daily["input_tokens"] += in_tok
                daily["output_tokens"] += out_tok

        # Build response
        result = []
        for proj, data in sorted(
            projects.items(), key=lambda x: x[1]["input_tokens"] + x[1]["output_tokens"], reverse=True
        ):
            total = data["input_tokens"] + data["output_tokens"]
            # Rough cost estimate: $3/Mtok input, $15/Mtok output (Opus-class)
            cost_usd = data["input_tokens"] / 1e6 * 3.0 + data["output_tokens"] / 1e6 * 15.0
            daily = [{"date": d, **v} for d, v in sorted(data["daily"].items())]
            result.append(
                {
                    "project": proj,
                    "sessions": data["sessions"],
                    "input_tokens": data["input_tokens"],
                    "output_tokens": data["output_tokens"],
                    "total_tokens": total,
                    "cost_usd": round(cost_usd, 2),
                    "daily": daily,
                }
            )

        self._json_response(result)

    def _serve_session_runs(self) -> None:
        """Serve historical session runs grouped by project+tool for trend analysis.

        Params: ?project=<path>&tool=<name>&days=<N>&limit=<N>
        Returns: [{session_id, ts, project, tool, duration_s, input_tokens,
                   output_tokens, total_tokens}] sorted by ts desc.
        Enables run-over-run comparison for scheduled/recurring sessions.
        """
        project = self._qs_get("project")
        tool = self._qs_get("tool")
        days = int(self._qs_get("days", "30"))
        limit = int(self._qs_get("limit", "50"))
        since = time.time() - days * 86400

        runs = []
        db = self._db
        if db:
            seen_session_ids: set[str] = set()
            rows = db.query_sessions(since=0, tool=tool or None, active=False, limit=5000)
            for row in rows:
                ended_at = float(row.get("ended_at", 0) or 0)
                if ended_at < since:
                    continue
                ev_project = row.get("project_path") or ""
                if project and ev_project != project:
                    continue
                started_at = float(row.get("started_at", 0) or 0)
                in_tok = int(row.get("input_tokens", 0) or 0)
                out_tok = int(row.get("output_tokens", 0) or 0)
                sid = row.get("session_id", "")
                runs.append(
                    {
                        "session_id": sid,
                        "ts": ended_at,
                        "project": ev_project,
                        "tool": row.get("tool", ""),
                        "duration_s": round(ended_at - started_at, 1) if started_at else 0,
                        "input_tokens": in_tok,
                        "output_tokens": out_tok,
                        "total_tokens": in_tok + out_tok,
                        "file_churn": int(row.get("files_modified", 0) or 0),
                    }
                )
                if sid:
                    seen_session_ids.add(sid)

            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                sid = detail.get("session_id", "")
                if sid in seen_session_ids:
                    continue
                ev_project = detail.get("project") or ""
                if project and ev_project != project:
                    continue
                if tool and ev.tool != tool:
                    continue
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                runs.append(
                    {
                        "session_id": sid,
                        "ts": ev.ts,
                        "project": ev_project,
                        "tool": ev.tool,
                        "duration_s": detail.get("duration_s") or 0,
                        "input_tokens": in_tok,
                        "output_tokens": out_tok,
                        "total_tokens": in_tok + out_tok,
                        "file_churn": 0,
                    }
                )
        # Sort by timestamp descending (most recent first), apply limit
        runs.sort(key=lambda r: r["ts"], reverse=True)
        runs = runs[:limit]

        # Enrich legacy event-only rows with file_churn from sessions table.
        if db and runs:
            sids = [r["session_id"] for r in runs if r["session_id"] and r["file_churn"] == 0]
            if sids:
                try:
                    conn = db._conn()
                    placeholders = ",".join("?" for _ in sids)
                    cur = conn.execute(
                        f"SELECT session_id, files_modified FROM sessions WHERE session_id IN ({placeholders})",
                        sids,
                    )
                    churn_by_sid = {row[0]: int(row[1] or 0) for row in cur.fetchall()}
                    for r in runs:
                        # Only fill rows that were missing churn (file_churn == 0).
                        # Overwriting every run with ``.get(sid, 0)`` would reset
                        # already-correct values to 0 for sessions not in the
                        # zero-churn re-query.
                        if r["file_churn"] == 0 and r["session_id"] in churn_by_sid:
                            r["file_churn"] = churn_by_sid[r["session_id"]]
                except Exception:
                    pass

        self._json_response(runs)

    # ── Analytics endpoint ─────────────────────────────────────────

    def _serve_analytics(self) -> None:
        """Serve pre-computed analytics from the background cache.

        Zero SQL on the request path — the background thread recomputes
        every 15 seconds.  Response time: <1ms.

        Params: ?since=<ts>&until=<ts>
        """
        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float("until", time.time())
        result = self.server.analytics_cache.get(since, until)
        self._json_response(result)

    def _serve_events(self) -> None:
        """Serve recent events from SQLite.

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>&limit=<n>
        """
        events_list = []
        db = self._db
        if db:
            since = self._qs_float("since", time.time() - 3600)
            until = self._qs_float_opt("until")
            tool = self._qs_get("tool")
            kind = self._qs_get("kind")
            session_id = self._qs_get("session_id")
            limit = int(self._qs_get("limit", "200"))
            rows = db.query_events(since=since, until=until, tool=tool, kind=kind, session_id=session_id, limit=limit)
            events_list = [dataclasses.asdict(r) for r in rows]

        self._json_response(events_list)

    def _serve_datapoint_catalog(self) -> None:
        """Serve the datapoint catalog.

        Params: ?tab=<tab>&key=<key>&source_type=<raw|deduced|aggregated>
        """
        tab = self._qs_get("tab")
        key = self._qs_get("key")
        source_type = self._qs_get("source_type")

        entries = []
        db = self._db
        if db:
            entries = db.query_datapoint_catalog(tab=tab, key=key, source_type=source_type)

        self._json_response(entries)

    def _serve_session_cost_by_model(self) -> None:
        """Serve a session's cost/token breakdown grouped by model.

        Params: ?session_id=X (required)
        Returns ``{session_id, models: [{model, requests, input_tokens,
        output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd}],
        totals: {...}}``. Surfaces the per-model attribution that the
        session-level ``cost_usd`` aggregate hides.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        models = db.query_session_cost_by_model(session_id)
        totals = {
            "requests": sum(int(m.get("requests", 0)) for m in models),
            "input_tokens": sum(int(m.get("input_tokens", 0)) for m in models),
            "output_tokens": sum(int(m.get("output_tokens", 0)) for m in models),
            "cache_read_tokens": sum(int(m.get("cache_read_tokens", 0)) for m in models),
            "cache_creation_tokens": sum(int(m.get("cache_creation_tokens", 0)) for m in models),
            "cost_usd": round(sum(float(m.get("cost_usd", 0.0)) for m in models), 6),
        }
        self._json_response({"session_id": session_id, "models": models, "totals": totals})

    def _serve_session_processes(self) -> None:
        """Serve the persisted process genealogy for a session.

        Params: ?session_id=X (required)
        Returns ``{session_id, processes: [{pid, tool, role, joined_at}]}``.
        Unlike ``/api/session-subprocesses`` (live-snapshot counts only),
        this reads the persisted ``session_processes`` table so the process
        tree survives after a session ends.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        processes = db.get_session_processes(session_id)
        roles = Counter(str(p.get("role", "") or "unknown") for p in processes)
        self._json_response(
            {
                "session_id": session_id,
                "total": len(processes),
                "by_role": dict(roles),
                "processes": processes,
            }
        )

    def _serve_session_tool_calls(self) -> None:
        """Serve the per-session tool-invocation timeline.

        Params: ?session_id=X (required) &limit=N
        Returns ``{session_id, total, errors, by_tool: {name: count},
        calls: [{ts, tool_name, duration_ms, is_error, result_summary}]}``.
        Surfaces the ``tool_invocations`` table which was previously
        captured but never exposed per session.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        limit = min(int(self._qs_get("limit", "500")), 2000)
        rows = db.query_tool_invocations(session_id=session_id, limit=limit)
        calls = [
            {
                "ts": float(r.get("ts", 0.0) or 0.0),
                "tool_name": r.get("tool_name", "") or r.get("tool", ""),
                "duration_ms": float(r.get("duration_ms", 0.0) or 0.0),
                "is_error": bool(r.get("is_error", 0)),
                "result_summary": r.get("result_summary", ""),
            }
            for r in rows
        ]
        by_tool = Counter(c["tool_name"] or "unknown" for c in calls)
        errors = sum(1 for c in calls if c["is_error"])
        self._json_response(
            {
                "session_id": session_id,
                "total": len(calls),
                "errors": errors,
                "by_tool": dict(by_tool),
                "calls": calls,
            }
        )

    def _serve_session_kill(self) -> None:
        """Signal a live session's tracked process tree (control action).

        POST body: ``{session_id: str (required), confirm: true (required),
        signal: "TERM"|"KILL" (default TERM)}``. Sends the signal to every PID
        the correlator has linked to the session plus their children, refusing
        to touch aictl's own process. The action is audited via an ``EventRow``
        so it surfaces in the session's action timeline.

        ``confirm:true`` is mandatory so an accidental/replayed request can't
        tear down a session — the destructive intent must be explicit.
        """
        from ..storage import EventRow

        content_length = self._content_length()
        if content_length is None:
            return
        if content_length > 100_000:
            self.send_error(413, "Payload too large")
            return
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body or b"{}")
        except (json.JSONDecodeError, OSError):
            self._json_response({"error": "Invalid JSON"}, status=400)
            return
        if not isinstance(data, dict):
            self._json_response({"error": "Request body must be a JSON object"}, status=400)
            return

        session_id = str(data.get("session_id", "") or "")
        if not session_id:
            self._json_response({"error": "Missing session_id"}, status=400)
            return
        if not data.get("confirm"):
            self._json_response({"error": "Kill requires confirm:true"}, status=400)
            return
        sig_name = str(data.get("signal", "TERM") or "TERM").upper()
        if sig_name.startswith("SIG"):
            sig_name = sig_name[3:]
        if sig_name not in ("TERM", "KILL"):
            self._json_response({"error": "signal must be TERM or KILL"}, status=400)
            return

        snap = self.server.store.snapshot
        if snap is None:
            self._json_response({"error": "No live session data"}, status=503)
            return
        session = next((s for s in snap.sessions if s.get("session_id") == session_id), None)
        if session is None:
            self._json_response({"error": "Session not active"}, status=404)
            return
        pids = [int(p) for p in (session.get("pids") or []) if int(p) > 0]
        if not pids:
            self._json_response({"error": "Session has no tracked PIDs"}, status=409)
            return

        result = _kill_session_pids(pids, sig_name)
        db = self._db
        if db:
            try:
                db.append_event(
                    EventRow(
                        ts=time.time(),
                        tool=str(session.get("tool", "")),
                        kind="action:session_kill",
                        detail={
                            "session_id": session_id,
                            "signal": "SIG" + sig_name,
                            "signaled": result["signaled"],
                            "failed": result["failed"],
                        },
                        session_id=session_id,
                    )
                )
            except Exception:
                # Audit logging must never block the control action itself.
                pass
        self._json_response({"session_id": session_id, "signal": "SIG" + sig_name, **result})

    def _serve_sessions(self) -> None:
        """Serve active and historical sessions.

        Params: ?tool=X&active=true&since=<ts>&limit=N

        Queries both the live snapshot (for active sessions) and the sessions
        table (for historical/ended sessions).
        """
        tool = self._qs_get("tool")
        active_only = (self._qs_get("active", "")).lower() == "true"
        limit = int(self._qs_get("limit", "100"))

        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return

        # Active sessions from live snapshot
        sessions = list(snap.sessions)
        for s in sessions:
            s.setdefault("active", True)
            s.setdefault("lifecycle_status", "active")

        # Filter by tool
        if tool:
            sessions = [s for s in sessions if s.get("tool") == tool]

        # If not active_only, also include historical sessions
        if not active_only:
            db = self._db
            if db:
                since = self._qs_float("since", time.time() - 86400)
                active_ids = {s.get("session_id") for s in sessions}

                # Query sessions table (v20)
                db_sessions = db.query_sessions(
                    since=since,
                    tool=tool or None,
                    active=None,
                    limit=limit,
                )
                for s in db_sessions:
                    sid = s.get("session_id", "")
                    if sid and sid not in active_ids:
                        entity = self.server.entity_tracker.get_session_state(sid)
                        lifecycle_status, active = _db_session_lifecycle_status(s, entity)
                        sessions.append(
                            {
                                "session_id": sid,
                                "tool": s.get("tool", ""),
                                "pid": s.get("pid", 0),
                                "started_at": s.get("started_at"),
                                "ended_at": s.get("ended_at"),
                                "duration_s": (
                                    round(s["ended_at"] - s["started_at"], 1)
                                    if s.get("ended_at") and s.get("started_at")
                                    else None
                                ),
                                "active": active,
                                "lifecycle_status": lifecycle_status,
                                "source": s.get("source", ""),
                                "model": s.get("model", ""),
                                "input_tokens": s.get("input_tokens", 0),
                                "output_tokens": s.get("output_tokens", 0),
                                "cache_read_tokens": s.get("cache_read_tokens", 0),
                                "cache_creation_tokens": s.get("cache_creation_tokens", 0),
                                "cost_usd": s.get("cost_usd", 0),
                                "project": s.get("project_path", ""),
                                "git_branch": s.get("git_branch", ""),
                                "git_commit": s.get("git_commit", ""),
                                "commit_count": db.count_session_commits(sid),
                            }
                        )
                        active_ids.add(sid)

                # Also fall back to event-based reconstruction for sessions
                # not yet in the sessions table
                ended = db.query_events(since=since, kind="session_end", limit=limit)
                for ev in ended:
                    d = ev.detail if isinstance(ev.detail, dict) else {}
                    sid = d.get("session_id", "")
                    if sid and sid not in active_ids:
                        sessions.append(
                            {
                                "session_id": sid,
                                "tool": ev.tool,
                                "ended_at": ev.ts,
                                "duration_s": d.get("duration_s", 0),
                                "active": False,
                                "lifecycle_status": "ended",
                            }
                        )
                        active_ids.add(sid)

        # Mark active sessions
        for s in sessions:
            if "active" not in s:
                s["active"] = True
            if "lifecycle_status" not in s:
                s["lifecycle_status"] = "active" if s["active"] else "open"
            if "commit_count" not in s:
                sid = s.get("session_id", "")
                s["commit_count"] = self._db.count_session_commits(sid) if (self._db and sid) else 0
            s["cache_hit_ratio"] = _cache_hit_ratio(s)

        self._json_response(sessions[:limit])

    def _serve_session_stats(self) -> None:
        """Serve deduced session metrics from entity state + JSONL enrichment.

        Params: ?session_id=X (optional — omit for all sessions)
        Returns per-session deduced stats: tool calls, skill calls, prompt
        count, tool call rate, agent stats with token/tool breakdown.
        """
        session_id = self._qs_get("session_id")
        tracker = self.server.entity_tracker
        snap = self.server.store.snapshot

        # Enrich agent states with JSONL data when available
        if snap and snap.agent_teams:
            tracker.enrich_from_agent_teams(snap.agent_teams)

        if session_id:
            sess = tracker.get_session_state(session_id)
            if not sess:
                self._json_response({"error": "session not found"})
                return
            out = sess.to_dict()
            # Enrich with VS Code Language-Model usage (Slice 3.4c): a
            # per-extension token breakdown derived from OTel events. Empty
            # when no LM-usage events exist for the session.
            db = self._db
            if db:
                try:
                    from ..analysis.lm_usage import session_lm_usage

                    lm = session_lm_usage(db, session_id)
                    if lm.get("total_calls", 0) or lm.get("by_extension"):
                        out["vscode_lm_usage"] = lm
                except Exception:
                    pass
            self._json_response(out)
        else:
            # All sessions with deduced metrics
            result = tracker.all_sessions()
            # Add global aggregates
            totals = {
                "total_tool_calls": sum(s.get("tool_calls", 0) for s in result),
                "total_skill_calls": sum(s.get("skill_calls", 0) for s in result),
                "total_prompts": sum(s.get("prompt_count", 0) for s in result),
                "sessions": result,
            }
            self._json_response(totals)

    def _serve_session_subprocesses(self) -> None:
        """Serve the per-session subprocess breakdown.

        Params: ?session_id=X (required)
        Returns {session_id, total, counts: [{name, count}], recent:
        [{ts, name}]}. Subprocess data lives in the live snapshot only
        (not persisted); an unknown session yields empty arrays rather
        than a 404 so the UI can render an empty-state.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return

        snap = self.server.store.snapshot
        sess = None
        if snap is not None:
            for s in snap.sessions:
                if s.get("session_id") == session_id:
                    sess = s
                    break

        counts_map = (sess or {}).get("subprocess_count") or {}
        recent = (sess or {}).get("recent_subprocesses") or []
        counts = [
            {"name": name, "count": n} for name, n in sorted(counts_map.items(), key=lambda kv: kv[1], reverse=True)
        ]
        self._json_response(
            {
                "session_id": session_id,
                "total": sum(counts_map.values()),
                "counts": counts,
                "recent": list(recent),
            }
        )

    def _serve_session_commits(self) -> None:
        """Serve the git commits attributed to a session's time window.

        Params: ?session_id=X (required)
        Returns ``{session_id, commits: [{sha, short_sha, author_name,
        author_email, ts, subject, current_branch_match}], branch}``.

        On first request for an ended session with no cached rows we
        compute the attribution lazily and persist it.
        """
        from ..analysis.git_attribution import attribute_session, is_reachable

        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        db = self._require_db()
        if not db:
            return

        sess = db.get_session(session_id) or {}
        project_dir = sess.get("project_path", "") or ""
        branch = sess.get("git_branch", "") or ""
        ended_at = sess.get("ended_at")
        started_at = float(sess.get("started_at", 0.0) or 0.0)

        commits = db.get_session_commits(session_id)
        if not commits and ended_at and started_at > 0 and project_dir:
            # Lazy attribution: compute and cache on first request.
            commits = attribute_session(db, session_id, project_dir, started_at, float(ended_at))

        out = []
        for c in commits:
            sha = str(c.get("sha", ""))
            out.append(
                {
                    "sha": sha,
                    "short_sha": sha[:7],
                    "author_name": c.get("author_name", ""),
                    "author_email": c.get("author_email", ""),
                    "ts": float(c.get("ts", 0.0) or 0.0),
                    "subject": c.get("subject", ""),
                    "current_branch_match": bool(branch and project_dir and is_reachable(project_dir, sha, branch)),
                }
            )
        self._json_response(
            {
                "session_id": session_id,
                "branch": branch,
                "commits": out,
            }
        )

    def _serve_session_timeline(self) -> None:
        """Serve enriched session profiles for the timeline bar.

        Params: ?since=<unix_ts>&until=<unix_ts>
        Returns list of session profiles with conversations, agents, file stats.
        """
        db = self._require_db()
        if not db:
            return

        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float_opt("until")

        profiles = db.query_session_profiles(since=since, until=until)

        # Filter to meaningful sessions (have file activity or >60s duration)
        profiles = [p for p in profiles if p["files_modified"] > 0 or (p.get("duration_s") and p["duration_s"] > 60)]

        # Merge live session data for active sessions.  Matching falls
        # back to UUID/PID/time-window heuristics because live snapshot
        # ids and persisted row ids use different formats — the DB row is
        # marked as the live one rather than surfacing a stale duplicate.
        snap = self.server.store.snapshot
        if snap:
            live_sessions = list(snap.sessions)
            for p in profiles:
                live = _match_live_session(p, live_sessions)
                if live:
                    p["active"] = True
                    p["live_session_id"] = live.get("session_id", "")
                    p["project"] = p.get("project") or live.get("project", "")
                    p["cpu_percent"] = live.get("cpu_percent", 0)
                    # Same tokens observed from different vantage points —
                    # keep the larger count, never sum.
                    p["input_tokens"] = max(int(p.get("input_tokens", 0) or 0), live.get("exact_input_tokens", 0))
                    p["output_tokens"] = max(int(p.get("output_tokens", 0) or 0), live.get("exact_output_tokens", 0))

        self._json_response(profiles)

    def _serve_files(self) -> None:
        """Serve tracked files from the file store.

        Params: ?tool=X&category=Y&changed_since=<ts>
        """
        db = self._require_db()
        if not db:
            return

        tool = self._qs_get("tool")
        category = self._qs_get("category")
        changed_since_str = self._qs_get("changed_since")
        changed_since = float(changed_since_str) if changed_since_str else None

        files = db.list_files(tool=tool, category=category, changed_since=changed_since)
        self._json_response([{k: v for k, v in dataclasses.asdict(f).items() if k != "content"} for f in files])

    def _serve_file_history(self) -> None:
        """Serve file change history.

        Params: ?path=X&limit=N
        Or: ?path=X&ts=<unix_ts> to get content at a point in time.
        """
        file_path = self._qs_get("path")

        if not file_path:
            self.send_error(400, "Missing path parameter")
            return

        db = self._require_db()
        if not db:
            return

        # Content at timestamp mode
        ts_str = self._qs_get("ts")
        if ts_str:
            ts = float(ts_str)
            content = db.file_content_at(file_path, ts)
            if content is None:
                self.send_error(404, "No content at that timestamp")
                return
            body = content.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self._send_cors_header()
            self.end_headers()
            self.wfile.write(body)
            return

        # History timeline mode
        limit = int(self._qs_get("limit", "50"))
        history = db.file_history(file_path, limit=limit)
        self._json_response(history)

    def _serve_telemetry(self) -> None:
        """Serve historical telemetry data.

        Params: ?tool=X&since=<ts>&until=<ts>
        """
        db = self._require_db()
        if not db:
            return

        tool = self._qs_get("tool")
        since = self._qs_float("since", time.time() - 86400)
        until = self._qs_float("until", time.time())

        rows = db.query_telemetry(tool=tool, since=since, until=until)
        self._json_response([dataclasses.asdict(r) for r in rows])
