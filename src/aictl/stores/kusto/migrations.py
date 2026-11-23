"""Migrations: named steps that upgrade stored rows across a layout change that breaks compatibility.

A step is a list of statements. Each statement has a query that counts the rows it would
change and a management command that changes them. Statements must be idempotent and safe
to resume: a statement run again after an interruption finds nothing left to change. A step
that completes is recorded in ``schema_version`` (kind ``migration``) and is not run again.

Rows are changed the way the writers change them: a new version of the row (a newer ``_v``),
or a tombstone (``_deleted = true``). ``.set-or-append`` matches columns by position, so
every statement appends ``T | take 0 | union (...)``: the union puts the table's own columns
first, in the table's order, matched by name and type.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from .client import Result, quote
from .layout import CHANGES, Change, StoredLayout


@dataclass(frozen=True)
class Statement:
    description: str
    count_query: str
    command: str


@dataclass(frozen=True)
class Migration:
    name: str
    summary: str
    plan: Callable[[], list[Statement]]
    cannot_repair: str = ""


@dataclass
class StatementResult:
    description: str
    command: str
    rows: int | None


@dataclass
class StepResult:
    version: int
    name: str
    status: str  # planned | done | skipped (done before) | failed
    statements: list[StatementResult] = field(default_factory=list)
    error: str = ""


def append(table: str, query: str, lets: str = "") -> str:
    """Append *query*'s rows to *table*, columns matched by name and type. *lets* go first."""
    return f".set-or-append {quote(table)} <| {lets}{quote(table)} | take 0 | union ({query})"


# ── requests_single_copy (layout 1) ─────────────────────────────────

_USED = {"project": "string", "node_id": "string", "_v": "datetime", "id": "long", "dedup_key": "string", "_deleted": "bool", "source": "string", "session_id": "string",
         "input_tokens": "long", "output_tokens": "long", "cache_read_tokens": "long", "cache_creation_tokens": "long",
         "ts": "real", "duration_ms": "real", "ttft_ms": "real", "prompt_id": "string", "pid": "long",
         "finish_reason": "string"}
# A dry run reads tables an old aictl created, before they are widened: a column they lack
# reads as null. After widening, each column_ifexists is the column itself.
_COLUMNS = ", ".join(f"{quote(c)}=column_ifexists('{c}', {chr(39) * 2 if t == 'string' else f'{t}(null)'})"
                     for c, t in _USED.items())
_LATEST_REQUESTS = (
    f"['requests'] | extend {_COLUMNS}"
    " | extend fact_key=iff(isempty(dedup_key), tostring(id), dedup_key)"
    " | summarize arg_max(_v, *) by ['project'], node_id, fact_key"
    " | where not(coalesce(_deleted, false))"
)
_AGENT_TEAM_COPIES = f"{_LATEST_REQUESTS} | where source == 'claude-code-jsonl'"


def _pairs() -> str:
    """Telemetry and transcript reports of one call: the n-th of each with the same session and counts."""
    counts = ", '|', ".join(f"coalesce({c}, 0)" for c in (
        "input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens"))
    numbered = (
        "| where isnotempty(session_id) and (coalesce(input_tokens, 0) > 0 or coalesce(output_tokens, 0) > 0"
        " or coalesce(cache_read_tokens, 0) > 0 or coalesce(cache_creation_tokens, 0) > 0)"
        f" | extend call=strcat(node_id, '|', session_id, '|', {counts})"
        " | order by call asc, ts asc, fact_key asc | extend n=row_number(1, prev(call) != call)"
    )
    return (
        f"let live_rows = {_LATEST_REQUESTS};"
        f" let transcript = live_rows | where source == 'transcript' {numbered};"
        f" let telemetry = live_rows | where source == 'otel' {numbered};"
        " let pairs = transcript | project call, n, node_id, t_project=['project'], t_key=fact_key"
        " | join kind=inner (telemetry | project call, n, o_project=['project'], o_key=fact_key,"
        " o_duration=duration_ms, o_ttft=ttft_ms, o_prompt=prompt_id, o_pid=pid, o_finish=finish_reason)"
        " on call, n;"
    )


_EMPTY_FIELDS = (
    "(coalesce(duration_ms, 0.0) == 0.0 and coalesce(o_duration, 0.0) != 0.0)"
    " or (coalesce(ttft_ms, 0.0) == 0.0 and coalesce(o_ttft, 0.0) != 0.0)"
    " or (isempty(prompt_id) and isnotempty(o_prompt))"
    " or (coalesce(pid, 0) == 0 and coalesce(o_pid, 0) != 0)"
    " or (isempty(finish_reason) and isnotempty(o_finish))"
)
_MERGED = (
    "extend duration_ms=iff(coalesce(duration_ms, 0.0) == 0.0, o_duration, duration_ms),"
    " ttft_ms=iff(coalesce(ttft_ms, 0.0) == 0.0, o_ttft, ttft_ms),"
    " prompt_id=iff(isempty(prompt_id), o_prompt, prompt_id),"
    " pid=iff(coalesce(pid, 0) == 0, o_pid, pid),"
    " finish_reason=iff(isempty(finish_reason), o_finish, finish_reason)"
)


def _transcript_to_merge() -> str:
    return (
        "live_rows | lookup kind=inner (pairs | project ['project']=t_project, node_id, fact_key=t_key,"
        f" o_duration, o_ttft, o_prompt, o_pid, o_finish) on ['project'], node_id, fact_key"
        f" | where {_EMPTY_FIELDS}"
    )


def _telemetry_to_delete() -> str:
    return (
        "live_rows | lookup kind=inner (pairs | project ['project']=o_project, node_id, fact_key=o_key)"
        " on ['project'], node_id, fact_key"
    )


def _requests_single_copy() -> list[Statement]:
    return [
        Statement(
            "Delete the request copies the agent-team scan stored (source claude-code-jsonl); "
            "the transcript reader stores the same calls",
            f"{_AGENT_TEAM_COPIES} | count",
            append("requests", f"{_AGENT_TEAM_COPIES} | extend _deleted=true, _v=now() | project-away fact_key"),
        ),
        Statement(
            "Copy timing, prompt id, pid and finish reason from a telemetry report to the transcript row "
            "of the same call, where the transcript row has none",
            f"{_pairs()} {_transcript_to_merge()} | count",
            append("requests", f"{_transcript_to_merge()} | {_MERGED} | extend _v=now()"
                               " | project-away fact_key, o_duration, o_ttft, o_prompt, o_pid, o_finish", _pairs() + " "),
        ),
        Statement(
            "Delete the telemetry row of a call the transcript also stored (same node, session and token "
            "counts, paired in time order)",
            f"{_pairs()} {_telemetry_to_delete()} | count",
            append("requests", f"{_telemetry_to_delete()} | extend _deleted=true, _v=now() | project-away fact_key",
                   _pairs() + " "),
        ),
    ]


MIGRATIONS: dict[str, Migration] = {
    "requests_single_copy": Migration(
        "requests_single_copy",
        "Keep one request row per model call",
        _requests_single_copy,
        cannot_repair=(
            "A call whose telemetry and transcript token counts differ stays counted twice; "
            "calls that only telemetry reported stay as they are."
        ),
    ),
}


def pending(stored: StoredLayout) -> list[tuple[Change, Migration]]:
    """The steps from *stored* to this layout, oldest first, without those already done."""
    steps = []
    for change in CHANGES:
        if change.version > stored.version and change.migration and change.migration not in stored.migrations_done:
            steps.append((change, MIGRATIONS[change.migration]))
    return steps


def run(
    stored: StoredLayout,
    *,
    count: Callable[[str], Result],
    execute: Callable[[str], object],
    record: Callable[[Change, Migration, str], None],
    dry_run: bool,
    echo: Callable[[str], None] = lambda _: None,
) -> list[StepResult]:
    """Run (or with *dry_run* only count) the pending steps. A failed step is recorded and raised."""
    results = []
    for change, migration in pending(stored):
        result = StepResult(change.version, migration.name, "planned" if dry_run else "done")
        results.append(result)
        echo(f"layout {change.version}: {migration.name} - {migration.summary}")
        total = 0
        for statement in migration.plan():
            try:
                rows = count(statement.count_query).dicts()
                affected = int(next(iter(rows), {}).get("Count", 0) or 0)
                echo(f"  {statement.description}: {affected:,} rows")
                if dry_run:
                    echo(f"    {statement.command}")
                elif affected:
                    execute(statement.command)
            except Exception as exc:
                result.status, result.error = "failed", str(exc)
                if not dry_run:
                    record(change, migration, f"failed: {str(exc)[:500]}")
                raise
            result.statements.append(StatementResult(statement.description, statement.command, affected))
            total += affected
        if migration.cannot_repair:
            echo(f"  Not repaired: {migration.cannot_repair}")
        if not dry_run:
            record(change, migration, f"done: {total} rows")
    return results


def runner(client, database: str, echo: Callable[[str], None] = lambda _: None):
    """The ``migrate`` callable that ``ensure_schema`` runs after widening the tables."""
    from .schema import management, querying

    command, query = management(client, database), querying(client, database)

    def migrate(stored: StoredLayout, epoch: str, record: Callable[[Change, Migration, str], None]) -> None:
        run(stored, count=lambda text: query(text, "Count the rows a migration changes"),
            execute=lambda text: command(text, "Database User or Table Ingestor", "Migrate stored rows"),
            record=record, dry_run=False, echo=echo)

    return migrate
