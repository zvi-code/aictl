"""Kusto-only live lifecycle wiring without opening a store, server, or real tool."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from aictl import orchestrator
from aictl.dashboard.web_server import _DashboardHTTPServer


@pytest.mark.parametrize("use_kusto", [False, True])
def test_collection_lifecycle_attaches_live_sources_only_to_kusto(monkeypatch, use_kusto):
    from aictl import kusto, platforms, project_stores, sink, tree_walk
    from aictl.monitoring import live_sources
    from aictl.observe import collect

    calls = []
    settings = SimpleNamespace(uri="https://example.invalid/history", auth_mode="none") if use_kusto else None
    cfg = SimpleNamespace(
        logging_enabled=False,
        capture="full",
        retention_days=30,
        max_total_mb=100,
        content_retention_days=7,
        effective_log_file=lambda: Path("unit.log"),
    )
    db = SimpleNamespace(_kusto=settings, capture="full", close=lambda: calls.append("db-close"))
    monkeypatch.setattr(platforms, "load_config", lambda: cfg)
    monkeypatch.setattr(kusto, "kusto_settings", lambda: settings)
    monkeypatch.setattr(project_stores, "ProjectStores", lambda **_: db)
    monkeypatch.setattr(tree_walk, "set_lazy", lambda _: None)
    monkeypatch.setattr(sink, "SampleSink", lambda **_: SimpleNamespace(close=lambda: calls.append("sink-close")))
    monkeypatch.setattr(
        orchestrator,
        "SnapshotStore",
        lambda **_: SimpleNamespace(live_hub=None, live_sources=None),
    )
    monkeypatch.setattr(collect, "capture_mode", lambda: "metadata")

    class Sources:
        def __init__(self, hub, root, *, capture_mode):
            self.hub = hub
            calls.append(("sources", root, capture_mode()))

        def start(self):
            calls.append("sources-start")

        def stop(self):
            calls.append("sources-stop")

    monkeypatch.setattr(live_sources, "LiveRuntimeSources", Sources)
    service = orchestrator.CollectionService(Path.cwd())
    service.open_stores(quiet=True)
    try:
        if use_kusto:
            assert service.store.live_hub is not None
            assert calls[:2] == [("sources", Path.cwd(), "metadata"), "sources-start"]
        else:
            assert service.store.live_hub is None and service.store.live_sources is None
            assert calls == []
    finally:
        service.stop()
    assert calls[-2:] == ["sink-close", "db-close"]
    assert ("sources-stop" in calls) is use_kusto


def test_kusto_snapshot_and_live_watcher_share_config_results_without_changing_legacy(monkeypatch):
    from aictl.monitoring import tool_config

    calls = []
    monkeypatch.setattr(orchestrator, "_FULL_TOOL_CONFIGS", [])
    monkeypatch.setattr(
        tool_config,
        "current_tool_configs",
        lambda root: calls.append("shared") or [{"tool": "copilot-cli", "model": "configured"}],
    )
    monkeypatch.setattr(
        orchestrator,
        "collect_tool_configs",
        lambda root: calls.append("legacy") or [SimpleNamespace(to_dict=lambda: {"tool": "legacy"})],
    )
    assert orchestrator._tool_configs(None, Path.cwd(), shared=True)[0]["model"] == "configured"
    assert orchestrator._tool_configs(None, Path.cwd())[0]["tool"] == "legacy"
    assert calls == ["shared", "legacy"]


def test_deferred_ingester_is_attached_to_the_existing_runtime_producer():
    attached = []
    transcript = object()
    server = object.__new__(_DashboardHTTPServer)
    server.store = SimpleNamespace(live_sources=SimpleNamespace(attach_ingester=attached.append))
    server.ingesters = {"transcript-usage": SimpleNamespace(ingester=transcript)}
    server.attach_live_ingesters()
    assert attached == [transcript]
