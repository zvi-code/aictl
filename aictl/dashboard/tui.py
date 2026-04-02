# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Live TUI dashboard using Textual.

Launched via ``aictl dashboard``.  Refreshes discovery data on a timer
and displays resource usage across all AI coding tools.
"""

from __future__ import annotations

import time
from collections import defaultdict
from pathlib import Path

from textual import work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.css.query import NoMatches
from textual.reactive import reactive
from textual.timer import Timer
from textual.widgets import (
    Footer,
    Header,
    Label,
    Static,
    DataTable,
    Sparkline,
    Rule,
    TabbedContent,
    TabPane,
    Tree,
)

from .models import DashboardSnapshot, STATUS_COLOURS, SOURCE_LABELS
from ..orchestrator import collect
from ..tools import TOOL_LABELS, TOOL_COLORS, DEFAULT_TOOL_COLOR, TOOL_ICONS, DEFAULT_TOOL_ICON

# ── Colour palette ───────────────────────────────────────────────

# Use registry as single source of truth
TOOL_COLOURS = TOOL_COLORS  # alias for backward compat within this file



# ── Sparkline data ring-buffer ───────────────────────────────────

class MetricHistory:
    """Keep last N values for a metric."""

    def __init__(self, maxlen: int = 60):
        self._maxlen = maxlen
        self._values: list[float] = []

    def push(self, v: float):
        self._values.append(v)
        if len(self._values) > self._maxlen:
            self._values = self._values[-self._maxlen:]

    @property
    def values(self) -> list[float]:
        return list(self._values)


# ── Helper widgets ───────────────────────────────────────────────

class StatCard(Static):
    """A single metric card."""

    DEFAULT_CSS = """
    StatCard {
        width: 1fr;
        height: 5;
        border: solid $accent;
        padding: 0 1;
        content-align: center middle;
    }
    """

    def __init__(self, title: str, value: str = "—", **kw):
        super().__init__(**kw)
        self._title = title
        self._value = value

    def compose(self) -> ComposeResult:
        yield Label(self._title, classes="stat-title")
        yield Label(self._value, id=f"stat-val-{self.id or 'x'}", classes="stat-value")

    def update_value(self, val: str):
        self._value = val
        try:
            self.query_one(".stat-value", Label).update(val)
        except NoMatches:
            pass


# ── Main dashboard app ───────────────────────────────────────────

class DashboardApp(App):
    """Live aictl dashboard."""

    TITLE = "aictl dashboard"
    CSS = """
    Screen {
        layout: vertical;
    }
    #top-stats {
        height: 11;
        margin: 0 0 1 0;
    }
    .stat-row {
        height: 5;
        margin: 0 0 1 0;
    }
    #main-area {
        height: 1fr;
    }
    #left-panel {
        width: 42;
        margin: 0 1 0 0;
    }
    #right-panel {
        width: 1fr;
    }
    .stat-title {
        text-style: bold;
        color: $text-muted;
    }
    .stat-value {
        text-style: bold;
        color: $text;
    }
    #cpu-spark, #mem-spark, #metric-spark {
        height: 3;
        margin: 0 0 1 0;
    }
    #live-tool-table, #collector-table {
        height: 1fr;
    }
    #proc-table, #memory-table {
        height: 1fr;
    }
    #file-tree {
        height: 1fr;
        overflow-y: auto;
    }
    #file-detail {
        height: 3;
        border-top: solid $surface;
        padding: 0 1;
        color: $text-muted;
    }
    #file-content-pane {
        height: 1fr;
        overflow-y: auto;
        padding: 0 1;
    }
    #mcp-detail-table {
        height: auto;
        max-height: 14;
    }
    .section-label {
        text-style: bold;
        color: $accent;
        margin: 0 0 0 0;
    }
    .tool-summary {
        height: auto;
        margin: 0 0 0 0;
        padding: 0 1;
    }
    .tool-summary .tool-header {
        text-style: bold;
    }
    .tool-summary .tool-stats {
        color: $text-muted;
    }
    .tool-summary .tool-anomaly {
        color: #f87171;
    }
    #memory-preview {
        height: auto;
        max-height: 10;
        border: solid $surface;
        padding: 0 1;
        color: $text-muted;
        overflow-y: auto;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh now"),
        Binding("p", "toggle_procs", "Toggle processes"),
        Binding("f", "toggle_files", "Toggle files"),
        Binding("m", "toggle_memory", "Toggle memory"),
    ]

    show_procs: reactive[bool] = reactive(True)
    show_files: reactive[bool] = reactive(True)
    show_memory: reactive[bool] = reactive(True)

    def action_quit(self) -> None:
        if self._monitor:
            self._monitor.stop()
        self.exit()

    def __init__(
        self,
        root: Path,
        interval: float = 5.0,
        *,
        include_live_monitor: bool = True,
        server_host: str = "127.0.0.1",
        server_port: int = 8484,
        **kw,
    ):
        super().__init__(**kw)
        self._root = root
        self._interval = interval
        self._include_live_monitor = include_live_monitor
        self._server_host = server_host
        self._server_port = server_port
        self._client = None  # ServerClient if connected to running server
        self._monitor = None  # PersistentMonitor for standalone live data
        self._cpu_history = MetricHistory(60)
        self._mem_history = MetricHistory(60)
        self._snapshot: DashboardSnapshot | None = None
        self._refresh_timer: Timer | None = None

    def compose(self) -> ComposeResult:
        yield Header()

        # Top stat cards
        with Vertical(id="top-stats"):
            with Horizontal(classes="stat-row"):
                yield StatCard("Live Sessions", id="sc-live-sessions")
                yield StatCard("Live Tokens", id="sc-live-tokens")
                yield StatCard("Outbound", id="sc-live-out")
                yield StatCard("Inbound", id="sc-live-in")
                yield StatCard("Files", id="sc-files")
            with Horizontal(classes="stat-row"):
                yield StatCard("Static Tokens", id="sc-tokens")
                yield StatCard("CPU %", id="sc-cpu")
                yield StatCard("Memory", id="sc-mem")
                yield StatCard("MCP", id="sc-mcp")
                yield StatCard("Agent Mem", id="sc-agentmem")

        # Main area: left=tool overview, right=tabbed detail
        with Horizontal(id="main-area"):
            with VerticalScroll(id="left-panel"):
                yield Label("AI Tools", classes="section-label")
                yield Rule()
                yield Label("", id="tool-summaries")
                yield Label("")  # spacer
                yield Label("CPU History", classes="section-label")
                yield Sparkline([], id="cpu-spark")
                yield Label("MEM History", classes="section-label")
                yield Sparkline([], id="mem-spark")

            with Vertical(id="right-panel"):
                with TabbedContent():
                    with TabPane("Processes", id="tab-procs"):
                        yield DataTable(id="proc-table")

                    with TabPane("Files", id="tab-files"):
                        yield Tree("Files", id="file-tree")
                        yield Label("", id="file-detail")

                    with TabPane("File Content", id="tab-content"):
                        yield Label("Select a file from the Files tab to view its content", id="file-content-pane")

                    with TabPane("MCP Servers", id="tab-mcp"):
                        yield DataTable(id="mcp-detail-table")

                    with TabPane("Agent Memory", id="tab-memory"):
                        yield DataTable(id="memory-table")
                        yield Label("", id="memory-preview")

                    with TabPane("Live Monitor", id="tab-live"):
                        yield DataTable(id="live-tool-table")
                        yield DataTable(id="collector-table")

                    with TabPane("Sessions", id="tab-sessions"):
                        yield DataTable(id="session-table")

                    with TabPane("Events", id="tab-events"):
                        yield DataTable(id="event-table")

                    with TabPane("Token Budget", id="tab-budget"):
                        yield DataTable(id="budget-table")

                    with TabPane("Metrics", id="tab-metrics"):
                        yield DataTable(id="metrics-table")
                        yield Label("", classes="section-label", id="metric-selected-label")
                        yield Sparkline([], id="metric-spark")
                        yield Label("Select a metric to view its time series", id="metric-info")

        yield Footer()

    def _init_table(self, table_id: str, *columns: str) -> DataTable:
        t = self.query_one(f"#{table_id}", DataTable)
        t.add_columns(*columns)
        t.cursor_type = "row"
        return t

    def _cleared_table(self, table_id: str) -> DataTable:
        t = self.query_one(f"#{table_id}", DataTable)
        t.clear()
        return t

    def on_mount(self) -> None:
        self._init_table("proc-table", "PID", "Tool", "Type", "Name", "CPU%", "MEM MB", "Anomalies")
        self._init_table("mcp-detail-table", "Status", "Server", "Tool", "Transport", "Endpoint", "PID", "CPU%", "MEM MB")
        self._init_table("memory-table", "Source", "Profile", "File", "Tokens", "Lines", "Preview")
        self._init_table("live-tool-table", "Tool", "Sessions", "PIDs", "Traffic", "Tokens", "MCP", "Files", "CPU", "Workspace", "State")
        self._init_table("collector-table", "Collector", "Status", "Mode", "Detail")
        self._init_table("session-table", "Tool", "Session ID", "Duration", "CPU", "Input Tok", "Output Tok", "Files", "PIDs", "Traffic", "State", "Status")
        self._init_table("event-table", "Time", "Tool", "Kind", "Detail")
        self._init_table("budget-table", "Tool", "Input Tok", "Output Tok", "Cache Read", "Cache Create", "Cost", "Sessions", "Model")
        self._init_table("metrics-table", "Metric", "Samples", "Latest Value")

        self.query_one("#file-tree", Tree).root.expand()

        self._metrics_list: list[dict] = []

        # Try connecting to running aictl serve instance
        from ..client import ServerClient
        self._client = ServerClient.try_connect(
            host=self._server_host, port=self._server_port)
        if self._client:
            self.sub_title = f"connected to {self._server_host}:{self._server_port}"
        else:
            self.sub_title = "standalone mode"
            # Start persistent monitor for live data in standalone mode
            if self._include_live_monitor:
                try:
                    from ..orchestrator import PersistentMonitor
                    self._monitor = PersistentMonitor(self._root)
                    self._monitor.start()
                except Exception:
                    self._monitor = None  # degrade gracefully

        # Initial data load + start timer
        self._do_refresh()
        self._refresh_timer = self.set_interval(self._interval, self._do_refresh)

    @work(thread=True)
    def _do_refresh(self) -> None:
        """Collect data in a worker thread to keep TUI responsive.

        Uses connected server when available (client mode), otherwise
        falls back to local collection (standalone mode).
        """
        if self._client:
            try:
                snap_dict = self._client.get_snapshot()
                snap = DashboardSnapshot.from_dict(snap_dict)
                self.call_from_thread(self._apply_snapshot, snap)
                return
            except Exception:
                # Server went away — fall back to standalone
                self._client = None
                self.call_from_thread(
                    lambda: setattr(self, "sub_title", "standalone mode (server disconnected)"))
        # Use persistent monitor snapshot if available (no temporary runtime)
        live_override = None
        if self._monitor:
            live_override = self._monitor.snapshot_dict()
        snap = collect(
            self._root,
            include_processes=True,
            _live_monitor_override=live_override,
        )
        self.call_from_thread(self._apply_snapshot, snap)

    def _apply_snapshot(self, snap: DashboardSnapshot) -> None:
        self._snapshot = snap

        # Track history
        self._cpu_history.push(snap.total_cpu)
        self._mem_history.push(snap.total_mem_mb)

        # Update stat cards
        for card_id, value in [
            ("sc-live-sessions", str(snap.total_live_sessions)),
            ("sc-live-tokens",   _human_tokens(snap.total_live_estimated_tokens)),
            ("sc-live-out",      _human_rate(snap.total_live_outbound_rate_bps)),
            ("sc-live-in",       _human_rate(snap.total_live_inbound_rate_bps)),
            ("sc-files",         str(snap.total_files)),
            ("sc-tokens",        _human_tokens(snap.total_tokens)),
            ("sc-cpu",           f"{snap.total_cpu:.1f}%"),
            ("sc-mem",           f"{snap.total_mem_mb:.0f} MB"),
            ("sc-mcp",           str(snap.total_mcp_servers)),
            ("sc-agentmem",      f"{snap.total_memory_entries} ({_human_tokens(snap.total_memory_tokens)})"),
        ]:
            self.query_one(f"#{card_id}", StatCard).update_value(value)

        # Update sparklines
        try:
            self.query_one("#cpu-spark", Sparkline).data = self._cpu_history.values
        except NoMatches:
            pass
        try:
            self.query_one("#mem-spark", Sparkline).data = self._mem_history.values
        except NoMatches:
            pass

        # Update dynamic tool summaries in left panel
        self._update_tool_summaries(snap)

        # Update all tables
        self._update_proc_table(snap)
        self._update_file_tree(snap)
        self._update_mcp_detail_table(snap)
        self._update_memory_table(snap)
        self._update_live_tables(snap)
        self._update_session_table(snap)
        self._update_event_table(snap)
        self._update_budget_table(snap)
        self._update_metrics_table()

    def _update_tool_summaries(self, snap: DashboardSnapshot) -> None:
        """Render compact tool summary list in left panel."""
        lines: list[str] = []
        for tr in snap.tools:
            if tr.tool == "aictl":
                continue
            if not tr.files and not tr.processes and not tr.mcp_servers and not tr.live:
                continue
            colour = TOOL_COLOURS.get(tr.tool, "white")
            icon = TOOL_ICONS.get(tr.tool, DEFAULT_TOOL_ICON)
            label = TOOL_LABELS.get(tr.tool, tr.label)
            tok = sum(f.tokens for f in tr.files)
            cpu = sum(float(p.cpu_pct) for p in tr.processes
                      if p.cpu_pct.replace('.', '', 1).isdigit())
            mem = sum(float(p.mem_mb) for p in tr.processes
                      if p.mem_mb.replace('.', '', 1).isdigit())
            anom = sum(1 for p in tr.processes if p.anomalies)

            # Check for telemetry errors
            tel_errors = 0
            tel = tr.token_breakdown.get("telemetry") if tr.token_breakdown else None
            if tel and isinstance(tel, dict):
                tel_errors = len(tel.get("errors", []))

            err_badge = f" [#f87171]{tel_errors} err[/]" if tel_errors else ""
            lines.append(f"{icon} [{colour}]●[/] [bold]{label}[/bold]{err_badge}")
            parts = []
            if tr.files:
                parts.append(f"  {len(tr.files)} files ({_human_tokens(tok)})")
            if tr.processes:
                parts.append(f"  {len(tr.processes)} proc  CPU {cpu:.1f}%  MEM {mem:.0f}MB")
            if tr.mcp_servers:
                parts.append(f"  {len(tr.mcp_servers)} MCP server{'s' if len(tr.mcp_servers) != 1 else ''}")
            if tr.live:
                token_estimate = tr.live.get("token_estimate", {})
                parts.append(
                    "  live "
                    f"{tr.live.get('session_count', 0)} sess  "
                    f"out {_human_rate(float(tr.live.get('outbound_rate_bps', 0.0)))}  "
                    f"in {_human_rate(float(tr.live.get('inbound_rate_bps', 0.0)))}"
                )
                parts.append(
                    "  "
                    f"tok {_human_tokens(int(token_estimate.get('input_tokens', 0)) + int(token_estimate.get('output_tokens', 0)))}  "
                    f"mcp {tr.live.get('mcp', {}).get('loops', 0)} loop"
                    f"{'s' if int(tr.live.get('mcp', {}).get('loops', 0)) != 1 else ''}"
                )
            if anom:
                parts.append(f"  [#f87171]{anom} anomal{'ies' if anom != 1 else 'y'}[/]")
            lines.extend(parts)
            # Show config hints if available
            tool_config = next((c for c in (snap.tool_configs or []) if c.get("tool") == tr.tool), None)
            if tool_config:
                for hint in tool_config.get("hints", [])[:2]:
                    lines.append(f"  [#fb923c]💡 {hint}[/]")
            lines.append("")

        try:
            self.query_one("#tool-summaries", Label).update("\n".join(lines) if lines else "  No resources")
        except NoMatches:
            pass

    def _update_proc_table(self, snap: DashboardSnapshot) -> None:
        pt = self._cleared_table("proc-table")
        all_procs = []
        for tr in snap.tools:
            for p in tr.processes:
                all_procs.append((tr, p))
        # Sort by memory descending
        all_procs.sort(key=lambda x: -(float(x[1].mem_mb) if x[1].mem_mb.replace('.', '', 1).isdigit() else 0))
        for tr, p in all_procs:
            anom_str = "; ".join(p.anomalies) if p.anomalies else ""
            cleanup = getattr(p, "cleanup_cmd", None) or ""
            if cleanup and anom_str:
                anom_str = f"{anom_str} → {cleanup}"
            pt.add_row(
                str(p.pid),
                TOOL_LABELS.get(tr.tool, tr.label),
                p.process_type or "",
                p.name,
                p.cpu_pct,
                p.mem_mb,
                anom_str[:80],
            )

    def _update_file_tree(self, snap: DashboardSnapshot) -> None:
        try:
            tree = self.query_one("#file-tree", Tree)
        except NoMatches:
            return

        tree.root.remove_children()
        root = Path(snap.root)
        home = Path.home()

        for tr in snap.tools:
            if not tr.files:
                continue

            # Group files by category
            cats: dict[str, list] = defaultdict(list)
            for f in tr.files:
                cats[f.kind or "other"].append(f)

            colour = TOOL_COLOURS.get(tr.tool, "white")
            label = TOOL_LABELS.get(tr.tool, tr.label)
            tok_total = sum(f.tokens for f in tr.files)
            tok_str = f"  {_human_tokens(tok_total)}" if tok_total else ""
            tool_node = tree.root.add(
                f"[{colour}]●[/] {label}  ({len(tr.files)} files{tok_str})"
            )

            cat_order = ['instructions', 'config', 'rules', 'commands', 'skills',
                         'agent', 'memory', 'prompt', 'transcript', 'temp',
                         'runtime', 'credentials', 'extensions']
            for cat in sorted(cats.keys(), key=lambda c: cat_order.index(c) if c in cat_order else 99):
                files = cats[cat]
                cat_tok = sum(f.tokens for f in files)
                cat_tok_str = f"  {_human_tokens(cat_tok)}" if cat_tok else ""
                cat_node = tool_node.add(
                    f"[dim]{cat}[/dim]  ({len(files)}{cat_tok_str})"
                )
                # Auto-expand small categories
                if len(files) <= 5:
                    cat_node.expand()

                for f in sorted(files, key=lambda x: Path(x.path).name.lower()):
                    rel = _rel_display(f.path, root, home)
                    filename = Path(rel).name
                    tok_s = f"  [dim]~{_human_tokens(f.tokens)}[/dim]" if f.tokens else ""
                    cat_node.add_leaf(
                        f"{filename}  {_human_size(f.size)}{tok_s}",
                        data=f,
                    )

        tree.root.expand()

    def _update_mcp_detail_table(self, snap: DashboardSnapshot) -> None:
        mt = self._cleared_table("mcp-detail-table")
        for srv in snap.mcp_detail:
            colour = STATUS_COLOURS.get(srv.status, "#94a3b8")
            status_display = f"[{colour}]● {srv.status}[/]"
            mt.add_row(
                status_display,
                srv.name,
                TOOL_LABELS.get(srv.tool, srv.tool),
                srv.transport,
                srv.endpoint[:60],
                str(srv.pid) if srv.pid else "—",
                srv.cpu_pct if srv.cpu_pct else "—",
                srv.mem_mb if srv.mem_mb else "—",
            )

    def _update_memory_table(self, snap: DashboardSnapshot) -> None:
        mem_t = self._cleared_table("memory-table")
        root = Path(snap.root)
        home = Path.home()
        for entry in snap.agent_memory:
            preview = entry.content.replace("\n", " ")[:80]
            source_label = SOURCE_LABELS.get(entry.source, entry.source)
            file_display = _rel_display(entry.file, root, home) if entry.file else "—"
            mem_t.add_row(
                source_label,
                entry.profile,
                file_display,
                str(entry.tokens),
                str(entry.lines),
                preview,
            )

    def _update_live_tables(self, snap: DashboardSnapshot) -> None:
        live_t = self._cleared_table("live-tool-table")
        live_tools = [tr for tr in snap.tools if tr.live]
        for tr in sorted(
            live_tools,
            key=lambda item: float(item.live.get("outbound_rate_bps", 0.0)) if item.live else 0.0,
            reverse=True,
        ):
            live = tr.live or {}
            token_estimate = live.get("token_estimate", {})
            mcp = live.get("mcp", {})
            ws_mb = float(live.get("workspace_size_mb", 0.0))
            ws_str = _human_size(int(ws_mb * 1048576)) if ws_mb > 0 else "—"
            state_bw = int(live.get("state_bytes_written", 0))
            state_str = _human_size(state_bw) if state_bw > 0 else "—"
            live_t.add_row(
                TOOL_LABELS.get(tr.tool, tr.label),
                str(live.get("session_count", 0)),
                str(live.get("pid_count", 0)),
                f"↑ {_human_rate(float(live.get('outbound_rate_bps', 0.0)))} / ↓ {_human_rate(float(live.get('inbound_rate_bps', 0.0)))}",
                f"{_human_tokens(int(token_estimate.get('input_tokens', 0)) + int(token_estimate.get('output_tokens', 0)))} ({token_estimate.get('source', 'n/a')})",
                f"{'YES' if mcp.get('detected') else 'NO'} ({mcp.get('loops', 0)})",
                f"{live.get('files_touched', 0)} / {live.get('file_events', 0)}",
                f"{float(live.get('cpu_percent', 0.0)):.1f}% peak {float(live.get('peak_cpu_percent', 0.0)):.1f}%",
                ws_str,
                state_str,
            )

        collector_t = self._cleared_table("collector-table")
        diagnostics = (snap.live_monitor or {}).get("diagnostics", {})
        for name, detail in sorted(diagnostics.items()):
            collector_t.add_row(
                name,
                str(detail.get("status", "unknown")),
                str(detail.get("mode", "unknown")),
                str(detail.get("detail", ""))[:120],
            )

    def _update_session_table(self, snap: DashboardSnapshot) -> None:
        session_t = self._cleared_table("session-table")
        for s in (snap.sessions or []):
            tool = s.get("tool", "")
            sid = s.get("session_id", "")
            short_id = (sid[:12] + "…") if len(sid) > 12 else sid
            dur_s = s.get("duration_s", 0)
            dur = _format_dur(dur_s)
            cpu = f"{s.get('cpu_percent', 0):.1f}%"
            in_tok = _human_tokens(s.get("exact_input_tokens", 0))
            out_tok = _human_tokens(s.get("exact_output_tokens", 0))
            files = str(s.get("file_events", 0))
            pids_val = s.get("pids", 0)
            pids = str(len(pids_val)) if isinstance(pids_val, list) else str(pids_val)
            out_b = int(s.get("outbound_bytes", 0))
            in_b = int(s.get("inbound_bytes", 0))
            traffic = f"↑{_human_size(out_b)} ↓{_human_size(in_b)}" if (out_b + in_b) > 0 else "—"
            state_bw = int(s.get("state_bytes_written", 0))
            state_str = _human_size(state_bw) if state_bw > 0 else "—"
            status = "[#34d399]active[/]" if s.get("active", True) else "ended"
            session_t.add_row(
                TOOL_LABELS.get(tool, tool),
                short_id, dur, cpu, in_tok, out_tok, files, pids, traffic, state_str, status,
            )

    def _update_event_table(self, snap: DashboardSnapshot) -> None:
        event_t = self._cleared_table("event-table")
        events = snap.events or []
        # Show most recent 100 events, newest first
        for ev in reversed(events[-100:]):
            ts = ev.get("ts", 0)
            if ts:
                t = time.localtime(ts)
                time_str = f"{t.tm_hour:02d}:{t.tm_min:02d}:{t.tm_sec:02d}"
            else:
                time_str = "—"
            tool = ev.get("tool", "")
            kind = ev.get("kind", "")
            detail = ev.get("detail", {})
            if isinstance(detail, dict):
                detail_parts = []
                for k, v in list(detail.items())[:4]:
                    detail_parts.append(f"{k}={v}")
                detail_str = " ".join(detail_parts)[:120]
            else:
                detail_str = str(detail)[:120]
            event_t.add_row(
                time_str,
                TOOL_LABELS.get(tool, tool),
                kind,
                detail_str,
            )

    def _update_budget_table(self, snap: DashboardSnapshot) -> None:
        budget_t = self._cleared_table("budget-table")
        for tel in (snap.tool_telemetry or []):
            tool = tel.get("tool", "")
            in_tok = int(tel.get("input_tokens", 0))
            out_tok = int(tel.get("output_tokens", 0))
            cache_read = int(tel.get("cache_read_tokens", 0))
            cache_create = int(tel.get("cache_creation_tokens", 0))
            cost = tel.get("cost_usd", 0)
            cost_str = f"${cost:.2f}" if cost else "—"
            sessions = str(tel.get("total_sessions", 0))
            model = tel.get("model", "—")
            budget_t.add_row(
                TOOL_LABELS.get(tool, tool),
                _human_tokens(in_tok),
                _human_tokens(out_tok),
                _human_tokens(cache_read),
                _human_tokens(cache_create),
                cost_str,
                sessions,
                model,
            )

    def _update_metrics_table(self) -> None:
        """Fetch and display available metrics (client mode only)."""
        metrics_t = self.query_one("#metrics-table", DataTable)
        info = self.query_one("#metric-info", Label)
        if not self._client:
            metrics_t.clear()
            info.update("[dim]Connect to aictl serve for metrics data[/dim]")
            return
        try:
            self._metrics_list = self._client.get_samples(list_metrics=True)
        except Exception:
            info.update("[dim]Failed to fetch metrics[/dim]")
            return
        metrics_t.clear()
        for m in self._metrics_list:
            val = m.get("last_value")
            if val is None:
                val_str = "—"
            elif isinstance(val, float) and val == int(val):
                val_str = str(int(val))
            elif isinstance(val, float):
                val_str = f"{val:.4g}"
            else:
                val_str = str(val)
            metrics_t.add_row(
                m.get("metric", ""),
                str(m.get("count", 0)),
                val_str,
            )
        info.update(f"{len(self._metrics_list)} metrics available — select a row for time series")

    @work(thread=True)
    def _load_metric_series(self, metric_name: str) -> None:
        """Fetch a metric's time series and update the sparkline."""
        if not self._client:
            return
        try:
            import time as _time
            series = self._client.get_samples(series=metric_name, since=_time.time() - 3600)
            values = series.get("value", [])
            self.call_from_thread(self._apply_metric_series, metric_name, values)
        except Exception:
            self.call_from_thread(
                lambda: self.query_one("#metric-info", Label).update(
                    f"[dim]Failed to load series for {metric_name}[/dim]"))

    def _apply_metric_series(self, name: str, values: list[float]) -> None:
        try:
            self.query_one("#metric-selected-label", Label).update(f"[bold]{name}[/bold]")
            spark = self.query_one("#metric-spark", Sparkline)
            spark.data = values if values else [0]
            info = self.query_one("#metric-info", Label)
            if values:
                info.update(
                    f"{len(values)} samples  "
                    f"min={min(values):.4g}  max={max(values):.4g}  "
                    f"latest={values[-1]:.4g}"
                )
            else:
                info.update("No samples in the last hour")
        except NoMatches:
            pass

    def on_tree_node_selected(self, event: Tree.NodeSelected) -> None:
        """Show file details and load content when a file leaf is selected."""
        if event.node.data is None:
            return
        f = event.node.data
        root = Path(self._snapshot.root) if self._snapshot else Path(".")
        home = Path.home()
        rel = _rel_display(f.path, root, home)
        try:
            detail = self.query_one("#file-detail", Label)
            meta_parts = [f.kind, _human_size(f.size)]
            if f.tokens:
                meta_parts.append(f"~{_human_tokens(f.tokens)}")
            if f.scope:
                meta_parts.append(f"scope:{f.scope}")
            if f.sent_to_llm:
                meta_parts.append(f"sent:{f.sent_to_llm}")
            detail.update(f"[bold]{rel}[/bold]  {' | '.join(meta_parts)}")
        except NoMatches:
            pass

        # Load file content into the File Content tab
        self._load_file_content(f.path)

    def _load_file_content(self, path_str: str) -> None:
        """Read and display file content in the content tab."""
        try:
            p = Path(path_str)
            if not p.is_file():
                content = f"[dim]File not found: {path_str}[/dim]"
            elif p.stat().st_size > 200_000:
                # Read tail for large files
                with open(p, "r", errors="replace") as fh:
                    fh.seek(max(0, p.stat().st_size - 50_000))
                    fh.readline()  # skip partial
                    tail = fh.read()
                content = f"[dim]... truncated (showing last {len(tail)} chars) ...[/dim]\n\n{tail}"
            else:
                content = p.read_text(errors="replace")
        except OSError as e:
            content = f"[dim]Cannot read: {e}[/dim]"

        root = Path(self._snapshot.root) if self._snapshot else Path(".")
        home = Path.home()
        rel = _rel_display(path_str, root, home)

        try:
            pane = self.query_one("#file-content-pane", Label)
            pane.update(f"[bold]{rel}[/bold]\n{'─' * 50}\n{content}")
        except NoMatches:
            pass

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection in memory or metrics tables."""
        if event.data_table.id == "metrics-table":
            idx = event.cursor_row
            if 0 <= idx < len(self._metrics_list):
                metric_name = self._metrics_list[idx].get("metric", "")
                if metric_name:
                    self._load_metric_series(metric_name)
            return
        if event.data_table.id != "memory-table":
            return
        if not self._snapshot:
            return
        try:
            idx = event.cursor_row
            if 0 <= idx < len(self._snapshot.agent_memory):
                entry = self._snapshot.agent_memory[idx]
                preview_label = self.query_one("#memory-preview", Label)
                text = entry.content[:500]
                if len(entry.content) > 500:
                    text += "\n…"
                preview_label.update(
                    f"[bold]{SOURCE_LABELS.get(entry.source, entry.source)}[/bold] "
                    f"({entry.profile})\n{text}"
                )
                # Also load full content in the content tab
                if entry.file:
                    self._load_file_content(entry.file)
        except NoMatches:
            pass

    # ── Actions ──────────────────────────────────────────────────

    def action_refresh(self) -> None:
        self._do_refresh()

    def action_toggle_procs(self) -> None:
        self.show_procs = not self.show_procs

    def action_toggle_files(self) -> None:
        self.show_files = not self.show_files

    def action_toggle_memory(self) -> None:
        self.show_memory = not self.show_memory


# ── Formatting helpers (delegated to shared utils) ──────────────

from functools import partial
from ..utils import human_size as _human_size, human_tokens, rel_display as _rel_display

_human_tokens = partial(human_tokens, suffix=True)


def _format_dur(dur_s: float) -> str:
    """Format a duration in seconds to a human-readable string."""
    if dur_s < 60:
        return f"{dur_s:.0f}s"
    if dur_s < 3600:
        return f"{dur_s // 60:.0f}m {dur_s % 60:.0f}s"
    return f"{dur_s // 3600:.0f}h {(dur_s % 3600) // 60:.0f}m"


def _human_rate(n: float) -> str:
    if n <= 0:
        return "0B/s"
    return f"{_human_size(int(n))}/s"


# ── Entry point ──────────────────────────────────────────────────

def run_dashboard(
    root: Path,
    interval: float = 5.0,
    *,
    include_live_monitor: bool = True,
    server_host: str = "127.0.0.1",
    server_port: int = 8484,
) -> None:
    """Launch the live TUI dashboard.

    Automatically connects to a running ``aictl serve`` for richer data.
    Falls back to standalone collection if no server is detected.
    """
    app = DashboardApp(
        root=root, interval=interval,
        include_live_monitor=include_live_monitor,
        server_host=server_host, server_port=server_port,
    )
    app.run()
