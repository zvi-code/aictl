"""One set of tables per node, and one stored function per logical table that reads them all.

Naming
------
Each node writes to its own physical tables. The physical name of logical table ``T`` for
node ``N`` is ``T__<key>``, where ``<key>`` is :func:`node_key` of ``N``: the node ID with
every character outside ``[a-z0-9]`` written as ``_`` (runs collapsed, at most 32
characters), then ``_`` and the first 8 hex digits of the SHA-256 of the full node ID.
The key is stable, holds ``[a-z0-9_]`` only, never contains ``__`` (so the last ``__`` of a
physical name separates the logical name), and two node IDs that read the same after the
character replacement still get different keys. Rows without a node ID (written before
aictl recorded one) belong to the node key ``unattributed``. The longest physical name is
well under Kusto's 1024-character limit for entity names.

Each node table is in the Kusto folder ``aictl/nodes/<key>``, and its docstring is JSON
with the real node ID and the logical name, so ``.show tables`` maps names back without
parsing them.

Two tables are shared by all nodes, not per node: ``schema_version`` (the registry: layout
and migration rows of every node, and the database record) and the layout marker table
``aictl_current_store_v1``.

Reading
-------
A stored function named exactly like each logical table (folder ``aictl``) unions the
tables of every node whose recorded layout this aictl can read. Queries, views and
hand-written KQL name the logical table (``requests | where ...``) and read all nodes; a
function takes precedence over a table of the same name, and ``table('T')`` still reaches
a physical table named ``T``. Each function starts with an empty ``datatable`` of the
logical schema, so it exists before any node has rows and every logical column exists even
when no node table has it yet. ``node_id`` stays a column, so ``T | where node_id == "x"``
reads one node.

An external OpenTelemetry Collector writes ``OTELLogs``, ``OTELMetrics`` and ``OTELTraces``
(physical tables named like the logical ones). Ingestion addresses tables, so the collector
keeps writing them; when such a table exists its rows are a leg of the function
(``table('OTELLogs')``), and the migration leaves these tables where they are.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field

from ...kusto.observations import CURRENT_STORE
from .client import quote

SEPARATOR = "__"
UNATTRIBUTED = "unattributed"
LAYOUT_TABLE = "schema_version"
SHARED_TABLES = frozenset({LAYOUT_TABLE, CURRENT_STORE})
FUNCTION_FOLDER = "aictl"
LEGACY_FOLDER = "aictl/legacy"
LEGACY_PREFIX = "legacy" + SEPARATOR
COLLECTOR_TABLES = frozenset({"OTELLogs", "OTELMetrics", "OTELTraces"})
_KEY_PART = 32


def node_key(node_id: str) -> str:
    """The table-name key of *node_id*; ``unattributed`` for rows without one."""
    if not node_id:
        return UNATTRIBUTED
    readable = re.sub(r"_+", "_", re.sub(r"[^a-z0-9]", "_", node_id.lower())).strip("_")[:_KEY_PART].strip("_")
    digest = hashlib.sha256(node_id.encode("utf-8")).hexdigest()[:8]
    return f"{readable or 'node'}_{digest}"


def physical(logical: str, key: str) -> str:
    return f"{logical}{SEPARATOR}{key}"


def folder(key: str) -> str:
    return f"aictl/nodes/{key}"


def table_docstring(node_id: str, key: str, logical: str) -> str:
    return json.dumps({"aictl": "node table", "node_id": node_id, "node_key": key, "table": logical},
                      separators=(",", ":"))


def node_docstring(node_id: str, key: str) -> str:
    """The docstring ``.create-merge tables`` gives a node's new tables before each gets its own."""
    return json.dumps({"aictl": "node table", "node_id": node_id, "node_key": key}, separators=(",", ":"))


def node_tables(node_id: str, logical: Iterable[str]) -> dict[str, str]:
    """{logical name: physical name} of *node_id*; the shared tables keep their names."""
    key = node_key(node_id)
    return {name: name if name in SHARED_TABLES else physical(name, key) for name in logical}


@dataclass(frozen=True)
class NodeTable:
    name: str
    logical: str
    key: str
    node_id: str | None  # None: not recorded in the docstring


def parse(name: str, docstring: object, logical_names: Iterable[str]) -> NodeTable | None:
    """The node table *name* is, from its docstring, else from its name; None for any other table."""
    info: dict = {}
    if isinstance(docstring, str) and docstring.startswith("{"):
        try:
            info = json.loads(docstring)
        except ValueError:
            info = {}
    if isinstance(info, dict) and info.get("aictl") == "node table" and info.get("node_key"):
        key = str(info["node_key"])
        logical = str(info.get("table") or name.removesuffix(SEPARATOR + key))
        if name == physical(logical, key):
            return NodeTable(name, logical, key, str(info["node_id"]) if "node_id" in info else None)
    if SEPARATOR not in name:
        return None
    logical, key = name.rsplit(SEPARATOR, 1)
    if logical not in set(logical_names) or not re.fullmatch(r"[a-z0-9_]+", key) or SEPARATOR in key:
        return None
    return NodeTable(name, logical, key, None)


def legacy_name(logical: str) -> str:
    return LEGACY_PREFIX + logical


@dataclass
class Node:
    """One node as the database knows it: its tables, its recorded layout, its traffic."""

    key: str
    node_id: str | None = None
    tables: dict[str, str] = field(default_factory=dict)  # logical -> physical
    stored: object = None  # layout.StoredLayout | None
    rows: int = 0
    extents: int = 0
    size: int = 0
    last_ingestion: object = None
    included: bool = False
    reason: str = ""

    def as_dict(self) -> dict:
        from datetime import datetime

        stored = self.stored
        last = self.last_ingestion
        return {
            "node_id": self.node_id, "node_key": self.key, "tables": len(self.tables), "rows": self.rows,
            "extents": self.extents, "size_bytes": self.size,
            "last_ingestion": last.isoformat() if isinstance(last, datetime) else last,
            "version": getattr(stored, "version", None), "compatible_since": getattr(stored, "compatible_since", None),
            "data_epoch": getattr(stored, "data_epoch", None) or None, "included": self.included,
            "reason": self.reason,
        }


def readable(stored, latest: int, compatible_since: int) -> tuple[bool, str]:
    """Whether a node whose recorded layout is *stored* can be read by this layout, and why not."""
    if stored is None:
        return False, "no layout recorded for this node"
    if stored.compatible_since > latest:
        return False, f"newer layout {stored.version} (readable from layout {stored.compatible_since}); upgrade aictl"
    if stored.version < compatible_since:
        return False, f"older layout {stored.version}; this aictl reads layouts {compatible_since} to {latest}"
    return True, ""


def function_body(columns: Iterable[tuple[str, str]], legs: Iterable[str], collector: str | None = None) -> str:
    """``union`` of the empty logical schema, the node tables and the collector's table."""
    schema = ", ".join(f"{quote(column)}:{kind}" for column, kind in columns)
    parts = [f"(datatable({schema})[])", *(quote(leg) for leg in legs)]
    if collector:
        parts.append(f"(table({json.dumps(collector)}))")
    return "{ union " + ", ".join(parts) + " }"


def function_docstring(logical: str, keys: list[str], collector: bool) -> str:
    text = f"aictl logical table {logical}: the union of {len(keys)} node table(s)"
    if collector:
        text += " and the collector's table"
    return text + ". See docs/storage-schema.md."


def function_command(logical: str, body: str, docstring: str) -> str:
    return (f".create-or-alter function with (folder = {json.dumps(FUNCTION_FOLDER)}, docstring = "
            f"{json.dumps(docstring)}) {quote(logical)}() {body}")


def normalized_body(body: object) -> str:
    return re.sub(r"\s+", " ", str(body or "")).strip()


def registry_function_command() -> str:
    """``aictl_nodes()``: the registry's layout rows as one row per node, for KQL written by hand."""
    body = (
        "{ table('schema_version') | where kind == 'layout' and isempty(step)"
        " | summarize arg_max(written_at, version, compatible_since, data_epoch, aictl_version) by node_id }"
    )
    return (f".create-or-alter function with (folder = {json.dumps(FUNCTION_FOLDER)}, docstring = "
            f"{json.dumps('aictl: the latest layout row of each node in the schema_version registry')}) "
            f"aictl_nodes() {body}")


def table_counts(details: Mapping[str, Mapping]) -> dict[str, int | None]:
    return {name: None if row.get("TotalRowCount") is None else int(row["TotalRowCount"])
            for name, row in details.items()}


def utc_text(value: object) -> str:
    """A time as ``2026-11-22 21:14:03 UTC``; "unknown" when the cluster reports none or the empty time (year 1)."""
    from datetime import datetime, timezone

    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return "unknown"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            value = datetime.fromtimestamp(value, timezone.utc)
        except (OverflowError, OSError, ValueError):
            return "unknown"
    if not isinstance(value, datetime) or value.year <= 1:
        return "unknown"
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
