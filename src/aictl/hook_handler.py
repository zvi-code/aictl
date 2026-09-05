# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Hook handler for AI coding tool integration.

Invoked by AI tools (Claude Code, Gemini CLI, VS Code Copilot) as a hook
command. Reads the JSON payload from stdin, enriches it with event
metadata, the calling tool's process id and environment context, and
POSTs it to the aictl server.

It writes NOTHING to stdout. Claude Code parses a hook's stdout: for
decision-model events (PreToolUse, PermissionRequest, ...) a JSON object
with unknown keys fails schema validation and surfaces a "hook error"
notice in the transcript, and for WorktreeCreate stdout is the worktree
path. Silence is the only output that is safe on every event.

Usage:
    python -m aictl.hook_handler --event SessionStart --port 8484
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import urllib.request

# Process names that are just the shell the tool used to run this hook. The
# tool's own process sits above them.
_SHELL_NAMES = frozenset({"sh", "bash", "zsh", "dash", "fish", "powershell", "pwsh", "cmd", "cmd.exe"})


def _parent_of(pid: int) -> tuple[int, str] | None:
    """Return ``(ppid, comm)`` for *pid* via ``ps`` (POSIX only); None on failure."""
    if os.name != "posix":
        return None
    try:
        out = subprocess.run(
            ["ps", "-o", "ppid=,comm=", "-p", str(pid)],
            capture_output=True,
            text=True,
            timeout=1.0,
            check=False,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None
    if not out:
        return None
    parts = out.split(None, 1)
    try:
        ppid = int(parts[0])
    except (ValueError, IndexError):
        return None
    comm = os.path.basename(parts[1].strip()) if len(parts) > 1 else ""
    return ppid, comm


def tool_pid(start_ppid: int, max_hops: int = 3) -> int:
    """Best-effort pid of the AI tool that spawned this hook.

    Claude Code runs command hooks through ``bash -c``; when bash forks the
    hook rather than exec'ing it, our parent is the shell and the tool is
    one level up. Walk past shell processes (bounded) and return the first
    non-shell ancestor. Falls back to *start_ppid* when ``ps`` is
    unavailable (Windows) or the walk fails, so the value is always usable.
    """
    pid = start_ppid
    for _ in range(max_hops):
        info = _parent_of(pid)
        if info is None:
            break
        ppid, comm = info
        if comm.lower() not in _SHELL_NAMES:
            return pid
        if ppid <= 1:
            break
        pid = ppid
    return pid


def main() -> None:
    # Minimal arg parsing — no argparse import to keep startup fast.
    event = ""
    port = 8484
    source = "unknown"
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--event" and i + 1 < len(args):
            event = args[i + 1]
            i += 2
        elif args[i] == "--port" and i + 1 < len(args):
            try:
                port = int(args[i + 1])
            except ValueError:
                port = 8484  # bad --port must never crash the wrapper
            i += 2
        elif args[i] == "--source" and i + 1 < len(args):
            source = args[i + 1]
            i += 2
        else:
            i += 1

    # Read payload from stdin (AI tools pipe rich JSON here).
    # Empty or malformed stdin must never crash: this wrapper runs
    # inside the AI tool's hook pipeline and has to stay silent.
    data: dict = {}
    if not sys.stdin.isatty():
        try:
            data = json.load(sys.stdin)
        except (json.JSONDecodeError, ValueError, OSError):
            data = {}
    if not isinstance(data, dict):
        data = {}

    # Enrich with event name and environment context.
    data["event"] = event
    data.setdefault("session_id", os.environ.get("SESSION_ID", ""))
    data.setdefault("cwd", os.environ.get("CWD", ""))

    # Capture wrapper identity + caller process info for observability.
    try:
        tid = threading.get_native_id()
    except AttributeError:  # pragma: no cover — Python <3.8
        tid = threading.get_ident()
    ppid = os.getppid()
    data["aictl_hook"] = {
        "source": source,
        "pid": os.getpid(),
        "ppid": ppid,
        "tid": tid,
        "py": sys.executable,
    }
    # The tool's pid lets the server join this hook session onto the
    # process-derived session the correlator already tracks.
    if not data.get("pid"):
        data["pid"] = tool_pid(ppid)

    # POST to aictl server (best-effort — never crash if server is down).
    try:
        req = urllib.request.Request(
            f"http://localhost:{port}/api/hooks",
            json.dumps(data).encode(),
            {"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=2)  # noqa: S310 — localhost only
    except Exception:  # noqa: BLE001, S110 — must not crash if aictl unreachable
        pass


if __name__ == "__main__":
    main()
