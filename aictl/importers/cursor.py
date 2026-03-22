# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from Cursor IDE native files.

Reads:
  .cursor/rules/base.mdc            → root base instructions (MDC frontmatter)
  .cursor/rules/profile-active.mdc  → root profile instructions
  .cursor/rules/*.mdc               → sub-scope instructions (globs: in frontmatter)
  .cursor/mcp.json                   → MCP servers
"""

from __future__ import annotations

import re
from pathlib import Path

from . import ImportResult, ImportedScope, ImportedCapability
from ._parse_helpers import split_yaml_frontmatter, glob_to_rel_path, extract_profile_name, strip_profile_header, import_mcp_from_json

NAME = "cursor"

_SKIP_FILES = {"base.mdc", "profile-active.mdc"}


def import_from(root: Path) -> ImportResult | None:
    scopes: list[ImportedScope] = []
    mcp_servers: list[ImportedMcp] = []

    rules_dir = root / ".cursor" / "rules"
    root_base = ""
    profile_name = None
    profile_text = ""

    # --- Root base: .cursor/rules/base.mdc ---
    base_file = rules_dir / "base.mdc"
    if base_file.is_file():
        _meta, body = split_yaml_frontmatter(base_file.read_text("utf-8"))
        root_base = body

    # --- Root profile: .cursor/rules/profile-active.mdc ---
    profile_file = rules_dir / "profile-active.mdc"
    if profile_file.is_file():
        meta, body = split_yaml_frontmatter(profile_file.read_text("utf-8"))
        desc = meta.get("description", "")
        # Extract profile name from description like "Active profile: review"
        m = re.search(r"[Aa]ctive profile:\s*(\S+)", desc)
        if m:
            profile_name = m.group(1)
        if not profile_name:
            profile_name = extract_profile_name(body)
        profile_text = strip_profile_header(body)

    if root_base or profile_text:
        scopes.append(ImportedScope(".", NAME, root_base, profile_name, profile_text))

    # --- Sub-scopes: .cursor/rules/*.mdc (excluding base and profile-active) ---
    if rules_dir.is_dir():
        for f in sorted(rules_dir.glob("*.mdc")):
            if f.name in _SKIP_FILES:
                continue
            meta, body = split_yaml_frontmatter(f.read_text("utf-8"))
            globs = meta.get("globs", "")
            rel = glob_to_rel_path(globs) if globs else ""
            if rel and body:
                scopes.append(ImportedScope(rel, NAME, body))

    # --- MCP: .cursor/mcp.json ---
    mcp_servers = import_mcp_from_json(root / ".cursor" / "mcp.json", NAME)

    if not scopes and not mcp_servers:
        return None

    # Cursor has no capability concept — only instructions + MCP
    return ImportResult(NAME, scopes, [], mcp_servers)
