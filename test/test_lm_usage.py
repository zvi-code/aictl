"""Tests for :mod:`aictl.analysis.lm_usage`.

Covers per-extension aggregation from OTel ``language_model.usage``
events, synonyms for the extension-id attribute, and the empty-session
case.
"""

from __future__ import annotations

import time

import pytest

from aictl.analysis.lm_usage import session_lm_usage
from aictl.storage import EventRow, HistoryDB


@pytest.fixture()
def db(tmp_path):
    h = HistoryDB(db_path=str(tmp_path / "aictl.db"), flush_interval=0)
    yield h
    h.close()


def _ev(db, *, session_id, kind, detail, ts=None):
    db.append_event(
        EventRow(
            ts=ts if ts is not None else time.time(),
            tool="copilot-vscode",
            kind=kind,
            detail=detail,
            session_id=session_id,
        )
    )


def test_aggregates_by_extension(db):
    sid = "lm-1"
    _ev(db, session_id=sid, kind="otel:language_model.usage",
        detail={
            "extension.id": "github.copilot-chat",
            "gen_ai.usage.input_tokens": 100,
            "gen_ai.usage.output_tokens": 50,
            "gen_ai.request.model": "gpt-4o",
        })
    _ev(db, session_id=sid, kind="otel:language_model.usage",
        detail={
            "extension.id": "github.copilot-chat",
            "gen_ai.usage.input_tokens": 200,
            "gen_ai.usage.output_tokens": 80,
            "gen_ai.request.model": "gpt-4o",
        })
    _ev(db, session_id=sid, kind="otel:language_model.usage",
        detail={
            "extension.id": "ms-azuretools.vscode-azure-github-copilot",
            "gen_ai.usage.input_tokens": 30,
            "gen_ai.usage.output_tokens": 10,
            "gen_ai.request.model": "gpt-4o-mini",
        })
    db.flush()

    result = session_lm_usage(db, sid)
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
    assert result["total_calls"] == 3


def test_falls_back_to_plain_token_keys(db):
    sid = "lm-2"
    _ev(db, session_id=sid, kind="otel:language_model.usage",
        detail={
            "extensionId": "foo.bar",
            "input_tokens": "5",
            "output_tokens": "2",
            "model": "llama3",
        })
    db.flush()
    result = session_lm_usage(db, sid)
    assert result["total_tokens"] == 7
    assert result["by_extension"]["foo.bar"]["models"] == ["llama3"]


def test_unknown_extension_bucketed_as_literal(db):
    sid = "lm-3"
    _ev(db, session_id=sid, kind="otel:language_model.usage",
        detail={"input_tokens": 1, "output_tokens": 1})
    db.flush()
    result = session_lm_usage(db, sid)
    assert "(unknown)" in result["by_extension"]


def test_non_lm_events_ignored(db):
    sid = "lm-4"
    _ev(db, session_id=sid, kind="otel:api_request", detail={"input_tokens": 1000})
    db.flush()
    result = session_lm_usage(db, sid)
    assert result["total_calls"] == 0
    assert result["by_extension"] == {}


def test_empty_session_id(db):
    assert session_lm_usage(db, "") == {"by_extension": {}, "total_tokens": 0, "total_calls": 0}
