# Dashboard and Kusto recordings

These are phase-0 fixtures for the dashboard replay server and offline Kusto
reader and writer tests. `quiet` is the lower-activity window on the same
machine; it does not mean the machine was idle. Ranking uses `change` messages
per minute on the main dashboard stream. It excludes `bootstrap` messages,
keepalives and the stream-open record. A change message can carry more than one
entity update or removal.

| Window | UTC start → end, 2026-11-20 | Seconds | Main changes (per minute) | Isolated changes (per minute) | Compressed bytes |
|---|---|---:|---:|---:|---:|
| `quiet` | 00:32:24.449 → 00:39:50.682 | 446.235 | 525 (70.59) | 428 (57.55) | 7,499,770 |
| `busy` | 00:21:20.575 → 00:27:19.516 | 358.941 | 660 (110.32) | 489 (81.74) | 7,730,823 |

Both windows ended early at a compressed-size threshold. The busy end time
comes from the first end-boundary GET in the archive because that recorder
run did not write its summary. The gzip files total 15,231,983 bytes, including
the 1,390-byte supplemental file. All four live streams pass the current UI
reducer with their recorded cursors.

## Files and replay

Each window has a `window.json` summary and these gzip-compressed JSONL files.
Each line is one independent JSON object.

| File | Contents |
|---|---|
| `main-sse.jsonl.gz`, `isolated-sse.jsonl.gz` | Messages from `/api/live/stream?history=1` on the existing and isolated dashboards, respectively. `sse_open` gives the HTTP status. An `sse` record has `event`, `id`, `data`, UTC `received_at` and monotonic `offset_ms` from the start of the window. An `sse_error` records a transport error. |
| `main-rest.jsonl.gz`, `isolated-rest.jsonl.gz` | GET attempts at the start and end. Each has a `phase`, route and scrubbed request `path`, and request and receive times. A response has `status`, `content_type` and, when decoded, `body`. A transport or decoding error has `capture_error`. |
| `kusto.jsonl.gz` | Traffic from the isolated daemon only. `query` and `command` records have scrubbed KQL, outcome and primary result tables (columns with names and types, plus positional rows). `ingest` records have table, ingestion mode, format, outcome and decoded rows. A failed attempt reports the exception class. |

Use the main stream and main REST files together to replay the existing UI.
Send the captured SSE `id`, `event` and JSON-encoded `data` at `offset_ms / speed`
from connection start. Emit a comment for a recorded keepalive. The isolated
files are a separate stream and REST snapshot set; do not interleave them with
the main files. A Kusto client fake can match a scrubbed statement and return
the corresponding primary result data. It cannot answer arbitrary new KQL.

`r1-kusto.jsonl.gz` records bounded reader views from the fixed Phase 0 node in
`aictl_perf_test`. Use `scripts\recording\record_r1_views.py --out <new-path>` to
record these views again. The replay matches the exact KQL text. The fixed
capture has events but no canonical session or request rows for that node.

The REST snapshots contain 45 GET attempts per source at each boundary,
including multiple views of a route where applicable. These are sample
arguments, not every filter or session. The recorder chooses recent session,
agent and file arguments from responses where available. If no suitable
argument is available, it uses a placeholder. Some requests returned an
error, timed out or found no data. Many start requests on the isolated daemon
got HTTP 503 while it started. These archived tapes include the first frame of
the retired `/api/stream` at some boundaries. New captures use `/api/live/stream`.

A recorder argument error skipped `/api/board/tool` and `/api/board/skill`
at the boundaries. The script now sends both requests. The two HTTP 200
responses in `supplemental-main-rest.jsonl.gz` were taken later on the main
daemon; they are not boundary responses or isolated-daemon responses.

The dashboard primitive gallery uses a small JSON fixture, not a live replay.
It takes agent rows and CPU samples from `main-sse` and one file excerpt from
`main-rest` in each window. To regenerate the fixture from the repository root:

```powershell
node src\aictl\dashboard\ui\test\fixtures\gallery\extract.mjs
```

In the UI directory, start Vite with `npm run dev`. Open `/gallery.html`.
Add `?theme=dark` to start in dark mode. The production build does not include
the gallery.

## Capture and privacy

The recorder used HTTP GET only on the existing dashboard. Its separate
in-process daemon bound a different loopback port, used an empty isolated
configuration directory and ran against `aictl_perf_test` for both reads and
writes. No live daemon processes were stopped, restarted or reconfigured.
The isolated daemon used metadata capture. It did not receive the existing
daemon's hook or OpenTelemetry posts and is not a copy of the production
database. Both Kusto files include startup calls and calls from the REST
reads at their boundaries.

| Window | Queries (failed) | Management commands | Ingestion attempts | Successful input rows |
|---|---:|---:|---:|---:|
| `quiet` | 321 (0) | 33 | 1,617 | 34,247 |
| `busy` | 333 (1) | 32 | 1,932 | 53,771 |

The quiet tape has 1,012 successful streaming calls and 602 successful
inline calls; the busy tape has 1,450 and 479. Each has three failed queued
attempts. The recorder blocked SDK resource discovery against the virtual
ingestion database in these runs. The script now permits the SDK's specific
read-only discovery commands without serializing their credential results.
Neither tape includes a `.set-or-append` command. The counts are for stored
records, not an estimate of all cluster traffic.

The recorder scrubs fields in memory before it writes a record. A keyed
digest replaces identity strings, paths, URLs, credentials and free text.
Placeholders are stable within each window. These windows were recorded
by different recorder processes, so do not join their placeholders.
The keys are not written.
Fake paths keep a file extension. Field names, numbers, timestamps,
structured JSON and public protocol discriminants remain where possible.
The scrubber also replaces KQL string literals and comments when needed.
Replacement text has a fixed length; do not use it to benchmark the cost
of rendering real long prompts. The writer rejects a record if its final
text still matches an identity or credential pattern. A scan of the decoded
archives found no user name, Windows home path, machine name, Microsoft mail
domain or common token pattern.

To collect a new pair from the repository root, use a new output directory:

```powershell
$env:PYTHONPATH = 'src'
$env:PYTHONDONTWRITEBYTECODE = '1'
python scripts\recording\record_daemon.py --output test\recordings\new
```

## Test database

The loader uses the aictl schema creation code. It resets aictl-owned tables
in `aictl_perf_test` but leaves unrelated tables alone. It loads the successful
`MULTIJSON` ingestion rows in the busy tape. It does not execute captured
commands or reconstruct rows produced inside `.set-or-append` commands.
The same archive gives the same row values, including the original versions
and timestamps. A KQL count for each table must match before the loader
reports success.

The loader wrote **53,771 rows** into 16 tables. KQL counts matched the
input for every table checked. All other tables checked had zero rows.
See [row-counts.json](busy/row-counts.json) for the full expected and
observed counts.

| Table | Rows |
|---|---:|
| `data_quality_status` | 14 |
| `datapoint_catalog` | 356 |
| `events` | 5,018 |
| `file_blobs` | 297 |
| `files` | 1,809 |
| `maintenance_state` | 14 |
| `metrics` | 20,938 |
| `process_snapshots` | 64 |
| `session_artifacts` | 2,525 |
| `session_folders` | 84 |
| `session_processes_observations` | 24 |
| `sessions_observations` | 575 |
| `system_snapshots` | 4 |
| `tool_invocations_observations` | 16,332 |
| `tool_stats` | 6 |
| `vscode_chat_messages` | 5,711 |

The counts above describe the historical recording. It is not a native store
fixture and must not be loaded into the native schema. To load a sanitized
native recording, run this only when no other writer is using the test tables:

```powershell
$env:PYTHONPATH = 'src'
$env:PYTHONDONTWRITEBYTECODE = '1'
python scripts\recording\load_perf_test_db.py --recording path\to\native-kusto.jsonl.gz --reset-test-tables
```
