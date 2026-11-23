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

    class Stop(Exception):
        pass

    class Service:
        def __init__(self, root, **options):
            built.update(options)

        def open_stores(self):
            raise Stop

    monkeypatch.setattr(orchestrator, "CollectionService", Service)
    try:
        orchestrator.start_collector(tmp_path)
    except Stop:
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


# ── The receive-only port ─────────────────────────────────────────


def post(url, data):
    import json
    import urllib.request

    request = urllib.request.Request(url, data=json.dumps(data).encode(), method="POST",
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=5) as response:
        return response.status


def status_of(url, method="GET"):
    import urllib.error
    import urllib.request

    try:
        with urllib.request.urlopen(urllib.request.Request(url, method=method), timeout=5) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def test_a_reporting_node_takes_hooks_and_telemetry_and_serves_nothing_else(kusto_store):
    store = orchestrator.SnapshotStore(history_store=kusto_store.history_store, keeps_text=lambda: True)
    receiver = orchestrator._start_receiver(store, ("127.0.0.1", 0))
    try:
        base = f"http://127.0.0.1:{receiver.server_address[1]}"
        assert post(base + "/api/hooks", {"event": "Stop", "session_id": "s-node", "_aictl_verify": True}) == 200
        assert post(base + "/v1/metrics", {"resourceMetrics": []}) == 200
        assert post(base + "/v1/logs", {"resourceLogs": []}) == 200
        assert post(base + "/v1/traces", {"resourceSpans": []}) == 200
        for path in ("/", "/api/board/sessions", "/api/live/stream", "/api/file?path=/etc/hosts", "/assets/x.js"):
            assert status_of(base + path) == 404
        assert status_of(base + "/api/settings/file", "PUT") == 404
        assert not hasattr(receiver, "live_dashboard") and store.live_hub is None
    finally:
        receiver.shutdown()
        receiver.server_close()


def test_a_port_in_use_is_reported_and_the_node_keeps_reporting(kusto_store, capsys):
    import socket

    store = orchestrator.SnapshotStore(history_store=kusto_store.history_store, keeps_text=lambda: True)
    with socket.socket() as taken:
        taken.bind(("127.0.0.1", 0))
        taken.listen(1)
        assert orchestrator._start_receiver(store, ("127.0.0.1", taken.getsockname()[1])) is None
    assert "NOT received" in capsys.readouterr().err


def test_headless_opens_the_receiver_unless_told_not_to(monkeypatch):
    assert serve(monkeypatch, "--port", "8599")["receive_at"] == ("127.0.0.1", 8599)
    assert serve(monkeypatch, "--no-receiver")["receive_at"] is None


# ── A new node does not run the upgrade backfills ────────────────


# ── A level that rests at 0 or 1 is stored when it changes, not on every sample ──


def test_an_unchanged_zero_or_one_is_not_stored_again():
    from aictl.sink import SampleSink

    sink = SampleSink()
    tags = {"process.pid": "42"}
    admitted = [sink.admit_if_changed("process.thread.count", value, tags, ts)
                for ts, value in ((100, 1.0), (101, 1.0), (102, 1.0), (103, 0.0), (104, 0.0), (105, 1.0))]
    assert admitted == [True, False, False, True, False, True]
    assert sink.admit_if_changed("process.thread.count", 1.0, tags, 105 + SampleSink.DEDUP_STALE_SECONDS)
