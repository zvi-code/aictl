"""Import from GitHub Copilot native files.

Reads:
  .github/copilot-instructions.md          → root base instructions
  AGENTS.md                                → root profile instructions
  .github/instructions/*.instructions.md   → sub-scope instructions (applyTo:)
  .github/agents/*.agent.md                → agent capabilities
  .github/skills/*/SKILL.md               → skill capabilities
  .github/prompts/*.prompt.md              → command capabilities (prompts)
  .github/hooks/*.json                     → lifecycle hooks
  .copilot-mcp.json                        → MCP servers (Copilot CLI format)
  .vscode/mcp.json                         → MCP servers (VS Code format)
  .github/lsp.json                         → LSP server configuration
"""

from __future__ import annotations

import json
from pathlib import Path

from . import ImportResult, ImportedScope, ImportedCapability, ImportedMcp, ImportedHook, ImportedLsp
from ._parse_helpers import strip_markers, split_yaml_frontmatter, glob_to_rel_path, extract_profile_name, strip_profile_header

NAME = "copilot"


def import_from(root: Path) -> ImportResult | None:
    scopes: list[ImportedScope] = []
    capabilities: list[ImportedCapability] = []
    mcp_servers: list[ImportedMcp] = []
    hooks: list[ImportedHook] = []
    lsp_servers: list[ImportedLsp] = []

    root_base = ""
    profile_name = None
    profile_text = ""

    gh = root / ".github"

    # --- Root base: .github/copilot-instructions.md ---
    base_file = gh / "copilot-instructions.md"
    if base_file.is_file():
        root_base = strip_markers(base_file.read_text("utf-8"))

    # --- Root profile: AGENTS.md ---
    agents_md = root / "AGENTS.md"
    if agents_md.is_file():
        raw = agents_md.read_text("utf-8")
        text = strip_markers(raw)
        profile_name = extract_profile_name(text)
        profile_text = strip_profile_header(text)

    if root_base or profile_text:
        scopes.append(ImportedScope(".", NAME, root_base, profile_name, profile_text))

    # --- Sub-scopes: .github/instructions/*.instructions.md ---
    instr_dir = gh / "instructions"
    if instr_dir.is_dir():
        for f in sorted(instr_dir.glob("*.instructions.md")):
            raw = f.read_text("utf-8")
            meta, body = split_yaml_frontmatter(raw)
            body = strip_markers(body)
            apply_to = meta.get("applyTo", "")
            rel = glob_to_rel_path(apply_to) if apply_to else ""
            if rel and body:
                scopes.append(ImportedScope(rel, NAME, body))

    # --- Agents: .github/agents/*.agent.md ---
    agents_dir = gh / "agents"
    if agents_dir.is_dir():
        for f in sorted(agents_dir.glob("*.agent.md")):
            content = f.read_text("utf-8").strip()
            name = f.name.removesuffix(".agent.md")
            if content:
                capabilities.append(ImportedCapability("agent", name, content, NAME))

    # --- Skills: .github/skills/*/SKILL.md ---
    skills_dir = gh / "skills"
    if skills_dir.is_dir():
        for skill_dir in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
            skill_file = skill_dir / "SKILL.md"
            if skill_file.is_file():
                content = skill_file.read_text("utf-8").strip()
                if content:
                    capabilities.append(ImportedCapability("skill", skill_dir.name, content, NAME))

    # --- Commands (as prompts): .github/prompts/*.prompt.md ---
    prompts_dir = gh / "prompts"
    if prompts_dir.is_dir():
        for f in sorted(prompts_dir.glob("*.prompt.md")):
            content = f.read_text("utf-8").strip()
            name = f.name.removesuffix(".prompt.md")
            if content:
                capabilities.append(ImportedCapability("command", name, content, NAME))

    # --- MCP: .copilot-mcp.json + .vscode/mcp.json ---
    seen_mcp: set[str] = set()
    for mcp_file, key in [
        (root / ".copilot-mcp.json", "mcpServers"),
        (root / ".vscode" / "mcp.json", "servers"),  # VS Code uses "servers" key
    ]:
        if mcp_file.is_file():
            try:
                data = json.loads(mcp_file.read_text("utf-8"))
                # Handle both "servers" and "mcpServers" for robustness
                servers = data.get(key, data.get("mcpServers", data.get("servers", {})))
                for name, config in servers.items():
                    if name not in seen_mcp:
                        mcp_servers.append(ImportedMcp(name, config, NAME))
                        seen_mcp.add(name)
            except (json.JSONDecodeError, KeyError):
                pass

    # --- Hooks: .github/hooks/*.json ---
    hooks_dir = gh / "hooks"
    if hooks_dir.is_dir():
        for f in sorted(hooks_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text("utf-8"))
                hook_data = data.get("hooks", {})
                for event, rules in hook_data.items():
                    if isinstance(rules, list) and rules:
                        hooks.append(ImportedHook(event, rules, NAME))
            except (json.JSONDecodeError, KeyError):
                pass

    # --- LSP: .github/lsp.json ---
    lsp_file = gh / "lsp.json"
    if lsp_file.is_file():
        try:
            data = json.loads(lsp_file.read_text("utf-8"))
            for name, config in data.get("lspServers", {}).items():
                lsp_servers.append(ImportedLsp(name, config, NAME))
        except (json.JSONDecodeError, KeyError):
            pass

    if not scopes and not capabilities and not mcp_servers and not hooks and not lsp_servers:
        return None

    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, lsp_servers)
