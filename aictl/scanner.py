# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Scan a directory tree for .context.toml files starting from root."""

from __future__ import annotations

from pathlib import Path

from .fsutil import safe_iterdir
from .parser import AICTX_FILENAME, ParsedAictx, parse_aictx

SKIP_DIRS = {
    ".git", ".hg", ".svn",
    "node_modules", "__pycache__", ".venv", "venv",
    ".claude", ".github", ".cursor", ".ai-deployed",
    "dist", "build", "target", "out", "bin", "obj",
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


def _walk(root: Path):
    """Yield .context.toml files, root first, then children."""
    f = root / AICTX_FILENAME
    if f.is_file():
        yield f
    for item in safe_iterdir(root):
        if item.is_dir() and item.name not in SKIP_DIRS:
            yield from _walk(item)
