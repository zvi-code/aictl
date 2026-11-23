"""Migrations: named steps that upgrade stored rows across a layout change that breaks compatibility.

A step is database-wide (it runs once for the whole database, before any node writes) or
per node (it runs on one node's tables, when that node starts). A statement step is a list
of statements; each has a query that counts the rows it would change and a management
command that changes them. Statements must be idempotent and safe to resume: a statement
run again after an interruption finds nothing left to change. A step that completes is
recorded in ``schema_version`` (kind ``migration``) and is not run again.

Rows are changed the way the writers change them: a new version of the row (a newer ``_v``),
or a tombstone (``_deleted = true``). ``.set-or-append`` matches columns by position, so
every statement appends ``T | take 0 | union (...)``: the union puts the table's own columns
first, in the table's order, matched by name and type. Statements read a table as
``table('T')``: once the stored function ``T`` exists, that still reaches the table.

``node_tables`` (layout 3) moves the shared tables to one table set per node; see
:func:`node_tables` for the algorithm.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from . import nodes as N
from .client import Result, kql_literal, quote
from .layout import (
    CHANGES,
    COMPATIBLE_SINCE,
    LAYOUT_VERSION,
    NODE_TABLES_SINCE,
    Change,
    MigrationInProgress,
    StoredLayout,
)


@dataclass(frozen=True)
class Statement:
    description: str
    count_query: str
    command: str
    table: str = ""  # the table the command appends to


@dataclass(frozen=True)
class Migration:
    name: str
    summary: str
    plan: Callable[..., list[Statement]] | None = None
    cannot_repair: str = ""
    scope: str = "database"  # or "node"
    apply: Callable[[Context], int] | None = None  # a step that is not a list of statements


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


class MigrationVerificationError(RuntimeError):
    """A copy does not match its source. Nothing was switched; the source tables are unchanged."""


def append(table: str, query: str, lets: str = "", read: str | None = None) -> str:
    """Append *query*'s rows to *table*, columns matched by name and type. *lets* go first."""
    return f".set-or-append {quote(table)} <| {lets}{read or quote(table)} | take 0 | union ({query})"


def widen_command(table: str) -> str | None:
    """Add the columns this aictl has and the stored table lacks, before rows are appended to it.

    A table an older aictl created can lack a column the appended rows carry, and the append is
    then refused. ``.create-merge`` only adds columns; it removes and changes none.
    """
    from . import schema as S
    from .tables import TABLES

    if table not in TABLES:
        return None  # a node's own table: created with every column
    columns = ", ".join(f"{quote(name)}:{kind}" for name, kind in S.logical_columns(table))
    return f".create-merge table {quote(table)} ({columns})"


def shared(name: str) -> str:
    """The physical table *name*, also when a stored function of that name exists."""
    return f"table({json.dumps(name)})"


# ── requests_single_copy (layout 1) ─────────────────────────────────

_USED = {"project": "string", "node_id": "string", "_v": "datetime", "id": "long", "dedup_key": "string", "_deleted": "bool", "source": "string", "session_id": "string",
         "input_tokens": "long", "output_tokens": "long", "cache_read_tokens": "long", "cache_creation_tokens": "long",
         "ts": "real", "duration_ms": "real", "ttft_ms": "real", "prompt_id": "string", "pid": "long",
         "finish_reason": "string"}
# A dry run reads tables an old aictl created, before they are widened: a column they lack
# reads as null. After widening, each column_ifexists is the column itself.
_COLUMNS = ", ".join(f"{quote(c)}=column_ifexists('{c}', {chr(39) * 2 if t == 'string' else f'{t}(null)'})"
                     for c, t in _USED.items())


def _latest_requests(read: str) -> str:
    return (
        f"{read} | extend {_COLUMNS}"
        " | extend fact_key=iff(isempty(dedup_key), tostring(id), dedup_key)"
        " | summarize arg_max(_v, *) by ['project'], node_id, fact_key"
        " | where not(coalesce(_deleted, false))"
    )


def _pairs(read: str) -> str:
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
        f"let live_rows = {_latest_requests(read)};"
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


def _requests_single_copy(table: str = "requests", read: str | None = None) -> list[Statement]:
    """The statements on the requests table *table*, read as *read* (default: ``table('requests')``)."""
    read = read or shared(table)
    copies = f"{_latest_requests(read)} | where source == 'claude-code-jsonl'"
    pairs = _pairs(read)
    return [
        Statement(
            "Delete the request copies the agent-team scan stored (source claude-code-jsonl); "
            "the transcript reader stores the same calls",
            f"{copies} | count",
            append(table, f"{copies} | extend _deleted=true, _v=now() | project-away fact_key", read=read),
            table,
        ),
        Statement(
            "Copy timing, prompt id, pid and finish reason from a telemetry report to the transcript row "
            "of the same call, where the transcript row has none",
            f"{pairs} {_transcript_to_merge()} | count",
            append(table, f"{_transcript_to_merge()} | {_MERGED} | extend _v=now()"
                          " | project-away fact_key, o_duration, o_ttft, o_prompt, o_pid, o_finish", pairs + " ",
                   read=read),
            table,
        ),
        Statement(
            "Delete the telemetry row of a call the transcript also stored (same node, session and token "
            "counts, paired in time order)",
            f"{pairs} {_telemetry_to_delete()} | count",
            append(table, f"{_telemetry_to_delete()} | extend _deleted=true, _v=now() | project-away fact_key",
                   pairs + " ", read=read),
            table,
        ),
    ]


# ── agents_by_session (layout 2) ────────────────────────────────────

_LIVE = "| extend _deleted=column_ifexists('_deleted', bool(null)) | where not(coalesce(_deleted, false))"


def _agents_by_session(agents: str | None = None, agents_text: str | None = None,
                       sessions: str | None = None) -> list[Statement]:
    """The statements; each table is read as ``table('T')`` unless another expression is given."""
    agents, agents_text, sessions = agents or shared("agents"), agents_text or shared("agents_text"), \
        sessions or shared("sessions")
    # The session each agent id showed under before layout 2: the newest version by the old key.
    shown = (
        f"let shown = {agents} {_LIVE}"
        " | summarize arg_max(_v, session_id) by ['project'], node_id, agent_id"
        " | where isnotempty(session_id) | project ['project'], node_id, agent_id, shown_session=session_id;"
    )
    # Under the new key, older versions of an agent written under another session would show again.
    resurfaced = (
        f"{agents} | extend _deleted=column_ifexists('_deleted', bool(null))"
        " | summarize arg_max(_v, *) by ['project'], node_id, session_id, agent_id"
        " | where not(coalesce(_deleted, false))"
        " | lookup kind=inner shown on ['project'], node_id, agent_id"
        " | where session_id != shown_session | project-away shown_session"
    )
    unscoped_text = (
        f"let scoped = {agents_text} | extend session_id=column_ifexists('session_id', '')"
        " | where isnotempty(session_id) | distinct ['project'], node_id, agent_id;"
    )
    text_to_scope = (
        f"{agents_text} | extend session_id=column_ifexists('session_id', '')"
        " | summarize arg_max(_v, *) by ['project'], node_id, agent_id, session_id | where isempty(session_id)"
        " | join kind=leftanti scoped on ['project'], node_id, agent_id"
        " | lookup kind=inner shown on ['project'], node_id, agent_id"
    )
    live_sessions = (
        f"let live_sessions = {sessions} | summarize arg_max(_v, *) by ['project'], node_id, session_id"
        " | where not(coalesce(_deleted, false));"
    )
    # A row only the agent-team scan wrote (it took a subagent's folder as the session's), where the
    # same session also has a row from evidence of its own transcript or process under another project.
    scan_copies = (
        "live_sessions | where source == 'claude-code-jsonl'"
        " | join kind=leftsemi (live_sessions | where source != 'claude-code-jsonl' | distinct node_id, session_id)"
        " on node_id, session_id"
    )
    return [
        Statement(
            "Give each agent task text the session of its agent (the text rows had only the agent id)",
            f"{shown} {unscoped_text} {text_to_scope} | count",
            append("agents_text", f"{text_to_scope} | extend session_id=shown_session, _v=now()"
                                  " | project-away shown_session", f"{shown} {unscoped_text} ", read=agents_text),
            "agents_text",
        ),
        Statement(
            "Agents are now keyed by session and agent id: delete the older versions of an agent written "
            "under another session, so each agent shows under the session it showed under before",
            f"{shown} {resurfaced} | count",
            append("agents", f"{resurfaced} | extend _deleted=true, _v=now()", f"{shown} ", read=agents),
            "agents",
        ),
        Statement(
            "Delete the session rows the agent-team scan wrote under a subagent's folder, where the session "
            "has its own row under another project",
            f"{live_sessions} {scan_copies} | count",
            append("sessions", f"{scan_copies} | extend _deleted=true, _v=now()", f"{live_sessions} ",
                   read=sessions),
            "sessions",
        ),
    ]


# ── node_tables (layout 3) ──────────────────────────────────────────


@dataclass
class Context:
    """What a database-wide step that is not a list of statements works with."""

    command: Callable[[str], Any]
    query: Callable[[str], Result]
    # write(kind, step, detail, node_id, version, compatible_since): append one registry row
    write: Callable[..., None]
    echo: Callable[[str], None]
    dry_run: bool
    state: Any  # schema.LayoutState
    node_id: str
    epoch: str
    sync: Callable[[], Any] = lambda: None
    take_over: bool = False
    slice_days: int = 1
    tables: Mapping[str, Any] | None = None  # logical -> tables.Table, for the retention of the copies
    planned: list[str] = field(default_factory=list)


LOCK = "node_tables/lock"
SWITCH = "node_tables/switch"
RENAME = "node_tables/rename"
_MOD = 1_000_000_007


def copy_step(table: str, key: str) -> str:
    return f"node_tables/copy/{table}/{key}"


def node_predicate(node_id: str) -> str:
    return "isempty(node_id)" if not node_id else f"node_id == {kql_literal(node_id, 'string')}"


def census_query(table: str) -> str:
    return (f"{shared(table)} | extend node_id=tostring(column_ifexists('node_id', ''))"
            " | summarize n=count() by node_id | order by node_id asc")


def slices_query(table: str, node_id: str, daily: bool, days: int = 1) -> str:
    base = f"{shared(table)} | where {node_predicate(node_id)}"
    if not daily:
        return f"{base} | summarize n=count(), newest=max(ingestion_time())"
    return (f"{base} | summarize n=count(), newest=max(ingestion_time()) by slice_start=bin(ingestion_time(), {days}d)"
            " | order by slice_start asc")


def checksum_query(source: str, node_id: str, columns: list[str]) -> str:
    parts = ", ".join(f"tostring(column_ifexists({json.dumps(c)}, ''))" for c in columns)
    return (f"{source} | where {node_predicate(node_id)}"
            f" | summarize n=count(), h=sum(hash(strcat_delim('|', '', {parts}), {_MOD}))")


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        value = datetime.fromtimestamp(value, timezone.utc)
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value.isoformat() + "Z"
    return str(value)


def copy_commands(table: str, target: str, node_id: str, slices: list[dict], days: int = 1) -> list[str]:
    """One ``.set-or-append`` per slice of ingestion time, each with the slice's latest ingestion time
    as the extent creation time, so the soft-delete period of the copy counts from about when the
    source rows arrived (never earlier: the copy is never deleted before its source would be)."""
    commands = []
    for item in slices:
        if not item.get("n"):
            continue
        where = f"{shared(table)} | where {node_predicate(node_id)}"
        if "slice_start" in item:
            day = _iso(item["slice_start"])
            where += (" | where isnull(ingestion_time())" if day is None
                      else f" | where bin(ingestion_time(), {days}d) == datetime({day})")
        created = _iso(item.get("newest"))
        props = f" with (creationTime={json.dumps(created)})" if created else ""
        commands.append(f".set-or-append {quote(target)}{props} <| {quote(target)} | take 0 | union ({where})")
    return commands


def _verify_columns(table: str) -> list[str]:
    from .tables import TABLES

    spec = TABLES.get(table)
    if spec is None:
        return ["node_id"]
    columns = [*spec.key, spec.version]
    if spec.tombstone:
        columns.append(spec.tombstone)
    return list(dict.fromkeys(columns))


def _first(result: Result) -> dict:
    rows = result.dicts()
    return rows[0] if rows else {}


def lock_owner(rows: list[dict]) -> str | None:
    """The node that runs the node_tables migration: the last to take it over, else the first to start it."""
    locks = sorted((r for r in rows if r.get("kind") == "layout" and r.get("step") == LOCK),
                   key=lambda r: (str(r.get("written_at") or ""), str(r.get("node_id") or "")))
    taken = [r for r in locks if str(r.get("detail") or "").startswith("taken over")]
    chosen = taken[-1] if taken else (locks[0] if locks else None)
    return None if chosen is None else str(chosen.get("node_id") or "")


def node_tables(ctx: Context) -> int:
    """Move every shared table to one table per node. Non-destructive, resumable, verified.

    1. Lock: a ``schema_version`` layout row (step ``node_tables/lock``) names the node that
       runs the migration. It carries layout 2, so an aictl of layout 1 refuses to start
       from then on. Another node that finds the lock refuses to write and says who holds
       it; ``--take-over`` moves the lock (after the holder was stopped).
    2. Copy: for each shared table and each node ID in it (rows without one go to the node
       key ``unattributed``), create the node table with the shared table's columns and copy
       the node's rows in slices of ingestion time, each slice with its own extent creation
       time. A copy that was interrupted is cleared and made again.
    3. Verify each copy: row count and a checksum of the key and version columns, source
       against copy. On a difference the copy is cleared and the migration stops; nothing
       was switched and the shared tables are unchanged.
    4. Switch: record the database record and a layout row (same data epoch) per node,
       then generate the stored functions. From now on reads go to the node tables.
    5. Keep: rename the shared tables to ``legacy__T`` in one command, folder aictl/legacy.
       They are dropped only by ``aictl db migrate --drop-legacy``.
    Each step and each copy is recorded when done, and a second run skips it.
    """
    from . import schema as S
    from .tables import TABLES

    state, echo = ctx.state, ctx.echo
    rows = list(state.rows)
    done = S.done_steps(rows)
    owner = lock_owner(rows)
    if owner is not None and owner != ctx.node_id and not ctx.take_over and not ctx.dry_run:
        raise MigrationInProgress(
            f"Node {owner} runs the node_tables migration of this database. This node does not write until it is "
            "done. If that node stopped, run it again there, or here with: aictl db migrate --take-over")
    if not ctx.dry_run and (owner != ctx.node_id or ctx.take_over):
        detail = f"taken over by {ctx.node_id} from {owner}" if ctx.take_over and owner else f"started by {ctx.node_id}"
        ctx.write("layout", LOCK, detail, ctx.node_id, LAYOUT_VERSION, COMPATIBLE_SINCE)
        rows = ctx.query(S.LAYOUT_QUERY).dicts()
        if lock_owner(rows) != ctx.node_id:
            raise MigrationInProgress(f"Node {lock_owner(rows)} started the node_tables migration at the same time; "
                                      "it runs it. This node does not write until it is done.")
    configured = ctx.tables or TABLES
    have = {name: dict(columns) for name, columns in state.have.items()}
    moving = sorted(state.legacy)
    plan: list[tuple[str, str, int]] = []  # (table, node_id, rows)
    for table in moving:
        # Always count: TotalRowCount leaves out rows still in the row store (streaming
        # ingestion), so a table it reports empty can hold every row of the history.
        for row in ctx.query(census_query(table)).dicts():
            if int(row.get("n") or 0):
                plan.append((table, str(row.get("node_id") or ""), int(row["n"])))
    node_ids = sorted({ident for _, ident, _ in plan})
    echo(f"  {len(moving)} shared tables, {len(plan)} copies for {len(node_ids)} node(s): "
         + ", ".join(f"{ident or '(no node id)'} -> {N.node_key(ident)}" for ident in node_ids))

    # The node tables: the logical columns, then any column only the shared table has.
    by_node: dict[str, dict[str, tuple[tuple[str, str], ...]]] = {}
    for table, ident, _ in plan:
        logical = S.logical_columns(table) if table in TABLES else ()
        extra = tuple((c, t) for c, t in have.get(table, {}).items() if c not in dict(logical))
        by_node.setdefault(ident, {})[table] = (*logical, *extra)
    if not ctx.dry_run:
        for ident, specs in sorted(by_node.items()):
            pending = {t: c for t, c in specs.items() if copy_step(t, N.node_key(ident)) not in done}
            if pending:
                S.create_node_tables(lambda text, *_: ctx.command(text), ident, pending, have)
        periods = {N.physical(t, N.node_key(ident)): (configured[t].retention_timespan, "")
                   for t, ident, _ in plan if t in configured}
        details = S.inspect(lambda text, *_: ctx.command(text), lambda text, *_: ctx.query(text), ctx.node_id).details
        for text in S.retention_commands(periods, details):
            ctx.command(text)

    total = 0
    for table, ident, count in plan:
        key = N.node_key(ident)
        target = N.physical(table, key)
        step = copy_step(table, key)
        if step in done:
            echo(f"  {table} / {ident or '(no node id)'}: copied before")
            continue
        spec = configured.get(table)
        daily = spec is None or spec.retention_period_hours > 24
        slices = ctx.query(slices_query(table, ident, daily, ctx.slice_days)).dicts()
        commands = copy_commands(table, target, ident, slices, ctx.slice_days)
        echo(f"  {table} / {ident or '(no node id)'}: {count:,} rows -> {target} in {len(commands)} slice(s)")
        if ctx.dry_run:
            for text in commands:
                echo(f"    {text}")
            ctx.planned.extend(commands)
            total += count
            continue
        if int(_first(ctx.query(f"{quote(target)} | count")).get("Count") or 0):
            ctx.command(f".clear table {quote(target)} data")  # an interrupted copy; the source is untouched
        for text in commands:
            ctx.command(text)
        columns = _verify_columns(table)
        source = _first(ctx.query(checksum_query(shared(table), ident, columns)))
        copy = _first(ctx.query(checksum_query(quote(target), ident, columns)))
        if (source.get("n"), source.get("h")) != (copy.get("n"), copy.get("h")):
            ctx.command(f".clear table {quote(target)} data")
            detail = (f"failed: {table} of {ident or '(no node id)'}: source {source.get('n')} rows checksum "
                      f"{source.get('h')}, copy {copy.get('n')} rows checksum {copy.get('h')}")
            ctx.write("migration", step, detail, ctx.node_id, LAYOUT_VERSION, COMPATIBLE_SINCE)
            raise MigrationVerificationError(
                f"The copy of {table} for node {ident or '(no node id)'} does not match its source (source "
                f"{source.get('n')} rows, copy {copy.get('n')} rows, checksums {source.get('h')} and "
                f"{copy.get('h')}). Nothing was switched; the shared tables are unchanged. Stop every aictl writer "
                "of this database and run aictl db migrate again.")
        ctx.write("migration", step, f"done: {copy.get('n')} rows, checksum {copy.get('h')}", ctx.node_id,
                  LAYOUT_VERSION, COMPATIBLE_SINCE)
        total += int(copy.get("n") or 0)

    switch = [f"(database record, then a layout {LAYOUT_VERSION} row for each of {len(node_ids)} node(s), "
              "then the stored functions)"]
    if SWITCH in done:
        echo("  switch: done before")
    elif ctx.dry_run:
        echo(f"  switch: {switch[0]}")
    else:
        if S.database_record(rows) is None:
            ctx.write("database", "node_tables", "node tables", "", LAYOUT_VERSION, NODE_TABLES_SINCE)
        recorded = {str(r.get("node_id") or "") for r in S._plain_layouts(rows)
                    if int(r.get("version") or 0) >= LAYOUT_VERSION and r.get("data_epoch") == ctx.epoch}
        for ident in node_ids:
            if ident not in recorded:
                ctx.write("layout", "", "migrate", ident, LAYOUT_VERSION, COMPATIBLE_SINCE)
        ctx.write("migration", SWITCH, f"done: {len(node_ids)} nodes", ctx.node_id, LAYOUT_VERSION, COMPATIBLE_SINCE)
    if not ctx.dry_run:
        ctx.sync()  # the functions exist before the shared tables leave their names

    rename = rename_commands(moving)
    if ctx.dry_run:
        for text in rename:
            echo(f"  keep: {text}")
        ctx.planned.extend(rename)
    elif moving:
        for text in rename:
            ctx.command(text)
        ctx.write("migration", RENAME, f"done: {len(moving)} tables", ctx.node_id, LAYOUT_VERSION, COMPATIBLE_SINCE)
    return total


def rename_commands(tables: list[str]) -> list[str]:
    """Rename the shared tables in one atomic command, then file them under aictl/legacy."""
    if not tables:
        return []
    commands = [".rename tables " + ", ".join(f"{quote(N.legacy_name(t))} = {quote(t)}" for t in tables)]
    for table in tables:
        commands.append(f".alter table {quote(N.legacy_name(table))} folder {json.dumps(N.LEGACY_FOLDER)}")
        commands.append(f".alter table {quote(N.legacy_name(table))} docstring "
                        + json.dumps(json.dumps({"aictl": "legacy shared table", "table": table,
                                                 "drop": "aictl db migrate --drop-legacy"}, separators=(",", ":"))))
    return commands


MIGRATIONS: dict[str, Migration] = {
    "agents_by_session": Migration(
        "agents_by_session",
        "Key agents by session and agent id",
        _agents_by_session,
        cannot_repair=(
            "An agent, request or tool call that an older aictl put under the wrong session (a resumed "
            "session's copy read before the original) stays there: re-import those sessions with "
            "'aictl db reimport-sessions --resumed'. A session whose only row the agent-team scan wrote "
            "keeps that row's folder until its transcript is read again."
        ),
    ),
    "requests_single_copy": Migration(
        "requests_single_copy",
        "Keep one request row per model call",
        _requests_single_copy,
        cannot_repair=(
            "A call whose telemetry and transcript token counts differ stays counted twice; "
            "calls that only telemetry reported stay as they are."
        ),
    ),
    "node_tables": Migration(
        "node_tables",
        "Give each node its own tables, copied from the shared ones and verified; keep the shared ones as legacy__*",
        apply=node_tables,
    ),
}


def pending(stored: StoredLayout, scope: str | None = None) -> list[tuple[Change, Migration]]:
    """The steps from *stored* to this layout, oldest first, without those already done."""
    steps = []
    for change in CHANGES:
        if change.version > stored.version and change.migration and change.migration not in stored.migrations_done:
            migration = MIGRATIONS[change.migration]
            if scope is None or migration.scope == scope:
                steps.append((change, migration))
    return steps


def run(
    stored: StoredLayout,
    *,
    count: Callable[[str], Result],
    execute: Callable[[str], object],
    record: Callable[[Change, Migration, str], None],
    dry_run: bool,
    echo: Callable[[str], None] = lambda _: None,
    scope: str | None = None,
    context: Context | None = None,
    tables: Mapping[str, str] | None = None,
) -> list[StepResult]:
    """Run (or with *dry_run* only count) the pending steps. A failed step is recorded and raised.

    *context* serves steps that are not statements; *tables* maps logical to physical names
    for the statements of a per-node step.
    """
    results = []
    for change, migration in pending(stored, scope):
        result = StepResult(change.version, migration.name, "planned" if dry_run else "done")
        results.append(result)
        echo(f"layout {change.version}: {migration.name} - {migration.summary}")
        total = 0
        if migration.apply is not None:
            if context is None:
                raise RuntimeError(f"{migration.name} needs the database context")
            try:
                total = migration.apply(context)
            except Exception as exc:
                result.status, result.error = "failed", str(exc)
                raise
            result.statements.append(StatementResult(migration.summary, "\n".join(context.planned), total))
        else:
            assert migration.plan is not None
            statements = migration.plan()
            widened: set[str] = set()
            for statement in statements:
                try:
                    rows = count(statement.count_query).dicts()
                    affected = int(next(iter(rows), {}).get("Count", 0) or 0)
                    echo(f"  {statement.description}: {affected:,} rows")
                    widen = None if statement.table in widened else widen_command(statement.table)
                    if dry_run:
                        if widen and affected:
                            echo(f"    {widen}")
                        echo(f"    {statement.command}")
                    elif affected:
                        if widen:
                            execute(widen)
                        widened.add(statement.table)
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


class Runner:
    """The ``migrate`` object ``ensure_schema`` runs: database-wide steps first, then this node's."""

    def __init__(self, client, database: str, echo: Callable[[str], None] = lambda _: None, *,
                 take_over: bool = False, slice_days: int = 1, tables: Mapping[str, Any] | None = None):
        from .schema import management, querying

        self.database_name = database
        self.echo = echo
        self.take_over = take_over
        self.slice_days = slice_days
        self.tables = tables
        self._command, self._query = management(client, database), querying(client, database)

    def command(self, text: str) -> Any:
        return self._command(text, "Database User or Table Ingestor", "Migrate stored rows")

    def query(self, text: str) -> Result:
        return self._query(text, "Count the rows a migration changes")

    def writer(self, epoch: str) -> Callable[..., None]:
        from .schema import record_command

        def write(kind: str, step: str, detail: str, node_id: str, version: int = LAYOUT_VERSION,
                  compatible_since: int = COMPATIBLE_SINCE) -> None:
            self._command(record_command(version=version, compatible_since=compatible_since, epoch=epoch,
                                         node_id=node_id, kind=kind, step=step, detail=detail),
                          "Database User or Table Ingestor", "Record the data layout")

        return write

    def context(self, state, epoch: str, node_id: str, *, dry_run: bool, sync=lambda: None) -> Context:
        return Context(self.command, self.query, self.writer(epoch), self.echo, dry_run, state, node_id, epoch, sync,
                       self.take_over, self.slice_days, self.tables)

    def database(self, state, epoch: str, node_id: str, *, sync=lambda: None, dry_run: bool = False) -> list[StepResult]:
        write = self.writer(epoch)
        stored = state.shared or StoredLayout(0, 0, data_epoch=epoch)
        return run(stored, count=self.query, execute=self.command,
                   record=lambda change, migration, detail: write("migration", migration.name, detail, node_id,
                                                                  change.version),
                   dry_run=dry_run, echo=self.echo, scope="database",
                   context=self.context(state, epoch, node_id, dry_run=dry_run, sync=sync))

    def node(self, stored: StoredLayout, epoch: str, node_id: str, tables: Mapping[str, str],
             record: Callable[[Change, Migration, str], None]) -> list[StepResult]:
        return run(stored, count=self.query, execute=self.command, record=record, dry_run=False, echo=self.echo,
                   scope="node", tables=tables)


def runner(client, database: str, echo: Callable[[str], None] = lambda _: None, **options) -> Runner:
    """The ``migrate`` object that ``ensure_schema`` runs."""
    return Runner(client, database, echo, **options)


def legacy_drop_command(tables: list[str]) -> str:
    return f".drop tables ({', '.join(quote(t) for t in sorted(tables))}) ifexists"

