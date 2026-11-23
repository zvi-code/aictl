# Using a remote Kusto cluster as the store

Kusto (Azure Data Explorer or a Fabric Eventhouse) is the aictl history store. If no destination is configured, the daemon serves live runtime data without stored history. It does not migrate existing SQLite history.

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

The last command creates the database; run it again with another `--database-name` for a second aictl database on the same cluster. The cluster URL is `https://<name>.westeurope.kusto.windows.net`. The default streams live telemetry and therefore requires cluster streaming ingestion to be enabled. aictl enables the database policy so tables inherit it. Explicit queued/inline modes do not require cluster streaming ingestion. To remove everything afterwards: `az group delete -n rg-aictl --yes`.

**A Microsoft Fabric Eventhouse.** Create an Eventhouse in a Fabric workspace (the account needs a Fabric license or trial and the workspace a capacity), open its KQL database and copy the query URI (`https://<id>.kusto.fabric.microsoft.com`). Fabric has streaming ingestion on by default.

## 2. Access to a remote cluster: identities, roles and endpoints

aictl creates tables and sets policies on startup, even when the tables already exist. Use **Database Admin** on the target database for the daemon; **Database Viewer** is sufficient for a report. Grant a role with a management command on the database, for example from the Kusto web UI:

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

## 3. Install aictl

`azure-kusto-data` and `azure-kusto-ingest` are required and installed with aictl. No extra is needed for Kusto.

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

The start prints `history store: kusto://<host>/aictl (Kusto, azcli auth; no SQLite file)`. On an **empty database**, aictl creates the `aictl_current_store_v1` marker table before the store tables. The daemon applies the normal session, usage, request and tool-call updates to versioned history tables. Dashboard queries, the live reader and `aictl db report` read these tables; telemetry still streams independently. Startup also refreshes `aictl_information_schema` and the database streaming policy when applicable.

Use **one daemon writer per database**, and stop it before changing versions. A nonempty database without the marker, or a database containing any legacy `*_observations` family, retains the observation-only behavior below. Do not add the marker manually or remove companion tables to enable reads. To switch, start this version with `--kusto-database` pointing to a **new empty database**. The ingesters can re-read the machine's retained sources; data present only as unresolved observations is not imported. Use the same database for reports. To roll back, stop the daemon and use the old binary with its original database, not the new one.

### Global ingestion mode and per-table overrides

The global `kusto_ingestion` setting accepts:

| Mode | Behavior |
| --- | --- |
| `auto` (default) | Streaming ingestion for live telemetry and raw OTLP, inline for the state/configuration tables below, queued for remaining tables. All tables use inline on the local emulator. |
| `queued` | Upload sources and enqueue them through DM. DM batches and ingests them asynchronously. Not supported by the emulator. |
| `streaming` | Use the streaming-ingestion API and RowStore. Not supported by the emulator. |
| `inline` | Use synchronous `.ingest inline` management commands, without the streaming-ingestion/RowStore path. |

**Queued means submitted, not yet readable.** A successful queued `commit()` confirms that the SDK uploaded the source and enqueued it, not that DM finished ingestion. Ordinary reads can lag behind writes. aictl leaves the database/table batching policy unchanged, does not request `flushImmediately`, and does not add per-source ingestion tags that would separate otherwise compatible batches. The 16 MB client upload target bounds source size, not DM's final batch size; an individual larger row is sent alone.

**Inline and streaming are synchronous.** Inline avoids RowStore and is suitable for small development/test writes or state/configuration that is read immediately. It consumes ingestion-command capacity and can create many small extents; it is not queued ingestion and is not the sustained-telemetry path. For a state table with high write volume, streaming is the synchronous alternative when streaming ingestion is healthy.

The SQL compatibility profile retains inline routing for the tables below. In observation mode, mutable fact writers use their streaming companion tables instead; they do not update these canonical baseline tables:

| Group | Tables |
| --- | --- |
| Configuration and maintenance | `schema_version`, `maintenance_state`, `data_quality_status`, `path_defs`, `process_defs`, `datapoint_catalog` |
| Sessions and their related state | `tools`, `projects`, `processes`, `sessions`, `session_processes`, `session_commits`, `agents`, `requests`, `context_events`, `tool_invocations`, `session_prompts`, `skill_uses`, `session_usage` |
| Files and context | `file_blobs`, `files`, `file_write_events`, `session_folders`, `session_artifacts`, `session_sources`, `session_loaded_files`, `session_context_items`, `memory_snapshots` |
| Tool message state | `cursor_session_messages`, `copilot_session_messages`, `vscode_chat_messages` |

`events`, `metrics`, `system_snapshots`, `process_snapshots`, `tool_stats`, `hook_calls`, and the four raw OpenTelemetry tables use streaming ingestion in remote `auto` mode. Remaining tables not listed above use queued ingestion. These automatic profiles apply **only to `auto`**. An explicit global `queued`, `streaming` or `inline` applies to every table unless a per-table override replaces it.

### Observation acceptance and remaining mutable writes

The typed append methods for the live telemetry tables above send the producer's batch directly through the native ingestion backend. They do not execute SQL conflict checks, query stored keys, or wait for the ten-second SQLite flush. The SDK splits requests at the service-size limits; streaming storage and queued DM batching are Kusto's responsibility, not client-side statistical aggregation.

Kusto mode applies the same sample reduction as SQLite: the change filter with its five-minute re-emit, the time-decaying CPU and memory sensitivity, 64 KB memory rounding, the per-second flood limit for single samples, and the cap of 500 sampled files per tool (`MAX_FILE_SAMPLES_PER_TOOL`). Unchanged tool statistics are not stored again. Only the buffering differs: process and discovery polls send their changed samples as one producer batch per poll instead of waiting for the SQLite flush. If Kusto refuses a batch, the change filter forgets those values, so the next poll sends them again. Heartbeat events, process snapshots and system snapshots are not reduced in Kusto mode. Equal-valued events and metrics that are sent receive distinct sequence keys, including observations with equal timestamps. Capture `metadata` and `off` still apply.

The HTTP OTLP path converts and hands off each received export without the local OTel queue or linger timer. It returns an error when conversion or ingestion fails, so a failed handoff is not reported as success. Streaming handoff confirms completion; queued handoff confirms submission only. Retried OTLP rows retain their `RowKey`. An ambiguous delivery can create physical duplicates: use that identity when counting logical OTLP records. In-memory acceptance is not a crash-durability guarantee.

### Legacy observation databases: retain unresolved, do not guess canonical totals

In this layout, the store writes request, tool-call, session, agent, session-usage, session/process-link, prompt, skill, file-write, context-event, loaded-file and context-item observations to typed `*_observations` companion tables. Their typed writer paths do not look up existing rows, merge partial facts, or delete another source's observations. The original canonical tables remain the legacy baseline; SQL writes to those families through an observation-mode connection are rejected. SQLite retains its previous behavior.

Each companion has typed fact columns plus `observation_id`, `observation_source`, `source_entity_id`, `producer_id`, nullable `source_revision`, native datetime `event_time`/`received_time`, `observation_operation`, `source_presence_known`, `presence`, and `serialized_fields`. An upstream revision is **not** inferred from the call-start or ingestion timestamp. Until an adapter supplies source presence, `source_presence_known` is false and `presence` is empty: `serialized_fields` describes the emitted row, including possible dataclass defaults, not which source fields were supplied. Missing identity/order is retained as uncertainty.

In Kusto mode `FactBuffer` retains copied intermediate versions before its usual dictionary coalescing. A failed batch stays with its owner for retry; its observations retain their transport identities. Size backfills become `fill_missing_sizes` patches, not canonical updates. Session/trace associations become explicit link evidence. These operations are not interpreted as resolved state or independently countable calls.

**Canonical totals are deliberately unavailable under this cutover policy.** Before accepting observations, setup synchronously records `observation_cutover:<family> = retain_unresolved` in `maintenance_state`. Observation-mode canonical reads fail closed independently of whether queued evidence is currently visible. Board routes return HTTP 409 with `incomplete` and the affected families; live history reports stale/error rather than claiming current totals; report sections report incomplete data. Missing cutover metadata is not evidence of completeness. Raw companion tables remain queryable. Direct external queries of the legacy physical tables must not be presented as complete current canonical results.

The context route keeps independently queryable inventory and memory data available, but marks `daily` totals with `available=false`, `incomplete=true`, `reason=unresolved_observations` and `retryable=false`. A route that cannot return an independent part uses HTTP 409 with the same error details; this is not a server fault or a transient ingestion failure. Live subscriptions publish this incomplete status without starting the Kusto history reader when cutover is known. An unresolved projection is not retried on every clock tick or new observation. Runtime agent/process/output and operational health updates remain independent. Canonical history requires a resolved projection implementation and daemon restart, not repeated browser refreshes.

Failed Kusto request attempts log the cluster, database, complete submitted KQL and full HTTP response body, including attempts that later succeed on retry. Streaming and queued ingestion do not submit KQL: their failures identify the transport and target table instead. If the SDK receives or exposes no HTTP response, the log says so and includes the exception rather than inventing a response. These diagnostics apply to all configured clusters. Request headers and authentication tokens are not added to the log, but KQL literals, inline ingestion rows and server responses can contain stored content; protect access to the logs accordingly. Queued acknowledgement still does not establish eventual ingestion success.

This implements query-free acceptance, **not** guessed reconciliation. Canonical projections can be enabled family by family only after their source identity, revision and absence/clear contracts are established and checked. Source tables are not blindly unioned and cumulative snapshots are not summed. Schema/bootstrap, configuration, file-inventory cache and maintenance operations remain separate and may issue queries. A direct telemetry failure propagates to its producer; an unreplayable producer must handle it explicitly. No unlimited-outage or crash-durable losslessness guarantee is made.

A commit sends streaming tables concurrently, with four workers, and sends inline commands and queued submissions in its foreground loop. A failed submission leaves that table's buffered rows for a later commit; an acknowledged queued submission leaves the buffer without waiting for ingestion. Multi-request failures or ambiguous network failures can cause duplicate submissions on retry; this is not exactly-once delivery.

Streaming requests set a 30-second SDK timeout (60 seconds including the SDK's transport allowance). Failed-request time and retry delays consume a 60-second retry budget; a request already started can finish after that budget. A failed transcript fact batch is retained, and the reader pauses at the source-record boundary instead of retrying after each additional fact. The next poll retries the retained batch before reading more input.

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

Before a history-table mutation or conflict check, aictl waits for the relevant preceding queued submissions tracked by its shared ingester. Mutations, including `INSERT ... SELECT` and upserts, wait only for tables their translated statement reads; unrelated queued telemetry does not block a synchronous session update. The check queries the raw table for every submitted `(rowid, _v)` pair, including tombstones, rather than treating an enqueue acknowledgement as ingestion success. Ordinary `SELECT` queries do not perform this wait.

The wait polls every 5 s with a 600 s timeout. A timeout or failed visibility query is an error, not success; acknowledged sources remain tracked and are not resubmitted by the wait. A 50,000-row pending-receipt budget also triggers a wait before another source is submitted; a single large source or concurrent in-flight submissions can temporarily exceed that budget. This bounds receipt growth during normal operation but can block an otherwise asynchronous commit during a long DM delay.

These receipts are **process-local and in memory**. They are shared by connections using the same cached ingester, not persisted across restarts or shared across processes/configurations. They do not make a multi-process transaction or guarantee immediate visibility of another writer's data. Changing modes or restarting does not drain earlier DM queues. Keep tables requiring immediate reads on inline or streaming, and let prior queued writes finish before relying on a changed mode. Different tables, including an OTel record and its payload chunks, can become visible at different times.

### Session indexing and restarts

The daemon reads the tools' existing session files into the selected store. Files on disk, a running tool process, and a completed session index are different things: a session's lifecycle row can arrive before its prompts, skill uses, edits and usage.

- **Current Copilot sessions appear before the full history pass finishes.** Changed Copilot transcripts are read newest-first, with active Windows sessions first. Each completed file's facts, usage and session row are published before the reader continues to later files and source-store reconciliation. Older eligible files still receive their normal backfill budget. Claude transcript ordering remains oldest-first to preserve replay attribution.
- **Restart checkpoints describe completed files, not just the time of the last poll.** File signatures are stored in `maintenance_state.text`, under a key scoped to the machine, user home and source directories. Deferred files and failed fact writes are not marked complete. A failed session write remains available for retry, and its fingerprint advances only after successful writes. The former global last-run timestamp is not used to assume that another machine's files were indexed; upgrading can therefore require a new pass over existing files.
- **Windows file metadata is not the only growth check.** The reader checks a held transcript's size through an open handle before deciding that it is unchanged. A Copilot lock marker bypasses age and backfill limits only when its original owner process is still alive; stale markers and reused PIDs do not force old transcripts into the live-data pass. No source file or marker is deleted.
- **Transcript edits are written in batches.** Cleanup of superseded edits is grouped by session and their replacements are inserted together, rather than forcing a Kusto query and ingestion for every edit. Re-reads use the existing deduplication and upsert rules; they do not require a database reset.

The Windows dashboard also compares project paths without case or separator differences, uses completion revisions rather than coarse clock ticks to decide whether an answer is fresh, and shares one cached process-parent snapshot instead of scanning the process table for each PID. Session searches on Kusto read result rows directly; SQLite's JSON-packing optimization is not used for a remote connection.

### Data layout version, compatibility and migrations

The database records which **layout** its data has: the tables, columns, keys and the meaning of stored values. The definition lives in `src/aictl/stores/kusto/layout.py`:

- `LAYOUT_VERSION`: the layout this aictl writes. It goes up with every change to tables, columns, keys or the meaning of stored values.
- `COMPATIBLE_SINCE`: the oldest layout whose stored rows this aictl still reads and merges correctly.
- `CHANGES`: one line per version with the reason, whether it breaks compatibility, and the name of the migration that upgrades older rows.
- `GA_LAYOUT_VERSION`: the first generally available layout (not set yet).

Data with no recorded version counts as layout 0. Layout 1 is the first recorded layout. It breaks compatibility with older data because request rows were stored more than once: the agent-team scan stored a second copy of each subagent call (`source == 'claude-code-jsonl'`), and a call reported by both OpenTelemetry and the transcript was stored under two keys. Every reader summed both copies.

**Where it is stored.** Each start that writes writes a row to the `schema_version` table with a management command (`.set-or-append`), so it does not depend on queued ingestion. The row holds `version`, `compatible_since`, `aictl_version`, `data_epoch`, `written_at`, `kind` (`layout`, or `migration` for a migration step's result), `step` and `detail` (how the row came about: `new`, `reset`, `upgrade` or `migrate`; for a step, `done: N rows` or `failed: ...`). A node that is older than the stored layout but still compatible never writes a lower version. The `data_epoch` is a random id. aictl creates it when it first sets up a database and creates a new one when the database is reset. It identifies one generation of the data.

**What happens at start.** aictl reads the layout before it creates or changes any table and before it writes anything:

| Stored data | What aictl does |
| --- | --- |
| No aictl tables, or only empty ones | Creates the tables and records this layout with a new data epoch. |
| Layout `COMPATIBLE_SINCE` or newer, and `compatible_since` of the stored row not above this aictl's `LAYOUT_VERSION` | Widens the tables. If the stored layout is older, records this one in the same epoch. |
| Older and incompatible, and each breaking step has a migration | Stops and names `aictl db migrate`. An interactive `aictl daemon serve` asks to migrate. |
| Older and incompatible, and a step has no migration | Stops and names `aictl db reset`, says that no migration exists for that step, and says what cannot be rebuilt. An interactive `aictl daemon serve` asks to delete and start again. |
| Written by a newer aictl that this one cannot read | Stops and tells you to upgrade aictl on this node. It never offers to delete the data. |

`aictl daemon serve` asks only when stdin is a terminal and `--headless` is not given. Its question is "Migrate the stored data in <database> on <cluster> to layout N now?", or, when no migration exists, "Delete the stored data in <database> on <cluster> and start again? [y/N]". Without a terminal, with `--headless`, or when the answer is no, it exits with a non-zero status, the message, and the command to run. Data is never deleted or migrated without an explicit yes, `--yes`, or `[storage] auto_migrate = true`. That setting allows only a migration at start, never a reset. A read-only open (`aictl db report`, catalog reads) reports an incompatible layout as a warning in its status and does not fail. The start banner and the store health (`Store.health()["layout"]`, which the dashboard health data carries as `store.layout`) show `version`, `compatible_since`, `data_epoch` and `stored_version`.

**Commands.** Each command takes `--kusto-cluster` and `--kusto-database`, as `aictl daemon serve` does. Without them, it uses the configured store.

- `aictl db layout` shows the stored version, its compatible-since, the data epoch and how it began, the aictl version that wrote it, this aictl's `LAYOUT_VERSION` and `COMPATIBLE_SINCE`, the verdict, and the changelog.
- `aictl db migrate --dry-run` shows each pending step, the management commands it would run, and how many rows each one changes. It changes nothing. `aictl db migrate` (with `--yes` for scripts) widens the tables, runs the steps, records each step's result in `schema_version`, and then records this layout. Stop the other writers of the database first.
- `aictl db reset` (with `--yes` for scripts) lists every aictl table in the database and its row count, then asks. It drops only the tables aictl owns: those in `tables.py` and `otel.py`, the `aictl_current_store_v1` marker, the `*_observations` companions and the old `aictl_information_schema`. Then it creates them again and records a **new** data epoch. Each node then reads its history again from the session files still on its disk. Data whose session files are gone, and data older than the retention period, cannot be rebuilt. When a migration exists, the command says so first. Dropping tables needs **Database Admin**.

**Migrations.** A migration is a named step in `src/aictl/stores/kusto/migrations.py`. It is a list of statements. Each statement has a query that counts the rows it changes and a management command that changes them. A statement must be idempotent: run again after an interruption, it finds nothing left to change. A finished step is recorded and is not run again. An interrupted step is run again in the same data epoch. Rows are changed the way the writers change them: by a newer version of the row (a later `_v`) or by a tombstone (`_deleted = true`). `.set-or-append` matches columns by position, so every statement appends `T | take 0 | union (...)`, which puts the table's own columns first, matched by name and type.

The first migration, `requests_single_copy`, does three things:

1. It deletes (with a tombstone) the request rows with `source == 'claude-code-jsonl'`. No current writer stores requests with that source.
2. It pairs each telemetry row (`source == 'otel'`) with a transcript row of the same node, session and four token counts, the n-th with the n-th in time order. This is the rule the writer now uses. Where the transcript row has no duration, time to first token, prompt id, pid or finish reason, the step copies them from the telemetry row.
3. It deletes the paired telemetry rows.

The migration cannot repair a call whose telemetry and transcript token counts differ: that call stays counted twice. Calls that only telemetry reported stay as they are.

**Rules for a layout change.** A guard test (`test/test_store_layout.py`) stores a fingerprint of all table names, column names and types, keys and version columns in `layout.FINGERPRINT`. It fails when the definitions change and the fingerprint does not. Its message names the steps: bump `LAYOUT_VERSION`, decide on compatibility, then update `FINGERPRINT`.

- Prefer **additive** changes: a new table or column that old rows simply lack, a new key alongside the old one, a reader that accepts both. An additive change bumps only `LAYOUT_VERSION` and adds a `CHANGES` line with `breaks=False`.
- A change of meaning (a key change, a changed meaning of a value, or a removed writer whose rows remain) also sets `COMPATIBLE_SINCE = LAYOUT_VERSION`, marks its line `breaks=True`, and should name a migration. Without one, the only way forward for existing databases is a reset, and history whose session files are gone is lost.
- Once `GA_LAYOUT_VERSION` is set, every breaking change after it **must** declare a migration. The guard test fails otherwise.

**Restart state follows the data epoch.** Each node keeps restart state (import checkpoints, session merge state, one-time-pass markers) in its restart directory, and records the data epoch there in `data_epoch.json`. Every start that writes runs the check before any reader loads a checkpoint: the daemon, `aictl db trim-text`, `aictl catalog sync`, migrate and reset. The check compares the recorded epoch with the database's epoch. When they differ, because the database was reset by this node or another, the node removes its restart state, logs why, and reads its history again as a new node. Restart state with no recorded epoch was written before epochs were recorded. It is kept only when the database's epoch kept older data (the epoch began with a migration or upgrade). It is removed when the database was created or reset since. A file that cannot be removed, for example because another aictl process of the same node holds it open on Windows, is named in an error, and the start stops. Stop the other process and start again.

### Starting a persistent daemon on Windows

Run from the folder you want to scan, or pass `--root`. The root can be a project or a folder that holds many projects, for example `C:\`. The daemon watches three kinds of folders: each git repository that the discovery scan finds under the root (scanned again every 30 seconds), the repository of each AI session's working folder (checked every 5 seconds), and the state folders of the AI tools (for example `~\.claude` and `~\.copilot`). Linked worktrees and submodules of a watched repository are watched as well. In a repository, the daemon reports only the files whose `git status` or content changes, plus AI tool files that git ignores (for example `.claude/settings.local.json`); it ignores build output and other files that git ignores. A commit, checkout, reset, merge or rebase is one `git_head` event, read from the `HEAD` reflog. The root itself is a project only when it is in a git work tree, so system files written under `C:\` are not reported as file activity of AI sessions. To update an existing installation, stop the daemon and follow the reinstall steps in [HOWTO.md](../HOWTO.md) before starting it again:

```powershell
aictl daemon serve --stop
```

For synchronous streaming writes, including the former remote default, start with an explicit mode:

```powershell
aictl daemon serve --daemon --kusto-cluster 'https://ingest-<name>.<region>.kusto.windows.net' --kusto-database aictl --kusto-ingestion streaming --no-open
aictl daemon serve --status
```

This is an explicit streaming profile, **not a change to the `auto` default**. It uses the same database and does not reset history. Streaming must be available on the cluster; use the other modes above when it is not. Any per-table overrides still take precedence.

Windows starts a child process with `aictl daemon serve`, not the removed top-level `serve` entry. A child that exits without recording its PID produces a startup error. The default PID and log files are `%APPDATA%\aictl\aictl.pid` and `%APPDATA%\aictl\aictl.log`; a custom `[daemon]` configuration can change them. A "daemon starting" message confirms process startup, not completion of the initial snapshot or history indexing.

## 5. Check it

### Multiple reporting nodes

Give each aictl daemon that writes to the same database a stable, unique node ID.
By default it uses the lowercase hostname. For cloned hosts or containers set
`AICTL_NODE_ID` in the daemon's environment **before starting it**, for example
`$env:AICTL_NODE_ID = "build-07"` in PowerShell. Use the same ID after restarts;
changing it starts a different node's history. `legacy` is reserved.

The daemon's history reads, updates, deletes, and live invalidations are local
to its `node_id`. The database retention policy, schema and cluster health are
shared; agree on those settings across daemons. For fleet investigations, use
**Flow → Query in Kusto → Fleet nodes** to compare session counts, then enter a
**Reporting node** to drill down. `aictl db report` reads across nodes by default;
use `--node build-07` to restrict the report. In native KQL, include `node_id`
in joins, deduplication and version keys for host-local identifiers.
On a current store, `aictl_resolved_requests()` and the other resolved history
functions keep one live version per node and local key. On an unresolved store,
use `aictl_requests_observations()` to inspect evidence instead; it does not
turn observations into billable requests.

**Overview, Health and Settings** default to **This node**. Select **All nodes**
or a named node for read-only reported data. `legacy` is history without a node
tag. Browser Overview uses the same charts, filters, and drill-downs in every
scope. It aggregates activity in the selected window and uses the reporting
node and native ID together for session links. Runtime data is independent
of the historical time range. The serving node supplies its current monitor
snapshot; other nodes supply their latest shared reports. A scope that
excludes the serving node never uses its runtime measurements.

The browser's historical Overview requires a current history store. A valid
empty range is not a query failure. If a scope exceeds the 31-day range or query
size limits, narrow the chart range. Session search is independent of the chart
range. Fleet CPU and memory charts sum per-node bucket averages from available
samples; a node without samples is not counted as a zero sample.

The node selector applies to every dashboard section. Choosing the serving
host **by name** or **This node** selects its own history and runtime.
Tables whose rows belong to one machine identify it in the Node column.
Aggregates use the selected nodes before row limits. A zero in a historical
table means no matching records,
not proof that an instrumented activity did not occur. Collection capabilities
in the Sources matrix are global; its evidence comes from the selected scope.

The **Monitored sessions** counter includes idle sessions and does not
establish that a model is generating a reply. This count and the AI tool
process count come from each node's monitor, not from recent historical
requests. The Agents panel distinguishes the live count from recorded agents
and shows how many reporting nodes sent individual agent lists. Upgraded daemons include
up to 128 session records per node in an existing operational sample.
Older daemons can report host counts without an agent list; the dashboard
shows that gap without inventing agent rows. Lists join historical rows
only by the reporting node and exact session ID.

Context includes indexed files, the latest tool reports and seven days of model
calls from the selected nodes. File rows keep their node identities, and
distinct model windows and lifetime counters do not get combined. Historical
budgets include only host-wide files with known loading policies; scan roots
and current file contents are not inferred. Machine separates whole-host
samples from recorded session/PID associations; neither is a live process
tree. Session drawer tabs retain the originating node,
including Events, Team, Processes and Integrations. They do not read a
same-named file, PID, session or local configuration from the serving host.

Health keeps the same sidebar, activity, resources, table inventory and detailed
metrics in every scope. Host measurements retain their node and capture time.
Network traffic by node shows the latest inbound and outbound rates for
monitored AI tools in bytes per second. These are not Kusto SDK rates.
SDK rates and client counters use only reporting daemons in the selection;
Health shows the coverage, and does not count a missing measurement as zero.
An upgraded daemon includes bounded operational counters in an existing system
snapshot every 30 seconds; no extra ingestion request is needed. Older daemons
still report host metrics. Cluster capacity, diagnostics and physical table
sizes describe the shared destination and are shown once, not summed per node.
A sample older than five minutes is marked stale; no sample means unknown, not down.
Kusto node-report reads limit scan-thread fan-out to 1% per node and use the
service's memory limit. This does not exclude any nodes or shorten history.
A failed cold read returns HTTP 503 with the Kusto client request ID
(`aictl.nodes.reports;…`), not empty data. For the live cursor worker's
separate limits see [the live reader](kusto-live-reader.md#work-limits-and-isolation).
The Flow event query narrows scans using bounded integer hashes, then checks the
winning event's full identity, time, session and filters. It does not send an
all-history list of event keys as a Kusto `in` argument.
Historical dashboard reads also limit scan fan-out and batch concurrency.
The history projection follows continuation keys when a tool-activity or file
inventory read exceeds one page. The per-request row limit still applies.
An explicitly limited list returns only its requested page. A failed page
does not publish an incomplete board or substitute an empty inventory.
Long ranges read bounded, non-overlapping time slices and combine their
current facts before computing totals and percentiles. The same filtered
session set is used for tool and error drill-downs. File history shows the
timestamp of the fallback comparison and does not use a newer snapshot than
the selected end time.
For session details they select candidate physical keys first, then resolve
all versions of those keys and recheck the session. This avoids grouping the
whole store without letting an old version or a deleted record reappear.
The node filter keeps the same panels, table columns, and Settings views.
Settings shows the effective node ID and its source for the serving daemon.
Local tool configuration files and policy findings are not read in remote
scopes or substituted for the selected nodes.

The CLI uses the daemon's node report endpoint. `aictl board overview` counts
sessions **started** in its selected window (seven days by default), using the
current session record counters rather than activity in the window:

```powershell
aictl board nodes
aictl board overview --all-nodes
aictl board session "<session-id>" --node build-07
aictl board health --node build-07 --json
aictl board settings --all-nodes
```

Use `aictl board identity` for the serving node. `--port` or `AICTL_PORT` selects
the daemon port (default `8484`). Without a shared Kusto store, use the local
views. `aictl db report` remains available for direct Kusto analysis without a daemon.

**Upgrade before adding other writers.** Stop or upgrade old daemons first:
they do not tag rows or restrict their mutations to one node. The new daemon
widens history tables on startup and OTel tables on export, without rewriting old
rows. Old rows and exports from unmodified external collectors have an empty
`node_id`; they are not silently assigned to the first upgraded host. Use
`--node legacy` or `where isempty(node_id)` to investigate them. The local
dashboard does not include that history by default. A host field in an OTLP
resource identifies the producer, not necessarily the aictl daemon that received it.

Open the dashboard as usual (`aictl daemon serve` prints the URL). The Settings screen's "Data sources" shows the cluster. `aictl_information_schema | summarize count() by ['scope']` lists the schema, and the size budget never evicts (retention is the database's retention policy, set from `retention_days`).

On a **current store**, history tables contain multiple versions and deletion markers. A raw `sessions | count` is not the number of indexed sessions. To count current session rows:

```kql
sessions
| summarize arg_max(_v, *) by node_id, session_id
| where _deleted == false
| count
```

That count can still include lifecycle-only rows. Check the dashboard's session search (`/api/board/sessions?limit=200`) and the actual activity facts as well. This query counts current prompts, skill uses and edits from the last 24 hours, without displaying their content:

```kql
union withsource=SourceTable session_prompts, skill_uses, file_write_events
| summarize arg_max(_v, *) by node_id, SourceTable, rowid
| where _deleted == false and unixtime_seconds_todatetime(ts) >= ago(1d)
| summarize rows=count(), sessions=count_distinct(session_id) by node_id, SourceTable
```

Use the same time range, tool and project filters when comparing these facts with the board. A responsive HTTP endpoint or a growing lifecycle-row count alone does not establish that prompts, skills and changes have been indexed. During the first transcript poll, the ingester's last-poll time can remain unset while completed Copilot sessions are already appearing. Check the Machine panel's ingester status and errors, and whether the session list and fact counts advance.

Queued tables appear after DM processes their batches, not necessarily when a client commit returns. A large history or a small cluster can also delay synchronous backfill; there is no fixed completion time. Existing history is not deleted to recover indexing.

### aictl Health

Open `?screen=health` for the daemon's live collection and storage health. This
screen uses `/api/board/health` independently of the historical board and reuses
the existing source, collector, ingester, sink, OTel and data-quality monitors.
The default **At a glance** view shows active measurements, pending work, failures
and traffic by destination, without rows for routine zeros or unavailable values.
Current rates and read latency appear separately from lifetime totals and stored
volume. Live sparklines use observations received while Health is visible (at
most one per ten seconds, for 15 minutes). Gaps are not extrapolated. Read
latency is the mean duration of requests completed in the last minute.
Traffic bars compare bytes per second with the busiest displayed destination.
The default destination order stays fixed; sorting by rate is optional.
**Hide problems** remembers its state in the browser while keeping the status
visible. **Work in progress** stays in place, even when idle; expanding it
opens a bounded scrolling list rather than moving the panels below it.
Collection status lists observed sources and exceptions by default; expanding it
does not move the traffic table. A collector and its matching quality record
count as one issue.
No free cluster ingestion slots is still shown as a warning when measured.
Select **Show all metrics** to inspect zeros, unavailable values, policies and table membership.
**Tables and storage** searches and sorts a cached `.show tables details`
result locally. Extent metadata can lag and excludes unsealed streaming rows.
Physical counts include versions and tombstones; they are not current request
counts. The inventory and selected logical counts refresh at most once per
five minutes on ADX, shared across viewers. Unchanged inventories are not
retransmitted with every live update.

**Resource usage** distinguishes this daemon's CPU, resident memory and
threads from the host CPU and memory snapshot. ADX cluster node counts, hot
extent storage and active operations come from a cached `.show diagnostics`;
the separately timestamped slot count comes from `.show capacity ingestions`.
For Azure CLI authentication, optionally set `AICTL_KUSTO_ARM_RESOURCE_ID` to
the ARM ID of the matching ADX cluster to request CPU, cache and ingestion
utilization from Azure Monitor. All four metrics share one background request
per five minutes; only reported one-minute averages are displayed. A missing
or denied metric is not a zero and no host value is substituted for it.
It separates the stages rather than presenting submitted data as stored data:

- **Queued ingestion / DM:** submission rates and volume, pending work, client
  upload sizes and the cached database batching policy. These are not evidence
  that the data is queryable. Client uploads are not DM's final ingestion batches.
- **Engine ingestion:** streaming and inline traffic and the applicable
  streaming policy. Traffic counters are not the current size of the database.
- **Queryable store and reads:** counts read from storage, their cache time and
  scope, read requests and available backend capacity information.

Destination-table groups separate OTel, hooks, live-session data, monitoring,
files/configuration and other tables. Effective ingestion modes and per-table
overrides determine which stage a group's traffic belongs to; mixed groups must
not be treated as wholly queued or wholly streaming.

Kusto mode includes links to the configured cluster, database and capacity
query. Counters reset with the daemon; rates cover up to the last 60 seconds.
Submitted rows are not necessarily queryable rows. Stored-volume and capacity
readings are cached and explicitly scoped; unknown values are shown as `n/a`.
Row counts cover selected history tables. Their start and completion times
describe the actual read, not the most recent HTTP refresh. All table counts
for one store are collected in one query. Cluster slot totals, consumed slots and remaining slots
come from `.show capacity ingestions`; these are not throughput measurements.
If a refresh fails, the last successful measurement retains its timestamp.
An ingester's last success is the completion of a poll, not its start. A long
backfill can run while other writes succeed. OTel receiver counters are scoped
to this daemon and are separate from model calls indexed from transcripts.
Backend health describes operations observed by this client, not cluster-wide
Azure Resource Health. Local storage uses the same screen without Kusto-only
statistics.

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
| `OTELLogs` | log record | `EventName`, `SessionId`, `Tool`, `Model`, `MachineId`, `RowKey`; then the event's attributes, typed: `EventSequence`, `PromptId`, tokens, `CostUsd`, `DurationMs`, `ToolName`, `ToolCallId`, `McpServer`, `McpToolName`, `SkillName`, `Success`, `Error`, `StatusCode`, `Attempt`, `Decision`, `DecisionSource`, agent ids, `RequestId`, `ResponseId`, sizes, `AppVersion` and more |
| `OTELMetrics` | data point (a histogram is `_sum`, `_count`, `_bucket`, `_min`, `_max` rows) | `StartTime`, `Temporality`, `Monotonic`, `SessionId`, `Tool`, `Model`, `MachineId`, `RowKey`; then the point's dimensions: `Type`, `TokenType`, `OperationName`, `ToolName`, `McpServer`, `Decision`, `DecisionSource`, `Language`, `AgentName`, `AppVersion` and more |
| `OTELTraces` | span | `DurationMs`, `SessionId`, `Tool`, `Model`, `MachineId`, `RowKey`, `TurnId`, `OperationName`, `AgentName`, `ToolName`, `ToolCallId`, `InputTokens`, `OutputTokens`; then `ResponseId`, `RequestId`, `ConversationId`, `FinishReasons`, `ErrorType`, `McpServer`, `SkillName`, agent ids, Copilot's cost, AI units, server time and time to first chunk, and more |
| `OTELPayloads` | chunk of a large text | aictl's own table |

New spans expose the reported turn, operation, agent, tool and token usage as physical
columns. `Tool` identifies the exporter; `ToolName` identifies the invoked tool.
Absent token counts are null, not zero. `InputTokens` is request usage, not a context-window limit.
All four tables include `node_id`. Spans also expose `ReportedContext.skills` and
`ReportedContext.mcp_servers` as arrays of normalized names. The original attribute
bags and previously shipped columns remain available. See the [complete generated
schema](kusto-schema.md#opentelemetry) for the actual column names and types.

The session breakdown reads execution evidence from `session_steps`, with captured
transcript text in `session_step_text.text` (a Kusto `string`, not JSON).
The local `/api/session-evidence?session_id=...` endpoint also includes matching
OTel spans. `q` searches a session, `kind=context` selects reported context
observations, and `step_key` opens the text of one event. List results use short
previews; detail returns up to 32,768 redacted characters with an explicit
truncation state. Metadata capture never writes or returns this text. Step IDs
are replay-stable, and transcript and span evidence is not added to billing totals.

Open a session to see **Flow** first. Its search, category, tool, agent, failures and time
filters apply before the newest-events limit. Source steps are available inside Flow.
In **Swim-lane**, **Individual lanes** is the default even for large sessions.
Scroll the diagram horizontally to see more named tools and subagents, or select
**Group lanes** for a compact view. The browser remembers the choice; it does not filter events.
Choose **User prompts** to see what the user wrote, search the retained wording and
select a row to read it. A link ending in `?agent=<session-id>&show=prompts` opens
this filter directly. Native Copilot user messages take precedence over prompt
indexes and hooks in their observed window. Delegate/autopilot messages and
assistant replies are not substituted for user input.
Choose **Skills** in Flow to filter by skill name and evidence phase. **Loaded**
includes recorded skill-file loads; **Invoked** records uses; **Resolved** means
the source resolved the name. **Reported in context** shows one row per skill
listed by OTel in the selected session and time range, with its distinct span
count and first/last observation. Repeated context lists are not repeated loads.
Open this view directly with `?agent=<session-id>&show=skills`.
**Context** remains a separate tab: Measurements shows reported sizes and compactions;
Model input shows per-call usage, with OTel cache-read, cache-write and reasoning counts
when reported. Skills and MCP lists names the exporter reports, not a token attribution.
Changes distinguishes command requests from observed model changes, rewinds and resets.
Missing measurements stay unknown; a smaller later prompt is not evidence of a reset.

On Kusto stores, Flow also offers session-scoped KQL examples and an editable query.
Autocomplete uses observed session IDs, models and tools. Opening in Kusto uses the
configured database and `autorun=false`: the user reviews and runs KQL in ADX, not
through a management endpoint on the daemon.

The query examples include completed turn duration, subagents, command execution,
MCP calls, failed calls, response-size percentiles, and keyword search over retained
user prompts or visible assistant messages. Matching words is not semantic topic
search. Private model reasoning is not a transcript source; reported reasoning-token
counts are a separate measurement.

`turn_request_links.request_key` refers to `requests.dedup_key`; the link contains
no cost. Turn rankings read each current request once and group its recorded cost
only when there is source evidence linking it to a turn. The session-tree scope
needs an identified root session and turn, not simply overlapping timestamps.
Missing links and unknown prices limit coverage; an empty ranking is not a zero bill.

The tables are created with the first export, and `.show table OTELLogs schema as json` carries a description of every column. A request is converted and put on a local queue without a call to the cluster; one thread per table sends what has gathered within 0.2 s, so the four tables are submitted in parallel and a slow cluster never holds up the tool that is exporting. In remote `auto` mode, these sends upload and enqueue DM sources; DM's batching policy controls ingestion time. Rows refused synchronously for now stay on the local queue and are sent again. The `kusto` block of `/api/otel-status` shows rows queued locally, sent, waiting, rejected and dropped, per table, with the last local/submission error. For queued mode, `rows_sent`, `last_sent_at` and a successful sink `flush()` mean **submitted**, not ingested; these counters do not report downstream DM failures.

**Times.** A record sent without a time is stored with the time it was received, never in 1970.

**Duplicates.** A request repeated to the same daemon can store a row twice. Its `(node_id, RowKey)` is the same for both copies. Only apply this rule to rows with a `RowKey`: external exporters need not supply one.

```kusto
OTELLogs
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where EventName == "user_prompt"
| project Timestamp, node_id, SessionId, Tool, Model, LogsAttributes
```

**Prompts and payloads.** Kusto cuts a string over 1 MiB and makes a dynamic value over 1 MiB null without an error. A text value over 32 KiB is therefore moved to `OTELPayloads` in chunks of at most 256 KiB, and the row keeps a reference in its place: `{"payload_id": "<sha256 of the text>", "bytes": <n>, "preview": "<first 256 characters>"}`. The whole text of one payload:

```kusto
OTELPayloads
| where node_id == "<reporting node>" and PayloadId == "<payload_id>"
| summarize take_any(Text) by ChunkNo
| order by ChunkNo asc
| summarize Text = strcat_array(make_list(Text), "")
```

`hash_sha256(Text)` of the result equals the `PayloadId`. To search every stored text and get back to the rows it came from:

```kusto
OTELPayloads
| where Text has "refactor"
| distinct node_id, PayloadId, SourceTable, SourceRowKey, SessionId, Tool
```

**Capture modes.** `capture = "full"` (the default) stores text as above. `capture = "metadata"` stores no text: prompts, messages, tool input and output and any string over 256 characters are dropped from the attributes and their length kept (`prompt_chars`, `aictl.body_chars`), a log's body is emptied, and nothing is written to `OTELPayloads`. `capture = "off"` writes none of the four tables.

Two more queries to start from:

```kusto
OTELMetrics
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where MetricName has "token"
| summarize sum(MetricValue) by node_id, MetricName, Tool, Model
```

```kusto
OTELTraces
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| summarize spans = count(), p95_ms = percentile(DurationMs, 95) by node_id, SpanName, Tool
```

**Typed columns.** The columns after `node_id` (listed with their source attributes in `.show table OTELLogs schema as json` and in [kusto-schema.md](kusto-schema.md#opentelemetry)) are copied from the attribute bag, so most questions need no `LogsAttributes[...]`. They are null when the tool does not send the attribute. `McpServer` is the attribute when a tool sends one, else the `<server>` of a tool named `mcp__<server>__<tool>`. Each query below keeps one copy of a repeated row first.

Tokens and cost by model, per session (Claude Code `api_request` events; Copilot reports usage on spans):

```kusto
OTELLogs
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where EventName in ("api_request", "claude_code.api_request")
| summarize calls = count(), input = sum(InputTokens), output = sum(OutputTokens),
    cache_read = sum(CacheReadInputTokens), cache_write = sum(CacheWriteInputTokens), cost_usd = sum(CostUsd)
    by SessionId, Model
| order by cost_usd desc
```

Tool calls and failure rate by MCP server:

```kusto
OTELLogs
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where EventName in ("tool_result", "claude_code.tool_result") and isnotempty(McpServer)
| summarize calls = count(), failed = countif(Success == false), total_ms = sum(DurationMs),
    result_bytes = sum(ToolResultBytes) by McpServer, McpToolName
| extend failure_rate = round(1.0 * failed / calls, 3)
| order by calls desc
```

Slowest tools, from log events and from spans together:

```kusto
union
    (OTELLogs | where isnotempty(RowKey) | summarize take_any(*) by node_id, RowKey
        | where isnotempty(ToolName) and isnotnull(DurationMs) | project Tool, ToolName, DurationMs),
    (OTELTraces | where isnotempty(RowKey) | summarize take_any(*) by node_id, RowKey
        | where OperationName == "execute_tool" | project Tool, ToolName, DurationMs)
| summarize calls = count(), p50_ms = percentile(DurationMs, 50), p95_ms = percentile(DurationMs, 95),
    max_ms = max(DurationMs) by Tool, ToolName
| top 20 by p95_ms
```

Retries and API errors per session:

```kusto
OTELLogs
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where EventName in ("api_error", "claude_code.api_error")
| summarize errors = count(), max_attempt = max(Attempt), statuses = make_set(StatusCode),
    first_error = take_any(Error) by SessionId, Model
| order by errors desc
```

Tool permission decisions by source (`tool_decision` events, and the `code_edit_tool.decision` metric):

```kusto
OTELLogs
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where isnotempty(Decision)
| summarize count() by EventName, ToolName, Decision, DecisionSource
```

```kusto
OTELMetrics
| where isnotempty(RowKey)
| summarize take_any(*) by node_id, RowKey
| where MetricName == "claude_code.token.usage" or (MetricName startswith "gen_ai.client.token.usage" and MetricName endswith "_sum")
| summarize tokens = sum(MetricValue) by Tool, Model, TokenType
```

A Copilot call can be matched to its transcript by `ResponseId` (span attribute `gen_ai.response.id`) or `RequestId` (`github.copilot.service_request_id`); a Claude Code call by `RequestId` when the event sends `request_id`.

## What to expect

Earlier measurements with **streaming ingestion**, on a `Dev(No SLA)` cluster in West Europe from a Mac: a query answered in about 0.1 to 0.2 s. On an empty database the board answered 44 s after launch and 66,000 rows in 39 tables were stored after 140 s, the newest about half a second old. While that backfill ran, single writes of a large session could take tens of seconds and the board about 5 s. The board's first answer was one computation of about 175 queries, run eight at a time, about 20 s (45 s one after another); after that the daemon served the last answer and recomputed behind it, up to about a minute behind the cluster. The machine, context and settings routes answered in under two seconds. These timings do not establish queued-ingestion or automatic-profile performance. Queued visibility adds DM batching and processing delay, and automatic state-table writes still consume inline capacity.

## Troubleshooting

- On Windows, Copilot lock markers qualify an old transcript for the live-data pass only while the marker's original process is still alive. Orphaned markers, including markers whose PID was reused, do not bypass the normal history backfill limits. The source files and markers are not deleted.
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
