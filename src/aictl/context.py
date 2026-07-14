# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Context pipeline: parse, scan, and feature-check .context.toml files.

Combines parser.py, scanner.py, and feature_matrix.py into one module.

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

import logging

from .fsutil import MAX_SCAN_DIRS, safe_iterdir

_log = logging.getLogger(__name__)

# ── Parser (from parser.py) ──

AICTX_FILENAME = ".context.toml"


@dataclass
class Capability:
    kind: str  # command | agent | skill
    profile: str  # _always | debug | docs | ...
    name: str  # investigate, planner, flame-graph
    content: str
    tools: list[str] = field(default_factory=list)  # allow-list of target tools
    not_tools: list[str] = field(default_factory=list)  # deny-list of target tools


@dataclass
class McpServer:
    profile: str
    name: str
    config: dict
    tools: list[str] = field(default_factory=list)
    not_tools: list[str] = field(default_factory=list)


@dataclass
class Hook:
    profile: str  # _always | debug | ...
    event: str  # PreToolUse | PostToolUse | Stop | SessionStart | ...
    rules: list[dict]  # list of hook rule objects


@dataclass
class LspServer:
    profile: str
    name: str
    config: dict
    tools: list[str] = field(default_factory=list)
    not_tools: list[str] = field(default_factory=list)


@dataclass
class Setting:
    profile: str  # _always | debug | ...
    key: str  # e.g. "teammateMode", "theme"
    value: object  # parsed JSON value


@dataclass
class Permission:
    profile: str  # _always | debug | ...
    patterns: list[str]  # e.g. ["Bash(npm run *)", "Read(*)"]


@dataclass
class EnvVars:
    profile: str  # _always | debug | ...
    vars: dict[str, str]  # e.g. {"DEBUG": "true", "NODE_ENV": "development"}


@dataclass
class IgnoreRule:
    profile: str  # _always | debug | ...
    patterns: list[str]  # gitignore-style patterns (one per line)


def _tool_match(item, tool: str | None) -> bool:
    """Return True if *item* targets *tool*.

    Filtering rules (omit both selectors → matches every tool):
      - ``not_tools`` is a deny-list; a tool listed here is always excluded.
      - ``tools`` is an allow-list; when non-empty only listed tools match.
      - When *tool* is None (no tool axis), the item always matches.
    Exclude wins: if a tool is in both lists, it is excluded.
    """
    if tool is None:
        return True
    if tool in (getattr(item, "not_tools", None) or []):
        return False
    allow = getattr(item, "tools", None) or []
    return tool in allow if allow else True


def _for_profile(items, profile: str | None, tool: str | None = None) -> list:
    """Filter items whose .profile is '_always' or matches the given profile.

    When *tool* is given, also apply each item's tools/not_tools selectors.
    """
    return [
        item
        for item in items
        if (item.profile == "_always" or item.profile == profile) and _tool_match(item, tool)
    ]


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

    def instructions_for(self, profile: str | None, tool: str | None = None) -> str:
        """Get base + profile instructions merged, including @tool overlays."""
        parts = [self.base_instructions_for(tool), self.profile_instructions_for(profile, tool)]
        return "\n\n".join(p for p in parts if p)

    def base_instructions_for(self, tool: str | None = None) -> str:
        """Base instructions plus an optional ``base@<tool>`` overlay (additive)."""
        parts = []
        if "base" in self.instructions:
            parts.append(self.instructions["base"])
        if tool and (key := f"base@{tool}") in self.instructions:
            parts.append(self.instructions[key])
        return "\n\n".join(parts)

    def profile_instructions_for(self, profile: str | None, tool: str | None = None) -> str:
        """Profile instructions plus an optional ``<profile>@<tool>`` overlay (additive)."""
        parts = []
        if profile and profile in self.instructions:
            parts.append(self.instructions[profile])
        if profile and tool and (key := f"{profile}@{tool}") in self.instructions:
            parts.append(self.instructions[key])
        return "\n\n".join(parts)

    def capabilities_for(self, profile: str | None, tool: str | None = None) -> list[Capability]:
        """Get _always + profile capabilities, optionally filtered by tool."""
        return _for_profile(self.capabilities, profile, tool)

    def mcp_for(self, profile: str | None, tool: str | None = None) -> dict[str, dict]:
        """Get _always + profile MCP servers as merged dict."""
        return {m.name: m.config for m in _for_profile(self.mcp_servers, profile, tool)}

    def hooks_for(self, profile: str | None, tool: str | None = None) -> dict[str, list[dict]]:
        """Get _always + profile hooks as merged dict of event → rules."""
        result: dict[str, list[dict]] = {}
        for h in _for_profile(self.hooks, profile, tool):
            result.setdefault(h.event, []).extend(h.rules)
        return result

    def lsp_for(self, profile: str | None, tool: str | None = None) -> dict[str, dict]:
        """Get _always + profile LSP servers as merged dict."""
        return {s.name: s.config for s in _for_profile(self.lsp_servers, profile, tool)}

    def memory_for(self, profile: str | None, tool: str | None = None) -> str | None:
        """Get _always + profile memory hints, including @tool overlays."""
        parts = []
        for key in ("_always", f"_always@{tool}" if tool else None, profile, f"{profile}@{tool}" if (profile and tool) else None):
            if key and key in self.memory_hints:
                parts.append(self.memory_hints[key])
        return "\n\n".join(parts) if parts else None

    def settings_for(self, profile: str | None, tool: str | None = None) -> dict[str, object]:
        """Get _always + profile settings as merged dict of key → value."""
        return {s.key: s.value for s in _for_profile(self.settings, profile, tool)}

    def permissions_for(self, profile: str | None, tool: str | None = None) -> list[str]:
        """Get _always + profile permission patterns as merged list."""
        result: list[str] = []
        for p in _for_profile(self.permissions, profile, tool):
            result.extend(p.patterns)
        return result

    def env_for(self, profile: str | None, tool: str | None = None) -> dict[str, str]:
        """Get _always + profile env vars as merged dict."""
        result: dict[str, str] = {}
        for e in _for_profile(self.env_vars, profile, tool):
            result.update(e.vars)
        return result

    def ignores_for(self, profile: str | None, tool: str | None = None) -> list[str]:
        """Get _always + profile ignore patterns, deduplicated."""
        seen: set[str] = set()
        result: list[str] = []
        for ig in _for_profile(self.ignores, profile, tool):
            for p in ig.patterns:
                if p not in seen:
                    seen.add(p)
                    result.append(p)
        return result


def _as_tool_list(value: object) -> list[str]:
    """Normalize a tools/not_tools selector into a lowercased list of tool ids."""
    if isinstance(value, str):
        return [value.strip().lower()] if value.strip() else []
    if isinstance(value, list):
        return [str(v).strip().lower() for v in value if str(v).strip()]
    return []


def parse_aictx(path: Path) -> ParsedAictx | None:
    """Parse a .context.toml file.

    Returns ``None`` (with a warning logged) when the file is missing,
    unreadable, or contains invalid TOML. Callers treat ``None`` as
    "skip this file" so one malformed file can't abort discovery
    (RefreshLoop) or crash the CLI with a traceback.
    """
    if not path.is_file():
        return None

    try:
        with open(path, "rb") as f:
            doc = tomllib.load(f)
    except (tomllib.TOMLDecodeError, OSError) as exc:
        _log.warning("Skipping malformed context file %s: %s", path, exc)
        return None

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
                    tools = _as_tool_list(entry.get("tools"))
                    not_tools = _as_tool_list(entry.get("not_tools"))
                elif isinstance(entry, str):
                    content = entry.strip()
                    tools = []
                    not_tools = []
                else:
                    continue
                if content:
                    result.capabilities.append(
                        Capability(singular, profile, name, content, tools, not_tools)
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
                    tools = _as_tool_list(cfg.get("tools"))
                    not_tools = _as_tool_list(cfg.get("not_tools"))
                    clean = {k: v for k, v in cfg.items() if k not in ("tools", "not_tools")}
                    result.mcp_servers.append(McpServer(profile, name, clean, tools, not_tools))

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
                tools = _as_tool_list(cfg.get("tools"))
                not_tools = _as_tool_list(cfg.get("not_tools"))
                clean = {k: v for k, v in cfg.items() if k not in ("tools", "not_tools")}
                result.lsp_servers.append(LspServer(profile, name, clean, tools, not_tools))

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


# ── Scanner (from scanner.py) ──

SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".claude",
    ".github",
    ".cursor",
    ".ai-deployed",
    "dist",
    "build",
    "target",
    "out",
    "bin",
    "obj",
}


def scan(root: Path) -> list[tuple[str, ParsedAictx]]:
    """Walk root downward, return [(relative_path, parsed)] sorted by depth.

    relative_path is "." for root, "services/ingestion" for children, etc.
    """
    root = root.resolve()
    results: list[tuple[str, ParsedAictx]] = []

    for aictx_file in _walk(root):
        rel = aictx_file.parent.relative_to(root)
        rel_str = str(rel) if str(rel) != "." else "."
        parsed = parse_aictx(aictx_file)
        if parsed:
            results.append((rel_str, parsed))

    # Sort: root first, then by path depth
    results.sort(key=lambda x: (x[0] != ".", x[0].replace("\\", "/").count("/"), x[0]))
    return results


def _walk(root: Path, _budget: list[int] | None = None):
    """Yield .context.toml files, root first, then children.

    *_budget* is a single-element mutable directory budget shared across the
    recursion so that pointing aictl at a huge root (a drive root, a home
    directory, ...) can't turn the scan into an endless full-filesystem walk.
    Callers normally omit it; it defaults to :data:`MAX_SCAN_DIRS`.
    """
    if _budget is None:
        _budget = [MAX_SCAN_DIRS]
    f = root / AICTX_FILENAME
    if f.is_file():
        yield f
    if _budget[0] <= 0:
        return
    _budget[0] -= 1
    for item in safe_iterdir(root):
        if item.is_dir() and item.name not in SKIP_DIRS:
            if _budget[0] <= 0:
                _log.warning("context.scan: hit %d-directory cap, stopping scan", MAX_SCAN_DIRS)
                return
            yield from _walk(item, _budget)


# ── Feature matrix (from feature_matrix.py) ──

# Feature support by tool: {section_kind: {tool_name: supported}}
FEATURE_SUPPORT: dict[str, dict[str, bool]] = {
    "command": {
        "claude": True,
        "copilot": True,
        "cursor": False,
        "windsurf": False,
        "copilot365": False,
        "gemini": True,
    },
    "agent": {
        "claude": True,
        "copilot": True,
        "cursor": False,
        "windsurf": False,
        "copilot365": True,
        "gemini": False,
    },
    "skill": {"claude": True, "copilot": True, "cursor": False, "windsurf": False, "copilot365": False, "gemini": True},
    "hook": {"claude": True, "copilot": True, "cursor": False, "windsurf": False, "copilot365": False, "gemini": True},
    "lsp": {"claude": True, "copilot": False, "cursor": False, "windsurf": False, "copilot365": False, "gemini": False},
    "setting": {
        "claude": True,
        "copilot": False,
        "cursor": False,
        "windsurf": False,
        "copilot365": False,
        "gemini": True,
    },
    "permission": {
        "claude": True,
        "copilot": False,
        "cursor": False,
        "windsurf": False,
        "copilot365": False,
        "gemini": True,
    },
    "env": {"claude": True, "copilot": False, "cursor": False, "windsurf": False, "copilot365": False, "gemini": True},
    "ignore": {"claude": True, "copilot": True, "cursor": True, "windsurf": False, "copilot365": False, "gemini": True},
    "memory": {
        "claude": True,
        "copilot": False,
        "cursor": False,
        "windsurf": False,
        "copilot365": False,
        "gemini": False,
    },
}

ALL_TOOLS = ["claude", "copilot", "cursor", "windsurf", "copilot365", "gemini"]


def unsupported_tools(kind: str) -> list[str]:
    """Return list of tool names that do NOT support the given section kind.

    Returns empty list if the kind is not in the matrix (e.g. instructions,
    inherit, exclude — these are universal or structural).
    """
    support = FEATURE_SUPPORT.get(kind)
    if support is None:
        return []
    return [tool for tool in ALL_TOOLS if not support.get(tool, False)]


def check_parsed_features(parsed) -> list[tuple[str, str, list[str]]]:
    """Check a ParsedAictx for features unsupported by target tools.

    Returns a list of (kind, section_label, unsupported_tools) tuples.
    Each entry represents one section type that has at least one unsupported tool.
    """
    warnings: list[tuple[str, str, list[str]]] = []

    # Capabilities have dynamic kinds (command/agent/skill)
    for cap in parsed.capabilities:
        if tools := unsupported_tools(cap.kind):
            warnings.append((cap.kind, f"{cap.kind}:{cap.profile}:{cap.name}", tools))

    # All other section types have a fixed kind; memory_hints is a dict so iteration yields profile keys
    for kind, items, label_fn in [
        ("hook", parsed.hooks, lambda h: f"hook:{h.profile}:{h.event}"),
        ("lsp", parsed.lsp_servers, lambda s: f"lsp:{s.profile}:{s.name}"),
        ("setting", parsed.settings, lambda s: f"setting:{s.profile}:{s.key}"),
        ("permission", parsed.permissions, lambda p: f"permission:{p.profile}"),
        ("env", parsed.env_vars, lambda e: f"env:{e.profile}"),
        ("ignore", parsed.ignores, lambda i: f"ignore:{i.profile}"),
        ("memory", parsed.memory_hints, lambda p: f"memory:{p}"),
    ]:
        if (tools := unsupported_tools(kind)) and items:
            for item in items:
                warnings.append((kind, label_fn(item), tools))

    return warnings
