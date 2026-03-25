"""macOS per-process network sampling via nettop."""

from __future__ import annotations

import asyncio
import csv
import re
import shutil
import subprocess
import threading

from .base import NetworkCollector
from ...events import EventKind, ProcessInfo, UnifiedEvent


_PROCESS_RE = re.compile(r"^(?P<name>.+)\.(?P<pid>\d+)$")


class MacOSNetworkCollector(NetworkCollector):
    """Use `nettop` CSV output as the macOS network adapter."""

    name = "network:macos-bpf"

    def __init__(self, interval: float) -> None:
        self.interval = max(0.5, interval)

    @staticmethod
    def is_supported() -> bool:
        return shutil.which("nettop") is not None

    async def run(self, emit) -> None:
        if not self.is_supported():
            await self.emit_status(
                emit,
                status="disabled",
                mode="unsupported",
                detail="nettop is not available on this host",
            )
            return

        await self.emit_status(
            emit,
            status="active",
            mode="nettop-csv",
            detail="Streaming per-process network samples via nettop",
        )

        # nettop block-buffers when stdout is not a tty. asyncio PIPE
        # never receives data. Work around: run Popen in a thread, push
        # parsed events into a thread-safe queue, drain from async side.
        loop = asyncio.get_running_loop()
        stop_event = threading.Event()
        queue: asyncio.Queue = asyncio.Queue()
        previous: dict[int, tuple[int, int]] = {}

        def _reader():
            """Sync thread: run nettop, push events to queue."""
            try:
                # nettop -L (CSV mode) + -s (interval) is broken on some macOS
                # versions — it prints help instead of data. Use -L without -s.
                # Use a small sample count so nettop finishes within the
                # monitoring window (each sample takes ~1s at default interval).
                # -L 4 = 4 snapshots over ~4s: first is baseline, 2-4 produce deltas.
                proc = subprocess.Popen(
                    ["nettop", "-P", "-L", "4", "-n"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                )
                for line in proc.stdout:
                    if stop_event.is_set():
                        break
                    event = parse_nettop_line(line.strip(), previous)
                    if event is not None:
                        try:
                            loop.call_soon_threadsafe(queue.put_nowait, event)
                        except (asyncio.QueueFull, RuntimeError):
                            pass  # drop event if queue full or loop closed
                proc.terminate()
                proc.wait()
            except Exception:
                pass
            # Signal done — loop may already be closed if snapshot timed out
            try:
                loop.call_soon_threadsafe(queue.put_nowait, None)
            except RuntimeError:
                pass

        reader_thread = threading.Thread(target=_reader, daemon=True)
        reader_thread.start()

        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                await emit(event)
        except asyncio.CancelledError:
            stop_event.set()
            raise


def parse_nettop_line(line: str, previous: dict[int, tuple[int, int]]) -> UnifiedEvent | None:
    """Parse one `nettop -P -L` CSV row into a unified event."""

    if not line or line.startswith("time,"):
        return None

    row = next(csv.reader([line]))
    if len(row) < 6:
        return None
    match = _PROCESS_RE.match(row[1].strip())
    if match is None:
        return None
    pid = int(match.group("pid"))
    name = match.group("name")
    try:
        bytes_in = int(row[4] or 0)
        bytes_out = int(row[5] or 0)
    except ValueError:
        return None

    prior = previous.get(pid)
    previous[pid] = (bytes_in, bytes_out)
    if prior is None:
        return None

    delta_in = max(0, bytes_in - prior[0])
    delta_out = max(0, bytes_out - prior[1])
    if delta_in == 0 and delta_out == 0:
        return None

    return UnifiedEvent(
        kind=EventKind.NETWORK_SAMPLE,
        source="network:macos-bpf",
        pid=pid,
        process=ProcessInfo(pid=pid, ppid=None, name=name),
        metrics={"bytes_in": delta_in, "bytes_out": delta_out, "confidence": 0.75},
        payload={"mode": "nettop-csv"},
    )
