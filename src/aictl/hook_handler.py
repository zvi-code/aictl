# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Hook handler for AI coding tool integration.

Invoked by AI tools (Claude Code, Gemini CLI, Copilot) as a hook command.
Reads the JSON payload from stdin, adds event metadata, and POSTs it to the
aictl server, which stores one ``hook_calls`` row per call.

What it POSTs (wire format version 1) is the tool's payload object with
``event`` (the ``--event`` value), ``session_id`` and ``cwd`` when the payload
lacks them, ``pid`` (the tool's, on session start) and the envelope::

    "aictl_hook": {"v": 1, "call_id": "<32 hex>", "ts": <time of the call>,
                   "source": ..., "pid": ..., "ppid": ..., "py": ...,
                   "payload_bytes": <bytes read from stdin>, "truncated": <bool>,
                   "added": [<payload keys this handler set>]}

Two modes, two contracts.

Observer mode (no ``--wrap-b64``), the hook aictl registers itself:

* It writes NOTHING to stdout. Claude Code parses a hook's stdout: for
  decision-model events a JSON object with unknown keys surfaces a "hook
  error" notice, and Gemini and Copilot parse stdout as a decision too.
* It always exits 0. A dead daemon, a bad port or a malformed payload is not
  the host tool's problem.

Wrap mode (``--wrap-b64 <base64 of a command line> [--sh <shell>]``), written
by ``aictl hooks wrap`` around a user's own hook: a transparent pass-through.
The command runs under the shell with the same stdin bytes, environment and
folder; its stdout and stderr are written back unchanged and its exit code is
this process's exit code (128+N for a command killed by signal N, 127 when it
cannot start). The report (``aictl_hook.wrapped``) goes out after that, from a
forked process, so the tool never waits on the daemon. Monitoring, never control.

Both modes are stdlib-only and import nothing from the aictl package. They are
run by file path under ``python -I -S`` so one invocation costs interpreter
start plus a socket write, not the aictl package import. Keep it that way: the
guard test runs it from a directory holding only this file. The modules only
wrap mode needs are imported inside it.

Usage:
    python -I -S /path/to/aictl/hook_handler.py --event SessionStart --port 8484
    python -I -S /path/to/aictl/hook_handler.py --event PreToolUse --port 8484 --sh /bin/bash --wrap-b64 <B64>
"""

from __future__ import annotations

import json
import os
import sys
import time

# Process names that are just the shell the tool used to run this hook. The
# tool's own process sits above them.
_SHELL_NAMES = frozenset({"sh", "bash", "zsh", "dash", "fish", "powershell", "pwsh", "cmd", "cmd.exe"})

# Events that open a session: only these join a hook session to a process, so
# only these pay for the ``ps`` walk.
_PID_EVENTS = frozenset({"Init", "SessionStart"})

_CONNECT_TIMEOUT = 0.2
_RESPONSE_TIMEOUT = 0.3
_MAX_PAYLOAD_BYTES = 16 * 1024 * 1024
FORMAT_VERSION = 1
# A wrapped hook's stdout is reported as text up to this size.
_MAX_REPORTED_STDOUT = 65536
# The server refuses a larger POST (``_receive_hook``), so a larger call is reported cut.
_MAX_BODY_BYTES = 1_000_000
_MAX_CUT_STRING = 4096


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


def _read_stdin() -> tuple[bytes, bool]:
    """Up to the payload cap of stdin, and whether there was more. A tty (no pipe) is no input."""
    try:
        if sys.stdin.isatty():
            return b"", False
        raw = getattr(sys.stdin, "buffer", sys.stdin).read(_MAX_PAYLOAD_BYTES + 1)
    except (ValueError, OSError, AttributeError):
        return b"", False
    if isinstance(raw, str):
        raw = raw.encode("utf-8", "surrogateescape")
    if len(raw) > _MAX_PAYLOAD_BYTES:
        return raw[:_MAX_PAYLOAD_BYTES], True
    return raw, False


def _parse_payload(raw: bytes, truncated: bool) -> dict:
    """*raw* as a JSON object; anything else (including no input) is ``{}``."""
    if truncated:
        return {"_aictl_truncated": True}
    try:
        data = json.loads(raw) if raw else {}
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def _read_payload() -> dict:
    """Parse stdin as a JSON object; anything else (including no stdin) is ``{}``."""
    return _parse_payload(*_read_stdin())


def _enrich(data: dict, event: str, source: str, call_ts: float, payload_bytes: int, truncated: bool) -> dict:
    """Add the event name, the session and folder when missing, and the v1 envelope."""
    added = [k for k in ("session_id", "cwd") if k not in data]
    data["event"] = event
    # Copilot's camelCase events send sessionId, not session_id.
    data.setdefault("session_id", data.get("sessionId") or os.environ.get("SESSION_ID", ""))
    data.setdefault("cwd", os.environ.get("CWD", ""))
    if truncated:
        added.append("_aictl_truncated")
    # Capture wrapper identity + caller process info for observability.
    data["aictl_hook"] = {
        "v": FORMAT_VERSION,
        "call_id": os.urandom(16).hex(),
        "ts": call_ts,
        "source": source,
        "pid": os.getpid(),
        "ppid": os.getppid(),
        "py": sys.executable,
        "payload_bytes": payload_bytes,
        "truncated": truncated,
        "added": added,
    }
    return data


def _body(data: dict) -> bytes:
    """*data* as the POST body. One the server would refuse keeps its numbers and short
    strings and is marked truncated, so the call is still recorded."""
    body = json.dumps(data).encode()
    if len(body) <= _MAX_BODY_BYTES:
        return body
    meta = data["aictl_hook"]
    meta["truncated"] = True
    wrapped = meta.get("wrapped")
    if isinstance(wrapped, dict):
        wrapped.pop("stdout", None)
    cut = {
        k: v
        for k, v in data.items()
        if k == "aictl_hook" or isinstance(v, (int, float)) or (isinstance(v, str) and len(v) <= _MAX_CUT_STRING)
    }
    return json.dumps(cut).encode()


def main() -> int:
    """Run one hook call; returns the exit code (always 0 in observer mode)."""
    call_ts = time.time()  # the time of the hook call, before anything else
    # Minimal arg parsing: no argparse import, to keep startup fast.
    event = ""
    port = 8484
    source = "unknown"
    wrap_b64: str | None = None
    shell = ""
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
        elif args[i] == "--wrap-b64" and i + 1 < len(args):
            wrap_b64 = args[i + 1]
            i += 2
        elif args[i] == "--sh" and i + 1 < len(args):
            shell = args[i + 1]
            i += 2
        else:
            i += 1

    if wrap_b64 is not None:
        return _wrap(call_ts, event, port, source, wrap_b64, shell)

    raw, truncated = _read_stdin()
    data = _parse_payload(raw, truncated)

    added_pid = False
    # The tool's pid lets the server join this hook session onto the
    # process-derived session the correlator already tracks.
    if not data.get("pid") and event in _PID_EVENTS:
        data["pid"] = tool_pid(os.getppid())
        added_pid = True
    data = _enrich(data, event, source, call_ts, len(raw), truncated)
    if added_pid:
        data["aictl_hook"]["added"].append("pid")

    # Best-effort: the daemon being down is a normal state.
    try:
        _post(port, _body(data))
    except Exception:  # noqa: BLE001, S110 - must not crash if aictl unreachable
        pass
    return 0


# ── Wrap mode: a user's hook runs through this handler, unchanged ───────────────


def _resolve_shell(name: str) -> str:
    """*name* when it is (or names on PATH) an executable, else ``/bin/sh``."""
    name = name.lstrip("-")  # a login shell's $0 is "-bash"
    if name:
        candidates = (
            [name]
            if os.sep in name
            else [os.path.join(d, name) for d in os.environ.get("PATH", "").split(os.pathsep) if d]
        )
        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path
    return "/bin/sh"


def _write_all(fd: int, data: bytes) -> None:
    view = memoryview(data)
    while view:
        try:
            n = os.write(fd, view)
        except InterruptedError:
            continue
        except OSError:
            return  # the reader is gone; the exit code still tells the result
        view = view[n:]


def _run_wrapped(command: str, shell: str, started: list) -> tuple[int, bytes, bytes, bytes, float]:
    """Run *command* with this process's stdin; ``(exit code, stdout, stderr, stdin, ms)``.

    The process is appended to *started* as soon as it exists.
    """
    import signal
    import subprocess

    try:
        tty = sys.stdin.isatty()
    except (ValueError, OSError, AttributeError):
        tty = True
    raw = b""
    if not tty:
        try:
            raw = getattr(sys.stdin, "buffer", sys.stdin).read()
        except (ValueError, OSError):
            raw = b""
        if isinstance(raw, str):
            raw = raw.encode("utf-8", "surrogateescape")
    run_started = time.monotonic()
    try:
        proc = subprocess.Popen(
            [_resolve_shell(shell), "-c", command],
            stdin=None if tty else subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except OSError:
        started.append(None)  # the shell itself cannot start: 127, as the tool would see
        return 127, b"", b"", raw, 0.0
    started.append(proc)
    previous = {}

    def forward(signum, _frame):
        try:
            proc.send_signal(signum)
        except OSError:
            pass

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            previous[sig] = signal.signal(sig, forward)
        except (OSError, ValueError):
            pass
    try:
        out, err = proc.communicate(None if tty else raw)
    finally:
        for sig, handler in previous.items():
            try:
                signal.signal(sig, handler)
            except (OSError, ValueError):
                pass
    rc = proc.returncode
    return (128 - rc if rc < 0 else rc), out, err, raw, (time.monotonic() - run_started) * 1000


def _wrap(call_ts: float, event: str, port: int, source: str, wrap_b64: str, shell: str) -> int:
    """Run the wrapped command as the tool would have, then report it. Returns its exit code."""
    began = time.monotonic()
    try:
        import base64

        command = base64.b64decode(wrap_b64.encode("ascii"), validate=True).decode("utf-8")
    except (ValueError, UnicodeError, ImportError):
        return 127
    started: list = []
    try:
        code, out, err, raw, duration = _run_wrapped(command, shell, started)
    except BaseException:  # noqa: BLE001 - the wrapper failed, not the command: the command still decides
        if not started:
            # It never ran. Become it, so a failure here cannot turn a hook off.
            os.execv("/bin/sh", ["/bin/sh", "-c", command])
        if started[0] is None:
            return 127
        rc = started[0].wait()
        return 128 - rc if rc < 0 else rc
    _write_all(1, out)
    _write_all(2, err)
    overhead = (time.monotonic() - began) * 1000 - duration
    try:
        within = len(raw) <= _MAX_PAYLOAD_BYTES
        data = _parse_payload(raw, False) if within else {"_aictl_truncated": True}
        data = _enrich(data, event, source, call_ts, len(raw), not within)
        wrapped = {
            "command": command,
            "exit_code": code,
            "duration_ms": round(duration, 3),
            "stdout_bytes": len(out),
            "stderr_bytes": len(err),
            "overhead_ms": round(max(overhead, 0.0), 3),
        }
        if len(out) <= _MAX_REPORTED_STDOUT:
            try:
                wrapped["stdout"] = out.decode("utf-8")
            except UnicodeDecodeError:
                pass
        data["aictl_hook"]["wrapped"] = wrapped
        _report(port, _body(data))
    except Exception:  # noqa: BLE001, S110 - the report never changes the outcome
        pass
    return code


def _report(port: int, body: bytes) -> None:
    """Send *body* from a forked process with no stdio, so the tool is not kept waiting."""
    fork = getattr(os, "fork", None)
    if fork is None:
        try:
            _post(port, body)
        except Exception:  # noqa: BLE001, S110 - the daemon being down is a normal state
            pass
        return
    if fork() != 0:
        return
    try:
        for fd in (0, 1, 2):
            try:
                os.close(fd)
            except OSError:
                pass
        _post(port, body)
    except BaseException:  # noqa: BLE001, S110 - the child only reports
        pass
    finally:
        os._exit(0)


if __name__ == "__main__":
    _code = 0
    try:
        _code = main()
    except BaseException:  # noqa: BLE001, S110 - fail-open contract, see module docstring
        pass
    os._exit(_code if isinstance(_code, int) else 0)  # no interpreter teardown
