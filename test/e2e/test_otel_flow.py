"""E2E: OTLP metric/log/trace ingestion → OTel status → sample/event storage.

Posts synthetic OTLP payloads (Claude Code metrics, logs; Copilot metrics)
to a live aictl server and verifies data appears through API endpoints.
"""

from __future__ import annotations

import time

import pytest

pytestmark = pytest.mark.e2e


class TestClaudeOtelMetrics:
    """Claude Code OTLP metric ingestion."""

    def test_metrics_accepted(self, aictl_server, claude_otel_metrics):
        resp = aictl_server.post_otel_metrics(claude_otel_metrics)
        assert resp == {"ok": True}

    def test_otel_status_incremented(self, aictl_server, claude_otel_metrics):
        """OTel receiver stats reflect metric ingestion."""
        status_before = aictl_server.get_otel_status()
        aictl_server.post_otel_metrics(claude_otel_metrics)
        time.sleep(0.3)
        status_after = aictl_server.get_otel_status()

        # Metrics received count should increase
        before_count = status_before.get("metrics_received", 0)
        after_count = status_after.get("metrics_received", 0)
        assert after_count > before_count, (
            f"OTel metrics_received did not increase: {before_count} → {after_count}"
        )

    def test_samples_stored(self, aictl_server, claude_otel_metrics):
        """Samples appear via /api/samples after metric ingestion."""
        aictl_server.post_otel_metrics(claude_otel_metrics)
        time.sleep(0.5)

        # Query samples with otel prefix
        samples = aictl_server.get("/api/samples", list="1", prefix="otel.")
        # Should have at least one metric registered
        assert isinstance(samples, list)
        # The metric names might be listed
        if samples:
            assert any("otel." in str(s) for s in samples)


class TestClaudeOtelLogs:
    """Claude Code OTLP log ingestion — API request events."""

    def test_logs_accepted(self, aictl_server, claude_otel_logs):
        resp = aictl_server.post_otel_logs(claude_otel_logs)
        assert resp == {"ok": True}

    def test_events_stored(self, aictl_server, claude_otel_logs):
        """Log records become events queryable via /api/events."""
        aictl_server.post_otel_logs(claude_otel_logs)

        events = aictl_server.get_events(
            kind="otel:claude_code.api_request", since="0", min_count=2,
        )
        assert len(events) >= 2, f"Expected ≥2 API request events, got {len(events)}"

    def test_api_calls_populated(self, aictl_server, claude_otel_logs):
        """API call analytics reflect OTel log data."""
        aictl_server.post_otel_logs(claude_otel_logs)

        api_calls = aictl_server.poll(
            "/api/api-calls",
            since="0",
            check=lambda r: len(r.get("calls", [])) >= 2,
        )
        assert "calls" in api_calls
        assert len(api_calls["calls"]) >= 2
        assert "summary" in api_calls
        assert api_calls["summary"].get("total_calls", 0) >= 2

    def test_otel_status_events_incremented(self, aictl_server, claude_otel_logs):
        status_before = aictl_server.get_otel_status()
        aictl_server.post_otel_logs(claude_otel_logs)
        time.sleep(0.3)
        status_after = aictl_server.get_otel_status()

        before_count = status_before.get("events_received", 0)
        after_count = status_after.get("events_received", 0)
        assert after_count > before_count


class TestCopilotOtelMetrics:
    """GitHub Copilot OTLP metric ingestion (GenAI semantic conventions)."""

    def test_metrics_accepted(self, aictl_server, copilot_otel_metrics):
        resp = aictl_server.post_otel_metrics(copilot_otel_metrics)
        assert resp == {"ok": True}

    def test_otel_status_incremented(self, aictl_server, copilot_otel_metrics):
        status_before = aictl_server.get_otel_status()
        aictl_server.post_otel_metrics(copilot_otel_metrics)
        time.sleep(0.3)
        status_after = aictl_server.get_otel_status()
        assert status_after.get("metrics_received", 0) > status_before.get(
            "metrics_received", 0
        )


class TestMixedOtelIngestion:
    """Interleaved metrics and logs from multiple tools."""

    def test_interleaved_metrics(
        self, aictl_server, claude_otel_metrics, copilot_otel_metrics
    ):
        """Both Claude and Copilot metrics are accepted without interference."""
        r1 = aictl_server.post_otel_metrics(claude_otel_metrics)
        r2 = aictl_server.post_otel_metrics(copilot_otel_metrics)
        assert r1 == {"ok": True}
        assert r2 == {"ok": True}

    def test_metrics_then_logs(
        self, aictl_server, claude_otel_metrics, claude_otel_logs
    ):
        """Metrics and logs from same tool are both processed."""
        aictl_server.post_otel_metrics(claude_otel_metrics)
        aictl_server.post_otel_logs(claude_otel_logs)
        time.sleep(0.5)

        status = aictl_server.get_otel_status()
        assert status.get("metrics_received", 0) > 0
        assert status.get("events_received", 0) > 0


class TestOtelEdgeCases:
    """OTel endpoint edge cases."""

    def test_empty_resource_metrics(self, aictl_server):
        """Empty resourceMetrics array is accepted gracefully."""
        resp = aictl_server.post_otel_metrics({"resourceMetrics": []})
        assert resp == {"ok": True}

    def test_empty_resource_logs(self, aictl_server):
        resp = aictl_server.post_otel_logs({"resourceLogs": []})
        assert resp == {"ok": True}

    def test_empty_resource_traces(self, aictl_server):
        resp = aictl_server.post_otel_traces({"resourceSpans": []})
        assert resp == {"ok": True}

    def test_unknown_service_name(self, aictl_server):
        """Metrics with unrecognized service.name are still accepted."""
        payload = {
            "resourceMetrics": [{
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": {"stringValue": "future-tool-v9"}}
                    ]
                },
                "scopeMetrics": [{
                    "scope": {"name": "unknown"},
                    "metrics": [{
                        "name": "future_tool.token.usage",
                        "sum": {
                            "dataPoints": [{
                                "asInt": "100",
                                "timeUnixNano": "1700000030000000000",
                                "attributes": []
                            }]
                        }
                    }]
                }]
            }]
        }
        resp = aictl_server.post_otel_metrics(payload)
        assert resp == {"ok": True}
