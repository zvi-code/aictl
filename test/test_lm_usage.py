"""Tests for :mod:`aictl.analysis.lm_usage`.

Covers per-extension aggregation from OTel ``language_model.usage``
events, synonyms for the extension-id attribute, and the empty-session
case.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

from aictl.analysis.lm_usage import lm_usage, session_lm_usage


def _ev(detail, kind="otel:language_model.usage"):
    return SimpleNamespace(kind=kind, detail=detail)


def test_aggregates_by_extension():
    result = lm_usage([
        _ev({
            "extension.id": "github.copilot-chat",
            "gen_ai.usage.input_tokens": 100,
            "gen_ai.usage.output_tokens": 50,
            "gen_ai.request.model": "gpt-4o",
        }),
        _ev({
            "extension.id": "github.copilot-chat",
            "gen_ai.usage.input_tokens": 200,
            "gen_ai.usage.output_tokens": 80,
            "gen_ai.request.model": "gpt-4o",
        }),
        _ev({
            "extension.id": "ms-azuretools.vscode-azure-github-copilot",
            "gen_ai.usage.input_tokens": 30,
            "gen_ai.usage.output_tokens": 10,
            "gen_ai.request.model": "gpt-4o-mini",
        }),
    ])
    by_ext = result["by_extension"]
    assert "github.copilot-chat" in by_ext
    cp = by_ext["github.copilot-chat"]
    assert cp["input_tokens"] == 300
    assert cp["output_tokens"] == 130
    assert cp["total_tokens"] == 430
    assert cp["calls"] == 2
    assert cp["models"] == ["gpt-4o"]
    az = by_ext["ms-azuretools.vscode-azure-github-copilot"]
    assert az["total_tokens"] == 40
    assert result["total_tokens"] == 470
    assert result["total_input_tokens"] == 330
    assert result["total_output_tokens"] == 140
    assert result["total_calls"] == 3


def test_falls_back_to_plain_token_keys():
    result = lm_usage([_ev({"extensionId": "foo.bar", "input_tokens": "5", "output_tokens": "2", "model": "llama3"})])
    assert result["total_tokens"] == 7
    assert result["by_extension"]["foo.bar"]["models"] == ["llama3"]


def test_unknown_extension_bucketed_as_literal():
    result = lm_usage([_ev({"input_tokens": 1, "output_tokens": 1})])
    assert "(unknown)" in result["by_extension"]


def test_non_lm_events_ignored():
    result = lm_usage([_ev({"input_tokens": 1000}, kind="otel:api_request")])
    assert result["total_calls"] == 0
    assert result["by_extension"] == {}


def test_empty_session_id():
    reader = Mock()
    assert session_lm_usage(reader, "") == {"by_extension": {}, "total_tokens": 0, "total_calls": 0}
    reader.query_events.assert_not_called()
