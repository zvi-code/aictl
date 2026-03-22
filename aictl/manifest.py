# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Deploy manifest: tracks files for clean profile switches."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

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
    p.write_text(json.dumps({
        "deployed_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "root": str(root),
        "files": paths,
    }, indent=2) + "\n")


def cleanup_stale(root: Path, old: dict | None, new_paths: set[str]) -> list[str]:
    if not old or not old.get("files"):
        return []
    removed = []
    for f in old["files"]:
        p = Path(f)
        if str(p) not in new_paths and p.is_file():
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
    while d.resolve() != s and str(d).startswith(str(s)):
        try:
            if any(d.iterdir()):
                break
            d.rmdir()
            d = d.parent
        except OSError:
            break
