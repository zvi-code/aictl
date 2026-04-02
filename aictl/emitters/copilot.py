# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for GitHub Copilot CLI + VS Code."""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import (
    wrap_deployed, compose_with_overlay, extract_overlay,
    write_safe, estimate_tokens, encode_scope,
    merge_json_block, merge_ignore_file, emit_file,
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
                emit_file(gh / "copilot-instructions.md", wrap_deployed(scope.base, src), dry_run, results)

            if scope.profile_text and resolved.profile:
                fp = root / "AGENTS.md"
                overlay = "" if dry_run else extract_overlay(fp)
                emit_file(fp, compose_with_overlay(
                    f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}",
                    overlay, src, resolved.profile,
                ), dry_run, results)
        else:
            if combined:
                safe = encode_scope(src).replace("--", "-")
                glob = f"{src}/**"
                emit_file(gh / "instructions" / f"{safe}.instructions.md",
                          f'---\napplyTo: "{glob}"\n---\n\n' + wrap_deployed(combined, src),
                          dry_run, results)

    for cap in resolved.capabilities:
        if cap.kind == "agent":
            emit_file(gh / "agents" / f"{cap.name}.agent.md", cap.content, dry_run, results)
        elif cap.kind == "skill":
            emit_file(gh / "skills" / cap.name / "SKILL.md", cap.content, dry_run, results)
        elif cap.kind == "command":
            emit_file(gh / "prompts" / f"{cap.name}.prompt.md", cap.content, dry_run, results)

    if resolved.mcp_servers:
        # Copilot CLI format: .copilot-mcp.json with "mcpServers" key
        fp = root / ".copilot-mcp.json"
        emit_file(fp, merge_json_block(fp, "mcpServers", resolved.mcp_servers) if not dry_run else json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n", dry_run, results)

        # VS Code format: .vscode/mcp.json with "servers" key
        vscode_fp = root / ".vscode" / "mcp.json"
        emit_file(vscode_fp, merge_json_block(vscode_fp, "servers", resolved.mcp_servers) if not dry_run else json.dumps({"servers": resolved.mcp_servers}, indent=2) + "\n", dry_run, results)

    # --- Hooks → .github/hooks/hooks.json ---
    if resolved.hooks:
        fp = gh / "hooks" / "hooks.json"
        emit_file(fp, merge_json_block(fp, "hooks", resolved.hooks) if not dry_run else json.dumps({"hooks": resolved.hooks}, indent=2) + "\n", dry_run, results)

    # --- Ignores → .github/copilot-ignore ---
    if resolved.ignores:
        fp = gh / "copilot-ignore"
        emit_file(fp, merge_ignore_file(fp, resolved.ignores) if not dry_run else "\n".join(resolved.ignores) + "\n", dry_run, results)

    return results


GITIGNORE = [
    ".github/copilot-instructions.md", ".github/instructions/",
    ".github/agents/", ".github/skills/", ".github/prompts/",
    ".github/hooks/", ".github/copilot-ignore",
    "AGENTS.md", ".copilot-mcp.json", ".vscode/mcp.json", ".ai-deployed/",
]
