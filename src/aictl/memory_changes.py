"""Agent memory and instruction files: which writes are memory changes, and how their contents are kept.

A memory change is a write to an agent's memory or instruction file, or a call of a tool that
saves memory without a file (Copilot ``store_memory``). Contents are stored once per hash in
``file_blobs`` (the ``file_text`` retention class), so a version outlives the 24-hour tool content.

Who made a change (``actor``) is only what the evidence says: ``agent`` or ``subagent`` when a
session's own write event shows it, ``outside_session`` when the tool itself reports the file as
changed outside the session, and "" (unknown) otherwise. Nothing is called ``user`` by elimination.
"""

from __future__ import annotations

import hashlib
import ntpath
from urllib.parse import quote

from . import platforms

# The largest content kept as one file_blobs value; one Kusto string value holds about 1 MB.
BLOB_MAX_BYTES = 1_000_000

MECHANISMS = (
    "claude_auto_memory", "claude_md", "agents_md", "copilot_instructions", "copilot_store_memory",
    "vscode_memory", "codex_memory",
)
# Paths of memory that lives in no file of its own: a Copilot repository memory fact, a VS Code
# memory tool file (its own /memories/ namespace). A scheme no file path has keeps them apart.
COPILOT_MEMORY_SCHEME = "copilot-memory://"
VSCODE_MEMORY_SCHEME = "vscode-memory://"
COPILOT_MEMORY_TOOLS = frozenset({"store_memory", "vote_memory"})

AGENT, SUBAGENT, OUTSIDE_SESSION = "agent", "subagent", "outside_session"


def blob_hash(raw: bytes) -> str:
    """The ``file_blobs.hash`` of *raw*: the first 32 hex digits of its SHA-256, as the file inventory uses."""
    return hashlib.sha256(raw).hexdigest()[:32]


def text_hash(text: str) -> str:
    return blob_hash(text.encode("utf-8", "replace"))


def actor_of(agent_id: str) -> str:
    """The actor of a session's own write: its main agent or a subagent."""
    return SUBAGENT if agent_id else AGENT


def copilot_memory_path(scope: str, repository: str, subject: str = "") -> str:
    """The stable name of a Copilot memory: its scope and repository, and the fact's subject when given."""
    parts = [quote(scope or "unknown", safe=""), repository or "unknown"]
    return COPILOT_MEMORY_SCHEME + "/".join(parts) + (f"/{quote(subject, safe='')}" if subject else "")


def vscode_memory_path(path: str) -> str:
    """The VS Code memory tool's own path (``/memories/notes.md``) under a scheme of its own."""
    return VSCODE_MEMORY_SCHEME + (path if path.startswith("/") else f"/{path}")


def _under(path: str, root) -> bool:
    try:
        return platforms.is_path_under(path, str(root))
    except (OSError, ValueError):
        return False


def memory_mechanism(path: str, tool_name: str = "") -> str:
    """Which memory or instruction mechanism *path* (or the memory tool *tool_name*) belongs to; "" for none.

    The tool homes come from ``platforms`` (their environment overrides included), never from a fixed path.
    """
    if tool_name in COPILOT_MEMORY_TOOLS or path.startswith(COPILOT_MEMORY_SCHEME):
        return "copilot_store_memory"
    if path.startswith(VSCODE_MEMORY_SCHEME):
        return "vscode_memory"
    if not path:
        return ""
    projects = platforms.claude_projects_dir()
    if _under(path, projects):
        rel = path.replace("\\", "/")[len(str(projects).replace("\\", "/")):].strip("/").split("/")
        return "claude_auto_memory" if len(rel) >= 3 and rel[1] == "memory" else ""
    if _under(path, platforms.codex_global_dir() / "memories"):
        return "codex_memory"
    if platforms.path_contains_component(path, "memory-tool") and platforms.path_contains_component(path, "memories"):
        return "vscode_memory"
    name = ntpath.basename(path).lower()
    if name in ("claude.md", "claude.local.md") or platforms.path_contains_component(path, ".claude/rules"):
        return "claude_md"
    if name in ("agents.md", "agents.override.md"):
        return "agents_md"
    if name == "copilot-instructions.md" or name.endswith(".instructions.md"):
        return "copilot_instructions"
    return ""
