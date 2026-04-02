# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from Claude Code native files.

Reads:
  CLAUDE.md              → root base instructions
  CLAUDE.local.md        → root profile instructions
  .claude/rules/*.md     → sub-scope instructions (YAML frontmatter with paths:)
  .claude/commands/*.md  → command capabilities
  .claude/skills/*/SKILL.md → skill capabilities
  .mcp.json              → MCP servers
  .claude/settings.json + .claude/settings.local.json → hooks
  .lsp.json              → LSP servers
"""

from __future__ import annotations

from pathlib import Path

from . import ImportResult, ImportedScope
from ._parse_helpers import (
    read_root_scope, read_sub_scopes, read_cap_dir, read_skills_dir,
    read_hooks_from_settings, read_lsp_json, import_mcp_from_json,
)

NAME = "claude"


def import_from(root: Path) -> ImportResult | None:
    claude_dir = root / ".claude"

    root_base, profile_name, profile_text = read_root_scope(
        root / "CLAUDE.md", root / "CLAUDE.local.md", NAME)
    scopes = ([ImportedScope(".", NAME, root_base, profile_name, profile_text)]
              if root_base or profile_text else [])
    scopes += read_sub_scopes(claude_dir / "rules", "*.md", NAME, meta_key="paths")

    capabilities = (read_cap_dir(claude_dir / "commands", "*.md", "command", NAME)
                    + read_skills_dir(claude_dir / "skills", NAME))

    mcp_servers = import_mcp_from_json(root / ".mcp.json", NAME)

    hooks = read_hooks_from_settings(
        [claude_dir / "settings.json", claude_dir / "settings.local.json"], NAME)

    lsp_servers = read_lsp_json(root / ".lsp.json", NAME, key="")

    if not scopes and not capabilities and not mcp_servers and not hooks and not lsp_servers:
        return None
    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, lsp_servers)
