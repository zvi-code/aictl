"""Emit for Cursor IDE."""

from __future__ import annotations

import json
from pathlib import Path

from ..resolver import Resolved
from ..utils import write_safe, estimate_tokens, encode_scope

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
                fp = rules / "base.mdc"
                content = _mdc("Project-wide context", always=True, body=scope.base)
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})

            if scope.profile_text and resolved.profile:
                fp = rules / "profile-active.mdc"
                content = _mdc(f"Active profile: {resolved.profile}", always=True,
                               body=f"# Active Profile: {resolved.profile}\n\n{scope.profile_text}")
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})
        else:
            if combined:
                safe = encode_scope(src).replace("--", "-")
                fp = rules / f"{safe}.mdc"
                content = _mdc(f"Context for {src}", globs=f"{src}/**", body=combined)
                if not dry_run:
                    write_safe(fp, content)
                results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    if resolved.mcp_servers:
        fp = root / ".cursor" / "mcp.json"
        content = json.dumps({"mcpServers": resolved.mcp_servers}, indent=2) + "\n"
        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "tokens": estimate_tokens(content)})

    return results


def _mdc(description: str, globs: str = "", always: bool = False, body: str = "") -> str:
    lines = ["---", f"description: {description}"]
    if globs:
        lines.append(f"globs: {globs}")
    lines.append(f"alwaysApply: {'true' if always else 'false'}")
    lines.extend(["---", "", body.strip(), ""])
    return "\n".join(lines)


GITIGNORE = [".cursor/rules/", ".cursor/mcp.json"]
