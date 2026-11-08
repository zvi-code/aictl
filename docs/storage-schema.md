# aictl Storage Schema

SQLite database at `~/.config/aictl/history.db` (configurable via
`[storage] db_path` in `config.toml` or `--db` CLI flag).

## One store per project

`history.db` is the machine store. It holds machine-wide tables: system and process
snapshots, health, tool stats, the catalog and file history. Rows that belong to a
session go to the store of that session's project, in a folder named after the
database (`history.db` gives `history-projects/`):

- `<repo-name>-<8 hex>.db` for each git repository. A worktree or submodule belongs
  to its main repository.
- `_shared.db` for sessions launched outside git.

The per-session tables are listed in `PROJECT_TABLES` in
[src/aictl/project_stores.py](../src/aictl/project_stores.py). `ProjectStores` routes
each write and attaches the stores a read needs. The machine store's `project_stores`
table records each store's file, time range and row count.

A `history.db` written before this split is split in the background. The daemon
moves its sessions to their project stores, a few seconds of work at a time. A
stopped move is finished on the next start. `aictl db reset` deletes only files that
are project stores.

## Schema Versioning

The `schema_version` table tracks the current schema version.
On startup, `HistoryDB` compares the stored version against `SCHEMA_VERSION`
and runs incremental migrations. Migrations are **additive only** —
new columns use `ALTER TABLE ADD COLUMN` with `DEFAULT` values so
existing data remains valid.

```sql
CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
```

---

## Version 1 (initial)

### `metrics` — Global aggregate time-series

One row per snapshot interval (~5s). Used for the top-level charts.

| Column | Type | Description |
|--------|------|-------------|
| `ts` | REAL PK | Unix timestamp |
| `files` | INTEGER | Total discovered files |
| `tokens` | INTEGER | Total estimated tokens across all files |
| `cpu` | REAL | Total CPU % across all AI tool processes |
| `mem_mb` | REAL | Total resident memory (MB) of AI tool processes |
| `mcp` | INTEGER | Count of active MCP servers |
| `mem_tokens` | INTEGER | Total tokens in AI context/memory files |
| `live_sessions` | INTEGER | Live monitor active sessions |
| `live_tokens` | INTEGER | Estimated live tokens in flight |
| `live_in_rate` | REAL | Inbound network bytes/sec |
| `live_out_rate` | REAL | Outbound network bytes/sec |

**Retention**: Full resolution for 24h, 1-min averages for 7d,
5-min averages for 30d, then deleted.

### `tool_metrics` — Per-tool time-series

| Column | Type | Description |
|--------|------|-------------|
| `ts` | REAL | Unix timestamp |
| `tool` | TEXT | Tool identifier (e.g. `claude-code`, `copilot-cli`) |
| `cpu` | REAL | CPU % for this tool's processes |
| `mem_mb` | REAL | Memory (MB) for this tool's processes |
| `tokens` | INTEGER | Total tokens in this tool's files |
| `traffic` | REAL | Network bytes/sec for this tool |

PK: `(ts, tool)`

### `events` — Timestamped event log

| Column | Type | Description |
|--------|------|-------------|
| `ts` | REAL | Unix timestamp |
| `tool` | TEXT | Tool identifier |
| `kind` | TEXT | Event type (see below) |
| `detail` | TEXT | JSON blob with event-specific data |

PK: `(ts, tool, kind)`

**Event kinds**: `session_start`, `session_end`, `config_change`,
`model_switch`, `anomaly`, `mcp_start`, `mcp_stop`, `file_modified`,
`otel_toggle`, `quota_warning`

### `file_store` — KV file content store

Tracked file contents with lazy updates. Only re-reads content when
file `mtime` changes.

| Column | Type | Description |
|--------|------|-------------|
| `path` | TEXT PK | Absolute file path |
| `tool` | TEXT | Owning AI tool |
| `category` | TEXT | `instructions`, `config`, `rules`, `memory`, etc. |
| `scope` | TEXT | `global`, `project`, `user` |
| `content` | TEXT | Full file text content |
| `content_hash` | TEXT | SHA-256 hex (truncated to 16 chars) |
| `size_bytes` | INTEGER | Content size in bytes |
| `tokens` | INTEGER | Estimated token count (~4 chars/token) |
| `lines` | INTEGER | Line count |
| `mtime` | REAL | File mtime at last read |
| `first_seen` | REAL | When first discovered |
| `last_read` | REAL | When content was last read |
| `last_changed` | REAL | When content last changed (hash diff) |
| `meta` | TEXT | JSON blob for tool-specific metadata |

### `file_history` — File content snapshots

Stores content at each change point for time-travel queries.

| Column | Type | Description |
|--------|------|-------------|
| `path` | TEXT | File path |
| `ts` | REAL | Timestamp of the change |
| `content` | TEXT | Content at this point |
| `content_hash` | TEXT | SHA-256 hex |
| `size_bytes` | INTEGER | Size |
| `tokens` | INTEGER | Tokens |
| `lines` | INTEGER | Lines |

PK: `(path, ts)`

---

## Version 2 (added telemetry + model column)

### Migration from v1

- `tool_metrics`: adds `model TEXT DEFAULT ''` column
- Creates `tool_telemetry` table

### `tool_telemetry` — Per-tool telemetry data

Rich token/usage data from OTel, stats-cache, events.jsonl, or
network inference.

| Column | Type | Description |
|--------|------|-------------|
| `ts` | REAL | Unix timestamp |
| `tool` | TEXT | Tool identifier |
| `source` | TEXT | Data source: `stats-cache`, `events-jsonl`, `otel`, `network-inference` |
| `confidence` | REAL | 0.0–1.0 confidence in the data |
| `input_tokens` | INTEGER | Lifetime input tokens |
| `output_tokens` | INTEGER | Lifetime output tokens |
| `cache_read_tokens` | INTEGER | Cache read tokens |
| `cache_creation_tokens` | INTEGER | Cache creation tokens |
| `total_sessions` | INTEGER | Total sessions observed |
| `total_messages` | INTEGER | Total messages/turns |
| `cost_usd` | REAL | Estimated cost in USD |
| `model` | TEXT | Primary model in use |
| `by_model_json` | TEXT | JSON: per-model breakdown `{model: {input, output, ...}}` |

PK: `(ts, tool)`

---

## Version 3 (added CSV spec tables)

### Migration from v2

- Creates `path_specs` and `process_specs` tables
- Auto-populates from CSV files via registry on first migration

### `path_specs` — CSV path specifications

Mirror of `paths-unix.csv` / `paths-windows.csv`. Enables SQL queries
across tool specifications (e.g. "all files for vendor=anthropic").

| Column | Type | Description |
|--------|------|-------------|
| `path_template` | TEXT | Path pattern (with `{project-root}`, `~`, etc.) |
| `ai_tool` | TEXT | Tool identifier |
| `vendor` | TEXT | Vendor (anthropic, github, openai, etc.) |
| `host` | TEXT | Host runtime (cli, vscode, desktop, etc.) |
| `platform` | TEXT | OS platform (macos, linux, windows, all) |
| `hidden` | INTEGER | Whether file is in hidden directory |
| `scope` | TEXT | global, project, user |
| `category` | TEXT | instructions, config, rules, memory, etc. |
| `sent_to_llm` | TEXT | yes/no/conditional |
| `approx_tokens` | TEXT | Estimated token range |
| `read_write` | TEXT | r, rw, w |
| `survives_compaction` | TEXT | Whether content survives context compaction |
| `cacheable` | TEXT | Whether content can be cached |
| `loaded_when` | TEXT | When the file is loaded (every-call, on-demand, etc.) |
| `path_args` | TEXT | Additional path arguments |
| `description` | TEXT | Human-readable description |
| `resolution` | TEXT | Resolution strategy (literal, rooted, recursive, etc.) |
| `root_strategy` | TEXT | How to find project root |

PK: `(path_template, ai_tool)`

### `process_specs` — CSV process specifications

Mirror of `processes-unix.csv` / `processes-windows.csv`.

| Column | Type | Description |
|--------|------|-------------|
| `process_name` | TEXT | Process display name |
| `ai_tool` | TEXT | Tool identifier |
| `vendor` | TEXT | Vendor |
| `host` | TEXT | Host runtime |
| `process_type` | TEXT | app, child, daemon, etc. |
| `runtime` | TEXT | node, electron, python, etc. |
| `parent_process` | TEXT | Parent process name |
| `starts_at` | TEXT | When process starts |
| `stops_at` | TEXT | When process stops |
| `is_daemon` | INTEGER | Whether process is a daemon |
| `auto_start` | INTEGER | Whether process auto-starts |
| `listens_port` | TEXT | Port(s) the process listens on |
| `outbound_targets` | TEXT | Outbound network targets |
| `memory_idle_mb` | TEXT | Idle memory usage |
| `memory_active_mb` | TEXT | Active memory usage |
| `known_leak` | INTEGER | Whether a memory leak is known |
| `leak_pattern` | TEXT | Description of leak pattern |
| `zombie_risk` | TEXT | Risk level for zombie processes |
| `cleanup_command` | TEXT | Command to clean up |
| `ps_grep_pattern` | TEXT | Regex for process matching |
| `platform` | TEXT | OS platform |
| `description` | TEXT | Human-readable description |

PK: `(process_name, ai_tool)`

**Refresh**: Call `db.sync_specs()` after modifying CSV files.

---

## Version 29 (added transcript usage)

### `session_usage` — Per-session usage read from tool transcripts

One row per logical session, written whole by the transcript usage ingester from
Claude Code, Codex and Copilot CLI transcripts. Holds numbers only, no prompt or
response text. Reads overlay it on `sessions`, so a transcript count replaces other
sources' counts and is never added to them. All token columns are disjoint classes.

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | TEXT PK | Tool's session UUID (a sub-agent rolls up to its root session) |
| `tool`, `model`, `project_path` | TEXT | Tool id, most-used model, working directory |
| `source`, `quality`, `quality_reason` | TEXT | Provenance: `transcript`; `exact` or `partial`; why |
| `input_tokens`, `output_tokens` | INTEGER | Uncached input; output |
| `cache_read_tokens`, `cache_creation_tokens` | INTEGER | Cache reads; cache writes |
| `request_count`, `tool_call_count`, `turn_count` | INTEGER | Deduplicated counts |
| `cost_usd` | REAL NULL | List-price estimate; NULL when no model could be priced |
| `cost_quality`, `cost_reason`, `unpriced_models` | TEXT | `estimated`, `partial` or `unknown`; why; JSON list |
| `models_json`, `daily_json` | TEXT | Per-model and per-local-day splits |
| `started_at`, `last_activity_at`, `updated_at` | REAL | Epoch seconds |

---

## Version 33 (tool call sizes)

`tool_invocations` gains `input_bytes` and `output_bytes`: the size of the
arguments an agent sent to a tool and of the result it got back, as UTF-8
text. The Claude Code, Copilot CLI and VS Code readers fill them from the
transcripts. Calls stored before v33 keep NULL.

## Configuration

```toml
# ~/.config/aictl/config.toml
[storage]
db_path = ""          # Empty = auto (~/.config/aictl/history.db)
flush_interval = 10.0 # Seconds between batch writes
retention_days = 30   # Delete data older than this
capture = "full"      # full, metadata or off; see "Bounds and capture modes"
max_total_mb = 1024   # Budget for the database, journal and logs
content_retention_days = 14  # With full: blank conversation text older than this
```

On Windows the file is `%APPDATA%\aictl\config.toml`.

CLI: `aictl daemon serve --db /path/to/custom.db`

## Compaction Policy

| Age | Resolution | Method |
|-----|-----------|--------|
| 0–24h | Full (every snapshot) | No change |
| 24h–7d | 1-minute averages | `GROUP BY minute bucket` |
| 7d–30d | 5-minute averages | `GROUP BY 5-min bucket` |
| >30d | Deleted | `DELETE WHERE ts < cutoff` |

The daemon runs maintenance 10 minutes after start and then every 30 minutes, in small transactions. It leaves rows older than its first run alone for one retention period; `aictl db compact` removes them on request (`--dry-run` prints the expected size).

## Bounds and capture modes

Storage is a disposable cache. Losing history is acceptable; hurting the host is not.

| `[storage]` key | Default | Effect |
|---|---|---|
| `capture` | `full` | `full`: text kept, bounded. `metadata`: no prompt, response or tool payload text, and no file content (hashes and sizes stay). `off`: 64 MB in-memory store, no DB, WAL or log files. Also `aictl daemon serve --capture`. |
| `max_total_mb` | 1024 | Budget for live DB pages, WAL and logs. Eviction order: rotated logs, text, message rows, then time series. Sessions, requests, agents, files and any table not listed for eviction stay. |
| `content_retention_days` | 14 | With `full`: blank conversation text older than this. |

Free pages do not count against the budget. Only `aictl db compact` (VACUUM) shrinks a file created before incremental vacuum. `aictl db trim-text` removes stored text from an existing DB.

If the DB file is corrupt, full or stays locked, the daemon continues on the in-memory store and `/api/self-status` reports `storage_degraded`.
