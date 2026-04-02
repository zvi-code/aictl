# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Importers: reverse-engineer native tool files back to .aictx intermediate repr."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar


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
    plugin_meta: dict[str, str] = field(default_factory=dict)
    # plugin_meta is populated by the plugin importer from plugin.json manifest


# ── Registry (from registry.py) ──

from . import claude, copilot, cursor, windsurf, gemini, plugin

_IMPORTERS = {"claude": claude, "copilot": copilot, "cursor": cursor, "windsurf": windsurf, "gemini": gemini, "plugin": plugin}


def get(name: str):
    if name not in _IMPORTERS:
        raise SystemExit(f'Unknown importer "{name}". Available: {", ".join(_IMPORTERS)}')
    return _IMPORTERS[name]


def all_names() -> list[str]:
    return list(_IMPORTERS)


# ── BaseImporter ──

class BaseImporter(ABC):
    NAME: ClassVar[str]

    @abstractmethod
    def import_from(self, root) -> object | None: ...
