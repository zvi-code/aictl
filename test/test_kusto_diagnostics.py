"""Failed SDK attempts must retain the full request and raw server response."""

import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from types import SimpleNamespace

import pytest
from azure.kusto.data import ClientRequestProperties, KustoClient, KustoConnectionStringBuilder
from azure.kusto.data.exceptions import KustoMultiApiError, KustoServiceError
from azure.kusto.ingest import QueuedIngestClient
from requests import Response

from aictl.health import ObservedKustoClient
from aictl.kusto import KustoSettings
from aictl.kusto.connection import retrying
from aictl.kusto.ingest import InlineIngester, QueuedIngester, StreamingIngester

CLUSTER = "http://localhost:8099"


def http_response(body, status=400):
    response = Response()
    response.status_code = status
    response._content = body.encode("utf-8")
    response.encoding = "utf-8"
    return response


def failures(caplog):
    return [record.getMessage() for record in caplog.records if record.name == "aictl.kusto.diagnostics"]


@pytest.mark.parametrize("method", ["execute", "execute_query", "execute_mgmt"])
def test_query_failures_log_full_kql_and_exact_body(method, caplog):
    kql = "events\n| where text == " + json.dumps("x" * 2500)
    body = ' {\r\n  "error": ' + json.dumps("detailed failure " * 300) + "\r\n}\n"
    error = KustoServiceError("shortened SDK error", http_response(body))
    properties = ClientRequestProperties()

    def fail(*_args):
        raise error

    client = ObservedKustoClient(SimpleNamespace(**{method: fail}), cluster=CLUSTER)
    with pytest.raises(KustoServiceError) as raised:
        getattr(client, method)("history", kql, properties)
    assert raised.value is error
    (message,) = failures(caplog)
    assert f"Cluster: {CLUSTER}\nDatabase: history\nClient request ID: {properties.client_request_id}\n" in message
    assert properties.client_request_id.startswith("KPC.aictl;")
    assert f"KQL:\n{kql}\nHTTP status: 400\nResponse body:\n{body}" in message
    assert "Elapsed: " in message
    counter = client.commands if method == "execute_mgmt" else client.reads
    assert counter.snapshot()["failed"] == 1


def test_inline_retries_log_each_failed_attempt_before_recovery(monkeypatch, caplog):
    monkeypatch.setattr("aictl.kusto.connection.time.sleep", lambda _: None)
    bodies = ["first refusal\nwith detail", "second refusal\nwith different detail"]
    attempts = []

    def execute(*args):
        attempts.append(args)
        if len(attempts) <= len(bodies):
            raise KustoServiceError("throttled", http_response(bodies[len(attempts) - 1], 429))

    client = ObservedKustoClient(SimpleNamespace(execute_mgmt=execute), cluster=CLUSTER)
    ingester = InlineIngester(client, "history")
    ingester.ingest_lines("events", ['{"text":"one"}'])
    assert len(attempts) == 3
    messages = failures(caplog)
    assert len(messages) == 2
    for message, body in zip(messages, bodies, strict=True):
        assert attempts[0][1] in message
        assert message.endswith(body)


@pytest.mark.parametrize("mode", ["streaming", "queued"])
def test_non_kql_ingestion_logs_target_and_nested_http_response(mode, caplog):
    settings = KustoSettings("https://example.kusto.windows.net", database="history", ingestion=mode)
    body = '  {"error": "original storage response"}\r\n'
    original = KustoServiceError("SDK summary", http_response(body, 403))

    def fail(*_args):
        try:
            raise original
        except KustoServiceError as exc:
            raise RuntimeError("ingestion failed") from exc

    ingester = (
        StreamingIngester(settings, SimpleNamespace(execute_streaming_ingest=fail))
        if mode == "streaming"
        else QueuedIngester(settings, None, SimpleNamespace(ingest_from_stream=fail))
    )
    with pytest.raises(RuntimeError, match="ingestion failed"):
        ingester.ingest_lines("events", ['{"text":"one"}'])
    (message,) = failures(caplog)
    assert f"Cluster: {settings.cluster if mode == 'streaming' else settings.ingestion_cluster}" in message
    assert "Database: history" in message and "ingestion into table events" in message
    assert "Request (no KQL):" in message and "HTTP status: 403" in message
    assert message.endswith(body)


def test_missing_response_is_explicit_and_never_uses_an_earlier_response(caplog):
    def fail(*_args):
        raise TimeoutError("socket timed out")

    client = ObservedKustoClient(SimpleNamespace(execute=fail), cluster=CLUSTER)
    client._responses.value = http_response("old unrelated error")
    with pytest.raises(TimeoutError):
        client.execute("history", "events | count")
    (message,) = failures(caplog)
    assert "No HTTP response was received or exposed by the SDK." in message
    assert "old unrelated error" not in message
    assert "socket timed out" in caplog.text


def test_queued_sdk_resource_query_failure_logs_the_actual_kql(monkeypatch, caplog):
    settings = KustoSettings(CLUSTER, database="history")
    sdk = QueuedIngestClient(
        KustoConnectionStringBuilder.with_no_authentication(settings.ingestion_cluster),
        auto_correct_endpoint=False,
    )
    requests = []
    body = '{"error":{"code":"Forbidden","message":"resource discovery denied"}}\n'

    def send(request, **_kwargs):
        requests.append(json.loads(request.body))
        return http_response(body, 403)

    client = sdk._resource_manager._kusto_client
    monkeypatch.setattr(client._session.get_adapter(settings.ingestion_cluster), "send", send)
    ingester = QueuedIngester(settings, None, sdk)
    try:
        with pytest.raises(KustoServiceError):
            ingester.ingest_lines("events", ['{"text":"one"}'])
    finally:
        sdk.close()
    assert requests
    for request in requests:
        assert any(f"KQL:\n{request['csl']}\n" in message and message.endswith(body) for message in failures(caplog))


def test_unreadable_response_does_not_replace_the_request_failure(caplog):
    def text():
        raise ValueError("body decoding failed")

    error = KustoServiceError("request failed", SimpleNamespace(status_code=400, text=text))

    def fail(*_args):
        raise error

    client = ObservedKustoClient(SimpleNamespace(execute=fail), cluster=CLUSTER)
    with pytest.raises(KustoServiceError) as raised:
        client.execute("history", "events | count")
    assert raised.value is error
    assert "Response body unavailable: ValueError: body decoding failed" in caplog.text
    assert "KQL:\nevents | count" in caplog.text


def test_partial_query_failure_logs_the_original_http_200_body(monkeypatch, caplog):
    payload = [
        {
            "FrameType": "DataTable",
            "TableId": 0,
            "TableKind": "PrimaryResult",
            "TableName": "PrimaryResult",
            "Columns": [{"ColumnName": "n", "ColumnType": "long"}],
            "Rows": [
                [1],
                {
                    "OneApiErrors": [
                        {
                            "error": {
                                "code": "E_QUERY_RESULT_SET_TOO_LARGE",
                                "message": "partial result",
                                "@message": "Result set is too large",
                                "@permanent": True,
                            },
                        }
                    ]
                },
            ],
        }
    ]
    body = json.dumps(payload, indent=3) + "\n"
    with KustoClient(KustoConnectionStringBuilder.with_no_authentication(CLUSTER)) as sdk:
        monkeypatch.setattr(
            sdk._session.get_adapter(CLUSTER), "send", lambda *_args, **_kwargs: http_response(body, 200)
        )
        client = ObservedKustoClient(sdk, cluster=CLUSTER)
        with pytest.raises(KustoMultiApiError):
            client.execute("history", "events | count")
        assert client._responses.value is None
    (message,) = failures(caplog)
    assert "HTTP status: 200" in message and message.endswith(body)


def test_concurrent_failures_keep_their_own_request_response_pair(caplog):
    barrier = Barrier(2)
    client = None

    def fail(_database, query):
        client._capture_response(http_response("body for " + query))
        barrier.wait(timeout=5)
        raise ValueError("SDK parse failure")

    client = ObservedKustoClient(SimpleNamespace(execute=fail), cluster=CLUSTER)

    def request(query):
        with pytest.raises(ValueError):
            client.execute("history", query)

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(request, ["first query", "second query"]))
    messages = failures(caplog)
    assert len(messages) == 2
    for query in ("first query", "second query"):
        (message,) = [message for message in messages if f"KQL:\n{query}\n" in message]
        assert message.endswith("body for " + query)


def test_last_retry_failure_is_logged_too(monkeypatch, caplog):
    monkeypatch.setattr("aictl.kusto.connection.RETRY_DELAYS_S", (0,))
    attempts = []

    def fail(*_args):
        attempts.append(True)
        raise KustoServiceError("throttled", http_response("full response", 429))

    client = ObservedKustoClient(SimpleNamespace(execute=fail), cluster=CLUSTER)
    with pytest.raises(KustoServiceError):
        retrying(lambda: client.execute("history", "events | count"), "query")
    assert len(attempts) == len(failures(caplog)) == 2


def test_retry_attempts_use_distinct_correlatable_request_ids():
    seen = []
    properties = ClientRequestProperties()

    def fail(_database, _query, request_properties):
        seen.append(request_properties.client_request_id)
        raise KustoServiceError("failed", http_response("full response", 429))

    client = ObservedKustoClient(SimpleNamespace(execute=fail), cluster=CLUSTER)
    for _ in range(2):
        with pytest.raises(KustoServiceError):
            client.execute("history", "events | count", properties)
    assert len(set(seen)) == 2
    assert all(request_id.startswith("KPC.aictl;") for request_id in seen)
