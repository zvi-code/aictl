# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Feature support matrix: which section types each target tool supports."""

from __future__ import annotations

# Feature support by tool: {section_kind: {tool_name: supported}}
FEATURE_SUPPORT: dict[str, dict[str, bool]] = {
    "command":    {"claude": True,  "copilot": True,  "cursor": False, "windsurf": False, "copilot365": False},
    "agent":      {"claude": False, "copilot": True,  "cursor": False, "windsurf": False, "copilot365": True},
    "skill":      {"claude": True,  "copilot": True,  "cursor": False, "windsurf": False, "copilot365": False},
    "hook":       {"claude": True,  "copilot": True,  "cursor": False, "windsurf": False, "copilot365": False},
    "lsp":        {"claude": True,  "copilot": False, "cursor": False, "windsurf": False, "copilot365": False},
    "setting":    {"claude": True,  "copilot": False, "cursor": False, "windsurf": False, "copilot365": False},
    "permission": {"claude": True,  "copilot": False, "cursor": False, "windsurf": False, "copilot365": False},
    "env":        {"claude": True,  "copilot": False, "cursor": False, "windsurf": False, "copilot365": False},
    "ignore":     {"claude": True,  "copilot": True,  "cursor": True,  "windsurf": False, "copilot365": False},
    "memory":     {"claude": True,  "copilot": False, "cursor": False, "windsurf": False, "copilot365": False},
}

ALL_TOOLS = ["claude", "copilot", "cursor", "windsurf", "copilot365"]


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

    # Capabilities: command, agent, skill
    for cap in parsed.capabilities:
        tools = unsupported_tools(cap.kind)
        if tools:
            label = f"{cap.kind}:{cap.profile}:{cap.name}"
            warnings.append((cap.kind, label, tools))

    # Hooks
    for hook in parsed.hooks:
        tools = unsupported_tools("hook")
        if tools:
            label = f"hook:{hook.profile}:{hook.event}"
            warnings.append(("hook", label, tools))

    # LSP servers
    for lsp in parsed.lsp_servers:
        tools = unsupported_tools("lsp")
        if tools:
            label = f"lsp:{lsp.profile}:{lsp.name}"
            warnings.append(("lsp", label, tools))

    # Settings
    for setting in parsed.settings:
        tools = unsupported_tools("setting")
        if tools:
            label = f"setting:{setting.profile}:{setting.key}"
            warnings.append(("setting", label, tools))

    # Permissions
    for perm in parsed.permissions:
        tools = unsupported_tools("permission")
        if tools:
            label = f"permission:{perm.profile}"
            warnings.append(("permission", label, tools))

    # Env vars
    for env in parsed.env_vars:
        tools = unsupported_tools("env")
        if tools:
            label = f"env:{env.profile}"
            warnings.append(("env", label, tools))

    # Ignores
    for ig in parsed.ignores:
        tools = unsupported_tools("ignore")
        if tools:
            label = f"ignore:{ig.profile}"
            warnings.append(("ignore", label, tools))

    # Memory hints
    for profile in parsed.memory_hints:
        tools = unsupported_tools("memory")
        if tools:
            label = f"memory:{profile}"
            warnings.append(("memory", label, tools))

    return warnings
