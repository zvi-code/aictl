# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Plain-text tree rendering with an ASCII fallback for non-UTF-8 consoles."""

from __future__ import annotations

import os
import sys
from typing import Any, TextIO

UNICODE = {"mid": "├─ ", "end": "└─ ", "bar": "│  ", "gap": "   "}
ASCII = {"mid": "|- ", "end": "`- ", "bar": "|  ", "gap": "   "}
_COLORS = {"running": "32", "waiting": "33", "idle": "36", "ended": "90"}
MAX_PROCESS_ROWS = 6


def charset_for(stream: TextIO) -> dict[str, str]:
    encoding = getattr(stream, "encoding", None) or "ascii"
    try:
        "".join(UNICODE.values()).encode(encoding)
    except (UnicodeEncodeError, LookupError):
        return ASCII
    return UNICODE


def use_color(stream: TextIO) -> bool:
    if os.environ.get("NO_COLOR") is not None or not getattr(stream, "isatty", lambda: False)():
        return False
    return enable_vt()


def enable_vt() -> bool:
    """ANSI needs virtual-terminal mode on Windows consoles; report whether it is on."""
    if sys.platform != "win32":
        return True
    try:
        import ctypes

        kernel = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel.GetStdHandle(-11)
        mode = ctypes.c_ulong()
        if not kernel.GetConsoleMode(handle, ctypes.byref(mode)):
            return False
        return bool(kernel.SetConsoleMode(handle, mode.value | 0x0004))
    except (OSError, AttributeError):
        return False


def safe_text(text: str, stream: TextIO) -> str:
    """Replace characters the stream cannot encode, so printing cannot raise."""
    encoding = getattr(stream, "encoding", None) or "ascii"
    try:
        return text.encode(encoding, "replace").decode(encoding)
    except LookupError:
        return text.encode("ascii", "replace").decode("ascii")


def fmt_dur(sec: float | None) -> str:
    if sec is None:
        return "n/a"
    sec = int(sec)
    if sec < 60:
        return f"{sec}s"
    if sec < 3600:
        return f"{sec // 60}m{sec % 60:02d}s"
    if sec < 86400:
        return f"{sec // 3600}h{sec % 3600 // 60:02d}m"
    return f"{sec // 86400}d{sec % 86400 // 3600:02d}h"


def fmt_bytes(n: int | None) -> str:
    if n is None:
        return "n/a"
    if n < 1024:
        return f"{n}B"
    if n < 1048576:
        return f"{n / 1024:.1f}KB"
    if n < 1073741824:
        return f"{n / 1048576:.0f}MB"
    return f"{n / 1073741824:.1f}GB"


def fmt_num(n: float | None) -> str:
    if n is None:
        return "n/a"
    if n < 1000:
        return f"{n:g}"
    if n < 1000000:
        return f"{n / 1000:.1f}k"
    return f"{n / 1000000:.1f}M"


class Node:
    __slots__ = ("text", "children", "key", "state")

    def __init__(self, text: str, children: list[Node] | None = None, key: str = "", state: str = "") -> None:
        self.text = text
        self.children = children or []
        self.key = key
        self.state = state


def _times(n: dict[str, Any]) -> str:
    return f"{n['state']} up {fmt_dur(n.get('age_s'))} last {fmt_dur(n.get('idle_s'))} ago"


def _process_nodes(procs: list[dict[str, Any]], full: bool) -> list[Node]:
    out = []
    shown = procs if full else procs[:MAX_PROCESS_ROWS]
    for p in shown:
        share = f" {p['share'] * 100:.0f}%" if p["share"] is not None else ""
        label = f"{p['role']} {p['label']}" if p["role"] != "process" else p["label"]
        text = f"pid {p['pid']} {label} {p['state']} up {fmt_dur(p['age_s'])} rss {fmt_bytes(p['tree_rss_bytes'])}{share}"
        out.append(Node(text, _process_nodes(p["children"], full), state=p["state"]))
    if len(procs) > len(shown):
        rest = procs[len(shown) :]
        out.append(Node(f"+{len(rest)} more, rss {fmt_bytes(sum(p['tree_rss_bytes'] or 0 for p in rest))}"))
    return out


def _agent_nodes(agents: list[dict[str, Any]]) -> list[Node]:
    out = []
    for a in agents:
        fail = " FAILED" if a["failed"] else ""
        tokens = fmt_num(a["total_tokens"]) if a["total_tokens"] is not None else "n/a"
        text = (
            f"agent {a['name']} {_times(a)}{fail} turns {a['turns']} tools {a['tool_calls']}"
            f" fail {a['failures']} tok {tokens}"
        )
        out.append(Node(text, _agent_nodes(a["agents"]), state=a["state"]))
    return out


def _na(s: dict[str, Any], key: str, value: Any, fmt=fmt_num) -> str:
    return fmt(value) if value is not None else f"n/a ({s['na'][key]})" if key in s["na"] else "n/a"


def _summary(s: dict[str, Any]) -> str:
    a = s["activity"]
    t = s["tools"]
    tok = a["tokens"]
    tokens = (
        " ".join(f"{k.replace('cache_', 'c.')} {fmt_num(v)}" for k, v in tok.items() if v is not None)
        if tok
        else _na(s, "tokens", None)
    )
    ctx = s["memory"]["context"]
    current = ctx["current_tokens"]
    context = f"{fmt_num(current)}/{fmt_num(ctx['token_limit'])}" if current else "n/a"
    fails = fmt_num(t["failures"]) if t["failures"] is not None else "n/a"
    return (
        f"turns {_na(s, 'turns', a['turns'])}  tools {_na(s, 'tool_calls', a['tool_calls'])} (fail {fails})"
        f"  prompts {fmt_num(s['prompts']['count'])}  tok {tokens}  reqs {_na(s, 'requests', a['requests'])}"
        f"  premium {_na(s, 'premium_requests', a['premium_requests'])}"
        f"  rss {fmt_bytes(s['rss_bytes'])}  ctx {context} instr {fmt_num(ctx['est_tokens'])}t~"
    )


def _model_nodes(pin: dict[str, Any] | None) -> list[Node]:
    """The pinned model, its file and line, and any request it contradicts."""
    if not pin or not (pin["value"] or pin["narrower_pins"] or pin["conflicts"]):
        return []
    where = f"{pin['source']}:{pin['line']}" if pin["line"] else pin["source"]
    text = f"model pinned {pin['value']}  {where}" if pin["value"] else "no model pin for the whole tool"
    if pin["value"] and not pin["in_project"]:
        text += "  (not in this project, still in effect)"
    if pin["narrower_pins"]:
        text += f"  +{pin['narrower_pins']} narrower"
    out = [Node(text)]
    for c in pin["conflicts"]:
        out.append(Node(f"CONFLICT {', '.join(c['requested'])} requested at {c['requested_at']}, {c['pinned']} is pinned"))
    return out


def _detail_nodes(s: dict[str, Any]) -> list[Node]:
    out: list[Node] = _model_nodes(s.get("model_in_force"))
    if s.get("folder"):
        out.append(Node(f"folder {s['folder']} ({s.get('artifact_count', 0)} files, {fmt_bytes(s.get('artifact_bytes'))})"))
    ctx = s["memory"]["context"]
    mem = [Node(f"process rss {fmt_bytes(s['rss_bytes'])}" + (f" ({s['na']['process']})" if "process" in s["na"] else ""))]
    usage = f"context in use {fmt_num(ctx['current_tokens'])} of {fmt_num(ctx['token_limit'])} tokens"
    mem.append(Node(usage if ctx["current_tokens"] else f"context in use n/a ({s['na'].get('context_tokens', 'no data')})"))
    for f in ctx["files"]:
        mem.append(Node(f"{f['kind']} {f['path']} {fmt_bytes(f['bytes'])} ~{fmt_num(f['est_tokens'])}t"))
    for name, count in (ctx.get("skills") or {}).items():
        mem.append(Node(f"skill {name} x{count}"))
    out.append(Node("memory (RSS and AI context)", mem))

    t = s["tools"]
    rows = [Node(f"now: {r['name']} for {fmt_dur(r['running_s'])}") for r in t["running"]]
    for r in t["by_tool"][:25]:
        dur = f" avg {r['avg_ms'] / 1000:.1f}s max {r['max_ms'] / 1000:.1f}s" if r["avg_ms"] is not None else " dur n/a"
        fails = r["failures"] if r["failures"] is not None else "n/a"
        mcp = f" mcp:{r['mcp_server']}" if r["mcp_server"] else ""
        rows.append(Node(f"{r['name']} x{r['calls']} fail {fails}{dur}{mcp}"))
    if t["mcp_servers"]:
        rows.append(Node("mcp servers: " + ", ".join(t["mcp_servers"])))
    out.append(Node(f"tools ({fmt_num(t['calls'])} calls)", rows))

    p = s["prompts"]
    rows = []
    for item in p["recent"]:
        length = item["length"] if item["length"] is not None else "n/a"
        text = f": {item['text']}" if "text" in item else ""
        rows.append(Node(f"{length} chars{text}"))
    out.append(Node(f"prompts ({fmt_num(p['count'])}, capture {p['capture']})", rows))

    f = s["files"]
    rows = []
    for label, items in (("read", f["read"]), ("wrote", f["written"])):
        for i in items[:15]:
            rows.append(Node(f"{label} {i['path']} x{i['count']}"))
    out.append(Node(f"files ({len(f['read'])} read, {len(f['written'])} written; {f['source']})", rows))

    a = s["activity"]
    rate = f"{a['tool_calls_per_min']} tool calls/min" if a["tool_calls_per_min"] is not None else "rate n/a"
    out.append(Node(f"duration {fmt_dur(a['duration_s'])}, {rate}"))
    for key, reason in s["na"].items():
        out.append(Node(f"n/a {key}: {reason}"))
    return out


def build_nodes(doc: dict[str, Any], expanded: set[str] | None = None, full: bool = False) -> list[Node]:
    """Tool -> session -> agents -> processes. ``expanded`` adds detail to the named sessions."""
    out = []
    for t in doc["tools"]:
        children = _model_nodes(t.get("model_in_force"))
        for s in t["sessions"]:
            title = f"  {s['title']}" if s["title"] else ""
            where = f"  {s['cwd']}" + (f" ({s['branch']})" if s["branch"] else "") if s["cwd"] else ""
            model = f"  {s['model']}" if s["model"] else ""
            head = f"{s['id'][:8]} {_times(s)}{model}{where}{title}"
            kids = [Node(_summary(s))]
            for note in s["notes"]:
                kids.append(Node(f"note: {note}"))
            if full or (expanded and s["id"] in expanded):
                kids.extend(_detail_nodes(s))
            kids.extend(_agent_nodes(s["agents"]))
            kids.extend(_process_nodes(s["processes"], full))
            children.append(Node(head, kids, key=s["id"], state=s["state"]))
        if t["unattributed_processes"]:
            label = "unattributed processes"
            children.append(Node(label, _process_nodes(t["unattributed_processes"], full)))
        for note in t["notes"]:
            children.append(Node(f"note: {note}"))
        n = len(t["sessions"])
        head = f"{t['label']} [{t['tool']}]  {n} session{'s' if n != 1 else ''}  rss {fmt_bytes(t['rss_bytes'])}"
        out.append(Node(head, children, key=f"tool:{t['tool']}", state=t["state"]))
    return out


def flatten(nodes: list[Node], chars: dict[str, str], prefix: str = "", top: bool = True) -> list[tuple[str, Node]]:
    """Return ``(prefix + text, node)`` rows in display order."""
    rows: list[tuple[str, Node]] = []
    for i, node in enumerate(nodes):
        last = i == len(nodes) - 1
        branch = "" if top else (chars["end"] if last else chars["mid"])
        rows.append((prefix + branch + node.text, node))
        extend = "" if top else (chars["gap"] if last else chars["bar"])
        rows.extend(flatten(node.children, chars, prefix + extend, False))
    return rows


def paint(text: str, state: str, color: bool) -> str:
    code = _COLORS.get(state)
    return f"\x1b[{code}m{text}\x1b[0m" if color and code else text


def render(doc: dict[str, Any], stream: TextIO, full: bool = False, width: int | None = None) -> str:
    chars = charset_for(stream)
    color = use_color(stream)
    lines = []
    for text, node in flatten(build_nodes(doc, full=full), chars):
        if width and len(text) > width:
            text = text[: width - 1]
        lines.append(paint(text, node.state, color))
    for note in doc["notes"]:
        lines.append(f"note: {note}")
    if not doc["tools"]:
        lines.append("No AI tool processes or active sessions found. Use --all to include recently ended sessions.")
    return safe_text("\n".join(lines), stream)
