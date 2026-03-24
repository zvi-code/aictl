"""Emit for GitHub Copilot CLI + VS Code."""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import (
    wrap_deployed, compose_with_overlay, extract_overlay,
    write_safe, estimate_tokens, encode_scope,
)

NAME = "copilot"


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    gh = root / ".github"

    for scope in resolved.scopes:
        src = scope.rel_path
        combined = scope.base
        if scope.profile_text:
            combined += "\n\n" + scope.profile_text

        if scope.is_root:
            if scope.base:
                fp = gh / "copilot-instructions.md"
                content = wrap_deployed(scope.base, src)
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})

            if scope.profile_text and resolved.profile:
                fp = root / "AGENTS.md"
                overlay = "" if dry_run else extract_overlay(fp)
                content = compose_with_overlay(
                    f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}",
                    overlay, src, resolved.profile,
                )
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})
        else:
            if combined:
                safe = encode_scope(src).replace("--", "-")
                fp = gh / "instructions" / f"{safe}.instructions.md"
                glob = f"{src}/**"
                body = f'---\napplyTo: "{glob}"\n---\n\n' + wrap_deployed(combined, src)
                if not dry_run:
                    write_safe(fp, body)
                results.append({"path": str(fp), "tokens": estimate_tokens(body)})

    for cap in resolved.capabilities:
        if cap.kind == "agent":
            fp = gh / "agents" / f"{cap.name}.agent.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})
        elif cap.kind == "skill":
            fp = gh / "skills" / cap.name / "SKILL.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})
        elif cap.kind == "command":
            fp = gh / "prompts" / f"{cap.name}.prompt.md"
            if not dry_run:
                write_safe(fp, cap.content)
            results.append({"path": str(fp), "tokens": estimate_tokens(cap.content)})

    if resolved.mcp_servers:
        fp = root / ".copilot-mcp.json"
        content = json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    return results


GITIGNORE = [
    ".github/copilot-instructions.md", ".github/instructions/",
    ".github/agents/", ".github/skills/", ".github/prompts/",
    "AGENTS.md", ".copilot-mcp.json", ".ai-deployed/",
]
