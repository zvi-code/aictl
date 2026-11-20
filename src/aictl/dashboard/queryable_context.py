"""Adapt queryable history records to the existing context-budget calculations."""

from __future__ import annotations

import fnmatch
import json
import re
from collections import defaultdict
from functools import lru_cache
from types import SimpleNamespace
from typing import Any

from ..tools import TOOL_LABELS, ResourceFile, ToolResources, get_registry

_POLICY_FIELDS = ("sent_to_llm", "loaded_when", "cacheable", "survives_compaction")
_PLACEHOLDER = re.compile(r"%[^%]+%|\$\{[^}]+\}|\{[^}]+\}|\$[A-Z_]+|^~")


@lru_cache(maxsize=2)
def _policy_index(all_platforms: bool) -> dict:
    if all_platforms:
        from ..tools import _data_path, _load_path_csv

        specs = [s for os in ("windows", "unix") for s in _load_path_csv(_data_path(f"paths-{os}.csv"))]
    else:
        specs = get_registry().path_specs()
    index = defaultdict(list)
    for spec in specs:
        pattern = _PLACEHOLDER.sub("*", spec.path_template).replace("\\", "/").lower()
        index[spec.ai_tool, spec.category].append((re.compile(fnmatch.translate(pattern)), spec))
    return index


INVENTORY_COLUMNS = ("path", "tool", "category", "scope", "size_bytes", "tokens", "lines", "mtime", "meta")
TELEMETRY_COLUMNS = ("ts", "tool", "source", "confidence", "input_tokens", "output_tokens", "cache_read_tokens",
                     "cache_creation_tokens", "total_sessions", "total_messages", "cost_usd", "model", "by_model", "by_project")


def inventory_rows(rows):
    return [tuple(row[k] for k in INVENTORY_COLUMNS) for row in rows]


def telemetry_rows(rows):
    def breakdown(value):
        try:
            data = json.loads(value) if isinstance(value, str) else value
        except ValueError:
            return {}
        return data if isinstance(data, dict) else {}

    return [
        {k: breakdown(row[k]) if k in ("by_model", "by_project") else row[k] for k in TELEMETRY_COLUMNS}
        for row in rows
    ]


def inventory_snapshot(rows, telemetry, current=None, *, reported=False) -> Any:
    tools: dict[str, ToolResources] = {}
    memory = []
    index = _policy_index(reported)
    for path, tool, category, scope, size, tokens, lines, mtime, raw_meta in rows:
        try:
            meta = json.loads(raw_meta or "{}")
        except (ValueError, TypeError):
            meta = {}
        if not isinstance(meta, dict):
            meta = {}
        normalized = path.replace("\\", "/").lower()
        candidates = [
            s for pattern, s in index[tool, category] if (not scope or s.scope == scope) and pattern.match(normalized)
        ]
        policies = {}
        for field in _POLICY_FIELDS:
            values = {getattr(spec, field) for spec in candidates}
            policies[field] = meta.get(field) or (next(iter(values)) if len(values) == 1 else "")
        policies["sent_to_llm"] = policies["sent_to_llm"] or "unknown"
        resource = ResourceFile(
            path=path,
            tool=tool,
            kind=category,
            scope=scope,
            size=size or 0,
            tokens=tokens or 0,
            mtime=mtime or 0,
            **policies,
        )
        tools.setdefault(tool, ToolResources(tool, TOOL_LABELS.get(tool, tool))).files.append(resource)
        if "memory" in category or "instruction" in category:
            memory.append(
                {
                    "file": path,
                    "source": category,
                    "tool": tool,
                    "tokens": tokens or 0,
                    "lines": lines or 0,
                    "mtime": mtime or 0,
                }
            )
    # Configuration is explicitly current/configured, never evidence of a running agent's model.
    return SimpleNamespace(
        root=getattr(current, "root", ""),
        tools=list(tools.values()),
        tool_configs=getattr(current, "tool_configs", []) or [],
        tool_telemetry=telemetry,
        agent_memory=memory,
    )


def context_snapshot(db: Any, current: Any, *, history=None) -> Any:
    """No discovery, stat, transcript, or local telemetry read supplies inventory."""
    from .projections.history import HistoryScope

    history = history or HistoryScope.local(db)
    return inventory_snapshot(inventory_rows(history.read("files.inventory")),
                              telemetry_rows(history.read("context.telemetry")), current)


def session_context_files(folder: str, loaded: list[dict], tool: str = "", *, history) -> dict:
    """The historical inventory and loaded-file evidence, without a tree walk."""
    paths = {r["path"] for r in history.read("files.session_inventory", requested_path=folder,
                                            requested_tool=tool)}
    loaded_paths = {row["path"] for row in loaded}
    paths.update(loaded_paths)
    from .board_api import MAX_LIST_ROWS, _basename

    return {
        "git_root": folder or None,
        "read": True,
        "source": "kusto.queryable",
        "files": [
            {"path": path, "name": _basename(path), **({"loaded": True} if path in loaded_paths else {})}
            for path in sorted(paths)[:MAX_LIST_ROWS]
        ],
        "total": len(paths),
        "loaded": loaded,
    }
