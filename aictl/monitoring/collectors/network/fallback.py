# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Portable degraded network sampling."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from .base import NetworkCollector
from ...events import ProcessInfo
from ....data.schema import metric_name as M


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
