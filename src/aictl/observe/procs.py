# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""psutil process table: classification by the CSV registry and per-tool trees.

Command lines are used for classification only and never leave this module:
they can carry tokens. Nodes expose the process name and a bounded label.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any

_PLAIN_ARG = re.compile(r"[\w@./\\][\w@./\\:-]*")
_SHELLS = {"bash", "zsh", "sh", "fish", "dash", "pwsh", "powershell", "cmd"}
_STATUS = {"running": "running", "sleeping": "idle", "idle": "idle", "disk-sleep": "running", "stopped": "waiting"}


@dataclass
class ProcRow:
    pid: int
    ppid: int | None
    name: str
    exe: str | None = None
    cmdline: tuple[str, ...] = ()
    create_time: float = 0.0
    rss: int | None = None
    status: str = ""
    tool: str | None = None
    children: list[int] = field(default_factory=list)


def _stem(text: str) -> str:
    base = text.replace("\\", "/").rstrip("/").rsplit("/", 1)[-1]
    return base[:-4] if base.lower().endswith(".exe") else base


def role_of(row: ProcRow) -> tuple[str, str]:
    """Return ``(role, label)``. The label is a basename, never an argument value."""
    name = _stem(row.name)
    for arg in row.cmdline[1:]:
        if "mcp" in arg.lower() and _PLAIN_ARG.fullmatch(arg):
            return "mcp", _stem(arg)[:48]
    if "mcp" in name.lower():
        return "mcp", name[:48]
    if name.lower() in _SHELLS:
        return "shell", name
    return "process", name[:48]


class ProcTable:
    def __init__(self, rows: list[ProcRow]) -> None:
        self.rows = {r.pid: r for r in rows}
        for r in rows:
            if r.ppid in self.rows and r.ppid != r.pid:
                self.rows[r.ppid].children.append(r.pid)
        # An MCP server belongs to whichever tool spawned it, whatever its name matched.
        for r in rows:
            if r.tool and role_of(r)[0] == "mcp":
                r.tool = self._nearest_tool(r) or r.tool

    def _ancestors(self, row: ProcRow):
        seen = {row.pid}
        cur = self.rows.get(row.ppid) if row.ppid is not None else None
        while cur is not None and cur.pid not in seen:
            seen.add(cur.pid)
            yield cur
            cur = self.rows.get(cur.ppid) if cur.ppid is not None else None

    def _nearest_tool(self, row: ProcRow) -> str | None:
        return next((a.tool for a in self._ancestors(row) if a.tool), None)

    def tool_roots(self) -> dict[str, list[ProcRow]]:
        """Group each classified process with no same-tool ancestor under its tool."""
        roots: dict[str, list[ProcRow]] = {}
        for row in self.rows.values():
            if row.tool and not any(a.tool == row.tool for a in self._ancestors(row)):
                roots.setdefault(row.tool, []).append(row)
        return roots

    def node(self, pid: int, now: float, exclude: set[int] | None = None) -> dict | None:
        """Build a process node, skipping excluded pids and subtrees rooted in another tool."""
        row = self.rows.get(pid)
        if row is None or (exclude and pid in exclude):
            return None
        return self._node(row, now, exclude or set(), row.tool, set())

    def _node(self, row: ProcRow, now: float, exclude: set[int], owner: str | None, seen: set[int]) -> dict:
        seen.add(row.pid)
        kids = []
        for cpid in row.children:
            child = self.rows.get(cpid)
            if child is None or cpid in seen or cpid in exclude:
                continue
            if child.tool and owner and child.tool != owner:
                continue
            kids.append(self._node(child, now, exclude, owner, seen))
        kids.sort(key=lambda k: k["tree_rss_bytes"] or 0, reverse=True)
        role, label = role_of(row)
        known = [k["tree_rss_bytes"] for k in kids if k["tree_rss_bytes"] is not None]
        total = None if row.rss is None and not known else (row.rss or 0) + sum(known)
        return {
            "pid": row.pid,
            "name": _stem(row.name),
            "label": label,
            "role": role,
            "tool": row.tool,
            "state": _STATUS.get(row.status, "ended" if row.status == "zombie" else "running"),
            "age_s": max(0.0, now - row.create_time) if row.create_time else None,
            "rss_bytes": row.rss,
            "tree_rss_bytes": total,
            "share": None,
            "children": kids,
        }


def assign_shares(nodes: list[dict]) -> int | None:
    """Fill each node's share of the combined tree RSS; return that total."""
    total = sum(n["tree_rss_bytes"] or 0 for n in nodes)
    if not total:
        return None

    def walk(items: list[dict]) -> None:
        for item in items:
            if item["tree_rss_bytes"] is not None:
                item["share"] = round(item["tree_rss_bytes"] / total, 3)
            walk(item["children"])

    walk(nodes)
    return total


def snapshot() -> ProcTable | None:
    """Return the process table, or ``None`` when psutil is not installed."""
    try:
        import psutil
    except ImportError:
        return None
    from ..monitoring.collectors.process import classify_process
    from ..monitoring.session import ProcessInfo

    own = os.getpid()
    rows: list[ProcRow] = []
    attrs = ["pid", "ppid", "name", "exe", "cmdline", "create_time", "memory_info", "status"]
    for proc in psutil.process_iter(attrs, ad_value=None):
        info: dict[str, Any] = proc.info
        if info["pid"] == own:
            continue
        mem = info.get("memory_info")
        row = ProcRow(
            pid=info["pid"],
            ppid=info.get("ppid"),
            name=info.get("name") or "?",
            exe=info.get("exe"),
            cmdline=tuple(info.get("cmdline") or ()),
            create_time=info.get("create_time") or 0.0,
            rss=mem.rss if mem else None,
            status=info.get("status") or "",
        )
        row.tool = classify_process(
            ProcessInfo(pid=row.pid, ppid=row.ppid, name=row.name, exe=row.exe, cmdline=row.cmdline)
        ).tool
        rows.append(row)
    return ProcTable(rows)
