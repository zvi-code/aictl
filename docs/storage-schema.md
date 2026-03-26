# aictl Storage Schema

SQLite database at `~/.config/aictl/history.db` (configurable via
`[storage] db_path` in `config.toml` or `--db` CLI flag).

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

## Configuration

```toml
# ~/.config/aictl/config.toml
[storage]
db_path = ""          # Empty = auto (~/.config/aictl/history.db)
flush_interval = 10.0 # Seconds between batch writes
retention_days = 30   # Delete data older than this
```

CLI: `aictl serve --db /path/to/custom.db`

## Compaction Policy

| Age | Resolution | Method |
|-----|-----------|--------|
| 0–24h | Full (every snapshot) | No change |
| 24h–7d | 1-minute averages | `GROUP BY minute bucket` |
| 7d–30d | 5-minute averages | `GROUP BY 5-min bucket` |
| >30d | Deleted | `DELETE WHERE ts < cutoff` |

Compaction runs on startup and can be triggered via `db.compact()`.
