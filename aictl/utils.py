# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Utilities: markers, tokens, file I/O."""

from __future__ import annotations

import json
import logging
import os
import re
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


@contextmanager
def swallow_errors(
    reason: str,
    *,
    logger: logging.Logger | None = None,
) -> Iterator[None]:
    """Self-documenting broad-exception swallow.

    Use at call sites where a failure genuinely must not propagate (infrastructure
    probes, best-effort telemetry, optional-dep imports).  The ``reason`` argument
    forces the author to name WHY the error is being dropped; if a logger is
    supplied the exception is recorded at debug level for post-hoc inspection.

    Existing broad-swallow sites are NOT migrated in this wave — the helper
    exists so future code has a lint-clean path that records intent.
    """
    try:
        yield
    except Exception as exc:  # noqa: BLE001 — this is the whole point of the helper
        if logger is not None:
            logger.debug("swallowed (%s): %s", reason, exc)

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


def _infer_command_from_click_ctx() -> str:
    """Best-effort: derive a human-readable command name from the active Click context."""
    try:
        import click as _click

        _ctx = _click.get_current_context(silent=True)
        if _ctx is None:
            return "<none>"
        return _ctx.command_path or _ctx.info_name or "<none>"
    except Exception:  # noqa: BLE001
        return "<none>"


def write_safe(path: Path, content: str, *, command: str | None = None) -> None:
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
    tmp = path.with_suffix(path.suffix + ".aictl-tmp")
    existing_bytes: bytes | None = None
    pre_existed = path.exists()
    try:
        if pre_existed:
            try:
                existing_bytes = path.read_bytes()
            except OSError:
                existing_bytes = None
            if existing_bytes is not None:
                try:
                    existing_text = existing_bytes.decode("utf-8", errors="ignore")
                except Exception:  # noqa: BLE001
                    existing_text = ""
                if "AI-CONTEXT:DEPLOYED" not in existing_text and "AI-CONTEXT:OVERLAY" not in existing_text:
                    bak = path.with_suffix(path.suffix + ".aictl.bak")
                    bak.write_bytes(existing_bytes)
        tmp.write_text(content, encoding="utf-8")
        os.replace(tmp, path)
    finally:
        try:
            if tmp.exists():
                tmp.unlink()
        except OSError:
            pass
    # Ledger logging — audit trail only, never raises into callers.
    try:
        from aictl import mutation_ledger

        new_bytes = content.encode("utf-8")
        mutation_ledger.record(
            command=command or _infer_command_from_click_ctx(),
            path=path,
            op="modify" if pre_existed else "create",
            previous_content=existing_bytes,
            new_content=new_bytes,
        )
    except Exception:  # noqa: BLE001, S110 — ledger must never break writes
        pass


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
    return "\n".join(
        [
            deployed_start(source, profile),
            "",
            deployed.strip(),
            "",
            DEPLOYED_END,
            "",
            OVERLAY_START,
            "",
            (overlay + "\n") if overlay else "",
            OVERLAY_END,
        ]
    )


# --- Merge helpers (preserve user content in shared files) ---

IGNORE_DEPLOYED_START = "# AI-CONTEXT:DEPLOYED"
IGNORE_DEPLOYED_END = "# AI-CONTEXT:DEPLOYED-END"

_IGNORE_DEPLOYED_RE = re.compile(
    r"# AI-CONTEXT:DEPLOYED\n.*?# AI-CONTEXT:DEPLOYED-END\n?",
    re.DOTALL,
)


class CorruptJSONError(Exception):
    """Raised when an existing JSON file can't be parsed and the caller has not opted into --force overwrite."""


def read_json_or_fail(path: Path, *, force: bool = False) -> dict:
    """Read and parse a JSON file, with strict safety on corruption.

    Policy:
    - Missing file (not ``is_file``) → return ``{}``. Not an error.
    - Unreadable (OSError on read) → return ``{}``. Not an error.
    - Empty or whitespace-only contents → return ``{}``.
    - Parse error on non-empty contents:
        * ``force=False`` (default) → raise ``CorruptJSONError`` so the caller
          can surface a clear, actionable failure to the user *without*
          clobbering their file.
        * ``force=True`` → save a sibling ``.bak.<timestamp>`` of the
          corrupted original, then return ``{}`` so the caller may proceed.

    The return value is always a ``dict``; if the file parses to a non-dict
    JSON value (list, string, number, ...) the same corruption policy applies.
    """
    if not path.is_file():
        return {}
    try:
        raw = path.read_text("utf-8")
    except OSError:
        return {}
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        if not force:
            raise CorruptJSONError(
                f"{path}: refusing to overwrite corrupted JSON "
                f"({exc.msg} at line {exc.lineno} col {exc.colno}). "
                f"Re-run with force=True (or --force) to quarantine and proceed."
            ) from exc
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        bak = path.with_suffix(path.suffix + f".bak.{ts}")
        try:
            bak.write_text(raw, encoding="utf-8")
        except OSError:
            pass
        return {}
    if not isinstance(data, dict):
        if not force:
            raise CorruptJSONError(
                f"{path}: refusing to overwrite — top-level JSON is "
                f"{type(data).__name__}, expected object. "
                f"Re-run with force=True (or --force) to quarantine and proceed."
            )
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        bak = path.with_suffix(path.suffix + f".bak.{ts}")
        try:
            bak.write_text(raw, encoding="utf-8")
        except OSError:
            pass
        return {}
    return data


def _deep_merge(existing: dict, updates: dict) -> dict:
    """Recursively merge *updates* into *existing* in place.

    When both values at a key are dicts, merge recursively — this preserves
    sub-keys the caller didn't mention (e.g. VS Code namespaced settings like
    ``"[python]": {"formatOnSave": true}`` are not clobbered when the caller
    writes ``"[python]": {"tabSize": 4}``).

    Otherwise the incoming value replaces the existing value.  Lists are
    replaced (not concatenated), which is the safer default: concatenation
    would produce duplicates on repeated deploys.
    """
    for k, v in updates.items():
        if isinstance(v, dict) and isinstance(existing.get(k), dict):
            _deep_merge(existing[k], v)
        else:
            existing[k] = v
    return existing


def merge_json_block(
    path: Path,
    wrapper_key: str | None,
    managed_entries: dict,
    *,
    force: bool = False,
) -> str:
    """Read existing JSON, merge *managed_entries*, return serialized.

    If *wrapper_key* is given (e.g. ``"mcpServers"``), entries are merged into
    ``existing[wrapper_key]``.  If *wrapper_key* is ``None``, entries are merged
    at the root dict level.  Existing keys not in *managed_entries* are preserved.

    The merge is *recursive*: nested dict values are deep-merged, so writing
    ``{"[python]": {"tabSize": 4}}`` into a file that already has
    ``{"[python]": {"formatOnSave": true}}`` preserves ``formatOnSave``.
    Lists and scalars are replaced wholesale.

    Raises :class:`CorruptJSONError` when the existing file is malformed and
    ``force`` is False.  With ``force=True`` the corrupted original is saved
    alongside as ``<path>.bak.<timestamp>`` before being replaced.
    """
    existing = read_json_or_fail(path, force=force)
    if wrapper_key is not None:
        block = existing.get(wrapper_key, {})
        if not isinstance(block, dict):
            block = {}
        _deep_merge(block, managed_entries)
        existing[wrapper_key] = block
    else:
        _deep_merge(existing, managed_entries)
    return json.dumps(existing, indent=2) + "\n"


def merge_ignore_file(path: Path, aictl_patterns: list[str]) -> str:
    """Merge aictl ignore patterns into an ignore file, preserving user content.

    The aictl-managed section is wrapped in ``# AI-CONTEXT:DEPLOYED`` markers.
    Everything outside those markers is treated as user content and preserved.
    """
    existing = read_if_exists(path) or ""
    user_content = _IGNORE_DEPLOYED_RE.sub("", existing).strip()
    deployed_block = "\n".join(
        [
            IGNORE_DEPLOYED_START,
            *aictl_patterns,
            IGNORE_DEPLOYED_END,
        ]
    )
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
    def install(cls, command: str) -> WriteGuard:
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
    def current(cls) -> WriteGuard | None:
        """Return the guard from the current Click context, or None."""
        import click

        ctx = click.get_current_context(silent=True)
        if ctx is None:
            return None
        return ctx.meta.get(_CTX_KEY)

    # ── Gate ─────────────────────────────────────────────────────

    def confirm(self, path: Path | str, action: str = "modify") -> None:
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
        # In library mode (no Click context), return silently.
        if click.get_current_context(silent=True) is None:
            return
        if not sys.stdin.isatty():
            if os.environ.get("AICTL_ASSUME_YES") == "1":
                return
            click.echo(
                f"aictl refuses to {action} {path} in non-interactive context. Set AICTL_ASSUME_YES=1 to proceed.",
                err=True,
            )
            raise click.Abort()

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
