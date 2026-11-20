"""Operational health projections."""

from ...stores import store_for
from .history import complete_rows, local_scope

_COUNT_NAMES = {
    "system_snapshots": "metrics", "process_snapshots": "tool_metrics", "files": "file_store",
    "path_defs": "path_specs", "process_defs": "process_specs", "metrics": "samples",
}


def logical_stats(reader):
    rows = complete_rows(reader.read("health.totals", {**local_scope(), "limit": 100}))
    stats = {"file_size_bytes": None}
    for row in rows:
        table = row["table"]
        stats[f"{_COUNT_NAMES.get(table, table)}_count"] = row["rows"]
        if table == "system_snapshots":
            stats.update(earliest_ts=row["earliest_ts"], latest_ts=row["latest_ts"])
        elif table == "files":
            stats.update(files_tracked=row["rows"], files_total_bytes=row["files_total_bytes"],
                         files_total_tokens=row["files_total_tokens"])
    return stats


def store_health(store):
    from ..projection_utils import mask_secrets

    health = {"reader": None, "writer": None, **store_for(store).health()}
    if "status" not in health:
        health["status"] = (health["writer"] or health["reader"])["status"]
    reader = health.get("reader")
    if reader is not None and "query_cpu" in reader:
        health["reader"] = reader = dict(reader)
        health["query_cpu"] = reader.pop("query_cpu")
    if reader and reader.get("last_error"):
        reader["last_error"] = mask_secrets(str(reader["last_error"]))
    writer = health.get("writer")
    if writer:
        if writer.get("warning"):
            writer["warning"] = mask_secrets(str(writer["warning"]))
        for table in writer.get("tables", {}).values():
            if table.get("last_error"):
                table["last_error"] = mask_secrets(str(table["last_error"]))
    return health
