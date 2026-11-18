from datetime import datetime, timezone
from types import SimpleNamespace

from test_kusto_connection import FakeClient, response

from aictl.kusto import KustoSettings, health_metrics
from aictl.kusto.connection import KustoClientFactory


def test_cluster_diagnostics_are_cached_and_stale_failures_keep_the_observation(monkeypatch):
    settings = KustoSettings("https://example.kusto.windows.net")
    db = SimpleNamespace(_kusto=settings)
    monkeypatch.delenv(health_metrics.RESOURCE_ID_ENV, raising=False)
    monkeypatch.setattr(health_metrics, "_read", lambda *_: (_ for _ in ()).throw(AssertionError("unexpected ARM request")))
    client = FakeClient(on_mgmt=lambda _: response([("nodes", "long"), ("ingestions", "long")], [[2, 0]]))
    monkeypatch.setattr(KustoClientFactory, "health_objects", lambda *_: (client, None))
    sample = health_metrics.read_cluster_metrics(db)
    assert sample["status"] == "cached" and sample["native"] == {"nodes": 2, "ingestions": 0}
    assert health_metrics.read_cluster_metrics(db, sample) == sample and len(client.commands) == 1
    client.on_mgmt = lambda _: (_ for _ in ()).throw(RuntimeError("permission denied"))
    stale = health_metrics.read_cluster_metrics(db, {**sample, "attempted_at": 0})
    assert stale["status"] == "stale" and stale["checked_at"] == sample["checked_at"] and stale["native"] == sample["native"]


def test_monitor_averages_use_real_completed_minutes_without_inventing_zero():
    end = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)
    series = [{"metadatavalues": [], "data": [
        {"timeStamp": "2026-11-18T11:58:00Z", "average": 0},
        {"timeStamp": "2026-11-18T11:59:00Z"},
        {"timeStamp": "2026-11-18T12:00:00Z", "average": 99},
    ]}]
    data = {"value": [{"name": {"value": "CPU"}, "unit": "Percent", "timeseries": series},
                      {"name": {"value": "CacheUtilizationFactor"}, "unit": "Percent", "timeseries": []}]}
    assert health_metrics._samples(data, end) == {"cpu_percent": {"value": 0, "at": end.timestamp() - 120}}
