# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for GitHub Copilot CLI + VS Code.

Agents are emitted to **two** sibling locations because they target different
Copilot products:

* ``.github/agents/{n}.agent.md`` — GitHub Copilot Coding Agent personas
  (cloud PR bot).
* ``.github/chatmodes/{n}.chatmode.md`` — VS Code Copilot Chat custom modes
  (selectable in the chat mode picker).

Both come from the same ``agent`` capability in ``.context.toml``; the
importer dedupes them on read.
"""

from __future__ import annotations

import json
from pathlib import Path

from .._hook_owner import _tag_hooks
from ..resolver import Resolved
from ..utils import emit_file, merge_json_block
from ._helpers import (
    emit_capabilities,
    emit_ignores,
    emit_mcp_servers,
    emit_root_scope,
    emit_sub_scope,
)

NAME = "copilot"


def _applyto_frontmatter(glob: str) -> str:
    return f'---\napplyTo: "{glob}"\n---\n\n'


def _chatmode_content(name: str, body: str) -> str:
    """Wrap agent body with VS Code chatmode frontmatter."""
    # Strip any pre-existing frontmatter from the capability body so we don't
    # emit two frontmatter blocks stacked on each other.
    if body.startswith("---\n"):
        end = body.find("\n---", 4)
        if end > 0:
            body = body[end + 4 :].lstrip("\n")
    return f"---\ndescription: {name}\n---\n\n{body.rstrip()}\n"


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    gh = root / ".github"

    for scope in resolved.scopes:
        if scope.is_root:
            emit_root_scope(
                scope,
                base_path=gh / "copilot-instructions.md",
                profile_path=root / "AGENTS.md",
                resolved=resolved,
                dry_run=dry_run,
                results=results,
            )
        else:
            emit_sub_scope(
                scope,
                rules_dir=gh / "instructions",
                ext=".instructions.md",
                frontmatter_fn=_applyto_frontmatter,
                dry_run=dry_run,
                results=results,
            )

    emit_capabilities(
        resolved,
        {
            "agent": lambda n: gh / "agents" / f"{n}.agent.md",
            "skill": lambda n: gh / "skills" / n / "SKILL.md",
            "command": lambda n: gh / "prompts" / f"{n}.prompt.md",
        },
        dry_run,
        results,
    )

    # Also emit each agent as a VS Code chatmode so it appears in the chat mode
    # picker. Same content, VS-Code-specific frontmatter.
    for cap in resolved.capabilities:
        if cap.kind == "agent":
            fp = gh / "chatmodes" / f"{cap.name}.chatmode.md"
            emit_file(fp, _chatmode_content(cap.name, cap.content), dry_run, results)

    emit_mcp_servers(root / ".copilot-mcp.json", "mcpServers", resolved, dry_run, results)
    emit_mcp_servers(root / ".vscode" / "mcp.json", "servers", resolved, dry_run, results)

    # --- Hooks → .github/hooks/hooks.json (copilot-only) ---
    if resolved.hooks:
        fp = gh / "hooks" / "hooks.json"
        tagged = _tag_hooks({e: list(rules) for e, rules in resolved.hooks.items()})
        emit_file(
            fp,
            merge_json_block(fp, "hooks", tagged) if not dry_run else json.dumps({"hooks": tagged}, indent=2) + "\n",
            dry_run,
            results,
        )

    emit_ignores(gh / "copilot-ignore", resolved, dry_run, results)

    return results


GITIGNORE = [
    ".github/copilot-instructions.md",
    ".github/instructions/",
    ".github/agents/",
    ".github/chatmodes/",
    ".github/skills/",
    ".github/prompts/",
    ".github/hooks/",
    ".github/copilot-ignore",
    "AGENTS.md",
    ".copilot-mcp.json",
    ".vscode/mcp.json",
    ".ai-deployed/",
]
