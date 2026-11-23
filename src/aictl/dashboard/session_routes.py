# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""HTTP handlers for session details, evidence, and local process actions."""

from __future__ import annotations

import json
import logging
import math
import os
import re
import time
from collections import Counter

from ..data.token_usage import TokenUsage
from ..stores import reader_feature, store_for
from ..stores.base import StoreConfigurationError, StoreError
from .otel_receiver import API_ERROR_EVENTS, API_REQUEST_EVENTS, _num
from .projections.history import (
    HistoryScope,
    configured_reader,
    event_params,
    event_rows,
    local_scope,
    scoped_records,
    session_events,
    session_processes,
    session_row,
)

# Synthesized process-based session_id format: "tool:pid:timestamp".
# Used by copilot-vscode (and other tools that don't emit their own ids)
# to synthesize a session id from the process. Such ids never appear in
# OTel events — OTel emitters tag events with the tool's own chat/session
# id — so strict session_id matching misses everything. When we see one
# of these, we fall back to matching on tool + the session's time window.
_SYNTHETIC_SESSION_RE = re.compile(r"^[a-z][a-z0-9-]*:\d+:\d+$")


def _kill_session_pids(pids: list[int], sig_name: str) -> dict[str, list[int]]:
    """Send SIGTERM/SIGKILL to the given PIDs and their child trees.

    Skips aictl's own process (defensive — a tracked PID should never be the
    server itself, but a kill on ourselves would take down the very dashboard
    issuing the command). Returns ``{signaled, failed}`` lists of PIDs.
    """
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
        except Exception:  # noqa: BLE001, S110
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


class SessionRoutes:
    def _serve_copilot_sessions(self, path: str) -> None:
        from .copilot_sessions_api import handle

        status, payload = handle(path, self._qs)
        self._json_response(payload, status=status)

    def _serve_session_evidence(self) -> None:
        from .session_evidence import EvidenceInputError, session_evidence

        history = HistoryScope.local(self.server.store)
        try:
            body = json.dumps(session_evidence(self._db, self._qs, history=history)).encode("utf-8")
            self._send_body(body, "application/json", cache_control="no-store", cors=False)
        except EvidenceInputError as exc:
            self._json_response({"error": str(exc)}, status=400)
        except StoreConfigurationError as exc:
            self._json_response({"error": str(exc)}, status=503)
        except StoreError:
            logging.getLogger(__name__).exception("Could not read session execution evidence")
            self._json_response({"error": "Session evidence query failed"}, status=503)

    def _serve_board_agent_flow(self) -> None:
        """The session flow of a board agent, from the store with hook and OTel events merged in.

        GET /api/board/agent/flow?id=<agent id>&since=<unix ts>&until=<unix ts>&limit=<events>&offset=<n>
        A subagent id gives that subagent's own steps; ``whole=1`` gives the whole session of its
        main agent. ``limit`` is how many events to
        return: the newest, or those from position ``offset`` (0 is the oldest matching event).
        The summary counts them all.
        """
        from .flow_projection import agent_flow

        agent_id = self._qs_get("id")
        if not agent_id:
            self._json_response({"error": "Missing id"}, status=400)
            return
        history = HistoryScope.local(self.server.store)
        try:
            since, until = self._qs_float_opt("since"), self._qs_float_opt("until")
            limit = int(self._qs_get("limit")) if self._qs_get("limit") else None
            offset = int(self._qs_get("offset")) if self._qs_get("offset") else None
            if offset is not None and offset < 0:
                raise ValueError("offset must not be negative")
            if any(not math.isfinite(x) or x < 0 for x in (since, until) if x is not None):
                raise ValueError("Time bounds must be finite Unix timestamps")
            if since is not None and until is not None and since >= until:
                raise ValueError("The end must be after the start")
            failed = self._qs_get("failed", "0")
            if failed not in ("0", "1"):
                raise ValueError("failed must be 0 or 1")
            whole = self._qs_get("whole", "0")
            if whole not in ("0", "1"):
                raise ValueError("whole must be 0 or 1")
            status, payload = agent_flow(
                self._db, agent_id, since, until, limit=limit, offset=offset, failed=failed == "1",
                history=history, whole=whole == "1",
                **{k: self._qs_get(k, "") for k in ("q", "category", "tool_name", "flow_agent", "skill_name", "skill_phase")},
            )
        except ValueError as exc:
            self._json_response({"error": str(exc)}, status=400)
            return
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return
        except Exception as exc:  # any failure must reach the tab's error state
            logging.getLogger(__name__).exception("Board agent flow failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response(payload, status=status)

    def _serve_board_agent_transcript(self) -> None:
        """The recorded transcript of a board agent's session.

        GET /api/board/agent/transcript?id=<agent id>[&turn=<unix ts>][&full=1]
        Without ``turn`` the turns are brief: previews, counts and tokens. ``turn`` returns one
        turn whole, with its actions and texts; ``full=1`` returns every turn whole.
        """
        from .flow_projection import agent_transcript

        agent_id = self._qs_get("id")
        if not agent_id:
            self._json_response({"error": "Missing id"}, status=400)
            return
        history = HistoryScope.local(self.server.store)

        try:
            turn = self._qs_float_opt("turn")
        except ValueError:
            self._json_response({"error": "turn must be a number"}, status=400)
            return
        full = self._qs_get("full") in ("1", "true", "yes")
        try:
            status, payload = agent_transcript(self._db, agent_id, turn=turn, brief=not full,
                                               history=history)
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return
        except Exception as exc:  # any failure must reach the tab's error state
            logging.getLogger(__name__).exception("Board agent transcript failed")
            self._json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return
        self._json_response(payload, status=status)

    def _serve_otel_status(self) -> None:
        """Return OTel receiver health status."""
        status = self.server.otel_receiver.status()
        sink = store_for(self.server.store).otlp
        if sink is not None:
            # What reached the cluster's OTel tables, what waits and what was dropped.
            status["kusto"] = sink.stats()
        self._json_response(status)

    def _serve_query_timings(self) -> None:
        """What each store view cost since the daemon started, the most expensive first.

        GET /api/query-timings. Counts only queries that reached the cluster.
        """
        timings = reader_feature(configured_reader(self.server.store), "view_timings")
        self._json_response({"views": timings or []})

    def _serve_session_mcp_usage(self) -> None:
        """Return per-session MCP server usage.

        GET /api/session-mcp-usage?session_id=X

        Joins ``.vscode/mcp.json`` (and friends) discovered under the
        session's project root with OTel events that touched an MCP
        server during the session. Returns:

        ``{session_id, servers: [{server_name, call_count, first_ts,
        last_ts, total_duration_ms, err_count}], total_calls,
        configured_servers: [name, ...]}``.

        ``servers`` are the servers the session used, from its events and its stored tool calls.
        Configured-but-unused servers appear in ``configured_servers``
        only (not in ``servers``).
        """
        from ..analysis.mcp_usage import configured_servers

        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        reader = configured_reader(self.server.store)
        try:
            # The servers the session used: the OTel events that name one, and the stored tool calls of a
            # server's tools (a tool without OTel events still called its servers).
            servers = scoped_records(HistoryScope.local(self.server.store), session_id, "mcp")["servers"]
            sess = session_row(reader, session_id, local_scope()) or {}
        except StoreError as exc:
            self.send_error(503, str(exc))
            return
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
        reader = configured_reader(self.server.store)

        since = self._qs_float("since", time.time() - 3600)
        until = self._qs_float("until", time.time())
        limit = max(1, min(int(self._qs_get("limit", "500")), 2000))
        session_id = self._qs_get("session_id") or None
        scope = local_scope()

        # Resolve filter strategy. For synthesized process-based session
        # ids (e.g. ``copilot-vscode:3716:1776541738``), OTel events carry
        # the tool's own chat/session id and will never match — fall back
        # to tool-scoped querying over the session's active time window.
        filter_session_id: str | None = session_id
        filter_tool: str | None = None
        if session_id and _SYNTHETIC_SESSION_RE.match(session_id):
            try:
                sess = session_row(reader, session_id, scope)
            except StoreError as exc:
                self._json_response({"error": str(exc)}, status=503)
                return
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

        def category(names):
            return [
                ev
                for name in names
                for ev in event_rows(reader.read("events.page", {
                    **scope, **event_params(since=since, until=until, kinds=[f"otel:{name}"],
                                             tool=filter_tool, session_id=filter_session_id),
                    "limit": limit,
                }))
            ]

        try:
            api_events = category(API_REQUEST_EVENTS)
            error_events = category(API_ERROR_EVENTS)
        except StoreConfigurationError as exc:
            self._json_response({"calls": [], "summary": {}, "error": str(exc)}, status=503)
            return
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return

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
            d = ev["detail"]
            usage = TokenUsage.from_dict(d)
            calls.append(
                {
                    "ts": ev["ts"],
                    "tool": ev["tool"] or d.get("tool", ""),
                    "session_id": ev["session_id"] or d.get("session_id", ""),
                    "pid": ev["pid"] or int(d.get("pid", 0) or 0),
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
            d = ev["detail"]
            calls.append(
                {
                    "ts": ev["ts"],
                    "tool": ev["tool"] or d.get("tool", ""),
                    "session_id": ev["session_id"] or d.get("session_id", ""),
                    "pid": ev["pid"] or int(d.get("pid", 0) or 0),
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
        if session_id and filter_session_id and not calls:
            # The tool sent no OTel events for this session; the requests its files recorded are the same calls.
            try:
                stored = scoped_records(HistoryScope.local(self.server.store), session_id, "calls")
            except StoreError as exc:
                self._json_response({"error": str(exc)}, status=503)
                return
            if stored["calls"] or stored["summary"]["total_calls"]:
                self._json_response({**stored, "calls": stored["calls"][:limit],
                                     "summary": {**stored["summary"], "source": "stored requests"}})
                return
        durations = [c["duration_ms"] for c in ok_calls if c.get("duration_ms")]
        models = Counter(c.get("model", "unknown") for c in ok_calls)

        # No recorded duration is no latency, not 0 ms.
        summary = {
            "total_calls": len(ok_calls),
            "total_errors": len(calls) - len(ok_calls),
            "avg_latency_ms": round(sum(durations) / len(durations), 1) if durations else None,
            "p95_latency_ms": round(sorted(durations)[int(len(durations) * 0.95)], 1) if durations else None,
            "by_model": models,
            "source": "OTel events" if calls else None,
        }

        self._json_response({"calls": calls[:limit], "summary": summary})

    def _serve_session_processes(self) -> None:
        """Serve the persisted process genealogy for a session.

        Params: ?session_id=X (required)
        Returns ``{session_id, processes: [{pid, tool, role, joined_at}]}``.
        It reads the persisted ``session_processes`` table so the process
        tree survives after a session ends.
        """
        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        reader = configured_reader(self.server.store)

        try:
            result = reader.read("sessions.processes", {**local_scope(), "requested_session": session_id, "limit": 2000})
            self._json_response(session_processes(session_id, result))
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)

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

        if self._reject_scoped_action(data):
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
        if session is not None:
            pids = [int(p) for p in (session.get("pids") or []) if int(p) > 0]
        else:
            # The dashboard names an agent by its stored id, not by the monitor's.
            from .session_details import live_pids_of

            try:
                pids = live_pids_of(self.server.store, snap, session_id)
            except StoreError as exc:
                self._json_response({"error": str(exc)}, status=503)
                return
            session = {"tool": ""}
            if not pids:
                self._json_response({"error": "This agent has no running process"}, status=404)
                return
        if not pids:
            self._json_response({"error": "Session has no tracked PIDs"}, status=409)
            return

        result = _kill_session_pids(pids, sig_name)
        from ..records import EventRow

        try:
            self.server.store.session_facts.events([
                EventRow(ts=time.time(), tool=str(session.get("tool", "")), kind="action:session_kill",
                         detail={"session_id": session_id, "signal": "SIG" + sig_name,
                                 "signaled": result["signaled"], "failed": result["failed"]},
                         session_id=session_id),
            ], source="dashboard")
        except Exception:  # noqa: BLE001 — audit logging must not block the control action
            logging.getLogger(__name__).exception("Could not record session kill")
        # A stop that reached no process is a failure, whatever the reason.
        status = 200 if result["signaled"] else 409
        payload = {"session_id": session_id, "signal": "SIG" + sig_name, **result}
        if not result["signaled"]:
            payload["error"] = f"No process could be stopped. Tried {len(result['failed'])}."
        self._json_response(payload, status=status)

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
            reader = configured_reader(self.server.store)
            try:
                from ..analysis.lm_usage import lm_usage

                lm = lm_usage(session_events(reader, session_id, local_scope(), view="events.lm_usage"))
                if lm.get("total_calls", 0) or lm.get("by_extension"):
                    out["vscode_lm_usage"] = lm
            except StoreError:
                out["vscode_lm_usage"] = None
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

    def _serve_session_commits(self) -> None:
        """Serve the git commits attributed to a session's time window.

        Params: ?session_id=X (required)
        Returns ``{session_id, commits: [{sha, short_sha, author_name,
        author_email, ts, subject, current_branch_match}], branch}``.

        On first request for an ended session with no cached rows we
        compute and cache the attribution from the local repository.
        """
        from ..analysis.git_attribution import commits_in_window, is_reachable

        session_id = self._qs_get("session_id")
        if not session_id:
            self.send_error(400, "Missing session_id")
            return
        history = HistoryScope.local(self.server.store)
        try:
            sess = session_row(history.require_reader(), session_id, local_scope()) or {}
            commits = history.read("sessions.commits", sid=session_id)
        except StoreError as exc:
            self.send_error(503, str(exc))
            return

        project_dir = sess.get("project_path", "") or ""
        branch = sess.get("git_branch", "") or ""
        ended_at = sess.get("ended_at")
        started_at = float(sess.get("started_at", 0.0) or 0.0)

        if not commits and ended_at and started_at > 0 and project_dir:
            commits = commits_in_window(project_dir, started_at, float(ended_at))
            self.server.store.session_evidence.publish_commits(session_id, project_dir, commits)

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
