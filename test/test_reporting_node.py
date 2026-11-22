"""A reporting node writes to the store and starts nothing that only a local dashboard reads."""

import threading

from click.testing import CliRunner

import aictl.kusto
import aictl.orchestrator as orchestrator
from aictl import platforms
from aictl.commands import daemon
from aictl.dashboard import ingester_runner
from aictl.monitoring.pace import IDLE_FACTOR, Pace


def live_threads():
    return sorted(t.name for t in threading.enumerate() if t.name.startswith("aictl-live-"))


def opened(monkeypatch, tmp_path, **options):
    monkeypatch.setattr(aictl.kusto, "kusto_settings", lambda: None)
    monkeypatch.setattr(platforms, "load_config", lambda: platforms.AictlConfig(logging_enabled=False))
    service = orchestrator.CollectionService(tmp_path, **options)
    service.open_stores(quiet=True)
    return service


def test_a_reporting_node_starts_no_live_hub_and_no_live_source_threads(monkeypatch, tmp_path):
    before = live_threads()
    service = opened(monkeypatch, tmp_path, reporting_only=True)
    try:
        assert service.store.live_hub is None and service.store.live_sources is None
        assert live_threads() == before
    finally:
        service.stop()


def test_a_dashboard_node_still_starts_them(monkeypatch, tmp_path):
    service = opened(monkeypatch, tmp_path)
    try:
        assert service.store.live_hub is not None
        assert len(live_threads()) == 3
    finally:
        service.stop()


def serve(monkeypatch, *args):
    seen = {}
    monkeypatch.setattr(daemon, "load_config", lambda: platforms.AictlConfig())
    monkeypatch.setattr(daemon, "kusto_settings", lambda: None)
    monkeypatch.setattr(daemon.os, "_exit", lambda code: None)
    monkeypatch.setattr(orchestrator, "start_collector", lambda root, **options: seen.update(options))
    result = CliRunner().invoke(daemon.serve, ["--headless", *args])
    assert result.exit_code == 0, result.output
    return seen


def test_headless_defaults_to_no_monitor_and_a_slow_snapshot(monkeypatch):
    seen = serve(monkeypatch)
    assert seen["include_live_monitor"] is False
    assert seen["interval"] == daemon.REPORTING_INTERVAL_S


def test_headless_keeps_what_the_command_line_asks_for(monkeypatch):
    seen = serve(monkeypatch, "--monitor", "--interval", "5")
    assert seen["include_live_monitor"] is True and seen["interval"] == 5.0


def test_start_collector_builds_a_reporting_only_service(monkeypatch, tmp_path):
    built = {}

    class Service:
        def __init__(self, root, **options):
            built.update(options)

        def start(self):
            raise KeyboardInterrupt

        def stop(self):
            built["stopped"] = True

    monkeypatch.setattr(orchestrator, "CollectionService", Service)
    try:
        orchestrator.start_collector(tmp_path)
    except KeyboardInterrupt:
        pass
    assert built["reporting_only"] is True


def test_new_session_rows_keep_collectors_at_full_pace(monkeypatch):
    pace = Pace()
    monkeypatch.setattr(ingester_runner, "PACE", pace)
    stop = threading.Event()

    class Ingester:
        def __init__(self, rows):
            self.rows = rows

        def poll(self):
            stop.set()
            return self.rows

    assert pace.factor() == IDLE_FACTOR
    ingester_runner._poll_loop(Ingester(0), stop, 0.0, "test")
    assert pace.factor() == IDLE_FACTOR
    stop.clear()
    ingester_runner._poll_loop(Ingester(2), stop, 0.0, "test")
    assert pace.factor() == 1
