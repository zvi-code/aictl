"""Compatibility payloads for the catalog and chart readers."""

import re

from .history import _json_object, complete_rows, local_scope

SYSTEM_COLUMNS = (
    "ts", "files", "tokens", "cpu", "mem_mb", "mcp", "mem_tokens", "memory_entries",
    "live_sessions", "live_tokens", "live_in_rate", "live_out_rate",
)


def _params(params):
    return local_scope() | {"limit": 20_000} | {key: value for key, value in params.items() if value is not None}


def _columns(rows, fields):
    return {key: [row[key] for row in rows] for key in fields}


def system_history(reader, **params):
    rows = complete_rows(reader.read("history.system", _params(params)))
    return _columns(rows, SYSTEM_COLUMNS)


def tool_history(reader, **params):
    rows = complete_rows(reader.read("history.tools", _params(params)))
    groups = {}
    for row in rows:
        groups.setdefault(row["tool"], []).append(row)
    return {
        tool: _columns(samples, ("ts", "cpu", "mem_mb")) | {
            "tokens": [0] * len(samples), "traffic": [0] * len(samples),
        }
        for tool, samples in groups.items()
    }


def catalog_entries(reader, *, tab=None, key=None, source_type=None):
    rows = complete_rows(reader.read("catalog.entries", _params({
        "requested_tab": tab, "requested_key": key, "requested_source_type": source_type,
    })))
    return [row | {"dynamic_source": bool(row["dynamic_source"]),
                   "source_dynamic": _json_object(row["source_dynamic"])} for row in rows]


def sample_page(reader, *, tags, **params):
    for key in tags:
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", key):
            raise ValueError(f"Invalid tag key: {key!r}")
    rows = reader.read("samples.page", _params(params | {"tag_filter": sorted(tags.items())})).rows
    return [row | {"tags": _json_object(row["tags"])} for row in rows]


def sample_series(reader, **params):
    rows = complete_rows(reader.read("samples.page", _params(params | {"ascending": True})))
    return _columns(rows, ("ts", "value"))


def sample_metrics(reader, **params):
    return complete_rows(reader.read("samples.metrics", _params(params)))
