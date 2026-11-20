# SQLite users

The inventory below describes the pre-removal checkout. Phase S z1 removed the
dashboard and Board CLI callers of the legacy store. Phase S z3 deleted the
legacy store, SQL adapter, compatibility fixtures, and parity tests.

Phase S z2 removed aictl history opens and SQL adapter calls from the core
runtime. The remaining SQLite reads in core code are optional reads of other
tools' files, not fallback history storage.

Phase 0, item 9. Source and test references are for `2cf86cf` (before the parallel layout-table deletion). The Phase S dispositions follow sections 3.3, 7 and 8 of `C:\Users\zvischneider\.copilot\session-state\8d74c785-f5f7-4d7b-a85f-09a3e49018be\files\ui-rewrite-plan.md:229–250,356–413,442–455`.

## Source

`rg -n --no-heading '\bsqlite3\b' src -g '*.py'` gives **45 files**: **44 import** the module and one mentions its exception in a comment. A file can have more than one role: 34 are A only, two A+B, four A+C, one B+C, and three C only with an import. The comment-only file is listed under C. These counts are by file, not import site.

- **A — aictl storage:** includes the SQL compatibility layer, connection types and exceptions, and the board's in-memory SQL projection. Remove all aictl storage use of `sqlite3` (B5/B6). Use the plugin reader/writer and store-neutral errors.
- **B — direct access to an aictl file:** remove the file access, not just its import. Use restart state (K3) or the `project` column (K8), as specified below.
- **C — another tool's database:** the database remains an input. Import `sqlite3` inside the reader, or use a shared lazy reader. If absent, report “unavailable: Python sqlite3 module missing” in capability and health. Keep the daemon running (B7). Do not keep a top-level import just to catch a source exception.

### A — storage, projections and write adapters

| File and line | Purpose | Phase S disposition |
|---|---|---|
| `C:\OSS\aictl\src\aictl\storage.py:25,2702–2711,2727–2767,2783–2791` | `HistoryDB` connects to SQLite or the Kusto compatibility layer; SQLite also provides the capture-off and failure fallbacks. | Move callers; delete `HistoryDB`, SQLite fallback and SQL writer. Use K4/K5 and the no-store behavior in K11. |
| `C:\OSS\aictl\src\aictl\kusto\connection.py:24,78,580–635,733–813` | Kusto cursor/connection emulate SQLite; `KustoStoreError` inherits `OperationalError`. | Remove SQL emulation and SQLite inheritance. Move client, retry, conversion and native schema code to the plugin. |
| `C:\OSS\aictl\src\aictl\kusto\translate.py:71,430` | SQL-to-KQL translator uses SQLite to detect complete statements. | Delete the translator; use named KQL queries (B2) and typed writes. |
| `C:\OSS\aictl\src\aictl\dashboard\board_history.py:12,271–293,369–380` | Materializes Kusto history in an in-memory SQLite projection. | Delete the projection; use bounded KQL aggregation. |
| `C:\OSS\aictl\src\aictl\dashboard\board_api.py:33,677,1753,3348,3622–3636` | SQLite connection types and SQL board assembly. | Move queries into the plugin and preserve the payloads in S; remove obsolete handlers with their UI phases. |
| `C:\OSS\aictl\src\aictl\dashboard\analytics.py:12,152–166` | Catches SQLite errors when recording analytics health. | Use the writer and a store-neutral failure result. |
| `C:\OSS\aictl\src\aictl\dashboard\session_record.py:19,90–97,148–154` | SQLite connection check and error handling for session evidence queries. | Replace SQL and backend checks with plugin reads. |
| `C:\OSS\aictl\src\aictl\dashboard\web_server.py:28,409–415,624–629` | SQLite exception on a request path; snapshot worker uses the history connection. | Use plugin reads and typed memory snapshots; remove SQLite errors from HTTP. |
| `C:\OSS\aictl\src\aictl\memory_snapshot.py:21,95–133,205` | Writes and reads `memory_snapshots` through a SQLite-shaped connection. | Use the writer for snapshot rows and a named read for the diff. Put retained text under K7. |
| `C:\OSS\aictl\src\aictl\ingesters\call_facts.py:25,295,437–439,470–471` | Catches history write errors and tracks failed `CallFacts` writes. | Use typed rows and a store-neutral handoff result; keep retry and checkpoint semantics. |
| `C:\OSS\aictl\src\aictl\ingesters\loaded_files_backfill.py:15,43–46,66–85` | Writes replayed loaded-file/context facts and checks a run-once marker. | Replay source facts through the writer if still needed; move the marker to K3 state. |
| `C:\OSS\aictl\src\aictl\ingesters\otel_sessions_backfill.py:25,47–68,92–99` | Plans a historical attribution repair from aictl event rows, then updates them. | Remove from runtime. Use replay or an explicit offline migration for old data if needed. |
| `C:\OSS\aictl\src\aictl\ingesters\session_artifacts.py:22,155–162,187–188` | Reads stored signatures and replaces artifact rows; catches lock errors. | Use local scan state and full versions/tombstones, not a store connection. |
| `C:\OSS\aictl\src\aictl\ingesters\tool_size_backfill.py:16,48–51,72–88` | Writes fill-only call sizes and records a run-once marker. | Use source replay and complete call versions or read projection of source evidence; K3 marker if needed. |

### A — schema migration modules

Delete the files below when the last SQLite store goes. Carry forward only supported schema and behavior, in the native definitions and plugin tests (B8). Do not run these SQLite migrations against Kusto.

| File and line | Purpose |
|---|---|
| `C:\OSS\aictl\src\aictl\storage_migrations\__init__.py:28,58–76,107` | Registers and runs migrations; writes schema version. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m020_drop_legacy_tables.py:17,39` | Drops pre-v20 tables. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m021_sessions_add_pid.py:18,23` | Adds session PID. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m022_session_commits.py:15,21–34` | Adds session commit evidence. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m023_cursor_session_messages.py:18,24–35` | Adds Cursor messages. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m024_memory_snapshots.py:14,22–35` | Adds memory snapshots. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m025_copilot_session_messages.py:18,24–42` | Adds Copilot messages. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m026_vscode_chat_messages.py:14,20–39` | Adds VS Code chat messages. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m027_file_write_and_data_quality.py:15,21–79` | Adds file-write and data-quality tables and indexes. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m028_tool_invocations_source_event_id.py:24,29` | Adds source event ID to tool calls. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m029_session_usage.py:17,23–54` | Adds per-session usage. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m030_board_facts.py:12,25–48` | Adds prompt and skill facts and call fact fields. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m031_context_facts.py:13,19–34` | Adds context events and request token fields. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m032_project_folders.py:13,26–29` | Clears project attribution on old file events that matched the migration filter. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m033_tool_call_sizes.py:12,18` | Adds tool input and output sizes. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m034_session_artifacts.py:17,20–36` | Adds session folders and artifact inventory. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m035_session_loaded_files.py:14,17` | Adds loaded files. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m036_session_context_items.py:18,21` | Adds session context items. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m037_maintenance_text.py:14,20` | Adds text checkpoint value. |
| `C:\OSS\aictl\src\aictl\storage_migrations\m038_hook_calls.py:15,18–32` | Adds hook facts and indexes. |

### A+B — store code that also opens aictl files directly

| File and line | Purpose | Phase S disposition |
|---|---|---|
| `C:\OSS\aictl\src\aictl\project_stores.py:33,310–337,503–570,1591–1703` | A: per-repository SQLite stores, index and union views. B: `_read_only` opens aictl files for metadata, schema checks and routing. | Remove direct file opens, index, attach/copy and routing. Put the `project` key on rows (K8). Delete the module. |
| `C:\OSS\aictl\src\aictl\dashboard\ingester_runner.py:15,256–294,335–368` | A: `_poll_loop` handles SQLite store errors. B: doctor fallback opens the aictl history file and reads `MAX(ingested_at)` and `COUNT(*)` from `copilot_session_messages`. | Use typed writer errors. Read last-ingested state from the local checkpoint (K3), not from history. Use status counters rather than equating handoff with stored row count. |

### B+C — direct aictl file and external input in one file

| File and line | Purpose | Phase S disposition |
|---|---|---|
| `C:\OSS\aictl\src\aictl\context_audit.py:27,1324,1550–1568,2170–2201` | B: reads aictl `history.db` for file-write and instruction-load evidence. C: reads Copilot desktop `data.db` for context/config evidence. | Use named plugin reads for aictl evidence. Make the Copilot desktop reader lazy and keep its read-only scope. |

### A+C — external inputs and aictl writes in the same file

| File and line | Purpose | Phase S disposition |
|---|---|---|
| `C:\OSS\aictl\src\aictl\ingesters\_common.py:15,25–39,53–69,179–202` | C: opens source DBs read-only. A: quality writes, raw writer connection and session lookup/provisioning. | Keep the external opener lazy. Use typed quality/session writes and local session state; delete the raw history connection helper. |
| `C:\OSS\aictl\src\aictl\ingesters\copilot_session_store.py:37,145–159,215–272,305–346` | C: reads Copilot session-store schemas and message rows. A: writes messages and reads/writes a cursor in aictl. | Keep the source reader lazy. Ingest messages by source identity; checkpoint in local JSON. |
| `C:\OSS\aictl\src\aictl\ingesters\cursor_conversations.py:39,96–108,152–207,220–234` | C: reads Cursor conversations/messages. A: writes aictl messages and queries sessions for a match. | Keep the source reader lazy. Use typed message writes and a bounded runtime session index for attribution. |
| `C:\OSS\aictl\src\aictl\ingesters\transcript_usage.py:42,707–828,1112–1145,1407,1453` | C: reads Copilot session/usage data and desktop `data.db`. A: uses aictl history for checkpoints and writes session/usage facts. | Keep source reads lazy. Move checkpoints to local JSON and use typed writes. |

### C — external inputs only

| File and line | Purpose | Phase S disposition |
|---|---|---|
| `C:\OSS\aictl\src\aictl\monitoring\tool_telemetry.py:22,677–696,1040–1111` | Reads Copilot desktop session ownership and Cursor `state.vscdb` telemetry. | Remove the module-level import. The Cursor reader already has a local import; add B7 unavailable handling and make the other source error handling lazy. |
| `C:\OSS\aictl\src\aictl\observe\collect.py:14,79–114,481–484` | Opens external SQLite files without side files; reads Copilot desktop and session store data. | Keep the read-only helper and make its SQLite import lazy. |
| `C:\OSS\aictl\src\aictl\observe\sessions.py:30,242–249,349–350,1134–1141` | Reads VS Code `state.vscdb` and Copilot/session-index source details via external reader helpers. | Move exception handling behind the lazy source boundary. |
| `C:\OSS\aictl\src\aictl\effective_config.py:403–426,446–460` | VS Code model-picker reader uses the shared read-only opener. `sqlite3` occurs only in a comment at line 422. | No import to remove here. Propagate B7 status from the opener. |

## Tests

`rg -n --no-heading '\b(sqlite3|HistoryDB|ProjectStores|board_history)\b' test -g '*.py'` matches **57 files**, including `conftest.py` and one comment-only test file. List by file, not by test case. Use the recorded Kusto client and fake writer for surviving behavior; run native KQL and parity checks on the test database, not on SQLite (plan section 3.4 item 6 and Phase S items 1/5).

### Delete or split, as specified by section 7

| File and line | Phase S disposition |
|---|---|
| `C:\OSS\aictl\test\test_storage.py:14,36` | Delete. First cover retained capture, retention and catalog behavior in plugin tests. |
| `C:\OSS\aictl\test\test_storage_migrations.py:11,23` | Delete SQLite upgrade tests; cover native schema separately. |
| `C:\OSS\aictl\test\test_project_stores.py:7,38,694–735` | Delete file routing, attach and lock tests. Test project isolation and attribution in the plugin. |
| `C:\OSS\aictl\test\test_project_stores_review.py:5,31,424–445` | Delete SQLite store recovery/lock cases. Keep cross-project behavior in plugin parity tests. |
| `C:\OSS\aictl\test\test_kusto_translate.py:608–612` | Delete the SQL translator tests. |
| `C:\OSS\aictl\test\test_kusto_connection.py:1,14` | Remove SQL emulation cases. Keep retry, client factory and type conversion cases with the plugin. |

### Keep external SQLite fixtures (B7)

For mixed tests below, keep SQLite only for the input fixture. Replace aictl history with the fake writer or recorded reader.

| File and line | External source fixture |
|---|---|
| `C:\OSS\aictl\test\test_accuracy_copilot_surfaces.py:8,34,62,327–349` | Copilot session-store and desktop data, and read-only opener behavior. |
| `C:\OSS\aictl\test\test_board_facts.py:9,423–442,1168,1309–1310` | Copilot session-store and app data. Remove the aictl SQLite schema cases; keep fact, precedence and capture behavior. |
| `C:\OSS\aictl\test\test_cli_observe_ps.py:8,107,187` | Copilot desktop `data.db`. |
| `C:\OSS\aictl\test\test_context_audit_copilot.py:8,262,289` | Copilot context audit source fixtures. |
| `C:\OSS\aictl\test\test_copilot_session_store_ingester.py:12,24,131,149,165` | Copilot source schemas, source locks and optional-column behavior. |
| `C:\OSS\aictl\test\test_copilot_sessions_index.py:8,86,99,117` | Copilot files and VS Code state. |
| `C:\OSS\aictl\test\test_copilot_sessions_links.py:9,38,76` | VS Code state and Copilot session-store linking. |
| `C:\OSS\aictl\test\test_cursor_conversations_ingester.py:18,30,58,177` | Cursor source rows and lock behavior. |
| `C:\OSS\aictl\test\test_effective_config_picker.py:6,27` | VS Code model-picker state. |
| `C:\OSS\aictl\test\test_kusto_observation_ingestion.py:99,688–696,930` | Keep Cursor input fixture. Preserve no-read ingestion tests in the plugin. Remove the aictl SQLite observation/trim fixture. |
| `C:\OSS\aictl\test\test_overhead_collection.py:326–350` | Copilot source fixture; keep bounded collection and checkpoint behavior with a fake writer. |

### Rewrite the store-backed coverage

Each row below keeps product behavior with the Phase S test doubles. Delete assertions about SQLite internals. Keep HTTP payloads in S unless section 7 explicitly removes their route in a later phase.

| File and line | Coverage to keep or change |
|---|---|
| `C:\OSS\aictl\test\conftest.py:102,301–303` | Replace project-store fixture and SQLite side effects; retain the I/O guard and verify B6. |
| `C:\OSS\aictl\test\test_accuracy_transcript_usage.py:19,112–157` | Transcript accounting, dedup and prices. |
| `C:\OSS\aictl\test\test_admin.py:233,291,457` | Replace store mocks. Remove `db compact` cases; cover the new command behavior in section 3.4. |
| `C:\OSS\aictl\test\test_agent_team_persist.py:19` | Agent and team state. |
| `C:\OSS\aictl\test\test_analytics.py:12,21` | Analytics outputs. |
| `C:\OSS\aictl\test\test_analytics_tool_filter.py:29` | Analytics filtering; remove `/api/budget` cases with the route in phase 6. |
| `C:\OSS\aictl\test\test_api_endpoints.py:5,40` | HTTP response behavior; remove `/api/samples` cases with the route in phase 6. |
| `C:\OSS\aictl\test\test_board_api.py:34` | Board payload parity. |
| `C:\OSS\aictl\test\test_board_context_facts.py:9,214,235` | Context facts and retention; delete SQLite upgrade fixture. |
| `C:\OSS\aictl\test\test_board_nodes.py:185,204,379–380,575` | Node scope and board behavior. Remove in-memory `board_history` execution assertions. |
| `C:\OSS\aictl\test\test_code_age.py:32` | Code age outputs. |
| `C:\OSS\aictl\test\test_context_audit_detection.py:441–448` | Keep file-write evidence behavior; replace the aictl `history.db` fixture with a plugin reader fake. |
| `C:\OSS\aictl\test\test_context_items.py:6,554,587,633` | Context-item writes, project attribution and backfill behavior if retained. Remove SQLite upgrades and file-placement checks. |
| `C:\OSS\aictl\test\test_dashboard_numbers.py:19` | Dashboard totals. |
| `C:\OSS\aictl\test\test_files_sync.py:3,36` | Inventory changes and content policy. |
| `C:\OSS\aictl\test\test_git_attribution.py:29` | Session-to-commit attribution. |
| `C:\OSS\aictl\test\test_hooks_status.py:11` | Hook status. |
| `C:\OSS\aictl\test\test_ingester_status.py:20` | Poll/doctor status and local checkpoint; remove history-file fallback cases. |
| `C:\OSS\aictl\test\test_live_history_authority.py:10` | Stored versus live authority. |
| `C:\OSS\aictl\test\test_live_optional_imports.py:7,24` | Replace the SQLite-starts-without-Kusto-dependencies case with required-SDK and SQLite-blocked startup coverage (B6, K11). |
| `C:\OSS\aictl\test\test_live_orchestration.py:31` | Replace the `ProjectStores` mock with a plugin fake. |
| `C:\OSS\aictl\test\test_live_projection.py:3,14,39,58` | Live projection and cache behavior; replace in-memory SQLite cases. |
| `C:\OSS\aictl\test\test_lm_usage.py:15` | Language-model usage. |
| `C:\OSS\aictl\test\test_loaded_files.py:5,170,201` | Loaded-file facts and project attribution, not schema upgrades or file placement. |
| `C:\OSS\aictl\test\test_mcp_usage.py:18` | MCP usage. |
| `C:\OSS\aictl\test\test_memory_snapshot.py:18` | Snapshot and diff behavior. |
| `C:\OSS\aictl\test\test_otel_copilot_sessions.py:26` | OTel session attribution. |
| `C:\OSS\aictl\test\test_otel_receiver.py:28` | Receiver behavior and typed writes. |
| `C:\OSS\aictl\test\test_overhead_storage.py:6` | Relevant queue/retention guarantees; delete SQLite page, file budget and lock assertions. |
| `C:\OSS\aictl\test\test_security.py:4,30,115–130` | Keep request and filter validation; replace SQLite-specific SQL assertions with plugin parameter/validation tests. |
| `C:\OSS\aictl\test\test_session_counters.py:15` | Session counters. |
| `C:\OSS\aictl\test\test_session_evidence_api.py:10` | Evidence routes and payloads. |
| `C:\OSS\aictl\test\test_session_record.py:8,90,187–198,637–664` | Session record and artifact/size behavior. Remove SQLite packing, schema and file routing assertions. |
| `C:\OSS\aictl\test\test_session_step_storage.py:3` | Step identity, evidence and text policy. |
| `C:\OSS\aictl\test\test_start_order.py:23` | Daemon start order, also with SQLite imports blocked. |
| `C:\OSS\aictl\test\test_store_round_trips.py:13,36–41` | Replace SQL statement-count assertions with a writer check for zero store queries and bounded batches (K4/K9). |
| `C:\OSS\aictl\test\test_transcript_steps.py:4` | Transcript step parsing and handoff. |
| `C:\OSS\aictl\test\test_usage_figures.py:20,57` | Usage projections. |
| `C:\OSS\aictl\test\test_vscode_chat_logs_ingester.py:21,98` | Chat log source, message versions and checkpoint behavior; input is not the aictl SQLite file. |

`C:\OSS\aictl\test\test_exception_discipline.py:297` mentions `sqlite3.Error` only as an example. Keep the general test; this reference is not a storage dependency.
