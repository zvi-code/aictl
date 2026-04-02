# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for GitHub Copilot CLI + VS Code."""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import merge_json_block, emit_file
from ._helpers import (
    emit_root_scope, emit_sub_scope, emit_capabilities,
    emit_mcp_servers, emit_ignores,
)

NAME = "copilot"


def _applyto_frontmatter(glob: str) -> str:
    return f'---\napplyTo: "{glob}"\n---\n\n'


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    gh = root / ".github"

    for scope in resolved.scopes:
        if scope.is_root:
            emit_root_scope(
                scope, base_path=gh / "copilot-instructions.md",
                profile_path=root / "AGENTS.md",
                resolved=resolved, dry_run=dry_run, results=results,
            )
        else:
            emit_sub_scope(
                scope, rules_dir=gh / "instructions", ext=".instructions.md",
                frontmatter_fn=_applyto_frontmatter,
                dry_run=dry_run, results=results,
            )

    emit_capabilities(resolved, {
        "agent": lambda n: gh / "agents" / f"{n}.agent.md",
        "skill": lambda n: gh / "skills" / n / "SKILL.md",
        "command": lambda n: gh / "prompts" / f"{n}.prompt.md",
    }, dry_run, results)

    emit_mcp_servers(root / ".copilot-mcp.json", "mcpServers", resolved, dry_run, results)
    emit_mcp_servers(root / ".vscode" / "mcp.json", "servers", resolved, dry_run, results)

    # --- Hooks → .github/hooks/hooks.json (copilot-only) ---
    if resolved.hooks:
        fp = gh / "hooks" / "hooks.json"
        emit_file(fp, merge_json_block(fp, "hooks", resolved.hooks) if not dry_run else json.dumps({"hooks": resolved.hooks}, indent=2) + "\n", dry_run, results)

    emit_ignores(gh / "copilot-ignore", resolved, dry_run, results)

    return results


GITIGNORE = [
    ".github/copilot-instructions.md", ".github/instructions/",
    ".github/agents/", ".github/skills/", ".github/prompts/",
    ".github/hooks/", ".github/copilot-ignore",
    "AGENTS.md", ".copilot-mcp.json", ".vscode/mcp.json", ".ai-deployed/",
]
