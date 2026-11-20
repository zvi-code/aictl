# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""A one-time re-read of the session files to record what filled past sessions' context.

Schema v36 added ``session_context_items``. The live reader fills it for the files
it reads from now on. This backfill reads every session file once, as the
loaded-files backfill does, and writes only the context item rows. A local
marker records completion.
"""

from __future__ import annotations

from typing import Any

from ..state_file import StateFile
from . import loaded_files_backfill

# v2: the conversation parts were added; stores that ran the first backfill read the files again.
STATE_KEY = "context_items_v2_backfilled_at"


def run(store: Any, state: StateFile, ingester_factory: Any = None) -> bool:
    """Run the backfill once. Returns True when it is done (now or before)."""
    return loaded_files_backfill.run(store, state, ingester_factory, attr="context_items", state_key=STATE_KEY)
