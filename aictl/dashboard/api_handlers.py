# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""REST API endpoint handler methods for the dashboard.

Provides _APIHandlersMixin which is mixed into _DashboardHandler to
supply all /api/* endpoint implementations.
"""

from __future__ import annotations

from collections import Counter
import dataclasses
from datetime import datetime, timezone
import time

from ..tools import compute_token_budget
from .otel_receiver import _num
from .session_flow import build_session_flow
from .models import _slim_agent_teams


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
        sink = getattr(self.server.store, '_sink', None)
        if sink:
            try:
                result["sink"] = sink.stats()
            except Exception:
                result["sink"] = {}
        self._json_response(result)

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
        self._json_response({
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
        })

    def _serve_otel_status(self) -> None:
        """Return OTel receiver health status."""
        status = self.server.otel_receiver.status()
        self._json_response(status)

    def _serve_api_calls(self) -> None:
        """Return API call data from OTel events.

        Queries events with kind 'otel:claude_code.api_request' and
        'otel:claude_code.api_error' for latency/frequency analysis.
        """
        db = self._db
        if not db:
            self._json_response({"calls": [], "summary": {}})
            return

        since = self._qs_float("since", time.time() - 3600)
        until = self._qs_float("until", time.time())
        limit = min(int(self._qs_get("limit", "500")), 2000)

        # Query API request events
        api_events = db.query_events(
            since=since, until=until,
            kind="otel:claude_code.api_request",
            limit=limit,
        )
        error_events = db.query_events(
            since=since, until=until,
            kind="otel:claude_code.api_error",
            limit=limit,
        )

        calls = []
        for ev in api_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            calls.append({
                "ts": ev.ts,
                "model": d.get("model", ""),
                "duration_ms": _num(d.get("duration_ms", d.get("duration", 0))),
                "input_tokens": _num(d.get("input_tokens", 0)),
                "output_tokens": _num(d.get("output_tokens", 0)),
                "cache_read_tokens": _num(d.get("cache_read_tokens", 0)),
                "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                "status": "ok",
            })
        for ev in error_events:
            d = ev.detail if isinstance(ev.detail, dict) else {}
            calls.append({
                "ts": ev.ts,
                "model": d.get("model", ""),
                "error": d.get("error", d.get("message", "unknown")),
                "error_type": d.get("error_type", d.get("type", "")),
                "prompt_id": d.get("prompt.id", d.get("prompt_id", "")),
                "status": "error",
            })
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
            tool_data = self._db.query_tool_metrics(
                tool=tool_filter, since=since, until=until)
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
            rows = db.query_samples(
                metric=metric, metric_prefix=prefix,
                since=since, tag_filter=tag_filter or None, limit=limit,
            )
            result = [{"ts": s.ts, "metric": s.metric, "value": s.value, "tags": s.tags}
                      for s in rows]

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
        for proj, data in sorted(projects.items(), key=lambda x: x[1]["input_tokens"] + x[1]["output_tokens"], reverse=True):
            total = data["input_tokens"] + data["output_tokens"]
            # Rough cost estimate: $3/Mtok input, $15/Mtok output (Opus-class)
            cost_usd = data["input_tokens"] / 1e6 * 3.0 + data["output_tokens"] / 1e6 * 15.0
            daily = [{"date": d, **v} for d, v in sorted(data["daily"].items())]
            result.append({
                "project": proj,
                "sessions": data["sessions"],
                "input_tokens": data["input_tokens"],
                "output_tokens": data["output_tokens"],
                "total_tokens": total,
                "cost_usd": round(cost_usd, 2),
                "daily": daily,
            })

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
            rows = db.query_events(since=since, kind="session_end", limit=5000)
            for ev in rows:
                detail = ev.detail or {}
                ev_project = detail.get("project") or ""
                if project and ev_project != project:
                    continue
                if tool and ev.tool != tool:
                    continue
                in_tok = detail.get("input_tokens") or 0
                out_tok = detail.get("output_tokens") or 0
                runs.append({
                    "session_id": detail.get("session_id", ""),
                    "ts": ev.ts,
                    "project": ev_project,
                    "tool": ev.tool,
                    "duration_s": detail.get("duration_s") or 0,
                    "input_tokens": in_tok,
                    "output_tokens": out_tok,
                    "total_tokens": in_tok + out_tok,
                })
        # Sort by timestamp descending (most recent first), apply limit
        runs.sort(key=lambda r: r["ts"], reverse=True)
        runs = runs[:limit]

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
            rows = db.query_events(since=since, until=until, tool=tool,
                                   kind=kind, session_id=session_id,
                                   limit=limit)
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
            entries = db.query_datapoint_catalog(
                tab=tab, key=key, source_type=source_type
            )

        self._json_response(entries)

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
                    since=since, tool=tool or None,
                    active=None, limit=limit,
                )
                for s in db_sessions:
                    sid = s.get("session_id", "")
                    if sid and sid not in active_ids:
                        sessions.append({
                            "session_id": sid,
                            "tool": s.get("tool", ""),
                            "pid": s.get("pid", 0),
                            "started_at": s.get("started_at"),
                            "ended_at": s.get("ended_at"),
                            "duration_s": (round(s["ended_at"] - s["started_at"], 1)
                                          if s.get("ended_at") and s.get("started_at")
                                          else None),
                            "active": s.get("ended_at") is None,
                            "model": s.get("model", ""),
                            "input_tokens": s.get("input_tokens", 0),
                            "output_tokens": s.get("output_tokens", 0),
                            "cost_usd": s.get("cost_usd", 0),
                        })
                        active_ids.add(sid)

                # Also fall back to event-based reconstruction for sessions
                # not yet in the sessions table
                ended = db.query_events(since=since, kind="session_end", limit=limit)
                for ev in ended:
                    d = ev.detail if isinstance(ev.detail, dict) else {}
                    sid = d.get("session_id", "")
                    if sid and sid not in active_ids:
                        sessions.append({
                            "session_id": sid,
                            "tool": ev.tool,
                            "ended_at": ev.ts,
                            "duration_s": d.get("duration_s", 0),
                            "active": False,
                        })
                        active_ids.add(sid)

        # Mark active sessions
        for s in sessions:
            if "active" not in s:
                s["active"] = True

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
            self._json_response(sess.to_dict())
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
        profiles = [
            p for p in profiles
            if p["files_modified"] > 0
            or (p.get("duration_s") and p["duration_s"] > 60)
        ]

        # Merge live session data for active sessions
        snap = self.server.store.snapshot
        if snap:
            active_map = {s.get("session_id"): s for s in snap.sessions}
            for p in profiles:
                live = active_map.get(p["session_id"])
                if live:
                    p["active"] = True
                    p["project"] = p.get("project") or live.get("project", "")
                    p["cpu_percent"] = live.get("cpu_percent", 0)
                    p["input_tokens"] = live.get("exact_input_tokens", 0)
                    p["output_tokens"] = live.get("exact_output_tokens", 0)

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
        self._json_response([{k: v for k, v in dataclasses.asdict(f).items() if k != "content"}
                              for f in files])

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
            self.send_header("Access-Control-Allow-Origin", "*")
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
