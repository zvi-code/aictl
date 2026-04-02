# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Session flow reconstruction — event correlation and timeline assembly.

Builds conversation-turn-level data from hook events and OTel API request
events, producing an ordered list of turns for the session flow waterfall.
"""

from __future__ import annotations

import time

from ..storage import EventRow
from .otel_receiver import _num


def build_session_flow(db, session_id: str, since: float, until: float) -> dict:
    """Query events and build the complete session flow for a session.

    Returns ``{"turns": [...], "summary": {...}}`` ready for JSON response.
    """
    # Parse structured fields from session_id
    tool = None
    session_pid = 0
    if ":" in session_id:
        parts = session_id.split(":")
        tool = parts[0]
        if len(parts) >= 3:
            try:
                session_pid = int(parts[1])
            except ValueError:
                pass

    # Step 1: Direct events for this session_id
    all_events = db.query_events(
        since=since, until=until,
        session_id=session_id,
        limit=5000,
    )

    # Step 2: Find related sessions via PID (session_processes table).
    # This bridges the correlator "tool:pid:ts" ↔ OTel/hook UUID gap:
    # both session types record their PID in session_processes during
    # ingestion, so a PID lookup finds all session_ids for that process.
    api_by_session: list[EventRow] = []
    related_sids: set[str] = set()

    if session_pid:
        related_sids = set(db.find_session_ids_by_pid(session_pid))
        related_sids.discard(session_id)

    # Fetch OTel/hook events from related sessions
    for rel_sid in related_sids:
        rel_events = db.query_events(
            since=since - 7200, until=until,
            session_id=rel_sid,
            limit=5000,
        )
        all_events.extend(rel_events)
        api_by_session.extend(
            e for e in rel_events if (e.kind or "").startswith("otel:"))

    # Step 3: If no PID-based matches yet, try direct PID filter on events
    if not api_by_session and session_pid:
        pid_events = db.query_events(
            since=since - 7200, until=until,
            tool=tool, pid=session_pid,
            limit=5000,
        )
        all_events.extend(pid_events)
        api_by_session.extend(
            e for e in pid_events if (e.kind or "").startswith("otel:"))

    # Step 4: For non-correlator sessions (UUID), OTel events are already
    # in all_events via direct session_id match — extract them.
    if not session_pid:
        api_by_session.extend(
            e for e in all_events if (e.kind or "").startswith("otel:"))

    # Step 5: Last-resort fallback — tool + time window (pre-migration DBs
    # or when PID bridge has no entries yet).  Adds OTel events to
    # api_by_session AND hook events to all_events so that
    # has_prompts can detect hook-based sessions.
    if not api_by_session and tool:
        fallback_events = db.query_events(
            since=since - 7200, until=until,
            tool=tool, limit=5000,
        )
        for e in fallback_events:
            kind = e.kind or ""
            if kind.startswith("otel:"):
                api_by_session.append(e)
                all_events.append(e)

    # Deduplicate and sort
    seen_keys: set[tuple] = set()
    deduped: list[EventRow] = []
    for e in all_events:
        key = (e.ts, e.tool, e.kind)
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(e)
    all_events = sorted(deduped, key=lambda e: e.ts)

    seen_keys.clear()
    deduped_api: list[EventRow] = []
    for e in api_by_session:
        key = (e.ts, e.tool, e.kind)
        if key not in seen_keys:
            seen_keys.add(key)
            deduped_api.append(e)
    api_by_session = sorted(deduped_api, key=lambda e: e.ts)

    # Check if we have UserPromptSubmit events
    has_prompts = any(
        (e.kind or "") == "hook:UserPromptSubmit" for e in all_events
    )

    if has_prompts:
        turns = build_turns_from_hooks(all_events, api_by_session)
    else:
        turns = build_turns_from_otel(
            all_events, api_by_session, session_id)

    # Build summary
    summary = _build_summary(turns, has_prompts)

    return {"turns": turns, "summary": summary}


def _build_summary(turns: list[dict], has_prompts: bool) -> dict:
    """Compute summary statistics from a list of turns."""
    # Count tokens from api_call turns (OTel mode) or
    # user_message turns (hook mode, where attribute_api_to_turns puts
    # the tokens on user_message entries).
    api_turns = [t for t in turns
                 if t["type"] == "api_call" and t.get("tokens")]
    user_msgs = [t for t in turns if t["type"] == "user_message"]
    token_source = api_turns if api_turns else user_msgs
    total_input = sum(t.get("tokens", {}).get("input", 0)
                      for t in token_source)
    total_output = sum(t.get("tokens", {}).get("output", 0)
                       for t in token_source)
    total_cache = sum(t.get("tokens", {}).get("cache_read", 0)
                      for t in token_source)
    total_api_calls = (len(api_turns) if api_turns
                       else sum(t.get("api_calls", 0) for t in user_msgs))
    compactions = sum(1 for t in turns if t["type"] == "compaction")
    tool_uses = sum(1 for t in turns if t["type"] == "tool_use")
    first_ts = turns[0]["ts"] if turns else 0
    last_ts = turns[-1].get("end_ts", turns[-1]["ts"]) if turns else 0

    return {
        "total_turns": len(user_msgs),
        "total_api_calls": total_api_calls,
        "total_tool_uses": tool_uses,
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cache_tokens": total_cache,
        "total_tokens": total_input + total_output,
        "avg_tokens_per_call": (
            round((total_input + total_output) / total_api_calls)
            if total_api_calls else 0),
        "compactions": compactions,
        "duration_s": round(last_ts - first_ts, 1) if first_ts else 0,
        "source": "hooks" if has_prompts else "otel",
        "event_count": len(turns),
    }


def build_turns_from_hooks(all_events, api_by_session):
    """Build turns from hook events (UserPromptSubmit splits turns)."""
    turns = []
    current_turn = None
    compaction_start_ts = None

    for ev in all_events:
        kind = ev.kind or ""
        detail = ev.detail if isinstance(ev.detail, dict) else {}

        if kind == "hook:UserPromptSubmit":
            if current_turn:
                turns.append(current_turn)
            msg = detail.get("message", detail.get("content", ""))
            preview = msg[:200] if msg else ""
            current_turn = {
                "ts": ev.ts,
                "type": "user_message",
                "message": msg,
                "preview": preview,
                "tokens": {"input": 0, "output": 0,
                           "cache_read": 0, "cache_creation": 0},
                "tools": [],
                "model": "",
                "api_calls": 0,
                "duration_ms": 0,
                "end_ts": ev.ts,
            }
            continue

        if kind == "hook:PreCompact":
            if current_turn:
                turns.append(current_turn)
                current_turn = None
            compaction_start_ts = ev.ts
            continue

        if kind == "hook:PostCompact":
            turns.append({
                "ts": compaction_start_ts or ev.ts,
                "type": "compaction",
                "end_ts": ev.ts,
                "duration_ms": round(
                    (ev.ts - (compaction_start_ts or ev.ts)) * 1000),
                "compaction_count": detail.get("compaction_count",
                                               detail.get("count", 0)),
            })
            compaction_start_ts = None
            continue

        if kind == "hook:SubagentStart" and current_turn is not None:
            agent_id = detail.get("agent_id",
                                  detail.get("subagent_id", ""))
            task = detail.get("task", detail.get("description", ""))
            current_turn["tools"].append({
                "name": "Agent",
                "args_summary": task or agent_id,
                "ts": ev.ts,
                "duration_ms": 0,
                "is_agent": True,
            })
            continue

        if kind == "hook:PreToolUse" and current_turn is not None:
            tool_name = detail.get("tool_name", detail.get("name", ""))
            tool_input = detail.get("input",
                                    detail.get("tool_input", ""))
            args_summary = ""
            if isinstance(tool_input, dict):
                for key in ("file_path", "command", "pattern", "query",
                            "path", "url", "description"):
                    if key in tool_input:
                        args_summary = str(tool_input[key])[:120]
                        break
            elif isinstance(tool_input, str):
                args_summary = tool_input[:120]
            current_turn["tools"].append({
                "name": tool_name,
                "args_summary": args_summary,
                "ts": ev.ts,
                "duration_ms": 0,
            })
            current_turn["end_ts"] = ev.ts
            continue

        if kind == "hook:PostToolUse" and current_turn is not None:
            tool_name = detail.get("tool_name", detail.get("name", ""))
            for t in reversed(current_turn["tools"]):
                if t["name"] == tool_name and t["duration_ms"] == 0:
                    t["duration_ms"] = round((ev.ts - t["ts"]) * 1000)
                    break
            current_turn["end_ts"] = ev.ts
            continue

        if kind == "hook:SessionStart":
            turns.append({
                "ts": ev.ts, "type": "session_start",
                "tool": ev.tool,
                "cwd": detail.get("cwd", ""),
            })
            continue

        if kind == "hook:SessionEnd":
            if current_turn:
                turns.append(current_turn)
                current_turn = None
            turns.append({
                "ts": ev.ts, "type": "session_end",
                "tool": ev.tool,
            })
            continue

    if current_turn:
        turns.append(current_turn)

    # Attribute API call tokens to turns
    turn_user_msgs = [t for t in turns if t["type"] == "user_message"]
    attribute_api_to_turns(turn_user_msgs, api_by_session)
    return turns


def build_turns_from_otel(all_events, otel_events, session_id):
    """Build sequence diagram events from OTel and correlator events.

    Produces a flat list of typed events suitable for rendering as a
    UML sequence diagram:
    - user_message: user → tool (from otel:user_prompt)
    - api_call: tool → API (from otel:api_request or otel:chat*)
    - tool_use: tool → skill (from otel:tool_decision / otel:tool_result)
    - session_start / session_end: from correlator events
    - compaction: from hook:PreCompact / PostCompact
    - file_modified: from correlator events
    """
    turns = []
    compaction_start_ts = None

    # Process correlator events (session_start/end, file_modified)
    for ev in all_events:
        kind = ev.kind or ""
        detail = ev.detail if isinstance(ev.detail, dict) else {}

        if kind == "session_start":
            turns.append({
                "ts": ev.ts, "type": "session_start",
                "tool": ev.tool,
                "cwd": detail.get("cwd", ""),
            })
        elif kind == "session_end":
            turns.append({
                "ts": ev.ts, "type": "session_end",
                "tool": ev.tool,
            })
        elif kind == "hook:PreCompact":
            compaction_start_ts = ev.ts
        elif kind == "hook:PostCompact":
            turns.append({
                "ts": compaction_start_ts or ev.ts,
                "type": "compaction",
                "end_ts": ev.ts,
                "duration_ms": round(
                    (ev.ts - (compaction_start_ts or ev.ts)) * 1000),
                "compaction_count": detail.get("compaction_count",
                                               detail.get("count", 0)),
            })
            compaction_start_ts = None
        elif kind.startswith("hook:"):
            # Pass through any hook events as-is for the diagram
            turns.append({
                "ts": ev.ts, "type": "hook",
                "hook_name": kind[5:],
                "detail": detail,
                "tool": ev.tool,
            })

    # Process OTel events into sequence diagram entries
    for ev in otel_events:
        kind = ev.kind or ""
        detail = ev.detail if isinstance(ev.detail, dict) else {}

        # ── User prompt events ────────────────────────────
        if kind in ("otel:user_prompt", "otel:user_message"):
            # Claude Code: "prompt" key (may be <REDACTED>)
            # Copilot: "copilot_chat.user_request" or body
            msg = (detail.get("prompt")
                   or detail.get("copilot_chat.user_request")
                   or detail.get("message")
                   or detail.get("content")
                   or detail.get("body") or "")
            if isinstance(msg, dict):
                msg = msg.get("stringValue", str(msg))
            msg = str(msg).strip() if msg else ""
            redacted = (not msg
                        or msg in ("<REDACTED>", "REDACTED")
                        or "REDACTED" in msg.upper())
            prompt_len = detail.get("prompt_length", "")
            prompt_id = detail.get("prompt.id", "")
            turns.append({
                "ts": ev.ts,
                "type": "user_message",
                "from": "user",
                "to": ev.tool,
                "message": "" if redacted else msg[:2000],
                "preview": "" if redacted else msg[:120],
                "redacted": redacted,
                "prompt_length": prompt_len,
                "prompt_id": prompt_id,
                "tokens": {"input": 0, "output": 0,
                           "cache_read": 0, "cache_creation": 0},
                "model": "",
                "api_calls": 0,
                "duration_ms": 0,
            })

        # ── API call / chat span events ──────────────────
        # TODO: tighten "inference" to explicit kind values
        elif ("api_request" in kind
              or kind.startswith("otel:chat ")
              or "inference" in kind):
            model = (detail.get("model")
                     or detail.get("gen_ai.request.model")
                     or detail.get("gen_ai.response.model")
                     or detail.get("span.name") or "")
            in_tok = int(_num(detail.get("input_tokens",
                detail.get("gen_ai.usage.input_tokens",
                detail.get("gen_ai.usage.prompt_tokens", 0)))))
            out_tok = int(_num(detail.get("output_tokens",
                detail.get("gen_ai.usage.output_tokens",
                detail.get("gen_ai.usage.completion_tokens", 0)))))
            cache_r = int(_num(
                detail.get("cache_read_tokens",
                detail.get("gen_ai.usage.cache_read.input_tokens", 0))))
            cache_c = int(_num(detail.get("cache_creation_tokens", 0)))
            dur = int(_num(detail.get("duration_ms",
                           detail.get("duration", 0))))
            ttft = int(_num(
                detail.get("copilot_chat.time_to_first_token", 0)))
            agent_name = detail.get("gen_ai.agent.name", "")
            # Extract user request from chat spans (Copilot embeds it)
            user_req = detail.get("copilot_chat.user_request", "")
            # Extract response text from output messages
            resp_text = ""
            out_msgs = detail.get("gen_ai.output.messages")
            if isinstance(out_msgs, list) and out_msgs:
                for om in out_msgs:
                    if isinstance(om, dict):
                        for part in (om.get("parts") or []):
                            if isinstance(part, dict) and \
                                    part.get("type") == "text":
                                resp_text = str(
                                    part.get("content", ""))[:500]
                                break
                    if resp_text:
                        break
            finish = detail.get("gen_ai.response.finish_reasons", [])
            is_error = ("error" in finish
                        or detail.get("error.type", ""))

            # If this span has a user request and no user_message
            # event was emitted, synthesize one
            if user_req:
                turns.append({
                    "ts": ev.ts - 0.001,  # just before the API call
                    "type": "user_message",
                    "from": "user",
                    "to": ev.tool,
                    "message": str(user_req)[:2000],
                    "preview": str(user_req)[:120],
                    "redacted": False,
                    "tokens": {"input": 0, "output": 0,
                               "cache_read": 0, "cache_creation": 0},
                    "model": "",
                    "api_calls": 0,
                    "duration_ms": 0,
                })

            # Request arrow: tool → API
            turns.append({
                "ts": ev.ts,
                "type": "api_call",
                "from": ev.tool,
                "to": "api",
                "model": model,
                "agent_name": agent_name,
                "tokens": {"input": in_tok, "output": out_tok,
                           "cache_read": cache_r,
                           "cache_creation": cache_c},
                "duration_ms": dur,
                "ttft_ms": ttft,
                "is_error": is_error,
                "error_type": detail.get("error.type", ""),
            })
            # Response arrow: API → tool (with output tokens + text)
            if out_tok > 0 or resp_text:
                resp_ts = ev.ts + (dur / 1000 if dur else 0.1)
                turns.append({
                    "ts": resp_ts,
                    "type": "api_response",
                    "from": "api",
                    "to": ev.tool,
                    "model": model,
                    "tokens": {"output": out_tok},
                    "duration_ms": dur,
                    "response_preview": resp_text[:200] if resp_text
                                        else "",
                    "finish_reason": (finish[0] if finish
                                      else ""),
                })

        # ── Agent invocation (Copilot) ───────────────────
        elif kind.startswith("otel:invoke_agent"):
            agent_name = kind.replace("otel:invoke_agent ", "").strip()
            turns.append({
                "ts": ev.ts,
                "type": "subagent",
                "from": ev.tool,
                "to": agent_name or "agent",
                "detail": {k: v for k, v in detail.items()
                           if k not in ("tool", "session_id")},
            })

        # ── Copilot session/turn events ──────────────────
        elif kind == "otel:copilot_chat.session.start":
            turns.append({
                "ts": ev.ts, "type": "session_start",
                "tool": ev.tool,
                "cwd": detail.get("cwd", ""),
            })
        elif kind == "otel:copilot_chat.agent.turn":
            agent_name = detail.get("gen_ai.agent.name", "agent")
            turns.append({
                "ts": ev.ts,
                "type": "subagent",
                "from": ev.tool,
                "to": agent_name,
                "detail": detail,
            })

        # ── Exception events ─────────────────────────────
        elif kind == "otel:exception":
            err_type = detail.get("exception.type", "error")
            err_msg = detail.get("exception.message", "")
            parent = detail.get("parent_span", "")
            turns.append({
                "ts": ev.ts,
                "type": "error",
                "from": "api",
                "to": ev.tool,
                "error_type": err_type,
                "error_message": err_msg[:200],
                "parent_span": parent,
            })
        elif "tool_decision" in kind or "tool_result" in kind:
            tool_name = detail.get("tool_name",
                         detail.get("name",
                         detail.get("span.name", kind)))
            is_result = "tool_result" in kind
            # Extract tool parameters/args for display
            params = detail.get("tool_parameters", "")
            if isinstance(params, str) and len(params) > 200:
                params = params[:200] + "..."
            success = detail.get("success", "")
            result_size = detail.get("tool_result_size_bytes", "")
            turns.append({
                "ts": ev.ts,
                "type": "tool_use",
                "from": ev.tool,
                "to": tool_name,
                "subtype": "result" if is_result else "decision",
                "decision": detail.get("decision", ""),
                "success": success,
                "params": params,
                "result_size": result_size,
                "prompt_id": detail.get("prompt.id", ""),
                "duration_ms": int(_num(
                    detail.get("duration_ms", 0))),
            })
        elif kind == "otel:SubagentStart" or "subagent" in kind.lower():
            agent_id = detail.get("agent_id",
                        detail.get("subagent_id", ""))
            turns.append({
                "ts": ev.ts,
                "type": "subagent",
                "from": ev.tool,
                "to": agent_id or "subagent",
                "detail": detail,
            })

    # Sort all events chronologically
    turns.sort(key=lambda t: t["ts"])

    # Build per-turn token aggregation: group API calls between
    # user_messages so we can show round-trip totals
    current_round = None
    for t in turns:
        if t["type"] == "user_message":
            current_round = t
        elif t["type"] == "api_call" and current_round:
            tok = current_round.get("tokens", {})
            tok["input"] += t["tokens"]["input"]
            tok["output"] += t["tokens"]["output"]
            tok["cache_read"] += t["tokens"]["cache_read"]
            tok["cache_creation"] += t["tokens"]["cache_creation"]
            current_round["api_calls"] = \
                current_round.get("api_calls", 0) + 1
            current_round["duration_ms"] = \
                current_round.get("duration_ms", 0) + t["duration_ms"]
            if not current_round.get("model") and t.get("model"):
                current_round["model"] = t["model"]

    return turns


def attribute_api_to_turns(turn_user_msgs, api_by_session):
    """Attribute OTel API call data to the matching user-message turns.

    Only processes otel:api_request (and chat/inference spans) — skips
    otel:tool_decision, otel:tool_result, otel:user_prompt which carry
    no token data.
    """
    _API_KINDS = ("otel:api_request", "otel:claude_code.api_request")
    for api_ev in api_by_session:
        kind = api_ev.kind or ""
        # TODO: tighten "inference" to explicit kind values
        if not (kind in _API_KINDS
                or kind.startswith("otel:chat ")
                or "inference" in kind):
            continue
        d = api_ev.detail if isinstance(api_ev.detail, dict) else {}
        best_turn = None
        for t in turn_user_msgs:
            if t["ts"] <= api_ev.ts:
                best_turn = t
            else:
                break
        if best_turn:
            best_turn["tokens"]["input"] += int(_num(
                d.get("input_tokens", 0)))
            best_turn["tokens"]["output"] += int(_num(
                d.get("output_tokens", 0)))
            best_turn["tokens"]["cache_read"] += int(_num(
                d.get("cache_read_tokens", 0)))
            best_turn["tokens"]["cache_creation"] += int(_num(
                d.get("cache_creation_tokens", 0)))
            best_turn["api_calls"] += 1
            model = d.get("model", "")
            if model and not best_turn["model"]:
                best_turn["model"] = model
            dur = _num(d.get("duration_ms", d.get("duration", 0)))
            best_turn["duration_ms"] += int(dur)
            if api_ev.ts > best_turn["end_ts"]:
                best_turn["end_ts"] = api_ev.ts
    # Compute wall-clock duration
    for t in turn_user_msgs:
        if t["end_ts"] > t["ts"]:
            t["wall_ms"] = round((t["end_ts"] - t["ts"]) * 1000)
        else:
            t["wall_ms"] = t["duration_ms"]
