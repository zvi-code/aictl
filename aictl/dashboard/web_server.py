"""Live web dashboard server with REST + SSE API.

Serves a self-contained HTML dashboard at / with real-time updates via
Server-Sent Events, plus REST endpoints for snapshot data, file content
inspection, and token budget analysis.
"""

from __future__ import annotations

import collections
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .collector import DashboardSnapshot, collect
from ..discovery import compute_token_budget


# ─── Thread-safe snapshot store ──────────────────────────────────

_HISTORY_TUPLE_LEN = 11  # bump when adding fields to the history tuple


class _SnapshotStore:
    """Thread-safe snapshot storage with version-based change notification."""

    def __init__(self) -> None:
        self._snap: DashboardSnapshot | None = None
        self._version: int = 0
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)
        # Ring buffer for global time-series sparklines.
        # At ~5.86s/tick, 360 entries ≈ 35 min.
        self._history: collections.deque[tuple] = collections.deque(maxlen=360)
        # Per-tool history: {tool_name: deque[(ts, cpu, mem_mb, tokens, traffic_bps)]}
        self._tool_history: dict[str, collections.deque] = {}

    def update(self, snap: DashboardSnapshot) -> None:
        with self._condition:
            self._snap = snap
            self._version += 1
            row = (
                snap.timestamp, snap.total_files, snap.total_tokens,
                snap.total_cpu, snap.total_mem_mb,
                snap.total_mcp_servers, snap.total_memory_tokens,
                snap.total_live_sessions, snap.total_live_estimated_tokens,
                snap.total_live_inbound_rate_bps, snap.total_live_outbound_rate_bps,
            )
            # Clear history if schema changed (prevents zip unpack crash)
            if self._history and len(self._history[0]) != len(row):
                self._history.clear()
            self._history.append(row)

            # Per-tool history
            ts = snap.timestamp
            for t in snap.tools:
                if t.tool == "aictl":
                    continue
                cpu = sum(float(p.cpu_pct) for p in t.processes
                          if hasattr(p, 'cpu_pct') and str(p.cpu_pct).replace('.', '', 1).isdigit())
                mem = sum(float(p.mem_mb) for p in t.processes
                          if hasattr(p, 'mem_mb') and str(p.mem_mb).replace('.', '', 1).isdigit())
                tok = sum(f.tokens for f in t.files)
                traffic = 0.0
                if t.live:
                    traffic = float(t.live.get("outbound_rate_bps", 0)) + float(t.live.get("inbound_rate_bps", 0))
                if t.tool not in self._tool_history:
                    self._tool_history[t.tool] = collections.deque(maxlen=120)  # ~12 min
                self._tool_history[t.tool].append((ts, cpu, mem, tok, traffic))

            self._condition.notify_all()

    def wait_for_update(self, known_version: int,
                        timeout: float = 30.0) -> tuple[DashboardSnapshot | None, int]:
        """Block until a new version is available or timeout."""
        with self._condition:
            self._condition.wait_for(
                lambda: self._version > known_version, timeout=timeout)
            return self._snap, self._version

    @property
    def snapshot(self) -> DashboardSnapshot | None:
        with self._lock:
            return self._snap

    @property
    def version(self) -> int:
        with self._lock:
            return self._version

    def history_json(self) -> str:
        """Return time-series history as column-major JSON (uPlot native format)."""
        with self._lock:
            rows = list(self._history)
        if not rows:
            return json.dumps({"ts": [], "files": [], "tokens": [],
                               "cpu": [], "mem_mb": [], "mcp": [],
                               "mem_tokens": [], "live_sessions": [],
                               "live_tokens": [], "live_in_rate": [], "live_out_rate": []})
        # Transpose rows → columns
        ts, files, tokens, cpu, mem_mb, mcp, mem_tokens, live_sessions, live_tokens, live_in_rate, live_out_rate = zip(*rows)
        # Per-tool history
        tool_hist: dict[str, dict] = {}
        for tool_name, dq in self._tool_history.items():
            if not dq:
                continue
            t_rows = list(dq)
            t_ts, t_cpu, t_mem, t_tok, t_traffic = zip(*t_rows)
            tool_hist[tool_name] = {
                "ts": list(t_ts),
                "cpu": [round(v, 1) for v in t_cpu],
                "mem_mb": [round(v, 1) for v in t_mem],
                "tokens": list(t_tok),
                "traffic": [round(v, 2) for v in t_traffic],
            }

        return json.dumps({
            "ts": list(ts), "files": list(files), "tokens": list(tokens),
            "cpu": [round(v, 1) for v in cpu],
            "mem_mb": [round(v, 1) for v in mem_mb],
            "mcp": list(mcp), "mem_tokens": list(mem_tokens),
            "live_sessions": list(live_sessions),
            "live_tokens": list(live_tokens),
            "live_in_rate": [round(v, 2) for v in live_in_rate],
            "live_out_rate": [round(v, 2) for v in live_out_rate],
            "by_tool": tool_hist,
        })


# ─── File path whitelist ─────────────────────────────────────────

class _AllowedPaths:
    """Maintains the set of file paths that may be served via /api/file."""

    def __init__(self) -> None:
        self._paths: set[str] = set()
        self._lock = threading.Lock()

    def update(self, snap: DashboardSnapshot) -> None:
        paths: set[str] = set()
        for tr in snap.tools:
            for f in tr.files:
                try:
                    paths.add(os.path.realpath(f.path))
                except (OSError, ValueError):
                    pass
        for mem in snap.agent_memory:
            if mem.file:
                try:
                    paths.add(os.path.realpath(mem.file))
                except (OSError, ValueError):
                    pass
        with self._lock:
            self._paths = paths

    def is_allowed(self, path: str) -> bool:
        try:
            real = os.path.realpath(path)
        except (OSError, ValueError):
            return False
        with self._lock:
            return real in self._paths


# ─── Background refresh thread ───────────────────────────────────

class _RefreshThread(threading.Thread):
    """Periodically collects a new snapshot."""

    def __init__(
        self,
        root: Path,
        interval: float,
        store: _SnapshotStore,
        allowed: _AllowedPaths,
        include_live_monitor: bool,
    ) -> None:
        super().__init__(daemon=True)
        self._root = root
        self._interval = interval
        self._store = store
        self._allowed = allowed
        self._include_live_monitor = include_live_monitor
        self._stop = threading.Event()

    def run(self) -> None:
        while not self._stop.is_set():
            try:
                snap = collect(
                    self._root,
                    include_processes=True,
                    include_live_monitor=self._include_live_monitor,
                    live_sample_seconds=max(1.0, min(1.5, self._interval / 2)),
                )
                self._store.update(snap)
                self._allowed.update(snap)
            except Exception:
                pass  # don't crash the refresh loop
            self._stop.wait(self._interval)

    def stop(self) -> None:
        self._stop.set()


# ─── Safe file reading ───────────────────────────────────────────

_MAX_FILE_SIZE = 200_000


def _read_file_safe(path_str: str) -> str | None:
    """Read file content with safety limits."""
    try:
        p = Path(path_str)
        if not p.is_file():
            return None
        size = p.stat().st_size
        if size > _MAX_FILE_SIZE:
            with open(p, "r", errors="replace") as f:
                f.seek(max(0, size - _MAX_FILE_SIZE))
                f.readline()  # skip partial line
                tail = f.read()
            return f"[... truncated, showing last {len(tail)} chars of {size} ...]\n{tail}"
        return p.read_text(errors="replace")
    except OSError:
        return None


# ─── HTTP handler ────────────────────────────────────────────────

class _DashboardHandler(BaseHTTPRequestHandler):
    """Routes requests to the appropriate handler."""

    server: _DashboardHTTPServer  # type hint for IDE

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/":
            self._serve_html()
        elif path == "/api/snapshot":
            self._serve_snapshot()
        elif path == "/api/file":
            self._serve_file()
        elif path == "/api/stream":
            self._serve_sse()
        elif path == "/api/budget":
            self._serve_budget()
        elif path == "/api/history":
            self._serve_history()
        else:
            self.send_error(404)

    def _serve_html(self) -> None:
        html = _DASHBOARD_HTML
        html = html.replace("%%TOOL_COLORS_JS%%", _make_js_colors())
        html = html.replace("%%TOOL_ICONS_JS%%", _make_js_icons())
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _serve_snapshot(self) -> None:
        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return
        body = snap.to_json().encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self) -> None:
        qs = parse_qs(urlparse(self.path).query)
        file_path = qs.get("path", [None])[0]
        if not file_path:
            self.send_error(400, "Missing path parameter")
            return
        if not self.server.allowed.is_allowed(file_path):
            self.send_error(403, "Path not in discovered resource set")
            return
        content = _read_file_safe(file_path)
        if content is None:
            self.send_error(404, "File not readable")
            return
        body = content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_sse(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        version = 0
        # Send current snapshot immediately
        snap = self.server.store.snapshot
        if snap:
            self._write_sse(snap)
            version = self.server.store.version

        while True:
            try:
                snap, version = self.server.store.wait_for_update(
                    version, timeout=30.0)
                if snap:
                    self._write_sse(snap)
                else:
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                break

    def _write_sse(self, snap: DashboardSnapshot) -> None:
        data = snap.to_json()
        for line in data.splitlines():
            self.wfile.write(f"data: {line}\n".encode("utf-8"))
        self.wfile.write(b"\n")
        self.wfile.flush()

    def _serve_history(self) -> None:
        body = self.server.store.history_json().encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_budget(self) -> None:
        snap = self.server.store.snapshot
        if snap is None:
            self.send_error(503, "No data yet")
            return
        budget = compute_token_budget(snap.tools)
        body = json.dumps(budget, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args) -> None:
        # Suppress noisy SSE keepalive logs
        msg = fmt % args if args else fmt
        if "/api/stream" in str(msg):
            return
        print(f"  {msg}", file=sys.stderr)


# ─── HTTP server ─────────────────────────────────────────────────

class _DashboardHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler, store, allowed, root):
        super().__init__(addr, handler)
        self.store: _SnapshotStore = store
        self.allowed: _AllowedPaths = allowed
        self.root: Path = root


# ─── Entry point ─────────────────────────────────────────────────

def run_server(
    root: Path,
    host: str = "127.0.0.1",
    port: int = 8484,
    interval: float = 5.0,
    open_browser: bool = True,
    include_live_monitor: bool = True,
) -> None:
    """Start the dashboard HTTP server. Blocks until Ctrl-C."""
    store = _SnapshotStore()
    allowed = _AllowedPaths()

    # Initial collection so /api/snapshot is ready immediately
    print("  collecting initial snapshot ...", file=sys.stderr)
    snap = collect(
        root,
        include_processes=True,
        include_live_monitor=include_live_monitor,
        live_sample_seconds=max(1.0, min(1.5, interval / 2)),
    )
    store.update(snap)
    allowed.update(snap)

    # Start background refresh
    refresh = _RefreshThread(root, interval, store, allowed, include_live_monitor)
    refresh.start()

    # Start HTTP server
    server = _DashboardHTTPServer((host, port), _DashboardHandler,
                                  store, allowed, root)
    url = f"http://{host}:{port}"
    print(f"  aictl serve — dashboard at {url}", file=sys.stderr)
    print(f"  press Ctrl-C to stop\n", file=sys.stderr)

    if open_browser:
        import webbrowser
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        refresh.stop()
        server.shutdown()


# ─── Inline HTML dashboard ───────────────────────────────────────

from ..registry import TOOL_COLORS as _REG_COLORS, TOOL_ICONS as _REG_ICONS
import json as _json

def _make_js_colors() -> str:
    """Generate the JavaScript COLORS const from the registry."""
    return f"const COLORS = {_json.dumps(_REG_COLORS)};"

def _make_js_icons() -> str:
    """Generate the JavaScript ICONS const from the registry."""
    return f"const ICONS = {_json.dumps(_REG_ICONS)};"

_DASHBOARD_HTML = r"""<!DOCTYPE html>
<html lang="en" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aictl live dashboard</title>
<link rel="stylesheet" href="https://esm.sh/uplot@1.6.31/dist/uPlot.min.css">
<style>
[data-theme="dark"], [data-theme="auto"] {
  --bg: #0f172a; --bg2: #1e293b; --bg3: #162032; --fg: #e2e8f0; --fg2: #94a3b8;
  --accent: #38bdf8; --border: #334155;
  --green: #34d399; --red: #f87171; --orange: #fb923c; --yellow: #fbbf24;
}
[data-theme="light"] {
  --bg: #f8fafc; --bg2: #ffffff; --bg3: #f1f5f9; --fg: #1e293b; --fg2: #64748b;
  --accent: #0284c7; --border: #e2e8f0;
  --green: #059669; --red: #dc2626; --orange: #ea580c; --yellow: #d97706;
}
@media (prefers-color-scheme: light) {
  [data-theme="auto"] {
    --bg: #f8fafc; --bg2: #ffffff; --bg3: #f1f5f9; --fg: #1e293b; --fg2: #64748b;
    --accent: #0284c7; --border: #e2e8f0;
    --green: #059669; --red: #dc2626; --orange: #ea580c; --yellow: #d97706;
  }
}
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  background: var(--bg); color: var(--fg); line-height: 1.5; font-size: 0.85rem;
  transition: background 0.2s, color 0.2s; }

/* Layout */
header { display: flex; justify-content: space-between; align-items: center;
  padding: 0.4rem 1.2rem; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 0.8rem; }
header h1 { font-size: 1.1rem; white-space: nowrap; }
header h1 span { color: var(--fg2); font-weight: 400; }
.hdr-right { display: flex; align-items: center; gap: 0.5rem; }
.conn { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; }
.conn.ok { background: var(--green); color: #000; }
.conn.err { background: var(--red); color: #fff; }
.search-box { background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
  padding: 0.25rem 0.5rem; color: var(--fg); font-size: 0.78rem; width: 200px; outline: none; }
.search-box:focus { border-color: var(--accent); }
.search-box::placeholder { color: var(--fg2); }
.theme-btn { background: none; border: 1px solid var(--border); border-radius: 4px;
  padding: 0.2rem 0.5rem; cursor: pointer; font-size: 0.85rem; color: var(--fg); }
.theme-btn:hover { background: var(--border); }
.main-wrap { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.main { flex: 1; overflow: auto; padding: 0.6rem 1.2rem; }
.kbd { font-size: 0.6rem; color: var(--fg2); padding: 0.1rem 0.3rem; border: 1px solid var(--border);
  border-radius: 2px; font-family: monospace; margin-left: 0.2rem; }

/* Charts row — top */
.chart-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.4rem; margin-bottom: 0.4rem; }
.chart-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.3rem 0.5rem 0.1rem; overflow: hidden; min-height: 80px; position: relative; }
.chart-box .chart-hdr { display: flex; justify-content: space-between; align-items: baseline; }
.chart-box .chart-label { color: var(--fg2); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; }
.chart-box .chart-val { font-size: 1.1rem; font-weight: 700; }
.chart-wrap { height: 55px; position: relative; }
.chart-ref-line { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--fg2); opacity: 0.3; pointer-events: none; z-index: 1; }
.chart-ref-label { position: absolute; right: 2px; font-size: 0.5rem; color: var(--fg2); opacity: 0.5; pointer-events: none; z-index: 1; }
/* Metric groups — labeled rows */
.metric-group { margin-bottom: 0.4rem; }
.metric-group-label { font-size: 0.6rem; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 0.2rem; padding-left: 0.2rem; opacity: 0.7; }
.metrics-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.3rem; }
.metric { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.3rem 0.5rem; text-align: center; }
.metric .label { color: var(--fg2); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; }
.metric .value { font-size: 0.95rem; font-weight: 600; color: var(--fg); }
.metric .value.accent { color: var(--accent); }
@keyframes flash { 0%{opacity:1} 50%{opacity:0.5} 100%{opacity:1} }
.flash { animation: flash 0.4s ease; }

/* Resource bar + legend */
.rbar-block { margin-bottom: 0.8rem; }
.rbar-title { font-size: 0.72rem; color: var(--fg2); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
.rbar { display: flex; height: 6px; border-radius: 3px; overflow: hidden;
  margin-bottom: 0.3rem; background: var(--border); }
.rbar-seg { transition: width 0.3s; }
.rbar-legend { display: flex; flex-wrap: wrap; gap: 0.4rem 0.8rem; margin-bottom: 0.8rem; font-size: 0.7rem; color: var(--fg2); }
.rbar-legend-item { display: flex; align-items: center; gap: 0.25rem; }
.rbar-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Tabs — accessible */
.tab-nav { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 0.8rem; }
.tab-btn { background: none; border: none; color: var(--fg2); padding: 0.4rem 0.8rem;
  cursor: pointer; font-size: 0.8rem; border-bottom: 2px solid transparent; }
.tab-btn:hover { color: var(--fg); }
.tab-btn[aria-selected="true"] { color: var(--accent); border-bottom-color: var(--accent); }

/* Tool grid */
.tool-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.6rem; }
.tcard { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s; }
.tcard:hover { border-color: var(--accent); }
.tcard.has-anomaly { border-color: var(--red); box-shadow: 0 0 8px rgba(248,113,113,0.15); }
.tcard.open { grid-column: 1 / -1; }
.tcard-head { padding: 0.6rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
  background: none; border: none; width: 100%; text-align: left; color: inherit; font: inherit; }
.tcard-head:hover { background: var(--bg3); }
.tcard-head h2 { font-size: 0.9rem; flex: 1; display: flex; align-items: center; gap: 0.4rem; }
.tcard-head .arrow { color: var(--fg2); font-size: 0.6rem; transition: transform 0.2s; flex-shrink: 0; }
.tcard.open > .tcard-head .arrow { transform: rotate(90deg); }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.badge { display: inline-block; background: var(--border); color: var(--fg2);
  padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.65rem; margin-left: 0.2rem; }
.badge.warn { background: var(--red); color: #fff; }
.tcard-body { padding: 0 0.8rem 0.6rem; columns: 3 250px; column-gap: 1rem; }
.tcard-body > .cat-group { break-inside: avoid; margin-bottom: 0.4rem; }
.tcard-body > .proc-section { break-inside: avoid; column-span: all; }
.tcard-body > .live-section { break-inside: avoid; column-span: all; }

/* Category groups */
.cat-group { margin-top: 0.4rem; }
.cat-head { cursor: pointer; padding: 0.25rem 0; font-size: 0.8rem; color: var(--fg2);
  display: grid; grid-template-columns: 0.7rem 8px 1fr auto auto auto; align-items: center; gap: 0.3rem;
  user-select: none; background: none; border: none; width: 100%; text-align: left; font: inherit;
  overflow: hidden; max-width: 100%; }
.cat-head:hover { color: var(--fg); }
.cat-head .carrow { font-size: 0.6rem; transition: transform 0.15s; }
.cat-head.open .carrow { transform: rotate(90deg); }
.cat-head .cat-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.cat-head .badge { min-width: 40px; text-align: center; }

/* File items */
.fitem { padding: 0.15rem 0; font-size: 0.78rem; cursor: pointer; display: flex; gap: 0.4rem;
  background: none; border: none; width: 100%; text-align: left; color: inherit; font: inherit; }
.fitem:hover { background: var(--bg3); border-radius: 3px; }
.fpath { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.fmeta { color: var(--fg2); white-space: nowrap; font-size: 0.72rem; min-width: 100px; text-align: right; flex-shrink: 0; }

/* Inline file preview */
.inline-preview {
  background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
  margin: 0.2rem 0 0.4rem 0; padding: 0.4rem 0.6rem; font-size: 0.75rem;
  font-family: 'SF Mono', Menlo, Consolas, monospace; line-height: 1.45;
  white-space: pre-wrap; color: var(--fg2); overflow-x: auto;
}
.inline-preview .ln { color: var(--border); user-select: none; display: inline-block;
  width: 3ch; text-align: right; margin-right: 0.6em; }
.inline-preview .prev-actions { margin-top: 0.3rem; display: flex; gap: 0.4rem; }
.prev-btn { display: inline-block; padding: 0.1rem 0.4rem; background: var(--border);
  color: var(--fg2); border: none; border-radius: 3px; font-size: 0.68rem; cursor: pointer; }
.prev-btn:hover { background: var(--accent); color: var(--bg); }

/* Process rows */
.proc-section { margin-top: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.4rem; }
.proc-section h3 { font-size: 0.78rem; color: var(--fg2); margin-bottom: 0.3rem; }
.prow { display: grid; grid-template-columns: 50px 1fr 55px 90px 65px 20px; align-items: center; gap: 0.4rem; padding: 0.2rem 0; font-size: 0.78rem; }
.prow .pid { color: var(--green); }
.prow .pname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.prow .pcpu { text-align: right; }
.mem-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; position: relative; }
.mem-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.prow .pmem { text-align: right; color: var(--fg2); font-size: 0.72rem; }
.prow .anomaly-icon { color: var(--red); cursor: help; text-align: center; }

/* Live monitor sections */
.live-section { margin-top: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.4rem; }
.live-section h3 { font-size: 0.78rem; color: var(--fg2); margin-bottom: 0.35rem; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.4rem; }
.metric-chip { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 0.45rem 0.55rem; }
.metric-chip .mlabel { display: block; font-size: 0.65rem; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.04em; }
.metric-chip .mvalue { display: block; font-size: 0.95rem; font-weight: 700; color: var(--fg); }
.metric-chip .msub { display: block; font-size: 0.72rem; color: var(--fg2); margin-top: 0.1rem; }
.live-stack { display: grid; gap: 0.8rem; }
.diag-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 0.8rem; }
.diag-card h3 { font-size: 0.9rem; margin-bottom: 0.45rem; color: var(--accent); }
.stack-list { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pill { display: inline-block; background: var(--bg3); border: 1px solid var(--border); border-radius: 999px; padding: 0.15rem 0.5rem; font-size: 0.7rem; color: var(--fg2); }
.mono { font-family: 'SF Mono', Menlo, Consolas, monospace; }
.empty-state { color: var(--fg2); font-size: 0.8rem; }

/* File viewer */
.fv { position: fixed; top: 0; right: 0; width: 55%; height: 100vh;
  background: var(--bg); border-left: 2px solid var(--accent);
  display: flex; flex-direction: column; z-index: 100;
  box-shadow: -4px 0 20px rgba(0,0,0,0.5); }
.fv-head { display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 0.8rem; background: var(--bg2); border-bottom: 1px solid var(--border); }
.fv-head .path { font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.fv-head button { background: var(--border); border: none; color: var(--fg); padding: 0.2rem 0.6rem; border-radius: 4px; cursor: pointer; }
.fv-meta { padding: 0.4rem 0.8rem; font-size: 0.72rem; color: var(--fg2); background: var(--bg2); border-bottom: 1px solid var(--border); }
.fv-body { flex: 1; overflow: auto; padding: 0; }
.fv-lines { display: table; width: 100%; font-family: 'SF Mono','Fira Code',monospace; font-size: 0.78rem; line-height: 1.6; }
.fv-line { display: table-row; }
.fv-line:hover { background: var(--bg3); }
.fv-ln { display: table-cell; text-align: right; padding: 0 0.6rem 0 0.8rem; color: var(--fg2);
  user-select: none; width: 1%; white-space: nowrap; border-right: 1px solid var(--border); font-size: 0.7rem; }
.fv-code { display: table-cell; padding: 0 0.8rem; white-space: pre-wrap; word-break: break-all; }
.fv-ellipsis { text-align: center; padding: 0.5rem; color: var(--accent); background: var(--bg3);
  cursor: pointer; font-size: 0.78rem; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.fv-ellipsis:hover { background: var(--border); }
.fv-toolbar { padding: 0.3rem 0.8rem; background: var(--bg2); display: flex; justify-content: space-between;
  align-items: center; border-top: 1px solid var(--border); font-size: 0.72rem; color: var(--fg2); }
.fv-toolbar button { background: var(--accent); color: #000; border: none; padding: 0.2rem 0.6rem;
  border-radius: 4px; cursor: pointer; font-size: 0.72rem; }
.fv-toolbar button:hover { opacity: 0.8; }

/* Tables */
table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
th { text-align: left; color: var(--fg2); padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border); }
td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

/* Budget */
.budget-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 0.8rem; }
.budget-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.budget-full { grid-column: 1 / -1; }
.brow { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid var(--border); }
.brow:last-child { border-bottom: none; }
.blabel { color: var(--fg2); }
.bval { font-weight: 600; }

/* Memory tab */
.mem-group { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.6rem; overflow: hidden; }
.mem-group-head { padding: 0.5rem 0.8rem; cursor: pointer; font-size: 0.85rem; font-weight: 600;
  display: flex; align-items: center; gap: 0.4rem;
  background: none; border: none; width: 100%; text-align: left; color: inherit; font: inherit; font-weight: 600; font-size: 0.85rem; }
.mem-group-head .carrow { font-size: 0.6rem; transition: transform 0.15s; }
.mem-group-head.open .carrow { transform: rotate(90deg); }
.mem-group-head:hover { background: var(--bg3); }
.mem-profile-head { cursor: pointer; padding: 0.25rem 0; font-size: 0.8rem; color: var(--fg2);
  display: grid; grid-template-columns: 0.7rem 1fr auto auto; align-items: center; gap: 0.3rem;
  user-select: none; background: none; border: none; width: 100%; text-align: left; font: inherit;
  overflow: hidden; }
.mem-profile-head:hover { color: var(--fg); }
.mem-profile-head .carrow { font-size: 0.6rem; transition: transform 0.15s; }
.mem-profile-head.open .carrow { transform: rotate(90deg); }
.mem-profile-head .cat-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.mem-profile-head .badge { min-width: 40px; text-align: center; }

/* Accessibility */
button:focus-visible, [role="button"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.u-hidden { display: none; }
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
// ─── CDN Imports ───────────────────────────────────────────────
import { h, render as preactRender, createContext } from 'https://esm.sh/preact@10.25.4';
import { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'https://esm.sh/preact@10.25.4/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import uPlot from 'https://esm.sh/uplot@1.6.31';
const html = htm.bind(h);

// ─── Constants (injected from registry.py at serve-time) ───────
%%TOOL_COLORS_JS%%
%%TOOL_ICONS_JS%%
const SC = {running:'var(--green)',stopped:'var(--red)',error:'var(--orange)',unknown:'var(--fg2)'};
const THEMES = ['auto','dark','light'];
const THEME_ICONS = {auto:'\u263E',dark:'\u263E',light:'\u2600'};
const TAIL_LINES = 5;
const PREVIEW_LINES = 15;
const MEM_LABELS = {'claude-user-memory':'Claude User Memory','claude-project-memory':'Claude Project Memory','claude-auto-memory':'Claude Auto Memory','copilot-agent-memory':'Copilot Agent Memory','copilot-session-state':'Copilot Session State','copilot-user-memory':'Copilot Instructions','codex-user-memory':'Codex Instructions','windsurf-user-memory':'Windsurf Global Rules'};
const CAT_ORDER = ['instructions','config','rules','commands','skills','agent','memory','prompt','transcript','temp','runtime','credentials','extensions'];
const TABS = [
  {id:'overview', label:'Overview', key:'1'},
  {id:'procs', label:'Processes', key:'2'},
  {id:'mcp', label:'MCP Servers', key:'3'},
  {id:'memory', label:'AI Context', key:'4'},
  {id:'live', label:'Live Monitor', key:'5'},
  {id:'budget', label:'Token Budget', key:'6'},
];

// ─── Module-level shared state ─────────────────────────────────
const fileCache = new Map();

// ─── Context ───────────────────────────────────────────────────
const SnapContext = createContext(null);

// ─── Utility Functions ─────────────────────────────────────────
function fmtK(n){return n>=1000?(n/1000).toFixed(1)+'k':''+n;}
function fmtSz(n){if(n<1024)return n+'B';if(n<1048576)return(n/1024).toFixed(1)+'KB';return(n/1048576).toFixed(1)+'MB';}
function fmtRate(n){return (!n||n<=0)?'0B/s':fmtSz(n)+'/s';}
function fmtPct(n){return (Number(n)||0).toFixed(2);}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function liveTokenTotal(live){const t=(live&&live.token_estimate)||{};return (t.input_tokens||0)+(t.output_tokens||0);}
function scopeLabel(path, root) {
  if(path.startsWith(root+'/')) return 'project';
  if(path.includes('/.claude/projects/')) return 'shadow';
  if(path.includes('/.claude/')||path.includes('/.config/')||path.includes('/Library/')) return 'global';
  if(path.includes('/.copilot/')||path.includes('/.vscode/')) return 'global';
  return 'external';
}
function shortDir(path, root) {
  if(path.startsWith(root+'/')) {
    const rel=path.slice(root.length+1), parts=rel.split('/'); parts.pop();
    return parts.length ? parts.join('/') : '(root)';
  }
  const parts=path.split('/'); parts.pop();
  for(let i=parts.length-1;i>=0;i--) {
    if(parts[i].startsWith('.')&&parts[i].length>1&&parts[i]!=='..') return '~/'+parts.slice(i).join('/');
    if(parts[i]==='Library') return '~/'+parts.slice(i).join('/');
  }
  return parts.slice(-2).join('/');
}
function groupByDir(files, root) {
  const groups={};
  files.forEach(f=>{const scope=scopeLabel(f.path,root),dir=shortDir(f.path,root);
    const label=scope==='project'?dir:scope+': '+dir;(groups[label]=groups[label]||[]).push(f);});
  const order={project:0,global:1,shadow:2,external:3};
  return Object.entries(groups).sort((a,b)=>{
    const sa=a[1][0]?scopeLabel(a[1][0].path,root):'z',sb=b[1][0]?scopeLabel(b[1][0].path,root):'z';
    return (order[sa]||9)-(order[sb]||9);
  });
}
function sma3(arr) {
  if(arr.length<3) return arr.slice();
  const out=[arr[0],(arr[0]+arr[1])/2];
  for(let i=2;i<arr.length;i++) out.push((arr[i-2]+arr[i-1]+arr[i])/3);
  return out;
}
async function fetchFileContent(path) {
  if(fileCache.has(path)) return fileCache.get(path);
  const res = await fetch('/api/file?path='+encodeURIComponent(path));
  if(!res.ok) throw new Error(res.statusText);
  const text = await res.text();
  fileCache.set(path, text);
  return text;
}

// ─── MiniChart Component ──────────────────────────────────────
// refLines: [{value, label, color?}] — horizontal reference lines
function MiniChart({data, color, smooth, height, yMax}) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const h = height || 55;
  useEffect(()=>{
    if(!ref.current || !data || data[0].length<2) return;
    const vals = smooth ? sma3(data[1]) : data[1];
    const plotData = [data[0], vals];
    if(chartRef.current) { chartRef.current.setData(plotData); return; }
    const rangeY = yMax
      ? (u,dMin,dMax) => [0, Math.max(yMax, dMax*1.05)]
      : (u,dMin,dMax) => [Math.max(0,dMin*0.9), dMax*1.1];
    const opts = {
      width: ref.current.clientWidth || 200, height: h,
      cursor:{show:false}, legend:{show:false}, select:{show:false},
      scales:{x:{time:false},y:{auto:true,range:rangeY}},
      axes:[{show:false},{show:false}],
      series:[{},{stroke:color,width:1.5,fill:color+'18'}],
    };
    chartRef.current = new uPlot(opts, plotData, ref.current);
    return ()=>{ if(chartRef.current){chartRef.current.destroy();chartRef.current=null;} };
  },[data, color, smooth]);
  useEffect(()=>{
    if(!chartRef.current||!ref.current) return;
    const ro = new ResizeObserver(()=>{
      if(chartRef.current && ref.current) chartRef.current.setSize({width:ref.current.clientWidth,height:h});
    });
    ro.observe(ref.current);
    return ()=>ro.disconnect();
  },[]);
  return html`<div class="chart-wrap" style=${'height:'+h+'px'} ref=${ref}></div>`;
}

// ─── ChartCard: label + current value + chart + reference lines
function ChartCard({label, value, valColor, data, chartColor, smooth, refLines, yMax}) {
  // Compute reference line positions as % of chart height
  const computeRefPos = (refVal) => {
    if(!data || !data[1] || data[1].length < 2) return null;
    const max = yMax ? Math.max(yMax, Math.max(...data[1])*1.05) : Math.max(...data[1])*1.1;
    if(max <= 0) return null;
    const pct = (1 - refVal / max) * 100;
    return pct >= 0 && pct <= 95 ? pct : null;
  };
  return html`<div class="chart-box">
    <div class="chart-hdr">
      <span class="chart-label">${label}</span>
      <span class="chart-val" style=${'color:'+(valColor||chartColor||'var(--accent)')}>${value}</span>
    </div>
    <div style="position:relative">
      ${(refLines||[]).map(r => {
        const top = computeRefPos(r.value);
        if(top==null) return null;
        return html`<Fragment>
          <div class="chart-ref-line" style=${'top:'+top+'%'} />
          <div class="chart-ref-label" style=${'top:calc('+top+'% - 8px)'}>${r.label}</div>
        </Fragment>`;
      })}
      ${data && data[0].length>=2 ? html`<${MiniChart} data=${data} color=${chartColor||'var(--accent)'} smooth=${smooth} yMax=${yMax}/>` :
        html`<div class="chart-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--fg2);font-size:0.7rem">collecting...</div>`}
    </div>
  </div>`;
}

// ─── Metric: compact number-only card ─────────────────────────
function Metric({label, value, accent}) {
  const prevRef = useRef(value);
  const [flashing, setFlashing] = useState(false);
  useEffect(()=>{
    if(prevRef.current !== value) { setFlashing(true); setTimeout(()=>setFlashing(false),500); }
    prevRef.current = value;
  },[value]);
  return html`<div class="metric" aria-label="${label}: ${value}">
    <div class="label">${label}</div>
    <div class=${'value'+(accent?' accent':'')+(flashing?' flash':'')}>${value}</div>
  </div>`;
}

// ─── StatBar: charts on top, inventory + live below ───────────
function StatBar({snap: s, history: hist}) {
  const sparkFor = (key) => {
    if(!hist || !hist.ts || hist.ts.length<2) return null;
    return [hist.ts, hist[key]];
  };
  if(!s) return null;
  const cores = s.cpu_cores || 1;
  const cpuLabel = s.total_cpu+'% of '+cores+' cores';
  // CPU reference lines: 100% per core
  const cpuRefs = [];
  if(cores >= 1) cpuRefs.push({value: 100, label: '1 core'});
  if(cores >= 2) cpuRefs.push({value: 100*cores, label: cores+' cores'});
  const hasLive = s.total_live_sessions > 0;
  return html`<Fragment>
    <div class="chart-row">
      <${ChartCard} label="Files" value=${s.total_files} data=${sparkFor('files')} chartColor="var(--accent)" />
      <${ChartCard} label="Tokens" value=${fmtK(s.total_tokens)} data=${sparkFor('tokens')} chartColor="var(--green)" />
      <${ChartCard} label="CPU" value=${cpuLabel} data=${sparkFor('cpu')} chartColor="var(--orange)" smooth
        refLines=${cpuRefs} yMax=${100*cores} />
      <${ChartCard} label="Proc RAM" value=${fmtSz(s.total_mem_mb*1048576)} data=${sparkFor('mem_mb')} chartColor="var(--yellow)" smooth />
    </div>
    <div class="metric-group">
      <div class="metric-group-label">Inventory</div>
      <div class="metrics-row">
        <${Metric} label="Processes" value=${s.total_processes} />
        <${Metric} label="Disk Size" value=${fmtSz(s.total_size)} />
        <${Metric} label="MCP Servers" value=${s.total_mcp_servers} />
        <${Metric} label="AI Context" value=${fmtK(s.total_memory_tokens)+'t'} />
      </div>
    </div>
    ${hasLive && html`<div class="metric-group">
      <div class="metric-group-label">Live Monitor</div>
      <div class="metrics-row">
        <${Metric} label="Sessions" value=${s.total_live_sessions} accent />
        <${Metric} label="Est. Tokens" value=${fmtK(s.total_live_estimated_tokens)} />
        <${Metric} label="↑ Outbound" value=${fmtRate(s.total_live_outbound_rate_bps)} />
        <${Metric} label="↓ Inbound" value=${fmtRate(s.total_live_inbound_rate_bps)} />
      </div>
    </div>`}
  </Fragment>`;
}

// ─── ResourceBar Component ─────────────────────────────────────
function ResourceBar({snap: s}) {
  if(!s) return null;
  const fileTools = s.tools.filter(t=>t.tool!=='aictl'&&t.files.length);
  const fileTotal = fileTools.reduce((a,t)=>a+t.files.length,0)||1;
  const liveTools = s.tools.filter(t=>t.tool!=='aictl'&&t.live&&(t.live.outbound_rate_bps||t.live.inbound_rate_bps));
  const liveTotal = liveTools.reduce((a,t)=>a+(t.live.outbound_rate_bps||0)+(t.live.inbound_rate_bps||0),0)||1;
  return html`
    ${fileTools.length>0 && html`<div class="rbar-block">
      <div class="rbar-title">CSV Footprint</div>
      <div class="rbar">${fileTools.map(t=>html`
        <div class="rbar-seg" style=${'width:'+(t.files.length/fileTotal*100).toFixed(1)+'%;background:'+(COLORS[t.tool]||'#94a3b8')}
          title="${t.label}: ${t.files.length} files"></div>`)}
      </div>
      <div class="rbar-legend">${fileTools.map(t=>html`
        <span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${'background:'+(COLORS[t.tool]||'#94a3b8')}></span>
          ${t.label} <span style="color:var(--fg2)">${t.files.length} files</span>
        </span>`)}
      </div>
    </div>`}
    ${html`<div class="rbar-block">
      <div class="rbar-title">Live Traffic${liveTools.length===0?' — no active traffic':''}</div>
      <div class="rbar">${liveTools.map(t=>{
        const weight=(t.live.outbound_rate_bps||0)+(t.live.inbound_rate_bps||0);
        return html`<div class="rbar-seg" style=${'width:'+(weight/liveTotal*100).toFixed(1)+'%;background:'+(COLORS[t.tool]||'#94a3b8')}
          title="${t.label}: ${fmtRate(weight)}"></div>`;
      })}
      </div>
      <div class="rbar-legend">${liveTools.map(t=>{
        const weight=(t.live.outbound_rate_bps||0)+(t.live.inbound_rate_bps||0);
        return html`<span class="rbar-legend-item">
          <span class="rbar-legend-dot" style=${'background:'+(COLORS[t.tool]||'#94a3b8')}></span>
          ${t.label} <span style="color:var(--fg2)">${fmtRate(weight)}</span>
        </span>`;
      })}
      </div>
    </div>`}
    ${!fileTools.length && !liveTools.length && html`<div class="empty-state">No AI tool resources found yet.</div>`}`;
}

// ─── InlinePreview Component ───────────────────────────────────
function InlinePreview({path}) {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const ctx = useContext(SnapContext);
  const toggle = useCallback(async ()=>{
    if(show) { setShow(false); return; }
    setShow(true);
    if(fileCache.has(path)) { setText(fileCache.get(path)); return; }
    setLoading(true); setError(null);
    try { const t=await fetchFileContent(path); setText(t); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[show,path]);
  if(!show) return html`<button class="fitem" onClick=${toggle} aria-label="Preview file">
    <span class="fpath" title=${path}>${path.split('/').pop()}</span>
    <span class="fmeta">${'click to preview'}</span></button>`;
  // This won't render here — it's called from FileItem
  return null;
}

// ─── FileItem Component ────────────────────────────────────────
function fmtAgo(mtime) {
  if(!mtime) return '';
  const sec = Math.floor(Date.now()/1000 - mtime);
  if(sec<0) return '';
  if(sec<60) return sec+'s ago';
  if(sec<3600) return Math.floor(sec/60)+'m ago';
  if(sec<86400) return Math.floor(sec/3600)+'h ago';
  return Math.floor(sec/86400)+'d ago';
}
function FileItem({file, dirPrefix}) {
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const ctx = useContext(SnapContext);
  const name = file.path.split('/').pop();
  const s2l = (file.sent_to_llm||'').toLowerCase();
  const recentlyModified = file.mtime && (Date.now()/1000 - file.mtime) < 300;
  const toggle = useCallback(async ()=>{
    if(showPreview) { setShowPreview(false); return; }
    setShowPreview(true);
    if(fileCache.has(file.path)) { setText(fileCache.get(file.path)); return; }
    setLoading(true); setError(null);
    try { const t=await fetchFileContent(file.path); setText(t); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[showPreview, file.path]);
  const numbered = (arr, start) => arr.map((l,i)=>
    html`<span class="ln">${start+i}</span>${esc(l)||' '}\n`);
  const renderPreview = () => {
    if(loading) return html`<span style="color:var(--fg2)">loading...</span>`;
    if(error) return html`<span style="color:var(--red)">${error}</span>`;
    if(!text) return null;
    const lines = text.split('\n'), total = lines.length;
    const isSmall = total <= TAIL_LINES*3;
    if(isSmall || expanded) {
      return html`${numbered(lines,1)}
        <div class="prev-actions">
          ${expanded && html`<button class="prev-btn" onClick=${()=>setExpanded(false)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>ctx.openViewer(file.path)}>open in viewer</button>
        </div>`;
    }
    const tail = lines.slice(-TAIL_LINES), tailStart = total-TAIL_LINES+1;
    return html`${numbered(tail,tailStart)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>setExpanded(true)}>show all (${total} lines)</button>
        <button class="prev-btn" onClick=${()=>ctx.openViewer(file.path)}>open in viewer</button>
      </div>`;
  };
  return html`<div>
    <button class="fitem" onClick=${toggle} aria-expanded=${showPreview} title=${file.path}>
      ${recentlyModified && html`<span style="color:var(--orange);font-size:0.6rem" title="Modified ${fmtAgo(file.mtime)}">●</span>`}
      <span class="fpath">${dirPrefix ? html`<span style="color:var(--fg2)">${dirPrefix}/</span>` : ''}${esc(name)}</span>
      <span class="fmeta">
        ${s2l && s2l!=='no' && html`<span style="color:${s2lColor(s2l)};font-size:0.6rem;margin-right:0.2rem" title="sent_to_llm: ${s2l}">${s2l==='yes'?'◆':s2l==='on-demand'?'◇':'○'}</span>`}
        ${fmtSz(file.size)}${file.tokens?' ~'+fmtK(file.tokens)+'t':''}
        ${file.mtime && recentlyModified ? html` <span style="color:var(--orange);font-size:0.65rem">${fmtAgo(file.mtime)}</span>` : ''}
      </span>
    </button>
    ${showPreview && html`<div class="inline-preview">${renderPreview()}</div>`}
  </div>`;
}

// ─── CatGroup Component ───────────────────────────────────────
function s2lColor(val) {
  const v = (val||'').toLowerCase();
  if(v==='yes') return 'var(--green)';
  if(v==='on-demand') return 'var(--yellow)';
  if(v==='conditional'||v==='partial') return 'var(--orange)';
  return 'var(--fg2)';
}
function CatGroup({label, files, root, badge, style, startOpen}) {
  const [isOpen, setOpen] = useState(!!startOpen);
  const dirGroups = useMemo(()=>groupByDir(files,root),[files,root]);
  const totalTok = useMemo(()=>files.reduce((a,f)=>a+f.tokens,0),[files]);
  const totalSz = useMemo(()=>files.reduce((a,f)=>a+f.size,0),[files]);
  // Dominant sent_to_llm for category indicator
  const dominantS2l = useMemo(()=>{
    const counts={};
    files.forEach(f=>{const v=(f.sent_to_llm||'no').toLowerCase();counts[v]=(counts[v]||0)+1;});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'no';
  },[files]);
  const renderFiles = () => {
    if(dirGroups.length===1 && dirGroups[0][1].length<=3) {
      return dirGroups[0][1].map(f=>html`<${FileItem} key=${f.path} file=${f}/>`);
    }
    return dirGroups.map(([dir, dfiles])=>{
      if(dfiles.length===1) {
        return html`<div style="margin-left:0.5rem"><${FileItem} key=${dfiles[0].path} file=${dfiles[0]} dirPrefix=${dir}/></div>`;
      }
      return html`<${DirGroup} key=${dir} dir=${dir} files=${dfiles}/>`;
    });
  };
  return html`<div class="cat-group" style=${style||''}>
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${s2lColor(dominantS2l)};margin-right:0.2rem;flex-shrink:0" title="sent_to_llm: ${dominantS2l}"></span>
      <span class="cat-label" title=${label}>${esc(label)}</span>
      <span class="badge" style="flex-shrink:0">${badge||files.length}</span>
      <span class="badge">${fmtSz(totalSz)}</span>
      <span class="badge">${fmtK(totalTok)}t</span>
    </button>
    ${isOpen && html`<div style="padding-left:0.8rem">${renderFiles()}</div>`}
  </div>`;
}
function DirGroup({dir, files}) {
  const [isOpen, setOpen] = useState(false);
  const dirTok = files.reduce((a,f)=>a+f.tokens,0);
  const dirSz = files.reduce((a,f)=>a+f.size,0);
  return html`<div class="cat-group" style="margin-left:0.5rem">
    <button class=${isOpen?'mem-profile-head open':'mem-profile-head'} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="grid-template-columns: 0.7rem 1fr auto auto auto">
      <span class="carrow">\u25B6</span>
      <span class="cat-label" style="color:var(--fg2)" title=${dir}>${esc(dir)}</span>
      <span class="badge">${files.length}</span>
      <span class="badge">${fmtSz(dirSz)}</span>
      <span class="badge">${fmtK(dirTok)}t</span>
    </button>
    ${isOpen && html`<div style="padding-left:0.8rem">${files.map(f=>html`<${FileItem} key=${f.path} file=${f}/>`)}</div>`}
  </div>`;
}

// ─── ProcRow Component ─────────────────────────────────────────
function ProcRow({proc: p, maxMem}) {
  const mem=parseFloat(p.mem_mb)||0, pct=Math.min(mem/maxMem*100,100);
  const cpuVal = parseFloat(p.cpu_pct)||0;
  const barColor=(p.anomalies&&p.anomalies.length)?'var(--red)':mem>200?'var(--orange)':'var(--green)';
  const cpuColor = cpuVal>100?'var(--red)':cpuVal>50?'var(--orange)':'inherit';
  return html`<div class="prow">
    <span class="pid">${p.pid}</span>
    <span class="pname" title=${p.cmdline}>${esc(p.name)}</span>
    <span class="pcpu" style=${'color:'+cpuColor}>${p.cpu_pct}%</span>
    <div class="mem-bar"><div class="mem-bar-fill" style=${'width:'+pct.toFixed(0)+'%;background:'+barColor}></div></div>
    <span class="pmem">${p.mem_mb}MB</span>
    <span class="anomaly-icon">${p.anomalies&&p.anomalies.length?html`<span title=${p.anomalies.join('; ')} style="color:var(--red);cursor:help">\u26A0</span>`:''}</span>
  </div>`;
}

// ─── ProcSection (within ToolCard) ─────────────────────────────
function ProcSection({processes, maxMem}) {
  if(!processes||!processes.length) return null;
  const totalMem = processes.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const totalCpu = processes.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
  const byType = {};
  processes.forEach(p=>{const t=p.process_type||'process';(byType[t]=byType[t]||[]).push(p);});
  return html`<div class="proc-section">
    <h3>Processes <span class="badge">${processes.length}</span>
      <span class="badge">CPU ${totalCpu.toFixed(1)}%</span>
      <span class="badge">MEM ${totalMem.toFixed(0)}MB</span></h3>
    ${Object.entries(byType).map(([type,procs])=>{
      const sorted=procs.sort((a,b)=>(parseFloat(b.mem_mb)||0)-(parseFloat(a.mem_mb)||0));
      if(Object.keys(byType).length===1) return sorted.map(p=>html`<${ProcRow} key=${p.pid} proc=${p} maxMem=${maxMem}/>`);
      return html`<div style="margin:0.3rem 0">
        <div style="font-size:0.72rem;color:var(--fg2);padding:0.2rem 0;text-transform:uppercase;letter-spacing:0.03em">${esc(type)}</div>
        ${sorted.map(p=>html`<${ProcRow} key=${p.pid} proc=${p} maxMem=${maxMem}/>`)}
      </div>`;
    })}
  </div>`;
}

// ─── ConfigSection (within ToolCard) ───────────────────────────
function ConfigSection({config}) {
  if(!config) return null;
  const entries = Object.entries(config.settings||{});
  const features = Object.entries(config.features||{});
  const hasMcp = (config.mcp_servers||[]).length > 0;
  const hasExt = (config.extensions||[]).length > 0;
  const otel = config.otel||{};
  const hints = config.hints||[];
  if(!entries.length && !features.length && !hasMcp && !hasExt && !otel.enabled && !hints.length && config.model==null && config.launch_at_startup==null) return null;
  return html`<div class="live-section">
    <h3>Configuration
      ${config.launch_at_startup===true && html`<span class="badge" style="background:var(--green);color:#000">auto-start</span>`}
      ${config.launch_at_startup===false && html`<span class="badge">no auto-start</span>`}
      ${config.auto_update===true && html`<span class="badge">auto-update</span>`}
      ${config.model && html`<span class="badge">${config.model}</span>`}
      ${otel.enabled && html`<span class="badge" style="background:var(--green);color:#000">OTel ${otel.exporter||'on'}</span>`}
      ${!otel.enabled && otel.source && html`<span class="badge" style="background:var(--orange);color:#000">OTel off</span>`}
    </h3>
    <div class="metric-grid">
      ${otel.enabled && html`<div class="metric-chip" style="border-color:var(--green)">
        <span class="mlabel" style="color:var(--green)">OpenTelemetry</span>
        <div style="font-size:0.72rem;padding:0.05rem 0">
          <span style="color:var(--fg2)">Exporter:</span> <span class="mono">${otel.exporter}</span>
        </div>
        ${otel.endpoint && html`<div style="font-size:0.72rem;padding:0.05rem 0">
          <span style="color:var(--fg2)">Endpoint:</span> <span class="mono">${otel.endpoint}</span>
        </div>`}
        ${otel.file_path && html`<div style="font-size:0.72rem;padding:0.05rem 0">
          <span style="color:var(--fg2)">File:</span> <span class="mono">${otel.file_path}</span>
        </div>`}
        ${otel.capture_content && html`<div style="font-size:0.72rem;padding:0.05rem 0;color:var(--orange)">⚠ Content capture enabled</div>`}
      </div>`}
      ${entries.length>0 && html`<div class="metric-chip">
        <span class="mlabel">Settings</span>
        ${entries.map(([k,v])=>html`<div style="display:flex;justify-content:space-between;font-size:0.72rem;padding:0.05rem 0">
          <span style="color:var(--fg2)">${k}</span>
          <span class="mono">${typeof v==='object'?JSON.stringify(v):String(v)}</span>
        </div>`)}
      </div>`}
      ${features.length>0 && html`<div class="metric-chip">
        <span class="mlabel">Features</span>
        ${features.map(([k,v])=>html`<div style="display:flex;justify-content:space-between;font-size:0.72rem;padding:0.05rem 0">
          <span style="color:var(--fg2)">${k}</span>
          <span style="color:${v===true?'var(--green)':v===false?'var(--red)':'var(--fg)'}">${String(v)}</span>
        </div>`)}
      </div>`}
      ${hasMcp && html`<div class="metric-chip">
        <span class="mlabel">MCP Servers</span>
        <div class="stack-list">${config.mcp_servers.map(s=>html`<span class="pill mono">${s}</span>`)}</div>
      </div>`}
      ${hasExt && html`<div class="metric-chip">
        <span class="mlabel">Extensions</span>
        <div class="stack-list">${config.extensions.map(e=>html`<span class="pill mono">${e}</span>`)}</div>
      </div>`}
    </div>
    ${hints.length>0 && html`<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;border-left:3px solid var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
      ${hints.map(h=>html`<div style="font-size:0.72rem;padding:0.15rem 0;color:var(--orange)">
        <span style="margin-right:0.3rem">💡</span>${h}
      </div>`)}
    </div>`}
  </div>`;
}

// ─── TelemetrySection (within ToolCard) ────────────────────────
function TelemetrySection({telemetry}) {
  if(!telemetry) return null;
  const t = telemetry;
  const totalTok = (t.input_tokens||0) + (t.output_tokens||0);
  const errors = t.errors||[];
  const quota = t.quota_state||{};
  if(!totalTok && !t.active_session_input && !errors.length) return null;
  const [showErrors, setShowErrors] = useState(false);
  return html`<div class="live-section">
    <h3>Verified Token Usage <span class="badge">${t.source}</span> <span class="badge">${(t.confidence*100).toFixed(0)}% confidence</span>
      ${errors.length>0 && html`<span class="badge warn" style="cursor:pointer" onClick=${(e)=>{e.stopPropagation();setShowErrors(!showErrors)}}>${errors.length} error${errors.length>1?'s':''}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Lifetime Input</span>
        <span class="mvalue">${fmtK(t.input_tokens||0)}</span>
        <span class="msub">cache read: ${fmtK(t.cache_read_tokens||0)} · creation: ${fmtK(t.cache_creation_tokens||0)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Lifetime Output</span>
        <span class="mvalue">${fmtK(t.output_tokens||0)}</span>
        <span class="msub">${t.total_sessions||0} sessions · ${t.total_messages||0} messages</span>
      </div>
      ${t.cost_usd > 0 ? html`<div class="metric-chip">
        <span class="mlabel">Estimated Cost</span>
        <span class="mvalue">$${t.cost_usd.toFixed(2)}</span>
      </div>` : null}
      ${(quota.premium_requests_used>0 || quota.total_api_duration_ms>0) && html`<div class="metric-chip">
        <span class="mlabel">Operational</span>
        ${quota.premium_requests_used>0 && html`<div style="font-size:0.72rem">Premium requests: <span class="mono">${quota.premium_requests_used}</span></div>`}
        ${quota.total_api_duration_ms>0 && html`<div style="font-size:0.72rem">API time: <span class="mono">${(quota.total_api_duration_ms/1000).toFixed(0)}s</span></div>`}
        ${quota.current_model && html`<div style="font-size:0.72rem">Model: <span class="mono">${quota.current_model}</span></div>`}
        ${quota.code_changes && html`<div style="font-size:0.72rem;color:var(--green)">+${quota.code_changes.lines_added} -${quota.code_changes.lines_removed} (${quota.code_changes.files_modified} files)</div>`}
      </div>`}
      ${(t.active_session_input>0||t.active_session_output>0) ? html`<div class="metric-chip" style="border-color:var(--accent)">
        <span class="mlabel">Active Session</span>
        <span class="mvalue">${fmtK((t.active_session_input||0)+(t.active_session_output||0))} tok</span>
        <span class="msub">in: ${fmtK(t.active_session_input||0)} · out: ${fmtK(t.active_session_output||0)} · ${t.active_session_messages||0} msgs</span>
      </div>` : null}
      ${Object.keys(t.by_model||{}).length > 0 ? html`<div class="metric-chip" style="grid-column:span 2">
        <span class="mlabel">By Model</span>
        ${Object.entries(t.by_model).map(([model,u])=>html`<div style="display:flex;justify-content:space-between;font-size:0.75rem;padding:0.1rem 0">
          <span class="mono">${model}</span>
          <span>in:${fmtK(u.input_tokens||0)} out:${fmtK(u.output_tokens||0)}${u.requests?' · '+u.requests+'req':''}</span>
        </div>`)}
      </div>` : null}
    </div>
    ${showErrors && errors.length>0 && html`<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;border-left:3px solid var(--red);background:color-mix(in srgb,var(--red) 8%,transparent);border-radius:0 4px 4px 0;max-height:10rem;overflow-y:auto">
      <div style="font-size:0.72rem;font-weight:600;color:var(--red);margin-bottom:0.2rem">Recent Errors</div>
      ${errors.map(e=>html`<div style="font-size:0.68rem;padding:0.1rem 0;display:flex;gap:0.4rem">
        <span class="mono" style="color:var(--fg2);white-space:nowrap">${(e.timestamp||'').slice(11,19)}</span>
        <span class="badge" style="font-size:0.6rem;background:var(--red);color:#fff;padding:0.05rem 0.25rem">${e.type}</span>
        <span style="color:var(--fg2)">${e.message}</span>
        ${e.model && html`<span class="mono" style="color:var(--fg2)">${e.model}</span>`}
      </div>`)}
    </div>`}
  </div>`;
}

// ─── LiveSection (within ToolCard) ─────────────────────────────
function LiveSection({live}) {
  if(!live) return null;
  const tokenEstimate = live.token_estimate || {};
  const mcp = live.mcp || {};
  const tokenTotal = liveTokenTotal(live);
  return html`<div class="live-section">
    <h3>Live Monitor
      <span class="badge">${live.session_count||0} sess</span>
      <span class="badge">${live.pid_count||0} pid</span>
      <span class="badge">${fmtPct(live.confidence)} conf</span>
      ${mcp.detected && html`<span class="badge warn">${mcp.loops||0} MCP loop${(mcp.loops||0)===1?'':'s'}</span>`}
    </h3>
    <div class="metric-grid">
      <div class="metric-chip">
        <span class="mlabel">Traffic</span>
        <span class="mvalue">↑ ${fmtRate(live.outbound_rate_bps||0)}</span>
        <span class="msub">↓ ${fmtRate(live.inbound_rate_bps||0)} total ${fmtSz((live.outbound_bytes||0)+(live.inbound_bytes||0))}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Tokens</span>
        <span class="mvalue">${fmtK(tokenTotal)}</span>
        <span class="msub">${tokenEstimate.source||'network-inference'} at ${fmtPct(tokenEstimate.confidence||0)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">MCP</span>
        <span class="mvalue">${mcp.detected ? 'Detected' : 'No loop'}</span>
        <span class="msub">${mcp.loops||0} loops at ${fmtPct(mcp.confidence||0)} confidence</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Context</span>
        <span class="mvalue">${live.files_touched||0} files</span>
        <span class="msub">${live.file_events||0} events · repo ${fmtSz((live.workspace_size_mb||0)*1048576)}</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">CPU</span>
        <span class="mvalue">${(live.cpu_percent||0).toFixed(1)}%</span>
        <span class="msub">peak ${(live.peak_cpu_percent||0).toFixed(1)}%</span>
      </div>
      <div class="metric-chip">
        <span class="mlabel">Workspaces</span>
        <span class="mvalue">${(live.workspaces||[]).length || 0}</span>
        <span class="msub mono">${(live.workspaces||[]).slice(0,2).join(' | ') || '(unknown)'}</span>
      </div>
    </div>
  </div>`;
}

// ─── ToolCard Component ────────────────────────────────────────
function ToolCard({tool: t, root}) {
  const [isOpen, setOpen] = useState(false);
  const {snap: snapCtx, history: hist} = useContext(SnapContext);
  const toolConfig = useMemo(()=>(snapCtx?.tool_configs||[]).find(c=>c.tool===t.tool),[snapCtx,t.tool]);
  const toolHist = useMemo(()=>hist?.by_tool?.[t.tool],[hist, t.tool]);
  const c = COLORS[t.tool]||'#94a3b8';
  const icon = ICONS[t.tool]||'\u{1F539}';
  const tok = t.files.reduce((a,f)=>a+f.tokens,0);
  const anom = t.processes.filter(p=>p.anomalies&&p.anomalies.length).length;
  const liveTok = liveTokenTotal(t.live);
  const liveTraffic = (t.live?.outbound_rate_bps||0) + (t.live?.inbound_rate_bps||0);
  const totalCpu = t.processes.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
  const totalMem = t.processes.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const maxMem = useMemo(()=>Math.max(...t.processes.map(p=>parseFloat(p.mem_mb)||0),100),[t.processes]);
  const telErrors = (t.token_breakdown?.telemetry?.errors||[]).length;
  const cats = useMemo(()=>{
    const c={};
    t.files.forEach(f=>{const k=f.kind||'other';(c[k]=c[k]||[]).push(f);});
    return Object.keys(c).sort((a,b)=>{
      const ai=CAT_ORDER.indexOf(a),bi=CAT_ORDER.indexOf(b);
      return (ai<0?99:ai)-(bi<0?99:bi);
    }).map(k=>({kind:k, files:c[k]}));
  },[t.files]);
  const cls = 'tcard'+(isOpen?' open':'')+(anom||telErrors?' has-anomaly':'');
  return html`<div class=${cls}>
    <button class="tcard-head" onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="flex-wrap:wrap;row-gap:0.2rem">
      <span class="arrow">\u25B6</span>
      <h2><span style="margin-right:0.25rem">${icon}</span>${esc(t.label)}</h2>
      <span class="badge">${t.files.length} files</span>
      <span class="badge">${fmtK(tok)} tok</span>
      ${t.processes.length>0 && html`<span class="badge">${t.processes.length} proc ${totalCpu.toFixed(1)}% ${totalMem.toFixed(0)}MB</span>`}
      ${t.mcp_servers.length>0 && html`<span class="badge">${t.mcp_servers.length} MCP</span>`}
      ${anom>0 && html`<span class="badge warn">${anom} anomaly</span>`}
      ${telErrors>0 && html`<span class="badge" style="background:var(--red);color:#fff">${telErrors} error${telErrors>1?'s':''}</span>`}
      ${t.live && html`<span class="badge" style="background:var(--accent);color:var(--bg)">${t.live.session_count||0} live · ${fmtRate(liveTraffic)}${liveTok>0?' · '+fmtK(liveTok)+'tok':''}</span>`}
      <div style="width:100%;display:flex;flex-wrap:wrap;gap:0.15rem;margin-top:0.1rem">
        ${cats.map(({kind,files:cf})=>html`<span style="font-size:0.6rem;color:var(--fg2)">${kind}:${cf.length}</span>`)}
      </div>
      ${toolHist && toolHist.ts.length>2 && html`<div style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.3rem;margin-top:0.2rem" onClick=${e=>e.stopPropagation()}>
        <div style="position:relative">
          <span style="position:absolute;top:0;left:0;font-size:0.55rem;color:var(--fg2);z-index:1">CPU</span>
          <${Sparkline} data=${[toolHist.ts,toolHist.cpu]} color=${c} smooth=${true}/>
        </div>
        <div style="position:relative">
          <span style="position:absolute;top:0;left:0;font-size:0.55rem;color:var(--fg2);z-index:1">MEM</span>
          <${Sparkline} data=${[toolHist.ts,toolHist.mem_mb]} color=${'var(--green)'}/>
        </div>
        <div style="position:relative">
          <span style="position:absolute;top:0;left:0;font-size:0.55rem;color:var(--fg2);z-index:1">${t.live?'Traffic':'Tokens'}</span>
          <${Sparkline} data=${[toolHist.ts, t.live ? toolHist.traffic : toolHist.tokens]} color=${'var(--orange)'}/>
        </div>
      </div>`}
    </button>
    ${isOpen && html`<div class="tcard-body">
      <${ConfigSection} config=${toolConfig}/>
      <${TelemetrySection} telemetry=${t.token_breakdown?.telemetry}/>
      <${LiveSection} live=${t.live}/>
      ${cats.map(({kind,files})=>html`<${CatGroup} key=${kind} label=${kind} files=${files} root=${root}/>`)}
      <${ProcSection} processes=${t.processes} maxMem=${maxMem}/>
      ${t.mcp_servers.length>0 && html`<div class="proc-section"><h3>MCP Servers</h3>
        ${t.mcp_servers.map(m=>html`<div class="fitem" style="cursor:default">
          <span class="fpath" style="color:var(--green)">${esc(m.name)}</span>
          <span class="fmeta">${esc((m.config||{}).command||'')} ${((m.config||{}).args||[]).join(' ').slice(0,60)}</span>
        </div>`)}</div>`}
    </div>`}
  </div>`;
}

// ─── TabOverview ───────────────────────────────────────────────
function TabOverview() {
  const {snap: s} = useContext(SnapContext);
  const tools = useMemo(()=>{
    if(!s) return [];
    return s.tools.filter(t=>t.tool!=='aictl'&&(t.files.length||t.processes.length||t.mcp_servers.length||t.live))
      .sort((a,b)=>{
        // Sort by static metrics only — prevents jarring card reordering on live data changes
        const scoreA = (a.files.length*2) + a.processes.length + a.mcp_servers.length;
        const scoreB = (b.files.length*2) + b.processes.length + b.mcp_servers.length;
        return scoreB - scoreA || a.tool.localeCompare(b.tool);
      });
  },[s]);
  if(!s) return html`<p style="color:var(--fg2)">Loading...</p>`;
  if(!tools.length) return html`<p style="color:var(--fg2)">No AI tool resources found.</p>`;
  // Inline AI Context (merged from separate tab)
  const memGroups = useMemo(()=>{
    if(!s?.agent_memory?.length) return [];
    const g={};
    s.agent_memory.forEach(m=>{(g[m.source]=g[m.source]||[]).push(m);});
    return Object.entries(g);
  },[s?.agent_memory]);
  return html`<div>
    <div class="tool-grid">
      ${tools.map(t=>html`<${ToolCard} key=${t.tool} tool=${t} root=${s.root}/>`)}
    </div>
    ${memGroups.length>0 && html`<div style="margin-top:1rem">
      <h3 style="color:var(--accent);margin-bottom:0.4rem;font-size:0.9rem">AI Context & Memory</h3>
      ${memGroups.map(([src,entries])=>
        html`<${MemSourceGroup} key=${src} source=${src} entries=${entries}/>`)}
    </div>`}
  </div>`;
}

// ─── TabProcesses ──────────────────────────────────────────────
function ProcToolGroup({tool, label, procs, maxMem}) {
  const [isOpen, setOpen] = useState(false);
  const c = COLORS[tool]||'#94a3b8';
  const totalMem = procs.reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
  const totalCpu = procs.reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
  const anomCount = procs.filter(p=>p.anomalies&&p.anomalies.length).length;
  const byType = useMemo(()=>{
    const bt={};
    procs.forEach(p=>{const t=p.process_type||'process';(bt[t]=bt[t]||[]).push(p);});
    return bt;
  },[procs]);
  return html`<div class="cat-group" style="margin-bottom:0.5rem">
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}
      style="padding:0.4rem 0.5rem;font-size:0.85rem;display:grid;grid-template-columns:0.8rem 0.5rem 1fr auto auto auto auto;align-items:center;gap:0.4rem">
      <span class="carrow">\u25B6</span>
      <span class="dot" style=${'background:'+c}></span>
      <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</strong>
      <span class="badge">${procs.length} proc</span>
      <span class="badge" style="min-width:65px;text-align:right">CPU ${totalCpu.toFixed(1)}%</span>
      <span class="badge" style="min-width:75px;text-align:right">MEM ${totalMem.toFixed(0)}MB</span>
      ${anomCount>0?html`<span class="badge warn">${anomCount} anomaly</span>`:html`<span></span>`}
    </button>
    ${isOpen && html`<div style="padding:0 0.3rem">
      ${Object.entries(byType).map(([type,typeProcs])=>{
        const sorted=typeProcs.sort((a,b)=>(parseFloat(b.mem_mb)||0)-(parseFloat(a.mem_mb)||0));
        if(Object.keys(byType).length===1) return sorted.map(p=>html`<${ProcRow} key=${p.pid} proc=${p} maxMem=${maxMem}/>`);
        return html`<div style="margin:0.3rem 0">
          <div style="font-size:0.72rem;color:var(--fg2);padding:0.2rem 0;text-transform:uppercase;letter-spacing:0.03em">${esc(type)}</div>
          ${sorted.map(p=>html`<${ProcRow} key=${p.pid} proc=${p} maxMem=${maxMem}/>`)}
        </div>`;
      })}
    </div>`}
  </div>`;
}
function TabProcesses() {
  const {snap: s} = useContext(SnapContext);
  if(!s) return null;
  const byTool = [];
  s.tools.forEach(t=>{ if(t.processes.length) byTool.push({tool:t.tool, label:t.label, procs:t.processes}); });
  if(!byTool.length) return html`<p style="color:var(--fg2)">No processes detected.</p>`;
  const allProcs = byTool.flatMap(g=>g.procs);
  const maxMem = Math.max(...allProcs.map(p=>parseFloat(p.mem_mb)||0),100);
  return html`${byTool.map(({tool,label,procs})=>
    html`<${ProcToolGroup} key=${tool} tool=${tool} label=${label} procs=${procs} maxMem=${maxMem}/>`)}`;
}

// ─── TabMcp ────────────────────────────────────────────────────
function TabMcp() {
  const {snap: s} = useContext(SnapContext);
  if(!s||!s.mcp_detail.length) return html`<p style="color:var(--fg2)">No MCP servers configured.</p>`;
  return html`<table role="table" aria-label="MCP Servers">
    <thead><tr><th></th><th>Server</th><th>Tool</th><th>Transport</th><th>Endpoint</th><th>Status</th></tr></thead>
    <tbody>${s.mcp_detail.map(m=>html`<tr key=${m.name+m.tool}>
      <td><span class="status-dot" style=${'background:'+SC[m.status]||'var(--fg2)'}></span></td>
      <td>${esc(m.name)}</td><td>${esc(m.tool)}</td><td>${esc(m.transport)}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${m.endpoint}>${esc((m.endpoint||'').slice(0,80))}</td>
      <td>${m.status}${m.pid?' (PID '+m.pid+')':''}</td>
    </tr>`)}</tbody>
  </table>`;
}

// ─── TabMemory ─────────────────────────────────────────────────
function MemItem({mem}) {
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const ctx = useContext(SnapContext);
  const name = mem.file.split('/').pop();
  const toggle = useCallback(async ()=>{
    if(showPreview) { setShowPreview(false); return; }
    setShowPreview(true);
    if(fileCache.has(mem.file)) { setText(fileCache.get(mem.file)); return; }
    setLoading(true); setError(null);
    try { const t=await fetchFileContent(mem.file); setText(t); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[showPreview, mem.file]);
  const numbered = (arr, start) => arr.map((l,i)=>
    html`<span class="ln">${start+i}</span>${esc(l)||' '}\n`);
  const renderPreview = () => {
    if(loading) return html`<span style="color:var(--fg2)">loading...</span>`;
    if(error) return html`<span style="color:var(--red)">${error}</span>`;
    if(!text) return null;
    const lines = text.split('\n'), total = lines.length;
    if(total<=TAIL_LINES*3||expanded) {
      return html`${numbered(lines,1)}
        <div class="prev-actions">
          ${expanded && html`<button class="prev-btn" onClick=${()=>setExpanded(false)}>collapse</button>`}
          <button class="prev-btn" onClick=${()=>ctx.openViewer(mem.file)}>open in viewer</button>
        </div>`;
    }
    const tail=lines.slice(-TAIL_LINES), tailStart=total-TAIL_LINES+1;
    return html`${numbered(tail,tailStart)}
      <div class="prev-actions">
        <button class="prev-btn" onClick=${()=>setExpanded(true)}>show all (${total} lines)</button>
        <button class="prev-btn" onClick=${()=>ctx.openViewer(mem.file)}>open in viewer</button>
      </div>`;
  };
  const recentMod = mem.mtime && (Date.now()/1000 - mem.mtime) < 300;
  return html`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem 0.8rem" onClick=${toggle}
      aria-expanded=${showPreview} title=${mem.file}>
      ${recentMod && html`<span style="color:var(--orange);font-size:0.6rem" title="Modified ${fmtAgo(mem.mtime)}">●</span>`}
      <span class="fpath">${esc(name)}</span>
      <span class="fmeta">${mem.tokens}tok ${mem.lines}ln${mem.mtime && recentMod ? html` <span style="color:var(--orange);font-size:0.65rem">${fmtAgo(mem.mtime)}</span>` : ''}</span>
    </button>
    ${showPreview && html`<div class="inline-preview" style="margin:0 0.8rem 0.4rem">${renderPreview()}</div>`}
  </div>`;
}
function MemProfileGroup({profile, items}) {
  const [isOpen, setOpen] = useState(items.length<=5);
  const profTok = items.reduce((a,m)=>a+m.tokens,0);
  return html`<div class="cat-group" style="margin:0 0.5rem">
    <button class=${isOpen?'mem-profile-head open':'mem-profile-head'} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      <span class="cat-label" style="color:var(--orange);font-weight:600" title=${profile}>${esc(profile)}</span>
      <span class="badge">${items.length} files</span>
      <span class="badge">${fmtK(profTok)} tok</span>
    </button>
    ${isOpen && html`<div>${items.map(m=>html`<${MemItem} key=${m.file} mem=${m}/>`)}</div>`}
  </div>`;
}
function MemSourceGroup({source, entries}) {
  const [isOpen, setOpen] = useState(false);
  const byProfile = useMemo(()=>{
    const bp={};
    entries.forEach(m=>{(bp[m.profile]=bp[m.profile]||[]).push(m);});
    return Object.entries(bp);
  },[entries]);
  return html`<div class="mem-group">
    <button class=${'mem-group-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      ${esc(MEM_LABELS[source]||source)} <span class="badge">${entries.length}</span>
      <span class="badge">${fmtK(entries.reduce((a,m)=>a+m.tokens,0))} tok</span>
    </button>
    ${isOpen && html`<div>${byProfile.map(([prof,items])=>
      html`<${MemProfileGroup} key=${prof} profile=${prof} items=${items}/>`)}</div>`}
  </div>`;
}
function TabMemory() {
  const {snap: s} = useContext(SnapContext);
  if(!s||!s.agent_memory.length) return html`<p style="color:var(--fg2)">No agent memory found.</p>`;
  const groups = useMemo(()=>{
    const g={};
    s.agent_memory.forEach(m=>{(g[m.source]=g[m.source]||[]).push(m);});
    return Object.entries(g);
  },[s.agent_memory]);
  return html`${groups.map(([src,entries])=>
    html`<${MemSourceGroup} key=${src} source=${src} entries=${entries}/>`)}`;
}

// ─── TabLive ───────────────────────────────────────────────────
function TabLive() {
  const {snap: s} = useContext(SnapContext);
  if(!s) return html`<p class="empty-state">Loading...</p>`;
  const liveTools = s.tools.filter(t=>t.live).sort((a,b)=>
    ((b.live?.outbound_rate_bps||0)+(b.live?.inbound_rate_bps||0)) -
    ((a.live?.outbound_rate_bps||0)+(a.live?.inbound_rate_bps||0))
  );
  const diagnostics = Object.entries((s.live_monitor&&s.live_monitor.diagnostics)||{});
  return html`<div class="live-stack">
    <div class="diag-card">
      <h3>Collector Health</h3>
      ${diagnostics.length ? html`<table role="table" aria-label="Collector diagnostics">
        <thead><tr><th>Collector</th><th>Status</th><th>Mode</th><th>Detail</th></tr></thead>
        <tbody>${diagnostics.map(([name,detail])=>html`<tr key=${name}>
          <td class="mono">${name}</td>
          <td>${esc(detail.status||'unknown')}</td>
          <td>${esc(detail.mode||'unknown')}</td>
          <td>${esc(detail.detail||'')}</td>
        </tr>`)}</tbody>
      </table>` : html`<p class="empty-state">Live monitor disabled or no collector diagnostics yet.</p>`}
    </div>

    <div class="diag-card">
      <h3>Tool Sessions</h3>
      ${liveTools.length ? html`<table role="table" aria-label="Live tool sessions">
        <thead><tr><th>Tool</th><th>Sessions</th><th>Traffic</th><th>Tokens</th><th>MCP</th><th>Files</th><th>CPU</th><th>Workspaces</th></tr></thead>
        <tbody>${liveTools.map(t=>{
          const live=t.live||{}, tok=live.token_estimate||{}, mcp=live.mcp||{};
          return html`<tr key=${t.tool}>
            <td>${esc(t.label)}</td>
            <td>${live.session_count||0} sess / ${live.pid_count||0} pid</td>
            <td>↑ ${fmtRate(live.outbound_rate_bps||0)}<br/>↓ ${fmtRate(live.inbound_rate_bps||0)}</td>
            <td>${fmtK(liveTokenTotal(live))}<br/><span style="color:var(--fg2)">${esc(tok.source||'network-inference')} @ ${fmtPct(tok.confidence||0)}</span></td>
            <td>${mcp.detected ? 'YES' : 'NO'}<br/><span style="color:var(--fg2)">${mcp.loops||0} loops @ ${fmtPct(mcp.confidence||0)}</span></td>
            <td>${live.files_touched||0} touched<br/><span style="color:var(--fg2)">${live.file_events||0} events</span></td>
            <td>${(live.cpu_percent||0).toFixed(1)}%<br/><span style="color:var(--fg2)">peak ${(live.peak_cpu_percent||0).toFixed(1)}%</span></td>
            <td class="mono">${esc((live.workspaces||[]).join(' | ') || '(unknown)')}</td>
          </tr>`;
        })}</tbody>
      </table>` : html`<p class="empty-state">No active AI-tool sessions detected yet.</p>`}
    </div>

    <div class="diag-card">
      <h3>Monitor Roots</h3>
      <div class="stack-list">
        ${(s.live_monitor?.workspace_paths||[]).map(path=>html`<span class="pill mono" key=${'ws-'+path}>workspace: ${path}</span>`)}
        ${(s.live_monitor?.state_paths||[]).map(path=>html`<span class="pill mono" key=${'state-'+path}>state: ${path}</span>`)}
        ${!(s.live_monitor?.workspace_paths||[]).length && !(s.live_monitor?.state_paths||[]).length && html`<span class="pill">No monitor roots reported</span>`}
      </div>
    </div>
  </div>`;
}

// ─── TabBudget ─────────────────────────────────────────────────
function TokenBar({always, onDemand, conditional, never, total}) {
  if(!total) return null;
  const w = v => (v/total*100).toFixed(1)+'%';
  return html`<div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--border);margin:0.3rem 0">
    ${always>0 && html`<div style="width:${w(always)};background:var(--green)" title="Always loaded: ${fmtK(always)}"></div>`}
    ${onDemand>0 && html`<div style="width:${w(onDemand)};background:var(--yellow)" title="On-demand: ${fmtK(onDemand)}"></div>`}
    ${conditional>0 && html`<div style="width:${w(conditional)};background:var(--orange)" title="Conditional: ${fmtK(conditional)}"></div>`}
    ${never>0 && html`<div style="width:${w(never)};background:var(--fg2);opacity:0.3" title="Never sent: ${fmtK(never)}"></div>`}
  </div>`;
}
function TabBudget() {
  const {snap: s} = useContext(SnapContext);
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState(false);
  useEffect(()=>{
    setBudget(null); setError(false);
    fetch('/api/budget').then(r=>r.json()).then(setBudget).catch(()=>setError(true));
  },[]);
  if(error) return html`<p style="color:var(--red)">Failed to load budget.</p>`;
  if(!budget) return html`<p style="color:var(--fg2)">Loading...</p>`;

  // Detect context window from tool configs (model-aware)
  const modelWindows = {'claude-opus-4-6':1000000,'claude-sonnet-4.6':1000000,'claude-sonnet-4':200000,'claude-haiku-4.5':200000,'gpt-5.4':200000,'gpt-5':128000};
  const detectedModel = (s?.tool_configs||[]).map(c=>c.model).filter(Boolean)[0] || '';
  const contextWindow = modelWindows[detectedModel] || 200000;
  // Primary metric: always-loaded tokens (what actually fills the context window)
  const alwaysLoaded = budget.always_loaded_tokens || 0;
  const totalPotential = budget.total_potential_tokens || 0;
  const pctAlways = (alwaysLoaded/contextWindow*100).toFixed(1);
  const pctTotal = (totalPotential/contextWindow*100).toFixed(1);

  // Per-tool breakdown from snapshot
  const toolBreakdowns = useMemo(()=>{
    if(!s) return [];
    return s.tools.filter(t=>t.tool!=='aictl'&&t.token_breakdown&&t.token_breakdown.total>0)
      .sort((a,b)=>(b.token_breakdown.total||0)-(a.token_breakdown.total||0));
  },[s]);

  // Per-category aggregate
  const catBreakdown = useMemo(()=>{
    if(!s) return [];
    const bk={};
    s.tools.forEach(t=>{
      if(t.tool==='aictl') return;
      (t.files||[]).forEach(f=>{
        const k=f.kind||'other';
        if(!bk[k]) bk[k]={kind:k,count:0,tokens:0,size:0,always:0,onDemand:0,conditional:0,never:0};
        bk[k].count++;
        bk[k].tokens+=f.tokens;
        bk[k].size+=f.size;
        const v=(f.sent_to_llm||'').toLowerCase();
        if(v==='yes') bk[k].always+=f.tokens;
        else if(v==='on-demand') bk[k].onDemand+=f.tokens;
        else if(v==='conditional'||v==='partial') bk[k].conditional+=f.tokens;
        else bk[k].never+=f.tokens;
      });
    });
    return Object.values(bk).sort((a,b)=>b.tokens-a.tokens);
  },[s]);

  const rows = [
    ['Always loaded (every call)', '~'+fmtK(budget.always_loaded_tokens)+' tokens', 'var(--green)'],
    ['On-demand (when invoked)', '~'+fmtK(budget.on_demand_tokens)+' tokens', 'var(--yellow)'],
    ['Conditional (file-matched)', '~'+fmtK(budget.conditional_tokens)+' tokens', 'var(--orange)'],
    ['Cacheable portion', '~'+fmtK(budget.cacheable_tokens)+' tokens', null],
    ['Survives compaction', '~'+fmtK(budget.survives_compaction_tokens)+' tokens', null],
  ];
  return html`<div class="budget-grid">
    ${s && s.tool_telemetry && s.tool_telemetry.length>0 && html`<div class="budget-card budget-full">
      <h3 style="margin-bottom:0.5rem;color:var(--accent)">Verified Token Usage</h3>
      <table role="table" aria-label="Tool telemetry">
        <thead><tr><th>Tool</th><th>Source</th><th>Input Tokens</th><th>Output Tokens</th><th>Cache Read</th><th>Sessions</th><th>Messages</th><th>Cost</th><th>Active Session</th></tr></thead>
        <tbody>${s.tool_telemetry.map(t=>html`<tr key=${t.tool}>
          <td><span class="dot" style=${'background:'+(COLORS[t.tool]||'#94a3b8')+';margin-right:0.3rem'}></span>${esc(t.tool)}</td>
          <td><span class="badge">${t.source}</span> <span style="color:var(--fg2)">${(t.confidence*100).toFixed(0)}%</span></td>
          <td style="font-weight:600">${fmtK(t.input_tokens||0)}</td>
          <td style="font-weight:600">${fmtK(t.output_tokens||0)}</td>
          <td style="color:var(--fg2)">${fmtK(t.cache_read_tokens||0)}</td>
          <td>${t.total_sessions||0}</td>
          <td>${t.total_messages||0}</td>
          <td>${t.cost_usd > 0 ? '$'+t.cost_usd.toFixed(2) : '-'}</td>
          <td>${(t.active_session_input||0)+(t.active_session_output||0) > 0 ?
            fmtK((t.active_session_input||0)+(t.active_session_output||0))+' tok' : '-'}</td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    <div class="budget-card">
      <h3 style="margin-bottom:0.5rem;color:var(--accent)">Context Window Usage${detectedModel ? html` <span class="badge">${detectedModel}</span>` : ''} <span class="badge">${fmtK(contextWindow)} window</span></h3>
      <div style="margin-bottom:0.3rem;font-size:0.72rem;color:var(--fg2)">
        Always loaded (sent every request): <strong style="color:var(--green)">${fmtK(alwaysLoaded)}</strong> ·
        Total potential (all files): <strong>${fmtK(totalPotential)}</strong>
      </div>
      <div style="margin-bottom:0.5rem">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:0.2rem">
          <span>Always-loaded: ~${fmtK(alwaysLoaded)} of ${fmtK(contextWindow)}</span>
          <span style="font-weight:700;color:${parseFloat(pctAlways)>80?'var(--orange)':parseFloat(pctAlways)>50?'var(--yellow)':'var(--green)'}">${pctAlways}%</span>
        </div>
        <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
          <div style="height:100%;width:${Math.min(parseFloat(pctAlways),100)}%;background:var(--green);border-radius:4px"></div>
        </div>
        ${parseFloat(pctAlways)>80 ? html`<div style="font-size:0.68rem;color:var(--orange);margin-top:0.15rem">
          Always-loaded context is ${pctAlways}% of window — on-demand files may not fit
        </div>` : null}
      </div>
      <div style="margin-bottom:0.5rem">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:0.2rem">
          <span>If all files loaded: ~${fmtK(totalPotential)} of ${fmtK(contextWindow)}</span>
          <span style="font-weight:700;color:${parseFloat(pctTotal)>100?'var(--red)':'var(--fg2)'}">${pctTotal}%${parseFloat(pctTotal)>100?' ⚠':''}</span>
        </div>
        <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden">
          ${parseFloat(pctTotal)>100
            ? html`<div style="height:100%;width:100%;background:linear-gradient(90deg,var(--fg2) ${(100/parseFloat(pctTotal)*100).toFixed(0)}%,var(--red) 100%);border-radius:3px"></div>`
            : html`<div style="height:100%;width:${pctTotal}%;background:var(--fg2);opacity:0.5;border-radius:3px"></div>`}
        </div>
        ${parseFloat(pctTotal)>100 ? html`<div style="font-size:0.68rem;color:var(--fg2);margin-top:0.1rem">
          Worst case: all ${fmtK(totalPotential)} tokens loaded simultaneously would exceed window
        </div>` : null}
      </div>
      ${rows.map(([l,v,color])=>html`<div class="brow">
        <span class="blabel">${color?html`<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:0.3rem"></span>`:''}${l}</span>
        <span class="bval">${v}</span>
      </div>`)}
      <div class="brow" style="font-weight:700">
        <span>Total potential overhead</span>
        <span class="bval" style="color:var(--accent)">~${fmtK(budget.total_potential_tokens)} tokens</span>
      </div>
      <div class="brow"><span class="blabel">Files never sent to LLM</span><span class="bval">${budget.never_sent_count}</span></div>
    </div>

    ${catBreakdown.length>0 && html`<div class="budget-card">
      <h3 style="margin-bottom:0.5rem;color:var(--accent)">By Category</h3>
      <table role="table" aria-label="Per-category tokens">
        <thead><tr><th>Category</th><th>Files</th><th>Tokens</th><th>Size</th><th style="width:80px">Distribution</th></tr></thead>
        <tbody>${catBreakdown.map(c=>html`<tr key=${c.kind}>
          <td>${esc(c.kind)}</td>
          <td>${c.count}</td>
          <td style="font-weight:600">${fmtK(c.tokens)}</td>
          <td>${fmtSz(c.size)}</td>
          <td><${TokenBar} always=${c.always} onDemand=${c.onDemand} conditional=${c.conditional} never=${c.never} total=${c.tokens||1}/></td>
        </tr>`)}</tbody>
      </table>
    </div>`}

    ${toolBreakdowns.length>0 && html`<div class="budget-card budget-full">
      <h3 style="margin-bottom:0.5rem;color:var(--accent)">By Tool (Estimated from Files)</h3>
      <table role="table" aria-label="Per-tool tokens">
        <thead><tr><th>Tool</th><th>Always</th><th>On-demand</th><th>Conditional</th><th>Never sent</th><th>Total</th><th style="width:150px">Distribution</th></tr></thead>
        <tbody>${toolBreakdowns.map(t=>{
          const tb=t.token_breakdown;
          return html`<tr key=${t.tool}>
            <td><span class="dot" style=${'background:'+(COLORS[t.tool]||'#94a3b8')+';margin-right:0.3rem'}></span>${esc(t.label)}</td>
            <td style="color:var(--green)">${fmtK(tb.always_loaded||0)}</td>
            <td style="color:var(--yellow)">${fmtK(tb.on_demand||0)}</td>
            <td style="color:var(--orange)">${fmtK(tb.conditional||0)}</td>
            <td style="color:var(--fg2)">${fmtK(tb.never_sent||0)}</td>
            <td style="font-weight:600">${fmtK(tb.total||0)}</td>
            <td><${TokenBar} always=${tb.always_loaded||0} onDemand=${tb.on_demand||0} conditional=${tb.conditional||0} never=${tb.never_sent||0} total=${tb.total||1}/></td>
          </tr>`;
        })}</tbody>
      </table>
    </div>`}
  </div>`;
}

// ─── FileViewer Component ──────────────────────────────────────
function FileViewer({path, onClose}) {
  const {snap: s} = useContext(SnapContext);
  const [text, setText] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);
  useEffect(()=>{
    if(!path) return;
    setExpanded(false); setError(null);
    if(fileCache.has(path)) { setText(fileCache.get(path)); return; }
    fetchFileContent(path).then(setText).catch(e=>setError(e.message));
  },[path]);
  if(!path) return null;
  const meta = useMemo(()=>{
    if(!s) return '';
    for(const t of s.tools) for(const f of t.files) if(f.path===path)
      return (f.kind||'')+' | '+fmtSz(f.size)+' | ~'+fmtK(f.tokens)+'tok | scope:'+(f.scope||'?')+' | sent_to_llm:'+(f.sent_to_llm||'?')+' | loaded:'+(f.loaded_when||'?');
    for(const m of s.agent_memory) if(m.file===path)
      return m.source+' | '+m.profile+' | '+m.tokens+'tok | '+m.lines+'ln';
    return '';
  },[s,path]);
  const lines = text ? text.split('\n') : [];
  const total = lines.length;
  const canCollapse = total > PREVIEW_LINES*2;
  const buildLines = (arr, start) => arr.map((line,i)=>
    html`<div class="fv-line"><span class="fv-ln">${start+i}</span><span class="fv-code">${esc(line)||' '}</span></div>`);
  return html`<div class="fv" role="dialog" aria-label="File viewer">
    <div class="fv-head">
      <span class="path">${path}</span>
      <button onClick=${onClose} aria-label="Close file viewer">Close (Esc)</button>
    </div>
    <div class="fv-meta">${meta}</div>
    <div class="fv-body">
      ${error ? html`<p style="color:var(--red);padding:1rem">${error}</p>` :
        !text ? html`<p style="color:var(--fg2);padding:1rem">Loading...</p>` :
        (!canCollapse||expanded) ?
          html`<div class="fv-lines">${buildLines(lines,1)}</div>` :
          html`<div class="fv-lines">${buildLines(lines.slice(0,PREVIEW_LINES),1)}</div>
            <div class="fv-ellipsis" onClick=${()=>setExpanded(true)}>\u25BC ${total-PREVIEW_LINES*2} more lines \u25BC</div>
            <div class="fv-lines">${buildLines(lines.slice(-PREVIEW_LINES),total-PREVIEW_LINES+1)}</div>`}
    </div>
    <div class="fv-toolbar">
      <span>${total} lines${canCollapse&&!expanded?' (showing '+PREVIEW_LINES*2+' of '+total+')':''}</span>
      ${canCollapse && html`<button onClick=${()=>setExpanded(!expanded)}>${expanded?'Collapse':'Show all'}</button>`}
    </div>
  </div>`;
}

// ─── App Component ─────────────────────────────────────────────
function App() {
  const [snap, setSnap] = useState(null);
  const [history, setHistory] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(()=>{
    try { return localStorage.getItem('aictl-theme')||'auto'; } catch(e){ return 'auto'; }
  });
  const [viewerPath, setViewerPath] = useState(null);
  const searchRef = useRef(null);

  // Theme sync
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('aictl-theme', theme); } catch(e){}
  },[theme]);
  const cycleTheme = useCallback(()=>{
    setTheme(t=>THEMES[(THEMES.indexOf(t)+1)%THEMES.length]);
  },[]);

  // SSE connection with exponential backoff
  useEffect(()=>{
    let es, retryDelay=1000, closed=false;
    function connect(){
      if(closed) return;
      es = new EventSource('/api/stream');
      es.onmessage = e => {
        const data = JSON.parse(e.data);
        setSnap(data);
        setConnected(true);
        retryDelay = 1000;
        // Append to history client-side (global + per-tool)
        setHistory(prev => {
          if(!prev) return prev;
          const h = {...prev};
          Object.keys(h).forEach(k=>{ if(k!=='by_tool') h[k] = [...h[k]]; });
          h.ts.push(data.timestamp);
          h.files.push(data.total_files);
          h.tokens.push(data.total_tokens);
          h.cpu.push(Math.round(data.total_cpu*10)/10);
          h.mem_mb.push(Math.round(data.total_mem_mb*10)/10);
          h.mcp.push(data.total_mcp_servers);
          h.mem_tokens.push(data.total_memory_tokens);
          h.live_sessions.push(data.total_live_sessions);
          h.live_tokens.push(data.total_live_estimated_tokens);
          h.live_in_rate.push(Math.round((data.total_live_inbound_rate_bps||0)*100)/100);
          h.live_out_rate.push(Math.round((data.total_live_outbound_rate_bps||0)*100)/100);
          // Per-tool history append
          const bt = {...(h.by_tool||{})};
          (data.tools||[]).forEach(t=>{
            if(t.tool==='aictl') return;
            const cpu = (t.processes||[]).reduce((a,p)=>a+(parseFloat(p.cpu_pct)||0),0);
            const mem = (t.processes||[]).reduce((a,p)=>a+(parseFloat(p.mem_mb)||0),0);
            const tok = (t.files||[]).reduce((a,f)=>a+f.tokens,0);
            const tr = (t.live?.outbound_rate_bps||0)+(t.live?.inbound_rate_bps||0);
            if(!bt[t.tool]) bt[t.tool] = {ts:[],cpu:[],mem_mb:[],tokens:[],traffic:[]};
            const th = bt[t.tool];
            th.ts=[...th.ts,data.timestamp]; th.cpu=[...th.cpu,Math.round(cpu*10)/10];
            th.mem_mb=[...th.mem_mb,Math.round(mem*10)/10]; th.tokens=[...th.tokens,tok];
            th.traffic=[...th.traffic,Math.round(tr*100)/100];
            if(th.ts.length>120){Object.keys(th).forEach(k=>th[k]=th[k].slice(-120));}
          });
          h.by_tool = bt;
          // Keep max 360 points
          if(h.ts.length>360) Object.keys(h).forEach(k=>{if(k!=='by_tool')h[k].shift();});
          return h;
        });
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        if(!closed) setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay*2, 30000);
      };
    }
    connect();
    fetch('/api/history').then(r=>r.json()).then(setHistory).catch(()=>{});
    return ()=>{ closed=true; if(es) es.close(); };
  },[]);

  // Keyboard shortcuts
  useEffect(()=>{
    const handler = e => {
      if(e.key==='Escape') setViewerPath(null);
      if(e.key==='/'&&document.activeElement!==searchRef.current) { e.preventDefault(); searchRef.current?.focus(); }
      if(e.key>='1'&&e.key<='6'&&document.activeElement!==searchRef.current) {
        setActiveTab(TABS[parseInt(e.key)-1].id);
      }
    };
    document.addEventListener('keydown', handler);
    return ()=>document.removeEventListener('keydown', handler);
  },[]);

  // Budget re-fetch on tab switch handled by TabBudget's own useEffect

  const openViewer = useCallback((path)=>setViewerPath(path),[]);

  // Search filter — applied to tools before rendering
  const filteredSnap = useMemo(()=>{
    if(!snap || !searchQuery) return snap;
    const q = searchQuery.toLowerCase();
    return {...snap, tools: snap.tools.filter(t=>
      t.label.toLowerCase().includes(q) ||
      t.files.some(f=>f.path.toLowerCase().includes(q)) ||
      t.processes.some(p=>(p.name||'').toLowerCase().includes(q) || (p.cmdline||'').toLowerCase().includes(q)) ||
      (t.live && (
        (t.live.workspaces||[]).some(w=>w.toLowerCase().includes(q)) ||
        (t.live.sources||[]).some(src=>src.toLowerCase().includes(q))
      ))
    )};
  },[snap, searchQuery]);

  const ctxValue = useMemo(()=>({snap: filteredSnap, history, openViewer}),[filteredSnap, history, openViewer]);

  const tabContent = {
    overview: html`<${TabOverview}/>`,
    procs: html`<${TabProcesses}/>`,
    mcp: html`<${TabMcp}/>`,
    memory: html`<${TabMemory}/>`,
    live: html`<${TabLive}/>`,
    budget: html`<${TabBudget} key=${'budget-'+activeTab}/>`,
  };

  return html`<${SnapContext.Provider} value=${ctxValue}>
    <div class="main-wrap">
      <header role="banner">
        <h1>aictl <span>live dashboard</span></h1>
        <div class="hdr-right">
          <input type="text" ref=${searchRef} class="search-box" placeholder="Filter... ( / )"
            aria-label="Filter tools" value=${searchQuery} onInput=${e=>setSearchQuery(e.target.value)}/>
          <button class="theme-btn" onClick=${cycleTheme} aria-label="Toggle theme: ${theme}"
            title="Theme: ${theme}">${THEME_ICONS[theme]}</button>
          <span class=${'conn '+(connected?'ok':'err')}>${connected?'live':'reconnecting...'}</span>
        </div>
      </header>
      <main class="main">
        <div style="position:sticky;top:0;z-index:50;background:var(--bg);padding:0.6rem 0 0.2rem">
          <${StatBar} snap=${snap} history=${history}/>
          <${ResourceBar} snap=${snap}/>
        </div>
        <nav class="tab-nav" role="tablist" aria-label="Dashboard tabs">
          ${TABS.map(t=>html`<button key=${t.id} class="tab-btn" role="tab"
            aria-selected=${activeTab===t.id} onClick=${()=>setActiveTab(t.id)}
            title="Shortcut: ${t.key}">${t.label} <span class="kbd">${t.key}</span></button>`)}
        </nav>
        <div role="tabpanel" aria-label=${TABS.find(t=>t.id===activeTab)?.label}>
          ${tabContent[activeTab]}
        </div>
      </main>
    </div>
    <${FileViewer} path=${viewerPath} onClose=${()=>setViewerPath(null)}/>
  </${SnapContext.Provider}>`;
}

// ─── Mount ─────────────────────────────────────────────────────
preactRender(html`<${App}/>`, document.getElementById('app'));
</script>
</body>
</html>
"""
