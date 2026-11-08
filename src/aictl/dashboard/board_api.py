# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Data behind the panel dashboard: ``/api/board`` and its detail routes.

Every number comes from the fact tables. ``requests`` is the only source of
token totals and time series; a session with usage in ``session_usage`` and no
``requests`` row enters through one fallback row at ``last_activity_at``, marked
``estimated``.

A value the data cannot supply is ``None``, never 0. Costs are list-price
estimates from :mod:`aictl.data.model_pricing`; the amount a tool reports is not
used, because not every tool reports dollars.

SQL does the aggregation. Python only rolls up small result sets, so the cost
of a request grows with the number of sessions and not with the number of calls.
The exception is latency: a percentile needs the values themselves.
"""

from __future__ import annotations

import bisect
import contextlib
import difflib
import functools
import hashlib
import inspect
import json
import logging
import math
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import threading
import time
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from pathlib import Path, PureWindowsPath
from typing import Any
from urllib.parse import parse_qs

from ..context_audit import _git_states, _path_key, _redact, skill_description, skill_field, skill_locations
from ..data.model_pricing import request_cost_usd, resolve_pricing
from ..ingesters._common import project_key, project_root
from ..storage import EventRow, _session_uuid
from ..tool_scope import is_unattributed, normalize_selection, stored_ids_for
from ..tools import TOOL_LABELS
from .analytics import _day_span
from .api_handlers import self_usage

logger = logging.getLogger(__name__)

ACTIVE_WINDOW_S = 900.0
SPARK_POINTS = 12
DEFAULT_BUCKETS = 48
MAX_BUCKETS = 240
DEFAULT_RANGE_S = 7 * 86400.0
MAX_AGENT_ROWS = 200
MAX_PROMPTS = 100
MAX_DETAIL_ROWS = 200
MAX_LIST_ROWS = 200
MAX_LOOP_ROWS = 50
MAX_AGENT_IDS = 50
MAX_DIFF_LINES = 500
PROMPT_PREVIEW_CHARS = 240
TITLE_CHARS = 80
STATUSES = ("all", "active", "running", "looping", "waiting", "idle", "ended", "failed")
ACTIVE_STATUSES = ("running", "looping", "waiting")
# Idle: the process is alive or the session is recent, but its turn ended and nothing runs.
LIVE_STATUSES = (*ACTIVE_STATUSES, "idle")
_TURN_ENDED_REASONS = ("end_turn", "stop", "stop_sequence")
IDLE_AFTER_S = 120.0
# Percentiles look at no more than about this many values. The sample is every
# k-th row by id, and a group the sample leaves thin is read in full.
MAX_LATENCY_VALUES = 10_000
MIN_GROUP_SAMPLE = 20
MAX_TURN_SAMPLE = 500
SELF_TTL_S = 10.0
# An answer that differs only in clock-driven or live load numbers is served again for this long.
RESEND_AFTER_S = 60.0
# A polled answer comes from memory: a newer one is computed behind it, this often at most.
REFRESH_MIN_S = 10.0
# A background refresh waits this many times as long as the last one took, so a slow
# range on a big database uses at most about a tenth of one core while the page polls.
REFRESH_REST_RATIO = 10.0
MAX_STALE_S = 60.0
CLOCK_RANGE_SLACK_S = 120.0
MEMO_TTL_S = 15.0
MEMO_MAX_KEYS = 8
FACTS_TTL_S = 60.0
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
# A row with this name is a confirmation with no tool call, such as an extension asking for access.
_IS_CALL_SQL = "substr(tool_name, 1, 11) <> 'permission:'"


class BoardRequestError(ValueError):
    """A request parameter the board cannot use."""


# ─── Filters ──────────────────────────────────────────────────────


@dataclass(frozen=True)
class Filters:
    since: float
    until: float
    tools: tuple[str, ...] | None = None
    project: str = ""
    model: str = ""
    status: str = "all"
    q: str = ""
    buckets: int = DEFAULT_BUCKETS

    @property
    def bucket_s(self) -> float:
        return (self.until - self.since) / self.buckets

    @property
    def spark_s(self) -> float:
        return (self.until - self.since) / SPARK_POINTS

    @property
    def grid(self) -> int:
        """Finest time grid: every time bucket and every spark bucket is a whole number of steps."""
        return self.buckets * SPARK_POINTS // math.gcd(self.buckets, SPARK_POINTS)

    @property
    def narrowed(self) -> bool:
        return self.tools is not None or bool(self.project or self.model or self.q) or self.status != "all"


def parse_filters(query: str, now: float) -> Filters:
    """Filters from a raw query string. Raises BoardRequestError on a bad value."""
    qs = parse_qs(query, keep_blank_values=True)

    def one(key: str) -> str:
        return (qs.get(key) or [""])[0].strip()

    def number(key: str, default: float) -> float:
        raw = one(key)
        if not raw:
            return default
        try:
            value = float(raw)
        except ValueError as exc:
            raise BoardRequestError(f"{key} must be a number") from exc
        if not math.isfinite(value):
            raise BoardRequestError(f"{key} must be a number")
        return value

    until = number("until", now)
    since = number("since", until - DEFAULT_RANGE_S)
    if since >= until:
        raise BoardRequestError("since must be before until")
    status = one("status") or "all"
    if status not in STATUSES:
        raise BoardRequestError("status must be one of " + "|".join(STATUSES))
    tools = None
    if "tool" in qs:
        tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(","))
    buckets = int(number("buckets", DEFAULT_BUCKETS))
    if buckets < 1:
        raise BoardRequestError("buckets must be at least 1")
    return Filters(
        since=since,
        until=until,
        tools=tools,
        project=one("project"),
        model=one("model"),
        status=status,
        q=one("q")[:200],
        buckets=min(buckets, MAX_BUCKETS),
    )


# ─── Small helpers ────────────────────────────────────────────────

_EXTRA_SECRET_RE = re.compile(
    r"(?i)\b(bearer\s+)[a-z0-9._~+/-]{8,}=*"
    r"|\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{4,}"
    r"|\bAIza[0-9A-Za-z_-]{20,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
)


def mask_secrets(text: str | None) -> str:
    """Text with values that look like secrets replaced."""
    if not text:
        return ""
    text = _redact(text)
    return _EXTRA_SECRET_RE.sub(lambda m: f"{m.group(1) or ''}<redacted>", text)


def _one_line(text: str | None, limit: int) -> str:
    clean = " ".join(mask_secrets(text).split())
    return clean[: limit - 1] + "…" if len(clean) > limit else clean


def _percentile(ordered: list[float], p: float) -> float | None:
    """Nearest-rank percentile of a sorted list, or None for an empty one."""
    if not ordered:
        return None
    return ordered[max(0, math.ceil(p * len(ordered)) - 1)]


def _weighted_percentile(pairs: list[tuple[float, int]], p: float) -> float | None:
    """Nearest-rank percentile of sorted (value, count) pairs."""
    total = sum(n for _, n in pairs)
    if not total:
        return None
    rank = max(1, math.ceil(p * total))
    seen = 0
    for value, n in pairs:
        seen += n
        if seen >= rank:
            return value
    return pairs[-1][0]


def _ms(value: float | None) -> float | None:
    return None if value is None else round(value, 1)


def _usd(value: float | None) -> float | None:
    return None if value is None else round(value, 6)


def _ratio(part: float | None, whole: float | None) -> float | None:
    if part is None or not whole:
        return None
    return round(part / whole, 4)


def _label(tool: str) -> str:
    return TOOL_LABELS.get(tool, tool)


def _short(identifier: str) -> str:
    return identifier.rsplit(":", 1)[-1][:8] if identifier else ""


def _basename(path: str) -> str:
    return re.split(r"[\\/]", path.rstrip("\\/"))[-1] if path else ""


def _names_another_machine(path: str) -> bool:
    return PureWindowsPath(path).drive.startswith("\\\\")


# ─── Pricing ──────────────────────────────────────────────────────

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


def _cost_of(stored: float | None, model: str, i: float, o: float, cr: float, cw: float, ts: float) -> float | None:
    """The cost stored per call, which knows the cache tier and speed, or else list price."""
    return stored if stored else _list_cost(model, i, o, cr, cw, ts)[0]


def _long_threshold(model: str) -> int:
    pricing = _rates_for(model)
    return pricing.long_threshold if pricing is not None else 0


# ─── Classification ───────────────────────────────────────────────

_COMMAND_TOOL_RE = re.compile(r"(?i)bash|shell|terminal|powershell|exec_?command|run_?command|execute_?command")
_EDIT_TOOL_RE = re.compile(r"(?i)edit|write|patch|replace|create_?file|insert")
_MCP_TOOL_RE = re.compile(r"^mcp(__|_|\.|:)|^[\w.-]+/[\w.-]+$")
_ENV_ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
_SEGMENT_SPLIT_RE = re.compile(r"&&|\|\||[;|&\n]")
_WRAPPERS = {"time", "sudo", "env", "command", "npx", "bunx", "exec", "nice", "do", "then", "else", "{"}
_ASSIGN_FROM_COMMAND_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*=\$\([^)]*\)")
_PIPED_TO_FILTER_RE = re.compile(r"\|\s*(?:tail|head|grep|tee|sed|awk|cut|sort|uniq|wc|less|cat)\b")
_RUNNER_WRAPPERS = {("uv", "run"), ("poetry", "run"), ("pipenv", "run"), ("pnpm", "exec"), ("yarn", "exec"), ("pdm", "run")}
# unittest is only reached as python -m unittest.
_TEST_ONE_WORD = {"pytest", "vitest", "jest", "tox", "ctest", "unittest"}
# Wrappers that take a duration before the command: timeout 300 cargo test.
_TIMEOUT_WRAPPERS = {"timeout", "gtimeout"}
_DURATION_RE = re.compile(r"^\d+(\.\d+)?[smhd]?$")
_TEST_TWO_WORDS = {
    ("npm", "test"),
    ("pnpm", "test"),
    ("yarn", "test"),
    ("go", "test"),
    ("cargo", "test"),
    ("make", "test"),
    ("dotnet", "test"),
    ("mvn", "test"),
    ("gradle", "test"),
    ("gradlew", "test"),
}
_TEST_LIKE_SQL = "(target LIKE '%test%' OR target LIKE '%jest%' OR target LIKE '%tox%')"


def _program(word: str) -> str:
    """A command word without its directory or a Windows launcher extension."""
    name = re.split(r"[\\/]", word)[-1].lower()
    return re.sub(r"\.(exe|cmd|bat)$", "", name)


def is_test_command(target: str | None) -> bool:
    """True when a segment of a shell command starts a known test runner.

    ``grep pytest log`` and ``cat pytest.ini`` mention a runner without running it.
    """
    if not target:
        return False
    for segment in _SEGMENT_SPLIT_RE.split(_ASSIGN_FROM_COMMAND_RE.sub(" ", target)):
        # A line continuation leaves a backslash on the last word of the line.
        words = [w for w in (word.rstrip("\\") for word in segment.replace("(", " ").split()) if w]
        while words and (_ENV_ASSIGN_RE.match(words[0]) or _program(words[0]) in _WRAPPERS or _program(words[0]) in _TIMEOUT_WRAPPERS):
            if _program(words[0]) in _TIMEOUT_WRAPPERS:
                words.pop(0)
                while words and words[0].startswith("-"):
                    # -k and -s take a value: timeout -k 5 1m cmd.
                    takes_value = words[0] in ("-k", "-s", "--kill-after", "--signal")
                    words.pop(0)
                    if takes_value and words:
                        words.pop(0)
                if words and _DURATION_RE.match(words[0]):
                    words.pop(0)
                continue
            words.pop(0)
        if len(words) >= 2 and (_program(words[0]), words[1]) in _RUNNER_WRAPPERS:
            words = words[2:]
        # A variable that holds an interpreter: $PY -m pytest.
        if len(words) >= 3 and (_program(words[0]).startswith("python") or words[0].startswith("$")) and words[1] == "-m":
            words = words[2:]
        if not words:
            continue
        first = _program(words[0])
        if first in _TEST_ONE_WORD:
            return True
        if len(words) >= 2 and (first, words[1]) in _TEST_TWO_WORDS:
            return True
    return False


def is_command_tool(name: str | None) -> bool:
    return bool(name and _COMMAND_TOOL_RE.search(name)) and not is_server_tool(name)


def is_edit_tool(name: str | None) -> bool:
    return bool(name and _EDIT_TOOL_RE.search(name)) and not is_server_tool(name)


def is_server_tool(name: str | None) -> bool:
    return bool(name and _MCP_TOOL_RE.search(name))


def _test_failed(is_error: int, exit_code: int | None) -> bool:
    """A test run passed when is_error is 0 and exit_code is 0 or null."""
    return bool(is_error) or exit_code not in (0, None)


@dataclass
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


# ─── Row rollups ──────────────────────────────────────────────────


class _Usage:
    __slots__ = ("calls", "input", "output", "cache_read", "cache_write", "cost", "saved", "errors")

    def __init__(self) -> None:
        self.calls = self.input = self.output = self.cache_read = self.cache_write = self.errors = 0
        self.cost: float | None = None
        self.saved: float | None = None

    def add(self, cell: _Cell) -> None:
        self.calls += cell.n
        self.input += cell.i
        self.output += cell.o
        self.cache_read += cell.cr
        self.cache_write += cell.cw
        self.errors += cell.errs
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


class _BaseMemo:
    """What one read of the time window produced, for the next change of filter."""

    def __init__(self, keep: int = 2) -> None:
        self._keep = keep
        self._lock = threading.Lock()
        self._entries: dict[tuple, dict] = {}

    def get(self, key: tuple | None) -> dict | None:
        with self._lock:
            return self._entries.get(key)

    def put(self, key: tuple | None, value: dict) -> None:
        with self._lock:
            self._entries[key] = value
            while len(self._entries) > self._keep:
                self._entries.pop(next(iter(self._entries)))


# Set by Board.load before the filters apply, and never changed after that.
_BASE_ATTRS = (
    "cells",
    "tool_agg",
    "prompt_agg",
    "prompt_rows",
    "meta",
    "sub_rows",
    "session_tool",
    "session_project",
    "live_by_sid",
    "placeholders",
    "pid_cpu",
    "test_rows",
    "failure_rows",
    "confirm_rows",
    "loops",
    "status",
    "sub_status",
    "last_activity",
    "agents_by_root",
)


class _Board:
    """One computation of the board for one set of filters."""

    def __init__(
        self,
        conn: sqlite3.Connection,
        filters: Filters,
        now: float,
        snapshot: Any = None,
        only_session: str | None = None,
        facts: dict[str, set[str]] | None = None,
    ) -> None:
        self.conn = conn
        self.f = filters
        self.now = now
        self.snapshot = snapshot
        self.only_session = only_session
        self.narrowed = filters.narrowed or only_session is not None
        self.b_of = [g * filters.buckets // filters.grid for g in range(filters.grid)]
        self.s_of = [g * SPARK_POINTS // filters.grid for g in range(filters.grid)]
        self.failure_rows: list[tuple] = []
        self.spans: dict[str, tuple[float | None, float | None]] = {}
        self.live_sessions: list[dict] = list(getattr(snapshot, "sessions", None) or [])
        self.cells: list[_Cell] = []
        self.tool_agg: dict[tuple[str, str], _ToolAgg] = {}
        self.prompt_agg: dict[tuple[str, str], int] = {}
        self.prompt_rows: list[tuple] = []
        self.meta: dict[str, dict] = {}
        self.sub_rows: dict[str, dict] = {}
        self.session_tool: dict[str, str] = {}
        self.session_project: dict[str, str] = {}
        self.live_by_sid: dict[str, dict] = {}
        self.placeholders: list[dict] = []
        self.pid_cpu: dict[int, float] = {}
        self.pid_memory: dict[int, float] | None = None
        self.test_rows: list[tuple] = []
        self.loops: list[dict] = []
        self.status: dict[str, str] = {}
        self.sub_status: dict[str, str] = {}
        self.scope: set[str] = set()
        facts = facts or {}
        self.tools_with_calls = {tool for tool, kinds in facts.items() if "tool_calls" in kinds}
        self.tools_with_confirms = {tool for tool, kinds in facts.items() if "confirms" in kinds}
        self.tools_with_prompts = {tool for tool, kinds in facts.items() if "prompts" in kinds}

    # ── SQL fragments ──────────────────────────────────────────

    def _window(self) -> tuple[str, list]:
        sql = "ts >= ? AND ts <= ? AND session_id <> ''"
        params: list[Any] = [self.f.since, self.f.until]
        if self.only_session is not None:
            sql += " AND session_id = ?"
            params.append(self.only_session)
        return sql, params

    def _scoped(self) -> tuple[str, list]:
        """The window plus the sessions that passed the filters."""
        sql, params = self._window()
        if self.narrowed and self.only_session is None:
            sql += " AND session_id IN (SELECT value FROM json_each(?))"
            params.append(json.dumps(sorted(self.scope)))
        return sql, params

    def _source(self, table: str) -> str:
        """The table for a scan over the window.

        A window that holds most of a table is read fastest in row order, without
        the time index. A small set of sessions keeps the planner's choice.
        """
        if self.only_session is not None or (self.narrowed and self.scope and len(self.scope) < 50):
            return table
        view = _view_body(self.conn, table)
        span = self.spans.get(table)
        if span is None:
            # Per store: MIN and MAX over a view of several stores would read every row.
            ends = _per_store(self.conn, f"SELECT MIN(ts), MAX(ts) FROM {table}")
            firsts = [r[0] for r in ends if r[0] is not None]
            lasts = [r[1] for r in ends if r[1] is not None]
            span = self.spans[table] = (min(firsts, default=None), max(lasts, default=None))
        first, last = span
        if first is None or last is None:
            return table
        inside = min(last, self.f.until) - max(first, self.f.since)
        if inside * 2 < last - first:
            return table
        if view is not None:
            # A view over several stores: each store's table is read in row order.
            return "(" + _VIEW_PART_RE.sub(r"FROM \1 NOT INDEXED", view) + f") AS {table}"
        return f"{table} NOT INDEXED"

    def _step(self, column: str = "ts") -> tuple[str, list]:
        """SQL for a row's step of the time grid."""
        f = self.f
        return f"MIN({f.grid - 1}, CAST(({column} - ?) / ? AS INTEGER))", [f.since, (f.until - f.since) / f.grid]

    def _bucket_of(self, ts: float) -> int:
        return max(0, min(self.f.buckets - 1, int((ts - self.f.since) / self.f.bucket_s)))

    def _spark_of(self, ts: float) -> int:
        return max(0, min(SPARK_POINTS - 1, int((ts - self.f.since) / self.f.spark_s)))

    # ── Loading ────────────────────────────────────────────────

    def load(self, base_memo: _BaseMemo | None = None, base_key: tuple | None = None, counts_only: bool = False) -> _Board:
        """Read the window, then apply the filters. A change of filter reuses what was read.

        *counts_only* leaves out the test runs, failures and loops: they change a row's
        status, never its tokens, cost, tool calls or prompts.
        """
        base = base_memo.get(base_key) if base_memo is not None else None
        if base is not None:
            for name in _BASE_ATTRS:
                setattr(self, name, base[name])
        else:
            self._load_cells()
            self._load_fallback_cells()
            self._load_tool_agg()
            self._load_prompt_agg()
            self._load_meta()
            self._resolve_sessions()
            self._price_cells()
            self._match_live()
            if not counts_only:
                self._load_tests()
                self._load_failures()
                self._load_loops()
            self._load_confirms()
            self._assign_status()
            if base_memo is not None:
                base_memo.put(base_key, {name: getattr(self, name) for name in _BASE_ATTRS})
        self._apply_filters()
        self._rollup()
        self._index_pending()
        return self

    def _load_cells(self) -> None:
        where, params = self._window()
        step, idx = self._step()
        rows = self.conn.execute(
            f"SELECT session_id, agent_id, model, {step} g, tool, project_path, COUNT(*),"
            " SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens), SUM(cache_creation_tokens),"
            " SUM(is_error), MIN(ts), MAX(ts), MAX(CASE WHEN is_error THEN ts END),"
            " SUM(duration_ms > 0), MAX(duration_ms), SUM(ttft_ms > 0), MAX(ttft_ms), SUM(cost_usd)"
            f" FROM {self._source('requests')} WHERE {where} GROUP BY session_id, agent_id, model, g",
            idx + params,
        ).fetchall()
        b_of, s_of = self.b_of, self.s_of
        cells = [_Cell(*row) for row in rows]
        for c in cells:
            c.b, c.s = b_of[c.g], s_of[c.g]
        self.cells = cells

    def _load_fallback_cells(self) -> None:
        grid_s = (self.f.until - self.f.since) / self.f.grid
        for row in _fallback_rows(self.conn, self.f.since, self.f.until, self.only_session):
            for piece in _fallback_pieces(row, self.f.since, self.f.until):
                ts = piece["ts"]
                g = max(0, min(self.f.grid - 1, int((ts - self.f.since) / grid_s)))
                first = True
                for model, usage in piece["models"].items():
                    self.cells.append(
                        _Cell(
                            row["session_id"],
                            "",
                            model,
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
                        )
                    )
                    first = False

    def _load_tool_agg(self) -> None:
        where, params = self._window()
        rows = self.conn.execute(
            f"SELECT session_id, agent_id, SUM({_IS_CALL_SQL}), SUM(is_error AND {_IS_CALL_SQL}),"
            " SUM(confirm IN ('approved', 'denied', 'pending')), SUM(confirm = 'denied'), SUM(confirm = 'pending'),"
            f" MIN(ts), MAX(ts), MAX(CASE WHEN is_error AND {_IS_CALL_SQL} THEN ts END), tool, project_path"
            f" FROM {self._source('tool_invocations')} WHERE {where} GROUP BY session_id, agent_id",
            params,
        ).fetchall()
        for sid, aid, *rest in rows:
            self.tool_agg[(sid, _agent_key(sid, aid))] = _ToolAgg(*rest)

    def _load_prompt_agg(self) -> None:
        where, params = self._window()
        step, idx = self._step()
        rows = self.conn.execute(
            f"SELECT session_id, agent_id, {step} g, COUNT(*), MAX(tool), MAX(project_path)"
            f" FROM session_prompts WHERE {where} AND agent_id = '' GROUP BY session_id, agent_id, g",
            idx + params,
        ).fetchall()
        self.prompt_rows = [
            (sid, aid, self.b_of[g], self.s_of[g], n, tool, project) for sid, aid, g, n, tool, project in rows
        ]
        for sid, aid, _b, _s, n, _tool, _project in self.prompt_rows:
            key = (sid, _agent_key(sid, aid))
            self.prompt_agg[key] = self.prompt_agg.get(key, 0) + n
        # A subagent's own prompts count on its row, not on its parent's or in the totals.
        for sid, aid, n in self.conn.execute(
            f"SELECT session_id, agent_id, COUNT(*) FROM session_prompts WHERE {where} AND agent_id != '' GROUP BY session_id, agent_id",
            params,
        ):
            self.prompt_agg[(sid, _agent_key(sid, aid))] = n

    def _load_meta(self) -> None:
        ids = {c.sid for c in self.cells}
        ids.update(sid for sid, _ in self.tool_agg)
        ids.update(sid for sid, _ in self.prompt_agg)
        ids.discard("")
        payload = json.dumps(sorted(ids))
        for row in self.conn.execute(
            "SELECT session_id, tool, project_path, model, pid, started_at, ended_at FROM sessions"
            " WHERE session_id IN (SELECT value FROM json_each(?))",
            (payload,),
        ):
            self.meta[row[0]] = dict(zip(("session_id", "tool", "project_path", "model", "pid", "started_at", "ended_at"), row))
        for row in self.conn.execute(
            "SELECT agent_id, session_id, task, model, started_at, ended_at, completed FROM agents"
            " WHERE session_id IN (SELECT value FROM json_each(?))",
            (payload,),
        ):
            agent = dict(zip(("agent_id", "session_id", "task", "model", "started_at", "ended_at", "completed"), row))
            # A long session stays in view, but a subagent that ran outside this time does not.
            last = agent["ended_at"] or (agent["started_at"] if agent["completed"] else None)
            ran_outside = self.only_session is None and (
                (last is not None and last < self.f.since) or (agent["started_at"] or 0.0) > self.f.until
            )
            if agent["agent_id"] != agent["session_id"] and not ran_outside:
                self.sub_rows[agent["agent_id"]] = agent

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
            self.session_project[sid] = project_root(meta.get("project_path") or project_seen.get(sid, ""))
        for c in self.cells:
            self.session_tool.setdefault(c.sid, c.tool)
            self.session_project.setdefault(c.sid, c.project)
            if is_unattributed(c.tool):
                c.tool = self.session_tool[c.sid]
            c.project = project_root(c.project) or self.session_project[c.sid]

    def _price_cells(self) -> None:
        tiered: dict[str, int] = {}
        for c in self.cells:
            c.cost, c.saved = _list_cost(c.model, c.i, c.o, c.cr, c.cw, c.max_ts)
            if c.stored_cost:
                c.cost = c.stored_cost
                continue
            threshold = _long_threshold(c.model)
            if threshold:
                tiered[c.model] = threshold
        if tiered:
            self._price_long_requests(tiered)

    def _price_long_requests(self, tiered: dict[str, int]) -> None:
        """A request over a prompt-length tier costs more than its tokens at the base rate."""
        where, params = self._window()
        step, idx = self._step()
        rows = self.conn.execute(
            f"SELECT session_id, agent_id, model, {step} g, input_tokens, output_tokens, cache_read_tokens,"
            f" cache_creation_tokens, ts FROM requests WHERE {where}"
            " AND model IN (SELECT value FROM json_each(?))"
            " AND input_tokens + cache_read_tokens + cache_creation_tokens > ?",
            [*idx, *params, json.dumps(sorted(tiered)), min(tiered.values())],
        ).fetchall()
        if not rows:
            return
        cells = {(c.sid, c.aid, c.model, c.g): c for c in self.cells if not c.estimated and not c.stored_cost}
        for sid, aid, model, g, i, o, cr, cw, ts in rows:
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
            sid = known or owner_by_project(live)
            if sid is None:
                unmatched.append(live)
                continue
            claimed.add(sid)
            merged = self.live_by_sid.setdefault(sid, {"pids": set(), "cpu_percent": None, "started_at": None})
            merged["pids"].update(int(p) for p in live.get("pids") or [])
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
        row = self.conn.execute(
            "SELECT session_id FROM requests WHERE tool = ? AND project_path = ? ORDER BY ts DESC LIMIT 1", (tool, project)
        ).fetchone()
        return row is None or row[0] == sid

    def _pid_owners(self, sessions: dict[str, float]) -> dict[int, str]:
        pids = {int(p) for live in self.live_sessions for p in live.get("pids") or []}
        pids.update(int(live["root_pid"]) for live in self.live_sessions if live.get("root_pid"))
        owners = {}
        for sid, pid in self.conn.execute(
            "SELECT session_id, pid FROM session_processes WHERE pid IN (SELECT value FROM json_each(?))",
            (json.dumps(sorted(pids)),),
        ):
            if sid in sessions:
                owners[pid] = sid
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
        where, params = self._window()
        rows = self.conn.execute(
            "SELECT session_id, agent_id, ts, tool_name, target, is_error, exit_code, duration_ms"
            f" FROM {self._source('tool_invocations')} WHERE {where} AND {_TEST_LIKE_SQL}",
            params,
        ).fetchall()
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
        where, params = self._window()
        self.confirm_rows = self.conn.execute(
            "SELECT session_id, agent_id, tool_name, target, ts, confirm, confirm_wait_ms"
            f" FROM {self._source('tool_invocations')} WHERE {where} AND confirm <> ''",
            params,
        ).fetchall()

    def _load_failures(self) -> None:
        where, params = self._window()
        self.failure_rows = self.conn.execute(
            "SELECT session_id, agent_id, tool_name, target, result_summary, ts"
            f" FROM {self._source('tool_invocations')} WHERE {where} AND is_error = 1 AND {_IS_CALL_SQL}",
            params,
        ).fetchall()

    def _load_loops(self) -> None:
        where, params = self._window()
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
        for sid, aid, ts, name, target, is_error, exit_code, call_input in self.conn.execute(
            "SELECT session_id, agent_id, ts, tool_name, target, is_error, exit_code, input FROM tool_invocations"
            f" WHERE {where} AND {_IS_CALL_SQL} AND session_id IN (SELECT value FROM json_each(?)) ORDER BY ts, id",
            [*params, json.dumps(sorted(candidates))],
        ):
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
        return {
            sid
            for sid, _ts, reason in self.conn.execute(
                "SELECT session_id, MAX(ts), finish_reason FROM requests WHERE agent_id = ''"
                " AND session_id IN (SELECT value FROM json_each(?)) GROUP BY session_id",
                (json.dumps(quiet),),
            )
            if reason in _TURN_ENDED_REASONS
        }

    def _assign_status(self) -> None:
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
        for sub in self.sub_rows.values():
            agents_by_root[sub["session_id"]].add(sub["agent_id"])
        for sid in self.live_by_sid:
            agents_by_root[sid].add(sid)

        looping_at_end = {(loop["session_id"], loop["agent_id"]) for loop in self.loops if loop["at_end"]}
        roots_looping = {sid for sid, _ in looping_at_end}

        turn_ended = self._sessions_with_ended_turn(last_activity)
        for sid, agents in agents_by_root.items():
            if not sid:
                continue
            recent = self.now - last_activity.get(sid, 0.0) < ACTIVE_WINDOW_S
            active = sid in self.live_by_sid or recent
            if active and pending_by_root[sid]:
                self.status[sid] = "waiting"
            elif active and sid in roots_looping:
                self.status[sid] = "looping"
            elif active and (not recent or sid in turn_ended):
                self.status[sid] = "idle"
            elif active:
                self.status[sid] = "running"
            elif last_failed(sid, agents):
                self.status[sid] = "failed"
            else:
                self.status[sid] = "ended"
            for agent in agents:
                if agent == sid:
                    continue
                sub = self.sub_rows.get(agent) or {}
                when = last_call.get((sid, agent), sub.get("started_at") or 0.0)
                # ended_at is only the time of the last line while a subagent still runs.
                finished = bool(sub.get("completed"))
                sub_active = active and not finished and self.now - when < ACTIVE_WINDOW_S
                agg = self.tool_agg.get((sid, agent))
                if sub_active and agg is not None and agg.pending:
                    self.sub_status[agent] = "waiting"
                elif sub_active and (sid, agent) in looping_at_end:
                    self.sub_status[agent] = "looping"
                elif sub_active:
                    self.sub_status[agent] = "running"
                elif last_failed(sid, [agent]):
                    self.sub_status[agent] = "failed"
                else:
                    self.sub_status[agent] = "ended"
        self.agents_by_root = agents_by_root

    def _apply_filters(self) -> None:
        f = self.f
        # Facts for the option lists: the time range, before any filter.
        self.all_cells = self.cells
        selected = set(stored_ids_for(f.tools)) if f.tools is not None else None

        def tool_ok(tool: str) -> bool:
            return selected is None or tool in selected

        cells = [
            c
            for c in self.cells
            if tool_ok(c.tool) and (not f.project or c.project == f.project) and (not f.model or c.model == f.model)
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
                and (not f.project or self.session_project.get(sid, "") == f.project)
                and not f.model
            ):
                scope.add(sid)
        if f.status != "all":
            allowed = LIVE_STATUSES if f.status == "active" else (f.status,)
            scope = {sid for sid in scope if self.status.get(sid) in allowed}
        if f.q:
            scope &= self._matching_q(scope)
        self.scope = scope
        self.cells = [c for c in cells if c.sid in scope]
        self.visible_loops = [loop for loop in self.loops if loop["session_id"] in scope]

    def _matching_q(self, scope: set[str]) -> set[str]:
        needle = self.f.q.lower()
        hits: set[str] = set()
        models: dict[str, set[str]] = defaultdict(set)
        for c in self.all_cells:
            models[c.sid].add(c.model)
        roles: dict[str, list[str]] = defaultdict(list)
        for agent_id, sub in self.sub_rows.items():
            roles[sub["session_id"]].extend([agent_id, sub.get("task") or ""])
        for sid in scope:
            haystack = [sid, self.session_tool.get(sid, ""), self.session_project.get(sid, ""), *models[sid], *roles[sid]]
            if any(needle in (value or "").lower() for value in haystack):
                hits.add(sid)
        pattern = "%" + self.f.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        where, params = self._window()
        for table, column in (("session_prompts", "text"), ("tool_invocations", "target")):
            hits.update(
                r[0]
                for r in self.conn.execute(
                    f"SELECT DISTINCT session_id FROM {table} WHERE {where} AND {column} LIKE ? ESCAPE '\\'",
                    [*params, pattern],
                )
            )
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
        self.unpriced: dict[str, int] = {}
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
                # No stored cost and no list rate for the model: the cost total leaves these tokens out.
                self.unpriced[c.model] = self.unpriced.get(c.model, 0) + c.i + c.o + c.cr + c.cw
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
        sids = sorted({sid for sid, _ in keys})
        firsts: dict[tuple[str, str], str] = {}
        for sid, aid, text, _ts in self.conn.execute(
            "SELECT session_id, agent_id, text, MIN(ts) FROM session_prompts"
            " WHERE text <> '' AND session_id IN (SELECT value FROM json_each(?)) GROUP BY session_id, agent_id",
            (json.dumps(sids),),
        ):
            firsts[(sid, _agent_key(sid, aid))] = text
        titles = {}
        for sid, agent in keys:
            text = firsts.get((sid, agent))
            if text:
                titles[(sid, agent)] = _one_line(text, TITLE_CHARS)
            elif agent != sid:
                role = (self.sub_rows.get(agent) or {}).get("task") or "Subagent"
                titles[(sid, agent)] = f"{_one_line(role, TITLE_CHARS - 10)} {_short(agent)}"
            else:
                tool = _label(self.session_tool.get(sid, ""))
                project = _basename(self.session_project.get(sid, ""))
                titles[(sid, agent)] = " · ".join(part for part in (tool, project) if part) or _short(sid)
        return titles

    def _agent_row(self, sid: str, agent: str, title: str, activity: list[int]) -> dict:
        root = agent == sid
        usage = self.by_root.get(sid) if root else self.by_key.get((sid, agent))
        calls, failures = self._agent_tool_calls(sid, None if root else agent)
        asked, denied = self._agent_confirms(sid, None if root else agent)
        user = self._agent_user_msgs(sid, None if root else agent)
        tool = self.session_tool.get(sid, "")
        status = self.status.get(sid, "ended") if root else self.sub_status.get(agent, "ended")
        meta = self.meta.get(sid) or {}
        sub = self.sub_rows.get(agent) or {}
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
            "role": "Main agent" if root else (sub.get("task") or None),
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
        }
        if root and sid in self.estimated:
            row["estimated"] = True
        if live is not None:
            pids = sorted(live["pids"])
            row["mem_mb"] = _mem_of(self._pid_memory(), pids)
            # The per-process sample is current; the session figure lags and often reads 0.
            sampled = _mem_of(self.pid_cpu, pids)
            row["cpu_percent"] = sampled if sampled is not None else live["cpu_percent"]
            row["pids"] = pids
        return row

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
            if f.project and project != f.project:
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
                    "status": "running",
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

    def _ordered_agent_keys(self) -> list[tuple[str, str]]:
        """Active first, then newest. Roots always fit before any subagent."""
        rank = {"waiting": 0, "looping": 1, "running": 2}

        def sort_key(sid: str) -> tuple[int, float]:
            return (rank.get(self.status.get(sid, ""), 3), -self.last_activity.get(sid, 0.0))

        roots = sorted(self.scope, key=sort_key)
        shown = roots[:MAX_AGENT_ROWS]
        room = MAX_AGENT_ROWS - len(shown)
        subs: dict[str, list[str]] = defaultdict(list)
        for sid in shown:
            if room <= 0:
                break
            members = sorted(
                (a for a in self.agents_by_root.get(sid, ()) if a != sid),
                key=lambda a: (rank.get(self.sub_status.get(a, ""), 3), a),
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
        step, idx = self._step()
        where = "ts >= ? AND ts <= ? AND session_id IN (SELECT value FROM json_each(?))"
        rows = self.conn.execute(
            f"SELECT session_id, agent_id, {step} g, COUNT(*) FROM tool_invocations WHERE {where} AND {_IS_CALL_SQL}"
            " GROUP BY session_id, agent_id, g",
            [*idx, self.f.since, self.f.until, json.dumps(sids)],
        ).fetchall()
        rows = [(sid, aid, self.s_of[g], n) for sid, aid, g, n in rows]
        for sid, aid, s, n in rows:
            agent = _agent_key(sid, aid)
            if (sid, sid) in result:
                result[(sid, sid)][s] += n
            if agent != sid and (sid, agent) in result:
                result[(sid, agent)][s] += n
        return result


def _agent_key(sid: str, aid: str | None) -> str:
    """A row's agent: its subagent id, or the session id for the main agent."""
    return aid if aid and aid != sid else sid


def _mem_of(memory: dict[int, float], pids: list[int]) -> float | None:
    values = [memory[pid] for pid in pids if pid in memory]
    return round(sum(values), 1) if values else None


def _proc_field(proc: Any, name: str) -> Any:
    return proc.get(name) if isinstance(proc, dict) else getattr(proc, name, None)


def _as_number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _fallback_rows(conn: sqlite3.Connection, since: float, until: float, only_session: str | None = None) -> list[dict]:
    """Sessions with usage in session_usage and no requests row at all, active in the window.

    A session that spans the window is included: ``_fallback_pieces`` places each
    of its days in the window or leaves it out.
    """
    sql = (
        "SELECT session_id, tool, project_path, model, models_json, input_tokens, output_tokens, cache_read_tokens,"
        " cache_creation_tokens, request_count, tool_call_count, turn_count, started_at, last_activity_at, daily_json"
        " FROM session_usage su WHERE last_activity_at >= ? AND started_at <= ?"
        " AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.session_id = su.session_id)"
    )
    params: list[Any] = [since, until]
    if only_session is not None:
        sql += " AND session_id = ?"
        params.append(only_session)
    names = (
        "session_id",
        "tool",
        "project_path",
        "model",
        "models_json",
        "input_tokens",
        "output_tokens",
        "cache_read_tokens",
        "cache_creation_tokens",
        "request_count",
        "tool_call_count",
        "turn_count",
        "started_at",
        "last_activity_at",
        "daily_json",
    )
    return [dict(zip(names, row)) for row in conn.execute(sql, params)]


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


def _credits_section(db: Any, board: _Board) -> dict | None:
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
    for u in db.query_session_usage(active_since=f.since, active_until=f.until):
        if not u.get("billing_unit"):
            continue
        if selected is not None and u["tool"] not in selected:
            continue
        if f.project and u["project_path"] != f.project:
            continue
        if (f.status != "all" or f.q) and u["session_id"] not in board.scope:
            continue
        seen = True
        for day, values in u["daily"].items():
            span = _day_span(day, u["started_at"] or 0.0, u["last_activity_at"] or 0.0)
            if span is None or span[1] < f.since or span[0] > f.until:
                continue
            credits = (values.get("models", {}).get(f.model) or {}).get("billing_amount") if f.model else values.get("billing_amount")
            if credits is None:
                continue
            amount = (amount or 0.0) + credits
            by_tool[u["tool"]] = by_tool.get(u["tool"], 0.0) + credits
            approximate = approximate or span[0] < f.since or span[1] > f.until
    if not seen:
        return None
    return {
        "amount": None if amount is None else round(amount, 2),
        "unit": "ai_credits",
        "by_tool": {t: round(v, 2) for t, v in sorted(by_tool.items())},
        "approximate": approximate,
    }


def _unpriced_section(board: _Board) -> dict:
    """Tokens that carry no cost in the cost figures, because the model has no known price."""
    total = board.total.tokens
    tokens = sum(board.unpriced.values())
    return {
        "tokens": tokens,
        "share": _ratio(tokens, total),
        "models": [{"model": m, "tokens": t} for m, t in sorted(board.unpriced.items(), key=lambda kv: (-kv[1], kv[0]))],
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


# ─── The whole board ──────────────────────────────────────────────


def _sampled_rows(board: _Board, total: int, columns: str, condition: str, table: str, where: str, params: list) -> tuple[list, int]:
    """Rows for percentiles: all of them, or every k-th by id once they are many."""
    k = max(1, math.ceil(total / MAX_LATENCY_VALUES))
    sample_sql = f" AND id % {k} = 0" if k > 1 else ""
    rows = board.conn.execute(
        f"SELECT {columns} FROM {board._source(table)} WHERE {where} AND {condition}{sample_sql}",
        params,
    ).fetchall()
    return rows, k


def _latency(board: _Board) -> dict:
    """Percentiles of model replies per model, project and time bucket, from one pass."""
    where, params = board._scoped()
    if board.f.model:
        where += " AND model = ?"
        params.append(board.f.model)
    timed = sum(c.timed for c in board.cells)
    timed_first = sum(c.timed_first for c in board.cells)
    step, idx = board._step()
    rows, k = _sampled_rows(
        board,
        max(timed, timed_first),
        f"session_id, model, {step}, duration_ms, ttft_ms",
        "(duration_ms > 0 OR ttft_ms > 0)",
        "requests",
        where,
        idx + params,
    )
    by_model: dict[str, list[float]] = defaultdict(list)
    by_project: dict[str, list[float]] = defaultdict(list)
    by_bucket: list[list[float]] = [[] for _ in range(board.f.buckets)]
    by_spark: list[list[float]] = [[] for _ in range(SPARK_POINTS)]
    replies: list[float] = []
    firsts: list[float] = []
    project_of = board.session_project
    b_of, s_of = board.b_of, board.s_of

    def add(sid: str, model: str, g: int, duration: float) -> None:
        by_model[model].append(duration)
        by_project[project_of.get(sid, "")].append(duration)
        by_bucket[b_of[g]].append(duration)
        by_spark[s_of[g]].append(duration)

    for sid, model, g, duration, ttft in rows:
        if duration > 0:
            replies.append(duration)
            add(sid, model, g, duration)
        if ttft > 0:
            firsts.append(ttft)
    if k > 1:
        _read_thin_groups(board, where, params, by_model, by_project, by_bucket, by_spark)
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


def _read_thin_groups(board: _Board, where: str, params: list, by_model, by_project, by_bucket, by_spark) -> None:
    """A group the sample left thin is small in truth, so its values are read in full."""
    f = board.f
    timed_model: dict[str, int] = defaultdict(int)
    timed_project: dict[str, int] = defaultdict(int)
    timed_bucket = [0] * f.buckets
    timed_spark = [0] * SPARK_POINTS
    for c in board.cells:
        if c.timed:
            timed_model[c.model] += c.timed
            timed_project[c.project] += c.timed
            timed_bucket[c.b] += c.timed
            timed_spark[c.s] += c.timed

    def thin(have: list, timed: int) -> bool:
        return timed > len(have) and len(have) < MIN_GROUP_SAMPLE

    conn = board.conn
    for model, timed in timed_model.items():
        if thin(by_model[model], timed):
            by_model[model] = [
                r[0]
                for r in conn.execute(
                    f"SELECT duration_ms FROM requests WHERE {where} AND duration_ms > 0 AND model = ?", [*params, model]
                )
            ]
    for project, timed in timed_project.items():
        if thin(by_project[project], timed):
            sids = json.dumps([sid for sid in board.scope if board.session_project.get(sid, "") == project])
            by_project[project] = [
                r[0]
                for r in conn.execute(
                    f"SELECT duration_ms FROM requests WHERE {where} AND duration_ms > 0"
                    " AND session_id IN (SELECT value FROM json_each(?))",
                    [*params, sids],
                )
            ]

    def by_time(start: float, end: float) -> list[float]:
        return [
            r[0]
            for r in conn.execute(
                f"SELECT duration_ms FROM requests WHERE {where} AND duration_ms > 0 AND ts >= ? AND ts < ?",
                [*params, start, end],
            )
        ]

    for i, timed in enumerate(timed_bucket):
        if thin(by_bucket[i], timed):
            start = f.since + i * f.bucket_s
            by_bucket[i] = by_time(start, start + f.bucket_s + (1e-6 if i == f.buckets - 1 else 0.0))
    for i, timed in enumerate(timed_spark):
        if thin(by_spark[i], timed):
            start = f.since + i * f.spark_s
            by_spark[i] = by_time(start, start + f.spark_s + (1e-6 if i == SPARK_POINTS - 1 else 0.0))


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
    where, params = board._scoped()
    rows = board.conn.execute(
        f"SELECT session_id, ts FROM session_prompts WHERE {where} AND agent_id = '' ORDER BY session_id, ts",
        params,
    ).fetchall()
    starts: dict[str, list[float]] = defaultdict(list)
    for sid, ts in rows:
        starts[sid].append(ts)
    every = max(1, math.ceil(len(rows) / MAX_TURN_SAMPLE))
    sampled = {rows[i] for i in range(0, len(rows), every)}
    wanted = set(sampled)
    wanted.update(sorted(rows, key=lambda r: r[1], reverse=True)[:MAX_PROMPTS])
    for _name, sid, ts, _agent in skill_rows:
        i = bisect.bisect_right(starts.get(sid, []), ts) - 1
        if i >= 0:
            wanted.add((sid, starts[sid][i]))
    end_of = board.f.until + 1
    triples = []
    for sid, ts in wanted:
        line = starts[sid]
        i = bisect.bisect_right(line, ts)
        triples.append((sid, ts, line[i] if i < len(line) else end_of))
    model_sql = ""
    model_params: list[Any] = []
    if board.f.model:
        model_sql = " AND r.model = ?"
        model_params = [board.f.model]
    tokens: dict[tuple[str, float], int | None] = {}
    lengths: list[float] = []
    # Over a view of several stores the join would read every store whole: it runs on
    # each store's own table, and the turns of a session add up across them.
    found: dict[tuple[str, float], list] = {}
    for part in _table_parts(board.conn, "requests"):
        for sid, ts, end, turn_tokens in board.conn.execute(
            "WITH w AS (SELECT value ->> 0 sid, value ->> 1 t, value ->> 2 nx FROM json_each(?))"
            " SELECT w.sid, w.t, MAX(r.ts + r.duration_ms / 1000.0),"
            " SUM(r.input_tokens + r.output_tokens + r.cache_read_tokens + r.cache_creation_tokens)"
            f" FROM w LEFT JOIN {part} r ON r.session_id = w.sid AND r.ts >= w.t AND r.ts < w.nx"
            f"{model_sql} GROUP BY w.sid, w.t",
            [json.dumps(triples), *model_params],
        ):
            seen = found.get((sid, ts))
            if seen is None:
                found[(sid, ts)] = [end, turn_tokens]
                continue
            if end is not None:
                seen[0] = end if seen[0] is None else max(seen[0], end)
            if turn_tokens is not None:
                seen[1] = turn_tokens if seen[1] is None else seen[1] + turn_tokens
    for (sid, ts), (end, turn_tokens) in found.items():
        tokens[(sid, ts)] = turn_tokens
        if (sid, ts) in sampled and end is not None and end > ts:
            lengths.append((end - ts) * 1000.0)
    lengths.sort()
    return _Turns(len(rows), lengths, None, tokens, starts)


def _tools_section(board: _Board) -> dict:
    where, params = board._scoped()
    step, idx = board._step()
    rows = board.conn.execute(
        f"SELECT tool_name, {step} g, COUNT(*), SUM(is_error), MAX(duration_ms), SUM(duration_ms > 0),"
        " SUM(input_bytes), COUNT(input_bytes), SUM(output_bytes), COUNT(output_bytes)"
        f" FROM {board._source('tool_invocations')} WHERE {where} AND {_IS_CALL_SQL} GROUP BY tool_name, g",
        idx + params,
    ).fetchall()
    n = board.f.buckets
    calls_bucket = [0] * n
    fail_bucket = [0] * n
    spark_calls = [0] * SPARK_POINTS
    spark_failed = [0] * SPARK_POINTS
    stats: dict[str, dict] = {}
    longest = 0.0
    timed_total = 0
    for name, g, count, errs, slowest, timed, in_sum, in_n, out_sum, out_n in rows:
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

    samples, k = _sampled_rows(
        board, timed_total, "tool_name, duration_ms", f"duration_ms > 0 AND {_IS_CALL_SQL}", "tool_invocations", where, params
    )
    values: dict[str, list[float]] = defaultdict(list)
    overall = []
    for name, duration in samples:
        values[name].append(duration)
        overall.append(duration)
    if k > 1:
        for name, row in stats.items():
            if row["timed"] > len(values[name]) and len(values[name]) < MIN_GROUP_SAMPLE:
                values[name] = [
                    r[0]
                    for r in board.conn.execute(
                        f"SELECT duration_ms FROM tool_invocations WHERE {where} AND duration_ms > 0 AND tool_name = ?",
                        [*params, name],
                    )
                ]
    overall.sort()

    out = []
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
                "mcp_server": mcp_server_of(name),
                "avg_input_bytes": round(row["in"][0] / row["in"][1]) if row["in"][1] else None,
                "avg_output_bytes": round(row["out"][0] / row["out"][1]) if row["out"][1] else None,
                "output_bytes": row["out"][0] if row["out"][1] else None,
                "trend": row["trend"],
            }
        )
    return {
        "rows": out,
        "durations": overall,
        "timed": timed_total,
        "longest": longest or None,
        "calls_bucket": calls_bucket,
        "fail_bucket": fail_bucket,
        "spark_calls": spark_calls,
        "spark_failed": spark_failed,
    }


def _confirms_section(board: _Board) -> dict:
    counts = {"auto": 0, "approved": 0, "denied": 0, "blocked": 0, "pending": 0}
    by_tool: dict[str, dict[str, int]] = defaultdict(lambda: {"auto": 0, "approved": 0, "denied": 0, "blocked": 0})
    waits: dict[str, list[float]] = defaultdict(list)
    all_waits: list[float] = []
    for sid, _aid, name, _target, _ts, confirm, wait in board.confirm_rows:
        if sid not in board.scope:
            continue
        counts[confirm] = counts.get(confirm, 0) + 1
        if confirm in by_tool[name]:
            by_tool[name][confirm] += 1
        if wait and wait > 0 and confirm in ("approved", "denied"):
            waits[name].append(wait)
            all_waits.append(wait)
    for group in (all_waits, *waits.values()):
        group.sort()
    reported = bool(by_tool) or bool(counts["pending"])
    pending = [
        {"agent_id": row["agent_key"], "name": row["name"], "target": row["target"], "since_ts": row["since_ts"]}
        for rows in board.pending_rows.values()
        for row in rows
    ]
    p95 = _percentile(all_waits, 0.95)
    return {
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
    where, params = board._scoped()
    if board.f.model:
        where += " AND model = ?"
        params.append(board.f.model)
    step, idx = board._step()
    api_bucket = [0] * board.f.buckets
    api_by_project: dict[str, int] = defaultdict(int)
    for error_type, status, sid, g, n, ts in board.conn.execute(
        f"SELECT error_type, http_status, session_id, {step} g, COUNT(*), MAX(ts) FROM {board._source('requests')}"
        f" WHERE {where} AND is_error = 1 GROUP BY error_type, http_status, session_id, g",
        idx + params,
    ):
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


def _changes_section(board: _Board) -> tuple[dict, dict[str, tuple[int, int]]]:
    where, params = board._scoped()
    rows = board.conn.execute(
        "SELECT path, MAX(project_path), SUM(json_extract(detail, '$.lines_added')),"
        " SUM(json_extract(detail, '$.lines_removed')), COUNT(*), COUNT(DISTINCT session_id), MAX(ts), MAX(session_id)"
        f" FROM file_write_events WHERE {where} GROUP BY path",
        params,
    ).fetchall()
    files = []
    by_project: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    added_any = removed_any = False
    added_total = removed_total = edits_total = 0
    for path, project, added, removed, edits, agents, last_ts, sid in rows:
        project = project or board.session_project.get(sid, "")
        files.append(
            {
                "path": path,
                "project": project,
                "lines_added": None if added is None else int(added),
                "lines_removed": None if removed is None else int(removed),
                "edits": edits,
                "agents": agents,
                "last_ts": last_ts,
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
            },
        },
        {project: (a, r) for project, (a, r) in by_project.items()},
    )


def _tests_section(board: _Board) -> tuple[list[dict], list[int], list[int], dict[str, list[int]]]:
    passed = [0] * board.f.buckets
    failed = [0] * board.f.buckets
    commands: dict[str, dict] = {}
    shown: dict[str, str] = {}
    by_project: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for sid, _aid, ts, _name, target, is_error, exit_code, duration in board.test_rows:
        if sid not in board.scope:
            continue
        bad = _test_failed(is_error, exit_code)
        (failed if bad else passed)[board._bucket_of(ts)] += 1
        counts = by_project[board.session_project.get(sid, "")]
        counts[0] += 1
        counts[1] += 0 if bad else 1
        command = shown.get(target)
        if command is None:
            command = shown[target] = _one_line(target, 200)
        row = commands.setdefault(command, {"runs": 0, "failed": 0, "durations": [], "last_ts": ts})
        row["runs"] += 1
        row["failed"] += 1 if bad else 0
        row["last_ts"] = max(row["last_ts"], ts)
        if duration and duration > 0:
            row["durations"].append(duration)
    out = []
    for command, row in commands.items():
        state = "Passing" if not row["failed"] else "Failing" if row["failed"] == row["runs"] else "Flaky"
        out.append(
            {
                "command": command,
                "runs": row["runs"],
                "failed": row["failed"],
                "median_ms": _ms(_percentile(sorted(row["durations"]), 0.5)),
                "state": state,
                "last_ts": row["last_ts"],
            }
        )
    out.sort(key=lambda r: r["last_ts"], reverse=True)
    return out[:MAX_LIST_ROWS], passed, failed, by_project


def _loop_rows(board: _Board) -> list[dict]:
    rows = []
    keys = [(loop["session_id"], loop["agent_id"]) for loop in board.visible_loops[:MAX_LOOP_ROWS]]
    titles = board._titles(keys) if keys else {}
    for loop in board.visible_loops[:MAX_LOOP_ROWS]:
        sid, agent = loop["session_id"], loop["agent_id"]
        tokens = None
        cost = None
        sql = (
            "SELECT model, SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens), SUM(cache_creation_tokens), MAX(ts), SUM(cost_usd)"
            " FROM requests WHERE session_id = ? AND ts >= ? AND ts <= ?"
        )
        params: list[Any] = [sid, loop["since_ts"], loop["until_ts"]]
        if agent != sid:
            sql += " AND agent_id = ?"
            params.append(agent)
        for model, i, o, cr, cw, ts, stored in board.conn.execute(sql + " GROUP BY model", params):
            tokens = (tokens or 0) + i + o + cr + cw
            cell_cost = _cost_of(stored, model, i, o, cr, cw, ts)
            if cell_cost is not None:
                cost = (cost or 0.0) + cell_cost
        status = board.status.get(sid) if agent == sid else board.sub_status.get(agent)
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
    where, params = board._scoped()
    out = []
    for ts, sid, aid, project, text, prompt_file in board.conn.execute(
        f"SELECT ts, session_id, agent_id, project_path, text, prompt_file FROM session_prompts WHERE {where} AND agent_id = ''"
        f" ORDER BY ts DESC LIMIT {MAX_PROMPTS}",
        params,
    ):
        out.append(
            {
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


def _display_folder(folder: Path) -> str:
    home = str(Path.home())
    text = str(folder)
    return "~" + text[len(home):] if text == home or text.startswith(home + os.sep) else text


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
    where, params = board._scoped()
    used: dict[tuple[str, str], dict] = {}
    for prompt_file, project, sid, n, last_ts in board.conn.execute(
        "SELECT prompt_file, project_path, MAX(session_id), COUNT(*), MAX(ts) FROM session_prompts"
        f" WHERE {where} AND agent_id = '' AND prompt_file <> '' AND prompt_file NOT LIKE '%SKILL.md' GROUP BY prompt_file, project_path",  # a skill file has its own panel
        params,
    ):
        project = project or board.session_project.get(sid, "")
        used[(project, _basename(prompt_file))] = {"file": prompt_file, "project": project, "uses": n, "last_ts": last_ts}
    files, searched = _prompt_files_on_disk(project_ids)
    for project, file in files:
        if project == USER_PROMPT_PROJECT:
            continue
        key = (project, _basename(file))
        if key in used:
            used[key]["file"] = file
        else:
            used[key] = {"file": file, "project": project, "uses": 0, "last_ts": None}
    # A user-level file has no project: the projects that used it by name carry its path,
    # and one that no project used is listed once with no use.
    for project, file in files:
        if project != USER_PROMPT_PROJECT:
            continue
        name = _basename(file)
        users = [row for (proj, base), row in used.items() if base == name and row["uses"] and row["file"] == base]
        for row in users:
            row["file"] = file
        if not users and not any(row["file"] == file for row in used.values()):
            used[(project, file)] = {"file": file, "project": project, "uses": 0, "last_ts": None}
    rows = sorted(used.values(), key=lambda r: (-r["uses"], r["project"], r["file"]))
    return rows[:MAX_LIST_ROWS], searched


def _skill_rows(board: _Board) -> list[tuple]:
    where, params = board._scoped()
    return board.conn.execute(f"SELECT name, session_id, ts, agent_id FROM skill_uses WHERE {where}", params).fetchall()


SKILL_FILE_TTL_S = 300.0
_SKILL_HEAD_CHARS = 4000
_SKILL_TEXT_CHARS = 100_000
_skill_file_memo: dict[tuple[str, tuple[str, ...]], tuple[float, dict]] = {}


def _read_text(path: str, limit: int) -> str | None:
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            return handle.read(limit)
    except OSError:
        return None


def _skill_file_tokens(path: str) -> int | None:
    """An estimate at four characters per token. The tools do not report a skill's size."""
    try:
        return Path(path).stat().st_size // 4
    except OSError:
        return None


def _skill_file(name: str, projects: Iterable[str]) -> dict:
    """Scope, path and description for the Skills panel, kept a few minutes to spare the disk."""
    key = (name, tuple(sorted(p for p in projects if p)))
    now = time.monotonic()
    hit = _skill_file_memo.get(key)
    if hit and now - hit[0] < SKILL_FILE_TTL_S:
        return hit[1]
    rows = skill_locations(name, key[1])
    head = _read_text(rows[0]["path"], _SKILL_HEAD_CHARS) if rows else None
    value = {
        "scope": ", ".join(dict.fromkeys(r["scope"] for r in rows)) or None,
        "path": rows[0]["path"] if rows else None,
        "description": mask_secrets(skill_description(head or "")) or None,
        "file_tokens": _skill_file_tokens(rows[0]["path"]) if rows else None,
    }
    if len(_skill_file_memo) >= 500:
        _skill_file_memo.clear()
    _skill_file_memo[key] = (now, value)
    return value


_EXCERPT_SUFFIXES = frozenset({".md", ".mdc", ".json", ".jsonc", ".toml", ".yaml", ".yml", ".txt"})
_EXCERPT_MAX_CHARS = 2_000_000
_EXCERPT_LINES_AROUND = 3


def file_excerpt(path: str, line: int, is_allowed: Callable[[str], bool] | None = None) -> tuple[int, dict]:
    """A few masked lines of a text file that a scan or the file list found. No other file is read."""
    from .audit_cache import AUDIT_CACHE

    if Path(path).suffix.lower() not in _EXCERPT_SUFFIXES:
        return 403, {"error": "aictl shows only text settings and instruction files."}
    if _path_key(path) not in AUDIT_CACHE.source_paths() and not (is_allowed and is_allowed(path)):
        return 403, {"error": "aictl has not found this file in a scan."}
    text = _read_text(path, _EXCERPT_MAX_CHARS)
    if text is None:
        return 404, {"error": "The file cannot be read."}
    lines = mask_secrets(text).splitlines()
    first = max(0, line - 1 - _EXCERPT_LINES_AROUND)
    return 200, {
        "path": path,
        "line": line,
        "lines": [{"n": first + i + 1, "text": value} for i, value in enumerate(lines[first : line + _EXCERPT_LINES_AROUND])],
    }


def _skill_starter(text: str) -> str:
    """Who can start a skill, from its front matter. Both can by default."""
    person = skill_field(text, "user-invocable").lower() != "false"
    model = skill_field(text, "disable-model-invocation").lower() != "true"
    if person and model:
        return "You and the model"
    if person:
        return "Only you, because of disable-model-invocation"
    if model:
        return "Only the model, because of user-invocable"
    return "Nobody, because of both settings"


def _skill_reach(row: dict, git_state: str) -> str:
    """Who can see this skill file, in words."""
    if row["scope"] == "user":
        return "Only this user on this machine, in every project."
    if row["scope"] == "plugin" and row.get("install_project"):
        return f"Anyone who installs the plugin {row['owner']} for the project {row['install_project']}, and only in that project."
    if row["scope"] == "plugin":
        return f"Anyone who installs the plugin {row['owner']}, in every project."
    if row["scope"] == "custom":
        return f"Only sessions on this machine that have this folder in {row['owner']}."
    if git_state == "tracked":
        return f"Everyone with the repository at {row['owner']}, because the file is in git."
    if git_state in ("untracked", "ignored"):
        return f"Only people who work in {row['owner']} on this machine, because the file is not in git."
    return f"Anyone who works in {row['owner']}."


_READ_TOOL_NAMES = ("read", "view", "read_file", "readfile", "view_file", "open_file")


def _skill_file_reads(conn: Any, name: str, uses: list[tuple], range_sql: str, range_params: list) -> list[dict]:
    """Calls that read ``<skill>/SKILL.md`` with a file-read tool. A real way to use a skill, apart from starting it.

    A read in a turn that also started this skill is the skill's own load, so it is left out.
    """
    base = name.rsplit(":", 1)[-1]
    if not base:
        return []
    escaped = base.replace("!", "!!").replace("%", "!%").replace("_", "!_")
    marks = ",".join("?" * len(_READ_TOOL_NAMES))
    found = conn.execute(
        "SELECT ts, session_id, agent_id, tool, project_path, target FROM tool_invocations"
        f" WHERE lower(tool_name) IN ({marks}) AND (target LIKE ? ESCAPE '!' OR target LIKE ? ESCAPE '!'){range_sql}"
        " ORDER BY ts DESC LIMIT 2000",
        [*_READ_TOOL_NAMES, f"%/{escaped}/SKILL.md", "%\\" + escaped + "\\SKILL.md", *range_params],
    ).fetchall()
    reads = [r for r in found if [part.lower() for part in re.split(r"[\\/]", r[5])[-2:]] == [base.lower(), "skill.md"]]
    if not reads:
        return []
    sessions = sorted({r[1] for r in reads})
    starts: dict[str, list[float]] = defaultdict(list)
    for chunk in range(0, len(sessions), 500):
        part = sessions[chunk : chunk + 500]
        for sid, ts in conn.execute(f"SELECT session_id, ts FROM session_prompts WHERE agent_id = '' AND session_id IN ({','.join('?' * len(part))}) ORDER BY ts", part):
            starts[sid].append(ts)
    started: dict[str, list[float]] = defaultdict(list)
    for sid, ts in uses:
        started[sid].append(ts)

    def same_turn_started(sid: str, ts: float) -> bool:
        line = starts.get(sid, [])
        i = bisect.bisect_right(line, ts) - 1
        begin = line[i] if i >= 0 else float("-inf")
        end = line[i + 1] if i + 1 < len(line) else float("inf")
        return any(begin <= used < end for used in started.get(sid, []))

    return [
        {"ts": ts, "session_id": sid, "agent_id": aid, "tool": tool, "project": project_root(project or "")}
        for ts, sid, aid, tool, project, _target in reads
        if not same_turn_started(sid, ts)
    ]


def skill_detail(
    db: Any, name: str, now: float | None = None, since: float | None = None, until: float | None = None, tools: tuple[str, ...] | None = None
) -> tuple[int, dict]:
    """Who can see a skill, each use of it, and the text of its files."""
    now = time.time() if now is None else now
    conn = db._conn()
    # A plugin skill is stored as plugin:name, and a skill file knows only its name.
    named = "(name = ? OR name LIKE ?)"
    names = [name, f"%:{name}"]
    range_sql, range_params = "", []
    if since is not None and until is not None:
        range_sql, range_params = " AND ts >= ? AND ts < ?", [since, until]
    if tools is not None:
        stored = stored_ids_for(tools)
        range_sql += f" AND tool IN ({','.join('?' * len(stored))})" if stored else " AND 0"
        range_params += list(stored)
    rows = conn.execute(
        f"SELECT ts, session_id, agent_id, tool, project_path, trigger FROM skill_uses WHERE {named}{range_sql} ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
        [*names, *range_params],
    ).fetchall()
    counted = conn.execute(f"SELECT session_id, agent_id FROM skill_uses WHERE {named}{range_sql}", [*names, *range_params]).fetchall()
    in_range = (len(counted), len({(sid, _agent_key(sid, aid)) for sid, aid in counted}))
    started_all = [(r[0], r[1]) for r in conn.execute(f"SELECT session_id, ts FROM skill_uses WHERE {named}", names)]
    file_reads = _skill_file_reads(conn, name, started_all, range_sql, range_params)
    read_pairs = {(r["session_id"], _agent_key(r["session_id"], r["agent_id"])) for r in file_reads[:MAX_DETAIL_ROWS]}
    total, first, last = conn.execute(f"SELECT COUNT(*), MIN(ts), MAX(ts) FROM skill_uses WHERE {named}", names).fetchone()
    raw_projects = [r[0] for r in conn.execute(f"SELECT DISTINCT project_path FROM skill_uses WHERE {named} AND project_path != '' LIMIT 50", names)]
    projects = list(dict.fromkeys(p for raw in raw_projects for p in (project_root(raw), raw) if p))
    pairs = {(sid, _agent_key(sid, aid)) for _ts, sid, aid, *_ in rows} | read_pairs
    titles = _titles_for(conn, pairs, now)

    locations = []
    seen_text: dict[str, str] = {}
    for row in skill_locations(name, projects):
        git_state = ""
        if row["scope"] == "project":
            git_state = _git_states(Path(row["owner"]), [row["path"]]).get(row["path"], "outside-repo")
        text = _read_text(row["path"], _SKILL_TEXT_CHARS + 1)
        truncated = text is not None and len(text) > _SKILL_TEXT_CHARS
        content = mask_secrets(text[:_SKILL_TEXT_CHARS]) if text is not None else None
        same_as = seen_text.get(content) if content is not None else None
        if content is not None:
            seen_text.setdefault(content, row["path"])
        locations.append(
            {
                **row,
                "git_state": git_state or None,
                "reach": _skill_reach(row, git_state),
                "description": skill_description(content or "") or None,
                "starter": _skill_starter(content or ""),
                "allowed_tools": skill_field(content or "", "allowed-tools") or None,
                "content": None if same_as else content,
                "same_as": same_as,
                "truncated": truncated,
            }
        )
    return 200, {
        "name": name,
        "uses": in_range[0],
        "agents": in_range[1],
        "total_uses": total,
        # Reads of the skill file: a way to use the skill that is counted apart from the uses.
        "file_reads": len(file_reads),
        "reads": [
            {
                "ts": r["ts"],
                "agent_id": _agent_key(r["session_id"], r["agent_id"]),
                "title": titles.get((r["session_id"], _agent_key(r["session_id"], r["agent_id"])), ""),
                "tool": r["tool"],
                "project": r["project"],
            }
            for r in file_reads[:MAX_DETAIL_ROWS]
        ],
        "first_ts": first,
        "last_ts": last,
        "locations": locations,
        "calls": [
            {
                "ts": ts,
                "agent_id": _agent_key(sid, aid),
                "title": titles.get((sid, _agent_key(sid, aid)), ""),
                "tool": tool,
                "project": project_root(project or ""),
                "trigger": trigger or None,
            }
            for ts, sid, aid, tool, project, trigger in rows
        ],
    }


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
    return [{**{k: v for k, v in row.items() if k != "projects"}, **_skill_file(row["name"], row["projects"])} for row in out]


def _memory_files(board: _Board) -> list[dict]:
    selected = set(stored_ids_for(board.f.tools)) if board.f.tools is not None else None
    rows = board.conn.execute(
        "SELECT path, tool, scope, tokens, last_changed FROM files WHERE (category LIKE '%memory%' OR category LIKE '%instruction%')"
        f" ORDER BY last_changed DESC LIMIT {MAX_LIST_ROWS}"
    ).fetchall()
    rows = [
        r
        for r in rows
        if (selected is None or r[1] in selected) and (not board.f.project or r[0].startswith(board.f.project))
    ]
    if not rows:
        return []
    writes: dict[str, tuple] = {}
    for path, added, removed, tool, ts in board.conn.execute(
        "SELECT path, SUM(json_extract(detail, '$.lines_added')), SUM(json_extract(detail, '$.lines_removed')), tool, MAX(ts)"
        " FROM file_write_events WHERE ts >= ? AND ts <= ? AND path IN (SELECT value FROM json_each(?)) GROUP BY path",
        (board.f.since, board.f.until, json.dumps([r[0] for r in rows])),
    ):
        writes[path] = (added, removed, tool, ts)
    out = []
    for path, tool, scope, tokens, last_changed in rows:
        added, removed, changed_by, changed_ts = writes.get(path, (None, None, None, None))
        out.append(
            {
                "path": path,
                "read_by": tool or None,
                "scope": scope,
                "tokens": tokens,
                "lines_added": None if added is None else int(added),
                "lines_removed": None if removed is None else int(removed),
                "changed_by": changed_by,
                "changed_ts": changed_ts or last_changed or None,
            }
        )
    return out


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
            if board.f.project and (sid is None or board.session_project.get(sid) != board.f.project):
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
    where = "ts >= ? AND ts <= ?"
    params: list[Any] = [f.since, f.until]
    if f.tools is not None:
        stored = stored_ids_for(f.tools)
        where += f" AND tool IN ({','.join('?' * len(stored))})" if stored else " AND 0"
        params.extend(stored)
    rows = board.conn.execute(
        f"SELECT tool, MIN({f.buckets - 1}, CAST((ts - ?) / ? AS INTEGER)) b, AVG(cpu), AVG(mem) FROM"
        f" (SELECT tool, ts, SUM(cpu_percent) cpu, SUM(memory_rss_mb) mem FROM process_snapshots WHERE {where} GROUP BY tool, ts)"
        " GROUP BY tool, b",
        [f.since, f.bucket_s, *params],
    ).fetchall()
    cpu: dict[str, list] = {}
    mem: dict[str, list] = {}
    for tool, b, avg_cpu, avg_mem in rows:
        cpu.setdefault(tool, [None] * f.buckets)[b] = round(avg_cpu, 2)
        mem.setdefault(tool, [None] * f.buckets)[b] = round(avg_mem, 2)
    order = [t for t in board.tool_order if t in cpu] + sorted(t for t in cpu if t not in board.tool_order)
    return {t: cpu[t] for t in order}, {t: mem[t] for t in order}


def _previous(board: _Board) -> dict:
    """The same filters over the window before this one. Null when it holds no data."""
    f = board.f
    span = f.until - f.since
    since, until = f.since - span, f.since
    where = "ts >= ? AND ts < ?"
    params: list[Any] = [since, until]
    if f.tools is not None:
        stored = stored_ids_for(f.tools)
        where += f" AND tool IN ({','.join('?' * len(stored))})" if stored else " AND 0"
        params.extend(stored)
    if f.project:
        where += " AND project_path = ?"
        params.append(f.project)
    if f.status != "all" or f.q:
        where += " AND session_id IN (SELECT value FROM json_each(?))"
        params.append(json.dumps(sorted(board.scope)))
    req_where = where + (" AND model = ?" if f.model else "")
    req_params = params + ([f.model] if f.model else [])
    calls = 0
    tokens = 0
    cost: float | None = None
    seen = False
    for model, n, i, o, cr, cw, ts, stored in board.conn.execute(
        "SELECT model, COUNT(*), SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens),"
        f" SUM(cache_creation_tokens), MAX(ts), SUM(cost_usd) FROM requests WHERE {req_where} GROUP BY model",
        req_params,
    ):
        seen = True
        calls += n
        tokens += i + o + cr + cw
        value = _cost_of(stored, model, i, o, cr, cw, ts)
        if value is not None:
            cost = (cost or 0.0) + value
    selected = set(stored_ids_for(f.tools)) if f.tools is not None else None
    tool_fallback = 0
    user_fallback = 0
    for row in _fallback_rows(board.conn, since, until - 1e-6):
        if selected is not None and row["tool"] not in selected:
            continue
        if f.project and row["project_path"] != f.project:
            continue
        if (f.status != "all" or f.q) and row["session_id"] not in board.scope:
            continue
        for piece in _fallback_pieces(row, since, until - 1e-6):
            for model, usage in piece["models"].items():
                if f.model and model != f.model:
                    continue
                seen = True
                calls += usage["requests"]
                tokens += usage["input"] + usage["output"] + usage["cache_read"] + usage["cache_write"]
                value, _ = _list_cost(model, usage["input"], usage["output"], usage["cache_read"], usage["cache_write"], piece["ts"])
                if value is not None:
                    cost = (cost or 0.0) + value
            if piece["last"]:
                tool_fallback += row["tool_call_count"]
                user_fallback += row["turn_count"]
    tool_calls = board.conn.execute(
        f"SELECT COUNT(*) FROM tool_invocations WHERE {where} AND {_IS_CALL_SQL}", params
    ).fetchone()[0]
    prompts = board.conn.execute(f"SELECT COUNT(*) FROM session_prompts WHERE {where} AND agent_id = ''", params).fetchone()[0]
    if not (seen or tool_calls or prompts):
        return {"messages": None, "tokens": None, "cost_usd": None, "tool_calls": None}
    return {
        "messages": calls + tool_calls + prompts + tool_fallback + user_fallback,
        "tokens": tokens,
        "cost_usd": _usd(cost),
        "tool_calls": tool_calls + tool_fallback,
    }


# ─── Coverage ─────────────────────────────────────────────────────

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
_FACTS_SQL = (
    (
        "SELECT tool, 'requests', MAX(cache_read_tokens > 0), MAX(cache_creation_tokens > 0), MAX(duration_ms > 0),"
        " MAX(ttft_ms > 0) FROM requests NOT INDEXED GROUP BY tool",
        ("requests", "cache_read", "cache_write", "reply_latency", "ttft"),
    ),
    (
        f"SELECT tool, 'tool_rows', MAX({_IS_CALL_SQL}), MAX(confirm <> ''), MAX(duration_ms > 0)"
        " FROM tool_invocations NOT INDEXED GROUP BY tool",
        ("tool_rows", "tool_calls", "confirms", "tool_duration"),
    ),
    (
        "SELECT tool, 'prompts', MAX(text <> ''), MAX(prompt_file <> '') FROM session_prompts GROUP BY tool",
        ("prompts", "prompt_text", "prompt_files"),
    ),
    ("SELECT tool, 'skills' FROM skill_uses GROUP BY tool", ("skills",)),
    ("SELECT tool, 'subagents' FROM agents WHERE is_sidechain = 1 GROUP BY tool", ("subagents",)),
    ("SELECT tool, 'processes' FROM process_snapshots GROUP BY tool", ("processes",)),
    ("SELECT tool, 'sessions' FROM sessions GROUP BY tool", ("sessions",)),
    ("SELECT tool, 'memory_files' FROM files WHERE category LIKE '%memory%' GROUP BY tool", ("memory_files",)),
    (
        "SELECT tool, 'file_writes', MAX(json_extract(detail, '$.lines_added') IS NOT NULL) FROM file_write_events GROUP BY tool",
        ("file_writes", "file_lines"),
    ),
    (
        "SELECT tool, 'requests', MAX(cache_read_tokens > 0), MAX(cache_creation_tokens > 0) FROM session_usage GROUP BY tool",
        ("requests", "cache_read", "cache_write"),
    ),
)
_facts_memo: dict[str, tuple[float, dict[str, set[str]]]] = {}
_sources_memo: dict[str, tuple[float, list[tuple]]] = {}
_facts_lock = threading.Lock()


def _store_facts(conn: sqlite3.Connection, memo_key: str) -> dict[str, set[str]]:
    """Per tool, which kinds of rows exist in the store. This changes rarely."""
    with _facts_lock:
        cached = _facts_memo.get(memo_key)
        if cached and time.monotonic() - cached[0] < FACTS_TTL_S:
            return cached[1]
    facts: dict[str, set[str]] = defaultdict(set)
    for sql, names in _FACTS_SQL:
        for row in _per_store(conn, sql):
            tool = row[0]
            facts[tool].add(names[0])
            for name, flag in zip(names[1:], row[2:]):
                if flag:
                    facts[tool].add(name)
    result = dict(facts)
    with _facts_lock:
        _facts_memo[memo_key] = (time.monotonic(), result)
    return result


# Tools whose usage aictl reads from session files on disk. Only files changed in the last
# BACKFILL_DAYS days are read, so older usage that the store does not already hold is missing.
_FILE_HISTORY_TOOLS = ("copilot-vscode", "copilot-cli", "copilot-desktop", "claude-code", "codex-cli")


def coverage_notes(tool_ids: list[str]) -> list[dict]:
    """Limits of the data that the table cannot show in a cell."""
    from ..ingesters.transcript_usage import BACKFILL_DAYS

    days = int(BACKFILL_DAYS)
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


def _source_rows(conn: sqlite3.Connection, memo_key: str) -> list[tuple]:
    with _facts_lock:
        cached = _sources_memo.get(memo_key)
        if cached and time.monotonic() - cached[0] < FACTS_TTL_S:
            return cached[1]
    # Rows of a tool and source can repeat, one per store: _sources merges them.
    rows = _per_store(conn, "SELECT tool, source, MAX(ts) FROM requests NOT INDEXED GROUP BY tool, source")
    rows += _per_store(conn, "SELECT tool, source, MAX(last_activity_at) FROM session_usage GROUP BY tool, source")
    with _facts_lock:
        _sources_memo[memo_key] = (time.monotonic(), rows)
    return rows


def _sources(source_rows: list[tuple], tool_ids: list[str], selected: set[str] | None) -> list[dict]:
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
            "locations": _tool_locations(r["tool"]),
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


# ─── /api/board ───────────────────────────────────────────────────


def _options(board: _Board) -> dict:
    """The filter menus, from the time range alone so a filter never hides its own choices."""
    tool_agents: dict[str, set[str]] = defaultdict(set)
    tool_tokens: dict[str, int] = defaultdict(int)
    project_agents: dict[str, set[str]] = defaultdict(set)
    model_agents: dict[str, set[str]] = defaultdict(set)
    for c in board.all_cells:
        agent = _agent_key(c.sid, c.aid)
        tool_agents[c.tool].add(agent)
        tool_tokens[c.tool] += c.i + c.o + c.cr + c.cw
        project_agents[c.project].add(agent)
        model_agents[c.model].add(agent)
    for sid, agents in board.agents_by_root.items():
        if not sid:
            continue
        keys = {sid, *agents}
        tool_agents[board.session_tool.get(sid, "")].update(keys)
        project_agents[board.session_project.get(sid, "")].update(keys)
    # A running tool with no session in this time is still a choice in the Tool menu.
    for group in board.placeholders:
        tool_agents[group["tool"]].update(())
    tool_agents.pop("", None)
    project_agents.pop("", None)
    model_agents.pop("", None)

    def ordered(groups: dict[str, set[str]]) -> list[dict]:
        return [{"id": k, "agents": len(v)} for k, v in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))]

    tools = sorted(tool_agents.items(), key=lambda kv: (-tool_tokens.get(kv[0], 0), -len(kv[1]), kv[0]))
    return {
        "tools": [{"id": k, "label": _label(k), "agents": len(v)} for k, v in tools],
        "projects": ordered(project_agents),
        "models": ordered(model_agents),
    }


def _count_agents(board: _Board, sids: Iterable[str]) -> int:
    return sum(1 + sum(1 for a in board.agents_by_root.get(sid, ()) if a != sid) for sid in sids)


_self_memo: list = [0.0, None]


def _self_usage() -> dict:
    """CPU and memory of aictl and its helpers, measured at most every SELF_TTL_S."""
    if _self_memo[1] is None or time.monotonic() - _self_memo[0] >= SELF_TTL_S:
        try:
            _self_memo[1] = self_usage()
            _self_memo[0] = time.monotonic()
        except Exception:  # noqa: BLE001 - a psutil failure must not take the board down
            _self_memo[1] = None
    return _self_memo[1] or {"cpu_percent": None, "memory_rss_bytes": None, "children": []}


def _self_section(db: Any) -> dict:
    usage = _self_usage()
    status = db.storage_status()
    return {
        "cpu_percent": usage.get("cpu_percent"),
        "memory_rss_bytes": usage.get("memory_rss_bytes"),
        "children": usage.get("children", []),
        "history_bytes": status["storage_bytes"],
        "history_live_bytes": status.get("storage_live_bytes"),
        "history_limit_bytes": status["storage_budget_bytes"],
        "retention_days": getattr(db, "_retention_days", None),
    }


_FROM_TABLE_RE = re.compile(r"\bFROM (\w+)\b")
_VIEW_PART_RE = re.compile(r"\bFROM (\w+\.\w+)\b")


def _view_body(conn: sqlite3.Connection, table: str) -> str | None:
    """The SELECT of a TEMP VIEW over several stores, or None when *table* is a table."""
    row = conn.execute("SELECT sql FROM sqlite_temp_master WHERE type = 'view' AND name = ?", (table,)).fetchone()
    return row[0].split(" AS ", 1)[1] if row else None


def _table_parts(conn: sqlite3.Connection, table: str) -> list[str]:
    """Each store's own table behind a view over several stores, or the table itself."""
    view = _view_body(conn, table)
    return _VIEW_PART_RE.findall(view) if view is not None else [table]


def _per_store(conn: sqlite3.Connection, sql: str, params: Any = ()) -> list:
    """Rows of a query over one table, run on each store's own table when the table is a
    view over several stores. A scan of each table is faster than one of the view.
    Rows of different stores are not merged."""
    table = _FROM_TABLE_RE.search(sql).group(1)  # type: ignore[union-attr]
    rows: list = []
    for part in _table_parts(conn, table):
        rows += conn.execute(_FROM_TABLE_RE.sub(f"FROM {part}", sql, count=1), params).fetchall()
    return rows


def read_scope(db: Any, filters: Filters | None = None, session: str | None = None) -> Any:
    """The stores a read needs, for a history split by project. A single store needs no scope.

    The board's range reaches back one span for the previous period. A project filter
    still reads every active store: the filter menus list every choice in the range, as
    with one store, and a change of project reuses the read of the range.
    """
    scope = getattr(db, "read_scope", None)
    if scope is None:
        return contextlib.nullcontext()
    if filters is None:
        return scope(session=session)
    span = filters.until - filters.since
    return scope(since=filters.since - span, until=filters.until)


def _in_session_scope(arg: str) -> Callable:
    """Reads of one session or agent look in the store that holds it, whatever its activity."""

    def wrap(fn: Callable) -> Callable:
        signature = inspect.signature(fn)

        @functools.wraps(fn)
        def run(*args: Any, **kwargs: Any) -> Any:
            bound = signature.bind(*args, **kwargs)
            with read_scope(bound.arguments["db"], session=str(bound.arguments.get(arg) or "")):
                return fn(*args, **kwargs)

        return run

    return wrap


def compute_board(
    db: Any,
    filters: Filters,
    snapshot: Any = None,
    now: float | None = None,
    base_memo: _BaseMemo | None = None,
    base_key: tuple | None = None,
) -> dict:
    """Everything ``GET /api/board`` returns, for one set of filters."""
    with read_scope(db, filters):
        return _compute_board(db, filters, snapshot, now, base_memo, base_key)


def _compute_board(
    db: Any,
    filters: Filters,
    snapshot: Any,
    now: float | None,
    base_memo: _BaseMemo | None,
    base_key: tuple | None,
) -> dict:
    now = time.time() if now is None else now
    conn = db._conn()
    # The usage cube sorts its rows. In memory, so that a large window never spills to a file.
    conn.execute("PRAGMA temp_store=MEMORY")
    memo_key = str(getattr(db, "_path", "memory"))
    facts = _store_facts(conn, memo_key)
    board = _Board(conn, filters, now, snapshot, facts=facts).load(base_memo, base_key)
    f = filters

    agents = board.agents()
    latency = _latency(board)
    skill_rows = _skill_rows(board)
    turns = _turns(board, skill_rows)
    tool_section = _tools_section(board)
    tool_calls_bucket = tool_section["calls_bucket"]
    tool_fail_bucket = tool_section["fail_bucket"]
    tool_spark = {"spark_calls": tool_section["spark_calls"], "spark_failed": tool_section["spark_failed"]}
    errors, api_bucket, api_by_project = _errors_section(board)
    changes, lines_by_project = _changes_section(board)
    tests, tests_passed, tests_failed, tests_by_project = _tests_section(board)
    tests_piped = sum(
        1
        for sid, _aid, _ts, _name, target, is_error, exit_code, _duration in board.test_rows
        if sid in board.scope
        and not _test_failed(is_error, exit_code)
        and _PIPED_TO_FILTER_RE.search(target or "")
        and "pipefail" not in (target or "")
    )
    loops = _loop_rows(board)
    prev = _previous(board)
    cpu, mem = _resource_series(board)

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
            sub = board.sub_rows.get(agent) or {}
            kind = "Main agents" if agent == sid else (sub.get("task") or "Subagent")
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
            if agent != sid and board.sub_status.get(agent) in ACTIVE_STATUSES
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
        "prev": prev,
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

    by_model = [
        {
            "model": model,
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
        for model, usage in sorted(board.by_model.items(), key=lambda kv: -kv[1].tokens)
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
        for kind, role in sorted(role_rows.items(), key=lambda kv: (kv[0] != "Main agents", -kv[1]["tokens"], kv[0]))
    ]

    loops_by_project: dict[str, int] = defaultdict(int)
    for loop in board.visible_loops:
        loops_by_project[board.session_project.get(loop["session_id"], "")] += 1
    project_ids = set(board.by_project) | {board.session_project.get(sid, "") for sid in board.scope}
    projects = []
    for project in project_ids:
        usage = board.by_project.get(project)
        calls = calls_by_project.get(project, 0)
        fails = fails_by_project.get(project, 0)
        test_counts = tests_by_project.get(project)
        lines = lines_by_project.get(project)
        project_msgs = (usage.calls if usage else 0) + prompts_by_project.get(project, 0) + calls
        project_msgs += sum(
            board.fallback_user.get(sid, 0) for sid in board.scope if board.session_project.get(sid, "") == project
        )
        projects.append(
            {
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
        )
    projects.sort(key=lambda p: (-p["tokens"], -p["agents"], p["project"]))

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

    runs = []
    for row in agents:
        if row["started_at"] and row["ended_at"] and row["ended_at"] > row["started_at"]:
            runs.append((row["ended_at"] - row["started_at"]) * 1000.0)
    latency_rows = [
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

    _scoped_prompts = board._scoped()
    tool_order = list(board.tool_order)
    options = _options(board)
    option_tools = [o["id"] for o in options["tools"]]
    selected = set(stored_ids_for(f.tools)) if f.tools is not None else None
    project_list = sorted(project_ids - {""})
    project_prompts, prompts_searched = _project_prompts(board, project_list)

    return {
        "generated_at": now,
        "capture_mode": getattr(db, "capture", "full"),
        "range": {
            "since": f.since,
            "until": f.until,
            "bucket_s": f.bucket_s,
            "bucket_starts": [f.since + i * f.bucket_s for i in range(n)],
            # The last bucket ends after now, so its figures are not complete yet.
            "partial_bucket": n - 1 if f.until > now and n else None,
        },
        "options": options,
        "scope": {
            "shown_agents": _count_agents(board, board.scope),
            "shown_sessions": sum(1 for sid in board.scope if sid in board.agents_by_root),
            "all_agents": _count_agents(board, (sid for sid in board.agents_by_root if sid)),
            "listed_agents": len(agents),
        },
        "kpis": kpis,
        "attention": _attention(board, loops, agents),
        "agents": agents,
        "by_model": by_model,
        "by_role": by_role,
        "series": series,
        "saved_usd": _usd(board.total.saved),
        "unpriced": _unpriced_section(board),
        "credits": _credits_section(db, board),
        "projects": projects[:MAX_LIST_ROWS],
        "prompts": _prompts_section(board, turns.tokens),
        "project_prompts": project_prompts,
        "project_prompts_searched": prompts_searched,
        "skills": _skills_section(board, skill_rows, turns),
        "tests_piped": tests_piped,
        "prompts_total": board.conn.execute(f"SELECT COUNT(*) FROM session_prompts WHERE {_scoped_prompts[0]} AND agent_id = ''", _scoped_prompts[1]).fetchone()[0],
        "tools": tool_section["rows"],
        "confirms": _confirms_section(board),
        "errors": errors,
        "latency": latency_rows,
        "loops": loops,
        "changes": changes,
        "tests": tests,
        "memory_files": _memory_files(board),
        "processes": _processes(board),
        # Names for tools that have processes but no activity in this range.
        "tool_labels": {tool: _label(tool) for tool in {p["tool"] for p in _processes(board)} | set(cpu)},
        "sources": _sources(_source_rows(conn, memo_key), tool_order or option_tools, selected),
        "coverage": {"rows": coverage_rows(facts, option_tools), "notes": coverage_notes([*option_tools, *_COVERAGE_TOOLS])},
        "self": _self_section(db),
    }


# ─── Detail routes ────────────────────────────────────────────────


def _resolve_agent(conn: sqlite3.Connection, agent_id: str) -> tuple[str, str] | None:
    """(session id, agent key) of a board agent id."""
    row = conn.execute("SELECT session_id FROM agents WHERE agent_id = ?", (agent_id,)).fetchone()
    if row and row[0] and row[0] != agent_id:
        return row[0], agent_id
    row = conn.execute("SELECT session_id FROM requests WHERE agent_id = ? LIMIT 1", (agent_id,)).fetchone()
    if row and row[0] and row[0] != agent_id:
        return row[0], agent_id
    return (agent_id, agent_id)


def _detail_filters(now: float) -> Filters:
    return Filters(since=0.0, until=now + 60.0, buckets=1)


@_in_session_scope("agent_id")
def live_pids_of(db: Any, snapshot: Any, agent_id: str, now: float | None = None) -> list[int]:
    """The processes of a board agent, for Stop. A subagent has none of its own."""
    now = time.time() if now is None else now
    conn = db._conn()
    if agent_id.startswith("live:"):
        board = _Board(conn, _detail_filters(now), now, snapshot).load()
        for group in board.placeholders:
            if f"live:{group['tool']}:{group['project']}" == agent_id:
                return sorted(group["pids"])
        return []
    sid, agent = _resolve_agent(conn, agent_id)
    if agent != sid:
        return []
    board = _Board(conn, _detail_filters(now), now, snapshot, only_session=sid).load()
    return sorted((board.live_by_sid.get(sid) or {}).get("pids", ()))


def _session_board(db: Any, conn: sqlite3.Connection, sid: str, snapshot: Any, now: float, counts_only: bool = False) -> _Board:
    """The board of one session over its whole life, as the agent detail reads it."""
    first = conn.execute(
        "SELECT MIN(t) FROM (SELECT MIN(ts) t FROM requests WHERE session_id = ?"
        " UNION ALL SELECT MIN(ts) FROM tool_invocations WHERE session_id = ?"
        " UNION ALL SELECT MIN(ts) FROM session_prompts WHERE session_id = ?)",
        (sid, sid, sid),
    ).fetchone()[0]
    filters = _detail_filters(now)
    if first and first < filters.until:
        filters = replace(filters, since=first)
    facts = _store_facts(conn, str(getattr(db, "_path", "memory")))
    return _Board(conn, filters, now, snapshot, only_session=sid, facts=facts).load(counts_only=counts_only)


@_in_session_scope("sid")
def session_numbers(db: Any, sid: str, now: float | None = None) -> dict | None:
    """Tokens, cost, tool calls and prompts of a main agent, the same as its agent detail.

    Read in the session's own read scope, so rows of a session that are in two stores
    (a move that is not done) are all counted. None when the board has no such session.
    """
    now = time.time() if now is None else now
    conn = db._conn()
    board = _session_board(db, conn, sid, None, now, counts_only=True)
    if sid not in board.scope:
        return None
    row = board._agent_row(sid, sid, "", [0] * SPARK_POINTS)
    parts = [row.get(k) for k in ("input", "output", "cache_read", "cache_write")]
    return {
        "tokens": sum(int(v or 0) for v in parts) if any(v is not None for v in parts) else None,
        "cost_usd": row["cost_usd"],
        "tool_calls": row["tool_calls"],
        "prompts": (row.get("msgs") or {}).get("user"),
    }


@_in_session_scope("agent_id")
def agent_detail(db: Any, agent_id: str, snapshot: Any = None, now: float | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    conn = db._conn()
    sid, agent = _resolve_agent(conn, agent_id)
    board = _session_board(db, conn, sid, snapshot, now)
    if sid not in board.scope:
        return 404, {"error": "No such agent"}
    root = agent == sid
    titles = board._titles([(sid, a) for a in {sid, *board.agents_by_root.get(sid, ())}])
    activity = board._activity_for(list(titles))
    row = board._agent_row(sid, agent, titles.get((sid, agent), _short(agent)), activity.get((sid, agent), [0] * SPARK_POINTS))
    subagents = [
        board._agent_row(sid, a, titles[(sid, a)], activity[(sid, a)])
        for a in sorted(board.agents_by_root.get(sid, ()))
        if a != sid and root
    ]

    agent_sql, agent_params = ("", []) if root else (" AND agent_id = ?", [agent])
    by_model = []
    for model, n, i, o, cr, cw, ts, stored in conn.execute(
        "SELECT model, COUNT(*), SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens), SUM(cache_creation_tokens), MAX(ts), SUM(cost_usd)"
        f" FROM requests WHERE session_id = ?{agent_sql} GROUP BY model",
        [sid, *agent_params],
    ):
        cost = _cost_of(stored, model, i, o, cr, cw, ts)
        by_model.append(
            {
                "model": model,
                "msgs": n,
                "tokens": i + o + cr + cw,
                "input": i,
                "output": o,
                "cache_read": cr,
                "cache_write": cw,
                "cached_share": _ratio(cr, i + cr + cw),
                "cost_usd": _usd(cost),
            }
        )
    if not by_model and root:
        for fallback in _fallback_rows(conn, 0.0, now + 60.0, sid):
            for model, usage in _fallback_models(fallback).items():
                cost, _ = _list_cost(
                    model, usage["input"], usage["output"], usage["cache_read"], usage["cache_write"], fallback["last_activity_at"]
                )
                by_model.append(
                    {
                        "model": model,
                        "msgs": usage["requests"],
                        "tokens": usage["input"] + usage["output"] + usage["cache_read"] + usage["cache_write"],
                        "input": usage["input"],
                        "output": usage["output"],
                        "cache_read": usage["cache_read"],
                        "cache_write": usage["cache_write"],
                        "cached_share": _ratio(usage["cache_read"], usage["input"] + usage["cache_read"] + usage["cache_write"]),
                        "cost_usd": _usd(cost),
                        "estimated": True,
                    }
                )

    live = board.live_by_sid.get(sid) if root else None
    process = {
        "cpu_percent": row["cpu_percent"],
        "mem_mb": row["mem_mb"],
        "pids": row["pids"],
        "started_at": row["started_at"],
    }
    if live is None:
        process["cpu_percent"] = process["mem_mb"] = None

    turns = _agent_turns(conn, sid, agent_sql, agent_params)
    tool_calls = [
        {
            "ts": ts,
            "name": name,
            "target": _one_line(target, 300),
            "duration_ms": duration or None,
            "failed": bool(failed),
            "confirm": confirm or None,
            "input_bytes": in_bytes,
            "output_bytes": out_bytes,
        }
        for ts, name, target, duration, failed, confirm, in_bytes, out_bytes in conn.execute(
            "SELECT ts, tool_name, target, duration_ms, is_error, confirm, input_bytes, output_bytes FROM tool_invocations"
            f" WHERE session_id = ?{agent_sql} AND {_IS_CALL_SQL} ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
            [sid, *agent_params],
        )
    ]
    # The call list above is capped, so the figures per tool come from all calls.
    tool_totals = _tool_totals(
        conn.execute(
            "SELECT tool_name, is_error, duration_ms, input_bytes, output_bytes FROM tool_invocations"
            f" WHERE session_id = ?{agent_sql} AND {_IS_CALL_SQL}",
            [sid, *agent_params],
        )
    )
    files = [
        {"path": path, "lines_added": _maybe_int(added), "lines_removed": _maybe_int(removed), "edits": edits}
        for path, added, removed, edits in conn.execute(
            "SELECT path, SUM(json_extract(detail, '$.lines_added')), SUM(json_extract(detail, '$.lines_removed')), COUNT(*)"
            f" FROM file_write_events WHERE session_id = ? GROUP BY path ORDER BY MAX(ts) DESC LIMIT {MAX_DETAIL_ROWS}",
            (sid,),
        )
    ] if root else []
    tests = []
    for ts, name, target, is_error, exit_code, duration in conn.execute(
        "SELECT ts, tool_name, target, is_error, exit_code, duration_ms FROM tool_invocations"
        f" WHERE session_id = ?{agent_sql} AND {_TEST_LIKE_SQL} ORDER BY ts DESC",
        [sid, *agent_params],
    ):
        if is_command_tool(name) and is_test_command(target):
            tests.append(
                {
                    "ts": ts,
                    "command": _one_line(target, 200),
                    "passed": not _test_failed(is_error, exit_code),
                    "duration_ms": duration or None,
                }
            )
        if len(tests) >= MAX_DETAIL_ROWS:
            break
    errors = []
    for ts, name, summary in conn.execute(
        f"SELECT ts, tool_name, result_summary FROM tool_invocations WHERE session_id = ?{agent_sql} AND is_error = 1 AND {_IS_CALL_SQL}"
        f" ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
        [sid, *agent_params],
    ):
        errors.append({"ts": ts, "key": _tool_error_key(name, summary), "detail": _one_line(summary, 500)})
    for ts, error_type, status in conn.execute(
        f"SELECT ts, error_type, http_status FROM requests WHERE session_id = ?{agent_sql} AND is_error = 1"
        f" ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
        [sid, *agent_params],
    ):
        errors.append(
            {
                "ts": ts,
                "key": _api_error_key(error_type, status),
                "detail": " ".join(str(p) for p in (error_type, status) if p),
            }
        )
    errors.sort(key=lambda e: e["ts"], reverse=True)
    session = _session_row(db, conn, sid)
    own_loops = [loop for loop in board.loops if loop["agent_id"] == agent or (root and loop["session_id"] == sid)]
    loop = None
    if own_loops:
        newest = own_loops[0]
        loop = {
            "pattern": newest["pattern"],
            "repeats": newest["repeats"],
            "since_ts": newest["since_ts"],
            "at_end": newest["at_end"],
            "tokens": newest.get("tokens"),
            "cost_usd": newest.get("cost_usd"),
        }
    return 200, {
        "agent": row,
        "by_model": by_model,
        "subagents": subagents,
        "process": process,
        "skills": _agent_skills(conn, sid, agent, root),
        "context": _agent_context(conn, sid, agent, root),
        "turns": turns,
        "tool_totals": tool_totals,
        "tool_calls": tool_calls,
        "files": files,
        "tests": tests,
        "loop": loop,
        "errors": errors[:MAX_DETAIL_ROWS],
        "git": _agent_git(db, session, sid),
        "runs": _agent_runs(db, session, sid, row, now) if root else [],
        "resources": _agent_resources(db, conn, board, sid, row, root, now),
        **_agent_record(db, conn, session, sid, row, root),
    }


def _agent_record(db: Any, conn: sqlite3.Connection, session: dict, sid: str, row: dict, root: bool) -> dict:
    """Artifacts and commits of a main agent's session. A subagent shares its session's, so it has none here."""
    from .session_record import empty_record, record_section

    if not root:
        return empty_record()
    project = str(session.get("project_path") or row.get("project") or "")
    return {**record_section(db, conn, session, sid, project), "context_files": _session_context_files(project)}


def _session_context_files(folder: str) -> dict:
    """Instruction and config files that can affect a session working in *folder* (see tree_walk)."""
    from ..tree_walk import files_for_folder

    found = files_for_folder(folder) if folder else {"git_root": None, "files": [], "read": False}
    return {
        "git_root": found["git_root"],
        "read": found["read"],
        "files": [{"path": p, "name": _basename(p)} for p in found["files"][:MAX_LIST_ROWS]],
        "total": len(found["files"]),
    }


# ─── /api/board/agent/flow and /api/board/agent/transcript ────────
# The drawer's Flow, Timeline and Transcript tabs. The events come from the store's own
# rows (prompts, model calls, tool calls, subagents, compactions, the session's start and
# end), so a session that aictl reads from the tool's session files has a flow too. The
# hook and OpenTelemetry events of the legacy session flow are merged in when they exist.
# A subagent id shows the whole session of its main agent.

MAX_FLOW_EVENTS = 5000
FLOW_DEFAULT_EVENTS = 500
FLOW_TARGET_CHARS = 300
FLOW_MATCH_S = 2.0
FLOW_SESSION_MATCH_S = 60.0
FLOW_PREVIEW_CHARS = 200
ACTION_SUMMARY_CHARS = 200
REPLY_NOT_KEPT = "The reply text is not kept"
# Tables that keep the text of a conversation, both sides, for the tools whose ingesters read it.
_MESSAGE_TABLES = ("copilot_session_messages", "vscode_chat_messages", "cursor_session_messages")
_FLOW_ORDER = {"session_start": 0, "user_message": 1, "subagent": 2, "api_call": 3, "api_response": 4, "tool_use": 5, "error": 6}
_FLOW_MARKERS = frozenset({"session_start", "session_end"})
_EMPTY = (None, "", [], {})
# The store keeps the model calls and tool calls of hooks and OpenTelemetry as rows of its own,
# so a legacy one of these that matches no row is the same call at another time stamp.
_STORE_COUNTED = frozenset({"api_call", "tool_use"})


def _zero_tokens() -> dict:
    return {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0}


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)).fetchone() is not None


def _messages(conn: sqlite3.Connection, sid: str, role: str, since: float, until: float) -> list[tuple[float, str, str]]:
    """(ts, text, model) of the stored conversation messages of one side, oldest first."""
    out: list[tuple[float, str, str]] = []
    for table in _MESSAGE_TABLES:
        if not _table_exists(conn, table):
            continue
        model_sql = "model" if table == "vscode_chat_messages" else "''"
        out += conn.execute(
            f"SELECT ts, content, {model_sql} FROM {table} WHERE session_id = ? AND role = ? AND ts >= ? AND ts < ? AND content <> '' ORDER BY ts",
            (sid, role, since, until),
        ).fetchall()
    return sorted(out)


def _flow_session_known(conn: sqlite3.Connection, sid: str) -> bool:
    return any(
        conn.execute(f"SELECT 1 FROM {table} WHERE session_id = ? LIMIT 1", (sid,)).fetchone()
        for table in ("sessions", "requests", "session_prompts", "tool_invocations", "events")
    )


def _store_flow_events(conn: sqlite3.Connection, sid: str, since: float, until: float) -> tuple[list[dict], str]:
    """The session's events from the store's own rows, and the tool that wrote them."""
    from .session_flow import _input_preview

    session = conn.execute("SELECT tool, project_path, started_at, ended_at FROM sessions WHERE session_id = ?", (sid,)).fetchone()
    tool = (session[0] if session else "") or ""
    if not tool:
        row = conn.execute("SELECT tool FROM requests WHERE session_id = ? AND tool <> '' LIMIT 1", (sid,)).fetchone()
        tool = row[0] if row else ""
    events: list[dict] = []

    def inside(ts: float | None) -> bool:
        return bool(ts) and since <= ts < until

    if session and inside(session[2]):
        events.append({"ts": session[2], "type": "session_start", "tool": tool, "cwd": session[1] or "", "source": "store"})
    if session and inside(session[3]):
        events.append({"ts": session[3], "type": "session_end", "tool": tool, "source": "store"})

    task_prompts: dict[str, str] = {}
    prompts: list[tuple[float, str]] = []
    for ts, aid, text in conn.execute(
        "SELECT ts, agent_id, text FROM session_prompts WHERE session_id = ? AND ts >= ? AND ts < ? ORDER BY ts", (sid, since, until)
    ):
        if aid:
            task_prompts.setdefault(aid, mask_secrets(text))
        else:
            prompts.append((ts, mask_secrets(text)))
    if not prompts:
        prompts = [(ts, mask_secrets(text)) for ts, text, _model in _messages(conn, sid, "user", since, until)]
    for ts, text in prompts:
        message = {
            "ts": ts,
            "type": "user_message",
            "from": "user",
            "to": tool,
            "message": text,
            "preview": text[:FLOW_PREVIEW_CHARS],
            "redacted": not text,
            "tokens": _zero_tokens(),
            "model": "",
            "api_calls": 0,
            "duration_ms": 0,
            "end_ts": ts,
            "source": "store",
        }
        if text:
            message["prompt_length"] = len(text)
        events.append(message)

    for ts, aid, model, i, o, cr, cw, cost, duration, ttft, finish, is_error, error_type, status in conn.execute(
        "SELECT ts, agent_id, model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cost_usd, duration_ms,"
        " ttft_ms, finish_reason, is_error, error_type, http_status FROM requests WHERE session_id = ? AND ts >= ? AND ts < ? ORDER BY ts",
        (sid, since, until),
    ):
        call = {
            "ts": ts,
            "type": "api_call",
            "from": tool,
            "to": "api",
            "model": model or "",
            "tokens": {"input": i or 0, "output": o or 0, "cache_read": cr or 0, "cache_creation": cw or 0},
            "duration_ms": duration or 0,
            "is_error": bool(is_error),
            "source": "store",
        }
        for key, value in (("ttft_ms", ttft), ("cost_usd", _usd(cost) if cost else None), ("finish_reason", finish), ("agent_id", aid)):
            if value not in _EMPTY and value != 0:
                call[key] = value
        if is_error:
            call["error_type"] = error_type or ""
            if status:
                call["http_status"] = status
        events.append(call)

    for ts, aid, name, target, raw_input, result, duration, is_error, exit_code, confirm in conn.execute(
        "SELECT ts, agent_id, tool_name, target, input, result_summary, duration_ms, is_error, exit_code, confirm FROM tool_invocations"
        f" WHERE session_id = ? AND ts >= ? AND ts < ? AND {_IS_CALL_SQL} ORDER BY ts",
        (sid, since, until),
    ):
        use = {"ts": ts, "type": "tool_use", "from": tool, "to": name or "tool", "success": not is_error, "duration_ms": duration or 0, "source": "store"}
        if target:
            use["target"] = _one_line(target, FLOW_TARGET_CHARS)
        try:
            args = json.loads(raw_input) if raw_input else None
        except ValueError:
            args = None
        if isinstance(args, dict) and args:
            masked = {k: mask_secrets(v) if isinstance(v, str) else v for k, v in args.items()}
            use["params"] = json.dumps(masked, ensure_ascii=False)
            use["input_preview"] = _input_preview(masked)
        if result:
            use["result_summary"] = mask_secrets(result)
        for key, value in (("exit_code", exit_code), ("confirm", confirm), ("agent_id", aid)):
            if value not in _EMPTY:
                use[key] = value
        events.append(use)

    for aid, task, model, started, ended, completed in conn.execute(
        "SELECT agent_id, task, model, started_at, ended_at, completed FROM agents WHERE session_id = ? AND agent_id <> ? ORDER BY started_at",
        (sid, sid),
    ):
        label = task or "subagent"
        if inside(started):
            start = {"ts": started, "type": "subagent", "from": tool, "to": label, "agent_id": aid, "source": "store"}
            if model:
                start["model"] = model
            if task_prompts.get(aid):
                start["prompt"] = task_prompts[aid]
            events.append(start)
        if inside(ended):
            end = {"ts": ended, "type": "subagent_end", "from": label, "to": tool, "agent_id": aid, "completed": bool(completed), "source": "store"}
            if started and ended >= started:
                end["duration_ms"] = round((ended - started) * 1000)
            events.append(end)

    if _table_exists(conn, "context_events"):
        rows = conn.execute(
            "SELECT ts, agent_id, trigger, before_tokens, after_tokens, duration_ms FROM context_events"
            " WHERE session_id = ? AND kind = 'compaction' ORDER BY ts",
            (sid,),
        ).fetchall()
        for n, (ts, aid, trigger, before, after, took) in enumerate(rows, 1):
            if not inside(ts):
                continue
            compaction = {"ts": ts, "type": "compaction", "compaction_count": n, "duration_ms": took or 0, "source": "store"}
            if took:
                compaction["end_ts"] = ts + took / 1000
            for key, value in (("trigger", trigger), ("before_tokens", before), ("after_tokens", after), ("agent_id", aid)):
                if value not in _EMPTY:
                    compaction[key] = value
            events.append(compaction)

    for ts, text, model in _messages(conn, sid, "assistant", since, until):
        reply = mask_secrets(text)
        events.append(
            {
                "ts": ts,
                "type": "api_response",
                "from": "api",
                "to": tool,
                "model": model or "",
                "response": reply,
                "response_preview": reply[:FLOW_PREVIEW_CHARS],
                "source": "store",
            }
        )
    return events, tool


def _legacy_flow_events(legacy: dict) -> tuple[list[dict], str]:
    """The events of a legacy session flow, with the tools of a hook turn as events of their own."""
    source = (legacy.get("summary") or {}).get("source") or "hooks"
    out: list[dict] = []
    for turn in legacy.get("turns") or []:
        event = {**turn, "source": source}
        for tool_use in event.pop("tools", None) or []:
            ts = tool_use.get("ts") or event["ts"]
            if tool_use.get("is_agent"):
                out.append({"ts": ts, "type": "subagent", "to": tool_use.get("agent_type") or "subagent", "prompt": tool_use.get("args_summary") or "", "source": source})
                continue
            use = {"ts": ts, "type": "tool_use", "to": tool_use.get("name") or "tool", "duration_ms": tool_use.get("duration_ms") or 0, "source": source}
            for key in ("input_preview", "result_summary"):
                if tool_use.get(key):
                    use[key] = tool_use[key]
            if tool_use.get("args_summary"):
                use["target"] = tool_use["args_summary"]
            out.append(use)
        out.append(event)
    return out, source


def _match_key(event: dict) -> tuple:
    return (event.get("type"), event.get("to") or "") if event.get("type") == "tool_use" else (event.get("type"),)


def _merge_flow(store: list[dict], legacy: list[dict]) -> list[dict]:
    """Store events with the legacy events added. A legacy event of the same kind within
    FLOW_MATCH_S of a store event is the same event: it fills the fields the store lacks.
    A legacy model call or tool call that matches nothing is added only when the store has
    none of that kind."""
    index: dict[tuple, list[dict]] = defaultdict(list)
    for event in store:
        index[_match_key(event)].append(event)
    for group in index.values():
        group.sort(key=lambda e: e["ts"])
    times = {key: [e["ts"] for e in group] for key, group in index.items()}
    taken: set[int] = set()
    store_kinds = {e["type"] for e in store}
    merged = list(store)
    for event in legacy:
        key = _match_key(event)
        group, ts_list = index.get(key, []), times.get(key, [])
        window = FLOW_SESSION_MATCH_S if event.get("type") in _FLOW_MARKERS else FLOW_MATCH_S
        at = bisect.bisect_left(ts_list, event["ts"])
        best = None
        for j in (at - 1, at):
            if 0 <= j < len(group) and id(group[j]) not in taken and abs(group[j]["ts"] - event["ts"]) <= window:
                if best is None or abs(group[j]["ts"] - event["ts"]) < abs(best["ts"] - event["ts"]):
                    best = group[j]
        if best is None:
            if not (event.get("type") in _STORE_COUNTED and event.get("type") in store_kinds):
                merged.append(event)
            continue
        taken.add(id(best))
        for field, value in event.items():
            if field not in ("ts", "source", "tokens", "api_calls", "duration_ms", "end_ts", "wall_ms") and value not in _EMPTY and best.get(field) in _EMPTY:
                best[field] = value
        if best.get("type") == "user_message" and best.get("message"):
            best["redacted"] = False
            best["preview"] = best.get("preview") or best["message"][:FLOW_PREVIEW_CHARS]
        best["source"] = "store+" + str(event.get("source") or "")
    merged.sort(key=lambda e: (e["ts"], _FLOW_ORDER.get(e.get("type"), 9)))
    return merged


def _event_tokens(event: dict) -> int:
    tokens = event.get("tokens") or {}
    return int(tokens.get("input") or 0) + int(tokens.get("output") or 0)


def _aggregate_flow(events: list[dict]) -> tuple[int, int]:
    """Each prompt takes the model calls up to the next prompt. Each event gets the tokens so
    far in the session and in its turn. Returns the session total and the largest turn."""
    recount = any(e["type"] == "api_call" for e in events)
    cumulative = turn_tokens = largest = 0
    current: dict | None = None
    for event in events:
        kind = event["type"]
        if kind == "user_message":
            current, turn_tokens = event, 0
            if recount:
                event.update(tokens=_zero_tokens(), api_calls=0, duration_ms=0, model="", end_ts=event["ts"])
        elif current is not None and kind not in _FLOW_MARKERS:
            current["end_ts"] = max(current.get("end_ts") or current["ts"], event.get("end_ts") or event["ts"])
            if kind == "api_call" and recount:
                tokens = current["tokens"]
                for key in ("input", "output", "cache_read", "cache_creation"):
                    tokens[key] += int((event.get("tokens") or {}).get(key) or 0)
                current["api_calls"] += 1
                current["duration_ms"] += event.get("duration_ms") or 0
                current["model"] = current["model"] or event.get("model") or ""
        if kind == "api_call":
            cumulative += _event_tokens(event)
            turn_tokens += _event_tokens(event)
            largest = max(largest, turn_tokens)
        event["cum_tokens"] = cumulative
        event["rt_tokens"] = turn_tokens
    for event in events:
        if event["type"] == "user_message":
            end = event.get("end_ts") or event["ts"]
            event["wall_ms"] = round((end - event["ts"]) * 1000) if end > event["ts"] else event.get("duration_ms") or 0
    return cumulative, largest


def _flow_summary(events: list[dict], source: str, cumulative: int, largest: int) -> dict:
    api = [e for e in events if e["type"] == "api_call"]
    prompts = [e for e in events if e["type"] == "user_message"]
    token_rows = api or prompts
    total_input = sum(int((e.get("tokens") or {}).get("input") or 0) for e in token_rows)
    total_output = sum(int((e.get("tokens") or {}).get("output") or 0) for e in token_rows)
    total_cache = sum(int((e.get("tokens") or {}).get("cache_read") or 0) for e in token_rows)
    calls = len(api) or sum(e.get("api_calls") or 0 for e in prompts)
    ttfts = sorted(float(e["ttft_ms"]) for e in api if (e.get("ttft_ms") or 0) > 0)
    count: dict[str, int] = defaultdict(int)
    for event in events:
        count[event["type"]] += 1
    first = events[0]["ts"] if events else 0
    last = max((e.get("end_ts") or e["ts"] for e in events), default=0)
    return {
        "total_turns": count["user_message"],
        "total_api_calls": calls,
        "total_tool_uses": count["tool_use"],
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cache_tokens": total_cache,
        "total_tokens": total_input + total_output,
        "avg_tokens_per_call": round((total_input + total_output) / calls) if calls else 0,
        "compactions": count["compaction"],
        "duration_s": round(last - first, 1) if first else 0,
        "source": source,
        "event_count": len(events),
        "subagents": count["subagent"],
        "hooks": count["hook"],
        "errors": count["error"] + sum(1 for e in api if e.get("is_error")) + sum(1 for e in events if e["type"] == "tool_use" and e.get("success") is False),
        "cumulative_tokens": cumulative,
        "largest_turn_tokens": largest,
        "ttft_ms": _median(ttfts),
        "ttft_calls": len(ttfts),
    }


FLOW_MEMO_S = 120.0
_FLOW_STAMP_TABLES = ("requests", "tool_invocations", "session_prompts", "events")


def _flow_stamp(conn: sqlite3.Connection, sid: str) -> tuple:
    """What the store holds for a session, as cheap counts: a change here means a new flow."""
    return tuple(conn.execute(f"SELECT COUNT(*), MAX(ts) FROM {table} WHERE session_id = ?", (sid,)).fetchone() for table in _FLOW_STAMP_TABLES)


def _session_flow(db: Any, agent_id: str, since: float, until: float, legacy_flow: Callable[[str, float, float], dict] | None) -> tuple[str, list[dict], str] | None:
    """(session id, merged events, source) of a board agent, or None for an unknown agent.

    Building the flow reads every record of the session, so the result is kept on the store
    for FLOW_MEMO_S as long as the session's records have not changed. The flow of one
    session is asked for several times in a row: the flow tab, the transcript, each turn.
    """
    conn = db._conn()
    sid, _agent = _resolve_agent(conn, agent_id)
    cached = legacy_flow is None and isinstance(getattr(db, "__dict__", None), dict)
    if cached:
        memo = db.__dict__.setdefault("_flow_memo", {})
        # An open-ended range ends at "now plus a minute", which differs on every call.
        key = (sid, since, None if until >= time.time() else until, _flow_stamp(conn, sid))
        hit = memo.get(key)
        if hit and 0 <= time.time() - hit[0] < FLOW_MEMO_S:
            return hit[1]
    found = _session_flow_build(db, conn, sid, since, until, legacy_flow)
    if cached:
        memo.clear()
        memo[key] = (time.time(), found)
    return found


def _session_flow_build(db: Any, conn: sqlite3.Connection, sid: str, since: float, until: float, legacy_flow: Callable[[str, float, float], dict] | None) -> tuple[str, list[dict], str] | None:
    if legacy_flow is None:
        from .session_flow import build_session_flow

        def legacy_flow(session_id: str, lo: float, hi: float) -> dict:
            return build_session_flow(db, session_id, lo, hi)

    store, _tool = _store_flow_events(conn, sid, since, until)
    legacy, legacy_source = _legacy_flow_events(legacy_flow(sid, since, until) or {})
    if not store and not legacy and not _flow_session_known(conn, sid):
        return None
    source = ("store+" + legacy_source if legacy else "store") if store else (legacy_source if legacy else "store")
    return sid, _merge_flow(store, legacy), source


@_in_session_scope("agent_id")
def agent_flow(
    db: Any,
    agent_id: str,
    since: float | None = None,
    until: float | None = None,
    now: float | None = None,
    legacy_flow: Callable[[str, float, float], dict] | None = None,
    limit: int | None = None,
) -> tuple[int, dict]:
    """The session flow of a board agent: ``{turns, summary}`` like ``build_session_flow``.

    Each event carries ``cum_tokens`` (input and output so far in the session) and
    ``rt_tokens`` (so far in its turn). The summary counts every event in the range; only the
    newest ``limit`` events are returned, FLOW_DEFAULT_EVENTS by default and at most
    MAX_FLOW_EVENTS. The caller asks for more with a larger limit.
    """
    now = time.time() if now is None else now
    lo, hi = since if since is not None else 0.0, until if until is not None else now + 60.0
    found = _session_flow(db, agent_id, lo, hi, legacy_flow)
    if found is None:
        return 404, {"error": "No such agent"}
    sid, events, source = found
    cumulative, largest = _aggregate_flow(events)
    summary = _flow_summary(events, source, cumulative, largest)
    keep = max(1, min(int(limit or FLOW_DEFAULT_EVENTS), MAX_FLOW_EVENTS))
    shown = events[-keep:]
    summary["shown_events"] = len(shown)
    summary["omitted_events"] = len(events) - len(shown)
    return 200, {"session_id": sid, "turns": shown, "summary": summary, "capture_mode": getattr(db, "capture", "full")}


def _clip(text: Any, limit: int = ACTION_SUMMARY_CHARS) -> str:
    text = " ".join(str(text or "").split())
    return text[: limit - 1] + "…" if len(text) > limit else text


def _flow_action(event: dict) -> dict | None:
    """One transcript action of a flow event, or None for an event that is not an action."""
    kind = event["type"]
    if kind not in ("api_call", "api_response", "tool_use", "subagent", "error", "hook", "compaction"):
        return None
    name = {
        "api_call": event.get("model"),
        "api_response": event.get("model"),
        "tool_use": event.get("to"),
        "subagent": event.get("to"),
        "error": event.get("error_type"),
        "hook": event.get("hook_name"),
        "compaction": event.get("trigger") or "compaction",
    }[kind]
    action: dict = {"ts": event["ts"], "kind": kind, "name": name or "", "duration_ms": event.get("duration_ms") or 0}
    inputs = {"tool_use": event.get("target") or event.get("input_preview"), "subagent": event.get("prompt")}
    outputs = {
        "tool_use": event.get("result_summary"),
        "api_response": event.get("response_preview"),
        "error": event.get("error_message"),
        "api_call": event.get("error_type") if event.get("is_error") else None,
    }
    if inputs.get(kind):
        action["input_summary"] = _clip(inputs[kind])
    if outputs.get(kind):
        action["output_summary"] = _clip(outputs[kind])
    if kind == "api_call":
        action["tokens"] = dict(event.get("tokens") or _zero_tokens())
        action["success"] = not event.get("is_error")
    if kind == "tool_use" and isinstance(event.get("success"), bool):
        action["success"] = event["success"]
    detail = {key: event[key] for key in ("exit_code", "confirm", "agent_id") if event.get(key) not in _EMPTY}
    if kind == "api_response" and event.get("response"):
        detail["response"] = event["response"]
    if detail:
        action["detail"] = detail
    return action


def _transcript_turn(ts: float, prompt: str = "", opened_by_prompt: bool = False) -> dict:
    return {
        "ts": ts,
        "end_ts": ts,
        "prompt": prompt,
        "prompt_preview": prompt[:FLOW_PREVIEW_CHARS],
        "prompt_event": opened_by_prompt,
        "response": "",
        "response_preview": "",
        "model": "",
        "tokens": {**_zero_tokens(), "total": 0},
        "api_calls": 0,
        "duration_ms": 0,
        "wall_ms": 0,
        "reply_ms": None,
        "actions": [],
        "tool_use_count": 0,
    }


def _flow_transcript(events: list[dict]) -> list[dict]:
    """Turns from flow events: each prompt opens a turn, and what follows belongs to it."""
    turns: list[dict] = []
    current: dict | None = None
    for event in events:
        if event["type"] == "user_message":
            current = _transcript_turn(event["ts"], event.get("message") or "", True)
            current["end_ts"] = event.get("end_ts") or event["ts"]
            turns.append(current)
            continue
        action = _flow_action(event)
        if action is None:
            continue
        if current is None:
            current = _transcript_turn(event["ts"])
            turns.append(current)
        current["actions"].append(action)
        current["end_ts"] = max(current["end_ts"], event.get("end_ts") or event["ts"])
        if action["kind"] == "api_response" and event.get("response"):
            current["response"] = (current["response"] + "\n\n" + event["response"]) if current["response"] else event["response"]
    for turn in turns:
        _tally_turn(turn)
    return turns


def _tally_turn(turn: dict) -> None:
    """Tokens, model calls, reply time and counts of a turn, from its actions."""
    calls = [a for a in turn["actions"] if a["kind"] == "api_call"]
    tokens = _zero_tokens()
    models: dict[str, int] = defaultdict(int)
    for call in calls:
        for key in tokens:
            tokens[key] += int((call.get("tokens") or {}).get(key) or 0)
        if call.get("name"):
            models[call["name"]] += 1
    if calls:
        turn["tokens"] = {**tokens, "total": tokens["input"] + tokens["output"]}
        turn["api_calls"] = len(calls)
        turn["model"] = max(models, key=models.get) if models else turn.get("model") or ""
    durations = [a["duration_ms"] for a in calls if a.get("duration_ms")]
    turn["duration_ms"] = sum(durations) if durations else turn.get("duration_ms") or 0
    turn["reply_ms"] = sum(durations) if durations else turn.get("reply_ms")
    turn["wall_ms"] = round((turn["end_ts"] - turn["ts"]) * 1000) if turn["end_ts"] > turn["ts"] else turn["duration_ms"]
    turn["tool_use_count"] = sum(1 for a in turn["actions"] if a["kind"] == "tool_use")
    turn["response_preview"] = turn["response"][:FLOW_PREVIEW_CHARS]


def _merge_transcript(turns: list[dict], legacy: dict | None) -> list[dict]:
    """Turns with the live analyzer's turns merged in. A legacy turn whose prompt is within
    FLOW_MATCH_S of a turn's is the same turn: it adds the text and actions the turn lacks."""
    if not legacy or not legacy.get("turns"):
        return turns
    prompted = sorted((t for t in turns if t["prompt_event"]), key=lambda t: t["ts"])
    times = [t["ts"] for t in prompted]
    for other in legacy["turns"]:
        at = bisect.bisect_left(times, other.get("ts") or 0)
        near = [prompted[j] for j in (at - 1, at) if 0 <= j < len(prompted) and abs(prompted[j]["ts"] - (other.get("ts") or 0)) <= FLOW_MATCH_S]
        if not near:
            turn = _transcript_turn(other.get("ts") or 0, other.get("prompt") or "", bool(other.get("prompt")))
            turn.update({k: other[k] for k in ("end_ts", "model", "tokens", "api_calls", "duration_ms", "wall_ms") if other.get(k) not in _EMPTY})
            turn["response"] = other.get("response") or ""
            turn["actions"] = list(other.get("actions") or [])
            turn["tool_use_count"] = sum(1 for a in turn["actions"] if a.get("kind") == "tool_use")
            turn["response_preview"] = turn["response"][:FLOW_PREVIEW_CHARS]
            turns.append(turn)
            continue
        turn = min(near, key=lambda t: abs(t["ts"] - (other.get("ts") or 0)))
        for key in ("prompt", "prompt_preview", "response"):
            if other.get(key) and not turn.get(key):
                turn[key] = other[key]
        for action in other.get("actions") or []:
            same = any(
                a["kind"] == action.get("kind") and a.get("name") == action.get("name") and abs(a["ts"] - (action.get("ts") or 0)) <= FLOW_MATCH_S
                for a in turn["actions"]
            )
            if not same:
                turn["actions"].append(action)
        turn["actions"].sort(key=lambda a: a.get("ts") or 0)
        turn["end_ts"] = max(turn["end_ts"], other.get("end_ts") or 0)
        _tally_turn(turn)
    turns.sort(key=lambda t: t["ts"])
    return turns


@_in_session_scope("agent_id")
def agent_transcript(
    db: Any,
    agent_id: str,
    now: float | None = None,
    legacy_flow: Callable[[str, float, float], dict] | None = None,
    legacy_transcript: Callable[[str], dict | None] | None = None,
    turn: float | None = None,
    brief: bool = True,
) -> tuple[int, dict]:
    """The transcript of a board agent's session: one turn per prompt, with its reply and actions.

    ``replies_kept`` is False when no reply text is stored for the session; the turns then
    carry the prompts, actions and tokens, and ``reply_note`` says that the text is not kept.

    By default each turn is brief: the first FLOW_PREVIEW_CHARS of its prompt and reply, its
    counts and tokens, no actions, and ``detail`` True when the full turn holds more. ``turn``
    names one turn by its timestamp and returns that turn whole under ``turn``; ``brief=False``
    returns every turn whole.
    """
    now = time.time() if now is None else now
    found = _session_flow(db, agent_id, 0.0, now + 60.0, legacy_flow)
    if found is None:
        return 404, {"error": "No such agent"}
    sid, events, source = found
    cumulative, largest = _aggregate_flow(events)
    flow_summary = _flow_summary(events, source, cumulative, largest)
    live = legacy_transcript(sid) if legacy_transcript else None
    turns = _merge_transcript(_flow_transcript(events), live)
    replies_kept = any(t["response"] for t in turns)
    actions = [a for t in turns for a in t["actions"]]
    summary = {
        **{k: flow_summary[k] for k in ("total_input_tokens", "total_output_tokens", "total_cache_tokens", "total_tokens", "avg_tokens_per_call", "duration_s", "source")},
        "total_turns": sum(1 for t in turns if t["prompt_event"]),
        "total_api_calls": sum(t["api_calls"] for t in turns),
        "total_tool_uses": sum(t["tool_use_count"] for t in turns),
        "compactions": sum(1 for a in actions if a.get("kind") == "compaction"),
        "errors": sum(1 for a in actions if a.get("kind") == "error" or (a.get("kind") in ("api_call", "tool_use") and a.get("success") is False)),
        "subagents": sum(1 for a in actions if a.get("kind") == "subagent"),
        "event_count": len(actions) + sum(1 for t in turns if t["prompt_event"]),
    }
    body = {
        "session_id": sid,
        "summary": summary,
        "capture_mode": getattr(db, "capture", "full"),
        "replies_kept": replies_kept,
        "reply_note": None if replies_kept else REPLY_NOT_KEPT,
        "is_live": bool(live and live.get("is_live")),
    }
    if turn is not None:
        match = min(turns, key=lambda t: abs(t["ts"] - turn), default=None)
        if match is None or abs(match["ts"] - turn) > 0.001:
            return 404, {"error": "No such turn"}
        return 200, {**body, "turn": match}
    return 200, {**body, "turns": [_brief_turn(t) for t in turns] if brief else turns}


def _brief_turn(turn: dict) -> dict:
    """A turn without its actions and long texts, and ``detail`` when the whole turn holds more."""
    prompt, response = turn.get("prompt") or "", turn.get("response") or ""
    more = bool(turn.get("actions")) or len(prompt) > FLOW_PREVIEW_CHARS or len(response) > FLOW_PREVIEW_CHARS
    return {**turn, "prompt": prompt[:FLOW_PREVIEW_CHARS], "response": response[:FLOW_PREVIEW_CHARS], "actions": [], "detail": more}


RUN_HISTORY_DAYS = 30
MAX_RUN_ROWS = 200


def _session_row(db: Any, conn: sqlite3.Connection, sid: str) -> dict:
    """The sessions-table row of a board session, also when it is stored under a monitor id with the same UUID."""
    row = db.get_session(sid)
    if row:
        return row
    uuid = _session_uuid(sid)
    if uuid:
        found = conn.execute(
            "SELECT session_id FROM sessions WHERE session_id LIKE ? ORDER BY started_at DESC LIMIT 1", (f"%{uuid}%",)
        ).fetchone()
        if found:
            return db.get_session(found[0]) or {}
    return {}


def _agent_git(db: Any, session: dict, sid: str) -> dict:
    """Branch and commit the session started on, and the commits attributed to it so far."""
    sid_stored = session.get("session_id") or sid
    return {
        "branch": session.get("git_branch") or None,
        "commit": session.get("git_commit") or None,
        "commits_in_session": db.count_session_commits(sid_stored),
    }


def _median(values: list[float]) -> float | None:
    ordered = sorted(values)
    if not ordered:
        return None
    mid = len(ordered) // 2
    return ordered[mid] if len(ordered) % 2 else (ordered[mid - 1] + ordered[mid]) / 2


def _agent_runs(db: Any, session: dict, sid: str, row: dict, now: float) -> list[dict]:
    """Ended runs of the same tool in the same project over the last 30 days, newest first.

    Each run has its duration, tokens (input and output) and changed files as a ratio to the
    median of the other runs in the list. A ratio is null when that median is zero or unknown.
    """
    from .api_handlers import _one_row_per_session

    tool = session.get("tool") or row.get("tool") or ""
    project = session.get("project_path") or row.get("project") or ""
    if not tool or not project:
        return []
    since = now - RUN_HISTORY_DAYS * 86400.0
    # A run counts when it ended in the window. Starts are read further back so a long run is not lost.
    rows = _one_row_per_session(
        db.query_sessions(since=since - RUN_HISTORY_DAYS * 86400.0, tool=tool, active=False, limit=5000)
    )
    own = {sid, session.get("session_id") or sid}
    runs = []
    for r in rows:
        ended = float(r.get("ended_at") or 0)
        if ended < since or (r.get("project_path") or "") != project:
            continue
        started = float(r.get("started_at") or 0)
        runs.append(
            {
                "session_id": r.get("session_id", ""),
                "started_at": started or None,
                "ended_at": ended,
                "duration_s": round(ended - started, 1) if started else None,
                "tokens": int(r.get("input_tokens") or 0) + int(r.get("output_tokens") or 0),
                "file_churn": int(r.get("files_modified") or 0),
                "cost_usd": _usd(r.get("cost_usd")),
                "current": r.get("session_id") in own,
            }
        )
    runs.sort(key=lambda r: r["ended_at"], reverse=True)
    runs = runs[:MAX_RUN_ROWS]
    others = [r for r in runs if not r["current"]]
    medians = {
        key: _median([float(r[key]) for r in others if r[key] is not None])
        for key in ("duration_s", "tokens", "file_churn")
    }
    for r in runs:
        for key, out in (("duration_s", "duration_ratio"), ("tokens", "tokens_ratio"), ("file_churn", "churn_ratio")):
            med = medians[key]
            r[out] = round(r[key] / med, 3) if r[key] is not None and med else None
    return runs


def _live_matches(board: _Board, sid: str) -> list[dict]:
    """The monitor's live sessions that belong to a board session: the same processes or the same UUID."""
    pids = set((board.live_by_sid.get(sid) or {}).get("pids", ()))
    uuid = _session_uuid(sid)
    out = []
    for live in board.live_sessions:
        live_id = str(live.get("session_id") or "")
        same_pids = pids & {int(p) for p in live.get("pids") or []}
        if live_id == sid or (uuid and _session_uuid(live_id) == uuid) or same_pids:
            out.append(live)
    return out


def _flat_tree(nodes: list[dict], depth: int, out: list[dict]) -> None:
    for node in nodes:
        out.append(
            {
                "pid": node.get("pid"),
                "ppid": node.get("ppid"),
                "name": node.get("name") or "",
                "role": node.get("role") or None,
                "cpu_percent": _as_number(node.get("cpu_pct")),
                "mem_mb": _as_number(node.get("mem_mb")),
                "depth": depth,
            }
        )
        _flat_tree(node.get("children") or [], depth + 1, out)


def _rate_limit(conn: sqlite3.Connection, sid: str) -> dict | None:
    """The newest rate-limit report that the tool sent for this session, or None."""
    row = conn.execute(
        "SELECT ts, detail FROM events WHERE session_id = ? AND detail LIKE '%\"rate_limits\"%' ORDER BY ts DESC LIMIT 1",
        (sid,),
    ).fetchone()
    if not row:
        return None
    try:
        limits = (json.loads(row[1] or "{}") or {}).get("rate_limits")
    except (TypeError, ValueError):
        return None
    if not isinstance(limits, dict) or not limits:
        return None
    windows = []
    for name, value in limits.items():
        if not isinstance(value, dict):
            continue
        used = _as_number(value.get("used_pct", value.get("used_percentage")))
        windows.append({"window": str(name), "used_pct": used, "resets_at": value.get("resets_at") or None})
    return {"ts": row[0], "windows": windows} if windows else None


def _lm_by_extension(db: Any, conn: sqlite3.Connection, sid: str) -> list[dict] | None:
    """VS Code language-model tokens by extension, or None when the session has no such record."""
    hit = conn.execute(
        "SELECT 1 FROM events WHERE session_id = ? AND (kind LIKE '%lm.usage' OR kind LIKE '%language_model.usage') LIMIT 1",
        (sid,),
    ).fetchone()
    if not hit:
        return None
    from ..analysis.lm_usage import session_lm_usage

    usage = session_lm_usage(db, sid)
    rows = [
        {
            "extension": ext,
            "input_tokens": stats.get("input_tokens", 0),
            "output_tokens": stats.get("output_tokens", 0),
            "total_tokens": stats.get("total_tokens", 0),
            "calls": stats.get("calls", 0),
            "models": stats.get("models", []),
        }
        for ext, stats in (usage.get("by_extension") or {}).items()
    ]
    rows.sort(key=lambda r: (-r["total_tokens"], r["extension"]))
    return rows or None


def _agent_resources(
    db: Any, conn: sqlite3.Connection, board: _Board, sid: str, row: dict, root: bool, now: float
) -> dict:
    """Network, state writes, peak CPU and processes from the live monitor, plus rates from the store.

    The monitor values are null when the agent has no live process: aictl keeps them only while it runs.
    """
    started = row.get("started_at")
    calls = row.get("tool_calls")
    minutes = ((row.get("ended_at") or now) - started) / 60.0 if started else 0.0
    per_min = round(calls / max(minutes, 1.0), 2) if calls is not None and minutes > 0 else None
    out: dict = {
        "bytes_in": None,
        "bytes_out": None,
        "state_writes": None,
        "cpu_peak": None,
        "tool_calls_per_min": per_min,
        "rate_limit": None,
        "lm_by_extension": None,
        "process_tree": [],
        "subprocesses": [],
    }
    if not root:
        return out
    out["rate_limit"] = _rate_limit(conn, sid)
    out["lm_by_extension"] = _lm_by_extension(db, conn, sid)
    live = _live_matches(board, sid) if sid in board.live_by_sid else []
    if not live:
        return out
    out["bytes_in"] = sum(int(x.get("inbound_bytes") or 0) for x in live)
    out["bytes_out"] = sum(int(x.get("outbound_bytes") or 0) for x in live)
    out["state_writes"] = sum(int(x.get("state_bytes_written") or 0) for x in live)
    peaks = [float(x["peak_cpu_percent"]) for x in live if x.get("peak_cpu_percent") is not None]
    out["cpu_peak"] = round(max(peaks), 2) if peaks else None
    tree: list[dict] = []
    for x in live:
        _flat_tree(x.get("process_tree") or [], 0, tree)
    out["process_tree"] = tree[:MAX_DETAIL_ROWS]
    counts: dict[str, int] = defaultdict(int)
    for x in live:
        for name, n in (x.get("subprocess_count") or {}).items():
            counts[str(name)] += int(n or 0)
    out["subprocesses"] = [{"name": n, "count": c} for n, c in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]
    return out


def _maybe_int(value: Any) -> int | None:
    return None if value is None else int(value)


def _agent_skills(conn: sqlite3.Connection, sid: str, agent: str, root: bool) -> list[dict]:
    """The skills that one agent used. A main agent's list also holds its subagents' uses."""
    agent_sql, params = ("", [sid]) if root else (" AND agent_id = ?", [sid, agent])
    return [
        {"name": name, "uses": uses, "agents": agents, "started_by": by, "first_ts": first, "last_ts": last}
        for name, uses, agents, by, first, last in conn.execute(
            "SELECT name, COUNT(*), COUNT(DISTINCT agent_id), GROUP_CONCAT(DISTINCT trigger), MIN(ts), MAX(ts) FROM skill_uses"
            f" WHERE session_id = ?{agent_sql} GROUP BY name ORDER BY COUNT(*) DESC, name",
            params,
        )
    ]


_CONTEXT_POINTS = 200


def _agent_context(conn: sqlite3.Connection, sid: str, agent: str, root: bool) -> dict | None:
    """Context size per model call of one agent: input, cache read and cache write together.

    A subagent has its own context, so a main agent's figure leaves its subagents out. A drop
    of more than half means that the tool made the context smaller, as compaction does.
    A value that the tool did not report is None. A split belongs to the whole session, so
    only its main agent has one.
    """
    agent_sql, params = (" AND agent_id = ''", [sid]) if root else (" AND agent_id = ?", [sid, agent])
    sizes = [
        row
        for row in conn.execute(
            "SELECT input_tokens + cache_read_tokens + cache_creation_tokens, tool_tokens, max_prompt_tokens,"
            f" request_bytes, available_tools FROM requests WHERE session_id = ?{agent_sql} AND NOT is_error ORDER BY ts",
            params,
        )
        if row[0]
    ]
    if not sizes:
        return None
    values = [row[0] for row in sizes]
    step = max(1, len(values) // _CONTEXT_POINTS)

    def newest(index: int) -> int | None:
        return next((row[index] for row in reversed(sizes) if row[index] is not None), None)

    limit = newest(2)
    body_sizes = [row[3] for row in sizes if row[3] is not None]
    events = conn.execute(
        "SELECT ts, tool, trigger, before_tokens, after_tokens, duration_ms FROM context_events"
        f" WHERE session_id = ?{agent_sql} AND kind = 'compaction' ORDER BY ts",
        params,
    ).fetchall()
    split = None
    if root:
        split = conn.execute(
            "SELECT ts, current_tokens, system_tokens, conversation_tokens, tool_tokens FROM context_events"
            " WHERE session_id = ? AND kind = 'split' ORDER BY ts DESC LIMIT 1",
            (sid,),
        ).fetchone()
    return {
        "tool_tokens": newest(1),
        "prompt_limit": limit,
        "limit_share": values[-1] / limit if limit else None,
        "request_bytes_last": body_sizes[-1] if body_sizes else None,
        "request_bytes_peak": max(body_sizes) if body_sizes else None,
        "available_tools": newest(4),
        "compactions": [
            {
                "ts": ts,
                "tool": tool,
                "trigger": trigger or None,
                "before": before,
                "after": after,
                "freed": before - after if before is not None and after is not None else None,
                "duration_ms": took,
            }
            for ts, tool, trigger, before, after, took in events
        ],
        "split": dict(zip(("ts", "current", "system", "conversation", "tools"), split)) if split else None,
        "calls": len(values),
        "first": values[0],
        "last": values[-1],
        "peak": max(values),
        "drops": sum(1 for before, after in zip(values, values[1:]) if after < before / 2),
        "series": values[::step][:_CONTEXT_POINTS + 1],
    }


def mcp_server_of(tool_name: str) -> str | None:
    """The MCP server of a server tool; '' when the name does not say which; None for other tools.

    ``mcp__<server>__<tool>`` and ``<server>/<tool>`` name it. In ``mcp_a_b`` the server
    and the tool cannot be told apart, since both may hold underscores.
    """
    if not is_server_tool(tool_name):
        return None
    if tool_name.startswith("mcp__"):
        return tool_name[5:].split("__", 1)[0]
    if "/" in tool_name:
        return tool_name.split("/", 1)[0]
    return ""


def _tool_totals(rows: Iterable[tuple]) -> list[dict]:
    """Per tool: calls, failures, run time (total, median, p95, max) and input and output size.

    A call with no recorded time or size does not count toward that figure.
    """
    by: dict[str, dict] = {}
    for name, failed, ms, in_b, out_b in rows:
        t = by.setdefault(name, {"calls": 0, "failed": 0, "ms": [], "in": [], "out": []})
        t["calls"] += 1
        t["failed"] += 1 if failed else 0
        if ms and ms > 0:
            t["ms"].append(ms)
        if in_b is not None:
            t["in"].append(in_b)
        if out_b is not None:
            t["out"].append(out_b)

    out = []
    for name, t in by.items():
        ms, ins, outs = sorted(t["ms"]), t["in"], t["out"]
        out.append({
            "name": name,
            "mcp_server": mcp_server_of(name),
            "calls": t["calls"],
            "failed": t["failed"],
            "total_ms": _ms(sum(ms)) if ms else None,
            "p50_ms": _ms(_percentile(ms, 0.50)),
            "p95_ms": _ms(_percentile(ms, 0.95)),
            "max_ms": _ms(ms[-1]) if ms else None,
            "input_bytes": sum(ins) if ins else None,
            "output_bytes": sum(outs) if outs else None,
            "avg_input_bytes": round(sum(ins) / len(ins)) if ins else None,
            "avg_output_bytes": round(sum(outs) / len(outs)) if outs else None,
            "max_output_bytes": max(outs) if outs else None,
        })
    out.sort(key=lambda t: (-t["calls"], t["name"]))
    return out


def _agent_turns(conn: sqlite3.Connection, sid: str, agent_sql: str, agent_params: list) -> list[dict]:
    """One row per prompt, or per model call for a session with no stored prompt."""
    # The main agent's turns start at a person's prompts, a subagent's at its own task prompts.
    prompt_sql = agent_sql or " AND agent_id = ''"
    prompts = conn.execute(
        f"SELECT ts, text FROM session_prompts WHERE session_id = ?{prompt_sql} ORDER BY ts",
        [sid, *agent_params],
    ).fetchall()
    calls = conn.execute(
        "SELECT ts, model, input_tokens, output_tokens, cache_read_tokens, duration_ms, cache_creation_tokens, cost_usd, agent_id FROM requests"
        f" WHERE session_id = ?{agent_sql} ORDER BY ts",
        [sid, *agent_params],
    ).fetchall()
    tool_ts = [
        r[0] for r in conn.execute(f"SELECT ts FROM tool_invocations WHERE session_id = ?{agent_sql} AND {_IS_CALL_SQL} ORDER BY ts", [sid, *agent_params])
    ]
    if not prompts:
        turns = [
            {
                "ts": ts,
                "text": "",
                "tools": bisect.bisect_left(tool_ts, calls[i + 1][0] if i + 1 < len(calls) else math.inf)
                - bisect.bisect_left(tool_ts, ts),
                "model": model,
                "input": i_tok,
                "output": o_tok,
                "cache_read": cr_tok,
                "cache_write": cw_tok,
                "cost_usd": _usd(cost) if cost else None,
                "subagent_calls": 0,
                "reply_ms": duration or None,
            }
            for i, (ts, model, i_tok, o_tok, cr_tok, duration, cw_tok, cost, _aid) in enumerate(calls)
        ]
    else:
        turns = []
        for i, (ts, text) in enumerate(prompts):
            end = prompts[i + 1][0] if i + 1 < len(prompts) else math.inf
            inside = [c for c in calls if ts <= c[0] < end]
            models: dict[str, int] = defaultdict(int)
            for c in inside:
                models[c[1]] += 1
            durations = [c[5] for c in inside if c[5]]
            turns.append(
                {
                    "ts": ts,
                    "text": mask_secrets(text),
                    "tools": bisect.bisect_left(tool_ts, end) - bisect.bisect_left(tool_ts, ts),
                    "model": max(models, key=models.get) if models else None,
                    "input": sum(c[2] for c in inside) if inside else None,
                    "output": sum(c[3] for c in inside) if inside else None,
                    "cache_read": sum(c[4] for c in inside) if inside else None,
                    "cache_write": sum(c[6] for c in inside) if inside else None,
                    "cost_usd": _usd(sum(c[7] or 0 for c in inside)) if any(c[7] for c in inside) else None,
                    "subagent_calls": sum(1 for c in inside if c[8] and not agent_sql),
                    "reply_ms": sum(durations) if durations else None,
                }
            )
    return turns[-MAX_DETAIL_ROWS:][::-1]


def _titles_for(conn: sqlite3.Connection, pairs: set[tuple[str, str]], now: float) -> dict[tuple[str, str], str]:
    """Titles for detail lists that show calls from many sessions."""
    if not pairs:
        return {}
    board = _Board(conn, _detail_filters(now), now)
    sids = sorted({sid for sid, _ in pairs})
    payload = json.dumps(sids)
    for sid, tool, project in conn.execute(
        "SELECT session_id, tool, project_path FROM sessions WHERE session_id IN (SELECT value FROM json_each(?))",
        (payload,),
    ):
        board.session_tool[sid] = tool
        board.session_project[sid] = project
    for agent, sid, task in conn.execute(
        "SELECT agent_id, session_id, task FROM agents WHERE session_id IN (SELECT value FROM json_each(?))",
        (payload,),
    ):
        board.sub_rows[agent] = {"agent_id": agent, "session_id": sid, "task": task}
    return board._titles(pairs)


def tool_detail(db: Any, name: str, now: float | None = None, since: float | None = None, until: float | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    conn = db._conn()
    window, window_params = "", []
    if since is not None and until is not None:
        window, window_params = " AND ts >= ? AND ts < ?", [since, until]
    rows = conn.execute(
        "SELECT ts, target, session_id, agent_id, duration_ms, is_error, confirm FROM tool_invocations"
        f" WHERE tool_name = ?{window} ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
        [name, *window_params],
    ).fetchall()
    total = conn.execute(f"SELECT COUNT(*) FROM tool_invocations WHERE tool_name = ?{window}", [name, *window_params]).fetchone()[0]
    pairs = {(sid, _agent_key(sid, aid)) for _ts, _t, sid, aid, *_ in rows}
    titles = _titles_for(conn, pairs, now)
    return 200, {
        "name": name,
        "total": total,
        "calls": [
            {
                "ts": ts,
                "target": _one_line(target, 300),
                "agent_id": _agent_key(sid, aid),
                "title": titles.get((sid, _agent_key(sid, aid)), ""),
                "duration_ms": duration or None,
                "failed": bool(failed),
                "confirm": confirm or None,
            }
            for ts, target, sid, aid, duration, failed, confirm in rows
        ],
    }


def error_detail(db: Any, key: str, now: float | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    conn = db._conn()
    found: list[tuple[float, str, str, str]] = []
    parts = key.split(":", 2)
    if len(parts) < 3 or parts[0] not in ("tool", "api"):
        return 400, {"error": "Bad error key"}
    if parts[0] == "tool":
        for ts, summary, sid, aid in conn.execute(
            "SELECT ts, result_summary, session_id, agent_id FROM tool_invocations"
            " WHERE tool_name = ? AND is_error = 1 ORDER BY ts DESC LIMIT 5000",
            (parts[1],),
        ):
            if _tool_error_key(parts[1], summary) == key:
                found.append((ts, _one_line(summary, 500), sid, aid))
                if len(found) >= MAX_DETAIL_ROWS:
                    break
    else:
        for ts, error_type, status, sid, aid in conn.execute(
            "SELECT ts, error_type, http_status, session_id, agent_id FROM requests"
            " WHERE is_error = 1 AND error_type = ? ORDER BY ts DESC LIMIT 5000",
            ("" if parts[1] == "error" else parts[1],),
        ):
            if _api_error_key(error_type, status) == key:
                found.append((ts, " ".join(str(p) for p in (error_type, status) if p), sid, aid))
                if len(found) >= MAX_DETAIL_ROWS:
                    break
    titles = _titles_for(conn, {(sid, _agent_key(sid, aid)) for _t, _d, sid, aid in found}, now)
    return 200, {
        "key": key,
        "items": [
            {
                "ts": ts,
                "detail": detail,
                "agent_id": _agent_key(sid, aid),
                "title": titles.get((sid, _agent_key(sid, aid)), ""),
            }
            for ts, detail, sid, aid in found
        ],
    }


def _edit_pairs(raw: str | None) -> list[tuple[str, str]] | None:
    """(old, new) text pairs from a stored edit input, or None when it holds none."""
    try:
        data = json.loads(raw or "{}")
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("edits"), list):
        pairs = []
        for edit in data["edits"]:
            if isinstance(edit, dict):
                pairs.append((str(edit.get("old_string") or ""), str(edit.get("new_string") or "")))
        return pairs or None
    for old_key, new_key in (("old_string", "new_string"), ("oldString", "newString"), ("old_str", "new_str")):
        if old_key in data or new_key in data:
            return [(str(data.get(old_key) or ""), str(data.get(new_key) or ""))]
    for key in ("content", "file_text"):
        if isinstance(data.get(key), str):
            return [("", data[key])]
    return None


def _diff_lines(pairs: list[tuple[str, str]]) -> list[dict]:
    lines: list[dict] = []
    for old, new in pairs:
        old_lines = mask_secrets(old).splitlines()
        new_lines = mask_secrets(new).splitlines()
        old_n = new_n = 0
        for row in difflib.ndiff(old_lines, new_lines):
            tag, text = row[:2], row[2:]
            if tag == "? ":
                continue
            if tag == "- ":
                old_n += 1
                lines.append({"kind": "del", "n": old_n, "text": text})
            elif tag == "+ ":
                new_n += 1
                lines.append({"kind": "add", "n": new_n, "text": text})
            else:
                old_n += 1
                new_n += 1
                lines.append({"kind": "same", "n": new_n, "text": text})
            if len(lines) >= MAX_DIFF_LINES:
                return lines
    return lines


def _history_text(conn: sqlite3.Connection, content: str, blob_hash: str) -> str | None:
    if blob_hash:
        row = conn.execute("SELECT content FROM file_blobs WHERE hash = ?", (blob_hash,)).fetchone()
        if row:
            return row[0]
    return content or None


def _stored_diff(conn: sqlite3.Connection, path: str, event_ids: list[str]) -> list[dict] | None:
    """The newest change that has its text stored, from the edit input or the file history."""
    for event_id in event_ids:
        if not event_id:
            continue
        row = conn.execute(
            "SELECT input FROM tool_invocations WHERE source_event_id = ? ORDER BY ts DESC LIMIT 1", (event_id,)
        ).fetchone()
        pairs = _edit_pairs(row[0]) if row else None
        if pairs:
            return _diff_lines(pairs)
    versions = conn.execute(
        "SELECT content, blob_hash FROM file_history WHERE path = ? ORDER BY ts DESC LIMIT 2", (path,)
    ).fetchall()
    if versions:
        new = _history_text(conn, *versions[0])
        old = _history_text(conn, *versions[1]) if len(versions) > 1 else ""
        if new is not None and old is not None:
            return _diff_lines([(old, new)])
    return None


def file_detail(db: Any, path: str, now: float | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    conn = db._conn()
    rows = conn.execute(
        "SELECT ts, session_id, detail, source_event_id FROM file_write_events WHERE path = ?"
        f" ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
        (path,),
    ).fetchall()
    titles = _titles_for(conn, {(sid, sid) for _ts, sid, _d, _e in rows}, now)
    edits = []
    for ts, sid, detail, _event in rows:
        try:
            info = json.loads(detail or "{}")
        except ValueError:
            info = {}
        edits.append(
            {
                "ts": ts,
                "agent_id": sid,
                "title": titles.get((sid, sid), ""),
                "lines_added": info.get("lines_added"),
                "lines_removed": info.get("lines_removed"),
            }
        )
    return 200, {"path": path, "edits": edits, "diff": _stored_diff(conn, path, [r[3] for r in rows])}


@_in_session_scope("session_id")
def prompt_detail(db: Any, ts: float, session_id: str, now: float | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    conn = db._conn()
    row = conn.execute(
        "SELECT ts, text, prompt_file, project_path, agent_id FROM session_prompts"
        " WHERE session_id = ? AND ts >= ? AND ts <= ? ORDER BY ABS(ts - ?) LIMIT 1",
        (session_id, ts - 0.001, ts + 0.001, ts),
    ).fetchone()
    if row is None:
        return 404, {"error": "No such prompt"}
    start, text, prompt_file, project, _aid = row
    following = conn.execute(
        "SELECT MIN(ts) FROM session_prompts WHERE session_id = ? AND ts > ? AND agent_id = ''", (session_id, start)
    ).fetchone()[0]
    end = following if following is not None else math.inf
    i, o, cr, reply, cw, cost, calls, sub_calls = conn.execute(
        "SELECT SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens), SUM(NULLIF(duration_ms, 0)),"
        " SUM(cache_creation_tokens), SUM(cost_usd), COUNT(*), SUM(agent_id != '')"
        " FROM requests WHERE session_id = ? AND ts >= ? AND ts < ?",
        (session_id, start, end if end != math.inf else now + 60.0),
    ).fetchone()
    tool_calls = conn.execute(
        f"SELECT COUNT(*) FROM tool_invocations WHERE session_id = ? AND ts >= ? AND ts < ? AND {_IS_CALL_SQL}",
        (session_id, start, end if end != math.inf else now + 60.0),
    ).fetchone()[0]
    titles = _titles_for(conn, {(session_id, session_id)}, now)
    return 200, {
        "text": mask_secrets(text),
        "prompt_file": prompt_file,
        "project": project,
        "title": titles.get((session_id, session_id), ""),
        "input": i,
        "output": o,
        "cache_read": cr,
        "cache_write": cw,
        "cost_usd": _usd(cost) if cost else None,
        "calls": calls,
        "subagent_calls": sub_calls,
        "reply_ms": _ms(reply),
        "tool_calls": tool_calls,
    }


# ─── HTTP entry points ────────────────────────────────────────────


class _Memo:
    """Finished answers by filter key and store version. Bounded and short-lived."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._entries: dict[tuple, bytes] = {}

    def get(self, key: tuple) -> bytes | None:
        with self._lock:
            return self._entries.get(key)

    def put(self, key: tuple, body: bytes) -> None:
        with self._lock:
            self._entries.pop(key, None)
            self._entries[key] = body
            while len(self._entries) > MEMO_MAX_KEYS:
                self._entries.pop(next(iter(self._entries)))


_MEMO = _Memo()
_BASE_MEMO = _BaseMemo()
_BASE_TIMES: dict[tuple, tuple[float, float, float]] = {}
_SENT: dict[tuple, tuple[str, float, bytes]] = {}
_COMPUTED_AT: dict[tuple, float] = {}
_COMPUTED_MONO: dict[tuple, float] = {}
_COMPUTE_TOOK: dict[tuple, float] = {}
_refresh_lock = threading.Lock()
_refresh_thread: threading.Thread | None = None
_COMPUTE_LOCK = threading.Lock()


def _store_version(db: Any, now: float) -> tuple:
    """Changes when rows arrive, and every MEMO_TTL_S for rows merged in place and for live state.

    The live snapshot's own version is left out: it moves on every monitor cycle, so
    a dashboard that polls would recompute each time with nothing new to show.
    """
    marks = getattr(db, "version_marks", None)
    if marks is not None:
        # A history split by project: the stores read, and the newest rows of each.
        return (marks(), int(now / MEMO_TTL_S))
    conn = db._conn()
    ids = tuple(
        conn.execute(sql).fetchone()[0]
        for sql in (
            "SELECT MAX(id) FROM requests",
            "SELECT MAX(id) FROM tool_invocations",
            "SELECT MAX(id) FROM session_prompts",
            "SELECT MAX(id) FROM file_write_events",
            "SELECT MAX(last_activity_at) FROM session_usage",
        )
    )
    return (ids, int(now / MEMO_TTL_S))


def _change_digest(payload: dict) -> str:
    """A digest that ignores what moves with the clock or with live load alone."""
    stable = {k: v for k, v in payload.items() if k not in ("generated_at", "range", "self", "processes", "tool_labels", "series", "agents")}
    stable["series"] = {k: v for k, v in payload["series"].items() if k not in ("cpu", "mem")}
    stable["agents"] = [{k: v for k, v in row.items() if k not in ("cpu_percent", "mem_mb")} for row in payload["agents"]]
    return hashlib.blake2b(json.dumps(stable).encode("utf-8"), digest_size=16).hexdigest()


def board_bytes(db: Any, store: Any, query: str, now: float | None = None, background: bool = False) -> bytes:
    """The answer for ``/api/board``, reused while the store and the filters stay the same.

    A recomputed answer with no change in its data returns the earlier bytes, so a
    polling client gets a 304. It is sent anew after RESEND_AFTER_S for the clock and
    the live load numbers.

    With *background*, a filter key that was answered recently answers from memory
    at once and a newer answer is computed behind it, as the analytics cache does.
    """
    now = time.time() if now is None else now
    filters = parse_filters(query, now)
    # A range that ends about now follows the clock, whether the client says so or sends
    # its own clock: it keeps one key, by the range's length.
    key_filters = filters
    if abs(now - filters.until) <= CLOCK_RANGE_SLACK_S:
        key_filters = replace(filters, until=0.0, since=float(round((filters.until - filters.since) / 60.0)))
    path = str(getattr(db, "_path", ""))
    try:
        with read_scope(db, filters):
            version = _store_version(db, now)
    except sqlite3.OperationalError:
        # A locked or busy store: the last answer for these filters beats an error
        # that empties the board. With none yet, the error goes to the client.
        sent = _SENT.get((path, key_filters))
        if sent is None:
            raise
        logger.info("Board answered from memory: the history is busy")
        return sent[2]
    body = _MEMO.get((path, key_filters, version))
    if body is not None:
        return body
    if background:
        sent = _SENT.get((path, key_filters))
        computed = _COMPUTED_AT.get((path, key_filters))
        if sent is not None and computed is not None and now - computed < MAX_STALE_S:
            rest = max(REFRESH_MIN_S, _COMPUTE_TOOK.get((path, key_filters), 0.0) * REFRESH_REST_RATIO)
            if now - computed >= min(rest, MAX_STALE_S / 2):
                _refresh_behind(db, store, query, key_filters, version)
            return sent[2]
    return _compute_bytes(db, store, query, key_filters, version, now)


def _clock_range(filters: Filters) -> Filters:
    """A range that follows the clock, moved in steps of a quarter bucket.

    Moved every second, old rows would cross bucket lines on every read, and an
    answer with no new data would still differ from the last one.
    """
    span = 60.0 * round((filters.until - filters.since) / 60.0)
    step = max(MEMO_TTL_S, span / filters.buckets / 4)
    until = math.ceil(filters.until / step) * step
    return replace(filters, since=until - span, until=until)


def _compute_bytes(db: Any, store: Any, query: str, key_filters: Filters, version: tuple, now: float) -> bytes:
    path = str(getattr(db, "_path", ""))
    key = (path, key_filters, version)
    filters = parse_filters(query, now)
    if key_filters.until == 0.0:
        filters = _clock_range(filters)
    waited_from = time.monotonic()
    with _COMPUTE_LOCK:
        body = _MEMO.get(key)
        if body is not None:
            return body
        # An answer for these filters finished while this request waited for the
        # lock: it is as new as a compute begun now would be, and on a slow store a
        # client that asks again each tick would otherwise never get one.
        sent = _SENT.get((path, key_filters))
        if sent is not None and _COMPUTED_MONO.get((path, key_filters), 0.0) >= waited_from:
            return sent[2]
        started = time.monotonic()
        base_key = (path, key_filters.since, key_filters.until, filters.buckets, version)
        stamp = _BASE_TIMES.get(base_key)
        if stamp is not None:
            # One read of the window means one grid, so the filters take its exact range.
            filters = replace(filters, since=stamp[0], until=stamp[1])
            now = stamp[2]
        else:
            _BASE_TIMES.clear()
            _BASE_TIMES[base_key] = (filters.since, filters.until, now)
        payload = compute_board(db, filters, getattr(store, "snapshot", None), now, _BASE_MEMO, base_key)
        digest = _change_digest(payload)
        sent = _SENT.get((path, key_filters))
        if sent is not None and sent[0] == digest and now - sent[1] < RESEND_AFTER_S:
            body = sent[2]
        else:
            body = json.dumps(payload).encode("utf-8")
            _SENT[(path, key_filters)] = (digest, now, body)
            while len(_SENT) > MEMO_MAX_KEYS:
                _SENT.pop(next(iter(_SENT)))
        _COMPUTED_AT[(path, key_filters)] = now
        _COMPUTED_MONO[(path, key_filters)] = time.monotonic()
        _COMPUTE_TOOK[(path, key_filters)] = time.monotonic() - started
        while len(_COMPUTED_AT) > MEMO_MAX_KEYS:
            oldest = next(iter(_COMPUTED_AT))
            _COMPUTED_AT.pop(oldest)
            _COMPUTED_MONO.pop(oldest, None)
            _COMPUTE_TOOK.pop(oldest, None)
        _MEMO.put(key, body)
    return body


def _refresh_behind(db: Any, store: Any, query: str, key_filters: Filters, version: tuple) -> None:
    """Compute a newer answer on one background thread. A running refresh is not doubled."""
    global _refresh_thread

    def run() -> None:
        try:
            _compute_bytes(db, store, query, key_filters, version, time.time())
        except Exception:  # noqa: BLE001 - the next request reports a failure; this thread has no client
            logger.debug("Board refresh failed", exc_info=True)

    with _refresh_lock:
        if _refresh_thread is not None and _refresh_thread.is_alive():
            return
        _refresh_thread = threading.Thread(target=run, daemon=True, name="board-refresh")
        _refresh_thread.start()


def handle_get(
    path: str, query: str, db: Any, store: Any, now: float | None = None, is_allowed: Callable[[str], bool] | None = None
) -> tuple[int, bytes]:
    """Route a GET under /api/board. Returns the status and the JSON body."""
    if db is None:
        return 503, json.dumps({"error": "History is not available"}).encode("utf-8")
    qs = parse_qs(query, keep_blank_values=True)

    def one(key: str) -> str:
        return (qs.get(key) or [""])[0]

    try:
        if path == "/api/board":
            return 200, board_bytes(db, store, query, now, background=True)
        snapshot = getattr(store, "snapshot", None)
        if path == "/api/board/agent":
            status, payload = agent_detail(db, one("id"), snapshot, now) if one("id") else (400, {"error": "Missing id"})
        elif path == "/api/board/sessions":
            from .session_record import search_sessions

            tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
            status, payload = 200, search_sessions(
                db,
                one("q"),
                stored_ids_for(tools) if tools else None,
                _as_number(one("since")),
                _as_number(one("until")),
                _as_int(one("limit")) or 200,
                _as_int(one("offset")) or 0,
            )
        elif path == "/api/board/tool":
            if one("name"):
                status, payload = tool_detail(db, one("name"), now, _as_number(one("since")), _as_number(one("until")))
            else:
                status, payload = 400, {"error": "Missing name"}
        elif path == "/api/board/error":
            status, payload = error_detail(db, one("key"), now) if one("key") else (400, {"error": "Missing key"})
        elif path == "/api/board/skill":
            if one("name"):
                tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
                status, payload = skill_detail(db, one("name"), now, _as_number(one("since")), _as_number(one("until")), tools)
            else:
                status, payload = 400, {"error": "Missing name"}
        elif path == "/api/board/excerpt":
            at = _as_number(one("line"))
            status, payload = file_excerpt(one("path"), max(1, int(at or 1)), is_allowed) if one("path") else (400, {"error": "Missing path"})
        elif path == "/api/board/file":
            status, payload = file_detail(db, one("path"), now) if one("path") else (400, {"error": "Missing path"})
        elif path == "/api/board/prompt":
            ts = _as_number(one("ts"))
            if ts is None or not one("session_id"):
                status, payload = 400, {"error": "Missing ts or session_id"}
            else:
                status, payload = prompt_detail(db, ts, one("session_id"), now)
        else:
            status, payload = 404, {"error": "No such route"}
    except BoardRequestError as exc:
        status, payload = 400, {"error": str(exc)}
    return status, json.dumps(payload).encode("utf-8")


# ─── /api/board/machine ───────────────────────────────────────────
# The live state of this machine and of aictl's own data pipeline. It changes on
# every monitor cycle and reads the server's receivers, so it has its own route:
# /api/board stays keyed by the store version and keeps answering 304.

MACHINE_CMDLINE_CHARS = 200
SUBAGENT_RAM_ALERT_MB = 2048.0
MANY_ANOMALIES = 5
MACHINE_QUALITY_ROWS = 50
DB_STATS_TTL_S = 60.0
_SUBAGENT_TYPES = frozenset({"subagent", "agent"})
_ORPHAN_PARENTS = (0, 1)
_NO_FRESHNESS_TOOLS = frozenset({"aictl", "any"})
_ANOMALY_KINDS = {
    "high_memory": ("High memory", "warn"),
    "cpu_spike": ("CPU spike", "warn"),
    "zombie": ("Zombie process", "crit"),
    "known_leak": ("Known leak", "crit"),
    "high_file_count": ("High file count", "info"),
    "long_running": ("Long running", "info"),
}
_db_stats_memo: dict[str, tuple[float, dict]] = {}


def _mb_text(mb: float | None) -> str:
    if mb is None:
        return "n/a"
    return f"{mb / 1000:.1f} GB" if mb >= 1000 else f"{mb:.0f} MB"


def _as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _anomaly_detail(kind: str, a: dict, proc: Any) -> str:
    if kind == "high_memory":
        detail = _mb_text(_as_number(a.get("actual_mb")))
        expected = _as_number(a.get("expected_mb"))
        return detail + (f", expected {_mb_text(expected)}" if expected is not None else "")
    if kind == "cpu_spike":
        cpu = _as_number(_proc_field(proc, "cpu_pct"))
        return f"{cpu:.0f}% CPU" if cpu is not None else ""
    if kind == "zombie":
        return f"its parent is gone (parent PID {a.get('ppid')}), risk {a.get('risk') or 'n/a'}"
    if kind == "known_leak":
        return str(a.get("pattern") or "")
    if kind == "high_file_count":
        files = _proc_field(proc, "file_count")
        return f"{files} open files" if files else ""
    if kind == "long_running":
        up = _as_number(_proc_field(proc, "uptime_s"))
        return f"running for {up / 60:.0f} min" if up else ""
    return ""


def _anomaly(raw: Any, proc: Any) -> dict:
    """One anomaly the process scan found, as a label, a severity and a sentence."""
    a = raw if isinstance(raw, dict) else {"type": str(raw)}
    kind = str(a.get("type") or "unknown")
    label, severity = _ANOMALY_KINDS.get(kind, (kind.replace("_", " ").capitalize(), "warn"))
    detail = _anomaly_detail(kind, a, proc)
    return {"kind": kind, "severity": severity, "label": label, "text": f"{label}: {detail}" if detail else label}


def _parent_pid(pid: int) -> int | None:
    """The parent of a process the scan reported without one. None when it is gone."""
    try:
        import psutil

        return psutil.Process(pid).ppid()
    except Exception:  # noqa: BLE001 - a process can end between the scan and this read
        return None


def _process_row(proc: Any, tool_id: str, live: dict | None) -> dict:
    zombie = _proc_field(proc, "zombie_risk") or ""
    ppid = _as_int((live or {}).get("ppid"))
    if ppid is None:
        ppid = _as_int(_proc_field(proc, "ppid"))
    return {
        "pid": _as_int(_proc_field(proc, "pid")),
        "ppid": ppid,
        "parent_name": None,
        "name": _proc_field(proc, "name") or "",
        "tool": tool_id,
        "process_type": _proc_field(proc, "process_type") or None,
        "cpu_pct": _as_number(_proc_field(proc, "cpu_pct")),
        "mem_mb": _as_number(_proc_field(proc, "mem_mb")),
        "cmdline": _one_line(_proc_field(proc, "cmdline") or (live or {}).get("exe"), MACHINE_CMDLINE_CHARS) or None,
        "anomalies": [_anomaly(a, proc) for a in (_proc_field(proc, "anomalies") or [])],
        "zombie_risk": zombie if zombie and zombie != "none" else None,
        "cleanup_cmd": mask_secrets(_proc_field(proc, "cleanup_cmd") or "") or None,
    }


def _machine_tools(snapshot: Any, selected: set[str] | None) -> list[Any]:
    out = []
    for tool in getattr(snapshot, "tools", None) or []:
        if getattr(tool, "meta", False):
            continue
        if selected is not None and getattr(tool, "tool", "") not in selected:
            continue
        out.append(tool)
    return out


def machine_processes(snapshot: Any, selected: set[str] | None = None) -> list[dict]:
    """Every AI-tool process the scan and the live monitor report, with its parent and its anomalies."""
    tools = _machine_tools(snapshot, selected)
    live_by_pid: dict[int, dict] = {}
    for tool in tools:
        for p in (getattr(tool, "live", None) or {}).get("processes") or []:
            pid = _as_int(p.get("pid")) if isinstance(p, dict) else None
            if pid is not None:
                live_by_pid.setdefault(pid, {**p, "tool": getattr(tool, "tool", "")})
    rows: dict[int, dict] = {}
    for tool in tools:
        for proc in getattr(tool, "processes", None) or []:
            pid = _as_int(_proc_field(proc, "pid"))
            if pid is not None and pid not in rows:
                rows[pid] = _process_row(proc, getattr(tool, "tool", ""), live_by_pid.get(pid))
    # The live monitor also follows child processes that the scan does not match.
    for pid, p in live_by_pid.items():
        if pid not in rows:
            rows[pid] = _process_row(p, p["tool"], p)
    names = {pid: r["name"] for pid, r in rows.items()}
    for pid, row in rows.items():
        if row["ppid"] is None:
            row["ppid"] = _parent_pid(pid)
        row["parent_name"] = names.get(row["ppid"]) if row["ppid"] is not None else None
    out = sorted(rows.values(), key=lambda r: (-(r["cpu_pct"] or 0.0), -(r["mem_mb"] or 0.0), r["pid"]))
    return out[:MAX_LIST_ROWS]


def machine_alerts(processes: list[dict]) -> list[dict]:
    """Machine-wide findings over the processes: subagent RAM, orphaned MCP servers, headless browsers, anomalies."""
    alerts = []
    subagents = [p for p in processes if (p["process_type"] or "").lower() in _SUBAGENT_TYPES]
    sub_mb = sum(p["mem_mb"] or 0.0 for p in subagents)
    if sub_mb > SUBAGENT_RAM_ALERT_MB:
        alerts.append(
            {
                "kind": "subagent_ram",
                "severity": "crit",
                "text": f"Subagents use {_mb_text(sub_mb)} of RAM, more than 2 GB",
                "detail": f"{len(subagents)} subagent {'process' if len(subagents) == 1 else 'processes'}. Stop the subagents that are no longer needed.",
                "pids": [p["pid"] for p in subagents],
                "tool": _one_tool(subagents),
                "action": None,
            }
        )
    orphans = [
        p
        for p in processes
        if (p["process_type"] or "").lower() == "mcp-server"
        and (p["ppid"] in _ORPHAN_PARENTS or any(a["kind"] == "zombie" for a in p["anomalies"]))
    ]
    if orphans:
        alerts.append(
            {
                "kind": "orphan_mcp",
                "severity": "warn",
                "text": f"{len(orphans)} MCP {'server has' if len(orphans) == 1 else 'servers have'} no parent process and may be orphaned",
                "detail": ", ".join(f"{p['name']} (PID {p['pid']})" for p in orphans[:10]),
                "pids": [p["pid"] for p in orphans],
                "tool": _one_tool(orphans),
                "action": _cleanup_of(orphans),
            }
        )
    headless = [
        p
        for p in processes
        if (p["process_type"] or "").lower() == "browser" or "headless" in (p["name"] or "").lower()
    ]
    if headless:
        alerts.append(
            {
                "kind": "headless_browser",
                "severity": "info",
                "text": f"{len(headless)} headless browser {'process' if len(headless) == 1 else 'processes'}. Check that they are still in use.",
                "detail": ", ".join(f"{p['name']} (PID {p['pid']}, {_mb_text(p['mem_mb'])})" for p in headless[:10]),
                "pids": [p["pid"] for p in headless],
                "tool": _one_tool(headless),
                "action": _cleanup_of(headless),
            }
        )
    flagged = [p for p in processes if p["anomalies"]]
    count = sum(len(p["anomalies"]) for p in flagged)
    if count > MANY_ANOMALIES:
        alerts.append(
            {
                "kind": "anomalies",
                "severity": "warn",
                "text": f"{count} process anomalies in {len(flagged)} processes",
                "detail": ", ".join(sorted({a["label"] for p in flagged for a in p["anomalies"]})),
                "pids": [p["pid"] for p in flagged],
                "tool": _one_tool(flagged),
                "action": None,
            }
        )
    for alert in alerts:
        alert["pid"] = alert["pids"][0] if len(alert["pids"]) == 1 else None
    return alerts


def _one_tool(processes: list[dict]) -> str | None:
    tools = {p["tool"] for p in processes}
    return next(iter(tools)) if len(tools) == 1 else None


def _cleanup_of(processes: list[dict]) -> str:
    """The catalog's cleanup command when the processes share one, else a kill of their PIDs."""
    commands = {p["cleanup_cmd"] for p in processes if p["cleanup_cmd"]}
    if len(commands) == 1 and all(p["cleanup_cmd"] for p in processes):
        return next(iter(commands))
    return "kill " + " ".join(str(p["pid"]) for p in processes)


def _monitor_section(snapshot: Any, selected: set[str] | None) -> dict:
    lm = getattr(snapshot, "live_monitor", None) or {}
    collectors = [
        {
            "name": name,
            "mode": d.get("mode") or None,
            "status": d.get("status") or "unknown",
            "detail": d.get("detail") or None,
        }
        for name, d in sorted((lm.get("diagnostics") or {}).items())
        if isinstance(d, dict)
    ]
    roots = [{"kind": "workspace", "path": p} for p in lm.get("workspace_paths") or []]
    roots += [{"kind": "state", "path": p} for p in lm.get("state_paths") or []]
    per_tool = []
    for tool in _machine_tools(snapshot, selected):
        live = getattr(tool, "live", None)
        if not live:
            continue
        tokens = live.get("token_estimate") or {}
        mcp = live.get("mcp")
        size_mb = _as_number(live.get("workspace_size_mb"))
        est = None
        if tokens:
            est = int((_as_number(tokens.get("input_tokens")) or 0) + (_as_number(tokens.get("output_tokens")) or 0))
        per_tool.append(
            {
                "tool": tool.tool,
                "label": getattr(tool, "label", "") or _label(tool.tool),
                "sessions": _as_int(live.get("session_count")),
                "pids": _as_int(live.get("pid_count")),
                "inbound_bps": _as_number(live.get("inbound_rate_bps")),
                "outbound_bps": _as_number(live.get("outbound_rate_bps")),
                "est_tokens": est,
                "est_confidence": _as_number(tokens.get("confidence")) if tokens else None,
                "est_source": tokens.get("source") or None,
                "mcp_loop": {
                    "detected": bool(mcp.get("detected")),
                    "loops": _as_int(mcp.get("loops")) or 0,
                    "confidence": _as_number(mcp.get("confidence")),
                }
                if isinstance(mcp, dict)
                else None,
                "file_events": _as_int(live.get("file_events")),
                "files_touched": _as_int(live.get("files_touched")),
                "cpu_pct": _as_number(live.get("cpu_percent")),
                "cpu_peak": _as_number(live.get("peak_cpu_percent")),
                "workspace_bytes": int(size_mb * 1048576) if size_mb is not None else None,
                "workspaces": list(live.get("workspaces") or [])[:5],
                "last_seen": _as_number(live.get("last_seen_at")) or None,
            }
        )
    return {"collectors": collectors, "roots": roots, "per_tool": per_tool}


def _db_stats(db: Any) -> dict:
    """Size and row counts of the history, read at most every DB_STATS_TTL_S: each count scans a table."""
    if db is None:
        return {}
    key = str(getattr(db, "_path", "memory"))
    cached = _db_stats_memo.get(key)
    if cached and time.monotonic() - cached[0] < DB_STATS_TTL_S:
        return cached[1]
    try:
        stats = db.stats()
    except Exception:  # noqa: BLE001 - a busy or damaged store still answers the rest
        logger.debug("History stats failed", exc_info=True)
        stats = {}
    _db_stats_memo[key] = (time.monotonic(), stats)
    return stats


def _own_process() -> dict:
    try:
        import psutil

        proc = psutil.Process(os.getpid())
        return {"threads": proc.num_threads(), "uptime_s": round(time.time() - proc.create_time(), 1)}
    except Exception:  # noqa: BLE001 - psutil is optional on some platforms
        return {"threads": None, "uptime_s": None}


def _sink_section(store: Any) -> dict | None:
    sink = getattr(store, "_sink", None)
    if sink is None:
        return None
    try:
        s = sink.stats()
    except Exception:  # noqa: BLE001 - a sink failure must not take the board down
        return None
    return {
        "emitted": s.get("total_emitted"),
        "flushed": s.get("total_flushed"),
        "dropped": s.get("total_dropped"),
        "flood": bool(s.get("is_flooding")),
        "flood_drops": s.get("flood_drop_count"),
        "buffered": s.get("buffer_size"),
        "tracked": s.get("metrics_tracked"),
    }


def _quality_rows(db: Any) -> list[dict]:
    if db is None:
        return []
    try:
        rows = db.query_data_quality(limit=MACHINE_QUALITY_ROWS)
    except Exception:  # noqa: BLE001 - an old store without the table still answers the rest
        return []
    out = []
    for r in rows:
        detail = r.get("detail") if isinstance(r.get("detail"), dict) else {}
        out.append(
            {
                "ts": r.get("updated_at"),
                "component": r.get("component") or "",
                "source": r.get("source") or "",
                "kind": r.get("kind") or "",
                "status": r.get("status") or "",
                "severity": r.get("severity") or "",
                "text": mask_secrets(r.get("message") or ""),
                "error": mask_secrets(str(detail.get("error"))) if detail.get("error") else None,
                "tool": detail.get("tool") or None,
                "count": r.get("count"),
                "last_ok": r.get("last_ok_at") or None,
            }
        )
    return out


def _ingester_rows(handles: Any, quality: list[dict]) -> list[dict]:
    from .ingester_runner import collect_status

    by_component = {q["component"]: q for q in quality}
    out = []
    for h in collect_status(handles):
        name = h.get("name") or ""
        q = by_component.get(f"ingester:{name}") or by_component.get(name)
        polled = h.get("last_poll_ts") or None
        if not h.get("enabled"):
            status = "off"
        elif not h.get("source_exists"):
            status = "no source"
        elif q and q["status"] not in ("ok", "") and q["severity"] in ("error", "warning"):
            status = q["status"]
        elif not polled:
            status = "waiting"
        else:
            status = "ok"
        failing = status not in ("ok", "off", "waiting")
        out.append(
            {
                "name": name,
                "status": status,
                "last_ok": (q or {}).get("last_ok") or (polled if status == "ok" else None),
                "last_poll": polled,
                "error": ((q or {}).get("error") or (q or {}).get("text")) if failing else None,
                "rows": h.get("last_poll_inserted"),
                "rows_total": h.get("rows_ingested_total"),
                "source": _display_folder(Path(h["source_path"])) if h.get("source_path") else None,
            }
        )
    return out


def _freshness(snapshot: Any, selected: set[str] | None) -> list[dict]:
    telemetry = {t.get("tool"): t for t in getattr(snapshot, "tool_telemetry", None) or [] if isinstance(t, dict)}
    out = []
    for tool in _machine_tools(snapshot, selected):
        if tool.tool in _NO_FRESHNESS_TOOLS:
            continue
        live = getattr(tool, "live", None) or {}
        telem = telemetry.get(tool.tool) or {}
        errors = [e for e in telem.get("errors") or [] if isinstance(e, dict)]
        estimate = live.get("token_estimate") or {}
        confidence = _as_number(telem.get("confidence")) or _as_number(estimate.get("confidence"))
        out.append(
            {
                "tool": tool.tool,
                "label": getattr(tool, "label", "") or _label(tool.tool),
                "last_seen": _as_number(live.get("last_seen_at")) or None,
                "source": telem.get("source") or ("live-monitor" if live.get("session_count") else "discovery"),
                "confidence": confidence or None,
                "errors": len(errors),
                "last_error": _one_line(errors[0].get("message"), 200) if errors else None,
            }
        )
    return out


def _code_changed_at() -> float | None:
    from ..code_age import code_changed_at

    return code_changed_at()


def _process_started_at() -> float:
    from ..code_age import STARTED_AT

    return STARTED_AT


def _hooks_by_tool(db: Any, now: float) -> dict[str, dict]:
    """Hook events each tool sent in the last 24 hours: ``{tool: {count, last_fire_ts}}``."""
    from .hooks_status import _hook_event_counts

    try:
        return _hook_event_counts(db, now - 86400)["by_tool"]
    except (sqlite3.Error, AttributeError):
        return {}


def compute_machine(
    db: Any,
    store: Any,
    tools: tuple[str, ...] | None = None,
    otel: Any = None,
    ingesters: Any = None,
    stream_clients: int | None = None,
    now: float | None = None,
) -> dict:
    """Everything ``GET /api/board/machine`` returns. The Tool filter applies to the per-tool lists only."""
    now = time.time() if now is None else now
    snapshot = getattr(store, "snapshot", None)
    selected = set(stored_ids_for(tools)) if tools is not None else None
    processes = machine_processes(snapshot, selected)
    usage = _self_usage()
    stats = _db_stats(db)
    counts = {k[: -len("_count")]: v for k, v in stats.items() if k.endswith("_count") and isinstance(v, int)}
    quality = _quality_rows(db)
    try:
        otel_status = otel.status() if otel is not None else None
    except Exception:  # noqa: BLE001 - the receiver is optional
        otel_status = None
    snap_ts = _as_number(getattr(snapshot, "timestamp", None)) if snapshot is not None else None
    return {
        "generated_at": now,
        "monitor": _monitor_section(snapshot, selected),
        "processes": processes,
        "cpu_per_core": [round(float(v), 1) for v in getattr(snapshot, "cpu_per_core", None) or []],
        "cpu_cores": getattr(snapshot, "cpu_cores", None) or None,
        "alerts": machine_alerts(processes),
        "pipeline": {
            "self": {
                "pid": os.getpid(),
                "cpu": usage.get("cpu_percent"),
                "rss": usage.get("memory_rss_bytes"),
                **_own_process(),
                "db_bytes": stats.get("file_size_bytes"),
                "db_rows": sum(counts.values()) if counts else None,
                "db_tables": counts,
                "writes": db.running_writes() if hasattr(db, "running_writes") else [],
                # The code on disk changed after this daemon started: it needs a restart.
                "code_changed_at": _code_changed_at(),
                "started_at": _process_started_at(),
            },
            "sink": _sink_section(store),
            "otel_receiver": otel_status,
            "hooks": _hooks_by_tool(db, now),
            "ingesters": _ingester_rows(ingesters, quality),
            "data_quality": quality,
            "freshness": _freshness(snapshot, selected),
            "stream": {
                "connected_clients": stream_clients,
                "snapshot_ts": snap_ts,
                "snapshot_age_s": round(max(0.0, now - snap_ts), 1) if snap_ts else None,
            },
        },
    }


def machine_bytes(
    db: Any,
    store: Any,
    query: str,
    otel: Any = None,
    ingesters: Any = None,
    stream_clients: int | None = None,
    now: float | None = None,
) -> bytes:
    """The answer for ``/api/board/machine``. ``tool`` takes the same values as on ``/api/board``."""
    qs = parse_qs(query, keep_blank_values=True)
    tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
    payload = compute_machine(db, store, tools, otel, ingesters, stream_clients, now)
    return json.dumps(payload).encode("utf-8")


# ─── Actions ──────────────────────────────────────────────────────

ACTION_TIMEOUT_S = 120
_CLI_ENTRY = "from aictl.cli import main; main()"


def _run_cli(*args: str) -> dict:
    """Run one aictl command in a child process, the same code the terminal runs."""
    done = subprocess.run(
        [sys.executable, "-c", _CLI_ENTRY, *args],
        capture_output=True,
        text=True,
        timeout=ACTION_TIMEOUT_S,
        check=False,
    )
    return {"ok": done.returncode == 0, "exit_code": done.returncode, "output": mask_secrets((done.stdout + done.stderr)[-4000:])}


def _action_hooks_repair(_db: Any, _root: Any, _args: dict, _port: int | None) -> dict:
    return _run_cli("hooks", "repair")


def _action_otel_enable(_db: Any, _root: Any, _args: dict, port: int | None) -> dict:
    return _run_cli("otel", "enable", *(("--port", str(port)) if port else ()))


def _action_baseline_update(_db: Any, root: Any, args: dict, _port: int | None) -> dict:
    from ..context_audit import run_audit

    wanted = str(args.get("project") or "")
    project = wanted if wanted and not _names_another_machine(wanted) and Path(wanted).is_dir() else root
    report = run_audit(project, args.get("tool") or None, update_baseline=True)
    return {"ok": True, "baseline_updated": bool(report.get("baseline_updated", True))}


def _action_db_compact(db: Any, _root: Any, _args: dict, _port: int | None) -> dict:
    if db is None:
        return {"ok": False, "error": "History is not available"}
    removed = db.compact()
    if db.in_memory:
        return {"ok": True, "removed": removed}
    room = db.vacuum_room_needed()
    if shutil.disk_usage(Path(db._path).parent).free < room:
        return {"ok": False, "error": f"Old records are removed, but the file was not made smaller: this needs {room // 1_000_000} MB of free disk."}
    db.vacuum()
    return {"ok": True, "removed": removed}


def _action_ctx_deploy(_db: Any, root: Any, _args: dict, _port: int | None) -> dict:
    return _run_cli("ctx", "deploy", "-r", str(root))


_ACTIONS = {
    "ctx-deploy": _action_ctx_deploy,
    "hooks-repair": _action_hooks_repair,
    "otel-enable": _action_otel_enable,
    "baseline-update": _action_baseline_update,
    "db-compact": _action_db_compact,
}


def run_action(db: Any, root: Any, data: Any, port: int | None = None) -> tuple[int, dict]:
    """``POST /api/board/action``. A request must carry ``confirm: true``."""
    if not isinstance(data, dict):
        return 400, {"error": "Request body must be a JSON object"}
    action = str(data.get("action") or "")
    if action not in _ACTIONS:
        return 400, {"error": "action must be one of " + ", ".join(sorted(_ACTIONS))}
    if data.get("confirm") is not True:
        return 400, {"error": f"{action} requires confirm:true"}
    args = data.get("args") if isinstance(data.get("args"), dict) else {}
    try:
        result = _ACTIONS[action](db, root, args, port)
    except subprocess.TimeoutExpired:
        return 504, {"action": action, "ok": False, "error": "The command did not finish in time"}
    if db is not None:
        try:
            db.append_event(
                EventRow(ts=time.time(), tool="aictl", kind=f"action:{action.replace('-', '_')}", detail={"ok": result.get("ok")})
            )
        except Exception:  # noqa: BLE001 - audit logging must never block the action itself
            logger.debug("Could not record board action %s", action, exc_info=True)
    return 200 if result.get("ok") else 500, {"action": action, **result}


# ─── /api/board/context ───────────────────────────────────────────
# What each tool loads into a model's context window: the files the scan found,
# the agent memory, the lifetime totals each tool reports, and the last days of
# model calls in the history. The Tool filter applies to every per-tool list.

CONTEXT_RECENT_S = 300.0
CONTEXT_DAYS = 7
CONTEXT_GROWTH_S = 7 * 86400.0
CONTEXT_GROWTH_POINTS = 120
# Files listed for each tool, largest first. The category totals count every file.
CONTEXT_MAX_FILES = 400
CONTEXT_MAP_ITEMS = 15
CONTEXT_ERRORS = 20
CONTEXT_DB_TTL_S = 60.0
CONTEXT_MEMO_KEYS = 8
DEFAULT_CONTEXT_WINDOW = 200_000
_CONTEXT_SKIP = frozenset({"aictl", "any"})
_CONTEXT_GLOBAL_SCOPES = frozenset({"global", "session"})
_CONTEXT_GLOBAL_PARTS = ("/.claude/", "/.config/", "/Library/", "/AppData/")
_CONTEXT_FIXTURE_RE = re.compile(r"/(fixtures?|__fixtures__|__tests__)/")
_CONTEXT_SENTINEL_RE = re.compile(r"^(SKILL|skill|index|INDEX|README|readme)$")
_MEMORY_LABELS = {
    "claude-user-memory": "Claude user memory",
    "claude-project-memory": "Claude project memory",
    "claude-auto-memory": "Claude auto memory",
    "copilot-agent-memory": "Copilot agent memory",
    "copilot-session-state": "Copilot session state",
    "copilot-user-memory": "Copilot instructions",
    "codex-user-memory": "Codex instructions",
    "windsurf-user-memory": "Windsurf global rules",
}
_context_memo: dict[tuple, bytes] = {}
_context_db_memo: dict[tuple, tuple[float, dict]] = {}
_context_lock = threading.Lock()


def _ctx_field(obj: Any, name: str, default: Any = None) -> Any:
    value = obj.get(name, default) if isinstance(obj, dict) else getattr(obj, name, default)
    return default if value is None else value


def _ctx_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def context_policy(sent_to_llm: str | None) -> str:
    """The Context Window Map's policy of a file: yes, on-demand, conditional or no."""
    v = (sent_to_llm or "").lower()
    if v in ("yes", "on-demand"):
        return v
    if v in ("conditional", "partial"):
        return "conditional"
    return "no"


def context_project(path: str, root: str, scope: str = "") -> str:
    """The project a file belongs to: the first folder under the root, or a bracketed place."""
    if scope in _CONTEXT_GLOBAL_SCOPES:
        return "(global)"
    p = (path or "").replace("\\", "/")
    r = (root or "").replace("\\", "/").rstrip("/")
    if not p:
        return "(unknown)"
    if r and p.startswith(r + "/"):
        first = p[len(r) + 1 :].split("/")[0]
        return "(root)" if first.startswith(".") else first
    if "/.claude/projects/" in p:
        return "(shadow)"
    if any(part in p for part in _CONTEXT_GLOBAL_PARTS):
        return "(global)"
    return "(other)"


def context_item_name(path: str) -> str:
    """A file's short name without extension. SKILL.md, index.md and README.md take their folder's name."""
    parts = (path or "").replace("\\", "/").split("/")
    fname = parts.pop() if parts else ""
    if not fname:
        return "unknown"
    dot = fname.rfind(".")
    base = fname[:dot] if dot > 0 else fname
    if _CONTEXT_SENTINEL_RE.match(base) and parts and parts[-1]:
        return parts[-1]
    return base


def _context_tools(snapshot: Any, tools: tuple[str, ...] | None) -> list[Any]:
    from ..tools import budget_tools

    listed = [t for t in (_ctx_field(snapshot, "tools", []) or []) if _ctx_field(t, "tool", "") not in _CONTEXT_SKIP]
    return budget_tools(listed, tools)


def _context_model(tool: str, configs: list, telemetry: dict[str, dict]) -> tuple[str | None, str | None]:
    """The model a tool is set to use, and where that came from."""
    for c in configs:
        if isinstance(c, dict) and c.get("tool") == tool and c.get("model"):
            return str(c["model"]), "settings"
    tel = telemetry.get(tool) or {}
    current = (tel.get("quota_state") or {}).get("current_model")
    if current:
        return str(current), "telemetry"
    by_model = tel.get("by_model") or {}
    if isinstance(by_model, dict) and by_model:
        used = max(by_model, key=lambda m: _ctx_int((by_model[m] or {}).get("input_tokens")) + _ctx_int((by_model[m] or {}).get("output_tokens")))
        return str(used), "most used"
    return None, None


def _context_budget(tool: Any, root: str, model: str | None, model_from: str | None) -> dict:
    from ..data.model_pricing import context_window_for
    from ..tools import compute_token_budget

    b = compute_token_budget([tool], root)
    known = context_window_for(model) if model else None
    window = known or DEFAULT_CONTEXT_WINDOW
    global_tokens = b["global_tokens"]
    projects = []
    for name, buckets in (b.get("projects") or {}).items():
        own = buckets["always"] + buckets["on_demand"] + buckets["conditional"]
        projects.append(
            {
                "project": name,
                "always": buckets["always"],
                "on_demand": buckets["on_demand"],
                "conditional": buckets["conditional"],
                "tokens": own,
                "estimate": global_tokens + own,
                "share": round((global_tokens + own) / window, 4),
            }
        )
    projects.sort(key=lambda p: -p["tokens"])
    always = b["always_loaded_tokens"]
    potential = b["total_potential_tokens"]
    return {
        "tool": tool.tool,
        "label": _ctx_field(tool, "label", "") or _label(tool.tool),
        "model": model,
        "model_from": model_from,
        "window": window,
        "window_assumed": known is None,
        "always": always,
        "on_demand": b["on_demand_tokens"],
        "conditional": b["conditional_tokens"],
        "cacheable": b["cacheable_tokens"],
        "survives_compaction": b["survives_compaction_tokens"],
        "never_sent_files": b["never_sent_count"],
        "max_potential": potential,
        "always_share": round(always / window, 4),
        "potential_share": round(potential / window, 4),
        "global_tokens": global_tokens,
        "largest_project": b["largest_project"] or None,
        "raw_total": b["raw_total_all_projects"],
        "projects": projects,
    }


def _context_categories(tool: Any) -> dict:
    from ..tools import budget_bucket

    kinds: dict[str, dict] = {}
    for f in tool.files:
        kind = f.kind or "other"
        row = kinds.setdefault(
            kind, {"kind": kind, "files": 0, "bytes": 0, "tokens": 0, "sent": 0, "never_sent": 0, "always": 0, "on_demand": 0, "conditional": 0}
        )
        tok = _ctx_int(f.tokens)
        bucket = budget_bucket(f.sent_to_llm, f.loaded_when)
        row["files"] += 1
        row["bytes"] += _ctx_int(f.size)
        row["tokens"] += tok
        if bucket == "never":
            row["never_sent"] += tok
        else:
            row["sent"] += tok
            row[bucket] += tok
    rows = sorted(kinds.values(), key=lambda r: (-r["tokens"], r["kind"]))
    return {
        "tool": tool.tool,
        "label": _ctx_field(tool, "label", "") or _label(tool.tool),
        "tokens": sum(r["tokens"] for r in rows),
        "sent": sum(r["sent"] for r in rows),
        "never_sent": sum(r["never_sent"] for r in rows),
        "kinds": rows,
    }


def _file_sessions() -> dict[str, list[str]]:
    """Live sessions each discovered file can affect, by normalized path (see tree_walk.session_links)."""
    from ..tree_walk import session_links

    out: dict[str, list[str]] = {}
    try:
        links = session_links()
    except Exception:  # noqa: BLE001 - discovery data is optional for this view
        return out
    for link in links.values():
        for f in link.get("files", []):
            out.setdefault(os.path.normcase(os.path.normpath(f["path"])), []).extend(f.get("sessions", []))
    return out


def _context_file(f: Any, tool: str, root: str, now: float, sessions: dict[str, list[str]] | None = None) -> dict:
    from ..tools import budget_bucket

    mtime = _as_number(f.mtime) or None
    return {
        "sessions": sorted(set((sessions or {}).get(os.path.normcase(os.path.normpath(str(f.path))), []))),
        "path": f.path,
        "name": _basename(f.path),
        "tool": tool,
        "kind": f.kind or "other",
        "scope": f.scope or None,
        "project": context_project(f.path, root, f.scope),
        "size": _ctx_int(f.size),
        "tokens": _ctx_int(f.tokens),
        "sent_to_llm": f.sent_to_llm or None,
        "policy": context_policy(f.sent_to_llm),
        "load": budget_bucket(f.sent_to_llm, f.loaded_when),
        "loaded_when": f.loaded_when or None,
        "cacheable": f.cacheable or None,
        "mtime": mtime,
        "recent": bool(mtime and 0 <= now - mtime < CONTEXT_RECENT_S),
    }


def _context_map(tool_list: list[Any], root: str) -> dict:
    cells: dict[tuple, dict] = {}
    items: dict[tuple, dict[str, int]] = {}
    policy = {"yes": 0, "on-demand": 0, "conditional": 0, "no": 0}
    total = 0
    for t in tool_list:
        for f in t.files:
            tok = _ctx_int(f.tokens)
            kind = f.kind or "other"
            scope = f.scope or "external"
            project = context_project(f.path, root, f.scope)
            pol = context_policy(f.sent_to_llm)
            cell = cells.setdefault((t.tool, kind, scope, project, pol), {"files": 0, "tokens": 0})
            cell["files"] += 1
            cell["tokens"] += tok
            named = items.setdefault((project, kind), {})
            name = context_item_name(f.path)
            named[name] = named.get(name, 0) + tok
            policy[pol] += tok
            total += tok
    rows = [
        {"tool": k[0], "kind": k[1], "scope": k[2], "project": k[3], "policy": k[4], **v}
        for k, v in sorted(cells.items(), key=lambda kv: (-kv[1]["tokens"], kv[0]))
    ]
    item_rows = []
    for (project, kind), named in sorted(items.items()):
        ranked = sorted(named.items(), key=lambda kv: (-kv[1], kv[0]))
        top = ranked[:CONTEXT_MAP_ITEMS]
        rest = sum(v for _, v in ranked[CONTEXT_MAP_ITEMS:])
        item_rows.extend({"project": project, "kind": kind, "name": n, "tokens": v} for n, v in top)
        if rest:
            item_rows.append({"project": project, "kind": kind, "name": "(other)", "tokens": rest})
    return {"total": total, "policy": policy, "rows": rows, "items": item_rows}


def _context_memory(snapshot: Any, now: float) -> list[dict]:
    out = []
    for m in _ctx_field(snapshot, "agent_memory", []) or []:
        path = str(_ctx_field(m, "file", "") or "")
        source = str(_ctx_field(m, "source", "") or "")
        mtime = _as_number(_ctx_field(m, "mtime", 0)) or None
        out.append(
            {
                "file": path,
                "name": _basename(path),
                "source": source,
                "source_label": _MEMORY_LABELS.get(source, source or "Other"),
                "profile": str(_ctx_field(m, "profile", "") or ""),
                "tokens": _ctx_int(_ctx_field(m, "tokens", 0)),
                "lines": _ctx_int(_ctx_field(m, "lines", 0)),
                "mtime": mtime,
                "recent": bool(mtime and 0 <= now - mtime < CONTEXT_RECENT_S),
            }
        )
    return out


def _context_telemetry(raw: dict) -> dict:
    quota = raw.get("quota_state") if isinstance(raw.get("quota_state"), dict) else {}
    by_model = raw.get("by_model") if isinstance(raw.get("by_model"), dict) else {}
    errors = [e for e in raw.get("errors") or [] if isinstance(e, dict)]
    errors.sort(key=lambda e: str(e.get("timestamp") or ""), reverse=True)
    quality = raw.get("cost_quality") or "unknown"
    cost = _as_number(raw.get("cost_usd"))
    changes = quota.get("code_changes") if isinstance(quota.get("code_changes"), dict) else None
    active_in = _ctx_int(raw.get("active_session_input"))
    active_out = _ctx_int(raw.get("active_session_output"))
    tool = str(raw.get("tool") or "")
    return {
        "tool": tool,
        "label": _label(tool),
        "source": raw.get("source") or None,
        "confidence": _as_number(raw.get("confidence")),
        "as_of": raw.get("as_of") or None,
        "token_quality": raw.get("token_quality") or None,
        "input": _ctx_int(raw.get("input_tokens")),
        "output": _ctx_int(raw.get("output_tokens")),
        "cache_read": _ctx_int(raw.get("cache_read_tokens")),
        "cache_write": _ctx_int(raw.get("cache_creation_tokens")),
        "sessions": _ctx_int(raw.get("total_sessions")),
        "messages": _ctx_int(raw.get("total_messages")),
        # A cost of 0 with no price source is not known, not free.
        "cost_usd": None if quality == "unknown" and not cost else cost,
        "cost_quality": quality,
        "cost_reason": raw.get("cost_reason") or None,
        "premium_requests": _as_number(quota.get("premium_requests_used")) or None,
        "quota": {
            "premium_requests": _as_number(quota.get("premium_requests_used")) or None,
            "api_duration_ms": _as_number(quota.get("total_api_duration_ms")) or None,
            "current_model": quota.get("current_model") or None,
            "lines_added": _ctx_int(changes.get("lines_added")) if changes else None,
            "lines_removed": _ctx_int(changes.get("lines_removed")) if changes else None,
            "files_modified": _ctx_int(changes.get("files_modified")) if changes else None,
        },
        "active": {"input": active_in, "output": active_out, "messages": _ctx_int(raw.get("active_session_messages"))} if active_in or active_out else None,
        "by_model": sorted(
            (
                {
                    "model": str(model),
                    "input": _ctx_int(u.get("input_tokens")),
                    "output": _ctx_int(u.get("output_tokens")),
                    "cache_read": _ctx_int(u.get("cache_read_tokens")),
                    "cache_write": _ctx_int(u.get("cache_creation_tokens")),
                    "requests": _ctx_int(u.get("requests")) or None,
                    "cost_usd": _as_number(u.get("cost_usd")) or None,
                }
                for model, u in by_model.items()
                if isinstance(u, dict)
            ),
            key=lambda r: -(r["input"] + r["output"]),
        ),
        "errors": [
            {"ts": e.get("timestamp") or None, "type": e.get("type") or None, "message": str(e.get("message") or ""), "model": e.get("model") or None}
            for e in errors[:CONTEXT_ERRORS]
        ],
    }


def _is_workflow(path: str, kind: str) -> bool:
    lower = path.lower()
    return path.endswith(".workflow.md") or kind in ("workflow", "workflows") or (kind in ("command", "commands") and "/workflows/" in lower)


def _is_prompt(path: str, kind: str) -> bool:
    lower = path.lower()
    return path.endswith(".prompt.md") or kind == "prompt" or (kind in ("command", "commands") and ("/prompts/" in lower or "/commands/" in lower))


def _context_workflows(tool_list: list[Any]) -> list[dict]:
    out: dict[str, dict] = {}
    for t in tool_list:
        for f in t.files:
            path = (f.path or "").replace("\\", "/")
            kind = f.kind or ""
            if not path or path in out or _CONTEXT_FIXTURE_RE.search("/" + path.lower()):
                continue
            if _is_workflow(path, kind):
                what, suffix = "workflow", ".workflow.md"
            elif _is_prompt(path, kind):
                what, suffix = "prompt", ".prompt.md"
            else:
                continue
            name = _basename(path)
            name = name[: -len(suffix)] if name.endswith(suffix) else (name[:-3] if name.endswith(".md") else name)
            out[path] = {
                "path": f.path,
                "name": name,
                "type": what,
                "kind": kind or None,
                "tool": t.tool,
                "size": _ctx_int(f.size),
                "tokens": _ctx_int(f.tokens),
                "mtime": _as_number(f.mtime) or None,
            }
    return sorted(out.values(), key=lambda w: (w["type"], w["name"].lower(), w["path"]))


def _context_daily(conn: sqlite3.Connection, tools: tuple[str, ...] | None, now: float) -> dict:
    """Model calls in the history for the last CONTEXT_DAYS local days, by day and model."""
    days, first = _context_days(now)
    where = "ts >= ?"
    params: list[Any] = [first]
    if tools is not None:
        ids = stored_ids_for(tools)
        if not ids:
            return {"days": days, "since": first, "models": [], "rows": []}
        where += " AND tool IN (" + ",".join("?" for _ in ids) + ")"
        params.extend(ids)
    sql = (
        "SELECT date(ts, 'unixepoch', 'localtime'), model, COUNT(*),"
        " SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens), SUM(cache_creation_tokens),"
        " SUM(CASE WHEN cost_usd > 0 THEN cost_usd ELSE 0 END),"
        " SUM(CASE WHEN cost_usd > 0 THEN 0 ELSE input_tokens END), SUM(CASE WHEN cost_usd > 0 THEN 0 ELSE output_tokens END),"
        " SUM(CASE WHEN cost_usd > 0 THEN 0 ELSE cache_read_tokens END), SUM(CASE WHEN cost_usd > 0 THEN 0 ELSE cache_creation_tokens END),"
        " MAX(ts)"
        f" FROM requests WHERE {where} GROUP BY 1, 2"
    )
    rows = []
    models: dict[str, dict] = {}
    for day, model, n, i, o, cr, cw, stored, ri, ro, rcr, rcw, last in conn.execute(sql, params).fetchall():
        if day not in days:
            continue
        name = model or None
        i, o, cr, cw = (_ctx_int(v) for v in (i, o, cr, cw))
        rest = _ctx_int(ri) + _ctx_int(ro) + _ctx_int(rcr) + _ctx_int(rcw)
        listed = _list_cost(model, _ctx_int(ri), _ctx_int(ro), _ctx_int(rcr), _ctx_int(rcw), last)[0] if rest and model else None
        cost = None if rest and listed is None else round((stored or 0.0) + (listed or 0.0), 6)
        tokens = i + o + cr + cw
        rows.append(
            {"date": day, "model": name, "requests": n, "input": i, "output": o, "cache_read": cr, "cache_write": cw, "tokens": tokens, "cost_usd": cost}
        )
        m = models.setdefault(name or "", {"model": name, "tokens": 0, "requests": 0, "cost_usd": 0.0})
        m["tokens"] += tokens
        m["requests"] += n
        m["cost_usd"] = None if m["cost_usd"] is None or cost is None else round(m["cost_usd"] + cost, 6)
    rows.sort(key=lambda r: (r["date"], -r["tokens"]))
    return {"days": days, "since": first, "models": sorted(models.values(), key=lambda m: -m["tokens"]), "rows": rows}


def _context_growth(conn: sqlite3.Connection, now: float) -> list[dict]:
    """Agent memory size over the last days, at most CONTEXT_GROWTH_POINTS points, each the last value of its time."""
    since = now - CONTEXT_GROWTH_S
    first = conn.execute("SELECT MIN(ts) FROM system_snapshots WHERE ts >= ?", (since,)).fetchone()[0]
    if first is None:
        return []
    step = max(60.0, (now - first) / CONTEXT_GROWTH_POINTS)
    rows = conn.execute(
        "SELECT MAX(ts), mem_tokens, memory_entries FROM system_snapshots WHERE ts >= ? GROUP BY CAST((ts - ?) / ? AS INTEGER) ORDER BY 1",
        (first, first, step),
    ).fetchall()
    return [{"ts": ts, "mem_tokens": _ctx_int(mt), "memory_entries": _ctx_int(me)} for ts, mt, me in rows]


def _context_db_parts(db: Any, tools: tuple[str, ...] | None, now: float) -> dict:
    empty = {"daily": _context_daily_empty(now), "growth": []}
    if db is None:
        return empty
    key = (id(db), tools)
    with _context_lock:
        hit = _context_db_memo.get(key)
    if hit and 0 <= now - hit[0] < CONTEXT_DB_TTL_S:
        return hit[1]
    try:
        with read_scope(db, Filters(since=_context_days(now)[1], until=now)):
            conn = db._conn()
            parts = {"daily": _context_daily(conn, tools, now), "growth": _context_growth(conn, now)}
    except sqlite3.Error:
        logger.debug("Could not read the context history", exc_info=True)
        return empty
    with _context_lock:
        _context_db_memo[key] = (now, parts)
        while len(_context_db_memo) > CONTEXT_MEMO_KEYS:
            _context_db_memo.pop(next(iter(_context_db_memo)))
    return parts


def _context_days(now: float) -> tuple[list[str], float]:
    """The last CONTEXT_DAYS local dates, oldest first, and the start of the first."""
    today = datetime.fromtimestamp(now)
    days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(CONTEXT_DAYS - 1, -1, -1)]
    return days, datetime.strptime(days[0], "%Y-%m-%d").timestamp()


def _context_daily_empty(now: float) -> dict:
    days, first = _context_days(now)
    return {"days": days, "since": first, "models": [], "rows": []}


def compute_context(db: Any, store: Any, tools: tuple[str, ...] | None = None, now: float | None = None) -> dict:
    """Everything ``GET /api/board/context`` returns. Token counts are estimates at four characters per token."""
    from ..tool_scope import is_selected
    from ..tools import compute_token_budget

    now = time.time() if now is None else now
    snapshot = getattr(store, "snapshot", None)
    root = str(_ctx_field(snapshot, "root", "") or "")
    tool_list = _context_tools(snapshot, tools) if snapshot is not None else []
    configs = list(_ctx_field(snapshot, "tool_configs", []) or [])
    raw_telemetry = [t for t in _ctx_field(snapshot, "tool_telemetry", []) or [] if isinstance(t, dict)]
    by_tool = {str(t.get("tool") or ""): t for t in raw_telemetry}
    budget_rows = []
    for t in tool_list:
        if not t.files:
            continue
        model, model_from = _context_model(t.tool, configs, by_tool)
        budget_rows.append(_context_budget(t, root, model, model_from))
    budget_rows.sort(key=lambda b: (-b["always"], b["tool"]))
    totals = compute_token_budget(tool_list, root)
    files = []
    affects = _file_sessions()
    for t in tool_list:
        listed = sorted(t.files, key=lambda f: (-_ctx_int(f.tokens), f.path))
        files.append(
            {
                "tool": t.tool,
                "label": _ctx_field(t, "label", "") or _label(t.tool),
                "count": len(listed),
                "truncated": len(listed) > CONTEXT_MAX_FILES,
                "files": [_context_file(f, t.tool, root, now, affects) for f in listed[:CONTEXT_MAX_FILES]],
            }
        )
    files = [f for f in files if f["count"]]
    files.sort(key=lambda f: (-sum(x["tokens"] for x in f["files"]), f["tool"]))
    categories = [_context_categories(t) for t in tool_list if t.files]
    categories.sort(key=lambda c: (-c["tokens"], c["tool"]))
    telemetry = [_context_telemetry(t) for t in raw_telemetry if t.get("tool") and is_selected(str(t["tool"]), tools)]
    telemetry.sort(key=lambda t: (-(t["input"] + t["output"]), t["tool"]))
    db_parts = _context_db_parts(db, tools, now)
    memory = _context_memory(snapshot, now) if snapshot is not None else []
    return {
        "generated_at": now,
        "root": root or None,
        "budget": {
            "tools": budget_rows,
            "totals": {
                "always": totals["always_loaded_tokens"],
                "on_demand": totals["on_demand_tokens"],
                "conditional": totals["conditional_tokens"],
                "cacheable": totals["cacheable_tokens"],
                "max_potential": totals["total_potential_tokens"],
                "never_sent_files": totals["never_sent_count"],
            },
        },
        "categories": categories,
        "map": _context_map(tool_list, root),
        "memory": {"entries": memory, "tokens": sum(m["tokens"] for m in memory), "growth": db_parts["growth"]},
        "files": files,
        "telemetry": telemetry,
        "daily": db_parts["daily"],
        "workflows": _context_workflows(tool_list),
    }


def context_bytes(db: Any, store: Any, query: str, now: float | None = None) -> bytes:
    """The answer for ``/api/board/context``, kept for each snapshot version. ``tool`` is as on ``/api/board``."""
    qs = parse_qs(query, keep_blank_values=True)
    tools = normalize_selection(part for raw in qs["tool"] for part in raw.split(",")) if "tool" in qs else None
    version = getattr(store, "version", None)
    key = (id(store), version, tools)
    if version is not None:
        with _context_lock:
            body = _context_memo.get(key)
        if body is not None:
            return body
    body = json.dumps(compute_context(db, store, tools, now)).encode("utf-8")
    if version is not None:
        with _context_lock:
            _context_memo[key] = body
            while len(_context_memo) > CONTEXT_MEMO_KEYS:
                _context_memo.pop(next(iter(_context_memo)))
    return body
