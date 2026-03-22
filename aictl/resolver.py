# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Resolve scanned .aictx files into deployable context.

Rules:
  - Instructions: every .aictx in subtree generates scoped instruction files
  - Capabilities (commands, skills, agents, MCP): root only
  - Inheritance: explicit via [inherit] section in child or root
  - Memory hints: root only, keyed to profile
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .parser import ParsedAictx, Capability, McpServer, Hook, LspServer, Setting, Permission, EnvVars, IgnoreRule


@dataclass
class ScopeOutput:
    """Resolved output for one .aictx scope."""
    rel_path: str          # "." or "services/ingestion"
    base: str              # base instructions (always-on)
    profile_text: str      # profile-specific instructions (may be empty)
    is_root: bool


@dataclass
class Resolved:
    """Complete resolved output for deployment."""
    root: Path
    profile: str | None
    scopes: list[ScopeOutput]                # instructions per scope
    capabilities: list[Capability]            # commands, agents, skills
    mcp_servers: dict[str, dict]              # merged MCP
    hooks: dict[str, list[dict]]             # event → list of hook rules
    lsp_servers: dict[str, dict]             # merged LSP servers
    settings: dict[str, object]              # merged settings key → value
    permissions: list[str]                   # merged permission patterns
    env: dict[str, str]                      # merged env vars
    ignores: list[str]                       # merged ignore patterns
    memory_hints: str | None                  # memory hints for root+profile


def resolve(
    root: Path,
    scanned: list[tuple[str, ParsedAictx]],
    profile: str | None,
) -> Resolved:
    """Resolve all scanned .aictx into deployable output.

    Args:
        root: the deployment root directory
        scanned: list of (rel_path, parsed) from scanner
        profile: active profile name or None
    """
    if not scanned:
        return Resolved(root, profile, [], [], {}, {}, {}, {}, [], {}, [], None)

    # Build lookup
    by_path: dict[str, ParsedAictx] = {rel: p for rel, p in scanned}
    root_parsed = by_path.get(".")

    # --- Instructions: every scope ---
    scopes = []
    for rel, parsed in scanned:
        base = parsed.instructions.get("base", "")
        prof_text = parsed.instructions.get(profile, "") if profile else ""
        if base or prof_text:
            scopes.append(ScopeOutput(rel, base, prof_text, is_root=(rel == ".")))

    # --- Capabilities: root only, plus inheritance ---
    caps: list[Capability] = []
    mcp: dict[str, dict] = {}
    hooks: dict[str, list[dict]] = {}
    lsp: dict[str, dict] = {}

    if root_parsed:
        # Root's own capabilities
        caps.extend(root_parsed.capabilities_for(profile))
        mcp.update(root_parsed.mcp_for(profile))
        # Root's hooks and LSP
        for event, rules in root_parsed.hooks_for(profile).items():
            hooks.setdefault(event, []).extend(rules)
        lsp.update(root_parsed.lsp_for(profile))

        # Root says recursive: pull children's capabilities up
        for kind in root_parsed.inherit.get("recursive", []):
            for rel, parsed in scanned:
                if rel == ".":
                    continue
                if kind in ("commands", "command"):
                    caps.extend(c for c in parsed.capabilities_for(profile) if c.kind == "command")
                elif kind in ("skills", "skill"):
                    caps.extend(c for c in parsed.capabilities_for(profile) if c.kind == "skill")
                elif kind in ("agents", "agent"):
                    caps.extend(c for c in parsed.capabilities_for(profile) if c.kind == "agent")
                elif kind == "mcp":
                    mcp.update(parsed.mcp_for(profile))
                elif kind in ("hooks", "hook"):
                    for event, rules in parsed.hooks_for(profile).items():
                        hooks.setdefault(event, []).extend(rules)
                elif kind == "lsp":
                    lsp.update(parsed.lsp_for(profile))

    # Children that say parent: inherit
    for rel, parsed in scanned:
        if rel == ".":
            continue
        for kind in parsed.inherit.get("parent", []):
            if kind in ("commands", "command"):
                caps.extend(c for c in parsed.capabilities_for(profile) if c.kind == "command")
            elif kind in ("skills", "skill"):
                caps.extend(c for c in parsed.capabilities_for(profile) if c.kind == "skill")
            elif kind in ("agents", "agent"):
                caps.extend(c for c in parsed.capabilities_for(profile) if c.kind == "agent")
            elif kind == "mcp":
                mcp.update(parsed.mcp_for(profile))
            elif kind in ("hooks", "hook"):
                for event, rules in parsed.hooks_for(profile).items():
                    hooks.setdefault(event, []).extend(rules)
            elif kind == "lsp":
                lsp.update(parsed.lsp_for(profile))

    # --- Apply excludes ---
    if root_parsed:
        excludes = set(root_parsed.excludes)
        if excludes:
            caps = [c for c in caps if f"{c.kind}:{c.profile}:{c.name}" not in excludes]
            mcp = {k: v for k, v in mcp.items()
                   if f"mcp:{profile}:{k}" not in excludes and f"mcp:_always:{k}" not in excludes}
            hooks = {e: r for e, r in hooks.items()
                     if f"hook:{profile}:{e}" not in excludes and f"hook:_always:{e}" not in excludes}
            lsp = {k: v for k, v in lsp.items()
                   if f"lsp:{profile}:{k}" not in excludes and f"lsp:_always:{k}" not in excludes}

    # --- Deduplicate capabilities (last wins) ---
    seen: dict[tuple, int] = {}
    for i, c in enumerate(caps):
        seen[(c.kind, c.name)] = i
    caps = [caps[i] for i in sorted(seen.values())]

    # --- Settings, permissions, env, ignores: root only ---
    settings: dict[str, object] = root_parsed.settings_for(profile) if root_parsed else {}
    permissions: list[str] = root_parsed.permissions_for(profile) if root_parsed else []
    env: dict[str, str] = root_parsed.env_for(profile) if root_parsed else {}
    ignores: list[str] = root_parsed.ignores_for(profile) if root_parsed else []

    # --- Memory hints: root only ---
    memory = root_parsed.memory_for(profile) if root_parsed else None

    return Resolved(
        root=root,
        profile=profile,
        scopes=scopes,
        capabilities=caps,
        mcp_servers=mcp,
        hooks=hooks,
        lsp_servers=lsp,
        settings=settings,
        permissions=permissions,
        env=env,
        ignores=ignores,
        memory_hints=memory,
    )
