"""Live web dashboard server with REST + SSE API.

Serves a self-contained HTML dashboard at / with real-time updates via
Server-Sent Events, plus REST endpoints for snapshot data, file content
inspection, and token budget analysis.
"""

from __future__ import annotations

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

    def update(self, snap: DashboardSnapshot) -> None:
        with self._condition:
            self._snap = snap
            self._version += 1
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
.dash { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
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
.sticky-stats { position: sticky; top: 0; z-index: 50; background: var(--bg); padding: 0.6rem 0 0.2rem; }
.main { flex: 1; overflow: auto; padding: 0.6rem 1.2rem; }
.kbd { font-size: 0.6rem; color: var(--fg2); padding: 0.1rem 0.3rem; border: 1px solid var(--border);
  border-radius: 2px; font-family: monospace; margin-left: 0.2rem; }

/* Stat cards */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.4rem; margin-bottom: 0.8rem; }
.stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.4rem 0.6rem; text-align: center; }
.stat-card .label { color: var(--fg2); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-card .value { font-size: 1.2rem; font-weight: 700; color: var(--accent); transition: color 0.3s; }
.stat-card .value.changed { color: var(--orange); }

/* Smooth update flash */
@keyframes flash { 0%{opacity:1} 50%{opacity:0.5} 100%{opacity:1} }
.flash { animation: flash 0.4s ease; }

/* Resource bar */
.rbar { display: flex; height: 6px; border-radius: 3px; overflow: hidden;
  margin-bottom: 0.8rem; background: var(--border); }
.rbar-seg { transition: width 0.3s; }

/* Tabs */
.tab-nav { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 0.8rem; }
.tab-btn { background: none; border: none; color: var(--fg2); padding: 0.4rem 0.8rem;
  cursor: pointer; font-size: 0.8rem; border-bottom: 2px solid transparent; }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* Tool grid — overview cards collapsed */
.tool-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.6rem; }
.tcard { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s; }
.tcard:hover { border-color: var(--accent); }
.tcard.has-anomaly { border-color: var(--red); box-shadow: 0 0 8px rgba(248,113,113,0.15); }
.tcard.hidden-by-search { display: none; }
.tcard-head { padding: 0.6rem 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
.tcard-head:hover { background: var(--bg3); }
.tcard-head h2 { font-size: 0.9rem; flex: 1; display: flex; align-items: center; gap: 0.4rem; }
.tcard-head .arrow { color: var(--fg2); font-size: 0.7rem; transition: transform 0.2s; }
.tcard.open .arrow { transform: rotate(90deg); }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.badge { display: inline-block; background: var(--border); color: var(--fg2);
  padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.65rem; margin-left: 0.2rem; }
.badge.warn { background: var(--red); color: #fff; }
.tcard-body { display: none; padding: 0 0.8rem 0.6rem; }
.tcard.open .tcard-body { display: block; }

/* Category groups inside expanded card */
.cat-group { margin-top: 0.4rem; }
.cat-head { cursor: pointer; padding: 0.25rem 0; font-size: 0.8rem; color: var(--fg2);
  display: flex; align-items: center; gap: 0.3rem; user-select: none; }
.cat-head:hover { color: var(--fg); }
.cat-head .carrow { font-size: 0.6rem; transition: transform 0.15s; }
.cat-group.open .carrow { transform: rotate(90deg); }
.cat-files { display: none; padding-left: 0.8rem; }
.cat-group.open .cat-files { display: block; }

/* File items */
.fitem-wrap { }
.fitem { padding: 0.15rem 0; font-size: 0.78rem; cursor: pointer; display: flex; gap: 0.4rem; }
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
.inline-preview .prev-btn {
  display: inline-block; padding: 0.1rem 0.4rem; background: var(--border);
  color: var(--fg2); border: none; border-radius: 3px; font-size: 0.68rem; cursor: pointer; }
.inline-preview .prev-btn:hover { background: var(--accent); color: var(--bg); }

/* Process rows with memory bar */
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
.fv.hidden { display: none; }
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

/* Process tab table */
.ptable .mem-bar { width: 100px; }

/* Budget */
.budget-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 0.8rem; max-width: 500px; }
.brow { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid var(--border); }
.brow:last-child { border-bottom: none; }
.blabel { color: var(--fg2); }
.bval { font-weight: 600; }

/* Memory tab */
.mem-group { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.6rem; overflow: hidden; }
.mem-group-head { padding: 0.5rem 0.8rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.3rem; }
.mem-group-head:hover { background: var(--bg3); }
.mem-group-body { display: none; }
.mem-group.open .mem-group-body { display: block; }
.mem-item { padding: 0.2rem 0.8rem; font-size: 0.78rem; cursor: pointer; display: flex; gap: 0.4rem; border-top: 1px solid var(--border); }
.mem-item:hover { background: var(--bg3); }
</style>
</head>
<body>
<div class="dash">
<header>
  <h1>aictl <span>live dashboard</span></h1>
  <div class="hdr-right">
    <input type="text" id="search" class="search-box" placeholder="Filter... ( / )" />
    <button class="theme-btn" onclick="cycleTheme()" id="theme-btn" title="Toggle dark/light mode">&#9790;</button>
    <span id="conn" class="conn ok">live</span>
  </div>
</header>
<div class="main">

<div class="sticky-stats">
  <div id="stats" class="stat-grid"></div>
  <div id="rbar" class="rbar"></div>
</div>

<div class="tab-nav">
  <button class="tab-btn active" onclick="switchTab('overview',this)">Overview <span class="kbd">1</span></button>
  <button class="tab-btn" onclick="switchTab('procs',this)">Processes <span class="kbd">2</span></button>
  <button class="tab-btn" onclick="switchTab('mcp',this)">MCP Servers <span class="kbd">3</span></button>
  <button class="tab-btn" onclick="switchTab('memory',this)">Memory <span class="kbd">4</span></button>
  <button class="tab-btn" onclick="switchTab('budget',this)">Token Budget <span class="kbd">5</span></button>
</div>

<div id="tab-overview" class="tab-panel active"></div>
<div id="tab-procs" class="tab-panel"></div>
<div id="tab-mcp" class="tab-panel"></div>
<div id="tab-memory" class="tab-panel"></div>
<div id="tab-budget" class="tab-panel"></div>

</div>
</div>

<div id="fv" class="fv hidden">
  <div class="fv-head">
    <span class="path" id="fv-path"></span>
    <button onclick="closeViewer()">Close (Esc)</button>
  </div>
  <div class="fv-meta" id="fv-meta"></div>
  <div class="fv-body" id="fv-body"></div>
  <div class="fv-toolbar" id="fv-toolbar">
    <span id="fv-info"></span>
    <button id="fv-toggle" onclick="toggleFullContent()" style="display:none">Show all</button>
  </div>
</div>

<script>
const COLORS = {
  'claude-code':'#a78bfa','claude-desktop':'#c4b5fd','claude-mcp-memory':'#c4b5fd',
  'copilot':'#60a5fa','copilot-vscode':'#93c5fd','copilot-cli':'#3b82f6',
  'cursor':'#34d399','windsurf':'#2dd4bf',
  'project-env':'#fbbf24','aictl':'#94a3b8','cross-tool':'#cbd5e1',
  'gemini-cli':'#34d399','opencode':'#94a3b8','aider':'#f472b6',
};
const SC = {running:'var(--green)',stopped:'var(--red)',error:'var(--orange)',unknown:'var(--fg2)'};
let snap = null, fullContent = '', openCards = new Set(), openCats = new Set();
let prevStats = {};
let userInteracted = false; // pause SSE re-renders while user is interacting
let interactTimer = null;

// === Theme ===
const themes = ['auto','dark','light'];
const themeIcons = {auto:'\u263E',dark:'\u263E',light:'\u2600'};
let themeIdx = 0;
function cycleTheme() {
  themeIdx = (themeIdx+1)%themes.length;
  const t = themes[themeIdx];
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-btn').textContent = themeIcons[t];
  document.getElementById('theme-btn').title = 'Theme: '+t;
  try { localStorage.setItem('aictl-theme', t); } catch(e){}
}
(function initTheme(){
  try { const t=localStorage.getItem('aictl-theme'); if(t){themeIdx=themes.indexOf(t);
    if(themeIdx>=0){document.documentElement.setAttribute('data-theme',t);
    document.getElementById('theme-btn').textContent=themeIcons[t];}else themeIdx=0;}} catch(e){}
})();

// === Search ===
const searchEl = document.getElementById('search');
searchEl.addEventListener('input', applySearch);
function applySearch() {
  const q = searchEl.value.toLowerCase().trim();
  document.querySelectorAll('.tcard').forEach(card => {
    if(!q) { card.classList.remove('hidden-by-search'); return; }
    const text = card.textContent.toLowerCase();
    card.classList.toggle('hidden-by-search', !text.includes(q));
  });
}

// === SSE ===
function connectSSE() {
  const es = new EventSource('/api/stream');
  es.onmessage = e => { snap = JSON.parse(e.data); render(snap);
    document.getElementById('conn').className='conn ok'; document.getElementById('conn').textContent='live'; };
  es.onerror = () => { document.getElementById('conn').className='conn err'; document.getElementById('conn').textContent='reconnecting...'; };
}

// === Keyboard ===
document.addEventListener('keydown', e => {
  if(e.key==='Escape') closeViewer();
  if(e.key==='/' && document.activeElement!==searchEl) { e.preventDefault(); searchEl.focus(); }
  if(e.key>='1'&&e.key<='5'&&document.activeElement!==searchEl) {
    const tabs=['overview','procs','mcp','memory','budget'];
    const btn=document.querySelectorAll('.tab-btn')[parseInt(e.key)-1];
    if(btn) switchTab(tabs[parseInt(e.key)-1],btn);
  }
});

// === Tabs ===
function switchTab(name, btn) {
  userInteracted = false; // fresh render for new tab
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(btn) btn.classList.add('active');
  if(!snap) return;
  if(name==='overview') renderOverview(snap);
  else if(name==='procs') renderProcs(snap);
  else if(name==='mcp') renderMCP(snap);
  else if(name==='memory') renderMemory(snap);
  else if(name==='budget') loadBudget();
}

// === Render ===
function markInteracted() {
  userInteracted = true;
  clearTimeout(interactTimer);
  interactTimer = setTimeout(() => { userInteracted = false; }, 30000); // resume after 30s idle
}

function render(s) {
  renderStats(s);
  renderBar(s);
  // Skip tab re-render while user is interacting (e.g. viewing inline preview)
  if(userInteracted) return;
  const active = document.querySelector('.tab-panel.active');
  if(active) {
    const id = active.id;
    if(id==='tab-overview') renderOverview(s);
    else if(id==='tab-procs') renderProcs(s);
    else if(id==='tab-mcp') renderMCP(s);
    else if(id==='tab-memory') renderMemory(s);
  }
  applySearch();
}

function renderStats(s) {
  const c = [['Files',s.total_files],['Tokens',fmtK(s.total_tokens)],['Size',fmtSz(s.total_size)],
    ['Processes',s.total_processes],['CPU',s.total_cpu+'%'],['Proc Mem',fmtSz(s.total_mem_mb*1048576)],
    ['MCP',s.total_mcp_servers],['Agent Mem',fmtK(s.total_memory_tokens)+'t']];
  const el = document.getElementById('stats');
  // First render: build cards
  if(!el.children.length) {
    el.innerHTML = c.map(([l,v])=>
      `<div class="stat-card"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
  } else {
    // Subsequent renders: only update changed values with flash
    c.forEach(([l,v],i) => {
      const valEl = el.children[i]?.querySelector('.value');
      if(valEl && valEl.textContent !== ''+v) {
        valEl.textContent = v;
        valEl.classList.add('flash');
        setTimeout(()=>valEl.classList.remove('flash'), 500);
      }
    });
  }
}

function renderBar(s) {
  const tools = s.tools.filter(t=>t.tool!=='aictl');
  const total = tools.reduce((a,t)=>a+t.files.length,0) || 1;
  document.getElementById('rbar').innerHTML = tools.filter(t=>t.files.length).map(t =>
    `<div class="rbar-seg" style="width:${(t.files.length/total*100).toFixed(1)}%;background:${COLORS[t.tool]||'#94a3b8'}" title="${t.label}: ${t.files.length} files"></div>`
  ).join('');
}

function renderOverview(s) {
  const el = document.getElementById('tab-overview');
  const tools = s.tools.filter(t => t.tool!=='aictl' && (t.files.length||t.processes.length||t.mcp_servers.length));
  if(!tools.length){el.innerHTML='<p style="color:var(--fg2)">No AI tool resources found.</p>';return;}
  // Sort by weight: files + processes + MCP, heaviest first
  tools.sort((a,b) => (b.files.length+b.processes.length+b.mcp_servers.length)-(a.files.length+a.processes.length+a.mcp_servers.length));
  el.innerHTML = '<div class="tool-grid">' + tools.map(t => {
    const c = COLORS[t.tool]||'#94a3b8';
    const isOpen = openCards.has(t.tool);
    const tok = t.files.reduce((a,f)=>a+f.tokens,0);
    const anom = t.processes.filter(p=>p.anomalies&&p.anomalies.length).length;
    return `<div class="tcard${isOpen?' open':''}${anom?' has-anomaly':''}" id="tc-${t.tool}">
      <div class="tcard-head" onclick="toggleCard('${t.tool}')">
        <h2><span class="dot" style="background:${c}"></span>${esc(t.label)}</h2>
        <span class="badge">${t.files.length} files</span>
        <span class="badge">${fmtK(tok)} tok</span>
        ${t.processes.length?`<span class="badge">${t.processes.length} proc</span>`:''}
        ${t.mcp_servers.length?`<span class="badge">${t.mcp_servers.length} MCP</span>`:''}
        ${anom?`<span class="badge warn">${anom} anomaly</span>`:''}
        <span class="arrow">&#9654;</span>
      </div>
      <div class="tcard-body">${isOpen?renderToolBody(t,s):''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

function toggleCard(tool) {
  markInteracted();
  if(openCards.has(tool)) openCards.delete(tool); else openCards.add(tool);
  if(snap) renderOverview(snap);
}

function renderToolBody(t, s) {
  // Group files by category
  const cats = {};
  t.files.forEach(f => { const k=f.kind||'other'; (cats[k]=cats[k]||[]).push(f); });
  const catOrder = ['instructions','config','rules','commands','skills','agent','memory','prompt','transcript','temp','runtime','credentials','extensions'];
  const sorted = Object.keys(cats).sort((a,b) => {
    const ai=catOrder.indexOf(a), bi=catOrder.indexOf(b);
    return (ai<0?99:ai)-(bi<0?99:bi);
  });
  let html = sorted.map(cat => {
    const files = cats[cat];
    const key = t.tool+'|'+cat;
    const isOpen = openCats.has(key);
    // Group files by directory within category
    const dirGroups = groupByDir(files, s.root);
    return `<div class="cat-group${isOpen?' open':''}">
      <div class="cat-head" onclick="toggleCat('${esc(key)}')">
        <span class="carrow">&#9654;</span>
        <span>${esc(cat)}</span> <span class="badge">${files.length}</span>
      </div>
      <div class="cat-files">${renderDirTree(dirGroups, s, key)}</div>
    </div>`;
  }).join('');

  // Processes with memory bars
  if(t.processes.length) {
    const maxMem = Math.max(...t.processes.map(p=>parseFloat(p.mem_mb)||0), 100);
    html += `<div class="proc-section"><h3>Processes</h3>` +
      t.processes.map(p => {
        const mem = parseFloat(p.mem_mb)||0;
        const pct = Math.min(mem/maxMem*100, 100);
        const barColor = (p.anomalies&&p.anomalies.length)?'var(--red)':mem>200?'var(--orange)':'var(--green)';
        return `<div class="prow">
          <span class="pid">${p.pid}</span>
          <span class="pname" title="${esc(p.cmdline)}">${esc(p.name)}</span>
          <span class="pcpu">${p.cpu_pct}%</span>
          <div class="mem-bar"><div class="mem-bar-fill" style="width:${pct.toFixed(0)}%;background:${barColor}"></div></div>
          <span class="pmem">${p.mem_mb}MB</span>
          ${p.anomalies&&p.anomalies.length?`<span class="anomaly-icon" title="${esc(p.anomalies.join('; '))}">&#9888;</span>`:''}
        </div>`;
      }).join('') + `</div>`;
  }

  // MCP inline
  if(t.mcp_servers.length) {
    html += `<div class="proc-section"><h3>MCP Servers</h3>` +
      t.mcp_servers.map(m => {
        const cfg = m.config||{};
        return `<div class="fitem"><span class="fpath" style="color:var(--green)">${esc(m.name)}</span>
          <span class="fmeta">${esc(cfg.command||'')} ${(cfg.args||[]).join(' ').slice(0,60)}</span></div>`;
      }).join('') + `</div>`;
  }
  return html;
}

// === Directory tree helpers ===
function scopeLabel(path, root) {
  if(path.startsWith(root+'/')) return 'project';
  if(path.includes('/.claude/projects/')) return 'shadow';
  if(path.includes('/.claude/') || path.includes('/.config/') || path.includes('/Library/')) return 'global';
  if(path.includes('/.copilot/') || path.includes('/.vscode/')) return 'global';
  return 'external';
}
function shortDir(path, root) {
  // Return a short, meaningful directory label
  if(path.startsWith(root+'/')) {
    const rel = path.slice(root.length+1);
    const parts = rel.split('/');
    parts.pop(); // remove filename
    return parts.length ? parts.join('/') : '(root)';
  }
  // For global/shadow paths, show from last meaningful segment
  const parts = path.split('/');
  parts.pop(); // remove filename
  // Find the tool-specific root: .claude, .copilot, .cursor, etc.
  for(let i=parts.length-1; i>=0; i--) {
    if(parts[i].startsWith('.') && parts[i].length>1 && parts[i]!=='..') {
      return '~/' + parts.slice(i).join('/');
    }
    if(parts[i]==='Library') {
      return '~/' + parts.slice(i).join('/');
    }
  }
  return parts.slice(-2).join('/');
}
function groupByDir(files, root) {
  const groups = {};
  files.forEach(f => {
    const scope = scopeLabel(f.path, root);
    const dir = shortDir(f.path, root);
    const label = scope === 'project' ? dir : `${scope}: ${dir}`;
    (groups[label] = groups[label] || []).push(f);
  });
  // Sort: project first, then global, then shadow, then external
  const order = {project:0, global:1, shadow:2, external:3};
  return Object.entries(groups).sort((a,b) => {
    const sa = a[1][0] ? scopeLabel(a[1][0].path, root) : 'z';
    const sb = b[1][0] ? scopeLabel(b[1][0].path, root) : 'z';
    return (order[sa]||9) - (order[sb]||9);
  });
}
function renderDirTree(dirGroups, s, parentKey) {
  if(dirGroups.length === 1 && dirGroups[0][1].length <= 3) {
    // Single small dir — show files flat, no nesting
    return dirGroups[0][1].map(f => renderFileItem(f)).join('');
  }
  return dirGroups.map(([dir, files]) => {
    // Single-file dirs: show inline "dir/filename" without collapsible wrapper
    if(files.length === 1) {
      const f = files[0];
      const name = f.path.split('/').pop();
      const pid = 'fp'+(previewCounter++);
      return `<div class="fitem-wrap" style="margin-left:0.5rem">
        <div class="fitem" onclick="toggleInlinePreview('${pid}','${esc(f.path)}')">
          <span class="fpath" title="${esc(f.path)}"><span style="color:var(--fg2)">${esc(dir)}/</span>${esc(name)}</span>
          <span class="fmeta">${fmtSz(f.size)}${f.tokens?' ~'+fmtK(f.tokens)+'t':''}</span>
        </div>
        <div class="inline-preview" id="${pid}" style="display:none"></div>
      </div>`;
    }
    const dirKey = parentKey + '|' + dir;
    const isOpen = openCats.has(dirKey);
    return `<div class="cat-group${isOpen?' open':''}" style="margin-left:0.5rem">
      <div class="cat-head" onclick="toggleCat('${esc(dirKey)}')">
        <span class="carrow">&#9654;</span>
        <span style="color:var(--fg2)">${esc(dir)}</span> <span class="badge">${files.length}</span>
      </div>
      <div class="cat-files">${files.map(f => renderFileItem(f)).join('')}</div>
    </div>`;
  }).join('');
}
let previewCounter = 0;
function renderFileItem(f) {
  const name = f.path.split('/').pop();
  const pid = 'fp'+(previewCounter++);
  return `<div class="fitem-wrap">
    <div class="fitem" onclick="toggleInlinePreview('${pid}','${esc(f.path)}')">
      <span class="fpath" title="${esc(f.path)}">${esc(name)}</span>
      <span class="fmeta">${fmtSz(f.size)}${f.tokens?' ~'+fmtK(f.tokens)+'t':''}</span>
    </div>
    <div class="inline-preview" id="${pid}" style="display:none"></div>
  </div>`;
}

function toggleCat(key) {
  markInteracted();
  if(openCats.has(key)) openCats.delete(key); else openCats.add(key);
  if(!snap) return;
  // Re-render the tab that owns this key
  if(key.startsWith('mem|')) renderMemory(snap);
  else renderOverview(snap);
}

// === Processes tab (all tools) ===
function renderProcs(s) {
  const el = document.getElementById('tab-procs');
  const all = [];
  s.tools.forEach(t => t.processes.forEach(p => all.push({...p, _tool:t.tool, _label:t.label})));
  if(!all.length){el.innerHTML='<p style="color:var(--fg2)">No processes detected. Run with --processes or wait for refresh.</p>';return;}
  const maxMem = Math.max(...all.map(p=>parseFloat(p.mem_mb)||0),100);
  el.innerHTML = `<table class="ptable"><thead><tr><th>PID</th><th>Tool</th><th>Name</th><th>Type</th><th>CPU</th><th>Memory</th><th></th><th></th></tr></thead><tbody>
    ${all.sort((a,b)=>(parseFloat(b.mem_mb)||0)-(parseFloat(a.mem_mb)||0)).map(p => {
      const mem=parseFloat(p.mem_mb)||0; const pct=Math.min(mem/maxMem*100,100);
      const barColor=(p.anomalies&&p.anomalies.length)?'var(--red)':mem>200?'var(--orange)':'var(--green)';
      return `<tr>
        <td style="color:var(--green)">${p.pid}</td>
        <td><span class="dot" style="background:${COLORS[p._tool]||'#94a3b8'};width:7px;height:7px"></span> ${esc(p._label)}</td>
        <td title="${esc(p.cmdline)}">${esc(p.name)}</td>
        <td style="color:var(--fg2)">${esc(p.process_type||'')}</td>
        <td>${p.cpu_pct}%</td>
        <td><div class="mem-bar"><div class="mem-bar-fill" style="width:${pct.toFixed(0)}%;background:${barColor}"></div></div></td>
        <td style="color:var(--fg2)">${p.mem_mb}MB</td>
        <td>${p.anomalies&&p.anomalies.length?`<span class="anomaly-icon" title="${esc(p.anomalies.join('; '))}">&#9888;</span>`:''}</td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

// === MCP ===
function renderMCP(s) {
  const el = document.getElementById('tab-mcp');
  if(!s.mcp_detail.length){el.innerHTML='<p style="color:var(--fg2)">No MCP servers configured.</p>';return;}
  el.innerHTML = `<table><thead><tr><th></th><th>Server</th><th>Tool</th><th>Transport</th><th>Endpoint</th><th>Status</th></tr></thead><tbody>
    ${s.mcp_detail.map(m=>`<tr>
      <td><span class="status-dot" style="background:${SC[m.status]||'var(--fg2)'}"></span></td>
      <td>${esc(m.name)}</td><td>${esc(m.tool)}</td><td>${esc(m.transport)}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(m.endpoint)}">${esc((m.endpoint||'').slice(0,80))}</td>
      <td>${m.status}${m.pid?' (PID '+m.pid+')':''}</td>
    </tr>`).join('')}</tbody></table>`;
}

// === Memory ===
function renderMemory(s) {
  const el = document.getElementById('tab-memory');
  if(!s.agent_memory.length){el.innerHTML='<p style="color:var(--fg2)">No agent memory found.</p>';return;}
  const LABELS = {'claude-user-memory':'User Memory','claude-project-memory':'Project Memory','claude-auto-memory':'Auto Memory'};
  const groups = {};
  s.agent_memory.forEach(m=>{(groups[m.source]=groups[m.source]||[]).push(m);});
  el.innerHTML = Object.entries(groups).map(([src,entries])=>{
    const isOpen = openCats.has('mem|'+src);
    // Group entries by directory
    const dirGroups = {};
    entries.forEach(m => {
      const dir = shortDir(m.file, s.root);
      (dirGroups[dir] = dirGroups[dir] || []).push(m);
    });
    return `<div class="mem-group${isOpen?' open':''}">
      <div class="mem-group-head" onclick="toggleCat('mem|${src}')">
        <span class="carrow" style="font-size:0.6rem">&#9654;</span>
        ${esc(LABELS[src]||src)} <span class="badge">${entries.length}</span>
        <span class="badge">${fmtK(entries.reduce((a,m)=>a+m.tokens,0))} tok</span>
      </div>
      <div class="mem-group-body">${Object.entries(dirGroups).map(([dir,items])=>{
        const dirKey = 'mem|'+src+'|'+dir;
        const dirOpen = items.length <= 5 || openCats.has(dirKey);
        return `<div class="cat-group${dirOpen?' open':''}" style="margin:0 0.5rem">
          <div class="cat-head" onclick="toggleCat('${esc(dirKey)}')">
            <span class="carrow">&#9654;</span>
            <span style="color:var(--fg2)">${esc(dir)}</span> <span class="badge">${items.length}</span>
          </div>
          <div class="cat-files">${items.map(m=>{
            const name = m.file.split('/').pop();
            const pid = 'mp'+(previewCounter++);
            return `<div class="fitem-wrap">
              <div class="mem-item" onclick="toggleInlinePreview('${pid}','${esc(m.file)}')">
                <span style="color:var(--orange);min-width:40px;font-size:0.72rem">${esc(m.profile)}</span>
                <span class="fpath" title="${esc(m.file)}">${esc(name)}</span>
                <span class="fmeta">${m.tokens}tok ${m.lines}ln</span>
              </div>
              <div class="inline-preview" id="${pid}" style="display:none"></div>
            </div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}

// === Inline Preview ===
const TAIL_LINES = 5;
const inlineCache = {};

async function toggleInlinePreview(id, path) {
  markInteracted();
  const el = document.getElementById(id);
  if(!el) return;
  // Toggle off if already showing
  if(el.style.display !== 'none') { el.style.display = 'none'; return; }
  // Show loading
  el.style.display = 'block';
  el.innerHTML = '<span style="color:var(--fg2)">loading...</span>';
  // Fetch (with cache)
  let text = inlineCache[path];
  if(!text) {
    try {
      const res = await fetch('/api/file?path='+encodeURIComponent(path));
      if(!res.ok) { el.innerHTML = '<span style="color:var(--red)">'+res.statusText+'</span>'; return; }
      text = await res.text();
      inlineCache[path] = text;
    } catch(e) { el.innerHTML = '<span style="color:var(--red)">fetch error</span>'; return; }
  }
  renderInlinePreview(el, text, path);
}

function renderInlinePreview(el, text, path) {
  const lines = text.split('\n');
  const total = lines.length;
  const isSmall = total <= TAIL_LINES * 3;
  // Build line-numbered HTML
  function numbered(arr, startIdx) {
    return arr.map((l,i) => `<span class="ln">${startIdx+i}</span>${esc(l)||' '}`).join('\n');
  }
  if(isSmall) {
    el.innerHTML = numbered(lines, 1) +
      `<div class="prev-actions"><button class="prev-btn" onclick="openFullViewer('${esc(path)}')">open in viewer</button></div>`;
  } else {
    // Show tail preview
    const tail = lines.slice(-TAIL_LINES);
    const tailStart = total - TAIL_LINES + 1;
    el.innerHTML = numbered(tail, tailStart) +
      `<div class="prev-actions">
        <button class="prev-btn" onclick="expandInline(this,'${esc(path)}')">show all (${total} lines)</button>
        <button class="prev-btn" onclick="openFullViewer('${esc(path)}')">open in viewer</button>
      </div>`;
  }
}

function expandInline(btn, path) {
  const el = btn.closest('.inline-preview');
  const text = inlineCache[path];
  if(!text || !el) return;
  const lines = text.split('\n');
  function numbered(arr, startIdx) {
    return arr.map((l,i) => `<span class="ln">${startIdx+i}</span>${esc(l)||' '}`).join('\n');
  }
  el.innerHTML = numbered(lines, 1) +
    `<div class="prev-actions">
      <button class="prev-btn" onclick="collapseInline(this,'${esc(path)}')">collapse</button>
      <button class="prev-btn" onclick="openFullViewer('${esc(path)}')">open in viewer</button>
    </div>`;
}

function collapseInline(btn, path) {
  const el = btn.closest('.inline-preview');
  const text = inlineCache[path];
  if(!text || !el) return;
  renderInlinePreview(el, text, path);
}

function openFullViewer(path) {
  const text = inlineCache[path];
  if(text) { fullContent = text; showFullViewer(path, text); }
  else fetchFile(path);
}

// === Full File Viewer (secondary) ===
const PREVIEW_LINES = 15;
let fvExpanded = false;
let fvLines = [];

async function fetchFile(path) {
  let text = inlineCache[path];
  if(!text) {
    const res = await fetch('/api/file?path='+encodeURIComponent(path));
    if(!res.ok){alert('Cannot read: '+res.statusText);return;}
    text = await res.text();
    inlineCache[path] = text;
  }
  showFullViewer(path, text);
}

function showFullViewer(path, text) {
  fullContent = text;
  fvLines = text.split('\n');
  fvExpanded = false;
  document.getElementById('fv-path').textContent=path;
  let meta='';
  if(snap){
    for(const t of snap.tools) for(const f of t.files) if(f.path===path){
      meta=`${f.kind} | ${fmtSz(f.size)} | ~${fmtK(f.tokens)}tok | scope:${f.scope||'?'} | sent_to_llm:${f.sent_to_llm||'?'} | loaded:${f.loaded_when||'?'}`;break;}
    if(!meta) for(const m of snap.agent_memory) if(m.file===path){
      meta=`${m.source} | ${m.profile} | ${m.tokens}tok | ${m.lines}ln`;break;}
  }
  document.getElementById('fv-meta').textContent=meta;
  renderFileContent();
  document.getElementById('fv').classList.remove('hidden');
}

function renderFileContent() {
  const body = document.getElementById('fv-body');
  const info = document.getElementById('fv-info');
  const toggle = document.getElementById('fv-toggle');
  const total = fvLines.length;
  const canCollapse = total > PREVIEW_LINES * 2;

  if(!canCollapse || fvExpanded) {
    // Show all lines
    body.innerHTML = buildLineTable(fvLines, 1);
    info.textContent = `${total} lines`;
    toggle.style.display = canCollapse ? '' : 'none';
    toggle.textContent = 'Collapse';
  } else {
    // Smart preview: first N lines, ellipsis, last N lines
    const head = fvLines.slice(0, PREVIEW_LINES);
    const tail = fvLines.slice(-PREVIEW_LINES);
    const hidden = total - PREVIEW_LINES*2;
    body.innerHTML =
      buildLineTable(head, 1) +
      `<div class="fv-ellipsis" onclick="toggleFullContent()">` +
      `&#9660; ${hidden} more lines &#9660;</div>` +
      buildLineTable(tail, total - PREVIEW_LINES + 1);
    info.textContent = `${total} lines (showing ${PREVIEW_LINES*2} of ${total})`;
    toggle.style.display = '';
    toggle.textContent = 'Show all';
  }
}

function buildLineTable(lines, startNum) {
  return '<div class="fv-lines">' + lines.map((line, i) =>
    `<div class="fv-line"><span class="fv-ln">${startNum+i}</span><span class="fv-code">${esc(line)||' '}</span></div>`
  ).join('') + '</div>';
}

function toggleFullContent() { fvExpanded = !fvExpanded; renderFileContent(); }
function closeViewer() { document.getElementById('fv').classList.add('hidden'); }

// === Budget ===
async function loadBudget() {
  const el=document.getElementById('tab-budget');
  try{const r=await fetch('/api/budget');const b=await r.json();
  el.innerHTML=`<div class="budget-card"><h3 style="margin-bottom:0.5rem;color:var(--accent)">Token Budget Analysis</h3>
    <div class="brow"><span class="blabel">Always loaded (every call)</span><span class="bval">~${fmtK(b.always_loaded_tokens)} tokens</span></div>
    <div class="brow"><span class="blabel">On-demand (when invoked)</span><span class="bval">~${fmtK(b.on_demand_tokens)} tokens</span></div>
    <div class="brow"><span class="blabel">Conditional (file-matched)</span><span class="bval">~${fmtK(b.conditional_tokens)} tokens</span></div>
    <div class="brow"><span class="blabel">Cacheable portion</span><span class="bval">~${fmtK(b.cacheable_tokens)} tokens</span></div>
    <div class="brow"><span class="blabel">Survives compaction</span><span class="bval">~${fmtK(b.survives_compaction_tokens)} tokens</span></div>
    <div class="brow" style="font-weight:700"><span>Total potential overhead</span><span class="bval" style="color:var(--accent)">~${fmtK(b.total_potential_tokens)} tokens</span></div>
    <div class="brow"><span class="blabel">Files never sent to LLM</span><span class="bval">${b.never_sent_count}</span></div>
  </div>`;}catch(e){el.innerHTML='<p style="color:var(--red)">Failed to load budget.</p>';}
}

// === Helpers ===
function fmtK(n){return n>=1000?(n/1000).toFixed(1)+'k':''+n;}
function fmtSz(n){if(n<1024)return n+'B';if(n<1048576)return(n/1024).toFixed(1)+'KB';return(n/1048576).toFixed(1)+'MB';}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function relPath(p,root){if(p.startsWith(root+'/'))return p.slice(root.length+1);return p.replace(/^\/Users\/[^/]+/,'~');}

// === Init ===
connectSSE();
</script>
</body>
</html>
"""
