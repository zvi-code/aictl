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
        return any(
            any(m in str(h.get("command", "")) for m in _LEGACY_AICTL_HOOK_MARKERS)
            for h in hook["hooks"]
        )
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
