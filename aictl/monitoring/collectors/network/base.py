# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Network collector base class."""

from __future__ import annotations

from ..base import BaseCollector


class NetworkCollector(BaseCollector):
    """Base class for network collectors."""

    name = "network"
