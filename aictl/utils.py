# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Utilities: markers, tokens, file I/O."""

from __future__ import annotations

import json
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
    try:
        import click as _click
        _ctx = _click.get_current_context(silent=True)
        if _ctx is not None:
            _guard = _ctx.meta.get("_write_guard")
            if _guard is not None:
                _guard.confirm(path, "replace")
    except _click.Abort:
        raise
    except Exception:  # noqa: BLE001, S110 — guard infra errors must not block writes; Abort is re-raised above
        pass
    path.write_text(content, encoding="utf-8")


def read_if_exists(path: Path) -> str | None:
    return path.read_text(encoding="utf-8") if path.is_file() else None


def emit_file(fp: Path, content: str, dry_run: bool, results: list) -> None:
    """Write *content* to *fp* (unless dry_run) and record the result."""
    if not dry_run:
        write_safe(fp, content)
    results.append({"path": str(fp), "tokens": estimate_tokens(content)})


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


# --- Merge helpers (preserve user content in shared files) ---

IGNORE_DEPLOYED_START = "# AI-CONTEXT:DEPLOYED"
IGNORE_DEPLOYED_END = "# AI-CONTEXT:DEPLOYED-END"

_IGNORE_DEPLOYED_RE = re.compile(
    r"# AI-CONTEXT:DEPLOYED\n.*?# AI-CONTEXT:DEPLOYED-END\n?",
    re.DOTALL,
)


def merge_json_block(path: Path, wrapper_key: str | None, managed_entries: dict) -> str:
    """Read existing JSON, merge *managed_entries*, return serialized.

    If *wrapper_key* is given (e.g. ``"mcpServers"``), entries are merged into
    ``existing[wrapper_key]``.  If *wrapper_key* is ``None``, entries are merged
    at the root dict level.  Existing keys not in *managed_entries* are preserved.
    """
    existing: dict = {}
    if path.is_file():
        try:
            existing = json.loads(path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    if wrapper_key is not None:
        block = existing.get(wrapper_key, {})
        block.update(managed_entries)
        existing[wrapper_key] = block
    else:
        existing.update(managed_entries)
    return json.dumps(existing, indent=2) + "\n"


def merge_ignore_file(path: Path, aictl_patterns: list[str]) -> str:
    """Merge aictl ignore patterns into an ignore file, preserving user content.

    The aictl-managed section is wrapped in ``# AI-CONTEXT:DEPLOYED`` markers.
    Everything outside those markers is treated as user content and preserved.
    """
    existing = read_if_exists(path) or ""
    user_content = _IGNORE_DEPLOYED_RE.sub("", existing).strip()
    deployed_block = "\n".join([
        IGNORE_DEPLOYED_START,
        *aictl_patterns,
        IGNORE_DEPLOYED_END,
    ])
    parts = [deployed_block]
    if user_content:
        parts.append(user_content)
    return "\n\n".join(parts) + "\n"


# --- Path normalisation (cross-platform) ---

def norm_path(path: str) -> str:
    """Normalise path separators to forward slashes.

    All internal path strings use '/' regardless of platform so that
    downstream code (Python *and* JavaScript dashboard) can rely on a
    single separator character.
    """
    return path.replace("\\", "/") if path else path


# --- Path encoding ---

def encode_scope(path: str) -> str:
    if not path or path in ("/", "\\", "."):
        return "root"
    return norm_path(path).replace("/", "--")


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


# ── WriteGuard ──────────────────────────────────────────────────────

# Key used to store the guard in click.Context.meta
_CTX_KEY = "_write_guard"


class WriteGuard:
    def __init__(self, command: str) -> None:
        self.command = command
        self._approve_all = False

    # ── Registration ──────────────────────────────────────────────

    @classmethod
    def install(cls, command: str) -> "WriteGuard":
        """Create a guard and register it in the current Click context.

        Call once at the top of a Click command handler:
            guard = WriteGuard.install("hooks install")
        """
        import click
        guard = cls(command)
        ctx = click.get_current_context(silent=True)
        if ctx is not None:
            ctx.meta[_CTX_KEY] = guard
        return guard

    @classmethod
    def current(cls) -> "WriteGuard | None":
        """Return the guard from the current Click context, or None."""
        import click
        ctx = click.get_current_context(silent=True)
        if ctx is None:
            return None
        return ctx.meta.get(_CTX_KEY)

    # ── Gate ─────────────────────────────────────────────────────

    def confirm(self, path: "Path | str", action: str = "modify") -> None:
        """Prompt the user before touching a pre-existing file.

        - New files (do not exist yet): silently approved.
        - Y: approved for this file; subsequent files still ask.
        - A: approved; all remaining files in this invocation skip prompting.
        - N (or anything else): raises click.Abort() — command exits cleanly.

        Args:
            path:   file about to be written/modified/deleted
            action: verb shown in the prompt — "modify", "replace", or "delete"
        """
        path = Path(path)
        if not path.exists() or self._approve_all:
            return

        import sys
        import click
        # Only prompt when running interactively inside a Click command.
        # In tests (CliRunner) or piped/scripted contexts, auto-approve.
        if click.get_current_context(silent=True) is None:
            return
        if not sys.stdin.isatty():
            return

        click.echo()
        click.secho(
            f"aictl {self.command} is about to {action} {path}",
            fg="yellow",
        )
        response = click.prompt("[Y] Yes, [N] No, [A] All").strip().upper()[:1]
        if response == "A":
            self._approve_all = True
        elif response != "Y":
            raise click.Abort()
