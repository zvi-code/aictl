"""Session-scoped execution evidence. A span and a transcript event are not two billable calls."""

from __future__ import annotations

import contextlib
import re
import time
from typing import Any

from ..storage import _STEP_FIELDS, STEP_TEXT_LIMIT

_FILTERS = ("kind", "agent_id", "turn_id", "round_id", "tool_call_id", "request_id", "step_key")
_SEARCH_FIELDS = ("kind", "name", "role", "phase", "tool_call_id", "turn_id", "agent_id")
_PREVIEW = 240


class EvidenceInputError(ValueError):
    pass


def _param(params: dict[str, list[str]], name: str, maximum: int = 384) -> str:
    values = params.get(name, [""])
    if len(values) != 1 or len(values[0]) > maximum or any(ord(c) < 32 for c in values[0]):
        raise EvidenceInputError(f"Invalid {name}")
    return values[0].strip()


def _number(params: dict, key: str, default: int, low: int, high: int) -> int:
    raw = _param(params, key, 8)
    if not raw:
        return default
    if not raw.isascii() or not raw.isdecimal() or not low <= int(raw) <= high:
        raise EvidenceInputError(f"{key} must be between {low} and {high}")
    return int(raw)


def session_evidence(db: Any, params: dict[str, list[str]]) -> dict:
    sid = _param(params, "session_id")
    if not sid:
        raise EvidenceInputError("session_id is required")
    limit = _number(params, "limit", 100, 1, 100)
    offset = _number(params, "offset", 0, 0, 10000)
    filters = {k: v for k in _FILTERS if (v := _param(params, k))}
    q = _param(params, "q", 160)
    terms = list(dict.fromkeys(re.findall(r"[^\W_]+", q.lower())))
    if (q and not terms) or len(terms) > 8:
        raise EvidenceInputError("Search requires one to eight words")
    keep = db._keeps_text()
    floor = time.time() - db._content_retention_days * 86400
    detail = bool(filters.get("step_key"))
    scope = getattr(db, "read_scope", None)
    with scope(session=sid) if scope else contextlib.nullcontext():
        conn = db._conn()
        if getattr(db, "streams_observations", False) is True:
            rows = conn._query(_evidence_kql(sid, filters, terms, limit, offset, keep, floor, detail)).dicts()
        else:
            rows = _sqlite_rows(conn, sid, filters, terms, limit, offset, keep, floor, detail)
    for r in rows:
        if r["text_status"] in ("captured", "truncated") and not r.get("text_preview"):
            r["text_status"] = "expired" if keep else "withheld"
    return {"session_id": sid, "rows": rows[:limit], "has_more": len(rows) > limit, "offset": offset, "limit": limit}


def _sqlite_rows(conn, sid, filters, terms, limit, offset, keep, floor, detail):
    size = STEP_TEXT_LIMIT if detail else _PREVIEW
    text = "COALESCE(t.text,'')" if keep else "''"
    join = "LEFT JOIN session_step_text t ON t.step_key=s.step_key AND t.session_id=s.session_id AND t.ts >= ?" if keep else ""
    args = [floor, sid] if keep else [sid]
    where = ["s.session_id=?"]
    for key, value in filters.items():
        where.append(f"s.{key}=?")
        args.append(value)
    for term in terms:
        columns = [f"s.{field}" for field in _SEARCH_FIELDS] + ([text] if keep else [])
        where.append("(" + " OR ".join(f"instr(lower({col}), ?) > 0" for col in columns) + ")")
        args.extend([term] * len(columns))
    cur = conn.execute(
        f"SELECT s.*, substr({text},1,{size}) AS content FROM session_steps s {join} WHERE "
        + " AND ".join(where)
        + " ORDER BY s.ts, s.source_order IS NULL, s.source_order, s.step_key LIMIT ? OFFSET ?", (*args, limit + 1, offset),
    )
    names = [c[0] for c in cur.description]
    out = []
    for row in cur:
        r = dict(zip(names, row, strict=True))
        value = r.pop("content")
        r["text_preview"] = value[:_PREVIEW]
        if detail:
            r["text"] = value
        out.append(r)
    return out


def _evidence_kql(sid, filters, terms, limit, offset, keep, floor, detail):
    from ..kusto.connection import kql_literal
    from ..kusto.schema import quote

    def lit(v):
        return kql_literal(v, "string")

    session = lit(sid)
    steps = f"session_steps | where session_id == {session} | summarize arg_max(_v, *) by step_key | where not(_deleted)"
    if keep:
        texts = (f"session_step_text | where session_id == {session} and ts >= {floor!r} "
                 "| summarize arg_max(_v, *) by step_key | where not(_deleted) | project step_key, content=['text']")
        steps += f" | join kind=leftouter ({texts}) on step_key"
    else:
        steps += " | extend content=''"
    fields = ", ".join(quote(field) for field in _STEP_FIELDS)
    steps += f" | project {fields}, content"
    if filters.get("kind") not in ("context", "message", "user_message", "assistant_message", "command", "skill", "turn", "round"):
        # A fresh database may not yet have received an OTLP export.
        empty = ("datatable(SessionId:string,TraceID:string,SpanID:string,ParentID:string,RowKey:string,StartTime:datetime,"
                 "EndTime:datetime,Tool:string,ToolName:string,TurnId:string,ToolCallId:string,OperationName:string,"
                 "InputTokens:long,OutputTokens:long,AgentName:string,Model:string,DurationMs:long)[]")
        spans = (
            f"union isfuzzy=true ({empty}), OTELTraces | where SessionId == {session} and isnotempty(TraceID) and isnotempty(SpanID) "
            "| summarize arg_max(EndTime, *) by TraceID,SpanID "
            "| project step_key=strcat('otel:',TraceID,':',SpanID), ts=(StartTime-datetime(1970-01-01))/1s, "
            "session_id=SessionId, ['kind']=case(isnotempty(ToolCallId),'tool_call',"
            "isnotnull(InputTokens) or isnotnull(OutputTokens),'model_call','span'), tool=Tool, turn_id=TurnId, "
            "tool_call_id=ToolCallId, trace_id=TraceID, span_id=SpanID, parent_span_id=ParentID, "
            "agent_name=AgentName, model=Model, duration_ms=DurationMs, "
            "['source']='otel', ['name']=coalesce(ToolName,OperationName), phase=iff(isnull(EndTime),'started','ended'), "
            "input_tokens=InputTokens, output_tokens=OutputTokens, text_status='not_reported', content=''"
        )
        steps = f"union ({steps}), ({spans})"
    for key, value in filters.items():
        steps += f" | where {quote(key)} == {lit(value)}"
    for term in terms:
        columns = [*_SEARCH_FIELDS, *(("content",) if keep else ())]
        steps += " | where " + " or ".join(f"{quote(col)} has {lit(term)}" for col in columns)
    steps += (f" | sort by ts asc nulls last, source_order asc nulls last, step_key asc | take {offset+limit+1}"
              f" | serialize __n=row_number() | where __n > {offset} | extend text_preview=substring(content,0,{_PREVIEW})")
    if detail:
        steps += " | extend ['text']=content"
    return steps + " | project-away content,__n"
