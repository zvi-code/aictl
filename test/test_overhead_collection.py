"""Guards for daemon collection cost: config, pace, caches, lazy serialization."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

from aictl.monitoring.pace import ACTIVITY_WINDOW_S, IDLE_FACTOR, Pace
from aictl.orchestrator import SnapshotPersistence, SnapshotSerializer, SnapshotState, _cached
from aictl.platforms import _DEFAULT_TOML, AictlConfig, cap_log_file, load_config


def _write_config(tmp_path, monkeypatch, text: str) -> None:
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))
    (tmp_path / "aictl").mkdir(exist_ok=True)
    (tmp_path / "aictl" / "config.toml").write_text(text)


OLD_TEMPLATE = """
[monitor]
sample_interval = 1.0
refresh_interval = 1.0
process_interval = 1.0
network_interval = 1.0
telemetry_interval = 5.0
"""


def test_old_template_intervals_count_as_unset(tmp_path, monkeypatch):
    _write_config(tmp_path, monkeypatch, OLD_TEMPLATE)
    cfg = load_config()
    assert cfg.process_interval == AictlConfig().process_interval == 5.0
    assert cfg.telemetry_interval == 30.0


def test_deliberate_interval_is_kept(tmp_path, monkeypatch):
    _write_config(tmp_path, monkeypatch, OLD_TEMPLATE.replace("process_interval = 1.0", "process_interval = 2.0"))
    cfg = load_config()
    assert cfg.process_interval == 2.0
    assert cfg.sample_interval == 1.0


def test_default_template_does_not_pin_intervals():
    """`aictl config init` must not freeze today's defaults into config.toml."""
    active = [line for line in _DEFAULT_TOML.splitlines() if not line.startswith("#")]
    pinned = {"sample_interval", "refresh_interval", "process_interval", "network_interval", "telemetry_interval"}
    assert not [line for line in active if line.split("=")[0].strip() in pinned]


def test_capture_env_overrides_file_and_bad_value_falls_back(tmp_path, monkeypatch):
    _write_config(tmp_path, monkeypatch, '[storage]\ncapture = "metadata"\n')
    assert load_config().capture == "metadata"
    monkeypatch.setenv("AICTL_CAPTURE", "off")
    assert load_config().capture == "off"
    monkeypatch.setenv("AICTL_CAPTURE", "bogus")
    assert load_config().capture == "full"


def test_persistent_monitor_reads_intervals_from_config():
    """The monitor had 1.0 s hardcoded, so no config value had any effect."""
    source = Path(sys.modules["aictl.orchestrator"].__file__).read_text()
    assert "process_interval=cfg.process_interval" in source
    assert "process_interval=1.0" not in source


def test_pace_full_speed_only_when_watched_or_active():
    pace = Pace()
    assert pace.factor(now=1000.0) == IDLE_FACTOR
    pace.client_connected()
    assert pace.factor(now=1000.0) == 1
    pace.client_disconnected()
    pace.client_disconnected()  # never below zero
    pace.note_activity(now=1000.0)
    assert pace.factor(now=1000.0 + ACTIVITY_WINDOW_S - 1) == 1
    assert pace.factor(now=1000.0 + ACTIVITY_WINDOW_S + 1) == IDLE_FACTOR


def test_enrichment_cache_reuses_within_ttl():
    calls = []
    cache: dict = {}
    assert _cached(cache, "k", 100.0, lambda: calls.append(1) or "v") == "v"
    assert _cached(cache, "k", 100.0, lambda: calls.append(1) or "v2") == "v"
    assert calls == [1]
    # No cache: direct callers always get fresh data.
    assert _cached(None, "k", 100.0, lambda: "fresh") == "fresh"


def test_agent_file_cache_validates_by_stat_and_returns_copies(tmp_path, monkeypatch):
    from aictl.monitoring import tool_telemetry as tt

    calls = []
    monkeypatch.setattr(tt, "_parse_agent_file", lambda p: calls.append(p) or {"input_tokens": 1})
    tt._agent_file_cache.clear()
    f = tmp_path / "agent-1.jsonl"
    f.write_text("{}\n")
    first = tt._parse_agent_file_cached(f)
    first["conversation"] = "mutated by caller"
    second = tt._parse_agent_file_cached(f)
    assert calls == [f]
    assert "conversation" not in second
    f.write_text("{}\n{}\n")
    tt._parse_agent_file_cached(f)
    assert len(calls) == 2


def test_snapshot_serialized_only_when_read():
    """With no client the 2.7 MB snapshot must not be built every refresh."""
    built = []

    class Counting(SnapshotSerializer):
        @staticmethod
        def serialize_snapshot(snap):
            built.append(snap)
            return b"{}"

    state = SnapshotState()
    snap = SimpleNamespace(
        timestamp=1.0,
        total_files=0,
        total_tokens=0,
        total_cpu=0,
        total_mem_mb=0,
        total_mcp_servers=0,
        total_memory_tokens=0,
        total_memory_entries=0,
        total_live_sessions=0,
        total_live_estimated_tokens=0,
        total_live_inbound_rate_bps=0,
        total_live_outbound_rate_bps=0,
        tools=[],
    )
    state.update(snap, Counting())
    assert built == []
    assert state.snapshot_json_bytes == b"{}"
    assert state.snapshot_json_bytes == b"{}"
    assert len(built) == 1


def test_identical_telemetry_is_not_stored_again():
    p = SnapshotPersistence(None)
    report = {"tool": "t", "source": "s", "input_tokens": 5}
    assert p._changed_telemetry([report], ts=100.0) == [report]
    assert p._changed_telemetry([report], ts=105.0) == []
    assert p._changed_telemetry([{**report, "input_tokens": 6}], ts=110.0) != []
    # Heartbeat keeps the series continuous.
    assert p._changed_telemetry([{**report, "input_tokens": 6}], ts=500.0) != []


def test_own_log_writes_are_not_file_activity():
    """Log line -> file event -> log line is a feedback loop."""
    from aictl.monitoring.collectors.process import _WatchHandler
    from aictl.monitoring.config import MonitorConfig

    put = []
    loop = SimpleNamespace(call_soon_threadsafe=lambda fn, item: put.append(item))
    cfg = MonitorConfig.for_root(Path.cwd(), ignored_paths=("/own/logs",))
    handler = _WatchHandler(loop=loop, queue=SimpleNamespace(put_nowait=None), config=cfg)
    handler._emit("modified", SimpleNamespace(is_directory=False, src_path="/own/logs/samples.log"))
    assert put == []
    handler._emit("modified", SimpleNamespace(is_directory=False, src_path="/elsewhere/a.txt"))
    assert len(put) == 1


def test_gauge_values_zero_and_one_are_deduplicated():
    from aictl.sink import SampleSink

    sink = SampleSink(db=None, buffer_size=0)
    for ts in (100.0, 105.0, 110.0):
        sink.emit_if_changed("m", 1.0, {"t": "a"}, ts=ts, gauge=True)
    assert sink.stats()["total_emitted"] == 1


def test_cap_log_file_keeps_tail_and_stays_appendable(tmp_path):
    log = tmp_path / "aictl.log"
    with open(log, "a") as writer:
        writer.write("x" * 1000 + "END")
        writer.flush()
        cap_log_file(log, 100)
        assert log.stat().st_size == 0
        assert (tmp_path / "aictl.log.1").read_text().endswith("END")
        writer.write("new")
        writer.flush()
    assert log.read_text() == "new"
    # Under the cap: untouched.
    cap_log_file(log, 100)
    assert log.read_text() == "new"


def test_version_command_does_not_import_the_daemon():
    """`aictl --version` and hook calls must not pay for the monitoring stack."""
    code = (
        "import sys; sys.argv=['aictl','--version']\n"
        "from aictl.cli import main\n"
        "try:\n    main()\nexcept SystemExit:\n    pass\n"
        "bad=[m for m in ('aictl.orchestrator','aictl.monitoring.runtime','asyncio','aictl.commands.daemon')"
        " if m in sys.modules]\n"
        "print('LOADED', bad)\n"
    )
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env=dict(os.environ))
    assert "LOADED []" in out.stdout, out.stdout + out.stderr


def test_all_commands_still_resolve():
    from click.testing import CliRunner

    from aictl.cli import main

    result = CliRunner().invoke(main, ["--help"])
    assert result.exit_code == 0, result.output
    for name in ("daemon", "db", "ctx", "status", "hooks", "otel", "config", "session", "memory"):
        assert name in result.output
    assert CliRunner().invoke(main, ["daemon", "serve", "--help"]).exit_code == 0
    assert "--capture" in CliRunner().invoke(main, ["daemon", "serve", "--help"]).output


def test_sse_omits_only_unchanged_large_keys_per_client():
    import json

    from aictl.dashboard.web_server import _omit_unchanged_sse_keys

    msg = json.dumps({"timestamp": 1, "total_cpu": 2, "tools": [], "agent_teams": [1], "events": [2]})
    sent: dict = {}
    assert json.loads(_omit_unchanged_sse_keys(msg, sent)) == json.loads(msg)
    second = json.loads(_omit_unchanged_sse_keys(msg, sent))
    assert second == {"timestamp": 1, "total_cpu": 2, "tools": []}
    changed = json.dumps({"timestamp": 2, "total_cpu": 2, "tools": [], "agent_teams": [9], "events": [2]})
    assert json.loads(_omit_unchanged_sse_keys(changed, sent))["agent_teams"] == [9]
    # A new client gets everything.
    assert "events" in json.loads(_omit_unchanged_sse_keys(msg, {}))


def test_sessions_api_exposes_content_retained():
    from aictl.dashboard import api_handlers

    source = Path(api_handlers.__file__).read_text()
    assert 's["content_retained"]' in source


def test_daemon_status_does_not_signal_the_process(tmp_path, monkeypatch):
    """os.kill(pid, 0) terminates the target on Windows."""
    from aictl.commands import daemon

    def fail(*_a):
        raise AssertionError("os.kill must not be used to check liveness")

    monkeypatch.setattr("aictl.platforms.IS_WINDOWS", True)
    monkeypatch.setattr(daemon.os, "kill", fail)
    monkeypatch.setattr("psutil.pid_exists", lambda _pid: True)
    pid_file = tmp_path / "aictl.pid"
    pid_file.write_text(str(os.getpid()))
    daemon._show_daemon_status(pid_file, "127.0.0.1", 1)


def test_collectors_never_poll_through_windows_subprocess_tools():
    from aictl.monitoring import collectors

    root = Path(collectors.__file__).parent
    for path in root.glob("*.py"):
        source = path.read_text()
        for tool in ("tasklist", "netstat", "wmic", "powershell"):
            assert tool not in source, f"{path.name} uses {tool}"


def test_windows_collector_spawns_nothing(monkeypatch):
    from aictl.monitoring.collectors import network

    def fail(*_a, **_k):
        raise AssertionError("no subprocess on this path")

    monkeypatch.setattr(subprocess, "Popen", fail)
    monkeypatch.setattr(subprocess, "run", fail)
    collector = network.WindowsNetworkCollector(5.0)
    psutil = __import__("psutil")
    collector._sample(psutil)


def test_ignored_paths_compare_case_insensitively_on_windows(monkeypatch):
    from aictl.monitoring.collectors import process

    monkeypatch.setattr(process.os.path, "normcase", str.lower)
    assert process._is_under("/Own/LOGS/samples.log", ("/own/logs",))
    assert not process._is_under("/own/logs2/x", ("/own/logs",))


def test_denied_process_details_are_read_once_on_windows(monkeypatch):
    from aictl.monitoring.collectors import process
    from aictl.monitoring.config import MonitorConfig

    monkeypatch.setattr(process, "IS_WINDOWS", True)
    reads = []

    class Proc:
        info = {"pid": 4, "ppid": None, "name": "System"}

        def as_dict(self, _attrs):
            reads.append(1)
            return {"cmdline": None, "exe": None}

    class FakePsutil:
        Error = OSError

        @staticmethod
        def process_iter(_fields):
            return [Proc()]

    collector = process.PsutilProcessCollector(MonitorConfig(root=Path("/tmp"), workspace_paths=(), state_paths=()))
    collector._snapshot(FakePsutil)
    collector._snapshot(FakePsutil)
    assert reads == [1]


def test_held_log_file_is_not_fatal(tmp_path, monkeypatch):
    log = tmp_path / "aictl.log"
    log.write_text("x" * 500)

    def denied(*_a):
        raise PermissionError("in use by another process")

    monkeypatch.setattr(os, "truncate", denied)
    cap_log_file(log, 100)
    assert log.stat().st_size == 500


def test_copilot_events_read_only_when_changed(tmp_path, monkeypatch):
    from aictl.monitoring import tool_telemetry as tt

    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    monkeypatch.setattr(tt, "_copilot_report_cache", None)
    events = tmp_path / ".copilot" / "session-state" / "s1" / "events.jsonl"
    events.parent.mkdir(parents=True)
    events.write_text('{"type":"assistant.message","data":{"outputTokens":5}}\n')
    calls = []
    real = tt._parse_copilot_events
    monkeypatch.setattr(tt, "_parse_copilot_events", lambda f, r: (calls.append(f), real(f, r)))
    first = tt.parse_copilot_telemetry()
    assert tt.parse_copilot_telemetry() is first
    assert len(calls) == 1
    assert first.output_tokens == 5
    events.write_text(events.read_text() + '{"type":"assistant.message","data":{"outputTokens":7}}\n')
    assert tt.parse_copilot_telemetry().output_tokens == 12
    assert len(calls) == 2


def _copilot_source(path: Path, rows: int) -> None:
    import sqlite3

    src = sqlite3.connect(path)
    src.execute("CREATE TABLE messages(session_id TEXT, role TEXT, content TEXT, ts REAL)")
    src.executemany("INSERT INTO messages VALUES(?,?,?,?)", [("s", "user", "SECRET", 1.0)] * rows)
    src.commit()
    src.close()


def test_copilot_store_ingest_is_batched_and_resumes_after_restart(tmp_path):
    from aictl.ingesters.copilot_session_store import POLL_BATCH_ROWS, CopilotSessionStoreIngester
    from aictl.storage import HistoryDB

    source = tmp_path / "session-store.db"
    _copilot_source(source, POLL_BATCH_ROWS + 5)
    db = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0)
    first = CopilotSessionStoreIngester(source, db)
    assert first.poll() == POLL_BATCH_ROWS
    restarted = CopilotSessionStoreIngester(source, db)
    assert restarted.poll() == 5
    assert restarted.poll() == 0
    db.close()


def test_copilot_store_ingest_copies_no_text_in_metadata_mode(tmp_path):
    from aictl.ingesters.copilot_session_store import CopilotSessionStoreIngester
    from aictl.storage import HistoryDB

    source = tmp_path / "session-store.db"
    _copilot_source(source, 3)
    db = HistoryDB(db_path=tmp_path / "h.db", flush_interval=0, capture="metadata")
    assert CopilotSessionStoreIngester(source, db).poll() == 3
    rows = db._conn().execute("SELECT content FROM copilot_session_messages").fetchall()
    assert rows == [("",)] * 3
    db.close()
