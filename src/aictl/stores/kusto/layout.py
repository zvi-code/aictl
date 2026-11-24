"""The layout of the stored data: its version, what it stays compatible with, and how it changed.

Bump ``LAYOUT_VERSION`` on every change to tables, columns, keys or the meaning of stored
values, and add a line to ``CHANGES``:

- An additive change (a new table or column that old rows simply lack, a new key next to
  the old one, a reader that accepts both) bumps only ``LAYOUT_VERSION``.
- A change that makes old rows wrong or counted twice (a key change, a changed type or
  meaning, a removed writer whose rows remain) also sets ``COMPATIBLE_SINCE = LAYOUT_VERSION``
  and marks its line ``breaks=True``. Stored rows are never converted: a node on an older
  incompatible layout is reset (``aictl db reset``) and reads its session files again.

Since layout 3 each node has its own tables (see ``nodes.py``), and the layout is recorded
and checked per node: a node checks and upgrades only its own tables, and another node on
an older or newer layout is not an error for it. Data without a recorded version counts as layout 0.

The fingerprint: ``FINGERPRINT`` is ``fingerprint()`` of the table definitions; after a
change to ``tables.py`` or ``otel.py`` set it to the value that
``python -c "from aictl.stores.kusto.layout import fingerprint; print(fingerprint())"`` prints.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any

from ..base import StoreConfigurationError

LAYOUT_VERSION = 7
COMPATIBLE_SINCE = 7
# The layout that gave each node its own tables. The database record carries it.
NODE_TABLES_SINCE = 3
# sha256 of the table definitions, see fingerprint(). A guard test compares it.
FINGERPRINT = "43222dba5e8f271fcc39ac564ec3ec32cc334b3b51c1bcafabba891a2f2d7ca8"


@dataclass(frozen=True)
class Change:
    version: int
    reason: str
    breaks: bool


CHANGES: tuple[Change, ...] = (
    Change(
        1,
        "requests: a model call is stored once. Before, the agent-team scan stored a second copy of "
        "each subagent call (source claude-code-jsonl) and a call reported by both telemetry and the "
        "transcript was stored under two keys; every reader summed both copies.",
        breaks=True,
    ),
    Change(
        2,
        "agents: keyed by (session_id, agent_id), with a tombstone, the folder, branch and worktree the "
        "agent ran in, and observed_at (the time completed and ended_at were observed; the latest "
        "observation wins). agents_text: keyed by session_id too. sessions: resumed_from, the session a "
        "resumed or forked session's file replays. Before, an agent id copied into a resumed session "
        "settled under whichever session was written last.",
        breaks=True,
    ),
    Change(
        3,
        "Each node writes its own tables (requests__<node key>, ...); a stored function named like each "
        "table reads all nodes. Layout, data epoch, migration and reset are per node. The migration copies "
        "each node's rows out of the shared tables, verifies them, and keeps the shared tables as legacy__*.",
        breaks=True,
    ),
    Change(
        4,
        "context_lists: the items of each distinct list of tools, skills, custom agents or MCP instructions, "
        "stored once per node under list_id (a hash of the list). session_context_items holds one pointer row "
        "per announcement of such a list instead of one row per item: name \"list:\" + list_id, with the "
        "announcement's ts and the sums of its items. Rows written before stay one row per item and are read "
        "as they are; readers expand pointers into items. An aictl of layout 3 shows a pointer as one item "
        "named list:<id> that has the list's total.",
        breaks=False,
    ),
    Change(
        5,
        "session_digests: keyed by agent too (agent_id, \"\" for the main agent), so a subagent's compaction summary "
        "and todo lists are kept; one row per version (a todo list per list sent, task_change per TaskCreate or "
        "TaskUpdate call); a text over large_payload_bytes keeps a preview and its whole text in file_blobs under "
        "text_hash (365 days by default, was 24 hours in text_payloads, where two sessions' summaries could "
        "overwrite each other); event_key links a summary to its context_events row, whose summary_kind and "
        "summary_seq link back. A Claude Code todo_list row of seq 0 written before is the last list seen. "
        "file_write_events: agent_id, prompt_id, turn_index, mechanism, actor, lines_added, lines_removed, "
        "before/after hash, bytes and source of each memory change; Copilot store_memory and vote_memory and the "
        "VS Code memory tool are rows under copilot-memory:// and vscode-memory:// paths; a Claude Code hook "
        "row and its transcript row share one key. Rows written before have these columns empty. "
        "context_events: kinds rewind_point, checkpoint, truncation, memory_recall, instruction_update, "
        "tool_baseline, context_reset and context_query, with checkpoint_no, message_id, files_count, lines, "
        "dropped and preserved counts, path, tool_call_id, turn, content_hash and detail; a Claude Code "
        "compaction is keyed by its session too (a fork that rewrote the line's session id owns it as well; "
        "a transcript imported again stores its compactions once more under the new key). file_history: rows "
        "for the files of each rewind point, with session_id, source_event_id (the rewind point's message id), "
        "origin, mechanism, version, state and line counts. context_events kinds config.* (session_start, "
        "session_resume, model_change, mode_change, permissions_change, managed_override, feature_flags, "
        "assignment_context, subagent_configured, context_changed, launch_flags): the settings a session ran "
        "under, with the reported fields in detail; sessions written before have none.",
        breaks=False,
    ),
    Change(
        6,
        "requests and tool_invocations: each node table has a materialized view of the current row of each key "
        "per hour of the row's time (requests_current__<node key>, tool_invocations_current__<node key>), read through "
        "the functions requests_current and tool_invocations_current; the requests views read them. A node of an "
        "older layout has no such view, and a tombstone it stored before November 2026 carries only the key, which "
        "a current view cannot place in time: such a node is reset.",
        breaks=True,
    ),
    Change(
        7,
        "Every column has the Kusto type of what it holds: each point in time is a UTC datetime (ts, started_at, "
        "ended_at, mtime, *_at, ... were real epoch seconds), each flag a bool (is_error, completed, is_sidechain, "
        "estimated, removed, truncated, ... were long 0/1), the JSON details that views read as structure dynamic "
        "(events.detail, events_text.detail, context_events.detail, file_write_events.detail, "
        "data_quality_status.detail, metrics.tags, system_snapshots.node_health_counters were JSON text), and "
        "OTELPayloads.ChunkNo and ChunkCount long. A column cannot change its type in place, and rows of the old "
        "types cannot be read by the views of this layout. tool_invocations: is_test_run, test_label, failed and "
        "is_edit, what the board's Testing, Errors and Loops panels read of a call, set at ingest. session_prompts, "
        "skill_uses and file_write_events: a current view each, like requests and tool_invocations. agents_text and "
        "session_turns: a tombstone column _deleted. New columns: requests.api_call_id, session_steps.prompt_id, "
        "turn_request_links.prompt_id, session_prompts.prompt_id, skill_uses.tool_call_id and prompt_id, "
        "session_commits.basis, source_event_id, agent_id and prompt_id, sessions.merged_into (set on tombstones only). "
        "tool_invocations.request_id (long, always 0) is dropped. The tables that nothing wrote or read back are removed: "
        "tool_invocation_coverage, tool_invocation_sizes, files_text, projects, and the *_observations and "
        "*_observations_text tables of an older aictl, file_history_text and processes; a reset drops their node "
        "tables and stored functions. One data point is one row: session_step_text, events_text, hook_calls_text "
        "and memory_snapshots_text are gone, their text is session_steps.text, events.full_detail, "
        "hook_calls.command, output and full_payload, and memory_snapshots.content, null while text is not kept.",
        breaks=True,
    ),
)


def fingerprint() -> str:
    """A hash of every table name, column name and type, key and version column aictl defines."""
    from .otel import TABLES as OTEL_TABLES
    from .tables import TABLES

    spec = {
        "tables": {name: {"columns": [list(c) for c in table.columns], "key": list(table.key),
                          "version": table.version, "tombstone": table.tombstone}
                   for name, table in sorted(TABLES.items())},
        "otel": {table.name: [[c.name, c.kusto_type] for c in table.columns]
                 for table in sorted(OTEL_TABLES, key=lambda t: t.name)},
    }
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()


@dataclass(frozen=True)
class StoredLayout:
    """What the ``schema_version`` registry says about one node (or, before layout 2, the database)."""

    version: int
    compatible_since: int
    data_epoch: str = ""
    aictl_version: str = ""
    written_at: str = ""
    # How the current data epoch began: new, reset, migrate or upgrade. A node whose restart
    # state has no recorded epoch keeps that state only if the epoch kept older data.
    origin: str = ""
    migrations_done: frozenset[str] = field(default_factory=frozenset)

    @property
    def epoch_kept_data(self) -> bool:
        return self.origin in ("migrate", "upgrade")


UNVERSIONED = StoredLayout(0, 0)

# Verdicts
NEW = "new"            # no aictl data: create, record a new epoch
CURRENT = "current"    # stored layout is this one, or a newer one this code still reads
UPGRADE = "upgrade"    # stored layout is older and compatible: widen, record this version
RESET = "reset"        # stored layout is older and incompatible: the node's data is deleted and read again
NEWER = "newer"        # the database was written by a newer aictl that this one cannot read

COMPATIBLE = frozenset({NEW, CURRENT, UPGRADE})


def breaking_changes(stored_version: int) -> list[Change]:
    """The breaking changes after *stored_version*."""
    return [c for c in CHANGES if stored_version < c.version <= LAYOUT_VERSION and c.breaks]


def assess(stored: StoredLayout | None, *, has_data: bool) -> str:
    """The verdict on *stored*."""
    if stored is None:
        if not has_data:
            return NEW
        stored = UNVERSIONED
    if stored.compatible_since > LAYOUT_VERSION:
        return NEWER
    if not breaking_changes(stored.version):
        return UPGRADE if stored.version < LAYOUT_VERSION else CURRENT
    return RESET


def describe(stored: StoredLayout | None) -> str:
    if stored is None:
        return "none (no aictl data)"
    return str(stored.version) if stored.version else "0 (no version recorded)"


def changelog_lines(changes: list[Change] | tuple[Change, ...] = CHANGES) -> list[str]:
    lines = []
    for change in changes:
        tags = []
        if change.breaks:
            tags.append("breaks compatibility: reset")
        else:
            tags.append("additive")
        lines.append(f"  layout {change.version} ({', '.join(tags)}): {change.reason}")
    return lines


def target_options(cluster: str, database: str) -> str:
    return f" --kusto-cluster {cluster} --kusto-database {database}" if cluster else ""


def message(verdict: str, stored: StoredLayout | None, *, cluster: str, database: str, node: str = "") -> str:
    """What to do about *verdict*. With *node*, the verdict is about that node's tables only."""
    where = f"{database} on {cluster}" if cluster else database
    whose = f"The aictl data of node {node} in {where}" if node else f"The aictl data in {where}"
    found = stored or UNVERSIONED
    target = target_options(cluster, database)
    head = (f"{whose} has layout {describe(found)}; this aictl writes layout {LAYOUT_VERSION} "
            f"and reads layouts {COMPATIBLE_SINCE} to {LAYOUT_VERSION}.")
    if verdict == NEWER:
        return (f"{whose} was written by a newer aictl: layout {found.version}, readable only by "
                f"code that understands layout {found.compatible_since} or newer (written by aictl "
                f"{found.aictl_version or 'unknown'}). This aictl writes layout {LAYOUT_VERSION}.\n"
                "Upgrade aictl on this node (aictl reinstall, or pipx upgrade aictl) and start it again. "
                "Do not delete the stored data: newer nodes are using it.")
    lines = "\n".join(changelog_lines(breaking_changes(found.version)))
    reset = f"aictl db reset --node {node}{target}" if node else f"aictl db reset{target}"
    return (f"{head}\nThese changes since layout {found.version} make the stored rows unreadable for this aictl:\n"
            f"{lines}\nStored rows are not converted: the stored data must be deleted before this aictl can write.\n"
            f"To delete it:  {reset}\n"
            "After the reset the node reads its session files again (the transcripts and stores of every tool "
            "still on its disk) and rebuilds its history from them. Data whose session files are gone, telemetry "
            "received before the reset, and data older than the retention period cannot be rebuilt.")


class StoreLayoutError(StoreConfigurationError):
    """The stored data has a layout this aictl must not write to as it is."""

    def __init__(self, verdict: str, stored: StoredLayout | None, *, cluster: str = "", database: str = "",
                 node: str = ""):
        self.verdict = verdict
        self.stored = stored
        self.cluster = cluster
        self.database = database
        self.node = node
        super().__init__(message(verdict, stored, cluster=cluster, database=database, node=node))


class LayoutResetRequired(StoreLayoutError):
    pass


class LayoutNewerError(StoreLayoutError):
    pass


ERRORS: dict[str, type[StoreLayoutError]] = {
    RESET: LayoutResetRequired, NEWER: LayoutNewerError,
}


def rule_violations(changes: tuple[Change, ...] = CHANGES, *, latest: int = LAYOUT_VERSION,
                    compatible_since: int = COMPATIBLE_SINCE) -> list[str]:
    """What the changelog gets wrong against the rules in this module's docstring."""
    problems = []
    versions = [c.version for c in changes]
    if not versions or versions != sorted(set(versions)) or versions[-1] != latest:
        problems.append(f"CHANGES must list each version once, in order, ending at LAYOUT_VERSION {latest}")
    breaking = [c.version for c in changes if c.breaks]
    if breaking and compatible_since != max(breaking):
        problems.append(f"COMPATIBLE_SINCE {compatible_since} must be the newest breaking version {max(breaking)}")
    return problems


def summary(verdict: str, stored: StoredLayout | None, epoch: str, warning: str | None = None,
            nodes: list[dict] | None = None, legacy: list[dict] | None = None) -> dict[str, Any]:
    """The ``layout`` object of the store health and the start banner.

    ``nodes``: every node the database has tables or layout rows for, with whether aggregate
    reads include it and why not; ``excluded``: how many are left out.
    """
    nodes = nodes or []
    return {
        "version": LAYOUT_VERSION,
        "compatible_since": COMPATIBLE_SINCE,
        "data_epoch": epoch,
        "stored_version": None if stored is None else stored.version,
        "verdict": verdict,
        "warning": warning,
        "nodes": nodes,
        "excluded": sum(1 for node in nodes if not node.get("included")),
        "legacy_tables": legacy or [],
    }
