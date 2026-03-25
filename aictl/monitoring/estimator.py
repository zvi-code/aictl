"""Token and MCP inference heuristics."""

from __future__ import annotations

from .session import MCPState, SessionState, TokenEstimate


_HIGH_NETWORK_BYTES = 32_000
_HIGH_CPU_PERCENT = 20.0
_SUBPROCESS_NAMES = {"git", "rg", "ripgrep", "bash", "zsh", "sh", "pwsh", "powershell", "cmd.exe"}


def estimate_tokens(session: SessionState) -> TokenEstimate:
    """Estimate input/output tokens with a confidence score."""

    if session.exact_input_tokens or session.exact_output_tokens:
        return TokenEstimate(
            input_tokens=session.exact_input_tokens,
            output_tokens=session.exact_output_tokens,
            confidence=0.95,
            source="telemetry",
        )

    if session.state_bytes_written > 0 and session.tool == "copilot-cli":
        return TokenEstimate(
            input_tokens=int((session.state_bytes_written * 0.6) / 4),
            output_tokens=int((session.inbound_bytes * 0.4) / 4),
            confidence=0.6,
            source="session-files",
        )

    return TokenEstimate(
        input_tokens=int((session.outbound_bytes * 0.7) / 4),
        output_tokens=int((session.inbound_bytes * 0.7) / 4),
        confidence=0.4 if (session.outbound_bytes or session.inbound_bytes) else 0.1,
        source="network-inference",
    )


def estimate_mcp(session: SessionState) -> MCPState:
    """Infer MCP-style tool loops from CPU/network/subprocess patterns."""

    network_peaks = sum(
        1
        for _, inbound_bytes, outbound_bytes in session.recent_network
        if inbound_bytes + outbound_bytes >= _HIGH_NETWORK_BYTES
    )
    cpu_spikes = sum(1 for _, cpu_percent in session.recent_cpu if cpu_percent >= _HIGH_CPU_PERCENT)
    subprocess_bursts = sum(
        1 for _, process_name in session.recent_subprocesses if process_name in _SUBPROCESS_NAMES
    )

    score = 0.0
    score += min(0.45, network_peaks * 0.15)
    score += min(0.30, cpu_spikes * 0.10)
    score += min(0.35, subprocess_bursts * 0.08)
    if cpu_spikes and network_peaks:
        score += 0.15

    loops = max(network_peaks // 2, 0)
    confidence = min(1.0, score)
    return MCPState(detected=confidence >= 0.45, confidence=confidence, loops=loops)
