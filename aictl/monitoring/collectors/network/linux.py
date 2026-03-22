# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Linux network sampling via ss/tcpinfo."""

from __future__ import annotations

import asyncio
import re
import shutil
import subprocess

from .base import NetworkCollector
from ...events import ProcessInfo
from ....data.schema import metric_name as M


_PID_RE = re.compile(r'\("(?P<name>[^"]+)",pid=(?P<pid>\d+)')
_BYTES_SENT_RE = re.compile(r"bytes_sent:(?P<value>\d+)")
_BYTES_ACKED_RE = re.compile(r"bytes_acked:(?P<value>\d+)")
_BYTES_RECEIVED_RE = re.compile(r"bytes_received:(?P<value>\d+)")


class LinuxNetworkCollector(NetworkCollector):
    """Use `ss -tinpH` deltas as the Linux network adapter."""

    name = "network:linux-ebpf"

    def __init__(self, interval: float) -> None:
        super().__init__()
        self.interval = max(0.5, interval)

    @staticmethod
    def is_supported() -> bool:
        return shutil.which("ss") is not None

    async def run(self) -> None:
        if not self.is_supported():
            await self.report_status(
                status="disabled",
                mode="unsupported",
                detail="ss is not available on this host",
            )
            return

        await self.report_status(
            status="degraded",
            mode="ss-tcpinfo",
            detail="Using ss/tcpinfo deltas as the Linux fallback path",
        )

        previous: dict[tuple[int, str, str], tuple[int, int, str]] = {}
        while True:
            snapshot = await asyncio.to_thread(parse_ss_snapshot)
            for key, current in snapshot.items():
                prior = previous.get(key)
                if prior is None:
                    continue
                bytes_in = max(0, current[0] - prior[0])
                bytes_out = max(0, current[1] - prior[1])
                if bytes_in == 0 and bytes_out == 0:
                    continue
                pid, local_addr, remote_addr = key
                proc = ProcessInfo(pid=pid, ppid=None, name=current[2])
                if self.correlator:
                    self.correlator.on_network(pid, bytes_in, bytes_out, process=proc)
                self.sink_emit(M("process.network.io"), float(bytes_in),
                               {"process.pid": str(pid), "process.name": proc.name,
                                "network.io.direction": "receive"})
                self.sink_emit(M("process.network.io"), float(bytes_out),
                               {"process.pid": str(pid), "process.name": proc.name,
                                "network.io.direction": "transmit"})
            previous = snapshot
            await self.sleep(self.interval)


def parse_ss_snapshot() -> dict[tuple[int, str, str], tuple[int, int, str]]:
    """Capture the current `ss -tinpH` view keyed by pid/local/remote."""

    try:
        result = subprocess.run(
            ["ss", "-tinpH"],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return {}
    if result.returncode != 0:
        return {}

    lines = [line.rstrip() for line in result.stdout.splitlines() if line.strip()]
    snapshot: dict[tuple[int, str, str], tuple[int, int, str]] = {}
    index = 0
    while index < len(lines):
        line = lines[index]
        info_line = lines[index + 1] if index + 1 < len(lines) else ""
        if info_line.startswith((" ", "\t")) or "bytes_" in info_line:
            index += 2
        else:
            info_line = ""
            index += 1

        parts = line.split()
        if len(parts) < 5:
            continue
        match = _PID_RE.search(line)
        if match is None:
            continue
        pid = int(match.group("pid"))
        name = match.group("name")
        local_addr = parts[3]
        remote_addr = parts[4]
        snapshot[(pid, local_addr, remote_addr)] = (
            _first_int(_BYTES_RECEIVED_RE.search(info_line)),
            _first_int(_BYTES_SENT_RE.search(info_line), _BYTES_ACKED_RE.search(info_line)),
            name,
        )

    return snapshot


def _first_int(*matches) -> int:
    for match in matches:
        if match is not None:
            return int(match.group("value"))
    return 0
