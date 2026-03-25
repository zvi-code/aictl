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

from .collector import DashboardSnapshot, collect
from ..registry import TOOL_LABELS


# ── Colour palette ───────────────────────────────────────────────

TOOL_COLOURS = {
    "claude-code": "#c084fc",
    "claude-desktop": "#a855f7",
    "copilot": "#60a5fa",
    "copilot-vscode": "#93c5fd",
    "copilot-cli": "#3b82f6",
    "codex-cli": "#f97316",
    "cursor": "#34d399",
    "windsurf": "#2dd4bf",
    "project-env": "#fbbf24",
    "aictl": "#94a3b8",
}

STATUS_COLOURS = {
    "running": "#34d399",
    "stopped": "#f87171",
    "error": "#fb923c",
    "unknown": "#94a3b8",
}

SOURCE_LABELS = {
    "claude-user-memory": "User Memory",
    "claude-project-memory": "Project Memory",
    "claude-auto-memory": "Auto Memory",
}


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
        except Exception:
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
    #cpu-spark, #mem-spark {
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

    def __init__(
        self,
        root: Path,
        interval: float = 5.0,
        *,
        include_live_monitor: bool = True,
        **kw,
    ):
        super().__init__(**kw)
        self._root = root
        self._interval = interval
        self._include_live_monitor = include_live_monitor
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

        yield Footer()

    def on_mount(self) -> None:
        # Process table
        pt = self.query_one("#proc-table", DataTable)
        pt.add_columns("PID", "Tool", "Type", "Name", "CPU%", "MEM MB", "Anomalies")
        pt.cursor_type = "row"

        # File tree
        ft = self.query_one("#file-tree", Tree)
        ft.root.expand()

        # MCP detail table
        mt = self.query_one("#mcp-detail-table", DataTable)
        mt.add_columns("Status", "Server", "Tool", "Transport", "Endpoint", "PID", "CPU%", "MEM MB")
        mt.cursor_type = "row"

        # Memory table
        mem_t = self.query_one("#memory-table", DataTable)
        mem_t.add_columns("Source", "Profile", "File", "Tokens", "Lines", "Preview")
        mem_t.cursor_type = "row"

        live_t = self.query_one("#live-tool-table", DataTable)
        live_t.add_columns(
            "Tool",
            "Sessions",
            "PIDs",
            "Traffic",
            "Tokens",
            "MCP",
            "Files",
            "CPU",
            "Confidence",
        )
        live_t.cursor_type = "row"

        collector_t = self.query_one("#collector-table", DataTable)
        collector_t.add_columns("Collector", "Status", "Mode", "Detail")
        collector_t.cursor_type = "row"

        # Initial data load + start timer
        self._do_refresh()
        self._refresh_timer = self.set_interval(self._interval, self._do_refresh)

    @work(thread=True)
    def _do_refresh(self) -> None:
        """Collect data in a worker thread to keep TUI responsive."""
        snap = collect(
            self._root,
            include_processes=True,
            include_live_monitor=self._include_live_monitor,
            live_sample_seconds=max(1.0, min(1.5, self._interval / 2)),
        )
        self.call_from_thread(self._apply_snapshot, snap)

    def _apply_snapshot(self, snap: DashboardSnapshot) -> None:
        self._snapshot = snap

        # Track history
        self._cpu_history.push(snap.total_cpu)
        self._mem_history.push(snap.total_mem_mb)

        # Update stat cards
        self.query_one("#sc-live-sessions", StatCard).update_value(str(snap.total_live_sessions))
        self.query_one("#sc-live-tokens", StatCard).update_value(
            _human_tokens(snap.total_live_estimated_tokens)
        )
        self.query_one("#sc-live-out", StatCard).update_value(
            _human_rate(snap.total_live_outbound_rate_bps)
        )
        self.query_one("#sc-live-in", StatCard).update_value(
            _human_rate(snap.total_live_inbound_rate_bps)
        )
        self.query_one("#sc-files", StatCard).update_value(str(snap.total_files))
        self.query_one("#sc-tokens", StatCard).update_value(_human_tokens(snap.total_tokens))
        self.query_one("#sc-cpu", StatCard).update_value(f"{snap.total_cpu:.1f}%")
        self.query_one("#sc-mem", StatCard).update_value(f"{snap.total_mem_mb:.0f} MB")
        self.query_one("#sc-mcp", StatCard).update_value(str(snap.total_mcp_servers))
        self.query_one("#sc-agentmem", StatCard).update_value(
            f"{snap.total_memory_entries} ({_human_tokens(snap.total_memory_tokens)})"
        )

        # Update sparklines
        try:
            self.query_one("#cpu-spark", Sparkline).data = self._cpu_history.values
        except Exception:
            pass
        try:
            self.query_one("#mem-spark", Sparkline).data = self._mem_history.values
        except Exception:
            pass

        # Update dynamic tool summaries in left panel
        self._update_tool_summaries(snap)

        # Update all tables
        self._update_proc_table(snap)
        self._update_file_tree(snap)
        self._update_mcp_detail_table(snap)
        self._update_memory_table(snap)
        self._update_live_tables(snap)

    def _update_tool_summaries(self, snap: DashboardSnapshot) -> None:
        """Render compact tool summary list in left panel."""
        lines: list[str] = []
        for tr in snap.tools:
            if tr.tool == "aictl":
                continue
            if not tr.files and not tr.processes and not tr.mcp_servers and not tr.live:
                continue
            colour = TOOL_COLOURS.get(tr.tool, "white")
            label = TOOL_LABELS.get(tr.tool, tr.label)
            tok = sum(f.tokens for f in tr.files)
            cpu = sum(float(p.cpu_pct) for p in tr.processes
                      if p.cpu_pct.replace('.', '', 1).isdigit())
            mem = sum(float(p.mem_mb) for p in tr.processes
                      if p.mem_mb.replace('.', '', 1).isdigit())
            anom = sum(1 for p in tr.processes if p.anomalies)

            lines.append(f"[{colour}]●[/] [bold]{label}[/bold]")
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
            lines.append("")

        try:
            self.query_one("#tool-summaries", Label).update("\n".join(lines) if lines else "  No resources")
        except Exception:
            pass

    def _update_proc_table(self, snap: DashboardSnapshot) -> None:
        pt = self.query_one("#proc-table", DataTable)
        pt.clear()
        all_procs = []
        for tr in snap.tools:
            for p in tr.processes:
                all_procs.append((tr, p))
        # Sort by memory descending
        all_procs.sort(key=lambda x: -(float(x[1].mem_mb) if x[1].mem_mb.replace('.', '', 1).isdigit() else 0))
        for tr, p in all_procs:
            anom_str = "; ".join(p.anomalies) if p.anomalies else ""
            pt.add_row(
                str(p.pid),
                TOOL_LABELS.get(tr.tool, tr.label),
                p.process_type or "",
                p.name,
                p.cpu_pct,
                p.mem_mb,
                anom_str[:60],
            )

    def _update_file_tree(self, snap: DashboardSnapshot) -> None:
        try:
            tree = self.query_one("#file-tree", Tree)
        except Exception:
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
        mt = self.query_one("#mcp-detail-table", DataTable)
        mt.clear()
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
        mem_t = self.query_one("#memory-table", DataTable)
        mem_t.clear()
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
        live_t = self.query_one("#live-tool-table", DataTable)
        live_t.clear()
        live_tools = [tr for tr in snap.tools if tr.live]
        for tr in sorted(
            live_tools,
            key=lambda item: float(item.live.get("outbound_rate_bps", 0.0)) if item.live else 0.0,
            reverse=True,
        ):
            live = tr.live or {}
            token_estimate = live.get("token_estimate", {})
            mcp = live.get("mcp", {})
            live_t.add_row(
                TOOL_LABELS.get(tr.tool, tr.label),
                str(live.get("session_count", 0)),
                str(live.get("pid_count", 0)),
                f"↑ {_human_rate(float(live.get('outbound_rate_bps', 0.0)))} / ↓ {_human_rate(float(live.get('inbound_rate_bps', 0.0)))}",
                f"{_human_tokens(int(token_estimate.get('input_tokens', 0)) + int(token_estimate.get('output_tokens', 0)))} ({token_estimate.get('source', 'n/a')})",
                f"{'YES' if mcp.get('detected') else 'NO'} ({mcp.get('loops', 0)})",
                f"{live.get('files_touched', 0)} / {live.get('file_events', 0)}",
                f"{float(live.get('cpu_percent', 0.0)):.1f}% peak {float(live.get('peak_cpu_percent', 0.0)):.1f}%",
                f"{float(live.get('confidence', 0.0)):.2f}",
            )

        collector_t = self.query_one("#collector-table", DataTable)
        collector_t.clear()
        diagnostics = (snap.live_monitor or {}).get("diagnostics", {})
        for name, detail in sorted(diagnostics.items()):
            collector_t.add_row(
                name,
                str(detail.get("status", "unknown")),
                str(detail.get("mode", "unknown")),
                str(detail.get("detail", ""))[:120],
            )

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
        except Exception:
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
        except Exception:
            pass

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Show memory content preview when a row is selected in memory table."""
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
        except Exception:
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

from ..utils import human_size as _human_size, human_tokens, rel_display as _rel_display


def _human_tokens(n: int) -> str:
    return human_tokens(n, suffix=True)


def _human_rate(n: float) -> str:
    if n <= 0:
        return "0B/s"
    return f"{_human_size(int(n))}/s"


# ── Entry point ──────────────────────────────────────────────────

def run_dashboard(root: Path, interval: float = 5.0, *, include_live_monitor: bool = True) -> None:
    """Launch the live TUI dashboard."""
    app = DashboardApp(root=root, interval=interval, include_live_monitor=include_live_monitor)
    app.run()
