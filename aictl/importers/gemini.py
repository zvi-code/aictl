# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from Gemini CLI native files.

Reads:
  GEMINI.md              → root base instructions
  GEMINI.local.md        → root profile instructions
  .gemini/rules/*.md     → sub-scope instructions (YAML frontmatter with paths:)
  .gemini/commands/*.md  → command capabilities
  .gemini/skills/*/SKILL.md → skill capabilities
  .mcp.json              → MCP servers
  .gemini/settings.json  → hooks, settings
"""

from __future__ import annotations

from pathlib import Path

from . import ImportResult, ImportedScope
from ._parse_helpers import (
    read_root_scope, read_sub_scopes, read_cap_dir, read_skills_dir,
    read_hooks_from_settings, import_mcp_from_json,
)

NAME = "gemini"


def import_from(root: Path) -> ImportResult | None:
    gemini_dir = root / ".gemini"

    root_base, profile_name, profile_text = read_root_scope(
        root / "GEMINI.md", root / "GEMINI.local.md", NAME)
    scopes = ([ImportedScope(".", NAME, root_base, profile_name, profile_text)]
              if root_base or profile_text else [])
    scopes += read_sub_scopes(gemini_dir / "rules", "*.md", NAME, meta_key="paths")

    capabilities = (read_cap_dir(gemini_dir / "commands", "*.md", "command", NAME)
                    + read_skills_dir(gemini_dir / "skills", NAME))

    mcp_servers = import_mcp_from_json(root / ".mcp.json", NAME)

    hooks = read_hooks_from_settings([gemini_dir / "settings.json"], NAME)

    if not scopes and not capabilities and not mcp_servers and not hooks:
        return None
    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, [])
