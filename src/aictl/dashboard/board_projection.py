# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Build the board history projection from recorded activity and local runtime evidence."""

from __future__ import annotations

import bisect
import json
import logging
import math
import os
import re
import threading
import time
from collections import defaultdict
from collections.abc import Iterable
from concurrent.futures import Future
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path, PureWindowsPath
from typing import Any

from .. import session_lifecycle
from ..data.model_pricing import canonical_model_id, request_cost_usd, resolve_pricing
from ..data.provenance import CACHE_NOT_REPORTED, NO_LIST_PRICE
from ..ingesters._common import project_key, project_root
from ..tool_scope import is_unattributed, stored_ids_for
from . import subagents
from .analytics import _day_span, _span_outside
from .board_filters import SPARK_POINTS, Filters
from .history_scope import identity, identity_parts
from .history_scope import label as node_label
from .projection_utils import (
    AGENT_SEPARATOR,
    MAX_LIST_ROWS,
    STORED_TITLE_CHARS,
    TITLE_CHARS,
    _as_number,
    _basename,
    _display_folder,
    _is_reported_history,
    _label,
    _ms,
    _names_another_machine,
    _one_line,
    _percentile,
    _proc_field,
    _ratio,
    _session_uuid,
    _short,
    _usd,
    agent_address,
    is_server_tool,
    known_mcp_servers,
    mask_secrets,
    mcp_server_of,
)
from .projections.history import (
    HistoryScope,
    capture_mode,
    exact_values,
    node_scope,
    project_usage,
)
from .runtime_health import _self_section
from .shell_program import is_test_run, run_label
from .skill_inventory import _skill_file

logger = logging.getLogger(__name__)


ACTIVE_WINDOW_S = 900.0


MAX_AGENT_ROWS = 200


MAX_PROMPTS = 100


MAX_LOOP_ROWS = 50


MAX_AGENT_IDS = 50


PROMPT_PREVIEW_CHARS = 240


ACTIVE_STATUSES = ("running", "looping", "waiting")


# Idle: the process is alive or the session is recent, but its turn ended and nothing runs.
LIVE_STATUSES = (*ACTIVE_STATUSES, "idle")


_TURN_ENDED_REASONS = ("end_turn", "stop", "stop_sequence")


IDLE_AFTER_S = 120.0


# The agents list groups rows by status, so a row moves only when its group changes.
STATUS_GROUP = {"running": 0, "looping": 0, "waiting": 1, "idle": 1, "ended": 2, "failed": 2}


MAX_TURN_SAMPLE = 500


MEMO_MAX_KEYS = 8


FACTS_TTL_S = 60.0


# The row limit of one read of call rows. Each further page runs the whole query again.
ACTIVITY_PAGE_ROWS = 100_000


DISK_TTL_S = 60.0


MAX_PROMPT_PROJECTS = 50


MAX_PROMPT_DIR_ENTRIES = 200


MAX_PROMPT_DEPTH = 4


MAX_PROMPT_FILES_PER_ROOT = 500


# Folders below a project or a parent folder of it: (folder, file suffix, tool). Copilot reads
# .github/prompts; Claude Code merged its commands into skills but still reads .claude/commands.
PROMPT_DIRS = (
    (".github/prompts", ".prompt.md", "copilot-vscode"),
    (".claude/commands", ".md", "claude-code"),
    (".cursor/commands", ".md", "cursor"),
    (".windsurf/workflows", ".md", "windsurf"),
)


# Folders in the home folder that hold prompt files for every project.
USER_PROMPT_DIRS = (
    (".claude/commands", ".md"),
)


# Which requests fields a tool does not report at all, so that a 0 means unknown.
_NO_CACHE_WRITE = frozenset({"copilot-vscode"})


_NO_TTFT = frozenset({"claude-code"})


# Processes that serve an app or a tool, and are never an agent at work by themselves.
_SUPPORT_PROCESS_TYPES = frozenset({"helper", "mcp-server", "daemon", "app"})


# A process that an agent started, such as an MCP server. It belongs to that agent and is never one.
_STARTED_BY_AGENT_TYPES = frozenset({"child", "browser", "mcp-server"})


_cost_rates: dict[str, Any] = {}


def _rates_for(model: str):
    if model not in _cost_rates:
        _cost_rates[model] = resolve_pricing(model)[1]
    return _cost_rates[model]


def _list_cost(model: str, i: float, o: float, cr: float, cw: float, ts: float) -> tuple[float | None, float | None]:
    """List-price USD and the amount cache reads saved, for summed token classes."""
    pricing = _rates_for(model)
    if pricing is None:
        return None, None
    rates = pricing.at(ts, 0)
    read_rate = rates.input_per_m if rates.cache_read_per_m is None else rates.cache_read_per_m
    return rates.cost_usd(i, o, cr, cw), cr * (rates.input_per_m - read_rate) / 1e6


def _largest_key(values: dict[str, int] | None) -> str | None:
    """The named key with the largest value."""
    named = [(value, key) for key, value in (values or {}).items() if key]
    return max(named)[1] if named else None


def _process_start(pid: int) -> float:
    """When a process began, or zero when that is not known."""
    try:
        import psutil
    except ImportError:
        return 0.0
    try:
        return float(psutil.Process(pid).create_time())
    except (psutil.Error, OSError, ValueError):
        return 0.0


def _earlier_start(first_seen: float, pid: Any) -> float:
    """The monitor first sees a process when it starts itself, so ask when the process began."""
    began = _process_start(pid) if isinstance(pid, int) and pid > 0 else 0.0
    return min(first_seen, began) if began and first_seen else (began or first_seen)


def _cost_of(
    stored: float | None, model: str, i: float, o: float, cr: float, cw: float, ts: float, known: bool | None = True
) -> float | None:
    """The cost stored per call, which knows the cache tier and speed, or else list price.

    *known* False (a view's ``cost_known``): the calls were stored with no cost because none can be
    known, so they have none here either, never a list price of tokens whose split is not reported.
    """
    if known is False:
        return None
    return stored if stored else _list_cost(model, i, o, cr, cw, ts)[0]


def _long_threshold(model: str) -> int:
    pricing = _rates_for(model)
    return pricing.long_threshold if pricing is not None else 0


_COMMAND_TOOL_RE = re.compile(r"(?i)bash|shell|terminal|powershell|exec_?command|run_?command|execute_?command")


_EDIT_TOOL_RE = re.compile(r"(?i)edit|write|patch|replace|create_?file|insert")


_PIPED_TO_FILTER_RE = re.compile(r"\|\s*(?:tail|head|grep|tee|sed|awk|cut|sort|uniq|wc|less|cat)\b")


def is_test_command(target: str | None) -> bool:
    """True when the program the command runs first is a test runner (shell_program.is_test_run).

    The board, the session detail and the UI read a command by the same rule (drawer/shellCommand.ts):
    ``sed ... && pytest`` first runs sed; ``grep pytest log`` and ``cat pytest.ini`` run no runner.
    """
    return is_test_run(target)


def is_command_tool(name: str | None) -> bool:
    return bool(name and _COMMAND_TOOL_RE.search(name)) and not is_server_tool(name)


def is_edit_tool(name: str | None) -> bool:
    return bool(name and _EDIT_TOOL_RE.search(name)) and not is_server_tool(name)


def _test_failed(is_error: int, exit_code: int | None) -> bool:
    """A test run passed when is_error is 0 and exit_code is 0 or null."""
    return bool(is_error) or exit_code not in (0, None)


@dataclass(slots=True)
class _Call:
    ts: float
    name: str
    target: str
    is_error: int
    exit_code: int | None
    input: str = ""


def find_loops(calls: list[_Call]) -> list[dict]:
    """Loops in the ordered calls of one agent.

    Three or more repeats in a row of the same failing call and target, or of an
    edit then a failing test run. ``at_end`` says the loop reached the last call.
    """
    last = len(calls) - 1
    found: list[dict] = []

    def close(first: int, end: int, repeats: int, pattern: str) -> None:
        if repeats >= 3:
            found.append(
                {
                    "pattern": pattern,
                    "repeats": repeats,
                    "since_ts": calls[first].ts,
                    "until_ts": calls[end].ts,
                    "at_end": end == last,
                }
            )

    def is_test(call: _Call) -> bool:
        return is_command_tool(call.name) and is_test_command(call.target)

    def fails(call: _Call) -> bool:
        return _test_failed(call.is_error, call.exit_code) if is_test(call) else bool(call.is_error)

    # The same failing call and target.
    i = 0
    while i <= last:
        call = calls[i]
        if not fails(call):
            i += 1
            continue
        j = i
        while j < last and fails(calls[j + 1]) and (calls[j + 1].name, calls[j + 1].target, calls[j + 1].input) == (call.name, call.target, call.input):
            j += 1
        close(i, j, j - i + 1, f"{call.name} {_one_line(call.target, 120)} fails".replace("  ", " "))
        i = j + 1

    # An edit, then a failing test run.
    first = None
    repeats = 0
    end = 0
    command = ""
    i = 0
    while i <= last:
        if not is_edit_tool(calls[i].name):
            if repeats:
                close(first, end, repeats, f"edit, then {command} fails")
            first, repeats = None, 0
            i += 1
            continue
        j = i
        while j < last and is_edit_tool(calls[j + 1].name):
            j += 1
        after = calls[j + 1] if j < last else None
        if after is not None and is_test(after) and fails(after):
            first = i if first is None else first
            repeats += 1
            end = j + 1
            command = _one_line(after.target, 120)
            i = j + 2
        else:
            if repeats:
                close(first, end, repeats, f"edit, then {command} fails")
            first, repeats = None, 0
            i = j + 1
    if repeats:
        close(first, end, repeats, f"edit, then {command} fails")
    return found


class _Usage:
    __slots__ = ("calls", "input", "output", "cache_read", "cache_write", "cost", "saved", "errors", "unknown")

    def __init__(self) -> None:
        self.calls = self.input = self.output = self.cache_read = self.cache_write = self.errors = 0
        self.cost: float | None = None
        self.saved: float | None = None
        self.unknown = 0  # tokens of calls whose cost cannot be known (the cost leaves them out)

    def add(self, cell: _Cell) -> None:
        self.calls += cell.n
        self.input += cell.i
        self.output += cell.o
        self.cache_read += cell.cr
        self.cache_write += cell.cw
        self.errors += cell.errs
        if not cell.cost_known:
            self.unknown += cell.i + cell.o + cell.cr + cell.cw
        if cell.cost is not None:
            self.cost = (self.cost or 0.0) + cell.cost
            self.saved = (self.saved or 0.0) + (cell.saved or 0.0)

    @property
    def tokens(self) -> int:
        return self.input + self.output + self.cache_read + self.cache_write

    @property
    def cached_share(self) -> float | None:
        return _ratio(self.cache_read, self.input + self.cache_read + self.cache_write)


@dataclass(slots=True)
class _Cell:
    """One row of the usage cube: requests of an agent and model in one step of the time grid."""

    sid: str
    aid: str
    model: str
    g: int
    tool: str
    project: str
    n: int
    i: int
    o: int
    cr: int
    cw: int
    errs: int
    min_ts: float
    max_ts: float
    last_err_ts: float | None
    timed: int = 0
    longest: float = 0.0
    timed_first: int = 0
    longest_first: float = 0.0
    stored_cost: float = 0.0
    estimated: bool = False
    user: int = 0
    tools_fallback: int = 0
    cost: float | None = None
    saved: float | None = None
    b: int = 0
    s: int = 0
    # The model id as the tool reported and the store keeps it; ``model`` is its canonical id.
    reported: str = ""
    # False: the calls were stored with no cost because none can be known (CACHE_NOT_REPORTED).
    cost_known: bool = True


@dataclass(slots=True)
class _ToolAgg:
    """Tool calls of one agent: a row of the aggregate over tool_invocations."""

    n: int = 0
    errs: int = 0
    asked: int = 0
    denied: int = 0
    pending: int = 0
    min_ts: float = 0.0
    max_ts: float = 0.0
    last_err_ts: float | None = None
    tool: str = ""
    project: str = ""


class _Board:
    """One computation of the board for one set of filters."""

    def __init__(
        self,
        conn: Any,
        filters: Filters,
        now: float,
        snapshot: Any = None,
        only_session: str | None = None,
        facts: dict[str, set[str]] | None = None,
        history: HistoryScope | None = None,
    ) -> None:
        self.conn = conn
        self.f = filters
        self.now = now
        self.snapshot = snapshot
        self.only_session = only_session
        self.history = history or HistoryScope.local(None)
        self.narrowed = filters.narrowed or only_session is not None
        self.b_of = [g * filters.buckets // filters.grid for g in range(filters.grid)]
        self.s_of = [g * SPARK_POINTS // filters.grid for g in range(filters.grid)]
        self.failure_rows: list[tuple] = []
        self.live_sessions: list[dict] = list(getattr(snapshot, "sessions", None) or [])
        self.cells: list[_Cell] = []
        self.tool_agg: dict[tuple[str, str], _ToolAgg] = {}
        self.prompt_agg: dict[tuple[str, str], int] = {}
        self.prompt_rows: list[tuple] = []
        self.meta: dict[str, dict] = {}
        # Subagents by (session id, agent key): an agent id is unique only within its session.
        self.sub_rows: dict[tuple[str, str], dict] = {}
        self.spawns: list[dict] = []
        self.spawn_of: dict[tuple[str, str], dict] = {}
        self.sub_lifecycle: dict[tuple[str, str], tuple[str, str]] = {}
        self.sub_last_line: dict[tuple[str, str], float | None] = {}
        self.session_tool: dict[str, str] = {}
        self.session_project: dict[str, str] = {}
        self.live_by_sid: dict[str, dict] = {}
        self.placeholders: list[dict] = []
        self.pid_cpu: dict[int, float] = {}
        self.pid_memory: dict[int, float] | None = None
        self.test_rows: list[tuple] = []
        # Pending confirmations, one row per call; every confirmation value, counted per session.
        self.confirm_rows: list[tuple] = []
        self.confirm_counts: list[tuple] = []
        self.loops: list[dict] = []
        self.status: dict[str, str] = {}
        self.sub_status: dict[tuple[str, str], str] = {}
        self.lifecycle: dict[str, session_lifecycle.SessionStatus] = {}
        self.process_status: dict[str, session_lifecycle.SessionStatus] = {}
        self.scope: set[str] = set()
        self._prefetched: dict[str, list[dict]] = {}
        facts = facts or {}
        self.facts = facts
        self.tools_with_calls = {tool for tool, kinds in facts.items() if "tool_calls" in kinds}
        self.tools_with_confirms = {tool for tool, kinds in facts.items() if "confirms" in kinds}
        self.tools_with_prompts = {tool for tool, kinds in facts.items() if "prompts" in kinds}

    def _bucket_of(self, ts: float) -> int:
        return max(0, min(self.f.buckets - 1, int((ts - self.f.since) / self.f.bucket_s)))

    def _spark_of(self, ts: float) -> int:
        return max(0, min(SPARK_POINTS - 1, int((ts - self.f.since) / self.f.spark_s)))

    def _history_window(self, view: str, *, grid: bool = False, **params) -> list[dict]:
        keep = params.pop("_prefetch", False)
        key = json.dumps([view, grid, params], sort_keys=True, default=str)
        if not keep and (rows := self._prefetched.pop(key, None)) is not None:
            return rows
        if grid:
            params["grid"] = self.f.grid
        rows = self.history.read(view, sid=self.only_session or "", since=self.f.since, until=self.f.until, **params)
        if keep:
            self._prefetched[key] = rows
        return rows

    def _prefetch(self, reads: list[tuple[str, dict]]) -> None:
        """Read these windows side by side. The loaders then take each result once."""
        _gather(self.conn, [lambda v=view, p=params: self._history_window(v, _prefetch=True, **p) for view, params in reads])

    def _history_series(self, view: str, **params) -> list[dict]:
        if not self.scope:
            return []
        return self.history.read(view, since=self.f.since, until=self.f.until, grid=self.f.grid,
                                 session_keys=self.history.keys(self.scope), **params)

    # ── Loading ────────────────────────────────────────────────

    # The agent detail's board reads its own fallback rows and no confirmation rows.
    _prefetch_fallback = True
    _reads_confirms = True

    def load(self, counts_only: bool = False, *, charts_only: bool = False) -> _Board:
        """Read the window, then apply the filters.

        *counts_only* leaves out the test runs, failures and loops: they change a row's
        status, never its tokens, cost, tool calls or prompts. *charts_only* leaves out
        the confirmation rows, and the loops unless a status filter needs them: no chart
        shows them.

        The reads that need only the window run side by side first; the session rows,
        which need the ids those reads find, run beside the loop search.
        """
        activity = not counts_only
        loops = activity and (not charts_only or self.f.status != "all")
        confirms = self._reads_confirms and not charts_only
        reads: list[tuple[str, dict]] = [
            ("requests.cells", {"grid": True}),
            ("tools.agent_totals", {}),
            ("prompts.series", {"grid": True}),
        ]
        if self._prefetch_fallback:
            reads.append(("usage.sessions", {"without_requests": True}))
        if activity:
            reads += [("tools.activity_rows", {"kind_filter": kind, "limit": ACTIVITY_PAGE_ROWS})
                      for kind in ("tests", "failures")]
        if confirms:
            reads += [("tools.confirm_counts", {}),
                      ("tools.activity_rows", {"kind_filter": "pending", "limit": ACTIVITY_PAGE_ROWS})]
        self._prefetch(reads)
        if activity:
            self._load_tests()
            self._load_failures()
        _gather(self.conn, [self._load_identity, *([self._load_loops] if loops else [])])
        self._price_cells()
        self._match_live()
        if not charts_only:
            self._load_confirms()
        self._prefetched.clear()
        self._assign_status()
        self._apply_filters()
        self._rollup()
        self._index_pending()
        return self

    def _load_identity(self) -> None:
        self._load_cells()
        self._load_fallback_cells()
        self._load_tool_agg()
        self._load_prompt_agg()
        self._load_meta()
        self._resolve_sessions()

    def _load_cells(self) -> None:
        fields = (
            "session_id agent_id model g tool project_path calls input_tokens output_tokens cache_read_tokens "
            "cache_creation_tokens errors first_ts last_ts last_error duration_count max_duration ttft_count max_ttft cost_usd"
        ).split()
        rows = self._history_window("requests.cells", grid=True)
        b_of, s_of = self.b_of, self.s_of
        cells = [_Cell(*(row[k] for k in fields), cost_known=row.get("cost_known") is not False) for row in rows]
        for c in cells:
            c.b, c.s = b_of[c.g], s_of[c.g]
            c.reported, c.model = c.model, canonical_model_id(c.model)
        self.cells = cells

    def _load_fallback_cells(self) -> None:
        self._add_fallback_cells(self._history_window("usage.sessions", without_requests=True))

    def _add_fallback_cells(self, rows: Iterable[dict]) -> None:
        grid_s = (self.f.until - self.f.since) / self.f.grid
        for row in rows:
            for piece in _fallback_pieces(row, self.f.since, self.f.until):
                ts = piece["ts"]
                g = max(0, min(self.f.grid - 1, int((ts - self.f.since) / grid_s)))
                first = True
                for model, usage in piece["models"].items():
                    self.cells.append(
                        _Cell(
                            row["session_id"],
                            "",
                            canonical_model_id(model),
                            g,
                            row["tool"],
                            row["project_path"],
                            usage["requests"],
                            usage["input"],
                            usage["output"],
                            usage["cache_read"],
                            usage["cache_write"],
                            0,
                            row["started_at"] or ts,
                            ts,
                            None,
                            estimated=True,
                            user=row["turn_count"] if first and piece["last"] else 0,
                            tools_fallback=row["tool_call_count"] if first and piece["last"] else 0,
                            b=self.b_of[g],
                            s=self.s_of[g],
                            reported=model,
                        )
                    )
                    first = False

    def _load_tool_agg(self) -> None:
        fields = "calls failures asked denied pending first_ts last_ts last_error tool project_path".split()
        for row in self._history_window("tools.agent_totals"):
            sid, aid = row["session_id"], row["agent_id"]
            self.tool_agg[(sid, _agent_key(sid, aid))] = _ToolAgg(*(row[k] for k in fields))

    def _load_prompt_agg(self) -> None:
        for row in self._history_window("prompts.series", grid=True):
            sid, aid, g, n = (row[k] for k in ("session_id", "agent_id", "g", "prompts"))
            if not aid:
                self.prompt_rows.append((sid, aid, self.b_of[g], self.s_of[g], n, row["tool"], row["project_path"]))
            key = (sid, _agent_key(sid, aid))
            self.prompt_agg[key] = self.prompt_agg.get(key, 0) + n

    def _load_meta(self) -> None:
        ids = {c.sid for c in self.cells}
        ids.update(sid for sid, _ in self.tool_agg)
        ids.update(sid for sid, _ in self.prompt_agg)
        ids.discard("")
        if not ids:
            return
        keys = self.history.keys(ids)
        sessions, agents = _gather(self.conn, [
            lambda: self.history.read("board.sessions", session_keys=keys),
            lambda: self.history.read("board.agents", session_keys=keys),
        ])
        self.meta = {row["session_id"]: row for row in sessions}
        for agent in agents:
            if agent.get("row_kind") == "spawn":
                self.spawns.append(agent)
                continue
            # A long session stays in view, but a subagent that ran outside this time does not.
            last = agent["ended_at"] or (agent["started_at"] if agent["completed"] else None)
            ran_outside = self.only_session is None and (
                (last is not None and last < self.f.since) or (agent["started_at"] or 0.0) > self.f.until
            )
            sid = agent["session_id"]
            if agent["agent_id"] != sid and not ran_outside:
                self.sub_rows[(sid, _agent_key(sid, agent["agent_id"]))] = agent

    def _resolve_sessions(self) -> None:
        """One tool and one project per session; a row with neither takes the session's."""
        tool_seen: dict[str, str] = {}
        project_seen: dict[str, str] = {}
        for c in self.cells:
            if not is_unattributed(c.tool):
                tool_seen.setdefault(c.sid, c.tool)
            if c.project:
                project_seen.setdefault(c.sid, c.project)
        for (sid, _aid), agg in self.tool_agg.items():
            if not is_unattributed(agg.tool):
                tool_seen.setdefault(sid, agg.tool)
            if agg.project:
                project_seen.setdefault(sid, agg.project)
        for sid, _aid, _b, _s, _n, tool, project in self.prompt_rows:
            if not is_unattributed(tool):
                tool_seen.setdefault(sid, tool)
            if project:
                project_seen.setdefault(sid, project)
        for sid in set(tool_seen) | set(project_seen) | set(self.meta):
            meta = self.meta.get(sid) or {}
            meta_tool = meta.get("tool") or ""
            self.session_tool[sid] = meta_tool if not is_unattributed(meta_tool) else tool_seen.get(sid, meta_tool)
            path = meta.get("project_path") or project_seen.get(sid, "")
            self.session_project[sid] = path if self.history.qualified else project_root(path)
        for c in self.cells:
            self.session_tool.setdefault(c.sid, c.tool)
            self.session_project.setdefault(c.sid, c.project)
            if is_unattributed(c.tool):
                c.tool = self.session_tool[c.sid]
            c.project = (c.project if self.history.qualified else project_root(c.project)) or self.session_project[c.sid]

    def _price_cells(self) -> None:
        tiered: dict[str, int] = {}
        for c in self.cells:
            if not c.cost_known:
                c.cost = c.saved = None  # never priced at read time: the stored data cannot give a price
                continue
            c.cost, c.saved = _list_cost(c.model, c.i, c.o, c.cr, c.cw, c.max_ts)
            if c.stored_cost:
                c.cost = c.stored_cost
                continue
            threshold = _long_threshold(c.model)
            if threshold:
                tiered[c.reported] = threshold
        if tiered:
            self._price_long_requests(tiered)

    def _price_long_requests(self, tiered: dict[str, int]) -> None:
        """A request over a prompt-length tier costs more than its tokens at the base rate."""
        fields = "session_id agent_id model g input_tokens output_tokens cache_read_tokens cache_creation_tokens ts".split()
        rows = self._history_window("requests.long", grid=True, requested_models=sorted(tiered), min_tokens=min(tiered.values()))
        if not rows:
            return
        # The rows carry the stored model id, so the cells are found by the id they were read under.
        cells = {(c.sid, c.aid, c.reported, c.g): c for c in self.cells
                 if not c.estimated and not c.stored_cost and c.cost_known}
        for row in rows:
            sid, aid, model, g, i, o, cr, cw, ts = (row[k] for k in fields)
            if i + cr + cw <= tiered[model]:
                continue
            cell = cells.get((sid, aid, model, g))
            if cell is None or cell.cost is None:
                continue
            base = _rates_for(model).at(cell.max_ts, 0).cost_usd(i, o, cr, cw)
            cell.cost += (request_cost_usd(model, i, o, cr, cw, ts=ts) or base) - base

    def _match_live(self) -> None:
        """Merge each live process session into the stored session it belongs to.

        Process sessions come from the monitor under made-up ids. One that matches a
        stored session adds its CPU, memory and pids to that row and makes it running:
        by id, by a known pid link, or by same tool and project at an overlapping time,
        in which case the newest such session takes it. The rest never count as agents.
        """
        if not self.live_sessions:
            return
        first_seen: dict[str, float] = {}
        last_seen: dict[str, float] = {}

        def seen(sid: str, start: float, end: float) -> None:
            if not sid:
                return
            first_seen[sid] = min(first_seen.get(sid, start), start)
            last_seen[sid] = max(last_seen.get(sid, 0.0), end)

        for c in self.cells:
            seen(c.sid, c.min_ts, c.max_ts)
        for (sid, _aid), agg in self.tool_agg.items():
            seen(sid, agg.min_ts, agg.max_ts)
        by_uuid = {u: sid for sid in last_seen if (u := _session_uuid(sid))}
        pid_owner = self._pid_owners(last_seen)
        keys: dict[str, str] = {}

        def key_of(path: str) -> str:
            if path not in keys:
                keys[path] = project_key(path)
            return keys[path]

        newest_first: dict[tuple[str, str], list[str]] = defaultdict(list)
        for sid in sorted(last_seen, key=last_seen.get, reverse=True):
            project = self.session_project.get(sid, "")
            if project:
                newest_first[(self.session_tool.get(sid, ""), key_of(project))].append(sid)

        kinds = self._process_kinds()
        # started_at is when the monitor first saw the process, not when it began, so
        # a session active just before the monitor started still belongs to it.
        began = {
            id(live): _earlier_start(float(live.get("started_at") or 0.0), live.get("root_pid"))
            for live in self.live_sessions
        }

        def overlaps(sid: str, live: dict) -> bool:
            start = began[id(live)]
            end = float(live.get("last_seen_at") or self.now)
            return last_seen[sid] >= min(start, self.now - ACTIVE_WINDOW_S) and first_seen[sid] <= end

        def known_owner(live: dict) -> str | None:
            native = str(live.get("native_session_id") or "")
            if native:
                # The tool's own file names the session of this process: no guess is needed.
                found = native if native in last_seen else by_uuid.get(_session_uuid(native) or "")
                if found:
                    return found
            live_id = str(live.get("session_id") or "")
            if live_id in last_seen:
                return live_id
            sid = by_uuid.get(_session_uuid(live_id) or "")
            if sid:
                return sid
            for pid in [live.get("root_pid"), *(live.get("pids") or [])]:
                sid = pid_owner.get(pid)
                if sid and overlaps(sid, live):
                    return sid
            return None

        claimed: set[str] = set()

        def owner_by_project(live: dict) -> str | None:
            """The newest session here that has no process yet, or else the newest one."""
            tool = str(live.get("tool") or "")
            fallback = None
            pids = [int(p) for p in live.get("pids") or []]
            if pids and all(kinds.get(pid, "") in _STARTED_BY_AGENT_TYPES for pid in pids):
                return None
            for path in [live.get("project"), *(live.get("workspaces") or [])]:
                if not path:
                    continue
                for tool_id in stored_ids_for([tool]) or [tool]:
                    for sid in newest_first.get((tool_id, key_of(path)), ()):
                        if not overlaps(sid, live):
                            continue
                        if not self._takes_live(sid, tool_id, path):
                            return None
                        if sid not in claimed:
                            return sid
                        fallback = fallback or sid
            return fallback

        unmatched: list[dict] = []
        matches = [(live, known_owner(live)) for live in self.live_sessions]
        claimed.update(sid for _live, sid in matches if sid)
        # The processes that started last go first, as the newest session belongs to the newest.
        for live, known in sorted(matches, key=lambda m: began[id(m[0])], reverse=True):
            # A process bound to a session outside this view must not take another session here.
            sid = known or (None if live.get("native_session_id") else owner_by_project(live))
            if sid is None:
                unmatched.append(live)
                continue
            claimed.add(sid)
            merged = self.live_by_sid.setdefault(
                sid, {"pids": set(), "cpu_percent": None, "started_at": None, "matched_by": "project"})
            if known:
                merged["matched_by"] = "evidence"
            if not live.get("ended"):
                merged["pids"].update(int(p) for p in live.get("pids") or [])
                if live.get("native_state") not in (None, "", "unknown"):
                    # What the tool's own session file says this process's session is doing.
                    merged["native_activity"] = live["native_state"]
            elif known and live.get("last_seen_at"):
                # The monitor saw the process exit; the stored end may not be readable yet.
                merged["exited_at"] = max(merged.get("exited_at") or 0.0, float(live["last_seen_at"]))
            if live.get("cpu_percent") is not None:
                merged["cpu_percent"] = round((merged["cpu_percent"] or 0.0) + float(live["cpu_percent"]), 2)
            start = live.get("started_at")
            if start and (merged["started_at"] is None or start < merged["started_at"]):
                merged["started_at"] = start
        if self.only_session is None:
            self._add_placeholders(unmatched)

    def _takes_live(self, sid: str, tool: str, project: str) -> bool:
        """Viewing one session alone: only the tool and project's newest session takes a process."""
        if self.only_session is None:
            return True
        key = project_key(project)
        folded = bool(PureWindowsPath(key).drive)
        node, _ = self.history.split(sid)
        rows = self.history.require_reader().read("requests.live_owner", {
            **node_scope(node), "requested_tool": tool, "project_path_key": key if folded else project,
            "fold_project": folded, "limit": 1,
        }).rows
        return not rows or self.history.identify(rows)[0]["session_id"] == sid

    def _pid_owners(self, sessions: dict[str, float]) -> dict[int, str]:
        pids = {int(p) for live in self.live_sessions for p in live.get("pids") or []}
        pids.update(int(live["root_pid"]) for live in self.live_sessions if live.get("root_pid"))
        owners = {}
        if pids and sessions:
            for row in self.history.read("sessions.pid_owners", pids=sorted(pids), session_keys=self.history.keys(sessions)):
                owners[row["pid"]] = row["session_id"]
        for sid, meta in self.meta.items():
            pid = meta.get("pid")
            if pid in pids and sid in sessions:
                owners[pid] = sid
        return owners

    def _process_kinds(self) -> dict[int, str]:
        kinds: dict[int, str] = {}
        for tool in getattr(self.snapshot, "tools", None) or []:
            for proc in getattr(tool, "processes", None) or []:
                kinds[_proc_field(proc, "pid")] = _proc_field(proc, "process_type") or ""
        return kinds

    def _add_placeholders(self, unmatched: list[dict]) -> None:
        """At most one row per tool and project for a tool process with no session data yet."""
        kinds = self._process_kinds()
        not_agents = _SUPPORT_PROCESS_TYPES | _STARTED_BY_AGENT_TYPES
        groups: dict[tuple[str, str], dict] = {}
        no_project = {"", project_key("/"), project_key(str(Path.home()))}
        for live in unmatched:
            project = str(live.get("project") or "")
            tool = str(live.get("tool") or "")
            pids = [int(p) for p in live.get("pids") or []]
            if not tool or project_key(project) in no_project:
                continue  # a desktop app and its helpers have no project
            # A shell or a helper is not an agent. Only a process that the snapshot knows as the tool is.
            if pids and all(kinds.get(pid, "") in not_agents or (kinds and pid not in kinds) for pid in pids):
                continue
            row = groups.setdefault(
                (tool, project_key(project)),
                {"tool": tool, "project": project, "pids": set(), "cpu_percent": None, "started_at": None},
            )
            row["pids"].update(pids)
            if live.get("cpu_percent") is not None:
                row["cpu_percent"] = round((row["cpu_percent"] or 0.0) + float(live["cpu_percent"]), 2)
            start = live.get("started_at")
            if start and (row["started_at"] is None or start < row["started_at"]):
                row["started_at"] = start
        self.placeholders = sorted(groups.values(), key=lambda g: (g["tool"], g["project"]))

    def _load_tests(self) -> None:
        """Calls that run a test command, with outcome. The prefilter only trims the scan."""
        fields = "session_id agent_id ts tool_name target is_error exit_code duration_ms".split()
        rows = (tuple(row[k] for k in fields) for row in self._history_window(
            "tools.activity_rows", kind_filter="tests", limit=ACTIVITY_PAGE_ROWS))
        known: dict[tuple[str, str], bool] = {}
        kept = []
        for row in rows:
            key = (row[3], row[4])
            hit = known.get(key)
            if hit is None:
                hit = known[key] = is_command_tool(row[3]) and is_test_command(row[4])
            if hit:
                kept.append(row)
        self.test_rows = kept

    def _load_confirms(self) -> None:
        """The confirmation values counted in the cluster, and the pending calls one by one with their target."""
        self.confirm_counts = [
            (row["session_id"], row["tool_name"], row["confirm"], row["calls"], exact_values(row, "waits", "wait_count"))
            for row in self._history_window("tools.confirm_counts")
        ]
        fields = "session_id agent_id tool_name target ts confirm confirm_wait_ms".split()
        self.confirm_rows = [
            tuple(row[k] for k in fields) for row in self._history_window(
                "tools.activity_rows", kind_filter="pending", limit=ACTIVITY_PAGE_ROWS)
        ]

    def _load_failures(self) -> None:
        fields = "session_id agent_id tool_name target result_summary ts".split()
        self.failure_rows = [
            tuple(row[k] for k in fields) for row in self._history_window(
                "tools.activity_rows", kind_filter="failures", limit=ACTIVITY_PAGE_ROWS)
        ]

    def _load_loops(self) -> None:
        repeats: dict[tuple, int] = defaultdict(int)
        for sid, aid, name, target, _summary, _ts in self.failure_rows:
            repeats[(sid, aid, name, target)] += 1
        candidates = {key[0] for key, n in repeats.items() if n >= 3}
        failing: dict[tuple[str, str], int] = defaultdict(int)
        for sid, aid, _ts, _name, _target, is_error, exit_code, _dur in self.test_rows:
            if _test_failed(is_error, exit_code):
                failing[(sid, aid)] += 1
        candidates.update(sid for (sid, _aid), n in failing.items() if n >= 3)
        if not candidates:
            return
        streams: dict[tuple[str, str], list[_Call]] = defaultdict(list)
        fields = "session_id agent_id ts tool_name target is_error exit_code input_signature".split()
        for row in self._history_window("tools.activity_rows", kind_filter="loops", limit=ACTIVITY_PAGE_ROWS,
                                        session_keys=self.history.keys(candidates)):
            sid, aid, ts, name, target, is_error, exit_code, call_input = (row[k] for k in fields)
            streams[(sid, _agent_key(sid, aid))].append(_Call(ts, name, target or "", is_error, exit_code, call_input or ""))
        for (sid, agent), calls in streams.items():
            for loop in find_loops(calls):
                self.loops.append({**loop, "session_id": sid, "agent_id": agent})
        self.loops.sort(key=lambda loop: loop["since_ts"], reverse=True)

    def _sessions_with_ended_turn(self, last_activity: dict[str, float]) -> set[str]:
        """Sessions quiet for a while whose main agent last finished its turn."""
        quiet = [
            sid for sid, ts in last_activity.items() if IDLE_AFTER_S <= self.now - ts < ACTIVE_WINDOW_S
        ]
        if not quiet:
            return set()
        return {r["session_id"] for r in self.history.read("requests.ended", session_keys=self.history.keys(quiet))}

    def _assign_status(self) -> None:
        self.sub_lifecycle, self.sub_last_line = {}, {}
        last_activity: dict[str, float] = {}
        last_call: dict[tuple[str, str], float] = {}
        last_err: dict[tuple[str, str], float] = {}

        def note(sid: str, agent: str, ts: float, err: float | None) -> None:
            last_activity[sid] = max(last_activity.get(sid, 0.0), ts)
            if ts > last_call.get((sid, agent), 0.0):
                last_call[(sid, agent)] = ts
            if err is not None and err > last_err.get((sid, agent), 0.0):
                last_err[(sid, agent)] = err

        for c in self.cells:
            note(c.sid, _agent_key(c.sid, c.aid), c.max_ts, c.last_err_ts)
        for (sid, agent), agg in self.tool_agg.items():
            note(sid, agent, agg.max_ts, agg.last_err_ts)
        self.last_activity = last_activity

        def last_failed(sid: str, agents: Iterable[str]) -> bool:
            ends = [(last_call.get((sid, a), 0.0), last_err.get((sid, a), 0.0)) for a in agents]
            when = max((call for call, _ in ends), default=0.0)
            return bool(when) and any(err == when for _, err in ends)

        pending_by_root: dict[str, int] = defaultdict(int)
        agents_by_root: dict[str, set[str]] = defaultdict(set)
        for (sid, agent), agg in self.tool_agg.items():
            pending_by_root[sid] += agg.pending
            agents_by_root[sid].add(agent)
        for c in self.cells:
            agents_by_root[c.sid].add(_agent_key(c.sid, c.aid))
        for sid, agent in self.prompt_agg:
            agents_by_root[sid].add(agent)
        for sid, agent in self.sub_rows:
            agents_by_root[sid].add(agent)
        for sid in self.live_by_sid:
            agents_by_root[sid].add(sid)

        looping_at_end = {(loop["session_id"], loop["agent_id"]) for loop in self.loops if loop["at_end"]}
        roots_looping = {sid for sid, _ in looping_at_end}

        turn_ended = self._sessions_with_ended_turn(last_activity)
        for sid, agents in agents_by_root.items():
            if not sid:
                continue
            meta = self.meta.get(sid) or {}
            live = self.live_by_sid.get(sid) or {}
            seen = max(last_activity.get(sid, 0.0), float(meta.get("last_activity_at") or 0.0))
            ended_at, end_reason = meta.get("ended_at"), str(meta.get("end_reason") or "")
            if live.get("exited_at") and not session_lifecycle.ended_by_fact(ended_at, end_reason, seen):
                ended_at, end_reason = live["exited_at"], session_lifecycle.PROCESS_EXIT
            decided = dict(
                now=self.now, native_activity=live.get("native_activity"), last_activity=seen, ended_at=ended_at,
                end_reason=end_reason, matched_by=live.get("matched_by", ""), idle_window=ACTIVE_WINDOW_S,
                pending=bool(pending_by_root[sid]), looping=sid in roots_looping, turn_ended=sid in turn_ended,
                failed=last_failed(sid, agents),
            )
            lifecycle = session_lifecycle.session_status(pids=live.get("pids") or (), **decided)
            self.lifecycle[sid] = lifecycle
            # The status this history gives once the runtime report shows the session's process.
            self.process_status[sid] = session_lifecycle.session_status(assume_process=True, **decided)
            active = lifecycle.live
            self.status[sid] = lifecycle.status
            for agent in agents:
                if agent == sid:
                    continue
                sub = self.sub_rows.get((sid, agent)) or {}
                agg = self.tool_agg.get((sid, agent))
                # The subagent's own transcript says when it last wrote, not its parent's.
                lines = (sub.get("ended_at"), sub.get("last_call_ts"), last_call.get((sid, agent)), agg.max_ts if agg else None)
                last_line = max((float(ts) for ts in lines if ts), default=None)
                status, words, reason = subagents.subagent_status(
                    now=self.now, parent_live=active, parent_evidence=lifecycle.evidence,
                    parent_end_reason=lifecycle.end_reason, sub=sub, last_line=last_line,
                    pending=bool(agg is not None and agg.pending), looping=(sid, agent) in looping_at_end,
                    failed=last_failed(sid, [agent]), idle_window=ACTIVE_WINDOW_S,
                )
                self.sub_status[(sid, agent)] = status
                self.sub_lifecycle[(sid, agent)] = (words, reason)
                self.sub_last_line[(sid, agent)] = last_line
        self.agents_by_root = agents_by_root

    def _apply_filters(self) -> None:
        f = self.f
        # Facts for the option lists: the time range, before any filter.
        self.all_cells = self.cells
        selected = set(stored_ids_for(f.tools)) if f.tools is not None else None
        model = canonical_model_id(f.model)

        def tool_ok(tool: str) -> bool:
            return selected is None or tool in selected

        cells = [
            c
            for c in self.cells
            if tool_ok(c.tool) and f.matches_project(c.project) and (not f.model or c.model == model)
        ]
        with_cells = {c.sid for c in cells}
        scope: set[str] = set()
        all_cell_sids = {c.sid for c in self.cells}
        for sid in self.agents_by_root:
            if not sid:
                continue
            if sid in with_cells:
                scope.add(sid)
            elif sid in all_cell_sids:
                continue  # its usage was all filtered out
            elif (
                tool_ok(self.session_tool.get(sid, ""))
                and f.matches_project(self.session_project.get(sid, ""))
                and not f.model
            ):
                scope.add(sid)
        if f.status != "all":
            allowed = LIVE_STATUSES if f.status == "active" else (f.status,)
            if f.runtime_statuses is None:
                scope = {sid for sid in scope if self.status.get(sid) in allowed}
            else:
                current = dict(f.runtime_statuses)
                scope = {sid for sid in scope if current.get(sid, current.get(_session_uuid(sid) or "")) in allowed}
        if f.q:
            scope &= self._matching_q(scope)
        self.scope = scope
        self.cells = [c for c in cells if c.sid in scope]
        self.visible_loops = [loop for loop in self.loops if loop["session_id"] in scope]

    def model_spellings(self) -> list[str]:
        """The stored model ids the Model filter stands for, or ``[""]`` with no filter.

        The chosen id and every spelling of its canonical id in the time range. A view that
        filters by one stored id is read once for each, so the filter matches every tool's
        spelling of the model and the query of a model with one spelling stays the same.
        """
        if not self.f.model:
            return [""]
        model = canonical_model_id(self.f.model)
        return sorted({self.f.model, *(c.reported for c in self.all_cells if c.model == model)})

    def _matching_q(self, scope: set[str]) -> set[str]:
        needle = self.f.q.lower()
        hits: set[str] = set()
        models: dict[str, set[str]] = defaultdict(set)
        for c in self.all_cells:
            models[c.sid].update((c.model, c.reported))
        roles: dict[str, list[str]] = defaultdict(list)
        for (sid, agent), sub in self.sub_rows.items():
            roles[sid].extend([agent, sub.get("task") or ""])
        for sid in scope:
            haystack = [sid, self.session_tool.get(sid, ""), self.session_project.get(sid, ""), *models[sid], *roles[sid]]
            if any(needle in (value or "").lower() for value in haystack):
                hits.add(sid)
        if scope:
            hits.update(r["session_id"] for r in self.history.read(
                "board.search_hits", since=self.f.since, until=self.f.until, session_keys=self.history.keys(scope),
                search_text=self.f.q, extended=self.history.qualified,
            ))
        return hits

    # ── Rollups ────────────────────────────────────────────────

    def _rollup(self) -> None:
        n = self.f.buckets
        self.total = _Usage()
        self.by_key: dict[tuple[str, str], _Usage] = defaultdict(_Usage)
        self.by_root: dict[str, _Usage] = defaultdict(_Usage)
        self.by_model: dict[str, _Usage] = defaultdict(_Usage)
        self.by_project: dict[str, _Usage] = defaultdict(_Usage)
        self.by_tool: dict[str, _Usage] = defaultdict(_Usage)
        self.model_agents: dict[str, set[str]] = defaultdict(set)
        self.agent_models: dict[str, set[str]] = defaultdict(set)
        self.agent_model_tokens: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.model_tools: dict[str, set[str]] = defaultdict(set)
        self.first_ts: dict[tuple[str, str], float] = {}
        self.last_ts: dict[tuple[str, str], float] = {}
        self.activity: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0] * SPARK_POINTS)
        self.bucket = [_Usage() for _ in range(n)]
        self.spark = [_Usage() for _ in range(SPARK_POINTS)]
        self.spark_sessions: list[set[str]] = [set() for _ in range(SPARK_POINTS)]
        self.cost_by_tool: dict[str, list] = defaultdict(lambda: [None] * n)
        self.cost_by_project: dict[str, list] = defaultdict(lambda: [None] * n)
        self.cost_by_model: dict[str, list] = defaultdict(lambda: [None] * n)
        self.estimated: set[str] = set()
        # Tokens with no cost, by model and why: the model has no list price, or the source does not
        # report what a price needs.
        self.unpriced: dict[tuple[str, str], int] = {}
        self.fallback_user: dict[str, int] = {}
        self.fallback_tools: dict[str, int] = {}
        self.fallback_tool_buckets = [0] * n
        self.fallback_user_buckets = [0] * n

        for c in self.cells:
            agent = _agent_key(c.sid, c.aid)
            key = (c.sid, agent)
            self.by_key[key].add(c)
            self.by_root[c.sid].add(c)
            self.by_model[c.model].add(c)
            self.by_project[c.project].add(c)
            self.by_tool[c.tool].add(c)
            self.bucket[c.b].add(c)
            self.spark[c.s].add(c)
            self.total.add(c)
            self.spark_sessions[c.s].add(c.sid)
            self.model_agents[c.model].add(agent)
            self.model_tools[c.model].add(c.tool)
            self.agent_models[agent].add(c.model)
            self.agent_model_tokens[agent][c.model] += c.i + c.o + c.cr + c.cw
            self.activity[key][c.s] += c.n
            if key not in self.first_ts or c.min_ts < self.first_ts[key]:
                self.first_ts[key] = c.min_ts
            if c.max_ts > self.last_ts.get(key, 0.0):
                self.last_ts[key] = c.max_ts
            if c.cost is None and (c.i or c.o or c.cr or c.cw):
                # No cost that can be known, or no list rate for the model: the cost total leaves these tokens out.
                why = (c.model, NO_LIST_PRICE if c.cost_known else CACHE_NOT_REPORTED)
                self.unpriced[why] = self.unpriced.get(why, 0) + c.i + c.o + c.cr + c.cw
            if c.cost is not None:
                for series, name in (
                    (self.cost_by_tool, c.tool),
                    (self.cost_by_project, c.project),
                    (self.cost_by_model, c.model),
                ):
                    arr = series[name]
                    arr[c.b] = (arr[c.b] or 0.0) + c.cost
            if c.estimated:
                self.estimated.add(c.sid)
                self.fallback_user[c.sid] = self.fallback_user.get(c.sid, 0) + c.user
                self.fallback_tools[c.sid] = self.fallback_tools.get(c.sid, 0) + c.tools_fallback
                self.fallback_user_buckets[c.b] += c.user
                self.fallback_tool_buckets[c.b] += c.tools_fallback

        self.tool_order = [t for t, _ in sorted(self.by_tool.items(), key=lambda kv: (-kv[1].tokens, -kv[1].calls, kv[0]))]

    # ── Per-agent numbers, null when the tool cannot supply them ──

    def _agent_tool_calls(self, sid: str, agent: str | None) -> tuple[int | None, int | None]:
        """Tool calls and failures of one agent, or of the session with subagents when agent is None."""
        if agent is None:
            aggs = [self.tool_agg[(sid, a)] for a in self.agents_by_root.get(sid, ()) if (sid, a) in self.tool_agg]
        else:
            aggs = [self.tool_agg[(sid, agent)]] if (sid, agent) in self.tool_agg else []
        if aggs:
            return sum(a.n for a in aggs), sum(a.errs for a in aggs)
        fallback = self.fallback_tools.get(sid) if agent in (None, sid) else None
        if fallback:
            return fallback, None
        if sid in self.estimated:
            return None, None
        if self.session_tool.get(sid, "") in self.tools_with_calls:
            return 0, 0
        return None, None

    def _agent_confirms(self, sid: str, agent: str | None) -> tuple[int | None, int | None]:
        if self.session_tool.get(sid, "") not in self.tools_with_confirms:
            return None, None
        keys = self.agents_by_root.get(sid, ()) if agent is None else (agent,)
        aggs = [self.tool_agg[(sid, a)] for a in keys if (sid, a) in self.tool_agg]
        return sum(a.asked for a in aggs), sum(a.denied for a in aggs)

    def _agent_user_msgs(self, sid: str, agent: str | None) -> int | None:
        total = self.prompt_agg.get((sid, sid if agent is None else agent), 0)
        if total:
            return total
        fallback = self.fallback_user.get(sid) if agent in (None, sid) else None
        if fallback:
            return fallback
        if sid in self.estimated:
            return None
        return 0 if self.session_tool.get(sid, "") in self.tools_with_prompts else None

    def _titles(self, keys: Iterable[tuple[str, str]]) -> dict[tuple[str, str], str]:
        """First prompt of each agent, or the session's label."""
        keys = list(keys)
        if not keys:
            return {}
        rows = self.history.read("prompts.titles", session_keys=self.history.keys(sid for sid, _ in keys))
        return self._format_titles(keys, {(r["session_id"], _agent_key(r["session_id"], r["agent_id"])): r["text"] for r in rows})

    def agent_kind(self, sid: str, agent: str) -> str:
        """The kind of a subagent for the role table: an agent type, never its prompt."""
        if not getattr(self, "spawn_of", None):
            subs = {key: row for key, row in self.sub_rows.items() if row.get("row_kind") != "spawn"}
            self.spawn_of = subagents.match_spawns(subs, getattr(self, "spawns", ()))
        return subagents.subagent_kind(self.sub_rows.get((sid, agent)) or {}, self.spawn_of.get((sid, agent)))

    def _format_titles(self, keys: Iterable[tuple[str, str]], firsts: dict[tuple[str, str], str]) -> dict[tuple[str, str], str]:
        """Each row's name. A session keeps its stored title; a subagent is named by its task, never its prompt."""
        sub_rows = getattr(self, "sub_rows", {})
        spawns = getattr(self, "spawns", None) or [r for r in sub_rows.values() if r.get("row_kind") == "spawn"]
        subs = {key: row for key, row in sub_rows.items() if row.get("row_kind") != "spawn"}
        self.spawn_of = subagents.match_spawns(subs, spawns)
        self.name_meta: dict[tuple[str, str], dict] = {}
        titles = {}
        for sid, agent in keys:
            text = firsts.get((sid, agent))
            meta = (getattr(self, "meta", {}).get(sid) or {}) if agent == sid else {}
            stored = meta.get("title")
            if agent != sid:
                sub = subs.get((sid, agent)) or {}
                titles[(sid, agent)], source = subagents.subagent_name(
                    sub, self.spawn_of.get((sid, agent)), _short(agent), text or sub.get("task"),
                    task_is_prompt=self.session_tool.get(sid, "") == "claude-code")
            elif stored:
                titles[(sid, agent)] = _one_line(stored, STORED_TITLE_CHARS)
                source = meta.get("title_source") or "stored title"
            elif text:
                titles[(sid, agent)] = _one_line(text, TITLE_CHARS)
                source = "first prompt"
            else:
                tool = _label(self.session_tool.get(sid, ""))
                project = _basename(self.session_project.get(sid, ""))
                titles[(sid, agent)] = " · ".join(part for part in (tool, project) if part) or _short(sid)
                source = "tool and project"
            prompt = text or ((subs.get((sid, agent)) or {}).get("task") if agent != sid else None)
            self.name_meta[(sid, agent)] = {"name_source": source, "prompt_line": subagents.prompt_line(prompt)}
        return titles

    def _agent_row(self, sid: str, agent: str, title: str, activity: list[int]) -> dict:
        root = agent == sid
        usage = self.by_root.get(sid) if root else self.by_key.get((sid, agent))
        calls, failures = self._agent_tool_calls(sid, None if root else agent)
        asked, denied = self._agent_confirms(sid, None if root else agent)
        user = self._agent_user_msgs(sid, None if root else agent)
        tool = self.session_tool.get(sid, "")
        # No status was decided for this row: say so rather than call it ended.
        status = self.status.get(sid, "unknown") if root else self.sub_status.get((sid, agent), "unknown")
        meta = self.meta.get(sid) or {}
        sub = self.sub_rows.get((sid, agent)) or {}
        spawn = getattr(self, "spawn_of", {}).get((sid, agent)) or {}
        live = self.live_by_sid.get(sid) if root else None
        active = status in LIVE_STATUSES
        keys = self.agents_by_root.get(sid, ()) if root else (agent,)
        firsts = [self.first_ts[(sid, a)] for a in keys if (sid, a) in self.first_ts]
        firsts += [self.tool_agg[(sid, a)].min_ts for a in keys if (sid, a) in self.tool_agg]
        known_start = meta.get("started_at") if root else sub.get("started_at")
        started = known_start or (min(firsts) if firsts else None)
        if root and live is not None and not started:
            started = live.get("started_at")
        ended = None
        if not active:
            lasts = [self.last_ts.get((sid, a), 0.0) for a in keys]
            lasts += [self.tool_agg[(sid, a)].max_ts for a in keys if (sid, a) in self.tool_agg]
            ended = (meta.get("ended_at") if root else sub.get("ended_at")) or (max(lasts) if lasts else None)
        models = sorted({m for a in keys for m in self.agent_models.get(a, ()) if m})
        pending = self._pending_of(sid, None if root else agent) if active else None
        cache_write: int | None = usage.cache_write if usage else None
        if tool in _NO_CACHE_WRITE and not cache_write:
            cache_write = None
        row = {
            "id": agent,
            "short": _short(agent),
            "title": title,
            "parent_id": None if root else sid,
            "role": "Main agent" if root else (spawn.get("agent_type") or None),
            "status": status,
            "tool": tool,
            "project": self.session_project.get(sid, ""),
            "models": models,
            "primary_model": _largest_key(self.agent_model_tokens.get(agent)),
            "msgs": {"user": user, "assistant": (usage.calls or None) if root and sid in self.estimated else usage.calls if usage else None, "tool": calls},
            "input": usage.input if usage else None,
            "output": usage.output if usage else None,
            "cache_read": usage.cache_read if usage else None,
            "cache_write": cache_write,
            "cached_share": usage.cached_share if usage else None,
            "cost_usd": _usd(usage.cost) if usage else None,
            # Set when calls of the row have no cost that can be known: the cost leaves them out.
            "cost_reason": CACHE_NOT_REPORTED if usage and usage.unknown else None,
            "tool_calls": calls,
            "failures": failures,
            "confirms_asked": asked,
            "confirms_denied": denied,
            "pending": pending,
            "cpu_percent": None,
            "mem_mb": None,
            "pids": [],
            "started_at": started,
            "ended_at": ended,
            "activity": activity,
            **self._status_evidence(sid, root, sub, active, agent),
            **self._identity_fields(sid, agent, sub, spawn, status, root),
        }
        if root and sid in self.estimated:
            row["estimated"] = True
        if _is_reported_history(self.conn) and (parts := identity_parts(sid)):
            row.update(node_id=node_label(parts[0]), session_id=sid)
        if live is not None:
            pids = sorted(live["pids"])
            row["mem_mb"] = _mem_of(self._pid_memory(), pids)
            # The per-process sample is current; the session figure lags and often reads 0.
            sampled = _mem_of(self.pid_cpu, pids)
            row["cpu_percent"] = sampled if sampled is not None else live["cpu_percent"]
            row["pids"] = pids
        return row

    def _status_evidence(self, sid: str, root: bool, sub: dict, active: bool, agent: str = "") -> dict:
        """Why the row has its status, in a few words, and the kind of end (empty while live)."""
        if not root:
            key = (sid, agent or _agent_key(sid, sub.get("agent_id")))
            words, reason = getattr(self, "sub_lifecycle", {}).get(key, (None, ""))
            return {"status_evidence": words, "end_reason": reason}
        lifecycle = self.lifecycle.get(sid)
        if lifecycle is None:
            return {"status_evidence": None, "end_reason": "", "status_basis": None, "process_status": None}
        once = getattr(self, "process_status", {}).get(sid)
        return {
            "status_evidence": lifecycle.evidence, "end_reason": lifecycle.end_reason, "status_basis": lifecycle.basis,
            # The status once the runtime report shows this session's process, with its activity words.
            "process_status": {"status": once.status, "activity": once.activity, "basis": once.basis} if once else None,
        }

    def _identity_fields(self, sid: str, agent: str, sub: dict, spawn: dict, status: str, root: bool) -> dict:
        """What the row is: its kind, where its name came from, its type and models, and its subagents."""
        names = getattr(self, "name_meta", {}).get((sid, agent)) or {}
        fields: dict[str, Any] = {
            "kind": "main" if root else "subagent",
            "name_source": names.get("name_source"),
            "prompt_line": names.get("prompt_line"),
        }
        if root:
            meta = self.meta.get(sid) or {}
            seen = [self.last_activity.get(sid), meta.get("last_activity_at")] if hasattr(self, "last_activity") else []
            members = [a for a in self.agents_by_root.get(sid, ()) if a != sid]
            own = self.by_key.get((sid, sid))
            own_calls, own_failures = self._agent_tool_calls(sid, sid) if members else (None, None)
            fields.update(
                last_activity_at=max((float(ts) for ts in seen if ts), default=None),
                now=None,
                subagent_count=len(members),
                subagents_running=sum(1 for a in members if self.sub_status.get((sid, a)) in ACTIVE_STATUSES),
                subagents_live=sum(1 for a in members if self.sub_status.get((sid, a)) in LIVE_STATUSES),
                # The row's usage is the whole session: the main agent and every subagent. These are the main agent alone.
                main_input=own.input if own else None,
                main_output=own.output if own else None,
                main_cost_usd=_usd(own.cost) if own else None,
                main_tool_calls=own_calls,
                main_failures=own_failures,
                includes_subagents=bool(members),
            )
            return fields
        alias = spawn.get("spawn_model") or None
        resolved = sub.get("resolved_model") or sub.get("model") or _largest_key(self.agent_model_tokens.get(agent)) or None
        fields.update(
            agent_type=spawn.get("agent_type") or None,
            model_alias=alias,
            resolved_model=resolved,
            description=spawn.get("description") or sub.get("description") or None,
            spawned_at=spawn.get("started_at"),
            spawned_by=(spawn.get("spawned_by") or sub.get("parent_agent_id") or None),
            last_activity_at=getattr(self, "sub_last_line", {}).get((sid, agent)),
            now=subagents.now_text(sub, status),
        )
        return fields

    def _pid_memory(self) -> dict[int, float]:
        if self.pid_memory is None:
            self.pid_memory = {}
            self.pid_cpu = {}
            for tool in getattr(self.snapshot, "tools", None) or []:
                for proc in getattr(tool, "processes", None) or []:
                    value = _as_number(_proc_field(proc, "mem_mb"))
                    if value is not None:
                        self.pid_memory[_proc_field(proc, "pid")] = value
                    cpu = _as_number(_proc_field(proc, "cpu_pct"))
                    if cpu is not None:
                        self.pid_cpu[_proc_field(proc, "pid")] = cpu
        return self.pid_memory

    def _placeholder_rows(self, room: int) -> list[dict]:
        """Rows for tool processes with no session data. They sort last and count in no total."""
        f = self.f
        if f.model or f.status not in ("all", "active", "running") or room <= 0:
            return []
        selected = set(stored_ids_for(f.tools)) if f.tools is not None else None
        rows = []
        for group in self.placeholders:
            tool, project = group["tool"], group["project"]
            if selected is not None and tool not in selected:
                continue
            if not f.matches_project(project):
                continue
            label = _label(tool)
            if f.q and not any(f.q.lower() in text.lower() for text in (tool, label, project)):
                continue
            pids = sorted(group["pids"])
            row_id = f"live:{tool}:{project}"
            rows.append(
                {
                    "id": row_id,
                    "short": _short(tool),
                    "title": f"{label}, no session data yet",
                    "parent_id": None,
                    "role": None,
                    # A process with no stored line yet: its activity is unknown, not assumed.
                    "status": session_lifecycle.session_status(now=self.now, pids=pids).status,
                    "tool": tool,
                    "project": project,
                    "models": [],
                    "msgs": {"user": None, "assistant": None, "tool": None},
                    "input": None,
                    "output": None,
                    "cache_read": None,
                    "cache_write": None,
                    "cached_share": None,
                    "cost_usd": None,
                    "tool_calls": None,
                    "failures": None,
                    "confirms_asked": None,
                    "confirms_denied": None,
                    "pending": None,
                    "cpu_percent": group["cpu_percent"],
                    "mem_mb": _mem_of(self._pid_memory(), pids),
                    "pids": pids,
                    "started_at": group["started_at"],
                    "ended_at": None,
                    "activity": [0] * SPARK_POINTS,
                    "status_evidence": f"{session_lifecycle.process_words(pids)}; no session record yet" if pids
                    else "no session record yet",
                    "end_reason": "",
                    "placeholder": True,
                }
            )
        return rows[:room]

    def _pending_of(self, sid: str, agent: str | None) -> dict | None:
        agg_rows = self.pending_rows.get(sid, [])
        for row in agg_rows:
            if agent is None or row["agent_key"] == agent:
                return {"name": row["name"], "target": _one_line(row["target"], 300), "since_ts": row["since_ts"]}
        return None

    def _index_pending(self) -> None:
        """Pending confirmations in the filtered sessions, newest first, per session."""
        self.pending_rows: dict[str, list[dict]] = defaultdict(list)
        pending = [row for row in self.confirm_rows if row[5] == "pending" and row[0] in self.scope]
        pending.sort(key=lambda row: row[4], reverse=True)
        for sid, aid, name, target, ts, _confirm, _wait in pending:
            self.pending_rows[sid].append(
                {"agent_key": _agent_key(sid, aid), "name": name, "target": _one_line(target, 300), "since_ts": ts}
            )

    def _start_of(self, sid: str, agent: str) -> float | None:
        """When a session or a subagent started, from its own record, else its first recorded activity."""
        if agent == sid:
            known = (self.meta.get(sid) or {}).get("started_at")
            keys = self.agents_by_root.get(sid, ())
        else:
            known = (self.sub_rows.get((sid, agent)) or {}).get("started_at")
            keys = (agent,)
        if known:
            return float(known)
        firsts = [self.first_ts[(sid, a)] for a in keys if (sid, a) in getattr(self, "first_ts", {})]
        firsts += [self.tool_agg[(sid, a)].min_ts for a in keys if (sid, a) in self.tool_agg]
        if not firsts and agent == sid:
            live = self.live_by_sid.get(sid) or {}
            firsts = [live["started_at"]] if live.get("started_at") else []
        return min(firsts) if firsts else None

    def _ordered_agent_keys(self) -> list[tuple[str, str]]:
        """Sessions by status group, then newest start first; each session's subagents in spawn order.

        Nothing here reads the last activity time, which changes on every refresh: a row moves only
        when its status group changes. Roots always fit before any subagent.
        """

        def sort_key(sid: str) -> tuple[int, float, str]:
            started = self._start_of(sid, sid)
            return (STATUS_GROUP.get(self.status.get(sid, ""), len(STATUS_GROUP)), -(started or 0.0), sid)

        roots = sorted(self.scope, key=sort_key)
        shown = roots[:MAX_AGENT_ROWS]
        room = MAX_AGENT_ROWS - len(shown)
        subs: dict[str, list[str]] = defaultdict(list)
        for sid in shown:
            if room <= 0:
                break
            members = sorted(
                (a for a in self.agents_by_root.get(sid, ()) if a != sid),
                key=lambda a, sid=sid: (self._start_of(sid, a) or math.inf, a),
            )
            subs[sid] = members[:room]
            room -= len(subs[sid])
        keys: list[tuple[str, str]] = []
        for sid in shown:
            keys.append((sid, sid))
            keys.extend((sid, a) for a in subs[sid])
        return keys

    def agents(self) -> list[dict]:
        keys = self._ordered_agent_keys()
        activity = self._activity_for(keys)
        titles = self._titles(keys)
        self.titles = titles
        rows = [self._agent_row(sid, agent, titles[(sid, agent)], activity[(sid, agent)]) for sid, agent in keys]
        return rows + self._placeholder_rows(MAX_AGENT_ROWS - len(rows))

    def _activity_for(self, keys: list[tuple[str, str]]) -> dict[tuple[str, str], list[int]]:
        """Model calls and tool calls per spark bucket for the rows that are shown."""
        result: dict[tuple[str, str], list[int]] = {}
        sids = sorted({sid for sid, _ in keys})
        for sid, agent in keys:
            members = self.agents_by_root.get(sid, ()) if sid == agent else (agent,)
            line = [0] * SPARK_POINTS
            for member in members:
                own = self.activity.get((sid, member))
                if own:
                    line = [x + y for x, y in zip(line, own)]
            result[(sid, agent)] = line
        if not sids:
            return result
        rows = self.history.read(
            "tools.activity", since=self.f.since, until=self.f.until, grid=self.f.grid,
            session_keys=self.history.keys(sids),
        )
        for row in rows:
            sid, aid, s, n = row["session_id"], row["agent_id"], self.s_of[row["g"]], row["calls"]
            agent = _agent_key(sid, aid)
            if (sid, sid) in result:
                result[(sid, sid)][s] += n
            if agent != sid and (sid, agent) in result:
                result[(sid, agent)][s] += n
        return result


def _agent_key(sid: str, aid: str | None) -> str:
    """A row's agent: the session id for the main agent, ``<session>/<agent>`` for a subagent.

    An agent id is unique only within its session (a resumed session copies its subagents), so
    a subagent's row id, route and ``?agent=`` link always carry its session. In a node-qualified
    history both ids are qualified; the address is qualified once, with the session's node.
    """
    if not aid or aid == sid:
        return sid
    session, agent = identity_parts(sid), identity_parts(aid)
    if session and agent:
        return identity(session[0], agent_address(session[1], agent[1]))
    return agent_address(sid, aid)


def _mem_of(memory: dict[int, float], pids: list[int]) -> float | None:
    values = [memory[pid] for pid in pids if pid in memory]
    return round(sum(values), 1) if values else None


def _fallback_rows(history: HistoryScope, since: float, until: float, only_session: str | None = None, *,
                   session_keys: list[str] | None = None) -> list[dict]:
    """Sessions with usage in session_usage and no requests row at all, active in the window.

    A session that spans the window is included: ``_fallback_pieces`` places each
    of its days in the window or leaves it out.
    """
    return history.read("usage.sessions", sid=only_session or "", since=since, until=until, without_requests=True,
                        **({"session_keys": session_keys} if session_keys is not None else {}))


def _fallback_models(row: dict) -> dict[str, dict]:
    """A fallback session's usage per model. The split must add up, or the total is used."""
    total = {
        "requests": row["request_count"],
        "input": row["input_tokens"],
        "output": row["output_tokens"],
        "cache_read": row["cache_read_tokens"],
        "cache_write": row["cache_creation_tokens"],
    }
    try:
        models = json.loads(row["models_json"] or "{}")
    except ValueError:
        models = {}
    split: dict[str, dict] = {}
    if isinstance(models, dict):
        for model, usage in models.items():
            if not isinstance(usage, dict):
                continue
            split[model] = {
                "requests": int(usage.get("requests") or 0),
                "input": int(usage.get("input_tokens") or 0),
                "output": int(usage.get("output_tokens") or 0),
                "cache_read": int(usage.get("cache_read_tokens") or 0),
                "cache_write": int(usage.get("cache_creation_tokens") or 0),
            }
    for name in ("input", "output", "cache_read", "cache_write"):
        if sum(u[name] for u in split.values()) != total[name]:
            return {row["model"] or "unknown": total}
    return split or {row["model"] or "unknown": total}


# GitHub's published rate: "1 AI credit = $0.01 USD" (docs.github.com, Copilot "Models and pricing").
USD_PER_AI_CREDIT = 0.01


def _credits_section(board: _Board) -> dict | None:
    """AI credits GitHub Copilot reports for the sessions in view, or None when none is in view.

    Credits are stored per session and local day, as the tool reports them: not
    dollars, and no list price is applied. A day counts when the session was active
    on it inside the window; ``approximate`` is true when the window edge cuts
    through such a day, which is counted whole. ``amount`` is None when a
    session in view has no credits recorded.
    """
    f = board.f
    selected = set(stored_ids_for(f.tools)) if f.tools is not None else None
    amount: float | None = None
    by_tool: dict[str, float] = {}
    approximate = False
    seen = False
    credited: set[str] = set()
    for row in board.history.read("usage.sessions", since=f.since, until=f.until):
        u = project_usage(row)
        if not u.get("billing_unit"):
            continue
        if selected is not None and u["tool"] not in selected:
            continue
        if not f.matches_project(u["project_path"]):
            continue
        if (f.status != "all" or f.q) and u["session_id"] not in board.scope:
            continue
        seen = True
        for day, values in u["daily"].items():
            span = _day_span(day, u["started_at"] or 0.0, u["last_activity_at"] or 0.0)
            if _span_outside(span, f.since, f.until):
                continue
            credits = _model_credits(values.get("models") or {}, f.model) if f.model else values.get("billing_amount")
            if credits is None:
                continue
            amount = (amount or 0.0) + credits
            credited.add(u["session_id"])
            by_tool[u["tool"]] = by_tool.get(u["tool"], 0.0) + credits
            approximate = approximate or span[0] < f.since or span[1] > f.until
    if not seen:
        return None
    return {
        "amount": None if amount is None else round(amount, 2),
        "unit": "ai_credits",
        "by_tool": {t: round(v, 2) for t, v in sorted(by_tool.items())},
        "approximate": approximate,
        **_credits_in_usd(board, amount, credited),
    }


def _credits_in_usd(board: _Board, amount: float | None, credited: set[str]) -> dict:
    """The credits in US dollars at GitHub's published rate, beside the list price of the same sessions.

    ``usd`` is what Copilot recorded for the usage; ``list_usd`` is the list-price
    estimate of the same sessions' requests in the window, which leaves out
    ``list_unpriced_tokens``; ``cost_usd`` is the board's cost with those
    sessions at ``usd`` in place of their list price.
    """
    if amount is None:
        return {"usd": None, "usd_per_credit": USD_PER_AI_CREDIT, "list_usd": None, "list_unpriced_tokens": 0, "cost_usd": None}
    listed: float | None = None
    unpriced = 0
    for c in board.cells:
        if c.sid not in credited:
            continue
        if c.cost is not None:
            listed = (listed or 0.0) + c.cost
        else:
            unpriced += c.i + c.o + c.cr + c.cw
    usd = amount * USD_PER_AI_CREDIT
    return {
        "usd": round(usd, 2),
        "usd_per_credit": USD_PER_AI_CREDIT,
        "list_usd": _usd(listed),
        "list_unpriced_tokens": unpriced,
        "cost_usd": _usd((board.total.cost or 0.0) - (listed or 0.0) + usd),
    }


def _model_credits(models: dict, model: str) -> float | None:
    """Credits of one model in a day's split, over every spelling of its id."""
    wanted = canonical_model_id(model)
    amounts = [u.get("billing_amount") for m, u in models.items() if canonical_model_id(m) == wanted and isinstance(u, dict)]
    known = [a for a in amounts if a is not None]
    return sum(known) if known else None


def _unpriced_section(board: _Board) -> dict:
    """Tokens that carry no cost in the cost figures, per model with the reason: the model has no
    list price, or the source does not report what a price needs (the cost is not known)."""
    total = board.total.tokens
    tokens = sum(board.unpriced.values())
    return {
        "tokens": tokens,
        "share": _ratio(tokens, total),
        "models": [{"model": m, "tokens": t, "reason": why}
                   for (m, why), t in sorted(board.unpriced.items(), key=lambda kv: (-kv[1], kv[0]))],
    }


def _model_usage(usage: dict) -> dict:
    return {
        "requests": int(usage.get("requests") or 0),
        "input": int(usage.get("input_tokens") or 0),
        "output": int(usage.get("output_tokens") or 0),
        "cache_read": int(usage.get("cache_read_tokens") or 0),
        "cache_write": int(usage.get("cache_creation_tokens") or 0),
    }


def _fallback_pieces(row: dict, since: float, until: float) -> list[dict]:
    """A fallback session's usage in the window, one piece per local day it was active.

    Stored totals are for the whole life of the session. ``daily_json`` splits
    them by local day (and by model within a day), so each day lands where the
    session was active on that day: at the middle of its activity that day. A day
    with no activity in the window is left out. When the days do not add up to
    the totals, or there are none, the whole session is one piece at its last
    activity. ``last`` marks the piece that holds the turn and tool counts, which
    are stored for the session only.
    """
    last_ts = row["last_activity_at"]
    whole = [{"ts": last_ts, "models": _fallback_models(row), "last": True}]
    try:
        daily = json.loads(row.get("daily_json") or "{}")
    except ValueError:
        return whole if since <= last_ts <= until else []
    pieces: list[dict] = []
    totals = dict.fromkeys(("input", "output", "cache_read", "cache_write"), 0)
    last_day = datetime.fromtimestamp(last_ts).strftime("%Y-%m-%d")
    for day, values in daily.items() if isinstance(daily, dict) else ():
        try:
            lo = datetime.strptime(day, "%Y-%m-%d")
        except ValueError:
            return whole if since <= last_ts <= until else []
        models = {m: _model_usage(u) for m, u in (values.get("models") or {}).items() if isinstance(u, dict)}
        day_total = _model_usage(values)
        day_total["requests"] = sum(u["requests"] for u in models.values())
        for name in totals:
            totals[name] += day_total[name]
            if sum(u[name] for u in models.values()) != day_total[name]:
                models = {}
        if not models:
            models = {row["model"] or "unknown": day_total}
        start = max(lo.timestamp(), row["started_at"] or 0.0)
        end = min((lo + timedelta(days=1)).timestamp(), last_ts)
        mid = (start + end) / 2 if start <= end else lo.timestamp()
        pieces.append({"ts": mid, "models": models, "last": day == last_day})
    if not pieces or totals != {k: row[v] for k, v in _TOTAL_COLUMNS.items()}:
        return whole if since <= last_ts <= until else []
    if not any(p["last"] for p in pieces):
        pieces[-1]["last"] = True
    return [p for p in pieces if since <= p["ts"] <= until]


_TOTAL_COLUMNS = {"input": "input_tokens", "output": "output_tokens", "cache_read": "cache_read_tokens", "cache_write": "cache_creation_tokens"}


def _latency(board: _Board) -> dict:
    """Keep the original percentile interpolation over grouped values."""
    timed = sum(c.timed for c in board.cells)
    timed_first = sum(c.timed_first for c in board.cells)
    rows = [row for model in board.model_spellings()
            for row in board._history_series("requests.latency", requested_model=model)]
    by_model: dict[str, list[float]] = defaultdict(list)
    by_project: dict[str, list[float]] = defaultdict(list)
    by_bucket: list[list[float]] = [[] for _ in range(board.f.buckets)]
    by_spark: list[list[float]] = [[] for _ in range(SPARK_POINTS)]
    replies: list[float] = []
    firsts: list[float] = []
    project_of = board.session_project
    b_of, s_of = board.b_of, board.s_of

    for row in rows:
        durations = exact_values(row, "durations", "duration_count")
        firsts.extend(exact_values(row, "firsts", "first_count"))
        if durations:
            g = row["g"]
            replies.extend(durations)
            by_model[canonical_model_id(row["model"])].extend(durations)
            by_project[project_of.get(row["session_id"], "")].extend(durations)
            by_bucket[b_of[g]].extend(durations)
            by_spark[s_of[g]].extend(durations)
    for group in (replies, firsts, *by_model.values(), *by_project.values(), *by_bucket, *by_spark):
        group.sort()
    return {
        "replies": replies,
        "firsts": firsts,
        "reply_count": timed,
        "first_count": timed_first,
        "reply_max": max((c.longest or 0.0 for c in board.cells), default=0.0) or None,
        "first_max": max((c.longest_first or 0.0 for c in board.cells), default=0.0) or None,
        "by_model": by_model,
        "by_project": by_project,
        "by_bucket": by_bucket,
        "by_spark": by_spark,
    }


_UNSET: Any = object()


def _latency_row(what: str, values: list[float], count: Any = _UNSET, longest: float | None = None) -> dict:
    """One row of the latency table. Count and maximum are exact when the values are a sample."""
    return {
        "what": what,
        "count": len(values) if count is _UNSET else count,
        "p50_ms": _ms(_percentile(values, 0.50)),
        "p95_ms": _ms(_percentile(values, 0.95)),
        "p99_ms": _ms(_percentile(values, 0.99)),
        "max_ms": _ms(longest if longest is not None else values[-1] if values else None),
    }


@dataclass
class _Turns:
    count: int
    lengths_ms: list[float]
    longest_ms: float | None
    tokens: dict[tuple[str, float], int | None]
    starts: dict[str, list[float]]


def _turns(board: _Board, skill_rows: list[tuple]) -> _Turns:
    """Main-agent prompts, and the tokens and length of the turns anything on the board shows.

    A turn runs to the next prompt. Tokens are read for the newest prompts and for
    the turns a skill ran in; lengths come from a sample once there are many turns.
    """
    rows = sorted(
        (r["session_id"], r["ts"])
        for r in board.history.read("prompts.page", since=board.f.since, until=board.f.until,
                                    session_keys=board.history.keys(board.scope))
    ) if board.scope else []
    starts: dict[str, list[float]] = defaultdict(list)
    for sid, ts in rows:
        starts[sid].append(ts)
    every = 1 if _is_reported_history(board.conn) else max(1, math.ceil(len(rows) / MAX_TURN_SAMPLE))
    sampled = {rows[i] for i in range(0, len(rows), every)}
    wanted = set(sampled)
    wanted.update(sorted(rows, key=lambda r: r[1], reverse=True)[:MAX_PROMPTS])
    for _name, sid, ts, _agent in skill_rows:
        i = bisect.bisect_right(starts.get(sid, []), ts) - 1
        if i >= 0:
            wanted.add((sid, starts[sid][i]))
    end_of = board.f.until + 1
    triples = []
    for sid, ts in sorted(wanted):
        line = starts[sid]
        i = bisect.bisect_right(line, ts)
        node, raw = board.history.split(sid)
        triples.append((node or "", raw, ts, line[i] if i < len(line) else end_of))
    tokens: dict[tuple[str, float], int | None] = {}
    lengths: list[float] = []
    ends: dict[tuple[str, float], float] = {}
    # One read per spelling of the chosen model: a turn's parts add up, and it ends at its last request.
    for model in board.model_spellings() if triples else ():
        for row in board.history.read("requests.intervals", intervals=triples, requested_model=model):
            key, end = (row["session_id"], row["start_ts"]), row["end_ts"]
            tokens[key] = row["tokens"] if key not in tokens else (tokens[key] or 0) + (row["tokens"] or 0)
            if end is not None:
                ends[key] = max(end, ends.get(key, end))
    for (sid, ts), end in ends.items():
        if (sid, ts) in sampled and end > ts:
            lengths.append((end - ts) * 1000.0)
    lengths.sort()
    return _Turns(len(rows), lengths, None, tokens, starts)


def _tools_section(board: _Board) -> dict:
    rows = board._history_series("tools.series")
    fields = "tool_name g calls failures max_duration timed input_bytes input_count output_bytes output_count".split()
    n = board.f.buckets
    calls_bucket = [0] * n
    fail_bucket = [0] * n
    spark_calls = [0] * SPARK_POINTS
    spark_failed = [0] * SPARK_POINTS
    stats: dict[str, dict] = {}
    longest = 0.0
    timed_total = 0
    values: dict[str, list[float]] = defaultdict(list)
    overall = []
    for source in rows:
        name, g, count, errs, slowest, timed, in_sum, in_n, out_sum, out_n = (source[k] for k in fields)
        durations = exact_values(source, "durations", "timed")
        values[name].extend(durations)
        overall.extend(durations)
        b, s = board.b_of[g], board.s_of[g]
        row = stats.setdefault(
            name, {"calls": 0, "failed": 0, "max": 0.0, "timed": 0, "trend": [0] * SPARK_POINTS, "in": [0, 0], "out": [0, 0]}
        )
        row["in"][0] += in_sum or 0
        row["in"][1] += in_n
        row["out"][0] += out_sum or 0
        row["out"][1] += out_n
        row["calls"] += count
        row["failed"] += errs
        row["max"] = max(row["max"], slowest or 0.0)
        row["timed"] += timed
        row["trend"][s] += count
        calls_bucket[b] += count
        fail_bucket[b] += errs
        spark_calls[s] += count
        spark_failed[s] += errs
        longest = max(longest, slowest or 0.0)
        timed_total += timed

    overall.sort()

    out = []
    servers = known_mcp_servers(stats)
    for name, row in sorted(stats.items(), key=lambda kv: (-kv[1]["calls"], kv[0]))[:MAX_LIST_ROWS]:
        ordered = sorted(values.get(name, []))
        out.append(
            {
                "name": name,
                "server": is_server_tool(name),
                "calls": row["calls"],
                "failed": row["failed"],
                "fail_rate": _ratio(row["failed"], row["calls"]),
                "p50_ms": _ms(_percentile(ordered, 0.50)),
                "p95_ms": _ms(_percentile(ordered, 0.95)),
                "max_ms": _ms(row["max"]) if ordered else None,
                "mcp_server": mcp_server_of(name, servers),
                "avg_input_bytes": round(row["in"][0] / row["in"][1]) if row["in"][1] else None,
                "avg_output_bytes": round(row["out"][0] / row["out"][1]) if row["out"][1] else None,
                "output_bytes": row["out"][0] if row["out"][1] else None,
                "trend": row["trend"],
            }
        )
    return {
        "rows": out,
        "calls_by_name": {name: row["calls"] for name, row in stats.items()},
        "durations": overall,
        "timed": timed_total,
        "longest": longest or None,
        "calls_bucket": calls_bucket,
        "fail_bucket": fail_bucket,
        "spark_calls": spark_calls,
        "spark_failed": spark_failed,
    }


def _confirms_section(board: _Board, calls_by_name: dict[str, int] | None = None) -> dict:
    """How each tool call was let through, and how many calls carry no such record.

    ``not_reported`` is the tool calls of the Tool calls table minus the calls with a confirmation
    value, so the parts add up to the calls; a call is missing here when its stored row has an
    empty ``confirm`` (the source that wrote it reported no permission decision).
    """
    counts = {"auto": 0, "approved": 0, "denied": 0, "blocked": 0, "pending": 0}
    by_tool: dict[str, dict[str, int]] = defaultdict(lambda: {"auto": 0, "approved": 0, "denied": 0, "blocked": 0, "pending": 0})
    waits: dict[str, list[float]] = defaultdict(list)
    all_waits: list[float] = []
    # Calls with any confirmation value, pending included, per tool.
    recorded: dict[str, int] = defaultdict(int)
    for sid, name, confirm, calls, call_waits in board.confirm_counts:
        if sid not in board.scope:
            continue
        counts[confirm] = counts.get(confirm, 0) + calls
        recorded[name] += calls
        if confirm in by_tool[name]:
            by_tool[name][confirm] += calls
        # The cluster returns the waits of approved and denied calls only, and only those above zero.
        if call_waits:
            waits[name].extend(call_waits)
            all_waits.extend(call_waits)
    for group in (all_waits, *waits.values()):
        group.sort()
    reported = bool(by_tool) or bool(counts["pending"])
    pending = [
        {"agent_id": row["agent_key"], "name": row["name"], "target": row["target"], "since_ts": row["since_ts"]}
        for rows in board.pending_rows.values()
        for row in rows
    ]
    p95 = _percentile(all_waits, 0.95)
    not_reported = None
    if calls_by_name is not None:
        not_reported = sum(max(0, n - recorded.get(name, 0)) for name, n in calls_by_name.items())
        for name, n in calls_by_name.items():
            if n > recorded.get(name, 0):
                # A tool whose calls carry no confirmation still gets its row.
                by_tool.setdefault(name, {"auto": 0, "approved": 0, "denied": 0, "blocked": 0, "pending": 0})
    return {
        "not_reported": not_reported,
        # Nobody was asked about a call that a rule let through or stopped.
        "asked": counts["approved"] + counts["denied"] + counts["pending"] if reported else None,
        "blocked": counts["blocked"] if reported else None,
        "auto": counts["auto"] if reported else None,
        "approved": counts["approved"] if reported else None,
        "denied": counts["denied"] if reported else None,
        "p95_wait_s": None if p95 is None else round(p95 / 1000, 2),
        "pending": sorted(pending, key=lambda p: p["since_ts"], reverse=True)[:MAX_LIST_ROWS],
        "by_tool": [
            {
                "name": name,
                **row,
                "not_reported": None if calls_by_name is None else max(0, calls_by_name.get(name, 0) - recorded.get(name, 0)),
                "median_wait_s": (
                    None if not waits.get(name) else round(_percentile(waits[name], 0.5) / 1000, 2)
                ),
            }
            for name, row in sorted(by_tool.items(), key=lambda kv: (-sum(kv[1].values()), kv[0]))
        ],
    }


def _error_key_text(text: str | None) -> str:
    """A failure's first line with numbers and quoted values removed, so repeats group."""
    line = mask_secrets(text).strip().splitlines()[0] if (text or "").strip() else ""
    line = re.sub(r"\d+", "#", line)
    return line[:80]


def _tool_error_key(name: str, summary: str | None) -> str:
    return f"tool:{name}:{_error_key_text(summary)}"


def _api_error_key(error_type: str | None, status: int | None) -> str:
    return f"api:{error_type or 'error'}:{status or ''}"


def _errors_section(board: _Board) -> tuple[list[dict], list[int], dict[str, int]]:
    groups: dict[str, dict] = {}
    known: dict[tuple[str, str | None], str] = {}
    scope = board.scope
    for sid, _aid, name, _target, summary, ts in board.failure_rows:
        if sid not in scope:
            continue
        key = known.get((name, summary))
        if key is None:
            key = known[(name, summary)] = _tool_error_key(name, summary)
        row = groups.get(key)
        if row is None:
            row = groups[key] = {
                "kind": "Tool",
                "count": 0,
                "agents": set(),
                "last_ts": ts,
                "sample": _one_line(summary, 200),
            }
        row["count"] += 1
        row["agents"].add(sid)
        row["last_ts"] = max(row["last_ts"], ts)
    api_bucket = [0] * board.f.buckets
    api_by_project: dict[str, int] = defaultdict(int)
    for source in (row for model in board.model_spellings()
                   for row in board._history_series("requests.error_series", requested_model=model)):
        error_type, status, sid, g, n, ts = (
            source[k] for k in ("error_type", "http_status", "session_id", "g", "calls", "last_ts")
        )
        api_bucket[board.b_of[g]] += n
        api_by_project[board.session_project.get(sid, "")] += n
        key = _api_error_key(error_type, status)
        row = groups.setdefault(
            key,
            {
                "kind": "API",
                "count": 0,
                "agents": set(),
                "last_ts": ts,
                "sample": " ".join(str(p) for p in (error_type, status) if p),
            },
        )
        row["count"] += n
        row["agents"].add(sid)
        row["last_ts"] = max(row["last_ts"], ts)
    rows = [{"key": key, **row, "agents": len(row["agents"])} for key, row in groups.items()]
    rows.sort(key=lambda r: (-r["count"], -r["last_ts"]))
    return rows[:MAX_LIST_ROWS], api_bucket, api_by_project


def _under_folder(path: str, folder: str) -> bool:
    key, root = project_key(path), project_key(folder)
    return bool(root) and (key == root or key.startswith(root.rstrip("/") + "/"))


def file_projects(paths: Iterable[str], projects: Iterable[str], *, resolve: bool = True) -> dict[str, str]:
    """The project of each changed file: the innermost known project that holds its path.

    A known project is a session's project resolved to its repository (an agent's worktree
    belongs to the repository git's common directory names, see ``project_root``), so a file
    in a worktree counts for its repository. A file outside every known project maps to ""
    (shown as outside any project): the session that wrote it does not make it that session's.
    """
    roots = sorted({(project_root(p) if resolve else p) or p for p in projects if p}, key=len, reverse=True)
    return {path: next((root for root in roots if _under_folder(path, root)), "") for path in paths}


def _changes_section(board: _Board) -> tuple[dict, dict[str, tuple[int, int]]]:
    selected = board.narrowed and board.only_session is None
    fields = ("path", "project_path", "added", "removed", "edits", "sessions", "last_ts", "session_id")
    rows = [tuple(r[k] for k in fields) + ((r["node_id"],) if board.history.qualified else ())
            for r in board._history_window("files.changes", restrict_sessions=selected,
                                           session_keys=board.history.keys(board.scope) if selected else [])]
    files = []
    by_project: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    added_any = removed_any = False
    added_total = removed_total = edits_total = 0
    known = [*board.session_project.values(), *(row[1] for row in rows)]
    owner = file_projects((row[0] for row in rows), known, resolve=not board.history.qualified)
    for path, _written_from, added, removed, edits, sessions, last_ts, sid, *nodes in rows:
        project = owner[path]
        files.append(
            {
                "path": path,
                "project": project,
                "lines_added": None if added is None else int(added),
                "lines_removed": None if removed is None else int(removed),
                "edits": edits,
                "sessions": sessions,
                "last_ts": last_ts,
                **({"node_id": node_label(nodes[0]), "id": identity(nodes[0], path)} if nodes else {}),
            }
        )
        edits_total += edits
        if added is not None:
            added_any = True
            added_total += int(added)
            by_project[project][0] += int(added)
        if removed is not None:
            removed_any = True
            removed_total += int(removed)
            by_project[project][1] += int(removed)
    files.sort(key=lambda f: f["last_ts"], reverse=True)
    return (
        {
            "files": files[:MAX_LIST_ROWS],
            "totals": {
                "files": len(rows),
                "lines_added": added_total if added_any else None,
                "lines_removed": removed_total if removed_any else None,
                "edits": edits_total,
                # Files under no known project: the Projects rows plus these make the totals above.
                "outside_projects": {
                    "files": sum(1 for path in owner.values() if not path),
                    "lines_added": by_project[""][0] if "" in by_project else None,
                    "lines_removed": by_project[""][1] if "" in by_project else None,
                },
            },
        },
        {project: (a, r) for project, (a, r) in by_project.items() if project},
    )


# The text one Testing row carries: its label and its newest full command line together.
TEST_ROW_CHARS = 200
TEST_LABEL_CHARS = 80


def _tests_section(board: _Board) -> tuple[list[dict], list[int], list[int], dict[str, list[int]]]:
    passed = [0] * board.f.buckets
    failed = [0] * board.f.buckets
    commands: dict[str, dict] = {}
    labels: dict[str, str] = {}
    by_project: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for sid, _aid, ts, _name, target, is_error, exit_code, duration in board.test_rows:
        if sid not in board.scope:
            continue
        bad = _test_failed(is_error, exit_code)
        (failed if bad else passed)[board._bucket_of(ts)] += 1
        counts = by_project[board.session_project.get(sid, "")]
        counts[0] += 1
        counts[1] += 0 if bad else 1
        # A row is a runner and its target; runs that differ only in folder or environment are one row.
        label = labels.get(target)
        if label is None:
            label = labels[target] = _one_line(run_label(target), TEST_LABEL_CHARS)
        row = commands.setdefault(label, {"runs": 0, "failed": 0, "durations": [], "last_ts": ts,
                                          "full": target, "lines": set()})
        row["runs"] += 1
        row["failed"] += 1 if bad else 0
        row["lines"].add(target)
        if ts >= row["last_ts"]:
            row["last_ts"], row["full"] = ts, target
        if duration and duration > 0:
            row["durations"].append(duration)
    out = []
    for command, row in commands.items():
        state = "Passing" if not row["failed"] else "Failing" if row["failed"] == row["runs"] else "Flaky"
        out.append(
            {
                "command": command,
                # The newest full command line, within the 200 characters a row carried before.
                "full_command": _one_line(row["full"], TEST_ROW_CHARS - len(command)),
                "command_lines": len(row["lines"]),
                "runs": row["runs"],
                "failed": row["failed"],
                "median_ms": _ms(_percentile(sorted(row["durations"]), 0.5)),
                "state": state,
                "last_ts": row["last_ts"],
            }
        )
    out.sort(key=lambda r: r["last_ts"], reverse=True)
    return out[:MAX_LIST_ROWS], passed, failed, by_project


def _loop_models(board: _Board, loops: list[dict]) -> list[list[dict]]:
    """The requests of each loop's span, per model, in one read for all the loops.

    A read per loop reduced the versions of the whole requests table once per loop.
    """
    spans = []
    for loop in loops:
        sid, agent = loop["session_id"], loop["agent_id"]
        node, raw_sid = board.history.split(sid)
        # A subagent's loop is keyed by its address, "<session>/<agent>"; the store keeps the agent id.
        raw_agent = board.history.split(agent)[1].rpartition(AGENT_SEPARATOR)[2] if agent != sid else ""
        spans.append([node or "", raw_sid, raw_agent, float(loop["since_ts"]), float(loop["until_ts"])])
    by_span: dict[int, list[dict]] = defaultdict(list)
    if spans:
        for row in board.history.read("requests.loop_models", spans=spans):
            by_span[row["span_index"]].append(row)
    return [by_span[i] for i in range(len(spans))]


def _loop_rows(board: _Board) -> list[dict]:
    rows = []
    loops = board.visible_loops[:MAX_LOOP_ROWS]
    keys = [(loop["session_id"], loop["agent_id"]) for loop in loops]
    titles = board._titles(keys) if keys else {}
    models = _loop_models(board, loops)
    fields = "model input_tokens output_tokens cache_read_tokens cache_creation_tokens last_ts cost_usd".split()
    for loop, loop_models in zip(loops, models, strict=True):
        sid, agent = loop["session_id"], loop["agent_id"]
        tokens = None
        cost = None
        for row in loop_models:
            model, i, o, cr, cw, ts, stored = (row[k] for k in fields)
            tokens = (tokens or 0) + i + o + cr + cw
            cell_cost = _cost_of(stored, model, i, o, cr, cw, ts, row.get("cost_known"))
            if cell_cost is not None:
                cost = (cost or 0.0) + cell_cost
        status = board.status.get(sid) if agent == sid else board.sub_status.get((sid, agent))
        rows.append(
            {
                "agent_id": agent,
                "title": titles.get((sid, agent), _short(agent)),
                "status": status,
                "pattern": loop["pattern"],
                "repeats": loop["repeats"],
                "tokens": tokens,
                "cost_usd": _usd(cost),
                "since_ts": loop["since_ts"],
                "at_end": loop["at_end"],
            }
        )
    return rows


def _attention(board: _Board, loops: list[dict], agents: list[dict]) -> list[dict]:
    items = []
    for loop in loops:
        if loop["at_end"] and loop["status"] == "looping":
            items.append(
                {
                    "kind": "loop",
                    "agent_id": loop["agent_id"],
                    "title": loop["title"],
                    "detail": f"{loop['pattern']}, {loop['repeats']} times",
                    "tokens": loop["tokens"],
                    "cost_usd": loop["cost_usd"],
                    "since_ts": loop["since_ts"],
                }
            )
    for agent in agents:
        if agent["status"] == "waiting" and agent["pending"]:
            pending = agent["pending"]
            items.append(
                {
                    "kind": "waiting",
                    "agent_id": agent["id"],
                    "title": agent["title"],
                    "detail": " ".join(part for part in (pending["name"], pending["target"]) if part),
                    "tokens": _tokens_of(agent),
                    "cost_usd": agent["cost_usd"],
                    "since_ts": pending["since_ts"],
                }
            )
    return items


def _reported(value: int, tools: set[str], silent: frozenset[str]) -> int | None:
    """A 0 means unknown when no tool behind it reports this field."""
    return None if not value and tools and tools <= silent else value


def _tokens_of(row: dict) -> int | None:
    values = (row["input"], row["output"], row["cache_read"], row["cache_write"])
    return None if all(v is None for v in values) else sum(v or 0 for v in values)


def _prompts_section(board: _Board, turn_tokens: dict[tuple[str, float], int | None]) -> list[dict]:
    out = []
    historical = _is_reported_history(board.conn)
    native_ids = historical or getattr(board.conn, "_live_projection", False) is True
    if not board.scope:
        return out
    result = board.history.require_reader().read("prompts.page", {
        **node_scope(board.history.node), "since": board.f.since, "until": board.f.until, "preview": True,
        "session_keys": board.history.keys(board.scope), "limit": MAX_PROMPTS,
    })
    for row in board.history.identify(result.rows):
        ts, sid, aid, project, text, prompt_file = (
            row[k] for k in ("ts", "session_id", "agent_id", "project_path", "text", "prompt_file")
        )
        out.append(
            {
                **({"id": identity(row["node_id"], str(row["id"])), "node_id": node_label(row["node_id"])} if historical
                   else {"id": str(row["id"])} if native_ids else {}),
                "ts": ts,
                "session_id": sid,
                "agent_id": _agent_key(sid, aid),
                "project": project or board.session_project.get(sid, ""),
                "text": _one_line(text, PROMPT_PREVIEW_CHARS),
                "prompt_file": prompt_file,
                "tokens": turn_tokens.get((sid, ts)),
            }
        )
    return out


_disk_prompts_memo: dict[tuple[str, ...], tuple[float, tuple[list[tuple[str, str]], list[str]]]] = {}


USER_PROMPT_PROJECT = ""


def _setting_prompt_folders(settings_file: Path, base: Path) -> list[Path]:
    """Folders that chat.promptFilesLocations turns on, relative to ``base`` unless absolute or under ~."""
    from ..hook_removal import jsonc_loads

    try:
        data = jsonc_loads(settings_file.read_text(encoding="utf-8", errors="replace"))
    except (OSError, ValueError):
        return []
    locations = data.get("chat.promptFilesLocations") if isinstance(data, dict) else None
    if not isinstance(locations, dict):
        return []
    folders = []
    for raw, enabled in locations.items():
        if enabled is not True or not isinstance(raw, str) or any(c in raw for c in "*?[{"):
            continue
        path = Path(raw).expanduser()
        folders.append(path if path.is_absolute() else base / path)
    return folders


def _parent_folders(project: Path) -> list[Path]:
    """The project folder, then each parent up to the one with a .git folder (VS Code parent repository discovery).

    A project that holds its own .git folder is the repository root. With no .git folder in any
    parent, the project folder stands alone.
    """
    if (project / ".git").exists():
        return [project]
    chain = [project]
    for parent in project.parents:
        if parent == Path.home() or parent == parent.parent:
            break
        chain.append(parent)
        if (parent / ".git").exists():
            return chain
    return [project]


def _collect_prompt_files(folder: Path, suffix: str, root: Path | None) -> list[str]:
    """Files below ``folder`` with the suffix, relative to ``root``, or absolute when outside it or with no root. Bounded."""
    out: list[str] = []
    stack = [(folder, 0)]
    while stack and len(out) < MAX_PROMPT_FILES_PER_ROOT:
        current, depth = stack.pop()
        try:
            with os.scandir(current) as entries:
                for count, entry in enumerate(entries):
                    if count >= MAX_PROMPT_DIR_ENTRIES:
                        break
                    if entry.is_dir(follow_symlinks=False):
                        if depth < MAX_PROMPT_DEPTH:
                            stack.append((Path(entry.path), depth + 1))
                    elif entry.name.endswith(suffix) and entry.name != "SKILL.md":
                        try:
                            out.append(Path(entry.path).relative_to(root).as_posix() if root else entry.path)
                        except ValueError:
                            out.append(entry.path)
        except OSError:
            continue
    return sorted(out)


def _prompt_files_on_disk(projects: list[str]) -> tuple[list[tuple[str, str]], list[str]]:
    """((project, file), searched folders) for prompt files. Bounded and cached.

    Searched: each project folder and its parents up to the repository root, the folders that
    chat.promptFilesLocations adds (workspace and user settings), the VS Code user prompts
    folders, and the user commands folder. A file under the user folders has the project "".
    """
    from ..platforms import vscode_insiders_user_dir, vscode_user_dir

    key = tuple(sorted(p for p in projects if p))[:MAX_PROMPT_PROJECTS]
    cached = _disk_prompts_memo.get(key)
    if cached and time.monotonic() - cached[0] < DISK_TTL_S:
        return cached[1]
    found: list[tuple[str, str]] = []
    searched: list[str] = []
    seen: set[tuple[str, str]] = set()

    def look(folder: Path, suffix: str, project: str, root: Path | None) -> None:
        marker = (project, str(folder))
        if marker in seen:
            return
        seen.add(marker)
        label = _display_folder(folder)
        if label not in searched:
            searched.append(label)
        for file in _collect_prompt_files(folder, suffix, root):
            found.append((project, file))

    user_trees = [vscode_user_dir(), vscode_insiders_user_dir()]
    user_settings = [tree / "settings.json" for tree in user_trees]
    for tree in user_trees:
        look(tree / "prompts", ".prompt.md", USER_PROMPT_PROJECT, None)
        try:
            profiles = sorted((tree / "profiles").iterdir())[:MAX_PROMPT_DIR_ENTRIES]
        except OSError:
            profiles = []
        for profile in profiles:
            user_settings.append(profile / "settings.json")
            look(profile / "prompts", ".prompt.md", USER_PROMPT_PROJECT, None)
    home = Path.home()
    for folder, suffix in USER_PROMPT_DIRS:
        look(home / folder, suffix, USER_PROMPT_PROJECT, None)
    for settings_file in user_settings:
        for folder in _setting_prompt_folders(settings_file, home):
            look(folder, ".prompt.md", USER_PROMPT_PROJECT, None)
    for project in key:
        if _names_another_machine(project):
            continue
        root = Path(project)
        for base in _parent_folders(root):
            for folder, suffix, _tool in PROMPT_DIRS:
                look(base / folder, suffix, project, root)
        for folder in _setting_prompt_folders(root / ".vscode" / "settings.json", root):
            look(folder, ".prompt.md", project, root)
    _disk_prompts_memo.clear()
    _disk_prompts_memo[key] = (time.monotonic(), (found, searched))
    return found, searched


def _project_prompts(board: _Board, project_ids: list[str]) -> tuple[list[dict], list[str]]:
    reported = board.history.qualified
    restrict = board.narrowed
    rows = board.history.read("prompts.files", since=board.f.since, until=board.f.until,
                              restrict_sessions=restrict, session_keys=board.history.keys(board.scope) if restrict else [],
                              limit=MAX_LIST_ROWS if reported else 20_000, page=reported)
    if reported:
        return [
            {"node_id": node_label(r["node_id"]), "file": r["path"],
             "project": r["project_path"] or board.session_project.get(r["session_id"], ""),
             "uses": r["uses"], "last_ts": r["last_ts"]}
            for r in rows
        ], []
    used: dict[tuple[str, str], dict] = {}
    live = getattr(board.conn, "_live_projection", False) is True
    for r in rows:
        prompt_file, project, sid, n, last_ts = (r[key] for key in ("path", "project_path", "session_id", "uses", "last_ts"))
        project = project or board.session_project.get(sid, "")
        used[(project, _basename(prompt_file))] = {
            "file": prompt_file, "project": project, "uses": n, "last_ts": last_ts,
            **({"_history_file": prompt_file, "_configured_on_disk": False} if live else {}),
        }
    files, searched = _prompt_files_on_disk(project_ids)
    for project, file in files:
        if project == USER_PROMPT_PROJECT:
            continue
        key = (project, _basename(file))
        if key in used:
            used[key]["file"] = file
        else:
            used[key] = {"file": file, "project": project, "uses": 0, "last_ts": None}
        if live:
            used[key]["_configured_on_disk"] = True
    # A user-level file has no project: the projects that used it by name carry its path,
    # and one that no project used is listed once with no use.
    for project, file in files:
        if project != USER_PROMPT_PROJECT:
            continue
        name = _basename(file)
        users = [row for (proj, base), row in used.items() if base == name and row["uses"] and row["file"] == base]
        for row in users:
            row["file"] = file
            if live:
                row["_configured_on_disk"] = True
        if not users and not any(row["file"] == file for row in used.values()):
            used[(project, file)] = {"file": file, "project": project, "uses": 0, "last_ts": None}
        if live:
            for row in used.values():
                if row["file"] == file:
                    row["_configured_on_disk"] = True
    rows = sorted(used.values(), key=lambda r: (-r["uses"], r["project"], r["file"]))
    return rows[:MAX_LIST_ROWS], searched


def _skill_rows(board: _Board) -> list[tuple]:
    if not board.scope:
        return []
    return [
        (r["name"], r["session_id"], r["ts"], r["agent_id"])
        for r in board.history.read("skills.window", since=board.f.since, until=board.f.until,
                                    session_keys=board.history.keys(board.scope))
    ]


def _skills_section(board: _Board, skill_rows: list[tuple], turns: _Turns) -> list[dict]:
    """A skill's tokens are all tokens of the turns it ran in, each turn counted once per skill.

    Skills used in one turn each show that turn, so these figures must not be added up.
    """
    skills: dict[str, dict] = {}
    charged: set[tuple[str, str, float]] = set()
    for name, sid, ts, agent in skill_rows:
        row = skills.setdefault(name, {"name": name, "uses": 0, "tokens": None, "agents": set()})
        row["uses"] += 1
        row["agents"].add((sid, _agent_key(sid, agent)))
        row.setdefault("projects", set()).add(board.session_project.get(sid, ""))
        line = turns.starts.get(sid, [])
        i = bisect.bisect_right(line, ts) - 1
        if i < 0 or (name, sid, line[i]) in charged:
            continue
        charged.add((name, sid, line[i]))
        value = turns.tokens.get((sid, line[i]))
        if value is not None:
            row["tokens"] = (row["tokens"] or 0) + value
    out = [{**row, "agents": len(row["agents"])} for row in skills.values()]
    out = sorted(out, key=lambda r: (-r["uses"], r["name"]))[:MAX_LIST_ROWS]
    return [{**{k: v for k, v in row.items() if k != "projects"},
             **({} if _is_reported_history(board.conn) else _skill_file(row["name"], row["projects"]))} for row in out]


def _memory_files(board: _Board) -> list[dict]:
    """Every memory and instruction file that exists, each with its category.

    A file counts whenever it exists: the time window does not apply to it (it is not a record of
    one period), the project filter applies in the query before any page is cut, and the read is
    not cut at one page.
    """
    selected = set(stored_ids_for(board.f.tools)) if board.f.tools is not None else None
    fields = ("path", "tool", "scope", "tokens", "last_changed", "category", "mtime")
    folded = bool(board.f.project and PureWindowsPath(project_key(board.f.project)).drive)
    rows = [tuple(r[k] for k in fields) + ((r["node_id"],) if board.history.qualified else ())
            for r in board.history.read("files.inventory", inventory_mode="memory",
                                        project_path_key=project_key(board.f.project), fold_project=folded)]
    rows = [r for r in rows if selected is None or r[1] in selected]
    if not rows:
        return []
    writes: dict[str, tuple] = {}
    paths = sorted({r[0] for r in rows})
    fields = ("path", "added", "removed", "tool", "last_ts")
    write_rows = [tuple(r[k] for k in fields) + ((r["node_id"],) if board.history.qualified else ())
                  for r in board.history.read("files.changes", since=board.f.since, until=board.f.until,
                                              requested_paths=paths)]
    for path, added, removed, tool, ts, *nodes in write_rows:
        writes[identity(nodes[0], path) if nodes else path] = (added, removed, tool, ts)
    # A file counts as read only when a session's own record shows it loaded it (session_loaded_files).
    loaded: dict[str, tuple] = {}
    for r in board.history.read("files.loaded", since=board.f.since, until=board.f.until, requested_paths=paths):
        loaded[identity(r["node_id"], r["path"]) if board.history.qualified else r["path"]] = (
            int(r["sessions"] or 0), sorted(r["tools"] or []), r["last_ts"])
    projects = file_projects(paths, board.session_project.values(), resolve=not board.history.qualified)
    out = []
    for path, tool, scope, tokens, last_changed, category, mtime, *nodes in rows:
        key = identity(nodes[0], path) if nodes else path
        added, removed, changed_by, changed_ts = writes.get(key, (None, None, None, None))
        sessions, loaded_by, loaded_ts = loaded.get(key, (0, [], None))
        out.append(
            {
                "path": path,
                "project": _memory_project(path, scope, projects.get(path, "")),
                "category": category,
                **({"id": key, "node_id": node_label(nodes[0])} if nodes else {}),
                # The tool whose loading rules name the file, not evidence that a session read it.
                "declared_for": tool or None,
                "loaded_sessions": sessions,
                "loaded_by": loaded_by or None,
                "loaded_ts": loaded_ts,
                "scope": scope,
                "tokens": tokens,
                "lines_added": None if added is None else int(added),
                "lines_removed": None if removed is None else int(removed),
                "changed_by": changed_by,
                # A session's write in the time range; the file's own modified time; when aictl last scanned it.
                "changed_ts": changed_ts,
                "modified_ts": mtime or None,
                "scanned_ts": last_changed or None,
            }
        )
    return out


_CLAUDE_PROJECT_STORE = re.compile(r"[/\\]\.claude[/\\]projects[/\\]([^/\\]+)[/\\]")


def _memory_project(path: str, scope: str, project: str) -> str:
    """Which project a memory file is for, so same-named files (MEMORY.md) tell apart.

    Claude Code keeps a project's memory under ~/.claude/projects/<folder>/ and names the folder
    after the project's path; that folder name is shown as stored. Else the known project that
    holds the file, else "(global)" for a file of the global scope.
    """
    found = _CLAUDE_PROJECT_STORE.search(path or "")
    if found:
        return found.group(1)
    if project:
        return project
    return "(global)" if scope == "global" else ""


def _processes(board: _Board) -> list[dict]:
    snapshot = board.snapshot
    if snapshot is None:
        return []
    owner: dict[int, str] = {}
    for sid, live in board.live_by_sid.items():
        for pid in live["pids"]:
            owner[pid] = sid
    placeholder_of = {
        pid: (f"live:{group['tool']}:{group['project']}", f"{_label(group['tool'])}, no session data yet")
        for group in board.placeholders
        for pid in group["pids"]
    }
    selected = set(stored_ids_for(board.f.tools)) if board.f.tools is not None else None
    out = []
    titles = board._titles((sid, sid) for sid in set(owner.values()))
    for tool in getattr(snapshot, "tools", None) or []:
        if getattr(tool, "meta", False):
            continue
        tool_id = getattr(tool, "tool", "")
        if selected is not None and tool_id not in selected:
            continue
        for proc in getattr(tool, "processes", None) or []:
            pid = _proc_field(proc, "pid")
            sid = owner.get(pid)
            placeholder = placeholder_of.get(pid, (None, None))
            if board.narrowed and board.f.status != "all" and sid not in board.scope:
                continue
            if board.f.project and (sid is None or not board.f.matches_project(board.session_project.get(sid))):
                continue
            out.append(
                {
                    "name": _proc_field(proc, "name"),
                    "pid": pid,
                    "tool": tool_id,
                    "agent_id": sid or placeholder[0],
                    "title": titles.get((sid, sid)) if sid else placeholder[1],
                    "cpu_percent": _as_number(_proc_field(proc, "cpu_pct")),
                    "mem_mb": _as_number(_proc_field(proc, "mem_mb")),
                }
            )
    out.sort(key=lambda p: -(p["cpu_percent"] or 0.0))
    return out[:MAX_LIST_ROWS]


def _resource_series(board: _Board) -> tuple[dict, dict]:
    """CPU and memory per tool. Only the tool and time filters apply."""
    f = board.f
    rows = board.history.read(
        "runtime.resources", since=f.since, until=f.until, grid=f.buckets, restrict_tools=f.tools is not None,
        requested_tools=list(stored_ids_for(f.tools)) if f.tools is not None else [],
    )
    cpu: dict[str, list] = {}
    mem: dict[str, list] = {}
    for r in rows:
        tool, b, avg_cpu, avg_mem = (r[key] for key in ("tool", "b", "cpu", "mem"))
        cpu.setdefault(tool, [None] * f.buckets)[b] = None if avg_cpu is None else round(avg_cpu, 2)
        mem.setdefault(tool, [None] * f.buckets)[b] = None if avg_mem is None else round(avg_mem, 2)
    order = [t for t in board.tool_order if t in cpu] + sorted(t for t in cpu if t not in board.tool_order)
    return {t: cpu[t] for t in order}, {t: mem[t] for t in order}


_COVERAGE_TOOLS = ("copilot-cli", "copilot-vscode", "copilot-desktop", "copilot365", "claude-code", "codex-cli")


E, H, N, U, S, P, T, L = (
    "Exact",
    "Needs hooks",
    "Not reported",
    "Not checked",
    "Estimate",
    "Partial",
    "Totals only",
    "No line counts",
)


_STATE_WHY = {
    "Exact": "The tool's own records state this.",
    "Needs hooks": "Fills only when hooks or OTel export are on for this tool.",
    "Not reported": "The tool does not report this.",
    "Not checked": "No source for this was verified for this tool.",
    "Estimate": "Computed by aictl from other fields, not reported by the tool.",
    "Partial": "The tool reports this for only some records.",
    "Totals only": "The tool reports a total, not a value per agent.",
    "No line counts": "The tool records that a file changed, without line counts.",
    "No data": "The tool can report this, but the store holds no rows for it yet.",
}


# Row: key, label, the fact that proves data exists, then one state per tool in
# _COVERAGE_TOOLS order. From a survey of what each tool writes on disk or exports.
_COVERAGE_TABLE: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("agents_running", "Agents running", "sessions", (E, E, E, N, E, E)),
    ("subagents", "Subagents, parent", "subagents", (E, E, E, N, E, E)),
    ("usage_by_model", "Usage by model per agent", "requests", (E, E, E, N, E, E)),
    ("messages", "Message counts", "requests", (E, E, E, N, E, E)),
    ("cost", "Cost", "requests", (S, S, S, N, S, S)),
    ("input", "Input, no cache", "requests", (E, E, E, N, E, E)),
    ("output", "Output", "requests", (E, E, E, N, E, E)),
    ("cache_read", "Cache read", "cache_read", (E, P, E, N, E, E)),
    ("cache_write", "Cache write", "cache_write", (E, N, E, N, E, E)),
    ("project", "Project", "requests", (E, E, E, N, E, E)),
    ("prompt_text", "Prompt text", "prompt_text", (E, E, E, N, H, E)),
    ("prompt_files", "Prompt files, usage", "prompt_files", (U, E, E, N, E, U)),
    ("skills", "Skills used", "skills", (E, S, E, N, H, S)),
    ("confirms", "Confirmations", "confirms", (E, H, E, N, H, U)),
    # Microsoft 365 Copilot runs in the cloud: no process on this machine belongs to it.
    ("cpu", "CPU", "processes", (E, E, E, N, E, E)),
    ("ram", "RAM", "processes", (E, E, E, N, E, E)),
    ("memory_files", "AI memory files", "memory_files", (U, E, U, N, E, E)),
    ("file_changes", "File changes, diffs", "file_lines", (T, E, E, N, H, S)),
    ("test_runs", "Test runs", "tool_calls", (E, E, E, N, H, E)),
    ("tool_calls", "Tool calls by name", "tool_calls", (E, H, E, N, H, E)),
    ("tool_failures", "Tool failures", "tool_calls", (E, E, E, N, H, E)),
    ("api_errors", "API errors, rate limits", "requests", (E, H, E, N, E, E)),
    ("reply_latency", "Response latency", "reply_latency", (E, H, E, N, H, E)),
    ("ttft", "Time to first token", "ttft", (E, H, E, N, N, E)),
    ("tool_duration", "Tool duration", "tool_duration", (E, H, E, N, H, E)),
    ("turn_duration", "Turn, session duration", "prompts", (E, H, E, N, H, E)),
    ("loops", "Loops", "tool_calls", (S, S, S, N, S, S)),
)


_facts_memo: dict[tuple, tuple[float, dict[str, set[str]]]] = {}


_facts_inflight: dict[tuple, Future] = {}


_sources_memo: dict[tuple, tuple[float, list[tuple]]] = {}


_facts_lock = threading.Lock()


# Run independent reads in parallel when the reader has network latency.
PARALLEL_READ_WORKERS = 8


def _latency_bound(conn: Any) -> bool:
    return getattr(conn, "_live_latency_bound", False) is True


def _gather(conn: Any, calls: list) -> list:
    """The results of *calls*, in order; concurrently when each one waits on the cluster."""
    if len(calls) < 2 or not _latency_bound(conn):
        return [call() for call in calls]
    from concurrent.futures import ThreadPoolExecutor

    from ..stores.kusto.client import query_memory_error

    def attempt(call):
        try:
            return call(), None
        except Exception as exc:  # noqa: BLE001 - sorted out below, so the other reads finish
            return None, exc

    with ThreadPoolExecutor(
        max_workers=min(PARALLEL_READ_WORKERS, len(calls)), thread_name_prefix="board-read"
    ) as pool:
        outcomes = list(pool.map(attempt, calls))
    results = []
    for call, (result, error) in zip(calls, outcomes, strict=True):
        if error is None:
            results.append(result)
        elif query_memory_error(error):
            # A small cluster can run out of memory only because the reads ran together:
            # the read that failed runs once more, alone, before the page is refused.
            results.append(call())
        else:
            raise error
    return results


_FAILED = object()
# A board field whose value waits for a late section.
_LATE = object()


class _StagedReads:
    """Reads that all start together and are collected in stages, so early results can be used first.

    Like ``_gather``: on a cluster the calls run side by side, a read that ran out of
    query memory runs once more alone, and every read has finished when the block ends.
    """

    def __init__(self, conn: Any, calls: list) -> None:
        self._calls = calls
        self._pool: Any = None
        self._futures: list = []
        if len(calls) >= 2 and _latency_bound(conn):
            from concurrent.futures import ThreadPoolExecutor

            self._pool = ThreadPoolExecutor(
                max_workers=min(PARALLEL_READ_WORKERS, len(calls)), thread_name_prefix="board-read"
            )

    def __enter__(self) -> _StagedReads:
        if self._pool is not None:
            def attempt(call):
                try:
                    return call(), None
                except Exception as exc:  # noqa: BLE001 - sorted out in result(), so the other reads finish
                    return None, exc

            self._futures = [self._pool.submit(attempt, call) for call in self._calls]
        return self

    def __exit__(self, *_exc: Any) -> None:
        if self._pool is not None:
            self._pool.shutdown(wait=True)

    def result(self, index: int, errors: dict[int, Exception] | None = None) -> Any:
        """The result of call *index*. With *errors*, a store failure is recorded there and gives ``_FAILED``."""
        from ..stores.base import StoreError
        from ..stores.kusto.client import query_memory_error

        call = self._calls[index]
        try:
            if self._pool is None:
                return call()
            value, error = self._futures[index].result()
            if error is None:
                return value
            if not query_memory_error(error):
                raise error
            return call()
        except StoreError as exc:
            if errors is None:
                raise
            errors[index] = exc
            return _FAILED


# The board fields that need each optional section.
_LATE_FIELDS = {
    "skills_and_turns": ("latency", "prompts", "skills"),
    "changes": ("projects", "changes"),
    "loops": ("attention", "loops"),
}
LATE_FIELDS = tuple(sorted({field for fields in _LATE_FIELDS.values() for field in fields}))


def _activity_facts(history: HistoryScope) -> dict[str, set[str]]:
    facts: dict[str, set[str]] = defaultdict(set)
    for row in history.read("board.activity_facts"):
        facts[row["tool"]].add(row["fact"])
    return facts


def _store_facts(memo_key: str, history: HistoryScope) -> dict[str, set[str]]:
    """Per tool, which kinds of rows exist in the store. This changes rarely.

    The read scans the whole store, so a stale answer is returned at once and read
    again in the background. Only the first caller of a key waits; others share its read.
    """
    key = (memo_key, history.reader, history.node, history.qualified)
    with _facts_lock:
        cached = _facts_memo.get(key)
        pending = _facts_inflight.get(key)
        if cached is not None:
            if pending is None and time.monotonic() - cached[0] >= FACTS_TTL_S:
                _facts_inflight[key] = Future()
                threading.Thread(target=_refresh_facts_quietly, args=(key, history), daemon=True,
                                 name="board-facts").start()
            return cached[1]
        if pending is None:
            _facts_inflight[key] = Future()
    if pending is not None:
        return pending.result()
    return _refresh_facts(key, history)


def _refresh_facts(key: tuple, history: HistoryScope) -> dict[str, set[str]]:
    with _facts_lock:
        future = _facts_inflight[key]
    try:
        result = dict(_activity_facts(history))
    except BaseException as exc:
        with _facts_lock:
            _facts_inflight.pop(key, None)
        future.set_exception(exc)
        raise
    with _facts_lock:
        _facts_memo[key] = (time.monotonic(), result)
        if len(_facts_memo) > MEMO_MAX_KEYS:
            _facts_memo.pop(next(iter(_facts_memo)))
        _facts_inflight.pop(key, None)
    future.set_result(result)
    return result


def _refresh_facts_quietly(key: tuple, history: HistoryScope) -> None:
    try:
        _refresh_facts(key, history)
    except Exception:  # noqa: BLE001 - the stale facts stay in use
        logger.debug("board facts refresh failed", exc_info=True)


# Tools whose usage aictl reads from session files on disk. With a ``history_days`` limit only
# files changed in that window are read, so older usage that the store does not already hold is missing.
_FILE_HISTORY_TOOLS = ("copilot-vscode", "copilot-cli", "copilot-desktop", "claude-code", "codex-cli")


def coverage_notes(tool_ids: list[str]) -> list[dict]:
    """Limits of the data that the table cannot show in a cell."""
    from ..platforms import load_config

    days = load_config().history_days
    if days <= 0:
        return []
    return [
        {
            "tool": tool,
            "text": f"{_label(tool)}: usage from files older than {days} days is not in the store, unless aictl recorded it earlier. aictl reads session files changed in the last {days} days.",
        }
        for tool in _FILE_HISTORY_TOOLS
        if tool in tool_ids
    ]


def coverage_rows(facts: dict[str, set[str]], tool_ids: list[str]) -> list[dict]:
    """One row per data point: what each tool can report, and whether the store shows it."""
    ids = list(tool_ids) + [t for t in _COVERAGE_TOOLS if t not in tool_ids]
    rows = []
    for key, label, fact, states in _COVERAGE_TABLE:
        cells = {}
        for tool in ids:
            state = states[_COVERAGE_TOOLS.index(tool)] if tool in _COVERAGE_TOOLS else U
            kinds = facts.get(tool, ())
            present = fact in kinds
            if key == "file_changes" and not present and "file_writes" in kinds and state in (E, S, H):
                state = L
            elif state == H and present:
                state = E
            elif state in (E, S, P, T) and not present:
                state = "No data"
            cells[tool] = {"state": state, "why": _STATE_WHY[state]}
        rows.append({"key": key, "label": label, "cells": cells})
    return rows


def _source_rows(history: HistoryScope, memo_key: str) -> list[tuple]:
    key = (memo_key, id(history.reader), history.node)
    with _facts_lock:
        cached = _sources_memo.get(key)
        if cached and time.monotonic() - cached[0] < FACTS_TTL_S:
            return cached[1]
    rows = [(r["tool"], r["source"], r["last_ts"]) for r in history.read("board.sources")]
    with _facts_lock:
        _sources_memo[key] = (time.monotonic(), rows)
        if len(_sources_memo) > MEMO_MAX_KEYS:
            _sources_memo.pop(next(iter(_sources_memo)))
    return rows


def _sources(source_rows: list[tuple], tool_ids: list[str], selected: set[str] | None, *, reported: bool = False) -> list[dict]:
    rows: dict[str, dict] = {}
    for tool, source, last_ts in source_rows:
        if selected is not None and tool not in selected:
            continue
        row = rows.setdefault(tool, {"tool": tool, "label": _label(tool), "names": set(), "last_data_ts": last_ts})
        if source:
            row["names"].add(source)
        row["last_data_ts"] = max(row["last_data_ts"] or 0, last_ts or 0) or None
    rank = {tool: i for i, tool in enumerate(tool_ids)}
    ordered = sorted(rows.values(), key=lambda r: (rank.get(r["tool"], len(rank)), r["tool"]))
    return [
        {
            "tool": r["tool"],
            "label": r["label"],
            "data_from": ", ".join(sorted(r["names"])) or None,
            "last_data_ts": r["last_data_ts"],
            "locations": [] if reported else _tool_locations(r["tool"]),
        }
        for r in ordered
    ]


def _tool_locations(tool: str) -> list[dict]:
    """The tool's home folders found on this machine, and how each was found."""
    from .. import tool_homes

    family = "copilot" if tool.startswith("copilot") else "claude" if tool.startswith("claude-code") else "codex" if tool.startswith("codex") else ""
    if not family:
        return []
    return [{"path": _display_folder(h.path), "found_by": h.found_by} for h in tool_homes.homes(family)]


def _reported_as(cells: Iterable[_Cell]) -> dict[str, list[dict]]:
    """Each canonical model id's stored spellings, with the tools that reported each one."""
    spellings: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    for c in cells:
        spellings[c.model][c.reported or c.model].add(c.tool)
    return {
        model: [{"id": spelling, "tools": sorted(tools - {""})} for spelling, tools in sorted(seen.items())]
        for model, seen in spellings.items()
    }


# The owner's order of tools in the Tool menu and the coverage table; others follow by tokens.
TOOL_PRIORITY = ("copilot-cli", "copilot-desktop", "copilot-vscode", "claude-code")


def _options(board: _Board, stored_tools: Iterable[str] = ()) -> dict:
    """The filter menus, from the time range alone so a filter never hides its own choices.

    The Tool menu also lists every tool with any stored session (``stored_tools``, from
    board.sources) or a live process, with 0 agents when none ran in the time range.
    """
    tool_agents: dict[str, set[str]] = defaultdict(set)
    tool_tokens: dict[str, int] = defaultdict(int)
    project_agents: dict[str, set[str]] = defaultdict(set)
    project_names: dict[str, str] = {}
    model_agents: dict[str, set[str]] = defaultdict(set)

    def project_name(path: str) -> str:
        return project_names.setdefault(project_key(path), path)

    for c in board.all_cells:
        agent = _agent_key(c.sid, c.aid)
        tool_agents[c.tool].add(agent)
        tool_tokens[c.tool] += c.i + c.o + c.cr + c.cw
        project_agents[project_name(c.project)].add(agent)
        model_agents[c.model].add(agent)
    for sid, agents in board.agents_by_root.items():
        if not sid:
            continue
        keys = {sid, *agents}
        tool_agents[board.session_tool.get(sid, "")].update(keys)
        project_agents[project_name(board.session_project.get(sid, ""))].update(keys)
    # A running tool with no session in this time is still a choice in the Tool menu.
    for group in board.placeholders:
        tool_agents[group["tool"]].update(())
    for live in board.live_sessions:
        if live.get("tool") and not live.get("ended"):
            tool_agents[str(live["tool"])].update(())
    for tool in stored_tools:
        if tool and not is_unattributed(tool):
            tool_agents[tool].update(())
    tool_agents.pop("", None)
    project_agents.pop("", None)
    model_agents.pop("", None)

    def ordered(groups: dict[str, set[str]]) -> list[dict]:
        return [{"id": k, "agents": len(v)} for k, v in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))]

    rank = {tool: i for i, tool in enumerate(TOOL_PRIORITY)}
    tools = sorted(tool_agents.items(), key=lambda kv: (
        rank.get(kv[0], len(rank)), -tool_tokens.get(kv[0], 0), -len(kv[1]), kv[0]))
    reported = _reported_as(board.all_cells)
    return {
        "tools": [{"id": k, "label": _label(k), "agents": len(v)} for k, v in tools],
        "projects": ordered(project_agents),
        "models": [m | {"reported_as": reported.get(m["id"], [])} for m in ordered(model_agents)],
    }


def _count_agents(board: _Board, sids: Iterable[str]) -> int:
    return sum(1 + sum(1 for a in board.agents_by_root.get(sid, ()) if a != sid) for sid in sids)


def compute_board(
    db: Any,
    filters: Filters,
    snapshot: Any = None,
    now: float | None = None,
    *,
    history: HistoryScope | None = None,
    charts_only: bool = False,
    on_partial: Any = None,
    field_errors: dict[str, str] | None = None,
) -> dict:
    """Project one history window for the live board or a historical read.

    *on_partial(fields, pending)*, when given, receives the board fields that are complete
    before the slower sections finish; *pending* names the fields still to come (``LATE_FIELDS``).
    A field is in *fields* only when every input it is computed from is complete.

    *field_errors*, when given, makes the optional sections of ``_LATE_FIELDS`` optional: a
    store failure in one leaves its fields out of the board and names them here with the
    reason. Without it, any failed read fails the whole board.
    """
    history = history or HistoryScope.local(db)
    now = time.time() if now is None else now
    history.require_reader()
    from types import SimpleNamespace

    conn = SimpleNamespace(_reported_history=history.qualified, _live_latency_bound=True,
                           _live_projection=getattr(db, "_live_projection", False) is True)
    memo_key = str(getattr(db, "_path", "memory"))
    facts = _store_facts(memo_key, history)
    board = _Board(conn, filters, now, snapshot, facts=facts, history=history).load(charts_only=charts_only)

    # The sections read the loaded board and the store; none changes the board, so on a
    # cluster they run side by side. The charts need neither the rows nor the comparison.
    # The early sections come first: the board can be shown from them while the late ones run.
    def skills_and_turns() -> tuple[list[tuple], _Turns]:
        rows = _skill_rows(board)
        return rows, _turns(board, rows)

    early = [
        lambda: _latency(board),
        lambda: _tools_section(board),
        lambda: _errors_section(board),
        lambda: _tests_section(board),
        lambda: _resource_series(board),
    ]
    late = {
        "skills_and_turns": skills_and_turns,
        "changes": lambda: _changes_section(board),
        "loops": lambda: _loop_rows(board),
    }
    calls = early if charts_only else [*early, board.agents, *late.values()]
    with _StagedReads(conn, calls) as reads:
        latency, tool_section, errors_section, tests_section, resources = (
            reads.result(i) for i in range(len(early)))
        agents = [] if charts_only else reads.result(len(early))
        early_fields, complete = _board_payload(db, board, history, facts, memo_key, now, agents, latency,
                                                tool_section, errors_section, tests_section, resources, charts_only)
        if complete is None:
            return early_fields
        if on_partial is not None:
            on_partial(early_fields, list(LATE_FIELDS))
        failures: dict[int, Exception] | None = None if field_errors is None else {}
        first = len(early) + 1
        results = {name: reads.result(first + i, failures) for i, name in enumerate(late)}
    for i, name in enumerate(late):
        if field_errors is not None and failures and (error := failures.get(first + i)) is not None:
            reason = str(error) or type(error).__name__
            logger.warning("Board section %s failed; its fields are left out: %s", name, mask_secrets(reason)[:600])
            field_errors.update(dict.fromkeys(_LATE_FIELDS[name], reason))
    return complete(results)


def _board_payload(db: Any, board: _Board, history: HistoryScope, facts: dict, memo_key: str, now: float,
                   agents: list[dict], latency: dict, tool_section: dict, errors_section: tuple,
                   tests_section: tuple, resources: tuple, charts_only: bool) -> tuple[dict, Any]:
    """The board fields that need no late section, and the function that completes the board from the late ones.

    For the charts alone, the chart fields and no function.
    """
    f = board.f
    tool_calls_bucket = tool_section["calls_bucket"]
    tool_fail_bucket = tool_section["fail_bucket"]
    tool_spark = {"spark_calls": tool_section["spark_calls"], "spark_failed": tool_section["spark_failed"]}
    errors, api_bucket, api_by_project = errors_section
    tests, tests_passed, tests_failed, tests_by_project = tests_section
    tests_piped = sum(
        1
        for sid, _aid, _ts, _name, target, is_error, exit_code, _duration in board.test_rows
        if sid in board.scope
        and not _test_failed(is_error, exit_code)
        and _PIPED_TO_FILTER_RE.search(target or "")
        and "pipefail" not in (target or "")
    )
    cpu, mem = resources

    # Prompts per bucket and per project.
    n = f.buckets
    user_bucket = list(board.fallback_user_buckets)
    user_spark = [0] * SPARK_POINTS
    prompts_by_project: dict[str, int] = defaultdict(int)
    prompt_total = 0
    for sid, _aid, b, s, count, _tool, _project in board.prompt_rows:
        if sid in board.scope:
            user_bucket[b] += count
            user_spark[s] += count
            prompts_by_project[board.session_project.get(sid, "")] += count
            prompt_total += count
    fallback_user_total = sum(board.fallback_user.values())
    for c in board.cells:
        if c.estimated:
            user_spark[c.s] += c.user
    for c in board.cells:
        if c.estimated:
            tool_spark["spark_calls"][c.s] += c.tools_fallback
    for i, value in enumerate(board.fallback_tool_buckets):
        tool_calls_bucket[i] += value

    # Agents' tool numbers per project and per role.
    calls_by_project: dict[str, int] = defaultdict(int)
    fails_by_project: dict[str, int] = defaultdict(int)
    role_rows: dict[str, dict] = defaultdict(
        lambda: {"runs": 0, "msgs": 0, "input": 0, "tokens": 0, "cost": None, "calls": 0, "failed": 0}
    )
    calls_total = 0
    failures_total = 0
    agents_by_project: dict[str, set[str]] = defaultdict(set)
    for sid in board.scope:
        project = board.session_project.get(sid, "")
        for agent in {sid, *board.agents_by_root.get(sid, ())}:
            agents_by_project[project].add(agent)
            agg = board.tool_agg.get((sid, agent))
            own_calls = agg.n if agg else 0
            own_fails = agg.errs if agg else 0
            usage = board.by_key.get((sid, agent))
            kind = "Main agents" if agent == sid else board.agent_kind(sid, agent)
            role = role_rows[kind]
            role["runs"] += 1
            fallback_calls = board.fallback_tools.get(sid, 0) if agent == sid else 0
            fallback_user = board.fallback_user.get(sid, 0) if agent == sid else 0
            role["msgs"] += (usage.calls if usage else 0) + own_calls + fallback_calls + fallback_user
            role["msgs"] += board.prompt_agg.get((sid, agent), 0)
            role["calls"] += own_calls
            role["failed"] += own_fails
            if usage:
                role["tokens"] += usage.tokens
                if usage.cost is not None:
                    role["cost"] = (role["cost"] or 0.0) + usage.cost
            calls_by_project[project] += own_calls + fallback_calls
            fails_by_project[project] += own_fails
            calls_total += own_calls + fallback_calls
            failures_total += own_fails

    # Which null rule applies to the whole board.
    scope_tools = {board.session_tool.get(sid, "") for sid in board.scope}
    calls_known = bool(scope_tools & board.tools_with_calls) or bool(calls_total)
    tool_calls_kpi = calls_total if calls_known else None
    failures_kpi = failures_total if bool(scope_tools & board.tools_with_calls) else None
    user_known = bool(scope_tools & board.tools_with_prompts) or bool(fallback_user_total)
    messages_total = board.total.calls + prompt_total + fallback_user_total + calls_total

    # Spark lines.
    running_spark = [len(sessions) for sessions in board.spark_sessions]
    loop_spark = [0] * SPARK_POINTS
    for loop in board.visible_loops:
        loop_spark[board._spark_of(loop["since_ts"])] += 1
    kpis = {
        "running": sum(1 for sid in board.scope if board.status.get(sid) in ACTIVE_STATUSES),
        "idle": sum(1 for sid in board.scope if board.status.get(sid) == "idle"),
        "subagents_running": sum(
            1
            for sid in board.scope
            for agent in board.agents_by_root.get(sid, ())
            if agent != sid and board.sub_status.get((sid, agent)) in ACTIVE_STATUSES
        ),
        "messages": messages_total,
        "tokens": board.total.tokens,
        "cached_share": board.total.cached_share,
        "cost_usd": _usd(board.total.cost),
        "tool_calls": tool_calls_kpi,
        "failures": failures_kpi,
        "fail_rate": _ratio(failures_kpi, tool_calls_kpi),
        "p50_ms": _ms(_percentile(latency["replies"], 0.50)),
        "p95_ms": _ms(_percentile(latency["replies"], 0.95)),
        "loops": len(board.visible_loops),
        "spark": {
            "running": running_spark,
            "messages": [
                board.spark[i].calls + user_spark[i] + tool_spark["spark_calls"][i] for i in range(SPARK_POINTS)
            ],
            "tokens": [board.spark[i].tokens for i in range(SPARK_POINTS)],
            "cached": [board.spark[i].cached_share for i in range(SPARK_POINTS)],
            "cost": [_usd(board.spark[i].cost) for i in range(SPARK_POINTS)],
            "tool_calls": tool_spark["spark_calls"],
            "failures": tool_spark["spark_failed"],
            "p95": [_ms(_percentile(latency["by_spark"][i], 0.95)) for i in range(SPARK_POINTS)],
            "loops": loop_spark,
        },
    }

    reported = _reported_as(board.cells)
    by_model = [
        {
            "model": model,
            "reported_as": reported.get(model, []),
            "agents": len(board.model_agents[model]),
            "msgs": usage.calls,
            "tokens": usage.tokens,
            "input": usage.input,
            "output": usage.output,
            "cache_read": usage.cache_read,
            "cache_write": _reported(usage.cache_write, board.model_tools[model], _NO_CACHE_WRITE),
            "cached_share": usage.cached_share,
            "cost_usd": _usd(usage.cost),
            "p95_ms": _ms(_percentile(latency["by_model"].get(model, []), 0.95)),
            "agent_ids": sorted(board.model_agents[model])[:MAX_AGENT_IDS],
        }
        for model, usage in sorted(board.by_model.items(), key=lambda kv: (-kv[1].tokens, kv[0]))[:MAX_LIST_ROWS]
    ]

    by_role = [
        {
            "kind": kind,
            "runs": role["runs"],
            "msgs": role["msgs"],
            "tokens": role["tokens"],
            "cost_usd": _usd(role["cost"]),
            "fail_rate": _ratio(role["failed"], role["calls"]),
        }
        for kind, role in sorted(role_rows.items(), key=lambda kv: (kv[0] != "Main agents", -kv[1]["tokens"], kv[0]))[:MAX_LIST_ROWS]
    ]

    loops_by_project: dict[str, int] = defaultdict(int)
    for loop in board.visible_loops:
        loops_by_project[board.session_project.get(loop["session_id"], "")] += 1
    project_ids = set(board.by_project) | {board.session_project.get(sid, "") for sid in board.scope}

    def project_rows(lines_by_project: dict) -> list[dict]:
        return sorted(
            (project_row(project, lines_by_project.get(project)) for project in project_ids),
            key=lambda p: (-p["tokens"], -p["agents"], p["project"]),
        )

    def project_row(project: str, lines: tuple | None) -> dict:
        usage = board.by_project.get(project)
        calls = calls_by_project.get(project, 0)
        fails = fails_by_project.get(project, 0)
        test_counts = tests_by_project.get(project)
        project_msgs = (usage.calls if usage else 0) + prompts_by_project.get(project, 0) + calls
        project_msgs += sum(
            board.fallback_user.get(sid, 0) for sid in board.scope if board.session_project.get(sid, "") == project
        )
        return {
            "project": project,
            "agents": len(agents_by_project.get(project, ())),
            "prompts": prompts_by_project.get(project, 0) if user_known else None,
            "msgs": project_msgs,
            "tokens": usage.tokens if usage else 0,
            "cached_share": usage.cached_share if usage else None,
            "cost_usd": _usd(usage.cost) if usage else None,
            "tool_calls": calls if calls_known else None,
            "fail_rate": _ratio(fails, calls) if failures_kpi is not None else None,
            "test_runs": test_counts[0] if test_counts else (0 if calls_known else None),
            "test_passed": test_counts[1] if test_counts else (0 if calls_known else None),
            "lines_added": lines[0] if lines else None,
            "lines_removed": lines[1] if lines else None,
            "api_errors": api_by_project.get(project, 0),
            "loops": loops_by_project.get(project, 0),
            "p95_ms": _ms(_percentile(latency["by_project"].get(project, []), 0.95)),
        }

    series = {
        "tokens": {
            "cache_read": [u.cache_read for u in board.bucket],
            "input": [u.input for u in board.bucket],
            "cache_write": [_reported(u.cache_write, scope_tools, _NO_CACHE_WRITE) for u in board.bucket],
            "output": [u.output for u in board.bucket],
        },
        "cost": {
            "by_tool": {
                t: [_usd(v) for v in board.cost_by_tool[t]] for t in board.tool_order if t in board.cost_by_tool
            },
            "by_project": {
                p: [_usd(v) for v in values]
                for p, values in sorted(board.cost_by_project.items(), key=lambda kv: -board.by_project[kv[0]].tokens)
            },
            "by_model": {
                m: [_usd(v) for v in values]
                for m, values in sorted(board.cost_by_model.items(), key=lambda kv: -board.by_model[kv[0]].tokens)
            },
        },
        "messages": {
            "user": user_bucket if user_known else [None] * n,
            "assistant": [u.calls for u in board.bucket],
            "tool": tool_calls_bucket if calls_known else [None] * n,
        },
        "cached_share": [u.cached_share for u in board.bucket],
        "latency": {
            "p50": [_ms(_percentile(v, 0.50)) for v in latency["by_bucket"]],
            "p95": [_ms(_percentile(v, 0.95)) for v in latency["by_bucket"]],
        },
        "failures": {"tool": tool_fail_bucket, "api": api_bucket},
        "tests": {"passed": tests_passed, "failed": tests_failed},
        "cpu": cpu,
        "mem": mem,
    }
    chart_fields = {"range": {
        "since": f.since, "until": f.until, "bucket_s": f.bucket_s,
        "bucket_starts": [f.since + i * f.bucket_s for i in range(n)],
        "partial_bucket": n - 1 if f.until > now and n else None,
    }, "series": series}
    if charts_only:
        return chart_fields, None

    runs = []
    historical = history.qualified
    run_rows = (board._agent_row(sid, aid, "", []) for sid in board.scope for aid in board.agents_by_root[sid]) if historical else agents
    for row in run_rows:
        if row["started_at"] and row["ended_at"] and row["ended_at"] > row["started_at"]:
            runs.append((row["ended_at"] - row["started_at"]) * 1000.0)

    def latency_rows(turns: _Turns) -> list[dict]:
        return [
            _latency_row("Model reply", latency["replies"], latency["reply_count"], latency["reply_max"]),
            _latency_row(
                "Time to first token",
                latency["firsts"],
                _reported(latency["first_count"], scope_tools, _NO_TTFT),
                latency["first_max"],
            ),
            _latency_row("Tool call", tool_section["durations"], tool_section["timed"], tool_section["longest"]),
            _latency_row("Whole turn", turns.lengths_ms, turns.count),
            _latency_row("Agent run", sorted(runs)),
        ]

    tool_order = list(board.tool_order)
    source_rows = _source_rows(history, memo_key)
    options = _options(board, (tool for tool, _source, _ts in source_rows))
    option_tools = [o["id"] for o in options["tools"]]
    selected = set(stored_ids_for(f.tools)) if f.tools is not None else None
    project_list = sorted(project_ids - {""})
    project_prompts, prompts_searched = _project_prompts(board, project_list)

    from ..orchestrator import tool_configs_at

    payload = {
        "generated_at": now,
        # When the settings records last changed: the settings screen reads them again on a new value.
        "settings_at": None if historical else tool_configs_at(),
        "capture_mode": None if historical else capture_mode(db, default="full"),
        **chart_fields,
        "options": options,
        "scope": {
            "shown_agents": _count_agents(board, board.scope),
            "shown_sessions": sum(1 for sid in board.scope if sid in board.agents_by_root),
            "all_agents": _count_agents(board, (sid for sid in board.agents_by_root if sid)),
        },
        "kpis": kpis,
        "attention": _LATE,
        "agents": agents,
        "by_model": by_model,
        "by_role": by_role,
        "saved_usd": _usd(board.total.saved),
        "unpriced": _unpriced_section(board),
        "credits": _credits_section(board),
        "projects": _LATE,
        "prompts": _LATE,
        "project_prompts": project_prompts,
        "project_prompts_searched": prompts_searched,
        "skills": _LATE,
        "tests_piped": tests_piped,
        "prompts_total": sum(n for sid, _, _, _, n, _, _ in board.prompt_rows if not board.narrowed or sid in board.scope),
        "tools": tool_section["rows"],
        "confirms": _confirms_section(board, tool_section["calls_by_name"]),
        "errors": errors,
        "latency": _LATE,
        "loops": _LATE,
        "changes": _LATE,
        "tests": tests,
        "memory_files": _memory_files(board),
        "processes": _processes(board),
        # Names for tools that have processes but no activity in this range.
        "tool_labels": {tool: _label(tool) for tool in {p["tool"] for p in _processes(board)} | set(cpu)},
        "sources": _sources(source_rows, tool_order or option_tools, selected,
                            reported=historical),
        "coverage": {"rows": coverage_rows(facts, option_tools), "notes": coverage_notes([*option_tools, *_COVERAGE_TOOLS])},
        "self": None if historical else _self_section(db),
    }

    def complete(results: dict[str, Any]) -> dict:
        """The whole board from the late sections; a section that failed leaves its fields out."""
        late: dict[str, Any] = {}
        if (section := results["skills_and_turns"]) is not _FAILED:
            skill_rows, turns = section
            late |= {"latency": latency_rows(turns), "prompts": _prompts_section(board, turns.tokens),
                     "skills": _skills_section(board, skill_rows, turns)}
        if (section := results["changes"]) is not _FAILED:
            changes, lines_by_project = section
            late |= {"projects": project_rows(lines_by_project)[:MAX_LIST_ROWS], "changes": changes}
        if (loops := results["loops"]) is not _FAILED:
            late |= {"attention": _attention(board, loops, agents), "loops": loops}
        whole = {}
        for name, value in payload.items():
            if value is _LATE:
                if name in late:
                    whole[name] = late[name]
            else:
                whole[name] = value
        return whole

    return {name: value for name, value in payload.items() if value is not _LATE}, complete
