"""Parse .context.aictx files.

Section name grammar:
    [base]                              instructions, always
    [debug]                             instructions, profile-specific
    [command:_always:status]            slash command
    [command:debug:investigate]         profile-specific command
    [agent:_always:planner]             custom agent
    [skill:debug:flame-graph]           agent skill
    [mcp:_always:github]                MCP server (content is JSON)
    [memory:debug]                      memory hints for profile
    [inherit]                           inheritance directives
    [exclude]                           exclusions from template

Returns a ParsedAictx with typed access to each category.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

AICTX_FILENAME = ".context.aictx"

# type:profile:name  or  type:name  or  name
_SECTION_RE = re.compile(r"^\[([^\]]+)\]$")


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
class ParsedAictx:
    path: Path
    instructions: dict[str, str] = field(default_factory=dict)
    # instructions["base"] = "...", instructions["debug"] = "..."
    capabilities: list[Capability] = field(default_factory=list)
    mcp_servers: list[McpServer] = field(default_factory=list)
    memory_hints: dict[str, str] = field(default_factory=dict)
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

    def memory_for(self, profile: str | None) -> str | None:
        """Get _always + profile memory hints."""
        parts = []
        if "_always" in self.memory_hints:
            parts.append(self.memory_hints["_always"])
        if profile and profile in self.memory_hints:
            parts.append(self.memory_hints[profile])
        return "\n\n".join(parts) if parts else None

    def should_inherit(self, direction: str, kind: str) -> bool:
        """Check if this .aictx inherits a capability kind from parent/recursive."""
        return kind in self.inherit.get(direction, [])


def parse_aictx(path: Path) -> ParsedAictx | None:
    """Parse a .context.aictx file."""
    if not path.is_file():
        return None

    raw = path.read_text(encoding="utf-8")
    result = ParsedAictx(path=path)

    # Parse into raw sections
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in raw.splitlines():
        m = _SECTION_RE.match(line.strip())
        if m:
            current = m.group(1).strip()
            sections.setdefault(current, [])
            continue
        if current is None:
            continue  # skip lines before first section
        sections[current].append(line)

    # Classify each section
    for header, lines in sections.items():
        content = "\n".join(lines).strip()
        if not content:
            continue

        parts = header.split(":")
        parts = [p.strip() for p in parts]

        if len(parts) == 1:
            name = parts[0].lower()
            if name == "inherit":
                _parse_inherit(content, result)
            elif name == "exclude":
                result.excludes = [l.strip() for l in content.splitlines() if l.strip()]
            else:
                # Simple instruction section: [base], [debug], [docs], etc.
                result.instructions[name] = content

        elif len(parts) == 3:
            kind, profile, name = parts[0].lower(), parts[1], parts[2]
            if kind in ("command", "agent", "skill"):
                result.capabilities.append(Capability(kind, profile, name, content))
            elif kind == "mcp":
                try:
                    cfg = json.loads(content)
                    result.mcp_servers.append(McpServer(profile, name, cfg))
                except json.JSONDecodeError:
                    pass  # skip malformed
            elif kind == "memory":
                result.memory_hints[profile] = content

        elif len(parts) == 2:
            kind, profile_or_name = parts[0].lower(), parts[1]
            if kind == "memory":
                result.memory_hints[profile_or_name] = content

    return result


def _parse_inherit(content: str, result: ParsedAictx):
    """Parse [inherit] section.

    Format:
        parent: mcp, commands, skills
        recursive: skills
    """
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            direction, items = line.split(":", 1)
            direction = direction.strip().lower()
            items_list = [i.strip().lower() for i in items.split(",") if i.strip()]
            result.inherit[direction] = items_list
