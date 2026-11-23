# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""The record types in session files that no reader lists as read or as ignored.

A reader names the line and event types it reads and those it leaves out on purpose, with the
reason (``call_facts``). ``unlisted`` counts the other types found in a set of files: a new type
a tool started to write, which no reader has looked at yet. ``test/test_source_markers.py`` runs
it over the fixtures, and ``aictl db reread --dry-run --types`` over this machine's own folders.
Codex rollouts have a read list only: every other type is unlisted.
"""

from __future__ import annotations

import json
from collections import Counter
from collections.abc import Iterable
from pathlib import Path

from . import zstd_stream
from .transcript_tail import TYPE_RE

# The tools whose files have record lists, as transcript_usage names them.
TOOLS = ("claude-code", "copilot-cli", "codex-cli")
# What CodexAccumulator reads: a line type, or a line type and its payload's type.
CODEX_READ = frozenset({"session_meta", "turn_context", "response_item:function_call",
                        "response_item:custom_tool_call", "event_msg:task_started", "event_msg:user_message",
                        "event_msg:token_count"})


def listed(tool: str) -> frozenset[str]:
    """Every type a reader of *tool* reads or ignores with a reason. Claude attachments are ``attachment:<type>``."""
    from . import call_facts, transcript_steps
    from .transcript_usage import _CLAUDE_RECORD_TYPES

    if tool == "claude-code":
        return frozenset({kind.decode() for kind in _CLAUDE_RECORD_TYPES} | set(call_facts.CLAUDE_IGNORED_LINES)
                         | {f"attachment:{k}" for k in call_facts.CLAUDE_READ_ATTACHMENTS
                            | set(call_facts.CLAUDE_IGNORED_ATTACHMENTS)})
    if tool == "copilot-cli":
        return frozenset(call_facts.COPILOT_READ_EVENTS | transcript_steps._SOURCES | set(call_facts.COPILOT_IGNORED_EVENTS))
    if tool == "codex-cli":
        return CODEX_READ
    raise ValueError(f"no record lists for {tool}")


def record_type(tool: str, line: bytes) -> str | None:
    """The type of one line as ``listed`` names it, or None for a line with no type."""
    head = TYPE_RE.match(line, 0, 600)
    kind = head.group(1).decode("utf-8", "replace") if head is not None else None
    if tool == "claude-code" and kind not in (None, "attachment"):
        return kind
    if tool == "copilot-cli" and kind is not None:
        return kind
    try:
        obj = json.loads(line)
    except ValueError:
        return kind
    if not isinstance(obj, dict) or not isinstance(obj.get("type"), str):
        return None
    kind = obj["type"]
    if tool == "claude-code" and kind == "attachment":
        attachment = obj.get("attachment") if isinstance(obj.get("attachment"), dict) else {}
        return f"attachment:{attachment.get('type') or ''}"
    if tool == "codex-cli":
        payload = obj.get("payload") if isinstance(obj.get("payload"), dict) else {}
        # The reader tells response items and events apart by their payload's type.
        if kind in ("response_item", "event_msg") and isinstance(payload.get("type"), str):
            return f"{kind}:{payload['type']}"
    return kind


def _lines(path: Path) -> Iterable[bytes]:
    if path.name.endswith(".zst"):
        if not zstd_stream.available():
            return
        stream = zstd_stream.open_stream(path)
        try:
            yield from stream
        finally:
            stream.close()
        return
    with open(path, "rb") as fh:
        yield from fh


def unlisted(tool: str, paths: Iterable[Path]) -> Counter[str]:
    """How often each record type no reader of *tool* lists occurs in *paths*."""
    known = listed(tool)
    found: Counter[str] = Counter()
    for path in paths:
        try:
            for line in _lines(path):
                kind = record_type(tool, line)
                if kind is not None and kind not in known:
                    found[kind] += 1
        except OSError:
            continue
    return found
