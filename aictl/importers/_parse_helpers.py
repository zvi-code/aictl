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
