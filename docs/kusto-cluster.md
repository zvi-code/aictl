# Using a remote Kusto cluster as the store

SQLite is the default backend and needs no setup. Kusto (Azure Data Explorer, or a Fabric Eventhouse) is the alternative backend: the history lives in a Kusto database instead of the SQLite file. Every table becomes a table of that database, the daemon serves entirely from it, and nothing is written to `~/.config/aictl/history.db`. An existing SQLite history is not moved.

## 1. Get a cluster and create the database

You provide the cluster and an empty database; aictl owns everything inside the database (the tables, their policies, the information schema) and creates it all on the first start. It does not create the database itself: on Azure Data Explorer a database is an Azure resource, on Fabric it belongs to the Eventhouse. The database name is `kusto_database`, `aictl` by default. Any of these works; pick the cheapest you have access to.

**A local emulator**, free, for trying it out (needs Docker; on an Apple Silicon Mac the `--platform` flag is required):

```bash
docker run --platform linux/amd64 -e ACCEPT_EULA=Y -m 4G -d --name kustainer -p 8080:8080 mcr.microsoft.com/azuredataexplorer/kustainer-linux:latest
```

```bash
curl -s -X POST http://localhost:8080/v1/rest/mgmt -H "Content-Type: application/json" -d '{"csl":".create database aictl volatile"}'
```

The second command creates the database in memory (`volatile`): it is gone when the container stops. To keep it across restarts, mount a folder into the container and create the database as `persist`, naming a metadata folder and a data folder under the mount:

```bash
docker run --platform linux/amd64 -e ACCEPT_EULA=Y -m 4G -d --name kustainer -p 8080:8080 -v "$HOME/kustodata:/kustodata" mcr.microsoft.com/azuredataexplorer/kustainer-linux:latest
```

```bash
curl -s -X POST http://localhost:8080/v1/rest/mgmt -H "Content-Type: application/json" -d '{"csl":".create database aictl persist (@\"/kustodata/dbs/aictl/md\", @\"/kustodata/dbs/aictl/data\")"}'
```

In a KQL client the command is `.create database aictl persist (@"/kustodata/dbs/aictl/md", @"/kustodata/dbs/aictl/data")`. The two arguments are a **metadata folder** and a **data folder**, both paths inside the container, and that is all the provisioning there is: mount one host folder at `/kustodata` (the `-v` flag above; on Windows `-v "%USERPROFILE%\kustodata:/kustodata"`), and the command creates the two folders under it. Use a separate pair of folders per database. The host folder is where the data lives; back it up or delete it as you would a SQLite file. After the container is recreated, `.attach database aictl from @"/kustodata/dbs/aictl/md"` brings the database back from those folders. There are no storage containers to provision: that is the emulator's own on-disk format, not Azure Storage. (On an Azure Data Explorer cluster the database's storage is managed by the service and `.create database` is not used; `az kusto database create` is the whole provisioning.) The cluster URL is then `http://localhost:8080`, no sign-in. The emulator has no streaming ingestion; aictl uses `.ingest inline` there on its own.

**An Azure Data Explorer cluster** in your subscription. The dev tier costs about 0.12 USD per hour while running (auto-stop pauses it after days without use), so delete it when done:

```bash
az login
```

```bash
az provider register -n Microsoft.Kusto --wait
```

```bash
az group create -n rg-aictl -l westeurope
```

```bash
az kusto cluster create --cluster-name <name> --resource-group rg-aictl --location westeurope --sku name="Dev(No SLA)_Standard_E2a_v4" tier="Basic" capacity=1 --enable-streaming-ingest true --enable-auto-stop true
```

```bash
az kusto database create --cluster-name <name> --resource-group rg-aictl --database-name aictl --read-write-database soft-delete-period=P30D hot-cache-period=P7D location=westeurope
```

The last command creates the database; run it again with another `--database-name` for a second aictl database on the same cluster. The cluster URL is `https://<name>.westeurope.kusto.windows.net`. The default uses queued ingestion and inline state-table writes; neither requires streaming ingestion. The streaming flag above is optional unless you select streaming for a table; aictl then enables the database policy so tables inherit it. To remove everything afterwards: `az group delete -n rg-aictl --yes`.

**A Microsoft Fabric Eventhouse.** Create an Eventhouse in a Fabric workspace (the account needs a Fabric license or trial and the workspace a capacity), open its KQL database and copy the query URI (`https://<id>.kusto.fabric.microsoft.com`). Fabric has streaming ingestion on by default.

## 2. Access to a remote cluster: identities, roles and endpoints

aictl creates the tables and sets policies, so the identity it runs as needs the **Database Admin** role on that database; Ingestor plus Viewer is enough once the tables exist. Grant a role with a management command on the database, for example from the Kusto web UI or `aictl`'s own connection:

```
.add database ['aictl'] admins ('aaduser=someone@contoso.com')
```

Things that trip people up on a remote cluster:

- **One person, two principals.** An Azure AD user (`aaduser=<object id>;<tenant>`) and the same person's personal Microsoft account (`msauser=name@outlook.com`) are different principals to Kusto. `az login` normally gives the Azure AD one; the Kusto web UI signs a personal account in as `msauser=...` unless its directory is switched to the cluster's tenant. Grant the one you actually use, or both.
- **Creating the cluster grants nothing by itself.** Azure Resource Manager roles (Owner, Contributor) do not give data-plane access. Add a principal assignment (`az kusto cluster-principal-assignment create ... --role AllDatabasesAdmin`) or a database role as above.
- **Two URLs.** `https://<name>.<region>.kusto.windows.net` is the engine: queries, management commands, inline ingestion and streaming ingestion. `https://ingest-<name>.<region>.kusto.windows.net` is the Data Management (DM) endpoint, for queued ingestion. `kusto_cluster` takes either: aictl derives the engine URL for reads and synchronous writes and the ingestion URL for queued writes. Passing the `ingest-` URL alone does not force every table to use queued ingestion; the mode settings below decide that.
- **Tenant and MFA.** If the tenant requires multi-factor authentication, `az login --tenant <tenant id> --scope "https://<cluster host>/.default"` refreshes the sign-in aictl uses.
- **Firewalls.** The cluster must be reachable on port 443 from the machine running the daemon; a cluster with a private endpoint or an IP allow list needs that machine's address allowed. Queued ingestion also needs access to the Azure Storage blob and queue endpoints supplied by DM.
- **Capacity.** A `Dev(No SLA)` cluster has one ingestion slot and a small cache. Streaming ingestion does not take that slot. An `.ingest inline` command does: aictl reads the cluster's capacity once (`.show capacity ingestions`) and sends at most that many inline commands at a time, so they wait in the daemon instead of being refused. Queued sources are batched and scheduled by DM. A saturated cluster can answer HTTP 429; inline and streaming requests receive bounded retries.

## 3. Install the Kusto extra

`pipx install "aictl[all]"` includes it; otherwise `pipx inject aictl azure-kusto-data azure-kusto-ingest sqlglot`.

## 4. Sign in and point aictl at the cluster

Sign-in is the Azure CLI's by default, so run `az login` once (with `--scope "https://<cluster host>/.default"` if your tenant asks for multi-factor authentication again). Then either set the cluster in aictl's config file, which is `~/.config/aictl/config.toml` on macOS and Linux and `%APPDATA%\aictl\config.toml` on Windows (`aictl config show` prints the path in use, `aictl config init` creates the file):

```toml
[storage]
kusto_cluster = "https://<name>.westeurope.kusto.windows.net"
kusto_database = "aictl"
kusto_auth = "auto"   # azcli | device | managed-identity | none (emulator)
```

or pass it on the command line, which also works for a one-off run:

```bash
aictl daemon serve --kusto-cluster https://<name>.westeurope.kusto.windows.net --kusto-database aictl
```

The start prints `history store: kusto://<host>/aictl (Kusto, azcli auth; no SQLite file)`. The first start creates the 48 tables, enables streaming ingestion on the database if any table uses it, writes `aictl_information_schema`, which describes every column, and, when a table streams, clears the engine's streaming-ingestion schema cache (`.clear database cache streamingingestion schema`) so the new tables take rows at once; `aictl db schema` prints the same. The streaming policy is set on the database and every table inherits it, so `.show table T policy streamingingestion` shows null for a table that streams. Later starts compare the database's schema with the code's and change only what differs.

### Global ingestion mode and per-table overrides

The global `kusto_ingestion` setting accepts:

| Mode | Behavior |
| --- | --- |
| `auto` (default) | Queued ingestion on a remote cluster, with inline writes for the state/configuration tables listed below. All tables use inline on the local emulator. |
| `queued` | Upload sources and enqueue them through DM. DM batches and ingests them asynchronously. Not supported by the emulator. |
| `streaming` | Use the streaming-ingestion API and RowStore. Not supported by the emulator. |
| `inline` | Use synchronous `.ingest inline` management commands, without the streaming-ingestion/RowStore path. |

**Queued means submitted, not yet readable.** A successful queued `commit()` confirms that the SDK uploaded the source and enqueued it, not that DM finished ingestion. Ordinary reads can lag behind writes. aictl leaves the database/table batching policy unchanged, does not request `flushImmediately`, and does not add per-source ingestion tags that would separate otherwise compatible batches. The 16 MB client upload target bounds source size, not DM's final batch size; an individual larger row is sent alone.

**Inline and streaming are synchronous.** Inline avoids RowStore and is suitable for small development/test writes or state/configuration that is read immediately. It consumes ingestion-command capacity and can create many small extents; it is not queued ingestion and is not the sustained-telemetry path. For a state table with high write volume, streaming is the synchronous alternative when streaming ingestion is healthy.

The automatic profile keeps these tables inline because startup, updates or conflict checks use their current state:

| Group | Tables |
| --- | --- |
| Configuration and maintenance | `schema_version`, `maintenance_state`, `data_quality_status`, `path_defs`, `process_defs`, `datapoint_catalog` |
| Sessions and their related state | `tools`, `projects`, `processes`, `sessions`, `session_processes`, `session_commits`, `agents`, `requests`, `context_events`, `tool_invocations`, `session_prompts`, `skill_uses`, `session_usage` |
| Files and context | `file_blobs`, `files`, `file_write_events`, `session_folders`, `session_artifacts`, `session_loaded_files`, `session_context_items`, `memory_snapshots` |
| Dashboard configuration | `ui_dashboard`, `ui_section`, `ui_widget`, `ui_tab`, `ui_group_by_option`, `ui_datasource`, `ui_widget_datasource`, `ui_preference`, `ui_theme` |
| Tool message state | `cursor_session_messages`, `copilot_session_messages`, `vscode_chat_messages` |

Other history tables, such as `events`, `metrics` and `samples`, and the four raw OpenTelemetry tables use queued ingestion in remote `auto` mode. This automatic inline list applies **only to `auto`**. An explicit global `queued`, `streaming` or `inline` applies to every table unless a per-table override replaces it.

A commit sends streaming tables concurrently, with four workers, and sends inline commands and queued submissions in its foreground loop. A failed submission leaves that table's buffered rows for a later commit; an acknowledged queued submission leaves the buffer without waiting for ingestion. Multi-request failures or ambiguous network failures can cause duplicate submissions on retry; this is not exactly-once delivery.

Earlier measurements on a `Dev(No SLA)` cluster compared explicit streaming and inline modes: a first start stored 66,000 rows in 140 s with streaming and 21,000 with inline. These are not measurements of queued ingestion or the automatic mixed profile. In those synchronous paths, `.ingest inline` cut a single string longer than 1,048,576 characters at that length, where streaming stored it whole. The shared serializer replaces half of a surrogate pair with U+FFFD before sending any mode. NUL and other control characters are sent unchanged.

Set a global default and override individual history tables in `config.toml`:

```toml
[storage]
kusto_cluster = "https://ingest-<name>.<region>.kusto.windows.net"
kusto_database = "aictl"
kusto_ingestion = "auto"

[storage.kusto_table_ingestion]
path_defs = "inline"
sessions = "streaming"
```

Here, telemetry stays queued, `sessions` explicitly uses streaming, and `path_defs` explicitly stays inline (already its automatic choice). To use queued ingestion for **every** table except `path_defs`, set `kusto_ingestion = "queued"` and keep only `path_defs = "inline"`; state-table operations can then wait for DM as described below. To retain the former all-streaming default, select `kusto_ingestion = "streaming"` explicitly.

Table overrides accept `queued`, `streaming` or `inline`, not `auto`. The four OpenTelemetry tables (`OTELLogs`, `OTELMetrics`, `OTELTraces`, `OTELPayloads`) take overrides the same way. Any unknown table name or invalid mode is an error, not an ignored setting.

The equivalent command-line options are:

```bash
aictl daemon serve --kusto-cluster https://ingest-<name>.<region>.kusto.windows.net --kusto-database aictl --kusto-ingestion auto --kusto-table-ingestion path_defs=inline --kusto-table-ingestion sessions=streaming
```

Or select queued globally and inline for `path_defs`:

```bash
aictl daemon serve --kusto-cluster https://ingest-<name>.<region>.kusto.windows.net --kusto-database aictl --kusto-ingestion queued --kusto-table-ingestion path_defs=inline
```

Repeat `--kusto-table-ingestion TABLE=MODE` for additional tables. For environment-based configuration, use `AICTL_KUSTO_INGESTION` for the default and `AICTL_KUSTO_TABLE_INGESTION` for comma-separated overrides. For example, in Windows Command Prompt:

```cmd
set AICTL_KUSTO_INGESTION=auto
set AICTL_KUSTO_TABLE_INGESTION=path_defs=inline,sessions=streaming
```

For the global default, precedence is CLI, then environment, then config, then `auto`. Table overrides are merged in the same order, with the higher-priority source replacing only matching table entries; a repeated table uses its last value. Per-table overrides take precedence over the global default regardless of source. Use `aictl config show` to inspect config/environment values. CLI choices reach background daemon processes through the inherited environment. Restart a running daemon to apply changes.

Selecting a mode changes client routing; it does not disable existing cluster/database/table policies, change DM batching policy or affect other clients. There is no automatic switch between backends after a failure. Inline and streaming use bounded client retries; queued uploads use the SDK's storage retries, without an additional whole-submission retry loop. Immediate failures propagate. DM can fail later, after queued submission has succeeded; inspect DM ingestion failures and diagnostics. Successful submission source IDs are logged at debug level, and the SDK requests failure reporting without aictl draining shared ingestion-status queues. This selection covers history inserts, updates and tombstones, plus raw OpenTelemetry writes; schema-management commands such as the write to `aictl_information_schema` remain synchronous management commands.

### Queued writes and dependent operations

Before a history-table mutation or conflict check, aictl waits for the relevant preceding queued submissions tracked by its shared ingester. `INSERT ... SELECT` waits for all tracked history tables because it can copy rows from another table. The check queries the raw table for every submitted `(rowid, _v)` pair, including tombstones, rather than treating an enqueue acknowledgement as ingestion success. Ordinary `SELECT` queries do not perform this wait.

The wait polls every 5 s with a 600 s timeout. A timeout or failed visibility query is an error, not success; acknowledged sources remain tracked and are not resubmitted by the wait. A 50,000-row pending-receipt budget also triggers a wait before another source is submitted; a single large source or concurrent in-flight submissions can temporarily exceed that budget. This bounds receipt growth during normal operation but can block an otherwise asynchronous commit during a long DM delay.

These receipts are **process-local and in memory**. They are shared by connections using the same cached ingester, not persisted across restarts or shared across processes/configurations. They do not make a multi-process transaction or guarantee immediate visibility of another writer's data. Changing modes or restarting does not drain earlier DM queues. Keep tables requiring immediate reads on inline or streaming, and let prior queued writes finish before relying on a changed mode. Different tables, including an OTel record and its payload chunks, can become visible at different times.

## 5. Check it

Open the dashboard as usual (`aictl daemon serve` prints the URL). In the Kusto web UI or any KQL client, `['sessions'] | count` and `['requests'] | summarize count() by ['tool']` show the rows arriving; `aictl_information_schema | summarize count() by ['scope']` lists the schema. Queued tables appear after DM processes their batches, not necessarily when a client commit returns. The Settings screen's "Data sources" shows the cluster, and the size budget never evicts (retention is the database's retention policy, set from `retention_days`).

## Report

`aictl db report` runs a set of KQL queries against the configured cluster and writes one self-contained HTML file: no server, no script or style loaded from another site except Google Fonts. It uses the cluster, database and sign-in of the store (`AICTL_KUSTO_CLUSTER`, `AICTL_KUSTO_DATABASE`, `AICTL_KUSTO_AUTH`, or `config.toml`), so every sign-in mode and the local emulator work. It only reads. With no cluster configured it exits with a message.

```
aictl db report [--out PATH] [--days N] [--sections A,B] [--kusto-cluster URL] [--kusto-database NAME]
                [--from TIME] [--to TIME] [--project NAME] [--tool NAME] [--model NAME]
                [--mcp NAME] [--skill NAME] [--agent TYPE] [--values] [--json PATH]
```

- `--out PATH`: the file to write; default `aictl-kusto-report.html` in the current folder.
- `--days N`: only data of the last N days; default all data. The runner puts `let report_days = N;` (0 for all) before every query.
- `--sections A,B`: only these sections, in this order; default all. An unknown name stops the command and lists the names.
- `--kusto-cluster URL`, `--kusto-database NAME`: read from this cluster and database instead of the configured ones, as with `aictl daemon serve`. The sign-in stays the configured one. On Windows, a variable set with `setx` reaches only terminals opened after it, so pass the option or set `$env:AICTL_KUSTO_CLUSTER` in the current terminal.
- `--from TIME`, `--to TIME`: only rows of this time range, in UTC, as `2026-11-01` or `2026-11-01T14:30`. A `--to` date includes that day. They replace `--days`; giving both stops the command.
- `--project NAME`, `--tool NAME`: only rows of this project (its folder name or its full path) or of this tool.
- `--model NAME`: only requests of this model. A tool call row holds no model, so a tool call passes when the latest request before it in its context (a session plus one agent) is of this model.
- `--mcp NAME`, `--skill NAME`, `--agent TYPE`: only sessions in which this MCP server, skill or agent type was used inside the time range. Every row of such a session passes. Use is read from the tool calls: a tool named `mcp__NAME__...`, a call of the skill tool with the skill as its target, an agent start with this agent type.
- Repeat a filter option or separate values with commas for alternatives; different options must all hold. Names compare without case.
- `--values`: print every value these filters can name, with the sessions behind it, inside the window and the other filters. Writes no page.
- `--json PATH`: also write the results as JSON. Each section holds the KQL as it ran, filter included, and its result rows.

The runner puts the filter in front of every query as `let` statements that define `report_requests` and `report_tool_calls`: the current rows of `requests` and `tool_invocations` that pass. A query reads only these two names, and a test fails when one reads a table itself, so no section can ignore a filter. The page header states the filter.

The command prints the path written, the time of each query and every section that failed. The page header shows the cluster host, the database, the time of the run, the window and the run time of each query. The page holds aggregates, 8-character session id prefixes, tool and model names and file base names; no prompt text, no full paths, no user names.

| Section | Shows | Reads |
|---|---|---|
| Session DNA | the 24 sessions with the most tool calls, one letter per call, error runs, fail-edit-fail loops, opening motifs | `tool_invocations` |
| Relay graph | which agents read files that other agents wrote, three-agent relay chains, write collisions, work items; draws the session with the most relay chains (else the most handoffs) | `tool_invocations` |
| Cost anomalies explained | hourly cost per tool (up to four tools, at most the last 90 days), hours far above the fitted baseline and the session behind each | `requests` |
| What slow requests share | request properties that are over-represented among the slowest 5 percent | `requests` |
| Context sawtooth and runway | prompt size of the 8 longest main-thread `claude-code` sessions, compactions, a fitted line per climb and the requests left to the typical compaction size | `requests` |
| What the end of a long session buys (`returns`) | sessions with 100 requests or more, cut in tenths by request order: share of spend, of files touched for the first time and of edits, and the rate of repeated calls | `requests`, `tool_invocations` |
| Going round in circles (`stuck`) | stretches of 4 requests or more where every tool call repeats one of the last 20 requests, fails the same way again or edits a file for the fourth time; share of requests, spend and time per model | `requests`, `tool_invocations` |
| What one edit costs, by model (`models`) | cost per request and per edited file, output tokens per request, tool calls per edit and edits that redo a file, per model inside each tool | `requests`, `tool_invocations` |
| What changes after a skill loads (`skills`) | rate of repeated calls before and after each skill load in the same context, and contexts with and without a skill | `requests`, `tool_invocations` |
| What each MCP server costs (`mcp`) | per server: calls, share of the tool-result text, tokens per result, failed calls and the 90th percentile wait; the tools that return the most text | `requests`, `tool_invocations` |

A section whose query returns no rows says there is no data for it. A section whose query fails shows the server's error text, and the rest of the page still renders. The queries use `make-graph`, `graph-match`, `scan`, `make-series`, `series_decompose_anomalies` and `evaluate diffpatterns`; the local emulator may lack some of these, and its sections then show that error.

To add a section, see `src/aictl/kusto/report/__init__.py`: drop `queries/NAME.kql`, add `<template data-section="NAME">` markup and `RENDER.NAME` to `template.html`, and add one `Section("NAME", "NAME.kql")` line to `SECTIONS`. A section can name a shared prelude file that is put in front of its query: the last five sections share `queries/_events.kql`, which links tool calls to requests by time because `request_id` is not set on `tool_invocations` rows.

## OpenTelemetry tables

With a cluster configured, everything a tool exports to the daemon's OTLP endpoints (`/v1/logs`, `/v1/metrics`, `/v1/traces`, JSON or protobuf) is also written to four tables in the same database. The first three are the tables of the OpenTelemetry Collector's `azuredataexplorer` exporter, with its columns in its order, so a collector and aictl can write to one database and one query reads both.

| Table | One row per | Columns aictl adds after the collector's |
| --- | --- | --- |
| `OTELLogs` | log record | `EventName`, `SessionId`, `Tool`, `Model`, `MachineId`, `RowKey` |
| `OTELMetrics` | data point (a histogram is `_sum`, `_count`, `_bucket`, `_min`, `_max` rows) | `StartTime`, `Temporality`, `Monotonic`, `SessionId`, `Tool`, `Model`, `MachineId`, `RowKey` |
| `OTELTraces` | span | `DurationMs`, `SessionId`, `Tool`, `Model`, `MachineId`, `RowKey` |
| `OTELPayloads` | chunk of a large text | aictl's own table |

The tables are created with the first export, and `.show table OTELLogs schema as json` carries a description of every column. A request is converted and put on a local queue without a call to the cluster; one thread per table sends what has gathered within 0.2 s, so the four tables are submitted in parallel and a slow cluster never holds up the tool that is exporting. In remote `auto` mode, these sends upload and enqueue DM sources; DM's batching policy controls ingestion time. Rows refused synchronously for now stay on the local queue and are sent again. The `kusto` block of `/api/otel-status` shows rows queued locally, sent, waiting, rejected and dropped, per table, with the last local/submission error. For queued mode, `rows_sent`, `last_sent_at` and a successful sink `flush()` mean **submitted**, not ingested; these counters do not report downstream DM failures.

**Times.** A record sent without a time is stored with the time it was received, never in 1970.

**Duplicates.** A request repeated after a timeout can store a row twice. `RowKey` is the same for both copies, so read through `summarize take_any(*) by RowKey`:

```kusto
OTELLogs
| summarize take_any(*) by RowKey
| where EventName == "user_prompt"
| project Timestamp, SessionId, Tool, Model, LogsAttributes
```

**Prompts and payloads.** Kusto cuts a string over 1 MiB and makes a dynamic value over 1 MiB null without an error. A text value over 32 KiB is therefore moved to `OTELPayloads` in chunks of at most 256 KiB, and the row keeps a reference in its place: `{"payload_id": "<sha256 of the text>", "bytes": <n>, "preview": "<first 256 characters>"}`. The whole text of one payload:

```kusto
OTELPayloads
| where PayloadId == "<payload_id>"
| summarize take_any(Text) by ChunkNo
| order by ChunkNo asc
| summarize Text = strcat_array(make_list(Text), "")
```

`hash_sha256(Text)` of the result equals the `PayloadId`. To search every stored text and get back to the rows it came from:

```kusto
OTELPayloads
| where Text has "refactor"
| distinct PayloadId, SourceTable, SourceRowKey, SessionId, Tool
```

**Capture modes.** `capture = "full"` (the default) stores text as above. `capture = "metadata"` stores no text: prompts, messages, tool input and output and any string over 256 characters are dropped from the attributes and their length kept (`prompt_chars`, `aictl.body_chars`), a log's body is emptied, and nothing is written to `OTELPayloads`. `capture = "off"` writes none of the four tables.

Two more queries to start from:

```kusto
OTELMetrics
| summarize take_any(*) by RowKey
| where MetricName has "token"
| summarize sum(MetricValue) by MetricName, Tool, Model
```

```kusto
OTELTraces
| summarize take_any(*) by RowKey
| summarize spans = count(), p95_ms = percentile(DurationMs, 95) by SpanName, Tool
```

## What to expect

Earlier measurements with **streaming ingestion**, on a `Dev(No SLA)` cluster in West Europe from a Mac: a query answered in about 0.1 to 0.2 s. On an empty database the board answered 44 s after launch and 66,000 rows in 39 tables were stored after 140 s, the newest about half a second old. While that backfill ran, single writes of a large session could take tens of seconds and the board about 5 s. The board's first answer was one computation of about 175 queries, run eight at a time, about 20 s (45 s one after another); after that the daemon served the last answer and recomputed behind it, up to about a minute behind the cluster. The machine, context and settings routes answered in under two seconds. These timings do not establish queued-ingestion or automatic-profile performance. Queued visibility adds DM batching and processing delay, and automatic state-table writes still consume inline capacity.

## Troubleshooting

- `Principal 'msauser=...' is not authorized` in the Kusto web UI: the web UI signed you in as your personal Microsoft account, which Kusto treats as a different principal from the Azure AD user that created the cluster. Either switch the web UI's directory to the cluster's tenant (account menu, Switch directory), open the cluster from the Azure portal (Data, Query), or add the account as a principal: `.add database ['aictl'] admins ('msauser=<you>@outlook.com')`.
- The web UI connects to `https://ingest-<name>...` but not to `https://<name>...`: the ingest URL is the Data Management endpoint, which only takes ingestion; queries and commands go to the engine URL, and that is the one whose roles matter. Give the identity a database role (above).
- `Kusto ingestion into <table> failed ... Status: 520 ... RowStoreTrimmableStreamException`: a server-side streaming-ingestion storage error. The response alone does not establish its underlying cause; `"@permanent": false` means retryable, not guaranteed to recover. aictl retries transient errors for about a minute. If they persist, investigate the cluster traces using the request/activity and RowStore IDs. For small development/test tables, `--kusto-table-ingestion path_defs=inline` can bypass streaming for that table; `--kusto-ingestion inline` selects inline as the global default, subject to any per-table overrides.
- Queued commits succeed but rows are absent: allow for DM batching and processing, then inspect ingestion failures. Submission success is not a completion signal. A dependent-operation timeout retains pending source IDs; it does not silently drop or resend those sources. Use inline or streaming for tables that must be read immediately.
- Slow first polls on a dev-tier cluster: automatic state-table writes use inline and share the cluster's ingestion-command capacity. Explicit streaming bypasses that inline path and preserves synchronous reads, but requires working streaming ingestion. Choosing queued for state tables can instead make conflict checks and updates wait for DM; it does not remove their read-before-write dependency.
- `AADSTS50076 ... multi-factor authentication`: run `az login --tenant <tenant id> --scope "https://<cluster host>/.default"` and sign in again.
- `Kusto ingestion into <table> failed transiently (BadRequest_EntityNotFound ...)` in the log right after tables were created or widened: an engine node still streams against the schema it cached before the change. aictl clears that cache after every schema change and repeats the rows for about a minute; without the clear the refusals last 45 to 90 s. `Kusto streaming schema cache was not cleared` means the account may not run the clear command (it needs Database Ingestor or higher); the rows then arrive after the cache expires on its own.
- `Forbidden` on the first start: the account lacks Database Admin on the database (step 2).
- `UserNotLicensed` from Fabric: the account has no Fabric license; start a Fabric trial in the Fabric portal or use an Azure Data Explorer cluster.
- `KustoStoreError: ... Unsupported`: a statement the translator cannot express; the message names the construct. Open an issue with it.
