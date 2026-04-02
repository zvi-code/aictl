# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for Gemini CLI.

GEMINI.md              root base
GEMINI.local.md        root profile + overlay
.gemini/rules/*.md     sub-scope base + profile (glob-scoped)
.gemini/commands/*.md   commands (root only)
.gemini/skills/*/SKILL.md skills (root only)
.mcp.json              MCP (root only)
"""

from __future__ import annotations

from pathlib import Path

from ..resolver import Resolved
from ._helpers import (
    emit_root_scope, emit_sub_scope, emit_capabilities,
    emit_mcp_servers, emit_settings, emit_ignores,
)

NAME = "gemini"


def _paths_frontmatter(glob: str) -> str:
    return f'---\npaths:\n  - "{glob}"\n---\n\n'


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    tool = root / ".gemini"

    for scope in resolved.scopes:
        if scope.is_root:
            emit_root_scope(
                scope, base_path=root / "GEMINI.md",
                profile_path=root / "GEMINI.local.md",
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

    emit_settings(tool / "settings.json", resolved, dry_run, results)

    emit_ignores(root / ".geminiignore", resolved, dry_run, results)

    return results


GITIGNORE = [
    "GEMINI.md", "GEMINI.local.md",
    ".gemini/rules/", ".gemini/commands/", ".gemini/skills/",
    ".gemini/settings.json",
    ".mcp.json", ".geminiignore", ".ai-deployed/",
]
