"""Whether agent sessions converge: ranked signs of repeated work on the board, and the evidence of one session.

Every signal is a heuristic with a fixed threshold. The board panel and the session drawer use the
same functions, so a session flagged on the board shows the same evidence in its drawer.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

from ..tool_scope import stored_ids_for
from .board_filters import Filters
from .panel_kql import query_block
from .projection_utils import _one_line
from .projections.history import HistoryScope

SESSION_LIMIT = 1000  # sessions read per board refresh, ranked by the view's rough order first
SHOWN = 100
TURN_LIMIT = 20_000
STRIP_BINS = 120
REPEAT_WINDOW = 20  # as RepeatWindow in the views: a repeat ran within this many requests of the same call


@dataclass(frozen=True)
class Signal:
    id: str
    label: str
    weight: int
    definition: str


SIGNALS = (
    Signal("repeated_calls", "Repeated identical calls", 3,
           "The most repeated call (same tool and target, else same input) ran again within 20 requests at least 5 times. "
           "Calls whose text is no longer retained (after 14 days) are not compared."),
    Signal("retries", "Retries after errors", 2,
           "At least 3 calls repeated a call that had just failed, within 20 requests."),
    Signal("file_churn", "Same file edited again and again", 2, "One file was edited 8 or more times."),
    Signal("dry_stretch", "Long stretch without a change", 2,
           "20 or more requests in a row without an accepted edit or a git commit, in a session that changed files."),
    Signal("tail_dry", "No change at the end", 2,
           "The last 15 or more requests made no accepted edit or git commit, in a session that changed files earlier."),
    Signal("falling_yield", "Falling yield", 1,
           "In a session of 40 or more requests, the second half used at least half of the tokens but touched at most "
           "20 % of the files the session edited for the first time (3 or more files)."),
    Signal("falling_output", "Falling output per request", 1,
           "In a session of 40 or more requests, the average output tokens per request of the second half are at most "
           "half of the first half."),
    Signal("compactions", "Repeated compaction", 1, "The context was compacted 2 or more times."),
    Signal("tokens_per_change", "Tokens per accepted change", 1,
           "5 million or more tokens (input, output and cache) per accepted edit, or 3 or more edit attempts and none accepted."),
)
SIGNAL_BY_ID = {s.id: s for s in SIGNALS}
DEFINITIONS = {
    "request": "One model request. Requests are numbered from 1 in time order across all agents of the session. "
               "A tool call belongs to the latest request before it in its agent.",
    "accepted": "An edit call that did not fail and was not denied or blocked.",
    "tokens": "Input, output, cache-read and cache-write tokens of the requests.",
    **{s.id: s.definition for s in SIGNALS},
    "score": "Sum of the weights of the signals that apply (" +
             ", ".join(f"{s.label} {s.weight}" for s in SIGNALS) + "). A heuristic ranking, not a verdict.",
}


def _n(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) else 0.0


def _range(first: Any, last: Any) -> str:
    return f"request {int(first)}" if first == last else f"requests {int(first)}-{int(last)}"


def _tool_of(label: str) -> tuple[str, str]:
    name, _, rest = (label or "").partition(" ")
    return name, _one_line(rest, 60)


def _short(tokens: float) -> str:
    return f"{tokens / 1e6:.1f}M" if tokens >= 1e6 else f"{tokens / 1e3:.0f}k" if tokens >= 1e3 else f"{tokens:.0f}"


def signals(row: dict) -> list[dict]:
    """The signals that apply to one session row, each with the values that triggered it."""
    out: list[dict] = []

    def add(sid: str, evidence: str, **values: Any) -> None:
        signal = SIGNAL_BY_ID[sid]
        out.append({"id": sid, "label": signal.label, "weight": signal.weight, "evidence": evidence, "values": values})

    requests = _n(row.get("requests"))
    changes = _n(row.get("accepted")) + _n(row.get("commits"))
    if _n(row.get("top_rep")) >= 5:
        tool, target = _tool_of(row.get("top_rep_label") or "")
        what = f"{tool} {target}".strip() if target else tool
        add("repeated_calls", f"{int(_n(row.get('top_rep_calls')))} identical {what} calls in "
            f"{_range(row.get('top_rep_first'), row.get('top_rep_last'))}",
            repeats=int(_n(row.get("top_rep"))), calls=int(_n(row.get("top_rep_calls"))))
    if _n(row.get("retries")) >= 3:
        add("retries", f"{int(_n(row['retries']))} retries after a failure, {int(_n(row.get('failed_retries')))} failed again",
            retries=int(_n(row["retries"])), failed_again=int(_n(row.get("failed_retries"))))
    if _n(row.get("top_file_edits")) >= 8:
        add("file_churn", f"{_one_line(row.get('top_file'), 80)} edited {int(_n(row['top_file_edits']))} times",
            edits=int(_n(row["top_file_edits"])), file=row.get("top_file"))
    tail = _n(row.get("tail_dry"))
    longest = _n(row.get("longest_dry"))
    if changes and tail >= 15:
        add("tail_dry", f"no file change in the last {int(tail)} requests", requests=int(tail))
    if changes and longest >= 20 and not (tail >= 15 and longest == tail):
        add("dry_stretch", f"no file change in {_range(row.get('dry_start'), row.get('dry_end'))} ({int(longest)} requests)",
            requests=int(longest))
    tokens = _n(row.get("tokens"))
    if requests >= 40:
        new, late = _n(row.get("files_new")), _n(row.get("files_new_late"))
        share = _n(row.get("tokens_late")) / tokens if tokens else 0.0
        if new >= 3 and share >= 0.5 and late / new <= 0.2:
            add("falling_yield", f"second half: {share:.0%} of tokens, {late / new:.0%} of new files ({int(late)} of {int(new)})",
                token_share=round(share, 3), file_share=round(late / new, 3))
        early, late_out = _n(row.get("out_early")), _n(row.get("out_late"))
        if early > 0 and late_out <= early / 2:
            add("falling_output", f"output per request fell from {early:.0f} to {late_out:.0f} tokens",
                early=round(early), late=round(late_out))
    if _n(row.get("compactions")) >= 2:
        add("compactions", f"context compacted {int(_n(row['compactions']))} times", compactions=int(_n(row["compactions"])))
    accepted = _n(row.get("accepted"))
    if accepted and tokens / accepted >= 5e6:
        add("tokens_per_change", f"{_short(tokens / accepted)} tokens per accepted change ({int(accepted)} changes)",
            tokens_per_change=round(tokens / accepted))
    elif not accepted and _n(row.get("edits")) >= 3:
        add("tokens_per_change", f"{int(_n(row['edits']))} edit attempts, none accepted", edits=int(_n(row["edits"])))
    return out


def verdict(found: list[dict]) -> str:
    if not found:
        return "No sign of non-convergence above the thresholds (heuristic)."
    ordered = sorted(found, key=lambda s: -s["weight"])
    return "Possibly not converging (heuristic): " + "; ".join(s["evidence"] for s in ordered[:3]) + "."


def rank(rows: list[dict]) -> list[dict]:
    """Sessions with at least one signal, highest score first."""
    ranked = []
    for row in rows:
        found = signals(row)
        if not found:
            continue
        accepted = _n(row.get("accepted"))
        ranked.append({
            "session_id": row["session_id"], "node_id": row.get("node_id"), "tool": row.get("tool"),
            "project_path": row.get("project_path"), "model": row.get("model"),
            "first_ts": row.get("first_ts"), "last_ts": row.get("last_ts"),
            "requests": row.get("requests"), "tokens": row.get("tokens"), "cost_usd": row.get("cost_usd"),
            "calls": row.get("calls"), "errors": row.get("errors"),
            "repeats": row.get("repeats"), "top_repeat": row.get("top_rep"), "retries": row.get("retries"),
            "top_file_edits": row.get("top_file_edits"), "top_file": row.get("top_file"),
            "longest_dry": row.get("longest_dry"), "tail_dry": row.get("tail_dry"),
            "compactions": row.get("compactions") or 0, "accepted": row.get("accepted"),
            "tokens_per_change": round(_n(row.get("tokens")) / accepted) if accepted else None,
            "score": sum(s["weight"] for s in found), "signals": found, "verdict": verdict(found),
        })
    ranked.sort(key=lambda r: (-r["score"], -_n(r["tokens"]), r["session_id"]))
    return ranked


def _scope_params(history: HistoryScope, filters: Filters, now: float) -> dict:
    params: dict[str, Any] = {"since": filters.since, "until": filters.until}
    if filters.tools is not None:
        params |= {"restrict_tools": True, "requested_tools": stored_ids_for(filters.tools)}
    if filters.projects or filters.model or filters.q or filters.status != "all":
        from .artifact_details import _detail_scope

        params |= {k: v for k, v in _detail_scope(history, filters, now).items() if k in ("restrict_sessions", "session_keys")}
    return params


def _node(history: HistoryScope) -> dict:
    return {} if history.node is None else {"all_nodes": False, "requested_node": history.node}


def convergence_board(filters: Filters, now: float | None = None, *, history: HistoryScope) -> tuple[int, dict]:
    """The Convergence panel: sessions in the window ranked by signs of not converging."""
    now = time.time() if now is None else now
    params = _scope_params(history, filters, now)
    rows = history.read("sessions.convergence", limit=SESSION_LIMIT, page=True, **params)
    ranked = rank(rows)
    shown = ranked[:SHOWN]
    titles = _titles(history, {r["session_id"] for r in shown}, now)
    for row in shown:
        row["title"] = titles.get(row["session_id"]) or row["session_id"]
    return 200, {
        "rows": shown, "flagged": len(ranked), "checked": len(rows), "checked_capped": len(rows) >= SESSION_LIMIT,
        "signals": [{"id": s.id, "label": s.label, "weight": s.weight, "definition": s.definition} for s in SIGNALS],
        "definitions": DEFINITIONS, "range": {"since": filters.since, "until": filters.until},
        "query": query_block(history, "sessions.convergence", {**params, **_node(history), "limit": SESSION_LIMIT}),
    }


def _titles(history: HistoryScope, sids: set[str], now: float) -> dict[str, str]:
    from .artifact_details import _history_titles

    if not sids:
        return {}
    return {sid: title for (sid, _aid), title in _history_titles(history, {(sid, sid) for sid in sids}, now).items()}


def clusters(rns: list[int], window: int = REPEAT_WINDOW) -> list[tuple[int, int, int]]:
    """Runs of one repeated call: (calls, first request, last request), each gap at most *window* requests."""
    found: list[tuple[int, int, int]] = []
    ordered = sorted(int(r) for r in rns if r is not None)
    start = 0
    for i in range(1, len(ordered) + 1):
        if i == len(ordered) or ordered[i] - ordered[i - 1] > window:
            if i - start >= 2:
                found.append((i - start, ordered[start], ordered[i - 1]))
            start = i
    return found


def _runs(turns: list[dict], test, gap: int = 2) -> list[tuple[int, int]]:
    """Request ranges where *test* holds, joining hits at most *gap* requests apart."""
    runs: list[tuple[int, int]] = []
    for turn in turns:
        if not test(turn):
            continue
        if runs and turn["rn"] - runs[-1][1] <= gap:
            runs[-1] = (runs[-1][0], turn["rn"])
        else:
            runs.append((turn["rn"], turn["rn"]))
    return runs


def session_summary(turns: list[dict], repeats: list[dict], files: list[dict], compactions: int) -> dict:
    """A board row for one session, computed from its turn rows, so ``signals`` reads both the same way."""
    turns = sorted(turns, key=lambda t: t["rn"])
    n = len(turns)
    changed = [t for t in turns if _n(t.get("accepted")) or _n(t.get("commits"))]
    longest, start, end, run_start = 0, None, None, None
    for t in turns:
        if _n(t.get("accepted")) or _n(t.get("commits")):
            run_start = None
            continue
        run_start = t["rn"] if run_start is None else run_start
        if t["rn"] - run_start + 1 > longest:
            longest, start, end = t["rn"] - run_start + 1, run_start, t["rn"]
    top = max(repeats, key=lambda r: (_n(r.get("reps")), _n(r.get("n"))), default={})
    churn = max(files, key=lambda f: _n(f.get("n")), default={})
    half = n // 2
    late = [t for t in turns if t["rn"] > half]
    early = [t for t in turns if t["rn"] <= half]
    new = sum(_n(t.get("new_files")) for t in turns)
    return {
        "requests": n, "tokens": sum(_n(t.get("tokens")) for t in turns),
        "repeats": sum(_n(t.get("repeats")) for t in turns), "retries": sum(_n(t.get("retries")) for t in turns),
        "failed_retries": None, "edits": sum(_n(t.get("edits")) for t in turns),
        "accepted": sum(_n(t.get("accepted")) for t in turns), "commits": sum(_n(t.get("commits")) for t in turns),
        "top_rep": top.get("reps"), "top_rep_calls": top.get("n"), "top_rep_first": top.get("first_rn"),
        "top_rep_last": top.get("last_rn"), "top_rep_label": top.get("label"),
        "top_file": churn.get("file"), "top_file_edits": churn.get("n"),
        "longest_dry": longest, "dry_start": start, "dry_end": end,
        "tail_dry": n - (changed[-1]["rn"] if changed else 0),
        "tokens_late": sum(_n(t.get("tokens")) for t in late),
        "out_early": sum(_n(t.get("output_tokens")) for t in early) / len(early) if early else None,
        "out_late": sum(_n(t.get("output_tokens")) for t in late) / len(late) if late else None,
        "files_new": new, "files_new_late": sum(_n(t.get("new_files")) for t in late), "compactions": compactions,
    }


def strip(turns: list[dict], bins: int = STRIP_BINS) -> list[dict]:
    """The per-request figures folded into at most *bins* equal ranges of requests."""
    turns = sorted(turns, key=lambda t: t["rn"])
    if not turns:
        return []
    n = turns[-1]["rn"]
    size = max(1, -(-n // bins))
    out: list[dict] = []
    for t in turns:
        index = (t["rn"] - 1) // size
        while len(out) <= index:
            first = len(out) * size + 1
            out.append({"first": first, "last": min(n, first + size - 1), "tokens": 0, "output_tokens": 0, "calls": 0,
                        "errors": 0, "edits": 0, "accepted": 0, "repeats": 0, "retries": 0})
        cell = out[index]
        for key in ("tokens", "output_tokens", "calls", "errors", "edits", "accepted", "repeats", "retries"):
            cell[key] += int(_n(t.get(key)))
    return out


def session_convergence(sid: str, now: float | None = None, *, history: HistoryScope,
                        since: float | None = None, until: float | None = None) -> tuple[int, dict]:
    """The Convergence tab of the session drawer: a per-request strip, marked runs and a one-line verdict."""
    now = time.time() if now is None else now
    params = {"since": since if since is not None else 0.0, "until": until if until is not None else now + 60.0}
    rows = history.read("sessions.convergence_turns", sid=sid, limit=TURN_LIMIT, page=True, **params)
    turns = sorted((r for r in rows if r.get("row_type") == "turn"), key=lambda r: r["rn"])
    repeats = [r for r in rows if r.get("row_type") == "repeat"]
    files = sorted((r for r in rows if r.get("row_type") == "file"), key=lambda r: -_n(r.get("n")))
    compaction_ts = sorted(r["ts"] for r in rows if r.get("row_type") == "compaction" and r.get("ts") is not None)
    compaction_rn = [next((t["rn"] for t in turns if t["ts"] >= ts), turns[-1]["rn"] if turns else 0) for ts in compaction_ts]
    marked = []
    for row in repeats:
        for calls, first, last in clusters(row.get("rns") or []):
            if calls >= 3:
                marked.append({"label": _one_line(row.get("label"), 120), "tool": row.get("tool_name"), "calls": calls,
                               "first": first, "last": last, "failed": row.get("failed")})
    marked.sort(key=lambda c: (-c["calls"], c["first"]))
    retry_runs = []
    for first, last in _runs(turns, lambda t: _n(t.get("retries")) > 0):
        count = sum(int(_n(t.get("retries"))) for t in turns if first <= t["rn"] <= last)
        if count >= 2:
            retry_runs.append({"first": first, "last": last, "retries": count})
    summary = session_summary(turns, repeats, files, len(compaction_ts))
    if marked:  # the densest run of the top call, not its first and last use anywhere in the session
        top = marked[0]
        summary |= {"top_rep_calls": top["calls"], "top_rep_first": top["first"], "top_rep_last": top["last"],
                    "top_rep_label": top["label"], "top_rep": max(summary.get("top_rep") or 0, top["calls"] - 1)}
    found = signals(summary)
    store = query_block(history, "sessions.convergence_turns",
                        {**params, **_node(history), "requested_session": history.split(sid)[1], "limit": TURN_LIMIT})
    return 200, {
        "session_id": sid, "requests": len(turns), "truncated": len(rows) >= TURN_LIMIT,
        "strip": strip(turns), "clusters": marked[:10], "clusters_total": len(marked), "retry_runs": retry_runs[:10],
        "retry_runs_total": len(retry_runs), "files": [
            {"file": f.get("file"), "edits": f.get("n"), "failed": f.get("failed"), "first": f.get("first_rn"),
             "last": f.get("last_rn")} for f in files],
        "compactions": compaction_rn, "summary": {k: summary[k] for k in (
            "requests", "tokens", "repeats", "retries", "edits", "accepted", "commits", "longest_dry", "dry_start", "dry_end",
            "tail_dry", "files_new", "compactions")},
        "signals": found, "verdict": verdict(found), "definitions": DEFINITIONS, "query": store,
    }
