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


_VSCODE_EXACT_NAMES = (
    "code",
    "visual studio code",
    "vscodium",
    "codium",
)

_VSCODE_PREFIX_NAMES = (
    "code helper",
)

_CURSOR_EXACT_NAMES = ("cursor",)
_CURSOR_PREFIX_NAMES = ("cursor helper",)

_WINDSURF_EXACT_NAMES = ("windsurf",)
_WINDSURF_PREFIX_NAMES = ("windsurf helper",)

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

    # ── Cursor (must check before generic VS Code) ────────────
    if name in _CURSOR_EXACT_NAMES or any(name.startswith(p) for p in _CURSOR_PREFIX_NAMES):
        return MatchResult(tool="cursor", root_candidate=True)

    # ── Windsurf (must check before generic VS Code) ──────────
    if name in _WINDSURF_EXACT_NAMES or any(name.startswith(p) for p in _WINDSURF_PREFIX_NAMES):
        return MatchResult(tool="windsurf", root_candidate=True)

    # ── Generic VS Code / Copilot extension ───────────────────
    if name in _VSCODE_EXACT_NAMES or any(name.startswith(p) for p in _VSCODE_PREFIX_NAMES):
        return MatchResult(tool="copilot-vscode", root_candidate=True)
    if any(fragment in combined for fragment in _COPILOT_PROCESS_FRAGMENTS):
        return MatchResult(tool="copilot-vscode", root_candidate=True)

    # ── Copilot CLI ───────────────────────────────────────────
    if " gh copilot" in f" {cmdline}" or name == "copilot" or "github copilot" in combined:
        return MatchResult(tool="copilot-cli", root_candidate=True)

    # ── Codex (desktop app or CLI) ──────────────────────────────
    if "codex.app/" in combined or "codex helper" in name:
        return MatchResult(tool="codex-cli", root_candidate=True)
    if " codex" in f" {cmdline}" or name == "codex" or "/codex" in exe or "\\codex" in exe:
        return MatchResult(tool="codex-cli", root_candidate=True)

    # ── Claude Code CLI (check before Desktop — claude-code binary
    #    lives inside a claude.app/ directory but has "claude-code" in path) ──
    if "claude-code" in combined:
        return MatchResult(tool="claude-code", root_candidate=True)
    if " claude" in f" {cmdline}" and "claude.app/" not in combined:
        return MatchResult(tool="claude-code", root_candidate=True)
    if name == "claude" and "claude.app/contents/macos/claude" not in combined:
        return MatchResult(tool="claude-code", root_candidate=True)

    # ── Claude Desktop (Electron app — /Applications/Claude.app/) ──
    if "claude.app/" in combined or "claude helper" in name:
        return MatchResult(tool="claude-desktop", root_candidate=True)

    # ── Claude Code CLI fallback ──────────────────────────────
    if name == "claude" or "/claude" in exe or "\\claude" in exe:
        return MatchResult(tool="claude-code", root_candidate=True)

    return MatchResult(tool=None, root_candidate=False)
