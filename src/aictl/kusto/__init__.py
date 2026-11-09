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

or with ``aictl daemon serve --kusto-cluster URL [--kusto-database NAME]``, or the
environment variables ``AICTL_KUSTO_CLUSTER`` and ``AICTL_KUSTO_DATABASE``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

CLUSTER_ENV = "AICTL_KUSTO_CLUSTER"
DATABASE_ENV = "AICTL_KUSTO_DATABASE"
AUTH_ENV = "AICTL_KUSTO_AUTH"
DEFAULT_DATABASE = "aictl"

# How the client signs in. "auto": no authentication for a local emulator
# (http://localhost...), the Azure CLI's login otherwise.
AUTH_MODES = ("auto", "azcli", "device", "managed-identity", "none")


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
    # Inserts go through streaming ingestion (the row is readable when the call
    # returns). The emulator has no streaming endpoint: ``.ingest inline`` instead.
    streaming: bool = True

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
    def from_env(cls) -> KustoSettings | None:
        cluster = os.environ.get(CLUSTER_ENV, "").strip()
        if not cluster:
            return None
        return cls.from_values(cluster, os.environ.get(DATABASE_ENV, ""), os.environ.get(AUTH_ENV, ""))

    @classmethod
    def from_values(cls, cluster: str, database: str = "", auth: str = "") -> KustoSettings | None:
        cluster = (cluster or "").strip().rstrip("/")
        if not cluster:
            return None
        if "://" not in cluster:
            cluster = "https://" + cluster
        cluster = engine_url(cluster)
        auth = (auth or "auto").strip().lower() or "auto"
        if auth not in AUTH_MODES:
            raise ValueError(f"{AUTH_ENV} must be one of {', '.join(AUTH_MODES)}, not {auth!r}")
        settings = cls(cluster=cluster, database=(database or "").strip() or DEFAULT_DATABASE, auth=auth)
        # The emulator (a local container) has no streaming ingestion endpoint.
        return settings if not settings.is_local else cls(settings.cluster, settings.database, auth, streaming=False)


def kusto_settings() -> KustoSettings | None:
    """The configured cluster: the environment first, then ``config.toml``; None when SQLite is the store."""
    settings = KustoSettings.from_env()
    if settings is not None:
        return settings
    try:
        from ..platforms import load_config

        cfg = load_config()
    except Exception:  # noqa: BLE001 - no config means no cluster
        return None
    return KustoSettings.from_values(
        getattr(cfg, "kusto_cluster", ""), getattr(cfg, "kusto_database", ""), getattr(cfg, "kusto_auth", "")
    )
