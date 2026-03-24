"""Importers: reverse-engineer native tool files back to .aictx intermediate repr."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ImportedScope:
    """Instructions extracted from one tool for one scope."""
    rel_path: str          # "." or "src/api"
    source: str            # "claude" | "copilot" | "cursor"
    base_text: str
    profile_name: str | None = None
    profile_text: str = ""


@dataclass
class ImportedCapability:
    kind: str              # "command" | "agent" | "skill"
    name: str
    content: str
    source: str


@dataclass
class ImportedMcp:
    name: str
    config: dict
    source: str


@dataclass
class ImportedHook:
    event: str           # PreToolUse, PostToolUse, Stop, etc.
    rules: list[dict]    # list of hook rule objects
    source: str


@dataclass
class ImportedLsp:
    name: str
    config: dict
    source: str


@dataclass
class ImportResult:
    source: str
    scopes: list[ImportedScope] = field(default_factory=list)
    capabilities: list[ImportedCapability] = field(default_factory=list)
    mcp_servers: list[ImportedMcp] = field(default_factory=list)
    hooks: list[ImportedHook] = field(default_factory=list)
    lsp_servers: list[ImportedLsp] = field(default_factory=list)
