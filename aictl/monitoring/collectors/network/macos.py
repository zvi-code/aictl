"""macOS per-process network sampling via nettop."""

from __future__ import annotations

import asyncio
import csv
import re
import shutil

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

        process = await asyncio.create_subprocess_exec(
            "nettop",
            "-P",
            "-L",
            "0",
            "-x",
            "-n",
            "-s",
            str(self.interval),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        previous: dict[int, tuple[int, int]] = {}

        try:
            assert process.stdout is not None
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                event = parse_nettop_line(line.decode(errors="ignore").strip(), previous)
                if event is not None:
                    await emit(event)
        except asyncio.CancelledError:
            if process.returncode is None:
                process.terminate()
            raise
        finally:
            if process.returncode is None:
                process.terminate()
            await process.wait()


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
