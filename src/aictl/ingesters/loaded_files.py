# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Which instruction files a session loaded, from the session's own record.

Claude Code writes ``attachment`` lines: ``instructions`` names each CLAUDE.md or
AGENTS.md it loaded, ``nested_memory`` a CLAUDE.md of a subfolder, and
``invoked_skills`` the SKILL.md of each skill used. Copilot CLI writes
``skill.invoked`` with the SKILL.md path and ``subagent.selected`` with the name
of a custom agent. Its ``system.message`` holds the text of the instruction files
it loaded, without their paths: a candidate file of the repository counts as
loaded when at least half of its first lines occur in that text. The text is
matched when it is read and never kept.
"""

from __future__ import annotations

import os
from pathlib import Path

# A line shorter than this is too common ("## Rules", "---") to show that a file was loaded.
MIN_LINE_CHARS = 30
SAMPLE_LINES = 40
MIN_MATCHED_LINES = 3

# How a file was loaded. The API sends these values.
INSTRUCTIONS = "instructions"
NESTED_MEMORY = "nested_memory"
SKILL = "skill"
CUSTOM_AGENT = "custom_agent"
SYSTEM_PROMPT = "system_prompt"

_sample_cache: dict[str, tuple[float, int, list[str]]] = {}
_SAMPLE_CACHE_MAX = 2000


def _absolute(path: object) -> str:
    """The path when it is an absolute file path; "" for ``userSettings:x``, ``bundled:x`` and the like."""
    text = str(path or "")
    return text if text and os.path.isabs(text) else ""


def claude_attachment(attachment: object) -> list[tuple[str, str, str]]:
    """(path, how, detail) of each file a Claude Code attachment shows loaded."""
    if not isinstance(attachment, dict):
        return []
    kind = attachment.get("type")
    out: list[tuple[str, str, str]] = []
    if kind == "instructions":
        for f in attachment.get("files") or []:
            if isinstance(f, dict) and _absolute(f.get("path")):
                out.append((str(f["path"]), INSTRUCTIONS, str(f.get("type") or "")))
    elif kind == "nested_memory":
        if _absolute(attachment.get("path")):
            out.append((str(attachment["path"]), NESTED_MEMORY, ""))
    elif kind == "invoked_skills":
        for s in attachment.get("skills") or []:
            if isinstance(s, dict) and _absolute(s.get("path")):
                out.append((str(s["path"]), SKILL, ""))
    return out


def custom_agent_file(git_root: str, name: str) -> str:
    """``<git root>/.github/agents/<name>.agent.md``, or a file there whose name matches in any case."""
    if not git_root or not name:
        return ""
    folder = Path(git_root) / ".github" / "agents"
    exact = f"{name}.agent.md"
    wanted = {exact.lower(), f"{name}.md".lower()}
    found = ""
    try:
        # The name as it is on disk, also on a file system that ignores case.
        for entry in os.scandir(folder):
            if entry.name == exact and entry.is_file():
                return entry.path
            if not found and entry.name.lower() in wanted and entry.is_file():
                found = entry.path
    except OSError:
        return ""
    return found


def candidate_files(git_root: str, extra: list[str] | tuple[str, ...] = ()) -> list[str]:
    """Instruction files of a repository that Copilot can put in its system prompt."""
    out: list[str] = []
    if git_root:
        root = Path(git_root)
        for rel in (".github/copilot-instructions.md", "AGENTS.md", "CLAUDE.md"):
            if (root / rel).is_file():
                out.append(str(root / rel))
        for pattern in (".github/instructions/**/*.instructions.md", ".github/agents/*.agent.md"):
            try:
                out += sorted(str(p) for p in root.glob(pattern) if p.is_file())
            except OSError:
                continue
    for path in extra:
        if path not in out and os.path.isfile(path):
            out.append(path)
    return out


def sample_lines(path: str) -> list[str]:
    """The first SAMPLE_LINES lines of a file that are long enough to identify it, front matter skipped."""
    try:
        st = os.stat(path)
    except OSError:
        return []
    cached = _sample_cache.get(path)
    if cached and cached[0] == st.st_mtime and cached[1] == st.st_size:
        return cached[2]
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read(512 * 1024)
    except OSError:
        return []
    lines = text.splitlines()
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                lines = lines[i + 1 :]
                break
    out = [s for s in (line.strip() for line in lines) if len(s) > MIN_LINE_CHARS][:SAMPLE_LINES]
    if len(_sample_cache) >= _SAMPLE_CACHE_MAX:
        _sample_cache.clear()
    _sample_cache[path] = (st.st_mtime, st.st_size, out)
    return out


def in_system_prompt(content: str, path: str) -> tuple[int, int] | None:
    """(matched, total) when the file's text is in *content*: at least half its sample lines, and 3 or more."""
    sample = sample_lines(path)
    if not sample or not content:
        return None
    matched = sum(1 for line in sample if line in content)
    if matched >= MIN_MATCHED_LINES and matched * 2 >= len(sample):
        return matched, len(sample)
    return None


def system_prompt_files(content: str, git_root: str, extra: list[str] | tuple[str, ...] = ()) -> list[tuple[str, str]]:
    """(path, "N of M lines") of each candidate file whose text the system prompt holds."""
    out: list[tuple[str, str]] = []
    for path in candidate_files(git_root, extra):
        hit = in_system_prompt(content, path)
        if hit is not None:
            out.append((path, f"{hit[0]} of {hit[1]} lines"))
    return out
