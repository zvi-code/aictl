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
import difflib
import hashlib
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
        span = self.spans.get(table)
        if span is None:
            first = self.conn.execute(f"SELECT MIN(ts) FROM {table}").fetchone()[0]
            last = self.conn.execute(f"SELECT MAX(ts) FROM {table}").fetchone()[0]
            span = self.spans[table] = (first, last)
        first, last = span
        if first is None:
            return table
        inside = min(last, self.f.until) - max(first, self.f.since)
        return f"{table} NOT INDEXED" if inside * 2 >= last - first else table

    def _step(self, column: str = "ts") -> tuple[str, list]:
        """SQL for a row's step of the time grid."""
        f = self.f
        return f"MIN({f.grid - 1}, CAST(({column} - ?) / ? AS INTEGER))", [f.since, (f.until - f.since) / f.grid]

    def _bucket_of(self, ts: float) -> int:
        return max(0, min(self.f.buckets - 1, int((ts - self.f.since) / self.f.bucket_s)))

    def _spark_of(self, ts: float) -> int:
        return max(0, min(SPARK_POINTS - 1, int((ts - self.f.since) / self.f.spark_s)))

    # ── Loading ────────────────────────────────────────────────

    def load(self, base_memo: _BaseMemo | None = None, base_key: tuple | None = None) -> _Board:
        """Read the window, then apply the filters. A change of filter reuses what was read."""
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
    for sid, ts, end, turn_tokens in board.conn.execute(
        "WITH w AS (SELECT value ->> 0 sid, value ->> 1 t, value ->> 2 nx FROM json_each(?))"
        " SELECT w.sid, w.t, MAX(r.ts + r.duration_ms / 1000.0),"
        " SUM(r.input_tokens + r.output_tokens + r.cache_read_tokens + r.cache_creation_tokens)"
        " FROM w LEFT JOIN requests r ON r.session_id = w.sid AND r.ts >= w.t AND r.ts < w.nx"
        f"{model_sql} GROUP BY w.sid, w.t",
        [json.dumps(triples), *model_params],
    ):
        tokens[(sid, ts)] = turn_tokens
        if (sid, ts) in sampled and end is not None and end > ts:
            lengths.append((end - ts) * 1000.0)
    lengths.sort()
    return _Turns(len(rows), lengths, None, tokens, starts)


def _tools_section(board: _Board) -> dict:
    where, params = board._scoped()
    step, idx = board._step()
    rows = board.conn.execute(
        f"SELECT tool_name, {step} g, COUNT(*), SUM(is_error), MAX(duration_ms), SUM(duration_ms > 0)"
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
    for name, g, count, errs, slowest, timed in rows:
        b, s = board.b_of[g], board.s_of[g]
        row = stats.setdefault(name, {"calls": 0, "failed": 0, "max": 0.0, "timed": 0, "trend": [0] * SPARK_POINTS})
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
        for row in conn.execute(sql):
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
    rows = conn.execute("SELECT tool, source, MAX(ts) FROM requests NOT INDEXED GROUP BY tool, source").fetchall()
    rows += conn.execute("SELECT tool, source, MAX(last_activity_at) FROM session_usage GROUP BY tool, source").fetchall()
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
        {"tool": r["tool"], "label": r["label"], "data_from": ", ".join(sorted(r["names"])) or None, "last_data_ts": r["last_data_ts"]}
        for r in ordered
    ]


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


def _self_section(db: Any) -> dict:
    if _self_memo[1] is None or time.monotonic() - _self_memo[0] >= SELF_TTL_S:
        try:
            _self_memo[1] = self_usage()
            _self_memo[0] = time.monotonic()
        except Exception:  # noqa: BLE001 - a psutil failure must not take the board down
            _self_memo[1] = None
    usage = _self_memo[1] or {"cpu_percent": None, "memory_rss_bytes": None, "children": []}
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


def compute_board(
    db: Any,
    filters: Filters,
    snapshot: Any = None,
    now: float | None = None,
    base_memo: _BaseMemo | None = None,
    base_key: tuple | None = None,
) -> dict:
    """Everything ``GET /api/board`` returns, for one set of filters."""
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


def agent_detail(db: Any, agent_id: str, snapshot: Any = None, now: float | None = None) -> tuple[int, dict]:
    now = time.time() if now is None else now
    conn = db._conn()
    sid, agent = _resolve_agent(conn, agent_id)
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
    board = _Board(conn, filters, now, snapshot, only_session=sid, facts=facts).load()
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
        }
        for ts, name, target, duration, failed, confirm in conn.execute(
            "SELECT ts, tool_name, target, duration_ms, is_error, confirm FROM tool_invocations"
            f" WHERE session_id = ?{agent_sql} AND {_IS_CALL_SQL} ORDER BY ts DESC LIMIT {MAX_DETAIL_ROWS}",
            [sid, *agent_params],
        )
    ]
    # The call list above is capped, so the count per tool comes from all calls.
    tool_totals = [
        {"name": name, "calls": calls, "failed": failed or 0, "total_ms": total_ms or None}
        for name, calls, failed, total_ms in conn.execute(
            "SELECT tool_name, COUNT(*), SUM(is_error <> 0), SUM(duration_ms) FROM tool_invocations"
            f" WHERE session_id = ?{agent_sql} AND {_IS_CALL_SQL} GROUP BY tool_name ORDER BY COUNT(*) DESC, tool_name",
            [sid, *agent_params],
        )
    ]
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
    }


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
_COMPUTE_TOOK: dict[tuple, float] = {}
_refresh_lock = threading.Lock()
_refresh_thread: threading.Thread | None = None
_COMPUTE_LOCK = threading.Lock()


def _store_version(db: Any, now: float) -> tuple:
    """Changes when rows arrive, and every MEMO_TTL_S for rows merged in place and for live state.

    The live snapshot's own version is left out: it moves on every monitor cycle, so
    a dashboard that polls would recompute each time with nothing new to show.
    """
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
    version = _store_version(db, now)
    path = str(getattr(db, "_path", ""))
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
    with _COMPUTE_LOCK:
        body = _MEMO.get(key)
        if body is not None:
            return body
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
        _COMPUTE_TOOK[(path, key_filters)] = time.monotonic() - started
        while len(_COMPUTED_AT) > MEMO_MAX_KEYS:
            oldest = next(iter(_COMPUTED_AT))
            _COMPUTED_AT.pop(oldest)
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


_ACTIONS = {
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
