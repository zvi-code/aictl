# Architecture

aictl is a cross-platform control plane for AI coding tools. It has two major subsystems:

1. **Context Management** — a deploy/import pipeline that translates a unified `.context.toml` format into native files for Claude Code, GitHub Copilot, Cursor, and Windsurf
2. **Observability** — a live monitoring and dashboard system that discovers, tracks, and visualizes AI tool resources across 27+ tools

Both subsystems share a CSV-driven discovery registry and a common data model.

```
                           ┌──────────────┐
                           │   CLI (click) │
                           │  12 commands  │
                           └──────┬───────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
  ┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
  │ Context Mgmt  │     │   Observability │     │   Packaging     │
  │ deploy/import │     │ serve/dashboard │     │ plugin build    │
  │ scan/validate │     │ monitor/status  │     │                 │
  └───────────────┘     └─────────────────┘     └─────────────────┘
          │                       │
          ▼                       ▼
  ┌───────────────┐     ┌─────────────────┐
  │   Emitters /  │     │   Monitoring    │
  │   Importers   │     │   Pipeline      │
  └───────────────┘     └─────────────────┘
          │                       │
          └───────────┬───────────┘
                      ▼
              ┌───────────────┐
              │   Discovery   │
              │  Registry     │
              │  (CSV-driven) │
              └───────────────┘
```

## Module Map

```
aictl/
├── cli.py                  # Click entrypoint — registers 12 commands
├── scanner.py              # Walk directory tree, find .context.toml files
├── parser.py               # Parse .context.toml TOML tables into typed dataclasses
├── resolver.py             # Merge scopes with inheritance/exclude rules
├── synthesizer.py          # Merge import results back into .context.toml files
├── registry.py             # CSV-driven tool taxonomy + discovery registry
├── discovery.py            # Enumerate resources per tool (files, processes, MCP)
├── platforms.py            # Platform-specific path resolution (macOS/Windows/Linux)
├── manifest.py             # Track deployed files for profile switch cleanup
├── memory.py               # Stash/restore Claude Code memory per (root, profile)
├── feature_matrix.py       # Per-tool feature compatibility warnings
├── config.py               # TOML config loading + platform defaults
├── utils.py                # Token estimation, safe writes, overlays
├── sink.py                 # Thread-safe metric emission pipeline
├── store.py                # In-memory snapshot storage + ring buffers
├── storage.py              # SQLite time-series persistence (HistoryDB)
├── orchestrator.py         # Server lifecycle — wires collectors, server, storage
├── client.py               # HTTP client for connecting to running aictl serve
│
├── commands/               # CLI command implementations
│   ├── deploy.py           #   aictl deploy
│   ├── import_cmd.py       #   aictl import
│   ├── scan.py             #   aictl scan
│   ├── status.py           #   aictl status
│   ├── serve.py            #   aictl serve
│   ├── dashboard.py        #   aictl dashboard
│   ├── monitor.py          #   aictl monitor
│   ├── plugin.py           #   aictl plugin build
│   ├── diff_cmd.py         #   aictl diff
│   ├── init_cmd.py         #   aictl init
│   ├── validate_cmd.py     #   aictl validate
│   ├── memory.py           #   aictl memory show/stashes
│   └── config_cmd.py       #   aictl config
│
├── emitters/               # Generate native tool files from Resolved
│   ├── registry.py         #   Emitter dispatch
│   ├── claude.py           #   CLAUDE.md, .claude/rules/, .mcp.json, etc.
│   ├── copilot.py          #   .github/copilot-instructions.md, AGENTS.md, etc.
│   ├── cursor.py           #   .cursor/rules/, .cursor/mcp.json
│   └── windsurf.py         #   .windsurfrules, .windsurf/rules/
│
├── importers/              # Reverse-engineer native files → ImportResult
│   ├── registry.py         #   Importer dispatch
│   ├── _parse_helpers.py   #   Shared parsing utilities
│   ├── claude.py           #   Read CLAUDE.md, .claude/ hierarchy
│   ├── copilot.py          #   Read .github/ Copilot files
│   ├── cursor.py           #   Read .cursor/ files
│   ├── windsurf.py         #   Read Windsurf config
│   └── plugin.py           #   Read .claude-plugin/ metadata
│
├── monitoring/             # Live process/network/filesystem watching
│   ├── config.py           #   MonitorConfig (intervals, paths)
│   ├── runtime.py          #   MonitorRuntime — orchestrates collectors
│   ├── correlator.py       #   SessionCorrelator — PIDs → tool sessions
│   ├── session.py          #   SessionState, ToolReport, TokenEstimate
│   ├── estimator.py        #   Token estimation heuristics
│   ├── events.py           #   Event emission helpers
│   ├── process_classifier.py  # Classify processes by tool
│   ├── tool_config.py      #   Tool-specific config discovery
│   ├── tool_telemetry.py   #   Structured telemetry readers
│   └── collectors/         #   BaseCollector implementations
│       ├── base.py         #     Abstract BaseCollector
│       ├── discovery.py    #     CSV-driven tool discovery
│       ├── process.py      #     psutil process collector
│       ├── filesystem.py   #     watchdog file event collector
│       ├── telemetry.py    #     Structured telemetry collector
│       └── network/        #     Platform-specific network collectors
│           ├── linux.py    #       ss/tcpinfo deltas
│           ├── macos.py    #       nettop-backed per-process adapter
│           └── windows.py  #       Connection-weighted fallback
│
├── dashboard/              # All visualization renderers
│   ├── models.py           #   DashboardTool + DashboardSnapshot dataclasses
│   ├── web_server.py       #   ThreadingHTTPServer — REST API + SSE + static
│   ├── tui.py              #   Textual TUI app
│   ├── html_report.py      #   Self-contained static HTML report
│   ├── collector.py        #   One-shot snapshot (used by TUI standalone)
│   ├── dist/               #   Built Vite static assets (served by web_server)
│   └── ui/                 #   Frontend source (Vite + Preact + htm)
│       └── src/
│           ├── app.js              # App shell, tabs, SSE, global header
│           ├── dashboard.css       # Design tokens + component styles (see docs/dashboard-design-system.md)
│           ├── layoutConfig.js     # Sparkline/metric/tab configuration
│           ├── utils.js            # Formatters, constants, color maps
│           ├── context.js          # Preact context shape
│           └── components/         # 18 Preact components
│
└── data/                   # CSV registries and schema files
    ├── paths-unix.csv      #   Tool file paths for Linux/macOS
    ├── paths-windows.csv   #   Tool file paths for Windows
    ├── processes-unix.csv  #   Process detection patterns (Linux/macOS)
    ├── processes-windows.csv  # Process detection patterns (Windows)
    ├── metrics.yaml        #   OpenTelemetry metric definitions
    ├── telemetry-sources.yaml  # Structured telemetry collection rules
    ├── tool-configs.yaml   #   Tool-specific config metadata
    └── ui-widget-schema.yaml   # Dashboard widget schemas
```

---

## 1. Context Management Pipeline

### Deploy: `.context.toml` to native tool files

The deploy pipeline transforms `.context.toml` declarative files into tool-specific native files through five phases:

```
.context.toml files
        │
        ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  SCAN    │───▶│  PARSE   │───▶│ RESOLVE  │───▶│  EMIT    │───▶│ CLEANUP  │
  │scanner.py│    │parser.py │    │resolver.py│   │emitters/ │    │manifest  │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘    │+ memory  │
                                                                   └──────────┘
```

**Phase 1 — Scan** (`scanner.py`): Walk the root directory tree, find all `.context.toml` files, return list of `(relative_path, parsed_dict)`.

**Phase 2 — Parse** (`parser.py`): Parse each `.context.toml` file's TOML tables into a `ParsedAictx` dataclass. Table grammar:

```
[instructions]                  — Instructions (profile keys → multi-line strings)
[commands.<profile>.<name>]     — Slash command (content key)
[agents.<profile>.<name>]       — Agent definition (content key)
[skills.<profile>.<name>]       — Skill definition (content key)
[mcp.<profile>.<name>]          — MCP server config (native TOML keys)
[hooks.<profile>]               — Lifecycle hooks (EventName = 'JSON string')
[lsp.<profile>.<name>]          — LSP server config (native TOML keys)
[settings.<profile>]            — Setting key/value pairs
[permissions]                   — Permission patterns
[env.<profile>]                 — Environment variables
[ignores]                       — Tool-specific ignore patterns
[memory]                        — Memory hints
[plugin]                        — Plugin metadata
[inherit]                       — Inheritance directives
exclude = [...]                 — Capability exclusions (top-level array)
```

The `_always` profile means the section is active regardless of which profile is deployed.

**Phase 3 — Resolve** (`resolver.py`): Merge all parsed files into a single `Resolved` object applying scope and inheritance rules:
- **Instructions**: every `.context.toml` in the subtree contributes scoped instructions
- **Capabilities**: only the root file's commands, agents, and skills are active (unless `[inherit] recursive: skills` pulls children up)
- **MCP/Hooks/LSP/Settings/Permissions/Env**: root file only
- **Excludes**: root's `[exclude]` filters out named capabilities

**Phase 4 — Emit** (`emitters/`): For each registered emitter (claude, copilot, cursor, windsurf), write native files at the root. Each emitter implements:

```python
def emit(root: Path, resolved: Resolved, dry_run: bool) -> list[dict]:
    """Return [{"path": str, "tokens": int}, ...]"""
```

### Emit Matrix

| Source | Claude Code | Copilot | Cursor | Windsurf |
|--------|------------|---------|--------|----------|
| Root `base` | `CLAUDE.md` | `.github/copilot-instructions.md` | `.cursor/rules/base.mdc` | `.windsurfrules` |
| Root `profile` | `CLAUDE.local.md` | `AGENTS.md` | `.cursor/rules/profile-active.mdc` | `.windsurf/rules/profile.md` |
| Sub-scope | `.claude/rules/{scope}.md` | `.github/instructions/{scope}.instructions.md` | `.cursor/rules/{scope}.mdc` | `.windsurf/rules/{scope}.md` |
| `[command:*]` | `.claude/commands/{name}.md` | `.github/prompts/{name}.prompt.md` | — | — |
| `[agent:*]` | — | `.github/agents/{name}.agent.md` | — | — |
| `[skill:*]` | `.claude/skills/{name}/SKILL.md` | `.github/skills/{name}/SKILL.md` | — | — |
| `[mcp:*]` | `.mcp.json` | `.copilot-mcp.json` | `.cursor/mcp.json` | `.windsurf/mcp.json` |
| `[hook:*]` | `.claude/settings.local.json` | — | — | — |
| `[lsp:*]` | `.lsp.json` | — | — | — |

**Phase 5 — Cleanup + Memory Swap**: Load the previous deployment manifest (`.ai-deployed/manifest.json`), diff file lists, remove stale files from the old profile. If the profile changed, stash old memory directory and restore the new one (see Memory Management below).

### Import: native tool files to `.context.toml`

The import pipeline reverse-engineers existing native files back into `.context.toml` format:

```
Native files (CLAUDE.md, .github/*, .cursor/*, ...)
        │
        ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  IMPORTERS   │───▶│ SYNTHESIZER  │───▶│ .context.toml │
  │ claude.py    │    │synthesizer.py│    │   files      │
  │ copilot.py   │    │              │    │              │
  │ cursor.py    │    │              │    │              │
  │ windsurf.py  │    │              │    │              │
  │ plugin.py    │    │              │    │              │
  └──────────────┘    └──────────────┘    └──────────────┘
```

Each importer scans for tool-specific files and returns an `ImportResult` containing scopes, capabilities, MCP servers, hooks, and LSP configs. The synthesizer merges all results, deduplicates by source preference (`--prefer claude|copilot|cursor`), and writes `.context.toml` files at each relevant directory level.

### Memory Management (`memory.py`)

Claude Code stores auto-memory at `~/.claude/projects/{encoded-path}/memory/`. Memory content is profile-specific: a debug session's memory shouldn't leak into a documentation session.

On profile switch, aictl:
1. Stashes old memory: `.../memory/` to `.../memory.{from_profile}.bak/`
2. Restores new memory: `.../memory.{to_profile}.bak/` to `.../memory/`

Path encoding handles macOS case-insensitivity, symlinks, and UNC paths.

### Deployment Manifest (`manifest.py`)

`.ai-deployed/manifest.json` tracks every file written during a deployment:

```json
{
  "deployed_at": "2026-03-27T...",
  "profile": "debug",
  "root": "/path/to/project",
  "files": ["CLAUDE.md", ".mcp.json", ...]
}
```

Used by cleanup to remove files from a previous profile without touching user-created files.

---

## 2. Discovery Registry

### CSV-Driven Tool Detection (`registry.py`, `discovery.py`)

Tool discovery is data-driven, not hardcoded. Four CSV files define what to look for:

| CSV | Contents |
|-----|----------|
| `paths-unix.csv` | File path templates for Linux/macOS |
| `paths-windows.csv` | File path templates for Windows |
| `processes-unix.csv` | Process name patterns for Linux/macOS |
| `processes-windows.csv` | Process name patterns for Windows |

Each row specifies a tool name, a path template with variables (`{HOME}`, `{XDG_CONFIG_HOME}`, `{APPDATA}`), file category, and metadata (whether it's sent to the LLM, cacheable, loaded when, etc.).

**Resolution flow**:
1. Load CSV for current platform
2. Expand variables to real paths
3. Check filesystem for matches
4. Return `ToolResources` per tool — containing `ResourceFile`, `ProcessInfo`, `McpServerInfo`, and `MemoryEntry` records

**Tool Taxonomy** (`TOOL_TAXONOMY` dict): 27+ tools with vendor, host, default model, color, and icon metadata. Tools include Claude Code, GitHub Copilot (CLI/VS Code/JetBrains), Cursor, Windsurf, Microsoft 365 Copilot, Semantic Kernel, Azure PromptFlow, Azure AI/azd, Codex CLI, and others.

### Feature Matrix (`feature_matrix.py`)

When deploying `.context.toml` features to specific tools, aictl warns about unsupported combinations (e.g., hooks are Claude Code-only, agents are Copilot-only). Warnings are non-blocking.

---

## 3. Monitoring Pipeline

The monitoring subsystem provides live observability for active AI tool sessions.

```
┌─────────────────────────────────────────────────┐
│              MonitorRuntime                      │
│         (asyncio event loop on background thread)│
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │            Collectors                      │  │
│  │  ┌─────────────┐  ┌────────────────────┐   │  │
│  │  │ Discovery   │  │ Process (psutil)   │   │  │
│  │  └─────────────┘  └────────────────────┘   │  │
│  │  ┌─────────────┐  ┌────────────────────┐   │  │
│  │  │ Filesystem  │  │ Telemetry          │   │  │
│  │  │ (watchdog)  │  │ (tool-specific)    │   │  │
│  │  └─────────────┘  └────────────────────┘   │  │
│  │  ┌─────────────────────────────────────┐   │  │
│  │  │ Network (platform-specific)         │   │  │
│  │  │   macOS: nettop  Linux: ss/tcpinfo  │   │  │
│  │  │   Windows: connection-weighted      │   │  │
│  │  └─────────────────────────────────────┘   │  │
│  └──────────────────┬─────────────────────────┘  │
│                     │                            │
│                     ▼                            │
│           ┌──────────────────┐                   │
│           │ SessionCorrelator│                   │
│           │ PIDs → sessions  │                   │
│           │ token estimation │                   │
│           │ event emission   │                   │
│           └──────────────────┘                   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  SampleSink  │──▶ HistoryDB (SQLite)
              │ (thread-safe)│──▶ SnapshotStore (ring buffers)
              └──────────────┘
```

### Collectors (`monitoring/collectors/`)

All collectors extend `BaseCollector` and implement `async collect()`:

| Collector | Source | Interval | Data |
|-----------|--------|----------|------|
| `DiscoveryCollector` | CSV registry + filesystem | 5s | Files, MCP servers |
| `PsutilProcessCollector` | psutil process table | 1s | PID, CPU%, memory, threads |
| `WatchdogFileCollector` | FSEvents/inotify | event-driven | File create/modify/delete events |
| `StructuredTelemetryCollector` | Tool-specific logs | 5s | Token counts, latency |
| `NetworkCollector` | Platform adapter | 1s | Per-process bytes in/out |

### Session Correlator (`monitoring/correlator.py`)

The correlator is the central state manager. It receives events from all collectors and correlates them into coherent tool sessions:

- Maps PIDs to sessions via process tree walking
- Infers which tool a session belongs to (from process name, working directory, file patterns)
- Estimates tokens from network traffic with confidence levels
- Detects MCP server loops and anomalies
- Emits structured events for the dashboard

Key state:
```python
sessions: dict[str, SessionState]      # session_id → state
pid_to_session: dict[int, str]         # PID → session_id
pid_to_process: dict[int, ProcessInfo] # live process data
pending_events: list[dict]             # for dashboard consumption
```

### Metric Emission (`sink.py`)

All collectors and the correlator emit metrics through a thread-safe `SampleSink`:

```python
sink.emit("process.cpu.utilization", 45.2, {"process.pid": 1234, "aictl.tool": "claude-code"})
sink.emit("aictl.file.tokens", 2040, {"path": "/project/CLAUDE.md"})
```

The sink dispatches to registered handlers: `HistoryDB` for persistence, `SnapshotStore` for in-memory ring buffers.

---

## 4. Storage

### SQLite Persistence (`storage.py`)

`HistoryDB` provides zero-dependency time-series storage:

- **Write-behind batching**: metrics buffered in memory, flushed every 10 seconds
- **WAL mode**: concurrent readers with single writer
- **Auto-compaction**: full resolution for 24h, 1-minute averages for 7 days, 5-minute averages for 30 days, then deleted
- **Default location**: `~/.config/aictl/history.db`

Tables:
- `metrics` — aggregate system metrics (files, tokens, CPU, memory, MCP, live sessions)
- `tool_metrics` — per-tool time series (CPU, memory, tokens, traffic, model)
- `events` — chronological event log (tool, kind, detail)
- `samples` — raw metric samples with labels (OpenTelemetry-style)
- `sessions` — session state snapshots
- `telemetry_kv` — key-value telemetry pairs per tool

### In-Memory Store (`store.py`)

`SnapshotStore` provides real-time access for the dashboard:

- Thread-safe snapshot storage with version-based change notification
- Ring buffers for sparkline history (360 entries, ~30 minutes at 5s intervals)
- Per-tool history (120 entries for detail views)
- `AllowedPaths` whitelist for safe file content inspection

---

## 5. Dashboard

Three rendering targets share the same `DashboardSnapshot` data model.

### Data Model (`dashboard/models.py`)

```python
@dataclass
class DashboardTool:
    tool: str               # registry key
    label: str              # human-friendly name
    vendor: str             # tool vendor
    files: list             # ResourceFile records
    processes: list         # ProcessInfo records
    mcp_servers: list[dict] # MCP server status
    live: dict | None       # live monitor overlay (sessions, traffic, tokens)
    token_breakdown: dict   # always-loaded, on-demand, cacheable

@dataclass
class DashboardSnapshot:
    timestamp: float
    root: str
    tools: list[DashboardTool]
    agent_memory: list      # Claude Code memory entries
    mcp_detail: list        # enriched MCP server info
    live_monitor: dict      # correlator summary
    tool_telemetry: list    # structured telemetry KV pairs
    tool_configs: list      # tool-specific config metadata
    events: list            # chronological events
    sessions: list          # active sessions
    # ... plus computed aggregates (total_files, total_tokens, etc.)
```

### Web Dashboard (`dashboard/web_server.py` + `dashboard/ui/`)

A real-time interactive dashboard built with Vite + Preact + htm tagged templates (not JSX). Auto-updates via Server-Sent Events with periodic full-snapshot fallback. Design tokens, component patterns, and accessibility status are documented in [`docs/dashboard-design-system.md`](dashboard-design-system.md).

**Backend** — `ThreadingHTTPServer` with REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Static HTML + JS (from `dist/`) |
| `/api/snapshot` | GET | Current snapshot JSON |
| `/api/file?path=...` | GET | File content (restricted to discovered files) |
| `/api/budget` | GET | Token budget analysis |
| `/api/stream` | GET | SSE real-time updates |
| `/api/history?range=1h\|6h\|24h\|7d` | GET | Time-series history |
| `/api/events?tool=...&since=...` | GET | Filtered event log |
| `/api/samples?metric=...&since=...` | GET | Prometheus-style metric samples |
| `/api/sessions` | GET | Active and historical sessions |
| `/api/layout` | GET | Widget layout configuration |

**Frontend** — Preact 10 with htm/preact tagged template literals:

| Component | Tab | Purpose |
|-----------|-----|---------|
| `TabOverview` | Overview | Tool cards in grid, collapsible with file categories |
| `TabProcesses` | Processes | Process table sorted by memory, anomaly detection |
| `TabBudget` | Budget | Token budget bars, daily usage chart, model breakdown |
| `TabEventsStats` | Events | Per-tool time series, telemetry KV cards, event feed |
| `TabLive` | Live | Collector diagnostics, per-tool sessions, traffic |
| `TabMcp` | MCP | Server status table with connectivity indicators |
| `TabMemory` | Memory | Agent memory browser with content preview |
| `TabSessions` | Sessions | Active session cards, historical session table |
| `TabSamples` | Metrics | Time-series metric explorer |
| `ToolCard` | — | Expandable tool card (delegates to FileTree, ToolCardSections) |
| `FileViewer` | — | Slide-in file content panel with focus trap |
| `MiniChart` | — | uPlot sparkline wrapper |
| `ChartCard` | — | Chart with title and hover tooltip |
| `ResourceBar` | — | Visual resource usage bars |
| `EventTimeline` | — | Horizontal event timeline |
| `ContextMap` | — | Context window file category map |

### Terminal Dashboard (`dashboard/tui.py`)

Textual-based TUI with live-updating stat cards, per-tool summaries, sparkline history, and tabbed views (Files, File Content, Processes, MCP Servers, Agent Memory, Live Monitor). Connects to a running `aictl serve` instance when available, falls back to local collection.

### HTML Report (`dashboard/html_report.py`)

Self-contained static HTML with embedded CSS/JS. Expandable tool cards, process/file/MCP tables, agent memory browser. No server needed — open directly in a browser.

### Client Mode (`client.py`)

All three rendering targets can operate in two modes:

| Mode | Condition | Data source | Capabilities |
|------|-----------|-------------|--------------|
| **Server** | `aictl serve` running | REST + SSE from `http://127.0.0.1:{port}` | Full: history, sessions, events, samples |
| **Standalone** | No server | Direct `collect()` call | Degraded: one-shot snapshot only, no persistence |

`ServerClient.try_connect()` probes the server with a 1s timeout. If reachable, CLI/TUI switch to client mode and get the full data set. If not, they fall back to local collection. The web dashboard always requires the server.

---

## 6. Server Orchestration

`orchestrator.py` wires everything together for `aictl serve`:

```
start_server(root, port, interval)
    │
    ├── Create HistoryDB (SQLite persistence)
    ├── Create SampleSink (metric router)
    ├── Create SnapshotStore (in-memory + ring buffers)
    │
    ├── Start PersistentMonitor (background thread)
    │   └── asyncio event loop
    │       └── MonitorRuntime with 5 collectors
    │           └── SessionCorrelator
    │
    ├── Start RefreshLoop (periodic snapshot collection)
    │   └── Every {interval} seconds:
    │       1. collect() — discovery + live monitor merge
    │       2. SnapshotStore.set_snapshot()
    │       3. SampleSink flush to SQLite
    │
    └── Start HTTP server (ThreadingHTTPServer)
        └── Serves REST API + SSE + static frontend
```

### Threading Model

```
Main Thread
├── HTTP Server (ThreadingHTTPServer — thread per request)
│   ├── Request handler threads (REST API, SSE clients)
│   └── SSE push on snapshot version change
│
├── RefreshLoop Thread
│   └── Periodic collect() + snapshot update
│
└── PersistentMonitor Thread
    └── asyncio event loop
        ├── DiscoveryCollector (5s)
        ├── ProcessCollector (1s)
        ├── FileCollector (event-driven)
        ├── TelemetryCollector (5s)
        ├── NetworkCollector (1s)
        └── SessionCorrelator

Write-Behind Thread (from HistoryDB)
└── Flushes metric samples to SQLite every 10s
```

Synchronization: `SampleSink` uses `threading.Lock`, `SnapshotStore` uses `threading.Condition` for version-based notification, `HistoryDB` uses SQLite WAL mode for concurrent readers.

---

## 7. CLI Commands

| Command | Module | Description |
|---------|--------|-------------|
| `deploy` | `commands/deploy.py` | Scan, parse, resolve, emit, cleanup, memory swap |
| `import` | `commands/import_cmd.py` | Reverse-engineer native files into `.context.toml` |
| `scan` | `commands/scan.py` | Find all `.context.toml` files in directory tree |
| `status` | `commands/status.py` | Show all AI tool resources (files, processes, MCP, memory) |
| `serve` | `commands/serve.py` | Start web dashboard server with live monitoring |
| `dashboard` | `commands/dashboard.py` | Launch TUI terminal dashboard |
| `monitor` | `commands/monitor.py` | Raw monitoring output (live, doctor, once modes) |
| `plugin` | `commands/plugin.py` | Package `.context.toml` as Claude Code plugin |
| `diff` | `commands/diff_cmd.py` | Compare deployed files between profiles |
| `init` | `commands/init_cmd.py` | Scaffold starter `.context.toml` file |
| `validate` | `commands/validate_cmd.py` | Lint `.context.toml` files for errors |
| `memory` | `commands/memory.py` | Show/manage per-profile memory stashes |
| `config` | `commands/config_cmd.py` | Read/write `~/.config/aictl/config.toml` |

---

## 8. Configuration

**Config file**: `~/.config/aictl/config.toml` (macOS/Linux) or `%APPDATA%/aictl/config.toml` (Windows).

```toml
[serve]
port = 8484
host = "127.0.0.1"
interval = 5.0
open_browser = true
monitor = true

[monitor]
sample_interval = 1.0
process_interval = 1.0
network_interval = 1.0
telemetry_interval = 5.0
filesystem_enabled = true
telemetry_enabled = true

[storage]
db_path = "~/.config/aictl/history.db"
```

CLI flags override config values.

---

## 9. Platform Support

All three platforms share the same codebase with platform-specific adapters in `platforms.py`:

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| File discovery | FSEvents | inotify | ReadDirectoryChanges |
| Process detection | psutil | psutil | psutil |
| Network monitoring | nettop adapter | ss/tcpinfo | connection-weighted fallback |
| Stack traces | `sample` | `eu-stack`/`gdb` | not available |
| Path resolution | `~/Library/`, `/tmp/` | `~/.config/`, `/tmp/` | `%APPDATA%`, `%LOCALAPPDATA%` |

---

## 10. Security

- **Atomic writes**: `write_safe()` writes to temp file then renames, preventing partial writes
- **Manifest-scoped cleanup**: only removes files listed in the previous deployment manifest
- **File inspection whitelist**: `AllowedPaths` restricts the `/api/file` endpoint to discovered resource files only — arbitrary paths return 403
- **Read size limit**: file content reads capped at 200KB (shows tail for larger files)
- **No secrets in discovery**: CSV paths skip `.env`, credentials files, and private keys
