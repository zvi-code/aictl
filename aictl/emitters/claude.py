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
                fp = root / "CLAUDE.md"
                content = wrap_deployed(scope.base, src)
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})

            # Root profile → CLAUDE.local.md (with overlay)
            if scope.profile_text and resolved.profile:
                fp = root / "CLAUDE.local.md"
                overlay = "" if dry_run else extract_overlay(fp)
                content = compose_with_overlay(
                    f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}",
                    overlay, src, resolved.profile,
                )
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})
        else:
            # Sub-scope → .claude/rules/{scope}.md (base + profile merged)
            if combined:
                safe = encode_scope(src).replace("--", "-")
                fp = root / ".claude" / "rules" / f"{safe}.md"
                glob = f"{src}/**"
                body = f'---\napplyTo: "{glob}"\n---\n\n' + wrap_deployed(combined, src)
                if not dry_run:
                    write_safe(fp, body)
                results.append({"path": str(fp), "tokens": estimate_tokens(body)})

    # --- Capabilities (root only) ---
    for cap in resolved.capabilities:
        if cap.kind == "command":
            fp = root / ".claude" / "commands" / f"{cap.name}.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})
        elif cap.kind == "skill":
            fp = root / ".claude" / "skills" / cap.name / "SKILL.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})

    # --- MCP ---
    if resolved.mcp_servers:
        fp = root / ".mcp.json"
        content = json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    return results


GITIGNORE = [
    "CLAUDE.md", "CLAUDE.local.md",
    ".claude/rules/", ".claude/commands/", ".claude/skills/",
    ".mcp.json", ".ai-deployed/",
]
