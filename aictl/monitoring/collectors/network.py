# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Network collectors — base, platform-specific, and factory."""

from __future__ import annotations

import asyncio
import csv
import logging
import re
import shutil
import subprocess
import threading
from collections import defaultdict
from dataclasses import dataclass

from . import BaseCollector
from ..session import ProcessInfo
from ...data.schema import metric_name as M
from ...platforms import IS_MACOS, IS_WINDOWS

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class NetworkCollector(BaseCollector):
    """Base class for network collectors."""

    name = "network"


# ---------------------------------------------------------------------------
# Psutil fallback (cross-platform degraded adapter)
# ---------------------------------------------------------------------------

class PsutilFallbackNetworkCollector(NetworkCollector):
    """Approximate per-process traffic by weighting system totals."""

    def __init__(
        self,
        interval: float,
        *,
        name: str = "network:psutil",
        status: str = "degraded",
        mode: str = "system-share",
        detail: str = "System network totals weighted by active remote connections",
    ) -> None:
        super().__init__()
        self.interval = interval
        self.name = name
        self._status = status
        self._mode = mode
        self._detail = detail

    async def run(self) -> None:
        try:
            import psutil
        except ImportError:
            await self.report_status(
                status="disabled",
                mode="missing-dependency",
                detail="Install psutil or use aictl[monitor]",
            )
            return

        await self.report_status(status=self._status, mode=self._mode, detail=self._detail)
        previous = psutil.net_io_counters()

        while True:
            samples = await asyncio.to_thread(self._sample, psutil)
            current = psutil.net_io_counters()
            total_out = max(0, current.bytes_sent - previous.bytes_sent)
            total_in = max(0, current.bytes_recv - previous.bytes_recv)
            previous = current

            weights = list(samples.items())
            total_weight = sum(sample["weight"] for _, sample in weights)
            if total_weight > 0 and (total_out or total_in):
                remaining_out = total_out
                remaining_in = total_in
                for index, (pid, sample) in enumerate(weights):
                    if index == len(weights) - 1:
                        bytes_out = remaining_out
                        bytes_in = remaining_in
                    else:
                        share = sample["weight"] / total_weight
                        bytes_out = int(total_out * share)
                        bytes_in = int(total_in * share)
                        remaining_out -= bytes_out
                        remaining_in -= bytes_in
                    if bytes_out == 0 and bytes_in == 0:
                        continue
                    proc = ProcessInfo(pid=pid, ppid=None, name=str(sample["name"]))
                    if self.correlator:
                        self.correlator.on_network(pid, bytes_in, bytes_out, process=proc)
                    self.sink_emit(M("process.network.io"), float(bytes_in),
                                   {"process.pid": str(pid), "process.name": proc.name,
                                    "network.io.direction": "receive"})
                    self.sink_emit(M("process.network.io"), float(bytes_out),
                                   {"process.pid": str(pid), "process.name": proc.name,
                                    "network.io.direction": "transmit"})

            await self.sleep(self.interval)

    def _sample(self, psutil_module):
        grouped: dict[int, dict[str, object]] = defaultdict(
            lambda: {"weight": 0, "remotes": set(), "name": "unknown"}
        )
        try:
            connections = psutil_module.net_connections(kind="tcp")
        except Exception:
            return grouped

        for connection in connections:
            pid = connection.pid
            if pid is None or not connection.raddr:
                continue
            remote_ip = getattr(connection.raddr, "ip", "")
            if remote_ip.startswith("127.") or remote_ip == "::1":
                continue
            grouped[pid]["weight"] = int(grouped[pid]["weight"]) + 1
            grouped[pid]["remotes"].add(f"{remote_ip}:{getattr(connection.raddr, 'port', '')}")
            if grouped[pid]["name"] == "unknown":
                try:
                    grouped[pid]["name"] = psutil_module.Process(pid).name()
                except Exception:
                    grouped[pid]["name"] = "unknown"
        return grouped


# ---------------------------------------------------------------------------
# macOS — nettop CSV
# ---------------------------------------------------------------------------

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
                except Exception as exc:
                    log.warning("nettop reader error: %s", exc)
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


# ---------------------------------------------------------------------------
# Linux — ss/tcpinfo
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Windows — ETW/WFP fallback
# ---------------------------------------------------------------------------

class WindowsNetworkCollector(PsutilFallbackNetworkCollector):
    """Connection-weighted fallback for Windows."""

    def __init__(self, interval: float) -> None:
        super().__init__(
            interval=interval,
            name="network:windows-etw",
            status="degraded",
            mode="etw-fallback",
            detail="ETW/WFP bindings are not bundled yet; using weighted fallback sampling",
        )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def select_network_collector(config):
    """Return the right network collector instance for the current platform."""
    if IS_MACOS and MacOSNetworkCollector.is_supported():
        return MacOSNetworkCollector(config.network_interval, debug=config.debug_network)
    if not IS_MACOS and not IS_WINDOWS and LinuxNetworkCollector.is_supported():
        return LinuxNetworkCollector(config.network_interval)
    if IS_WINDOWS:
        return WindowsNetworkCollector(config.network_interval)
    return PsutilFallbackNetworkCollector(config.network_interval)
