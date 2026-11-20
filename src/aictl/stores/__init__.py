"""Select a store without importing unused plugins or their dependencies."""

from dataclasses import dataclass
from importlib import import_module
from collections.abc import Mapping
from typing import Any

from ..kusto.observations import FAMILIES as OBSERVATION_FAMILIES, UnresolvedObservationsError, retains_unresolved_facts
from .base import Reader, ReadResult, StoreConfigurationError, Writer


class UnconfiguredReader:
    def capabilities(self) -> dict[str, Any]:
        return {"views": {}, "change_feed": False, "query_languages": []}

    def read(self, view: str, params: Mapping[str, Any]) -> ReadResult:
        raise StoreConfigurationError("No store configured")

    def health(self) -> dict[str, Any]:
        return {"status": "no store configured"}


_UNCONFIGURED_READER = UnconfiguredReader()

_PLUGINS = {"kusto": ".kusto"}


class _DiscardWriter:
    def append(self, table, rows):
        pass

    def upsert(self, table, rows):
        pass

    def delete(self, table, keys):
        pass

    def flush(self):
        pass

    def close(self):
        pass

    def health(self):
        return {"status": "no store configured"}


def writer_or_discard(writer: Writer | None) -> Writer:
    """Keep live collection running without a configured writer."""
    return writer if writer is not None else _DiscardWriter()


def close_writer(store: "Store") -> None:
    close = getattr(store.writer, "close", None)
    if close is not None:
        close()


class _EmptyReader:
    def capabilities(self):
        return {"views": (), "change_feed": False, "query_languages": ()}

    def read(self, view, params):
        from .base import ReadResult

        return ReadResult([])

    def health(self):
        return {"status": "no store configured"}


def reader_or_empty(reader: Reader | None) -> Reader:
    """Supply empty history to an internal projection when capture is unavailable."""
    return reader if reader is not None else _EmptyReader()


@dataclass(frozen=True)
class Store:
    reader: Reader | None = None
    writer: Writer | None = None
    otlp: Any = None

    def history_reader(self) -> Reader:
        return self.reader if self.reader is not None else _UNCONFIGURED_READER

    def health(self) -> dict[str, Any]:
        if self.reader is None and self.writer is None:
            return {"status": "no store configured"}
        return {
            "reader": self.reader.health() if self.reader is not None else None,
            "writer": self.writer.health() if self.writer is not None else None,
        }


def store_for(owner: Any) -> Store:
    """Get the store attached to a runtime owner."""
    return owner if isinstance(owner, Store) else getattr(owner, "history_store", None) or Store()


def reader_feature(reader: Reader, name: str, *args: Any) -> Any:
    """Call an optional store-specific capability through its named interface."""
    feature = getattr(reader, name, None)
    return feature(*args) if feature is not None else None


def has_history(reader: Reader) -> bool:
    """Whether a history destination is configured, independently of its health."""
    return reader is not _UNCONFIGURED_READER


NODE_ENV = "AICTL_NODE_ID"


def local_node_id() -> str:
    from ..kusto import local_node_id as resolve

    return resolve()


def normalize_node_id(value: str) -> str:
    from ..kusto import normalize_node_id as normalize

    return normalize(value)


def configured_destination():
    """Return configured store coordinates without opening a connection."""
    from ..kusto import kusto_settings

    return kusto_settings()


def context_names(value: Any) -> list[str]:
    from .kusto.otel import context_names as names

    return names(value)


def open_store(plugin: str | None = None, **options: Any) -> Store:
    """Return no reader or writer when there is no configured store."""
    if plugin is None:
        return Store()
    try:
        path = _PLUGINS[plugin]
    except KeyError as exc:
        raise StoreConfigurationError(f"Unknown store plugin {plugin!r}") from exc
    return import_module(path, __name__).open_store(**options)
