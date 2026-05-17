# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Synthesize ImportResults into .context.toml files.

Takes parsed data from multiple importers, merges/deduplicates,
and writes .context.toml files at the appropriate directory levels.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import tomli_w

from .context import AICTX_FILENAME
from .importers import (
    ImportedCapability,
    ImportedHook,
    ImportedLsp,
    ImportedMcp,
    ImportedScope,
    ImportResult,
)
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
    warnings: list[str] | None = None,
) -> list[dict]:
    """Merge import results and write .context.toml files.

    Returns list of ``{"path": str, "rel_path": str}`` for each file written.
    If *warnings* is provided, conflict diagnostics (profile-name disagreements
    between importers, capability/MCP/hook/LSP ties across sources) are
    appended to it so callers can surface them to the user.
    """
    aictx_files = _merge(imports, prefer, profile, warnings=warnings)
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


def _dedup(
    imports: list[ImportResult],
    attr: str,
    key_fn,
    prefer: str | None,
    *,
    warnings: list[str] | None = None,
    label: str | None = None,
) -> list:
    """Collect items from all imports, deduplicating by ``key_fn``.

    Tie-break: when *prefer* matches an importer's ``source``, that importer
    wins; otherwise the first importer to define a key wins. When two or more
    distinct importers define the same key the resolution is logged into
    *warnings* (if provided) so the user can see which source was kept.
    """
    result: dict = {}
    sources: dict = {}  # key -> list of importer sources that defined it
    chosen: dict = {}   # key -> source kept
    for imp in imports:
        for item in getattr(imp, attr):
            k = key_fn(item)
            sources.setdefault(k, []).append(imp.source)
            if k not in result or (prefer and imp.source == prefer):
                result[k] = item
                chosen[k] = imp.source
    if warnings is not None and label:
        for k, srcs in sources.items():
            distinct = sorted({s for s in srcs if s})
            if len(distinct) > 1:
                kept = chosen.get(k, distinct[0])
                others = [s for s in distinct if s != kept]
                warnings.append(
                    f"{label} '{k}' defined by {', '.join(distinct)}; kept from '{kept}'"
                    + (f" (also from: {', '.join(others)})" if others else "")
                )
    return list(result.values())


def _merge(
    imports: list[ImportResult],
    prefer: str | None,
    profile_override: str | None,
    *,
    warnings: list[str] | None = None,
) -> list[AictxFile]:
    """Merge all import results into a list of AictxFile objects."""
    # Group scopes by rel_path
    scope_groups: dict[str, list[ImportedScope]] = {}
    for imp in imports:
        for scope in imp.scopes:
            scope_groups.setdefault(scope.rel_path, []).append(scope)

    # Detect profile name (from any importer, or CLI override). When multiple
    # importers report different profile names, the first wins but the
    # disagreement is recorded for the user — silent picks have caused
    # surprises where Claude's 'debug' overrode Copilot's 'review'.
    detected_profile = profile_override
    detected_source: str | None = None
    seen_profiles: dict[str, list[str]] = {}
    for imp in imports:
        for scope in imp.scopes:
            if scope.profile_name:
                seen_profiles.setdefault(scope.profile_name, []).append(imp.source or "<unknown>")
                if not detected_profile:
                    detected_profile = scope.profile_name
                    detected_source = imp.source
    if warnings is not None and not profile_override and len(seen_profiles) > 1:
        kept = detected_profile
        others = sorted(p for p in seen_profiles if p != kept)
        kept_src = detected_source or seen_profiles[kept][0]
        other_desc = "; ".join(f"'{p}' from {', '.join(sorted(set(seen_profiles[p])))}" for p in others)
        warnings.append(
            f"profile name conflict: kept '{kept}' (from {kept_src}); ignored {other_desc}."
            " Pass --profile to choose explicitly."
        )

    # Build AictxFile per scope
    aictx_files: list[AictxFile] = []
    for rel_path in sorted(scope_groups, key=lambda p: (p != ".", p)):
        scopes = scope_groups[rel_path]
        base_text = _pick_best(scopes, prefer, lambda s: s.base_text)
        profile_text = _pick_best(scopes, prefer, lambda s: s.profile_text)

        aictx_files.append(
            AictxFile(
                rel_path=rel_path,
                base_text=base_text,
                profile_name=detected_profile if profile_text else None,
                profile_text=profile_text,
            )
        )

    all_caps = _dedup(imports, "capabilities", lambda c: (c.kind, c.name), prefer, warnings=warnings, label="capability")
    all_mcp = _dedup(imports, "mcp_servers", lambda m: m.name, prefer, warnings=warnings, label="mcp")
    all_hooks = _dedup(imports, "hooks", lambda h: h.event, prefer, warnings=warnings, label="hook")
    all_lsp = _dedup(imports, "lsp_servers", lambda s: s.name, prefer, warnings=warnings, label="lsp")

    # Attach capabilities + MCP + hooks + LSP to root scope
    root_file = next((f for f in aictx_files if f.rel_path == "."), None)
    if root_file is None and (all_caps or all_mcp or all_hooks or all_lsp):
        root_file = AictxFile(rel_path=".")
        aictx_files.insert(0, root_file)

    if root_file:
        root_file.capabilities = all_caps
        root_file.mcp_servers = all_mcp
        root_file.hooks = all_hooks
        root_file.lsp_servers = all_lsp

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
