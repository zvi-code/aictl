# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Parse .context.toml files.

TOML table mapping:
    [instructions]                      base/profile text (key = profile name)
    [commands.<profile>.<name>]         slash command  (content key)
    [agents.<profile>.<name>]           custom agent   (content key)
    [skills.<profile>.<name>]           agent skill    (content key)
    [mcp.<profile>.<name>]              MCP server     (native TOML table)
    [hooks.<profile>]                   lifecycle hooks (event = JSON string)
    [lsp.<profile>.<name>]              LSP server     (native TOML table)
    [settings.<profile>]                arbitrary settings (key = value)
    [permissions]                       tool patterns  (profile = [patterns])
    [env.<profile>]                     environment variables (KEY = "value")
    [ignores]                           ignore patterns (profile = [patterns])
    [memory]                            memory hints   (profile = "text")
    [plugin]                            plugin metadata (name, version, etc.)
    [inherit]                           inheritance    (direction = [kinds])
    exclude = [...]                     exclusions     (top-level array)

Returns a ParsedAictx with typed access to each category.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:
    import tomli as tomllib  # type: ignore[no-redef]

AICTX_FILENAME = ".context.toml"


@dataclass
class Capability:
    kind: str        # command | agent | skill
    profile: str     # _always | debug | docs | ...
    name: str        # investigate, planner, flame-graph
    content: str


@dataclass
class McpServer:
    profile: str
    name: str
    config: dict


@dataclass
class Hook:
    profile: str     # _always | debug | ...
    event: str       # PreToolUse | PostToolUse | Stop | SessionStart | ...
    rules: list[dict]  # list of hook rule objects


@dataclass
class LspServer:
    profile: str
    name: str
    config: dict


@dataclass
class Setting:
    profile: str     # _always | debug | ...
    key: str         # e.g. "teammateMode", "theme"
    value: object    # parsed JSON value


@dataclass
class Permission:
    profile: str     # _always | debug | ...
    patterns: list[str]  # e.g. ["Bash(npm run *)", "Read(*)"]


@dataclass
class EnvVars:
    profile: str     # _always | debug | ...
    vars: dict[str, str]  # e.g. {"DEBUG": "true", "NODE_ENV": "development"}


@dataclass
class IgnoreRule:
    profile: str         # _always | debug | ...
    patterns: list[str]  # gitignore-style patterns (one per line)


@dataclass
class ParsedAictx:
    path: Path
    instructions: dict[str, str] = field(default_factory=dict)
    # instructions["base"] = "...", instructions["debug"] = "..."
    capabilities: list[Capability] = field(default_factory=list)
    mcp_servers: list[McpServer] = field(default_factory=list)
    hooks: list[Hook] = field(default_factory=list)
    lsp_servers: list[LspServer] = field(default_factory=list)
    settings: list[Setting] = field(default_factory=list)
    permissions: list[Permission] = field(default_factory=list)
    env_vars: list[EnvVars] = field(default_factory=list)
    ignores: list[IgnoreRule] = field(default_factory=list)
    memory_hints: dict[str, str] = field(default_factory=dict)
    plugin_meta: dict[str, str] = field(default_factory=dict)
    # plugin_meta["name"] = "my-plugin", plugin_meta["version"] = "1.0.0", etc.
    inherit: dict[str, list[str]] = field(default_factory=dict)
    # inherit["parent"] = ["mcp", "commands"]
    # inherit["recursive"] = ["skills"]
    excludes: list[str] = field(default_factory=list)

    def instructions_for(self, profile: str | None) -> str:
        """Get base + profile instructions merged."""
        parts = []
        if "base" in self.instructions:
            parts.append(self.instructions["base"])
        if profile and profile in self.instructions:
            parts.append(self.instructions[profile])
        return "\n\n".join(parts)

    def capabilities_for(self, profile: str | None) -> list[Capability]:
        """Get _always + profile capabilities."""
        return [
            c for c in self.capabilities
            if c.profile == "_always" or c.profile == profile
        ]

    def mcp_for(self, profile: str | None) -> dict[str, dict]:
        """Get _always + profile MCP servers as merged dict."""
        servers = {}
        for m in self.mcp_servers:
            if m.profile == "_always" or m.profile == profile:
                servers[m.name] = m.config
        return servers

    def hooks_for(self, profile: str | None) -> dict[str, list[dict]]:
        """Get _always + profile hooks as merged dict of event → rules."""
        result: dict[str, list[dict]] = {}
        for h in self.hooks:
            if h.profile == "_always" or h.profile == profile:
                result.setdefault(h.event, []).extend(h.rules)
        return result

    def lsp_for(self, profile: str | None) -> dict[str, dict]:
        """Get _always + profile LSP servers as merged dict."""
        servers = {}
        for s in self.lsp_servers:
            if s.profile == "_always" or s.profile == profile:
                servers[s.name] = s.config
        return servers

    def memory_for(self, profile: str | None) -> str | None:
        """Get _always + profile memory hints."""
        parts = []
        if "_always" in self.memory_hints:
            parts.append(self.memory_hints["_always"])
        if profile and profile in self.memory_hints:
            parts.append(self.memory_hints[profile])
        return "\n\n".join(parts) if parts else None

    def settings_for(self, profile: str | None) -> dict[str, object]:
        """Get _always + profile settings as merged dict of key → value."""
        result: dict[str, object] = {}
        for s in self.settings:
            if s.profile == "_always" or s.profile == profile:
                result[s.key] = s.value
        return result

    def permissions_for(self, profile: str | None) -> list[str]:
        """Get _always + profile permission patterns as merged list."""
        result: list[str] = []
        for p in self.permissions:
            if p.profile == "_always" or p.profile == profile:
                result.extend(p.patterns)
        return result

    def env_for(self, profile: str | None) -> dict[str, str]:
        """Get _always + profile env vars as merged dict."""
        result: dict[str, str] = {}
        for e in self.env_vars:
            if e.profile == "_always" or e.profile == profile:
                result.update(e.vars)
        return result

    def ignores_for(self, profile: str | None) -> list[str]:
        """Get _always + profile ignore patterns, deduplicated."""
        seen: set[str] = set()
        result: list[str] = []
        for ig in self.ignores:
            if ig.profile == "_always" or ig.profile == profile:
                for p in ig.patterns:
                    if p not in seen:
                        seen.add(p)
                        result.append(p)
        return result

    def should_inherit(self, direction: str, kind: str) -> bool:
        """Check if this .aictx inherits a capability kind from parent/recursive."""
        return kind in self.inherit.get(direction, [])


def parse_aictx(path: Path) -> ParsedAictx | None:
    """Parse a .context.toml file."""
    if not path.is_file():
        return None

    with open(path, "rb") as f:
        doc = tomllib.load(f)

    result = ParsedAictx(path=path)

    # --- instructions ---
    for profile, text in doc.get("instructions", {}).items():
        if isinstance(text, str) and text.strip():
            result.instructions[profile.lower()] = text.strip()

    # --- capabilities (commands, agents, skills) ---
    for kind in ("commands", "agents", "skills"):
        singular = kind.rstrip("s")  # command, agent, skill
        for profile, names in doc.get(kind, {}).items():
            if not isinstance(names, dict):
                continue
            for name, entry in names.items():
                if isinstance(entry, dict):
                    content = entry.get("content", "").strip()
                elif isinstance(entry, str):
                    content = entry.strip()
                else:
                    continue
                if content:
                    result.capabilities.append(
                        Capability(singular, profile, name, content)
                    )

    # --- mcp servers (native TOML tables) ---
    for profile, servers in doc.get("mcp", {}).items():
        if not isinstance(servers, dict):
            continue
        # Check if this is a single server (has non-dict values like "type")
        # or a profile containing multiple servers
        if servers and not any(isinstance(v, dict) for v in servers.values()):
            # Single server directly under profile key — means profile is
            # actually the server name and we need to go up a level.
            # This shouldn't happen in the schema, but handle gracefully.
            pass
        else:
            for name, cfg in servers.items():
                if isinstance(cfg, dict):
                    result.mcp_servers.append(McpServer(profile, name, cfg))

    # --- hooks (event = JSON string) ---
    for profile, events in doc.get("hooks", {}).items():
        if not isinstance(events, dict):
            continue
        for event, rules_str in events.items():
            try:
                rules = json.loads(rules_str) if isinstance(rules_str, str) else rules_str
                if isinstance(rules, dict):
                    rules = [rules]
                if isinstance(rules, list):
                    result.hooks.append(Hook(profile, event, rules))
            except (json.JSONDecodeError, TypeError):
                pass  # skip malformed

    # --- lsp servers (native TOML tables) ---
    for profile, servers in doc.get("lsp", {}).items():
        if not isinstance(servers, dict):
            continue
        for name, cfg in servers.items():
            if isinstance(cfg, dict):
                result.lsp_servers.append(LspServer(profile, name, cfg))

    # --- settings ---
    for profile, kvs in doc.get("settings", {}).items():
        if not isinstance(kvs, dict):
            continue
        for key, value in kvs.items():
            result.settings.append(Setting(profile, key, value))

    # --- permissions ---
    for profile, patterns in doc.get("permissions", {}).items():
        if isinstance(patterns, list) and patterns:
            result.permissions.append(Permission(profile, patterns))

    # --- env ---
    for profile, kvs in doc.get("env", {}).items():
        if isinstance(kvs, dict) and kvs:
            result.env_vars.append(EnvVars(profile, {k: str(v) for k, v in kvs.items()}))

    # --- ignores ---
    for profile, patterns in doc.get("ignores", {}).items():
        if isinstance(patterns, list) and patterns:
            result.ignores.append(IgnoreRule(profile, patterns))

    # --- memory ---
    for profile, text in doc.get("memory", {}).items():
        if isinstance(text, str) and text.strip():
            result.memory_hints[profile] = text.strip()

    # --- plugin ---
    plugin = doc.get("plugin", {})
    if isinstance(plugin, dict):
        for k, v in plugin.items():
            if isinstance(v, str):
                result.plugin_meta[k.lower()] = v

    # --- inherit ---
    inherit = doc.get("inherit", {})
    if isinstance(inherit, dict):
        for direction, kinds in inherit.items():
            if isinstance(kinds, list):
                result.inherit[direction.lower()] = [k.lower() for k in kinds]

    # --- exclude ---
    excludes = doc.get("exclude", [])
    if isinstance(excludes, list):
        result.excludes = [str(e) for e in excludes]

    return result
