# aictl storage schema (Kusto)

This page is the contract for anyone who writes KQL against an aictl database. It describes
data layout 4. The definitions live in the code:
[`stores/kusto/tables.py`](../src/aictl/stores/kusto/tables.py) (`TABLES`),
[`stores/kusto/schema.py`](../src/aictl/stores/kusto/schema.py) (`logical_columns`),
[`stores/kusto/otel.py`](../src/aictl/stores/kusto/otel.py) (the OTel tables),
[`stores/kusto/nodes.py`](../src/aictl/stores/kusto/nodes.py) (node tables and functions) and
[`stores/kusto/layout.py`](../src/aictl/stores/kusto/layout.py) (the layout version).
The guard test `test/test_storage_schema_doc.py` fails when this page and the code disagree.
`aictl db schema` prints the definitions too. The SQLite history store is gone; this page
describes the Kusto store only.

In the table sections, "Written by" names the current code that writes the table. A column
whose meaning the writing code does not settle says "meaning not established".

## Layout version

The current layout is `LAYOUT_VERSION = 5`; it reads nodes from
`COMPATIBLE_SINCE = 3`. A change to tables, columns, keys or the meaning of
stored values bumps the layout and adds a line here:

| layout | breaks compatibility | migration | change |
|---|---|---|---|
| 1 | yes | `requests_single_copy` | requests: a model call is stored once. Before, the agent-team scan stored a second copy of each subagent call (source claude-code-jsonl) and a call reported by both telemetry and the transcript was stored under two keys; every reader summed both copies. |
| 2 | yes | `agents_by_session` | agents: keyed by (session_id, agent_id), with a tombstone, the folder, branch and worktree the agent ran in, and observed_at (the time completed and ended_at were observed; the latest observation wins). agents_text: keyed by session_id too. sessions: resumed_from, the session a resumed or forked session's file replays. Before, an agent id copied into a resumed session settled under whichever session was written last. |
| 3 | yes | `node_tables` | Each node writes its own tables (requests__&lt;node key&gt;, ...); a stored function named like each table reads all nodes. Layout, data epoch, migration and reset are per node. The migration copies each node's rows out of the shared tables, verifies them, and keeps the shared tables as legacy__*. |
| 4 | no | | context_lists: the items of each distinct list of tools, skills, custom agents or MCP instructions, stored once per node under list_id (a hash of the list). session_context_items holds one pointer row per announcement of such a list instead of one row per item: name "list:" + list_id, with the announcement's ts and the sums of its items. Rows written before stay one row per item and are read as they are; readers expand pointers into items. An aictl of layout 3 shows a pointer as one item named list:&lt;id&gt; that has the list's total. |
| 5 | no | | session_digests: keyed by agent too (agent_id, "" for the main agent), so a subagent's compaction summary and todo lists are kept; one row per version (a todo list per list sent, task_change per TaskCreate or TaskUpdate call); a text over large_payload_bytes keeps a preview and its whole text in file_blobs under text_hash (365 days by default, was 24 hours in text_payloads, where two sessions' summaries could overwrite each other); event_key links a summary to its context_events row, whose summary_kind and summary_seq link back. A Claude Code todo_list row of seq 0 written before is the last list seen. file_write_events: agent_id, prompt_id, turn_index, mechanism, actor, lines_added, lines_removed, before/after hash, bytes and source of each memory change; Copilot store_memory and vote_memory and the VS Code memory tool are rows under copilot-memory:// and vscode-memory:// paths; a Claude Code hook row and its transcript row share one key. Rows written before have these columns empty. context_events: kinds rewind_point, checkpoint, truncation, memory_recall, instruction_update, tool_baseline, context_reset and context_query, with checkpoint_no, message_id, files_count, lines, dropped and preserved counts, path, tool_call_id, turn, content_hash and detail; a Claude Code compaction is keyed by its session too (a fork that rewrote the line's session id owns it as well; a transcript imported again stores its compactions once more under the new key). file_history: rows for the files of each rewind point, with session_id, source_event_id (the rewind point's message id), origin, mechanism, version, state and line counts. context_events kinds config.* (session_start, session_resume, model_change, mode_change, permissions_change, managed_override, feature_flags, assignment_context, subagent_configured, context_changed, launch_flags): the settings a session ran under, with the reported fields in detail; sessions written before have none. |

### The `schema_version` registry

`schema_version` is a real table that all nodes share; it is not a function. Its rows:

- `kind = 'layout'` with an empty `step`: the layout of one node (`node_id`, `version`,
  `compatible_since`, `data_epoch`, `aictl_version`, `written_at`; `detail` says how the data
  epoch began: `new`, `reset`, `migrate` or `upgrade`).
- `kind = 'layout'` with `step = 'node_tables/lock'`: the lock of the `node_tables` migration.
- `kind = 'migration'`: one migration step; `detail` starts with `done` when it finished.
- `kind = 'database'`: the database record of the node tables layout (`node_id` empty).

The rows are a log. Several rows can share the table's key, so do not deduplicate
`schema_version` by its key. The stored function `aictl_nodes()` returns the latest layout
row of each node:

```kql
aictl_nodes()
| project node_id, version, compatible_since, data_epoch, aictl_version, written_at
```

`aictl_current_store_v1` is a second shared table. It is empty; it only marks the database
as written by this store.

## Query the logical table name

Write KQL against the logical table name: `requests`, `sessions`, `OTELLogs`. Each name is a
stored function (folder `aictl`) that unions the tables of every node:

- Each node writes its own physical tables. The physical name of logical table `T` for node
  `N` is `T__<key>`. The key is the node id in lower case with every character outside
  `[a-z0-9]` written as `_` (runs collapsed, at most 32 characters), then `_` and the first 8
  hex digits of the SHA-256 of the full node id. Rows without a node id use the key
  `unattributed`. A node's tables are in folder `aictl/nodes/<key>`; each table's docstring
  is JSON with the node id, the node key and the logical name.
- The function `T` starts with an empty `datatable` of the logical schema, then unions the
  node tables `T__<key>`. Every logical column exists, even when no node table has it yet; a
  column a node table lacks reads as null.
- The function includes only nodes whose recorded layout this aictl can read (layouts
  `COMPATIBLE_SINCE` to `LAYOUT_VERSION`). A node without a layout row, or with an older or
  newer layout, is left out. `aictl db layout` lists each node and why it is left out.
- `node_id` stays a column: `requests | where node_id == "x"` reads one node.
- A function takes precedence over a table of the same name. `table('T')` names a physical
  table called `T`, which does not exist for node tables after the migration. Use `T`, not
  `table('T')`.
- An external OpenTelemetry Collector writes the physical tables `OTELLogs`, `OTELMetrics`
  and `OTELTraces`. When such a table exists, the function of the same name adds it as a leg
  (`table('OTELLogs')`). aictl's own OTel rows are in `OTELLogs__<key>` and the other node
  tables.
- The `node_tables` migration (layout 3) kept the shared tables of layout 2 as
  `legacy__T` in folder `aictl/legacy`. No function reads them.
- The functions are regenerated each time a writing node starts. A new node's tables join
  the functions when that node starts.

## Read the current row

Rows are versioned. The writer stores each change of a row as a new row with a larger `_v`
(a UTC datetime, strictly increasing per writer process). The current row of a key is the
row with the largest `_v`:

```kql
sessions
| summarize arg_max(_v, *) by ['project'], node_id, session_id
| where not(coalesce(_deleted, false))
```

Use the key of the table as listed in its section. Every key starts with `project` and
`node_id`, so rows of two nodes are never merged, and a row filed under one project is not
merged with a row filed under another.

A delete is a tombstone row: `_deleted` is true. The writer copies into it the columns of the
row it deletes that it still holds, at least the key and, for `requests`, `tool_invocations`
and `file_write_events`, the columns named by their "Tombstone carries" line. aictl's own views
filter on those columns before the dedup. A tombstone stored before November 2026 holds only
the key columns, so a query of your own should:

- Filter after the dedup, never before. A filter on a column that is not in the key (for
  example `requests | where session_id == "s"`) drops a tombstone that lacks the column, and
  the deleted row comes back as current.
- A filter on key columns only may come first. It keeps the tombstones and makes the query
  cheaper.
- Then drop the tombstones: `where not(coalesce(_deleted, false))`.

Wrong (a deleted model call comes back):

```kql
requests
| where session_id == "s"
| summarize arg_max(_v, *) by ['project'], node_id, dedup_key
```

Right:

```kql
requests
| summarize arg_max(_v, *) by ['project'], node_id, dedup_key
| where not(coalesce(_deleted, false)) and session_id == "s"
```

Tables without a tombstone column take no deletes; the same dedup still applies, and it also
removes the copies of a batch that was sent again after a failure (the copies carry the same
`_v`). Some of those tables still have a `_deleted` column for older readers; it is always
false there. `schema_version` is the exception: see above.

The OTel tables have no tombstones. Their key is `project`, `node_id`, `RowKey`. aictl's rows
have `RowKey`, `node_id` and `project` (always ""). Rows written by an external Collector have
these columns null, so a dedup by the key would merge all of them into one. Dedup aictl's
rows only:

```kql
OTELLogs
| where isnotempty(RowKey)
| summarize arg_max(_v, *) by ['project'], node_id, RowKey
```

### Column names that are KQL keywords

`title` and `project` are KQL keywords. Write them `['title']` and `['project']`; the same for
`last` and any other keyword. `['name']` works for every column, so when in doubt, use it.

### Times and types

- Time columns of type `real` (`ts`, `started_at`, `mtime`, `covered_through`, ...) are
  epoch seconds, UTC. Convert with `unixtime_seconds_todatetime(ts)`.
- `_v`, `schema_version.written_at` and the OTel time columns are `datetime`.
- Columns of type `string` that hold JSON (`detail`, `meta`, `tags`, `*_json`, `by_model`)
  need `parse_json()`. The OTel attribute bags (`LogsAttributes`, `MetricAttributes`,
  `TraceAttributes`, `ResourceAttributes`, `Events`, `Links`) and the `session_outcomes`
  arrays are `dynamic`.
- A count that a source did not report is null, not 0, where the column says so.

### Ingestion

The "Ingestion" line of a table is its default mode (`streaming` or `queued`), used when
`[storage] kusto_ingestion = "auto"`. Another global mode, or an entry in
`[storage.kusto_table_ingestion]`, replaces it. The mode changes how soon a row can be read,
not what is stored.

## OTel tables: what is promoted and what stays in the bags

`OTELLogs`, `OTELMetrics` and `OTELTraces` hold the OTLP records the daemon receives, in the
columns of the OpenTelemetry Collector's `azuredataexplorer` exporter, so a Collector and
aictl can write to one database. After the Collector's columns come aictl's: the session,
tool, model, machine, a `RowKey` that is the same when an export is retried, and `node_id`.

The columns after `node_id` are attributes promoted ("flattened") out of the attribute bag
into typed columns, so KQL needs no `tostring(LogsAttributes['...'])`. Each column's meaning
names the attribute keys it reads; the first key that is sent and readable wins. A key
marked (*) was not found in a recording or doc in this repository; its name comes from the
tool's public telemetry documentation as remembered. A key `resource:<k>` is read from the
resource attributes. A column is null when none of its keys is sent.

- The bags keep every attribute, promoted or not. Read any other attribute from the bag:
  `tostring(LogsAttributes['event.name'])`, `tostring(MetricAttributes['le'])`,
  `TraceAttributes['gen_ai.request.model']`.
- `LogsAttributes` and `TraceAttributes` also hold `scope.name` and `scope.version`;
  `MetricAttributes` also holds `le` (histogram buckets) and `qt` (summary quantiles).
- Metrics: one OTLP data point can be several rows. Histograms and summaries give `_sum`,
  `_count`, cumulative `_bucket` rows (with `le`) and quantile rows; aictl adds `_min` and
  `_max` rows and stores exponential histograms, which the Collector skips.
- A string value over 32 KiB, and a bag or row too large for Kusto, is moved to
  `OTELPayloads` in chunks. The bag keeps a reference
  `{"payload_id": ..., "bytes": ..., "preview": ...}`; join `OTELPayloads` on
  `PayloadId == payload_id` (or on `SourceTable`, `SourceRowKey`, `SourceField`) and
  concatenate `Text` by `ChunkNo`. A large log body keeps a 256-character preview in `Body`
  and its reference in `LogsAttributes['aictl.body_payload']`.
- With capture `metadata` no text is stored: prompts, messages, tool input and output, and any
  string over 256 characters are dropped from the bags and only their length is kept as
  `<key>_chars`; a log body is emptied and its length kept in
  `LogsAttributes['aictl.body_chars']`; nothing is written to `OTELPayloads`. The promoted
  columns are read from the bags after this rule, so they hold no text the bags do not.

## Retention classes

Every table belongs to exactly one retention class. `[storage.retention]` sets a period per
class in hours or days (`tool_content = "24h"`, `prompt = "365d"`; a bare number is days).
Each node applies the periods to its own physical tables when it starts.
`aictl db retention` shows each class and table; `aictl db retention set <class> <period>`
changes one. The defaults:

| class | default | tables |
|---|---|---|
| `history` | 365d | `agents`, `agents_observations`, `context_events`, `context_events_observations`, `context_lists`, `file_write_events`, `file_write_events_observations`, `otel_trace_sessions`, `requests`, `requests_observations`, `session_artifacts`, `session_attribution`, `session_commits`, `session_context_items`, `session_context_items_observations`, `session_files`, `session_folders`, `session_loaded_files`, `session_loaded_files_observations`, `session_outcomes`, `session_processes`, `session_processes_observations`, `session_sources`, `session_steps`, `session_turns`, `session_usage`, `session_usage_observations`, `sessions`, `sessions_observations`, `skill_uses`, `skill_uses_observations`, `tool_invocation_coverage`, `tool_invocation_sizes`, `tool_invocations`, `tool_invocations_observations`, `turn_request_links` |
| `prompt` | 365d | `session_prompts`, `session_prompts_observations` |
| `thinking` | 365d | `session_thinking` |
| `message` | 365d | `copilot_session_messages`, `cursor_session_messages`, `session_step_text`, `vscode_chat_messages` |
| `text` | 365d | `agents_observations_text`, `agents_text`, `events_text`, `session_digests` |
| `file_text` | 365d | `file_blobs`, `file_history_text`, `files_text`, `memory_snapshots_text` |
| `otel` | 365d | `OTELLogs`, `OTELMetrics`, `OTELPayloads`, `OTELTraces` |
| `metrics` | 365d | `data_quality_status`, `datapoint_catalog`, `environment_vars`, `events`, `file_history`, `files`, `hook_calls`, `maintenance_state`, `memory_snapshots`, `metrics`, `path_defs`, `process_defs`, `process_snapshots`, `processes`, `projects`, `schema_version`, `system_snapshots`, `tool_config`, `tool_stats`, `tools` |
| `tool_content` | 24h | `hook_calls_text`, `tool_invocations_observations_text`, `tool_invocations_text` |
| `large_payload` | 24h | `text_payloads` |

A table is in a class by name in `tables.py`; otherwise a table that holds text is in
`text`, a table of what sessions did is in `history`, and the rest is in `metrics`.

Kusto removes rows by ingestion time, an extent at a time, so a row can live somewhat longer
than its period. Lowering a period deletes older data and cannot be undone.

What remains after the text expires:

- A tool call keeps its `tool_invocations` row (class `history`): tool and tool name, MCP
  server and tool, `target_kind` and `target`, command name, URL host, search folder, sizes,
  error flag, exit code, durations, confirmation, turn, prompt and request keys. Its
  arguments and result excerpt in `tool_invocations_text` (class `tool_content`) are gone.
- A hook call keeps its `hook_calls` row (class `metrics`); its command, output and payload
  in `hook_calls_text` (class `tool_content`) are gone.
- A large text value keeps its preview and a note in its own table; its full text in
  `text_payloads` (class `large_payload`) is gone.
- Text older than its class's period is not imported from old session files, while the
  metadata of the same rows is. With capture other than `full` no text is written at all.

## Relations

These rules are what the writers enforce (`session_facts.py`, `tool_calls.py`,
`test/test_relation_accuracy.py`):

- A session is identified by the tool's own `session_id`. A session row is filed under its
  `project_path`; when that changes, the row under the old project is deleted with a
  tombstone.
- A resumed or forked session's file first replays the earlier session's lines with that
  session's id. Each line belongs to the session its own `sessionId` names, so the copies
  add nothing to the new session. The new session's row names the earlier one in
  `sessions.resumed_from`.
- An agent is identified by `(session_id, agent_id)`. An agent id is unique only within its
  session: a resumed session copies its subagents' files, ids included. `agents` holds
  subagents only; in other tables `agent_id` "" is the main agent.
- `agents.parent_agent_id` is the agent that started the subagent ("" for the main agent).
  `agents.parent_tool_use_id` is the `source_event_id` of the `tool_invocations` row of the
  spawning call, in the same session and of the parent agent.
- A subagent is completed (`agents.completed` = 1, `agents.ended_at` set) only after
  evidence that it finished. The row with the latest `agents.observed_at` decides, so a
  resumed agent goes back to not completed.
- `requests` holds one row per model call. A call that OTel reported and the transcript
  recorded is paired by session and the four token counts, in order, and stored once: the
  transcript row (`source = 'transcript'`) takes the telemetry-only values and the OTel row
  is deleted.
- `tool_invocations.request_key`, `session_thinking.request_key` and
  `turn_request_links.request_key` are the `requests.dedup_key` of the model call.
  `tool_invocations.prompt_id` and `requests.prompt_id` join `session_turns.prompt_id`.
- A transcript tool call replaces the hook and OTel rows of the same session up to
  `tool_invocation_coverage.covered_through`; those rows are deleted.
- Text tables join their metadata table by key: `tool_invocations_text.dedup_key`,
  `agents_text` by `session_id` and `agent_id`, `session_step_text.step_key`,
  `events_text.source_key`, `hook_calls_text.call_id`, `memory_snapshots_text` by
  `session_id`, `phase` and `path`. `text_payloads` joins by `source_table`, `source_key`
  and `field`.
- A `session_context_items` row whose `name` is `list:` followed by 32 hex digits is a
  pointer: it stands for the items of the `context_lists` rows of the same `node_id` whose
  `list_id` is the rest of the name. Each of those items takes the pointer's `session_id`,
  `agent_id`, `kind`, `project`, `tool`, `ts` and `_v`. Other rows are items themselves.
- Messages (`copilot_session_messages`, `vscode_chat_messages`, `cursor_session_messages`)
  are stored under the session id their source carries; a message with no session id has an
  empty one. No id is invented.

## Example queries

Each query deduplicates first and filters after. The column names are checked against
`TABLES` by the guard test.

The current row of every session that has not ended:

```kql
sessions
| summarize arg_max(_v, *) by ['project'], node_id, session_id
| where not(coalesce(_deleted, false)) and isnull(ended_at)
| project session_id, tool, ['title'], project_path, model,
    started = unixtime_seconds_todatetime(started_at),
    last_activity = unixtime_seconds_todatetime(last_activity_at)
| order by last_activity desc
```

A session counts as ended once its end is stored; the dashboard also infers an idle end
after 15 minutes without activity and no bound process.

Model calls per session, with tokens and cost:

```kql
requests
| summarize arg_max(_v, *) by ['project'], node_id, dedup_key
| where not(coalesce(_deleted, false))
| summarize calls = count(), input_tokens = sum(input_tokens), output_tokens = sum(output_tokens),
    cache_read_tokens = sum(cache_read_tokens), cache_creation_tokens = sum(cache_creation_tokens),
    cost_usd = sum(cost_usd), errors = countif(is_error != 0) by session_id, tool
| order by calls desc
```

Tool calls per MCP server and tool:

```kql
tool_invocations
| summarize arg_max(_v, *) by ['project'], node_id, dedup_key
| where not(coalesce(_deleted, false)) and isnotempty(mcp_server)
| summarize calls = count(), errors = countif(is_error != 0), sessions = dcount(session_id),
    output_bytes = sum(output_bytes) by mcp_server, mcp_tool
| order by calls desc
```

The subagents of one session, with the call that started each:

```kql
let sid = "<session id>";
agents
| summarize arg_max(_v, *) by ['project'], node_id, session_id, agent_id
| where not(coalesce(_deleted, false)) and session_id == sid
| project agent_id, parent_agent_id, parent_tool_use_id, spawn_depth, description, resolved_model, status,
    completed, started = unixtime_seconds_todatetime(started_at), input_tokens, output_tokens
| order by started asc
```

Model calls of each agent of one session (agent "" is the main agent):

```kql
let sid = "<session id>";
requests
| summarize arg_max(_v, *) by ['project'], node_id, dedup_key
| where not(coalesce(_deleted, false)) and session_id == sid
| summarize calls = count(), output_tokens = sum(output_tokens) by agent_id
```

The tools listed in one agent's context (agent "" is the main agent), pointer rows expanded
into the items of their lists. An item counts unless it was removed; a later reset of the
agent's context (a row of kind `reset`) ends it too:

```kql
let sid = "<session id>";
let agent = "";
let lists = context_lists | summarize arg_max(_v, *) by ['project'], node_id, list_id, name;
session_context_items
| where session_id == sid and agent_id == agent and kind == "tools_listed"
| summarize arg_max(_v, *) by ['project'], node_id, session_id, agent_id, kind, name
| extend list_id = iff(name matches regex "^list:[0-9a-f]{32}$", substring(name, 5), "")
| join kind=leftouter (lists | project node_id, list_id, item = name, item_path = path, item_tokens = tokens,
    item_removed = removed) on node_id, list_id
| extend name = iff(isempty(list_id), name, item), path = iff(isempty(list_id), path, item_path),
    tokens = iff(isempty(list_id), tokens, item_tokens), removed = iff(isempty(list_id), removed, item_removed)
| summarize arg_max(_v, *) by ['project'], node_id, session_id, agent_id, kind, name
| where removed == 0 and isnotempty(name)
| project name, path, tokens, listed = unixtime_seconds_todatetime(ts)
| order by name asc
```

OTel log events per tool and event name, with tokens:

```kql
OTELLogs
| where isnotempty(RowKey)
| summarize arg_max(_v, *) by ['project'], node_id, RowKey
| summarize events = count(), input_tokens = sum(InputTokens), output_tokens = sum(OutputTokens) by Tool, EventName
| order by events desc
```

## Tables: Sessions and agents

### sessions

One row per session: who ran it, where, when, how it ended, its name and its totals.

- Key: `project`, `node_id`, `session_id`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`SessionFacts.sessions`, `titles`, `retire`), from transcripts, hooks, OTel, process evidence and the correlator

A row is sent whole. When a session's `project_path` changes, the row under the old project is deleted with a tombstone.

Sessions with `title_source` `prompt` lose the title when text is not kept.

| column | type | meaning |
|---|---|---|
| `session_id` | string | The tool's own session id |
| `tool` | string | Tool id, for example `claude-code`, `copilot-cli`, `codex-cli` |
| `pid` | long | Process id of the tool, when a source reported it |
| `project_path` | string | The session's working folder, from the main transcript |
| `model` | string | Model of the session as a source reported it |
| `git_branch` | string | Git branch of the session's folder, from the main transcript |
| `git_commit` | string | meaning not established: no current writer sets a value |
| `started_at` | real | Earliest start any source reported, epoch seconds, UTC |
| `ended_at` | real | When the session ended, epoch seconds, UTC; null while no end is stored. Activity more than 5 s after it clears it (the session was resumed) |
| `last_activity_at` | real | Last time the session did something (a transcript line, a request), epoch seconds, UTC; 0 when unknown |
| `end_reason` | string | Why `ended_at` is set: `hook`, `transcript`, `process_exit`, `switched` or `idle` (inferred). Empty while not ended |
| `source` | string | The source of the evidence that last set the row's fields, for example `transcript`, `otel`, `hook`, `process`, `correlator`. OTel and process evidence only fill empty fields |
| `input_tokens` | long | Input tokens; the largest value any source reported |
| `output_tokens` | long | Output tokens; the largest value any source reported |
| `cache_read_tokens` | long | Cache read tokens; the largest value any source reported |
| `cache_creation_tokens` | long | Cache write tokens; the largest value any source reported |
| `cost_usd` | real | Cost in USD; the largest value any source reported |
| `request_count` | long | Model calls; the largest value any source reported |
| `tool_call_count` | long | Tool calls; the largest value any source reported |
| `files_modified` | long | Files modified; the largest value any source reported |
| `title` | string | The session's name, one line of at most 120 characters. KQL keyword: write `['title']` |
| `title_source` | string | Who gave the name: `user`, `tool` or `prompt` (made from prompt text, stored only while text is kept) |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `resumed_from` | string | The session this one was resumed or forked from, as the tool recorded it; "" otherwise |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### session_usage

Per-session usage read from the tools' transcripts. Numbers only.

- Key: `project`, `node_id`, `session_id`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`usage`), from `ingesters/transcript_usage.py`

Readers put it over `sessions`: a transcript count replaces other sources' counts, it is never added to them.

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `tool` | string | Tool id |
| `source` | string | Provenance of the figures, for example `transcript` |
| `quality` | string | `exact` or `partial` |
| `quality_reason` | string | Why the quality is what it is |
| `model` | string | Most-used model |
| `models_json` | string | JSON: figures per model |
| `daily_json` | string | JSON: figures per local day |
| `input_tokens` | long | Uncached input tokens |
| `output_tokens` | long | Output tokens |
| `cache_read_tokens` | long | Cache read tokens |
| `cache_creation_tokens` | long | Cache write tokens |
| `request_count` | long | Model calls, deduplicated |
| `tool_call_count` | long | Tool calls, deduplicated |
| `turn_count` | long | Turns |
| `cost_usd` | real | List-price estimate in USD; null when no model could be priced |
| `cost_quality` | string | `estimated`, `partial` or `unknown` |
| `cost_reason` | string | Why the cost quality is what it is |
| `unpriced_models` | string | JSON list of models without a price |
| `billing_unit` | string | Unit the tool bills in |
| `billing_amount` | real | Amount in `billing_unit` |
| `premium_requests` | real | Premium requests |
| `estimated_list_usd` | real | Estimated list price in USD |
| `started_at` | real | First activity, epoch seconds, UTC |
| `last_activity_at` | real | Last activity, epoch seconds, UTC |
| `project_path` | string | Working folder |
| `updated_at` | real | When the row was written, epoch seconds, UTC |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### session_processes

Processes bound to a session.

- Key: `project`, `node_id`, `session_id`, `pid`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`links`), from the correlator and from hooks and OTel requests that carry a pid

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `pid` | long | Process id bound to the session |
| `tool` | string | Tool id |
| `joined_at` | real | When the binding was observed, epoch seconds, UTC |
| `role` | string | `lead` in current code |
| `project` | string | Part of the key. The session's folder as the source reported it, or "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### session_commits

Git commits made in a session's folder while the session ran.

- Key: `project`, `node_id`, `session_id`, `sha`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_evidence.py` (`publish_commits`), from `git` in the session's folder; `ingesters/call_facts.py` (`commits_of`), from the `[branch sha] subject` line a successful `git commit` shell call of the session printed (Claude Code `Bash`, Copilot CLI `bash`/`powershell`)

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `sha` | string | Commit hash: the full hash from `git`, the abbreviated hash a `git commit` output printed |
| `author_name` | string | Commit author name; "" for a commit read from a `git commit` output |
| `author_email` | string | Commit author email; "" for a commit read from a `git commit` output |
| `ts` | real | Commit time, epoch seconds, UTC; for a commit read from a `git commit` output, the time of the call's result |
| `subject` | string | First line of the commit message; from a `git commit` output only while text is kept |
| `project` | string | Part of the key. The root of the session's repository |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### agents

One row per subagent of a session.

- Key: `project`, `node_id`, `session_id`, `agent_id`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`agents`, `forget_agents`), from transcripts (Claude Code `subagents/` files and `meta.json`, Copilot subagent events)

The main agent has no row here. Other tables name it with `agent_id` "".

| column | type | meaning |
|---|---|---|
| `agent_id` | string | The subagent's id. Unique only within its session |
| `session_id` | string | The session the subagent's lines belong to |
| `tool` | string | Tool id |
| `model` | string | Model the agent used |
| `is_sidechain` | long | 1 for a subagent |
| `started_at` | real | Earliest start observed, epoch seconds, UTC |
| `ended_at` | real | End time, set only with evidence that the agent finished, epoch seconds, UTC |
| `completed` | long | 1 only after evidence that the agent finished: a final reply, the caller's result with status `completed`, or Copilot `subagent.completed` / `subagent.failed` |
| `input_tokens` | long | Input tokens of the agent |
| `output_tokens` | long | Output tokens of the agent |
| `cache_read_tokens` | long | Cache read tokens of the agent |
| `cache_creation_tokens` | long | Cache write tokens of the agent |
| `cost_usd` | real | Cost of the agent in USD |
| `description` | string | The short task label the caller gave, at most 200 characters, one line. Stored in every capture mode |
| `spawn_depth` | long | Claude Code `meta.json` `spawnDepth` |
| `parent_agent_id` | string | The agent that started it; "" when the main agent started it |
| `parent_tool_use_id` | string | The tool call that started it: the `source_event_id` of a `tool_invocations` row of the same session |
| `resolved_model` | string | The model it ran on |
| `status` | string | `async_launched`, `running`, `completed` or `failed` |
| `project` | string | Part of the key. The `project_path` of the agent's session row |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `cwd` | string | The folder the agent's own lines carry (a subagent can run in another worktree) |
| `git_branch` | string | The branch the agent's own lines carry |
| `worktree_path` | string | Claude Code `meta.json` `worktreePath` |
| `observed_at` | real | Time of the observation `completed` and `ended_at` come from, epoch seconds, UTC. The latest observation wins |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### agents_text

The prompt each subagent was given. Text.

- Key: `project`, `node_id`, `session_id`, `agent_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `text` (default 365d)
- Written by: `session_facts.py` (`agents`), only while text is kept

| column | type | meaning |
|---|---|---|
| `agent_id` | string | The subagent |
| `task` | string | The prompt the subagent was given; a value over `large_payload_bytes` is a preview, see `text_payloads` |
| `project` | string | Part of the key. The `project_path` of the agent's session row |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `ts` | real | Start of the agent, else its end, else the write time, epoch seconds, UTC |
| `session_id` | string | The session |

### session_turns

One row per user turn of a Claude Code session (one `promptId`), its subagents included.

- Key: `project`, `node_id`, `session_id`, `prompt_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/call_facts.py`

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `prompt_id` | string | Claude Code `promptId` of the turn |
| `turn_index` | long | `turnPosition.turnIndex`, or the order of the turn in the session |
| `ts` | real | First line of the turn, epoch seconds, UTC |
| `ended_at` | real | Last line of the turn, epoch seconds, UTC |
| `tool` | string | `claude-code` |
| `project_path` | string | Working folder |
| `origin` | string | Claude Code `turnOrigin` / `origin.kind`, for example `human`, `task_notification`, `peer` |
| `permission_mode` | string | Claude Code `permissionMode` |
| `request_count` | long | Model calls of the turn |
| `tool_call_count` | long | Tool calls of the turn |
| `error_count` | long | Failed tool calls |
| `api_error_count` | long | API errors |
| `input_tokens` | long | Input tokens, summed |
| `output_tokens` | long | Output tokens, summed |
| `cache_read_tokens` | long | Cache read tokens, summed |
| `cache_creation_tokens` | long | Cache write tokens, summed |
| `files_changed` | long | Distinct files edited or written |
| `compactions` | long | Compactions |
| `ended_with_api_error` | long | 1 when the last call of the turn failed |
| `thinking_chars` | long | Thinking characters of the turn's calls, summed |
| `thinking_blocks` | long | Thinking blocks, summed |
| `thinking_redacted` | long | Redacted thinking blocks, summed |
| `thinking_ms` | real | Thinking time in ms, summed |
| `project` | string | Part of the key. The turn's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_outcomes

What a session achieved, as the tool reports it. One row per session, typed values only.

- Key: `project`, `node_id`, `session_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/session_outcomes.py` and `ingesters/call_facts.py`

The row is put together from parts, one per source; a source read again replaces its part.

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `tool` | string | Tool id |
| `project_path` | string | Working folder |
| `ts` | real | Time of the newest part of the row, epoch seconds, UTC |
| `permission_modes` | dynamic | Array of permission modes seen (Claude Code `permissionMode`) |
| `modes` | dynamic | Array of modes seen (Claude Code `mode`, Copilot `session.mode_changed`, VS Code `modeInfo`) |
| `last_mode` | string | The last mode |
| `pr_refs` | dynamic | Array of pull request references (Claude Code `pr-link`, Copilot `session_refs`) |
| `commit_refs` | dynamic | Array of commit references (Copilot `session_refs`) |
| `lines_added` | long | Lines added, as the tool reported |
| `lines_removed` | long | Lines removed, as the tool reported |
| `files_changed` | long | Files changed, as the tool reported |
| `reported_cost_usd` | real | The tool's own cost figure, separate from aictl's `cost_usd` |
| `reported_api_ms` | real | The tool's own API time in ms |
| `reported_tool_ms` | real | The tool's own tool time in ms |
| `premium_requests` | real | Copilot `totalPremiumRequests` |
| `hook_runs` | long | Hook runs (Claude Code `stop_hook_summary`, Copilot `hook.end`) |
| `hook_failures` | long | Failed hook runs |
| `compactions` | long | Compactions |
| `todos_total` | long | Items of the last todo list |
| `todos_completed` | long | Completed items of the last todo list |
| `workflow_runs` | long | Claude Code workflow runs (`workflows/wf_*.json`) |
| `workflows_failed` | long | Failed workflow runs |
| `task_complete` | long | 1 when Copilot reported `session.task_complete` or VS Code ran `task_complete` |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_digests

The tools' own summaries of a session, one row per version. Text.

- Key: `project`, `node_id`, `session_id`, `agent_id`, `kind`, `seq`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `text` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/session_outcomes.py` and `ingesters/call_facts.py`, only while text is kept

Rows written before layout 5 have `agent_id` "" and no `text_hash`; a `todo_list` row of
Claude Code with `seq` 0 is from then and holds the last list seen, not one version. A Copilot
`todo_list` row with `seq` 0 is the session store's current list.

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `kind` | string | `checkpoint` (Copilot: title, overview, history, work done, technical details, important files, next steps), `task_summary`, `compact_summary`, `todo_list` (one version per list the tool sent: Claude `TodoWrite`, Copilot `update_todo`), `task_change` (one Claude `TaskCreate` or `TaskUpdate` call, its fields as sent) or `workflow_summary` |
| `seq` | long | Version of the digest within its session, agent and kind, from 1 |
| `ts` | real | Time of the digest, epoch seconds, UTC |
| `title` | string | Title of the digest, when it has one. KQL keyword: write `['title']` |
| `text` | string | The summary, redacted. Over `large_payload_bytes` a preview; the whole text is in `file_blobs` under `text_hash` |
| `tool` | string | Tool id |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `agent_id` | string | Part of the key. The subagent whose record holds the digest; "" for the main agent |
| `text_hash` | string | When `text` is a preview: the `file_blobs.hash` of the whole text (kept as long as the `file_text` class); "" when `text` is whole |
| `text_bytes` | long | Size of the whole text in UTF-8 bytes |
| `event_key` | string | The `context_events.dedup_key` of the compaction or checkpoint this text summarises; "" when none |

### session_prompts

One row per prompt given to an agent.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `prompt` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/call_facts.py`

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `dedup_key` | string | Key of the prompt, set by the reader |
| `ts` | real | When the prompt was given, epoch seconds, UTC |
| `session_id` | string | The session |
| `agent_id` | string | "" for a person's prompt to the main agent; the subagent id for a prompt to a subagent |
| `tool` | string | Tool id |
| `project_path` | string | Working folder |
| `text` | string | The prompt text, redacted and bounded; "" when text is not kept or older than the `prompt` period |
| `prompt_file` | string | The command or prompt file the prompt came from, when there is one |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### session_thinking

The visible thinking text of model calls, one row per block. Text.

- Key: `project`, `node_id`, `session_id`, `thinking_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `thinking` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/call_facts.py`, only while text is kept and newer than the `thinking` period

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `thinking_key` | string | Key of the block: the call's ids and the block's index |
| `ts` | real | Time of the block, epoch seconds, UTC |
| `agent_id` | string | The subagent; "" for the main agent |
| `request_key` | string | `dedup_key` of the `requests` row; "" when the source cannot tell the call |
| `message_id` | string | Message id of the call |
| `turn_index` | long | The user turn of the session |
| `block_index` | long | Position of the block in the call |
| `model` | string | Model of the call |
| `chars` | long | Length of the whole text, also when the stored text is cut |
| `text` | string | The thinking text, redacted, at most 250000 characters |
| `tool` | string | Tool id |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_files

How each file was touched in a session: read, edited or created, by which tool, how often.

- Key: `project`, `node_id`, `session_id`, `agent_id`, `path`, `how`, `tool_name`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/call_facts.py` and `ingesters/session_outcomes.py`

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `agent_id` | string | The agent whose record the counts come from; "" for the main agent. Sum over it for a session |
| `path` | string | The file path as the tool wrote it |
| `how` | string | `read`, `edited` or `created` |
| `tool_name` | string | The tool that touched it, for example `Read`, `Edit`, `view` |
| `count` | long | How often |
| `first_ts` | real | First time, epoch seconds, UTC |
| `ts` | real | Last time, epoch seconds, UTC |
| `tool` | string | Tool id |
| `project_path` | string | Working folder |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_loaded_files

Files a session loaded, as its own record shows.

- Key: `project`, `node_id`, `session_id`, `path`, `how`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/loaded_files.py` and `ingesters/call_facts.py`

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `path` | string | Path of the loaded file |
| `how` | string | `instructions`, `nested_memory`, `skill`, `custom_agent` or `system_prompt` |
| `detail` | string | More about how the file was loaded, as the reader recorded it |
| `ts` | real | When first seen, epoch seconds, UTC |
| `tool` | string | Tool id |
| `agent_id` | string | The subagent; "" for the main agent |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### session_context_items

Items a tool put in a session's context, as last recorded.

For the list kinds (`tools_listed`, `skills`, `custom_agents`, `mcp_instructions`) each
announcement of a list (the items of one kind one agent was told at one time) is one
pointer row since layout 4: `name` is `list:` + the `list_id` of its items in
`context_lists`, `path` is "", `ts` is the time of the announcement, `chars` and `tokens`
are the sums over its items not removed, `estimated` is 1 when any item is estimated and
`removed` is 0. A reader expands each current pointer row into its list's items, which take
the pointer's session, agent, kind, project, tool, `ts` and `_v`, and then takes the newest
version of each item by the key (`EXPANSION_KQL` in `aictl/context_lists.py`). Rows written
before layout 4, and rows of the other kinds, are one row per item.

- Key: `project`, `node_id`, `session_id`, `agent_id`, `kind`, `name`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`, grouped by `aictl/context_lists.py`), from `ingesters/context_items.py`

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `agent_id` | string | The subagent; "" for the main agent |
| `kind` | string | `memory_file`, `skills`, `mcp_instructions`, `custom_agents`, `tools_listed`, `instruction_file`, `system_prompt_other` or `reset` |
| `name` | string | Name of the item; "" for the total of its kind; `list:<list_id>` for a pointer row |
| `ts` | real | When recorded, epoch seconds, UTC |
| `path` | string | File path of the item, when it has one |
| `chars` | long | Characters of the item |
| `tokens` | long | Tokens of the item |
| `estimated` | long | 1 when `tokens` is estimated |
| `removed` | long | 1 when the item was removed from the context |
| `tool` | string | Tool id |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### context_lists

The items of each distinct list that a `session_context_items` pointer row names. A list is
stored once per node, not once per agent: `list_id` is the first 32 hex digits of the
SHA-256 of the list's kind and its sorted (name, path, chars, tokens, estimated, removed)
items, so two agents told the same list point to the same rows. The rows of a list never
change; a node writes a list again (identical rows, a new `_v`) at most once a day while it
is still pointed to, so retention does not drop a list that recent pointers name.

- Key: `project`, `node_id`, `list_id`, `name`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`, grouped by `aictl/context_lists.py`), from `ingesters/context_items.py`

| column | type | meaning |
|---|---|---|
| `list_id` | string | Part of the key. The hash of the list's content |
| `kind` | string | `tools_listed`, `skills`, `custom_agents` or `mcp_instructions` |
| `name` | string | Part of the key. Name of the item |
| `path` | string | File path of the item, when it has one |
| `chars` | long | Characters of the item |
| `tokens` | long | Tokens of the item |
| `estimated` | long | 1 when `tokens` is estimated |
| `removed` | long | 1 when the announcement removed the item from the context |
| `tool` | string | Tool id of the agent that first wrote the list; a reader takes the pointer's |
| `project` | string | Part of the key. Always "": a list belongs to no project |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_folders

One row per scanned session folder of a tool (Copilot CLI `session-state/<id>/`, Claude Code `projects/<project>/<id>/`).

- Key: `project`, `node_id`, `session_id`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_evidence.py` (`replace_session_artifacts`)

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session (the folder name) |
| `tool` | string | Tool id |
| `folder` | string | Absolute path of the session folder |
| `signature` | real | The newest mtime of the folder and its direct subfolders at the scan |
| `files_total` | long | Number of files, also past the row cap |
| `bytes_total` | long | Size of all files |
| `scanned_at` | real | Time of the scan, epoch seconds, UTC |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### session_artifacts

One row per file in a session folder. aictl never reads the content.

- Key: `project`, `node_id`, `session_id`, `path`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_evidence.py` (`replace_session_artifacts`)

A removed file, and every file of a removed folder, is deleted with a tombstone.

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `path` | string | Absolute file path |
| `folder` | string | First folder part under the session folder; "" at the top |
| `size_bytes` | long | Size at the scan |
| `mtime` | real | Modification time at the scan, epoch seconds, UTC |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### session_sources

One row per session file found on disk, and how much of it has been read.

- Key: `project`, `node_id`, `source_file`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `ingesters/transcript_usage.py` (`_index_sources`), through `dashboard/ingester_runner.py`

| column | type | meaning |
|---|---|---|
| `source_file` | string | Absolute path of the session file |
| `session_id` | string | The session the file belongs to |
| `tool` | string | Tool id |
| `size_bytes` | long | Size at the last scan |
| `mtime` | real | Modification time at the last scan, epoch seconds, UTC |
| `bytes_read` | long | How much of the file is stored |
| `status` | string | `waiting`, `reading`, `complete` or `outside_window` (excluded by `history_days`) |
| `indexed_at` | real | When the row was written, epoch seconds, UTC |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### memory_snapshots

The memory files of a session's project at a phase of the session.

- Key: `project`, `node_id`, `session_id`, `phase`, `path`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `session_evidence.py` (`memory`)

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `phase` | string | The phase of the session the snapshot was taken at |
| `path` | string | Path of the memory file |
| `sha` | string | SHA-256 of the content |
| `content` | string | Not set here (null): the content is in `memory_snapshots_text` |
| `ts` | real | Time of the snapshot, epoch seconds, UTC |
| `project` | string | Part of the key. The root of the session's repository |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### memory_snapshots_text

The content of the memory files of `memory_snapshots`. Text.

- Key: `project`, `node_id`, `session_id`, `phase`, `path`, `sha`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `file_text` (default 365d)
- Written by: `session_evidence.py` (`memory`), only while text is kept

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `phase` | string | The phase |
| `path` | string | Path of the memory file |
| `sha` | string | SHA-256 of the content |
| `content` | string | The file content |
| `ts` | real | Time of the snapshot, epoch seconds, UTC |
| `project` | string | Part of the key. The root of the session's repository |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

## Tables: Model calls and tool calls

### requests

One row per model call.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: `_deleted`
- Tombstone carries: `session_id`, `agent_id`, `ts`, `tool`, `source`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`requests`), from transcripts and from OTel

A call reported by OTel and read again from the transcript is stored once. The two are paired by session and the four token counts, in order; the transcript row takes the telemetry-only values (`duration_ms`, `ttft_ms`, `prompt_id`, `pid`, `finish_reason`, `request_id`, `response_id`) and the OTel row is deleted with a tombstone.

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `dedup_key` | string | Key of the model call: the source's call id, else a hash of the session, the embedded time or the token counts, the model and the source |
| `ts` | real | When the call happened, from the source's own timestamp, epoch seconds, UTC |
| `session_id` | string | The session |
| `agent_id` | string | The subagent that made the call; "" for the main agent |
| `tool` | string | Tool id |
| `project_path` | string | Working folder of the call |
| `pid` | long | Process id of the tool, from telemetry |
| `model` | string | Model that answered |
| `input_tokens` | long | Uncached input tokens |
| `output_tokens` | long | Output tokens |
| `cache_read_tokens` | long | Cache read tokens |
| `cache_creation_tokens` | long | Cache write tokens |
| `cost_usd` | real | Cost in USD, rounded to 6 decimals |
| `duration_ms` | real | Duration of the call in ms, from telemetry |
| `finish_reason` | string | Finish or stop reason |
| `is_error` | long | 1 when the call failed |
| `error_type` | string | Error type of a failed call |
| `http_status` | long | HTTP status of a failed call |
| `source` | string | `transcript` for a call read from the tool's session file; otherwise the reporting source, for example `otel` |
| `prompt_id` | string | Claude Code `promptId` of the turn; joins `session_turns.prompt_id` |
| `ttft_ms` | real | Time to first token in ms |
| `tool_tokens` | long | Tokens of tool definitions sent, where the source reports them; null when not reported |
| `max_prompt_tokens` | long | Prompt token limit, where the source reports it; null when not reported |
| `request_bytes` | long | Size of the request, where the source reports it; null when not reported |
| `available_tools` | long | Number of tools offered to the model, where the source reports it; null when not reported |
| `request_id` | string | The provider's request id, when the source names it |
| `response_id` | string | The provider's response or message id, which a transcript names too |
| `turn_index` | long | The user turn of the session (1 = the first); null when unknown |
| `effort` | string | Reasoning effort the tool asked for |
| `thinking_ms` | real | Claude Code `thinkingDurationMs`, the longest a line of the call reported |
| `attribution_mcp_server` | string | Claude Code `attributionMcpServer`: what the tool says caused the call |
| `attribution_skill` | string | Claude Code `attributionSkill`: what the tool says caused the call |
| `requested_model` | string | Claude Code `requestedModel`, only when it differs from `model` |
| `thinking_chars` | long | Length of the visible thinking text of the call |
| `thinking_blocks` | long | Number of visible thinking blocks |
| `thinking_redacted` | long | Number of redacted or encrypted thinking blocks; counted, never stored |
| `thinking_tokens` | long | Reasoning tokens, where the tool reports them |
| `project` | string | Part of the key. The call's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### turn_request_links

Which turn of a Copilot CLI session each model call belongs to. Never a second cost observation.

- Key: `project`, `node_id`, `request_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/transcript_steps.py`

| column | type | meaning |
|---|---|---|
| `request_key` | string | `dedup_key` of the `requests` row |
| `ts` | real | Time of the usage record, epoch seconds, UTC |
| `session_id` | string | The session |
| `agent_id` | string | The subagent; "" for the main agent |
| `turn_id` | string | The turn of the agent the call belongs to |
| `root_session_id` | string | The session of the root turn; "" when there is no root turn |
| `root_turn_id` | string | The main agent's turn the call rolls up to |
| `basis` | string | How the link was found: `explicit_turn`, `api_call_id`, `open_turn`, `spawn_tool`, `checkpoint`, `unknown_agent` or `unattributed` |
| `tool` | string | `copilot-cli` |
| `project_path` | string | Working folder |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### tool_invocations

One row per tool call, without its text.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: `_deleted`
- Tombstone carries: `session_id`, `agent_id`, `ts`, `tool`, `tool_name`, `source`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `tool_calls.py` (`ToolCalls`), from transcripts, hooks and OTel

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `dedup_key` | string | Key of the call: from the source's call id (for example the `tool_use_id`), else the embedded time, else the arguments |
| `ts` | real | When the call started, epoch seconds, UTC |
| `session_id` | string | The session |
| `request_id` | long | Always 0 in current code: no reader sets it. Use `request_key` |
| `tool` | string | Tool id of the AI tool |
| `tool_name` | string | Name of the tool that was called, for example `Bash`, `Read`, `mcp__<server>__<tool>` |
| `project_path` | string | Working folder |
| `pid` | long | Process id of the AI tool, when known |
| `is_error` | long | 1 when the call failed |
| `duration_ms` | real | Duration in ms |
| `source` | string | `transcript`, `hook` or `otel`. A transcript row replaces hook and OTel rows of the same session up to `tool_invocation_coverage.covered_through` |
| `source_event_id` | string | The source's own id of the call, for example the `tool_use_id` |
| `agent_id` | string | The subagent; "" for the main agent |
| `confirm` | string | "", `auto`, `approved`, `denied` or `pending` |
| `confirm_wait_ms` | real | Time waited for a confirmation in ms |
| `exit_code` | long | Exit code of a command; null when not reported |
| `input_bytes` | long | Size of the arguments as UTF-8 text; null when not reported |
| `output_bytes` | long | Size of the result as UTF-8 text; null when not reported |
| `mcp_server` | string | The MCP server; "" when the call is not an MCP call or its name does not say |
| `mcp_tool` | string | The MCP server's tool; "" when not an MCP call |
| `target_kind` | string | `file`, `command`, `url`, `skill`, `agent`, `query` or `other` |
| `target` | string | What the call acted on: a file path, a command line, a URL, a search, a skill, a subagent type, an MCP tool. Command lines, URLs and search text are redacted, cut to 500 characters and kept only with capture `full`; otherwise the program name, the URL host, or "" |
| `target_chars` | long | Length of the command line, URL or search text before it was cut |
| `target_truncated` | bool | Whether `target` was cut |
| `command_name` | string | The program a command ran |
| `url_host` | string | The host of a URL |
| `search_path` | string | The folder a search looked in |
| `arg_names` | string | An MCP call's argument names, comma-separated |
| `read_offset` | long | Start of a ranged read |
| `read_limit` | long | Length of a ranged read |
| `agent_label` | string | The caller's short description of a subagent call |
| `error_summary` | string | A failed call's error message, redacted, short; only while text is kept |
| `interrupted` | bool | Claude Code `toolUseResult.interrupted` |
| `turn_index` | long | The user turn of the session (1 = the first); null when unknown |
| `prompt_id` | string | Claude Code `promptId` of the turn; joins `session_turns.prompt_id` |
| `request_key` | string | `dedup_key` of the `requests` row of the model call that asked for this call |
| `project` | string | Part of the key. The call's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### tool_invocations_text

The text of each tool call: arguments and result excerpt. Text, kept 24 hours by default.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `tool_content` (default 24h)
- Written by: `tool_calls.py`, only while text is kept and the call is newer than the `tool_content` period

| column | type | meaning |
|---|---|---|
| `dedup_key` | string | Joins `tool_invocations.dedup_key` |
| `input` | string | The arguments as JSON |
| `result_summary` | string | An excerpt of the result |
| `target` | string | Short display text of the call: command, file path or query |
| `project` | string | Part of the key. As the `tool_invocations` row |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### tool_invocation_coverage

How far the transcript has covered each session's tool calls.

- Key: `project`, `node_id`, `session_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `tool_calls.py` (`publish_coverage`)

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session |
| `covered_through` | real | Time of the newest transcript tool call stored for the session, epoch seconds, UTC. Hook and OTel calls up to it are replaced by transcript rows |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### tool_invocation_sizes

Argument and result sizes of tool calls, read again from old transcripts.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `tool_calls.py` (`write_size_fills`)

Kept apart so that a replay cannot overwrite a stored call.

| column | type | meaning |
|---|---|---|
| `dedup_key` | string | Joins `tool_invocations.dedup_key` |
| `input_bytes` | long | Size of the arguments as UTF-8 text |
| `output_bytes` | long | Size of the result as UTF-8 text |
| `project` | string | Part of the key. The call's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### skill_uses

One row per use of a skill.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/call_facts.py`

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `dedup_key` | string | Key of the use, set by the reader |
| `ts` | real | Time of the use, epoch seconds, UTC |
| `session_id` | string | The session |
| `agent_id` | string | The subagent; "" for the main agent |
| `tool` | string | Tool id |
| `project_path` | string | Working folder |
| `name` | string | Skill name |
| `trigger` | string | How the skill was started as the reader saw it, for example `user` or `agent-invoked` |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### context_events

Compactions and context splits as a tool's session file records them.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/call_facts.py`

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `dedup_key` | string | Key of the event, set by the reader |
| `ts` | real | Time of the event, epoch seconds, UTC |
| `session_id` | string | The session |
| `agent_id` | string | The subagent; "" for the main agent |
| `tool` | string | Tool id |
| `kind` | string | `compaction`, `split` (a split of the context by kind), `rewind_point` (a file checkpoint to rewind to: Claude Code `file-history-snapshot`, Copilot `rewind-file-snapshots/index.json` snapshot; trigger `rewind` for a Copilot `session.snapshot_rewind`), `checkpoint` (a Copilot checkpoint from its session store, or a `session_artifacts` call), `truncation` (Copilot `session.truncation`), `memory_recall` (memory loaded into the context: a Claude Code `instructions` or `nested_memory` attachment file, trigger its `type`; a Copilot `session_store_sql` or `session_history` call), `instruction_update` (Copilot `instruction.update`, trigger its `name`), `tool_baseline` (Copilot `session.tool_baseline`: which memory and context tools the session had), `context_reset` (Copilot `new_context`), `context_query` (Copilot `get_context_remaining`), or a setting the session ran under: `config.session_start` and `config.session_resume` (Copilot `session.start`, `session.resume`), `config.model_change` (`session.model_change`, trigger its `source`), `config.mode_change` (`session.mode_changed`), `config.permissions_change` (`session.permissions_changed`), `config.managed_override` (`session.info` of infoType `managed_model_override`), `config.feature_flags` (`model.model_call_success` `requestSettings.enabledFeatureFlags`, only when an agent's set changes), `config.assignment_context` (`model.captured_assignment_context`, hash and size only), `config.subagent_configured` (`subagent.configured`), `config.context_changed` (`session.context_changed`) and `config.launch_flags` (the masked, allow-listed launch flags of the process bound to the session: Copilot CLI and Claude Code; `ts` the process start, trigger the process name, keyed by session, pid and start) |
| `trigger` | string | What started a compaction, as the tool wrote it |
| `before_tokens` | long | Context tokens before a compaction; null when not reported |
| `after_tokens` | long | Context tokens after a compaction; null when not reported |
| `duration_ms` | real | Duration of a compaction in ms; null when not reported |
| `current_tokens` | long | Context tokens in use; null when not reported |
| `system_tokens` | long | System part of the context; null when not reported |
| `conversation_tokens` | long | Conversation part of the context; null when not reported |
| `tool_tokens` | long | Tool part of the context; null when not reported |
| `project` | string | Part of the key. The row's `project_path` from the reader |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `summary_kind` | string | The `session_digests.kind` of the summary this event left (same session and agent); "" when none |
| `summary_seq` | long | The `session_digests.seq` of that summary; null when none |
| `checkpoint_no` | long | The tool's number of the checkpoint (Copilot `checkpointNumber`); null when none |
| `message_id` | string | A `rewind_point`'s message: Claude Code's `messageId` (a user line's `uuid`), Copilot's `eventId` (its `user.message` event); `file_history.source_event_id` of its files |
| `files_count` | long | Files a rewind point covers; null when not reported |
| `lines_added` | long | Lines added since a Copilot rewind point; null when not reported (Claude Code does not) |
| `lines_removed` | long | Lines removed since a Copilot rewind point; null when not reported |
| `dropped_messages` | long | Messages a compaction or truncation removed (Copilot `messagesRemoved`, `messagesRemovedDuringTruncation`); null when not reported |
| `dropped_tokens` | long | Tokens a compaction or truncation removed (Copilot `tokensRemoved`, `tokensRemovedDuringTruncation`); null when not reported |
| `cumulative_dropped_tokens` | long | Claude Code `cumulativeDroppedTokens`: the tokens all compactions of the session dropped so far; null when not reported |
| `preserved_messages` | long | Messages a Claude Code compaction kept (`preservedMessages.uuids`); null when not reported |
| `path` | string | The file the event names: Copilot `checkpointPath`, the file a `session_artifacts` call wrote, a recalled memory file |
| `tool_call_id` | string | The tool call of an event that is a call (`memory_recall` by `session_store_sql`, `session_artifacts`, `new_context`); joins `tool_invocations.source_event_id` |
| `prompt_id` | string | The turn: Claude Code `promptId`, Copilot `interactionId`; "" when the source does not say |
| `turn_index` | long | The turn's number in the session; null when not known |
| `content_hash` | string | The `file_blobs.hash` of the text the event put into the context (a loaded memory file, an instruction update); "" when none. A loaded file matches a stored version of the file only when the tool loaded it whole |
| `detail` | string | JSON of the event's other figures, never text: a truncation's limits, a tool baseline's `tool_count`, `memory_tools` and `context_tools`, an instruction update's `authority`, `lifetime`, `boundary`, `fallback`; for a `config.*` kind the event's fields under the tool's own names, only those it reported (`selectedModel`, `reasoningEffort`, `contextTier`, `copilotVersion`, `context`; `previousModel`, `newModel`, `previousReasoningEffort`, `source`; `previousMode`, `newMode`, `mode`, `allowAllPermissionMode`; `infoType`, `message`; feature flags' `flags`, `count`, `hash`, `previous_hash`; an assignment context's `hash`, `bytes`, `kind`; launch flags' `pid`, `started_at`, `count` and `flags`, each `{flag, value}` with the value masked, an inline JSON value replaced by `<redacted>` with its `bytes` and `hash`, a prompt flag `value_withheld`); "" when none |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### file_write_events

One row per write-like file event of an agent.

- Key: `project`, `node_id`, `dedup_key`
- Version column: `_v`
- Tombstone column: `_deleted`
- Tombstone carries: `session_id`, `ts`, `tool`, `path`
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`file_writes`), from transcripts and hooks

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `dedup_key` | string | Key of the write: from the source, else a hash of the session, operation, path and event id or time. A Claude Code edit has one key from its tool call id and path argument, so its hook and its transcript line are one row |
| `ts` | real | Time of the write, epoch seconds, UTC |
| `session_id` | string | The session |
| `tool` | string | Tool id |
| `tool_name` | string | The tool that wrote, for example `Edit`, `Write` |
| `operation` | string | The kind of write as the reader names it, for example `write` |
| `path` | string | The file path. A memory without a file of its own has a path no file has: `copilot-memory://<scope>/<repository>/<subject>` (Copilot `store_memory`; `vote_memory` names `copilot-memory://<scope>/<repository>`), `vscode-memory:///memories/...` (VS Code `memory` tool) |
| `project_path` | string | Working folder |
| `pid` | long | Process id, when known |
| `source_event_kind` | string | `transcript` for a write read from a transcript; otherwise the reporting source, for example `hook` |
| `source_event_id` | string | The source's id of the event, for example the tool call id |
| `content_hash` | string | Hash of the written content, when known |
| `size_bytes` | long | Size written, when known |
| `detail` | string | JSON detail of the write; `{}` when text is not kept |
| `project` | string | Part of the key. The row's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `agent_id` | string | The subagent that wrote; "" for the main agent. `session_id` is then the parent session |
| `prompt_id` | string | The turn: Claude Code `promptId`, Copilot `interactionId`; "" when the source does not say |
| `turn_index` | long | The turn's number in its session, from 1; null when the source does not say |
| `mechanism` | string | The memory or instruction mechanism of `path`: `claude_auto_memory`, `claude_md`, `agents_md`, `copilot_instructions`, `copilot_store_memory`, `vscode_memory` or `codex_memory`; "" for any other file (`memory_changes.memory_mechanism`) |
| `actor` | string | `agent` or `subagent` when the session's own write event shows it; `outside_session` when the tool reports the file changed outside the session (Claude Code `edited_text_file`); "" when not known. Never a guess |
| `lines_added` | long | Lines added, as the tool reports them or as counted from the call's own text; null when not known |
| `lines_removed` | long | Lines removed; null when not known |
| `before_hash` | string | The `file_blobs.hash` of the content before the write; "" when not known |
| `after_hash` | string | The `file_blobs.hash` of the content after the write; "" when not known |
| `before_bytes` | long | Size of the content before; null when not known |
| `after_bytes` | long | Size of the content after; null when not known |
| `before_source` | string | For a memory or instruction file, where the before-image came from: `tool_result` (Claude Code's own copy of the file before the call, `originalFile`), `absent` (the tool says the file did not exist), `previous_version` (the after-image of the last change of the path this node stored; a change no event reported lies inside the diff), `claude_backup` or `copilot_preimage` (the tool's checkpoint backup), or a value starting `unknown:` that says why there is none; "" for other files |
| `after_source` | string | Where the after-image came from: `tool_input` (the whole text the call wrote: a Write, a stored fact, a created memory file), `file_at_ingest` (the file read when the event was read, its mtime inside the write's time, so no later change), `absent` (deleted), or `unknown: …` (for example `unknown: the file changed after the write`); "" for other files |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### session_steps

Typed steps of a Copilot CLI session, from its `session-state/<id>/events.jsonl` file. A step is evidence, not a billable call.

- Key: `project`, `node_id`, `step_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`write`), from `ingesters/transcript_steps.py`

| column | type | meaning |
|---|---|---|
| `step_key` | string | Key of the step: a hash of the session, the event id and the kind |
| `ts` | real | Time of the event, epoch seconds, UTC |
| `session_id` | string | The session |
| `kind` | string | What the step is: `message`, `agent_prompt`, `turn`, `round`, `tool_call`, `tool_result`, `skill`, `agent`, `context`, `command`, `session_command` |
| `tool` | string | `copilot-cli` |
| `project_path` | string | Working folder |
| `agent_id` | string | The subagent; "" for the main agent |
| `parent_agent_id` | string | The agent that started the subagent |
| `turn_id` | string | Copilot turn id |
| `round_id` | string | Copilot `apiCallId` of the model call; a long opaque id is stored as `opaque:` and its SHA-256 |
| `message_id` | string | Copilot `messageId` |
| `request_id` | string | Copilot `requestId` (on a usage step, else `providerCallId`) |
| `tool_call_id` | string | Copilot `toolCallId` |
| `trace_id` | string | Always empty: the writer sets none (Copilot events carry no trace id) |
| `span_id` | string | Always empty: the writer sets none |
| `parent_span_id` | string | Always empty: the writer sets none |
| `source` | string | The Copilot event type, for example `user.message`, `tool.execution_start` |
| `source_order` | long | Position of the step in the session file |
| `role` | string | `user` or `assistant` on a message step |
| `name` | string | A label: tool, skill, command or agent name; only names that look like identifiers |
| `phase` | string | Phase of the step, for example `requested`, `started`, `failed`, `applied`, `loaded` |
| `text_status` | string | "" when the text is in `session_step_text`; `omitted`, `truncated` (only a preview is kept), `expired` or `withheld` (text not kept) |
| `context_tokens` | long | Context tokens reported with the step |
| `context_limit` | long | Context limit reported with the step |
| `before_tokens` | long | Tokens before a compaction or truncation |
| `after_tokens` | long | Tokens after a compaction or truncation |
| `input_tokens` | long | Input tokens of a usage step, cached tokens included |
| `output_tokens` | long | Output tokens of a usage step |
| `estimated` | long | 1 when the token figures are estimated |
| `exit_code` | long | Exit code of a command |
| `system_tokens` | long | System part of the context |
| `conversation_tokens` | long | Conversation part of the context |
| `tool_tokens` | long | Tool part of the context |
| `project` | string | Part of the key. The step's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### session_step_text

The text of session steps. Text.

- Key: `project`, `node_id`, `step_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `message` (default 365d)
- Written by: `session_facts.py` (`write`), only while text is kept and newer than the `message` period

| column | type | meaning |
|---|---|---|
| `step_key` | string | Joins `session_steps.step_key` |
| `session_id` | string | The session |
| `ts` | real | Time of the step, epoch seconds, UTC |
| `text` | string | The step's text, redacted, at most 32768 characters; a value over `large_payload_bytes` is a preview, see `text_payloads` |
| `project` | string | Part of the key. The step's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### text_payloads

The full text of large text values, in chunks. The row in the value's own table keeps a preview.

- Key: `project`, `node_id`, `source_table`, `source_key`, `field`, `chunk_no`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `large_payload` (default 24h)
- Written by: `session_facts.py` (`spill`), for values over `[storage] large_payload_bytes` (default 32768) in `agents_text`, `events_text`, `session_digests` and `session_step_text`

| column | type | meaning |
|---|---|---|
| `source_table` | string | Table of the value |
| `source_key` | string | Key of the row in that table: `step_key`, `source_key`, `<session_id>/<agent_id>` or `<kind>:<seq>` |
| `field` | string | Column of the value |
| `chunk_no` | long | Position of the chunk, from 0 |
| `chunk_count` | long | Number of chunks |
| `total_bytes` | long | Size of the full text in UTF-8 bytes |
| `session_id` | string | The session |
| `ts` | real | Time of the source row, epoch seconds, UTC |
| `text` | string | This chunk, at most 200000 characters. Concatenate by `chunk_no` |
| `project` | string | Part of the key. The source row's project |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

## Tables: Messages

### copilot_session_messages

Messages of Copilot sessions from Copilot's session store. Text.

- Key: `project`, `node_id`, `source_table`, `source_row_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `message` (default 365d)
- Written by: `ingesters/copilot_session_store.py` through `ingesters/message_facts.py`

| column | type | meaning |
|---|---|---|
| `session_id` | string | The session id the store's row carries; "" when it has none |
| `source_row_id` | long | `rowid` of the row in the source table |
| `source_table` | string | The table of Copilot's store the row came from |
| `role` | string | Message role |
| `content` | string | Message text, at most 20000 characters; "" when text is not kept or older than the `message` period |
| `ts` | real | Time of the message, epoch seconds, UTC |
| `ingested_at` | real | When aictl read it, epoch seconds, UTC |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### vscode_chat_messages

Messages of VS Code chat sessions. Text.

- Key: `project`, `node_id`, `session_id`, `source_file`, `source_row_id`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `message` (default 365d)
- Written by: `ingesters/vscode_chat_logs.py`

A message read again under another session is deleted under the old one with a tombstone.

| column | type | meaning |
|---|---|---|
| `session_id` | string | VS Code's chat `sessionId`, or the file name when it has none |
| `source_file` | string | The chat file |
| `source_row_id` | long | Position in the chat: request index times 2, plus 1 for the reply |
| `role` | string | `user` or `assistant` |
| `content` | string | Message text, bounded; "" when text is not kept or older than the `message` period |
| `model` | string | Model id of the request |
| `ts` | real | Time of the request, epoch seconds, UTC |
| `ingested_at` | real | When aictl read it, epoch seconds, UTC |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### cursor_session_messages

Messages of Cursor conversations. Text.

- Key: `project`, `node_id`, `source_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `message` (default 365d)
- Written by: `ingesters/cursor_conversations.py` through `ingesters/message_facts.py`

| column | type | meaning |
|---|---|---|
| `session_id` | string | The Cursor conversation id; "" when the message has none |
| `source_row_id` | long | Row id of the message in Cursor's store |
| `role` | string | Message role |
| `content` | string | Message text, at most 20000 characters; "" when text is not kept or older than the `message` period |
| `ts` | real | Time of the message, epoch seconds, UTC |
| `project` | string | Part of the key. The session's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `source_key` | string | Hash of the session id and `source_row_id` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

## Tables: Events, hooks, metrics and snapshots

### events

The event log: monitor events, hook events and OTel events, without their text.

- Key: `project`, `node_id`, `source_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `session_facts.py` (`events`)

| column | type | meaning |
|---|---|---|
| `ts` | real | Time of the event, epoch seconds, UTC |
| `tool` | string | Tool id |
| `kind` | string | Event kind, for example `session_start`, `hook:<Event>`, `otel:health` |
| `session_id` | string | The session, when known |
| `pid` | long | Process id, when known |
| `project_path` | string | `project_path`, `cwd` or `project` of the detail |
| `detail` | string | JSON detail with text removed: text keys become `<key>_chars` lengths, strings over 256 characters too |
| `source_key` | string | Key of the event |
| `seq` | long | A number from the hash of `source_key` |
| `project` | string | Part of the key. `project_path` of the event |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### events_text

The full detail of events whose detail had text. Text.

- Key: `project`, `node_id`, `source_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `text` (default 365d)
- Written by: `session_facts.py` (`events`), only while text is kept

| column | type | meaning |
|---|---|---|
| `source_key` | string | Joins `events.source_key` |
| `detail` | string | JSON detail with its text; a value over `large_payload_bytes` is a preview, see `text_payloads` |
| `project` | string | Part of the key. As the `events` row |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `ts` | real | Time of the event, epoch seconds, UTC |

<a id="version-38-hook-calls"></a>

### hook_calls

One row per hook call the aictl hook handler reports.

- Key: `project`, `node_id`, `call_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `session_facts.py` (`hook`), from `POST /api/hooks`

| column | type | meaning |
|---|---|---|
| `id` | long | Equal to `rowid` |
| `call_id` | string | The handler's call id; for a POST without one, `body:` and a hash of the body |
| `ts` | real | Time of the call, epoch seconds, UTC |
| `received_at` | real | Receive time, epoch seconds, UTC; `received_at - ts` is the delivery lag |
| `format_version` | long | Wire format version; 0 for an older handler |
| `tool` | string | Tool id |
| `event` | string | aictl's event name |
| `hook_event_name` | string | The tool's own event name |
| `source` | string | The handler's `source` |
| `session_id` | string | The session |
| `agent_id` | string | The subagent; "" for the main agent |
| `project_path` | string | Working folder (`cwd`) |
| `pid` | long | Tool process id, when known |
| `hook_pid` | long | Process id of the handler |
| `hook_ppid` | long | Parent process id of the handler |
| `tool_name` | string | Tool name of a tool event |
| `tool_use_id` | string | Tool call id of a tool event |
| `permission_mode` | string | Permission mode |
| `payload_bytes` | long | Bytes read from stdin |
| `truncated` | long | 1 when the payload was over 16 MiB |
| `payload` | string | `{}` when the text is kept (the payload is then in `hook_calls_text`); otherwise the payload as JSON with its text removed |
| `wrapped` | long | 1 for a user hook run through `aictl hooks wrap` |
| `command_hash` | string | First 16 hex digits of the SHA-256 of the wrapped command |
| `exit_code` | long | Exit code of the wrapped command; null when not wrapped |
| `duration_ms` | real | Run time of the wrapped command in ms |
| `overhead_ms` | real | The wrapper's own time in ms |
| `stdout_bytes` | long | Size of the wrapped command's stdout |
| `stderr_bytes` | long | Size of the wrapped command's stderr |
| `decision` | string | Decision of the wrapped hook (from its output, or `block` for exit code 2) |
| `project` | string | Part of the key. The call's `project_path` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### hook_calls_text

The text of hook calls: wrapped command, its output and the payload. Text, kept 24 hours by default.

- Key: `project`, `node_id`, `call_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `tool_content` (default 24h)
- Written by: `session_facts.py` (`hook`), only while text is kept and newer than the `tool_content` period

| column | type | meaning |
|---|---|---|
| `call_id` | string | Joins `hook_calls.call_id` |
| `command` | string | The wrapped command |
| `output` | string | The wrapped command's stdout |
| `payload` | string | The tool's payload as JSON |
| `project` | string | Part of the key. As the `hook_calls` row |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `ts` | real | Time of the call, epoch seconds, UTC |

### metrics

Metric samples: one value of one named metric at one time.

- Key: `project`, `node_id`, `ts`, `metric`, `seq`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `sink.py`

| column | type | meaning |
|---|---|---|
| `ts` | real | Sample time, epoch seconds, UTC |
| `metric` | string | Dotted metric name |
| `value` | real | The value |
| `tool` | string | `tool` or `aictl.tool` of the tags |
| `project_path` | string | `project_path` or `cwd` of the tags |
| `session_id` | string | `session_id` of the tags |
| `tags` | string | JSON of the sample's tags |
| `seq` | long | A number from the hash of the tags and the value |
| `project` | string | Part of the key. `project_path` of the sample |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### system_snapshots

Host-wide totals and node settings, sampled by the daemon.

- Key: `project`, `node_id`, `ts`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `orchestrator.py` (`_persist_samples`), when the values change, every 300 s, and every 30 s with health counters

| column | type | meaning |
|---|---|---|
| `ts` | real | Sample time, epoch seconds, UTC |
| `cpu_percent` | real | CPU percent of all AI tool processes |
| `cpu_per_core` | string | JSON array of the CPU percent per core |
| `memory_used_mb` | real | Memory of all AI tool processes in MB |
| `memory_total_mb` | real | meaning not established: the writer does not set it |
| `active_sessions` | long | meaning not established: the writer does not set it |
| `active_processes` | long | Number of AI tool processes |
| `ai_token_rate` | real | meaning not established: the writer does not set it |
| `files` | long | Number of discovered context files |
| `tokens` | long | Estimated tokens of the discovered files |
| `mcp` | long | Number of MCP servers |
| `mem_tokens` | long | Estimated tokens of memory files |
| `memory_entries` | long | Number of memory entries |
| `live_sessions` | long | Number of live sessions |
| `live_tokens` | long | Estimated tokens of live sessions |
| `live_in_rate` | real | Inbound traffic of AI tools, bytes per second |
| `live_out_rate` | real | Outbound traffic of AI tools, bytes per second |
| `daemon_pid` | long | Process id of the aictl daemon |
| `node_source` | string | Where the node id came from |
| `capture_mode` | string | The capture mode: `full`, `metadata` or `off` |
| `ingestion_mode` | string | The configured Kusto ingestion mode |
| `retention_days` | long | Retention in days of `system_snapshots` as the code defines it by default |
| `content_retention_days` | long | Retention in days of `session_step_text` as the code defines it by default |
| `settings_captured_at` | real | Time the settings columns were captured, epoch seconds, UTC |
| `host_cpu_percent` | real | Average CPU percent over all cores of the host |
| `host_memory_used_mb` | real | Used memory of the host in MB |
| `host_memory_total_mb` | real | Total memory of the host in MB |
| `node_health_counters` | string | JSON: `pid`, `at`, and the store transport and runtime counters of the daemon |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### process_snapshots

CPU and memory of each AI tool, sampled by the daemon.

- Key: `project`, `node_id`, `ts`, `pid`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `orchestrator.py` (`_persist_samples`), when a tool's values change or every 300 s

| column | type | meaning |
|---|---|---|
| `ts` | real | Sample time, epoch seconds, UTC |
| `pid` | long | Not a process id: a number derived from the tool name (`call_key(tool) % 2000000000`), one per tool |
| `tool` | string | Tool id |
| `cpu_percent` | real | CPU percent of the tool's processes, summed |
| `memory_rss_mb` | real | Resident memory of the tool's processes in MB |
| `memory_vms_mb` | real | meaning not established: the writer does not set it |
| `open_files` | long | meaning not established: the writer does not set it |
| `threads` | long | meaning not established: the writer does not set it |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### tool_stats

Per-tool usage totals from the tools' own stats (OTel, stats cache, events files, network inference).

- Key: `project`, `node_id`, `ts`, `tool`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `orchestrator.py` (`_persist_samples`), when the values change or every 300 s

| column | type | meaning |
|---|---|---|
| `ts` | real | Sample time, epoch seconds, UTC |
| `tool` | string | Tool id |
| `source` | string | Where the figures came from |
| `confidence` | real | Confidence in the figures, 0 to 1 |
| `input_tokens` | long | Input tokens |
| `output_tokens` | long | Output tokens |
| `cache_read_tokens` | long | Cache read tokens |
| `cache_creation_tokens` | long | Cache write tokens |
| `total_sessions` | long | Sessions |
| `total_messages` | long | Messages |
| `cost_usd` | real | Cost in USD |
| `model` | string | Main model |
| `by_model` | string | JSON: figures per model |
| `by_project` | string | Always `{}` in current code |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### otel_trace_sessions

The session of an OTel trace, for spans and logs that do not name their session.

- Key: `project`, `node_id`, `trace_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` (`trace_links`), from the OTel receiver

| column | type | meaning |
|---|---|---|
| `trace_id` | string | OTel trace id |
| `session_id` | string | The session a span of the trace named |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_attribution

Defined for the tool a session is attributed to.

- Key: `project`, `node_id`, `session_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: `session_facts.py` defines `attribution`, but no current code calls it

| column | type | meaning |
|---|---|---|
| `session_id` | string | meaning not established: no current aictl code writes this table |
| `tool` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. Always "" when written |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

## Tables: Files

### files

The inventory of AI tool context files found on disk.

- Key: `project`, `node_id`, `path`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `file_inventory.py` (`sync`), from discovery

A file that is no longer found is deleted with a tombstone.

| column | type | meaning |
|---|---|---|
| `path` | string | Absolute file path |
| `tool` | string | Tool the file belongs to |
| `category` | string | Kind of file, for example `instructions`, `config`, `rules`, `memory` |
| `scope` | string | Scope of the file, for example `global`, `project`, `user` |
| `blob_hash` | string | Hash of the stored content; joins `file_blobs.hash`. "" when no content was read |
| `content_hash` | string | First 16 hex digits of the SHA-256 of the text |
| `size_bytes` | long | File size |
| `tokens` | long | Estimated tokens |
| `lines` | long | Line count of the read content; 0 when not read |
| `mtime` | real | File modification time, epoch seconds, UTC |
| `first_seen` | real | When first found, epoch seconds, UTC |
| `last_read` | real | When the content was last read, epoch seconds, UTC; 0 when not read |
| `last_changed` | real | When the file last changed, epoch seconds, UTC |
| `meta` | string | JSON text of the discovery's metadata for the file |
| `project` | string | Part of the key. The project path the file belongs to. "" for a file that lies in a project folder, and for every file of a tool that keeps its files outside the project folders and has no project path |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### file_blobs

Content of tracked context files, memory versions and large session summaries, by hash. Text.

- Key: `project`, `node_id`, `hash`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `file_text` (default 365d)
- Written by: `file_inventory.py` (`sync`), only while text is kept, for files up to 512 KiB that are not sensitive; `session_facts.py` (`blobs`), only while text is kept, for the whole text of a large `session_digests` row and the before- and after-images of memory and instruction file changes (`file_write_events.before_hash`, `file_write_events.after_hash`; not for sensitive file names)

| column | type | meaning |
|---|---|---|
| `hash` | string | First 32 hex digits of the SHA-256 of the raw bytes. Joins `files.blob_hash` |
| `content` | string | The file content as UTF-8 text |
| `size_bytes` | long | Size of the raw bytes |
| `created_at` | real | When the blob was stored, epoch seconds, UTC |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### file_history

A row each time a tracked file has a new version: the file was first seen, its content changed, or, when no content was read (metadata capture, a large or sensitive file), its size or modification time changed. Also a row for each file a tool's checkpoint recorded.

- Key: `project`, `node_id`, `path`, `ts`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `queued`
- Retention class: `metrics` (default 365d)
- Written by: `file_inventory.py` (`sync`); `session_facts.py` (`write`), from `ingesters/call_facts.py`, for the files of each rewind point (`origin` `claude_file_history` or `copilot_rewind`)

| column | type | meaning |
|---|---|---|
| `path` | string | Absolute file path |
| `ts` | real | When the change was seen, epoch seconds, UTC; for a checkpoint's file, the checkpoint's time |
| `blob_hash` | string | Hash of the content; joins `file_blobs.hash`. "" when no content was read. A checkpoint's file keeps its content in `file_blobs` only for memory and instruction files (`mechanism` set); for others a Copilot hash is the file's hash with no stored content |
| `content_hash` | string | First 16 hex digits of the SHA-256 of the text. "" when no content was read |
| `size_bytes` | long | Size |
| `tokens` | long | Estimated tokens |
| `lines` | long | Line count |
| `project` | string | Part of the key. The project path of the file's row in `files` |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `session_id` | string | The session whose checkpoint recorded the file; "" for a scan row |
| `agent_id` | string | The subagent; "" for the main agent or a scan row |
| `source_event_id` | string | The rewind point's `context_events.message_id`; "" for a scan row |
| `origin` | string | Who wrote the row: `claude_file_history` (a Claude Code file-history backup), `copilot_rewind` (a Copilot rewind snapshot's preimage); "" for the file inventory's scan |
| `mechanism` | string | `file_write_events.mechanism` of the path; "" for other files and scan rows |
| `version` | long | Claude Code's backup version of the file; null when not reported |
| `state` | string | The tool's word for the version: `backup` (Claude Code kept a copy), `content` (Copilot), `absent` (the file did not exist before the message); "" for a scan row |
| `lines_added` | long | Lines added to the file since the rewind point (Copilot); null when not reported |
| `lines_removed` | long | Lines removed since the rewind point (Copilot); null when not reported |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### files_text

Defined for the text of tracked files. No current aictl code writes it.

- Key: `project`, `node_id`, `path`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `file_text` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `path` | string | meaning not established: no current aictl code writes this table |
| `content` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |

### file_history_text

Defined for the text of file history snapshots. No current aictl code writes it.

- Key: `project`, `node_id`, `path`, `ts`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `queued`
- Retention class: `file_text` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `path` | string | meaning not established: no current aictl code writes this table |
| `ts` | real | meaning not established: no current aictl code writes this table |
| `content` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

## Tables: OpenTelemetry

### OTELLogs

OpenTelemetry log records (events) of the tools, in the Collector's columns plus aictl's.

- Key: `project`, `node_id`, `RowKey`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `otel` (default 365d)
- Written by: `stores/kusto/otel_sink.py` (`OtelExportWriter`) through the store's writer, from OTLP exports the daemon receives; an external OpenTelemetry Collector may also write the table named `OTELLogs`

The first 9 columns are the Collector's, in its order and casing. The rest are aictl's; the Collector leaves them null.

| column | type | meaning |
|---|---|---|
| `Timestamp` | datetime | When the event occurred |
| `ObservedTimestamp` | datetime | When the event was observed |
| `TraceID` | string | Trace id, lowercase hex |
| `SpanID` | string | Span id, lowercase hex |
| `SeverityText` | string | Severity text as sent |
| `SeverityNumber` | int | OTLP severity number; INFO is 9 |
| `Body` | string | The log body as text; maps and arrays as JSON |
| `ResourceAttributes` | dynamic | Resource attributes |
| `LogsAttributes` | dynamic | Record attributes plus scope.name and scope.version |
| `EventName` | string | aictl: eventName, else attribute event.name, else attribute name |
| `SessionId` | string | aictl: the session: session.id, sessionId or session_id, else gen_ai.conversation.id |
| `Tool` | string | aictl: the tool id resolved from resource service.name |
| `Model` | string | aictl: attribute model, gen_ai.request.model or gen_ai.response.model |
| `MachineId` | string | aictl: resource host.id, else host.name, else the receiving host |
| `RowKey` | string | aictl: SHA-256 of the row identity; equal for a retried export |
| `node_id` | string | aictl: reporting daemon node, independent of the OTLP resource host |
| `EventSequence` | long | aictl: attribute event.sequence, the order of events in a session |
| `PromptId` | string | aictl: attribute prompt.id, shared by the events of one user prompt |
| `ConversationId` | string | aictl: attribute gen_ai.conversation.id, else conversation.id(*) (Codex) |
| `InputTokens` | long | aictl: input_tokens, gen_ai.usage.input_tokens or input_token_count(*) |
| `OutputTokens` | long | aictl: output_tokens, gen_ai.usage.output_tokens or output_token_count(*) |
| `CacheReadInputTokens` | long | aictl: cache_read_tokens, cache_read_input_tokens, gen_ai.usage.cache_read.input_tokens or cached_token_count(*) |
| `CacheWriteInputTokens` | long | aictl: cache_creation_tokens, cache_creation_input_tokens or gen_ai.usage.cache_write.input_tokens |
| `ReasoningOutputTokens` | long | aictl: gen_ai.usage.reasoning.output_tokens or reasoning_token_count(*) |
| `CostUsd` | real | aictl: attribute cost_usd (Claude Code api_request) |
| `DurationMs` | long | aictl: attribute duration_ms, rounded to whole milliseconds |
| `TimeToFirstTokenMs` | real | aictl: attribute ttft_ms(*) or time_to_first_token_ms(*) |
| `ToolName` | string | aictl: attribute tool_name, else gen_ai.tool.name |
| `ToolCallId` | string | aictl: tool_use_id(*), tool_call_id, call_id(*) (Codex) or gen_ai.tool.call.id |
| `McpServer` | string | aictl: MCP server: attribute mcp_server_name, mcp.server.name(*) or mcp_server(*), else mcp_server_name in tool_parameters (Claude Code with OTEL_LOG_TOOL_DETAILS(*)), else &lt;server&gt; of a tool name mcp__&lt;server&gt;__&lt;tool&gt; |
| `McpToolName` | string | aictl: MCP tool: attribute mcp_tool_name(*), else mcp_tool_name in tool_parameters(*), else &lt;tool&gt; of a tool name mcp__&lt;server&gt;__&lt;tool&gt; |
| `SkillName` | string | aictl: skill: attribute skill_name(*) or skill.name(*), else skill_name in tool_parameters (Claude Code Skill tool with OTEL_LOG_TOOL_DETAILS(*)) |
| `Success` | bool | aictl: attribute success; "true" and "false" strings are read |
| `Error` | string | aictl: attribute error, error.message(*) or error_message, cut at 1024 characters; with capture metadata only what the bag keeps (at most 256 characters) |
| `ErrorType` | string | aictl: attribute error.type or error_type |
| `StatusCode` | long | aictl: attribute status_code (Claude Code api_error) or http.response.status_code(*) |
| `Attempt` | long | aictl: attribute attempt, the retry number of an API call |
| `Decision` | string | aictl: attribute decision (tool_decision), else decision_type (tool_result) |
| `DecisionSource` | string | aictl: attribute decision_source, else attribute source when the record carries a decision (Claude Code tool_decision, code_edit_tool.decision) |
| `AgentId` | string | aictl: agent_id(*), agent.id(*) or gen_ai.agent.id(*) |
| `AgentName` | string | aictl: agent_name or gen_ai.agent.name |
| `AgentType` | string | aictl: agent_type, agent.type(*) or github.copilot.agent.type |
| `ParentAgentId` | string | aictl: parent_agent_id(*) or gen_ai.agent.parent_id(*) |
| `RequestId` | string | aictl: request_id(*), requestId or github.copilot.service_request_id: the provider's request id |
| `ResponseId` | string | aictl: gen_ai.response.id, response_id(*), message_id or message.id(*): the provider's response or message id, which a transcript names too |
| `FinishReason` | string | aictl: gen_ai.response.finish_reasons joined with commas, else finish_reason or stop_reason(*) |
| `PromptLength` | long | aictl: attribute prompt_length (user_prompt), in characters |
| `ToolInputChars` | long | aictl: characters of tool_parameters, tool_input(*), arguments(*) or gen_ai.tool.call.arguments(*); kept with capture metadata |
| `ToolResultBytes` | long | aictl: attribute tool_result_size_bytes (tool_result) |
| `Speed` | string | aictl: attribute speed (Claude Code api_request: fast or normal) |
| `AppVersion` | string | aictl: attribute app.version, else resource service.version |
| `TerminalType` | string | aictl: attribute terminal.type (Claude Code, Codex) |
| `OrganizationId` | string | aictl: attribute organization.id (Claude Code), as already kept in the bag |
| `UserAccountUuid` | string | aictl: attribute user.account_uuid (Claude Code), as already kept in the bag |
| `project` | string | Part of the key. Always "" for rows aictl writes; null for the collector's rows |
| `_v` | datetime | Version of the row, set by aictl's writer; null for the collector's rows |

### OTELMetrics

OpenTelemetry metric data points, in the Collector's columns plus aictl's.

- Key: `project`, `node_id`, `RowKey`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `otel` (default 365d)
- Written by: `stores/kusto/otel_sink.py` (`OtelExportWriter`) through the store's writer, from OTLP exports the daemon receives; an external OpenTelemetry Collector may also write the table named `OTELMetrics`

The first 9 columns are the Collector's, in its order and casing. The rest are aictl's; the Collector leaves them null.

| column | type | meaning |
|---|---|---|
| `Timestamp` | datetime | Time of the data point |
| `MetricName` | string | Metric name; _sum, _count, _bucket and quantile rows add a suffix |
| `MetricType` | string | Gauge, Sum, Histogram, ExponentialHistogram or Summary |
| `MetricUnit` | string | Unit of the metric |
| `MetricDescription` | string | Description of the metric |
| `MetricValue` | real | Value of the data point; null when not finite |
| `Host` | string | Resource host.name, else the receiving host |
| `ResourceAttributes` | dynamic | Resource attributes |
| `MetricAttributes` | dynamic | Data point attributes plus scope.name, scope.version, le and qt |
| `StartTime` | datetime | aictl: start of the aggregation interval; null when not sent |
| `Temporality` | string | aictl: Delta, Cumulative or empty |
| `Monotonic` | bool | aictl: whether a Sum is monotonic; null for other types |
| `SessionId` | string | aictl: the session: session.id, sessionId or session_id, else gen_ai.conversation.id |
| `Tool` | string | aictl: the tool id resolved from resource service.name |
| `Model` | string | aictl: attribute model, gen_ai.request.model or gen_ai.response.model |
| `MachineId` | string | aictl: resource host.id, else host.name, else the receiving host |
| `RowKey` | string | aictl: SHA-256 of the row identity; equal for a retried export |
| `node_id` | string | aictl: reporting daemon node, independent of the OTLP resource host |
| `Type` | string | aictl: attribute type: token type, lines added or removed, active time user or cli (Claude Code) |
| `TokenType` | string | aictl: gen_ai.token.type, else attribute type of a metric whose name has token |
| `OperationName` | string | aictl: attribute gen_ai.operation.name |
| `ProviderName` | string | aictl: attribute gen_ai.provider.name |
| `ToolName` | string | aictl: attribute tool_name, else gen_ai.tool.name |
| `McpServer` | string | aictl: MCP server: attribute mcp_server_name(*), else &lt;server&gt; of a ToolName mcp__&lt;server&gt;__&lt;tool&gt; |
| `Decision` | string | aictl: attribute decision (code_edit_tool.decision) |
| `DecisionSource` | string | aictl: attribute decision_source, else attribute source when the record carries a decision (Claude Code tool_decision, code_edit_tool.decision) |
| `Language` | string | aictl: attribute language (code_edit_tool.decision) |
| `AgentName` | string | aictl: gen_ai.agent.name or agent_name(*) |
| `Success` | bool | aictl: attribute success(*) |
| `ErrorType` | string | aictl: attribute error.type(*) |
| `AppVersion` | string | aictl: attribute app.version, else resource service.version |
| `TerminalType` | string | aictl: attribute terminal.type (Claude Code, Codex) |
| `OrganizationId` | string | aictl: attribute organization.id (Claude Code), as already kept in the bag |
| `UserAccountUuid` | string | aictl: attribute user.account_uuid (Claude Code), as already kept in the bag |
| `project` | string | Part of the key. Always "" for rows aictl writes; null for the collector's rows |
| `_v` | datetime | Version of the row, set by aictl's writer; null for the collector's rows |

### OTELTraces

OpenTelemetry spans, in the Collector's columns plus aictl's.

- Key: `project`, `node_id`, `RowKey`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `otel` (default 365d)
- Written by: `stores/kusto/otel_sink.py` (`OtelExportWriter`) through the store's writer, from OTLP exports the daemon receives; an external OpenTelemetry Collector may also write the table named `OTELTraces`

The first 13 columns are the Collector's, in its order and casing. The rest are aictl's; the Collector leaves them null.

| column | type | meaning |
|---|---|---|
| `TraceID` | string | Trace id, lowercase hex |
| `SpanID` | string | Span id, lowercase hex |
| `ParentID` | string | Parent span id; empty for a root span |
| `SpanName` | string | Span name |
| `SpanStatus` | string | STATUS_CODE_UNSET, STATUS_CODE_OK or STATUS_CODE_ERROR |
| `SpanKind` | string | SPAN_KIND_UNSPECIFIED, INTERNAL, SERVER, CLIENT, PRODUCER or CONSUMER |
| `StartTime` | datetime | Span start |
| `EndTime` | datetime | Span end |
| `ResourceAttributes` | dynamic | Resource attributes |
| `TraceAttributes` | dynamic | Span attributes plus scope.name and scope.version |
| `Events` | dynamic | Span events: EventName, Timestamp, EventAttributes |
| `Links` | dynamic | Span links: TraceID, SpanID, TraceState, SpanLinkAttributes |
| `SpanStatusMessage` | string | Status message |
| `DurationMs` | long | aictl: EndTime minus StartTime in milliseconds; null when a time is missing |
| `SessionId` | string | aictl: the session: session.id, sessionId or session_id, else gen_ai.conversation.id |
| `Tool` | string | aictl: the tool id resolved from resource service.name |
| `Model` | string | aictl: attribute model, gen_ai.request.model or gen_ai.response.model |
| `MachineId` | string | aictl: resource host.id, else host.name, else the receiving host |
| `RowKey` | string | aictl: SHA-256 of the row identity; equal for a retried export |
| `TurnId` | string | aictl: span attribute github.copilot.turn_id |
| `OperationName` | string | aictl: span attribute gen_ai.operation.name |
| `AgentName` | string | aictl: span attribute gen_ai.agent.name |
| `ToolName` | string | aictl: span attribute gen_ai.tool.name |
| `ToolCallId` | string | aictl: span attribute gen_ai.tool.call.id |
| `InputTokens` | long | aictl: reported gen_ai.usage.input_tokens; null when unknown |
| `OutputTokens` | long | aictl: reported gen_ai.usage.output_tokens; null when unknown |
| `CacheReadInputTokens` | long | aictl: reported gen_ai.usage.cache_read.input_tokens; null when unknown |
| `CacheWriteInputTokens` | long | aictl: reported gen_ai.usage.cache_write.input_tokens; null when unknown |
| `ReasoningOutputTokens` | long | aictl: reported gen_ai.usage.reasoning.output_tokens; null when unknown |
| `ReportedSkillNames` | string | aictl: newline-separated names from github.copilot.context.skills |
| `ReportedMcpServers` | string | aictl: newline-separated names from github.copilot.context.mcp_server_names |
| `ReportedContext` | dynamic | aictl: normalized arrays of reported skill and MCP server names |
| `node_id` | string | aictl: reporting daemon node, independent of the OTLP resource host |
| `ResponseId` | string | aictl: span attribute gen_ai.response.id |
| `RequestId` | string | aictl: github.copilot.service_request_id, else request_id(*) |
| `PreviousResponseId` | string | aictl: span attribute gen_ai.request.previous_response.id |
| `ConversationId` | string | aictl: span attribute gen_ai.conversation.id |
| `InteractionId` | string | aictl: span attribute github.copilot.interaction_id |
| `Initiator` | string | aictl: github.copilot.initiator: user or agent |
| `ProviderName` | string | aictl: gen_ai.provider.name, else gen_ai.system(*) |
| `ResponseModel` | string | aictl: span attribute gen_ai.response.model |
| `FinishReasons` | string | aictl: gen_ai.response.finish_reasons joined with commas |
| `ErrorType` | string | aictl: span attribute error.type(*) |
| `HttpStatusCode` | long | aictl: span attribute http.response.status_code(*) |
| `ToolType` | string | aictl: span attribute gen_ai.tool.type |
| `ToolInputChars` | long | aictl: characters of gen_ai.tool.call.arguments(*); kept with capture metadata |
| `ToolResultChars` | long | aictl: characters of gen_ai.tool.call.result(*); kept with capture metadata |
| `McpServer` | string | aictl: MCP server: span attribute mcp_server_name(*) or mcp.server.name(*), else &lt;server&gt; of a ToolName mcp__&lt;server&gt;__&lt;tool&gt; |
| `McpToolName` | string | aictl: MCP tool: span attribute mcp_tool_name(*), else &lt;tool&gt; of a ToolName mcp__&lt;server&gt;__&lt;tool&gt; |
| `SkillName` | string | aictl: span attribute skill_name(*) or skill.name(*) |
| `AgentId` | string | aictl: span attribute gen_ai.agent.id(*) |
| `ParentAgentId` | string | aictl: gen_ai.agent.parent_id(*) or parent_agent_id(*) |
| `AgentType` | string | aictl: span attribute github.copilot.agent.type |
| `CopilotCost` | real | aictl: github.copilot.cost, premium request units |
| `CopilotNanoAiu` | long | aictl: github.copilot.nano_aiu, AI units times 1e9 |
| `ServerDurationMs` | real | aictl: github.copilot.server_duration, milliseconds the service spent |
| `TimeToFirstChunkMs` | real | aictl: gen_ai.response.time_to_first_chunk (seconds) in milliseconds |
| `TurnCount` | long | aictl: span attribute github.copilot.turn_count |
| `ProcessExitCode` | long | aictl: span attribute process.exit.code (execute_tool) |
| `AppVersion` | string | aictl: attribute app.version, else resource service.version |
| `ReportedCustomAgentNames` | string | aictl: newline-separated names from github.copilot.context.custom_agent_names; null when not sent |
| `project` | string | Part of the key. Always "" for rows aictl writes; null for the collector's rows |
| `_v` | datetime | Version of the row, set by aictl's writer; null for the collector's rows |

### OTELPayloads

The text of OTel values too large for their row, in chunks.

- Key: `project`, `node_id`, `PayloadId`, `ChunkNo`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `otel` (default 365d)
- Written by: `stores/kusto/otel_sink.py` (`OtelExportWriter`) through the store's writer, from OTLP exports the daemon receives

| column | type | meaning |
|---|---|---|
| `Timestamp` | datetime | Time of the row the text came from |
| `PayloadId` | string | SHA-256 of the full text as UTF-8 |
| `ChunkNo` | int | Position of this chunk, from 0 |
| `ChunkCount` | int | Number of chunks of the text |
| `TotalBytes` | long | Size of the full text in UTF-8 bytes |
| `PayloadKind` | string | Attribute key the text came from, or body |
| `SourceTable` | string | Table of the row the text came from |
| `SourceRowKey` | string | RowKey of the row the text came from |
| `SourceField` | string | Column and key the text came from |
| `SessionId` | string | Session of the source row |
| `Tool` | string | Tool of the source row |
| `MachineId` | string | Machine of the source row |
| `Text` | string | This chunk of the text |
| `node_id` | string | aictl: reporting daemon node, independent of the OTLP resource host |
| `project` | string | Part of the key. Always "" for rows aictl writes; null for the collector's rows |
| `_v` | datetime | Version of the row, set by aictl's writer; null for the collector's rows |

## Tables: Registry, status and catalogs

### schema_version

The registry of the data layout: layout rows of every node, migration steps, the migration lock and the database record.

- Key: `project`, `node_id`, `version`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: management commands of `stores/kusto/schema.py` (`.set-or-append`) and `migrations.py`, at the start of a writing node

This is a real table shared by all nodes, not a function over node tables. Its rows are a log: several rows can share a key, so do not deduplicate it by its key. Read the latest layout row per node with `aictl_nodes()`.

| column | type | meaning |
|---|---|---|
| `version` | long | The layout version the row is about |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `compatible_since` | long | The oldest layout that can read data of this version |
| `aictl_version` | string | The aictl package version that wrote the row |
| `data_epoch` | string | The data epoch of the node: a new random id after a reset or a new start, kept across upgrades and migrations |
| `written_at` | datetime | Server time (`now()`) when the row was written |
| `kind` | string | `layout` (a node's layout row; with step `node_tables/lock`, the migration lock), `migration` (a migration step), `database` (the database record) |
| `step` | string | Empty on a plain layout row. The migration step name on a `migration` row; `node_tables/lock` on the lock row; `node_tables` on the database record |
| `detail` | string | On a layout row, how the data epoch began: `new`, `reset`, `migrate` or `upgrade`. On a migration row, the result; a finished step starts with `done` |

### data_quality_status

Current health of each data source, collector, ingester or sink.

- Key: `project`, `node_id`, `component`, `source`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `collection_status.py` (`record_data_quality`)

| column | type | meaning |
|---|---|---|
| `component` | string | The component |
| `source` | string | The source within the component; may be "" |
| `kind` | string | Kind of the component, as the caller gives it |
| `status` | string | Status, for example `ok` |
| `severity` | string | Severity, as the caller gives it |
| `message` | string | Message |
| `updated_at` | real | Time of the report, epoch seconds, UTC |
| `last_ok_at` | real | Last time the status was `ok`, epoch seconds, UTC |
| `count` | long | Number of reports so far |
| `detail` | string | JSON detail |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |
| `_deleted` | bool | Always false: this table takes no delete rows. Kept for older readers |

### datapoint_catalog

The catalog of dashboard data points, from `data/datapoint-catalog.yaml` and `data/datapoint-queries.yaml`.

- Key: `project`, `node_id`, `key`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: `collection_status.py` (`DatapointCatalog.sync`)

| column | type | meaning |
|---|---|---|
| `key` | string | Data point key |
| `label` | string | First line of the explanation, at most 120 characters |
| `tab` | string | Dashboard tab |
| `section` | string | Dashboard section |
| `explanation` | string | Explanation |
| `source_static` | string | The catalog's `source` |
| `source_type` | string | The catalog's `source_type` |
| `unit` | string | Unit |
| `update_freq` | string | Update frequency |
| `otel_metric` | string | OTel metric name |
| `dynamic_source` | long | 1 when the catalog marks a dynamic source |
| `source_dynamic` | string | JSON of the dynamic source, built at run time |
| `query` | string | The data point's query |
| `calc` | string | The data point's calculation |
| `updated_at` | real | When the row changed, epoch seconds, UTC |
| `project` | string | Part of the key. Always "" |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |
| `rowid` | long | Legacy alias set by the writer: a number from the SHA-256 of the key values other than `project`. The same for every version of a row |

### maintenance_state

Defined for maintenance cursors. No current aictl code writes it.

- Key: `project`, `node_id`, `key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `key` | string | meaning not established: no current aictl code writes this table |
| `value` | real | meaning not established: no current aictl code writes this table |
| `text` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### tools

Defined for the tools aictl knows. No current aictl code writes it.

- Key: `project`, `node_id`, `tool`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `tool` | string | meaning not established: no current aictl code writes this table |
| `vendor` | string | meaning not established: no current aictl code writes this table |
| `host` | string | meaning not established: no current aictl code writes this table |
| `display_name` | string | meaning not established: no current aictl code writes this table |
| `first_seen_at` | real | meaning not established: no current aictl code writes this table |
| `last_seen_at` | real | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### projects

Defined for the projects aictl knows. No current aictl code writes it.

- Key: `project`, `node_id`, `path`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `path` | string | meaning not established: no current aictl code writes this table |
| `name` | string | meaning not established: no current aictl code writes this table |
| `git_remote` | string | meaning not established: no current aictl code writes this table |
| `git_branch` | string | meaning not established: no current aictl code writes this table |
| `first_seen_at` | real | meaning not established: no current aictl code writes this table |
| `last_seen_at` | real | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### processes

Defined for AI tool processes. No current aictl code writes it.

- Key: `project`, `node_id`, `source_key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `pid` | long | meaning not established: no current aictl code writes this table |
| `tool` | string | meaning not established: no current aictl code writes this table |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `cwd` | string | meaning not established: no current aictl code writes this table |
| `cmdline` | string | meaning not established: no current aictl code writes this table |
| `ppid` | long | meaning not established: no current aictl code writes this table |
| `started_at` | real | meaning not established: no current aictl code writes this table |
| `ended_at` | real | meaning not established: no current aictl code writes this table |
| `exit_code` | long | meaning not established: no current aictl code writes this table |
| `source` | string | meaning not established: no current aictl code writes this table |
| `meta` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `source_key` | string | meaning not established: no current aictl code writes this table |

### tool_config

Defined for tool configuration values. No current aictl code writes it.

- Key: `project`, `node_id`, `ts`, `tool`, `project_path`, `key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `queued`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `ts` | real | meaning not established: no current aictl code writes this table |
| `tool` | string | meaning not established: no current aictl code writes this table |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `key` | string | meaning not established: no current aictl code writes this table |
| `value` | string | meaning not established: no current aictl code writes this table |
| `source` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### environment_vars

Defined for environment variables seen by tools. No current aictl code writes it.

- Key: `project`, `node_id`, `ts`, `project_path`, `tool`, `key`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `queued`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `ts` | real | meaning not established: no current aictl code writes this table |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `tool` | string | meaning not established: no current aictl code writes this table |
| `key` | string | meaning not established: no current aictl code writes this table |
| `value` | string | meaning not established: no current aictl code writes this table |
| `is_secret` | long | meaning not established: no current aictl code writes this table |
| `source` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### path_defs

Defined as a mirror of the path catalog CSV files. No current aictl code writes it.

- Key: `project`, `node_id`, `path_template`, `ai_tool`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `path_template` | string | meaning not established: no current aictl code writes this table |
| `ai_tool` | string | meaning not established: no current aictl code writes this table |
| `vendor` | string | meaning not established: no current aictl code writes this table |
| `host` | string | meaning not established: no current aictl code writes this table |
| `platform` | string | meaning not established: no current aictl code writes this table |
| `hidden` | long | meaning not established: no current aictl code writes this table |
| `scope` | string | meaning not established: no current aictl code writes this table |
| `category` | string | meaning not established: no current aictl code writes this table |
| `sent_to_llm` | string | meaning not established: no current aictl code writes this table |
| `approx_tokens` | string | meaning not established: no current aictl code writes this table |
| `read_write` | string | meaning not established: no current aictl code writes this table |
| `survives_compaction` | string | meaning not established: no current aictl code writes this table |
| `cacheable` | string | meaning not established: no current aictl code writes this table |
| `loaded_when` | string | meaning not established: no current aictl code writes this table |
| `path_args` | string | meaning not established: no current aictl code writes this table |
| `description` | string | meaning not established: no current aictl code writes this table |
| `resolution` | string | meaning not established: no current aictl code writes this table |
| `root_strategy` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |

### process_defs

Defined as a mirror of the process catalog CSV files. No current aictl code writes it.

- Key: `project`, `node_id`, `process_name`, `ai_tool`
- Version column: `_v`
- Tombstone column: `_deleted`
- Ingestion: `streaming`
- Retention class: `metrics` (default 365d)
- Written by: none in current code

| column | type | meaning |
|---|---|---|
| `process_name` | string | meaning not established: no current aictl code writes this table |
| `ai_tool` | string | meaning not established: no current aictl code writes this table |
| `vendor` | string | meaning not established: no current aictl code writes this table |
| `host` | string | meaning not established: no current aictl code writes this table |
| `process_type` | string | meaning not established: no current aictl code writes this table |
| `runtime` | string | meaning not established: no current aictl code writes this table |
| `parent_process` | string | meaning not established: no current aictl code writes this table |
| `starts_at` | string | meaning not established: no current aictl code writes this table |
| `stops_at` | string | meaning not established: no current aictl code writes this table |
| `is_daemon` | long | meaning not established: no current aictl code writes this table |
| `auto_start` | long | meaning not established: no current aictl code writes this table |
| `listens_port` | string | meaning not established: no current aictl code writes this table |
| `outbound_targets` | string | meaning not established: no current aictl code writes this table |
| `memory_idle_mb` | string | meaning not established: no current aictl code writes this table |
| `memory_active_mb` | string | meaning not established: no current aictl code writes this table |
| `known_leak` | long | meaning not established: no current aictl code writes this table |
| `leak_pattern` | string | meaning not established: no current aictl code writes this table |
| `zombie_risk` | string | meaning not established: no current aictl code writes this table |
| `cleanup_command` | string | meaning not established: no current aictl code writes this table |
| `ps_grep_pattern` | string | meaning not established: no current aictl code writes this table |
| `platform` | string | meaning not established: no current aictl code writes this table |
| `description` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
| `_deleted` | bool | Tombstone flag: true on a delete row, which carries only the key columns |

## Tables: Observation tables of an older aictl

### requests_observations

Observation rows of `requests` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `dedup_key` | string | meaning not established: no current aictl code writes this table; `requests.dedup_key` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `requests.ts` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `requests.session_id` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `requests.agent_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `requests.tool` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `requests.project_path` has the same name |
| `pid` | long | meaning not established: no current aictl code writes this table; `requests.pid` has the same name |
| `model` | string | meaning not established: no current aictl code writes this table; `requests.model` has the same name |
| `input_tokens` | long | meaning not established: no current aictl code writes this table; `requests.input_tokens` has the same name |
| `output_tokens` | long | meaning not established: no current aictl code writes this table; `requests.output_tokens` has the same name |
| `cache_read_tokens` | long | meaning not established: no current aictl code writes this table; `requests.cache_read_tokens` has the same name |
| `cache_creation_tokens` | long | meaning not established: no current aictl code writes this table; `requests.cache_creation_tokens` has the same name |
| `cost_usd` | real | meaning not established: no current aictl code writes this table; `requests.cost_usd` has the same name |
| `duration_ms` | real | meaning not established: no current aictl code writes this table; `requests.duration_ms` has the same name |
| `finish_reason` | string | meaning not established: no current aictl code writes this table; `requests.finish_reason` has the same name |
| `is_error` | long | meaning not established: no current aictl code writes this table; `requests.is_error` has the same name |
| `error_type` | string | meaning not established: no current aictl code writes this table; `requests.error_type` has the same name |
| `http_status` | long | meaning not established: no current aictl code writes this table; `requests.http_status` has the same name |
| `source` | string | meaning not established: no current aictl code writes this table; `requests.source` has the same name |
| `prompt_id` | string | meaning not established: no current aictl code writes this table; `requests.prompt_id` has the same name |
| `ttft_ms` | real | meaning not established: no current aictl code writes this table; `requests.ttft_ms` has the same name |
| `tool_tokens` | long | meaning not established: no current aictl code writes this table; `requests.tool_tokens` has the same name |
| `max_prompt_tokens` | long | meaning not established: no current aictl code writes this table; `requests.max_prompt_tokens` has the same name |
| `request_bytes` | long | meaning not established: no current aictl code writes this table; `requests.request_bytes` has the same name |
| `available_tools` | long | meaning not established: no current aictl code writes this table; `requests.available_tools` has the same name |
| `source_ts` | real | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### tool_invocations_observations

Observation rows of `tool_invocations` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `dedup_key` | string | meaning not established: no current aictl code writes this table; `tool_invocations.dedup_key` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `tool_invocations.ts` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `tool_invocations.session_id` has the same name |
| `request_id` | long | meaning not established: no current aictl code writes this table; `tool_invocations.request_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `tool_invocations.tool` has the same name |
| `tool_name` | string | meaning not established: no current aictl code writes this table; `tool_invocations.tool_name` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `tool_invocations.project_path` has the same name |
| `pid` | long | meaning not established: no current aictl code writes this table; `tool_invocations.pid` has the same name |
| `is_error` | long | meaning not established: no current aictl code writes this table; `tool_invocations.is_error` has the same name |
| `duration_ms` | real | meaning not established: no current aictl code writes this table; `tool_invocations.duration_ms` has the same name |
| `source` | string | meaning not established: no current aictl code writes this table; `tool_invocations.source` has the same name |
| `source_event_id` | string | meaning not established: no current aictl code writes this table; `tool_invocations.source_event_id` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `tool_invocations.agent_id` has the same name |
| `confirm` | string | meaning not established: no current aictl code writes this table; `tool_invocations.confirm` has the same name |
| `confirm_wait_ms` | real | meaning not established: no current aictl code writes this table; `tool_invocations.confirm_wait_ms` has the same name |
| `exit_code` | long | meaning not established: no current aictl code writes this table; `tool_invocations.exit_code` has the same name |
| `input_bytes` | long | meaning not established: no current aictl code writes this table; `tool_invocations.input_bytes` has the same name |
| `output_bytes` | long | meaning not established: no current aictl code writes this table; `tool_invocations.output_bytes` has the same name |
| `source_ts` | real | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### sessions_observations

Observation rows of `sessions` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `session_id` | string | meaning not established: no current aictl code writes this table; `sessions.session_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `sessions.tool` has the same name |
| `pid` | long | meaning not established: no current aictl code writes this table; `sessions.pid` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `sessions.project_path` has the same name |
| `model` | string | meaning not established: no current aictl code writes this table; `sessions.model` has the same name |
| `git_branch` | string | meaning not established: no current aictl code writes this table; `sessions.git_branch` has the same name |
| `git_commit` | string | meaning not established: no current aictl code writes this table; `sessions.git_commit` has the same name |
| `started_at` | real | meaning not established: no current aictl code writes this table; `sessions.started_at` has the same name |
| `ended_at` | real | meaning not established: no current aictl code writes this table; `sessions.ended_at` has the same name |
| `source` | string | meaning not established: no current aictl code writes this table; `sessions.source` has the same name |
| `input_tokens` | long | meaning not established: no current aictl code writes this table; `sessions.input_tokens` has the same name |
| `output_tokens` | long | meaning not established: no current aictl code writes this table; `sessions.output_tokens` has the same name |
| `cache_read_tokens` | long | meaning not established: no current aictl code writes this table; `sessions.cache_read_tokens` has the same name |
| `cache_creation_tokens` | long | meaning not established: no current aictl code writes this table; `sessions.cache_creation_tokens` has the same name |
| `cost_usd` | real | meaning not established: no current aictl code writes this table; `sessions.cost_usd` has the same name |
| `request_count` | long | meaning not established: no current aictl code writes this table; `sessions.request_count` has the same name |
| `tool_call_count` | long | meaning not established: no current aictl code writes this table; `sessions.tool_call_count` has the same name |
| `files_modified` | long | meaning not established: no current aictl code writes this table; `sessions.files_modified` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### agents_observations

Observation rows of `agents` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `agent_id` | string | meaning not established: no current aictl code writes this table; `agents.agent_id` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `agents.session_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `agents.tool` has the same name |
| `model` | string | meaning not established: no current aictl code writes this table; `agents.model` has the same name |
| `is_sidechain` | long | meaning not established: no current aictl code writes this table; `agents.is_sidechain` has the same name |
| `started_at` | real | meaning not established: no current aictl code writes this table; `agents.started_at` has the same name |
| `ended_at` | real | meaning not established: no current aictl code writes this table; `agents.ended_at` has the same name |
| `completed` | long | meaning not established: no current aictl code writes this table; `agents.completed` has the same name |
| `input_tokens` | long | meaning not established: no current aictl code writes this table; `agents.input_tokens` has the same name |
| `output_tokens` | long | meaning not established: no current aictl code writes this table; `agents.output_tokens` has the same name |
| `cache_read_tokens` | long | meaning not established: no current aictl code writes this table; `agents.cache_read_tokens` has the same name |
| `cache_creation_tokens` | long | meaning not established: no current aictl code writes this table; `agents.cache_creation_tokens` has the same name |
| `cost_usd` | real | meaning not established: no current aictl code writes this table; `agents.cost_usd` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_usage_observations

Observation rows of `session_usage` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `session_id` | string | meaning not established: no current aictl code writes this table; `session_usage.session_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `session_usage.tool` has the same name |
| `source` | string | meaning not established: no current aictl code writes this table; `session_usage.source` has the same name |
| `quality` | string | meaning not established: no current aictl code writes this table; `session_usage.quality` has the same name |
| `quality_reason` | string | meaning not established: no current aictl code writes this table; `session_usage.quality_reason` has the same name |
| `model` | string | meaning not established: no current aictl code writes this table; `session_usage.model` has the same name |
| `models_json` | string | meaning not established: no current aictl code writes this table; `session_usage.models_json` has the same name |
| `daily_json` | string | meaning not established: no current aictl code writes this table; `session_usage.daily_json` has the same name |
| `input_tokens` | long | meaning not established: no current aictl code writes this table; `session_usage.input_tokens` has the same name |
| `output_tokens` | long | meaning not established: no current aictl code writes this table; `session_usage.output_tokens` has the same name |
| `cache_read_tokens` | long | meaning not established: no current aictl code writes this table; `session_usage.cache_read_tokens` has the same name |
| `cache_creation_tokens` | long | meaning not established: no current aictl code writes this table; `session_usage.cache_creation_tokens` has the same name |
| `request_count` | long | meaning not established: no current aictl code writes this table; `session_usage.request_count` has the same name |
| `tool_call_count` | long | meaning not established: no current aictl code writes this table; `session_usage.tool_call_count` has the same name |
| `turn_count` | long | meaning not established: no current aictl code writes this table; `session_usage.turn_count` has the same name |
| `cost_usd` | real | meaning not established: no current aictl code writes this table; `session_usage.cost_usd` has the same name |
| `cost_quality` | string | meaning not established: no current aictl code writes this table; `session_usage.cost_quality` has the same name |
| `cost_reason` | string | meaning not established: no current aictl code writes this table; `session_usage.cost_reason` has the same name |
| `unpriced_models` | string | meaning not established: no current aictl code writes this table; `session_usage.unpriced_models` has the same name |
| `billing_unit` | string | meaning not established: no current aictl code writes this table; `session_usage.billing_unit` has the same name |
| `billing_amount` | real | meaning not established: no current aictl code writes this table; `session_usage.billing_amount` has the same name |
| `premium_requests` | real | meaning not established: no current aictl code writes this table; `session_usage.premium_requests` has the same name |
| `estimated_list_usd` | real | meaning not established: no current aictl code writes this table; `session_usage.estimated_list_usd` has the same name |
| `started_at` | real | meaning not established: no current aictl code writes this table; `session_usage.started_at` has the same name |
| `last_activity_at` | real | meaning not established: no current aictl code writes this table; `session_usage.last_activity_at` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `session_usage.project_path` has the same name |
| `updated_at` | real | meaning not established: no current aictl code writes this table; `session_usage.updated_at` has the same name |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_processes_observations

Observation rows of `session_processes` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `session_id` | string | meaning not established: no current aictl code writes this table; `session_processes.session_id` has the same name |
| `pid` | long | meaning not established: no current aictl code writes this table; `session_processes.pid` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `session_processes.tool` has the same name |
| `joined_at` | real | meaning not established: no current aictl code writes this table; `session_processes.joined_at` has the same name |
| `role` | string | meaning not established: no current aictl code writes this table; `session_processes.role` has the same name |
| `trace_id` | string | meaning not established: no current aictl code writes this table |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_prompts_observations

Observation rows of `session_prompts` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `prompt` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `dedup_key` | string | meaning not established: no current aictl code writes this table; `session_prompts.dedup_key` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `session_prompts.ts` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `session_prompts.session_id` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `session_prompts.agent_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `session_prompts.tool` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `session_prompts.project_path` has the same name |
| `text` | string | meaning not established: no current aictl code writes this table; `session_prompts.text` has the same name |
| `prompt_file` | string | meaning not established: no current aictl code writes this table; `session_prompts.prompt_file` has the same name |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### skill_uses_observations

Observation rows of `skill_uses` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `dedup_key` | string | meaning not established: no current aictl code writes this table; `skill_uses.dedup_key` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `skill_uses.ts` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `skill_uses.session_id` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `skill_uses.agent_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `skill_uses.tool` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `skill_uses.project_path` has the same name |
| `name` | string | meaning not established: no current aictl code writes this table; `skill_uses.name` has the same name |
| `trigger` | string | meaning not established: no current aictl code writes this table; `skill_uses.trigger` has the same name |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### file_write_events_observations

Observation rows of `file_write_events` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `dedup_key` | string | meaning not established: no current aictl code writes this table; `file_write_events.dedup_key` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `file_write_events.ts` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `file_write_events.session_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `file_write_events.tool` has the same name |
| `tool_name` | string | meaning not established: no current aictl code writes this table; `file_write_events.tool_name` has the same name |
| `operation` | string | meaning not established: no current aictl code writes this table; `file_write_events.operation` has the same name |
| `path` | string | meaning not established: no current aictl code writes this table; `file_write_events.path` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table; `file_write_events.project_path` has the same name |
| `pid` | long | meaning not established: no current aictl code writes this table; `file_write_events.pid` has the same name |
| `source_event_kind` | string | meaning not established: no current aictl code writes this table; `file_write_events.source_event_kind` has the same name |
| `source_event_id` | string | meaning not established: no current aictl code writes this table; `file_write_events.source_event_id` has the same name |
| `content_hash` | string | meaning not established: no current aictl code writes this table; `file_write_events.content_hash` has the same name |
| `size_bytes` | long | meaning not established: no current aictl code writes this table; `file_write_events.size_bytes` has the same name |
| `detail` | string | meaning not established: no current aictl code writes this table; `file_write_events.detail` has the same name |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### context_events_observations

Observation rows of `context_events` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `id` | long | meaning not established: no current aictl code writes this table |
| `dedup_key` | string | meaning not established: no current aictl code writes this table; `context_events.dedup_key` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `context_events.ts` has the same name |
| `session_id` | string | meaning not established: no current aictl code writes this table; `context_events.session_id` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `context_events.agent_id` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `context_events.tool` has the same name |
| `kind` | string | meaning not established: no current aictl code writes this table; `context_events.kind` has the same name |
| `trigger` | string | meaning not established: no current aictl code writes this table; `context_events.trigger` has the same name |
| `before_tokens` | long | meaning not established: no current aictl code writes this table; `context_events.before_tokens` has the same name |
| `after_tokens` | long | meaning not established: no current aictl code writes this table; `context_events.after_tokens` has the same name |
| `duration_ms` | real | meaning not established: no current aictl code writes this table; `context_events.duration_ms` has the same name |
| `current_tokens` | long | meaning not established: no current aictl code writes this table; `context_events.current_tokens` has the same name |
| `system_tokens` | long | meaning not established: no current aictl code writes this table; `context_events.system_tokens` has the same name |
| `conversation_tokens` | long | meaning not established: no current aictl code writes this table; `context_events.conversation_tokens` has the same name |
| `tool_tokens` | long | meaning not established: no current aictl code writes this table; `context_events.tool_tokens` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_loaded_files_observations

Observation rows of `session_loaded_files` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `session_id` | string | meaning not established: no current aictl code writes this table; `session_loaded_files.session_id` has the same name |
| `path` | string | meaning not established: no current aictl code writes this table; `session_loaded_files.path` has the same name |
| `how` | string | meaning not established: no current aictl code writes this table; `session_loaded_files.how` has the same name |
| `detail` | string | meaning not established: no current aictl code writes this table; `session_loaded_files.detail` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `session_loaded_files.ts` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `session_loaded_files.tool` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `session_loaded_files.agent_id` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### session_context_items_observations

Observation rows of `session_context_items` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `history` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `session_id` | string | meaning not established: no current aictl code writes this table; `session_context_items.session_id` has the same name |
| `agent_id` | string | meaning not established: no current aictl code writes this table; `session_context_items.agent_id` has the same name |
| `kind` | string | meaning not established: no current aictl code writes this table; `session_context_items.kind` has the same name |
| `name` | string | meaning not established: no current aictl code writes this table; `session_context_items.name` has the same name |
| `ts` | real | meaning not established: no current aictl code writes this table; `session_context_items.ts` has the same name |
| `path` | string | meaning not established: no current aictl code writes this table; `session_context_items.path` has the same name |
| `chars` | long | meaning not established: no current aictl code writes this table; `session_context_items.chars` has the same name |
| `tokens` | long | meaning not established: no current aictl code writes this table; `session_context_items.tokens` has the same name |
| `estimated` | long | meaning not established: no current aictl code writes this table; `session_context_items.estimated` has the same name |
| `removed` | long | meaning not established: no current aictl code writes this table; `session_context_items.removed` has the same name |
| `tool` | string | meaning not established: no current aictl code writes this table; `session_context_items.tool` has the same name |
| `project_path` | string | meaning not established: no current aictl code writes this table |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `observation_source` | string | meaning not established: no current aictl code writes this table |
| `source_entity_id` | string | meaning not established: no current aictl code writes this table |
| `producer_id` | string | meaning not established: no current aictl code writes this table |
| `source_revision` | long | meaning not established: no current aictl code writes this table |
| `event_time` | datetime | meaning not established: no current aictl code writes this table |
| `received_time` | datetime | meaning not established: no current aictl code writes this table |
| `retention_ts` | real | meaning not established: no current aictl code writes this table |
| `presence` | string | meaning not established: no current aictl code writes this table |
| `source_presence_known` | bool | meaning not established: no current aictl code writes this table |
| `serialized_fields` | string | meaning not established: no current aictl code writes this table |
| `observation_operation` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### tool_invocations_observations_text

Observation rows of `tool_invocations` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `tool_content` (default 24h)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `input` | string | meaning not established: no current aictl code writes this table; `tool_invocations_text.input` has the same name |
| `result_summary` | string | meaning not established: no current aictl code writes this table; `tool_invocations_text.result_summary` has the same name |
| `target` | string | meaning not established: no current aictl code writes this table; `tool_invocations_text.target` has the same name |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |

### agents_observations_text

Observation rows of `agents` from an older aictl. No current aictl code writes it.

- Key: `project`, `node_id`, `observation_id`
- Version column: `_v`
- Tombstone column: none
- Ingestion: `streaming`
- Retention class: `text` (default 365d)
- Written by: none in current code

A node creates this table only when the database already has it. Its stored function is dropped when no node has the table. Reports count a database that has any `*_observations` table as holding unresolved facts.

| column | type | meaning |
|---|---|---|
| `task` | string | meaning not established: no current aictl code writes this table; `agents_text.task` has the same name |
| `observation_id` | string | meaning not established: no current aictl code writes this table |
| `project` | string | Part of the key. No current writer sets it |
| `node_id` | string | Part of the key. The node that wrote the row. Set by the writer |
| `_v` | datetime | Version of the row: the UTC time the writer made it, strictly increasing per writer process. The current row of a key has the largest `_v` |
