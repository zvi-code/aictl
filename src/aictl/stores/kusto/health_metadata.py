"""Bounded management reads using the existing Kusto client."""

import json
import re
from datetime import datetime, timedelta, timezone

from .client import KustoClientFactory, Result, quote

_TIMESPAN = re.compile(r"(?:(\d+)\.)?(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)")


def _retention_days(raw):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return None
    duration = raw.get("SoftDeletePeriod") if isinstance(raw, dict) else None
    parts = _TIMESPAN.fullmatch(duration) if isinstance(duration, str) else None
    if not parts:
        return None
    days, hours, minutes, seconds = parts.groups()
    return int(days or 0) + (3600 * int(hours) + 60 * int(minutes) + float(seconds)) / 86400


class HealthMetadata:
    def __init__(self, client, database):
        self.client = client
        self.database = database

    @classmethod
    def initialized(cls, settings):
        client, _ = KustoClientFactory.health_objects(settings)
        return cls(client, settings.database) if client is not None else None

    def _read(self, command, timeout=5):
        from azure.kusto.data import ClientRequestProperties

        props = ClientRequestProperties()
        props.set_option(ClientRequestProperties.request_timeout_option_name, timedelta(seconds=timeout))
        return Result.from_response(self.client.execute_mgmt(self.database, command, props))

    def table_inventory(self, limit):
        details = self._read(
            ".show tables details | project TableName, TotalRowCount, TotalExtents, TotalExtentSize, "
            f"TotalOriginalSize, HotExtentSize, RetentionPolicy | top {limit + 1} by TableName asc"
        )
        if "TableName" not in details.names:
            raise ValueError("TableName missing from ADX table metadata")
        return [row | {"retention_days": _retention_days(row.get("RetentionPolicy"))}
                for row in details.dicts()]

    def ingestion_capacity(self):
        rows = self._read(".show capacity ingestions").dicts()
        return next((row for row in rows if str(row.get("Resource")).lower() == "ingestions"), {})

    def database_policy(self, kind):
        policy = {"batching": "ingestionbatching", "streaming": "streamingingestion"}[kind]
        rows = self._read(f".show database {quote(self.database)} policy {policy}").dicts()
        raw = rows[0].get("Policy") if rows else None
        return json.loads(raw) if isinstance(raw, str) else raw

    def diagnostics(self):
        rows = self._read(
            ".show diagnostics | project nodes=MachinesTotal, offline_nodes=MachinesOffline,"
            " ingestions=IngestionsInProgress, merges=MergesInProgress, ['seals']=RowStoreSealsInProgress,"
            " hot_extent_bytes=TotalHotExtentSize, extent_bytes=TotalExtentSize | take 1"
        ).dicts()
        if not rows or rows[0].get("nodes") is None:
            raise ValueError("No cluster diagnostic sample")
        return rows[0]

    def backend_usage(self, since: float, until: float, step: float, view_limit: int = 15):
        """Work the cluster recorded for this database, by kind and by aictl view, in time buckets."""
        if not re.fullmatch(r"[\w.-]{1,260}", self.database):
            raise ValueError("Unsupported database name")
        start = datetime.fromtimestamp(since, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        end = datetime.fromtimestamp(until, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        base = (
            f".show commands-and-queries | where Database == '{self.database}'"
            f" and StartedOn >= datetime({start}) and StartedOn < datetime({end})"
            " | extend aictl = Application == 'aictl' or ClientActivityId startswith 'aictl.'"
            " | extend work = case(CommandType in ('Query', 'AdminThenQuery') and aictl, 'aictl_queries',"
            " CommandType in ('Query', 'AdminThenQuery'), 'other_queries',"
            " CommandType has 'Ingest' or CommandType startswith 'Table', 'ingestion', 'maintenance')"
        )
        series = self._read(
            base + f" | summarize commands = count(), failed = countif(State !in ('Completed', 'InProgress')),"
            " cpu_s = sum(TotalCpu) / 1s, memory_peak = max(MemoryPeak)"
            f" by t = bin_at(StartedOn, {int(step)}s, datetime({start})), work"
            " | extend t = datetime_diff('second', t, datetime(1970-01-01)) | order by t asc, work asc",
            timeout=30,
        ).dicts()
        views = self._read(
            base + " | where work == 'aictl_queries' | extend view = tostring(split(ClientActivityId, ';')[0])"
            " | summarize commands = count(), failed = countif(State !in ('Completed', 'InProgress')),"
            " cpu_s = sum(TotalCpu) / 1s, mean_ms = avg(Duration) / 1ms, max_ms = max(Duration) / 1ms,"
            f" memory_peak = max(MemoryPeak) by view | top {int(view_limit)} by cpu_s desc",
            timeout=30,
        ).dicts()
        return series, views
