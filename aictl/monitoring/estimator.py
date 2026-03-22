# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Token and MCP inference heuristics.

Token estimation uses a tiered approach:
1. Exact telemetry (confidence 0.95) — from tool-native session files
2. Session file inference (confidence 0.60) — state bytes ÷ 4 chars/token
3. Network inference (confidence 0.40) — network bytes ÷ 4, scaled by 0.7
   (accounts for ~30% overhead from HTTP framing, JSON structure, etc.)

MCP loop detection scores three independent signals (network bursts,
CPU spikes, subprocess activity) and applies a correlation bonus when
signals coincide — suggesting a tool-calling loop rather than a one-off.
"""

from __future__ import annotations

import functools

from .session import MCPState, SessionState, TokenEstimate


@functools.cache
def _tool_has_session_files(tool: str) -> bool:
    """Check if a tool has file-based telemetry (from telemetry-sources.yaml).

    Tools with jsonl/json session files can have tokens estimated
    from state_bytes_written.
    """
    try:
        from ..data.schema import load_telemetry_sources
        sources = load_telemetry_sources()
        cfg = sources.get(tool, {})
        # Tools with aggregation=sum typically write per-request event files
        return cfg.get("aggregation") == "sum"
    except Exception:
        return False


# ─── Token estimation constants ────────────────────────────────

CHARS_PER_TOKEN = 4                    # ~4 characters per BPE token (approximate)
NETWORK_CONTENT_RATIO = 0.7           # ~70% of HTTP bytes are actual content (rest is framing)
SESSION_FILE_INPUT_RATIO = 0.6        # ~60% of session file bytes are prompt/input
SESSION_FILE_OUTPUT_RATIO = 0.4       # ~40% attributed to model output

# Confidence tiers
CONFIDENCE_TELEMETRY = 0.95           # Verified from tool-native stats
CONFIDENCE_SESSION_FILES = 0.60       # Derived from session state file sizes
CONFIDENCE_NETWORK = 0.40             # Inferred from network traffic
CONFIDENCE_NO_DATA = 0.10             # No traffic observed, placeholder

# ─── MCP loop detection thresholds ─────────────────────────────

NETWORK_BURST_THRESHOLD = 32_000      # Bytes per sample: indicates significant API traffic
CPU_SPIKE_THRESHOLD = 20.0            # Percent: active computation (tool execution)
TOOL_SUBPROCESS_NAMES = frozenset({   # Known subprocesses spawned by tool-calling loops
    "git", "rg", "ripgrep", "bash", "zsh", "sh", "pwsh", "powershell", "cmd.exe",
})

# MCP scoring weights (each signal's max contribution, sum > 1.0 intentional)
NETWORK_SCORE_WEIGHT = 0.15           # Per-peak contribution
NETWORK_SCORE_CAP = 0.45              # Maximum from network signal alone
CPU_SCORE_WEIGHT = 0.10               # Per-spike contribution
CPU_SCORE_CAP = 0.30                  # Maximum from CPU signal alone
SUBPROCESS_SCORE_WEIGHT = 0.08        # Per-burst contribution
SUBPROCESS_SCORE_CAP = 0.35           # Maximum from subprocess signal alone
CORRELATION_BONUS = 0.15              # Bonus when CPU + network both active (likely tool loop)
MCP_DETECTION_THRESHOLD = 0.45        # Minimum confidence to flag MCP loop


def estimate_tokens(session: SessionState) -> TokenEstimate:
    """Estimate input/output tokens with a confidence score."""

    if session.exact_input_tokens or session.exact_output_tokens:
        return TokenEstimate(
            input_tokens=session.exact_input_tokens,
            output_tokens=session.exact_output_tokens,
            confidence=CONFIDENCE_TELEMETRY,
            source="telemetry",
        )

    if session.state_bytes_written > 0 and _tool_has_session_files(session.tool):
        return TokenEstimate(
            input_tokens=int((session.state_bytes_written * SESSION_FILE_INPUT_RATIO) / CHARS_PER_TOKEN),
            output_tokens=int((session.inbound_bytes * SESSION_FILE_OUTPUT_RATIO) / CHARS_PER_TOKEN),
            confidence=CONFIDENCE_SESSION_FILES,
            source="session-files",
        )

    return TokenEstimate(
        input_tokens=int((session.outbound_bytes * NETWORK_CONTENT_RATIO) / CHARS_PER_TOKEN),
        output_tokens=int((session.inbound_bytes * NETWORK_CONTENT_RATIO) / CHARS_PER_TOKEN),
        confidence=CONFIDENCE_NETWORK if (session.outbound_bytes or session.inbound_bytes) else CONFIDENCE_NO_DATA,
        source="network-inference",
    )


def estimate_mcp(session: SessionState) -> MCPState:
    """Infer MCP-style tool loops from CPU/network/subprocess patterns."""

    network_peaks = sum(
        1
        for _, inbound_bytes, outbound_bytes in session.recent_network
        if inbound_bytes + outbound_bytes >= NETWORK_BURST_THRESHOLD
    )
    cpu_spikes = sum(1 for _, cpu_percent in session.recent_cpu if cpu_percent >= CPU_SPIKE_THRESHOLD)
    subprocess_bursts = sum(
        1 for _, process_name in session.recent_subprocesses if process_name in TOOL_SUBPROCESS_NAMES
    )

    score = 0.0
    score += min(NETWORK_SCORE_CAP, network_peaks * NETWORK_SCORE_WEIGHT)
    score += min(CPU_SCORE_CAP, cpu_spikes * CPU_SCORE_WEIGHT)
    score += min(SUBPROCESS_SCORE_CAP, subprocess_bursts * SUBPROCESS_SCORE_WEIGHT)
    if cpu_spikes and network_peaks:
        score += CORRELATION_BONUS

    loops = max(network_peaks // 2, 0)
    confidence = min(1.0, score)
    return MCPState(detected=confidence >= MCP_DETECTION_THRESHOLD, confidence=confidence, loops=loops)
