"""Settings for the aictl Kusto (Azure Data Explorer) store.

The store plugin in ``aictl.stores.kusto`` writes history to one Kusto database.
Without a configured destination, the daemon serves live runtime data without history.

Configure it in ``config.toml``::

    [storage]
    kusto_cluster = "https://mycluster.westus.kusto.windows.net"
    kusto_database = "aictl"
    kusto_ingestion = "auto"

    [storage.kusto_table_ingestion]
    events = "streaming"

or with ``aictl daemon serve --kusto-cluster URL [--kusto-database NAME]``, or the
environment variables ``AICTL_KUSTO_CLUSTER`` and ``AICTL_KUSTO_DATABASE``.
``--kusto-ingestion`` selects the default mode; repeat ``--kusto-table-ingestion
TABLE=MODE`` for overrides. Their environment equivalents are
``AICTL_KUSTO_INGESTION`` and ``AICTL_KUSTO_TABLE_INGESTION``.
"""

from __future__ import annotations

import os
import re
import socket
from collections.abc import Mapping
from dataclasses import dataclass, field
from types import MappingProxyType
from urllib.parse import urlsplit

CLUSTER_ENV = "AICTL_KUSTO_CLUSTER"
DATABASE_ENV = "AICTL_KUSTO_DATABASE"
AUTH_ENV = "AICTL_KUSTO_AUTH"
INGESTION_ENV = "AICTL_KUSTO_INGESTION"
TABLE_INGESTION_ENV = "AICTL_KUSTO_TABLE_INGESTION"
NODE_ENV = "AICTL_NODE_ID"
DEFAULT_DATABASE = "aictl"

# How the client signs in. "auto": no authentication for a local emulator
# (http://localhost...), the Azure CLI's login otherwise.
AUTH_MODES = ("auto", "azcli", "device", "managed-identity", "none")
INGESTION_MODES = ("queued", "streaming", "inline")

AUTO_STREAMING_TABLES = frozenset(
    {"events", "metrics", "system_snapshots", "process_snapshots", "tool_stats", "hook_calls",
     "OTELLogs", "OTELMetrics", "OTELTraces", "OTELPayloads"}
)

AUTO_STREAMING_STATE_TABLES = frozenset({"session_steps", "session_step_text", "turn_request_links"})

# These tables hold state, unique-key upserts, or bootstrap data used immediately.
AUTO_INLINE_TABLES = frozenset(
    {
        "schema_version",
        "tools",
        "projects",
        "processes",
        "sessions",
        "session_processes",
        "session_commits",
        "agents",
        "requests",
        "context_events",
        "tool_invocations",
        "session_prompts",
        "skill_uses",
        "file_blobs",
        "files",
        "file_write_events",
        "session_folders",
        "session_artifacts",
        "session_loaded_files",
        "session_context_items",
        "maintenance_state",
        "data_quality_status",
        "path_defs",
        "process_defs",
        "memory_snapshots",
        "datapoint_catalog",
        "cursor_session_messages",
        "copilot_session_messages",
        "session_usage",
        "vscode_chat_messages",
    }
)


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
    endpoint. Queries, management commands, inline ingestion and streaming use the
    engine URL. Queued ingestion uses :attr:`KustoSettings.ingestion_cluster` instead.
    """
    scheme, sep, rest = cluster.partition("://")
    host, slash, path = rest.partition("/")
    if host.lower().startswith("ingest-"):
        host = host[len("ingest-"):]
    return scheme + sep + host + slash + path


def local_node_id() -> str:
    return os.environ.get(NODE_ENV, socket.gethostname())


def normalize_node_id(value: str) -> str:
    name = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9._:-]{0,254}", name) or name == "legacy":
        raise ValueError(f"{NODE_ENV} must be a nonempty hostname or stable node ID (not 'legacy')")
    return name


@dataclass(frozen=True)
class KustoSettings:
    cluster: str
    database: str = DEFAULT_DATABASE
    auth: str = "auto"
    # Compatibility with callers that selected the old two-mode constructor.
    streaming: bool | None = None
    table_ingestion: Mapping[str, str] = field(default_factory=dict, hash=False)
    ingestion: str = "auto"
    node_id: str = ""
    node_id_source: str = field(default="", compare=False, repr=False)

    def __post_init__(self) -> None:
        source = self.node_id_source or ("explicit" if self.node_id else NODE_ENV if NODE_ENV in os.environ else "hostname")
        object.__setattr__(self, "node_id", normalize_node_id(self.node_id or local_node_id()))
        object.__setattr__(self, "node_id_source", source)
        mode = validate_ingestion_mode(self.ingestion, allow_auto=True)
        if self.streaming is not None:
            legacy = "streaming" if self.streaming else "inline"
            if mode not in ("auto", legacy):
                raise ValueError("Specify ingestion or streaming, not conflicting values for both")
            mode = legacy
        modes = validate_table_ingestion(self.table_ingestion)
        object.__setattr__(self, "cluster", engine_url(self.cluster))
        if self.is_local and (mode not in ("auto", "inline") or any(m != "inline" for m in modes.values())):
            raise ValueError("The Kusto emulator supports inline ingestion only, not queued or streaming")
        object.__setattr__(self, "ingestion", mode)
        object.__setattr__(self, "table_ingestion", MappingProxyType(modes))

    def ingestion_mode(self, table: str) -> str:
        if table in self.table_ingestion:
            return self.table_ingestion[table]
        if self.ingestion == "auto" and not self.is_local and (
            table in AUTO_STREAMING_TABLES or table in AUTO_STREAMING_STATE_TABLES or table.endswith("_observations")
        ):
            return "streaming"
        if self.ingestion == "auto" and table in AUTO_INLINE_TABLES:
            return "inline"
        return self.default_ingestion

    @property
    def default_ingestion(self) -> str:
        if self.ingestion == "auto":
            return "inline" if self.is_local else "queued"
        return self.ingestion

    @property
    def ingestion_cluster(self) -> str:
        """The DM endpoint, distinct from the engine endpoint used for reads."""
        from azure.kusto.ingest.base_ingest_client import BaseIngestClient

        return BaseIngestClient.get_ingestion_endpoint(self.cluster)

    @property
    def is_local(self) -> bool:
        host = (urlsplit(self.cluster).hostname or "").lower()
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
        return cls(
            cluster=cluster,
            database=(database or "").strip() or DEFAULT_DATABASE,
            auth=auth,
            ingestion=ingestion,
            table_ingestion=table_ingestion if table_ingestion is not None else {},
        )


def kusto_settings() -> KustoSettings | None:
    """Return the destination from the environment or config file, or None if unset."""
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
