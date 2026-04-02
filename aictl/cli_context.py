# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Typed Click context object — replaces untyped ctx.obj dict."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class CliContext:
    """Typed container for state shared across Click subcommands.

    Replaces the old ``ctx.ensure_object(dict)`` / ``ctx.obj["key"]``
    pattern with attribute access, giving IDE autocomplete and catching
    typos at definition time.
    """

    db_path: str | None = None
    root: Path | None = None
    config: dict[str, Any] = field(default_factory=dict)
    verbose: bool = False
