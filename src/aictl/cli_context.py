# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Typed Click context object — replaces untyped ctx.obj dict."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import click


@dataclass
class CliContext:
    """Typed container for state shared across Click subcommands.

    Replaces the old ``ctx.ensure_object(dict)`` / ``ctx.obj["key"]``
    pattern with attribute access, giving IDE autocomplete and catching
    typos at definition time.
    """

    root: Path | None = None
    config: dict[str, Any] = field(default_factory=dict)
    verbose: bool = False


def _reject_db(ctx: click.Context, param: click.Parameter, value: str | None) -> None:
    if value is not None:
        raise click.UsageError(
            "--db is gone: aictl no longer has a SQLite store. History lives in Kusto; set kusto_cluster and "
            "kusto_database in [storage] of config.toml, or pass --kusto-cluster and --kusto-database "
            "(or set AICTL_KUSTO_CLUSTER and AICTL_KUSTO_DATABASE)."
        )


removed_db_option = click.option(
    "--db", default=None, type=click.Path(), hidden=True, expose_value=False, callback=_reject_db,
    help="Removed. Configure Kusto instead.",
)
