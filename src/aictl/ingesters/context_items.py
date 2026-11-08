# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""What fills a session's context, by category and item, from the session's own record.

Claude Code writes ``attachment`` lines that it puts in the model's context:

- ``instructions``: the memory files (CLAUDE.md, AGENTS.md, auto memory), with content;
  ``nested_memory``: a CLAUDE.md of a subfolder, with content.
- ``skill_listing``: the skills list, one ``- name: description`` entry per skill.
  ``isInitial`` marks a full list; otherwise it adds skills.
- ``mcp_instructions_delta``: the instructions of MCP servers, one block per server
  added, and the names of servers removed.
- ``agent_listing_delta``: one line per agent type added, and types removed.
  ``isInitial`` marks a full list.
- ``deferred_tools_delta``: the names of the deferred tools listed in the context
  (one line each), names removed and names hidden from the wire.

After a compaction (``compact_boundary``) Claude Code sends all of them again. A
compaction is therefore a reset: items recorded before it no longer count, unless
they are sent again. A full list (``isInitial``) is a reset of its kind.

Copilot CLI writes its whole system prompt in ``system.message``. It is split into
the repository instruction files it holds (``instruction_file``, matched as in
loaded_files), the ``<available_skills>`` section (``skills``, one item per skill),
custom agent instructions (``custom_agents``) and the other top-level sections
(``system_prompt_other``). A new system prompt replaces the earlier one: a reset.

Claude Code's ``/context`` writes its own report in a ``local_command`` line:
claude_context_report reads it into ``report`` (model, total, limit),
``report_category`` and ``report_item`` rows. These are measured by the tool.

Only names and sizes are returned, never content. A size is the UTF-8 byte count of
the text (``Item.chars``, stored in the ``chars`` column); its tokens are
``utils.estimate_tokens_from_size`` of it, the same as ``utils.estimate_tokens`` of the text.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass

from . import loaded_files

# Kinds. The API sends these values.
MEMORY_FILE = "memory_file"
SKILLS = "skills"
MCP_INSTRUCTIONS = "mcp_instructions"
CUSTOM_AGENTS = "custom_agents"
TOOLS_LISTED = "tools_listed"
INSTRUCTION_FILE = "instruction_file"
SYSTEM_PROMPT_OTHER = "system_prompt_other"
RESET = "reset"
ALL = "*"


@dataclass(frozen=True, slots=True)
class Item:
    kind: str
    name: str
    chars: int = 0
    path: str = ""
    removed: bool = False


def _size(text: object) -> int:
    """The UTF-8 size of a text, as utils.estimate_tokens measures it."""
    return len(str(text or "").encode("utf-8"))


def _strs(value: object) -> list[str]:
    return [str(v) for v in value] if isinstance(value, list) else []


def _entry_name(line: str, names: list[str]) -> str:
    """The skill an entry line starts: ``- name: ...``, ``- name (alias): ...`` or ``- name`` alone.

    A name can hold a colon (``plugin:skill``), so the longest listed name that the line
    starts with wins. Without a names list, the text before ": " is the name.
    """
    if not line.startswith("- "):
        return ""
    text = line[2:].rstrip("\n")
    if not names:
        return text.split(": ", 1)[0].strip()
    for name in names:
        if text.startswith(name) and (len(text) == len(name) or text[len(name)] in ": ("):
            return name
    return ""


def _skill_entries(content: str, names: list[str]) -> list[tuple[str, int]]:
    """(name, size) of each entry of a skill listing; continuation lines count to the entry before."""
    ordered = sorted(set(names), key=len, reverse=True)
    out: list[tuple[str, int]] = []
    for line in content.splitlines(keepends=True):
        head = _entry_name(line, ordered)
        if head:
            out.append((head, _size(line)))
        elif out:
            out[-1] = (out[-1][0], out[-1][1] + _size(line))
    return out


def claude_attachment(attachment: object) -> list[Item]:
    """The context items a Claude Code attachment records. A reset comes first."""
    if not isinstance(attachment, dict):
        return []
    kind = attachment.get("type")
    out: list[Item] = []
    if kind == "instructions":
        for f in attachment.get("files") or []:
            if isinstance(f, dict) and f.get("path"):
                path = str(f["path"])
                out.append(Item(MEMORY_FILE, path, _size(f.get("content")), path if os.path.isabs(path) else ""))
    elif kind == "nested_memory":
        content = attachment.get("content")
        text = content.get("content") if isinstance(content, dict) else content
        path = str(attachment.get("path") or "")
        if path:
            out.append(Item(MEMORY_FILE, path, _size(text), path if os.path.isabs(path) else ""))
    elif kind == "skill_listing":
        content = str(attachment.get("content") or "")
        if attachment.get("isInitial"):
            out.append(Item(RESET, SKILLS))
        entries = _skill_entries(content, _strs(attachment.get("names")))
        if entries:
            out += [Item(SKILLS, name, chars) for name, chars in entries]
        elif content:
            out.append(Item(SKILLS, "skill listing", _size(content)))
    elif kind == "mcp_instructions_delta":
        names, blocks = _strs(attachment.get("addedNames")), _strs(attachment.get("addedBlocks"))
        out += [Item(MCP_INSTRUCTIONS, n, _size(blocks[i]) if i < len(blocks) else 0) for i, n in enumerate(names)]
        out += [Item(MCP_INSTRUCTIONS, n, removed=True) for n in _strs(attachment.get("removedNames"))]
    elif kind == "agent_listing_delta":
        if attachment.get("isInitial"):
            out.append(Item(RESET, CUSTOM_AGENTS))
        types, lines = _strs(attachment.get("addedTypes")), _strs(attachment.get("addedLines"))
        out += [Item(CUSTOM_AGENTS, t, _size(lines[i]) + 1 if i < len(lines) else 0) for i, t in enumerate(types)]
        out += [Item(CUSTOM_AGENTS, t, removed=True) for t in _strs(attachment.get("removedTypes"))]
    elif kind == "deferred_tools_delta":
        names, lines = _strs(attachment.get("addedNames")), _strs(attachment.get("addedLines"))
        out += [Item(TOOLS_LISTED, n, _size(lines[i] if i < len(lines) else n) + 1) for i, n in enumerate(names)]
        gone = _strs(attachment.get("removedNames")) + _strs(attachment.get("wireHiddenNames"))
        out += [Item(TOOLS_LISTED, n, removed=True) for n in gone]
    return out


# ── Copilot CLI ───────────────────────────────────────────────────────

_OPEN_TAG = re.compile(r"^<([A-Za-z_][\w-]*)(?:\s[^>]*)?>", re.M)
_SKILL_BLOCK = re.compile(r"<skill>(.*?)</skill>", re.S)
_SKILL_NAME = re.compile(r"<name>\s*(.*?)\s*</name>", re.S)
UNTAGGED = "untagged text"


def _sections(content: str) -> list[tuple[str, int, int]]:
    """(tag, start, end) of each top-level ``<tag>...</tag>`` section that starts a line."""
    out: list[tuple[str, int, int]] = []
    pos = 0
    while True:
        m = _OPEN_TAG.search(content, pos)
        if m is None:
            return out
        tag = m.group(1)
        close = content.find(f"</{tag}>", m.end())
        if close < 0:
            pos = m.end()
            continue
        end = close + len(tag) + 3
        out.append((tag, m.start(), end))
        pos = end


def copilot_system_prompt(content: str, git_root: str, extra: list[str] | tuple[str, ...] = ()) -> list[Item]:
    """The items of a Copilot CLI system prompt, after a reset of all kinds. Sizes only."""
    if not content:
        return []
    out: list[Item] = [Item(RESET, ALL)]
    sections = _sections(content)
    matched = [path for path, _detail in loaded_files.system_prompt_files(content, git_root, extra)]
    # Each matched file goes to the instruction or agent section that holds most of its lines.
    owners: dict[int, list[str]] = {}
    for path in matched:
        sample = loaded_files.sample_lines(path)
        best, hits = -1, 0
        for i, (tag, start, end) in enumerate(sections):
            if tag not in ("custom_instruction", "agent_instructions"):
                continue
            n = sum(1 for line in sample if line in content[start:end])
            if n > hits:
                best, hits = i, n
        if best >= 0:
            owners.setdefault(best, []).append(path)
    other: dict[str, int] = {}
    covered = 0
    unnamed = 0
    for i, (tag, start, end) in enumerate(sections):
        size = _size(content[start:end])
        covered += size
        if tag == "available_skills":
            body = content[start:end]
            skills = 0
            for block in _SKILL_BLOCK.finditer(body):
                name = _SKILL_NAME.search(block.group(1))
                out.append(Item(SKILLS, name.group(1) if name else f"skill {skills + 1}", _size(block.group(0))))
                skills += _size(block.group(0))
            if size - skills > 0:
                other[tag] = other.get(tag, 0) + size - skills
        elif tag in ("custom_instruction", "agent_instructions"):
            kind = CUSTOM_AGENTS if tag == "agent_instructions" else INSTRUCTION_FILE
            paths = owners.get(i) or []
            if not paths:
                unnamed += 1
                label = "agent instructions" if kind == CUSTOM_AGENTS else f"custom instruction {unnamed}"
                out.append(Item(kind, label, size))
                continue
            weights = [max(1, _file_size(p)) for p in paths]
            total = sum(weights)
            for path, w in zip(paths, weights):
                kind_of = CUSTOM_AGENTS if path.endswith(".agent.md") else kind
                out.append(Item(kind_of, path, round(size * w / total), path))
        else:
            other[tag] = other.get(tag, 0) + size
    if _size(content) - covered > 0:
        other[UNTAGGED] = _size(content) - covered
    out += [Item(SYSTEM_PROMPT_OTHER, tag, chars) for tag, chars in other.items()]
    return out


def _file_size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


# ── Claude Code /context report ───────────────────────────────────────

REPORT_HEADING = "## Context Usage"
REPORT = "report"
REPORT_CATEGORY = "report_category"
REPORT_ITEM = "report_item"
REPORT_KINDS = (REPORT, REPORT_CATEGORY, REPORT_ITEM)
# report_item names are "<section>|<item>"; the table's middle column (server, source) goes in path.
SECTION_SEP = "|"


@dataclass(frozen=True, slots=True)
class ReportRow:
    kind: str
    name: str
    tokens: int
    chars: int = 0  # the limit, on the report row
    path: str = ""  # the model on the report row; the server or source on an item


_NUMBER = re.compile(r"^[~<>≈\s]*([0-9]+(?:\.[0-9]+)?)\s*([kKmM]?)")
_TOKENS_LINE = re.compile(r"\*\*Tokens:\*\*\s*([^/]+?)\s*/\s*([^\s(]+)")
_MODEL_LINE = re.compile(r"\*\*Model:\*\*\s*(\S+)")


def report_tokens(text: str) -> int | None:
    """``10.6k`` -> 10600, ``~120`` -> 120, ``1.2M`` -> 1200000; None when it is not a number."""
    m = _NUMBER.match(text.strip().replace(",", ""))
    if not m:
        return None
    scale = {"k": 1_000, "m": 1_000_000}.get(m.group(2).lower(), 1)
    return round(float(m.group(1)) * scale)


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def claude_context_report(content: str) -> list[ReportRow]:
    """The rows of one ``/context`` report: the totals, each category, each item of the item tables."""
    model = _MODEL_LINE.search(content)
    tokens = _TOKENS_LINE.search(content)
    total = report_tokens(tokens.group(1)) if tokens else None
    limit = report_tokens(tokens.group(2)) if tokens else None
    out = [ReportRow(REPORT, "", total or 0, limit or 0, model.group(1) if model else "")]
    section = ""
    header: list[str] = []
    for line in content.splitlines():
        text = line.strip()
        if text.startswith("#"):
            section, header = text.lstrip("#").strip(), []
            continue
        if not text.startswith("|"):
            continue
        cells = _cells(text)
        if not header:
            header = cells
            continue
        if all(set(c) <= set("-: ") for c in cells):
            continue
        if not section or len(cells) < 2:
            continue
        if section.lower().startswith("estimated usage"):
            value = report_tokens(cells[1])
            if value is not None:
                out.append(ReportRow(REPORT_CATEGORY, cells[0], value))
            continue
        value = report_tokens(cells[-1])
        if value is not None:
            detail = cells[1] if len(cells) >= 3 else ""
            out.append(ReportRow(REPORT_ITEM, f"{section}{SECTION_SEP}{cells[0]}", value, path=detail))
    return out
