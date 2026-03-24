"""Synthesize ImportResults into .context.aictx files.

Takes parsed data from multiple importers, merges/deduplicates,
and writes .context.aictx files at the appropriate directory levels.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from .importers import ImportResult, ImportedScope, ImportedCapability, ImportedMcp
from .parser import AICTX_FILENAME
from .utils import write_safe


@dataclass
class AictxFile:
    """Represents one .context.aictx file to be generated."""
    rel_path: str
    base_text: str = ""
    profile_name: str | None = None
    profile_text: str = ""
    capabilities: list[ImportedCapability] = field(default_factory=list)
    mcp_servers: list[ImportedMcp] = field(default_factory=list)


def synthesize(
    root: Path,
    imports: list[ImportResult],
    prefer: str | None = None,
    profile: str | None = None,
    dry_run: bool = False,
) -> list[dict]:
    """Merge import results and write .context.aictx files.

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

    # Capabilities: dedup by (kind, name), prefer --prefer source
    all_caps: dict[tuple[str, str], ImportedCapability] = {}
    for imp in imports:
        for cap in imp.capabilities:
            key = (cap.kind, cap.name)
            if key not in all_caps:
                all_caps[key] = cap
            elif prefer and imp.source == prefer:
                all_caps[key] = cap

    # MCP: dedup by name, prefer --prefer source
    all_mcp: dict[str, ImportedMcp] = {}
    for imp in imports:
        for mcp in imp.mcp_servers:
            if mcp.name not in all_mcp:
                all_mcp[mcp.name] = mcp
            elif prefer and imp.source == prefer:
                all_mcp[mcp.name] = mcp

    # Attach capabilities + MCP to root scope
    root_file = next((f for f in aictx_files if f.rel_path == "."), None)
    if root_file is None and (all_caps or all_mcp):
        root_file = AictxFile(rel_path=".")
        aictx_files.insert(0, root_file)

    if root_file:
        root_file.capabilities = list(all_caps.values())
        root_file.mcp_servers = list(all_mcp.values())

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
    """Serialize an AictxFile to .context.aictx INI format."""
    sections: list[str] = []

    if af.base_text:
        sections.append(f"[base]\n{af.base_text}")

    if af.profile_name and af.profile_text:
        sections.append(f"[{af.profile_name}]\n{af.profile_text}")

    for cap in af.capabilities:
        sections.append(f"[{cap.kind}:_always:{cap.name}]\n{cap.content}")

    for mcp in af.mcp_servers:
        sections.append(f"[mcp:_always:{mcp.name}]\n{json.dumps(mcp.config)}")

    return "\n\n".join(sections) + "\n" if sections else ""
