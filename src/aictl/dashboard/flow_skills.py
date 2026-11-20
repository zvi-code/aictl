"""Session-scoped skill evidence. Context inventories are observations, not executions."""

from __future__ import annotations

from collections import Counter

from ..ingesters.call_facts import skill_of_path
from .projections.history import HistoryScope, typed_rows

def skill_events(db, sid, lo, hi, *, live_end, history=None):
    history = history or HistoryScope.local(db)
    facts = typed_rows(history.read("sequence.skills", sid=sid, since=lo, until=hi))
    rows = facts.get("evidence", [])
    reported = [
        {"name": name, "ts": ts, "last_ts": last, "reported_spans": count, "type": "skill_event",
         "phase": "reported", "source": "otel", "step_key": "otel-skill:" + name}
        for name, ts, last, count in facts.get("reported", [])
    ]
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
    events.extend(reported)
    return sorted(events, key=lambda e: (e["ts"], e["name"], e["step_key"]))
