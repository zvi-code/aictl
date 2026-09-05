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
contains ``/api/hooks``.
"""

from __future__ import annotations

from collections.abc import Iterable

_AICTL_OWNER_MARKER = "aictl.managed"

# Legacy substring markers used for pre-marker hook entries.
_LEGACY_AICTL_HOOK_MARKERS = ("/api/hooks", "aictl.hook_handler")


def _is_legacy_aictl_hook(hook: dict) -> bool:
    """Substring heuristic covering hook entries installed before the marker existed.

    Detects three generations of hook format:
    - Current command shape: ``python -m aictl.hook_handler --event ...``
    - Previous inline: ``python -c "... /api/hooks ..."``
    - Legacy flat: ``curl ... /api/hooks ...``
    """
    # Current nested format: {"matcher": ..., "hooks": [{"type": "command", "command": "..."}]}
    if "hooks" in hook and isinstance(hook["hooks"], list):
        return any(any(m in str(h.get("command", "")) for m in _LEGACY_AICTL_HOOK_MARKERS) for h in hook["hooks"])
    # Old flat format: {"type": "command", "command": "..."}
    cmd = str(hook.get("command", ""))
    return any(m in cmd for m in _LEGACY_AICTL_HOOK_MARKERS)


def _is_aictl_hook(hook: dict) -> bool:
    """Return True if the hook entry is owned by aictl.

    The ``_aictl_owner`` marker is authoritative when present: a rule
    tagged with a different value is *not* ours, even if its command
    string happens to contain an aictl-looking substring. Only when
    the marker is absent do we fall back to legacy substring matching
    for migration of pre-marker installs.
    """
    if not isinstance(hook, dict):
        return False
    if "_aictl_owner" in hook:
        return hook.get("_aictl_owner") == _AICTL_OWNER_MARKER
    return _is_legacy_aictl_hook(hook)


def strip_aictl_hooks(hooks_by_event: object) -> tuple[dict[str, list], int]:
    """Return ``(hooks, removed)`` with every aictl-owned rule removed.

    Walks *every* event key present (not just a caller-supplied list) so
    rules installed under an event that has since been dropped from the
    catalogue are cleaned up too. Non-dict input yields ``{}``; a non-list
    event value (a hand-edited ``"PreToolUse": {...}``) is preserved
    untouched rather than iterated character by character. Events whose
    list becomes empty are deleted.
    """
    if not isinstance(hooks_by_event, dict):
        return {}, 0
    out: dict[str, list] = {}
    removed = 0
    for event, rules in hooks_by_event.items():
        if not isinstance(rules, list):
            out[event] = rules  # leave malformed shapes alone
            continue
        kept = [h for h in rules if not _is_aictl_hook(h)]
        removed += len(rules) - len(kept)
        if kept:
            out[event] = kept
    return out, removed


def merge_aictl_hooks(existing_hooks: object, new_rules_by_event: dict[str, list[dict]]) -> dict[str, list]:
    """Strip prior aictl rules from *existing_hooks*, then append *new_rules_by_event*.

    This is the ONE merge used by install / redeploy for every tool: user
    rules are preserved per event, stale aictl rules are purged from all
    events, and the new rules are stamped with the owner marker so the next
    merge recognises them. A malformed (non-list) existing value under an
    event we need to write is replaced by a list — the malformed value is
    unusable by the tool anyway and would otherwise be corrupted by
    ``extend``.
    """
    hooks, _ = strip_aictl_hooks(existing_hooks)
    tagged = _tag_hooks({e: [dict(r) for r in rules] for e, rules in new_rules_by_event.items()})
    for event, rules in tagged.items():
        current = hooks.get(event)
        if not isinstance(current, list):
            current = []
        current.extend(rules)
        hooks[event] = current
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
