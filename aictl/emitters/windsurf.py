# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for Windsurf IDE.

.windsurfrules                root base + profile instructions
.windsurf/rules/{scope}.md   sub-scope instructions (YAML frontmatter paths)
.windsurf/mcp.json            MCP servers
"""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import write_safe, estimate_tokens, encode_scope, wrap_deployed, merge_json_block, emit_file

NAME = "windsurf"


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    rules = root / ".windsurf" / "rules"

    for scope in resolved.scopes:
        src = scope.rel_path
        combined = scope.base
        if scope.profile_text:
            combined += "\n\n" + scope.profile_text

        if scope.is_root:
            # Root → .windsurfrules (single project-wide rules file)
            if combined:
                emit_file(root / ".windsurfrules", wrap_deployed(combined, src), dry_run, results)
        else:
            # Sub-scope → .windsurf/rules/{scope}.md with YAML frontmatter
            if combined:
                safe = encode_scope(src).replace("--", "-")
                glob = f"{src}/**"
                emit_file(rules / f"{safe}.md",
                          f'---\ntrigger: always\npaths:\n  - "{glob}"\n---\n\n' + wrap_deployed(combined, src),
                          dry_run, results)

    if resolved.mcp_servers:
        fp = root / ".windsurf" / "mcp.json"
        emit_file(fp, merge_json_block(fp, "mcpServers", resolved.mcp_servers) if not dry_run else json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n", dry_run, results)

    return results


GITIGNORE = [".windsurfrules", ".windsurf/rules/", ".windsurf/mcp.json", ".ai-deployed/"]
