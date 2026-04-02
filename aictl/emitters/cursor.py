# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Emit for Cursor IDE."""

from __future__ import annotations

from pathlib import Path

from ..resolver import Resolved
from ..utils import encode_scope, emit_file
from ._helpers import emit_mcp_servers, emit_ignores

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

    emit_mcp_servers(root / ".cursor" / "mcp.json", "mcpServers", resolved, dry_run, results)

    emit_ignores(root / ".cursorignore", resolved, dry_run, results)

    return results


def _mdc(description: str, globs: str = "", always: bool = False, body: str = "") -> str:
    lines = ["---", f"description: {description}"]
    if globs:
        lines.append(f"globs: {globs}")
    lines.append(f"alwaysApply: {'true' if always else 'false'}")
    lines.extend(["---", "", body.strip(), ""])
    return "\n".join(lines)


GITIGNORE = [".cursor/rules/", ".cursor/mcp.json", ".cursorignore"]
