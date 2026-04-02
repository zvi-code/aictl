# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from GitHub Copilot native files.

Reads:
  .github/copilot-instructions.md          → root base instructions
  AGENTS.md                                → root profile instructions
  .github/instructions/*.instructions.md   → sub-scope instructions (applyTo:)
  .github/agents/*.agent.md                → agent capabilities
  .github/skills/*/SKILL.md               → skill capabilities
  .github/prompts/*.prompt.md              → command capabilities (prompts)
  .github/hooks/*.json                     → lifecycle hooks
  .copilot-mcp.json + .vscode/mcp.json    → MCP servers
  .github/lsp.json                         → LSP server configuration
"""

from __future__ import annotations

from pathlib import Path

from . import ImportResult, ImportedScope
from ._parse_helpers import (
    read_root_scope, read_sub_scopes, read_cap_dir, read_skills_dir,
    read_hooks_from_dir, read_lsp_json, import_mcp_from_json,
)

NAME = "copilot"


def import_from(root: Path) -> ImportResult | None:
    gh = root / ".github"

    root_base, profile_name, profile_text = read_root_scope(
        gh / "copilot-instructions.md", root / "AGENTS.md", NAME)
    scopes = ([ImportedScope(".", NAME, root_base, profile_name, profile_text)]
              if root_base or profile_text else [])
    scopes += read_sub_scopes(
        gh / "instructions", "*.instructions.md", NAME, meta_key="applyTo")

    capabilities = (
        read_cap_dir(gh / "agents", "*.agent.md", "agent", NAME, suffix=".agent")
        + read_skills_dir(gh / "skills", NAME)
        + read_cap_dir(gh / "prompts", "*.prompt.md", "command", NAME, suffix=".prompt")
    )

    seen_mcp: set[str] = set()
    mcp_servers = import_mcp_from_json(root / ".copilot-mcp.json", NAME, seen=seen_mcp)
    mcp_servers += import_mcp_from_json(
        root / ".vscode" / "mcp.json", NAME, server_key="servers", seen=seen_mcp)

    hooks = read_hooks_from_dir(gh / "hooks", NAME)
    lsp_servers = read_lsp_json(gh / "lsp.json", NAME, key="lspServers")

    if not scopes and not capabilities and not mcp_servers and not hooks and not lsp_servers:
        return None
    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, lsp_servers)
