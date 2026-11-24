# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Codex rows name their session by the id the sessions table uses.

Before, session_sources stored a Codex rollout under its file name (rollout-<time>-<uuid>), which no
sessions row has, and Codex OTel records that name their conversation with ``conversation.id`` were
stored with no session. Ids and names below are invented.
"""

from __future__ import annotations

from pathlib import Path

from aictl.dashboard.otel_receiver import _promote_conversation_id
from aictl.ingesters.transcript_usage import TranscriptUsageIngester
from aictl.stores.kusto.otel import _session_id

UUID = "0199aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee"


def test_a_codex_rollout_is_indexed_under_its_session_uuid():
    path = Path("/codex/sessions/2026/11/24") / f"rollout-2026-11-24T10-00-00-{UUID}.jsonl"
    assert TranscriptUsageIngester._source_session("codex-cli", path) == UUID
    assert TranscriptUsageIngester._source_session("codex-cli", path.with_name(path.name + ".zst")) == UUID


def test_a_file_of_another_tool_keeps_its_stem():
    assert TranscriptUsageIngester._source_session("copilot-cli", Path("/x/sid-1/events.jsonl")) == "sid-1"


def test_a_codex_conversation_id_is_the_otel_session():
    assert _session_id({"conversation.id": UUID}, {}) == UUID
    assert _session_id({"session.id": "s", "conversation.id": UUID}, {}) == "s"
    attrs = {"conversation.id": UUID}
    _promote_conversation_id(attrs)
    assert attrs["session_id"] == UUID
