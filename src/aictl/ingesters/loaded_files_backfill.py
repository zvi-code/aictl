# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A one-time re-read of the session files to record the files past sessions loaded.

Schema v35 added ``session_loaded_files``. The live reader fills it for the files
it reads from now on; sessions read before have no rows. This backfill reads
every session file once with the transcript usage reader and writes only the
loaded-file rows: it never changes another table. When it is done,
``maintenance_state`` records it, and the backfill does not run again.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from typing import Any

from ..storage import CallFacts, is_lock_error

log = logging.getLogger(__name__)

STATE_KEY = "loaded_files_backfilled_at"
ALL_DAYS = 36500.0
LOCK_RETRIES = 5
LOCK_RETRY_S = 2.0


class _LoadedFilesOnly:
    """The store as the transcript reader sees it: only loaded-file rows are written."""

    def __init__(self, store: Any) -> None:
        self._store = store
        self.changed = 0

    def write_call_facts(self, facts: Any) -> int:
        rows = list(getattr(facts, "loaded_files", []) or [])
        if not rows:
            return 0
        for attempt in range(LOCK_RETRIES):
            try:
                written = int(self._store.write_call_facts(CallFacts(loaded_files=rows)))
                self.changed += written
                return written
            except sqlite3.OperationalError as exc:
                if not is_lock_error(exc) or attempt == LOCK_RETRIES - 1:
                    raise
                time.sleep(LOCK_RETRY_S)
        return 0

    @staticmethod
    def _keeps_text() -> bool:
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

    target = _LoadedFilesOnly(store)
    started = time.monotonic()
    ingester = ingester_factory(target)
    ingester.poll()
    if len(ingester.facts):
        log.warning("Loaded files backfill stopped with %d rows not written; it runs again on the next start", len(ingester.facts))
        return False
    store.set_state(STATE_KEY, time.time())
    log.info("Loaded files backfill: %d rows in %.0f s", target.changed, time.monotonic() - started)
    return True
