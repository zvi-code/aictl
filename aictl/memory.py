"""Memory: stash/restore Claude Code auto-memory per (root, profile).

Memory is keyed to BOTH root directory and profile. Working from
my-project/ with debug has different memory than my-project/services/ingestion/
with debug.

Claude Code stores: ~/.claude/projects/<project-hash>/memory/
aictl only renames directories. Never reads/writes memory content.
"""

from __future__ import annotations

import hashlib
from pathlib import Path


def _memory_key(root: Path, profile: str | None) -> str:
    """Stable key for a (root, profile) pair."""
    root_hash = hashlib.sha256(str(root.resolve()).encode()).hexdigest()[:12]
    return f"{root.name}-{root_hash}" + (f"--{profile}" if profile else "--none")


def _find_project_dir(root: Path) -> Path | None:
    """Find Claude Code project dir for a repo."""
    projects = Path.home() / ".claude" / "projects"
    if not projects.is_dir():
        return None
    name = root.resolve().name
    for entry in projects.iterdir():
        if name in entry.name and entry.is_dir():
            return entry
    return None


def swap_memory(root: Path, old_profile: str | None, new_profile: str | None) -> dict | None:
    """Swap memory for profile change at given root."""
    proj = _find_project_dir(root)
    if not proj:
        return None

    mem = proj / "memory"
    result = {"stashed": None, "restored": None, "created": False}

    # Stash current
    if old_profile and mem.is_dir():
        stash = proj / f"memory--{old_profile}"
        if stash.exists():
            import time
            stash.rename(proj / f"memory--{old_profile}.bak.{int(time.time())}")
        mem.rename(stash)
        result["stashed"] = old_profile

    # Restore new
    if new_profile:
        restore = proj / f"memory--{new_profile}"
        if restore.is_dir():
            if mem.is_dir():
                import time
                mem.rename(proj / f"memory--_unstashed.{int(time.time())}")
            restore.rename(mem)
            result["restored"] = new_profile
        elif not mem.is_dir():
            mem.mkdir(parents=True)
            result["created"] = True

    return result


def list_stashes(root: Path) -> list[dict]:
    proj = _find_project_dir(root)
    if not proj:
        return []
    out = []
    mem = proj / "memory"
    if mem.is_dir():
        out.append(_summarize(mem, "(active)"))
    for e in sorted(proj.iterdir()):
        if e.name.startswith("memory--") and ".bak." not in e.name and e.is_dir():
            out.append(_summarize(e, e.name.replace("memory--", "")))
    return out


def get_summary(root: Path) -> dict | None:
    proj = _find_project_dir(root)
    if not proj:
        return None
    mem = proj / "memory"
    if not mem.is_dir():
        return None
    files = []
    for f in sorted(mem.iterdir()):
        if f.suffix == ".md":
            c = f.read_text(errors="replace")
            files.append({"file": f.name, "lines": len([l for l in c.splitlines() if l.strip()]),
                          "tokens": -(-len(c) // 4), "content": c})
    return {"dir": str(mem), "files": files, "total_tokens": sum(f["tokens"] for f in files)} if files else None


def _summarize(d: Path, label: str) -> dict:
    mds = [f for f in d.iterdir() if f.suffix == ".md"] if d.is_dir() else []
    lines = sum(len([l for l in f.read_text(errors="replace").splitlines() if l.strip()]) for f in mds)
    return {"profile": label, "dir": str(d), "files": len(mds), "lines": lines}
