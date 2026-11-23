"""Immutable evidence for mutable facts whose source order is not yet established.

These are not replacement canonical rows. Missing source revisions and identity
links remain unknown; readers must not turn arrival order into source authority.
"""

from __future__ import annotations

from typing import Any

FAMILIES = (
    "requests", "tool_invocations", "sessions", "agents", "session_usage",
    "session_processes", "session_prompts", "skill_uses", "file_write_events",
    "context_events", "session_loaded_files", "session_context_items",
)
# An empty table is the layout marker: unlike a maintenance row it cannot expire.
CURRENT_STORE = "aictl_current_store_v1"
COMPANIONS = frozenset(family + "_observations" for family in FAMILIES)
# Tables and stored functions: since layout 2 a logical table is a function over node tables.
LAYOUT_QUERY = (".show databases entities | where EntityType in ('Table', 'Function')"
                " | project DatabaseName, TableName=EntityName")


def has_current_store(names: set[str]) -> bool:
    return CURRENT_STORE in names and not names.intersection(COMPANIONS)


def retains_unresolved_facts(store: Any) -> bool:
    return getattr(store, "streams_observations", False) is True and getattr(store, "current_history", False) is not True


def table_name(family: str) -> str:
    if family not in FAMILIES:
        raise ValueError(f"Unknown observation family: {family}")
    return family + "_observations"


class UnresolvedObservationsError(RuntimeError):
    def __init__(self, families: tuple[str, ...], *, reason: str = "source identity/revision is unresolved"):
        self.families = families
        super().__init__(
            "Canonical results are incomplete: unresolved source identity/revision in "
            + ", ".join(table_name(family) for family in families)
            + f" ({reason}). Observations are retained; arrival order has not been used to guess totals."
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": str(self),
            "incomplete": True,
            "unresolved_families": list(self.families),
            "reason": "unresolved_observations",
            "retryable": False,
        }
