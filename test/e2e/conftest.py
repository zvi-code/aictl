"""E2E payload fixtures — synthetic hook/OTel payloads for simulated tests.

The ``aictl_server`` and ``ServerHandle`` are defined in ``test/conftest.py``
(shared with e2e_tools/).  This file only provides payload loaders.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

PAYLOADS_DIR = Path(__file__).parent / "payloads"

def _load_payload(name: str) -> dict:
    return json.loads((PAYLOADS_DIR / name).read_text())


@pytest.fixture()
def claude_hook_sequence() -> list[dict]:
    """Return ordered list of hook payloads simulating a full Claude session."""
    data = _load_payload("claude_hooks.json")
    base_ts = time.time()
    session_id = data["session_id"]
    tool = data["tool"]
    cwd = data["cwd"]
    result = []
    offset = 0.0
    for ev in data["events"]:
        offset += ev.pop("_delay_ms", 0) / 1000
        result.append({
            **ev,
            "session_id": session_id,
            "tool": tool,
            "cwd": cwd,
            "ts": base_ts + offset,
        })
    return result


@pytest.fixture()
def gemini_hook_sequence() -> list[dict]:
    """Return ordered list of hook payloads simulating a Gemini session."""
    data = _load_payload("gemini_hooks.json")
    base_ts = time.time()
    session_id = data["session_id"]
    tool = data["tool"]
    cwd = data["cwd"]
    result = []
    offset = 0.0
    for ev in data["events"]:
        offset += ev.pop("_delay_ms", 0) / 1000
        result.append({
            **ev,
            "session_id": session_id,
            "tool": tool,
            "cwd": cwd,
            "ts": base_ts + offset,
        })
    return result


@pytest.fixture()
def claude_otel_metrics() -> dict:
    return _load_payload("claude_otel_metrics.json")


@pytest.fixture()
def claude_otel_logs() -> dict:
    return _load_payload("claude_otel_logs.json")


@pytest.fixture()
def copilot_otel_metrics() -> dict:
    return _load_payload("copilot_otel_metrics.json")
