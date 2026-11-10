"""Adapt queryable history records to the existing context-budget calculations."""

from __future__ import annotations

import fnmatch
import re
from dataclasses import asdict
from types import SimpleNamespace
from typing import Any

from ..tools import TOOL_LABELS, ResourceFile, ToolResources, get_registry

_POLICY_FIELDS = ("sent_to_llm", "loaded_when", "cacheable", "survives_compaction")
_PLACEHOLDER = re.compile(r"%[^%]+%|\$\{[^}]+\}|\{[^}]+\}|\$[A-Z_]+|^~")


def context_snapshot(db: Any, current: Any) -> Any:
    """No discovery, stat, transcript, or local telemetry read supplies inventory."""
    import json

    tools: dict[str, ToolResources] = {}
    memory = []
    specs = get_registry().path_specs()
    rows = (
        db._conn()
        .execute("SELECT path, tool, category, scope, size_bytes, tokens, lines, mtime, meta FROM files")
        .fetchall()
    )
    for path, tool, category, scope, size, tokens, lines, mtime, raw_meta in rows:
        try:
            meta = json.loads(raw_meta or "{}")
        except (ValueError, TypeError):
            meta = {}
        if not isinstance(meta, dict):
            meta = {}
        candidates = [
            spec
            for spec in specs
            if spec.ai_tool == tool
            and spec.category == category
            and (not scope or spec.scope == scope)
            and fnmatch.fnmatchcase(
                path.replace("\\", "/").lower(),
                _PLACEHOLDER.sub("*", spec.path_template).replace("\\", "/").lower(),
            )
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
                {"file": path, "source": category, "tokens": tokens or 0, "lines": lines or 0, "mtime": mtime or 0}
            )
    telemetry = [asdict(row) for row in db.latest_telemetry().values()]
    # Configuration is explicitly current/configured, never evidence of a running agent's model.
    return SimpleNamespace(
        root=getattr(current, "root", ""),
        tools=list(tools.values()),
        tool_configs=getattr(current, "tool_configs", []) or [],
        tool_telemetry=telemetry,
        agent_memory=memory,
    )


def session_context_files(conn: Any, folder: str, loaded: list[dict], tool: str = "") -> dict:
    """The historical inventory and loaded-file evidence, without a tree walk."""
    prefix = folder.replace("\\", "/").rstrip("/")
    escaped = prefix.replace("!", "!!").replace("%", "!%").replace("_", "!_")
    where = "(path = ? OR path LIKE ? ESCAPE '!' OR scope IN ('global', 'user'))"
    params: list[Any] = [prefix, escaped + "/%"]
    if tool:
        where += " AND (tool = ? OR tool = '')"
        params.append(tool)
    paths = {row[0] for row in conn.execute(f"SELECT path FROM files WHERE {where}", params)}
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
