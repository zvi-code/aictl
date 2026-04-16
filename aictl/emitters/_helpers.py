# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Shared helpers for emitter modules.

Extracts common patterns (root/sub-scope emission, capabilities,
MCP servers, settings, ignores) so each tool-specific emitter only
needs to supply its file paths and formatting details.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from ..resolver import Resolved
from ..utils import (
    wrap_deployed, compose_with_overlay, extract_overlay,
    encode_scope, merge_json_block, merge_ignore_file, emit_file,
    read_json_or_fail,
)
from .._hook_owner import _is_aictl_hook, _tag_hooks


# ── Scope helpers ───────────────────────────────────────────────────


def emit_root_scope(
    scope, *,
    base_path: Path,
    profile_path: Path,
    resolved: Resolved,
    dry_run: bool,
    results: list,
) -> None:
    """Emit root scope: base → *base_path*, profile → *profile_path* (with overlay).

    Used by emitters that write base and profile to separate files
    (claude, copilot, gemini).
    """
    src = scope.rel_path
    if scope.base:
        emit_file(base_path, wrap_deployed(scope.base, src), dry_run, results)
    if scope.profile_text and resolved.profile:
        overlay = "" if dry_run else extract_overlay(profile_path)
        emit_file(profile_path, compose_with_overlay(
            f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}",
            overlay, src, resolved.profile,
        ), dry_run, results)


def emit_sub_scope(
    scope, *,
    rules_dir: Path,
    ext: str,
    frontmatter_fn: Callable[[str], str],
    dry_run: bool,
    results: list,
) -> None:
    """Emit a sub-scope file with frontmatter.

    *frontmatter_fn(glob)* must return the complete frontmatter string
    including the trailing blank line separator.
    """
    src = scope.rel_path
    combined = scope.base
    if scope.profile_text:
        combined += "\n\n" + scope.profile_text
    if not combined:
        return
    safe = encode_scope(src).replace("--", "-")
    glob = f"{src}/**"
    emit_file(
        rules_dir / f"{safe}{ext}",
        frontmatter_fn(glob) + wrap_deployed(combined, src),
        dry_run, results,
    )


# ── Capability helpers ──────────────────────────────────────────────


def emit_capabilities(
    resolved: Resolved,
    cap_map: dict[str, Callable[[str], Path]],
    dry_run: bool,
    results: list,
) -> None:
    """Emit capabilities using *cap_map* ``{kind: name → Path}``."""
    for cap in resolved.capabilities:
        path_fn = cap_map.get(cap.kind)
        if path_fn:
            emit_file(path_fn(cap.name), cap.content, dry_run, results)


# ── JSON / config helpers ──────────────────────────────────────────


def emit_mcp_servers(
    fp: Path,
    merge_key: str,
    resolved: Resolved,
    dry_run: bool,
    results: list,
    *,
    force: bool = False,
) -> None:
    """Emit MCP server config by merging into existing JSON."""
    if not resolved.mcp_servers:
        return
    content = (
        merge_json_block(fp, merge_key, resolved.mcp_servers, force=force)
        if not dry_run
        else json.dumps({merge_key: resolved.mcp_servers}, indent=2) + "\n"
    )
    emit_file(fp, content, dry_run, results)


def emit_settings(
    fp: Path,
    resolved: Resolved,
    dry_run: bool,
    results: list,
    *,
    force: bool = False,
) -> None:
    """Emit hooks + settings + permissions + env to a settings JSON file."""
    has_data = resolved.hooks or resolved.settings or resolved.permissions or resolved.env
    if not has_data:
        return
    existing = _load_settings(fp, force=force) if not dry_run else {}
    # Per-event hook merge: always strip prior aictl-managed entries from
    # *every* event (so a hook removed from .context.toml is cleaned up on
    # redeploy), then append our freshly-tagged rules per event. User hooks
    # (without the marker) are preserved.
    existing_hooks = existing.get("hooks", {})
    if not isinstance(existing_hooks, dict):
        existing_hooks = {}
    tagged = _tag_hooks({e: list(rules) for e, rules in (resolved.hooks or {}).items()})
    touched = False
    for event, current in list(existing_hooks.items()):
        if not isinstance(current, list):
            continue
        cleaned = [h for h in current if not _is_aictl_hook(h)]
        if cleaned != current:
            touched = True
        if cleaned:
            existing_hooks[event] = cleaned
        else:
            del existing_hooks[event]
    for event, new_rules in tagged.items():
        current = existing_hooks.get(event, [])
        if not isinstance(current, list):
            current = []
        current.extend(new_rules)
        existing_hooks[event] = current
        touched = True
    if existing_hooks:
        existing["hooks"] = existing_hooks
    elif touched and "hooks" in existing:
        del existing["hooks"]
    if resolved.permissions:
        existing.setdefault("permissions", {})["allow"] = resolved.permissions
    if resolved.env:
        existing["env"] = resolved.env
    for key, value in resolved.settings.items():
        existing[key] = value
    emit_file(fp, json.dumps(existing, indent=2) + "\n", dry_run, results)


def _load_settings(path: Path, *, force: bool = False) -> dict:
    """Load existing settings JSON, preserving unmanaged keys.

    Raises :class:`aictl.utils.CorruptJSONError` when the file exists but is
    malformed and *force* is False.  When *force* is True a timestamped
    ``.bak`` of the corrupted original is written and an empty dict is
    returned so the caller can proceed with a clean write.
    """
    return read_json_or_fail(path, force=force)


def emit_ignores(
    fp: Path,
    resolved: Resolved,
    dry_run: bool,
    results: list,
) -> None:
    """Emit ignore patterns to an ignore file."""
    if not resolved.ignores:
        return
    content = (
        merge_ignore_file(fp, resolved.ignores)
        if not dry_run
        else "\n".join(resolved.ignores) + "\n"
    )
    emit_file(fp, content, dry_run, results)
