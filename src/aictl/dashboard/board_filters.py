"""Parse shared history filters for live and HTTP board reads."""

from __future__ import annotations

import math
from dataclasses import dataclass, replace
from urllib.parse import parse_qs

from ..ingesters._common import project_key
from ..tool_scope import normalize_selection

SPARK_POINTS = 12


DEFAULT_BUCKETS = 48


MAX_BUCKETS = 240


DEFAULT_RANGE_S = 7 * 86400.0


STATUSES = ("all", "active", "running", "looping", "waiting", "idle", "ended", "failed")


CLOCK_RANGE_SLACK_S = 120.0


MEMO_TTL_S = 15.0


class BoardRequestError(ValueError):
    """A request parameter the board cannot use."""


@dataclass(frozen=True)
class Filters:
    since: float
    until: float
    tools: tuple[str, ...] | None = None
    # The exact project values chosen (project_filter.py); () is every project.
    projects: tuple[str, ...] = ()
    # Chosen repositories by root folder, not yet resolved to their projects (project_filter.resolve).
    repos: tuple[str, ...] = ()
    model: str = ""
    status: str = "all"
    q: str = ""
    buckets: int = DEFAULT_BUCKETS
    runtime_statuses: tuple[tuple[str, str], ...] | None = None

    def matches_project(self, path: str | None) -> bool:
        """Whether a folder is one of the chosen projects (exact, in each spelling of one path)."""
        return not self.projects or project_key(path) in {project_key(p) for p in self.projects}

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
        return self.tools is not None or bool(self.projects or self.repos or self.model or self.q) or self.status != "all"


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
        projects=_projects(qs),
        repos=_projects(qs, "repo"),
        model=one("model"),
        status=status,
        q=one("q")[:200],
        buckets=min(buckets, MAX_BUCKETS),
    )


def _projects(qs: dict[str, list[str]], key: str = "project") -> tuple[str, ...]:
    from .project_filter import ProjectFilterError, requested_projects

    try:
        return requested_projects(qs, key)
    except ProjectFilterError as exc:
        raise BoardRequestError(str(exc)) from exc


def _detail_filters(now: float) -> Filters:
    return Filters(since=0.0, until=now + 60.0, buckets=1)


def _clock_range(filters: Filters) -> Filters:
    """A range that follows the clock, moved in steps of a quarter bucket.

    Moved every second, old rows would cross bucket lines on every read, and an
    answer with no new data would still differ from the last one.
    """
    span = 60.0 * round((filters.until - filters.since) / 60.0)
    step = max(MEMO_TTL_S, span / filters.buckets / 4)
    until = math.ceil(filters.until / step) * step
    return replace(filters, since=until - span, until=until)
