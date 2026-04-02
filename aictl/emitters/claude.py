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
from ..utils import merge_json_block, emit_file
from ._helpers import (
    emit_root_scope, emit_sub_scope, emit_capabilities,
    emit_mcp_servers, emit_settings, emit_ignores,
)

NAME = "claude"


def _paths_frontmatter(glob: str) -> str:
    return f'---\npaths:\n  - "{glob}"\n---\n\n'


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    tool = root / ".claude"

    for scope in resolved.scopes:
        if scope.is_root:
            emit_root_scope(
                scope, base_path=root / "CLAUDE.md",
                profile_path=root / "CLAUDE.local.md",
                resolved=resolved, dry_run=dry_run, results=results,
            )
        else:
            emit_sub_scope(
                scope, rules_dir=tool / "rules", ext=".md",
                frontmatter_fn=_paths_frontmatter,
                dry_run=dry_run, results=results,
            )

    emit_capabilities(resolved, {
        "command": lambda n: tool / "commands" / f"{n}.md",
        "skill": lambda n: tool / "skills" / n / "SKILL.md",
    }, dry_run, results)

    emit_mcp_servers(root / ".mcp.json", "mcpServers", resolved, dry_run, results)

    emit_settings(tool / "settings.local.json", resolved, dry_run, results)

    # --- LSP → .lsp.json (claude-only) ---
    if resolved.lsp_servers:
        fp = root / ".lsp.json"
        content = merge_json_block(fp, None, resolved.lsp_servers) if not dry_run else json.dumps(resolved.lsp_servers, indent=2) + "\n"
        emit_file(fp, content, dry_run, results)

    emit_ignores(root / ".claudeignore", resolved, dry_run, results)

    return results


GITIGNORE = [
    "CLAUDE.md", "CLAUDE.local.md",
    ".claude/rules/", ".claude/commands/", ".claude/skills/",
    ".claude/settings.local.json",
    ".mcp.json", ".lsp.json", ".claudeignore", ".ai-deployed/",
]
