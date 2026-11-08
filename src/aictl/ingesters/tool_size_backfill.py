# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A one-time re-read of the transcripts to fill the size of older tool calls.

Schema v33 added ``input_bytes`` and ``output_bytes`` to ``tool_invocations``.
Calls stored before it have NULL there. This backfill reads every transcript
once with the transcript usage reader and writes only those two sizes, to
calls that are already stored: it never adds a row and never changes another
column. When every size is written, ``maintenance_state`` records it, and the
backfill does not run again.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from typing import Any

from ..storage import is_lock_error

log = logging.getLogger(__name__)

STATE_KEY = "tool_sizes_backfilled_at"
# All of the history: the transcripts the tools still keep.
ALL_DAYS = 36500.0
LOCK_RETRIES = 5
LOCK_RETRY_S = 2.0


class _SizesOnly:
    """The store as the transcript reader sees it: only tool call sizes are written."""

    def __init__(self, store: Any) -> None:
        self._store = store
        self.changed = 0

    def write_call_facts(self, facts: Any) -> int:
        rows = [
            (t.session_id, t.dedup_key, t.input_bytes, t.output_bytes)
            for t in facts.tools
            if t.dedup_key and (t.input_bytes is not None or t.output_bytes is not None)
        ]
        if not rows:
            return 0
        for attempt in range(LOCK_RETRIES):
            try:
                changed = int(self._store.fill_tool_sizes(rows))
                self.changed += changed
                return changed
            except sqlite3.OperationalError as exc:
                if not is_lock_error(exc) or attempt == LOCK_RETRIES - 1:
                    raise
                time.sleep(LOCK_RETRY_S)
        return 0

    @staticmethod
    def _keeps_text() -> bool:
        # The sizes are measured on the raw text; the reader need not keep the text itself.
        return False

    # The reader also writes sessions and usage. The backfill leaves them as they are.
    def upsert_session_usage(self, row: dict) -> None:
        return None

    def upsert_session(self, row: Any) -> None:
        return None


def run(store: Any, ingester_factory: Any = None) -> bool:
    """Run the backfill once. Returns True when it is done (now or before)."""
    if store.state_value(STATE_KEY) is not None:
        return True
    if ingester_factory is None:
        from .transcript_usage import TranscriptUsageIngester

        def ingester_factory(target: Any) -> Any:
            return TranscriptUsageIngester(target, backfill_days=ALL_DAYS)

    target = _SizesOnly(store)
    started = time.monotonic()
    ingester = ingester_factory(target)
    ingester.poll()
    if len(ingester.facts):
        # A write failed; the sizes stay to fill on the next start.
        log.warning("Tool size backfill stopped with %d rows not written; it runs again on the next start", len(ingester.facts))
        return False
    store.set_state(STATE_KEY, time.time())
    log.info("Tool size backfill: %d tool calls got their sizes in %.0f s", target.changed, time.monotonic() - started)
    return True
