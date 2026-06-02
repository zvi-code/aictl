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

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .context import (
    Capability,
    ParsedAictx,
)
from .utils import WriteGuard


@dataclass
class ScopeOutput:
    """Resolved output for one .aictx scope."""

    rel_path: str  # "." or "services/ingestion"
    base: str  # base instructions (always-on)
    profile_text: str  # profile-specific instructions (may be empty)
    is_root: bool


@dataclass
class Resolved:
    """Complete resolved output for deployment."""

    root: Path
    profile: str | None
    scopes: list[ScopeOutput]  # instructions per scope
    capabilities: list[Capability]  # commands, agents, skills
    mcp_servers: dict[str, dict]  # merged MCP
    hooks: dict[str, list[dict]]  # event → list of hook rules
    lsp_servers: dict[str, dict]  # merged LSP servers
    settings: dict[str, object]  # merged settings key → value
    permissions: list[str]  # merged permission patterns
    env: dict[str, str]  # merged env vars
    ignores: list[str]  # merged ignore patterns
    memory_hints: str | None  # memory hints for root+profile
    tool: str | None = None  # target tool this output was resolved for


def _apply_kind(
    kind: str,
    parsed: ParsedAictx,
    profile: str | None,
    caps: list,
    mcp: dict,
    hooks: dict,
    lsp: dict,
    tool: str | None = None,
) -> None:
    """Pull one inherited kind from *parsed* into the shared collection containers."""
    if kind in ("commands", "command"):
        caps.extend(c for c in parsed.capabilities_for(profile, tool) if c.kind == "command")
    elif kind in ("skills", "skill"):
        caps.extend(c for c in parsed.capabilities_for(profile, tool) if c.kind == "skill")
    elif kind in ("agents", "agent"):
        caps.extend(c for c in parsed.capabilities_for(profile, tool) if c.kind == "agent")
    elif kind == "mcp":
        mcp.update(parsed.mcp_for(profile, tool))
    elif kind in ("hooks", "hook"):
        for event, rules in parsed.hooks_for(profile, tool).items():
            hooks.setdefault(event, []).extend(rules)
    elif kind == "lsp":
        lsp.update(parsed.lsp_for(profile, tool))


def resolve(
    root: Path,
    scanned: list[tuple[str, ParsedAictx]],
    profile: str | None,
    tool: str | None = None,
) -> Resolved:
    """Resolve all scanned .aictx into deployable output.

    Args:
        root: the deployment root directory
        scanned: list of (rel_path, parsed) from scanner
        profile: active profile name or None
        tool: target tool id (e.g. "claude"); when given, tool-specific
            ``@tool`` overlays and ``tools``/``not_tools`` selectors apply.
            When None, every tool-targeted item is included (no filtering).
    """
    if not scanned:
        return Resolved(root, profile, [], [], {}, {}, {}, {}, [], {}, [], None, tool)

    # Build lookup
    by_path: dict[str, ParsedAictx] = {rel: p for rel, p in scanned}
    root_parsed = by_path.get(".")

    # --- Instructions: every scope ---
    scopes = []
    for rel, parsed in scanned:
        base = parsed.base_instructions_for(tool)
        prof_text = parsed.profile_instructions_for(profile, tool) if profile else ""
        if base or prof_text:
            scopes.append(ScopeOutput(rel, base, prof_text, is_root=(rel == ".")))

    # --- Capabilities: root only, plus inheritance ---
    caps: list[Capability] = []
    mcp: dict[str, dict] = {}
    hooks: dict[str, list[dict]] = {}
    lsp: dict[str, dict] = {}

    if root_parsed:
        # Root's own capabilities
        caps.extend(root_parsed.capabilities_for(profile, tool))
        mcp.update(root_parsed.mcp_for(profile, tool))
        # Root's hooks and LSP
        for event, rules in root_parsed.hooks_for(profile, tool).items():
            hooks.setdefault(event, []).extend(rules)
        lsp.update(root_parsed.lsp_for(profile, tool))

        # Root says recursive: pull children's capabilities up
        for kind in root_parsed.inherit.get("recursive", []):
            for rel, parsed in scanned:
                if rel != ".":
                    _apply_kind(kind, parsed, profile, caps, mcp, hooks, lsp, tool)

    # Children that say parent: inherit
    for rel, parsed in scanned:
        if rel != ".":
            for kind in parsed.inherit.get("parent", []):
                _apply_kind(kind, parsed, profile, caps, mcp, hooks, lsp, tool)

    # --- Apply excludes ---
    if root_parsed:
        excludes = set(root_parsed.excludes)
        if excludes:
            caps = [c for c in caps if f"{c.kind}:{c.profile}:{c.name}" not in excludes]
            mcp = {
                k: v
                for k, v in mcp.items()
                if f"mcp:{profile}:{k}" not in excludes and f"mcp:_always:{k}" not in excludes
            }
            hooks = {
                e: r
                for e, r in hooks.items()
                if f"hook:{profile}:{e}" not in excludes and f"hook:_always:{e}" not in excludes
            }
            lsp = {
                k: v
                for k, v in lsp.items()
                if f"lsp:{profile}:{k}" not in excludes and f"lsp:_always:{k}" not in excludes
            }

    # --- Deduplicate capabilities (last wins) ---
    seen: dict[tuple, int] = {}
    for i, c in enumerate(caps):
        seen[(c.kind, c.name)] = i
    caps = [caps[i] for i in sorted(seen.values())]

    # --- Settings, permissions, env, ignores: root only ---
    settings: dict[str, object] = root_parsed.settings_for(profile, tool) if root_parsed else {}
    permissions: list[str] = root_parsed.permissions_for(profile, tool) if root_parsed else []
    env: dict[str, str] = root_parsed.env_for(profile, tool) if root_parsed else {}
    ignores: list[str] = root_parsed.ignores_for(profile, tool) if root_parsed else []

    # --- Memory hints: root only ---
    memory = root_parsed.memory_for(profile, tool) if root_parsed else None

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
        tool=tool,
    )


# ── Manifest (from manifest.py) ──

MANIFEST_DIR = ".ai-deployed"


def load_manifest(root: Path) -> dict | None:
    p = root / MANIFEST_DIR / "manifest.json"
    if p.is_file():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return None


def save_manifest(root: Path, profile: str | None, paths: list[str]) -> None:
    p = root / MANIFEST_DIR / "manifest.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps(
            {
                "deployed_at": datetime.now(timezone.utc).isoformat(),
                "profile": profile,
                "root": str(root),
                "files": paths,
            },
            indent=2,
        )
        + "\n"
    )


def cleanup_stale(root: Path, old: dict | None, new_paths: set[str]) -> list[str]:
    if not old or not old.get("files"):
        return []
    removed = []
    root_resolved = root.resolve()
    guard = WriteGuard.current()
    for f in old["files"]:
        p = Path(f)
        if str(p) not in new_paths and p.is_file():
            try:
                p_resolved = p.resolve()
            except OSError:
                continue
            if not p_resolved.is_relative_to(root_resolved):
                import click

                click.secho(
                    f"   \u26a0 skipping stale cleanup of {p} (outside {root})",
                    fg="yellow",
                )
                continue
            if guard:
                guard.confirm(p, "delete")
            try:
                p.unlink()
                removed.append(f)
                _clean_parents(p, root)
            except OSError:
                pass
    return removed


def _clean_parents(path: Path, stop: Path):
    d = path.parent
    s = stop.resolve()
    while True:
        try:
            d_resolved = d.resolve()
        except OSError:
            break
        if d_resolved == s or not d_resolved.is_relative_to(s):
            break
        try:
            if any(d.iterdir()):
                break
            d.rmdir()
        except OSError:
            break
        d = d.parent
