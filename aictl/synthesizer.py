# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Synthesize ImportResults into .context.toml files.

Takes parsed data from multiple importers, merges/deduplicates,
and writes .context.toml files at the appropriate directory levels.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from collections.abc import Callable

import tomli_w

from .importers import ImportResult, ImportedScope, ImportedCapability, ImportedMcp, ImportedHook, ImportedLsp
from .context import AICTX_FILENAME
from .utils import write_safe


@dataclass
class AictxFile:
    """Represents one .context.toml file to be generated."""
    rel_path: str
    base_text: str = ""
    profile_name: str | None = None
    profile_text: str = ""
    capabilities: list[ImportedCapability] = field(default_factory=list)
    mcp_servers: list[ImportedMcp] = field(default_factory=list)
    hooks: list[ImportedHook] = field(default_factory=list)
    lsp_servers: list[ImportedLsp] = field(default_factory=list)
    plugin_meta: dict[str, str] = field(default_factory=dict)


def synthesize(
    root: Path,
    imports: list[ImportResult],
    prefer: str | None = None,
    profile: str | None = None,
    dry_run: bool = False,
) -> list[dict]:
    """Merge import results and write .context.toml files.

    Returns list of {"path": str, "rel_path": str} for each file written.
    """
    aictx_files = _merge(imports, prefer, profile)
    results = []

    for af in aictx_files:
        content = _serialize(af)
        if not content.strip():
            continue

        if af.rel_path == ".":
            fp = root / AICTX_FILENAME
        else:
            fp = root / af.rel_path / AICTX_FILENAME

        if not dry_run:
            write_safe(fp, content)
        results.append({"path": str(fp), "rel_path": af.rel_path})

    return results


def _dedup(imports: list[ImportResult], attr: str, key_fn, prefer: str | None) -> list:
    """Collect items from all imports, deduplicating by key_fn; prefer wins ties."""
    result: dict = {}
    for imp in imports:
        for item in getattr(imp, attr):
            k = key_fn(item)
            if k not in result or (prefer and imp.source == prefer):
                result[k] = item
    return list(result.values())


def _merge(
    imports: list[ImportResult],
    prefer: str | None,
    profile_override: str | None,
) -> list[AictxFile]:
    """Merge all import results into a list of AictxFile objects."""
    # Group scopes by rel_path
    scope_groups: dict[str, list[ImportedScope]] = {}
    for imp in imports:
        for scope in imp.scopes:
            scope_groups.setdefault(scope.rel_path, []).append(scope)

    # Detect profile name (from any importer, or CLI override)
    detected_profile = profile_override
    if not detected_profile:
        for imp in imports:
            for scope in imp.scopes:
                if scope.profile_name:
                    detected_profile = scope.profile_name
                    break
            if detected_profile:
                break

    # Build AictxFile per scope
    aictx_files: list[AictxFile] = []
    for rel_path in sorted(scope_groups, key=lambda p: (p != ".", p)):
        scopes = scope_groups[rel_path]
        base_text = _pick_best(scopes, prefer, lambda s: s.base_text)
        profile_text = _pick_best(scopes, prefer, lambda s: s.profile_text)

        aictx_files.append(AictxFile(
            rel_path=rel_path,
            base_text=base_text,
            profile_name=detected_profile if profile_text else None,
            profile_text=profile_text,
        ))

    all_caps  = _dedup(imports, "capabilities", lambda c: (c.kind, c.name), prefer)
    all_mcp   = _dedup(imports, "mcp_servers",  lambda m: m.name,           prefer)
    all_hooks = _dedup(imports, "hooks",         lambda h: h.event,          prefer)
    all_lsp   = _dedup(imports, "lsp_servers",  lambda s: s.name,           prefer)

    # Attach capabilities + MCP + hooks + LSP to root scope
    root_file = next((f for f in aictx_files if f.rel_path == "."), None)
    if root_file is None and (all_caps or all_mcp or all_hooks or all_lsp):
        root_file = AictxFile(rel_path=".")
        aictx_files.insert(0, root_file)

    if root_file:
        root_file.capabilities = all_caps
        root_file.mcp_servers  = all_mcp
        root_file.hooks        = all_hooks
        root_file.lsp_servers  = all_lsp

    # Plugin metadata: extract from any import that carries plugin_meta
    plugin_meta: dict[str, str] = {}
    for imp in imports:
        if imp.plugin_meta:
            for k, v in imp.plugin_meta.items():
                plugin_meta.setdefault(k, v)

    if plugin_meta:
        if root_file is None:
            root_file = AictxFile(rel_path=".")
            aictx_files.insert(0, root_file)
        root_file.plugin_meta = plugin_meta

    return aictx_files


def _pick_best(
    scopes: list[ImportedScope],
    prefer: str | None,
    extract: Callable[[ImportedScope], str],
) -> str:
    """Pick the best text from multiple scopes for the same rel_path."""
    # Prefer the requested source
    if prefer:
        for s in scopes:
            if s.source == prefer:
                val = extract(s)
                if val:
                    return val
    # Fallback: longest content wins
    best = ""
    for s in scopes:
        val = extract(s)
        if len(val) > len(best):
            best = val
    return best


def _serialize(af: AictxFile) -> str:
    """Serialize an AictxFile to .context.toml format."""
    data: dict = {}

    if af.plugin_meta:
        data["plugin"] = dict(af.plugin_meta)

    # Instructions
    instructions: dict = {}
    if af.base_text:
        instructions["base"] = af.base_text
    if af.profile_name and af.profile_text:
        instructions[af.profile_name] = af.profile_text
    if instructions:
        data["instructions"] = instructions

    # Capabilities (commands, agents, skills)
    for cap in af.capabilities:
        kind_plural = cap.kind + "s"
        data.setdefault(kind_plural, {}).setdefault("_always", {})[cap.name] = {
            "content": cap.content,
        }

    # MCP servers
    for mcp in af.mcp_servers:
        data.setdefault("mcp", {}).setdefault("_always", {})[mcp.name] = _sanitize(
            mcp.config,
        )

    # Hooks (stored as JSON strings)
    for hook in af.hooks:
        data.setdefault("hooks", {}).setdefault("_always", {})[hook.event] = json.dumps(
            hook.rules,
        )

    # LSP servers
    for lsp in af.lsp_servers:
        data.setdefault("lsp", {}).setdefault("_always", {})[lsp.name] = _sanitize(
            lsp.config,
        )

    return tomli_w.dumps(data) if data else ""


def _sanitize(obj: object) -> object:
    """Remove None values (unsupported in TOML) from nested structures."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj if v is not None]
    return obj
