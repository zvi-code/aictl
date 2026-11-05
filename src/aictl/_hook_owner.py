# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Ownership marker for hook entries managed by aictl.

Every hook rule produced by aictl carries a top-level ``_aictl_owner``
key set to :data:`_AICTL_OWNER_MARKER`. This lets install / uninstall
/ deploy reliably distinguish aictl-managed entries from user hooks,
without brittle substring matches against the command string.

Legacy entries (installed before the marker existed) are still
recognized via substring heuristics as a one-time migration path.
Once the marker is present, it is authoritative — a rule tagged with
a *different* owner is treated as not-ours, even if its command
contains ``/api/hooks``. The identification itself lives in the stdlib-only
``hook_removal`` so removal works when aictl is broken; it is re-exported here.
"""

from __future__ import annotations

from collections.abc import Iterable

from .hook_removal import OWNER_MARKER as _AICTL_OWNER_MARKER
from .hook_removal import is_aictl_rule as _is_aictl_hook
from .hook_removal import is_legacy_rule as _is_legacy_aictl_hook
from .hook_removal import strip_rules as strip_aictl_hooks

__all__ = [
    "_AICTL_OWNER_MARKER",
    "_is_aictl_hook",
    "_is_legacy_aictl_hook",
    "canonicalize_hook_events",
    "merge_aictl_hooks",
    "strip_aictl_hooks",
]


def merge_aictl_hooks(existing_hooks: object, new_rules_by_event: dict[str, list[dict]]) -> dict[str, list]:
    """Strip prior aictl rules from *existing_hooks*, then append *new_rules_by_event*.

    This is the ONE merge used by install / redeploy for every tool: user
    rules are preserved per event, stale aictl rules are purged from all
    events, and the new rules are stamped with the owner marker so the next
    merge recognises them. A malformed (non-list) existing value under an
    event stays as it is, and that one event gets no rule from us. Replacing it would lose it for good on uninstall.
    """
    hooks, _ = strip_aictl_hooks(existing_hooks)
    tagged = _tag_hooks({e: [dict(r) for r in rules] for e, rules in new_rules_by_event.items()})
    for event, rules in tagged.items():
        current = hooks.get(event, [])
        if isinstance(current, list):
            hooks[event] = [*current, *rules]
    return hooks


def canonicalize_hook_events(hooks_by_event: dict[str, list], known_events: Iterable[str]) -> dict[str, list]:
    """Rename case-variant event keys to their canonical spelling.

    Every tool's hook enum is PascalCase (``PreToolUse``); a ``.context.toml``
    author who writes ``preToolUse`` gets a rule that is deployed verbatim
    and never fires. Keys are matched case-insensitively against
    *known_events*; unknown names pass through unchanged (they may be a
    newer event this aictl does not know yet). Colliding spellings merge.
    """
    canon = {name.lower(): name for name in known_events}
    out: dict[str, list] = {}
    for event, rules in hooks_by_event.items():
        name = canon.get(str(event).lower(), event)
        if name in out and isinstance(out[name], list) and isinstance(rules, list):
            out[name] = out[name] + list(rules)
        else:
            out[name] = rules
    return out


def _tag_hooks(hooks_by_event: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Stamp every rule dict in *hooks_by_event* with the aictl owner marker.

    Mutates the rule dicts in place (idempotent) and returns the same
    mapping for convenience. Non-dict entries are left untouched.
    """
    for rules in hooks_by_event.values():
        if not isinstance(rules, list):
            continue
        for rule in rules:
            if isinstance(rule, dict):
                rule["_aictl_owner"] = _AICTL_OWNER_MARKER
    return hooks_by_event
