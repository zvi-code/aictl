"""Utilities: markers, tokens, file I/O."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path


# --- Markers ---

def deployed_start(source: str, profile: str | None) -> str:
    p = f" | profile: {profile}" if profile else ""
    d = datetime.now(timezone.utc).isoformat()
    return f"<!-- AI-CONTEXT:DEPLOYED — source: {source}{p} | deployed: {d} -->"

DEPLOYED_END = "<!-- AI-CONTEXT:DEPLOYED-END -->"
OVERLAY_START = "<!-- AI-CONTEXT:OVERLAY — agent-managed section -->"
OVERLAY_END = "<!-- AI-CONTEXT:OVERLAY-END -->"

OVERLAY_RE = re.compile(
    r"<!-- AI-CONTEXT:OVERLAY —.*?-->(.*?)<!-- AI-CONTEXT:OVERLAY-END -->",
    re.DOTALL,
)


def estimate_tokens(text: str) -> int:
    # Use UTF-8 byte length rather than character count — BPE tokenizers
    # operate on bytes, so this gives much better estimates for CJK and
    # other multi-byte scripts (3 bytes/char → ~3x more than chars/4).
    return -(-len(text.encode("utf-8")) // 4)


# --- File I/O ---

def write_safe(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def read_if_exists(path: Path) -> str | None:
    return path.read_text(encoding="utf-8") if path.is_file() else None


def extract_overlay(path: Path) -> str:
    content = read_if_exists(path)
    if not content:
        return ""
    m = OVERLAY_RE.search(content)
    return m.group(1).strip() if m else ""


def wrap_deployed(content: str, source: str, profile: str | None = None) -> str:
    return "\n".join([deployed_start(source, profile), "", content.strip(), "", DEPLOYED_END])


def compose_with_overlay(deployed: str, overlay: str, source: str, profile: str | None) -> str:
    return "\n".join([
        deployed_start(source, profile), "", deployed.strip(), "", DEPLOYED_END,
        "", OVERLAY_START, "", (overlay + "\n") if overlay else "", OVERLAY_END,
    ])


# --- Path encoding ---

def encode_scope(path: str) -> str:
    if not path or path in ("/", "."):
        return "root"
    return path.replace("/", "--")


# --- Display formatting (shared across CLI, TUI, HTML report) ---

def human_size(n: int) -> str:
    """Format byte count as human-readable string (e.g. 1.2KB, 3.5MB)."""
    if n < 1024:
        return f"{n}B"
    k = n / 1024
    if k < 1024:
        return f"{k:.1f}KB"
    m = k / 1024
    if m < 1024:
        return f"{m:.1f}MB"
    return f"{m / 1024:.1f}GB"


def human_tokens(n: int, suffix: bool = False) -> str:
    """Format token count as human-readable string (e.g. 1.2k, 150k)."""
    sfx = " tok" if suffix else ""
    if n >= 1000:
        k = n / 1000
        if k >= 100:
            return f"{k:.0f}k{sfx}"
        return f"{k:.1f}k{sfx}"
    return f"{n}{sfx}"


def rel_display(path_str: str, root: Path, home: Path) -> str:
    """Format a path for display — relative to root or ~/."""
    try:
        rp = Path(path_str).relative_to(root)
        return str(rp)
    except ValueError:
        pass
    try:
        return "~/" + str(Path(path_str).relative_to(home))
    except ValueError:
        return path_str
