# Store write-path audit

Phase 0, item 7. Source references are for `2cf86cf` (before the parallel layout-table deletion). Line numbers can move; use the method names to find the statements. This inventory excludes `ui_*` tables. It includes direct writes that bypass `HistoryDB`, SQL emitted from templates, and SQLite writes used only to build read projections. The six statement tables contain 80 entries: 16 append, 10 full-row upsert, 18 read-modify-write, 7 delete, 10 age cleanup and budget, and 19 schema and infrastructure. An entry can cover several statement sites or tables that have the same replacement.

The replacement rules are in `C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\ui-rewrite-plan.md:229–250` (K1–K11, B1–B8), `:252–281` (storage gaps and CLI), and `:426–455` (Phase 0 and Phase S). For all writers: make keys before handoff (K6), use the per-table retry and drop limits (K4), do not ingest with capture off (K5), and carry the project key instead of opening a separate file (K8). Here **full version** means append the complete row with a new version, then select the current version with `arg_max`; filter tombstones after selecting the current version (K1/K9). Here **local state** means bounded live state and, for restart-critical cursors or identity maps, an atomically replaced JSON file in the aictl state directory (K3). It is not a spool for failed ingestion.

**The plan's command description is historical.** The `Mutation` docstring still describes `.set-or-append` (`C:\OSS\aictl\src\aictl\kusto\statements.py:50–56`). At this revision, `KustoConnection._mutate` first queries Kusto for the affected rows, then buffers the resulting versions for ordinary ingestion (`C:\OSS\aictl\src\aictl\kusto\connection.py:1189–1229`); `_mutate_many` can share a materialized read across a batch (`:1110–1136`). Both still violate K9. Also, the runtime can send unresolved fact observations without SQL (`C:\OSS\aictl\src\aictl\storage.py:3393–3441,5033–5039,5934–5951`; `C:\OSS\aictl\src\aictl\kusto\observations.py:15–49`). Audit and retire the SQL/history layout branches too; a clean new-store path alone does not close K9.

## Collector callers

The call-site IDs below are used in the statement tables. Where a caller has both an observation path and a SQL path, the references identify the producer, not a claim that SQL runs in both modes.

| ID | Collector, ingester, or handler and call sites |
|---|---|
| **H** | Hook receiver `_receive_hook`: hook events and calls, session lifecycle, tool begin/end and file edits (`C:\OSS\aictl\src\aictl\dashboard\web_server.py:749,802–866,908–998`); memory captures use `_snapshot_worker` (`:409–415`). |
| **T** | Transcript and usage ingestion. `CallFactsBuffer` writes facts (`C:\OSS\aictl\src\aictl\ingesters\call_facts.py:437,470`; source adapters call it at `:688,769,1103,1166,1557,1744`). `TranscriptUsageIngester` flushes pending confirmation expiry and persists usage and session rows (`C:\OSS\aictl\src\aictl\ingesters\transcript_usage.py:1333–1337,1444–1455`); loaded-file/context and tool-size backfills emit replayed facts (`C:\OSS\aictl\src\aictl\ingesters\loaded_files_backfill.py:43–46`; `C:\OSS\aictl\src\aictl\ingesters\tool_size_backfill.py:48–51`). For split-store dispatch see `C:\OSS\aictl\src\aictl\project_stores.py:1176–1236`. |
| **D** | Discovery, host samples, process samples, and runtime session/team events. `SampleSink` sends samples (`C:\OSS\aictl\src\aictl\sink.py:508,615`); discovery emits through the sink (`C:\OSS\aictl\src\aictl\monitoring\runtime.py:39–67`). The orchestrator appends system/process snapshots, events, and tool telemetry and runs file discovery sync (`C:\OSS\aictl\src\aictl\orchestrator.py:1220–1266,1361`); team and lifecycle writers call session, agent, request and link methods (`:1469,1485–1486,1502–1503,1529`). |
| **O** | OTLP HTTP handlers append derived logs, metrics, events, requests, calls and session links (`C:\OSS\aictl\src\aictl\dashboard\web_server.py:1139–1174,1190–1214,1730–1753`); late trace links call `tie_otel_traces` (`:390`). Historical repair calls `set_event_sessions` (`C:\OSS\aictl\src\aictl\ingesters\otel_sessions_backfill.py:92–99`). Raw OTLP is also sent to the native sink (see below). |
| **M** | Source message ingesters: Copilot `poll` / `_ingest_table` (`C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:132,246,281–342`), Cursor `poll` (`C:\OSS\aictl\src\aictl\ingesters\cursor_conversations.py:89–147,196–211`), VS Code `poll` and snapshot application (`C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:194,347,432,471–508`). Session provisioning goes through `C:\OSS\aictl\src\aictl\ingesters\_common.py:197–202`. |
| **E** | Session evidence: artifact ingester (`C:\OSS\aictl\src\aictl\ingesters\session_artifacts.py:155–188`); hook-end Git attribution (`C:\OSS\aictl\src\aictl\dashboard\web_server.py:887–892`; `C:\OSS\aictl\src\aictl\analysis\git_attribution.py:161`). |
| **Q** | Data quality and catalog: analytics poll failures (`C:\OSS\aictl\src\aictl\dashboard\analytics.py:152–166`), ingester failures (`C:\OSS\aictl\src\aictl\dashboard\ingester_runner.py:232–252`; `C:\OSS\aictl\src\aictl\ingesters\_common.py:53–69`), discovery (`C:\OSS\aictl\src\aictl\orchestrator.py:1364,1374`), sink quality and catalog sources (`C:\OSS\aictl\src\aictl\sink.py:587,809`), catalog sync and validation (`C:\OSS\aictl\src\aictl\commands\admin.py:986,1075`). |
| **A** | Admin writes: daemon automatic maintenance (`C:\OSS\aictl\src\aictl\orchestrator.py:647`); CLI compact/vacuum/trim/reset (`C:\OSS\aictl\src\aictl\commands\admin.py:107,118,151,421–455`); board compact/vacuum (`C:\OSS\aictl\src\aictl\dashboard\board_api.py:7588–7594`). HTTP audit/action events also reach `append_event` (`C:\OSS\aictl\src\aictl\dashboard\api_handlers.py:1083`; `C:\OSS\aictl\src\aictl\dashboard\board_api.py:7627`). |
| **P** | Split-store lifecycle: initialization and migrations (`C:\OSS\aictl\src\aictl\project_stores.py:503–570,637–664`); routing, retries and deferred moves (`:783,795–825,849–952`); append/direct writes (`:973–1116,1150–1236`); retention forwarding (`:1332–1360`). |

“No production caller found” means the source search found the definition but no production call to it. Do not preserve an unused write just because SQLite supplied it.

## Append

| Table | Statement and owning method | Callers | Phase S replacement |
|---|---|---|---|
| `events` | `INSERT OR IGNORE`, `HistoryDB.flush`, `C:\OSS\aictl\src\aictl\storage.py:3819`. | H, D, O, A via `append_event(s)`; P dispatches via `C:\OSS\aictl\src\aictl\project_stores.py:973–998`. | Ingest event facts. Retain independently observed events; dedup only the same event/retry (K6). Keep OTel correlation separate from append. |
| `metrics` | `INSERT OR IGNORE`, `HistoryDB.flush`, `C:\OSS\aictl\src\aictl\storage.py:3839`. | D, O via `append_samples`. | Ingest change-filtered samples. Replace per-file metric pairs with inventory state (K10). |
| `requests` | `INSERT OR IGNORE`, `HistoryDB.flush`, `C:\OSS\aictl\src\aictl\storage.py:3860`. | D, O via `append_request`; P wrapper `C:\OSS\aictl\src\aictl\project_stores.py:1004–1009`. | Ingest source-keyed requests; resolve overlapping sources in the read projection, not with an existence query (K2/K6/K9). |
| `tool_invocations` | `INSERT OR IGNORE`, `HistoryDB.flush`, `C:\OSS\aictl\src\aictl\storage.py:3885`. | H, O via `append_tool_invocation`; P wrapper `C:\OSS\aictl\src\aictl\project_stores.py:1010–1015`. | Ingest source-keyed call evidence or a full call version from the local correlator (K1/K2/K6). |
| `hook_calls` | `_HOOK_CALL_INSERT` (`INSERT OR IGNORE`), `HistoryDB.flush`, `C:\OSS\aictl\src\aictl\storage.py:880,3903`. | H via `append_hook_call`; P wrapper `C:\OSS\aictl\src\aictl\project_stores.py:1016–1021`. | Ingest by call identity. Separate payload text for K7. |
| `session_processes` | Two `INSERT OR IGNORE` sites: `link_session_processes`, `batch_link_sessions`, `C:\OSS\aictl\src\aictl\storage.py:4591,4668`. | H, D, O; P wrappers `C:\OSS\aictl\src\aictl\project_stores.py:1037–1058`. | Ingest the relationship by stable session and process identity; preserve first link semantics in the reader or producer (K6). |
| `sessions` | Placeholder `INSERT OR IGNORE`, `batch_link_sessions`, `C:\OSS\aictl\src\aictl\storage.py:4658`. | O; P wrapper `C:\OSS\aictl\src\aictl\project_stores.py:1051–1058`. | Ingest an OTel session/link fact; do not overwrite a richer session version with a placeholder (K1/K2). |
| `session_commits` | `INSERT OR IGNORE`, `upsert_session_commits`, `C:\OSS\aictl\src\aictl\storage.py:4826`. | E; P wrapper `C:\OSS\aictl\src\aictl\project_stores.py:1076–1082`. | Append by `(session_id, sha)` and dedup on read (K6). |
| `processes` | `INSERT OR IGNORE`, `upsert_process`, `C:\OSS\aictl\src\aictl\storage.py:5780–5784`. | No production caller found for this helper; snapshot writer is separate (D). | Remove if unused. If retained, append start fact keyed by process instance (K2/K6). |
| `session_steps`, `session_step_text` | `_STEP_INSERT`, plus text `INSERT OR IGNORE`, `_write_session_steps`, `C:\OSS\aictl\src\aictl\storage.py:1289,5918,5920`; invoked by `write_call_facts` at `:5994`. | T. | Append metadata and text keyed by `step_key`. K7 sets 30-day metadata/14-day text policies; capture gates text before handoff. |
| `session_prompts`, `skill_uses`, `context_events` | One `INSERT OR IGNORE` per table, `write_call_facts`, `C:\OSS\aictl\src\aictl\storage.py:5964,5973,5979`. | T. | Append facts by source key (K6); put prompt text in its own K7 table. |
| `file_write_events` | `INSERT OR IGNORE`, `record_file_write`, `C:\OSS\aictl\src\aictl\storage.py:5364`. | H; P wrapper `C:\OSS\aictl\src\aictl\project_stores.py:1153–1160`. | Ingest by canonical source-event identity; enforce transcript/hook precedence on read or through local correlation (K2/K6). |
| `file_blobs`, `files` | `INSERT OR IGNORE` of blobs by hash; plain `INSERT` of metadata-only discoveries, `_FileWrite.run`, `C:\OSS\aictl\src\aictl\storage.py:2015,2019`. | D via `sync_files_from_discovery`; `upsert_file` at `C:\OSS\aictl\src\aictl\storage.py:6248–6274` has no production caller found. | Ingest captured text into a separate K7 table by stable key; use full inventory state for each path, including metadata-only files (K1/K10). |
| `copilot_session_messages`, `cursor_session_messages` | One `INSERT OR IGNORE` per `_insert_message`, `C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:337`; `C:\OSS\aictl\src\aictl\ingesters\cursor_conversations.py:206`. | M (their polls); `writer_conn` bypasses HistoryDB methods (`C:\OSS\aictl\src\aictl\ingesters\_common.py:179–185`). | Ingest by source message identity. Do not use SQL `rowcount` to dedup or advance a cursor (K3/K6). Apply K7 to text. |
| `path_defs`, `process_defs` | Plain `INSERT` after clear, `_sync_path_specs` / `_sync_process_specs`, `C:\OSS\aictl\src\aictl\storage.py:6967,7004`. | `_init_schema` → `_sync_csv_to_db` (`C:\OSS\aictl\src\aictl\storage.py:2889–2890,6951–6958`); explicit `sync_specs` at `:7041–7049`, no external production caller found. | Use the registry directly where possible. If history needs these tables, ingest complete changed definitions keyed by stable registry key (K1/K6/K10). |
| Projection tables and `scoped_request_sessions`, `scoped_other_sessions` | Projection-only `INSERT`/`INSERT OR IGNORE`: `HistoryProjection.load` and `_projection`, `C:\OSS\aictl\src\aictl\dashboard\board_history.py:369,554,577,582`. | Board scoped read projection (`C:\OSS\aictl\src\aictl\dashboard\board_history.py:487,604,639`). | Remove the in-memory SQLite projection. Query Kusto directly; no ingestion (B2/B5). |

## Full-row upsert

| Table | Statement and owning method | Callers | Phase S replacement |
|---|---|---|---|
| `system_snapshots`, `process_snapshots` | One `INSERT OR REPLACE` per table, `HistoryDB.flush`, `C:\OSS\aictl\src\aictl\storage.py:3741,3787`. | D, `append_metrics`, `append_tool_metrics`. | Treat as sampled facts keyed by tick and process instance as applicable. Ingest; collapse duplicates by stable key (K6/K10). |
| `tool_stats` | `_TOOL_STATS_INSERT` (`INSERT OR REPLACE`) in `append_telemetry` and `append_telemetry_batch`, `C:\OSS\aictl\src\aictl\storage.py:1388,6199,6219`. | D (`C:\OSS\aictl\src\aictl\orchestrator.py:1266`). | Ingest samples with stable identity. Keep source-side suppression (K6/K10). |
| `session_usage` | `INSERT OR REPLACE`, `upsert_session_usage`, `C:\OSS\aictl\src\aictl\storage.py:5109`. | T; P forwarding at `C:\OSS\aictl\src\aictl\project_stores.py:1150`. | Ingest full usage snapshots with a source revision; compare source authority before counting (K1/K6). |
| `turn_request_links` | `INSERT OR REPLACE`, `write_call_facts`, `C:\OSS\aictl\src\aictl\storage.py:5997`. | T. | Ingest each complete link version by `request_key` (K1). |
| `session_artifacts`, `session_folders` | One `INSERT OR REPLACE` per table, `replace_session_artifacts`, `C:\OSS\aictl\src\aictl\storage.py:4880,4884`. | E; P forwarding at `C:\OSS\aictl\src\aictl\project_stores.py:1098`. | Ingest only changed keys and full folder summary versions. Keep the prior scan manifest locally to compute removals (K1/K3/K10). |
| `files`, `file_history` | One `INSERT OR REPLACE` per table, `_FileWrite.run`, `C:\OSS\aictl\src\aictl\storage.py:2028,2037`. | D via discovery and unused `upsert_file` helper above. | Ingest changed inventory plus immutable revision history. Keep metadata and text under separate K7 policies (K1/K6/K10). |
| `memory_snapshots` | `INSERT OR REPLACE`, `record_snapshot`, `C:\OSS\aictl\src\aictl\memory_snapshot.py:95,115`. | H via snapshot worker. | Ingest full snapshot entries per session/phase/file key; keep content separate and apply K7. |
| `datapoint_catalog` | `INSERT OR REPLACE`, `_sync_datapoint_catalog`, `C:\OSS\aictl\src\aictl\storage.py:2912,2920`; called by `_init_schema` and `sync_datapoint_catalog` at `:2905,7145`. | Q and store startup. | Combine static YAML and live builder fields in memory. Ingest only on a definition or source change; measure any materialized view after removing repeats (K1/K10; Phase S item 4). |
| `project_stores`, `store_info` | `INSERT OR REPLACE` index in `_save_index`; `INSERT OR IGNORE` store identity in `_open`, `C:\OSS\aictl\src\aictl\project_stores.py:626,654`. | P lifecycle and moves. | Delete both SQLite routing writes; replace them with a `project` column (K8). |
| `maintenance_state` | `INSERT OR REPLACE` in `HistoryDB._set_state`, Copilot `_save_cursor`, transcript `_save_checkpoints`, VS Code `_save_cursor`: `C:\OSS\aictl\src\aictl\storage.py:2846`; `C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:318`; `C:\OSS\aictl\src\aictl\ingesters\transcript_usage.py:1139`; `C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:180`. | M, T and A; backfills set markers at `C:\OSS\aictl\src\aictl\ingesters\loaded_files_backfill.py:85`, `C:\OSS\aictl\src\aictl\ingesters\otel_sessions_backfill.py:99`, `C:\OSS\aictl\src\aictl\ingesters\tool_size_backfill.py:88`. | Persist cursors/checkpoints locally (K3). Delete obsolete retention/trim bookmarks when native policies and text splits replace their consumers (K7). |

## Read-modify-write

This section includes partial `ON CONFLICT` merges and `UPDATE` predicates that read the existing row even when the caller does not issue a `SELECT`.

| Table | Statement and owning method | Callers | Phase S replacement |
|---|---|---|---|
| `tool_invocations` | `_TOOL_UPSERT` merges nonempty values, errors, sizes and other fields: `write_call_facts`, `C:\OSS\aictl\src\aictl\storage.py:1581–1598,5962`. | T. | Merge same-source revisions in local state if one writer owns the key; keep cross-source evidence separate and resolve by native read precedence (K1/K2/K3/K9). |
| `tool_invocations` | Completion by `dedup_key`, `update_tool_invocation_duration`, `C:\OSS\aictl\src\aictl\storage.py:5051`; rekey hook row to transcript key, `_promote_hook_tool_rows`, `:6031`. | H, T; P tries open stores until a match (`C:\OSS\aictl\src\aictl\project_stores.py:1211–1222`). | Pair pre/post hooks in local state. Give source rows stable identities; link hook and transcript evidence without changing stored keys. Preserve output and errors; emit completion evidence if the start is not present locally (K2/K3/K6/K9). |
| `tool_invocations` | Fill only missing byte sizes, `fill_tool_sizes`, `C:\OSS\aictl\src\aictl\storage.py:4932–4934`; clear aged pending status, `clear_stale_pending_confirms`, `:6118`. | T; P forwarding at `C:\OSS\aictl\src\aictl\project_stores.py:1101–1116,1224–1236`. | Derive sizes during source replay or retain keyed size evidence that fills only missing fields at read time. Compute pending expiration from source timestamp and local timers/read time. It is not age deletion (K2/K3/K9). |
| `requests` | `_REQUEST_UPSERT` partial conflict merge, `write_call_facts`, `C:\OSS\aictl\src\aictl\storage.py:1530–1549,5961`. | T. | Complete same-source versions locally; use read authority for source overlap and deterministic identity for retry (K1/K2/K6). |
| `sessions` | `_SESSION_UPSERT` partial merge, `upsert_sessions`, `C:\OSS\aictl\src\aictl\storage.py:1891–1912,4538`; `update_session_stats` and `update_session_end`, `:4716,4778`. | H, D, T, M, O; P forwarding at `C:\OSS\aictl\src\aictl\project_stores.py:1024–1074`. | Maintain session lifecycle state locally. Emit complete owned versions or attributed lifecycle/counter facts; preserve existing merge and terminal-state semantics without a read of Kusto (K1/K2/K3/K9). |
| `agents` | `_AGENT_UPSERT`, `upsert_agents`, `C:\OSS\aictl\src\aictl\storage.py:1926–1940,5865`; `_SUBAGENT_UPSERT`, `write_call_facts`, `:1628–1637,5991`. Both preserve prior fields. | D, T; P `C:\OSS\aictl\src\aictl\project_stores.py:1163–1174`. | Use local team state for complete versions; read-side resolution across sources preserves earliest start, role and completion (K1/K2/K9). |
| `session_loaded_files`, `session_context_items` | One conditional conflict merge per table, `write_call_facts`, `C:\OSS\aictl\src\aictl\storage.py:1646–1652,1663–1669,5992–5993`. | T and its backfills. | Select the first loaded-file observation for time/agent; retain useful metadata. Select context state by source revision including removal. Compute locally for owned keys or at read time from distinct evidence (K1/K2/K6). |
| `file_write_events` | Upsert changes only detail and tool, `_write_transcript_file_edits`, `C:\OSS\aictl\src\aictl\storage.py:6049–6053`. | T. | Use complete transcript versions or project source authority on read (K1/K2/K9). |
| `requests`, `tool_invocations`, `session_prompts`, `skill_uses`, `agents`, `file_write_events`, `context_events`, `session_loaded_files`, `session_context_items` | Dynamic `UPDATE ... SET tool`, `set_sessions_tool`, `C:\OSS\aictl\src\aictl\storage.py:6095–6108`. | T through split/usage attribution forwarding (`C:\OSS\aictl\src\aictl\project_stores.py:1202–1209`). | Write a keyed session attribution fact; resolve the join at read time, or update locally owned complete rows (K2/K8/K9). |
| `events` | Fill empty `session_id` only, `set_event_sessions`, `C:\OSS\aictl\src\aictl\storage.py:4959`. | O late binding and historical repair. | Ingest keyed trace-to-session evidence; join on read without scanning events to decide which rows to patch. Remove the runtime historical repair (K2/K3/K9). |
| `processes` | Exit patch, `update_process_exit`, `C:\OSS\aictl\src\aictl\storage.py:5814`. | No production caller found for this helper. | Remove if unused. Otherwise an exit fact or a complete locally owned process version (K2). |
| `files` | Metadata-only `UPDATE`, `_FileWrite.run`, `C:\OSS\aictl\src\aictl\storage.py:2024`. | D via file sync; unused `upsert_file` helper. | Complete inventory version from local manifest. Do not read Kusto to preserve old content hash/first-seen (K1/K3/K10). |
| `tool_config`, `environment_vars` | Lookup latest then `INSERT OR REPLACE`, `upsert_tool_config` / `upsert_env_var`, `C:\OSS\aictl\src\aictl\storage.py:6154,6182`. | No production caller found for either helper. | Remove if unused. Otherwise compare in local state and ingest a complete observed change without exposing secrets (K1/K3/K10). |
| `data_quality_status` | Read count/last OK then `INSERT OR REPLACE`, `record_data_quality`, `C:\OSS\aictl\src\aictl\storage.py:5444–5454`. | Q; flush failure also records quality (`C:\OSS\aictl\src\aictl\storage.py:3955`). | Append status events and aggregate count/last OK, or keep those values in a sole owner's local state and ingest full status (K2/K3). |
| `datapoint_catalog` | `UPDATE source_dynamic, updated_at`, `update_datapoint_sources`, `C:\OSS\aictl\src\aictl\storage.py:7137`. | Q via sink source builders. | Ingest complete changed catalog records using in-memory static plus dynamic fields (K1/K10). |
| `vscode_chat_messages` | `_MESSAGE_UPSERT_SQL` partial update, `_insert_message` and `_flush_message_batch`, `C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:81–89,500,507`. | M. | Build complete message versions from the local snapshot and stream revisions. Preserve `(session_id, source_file, source_row_id)` semantics or use a deterministic source identity with explicit rewrite generation (K1/K3/K6). |
| `PROJECT_TABLES` | `_move_rows`: `INSERT OR IGNORE ... SELECT`, transaction at `C:\OSS\aictl\src\aictl\project_stores.py:895–900`; table list `:68–89`. | P session routing/retry and machine split. | Delete the copy path. Carry `project` on every row; resolve late attribution by session key rather than copying and deleting old rows (K8/K9). |
| `events` | One-time `UPDATE` of old drive-root file events, `m032.apply`, `C:\OSS\aictl\src\aictl\storage_migrations\m032_project_folders.py:23–30`. | Store open via the migration runner. | Historical data repair, not a collector. Delete SQLite migration with B8. If old data must be imported, normalize project attribution before loading it (K8/K9). |

## Delete

| Table | Statement and owning method | Callers | Phase S replacement |
|---|---|---|---|
| `session_artifacts` | Delete prior session scan, `replace_session_artifacts`, `C:\OSS\aictl\src\aictl\storage.py:4878`. | E, P. | Compare local manifests; ingest tombstones only for keys no longer present (K1/K3/K9). |
| `file_write_events` | Delete competing source rows by session/source ID, `_write_transcript_file_edits`, `C:\OSS\aictl\src\aictl\storage.py:6044`. | T. | Resolve source precedence in the read projection or emit tombstones for known exact source keys. Do not query for victims (K1/K6/K9). |
| `requests`, `tool_invocations` | Delete competing rows through the transcript's newest timestamp, `_drop_superseded_rows`, `C:\OSS\aictl\src\aictl\storage.py:6076–6093`. | T. | Ingest per-session/source coverage facts; filter lower-authority rows only within the covered range on read. Preserve later observations (K2/K6/K9). |
| `files` | One path delete in `remove_file`; batch delete of gone paths in `sync_files_from_discovery`, `C:\OSS\aictl\src\aictl\storage.py:6382,6482`. | D for scan removals; no production caller found for `remove_file`. | Ingest path tombstones based on local manifest and complete scan results (K1/K3/K10). |
| `path_defs`, `process_defs` | Clear all in `_sync_path_specs` / `_sync_process_specs`, `C:\OSS\aictl\src\aictl\storage.py:6965,7002`. | Store bootstrap and `sync_specs`, as above. | Use registry directly, or tombstone removed known definition keys from the local manifest (K1/K3/K9). |
| `vscode_chat_messages` | Delete rows after a source file rewrite, `_cut`, `C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:426–433`. | M VS Code snapshot/replay path. | Use local known IDs for tombstones or ingest a new source generation and suppress its obsolete tail in reads (K1/K3/K6/K9). |
| `PROJECT_TABLES` | Delete old copy after move, `_move_rows`, `C:\OSS\aictl\src\aictl\project_stores.py:907`; table list `:68–89`. | P. | Remove with the move and per-project files (K8). |

## Age cleanup and local size budget

Automatic cleanup must not query or delete old rows per poll. Apply K7 with native schema. The plan keeps *explicit* `db trim-text` as a native soft delete of selected text records; this is an operator action, not the scheduled age cleanup (`C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\ui-rewrite-plan.md:235,265–280`). An ingested blank version is not a text deletion.

| Table | Statement and owning method | Callers | Phase S replacement |
|---|---|---|---|
| `system_snapshots`, `process_snapshots`, `events`, `hook_calls`, `metrics`, `tool_stats`, `file_history`, `requests`, `tool_invocations`, `session_prompts`, `session_steps`, `session_step_text`, `turn_request_links`, `skill_uses`, `context_events` | `DELETE` in chunks, `_delete_range`, `C:\OSS\aictl\src\aictl\storage.py:7280`; `compact` selects tables and cutoffs at `:7205–7255`. SQLite metrics use a 7-day cutoff here. | A, P. | Remove automatic SQL cleanup and `db compact`. Configure native age policy (plan: 30 days metadata, 14 days text). Do not carry the SQLite 7-day exception into the plugin as an implicit default (K7). |
| `file_blobs` | `DELETE` where a blob has no file or history reference, `compact`, `C:\OSS\aictl\src\aictl\storage.py:7260–7262`. | A, P. | Remove reference scans from daemon. Text table has its own K7 policy; handle expired references as unavailable. |
| `metrics` | Keep one row per bucket by `DELETE` with `MAX(rowid)` subquery, `_downsample_metrics`, `C:\OSS\aictl\src\aictl\storage.py:7677–7685`. | A through `compact`. | Apply K10 on write; aggregate in KQL on read (or a measured view), not by deleting source rows (K1/K7). |
| `system_snapshots`, `process_snapshots` | Delete bucket then `INSERT OR REPLACE` aggregate, `_downsample` / `_downsample_process_snapshots`, `C:\OSS\aictl\src\aictl\storage.py:7738,7741,7791,7795`. | A through `compact`. | Use a read-side time-bin aggregation; leave retention to policy (K1/K7). |
| `maintenance_state` | `INSERT OR IGNORE retention_armed_at`: `HistoryDB._retention_floor`, `ProjectStores._open`, `C:\OSS\aictl\src\aictl\storage.py:7301`; `C:\OSS\aictl\src\aictl\project_stores.py:664`. | A, P. | Remove SQLite retention floor and cross-file propagation. Native policy owns expiry (K7). |
| Text columns in `vscode_chat_messages`, `cursor_session_messages`, `copilot_session_messages`, `session_prompts`, `session_step_text`, `tool_invocations`, `file_history`, `agents`, `files`, `file_blobs`, `hook_calls`, and `session_prompts_observations`, `tool_invocations_observations`, `agents_observations` when enabled | Chunked blanking `UPDATE`, `_trim_table_text`, `C:\OSS\aictl\src\aictl\storage.py:7387`; table/column sets at `:2325–2342,7361–7364`. The streaming `session_step_text` case checks count then runs native soft delete at `:7374–7380`. | A, P. | Ingest text separately and omit it at capture-policy handoff where required. Scheduled expiry is retention. Explicit `db trim-text` soft-deletes the text tables only (K5/K7). |
| JSON fields in `events`, `hook_calls` | `SELECT` to strip keys then one `UPDATE` per table, `_trim_event_text`, `C:\OSS\aictl\src\aictl\storage.py:2388–2393,7404–7418`. | A, P. | Separate text payload from metadata at capture; native policy for text. No scan/rewrite loop (K5/K7/K9). |
| `_TEXT_COLUMNS` (11 baseline tables above); `_EVICTION_ORDER` (`vscode_chat_messages`, `cursor_session_messages`, `copilot_session_messages`, `session_step_text`, `session_steps`, `turn_request_links`, `metrics`, `events`, `hook_calls`, `process_snapshots`, `system_snapshots`, `tool_stats`, `file_history`, `context_events`, `session_prompts`, `skill_uses`, `file_write_events`, `tool_invocations`, `requests`) | Budget text blanking `UPDATE` and oldest-row `DELETE`, `_evict_text` / `_evict_oldest`, `C:\OSS\aictl\src\aictl\storage.py:7572,7590`; lists at `:2325–2337,2399–2424`. | `enforce_budget` (`C:\OSS\aictl\src\aictl\storage.py:7515–7539`) from the flush-error path and A auto-maintenance (`:2805,7320`). | Delete SQLite disk-budget eviction. Keep K4 queue limits and drop counters; enforce K7 by policy. |
| SQLite file and WAL | `PRAGMA incremental_vacuum`; `PRAGMA wal_checkpoint(PASSIVE/TRUNCATE)`; `PRAGMA busy_timeout`; `PRAGMA auto_vacuum=INCREMENTAL`; `VACUUM`. `auto_maintain`, `_truncate_wal`, `vacuum`, `C:\OSS\aictl\src\aictl\storage.py:7322–7327,7496–7500,7651–7653`. | A, P, size budget. | Remove local page and WAL maintenance. `db reset` is a separate confirmed native operation, not retention. |
| Database policy | Native `.alter-merge database ... policy retention` in `_kusto_maintain`, `C:\OSS\aictl\src\aictl\storage.py:7344`; then trim at `:7346–7349`. | A automatic path in Kusto mode. | Install retention once per schema or policy change, per table, in the plugin (K7/B8). Do not issue it on each maintenance interval. |

## Schema and SQLite infrastructure

Baseline DDL runs in `HistoryDB._init_schema` at `C:\OSS\aictl\src\aictl\storage.py:2886`. Project `_open` initializes a `HistoryDB` subclass and `_migrate_stores` opens old files (`C:\OSS\aictl\src\aictl\project_stores.py:528–537,637–654`). Use native `.create-merge table` and table definitions (B8), configure retention (K7), and replace unique constraints with stable keys and read dedup (K6). SQLite indexes, local version rows and file/admin pragmas have no writer replacement.

| Table or object | Statement sites and owning method | Callers | Phase S replacement |
|---|---|---|---|
| `schema_version`, `tools`, `projects`, `processes`, `process_snapshots`, `system_snapshots`, `sessions`, `session_processes`, `session_commits`, `agents` | `_SCHEMA_SQL` table DDL `C:\OSS\aictl\src\aictl\storage.py:122,128,132,139,146,153,167,177,182,189`; indexes `:188,459–473`. | `_init_schema`, P. | Keep only needed native tables; remove SQLite version and indexes. |
| `requests`, `context_events`, `tool_invocations`, `session_prompts`, `session_steps`, `session_step_text`, `turn_request_links`, `skill_uses` | `_SCHEMA_SQL` DDL `C:\OSS\aictl\src\aictl\storage.py:200,216,226,240,247,257,261,266`; indexes `:213,222–224,236,244–246,256,260,265,270–272,475–482`. | `_init_schema`, P. | Native fact definitions; select stable keys and isolate text. |
| `file_blobs`, `files`, `file_history`, `file_write_events`, `session_folders`, `session_artifacts`, `session_loaded_files`, `session_context_items` | `_SCHEMA_SQL` DDL `C:\OSS\aictl\src\aictl\storage.py:276,280,288,294,307,312,320,327`; indexes `:303–304,317,484–490`. | `_init_schema`, P. | Native inventory and fact definitions with K7/K8. |
| `maintenance_state`, `data_quality_status`, `tool_config`, `environment_vars`, `tool_stats`, `events`, `hook_calls`, `metrics`, `path_defs`, `process_defs`, `memory_snapshots` | `_SCHEMA_SQL` DDL `C:\OSS\aictl\src\aictl\storage.py:334,338,348,353,362,374,383,399,409,430,517`; indexes `:396–398,492–513,526–527`. | `_init_schema`, P. | Native retained state/fact definitions; no SQLite maintenance-table dependency. |
| `datapoint_catalog`, `cursor_session_messages`, `copilot_session_messages`, `session_usage`, `vscode_chat_messages` | `_SCHEMA_SQL` DDL `C:\OSS\aictl\src\aictl\storage.py:620,641,653,669,687`; indexes `:638,648–650,663–666,685,698–702`. | `_init_schema`, P. | Native retained state and text definitions. |
| Schema version and columns | `INSERT OR REPLACE` in `_init_schema` and `apply_pending`, `C:\OSS\aictl\src\aictl\storage.py:2898`; `C:\OSS\aictl\src\aictl\storage_migrations\__init__.py:107`. Dynamic `ALTER TABLE` in `_ensure_columns`, `C:\OSS\aictl\src\aictl\storage.py:3370` (no production caller found). | Store open; migration runner. | Native version/column deployment, not SQLite migrations. |
| Text guards | Dynamic `CREATE TEMP TRIGGER` for each guarded column on after-insert/after-update; body `UPDATE` blanks text. `_install_capture_guards`, `C:\OSS\aictl\src\aictl\storage.py:2820–2842`; table/field list and exclusions `:2325–2345`. | `_conn`, `_init_schema` (`C:\OSS\aictl\src\aictl\storage.py:2766,2909`). | Put capture/redaction before writer handoff; use text policy. Delete triggers and their body updates (K5/K7). |
| SQLite connections | Write pragmas `auto_vacuum`, `journal_mode`, `synchronous`, `temp_store`, `cache_size`, `wal_autocheckpoint`, `journal_size_limit`, `max_page_count`. `_conn` and `_open_memory_store`, `C:\OSS\aictl\src\aictl\storage.py:2750–2763,2787`. | All SQLite opens/fallbacks. | Delete; use native ingestion, K4 queue behavior and K5/K11. |
| `project_stores`, `store_info`, attached `mv` | `CREATE TABLE` in `_load_index`, `_open`; `ATTACH`/`DETACH` in `_move_session`, `C:\OSS\aictl\src\aictl\project_stores.py:506,653,863,875`. | P. | Remove with per-file routing (K8). |
| Project read projection temps | `_read_state` pragmas (`synchronous`, `cache_size`, `temp_store`), `_attach` and `_copy_stores`: `ATTACH`, `CREATE TEMP VIEW`, `CREATE TEMP TABLE ... AS SELECT`, `INSERT ... SELECT`, `DETACH`, `CREATE INDEX`, `C:\OSS\aictl\src\aictl\project_stores.py:1600–1604,1627,1654,1666,1673,1694,1701,1703`. | P query readers; also supports session lookup by Cursor (see decisions below). | Use native named read views scoped by project. Temporary SQL write traffic disappears (K8/B2). |
| Board read projection temps | Constructor creates per-source tables and both scoped session helper tables; `seal` creates indexes and sets `query_only`. `C:\OSS\aictl\src\aictl\dashboard\board_history.py:284–293,371–380`. | Scoped board projection. | No SQLite projection in Phase S (B2/B5). |
| Pre-v20 legacy tables | Loop `DROP TABLE IF EXISTS`, `m020.apply`, `C:\OSS\aictl\src\aictl\storage_migrations\m020_drop_legacy_tables.py:21–39`. | `_init_schema` → `apply_pending` for old SQLite files. | Do not port drops. |
| `sessions`, `tool_invocations`, `maintenance_state` | Column additions: `m021.apply` `C:\OSS\aictl\src\aictl\storage_migrations\m021_sessions_add_pid.py:23`; `m028.apply` `C:\OSS\aictl\src\aictl\storage_migrations\m028_tool_invocations_source_event_id.py:29`; `m033.apply` `C:\OSS\aictl\src\aictl\storage_migrations\m033_tool_call_sizes.py:18`; `m037.apply` `C:\OSS\aictl\src\aictl\storage_migrations\m037_maintenance_text.py:20`. | Same. | Generate native definitions from final supported schema; retire SQLite `ALTER`s and maintenance state. |
| `session_commits`, `cursor_session_messages`, `memory_snapshots`, `copilot_session_messages`, `vscode_chat_messages` | Table and index creation in each `apply`: `C:\OSS\aictl\src\aictl\storage_migrations\m022_session_commits.py:21,33`; `C:\OSS\aictl\src\aictl\storage_migrations\m023_cursor_session_messages.py:24,34`; `C:\OSS\aictl\src\aictl\storage_migrations\m024_memory_snapshots.py:22,34`; `C:\OSS\aictl\src\aictl\storage_migrations\m025_copilot_session_messages.py:24,37,41`; `C:\OSS\aictl\src\aictl\storage_migrations\m026_vscode_chat_messages.py:20,34,38`. | Same. | B8 definitions; no SQLite table/index steps. |
| `file_write_events`, `data_quality_status`, `session_usage` | Table/index creation in each `apply`: `C:\OSS\aictl\src\aictl\storage_migrations\m027_file_write_and_data_quality.py:21,41,45,49,53,59,75,79`; `C:\OSS\aictl\src\aictl\storage_migrations\m029_session_usage.py:23,54`. | Same. | B8 definitions. |
| `requests`, `tool_invocations`, `session_prompts`, `skill_uses`, `context_events` | `m030.apply`: dynamic column adds and create statements, `C:\OSS\aictl\src\aictl\storage_migrations\m030_board_facts.py:14–41,48,55`; `m031.apply`: context table/indexes and request columns, `C:\OSS\aictl\src\aictl\storage_migrations\m031_context_facts.py:19,26–27,34`. | Same. | B8 definitions. |
| `session_folders`, `session_artifacts`, `sessions`, `session_loaded_files`, `session_context_items`, `hook_calls` | Table/index creation in each `apply`: `C:\OSS\aictl\src\aictl\storage_migrations\m034_session_artifacts.py:20,24,28,36`; `C:\OSS\aictl\src\aictl\storage_migrations\m035_session_loaded_files.py:17`; `C:\OSS\aictl\src\aictl\storage_migrations\m036_session_context_items.py:21`; `C:\OSS\aictl\src\aictl\storage_migrations\m038_hook_calls.py:18,30–32`. | Same. | B8 definitions. |
| Kusto native setup and catalog | `select_history_layout`, `ensure_schema`, `_clear_streaming_schema_cache`, `ensure_observation_cutover`: `C:\OSS\aictl\src\aictl\kusto\connection.py:775–865`; table/streaming/info table commands `C:\OSS\aictl\src\aictl\kusto\schema.py:235–237,468–469`; generated functions `C:\OSS\aictl\src\aictl\kusto\observations.py:139–153`. | Kusto startup/initialization and observation layout. | Keep idempotent native schema/policy setup in the plugin; remove re-parsing SQL and legacy layout bootstrap when no reader/writer needs them. Use native typed setup metadata, not ad hoc runtime mutations (B8/K7/K9). |
| Raw OTel schema | Native table create and column descriptions, `C:\OSS\aictl\src\aictl\kusto\otel.py:243–257`; management setup `C:\OSS\aictl\src\aictl\kusto\otel_sink.py:386–425`. | O remote native sink. | Bring OTel definitions and permission reporting into shared B8/K7 setup. Keep ingestion behind the plugin. |

`db reset` does not use a SQL `DELETE`; it removes local files and opens the store again (`C:\OSS\aictl\src\aictl\commands\admin.py:421–455`). Use the plan's confirmed `.clear table data` operation in the plugin. The raw sink sends `OTELLogs`, `OTELMetrics`, `OTELTraces` and `OTELPayloads` without SQL (`C:\OSS\aictl\src\aictl\kusto\otel.py:57–60,895,969,1082`; `C:\OSS\aictl\src\aictl\kusto\otel_sink.py:165,383–384`). The typed observation path also bypasses this SQL list. Preserve its no-query handoff in the new writer (K9); replace layout-specific checks with one plugin interface (B1).

## Store reads that affect writes (K3/K9)

This list includes SQL reads in callers, implicit reads in SQL and the compatibility layer's Kusto queries. Store bootstrap, diagnostics, explicit operator maintenance and external source reads are identified separately. None justify a store read inside a collector write.

| Group | Decision read or write-result gate | Phase S action |
|---|---|---|
| **H, T — tool calls** | `_receive_hook` branches on `update_tool_invocation_duration` success before its insert fallback (`C:\OSS\aictl\src\aictl\dashboard\web_server.py:953–981`). `HistoryDB` gets `rowcount` after the patch (`C:\OSS\aictl\src\aictl\storage.py:5050–5055`); split storage probes each open store the same way (`C:\OSS\aictl\src\aictl\project_stores.py:1211–1222`). `_promote_hook_tool_rows` queries matching source-event IDs before rekeying (`C:\OSS\aictl\src\aictl\storage.py:6022–6033`). Partial merges, fill-only and pending expiry read existing row values through SQL (`:1585–1598,4932–4934,6118`). | Use the in-memory pre/post hook map, explicit source revisions and source replay. A missing local start does not authorize an existence query: ingest independent completion evidence under the same call identity. |
| **D, O, T — request facts** | `flush` calls `_fill_folders_from_sessions` and `_sessions_read_from_transcripts` before writes (`C:\OSS\aictl\src\aictl\storage.py:3850–3858`). The helper `SELECT`s look up `sessions.project_path` and existing transcript `requests` (`:1518–1525,1868–1886`). Partial request merges and transcript coverage predicates consult stored facts (`:1535–1549,6076–6093`). | Take project and source ownership from producer/session state or resolve them in reads. Ingest each distinct observation without asking whether a higher-authority row is already visible. |
| **H, T, D, O, M — session and agent state** | `_SESSION_UPSERT`, `_AGENT_UPSERT`, `_SUBAGENT_UPSERT`, session patch/update predicates and `set_sessions_tool` consult existing state (`C:\OSS\aictl\src\aictl\storage.py:1628–1637,1891–1940,4716,4778,6105–6108`). Hook session end also calls `get_session` for a Git attribution start time fallback (`C:\OSS\aictl\src\aictl\dashboard\web_server.py:877–892`; SQL at `C:\OSS\aictl\src\aictl\storage.py:5012`). | Feed start/project/source information into local lifecycle state. Use full versions or source observations and a read resolver. If the start is unknown, defer attribution or report it unavailable; do not treat it as zero. |
| **H, T — file edits and context** | `record_file_write` checks for an existing transcript file-write row before accepting a hook observation (`C:\OSS\aictl\src\aictl\storage.py:5349–5358`). `_write_transcript_file_edits` predicates on existing competing rows (`:6044–6053`); loaded-file/context upserts compare stored fields or timestamps (`:1646–1669`). `_write_session_steps` reads `content_trimmed_before` to decide if old text can be written (`:5892–5916`). | Resolve source identity and ordering from source evidence/local state. Keep a manual trim watermark locally if old input must not reintroduce deleted text; apply capture and age policy before handoff (K5/K7). |
| **D — file inventory and optional settings** | `upsert_file` loads mtime/hash/first-seen/last-changed; `sync_files_from_discovery` reads the last inventory to choose new, changed and gone paths (`C:\OSS\aictl\src\aictl\storage.py:6266,6420–6482`). `upsert_tool_config` / `upsert_env_var` select the most recent value to suppress duplicates (`:6146–6153,6172–6181`); no production caller found. | Keep an atomically saved manifest and a bounded latest-value cache. Do not query Kusto to choose a write (K3/K10). |
| **O — late attribution and repair** | `tie_otel_traces` flushes and then selects unbound event row IDs per trace (`C:\OSS\aictl\src\aictl\storage.py:4984–4996`); the unresolved-observation branch avoids this (`:4977–4983`). Historical backfill scans unbound events and bound trace links (`C:\OSS\aictl\src\aictl\ingesters\otel_sessions_backfill.py:36,47–70,92–99`). | Use the no-read trace/session evidence pattern. Resolve attribution from evidence on read. Remove the runtime repair or run a separate offline migration if old data must be converted. |
| **M — chat correlation** | Copilot and VS Code use `session_tool` to choose the target ID (`C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:360`; `C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:519`; `C:\OSS\aictl\src\aictl\ingesters\_common.py:188–195`). Cursor chooses an active session using `sessions_where` or SQL on `sessions` (`C:\OSS\aictl\src\aictl\ingesters\cursor_conversations.py:220–234`; `C:\OSS\aictl\src\aictl\project_stores.py:1501–1517`). Return counts come from SQL `rowcount` in the three message writers (`C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:342`; `C:\OSS\aictl\src\aictl\ingesters\cursor_conversations.py:211`; `C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:500–508`). | Provision from known runtime/source attribution or keep correlation unresolved; use deterministic message IDs and local accepted/checkpoint counts, not history visibility. |
| **M, T, O — restart state** | Copilot `_stored_cursor` reads local-store `maintenance_state` (`C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:306–313`); VS Code `_load_cursor` and transcript `_load_checkpoints` read `text,value` (`C:\OSS\aictl\src\aictl\ingesters\vscode_chat_logs.py:150–168`; `C:\OSS\aictl\src\aictl\ingesters\transcript_usage.py:1112–1127`). Run-once backfills read `HistoryDB.state_value` (`C:\OSS\aictl\src\aictl\storage.py:4998–5001`) from `C:\OSS\aictl\src\aictl\ingesters\loaded_files_backfill.py:66`, `C:\OSS\aictl\src\aictl\ingesters\tool_size_backfill.py:72`, and `C:\OSS\aictl\src\aictl\ingesters\otel_sessions_backfill.py:92`. | Save offsets, file revisions and any retained run-once markers in local JSON. Advance only after successful handoff; report rows lost after handoff under K4. Retries reuse their source keys. |
| **E — artifacts** | Initial `_seen` signatures come from `artifact_scans` (`C:\OSS\aictl\src\aictl\ingesters\session_artifacts.py:162`; SQL at `C:\OSS\aictl\src\aictl\storage.py:4893–4899`). Session eligibility can use the split-store `knows_session` map (`C:\OSS\aictl\src\aictl\ingesters\session_artifacts.py:155–160`; `C:\OSS\aictl\src\aictl\project_stores.py:842–847`), which is seeded from store rows. | Persist scan signatures and artifact keys locally. Use live/session source identity for eligibility. |
| **Q — data quality** | `record_data_quality` reads `count` and `last_ok_at` before replacing status (`C:\OSS\aictl\src\aictl\storage.py:5444–5454`). | Count distinct quality events on read, or own the complete state locally and publish changed versions. |
| **P — routing and move** | `_load_index`, `_migrate_stores`, `_load_sessions` read index/session/file schema and `store_info` (`C:\OSS\aictl\src\aictl\project_stores.py:310–335,510–565`). `_open` reads machine retention marker (`:657–664`). `_find_store` checks multiple lookup queries (`:123–130,1538–1564`), including for `fill_tool_sizes` (`:1101–1116`). `split_machine_sessions` selects project from `sessions` or `requests` (`:950–952`). `_move_rows` reads columns, source rowid boundary and time range before copying and deleting (`:884–907,1752–1754`). | Delete file routing. Use `project` plus producer-known session/project attribution. Correct a project assignment through keyed attribution facts or a locally built complete version, not a copy pass. |
| **A — retention and budget** | Retention arming (`C:\OSS\aictl\src\aictl\storage.py:7299–7307`); age, downsample and orphan-blob predicates (`:7259–7262,7279–7283,7675–7685,7700–7729,7762–7782`); count and JSON selects before text trim (`:7374,7404`); page/size probes and cutoff scan before eviction (`:7461–7484,7521–7537,7564–7573,7589–7592`). | Remove background decisions in favor of table policies and K4 queue limits. A `db stats` read or a confirmed explicit text trim is an admin operation, not a collector write decision. |
| **All SQL writes — Kusto adapter** | `_resolve` calls `_existing` to check conflicts and `_passing` to evaluate `DO UPDATE WHERE` (`C:\OSS\aictl\src\aictl\kusto\connection.py:1302–1352,1354–1428`). `_mutate` reads the current rows and then ingests versions (`:1189–1229`). These reads can also wait for past ingestion via `_wait_for_ingestion` (`:1494–1499`), which can issue a queued-ingestion visibility query (`C:\OSS\aictl\src\aictl\kusto\ingest.py:365–407`). | Remove SQL conflict/mutation execution and the associated visibility wait from writes. Ingestion health can report acknowledgments, queue state and errors without a write decision depending on a read. |
| **Schema bootstrap / doctor** | SQLite `_init_schema` tests `sqlite_master` and schema version before seeding; `_ensure_columns` reads `table_info`, with no production caller found (`C:\OSS\aictl\src\aictl\storage.py:2864–2908,3360–3370`). Native layout/cutover checks and schema probes live at `C:\OSS\aictl\src\aictl\kusto\connection.py:775–865` and `C:\OSS\aictl\src\aictl\kusto\otel_sink.py:400–410`. Doctor's SQLite fallback reads `MAX(ingested_at)` and `COUNT(*)` for status (`C:\OSS\aictl\src\aictl\dashboard\ingester_runner.py:335–365`); it does not drive ingestion. | Keep setup and capability checks out of row handoff. Replace doctor fallback with local marker/status (K3). |

Queries against the other tools' input files do not violate K3. Examples are Cursor message selection (`C:\OSS\aictl\src\aictl\ingesters\cursor_conversations.py:152–189`), Copilot's source tables (`C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:215–272`), and transcript usage inputs (`C:\OSS\aictl\src\aictl\ingesters\transcript_usage.py:707–828`). Keep those readers lazy under B7. Board temporary projection SQL does not persist telemetry; delete it as a read-path change.

## Kusto evidence

### Plan baseline

Plan section 3.1.1 (`C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\ui-rewrite-plan.md:95–154`) reports three pre-fix dev daemons on `aictl_current`, sampled on November 19, 2026:

| Measure | Plan observation |
|---|---:|
| All daemon query records | 23,800 in an hour, about **397/min**; 4,236 query CPU seconds |
| `tool_invocations` current-state query records for the two listed nodes | 2,767 + 2,315 in an hour, about **85/min**; 2,502 query CPU seconds, **59%** of total |
| Inline `DataIngestPush` management commands | 188,815 in about 36 hours, about **87/min** |
| `.set-or-append` management commands | No separate command count in section 3.1.1. Do not treat its `tool_invocations` query count as a command count. |

The plan counts recent ingested rows, not ingest operations: `metrics` 57,137/min (47,178/min `aictl.file.*`, 8,274/min `process.*`), `OTELMetrics` 2,910/min, `session_steps` 772/min, `events` 471/min, `tool_invocations` 278/min, `process_snapshots` 241/min, `requests` 69/min and `hook_calls` 7/min (`C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\ui-rewrite-plan.md:103–148`). The plan's source queries are `q03_cmds.kql:1`, `q04_queries.kql:1–3`, `q17_metrics_rate.kql:1–3` in that same plan folder. Its `system_snapshots` query cost (520 CPU seconds for 10 queries) is a read cost, not a measured collector CPU share.

### Current read-only sample

Cluster `https://zaictl.swedencentral.dev.kusto.windows.net`, database `aictl_current`, 2026-11-19 23:11 through 2026-11-20 00:11 UTC (end excluded). Used `C:\Tools\net8.0\Kusto.Cli.exe -execute` against the same endpoint as the wrapper (`C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\kq.ps1:10`) to avoid extra files. The summary uses 60 one-minute bins (client request ID `Kusto.Cli;4fac878d-aa35-4e04-aade-f8e3dccdd6c7`). See [minute-by-minute counts](#minute-by-minute-counts) for the individual bins.

| Visible records for applications `aictl` and `cli.py` | Hour | Mean per minute | Peak minute |
|---|---:|---:|---:|
| `Query` (database, both applications) | 9,211 | 153.52 | 312 |
| `Query` with local node name in text | 8,626 | 143.77 | 290 |
| Inline `DataIngestPush` (database, both applications) | 640 | 10.67 | 31 |
| `.set-or-append` (command type or text prefix) | 0 | 0 | 0 |

The management log filters do not prove which daemon issued a command. A node name in query text is a scope hint, not client identity. None of the 640 inline records contained the local node name in text. This count does not include SDK streaming/queued ingestion operations that are not surfaced as `DataIngestPush`. Zero observed `.set-or-append` records does not imply zero mutation queries, or that all deployed daemons run the audited revision. This sample is not a controlled comparison with the plan's three-daemon baseline.

```kusto
.show commands-and-queries
| where StartedOn >= datetime(2026-11-19 23:11:00) and StartedOn < datetime(2026-11-20 00:11:00)
| where Database == 'aictl_current' and Application in~ ('aictl', 'cli.py')
| summarize Queries=countif(CommandType == 'Query'),
            QueriesMentioningLocalNode=countif(CommandType == 'Query' and Text contains 'desktop-1c0ea28'),
            DataIngestPush=countif(CommandType == 'DataIngestPush'),
            SetOrAppend=countif(CommandType =~ 'TableSetOrAppend' or Text matches regex @'^\s*\.set-or-append\b')
  by Minute=bin(StartedOn, 1m)
```

In the same hour, rows with `node_id =~ 'desktop-1c0ea28'` and `ingestion_time()` in the window averaged:

| Table | Rows/min |
|---|---:|
| `metrics` | 13,722.22 |
| `OTELMetrics` | 3,004.90 |
| `requests` | 279.77 |
| `events` | 180.82 |
| `process_snapshots` | 66.93 |
| `tool_invocations` | 35.73 |
| `session_steps` | 5.20 |
| `hook_calls` | 3.13 |
| `OTELTraces` | 2.55 |

The row-rate query (client request ID `Kusto.Cli;e9b58101-00bd-4b23-b14c-3d9d501c5756`) uses the table list from `C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\q17_metrics_rate.kql:3`, plus the node and fixed UTC filters. `OTELLogs` was in the union but returned no local row group. The corresponding metric split (same filters, group by metric prefix; `Kusto.Cli;6ac8b97a-a92b-41d8-b1e2-ba186cee6bbd`) was `aictl.file.*` 11,395.73/min, `process.*` 1,654.48/min, other 495.13/min, `system.*` 160.70/min, `aictl.discovery.*` 16.17/min. These are row rates for the node, not isolated writer command rates. The sample does not establish which daemon binary or configuration generated the rows.

## Proposed Phase S collector order

Start with the native writer and schema/test harness per Phase S items 1–2. The order below is for collector migration. The first three priorities have query CPU or row-volume evidence above; no comparable CPU breakdown is available for the remaining groups. Re-measure per family after each move.

1. **Tool calls (H, T, O).** First remove the `tool_invocations` SQL mutation path, including the query-then-ingest replacement for historical `.set-or-append`. Move hook completion, transcript reconciliation, OTel calls, stale confirmations and size fills together at the call-identity boundary. Require zero writer queries for both fresh and pre-existing history layouts.
2. **Discovery/file inventory and host/process sampling (D).** This is the largest measured row volume. Keep change/flood limits and the 300-second refresh for samples. Replace per-file metric pairs with inventory versions and tombstones. Test removal and restart from local manifests.
3. **OTLP (O), raw plus remaining derived observations.** `OTELMetrics` is the next largest measured stream by rows. Move the native sink behind the plugin. Replace late trace ID patching with link facts; remove runtime repair.
4. **Remaining transcript/session facts (T, plus shared H/D session lifecycle).** Move requests, sessions, agents, steps/text, prompts, skills, context and links. Preserve source precedence and count once per deterministic key, not once per delivery.
5. **Catalog and data quality (Q).** Section 3.1.1 measures 29.8 catalog versions per key (`C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\ui-rewrite-plan.md:149–154`). Remove unchanged versions before measuring a materialized view. Move status counters off read-modify-write.
6. **Messages (M).** Move source cursors and attribution out of store reads. Keep external readers lazy. Apply text policy and preserve VS Code rewrite semantics.
7. **Session evidence (E and H memory captures).** Move artifact manifests, Git links and memory snapshots. Differential manifests remove the delete-and-reinsert cycle.
8. **Store maintenance and file routing (A, P).** Native retention is installed at setup; retire the residual SQL cleanup, DB-file maintenance, routing/index paths and compatibility surface when the last callers move. Apply the same audited K9 requirement to the hot paths before deleting the old stack.

## Minute-by-minute counts

These are the individual UTC bins for the management query above (client request ID `Kusto.Cli;b489ff5d-6286-4fc9-8f0e-fc8bb0c43ffc`). `local_text` counts queries that mention `desktop-1c0ea28`, not queries known to originate on that node. `inline` counts `DataIngestPush`, not SDK ingest calls.

```csv
minute_utc,queries,local_text,inline,set_or_append
23:11,111,103,1,0
23:12,158,150,11,0
23:13,123,115,6,0
23:14,180,172,6,0
23:15,184,176,7,0
23:16,134,126,5,0
23:17,120,111,2,0
23:18,195,187,7,0
23:19,139,131,5,0
23:20,191,183,11,0
23:21,207,199,7,0
23:22,77,69,1,0
23:23,186,176,13,0
23:24,146,138,4,0
23:25,120,112,5,0
23:26,208,200,5,0
23:27,112,104,3,0
23:28,118,110,5,0
23:29,189,181,9,0
23:30,66,58,5,0
23:31,199,191,15,0
23:32,127,119,4,0
23:33,105,97,11,0
23:34,169,161,7,0
23:35,152,143,20,0
23:36,142,134,2,0
23:37,221,211,8,0
23:38,99,91,3,0
23:39,205,189,18,0
23:40,152,143,8,0
23:41,205,175,5,0
23:42,126,112,16,0
23:43,160,152,14,0
23:44,96,91,7,0
23:45,9,8,6,0
23:46,124,110,1,0
23:47,33,33,0,0
23:48,33,32,5,0
23:49,249,212,21,0
23:50,161,153,15,0
23:51,233,213,22,0
23:52,83,75,12,0
23:53,176,167,12,0
23:54,217,208,17,0
23:55,194,185,21,0
23:56,235,225,24,0
23:57,29,21,7,0
23:58,254,244,24,0
23:59,132,124,16,0
00:00,277,268,19,0
00:01,207,193,14,0
00:02,84,76,9,0
00:03,248,233,20,0
00:04,76,68,8,0
00:05,312,290,19,0
00:06,96,88,5,0
00:07,193,184,31,0
00:08,101,93,9,0
00:09,240,228,29,0
00:10,93,85,18,0
```
