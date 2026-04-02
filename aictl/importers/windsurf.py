# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from Windsurf IDE native files.

Reads:
  .windsurfrules               → root base instructions (profile may be embedded)
  .windsurf/rules/*.md         → sub-scope instructions (paths: in YAML frontmatter)
  .windsurf/mcp.json           → MCP servers
"""

from __future__ import annotations

from pathlib import Path

from . import ImportResult, ImportedScope
from ._parse_helpers import (
    strip_markers, extract_profile_name, strip_profile_header,
    read_sub_scopes, import_mcp_from_json,
)

NAME = "windsurf"


def import_from(root: Path) -> ImportResult | None:
    root_base = ""
    profile_name = None
    profile_text = ""

    # Windsurf stores profile inline in .windsurfrules rather than a separate file
    root_file = root / ".windsurfrules"
    if root_file.is_file():
        raw = strip_markers(root_file.read_text("utf-8"))
        profile_name = extract_profile_name(raw)
        if profile_name:
            profile_text = strip_profile_header(raw)
        else:
            root_base = raw

    scopes = ([ImportedScope(".", NAME, root_base, profile_name, profile_text)]
              if root_base or profile_text else [])
    scopes += read_sub_scopes(root / ".windsurf" / "rules", "*.md", NAME, meta_key="paths")

    mcp_servers = import_mcp_from_json(root / ".windsurf" / "mcp.json", NAME)

    if not scopes and not mcp_servers:
        return None
    return ImportResult(NAME, scopes, [], mcp_servers)
