# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Import from .claude-plugin/ directories.

Reads:
  .claude-plugin/plugin.json              -> plugin manifest (name, version, etc.)
  commands/*.md                           -> command capabilities
  skills/*/SKILL.md                       -> skill capabilities
  agents/*.md                             -> agent capabilities
  hooks/hooks.json                        -> lifecycle hooks
  .mcp.json                               -> MCP servers
  .lsp.json                               -> LSP servers
  settings.json                           -> settings (hooks, etc.)

The plugin directory may live at:
  <root>/.claude-plugin/
  <root>/plugin/.claude-plugin/
  Or any subdirectory containing a .claude-plugin/ dir.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import ImportResult, ImportedScope, ImportedCapability, ImportedHook, ImportedLsp, ImportedMcp
from ._parse_helpers import safe_json_load, import_mcp_from_json

NAME = "plugin"


def _find_plugin_dirs(root: Path) -> list[Path]:
    """Find directories that contain a .claude-plugin/ subdirectory."""
    results = []
    # Direct: root/.claude-plugin/
    if (root / ".claude-plugin").is_dir():
        results.append(root)
    # Common convention: root/plugin/.claude-plugin/
    if (root / "plugin" / ".claude-plugin").is_dir():
        results.append(root / "plugin")
    # Also scan one level for other plugin dirs
    for d in sorted(root.iterdir()):
        if d.is_dir() and d.name not in (".git", "node_modules", "__pycache__", ".venv"):
            cp = d / ".claude-plugin"
            if cp.is_dir() and d not in results and d != root / "plugin":
                results.append(d)
    return results


def import_from(root: Path) -> ImportResult | None:
    """Import capabilities from .claude-plugin/ directories under root."""
    plugin_dirs = _find_plugin_dirs(root)
    if not plugin_dirs:
        return None

    scopes: list[ImportedScope] = []
    capabilities: list[ImportedCapability] = []
    mcp_servers: list[ImportedMcp] = []
    hooks: list[ImportedHook] = []
    lsp_servers: list[ImportedLsp] = []
    plugin_meta: dict[str, str] = {}

    for plugin_root in plugin_dirs:
        manifest_dir = plugin_root / ".claude-plugin"

        # --- Plugin manifest: .claude-plugin/plugin.json ---
        manifest = safe_json_load(manifest_dir / "plugin.json")
        base_text = ""
        if manifest:
            # Extract metadata fields
            for key in ("name", "version", "description"):
                val = manifest.get(key)
                if val and key not in plugin_meta:
                    plugin_meta[key] = str(val)
            # Author may be a dict {"name": "..."} or a string
            author = manifest.get("author")
            if author and "author" not in plugin_meta:
                if isinstance(author, dict):
                    plugin_meta["author"] = author.get("name", "")
                else:
                    plugin_meta["author"] = str(author)

            # Synthesize a base instruction from the manifest description
            desc = manifest.get("description", "")
            name = manifest.get("name", "")
            if desc:
                base_text = f"Plugin: {name}\n{desc}" if name else desc

        if base_text:
            scopes.append(ImportedScope(".", NAME, base_text))

        # --- Commands: commands/*.md ---
        cmds_dir = plugin_root / "commands"
        if cmds_dir.is_dir():
            for f in sorted(cmds_dir.glob("*.md")):
                content = f.read_text("utf-8").strip()
                if content:
                    capabilities.append(ImportedCapability("command", f.stem, content, NAME))

        # --- Skills: skills/*/SKILL.md ---
        skills_dir = plugin_root / "skills"
        if skills_dir.is_dir():
            for skill_dir in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
                skill_file = skill_dir / "SKILL.md"
                if skill_file.is_file():
                    content = skill_file.read_text("utf-8").strip()
                    if content:
                        capabilities.append(ImportedCapability("skill", skill_dir.name, content, NAME))

        # --- Agents: agents/*.md ---
        agents_dir = plugin_root / "agents"
        if agents_dir.is_dir():
            for f in sorted(agents_dir.glob("*.md")):
                content = f.read_text("utf-8").strip()
                if content:
                    capabilities.append(ImportedCapability("agent", f.stem, content, NAME))

        # --- Hooks: hooks/hooks.json ---
        hooks_file = plugin_root / "hooks" / "hooks.json"
        hooks_data = safe_json_load(hooks_file)
        if hooks_data:
            for event, rules in hooks_data.get("hooks", {}).items():
                if isinstance(rules, list) and rules:
                    hooks.append(ImportedHook(event, rules, NAME))

        # --- Hooks from settings.json ---
        settings_data = safe_json_load(plugin_root / "settings.json")
        if settings_data:
            for event, rules in settings_data.get("hooks", {}).items():
                if isinstance(rules, list) and rules:
                    hooks.append(ImportedHook(event, rules, NAME))

        # --- MCP: .mcp.json ---
        mcp_servers.extend(import_mcp_from_json(plugin_root / ".mcp.json", NAME))

        # --- LSP: .lsp.json ---
        lsp_data = safe_json_load(plugin_root / ".lsp.json")
        if lsp_data:
            for lsp_name, config in lsp_data.items():
                lsp_servers.append(ImportedLsp(lsp_name, config, NAME))

    if not scopes and not capabilities and not mcp_servers and not hooks and not lsp_servers and not plugin_meta:
        return None

    return ImportResult(NAME, scopes, capabilities, mcp_servers, hooks, lsp_servers, plugin_meta)
