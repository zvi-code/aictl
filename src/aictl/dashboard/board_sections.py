"""The node and fleet board in sections: each section is read by its own request from its own reads.

One *selection* (a node or the fleet, a window and the filters) is one ``Selection``. Its sections share
what they have in common: the window's usage, tool totals, prompts and session rows (the base board), the
store's facts, and every read, each made once per selection and only when a section asks for it. A read
that fails fails only the sections that need it; the selection forgets it, so the next request reads it
again. A section never waits for a read it does not need.

``SECTIONS`` names the board fields each section answers; the sections of a selection together are the
single board ``compute_board`` builds (``merge`` joins them), field by field.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from collections.abc import Callable
from concurrent.futures import Future
from dataclasses import dataclass, replace
from types import SimpleNamespace
from typing import Any

from . import board_projection as bp
from .board_filters import Filters
from .projections.history import HistoryScope

logger = logging.getLogger(__name__)


class Abandoned(Exception):
    """Nobody waits for this selection any more: its viewers moved on to another one."""


@dataclass(frozen=True)
class Section:
    paths: tuple[str, ...]
    compute: Callable[[Selection], dict]


class _SharedHistory:
    """A history whose reads are made once per selection, so its sections share them."""

    def __init__(self, history: HistoryScope, selection: Selection) -> None:
        self._history = history
        self._selection = selection

    def __getattr__(self, name: str) -> Any:
        return getattr(self._history, name)

    def read(self, view: str, **params: Any) -> list[dict]:
        key = json.dumps(["history", view, params], sort_keys=True, default=str)
        # A pass-through, not a read of its own: the callers name their views, and the paging guard
        # (test_history_paging) checks them there. The unbound call keeps the guard from following
        # every method named read through this wrapper.
        history = self._history
        return self._selection.once(key, lambda: type(history).read(history, view, **params))

    def require_reader(self) -> Any:
        return _SharedReader(self._history.require_reader(), self._selection)


class _SharedReader:
    def __init__(self, reader: Any, selection: Selection) -> None:
        self._reader = reader
        self._selection = selection

    def __getattr__(self, name: str) -> Any:
        return getattr(self._reader, name)

    def read(self, view: str, params: dict) -> Any:
        key = json.dumps(["reader", view, params], sort_keys=True, default=str)
        return self._selection.once(key, lambda: self._reader.read(view, params))


class Selection:
    """One selection's shared inputs, each read or computed once, when a section first needs it."""

    def __init__(self, db: Any, filters: Filters, history: HistoryScope, now: float) -> None:
        from .project_filter import resolve, scoped

        if filters.repos:
            filters = replace(filters, projects=resolve(history, filters.projects, filters.repos), repos=())
        self.raw_history = scoped(history, filters.projects)
        self.raw_history.require_reader()
        self.db, self.filters, self.now = db, filters, now
        self.created = time.monotonic()
        # How long the base board took to read: a range that follows the clock reuses it a while (history_board).
        self.cost: float | None = None
        self.viewers: set[str] = set()
        self.abandoned = False
        self._memo: dict[str, Future] = {}
        self._lock = threading.Lock()
        self.history = _SharedHistory(self.raw_history, self)
        self.memo_key = str(getattr(db, "_path", "memory"))
        self.conn = SimpleNamespace(_reported_history=self.raw_history.qualified, _live_latency_bound=True,
                                    _live_projection=False)

    def new_board(self) -> bp._Board:
        """A board of this selection; its reads are the selection's."""
        return bp._Board(self.conn, self.filters, self.now, None, history=self.history)

    def abandon(self) -> None:
        """Start no more reads: the reads already running finish, a later one raises ``Abandoned``."""
        with self._lock:
            self.abandoned = True

    # ── Once per selection ──

    def once(self, name: str, compute: Callable[[], Any]) -> Any:
        """*compute()*'s result, computed by the first caller; others wait for it. A failure is not kept."""
        with self._lock:
            future = self._memo.get(name)
            leader = future is None
            if leader:
                if self.abandoned:
                    raise Abandoned("The selection changed before this part of the board was read")
                future = self._memo[name] = Future()
        if not leader:
            return future.result()
        try:
            value = compute()
        except BaseException as exc:
            with self._lock:
                self._memo.pop(name, None)
            future.set_exception(exc)
            raise
        future.set_result(value)
        return value

    def warm(self, *inputs: Callable[[], Any]) -> None:
        """Start these inputs now, each on its own thread, so a section finds them read or reading."""
        for get in inputs:
            threading.Thread(target=_quietly, args=(get,), daemon=True, name="board-section-read").start()

    # ── The inputs ──

    def board(self) -> bp._Board:
        """The base board. A failed attempt leaves its half-loaded board behind: the next one starts anew."""
        def load() -> bp._Board:
            started = time.monotonic()
            board = self.new_board()
            board.load_base(lambda: _decide_status(board))
            if self.filters.status != "all":
                # The status filter needed the statuses before the filters: they are this board's already.
                for name in ("test_rows", "failure_rows", "status"):
                    self.once(name, lambda: None)
            self.cost = time.monotonic() - started
            return board

        return self.once("board", load)

    def facts(self) -> bp._Board:
        board = self.board()
        self.once("facts", lambda: board.use_facts(bp._store_facts(self.memo_key, self.raw_history)))
        return board

    def test_rows(self) -> None:
        self.once("test_rows", self.board()._load_tests)

    def failure_rows(self) -> None:
        self.once("failure_rows", self.board()._load_failures)

    def status(self) -> bp._Board:
        board = self.board()

        def decide() -> None:
            bp._gather(self.conn, [self.test_rows, self.failure_rows])
            _decide_status(board)
            # The filters ran before the statuses were known: the loops in view follow them now.
            board.visible_loops = [loop for loop in board.loops if loop["session_id"] in board.scope]

        self.once("status", decide)
        return board

    def pending(self) -> bp._Board:
        board = self.board()
        self.once("pending_rows", board._load_pending)
        self.once("pending", board._index_pending)
        return board

    def confirm_counts(self) -> None:
        self.once("confirm_counts", self.board()._load_confirm_counts)

    def credits(self) -> dict:
        board = self.board()
        return self.once("credits", lambda: bp._session_credits(board))

    def latency(self) -> dict:
        board = self.board()
        return self.once("latency", lambda: bp._latency(board))

    def tool_section(self) -> dict:
        board = self.board()
        return self.once("tool_section", lambda: bp._tools_section(board))

    def errors(self) -> tuple:
        board = self.board()
        self.failure_rows()
        return self.once("errors", lambda: bp._errors_section(board))

    def tests(self) -> tuple:
        board = self.board()
        self.test_rows()
        return self.once("tests", lambda: bp._tests_section(board))

    def resources(self) -> tuple:
        board = self.board()
        return self.once("resources", lambda: bp._resource_series(board))

    def turns(self) -> tuple:
        board = self.board()
        return self.once("turns", lambda: bp.skills_and_turns(board))

    def changes(self) -> tuple:
        board = self.board()
        return self.once("changes", lambda: bp._changes_section(board))

    def agents(self) -> list[dict]:
        board = self.status()
        self.pending()
        self.facts()
        self.credits()
        return self.once("agents", lambda: bp.agents_of(board))

    def loop_rows(self) -> list[dict]:
        board = self.status()
        return self.once("loop_rows", lambda: bp._loop_rows(board))

    def source_rows(self) -> list[tuple]:
        return self.once("source_rows", lambda: bp._source_rows(self.raw_history, self.memo_key))


def _decide_status(board: bp._Board) -> None:
    """The loops and each session's status. With the call rows read already, it reads the loop search and
    the turns that ended; run again after a failure, it starts over."""
    if board.f.status != "all":
        bp._gather(board.conn, [board._load_tests, board._load_failures])
    board.loops = []
    board._load_loops()
    board._decide_status()


def _quietly(get: Callable[[], Any]) -> None:
    try:
        get()
    except Exception:  # noqa: BLE001 - the section that needs it reads it again and reports the failure
        logger.debug("A board section's early read failed", exc_info=True)


def _usage(s: Selection) -> dict:
    board = s.board()
    s.credits()
    return bp.usage_part(s.db, board, s.now)


def _tools(s: Selection) -> dict:
    board = s.board()
    s.facts()
    return bp.tools_part(board, s.tool_section())


def _latency(s: Selection) -> dict:
    board = s.status()
    agents = None if s.raw_history.qualified else s.agents()
    return bp.latency_part(board, s.latency(), s.tool_section(), s.turns(), bp.run_lengths(board, s.raw_history, agents))


def _projects(s: Selection) -> dict:
    board = s.status()
    s.facts()
    s.credits()
    return bp.projects_part(board, s.latency(), s.tests(), s.errors(), s.changes()[1])


def _options(s: Selection) -> dict:
    board = s.board()
    return {"options": bp._options(board, (tool for tool, _source, _ts in s.source_rows()))}


def _sources(s: Selection) -> dict:
    board = s.facts()
    s.board()
    s.source_rows()
    return bp.sources_parts(board, s.raw_history, board.facts, s.memo_key)[1]


def _confirms(s: Selection) -> dict:
    board = s.pending()
    s.confirm_counts()
    return bp.confirms_part(board, s.tool_section())


# The sections, the cheapest useful first. Each names the board fields it answers: a dotted name is
# one key of a field. The page reads a field from the sections that answer it (ui/src/panels/boardSections.json).
SECTIONS: dict[str, Section] = {
    "usage": Section(
        ("generated_at", "capture_mode", "range", "series.tokens", "series.cost", "series.cached_share", "scope",
         "kpis.messages", "kpis.tokens", "kpis.cached_share", "kpis.cost_usd", "kpis.spark.running",
         "kpis.spark.tokens", "kpis.spark.cached", "kpis.spark.cost", "by_role", "saved_usd", "unpriced", "credits",
         "prompts_total"),
        _usage),
    "tools": Section(
        ("series.messages", "series.failures.tool", "kpis.tool_calls", "kpis.failures", "kpis.fail_rate",
         "kpis.spark.messages", "kpis.spark.tool_calls", "kpis.spark.failures", "tools"),
        _tools),
    "status": Section(
        ("kpis.running", "kpis.idle", "kpis.subagents_running", "kpis.loops", "kpis.spark.loops"),
        lambda s: bp.status_part(s.status())),
    "speed": Section(
        ("kpis.p50_ms", "kpis.p95_ms", "kpis.spark.p95", "series.latency", "by_model"),
        lambda s: bp.speed_part(s.board(), s.latency())),
    "options": Section(("options",), _options),
    "agents": Section(("agents",), lambda s: bp.agents_part(s.agents())),
    "attention": Section(("attention",), lambda s: bp.attention_part(s.status(), s.loop_rows(), s.agents())),
    "projects": Section(("projects",), _projects),
    "prompts": Section(("prompts", "skills"), lambda s: bp.prompts_part(s.board(), s.turns())),
    "project_prompts": Section(("project_prompts", "project_prompts_searched"),
                               lambda s: bp.project_prompts_part(s.board())),
    "confirms": Section(("confirms",), _confirms),
    "errors": Section(("errors", "series.failures.api"), lambda s: bp.errors_part(s.board(), s.errors())),
    "latency": Section(("latency",), _latency),
    "loops": Section(("loops",), lambda s: bp.loops_part(s.loop_rows())),
    "changes": Section(("changes",), lambda s: bp.changes_part(s.changes())),
    "tests": Section(("tests", "tests_piped", "series.tests"), lambda s: bp.tests_part(s.board(), s.tests())),
    "files": Section(("memory_files",), lambda s: bp.files_part(s.board())),
    "resources": Section(("series.cpu", "series.mem", "tool_labels"),
                         lambda s: _only(bp.resources_part(s.db, s.board(), s.resources()), ("series", "tool_labels"))),
    "sources": Section(("sources", "coverage"), _sources),
}


def _only(fields: dict, names: tuple[str, ...]) -> dict:
    return {name: fields[name] for name in names if name in fields}


def compute_section(selection: Selection, section: str) -> dict:
    """The fields of one section, computed once per selection; a store failure of a read it needs is raised."""
    selection.warm(*_warm_inputs(selection, section))
    return selection.once(f"section:{section}", lambda: SECTIONS[section].compute(selection))


def _warm_inputs(s: Selection, section: str) -> list[Callable[[], Any]]:
    """The reads a section needs that do not wait for the base board: started side by side with it. Each is
    made by the code that uses it, on a board of its own, so the read is the very one the section makes."""
    tests = lambda: s.new_board()._load_tests()  # noqa: E731
    failures = lambda: s.new_board()._load_failures()  # noqa: E731
    pending = lambda: s.new_board()._load_pending()  # noqa: E731
    facts = lambda: bp._store_facts(s.memo_key, s.raw_history)  # noqa: E731
    window = {
        "usage": [lambda: s.history.read("usage.sessions", since=s.filters.since, until=s.filters.until)],
        "tools": [facts],
        "status": [tests, failures],
        "agents": [tests, failures, pending, facts],
        "attention": [tests, failures, pending],
        "loops": [tests, failures],
        "latency": [tests, failures],
        "projects": [tests, failures, facts],
        "confirms": [lambda: s.new_board()._load_confirm_counts(), pending],
        "errors": [failures],
        "tests": [tests],
        "resources": [lambda: bp.resource_rows(s.history, s.filters)],
        "options": [s.source_rows],
        "sources": [s.source_rows, facts],
    }
    return [*window.get(section, ()), s.board]


def merge(parts: list[dict]) -> dict:
    """The board the sections of one selection make together."""
    return bp._merge(*parts)
