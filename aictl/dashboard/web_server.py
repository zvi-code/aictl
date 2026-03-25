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

class _SnapshotStore:
    """Thread-safe snapshot storage with version-based change notification."""

    def __init__(self) -> None:
        self._snap: DashboardSnapshot | None = None
        self._version: int = 0
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)
        # Ring buffer for time-series sparklines. Appended on each update()
        # call (tied to scan interval). At ~5.86s/tick, 360 entries ≈ 35 min.
        self._history: collections.deque[tuple] = collections.deque(maxlen=360)

    def update(self, snap: DashboardSnapshot) -> None:
        with self._condition:
            self._snap = snap
            self._version += 1
            self._history.append((
                snap.timestamp, snap.total_files, snap.total_tokens,
                snap.total_cpu, snap.total_mem_mb,
                snap.total_mcp_servers, snap.total_memory_tokens,
            ))
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
                               "mem_tokens": []})
        # Transpose rows → columns
        ts, files, tokens, cpu, mem_mb, mcp, mem_tokens = zip(*rows)
        return json.dumps({
            "ts": list(ts), "files": list(files), "tokens": list(tokens),
            "cpu": [round(v, 1) for v in cpu],
            "mem_mb": [round(v, 1) for v in mem_mb],
            "mcp": list(mcp), "mem_tokens": list(mem_tokens),
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

    def __init__(self, root: Path, interval: float,
                 store: _SnapshotStore, allowed: _AllowedPaths) -> None:
        super().__init__(daemon=True)
        self._root = root
        self._interval = interval
        self._store = store
        self._allowed = allowed
        self._stop = threading.Event()

    def run(self) -> None:
        while not self._stop.is_set():
            try:
                snap = collect(self._root, include_processes=True)
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
        body = _DASHBOARD_HTML.encode("utf-8")
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

def run_server(root: Path, host: str = "127.0.0.1", port: int = 8484,
               interval: float = 5.0, open_browser: bool = True) -> None:
    """Start the dashboard HTTP server. Blocks until Ctrl-C."""
    store = _SnapshotStore()
    allowed = _AllowedPaths()

    # Initial collection so /api/snapshot is ready immediately
    print("  collecting initial snapshot ...", file=sys.stderr)
    snap = collect(root, include_processes=True)
    store.update(snap)
    allowed.update(snap)

    # Start background refresh
    refresh = _RefreshThread(root, interval, store, allowed)
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

_TOOL_COLORS = {
    "claude-code": "#a78bfa", "claude-desktop": "#c4b5fd",
    "copilot": "#60a5fa", "copilot-vscode": "#93c5fd", "copilot-cli": "#3b82f6",
    "cursor": "#34d399", "windsurf": "#2dd4bf",
    "project-env": "#fbbf24", "aictl": "#94a3b8",
}

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

/* Stat cards — two-tier hierarchy */
.stat-primary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; margin-bottom: 0.3rem; }
.stat-secondary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; margin-bottom: 0.8rem; }
.stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.4rem 0.6rem; text-align: center; position: relative; overflow: hidden; }
.stat-card.primary { border-left: 3px solid var(--accent); }
.stat-card .label { color: var(--fg2); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-card.primary .value { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
.stat-card.secondary .value { font-size: 1.0rem; font-weight: 600; color: var(--fg2); }
.sparkline-wrap { height: 30px; margin-top: 2px; }
@keyframes flash { 0%{opacity:1} 50%{opacity:0.5} 100%{opacity:1} }
.flash { animation: flash 0.4s ease; }

/* Resource bar + legend */
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

/* Category groups */
.cat-group { margin-top: 0.4rem; }
.cat-head { cursor: pointer; padding: 0.25rem 0; font-size: 0.8rem; color: var(--fg2);
  display: flex; align-items: center; gap: 0.3rem; user-select: none;
  background: none; border: none; width: 100%; text-align: left; font: inherit; }
.cat-head:hover { color: var(--fg); }
.cat-head .carrow { font-size: 0.6rem; transition: transform 0.15s; }
.cat-head.open .carrow { transform: rotate(90deg); }

/* File items */
.fitem { padding: 0.15rem 0; font-size: 0.78rem; cursor: pointer; display: flex; gap: 0.4rem;
  background: none; border: none; width: 100%; text-align: left; color: inherit; font: inherit; }
.fitem:hover { background: var(--bg3); border-radius: 3px; }
.fpath { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fmeta { color: var(--fg2); white-space: nowrap; font-size: 0.72rem; }

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
.prow { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0; font-size: 0.78rem; }
.prow .pid { color: var(--green); min-width: 50px; }
.prow .pname { min-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prow .pcpu { min-width: 45px; text-align: right; }
.mem-bar { width: 80px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; position: relative; }
.mem-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.prow .pmem { min-width: 55px; text-align: right; color: var(--fg2); font-size: 0.72rem; }
.prow .anomaly-icon { color: var(--red); cursor: help; }

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
.budget-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 0.8rem; max-width: 500px; }
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

// ─── Constants ─────────────────────────────────────────────────
const COLORS = {
  'claude-code':'#a78bfa','claude-desktop':'#c4b5fd','claude-mcp-memory':'#c4b5fd',
  'copilot':'#60a5fa','copilot-vscode':'#93c5fd','copilot-cli':'#3b82f6',
  'cursor':'#34d399','windsurf':'#2dd4bf',
  'project-env':'#fbbf24','aictl':'#94a3b8','cross-tool':'#cbd5e1',
  'gemini-cli':'#34d399','opencode':'#94a3b8','aider':'#f472b6',
};
const SC = {running:'var(--green)',stopped:'var(--red)',error:'var(--orange)',unknown:'var(--fg2)'};
const THEMES = ['auto','dark','light'];
const THEME_ICONS = {auto:'\u263E',dark:'\u263E',light:'\u2600'};
const TAIL_LINES = 5;
const PREVIEW_LINES = 15;
const MEM_LABELS = {'claude-user-memory':'User Memory','claude-project-memory':'Project Memory','claude-auto-memory':'Auto Memory'};
const CAT_ORDER = ['instructions','config','rules','commands','skills','agent','memory','prompt','transcript','temp','runtime','credentials','extensions'];
const TABS = [
  {id:'overview', label:'Overview', key:'1'},
  {id:'procs', label:'Processes', key:'2'},
  {id:'mcp', label:'MCP Servers', key:'3'},
  {id:'memory', label:'Memory', key:'4'},
  {id:'budget', label:'Token Budget', key:'5'},
];

// ─── Module-level shared state ─────────────────────────────────
const fileCache = new Map();

// ─── Context ───────────────────────────────────────────────────
const SnapContext = createContext(null);

// ─── Utility Functions ─────────────────────────────────────────
function fmtK(n){return n>=1000?(n/1000).toFixed(1)+'k':''+n;}
function fmtSz(n){if(n<1024)return n+'B';if(n<1048576)return(n/1024).toFixed(1)+'KB';return(n/1048576).toFixed(1)+'MB';}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
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

// ─── Sparkline Component ───────────────────────────────────────
function Sparkline({data, color, smooth}) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(()=>{
    if(!ref.current || !data || data[0].length<2) return;
    const vals = smooth ? sma3(data[1]) : data[1];
    const plotData = [data[0], vals];
    if(chartRef.current) { chartRef.current.setData(plotData); return; }
    const opts = {
      width: ref.current.clientWidth || 100, height: 30,
      cursor:{show:false}, legend:{show:false}, select:{show:false},
      scales:{x:{time:false},y:{auto:true,range:(u,min,max)=>[Math.max(0,min*0.9),max*1.1]}},
      axes:[{show:false},{show:false}],
      series:[{},{stroke:color,width:1.5,fill:color+'20'}],
    };
    chartRef.current = new uPlot(opts, plotData, ref.current);
    return ()=>{ if(chartRef.current){chartRef.current.destroy();chartRef.current=null;} };
  },[data, color, smooth]);
  useEffect(()=>{
    if(!chartRef.current||!ref.current) return;
    const ro = new ResizeObserver(()=>{
      if(chartRef.current && ref.current) chartRef.current.setSize({width:ref.current.clientWidth,height:30});
    });
    ro.observe(ref.current);
    return ()=>ro.disconnect();
  },[]);
  return html`<div class="sparkline-wrap" ref=${ref}></div>`;
}

// ─── StatCard Component ────────────────────────────────────────
function StatCard({label, value, primary, sparkData, sparkColor, smooth}) {
  const prevRef = useRef(value);
  const [flashing, setFlashing] = useState(false);
  useEffect(()=>{
    if(prevRef.current !== value) { setFlashing(true); setTimeout(()=>setFlashing(false),500); }
    prevRef.current = value;
  },[value]);
  const cls = 'stat-card '+(primary?'primary':'secondary');
  return html`<div class=${cls} aria-label="${label}: ${value}">
    <div class="label">${label}</div>
    <div class=${'value'+(flashing?' flash':'')}>${value}</div>
    ${primary && sparkData && html`<${Sparkline} data=${sparkData} color=${sparkColor||'var(--accent)'} smooth=${smooth}/>`}
  </div>`;
}

// ─── StatBar Component ─────────────────────────────────────────
function StatBar({snap: s, history: hist}) {
  const sparkFor = (key) => {
    if(!hist || !hist.ts || hist.ts.length<2) return null;
    return [hist.ts, hist[key]];
  };
  if(!s) return null;
  return html`
    <div class="stat-primary">
      <${StatCard} label="Files" value=${s.total_files} primary sparkData=${sparkFor('files')} sparkColor="var(--accent)" />
      <${StatCard} label="Tokens" value=${fmtK(s.total_tokens)} primary sparkData=${sparkFor('tokens')} sparkColor="var(--green)" />
      <${StatCard} label="CPU" value=${s.total_cpu+'%'} primary sparkData=${sparkFor('cpu')} sparkColor="var(--orange)" smooth />
      <${StatCard} label="Memory" value=${fmtSz(s.total_mem_mb*1048576)} primary sparkData=${sparkFor('mem_mb')} sparkColor="var(--yellow)" />
    </div>
    <div class="stat-secondary">
      <${StatCard} label="Processes" value=${s.total_processes} />
      <${StatCard} label="Size" value=${fmtSz(s.total_size)} />
      <${StatCard} label="MCP" value=${s.total_mcp_servers} />
      <${StatCard} label="Agent Mem" value=${fmtK(s.total_memory_tokens)+'t'} />
    </div>`;
}

// ─── ResourceBar Component ─────────────────────────────────────
function ResourceBar({snap: s}) {
  if(!s) return null;
  const tools = s.tools.filter(t=>t.tool!=='aictl'&&t.files.length);
  const total = tools.reduce((a,t)=>a+t.files.length,0)||1;
  return html`
    <div class="rbar">${tools.map(t=>html`
      <div class="rbar-seg" style=${'width:'+(t.files.length/total*100).toFixed(1)+'%;background:'+(COLORS[t.tool]||'#94a3b8')}
        title="${t.label}: ${t.files.length} files"></div>`)}
    </div>
    <div class="rbar-legend">${tools.map(t=>html`
      <span class="rbar-legend-item">
        <span class="rbar-legend-dot" style=${'background:'+(COLORS[t.tool]||'#94a3b8')}></span>
        ${t.label} <span style="color:var(--fg2)">${t.files.length}</span>
      </span>`)}
    </div>`;
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
function FileItem({file, dirPrefix}) {
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const ctx = useContext(SnapContext);
  const name = file.path.split('/').pop();
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
      <span class="fpath">${dirPrefix ? html`<span style="color:var(--fg2)">${dirPrefix}/</span>` : ''}${esc(name)}</span>
      <span class="fmeta">${fmtSz(file.size)}${file.tokens?' ~'+fmtK(file.tokens)+'t':''}</span>
    </button>
    ${showPreview && html`<div class="inline-preview">${renderPreview()}</div>`}
  </div>`;
}

// ─── CatGroup Component ───────────────────────────────────────
function CatGroup({label, files, root, badge, style, startOpen}) {
  const [isOpen, setOpen] = useState(!!startOpen);
  const dirGroups = useMemo(()=>groupByDir(files,root),[files,root]);
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
      <span>${esc(label)}</span> <span class="badge">${badge||files.length}</span>
    </button>
    ${isOpen && html`<div style="padding-left:0.8rem">${renderFiles()}</div>`}
  </div>`;
}
function DirGroup({dir, files}) {
  const [isOpen, setOpen] = useState(false);
  return html`<div class="cat-group" style="margin-left:0.5rem">
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      <span style="color:var(--fg2)">${esc(dir)}</span> <span class="badge">${files.length}</span>
    </button>
    ${isOpen && html`<div style="padding-left:0.8rem">${files.map(f=>html`<${FileItem} key=${f.path} file=${f}/>`)}</div>`}
  </div>`;
}

// ─── ProcRow Component ─────────────────────────────────────────
function ProcRow({proc: p, maxMem}) {
  const mem=parseFloat(p.mem_mb)||0, pct=Math.min(mem/maxMem*100,100);
  const barColor=(p.anomalies&&p.anomalies.length)?'var(--red)':mem>200?'var(--orange)':'var(--green)';
  return html`<div class="prow">
    <span class="pid">${p.pid}</span>
    <span class="pname" title=${p.cmdline}>${esc(p.name)}</span>
    <span class="pcpu">${p.cpu_pct}%</span>
    <div class="mem-bar"><div class="mem-bar-fill" style=${'width:'+pct.toFixed(0)+'%;background:'+barColor}></div></div>
    <span class="pmem">${p.mem_mb}MB</span>
    ${p.anomalies&&p.anomalies.length && html`<span class="anomaly-icon" title=${p.anomalies.join('; ')}>\u26A0</span>`}
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

// ─── ToolCard Component ────────────────────────────────────────
function ToolCard({tool: t, root}) {
  const [isOpen, setOpen] = useState(false);
  const c = COLORS[t.tool]||'#94a3b8';
  const tok = t.files.reduce((a,f)=>a+f.tokens,0);
  const anom = t.processes.filter(p=>p.anomalies&&p.anomalies.length).length;
  const maxMem = useMemo(()=>Math.max(...t.processes.map(p=>parseFloat(p.mem_mb)||0),100),[t.processes]);
  const cats = useMemo(()=>{
    const c={};
    t.files.forEach(f=>{const k=f.kind||'other';(c[k]=c[k]||[]).push(f);});
    return Object.keys(c).sort((a,b)=>{
      const ai=CAT_ORDER.indexOf(a),bi=CAT_ORDER.indexOf(b);
      return (ai<0?99:ai)-(bi<0?99:bi);
    }).map(k=>({kind:k, files:c[k]}));
  },[t.files]);
  const cls = 'tcard'+(isOpen?' open':'')+(anom?' has-anomaly':'');
  return html`<div class=${cls}>
    <button class="tcard-head" onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="arrow">\u25B6</span>
      <h2><span class="dot" style=${'background:'+c}></span>${esc(t.label)}</h2>
      <span class="badge">${t.files.length} files</span>
      <span class="badge">${fmtK(tok)} tok</span>
      ${t.processes.length>0 && html`<span class="badge">${t.processes.length} proc</span>`}
      ${t.mcp_servers.length>0 && html`<span class="badge">${t.mcp_servers.length} MCP</span>`}
      ${anom>0 && html`<span class="badge warn">${anom} anomaly</span>`}
    </button>
    ${isOpen && html`<div class="tcard-body">
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
    return s.tools.filter(t=>t.tool!=='aictl'&&(t.files.length||t.processes.length||t.mcp_servers.length))
      .sort((a,b)=>(b.files.length+b.processes.length+b.mcp_servers.length)-(a.files.length+a.processes.length+a.mcp_servers.length));
  },[s]);
  if(!s) return html`<p style="color:var(--fg2)">Loading...</p>`;
  if(!tools.length) return html`<p style="color:var(--fg2)">No AI tool resources found.</p>`;
  return html`<div class="tool-grid">
    ${tools.map(t=>html`<${ToolCard} key=${t.tool} tool=${t} root=${s.root}/>`)}
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
      style="padding:0.4rem 0.5rem;font-size:0.85rem">
      <span class="carrow">\u25B6</span>
      <span class="dot" style=${'background:'+c}></span>
      <strong>${esc(label)}</strong>
      <span class="badge">${procs.length} proc</span>
      <span class="badge">CPU ${totalCpu.toFixed(1)}%</span>
      <span class="badge">MEM ${totalMem.toFixed(0)}MB</span>
      ${anomCount>0 && html`<span class="badge warn">${anomCount} anomaly</span>`}
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
  return html`<div>
    <button class="fitem" style="border-top:1px solid var(--border);padding:0.2rem 0.8rem" onClick=${toggle}
      aria-expanded=${showPreview} title=${mem.file}>
      <span class="fpath">${esc(name)}</span>
      <span class="fmeta">${mem.tokens}tok ${mem.lines}ln</span>
    </button>
    ${showPreview && html`<div class="inline-preview" style="margin:0 0.8rem 0.4rem">${renderPreview()}</div>`}
  </div>`;
}
function MemProfileGroup({profile, items}) {
  const [isOpen, setOpen] = useState(items.length<=5);
  const profTok = items.reduce((a,m)=>a+m.tokens,0);
  return html`<div class="cat-group" style="margin:0 0.5rem">
    <button class=${'cat-head'+(isOpen?' open':'')} onClick=${()=>setOpen(!isOpen)} aria-expanded=${isOpen}>
      <span class="carrow">\u25B6</span>
      <span style="color:var(--orange);font-weight:600">${esc(profile)}</span>
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

// ─── TabBudget ─────────────────────────────────────────────────
function TabBudget() {
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState(false);
  useEffect(()=>{
    fetch('/api/budget').then(r=>r.json()).then(setBudget).catch(()=>setError(true));
  },[]);
  if(error) return html`<p style="color:var(--red)">Failed to load budget.</p>`;
  if(!budget) return html`<p style="color:var(--fg2)">Loading...</p>`;
  const rows = [
    ['Always loaded (every call)', '~'+fmtK(budget.always_loaded_tokens)+' tokens'],
    ['On-demand (when invoked)', '~'+fmtK(budget.on_demand_tokens)+' tokens'],
    ['Conditional (file-matched)', '~'+fmtK(budget.conditional_tokens)+' tokens'],
    ['Cacheable portion', '~'+fmtK(budget.cacheable_tokens)+' tokens'],
    ['Survives compaction', '~'+fmtK(budget.survives_compaction_tokens)+' tokens'],
  ];
  return html`<div class="budget-card">
    <h3 style="margin-bottom:0.5rem;color:var(--accent)">Token Budget Analysis</h3>
    ${rows.map(([l,v])=>html`<div class="brow"><span class="blabel">${l}</span><span class="bval">${v}</span></div>`)}
    <div class="brow" style="font-weight:700">
      <span>Total potential overhead</span>
      <span class="bval" style="color:var(--accent)">~${fmtK(budget.total_potential_tokens)} tokens</span>
    </div>
    <div class="brow"><span class="blabel">Files never sent to LLM</span><span class="bval">${budget.never_sent_count}</span></div>
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
        // Append to history client-side
        setHistory(prev => {
          if(!prev) return prev;
          const h = {...prev};
          Object.keys(h).forEach(k=>{ h[k] = [...h[k]]; });
          h.ts.push(data.timestamp);
          h.files.push(data.total_files);
          h.tokens.push(data.total_tokens);
          h.cpu.push(Math.round(data.total_cpu*10)/10);
          h.mem_mb.push(Math.round(data.total_mem_mb*10)/10);
          h.mcp.push(data.total_mcp_servers);
          h.mem_tokens.push(data.total_memory_tokens);
          // Keep max 360 points
          if(h.ts.length>360) Object.keys(h).forEach(k=>h[k].shift());
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
      if(e.key>='1'&&e.key<='5'&&document.activeElement!==searchRef.current) {
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
      t.files.some(f=>f.path.toLowerCase().includes(q))
    )};
  },[snap, searchQuery]);

  const ctxValue = useMemo(()=>({snap: filteredSnap, history, openViewer}),[filteredSnap, history, openViewer]);

  const tabContent = {
    overview: html`<${TabOverview}/>`,
    procs: html`<${TabProcesses}/>`,
    mcp: html`<${TabMcp}/>`,
    memory: html`<${TabMemory}/>`,
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
