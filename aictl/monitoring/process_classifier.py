"""Tool and root-process classification for live monitoring."""

from __future__ import annotations

from dataclasses import dataclass

from .events import ProcessInfo


def _normalize_name(name: str) -> str:
    lowered = name.lower().strip()
    if lowered.endswith(".exe"):
        lowered = lowered[:-4]
    return lowered


@dataclass(frozen=True, slots=True)
class MatchResult:
    """Classification result for one process."""

    tool: str | None
    root_candidate: bool = False


_EDITOR_EXACT_NAMES = (
    "code",
    "visual studio code",
    "cursor",
    "windsurf",
    "vscodium",
    "codium",
)

_EDITOR_PREFIX_NAMES = (
    "code helper",
    "cursor helper",
    "windsurf helper",
)

_COPILOT_PROCESS_FRAGMENTS = (
    "copilot-agent",
    "copilot-lsp",
    "copilot-language-server",
    "copilot-server",
    "github.copilot",
)


def classify_process(process: ProcessInfo) -> MatchResult:
    """Map a process to a monitored tool family."""

    name = _normalize_name(process.name)
    cmdline = " ".join(part.lower() for part in process.cmdline)
    exe = (process.exe or "").lower()
    combined = " ".join(part for part in (name, cmdline, exe) if part)

    if name in _EDITOR_EXACT_NAMES or any(name.startswith(prefix) for prefix in _EDITOR_PREFIX_NAMES):
        return MatchResult(tool="copilot-vscode", root_candidate=True)
    if any(fragment in combined for fragment in _COPILOT_PROCESS_FRAGMENTS):
        return MatchResult(tool="copilot-vscode", root_candidate=True)

    if (" gh copilot" in f" {cmdline}" or name == "copilot" or "github copilot" in combined):
        return MatchResult(tool="copilot-cli", root_candidate=True)

    if (" codex" in f" {cmdline}" or name == "codex" or "/codex" in exe or "\\codex" in exe):
        return MatchResult(tool="codex-cli", root_candidate=True)

    if "claude.app/" in combined or "claude helper" in name:
        return MatchResult(tool=None, root_candidate=False)
    if (" claude" in f" {cmdline}" or name == "claude" or "/claude" in exe or "\\claude" in exe):
        return MatchResult(tool="claude-code", root_candidate=True)

    return MatchResult(tool=None, root_candidate=False)
