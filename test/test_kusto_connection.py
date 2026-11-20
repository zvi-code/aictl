"""Kusto SDK clients, retry limits, and ingestion transport selection."""

import gzip
import json
from types import SimpleNamespace

import pytest

from aictl.kusto import (
    AUTH_ENV,
    CLUSTER_ENV,
    DATABASE_ENV,
    INGESTION_ENV,
    TABLE_INGESTION_ENV,
    KustoSettings,
    kusto_settings,
    parse_table_ingestion,
)
from aictl.stores.base import StoreConfigurationError
from aictl.stores.kusto import client as C, open_store
from aictl.stores.kusto.ingest import InlineIngester, StreamingIngester, ingestion_capacity, make_ingester


def response(columns=(), rows=()):
    return SimpleNamespace(primary_results=[_Table(columns, rows)])


class _Table:
    def __init__(self, columns, rows):
        self.columns = [SimpleNamespace(column_name=name, column_type=kind) for name, kind in columns]
        self.rows = rows

    def __iter__(self):
        return iter(self.rows)


class FakeClient:
    def __init__(self, on_query=None, on_mgmt=None):
        self.queries = []
        self.properties = []
        self.commands = []
        self.on_query = on_query or (lambda _: response())
        self.on_mgmt = on_mgmt or (lambda _: response())

    def execute(self, database, query, properties=None):
        self.queries.append(query)
        self.properties.append(properties)
        return self.on_query(query)

    execute_query = execute

    def execute_mgmt(self, database, command, properties=None):
        self.commands.append(command)
        return self.on_mgmt(command)


class FakeStreamingClient:
    def __init__(self):
        self.calls = []

    def execute_streaming_ingest(self, database, table, stream, blob_url, stream_format, properties):
        self.calls.append((table, gzip.decompress(stream.read())))


class ApiError(Exception):
    def __init__(self, status, permanent, reason="refused"):
        super().__init__(reason)
        self.http_response = SimpleNamespace(status_code=status)
        self.error = SimpleNamespace(permanent=permanent)

    def get_api_error(self):
        return self.error


@pytest.fixture
def kusto_config(tmp_path, monkeypatch):
    from aictl import platforms

    path = tmp_path / "config.toml"
    monkeypatch.setattr(platforms, "config_dir", lambda: tmp_path)
    monkeypatch.setenv("AICTL_CONFIG_DIR", str(tmp_path))
    for key in (CLUSTER_ENV, DATABASE_ENV, AUTH_ENV, INGESTION_ENV, TABLE_INGESTION_ENV):
        monkeypatch.delenv(key, raising=False)
    return path


def test_versions_are_ordered():
    versions = [C.next_version() for _ in range(100)]
    assert all(a < b for a, b in zip(versions, versions[1:]))


@pytest.mark.parametrize("attempt_seconds, expected", [(61, 1), (20, 3)])
def test_retry_budget_bounds_slow_failures(monkeypatch, attempt_seconds, expected):
    clock = [0.0]
    calls = []
    monkeypatch.setattr(C.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(C.time, "sleep", lambda delay: clock.__setitem__(0, clock[0] + delay))

    def unavailable():
        calls.append(clock[0])
        clock[0] += attempt_seconds
        raise ApiError(503, False, "timed out")

    with pytest.raises(ApiError, match="timed out"):
        C.retrying(unavailable, "ingestion")
    assert len(calls) == expected


@pytest.mark.parametrize(("status", "permanent", "retry"), [
    (520, False, True), (500, None, True), (520, True, False), (400, None, False), (429, True, True),
])
def test_retry_distinguishes_transient_and_permanent_errors(monkeypatch, status, permanent, retry):
    monkeypatch.setattr(C, "RETRY_DELAYS_S", (0.0,))
    attempts = iter([ApiError(status, permanent), "ready"])

    def send():
        result = next(attempts)
        if isinstance(result, Exception):
            raise result
        return result

    if retry:
        assert C.retrying(send, "ingestion") == "ready"
    else:
        with pytest.raises(ApiError):
            C.retrying(send, "ingestion")


def test_streaming_retries_the_same_payload_when_schema_is_not_visible(monkeypatch):
    monkeypatch.setattr(C, "RETRY_DELAYS_S", (0.0, 0.0))
    payloads = []
    original = FakeStreamingClient()

    def send(database, table, stream, blob_url, fmt, props):
        payload = stream.read()
        payloads.append(payload)
        if len(payloads) < 3:
            raise ApiError(400, True, "BadRequest_EntityNotFound: Entity ID 'events' of kind 'Table' was not found.")

    monkeypatch.setattr(original, "execute_streaming_ingest", send)
    StreamingIngester(KustoSettings("https://c.kusto.windows.net"), ingest_client=original).ingest(
        "events", [{"value": "a\nb"}]
    )
    assert len(payloads) == 3 and len(set(payloads)) == 1
    assert json.loads(gzip.decompress(payloads[0])) == {"value": "a\nb"}


def test_ingestion_modes_do_not_change_payloads():
    settings = KustoSettings("https://c.kusto.windows.net", ingestion="streaming",
                             table_ingestion={"path_defs": "inline"})
    client, streaming = FakeClient(), FakeStreamingClient()
    ingester = make_ingester(settings, client, streaming)
    rows = [{"text": 'a\n"b"', "n": 3}]
    ingester.ingest("path_defs", rows)
    ingester.ingest("events", rows)
    command, = client.commands
    assert command.startswith(".ingest inline into table ['path_defs']")
    assert json.loads(command.partition("<|\n")[2]) == rows[0]
    assert streaming.calls[0][0] == "events"
    assert json.loads(streaming.calls[0][1]) == rows[0]
    assert not client.queries


def test_unknown_override_is_rejected_before_creating_clients(monkeypatch):
    monkeypatch.setattr(C.KustoClientFactory, "client", lambda *a: pytest.fail("must validate first"))
    settings = KustoSettings("https://example.kusto.windows.net", table_ingestion={"path_def": "inline"})
    with pytest.raises(StoreConfigurationError, match="Unknown.*path_def"):
        open_store(settings=settings)


def test_ingester_cache_distinguishes_defaults_and_table_overrides(monkeypatch):
    streaming = KustoSettings("https://c.kusto.windows.net", ingestion="streaming")
    inline = KustoSettings(streaming.cluster, streaming=False)
    mixed = KustoSettings(streaming.cluster, streaming=False, table_ingestion={"events": "streaming"})
    client = FakeClient()
    factory = C.KustoClientFactory
    monkeypatch.setattr(factory, "_clients", {factory.key(streaming): client})
    monkeypatch.setattr(factory, "_ingesters", {})
    assert isinstance(factory.ingester(streaming), StreamingIngester)
    assert isinstance(factory.ingester(inline), InlineIngester)
    assert factory.ingester(mixed) is not factory.ingester(inline)
    assert factory.ingester(mixed) is factory.ingester(mixed)
    assert factory.client(mixed) is client


def test_ingestion_capacity_is_optional():
    client = FakeClient(on_mgmt=lambda _: response(rows=[{"Resource": "Ingestions", "Total": 9}]))
    assert ingestion_capacity(client, "test") == 9
    assert ingestion_capacity(FakeClient(), "test") is None


@pytest.mark.parametrize("value", ["inline", "path_defs=", "=inline", "path_defs=inline,"])
def test_malformed_table_ingestion_override_is_rejected(value):
    with pytest.raises(ValueError):
        parse_table_ingestion(value)


def test_kusto_ingestion_config_and_environment_precedence(kusto_config, monkeypatch):
    kusto_config.write_text(
        '[storage]\nkusto_cluster = "https://example.kusto.windows.net"\nkusto_ingestion = "queued"\n'
        '[storage.kusto_table_ingestion]\nsessions = "streaming"\n',
        encoding="utf-8",
    )
    assert kusto_settings().ingestion_mode("events") == "queued"
    assert kusto_settings().ingestion_mode("sessions") == "streaming"
    monkeypatch.setenv(INGESTION_ENV, "streaming")
    monkeypatch.setenv(TABLE_INGESTION_ENV, "sessions=queued")
    assert kusto_settings().ingestion_mode("events") == "streaming"
    assert kusto_settings().ingestion_mode("sessions") == "queued"
