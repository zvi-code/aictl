# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Replay sizes for older tool calls. The reader fills only missing sizes."""

from __future__ import annotations

import time
from typing import Any

from ..state_file import StateFile
from ..stores.base import Writer
from ..tool_calls import write_size_fills

STATE_KEY = "tool_sizes_backfilled_at"
ALL_DAYS = 30.0


class _SizesOnly:
    """Ignore transcript facts other than sizes."""

    def write_call_facts(self, facts: Any) -> int:
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


class _NativeSizes:
    def __init__(self, writer: Writer) -> None:
        self.writer = writer

    def record(self, rows) -> int:
        return write_size_fills(self.writer, rows)

    def expire(self, before: float) -> None:
        pass

    def publish_coverage(self) -> None:
        pass


def run(writer: Writer, state: StateFile, ingester_factory: Any = None) -> bool:
    """Replay source sizes once without reading or updating stored tool rows."""
    if state.read().get(STATE_KEY):
        return True
    if ingester_factory is None:
        from .transcript_usage import TranscriptUsageIngester

        def ingester_factory(target, tool_calls):
            return TranscriptUsageIngester(target, backfill_days=ALL_DAYS, tool_calls=tool_calls)

    ingester = ingester_factory(_SizesOnly(), _NativeSizes(writer))
    ingester.poll()
    if len(ingester.facts):
        return False
    state.replace({STATE_KEY: time.time()})
    return True
