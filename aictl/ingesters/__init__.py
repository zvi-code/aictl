# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Ingesters pull data from per-tool local stores into aictl storage.

Mirrors the shape of :mod:`aictl.importers`, but for live/periodic
ingestion (vs one-shot config import). Each ingester opens its source
read-only and writes into our :class:`~aictl.storage.HistoryDB`.
"""

from __future__ import annotations

from .copilot_session_store import CopilotSessionStoreIngester
from .cursor_conversations import CursorConversationsIngester

__all__ = ["CopilotSessionStoreIngester", "CursorConversationsIngester"]
