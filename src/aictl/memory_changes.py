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
import os
from dataclasses import dataclass
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


# Where a before- or after-image came from (file_write_events.before_source / after_source).
TOOL_INPUT = "tool_input"  # the text the call wrote, as sent (a Write, a stored fact, a created memory file)
TOOL_RESULT = "tool_result"  # the tool's own copy of the file before the call (Claude ``originalFile``)
FILE_AT_INGEST = "file_at_ingest"  # read from disk when the event was read, unchanged since the write
ABSENT = "absent"  # the tool says the file did not exist before
PREVIOUS_VERSION = "previous_version"  # the after-image of the last write of the path this node stored
CLAUDE_BACKUP = "claude_backup"  # Claude Code's file-history backup of the file
COPILOT_PREIMAGE = "copilot_preimage"  # Copilot's rewind snapshot backup of the file
UNKNOWN_CHANGED = "unknown: the file changed after the write"
UNKNOWN_MISSING = "unknown: the file was gone when the event was read"
UNKNOWN_TOO_LARGE = "unknown: the content is larger than one stored value"
UNKNOWN_NO_FILE = "unknown: the tool keeps this memory in no local file"
UNKNOWN_NOT_SENT = "unknown: the call does not carry the whole content"
# A file's mtime may lag or lead the event's own clock by this much.
CLOCK_SLACK_S = 2.0


@dataclass(slots=True)
class Image:
    """One side of a change: the content's hash and size, where it came from, and the text to store."""

    source: str
    hash: str = ""
    size: int | None = None
    text: str | None = None


def image_of(content: str | bytes | None, source: str) -> Image:
    if content is None:
        return Image(source)
    raw = content.encode("utf-8", "replace") if isinstance(content, str) else content
    if len(raw) > BLOB_MAX_BYTES:
        return Image(UNKNOWN_TOO_LARGE, size=len(raw))
    return Image(source, blob_hash(raw), len(raw), raw.decode("utf-8", "replace"))


def read_if_fresh(path: str, written_from: float, written_by: float) -> Image:
    """The file's content now, when it is the version a write between the two times left.

    It is that version when the file's mtime falls between the write's start and its end (with
    ``CLOCK_SLACK_S``): a later change would have moved the mtime past the end. ``written_from``
    of 0 accepts any older mtime (an outside change seen at ``written_by``)."""
    try:
        before = os.stat(path)
        if before.st_size > BLOB_MAX_BYTES:
            return Image(UNKNOWN_TOO_LARGE, size=before.st_size)
        if before.st_mtime > written_by + CLOCK_SLACK_S or (written_from and before.st_mtime < written_from - CLOCK_SLACK_S):
            return Image(UNKNOWN_CHANGED)
        with open(path, "rb") as fh:
            raw = fh.read(BLOB_MAX_BYTES + 1)
        if os.stat(path).st_mtime_ns != before.st_mtime_ns:
            return Image(UNKNOWN_CHANGED)
    except OSError:
        return Image(UNKNOWN_MISSING)
    return image_of(raw, FILE_AT_INGEST)


def set_images(row, before: Image | None, after: Image | None) -> list[tuple[str, str, float]]:
    """Put the images on a ``FileWriteRow``; returns the (hash, text, ts) blobs to store.

    A path the file inventory never stores the content of (``records._is_sensitive_path``) keeps
    its hashes and sizes only."""
    from .records import _is_sensitive_path

    keep = not _is_sensitive_path(row.path)
    blobs = []
    for side, image in (("before", before), ("after", after)):
        if image is None:
            continue
        setattr(row, f"{side}_source", image.source)
        setattr(row, f"{side}_hash", image.hash)
        setattr(row, f"{side}_bytes", image.size)
        if keep and image.hash and image.text is not None:
            blobs.append((image.hash, image.text, row.ts))
    return blobs


def claude_write_key(tool_use_id: str, path_argument: str) -> str:
    """The dedup_key of one Claude Code file write: its tool call id and the path argument as the tool got it.

    The transcript and the PostToolUse hook both carry these two, so one edit is one row.
    """
    from .records import _dedup_key

    return _dedup_key("claude-edit", tool_use_id, path_argument)


def fill_write(row):
    """Give a ``FileWriteRow`` of a session its mechanism, its actor and its line counts where it lacks them.

    Every row that reaches ``file_write_events`` is a session's own write unless its reader set the
    actor (``outside_session``), so an empty actor here is the main agent's or the subagent's.
    """
    row.mechanism = row.mechanism or memory_mechanism(row.path, row.tool_name)
    row.actor = row.actor or actor_of(row.agent_id)
    for name in ("lines_added", "lines_removed"):
        value = row.detail.get(name) if isinstance(row.detail, dict) else None
        if getattr(row, name) is None and type(value) is int:
            setattr(row, name, value)
    return row


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
