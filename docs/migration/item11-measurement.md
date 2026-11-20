# Phase 0, item 11: Kusto write and query load after the revision-5 fixes

This file records the measurement that plan item 11 asks for: the load that the daemon puts on Kusto after the two revision-5 fixes. The first fix applies the change filter, the flood limit and the per-tool file limit in Kusto mode again (commit `221e10f`). The second fix does not use a drive root or the home folder as a project workspace (commit `b3fd3f7`).

## Scope

- Cluster `https://zaictl.swedencentral.dev.kusto.windows.net`, database `aictl_current`.
- Window: 2026-11-19 23:46 to 2026-11-20 00:46 UTC (60 minutes), selected by `ingestion_time()` for rows and by `StartedOn` for queries and commands.
- Node: `desktop-1c0ea28` only. The daemon ran from the editable install at commit `2cf86cf`, which contains both fixes. It started at 23:45:23 UTC.
- The two other dev daemons (`cpc-zvisc-aepnw`, `cpc-zvisc-a0w17`) sent no `metrics` rows in the 15 minutes before 00:12 UTC. They were not updated or measured. Their part of the item is open.
- Query: [`queries/item11.kql`](queries/item11.kql). Run each statement with Kusto.Cli against the database.

## Conditions that affect the numbers

- Several AI agent sessions ran on the machine during the whole window, so file and hook activity was high.
- In the second half of the window, the phase-0 recorder (`C:\OSS\aictl\scripts\recording\record_daemon.py`) sent HTTP requests to this daemon's REST routes and live stream. Its stored recordings cover 00:21 to 00:27 UTC (busy) and 00:32 to 00:40 UTC (quiet); trial runs came before them. The recorder also started a separate daemon that wrote to the `aictl_perf_test` database (not counted here). The REST requests increase the daemon query count below, so the query count is higher than the query count of an idle dashboard.
- The recording script wrote files under `C:\OSS\aictl\test\recordings`. These are real file changes, and they appear in the `file_modified` events.

## Results

### `metrics` rows by group

"Repeated" counts rows whose value equals the previous row of the same series (`metric` + `tags`) in the window. The share is of all rows except the first row of each series. An unchanged series is written again every 300 seconds (`DEDUP_STALE_SECONDS` in `C:\OSS\aictl\src\aictl\sink.py`), so repeated rows are expected.

| Group | Rows | Rows per minute | Series | Repeated |
|---|---:|---:|---:|---:|
| `process.*` | 55,459 | 924 | 7,910 | 69.2% |
| other (`aictl.tool.*`, MCP detail, memory tokens) | 23,020 | 384 | 318 | 58.8% |
| `aictl.file.*` | 18,800 | 313 | 7,506 | 88.0% |
| `system.*` | 6,131 | 102 | 32 | 0.0% |
| `aictl.discovery.*` | 498 | 8 | 45 | 87.0% |

`aictl.file.*` rows per 5 minutes: 1,156; 169; 1,142; 1,117; 1,195; 1,265; 341; 1,241; 6,887; 1,758; 1,263; 1,244 (and 22 in the partial last bin). The 00:25 bin is 1,377 rows per minute. That bin is inside the busy recording, when the recorder created and rewrote files in the repository and agent sessions were active. The query does not separate the causes.

The plan predicted at most about 1,120 `aictl.file.*` rows per minute plus real changes. The hour average is 313 rows per minute, and the highest 5-minute bin is 1,377 rows per minute during the busy recording. The result does not show a defect. Before the fix, the same node group wrote 47,178 `aictl.file.*` rows per minute (plan section 3.1.1, three nodes). Only one node is measured here, so the two numbers are not a like-for-like comparison.

### Rows per table, node `desktop-1c0ea28`

| Table | Rows per minute |
|---|---:|
| `OTELMetrics` | 3,473.1 |
| `metrics` | 1,731.8 |
| `requests` | 511.8 |
| `events` | 273.3 |
| `tool_invocations` | 44.7 |
| `datapoint_catalog` | 38.0 |
| `process_snapshots` | 37.9 |
| `hook_calls` | 18.2 |
| `OTELTraces` | 13.1 |
| `session_steps` | 3.4 |
| `tool_stats` | 0.9 |

### `file_modified` events

12,418 events (207 per minute). The paths with the most events are tool state files: the Copilot CLI process log (1,140), VS Code `state.vscdb-journal` (499) and `state.vscdb` (214), a Copilot CLI session `events.jsonl` (412), Copilot `data.db-wal` (317) and `session-store.db-wal` (163), and the recording files under `test\recordings` (89 and less each). No path outside a tool state folder or the project root appears in the top 12.

### Daemon queries and commands, database `aictl_current`

| Application | State | Queries | Per minute | CPU seconds | Duration p50 | Duration p95 | Peak memory |
|---|---|---:|---:|---:|---:|---:|---:|
| `aictl` | Completed | 12,474 | 207.9 | 2,653.8 | 81 ms | 675 ms | 4,807 MB |
| `aictl` | Failed | 928 | 15.5 | 61.1 | 28 ms | 113 ms | 128 MB |

6.9% of daemon queries failed. 908 of the 928 failures are `E_LOW_MEMORY_CONDITION` (partial query failure, low memory). 18 failures exceeded the 5 GB `summarize` memory budget. One failure could not read values from the row store (`E_RS_CANNOT_RETRIEVE_...`).

| Application | Command type | Commands | Per minute |
|---|---|---:|---:|
| `aictl` | `DataIngestPush` | 1,051 | 17.5 |
| `aictl` | `AdminThenQuery` | 73 | 1.2 |
| `aictl` | `TableDeleteRecords` | 2 | 0.0 |
| (system) | `ExtentsRebuild` | 70 | 1.2 |

No `.set-or-append` command ran in the window.

## Findings for phase S

- The write volume is now dominated by `OTELMetrics` and `process.*`, not by file metrics.
- The query load and the memory failures remain. One daemon with one dashboard client used 2,654 CPU seconds in the hour (about 0.74 cluster cores), and 6.9% of its queries failed for memory. The phase-S read path (KQL aggregation and materialized views in place of the in-memory copy) is the planned correction. The query count in this window includes the recording script's REST requests.
- The daemon still deletes rows (`TableDeleteRecords`, 2 commands). The write-path audit ([`write-path-audit.md`](write-path-audit.md)) lists the delete paths that phase S replaces with retention.
