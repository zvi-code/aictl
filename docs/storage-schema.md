# Legacy aictl SQLite schema

Phase S z3 deleted the SQLite history layer. This page describes the retired local format. The daemon writes new history through
the Kusto store plugin. For current definitions, run `aictl db schema` or see
[`stores/kusto/tables.py`](../src/aictl/stores/kusto/tables.py). Local restart manifests
record collection progress; they are not a second history store.
Dashboard history uses the plugin's [named query views](../src/aictl/stores/kusto/queries),
not the local history file described here.

The former default database was `~/.config/aictl/history.db`.

## Session lifecycle columns (Kusto `sessions`, added after SQLite)

| Column | Type | Meaning |
|---|---|---|
| `last_activity_at` | real | Last time the session did something (a transcript line); 0 = unknown |
| `end_reason` | string | Why `ended_at` is set: `hook` (the tool's hook reported the end), `transcript` (the tool's session log recorded it, Copilot `session.shutdown`), `process_exit` (the bound process was seen to exit; `ended_at` is that time), `switched` (the bound process moved on to another session), `idle` (no activity for 15 min and no bound process: inferred). Empty while not ended |

Activity after `ended_at` (more than 5 s) clears both `ended_at` and `end_reason`: the
session was resumed. A process bound to a tool's own session (Claude Code
`sessions/<pid>.json`, Copilot `inuse.<pid>.lock`, `--session-id`/`--resume`) is linked in
`session_processes` and updates that session's row; it gets no `tool:pid:start` row of its own.

## One store per project

`history.db` is the machine store. It holds machine-wide tables: system and process
snapshots, health, tool stats, the catalog and file history. Rows that belong to a
session go to the store of that session's project, in a folder named after the
database (`history.db` gives `history-projects/`):

- `<repo-name>-<8 hex>.db` for each git repository. A worktree or submodule belongs
  to its main repository.
- `_shared.db` for sessions launched outside git.

The old store routed writes by project and attached project files for reads.
The machine store's `project_stores` table recorded each store's file, time range and row count.

A `history.db` written before this split is split in the background. The daemon
moves its sessions to their project stores, a few seconds of work at a time. A
stopped move was finished on the next start. The legacy reset deleted only files that
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
`git_head`, `otel_toggle`, `quota_warning`

A `file_modified` event for a file in a git repository has these `detail`
fields: `path`, `project_path` (the top of the work tree), `change`
(`created`, `modified`, `deleted`, `renamed` or `conflict`), `git_status`
(the porcelain `XY` code, `??` for an untracked file, `!!` for an AI tool
file that git ignores, or empty when the file matches the last commit
again), `tracked`, `growth_bytes`, `size_bytes`, `session_id` (empty when no
single live session works in the repository), and, when known,
`lines_added`, `lines_removed` and `renamed_from`.

A `git_head` event is one new line of a repository's `HEAD` reflog: a
commit, checkout, reset, merge or rebase step. Its `detail` fields are
`project_path`, `action` (the reflog message before `:`, for example
`commit`), `message`, `old` and `new` (commit hashes) and `session_id`.

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
transcripts. Calls stored before v33 keep NULL until the one-time backfill
fills them: it reads every transcript again, writes only these two sizes to
calls that are stored, and records `tool_sizes_backfilled_at` in
`maintenance_state` when it is done.

## Version 34 (session folder index)

An index of the files in each tool's own session folder: Copilot CLI
`session-state/<id>/` and Claude Code `projects/<project>/<id>/`. The
folders are found with `aictl.tool_homes.session_dirs`. The index holds the
path, size and mtime of each file. aictl never copies or reads the content.
Both tables are per-project tables (`PROJECT_TABLES`), routed by session.

The indexer (`aictl.ingesters.session_artifacts`) polls every 2 minutes. It
skips a folder whose signature (the newest mtime of the folder and of its
direct subfolders) did not change. Each folder is one short write.

### `session_folders` — One row per scanned session folder

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | TEXT PK | The tool's session id (the folder name) |
| `tool` | TEXT | `copilot-cli` or `claude-code` |
| `folder` | TEXT | Absolute path of the session folder |
| `signature` | REAL | Folder mtime signature at the last scan |
| `files_total`, `bytes_total` | INTEGER | Count and size of all files, also past the row cap |
| `scanned_at` | REAL | Epoch seconds of the last scan |

### `session_sources` — One row per session file found on disk

The transcript reader (`aictl.ingesters.transcript_usage`) finds every session
file of every tool home, every VS Code edition and profile, and the chats of
windows that had no folder open. It writes a row when a file is found and when
its status changes, so the table shows which sessions are not fully stored.

| Column | Type | Description |
|--------|------|-------------|
| `source_file` | TEXT PK | Absolute path of the session file |
| `session_id` | TEXT | The session the file belongs to |
| `tool` | TEXT | `copilot-vscode`, `copilot-cli`, `copilot-desktop`, `claude-code` or `codex-cli` |
| `size_bytes`, `mtime` | INTEGER, REAL | Size and modification time at the last scan |
| `bytes_read` | INTEGER | How much of the file is stored |
| `status` | TEXT | `waiting` (found, in the backlog), `reading`, `complete`, or `outside_window` (excluded by `history_days`) |
| `indexed_at` | REAL | Epoch seconds when this row was written |

A first run reads the files of the last two days at once. Older files stay
`waiting` and are read in the background, 128 MB a minute. A restart continues
from the saved read positions.

### `session_artifacts` — One row per indexed file

| Column | Type | Description |
|--------|------|-------------|
| `session_id`, `path` | TEXT PK | Session and absolute file path |
| `folder` | TEXT | First folder part under the session folder (`files`, `research`, ...); "" at the top |
| `size_bytes` | INTEGER | Size at the scan |
| `mtime` | REAL | Modification time at the scan |

A session keeps at most 2000 rows, the newest. The tool's own records at the
top of a Copilot CLI folder (`events.jsonl`, `workspace.yaml`, `session.db`,
`vscode.metadata.json`, lock files) are not indexed. Index `idx_session_artifacts_path`
lets `/api/file` find a path. v34 also adds `idx_sessions_started` on
`sessions(started_at)` for the session search.


## Version 37 (cursor text, dashboard dates)

`maintenance_state` gains `text TEXT NOT NULL DEFAULT ''`. `value` is always a number; a cursor that is JSON goes in `text` (the VS Code chat ingester's file cursor). In databases made before v37, `ui_dashboard.created_at` and `updated_at` could hold the literal text `%s` because of a doubled `%%` in the column default. If the table exists, the migration replaces those text values with the time of the repair.

## Version 38 (hook calls)

### `hook_calls` — One row per hook call

Written by `POST /api/hooks` for every hook call the aictl hook handler reports (not for `aictl hooks verify` pings); the wire format is in [tool-claude-code.md](tool-claude-code.md#hook-wire-format-version-1). `call_id` has a partial unique index, so a retried POST is stored once. A per-project table (`PROJECT_TABLES`), routed by session like `events`, with the same retention, budget eviction and text rules: `payload` loses its text keys as an `events.detail` does, and `command` and `output` are blanked, at write time unless capture is `full` and at maintenance after `content_retention_days`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Row id |
| `call_id` | TEXT | `aictl_hook.call_id`; for a POST without one, `body:` and 32 hex of the body's hash |
| `ts` | REAL | Time of the call (`aictl_hook.ts`, else payload `ts`, else receive time) |
| `received_at` | REAL | Receive time; `received_at - ts` is the delivery lag |
| `format_version` | INTEGER | `aictl_hook.v`; 0 for an older handler |
| `tool`, `event`, `hook_event_name`, `source` | TEXT | Resolved tool; aictl's event name (`--event`); the tool's own event name; `aictl_hook.source` |
| `session_id`, `agent_id`, `project_path` | TEXT | Session, subagent (`agent_id`), working folder (`cwd`) |
| `pid`, `hook_pid`, `hook_ppid` | INTEGER | Tool pid when known; the handler's pid and parent pid |
| `tool_name`, `tool_use_id`, `permission_mode` | TEXT | From tool events (`tool_name`/`toolName`, `tool_use_id`/`toolUseId`/`toolCallId`, `permission_mode`) |
| `payload_bytes`, `truncated` | INTEGER | Bytes read from stdin; 1 when over 16 MiB |
| `payload` | TEXT | The tool's payload as JSON, without `aictl_hook` and the keys the handler added |
| `wrapped` | INTEGER | 1 for a user hook run through `aictl hooks wrap` |
| `command_hash` | TEXT | First 16 hex of the SHA-256 of the wrapped command (always stored) |
| `command`, `output` | TEXT | The wrapped command and its stdout (capture `full` only) |
| `exit_code` | INTEGER NULL | Wrapped command's exit code; NULL when not wrapped |
| `duration_ms`, `overhead_ms` | REAL | Wrapped command's run time; the wrapper's own time on top |
| `stdout_bytes`, `stderr_bytes` | INTEGER | Output sizes of the wrapped command |
| `decision` | TEXT | From the wrapped hook's stdout JSON: `hookSpecificOutput.permissionDecision`, else `decision`, else `stop` when `continue` is false; else `block` for exit code 2 |

Hook calls per event in the last day, with the delivery lag:

```sql
SELECT event, COUNT(*) AS calls, AVG(received_at - ts) AS lag_s
FROM hook_calls WHERE ts > strftime('%s', 'now') - 86400
GROUP BY event ORDER BY calls DESC;
```

The same on a Kusto store (a read keeps the newest version of each row):

```kql
hook_calls
| summarize arg_max(_v, *) by rowid
| where _deleted == false
| where ts > (now() - 1d - datetime(1970-01-01)) / 1s
| summarize calls = count(), lag_s = avg(received_at - ts) by event
| order by calls desc
```

Wrapped user hooks: p95 duration and exit-code counts, by command:

```kql
let wrapped_calls = hook_calls
    | summarize arg_max(_v, *) by rowid
    | where _deleted == false and wrapped == 1;
wrapped_calls
| summarize calls = count(), p95_ms = percentile(duration_ms, 95), p95_overhead_ms = percentile(overhead_ms, 95) by command_hash
| join kind=inner (
    wrapped_calls
    | summarize n = count() by command_hash, exit_code
    | summarize exit_codes = make_bag(bag_pack(tostring(exit_code), n)) by command_hash
  ) on command_hash
| project command_hash, calls, p95_ms, p95_overhead_ms, exit_codes
| order by calls desc
```

## Session names (`sessions.title`, `sessions.title_source`)

The Kusto `sessions` table has two string columns for the name of a session, kept a year like the rest of the row.
`title` is one line of at most 120 characters. `title_source` says who gave it:

| `title_source` | Meaning | Read from |
|----------------|---------|-----------|
| `user` | The user named or renamed the session | Claude Code `custom-title` and `agent-name` lines; Copilot `workspace.yaml` `name` with `user_named: true`; VS Code chat `customTitle`; Codex `threads.name` and `session_index.jsonl` |
| `tool` | The tool made the title or summary | Claude Code `ai-title` lines; Copilot `workspace.yaml` `name` with `user_named: false`, and `session-store.db` `sessions.summary`; Codex `threads.title` when it is not the first message |
| `prompt` | Made from prompt text | Claude Code `last-prompt` lines; Codex `threads.title` when it is the first message |

A name replaces the stored one when its source ranks higher (`user`, then `tool`, then `prompt`), or ranks the same and
the text differs, so the latest name wins and a rename is picked up. An empty name never clears a stored one, and a
row from `otel` carries none. Names with source `prompt` hold prompt text, so they are written only while the store keeps text.
Sessions stored before these columns existed get their names once, from a pass that reads only the name lines and
the metadata files (state file `session_titles.json`); a new node does not run it.

## Investigating a session a year later

These columns and tables let a session be investigated after its text is gone: what each
tool call acted on, how the turns went, what the subagents were asked to do, what the
session achieved, which files it touched, and how much the model thought. All of it is
read from the tools' own files by `aictl.ingesters.transcript_usage` (with
`call_facts` and `session_outcomes`). Year-long tables hold names, paths, ids, counts,
enums and PR or commit references only, never prose. The text stays in the 14-day text
tables, written only while text is kept (`capture = "full"`).

### `tool_invocations` (year-long) — new columns

| Column | Type | Description |
|--------|------|-------------|
| `mcp_server`, `mcp_tool` | string | The MCP server and its tool; "" when the call is not an MCP call or its name does not say (`mcp_a_b`). Split by `aictl.tool_targets.split_mcp`, the same function the board uses |
| `target_kind` | string | `file`, `command`, `url`, `skill`, `agent`, `query` or `other` |
| `target` | string | What the call acted on: the file path as given; the command line; the URL (credentials removed, and its query when it looks like it carries a secret); the search pattern or query; the skill name; the subagent type; the MCP tool. Command lines, URLs and search text are redacted (`aictl.tool_targets.redact_secrets`) and cut to 500 characters, and are written only with `capture = "full"`; otherwise `target` holds the program name, the URL host, or "" for a search |
| `target_chars`, `target_truncated` | long, bool | Length of the command line, URL or search text before it was cut, and whether it was |
| `command_name` | string | The program a command ran (first word, after `VAR=x`, `sudo`, `env`, `time` and `cd dir &&`) |
| `url_host`, `search_path` | string | The host of a URL; the folder a search looked in |
| `read_offset`, `read_limit` | long | The range of a ranged read (Claude `offset`/`limit`, Copilot `view_range`, VS Code `startLine`/`endLine`) |
| `arg_names` | string | An MCP call's argument names (not values), comma-separated |
| `agent_label` | string | The caller's short description of a subagent call |
| `error_summary` | string | A failed call's error message, redacted, at most 300 characters; only with `capture = "full"` |
| `interrupted` | bool | Claude Code `toolUseResult.interrupted` |
| `turn_index` | long | The user turn of the session (1 = the first); null when unknown |
| `prompt_id` | string | Claude Code `promptId` of the turn; joins `session_turns` and `requests.prompt_id` |
| `request_key` | string | `dedup_key` of the `requests` row of the model call that asked for the call (Claude Code) |

What stays a year and what is kept 24 hours, per tool call:

| Kept a year in `tool_invocations` (class `history`) | Kept 24 hours in `tool_invocations_text` (class `tool_content`) |
|---|---|
| tool, name, MCP server and tool, `target_kind`, file path, `command_name`, URL host, search folder, MCP argument names, subagent type and label, skill, read range; sizes (`input_bytes`, `output_bytes`); `is_error`, `exit_code`, `interrupted`, `confirm`, `confirm_wait_ms`, `duration_ms`; turn, prompt and request keys. With `capture = "full"` also: the command line, URL, search text (`target`) and `error_summary` | the argument values (bounded as before), edit old and new text, and the result excerpt |

Edit line counts and paths stay a year in `file_write_events`. Estimated result tokens are
not stored: they are `output_bytes / 4` in a query. After 24 hours a view that shows a
call's arguments, its result or an edit's text has none to show (see the report of this
change for the board places that need a "no longer retained" wording).

### `requests` (year-long) — new columns

| Column | Type | Description |
|--------|------|-------------|
| `turn_index` | long | As above. Copilot rows read only from `session-store.db` leave it null: the store numbers turns its own way |
| `effort` | string | Reasoning effort asked for (Claude Code `effort`, Copilot `reasoningEffort` / `reasoning_effort`) |
| `thinking_ms` | real | Claude Code `thinkingDurationMs`, the longest a line of the call reported |
| `attribution_mcp_server`, `attribution_skill` | string | What Claude Code says caused the call (`attributionMcpServer`, `attributionSkill`), as written |
| `requested_model` | string | Claude Code `requestedModel`, only when it differs from the model that answered |
| `thinking_chars`, `thinking_blocks` | long | Length and number of the visible thinking blocks of the call |
| `thinking_redacted` | long | Redacted or encrypted thinking blocks: counted, never stored |
| `thinking_tokens` | long | Reasoning tokens where the tool reports them (Copilot `reasoningTokens` / `reasoning_tokens`) |

`requests.prompt_id` is now also filled from Claude Code transcripts.

### `agents` (year-long) — new columns

| Column | Type | Description |
|--------|------|-------------|
| `description` | string | The short task label the calling agent gave (at most 200 characters, one line). A label, stored like a name in every capture mode; the prompt stays in `agents_text` |
| `spawn_depth` | long | Claude Code `meta.json` `spawnDepth` |
| `parent_agent_id` | string | The agent that started it; "" for the main agent |
| `parent_tool_use_id` | string | The tool call that started it |
| `resolved_model`, `status` | string | The model it ran on; `async_launched`, `running`, `completed`, `failed` |

### `session_turns` (year-long) — one row per Claude Code turn

Key `session_id`, `prompt_id`. A turn is one `promptId`: a person's prompt or a message
the tool treats as a new turn (`origin` says which). A subagent's lines carry its caller's
prompt id, so its calls count in its caller's turn. Copilot CLI turns are in
`session_steps` / `turn_request_links`.

| Column | Type | Description |
|--------|------|-------------|
| `turn_index` | long | `turnPosition.turnIndex`, or the order of the turn in the session |
| `ts`, `ended_at` | real | First and last line of the turn |
| `origin`, `permission_mode` | string | `turnOrigin` / `origin.kind`; `permissionMode` |
| `request_count`, `tool_call_count` | long | Model calls and tool calls |
| `error_count`, `api_error_count`, `ended_with_api_error` | long | Failed tool calls and API errors; 1 when the last call of the turn failed |
| `input_tokens` … `cache_creation_tokens` | long | Disjoint token classes, summed |
| `files_changed`, `compactions` | long | Distinct files edited or written; compactions |
| `thinking_chars`, `thinking_blocks`, `thinking_redacted`, `thinking_ms` | long, real | Thinking of the turn's calls, summed |

### `session_files` (year-long) — how each file was touched

Key `session_id`, `agent_id`, `path`, `how`, `tool_name`. `how` is `read`, `edited` or
`created`; `count`, `first_ts` and `ts` (last). Counted per agent's record, so a record
read again from its start rebuilds its own counts; sum over `agent_id` for a session.
Sources: Claude Code `Read`, `Edit`, `MultiEdit`, `NotebookEdit` and `Write` (`created`
when its result says `create`); Copilot `view` calls (reads) and `session-store.db`
`session_files` (writes; `created` for `create`); VS Code debug-log `read_file`,
edit and `create_file` calls, or `editedFileEvents` for a session with no debug log.
Paths are kept as the tool wrote them, Windows paths included.

### `session_outcomes` (year-long) — one row per session

| Column | Type | Description |
|--------|------|-------------|
| `permission_modes`, `modes`, `last_mode` | dynamic, dynamic, string | Claude Code `permissionMode` and `mode` lines; Copilot `session.mode_changed`; VS Code `modeInfo` |
| `pr_refs`, `commit_refs` | dynamic | Claude Code `pr-link` URLs; Copilot `session_refs` (PR numbers, commit SHAs) |
| `lines_added`, `lines_removed`, `files_changed` | long | Claude Code `cost-state` totals and edited files; Copilot `session.shutdown` `codeChanges` |
| `reported_cost_usd`, `reported_api_ms`, `reported_tool_ms` | real | The tool's own figures (Claude Code `cost-state`, Copilot `totalApiDurationMs`), separate from aictl's priced `cost_usd` |
| `premium_requests` | real | Copilot `totalPremiumRequests` |
| `hook_runs`, `hook_failures` | long | Claude Code `stop_hook_summary`; Copilot `hook.end` |
| `compactions` | long | Compactions |
| `todos_total`, `todos_completed` | long | The last todo list: Claude Code `TodoWrite`, Copilot `session.db` `todos`, VS Code `manage_todo_list` |
| `workflow_runs`, `workflows_failed` | long | Claude Code `<session>/workflows/wf_*.json` |
| `task_complete` | long | 1 when Copilot reported `session.task_complete` or VS Code ran `task_complete` |

A row is put together from parts, one per source: a transcript record, or a metadata file.
A source read again replaces its part. The parts and a digest of the last row written are
saved in the reader's checkpoint (`transcript_usage.json`), so a restart that finds nothing
new writes nothing.

### `session_digests` (14 days, text) — the tools' own summaries

Key `session_id`, `kind`, `seq`; `ts`, `title`, `text` (redacted, at most 32768 characters).
`kind`: `checkpoint` (Copilot `session-store.db` `checkpoints`: overview, work done, next
steps), `task_summary` (Copilot `session.task_complete`), `compact_summary` (Claude Code
`isCompactSummary`, Copilot `compaction_complete.summaryContent`), `todo_list` (the last
list), `workflow_summary` (Claude Code workflows). Written only while text is kept.

### `session_thinking` (14 days, text) — visible thinking, one row per block

Key `session_id`, `thinking_key`. Columns `agent_id`, `request_key` (the `requests`
`dedup_key`), `message_id`, `turn_index`, `block_index`, `ts`, `model`, `chars` (whole
length), `text` (redacted, at most 32768 characters). Sources: Claude Code `thinking`
content blocks; Copilot `assistant.message` `reasoningText`, joined to its call by
`apiCallId`; VS Code chat `thinking` response parts (`request_key` only for a session
with no debug log). Redacted blocks, encrypted reasoning (`redacted_thinking`,
`reasoningOpaque`, `encrypted_content`) and signatures are never stored. Written only
while text is kept; the counts on `requests` are always written.

### Metadata files and restarts

Workflow files and Copilot `session.db` files are read again only when their size or mtime
changed; the store is read only for row ids above the last one read. Signatures and ids are
saved in the checkpoint. Rows summed from transcript lines (`session_turns`,
`session_files`, digests, thinking) are written only for lines not stored before a
restart, as for the other fact tables.

## Retention per class of table

Every Kusto table belongs to exactly one retention class (`TABLE_RETENTION_CLASS` in
`aictl/stores/kusto/tables.py`). Each class is set on its own in `[storage.retention]`, in
hours or days (`tool_content = "24h"`, `prompt = "365d"`; a bare number is days, and
`<class>_days = <days>` is read too). The daemon applies the configured period with
`.alter-merge table … policy retention softdelete = <period>` when it starts. Text that its
class would no longer keep is not imported from old session files, while the metadata of the
same rows is written for the whole history. With `capture` other than `full`, no text is
written, whatever the retention.

| Kind of data | Tables | Default | Setting |
|---|---|---|---|
| What sessions did, no text: tool calls, requests, turns, outcomes, files, agents | `sessions`, `requests`, `tool_invocations`, `session_turns`, `session_outcomes`, `session_files`, `agents`, `file_write_events`, … | 365d | `history` |
| User prompts | `session_prompts` | 365d | `prompt` |
| Thinking text | `session_thinking` | 365d | `thinking` |
| Assistant and chat messages, step text | `*_session_messages`, `vscode_chat_messages`, `session_step_text` | 365d | `message` |
| Other text: subagent prompts, event text, digests | `agents_text`, `events_text`, `session_digests` | 365d | `text` |
| File contents | `files_text`, `file_history_text`, `file_blobs`, `memory_snapshots_text` | 365d | `file_text` |
| Raw OpenTelemetry | `OTELLogs`, `OTELMetrics`, `OTELTraces`, `OTELPayloads` | 365d | `otel` |
| Metrics, snapshots, events, files, configuration | `metrics`, `system_snapshots`, `process_snapshots`, `events`, `files`, … | 365d | `metrics` |
| Tool call content: arguments, edit text, result excerpts, hook payloads | `tool_invocations_text`, `hook_calls_text` | 24h | `tool_content` |
| The full text of large values | `text_payloads` | 24h | `large_payload` |

**Large values.** A text value over `[storage] large_payload_bytes` (default 32768) in
`session_step_text`, `session_digests`, `agents_text` or `events_text` keeps a preview of
4000 characters in its own table, followed by its size and a note that the full text is kept
in `text_payloads` for the `large_payload` period; the full text goes to `text_payloads` in
chunks (`source_table`, `source_key`, `field`, `chunk_no`, `chunk_count`, `total_bytes`).
The note is part of the stored preview, so a reader shows the preview and the note once the
full text is gone. Prompts (at most 8000 characters) and thinking (at most 250000) are never
moved: they keep their whole text under their own class. `OTELPayloads` keeps its own spill
rows under `otel`: its readers join it by table, and it mixes tool arguments, prompts and
other values, so a split by `PayloadKind` needs the readers changed with it.

**Removal is approximate.** Kusto removes data by extent, after an extent's newest row has
passed the period, so rows can live somewhat longer than a short period, more so when an
extent holds rows ingested over a long span. No merge or caching policy is changed for the
24-hour tables.

`aictl db retention` lists each class with its period, size and share, the
`large_payload_bytes` threshold, then each table with its class, the configured period, the
period on the cluster, its rows, extent size and share, largest first.
`aictl db retention set <class> <period>` (for example `tool_content 12h`) writes the setting
and applies it. Lowering a period makes Kusto delete data older than the new limit, which
cannot be undone: the command first prints, per table, the rows and the oldest ingestion time
that would be removed (`<table> | where ingestion_time() < ago(<period>) | summarize rows =
count(), oldest = min(ingestion_time())`), and goes on only after a confirmation (`--yes` in
scripts; a run with no terminal and no `--yes` refuses). `[storage] history_days` is a
different setting: how far back session files are read.

## Configuration

```toml
# ~/.config/aictl/config.toml
[storage]
db_path = ""          # Empty = auto (~/.config/aictl/history.db)
flush_interval = 10.0 # Seconds between batch writes
retention_days = 30   # Delete data older than this; in Kusto, session tables without text are kept 365 days
history_days = 0      # Read session files changed in the last N days; 0 = every file on disk
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

Kusto uses table retention policies to remove old data. It does not use this SQLite compaction schedule.

## Bounds and capture modes

Storage is a disposable cache. Losing history is acceptable; hurting the host is not.

| `[storage]` key | Default | Effect |
|---|---|---|
| `capture` | `full` | `full`: text kept, bounded. `metadata`: no prompt, response or tool payload text, and no file content (hashes and sizes stay). `off`: 64 MB in-memory store, no DB, WAL or log files. Also `aictl daemon serve --capture`. |
| `max_total_mb` | 1024 | Budget for live DB pages, WAL and logs. Eviction order: rotated logs, text, message rows, then time series. Sessions, requests, agents, files and any table not listed for eviction stay. |
| `content_retention_days` | 14 | With `full`: blank conversation text older than this. |

`aictl db trim-text` removes retained text from the configured Kusto store. Use `--dry-run` to check the delete predicates and `--older-than-days N` to select text older than that cutoff.

If the DB file is corrupt, full or stays locked, the daemon continues on the in-memory store and `/api/self-status` reports `storage_degraded`.
