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


# The path tables' ``sent_to_llm`` values of a file a tool puts into the model's context.
_SENT_TO_MODEL = frozenset({"yes", "conditional", "on-demand", "partial"})


def sent_to_model(path: str, tool: str, category: str, scope: str, raw_meta: Any = "") -> bool:
    """Whether the path tables say *tool* loads this inventory file into the model's context: its
    own ``sent_to_llm`` (meta), else that of every path-table row its path matches. A database, a
    cache, a log or a setting is not, and neither is a file no row describes."""
    try:
        meta = json.loads(raw_meta) if isinstance(raw_meta, str) and raw_meta else (raw_meta or {})
    except ValueError:
        meta = {}
    if isinstance(meta, dict) and meta.get("sent_to_llm"):
        return meta["sent_to_llm"] in _SENT_TO_MODEL
    normalized = path.replace("\\", "/").lower()
    index = _policy_index(True)

    def matching(rows) -> set[str]:
        return {spec.sent_to_llm for pattern, spec in rows if (not scope or spec.scope == scope) and pattern.match(normalized)}

    # The tool's own rows, else any tool's rows of the category (a project file serves several tools).
    values = matching(index.get((tool, category), ())) or matching(
        entry for (_tool, kind), rows in index.items() if kind == category for entry in rows)
    return bool(values) and values <= _SENT_TO_MODEL


def session_context_files(folder: str, loaded: list[dict], tool: str = "", *, history) -> dict:
    """The historical inventory and loaded-file evidence, without a tree walk. The inventory gives
    only the files its tool loads into the model's context (``sent_to_model``)."""
    paths = {r["path"] for r in history.read("files.session_inventory", requested_path=folder,
                                            requested_tool=tool)
             if sent_to_model(r["path"], r.get("tool") or "", r.get("category") or "", r.get("scope") or "",
                              r.get("meta") or "")}
    loaded_paths = {row["path"] for row in loaded}
    paths.update(loaded_paths)
    from .projection_utils import MAX_LIST_ROWS, _basename

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
