# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Diff: show what would change between current files and a new deploy."""

from __future__ import annotations

import difflib
import re
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

import click

from ..scanner import scan
from ..resolver import resolve
from ..emitters import registry
from ..manifest import load_manifest

# Regex to normalize the deploy-timestamp inside marker comments so that
# timestamp-only differences don't show up as spurious diffs.
_DEPLOY_TS_RE = re.compile(
    r"(<!-- AI-CONTEXT:DEPLOYED\b[^|]*\|[^|]*\| deployed: )\S+(-->)"
)

# Every emitter module that imports write_safe directly.
_WRITE_SAFE_TARGETS = [
    "aictl.emitters.claude",
    "aictl.emitters.copilot",
    "aictl.emitters.cursor",
    "aictl.emitters.windsurf",
]


@click.command("diff")
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to deploy from")
@click.option("-p", "--profile", help="Active profile (debug, docs, review, ...)")
@click.option("-e", "--emit", "emitters", default=None, help="Comma-separated emitters (default: all)")
def diff(root_dir: str, profile: str | None, emitters: str | None) -> None:
    """Show what would change on the next deploy (dry-run diff)."""
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    emitter_names = (
        [e.strip() for e in emitters.split(",")]
        if emitters
        else registry.all_names()
    )

    # --- Phase 1: Scan ---
    scanned = scan(root)
    if not scanned:
        click.secho("No .context.toml files found.", fg="yellow")
        return

    # --- Phase 2: Resolve ---
    resolved = resolve(root, scanned, profile)

    # --- Phase 3: Emit into a capture dict (no disk writes) ---
    # Emitters import write_safe into their own namespace, so we must patch
    # each module individually to intercept the call.
    captured: dict[str, str] = {}  # abs path → intended content

    def _capture_write(path: Path, content: str) -> None:
        captured[str(path)] = content

    new_paths: set[str] = set()

    with ExitStack() as stack:
        for target in _WRITE_SAFE_TARGETS:
            stack.enter_context(patch(f"{target}.write_safe", _capture_write))
        for ename in emitter_names:
            emitter = registry.get(ename)
            results = emitter.emit(root, resolved, dry_run=False)
            for r in results:
                new_paths.add(r["path"])

    # --- Phase 4: Diff each file ---
    has_changes = False

    for file_path in sorted(new_paths):
        intended = captured.get(file_path)
        if intended is None:
            # Emitter returned this path but dry_run=True style (no content captured).
            # This can happen if the emitter conditionally skips write_safe.
            # Fall back: nothing to diff for this path.
            continue

        disk_path = Path(file_path)
        if disk_path.is_file():
            current = disk_path.read_text(encoding="utf-8")
        else:
            current = ""

        # Normalize deploy timestamps so re-deploys with identical content
        # don't produce noise.
        norm_current = _normalize_ts(current)
        norm_intended = _normalize_ts(intended)

        if norm_current == norm_intended:
            continue

        has_changes = True
        from_label = f"a/{_rel(file_path, root)}"
        to_label = f"b/{_rel(file_path, root)}"

        if not current:
            click.secho(f"\n--- /dev/null", fg="red")
            click.secho(f"+++ {to_label}", fg="green")
            click.secho("(new file)", fg="cyan")
            for line in intended.splitlines():
                click.secho(f"+{line}", fg="green")
        else:
            diff_lines = list(difflib.unified_diff(
                norm_current.splitlines(),
                norm_intended.splitlines(),
                fromfile=from_label,
                tofile=to_label,
                lineterm="",
            ))
            for line in diff_lines:
                if line.startswith("+++") or line.startswith("---"):
                    click.secho(line, fg="white", bold=True)
                elif line.startswith("@@"):
                    click.secho(line, fg="cyan")
                elif line.startswith("+"):
                    click.secho(line, fg="green")
                elif line.startswith("-"):
                    click.secho(line, fg="red")
                else:
                    click.echo(line)

    # --- Phase 5: Check for stale files that would be removed ---
    old_manifest = load_manifest(root)
    if old_manifest and old_manifest.get("files"):
        for f in old_manifest["files"]:
            if f not in new_paths and Path(f).is_file():
                has_changes = True
                label = _rel(f, root)
                click.secho(f"\n--- a/{label}", fg="red")
                click.secho("+++ /dev/null", fg="green")
                click.secho("(file would be removed)", fg="cyan")
                for line in Path(f).read_text(encoding="utf-8").splitlines():
                    click.secho(f"-{line}", fg="red")

    if not has_changes:
        click.secho("\nNo changes — deploy output matches files on disk.\n", fg="green")


def _normalize_ts(text: str) -> str:
    """Strip deploy timestamps so they don't cause spurious diffs."""
    return _DEPLOY_TS_RE.sub(r"\1<TS>\2", text)


def _rel(file_path: str, root: Path) -> str:
    """Return a display-friendly relative path."""
    try:
        return str(Path(file_path).relative_to(root))
    except ValueError:
        return file_path
