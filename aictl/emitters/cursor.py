# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for Cursor IDE."""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import write_safe, estimate_tokens, encode_scope, wrap_deployed, merge_json_block, merge_ignore_file, emit_file

NAME = "cursor"


def emit(root: Path, resolved: Resolved, dry_run: bool = False) -> list[dict]:
    results = []
    rules = root / ".cursor" / "rules"

    for scope in resolved.scopes:
        src = scope.rel_path
        combined = scope.base
        if scope.profile_text:
            combined += "\n\n" + scope.profile_text

        if scope.is_root:
            if scope.base:
                emit_file(rules / "base.mdc", _mdc("Project-wide context", always=True, body=scope.base), dry_run, results)

            if scope.profile_text and resolved.profile:
                emit_file(rules / "profile-active.mdc",
                          _mdc(f"Active profile: {resolved.profile}", always=True,
                               body=f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}"),
                          dry_run, results)
        else:
            if combined:
                safe = encode_scope(src).replace("--", "-")
                emit_file(rules / f"{safe}.mdc", _mdc(f"Context for {src}", globs=f"{src}/**", body=combined), dry_run, results)

    if resolved.mcp_servers:
        fp = root / ".cursor" / "mcp.json"
        emit_file(fp, merge_json_block(fp, "mcpServers", resolved.mcp_servers) if not dry_run else json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n", dry_run, results)

    # --- Ignores → .cursorignore ---
    if resolved.ignores:
        fp = root / ".cursorignore"
        emit_file(fp, merge_ignore_file(fp, resolved.ignores) if not dry_run else "\n".join(resolved.ignores) + "\n", dry_run, results)

    return results


def _mdc(description: str, globs: str = "", always: bool = False, body: str = "") -> str:
    lines = ["---", f"description: {description}"]
    if globs:
        lines.append(f"globs: {globs}")
    lines.append(f"alwaysApply: {'true' if always else 'false'}")
    lines.extend(["---", "", body.strip(), ""])
    return "\n".join(lines)


GITIGNORE = [".cursor/rules/", ".cursor/mcp.json", ".cursorignore"]
