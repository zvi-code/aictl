# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Shared parsing helpers for importers."""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

# --- Deployed marker patterns ---

_DEPLOYED_RE = re.compile(
    r"<!-- AI-CONTEXT:DEPLOYED \u2014.*?-->\s*(.*?)\s*<!-- AI-CONTEXT:DEPLOYED-END -->",
    re.DOTALL,
)

_OVERLAY_RE = re.compile(
    r"<!-- AI-CONTEXT:OVERLAY \u2014.*?-->.*?<!-- AI-CONTEXT:OVERLAY-END -->",
    re.DOTALL,
)

_PROFILE_RE = re.compile(r"#\s*Active Profile:\s*(\S+)")


def strip_markers(text: str) -> str:
    """Extract content from deployed markers, stripping overlay sections.

    If no markers are present (hand-written file), returns the full text stripped.
    """
    # Remove overlay sections first
    text = _OVERLAY_RE.sub("", text)
    # Extract from deployed markers
    m = _DEPLOYED_RE.search(text)
    if m:
        return m.group(1).strip()
    return text.strip()


def split_yaml_frontmatter(text: str) -> tuple[dict, str]:
    """Split YAML frontmatter from body. Returns (metadata_dict, body_text)."""
    if not text.startswith("---"):
        return {}, text.strip()
    end = text.find("---", 3)
    if end < 0:
        return {}, text.strip()
    try:
        meta = yaml.safe_load(text[3:end]) or {}
    except yaml.YAMLError:
        meta = {}
    body = text[end + 3:].strip()
    return meta, body


def glob_to_rel_path(glob: str) -> str:
    """Convert a glob like 'src/api/**' to a relative path 'src/api'."""
    glob = glob.strip().strip('"').strip("'")
    if glob.endswith("/**"):
        return glob[:-3]
    if glob.endswith("/*"):
        return glob[:-2]
    return glob


def extract_profile_name(text: str) -> str | None:
    """Extract profile name from '# Active Profile: <name>' header."""
    m = _PROFILE_RE.search(text)
    return m.group(1) if m else None


def strip_profile_header(text: str) -> str:
    """Remove the '# Active Profile: <name>' header line from text."""
    return _PROFILE_RE.sub("", text).strip()


def safe_json_load(path: Path) -> dict | None:
    """Read a JSON file, returning None on missing/malformed."""
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text("utf-8"))
    except (json.JSONDecodeError, OSError, KeyError):
        return None


# ── Higher-level importer building blocks ───────────────────────────────────


def read_root_scope(
    base_file: Path,
    profile_file: Path | None,
    name: str,
) -> tuple[str, str | None, str]:
    """Read base text and profile from two separate files.

    Returns (root_base, profile_name, profile_text).
    """
    root_base = ""
    profile_name = None
    profile_text = ""
    if base_file.is_file():
        root_base = strip_markers(base_file.read_text("utf-8"))
    if profile_file and profile_file.is_file():
        text = strip_markers(profile_file.read_text("utf-8"))
        profile_name = extract_profile_name(text)
        profile_text = strip_profile_header(text)
    return root_base, profile_name, profile_text


def read_sub_scopes(
    rules_dir: Path,
    pattern: str,
    name: str,
    meta_key: str = "paths",
    skip: frozenset[str] = frozenset(),
) -> list:
    """Read sub-scope instruction files from *rules_dir*.

    *meta_key* is the YAML frontmatter key that holds the file-glob
    (e.g. "paths" for Claude/Windsurf, "applyTo" for Copilot, "globs"
    for Cursor).  Files whose names are in *skip* are ignored.

    Returns a list of ImportedScope.
    """
    from . import ImportedScope

    scopes = []
    if not rules_dir.is_dir():
        return scopes
    for f in sorted(rules_dir.glob(pattern)):
        if f.name in skip:
            continue
        meta, body = split_yaml_frontmatter(f.read_text("utf-8"))
        body = strip_markers(body)
        raw_val = meta.get(meta_key, "")
        # Support both string and list values for the path key
        if isinstance(raw_val, list):
            raw_val = raw_val[0] if raw_val else ""
        rel = glob_to_rel_path(str(raw_val)) if raw_val else ""
        if rel and body:
            scopes.append(ImportedScope(rel, name, body))
    return scopes


def read_cap_dir(
    cap_dir: Path,
    pattern: str,
    cap_type: str,
    name: str,
    suffix: str = "",
) -> list:
    """Read flat capability files (commands, agents, prompts).

    *suffix* is stripped from the stem to get the capability name
    (e.g. ".agent" for ``*.agent.md`` files).

    Returns a list of ImportedCapability.
    """
    from . import ImportedCapability

    caps = []
    if not cap_dir.is_dir():
        return caps
    for f in sorted(cap_dir.glob(pattern)):
        content = f.read_text("utf-8").strip()
        cap_name = f.stem.removesuffix(suffix) if suffix else f.stem
        if content:
            caps.append(ImportedCapability(cap_type, cap_name, content, name))
    return caps


def read_skills_dir(skills_dir: Path, name: str) -> list:
    """Read ``*/SKILL.md`` skill capabilities from *skills_dir*.

    Returns a list of ImportedCapability with kind="skill".
    """
    from . import ImportedCapability

    caps = []
    if not skills_dir.is_dir():
        return caps
    for skill_dir in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
        skill_file = skill_dir / "SKILL.md"
        if skill_file.is_file():
            content = skill_file.read_text("utf-8").strip()
            if content:
                caps.append(ImportedCapability("skill", skill_dir.name, content, name))
    return caps


def read_hooks_from_settings(settings_files: list[Path], name: str) -> list:
    """Read hook rules from one or more JSON settings files.

    Returns a list of ImportedHook.
    """
    from . import ImportedHook

    hooks = []
    for path in settings_files:
        data = safe_json_load(path)
        if data:
            for event, rules in data.get("hooks", {}).items():
                if isinstance(rules, list) and rules:
                    hooks.append(ImportedHook(event, rules, name))
    return hooks


def read_hooks_from_dir(hooks_dir: Path, name: str) -> list:
    """Read hook rules from ``*.json`` files inside a directory.

    Returns a list of ImportedHook.
    """
    from . import ImportedHook

    hooks = []
    if not hooks_dir.is_dir():
        return hooks
    for f in sorted(hooks_dir.glob("*.json")):
        data = safe_json_load(f)
        if data:
            for event, rules in data.get("hooks", {}).items():
                if isinstance(rules, list) and rules:
                    hooks.append(ImportedHook(event, rules, name))
    return hooks


def read_lsp_json(lsp_file: Path, name: str, key: str = "lspServers") -> list:
    """Read LSP server configs from a JSON file.

    Returns a list of ImportedLsp.
    """
    from . import ImportedLsp

    lsp_data = safe_json_load(lsp_file)
    if not lsp_data:
        return []
    servers = lsp_data if key == "" else lsp_data.get(key, lsp_data)
    if not isinstance(servers, dict):
        return []
    return [ImportedLsp(srv_name, cfg, name) for srv_name, cfg in servers.items()]


def import_mcp_from_json(
    path: Path,
    source: str,
    server_key: str = "mcpServers",
    seen: set[str] | None = None,
) -> list:
    """Read MCP servers from a JSON config file.

    Handles both 'mcpServers' (Copilot/Claude) and 'servers' (VS Code) keys.
    Returns list of ImportedMcp. Deduplicates by name via `seen` set.
    """
    from . import ImportedMcp

    data = safe_json_load(path)
    if not data:
        return []
    servers = data.get(server_key, data.get("mcpServers", data.get("servers", {})))
    if not isinstance(servers, dict):
        return []
    if seen is None:
        seen = set()
    results = []
    for name, config in servers.items():
        if name not in seen:
            results.append(ImportedMcp(name, config, source))
            seen.add(name)
    return results
