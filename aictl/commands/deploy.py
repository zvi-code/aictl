# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Deploy: scan .toml → resolve → emit native files → cleanup → memory swap."""

from __future__ import annotations

from pathlib import Path

import click

from ..scanner import scan
from ..resolver import resolve
from ..emitters import registry
from ..manifest import load_manifest, save_manifest, cleanup_stale
from ..memory import swap_memory
from ..utils import estimate_tokens
from ..feature_matrix import check_parsed_features


def _run_deploy(root: Path, profile: str | None, emitter_names: list[str], dry_run: bool) -> bool:
    """Run a single deploy cycle. Returns True if files were found and deployed."""
    scanned = scan(root)
    if not scanned:
        click.secho(f"\nNo .context.toml files found under {root}\n", fg="yellow")
        return False

    click.secho(f"\n\U0001f4e6  Deploying from {root}", bold=True)
    if profile:
        click.secho(f"   profile: {profile}", fg="magenta")
    click.secho(f"   scanned: {len(scanned)} .toml file(s)", fg="bright_black")
    for rel, _ in scanned:
        click.secho(f"      {rel}/", fg="bright_black")

    # --- Feature compatibility warnings (non-blocking) ---
    for rel, parsed in scanned:
        compat_warnings = check_parsed_features(parsed)
        for kind, label, tools in compat_warnings:
            tool_list = ", ".join(tools)
            click.secho(f"   \u26a0 [{label}] \u2014 {kind} not supported by: {tool_list}", fg="yellow")

    # --- Phase 2: Resolve ---
    resolved = resolve(root, scanned, profile)

    # --- Phase 3: Emit ---
    old_manifest = None if dry_run else load_manifest(root)
    all_paths: list[str] = []

    for ename in emitter_names:
        emitter = registry.get(ename)
        results = emitter.emit(root, resolved, dry_run=dry_run)
        for r in results:
            all_paths.append(r["path"])
            pfx = click.style("   (dry)", fg="yellow") if dry_run else click.style("   \u2713", fg="green")
            tok = click.style(f'{r["tokens"]} tok', fg="cyan")
            fp = click.style(r["path"], fg="bright_black")
            click.echo(f"{pfx} {ename} \u2192 {fp} ({tok})")

    # Report capabilities
    kinds: dict[str, int] = {}
    for c in resolved.capabilities:
        kinds[c.kind] = kinds.get(c.kind, 0) + 1
    if kinds:
        click.secho("   caps: " + ", ".join(f"{v} {k}{'s' * (v > 1)}" for k, v in kinds.items()), fg="bright_black")
    if resolved.mcp_servers:
        click.secho("   mcp: " + ", ".join(resolved.mcp_servers), fg="bright_black")
    if resolved.hooks:
        n = sum(len(r) for r in resolved.hooks.values())
        click.secho(f"   hooks: {len(resolved.hooks)} event(s), {n} rule(s)", fg="bright_black")
    if resolved.lsp_servers:
        click.secho("   lsp: " + ", ".join(resolved.lsp_servers), fg="bright_black")
    if resolved.ignores:
        click.secho(f"   ignores: {len(resolved.ignores)} pattern(s)", fg="bright_black")

    # --- Phase 4: Cleanup ---
    if not dry_run:
        removed = cleanup_stale(root, old_manifest, set(all_paths))
        if removed:
            click.secho(f"\n   \U0001f9f9  Cleaned {len(removed)} stale file(s):", fg="yellow")
            for f in removed:
                click.secho(f"      - {f}", fg="bright_black")

        # --- Phase 5: Memory swap ---
        old_profile = old_manifest["profile"] if old_manifest else None
        if profile != old_profile:
            sr = swap_memory(root, old_profile, profile)
            if sr:
                if sr["stashed"]:
                    click.secho(f"\n   \U0001f9e0  Memory stashed: {sr['stashed']}", fg="blue")
                if sr["restored"]:
                    click.secho(f"   \U0001f9e0  Memory restored: {sr['restored']}", fg="blue")
                if sr["created"]:
                    click.secho(f"   \U0001f9e0  Memory initialized: fresh for {profile}", fg="blue")

        save_manifest(root, profile, all_paths)

    # Total tokens
    total = sum(r["tokens"] for r in [{"tokens": estimate_tokens("")}])  # placeholder
    click.echo()
    return True


def _collect_watch_dirs(root: Path) -> set[str]:
    """Return parent directories of all .toml files under root."""
    from ..parser import AICTX_FILENAME
    from ..scanner import SKIP_DIRS

    dirs: set[str] = set()

    def _walk(d: Path) -> None:
        if (d / AICTX_FILENAME).is_file():
            dirs.add(str(d))
        for item in sorted(d.iterdir()):
            if item.is_dir() and item.name not in SKIP_DIRS:
                _walk(item)

    _walk(root)
    return dirs


def _watch_loop(root: Path, profile: str | None, emitter_names: list[str], dry_run: bool) -> None:
    """Watch .toml files and re-deploy on changes."""
    import signal
    import threading

    try:
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer
    except ImportError:
        raise SystemExit(
            "watchdog is required for --watch mode.\n"
            "Install it with: pip install aictl[monitor]"
        )

    from ..parser import AICTX_FILENAME

    # Initial deploy
    _run_deploy(root, profile, emitter_names, dry_run)

    # Collect directories to watch
    watch_dirs = _collect_watch_dirs(root)
    if not watch_dirs:
        click.secho("No .toml directories to watch.", fg="yellow")
        return

    # Debounce state
    lock = threading.Lock()
    timer: threading.Timer | None = None
    DEBOUNCE_SECONDS = 0.5

    def _schedule_redeploy(changed_path: str) -> None:
        nonlocal timer
        with lock:
            if timer is not None:
                timer.cancel()
            timer = threading.Timer(
                DEBOUNCE_SECONDS,
                _do_redeploy,
                args=[changed_path],
            )
            timer.daemon = True
            timer.start()

    def _do_redeploy(changed_path: str) -> None:
        rel = str(Path(changed_path).relative_to(root))
        click.secho(f"\nDetected change in {rel}, re-deploying...", fg="cyan")
        try:
            _run_deploy(root, profile, emitter_names, dry_run)
        except Exception as exc:  # noqa: BLE001 — watch loop must survive redeploy errors
            click.secho(f"Deploy error: {exc}", fg="red")
        click.secho("Watching for changes...", fg="bright_black")

    class AictxHandler(FileSystemEventHandler):
        def on_created(self, event):
            if not event.is_directory and event.src_path.endswith(AICTX_FILENAME):
                _schedule_redeploy(event.src_path)

        def on_modified(self, event):
            if not event.is_directory and event.src_path.endswith(AICTX_FILENAME):
                _schedule_redeploy(event.src_path)

        def on_deleted(self, event):
            if not event.is_directory and event.src_path.endswith(AICTX_FILENAME):
                _schedule_redeploy(event.src_path)

    observer = Observer()
    handler = AictxHandler()
    # Watch root recursively to catch new .toml files in any subdirectory
    observer.schedule(handler, str(root), recursive=True)
    observer.start()

    click.secho("Watching for changes...", fg="bright_black")

    # Block until Ctrl+C
    stop = threading.Event()

    def _on_sigint(sig, frame):
        stop.set()

    original_handler = signal.getsignal(signal.SIGINT)
    signal.signal(signal.SIGINT, _on_sigint)

    try:
        stop.wait()
    finally:
        signal.signal(signal.SIGINT, original_handler)
        click.secho("\nStopping watcher...", fg="bright_black")
        with lock:
            if timer is not None:
                timer.cancel()
        observer.stop()
        observer.join(timeout=2.0)


@click.command()
@click.option("-r", "--root", "root_dir", default=".", help="Root directory to deploy from")
@click.option("-p", "--profile", help="Active profile (debug, docs, review, ...)")
@click.option("-e", "--emit", "emitters", default="claude,copilot,cursor,windsurf", help="Comma-separated emitters")
@click.option("--dry-run", is_flag=True, help="Show what would be written")
@click.option("--watch", is_flag=True, help="Re-deploy when .toml files change")
def deploy(root_dir, profile, emitters, dry_run, watch):
    """Scan .toml files and deploy native AI context files."""
    from ..guard import WriteGuard
    if not dry_run:
        WriteGuard.install("deploy")
    root = Path(root_dir).resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    emitter_names = [e.strip() for e in emitters.split(",")]

    if watch:
        _watch_loop(root, profile, emitter_names, dry_run)
    else:
        _run_deploy(root, profile, emitter_names, dry_run)
