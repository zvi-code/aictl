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
from ..utils import write_safe, estimate_tokens, encode_scope, wrap_deployed, merge_json_block

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
                fp = root / ".windsurfrules"
                content = wrap_deployed(combined, src)
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})
        else:
            # Sub-scope → .windsurf/rules/{scope}.md with YAML frontmatter
            if combined:
                safe = encode_scope(src).replace("--", "-")
                fp = rules / f"{safe}.md"
                glob = f"{src}/**"
                body = f'---\ntrigger: always\npaths:\n  - "{glob}"\n---\n\n' + wrap_deployed(combined, src)
                if not dry_run:
                    write_safe(fp, body)
                results.append({"path": str(fp), "tokens": estimate_tokens(body)})

    if resolved.mcp_servers:
        fp = root / ".windsurf" / "mcp.json"
        content = merge_json_block(fp, "mcpServers", resolved.mcp_servers) if not dry_run else json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    return results


GITIGNORE = [".windsurfrules", ".windsurf/rules/", ".windsurf/mcp.json", ".ai-deployed/"]
