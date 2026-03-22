# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Backward-compatible re-exports from orchestrator and models.

All collection logic now lives in aictl.orchestrator.
Data models live in aictl.dashboard.models.
This module exists only so existing imports don't break.
"""

from .models import DashboardSnapshot, DashboardTool  # noqa: F401
from ..orchestrator import collect  # noqa: F401

__all__ = ["DashboardSnapshot", "DashboardTool", "collect"]
