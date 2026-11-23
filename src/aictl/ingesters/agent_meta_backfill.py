# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Give stored subagent rows what their ``meta.json`` says.

Claude Code writes ``<session>/subagents/agent-<id>.meta.json`` beside a subagent's
transcript: the tool call that started it (``toolUseId``), the caller's description, its
depth, parent agent and worktree. The board links a subagent to its spawn only by that call id.
The reader reads the meta file when it reads the transcript, so a row is left without these
fields when an older aictl stored it, or when the meta file came after the transcript's last
line was read; the saved read positions keep the reader from reading that transcript again.

This pass reads the meta files, never a transcript, and the stored rows of their sessions, and
writes only the rows that gain a field, whole and under their stored project. The first pass
reads every meta file; each later start reads only the meta files changed since the last pass.
A subagent with no meta file is left as it is: no link is inferred.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

from ..state_file import StateFile
from ..stores import has_history, local_node_id, normalize_node_id, store_for
from ..stores.base import StoreError
from .call_facts import agent_meta_fields

log = logging.getLogger(__name__)

# The time of the last finished pass; a later start reads the meta files changed since then.
STATE_KEY = "agent_meta_completed_at"
ALL_DAYS = 36500.0
# A meta file written while the last pass ran is read again.
GRACE_S = 3600.0
SESSIONS_PER_READ = 200
ROWS_PER_READ = 20_000


def run(owner: Any, state: StateFile, ingester_factory: Callable[[], Any] | None = None) -> bool:
    """Complete the stored agent rows of *owner* (``session_facts`` and its store) from the meta
    files. Returns True when the pass finished; it runs again at the next start otherwise."""
    last = float(state.read().get(STATE_KEY) or 0.0)
    if ingester_factory is None:
        from .transcript_usage import TranscriptUsageIngester

        def ingester_factory() -> Any:
            return TranscriptUsageIngester(None, backfill_days=ALL_DAYS)

    started = time.time()
    found: dict[tuple[str, str], dict] = {}
    for key, meta in ingester_factory().scan_agent_meta(since=last - GRACE_S if last else 0.0).items():
        if fields := {name: value for name, value in agent_meta_fields(meta).items() if value not in (None, "")}:
            found[key] = fields
    written = 0
    if found:
        reader = store_for(owner).history_reader()
        if not has_history(reader):
            return False
        node = normalize_node_id(local_node_id())
        sessions = sorted({sid for sid, _ in found})
        for start in range(0, len(sessions), SESSIONS_PER_READ):
            keys = [f"{len(node)}:{node}{sid}" for sid in sessions[start:start + SESSIONS_PER_READ]]
            result = reader.read("agents.stored", {"all_nodes": False, "requested_node": node,
                                                   "session_keys": keys, "limit": ROWS_PER_READ})
            if result.truncated:
                raise StoreError(f"agents.stored returned more than {ROWS_PER_READ} rows for {len(keys)} sessions")
            items = [(row, found[key]) for row in result.rows
                     if (key := (row["session_id"], row["agent_id"])) in found]
            written += owner.session_facts.complete_agents(items)
    state.replace({STATE_KEY: started})
    log.info("Subagent meta files: %d read, %d stored rows completed, in %.0f s",
             len(found), written, time.time() - started)
    return True
