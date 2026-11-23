"""Getting rows into Kusto through queued, streaming or inline ingestion.

The connection hands an ingester complete rows (system columns included) for one
table. All ingesters send newline-delimited JSON (``multijson``), which Kusto maps
onto the table's columns by name, so no ingestion mapping has to be kept in step
with the schema.
"""

from __future__ import annotations

import contextlib
import gzip
import io
import json
import logging
import math
import re
import threading
import time
import uuid
from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Protocol

from ...health import ObservedKustoClient, OperationStats
from .client import ROWID, VERSION, Result, connection_string, quote
from .diagnostics import log_failure

if TYPE_CHECKING:
    from . import KustoSettings

# An inline command is parsed as one request by the cluster; past roughly a
# megabyte it gets slow and the service starts refusing it.
INLINE_MAX_BYTES = 1_000_000
# Streaming ingestion takes at most 4 MB per request (uncompressed, before the
# service's own limit on compressed size); stay well under it.
STREAMING_MAX_BYTES = 3_500_000
# The SDK adds 30 seconds for transport; its unconfigured streaming timeout is ten minutes.
STREAMING_TIMEOUT = timedelta(seconds=30)
# Bound source uploads in memory; DM still determines ingestion batches.
QUEUED_MAX_BYTES = 16_000_000
QUEUED_VISIBILITY_TIMEOUT_S = 600.0
QUEUED_VISIBILITY_POLL_S = 5.0
QUEUED_PENDING_ROWS = 50_000
VISIBILITY_QUERY_ROWS = 500
log = logging.getLogger(__name__)


class RowIngester(Protocol):
    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None: ...

    def ingest_lines(self, table: str, lines: list[str]) -> None: ...


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
        self, client: Any, database: str, max_bytes: int = INLINE_MAX_BYTES, slots: int | None = None,
        *, retry: bool = True,
    ) -> None:
        self.client = client
        self.database = database
        self.max_bytes = max_bytes
        self.retry = retry
        self.operations = OperationStats(volume=True)
        self.capacity_total = slots
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
        slot = self.slots or contextlib.nullcontext()
        for command in commands:
            with slot:
                def send(c: str = command) -> Any:
                    return self.operations.call_table(
                        table, lambda: self.client.execute_mgmt(self.database, c),
                        rows=len(c.split("\n")) - 1, bytes_=len(c.split("\n", 1)[-1].encode("ascii")),
                        mode="inline",
                    )

                if self.retry:
                    from .client import retrying

                    retrying(send, f"inline ingestion into {table}")
                else:
                    send()


class StreamingIngester:
    """Rows sent through the cluster's streaming ingestion endpoint, readable when the call returns."""

    def __init__(
        self, settings: KustoSettings, ingest_client: Any = None, max_bytes: int = STREAMING_MAX_BYTES,
        *, retry: bool = True,
    ) -> None:
        self.database = settings.database
        self.max_bytes = max_bytes
        self.retry = retry
        self.operations = OperationStats(volume=True)
        if ingest_client is None:
            from azure.kusto.data import KustoClient

            ingest_client = KustoClient(connection_string(settings))
        self.ingest_client = (
            ingest_client
            if isinstance(ingest_client, ObservedKustoClient)
            else ObservedKustoClient(ingest_client, cluster=settings.cluster)
        )

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        self.ingest_lines(table, [json_line(r) for r in rows])

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        """Rows already written as JSON lines (ASCII, one row each), such as the OTel tables'."""
        from azure.kusto.data import ClientRequestProperties
        from azure.kusto.data.data_format import DataFormat

        props = ClientRequestProperties()
        props.set_option(ClientRequestProperties.request_timeout_option_name, STREAMING_TIMEOUT)
        for group in chunks(lines, self.max_bytes):
            data = "\n".join(group).encode("ascii")
            compressed = gzip.compress(data, mtime=0)
            row_count = len(group)

            def submit(payload: bytes = compressed) -> None:
                with io.BytesIO(payload) as stream:
                    self.ingest_client.execute_streaming_ingest(
                        self.database, table, stream, None, DataFormat.MULTIJSON, props
                    )

            def send(d: bytes = data, n: int = row_count, call=submit) -> None:
                self.operations.call_table(table, call, rows=n, bytes_=len(d), mode="streaming")

            if self.retry:
                from .client import retrying, schema_cache_behind

                retrying(send, f"ingestion into {table}", also=schema_cache_behind)
            else:
                send()


@dataclass(frozen=True)
class _QueuedSubmission:
    source_id: str
    table: str
    markers: tuple[tuple[int, str], ...]


class QueuedIngester:
    """Submit to DM without forcing a batch flush; completion is asynchronous.

    History-row versions are retained for dependent mutations/conflict checks.
    Ordinary reads and raw OTel submissions do not wait. A pending-row budget adds
    backpressure rather than growing the receipt cache indefinitely.
    """

    def __init__(self, settings: KustoSettings, client: Any, ingest_client: Any = None) -> None:
        self.database = settings.database
        self.cluster = settings.ingestion_cluster
        self.client = client
        self.operations = OperationStats(volume=True)
        if ingest_client is None:
            from azure.kusto.ingest import QueuedIngestClient

            ingest_client = QueuedIngestClient(
                connection_string(settings, cluster=settings.ingestion_cluster), auto_correct_endpoint=False
            )
        # The queued SDK owns a separate query client for resource discovery
        # and ingestion authorization commands.
        manager = getattr(ingest_client, "_resource_manager", None)
        if manager is not None and not isinstance(manager._kusto_client, ObservedKustoClient):
            manager._kusto_client = ObservedKustoClient(manager._kusto_client, cluster=self.cluster)
        self.ingest_client = ingest_client
        self._lock = threading.Lock()
        self._pending: dict[str, _QueuedSubmission] = {}
        self._pending_rows = 0

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        markers = []
        for row in rows:
            version = datetime.fromisoformat(str(row[VERSION]).replace("Z", "+00:00"))
            if version.tzinfo is None:
                version = version.replace(tzinfo=timezone.utc)
            markers.append((int(row[ROWID]), version.astimezone(timezone.utc).isoformat()))
        offset = 0
        for group in chunks([json_line(row) for row in rows], QUEUED_MAX_BYTES):
            with self._lock:
                full = self._pending_rows + len(group) > QUEUED_PENDING_ROWS
            if full:
                self.wait_for_pending()
            source_id = self._enqueue(table, group)
            submission = _QueuedSubmission(source_id, table, tuple(markers[offset : offset + len(group)]))
            offset += len(group)
            with self._lock:
                self._pending[source_id] = submission
                self._pending_rows += len(submission.markers)

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        """Submit append-only raw OTel rows; these do not have history-row version markers."""
        for group in chunks(lines, QUEUED_MAX_BYTES):
            self._enqueue(table, group)

    def _enqueue(self, table: str, lines: list[str]) -> str:
        from azure.kusto.data.data_format import DataFormat
        from azure.kusto.ingest import IngestionProperties, ReportLevel, StreamDescriptor
        from azure.kusto.ingest.base_ingest_client import IngestionStatus

        data = "\n".join(lines).encode("ascii")
        source_id = uuid.uuid4()
        props = IngestionProperties(
            database=self.database,
            table=table,
            data_format=DataFormat.MULTIJSON,
            flush_immediately=False,
            report_level=ReportLevel.FailuresOnly,
        )
        # The SDK retries storage requests. Retrying the whole upload here could
        # duplicate a submission after an ambiguous enqueue failure.
        with io.BytesIO(data) as stream:
            def submit() -> Any:
                try:
                    result = self.ingest_client.ingest_from_stream(
                        StreamDescriptor(stream, source_id=source_id, size=len(data)), props
                    )
                except Exception as exc:  # noqa: BLE001 - log storage and SDK failures without resubmitting
                    log_failure(
                        exc,
                        cluster=self.cluster,
                        database=self.database,
                        operation="queued ingestion",
                        request=f"Queued ingestion into table {table}; source_id={source_id}; format=multijson",
                    )
                    raise
                if result is None or result.status != IngestionStatus.QUEUED:
                    error = RuntimeError(
                        f"Queued ingestion into {self.database}.{table} returned no queued acknowledgement"
                    )
                    log_failure(
                        error,
                        cluster=self.cluster,
                        database=self.database,
                        operation="queued ingestion",
                        request=f"Queued ingestion into table {table}; source_id={source_id}; SDK result={result!r}",
                    )
                    raise error
                return result

            self.operations.call_table(table, submit, rows=len(lines), bytes_=len(data), mode="queued")
        log.debug(
            "Kusto queued %d rows into %s.%s; source=%s (not yet confirmed ingested)",
            len(lines),
            self.database,
            table,
            source_id,
        )
        return str(source_id)

    def wait_for_pending(self, table: str | None = None) -> None:
        """Wait for this process's queued history rows without draining shared status queues."""
        with self._lock:
            pending = [p for p in self._pending.values() if table is None or p.table == table]
        deadline = time.monotonic() + QUEUED_VISIBILITY_TIMEOUT_S
        while pending:
            remaining = []
            for submission in pending:
                if time.monotonic() >= deadline:
                    self._timeout(pending)
                if self._visible(submission, deadline):
                    with self._lock:
                        if self._pending.pop(submission.source_id, None) is not None:
                            self._pending_rows -= len(submission.markers)
                else:
                    remaining.append(submission)
            pending = remaining
            if pending:
                delay = min(QUEUED_VISIBILITY_POLL_S, deadline - time.monotonic())
                if delay <= 0:
                    self._timeout(pending)
                time.sleep(delay)

    def _timeout(self, pending: list[_QueuedSubmission]) -> None:
        sources = ", ".join(f"{p.table}:{p.source_id}" for p in pending[:10])
        raise TimeoutError(
            f"Queued ingestion was not visible within {QUEUED_VISIBILITY_TIMEOUT_S:g} seconds "
            f"in database {self.database}; pending sources: {sources}. "
            "Inspect DM ingestion failures; use inline or streaming for tables requiring immediate visibility. "
            "These submissions remain pending and have not been resubmitted."
        )

    def _visible(self, submission: _QueuedSubmission, deadline: float) -> bool:
        from datetime import timedelta

        from azure.kusto.data import ClientRequestProperties

        from .client import QUERY_TIMEOUT

        for start in range(0, len(submission.markers), VISIBILITY_QUERY_ROWS):
            markers = submission.markers[start : start + VISIBILITY_QUERY_ROWS]
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                self._timeout([submission])
            values = ", ".join(f"{rowid}, datetime({version})" for rowid, version in markers)
            versions = [version for _, version in markers]
            kql = (
                f"datatable(rowid:long, _v:datetime)[{values}]"
                f" | join kind=leftanti ({quote(submission.table)}"
                f" | where ['_v'] between (datetime({min(versions)}) .. datetime({max(versions)}))"
                " | project rowid, _v) on rowid, _v | count"
            )
            props = ClientRequestProperties()
            props.set_option(
                ClientRequestProperties.request_timeout_option_name,
                timedelta(seconds=min(remaining, QUERY_TIMEOUT.total_seconds())),
            )
            result = Result.from_response(self.client.execute(self.database, kql, props))
            if len(result.rows) != 1 or len(result.rows[0]) != 1:
                raise RuntimeError("Queued ingestion visibility query returned an invalid result")
            if int(result.rows[0][0]) != 0:
                return False
        return True


class TableIngester:
    """Route each table to its selected ingestion backend, and to this node's physical table.

    Callers name logical tables; the ingestion mode is chosen by the logical name, and
    *tables* ({logical: physical}, see ``nodes.py``) names the table the rows go to. A
    table missing from *tables* keeps its name.
    """

    def __init__(self, settings: KustoSettings, ingesters: dict[str, RowIngester],
                 tables: Mapping[str, str] | None = None) -> None:
        self.settings = settings
        self.ingesters = ingesters
        self.tables = dict(tables or {})
        self.operations = OperationStats(volume=True)
        for ingester in ingesters.values():
            ingester.operations = self.operations

    def physical(self, table: str) -> str:
        return self.tables.get(table, table)

    def ingest(self, table: str, rows: list[dict[str, Any]]) -> None:
        self.ingesters[self.settings.ingestion_mode(table)].ingest(self.physical(table), rows)

    def ingest_lines(self, table: str, lines: list[str]) -> None:
        self.ingesters[self.settings.ingestion_mode(table)].ingest_lines(self.physical(table), lines)

    def wait_for_pending(self, table: str | None = None) -> None:
        queued = self.ingesters.get("queued")
        if isinstance(queued, QueuedIngester):
            queued.wait_for_pending(None if table is None else self.physical(table))


def ingestion_capacity(client: Any, database: str) -> int | None:
    """How many ingestions the cluster runs at a time: 1 on a development cluster, 12 on the emulator."""
    try:
        rows = client.execute_mgmt(database, ".show capacity ingestions").primary_results[0]
        return max(1, int(next(iter(rows))["Total"]))
    except Exception:  # noqa: BLE001 - not readable: inline commands go unqueued and a refusal is retried
        return None


def uses_inline(settings: KustoSettings) -> bool:
    return (
        settings.default_ingestion == "inline"
        or settings.ingestion == "auto"
        or "inline" in settings.table_ingestion.values()
    )


def make_ingester(
    settings: KustoSettings,
    client: Any,
    ingest_client: Any = None,
    *,
    inline_slots: int | None = None,
    queued_client: Any = None,
    tables: Mapping[str, str] | None = None,
) -> RowIngester:
    """Use the global default unless the table has an explicit override. *tables*: see TableIngester."""
    ingesters: dict[str, RowIngester] = {"inline": InlineIngester(client, settings.database, slots=inline_slots)}
    modes = {settings.default_ingestion, *settings.table_ingestion.values()}
    if settings.ingestion == "auto" and not settings.is_local:
        modes.add("streaming")
    if "streaming" in modes:
        ingesters["streaming"] = StreamingIngester(settings, ingest_client)
    if "queued" in modes:
        ingesters["queued"] = QueuedIngester(settings, client, queued_client)
    if settings.table_ingestion or settings.ingestion == "auto" or tables:
        return TableIngester(settings, ingesters, tables)
    return ingesters[settings.default_ingestion]
