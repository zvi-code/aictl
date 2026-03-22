# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""macOS per-process network sampling via nettop."""

from __future__ import annotations

import asyncio
import csv
import logging
import re
import shutil
import subprocess
import threading

from dataclasses import dataclass

from .base import NetworkCollector
from ...events import ProcessInfo
from ....data.schema import metric_name as M

log = logging.getLogger(__name__)


_PROCESS_RE = re.compile(r"^(?P<name>.+)\.(?P<pid>\d+)$")


class MacOSNetworkCollector(NetworkCollector):
    """Use `nettop` CSV output as the macOS network adapter."""

    name = "network:macos-bpf"

    def __init__(self, interval: float, *, debug: bool = False) -> None:
        super().__init__()
        self.interval = max(0.5, interval)
        self.debug = debug

    @staticmethod
    def is_supported() -> bool:
        return shutil.which("nettop") is not None

    async def run(self) -> None:
        if not self.is_supported():
            await self.report_status(
                status="disabled",
                mode="unsupported",
                detail="nettop is not available on this host",
            )
            return

        await self.report_status(
            status="active",
            mode="nettop-csv",
            detail="Streaming per-process network samples via nettop",
        )

        # nettop block-buffers when stdout is not a tty. asyncio PIPE
        # never receives data. Work around: run Popen in a thread, push
        # parsed samples into a thread-safe queue, drain from async side.
        #
        # nettop -L N exits after N snapshots (~N seconds). We restart it
        # in a loop to get continuous monitoring. Between restarts, the
        # `previous` dict is preserved so we maintain delta baselines.
        loop = asyncio.get_running_loop()
        stop_event = threading.Event()
        queue: asyncio.Queue = asyncio.Queue()
        previous: dict[int, tuple[int, int]] = {}

        def _reader():
            """Sync thread: run nettop repeatedly, push samples to queue."""
            while not stop_event.is_set():
                try:
                    proc = subprocess.Popen(
                        ["nettop", "-P", "-L", "6", "-n"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        bufsize=1,
                    )
                    for line in proc.stdout:
                        if stop_event.is_set():
                            break
                        sample = parse_nettop_line(line.strip(), previous)
                        if sample is not None:
                            try:
                                loop.call_soon_threadsafe(queue.put_nowait, sample)
                            except (asyncio.QueueFull, RuntimeError):
                                pass
                    proc.terminate()
                    proc.wait()
                except Exception:
                    pass
                # Brief pause between restarts (nettop already took ~6s)
                stop_event.wait(0.5)
            # Signal done
            try:
                loop.call_soon_threadsafe(queue.put_nowait, None)
            except RuntimeError:
                pass

        reader_thread = threading.Thread(target=_reader, daemon=True)
        reader_thread.start()

        try:
            while True:
                sample = await queue.get()
                if sample is None:
                    break
                if self.debug:
                    log.info("nettop sample: pid=%d name=%s in=%d out=%d",
                             sample.pid, sample.name, sample.bytes_in, sample.bytes_out)
                # Correlator: typed session tracking
                if self.correlator:
                    proc = ProcessInfo(pid=sample.pid, ppid=None, name=sample.name)
                    resolved = self.correlator.on_network(
                        sample.pid, sample.bytes_in, sample.bytes_out,
                        process=proc)
                    if self.debug:
                        if resolved:
                            log.info("  -> resolved to session %s", resolved)
                        else:
                            log.info("  -> unresolved (pid %d, name '%s')",
                                     sample.pid, sample.name)
                # Sink: per-PID network at full nettop resolution
                self.sink_emit(M("process.network.io"),
                               float(sample.bytes_in),
                               {"process.pid": str(sample.pid), "process.name": sample.name,
                                "network.io.direction": "receive"})
                self.sink_emit(M("process.network.io"),
                               float(sample.bytes_out),
                               {"process.pid": str(sample.pid), "process.name": sample.name,
                                "network.io.direction": "transmit"})
        except asyncio.CancelledError:
            stop_event.set()
            raise


@dataclass(slots=True)
class NetSample:
    """Parsed nettop network delta for one process."""
    pid: int
    name: str
    bytes_in: int
    bytes_out: int


def parse_nettop_line(line: str, previous: dict[int, tuple[int, int]]) -> NetSample | None:
    """Parse one `nettop -P -L` CSV row into a network sample."""

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

    # Detect counter resets (nettop restart, PID recycled, or overflow).
    # When cumulative bytes go DOWN, treat this snapshot as a fresh
    # baseline instead of computing a negative delta clamped to 0.
    if bytes_in < prior[0] or bytes_out < prior[1]:
        return None

    delta_in = bytes_in - prior[0]
    delta_out = bytes_out - prior[1]
    if delta_in == 0 and delta_out == 0:
        return None

    return NetSample(pid=pid, name=name, bytes_in=delta_in, bytes_out=delta_out)
