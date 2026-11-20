# Architecture

aictl is a cross-platform control plane for AI coding tools. It has two major subsystems:

1. **Context Management** — a deploy/import pipeline that translates a unified `.context.toml` format into native files for Claude Code, GitHub Copilot, Cursor, and Windsurf
2. **Observability** — a live monitoring and dashboard system that discovers, tracks, and visualizes AI tool resources across 27+ tools

Both subsystems share a CSV-driven discovery registry and a common data model.

```
                           ┌──────────────┐
                           │   CLI (click) │
                           │  ctx/daemon/  │
                           │ session +more │
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
├── cli.py                  # Click entrypoint — registers command groups (ctx, daemon, session) + top-level commands
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
├── records.py              # Typed rows and normalization helpers
├── orchestrator.py         # Server lifecycle and in-memory SnapshotStore
├── client.py               # HTTP client for connecting to running aictl daemon serve
├── stores/                 # Store plugin interfaces and Kusto implementation
│
├── commands/               # CLI command implementations (grouped by domain)
│   ├── ctx_pipeline.py     #   aictl ctx: deploy, scan, diff, validate, init
│   ├── daemon.py           #   aictl daemon: serve, monitor (live/doctor), dashboard
│   ├── session.py          #   aictl session: list, kill
│   ├── status.py           #   aictl status, aictl memory
│   ├── import_plugin.py    #   aictl import, aictl plugin
│   ├── integrations.py     #   aictl enable, aictl hooks, aictl otel
│   ├── disable.py          #   aictl disable, aictl audit (tail/path)
│   └── admin.py            #   aictl config, catalog, db, build-ui, reinstall
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
│   ├── web_server.py       #   ThreadingHTTPServer — routing and static assets
│   ├── live/
│   │   ├── protocol.py     #     Source authority, stable IDs, and wire capabilities
│   │   ├── hub.py          #     Bounded entity state, replay, and client backpressure
│   │   ├── projection.py   #     Store history and independent operational health
│   │   └── stream.py       #     HTTP live capabilities and SSE handlers
│   ├── contract/           #   JSON Schemas for live topics and HTTP details
│   ├── projections/       #   Dashboard projections over named store views
│   ├── history_board.py    #   Scoped panel and whole-window chart reads
│   ├── queryable_context.py #  Context inventory and file details
│   ├── api_handlers.py     #   REST handlers for details and actions
│   ├── tool_config_editor.py #  Read/write tool config edits (audited)
│   ├── tui.py              #   Textual TUI app
│   ├── html_report.py      #   Self-contained static HTML report
│   ├── collector.py        #   One-shot snapshot (used by TUI standalone)
│   ├── dist/               #   Built Vite static assets (served by web_server)
│   └── ui/                 #   Frontend source (Vite + Solid + TypeScript)
│       └── src/
│           ├── main.ts            # Browser entry
│           ├── shell/             # Navigation, scope/range controls, and screens
│           ├── data/              # Generated contract, live store, and detail resources
│           ├── panels/            # Board panels and their data sources
│           └── ui/                # Shared Solid UI primitives
│
└── data/                   # CSV registries and schema files
    ├── paths-unix.csv      #   Tool file paths for Linux/macOS
    ├── paths-windows.csv   #   Tool file paths for Windows
    ├── processes-unix.csv  #   Process detection patterns (Linux/macOS)
    ├── processes-windows.csv  # Process detection patterns (Windows)
    ├── metrics.yaml        #   OpenTelemetry metric definitions
    ├── telemetry-sources.yaml  # Structured telemetry collection rules
    └── tool-configs.yaml   #   Tool-specific config metadata
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
[instructions]                  — Instructions (profile keys → multi-line strings; `key@tool` for tool overlays)
[commands.<profile>.<name>]     — Slash command (content key; optional tools/not_tools selectors)
[agents.<profile>.<name>]       — Agent definition (content key; optional tools/not_tools selectors)
[skills.<profile>.<name>]       — Skill definition (content key; optional tools/not_tools selectors)
[mcp.<profile>.<name>]          — MCP server config (native TOML keys; optional tools/not_tools selectors)
[hooks.<profile>]               — Lifecycle hooks (EventName = 'JSON string')
[lsp.<profile>.<name>]          — LSP server config (native TOML keys; optional tools/not_tools selectors)
[settings.<profile>]            — Setting key/value pairs
[permissions]                   — Permission patterns
[env.<profile>]                 — Environment variables
[ignores]                       — Tool-specific ignore patterns
[memory]                        — Memory hints (profile keys; `key@tool` for tool overlays)
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
- **Tool axis**: `resolve(root, scanned, profile, tool=...)` takes an optional `tool` argument orthogonal to the profile. When set, it applies the author-intent tool filter — `@tool` text overlays on `[instructions]`/`[memory]` and `tools`/`not_tools` selectors on named entries (see [context.toml-format.md](context.toml-format.md#tool-targeting-mode--tool)). `tool=None` disables all tool filtering and is fully backward-compatible.

**Phase 4 — Emit** (`emitters/`): Deploy calls `resolve(...)` **once per emitter** with `tool=<emitter name>`, so each tool receives its own tool-targeted `Resolved`. For each registered emitter (claude, copilot, cursor, windsurf, gemini), write native files at the root. The built-in feature-support matrix is applied here as a safety net beneath the author-intent filter. Each emitter implements:

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

### Project file discovery (`tree_walk.py`)

Templates that can match anywhere in a project (`AGENTS.md`, `.github/**`, `.vscode/mcp.json`, `.context.toml`, the files one level inside hidden folders) are found per git repository, not by a walk of every folder under the start folder:

1. **Sessions first.** The working folder of each active session is resolved to its git root (the nearest folder with a `.git` folder or file, so a worktree or a submodule is a repository of its own). These repositories are read first.
2. **Targeted git calls.** In a repository, two `git ls-files` calls run at the same time with pathspecs for the known names only: `-c -o --exclude-standard` for tracked and new files, and `-o -i --exclude-standard --directory` for ignored files, so a tool file that `.gitignore` lists is still found. An ignored folder comes back as one entry: an ignored tool folder (`.vscode`, `.claude` ...) is read directly, another ignored hidden folder one level deep, and the rest (dependencies, build output) is skipped. Only the matches are kept. Submodules (from `.gitmodules`) and repositories inside a repository are read on their own; a repository inside a hidden or tool folder is a worktree copy and is not read.
3. **No rescan of an unchanged repository.** Each repository keeps its result with a stat-only signature: the mtimes of `.git/index`, `.git/HEAD` (from the real git folder of a worktree or submodule), the top folder, `.gitignore`, its tool folders and every folder that held a match. While the signature is unchanged, no git process starts. A new file deep in a folder that held no match does not change the signature, so each repository is read again in full once an hour, at a time spread by its path, and one request does at most two such refreshes.
4. **Lazy in the daemon.** `CollectionService.start()` turns on lazy mode: a listing reads only the repositories of active sessions (and the repository aictl started in, when it started in one) while the caller waits. A low-priority background thread reads the other repositories one at a time. Until it has finished, `tree_walk.state(root)` reports `partial: true`.
5. **Outside git.** Folders that are not in a repository are walked to depth 4 with the skip list `PRUNE_DIRS`, looking only for repositories and the known names. There is no folder limit inside repositories; the walk outside git stops after 50,000 folders and then says how many repositories it found and that the active projects were read in full.
6. **Without git.** When git is missing or cannot list a repository, that repository is read directly with the skip list, up to 20,000 folders. On Windows every git process starts without a console window.

`tree_walk.session_links()` maps each active session's git root to its sessions and to the matched files each session can be affected by: a file affects a session when the session's working folder is the file's folder, or the folder that holds its tool folder, or lies below it.

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
              │  SampleSink  │──▶ Store writer (Kusto)
              │ (thread-safe)│──▶ Live dashboard samples
              └──────────────┘
```

### Collectors (`monitoring/collectors/`)

All collectors extend `BaseCollector` and implement `async collect()`:

| Collector | Source | Interval | Data |
|-----------|--------|----------|------|
| `DiscoveryCollector` | CSV registry + filesystem | 5s | Files, MCP servers |
| `PsutilProcessCollector` | psutil process table | 1s | PID, CPU%, memory, threads |
| `WatchdogFileCollector` | FSEvents/inotify/ReadDirectoryChangesW + `git status` | event-driven | Git repositories (under the root and of each session's working folder) and AI tool state folders. In a repository, `RepoChangeTracker` (`monitoring/repo_changes.py`) reports only changes that git sees and AI tool files that git ignores, and `HEAD` reflog lines as `git_head` events |
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

The sink hands typed metric rows to the store writer and sends live samples to dashboard subscribers.

---

## 4. Storage

Kusto is the only persistent history backend. `stores.open_store()` supplies
the configured plugin's reader and writer. Without a configured store, live
collection continues and history is unavailable; there is no SQLite fallback.
Third-party tool databases, including Copilot session stores, are read-only
collection inputs, not aictl history.

The plugin under `stores/kusto/` owns the native table definitions, schema and
retention management, and parameterized `.kql` views. Dashboard projections
request named views instead of issuing KQL. Producers hand typed rows to the
writer, which stamps node and version identifiers and submits bounded batches
outside collector threads. Deletes use tombstones on tables that support them.
Raw OTLP exports use separate tables from derived session and event records.
Queued acknowledgement does not establish that rows are queryable.

Retention runs in Kusto; text tables have separate policies and use a trim
watermark to keep late uploads from restoring expired text. Health reports
writer telemetry separately from store inventory and retention metadata.
`SnapshotStore` in `orchestrator.py` holds the daemon's current snapshot, not
persistent history. `AllowedPaths` controls which local files can be inspected.

See [Kusto setup and ingestion configuration](kusto-cluster.md) and
`aictl db schema` for the current native tables.

---

## 5. Dashboard

The daemon collects a `DashboardSnapshot` for local runtime state. Web and
terminal clients read projections of that state and queryable history; the
static HTML report renders a snapshot directly.

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

`web_server.py` serves the Vite assets and dispatches HTTP routes. The Solid
shell presents the board, Health and Settings. `ui/src/data/` applies the live
baseline and changes to a keyed store and caches on-demand detail requests.
Panels consume typed sources through `panels/data.ts`. See
[UI design](ui/design.md) for tokens, primitives and accessibility rules.

The [contract index](../src/aictl/dashboard/contract/index.json) maps live
topics and detail routes to JSON Schemas. `npm run gen:contract` generates the
browser's `contract.gen.ts` from those schemas.

| Read | Purpose |
|------|---------|
| `/api/live/capabilities` | Protocol version, supported topics and source authority |
| `/api/live/stream` | Scoped entity baseline, changes and cursor replay; includes local board history and `runtime.health` |
| `/api/history/board` | Historical panels for a named node or fleet; `view=charts` returns only `node_scope`, `range` and `series` |
| Contract detail routes | On-demand records such as node reports, context, sessions and file details |

A time-range selection changes the board's panel window. Its chart keeps the
whole displayed range through a separate historical read. The browser checks the
returned scope before using that read. Remote Health reports node writer
counters only from fresh samples for the reported daemon process; shared Kusto
inventory (including retention when known) is not attributed to those nodes.
The snapshot endpoints `/api/snapshot` and `/api/stream` remain in use by
integration or recording tools; they are not the Solid board data path.

**Python clients** — The CLI and TUI check `/api/live/capabilities` before
opening `/api/live/stream`. They use live entities for process and session
state. The TUI resumes from the last applied cursor on reconnect and replaces
its state when the daemon sends a new bootstrap. The local
`/api/board/terminal/*` details supply resource metadata, session counters,
recent events, metric samples, and previews of discovered files. `aictl board`
reads the scoped `/api/board/nodes` detail directly.

### Live source contract

Authority follows the **kind and field**, not the selected screen. The
[`live/protocol.py`](../src/aictl/dashboard/live/protocol.py) rules are exposed
by `/api/live/capabilities`. [`live/stream.py`](../src/aictl/dashboard/live/stream.py)
serves both live routes. The discovery registries and datapoint catalog still
define tools and datapoint meanings.

| Data | Authority and delivery |
|------|------------------------|
| Current process presence, CPU, RSS and running/idle evidence | Runtime collectors; latest values can coalesce. A missing first sample is unknown, not zero. PID identity includes process birth time. |
| Native output/progress of a proven running session | Supported native session adapters; ordered incremental entries with stable native identities. No hook/OTel/usage overlay. |
| Current configured settings | Filesystem signature watchers using the shared `current_tool_configs()` cache. These are configured-on-disk records. |
| Settings a running agent loaded/reports | Separate `configuration.loaded` evidence, from allowlisted process flags or native reports. Unreported values remain unknown; a disk edit does not establish a reload. |
| Historical sessions, file inventory/history, hooks, OTel, usage, cost and activity | Queryable results from the configured store, including for running agents. An accepted upload or DM acknowledgement does not supply these values. |
| Collection/transport health | Process-local operational counters can stream independently. Cached queryable volume, client upload volume and DM policies retain their separate scopes/timestamps. |

`CollectionService` creates the [hub](../src/aictl/dashboard/live/hub.py) and the
runtime and configuration producers. Collectors publish current observations
without waiting for snapshot collection, persistence or a cluster read.
The web server adds one independent
operational-health worker and one coalescing history-projection worker. Health
or Settings can subscribe with `history=0` without starting the board query.
Closing a stream releases its subscription; it does not construct another
collector or store reader.

The Kusto plugin uses one shared reader per daemon and destination. The reader
detects query-visible changes, including other machines' writes.
A reader bootstrap captures its cursor before the first
history baseline. Fixed cursor ranges, supplemental query-visible reads and
reconciliation handle writes that become visible after their producer timestamp,
streaming rows whose database cursor has not caught up, tombstones and retention.
`_v` is a row version, not a wall-clock high-water mark. No local writer callback
or ingestion receipt advances historical UI state.

Reader API, query plans, policy/RowStore limits and the read-only validation scope
are specified in [Kusto live reader](kusto-live-reader.md).

The [history worker](../src/aictl/dashboard/live/projection.py) builds the Board
from named views on the configured store reader. If the reader provides a
`live_feed`, its change hints refresh the shared projection for active filters.
Otherwise, the worker polls the views and the hub publishes the entity differences.
Runtime gauge changes do not invalidate historical views. Historical analytics
and drawer details remain on demand.
Current-state filters select queryable historical usage using proven runtime
session identities/statuses, not event-derived running/idle guesses. A status
membership change recomposes that selected population; a CPU/RSS change does
not. Until the first runtime baseline, that population is unknown rather than
an empty set with zero usage.

Completed projections are split into stable row entities and scalar/object
fields. Only changed entities and explicit removals enter the hub; the server
does not stream repeated whole-board JSON. Collection order is carried separately
from identity, so sorting does not create new agent identities. Mixed rows keep
separate authorities: skill usage is historical, for example, while its current
configured description is filesystem evidence. Historical status is kept apart
from the runtime status/resources of an agent.

**Wire protocol.** `/api/live/stream` accepts the existing board filters plus
`history=0` and an optional opaque `cursor`. The `scope` is the canonical sorted
board query without transport controls. A `bootstrap` SSE event contains
`protocol`, `epoch`, `sequence`, `cursor`, `scope`, capabilities, retention
information and `entities`. Each entity has `{topic, id, revision, source, data}`.
A `change` event carries the same revision domain with `upserts` and `removals`.
`history.board`, `configuration.board` and `catalog.board` use
`data={scope,field,value,key?,order?,collection?,merge?}`. Complementary partial
rows merge by the same collection key; collection markers preserve empty lists.
The source for a topic is enforced by the hub, including the runtime-agent field
allowlist.
Canonicalization preserves blank values: `tool=` selects no tools and is not
equivalent to an absent tool filter. A transport bootstrap does not prove that
the requested data baseline has finished. Paused one-shot subscriptions wait for
the required payloads/source readiness or an explicit source error. Health
publishes pending/ready/error status for both its health and machine outputs;
history status distinguishes pending/rebuild from a failed first attempt.
Disk-only prompt definitions remain configured rows, not invented history rows.
Queryable prompt uses retain their recorded file even when that file is absent
locally. A skill's current path, description and file-token estimate are
filesystem fields; its usage tokens/counts remain queryable history.

The baseline capture and subscription registration share one lock, so changes
cannot fall between them. The SSE `id` is `epoch:sequence`; reconnect supplies
`Last-Event-ID` or `cursor` for the **same scope and retained client state**.
Available changes replay; an old epoch, evicted journal or producer/queue overflow
forces a fresh baseline with an explicit reason. Ordered-output loss also sets
`ordered_gap`. Sequences may jump after scope filtering or latest-value
coalescing; this is not itself a missing event. Entity revisions remain monotonic,
including removal and re-addition. Filter changes request a fresh scope baseline,
not a board GET for every stream notification.

**Bounds and failure behavior.** Defaults allow eight retained history scopes;
an unused scope expires after 60 seconds and active scopes are not evicted to
admit another. Hub state is bounded to 30,000 entities/32 MiB of accounted payload,
with a 1 MiB per-entity limit. The journal holds at most 2,048 changes/8 MiB.
Historical/configured-board projections have their own 24,000-entity/24 MiB
ceiling, reserving part of the global budget for runtime observations.
Each client has at most 4,096 pending entities/8 MiB: latest-value slots coalesce,
but native output has a separate ordered queue. Native output baselines retain
at most 2,000 entries/4 MiB, with evictions reported explicitly; this bounded tail
is not historical transcript storage. The SELECT-result LRU has 512 entries/
16 MiB. These are application accounting budgets, not a measured RSS limit.
An oversized historical projection leaves the last complete projection intact
and reports it stale rather than discarding arbitrary facts. A source error does
the same; the next attempt is delayed. Slow cluster reads run outside hub/runtime
locks.

Reader mailbox overflow/error marks history pending, invalidates the query-result
memo and forces a new subscription baseline. A projection started before that
reset cannot mark the scope ready. Reader policy changes, reconciliation and
schema changes refresh affected query dependencies without claiming a native
output gap. Reader status exposes policy-disabled/missing tables,
reconciliation-only fallback and configured bounds rather than silently
claiming cursor coverage.

The hub cursor describes delivered projection state, **not an atomic transaction
across Kusto queries**. History source status exposes its input reader frontier,
completion time, pending refresh and stale state. Concurrent cluster changes can
span an aggregate computation; a later invalidation schedules another pass.
No measured end-to-end latency or sustained throughput follows from this design.

**Freshness is per source, not a global refresh interval.** The current defaults
below are scheduling/work settings, not measured deadlines. A collector interval
can be changed in configuration; application/SDK time, scheduling and backlog add
to the interval.

| Data path | Current default cadence and limits |
|-----------|------------------------------------|
| Process CPU/RSS/presence | The daemon's process interval is configurable and defaults to 5 s. Its existing adaptive pace multiplies polling intervals by six when unwatched and inactive. Observations wake a separate publishing worker, whose fallback wait is 0.1 s; latest gauges coalesce. No history query is on this path. |
| Native output and loaded evidence | Filesystem events wake the native worker; its follow-up poll is 0.5 s. Explicit fallback inventory reconciliation is every 5 s. It follows at most 64 runtime-proven active files, initially at most a 128 KiB suffix, and processes at most 512 KiB per file/pass. Oversized records/rewrites declare gaps; text is capped at 8,000 characters with truncation metadata. |
| Configured-on-disk settings | Signature checks run every 1 s on an independent worker. The shared parser rechecks after 60 s even without a signature change for registry/non-file evidence. Parse/IO duration is additional; disk freshness does not establish loaded-agent freshness. |
| Health | The independent health producer runs every 1 s while watched. Backend client operation counters are process-local. Cached storage volume uses the existing 60 s cache; Health policy reads use a 300 s cache. Both retain their observed timestamps. The existing self-CPU helper has a 10 s cache. |
| Machine per-core CPU and discovery diagnostics | These remain runtime snapshot observations, normally collected on the daemon's 5 s snapshot refresh (also subject to adaptive pace and collection duration). Sending that value on a 1 s health tick does **not** make it a newly sampled per-core gauge. Process-level stream gauges do not wait for this snapshot. |
| Queryable history | Reader polling adapts from 0.5 s to 15 s idle delay. A poll allows four SDK requests total, including policy/discovery work, and pages at most 250 identity hints plus lookahead. Preview's 2 s setting is a target sharing that budget, not an independent 2 s guaranteed timer. |
| History fallback/recovery | Reader queries have a 15 s server timeout; errors can back off to 60 s. Schema/policy checks target 60/300 s. Eight-partition reconciliation targets a 300 s rotation; many tables, multi-page partitions and failures can extend it. Streaming cursor assignment can trail queryability by up to 60 s; preview reduces but does not bound that delay. |
| History projection | One worker coalesces reader invalidations across up to eight scopes, with a 1 s scheduling wait. Only affected SELECT inputs are invalidated. Scope computation uses the existing aggregate query behavior, not the reader's 15 s query timeout. A source error delays retry by 5 s. Current-status membership changes recompose the selected population without treating gauge updates as historical writes. |

Native binding requires verified Copilot in-use locks or explicit native
resume/session-ID evidence; a recently modified transcript is not evidence that a
process owns it. Normal watcher mode reuses existing collector events and cached
ingester inventory. The fallback scans nonrecursively, at most 256 candidate
entries per pass across round-robin homes. Sessions without binding evidence
remain unknown; processes that start and exit between process samples can remain
unobserved. Native records are bounded to 256 KiB; privacy-limited metadata
prefixes can leave loaded settings unknown.

The configured-settings stream is independent of historical computation.
Filesystem metadata attached to historical prompt/skill rows is refreshed with
that projection and retains the helpers' existing caches (prompt inventory
60 s, skill metadata 300 s); it is not a 1 s loaded-configuration guarantee.
Context/file-history detail queries are on demand rather than a second poller.

Consequently there is no finite end-to-end historical freshness guarantee under
unbounded writes, query backlog, unavailable policies or failures. Four requests
per poll do not imply 1,000 final changed rows per poll: discovery, changed-key
lookups, current-winner lookups and other tables share the budget. The history
worker can also wait behind another active scope. Hub/memo budgets bound retained
application state, not the transient memory or duration of an existing broad
aggregate computation. Completion/frontier/pending metadata and Health's actual
operation timings must be used instead of calling queryable updates immediate.

Native/config/process channels keep the existing loopback access, capture and
redaction boundaries: no raw command lines, environment blocks, tool arguments
or system prompts are added. Native text requires full capture and is masked.
Changing full capture to metadata/off removes retained native text and invalidates
unsent/replay state; enabling full capture again does not restore old native text.
Kusto context/file inventories are built from queryable rows, not a local scan;
an unavailable loading policy is reported unknown and excluded from known-policy
budget totals without removing its file. Historical artifacts use indexed size/
mtime; current local presence is unknown. Historical transcripts do not merge the
unpersisted analyzer, and historical commit GETs do not run local git attribution.

### Terminal Dashboard (`dashboard/tui.py`)

Textual-based TUI with live-updating stat cards, per-tool summaries, sparkline history, and tabbed views (Files, File Content, Processes, MCP Servers, Agent Memory, Live Monitor). Connects to a running `aictl daemon serve` instance when available, falls back to local collection.

### HTML Report (`dashboard/html_report.py`)

Self-contained static HTML with embedded CSS/JS. Expandable tool cards, process/file/MCP tables, agent memory browser. No server needed — open directly in a browser.

### Client Mode (`client.py`)

The CLI and TUI can operate in two modes:

| Mode | Condition | Data source | Capabilities |
|------|-----------|-------------|--------------|
| **Server** | `aictl daemon serve` running | REST + SSE from `http://127.0.0.1:{port}` | Full: history, sessions, events, samples |
| **Standalone** | No server | Direct `collect()` call | Degraded: one-shot snapshot only, no persistence |

`ServerClient.try_connect()` probes the server with a 1s timeout. If reachable, CLI/TUI switch to client mode and get the full data set. If not, they fall back to local collection. The web dashboard always requires the server.

---

## 6. Server Orchestration

`orchestrator.py` wires everything together for `aictl daemon serve`:

```
start_server(root, port, interval)
    │
    ├── Open the configured store plugin (or run without history)
    ├── Create SampleSink (metric router)
    ├── Create SnapshotStore (current snapshot in memory)
    │
    ├── Start PersistentMonitor (background thread)
    │   └── asyncio event loop
    │       └── MonitorRuntime with 5 collectors
    │           └── SessionCorrelator
    │
    ├── Start RefreshLoop (periodic snapshot collection)
    │   └── Every {interval} seconds (× 6 when idle), or 1.5 s after a hook
    │       or OTel batch arrives while a dashboard client is attached:
    │       1. collect() — discovery + live monitor merge
    │       2. SnapshotStore.update() — publish live state and hand off changed facts
    │
    └── Start HTTP server (ThreadingHTTPServer)
        └── Serves REST API + SSE + static frontend
```

### Threading Model

```
Main Thread
├── HTTP Server (ThreadingHTTPServer — eight pooled worker threads keep their history connections; a thread per request beyond them)
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

History Writer Thread
└── Flushes bounded native writer queues and saves local restart state
```

Synchronization: `SampleSink` uses `threading.Lock`; `SnapshotStore` uses
`threading.Condition` for version-based notification. Store writes and history reads
use separate plugin interfaces.

---

## 7. CLI Commands

Commands are organized into three groups plus top-level commands. All implementations live under `commands/` (grouped by domain, not one file per command).

**`aictl ctx` — context management** (`commands/ctx_pipeline.py`)

| Command | Description |
|---------|-------------|
| `ctx deploy` | Scan, parse, resolve, emit, cleanup, memory swap |
| `ctx scan` | Find all `.context.toml` files in directory tree |
| `ctx diff` | Compare deployed files between profiles |
| `ctx validate` | Lint `.context.toml` files for errors |
| `ctx init` | Scaffold starter `.context.toml` file |

**`aictl daemon` — server + monitoring** (`commands/daemon.py`)

| Command | Description |
|---------|-------------|
| `daemon serve` | Start web dashboard server with live monitoring |
| `daemon monitor` | Raw monitoring output (`live`, `doctor` subcommands) |
| `daemon dashboard` | Launch TUI terminal dashboard |

**`aictl session` — live session control** (`commands/session.py`, requires a running daemon)

| Command | Description |
|---------|-------------|
| `session list` | List active sessions and their PIDs |
| `session kill` | Signal a live session's process tree (TERM/KILL) |

**Top-level commands**

| Command | Module | Description |
|---------|--------|-------------|
| `import` | `commands/import_plugin.py` | Reverse-engineer native files into `.context.toml` |
| `plugin` | `commands/import_plugin.py` | Package `.context.toml` as Claude Code plugin |
| `status` | `commands/status.py` | Show all AI tool resources (files, processes, MCP, memory) |
| `memory` | `commands/status.py` | Show/manage per-profile memory stashes |
| `enable` | `commands/integrations.py` | One-shot: install hooks + OTel + VS Code agent settings |
| `hooks` | `commands/integrations.py` | Install/repair/inspect tool lifecycle hooks |
| `otel` | `commands/integrations.py` | Enable/inspect OpenTelemetry export per tool |
| `disable` | `commands/disable.py` | Reverse `enable` (remove hooks/OTel/settings) |
| `audit` | `commands/disable.py` | Inspect the mutation-ledger audit log (`tail`, `path`) |
| `config` | `commands/admin.py` | Read/write `~/.config/aictl/config.toml` |
| `catalog` | `commands/admin.py` | Inspect/sync the datapoint catalog |
| `db` | `commands/admin.py` | Inspect the schema, report on history, and maintain the configured Kusto store |
| `build-ui` | `commands/admin.py` | Rebuild the dashboard UI bundle |
| `reinstall` | `commands/admin.py` | Reinstall aictl (cross-platform, no Makefile needed) |

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
kusto_cluster = "https://mycluster.westus.kusto.windows.net"
kusto_database = "aictl"
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
- **Audited mutations**: config-changing endpoints (`PUT /api/tool-config/...`) and session control (`PUT /api/session-kill`) record every change to the mutation ledger; `aictl audit` surfaces the log
- **Local-bind default**: the server binds `127.0.0.1` by default so the REST API and mutation endpoints are not exposed to the network

## Hidden-context audit

`aictl ctx audit`, `GET /api/context-audit` and `HiddenContextPanel` all use
`src/aictl/context_audit.py`. It answers what can reach a tool's model and what
conceals itself there, in five layers:

1. **Inventory**: every source per tool, with scope, loading, bytes, estimated
   tokens, sha256, mtime and git state. Names come from `data/paths-*.csv` plus
   locations the tables do not model, such as walk-up, `@imports` and plugins.
2. **Dynamic injection**: hook stdout, MCP instructions, CLI flags in live process
   command lines, environment and settings overrides. No file shows this text,
   so these rows have `readable: false`.
3. **Drift**: new, changed and removed sources against a baseline, and tool-call
   writes to a source. A write after the baseline to an always-loaded source is high.
4. **Visibility gap**: a loaded path the inventory does not know, and first-request
   tokens the inventory cannot explain. The second is an estimate from numbers only.
5. **Content scan**: invisible and tag characters, hidden blocks, encoded blobs,
   override and concealment phrasing, and exfiltration patterns.

Copilot coverage includes plugin content from `installed-plugins`, settings that move
instruction, prompt, agent, skill and hook locations (user, profile, workspace and
`.code-workspace`), extension contributions, the Copilot Chat memory-tool store and text in
the desktop app's `data.db`. That database opens in SQLite immutable mode with named
columns only, so nothing still in its write-ahead log is seen. Windows adds policy under
`SOFTWARE\\Policies\\Microsoft\\VSCode`, persistent registry environment variables and
PowerShell profiles read as text. For Microsoft 365 Copilot only repository agent packages
are visible; the deployed agent, tenant policy, connectors and memory live in the service.

When a Kusto reader is available, the audit uses stored file-write and instruction-load
events as extra evidence. The
baseline is `context-baseline.json` in aictl's config dir, capped at 2 MB, with
hashes and metadata only; `--baseline PATH` moves it. With `[storage] capture = off`
it stays in memory. Hooks and MCP servers are parsed and never run. Files are
statted first and read again only when mtime or size changes.

## Live CLI view

`aictl ps` and `aictl top` (`src/aictl/observe/`) read the tools' own stores and psutil directly. They need
no daemon, open stores read-only and write nothing. Sessions are selected by recency and liveness, not by
parsing every store. `--json` output carries a `schema_version`.

## Storage bounds

`[storage] capture` selects `full`, `metadata`, or `off`. Kusto policies control table retention.
After an ingestion failure, the writer retries from bounded in-memory queues. Health shows the
queue depth and dropped rows per table. There is no local fallback database.

## Hooks fail open

A registered hook must never break or slow the host tool. The handler is a stdlib-only script that exits 0
silently when the interpreter is gone, the daemon is down or the payload is malformed. It prints nothing,
because hosts parse hook stdout. Events that replace or block host behaviour are never registered.
`src/aictl/hook_removal.py` is also standalone, so removal works even when aictl cannot start. Config writers
refuse to replace a file with content that does not parse.
