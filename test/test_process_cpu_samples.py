"""The per-tool CPU the daemon stores is measured, not the 0 of a first psutil read."""

from __future__ import annotations

import json
import sys
from types import SimpleNamespace

import pytest

from aictl import tools
from aictl.dashboard.models import DashboardSnapshot
from aictl.orchestrator import SnapshotPersistence, SnapshotState
from aictl.stores.kusto.writer import KustoWriter
from aictl.tools import ProcessInfo


class FakeProcess:
    """psutil.Process semantics: cpu_percent() measures since the previous call on the same handle."""

    busy: dict[int, float] = {}
    alive: set[int] = set()

    def __init__(self, pid):
        if pid not in self.alive:
            raise ProcessLookupError(pid)
        self.pid, self._primed = pid, False

    def is_running(self):
        return self.pid in self.alive

    def oneshot(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def cpu_percent(self, interval=None):
        value = self.busy[self.pid] if self._primed else 0.0
        self._primed = True
        return value

    def memory_info(self):
        return SimpleNamespace(rss=512 * 1024 * 1024)


class FakeEntry:
    def __init__(self, pid):
        self.info = {"pid": pid, "name": f"proc{pid}"}

    def cmdline(self):
        return [f"proc{self.info['pid']}"]


@pytest.fixture
def psutil_fake(monkeypatch):
    FakeProcess.busy = {7: 42.5}
    FakeProcess.alive = {7}
    fake = SimpleNamespace(
        Process=FakeProcess,
        process_iter=lambda _attrs: [FakeEntry(pid) for pid in sorted(FakeProcess.alive)],
        NoSuchProcess=ProcessLookupError, AccessDenied=PermissionError, ZombieProcess=ProcessLookupError,
    )
    monkeypatch.setitem(sys.modules, "psutil", fake)
    monkeypatch.setattr(tools, "_cpu_handles", {}, raising=False)
    clock = [1000.0]
    monkeypatch.setattr(tools.time, "monotonic", lambda: clock[0])
    return clock


def _tool_rows(pid_stats):
    cpu, rss = pid_stats
    process = ProcessInfo(pid=7, name="proc7", cmdline="proc7", cpu_pct=cpu, mem_mb=tools._rss_to_mb(rss)[1])
    tool = SimpleNamespace(tool="claude-code", processes=[process], files=[], live=None)
    return SnapshotState().update(SimpleNamespace(tools=[tool]))


def _stored(rows_by_scan):
    batches = []
    ingester = SimpleNamespace(ingest=lambda table, rows: batches.append((table, rows)),
                               ingest_lines=lambda table, lines: batches.append((table, [json.loads(x) for x in lines])))
    writer = KustoWriter(ingester, node_id="test")
    persistence = SnapshotPersistence(writer=writer)
    for ts, rows in rows_by_scan:
        persistence._persist_samples(DashboardSnapshot(timestamp=ts, root="", tools=[]), rows)
    writer.flush()
    return [row for table, rows in batches if table == "process_snapshots" for row in rows]


def test_busy_process_yields_a_non_zero_cpu_row(psutil_fake):
    first = _tool_rows(tools._proc_stats(7))
    psutil_fake[0] += 5
    second = _tool_rows(tools._proc_stats(7))
    stored = _stored([(100, first), (105, second)])
    # The first scan has no earlier sample: CPU is unknown, not 0. The second measures the 5 s between.
    assert [(row["cpu_percent"], row["memory_rss_mb"]) for row in stored] == [(None, 512), (42.5, 512)]


def test_a_second_read_in_the_same_scan_reuses_the_measurement(psutil_fake):
    tools._proc_stats(7)
    psutil_fake[0] += 5
    assert tools._proc_stats(7)[0] == "42.5"
    FakeProcess.busy[7] = 99.0
    psutil_fake[0] += 0.01
    assert tools._proc_stats(7)[0] == "42.5"


def test_a_reused_pid_starts_unmeasured_and_gone_pids_are_dropped(psutil_fake):
    tools._proc_stats(7)
    psutil_fake[0] += 5
    assert tools._proc_stats(7)[0] == "42.5"
    FakeProcess.alive = {8}
    tools._parse_ps_output()
    assert 7 not in tools._cpu_handles
    FakeProcess.alive = {7}
    psutil_fake[0] += 5
    assert tools._proc_stats(7)[0] == ""


def test_tool_with_no_process_stores_zero_and_unreadable_cpu_is_unknown():
    assert SnapshotState().update(SimpleNamespace(tools=[
        SimpleNamespace(tool="cursor", processes=[], files=[], live=None),
        SimpleNamespace(tool="codex-cli", processes=[ProcessInfo(pid=1, name="a", cmdline="a", cpu_pct="", mem_mb="5.0")],
                        files=[], live=None),
    ])) == [("cursor", 0, 0, 0, 0.0), ("codex-cli", None, 5.0, 0, 0.0)]


def test_resources_view_holds_a_sample_longer_than_the_daemon_heartbeat():
    from importlib.resources import files

    from aictl.orchestrator import SAMPLE_HEARTBEAT_S

    text = (files("aictl.stores.kusto") / "queries" / "runtime.resources.kql").read_text()
    hold = float(text.split("let hold = ", 1)[1].split(";", 1)[0])
    # Shorter, and a held value would vanish between two heartbeats; much longer, and a stopped daemon's
    # last sample would be drawn as if it were still measured.
    assert SAMPLE_HEARTBEAT_S < hold <= SAMPLE_HEARTBEAT_S * 1.5
