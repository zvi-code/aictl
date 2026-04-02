# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Session and report models for live monitoring.

Also contains:
- ProcessInfo data model
- Token and MCP inference heuristics

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
from collections import Counter, deque
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from ..tools import TOOL_LABELS


@dataclass(slots=True, frozen=True)
class ProcessInfo:
    """Normalized process details shared across collectors."""

    pid: int
    ppid: int | None
    name: str
    exe: str | None = None
    cmdline: tuple[str, ...] = ()
    username: str | None = None
    cwd: str | None = None


def _derive_project(cwd: str | None) -> str:
    """Derive project name from cwd by finding the git root.

    Walks up from *cwd* looking for a ``.git`` directory or file (worktrees
    use a file).  Returns the git root path, or *cwd* itself as fallback.
    """
    if not cwd:
        return ""
    p = Path(cwd).resolve()
    for parent in (p, *p.parents):
        if (parent / ".git").exists():
            return str(parent)
    return str(p)


@dataclass(slots=True)
class TokenEstimate:
    """Estimated token usage for a tool session."""

    input_tokens: int
    output_tokens: int
    confidence: float
    source: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class MCPState:
    """Best-effort agentic loop inference."""

    detected: bool
    confidence: float
    loops: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class SessionState:
    """Live state for one inferred tool session."""

    session_id: str
    tool: str
    root_pid: int | None
    started_at: float
    last_seen_at: float
    pids: set[int] = field(default_factory=set)
    workspaces: set[str] = field(default_factory=set)
    files_touched: set[str] = field(default_factory=set)
    files_loaded: set[str] = field(default_factory=set)
    state_paths: set[str] = field(default_factory=set)
    outbound_bytes: int = 0
    inbound_bytes: int = 0
    state_bytes_written: int = 0
    file_events: int = 0
    cpu_percent: float = 0.0
    peak_cpu_percent: float = 0.0
    subprocess_counter: Counter[str] = field(default_factory=Counter)
    exact_input_tokens: int = 0
    exact_output_tokens: int = 0
    project: str = ""
    recent_network: deque[tuple[float, int, int]] = field(default_factory=lambda: deque(maxlen=24))
    recent_cpu: deque[tuple[float, float]] = field(default_factory=lambda: deque(maxlen=24))
    recent_subprocesses: deque[tuple[float, str]] = field(default_factory=lambda: deque(maxlen=32))

    @property
    def label(self) -> str:
        return TOOL_LABELS.get(self.tool, self.tool)

    def add_network(self, ts: float, inbound_bytes: int, outbound_bytes: int) -> None:
        self.inbound_bytes += max(0, inbound_bytes)
        self.outbound_bytes += max(0, outbound_bytes)
        self.recent_network.append((ts, max(0, inbound_bytes), max(0, outbound_bytes)))
        self.last_seen_at = max(self.last_seen_at, ts)

    def add_cpu(self, ts: float, cpu_percent: float) -> None:
        bounded = max(0.0, cpu_percent)
        self.cpu_percent = bounded
        self.peak_cpu_percent = max(self.peak_cpu_percent, bounded)
        self.recent_cpu.append((ts, bounded))
        self.last_seen_at = max(self.last_seen_at, ts)

    def add_subprocess(self, ts: float, process_name: str) -> None:
        normalized = process_name.lower()
        self.subprocess_counter[normalized] += 1
        self.recent_subprocesses.append((ts, normalized))
        self.last_seen_at = max(self.last_seen_at, ts)

    def add_file_activity(
        self,
        ts: float,
        path: str,
        workspace: str | None,
        state_root: str | None,
        growth_bytes: int,
    ) -> None:
        self.file_events += 1
        self.files_touched.add(path)
        if workspace:
            self.workspaces.add(workspace)
        if state_root:
            self.state_paths.add(state_root)
        self.state_bytes_written += max(0, growth_bytes)
        self.last_seen_at = max(self.last_seen_at, ts)

    def add_telemetry(self, ts: float, input_tokens: int, output_tokens: int) -> None:
        self.exact_input_tokens += max(0, input_tokens)
        self.exact_output_tokens += max(0, output_tokens)
        self.last_seen_at = max(self.last_seen_at, ts)

    def to_dict(self) -> dict[str, Any]:
        """Serialize individual session data for the API."""
        return {
            "session_id": self.session_id,
            "tool": self.tool,
            "label": self.label,
            "root_pid": self.root_pid,
            "project": self.project,
            "started_at": self.started_at,
            "last_seen_at": self.last_seen_at,
            "duration_s": round(self.last_seen_at - self.started_at, 1),
            "pids": sorted(self.pids),
            "workspaces": sorted(self.workspaces),
            "files_touched": sorted(self.files_touched),
            "files_loaded": sorted(self.files_loaded),
            "file_events": self.file_events,
            "cpu_percent": round(self.cpu_percent, 2),
            "peak_cpu_percent": round(self.peak_cpu_percent, 2),
            "inbound_bytes": self.inbound_bytes,
            "outbound_bytes": self.outbound_bytes,
            "state_bytes_written": self.state_bytes_written,
            "exact_input_tokens": self.exact_input_tokens,
            "exact_output_tokens": self.exact_output_tokens,
            "subprocess_count": dict(self.subprocess_counter),
        }


@dataclass(slots=True)
class ToolReport:
    """Aggregated report emitted by the monitor."""

    tool: str
    label: str
    session_count: int
    pid_count: int
    workspaces: list[str]
    workspace_size_mb: float
    files_touched: int
    file_events: int
    cpu_percent: float
    peak_cpu_percent: float
    inbound_bytes: int
    outbound_bytes: int
    inbound_rate_bps: float
    outbound_rate_bps: float
    token_estimate: TokenEstimate
    mcp: MCPState
    confidence: float
    sources: list[str]
    last_seen_at: float
    state_bytes_written: int = 0
    processes: list[dict] = field(default_factory=list)  # per-PID details [{pid, name, ppid, cpu, mem}]

    def to_dict(self) -> dict[str, Any]:
        return {
            "tool": self.tool,
            "label": self.label,
            "session_count": self.session_count,
            "pid_count": self.pid_count,
            "workspaces": self.workspaces,
            "workspace_size_mb": round(self.workspace_size_mb, 2),
            "files_touched": self.files_touched,
            "file_events": self.file_events,
            "cpu_percent": round(self.cpu_percent, 2),
            "peak_cpu_percent": round(self.peak_cpu_percent, 2),
            "inbound_bytes": self.inbound_bytes,
            "outbound_bytes": self.outbound_bytes,
            "inbound_rate_bps": round(self.inbound_rate_bps, 2),
            "outbound_rate_bps": round(self.outbound_rate_bps, 2),
            "state_bytes_written": self.state_bytes_written,
            "token_estimate": self.token_estimate.to_dict(),
            "mcp": self.mcp.to_dict(),
            "confidence": round(self.confidence, 3),
            "sources": self.sources,
            "last_seen_at": self.last_seen_at,
            "processes": self.processes,
        }


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
