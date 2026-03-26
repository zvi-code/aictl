"""Import from Claude Code native files.

Reads:
  CLAUDE.md              → root base instructions
  CLAUDE.local.md        → root profile instructions
  .claude/rules/*.md     → sub-scope instructions (YAML frontmatter with paths:)
  .claude/commands/*.md  → command capabilities
  .claude/skills/*/SKILL.md → skill capabilities
  .mcp.json              → MCP servers
"""

from __future__ import annotations

from pathlib import Path

from . import ImportResult, ImportedScope, ImportedCapability, ImportedHook, ImportedLsp
from ._parse_helpers import (
    strip_markers, split_yaml_frontmatter, glob_to_rel_path,
    extract_profile_name, strip_profile_header, safe_json_load, import_mcp_from_json,
)

NAME = "claude"


def import_from(root: Path) -> ImportResult | None:
    scopes: list[ImportedScope] = []
    capabilities: list[ImportedCapability] = []
    mcp_servers: list[ImportedMcp] = []
    hooks: list[ImportedHook] = []
    lsp_servers: list[ImportedLsp] = []

    root_base = ""
    profile_name = None
    profile_text = ""

    # --- Root base: CLAUDE.md ---
    claude_md = root / "CLAUDE.md"
    if claude_md.is_file():
        root_base = strip_markers(claude_md.read_text("utf-8"))

    # --- Root profile: CLAUDE.local.md ---
    local_md = root / "CLAUDE.local.md"
    if local_md.is_file():
        raw = local_md.read_text("utf-8")
        text = strip_markers(raw)
        profile_name = extract_profile_name(text)
        profile_text = strip_profile_header(text)

    if root_base or profile_text:
        scopes.append(ImportedScope(".", NAME, root_base, profile_name, profile_text))

    # --- Sub-scopes: .claude/rules/*.md ---
    rules_dir = root / ".claude" / "rules"
    if rules_dir.is_dir():
        for f in sorted(rules_dir.glob("*.md")):
            raw = f.read_text("utf-8")
            meta, body = split_yaml_frontmatter(raw)
            body = strip_markers(body)
            paths = meta.get("paths", [])
            rel = glob_to_rel_path(paths[0]) if paths else ""
            if rel and body:
                scopes.append(ImportedScope(rel, NAME, body))

    # --- Commands: .claude/commands/*.md ---
    cmds_dir = root / ".claude" / "commands"
    if cmds_dir.is_dir():
        for f in sorted(cmds_dir.glob("*.md")):
            content = f.read_text("utf-8").strip()
            if content:
                capabilities.append(ImportedCapability("command", f.stem, content, NAME))

    # --- Skills: .claude/skills/*/SKILL.md ---
    skills_dir = root / ".claude" / "skills"
    if skills_dir.is_dir():
        for skill_dir in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
            skill_file = skill_dir / "SKILL.md"
            if skill_file.is_file():
                content = skill_file.read_text("utf-8").strip()
                if content:
                    capabilities.append(ImportedCapability("skill", skill_dir.name, content, NAME))

    # --- MCP: .mcp.json ---
    mcp_servers = import_mcp_from_json(root / ".mcp.json", NAME)

    # --- Hooks: .claude/settings.json and .claude/settings.local.json ---
    for settings_name in ("settings.json", "settings.local.json"):
        data = safe_json_load(root / ".claude" / settings_name)
        if data:
            for event, rules in data.get("hooks", {}).items():
                if isinstance(rules, list):
                    hooks.append(ImportedHook(event, rules, NAME))

    # --- LSP: .lsp.json ---
    lsp_data = safe_json_load(root / ".lsp.json")
    if lsp_data:
        for name, config in lsp_data.items():
            lsp_servers.append(ImportedLsp(name, config, NAME))

    if not scopes and not capabilities and not mcp_servers and not hooks and not lsp_servers:
        return None

    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, lsp_servers)
