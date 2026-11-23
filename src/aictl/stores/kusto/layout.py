"""The layout of the stored data: its version, what it stays compatible with, and how it changed.

Bump ``LAYOUT_VERSION`` on every change to tables, columns, keys or the meaning of stored
values, and add a line to ``CHANGES``:

- An additive change (a new table or column that old rows simply lack, a new key next to
  the old one, a reader that accepts both) bumps only ``LAYOUT_VERSION``.
- A change that makes old rows wrong or counted twice (a key change, a changed meaning,
  a removed writer whose rows remain) also sets ``COMPATIBLE_SINCE = LAYOUT_VERSION`` and
  marks its line ``breaks=True``. Give it a ``migration`` (see ``migrations.py``) that
  upgrades the stored rows, so the history is kept. Without one, the only way forward is
  to delete the stored data, and history whose session files are gone is lost.
- Once ``GA_LAYOUT_VERSION`` is set, every breaking change after it must have a migration.

Since layout 3 each node has its own tables (see ``nodes.py``), and the layout is recorded
and checked per node: a node checks and upgrades only its own tables, and another node on
an older or newer layout is not an error for it. A migration is either database-wide (it
runs once, for all nodes; ``node_tables`` is one) or per node (it runs on one node's tables
when that node starts). Data without a recorded version counts as layout 0.

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

LAYOUT_VERSION = 5
COMPATIBLE_SINCE = 3
# The first layout released as generally available. From then on a breaking change needs a migration.
GA_LAYOUT_VERSION: int | None = None
# The layout that gave each node its own tables. The database record carries it.
NODE_TABLES_SINCE = 3
# sha256 of the table definitions, see fingerprint(). A guard test compares it.
FINGERPRINT = "f7b196414f20068497190bb347a09eaa7e2006a3dcfed53f17107fecac4aa06d"


@dataclass(frozen=True)
class Change:
    version: int
    reason: str
    breaks: bool
    migration: str | None = None  # the name of a step in migrations.MIGRATIONS


CHANGES: tuple[Change, ...] = (
    Change(
        1,
        "requests: a model call is stored once. Before, the agent-team scan stored a second copy of "
        "each subagent call (source claude-code-jsonl) and a call reported by both telemetry and the "
        "transcript was stored under two keys; every reader summed both copies.",
        breaks=True,
        migration="requests_single_copy",
    ),
    Change(
        2,
        "agents: keyed by (session_id, agent_id), with a tombstone, the folder, branch and worktree the "
        "agent ran in, and observed_at (the time completed and ended_at were observed; the latest "
        "observation wins). agents_text: keyed by session_id too. sessions: resumed_from, the session a "
        "resumed or forked session's file replays. Before, an agent id copied into a resumed session "
        "settled under whichever session was written last.",
        breaks=True,
        migration="agents_by_session",
    ),
    Change(
        3,
        "Each node writes its own tables (requests__<node key>, ...); a stored function named like each "
        "table reads all nodes. Layout, data epoch, migration and reset are per node. The migration copies "
        "each node's rows out of the shared tables, verifies them, and keeps the shared tables as legacy__*.",
        breaks=True,
        migration="node_tables",
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
        "summary_seq link back. A Claude Code todo_list row of seq 0 written before is the last list seen.",
        breaks=False,
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
MIGRATE = "migrate"    # stored layout is older and incompatible; a migration exists for every step
RESET = "reset"        # stored layout is older and incompatible; some step has no migration
NEWER = "newer"        # the database was written by a newer aictl that this one cannot read

COMPATIBLE = frozenset({NEW, CURRENT, UPGRADE})


def breaking_changes(stored_version: int, settled: frozenset[str] = frozenset()) -> list[Change]:
    """The breaking changes after *stored_version*, without those whose migration is *settled*."""
    return [c for c in CHANGES if stored_version < c.version <= LAYOUT_VERSION and c.breaks
            and not (c.migration and c.migration in settled)]


def assess(stored: StoredLayout | None, *, has_data: bool, settled: frozenset[str] = frozenset()) -> str:
    """The verdict on *stored*. *settled*: database-wide migrations already done, which no node repeats."""
    if stored is None:
        if not has_data:
            return NEW
        stored = UNVERSIONED
    if stored.compatible_since > LAYOUT_VERSION:
        return NEWER
    changes = breaking_changes(stored.version, settled)
    if not changes:
        return UPGRADE if stored.version < LAYOUT_VERSION else CURRENT
    return MIGRATE if all(c.migration for c in changes) else RESET


def describe(stored: StoredLayout | None) -> str:
    if stored is None:
        return "none (no aictl data)"
    return str(stored.version) if stored.version else "0 (no version recorded)"


def changelog_lines(changes: list[Change] | tuple[Change, ...] = CHANGES) -> list[str]:
    lines = []
    for change in changes:
        tags = []
        if change.breaks:
            tags.append("breaks compatibility")
            tags.append(f"migration: {change.migration}" if change.migration else "no migration")
        else:
            tags.append("additive")
        lines.append(f"  layout {change.version} ({', '.join(tags)}): {change.reason}")
    return lines


def target_options(cluster: str, database: str) -> str:
    return f" --kusto-cluster {cluster} --kusto-database {database}" if cluster else ""


def message(verdict: str, stored: StoredLayout | None, *, cluster: str, database: str, node: str = "",
            settled: frozenset[str] = frozenset()) -> str:
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
    changes = breaking_changes(found.version, settled)
    lines = "\n".join(changelog_lines(changes))
    if verdict == MIGRATE:
        return (f"{head}\nThese changes since layout {found.version} make the stored rows wrong for this aictl:\n"
                f"{lines}\nA migration exists for each of them; it upgrades the stored rows and keeps the history.\n"
                f"To see what it changes:  aictl db migrate --dry-run{target}\n"
                f"To run it:               aictl db migrate{target}\n"
                "Stop the other aictl writers of this database first.")
    missing = [c for c in changes if not c.migration]
    reset = f"aictl db reset --node {node}{target}" if node else f"aictl db reset{target}"
    return (f"{head}\nThese changes since layout {found.version} make the stored rows wrong for this aictl:\n"
            f"{lines}\nNo migration exists for: "
            + ", ".join(f"layout {c.version}" for c in missing)
            + ". The stored data must be deleted before this aictl can write to it.\n"
            f"To delete it:  {reset}\n"
            "After the reset every node re-imports its history from the session files still on its disk. "
            "Data whose session files are gone, and data older than the retention period, cannot be rebuilt.")


class StoreLayoutError(StoreConfigurationError):
    """The stored data has a layout this aictl must not write to as it is."""

    def __init__(self, verdict: str, stored: StoredLayout | None, *, cluster: str = "", database: str = "",
                 node: str = "", settled: frozenset[str] = frozenset()):
        self.verdict = verdict
        self.stored = stored
        self.cluster = cluster
        self.database = database
        self.node = node
        super().__init__(message(verdict, stored, cluster=cluster, database=database, node=node, settled=settled))


class LayoutMigrationRequired(StoreLayoutError):
    pass


class LayoutResetRequired(StoreLayoutError):
    pass


class LayoutNewerError(StoreLayoutError):
    pass


class MigrationInProgress(StoreConfigurationError):
    """Another node runs the database-wide migration; this node must not write until it is done."""


ERRORS: dict[str, type[StoreLayoutError]] = {
    MIGRATE: LayoutMigrationRequired, RESET: LayoutResetRequired, NEWER: LayoutNewerError,
}


def rule_violations(changes: tuple[Change, ...] = CHANGES, *, ga: int | None = GA_LAYOUT_VERSION,
                    latest: int = LAYOUT_VERSION, compatible_since: int = COMPATIBLE_SINCE) -> list[str]:
    """What the changelog gets wrong against the rules in this module's docstring."""
    problems = []
    versions = [c.version for c in changes]
    if not versions or versions != sorted(set(versions)) or versions[-1] != latest:
        problems.append(f"CHANGES must list each version once, in order, ending at LAYOUT_VERSION {latest}")
    breaking = [c.version for c in changes if c.breaks]
    if breaking and compatible_since != max(breaking):
        problems.append(f"COMPATIBLE_SINCE {compatible_since} must be the newest breaking version {max(breaking)}")
    problems += [f"layout {c.version} breaks compatibility after the GA layout {ga} and declares no migration; "
                 "write one in migrations.py, or make the change additive"
                 for c in changes if ga is not None and c.version > ga and c.breaks and not c.migration]
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
