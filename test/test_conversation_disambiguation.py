"""Tests for conversation disambiguation heuristics and agent JSONL parsing."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from aictl.monitoring.tool_telemetry import (
    _disambiguate_conversations,
    _parse_agent_file,
    _parse_iso_ts,
)


# ── Timestamp parsing ─────────────────────────────────────────────


def test_parse_iso_ts_basic():
    assert _parse_iso_ts("2026-03-27T14:30:00+00:00") > 0


def test_parse_iso_ts_zulu():
    assert _parse_iso_ts("2026-03-27T14:30:00Z") > 0


def test_parse_iso_ts_empty():
    assert _parse_iso_ts("") == 0.0


def test_parse_iso_ts_garbage():
    assert _parse_iso_ts("not-a-date") == 0.0


# ── Disambiguation: edge cases ────────────────────────────────────


def test_empty_list():
    agents: list[dict] = []
    _disambiguate_conversations(agents)
    assert agents == []


def test_single_agent_primary():
    agents = [_agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:30:00Z")]
    _disambiguate_conversations(agents)
    assert agents[0]["relationship"] == "primary"
    assert agents[0]["parent_conversation_id"] is None


def test_single_sidechain():
    agents = [_agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:30:00Z", sidechain=True)]
    _disambiguate_conversations(agents)
    assert agents[0]["relationship"] == "sidechain"


# ── Disambiguation: temporal patterns ────────────────────────────


def test_two_sequential():
    """Non-overlapping agents → primary + sequential."""
    agents = [
        _agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:30:00Z"),
        _agent("a2", "2026-03-27T11:00:00Z", "2026-03-27T11:30:00Z"),
    ]
    _disambiguate_conversations(agents)
    assert agents[0]["relationship"] == "primary"
    assert agents[1]["relationship"] == "sequential"


def test_two_parallel():
    """Overlapping agents → primary + parallel."""
    agents = [
        _agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:45:00Z"),
        _agent("a2", "2026-03-27T10:15:00Z", "2026-03-27T10:30:00Z"),
    ]
    _disambiguate_conversations(agents)
    assert agents[0]["relationship"] == "primary"
    assert agents[1]["relationship"] == "parallel"


def test_parallel_with_ongoing():
    """Agent with no end time (still running) overlaps with everything after."""
    agents = [
        _agent("a1", "2026-03-27T10:00:00Z", ""),  # no end → ongoing
        _agent("a2", "2026-03-27T11:00:00Z", "2026-03-27T11:30:00Z"),
    ]
    _disambiguate_conversations(agents)
    assert agents[0]["relationship"] == "primary"
    assert agents[1]["relationship"] == "parallel"


def test_mixed_sidechain_and_regular():
    """Sidechain agents don't affect primary/sequential/parallel classification."""
    agents = [
        _agent("sc", "2026-03-27T09:00:00Z", "2026-03-27T12:00:00Z", sidechain=True),
        _agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:30:00Z"),
        _agent("a2", "2026-03-27T11:00:00Z", "2026-03-27T11:30:00Z"),
    ]
    _disambiguate_conversations(agents)
    # Sorted by start time: sc, a1, a2
    rels = {a["agent_id"]: a["relationship"] for a in agents}
    assert rels["sc"] == "sidechain"
    assert rels["a1"] == "primary"  # first non-sidechain
    assert rels["a2"] == "sequential"


def test_three_parallel():
    """All overlapping → primary + parallel + parallel."""
    agents = [
        _agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:45:00Z"),
        _agent("a2", "2026-03-27T10:05:00Z", "2026-03-27T10:40:00Z"),
        _agent("a3", "2026-03-27T10:10:00Z", "2026-03-27T10:35:00Z"),
    ]
    _disambiguate_conversations(agents)
    assert agents[0]["relationship"] == "primary"
    assert agents[1]["relationship"] == "parallel"
    assert agents[2]["relationship"] == "parallel"


def test_sorts_by_start_time():
    """Agents passed out of order get sorted by start time."""
    agents = [
        _agent("late", "2026-03-27T11:00:00Z", "2026-03-27T11:30:00Z"),
        _agent("early", "2026-03-27T10:00:00Z", "2026-03-27T10:30:00Z"),
    ]
    _disambiguate_conversations(agents)
    assert agents[0]["agent_id"] == "early"
    assert agents[0]["relationship"] == "primary"
    assert agents[1]["agent_id"] == "late"
    assert agents[1]["relationship"] == "sequential"


def test_no_temp_fields_leak():
    """Internal _start_epoch/_end_epoch fields are cleaned up."""
    agents = [_agent("a1", "2026-03-27T10:00:00Z", "2026-03-27T10:30:00Z")]
    _disambiguate_conversations(agents)
    assert "_start_epoch" not in agents[0]
    assert "_end_epoch" not in agents[0]


# ── Agent JSONL parsing ───────────────────────────────────────────


def test_parse_agent_file_tool_use_count():
    """_parse_agent_file extracts tool_use_count from content blocks."""
    lines = [
        json.dumps({
            "agentId": "agent-1", "slug": "test", "sessionId": "s1",
            "timestamp": "2026-03-29T10:00:00Z",
        }),
        json.dumps({
            "type": "user", "timestamp": "2026-03-29T10:00:01Z",
            "message": {"content": "fix the bug"},
        }),
        json.dumps({
            "type": "assistant", "timestamp": "2026-03-29T10:00:02Z",
            "message": {
                "model": "claude-sonnet-4-6",
                "content": [
                    {"type": "text", "text": "Let me read the file"},
                    {"type": "tool_use", "name": "Read", "input": {"path": "/foo"}},
                ],
                "usage": {"input_tokens": 100, "output_tokens": 50},
            },
        }),
        json.dumps({
            "type": "assistant", "timestamp": "2026-03-29T10:00:03Z",
            "message": {
                "model": "claude-sonnet-4-6",
                "content": [
                    {"type": "tool_use", "name": "Edit", "input": {}},
                    {"type": "tool_use", "name": "Bash", "input": {}},
                ],
                "usage": {"input_tokens": 200, "output_tokens": 100},
            },
        }),
    ]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        f.write("\n".join(lines))
        f.flush()
        result = _parse_agent_file(Path(f.name))

    assert result is not None
    assert result["tool_use_count"] == 3  # Read + Edit + Bash
    assert set(result["tools_used"]) == {"Read", "Edit", "Bash"}
    assert result["input_tokens"] == 300
    assert result["output_tokens"] == 150
    assert result["task"] == "fix the bug"
    assert result["model"] == "claude-sonnet-4-6"


# ── Helpers ──────────────────────────────────────────────────────


def _agent(
    agent_id: str,
    started_at: str,
    ended_at: str,
    *,
    sidechain: bool = False,
) -> dict:
    return {
        "agent_id": agent_id,
        "started_at": started_at,
        "ended_at": ended_at,
        "is_sidechain": sidechain,
        "session_id": "test-session",
        "input_tokens": 0,
        "output_tokens": 0,
    }
