"""E2E: Copilot CLI, Copilot desktop app and Copilot in VS Code through the real server.

Synthetic hook and OTLP payloads are posted per surface; each session must
appear under its own tool id with the model and token counts that were sent.
"""

from __future__ import annotations

import time
import uuid

import pytest

pytestmark = pytest.mark.e2e

SURFACES = ["copilot-cli", "copilot-desktop", "copilot-vscode"]


def _hook_events(tool: str, sid: str, model: str) -> list[dict]:
    ts = time.time()
    base = {"session_id": sid, "tool": tool, "cwd": "/tmp/e2e-project"}
    return [
        {**base, "event": "SessionStart", "model": model, "pid": 99100, "ts": ts},
        {**base, "event": "UserPromptSubmit", "message": "hello", "pid": 99100, "ts": ts + 0.1},
        {**base, "event": "PreToolUse", "tool_name": "bash", "input": {"command": "ls"}, "pid": 99100, "ts": ts + 0.2},
        {**base, "event": "PostToolUse", "tool_name": "bash", "result": "ok", "pid": 99100, "ts": ts + 0.3},
        {**base, "event": "Stop", "pid": 99100, "ts": ts + 0.4},
    ]


def _otlp(service: str, sid: str, model: str, tin: int, tout: int) -> dict:
    def pt(kind: str, n: int) -> dict:
        return {
            "asInt": str(n),
            "timeUnixNano": str(int(time.time() * 1e9)),
            "attributes": [
                {"key": "gen_ai.token.type", "value": {"stringValue": kind}},
                {"key": "gen_ai.request.model", "value": {"stringValue": model}},
            ],
        }

    return {
        "resourceMetrics": [
            {
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": {"stringValue": service}},
                        {"key": "session.id", "value": {"stringValue": sid}},
                    ]
                },
                "scopeMetrics": [
                    {
                        "scope": {"name": "copilot_chat"},
                        "metrics": [
                            {
                                "name": "gen_ai.client.token.usage",
                                "sum": {"dataPoints": [pt("input", tin), pt("output", tout)]},
                            }
                        ],
                    }
                ],
            }
        ]
    }


def _session(server, sid: str) -> dict | None:
    return next((s for s in server.get_sessions(since="0") if s["session_id"] == sid), None)


@pytest.mark.parametrize("tool", SURFACES)
def test_hook_session_lands_under_its_own_tool_id(aictl_server, tool):
    sid = f"{tool}:{uuid.uuid4().hex[:8]}"
    for ev in _hook_events(tool, sid, "gpt-5.1"):
        aictl_server.post_hook(ev)
    time.sleep(0.7)
    s = _session(aictl_server, sid)
    assert s is not None, f"{tool}: session {sid} not found"
    assert s["tool"] == tool
    assert "gpt-5.1" in str(s.get("model", ""))


@pytest.mark.parametrize("service", ["github-copilot-chat", "github-copilot-cli", "github-copilot-desktop"])
def test_otel_metrics_are_received_for_every_surface(aictl_server, service):
    before = aictl_server.get_otel_status().get("metrics_received", 0)
    assert aictl_server.post_otel_metrics(_otlp(service, f"otel-{uuid.uuid4().hex[:6]}", "gpt-4o", 1234, 56)) == {"ok": True}
    time.sleep(0.5)
    assert aictl_server.get_otel_status().get("metrics_received", 0) > before


@pytest.mark.xfail(
    strict=True,
    reason="OTLP token metrics posted for a copilot session do not surface in /api/sessions "
    "(no session row is created from metrics alone); tokens reach sessions via hooks or ingesters",
)
def test_vscode_otel_tokens_visible_on_session(aictl_server):
    sid = f"otel-vscode-{uuid.uuid4().hex[:6]}"
    aictl_server.post_otel_metrics(_otlp("github-copilot-chat", sid, "gpt-4o", 1234, 56))
    time.sleep(0.7)
    s = _session(aictl_server, sid)
    assert s is not None and s["tool"] == "copilot-vscode"
    assert s.get("input_tokens") == 1234 and s.get("output_tokens") == 56


@pytest.mark.xfail(
    strict=True,
    reason="OTel receiver maps every copilot service.name to copilot-vscode (SERVICE_NAME_ALIASES); "
    "copilot-cli and copilot-desktop need their own service names",
)
@pytest.mark.parametrize(
    "service,tool", [("github-copilot-cli", "copilot-cli"), ("github-copilot-desktop", "copilot-desktop")]
)
def test_cli_and_desktop_otel_attribution(aictl_server, service, tool):
    sid = f"otel-{tool}-{uuid.uuid4().hex[:6]}"
    aictl_server.post_otel_metrics(_otlp(service, sid, "gpt-5.1", 100, 10))
    time.sleep(0.7)
    s = _session(aictl_server, sid)
    assert s is not None and s["tool"] == tool
