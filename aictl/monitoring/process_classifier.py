# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Tool and root-process classification for live monitoring.

Uses CSV ps_grep_pattern from the process registry as the sole
matching strategy.  All patterns are defined in the CSV data files —
no hardcoded tool names or regex patterns in Python code.
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


# ─── Public API ────────────────────────────────────────────────

def classify_process(process: ProcessInfo) -> MatchResult:
    """Map a process to a monitored tool family.

    Uses CSV ps_grep_pattern patterns exclusively (priority from CSV
    row order).  Returns MatchResult(tool=None) if no pattern matches.
    """
    name = _normalize_name(process.name)
    cmdline = " ".join(part.lower() for part in process.cmdline)
    exe = (process.exe or "").lower()
    combined = " ".join(part for part in (name, cmdline, exe) if part)

    patterns = _load_csv_patterns()
    for pattern, tool_name in patterns:
        if pattern.search(name) or pattern.search(combined):
            return MatchResult(tool=tool_name, root_candidate=True)

    return MatchResult(tool=None, root_candidate=False)
