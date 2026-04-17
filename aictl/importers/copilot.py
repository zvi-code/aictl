# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from GitHub Copilot native files.

Reads:
  .github/copilot-instructions.md          → root base instructions
  AGENTS.md                                → root profile instructions
  .github/instructions/*.instructions.md   → sub-scope instructions (applyTo:)
  .github/agents/*.agent.md                → agent capabilities (Coding Agent)
  .github/chatmodes/*.chatmode.md          → agent capabilities (VS Code modes)
  .github/skills/*/SKILL.md               → skill capabilities
  .github/prompts/*.prompt.md              → command capabilities (prompts)
  .github/hooks/*.json                     → lifecycle hooks
  .copilot-mcp.json + .vscode/mcp.json    → MCP servers
  .github/lsp.json                         → LSP server configuration

Agents in ``.agent.md`` and ``.chatmode.md`` are deduped by capability name:
the first hit wins so a round-trip (emit → import) does not create two copies
of the same agent.
"""

from __future__ import annotations

from pathlib import Path

from . import ImportedCapability, ImportedScope, ImportResult
from ._parse_helpers import (
    import_mcp_from_json,
    read_cap_dir,
    read_hooks_from_dir,
    read_lsp_json,
    read_root_scope,
    read_skills_dir,
    read_sub_scopes,
    split_yaml_frontmatter,
)

NAME = "copilot"


def _dedupe_by_name(caps: list) -> list:
    seen: set[tuple[str, str]] = set()
    out = []
    for c in caps:
        key = (c.kind, c.name)
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def import_from(root: Path) -> ImportResult | None:
    gh = root / ".github"

    root_base, profile_name, profile_text = read_root_scope(gh / "copilot-instructions.md", root / "AGENTS.md", NAME)
    scopes = [ImportedScope(".", NAME, root_base, profile_name, profile_text)] if root_base or profile_text else []
    scopes += read_sub_scopes(gh / "instructions", "*.instructions.md", NAME, meta_key="applyTo")

    # Agents: prefer .agent.md (canonical), fall back to .chatmode.md for VS-Code-only repos.
    agents = read_cap_dir(gh / "agents", "*.agent.md", "agent", NAME, suffix=".agent")
    # chatmode files carry their own YAML frontmatter — strip it so the
    # capability body stored in .context.toml is clean markdown.
    chatmode_raw = read_cap_dir(gh / "chatmodes", "*.chatmode.md", "agent", NAME, suffix=".chatmode")
    chatmodes = [
        ImportedCapability(c.kind, c.name, split_yaml_frontmatter(c.content)[1] or c.content, c.source)
        for c in chatmode_raw
    ]
    agents += chatmodes
    capabilities = (
        _dedupe_by_name(agents)
        + read_skills_dir(gh / "skills", NAME)
        + read_cap_dir(gh / "prompts", "*.prompt.md", "command", NAME, suffix=".prompt")
    )

    seen_mcp: set[str] = set()
    mcp_servers = import_mcp_from_json(root / ".copilot-mcp.json", NAME, seen=seen_mcp)
    mcp_servers += import_mcp_from_json(root / ".vscode" / "mcp.json", NAME, server_key="servers", seen=seen_mcp)

    hooks = read_hooks_from_dir(gh / "hooks", NAME)
    lsp_servers = read_lsp_json(gh / "lsp.json", NAME, key="lspServers")

    if not scopes and not capabilities and not mcp_servers and not hooks and not lsp_servers:
        return None
    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, lsp_servers)
