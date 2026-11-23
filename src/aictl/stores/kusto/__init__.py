"""Kusto storage plugin."""

from __future__ import annotations

import atexit
import logging
from dataclasses import replace
from typing import TYPE_CHECKING, Any

from ...kusto import KustoSettings
from .. import Store
from ..base import StoreConfigurationError

if TYPE_CHECKING:
    from .tables import IngestionMode

log = logging.getLogger(__name__)


def _configured_modes(settings: KustoSettings) -> dict[str, IngestionMode]:
    from .tables import TABLES

    if unknown := settings.table_ingestion.keys() - TABLES.keys():
        raise StoreConfigurationError(f"Unknown tables in Kusto ingestion overrides: {', '.join(sorted(unknown))}")
    if settings.is_local:
        return dict.fromkeys(TABLES, "inline")
    modes = {
        name: settings.table_ingestion.get(name, spec.ingestion if settings.ingestion == "auto" else settings.ingestion)
        for name, spec in TABLES.items()
    }
    if "inline" in modes.values():
        raise StoreConfigurationError("Inline ingestion is only supported by the Kusto emulator")
    return modes


def read_only_layout(client: Any, settings: KustoSettings) -> dict[str, Any]:
    """The layout check of a read-only open: a warning in the health, never a failure."""
    from . import layout as L
    from .schema import check_layout

    try:
        state = check_layout(client, settings.database)
    except Exception as exc:  # noqa: BLE001 - a diagnostic read must still open
        return {**L.summary("unknown", None, "", f"The data layout was not checked: {exc}"), "epoch_kept_data": False}
    verdict, stored = state.verdict, state.stored
    warning = None if verdict in L.COMPATIBLE else L.message(verdict, stored, cluster=settings.cluster,
                                                              database=settings.database)
    if warning:
        log.warning("%s", warning)
    epoch = stored.data_epoch if stored is not None else ""
    return {**L.summary(verdict, stored, epoch, warning),
            "epoch_kept_data": bool(stored and stored.epoch_kept_data)}


def _auto_migrate() -> bool:
    from ...platforms import load_config

    return bool(getattr(load_config(), "auto_migrate", False))


def open_store(settings: KustoSettings | None = None, *, capture: bool = True, read_only: bool = False,
               trim_before=lambda: 0.0) -> Store:
    from .writer import KustoWriter

    if settings is None:
        return Store()
    if read_only:
        from .client import KustoClientFactory
        from .reader import KustoReader

        client = KustoClientFactory.client(settings)
        return Store(reader=KustoReader(client, settings.database, settings=settings),
                     layout=read_only_layout(client, settings))
    if not capture:
        return Store(writer=KustoWriter(None, node_id=settings.node_id, capture=False))

    from .client import KustoClientFactory
    from .migrations import runner
    from .reader import KustoReader
    from .schema import ensure_schema

    modes = _configured_modes(settings)
    client = KustoClientFactory.client(settings)
    # Writes start only after the layout check: an incompatible layout raises here, unless
    # [storage] auto_migrate allows the migration to run.
    migrate = runner(client, settings.database, lambda line: log.warning("%s", line)) if _auto_migrate() else None
    schema = ensure_schema(client, settings.database, modes=modes, node_id=settings.node_id,
                           cluster=settings.cluster, migrate=migrate)
    if not schema.streaming_available:
        modes = {name: "queued" if mode == "streaming" else mode for name, mode in modes.items()}
    ingester = KustoClientFactory.native_ingester(
        replace(settings, streaming=None, ingestion="inline" if settings.is_local else "queued", table_ingestion=modes)
    )
    writer = KustoWriter(ingester, node_id=settings.node_id, modes=modes, schema_warning=schema.warning,
                         trim_before=trim_before)
    from .otel_sink import OtelExportWriter

    atexit.register(writer.close)
    return Store(reader=KustoReader(client, settings.database, settings=settings), writer=writer,
                 otlp=OtelExportWriter(writer, settings.node_id), layout=schema.layout)
