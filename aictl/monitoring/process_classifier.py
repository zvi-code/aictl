"""Tool and root-process classification for live monitoring.

Uses CSV ps_grep_pattern from the process registry as the primary
matching strategy.  Falls back to hardcoded patterns if the registry
is unavailable (e.g. during testing without CSV files).
"""

from __future__ import annotations

import re
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


# ─── CSV-driven classification ─────────────────────────────────

_CSV_PATTERNS: list[tuple[re.Pattern, str]] | None = None


def _load_csv_patterns() -> list[tuple[re.Pattern, str]]:
    """Lazy-load compiled regex patterns from process CSV specs."""
    global _CSV_PATTERNS
    if _CSV_PATTERNS is not None:
        return _CSV_PATTERNS
    try:
        from ..registry import get_registry

        patterns: list[tuple[re.Pattern, str]] = []
        for spec in get_registry().process_specs():
            if not spec.ps_grep_pattern:
                continue
            for pat_str in spec.ps_grep_pattern.split("|"):
                pat_str = pat_str.strip()
                if not pat_str:
                    continue
                try:
                    patterns.append((re.compile(pat_str, re.IGNORECASE), spec.ai_tool))
                except re.error:
                    continue
        _CSV_PATTERNS = patterns
        return _CSV_PATTERNS
    except Exception:
        _CSV_PATTERNS = []
        return _CSV_PATTERNS


# ─── Hardcoded fallback (kept for robustness) ──────────────────

_CURSOR_EXACT = ("cursor",)
_CURSOR_PREFIX = ("cursor helper",)
_WINDSURF_EXACT = ("windsurf",)
_WINDSURF_PREFIX = ("windsurf helper",)
_VSCODE_EXACT = ("code", "visual studio code", "vscodium", "codium")
_VSCODE_PREFIX = ("code helper",)
_COPILOT_FRAGMENTS = (
    "copilot-agent", "copilot-lsp", "copilot-language-server",
    "copilot-server", "github.copilot",
)


def _classify_fallback(name: str, cmdline: str, exe: str, combined: str) -> MatchResult:
    """Hardcoded classification — used when CSV patterns unavailable."""
    if name in _CURSOR_EXACT or any(name.startswith(p) for p in _CURSOR_PREFIX):
        return MatchResult(tool="cursor", root_candidate=True)
    if name in _WINDSURF_EXACT or any(name.startswith(p) for p in _WINDSURF_PREFIX):
        return MatchResult(tool="windsurf", root_candidate=True)
    if name in _VSCODE_EXACT or any(name.startswith(p) for p in _VSCODE_PREFIX):
        return MatchResult(tool="copilot-vscode", root_candidate=True)
    if any(f in combined for f in _COPILOT_FRAGMENTS):
        return MatchResult(tool="copilot-vscode", root_candidate=True)
    if " gh copilot" in f" {cmdline}" or name == "copilot" or "github copilot" in combined:
        return MatchResult(tool="copilot-cli", root_candidate=True)
    if "codex.app/" in combined or "codex helper" in name:
        return MatchResult(tool="codex-cli", root_candidate=True)
    if " codex" in f" {cmdline}" or name == "codex" or "/codex" in exe or "\\codex" in exe:
        return MatchResult(tool="codex-cli", root_candidate=True)
    if "claude-code" in combined:
        return MatchResult(tool="claude-code", root_candidate=True)
    if " claude" in f" {cmdline}" and "claude.app/" not in combined:
        return MatchResult(tool="claude-code", root_candidate=True)
    if name == "claude" and "claude.app/contents/macos/claude" not in combined:
        return MatchResult(tool="claude-code", root_candidate=True)
    if "claude.app/" in combined or "claude helper" in name:
        return MatchResult(tool="claude-desktop", root_candidate=True)
    if name == "claude" or "/claude" in exe or "\\claude" in exe:
        return MatchResult(tool="claude-code", root_candidate=True)
    return MatchResult(tool=None, root_candidate=False)


# ─── Public API ────────────────────────────────────────────────

def classify_process(process: ProcessInfo) -> MatchResult:
    """Map a process to a monitored tool family.

    Uses CSV ps_grep_pattern patterns (priority from CSV row order).
    Falls back to hardcoded patterns if CSV is unavailable.
    """
    name = _normalize_name(process.name)
    cmdline = " ".join(part.lower() for part in process.cmdline)
    exe = (process.exe or "").lower()
    combined = " ".join(part for part in (name, cmdline, exe) if part)

    # Try CSV-driven classification: match against name, cmdline, and combined.
    # Anchored patterns (^...$) are tested against name alone so they work correctly.
    patterns = _load_csv_patterns()
    if patterns:
        for pattern, tool_name in patterns:
            if pattern.search(name) or pattern.search(combined):
                return MatchResult(tool=tool_name, root_candidate=True)

    # Fallback to hardcoded patterns (catches broader heuristics like
    # "any VS Code process = copilot-vscode" that aren't in CSV)
    return _classify_fallback(name, cmdline, exe, combined)
