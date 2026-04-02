# Database Schema Refactor Plan (v12 -> v20)

## Status: PHASE 1 COMPLETE -- Schema layer fully refactored, all 521 tests pass

Phases 2-4 are incremental: adding new method calls to existing ingestion/consumer
code. The system is fully functional now because all old APIs are preserved as
backward-compat aliases. The new tables exist but are populated incrementally as
Phase 2-3 workers add calls to the new DB methods.

## Problem
The current aictl DB schema conflates too many concerns into too few tables. We are replacing it with a clean normalized schema. The old DB is deleted (fresh start). No migration needed.

## Phases

### Phase 0: Write work plan
- [x] Read and understand current storage.py (2643 lines)
- [x] Read and understand current test_storage.py (74 tests passing)
- [x] Map all callers of storage APIs
- [x] Write this plan

### Phase 1: Core schema layer (storage.py) -- DONE (commit 52b9b8c)
- [x] New schema SQL with all 20+ tables
- [x] New dataclasses (SessionRow, RequestRow, ToolInvocationRow, ProcessRow, AgentRow, etc.)
- [x] Backward compat aliases (Sample=Metric, TelemetryRow=ToolStatsRow, MetricsRow=SystemSnapshotRow)
- [x] All new methods (upsert_session, append_request, etc.)
- [x] All backward compat wrappers (append_metrics -> system_snapshots, etc.)
- [x] Updated flush() for new buffers
- [x] Updated compact() for new tables
- [x] Updated stats() for new tables
- [x] Updated _sync_csv_to_db for path_defs/process_defs
- [x] Migration code (drop old tables when version < 20)
- [x] File blob support (_store_blob, _resolve_content)
- [x] LARGE_FILE_THRESHOLD = 100_000
- [x] Dedup logic for requests/tool_invocations
- [x] Process snapshot dedup (in-memory last-value cache)
- [x] All 521 tests pass (94 storage tests, 20 new)

### Phase 2: Ingestion updates -- DONE (commits 53ec6f8, Workers C+D added)
- [x] Worker A: OTel receiver (web_server.py) -- extracts RequestRow + ToolInvocationRow
- [x] Worker B: Correlator via orchestrator -- writes to sessions table on session events
- [x] Worker C: Tool telemetry (tool_telemetry.py) -- writes per-request data (commit TBD)
- [x] Worker D: Agent teams (scan_agent_teams) -- writes to agents table (commit TBD)

Workers C and D are now complete:
- Worker D: SnapshotStore._persist_agent_teams() writes each agent from snap.agent_teams to
  the agents table via db.upsert_agent(). Called from update() after telemetry batch persist.
- Worker C: _parse_agent_file() now collects per-turn request data in result["turns"]. Each
  assistant message with usage data becomes a RequestRow written via db.append_request() with
  source_ts from the line's embedded timestamp (dedup Case A). Model extracted per-turn.

### Phase 3: Consumer updates -- DONE (commit 3834d83)
- [x] Worker E: Web server query endpoints -- /api/sessions queries sessions table
- [x] Worker F: TUI -- reads from snapshot, no DB changes needed
- [x] Worker G: Tests -- test_storage.py rewritten (94 tests, 20 new)

### Phase 4: Integration -- DONE
- [x] All 521 tests pass
- [x] Final commit

## Key Design Decisions
- SCHEMA_VERSION = 20
- Old tables dropped on migration: metrics, tool_metrics, tool_telemetry, samples, file_store, path_specs, process_specs
- UI tables unchanged
- Backward compat aliases in Python only
- Dedup via sha256 keys for requests/tool_invocations
- Process snapshot dedup via in-memory cache with threshold

## ⚠️ DEDUP RULES CLARIFICATION (for Phase 2 workers — MUST READ)

The "reporting time" (ts we assign at write time, e.g. from psutil polling) does NOT
count as a timestamp for dedup purposes. Only a timestamp EMBEDDED IN THE SOURCE DATA counts.

### Case A: Source data has an embedded timestamp (OTel timeUnixNano, hook payload ts, events.jsonl timestamp)
- All fields INCLUDING the embedded timestamp are identical → duplicate, skip
- Embedded timestamp is absent/null in the payload → treat as NEW event (always write)

### Case B: Source data has NO embedded timestamp (psutil readings, correlator-derived snapshots)
- All measured values the same → duplicate, skip
- Any value differs → NOT a dup, write it

### Hook-specific rule
Every hook invocation is an INDEPENDENT event. Do NOT dedup on time proximity.
Dedup only via Case A/B above:
- If hook payload contains an event ID or timestamp → Case A
- If not → only dedup on full payload byte-for-byte equality

### Per-table dedup_key derivation
- `requests`: hash(session_id + embedded_ts_ms + model + input_tokens + source)
  - embedded_ts_ms = int(otel_time_unix_nano / 1e6) if available, else omit that field from hash
  - If embedded_ts_ms not available, only dedup if ALL of session_id+model+tokens+source match exactly
- `tool_invocations`: hash(session_id + embedded_ts_ms + tool_name + hash(input_json))
  - Same rule: if no embedded_ts, only dedup on full value equality
- `process_snapshots`: Case B → only write if cpu_percent diff > 1.0 OR memory_rss_mb diff > 1.0
- `system_snapshots`: INSERT OR REPLACE (one per poll cycle, no dedup needed)
- `metrics` (OTel): Case A → dedup on (metric + embedded_ts_ms + tool + tags + value)
- `events`: hook events always write; OTel events Case A dedup
