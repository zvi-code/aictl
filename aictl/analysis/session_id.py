# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Stable session identity — resolves and merges IDs across sources.

A session may be known by multiple IDs: a PID-based correlator ID
(``claude-code:12345:1672531200``), a tool-native UUID from hooks,
and an OTel ``session.id`` attribute.  This module picks the best
canonical ID and tracks all aliases so lookups work regardless of
which ID the caller has.
"""

from __future__ import annotations

import hashlib
import re
import time
from dataclasses import dataclass, field

# Pattern for correlator-generated IDs: tool:pid:timestamp
_CORRELATOR_ID_RE = re.compile(r"^([a-z0-9_-]+):(\d+):(\d+)$")
_EPHEMERAL_RE = re.compile(r"^([a-z0-9_-]+):ephemeral$")
# UUID v4
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I
)


def id_type(session_id: str) -> str:
    """Classify a session ID string.

    Returns one of: ``"uuid"``, ``"correlator"``, ``"ephemeral"``, ``"unknown"``.
    """
    if not session_id:
        return "unknown"
    if _UUID_RE.match(session_id):
        return "uuid"
    if _CORRELATOR_ID_RE.match(session_id):
        return "correlator"
    if _EPHEMERAL_RE.match(session_id):
        return "ephemeral"
    return "unknown"


def _parse_correlator_id(session_id: str) -> tuple[str, int, int] | None:
    """Extract (tool, pid, timestamp) from a correlator ID, or None."""
    m = _CORRELATOR_ID_RE.match(session_id)
    if m:
        return m.group(1), int(m.group(2)), int(m.group(3))
    return None


def fingerprint_session(tool: str, pid: int, start_ts: float,
                        workspace: str = "") -> str:
    """Create a stable composite hash for a PID-based session.

    The hash is deterministic for the same inputs, surviving daemon
    restarts.  Format: ``<tool>-<hex8>`` (e.g. ``claude-code-a3f1c9d2``).
    """
    raw = f"{tool}:{pid}:{int(start_ts)}:{workspace}"
    h = hashlib.sha256(raw.encode()).hexdigest()[:8]
    return f"{tool}-{h}"


@dataclass
class SessionIdentity:
    """Composite identity for one coding session.

    Aggregates every ID seen for the same logical session and exposes a
    single ``canonical_id`` for use throughout the system.
    """

    canonical_id: str
    tool: str
    source_ids: list[str] = field(default_factory=list)
    pids: set[int] = field(default_factory=set)
    project: str = ""
    workspace: str = ""
    started_at: float = 0.0
    source: str = ""  # "hook", "otel", "correlator"

    # ── lookup helpers ──────────────────────────────────

    def has_id(self, sid: str) -> bool:
        """Return True if *sid* is any known alias for this session."""
        return sid == self.canonical_id or sid in self.source_ids

    def has_pid(self, pid: int) -> bool:
        return pid in self.pids

    # ── mutation ────────────────────────────────────────

    def add_alias(self, sid: str) -> None:
        """Record an alternative ID for this session."""
        if sid and sid != self.canonical_id and sid not in self.source_ids:
            self.source_ids.append(sid)

    def add_pid(self, pid: int) -> None:
        if pid:
            self.pids.add(pid)

    def to_dict(self) -> dict:
        return {
            "canonical_id": self.canonical_id,
            "tool": self.tool,
            "source_ids": list(self.source_ids),
            "pids": sorted(self.pids),
            "project": self.project,
            "workspace": self.workspace,
            "started_at": self.started_at,
            "source": self.source,
        }


# ── Resolution / merge ──────────────────────────────────────

def resolve_session_id(
    *,
    hook_id: str = "",
    otel_id: str = "",
    correlator_id: str = "",
    tool: str = "",
    pid: int = 0,
    start_ts: float = 0.0,
    workspace: str = "",
) -> SessionIdentity:
    """Pick the best canonical ID from all available sources.

    Priority: tool-native UUID (hook/otel) > correlator ID > fingerprint.
    All other IDs become aliases in ``source_ids``.
    """
    candidates: list[tuple[str, str]] = []  # (id, source)
    if hook_id:
        candidates.append((hook_id, "hook"))
    if otel_id and otel_id != hook_id:
        candidates.append((otel_id, "otel"))
    if correlator_id and correlator_id not in (hook_id, otel_id):
        candidates.append((correlator_id, "correlator"))

    # Pick canonical: prefer UUID, then correlator, then fingerprint
    canonical = ""
    source = ""
    for cid, csrc in candidates:
        if id_type(cid) == "uuid":
            canonical = cid
            source = csrc
            break
    if not canonical:
        for cid, csrc in candidates:
            if id_type(cid) == "correlator":
                canonical = cid
                source = csrc
                break
    if not canonical and (tool and pid and start_ts):
        canonical = fingerprint_session(tool, pid, start_ts, workspace)
        source = "correlator"
    if not canonical and candidates:
        canonical, source = candidates[0]

    identity = SessionIdentity(
        canonical_id=canonical or f"unknown-{int(time.time())}",
        tool=tool,
        started_at=start_ts,
        project=workspace,
        workspace=workspace,
        source=source,
    )
    if pid:
        identity.pids.add(pid)
    for cid, _ in candidates:
        if cid != canonical:
            identity.source_ids.append(cid)
    return identity


def merge_identities(a: SessionIdentity, b: SessionIdentity) -> SessionIdentity:
    """Merge two identities that refer to the same logical session.

    Prefers UUIDs over correlator IDs for the canonical.  Unions all
    aliases and PIDs.
    """
    # Pick the better canonical
    if id_type(b.canonical_id) == "uuid" and id_type(a.canonical_id) != "uuid":
        primary, secondary = b, a
    else:
        primary, secondary = a, b

    merged = SessionIdentity(
        canonical_id=primary.canonical_id,
        tool=primary.tool or secondary.tool,
        project=primary.project or secondary.project,
        workspace=primary.workspace or secondary.workspace,
        started_at=min(
            t for t in (primary.started_at, secondary.started_at) if t
        ) if (primary.started_at or secondary.started_at) else 0.0,
        source=primary.source or secondary.source,
    )
    # Collect all aliases
    seen = {merged.canonical_id}
    for sid in (
        primary.source_ids + secondary.source_ids
        + [secondary.canonical_id]
    ):
        if sid and sid not in seen:
            merged.source_ids.append(sid)
            seen.add(sid)
    merged.pids = primary.pids | secondary.pids
    return merged


def can_merge(a: SessionIdentity, b: SessionIdentity) -> bool:
    """Heuristic: do *a* and *b* likely refer to the same session?

    True when they share a PID, or share an alias, and the tools match.
    """
    if a.tool and b.tool and a.tool != b.tool:
        return False
    # Shared PID is strong evidence
    if a.pids & b.pids:
        return True
    # Shared ID
    all_a = {a.canonical_id} | set(a.source_ids)
    all_b = {b.canonical_id} | set(b.source_ids)
    return bool(all_a & all_b)
