# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for Claude Code.

CLAUDE.md              root base
CLAUDE.local.md        root profile + overlay
.claude/rules/*.md     sub-scope base + profile (glob-scoped)
.claude/commands/*.md   commands (root only)
.claude/skills/*/SKILL.md skills (root only)
.mcp.json              MCP (root only)
"""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import (
    wrap_deployed, compose_with_overlay, extract_overlay,
    write_safe, estimate_tokens, encode_scope,
    merge_json_block, merge_ignore_file, emit_file,
)

NAME = "claude"


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []

    for scope in resolved.scopes:
        src = scope.rel_path
        combined = scope.base
        if scope.profile_text:
            combined += "\n\n" + scope.profile_text

        if scope.is_root:
            # Root base → CLAUDE.md
            if scope.base:
                emit_file(root / "CLAUDE.md", wrap_deployed(scope.base, src), dry_run, results)

            # Root profile → CLAUDE.local.md (with overlay)
            if scope.profile_text and resolved.profile:
                fp = root / "CLAUDE.local.md"
                overlay = "" if dry_run else extract_overlay(fp)
                emit_file(fp, compose_with_overlay(
                    f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}",
                    overlay, src, resolved.profile,
                ), dry_run, results)
        else:
            # Sub-scope → .claude/rules/{scope}.md (base + profile merged)
            if combined:
                safe = encode_scope(src).replace("--", "-")
                glob = f"{src}/**"
                emit_file(root / ".claude" / "rules" / f"{safe}.md",
                          f'---\npaths:\n  - "{glob}"\n---\n\n' + wrap_deployed(combined, src),
                          dry_run, results)

    # --- Capabilities (root only) ---
    for cap in resolved.capabilities:
        if cap.kind == "command":
            emit_file(root / ".claude" / "commands" / f"{cap.name}.md", cap.content, dry_run, results)
        elif cap.kind == "skill":
            emit_file(root / ".claude" / "skills" / cap.name / "SKILL.md", cap.content, dry_run, results)

    # --- MCP ---
    if resolved.mcp_servers:
        fp = root / ".mcp.json"
        content = merge_json_block(fp, "mcpServers", resolved.mcp_servers) if not dry_run else json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n"
        emit_file(fp, content, dry_run, results)

    # --- Hooks + settings + permissions + env → .claude/settings.local.json ---
    has_settings_data = (
        resolved.hooks or resolved.settings or resolved.permissions or resolved.env
    )
    if has_settings_data:
        fp = root / ".claude" / "settings.local.json"
        existing = _load_settings(fp) if not dry_run else {}
        if resolved.hooks:
            existing["hooks"] = resolved.hooks
        if resolved.permissions:
            existing.setdefault("permissions", {})["allow"] = resolved.permissions
        if resolved.env:
            existing["env"] = resolved.env
        # Arbitrary settings: merge top-level keys
        for key, value in resolved.settings.items():
            existing[key] = value
        emit_file(fp, json.dumps(existing, indent=2) + "\n", dry_run, results)

    # --- LSP → .lsp.json ---
    if resolved.lsp_servers:
        fp = root / ".lsp.json"
        content = merge_json_block(fp, None, resolved.lsp_servers) if not dry_run else json.dumps(resolved.lsp_servers, indent=2) + "\n"
        emit_file(fp, content, dry_run, results)

    # --- Ignores → .claudeignore ---
    if resolved.ignores:
        fp = root / ".claudeignore"
        content = merge_ignore_file(fp, resolved.ignores) if not dry_run else "\n".join(resolved.ignores) + "\n"
        emit_file(fp, content, dry_run, results)

    return results


def _load_settings(path: Path) -> dict:
    """Load existing settings JSON, preserving unmanaged keys."""
    if path.is_file():
        try:
            return json.loads(path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {}


GITIGNORE = [
    "CLAUDE.md", "CLAUDE.local.md",
    ".claude/rules/", ".claude/commands/", ".claude/skills/",
    ".claude/settings.local.json",
    ".mcp.json", ".lsp.json", ".claudeignore", ".ai-deployed/",
]
