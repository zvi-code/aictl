"""A Kusto (Azure Data Explorer) cluster as the store behind aictl.

With a cluster configured, every table of the history lives in one Kusto database
and the daemon serves from it alone: no SQLite file is opened for the store. The
code keeps issuing its SQLite statements; ``translate`` turns each into KQL or into
rows to ingest, and ``connection`` runs them (see ``statements`` for the contract
and ``schema`` for the tables).

Configure it in ``config.toml``::

    [storage]
    kusto_cluster = "https://mycluster.westus.kusto.windows.net"
    kusto_database = "aictl"
    kusto_ingestion = "auto"

    [storage.kusto_table_ingestion]
    path_defs = "inline"

or with ``aictl daemon serve --kusto-cluster URL [--kusto-database NAME]``, or the
environment variables ``AICTL_KUSTO_CLUSTER`` and ``AICTL_KUSTO_DATABASE``.
``--kusto-ingestion`` selects the default mode; repeat ``--kusto-table-ingestion
TABLE=MODE`` for overrides. Their environment equivalents are
``AICTL_KUSTO_INGESTION`` and ``AICTL_KUSTO_TABLE_INGESTION``.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass, field, replace
from types import MappingProxyType

CLUSTER_ENV = "AICTL_KUSTO_CLUSTER"
DATABASE_ENV = "AICTL_KUSTO_DATABASE"
AUTH_ENV = "AICTL_KUSTO_AUTH"
INGESTION_ENV = "AICTL_KUSTO_INGESTION"
TABLE_INGESTION_ENV = "AICTL_KUSTO_TABLE_INGESTION"
DEFAULT_DATABASE = "aictl"

# How the client signs in. "auto": no authentication for a local emulator
# (http://localhost...), the Azure CLI's login otherwise.
AUTH_MODES = ("auto", "azcli", "device", "managed-identity", "none")
INGESTION_MODES = ("streaming", "inline")


def validate_ingestion_mode(value: object, *, allow_auto: bool = False) -> str:
    modes = ("auto", *INGESTION_MODES) if allow_auto else INGESTION_MODES
    mode = value.strip().lower() if isinstance(value, str) else ""
    if mode not in modes:
        raise ValueError(f"Kusto ingestion mode must be one of {', '.join(modes)}, not {value!r}")
    return mode


def validate_table_ingestion(value: object) -> dict[str, str]:
    if not isinstance(value, Mapping):
        raise ValueError("Kusto table ingestion overrides must be a table-to-mode mapping")
    result: dict[str, str] = {}
    for table, mode in value.items():
        if not isinstance(table, str) or not table.strip():
            raise ValueError("Kusto ingestion overrides require a nonempty table name")
        try:
            result[table.strip()] = validate_ingestion_mode(mode)
        except ValueError as exc:
            raise ValueError(f"Table {table!r}: {exc}") from exc
    return result


def parse_table_ingestion(value: str) -> dict[str, str]:
    """Parse comma-separated TABLE=MODE overrides; the last entry for a table wins."""
    if not value.strip():
        return {}
    result: dict[str, str] = {}
    for item in value.split(","):
        table, sep, mode = item.partition("=")
        if not sep or not table.strip():
            raise ValueError(f"Kusto table ingestion requires TABLE=MODE, not {item!r}")
        result.update(validate_table_ingestion({table: mode}))
    return result


def engine_url(cluster: str) -> str:
    """The engine (query) URL for *cluster*, given either of a cluster's two URLs.

    ``https://ingest-<name>.<region>.kusto.windows.net`` is the Data Management
    endpoint: it takes queued ingestion only, and answers a management command with
    a syntax error. aictl queries, creates tables and streams rows through the
    engine, ``https://<name>.<region>.kusto.windows.net``, so the ``ingest-`` prefix
    is dropped.
    """
    scheme, sep, rest = cluster.partition("://")
    host, slash, path = rest.partition("/")
    if host.lower().startswith("ingest-"):
        host = host[len("ingest-"):]
    return scheme + sep + host + slash + path


@dataclass(frozen=True)
class KustoSettings:
    cluster: str
    database: str = DEFAULT_DATABASE
    auth: str = "auto"
    # Both modes are synchronous: reads after a flush must see the ingested rows.
    streaming: bool = True
    table_ingestion: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        modes = validate_table_ingestion(self.table_ingestion)
        if self.is_local and "streaming" in modes.values():
            raise ValueError("The Kusto emulator does not support streaming ingestion")
        object.__setattr__(self, "table_ingestion", MappingProxyType(modes))

    def ingestion_mode(self, table: str) -> str:
        return self.table_ingestion.get(table, "streaming" if self.streaming else "inline")

    @property
    def is_local(self) -> bool:
        host = self.cluster.split("://", 1)[-1].split("/", 1)[0].split(":", 1)[0].lower()
        return host in ("localhost", "127.0.0.1", "::1", "host.docker.internal")

    @property
    def auth_mode(self) -> str:
        if self.auth != "auto":
            return self.auth
        return "none" if self.is_local else "azcli"

    @property
    def uri(self) -> str:
        """``kusto://host/database``: the store's name where a file path was shown."""
        host = self.cluster.split("://", 1)[-1].rstrip("/")
        return f"kusto://{host}/{self.database}"

    @classmethod
    def from_env(
        cls, *, ingestion: str = "auto", table_ingestion: Mapping[str, str] | None = None
    ) -> KustoSettings | None:
        cluster = os.environ.get(CLUSTER_ENV, "").strip()
        if not cluster:
            return None
        overrides = dict(table_ingestion or {})
        overrides.update(parse_table_ingestion(os.environ.get(TABLE_INGESTION_ENV, "")))
        return cls.from_values(
            cluster,
            os.environ.get(DATABASE_ENV, ""),
            os.environ.get(AUTH_ENV, ""),
            ingestion=os.environ.get(INGESTION_ENV, ingestion),
            table_ingestion=overrides,
        )

    @classmethod
    def from_values(
        cls,
        cluster: str,
        database: str = "",
        auth: str = "",
        *,
        ingestion: str = "auto",
        table_ingestion: Mapping[str, str] | None = None,
    ) -> KustoSettings | None:
        cluster = (cluster or "").strip().rstrip("/")
        if not cluster:
            return None
        if "://" not in cluster:
            cluster = "https://" + cluster
        cluster = engine_url(cluster)
        auth = (auth or "auto").strip().lower() or "auto"
        if auth not in AUTH_MODES:
            raise ValueError(f"{AUTH_ENV} must be one of {', '.join(AUTH_MODES)}, not {auth!r}")
        mode = validate_ingestion_mode(ingestion, allow_auto=True)
        settings = cls(
            cluster=cluster,
            database=(database or "").strip() or DEFAULT_DATABASE,
            auth=auth,
            streaming=mode != "inline",
            table_ingestion=table_ingestion if table_ingestion is not None else {},
        )
        if settings.is_local:
            if mode == "streaming":
                raise ValueError("The Kusto emulator does not support streaming ingestion")
            return replace(settings, streaming=False)
        return settings


def kusto_settings() -> KustoSettings | None:
    """The configured cluster: the environment first, then ``config.toml``; None when SQLite is the store."""
    from ..platforms import load_config

    cfg = load_config()
    settings = KustoSettings.from_env(ingestion=cfg.kusto_ingestion, table_ingestion=cfg.kusto_table_ingestion)
    if settings is not None:
        return settings
    return KustoSettings.from_values(
        cfg.kusto_cluster,
        cfg.kusto_database,
        cfg.kusto_auth,
        ingestion=cfg.kusto_ingestion,
        table_ingestion=cfg.kusto_table_ingestion,
    )
