"""Bounded management reads using the existing Kusto client."""

import json
from datetime import timedelta

from .client import KustoClientFactory, Result, quote


class HealthMetadata:
    def __init__(self, client, database):
        self.client = client
        self.database = database

    @classmethod
    def initialized(cls, settings):
        client, _ = KustoClientFactory.health_objects(settings)
        return cls(client, settings.database) if client is not None else None

    def _read(self, command):
        from azure.kusto.data import ClientRequestProperties

        props = ClientRequestProperties()
        props.set_option(ClientRequestProperties.request_timeout_option_name, timedelta(seconds=5))
        return Result.from_response(self.client.execute_mgmt(self.database, command, props))

    def table_inventory(self, limit):
        details = self._read(
            ".show tables details | project TableName, TotalRowCount, TotalExtents, TotalExtentSize, "
            f"TotalOriginalSize, HotExtentSize | top {limit + 1} by TableName asc"
        )
        if "TableName" not in details.names:
            raise ValueError("TableName missing from ADX table metadata")
        return details.dicts()

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
