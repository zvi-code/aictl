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

from . import ImportResult, ImportedScope
from ._parse_helpers import (
    split_yaml_frontmatter, extract_profile_name, strip_profile_header,
    read_sub_scopes, import_mcp_from_json,
)

NAME = "cursor"
_SKIP = frozenset({"base.mdc", "profile-active.mdc"})
_ACTIVE_PROFILE_RE = re.compile(r"[Aa]ctive profile:\s*(\S+)")


def import_from(root: Path) -> ImportResult | None:
    rules_dir = root / ".cursor" / "rules"

    # Root base: .cursor/rules/base.mdc
    root_base = ""
    base_file = rules_dir / "base.mdc"
    if base_file.is_file():
        _, root_base = split_yaml_frontmatter(base_file.read_text("utf-8"))

    # Root profile: .cursor/rules/profile-active.mdc
    # Cursor stores the profile name in the YAML description field
    profile_name = None
    profile_text = ""
    profile_file = rules_dir / "profile-active.mdc"
    if profile_file.is_file():
        meta, body = split_yaml_frontmatter(profile_file.read_text("utf-8"))
        desc = meta.get("description", "")
        m = _ACTIVE_PROFILE_RE.search(desc)
        profile_name = m.group(1) if m else extract_profile_name(body)
        profile_text = strip_profile_header(body)

    scopes = ([ImportedScope(".", NAME, root_base, profile_name, profile_text)]
              if root_base or profile_text else [])
    scopes += read_sub_scopes(rules_dir, "*.mdc", NAME, meta_key="globs", skip=_SKIP)

    mcp_servers = import_mcp_from_json(root / ".cursor" / "mcp.json", NAME)

    if not scopes and not mcp_servers:
        return None
    return ImportResult(NAME, scopes, [], mcp_servers)
