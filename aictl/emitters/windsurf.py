# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for Windsurf IDE.

.windsurfrules                root base + profile instructions
.windsurf/rules/{scope}.md   sub-scope instructions (YAML frontmatter paths)
.windsurf/mcp.json            MCP servers
"""

from __future__ import annotations

from pathlib import Path

from ..resolver import Resolved
from ..utils import wrap_deployed, emit_file
from ._helpers import emit_sub_scope, emit_mcp_servers

NAME = "windsurf"


def _windsurf_frontmatter(glob: str) -> str:
    return f'---\ntrigger: always\npaths:\n  - "{glob}"\n---\n\n'


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []

    for scope in resolved.scopes:
        if scope.is_root:
            # Root → .windsurfrules (single project-wide rules file)
            combined = scope.base
            if scope.profile_text:
                combined += "\n\n" + scope.profile_text
            if combined:
                emit_file(root / ".windsurfrules", wrap_deployed(combined, scope.rel_path), dry_run, results)
        else:
            emit_sub_scope(
                scope, rules_dir=root / ".windsurf" / "rules", ext=".md",
                frontmatter_fn=_windsurf_frontmatter,
                dry_run=dry_run, results=results,
            )

    emit_mcp_servers(root / ".windsurf" / "mcp.json", "mcpServers", resolved, dry_run, results)

    return results


GITIGNORE = [".windsurfrules", ".windsurf/rules/", ".windsurf/mcp.json", ".ai-deployed/"]
