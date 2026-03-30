# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""WriteGuard — per-command-invocation gate for pre-existing file modifications.

Any command that writes files should install a guard at the start:

    guard = WriteGuard.install("hooks install")

The guard is stored in the Click context and consulted automatically by
write_safe() (which covers deploy, import, plugin, and all emitters).
Commands that write files directly (hooks, otel, enable, init) must also
call guard.confirm(path) before each write.

Prompt format:
    aictl <command> is about to modify|replace|delete <path>
    [Y] Yes, [N] No, [A] All?

    Y — approve this file, continue asking for subsequent ones
    N — abort the command
    A — approve this and all remaining files without asking again

New files (path does not yet exist) are always approved silently.
"""

from __future__ import annotations

from pathlib import Path


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
