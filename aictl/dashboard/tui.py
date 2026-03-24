"""Live TUI dashboard using Textual.

Launched via ``aictl dashboard``.  Refreshes discovery data on a timer
and displays resource usage across all AI coding tools.
"""

from __future__ import annotations

import time
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


# ── Colour palette ───────────────────────────────────────────────

TOOL_COLOURS = {
    "claude": "#c084fc",    # purple
    "copilot": "#60a5fa",   # blue
    "cursor": "#34d399",    # green
    "windsurf": "#fbbf24",  # amber
    "aictl": "#94a3b8",     # slate
}

STATUS_COLOURS = {
    "running": "#34d399",   # green
    "stopped": "#f87171",   # red
    "error": "#fb923c",     # orange
    "unknown": "#94a3b8",   # grey
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


class ToolPanel(Static):
    """Summary panel for a single AI tool."""

    DEFAULT_CSS = """
    ToolPanel {
        height: auto;
        margin: 0 0 1 0;
        padding: 0 1;
        border: solid $surface;
    }
    ToolPanel .tool-header {
        text-style: bold;
    }
    ToolPanel .tool-stat {
        color: $text-muted;
    }
    """

    def __init__(self, tool_name: str, label: str, **kw):
        super().__init__(**kw)
        self._tool = tool_name
        self._label = label

    def compose(self) -> ComposeResult:
        colour = TOOL_COLOURS.get(self._tool, "white")
        yield Label(f"[{colour}]● {self._label}[/]", classes="tool-header")
        yield Label("  No resources", id=f"tool-{self._tool}-stats", classes="tool-stat")

    def update_stats(self, files: int, tokens: int, procs: int,
                     cpu: float, mem: float, mcp: int):
        parts = []
        if files:
            parts.append(f"{files} files ({_human_tokens(tokens)})")
        if procs:
            parts.append(f"{procs} proc  CPU {cpu:.1f}%  MEM {mem:.0f}MB")
        if mcp:
            parts.append(f"{mcp} MCP server{'s' if mcp != 1 else ''}")
        text = "\n  ".join(parts) if parts else "No resources"
        try:
            self.query_one(f"#tool-{self._tool}-stats", Label).update(f"  {text}")
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
        height: 5;
        margin: 0 0 1 0;
    }
    #main-area {
        height: 1fr;
    }
    #left-panel {
        width: 40;
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
    #mcp-detail-table {
        height: auto;
        max-height: 14;
    }
    .section-label {
        text-style: bold;
        color: $accent;
        margin: 0 0 0 0;
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

    def __init__(self, root: Path, interval: float = 5.0, **kw):
        super().__init__(**kw)
        self._root = root
        self._interval = interval
        self._cpu_history = MetricHistory(60)
        self._mem_history = MetricHistory(60)
        self._snapshot: DashboardSnapshot | None = None
        self._refresh_timer: Timer | None = None

    def compose(self) -> ComposeResult:
        yield Header()

        # Top stat cards
        with Horizontal(id="top-stats"):
            yield StatCard("Files", id="sc-files")
            yield StatCard("Tokens", id="sc-tokens")
            yield StatCard("Processes", id="sc-procs")
            yield StatCard("CPU %", id="sc-cpu")
            yield StatCard("Memory", id="sc-mem")
            yield StatCard("MCP", id="sc-mcp")
            yield StatCard("Agent Mem", id="sc-agentmem")

        # Main area: left=tools, right=tabbed tables
        with Horizontal(id="main-area"):
            with VerticalScroll(id="left-panel"):
                yield Label("AI Tools", classes="section-label")
                yield Rule()
                for tool, label in [
                    ("claude", "Claude Code"),
                    ("copilot", "GitHub Copilot"),
                    ("cursor", "Cursor"),
                    ("windsurf", "Windsurf"),
                    ("aictl", "aictl"),
                ]:
                    yield ToolPanel(tool, label, id=f"panel-{tool}")
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

                    with TabPane("MCP Servers", id="tab-mcp"):
                        yield DataTable(id="mcp-detail-table")

                    with TabPane("Agent Memory", id="tab-memory"):
                        yield DataTable(id="memory-table")
                        yield Label("", id="memory-preview")

        yield Footer()

    def on_mount(self) -> None:
        # Process table
        pt = self.query_one("#proc-table", DataTable)
        pt.add_columns("PID", "Tool", "Name", "CPU%", "MEM MB", "Command")
        pt.cursor_type = "row"

        # File tree
        ft = self.query_one("#file-tree", Tree)
        ft.root.expand()

        # MCP detail table (enriched)
        mt = self.query_one("#mcp-detail-table", DataTable)
        mt.add_columns("Status", "Server", "Tool", "Transport", "Endpoint", "PID", "CPU%", "MEM MB")
        mt.cursor_type = "row"

        # Memory table
        mem_t = self.query_one("#memory-table", DataTable)
        mem_t.add_columns("Source", "Profile", "File", "Tokens", "Lines", "Preview")
        mem_t.cursor_type = "row"

        # Initial data load + start timer
        self._do_refresh()
        self._refresh_timer = self.set_interval(self._interval, self._do_refresh)

    @work(thread=True)
    def _do_refresh(self) -> None:
        """Collect data in a worker thread to keep TUI responsive."""
        snap = collect(self._root, include_processes=True)
        self.call_from_thread(self._apply_snapshot, snap)

    def _apply_snapshot(self, snap: DashboardSnapshot) -> None:
        self._snapshot = snap

        # Track history
        self._cpu_history.push(snap.total_cpu)
        self._mem_history.push(snap.total_mem_mb)

        # Update stat cards
        self.query_one("#sc-files", StatCard).update_value(str(snap.total_files))
        self.query_one("#sc-tokens", StatCard).update_value(_human_tokens(snap.total_tokens))
        self.query_one("#sc-procs", StatCard).update_value(str(snap.total_processes))
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

        # Update tool panels
        for tr in snap.tools:
            try:
                panel = self.query_one(f"#panel-{tr.tool}", ToolPanel)
                cpu = sum(float(p.cpu_pct) for p in tr.processes
                          if p.cpu_pct.replace('.', '', 1).isdigit())
                mem = sum(float(p.mem_mb) for p in tr.processes
                          if p.mem_mb.replace('.', '', 1).isdigit())
                panel.update_stats(
                    files=len(tr.files),
                    tokens=sum(f.tokens for f in tr.files),
                    procs=len(tr.processes),
                    cpu=cpu, mem=mem,
                    mcp=len(tr.mcp_servers),
                )
            except Exception:
                pass

        # Update all tables
        self._update_proc_table(snap)
        self._update_file_tree(snap)
        self._update_mcp_detail_table(snap)
        self._update_memory_table(snap)

    def _update_proc_table(self, snap: DashboardSnapshot) -> None:
        pt = self.query_one("#proc-table", DataTable)
        pt.clear()
        for tr in snap.tools:
            for p in tr.processes:
                pt.add_row(
                    str(p.pid),
                    tr.label,
                    p.name,
                    p.cpu_pct,
                    p.mem_mb,
                    p.cmdline[:80],
                )

    def _update_file_tree(self, snap: DashboardSnapshot) -> None:
        from collections import defaultdict
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

            # Group files by parent directory
            dir_groups: dict[str, list] = defaultdict(list)
            for f in tr.files:
                rel = _rel_display(f.path, root, home)
                parent = str(Path(rel).parent)
                if parent == ".":
                    parent = "(root)"
                dir_groups[parent].append((rel, f))

            colour = TOOL_COLOURS.get(tr.tool, "white")
            tok_total = sum(f.tokens for f in tr.files)
            tok_str = f"  {_human_tokens(tok_total)}" if tok_total else ""
            tool_node = tree.root.add(
                f"[{colour}]● {tr.label}[/]  ({len(tr.files)} files{tok_str})"
            )
            tool_node.expand()

            for dir_name in sorted(dir_groups.keys()):
                entries = dir_groups[dir_name]
                dir_tok = sum(f.tokens for _, f in entries)
                dir_tok_str = f"  {_human_tokens(dir_tok)}" if dir_tok else ""
                dir_node = tool_node.add(
                    f"📁 [dim]{dir_name}[/dim]  ({len(entries)}{dir_tok_str})"
                )
                # Auto-expand small dirs
                if len(entries) <= 5:
                    dir_node.expand()

                for rel, f in sorted(entries, key=lambda x: Path(x[0]).name.lower()):
                    filename = Path(rel).name
                    tok_s = f"  [dim]~{_human_tokens(f.tokens)}[/dim]" if f.tokens else ""
                    dir_node.add_leaf(
                        f"{filename}  [dim]{f.kind}[/dim]  {_human_size(f.size)}{tok_s}",
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
                srv.tool,
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
            # Truncate content for preview column
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

    def on_tree_node_selected(self, event: Tree.NodeSelected) -> None:
        """Show file path in detail bar when a file leaf is selected."""
        if event.node.data is None:
            return
        f = event.node.data
        try:
            detail = self.query_one("#file-detail", Label)
            detail.update(f"[bold]{Path(f.path).name}[/bold]  {f.kind}  {_human_size(f.size)}  [dim]{f.path}[/dim]")
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
                # Show first ~500 chars of content
                text = entry.content[:500]
                if len(entry.content) > 500:
                    text += "\n…"
                preview_label.update(
                    f"[bold]{SOURCE_LABELS.get(entry.source, entry.source)}[/bold] "
                    f"({entry.profile})\n{text}"
                )
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


# ── Formatting helpers ───────────────────────────────────────────

def _human_tokens(n: int) -> str:
    if n < 1000:
        return f"{n} tok"
    if n < 100_000:
        return f"{n / 1000:.1f}k tok"
    return f"{n / 1000:.0f}k tok"


def _human_size(n: int) -> str:
    if n < 1024:
        return f"{n}B"
    k = n / 1024
    if k < 1024:
        return f"{k:.1f}KB"
    return f"{k / 1024:.1f}MB"


def _rel_display(path_str: str, root: Path, home: Path) -> str:
    p = Path(path_str)
    try:
        return str(p.relative_to(root))
    except ValueError:
        pass
    try:
        return "~/" + str(p.relative_to(home))
    except ValueError:
        return path_str


# ── Entry point ──────────────────────────────────────────────────

def run_dashboard(root: Path, interval: float = 5.0) -> None:
    """Launch the live TUI dashboard."""
    app = DashboardApp(root=root, interval=interval)
    app.run()
