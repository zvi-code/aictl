"""Tests for aictl/monitoring/tool_telemetry.py — parsers, helpers, dataclasses."""

from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from aictl.monitoring.tool_telemetry import (
    ToolTelemetryReport,
    _parse_iso_ts,
    _first_int,
    _iter_jsonl,
    _disambiguate_conversations,
    _detect_claude_errors,
    _parse_copilot_events,
    _parse_codex_session,
    _parse_continue_session,
    _recent_files,
    _PARSER_REGISTRY,
    collect_tool_telemetry,
)


# ────────────────────────────────────────────────────────────────
# ToolTelemetryReport dataclass
# ────────────────────────────────────────────────────────────────

class TestToolTelemetryReport:
    def test_defaults(self):
        r = ToolTelemetryReport(tool="t", source="s")
        assert r.input_tokens == 0
        assert r.output_tokens == 0
        assert r.errors == []
        assert r.daily == []

    def test_to_dict(self):
        r = ToolTelemetryReport(tool="t", source="s", input_tokens=100)
        d = r.to_dict()
        assert d["tool"] == "t"
        assert d["input_tokens"] == 100
        assert isinstance(d, dict)

    def test_to_dict_truncates_daily(self):
        r = ToolTelemetryReport(tool="t", source="s")
        r.daily = [{"date": f"2024-01-{i:02d}"} for i in range(1, 15)]
        d = r.to_dict()
        assert len(d["daily"]) == 7

    def test_to_dict_truncates_errors(self):
        r = ToolTelemetryReport(tool="t", source="s")
        r.errors = [{"type": "err"} for _ in range(30)]
        d = r.to_dict()
        assert len(d["errors"]) == 20


# ────────────────────────────────────────────────────────────────
# _parse_iso_ts
# ────────────────────────────────────────────────────────────────

class TestParseIsoTs:
    def test_valid_iso(self):
        ts = _parse_iso_ts("2024-06-15T10:30:00+00:00")
        assert ts > 0

    def test_zulu_suffix(self):
        ts = _parse_iso_ts("2024-06-15T10:30:00Z")
        assert ts > 0

    def test_empty_string(self):
        assert _parse_iso_ts("") == 0.0

    def test_none(self):
        assert _parse_iso_ts(None) == 0.0

    def test_garbage(self):
        assert _parse_iso_ts("not-a-date") == 0.0

    def test_numeric_returns_zero(self):
        assert _parse_iso_ts(12345) == 0.0


# ────────────────────────────────────────────────────────────────
# _first_int
# ────────────────────────────────────────────────────────────────

class TestFirstInt:
    def test_returns_first_nonzero(self):
        assert _first_int({"a": 0, "b": 5, "c": 10}, "a", "b", "c") == 5

    def test_returns_zero_when_all_missing(self):
        assert _first_int({}, "a", "b") == 0

    def test_returns_zero_when_all_zero(self):
        assert _first_int({"a": 0, "b": 0}, "a", "b") == 0

    def test_single_key(self):
        assert _first_int({"x": 42}, "x") == 42

    def test_string_values_converted(self):
        assert _first_int({"a": "99"}, "a") == 99


# ────────────────────────────────────────────────────────────────
# _iter_jsonl
# ────────────────────────────────────────────────────────────────

class TestIterJsonl:
    def test_valid_jsonl(self, tmp_path):
        f = tmp_path / "test.jsonl"
        f.write_text('{"a":1}\n{"b":2}\n')
        items = list(_iter_jsonl(f))
        assert len(items) == 2
        assert items[0] == {"a": 1}

    def test_skips_invalid_lines(self, tmp_path):
        f = tmp_path / "test.jsonl"
        f.write_text('{"ok":true}\nBAD LINE\n{"ok":false}\n')
        items = list(_iter_jsonl(f))
        assert len(items) == 2

    def test_skips_blank_lines(self, tmp_path):
        f = tmp_path / "test.jsonl"
        f.write_text('{"a":1}\n\n\n{"b":2}\n')
        items = list(_iter_jsonl(f))
        assert len(items) == 2

    def test_nonexistent_file(self, tmp_path):
        items = list(_iter_jsonl(tmp_path / "nope.jsonl"))
        assert items == []


# ────────────────────────────────────────────────────────────────
# _disambiguate_conversations
# ────────────────────────────────────────────────────────────────

class TestDisambiguateConversations:
    def test_empty_list(self):
        agents = []
        _disambiguate_conversations(agents)
        assert agents == []

    def test_single_agent_is_primary(self):
        agents = [{"started_at": "2024-01-01T00:00:00Z", "ended_at": "2024-01-01T01:00:00Z"}]
        _disambiguate_conversations(agents)
        assert agents[0]["relationship"] == "primary"
        assert agents[0]["parent_conversation_id"] is None

    def test_sidechain(self):
        agents = [
            {"started_at": "2024-01-01T00:00:00Z", "ended_at": "2024-01-01T01:00:00Z"},
            {"started_at": "2024-01-01T00:30:00Z", "ended_at": "2024-01-01T01:30:00Z", "is_sidechain": True},
        ]
        _disambiguate_conversations(agents)
        assert agents[1]["relationship"] == "sidechain"

    def test_sequential(self):
        agents = [
            {"started_at": "2024-01-01T00:00:00Z", "ended_at": "2024-01-01T01:00:00Z"},
            {"started_at": "2024-01-01T02:00:00Z", "ended_at": "2024-01-01T03:00:00Z"},
        ]
        _disambiguate_conversations(agents)
        assert agents[0]["relationship"] == "primary"
        assert agents[1]["relationship"] == "sequential"

    def test_parallel(self):
        agents = [
            {"started_at": "2024-01-01T00:00:00Z", "ended_at": "2024-01-01T02:00:00Z"},
            {"started_at": "2024-01-01T01:00:00Z", "ended_at": "2024-01-01T03:00:00Z"},
        ]
        _disambiguate_conversations(agents)
        assert agents[0]["relationship"] == "primary"
        assert agents[1]["relationship"] == "parallel"

    def test_no_end_time_assumed_running(self):
        agents = [
            {"started_at": "2024-01-01T00:00:00Z"},  # no ended_at
            {"started_at": "2024-01-01T01:00:00Z", "ended_at": "2024-01-01T02:00:00Z"},
        ]
        _disambiguate_conversations(agents)
        assert agents[0]["relationship"] == "primary"
        # Second agent starts while first is still running (infinite end)
        assert agents[1]["relationship"] == "parallel"

    def test_temp_fields_cleaned(self):
        agents = [{"started_at": "2024-01-01T00:00:00Z", "ended_at": "2024-01-01T01:00:00Z"}]
        _disambiguate_conversations(agents)
        assert "_start_epoch" not in agents[0]
        assert "_end_epoch" not in agents[0]

    def test_sorted_by_start(self):
        agents = [
            {"started_at": "2024-01-01T02:00:00Z", "ended_at": "2024-01-01T03:00:00Z"},
            {"started_at": "2024-01-01T00:00:00Z", "ended_at": "2024-01-01T01:00:00Z"},
        ]
        _disambiguate_conversations(agents)
        assert agents[0]["relationship"] == "primary"


# ────────────────────────────────────────────────────────────────
# _detect_claude_errors
# ────────────────────────────────────────────────────────────────

class TestDetectClaudeErrors:
    def test_message_with_error_obj(self):
        report = ToolTelemetryReport(tool="t", source="s")
        obj = {"message": {"error": {"type": "overloaded_error", "message": "Server overloaded"}}}
        _detect_claude_errors(obj, "", report)
        assert len(report.errors) == 1
        assert report.errors[0]["type"] == "overloaded_error"

    def test_error_pattern_in_system(self):
        report = ToolTelemetryReport(tool="t", source="s")
        obj = {"type": "system", "content": "rate limit exceeded"}
        _detect_claude_errors(obj, "system", report)
        assert len(report.errors) == 1
        assert report.errors[0]["type"] == "rate_limit"

    def test_no_errors_in_normal_message(self):
        report = ToolTelemetryReport(tool="t", source="s")
        obj = {"message": {"role": "assistant", "content": "Hello"}}
        _detect_claude_errors(obj, "assistant", report)
        assert len(report.errors) == 0

    def test_tool_use_error_ignored(self):
        report = ToolTelemetryReport(tool="t", source="s")
        obj = {"toolUseResult": "Error: file not found"}
        _detect_claude_errors(obj, "", report)
        # Tool errors are explicitly skipped
        assert len(report.errors) == 0

    def test_timeout_pattern(self):
        report = ToolTelemetryReport(tool="t", source="s")
        obj = {"type": "progress", "message": "Request timed out"}
        _detect_claude_errors(obj, "progress", report)
        assert len(report.errors) == 1
        assert report.errors[0]["type"] == "timeout"


# ────────────────────────────────────────────────────────────────
# _parse_copilot_events
# ────────────────────────────────────────────────────────────────

class TestParseCopilotEvents:
    def test_assistant_message(self, tmp_path):
        events = tmp_path / "events.jsonl"
        events.write_text(json.dumps({
            "type": "assistant.message",
            "data": {"outputTokens": 500},
            "timestamp": "2024-01-01T00:00:00Z",
        }) + "\n")
        report = ToolTelemetryReport(tool="copilot-cli", source="events-jsonl")
        _parse_copilot_events(events, report)
        assert report.output_tokens == 500
        assert report.total_messages == 1

    def test_session_shutdown_metrics(self, tmp_path):
        events = tmp_path / "events.jsonl"
        events.write_text(json.dumps({
            "type": "session.shutdown",
            "data": {
                "shutdownType": "routine",
                "modelMetrics": {
                    "gpt-4": {
                        "usage": {"inputTokens": 1000, "outputTokens": 200},
                        "requests": {"count": 5, "cost": 0.05},
                    }
                },
                "totalPremiumRequests": 3,
                "totalApiDurationMs": 15000,
            },
            "timestamp": "2024-01-01T00:00:00Z",
        }) + "\n")
        report = ToolTelemetryReport(tool="copilot-cli", source="events-jsonl")
        _parse_copilot_events(events, report)
        assert report.input_tokens == 1000
        assert report.by_model["gpt-4"]["input_tokens"] == 1000
        assert report.cost_usd == pytest.approx(0.05)

    def test_non_routine_shutdown_records_error(self, tmp_path):
        events = tmp_path / "events.jsonl"
        events.write_text(json.dumps({
            "type": "session.shutdown",
            "data": {"shutdownType": "crash", "modelMetrics": {}},
            "timestamp": "2024-01-01T00:00:00Z",
        }) + "\n")
        report = ToolTelemetryReport(tool="copilot-cli", source="events-jsonl")
        _parse_copilot_events(events, report)
        assert len(report.errors) == 1
        assert report.errors[0]["type"] == "shutdown_error"

    def test_slow_tool_execution(self, tmp_path):
        events = tmp_path / "events.jsonl"
        events.write_text(json.dumps({
            "type": "tool.execution_complete",
            "data": {"toolName": "bash", "durationMs": 120000},
            "timestamp": "2024-01-01T00:00:00Z",
        }) + "\n")
        report = ToolTelemetryReport(tool="copilot-cli", source="events-jsonl")
        _parse_copilot_events(events, report)
        assert len(report.errors) == 1
        assert report.errors[0]["type"] == "timeout"
        assert "bash" in report.errors[0]["message"]


# ────────────────────────────────────────────────────────────────
# _parse_codex_session
# ────────────────────────────────────────────────────────────────

class TestParseCodexSession:
    def test_token_count_event(self, tmp_path):
        sess = tmp_path / "session.jsonl"
        sess.write_text(
            json.dumps({"type": "event_msg", "payload": {
                "type": "token_count",
                "total_token_usage": {"input_tokens": 5000, "output_tokens": 1000, "cached_input_tokens": 200},
            }}) + "\n"
        )
        report = ToolTelemetryReport(tool="codex-cli", source="token-count")
        _parse_codex_session(sess, report)
        assert report.input_tokens == 5000
        assert report.output_tokens == 1000
        assert report.cache_read_tokens == 200

    def test_session_meta_model(self, tmp_path):
        sess = tmp_path / "session.jsonl"
        sess.write_text(
            json.dumps({"type": "session_meta", "payload": {"model": "o3-mini"}}) + "\n" +
            json.dumps({"type": "event_msg", "payload": {
                "type": "token_count",
                "total_token_usage": {"input_tokens": 100, "output_tokens": 50},
            }}) + "\n"
        )
        report = ToolTelemetryReport(tool="codex-cli", source="token-count")
        _parse_codex_session(sess, report)
        assert "o3-mini" in report.by_model

    def test_cumulative_last_total_wins(self, tmp_path):
        """Codex uses cumulative totals — only the LAST token_count matters."""
        sess = tmp_path / "session.jsonl"
        sess.write_text(
            json.dumps({"type": "event_msg", "payload": {
                "type": "token_count",
                "total_token_usage": {"input_tokens": 100, "output_tokens": 50},
            }}) + "\n" +
            json.dumps({"type": "event_msg", "payload": {
                "type": "token_count",
                "total_token_usage": {"input_tokens": 300, "output_tokens": 150},
            }}) + "\n"
        )
        report = ToolTelemetryReport(tool="codex-cli", source="token-count")
        _parse_codex_session(sess, report)
        # Should use the LAST total (300, 150), not sum (400, 200)
        assert report.input_tokens == 300
        assert report.output_tokens == 150


# ────────────────────────────────────────────────────────────────
# _parse_continue_session
# ────────────────────────────────────────────────────────────────

class TestParseContinueSession:
    def test_messages_with_usage(self, tmp_path):
        sess = tmp_path / "session.json"
        sess.write_text(json.dumps({
            "history": [
                {"role": "user", "usage": {"inputTokens": 100, "outputTokens": 0}},
                {"role": "assistant", "usage": {"inputTokens": 100, "outputTokens": 200}},
            ]
        }))
        report = ToolTelemetryReport(tool="continue", source="session-json")
        _parse_continue_session(sess, report)
        assert report.input_tokens == 200
        assert report.output_tokens == 200
        assert report.total_messages == 2

    def test_model_extraction(self, tmp_path):
        sess = tmp_path / "session.json"
        sess.write_text(json.dumps({
            "history": [
                {"role": "assistant", "model": "claude-3-haiku", "usage": {"inputTokens": 10, "outputTokens": 5}},
            ]
        }))
        report = ToolTelemetryReport(tool="continue", source="session-json")
        _parse_continue_session(sess, report)
        assert "claude-3-haiku" in report.by_model

    def test_invalid_json(self, tmp_path):
        sess = tmp_path / "session.json"
        sess.write_text("NOT JSON")
        report = ToolTelemetryReport(tool="continue", source="session-json")
        _parse_continue_session(sess, report)
        assert report.total_messages == 0

    def test_nonexistent_file(self, tmp_path):
        report = ToolTelemetryReport(tool="continue", source="session-json")
        _parse_continue_session(tmp_path / "nope.json", report)
        assert report.total_messages == 0

    def test_fallback_to_messages_key(self, tmp_path):
        sess = tmp_path / "session.json"
        sess.write_text(json.dumps({
            "messages": [
                {"role": "assistant", "usage": {"inputTokens": 50, "outputTokens": 25}},
            ]
        }))
        report = ToolTelemetryReport(tool="continue", source="session-json")
        _parse_continue_session(sess, report)
        assert report.input_tokens == 50


# ────────────────────────────────────────────────────────────────
# _recent_files
# ────────────────────────────────────────────────────────────────

class TestRecentFiles:
    def test_returns_recent_files(self, tmp_path):
        f = tmp_path / "test.jsonl"
        f.write_text("data")
        result = _recent_files(tmp_path, "*.jsonl", days=1)
        assert len(result) == 1

    def test_max_files_limit(self, tmp_path):
        for i in range(5):
            (tmp_path / f"test{i}.jsonl").write_text("data")
        result = _recent_files(tmp_path, "*.jsonl", max_files=2)
        assert len(result) == 2

    def test_empty_dir(self, tmp_path):
        result = _recent_files(tmp_path, "*.jsonl")
        assert result == []


# ────────────────────────────────────────────────────────────────
# _PARSER_REGISTRY
# ────────────────────────────────────────────────────────────────

class TestParserRegistry:
    def test_all_tools_registered(self):
        expected = {"claude-code", "copilot-cli", "codex-cli", "cursor", "continue"}
        assert set(_PARSER_REGISTRY.keys()) == expected

    def test_parsers_are_callable(self):
        for name, parser in _PARSER_REGISTRY.items():
            assert callable(parser), f"{name} parser is not callable"


# ────────────────────────────────────────────────────────────────
# collect_tool_telemetry (integration)
# ────────────────────────────────────────────────────────────────

class TestCollectToolTelemetry:
    def test_no_sources_returns_empty(self, tmp_path):
        with patch("aictl.monitoring.tool_telemetry.load_telemetry_sources", return_value={}):
            result = collect_tool_telemetry(tmp_path)
        assert result == []

    def test_dispatches_to_parser(self, tmp_path):
        mock_report = ToolTelemetryReport(tool="test", source="s", input_tokens=100)
        mock_parser = MagicMock(return_value=mock_report)

        with patch("aictl.monitoring.tool_telemetry.load_telemetry_sources",
                    return_value={"test-tool": {"source_id": "mock", "confidence": 0.9}}), \
             patch.dict(_PARSER_REGISTRY, {"test-tool": mock_parser}):
            result = collect_tool_telemetry(tmp_path)

        assert len(result) == 1
        assert result[0].input_tokens == 100

    def test_parser_returning_none_excluded(self, tmp_path):
        mock_parser = MagicMock(return_value=None)

        with patch("aictl.monitoring.tool_telemetry.load_telemetry_sources",
                    return_value={"test-tool": {"source_id": "mock", "confidence": 0.9}}), \
             patch.dict(_PARSER_REGISTRY, {"test-tool": mock_parser}):
            result = collect_tool_telemetry(tmp_path)

        assert result == []

    def test_parser_exception_swallowed(self, tmp_path):
        mock_parser = MagicMock(side_effect=RuntimeError("boom"))

        with patch("aictl.monitoring.tool_telemetry.load_telemetry_sources",
                    return_value={"test-tool": {"source_id": "mock", "confidence": 0.9}}), \
             patch.dict(_PARSER_REGISTRY, {"test-tool": mock_parser}):
            # Should not raise
            result = collect_tool_telemetry(tmp_path)
        assert result == []
