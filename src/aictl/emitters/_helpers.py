# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Shared helpers for emitter modules.

Extracts common patterns (root/sub-scope emission, capabilities,
MCP servers, settings, ignores) so each tool-specific emitter only
needs to supply its file paths and formatting details.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path

from .._hook_owner import canonicalize_hook_events, merge_aictl_hooks
from ..resolver import Resolved
from ..utils import (
    compose_with_overlay,
    emit_file,
    encode_scope,
    extract_overlay,
    merge_ignore_file,
    merge_json_block,
    read_json_or_fail,
    wrap_deployed,
)

# ── Scope helpers ───────────────────────────────────────────────────


def emit_root_scope(
    scope,
    *,
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
        emit_file(
            profile_path,
            compose_with_overlay(
                f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}",
                overlay,
                src,
                resolved.profile,
            ),
            dry_run,
            results,
        )


def emit_sub_scope(
    scope,
    *,
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
        dry_run,
        results,
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
    existing = read_json_or_fail(fp, force=force) if not dry_run else {}
    # Per-event hook merge (shared with `aictl hooks install`): strip prior
    # aictl-managed entries from *every* event (so a hook removed from
    # .context.toml is cleaned up on redeploy), keep user hooks, append our
    # freshly-tagged rules. Event keys are canonicalised so a ``preToolUse``
    # typo in .context.toml deploys as ``PreToolUse`` and actually fires.
    merged = merge_aictl_hooks(existing.get("hooks", {}), canonical_hook_rules(resolved.hooks or {}))
    if merged:
        existing["hooks"] = merged
    elif "hooks" in existing:
        del existing["hooks"]
    if resolved.permissions:
        existing.setdefault("permissions", {})["allow"] = resolved.permissions
    if resolved.env:
        existing["env"] = resolved.env
    for key, value in resolved.settings.items():
        existing[key] = value
    emit_file(fp, json.dumps(existing, indent=2) + "\n", dry_run, results)


def canonical_hook_rules(hooks: dict[str, list]) -> dict[str, list]:
    """Copy *hooks* with event keys mapped to the tools' PascalCase enum names."""
    # Lazy import: commands.integrations owns the event catalogues and pulls
    # in click; emitters must stay importable without it at module load.
    from ..commands.integrations import GEMINI_HOOK_EVENTS, HOOK_EVENTS, VSCODE_HOOK_EVENTS

    known = [*HOOK_EVENTS, *GEMINI_HOOK_EVENTS, *VSCODE_HOOK_EVENTS]
    return canonicalize_hook_events({e: list(rules) for e, rules in hooks.items()}, known)


def emit_ignores(
    fp: Path,
    resolved: Resolved,
    dry_run: bool,
    results: list,
) -> None:
    """Emit ignore patterns to an ignore file."""
    if not resolved.ignores:
        return
    content = merge_ignore_file(fp, resolved.ignores) if not dry_run else "\n".join(resolved.ignores) + "\n"
    emit_file(fp, content, dry_run, results)
