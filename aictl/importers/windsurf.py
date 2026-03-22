# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from Windsurf IDE native files.

Reads:
  .windsurfrules               → root base instructions
  .windsurf/rules/*.md         → sub-scope instructions (paths: in YAML frontmatter)
  .windsurf/mcp.json           → MCP servers
"""

from __future__ import annotations

from pathlib import Path

from . import ImportResult, ImportedScope
from ._parse_helpers import (
    strip_markers, split_yaml_frontmatter, glob_to_rel_path,
    extract_profile_name, strip_profile_header, import_mcp_from_json,
)

NAME = "windsurf"


def import_from(root: Path) -> ImportResult | None:
    scopes: list[ImportedScope] = []

    # --- Root: .windsurfrules ---
    root_file = root / ".windsurfrules"
    root_base = ""
    profile_name = None
    profile_text = ""

    if root_file.is_file():
        raw = strip_markers(root_file.read_text("utf-8"))
        profile_name = extract_profile_name(raw)
        if profile_name:
            profile_text = strip_profile_header(raw)
        else:
            root_base = raw

    if root_base or profile_text:
        scopes.append(ImportedScope(".", NAME, root_base, profile_name, profile_text))

    # --- Sub-scopes: .windsurf/rules/*.md ---
    rules_dir = root / ".windsurf" / "rules"
    if rules_dir.is_dir():
        for f in sorted(rules_dir.glob("*.md")):
            meta, body = split_yaml_frontmatter(f.read_text("utf-8"))
            body = strip_markers(body)
            paths = meta.get("paths", [])
            rel = ""
            if paths and isinstance(paths, list):
                rel = glob_to_rel_path(paths[0])
            if rel and body:
                scopes.append(ImportedScope(rel, NAME, body))

    # --- MCP: .windsurf/mcp.json ---
    mcp_servers = import_mcp_from_json(root / ".windsurf" / "mcp.json", NAME)

    if not scopes and not mcp_servers:
        return None

    return ImportResult(NAME, scopes, [], mcp_servers)
