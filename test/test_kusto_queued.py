"""Queued ingestion acknowledges submissions without read-before-write queries."""

import json
from types import SimpleNamespace

import pytest
from azure.kusto.data.data_format import DataFormat
from azure.kusto.ingest import ReportLevel
from azure.kusto.ingest.base_ingest_client import IngestionResult, IngestionStatus
from test_kusto_connection import FakeClient, FakeStreamingClient, kusto_config

from aictl.kusto import CLUSTER_ENV, INGESTION_ENV, TABLE_INGESTION_ENV, KustoSettings, kusto_settings
from aictl.stores.kusto.client import KustoClientFactory, connection_string
from aictl.stores.kusto.ingest import QueuedIngester, TableIngester, make_ingester
from aictl.stores.kusto.otel import LOGS
from aictl.stores.kusto.writer import KustoWriter

ENGINE = "https://example.swedencentral.dev.kusto.windows.net"
DM = "https://ingest-example.swedencentral.dev.kusto.windows.net"


class QueueClient:
    def __init__(self):
        self.calls = []
        self.error = None

    def ingest_from_stream(self, descriptor, properties):
        self.calls.append((descriptor.source_id, descriptor.stream.read(), properties))
        if self.error:
            raise self.error
        return IngestionResult(IngestionStatus.QUEUED, properties.database, properties.table, descriptor.source_id)


@pytest.mark.parametrize("endpoint", [ENGINE, DM])
def test_query_and_queued_clients_use_separate_endpoints(endpoint, monkeypatch):
    import azure.kusto.ingest

    settings = KustoSettings.from_values(endpoint)
    assert settings.cluster == ENGINE
    assert settings.ingestion_cluster == DM
    assert connection_string(settings).data_source == ENGINE
    seen = []
    queue = QueueClient()

    def make_queue(kcsb, auto_correct_endpoint):
        seen.append((kcsb.data_source, auto_correct_endpoint))
        return queue

    monkeypatch.setattr(azure.kusto.ingest, "QueuedIngestClient", make_queue)
    QueuedIngester(settings, FakeClient()).ingest_lines("events", ['{"kind":"one"}'])
    assert seen == [(DM, False)]
    assert queue.calls[0][2].database == "aictl"


def test_explicit_mode_and_overrides_can_select_all_three_backends():
    settings = KustoSettings(DM, ingestion="queued", table_ingestion={"path_defs": "inline", "events": "streaming"})
    queue, stream, client = QueueClient(), FakeStreamingClient(), FakeClient()
    ingester = make_ingester(settings, client, stream, queued_client=queue)
    for table in ("path_defs", "events", "sessions"):
        ingester.ingest_lines(table, ['{"project":""}'])
    assert len(client.commands) == len(stream.calls) == len(queue.calls) == 1
    assert queue.calls[0][2].table == "sessions"
    assert not client.queries


def test_queued_writer_leaves_batching_to_dm_and_does_not_poll_visibility():
    queue, client = QueueClient(), FakeClient()
    ingester = QueuedIngester(KustoSettings(DM), client, queue)
    writer = KustoWriter(ingester, node_id="test")
    writer.upsert("sessions", [{"project": "", "session_id": "one"}, {"project": "", "session_id": "two"}])
    writer.append(LOGS, [{"project": "", "RowKey": "raw"}])
    writer.flush()
    assert len(queue.calls) == 2 and not client.queries and not client.commands
    _, payload, props = queue.calls[0]
    assert [json.loads(line)["session_id"] for line in payload.splitlines()] == ["one", "two"]
    assert props.format == DataFormat.MULTIJSON
    assert not props.flush_immediately and props.report_level == ReportLevel.FailuresOnly
    assert props.ingest_by_tags is None and props.ingest_if_not_exists is None
    assert not ingester._pending


def test_failed_submission_is_retried_without_changing_backend_or_payload():
    queue, client = QueueClient(), FakeClient()
    queue.error = RuntimeError("enqueue failed")
    ingester = QueuedIngester(KustoSettings(DM, ingestion="queued"), client, queue)
    writer = KustoWriter(ingester, node_id="test")
    writer.upsert("sessions", [{"project": "", "session_id": "s"}])
    writer.flush()
    assert len(queue.calls) == 1
    queue.error = None
    writer.flush()
    assert [call[1] for call in queue.calls] == [queue.calls[0][1]] * 2
    assert not ingester._pending and not client.queries and not client.commands


def test_missing_queued_acknowledgement_is_an_error():
    queue = SimpleNamespace(ingest_from_stream=lambda *args: None)
    ingester = QueuedIngester(KustoSettings(DM), FakeClient(), queue)
    with pytest.raises(RuntimeError, match="queued acknowledgement"):
        ingester.ingest_lines("events", ['{"kind":"k"}'])
    assert not ingester._pending


def test_factory_does_not_reuse_an_explicit_queued_router_for_auto(monkeypatch):
    auto, explicit = KustoSettings(DM), KustoSettings(DM, ingestion="queued")
    monkeypatch.setattr(KustoClientFactory, "_clients", {KustoClientFactory.key(auto): FakeClient()})
    monkeypatch.setattr(KustoClientFactory, "_ingesters", {})
    assert isinstance(KustoClientFactory.ingester(auto), TableIngester)
    assert isinstance(KustoClientFactory.ingester(explicit), QueuedIngester)


def test_queued_config_env_and_cli_options(kusto_config, monkeypatch):
    from click.testing import CliRunner
    from aictl.commands import daemon

    kusto_config.write_text(
        f'[storage]\nkusto_cluster = "{DM}"\nkusto_ingestion = "queued"\n'
        '[storage.kusto_table_ingestion]\npath_defs = "inline"\n',
        encoding="utf-8",
    )
    settings = kusto_settings()
    assert settings.ingestion_mode("events") == "queued"
    assert settings.ingestion_mode("path_defs") == "inline"
    monkeypatch.setenv(INGESTION_ENV, "inline")
    monkeypatch.setenv(TABLE_INGESTION_ENV, "events=queued")
    assert kusto_settings().ingestion_mode("events") == "queued"
    seen = []
    monkeypatch.setattr(daemon, "start_server", lambda *a, **kw: seen.append(kusto_settings()))
    monkeypatch.setattr(daemon.os, "_exit", lambda code: None)
    result = CliRunner().invoke(
        daemon.serve,
        ["--kusto-cluster", DM, "--kusto-ingestion", "queued", "--kusto-table-ingestion", "sessions=inline"],
    )
    assert result.exit_code == 0, result.output
    assert seen[0].cluster == ENGINE and seen[0].ingestion_cluster == DM
    assert seen[0].ingestion_mode("events") == "queued"
    assert seen[0].ingestion_mode("sessions") == seen[0].ingestion_mode("path_defs") == "inline"
    assert daemon.os.environ[CLUSTER_ENV] == DM
