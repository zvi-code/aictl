"""A history read is complete for any session length: a view read without page=True continues past the limit.

HistoryScope.read follows a view's continuation when its result is larger than the limit. A view
without one made the whole read fail ("no advancing continuation"), as the drawer of a session with
more rows than the limit did. Each test seeds rows that tie on the sort keys (the same time, the same
key in two projects and on two nodes), reads the view once in full and again in pages of one and two
rows, and requires the same rows in the same order: none lost or repeated at a page boundary.
"""

import json

import pytest

from aictl.dashboard.projections.history import HistoryScope

SID = "long"
TIE = 100.125


def _otel(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i, kind in enumerate(("otel:span", "otel:log", "hook:PostToolUse")):
                seed("events", project=project, node_id=node, session_id=SID, ts=TIE, kind=kind, source_key=f"e{i}",
                     detail=json.dumps({"span.name": "chat m", "i": i, "rate_limits": {"five_hour": {"used_pct": i}}}))
            seed("requests", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="c", model="m",
                 output_tokens=3, source="transcript")
    return {"signal": 8, "call": 4, "source": 1, "hooks": 1, "rate": 1}


def _context(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            seed("requests", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="c", input_tokens=10)
            seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="x",
                 kind="compaction", before_tokens=10, after_tokens=2)
            seed("session_context_items", project=project, node_id=node, session_id=SID, ts=TIE, kind="skills",
                 name="review", tokens=5)
            seed("tool_invocations", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="t",
                 tool_name="Bash")
            seed("session_prompts", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="u", text="hi")
            seed("session_loaded_files", project=project, node_id=node, session_id=SID, ts=TIE, path="/AGENTS.md",
                 how="instructions")
    return {"call": 4, "compaction": 4, "item": 4, "tool": 4, "prompt": 4, "loaded": 4}


def _skills(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            seed("skill_uses", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="k", name="review")
            seed("session_steps", project=project, node_id=node, session_id=SID, ts=TIE, step_key="k", kind="skill",
                 name="review")
            seed("session_loaded_files", project=project, node_id=node, session_id=SID, ts=TIE, path="/SKILL.md",
                 how="skill")
    return {"evidence": 12}


def _commits(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for sha in ("a", "b"):
                seed("session_commits", project=project, node_id=node, session_id=SID, ts=TIE, sha=sha, subject=sha)
    return {None: 8}


def _artifacts(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            seed("session_artifacts", project=project, node_id=node, session_id=SID, path="/out.txt", mtime=TIE)
            seed("session_folders", project=project, node_id=node, session_id=SID, files_total=1, scanned_at=TIE)
            for path in ("/a.py", "/b.py"):
                seed("file_write_events", project=project, node_id=node, session_id=SID, ts=TIE, path=path,
                     dedup_key=f"w{path}")
    # The index has one row per project; the folder sums and the writes have one per node (and path).
    return {"index": 4, "folder": 2, "write": 4}


def _tests(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("tool_invocations", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"t{i}",
                     id=7, tool_name="Bash", target="python -m pytest test/")
    return {"item": 8}


def _prompts(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("session_prompts", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"u{i}",
                     id=7, text="go")
    return {None: 8}


def _skill_uses(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("skill_uses", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"k{i}", id=7,
                     name="review")
    return {"item": 8}


def _skill_window(seed):
    _skill_uses(seed)
    return {None: 8}


def _long_requests(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("requests", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"r{i}",
                     model="m", input_tokens=300_000)
    seed("requests", session_id=SID, ts=TIE, dedup_key="short", model="m", input_tokens=10)
    return {None: 8}


MEMORY = "/home/u/.claude/projects/-p/memory/MEMORY.md"


def _memory_changes(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("file_write_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"m{i}",
                     path=MEMORY, mechanism="claude_auto_memory", actor="agent", after_hash=f"h{i}")
            seed("file_write_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="src",
                 path="/p/a.py")
    return {None: 8}


def _memory_versions(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            seed("file_write_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="m",
                 path=MEMORY, mechanism="claude_auto_memory", after_hash="h")
            seed("file_history", project=project, node_id=node, path=MEMORY, ts=TIE, blob_hash="b")
    return {None: 8}


def _checkpoints(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"x{i}",
                     kind="compaction", summary_kind="compact_summary", summary_seq=i + 1)
                seed("session_digests", project=project, node_id=node, session_id=SID, kind="compact_summary",
                     seq=i + 1, ts=TIE, text="summary")
            seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="r",
                 kind="memory_recall")
    return {None: 8}


def _recalls(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"r{i}",
                     kind="memory_recall", path=MEMORY)
            seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="c",
                 kind="compaction")
    return {None: 8}


def _checkpoint_files(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for path in ("/p/a.py", MEMORY):
                seed("file_history", project=project, node_id=node, path=path, ts=TIE, session_id=SID,
                     source_event_id="u-1", origin="claude_file_history", state="backup")
    return {None: 8}


def _config(seed):
    for project in ("p", "q"):
        for node in ("test-node", "n2"):
            for i in range(2):
                seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key=f"g{i}",
                     kind="config.model_change", detail=json.dumps({"previousModel": "a", "newModel": "b"}))
            seed("context_events", project=project, node_id=node, session_id=SID, ts=TIE, dedup_key="c",
                 kind="compaction")
    return {None: 8}


KEYS = [f"{len(node)}:{node}{SID}" for node in ("test-node", "n2")]


# Views keyed to sessions whose rows grow with the session: one row per call, event, item, commit, file or use.
@pytest.mark.parametrize(("view", "params", "seeder"), [
    ("sequence.otel", {"sid": SID}, _otel),
    ("sequence.context", {"sid": SID}, _context),
    ("sequence.skills", {"sid": SID, "since": 0.0, "until": 1e10}, _skills),
    ("sessions.commits", {"sid": SID}, _commits),
    ("files.artifacts", {"session_keys": KEYS}, _artifacts),
    ("tools.detail", {"sid": SID, "query_mode": "tests", "real_calls": False}, _tests),
    ("prompts.page", {"session_keys": KEYS}, _prompts),
    ("skills.detail", {"requested_skill": "review", "query_mode": "starts", "session_keys": KEYS}, _skill_uses),
    ("skills.window", {"since": 0.0, "until": 1e10, "session_keys": KEYS}, _skill_window),
    ("requests.long", {"sid": SID, "since": 0.0, "until": 1e10, "grid": 4, "requested_models": ["m"],
                       "min_tokens": 200_000}, _long_requests),
    ("memory.changes", {"sid": SID}, _memory_changes),
    ("memory.versions", {"requested_path": MEMORY}, _memory_versions),
    ("memory.recalls", {"sid": SID}, _recalls),
    ("checkpoints.session", {"sid": SID}, _checkpoints),
    ("checkpoints.files", {"sid": SID, "requested_message": "u-1"}, _checkpoint_files),
    ("sessions.config", {"sid": SID}, _config),
])
def test_session_reads_are_complete_past_the_limit(kusto_store, view, params, seeder):
    counts = seeder(kusto_store.insert)
    history = HistoryScope(kusto_store.history_store.reader, None)
    expected = history.read(view, **params)
    assert all("_page_cursor" not in row for row in expected)
    found: dict[str | None, int] = {}
    for row in expected:
        found[row.get("row_type")] = found.get(row.get("row_type"), 0) + 1
    assert found == counts
    for limit in (1, 2):
        assert history.read(view, **params, limit=limit) == expected


def test_the_drawer_of_a_session_longer_than_the_read_limit_opens(kusto_store, monkeypatch):
    """The defect as seen: more sequence.otel (and sequence.context) rows than one read returns."""
    from kusto_replay import NOW

    from aictl.dashboard import session_details
    from aictl.dashboard.projections import history

    seed = kusto_store.insert
    seed("sessions", session_id=SID, tool="copilot-cli", project_path="/p", started_at=NOW - 100, ended_at=NOW - 10)
    for i in range(4):
        seed("requests", session_id=SID, tool="copilot-cli", project_path="/p", ts=NOW - 90 + i, dedup_key=f"c{i}",
             model="m", input_tokens=10 * (i + 1), output_tokens=1, source="transcript")
        seed("events", session_id=SID, tool="copilot-cli", ts=NOW - 90 + i, kind="otel:span", source_key=f"s{i}",
             detail=json.dumps({"span.name": "chat m", "gen_ai.operation.name": "chat",
                                "gen_ai.usage.input_tokens": 10 * (i + 1), "gen_ai.usage.output_tokens": 1}))
    small = 3
    read = history.HistoryScope.read

    def limited(self, view, **kw):
        if view in ("sequence.otel", "sequence.context") and not kw.get("page"):
            kw["limit"] = small
        return read(self, view, **kw)

    monkeypatch.setattr(history.HistoryScope, "read", limited)
    status, body = session_details.agent_detail(kusto_store, SID, None, NOW)
    assert status == 200, body
    assert body["otel"]["totals"]["calls"] == 4
    assert body["context"]["calls"] == 4


# Views that HistoryScope.read reads without page=True and that have no continuation, each with the
# reason its result cannot outgrow the read limit, whatever the length of a session. A view whose rows
# can grow with a session needs after_row (see sequence.flow.kql) instead of an entry here.
BOUNDED = {
    "analytics.memory": "the 20 newest memory files' revisions, a few counts and at most 5000 events",
    "analytics.profiles": "one row per session that started in the window",
    "analytics.requests": "one row per model, a hidden count and the newest page_size requests",
    "analytics.tools": "one row per tool name (and per tool name and CLI tool) and a hidden count",
    "board.activity_facts": "the distinct (tool, fact) pairs",
    "board.history_start": "one row: the earliest session start and the number of sessions",
    "board.agents": "one row per agent of the board's sessions",
    "board.search_hits": "one row per session of the board",
    "board.sessions": "one row per requested session",
    "board.sources": "one row per (tool, source)",
    "index.snapshot": "one row per node: its newest published index breakdown",
    "context.daily": "one row per node, calendar day, model and tool",
    "context.growth": "one row per node and growth bucket (growth_points)",
    "context.telemetry": "one row per node and tool",
    "files.changes": "one row per node and path changed",
    "files.detail": "edit_limit edits and two revisions of one path",
    "files.loaded": "one row per node and requested path",
    "memory.diff": "at most two rows, one per requested content hash",
    "files.session_inventory": "the inventory files of one folder, which no session adds to",
    "insights.after_failure": "one row per tool and outcome, per tool, 10 sessions and one meta row",
    "insights.context_weight": "one row per tool and context bucket, per tool, 10 sessions and one meta row",
    "insights.fixed_context": "one row per tool and kind, per tool, 10 skills, 10 files, 10 sessions and one meta row",
    "insights.problem_sessions": "one row per tool and signal, per tool, 10 pairs, 10 projects, 10 sessions and one meta row",
    "insights.context_carry": "the 25 tool names that carry most, one row per tool, 10 sessions and one meta row",
    "insights.orientation": "10 projects, one row per tool, 10 sessions and one meta row",
    "insights.pause_tax": "one row per tool and pause bucket, per tool, 10 sessions and one meta row",
    "insights.rereads": "two rows per tool, 10 sessions and one meta row",
    "insights.subagents": "two rows per tool, 10 sessions and one meta row",
    "insights.time_split": "two rows per tool, 10 programs, 3 program groups, 10 sessions and one meta row",
    "insights.work_per_instruction": "per tool, a coverage row per tool, one row per tool and bin (at most 26 weeks, or "
                                     "months), 10 sessions and one meta row",
    "insights.verified_commits": "one row per tool, 10 sessions and one meta row",
    "insights.model_report": "per tool, model and effort, 3 failing tool names per model, 3 sessions per tool and one meta row",
    "insights.durations": "one row per repository, 20 tools and programs, 15 models, 10 sessions, a total row and a meta row",
    "insights.repositories": "per repository: one row, a row per model, 3 sessions and at most 9 time bins; one meta row",
    "prompts.detail": "one prompt",
    "prompts.files": "one row per node, prompt file and project",
    "prompts.titles": "one row per agent of the board's sessions",
    "prompts.series": "one row per agent of the board's sessions and grid bucket",
    "requests.cells": "one row per agent of the board's sessions, model and grid bucket",
    "requests.ended": "one row per requested session",
    "requests.error_series": "one row per session, error and grid bucket",
    "requests.latency": "one row per session, model and grid bucket",
    "requests.intervals": "one row per requested interval",
    "requests.models": "one row per model",
    "requests.loop_models": "one row per model of each of at most MAX_LOOP_ROWS loops",
    "runtime.processes": "a total and the 1000 newest processes",
    "runtime.resources": "one row per tool and grid bucket",
    "sequence.evidence_counts": "one row per step kind",
    "sequence.flow_bounds": "one aggregate row",
    "sessions.commit_counts": "one row per requested session",
    "sessions.first_activity": "one aggregate row",
    "sessions.pid_owners": "one row per requested pid",
    "sessions.search": "a count, the facets and one page (page_size) of sessions",
    "skills.agents": "one row per skill name",
    "tools.activity": "one row per agent of the board's sessions and grid bucket",
    "tools.agent_totals": "one row per agent of the board's sessions",
    "tools.confirm_counts": "one row per session, tool name and confirmation value",
    "tools.series": "one row per tool name and grid bucket",
    "thinking.blocks": "the thinking blocks of one model call, or one block",
    "thinking.search": "a total, one row per tool, at most 30 models and 400 days, and one page (page_size, at most 200)",
    "tools.totals": "one row per tool name",
    "usage.sessions": "one row per session",
}


# Functions that pass a view they do not name to a forwarding read, with the reason that is safe.
INDIRECT = {
    "_prefetch": "reads (view, params) pairs early that the board's loaders read again by name",
}


def _unpaged_history_reads():
    """(file, line, view) of each HistoryScope.read in src/aictl without page=True.

    HistoryScope.read takes the view as its only positional argument; a Reader's read takes the view
    and a parameter mapping, and a file's read a size, so the arguments tell them apart. A function
    that passes its own view parameter to such a read (the board's _history_window) is followed to
    its callers. A view that is not named literally has the view None.
    """
    import ast
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent / "src" / "aictl"
    trees = {path.relative_to(root).as_posix(): ast.parse(path.read_text(encoding="utf-8"))
             for path in sorted(root.rglob("*.py"))}

    def unpaged(call):
        page = next((k.value for k in call.keywords if k.arg == "page"), None)
        return not (isinstance(page, ast.Constant) and page.value is True)

    def literal(call):
        arg = call.args[0]
        return arg.value if isinstance(arg, ast.Constant) and isinstance(arg.value, str) else None

    def is_read(node):
        return (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "read"
                and len(node.args) == 1 and (literal(node) is not None or node.keywords))

    def functions(tree):
        return [f for f in ast.walk(tree) if isinstance(f, (ast.FunctionDef, ast.AsyncFunctionDef))]

    forwarders, forwarded = set(), set()
    for tree in trees.values():
        for fn in functions(tree):
            names = {a.arg for a in (*fn.args.posonlyargs, *fn.args.args, *fn.args.kwonlyargs)}
            for call in ast.walk(fn):
                if is_read(call) and unpaged(call) and isinstance(call.args[0], ast.Name) and call.args[0].id in names:
                    forwarders.add(fn.name)
                    forwarded.add(id(call))
    found = []
    for file, tree in trees.items():
        indirect = {id(c) for fn in functions(tree) if fn.name in INDIRECT for c in ast.walk(fn)}
        for call in ast.walk(tree):
            if is_read(call) and unpaged(call) and id(call) not in forwarded:
                found.append((file, call.lineno, literal(call)))
            elif (isinstance(call, ast.Call) and call.args and unpaged(call) and id(call) not in indirect
                  and (call.func.attr if isinstance(call.func, ast.Attribute) else getattr(call.func, "id", None))
                  in forwarders):
                found.append((file, call.lineno, literal(call)))
    return found


def test_every_unpaged_history_read_can_continue_or_is_bounded():
    from importlib.resources import files

    from aictl.stores.kusto import reader

    reads = _unpaged_history_reads()
    assert {"sequence.otel", "sequence.context"} <= {view for _f, _l, view in reads}  # the scan finds them
    problems = []
    for file, line, view in reads:
        if view is None:
            problems.append(f"{file}:{line}: name the view literally, so that this guard can check it")
        elif view not in reader._VIEWS:
            problems.append(f"{file}:{line}: {view} is not a view")
        elif "after_row" not in reader._VIEWS[view][0].split() and view not in BOUNDED:
            problems.append(f"{file}:{line}: {view} is read in full but has no after_row and is not in BOUNDED")
    unpaged = {view for _f, _l, view in reads}
    for view in BOUNDED:
        if view not in unpaged:
            problems.append(f"BOUNDED lists {view}, which no HistoryScope.read reads unpaged")
        elif "after_row" in reader._VIEWS[view][0].split():
            problems.append(f"BOUNDED lists {view}, which can continue")
    for view, (params, _fields) in reader._VIEWS.items():
        if "after_row" in params.split():
            text = (files("aictl.stores.kusto") / "queries" / f"{view}.kql").read_text(encoding="utf-8")
            if view not in reader._PAGED_VIEWS or "_page_cursor" not in text or "cursor_row" not in text:
                problems.append(f"{view} declares after_row but does not return a continuation")
    assert not problems, "\n".join(problems)
