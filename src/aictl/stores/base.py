"""Store contracts shared by collectors and readers."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol

Row = dict[str, Any]


class StoreError(RuntimeError):
    """A store operation failed."""


class StoreConfigurationError(StoreError):
    """A store or its schema is not configured correctly."""


class StorePermissionError(StoreConfigurationError):
    def __init__(self, permission: str, operation: str):
        self.permission = permission
        self.operation = operation
        super().__init__(f"{operation} requires {permission} permission")


class InvalidRowError(StoreError, ValueError):
    """A row does not match the table definition."""


class UnknownViewError(StoreError, LookupError):
    """The store does not supply the requested view."""


@dataclass(frozen=True)
class ReadResult:
    rows: list[Row]
    truncated: bool = False
    stale: bool = False
    next_page: str | None = None


class Reader(Protocol):
    def capabilities(self) -> Mapping[str, Any]: ...
    def read(self, view: str, params: Mapping[str, Any]) -> ReadResult: ...
    def health(self) -> Mapping[str, Any]: ...


class ChangeReader(Reader, Protocol):
    """Optional extension for a reader that advertises a change feed."""

    def changes(self, cursor: str | None) -> tuple[ReadResult, str]: ...


class Writer(Protocol):
    def append(self, table: str, rows: Iterable[Row]) -> None: ...
    def upsert(self, table: str, rows: Iterable[Row]) -> None: ...
    def delete(self, table: str, keys: Iterable[Row]) -> None: ...
    def flush(self) -> None: ...
    def health(self) -> Mapping[str, Any]: ...
