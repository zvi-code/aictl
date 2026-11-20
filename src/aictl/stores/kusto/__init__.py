"""Kusto storage plugin."""

from __future__ import annotations

import atexit
from dataclasses import replace
from typing import TYPE_CHECKING

from ...kusto import KustoSettings
from .. import Store
from ..base import StoreConfigurationError

if TYPE_CHECKING:
    from .tables import IngestionMode


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


def open_store(settings: KustoSettings | None = None, *, capture: bool = True, read_only: bool = False,
               trim_before=lambda: 0.0) -> Store:
    from .writer import KustoWriter

    if settings is None:
        return Store()
    if read_only:
        from .client import KustoClientFactory
        from .reader import KustoReader

        return Store(reader=KustoReader(KustoClientFactory.client(settings), settings.database, settings=settings))
    if not capture:
        return Store(writer=KustoWriter(None, node_id=settings.node_id, capture=False))

    from .client import KustoClientFactory
    from .reader import KustoReader
    from .schema import ensure_schema

    modes = _configured_modes(settings)
    client = KustoClientFactory.client(settings)
    schema = ensure_schema(client, settings.database, modes=modes)
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
                 otlp=OtelExportWriter(writer, settings.node_id))
