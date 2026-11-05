# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Hook handler for AI coding tool integration.

Invoked by AI tools (Claude Code, Gemini CLI, Copilot) as a hook command.
Reads the JSON payload from stdin, adds event metadata, and POSTs it to the
aictl server.

Contract, which every registered hook relies on:

* It writes NOTHING to stdout. Claude Code parses a hook's stdout: for
  decision-model events a JSON object with unknown keys surfaces a "hook
  error" notice, and Gemini and Copilot parse stdout as a decision too.
* It always exits 0. A dead daemon, a bad port or a malformed payload is not
  the host tool's problem.
* It is stdlib-only and imports nothing from the aictl package. It is run by
  file path under ``python -I -S`` so one invocation costs interpreter start
  plus a socket write, not the aictl package import. Keep it that way: the
  guard test runs it from a directory holding only this file.

Usage:
    python -I -S /path/to/aictl/hook_handler.py --event SessionStart --port 8484
"""

from __future__ import annotations

import json
import os
import sys

# Process names that are just the shell the tool used to run this hook. The
# tool's own process sits above them.
_SHELL_NAMES = frozenset({"sh", "bash", "zsh", "dash", "fish", "powershell", "pwsh", "cmd", "cmd.exe"})

# Events that open a session: only these join a hook session to a process, so
# only these pay for the ``ps`` walk.
_PID_EVENTS = frozenset({"Init", "SessionStart"})

_CONNECT_TIMEOUT = 0.2
_RESPONSE_TIMEOUT = 0.3
_MAX_PAYLOAD_BYTES = 16 * 1024 * 1024


def _parent_of(pid: int) -> tuple[int, str] | None:
    """Return ``(ppid, comm)`` for *pid* via ``ps`` (POSIX only); None on failure."""
    if os.name != "posix":
        return None
    import subprocess  # costs ~10 ms: only events in _PID_EVENTS get here

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


def _post(port: int, body: bytes) -> None:
    """POST *body* to the local aictl server. Raises OSError when unreachable.

    Raw socket on the C module: ``urllib.request`` pulls in http.client, ssl
    and email, which is most of what this process would otherwise spend. The
    wait for the first response byte is bounded and only keeps the server from
    logging a broken pipe; a slow server cannot hold the hook.
    """
    try:
        import _socket as socket_mod
    except ImportError:  # pragma: no cover: other Python implementations
        import socket as socket_mod  # type: ignore[no-redef]

    sock = socket_mod.socket(socket_mod.AF_INET, socket_mod.SOCK_STREAM)
    try:
        sock.settimeout(_CONNECT_TIMEOUT)
        sock.connect(("127.0.0.1", port))
        head = (
            f"POST /api/hooks HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\n"
            f"Content-Length: {len(body)}\r\nConnection: close\r\n\r\n"
        )
        sock.sendall(head.encode("ascii") + body)
        sock.settimeout(_RESPONSE_TIMEOUT)
        sock.recv(1)
    finally:
        sock.close()


def _read_payload() -> dict:
    """Parse stdin as a JSON object; anything else (including no stdin) is ``{}``."""
    try:
        if sys.stdin.isatty():
            return {}
        raw = getattr(sys.stdin, "buffer", sys.stdin).read(_MAX_PAYLOAD_BYTES + 1)
        if len(raw) > _MAX_PAYLOAD_BYTES:
            return {"_aictl_truncated": True}
        data = json.loads(raw)
    except (ValueError, OSError, AttributeError):
        return {}
    return data if isinstance(data, dict) else {}


def main() -> None:
    # Minimal arg parsing: no argparse import, to keep startup fast.
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

    data = _read_payload()

    # Enrich with event name and environment context.
    data["event"] = event
    # Copilot's camelCase events send sessionId, not session_id.
    data.setdefault("session_id", data.get("sessionId") or os.environ.get("SESSION_ID", ""))
    data.setdefault("cwd", os.environ.get("CWD", ""))

    # Capture wrapper identity + caller process info for observability.
    ppid = os.getppid()
    data["aictl_hook"] = {
        "source": source,
        "pid": os.getpid(),
        "ppid": ppid,
        "py": sys.executable,
    }
    # The tool's pid lets the server join this hook session onto the
    # process-derived session the correlator already tracks.
    if not data.get("pid") and event in _PID_EVENTS:
        data["pid"] = tool_pid(ppid)

    # Best-effort: the daemon being down is a normal state.
    try:
        _post(port, json.dumps(data).encode())
    except Exception:  # noqa: BLE001, S110 - must not crash if aictl unreachable
        pass


if __name__ == "__main__":
    try:
        main()
    except BaseException:  # noqa: BLE001, S110 - fail-open contract, see module docstring
        pass
    os._exit(0)  # no interpreter teardown; the exit code cannot be anything else
