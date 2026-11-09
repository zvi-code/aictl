"""Getting rows into a Kusto table through streaming ingestion or ``.ingest inline``.

The connection hands an ingester complete rows (system columns included) for one
table. Both ingesters send newline-delimited JSON (``multijson``), which Kusto maps
onto the table's columns by name, so no ingestion mapping has to be kept in step
with the schema.
"""

from __future__ import annotations

import contextlib
import io
import json
import math
import re
import threading
from collections.abc import Iterator
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Any, Protocol

from .schema import quote

if TYPE_CHECKING:
    from . import KustoSettings

# An inline command is parsed as one request by the cluster; past roughly a
# megabyte it gets slow and the service starts refusing it.
INLINE_MAX_BYTES = 1_000_000
# Streaming ingestion takes at most 4 MB per request (uncompressed, before the
# service's own limit on compressed size); stay well under it.
STREAMING_MAX_BYTES = 3_500_000


class RowIngester(Protocol):
    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None: ...


def json_value(value: object) -> object:
    """A value as JSON can carry it. Datetimes become ISO text, bytes UTF-8 text, NaN null."""
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        # JSON has no NaN or infinity; json.dumps would write a token Kusto rejects.
        return value if math.isfinite(value) else None
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value.isoformat() + "Z"
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).decode("utf-8", errors="replace")
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value)
    return str(value)


# In an ASCII JSON line: an escaped backslash, a surrogate pair, or half of one.
_SURROGATE_RE = re.compile(r"\\\\|\\ud[89ab][0-9a-f]{2}\\ud[c-f][0-9a-f]{2}|\\ud[89a-f][0-9a-f]{2}")


def sound_line(line: str) -> str:
    """An ASCII JSON line with every half surrogate pair written as U+FFFD.

    Text cut between the two halves of a character (tools that count UTF-16 units do
    it) carries one half. Kusto stores that half as U+0000 and says nothing; U+FFFD
    is what it means: a character that could not be kept.
    """
    if "\\ud" not in line:
        return line
    return _SURROGATE_RE.sub(lambda m: m.group() if len(m.group()) != 6 else "\\ufffd", line)


def json_line(row: dict[str, Any]) -> str:
    """One row as one line of JSON.

    ``ensure_ascii`` escapes every newline, control character and line separator
    inside strings, so the line can never be split by the text it carries; that is
    what keeps an inline command's body intact.
    """
    line = json.dumps({k: json_value(v) for k, v in row.items()}, ensure_ascii=True, separators=(",", ":"))
    return sound_line(line)


def chunks(lines: list[str], max_bytes: int) -> Iterator[list[str]]:
    """The lines in consecutive groups of at most *max_bytes* (a single longer line goes alone)."""
    group: list[str] = []
    size = 0
    for line in lines:
        n = len(line) + 1  # ASCII only, so characters are bytes
        if group and size + n > max_bytes:
            yield group
            group, size = [], 0
        group.append(line)
        size += n
    if group:
        yield group


class InlineIngester:
    """Rows sent in the body of a synchronous ``.ingest inline`` command.

    This preserves read-after-write behavior without RowStore. It is the emulator
    default and an opt-in option for small development/test writes on a cluster.
    """

    def __init__(
        self, client: Any, database: str, max_bytes: int = INLINE_MAX_BYTES, slots: int | None = None
    ) -> None:
        self.client = client
        self.database = database
        self.max_bytes = max_bytes
        # *slots* is the cluster's ingestion capacity (see ``ingestion_capacity``).
        # A command sent past it is refused with 429 and comes back after a pause of
        # up to 30 seconds, during which the slot is free and unused; a writer refused
        # seven times in a row fails its commit. Writers wait here for a slot instead.
        # Another daemon on the cluster shares the capacity, so a refusal is still retried.
        self.slots = threading.BoundedSemaphore(slots) if slots else None

    def commands(self, table: str, rows: list[dict[str, Any]]) -> list[str]:
        return self.line_commands(table, [json_line(r) for r in rows])

    def line_commands(self, table: str, lines: list[str]) -> list[str]:
        head = f'.ingest inline into table {quote(table)} with (format="multijson") <|\n'
        budget = max(1, self.max_bytes - len(head))
        return [head + "\n".join(group) for group in chunks(lines, budget)]

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        self._run(table, self.commands(table, rows))

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        """Rows already written as JSON lines (ASCII, one row each), such as the OTel tables'."""
        self._run(table, self.line_commands(table, lines))

    def _run(self, table: str, commands: list[str]) -> None:
        from .connection import retrying

        slot = self.slots or contextlib.nullcontext()
        for command in commands:
            with slot:
                retrying(
                    lambda c=command: self.client.execute_mgmt(self.database, c),
                    f"inline ingestion into {table}",
                )


class StreamingIngester:
    """Rows sent through the cluster's streaming ingestion endpoint, readable when the call returns."""

    def __init__(
        self, settings: KustoSettings, ingest_client: Any = None, max_bytes: int = STREAMING_MAX_BYTES
    ) -> None:
        self.database = settings.database
        self.max_bytes = max_bytes
        if ingest_client is None:
            from azure.kusto.ingest import KustoStreamingIngestClient

            from .connection import connection_string

            ingest_client = KustoStreamingIngestClient(connection_string(settings))
        self.ingest_client = ingest_client

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        self.ingest_lines(table, [json_line(r) for r in rows])

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        """Rows already written as JSON lines (ASCII, one row each), such as the OTel tables'."""
        from azure.kusto.data.data_format import DataFormat
        from azure.kusto.ingest import IngestionProperties

        props = IngestionProperties(database=self.database, table=table, data_format=DataFormat.MULTIJSON)
        from .connection import retrying, schema_cache_behind

        for group in chunks(lines, self.max_bytes):
            data = "\n".join(group).encode("ascii")
            retrying(
                lambda d=data: self.ingest_client.ingest_from_stream(io.BytesIO(d), props),
                f"ingestion into {table}",
                also=schema_cache_behind,
            )


class TableIngester:
    """Route each table to its selected synchronous ingestion backend."""

    def __init__(self, settings: KustoSettings, ingesters: dict[str, RowIngester]) -> None:
        self.settings = settings
        self.ingesters = ingesters

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        self.ingesters[self.settings.ingestion_mode(table)].ingest(table, rows)

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        self.ingesters[self.settings.ingestion_mode(table)].ingest_lines(table, lines)


def ingestion_capacity(client: Any, database: str) -> int | None:
    """How many ingestions the cluster runs at a time: 1 on a development cluster, 12 on the emulator."""
    try:
        rows = client.execute_mgmt(database, ".show capacity ingestions").primary_results[0]
        return max(1, int(next(iter(rows))["Total"]))
    except Exception:  # noqa: BLE001 - not readable: inline commands go unqueued and a refusal is retried
        return None


def uses_inline(settings: KustoSettings) -> bool:
    return not settings.streaming or "inline" in settings.table_ingestion.values()


def make_ingester(
    settings: KustoSettings, client: Any, ingest_client: Any = None, *, inline_slots: int | None = None
) -> RowIngester:
    """Use the global default unless the table has an explicit override."""
    ingesters: dict[str, RowIngester] = {"inline": InlineIngester(client, settings.database, slots=inline_slots)}
    if settings.streaming or "streaming" in settings.table_ingestion.values():
        ingesters["streaming"] = StreamingIngester(settings, ingest_client)
    if settings.table_ingestion:
        return TableIngester(settings, ingesters)
    return ingesters["streaming" if settings.streaming else "inline"]
