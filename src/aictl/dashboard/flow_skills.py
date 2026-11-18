"""Session-scoped skill evidence. Context inventories are observations, not executions."""

from __future__ import annotations

import threading
import time
from collections import Counter

from ..ingesters.call_facts import skill_of_path

_SQL = """
SELECT ts,agent_id,name,phase,source,step_key,turn_id,'' AS path FROM session_steps
 WHERE session_id=? AND ts>=? AND ts<? AND kind='skill'
UNION ALL SELECT ts,agent_id,name,CASE WHEN trigger='context-load' THEN 'loaded' ELSE 'invoked' END,
 'skill_uses',dedup_key,'','' FROM skill_uses WHERE session_id=? AND ts>=? AND ts<?
UNION ALL SELECT ts,agent_id,'','loaded','session_loaded_files','','',path FROM session_loaded_files
 WHERE session_id=? AND ts>=? AND ts<? AND how='skill'
"""


def _otel(conn, sid, lo, hi):
    from ..kusto.connection import kql_literal

    session = kql_literal(sid, "string")
    # One row per named skill, not one load per span that repeats its inventory.
    q = f"""union isfuzzy=true (datatable(node_id:string,SessionId:string,TraceID:string,SpanID:string,StartTime:datetime,
    EndTime:datetime,ReportedSkillNames:string,ReportedContext:dynamic,TraceAttributes:dynamic)[]), OTELTraces
| where node_id == {kql_literal(conn.settings.node_id, "string")} and SessionId == {session} and StartTime >= unixtime_seconds_todatetime({lo!r}) and StartTime < unixtime_seconds_todatetime({hi!r})
| where isnotempty(TraceID) and isnotempty(SpanID)
| project TraceID, SpanID, StartTime, EndTime, names=coalesce(ReportedContext.skills,iff(isnotempty(ReportedSkillNames),split(ReportedSkillNames,'\\n'),
    parse_json(tostring(TraceAttributes['github.copilot.context.skills']))))
| summarize arg_max(EndTime, StartTime, names) by TraceID, SpanID
| where array_length(names)>0
| mv-expand skill=set_union(array_slice(names,0,255),dynamic([])) to typeof(string)
| where skill matches regex @"^[\\w][\\w.:-]{{0,127}}$"
| summarize spans=count(), first_seen=min(StartTime), last_seen=max(StartTime) by skill
| project name=skill, ts=(first_seen-datetime(1970-01-01))/1s, last_ts=(last_seen-datetime(1970-01-01))/1s, reported_spans=spans"""
    return [{**r, "type": "skill_event", "phase": "reported", "source": "otel", "step_key": "otel-skill:" + r["name"]}
            for r in conn._query(q).dicts()]


def _read(db, sid, lo, hi):
    conn = db._conn()
    rows = conn.execute(_SQL, (sid, lo, hi) * 3).fetchall()
    events = []
    seen = Counter()
    # Typed steps and the old skill/file indexes can describe the same input.
    # Reconcile mirrors one for one, keeping distinct source events at the same time.
    for priority in (0, 1, 2):
        counts = Counter()
        for ts, aid, name, phase, src, key, turn, path in rows:
            if (2 if src == "session_loaded_files" else 1 if src == "skill_uses" else 0) != priority:
                continue
            name = name or skill_of_path(path) or (path or "").replace("\\", "/").rsplit("/", 1)[-1]
            if not name:
                continue
            identity = (ts, aid or "", name.casefold(), phase)
            counts[identity] += 1
            if seen[identity] >= counts[identity]:
                continue
            events.append({"ts": ts, "type": "skill_event", "name": name, "phase": phase, "source": src,
                           "agent_id": aid or "", "turn_id": turn or "",
                           "step_key": key or f"skill-file:{aid or ''}:{name}:{ts}:{counts[identity]}"})
        seen |= counts
    if getattr(db, "streams_observations", False) is True:
        events.extend(_otel(conn, sid, lo, hi))
    return sorted(events, key=lambda e: (e["ts"], e["name"], e["step_key"]))


def skill_events(db, sid, lo, hi, *, live_end):
    if getattr(db, "streams_observations", False) is not True:
        return _read(db, sid, lo, hi)
    key = sid, lo, None if live_end else hi
    with db.__dict__.setdefault("_skill_flow_lock", threading.Lock()):
        cache = db.__dict__.setdefault("_skill_flow_cache", {})
        hit = cache.get(key)
        if hit and time.monotonic() - hit[0] < 15:
            return hit[1]
        events = _read(db, sid, lo, hi)
        if key not in cache and len(cache) >= 16:
            del cache[min(cache, key=lambda k: cache[k][0])]
        cache[key] = (time.monotonic(), events)
        return events
