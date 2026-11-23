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

Data without a recorded version counts as layout 0.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any

from ..base import StoreConfigurationError

LAYOUT_VERSION = 1
COMPATIBLE_SINCE = 1
# The first layout released as generally available. From then on a breaking change needs a migration.
GA_LAYOUT_VERSION: int | None = None
# sha256 of the table definitions, see fingerprint(). A guard test compares it.
FINGERPRINT = "5d807c33a0b96842e5794af375c1286768036bcec1d0d9016e5788333301c802"


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
    """What the database's ``schema_version`` table says."""

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


def breaking_changes(stored_version: int) -> list[Change]:
    return [c for c in CHANGES if stored_version < c.version <= LAYOUT_VERSION and c.breaks]


def assess(stored: StoredLayout | None, *, has_data: bool) -> str:
    if stored is None:
        if not has_data:
            return NEW
        stored = UNVERSIONED
    if stored.compatible_since > LAYOUT_VERSION:
        return NEWER
    if stored.version >= COMPATIBLE_SINCE:
        return UPGRADE if stored.version < LAYOUT_VERSION else CURRENT
    return MIGRATE if all(c.migration for c in breaking_changes(stored.version)) else RESET


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


def message(verdict: str, stored: StoredLayout | None, *, cluster: str, database: str) -> str:
    where = f"{database} on {cluster}" if cluster else database
    found = stored or UNVERSIONED
    target = target_options(cluster, database)
    head = (f"The aictl data in {where} has layout {describe(found)}; this aictl writes layout {LAYOUT_VERSION} "
            f"and reads layouts {COMPATIBLE_SINCE} to {LAYOUT_VERSION}.")
    if verdict == NEWER:
        return (f"The aictl data in {where} was written by a newer aictl: layout {found.version}, readable only by "
                f"code that understands layout {found.compatible_since} or newer (written by aictl "
                f"{found.aictl_version or 'unknown'}). This aictl writes layout {LAYOUT_VERSION}.\n"
                "Upgrade aictl on this node (aictl reinstall, or pipx upgrade aictl) and start it again. "
                "Do not delete the stored data: newer nodes are using it.")
    changes = breaking_changes(found.version)
    lines = "\n".join(changelog_lines(changes))
    if verdict == MIGRATE:
        return (f"{head}\nThese changes since layout {found.version} make the stored rows wrong for this aictl:\n"
                f"{lines}\nA migration exists for each of them; it upgrades the stored rows and keeps the history.\n"
                f"To see what it changes:  aictl db migrate --dry-run{target}\n"
                f"To run it:               aictl db migrate{target}\n"
                "Stop the other aictl writers of this database first.")
    missing = [c for c in changes if not c.migration]
    return (f"{head}\nThese changes since layout {found.version} make the stored rows wrong for this aictl:\n"
            f"{lines}\nNo migration exists for: "
            + ", ".join(f"layout {c.version}" for c in missing)
            + ". The stored data must be deleted before this aictl can write to it.\n"
            f"To delete it:  aictl db reset{target}\n"
            "After the reset every node re-imports its history from the session files still on its disk. "
            "Data whose session files are gone, and data older than the retention period, cannot be rebuilt.")


class StoreLayoutError(StoreConfigurationError):
    """The stored data has a layout this aictl must not write to as it is."""

    def __init__(self, verdict: str, stored: StoredLayout | None, *, cluster: str = "", database: str = ""):
        self.verdict = verdict
        self.stored = stored
        self.cluster = cluster
        self.database = database
        super().__init__(message(verdict, stored, cluster=cluster, database=database))


class LayoutMigrationRequired(StoreLayoutError):
    pass


class LayoutResetRequired(StoreLayoutError):
    pass


class LayoutNewerError(StoreLayoutError):
    pass


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


def summary(verdict: str, stored: StoredLayout | None, epoch: str, warning: str | None = None) -> dict[str, Any]:
    """The ``layout`` object of the store health and the start banner."""
    return {
        "version": LAYOUT_VERSION,
        "compatible_since": COMPATIBLE_SINCE,
        "data_epoch": epoch,
        "stored_version": None if stored is None else stored.version,
        "verdict": verdict,
        "warning": warning,
    }
